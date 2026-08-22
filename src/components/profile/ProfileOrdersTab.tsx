import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  RotateCcw, 
  FileDown, 
  Ban, 
  Trash2, 
  Mail, 
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
  handleRequestInvoiceEmail: (order: Order) => Promise<void>;
  pokingOrderId: string | null;
  setPreviewOrder: (order: Order | null) => void;
  setConfirmDialog: (val: { type: 'cancel' | 'delete'; orderId: string } | null) => void;
  cancellingOrderId: string | null;
  deletingOrderId: string | null;
  setTrackingOrder?: (order: Order | null) => void;
  t: (en: string, bm: string) => string;
}

// Unpredictable Feature: Swipe-to-Reveal Delete Item
function OrderItem({
  order,
  isSelected,
  isSelectMode,
  handleToggleOrderSelect,
  getStatusBadge,
  onReorder,
  setPreviewOrder,
  handleRequestInvoiceEmail,
  pokingOrderId,
  setTrackingOrder,
  setConfirmDialog,
  cancellingOrderId,
  t,
  itemVariants
}: any) {
  const x = useMotionValue(0);
  const swipeOpacity = useTransform(x, [-100, -50, 0], [1, 0, 0]);
  const swipeScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);
  
  const handleDragEnd = (_e: any, info: any) => {
    if (info.offset.x < -80 && (order.status === 'cancelled' || order.status === 'rejected')) {
      // Trigger delete action
      setConfirmDialog({ type: 'delete', orderId: order.id! });
      // Snap back instantly since it will open a dialog or get deleted
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  const isDeletable = order.id && (order.status === 'cancelled' || order.status === 'rejected');

  return (
    <motion.div variants={itemVariants} className="relative w-full rounded-xl overflow-hidden touch-pan-y">
      {/* Background Actions (Revealed on Swipe) */}
      <div className="absolute inset-y-0 right-0 w-32 bg-red-500 rounded-xl flex items-center justify-end px-6 z-0">
        <motion.div 
          className="flex flex-col items-center justify-center text-white"
          style={{ opacity: swipeOpacity, scale: swipeScale }}
        >
          <Trash2 className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('Delete', 'Padam')}</span>
        </motion.div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={isDeletable && !isSelectMode ? "x" : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative z-10 p-4 sm:p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isSelected
            ? 'bg-stone-50/50 dark:bg-stone-900/30 border-stone-300 shadow-sm'
            : 'bg-white dark:bg-card border-stone-200/80 dark:border-white/10 hover:border-stone-300'
        }`}
      >
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isSelectMode && order.id && (
              <button
                type="button"
                onClick={() => handleToggleOrderSelect(order.id!)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-stone-300 bg-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            )}
            <span className="font-mono text-xs font-bold text-deep-forest dark:text-white bg-stone-50 dark:bg-stone-900 px-2.5 py-1 rounded border border-stone-200/80 dark:border-white/5">
              {order.invoiceNo || order.id || 'ORDER'}
            </span>
            {getStatusBadge(order.status)}
            <span className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal ml-auto md:ml-0">
              {order.eventDate
                ? format(new Date(order.eventDate), 'dd MMM yyyy')
                : order.createdAt
                ? format(new Date((order.createdAt as any)?.seconds ? (order.createdAt as any).seconds * 1000 : String(order.createdAt)), 'dd MMM yyyy')
                : '—'}
            </span>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-deep-forest dark:text-white">
              {order.eventType === 'pejabat' ? t('Office Feast', 'Jamuan Pejabat') : t('Private Event', 'Majlis Katering')} ({order.guests} pax)
            </h4>
            <p className="text-xs text-stone-550 dark:text-stone-300 font-normal line-clamp-1 mt-0.5">
              {order.dishes && order.dishes.length > 0 ? order.dishes.join(', ') : t('Standard Catering Package', 'Pakej Katering Standard')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 dark:border-white/5">
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

          {order.id && (order.status === 'approved' || order.status === 'billed') && (
            <Button
              onClick={() => handleRequestInvoiceEmail(order)}
              disabled={pokingOrderId === order.id || order.invoiceEmailRequested}
              variant="outline"
              size="sm"
              className="rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs gap-1.5"
            >
              {pokingOrderId === order.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>
                {order.invoiceEmailRequested
                  ? t('Invoice Requested', 'Permintaan Invois Dihantar')
                  : t('Request Email', 'Mohon Emel Invois')}
              </span>
            </Button>
          )}

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
  handleRequestInvoiceEmail,
  pokingOrderId,
  setPreviewOrder,
  setConfirmDialog,
  cancellingOrderId,
  deletingOrderId,
  setTrackingOrder,
  t,
}: ProfileOrdersTabProps) {
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

  return (
    <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/80 dark:border-white/10 font-sans">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-deep-forest dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>{t('Catering Order History', 'Sejarah Tempahan Katering')}</span>
          </h3>
          <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5">
            {t('View past catering orders, request invoice PDFs, or reorder favorite menus.', 'Semak tempahan lalu, muat turun invois, atau hantar semula tempahan.')}
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

      {isLoadingOrders ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Utensils className="w-10 h-10 opacity-70" aria-hidden />}
          title={t('No Past Orders Found', 'Tiada Rekod Tempahan')}
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
          {orders.map((order, idx) => {
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
                handleRequestInvoiceEmail={handleRequestInvoiceEmail}
                pokingOrderId={pokingOrderId}
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
