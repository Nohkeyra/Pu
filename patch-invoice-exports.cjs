const fs = require('fs');

let orderRoutes = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');
orderRoutes = orderRoutes.replace(/generateServerInvoicePDF/g, 'generateServerInvoicePdf');
fs.writeFileSync('server/routes/orderRoutes.ts', orderRoutes);

let invoiceRoutes = fs.readFileSync('server/routes/invoiceRoutes.ts', 'utf8');
invoiceRoutes = invoiceRoutes.replace(/generateServerInvoicePDF/g, 'generateServerInvoicePdf');
invoiceRoutes = invoiceRoutes.replace(/generateServerConsolidatedInvoicePDF/g, 'generateServerConsolidatedInvoicePdf');
fs.writeFileSync('server/routes/invoiceRoutes.ts', invoiceRoutes);

console.log("Patched exports in routes");
