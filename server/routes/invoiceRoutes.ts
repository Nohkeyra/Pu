import { Router, type Request, type Response } from 'express';
import { verifyAdminToken } from '../adminAuth.js';
import { createBrevoTransporter } from '../emailService.js';
import { whatsappBusinessService } from '../services/whatsappBusinessService.js';
import { getFirestore } from '../firebaseAdmin.js';
import { generateServerInvoicePdf, generateServerConsolidatedInvoicePdf } from '../services/serverPdfService.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiter for order forwarding
const forwardOrderLimiter = createDistributedRateLimiter({
  prefix: 'forward_order',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

// WhatsApp API Endpoint for Admin Invoice Sharing
router.post('/send-invoice-whatsapp', verifyAdminToken, async (req, res) => {
  const { recipientPhone, customerName, invoiceNo, eventDate, pax, totalAmount, pdfDownloadUrl, lang } = req.body || {};

  if (!recipientPhone || !customerName || !invoiceNo) {
    return res.status(400).json({
      success: false,
      error: 'recipientPhone, customerName, and invoiceNo are required fields.'
    });
  }

  try {
    const result = await whatsappBusinessService.shareInvoiceToCustomer({
      recipientPhone,
      customerName,
      invoiceNo,
      eventDate: eventDate || 'Akan Dimaklumkan',
      pax: pax || '-',
      totalAmount: Number(totalAmount) || 0,
      pdfDownloadUrl,
      lang: lang === 'en' ? 'en' : 'bm'
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: String(err?.message || err) });
  }
});

// WhatsApp API Endpoint for Order Forwarding
router.post('/forward-order-whatsapp', forwardOrderLimiter, async (req, res) => {
  const orderPayload = req.body || {};

  if (!orderPayload.customerName || !orderPayload.contactNumber) {
    return res.status(400).json({
      success: false,
      error: 'customerName and contactNumber are required to forward order.'
    });
  }

  try {
    const result = await whatsappBusinessService.forwardOrderToAdmin({
      orderId: orderPayload.orderId || orderPayload.id,
      customerName: orderPayload.customerName || orderPayload.name,
      contactNumber: orderPayload.contactNumber || orderPayload.contact || orderPayload.phone,
      eventDate: orderPayload.eventDate || orderPayload.date || 'Akan Dimaklumkan',
      eventTime: orderPayload.eventTime || orderPayload.time || '12:00 PM',
      pax: orderPayload.pax || orderPayload.guests || orderPayload.quantity || '-',
      mealType: orderPayload.mealType || orderPayload.meal || 'Katering',
      totalAmount: Number(orderPayload.totalAmount) || 0,
      selectedDishes: orderPayload.selectedDishes || orderPayload.dishes || [],
      deliveryAddress: orderPayload.deliveryAddress || orderPayload.address,
      specialNotes: orderPayload.specialNotes || orderPayload.notes
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: String(err?.message || err) });
  }
});

router.post('/send-invoice', verifyAdminToken, async (req: Request, res: Response) => {
  const { orderId, email, subject, body } = req.body || {};

  try {
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid or missing email recipient address.' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS missing)');
    }

    let pdfBuffer: Buffer | null = null;
    if (orderId) {
      const db = getFirestore();
      const orderSnap = await db.collection('orders').doc(orderId).get();
      if (orderSnap.exists) {
        const { generateServerInvoicePdf } = await import('../services/serverPdfService.js');
        const orderForPdf: any = { ...orderSnap.data(), id: orderSnap.id };
        pdfBuffer = await generateServerInvoicePdf(orderForPdf, true);
      }
    }

    const transporter = createBrevoTransporter();
    const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;

    const attachments = pdfBuffer ? [
      {
        filename: `Invoice_${orderId || 'RW'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ] : [];

    await transporter.sendMail({
      from: `"Restoran Wawasan" <${senderEmail}>`,
      to: email.trim(),
      subject: subject || 'Your Invoice from Restoran Wawasan',
      text: body || 'Please find your invoice attached.',
      attachments
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET Endpoint for Server-Generated Single Invoice PDF
router.get('/invoice/:orderId/pdf', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'orderId parameter is required' });
    }

    const db = getFirestore();
    const docSnap = await db.collection('orders').doc(orderId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order document not found' });
    }

    const orderData = { id: docSnap.id, ...docSnap.data() } as Record<string, any>;
    if (req.query.lang && (req.query.lang === 'en' || req.query.lang === 'bm')) {
      orderData.lang = req.query.lang;
    }
    const isFinal = req.query.final === 'true' || (orderData.status !== 'pending' && orderData.status !== 'rejected' && orderData.status !== 'cancelled');
    const pdfBuffer = await generateServerInvoicePdf(orderData, isFinal);

    const invoiceNo = orderData.invoiceNo || `RW_${orderId.substring(0, 5).toUpperCase()}`;
    const filename = `${isFinal ? 'Invoice' : 'Quotation'}_${invoiceNo}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[Invoice API] Failed to render server invoice PDF:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// POST Endpoint for Server-Generated Consolidated Invoice PDF (Admin Only)
router.post('/admin/consolidated-invoice/pdf', verifyAdminToken, async (req: Request, res: Response) => {
  try {
    const { orderIds, invoiceNo, includeNotes, lang } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of orderIds is required' });
    }

    const db = getFirestore();
    const orderDocs: Record<string, any>[] = [];

    for (const id of orderIds) {
      if (typeof id === 'string' && id.trim()) {
        const snap = await db.collection('orders').doc(id.trim()).get();
        if (snap.exists) {
          orderDocs.push({ id: snap.id, ...snap.data() });
        }
      }
    }

    if (orderDocs.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching order documents found for provided orderIds' });
    }

    const pdfBuffer = await generateServerConsolidatedInvoicePdf(
      orderDocs,
      invoiceNo,
      Boolean(includeNotes),
      lang === 'en' ? 'en' : 'bm'
    );

    const filename = `Invois_Konsolidasi_${invoiceNo || 'COMBINED'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[Invoice API] Failed to render consolidated PDF:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});


router.post('/invoice/combined/pdf', async (req, res) => {
  try {
    const { orderIds, includeNotes, lang } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of orderIds is required' });
    }

    const db = getFirestore();
    const orderDocs = [];
    const customInvoiceNo = 'RW COMBINED';

    for (const id of orderIds) {
      if (typeof id === 'string' && id.trim()) {
        const snap = await db.collection('orders').doc(id.trim()).get();
        if (snap.exists) {
          orderDocs.push({ id: snap.id, ...snap.data() });
        }
      }
    }

    if (orderDocs.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching order documents found' });
    }

    const { generateServerConsolidatedInvoicePdf } = await import('../services/serverPdfService.js');
    
    const pdfBuffer = await generateServerConsolidatedInvoicePdf(
      orderDocs,
      customInvoiceNo,
      Boolean(includeNotes),
      lang === 'en' ? 'en' : 'bm'
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Combined_Invoice.pdf"`);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[Invoice API] Combined PDF generation error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

export default router;
