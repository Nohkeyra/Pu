const fs = require('fs');
let code = fs.readFileSync('server/routes/invoiceRoutes.ts', 'utf8');

const combinedRoute = `
router.post('/invoice/combined/pdf', async (req, res) => {
  try {
    const { orderIds, includeNotes, lang } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of orderIds is required' });
    }

    const db = require('firebase-admin/firestore').getFirestore();
    const orderDocs = [];
    let customInvoiceNo = 'RW COMBINED';

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

    const { generateConsolidatedServerInvoicePDF } = await import('../services/serverPdfService.js');
    
    const combinedPayload = {
      orders: orderDocs,
      includeNotes: Boolean(includeNotes),
      lang: lang === 'en' ? 'en' : 'bm',
      invoiceNo: customInvoiceNo
    };

    const pdfBuffer = await generateConsolidatedServerInvoicePDF(combinedPayload, true);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename="Combined_Invoice.pdf"\`);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[Invoice API] Combined PDF generation error:', err);
    return res.status(500).json({ success: false, error: String(err?.message || err) });
  }
});
`;

code = code.replace(
  `export default router;`,
  combinedRoute + `\nexport default router;`
);

fs.writeFileSync('server/routes/invoiceRoutes.ts', code);
console.log("Patched invoiceRoutes combined");
