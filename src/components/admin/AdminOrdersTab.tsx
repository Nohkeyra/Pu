import { useRememberedListScroll } from '@/hooks/ui/useRememberedView';
import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Check,
  Send,
  FileSpreadsheet,
  Inbox,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { formatDateTimeDisplay } from '@/lib/utils';
import { formatAdminEvent } from '@/lib/adminOrderFilters';
import { hasPositiveOrderPricing } from '@/lib/adminKpiStats';
import type { Order } from '@/types';
import { AdminOrdersExportSheet } from './AdminOrdersExportSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AdminOrderRow } from './AdminOrderRow';
import { triggerLightImpact } from '@/lib/haptics';

import { List, type RowComponentProps } from 'react-window';
import type { ComponentProps } from 'react';

type OrderCardProps = ComponentProps<typeof AdminOrderRow>;
type OrderListRowProps = Pick<OrderCardProps, 'language' | 'isSelectMode' | 'getStatusBadge' |
  'handleToggleOrderSelect' | 'setStarredOrderIds' | 'onReadOrder' | 'openOrderDetail' |
  'openSendDialog' | 'handleDelete' | 'setLongPressedOrder'> & {
    records: Order[];
    selectedOrderIds: Set<string>;
    starredOrderIds: Set<string>;
  };

function OrderListRow({
  index, style, ariaAttributes, records, selectedOrderIds, starredOrderIds, ...rowProps
}: RowComponentProps<OrderListRowProps>) {
  const order = records[index];
  const dateLabel = formatAdminEvent(order, rowProps.language) || (order.orderId ? `#${order.orderId}` : '—');
  const statusTone = {
    approved: 'bg-[var(--ui-green)]',
    billed: 'bg-[var(--ui-green)]',
    in_transit: 'bg-sky-500',
    cancel_requested: 'bg-rose-500',
    cancelled: 'bg-[var(--ui-orange)]',
  };

  return (
    <AdminOrderRow
      key={order.id || order.orderId || index}
      {...rowProps}
      style={style}
      ariaAttributes={ariaAttributes}
      order={order}
      isSelected={Boolean(order.id && selectedOrderIds.has(order.id))}
      isStarred={Boolean(order.id && starredOrderIds.has(order.id))}
      formattedHeaderDate={dateLabel}
      clientName={order.to || order.name || order.company || '—'}
      totalAmount={order.totalAmount != null ? `RM ${Number(order.totalAmount).toFixed(2)}` : '—'}
      stripColor={statusTone[order.status as keyof typeof statusTone] || 'bg-[var(--ui-yellow)]'}
    />
  );
}

