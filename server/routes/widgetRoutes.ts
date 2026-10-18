import { Router } from 'express';
import { getFirestore, generateSequentialInvoiceNo, verifyFirebaseIdToken } from '../firebaseAdmin.js';
import { verifyAdminJwt } from '../adminAuth.js';
import { FieldValue } from 'firebase-admin/firestore';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';
import { invoiceQueue } from '../services/invoiceQueue.js';
import { telemetry } from '../telemetry.js';

const router = Router();

// Consistent with the rest of the codebase's distributed rate limiting
// (orderRoutes.ts, authRoutes.ts, invoiceRoutes.ts all use this pattern).
const widgetPricingLimiter = createDistributedRateLimiter({
  prefix: 'widget_pricing',
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { success: false, error: 'Too many widget requests. Please try again later.' },
});

// ─── Auth helper for widget-keyed and admin endpoints ──────────────────────────
// Requires verified Admin credentials (JWT or Firebase ID token) or a verified widget pre-shared key.
export async function verifyAdminOrWidgetAuth(req: any, res: any): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 1. Verify via server-signed Admin JWT
  if (token) {
    const jwtPayload = verifyAdminJwt(token);
    if (jwtPayload && jwtPayload.admin === true) {
      req.user = jwtPayload;
      return true;
    }

    // 2. Verify via Firebase ID token
    try {
      const decoded = await verifyFirebaseIdToken(token);
      if (decoded) {
        const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
          .split(',')
          .map(e => e.trim().toLowerCase())
          .filter(Boolean);
        const userEmail = decoded.email?.toLowerCase();
        const isAdmin = decoded.admin === true || (userEmail && adminEmails.includes(userEmail));
        if (isAdmin) {
          req.user = decoded;
          return true;
        }
      }
    } catch {
      // Pass through to widget key check
    }
  }

  // 3. Verify via widget pre-shared key (fail-closed if not configured)
  const key = process.env.WIDGET_API_KEY;
  const provided = req.headers['x-widget-key'];
  if (key && provided && provided === key) {
    req.isWidgetAuthorized = true;
    return true;
  }

  telemetry.captureException(new Error('Unauthorized widget pricing access attempt'), {
    req,
    metadata: { reason: 'Missing or invalid admin token and widget key' },
  });

  res.status(401).json({
    success: false,
    error: 'Unauthorized: Requires valid admin credentials or authenticated widget key.',
  });
  return false;
}

function checkWidgetKey(req: any, res: any): boolean {
  const key = process.env.WIDGET_API_KEY;
  if (!key) {
    res.status(503).json({ success: false, error: 'Widget API not configured.' });
    return false;
  }
  const provided = req.headers['x-widget-key'];
  if (!provided || provided !== key) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return false;
  }
  return true;
}

// Helper to format meal types into clean Malay labels
function formatMealTypeBM(meals: any): string {
  if (!meals) return 'Katering';
  const arr = Array.isArray(meals) ? meals : [String(meals)];
  if (arr.length === 0) return 'Katering';
  const map: Record<string, string> = {
    breakfast: 'Sarapan',
    lunch: 'Tengahari',
    hi_tea: 'Hi-Tea',
    dinner: 'Makan Malam',
  };
  return arr.map(m => map[m] || m).join(' + ');
}

