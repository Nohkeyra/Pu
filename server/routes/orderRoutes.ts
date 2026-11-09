import riderRoutes from './riderRoutes.js';
import { generateServerInvoicePdf } from '../services/serverPdfService.js';
import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getFirestore,
  type OrderData,
  generateSequentialInvoiceNo,
  verifyCustomerIdToken,
  verifyFirebaseIdToken,
  sendNotificationToTopic,
} from '../firebaseAdmin.js';
import { verifyAdminToken, verifyAdminJwtWithRevocation } from '../adminAuth.js';
import {
  notifyCustomerOfStatusChange,
  sendOrderStatusPush,
  createBrevoTransporter,
} from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';
import { generateOrdersWorkbook } from '../exportService.js';
import { isValidStatusTransition, validateOrderPayload } from '../services/orderValidator.js';
import { toISODateString, toMalaysiaDateTime } from '../../src/lib/dateUtils.js';
import {
  paginateSortedOrders,
  sortOrdersByCreatedAt,
} from '../../src/lib/orderTimestamp.js';
import { SET_BOX_MENU_TITLE } from '../../src/services/orderCalculation.js';
import { evaluateVerifiedOrderAccess } from '../../src/lib/verifiedOrdering.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

import { publicCalendar } from '../services/publicCalendar.js';
import { firestoreQuota, FirestoreQuotaPausedError, isFirestoreQuotaError } from '../services/firestoreQuota.js';
import { commitAdminOrderMutation, validateAdminOrderUpdate } from '../services/orderMutations.js';
export { validateAdminOrderUpdate } from '../services/orderMutations.js';

const router = Router();

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{5,50}$/;

// C-3 fix: validate and whitelist the delivery field shape so arbitrary nested
// objects cannot be written to Firestore unchecked.
function sanitizeDelivery(
  raw: unknown
): 'delivery' | 'pickup' | Record<string, string | number | boolean | null> | null {
  if (raw === 'delivery' || raw === 'pickup') return raw;
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const allowed: Record<string, string | number | boolean | null> = {};
  const ALLOWED_KEYS = new Set([
    'address',
    'city',
    'state',
    'postcode',
    'country',
    'notes',
    'fee',
    'zone',
    'type',
    'distance',
  ]);
  for (const key of ALLOWED_KEYS) {
    const val = src[key];
    if (val === undefined) continue;
    if (typeof val === 'string') {
      allowed[key] = val.slice(0, 500);
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      allowed[key] = val;
    } else if (typeof val === 'boolean') {
      allowed[key] = val;
    } else if (val === null) {
      allowed[key] = null;
    }
    // Nested objects / arrays are silently dropped.
  }
  return Object.keys(allowed).length > 0 ? allowed : null;
}

export function deriveEventDate(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as { eventDate?: unknown; date?: unknown; dateTime?: unknown };
  // Keep the same precedence and calendar validation as validateOrderPayload.
  // In particular, new Date('25/12/2026') is invalid in Node despite being
  // an accepted DD/MM/YYYY date in the shared date utility.
  return toISODateString(input.eventDate ?? input.date ?? input.dateTime);
}

const createOrderLimiter = createDistributedRateLimiter({
  prefix: 'create_order',
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { success: false, error: 'Too many order submissions. Please try again later.' },
});

const customerOrderActionLimiter = createDistributedRateLimiter({
  prefix: 'customer_order_action',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

export function validateOrderSubmission(req: any, res: any, next: any) {
  const body = req.body || {};

  for (const key of Object.keys(body)) {
    const val = body[key];
    if (typeof val === 'string' && val.length > 5000) {
      return res.status(400).json({
        success: false,
        error: `Field '${key}' exceeds maximum length of 5000 characters.`,
      });
    }
    if (Array.isArray(val) && val.length > 100) {
      return res.status(400).json({
        success: false,
        error: `Array field '${key}' exceeds maximum limit of 100 items.`,
      });
    }
  }

  const validation = validateOrderPayload(body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.errors[0]?.message || 'Invalid order submission payload.',
      errors: validation.errors,
    });
  }

  next();
}

