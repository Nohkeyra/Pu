import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, generateSequentialInvoiceNo, type OrderData } from '../firebaseAdmin.js';
import { isValidStatusTransition } from './orderValidator.js';
import { invoiceQueue } from './invoiceQueue.js';

// The admin UI updates status and billing fields only. Never spread arbitrary
// request keys into Firestore: that permits changes to ownership, deletion flags,
// creation timestamps, and other server-owned invariants.
const ADMIN_ORDER_MUTABLE_FIELDS = new Set([
  'status', 'prices', 'totalAmount', 'approvedAt', 'billedAt', 'invoiceNo',
]);

export function validateAdminOrderUpdate(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Order update data must be an object';
  const entries = Object.entries(data);
  if (entries.length === 0) return 'Order update data cannot be empty';
  for (const [key, value] of entries) {
    if (!ADMIN_ORDER_MUTABLE_FIELDS.has(key) || key.includes('.')) return `Unsupported order update field: ${key}`;
    if (key === 'status' && (typeof value !== 'string' || !value.trim())) return 'Invalid order status';
    if (key === 'prices' && (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.entries(value).some(([meal, price]) => !meal || typeof price !== 'number' || !Number.isFinite(price) || price < 0))) {
      return 'Invalid meal prices';
    }
    if (key === 'totalAmount' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return 'Invalid total amount';
    }
    if ((key === 'approvedAt' || key === 'billedAt') &&
      (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) return `Invalid ${key}`;
    if (key === 'invoiceNo' && (typeof value !== 'string' || !/^((QT|RW)\s+[\w-]+)$/.test(value))) {
      return 'Invalid invoice number';
    }
  }
  if (data && (data as Record<string, unknown>).status === 'billed') {
    const rec = data as Record<string, unknown>;
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
  if ((data.status === 'approved' || data.status === 'billed') && !initialOrder.invoiceNo) {
    reservedInvoiceNo = await generateSequentialInvoiceNo(false, initialOrder.eventDate || initialOrder.date);
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
    if (data.status === 'approved' || data.status === 'billed') {
      if (!oldData.invoiceNo) {
        if (!reservedInvoiceNo) {
          // Another writer cleared the invoice after the first read.
          return { error: 'Invoice changed concurrently; retry the request', httpStatus: 409 } as const;
        }
        updates.invoiceNo = reservedInvoiceNo;
        (updates as any).officialInvoiceNo = reservedInvoiceNo;
      } else if (oldData.invoiceNo.startsWith('QT')) {
        updates.invoiceNo = oldData.invoiceNo.replace(/^QT\s*/i, 'RW ');
        (updates as any).officialInvoiceNo = updates.invoiceNo;
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

