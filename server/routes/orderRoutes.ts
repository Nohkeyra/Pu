import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, type OrderData, generateSequentialInvoiceNo, verifyCustomerIdToken } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { notifyCustomerOfStatusChange, createBrevoTransporter } from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';
import { generateOrdersWorkbook } from '../exportService.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';
import { MALAYSIAN_HALAL_CATALOG } from '../../src/data/malaysianHalalCatalog.js';

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

  // Add from DEFAULT_MENU_ITEMS
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

  // Add from MALAYSIAN_HALAL_CATALOG
  if (Array.isArray(MALAYSIAN_HALAL_CATALOG)) {
    for (const item of MALAYSIAN_HALAL_CATALOG) {
      if (item && item.suggestedPrice) {
        const alreadyExists = list.some(d => 
          d.nameEn.toLowerCase() === item.nameEn.toLowerCase() || 
          d.nameBm.toLowerCase() === item.nameBm.toLowerCase()
        );
        if (!alreadyExists) {
          list.push({
            nameEn: item.nameEn || '',
            nameBm: item.nameBm || '',
            price: Number(item.suggestedPrice),
          });
        }
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

  // Tokenize the fragment
  const fragmentWords = cleanFragment
    .split(/\s+/)
    .map(w => w.replace(/[^\w\s]/g, ""))
    .filter(w => w.length > 1);

  for (const dish of refDishes) {
    const nameEnClean = dish.nameEn.toLowerCase();
    const nameBmClean = dish.nameBm.toLowerCase();

    let score = 0;

    // 1. Exact string match
    if (nameEnClean === cleanFragment || nameBmClean === cleanFragment) {
      score += 100;
    }

    // 2. Substring match
    if (cleanFragment.includes(nameEnClean) || cleanFragment.includes(nameBmClean)) {
      score += 50;
    }
    if (nameEnClean.includes(cleanFragment) || nameBmClean.includes(cleanFragment)) {
      score += 40;
    }

    // 3. Word token matching
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

function calculateOrderPricing(
  dishes: any[] | undefined,
  veggies: any[] | undefined,
  customMenu: string | undefined,
  quantity: number,
  meals: string[]
): { prices: Record<string, number>; totalAmount: number } {
  const refDishes = getReferenceDishes();
  let pricePerPax = 0;

  // 1. Sum up picked dishes
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

  // 2. Sum up picked veggies
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

  // 3. Handle custom order strings
  if (customMenu && typeof customMenu === 'string' && customMenu.trim()) {
    const fragments = splitCustomMenu(customMenu);
    for (const fragment of fragments) {
      const bestMatch = findBestMatch(fragment, refDishes);
      if (bestMatch) {
        pricePerPax += bestMatch.price;
      }
    }
  }

  // 4. Fallback if price is still 0 (Default Boxed Meal)
  if (pricePerPax === 0) {
    pricePerPax = 11.50;
  }

  // 5. Construct prices map and total amount
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

// F-RATE (audit 2026-08-11): POST /api/orders is public (no verifyAdminToken)
// and writes to Firestore + fires calendar sync on every call. It previously
// had no rate limiter at all, unlike /send-preliminary-invoice which already
// used this same express-rate-limit pattern. A spam bot could hit this
// unthrottled and flood the orders collection / calendar / email pipeline.
// idempotencyKey (see IDEMPOTENCY_KEY_RE above) already prevents duplicate
// orders from a legit retry, but does nothing to stop a high-volume spammer
// sending fresh keys each time — that's what this limiter is for.
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many order submissions. Please try again later.' },
});

// F-RATE (audit 2026-08-11): /cancel, /delete, /poke are also public routes
// (ownership is checked inside the handler via verifyCustomerIdToken, but
// there's no rate limiter guarding the endpoint itself). Looser than the
// create-order limiter since a legitimate customer may legitimately poke or
// retry a cancel a few times, but still bounded.
const customerOrderActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

// Public Order Submission
router.post('/', createOrderLimiter, async (req, res) => {
  try {
    const { idempotencyKey, ...orderData } = req.body || {};
    const db = getFirestore();

    // SERVER-SIDE PRICING OVERWRITE & ESTIMATE
    const { prices, totalAmount } = calculateOrderPricing(
      orderData.dishes,
      orderData.veggies,
      orderData.customMenu,
      orderData.quantity || orderData.guests,
      orderData.meals || []
    );

    orderData.prices = prices;
    orderData.totalAmount = totalAmount;

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
          content: Buffer.from(pdfBase64, 'base64'),
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

// F-CALENDAR (audit 2026-08-11): Public calendar-sessions aggregation endpoint.
// Since public guests and corporate customers are restricted from performing collection-wide reads
// on '/orders' for security/privacy rules, this server-side endpoint compiles and aggregates
// daily workload sessions anonymously and securely.
//
// SECURITY FIX (2026-08-13): this endpoint had no rate limiter and no auth,
// and does a full `orders` collection scan on every call (it can't use
// .limit() — the aggregation needs every order across all dates, not a
// recent slice). Unlike the widget endpoint (which is bounded by
// .limit(20)), an unbounded full-collection read repeated rapidly is a
// real cost/DoS vector: each hit is a full Firestore read of the entire
// orders collection, and the orders collection only grows over time.
// Two changes: (1) a rate limiter matching the other public order routes
// in this file, (2) a short in-memory cache so repeated calls within the
// TTL reuse the last computed result instead of re-scanning Firestore.
// Cache is intentionally short (2 min) — Calendar page data doesn't need
// to be second-fresh, and this is the same in-memory (no Redis) tradeoff
// already accepted for adminLoginLimiter on this single-instance deployment.
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

router.get('/calendar-sessions', calendarSessionsLimiter, async (_req, res) => {
  try {
    if (calendarSessionsCache && calendarSessionsCache.expiresAt > Date.now()) {
      return res.json({ success: true, sessions: calendarSessionsCache.data });
    }

    const db = getFirestore();
    const snapshot = await db.collection('orders').get();
    
    const dailySessions: Record<string, {
      breakfast: { count: number; pax: number };
      lunch: { count: number; pax: number };
      hi_tea: { count: number; pax: number };
    }> = {};

    const parseOrderDateStr = (order: any): string | null => {
      try {
        let dateVal = order.eventDate || order.date || order.dateTime || order.createdAt;
        if (!dateVal) return null;
        if (typeof dateVal === 'object' && dateVal !== null && 'seconds' in dateVal) {
          dateVal = new Date((dateVal as any).seconds * 1000);
        }
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
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

export default router;
