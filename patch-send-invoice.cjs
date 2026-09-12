const fs = require('fs');
let code = fs.readFileSync('server/routes/invoiceRoutes.ts', 'utf8');

code = code.replace(
  `const { orderId, email, subject, body, pdfBase64 } = req.body || {};`,
  `const { orderId, email, subject, body } = req.body || {};`
);

code = code.replace(
  `    let pdfBuffer: Buffer | null = null;
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      if (pdfBuffer.length > MAX_PDF_ATTACHMENT_BYTES) {
        return res.status(400).json({ success: false, error: 'PDF attachment size exceeds 10MB limit.' });
      }
      // SECURITY FIX: Validate PDF magic bytes to prevent executable injection
      if (!isValidPdf(pdfBuffer)) {
        return res.status(400).json({ success: false, error: 'Invalid PDF format. File does not start with valid PDF header.' });
      }
    }`,
  `    let pdfBuffer: Buffer | null = null;
    if (orderId) {
      const db = require('firebase-admin/firestore').getFirestore();
      const orderSnap = await db.collection('orders').doc(orderId).get();
      if (orderSnap.exists) {
        const { generateServerInvoicePDF } = await import('../services/serverPdfService.js');
        const orderForPdf = { ...orderSnap.data(), id: orderSnap.id };
        // We do not have lang in body, assume 'bm' or read from order
        const lang = orderForPdf.lang === 'en' ? 'en' : 'bm';
        pdfBuffer = await generateServerInvoicePDF(orderForPdf, true, lang);
      }
    }`
);

fs.writeFileSync('server/routes/invoiceRoutes.ts', code);
console.log("Patched send-invoice");
