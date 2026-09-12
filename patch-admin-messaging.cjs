const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAdminMessaging.ts', 'utf8');

code = code.replace(
  `import { generateInvoicePDF } from '@/services/pdfService';`,
  ``
);

code = code.replace(
  `      const pdfDoc = generateInvoicePDF(sendOrder, sendOrder.status === 'approved', sendOrder.lang);
      const pdfBase64 = pdfDoc.output('datauristring');`,
  ``
);

code = code.replace(
  `          pdfBase64: pdfBase64.split(',')[1]`,
  ``
);

fs.writeFileSync('src/hooks/useAdminMessaging.ts', code);
console.log("Patched admin messaging");
