import { Router } from 'express';
import { verifyAdminToken } from '../adminAuth.js';
import { createBrevoTransporter } from '../emailService.js';

const router = Router();

router.post('/send-invoice', verifyAdminToken, async (req, res) => {
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

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
