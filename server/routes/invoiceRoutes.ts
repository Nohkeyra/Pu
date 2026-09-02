import { Router, type Request, type Response } from 'express';
import { verifyAdminToken } from '../adminAuth.js';
import { createBrevoTransporter } from '../emailService.js';
import { whatsappBusinessService } from '../services/whatsappBusinessService.js';
import { createDistributedRateLimiter } from '../distributedRateLimit.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PDF_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// SECURITY FIX (audit 2026-08-28): every other public write endpoint in this
// app (order submission, cancel/delete/poke, preliminary invoice)
// has a rate limiter; this one didn't, so an unauthenticated caller could
// spam-call it to flood the admin's WhatsApp Business number and burn
// message-sending quota/cost. Mirrors the customerOrderActionLimiter used
// for the other unauthenticated customer-facing endpoints in orderRoutes.ts.
const forwardOrderLimiter = createDistributedRateLimiter({
  prefix: 'forward_order',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

/**
 * Validate that a Buffer contains a valid PDF by checking magic bytes.
 * PDF files start with "%PDF-1.x" where x is 0-7.
 */
function isValidPdf(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.toString('ascii', 0, 5);
  return header.startsWith('%PDF-');
}

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
  const { orderId, email, subject, body, pdfBase64 } = req.body || {};

  try {
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid or missing email recipient address.' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP not configured (SMTP_USER/SMTP_PASS missing)');
    }

    let pdfBuffer: Buffer | null = null;
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      if (pdfBuffer.length > MAX_PDF_ATTACHMENT_BYTES) {
        return res.status(400).json({ success: false, error: 'PDF attachment size exceeds 10MB limit.' });
      }
      // SECURITY FIX: Validate PDF magic bytes to prevent executable injection
      if (!isValidPdf(pdfBuffer)) {
        return res.status(400).json({ success: false, error: 'Invalid PDF format. File does not start with valid PDF header.' });
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

export default router;
