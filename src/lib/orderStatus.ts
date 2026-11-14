export type OrderStatusKey = 'pending' | 'approved' | 'billed' | 'in_transit' | 'delivered' | 'completed' | 'cancel_requested' | 'cancelled' | 'rejected' | 'unknown';

const aliases: Record<string, OrderStatusKey> = {
  menunggu: 'pending', diluluskan: 'approved', dibilkan: 'billed',
  dibatalkan: 'cancelled', ditolak: 'rejected',
};

const statuses: Record<OrderStatusKey, { en: string; bm: string; className: string }> = {
  pending: { en: 'Pending review', bm: 'Dalam semakan', className: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700' },
  approved: { en: 'Approved', bm: 'Diluluskan', className: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700' },
  billed: { en: 'Billed', bm: 'Telah diinvois', className: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-700' },
  in_transit: { en: 'In transit', bm: 'Dalam perjalanan', className: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700' },
  delivered: { en: 'Delivered', bm: 'Dihantar', className: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700' },
  completed: { en: 'Completed', bm: 'Selesai', className: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-600' },
  cancel_requested: { en: 'Cancellation requested', bm: 'Pembatalan dimohon', className: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700' },
  cancelled: { en: 'Cancelled', bm: 'Dibatalkan', className: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-600' },
  rejected: { en: 'Rejected', bm: 'Ditolak', className: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-700' },
  unknown: { en: 'Status unavailable', bm: 'Status belum tersedia', className: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-600' },
};

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'billed', 'rejected', 'cancelled', 'cancel_requested'],
  approved: ['billed', 'in_transit', 'delivered', 'cancelled', 'cancel_requested'],
  billed: ['approved', 'in_transit', 'delivered', 'completed', 'cancelled', 'cancel_requested'],
  in_transit: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed'],
  cancel_requested: ['cancelled', 'approved', 'billed', 'rejected'],
  completed: [],
  rejected: [],
  cancelled: [],
};

/** Display metadata only; does not change stored statuses or action eligibility. */
export function getOrderStatus(status: string | undefined, language: 'en' | 'bm') {
  const normalized = status?.trim().toLowerCase() || 'pending';
  const alias = Object.prototype.hasOwnProperty.call(aliases, normalized) ? aliases[normalized] : undefined;
  const key: OrderStatusKey = alias || (Object.prototype.hasOwnProperty.call(statuses, normalized) ? normalized as OrderStatusKey : 'unknown');
  return { key, label: statuses[key][language], className: statuses[key].className };
}
