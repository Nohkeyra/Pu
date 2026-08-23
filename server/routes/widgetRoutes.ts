import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';

const router = Router();

// Upcoming orders widget (public) — PII stripped for security
router.get('/upcoming-orders', async (_req, res) => {
  try {
    const db = getFirestore();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const snapshot = await db.collection('orders')
      .where('eventDate', '>=', startOfDay.toISOString().split('T')[0])
      .where('eventDate', '<=', endOfDay.toISOString().split('T')[0])
      .where('status', 'in', ['pending', 'approved'])
      .orderBy('eventDate', 'asc')
      .limit(10)
      .get();

    // SECURITY FIX: Strip all PII from public widget response
    const orders = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        eventDate: d.eventDate || null,
        meals: d.meals || [],
        guests: d.guests || d.quantity || 0,
        status: d.status || 'pending',
        // INTENTIONALLY EXCLUDED: name, email, contact, phone, location, address, 
        // menu, dishes, veggies, customMenu, notes, to, attn, customerName
      };
    });

    return res.json({
      success: true,
      orders,
      date: startOfDay.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('[Widget Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Daily summary widget (public) — no PII, just aggregate counts
router.get('/daily-summary', async (_req, res) => {
  try {
    const db = getFirestore();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const snapshot = await db.collection('orders')
      .where('eventDate', '==', dateStr)
      .where('status', 'in', ['pending', 'approved'])
      .get();

    let totalOrders = 0;
    let totalGuests = 0;
    const sessionCounts: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const d = doc.data();
      totalOrders++;
      totalGuests += Number(d.guests || d.quantity || 0);

      if (Array.isArray(d.meals)) {
        d.meals.forEach((meal: string) => {
          sessionCounts[meal] = (sessionCounts[meal] || 0) + 1;
        });
      }
    });

    return res.json({
      success: true,
      date: dateStr,
      totalOrders,
      totalGuests,
      sessionCounts
    });
  } catch (err) {
    console.error('[Widget Daily Summary Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
