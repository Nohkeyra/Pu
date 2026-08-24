import React from 'react';
import { motion } from 'motion/react';
import { 
  Eye, 
  ExternalLink,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuccessState } from '@/components/ui/SuccessState';
import { scheduleLocalNotification } from '@/lib/nativeService';

interface OrderState {
  name: string;
  contact: string;
  date: string;
  email: string;
  mealTypes: ('sarapan' | 'tengahari' | 'hitea')[];
  guests: number;
}

interface Step5OrderSuccessProps {
  orderState: OrderState;
  referenceNumber: string;
  getMealTypesLabel: () => string;
  emailStatus: 'idle' | 'sending' | 'success' | 'failed';
  setShowPdfPreviewModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleResetForm: () => void;
  handleShareReceipt: () => void;
  tText: (en: string, bm: string) => string;
}

export function Step5OrderSuccess({
  orderState,
  referenceNumber,
  getMealTypesLabel,
  emailStatus,
  setShowPdfPreviewModal,
  handleResetForm,
  handleShareReceipt,
  tText,
}: Step5OrderSuccessProps) {
  React.useEffect(() => {
    // 1. Trigger Confetti Cannon for a delightful "unpredictable" touch!
    import('canvas-confetti').then((mod) => {
      const fn = mod.default || mod;
      if (typeof fn === 'function') {
        fn({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f69913', '#e96212', '#0c453c', '#e03f14'], // Amber, Orange, Emerald, Blue
          disableForReducedMotion: true,
          zIndex: 2000
        });
      }
    }).catch(() => {});

    // 2. Trigger native notification
    scheduleLocalNotification({
      id: Math.floor(Math.random() * 100000),
      title: tText('Catering Request Received! 🍲', 'Tempahan Katering Diterima! 🍲'),
      body: tText(
        `Thank you ${orderState.name}! Reference No: ${referenceNumber}. We will verify your menu shortly.`,
        `Terima kasih ${orderState.name}! No Rujukan: ${referenceNumber}. Kami akan mengesahkan menu anda segera.`
      ),
      delaySeconds: 1
    });
  }, [orderState.name, referenceNumber, tText]);

  return (
    <motion.div
      key="step5"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="space-y-6 text-center"
    >
      <SuccessState
        title={tText('Booking Request Sent!', 'Tempahan Dihantar!')}
        subtitle={tText(
          'Thank you. Restoran Wawasan will review your booking details and contact you within 24 hours to confirm.',
          'Terima kasih. Pihak Restoran Wawasan akan menyemak butiran dan menghubungi anda dalam masa 24 jam untuk pengesahan.'
        )}
        className="shadow-md"
      />

      {/* Bill details receipt box */}
      <div className="bg-muted border border-stone/10 p-5 rounded-2xl text-left space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone">{tText('Reference Number:', 'Nombor Rujukan')}</span>
          <span className="font-bold text-deep-forest text-sm tracking-wider select-all">{referenceNumber}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone">{tText('PIC Name:', 'Nama')}</span>
          <span className="font-bold text-deep-forest">{orderState.name}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone">{tText('PIC Contact:', 'Telefon')}</span>
          <span className="font-bold text-deep-forest">{orderState.contact}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone">{tText('Event Date:', 'Tarikh Majlis')}</span>
          <span className="font-bold text-deep-forest">{orderState.date}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-stone">{tText('Meal serving:', 'Hidangan Untuk')}</span>
          <span className="font-bold text-deep-forest">
            {getMealTypesLabel()}
          </span>
        </div>
        
        <div className="border-t border-stone/10 pt-2.5 mt-2 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-deep-forest uppercase tracking-wider">
              {tText('Est. Price per Pax:', 'Anggaran Harga per Pax:')}
            </span>
            <span className="text-xs font-bold text-deep-forest select-all">
              RM {(12 * (orderState.mealTypes.length || 1)).toFixed(2)} - RM {(22 * (orderState.mealTypes.length || 1)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-deep-forest uppercase tracking-wider">
              {tText('Estimated Total:', 'Anggaran Jumlah Kasar:')}
            </span>
            <span className="text-sm font-black text-orange-600 dark:text-orange-400 select-all">
              RM {((orderState.guests || 1) * 12 * (orderState.mealTypes.length || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })} - RM {((orderState.guests || 1) * 22 * (orderState.mealTypes.length || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-stone/10">
            <span className="text-[10px] text-stone-500 font-medium">
              {tText('Official Invoice:', 'Invois Rasmi:')}
            </span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wide">
              {tText('Quotation Pending (Awaiting Admin Billing)', 'Menunggu Sebut Harga (Menunggu Admin)')}
            </span>
          </div>
        </div>
      </div>

      {/* Email Delivery relay receipt check */}
      <div className="p-4 bg-card rounded-2xl border border-stone/10 text-left space-y-2.5 shadow-sm" aria-live="polite">
        <span className="microcopy-12-upper text-stone font-bold uppercase tracking-wider block">
          {tText('INVOICE / RECEIPT STATUS', 'STATUS PENGHANTARAN INVOIS')}
        </span>

        <div className="space-y-1.5 text-xs text-stone">
          <p className="flex items-center gap-1.5 text-deep-forest font-semibold">
            <span className="text-deep-forest">✓</span>
            <span>{tText('Preliminary PDF generated', 'Invois PDF dihasilkan')}</span>
          </p>
          
          {emailStatus === 'sending' && (
            <p className="flex items-center gap-1.5 animate-pulse text-crisp-carrot">
              <span className="text-crisp-carrot font-bold">●</span>
              <span>{tText('Mailing PDF copy...', 'Sedang menghantar salinan emel...')}</span>
            </p>
          )}

          {emailStatus === 'success' && (
            <p className="flex items-center gap-1.5 text-deep-forest font-semibold">
              <span className="text-deep-forest">✓</span>
              <span>{tText(`E-mailed copy successfully to ${orderState.email}`, `Salinan invois emel berjaya dihantar ke ${orderState.email}`)}</span>
            </p>
          )}

          {emailStatus === 'failed' && (
            <p className="flex items-center gap-1.5 text-rose-600 font-semibold">
              <span className="text-rose-600 font-bold">×</span>
              <span>{tText('SMTP delivery deferred. Admin will send copy manually.', 'Penghantaran emel tertangguh. Invois akan dihantar manual.')}</span>
            </p>
          )}
        </div>
      </div>

      <p className="microcopy-12-upper text-stone italic">
        {tText('Please save or share this reference number for future inquiries.', 'Sila simpan nombor rujukan ini untuk rujukan masa hadapan.')}
      </p>

      {/* Success Screen Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          onClick={() => setShowPdfPreviewModal(true)}
          className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white h-12 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
        >
          <Eye className="w-5 h-5 text-white" />
          <span>{tText('Preview & Download PDF Invoice', 'Pratonton & Muat Turun Invois PDF')}</span>
        </Button>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleResetForm}
            variant="outline"
            className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
          >
            {tText('New Order Inquiry', 'Tempahan Baharu')}
          </Button>
          
          <Button
            onClick={handleShareReceipt}
            variant="outline"
            className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-deep-forest cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4 text-crisp-carrot" />
            <span>{tText('Share Invoice / Receipt', 'Kongsi Resit')}</span>
          </Button>
        </div>

        <a
          href="/history"
          className="w-full h-12 rounded-2xl border border-stone/15 dark:border-white/10 flex items-center justify-center gap-2 text-deep-forest dark:text-white font-bold text-sm hover:bg-muted/50 transition-colors"
        >
          <span>{tText('View Transaction Logs', 'Lihat Log Transaksi')}</span>
          <ExternalLink className="w-4 h-4 text-stone" />
        </a>
      </div>
    </motion.div>
  );
}
