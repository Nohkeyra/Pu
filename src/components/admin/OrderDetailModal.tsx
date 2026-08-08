import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  X, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { numberToWords } from '@/services/numberToWordsBM';
import type { Order } from '@/types';

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
  openSendDialog: (order: Order) => void;
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
  openSendDialog,
}: OrderDetailModalProps) {
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full h-full max-w-5xl bg-cream dark:bg-card border border-[var(--color-sunshine-cta)]/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative text-deep-forest"
        onClick={(e) => e.stopPropagation()}
        id="order-detail-dialog-container"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-sunshine-cta)]/10 flex items-center justify-between bg-white/40 dark:bg-background/40 backdrop-blur-sm flex-shrink-0" id="order-detail-header">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white truncate">
              {t('order_details')}
            </h2>
            {selectedOrder && (
              <p className="text-xs md:text-sm text-deep-forest/60 dark:text-stone/40 mt-0.5 font-medium">
                {selectedOrder.invoiceNo || selectedOrder.id ? `Ref: ${selectedOrder.invoiceNo || selectedOrder.id}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-stone/10 transition-colors flex-shrink-0"
            aria-label="Close"
            id="order-detail-close-btn"
          >
            <X className="w-6 h-6 text-deep-forest/60 dark:text-stone/60" />
          </button>
        </div>

        {/* Body - Scrollable Area */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-10" id="order-detail-body">
          {selectedOrder ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main section: All fields */}
              <div className="lg:col-span-2 space-y-10">
                <div className="bg-white/50 dark:bg-background/20 p-6 md:p-8 rounded-3xl border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-8">
                  {[
                    { label: language === 'bm' ? "Tarikh Hantar :" : "Submitted Date :", value: (() => {
                      const d = selectedOrder.createdAt;
                      if (!d) return '-';
                      const date = d instanceof Date ? d : typeof d === 'string' ? new Date(d) : 'seconds' in d ? new Date((d as any).seconds * 1000) : '_seconds' in d ? new Date((d as any)._seconds * 1000) : null;
                      return date ? format(date, 'EEEE, d MMMM yyyy, h:mm a') : '-';
                    })() },
                    { label: language === 'bm' ? "Klien / Organisasi :" : "Client / Organization :", value: selectedOrder.to || '-' },
                    selectedOrder.department ? { label: language === 'bm' ? "Jabatan :" : "Department :", value: selectedOrder.department } : null,
                    selectedOrder.attn ? { label: language === 'bm' ? "Untuk Perhatian :" : "Attn :", value: selectedOrder.attn } : null,
                    { label: language === 'bm' ? "Pegawai Bertanggungjawab :" : "Contact Person :", value: selectedOrder.name || '-' },
                    { label: language === 'bm' ? "Nombor Telefon :" : "Contact Number :", value: selectedOrder.contact || '-' },
                    { label: language === 'bm' ? "Alamat Emel :" : "Email Address :", value: selectedOrder.email || '-' },
                    { label: language === 'bm' ? "Tarikh & Masa Acara :" : "Event Date & Time :", value: selectedOrder.dateTime ? format(new Date(selectedOrder.dateTime), 'EEEE, d MMMM yyyy, h:mm a') : '-' },
                    { label: language === 'bm' ? "Lokasi Acara :" : "Event Location :", value: selectedOrder.location || '-' },
                    { label: language === 'bm' ? "Jenis Sajian :" : "Preparation Type :", value: selectedOrder.preparationType === 'meal_box' ? (language === 'bm' ? 'Pek Makanan (Meal Box)' : 'Meal Box') : selectedOrder.preparationType === 'buffet' ? 'Buffet' : '-' },
                    { label: language === 'bm' ? "Bilangan Pax :" : "Quantity :", value: selectedOrder.quantity != null ? `${selectedOrder.quantity} pax` : '-' },
                    { label: language === 'bm' ? "Hidangan Untuk :" : "Meal For :", value: selectedOrder.meals?.map(m => MEAL_LABELS[m]?.[selectedOrder.lang || 'en'] || m).join(', ') || '-' },
                    { label: language === 'bm' ? "Butiran Menu :" : "Menu Details :", value: selectedOrder.menu || '-' },
                    { label: language === 'bm' ? "Nota :" : "Notes :", value: selectedOrder.notes || '-' },
                  ].filter(Boolean).map((field, idx) => (
                    <div key={idx} className="pb-6 border-b border-[var(--color-sunshine-cta)]/10 last:border-0 last:pb-0">
                      <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-widest block mb-2 opacity-80">
                        {field!.label}
                      </span>
                      <p className="text-lg md:text-xl font-bold text-deep-forest dark:text-white leading-relaxed break-words whitespace-pre-line">
                        {field!.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar section: Status & Pricing */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Status Banner */}
                <div className="p-6 rounded-3xl bg-white/50 dark:bg-background/20 border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-deep-forest/50 dark:text-stone/40 uppercase tracking-widest block">Status</span>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>

                {/* Pricing and Grand Total */}
                <div className="p-6 rounded-3xl bg-white/50 dark:bg-background/20 border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-6">
                  <h4 className="font-bold text-deep-forest dark:text-white border-b border-[var(--color-sunshine-cta)]/10 pb-3 uppercase tracking-wider text-sm">{t('price_pax')}</h4>
                  <div className="space-y-5">
                    {selectedOrder.meals.map((meal, idx) => (
                      <div key={`${meal}-${idx}`} className="flex flex-col gap-2">
                        <Label className="text-xs text-deep-forest/70 dark:text-stone/40 font-bold uppercase tracking-wide">
                          {MEAL_LABELS[meal]?.[selectedOrder.lang || 'en'] || meal}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-deep-forest/40">RM</span>
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
                            className="pl-12 h-12 bg-cream/30 dark:bg-background/40 border-[var(--color-sunshine-cta)]/20 text-deep-forest dark:text-white text-lg font-bold rounded-2xl focus:ring-[var(--color-sunshine-cta)]/30"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Preview */}
                  <div className="p-5 bg-[var(--color-sunshine-cta)]/5 dark:bg-background/60 rounded-2xl border border-[var(--color-sunshine-cta)]/10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-deep-forest/60 dark:text-stone/40 uppercase tracking-widest">{t('grand_total')}:</span>
                      <span className="text-2xl font-black text-[var(--color-sunshine-cta)]">
                        RM {selectedOrder.meals.reduce((total, meal) => {
                          const price = parseFloat(prices[meal] || '0');
                          return total + (price * selectedOrder.quantity);
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-deep-forest/50 dark:text-stone/50 italic leading-relaxed font-medium">
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
            <div className="h-full flex flex-col items-center justify-center space-y-4 text-deep-forest/40">
              <Loader2 className="w-12 h-12 animate-spin text-[var(--color-sunshine-cta)]" />
              <p className="font-medium">Loading order details...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/40 backdrop-blur-sm flex flex-wrap gap-3 items-center justify-end flex-shrink-0" id="order-detail-footer">
          {selectedOrder && (
            <div className="flex flex-wrap gap-2 flex-1">
              {selectedOrder?.status === 'cancel_requested' ? (
                <>
                  <Button
                    id="btn-approve-cancellation"
                    onClick={() => selectedOrder.id && handleCancelOrderAdmin(selectedOrder.id)}
                    disabled={isApproving}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                  >
                    {isApproving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    {t('approve_cancellation') || 'Approve Cancellation'}
                  </Button>
                  <Button
                    id="btn-reject-cancellation"
                    onClick={() => selectedOrder.id && handleRejectCancellation(selectedOrder.id)}
                    disabled={isApproving}
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl px-6 py-6 h-auto font-bold transition-all active:scale-95"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {t('reject_cancellation') || 'Reject Cancellation'}
                  </Button>
                </>
              ) : selectedOrder?.status === 'pending' ? (
                <>
                  <Button
                    id="btn-approve-pending"
                    onClick={() => handleApprove(selectedOrder?.id || '')}
                    disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => prices[m] === undefined || prices[m] === '' || isNaN(parseFloat(prices[m])) || parseFloat(prices[m]) < 0)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-8 py-6 h-auto font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex-1 sm:flex-none"
                  >
                    {isApproving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    {t('approve') || 'Approve & Set Pricing'}
                  </Button>
                  <Button
                    id="btn-reject-pending"
                    onClick={() => selectedOrder?.id && handleRejectOrder(selectedOrder.id)}
                    disabled={isApproving}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 rounded-2xl px-6 py-6 h-auto font-bold transition-all active:scale-95"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {t('reject_order') || 'Reject Order'}
                  </Button>
                </>
              ) : (selectedOrder?.status === 'approved' || selectedOrder?.status === 'billed') ? (
                <>
                  <Button
                    id="btn-update-invoice"
                    onClick={() => handleApprove(selectedOrder?.id || '')}
                    disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => prices[m] === undefined || prices[m] === '' || isNaN(parseFloat(prices[m])) || parseFloat(prices[m]) < 0)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    {isApproving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    {t('update_invoice') || 'Update Invoice'}
                  </Button>
                  <Button
                    id="btn-send-invoice"
                    onClick={() => selectedOrder && openSendDialog(selectedOrder)}
                    disabled={isApproving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {t('send_invoice') || 'Send Invoice'}
                  </Button>
                  <Button
                    id="btn-cancel-order"
                    onClick={() => selectedOrder?.id && handleCancelOrderAdmin(selectedOrder.id)}
                    variant="outline"
                    className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-2xl px-6 py-6 h-auto font-bold transition-all active:scale-95"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {t('cancel_order') || 'Cancel Order'}
                  </Button>
                </>
              ) : null}
            </div>
          )}
          <Button
            id="btn-close-detail"
            variant="ghost"
            onClick={onClose}
            className="text-deep-forest/60 hover:bg-stone/10 rounded-2xl px-6 py-6 h-auto font-bold"
          >
            {t('close')}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
