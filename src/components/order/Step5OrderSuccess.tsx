import React from 'react';
import { motion } from 'motion/react';
import { 
  Eye, 
  ExternalLink,
  Share2,
  MessageCircle,
  Clock3,
  Check,
  CalendarDays,
  UsersRound,
  ClipboardList,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { scheduleLocalNotification, launchWhatsApp } from '@/lib/nativeService';
import { RESTORAN_CONTACT } from '@/constants/contact';
import { getAssetUrl } from '@/lib/utils';

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
    // 1. Trigger Confetti Cannon dynamically for a delightful "unpredictable" touch!
    import('canvas-confetti').then((confettiModule) => {
      const fireConfetti = confettiModule.default || confettiModule;
      fireConfetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f69913', '#e96212', '#0c453c', '#e03f14'], // Amber, Orange, Emerald, Blue
        disableForReducedMotion: true,
        zIndex: 2000
      });
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
      className="space-y-5 text-center"
    >
      <section aria-labelledby="booking-sent-heading" className="relative overflow-hidden rounded-[1.75rem] border border-orange-200/70 bg-[#fff8ec] px-5 pb-6 pt-3 text-center shadow-sm dark:border-amber-400/15 dark:bg-[#201b16] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-14 top-16 h-40 w-40 rounded-full bg-orange-200/35 blur-3xl dark:bg-orange-500/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-4 h-36 w-36 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-400/10" />
        <div className="relative mx-auto max-w-md">
          <div className="relative mx-auto w-full max-w-[340px]">
            <img
              src={getAssetUrl('/assets/illustrations/catering-lunchbox-success.webp')}
              alt=""
              aria-hidden="true"
              width={1200}
              height={600}
              className="block h-auto w-full object-contain"
            />
            <span aria-hidden="true" className="absolute right-[9%] top-[9%] flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#377a2a] text-white shadow-md dark:border-[#201b16]">
              <Check className="h-6 w-6" strokeWidth={3} />
            </span>
          </div>
          <h2 id="booking-sent-heading" className="font-display text-3xl font-black leading-tight tracking-tight text-[#183d2b] dark:text-[#fff5e7] sm:text-4xl">
            {tText('Booking request', 'Tempahan')} <span className="text-[#d54d00] dark:text-[#ff9a2a]">{tText('sent!', 'dihantar!')}</span>
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {tText('Thank you! We will review your booking and get in touch to confirm.', 'Terima kasih! Kami akan semak tempahan anda dan menghubungi anda untuk pengesahan.')}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-xs font-bold tracking-wide text-orange-800 dark:bg-amber-500/15 dark:text-amber-300">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {tText('PENDING REVIEW', 'MENUNGGU SEMAKAN')}
          </div>
        </div>
      </section>

      <section id="booking-summary" aria-labelledby="booking-summary-heading" className="scroll-mt-24 rounded-2xl border border-orange-200/70 bg-[#fffaf2] p-4 text-left shadow-sm dark:border-white/10 dark:bg-[#211e1b] sm:p-5">
        <h3 id="booking-summary-heading" className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">{tText('Booking details', 'Butiran tempahan')}</h3>
        <div className="flex items-center gap-3 border-b border-orange-100 py-3 dark:border-white/10">
          <ClipboardList className="h-5 w-5 shrink-0 text-orange-700 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-300">{tText('Reference number', 'Nombor rujukan')}</div>
          <strong className="select-all break-all text-right text-sm text-[#183d2b] dark:text-white">{referenceNumber}</strong>
        </div>
        <div className="flex items-center gap-3 border-b border-orange-100 py-3 dark:border-white/10">
          <CalendarDays className="h-5 w-5 shrink-0 text-orange-700 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-300">{tText('Event date', 'Tarikh majlis')}</div>
          <strong className="text-right text-sm text-[#183d2b] dark:text-white">{orderState.date}</strong>
        </div>
        <div className="flex items-center gap-3 pt-3">
          <UsersRound className="h-5 w-5 shrink-0 text-orange-700 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-300">{tText('Guests', 'Bilangan tetamu')}</div>
          <strong className="text-right text-sm text-[#183d2b] dark:text-white">{orderState.guests} {tText('people', 'orang')}</strong>
        </div>
      </section>

      <a href="#booking-more-details" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ed6500] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c94f00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
        {tText('View more details', 'Lihat butiran lanjut')} <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </a>

      {/* Bill details receipt box */}
      <div id="booking-more-details" className="scroll-mt-24 bg-muted border border-stone/10 p-5 rounded-2xl text-left space-y-2.5">
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
            <span className="text-xs text-stone-500 font-medium">
              {tText('Official Invoice:', 'Invois Rasmi:')}
            </span>
            <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wide">
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
        {/* Direct WhatsApp Order Forwarding */}
        <Button
          onClick={() => {
            const message = tText(
              `*CATERING BOOKING REQUEST - RESTORAN WAWASAN PAK USOP*\n\n` +
              `*Reference No:* ${referenceNumber}\n` +
              `*Name:* ${orderState.name}\n` +
              `*Contact:* ${orderState.contact}\n` +
              `*Event Date:* ${orderState.date}\n` +
              `*Meal Block:* ${getMealTypesLabel()}\n` +
              `*Pax Count:* ${orderState.guests} pax\n\n` +
              `Hi Pak Usop / Restoran Wawasan, I have just submitted this catering request via the app. Looking forward to your quotation/confirmation!`,
              `*TEMPAHAN KATERING - RESTORAN WAWASAN PAK USOP*\n\n` +
              `*No. Rujukan:* ${referenceNumber}\n` +
              `*Nama:* ${orderState.name}\n` +
              `*Telefon:* ${orderState.contact}\n` +
              `*Tarikh Majlis:* ${orderState.date}\n` +
              `*Hidangan:* ${getMealTypesLabel()}\n` +
              `*Bilangan Pax:* ${orderState.guests} orang\n\n` +
              `Salam Pak Usop / Restoran Wawasan, saya telah menghantar tempahan katering ini melalui aplikasi. Mohon semakan dan sebut harga/pengesahan lanjut. Terima kasih!`
            );
            launchWhatsApp({
              phone: RESTORAN_CONTACT.whatsappRaw,
              message
            });
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-13 rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
        >
          <MessageCircle className="w-5 h-5 text-white fill-white" />
          <span>{tText('Forward Order to WhatsApp (017-3157731)', 'Hantar Tempahan ke WhatsApp (017-3157731)')}</span>
        </Button>

        <Button
          onClick={() => setShowPdfPreviewModal(true)}
          className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-stone-950 h-12 rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Eye className="w-5 h-5 text-white dark:text-stone-950" />
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
