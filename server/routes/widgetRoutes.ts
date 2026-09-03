import { Router } from 'express';
import { getFirestore, generateSequentialInvoiceNo } from '../firebaseAdmin.js';
import { createBrevoTransporter } from '../emailService.js';
import { generateServerInvoicePdf } from '../services/serverPdfService.js';
import { FieldValue } from 'firebase-admin/firestore';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

// Consistent with the rest of the codebase's distributed rate limiting
// (orderRoutes.ts, authRoutes.ts, invoiceRoutes.ts all use this pattern).
const widgetPricingLimiter = createDistributedRateLimiter({
  prefix: 'widget_pricing',
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { success: false, error: 'Too many widget requests. Please try again later.' },
});

// ─── Auth helper for widget-keyed endpoints ──────────────────────────────────
// Widget endpoints that trigger side-effects (set prices, send invoice) need
// a lightweight pre-shared key so they cannot be called by arbitrary clients.
// The key is stored as env var WIDGET_API_KEY on Render and hardcoded in the
// Android APK (self-distributed, Noh is sole user). This is deliberately NOT
// a JWT — the widget is not a browser; it runs as a background Android service.
function checkWidgetKey(req: any, res: any): boolean {
  const key = process.env.WIDGET_API_KEY;
  if (!key) {
    // If env var is not set, fail-closed: don't allow any access.
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
          to: d.to || d.company || d.attn || d.name || '',
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
  if (!checkWidgetKey(req, res)) return;

  const { orderId, prices } = req.body as {
    orderId: string;
    // prices: { breakfast?: number, lunch?: number, hi_tea?: number }
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
      // Accept prices keyed by 'breakfast', 'lunch', 'hi_tea' (server canonical form)
      const priceForMeal = prices[meal] ?? prices[meal.replace('_', '')] ?? null;
      if (priceForMeal !== null && priceForMeal > 0) {
        finalPrices[meal] = priceForMeal;
        totalAmount += priceForMeal * quantity;
      }
    }

    // If no meal matched (e.g. order has no meals array), fall back to a single 'default' price
    if (Object.keys(finalPrices).length === 0 && prices['default']) {
      finalPrices['default'] = prices['default'];
      totalAmount = prices['default'] * quantity;
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Could not compute a valid total. Check that meal types in the order match the prices provided.' });
    }

    // Generate sequential invoice number (Firestore transaction, same as existing flow)
    const invoiceNo = await generateSequentialInvoiceNo();

    // Build order object for PDF generation
    const orderForPdf = {
      ...order,
      id: orderId,
      prices: finalPrices,
      totalAmount,
      invoiceNo,
      invoiceGeneratedAt: new Date().toISOString(),
    };

    // Generate PDF server-side
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateServerInvoicePdf(orderForPdf, true);
    } catch (pdfErr) {
      console.error('[Widget set-pricing] PDF generation failed:', pdfErr);
      return res.status(500).json({ success: false, error: 'PDF generation failed. Prices NOT saved yet.' });
    }

    // Email PDF to customer
    const recipientEmail = order.email;
    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Order has no valid customer email. Cannot send invoice.' });
    }

    try {
      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;
      const companyName = order.to || 'Pelanggan';
      const lang = (order.lang === 'en') ? 'en' : 'bm';

      await transporter.sendMail({
        from: `"Restoran Wawasan Pak Usop" <${senderEmail}>`,
        to: recipientEmail.trim(),
        subject: lang === 'bm'
          ? `[Restoran Wawasan] Invois Rasmi ${invoiceNo} - ${companyName}`
          : `[Restoran Wawasan] Official Invoice ${invoiceNo} - ${companyName}`,
        text: lang === 'bm'
          ? `Salam hormat,\n\nSila rujuk invois rasmi kami ${invoiceNo} yang dilampirkan bersama emel ini.\n\nJumlah: RM ${totalAmount.toFixed(2)}\n\nTerima kasih atas kepercayaan anda.\n\nRestoran Wawasan Pak Usop\nUnit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya`
          : `Dear ${order.attn || companyName},\n\nPlease find our official invoice ${invoiceNo} attached to this email.\n\nTotal: RM ${totalAmount.toFixed(2)}\n\nThank you for your continued trust.\n\nRestoran Wawasan Pak Usop\nUnit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya`,
        attachments: [{
          filename: `Invoice_${invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });
    } catch (emailErr) {
      // EMAIL FAILED: Do NOT update Firestore yet — caller should retry.
      // (If we saved 'billed' first then email failed, order would be stuck billed
      // but customer never received the invoice.)
      console.error('[Widget set-pricing] Email failed:', emailErr);
      return res.status(500).json({
        success: false,
        error: 'Invoice generated but email delivery failed. Prices NOT saved. Please retry.',
        invoiceNo
      });
    }

    // Both PDF and email succeeded — now commit the Firestore update atomically
    await orderRef.update({
      status: 'billed',
      prices: finalPrices,
      totalAmount,
      invoiceNo,
      invoiceGeneratedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Widget set-pricing] Order ${orderId} billed. Invoice ${invoiceNo} sent to ${recipientEmail}.`);

    return res.json({
      success: true,
      orderId,
      invoiceNo,
      totalAmount,
      message: `Invoice ${invoiceNo} emailed to ${recipientEmail}.`
    });

  } catch (err) {
    console.error('[Widget set-pricing Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
