export type OrderStatusKey = 'pending' | 'approved' | 'billed' | 'in_transit' | 'delivered' | 'completed' | 'cancel_requested' | 'cancelled' | 'rejected' | 'unknown';

const aliases: Record<string, OrderStatusKey> = {
  menunggu: 'pending', diluluskan: 'approved', dibilkan: 'billed',
  dibatalkan: 'cancelled', ditolak: 'rejected',
};

const statusToneClass = {
  pending: '[--order-status-accent:var(--ui-order-status-pending)]',
  success: '[--order-status-accent:var(--ui-order-status-success)]',
  danger: '[--order-status-accent:var(--ui-order-status-danger)]',
  neutral: '[--order-status-accent:var(--ui-muted)]',
} as const;

const statusSurfaceClass = 'bg-[color-mix(in_srgb,var(--order-status-accent)_9%,var(--ui-surface))] text-[color:var(--ui-ink)] border-[color:color-mix(in_srgb,var(--order-status-accent)_53%,var(--ui-surface))]';

const statuses: Record<OrderStatusKey, { en: string; bm: string; tone: keyof typeof statusToneClass }> = {
  pending: { en: 'Pending review', bm: 'Dalam semakan', tone: 'pending' },
  approved: { en: 'Approved', bm: 'Diluluskan', tone: 'success' },
  billed: { en: 'Billed', bm: 'Telah diinvois', tone: 'neutral' },
  in_transit: { en: 'In transit', bm: 'Dalam perjalanan', tone: 'neutral' },
  delivered: { en: 'Delivered', bm: 'Dihantar', tone: 'success' },
  completed: { en: 'Completed', bm: 'Selesai', tone: 'neutral' },
  cancel_requested: { en: 'Cancellation requested', bm: 'Pembatalan dimohon', tone: 'danger' },
  cancelled: { en: 'Cancelled', bm: 'Dibatalkan', tone: 'neutral' },
  rejected: { en: 'Rejected', bm: 'Ditolak', tone: 'danger' },
  unknown: { en: 'Status unavailable', bm: 'Status belum tersedia', tone: 'neutral' },
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
  const presentation = statuses[key];
  return { key, label: presentation[language], className: `${statusSurfaceClass} ${statusToneClass[presentation.tone]}` };
}
