import type { jsPDF } from 'jspdf';
import { invoiceAmountCents, invoiceDate, type InvoiceRecord, type InvoicePage } from '../lib/invoiceBatch';
import { getBMWordsAmount, getENWordsAmount } from './numberToWordsBM';
import { drawInvoiceBankDetails, drawInvoiceContactLinks, INVOICE_CONTACT } from './invoicePdfBrand';
import { INVOICE_BUSINESS } from '../constants/invoiceBusiness';
import type { BatchPdfOptions } from './invoiceBatchPdf';

// The approved A4 landscape master specifies these eight column widths in points.
const pt = 72 / 25.4;
const widths = [69, 34, 105, 259.85, 69, 69, 69, 82].map(v => v / pt);
const xs = widths.reduce((a, w) => [...a, a[a.length - 1] + w], [15]);
const right = xs[xs.length - 1];
const bodyPt = 9, lineMM = 3.8, headerH = 34 / pt, totalH = 23 / pt;
const bottom = 137; // total + words + original signature must finish before bank at 175mm.
const mealNames: Record<string, [string, string]> = {
  breakfast: ['Sarapan','Breakfast'], lunch: ['Tengah hari','Lunch'],
  hi_tea: ['Minum petang','Hi-tea'], tea_break: ['Rehat','Tea break'],
  hi_tea_break: ['Minum petang','Hi-tea break'], dinner: ['Makan malam','Dinner'],
};
const canonical = (key: string) => ['tea_break','hi_tea_break'].includes(key) ? 'hi_tea' : key;
const money = (n: number) => n.toFixed(2);
const normalMeals = ['breakfast','lunch','hi_tea'];
export function refinedBatchLayout(doc: jsPDF, orders: InvoiceRecord[], options: BatchPdfOptions) {
  const bm = options.lang === 'bm', t = (a: string,b: string) => bm ? a : b;
  doc.setFont('helvetica','normal');
  doc.setFontSize(bodyPt);
  const recipientLines = [options.recipient.company,options.recipient.address,options.recipient.email]
    .flatMap(value => doc.splitTextToSize(value, right-15-8) as string[]);
  const recipientHeight = Math.max(49/pt, 9+recipientLines.length*lineMM);
  const tableY = 40+recipientHeight+4;
  const rows = orders.map(order => {
    const keys = [...new Set([...(order.meals || []), ...Object.keys(order.prices || {})])];
    const details: string[] = [order.menu || '-'];
    const rate = (key: string) => {
      const value = order.prices?.[key];
      return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
    };
    const label = (key: string) => mealNames[key]?.[bm?0:1] || key;
    const rates = normalMeals.map(key => {
      const matches = keys.filter(k => canonical(k) === key);
      if (matches.length === 1 && rate(matches[0]) != null) return money(rate(matches[0])!);
      // Multiple aliases must remain individually visible; don't collapse distinct prices.
      for (const match of matches) details.push(label(match)+': '+(rate(match)==null?'-':'RM '+money(rate(match)!)+' / pax'));
      return '-';
    });
    for (const key of keys.filter(k=>!normalMeals.includes(canonical(k)))) {
      details.push(label(key)+': '+(rate(key)==null?'-':'RM '+money(rate(key)!)+' / pax'));
    }
    if (Number(order.deliveryCharge)>0) details.push(t('Caj Penghantaran','Delivery Charge')+': RM '+money(Number(order.deliveryCharge)));
    if (Number(order.serviceChargeAmount)>0) details.push(t('Caj Perkhidmatan','Service Charge')+': RM '+money(Number(order.serviceChargeAmount)));
    const cells = [invoiceDate(order.eventDate||order.date||order.dateTime),String(order.quantity??order.guests??order.pax??0),
      options.includeNotes ? order.notes||'-' : '-', details.join('\n'),...rates,money(invoiceAmountCents(order)/100)];
    const lines = cells.map((value,i)=>doc.splitTextToSize(value,widths[i]-3) as string[]);
    const height = Math.max(12, Math.max(...lines.map(v=>v.length))*lineMM+3.5);
    if (tableY+headerH+height>bottom) throw new Error(t('Menu/catatan atau alamat bil melebihi satu halaman; pendekkan atau asingkan pesanan sebelum menjana invois.','Notes, menu or billing address exceed one page; shorten or separate the order before issuing the invoice.'));
    return {order,lines,height};
  });
  return {recipientLines,recipientHeight,tableY,rows};
}
export function planRefinedBatch(doc:jsPDF,orders:InvoiceRecord[],options:BatchPdfOptions):Array<Omit<InvoicePage,'invoiceNo'>> {
  const data=refinedBatchLayout(doc,orders,options),pages:Array<Omit<InvoicePage,'invoiceNo'>>=[];
  let page={orderIds:[] as string[],totalCents:0}, y=data.tableY+headerH;
  for(const row of data.rows){
    if(!row.order.id)throw new Error('Order ID required.');
    if(page.orderIds.length&&y+row.height>bottom){pages.push(page);page={orderIds:[],totalCents:0};y=data.tableY+headerH;}
    page.orderIds.push(row.order.id);page.totalCents+=invoiceAmountCents(row.order);y+=row.height;
  }
  if(page.orderIds.length)pages.push(page);
  return pages;
}
/** Draw only dynamic content; server embeds the exact approved vector header and signature. */
export function drawRefinedBatch(doc:jsPDF,orders:InvoiceRecord[],options:BatchPdfOptions):number[] {
  const pages=options.pages;
  if(!pages?.length || !orders.length)throw new Error('Saved invoice page numbers are required.');
  if(new Set(pages.map(p=>p.invoiceNo)).size!==pages.length)throw new Error('Each page needs a distinct invoice number.');
  if(pages.some(p=>!/^RW\d{5}$/.test(p.invoiceNo)))throw new Error('Each page requires an official RWxxxxx number.');
  const data=refinedBatchLayout(doc,orders,options);
  const bm=options.lang==='bm',t=(a:string,b:string)=>bm?a:b;
  const expected=planRefinedBatch(doc,orders,options);
  if(JSON.stringify(pages.map(({orderIds,totalCents})=>({orderIds,totalCents})))!==JSON.stringify(expected))
    throw new Error('Saved refined invoice page plan mismatch.');
  const signatureTops:number[]=[];
  pages.forEach((page,index)=>{
    if(index)doc.addPage();
    doc.setFillColor(249,247,242);doc.setDrawColor(214,204,184);doc.setLineWidth(.19);
    doc.rect(15,40,right-15,data.recipientHeight,'FD');
    doc.setTextColor(110,74,19);doc.setFont('helvetica','bold');doc.setFontSize(8);
    doc.text(t('KEPADA','BILL TO'),19,45);
    doc.setFont('helvetica','normal');doc.setFontSize(bodyPt);doc.setTextColor(35,30,25);
    data.recipientLines.forEach((v,i)=>doc.text(v,19,49+i*lineMM));
    let y=data.tableY;
    const headings=[t('MAKLUMAT','DETAILS'),t('HARGA / PAX (RM)','PRICE / PAX (RM)'),t('JUMLAH','TOTAL')];
    const groups=[[0,4],[4,7],[7,8]];
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(255,255,255);
    groups.forEach(([a,b],i)=>{doc.setFillColor(166,122,33);doc.rect(xs[a],y,xs[b]-xs[a],16/pt,'FD');doc.text(headings[i],(xs[a]+xs[b])/2,y+3.7,{align:'center'});});
    y+=16/pt;
    const labels=[t('Tarikh','Date'),'Pax',t('Catatan','Notes'),'Menu',...normalMeals.map(k=>mealNames[k][bm?0:1]),'RM'];
    labels.forEach((label,i)=>{doc.setFillColor(110,74,19);doc.rect(xs[i],y,widths[i],18/pt,'FD');doc.setFontSize(7.5);doc.text(label,(xs[i]+xs[i+1])/2,y+4.3,{align:'center'});});
    y+=18/pt;
    for(const id of page.orderIds){
      const row=data.rows.find(r=>r.order.id===id)!;
      doc.setFont('helvetica','normal');doc.setFontSize(bodyPt);doc.setTextColor(35,30,25);
      row.lines.forEach((values,i)=>{
        doc.setFillColor(249,247,242);doc.rect(xs[i],y,widths[i],row.height,'FD');
        const align=i>=4?'right':i===1?'center':'left';
        const x=i>=4?xs[i+1]-1.5:i===1?(xs[i]+xs[i+1])/2:xs[i]+1.5;
        values.forEach((v,j)=>doc.text(v,x,y+4+j*lineMM,{align}));
      });
      y+=row.height;
    }
    doc.setFillColor(110,74,19);doc.rect(15,y,right-15,totalH,'F');doc.line(xs[7],y,xs[7],y+totalH);
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);
    doc.text(t('JUMLAH KESELURUHAN','GRAND TOTAL'),19,y+5.3);
    doc.setFontSize(10);doc.text('RM '+money(page.totalCents/100),right-3,y+5.3,{align:'right'});
    y+=totalH;
    doc.setTextColor(110,74,19);doc.setFontSize(9);
    const label='RINGGIT MALAYSIA :', wordX=15+doc.getTextWidth(label)+1.5;
    const words=(bm?getBMWordsAmount(page.totalCents/100):getENWordsAmount(page.totalCents/100)).toUpperCase()+t(' SAHAJA.',' ONLY.');
    const lines=doc.splitTextToSize(words,233-wordX) as string[];
    if(y+4+lines.length*lineMM>175)throw new Error('Amount in words exceeds available space.');
    doc.text(label,15,y+4);lines.forEach((v,i)=>doc.text(v,wordX,y+4+i*lineMM));
    signatureTops.push(y+1);
    drawInvoiceBankDetails(doc,options.bank||INVOICE_BUSINESS.bank,options.lang);
    drawInvoiceContactLinks(doc,197,297);
    doc.setDrawColor(194,147,45);doc.line(15,201,right,201);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(110,98,84);
    doc.text(INVOICE_CONTACT.address,15,206);
    doc.link(15,202.5,210,5,{url:INVOICE_CONTACT.maps});
    doc.text(t('Halaman','Page')+' '+(index+1)+' / '+pages.length,right,206,{align:'right'});
  });
  return signatureTops;
}
