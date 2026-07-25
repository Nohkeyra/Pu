import jsPDF from 'jspdf';
import { numberToWords } from './numberToWordsBM';
import type { Order, CombinedInvoicePayload, ConsolidatedInvoicePayload } from '@/types';

let cachedLogoBase64: string | null = null;

export const preloadLogoForPDF = (): Promise<string> => {
  if (cachedLogoBase64) return Promise.resolve(cachedLogoBase64);
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve('');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill a white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 180, 180);

          // Draw a clean, crisp, circular mask or just draw the full image neatly inside.
          // Since the source is circular, let's draw it centered
          ctx.drawImage(img, 0, 0, 180, 180);
          
          cachedLogoBase64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve(cachedLogoBase64);
          return;
        }
      } catch (err) {
        console.error('Error scaling logo for PDF:', err);
      }
      resolve('');
    };
    img.onerror = () => {
      console.error('Failed to load logo for PDF preloading');
      resolve('');
    };
    img.src = '/assets/wawasan_logo.jpg';
  });
};

const formatDateSafe = (dateString: string | undefined, lang: 'en' | 'bm'): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    
    const day = d.getDate().toString().padStart(2, '0');
    
    const monthsBM = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    const monthsEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthName = lang === 'bm' ? monthsBM[d.getMonth()] : monthsEN[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${monthName} ${year}`;
  } catch (e) {
    console.error('Date parsing error:', e);
    return '-';
  }
};

// Map meal values to dual labels
const mealLabelsMap: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  tea_break: 'Tea Break',
  hi_tea: 'Hi-Tea',
};

const drawCreamBox = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  content: string,
  isBoldContent: boolean = true
) => {
  // 1. Fill background (light cream)
  doc.setFillColor(250, 247, 240);
  doc.rect(x, y, w, h, 'F');

  // 2. Draw gold/amber border
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h, 'S');

  // 3. Draw dual label (antique gold, uppercase, bold, very small)
  doc.setTextColor(140, 101, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(label, x + 4, y + 5);

  // 4. Draw content (charcoal, normal/bold)
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', isBoldContent ? 'bold' : 'normal');
  doc.setFontSize(9.5);

  const maxTextWidth = w - 8;
  const splitLines = doc.splitTextToSize(content || '', maxTextWidth);
  splitLines.forEach((line: string, idx: number) => {
    if (11 + (idx * 4.5) < h) {
      doc.text(line, x + 4, y + 11 + (idx * 4.5));
    }
  });
};

export const generateInvoicePDF = (order: Order, isFinal: boolean, lang: 'en' | 'bm' = 'bm'): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette Definitions (from the provided design)
  const cCreamBg = [250, 247, 240];
  const cGoldBorder = [194, 147, 45];
  const cHeaderGold = [166, 124, 30];
  const cDarkBrown = [96, 64, 8];
  const cCharcoal = [26, 24, 22];
  const cGrey = [148, 163, 184];

  // ==========================================
  // PAGE 1: PRIMARY INVOICE & ACCOUNTS
  // ==========================================

  // --- 1. HEADER SECTION ---
  // Space left for logo on left, but "Logo" text is removed
  // (Left blank for a clean corporate appearance)
  if (cachedLogoBase64) {
    try {
      doc.addImage(cachedLogoBase64, 'JPEG', 15, 14, 21, 21);
    } catch (err) {
      console.error('Error adding logo to PDF:', err);
    }
  }

  // Restoran details
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RESTORAN WAWASAN', 40, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Unit 3, Level B3, Menara PjH', 40, 25);
  doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 40, 29);
  doc.text('Est. 1986', 40, 33);

  // Invoice Big Heading on right
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INVOICE', 195, 24, { align: 'right' });

  // Tarikh / Date
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const formattedInvoiceDate = formatDateSafe(order.dateTime || new Date().toISOString(), lang);
  doc.text(`Tarikh / Date: ${formattedInvoiceDate}`, 195, 33, { align: 'right' });

  // --- 2. GRID INFO BOXES ---
  // Row 1: Invoice No & Event Date
  const invoiceNoVal = order.invoiceNo || 'PENDING';
  drawCreamBox(doc, 15, 42, 87, 15, 'INVOICE NO.', invoiceNoVal, true);
  
  const formattedEventDate = formatDateSafe(order.dateTime, lang);
  drawCreamBox(doc, 108, 42, 87, 15, 'TARIKH ACARA / EVENT DATE', formattedEventDate, true);

  // Row 2: Kepada / To (Full-Width)
  const recipientText = order.to + (order.attn ? ` (Attn: ${order.attn})` : '');
  drawCreamBox(doc, 15, 61, 180, 15, 'KEPADA / TO', recipientText, true);

  // Row 3: Event Location & Meal For
  drawCreamBox(doc, 15, 80, 87, 15, 'LOKASI ACARA / EVENT LOCATION', order.location, true);

  const mealForText = order.meals.map(m => mealLabelsMap[m] || m).join(' / ');
  drawCreamBox(doc, 108, 80, 87, 15, 'JENIS HIDANGAN / MEAL FOR', mealForText, true);

  // Row 4: Quantity (Full-Width)
  const qtyText = order.quantity ? `${order.quantity} PAX` : '-';
  drawCreamBox(doc, 15, 99, 180, 12, 'BILANGAN PAX / QUANTITY', qtyText, true);

  // --- 3. MENU BOX ---
  // Menu Header Bar
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, 115, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MENU', 18, 120);

  // Menu Content Area with dynamic wrapping
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const menuString = order.menu || 'Set Box Makanan & Minuman';
  const splitMenu = doc.splitTextToSize(menuString, 174);
  const lineCount = splitMenu.length;
  const menuBoxHeight = Math.max(12, lineCount * 4.5 + 4);

  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, 122, 180, menuBoxHeight, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, 122, 180, menuBoxHeight, 'S');

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  // Render multi-line wrapped text
  doc.text(splitMenu, 18, 126.5);

  // --- 4. MEAL ITEMS TABLE ---
  const tableStartY = 122 + menuBoxHeight + 5;
  
  // Table Header Row
  doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
  doc.rect(15, tableStartY, 180, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const headerLabels = lang === 'en' 
    ? { item: 'Meal Type', price: 'Price / Pax (RM)', total: 'Amount (RM)' }
    : { item: 'Jenis Hidangan', price: 'Harga / Pax (RM)', total: 'Jumlah (RM)' };
    
  doc.text(headerLabels.item, 18, tableStartY + 4.8);
  doc.text(headerLabels.price, 120, tableStartY + 4.8, { align: 'center' });
  doc.text(headerLabels.total, 192, tableStartY + 4.8, { align: 'right' });

  // Render Table Rows
  let currentY = tableStartY + 7;
  const rowHeight = 7.5;

  order.meals.forEach((meal) => {
    // Fill Cream background
    doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
    doc.rect(15, currentY, 180, rowHeight, 'F');

    // Draw borders
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 105, rowHeight, 'S'); // Col 1
    doc.rect(120, currentY, 35, rowHeight, 'S');  // Col 2
    doc.rect(155, currentY, 40, rowHeight, 'S');  // Col 3

    // Content
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    
    // Use translated meal label if available
    const mealLabel = mealLabelsMap[meal] || meal;
    doc.text(mealLabel, 18, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    const hasPrice = isFinal && order.prices && order.prices[meal] !== undefined;
    const priceValRaw = hasPrice ? order.prices![meal] : 0;
    const priceVal = typeof priceValRaw === 'number' ? priceValRaw : parseFloat(priceValRaw as unknown as string) || 0;
    const quantityNum = typeof order.quantity === 'number' ? order.quantity : parseInt(order.quantity as unknown as string, 10) || 0;
    const subtotal = priceVal * quantityNum;

    if (isFinal) {
      doc.text(priceVal.toFixed(2), 137.5, currentY + 4.8, { align: 'center' });
      doc.text(subtotal.toFixed(2), 192, currentY + 4.8, { align: 'right' });
    } else {
      doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
      doc.setFont('helvetica', 'italic');
      doc.text('-', 137.5, currentY + 4.8, { align: 'center' });
      doc.text('-', 192, currentY + 4.8, { align: 'right' });
    }

    currentY += rowHeight;
  });

  // Grand Total Row
  doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
  doc.rect(15, currentY, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JUMLAH KESELURUHAN / GRAND TOTAL', 18, currentY + 4.8);

  const totalAmountNum = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount as unknown as string) || 0;

  if (isFinal && totalAmountNum > 0) {
    doc.text(`RM ${totalAmountNum.toFixed(2)}`, 192, currentY + 4.8, { align: 'right' });
  } else {
    doc.text('RM —', 192, currentY + 4.8, { align: 'right' });
  }
  currentY += 7;

  // --- 5. SPELLING & TERM FOOTER (Replaced large Total Amount box with just the written words in bold) ---
  const textNoteY = currentY + 7;
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);

  if (isFinal && totalAmountNum > 0) {
    const spelledWords = numberToWords(totalAmountNum, lang).toUpperCase();
    doc.text(spelledWords, 15, textNoteY);
  } else {
    if (lang === 'en') {
      doc.text('RINGGIT MALAYSIA ____________________________________________________________________ ONLY', 15, textNoteY);
    } else {
      doc.text('RINGGIT MALAYSIA ____________________________________________________________________ SAHAJA', 15, textNoteY);
    }
  }

  // Orange vertical bar accent
  const disclaimerY = textNoteY + 4;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, disclaimerY, 1, 7.5, 'F');

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan biodegradable.', 18, disclaimerY + 3);
  doc.text('* The price given includes service charge & biodegradable packaging sets.', 18, disclaimerY + 6.5);

  // --- 6. BANK ACCOUNT DETAILS BOX ---
  const bankBoxY = disclaimerY + 11;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, bankBoxY, 180, 22, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, bankBoxY, 180, 22, 'S');

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 18, bankBoxY + 5);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(lang === 'en' ? 'Name' : 'Nama', 18, bankBoxY + 11);
  doc.text(lang === 'en' ? 'Bank' : 'Bank', 18, bankBoxY + 15);
  doc.text(lang === 'en' ? 'Account No.' : 'No. Akaun', 18, bankBoxY + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('RESTORAN WAWASAN', 42, bankBoxY + 11);
  doc.text('BANK MUAMALAT', 42, bankBoxY + 15);
  doc.text('16010000-405710', 42, bankBoxY + 19);

  // --- 8. PAGE 1 FOOTER LINE ---
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, 280, 195, 280);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Putrajaya  |  Est. 1986', 105, 285, { align: 'center' });


  // Final page with PIC info
  doc.addPage();

  // --- 1. PAGE 2 HEADER ---
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RESTORAN WAWASAN — INVOICE', 15, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Maklumat Pegawai Bertanggungjawab / Person in Charge Details', 15, 24.5);

  // Invoice Number reference on the right
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoiceNoVal}`, 195, 22, { align: 'right' });

  // --- 2. PERSON IN CHARGE DETAILS TABLE/BOX ---
  const picHeaderY = 31;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, picHeaderY, 180, 7.5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PERSON IN CHARGE DETAILS', 18, picHeaderY + 5);

  const picBoxY = picHeaderY + 7.5;
  const picBoxHeight = 44;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, picBoxY, 180, picBoxHeight, 'F');
  
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, picBoxY, 180, picBoxHeight, 'S');

  // Internal grid division lines
  doc.line(105, picBoxY, 105, picBoxY + 30); // vertical split in center
  doc.line(15, picBoxY + 15, 195, picBoxY + 15); // horizontal line 1
  doc.line(15, picBoxY + 30, 195, picBoxY + 30); // horizontal line 2

  // Populate Grid Fields
  // Field 1: Nama / Name
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NAMA / NAME', 18, picBoxY + 5.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.name || '-', 18, picBoxY + 10.5);

  // Field 2: No Telefon / Contact Number
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NO. TELEFON / CONTACT NUMBER', 108, picBoxY + 5.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.contact || '-', 108, picBoxY + 10.5);

  // Field 3: E-mel / Email
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('E-MEL / EMAIL', 18, picBoxY + 20.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.email || '-', 18, picBoxY + 25.5);

  // Field 4: Attn
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ATTN', 108, picBoxY + 20.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(order.attn || '-', 108, picBoxY + 25.5);

  // Field 5: Nota / Notes (Full width)
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NOTA / NOTES', 18, picBoxY + 35.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  
  const notesText = order.notes || '-';
  const splitNotes = doc.splitTextToSize(notesText, 174);
  doc.text(splitNotes, 18, picBoxY + 40);

  // --- 3. SIGNATURE SECTION ---
  const sigSectionY = picBoxY + picBoxHeight + 25;

  // Prepared By (Left)
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DISEDIAKAN OLEH / PREPARED BY', 15, sigSectionY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Restoran Wawasan', 15, sigSectionY + 4.5);

  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.4);
  doc.line(15, sigSectionY + 25, 80, sigSectionY + 25); // signature line

  // --- 4. PAGE 2 FOOTER LINE & TEXTS ---
  const footerLineY = sigSectionY + 42;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, footerLineY, 195, footerLineY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih di atas kepercayaan anda  |  ON BEHALF OF RESTORAN WAWASAN', 105, footerLineY + 5, { align: 'center' });

  doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* This file is computer generated — no company stamp required', 105, footerLineY + 9, { align: 'center' });

  return doc;
};

