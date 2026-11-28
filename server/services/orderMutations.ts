import { calculateOrderCharges, orderFoodSubtotal, validCharge, validServiceRate } from '../../src/lib/orderCharges.js';
import { CURRENT_INVOICE_LAYOUT } from '../../src/lib/invoiceBatch.js';
import { resolveVerifiedPetronasCode } from '../../src/lib/petronasAutofill.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, generateSequentialIndividualInvoiceNo, type OrderData } from '../firebaseAdmin.js';
import { isValidStatusTransition } from './orderValidator.js';
import { invoiceQueue } from './invoiceQueue.js';

// The admin UI updates status and billing fields only. Never spread arbitrary
// request keys into Firestore: that permits changes to ownership, deletion flags,
// creation timestamps, and other server-owned invariants.
const ADMIN_ORDER_MUTABLE_FIELDS = new Set([
  'status', 'prices', 'totalAmount', 'approvedAt', 'billedAt', 'invoiceNo', 'deliveryCharge', 'serviceChargeRate', 'serviceChargeAmount',
]);

export function validateAdminOrderUpdate(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Order update data must be an object';
  const entries = Object.entries(data);
  if (entries.length === 0) return 'Order update data cannot be empty';
  for (const [key, value] of entries) {
    if (!ADMIN_ORDER_MUTABLE_FIELDS.has(key) || key.includes('.')) return `Unsupported order update field: ${key}`;
    if (key === 'status' && (typeof value !== 'string' || !value.trim())) return 'Invalid order status';
    if (key === 'prices' && (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.entries(value).some(([meal, price]) => !meal.trim() || !validCharge(price)))) {
      return 'Invalid meal prices';
    }
    if ((key === 'deliveryCharge' || key === 'serviceChargeAmount') && !validCharge(value)) return 'Invalid charge amount';
    if (key === 'serviceChargeRate' && !validServiceRate(value)) return 'Invalid service charge rate';
    if (key === 'totalAmount' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return 'Invalid total amount';
    }
    if ((key === 'approvedAt' || key === 'billedAt') &&
      (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) return `Invalid ${key}`;
    if (key === 'invoiceNo' && (typeof value !== 'string' || !/^(?:(?:QT|RW)\s+[\w-]+|RW\d{5})$/.test(value))) {
      return 'Invalid invoice number';
    }
  }
  const rec = data as Record<string, unknown>;
  const changesPricing = ['prices', 'totalAmount', 'deliveryCharge', 'serviceChargeRate', 'serviceChargeAmount'].some(key => key in rec);
  if (changesPricing && (rec.status !== 'billed' || rec.prices === undefined || rec.totalAmount === undefined)) {
    return 'Prices and total amount must be submitted together with billed status';
  }
  if (rec.invoiceNo !== undefined && rec.status !== 'billed' && rec.status !== 'approved') {
    return 'Invoice number is server-managed';
  }
  if (rec.status === 'billed') {
    if (rec.prices !== undefined) {
      const priceVals = Object.values(rec.prices as Record<string, unknown>);
      if (priceVals.length === 0 || priceVals.some((p) => typeof p !== 'number' || !Number.isFinite(p) || p <= 0)) {
        return 'Unit prices must be greater than RM 0.00 before billing an order';
      }
    }
    if (rec.totalAmount !== undefined && (typeof rec.totalAmount !== 'number' || !Number.isFinite(rec.totalAmount) || rec.totalAmount <= 0)) {
      return 'Total amount must be greater than RM 0.00 before billing an order';
    }
  }
  return null;
}

// Re-read and validate status inside the same Firestore transaction as the write.
// Reserve a new invoice number before entering the transaction because the
// invoice generator uses its own Firestore transaction. Unused reservations can
// produce harmless sequence gaps but cannot overwrite a concurrent status.
export async function commitAdminOrderMutation(orderRef: FirebaseFirestore.DocumentReference, data: Record<string, any>, options: {
  requiredStatuses?: string[];
  expectedQuantity?: number;
  expectedMeals?: unknown;
  queueInvoice?: boolean;
} = {}) {
  data = { ...data, ...(typeof data.status === 'string' ? { status: data.status.trim().toLowerCase() } : {}) };
  const validation = validateAdminOrderUpdate(data);
  if (validation) return { error: validation, httpStatus: 400 } as const;
  const db = getFirestore();
  const initial = await orderRef.get();
  if (!initial.exists) return { error: 'Order not found', httpStatus: 404 } as const;

  const initialOrder = initial.data() as OrderData;
  let reservedInvoiceNo: string | undefined;
  if ((data.status === 'approved' || data.status === 'billed') && (!initialOrder.invoiceNo || initialOrder.invoiceNo.startsWith('QT'))) {
    reservedInvoiceNo = await generateSequentialIndividualInvoiceNo();
  }

  return db.runTransaction(async (tx: any) => {
    const fresh = await tx.get(orderRef);
    if (!fresh.exists) return { error: 'Order not found', httpStatus: 404 } as const;
    const oldData = fresh.data() as OrderData;
    if (oldData.deletedByAdmin) return { error: 'Order is no longer available', httpStatus: 409 } as const;
    if (options.requiredStatuses && !options.requiredStatuses.includes(oldData.status || 'pending')) {
      return { error: 'Order is no longer eligible for this action', httpStatus: 409 } as const;
    }
    if ((options.expectedQuantity !== undefined && Number(oldData.quantity || oldData.guests || oldData.pax || 0) !== options.expectedQuantity)
      || (options.expectedMeals !== undefined && JSON.stringify(oldData.meals || []) !== JSON.stringify(options.expectedMeals))) {
      return { error: 'Order changed; reload before confirming pricing', httpStatus: 409 } as const;
    }
    if (data.status !== undefined &&
        (typeof data.status !== 'string' ||
          !isValidStatusTransition(oldData.status || 'pending', data.status))) {
      return {
        error: `Invalid status transition from '${oldData.status || 'pending'}' to '${data.status}'`,
        httpStatus: 400,
      } as const;
    }

    if (data.invoiceNo !== undefined) {
      const currentInvoice = oldData.invoiceNo;
      const expectedInvoice = currentInvoice?.replace(/^QT\s*/i, 'RW ');
      if (!currentInvoice || (data.invoiceNo !== currentInvoice && data.invoiceNo !== expectedInvoice)) {
        return { error: 'Invoice number is server-managed and cannot be replaced', httpStatus: 400 } as const;
      }
    }

    if (data.status === 'billed') {
      const effectivePrices = data.prices ?? oldData.prices;
      const effectiveTotal = Number(data.totalAmount ?? oldData.totalAmount ?? 0);
      const priceEntries = effectivePrices && typeof effectivePrices === 'object' ? Object.values(effectivePrices) : [];
      const hasPositivePrices =
        priceEntries.length > 0 &&
        priceEntries.every((p) => typeof p === 'number' && Number.isFinite(p) && p > 0);
      if (!hasPositivePrices || !Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
        return {
          error: 'Unit prices and a positive total amount are required before billing an order',
          httpStatus: 400,
        } as const;
      }
    }

    const updates: Partial<OrderData> = { ...data, updatedAt: FieldValue.serverTimestamp() };
    // Recompute every explicitly submitted bill from persisted quantity and meal prices.
    // Preserve existing historical records for status-only transitions.
    const chargeFields = ['deliveryCharge', 'serviceChargeRate', 'serviceChargeAmount'];
    const hasChargeChange = chargeFields.some(key => key in data);
    if (hasChargeChange && (data.status !== 'billed' || !data.prices)) return { error: 'Charges must be saved with invoice pricing', httpStatus: 400 } as const;
    if (data.status === 'billed' && data.prices) {
      try {
        const quantity = Number(oldData.quantity ?? oldData.guests ?? oldData.pax ?? 0);
        const meals = Array.isArray(oldData.meals) ? oldData.meals : oldData.meals ? [oldData.meals] : [];
        if (meals.some(meal => typeof meal !== 'string' || !meal.trim()) || new Set(meals).size !== meals.length)
          return { error: 'Order has invalid or duplicate meal types', httpStatus: 400 } as const;
        const priceKeys = Object.keys(data.prices);
        const legacyDefault = meals.length === 0 && priceKeys.length === 1 && priceKeys[0] === 'default';
        if (!legacyDefault && (priceKeys.length !== meals.length || meals.some(meal => !Object.prototype.hasOwnProperty.call(data.prices, meal))))
          return { error: 'A valid price is required for every meal in the order', httpStatus: 400 } as const;
        const foodSubtotal = orderFoodSubtotal(data.prices, quantity);
        const charges = calculateOrderCharges(foodSubtotal, {
          ...oldData, deliveryCharge: data.deliveryCharge ?? oldData.deliveryCharge,
          serviceChargeRate: data.serviceChargeRate ?? oldData.serviceChargeRate,
        });
        if (data.totalAmount !== undefined && Math.round(data.totalAmount * 100) !== Math.round(charges.totalAmount * 100)) {
          return { error: 'Invoice total does not match the meal prices and charges', httpStatus: 400 } as const;
        }
        Object.assign(updates, { deliveryCharge: charges.deliveryCharge, serviceChargeRate: charges.serviceChargeRate, serviceChargeAmount: charges.serviceChargeAmount, totalAmount: charges.totalAmount });
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Invalid invoice charges', httpStatus: 400 } as const;
      }
    }
    if (data.status === 'approved' || data.status === 'billed') {
      if (!oldData.invoiceNo || oldData.invoiceNo.startsWith('QT')) {
        if (!reservedInvoiceNo) {
          // Another writer cleared or changed the invoice after the first read.
          return { error: 'Invoice changed concurrently; retry the request', httpStatus: 409 } as const;
        }
        if (oldData.invoiceNo?.startsWith('QT')) {
          updates.quoteNo = oldData.quoteNo || oldData.invoiceNo;
        }
        updates.invoiceNo = reservedInvoiceNo;
        updates.officialInvoiceNo = reservedInvoiceNo;
        updates.invoiceLayoutVersion = CURRENT_INVOICE_LAYOUT;
        const { companyCode: verifiedCode } = resolveVerifiedPetronasCode(
          String(oldData.to || oldData.company || '')
        );
        if (verifiedCode) {
          updates.companyCode = verifiedCode;
        } else if (oldData.companyCode) {
          updates.companyCode = '';
        }
      }
    }

    if (data.status === 'approved' && !oldData.approvedAt) updates.approvedAt = new Date().toISOString();
    if (data.status === 'billed' && !oldData.billedAt) updates.billedAt = new Date().toISOString();
    if (options.queueInvoice) {
      const recipientEmail = typeof oldData.email === 'string' ? oldData.email.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        return { error: 'Order has no valid customer email', httpStatus: 400 } as const;
      }
      updates.invoiceDeliveryStatus = 'queued';
      await invoiceQueue.service.enqueueInTransaction(tx, {
        orderId: orderRef.id, orderForPdf: { ...oldData, ...updates, id: orderRef.id },
        invoiceNo: String(updates.invoiceNo || oldData.invoiceNo), recipientEmail,
        totalAmount: Number(updates.totalAmount ?? oldData.totalAmount ?? 0),
        companyName: oldData.to || 'Pelanggan', lang: oldData.lang === 'en' ? 'en' : 'bm',
      });
    }
    tx.update(orderRef, updates);
    return { oldData, updates };
  });
}

