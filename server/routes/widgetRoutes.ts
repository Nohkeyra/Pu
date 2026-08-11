import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { getFirestore } from '../firebaseAdmin.js';

const router = Router();

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// F-CRIT (audit 2026-08-12): this endpoint returns every upcoming order's
// customer name, delivery location, menu, and quantity. It was previously
// fully public ("no auth needed") so anyone who discovered the URL could
// enumerate the restaurant's entire upcoming order book. The Android
// home-screen widget is the only intended caller, and it isn't logged in
// as a user, so instead of the admin JWT this uses a static shared secret
// baked into the APK at build time (WIDGET_API_KEY, mirroring how
// VITE_API_URL_ANDROID is injected at build time) and sent as a header.
// This isn't as strong as per-user auth — a determined attacker can
// extract the key from the APK — but it closes the "fully open to
// anyone on the internet" gap. Fails closed if the key isn't configured.
router.get('/upcoming-orders', async (req, res) => {
  const configuredKey = process.env.WIDGET_API_KEY;
  if (!configuredKey) {
    console.error('[Widget API] WIDGET_API_KEY is not set. Refusing all widget requests.');
    return res.status(500).json({ success: false, orders: [], error: 'Widget API is not configured on this server.' });
  }
  const providedKey = req.header('x-widget-key');
  if (typeof providedKey !== 'string' || !safeEquals(providedKey, configuredKey)) {
    return res.status(401).json({ success: false, orders: [], error: 'Unauthorized' });
  }

  try {
    const limit = Math.min(parseInt(String(req.query.limit || '10')), 20);
    const db = getFirestore();
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('orders')
      .where('status', 'in', ['approved', 'pending'])
      .orderBy('date', 'asc')
      .limit(limit)
      .get();

    const orders = snapshot.docs
      .map(doc => {
        const d = doc.data();
        const orderDate = d.date ? new Date(d.date) : null;
        if (!orderDate || orderDate > sevenDaysLater) return null;

        return {
          id: doc.id,
          status: d.status || 'pending',
          date: d.date || null,
          time: d.time || null,
          quantity: d.quantity || d.pax || 0,
          meals: Array.isArray(d.meals) ? d.meals.join(', ') : (d.meals || 'N/A'),
          location: d.location || 'N/A',
          menu: d.menu || 'N/A',
          to: d.to || d.customerName || 'N/A',
          invoiceNo: d.invoiceNo || null,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('[Widget API] Failed to fetch upcoming orders:', err);
    return res.status(500).json({ success: false, orders: [], error: String(err) });
  }
});

export default router;
