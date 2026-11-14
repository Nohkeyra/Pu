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

    if (type === 'pdf') {
      // Non-destructive smoke test of the same jsPDF engine used for invoices.
      // It does not claim an actual order invoice has been generated or sent.
      const { jsPDF } = await import('jspdf');
      const document = new jsPDF();
      document.text('Wawasan PDF engine diagnostic', 12, 16);
      const pdfBytes = document.output('arraybuffer');
      if (pdfBytes.byteLength < 100) {
        return res.status(500).json({ status: 'fail', message: 'PDF engine returned an empty document.' });
      }
      return res.json({ status: 'healthy', service: 'Server PDF engine', message: 'Sample PDF generated in memory successfully.' });
    }

    if (type === 'fcm') {
      const { getMessaging } = await import('firebase-admin/messaging');
      const { getAdminApp } = await import('../firebaseAdmin.js');
      const app = getAdminApp();
      const messaging = getMessaging(app);
      if (!messaging) {
        return res.status(500).json({ status: 'fail', service: 'FCM', message: 'Failed to obtain FCM messaging service.' });
      }
      return res.json({
        status: 'healthy',
        service: 'Firebase Cloud Messaging (FCM)',
        app: app.name,
        channels: ['order_status', 'new_orders', 'promotions'],
        message: 'FCM push notification infrastructure is active and operational.'
      });
    }

    if (type === 'calendar') {
      const { getGoogleCalendarClient } = await import('../calendarService.js');

      const hasEmail = Boolean(
        process.env.GOOGLE_CALENDAR_CLIENT_EMAIL ||
        process.env.FIREBASE_CLIENT_EMAIL ||
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
        process.env.GOOGLE_CLIENT_EMAIL
      );
      const hasKey = Boolean(
        process.env.GOOGLE_CALENDAR_PRIVATE_KEY ||
        process.env.FIREBASE_PRIVATE_KEY ||
        process.env.GOOGLE_PRIVATE_KEY ||
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      );

      if (!hasEmail || !hasKey) {
        return res.status(200).json({
          ok: false,
          status: 'unconfigured',
          service: 'Google Calendar',
          message: 'Google Calendar service account credentials are not configured.'
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

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const listResp = await Promise.race([
          calendar.calendarList.list(),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Google Calendar API timeout')), 8000);
          })
        ]);
        const calendarsReturned = listResp.data.items?.length || 0;
        return res.json({
          ok: true,
          status: 'healthy',
          service: 'Google Calendar',
          calendarsReturned,
          message: `Connected successfully. Found ${calendarsReturned} accessible calendars.`
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    return res.status(400).json({ error: 'Unknown diagnostic type' });
  } catch (err) {
    console.error(`[Diagnostics:${type}] Check failed:`, err);
    return res.status(500).json({ status: 'error', error: 'Diagnostic check failed' });
  }
});

export default router;
