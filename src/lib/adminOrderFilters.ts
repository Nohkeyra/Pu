import { format } from 'date-fns'
import type { Order } from '@/types'

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
      if (!order.dateTime || !sLower) return false
      try {
        const d = new Date(order.dateTime)
        return (
          format(d, 'PP').toLowerCase().includes(sLower) ||
          format(d, 'dd/MM/yyyy').toLowerCase().includes(sLower) ||
          format(d, 'MMMM').toLowerCase().includes(sLower) ||
          format(d, 'EEEE').toLowerCase().includes(sLower) ||
          d.getFullYear().toString().includes(sLower)
        )
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
      if (!order.dateTime) return false
      try {
        const d = new Date(order.dateTime)
        const day = format(d, 'yyyy-MM-dd')
        if (dateFromFilter && day < dateFromFilter) return false
        if (dateToFilter && day > dateToFilter) return false
        return true
      } catch {
        return true
      }
    })()

    return matchesSearch && matchesStatus && matchesClient && matchesDateRange
  })
}
