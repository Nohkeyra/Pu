const fs = require('fs');
let code = fs.readFileSync('src/components/OrderForm.tsx', 'utf8');

code = code.replace(
  `        const { generateInvoicePDF } = await import('@/services/pdfService');
        const pdfDoc = generateInvoicePDF(createdOrder, false, language);
        const pdfBase64 = (pdfDoc as any).output('datauristring').split(',')[1];`,
  ``
);

code = code.replace(
  `            body: JSON.stringify({
              email: contactEmail,
              name: contactName,
              pdfBase64,
              lang: language
            }),`,
  `            body: JSON.stringify({
              email: contactEmail,
              name: contactName,
              lang: language
            }),`
);

fs.writeFileSync('src/components/OrderForm.tsx', code);
console.log("Patched OrderForm");
