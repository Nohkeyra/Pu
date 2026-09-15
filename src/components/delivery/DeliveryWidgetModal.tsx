import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Navigation, Check, X, LayoutGrid, Smartphone, BellRing, MapPin } from 'lucide-react';
import type { Order } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

export interface DeliveryWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  exactDistanceMeters: number | null;
  geofenceBreached?: boolean;
  onSendWhatsApp: () => void | Promise<void>;
  onCallCustomer?: () => void;
  onOpenNavigation?: () => void;
  onMarkDelivered?: () => void;
  language?: 'en' | 'bm';
}

export function DeliveryWidgetModal({
  isOpen,
  onClose,
  order,
  exactDistanceMeters,
  geofenceBreached = false,
  onSendWhatsApp,
  onCallCustomer,
  onOpenNavigation,
  onMarkDelivered,
  language: propLanguage,
}: DeliveryWidgetModalProps) {
  const { language: contextLanguage } = useLanguage();
  const language = propLanguage || contextLanguage;
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setCurrentDate(
        now.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-MY', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen, language]);

  if (!isOpen) return null;

  const customerName = order.name || (language === 'bm' ? 'Pelanggan' : 'Customer');
  const orderSummary =
    order.preparationType ||
    (order.meals && order.meals.length > 0 ? order.meals.join(', ') : null) ||
    (order.quantity ? `${order.quantity} Pax` : null);

  const distanceLabel =
    exactDistanceMeters !== null
      ? exactDistanceMeters > 1000
        ? `${(exactDistanceMeters / 1000).toFixed(1)} km`
        : `${exactDistanceMeters} m`
      : language === 'bm'
      ? 'Dalam Perjalanan'
      : 'In Transit';

  return (
    <div
      id="app-widget-preview-modal"
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md pt-[env(safe-area-inset-top,16px)] pb-[env(safe-area-inset-bottom,16px)] overscroll-contain animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] bg-stone-900 text-white p-5 sm:p-6 max-h-[90dvh] overflow-y-auto border-t sm:border border-stone-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag/Grab Handle */}
        <div className="w-12 h-1.5 bg-stone-700/80 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

        {/* Modal Header Flow */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-stone-100 block">
                {language === 'bm' ? 'Widget Skrin Utama' : 'Home Screen Widget'}
              </span>
              <span className="text-[10px] text-stone-400 block">
                {language === 'bm' ? 'Pralihat Komponen Android / iOS' : 'Android / iOS Component Preview'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white rounded-full transition-colors active:scale-95 border border-stone-700/50"
            aria-label={language === 'bm' ? 'Tutup' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Clock & Date Sub-header */}
        <div className="text-center py-2 px-4 rounded-2xl bg-gradient-to-b from-stone-800/40 to-transparent border border-stone-800/50">
          <div className="text-4xl sm:text-5xl font-light tracking-tight font-sans text-stone-100 tabular-nums">
            {currentTime || '12:00'}
          </div>
          <div className="text-xs text-amber-400/90 font-medium uppercase tracking-widest mt-1">
            {currentDate}
          </div>
        </div>

        {/* Main Widget Card */}
        <div className="relative rounded-[24px] bg-gradient-to-b from-stone-800/95 via-stone-900/95 to-stone-950 p-4 sm:p-5 border border-stone-700/70 shadow-2xl shadow-black/50 backdrop-blur-2xl space-y-4 overflow-hidden ring-1 ring-white/5">
          {/* Subtle Ambient Top Rim Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent pointer-events-none" />

          {/* Widget Banner Header */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-stone-950 flex items-center justify-center text-sm font-black shadow-md shadow-amber-500/20 ring-1 ring-white/20 shrink-0">
                W
              </span>
              <div>
                <span className="font-bold text-stone-100 text-xs sm:text-[13px] block tracking-tight">
                  Restoran Wawasan
                </span>
                <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Order Tracker
                </span>
              </div>
            </div>

            <span
              className={`text-[11px] px-3 py-1 rounded-full font-mono font-bold tracking-wide shrink-0 border transition-colors ${
                geofenceBreached
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {geofenceBreached ? '🚨 TIBA (200m)' : distanceLabel}
            </span>
          </div>

          {/* Customer & Location Details Card */}
          <div className="bg-stone-950/70 p-3.5 sm:p-4 rounded-2xl border border-stone-800/90 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 block mb-0.5">
                  {language === 'bm' ? 'Nama Pelanggan' : 'Customer Name'}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white truncate">
                  {customerName}
                </h4>
              </div>

              {orderSummary && (
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/30 shrink-0">
                  {orderSummary}
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-stone-800/70">
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 block mb-1">
                {language === 'bm' ? 'Destinasi' : 'Destination'}
              </span>
              <div className="flex items-start gap-2 text-xs sm:text-[13px] text-stone-200 font-medium leading-relaxed">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">
                  {order.location || (language === 'bm' ? 'Destinasi Pelanggan' : 'Customer Destination')}
                </span>
              </div>
            </div>
          </div>

          {/* Widget Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Primary 1-Tap 'Delivered' Button */}
            {onMarkDelivered && (
              <button
                type="button"
                onClick={() => {
                  onMarkDelivered();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all shadow-lg shadow-emerald-950/60 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white active:scale-[0.98] border border-emerald-400/40 min-h-[48px]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </span>
                  <span>{language === 'bm' ? 'Selesai Hantar (Delivered)' : 'Delivered'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100 bg-emerald-700/50 px-2.5 py-1 rounded-full border border-emerald-400/20">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Notifikasi</span>
                </div>
              </button>
            )}

            {/* Quick Communication Buttons */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onSendWhatsApp();
                  onClose();
                }}
                className="min-h-[46px] py-2.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-stone-700/60 hover:border-emerald-500/40 shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp</span>
              </button>

              {onCallCustomer ? (
                <button
                  type="button"
                  onClick={() => {
                    onCallCustomer();
                    onClose();
                  }}
                  className="min-h-[46px] py-2.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-stone-700/60 hover:border-sky-500/40 shadow-sm"
                >
                  <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{language === 'bm' ? 'Telefon' : 'Call'}</span>
                </button>
              ) : null}

              {onOpenNavigation ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenNavigation();
                    onClose();
                  }}
                  className="min-h-[46px] py-2.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-stone-700/60 hover:border-amber-500/40 shadow-sm"
                >
                  <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Maps</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Customer Notification Banner */}
        <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/25 rounded-2xl flex items-start gap-3 text-xs text-emerald-300">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <BellRing className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="leading-relaxed text-[11px] sm:text-xs">
            {language === 'bm'
              ? 'Menekan butang "Delivered" akan menghantar notifikasi segera kepada pelanggan yang memuat turun dan menggunakan aplikasi.'
              : 'Pressing "Delivered" immediately sends a push notification to the customer who downloaded and uses the app.'}
          </p>
        </div>

        {/* Bottom Helper Indicator */}
        <div className="text-center pt-1 pb-1">
          <span className="text-[11px] text-stone-400 tracking-wider uppercase font-medium flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-amber-400/80" />
            {language === 'bm' ? 'Widget Skrin Utama & Notifikasi Pantas' : 'Home Screen Widget & Instant Notification'}
          </span>
        </div>
      </div>
    </div>
  );
}

