import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import { getAdminApp, getFirestore, type OrderData, generateSequentialInvoiceNo } from './server/firebaseAdmin.js';
import { verifyAdminToken, effectiveJwtSecret, adminLoginLimiter, revokeJti } from './server/adminAuth.js';
import { notifyCustomerOfStatusChange, createBrevoTransporter } from './server/emailService.js';
import { syncGoogleCalendarEvent } from './server/calendarService.js';
import { generateOrdersWorkbook } from './server/exportService.js';
import { platformOptimizerMiddleware, detectServerPlatform } from './server/platformDetector.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

dotenv.config();

// S-01: Allowed CORS origins — production URLs + localhost for dev.
// cors() with no options defaults to wildcard (*), which allows any website
// to make credentialed cross-origin requests to this server. Restricting
// to known origins closes that surface for browser-based callers.
const ALLOWED_ORIGINS = [
  'https://restoran-wawasan-bio.onrender.com',
  'https://restoran-wawasan.pxxl.click',
  // Local dev (Vite + Termux)
  'http://localhost:3000',
  'http://localhost:5173',
  // Capacitor WebView origin — native Android sends this
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];

// Google AI Studio sandbox origins follow the pattern:
// https://ais-dev-<hash>.asia-southeast1.run.app
// These are preview/testing environments only — not production.
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // AI Studio and Google domains
  if (origin.includes('run.app') || origin.includes('ai.studio') || origin.includes('google.com')) return true;
  // Pattern matching for sandbox origins
  if (/^https:\/\/ais-(dev|pre)-[a-z0-9-]+\.asia-southeast1\.run\.app$/.test(origin)) return true;
  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Render (and most cloud platforms) sit behind a reverse proxy that sets
  // X-Forwarded-For. Without trust proxy=1, express-rate-limit throws
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and cannot identify client IPs.
  app.set('trust proxy', 1);

  app.use(platformOptimizerMiddleware);

  // S-02: helmet adds secure HTTP headers (X-Content-Type-Options,
  // X-Frame-Options, Referrer-Policy, etc.) with one call.
  // crossOriginResourcePolicy is set to 'cross-origin' so the Android
  // WebView (which loads from capacitor://localhost) can fetch assets
  // served from this Express origin without being blocked by CORP.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // CSP is left to default (off) — enabling it requires careful
      // tuning of script-src/style-src for the React SPA and Vite HMR.
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, widget APK)
        if (!origin) return callback(null, true);
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
    })
  );

  app.use(compression() as any);
  app.use(express.json({ limit: '50mb' }));

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      platform: (req as any).detectedPlatform || detectServerPlatform(req),
      timestamp: new Date().toISOString()
    });
  });

  // Admin Login
  app.post('/api/admin/login', adminLoginLimiter, async (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
      const jti = crypto.randomUUID();
      const token = jwt.sign({ role: 'admin', admin: true, jti }, effectiveJwtSecret, { expiresIn: '12h' });
      
      let firebaseCustomToken;
      try {
        const adminApp = getAdminApp();
        firebaseCustomToken = await getAuth(adminApp).createCustomToken('admin', { admin: true });
      } catch (err) {
        console.warn('[Admin Auth] Firebase custom token error', err);
      }

      res.json({ success: true, token, firebaseCustomToken });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  });

  // Admin Logout
  app.post('/api/admin/logout', verifyAdminToken, async (req, res) => {
    try {
      const adminReq = req as any;
      if (adminReq.adminPayload && adminReq.adminPayload.jti) {
        await revokeJti(adminReq.adminPayload.jti, adminReq.adminPayload.exp);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('[Admin Auth] Logout error:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Branding
  app.post('/api/admin/branding', verifyAdminToken, async (req, res) => {
    try {
      const { accent } = req.body;
      const db = getFirestore();
      await db.collection('settings').doc('branding').set({ accent }, { merge: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Next Invoice Number
  app.get('/api/admin/next-invoice-number', async (req, res) => {
    try {
      const db = getFirestore();
      const counterSnap = await db.collection('meta').doc('invoiceCounter').get();
      let next = 1;
      if (counterSnap.exists) {
        const data = counterSnap.data();
        if (data && typeof data.count === 'number') {
          next = data.count + 1;
        }
      }
      res.json({ nextInvoiceNo: `RW-${String(next).padStart(4, '0')}`, next: `RW-${String(next).padStart(4, '0')}` });
    } catch {
      res.status(500).json({ error: 'Failed to fetch counter' });
    }
  });

  // Orders API (Admin)
  app.post('/api/admin/orders', verifyAdminToken, async (req, res) => {
    const { action, orderId, data } = req.body;
    const db = getFirestore();

    try {
      if (action === 'fetch') {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json({ orders });
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

        // Auto-sync calendar event for the order update / status transition
        const updatedOrderForCalendar = { ...oldData, ...updates, id: orderId };
        syncGoogleCalendarEvent(orderId, updatedOrderForCalendar).catch(err => {
          console.error('[Calendar] Auto-sync on order update failed:', err);
        });

        return res.json({ success: true, invoiceNo: updates.invoiceNo });
      }

      if (action === 'delete' && orderId) {
        await db.collection('orders').doc(orderId).delete();
        return res.json({ success: true });
      }

      res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
      console.error('[Admin API] Order action failed:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Admin Quick Status Change Endpoint
  app.patch('/api/admin/orders/:orderId/status', verifyAdminToken, async (req, res) => {
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
      syncGoogleCalendarEvent(orderId, mergedOrderData).catch(err => {
        console.error('[Calendar] Failed to auto-sync calendar event on PATCH status:', err);
      });

      return res.json({ success: true, invoiceNo: updates.invoiceNo });
    } catch (err) {
      console.error('[Admin API] PATCH order status failed:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Public Order Submission
  // S-03: No input validation here — body spreads directly into Firestore.
  // Risk is LOW for this B2B context: Firestore rules restrict what clients
  // can read back; the admin panel is the only consumer of order data;
  // and all write paths go through Admin SDK server-side so rules don't
  // apply. Adding strict validation is the right long-term move but is
  // out of scope for this pass (avoid scope creep per project rules).
  app.post('/api/orders', async (req, res) => {
    try {
      const orderData = req.body;
      const db = getFirestore();
      const docRef = await db.collection('orders').add({
        ...orderData,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
      });

      // Auto-sync initial 'pending' status to Google Calendar
      const initialOrderData: OrderData = {
        ...orderData,
        id: docRef.id,
        status: 'pending'
      };
      syncGoogleCalendarEvent(docRef.id, initialOrderData).catch(err => {
        console.error('[Calendar] Auto-sync initial pending status failed:', err);
      });

      res.json({ id: docRef.id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Customer Cancellation Request Endpoint
  app.post('/api/orders/cancel', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const db = getFirestore();

    try {
      const orderRef = db.collection('orders').doc(orderId);
      const oldSnap = await orderRef.get();
      if (!oldSnap.exists) return res.status(404).json({ error: 'Order not found' });

      const oldData = oldSnap.data() as OrderData;
      const updates: Partial<OrderData> = {
        status: 'cancel_requested',
        cancelRequestedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await orderRef.update(updates);

      const mergedOrderData = { ...oldData, ...updates, id: orderId, status: 'cancel_requested' };

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

      res.json({ success: true });
    } catch (err) {
      console.error('[Orders API] Cancel request failed:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Customer "Poke" Endpoint (Nudge Admin)
  app.post('/api/orders/poke', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const db = getFirestore();

    try {
      const orderRef = db.collection('orders').doc(orderId);
      const snap = await orderRef.get();
      if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

      await orderRef.update({
        lastPokedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`[Orders API] Order ${orderId} was poked by user.`);
      // In a real scenario, you might trigger a specific Push Notification to the admin here
      
      res.json({ success: true, message: 'Admin has been nudged!' });
    } catch (err) {
      console.error('[Orders API] Poke failed:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Send Invoice Email
  app.post('/api/send-invoice', verifyAdminToken, async (req, res) => {
    const { orderId, email, subject, body, pdfBase64 } = req.body;
    
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS missing)');
      }

      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;

      const attachments = pdfBase64 ? [
        {
          filename: `Invoice_${orderId || 'RW'}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }
      ] : [];

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${senderEmail}>`,
        to: email,
        subject: subject || 'Your Invoice from Restoran Wawasan',
        text: body || 'Please find your invoice attached.',
        attachments
      });

      res.json({ success: true });
    } catch (err) {
      console.error('[Email API] Failed to send invoice email:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Subscribe to FCM topic for push notifications
  app.post('/api/admin/subscribe-to-topic', verifyAdminToken, async (req, res) => {
    const { token, topic } = req.body;
    if (!token || !topic) {
      return res.status(400).json({ error: 'token and topic are required' });
    }

    try {
      const { getAdminApp } = await import('./server/firebaseAdmin.js');
      const { getMessaging } = await import('firebase-admin/messaging');
      
      const adminApp = getAdminApp();
      await getMessaging(adminApp).subscribeToTopic(token, topic);
      
      console.log(`[Messaging] Successfully subscribed token to topic: ${topic}`);
      res.json({ success: true, message: `Subscribed to ${topic}` });
    } catch (err) {
      console.error('[Messaging API] Subscribe to topic failed:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Export
  app.get('/api/admin/export/orders', verifyAdminToken, async (req, res) => {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OrderData[];
      
      const workbook = await generateOrdersWorkbook(orders);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Orders_Export.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch {
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Diagnostics
  app.get('/api/diagnostics/:type', verifyAdminToken, async (req, res) => {
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
        const { getGoogleCalendarClient } = await import('./server/calendarService.js');
        
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

        // calendarList.list() is a lightweight read-only check
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
      res.status(400).json({ error: 'Unknown diagnostic type' });
    } catch (err) {
      res.status(500).json({ status: "error", error: String(err) });
    }
  });

  // Widget — Upcoming Orders (public endpoint, no auth needed)
  app.get('/api/widget/upcoming-orders', async (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '10')), 20);
      const db = getFirestore();
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Fetch approved + pending orders within the next 7 days
      const snapshot = await db.collection('orders')
        .where('status', 'in', ['approved', 'pending'])
        .orderBy('date', 'asc')
        .limit(limit)
        .get();

      const orders = snapshot.docs
        .map(doc => {
          const d = doc.data();
          // Filter: only orders with date <= 7 days from now
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
            to: d.to || d.customerName || 'N/A',      // nama syarikat/klien
            invoiceNo: d.invoiceNo || null,
          };
        })
        .filter(Boolean);

      res.json({ success: true, orders });
    } catch (err) {
      console.error('[Widget API] Failed to fetch upcoming orders:', err);
      res.status(500).json({ success: false, orders: [], error: String(err) });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
