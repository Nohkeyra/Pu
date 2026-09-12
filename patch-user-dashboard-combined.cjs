const fs = require('fs');
let code = fs.readFileSync('src/components/UserProfileDashboard.tsx', 'utf8');

code = code.replace(
  `      const { generateCombinedInvoicePDF, preloadLogoForPDF } = await import('@/services/pdfService');
      await preloadLogoForPDF();
      const selectedOrderData = orders.filter(o => selectedOrders.has(o.id!));
      const payload: CombinedInvoicePayload = {
        orders: selectedOrderData,
        includeNotes: withNotes,
        lang: language
      };

      const pdfDoc = generateCombinedInvoicePDF(payload, true);
      const fileName = \`Invois_Gabungan_Wawasan_\${format(new Date(), 'yyyyMMdd_HHmm')}.pdf\`;

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = pdfDoc.output('datauristring').split(',')[1];`,
  `      const selectedOrderData = orders.filter(o => selectedOrders.has(o.id!));
      const orderIds = selectedOrderData.map(o => o.id);
      
      const res = await fetch('/api/invoice/combined/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, includeNotes: withNotes, lang: language })
      });
      if (!res.ok) throw new Error('Failed to fetch combined PDF');
      const blob = await res.blob();
      
      const fileName = \`Invois_Gabungan_Wawasan_\${format(new Date(), 'yyyyMMdd_HHmm')}.pdf\`;

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });`
);

fs.writeFileSync('src/components/UserProfileDashboard.tsx', code);
console.log("Patched UserProfileDashboard combined");
