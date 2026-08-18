import { Router } from 'express';
import { verifyAdminToken } from '../adminAuth.js';
import { createBrevoTransporter } from '../emailService.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PDF_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB limit

router.post('/send-invoice', verifyAdminToken, async (req, res) => {
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
