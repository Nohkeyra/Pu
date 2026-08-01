import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';
import { getAdminApp, getFirestore, type OrderData, generateSequentialInvoiceNo } from './server/firebaseAdmin.js';
import { verifyAdminToken, effectiveJwtSecret } from './server/adminAuth.js';
import { notifyCustomerOfStatusChange } from './server/emailService.js';
import { generateOrdersWorkbook } from './server/exportService.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(compression() as any);
  app.use(express.json({ limit: '50mb' }));

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Admin Login
  app.post('/api/admin/login', async (req, res) => {
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
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
          await notifyCustomerOfStatusChange(
            transporter,
            { ...oldData, ...updates, id: orderId },
            data.status,
            process.env.SMTP_USER || '',
            process.env.SMTP_USER,
            process.env.SMTP_PASS
          ).catch(err => console.error('[Email] Failed to notify status change:', err));
        }

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

  // Public Order Submission
  app.post('/api/orders', async (req, res) => {
    try {
      const orderData = req.body;
      const db = getFirestore();
      const docRef = await db.collection('orders').add({
        ...orderData,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
      });
      res.json({ id: docRef.id });
    } catch (err) {
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

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const attachments = pdfBase64 ? [
        {
          filename: `Invoice_${orderId || 'RW'}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }
      ] : [];

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${process.env.SMTP_USER}>`,
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
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.verify();
        return res.json({ status: 'healthy', service: 'SMTP' });
      }
      res.status(400).json({ error: 'Unknown diagnostic type' });
    } catch (err) {
      res.status(500).json({ status: "error", error: String(err) });
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