// ─── 1. Upcoming orders widget (public, no PII) ───────────────────────────────
// Returns upcoming orders with: meal type, quantity, lokasi, time
// Enables scroll with configurable limit (default 50)
router.get('/widget/upcoming-orders', async (req, res) => {
  try {
    const db = getFirestore();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
    const limitNum = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const snapshot = await db.collection('orders')
      .where('eventDate', '>=', todayStr)
      .orderBy('eventDate', 'asc')
      .limit(limitNum * 2)
      .get();

    const excludedStatuses = new Set(['cancelled', 'rejected', 'cancel_requested']);

    const orders = snapshot.docs
      .map(doc => {
        const d = doc.data();
        const status = d.status || 'pending';
        // Admin "delete" is a soft-delete when the order has an owning
        // customer account (see POST /admin/orders action=delete in
        // orderRoutes.ts): the doc stays in `orders` with deletedByAdmin:
        // true instead of being removed. Every other consumer of this
        // collection (orderRoutes.ts lines ~633/716/781) already filters
        // this flag out; the widget endpoints previously didn't, which
        // let admin-deleted orders keep showing as ghost records in the
        // home-screen widget until the customer separately hard-deleted
        // their own copy.
        if (d.deletedByAdmin) return null;
        if (excludedStatuses.has(status)) return null;

        const mealsArr = Array.isArray(d.meals) ? d.meals : (d.meals ? [d.meals] : []);
        const mealTypeStr = formatMealTypeBM(mealsArr);
        const locStr = d.location || d.deliveryLocation || d.address || d.venue || 'Lokasi Belum Dinyatakan';
        const eventDateVal = d.eventDate || d.date || null;

        return {
          id: doc.id,
          eventDate: eventDateVal,
          date: eventDateVal,
          time: d.time || null,
          meals: mealsArr,
          mealType: mealTypeStr,
          quantity: d.quantity || d.guests || d.pax || 0,
          location: locStr,
          // Public endpoint: do not expose customer/company name (PII).
          to: 'Tempahan',
          menu: d.menu || '',
          status: status,
        };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null)
      .slice(0, limitNum);

    return res.json({ success: true, orders, date: todayStr, count: orders.length });
  } catch (err) {
    console.error('[Widget upcoming-orders Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 2. Orders for the PRICING widget (widget-key protected) ──────────────────
// Returns orders (both past and new/upcoming) that have not had their prices keyed in yet.
// Query checks status in ['pending', 'approved'] and filters out any already billed.
router.get(['/widget/today-pricing-orders', '/widget/unpriced-orders'], widgetPricingLimiter, async (req, res) => {
  if (!checkWidgetKey(req, res)) return;

  try {
    const db = getFirestore();
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(now);

    // Fetch all pending / approved orders across past, today, and future
    const snapshot = await db.collection('orders')
      .where('status', 'in', ['pending', 'approved'])
      .get();

    let pastCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;

    const unpricedOrders = snapshot.docs
      .map(doc => {
        const d = doc.data();
        // Same soft-delete gap as /widget/upcoming-orders — see comment there.
        if (d.deletedByAdmin) return null;

        const eventDateVal = d.eventDate || d.date || '';
        const isBilled = d.status === 'billed';
        const hasPrices = d.prices && Object.keys(d.prices).length > 0 && Number(d.totalAmount) > 0;

        // Skip orders that are already billed or priced
        if (isBilled || (hasPrices && d.status !== 'pending' && d.status !== 'approved')) {
          return null;
        }

        const mealsArr = Array.isArray(d.meals) ? d.meals : (d.meals ? [d.meals] : []);
        const mealTypeStr = formatMealTypeBM(mealsArr);

        const isPast = Boolean(eventDateVal && eventDateVal < todayStr);
        const isToday = Boolean(eventDateVal && eventDateVal === todayStr);
        const isUpcoming = Boolean(eventDateVal && eventDateVal > todayStr);

        if (isPast) pastCount++;
        else if (isToday) todayCount++;
        else upcomingCount++;

        return {
          id: doc.id,
          to: d.to || d.company || 'Pelanggan',
          attn: d.attn || d.name || '-',
          meals: mealsArr,
          mealType: mealTypeStr,
          quantity: Number(d.quantity || d.guests || d.pax || 0),
          menu: d.menu || '',
          preparationType: d.preparationType || 'buffet',
          time: d.time || '',
          location: d.location || d.deliveryLocation || d.address || '',
          eventDate: eventDateVal,
          date: eventDateVal,
          status: d.status || 'pending',
          isPast,
          isToday,
          isUpcoming,
          dateCategory: isPast ? 'past' : (isToday ? 'today' : 'upcoming'),
          prices: d.prices || {},
          totalAmount: d.totalAmount || null,
          invoiceNo: d.invoiceNo || null,
        };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);

    // Sort: past unpriced orders first (oldest first so overdue orders get resolved),
    // followed by today's orders, followed by upcoming orders
    unpricedOrders.sort((a, b) => {
      const dateA = a.eventDate || '';
      const dateB = b.eventDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time || '').localeCompare(b.time || '');
    });

    return res.json({
      success: true,
      orders: unpricedOrders,
      date: todayStr,
      count: unpricedOrders.length,
      pastCount,
      todayCount,
      upcomingCount,
    });
  } catch (err) {
    console.error('[Widget today-pricing-orders Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 3. Set pricing + auto-generate & email final invoice (widget-key protected) ─
// This is the core action of the pricing widget:
//   1. Receive pricePerPax per meal type from widget input
//   2. Calculate totalAmount
//   3. Generate sequential invoice number
//   4. Generate full PDF (server-side, same design as app)
//   5. Email PDF to customer
//   6. Update Firestore order to status: 'billed'
router.post('/widget/set-pricing', widgetPricingLimiter, async (req, res) => {
  if (!(await verifyAdminOrWidgetAuth(req, res))) return;

  const { orderId, prices } = req.body as {
    orderId: string;
    prices: Record<string, number>;
  };

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ success: false, error: 'orderId required.' });
  }
  if (!prices || typeof prices !== 'object' || Object.keys(prices).length === 0) {
    return res.status(400).json({ success: false, error: 'prices object required.' });
  }

  // Validate: all price values must be positive numbers
  for (const [meal, price] of Object.entries(prices)) {
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ success: false, error: `Invalid price for ${meal}: must be a positive number.` });
    }
  }

  try {
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const order = orderSnap.data()!;

    // Guard: only price pending/approved orders; don't re-bill a billed order accidentally
    if (order.status === 'billed' || order.status === 'cancelled' || order.status === 'rejected') {
      return res.status(409).json({
        success: false,
        error: `Order is already '${order.status}'. Cannot re-price.`,
        invoiceNo: order.invoiceNo || null
      });
    }

    // Calculate totalAmount: sum of (price * quantity) for each meal in the order
    const quantity = Number(order.quantity || order.guests || 0);
    const orderMeals: string[] = Array.isArray(order.meals) ? order.meals : [];

    let totalAmount = 0;
    const finalPrices: Record<string, number> = {};

    for (const meal of orderMeals) {
      const priceForMeal = prices[meal] ?? prices[meal.replace('_', '')] ?? null;
      if (priceForMeal !== null && priceForMeal > 0) {
        finalPrices[meal] = priceForMeal;
        totalAmount += priceForMeal * quantity;
      }
    }

    // If no meal matched, fall back to a single 'default' price
    if (Object.keys(finalPrices).length === 0 && prices['default']) {
      finalPrices['default'] = prices['default'];
      totalAmount = prices['default'] * quantity;
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Could not compute a valid total. Check that meal types in the order match the prices provided.' });
    }

    // Generate sequential invoice number (RW) or transition QT prefix to RW
    const invoiceNo = (order.invoiceNo && order.invoiceNo.startsWith('QT'))
      ? order.invoiceNo.replace(/^QT\s*/i, 'RW ')
      : (order.invoiceNo || await generateSequentialInvoiceNo(false));

    // Build order object for asynchronous pipeline
    const orderForPdf = {
      ...order,
      id: orderId,
      prices: finalPrices,
      totalAmount,
      invoiceNo,
      invoiceGeneratedAt: new Date().toISOString(),
    };

    const recipientEmail = order.email;

    // Atomically commit the status update to Firestore
    await orderRef.update({
      status: 'billed',
      prices: finalPrices,
      totalAmount,
      invoiceNo,
      invoiceGeneratedAt: new Date().toISOString(),
      invoiceDeliveryStatus: recipientEmail ? 'queued' : 'skipped_no_email',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Asynchronously dispatch PDF generation & email delivery in background queue
    if (recipientEmail && typeof recipientEmail === 'string' && recipientEmail.includes('@')) {
      invoiceQueue.enqueue({
        orderId,
        orderForPdf,
        invoiceNo,
        recipientEmail,
        totalAmount,
        companyName: order.to || order.company || 'Pelanggan',
        lang: (order.lang === 'en') ? 'en' : 'bm',
      });
    }

    telemetry.captureBreadcrumb('Pricing confirmed and invoice delivery queued', {
      orderId,
      invoiceNo,
      totalAmount,
    });

    return res.status(200).json({
      success: true,
      orderId,
      invoiceNo,
      totalAmount,
      status: 'queued',
      message: `Invois ${invoiceNo} disahkan. Penghantaran invois sedang diproses di latar belakang.`
    });

  } catch (err) {
    telemetry.captureException(err, { req, metadata: { orderId } });
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
