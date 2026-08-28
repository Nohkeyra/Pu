import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  X, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Send,
  Copy,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { numberToWords } from '@/services/numberToWordsBM';
import type { Order } from '@/types';
import { useOverlayAccessibility } from '@/hooks/useOverlayAccessibility';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrder: Order | null;
  t: (key: string) => string;
  language: string;
  prices: Record<string, string>;
  setPrices: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  getStatusBadge: (status?: string) => React.ReactNode;
  isApproving: boolean;
  handleCancelOrderAdmin: (id: string) => Promise<void> | void;
  handleRejectCancellation: (id: string) => Promise<void> | void;
  handleApprove: (id: string) => Promise<void> | void;
  handleRejectOrder: (id: string) => Promise<void> | void;
  handleUpdateStatus?: (id: string, status: string) => Promise<void> | void;
  openSendDialog: (order: Order) => void;
  handleTrack?: (order: Order) => void;
  handleDeleteOrder?: (id: string) => void;
}

const MEAL_LABELS: Record<string, { en: string; bm: string }> = {
  breakfast: { en: 'Breakfast', bm: 'Sarapan' },
  lunch: { en: 'Lunch', bm: 'Makan Tengahari' },
  dinner: { en: 'Dinner', bm: 'Makan Malam' },
  tea_break: { en: 'Tea Break', bm: 'Minum Petang' },
  hi_tea: { en: 'Hi-Tea', bm: 'Minum Petang (Hi-Tea)' },
};

