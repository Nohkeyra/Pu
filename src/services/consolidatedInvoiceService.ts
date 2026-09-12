import jsPDF from 'jspdf';
import { numberToWords } from './numberToWordsBM';
import type { Order, ConsolidatedInvoicePayload } from '@/types';
import {
  formatDateSafe,
  mealLabelsMap,
  drawCreamBox,
  drawBatikHeaderBackground,
  getCachedLogoBase64,
} from './pdfService';

/**
 * Generates a random invoice number in the same visual style as the
 * sequential RW#### numbers (see server/firebaseAdmin.ts
 * createOrderWithSequentialInvoice), but intentionally NOT drawn from the
 * shared Firestore meta/invoiceCounter sequence. Consolidated invoices are
 * an admin-only, synchronous, client-side PDF export — reserving a real
 * sequential number per page here would require an async Firestore
 * transaction per page mid-render, which this function's synchronous
 * jsPDF-based rendering loop isn't set up for.
 *
 * Per explicit confirmation from Noh: every new page in a consolidated
 * invoice (triggered whenever the previous page's rows fill up) is treated
 * as a fresh, separate invoice — with its own new random invoice number
 * AND its own separate total, not shared with any other page.
 */
const generateRandomInvoiceNo = (): string => {
  const randomDigits = String(Math.floor(Math.random() * 100000)).padStart(5, '0'); // 5-digit random
  return `RW ${randomDigits}`;
};

/**
 * Admin-only. Consolidates MULTIPLE ORDERS from a SINGLE client into one
 * multi-page export (e.g. every catering order for a corporate client in a given month)
 * — matching standard accounting and ERP practices: ONE Master Invoice Number
 * across all pages of the document, with clear pagination and an itemized summary.
 *
 * Rules:
 * 1. Single client only. If `orders` contains more than one distinct `to`
 *    value, this throws rather than printing multiple clients into one document.
 * 2. Unified Master Invoice Number: The assigned consolidated invoice number
 *    (or auto-generated RW sequence) applies consistently across all pages of
 *    this consolidated invoice document.
 * 3. Standard Corporate Accounting Structure: Clear page breakdowns (Page X of Y),
 *    per-page subtotals, an official Grand Total with spelled amount in words,
 *    and a closing Consolidated Order Summary catalog.
 */
