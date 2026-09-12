const fs = require('fs');
let code = fs.readFileSync('src/components/UserProfileDashboard.tsx', 'utf8');

code = code.replace(
  `      const { generateInvoicePDF, preloadLogoForPDF } = await import('@/services/pdfService');
      await preloadLogoForPDF();
      const pdfDoc = generateInvoicePDF(order, true, language);
      const fileName = \`Invois_Wawasan_\${getDisplayInvoiceNo(order)}.pdf\`;

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = pdfDoc.output('datauristring').split(',')[1];`,
  `      const fileName = \`Invois_Wawasan_\${getDisplayInvoiceNo(order)}.pdf\`;
      
      const res = await fetch(\`/api/invoice/\${order.id}/pdf?final=true\`);
      if (!res.ok) throw new Error('Failed to fetch invoice');
      const blob = await res.blob();

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });`
);

code = code.replace(
  `} else {
        pdfDoc.save(fileName);
      }`,
  `} else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }`
);

fs.writeFileSync('src/components/UserProfileDashboard.tsx', code);
console.log("Patched UserProfileDashboard");
