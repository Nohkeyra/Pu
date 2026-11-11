import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { inflateSync } from 'node:zlib';
import { createInvoiceTableLayout } from './invoiceBatchTable';
import { planInvoicePages, renderInvoiceBatch } from './invoiceBatchPdf';
const options = {recipient:{company:'Example',address:'Example address',email:'example@example.invalid'},includeNotes:true,lang:'en' as const,issuedAt:'2026-11-11T04:00:00Z'};
const order = {id:'one',date:'2026-11-11',quantity:10,menu:'Example menu',notes:'Example notes',meals:['breakfast','lunch','hi_tea'],prices:{breakfast:8,lunch:20,hi_tea:8},totalAmount:360};
const text = (doc:jsPDF) => {
  const raw=doc.output();let result=raw;
  for(const match of raw.matchAll(/stream\n([\s\S]*?)\nendstream/g)) {
    try{result+=inflateSync(Buffer.from(match[1],'latin1')).toString('latin1');}catch{/* image streams */}
  }
  return result;
};
describe('Reference invoice table and signature',()=>{
  it('maps unit prices and meal totals into separate columns without changing saved totals',()=>{
    const data=createInvoiceTableLayout(new jsPDF(),[order],options);
    expect(data.rows[0].lines.slice(5).map(lines=>lines.join(''))).toEqual(['8.00','20.00','8.00','80.00','200.00','80.00','360.00']);
    expect(data.widths.reduce((sum,n)=>sum+n,0)).toBeCloseTo(267);
  });
  it('preserves missing prices and legacy meal aliases',()=>{
    const data=createInvoiceTableLayout(new jsPDF(),[{...order,meals:['tea_break'],prices:{tea_break:8}}],options);
    expect(data.rows[0].lines[7]).toEqual(['8.00']);
    expect(data.rows[0].lines[10]).toEqual(['80.00']);
    const missing=createInvoiceTableLayout(new jsPDF(),[{...order,prices:{}}],options);
    expect(missing.rows[0].lines[5]).toEqual(['-']);
    expect(missing.rows[0].lines[11]).toEqual(['360.00']);
  });
  it('plans multiple pages and reserves the signature area on every new page',()=>{
    const orders=Array.from({length:25},(_,i)=>({...order,id:`item-${i}`}));
    const plan=planInvoicePages(orders,options);
    const pages=plan.map((page,i)=>({...page,invoiceNo:`RW EXAMPLE-${i}`}));
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap(page=>page.orderIds)).toEqual(orders.map(item=>item.id));
    expect(pages.reduce((sum,page)=>sum+page.totalCents,0)).toBe(900000);
    const doc=renderInvoiceBatch(orders,{...options,pages,layoutVersion:3});
    const content=text(doc);
    expect(doc.getNumberOfPages()).toBe(pages.length);
    expect(content.match(/\(Pak Usop\)/g)).toHaveLength(pages.length);
    expect(content).toContain('TOTAL AMOUNT');
    expect(content).toContain('DAY TOTAL');
  });
  it('retains the historical version 2 table and pagination',()=>{
    const oldOptions={...options,layoutVersion:2 as const};
    const pages=planInvoicePages([order],oldOptions).map(page=>({...page,invoiceNo:'RW OLD'}));
    const content=text(renderInvoiceBatch([order],{...oldOptions,pages}));
    expect(content).toContain('THIS INVOICE TOTAL');
    expect(content).not.toContain('(Pak Usop)');
  });
});
