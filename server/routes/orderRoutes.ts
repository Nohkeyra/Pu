import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, type OrderData, generateSequentialInvoiceNo, verifyCustomerIdToken } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { notifyCustomerOfStatusChange, createBrevoTransporter } from '../emailService.js';
import { syncGoogleCalendarEvent } from '../calendarService.js';
import { generateOrdersWorkbook } from '../exportService.js';

const router = Router();

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{5,50}$/;

// Public Order Submission
router.post('/', async (req, res) => {
  try {
    const { idempotencyKey, ...orderData } = req.body || {};
    const db = getFirestore();

    let orderId: string;
    let isDuplicate = false;

    if (typeof idempotencyKey === 'string' && IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
      const docRef = db.collection('orders').doc(idempotencyKey);
      try {
        await docRef.create({
          ...orderData,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp()
        });
        orderId = docRef.id;
      } catch (createErr: any) {
        const alreadyExists = createErr?.code === 6 || /ALREADY_EXISTS/i.test(String(createErr?.message || ''));
        if (!alreadyExists) throw createErr;
        orderId = docRef.id;
        isDuplicate = true;
      }
    } else {
      const docRef = await db.collection('orders').add({
        ...orderData,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
      });
      orderId = docRef.id;
    }

    const initialOrderData: OrderData = {
      ...orderData,
      id: orderId,
      status: 'pending'
    };

    if (!isDuplicate) {
      syncGoogleCalendarEvent(orderId, initialOrderData).catch(err => {
        console.error('[Calendar] Auto-sync initial pending status failed:', err);
      });
    }

    return res.json({ id: orderId, duplicate: isDuplicate });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Admin Fetch/Update/Delete Orders
router.post('/admin/orders', verifyAdminToken, async (req, res) => {
  const { action, orderId, data } = req.body;
  const db = getFirestore();

  try {
    if (action === 'fetch') {
      const pageSize = req.body.pageSize || 50;
      let query: FirebaseFirestore.Query = db.collection('orders').orderBy('createdAt', 'desc').limit(pageSize);

      if (req.body.lastId) {
        const lastDocSnap = await db.collection('orders').doc(req.body.lastId).get();
        if (lastDocSnap.exists) {
          query = query.startAfter(lastDocSnap);
        }
      }

      const snapshot = await query.get();
      const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      return res.json({ success: true, orders, hasMore: orders.length === pageSize });
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

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Admin Quick Status Change
router.patch('/admin/orders/:orderId/status', verifyAdminToken, async (req, res) => {
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
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Cancel Request
router.post('/cancel', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const oldSnap = await orderRef.get();
    if (!oldSnap.exists) return res.status(404).json({ error: 'Order not found' });

    const oldData = oldSnap.data() as OrderData;
    const ownerUid = oldData.userId || oldData.uid || null;
    if (ownerUid) {
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid || callerUid !== ownerUid) {
        return res.status(403).json({ error: 'Not authorized to cancel this order' });
      }
    }

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

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Order Delete
router.post('/delete', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

    const orderData = snap.data() as OrderData;
    const ownerUid = orderData.userId || orderData.uid || null;

    const callerUid = await verifyCustomerIdToken(req);
    if (!ownerUid || !callerUid || callerUid !== ownerUid) {
      return res.status(403).json({ error: 'Not authorized to delete this order' });
    }

    await orderRef.delete();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customer Poke Admin
router.post('/poke', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });
  const db = getFirestore();

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' });

    const ownerData = snap.data() as OrderData;
    const ownerUid = ownerData.userId || ownerData.uid || null;
    if (ownerUid) {
      const callerUid = await verifyCustomerIdToken(req);
      if (!callerUid || callerUid !== ownerUid) {
        return res.status(403).json({ error: 'Not authorized to poke this order' });
      }
    }

    await orderRef.update({
      lastPokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return res.json({ success: true, message: 'Admin has been nudged!' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Send Preliminary Invoice
const preliminaryInvoiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

router.post('/:id/send-preliminary-invoice', preliminaryInvoiceLimiter, async (req, res) => {
  const { id } = req.params;
  const { email, name, pdfBase64, lang } = req.body;

  if (!id || !email || !pdfBase64) {
    return res.status(400).json({ error: 'id, email and pdfBase64 are required' });
  }

  try {
    const db = getFirestore();
    const orderSnap = await db.collection('orders').doc(id).get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderSnap.data() as OrderData;
    if (!orderData.email || orderData.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match order record' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS missing)');
    }

    const transporter = createBrevoTransporter();
    const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;
    const isBm = lang === 'bm';

    await transporter.sendMail({
      from: `"Restoran Wawasan" <${senderEmail}>`,
      to: orderData.email,
      subject: isBm
        ? `Tempahan Anda Diterima - Rujukan #${id}`
        : `Your Booking Was Received - Ref #${id}`,
      text: isBm
        ? `Salam ${name || ''}, terima kasih atas tempahan anda. Sila lihat draf invois yang dilampirkan.`
        : `Hi ${name || ''}, thank you for your booking. Please see the attached preliminary invoice.`,
      attachments: [
        {
          filename: `Preliminary_Invoice_${id}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }
      ]
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Admin Export Orders Excel
router.get('/admin/export/orders', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as OrderData[];
    
    const workbook = await generateOrdersWorkbook(orders);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Orders_Export.xlsx');
    
    await workbook.xlsx.write(res);
    return res.end();
  } catch {
    return res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
