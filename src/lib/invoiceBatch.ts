import { SAVED_COMPANIES } from '../constants/companies';
export interface InvoiceRecord {
  id?: string;
  to?: string;
  name?: string;
  email?: string;
  billingAddress?: string;
  contact?: string;
  date?: string | Date;
  eventDate?: string | Date;
  dateTime?: string;
  quantity?: number;
  guests?: number;
  menu?: string;
  notes?: string;
  meals?: string[];
  prices?: Record<string, number>;
  totalAmount?: number;
}
export interface InvoiceRecipient {
  company: string;
  address: string;
  email: string;
}
export interface InvoicePage {
  invoiceNo: string;
  orderIds: string[];
  totalCents: number;
}
export interface InvoiceBatch {
  invoiceNo: string;
  orders: InvoiceRecord[];
  pages: InvoicePage[];
  recipient: InvoiceRecipient;
  includeNotes: boolean;
  lang: 'bm' | 'en';
  issuedAt: string;
  layoutVersion: 2;
}
export const invoiceText = (v: unknown): string =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
export const invoiceMatchText = (v: unknown): string =>
  invoiceText(v).normalize('NFKC').toLowerCase();
export function invoiceBillingAddress(order: InvoiceRecord): string {
  if (invoiceText(order.billingAddress)) return invoiceText(order.billingAddress);
  const known = SAVED_COMPANIES.find((v) => invoiceMatchText(v) === invoiceMatchText(order.to));
  return known?.includes(',') ? known.slice(known.indexOf(',') + 1).trim() : '';
}
export function invoiceRecipient(order: InvoiceRecord, address = ''): InvoiceRecipient {
  return {
    company:
      invoiceText(order.to) === 'Majlis Persendirian'
        ? invoiceText(order.name)
        : invoiceText(order.to),
    address: invoiceBillingAddress(order) || invoiceText(address),
    email: invoiceText(order.email).toLowerCase(),
  };
}
export function validateInvoiceGroup(orders: InvoiceRecord[], address = ''): InvoiceRecipient {
  if (!orders.length) throw new Error('Pilih pesanan / Select orders.');
  const recipient = invoiceRecipient(orders[0], address);
  if (
    !recipient.company ||
    !recipient.address ||
    recipient.address.length > 1000 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
  )
    throw new Error(
      'Syarikat, alamat bil dan emel sah diperlukan / Company, billing address and valid email required.'
    );
  const key = (r: InvoiceRecipient) =>
    [r.company, r.address, r.email].map(invoiceMatchText).join('\u0000');
  if (orders.some((order) => key(invoiceRecipient(order, address)) !== key(recipient)))
    throw new Error(
      'Pelanggan, alamat bil dan emel mesti sama / Customer, billing address and email must match.'
    );
  return recipient;
}
export function invoiceAmountCents(order: InvoiceRecord): number {
  if (
    order.totalAmount == null ||
    !Number.isFinite(Number(order.totalAmount)) ||
    Number(order.totalAmount) < 0 ||
    Number(order.totalAmount) > 100000000
  )
    throw new Error('Jumlah pesanan belum sah / Invalid order amount.');
  return Math.round(Number(order.totalAmount) * 100);
}
export function invoiceDate(value: unknown): string {
  const raw = value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw || '-';
}
export function invoiceSnapshot(order: InvoiceRecord): InvoiceRecord {
  return {
    id: invoiceText(order.id),
    to: invoiceText(order.to),
    name: invoiceText(order.name),
    email: invoiceText(order.email),
    contact: invoiceText(order.contact),
    billingAddress: invoiceBillingAddress(order),
    date: (order.eventDate instanceof Date
      ? order.eventDate.toISOString()
      : order.date instanceof Date
        ? order.date.toISOString()
        : invoiceText(order.eventDate || order.date || order.dateTime)
    ).slice(0, 10),
    quantity: Number(order.quantity ?? order.guests) || 0,
    menu: invoiceText(order.menu) || 'Set Box',
    notes: invoiceText(order.notes),
    meals: Array.isArray(order.meals) ? order.meals.filter((v) => typeof v === 'string') : [],
    prices: Object.fromEntries(
      Object.entries(order.prices || {})
        .filter(([, v]) => Number.isFinite(Number(v)))
        .map(([k, v]) => [k, Number(v)])
    ),
    totalAmount: invoiceAmountCents(order) / 100,
  };
}