// Guests may build local drafts, but only email-verified Firebase customers can
// create a real order. Never trust the client-side userId / guest flag for access.
export async function requireVerifiedCustomerOrder(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';
    const verified = token ? await verifyFirebaseIdToken(token) : null;
    const access = evaluateVerifiedOrderAccess(
      verified ? { uid: verified.uid, emailVerified: verified.email_verified === true } : null,
      req.body?.userId
    );
    if (!access.allowed)
      return res.status(access.status).json({ error: access.error, code: access.code });
    res.locals.verifiedCustomerUid = access.uid;
    return next();
  } catch (error) {
    console.error('[orderRoutes] Customer verification failed:', error);
    return res
      .status(401)
      .json({ error: 'Customer verification failed.', code: 'SIGN_IN_REQUIRED' });
  }
}

// Customer order submission. The authorization gate runs BEFORE payload validation.
router.post(
  '/orders',
  createOrderLimiter,
  requireVerifiedCustomerOrder,
  validateOrderSubmission,
  async (req, res) => {
    try {
      const rawBody = req.body || {};
      const callerUid: string = res.locals.verifiedCustomerUid;
      const db = getFirestore();

      const derivedDate =
        deriveEventDate(rawBody) ||
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
      const qty = Number(rawBody.quantity ?? rawBody.guests ?? rawBody.pax) || 1;
      const dateTime = toMalaysiaDateTime(derivedDate, rawBody.time ?? rawBody.eventTime ?? '12:00')!;
      const department = typeof (rawBody.department ?? rawBody.division) === 'string'
        ? (rawBody.department ?? rawBody.division).trim().slice(0, 200) : '';
      const initials = typeof (rawBody.initials ?? rawBody.initialIdentifier) === 'string'
        ? (rawBody.initials ?? rawBody.initialIdentifier).trim().slice(0, 50) : '';
      const mappedMeals = Array.isArray(rawBody.meals)
        ? rawBody.meals
        : rawBody.mealType
          ? [rawBody.mealType]
          : ['default'];

      const prices = {}; // forced empty on create — admin sets later
      const totalAmount = 0; // forced zero on create — admin sets later

      let processedDishes: string[] = [];
      if (Array.isArray(rawBody.dishes)) {
        const isBm = rawBody.lang === 'bm';
        processedDishes = rawBody.dishes
          .map((d: any) => {
            if (typeof d === 'string') return d;
            if (d && typeof d === 'object') {
              return (isBm ? d.nameBm : d.nameEn) || d.nameBm || d.nameEn || '';
            }
            return '';
          })
          .filter((name: string) => typeof name === 'string' && name.length > 0);
      }

      // Whitelist allowed fields to prevent injection of sensitive attributes (e.g. invoiceNo, approvedAt, deletedByAdmin)
      const sanitizedOrderDoc = {
        invoiceNo: '',
        billingAddress:
          typeof rawBody.billingAddress === 'string'
            ? rawBody.billingAddress.trim().slice(0, 1000)
            : '',
        to: typeof rawBody.to === 'string' ? rawBody.to.slice(0, 200) : 'Majlis Persendirian',
        attn: typeof rawBody.attn === 'string' ? rawBody.attn.slice(0, 200) : '',
        department,
        division: department,
        initials,
        initialIdentifier: initials,
        name:
          typeof rawBody.name === 'string'
            ? rawBody.name.slice(0, 200)
            : typeof rawBody.customerName === 'string'
              ? rawBody.customerName.slice(0, 200)
              : '',
        contact:
          typeof rawBody.contact === 'string'
            ? rawBody.contact.slice(0, 50)
            : typeof rawBody.contactNumber === 'string'
              ? rawBody.contactNumber.slice(0, 50)
              : typeof rawBody.phone === 'string'
                ? rawBody.phone.slice(0, 50)
                : '',
        email:
          typeof rawBody.email === 'string'
            ? rawBody.email.slice(0, 150)
            : typeof rawBody.customerEmail === 'string'
              ? rawBody.customerEmail.slice(0, 150)
              : '',
        date: derivedDate,
        eventDate: derivedDate,
        time: dateTime.slice(11, 16),
        location: typeof rawBody.location === 'string' ? rawBody.location.slice(0, 500) : '',
        quantity: qty,
        guests: qty,
        pax: qty,
        meals: mappedMeals,
        menu: typeof rawBody.menu === 'string' ? rawBody.menu.slice(0, 500) : SET_BOX_MENU_TITLE,
        preparationType: rawBody.preparationType === 'meal_box' ? 'meal_box' : 'buffet',
        notes: typeof rawBody.notes === 'string' ? rawBody.notes.slice(0, 5000) : '',
        dateTime,
        lang: rawBody.lang === 'en' ? 'en' : 'bm',
        status: 'pending',
        prices,
        totalAmount,
        dishes: processedDishes,
        veggies: Array.isArray(rawBody.veggies) ? rawBody.veggies : [],
        customMenu: typeof rawBody.customMenu === 'string' ? rawBody.customMenu.slice(0, 1000) : '',
        userId: callerUid,
        delivery: sanitizeDelivery(rawBody.delivery),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      let orderId: string;
      let finalInvoiceNo: string = '';
      let isDuplicate = false;
      const idempotencyKey =
        typeof rawBody.idempotencyKey === 'string' &&
        IDEMPOTENCY_KEY_RE.test(rawBody.idempotencyKey)
          ? rawBody.idempotencyKey
          : null;

      if (idempotencyKey) {
        const idempRef = db.collection('idempotency_keys').doc(idempotencyKey);
        const orderRef = db.collection('orders').doc();
        // Reserve the invoice number outside the transaction. Concurrent retries may
        // leave gaps in the sequence, but cannot create two orders for the same key.
        const reservedInvoiceNo = await generateSequentialInvoiceNo(true, derivedDate);
        const transactionResult = await db.runTransaction(async (transaction) => {
          const existing = await transaction.get(idempRef);
          if (existing.exists) {
            const data = existing.data();
            if (!data?.orderId) throw new Error('Invalid idempotency record');
            const existingOrder = await transaction.get(db.collection('orders').doc(data.orderId));
            if (!existingOrder.exists)
              throw new Error('Idempotency record references a missing order');
            const owner = existingOrder.data()?.userId || existingOrder.data()?.uid || null;
            if (owner !== callerUid) return { conflict: true as const };
            return {
              conflict: false as const,
              duplicate: true,
              orderId: data.orderId as string,
              invoiceNo: String(data.invoiceNo || ''),
            };
          }
          const orderWithInvoice = {
            ...sanitizedOrderDoc,
            invoiceNo: reservedInvoiceNo,
            quoteNo: reservedInvoiceNo,
          };
          transaction.set(orderRef, orderWithInvoice);
          transaction.set(idempRef, {
            orderId: orderRef.id,
            invoiceNo: reservedInvoiceNo,
            createdAt: FieldValue.serverTimestamp(),
            totalAmount,
            prices,
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
          return {
            conflict: false as const,
            duplicate: false,
            orderId: orderRef.id,
            invoiceNo: reservedInvoiceNo,
          };
        });
        if (transactionResult.conflict) {
          return res.status(409).json({ error: 'This order key belongs to a different customer.' });
        }
        orderId = transactionResult.orderId;
        finalInvoiceNo = transactionResult.invoiceNo;
        isDuplicate = transactionResult.duplicate;
        sanitizedOrderDoc.invoiceNo = finalInvoiceNo;
        (sanitizedOrderDoc as any).quoteNo = finalInvoiceNo;
      } else {
        finalInvoiceNo = await generateSequentialInvoiceNo(true, derivedDate);
        sanitizedOrderDoc.invoiceNo = finalInvoiceNo;
        (sanitizedOrderDoc as any).quoteNo = finalInvoiceNo;

        const orderRef = await db.collection('orders').add(sanitizedOrderDoc);
        orderId = orderRef.id;
      }

      const initialOrderData: OrderData = {
        ...sanitizedOrderDoc,
        id: orderId,
        invoiceNo: finalInvoiceNo,
        status: 'pending',
      };

      if (!isDuplicate) {
        invalidateCalendarSessionsCache();
        syncGoogleCalendarEvent(orderId, initialOrderData).catch((err) => {
          console.error('[Calendar] Auto-sync initial pending status failed:', err);
        });

        // FCM: Notify admin topic of new order
        sendNotificationToTopic(
          'new_orders',
          '🍽️ Tempahan Baharu Diterima!',
          `Tempahan daripada ${sanitizedOrderDoc.name || 'Pelanggan'} (${sanitizedOrderDoc.quantity} pax) untuk ${sanitizedOrderDoc.eventDate}. No. Invois: ${finalInvoiceNo}`,
          {
            type: 'new_order',
            orderId: String(orderId),
            invoiceNo: String(finalInvoiceNo),
            customerName: String(sanitizedOrderDoc.name || ''),
          }
        ).catch((err) => {
          console.error('[FCM] Failed to send new order push to admin topic:', err);
        });

        // FCM: Notify customer of pending confirmation if token available
        sendOrderStatusPush(initialOrderData, 'pending').catch((err) => {
          console.error('[FCM] Failed to send order received push to customer:', err);
        });
      }

      return res.json({
        id: orderId,
        invoiceNo: finalInvoiceNo,
        duplicate: isDuplicate,
        prices,
        totalAmount,
      });
    } catch (err) {
      console.error('[orderRoutes] /orders:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Admin Fetch/Update/Delete Orders
router.post('/admin/orders', verifyAdminToken, async (req, res) => {
  try {
    const { action, orderId, data } = req.body || {};
    if ((action === 'update' || action === 'delete') &&
        (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(orderId))) {
      return res.status(400).json({ error: 'A valid orderId is required' });
    }
    const db = getFirestore();
    if (action === 'fetch') {
      const pageSize = Math.max(1, Math.min(100, Number(req.body.pageSize) || 50));
      // Firestore orderBy('createdAt') excludes missing fields and sorts mixed types by type.
      // Read first, then normalize-sort and paginate to preserve legacy records.
      const snapshot = await db.collection('orders').get();
      const allOrders = sortOrdersByCreatedAt(
        snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((order: any) => order.deletedByAdmin !== true),
        'desc'
      );
      // The virtualized admin UI filters across its full dataset. Keep the paged
      // contract for other callers while avoiding repeated full scans per page.
      if (req.body.includeAll === true)
        return res.json({ success: true, orders: allOrders, hasMore: false });
      let page: { orders: typeof allOrders; hasMore: boolean; cursorFound: boolean };
      if (typeof req.body.lastId === 'string' && req.body.lastId) {
        page = paginateSortedOrders(allOrders, pageSize, req.body.lastId);
        if (!page.cursorFound) {
          return res.status(409).json({
            success: false,
            error:
              'Pagination cursor is no longer available. Restart pagination from the first page.',
          });
        }
      } else if (req.body.lastCreatedAt !== undefined) {
        // A timestamp alone cannot uniquely identify a position when orders share a timestamp.
        return res.status(400).json({
          success: false,
          error: 'Use lastId as the pagination cursor; timestamp-only cursors are ambiguous.',
        });
      } else {
        page = paginateSortedOrders(allOrders, pageSize);
      }
      return res.json({ success: true, orders: page.orders, hasMore: page.hasMore });
    }

    if (action === 'update' && orderId) {
      const validationError = validateAdminOrderUpdate(data);
      if (validationError) return res.status(400).json({ error: validationError });
      const orderRef = db.collection('orders').doc(orderId);
      const result = await commitAdminOrderMutation(orderRef, data);
      if ('error' in result)
        return res.status(result.httpStatus || 400).json({ error: result.error });
      const { oldData, updates } = result;

      if (updates.status && updates.status !== oldData.status) {
        const transporter = createBrevoTransporter();
        const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || '';
        await notifyCustomerOfStatusChange(
          transporter,
          { ...oldData, ...updates, id: orderId },
          updates.status,
          senderEmail,
          process.env.SMTP_USER,
          process.env.SMTP_PASS
        ).catch((err) => console.error('[Email] Failed to notify status change:', err));
      }

      const updatedOrderForCalendar = { ...oldData, ...updates, id: orderId };
      invalidateCalendarSessionsCache();
      syncGoogleCalendarEvent(orderId, updatedOrderForCalendar).catch((err) => {
        console.error('[Calendar] Auto-sync on order update failed:', err);
      });

      return res.json({ success: true, invoiceNo: updates.invoiceNo });
    }

    if (action === 'delete' && orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      // Keep billed/invoiced records for administrative history even when
      // both customer and admin have removed the item from their own views.
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return { missing: true } as const;
        const orderData = snap.data() as OrderData;
        const ownerUid = orderData.userId || orderData.uid || null;
        const hasInvoice = Boolean(orderData.invoiceNo || (orderData as any).officialInvoiceNo);
        if (
          (!ownerUid || orderData.deletedByUser) &&
          !hasInvoice &&
          orderData.status !== 'billed'
        ) {
          tx.delete(orderRef);
        } else {
          tx.update(orderRef, {
            deletedByAdmin: true,
            deletedByAdminAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { missing: false } as const;
      });
      if (result.missing) return res.status(404).json({ error: 'Order not found' });

      invalidateCalendarSessionsCache();
      return res.json({ success: true, message: 'Order deleted on admin side' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('[orderRoutes] /admin/orders:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Quick Status Change
router.patch('/admin/orders/:orderId/status', verifyAdminToken, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body || {};
  if (typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({ error: 'A valid status is required' });
  }
  try {
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const result = await commitAdminOrderMutation(orderRef, { status });
    if ('error' in result)
      return res.status(result.httpStatus || 400).json({ error: result.error });
    const { oldData, updates } = result;

    if (updates.status && updates.status !== oldData.status) {
      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || '';
      await notifyCustomerOfStatusChange(
        transporter,
        { ...oldData, ...updates, id: orderId },
        updates.status,
        senderEmail,
        process.env.SMTP_USER,
        process.env.SMTP_PASS
      ).catch((err) => console.error('[Email] Failed to notify status change:', err));
    }

    const mergedOrderData = { ...oldData, ...updates, id: orderId };
    invalidateCalendarSessionsCache();
    syncGoogleCalendarEvent(orderId, mergedOrderData).catch((err) => {
      console.error('[Calendar] Failed to auto-sync calendar event on PATCH status:', err);
    });

    return res.json({ success: true, invoiceNo: updates.invoiceNo });
  } catch (err) {
    console.error('[orderRoutes] /admin/orders/:orderId/status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer update: authenticate before transaction, then check ownership and
// pending status against the same snapshot used for the write.
router.post('/orders/update', customerOrderActionLimiter, async (req, res) => {
  const { orderId, notes, time } = req.body || {};
  if (typeof orderId !== 'string' || !orderId.trim())
    return res.status(400).json({ error: 'orderId is required' });
  const callerUid = await verifyCustomerIdToken(req);
  if (!callerUid) return res.status(403).json({ error: 'Not authorized to update this order' });

  try {
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { error: 'Order not found', httpStatus: 404 } as const;
      const oldData = snap.data() as OrderData;
      const ownerUid = oldData.userId || oldData.uid || null;
      if (!ownerUid || ownerUid !== callerUid) {
        return { error: 'Not authorized to update this order', httpStatus: 403 } as const;
      }
      if (oldData.status !== 'pending') {
        return {
          error: `Cannot update order in '${oldData.status}' status. Only pending orders can be updated.`,
          httpStatus: 400,
        } as const;
      }
      const updates: Partial<OrderData> = { updatedAt: FieldValue.serverTimestamp() };
      if (typeof notes === 'string') updates.notes = notes.slice(0, 5000);
      if (typeof time === 'string') {
        const dateVal = (oldData as any).eventDate || oldData.date;
        const dateTime = toMalaysiaDateTime(dateVal, time);
        if (!dateTime) return { error: 'Valid event time (HH:mm) is required', httpStatus: 400 } as const;
        updates.time = dateTime.slice(11, 16);
        updates.dateTime = dateTime;
      }
      tx.update(orderRef, updates);
      return { oldData, updates };
    });
    if ('error' in result)
      return res.status(result.httpStatus || 400).json({ error: result.error });
    const { oldData, updates } = result;
    invalidateCalendarSessionsCache();
    syncGoogleCalendarEvent(orderId, { ...oldData, ...updates, id: orderId }).catch((err) => {
      console.error('[Calendar] Failed to auto-sync calendar event on update request:', err);
    });
    return res.json({ success: true, message: 'Order updated successfully' });
  } catch (err) {
    console.error('[orderRoutes] /orders/update:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer cancel request: make the transition and ownership check atomic.
router.post('/orders/cancel', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body || {};
  if (typeof orderId !== 'string' || !orderId.trim())
    return res.status(400).json({ error: 'orderId is required' });
  const callerUid = await verifyCustomerIdToken(req);
  if (!callerUid) return res.status(403).json({ error: 'Not authorized to cancel this order' });

  try {
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { error: 'Order not found', httpStatus: 404 } as const;
      const oldData = snap.data() as OrderData;
      const ownerUid = oldData.userId || oldData.uid || null;
      if (!ownerUid || ownerUid !== callerUid) {
        return { error: 'Not authorized to cancel this order', httpStatus: 403 } as const;
      }
      if (
        !isValidStatusTransition(oldData.status || 'pending', 'cancel_requested') ||
        oldData.status === 'cancel_requested'
      ) {
        return {
          error: `Cannot request cancellation for order in '${oldData.status || 'pending'}' status.`,
          httpStatus: 400,
        } as const;
      }
      const updates: Partial<OrderData> = {
        status: 'cancel_requested',
        cancelRequestedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      tx.update(orderRef, updates);
      return { oldData, updates };
    });
    if ('error' in result)
      return res.status(result.httpStatus || 400).json({ error: result.error });
    const { oldData, updates } = result;
    const mergedOrderData = { ...oldData, ...updates, id: orderId, status: 'cancel_requested' };
    invalidateCalendarSessionsCache();

    const transporter = createBrevoTransporter();
    const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || '';
    await notifyCustomerOfStatusChange(
      transporter,
      mergedOrderData,
      'cancel_requested',
      senderEmail,
      process.env.SMTP_USER,
      process.env.SMTP_PASS
    ).catch((err) => console.error('[Email] Failed to notify cancel request:', err));

    sendNotificationToTopic(
      'new_orders',
      '⚠️ Permintaan Pembatalan Tempahan',
      `Pelanggan ${mergedOrderData.name || 'Pelanggan'} memohon pembatalan tempahan ${mergedOrderData.invoiceNo || orderId}.`,
      {
        type: 'cancel_requested',
        orderId: String(orderId),
        invoiceNo: String(mergedOrderData.invoiceNo || ''),
        customerName: String(mergedOrderData.name || ''),
      }
    ).catch((err) =>
      console.error('[FCM] Failed to send cancel request push to admin topic:', err)
    );
    syncGoogleCalendarEvent(orderId, mergedOrderData).catch((err) => {
      console.error('[Calendar] Failed to auto-sync calendar event on cancel request:', err);
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[orderRoutes] /orders/cancel:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer deletion: ownership and billed status must still hold at commit time.
router.post('/orders/delete', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body || {};
  if (typeof orderId !== 'string' || !orderId.trim())
    return res.status(400).json({ error: 'orderId is required' });
  const callerUid = await verifyCustomerIdToken(req);
  if (!callerUid) return res.status(403).json({ error: 'Not authorized to delete this order' });

  try {
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { error: 'Order not found', httpStatus: 404 } as const;
      const orderData = snap.data() as OrderData;
      const ownerUid = orderData.userId || orderData.uid || null;
      if (!ownerUid || ownerUid !== callerUid) {
        return { error: 'Not authorized to delete this order', httpStatus: 403 } as const;
      }
      if (String(orderData.status || '').toLowerCase() !== 'billed') {
        return {
          error:
            'You can only remove an order from your history after it has been billed by the restaurant.',
          httpStatus: 403,
        } as const;
      }
      // Removing an invoice from the customer history must not destroy the
      // financial/order record that administration may still need.
      tx.update(orderRef, {
        deletedByUser: true,
        deletedByUserAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { deleted: true } as const;
    });
    if ('error' in result)
      return res.status(result.httpStatus || 400).json({ error: result.error });
    invalidateCalendarSessionsCache();
    return res.json({ success: true, message: 'Order removed successfully.' });
  } catch (err) {
    console.error('[orderRoutes] /orders/delete:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Only an authenticated owner can nudge admin for an order. A guest order
// without an authenticated owner must not be mutable by anyone knowing its ID.
router.post('/orders/poke', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body || {};
  if (typeof orderId !== 'string' || !orderId.trim())
    return res.status(400).json({ error: 'orderId is required' });
  const callerUid = await verifyCustomerIdToken(req);
  if (!callerUid) return res.status(403).json({ error: 'Not authorized to poke this order' });

  try {
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { error: 'Order not found', httpStatus: 404 } as const;
      const data = snap.data() as OrderData;
      const ownerUid = data.userId || data.uid || null;
      if (!ownerUid || ownerUid !== callerUid || data.deletedByUser || data.deletedByAdmin) {
        return { error: 'Not authorized to poke this order', httpStatus: 403 } as const;
      }
      tx.update(orderRef, {
        lastPokedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true } as const;
    });
    if ('error' in result)
      return res.status(result.httpStatus || 400).json({ error: result.error });
    return res.json({ success: true, message: 'Admin has been nudged!' });
  } catch (err) {
    console.error('[orderRoutes] /orders/poke:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Preliminary Invoice
const preliminaryInvoiceLimiter = createDistributedRateLimiter({
  prefix: 'preliminary_invoice',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

router.post(
  '/orders/:id/send-preliminary-invoice',
  preliminaryInvoiceLimiter,
  requireVerifiedCustomerOrder,
  async (req, res) => {
    const { id } = req.params;
    const { email, name, lang } = req.body || {};

    if (!id || !email) {
      return res.status(400).json({ error: 'id and email are required' });
    }

    try {
      const db = getFirestore();
      const orderSnap = await db.collection('orders').doc(id).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderData = orderSnap.data() as OrderData;
      if (!orderData.userId || orderData.userId !== res.locals.verifiedCustomerUid) {
        return res
          .status(403)
          .json({ error: 'Only the verified order owner may request this invoice.' });
      }
      if (!orderData.email || orderData.email.toLowerCase() !== String(email).toLowerCase()) {
        return res.status(403).json({ error: 'Email does not match order record' });
      }

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS missing)');
      }

      const orderForPdf: any = { ...orderData, id: orderSnap.id };
      orderForPdf.lang = lang === 'en' ? 'en' : 'bm';
      if (!orderForPdf.invoiceNo) {
        orderForPdf.invoiceNo = await generateSequentialInvoiceNo(
          true,
          orderForPdf.eventDate || orderForPdf.date
        );
        await db
          .collection('orders')
          .doc(id)
          .update({
            invoiceNo: orderForPdf.invoiceNo,
            updatedAt: FieldValue.serverTimestamp(),
          })
          .catch((err) => console.warn('[Preliminary Invoice] Could not persist invoiceNo:', err));
      }
      const pdfBuffer = await generateServerInvoicePdf(orderForPdf, false);

      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;
      const isBm = lang === 'bm';

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${senderEmail}>`,
        to: orderData.email,
        subject: isBm
          ? `Tempahan Anda Diterima - Rujukan #${id}`
          : `Your Booking Was Received - Ref #${id}`,
        text: isBm
          ? `Salam ${name || ''}, terima kasih atas tempahan anda. Sila lihat draf invois yang dilampirkan.`
          : `Hi ${name || ''}, thank you for your booking. Please see the attached preliminary invoice.`,
        attachments: [
          {
            filename: `Preliminary_Invoice_${id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      return res.json({ success: true });
    } catch (err) {
      console.error('[orderRoutes] /orders/:id/send-preliminary-invoice:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Admin Export Orders Excel
router.get('/admin/export/orders', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('orders').get();
    const orders = sortOrdersByCreatedAt(
      snapshot.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }))
        .filter((o: any) => !o.deletedByAdmin),
      'desc'
    ).slice(0, 2000) as OrderData[];

    const workbook = await generateOrdersWorkbook(orders);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=Orders_Export.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch {
    return res.status(500).json({ error: 'Export failed' });
  }
});

const calendarSessionsLimiter = createDistributedRateLimiter({
  prefix: 'calendar_sessions',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

export function invalidateCalendarSessionsCache(): void { publicCalendar.invalidate(); }

// Calendar notes are available to signed-in members and administrators.
// Authenticate using verified tokens; never trust a userId supplied by the UI.
const calendarNoteLimiter = customerOrderActionLimiter;

async function getCalendarNoteActor(
  req: import('express').Request
): Promise<{ userId: string; isAdmin: boolean } | null> {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : '';
  if (!token) return null;
  const admin = await verifyAdminJwtWithRevocation(token);
  if (admin?.admin) return { userId: 'admin', isAdmin: true };
  const uid = await verifyCustomerIdToken(req);
  return uid ? { userId: uid, isAdmin: false } : null;
}

// Admin sessions may use a server JWT without a Firebase client session.
// This authenticated read endpoint keeps their calendar notes available when
// a Firestore browser subscription is unavailable. Never return other members'
// notes to a regular customer.
router.get('/calendar-notes', calendarNoteLimiter, async (req, res) => {
  try {
    const actor = await getCalendarNoteActor(req);
    if (!actor)
      return res.status(401).json({ success: false, error: 'Sign in to view calendar notes.' });
    const month = req.query.month;
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, error: 'A valid YYYY-MM month is required.' });
    }

    const notesCollection = getFirestore().collection('calendar_notes');
    // Avoid requiring a composite index for member + date. The API checks the
    // month again after fetching the authenticated member's notes.
    const snapshot = actor.isAdmin
      ? await notesCollection
          .where('date', '>=', `${month}-01`)
          .where('date', '<=', `${month}-31`)
          .get()
      : await notesCollection.where('userId', '==', actor.userId).get();
    const notes = snapshot.docs.flatMap((doc) => {
      const data = doc.data();
      if (typeof data.date !== 'string' || !data.date.startsWith(`${month}-`)) return [];
      if (!actor.isAdmin && data.userId !== actor.userId) return [];
      return [
        {
          id: doc.id,
          date: data.date,
          userId: data.userId,
          userName: data.userName || (actor.isAdmin ? 'Admin' : 'Customer'),
          note: typeof data.note === 'string' ? data.note : '',
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        },
      ];
    });
    return res.json({ success: true, notes });
  } catch (err) {
    console.error('[Calendar Notes] GET Error:', err);
    return res.status(500).json({ success: false, error: 'Could not load calendar notes.' });
  }
});

router.post('/calendar-notes', calendarNoteLimiter, async (req, res) => {
  try {
    const actor = await getCalendarNoteActor(req);
    if (!actor)
      return res.status(401).json({ success: false, error: 'Sign in to save calendar notes.' });
    const { date, note } = req.body || {};
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      toISODateString(date) !== date
    ) {
      return res.status(400).json({ success: false, error: 'A valid calendar date is required.' });
    }
    if (typeof note !== 'string' || !note.trim() || note.trim().length > 500) {
      return res.status(400).json({ success: false, error: 'Note must contain 1–500 characters.' });
    }
    const docId = `${actor.userId}_${date}`;
    const db = getFirestore();
    await db
      .collection('calendar_notes')
      .doc(docId)
      .set({
        date,
        userId: actor.userId,
        userName: actor.isAdmin ? 'Admin' : 'Customer',
        note: note.trim(),
        updatedAt: new Date().toISOString(),
      });
    return res.json({ success: true, docId });
  } catch (err) {
    console.error('[Calendar Notes] POST Error:', err);
    return res.status(500).json({ success: false, error: 'Could not save calendar note.' });
  }
});

router.delete('/calendar-notes/:docId', calendarNoteLimiter, async (req, res) => {
  try {
    const actor = await getCalendarNoteActor(req);
    if (!actor)
      return res.status(401).json({ success: false, error: 'Sign in to delete calendar notes.' });
    const { docId } = req.params;
    if (typeof docId !== 'string' || !docId || docId.length > 200 || docId.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid note ID.' });
    }
    const db = getFirestore();
    const ref = db.collection('calendar_notes').doc(docId);
    const note = await ref.get();
    if (!note.exists) return res.status(404).json({ success: false, error: 'Note not found.' });
    if (!actor.isAdmin && note.data()?.userId !== actor.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this note.' });
    }
    await ref.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('[Calendar Notes] DELETE Error:', err);
    return res.status(500).json({ success: false, error: 'Could not delete calendar note.' });
  }
});

async function handlePublicCalendar(
  req: import('express').Request, res: import('express').Response, view: 'all' | 'orders' | 'sessions',
) {
  res.setHeader('Cache-Control', 'no-store');
  const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
  if ((from && toISODateString(from) !== from) || (to && toISODateString(to) !== to) || (from && to && from > to)) {
    return res.status(400).json({ success: false, error: 'Invalid calendar date range.' });
  }
  try {
    const data = await publicCalendar.getData(from, to);
    return res.json({ success: true, ...(view !== 'sessions' ? { orders: data.orders } : {}),
      ...(view !== 'orders' ? { sessions: data.sessions } : {}) });
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      const retryAfterSeconds = error instanceof FirestoreQuotaPausedError ? error.retryAfterSeconds : Math.max(1, firestoreQuota.retryAfterSeconds);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(503).json({ success: false, code: 'FIRESTORE_QUOTA',
        error: 'Calendar data is temporarily unavailable. Please try again later.', retryAfterSeconds });
    }
    console.error('[PublicCalendar] Read failed:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
router.get('/calendar-data', calendarSessionsLimiter, (req, res) => handlePublicCalendar(req, res, 'all'));
router.get('/calendar-sessions', calendarSessionsLimiter, (req, res) => handlePublicCalendar(req, res, 'sessions'));
router.get('/calendar-orders', calendarSessionsLimiter, (req, res) => handlePublicCalendar(req, res, 'orders'));

// Rider GPS session routes share the existing order API mount.
router.use(riderRoutes);

export default router;
