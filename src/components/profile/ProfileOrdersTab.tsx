import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  RotateCcw, 
  FileDown, 
  Ban, 
  Trash2, 
  Loader2, 
  Utensils, 
  Check 
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import type { Order } from '@/types';

interface ProfileOrdersTabProps {
  orders: Order[];
  isLoadingOrders: boolean;
  selectedOrders: Set<string>;
  isSelectMode: boolean;
  setIsSelectMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowCombineModal: (val: boolean) => void;
  handleToggleOrderSelect: (id: string) => void;
  handleSelectAllForCombine: () => void;
  onReorder: (order: Order) => void;
  handleRequestInvoiceEmail?: (order: Order) => Promise<void>;
  pokingOrderId?: string | null;
  setPreviewOrder: (order: Order | null) => void;
  setConfirmDialog: (val: { type: 'cancel' | 'delete'; orderId: string } | null) => void;
  cancellingOrderId: string | null;
  deletingOrderId: string | null;
  setTrackingOrder?: (order: Order | null) => void;
  t: (en: string, bm: string) => string;
}

// Swipe-to-Reveal Delete Item
function OrderItem({
  order,
  isSelected,
  isSelectMode,
  handleToggleOrderSelect,
  getStatusBadge,
  onReorder,
  setPreviewOrder,
  setTrackingOrder,
  setConfirmDialog,
  cancellingOrderId,
  t,
  itemVariants
}: any) {
  const x = useMotionValue(0);
  const swipeOpacity = useTransform(x, [-100, -50, 0], [1, 0, 0]);

  return (
    <motion.div 
      className="relative overflow-hidden rounded-xl border border-stone-200/80 dark:border-white/10 bg-white dark:bg-card shadow-sm hover:shadow-md transition-all group"
      variants={itemVariants}
    >
      {/* Swipe Action Background Indicator */}
      <motion.div 
        className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center text-white z-0"
        style={{ opacity: swipeOpacity }}
      >
        <Trash2 className="w-5 h-5" />
      </motion.div>

      {/* Main Card Content */}
      <motion.div
        className="relative bg-white dark:bg-card p-5 z-10"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) {
            setConfirmDialog({ type: 'delete', orderId: order.id! });
            animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
          } else {
            animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
          }
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            {isSelectMode && (
              <button
                type="button"
                onClick={() => handleToggleOrderSelect(order.id!)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-stone-500 dark:text-stone-400">
                  {order.invoiceNo || order.id?.slice(0, 8).toUpperCase() || 'ORDER'}
                </span>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd MMM yyyy, h:mm a') : 'Recent'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="font-display font-black text-lg text-deep-forest dark:text-white">
              RM {(order.totalPrice || 0).toFixed(2)}
            </span>
            <p className="text-[11px] text-stone-500 font-medium">
              {order.pax} {t('Pax', 'Orang')} • {order.packageType ? order.packageType.toUpperCase() : 'BUFFET'}
            </p>
          </div>
        </div>

        {/* Details snippet */}
        <div className="py-3 text-xs text-stone-600 dark:text-stone-300 space-y-1">
          <p><strong className="text-deep-forest dark:text-white font-semibold">{t('Event Date:', 'Tarikh Majlis:')}</strong> {order.deliveryDate} ({order.deliveryTime})</p>
          <p><strong className="text-deep-forest dark:text-white font-semibold">{t('Location:', 'Lokasi:')}</strong> {order.deliveryAddress}</p>
          {order.items && order.items.length > 0 && (
            <p className="line-clamp-1 text-stone-500">
              <strong className="text-deep-forest dark:text-white font-semibold">{t('Menu:', 'Menu:')}</strong> {order.items.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-stone-100 dark:border-white/5 flex flex-wrap items-center gap-2 justify-end">
          <Button
            onClick={() => onReorder(order)}
            variant="outline"
            size="sm"
            className="rounded-lg border-stone-200 text-deep-forest dark:text-white hover:bg-stone-50 font-bold text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            <span>{t('Reorder', 'Pesan Semula')}</span>
          </Button>

          <Button
            onClick={() => setPreviewOrder(order)}
            variant="ghost"
            size="sm"
            className="rounded-lg text-deep-forest dark:text-white hover:bg-stone-50 font-bold text-xs gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{t('View Invoice', 'Lihat Invois')}</span>
          </Button>

          {order.id && (order.status === 'in_transit' || order.status === 'delivered') && setTrackingOrder && (
            <Button
              onClick={() => setTrackingOrder(order)}
              size="sm"
              className="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs gap-1.5"
            >
              <span>🚚 {t('Track Delivery', 'Jejak Penghantaran')}</span>
            </Button>
          )}

          {order.id && order.status === 'pending' && (
            <Button
              onClick={() => setConfirmDialog({ type: 'cancel', orderId: order.id! })}
              disabled={cancellingOrderId === order.id}
              variant="ghost"
              size="sm"
              className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold text-xs gap-1.5"
            >
              {cancellingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              <span>{t('Cancel Order', 'Batal Tempahan')}</span>
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ProfileOrdersTab({
  orders,
  isLoadingOrders,
  selectedOrders,
  isSelectMode,
  setIsSelectMode,
  setShowCombineModal,
  handleToggleOrderSelect,
  handleSelectAllForCombine,
  onReorder,
  setPreviewOrder,
  setConfirmDialog,
  cancellingOrderId,
  deletingOrderId,
  setTrackingOrder,
  t,
}: ProfileOrdersTabProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'invoices'>('all');

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'approved':
      case 'billed':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">{t('Approved', 'Diluluskan')}</Badge>;
      case 'in_transit':
        return <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs font-bold animate-pulse">{t('In Transit 🚚', 'Dalam Perjalanan 🚚')}</Badge>;
      case 'delivered':
        return <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">{t('Delivered ✅', 'Selesai Dihantar ✅')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-stone-400 text-stone-500 text-xs font-bold">{t('Cancelled', 'Dibatalkan')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs font-bold">{t('Rejected', 'Ditolak')}</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">{t('Pending Review', 'Dalam Semakan')}</Badge>;
    }
  };

  // Filter orders according to category tab
  const filteredOrders = orders.filter(order => {
    if (filterMode === 'active') {
      return order.status === 'pending' || order.status === 'approved' || order.status === 'in_transit';
    }
    if (filterMode === 'invoices') {
      return order.invoiceNo || order.status === 'billed' || order.status === 'approved' || order.status === 'delivered';
    }
    return true;
  });

  const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'approved' || o.status === 'in_transit').length;
  const invoiceCount = orders.filter(o => o.invoiceNo || o.status === 'billed' || o.status === 'approved' || o.status === 'delivered').length;

  return (
    <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/80 dark:border-white/10 font-sans">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-deep-forest dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>{t('Catering Order History', 'Sejarah Tempahan Katering')}</span>
          </h3>
          <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5">
            {t('View past catering orders, download invoice PDFs, or reorder favorite menus.', 'Semak tempahan lalu, muat turun invois, atau hantar semula tempahan.')}
          </p>
        </div>

        {orders.length > 1 && (
          <div className="flex items-center gap-2">
            {!isSelectMode ? (
              <Button
                onClick={() => setIsSelectMode(true)}
                variant="outline"
                size="sm"
                className="rounded-lg border-stone-200 dark:border-stone-800 text-deep-forest dark:text-white hover:bg-stone-50 font-bold text-xs gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{t('Combine Invoices', 'Gabung Invois')}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSelectAllForCombine}
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-stone hover:bg-stone-100 font-bold text-xs"
                >
                  {selectedOrders.size === orders.length ? t('Deselect All', 'Batal Semua') : t('Select All', 'Pilih Semua')}
                </Button>
                <Button
                  onClick={() => setIsSelectMode(false)}
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-stone hover:bg-stone-100 font-bold text-xs"
                >
                  {t('Done', 'Selesai')}
                </Button>
                {selectedOrders.size > 0 && (
                  <Button
                    onClick={() => setShowCombineModal(true)}
                    size="sm"
                    className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                  >
                    {t(`Export ${selectedOrders.size} Invoices`, `Eksport ${selectedOrders.size} Invois`)}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fast Scan Filter Pills */}
      {orders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <span>{t('All Orders', 'Semua Tempahan')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-mono">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <span>{t('Active Bookings', 'Tempahan Aktif')}</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold">
                {activeCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('invoices')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterMode === 'invoices'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <span>{t('Corporate Invoices', 'Invois Syarikat')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-mono">
              {invoiceCount}
            </span>
          </button>
        </div>
      )}

      {isLoadingOrders ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Utensils className="w-10 h-10 opacity-70" aria-hidden />}
          title={
            filterMode === 'active' 
              ? t('No Active Bookings', 'Tiada Tempahan Aktif')
              : filterMode === 'invoices'
              ? t('No Invoices Found', 'Tiada Invois Dijumpai')
              : t('No Past Orders Found', 'Tiada Rekod Tempahan')
          }
          description={t(
            'Your submitted catering bookings will automatically appear here once ordered.',
            'Tempahan katering yang dihantar akan dipaparkan di sini secara automatik.'
          )}
        />
      ) : (
        <motion.div 
          className="space-y-4"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredOrders.map((order, idx) => {
            const isSelected = order.id ? selectedOrders.has(order.id) : false;
            return (
              <OrderItem 
                key={order.id || `order-${idx}`}
                order={order}
                isSelected={isSelected}
                isSelectMode={isSelectMode}
                handleToggleOrderSelect={handleToggleOrderSelect}
                getStatusBadge={getStatusBadge}
                onReorder={onReorder}
                setPreviewOrder={setPreviewOrder}
                setTrackingOrder={setTrackingOrder}
                setConfirmDialog={setConfirmDialog}
                cancellingOrderId={cancellingOrderId}
                deletingOrderId={deletingOrderId}
                t={t}
                itemVariants={itemVariants}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
