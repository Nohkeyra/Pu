import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/Toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  History, 
  RotateCcw, 
  FileDown, 
  Ban, 
  Trash2, 
  Mail, 
  Loader2,
  Utensils, 
  Check,
  MessageCircle,
  Pencil
} from 'lucide-react';
import WawasanLoader from '@/components/WawasanLoader';
import { format } from 'date-fns';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import type { Order } from '@/types';
import { getDisplayInvoiceNo } from '@/lib/utils';

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
  setEditingOrder,
  cancellingOrderId,
  t,
  itemVariants
}: any) {
  const x = useMotionValue(0);
  const swipeOpacity = useTransform(x, [-100, -50, 0], [1, 0, 0]);
  const swipeScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);
  
  const handleDragEnd = (_: any, info: any) => {
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
        className={`relative z-10 p-4 sm:p-5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isSelected
            ? 'bg-stone-50/50 dark:bg-stone-900/30 border-primary/50 ring-2 ring-primary/20 shadow-sm'
            : 'bg-white dark:bg-card border-stone-200/80 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20'
        }`}
      >
        <div 
          onClick={() => {
            if (isSelectMode && order.id) {
              handleToggleOrderSelect(order.id);
            } else {
              setPreviewOrder(order);
            }
          }}
          className="space-y-2 flex-1 cursor-pointer group/item min-w-0"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {isSelectMode && order.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleOrderSelect(order.id!);
                }}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            )}
            <span className="font-mono text-xs font-bold text-deep-forest dark:text-white bg-stone-100 dark:bg-stone-800/90 px-2.5 py-1 rounded border border-stone-200/80 dark:border-white/10">
              {getDisplayInvoiceNo(order)}
            </span>
            {getStatusBadge(order.status)}
            <span className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal ml-auto sm:ml-0">
              {order.eventDate
                ? format(new Date(order.eventDate), 'dd MMM yyyy')
                : order.createdAt
                ? format(new Date((order.createdAt as any)?.seconds ? (order.createdAt as any).seconds * 1000 : String(order.createdAt)), 'dd MMM yyyy')
                : '—'}
            </span>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-deep-forest dark:text-white group-hover/item:text-primary transition-colors truncate">
              {order.eventType === 'pejabat' ? t('Office Feast', 'Jamuan Pejabat') : t('Private Event', 'Majlis Katering')} ({order.guests} pax)
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-normal line-clamp-1 mt-0.5">
              {order.dishes && order.dishes.length > 0 ? order.dishes.join(', ') : t('Standard Catering Package', 'Pakej Katering Standard')}
            </p>
          </div>
        </div>

        <div 
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 flex-wrap justify-start sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-white/5 shrink-0"
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onReorder(order);
            }}
            variant="outline"
            size="sm"
            className="rounded-lg border-stone-200 dark:border-stone-800 text-deep-forest dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 font-bold text-xs gap-1.5 h-8 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            <span>{t('Reorder', 'Pesan Semula')}</span>
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOrder(order);
            }}
            variant="ghost"
            size="sm"
            className="rounded-lg text-deep-forest dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs gap-1.5 h-8 px-3"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{t('View Invoice', 'Lihat Invois')}</span>
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              const invNo = getDisplayInvoiceNo(order);
              const text = encodeURIComponent(
                `Salam Restoran Wawasan Pak Usop, saya ingin bertanyakan tentang pesanan #${invNo} (${order.eventType === 'pejabat' ? 'Jamuan Pejabat' : 'Majlis Katering'}, ${order.guests} pax, Tarikh: ${order.date || order.eventDate || ''}).`
              );
              window.open(`https://wa.me/60123456789?text=${text}`, '_blank');
            }}
            variant="outline"
            size="sm"
            className="rounded-lg border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs gap-1.5 h-8 px-3"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{t('WhatsApp', 'Bantuan WA')}</span>
          </Button>

          {order.id && (order.status === 'approved' || order.status === 'billed') && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleRequestInvoiceEmail(order);
              }}
              disabled={pokingOrderId === order.id || order.invoiceEmailRequested}
              variant="outline"
              size="sm"
              className="rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs gap-1.5 h-8 px-3"
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
              onClick={(e) => {
                e.stopPropagation();
                setTrackingOrder(order);
              }}
              size="sm"
              className="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs gap-1.5 h-8 px-3"
            >
              <span>🚚 {t('Track Delivery', 'Jejak Penghantaran')}</span>
            </Button>
          )}

          {order.id && order.status === 'pending' && (
            <>
              {setEditingOrder && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingOrder(order);
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs gap-1.5 h-8 px-3"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{t('Edit Notes', 'Nota/Masa')}</span>
                </Button>
              )}

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({ type: 'cancel', orderId: order.id! });
                }}
                disabled={cancellingOrderId === order.id}
                variant="ghost"
                size="sm"
                className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold text-xs gap-1.5 h-8 px-3"
              >
                {cancellingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>{t('Cancel Order', 'Batal Tempahan')}</span>
              </Button>
            </>
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
  const { toast } = useToast();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditNotes(order.notes || '');
    setEditTime(order.time || '12:00');
  };

  const handleSavePendingEdit = async () => {
    if (!editingOrder || !editingOrder.id) return;
    setIsSavingEdit(true);
    try {
      const orderRef = doc(db, 'orders', editingOrder.id);
      await updateDoc(orderRef, {
        notes: editNotes,
        time: editTime,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: t('Order Updated', 'Pesanan Dikemas Kini'),
        description: t('Your order notes and serving time have been updated.', 'Nota dan masa sajian anda telah dikemas kini.'),
        variant: 'success'
      });
      setEditingOrder(null);
    } catch (err) {
      console.error('Failed to update pending order:', err);
      toast({
        title: t('Update Failed', 'Gagal Dikemas Kini'),
        description: t('Could not update order details.', 'Gagal mengemas kini pesanan.'),
        variant: 'error'
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

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
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <WawasanLoader size={52} />
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
                setEditingOrder={handleOpenEditModal}
                cancellingOrderId={cancellingOrderId}
                deletingOrderId={deletingOrderId}
                t={t}
                itemVariants={itemVariants}
              />
            );
          })}
        </motion.div>
      )}

      {/* Edit Pending Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(open: boolean) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-md bg-card border-stone-200 dark:border-white/10 text-deep-forest dark:text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-500" />
              <span>{t('Kemas Kini Nota & Masa Tempahan', 'Update Order Notes & Serving Time')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
              {t('Tukar arahan khas atau masa sajian sebelum pihak restoran mengesahkan tempahan ini.', 'Modify special notes or serving time before restaurant confirms this order.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">{t('Masa Sajian / Serving Time', 'Masa Sajian / Serving Time')}</Label>
              <Input 
                type="time" 
                value={editTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTime(e.target.value)}
                className="rounded-xl h-11 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">{t('Nota Tambahan / Special Notes', 'Nota Tambahan / Special Notes')}</Label>
              <Textarea
                value={editNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                placeholder={t('Taip nota khas (cth: Perlu meja buffet, kurang pedas, dll)', 'Type special instructions (e.g. less spicy, buffet table needed)')}
                className="rounded-xl min-h-[90px] font-sans"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              className="rounded-xl border-stone-200 dark:border-stone-700 font-bold text-xs"
            >
              {t('Batal', 'Cancel')}
            </Button>
            <Button
              onClick={handleSavePendingEdit}
              disabled={isSavingEdit}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs gap-1.5"
            >
              {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{t('Simpan Perubahan', 'Save Changes')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