export function OrderDetailModal({
  isOpen,
  onClose,
  selectedOrder,
  t,
  language,
  prices,
  setPrices,
  getStatusBadge,
  isApproving,
  handleCancelOrderAdmin,
  handleRejectCancellation,
  handleApprove,
  handleRejectOrder,
  handleUpdateStatus,
  openSendDialog,
  handleTrack,
  handleDeleteOrder,
}: OrderDetailModalProps) {
  const { toast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useOverlayAccessibility({ isOpen, onClose, containerRef: modalRef });

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      id="order-detail-dialog-overlay"
    >
      {/* Backdrop with blur - separate from content to avoid layout issues */}
      <div className="absolute inset-0 bg-deep-forest/80 backdrop-blur-md" />
      
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl max-h-[92vh] bg-[#faf8f5] dark:bg-[#121614] border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
        id="order-detail-dialog-container"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white/60 dark:bg-stone-900/60 backdrop-blur-md shrink-0" id="order-detail-header">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white truncate">
              {t('order_details')}
            </h2>
            {selectedOrder && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 font-mono">
                  {selectedOrder.invoiceNo || selectedOrder.id ? `Ref: ${selectedOrder.invoiceNo || selectedOrder.id}` : ''}
                </p>
                {(selectedOrder.invoiceNo || selectedOrder.id) && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      const text = selectedOrder.invoiceNo || selectedOrder.id;
                      if (!text) return;
                      
                      try {
                        const { Clipboard } = await import('@capacitor/clipboard');
                        await Clipboard.write({ string: text });
                        toast({
                          title: language === 'bm' ? "Disalin!" : "Copied!",
                          description: language === 'bm' ? "ID pesanan disalin ke papan keratan" : "Order ID copied to clipboard",
                          variant: "success",
                          duration: 2000
                        });
                      } catch (err) {
                        console.error('Clipboard failed', err);
                      }
                    }}
                    className="p-1 rounded-md hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                    title="Copy ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors shrink-0"
            aria-label="Close"
            id="order-detail-close-btn"
          >
            <X className="w-5 h-5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100" />
          </button>
        </div>

        {/* Body - Scrollable Area */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-8" id="order-detail-body">
          {selectedOrder ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Main section: All submission fields strictly aligned */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-[#181d1a] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-sm space-y-6">
                  {[
                    { 
                      label: language === 'bm' ? "EVENT DATE :" : "EVENT DATE :", 
                      value: selectedOrder.dateTime 
                        ? format(new Date(selectedOrder.dateTime), 'EEEE, d MMMM yyyy, h:mm a') 
                        : (selectedOrder.eventDate 
                            ? format(new Date(selectedOrder.eventDate), 'EEEE, d MMMM yyyy') 
                            : (selectedOrder.date ? (selectedOrder.time ? `${selectedOrder.date} @ ${selectedOrder.time}` : String(selectedOrder.date)) : '-')) 
                    },
                    { 
                      label: language === 'bm' ? "QUANTITY :" : "QUANTITY :", 
                      value: selectedOrder.quantity != null 
                        ? `${selectedOrder.quantity} pax` 
                        : (selectedOrder.guests != null ? `${selectedOrder.guests} pax` : '-') 
                    },
                    { 
                      label: language === 'bm' ? "MEALS :" : "MEALS :", 
                      value: selectedOrder.meals && selectedOrder.meals.length > 0 
                        ? selectedOrder.meals.map(m => MEAL_LABELS[m]?.[selectedOrder.lang || 'en'] || m).join(', ') 
                        : '-' 
                    },
                    { 
                      label: language === 'bm' ? "MENU DETAILS :" : "MENU DETAILS :", 
                      value: selectedOrder.menu || (selectedOrder.dishes && selectedOrder.dishes.length > 0 ? selectedOrder.dishes.join(', ') : '-') 
                    },
                    { 
                      label: language === 'bm' ? "PREPARATION TYPE :" : "PREPARATION TYPE :", 
                      value: selectedOrder.preparationType === 'meal_box' 
                        ? (language === 'bm' ? 'Meal Box' : 'Meal Box') 
                        : selectedOrder.preparationType === 'buffet' 
                          ? (language === 'bm' ? 'Buffet' : 'Buffet') 
                          : '-' 
                    },
                    { 
                      label: language === 'bm' ? "EVENT LOCATION :" : "EVENT LOCATION :", 
                      value: selectedOrder.location || '-' 
                    },
                    { 
                      label: language === 'bm' ? "SUBMITTED DATE :" : "SUBMITTED DATE :", 
                      value: (() => {
                        const d = selectedOrder.createdAt;
                        if (!d) return '-';
                        let date: Date | null = null;
                        if (d instanceof Date) {
                          date = d;
                        } else if (typeof d === 'string') {
                          date = new Date(d);
                        } else if (typeof d === 'object') {
                          if ('seconds' in d && typeof (d as any).seconds === 'number') {
                            date = new Date((d as any).seconds * 1000);
                          } else if ('_seconds' in d && typeof (d as any)._seconds === 'number') {
                            date = new Date((d as any)._seconds * 1000);
                          }
                        }
                        return date && !isNaN(date.getTime()) ? format(date, 'EEEE, d MMMM yyyy, h:mm a') : '-';
                      })() 
                    },
                    { 
                      label: language === 'bm' ? "CLIENT / ORGANIZATION :" : "CLIENT / ORGANIZATION :", 
                      value: selectedOrder.to || selectedOrder.company || '-' 
                    },
                    selectedOrder.department ? { 
                      label: language === 'bm' ? "DEPARTMENT :" : "DEPARTMENT :", 
                      value: selectedOrder.department 
                    } : null,
                    { 
                      label: language === 'bm' ? "ATTN :" : "ATTN :", 
                      value: selectedOrder.attn || '-' 
                    },
                    { 
                      label: language === 'bm' ? "CONTACT PERSON :" : "CONTACT PERSON :", 
                      value: selectedOrder.name || '-' 
                    },
                    { 
                      label: language === 'bm' ? "CONTACT NUMBER :" : "CONTACT NUMBER :", 
                      value: selectedOrder.contact || '-' 
                    },
                    selectedOrder.email ? { 
                      label: language === 'bm' ? "EMAIL ADDRESS :" : "EMAIL ADDRESS :", 
                      value: selectedOrder.email 
                    } : null,
                    selectedOrder.notes ? { 
                      label: language === 'bm' ? "NOTES :" : "NOTES :", 
                      value: selectedOrder.notes 
                    } : null,
                  ].filter(Boolean).map((field, idx) => (
                    <div key={idx} className="pb-5 border-b border-stone-100 dark:border-stone-800/80 last:border-0 last:pb-0">
                      <span className="text-[11px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-1.5">
                        {field!.label}
                      </span>
                      <p className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug break-words max-w-[70ch] whitespace-pre-line">
                        {field!.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar section: Status & Pricing */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Status Banner */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181d1a] border border-stone-200/80 dark:border-stone-800/80 shadow-sm space-y-4">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest block">Status</span>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  {handleUpdateStatus && selectedOrder.id && ['approved', 'billed', 'in_transit', 'delivered'].includes(selectedOrder.status?.toLowerCase() || '') && (
                    <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest block">
                        {language === 'bm' ? 'Kemaskini Penghantaran :' : 'Update Delivery :'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          disabled={isApproving || selectedOrder.status?.toLowerCase() === 'in_transit'}
                          onClick={() => handleUpdateStatus(selectedOrder.id!, 'in_transit')}
                          className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold h-9"
                        >
                          🚚 {language === 'bm' ? 'Transit' : 'In Transit'}
                        </Button>
                        <Button
                          size="sm"
                          disabled={isApproving || selectedOrder.status?.toLowerCase() === 'delivered'}
                          onClick={() => handleUpdateStatus(selectedOrder.id!, 'delivered')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                        >
                          ✅ {language === 'bm' ? 'Hantar' : 'Delivered'}
                        </Button>
                      </div>
                      {handleTrack && (
                        <Button
                          size="sm"
                          onClick={() => {
                            onClose();
                            handleTrack(selectedOrder);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 mt-2 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          🗺️ {language === 'bm' ? 'Jejak & Geofence' : 'Track & Geofence'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing and Grand Total */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181d1a] border border-stone-200/80 dark:border-stone-800/80 shadow-sm space-y-5">
                  <h4 className="font-bold text-stone-900 dark:text-white border-b border-stone-100 dark:border-stone-800/80 pb-3 uppercase tracking-wider text-xs">
                    {t('price_pax')}
                  </h4>
                  <div className="space-y-4">
                    {selectedOrder.meals.map((meal, idx) => (
                      <div key={`${meal}-${idx}`} className="flex flex-col gap-1.5">
                        <Label className="text-xs text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wide">
                          {MEAL_LABELS[meal]?.[selectedOrder.lang || 'en'] || meal}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">RM</span>
                          <Input
                            id={`meal-price-${meal}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices[meal] || ''}
                            onChange={(e) => setPrices(prev => ({ 
                              ...prev, 
                              [meal]: e.target.value 
                            }))}
                            className="pl-11 h-11 bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white text-base font-bold rounded-xl focus:ring-orange-500/20"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Preview */}
                  <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">{t('grand_total')}:</span>
                      <span className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400">
                        RM {selectedOrder.meals.reduce((total, meal) => {
                          const price = parseFloat(prices[meal] || '0');
                          return total + (price * selectedOrder.quantity);
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 italic leading-relaxed font-medium">
                      {numberToWords(selectedOrder.meals.reduce((total, meal) => {
                        const price = parseFloat(prices[meal] || '0');
                        return total + (price * selectedOrder.quantity);
                      }, 0), selectedOrder.lang)}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-stone-400">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
              <p className="font-medium text-sm">Loading order details...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0" id="order-detail-footer">
          {selectedOrder && (
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {selectedOrder?.status === 'cancel_requested' ? (
                <>
                  <Button
                    id="btn-approve-cancellation"
                    onClick={() => selectedOrder.id && handleCancelOrderAdmin(selectedOrder.id)}
                    disabled={isApproving}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-5 h-11 font-bold shadow-sm transition-all active:scale-95 text-sm"
                  >
                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {t('approve_cancellation') || 'Approve Cancellation'}
                  </Button>
                  <Button
                    id="btn-reject-cancellation"
                    onClick={() => selectedOrder.id && handleRejectCancellation(selectedOrder.id)}
                    disabled={isApproving}
                    variant="outline"
                    className="border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl px-5 h-11 font-bold transition-all active:scale-95 text-sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('reject_cancellation') || 'Reject Cancellation'}
                  </Button>
                </>
              ) : selectedOrder?.status === 'pending' ? (
                <>
                  <Button
                    id="btn-approve-pending"
                    onClick={() => handleApprove(selectedOrder?.id || '')}
                    disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => prices[m] === undefined || prices[m] === '' || isNaN(parseFloat(prices[m])) || parseFloat(prices[m]) < 0)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-11 font-bold shadow-sm transition-all active:scale-95 text-sm"
                  >
                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {t('approve') || 'Approve & Set Pricing'}
                  </Button>
                  <Button
                    id="btn-reject-pending"
                    onClick={() => selectedOrder?.id && handleRejectOrder(selectedOrder.id)}
                    disabled={isApproving}
                    variant="outline"
                    className="border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl px-5 h-11 font-bold transition-all active:scale-95 text-sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('reject_order') || 'Reject Order'}
                  </Button>
                </>
              ) : (selectedOrder?.status === 'approved' || selectedOrder?.status === 'billed') ? (
                <>
                  <Button
                    id="btn-update-invoice"
                    onClick={() => handleApprove(selectedOrder?.id || '')}
                    disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => prices[m] === undefined || prices[m] === '' || isNaN(parseFloat(prices[m])) || parseFloat(prices[m]) < 0)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 h-11 font-bold shadow-sm transition-all active:scale-95 text-sm"
                  >
                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {t('update_invoice') || 'Update Invoice'}
                  </Button>
                  <Button
                    id="btn-send-invoice"
                    onClick={() => selectedOrder && openSendDialog(selectedOrder)}
                    disabled={isApproving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-11 font-bold shadow-sm transition-all active:scale-95 text-sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {t('send_invoice') || 'Send Invoice'}
                  </Button>
                  <Button
                    id="btn-cancel-order"
                    onClick={() => selectedOrder?.id && handleCancelOrderAdmin(selectedOrder.id)}
                    variant="outline"
                    className="border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl px-4 h-11 font-bold transition-all active:scale-95 text-sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('cancel_order') || 'Cancel Order'}
                  </Button>
                </>
              ) : null}
              {handleDeleteOrder && selectedOrder?.id && (
                <Button
                  id="btn-delete-order-modal"
                  onClick={() => {
                    handleDeleteOrder(selectedOrder.id!);
                    onClose();
                  }}
                  variant="outline"
                  className="border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl px-4 h-11 font-bold transition-all active:scale-95 text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {language === 'bm' ? 'Padam Tempahan' : 'Delete Order'}
                </Button>
              )}
            </div>
          )}
          <Button
            id="btn-close-detail"
            variant="ghost"
            onClick={onClose}
            className="text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl px-5 h-11 font-bold text-sm ml-auto"
          >
            {t('close')}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
