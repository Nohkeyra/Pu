import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { Order } from '@/types';
import { getAssetUrl, formatDateDisplay } from '@/lib/utils';
import { 
  Download, 
  X, 
  CheckCircle, 
  Clock, 
  Copy, 
  Share2, 
  Printer, 
  Check, 
  RotateCcw,
  Sparkles,
  Building2,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { triggerLightImpact, triggerNotification, NotificationType } from '@/lib/haptics';
import { launchWhatsApp } from '@/lib/nativeService';
import { RESTORAN_CONTACT } from '@/constants/contact';

export interface CustomerInvoicePreviewModalProps {
  isOpen: boolean; 
  onClose?: () => void;
  order?: Order;
  onDownload?: () => void;
  language?: 'en' | 'bm';
  isFinal?: boolean;
}

export function CustomerInvoicePreviewModal({ 
  isOpen, 
  onClose, 
  order, 
  onDownload, 
  language = 'bm',
  isFinal = false 
}: CustomerInvoicePreviewModalProps) {
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);
  const [isFolded, setIsFolded] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsFolded(false);
      triggerLightImpact();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const invoiceNo = order?.invoiceNo || order?.officialInvoiceNo || order?.orderId || `RW PREVIEW`;
  const dateStr = formatDateDisplay(order?.eventDate || order?.dateTime || order?.date || new Date());

  const totalAmount = order?.totalAmount || (order?.quantity ? order.quantity * 15 : 150);
  const isOrderFinal = isFinal || ['approved', 'billed', 'in_transit', 'delivered'].includes(order?.status?.toLowerCase() || '');
  
  const mealCount = order?.meals?.length || 1;
  const qty = order?.quantity || order?.guests || 1;
  const minPricePerPax = 12;
  const maxPricePerPax = 22;
  const minTotal = qty * minPricePerPax * mealCount;
  const maxTotal = qty * maxPricePerPax * mealCount;
  
  const priceRangeStr = `RM ${minPricePerPax.toFixed(2)} - RM ${maxPricePerPax.toFixed(2)}`;
  const totalRangeStr = `RM ${minTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} - RM ${maxTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleCopyBank = async () => {
    try {
      const text = `Bank: Bank Muamalat Malaysia Berhad\nNama: RESTORAN WAWASAN\nNo Akaun: 16010000405710\nJumlah: ${isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}`;
      await navigator.clipboard.writeText(text);
      setCopiedBank(true);
      triggerNotification(NotificationType.Success);
      setTimeout(() => setCopiedBank(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyInvoiceNo = async () => {
    try {
      await navigator.clipboard.writeText(invoiceNo);
      setCopiedInvoiceNo(true);
      triggerLightImpact();
      setTimeout(() => setCopiedInvoiceNo(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    triggerLightImpact();
    const customerName = order?.name || order?.to || 'Pelanggan';
    const msg = language === 'bm' 
      ? `Salam Sejahtera Restoran Wawasan,\n\nSaya ingin merujuk invois katering saya:\n🧾 No Invois: *${invoiceNo}*\n👤 Nama: *${customerName}*\n📅 Tarikh Majlis: *${dateStr}*\n👥 Kuantiti: *${qty} Pax*\n💰 Jumlah: *${isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}*\n\nMohon semakan dan maklum balas lanjut. Terima kasih!`
      : `Hello Restoran Wawasan,\n\nI would like to refer to my catering invoice:\n🧾 Invoice No: *${invoiceNo}*\n👤 Name: *${customerName}*\n📅 Event Date: *${dateStr}*\n👥 Quantity: *${qty} Pax*\n💰 Total: *${isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}*\n\nThank you!`;
    
    launchWhatsApp({
      phone: RESTORAN_CONTACT.whatsappRaw,
      message: msg
    });
  };

  const handlePrint = () => {
    triggerLightImpact();
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={language === 'bm' ? 'Pratonton Invois Katering Lipatan Kertas' : 'Origami Paper Catering Invoice Preview'}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl my-auto flex flex-col items-center justify-center relative"
        style={{ perspective: 1400 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Control Pill */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-lg">
              {isOrderFinal ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  {language === 'bm' ? 'Invois Rasmi Disahkan' : 'Official Verified Invoice'}
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  {language === 'bm' ? 'Sebut Harga / Invois Awal' : 'Preliminary Quotation'}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Origami Fold / Unfold Interactive Toggle */}
            <button
              onClick={() => {
                triggerLightImpact();
                setIsFolded(!isFolded);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-800/80 hover:bg-stone-700/80 text-stone-200 border border-stone-600/50 backdrop-blur-md transition-all shadow-md active:scale-95"
              title={isFolded ? 'Buka Kertas Lipatan' : 'Lipat Semula Kertas'}
            >
              <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-500 ${isFolded ? 'rotate-180 text-amber-400' : 'text-stone-300'}`} />
              <span className="hidden sm:inline">{isFolded ? (language === 'bm' ? 'Buka Kertas' : 'Unfold Paper') : (language === 'bm' ? 'Lipat Kertas' : 'Fold Paper')}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-600/50 backdrop-blur-md transition-colors shadow-md"
              aria-label="Tutup Paparan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Realistic Origami Paper Container */}
        <motion.div 
          ref={modalContentRef}
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full relative select-text"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Main Paper Sheet with authentic tactile parchment tone & grain shadow */}
          <div className="w-full bg-[#fcfaf7] dark:bg-[#181d1a] text-stone-900 dark:text-stone-100 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,168,83,0.18)] border border-amber-900/10 dark:border-amber-500/20 overflow-hidden flex flex-col relative">

            {/* Perforated Top Receipt Edge */}
            <div className="w-full h-3 bg-[#f3ede4] dark:bg-[#121614] relative overflow-hidden flex items-center justify-between px-1 opacity-75 border-b border-stone-300/40 dark:border-stone-700/40">
              <div className="w-full flex justify-between gap-1 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-stone-400/30 dark:bg-stone-600/40 shrink-0" />
                ))}
              </div>
            </div>

            {/* ======================================================== */}
            {/* SEGMENT 1: TOP HEADER & COMPANY IDENTITY (ORIGAMI FOLD 1) */}
            {/* ======================================================== */}
            <motion.div 
              initial={{ rotateX: -65, opacity: 0.2 }}
              animate={{ 
                rotateX: isFolded ? -75 : 0, 
                opacity: isFolded ? 0.35 : 1,
                y: isFolded ? -20 : 0
              }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
              className="p-5 sm:p-7 border-b border-dashed border-stone-300 dark:border-stone-700/80 relative bg-gradient-to-b from-[#faf6ef] to-[#fcfaf7] dark:from-[#1b221e] dark:to-[#181d1a]"
            >
              {/* Subtle Fold Shadow Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Brand & Address */}
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img 
                      src={getAssetUrl('/assets/brand/wawasan_logo.svg')} 
                      alt="Restoran Wawasan" 
                      className="w-16 h-16 object-contain rounded-xl bg-white dark:bg-stone-900 p-1.5 shadow-sm border border-amber-500/20"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('.png')) {
                          target.src = getAssetUrl('/assets/brand/wawasan_logo.png');
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white font-display">
                        RESTORAN WAWASAN
                      </h1>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        EST. PUTRAJAYA
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                      Tel: 017-858 2642 • WA: 017-315 7721 • Email: wawasan.orders@gmail.com
                    </p>
                  </div>
                </div>

                {/* Invoice Reference Capsule */}
                <div className="w-full sm:w-auto bg-stone-100/90 dark:bg-stone-900/90 p-3 rounded-xl border border-stone-200 dark:border-stone-700/80 shadow-sm flex sm:flex-col justify-between items-end">
                  <div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      {language === 'bm' ? 'No. Rujukan Invois' : 'Invoice Reference'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-base font-mono font-bold text-amber-600 dark:text-amber-400">
                        {invoiceNo}
                      </span>
                      <button
                        onClick={handleCopyInvoiceNo}
                        className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        title="Salin No Invois"
                      >
                        {copiedInvoiceNo ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Origami Crease Line 1 with subtle 3D ridge */}
            <div className="relative h-2 w-full bg-[#f5ede0] dark:bg-[#141a17] border-y border-stone-300/60 dark:border-stone-700/60 flex items-center justify-center">
              <div className="w-24 h-0.5 bg-amber-500/20 rounded-full" />
            </div>

            {/* ======================================================== */}
            {/* SEGMENT 2: CLIENT DETAILS & ITEMIZED DISH TABLE (ORIGAMI FOLD 2) */}
            {/* ======================================================== */}
            <motion.div 
              initial={{ rotateX: 45, opacity: 0.3 }}
              animate={{ 
                rotateX: isFolded ? 60 : 0, 
                opacity: isFolded ? 0.4 : 1,
                y: isFolded ? -10 : 0
              }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
              className="p-5 sm:p-7 space-y-5 bg-[#fcfaf7] dark:bg-[#181d1a] relative"
            >
              {/* Fold Crease Shadow */}
              <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/5 to-transparent pointer-events-none" />

              {/* Client & Booking Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {language === 'bm' ? 'Invois Kepada (Pelanggan)' : 'Invoiced To'}
                  </h3>
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                    {order?.to || order?.name || 'Pelanggan Dihormati'}
                  </p>
                  {order?.department && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">{order.department}</p>
                  )}
                  {order?.attn && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">Attn: {order.attn}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                    {language === 'bm' ? 'Maklumat Majlis & Lokasi' : 'Event & Delivery Details'}
                  </h3>
                  <p className="text-xs text-stone-700 dark:text-stone-300">
                    <span className="font-medium text-stone-500">{language === 'bm' ? 'Tarikh / Masa:' : 'Date / Time:'}</span>{' '}
                    <span className="font-bold text-stone-900 dark:text-stone-100">{order?.dateTime || dateStr}</span>
                  </p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
                    <span className="font-medium text-stone-500">{language === 'bm' ? 'Lokasi:' : 'Location:'}</span>{' '}
                    <span>{order?.location || 'Restoran Wawasan (Dine-in / Pickup)'}</span>
                  </p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
                    <span className="font-medium text-stone-500">{language === 'bm' ? 'No. Telefon:' : 'Phone:'}</span>{' '}
                    <span>{order?.contact || '-'}</span>
                  </p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-stone-900/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-[11px] uppercase tracking-wider font-bold border-b border-stone-200 dark:border-stone-700">
                      <th className="py-2.5 px-3 sm:px-4">{language === 'bm' ? 'Butiran / Pakej Hidangan' : 'Description / Menu Item'}</th>
                      <th className="py-2.5 px-3 text-center">{language === 'bm' ? 'Kadar / Pax' : 'Rate / Pax'}</th>
                      <th className="py-2.5 px-3 text-center">{language === 'bm' ? 'Kuantiti' : 'Qty'}</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">{language === 'bm' ? 'Jumlah (RM)' : 'Subtotal'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800 text-xs">
                    {order?.meals && order.meals.length > 0 ? (
                      order.meals.map((meal, idx) => {
                        const mealPriceRaw = order?.prices?.[meal] as unknown;
                        const mealPrice = mealPriceRaw !== undefined && mealPriceRaw !== null && mealPriceRaw !== '' ? Number(mealPriceRaw) : null;
                        const qty = order?.quantity || 1;
                        const mealCount = order?.meals?.length || 1;
                        const pricePerPax = mealPrice !== null ? mealPrice : (totalAmount / (qty * mealCount));
                        const mealSubtotal = mealPrice !== null ? mealPrice * qty : (totalAmount / mealCount);

                        return (
                          <tr key={idx} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/30 transition-colors">
                            <td className="py-3 px-3 sm:px-4 font-semibold text-stone-800 dark:text-stone-200 capitalize">
                              {String(meal).replace(/_/g, ' ')}
                              {idx === 0 && order?.menu && (
                                <div className="text-[11px] text-stone-500 font-normal mt-0.5">
                                  {order.menu}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-medium text-stone-700 dark:text-stone-300">
                              {isOrderFinal ? `RM ${pricePerPax.toFixed(2)}` : priceRangeStr}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-amber-700 dark:text-amber-400">
                              {qty} Pax
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-stone-900 dark:text-white">
                              {isOrderFinal ? `RM ${mealSubtotal.toFixed(2)}` : totalRangeStr}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 px-3 sm:px-4 font-semibold text-stone-800 dark:text-stone-200">
                          {order?.menu || (language === 'bm' ? 'Pakej Katering Selera Tradisi Melayu' : 'Traditional Malay Catering Package')}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-medium text-stone-700 dark:text-stone-300">
                          {isOrderFinal ? `RM ${((order?.quantity || 1) > 0 ? totalAmount / (order?.quantity || 1) : totalAmount).toFixed(2)}` : priceRangeStr}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-700 dark:text-amber-400">
                          {order?.quantity || 1} Pax
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-stone-900 dark:text-white">
                          {isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Origami Crease Line 2 with subtle 3D ridge */}
            <div className="relative h-2 w-full bg-[#f5ede0] dark:bg-[#141a17] border-y border-stone-300/60 dark:border-stone-700/60 flex items-center justify-center">
              <div className="w-24 h-0.5 bg-amber-500/20 rounded-full" />
            </div>

            {/* ======================================================== */}
            {/* SEGMENT 3: TOTALS, RUBBER STAMP & PAYMENT (ORIGAMI FOLD 3) */}
            {/* ======================================================== */}
            <motion.div 
              initial={{ rotateX: -35, opacity: 0.2 }}
              animate={{ 
                rotateX: isFolded ? -55 : 0, 
                opacity: isFolded ? 0.4 : 1,
                y: isFolded ? 10 : 0
              }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
              className="p-5 sm:p-7 bg-gradient-to-b from-[#fcfaf7] to-[#faf6ef] dark:from-[#181d1a] dark:to-[#1b221e] space-y-5 relative"
            >
              {/* Grand Total & Bank Payment Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Bank Account Details Pill */}
                <div className="bg-amber-50/70 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 relative group">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      {language === 'bm' ? 'Akaun Bank Rasmi' : 'Official Bank Details'}
                    </h4>
                    <button
                      onClick={handleCopyBank}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
                    >
                      {copiedBank ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{language === 'bm' ? 'Disalin!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{language === 'bm' ? 'Salin Bank' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-stone-800 dark:text-stone-200">
                    <span className="font-semibold">Bank:</span> Bank Muamalat Malaysia
                  </p>
                  <p className="text-xs text-stone-800 dark:text-stone-200">
                    <span className="font-semibold">{language === 'bm' ? 'Penerima:' : 'Payee:'}</span> RESTORAN WAWASAN
                  </p>
                  <p className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                    16010000-405710
                  </p>
                </div>

                {/* Grand Total Calculation Block */}
                <div className="flex flex-col justify-end space-y-1.5 text-right bg-stone-100/70 dark:bg-stone-900/60 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                    <span>{language === 'bm' ? 'Jumlah Kasar:' : 'Subtotal:'}</span>
                    <span className="font-mono">{isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400 pb-1.5 border-b border-stone-200 dark:border-stone-700">
                    <span>{language === 'bm' ? 'Cukai Perkhidmatan (0%):' : 'Tax / SST (0%):'}</span>
                    <span className="font-mono">RM 0.00</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                      {language === 'bm' ? 'Jumlah Bersih:' : 'Grand Total:'}
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-amber-600 dark:text-amber-400">
                      {isOrderFinal ? `RM ${totalAmount.toFixed(2)}` : totalRangeStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Realistic Malaysian Rubber Stamp Seal */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800 gap-4">
                
                {/* Authentic Rubber Stamp */}
                <div 
                  className="relative p-2.5 rounded-lg border-2 border-dashed border-red-600/70 dark:border-red-500/70 rotate-[-4deg] bg-red-500/5 select-none shadow-xs"
                  style={{ maskImage: 'radial-gradient(circle, black 70%, transparent 100%)' }}
                >
                  <div className="border border-red-600/60 dark:border-red-500/60 px-3 py-1 rounded text-center">
                    <div className="text-[9px] font-black tracking-widest text-red-700 dark:text-red-400 uppercase">
                      RESTORAN WAWASAN
                    </div>
                    <div className="text-[11px] font-black tracking-widest text-red-600 dark:text-red-400 uppercase my-0.5">
                      ★ {isOrderFinal ? 'DISAHKAN / APPROVED' : 'SEBUT HARGA / QUOTE'} ★
                    </div>
                    <div className="text-[8px] font-semibold text-red-700/80 dark:text-red-400/80">
                      PUTRAJAYA • BAHAGIAN KATERING
                    </div>
                  </div>
                </div>

                {/* Footer Microcopy */}
                <div className="text-center sm:text-right text-[11px] text-stone-500 dark:text-stone-400">
                  <p className="font-semibold text-stone-700 dark:text-stone-300">
                    {language === 'bm' ? 'Terima kasih atas tempahan anda.' : 'Thank you for choosing Restoran Wawasan.'}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Sistem Tempahan & Pengurusan Katering Digital
                  </p>
                </div>
              </div>

            </motion.div>

            {/* Perforated Bottom Tear Line with Sawtooth */}
            <div className="w-full h-3 bg-[#f3ede4] dark:bg-[#121614] relative overflow-hidden flex items-center justify-between px-1 opacity-75 border-t border-stone-300/40 dark:border-stone-700/40">
              <div className="w-full flex justify-between gap-1 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-stone-400/30 dark:bg-stone-600/40 shrink-0" />
                ))}
              </div>
            </div>

            {/* ======================================================== */}
            {/* ACTION TEAR-STRIP (BOTTOM QUICK CONTROLS) */}
            {/* ======================================================== */}
            <div className="px-5 py-3.5 bg-stone-100/90 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750 transition-all shadow-xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-500" />
                  <span>{language === 'bm' ? 'Cetak' : 'Print'}</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-950 dark:text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all shadow-xs active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'bm' ? 'WhatsApp Invois' : 'WhatsApp Share'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onDownload && (
                  <button
                    onClick={() => {
                      triggerLightImpact();
                      onDownload();
                      if (onClose) onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                >
                  {language === 'bm' ? 'Tutup' : 'Close'}
                </button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
