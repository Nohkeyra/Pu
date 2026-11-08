import { FieldValue } from 'firebase-admin/firestore';
import { generateSequentialInvoiceNo, getFirestore } from '../firebaseAdmin.js';

export class ConsolidatedInvoiceError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function consolidatedOrderIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100 ||
    value.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id))) {
    throw new ConsolidatedInvoiceError('Select 1–100 valid order IDs.');
  }
  return [...new Set(value as string[])].sort();
}

export async function reserveConsolidatedNumber(actor: string): Promise<string> {
  const invoiceNo = await generateSequentialInvoiceNo(false);
  const db = getFirestore();
  // The counter has already reserved this serial against every normal invoice.
  await db.collection('consolidated_invoices').doc(invoiceNo).set({
    invoiceNo, state: 'reserved', actor, createdAt: FieldValue.serverTimestamp(),
  });
  return invoiceNo;
}

/** Commit a stable snapshot. Repeating the same number/selection returns it unchanged. */
export async function commitConsolidatedInvoice(rawIds: unknown, rawNumber: unknown, actor: string) {
  const orderIds = consolidatedOrderIds(rawIds);
  const invoiceNo = typeof rawNumber === 'string' ? rawNumber.trim().toUpperCase() : '';
  if (!/^RW [A-Z0-9_-]{1,90}$/.test(invoiceNo)) {
    throw new ConsolidatedInvoiceError('A valid reserved or custom RW invoice number is required.');
  }
  const db = getFirestore();
  const ref = db.collection('consolidated_invoices').doc(invoiceNo);
  const registry = db.collection('invoice_numbers').doc(invoiceNo);
  return db.runTransaction(async tx => {
    const [existing, allocated] = await Promise.all([tx.get(ref), tx.get(registry)]);
    const previous = existing.data();
    if (previous?.state === 'committed') {
      if (JSON.stringify(previous.orderIds) !== JSON.stringify(orderIds)) {
        throw new ConsolidatedInvoiceError('This invoice number already belongs to a different selection.', 409);
      }
      return { invoiceNo, orderIds, orders: previous.orders as Record<string, any>[] };
    }
    if (allocated.exists && !previous) {
      throw new ConsolidatedInvoiceError('This invoice number is already allocated.', 409);
    }
    const orderRefs = orderIds.map(id => db.collection('orders').doc(id));
    const snapshots = await Promise.all(orderRefs.map(orderRef => tx.get(orderRef)));
    if (snapshots.some(snap => !snap.exists || snap.data()?.deletedByAdmin)) {
      throw new ConsolidatedInvoiceError('One or more selected orders are no longer available.', 409);
    }
    // Legacy numbers predate the registry. Check both the final and quote forms.
    for (const field of ['invoiceNo', 'officialInvoiceNo', 'quoteNo']) {
      for (const candidate of [invoiceNo, invoiceNo.replace(/^RW /, 'QT ')]) {
        const collisions = await tx.get(db.collection('orders').where(field, '==', candidate).limit(1));
        if (!collisions.empty) throw new ConsolidatedInvoiceError('This number belongs to an individual invoice.', 409);
      }
    }
    const orders = snapshots.map(snap => ({ ...snap.data(), id: snap.id }));
    tx.set(registry, { purpose: 'consolidated', createdAt: FieldValue.serverTimestamp() });
    tx.set(ref, { invoiceNo, orderIds, orders, actor, state: 'committed', committedAt: FieldValue.serverTimestamp() });
    for (const orderRef of orderRefs) {
      tx.update(orderRef, { consolidatedInvoiceNo: invoiceNo, updatedAt: FieldValue.serverTimestamp() });
    }
    return { invoiceNo, orderIds, orders };
  });
}
