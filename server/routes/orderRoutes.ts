import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, type OrderData, generateSequentialInvoiceNo, verifyCustomerIdToken } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { notifyCustomerOfStatusChange, createBrevoTransporter } from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';
import { generateOrdersWorkbook } from '../exportService.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';
import { isValidStatusTransition } from '../services/orderValidator.js';

const router = Router();

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{5,50}$/;

interface ReferenceDish {
  nameEn: string;
  nameBm: string;
  price: number;
}

let cachedReferenceDishes: ReferenceDish[] = [];

function getReferenceDishes(): ReferenceDish[] {
  if (cachedReferenceDishes.length > 0) {
    return cachedReferenceDishes;
  }

  const list: ReferenceDish[] = [];

  if (Array.isArray(DEFAULT_MENU_ITEMS)) {
    for (const item of DEFAULT_MENU_ITEMS) {
      if (item && item.price) {
        list.push({
          nameEn: item.nameEn || '',
          nameBm: item.nameBm || '',
          price: Number(item.price),
        });
      }
    }
  }

  cachedReferenceDishes = list;
  return list;
}

function splitCustomMenu(menuStr: string): string[] {
  if (!menuStr) return [];
  const normalized = menuStr
    .replace(/\s+dan\s+/gi, ',')
    .replace(/\s+and\s+/gi, ',')
    .replace(/\s+dengan\s+/gi, ',')
    .replace(/\s+with\s+/gi, ',')
    .replace(/\s+&\s+/gi, ',')
    .replace(/\s*\+\s*/g, ',')
    .replace(/\n+/g, ',');

  return normalized
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function findBestMatch(fragment: string, refDishes: ReferenceDish[]): ReferenceDish | null {
  const cleanFragment = fragment.toLowerCase().trim();
  if (!cleanFragment) return null;

  let bestMatch: ReferenceDish | null = null;
  let bestScore = 0;

  const fragmentWords = cleanFragment
    .split(/\s+/)
    .map(w => w.replace(/[^\w\s]/g, ""))
    .filter(w => w.length > 1);

  for (const dish of refDishes) {
    const nameEnClean = dish.nameEn.toLowerCase();
    const nameBmClean = dish.nameBm.toLowerCase();

    let score = 0;

    if (nameEnClean === cleanFragment || nameBmClean === cleanFragment) {
      score += 100;
    }

    if (cleanFragment.includes(nameEnClean) || cleanFragment.includes(nameBmClean)) {
      score += 50;
    }
    if (nameEnClean.includes(cleanFragment) || nameBmClean.includes(cleanFragment)) {
      score += 40;
    }

    const dishEnWords = nameEnClean.split(/\s+/).map(w => w.replace(/[^\w\s]/g, "")).filter(w => w.length > 1);
    const dishBmWords = nameBmClean.split(/\s+/).map(w => w.replace(/[^\w\s]/g, "")).filter(w => w.length > 1);

    let enWordMatches = 0;
    for (const fw of fragmentWords) {
      if (dishEnWords.includes(fw)) enWordMatches++;
    }

    let bmWordMatches = 0;
    for (const fw of fragmentWords) {
      if (dishBmWords.includes(fw)) bmWordMatches++;
    }

    const wordMatchScore = Math.max(enWordMatches, bmWordMatches) * 10;
    score += wordMatchScore;

    if (score > bestScore && score >= 15) {
      bestScore = score;
      bestMatch = dish;
    }
  }

  return bestMatch;
}

export const DEFAULT_FALLBACK_PRICE_PER_PAX = 11.50;

function calculateOrderPricing(
  dishes: any[] | undefined,
  veggies: any[] | undefined,
  customMenu: string | undefined,
  quantity: number,
  meals: string[]
): { prices: Record<string, number>; totalAmount: number } {
  const refDishes = getReferenceDishes();
  let pricePerPax = 0;

  if (Array.isArray(dishes)) {
    for (const dish of dishes) {
      const matchInRef = refDishes.find(r => r.nameEn.toLowerCase() === (dish.nameEn || '').toLowerCase() || r.nameBm.toLowerCase() === (dish.nameBm || '').toLowerCase());
      if (matchInRef) {
        pricePerPax += matchInRef.price;
      } else {
        pricePerPax += Number(dish.price) || 0;
      }
    }
  }

  if (Array.isArray(veggies)) {
    for (const veg of veggies) {
      const matchInRef = refDishes.find(r => r.nameEn.toLowerCase() === (veg.nameEn || '').toLowerCase() || r.nameBm.toLowerCase() === (veg.nameBm || '').toLowerCase());
      if (matchInRef) {
        pricePerPax += matchInRef.price;
      } else {
        pricePerPax += Number(veg.price) || 0;
      }
    }
  }

  if (customMenu && typeof customMenu === 'string' && customMenu.trim()) {
    const fragments = splitCustomMenu(customMenu);
    for (const fragment of fragments) {
      const bestMatch = findBestMatch(fragment, refDishes);
      if (bestMatch) {
        pricePerPax += bestMatch.price;
      }
    }
  }

  const isDefaultBox = customMenu === 'Set Box Makanan dan Minuman' || 
    ( (!dishes || dishes.length === 0) && (!veggies || veggies.length === 0) && customMenu === 'Set Box Makanan dan Minuman' );

  if (pricePerPax === 0 && !isDefaultBox) {
    pricePerPax = DEFAULT_FALLBACK_PRICE_PER_PAX;
  }

  const prices: Record<string, number> = {};
  const mealCount = Array.isArray(meals) && meals.length > 0 ? meals.length : 1;

  if (Array.isArray(meals)) {
    meals.forEach(meal => {
      prices[meal] = pricePerPax;
    });
  } else {
    prices['default'] = pricePerPax;
  }

  const totalAmount = pricePerPax * (Number(quantity) || 1) * mealCount;

  return {
    prices,
    totalAmount
  };
}

const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many order submissions. Please try again later.' },
});

const customerOrderActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
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

  const name = typeof body.name === 'string' ? body.name.trim() : typeof body.customerName === 'string' ? body.customerName.trim() : '';
  if (!name) {
    return res.status(400).json({ success: false, error: 'Customer name (name) is required.' });
  }

  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (!contact && !email && !phone) {
    return res.status(400).json({ success: false, error: 'At least one contact method (contact, phone, or email) is required.' });
  }

  const eventDate = typeof body.eventDate === 'string' ? body.eventDate.trim() : typeof body.date === 'string' ? body.date.trim() : '';
  if (!eventDate) {
    return res.status(400).json({ success: false, error: 'Event date (eventDate or date) is required.' });
  }

  const guestsNum = Number(body.guests || body.quantity);
  if (isNaN(guestsNum) || guestsNum < 1) {
    return res.status(400).json({ success: false, error: 'Number of guests or quantity must be a positive number.' });
  }

  next();
}

// Public Order Submission
router.post('/', createOrderLimiter, validateOrderSubmission, async (req, res) => {
  try {
    const { idempotencyKey, ...orderData } = req.body || {};
    const db = getFirestore();

    const { prices, totalAmount } = calculateOrderPricing(
      orderData.dishes,
      orderData.veggies,
      orderData.customMenu,
      orderData.quantity || orderData.guests,
      orderData.meals || []
    );

    orderData.prices = prices;
    orderData.totalAmount = totalAmount;

    if (Array.isArray(orderData.dishes)) {
      const isBm = orderData.lang === 'bm';
      orderData.dishes = orderData.dishes
        .map((d: any) => {
          if (typeof d === 'string') return d;
          if (d && typeof d === 'object') {
            return (isBm ? d.nameBm : d.nameEn) || d.nameBm || d.nameEn || '';
          }
          return '';
        })
        .filter((name: string) => typeof name === 'string' && name.length > 0);
    }

    let orderId: string;
    let isDuplicate = false;

    if (typeof idempotencyKey === 'string' && IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
      const docRef = db.collection('orders').doc(idempotencyKey);
      try {
        await docRef.create({
          ...orderData,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp()
        });
        orderId = docRef.id;
      } catch (createErr: any) {
        const alreadyExists = createErr?.code === 6 || /ALREADY_EXISTS/i.test(String(createErr?.message || ''));
        if (!alreadyExists) throw createErr;
        orderId = docRef.id;
        isDuplicate = true;
      }
    } else {
      const docRef = await db.collection('orders').add({
        ...orderData,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
      });
      orderId = docRef.id;
    }

    const initialOrderData: OrderData = {
      ...orderData,
      id: orderId,
      status: 'pending'
    };

    if (!isDuplicate) {
      invalidateCalendarSessionsCache();
      syncGoogleCalendarEvent(orderId, initialOrderData).catch(err => {
        console.error('[Calendar] Auto-sync initial pending status failed:', err);
      });
    }

    return res.json({ id: orderId, duplicate: isDuplicate, prices: orderData.prices, totalAmount: orderData.totalAmount });
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
      const pageSize = req.body.pageSize || 50;
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
      await db.collection('orders').doc(orderId).delete();
      invalidateCalendarSessionsCache();
      return res.json({ success: true });
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
        error: `Invalid status transition from '${oldData.status || 'pending'}' to '${status}'`
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
router.post('/cancel', customerOrderActionLimiter, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const oldSnap = await orderRef.get();
    if (!oldSnap.exists) return res.status(404).json({ error: 'Order not found' });

    const oldData = oldSnap.data() as OrderData;
    const ownerUid = oldData.userId || oldData.uid || null;
    if (ownerUid) {
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid || callerUid !== ownerUid) {
        return res.status(403).json({ error: 'Not authorized to cancel this order' });
      }
    }

    const updates: Partial<OrderData> = {
      status: 'cancel_requested',
      cancelRequestedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp()
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

    syncGoogleCalendarEvent(orderId, mergedOrderData).catch(err => {
      console.error('[Calendar] Failed to auto-sync calendar event on cancel request:', err);
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Order Delete
router.post('/delete', customerOrderActionLimiter, async (req, res) => {
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

    await orderRef.delete();
    invalidateCalendarSessionsCache();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Poke Admin
router.post('/poke', customerOrderActionLimiter, async (req, res) => {
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
      updatedAt: FieldValue.serverTimestamp()
    });

    return res.json({ success: true, message: 'Admin has been nudged!' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Send Preliminary Invoice
const preliminaryInvoiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

/**
 * Validate that a Buffer contains a valid PDF by checking magic bytes.
 */
function isValidPdf(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.toString('ascii', 0, 5);
  return header.startsWith('%PDF-');
}

router.post('/:id/send-preliminary-invoice', preliminaryInvoiceLimiter, async (req, res) => {
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

    // SECURITY FIX: Validate PDF magic bytes before sending
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
          contentType: 'application/pdf'
        }
      ]
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
    const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as OrderData[];

    const workbook = await generateOrdersWorkbook(orders);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Orders_Export.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch {
    return res.status(500).json({ error: 'Export failed' });
  }
});

const calendarSessionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

let calendarSessionsCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const CALENDAR_SESSIONS_CACHE_TTL_MS = 3 * 60 * 1000;

export function invalidateCalendarSessionsCache(): void {
  calendarSessionsCache = null;
}

// SECURITY FIX: Added optional date range filtering to prevent unbounded full-collection scans.
// Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/calendar-sessions', calendarSessionsLimiter, async (req, res) => {
  try {
    if (calendarSessionsCache && calendarSessionsCache.expiresAt > Date.now()) {
      return res.json({ success: true, sessions: calendarSessionsCache.data });
    }

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
      if (order.status === 'cancelled' || order.status === 'rejected') return;

      const dateStr = parseOrderDateStr(order);
      if (!dateStr) return;

      if (!dailySessions[dateStr]) {
        dailySessions[dateStr] = {
          breakfast: { count: 0, pax: 0 },
          lunch: { count: 0, pax: 0 },
          hi_tea: { count: 0, pax: 0 }
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

    calendarSessionsCache = { data: dailySessions, expiresAt: Date.now() + CALENDAR_SESSIONS_CACHE_TTL_MS };

    return res.json({ success: true, sessions: dailySessions });
  } catch (err) {
    console.error('[Calendar Sessions API Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// SECURITY FIX: Added date range filtering and removed full PII exposure
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

    // SECURITY FIX: Strip PII from public calendar-orders response
    const orders = snapshot.docs.map(doc => {
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