export const generateConsolidatedInvoicePDF = (payload: ConsolidatedInvoicePayload, isFinal: boolean = true): jsPDF => {
  const { orders, includeNotes, invoiceNo: providedInvoiceNo, lang = 'bm' } = payload;

  if (orders.length === 0) {
    throw new Error(lang === 'bm'
      ? 'Tiada pesanan dipilih untuk invois konsolidasi.'
      : 'No orders selected for consolidated invoice.');
  }

  // Enforce single-client only. Consolidated invoices are per-client documents.
  const distinctClients = new Set(orders.map(o => o.to || '-'));
  if (distinctClients.size > 1) {
    const clientList = Array.from(distinctClients).join(', ');
    throw new Error(lang === 'bm'
      ? `Invois konsolidasi hanya boleh untuk SATU syarikat/klien sahaja. Pesanan yang dipilih merangkumi ${distinctClients.size} klien berbeza: ${clientList}. Sila pilih pesanan dari satu klien sahaja.`
      : `Consolidated invoices can only be generated for a SINGLE company/client. The selected orders span ${distinctClients.size} different clients: ${clientList}. Please select orders from only one client.`);
  }

  const clientName = orders[0].to || '-';
  const recipientText = clientName;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const cCreamBg = [253, 252, 250]; // Clean warm ivory (#FDFCFA)
  const cGoldBorder = [194, 147, 45]; // Gold border (#C2932D)
  const cHeaderGold = [166, 124, 30]; // Royal Gold (#A67C1E)
  const cDeepGold = [114, 80, 20]; // Deep Royal Bronze-Gold (#725014)
  const cCharcoal = [26, 24, 22]; // Warm charcoal (#1A1816)
  const cGrey = [135, 125, 115]; // Warm muted stone

  // Standard corporate invoice logic: One Master Invoice Number for the entire document
  const masterInvoiceNo = providedInvoiceNo?.trim() || generateRandomInvoiceNo();
  const pageTotals: Record<number, number> = {};
  let currentPageTotal = 0;

  const drawPageHeader = (pageNumber: number) => {
    drawBatikHeaderBackground(doc, 36, 297);

    const logoBase64 = getCachedLogoBase64();
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 15, 8, 20, 20);
      } catch (err) {
        console.warn('Error adding logo to consolidated PDF header:', err);
      }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 39, 16);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Unit 3, Level B3, Menara PjH, Jalan P2a, Presint 2, 62100 Putrajaya, W.P Putrajaya', 39, 23);

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(lang === 'bm' ? 'INVOIS KONSOLIDASI' : 'CONSOLIDATED INVOICE', 282, 20, { align: 'right' });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${lang === 'bm' ? 'Tarikh' : 'Date'}: ${formatDateSafe(new Date().toISOString(), lang)}`, 282, 26, { align: 'right' });
    doc.text(`${lang === 'bm' ? 'No. Invois' : 'Invoice No'}: ${masterInvoiceNo}`, 282, 30, { align: 'right' });
    doc.text(`${lang === 'bm' ? 'Muka Surat' : 'Page'} ${pageNumber}`, 282, 34, { align: 'right' });
  };

  const allPossibleMeals = ['breakfast', 'lunch', 'tea_break', 'hi_tea', 'dinner'];
  const activeMeals = allPossibleMeals.filter(m => orders.some(o => (o.meals || []).includes(m)));

  const startX = 15;
  const colDate = 26;
  const colQty = 16;
  const colNotes = includeNotes ? 38 : 0;
  const mealColWidth = 24;
  const colMealsWidth = Math.max(activeMeals.length * mealColWidth, 48);
  const colRM = 25;
  const colMenu = 267 - colDate - colQty - colNotes - colMealsWidth - colRM;

  const xDate = startX;
  const xQty = xDate + colDate;
  const xNotes = xQty + colQty;
  const xMenu = includeNotes ? xNotes + colNotes : xNotes;
  const xMealsStartActual = xMenu + colMenu;
  const xRM = xMealsStartActual + colMealsWidth;

  let currentY = 40;
  let currentPageNumber = 1;

  const drawMatrixHeader = (y: number) => {
    // Row 1: ORDER DETAILS, PRICE / PAX (RM), TOTAL
    doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.rect(15, y, 267, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text(lang === 'bm' ? 'BUTIRAN PESANAN' : 'ORDER DETAILS', xDate + (xMealsStartActual - xDate) / 2, y + 4.8, { align: 'center' });

    if (activeMeals.length > 0) {
      doc.line(xMealsStartActual, y, xMealsStartActual, y + 7);
      doc.text(lang === 'bm' ? 'HARGA / PAX (RM)' : 'PRICE / PAX (RM)', xMealsStartActual + colMealsWidth / 2, y + 4.8, { align: 'center' });
    }

    doc.line(xRM, y, xRM, y + 7);
    doc.text(lang === 'bm' ? 'JUMLAH' : 'TOTAL', xRM + colRM / 2, y + 4.8, { align: 'center' });

    // Row 2: Sub-columns
    const r2Y = y + 7;
    doc.setFillColor(cDeepGold[0], cDeepGold[1], cDeepGold[2]);
    doc.rect(15, r2Y, 267, 7, 'F');

    doc.setFontSize(7.5);
    const centerText = (txt: string, x: number, w: number) => {
      doc.text(txt, x + w / 2, r2Y + 4.8, { align: 'center' });
    };

    centerText(lang === 'bm' ? 'Tarikh' : 'Date', xDate, colDate);
    centerText(lang === 'bm' ? 'Kuantiti' : 'QTY', xQty, colQty);
    if (includeNotes) centerText(lang === 'bm' ? 'Catatan' : 'Notes', xNotes, colNotes);
    centerText('Menu', xMenu, colMenu);

    activeMeals.forEach((meal, i) => {
      const raw = mealLabelsMap[meal] || meal;
      const shortLabel = lang === 'bm' ? (raw.split('/')[0] || raw).trim() : (raw.split('/')[1] || raw).trim();
      centerText(shortLabel, xMealsStartActual + (i * mealColWidth), mealColWidth);
    });

    centerText('RM', xRM, colRM);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.15);
    [xQty, xNotes, xMenu, xMealsStartActual, ...activeMeals.map((_, i) => xMealsStartActual + i * mealColWidth), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  const drawSubtotalRow = (label: string, amount: number) => {
    doc.setFillColor(cDeepGold[0], cDeepGold[1], cDeepGold[2]);
    doc.rect(15, currentY, 267, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, 18, currentY + 4.8);
    doc.text(`RM ${amount.toFixed(2)}`, xRM + colRM - 2, currentY + 4.8, { align: 'right' });
    currentY += 7;
  };

  // Closes out the current page: draws its TOTAL AMOUNT row, records the
  // page's invoice number + total for the final summary, then starts a
  // fresh page with its own header, client box, table header, and a reset
  // (zeroed) running total.
  const closeCurrentPageAndStartNext = () => {
    const totalLabel = lang === 'en' ? 'TOTAL AMOUNT' : 'JUMLAH AMAUN';
    drawSubtotalRow(totalLabel, currentPageTotal);
    pageTotals[currentPageNumber] = currentPageTotal;

    doc.addPage();
    currentPageNumber++;
    currentPageTotal = 0;
    drawPageHeader(currentPageNumber);
    currentY = 40;
    const toBoxLabel = lang === 'en' ? 'TO' : 'KEPADA';
    drawCreamBox(doc, 15, currentY, 267, 13, toBoxLabel, recipientText, true);
    currentY += 13 + 4;
    currentY = drawMatrixHeader(currentY);
  };

  const checkPageBreak = (neededHeight: number) => {
    // Reserve room for this page's own TOTAL AMOUNT row (7mm) in landscape A4 (height 210mm)
    if (currentY + neededHeight + 7 > 180) {
      closeCurrentPageAndStartNext();
    }
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
    doc.rect(15, currentY, 267, rowHeight, 'F');

    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 267, rowHeight, 'S');

    [xQty, xNotes, xMenu, xMealsStartActual, ...activeMeals.map((_, i) => xMealsStartActual + i * mealColWidth), xRM].forEach(x => {
      if ((x > xDate && x < xRM + colRM && x !== xNotes) || (includeNotes && x === xNotes)) {
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
        doc.text(val.toFixed(2), xMealsStartActual + (i * mealColWidth) + mealColWidth / 2, textY, { align: 'center' });
      } else {
        doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
        doc.text('-', xMealsStartActual + (i * mealColWidth) + mealColWidth / 2, textY, { align: 'center' });
        doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
      }
    });

    const totalNum = typeof order.totalAmount === 'number' ? order.totalAmount : (parseFloat(String(order.totalAmount ?? '')) || 0);
    doc.text(totalNum.toFixed(2), xRM + colRM - 2, textY, { align: 'right' });

    currentY += rowHeight;
    return totalNum;
  };

  // --- Page 1 setup ---
  drawPageHeader(currentPageNumber);
  const toBoxLabel = lang === 'en' ? 'TO' : 'KEPADA';
  drawCreamBox(doc, 15, currentY, 267, 13, toBoxLabel, recipientText, true);
  currentY += 13 + 4;
  currentY = drawMatrixHeader(currentY);

  orders.forEach(order => {
    currentPageTotal += drawOrderRow(order);
  });

  // Close out the final page
  pageTotals[currentPageNumber] = currentPageTotal;
  const grandTotal = Object.values(pageTotals).reduce((sum, val) => sum + val, 0);

  const finalTotalLabel = currentPageNumber > 1
    ? (lang === 'en' ? `GRAND TOTAL (PAGES 1-${currentPageNumber})` : `JUMLAH KESELURUHAN (MUKA SURAT 1-${currentPageNumber})`)
    : (lang === 'en' ? 'GRAND TOTAL' : 'JUMLAH KESELURUHAN');

  checkPageBreak(7);
  drawSubtotalRow(finalTotalLabel, grandTotal);

  const lastContentY = currentY;
  const lastContentPageNumber = currentPageNumber;

  // Amount-in-words + disclaimer + bank details go on the last content page, referencing the grandTotal.
  currentY = lastContentY;

  const spaceNeeded = 40;
  if (currentY + spaceNeeded > 180) {
    doc.addPage();
    currentPageNumber++;
    drawPageHeader(currentPageNumber);
    currentY = 40;
  }

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
  const disclaimerText = lang === 'en'
    ? '* The price given includes service charge & biodegradable packaging sets.'
    : '* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan mesra alam.';
  doc.text(disclaimerText, 18, disclaimerY + 5);

  const bankBoxY = disclaimerY + 11;
  doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
  doc.rect(15, bankBoxY, 267, 22, 'F');
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.35);
  doc.rect(15, bankBoxY, 267, 22, 'S');

  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(lang === 'en' ? 'BANK ACCOUNT DETAILS' : 'MAKLUMAT AKAUN BANK', 18, bankBoxY + 5);

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

  // --- Final summary page: Consolidated Summary across all orders for this invoice ---
  doc.addPage();
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(lang === 'bm' ? 'RESTORAN WAWASAN — INVOIS KONSOLIDASI' : 'RESTORAN WAWASAN — CONSOLIDATED INVOICE', 15, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${lang === 'bm' ? 'Klien / Syarikat' : 'Client / Company'}: ${clientName}`, 15, 24.5);
  doc.text(`${lang === 'bm' ? 'No. Invois' : 'Invoice No'}: ${masterInvoiceNo}`, 15, 28.5);

  const picHeaderY = 33;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, picHeaderY, 267, 7.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    lang === 'bm'
      ? 'RINGKASAN PESANAN KONSOLIDASI'
      : 'CONSOLIDATED ORDERS SUMMARY',
    18, picHeaderY + 5
  );

  let summaryY = picHeaderY + 7.5 + 6;
  doc.setFontSize(8.5);
  for (let p = 1; p <= lastContentPageNumber; p++) {
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lang === 'bm' ? 'Subtotal Muka Surat' : 'Page Subtotal'} ${p}`, 18, summaryY);
    doc.setFont('helvetica', 'normal');
    const pTotal = pageTotals[p] || 0;
    doc.text(`RM ${pTotal.toFixed(2)}`, 280, summaryY, { align: 'right' });
    summaryY += 6;
  }

  summaryY += 3;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, summaryY, 282, summaryY);
  summaryY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.text(
    lang === 'bm' ? 'JUMLAH KESELURUHAN' : 'GRAND TOTAL',
    18, summaryY
  );
  doc.text(`RM ${grandTotal.toFixed(2)}`, 280, summaryY, { align: 'right' });
  summaryY += 10;

  const sigSectionY = summaryY + 10;
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(lang === 'en' ? 'PREPARED BY' : 'DISEDIAKAN OLEH', 15, sigSectionY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Restoran Wawasan', 15, sigSectionY + 4.5);

  doc.setDrawColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setLineWidth(0.4);
  doc.line(15, sigSectionY + 25, 80, sigSectionY + 25);

  const footerLineY = sigSectionY + 40;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, footerLineY, 282, footerLineY);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    lang === 'en'
      ? 'Thank you for your trust  |  ON BEHALF OF RESTORAN WAWASAN'
      : 'Terima kasih di atas kepercayaan anda  |  BAGI PIHAK RESTORAN WAWASAN',
    148.5, footerLineY + 5, { align: 'center' }
  );

  doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(
    lang === 'en'
      ? '* This file is computer generated — no company stamp required'
      : '* Fail ini dijana oleh komputer — tiada cop syarikat diperlukan',
    148.5, footerLineY + 9, { align: 'center' }
  );

  // Post-pass across all pages: draw consistent bottom border and pagination
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(15, 198, 282, 198);
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya', 148.5, 203, { align: 'center' });

    doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
    doc.setFontSize(7.5);
    doc.text(`${lang === 'bm' ? 'Muka Surat' : 'Page'} ${i} / ${totalPages}`, 282, 203, { align: 'right' });
  }

  return doc;
};

export default generateConsolidatedInvoicePDF;
