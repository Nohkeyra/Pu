import { createHash, randomUUID } from 'crypto';
import path from 'path';
import { getFirestore } from '../firebaseAdmin.js';
import { invoiceEmailTemplate } from './invoiceEmailTemplate.js';
import {
  generatePersistedConsolidatedInvoicePdf,
  generateServerInvoicePdf,
} from './serverPdfService.js';
import { readInvoiceBatch, ConsolidatedInvoiceError } from './consolidatedInvoices.js';
import {
  buildPetronasInvoiceSubject,
  getVerifiedOrderCompanyCode,
} from '../../src/lib/petronasAutofill.js';

const CHUNK_SIZE = 360_000,
  MAX_PDF_SIZE = 16_000_000,
  MAX_COLLECTOR_TOTAL_BYTES = 20 * 1024 * 1024,
  MAX_SUPPORTING_FILES = 10,
  FIRESTORE_BATCH_OPS = 15,
  PREVIEWS = 'invoice_email_previews',
  CHUNKS = 'invoice_email_preview_chunks';

export interface PreviewAttachmentMeta {
  filename: string;
  byteLength: number;
  sha256: string;
  chunkPrefix: string;
  chunkCount: number;
}

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function previewRef(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new ConsolidatedInvoiceError('Invalid preview ID.');
  return getFirestore().collection(PREVIEWS).doc(id);
}

function sanitizePdfFilename(raw: string, fallbackIndex: number): string {
  const base = path.basename(String(raw || '').trim()).replace(/[^A-Za-z0-9._-]/g, '_');
  if (!base || !/\.pdf$/i.test(base)) {
    return `Supporting_${fallbackIndex + 1}.pdf`;
  }
  return base.slice(0, 120);
}

function parseSupportingFiles(
  rawFiles: unknown,
  mainFilename: string
): Array<{ filename: string; bytes: Buffer }> {
  if (rawFiles === undefined || rawFiles === null) return [];
  if (!Array.isArray(rawFiles)) {
    throw new ConsolidatedInvoiceError('supportingFiles must be an array of PDF files.');
  }
  if (rawFiles.length > MAX_SUPPORTING_FILES) {
    throw new ConsolidatedInvoiceError(
      `At most ${MAX_SUPPORTING_FILES} supporting PDF files are allowed.`
    );
  }

  const usedNames = new Set<string>([mainFilename.toLowerCase()]);
  const parsed: Array<{ filename: string; bytes: Buffer }> = [];

  for (let i = 0; i < rawFiles.length; i++) {
    const item = rawFiles[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      throw new ConsolidatedInvoiceError(`Supporting attachment #${i + 1} is invalid.`);
    }
    const rawName = typeof item.filename === 'string' ? item.filename.trim() : '';
    if (!rawName || !/\.pdf$/i.test(rawName)) {
      throw new ConsolidatedInvoiceError(
        `Only .pdf attachments are supported in PETRONAS collector mode (invalid file: "${rawName || `#${i + 1}`}"). ZIP archives and other formats are not allowed.`
      );
    }

    const base64Raw = typeof item.contentBase64 === 'string' ? item.contentBase64.trim() : '';
    const cleanedBase64 = base64Raw.includes('base64,')
      ? base64Raw.slice(base64Raw.indexOf('base64,') + 7)
      : base64Raw;
    if (!cleanedBase64) {
      throw new ConsolidatedInvoiceError(`Supporting PDF "${rawName}" has no content.`);
    }

    const bytes = Buffer.from(cleanedBase64, 'base64');
    if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new ConsolidatedInvoiceError(
        `Supporting file "${rawName}" is not a valid PDF document (missing %PDF- signature).`
      );
    }

    let safeName = sanitizePdfFilename(rawName, i);
    if (usedNames.has(safeName.toLowerCase())) {
      const stem = safeName.replace(/\.pdf$/i, '');
      safeName = `${stem}_${i + 1}.pdf`;
    }
    usedNames.add(safeName.toLowerCase());
    parsed.push({ filename: safeName, bytes });
  }

  return parsed;
}

async function commitWriteOps(
  db: FirebaseFirestore.Firestore,
  ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>
): Promise<void> {
  for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_OPS) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + FIRESTORE_BATCH_OPS)) {
      op(batch);
    }
    await batch.commit();
  }
}

