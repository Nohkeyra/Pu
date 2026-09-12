const fs = require('fs');

let orderRoutes = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');
orderRoutes = orderRoutes.replace(/generateServerInvoicePdf/g, 'generateServerInvoicePDF');
fs.writeFileSync('server/routes/orderRoutes.ts', orderRoutes);

let invoiceRoutes = fs.readFileSync('server/routes/invoiceRoutes.ts', 'utf8');
invoiceRoutes = invoiceRoutes.replace(/generateServerInvoicePdf/g, 'generateServerInvoicePDF');
invoiceRoutes = invoiceRoutes.replace(/generateServerConsolidatedInvoicePdf/g, 'generateServerConsolidatedInvoicePDF');
fs.writeFileSync('server/routes/invoiceRoutes.ts', invoiceRoutes);

console.log("Reverted patches for exports");
