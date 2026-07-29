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
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `RW${randomDigits}`;
};

/**
 * Admin-only. Consolidates MULTIPLE ORDERS from a SINGLE client into one
 * multi-page export (e.g. every catering order for Gas District Cooling in
 * a given month) — matching how Restoran Wawasan's real invoices work: one
 * client per invoice.
 *
 * IMPORTANT — two rules confirmed with Noh against a real invoice example:
 * 1. Single client only. If `orders` contains more than one distinct `to`
 *    value, this throws rather than silently printing multiple clients
 *    into one document (the previous, incorrect behavior).
 * 2. Each page is its own separate invoice: when rows overflow onto a new
 *    page, that new page gets a fresh random invoice number (see
 *    generateRandomInvoiceNo) AND starts its own separate running total —
 *    it does NOT continue accumulating the previous page's total. A final
 *    summary page lists every page's invoice number and total, plus a
 *    reference-only combined total across all pages for the admin's own
 *    bookkeeping (not printed as an official total on any invoice page).
 */
export const generateConsolidatedInvoicePDF = (payload: ConsolidatedInvoicePayload, isFinal: boolean = true): jsPDF => {
  const { orders, includeNotes, lang = 'bm' } = payload;

  if (orders.length === 0) {
    throw new Error(lang === 'bm'
      ? 'Tiada pesanan dipilih untuk invois konsolidasi.'
      : 'No orders selected for consolidated invoice.');
  }

  // Enforce single-client only. Consolidated invoices are per-client
  // documents; mixing clients into one invoice is not a valid business
  // document (confirmed against a real Restoran Wawasan invoice example).
  const distinctClients = new Set(orders.map(o => o.to || '-'));
  if (distinctClients.size > 1) {
    const clientList = Array.from(distinctClients).join(', ');
    throw new Error(lang === 'bm'
      ? `Invois konsolidasi hanya boleh untuk SATU klien sahaja. Pesanan yang dipilih merangkumi ${distinctClients.size} klien berbeza: ${clientList}. Sila pilih pesanan dari satu klien sahaja.`
      : `Consolidated invoices can only be generated for a SINGLE client. The selected orders span ${distinctClients.size} different clients: ${clientList}. Please select orders from only one client.`);
  }

  const clientName = orders[0].to || '-';
  const clientAttn = orders[0].attn;
  const recipientText = clientName + (clientAttn ? ` (Attn: ${clientAttn})` : '');

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

  // Per-page bookkeeping: each page gets its own random invoice number and
  // its own running total, tracked here so the final summary page can list
  // every page's invoice number + total.
  const pageInvoiceNumbers: Record<number, string> = {};
  const pageTotals: Record<number, number> = {};
  let currentPageTotal = 0;

  const getInvoiceNoForPage = (pageNumber: number): string => {
    if (!pageInvoiceNumbers[pageNumber]) {
      pageInvoiceNumbers[pageNumber] = generateRandomInvoiceNo();
    }
    return pageInvoiceNumbers[pageNumber];
  };

  const drawPageHeader = (pageNumber: number) => {
    drawBatikHeaderBackground(doc, 38);

    const logoBase64 = getCachedLogoBase64();
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 15, 12, 21, 21);
      } catch (err) {
        console.warn('Error adding logo to consolidated PDF header:', err);
      }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 40, 18);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Unit 3, Level B3, Menara PjH', 40, 23);
    doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 40, 27);
    doc.text('Est. 1986', 40, 31);

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('CONSOLIDATED INVOICE', 195, 22, { align: 'right' });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Tarikh / Date: ${formatDateSafe(new Date().toISOString(), lang)}`, 195, 31, { align: 'right' });
    doc.text(`${lang === 'bm' ? 'No. Invois' : 'Invoice No'}: ${getInvoiceNoForPage(pageNumber)}`, 195, 35, { align: 'right' });
    doc.text(`${lang === 'bm' ? 'Muka Surat' : 'Page'} ${pageNumber}`, 195, 39, { align: 'right' });
  };

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
  const xMealsStartActual = xMenu + colMenu;
  const xRM = xMealsStartActual + colMealsWidth;

  let currentY = 46;
  let currentPageNumber = 1;

  const drawMatrixHeader = (y: number) => {
    doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('ORDER DETAILS', xDate + (xMealsStartActual - xDate) / 2, y + 4.8, { align: 'center' });

    if (activeMeals.length > 0) {
      doc.line(xMealsStartActual, y, xMealsStartActual, y + 7);
      doc.text('PRICE PER UNIT (RM)', xMealsStartActual + colMealsWidth / 2, y + 4.8, { align: 'center' });
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
      centerText(shortLabel, xMealsStartActual + (i * 15), 15);
    });

    centerText('RM', xRM, colRM);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    [xQty, xNotes, xMenu, xMealsStartActual, ...activeMeals.map((_, i) => xMealsStartActual + i * 15), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  const drawSubtotalRow = (label: string, amount: number) => {
    doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
    doc.rect(15, currentY, 180, 7, 'F');
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
    const totalLabel = lang === 'bm' ? 'JUMLAH AMAUN / TOTAL AMOUNT' : 'TOTAL AMOUNT';
    drawSubtotalRow(totalLabel, currentPageTotal);
    pageTotals[currentPageNumber] = currentPageTotal;

    doc.addPage();
    currentPageNumber++;
    currentPageTotal = 0;
    drawPageHeader(currentPageNumber);
    currentY = 46;
    drawCreamBox(doc, 15, currentY, 180, 15, 'KEPADA / TO', recipientText, true);
    currentY += 15 + 5;
    currentY = drawMatrixHeader(currentY);
  };

  const checkPageBreak = (neededHeight: number) => {
    // Reserve room for this page's own TOTAL AMOUNT row (7mm) so it never
    // gets pushed onto the page after the one it belongs to.
    if (currentY + neededHeight + 7 > 265) {
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
    doc.rect(15, currentY, 180, rowHeight, 'F');

    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 180, rowHeight, 'S');

    [xQty, xNotes, xMenu, xMealsStartActual, ...activeMeals.map((_, i) => xMealsStartActual + i * 15), xRM].forEach(x => {
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
        doc.text(val.toFixed(2), xMealsStartActual + (i * 15) + 7.5, textY, { align: 'center' });
      } else {
        doc.setTextColor(cGrey[0], cGrey[1], cGrey[2]);
        doc.text('-', xMealsStartActual + (i * 15) + 7.5, textY, { align: 'center' });
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
  drawCreamBox(doc, 15, currentY, 180, 15, 'KEPADA / TO', recipientText, true);
  currentY += 15 + 5;
  currentY = drawMatrixHeader(currentY);

  orders.forEach(order => {
    currentPageTotal += drawOrderRow(order);
  });

  // Close out the final page (the loop above only closes pages that
  // overflow mid-way; the last page still needs its TOTAL AMOUNT row).
  const finalTotalLabel = lang === 'bm' ? 'JUMLAH AMAUN / TOTAL AMOUNT' : 'TOTAL AMOUNT';
  checkPageBreak(7); // make sure there's room; if not, this starts a new page with 0 total, which then gets the row below
  drawSubtotalRow(finalTotalLabel, currentPageTotal);
  pageTotals[currentPageNumber] = currentPageTotal;

  const lastContentY = currentY;
  const lastContentPageNumber = currentPageNumber;

  // Amount-in-words + disclaimer + bank details go on the last content
  // page, referencing that page's own total (not a cross-page grand total).
  currentY = lastContentY;
  const lastPageTotal = pageTotals[lastContentPageNumber];

  const spaceNeeded = 40;
  if (currentY + spaceNeeded > 265) {
    // Extremely rare edge case: last page's own total row left no room for
    // the amount-in-words/bank block. Start one more page for it, carrying
    // no new order rows — just the closing details for the last invoice.
    doc.addPage();
    currentPageNumber++;
    drawPageHeader(currentPageNumber);
    currentY = 46;
  }

  const textNoteY = currentY + 7;
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);

  if (isFinal && lastPageTotal > 0) {
    const spelledWords = numberToWords(lastPageTotal, lang).toUpperCase();
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

  const totalContentPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalContentPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(15, 280, 195, 280);
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Putrajaya  |  Est. 1986', 105, 285, { align: 'center' });
  }

  // --- Final summary page: lists every page's own invoice number + total,
  // plus a reference-only combined total across all pages for the admin's
  // own bookkeeping. This combined figure is explicitly NOT an official
  // "Grand Total" of one invoice — each page above is its own invoice. ---
  doc.addPage();
  doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RESTORAN WAWASAN — CONSOLIDATED INVOICE', 15, 20);

  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${lang === 'bm' ? 'Klien' : 'Client'}: ${clientName}`, 15, 24.5);

  const picHeaderY = 31;
  doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
  doc.rect(15, picHeaderY, 180, 7.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    lang === 'bm' ? 'RINGKASAN NO. INVOIS & JUMLAH SETIAP MUKA SURAT' : 'INVOICE NUMBER & TOTAL SUMMARY (PER PAGE)',
    18, picHeaderY + 5
  );

  let summaryY = picHeaderY + 7.5 + 6;
  doc.setFontSize(8.5);
  let combinedReferenceTotal = 0;
  for (let p = 1; p <= totalContentPages; p++) {
    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lang === 'bm' ? 'Muka Surat' : 'Page'} ${p}  —  ${pageInvoiceNumbers[p] || '-'}`, 18, summaryY);
    doc.setFont('helvetica', 'normal');
    const pTotal = pageTotals[p] || 0;
    doc.text(`RM ${pTotal.toFixed(2)}`, 160, summaryY, { align: 'right' });
    combinedReferenceTotal += pTotal;
    summaryY += 6;
  }

  summaryY += 3;
  doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(15, summaryY, 195, summaryY);
  summaryY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.text(
    lang === 'bm' ? 'Jumlah Rujukan Keseluruhan (bukan invois rasmi tunggal)' : 'Combined Reference Total (not a single official invoice)',
    18, summaryY
  );
  doc.text(`RM ${combinedReferenceTotal.toFixed(2)}`, 160, summaryY, { align: 'right' });
  summaryY += 10;

  const sigSectionY = summaryY + 14;
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

export default generateConsolidatedInvoicePDF;
