import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';

const router = Router();

// Widget — Upcoming Orders (public endpoint, no auth needed)
router.get('/upcoming-orders', async (req, res) => {
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
