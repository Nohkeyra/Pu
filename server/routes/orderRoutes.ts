import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, type OrderData, generateSequentialInvoiceNo, verifyCustomerIdToken, sendNotificationToTopic } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { notifyCustomerOfStatusChange, sendOrderStatusPush, createBrevoTransporter } from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';
import { generateOrdersWorkbook } from '../exportService.js';
import { isValidStatusTransition, validateOrderPayload } from '../services/orderValidator.js';
import { calculateOrderPricing, SET_BOX_MENU_TITLE } from '../../src/services/orderCalculation.ts';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{5,50}$/;

export function deriveEventDate(body: any): string | null {
  if (!body) return null;
  const raw = body.eventDate || body.date || body.dateTime;
  if (!raw) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(d);
  } catch {
    return null;
  }
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
      return res.status(400).json({ success: false, error: `Field '${key}' exceeds maximum length of 5000 characters.` });
    }
    if (Array.isArray(val) && val.length > 100) {
      return res.status(400).json({ success: false, error: `Array field '${key}' exceeds maximum limit of 100 items.` });
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

// Public Order Submission
router.post('/orders', createOrderLimiter, validateOrderSubmission, async (req, res) => {
  try {
    const rawBody = req.body || {};
    const db = getFirestore();

    const derivedDate = deriveEventDate(rawBody) || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
    const qty = Number(rawBody.quantity ?? rawBody.guests ?? rawBody.pax) || 1;
    const mappedMeals = Array.isArray(rawBody.meals) ? rawBody.meals : (rawBody.mealType ? [rawBody.mealType] : ['default']);

    // Authoritative Server Pricing Calculation via shared module
    const { prices, totalAmount } = calculateOrderPricing({
      dishes: rawBody.dishes,
      veggies: rawBody.veggies,
      customMenu: rawBody.customMenu,
      quantity: qty,
      meals: mappedMeals,
      menu: rawBody.menu,
    });

    if (rawBody.totalAmount !== undefined && Number(rawBody.totalAmount) !== totalAmount) {
      console.warn(`[Order Pricing Warning] Client submitted totalAmount (${rawBody.totalAmount}) differs from server calculated totalAmount (${totalAmount})`);
    }

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
      to: typeof rawBody.to === 'string' ? rawBody.to.slice(0, 200) : 'Majlis Persendirian',
      attn: typeof rawBody.attn === 'string' ? rawBody.attn.slice(0, 200) : '',
      name: typeof rawBody.name === 'string' ? rawBody.name.slice(0, 200) : typeof rawBody.customerName === 'string' ? rawBody.customerName.slice(0, 200) : '',
      contact: typeof rawBody.contact === 'string' ? rawBody.contact.slice(0, 50) : typeof rawBody.contactNumber === 'string' ? rawBody.contactNumber.slice(0, 50) : typeof rawBody.phone === 'string' ? rawBody.phone.slice(0, 50) : '',
      email: typeof rawBody.email === 'string' ? rawBody.email.slice(0, 150) : typeof rawBody.customerEmail === 'string' ? rawBody.customerEmail.slice(0, 150) : '',
      date: derivedDate,
      eventDate: derivedDate,
      time: typeof rawBody.time === 'string' ? rawBody.time.slice(0, 20) : typeof rawBody.eventTime === 'string' ? rawBody.eventTime.slice(0, 20) : '12:00',
      location: typeof rawBody.location === 'string' ? rawBody.location.slice(0, 500) : '',
      quantity: qty,
      guests: qty,
      pax: qty,
      meals: mappedMeals,
      menu: typeof rawBody.menu === 'string' ? rawBody.menu.slice(0, 500) : SET_BOX_MENU_TITLE,
      preparationType: rawBody.preparationType === 'meal_box' ? 'meal_box' : 'buffet',
      notes: typeof rawBody.notes === 'string' ? rawBody.notes.slice(0, 5000) : '',
      dateTime: rawBody.dateTime ? String(rawBody.dateTime) : `${derivedDate}T${rawBody.time || '12:00'}:00+08:00`,
      lang: rawBody.lang === 'en' ? 'en' : 'bm',
      status: 'pending',
      prices,
      totalAmount,
      dishes: processedDishes,
      veggies: Array.isArray(rawBody.veggies) ? rawBody.veggies : [],
      customMenu: typeof rawBody.customMenu === 'string' ? rawBody.customMenu.slice(0, 1000) : '',
      userId: typeof rawBody.userId === 'string' ? rawBody.userId : null,
      delivery: typeof rawBody.delivery === 'object' && rawBody.delivery !== null ? rawBody.delivery : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let orderId: string;
    let isDuplicate = false;
    const idempotencyKey = typeof rawBody.idempotencyKey === 'string' && IDEMPOTENCY_KEY_RE.test(rawBody.idempotencyKey)
      ? rawBody.idempotencyKey
      : null;

    if (idempotencyKey) {
      const idempRef = db.collection('idempotency_keys').doc(idempotencyKey);
      const idempSnap = await idempRef.get();

      if (idempSnap.exists) {
        const idempData = idempSnap.data();
        orderId = idempData?.orderId;
        isDuplicate = true;
      } else {
        const orderRef = db.collection('orders').doc();
        orderId = orderRef.id;

        const batch = db.batch();
        batch.set(orderRef, sanitizedOrderDoc);
        batch.set(idempRef, {
          orderId,
          createdAt: FieldValue.serverTimestamp(),
          totalAmount,
          prices,
        });
        await batch.commit();
      }
    } else {
      const orderRef = await db.collection('orders').add(sanitizedOrderDoc);
      orderId = orderRef.id;
    }

    const initialOrderData: OrderData = {
      ...sanitizedOrderDoc,
      id: orderId,
      status: 'pending',
    };

    if (!isDuplicate) {
      invalidateCalendarSessionsCache();
      syncGoogleCalendarEvent(orderId, initialOrderData).catch(err => {
        console.error('[Calendar] Auto-sync initial pending status failed:', err);
      });

      // FCM: Notify admin topic of new order
      sendNotificationToTopic(
        'new_orders',
        '🍽️ Tempahan Baharu Diterima!',
        `Tempahan daripada ${sanitizedOrderDoc.name || 'Pelanggan'} (${sanitizedOrderDoc.quantity} pax) untuk ${sanitizedOrderDoc.eventDate}.`,
        {
          type: 'new_order',
          orderId: String(orderId),
          invoiceNo: '',
          customerName: String(sanitizedOrderDoc.name || ''),
        }
      ).catch(err => {
        console.error('[FCM] Failed to send new order push to admin topic:', err);
      });

      // FCM: Notify customer of pending confirmation if token available
      sendOrderStatusPush(initialOrderData, 'pending').catch(err => {
        console.error('[FCM] Failed to send order received push to customer:', err);
      });
    }

    return res.json({
      id: orderId,
      duplicate: isDuplicate,
      prices,
      totalAmount,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Admin Fetch/Update/Delete Orders
router.post('/admin/orders', verifyAdminToken, async (req, res) => {
  const { action, orderId, data } = req.body;
  const db = getFirestore();

  try {
    if (action === 'fetch') {
      const pageSize = Math.max(1, Math.min(100, Number(req.body.pageSize) || 50));
      let query: FirebaseFirestore.Query = db.collection('orders').orderBy('createdAt', 'desc').limit(pageSize);

      if (req.body.lastId) {
        const lastDocSnap = await db.collection('orders').doc(req.body.lastId).get();
        if (lastDocSnap.exists) {
          query = query.startAfter(lastDocSnap);
        }
      }

      const snapshot = await query.get();
      const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      return res.json({ success: true, orders, hasMore: orders.length === pageSize });
    }

    if (action === 'update' && orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      const oldSnap = await orderRef.get();
      if (!oldSnap.exists) return res.status(404).json({ error: 'Order not found' });

      const oldData = oldSnap.data() as OrderData;
      if (data.status && !isValidStatusTransition(oldData.status || 'pending', data.status)) {
        return res.status(400).json({
          error: `Invalid status transition from '${oldData.status || 'pending'}' to '${data.status}'`,
        });
      }

      const updates: Partial<OrderData> = { ...data, updatedAt: FieldValue.serverTimestamp() };

      if ((data.status === 'approved' || data.status === 'billed') && !oldData.invoiceNo) {
        updates.invoiceNo = await generateSequentialInvoiceNo();
      }

      await orderRef.update(updates);

      if (data.status && data.status !== oldData.status) {
        const transporter = createBrevoTransporter();
        const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || '';
        await notifyCustomerOfStatusChange(
          transporter,
          { ...oldData, ...updates, id: orderId },
          data.status,
          senderEmail,
          process.env.SMTP_USER,
          process.env.SMTP_PASS
        ).catch(err => console.error('[Email] Failed to notify status change:', err));
      }

      const updatedOrderForCalendar = { ...oldData, ...updates, id: orderId };
      invalidateCalendarSessionsCache();
      syncGoogleCalendarEvent(orderId, updatedOrderForCalendar).catch(err => {
        console.error('[Calendar] Auto-sync on order update failed:', err);
      });

      return res.json({ success: true, invoiceNo: updates.invoiceNo });
    }

    if (action === 'delete' && orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderData = snap.data() as OrderData;
      const ownerUid = orderData.userId || orderData.uid || null;

      if (!ownerUid || orderData.deletedByUser) {
        await orderRef.delete();
      } else {
        await orderRef.update({
          deletedByAdmin: true,
          deletedByAdminAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      invalidateCalendarSessionsCache();
      return res.json({ success: true, message: 'Order deleted on admin side' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Admin Quick Status Change
router.patch('/admin/orders/:orderId/status', verifyAdminToken, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const oldSnap = await orderRef.get();
    if (!oldSnap.exists) return res.status(404).json({ error: 'Order not found' });

    const oldData = oldSnap.data() as OrderData;
    if (status && !isValidStatusTransition(oldData.status || 'pending', status)) {
      return res.status(400).json({
        error: `Invalid status transition from '${oldData.status || 'pending'}' to '${status}'`,
      });
    }

    const updates: Partial<OrderData> = { status, updatedAt: FieldValue.serverTimestamp() };

    if ((status === 'approved' || status === 'billed') && !oldData.invoiceNo) {
      updates.invoiceNo = await generateSequentialInvoiceNo();
    }

    await orderRef.update(updates);

    if (status && status !== oldData.status) {
      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || '';
      await notifyCustomerOfStatusChange(
        transporter,
        { ...oldData, ...updates, id: orderId },
        status,
        senderEmail,
        process.env.SMTP_USER,
        process.env.SMTP_PASS
      ).catch(err => console.error('[Email] Failed to notify status change:', err));
    }

    const mergedOrderData = { ...oldData, ...updates, id: orderId, status };
    invalidateCalendarSessionsCache();
    syncGoogleCalendarEvent(orderId, mergedOrderData).catch(err => {
      console.error('[Calendar] Failed to auto-sync calendar event on PATCH status:', err);
    });

    return res.json({ success: true, invoiceNo: updates.invoiceNo });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Cancel Request
router.post('/orders/cancel', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const oldSnap = await orderRef.get();
    if (!oldSnap.exists) return res.status(404).json({ error: 'Order not found' });

    const oldData = oldSnap.data() as OrderData;
    const ownerUid = oldData.userId || oldData.uid || null;

    const callerUid = await verifyCustomerIdToken(req);
    if (!ownerUid || !callerUid || callerUid !== ownerUid) {
      return res.status(403).json({ error: 'Not authorized to cancel this order' });
    }

    if (!isValidStatusTransition(oldData.status || 'pending', 'cancel_requested')) {
      return res.status(400).json({
        error: `Cannot request cancellation for order in '${oldData.status || 'pending'}' status.`,
      });
    }

    const updates: Partial<OrderData> = {
      status: 'cancel_requested',
      cancelRequestedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await orderRef.update(updates);
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
    ).catch(err => console.error('[Email] Failed to notify cancel request:', err));

    // FCM: Notify admin topic of cancellation request
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
    ).catch(err => {
      console.error('[FCM] Failed to send cancel request push to admin topic:', err);
    });

    syncGoogleCalendarEvent(orderId, mergedOrderData).catch(err => {
      console.error('[Calendar] Failed to auto-sync calendar event on cancel request:', err);
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Order Delete
router.post('/orders/delete', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

    const orderData = snap.data() as OrderData;
    const ownerUid = orderData.userId || orderData.uid || null;

    const callerUid = await verifyCustomerIdToken(req);
    if (!ownerUid || !callerUid || callerUid !== ownerUid) {
      return res.status(403).json({ error: 'Not authorized to delete this order' });
    }

    // STRICT POLICY: Customers cannot delete an order manually until it has been deleted on the admin side
    if (!orderData.deletedByAdmin) {
      return res.status(403).json({
        error: 'Order cannot be deleted manually until it has been deleted or cleared by restaurant management (Admin).',
      });
    }

    await orderRef.delete();
    invalidateCalendarSessionsCache();
    return res.json({ success: true, message: 'Order successfully removed from history' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Poke Admin
router.post('/orders/poke', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

    const ownerData = snap.data() as OrderData;
    const ownerUid = ownerData.userId || ownerData.uid || null;
    if (ownerUid) {
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid || callerUid !== ownerUid) {
        return res.status(403).json({ error: 'Not authorized to poke this order' });
      }
    }

    await orderRef.update({
      lastPokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Admin has been nudged!' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Send Preliminary Invoice
const preliminaryInvoiceLimiter = createDistributedRateLimiter({
  prefix: 'preliminary_invoice',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

function isValidPdf(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.toString('ascii', 0, 5);
  return header.startsWith('%PDF-');
}

router.post('/orders/:id/send-preliminary-invoice', preliminaryInvoiceLimiter, async (req, res) => {
  const { id } = req.params;
  const { email, name, pdfBase64, lang } = req.body;

  if (!id || !email || !pdfBase64) {
    return res.status(400).json({ error: 'id, email and pdfBase64 are required' });
  }

  try {
    const db = getFirestore();
    const orderSnap = await db.collection('orders').doc(id).get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderSnap.data() as OrderData;
    if (!orderData.email || orderData.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match order record' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS missing)');
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (!isValidPdf(pdfBuffer)) {
      return res.status(400).json({ success: false, error: 'Invalid PDF format. File does not start with valid PDF header.' });
    }

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
    return res.status(500).json({ error: String(err) });
  }
});

// Admin Export Orders Excel
router.get('/admin/export/orders', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .filter((o: any) => !o.deletedByAdmin) as OrderData[];

    const workbook = await generateOrdersWorkbook(orders);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

const calendarSessionsCacheMap = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();
const CALENDAR_SESSIONS_CACHE_TTL_MS = 3 * 60 * 1000;

export function invalidateCalendarSessionsCache(): void {
  calendarSessionsCacheMap.clear();
}

// Keyed date range filtering for calendar sessions
router.get('/calendar-sessions', calendarSessionsLimiter, async (req, res) => {
  try {
    const fromDate = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const toDate = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    const cacheKey = `${fromDate || 'all'}|${toDate || 'all'}`;

    const cached = calendarSessionsCacheMap.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, sessions: cached.data });
    }

    const db = getFirestore();

    let snapshot: FirebaseFirestore.QuerySnapshot;
    if (fromDate && toDate) {
      snapshot = await db.collection('orders')
        .where('eventDate', '>=', fromDate)
        .where('eventDate', '<=', toDate)
        .get();
    } else {
      snapshot = await db.collection('orders').get();
    }

    const dailySessions: Record<string, {
      breakfast: { count: number; pax: number };
      lunch: { count: number; pax: number };
      hi_tea: { count: number; pax: number };
    }> = {};

    const parseOrderDateStr = (order: any): string | null => {
      try {
        let dateVal = order.eventDate || order.date || order.dateTime || order.createdAt;
        if (!dateVal) return null;
        if (typeof dateVal === 'string') {
          if (dateVal.length >= 10 && dateVal[4] === '-' && dateVal[7] === '-') {
            return dateVal.slice(0, 10);
          }
        }
        if (typeof dateVal === 'object' && dateVal !== null && 'seconds' in dateVal) {
          dateVal = new Date((dateVal as any).seconds * 1000);
        }
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      } catch {
        return null;
      }
    };

    snapshot.docs.forEach(doc => {
      const order = doc.data();
      if (order.status === 'cancelled' || order.status === 'rejected' || order.deletedByAdmin) return;

      const dateStr = parseOrderDateStr(order);
      if (!dateStr) return;

      if (!dailySessions[dateStr]) {
        dailySessions[dateStr] = {
          breakfast: { count: 0, pax: 0 },
          lunch: { count: 0, pax: 0 },
          hi_tea: { count: 0, pax: 0 },
        };
      }

      const pax = Number(order.guests || order.quantity || 0);
      const meals = Array.isArray(order.meals) ? order.meals : [];

      if (meals.includes('breakfast')) {
        dailySessions[dateStr].breakfast.count += 1;
        dailySessions[dateStr].breakfast.pax += pax;
      }
      if (meals.includes('lunch')) {
        dailySessions[dateStr].lunch.count += 1;
        dailySessions[dateStr].lunch.pax += pax;
      }
      if (meals.includes('hi_tea') || meals.includes('hi-tea') || meals.includes('tea_break')) {
        dailySessions[dateStr].hi_tea.count += 1;
        dailySessions[dateStr].hi_tea.pax += pax;
      }
    });

    if (calendarSessionsCacheMap.size > 100) {
      calendarSessionsCacheMap.clear();
    }

    calendarSessionsCacheMap.set(cacheKey, {
      data: dailySessions,
      expiresAt: Date.now() + CALENDAR_SESSIONS_CACHE_TTL_MS,
    });

    return res.json({ success: true, sessions: dailySessions });
  } catch (err) {
    console.error('[Calendar Sessions API Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// SECURITY & BUG FIX: Exact document ID mapping and PII stripping for calendar-orders
router.get('/calendar-orders', calendarSessionsLimiter, async (req, res) => {
  try {
    const db = getFirestore();

    const fromDate = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const toDate = typeof req.query.to === 'string' ? req.query.to.trim() : '';

    let snapshot: FirebaseFirestore.QuerySnapshot;
    if (fromDate && toDate) {
      snapshot = await db.collection('orders')
        .where('eventDate', '>=', fromDate)
        .where('eventDate', '<=', toDate)
        .get();
    } else {
      snapshot = await db.collection('orders').limit(100).get();
    }

    const orders = snapshot.docs
      .filter(doc => !doc.data().deletedByAdmin)
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          status: d.status || 'pending',
          eventDate: d.eventDate || d.date || null,
          meals: d.meals || [],
          guests: d.guests || d.quantity || 0,
        };
      });

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('[Calendar Orders API Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
