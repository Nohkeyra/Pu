import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';

const router = Router();

function getMalaysiaTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
}

// Upcoming orders widget (public) — today's orders only, PII stripped for security
router.get('/widget/upcoming-orders', async (_req, res) => {
  try {
    const db = getFirestore();
    const todayStr = getMalaysiaTodayString();

    const snapshot = await db.collection('orders')
      .where('eventDate', '==', todayStr)
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
      date: todayStr,
    });
  } catch (err) {
    console.error('[Widget Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Daily summary widget (public) — no PII, just aggregate counts for today
router.get('/widget/daily-summary', async (_req, res) => {
  try {
    const db = getFirestore();
    const todayStr = getMalaysiaTodayString();

    const snapshot = await db.collection('orders')
      .where('eventDate', '==', todayStr)
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
      date: todayStr,
      totalOrders,
      totalGuests,
      sessionCounts,
    });
  } catch (err) {
    console.error('[Widget Daily Summary Error]:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