export function AdminOrdersTab({
  viewScope = 'admin',
  onReadOrder,
  orders,
  t,
  language,
  filteredOrders: searchedOrders,
  hasSearch,
  cancelRequests,
  isSelectMode,
  setIsSelectMode,
  filterBySameEmail = true,
  setFilterBySameEmail,
  selectedOrderIds,
  setSelectedOrderIds,
  getStatusBadge,
  handleToggleOrderSelect,
  openOrderDetail,
  openSendDialog,
  handleDelete,
  handleBatchDelete,
  handleRejectCancellation,
  handleUpdateStatus,
  toast,
}: {
  viewScope?: string;
  onReadOrder?: (order: Order) => void;
  orders: Order[];
  t: (key: string) => string;
  language: string;
  filteredOrders: Order[];
  hasSearch: boolean;
  cancelRequests: Order[];
  isSelectMode: boolean;
  setIsSelectMode: (v: boolean) => void;
  filterBySameEmail?: boolean;
  setFilterBySameEmail?: (v: boolean) => void;
  selectedOrderIds: Set<string>;
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  getStatusBadge: (status?: string) => React.ReactNode;
  handleToggleOrderSelect: (id?: string) => void;
  openOrderDetail: (order: Order) => void;
  openSendDialog: (order: Order) => void;
  handleDelete: (orderId: string) => void;
  handleBatchDelete?: (orderIds: string[]) => Promise<void>;
  handleRejectCancellation: (orderId: string) => void;
  handleUpdateStatus?: (id: string, status: string) => void;
  toast: (opts: { title?: string; description?: string; variant?: ToastVariant }) => void;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [starredOrderIds, setStarredOrderIds] = useState<Set<string>>(new Set());
  const rememberedListRef = useRememberedListScroll(viewScope + ':orders:listScroll');
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [longPressedOrder, setLongPressedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowHeight = windowWidth < 420 ? 154 : 146;

  return (
    <>
      {/* Cancellation Requests Section */}
      {cancelRequests.length > 0 && (
        <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl backdrop-blur-sm">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t('cancellation_requests') || 'Cancellation Requests'} ({cancelRequests.length})
          </h2>
          <div className="space-y-2.5">
            {cancelRequests.map((order, idx) => (
              <Card
                key={order.id || `cancel-${idx}`}
                variant="default"
                padding="sm"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-amber-500/20"
              >
                <div>
                  <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                    {order.name} ({order.quantity} pax)
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {formatDateTimeDisplay(order.dateTime || order.eventDate || order.date)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold text-sm shadow-sm px-4"
                    onClick={() => {
                      if (order.id && handleUpdateStatus) {
                        handleUpdateStatus(order.id, 'cancelled');
                      }
                    }}
                  >
                    {t('approve')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 min-h-[40px] bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 border-rose-500/30 font-bold text-sm px-4"
                    onClick={() => order.id && handleRejectCancellation(order.id)}
                  >
                    {t('reject')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="admin-order-tools">
        <div className="flex flex-wrap items-center gap-2">
          <Switch
            id="select-mode-toggle"
            checked={isSelectMode}
            onCheckedChange={(checked) => {
              setIsSelectMode(checked);
              if (!checked) setSelectedOrderIds(new Set());
            }}
          />
          <label htmlFor="select-mode-toggle" className="text-sm font-semibold">
            {language === 'bm' ? 'Mod Pilih' : 'Select Mode'}
          </label>
          <Button id="admin-export-btn" variant="outline" size="sm" onClick={() => {
            triggerLightImpact();
            setIsExportOpen(true);
          }}>
            <FileSpreadsheet className="w-4 h-4" />
            {language === 'bm' ? 'Eksport Excel' : 'Export Excel'}
          </Button>
        </div>
        {/* Row 3: Selection tools — only when Select Mode is on */}
        {isSelectMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-light-forest)] dark:border-stone-800">
            <div className="flex items-center gap-2.5 px-3.5 bg-[var(--color-cream-dark)] dark:bg-background/50 border border-[var(--color-light-forest)] dark:border-stone-800 rounded-xl h-10 min-h-[40px]">
              <Switch
                id="email-filter-toggle"
                checked={filterBySameEmail}
                onCheckedChange={(checked) => setFilterBySameEmail?.(checked)}
              />
              <label
                htmlFor="email-filter-toggle"
                className="text-xs sm:text-sm font-semibold text-[var(--ui-green)]/80 dark:text-stone-200 cursor-pointer select-none whitespace-nowrap"
              >
                {language === 'bm' ? 'Emel Sama' : 'Same Email'}
              </label>
            </div>

            {searchedOrders.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedOrderIds.size > 0 && handleBatchDelete && (
                  <Button
                    variant="default"
                    size="default"
                    onClick={async () => {
                      await handleBatchDelete(Array.from(selectedOrderIds));
                      setSelectedOrderIds(new Set());
                    }}
                    className="h-10 min-h-[40px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {language === 'bm'
                        ? `Padam (${selectedOrderIds.size})`
                        : `Delete (${selectedOrderIds.size})`}
                    </span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    const allSelected = searchedOrders.every(
                      (o) => o.id && selectedOrderIds.has(o.id)
                    );
                    if (allSelected) {
                      setSelectedOrderIds(new Set());
                      return;
                    }
                    let toSelect = searchedOrders.filter((o) => Boolean(o.id));
                    if (filterBySameEmail) {
                      const first = toSelect.find((o) => o.email);
                      if (first?.email) {
                        const target = String(first.email).trim().toLowerCase();
                        toSelect = toSelect.filter(
                          (o) =>
                            String(o.email || '')
                              .trim()
                              .toLowerCase() === target
                        );
                      }
                    }
                    setSelectedOrderIds(new Set(toSelect.map((o) => o.id!)));
                  }}
                  className="h-10 min-h-[40px] border-[var(--color-light-forest)] dark:border-stone-800 font-semibold rounded-xl text-xs sm:text-sm text-[var(--ui-green)] dark:text-stone-200 hover:bg-[var(--ui-yellow)]/10 dark:hover:bg-stone-800"
                >
                  {searchedOrders.every((o) => o.id && selectedOrderIds.has(o.id)) ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5 text-[var(--ui-yellow)]" />
                      {t('deselect_all') || 'Deselect'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5 opacity-40" />
                      {t('select_all_orders') || 'Select All'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jotform-style Submissions List */}
      <div className="rounded-xl border border-[var(--color-light-forest)] dark:border-stone-800 bg-white dark:bg-card overflow-hidden shadow-xs">
        {searchedOrders.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<Inbox className="w-10 h-10 opacity-70" aria-hidden />}
            title={
              hasSearch
                ? language === 'bm'
                  ? 'Tiada hasil carian'
                  : 'No matching orders'
                : t('no_orders') || 'No orders'
            }
            description={
              hasSearch
                ? language === 'bm'
                  ? 'Cuba tukar kata kunci atau kosongkan carian.'
                  : 'Try a different keyword or clear the search.'
                : language === 'bm'
                  ? 'Laraskan penapis tarikh atau tunggu pesanan baharu.'
                  : 'Adjust date filters or wait for new orders.'
            }
          />
        ) : (
          <List
            listRef={rememberedListRef}
            style={{ height: Math.min(searchedOrders.length * rowHeight, 900), width: '100%' }}
            rowCount={searchedOrders.length}
            rowHeight={rowHeight}
            rowProps={{
              records: searchedOrders, selectedOrderIds, starredOrderIds, language, isSelectMode, getStatusBadge,
              handleToggleOrderSelect, setStarredOrderIds, onReadOrder, openOrderDetail, openSendDialog,
              handleDelete, setLongPressedOrder,
            }}
            rowComponent={OrderListRow}
          />
        )}
      </div>

      <AdminOrdersExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredOrders={searchedOrders}
        selectedOrdersSource={orders}
        selectedOrderIds={selectedOrderIds}
        setSelectedOrderIds={setSelectedOrderIds}
        language={language}
        toast={toast}
      />

      <Dialog open={!!longPressedOrder} onOpenChange={(open) => !open && setLongPressedOrder(null)}>
        <DialogContent className="sm:max-w-md bg-stone-50 dark:bg-stone-950 p-0 border-0 overflow-hidden">
          <div className="p-4 sm:p-6 bg-white dark:bg-card border-b border-stone-100 dark:border-stone-800">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-deep-forest dark:text-stone-100">
                {language === 'bm' ? 'Tindakan Pantas' : 'Quick Actions'}: #
                {longPressedOrder?.orderId || longPressedOrder?.id?.slice(-4).toUpperCase()}
              </DialogTitle>
              <DialogDescription className="text-stone-500">
                {longPressedOrder?.name || longPressedOrder?.to || 'Customer'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-2 sm:p-4 grid gap-2">
            {longPressedOrder?.status !== 'approved' &&
              longPressedOrder?.status !== 'billed' &&
              longPressedOrder?.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  className="w-full justify-start py-6 text-[var(--ui-green)] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-200 dark:border-emerald-900"
                  onClick={() => {
                    if (longPressedOrder?.id && handleUpdateStatus) {
                      handleUpdateStatus(longPressedOrder.id, 'approved');
                      setLongPressedOrder(null);
                    }
                  }}
                >
                  <Check className="w-5 h-5 mr-3" />
                  {language === 'bm' ? 'Luluskan Tempahan' : 'Approve Order'}
                </Button>
              )}

            {longPressedOrder?.status === 'approved' && (
              <Button
                variant="outline"
                className="w-full justify-start py-6 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 border-indigo-200 dark:border-indigo-900"
                onClick={() => {
                  if (!longPressedOrder?.id) return;
                  if (hasPositiveOrderPricing(longPressedOrder)) {
                    if (handleUpdateStatus) {
                      handleUpdateStatus(longPressedOrder.id, 'billed');
                    }
                  } else {
                    openOrderDetail(longPressedOrder);
                  }
                  setLongPressedOrder(null);
                }}
              >
                <FileSpreadsheet className="w-5 h-5 mr-3" />
                {hasPositiveOrderPricing(longPressedOrder)
                  ? language === 'bm'
                    ? 'Tandakan Sebagai Dibilkan'
                    : 'Mark as Billed'
                  : language === 'bm'
                    ? 'Tetapkan Harga & Bilkan'
                    : 'Set Pricing & Bill'}
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start py-6 text-[var(--ui-yellow)] hover:bg-sunshine/10 dark:text-amber-500 dark:hover:bg-amber-950 border-sunshine/30 dark:border-amber-900/50"
              onClick={() => {
                if (longPressedOrder) {
                  openSendDialog(longPressedOrder);
                  setLongPressedOrder(null);
                }
              }}
            >
              <Send className="w-5 h-5 mr-3" />
              {language === 'bm' ? 'Hantar Invois WhatsApp' : 'Send WhatsApp Invoice'}
            </Button>

            <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />

            <Button
              variant="outline"
              className="w-full justify-start py-6 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900"
              onClick={() => {
                if (longPressedOrder?.id) {
                  handleDelete(longPressedOrder.id);
                  setLongPressedOrder(null);
                }
              }}
            >
              <Trash2 className="w-5 h-5 mr-3" />
              {language === 'bm' ? 'Padam Tempahan' : 'Delete Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default AdminOrdersTab;
