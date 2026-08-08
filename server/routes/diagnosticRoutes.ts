import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { createBrevoTransporter } from '../emailService.js';

const router = Router();

router.get('/diagnostics/:type', verifyAdminToken, async (req, res) => {
  const { type } = req.params;
  try {
    if (type === 'firebase') {
      const db = getFirestore();
      await db.collection('meta').doc('health').set({ lastCheck: FieldValue.serverTimestamp() });
      return res.json({ status: 'healthy', service: 'Firestore' });
    }

    if (type === 'email') {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.json({ status: 'unconfigured', service: 'SMTP' });
      }
      const transporter = createBrevoTransporter();
      await transporter.verify();
      return res.json({ status: 'healthy', service: 'SMTP' });
    }

    if (type === 'calendar') {
      const { getGoogleCalendarClient } = await import('../calendarService.js');
      
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
      
      if (!email || !key) {
        return res.status(200).json({ 
          ok: false,
          status: 'unconfigured', 
          service: 'Google Calendar', 
          message: 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in environment variables.' 
        });
      }

      const calendar = getGoogleCalendarClient();
      if (!calendar) {
        return res.status(200).json({ 
          ok: false,
          status: 'fail', 
          service: 'Google Calendar', 
          message: 'Failed to initialize Calendar client. Check private key format.' 
        });
      }

      const listResp = await calendar.calendarList.list();
      const calendarsReturned = listResp.data.items?.length || 0;
      return res.json({ 
        ok: true,
        status: 'healthy', 
        service: 'Google Calendar', 
        calendarsReturned,
        message: `Connected successfully. Found ${calendarsReturned} accessible calendars.`
      });
    }

    return res.status(400).json({ error: 'Unknown diagnostic type' });
  } catch (err) {
    return res.status(500).json({ status: "error", error: String(err) });
  }
});

export default router;
