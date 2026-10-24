import type { Order } from '@/types'
import { normalizeTimestamp } from './utils'

/** Maps UI status chips to stored bm/en status strings on orders. */
export const STATUS_FILTER_GROUPS: Record<string, string[]> = {
  pending: ['pending', 'menunggu'],
  approved: ['approved', 'diluluskan'],
  billed: ['billed', 'dibilkan'],
  rejected: ['rejected', 'ditolak'],
  cancelled: ['cancelled', 'dibatalkan'],
  cancel_requested: ['cancel_requested'],
}

export interface OrderFilterInput {
  orders: Order[]
  searchTerm?: string
  statusFilter?: string
  clientFilter?: string
  dateFromFilter?: string
  dateToFilter?: string
}

/**
 * Shared filter for admin order lists.
 * 'all' status still excludes cancelled (default list behaviour).
 */
export function filterAdminOrders({
  orders,
  searchTerm = '',
  statusFilter = 'all',
  clientFilter = 'all',
  dateFromFilter = '',
  dateToFilter = '',
}: OrderFilterInput): Order[] {
  const sLower = searchTerm.toLowerCase()

  return orders.filter((order) => {
    const dateMatch = (() => {
      if (!sLower) return false
      const ts = normalizeTimestamp(order.dateTime || order.eventDate || order.createdAt);
      if (ts === 0) return false;
      const d = new Date(ts * 1000);
      try {
        // We use a simple Intl format instead of date-fns to reduce dependencies if possible, 
        // but since date-fns was here, I'll stick to native for better control over legacy formats.
        const dateStr = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
        const monthStr = d.toLocaleDateString('en-GB', { month: 'long' }).toLowerCase();
        const dayStr = d.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
        
        return (
          dateStr.includes(sLower) ||
          monthStr.includes(sLower) ||
          dayStr.includes(sLower) ||
          d.getFullYear().toString().includes(sLower)
        );
      } catch {
        return false
      }
    })()

    const status = order.status ? String(order.status).toLowerCase() : ''
    const isCancelled = status === 'cancelled' || status === 'dibatalkan'

    const matchesSearch =
      !sLower ||
      (order.to || '').toLowerCase().includes(sLower) ||
      (order.name || '').toLowerCase().includes(sLower) ||
      (order.email || '').toLowerCase().includes(sLower) ||
      (order.orderId || '').toLowerCase().includes(sLower) ||
      (order.officialInvoiceNo || order.invoiceNo || '').toLowerCase().includes(sLower) ||
      dateMatch

    const matchesStatus =
      statusFilter === 'all'
        ? !isCancelled
        : (STATUS_FILTER_GROUPS[statusFilter] || []).includes(status)

    const matchesClient = clientFilter === 'all' || order.to === clientFilter

    const matchesDateRange = (() => {
      if (!dateFromFilter && !dateToFilter) return true
      const ts = normalizeTimestamp(order.dateTime || order.eventDate || order.createdAt);
      if (ts === 0) return false;
      try {
        const d = new Date(ts * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        
        if (dateFromFilter && dateStr < dateFromFilter) return false
        if (dateToFilter && dateStr > dateToFilter) return false
        return true
      } catch {
        return true
      }
    })()

    return matchesSearch && matchesStatus && matchesClient && matchesDateRange
  })
}