export async function createInvoiceEmailPreview(
  input: {
    orderId?: unknown;
    batchNo?: unknown;
    email?: unknown;
    lang?: unknown;
    submissionMode?: unknown;
    collectorEligible?: unknown;
    supportingFiles?: unknown;
  },
  actor: string
) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ConsolidatedInvoiceError('A valid recipient email is required.');

  const submissionMode =
    input.submissionMode === 'petronas_collector' ? 'petronas_collector' : 'standard';

  const db = getFirestore(),
    lang = input.lang === 'en' ? 'en' : 'bm';
  let pdf: Buffer = Buffer.alloc(0),
    company = '',
    invoiceNumbers: string[] = [],
    total = NaN,
    orderId = '',
    batchNo = '',
    orderData: Record<string, any> | undefined;

  if (typeof input.batchNo === 'string' && input.batchNo) {
    batchNo = input.batchNo;
  } else {
    orderId = typeof input.orderId === 'string' ? input.orderId : '';
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(orderId))
      throw new ConsolidatedInvoiceError('Order is required.');
    const snap = await db.collection('orders').doc(orderId).get(),
      order = snap.data();
    if (!order || order.deletedByAdmin) throw new ConsolidatedInvoiceError('Order not found.', 404);
    orderData = { ...order, id: snap.id };
    if (order.invoiceBatchNo) batchNo = order.invoiceBatchNo;
    else {
      const validIndividualNo = Boolean(
        order.invoiceNo && /^RW(?:\s|\d)/.test(String(order.invoiceNo))
      );
      if (
        !validIndividualNo ||
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
    if (submissionMode === 'petronas_collector') {
      throw new ConsolidatedInvoiceError(
        'PETRONAS Email Collector mode only accepts single individual invoices, not consolidated batches.'
      );
    }
    const batch = await readInvoiceBatch(batchNo);
    pdf = await generatePersistedConsolidatedInvoicePdf(batch, { includeNotes: false, lang });
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

  const mainFilename = `Invoice_${invoiceNumbers[0].replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
  let subjectOverride: string | undefined;
  let verifiedCompanyCode = '';
  let supportingParsed: Array<{ filename: string; bytes: Buffer }> = [];

  if (submissionMode === 'petronas_collector') {
    if (input.collectorEligible !== true) {
      throw new ConsolidatedInvoiceError(
        'Confirm that this order is eligible for PETRONAS Email Collector (not under SMART by GEP or SUS PO).'
      );
    }
    if (!orderData || batchNo || invoiceNumbers.length !== 1) {
      throw new ConsolidatedInvoiceError(
        'PETRONAS Email Collector mode only accepts a single individual invoice.'
      );
    }
    const primaryInvoiceNo = String(invoiceNumbers[0] || '').trim();
    if (!/^RW\d{5}$/.test(primaryInvoiceNo)) {
      throw new ConsolidatedInvoiceError(
        'PETRONAS Email Collector mode requires an individual invoice number in RWxxxxx format (e.g. RW00001).'
      );
    }
    verifiedCompanyCode = getVerifiedOrderCompanyCode({
      to: orderData.to,
      company: orderData.company,
      companyCode: orderData.companyCode,
    });
    if (!/^\d{4}$/.test(verifiedCompanyCode)) {
      throw new ConsolidatedInvoiceError(
        'Verified 4-digit PETRONAS company code matching a legal PETRONAS entity is required for collector mode.'
      );
    }
    supportingParsed = parseSupportingFiles(input.supportingFiles, mainFilename);
    subjectOverride = buildPetronasInvoiceSubject(verifiedCompanyCode, primaryInvoiceNo);
  } else if (Array.isArray(input.supportingFiles) && input.supportingFiles.length > 0) {
    throw new ConsolidatedInvoiceError(
      'Supporting PDF attachments are only supported in PETRONAS Email Collector mode.'
    );
  }

  const totalBytes =
    pdf.length + supportingParsed.reduce((sum, file) => sum + file.bytes.length, 0);
  if (totalBytes > MAX_COLLECTOR_TOTAL_BYTES) {
    throw new ConsolidatedInvoiceError(
      `Combined PDF attachment size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the 20 MB email limit.`
    );
  }

  const id = randomUUID();
  const mainChunks: string[] = [];
  for (let offset = 0; offset < pdf.length; offset += CHUNK_SIZE)
    mainChunks.push(pdf.subarray(offset, offset + CHUNK_SIZE).toString('base64'));

  const attachmentsMeta: PreviewAttachmentMeta[] = [
    {
      filename: mainFilename,
      byteLength: pdf.length,
      sha256: digest(pdf),
      chunkPrefix: id,
      chunkCount: mainChunks.length,
    },
  ];

  const chunkEntries: Array<{ docId: string; chunk: string }> = mainChunks.map((chunk, index) => ({
    docId: `${id}_${index}`,
    chunk,
  }));

  supportingParsed.forEach((file, attIdx) => {
    const attChunks: string[] = [];
    for (let offset = 0; offset < file.bytes.length; offset += CHUNK_SIZE)
      attChunks.push(file.bytes.subarray(offset, offset + CHUNK_SIZE).toString('base64'));
    const prefix = `${id}_att_${attIdx}`;
    attachmentsMeta.push({
      filename: file.filename,
      byteLength: file.bytes.length,
      sha256: digest(file.bytes),
      chunkPrefix: prefix,
      chunkCount: attChunks.length,
    });
    attChunks.forEach((chunk, chunkIdx) => {
      chunkEntries.push({ docId: `${prefix}_${chunkIdx}`, chunk });
    });
  });

  const envelope = invoiceEmailTemplate({
    company,
    invoiceNumbers,
    total,
    lang,
    subjectOverride,
    submissionMode,
    companyCode: verifiedCompanyCode || undefined,
  });

  const data = {
    actor,
    email,
    ...envelope,
    filename: mainFilename,
    invoiceNumbers,
    total,
    company,
    lang,
    orderId,
    batchNo,
    submissionMode,
    companyCode: verifiedCompanyCode,
    totalBytes,
    attachmentsMeta,
    chunkCount: mainChunks.length,
    sha256: digest(pdf),
    status: 'draft',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [
    (batch) => batch.set(previewRef(id), data),
    ...chunkEntries.map(
      (entry) => (batch: FirebaseFirestore.WriteBatch) =>
        batch.set(db.collection(CHUNKS).doc(entry.docId), { chunk: entry.chunk })
    ),
  ];
  await commitWriteOps(db, ops);

  return {
    id,
    ...data,
    attachments: attachmentsMeta.map(({ filename, byteLength }) => ({ filename, byteLength })),
  };
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

async function readChunkedPdf(
  db: FirebaseFirestore.Firestore,
  chunkPrefix: string,
  chunkCount: number,
  expectedSha256: string
): Promise<Buffer> {
  const snaps = await db.getAll(
    ...Array.from({ length: chunkCount }, (_, index) =>
      db.collection(CHUNKS).doc(`${chunkPrefix}_${index}`)
    )
  );
  if (snaps.some((snap) => typeof snap.data()?.chunk !== 'string'))
    throw new Error('Invoice preview attachment is incomplete.');
  const bytes = Buffer.concat(snaps.map((snap) => Buffer.from(snap.data()!.chunk, 'base64')));
  if (digest(bytes) !== expectedSha256)
    throw new Error('Invoice preview attachment integrity check failed.');
  return bytes;
}

export async function readInvoicePreviewPdf(
  id: string,
  actor?: string,
  allowQueued = false
): Promise<Buffer> {
  const data = await readInvoiceEmailPreview(id, actor, allowQueued),
    db = getFirestore();
  return readChunkedPdf(db, id, data.chunkCount, data.sha256);
}

export async function readInvoicePreviewAttachments(
  id: string,
  actor?: string,
  allowQueued = false
): Promise<Array<{ filename: string; content: Buffer; contentType: 'application/pdf' }>> {
  const data = await readInvoiceEmailPreview(id, actor, allowQueued),
    db = getFirestore();
  const metaList = Array.isArray(data.attachmentsMeta)
    ? (data.attachmentsMeta as PreviewAttachmentMeta[])
    : null;
  if (!metaList || metaList.length === 0) {
    const main = await readChunkedPdf(db, id, data.chunkCount, data.sha256);
    return [
      {
        filename: data.filename || 'Invoice.pdf',
        content: main,
        contentType: 'application/pdf',
      },
    ];
  }

  const ordered: Array<{ filename: string; content: Buffer; contentType: 'application/pdf' }> = [];
  for (const meta of metaList) {
    const content = await readChunkedPdf(db, meta.chunkPrefix, meta.chunkCount, meta.sha256);
    ordered.push({
      filename: meta.filename,
      content,
      contentType: 'application/pdf',
    });
  }
  return ordered;
}

export async function cleanExpiredInvoicePreviews(): Promise<void> {
  const db = getFirestore(),
    snaps = await db.collection(PREVIEWS).where('expiresAt', '<', Date.now()).limit(10).get();
  for (const snap of snaps.docs) {
    const data = snap.data();
    if (!['draft', 'delivered'].includes(data.status)) continue;
    const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [
      (batch) => batch.delete(snap.ref),
    ];
    if (Array.isArray(data.attachmentsMeta) && data.attachmentsMeta.length > 0) {
      for (const meta of data.attachmentsMeta as PreviewAttachmentMeta[]) {
        for (let i = 0; i < meta.chunkCount; i++) {
          ops.push((batch) => batch.delete(db.collection(CHUNKS).doc(`${meta.chunkPrefix}_${i}`)));
        }
      }
    } else {
      for (let i = 0; i < data.chunkCount; i++) {
        ops.push((batch) => batch.delete(db.collection(CHUNKS).doc(`${snap.id}_${i}`)));
      }
    }
    await commitWriteOps(db, ops);
  }
}
