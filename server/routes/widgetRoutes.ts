import { calculateOrderCharges, orderFoodSubtotal, validCharge } from '../../src/lib/orderCharges.js';
import { Router } from 'express';
import { getFirestore, generateSequentialIndividualInvoiceNo, verifyFirebaseIdToken, sendNotificationToTopic } from '../firebaseAdmin.js';
import { verifyAdminJwtWithRevocation } from '../adminAuth.js';
import { FieldValue } from 'firebase-admin/firestore';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';
import { invoiceQueue } from '../services/invoiceQueue.js';
import { telemetry } from '../telemetry.js';
import { getOrderEventDate } from '../../src/lib/orderTimestamp.js';
import { publicCalendar } from '../services/publicCalendar.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';

const router = Router();

// Consistent with the rest of the codebase's distributed rate limiting
// (orderRoutes.ts, authRoutes.ts, invoiceRoutes.ts all use this pattern).
const widgetPricingLimiter = createDistributedRateLimiter({
  prefix: 'widget_pricing',
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { success: false, error: 'Too many widget requests. Please try again later.' },
});

// Same budget as the pricing widget endpoints (widgets refresh about every 30 minutes).
// This route does a full collection scan, so it must not be the one unthrottled widget path.
const widgetUpcomingLimiter = createDistributedRateLimiter({
  prefix: 'widget_upcoming',
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { success: false, error: 'Too many widget requests. Please try again later.' },
});

// ─── Admin authentication for privileged widget endpoints ─────────────────────
// Requires verified Admin credentials (server-signed admin JWT or Firebase ID token).
// A key embedded in a distributed APK is not an authentication factor.
export async function verifyAdminAuth(req: any, res: any): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 1. Verify via server-signed Admin JWT (with revocation check — S-1 fix)
  if (token) {
    const jwtPayload = await verifyAdminJwtWithRevocation(token);
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
        // Only a verified Firebase email can satisfy the admin email allowlist.
        // An unverified email claim is not proof that the caller owns the address.
        const userEmail = decoded.email_verified === true ? decoded.email?.toLowerCase() : undefined;
        const isAdmin = decoded.admin === true || (Boolean(userEmail) && adminEmails.includes(userEmail!));
        if (isAdmin) {
          req.user = decoded;
          return true;
        }
      }
    } catch {
      // Invalid or expired Firebase token: reject below.
    }
  }

  // No shared-key fallback: distributed APK contents are inspectable.
  telemetry.captureException(new Error('Unauthorized privileged widget access attempt'), {
    req,
    metadata: { reason: 'Missing or invalid admin credentials' },
  });

  res.status(401).json({
    success: false,
    error: 'Unauthorized: valid admin credentials required.',
  });
  return false;
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

// ─── 1. Upcoming orders widget (admin-authenticated) ──────────────────────────
// Operational order data is restricted to authenticated administrators.
// Enables scroll with configurable limit (default 50)
router.get('/widget/upcoming-orders', widgetUpcomingLimiter, async (req, res) => {
  if (!(await verifyAdminAuth(req, res))) return;

  try {
    const db = getFirestore();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
    const limitNum = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    // Do not constrain this legacy-compatible read by eventDate: older documents
    // may only contain date/dateTime, and Firestore filters omit missing fields.
    const snapshot = await db.collection('orders').get();

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
        const normalizedEventDate = getOrderEventDate(d);
        if (!normalizedEventDate || normalizedEventDate < todayStr) return null;

        return {
          id: doc.id,
          eventDate: normalizedEventDate,
          date: normalizedEventDate,
          time: d.time || null,
          meals: mealsArr,
          mealType: mealTypeStr,
          quantity: d.quantity || d.guests || d.pax || 0,
          location: locStr,
          // Admin-authenticated endpoint: provide customer/company label for widget display
          to: d.to || d.company || d.name || 'Tempahan',
          menu: d.menu || '',
          status: status,
        };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null)
      .sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')))
      .slice(0, limitNum);

    return res.json({ success: true, orders, date: todayStr, count: orders.length });
  } catch (err) {
    console.error('[Widget upcoming-orders Error]:', err);
    return res.status(500).json({ success: false, error: 'Unable to load upcoming orders.' });
  }
});

