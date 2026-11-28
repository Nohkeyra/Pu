import { FieldValue } from 'firebase-admin/firestore';
import {
  allocateOfficialInvoiceNumbers,
  getFirestore,
} from '../firebaseAdmin.js';
import {
  CURRENT_INVOICE_LAYOUT,
  prepareInvoiceOrders,
  validateInvoiceGroup,
  type InvoiceBatch,
} from '../../src/lib/invoiceBatch.js';
import { planInvoicePages } from '../../src/services/invoiceBatchPdf.js';
export class ConsolidatedInvoiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function consolidatedOrderIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 100 ||
    value.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id))
  )
    throw new ConsolidatedInvoiceError('Select 1-100 valid order IDs.');
  return [...new Set(value as string[])].sort();
}
const OFFICIAL_INVOICE_NO = /^RW\d{5}$/;
const SAVED_INVOICE_NO = /^(?:RW\d{5}|RW [A-Z0-9_-]{1,90})$/;
export async function reserveConsolidatedNumber(actor: string): Promise<string> {
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const [invoiceNo] = await allocateOfficialInvoiceNumbers(tx, 1, [], 'invoice-batch');
    tx.set(db.collection('consolidated_invoices').doc(invoiceNo), {
      invoiceNo, state: 'reserved', actor, createdAt: FieldValue.serverTimestamp(),
    });
    return invoiceNo;
  });
}
export interface BatchSettings {
  includeNotes?: boolean;
  lang?: string;
  billingAddress?: string;
}
export async function readInvoiceBatch(invoiceNo: string): Promise<Record<string, any>> {
  if (!SAVED_INVOICE_NO.test(invoiceNo))
    throw new ConsolidatedInvoiceError('Invalid invoice number.');
  const data = (
    await getFirestore().collection('consolidated_invoices').doc(invoiceNo).get()
  ).data();
  if (data?.state !== 'committed')
    throw new ConsolidatedInvoiceError('Saved invoice not found.', 404);
  return data;
}
/** Snapshot and serials commit together. A retry returns the original pages unchanged. */
export async function commitConsolidatedInvoice(
  rawIds: unknown,
  rawNumber: unknown,
  actor: string,
  settings: BatchSettings = {}
) {
  const orderIds = consolidatedOrderIds(rawIds),
    invoiceNo = typeof rawNumber === 'string' ? rawNumber.trim().toUpperCase() : '';
  if (!SAVED_INVOICE_NO.test(invoiceNo))
    throw new ConsolidatedInvoiceError('A valid RW invoice number is required.');
  const db = getFirestore(),
    ref = db.collection('consolidated_invoices').doc(invoiceNo),
    registry = db.collection('invoice_numbers').doc(invoiceNo);
  return db.runTransaction(async (tx) => {
    const [existing, allocated] = await Promise.all([tx.get(ref), tx.get(registry)]);
    const previous = existing.data();
    if (previous?.state === 'committed') {
      if (JSON.stringify(previous.orderIds) !== JSON.stringify(orderIds))
        throw new ConsolidatedInvoiceError('This invoice belongs to a different selection.', 409);
      return previous as InvoiceBatch & { orderIds: string[] };
    }
    // A committed legacy batch can be reopened above, but never issue a new
    // invoice using a legacy number, a client-chosen serial or an individual reservation.
    if (!OFFICIAL_INVOICE_NO.test(invoiceNo))
      throw new ConsolidatedInvoiceError('Reserve a new RWxxxxx invoice number before confirming.', 409);
    if (previous?.state !== 'reserved' || allocated.data()?.purpose !== 'invoice-batch')
      throw new ConsolidatedInvoiceError('Reserve a valid consolidated invoice number before confirming.', 409);
    if (previous.actor !== actor)
      throw new ConsolidatedInvoiceError('This number is reserved by another account.', 409);
    const refs = orderIds.map((id) => db.collection('orders').doc(id)),
      snaps = await Promise.all(refs.map((orderRef) => tx.get(orderRef)));
    if (snaps.some((snap) => !snap.exists || snap.data()?.deletedByAdmin))
      throw new ConsolidatedInvoiceError('One or more selected orders are unavailable.', 409);
    for (const field of ['invoiceNo', 'officialInvoiceNo', 'consolidatedInvoiceNo', 'invoiceBatchNo'])
      if (!(await tx.get(db.collection('orders').where(field, '==', invoiceNo).limit(1))).empty)
        throw new ConsolidatedInvoiceError('This invoice number belongs to an existing invoice.', 409);
    const rawOrders = snaps.map((snap) => ({ ...snap.data(), id: snap.id }) as Record<string, any>);
    if (rawOrders.some((order) => order.invoiceBatchNo || order.consolidatedInvoiceNo))
      throw new ConsolidatedInvoiceError(
        'An order already belongs to a saved invoice. Reopen it instead.',
        409
      );
    if (
      rawOrders.some(
        (order) =>
          !['billed', 'approved', 'in_transit', 'delivered', 'completed'].includes(
            String(order.status)
          )
      )
    )
      throw new ConsolidatedInvoiceError(
        'Only confirmed orders with final prices can be invoiced.'
      );
    let batch: Omit<InvoiceBatch, 'pages'>;
    let plan: ReturnType<typeof planInvoicePages>;
    try {
      const recipient = validateInvoiceGroup(rawOrders, settings.billingAddress);
      const orders = prepareInvoiceOrders(rawOrders);
      batch = {
        invoiceNo,
        orders,
        recipient,
        includeNotes: settings.includeNotes === true,
        lang: settings.lang === 'en' ? 'en' : 'bm',
        issuedAt: new Date().toISOString(),
        layoutVersion: CURRENT_INVOICE_LAYOUT,
      };
      plan = planInvoicePages(orders, batch);
    } catch (error) {
      throw new ConsolidatedInvoiceError(
        error instanceof Error ? error.message : 'Invalid invoice selection.'
      );
    }
    // All remaining reads happen in this allocator, before any transaction writes.
    const extra =
      plan.length > 1
        ? await allocateOfficialInvoiceNumbers(tx, plan.length - 1, [invoiceNo], 'invoice-batch')
        : [];
    const numbers = [invoiceNo, ...extra],
      pages = plan.map((page, i) => ({ ...page, invoiceNo: numbers[i] }));
    const saved = {
      ...batch,
      pages,
      orderIds,
      actor,
      state: 'committed',
      committedAt: FieldValue.serverTimestamp(),
    };
    tx.set(ref, saved);
    numbers.forEach((number) =>
      tx.set(
        db.collection('invoice_numbers').doc(number),
        { purpose: 'invoice-batch', batchNo: invoiceNo, createdAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
    );
    refs.forEach((orderRef) =>
      tx.update(orderRef, {
        invoiceBatchNo: invoiceNo,
        consolidatedInvoiceNo: pages.find((page) => page.orderIds.includes(orderRef.id))!.invoiceNo,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    return saved;
  });
}
