import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  Send, 
  X, 
  Mail, 
  Loader2, 
  MessageSquare 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order } from '@/types';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendOrder: Order | null;
  t: (key: string) => string;
  recipientEmail: string;
  setRecipientEmail: (val: string) => void;
  recipientPhone: string;
  setRecipientPhone: (val: string) => void;
  sendingEmail: boolean;
  handleSendEmail: () => Promise<void> | void;
  handleSendWhatsApp: () => void;
  language?: string;
}

const getDisplayInvoiceNo = (order: Order): string => {
  if (order.invoiceNo) return order.invoiceNo;
  if (order.id) return `RW-${order.id.substring(0, 6).toUpperCase()}`;
  return 'RW-------';
};

export function SendInvoiceModal({
  isOpen,
  onClose,
  sendOrder,
  t,
  recipientEmail,
  setRecipientEmail,
  recipientPhone,
  setRecipientPhone,
  sendingEmail,
  handleSendEmail,
  handleSendWhatsApp,
}: SendInvoiceModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-6"
      id="send-invoice-dialog-overlay"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-deep-forest/80 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="w-full h-auto max-h-[95vh] max-w-xl bg-cream dark:bg-card border border-[var(--color-sunshine-cta)]/30 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative z-[2001]"
        onClick={(e) => e.stopPropagation()}
        id="send-invoice-dialog-container"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[var(--color-sunshine-cta)]/10 flex items-center justify-between bg-white/40 dark:bg-background/40 backdrop-blur-md flex-shrink-0" id="send-invoice-header">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--color-sunshine-cta)]/10 rounded-2xl">
              <Send className="w-6 h-6 text-[var(--color-sunshine-cta)]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white">
                {t('send_invoice_pdf')}
              </h2>
              <p className="text-xs text-deep-forest/50 font-medium">
                {t('send_invoice_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone/10 transition-all hover:rotate-90"
            aria-label="Close"
            id="send-invoice-close-btn"
          >
            <X className="w-6 h-6 text-deep-forest/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8" id="send-invoice-body">
          {sendOrder && (
            <div className="space-y-8">
              {/* Summary Box */}
              <div className="p-6 bg-white/60 dark:bg-background/20 rounded-[2rem] border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--color-sunshine-cta)]/5 pb-3">
                  <span className="text-xs font-black text-deep-forest/40 uppercase tracking-widest">{t('invoice_no_label')}</span>
                  <span className="font-mono font-bold text-deep-forest dark:text-white">
                    {getDisplayInvoiceNo(sendOrder)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--color-sunshine-cta)]/5 pb-3">
                  <span className="text-xs font-black text-deep-forest/40 uppercase tracking-widest">{t('customer_label')}</span>
                  <span className="font-bold text-deep-forest dark:text-white">{sendOrder.to}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-black text-deep-forest/40 uppercase tracking-widest">{t('grand_total_label')}</span>
                  <span className="text-xl font-black text-[var(--color-sunshine-cta)]">
                    RM {(sendOrder.totalAmount || sendOrder.meals.reduce((sum, meal) => {
                      const price = sendOrder.prices?.[meal] || 0;
                      return sum + (price * sendOrder.quantity);
                    }, 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-6">
                {/* Email Option */}
                <div className="p-6 rounded-[2rem] border border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/20 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="font-bold text-deep-forest dark:text-white">{t('option_email')}</span>
                  </div>
                  <p className="text-xs text-deep-forest/60 leading-relaxed italic">
                    {t('email_desc')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="send-email-input" className="text-[10px] font-black text-deep-forest/40 uppercase tracking-widest ml-1">
                      {t('recipient_email')}
                    </Label>
                    <Input
                      id="send-email-input"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="bg-white/40 dark:bg-background/40 border-[var(--color-sunshine-cta)]/10 text-deep-forest dark:text-white focus:ring-[var(--color-sunshine-cta)]/30 h-14 rounded-2xl text-base px-5 font-medium"
                      placeholder="customer@email.com"
                    />
                  </div>
                  {sendingEmail && (
                    <p className="text-xs font-semibold text-[var(--color-sunshine-cta)]" role="status" aria-live="polite">
                      {t('sending_invoice') || 'Sending invoice email…'}
                    </p>
                  )}
                  <Button
                    id="btn-send-email-confirm"
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !recipientEmail}
                    aria-busy={sendingEmail}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl h-14 text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    {sendingEmail ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('sending')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 justify-center">
                        <Mail className="w-5 h-5" />
                        {t('send_invoice_email')}
                      </span>
                    )}
                  </Button>
                </div>

                {/* WhatsApp Option */}
                <div className="p-6 rounded-[2rem] border border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/20 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-bold text-deep-forest dark:text-white">{t('option_whatsapp')}</span>
                  </div>
                  <p className="text-xs text-deep-forest/60 leading-relaxed italic">
                    {t('whatsapp_desc')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="send-phone-input" className="text-[10px] font-black text-deep-forest/40 uppercase tracking-widest ml-1">
                      {t('recipient_phone')}
                    </Label>
                    <Input
                      id="send-phone-input"
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="bg-white/40 dark:bg-background/40 border-[var(--color-sunshine-cta)]/10 text-deep-forest dark:text-white focus:ring-emerald-500/30 h-14 rounded-2xl text-base px-5 font-medium"
                      placeholder="e.g. 0123456789"
                    />
                  </div>
                  <Button
                    id="btn-send-whatsapp-confirm"
                    onClick={handleSendWhatsApp}
                    disabled={!recipientPhone}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-14 text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    <span className="flex items-center gap-3 justify-center">
                      <MessageSquare className="w-5 h-5" />
                      {t('open_whatsapp')}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/40 backdrop-blur-md flex justify-end flex-shrink-0" id="send-invoice-footer">
          <Button
            id="btn-send-invoice-cancel"
            variant="ghost"
            onClick={onClose}
            className="text-deep-forest/40 hover:text-deep-forest hover:bg-stone/10 rounded-2xl px-10 py-7 h-auto font-black uppercase tracking-widest transition-all"
          >
            {t('cancel')}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