// ─── 2. Orders for the PRICING widget (admin-authenticated) ──────────────────
// Returns orders (both past and new/upcoming) that have not had their prices keyed in yet.
// Query checks status in ['pending', 'approved'] and filters out any already billed.
router.get(['/widget/today-pricing-orders', '/widget/unpriced-orders'], widgetPricingLimiter, async (req, res) => {
  if (!(await verifyAdminAuth(req, res))) return;

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

        const eventDateVal = getOrderEventDate(d) || '';
        const isBilled = d.status === 'billed';
        const hasPrices = d.prices && Object.keys(d.prices).length > 0 && Number(d.totalAmount) > 0;

        // Skip orders that are already billed or priced
        if (isBilled || hasPrices) {
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
    return res.status(500).json({ success: false, error: 'Unable to load pricing orders.' });
  }
});

function parseTimestampMs(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (value && typeof value === 'object') {
    const obj = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number };
    if (typeof obj.toMillis === 'function') {
      const ms = obj.toMillis();
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    const seconds = typeof obj.seconds === 'number' ? obj.seconds : (typeof obj._seconds === 'number' ? obj._seconds : null);
    const nanoseconds = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : (typeof obj._nanoseconds === 'number' ? obj._nanoseconds : 0);
    if (seconds !== null && Number.isFinite(seconds)) {
      const ms = seconds * 1000 + Math.floor((nanoseconds || 0) / 1_000_000);
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
  }
  return null;
}

function getOrderUpdatedAtMs(order: Record<string, any> | undefined): number | null {
  if (!order) return null;
  return (
    parseTimestampMs(order.updatedAt) ??
    parseTimestampMs(order.billedAt) ??
    parseTimestampMs(order.approvedAt)
  );
}

async function recordPricingConflictNotification(params: {
  db: FirebaseFirestore.Firestore;
  orderId: string;
  order?: Record<string, any>;
  submittedPrices: Record<string, number>;
  clientTimestampMs: number | null;
  serverUpdatedAtMs: number | null;
  reason: string;
}): Promise<string | null> {
  const { db, orderId, order, submittedPrices, clientTimestampMs, serverUpdatedAtMs, reason } = params;
  const customerName = String(order?.to || order?.company || order?.name || 'Pelanggan');
  const invoiceNo = order?.invoiceNo ? String(order.invoiceNo) : null;
  const clientTimestampIso = clientTimestampMs !== null ? new Date(clientTimestampMs).toISOString() : null;
  const serverUpdatedAtIso = serverUpdatedAtMs !== null ? new Date(serverUpdatedAtMs).toISOString() : null;
  const createdAt = new Date().toISOString();

  try {
    const ref = await db.collection('admin_notifications').add({
      type: 'pricing_conflict',
      orderId,
      invoiceNo,
      customerName,
      submittedPrices,
      clientTimestamp: clientTimestampIso,
      serverUpdatedAt: serverUpdatedAtIso,
      reason,
      dismissed: false,
      createdAt,
    });

    void sendNotificationToTopic(
      'new_orders',
      'Konflik Penyegerakan Harga Luar Talian',
      `Perubahan luar talian untuk ${customerName}${invoiceNo ? ` (${invoiceNo})` : ''} ditolak kerana rekod pelayan lebih baharu.`,
      {
        type: 'pricing_conflict',
        orderId,
        notificationId: ref.id,
      }
    ).catch((fcmErr) => {
      console.warn('[Widget] Failed to push pricing conflict alert:', fcmErr);
    });

    return ref.id;
  } catch (err) {
    console.error('[Widget] Failed to record pricing conflict notification:', err);
    return null;
  }
}

// ─── 3. Set pricing + auto-generate & email final invoice (admin-authenticated) ─
// This is the core action of the pricing widget:
//   1. Receive pricePerPax per meal type from widget input (+ optional clientTimestamp)
//   2. Compare clientTimestamp against server updatedAt to reject stale offline overwrites
//   3. Calculate totalAmount
//   4. Generate sequential invoice number
//   5. Generate full PDF (server-side, same design as app)
//   6. Email PDF to customer
//   7. Update Firestore order to status: 'billed'
router.post('/widget/set-pricing', widgetPricingLimiter, async (req, res) => {
  if (!(await verifyAdminAuth(req, res))) return;

  const { orderId, prices, clientTimestamp } = req.body as {
    orderId: string;
    prices: Record<string, number>;
    clientTimestamp?: number | string;
  };

  if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(orderId)) {
    return res.status(400).json({ success: false, error: 'Valid orderId required.' });
  }
  if (!prices || typeof prices !== 'object' || Array.isArray(prices) || Object.keys(prices).length === 0) {
    return res.status(400).json({ success: false, error: 'prices object required.' });
  }

  let clientTimestampMs: number | null = null;
  if (clientTimestamp !== undefined && clientTimestamp !== null) {
    clientTimestampMs = parseTimestampMs(clientTimestamp);
    if (clientTimestampMs === null) {
      return res.status(400).json({ success: false, error: 'clientTimestamp must be a valid epoch timestamp or ISO date string.' });
    }
  }

  // Validate all submitted values before any database or invoice side effects.
  // Match the existing shared monetary validation used by admin billing.
  for (const [meal, price] of Object.entries(prices)) {
    if (!meal.trim() || !validCharge(price) || price <= 0) {
      return res.status(400).json({ success: false, error: 'Each meal must have a valid positive MYR price in whole cents.' });
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
    if (order.deletedByAdmin) {
      return res.status(404).json({ success: false, error: 'Order is no longer available.' });
    }

    const initialServerUpdatedAtMs = getOrderUpdatedAtMs(order);
    if (clientTimestampMs !== null && initialServerUpdatedAtMs !== null && initialServerUpdatedAtMs > clientTimestampMs) {
      const reason = 'Server record updated more recently than offline pricing submission.';
      const notificationId = await recordPricingConflictNotification({
        db,
        orderId,
        order,
        submittedPrices: prices,
        clientTimestampMs,
        serverUpdatedAtMs: initialServerUpdatedAtMs,
        reason,
      });
      return res.status(409).json({
        success: false,
        conflict: true,
        code: 'PRICING_CONFLICT',
        orderId,
        clientTimestamp: new Date(clientTimestampMs).toISOString(),
        serverUpdatedAt: new Date(initialServerUpdatedAtMs).toISOString(),
        ...(notificationId ? { notificationId } : {}),
        error: 'Conflict: Order was updated more recently on the server. Offline pricing was not applied.',
      });
    }

    const currentStatus = String(order.status || 'pending').toLowerCase().trim();
    // Guard: only price pending/approved orders; don't re-bill a billed or delivered order accidentally
    if (!['pending', 'approved'].includes(currentStatus)) {
      if (clientTimestampMs !== null) {
        const notificationId = await recordPricingConflictNotification({
          db,
          orderId,
          order,
          submittedPrices: prices,
          clientTimestampMs,
          serverUpdatedAtMs: initialServerUpdatedAtMs,
          reason: `Order status transitioned to '${currentStatus}' before offline sync completed.`,
        });
        return res.status(409).json({
          success: false,
          conflict: true,
          code: 'PRICING_CONFLICT',
          orderId,
          clientTimestamp: new Date(clientTimestampMs).toISOString(),
          ...(initialServerUpdatedAtMs !== null ? { serverUpdatedAt: new Date(initialServerUpdatedAtMs).toISOString() } : {}),
          ...(notificationId ? { notificationId } : {}),
          invoiceNo: order.invoiceNo || null,
          error: `Conflict: Order is already '${currentStatus}'. Cannot apply offline pricing.`,
        });
      }
      return res.status(409).json({
        success: false,
        error: `Order is already '${currentStatus}'. Cannot re-price.`,
        invoiceNo: order.invoiceNo || null
      });
    }

    // Calculate totalAmount: sum of (price * quantity) for each meal in the order
    const quantity = Number(order.quantity || order.guests || order.pax || 0);
    const orderMeals: string[] = Array.isArray(order.meals) ? order.meals : (order.meals ? [String(order.meals)] : []);

    if (!Number.isSafeInteger(quantity) || quantity <= 0 || orderMeals.length === 0 ||
        orderMeals.some(meal => typeof meal !== 'string' || !meal.trim()) || new Set(orderMeals).size !== orderMeals.length) {
      return res.status(400).json({ success: false, error: 'Order quantity or meal information is invalid.' });
    }

    const finalPrices: Record<string, number> = {};

    let missingMealPrice = false;
    for (const meal of orderMeals) {
      const priceForMeal = prices[meal] ?? prices[meal.replace('_', '')] ?? null;
      if (priceForMeal === null || typeof priceForMeal !== 'number' || !Number.isFinite(priceForMeal) || priceForMeal <= 0) {
        missingMealPrice = true;
        continue;
      }
      finalPrices[meal] = priceForMeal;
    }

    // Preserve the existing single-default-price contract only when no individual
    // meal price matched. Never partially bill an order with some meal prices missing.
    if (missingMealPrice) {
      if (Object.keys(finalPrices).length === 0 && typeof prices.default === 'number' && Number.isFinite(prices.default) && prices.default > 0) {
        finalPrices.default = prices.default;
      } else {
        return res.status(400).json({ success: false, error: 'A valid price is required for every meal in the order.' });
      }
    }

    let totalAmount = orderFoodSubtotal(finalPrices, quantity);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Could not compute a valid total.' });
    }

    // Generate sequential individual invoice number (RWxxxxx) when not already invoiced; preserve historical RW numbers and quoteNo
    const hasExistingInvoice = Boolean(order.invoiceNo && !String(order.invoiceNo).startsWith('QT'));
    const invoiceNo = hasExistingInvoice
      ? String(order.invoiceNo)
      : await generateSequentialIndividualInvoiceNo();

    // Make the eligibility check, timestamp conflict guard, and billing transition one Firestore transaction.
    // A concurrent request will re-read the order and fail once another request updates or bills it.
    const invoiceGeneratedAt = new Date().toISOString();
    const txResult = await db.runTransaction(async (tx: any) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) {
        const error: any = new Error('ORDER_NOT_FOUND');
        error.code = 'ORDER_NOT_FOUND';
        throw error;
      }
      const freshOrder = freshSnap.data()!;
      const freshServerUpdatedAtMs = getOrderUpdatedAtMs(freshOrder);
      if (clientTimestampMs !== null && freshServerUpdatedAtMs !== null && freshServerUpdatedAtMs > clientTimestampMs) {
        const error: any = new Error('PRICING_CONFLICT');
        error.code = 'PRICING_CONFLICT';
        error.freshOrder = freshOrder;
        error.serverUpdatedAtMs = freshServerUpdatedAtMs;
        throw error;
      }
      if (freshOrder.deletedByAdmin || !['pending', 'approved'].includes(String(freshOrder.status || 'pending').toLowerCase().trim())) {
        const error: any = new Error('ORDER_NOT_ELIGIBLE');
        error.code = 'ORDER_NOT_ELIGIBLE';
        error.currentStatus = freshOrder.status || 'pending';
        error.freshOrder = freshOrder;
        error.serverUpdatedAtMs = freshServerUpdatedAtMs;
        throw error;
      }
      const freshQuantity = Number(freshOrder.quantity || freshOrder.guests || freshOrder.pax || 0);
      const freshMeals: string[] = Array.isArray(freshOrder.meals) ? freshOrder.meals : (freshOrder.meals ? [String(freshOrder.meals)] : []);
      if (freshQuantity !== quantity || JSON.stringify(freshMeals) !== JSON.stringify(orderMeals)
        || freshOrder.invoiceNo !== order.invoiceNo) {
        const error: any = new Error('ORDER_CHANGED');
        error.code = 'ORDER_CHANGED';
        error.freshOrder = freshOrder;
        error.serverUpdatedAtMs = freshServerUpdatedAtMs;
        throw error;
      }
      const recipientEmail = typeof freshOrder.email === 'string' ? freshOrder.email.trim() : '';
      const deliveryStatus = recipientEmail.includes('@') ? 'queued' : 'skipped_no_email';
      const charges = calculateOrderCharges(totalAmount, freshOrder);
      const updates = {
        status: 'billed',
        prices: finalPrices,
        deliveryCharge: charges.deliveryCharge,
        serviceChargeRate: charges.serviceChargeRate,
        serviceChargeAmount: charges.serviceChargeAmount,
        totalAmount: charges.totalAmount,
        invoiceNo,
        ...(freshOrder.invoiceNo && String(freshOrder.invoiceNo).startsWith('QT')
          ? { quoteNo: freshOrder.quoteNo || String(freshOrder.invoiceNo) }
          : {}),
        officialInvoiceNo: invoiceNo,
        billedAt: freshOrder.billedAt || invoiceGeneratedAt,
        invoiceGeneratedAt,
        invoiceDeliveryStatus: deliveryStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (deliveryStatus === 'queued') {
        await invoiceQueue.service.enqueueInTransaction(tx, {
          orderId, orderForPdf: { ...freshOrder, ...updates, id: orderId }, invoiceNo,
          recipientEmail, totalAmount: charges.totalAmount, companyName: freshOrder.to || freshOrder.company || 'Pelanggan',
          lang: freshOrder.lang === 'en' ? 'en' : 'bm',
        });
      }
      tx.update(orderRef, updates);
      return { deliveryStatus, mergedOrder: { ...freshOrder, ...updates, id: orderId } };
    });

    const { deliveryStatus, mergedOrder } = txResult;
    totalAmount = mergedOrder.totalAmount;
    publicCalendar.invalidate();
    void syncGoogleCalendarEvent(orderId, mergedOrder as any).catch((calErr) => {
      console.error('[Widget] Calendar sync failed for %s:', orderId, calErr);
    });

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
      status: deliveryStatus,
      message: deliveryStatus === 'queued'
        ? `Invois ${invoiceNo} disahkan. Penghantaran invois sedang diproses di latar belakang.`
        : `Invois ${invoiceNo} disahkan. Tiada alamat e-mel untuk penghantaran.`
    });

  } catch (err) {
    const code = (err as any)?.code;
    if (code === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    if (code === 'PRICING_CONFLICT' || code === 'ORDER_NOT_ELIGIBLE' || code === 'ORDER_CHANGED') {
      if (clientTimestampMs !== null) {
        const db = getFirestore();
        const serverUpdatedAtMs = (err as any)?.serverUpdatedAtMs ?? null;
        const notificationId = await recordPricingConflictNotification({
          db,
          orderId,
          order: (err as any)?.freshOrder,
          submittedPrices: prices,
          clientTimestampMs,
          serverUpdatedAtMs,
          reason: code === 'PRICING_CONFLICT'
            ? 'Server record updated more recently than offline pricing submission.'
            : `Concurrent modification (${code}) detected during offline pricing sync.`,
        });
        return res.status(409).json({
          success: false,
          conflict: true,
          code: 'PRICING_CONFLICT',
          orderId,
          clientTimestamp: new Date(clientTimestampMs).toISOString(),
          ...(serverUpdatedAtMs !== null ? { serverUpdatedAt: new Date(serverUpdatedAtMs).toISOString() } : {}),
          ...(notificationId ? { notificationId } : {}),
          error: 'Conflict: Order was updated more recently on the server. Offline pricing was not applied.',
        });
      }
      return res.status(409).json({ success: false, error: 'Order changed or is not eligible for pricing. Refresh the widget and try again.' });
    }
    telemetry.captureException(err, { req, metadata: { orderId } });
    return res.status(500).json({ success: false, error: 'Unable to save pricing and queue the invoice.' });
  }
});

