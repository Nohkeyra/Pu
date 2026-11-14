import type { jsPDF } from 'jspdf';

/** Use the locally hosted brand face for the PDF title without bundling another font. */
export function drawInvoiceBrandTitle(doc: jsPDF, x: number, baseline: number): void {
  const title = 'RESTORAN WAWASAN';
  const font = 'Uncial Antiqua';
  // jsPDF cannot use CSS/WOFF2 directly. Rasterize only the brand title.
  const win = (typeof window !== 'undefined' ? window : (globalThis as any).window);
  const docRef = (win as any)?.document;
  if (docRef && (docRef as any).fonts?.check(`20px "${font}"`)) {
    const canvas = (docRef as any).createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const px = 64;
      ctx.font = `${px}px "${font}"`;
      const measured = ctx.measureText(title).width;
      canvas.width = Math.ceil(measured + 16);
      canvas.height = 92;
      ctx.font = `${px}px "${font}"`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#725014';
      ctx.fillText(title, 8, 68);
      const imageWidth = canvas.width * (15 / canvas.height);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, baseline - 11.2, imageWidth, 15, undefined, 'FAST');
      return;
    }
  }
  // Safe fallback for non-browser PDF generation and unavailable font resources.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(114, 80, 20);
  doc.text(title, x, baseline);
}
