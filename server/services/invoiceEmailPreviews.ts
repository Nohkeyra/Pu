import { createHash, randomUUID } from 'crypto';
import { getFirestore } from '../firebaseAdmin.js';
import { invoiceEmailTemplate } from './invoiceEmailTemplate.js';
import {
  generateSavedInvoicePdf,
  generateServerConsolidatedInvoicePdf,
  generateServerInvoicePdf,
} from './serverPdfService.js';
import { readInvoiceBatch, ConsolidatedInvoiceError } from './consolidatedInvoices.js';
import type { InvoiceBatch } from '../../src/lib/invoiceBatch.js';
const CHUNK_SIZE = 360_000,
  MAX_PDF_SIZE = 16_000_000,
  PREVIEWS = 'invoice_email_previews',
  CHUNKS = 'invoice_email_preview_chunks';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
function previewRef(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new ConsolidatedInvoiceError('Invalid preview ID.');
  return getFirestore().collection(PREVIEWS).doc(id);
}
export async function createInvoiceEmailPreview(
  input: { orderId?: unknown; batchNo?: unknown; email?: unknown; lang?: unknown },
  actor: string
) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ConsolidatedInvoiceError('A valid recipient email is required.');
  const db = getFirestore(),
    lang = input.lang === 'en' ? 'en' : 'bm';
  let pdf: Buffer = Buffer.alloc(0),
    company = '',
    invoiceNumbers: string[] = [],
    total = NaN,
    orderId = '',
    batchNo = '';
  if (typeof input.batchNo === 'string' && input.batchNo) batchNo = input.batchNo;
  else {
    orderId = typeof input.orderId === 'string' ? input.orderId : '';
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(orderId))
      throw new ConsolidatedInvoiceError('Order is required.');
    const snap = await db.collection('orders').doc(orderId).get(),
      order = snap.data();
    if (!order || order.deletedByAdmin) throw new ConsolidatedInvoiceError('Order not found.', 404);
    if (order.invoiceBatchNo) batchNo = order.invoiceBatchNo;
    else {
      if (
        !order.invoiceNo?.startsWith('RW ') ||
        order.totalAmount == null ||
        !['billed', 'in_transit', 'delivered', 'completed'].includes(order.status)
      )
        throw new ConsolidatedInvoiceError('A final invoice with confirmed prices is required.');
      pdf = await generateServerInvoicePdf({ ...order, id: snap.id, lang }, true);
      company = order.to || order.name || '';
      invoiceNumbers = [order.officialInvoiceNo || order.invoiceNo];
      total = Number(order.totalAmount);
    }
  }
  if (batchNo) {
    const batch = await readInvoiceBatch(batchNo);
    pdf =
      batch.layoutVersion === 2
        ? await generateSavedInvoicePdf(batch as InvoiceBatch)
        : await generateServerConsolidatedInvoicePdf(batch.orders, batch.invoiceNo, false, lang);
    company = batch.recipient?.company || batch.orders[0]?.to || '';
    invoiceNumbers = batch.pages?.map((page: { invoiceNo: string }) => page.invoiceNo) || [
      batch.invoiceNo,
    ];
    total =
      batch.pages?.reduce(
        (sum: number, page: { totalCents: number }) => sum + page.totalCents / 100,
        0
      ) ??
      batch.orders.reduce(
        (sum: number, order: { totalAmount?: number }) => sum + Number(order.totalAmount || 0),
        0
      );
  }
  if (!pdf.length || pdf.length > MAX_PDF_SIZE || !Number.isFinite(total))
    throw new ConsolidatedInvoiceError('Unable to prepare a valid PDF attachment.');
  const id = randomUUID(),
    chunks: string[] = [];
  for (let offset = 0; offset < pdf.length; offset += CHUNK_SIZE)
    chunks.push(pdf.subarray(offset, offset + CHUNK_SIZE).toString('base64'));
  const envelope = invoiceEmailTemplate({ company, invoiceNumbers, total, lang }),
    filename = `Invoice_${invoiceNumbers[0].replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
  const data = {
    actor,
    email,
    ...envelope,
    filename,
    invoiceNumbers,
    total,
    company,
    lang,
    orderId,
    batchNo,
    chunkCount: chunks.length,
    sha256: digest(pdf),
    status: 'draft',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  const write = db.batch();
  write.set(previewRef(id), data);
  chunks.forEach((chunk, index) =>
    write.set(db.collection(CHUNKS).doc(`${id}_${index}`), { chunk })
  );
  await write.commit();
  return { id, ...data };
}
export async function readInvoiceEmailPreview(id: string, actor?: string, allowQueued = false) {
  const data = (await previewRef(id).get()).data();
  if (!data || (actor && data.actor !== actor))
    throw new ConsolidatedInvoiceError('Preview not found.', 404);
  if (
    data.expiresAt < Date.now() &&
    !(allowQueued && ['queued', 'delivered'].includes(data.status))
  )
    throw new ConsolidatedInvoiceError('Preview expired. Prepare a fresh preview.', 410);
  return data;
}
export async function readInvoicePreviewPdf(
  id: string,
  actor?: string,
  allowQueued = false
): Promise<Buffer> {
  const data = await readInvoiceEmailPreview(id, actor, allowQueued),
    db = getFirestore();
  const snaps = await db.getAll(
    ...Array.from({ length: data.chunkCount }, (_, index) =>
      db.collection(CHUNKS).doc(`${id}_${index}`)
    )
  );
  if (snaps.some((snap) => typeof snap.data()?.chunk !== 'string'))
    throw new Error('Invoice preview attachment is incomplete.');
  const bytes = Buffer.concat(snaps.map((snap) => Buffer.from(snap.data()!.chunk, 'base64')));
  if (digest(bytes) !== data.sha256)
    throw new Error('Invoice preview attachment integrity check failed.');
  return bytes;
}
export async function cleanExpiredInvoicePreviews(): Promise<void> {
  const db = getFirestore(),
    snaps = await db.collection(PREVIEWS).where('expiresAt', '<', Date.now()).limit(10).get();
  for (const snap of snaps.docs) {
    const data = snap.data();
    if (!['draft', 'delivered'].includes(data.status)) continue;
    const write = db.batch();
    write.delete(snap.ref);
    for (let i = 0; i < data.chunkCount; i++)
      write.delete(db.collection(CHUNKS).doc(`${snap.id}_${i}`));
    await write.commit();
  }
}