// ─── 4. Admin conflict notifications (offline pricing sync conflicts) ────────
router.get('/admin/conflicts', async (req, res) => {
  if (!(await verifyAdminAuth(req, res))) return;
  try {
    const db = getFirestore();
    const snapshot = await db.collection('admin_notifications')
      .where('dismissed', '==', false)
      .get();

    const conflicts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => item.type === 'pricing_conflict')
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return res.json({ success: true, conflicts });
  } catch (err) {
    console.error('[Widget] Error loading admin conflict notifications:', err);
    return res.status(500).json({ success: false, error: 'Unable to load conflict notifications.' });
  }
});

router.post('/admin/conflicts/:id/dismiss', async (req, res) => {
  if (!(await verifyAdminAuth(req, res))) return;
  const notifId = req.params.id;
  if (!notifId || !/^[A-Za-z0-9_-]{1,128}$/.test(notifId)) {
    return res.status(400).json({ success: false, error: 'Invalid conflict notification id.' });
  }
  try {
    const db = getFirestore();
    const ref = db.collection('admin_notifications').doc(notifId);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Conflict notification not found.' });
    }
    await ref.update({
      dismissed: true,
      dismissedAt: new Date().toISOString(),
    });
    return res.json({ success: true, id: notifId });
  } catch (err) {
    console.error('[Widget] Error dismissing conflict notification:', err);
    return res.status(500).json({ success: false, error: 'Unable to dismiss conflict notification.' });
  }
});

export default router;