export const generateCombinedInvoicePDF = (payload: CombinedInvoicePayload, isFinal: boolean = true): jsPDF => {
  const { orders, includeNotes, lang = 'bm' } = payload;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cCreamBg = [250, 247, 240];
  const cGoldBorder = [194, 147, 45];
  const cHeaderGold = [166, 124, 30];
  const cDarkBrown = [96, 64, 8];
  const cCharcoal = [26, 24, 22];
  const cGrey = [148, 163, 184];

  const drawPageHeader = (pageNumber: number) => {
    if (cachedLogoBase64) {
      try {
        doc.addImage(cachedLogoBase64, 'JPEG', 15, 14, 21, 21);
      } catch { console.warn('Logo err'); }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 40, 20);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Unit 3, Level B3, Menara PjH', 40, 25);
    doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 40, 29);
    doc.text('Est. 1986', 40, 33);

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('COMBINED INVOICE', 195, 24, { align: 'right' });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Tarikh / Date: ${formatDateSafe(new Date().toISOString(), lang)}`, 195, 33, { align: 'right' });
    if (pageNumber > 1) {
      doc.text(`Page ${pageNumber}`, 195, 38, { align: 'right' });
    }
  };

  let pageNumber = 1;
  drawPageHeader(pageNumber);

  const firstOrder = orders[0] || {} as Order;
  const recipientText = firstOrder.to + (firstOrder.attn ? ` (Attn: ${firstOrder.attn})` : '');
  
  drawCreamBox(doc, 15, 42, 180, 15, 'KEPADA / TO', recipientText, true);

  const allPossibleMeals = ['breakfast', 'lunch', 'tea_break', 'hi_tea', 'dinner'];
  const activeMeals = allPossibleMeals.filter(m => orders.some(o => (o.meals || []).includes(m)));
  
  const startX = 15;
  const colDate = 20;
  const colQty = 10;
  const colNotes = includeNotes ? 30 : 0;
  const colMealsWidth = activeMeals.length * 15;
  const colRM = 16;
  const colMenu = 180 - colDate - colQty - colNotes - colMealsWidth - colRM;

  const xDate = startX;
  const xQty = xDate + colDate;
  const xNotes = xQty + colQty;
  const xMenu = includeNotes ? xNotes + colNotes : xNotes;
  const xMealsStart = xMenu + colMenu;
  const xRM = xMealsStart + colMealsWidth;

  const drawMatrixHeader = (y: number) => {
    doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    doc.text('ORDER DETAILS', xDate + (xMealsStart - xDate) / 2, y + 4.8, { align: 'center' });
    
    if (activeMeals.length > 0) {
      doc.line(xMealsStart, y, xMealsStart, y + 7);
      doc.text('PRICE PER UNIT (RM)', xMealsStart + colMealsWidth / 2, y + 4.8, { align: 'center' });
    }
    
    doc.line(xRM, y, xRM, y + 7);
    doc.text('TOTAL', xRM + colRM / 2, y + 4.8, { align: 'center' });

    const r2Y = y + 7;
    doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
    doc.rect(15, r2Y, 180, 7, 'F');
    
    doc.setFontSize(7.5);
    const centerText = (txt: string, x: number, w: number) => {
      doc.text(txt, x + w / 2, r2Y + 4.8, { align: 'center' });
    };

    centerText('Date', xDate, colDate);
    centerText('QTY', xQty, colQty);
    if (includeNotes) centerText('Notes', xNotes, colNotes);
    centerText('Menu', xMenu, colMenu);

    activeMeals.forEach((meal, i) => {
      const shortLabel = mealLabelsMap[meal] || meal;
      centerText(shortLabel, xMealsStart + (i * 15), 15);
    });

    centerText('RM', xRM, colRM);
    
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * 15), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  let currentY = 62;
  currentY = drawMatrixHeader(currentY);

  let grandTotal = 0;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 265) {
      doc.addPage();
      pageNumber++;
      drawPageHeader(pageNumber);
      currentY = 42;
      currentY = drawMatrixHeader(currentY);
    }
  };

  orders.forEach(order => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    
    const formattedDate = formatDateSafe(order.dateTime, lang);
    const splitDate = doc.splitTextToSize(formattedDate, colDate - 2);
    const splitNotes = includeNotes ? doc.splitTextToSize(order.notes || '-', colNotes - 2) : [];
    const splitMenu = doc.splitTextToSize(order.menu || 'Set Box', colMenu - 2);
    const qtyStr = (order.quantity || 0).toString();
    
    const maxLines = Math.max(splitDate.length, splitNotes.length, splitMenu.length, 1);
    const rowHeight = Math.max(7, maxLines * 4 + 3);
    
    checkPageBreak(rowHeight);

    doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
    doc.rect(15, currentY, 180, rowHeight, 'F');
    
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 180, rowHeight, 'S');

    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * 15), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM && x !== xNotes || (includeNotes && x === xNotes)) {
        doc.line(x, currentY, x, currentY + rowHeight);
      }
    });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    const textY = currentY + 5;
    
    doc.text(splitDate, xDate + colDate / 2, textY, { align: 'center' });
    doc.text(qtyStr, xQty + colQty / 2, textY, { align: 'center' });
    if (includeNotes) doc.text(splitNotes, xNotes + colNotes / 2, textY, { align: 'center' });
    doc.text(splitMenu, xMenu + colMenu / 2, textY, { align: 'center' });

    activeMeals.forEach((meal, i) => {
      if (order.meals.includes(meal) && order.prices && order.prices[meal] !== undefined) {
        const p = order.prices[meal];
        const val = typeof p === 'number' ? p : parseFloat(p as string);
        doc.text(val.toFixed(2), xMealsStart + (i * 15) + 7.5, textY, { align: 'center' });
      } else {
        doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
        doc.text('-', xMealsStart + (i * 15) + 7.5, textY, { align: 'center' });
        doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
      }
    });

    const totalNum = typeof order.totalAmount === 'number' ? order.totalAmount : (parseFloat(String(order.totalAmount ?? '')) || 0);
    doc.text(totalNum.toFixed(2), xRM + colRM - 2, textY, { align: 'right' });
    
    grandTotal += totalNum;
    currentY += rowHeight;
  });

  checkPageBreak(7);
  doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
  doc.rect(15, currentY, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JUMLAH KESELURUHAN / GRAND TOTAL', 18, currentY + 4.8);
  doc.text(`RM ${grandTotal.toFixed(2)}`, xRM + colRM - 2, currentY + 4.8, { align: 'right' });
  currentY += 7;

  checkPageBreak(40);
  
  const textNoteY = currentY + 7;
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);

  if (isFinal && grandTotal > 0) {
    const spelledWords = numberToWords(grandTotal, lang).toUpperCase();
    doc.text(spelledWords, 15, textNoteY);
  } else {
    if (lang === 'en') {
      doc.text('RINGGIT MALAYSIA ____________________________________________________________________ ONLY', 15, textNoteY);
    } else {
      doc.text('RINGGIT MALAYSIA ____________________________________________________________________ SAHAJA', 15, textNoteY);
    }
  }

  const disclaimerY = textNoteY + 4;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, disclaimerY, 1, 7.5, 'F');

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan biodegradable.', 18, disclaimerY + 3);
  doc.text('* The price given includes service charge & biodegradable packaging sets.', 18, disclaimerY + 6.5);

  const bankBoxY = disclaimerY + 11;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, bankBoxY, 180, 22, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, bankBoxY, 180, 22, 'S');

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 18, bankBoxY + 5);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(lang === 'en' ? 'Name' : 'Nama', 18, bankBoxY + 11);
  doc.text(lang === 'en' ? 'Bank' : 'Bank', 18, bankBoxY + 15);
  doc.text(lang === 'en' ? 'Account No.' : 'No. Akaun', 18, bankBoxY + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('RESTORAN WAWASAN', 42, bankBoxY + 11);
  doc.text('BANK MUAMALAT', 42, bankBoxY + 15);
  doc.text('16010000-405710', 42, bankBoxY + 19);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(15, 280, 195, 280);
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Putrajaya  |  Est. 1986', 105, 285, { align: 'center' });
  }

  doc.addPage();
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RESTORAN WAWASAN — COMBINED INVOICE', 15, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Maklumat Pegawai Bertanggungjawab / Person in Charge Details', 15, 24.5);

  const picHeaderY = 31;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, picHeaderY, 180, 7.5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PERSON IN CHARGE DETAILS', 18, picHeaderY + 5);

  const picBoxY = picHeaderY + 7.5;
  const picBoxHeight = 44;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, picBoxY, 180, picBoxHeight, 'F');
  
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, picBoxY, 180, picBoxHeight, 'S');

  doc.line(105, picBoxY, 105, picBoxY + 30);
  doc.line(15, picBoxY + 15, 195, picBoxY + 15);
  doc.line(15, picBoxY + 30, 195, picBoxY + 30);

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NAMA / NAME', 18, picBoxY + 5.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(firstOrder.name || '-', 18, picBoxY + 10.5);

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NO. TELEFON / CONTACT NUMBER', 108, picBoxY + 5.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(firstOrder.contact || '-', 108, picBoxY + 10.5);

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('E-MEL / EMAIL', 18, picBoxY + 20.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(firstOrder.email || '-', 18, picBoxY + 25.5);

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ATTN', 108, picBoxY + 20.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(firstOrder.attn || '-', 108, picBoxY + 25.5);

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NOTA / NOTES', 18, picBoxY + 35.5);
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Combined invoice for multiple selected orders.', 18, picBoxY + 40);

  const sigSectionY = picBoxY + picBoxHeight + 25;
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DISEDIAKAN OLEH / PREPARED BY', 15, sigSectionY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Restoran Wawasan', 15, sigSectionY + 4.5);

  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.4);
  doc.line(15, sigSectionY + 25, 80, sigSectionY + 25);

  const footerLineY = sigSectionY + 42;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, footerLineY, 195, footerLineY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih di atas kepercayaan anda  |  ON BEHALF OF RESTORAN WAWASAN', 105, footerLineY + 5, { align: 'center' });

  doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* This file is computer generated — no company stamp required', 105, footerLineY + 9, { align: 'center' });

  return doc;
};

/**
 * Admin-only. Unlike generateCombinedInvoicePDF (which assumes every
 * selected order belongs to the same customer, since customers only ever
 * select their own orders), an admin can select orders across several
 * different corporate clients in one export. This groups orders by their
 * `to` field, printing a separate "KEPADA/TO" section + order rows +
 * subtotal for each client, then one grand total at the very end.
 *
 * Row height stays dynamic (grows with content, same as
 * generateCombinedInvoicePDF) rather than a fixed row count per page —
 * there is no fixed-10-rows requirement here.
 */
export const generateConsolidatedInvoicePDF = (payload: ConsolidatedInvoicePayload, isFinal: boolean = true): jsPDF => {
  const { orders, includeNotes, lang = 'bm' } = payload;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cCreamBg = [250, 247, 240];
  const cGoldBorder = [194, 147, 45];
  const cHeaderGold = [166, 124, 30];
  const cDarkBrown = [96, 64, 8];
  const cCharcoal = [26, 24, 22];
  const cGrey = [148, 163, 184];

  const drawPageHeader = (pageNumber: number) => {
    if (cachedLogoBase64) {
      try {
        doc.addImage(cachedLogoBase64, 'JPEG', 15, 14, 21, 21);
      } catch { console.warn('Logo err'); }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 40, 20);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Unit 3, Level B3, Menara PjH', 40, 25);
    doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 40, 29);
    doc.text('Est. 1986', 40, 33);

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('CONSOLIDATED INVOICE', 195, 24, { align: 'right' });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Tarikh / Date: ${formatDateSafe(new Date().toISOString(), lang)}`, 195, 33, { align: 'right' });
    if (pageNumber > 1) {
      doc.text(`Page ${pageNumber}`, 195, 38, { align: 'right' });
    }
  };

  let pageNumber = 1;
  drawPageHeader(pageNumber);

  // Group orders by client (`to` field). Map preserves first-seen order,
  // which keeps groups appearing in the same order the admin selected them.
  const groups = new Map<string, Order[]>();
  orders.forEach(order => {
    const key = order.to || '-';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  });

  const allPossibleMeals = ['breakfast', 'lunch', 'tea_break', 'hi_tea', 'dinner'];
  const activeMeals = allPossibleMeals.filter(m => orders.some(o => (o.meals || []).includes(m)));

  const startX = 15;
  const colDate = 20;
  const colQty = 10;
  const colNotes = includeNotes ? 30 : 0;
  const colMealsWidth = activeMeals.length * 15;
  const colRM = 16;
  const colMenu = 180 - colDate - colQty - colNotes - colMealsWidth - colRM;

  const xDate = startX;
  const xQty = xDate + colDate;
  const xNotes = xQty + colQty;
  const xMenu = includeNotes ? xNotes + colNotes : xNotes;
  const xMealsStart = xMenu + colMenu;
  const xRM = xMealsStart + colMealsWidth;

  let currentY = 42;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 265) {
      doc.addPage();
      pageNumber++;
      drawPageHeader(pageNumber);
      currentY = 42;
    }
  };

  const drawClientHeader = (recipientText: string) => {
    checkPageBreak(15);
    drawCreamBox(doc, 15, currentY, 180, 15, 'KEPADA / TO', recipientText, true);
    currentY += 15 + 5;
  };

  const drawMatrixHeader = (y: number) => {
    doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('ORDER DETAILS', xDate + (xMealsStart - xDate) / 2, y + 4.8, { align: 'center' });

    if (activeMeals.length > 0) {
      doc.line(xMealsStart, y, xMealsStart, y + 7);
      doc.text('PRICE PER UNIT (RM)', xMealsStart + colMealsWidth / 2, y + 4.8, { align: 'center' });
    }

    doc.line(xRM, y, xRM, y + 7);
    doc.text('TOTAL', xRM + colRM / 2, y + 4.8, { align: 'center' });

    const r2Y = y + 7;
    doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
    doc.rect(15, r2Y, 180, 7, 'F');

    doc.setFontSize(7.5);
    const centerText = (txt: string, x: number, w: number) => {
      doc.text(txt, x + w / 2, r2Y + 4.8, { align: 'center' });
    };

    centerText('Date', xDate, colDate);
    centerText('QTY', xQty, colQty);
    if (includeNotes) centerText('Notes', xNotes, colNotes);
    centerText('Menu', xMenu, colMenu);

    activeMeals.forEach((meal, i) => {
      const shortLabel = mealLabelsMap[meal] || meal;
      centerText(shortLabel, xMealsStart + (i * 15), 15);
    });

    centerText('RM', xRM, colRM);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * 15), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  const drawOrderRow = (order: Order) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const formattedDate = formatDateSafe(order.dateTime, lang);
    const splitDate = doc.splitTextToSize(formattedDate, colDate - 2);
    const splitNotes = includeNotes ? doc.splitTextToSize(order.notes || '-', colNotes - 2) : [];
    const splitMenu = doc.splitTextToSize(order.menu || 'Set Box', colMenu - 2);
    const qtyStr = (order.quantity || 0).toString();

    const maxLines = Math.max(splitDate.length, splitNotes.length, splitMenu.length, 1);
    const rowHeight = Math.max(7, maxLines * 4 + 3);

    checkPageBreak(rowHeight);

    doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
    doc.rect(15, currentY, 180, rowHeight, 'F');

    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 180, rowHeight, 'S');

    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * 15), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM && x !== xNotes || (includeNotes && x === xNotes)) {
        doc.line(x, currentY, x, currentY + rowHeight);
      }
    });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    const textY = currentY + 5;

    doc.text(splitDate, xDate + colDate / 2, textY, { align: 'center' });
    doc.text(qtyStr, xQty + colQty / 2, textY, { align: 'center' });
    if (includeNotes) doc.text(splitNotes, xNotes + colNotes / 2, textY, { align: 'center' });
    doc.text(splitMenu, xMenu + colMenu / 2, textY, { align: 'center' });

    activeMeals.forEach((meal, i) => {
      if (order.meals.includes(meal) && order.prices && order.prices[meal] !== undefined) {
        const p = order.prices[meal];
        const val = typeof p === 'number' ? p : parseFloat(p as string);
        doc.text(val.toFixed(2), xMealsStart + (i * 15) + 7.5, textY, { align: 'center' });
      } else {
        doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
        doc.text('-', xMealsStart + (i * 15) + 7.5, textY, { align: 'center' });
        doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
      }
    });

    const totalNum = typeof order.totalAmount === 'number' ? order.totalAmount : (parseFloat(String(order.totalAmount ?? '')) || 0);
    doc.text(totalNum.toFixed(2), xRM + colRM - 2, textY, { align: 'right' });

    currentY += rowHeight;
    return totalNum;
  };

  const drawSubtotalRow = (label: string, amount: number) => {
    checkPageBreak(7);
    doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
    doc.rect(15, currentY, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, 18, currentY + 4.8);
    doc.text(`RM ${amount.toFixed(2)}`, xRM + colRM - 2, currentY + 4.8, { align: 'right' });
    currentY += 7;
  };

  let grandTotal = 0;

  groups.forEach((groupOrders, clientName) => {
    const first = groupOrders[0];
    const recipientText = clientName + (first.attn ? ` (Attn: ${first.attn})` : '');
    drawClientHeader(recipientText);
    currentY = drawMatrixHeader(currentY);

    let clientSubtotal = 0;
    groupOrders.forEach(order => {
      clientSubtotal += drawOrderRow(order);
    });

    const subtotalLabel = lang === 'bm'
      ? `JUMLAH KECIL / SUBTOTAL — ${clientName.toUpperCase()}`
      : `SUBTOTAL — ${clientName.toUpperCase()}`;
    drawSubtotalRow(subtotalLabel, clientSubtotal);
    currentY += 3; // small gap before next client group

    grandTotal += clientSubtotal;
  });

  checkPageBreak(7);
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, currentY, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JUMLAH KESELURUHAN / GRAND TOTAL', 18, currentY + 4.8);
  doc.text(`RM ${grandTotal.toFixed(2)}`, xRM + colRM - 2, currentY + 4.8, { align: 'right' });
  currentY += 7;

  checkPageBreak(40);

  const textNoteY = currentY + 7;
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);

  if (isFinal && grandTotal > 0) {
    const spelledWords = numberToWords(grandTotal, lang).toUpperCase();
    doc.text(spelledWords, 15, textNoteY);
  } else {
    if (lang === 'en') {
      doc.text('RINGGIT MALAYSIA ____________________________________________________________________ ONLY', 15, textNoteY);
    } else {
      doc.text('RINGGIT MALAYSIA ____________________________________________________________________ SAHAJA', 15, textNoteY);
    }
  }

  const disclaimerY = textNoteY + 4;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, disclaimerY, 1, 7.5, 'F');

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan biodegradable.', 18, disclaimerY + 3);
  doc.text('* The price given includes service charge & biodegradable packaging sets.', 18, disclaimerY + 6.5);

  const bankBoxY = disclaimerY + 11;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, bankBoxY, 180, 22, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, bankBoxY, 180, 22, 'S');

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 18, bankBoxY + 5);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(lang === 'en' ? 'Name' : 'Nama', 18, bankBoxY + 11);
  doc.text(lang === 'en' ? 'Bank' : 'Bank', 18, bankBoxY + 15);
  doc.text(lang === 'en' ? 'Account No.' : 'No. Akaun', 18, bankBoxY + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('RESTORAN WAWASAN', 42, bankBoxY + 11);
  doc.text('BANK MUAMALAT', 42, bankBoxY + 15);
  doc.text('16010000-405710', 42, bankBoxY + 19);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(15, 280, 195, 280);
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Putrajaya  |  Est. 1986', 105, 285, { align: 'center' });
  }

  doc.addPage();
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RESTORAN WAWASAN — CONSOLIDATED INVOICE', 15, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Ringkasan Klien / Client Summary', 15, 24.5);

  const picHeaderY = 31;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, picHeaderY, 180, 7.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CLIENTS INCLUDED IN THIS CONSOLIDATED INVOICE', 18, picHeaderY + 5);

  let summaryY = picHeaderY + 7.5 + 6;
  doc.setFontSize(8.5);
  groups.forEach((groupOrders, clientName) => {
    const clientTotal = groupOrders.reduce((sum, o) => {
      const t = typeof o.totalAmount === 'number' ? o.totalAmount : (parseFloat(String(o.totalAmount ?? '')) || 0);
      return sum + t;
    }, 0);
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(clientName, 18, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${groupOrders.length} order(s)  |  RM ${clientTotal.toFixed(2)}`, 105, summaryY);
    summaryY += 6;
  });

  const sigSectionY = summaryY + 20;
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DISEDIAKAN OLEH / PREPARED BY', 15, sigSectionY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Restoran Wawasan', 15, sigSectionY + 4.5);

  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.4);
  doc.line(15, sigSectionY + 25, 80, sigSectionY + 25);

  const footerLineY = sigSectionY + 42;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, footerLineY, 195, footerLineY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih di atas kepercayaan anda  |  ON BEHALF OF RESTORAN WAWASAN', 105, footerLineY + 5, { align: 'center' });

  doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('* This file is computer generated — no company stamp required', 105, footerLineY + 9, { align: 'center' });

  return doc;
};

export default generateInvoicePDF;
