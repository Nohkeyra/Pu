const fs = require('fs');
let code = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');

// Replace the requirement for pdfBase64
code = code.replace(
  `  const { email, name, pdfBase64, lang } = req.body;

  if (!id || !email || !pdfBase64) {
    return res.status(400).json({ error: 'id, email and pdfBase64 are required' });
  }`,
  `  const { email, name, lang } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: 'id and email are required' });
  }`
);

// Replace pdfBuffer creation
code = code.replace(
  `    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (!isValidPdf(pdfBuffer)) {
      return res.status(400).json({ success: false, error: 'Invalid PDF format. File does not start with valid PDF header.' });
    }`,
  `    const { generateServerInvoicePDF } = require('../services/serverPdfService.js');
    const orderForPdf = { ...orderData, id: orderSnap.id };
    if (!orderForPdf.invoiceNo) {
      orderForPdf.invoiceNo = \`RW \${id.substring(0, 5).toUpperCase()}-PRE\`;
    }
    const pdfBuffer = await generateServerInvoicePDF(orderForPdf, false, lang === 'en' ? 'en' : 'bm');`
);

fs.writeFileSync('server/routes/orderRoutes.ts', code);
