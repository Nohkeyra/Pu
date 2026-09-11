import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Navigation, Check, X, LayoutGrid, Smartphone, BellRing } from 'lucide-react';
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
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm pt-[env(safe-area-inset-top,16px)] pb-[env(safe-area-inset-bottom,16px)] overscroll-contain animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-stone-900 text-white p-5 sm:p-6 max-h-[85dvh] overflow-y-auto border-t sm:border border-stone-700/60 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag/Grab Handle */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto sm:hidden -mt-1 shrink-0" />

        {/* Modal Header Flow */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-stone-200">
              {language === 'bm' ? 'Widget Skrin Utama' : 'Home Screen Widget'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center bg-stone-800/80 hover:bg-stone-700 text-stone-300 rounded-full transition-colors active:scale-95"
            aria-label={language === 'bm' ? 'Tutup' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Clock / Date Sub-header */}
        <div className="text-center py-1">
          <div className="text-3xl sm:text-4xl font-light tracking-tight font-sans text-stone-100">
            {currentTime || '12:00'}
          </div>
          <div className="text-xs text-stone-400 font-medium capitalize tracking-wide mt-0.5">
            {currentDate}
          </div>
        </div>

        {/* Main Widget Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-800/95 border border-stone-700/60 shadow-xl shadow-black/40 backdrop-blur-xl space-y-4">
          {/* Widget Banner Header */}
          <div className="flex items-center justify-between text-xs text-stone-400">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                W
              </span>
              <div>
                <span className="font-bold text-stone-100 text-xs block">Restoran Wawasan</span>
                <span className="text-[11px] text-amber-400 block font-medium">Live Order Tracker</span>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold tracking-wide shrink-0">
              {geofenceBreached ? '🚨 TIBA (200m)' : distanceLabel}
            </span>
          </div>

          {/* Customer & Location Details */}
          <div className="space-y-2 bg-stone-950/50 p-3.5 rounded-xl border border-stone-800/80">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white truncate">{customerName}</h4>
              {orderSummary && (
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 font-semibold uppercase tracking-wider shrink-0">
                  {orderSummary}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 leading-relaxed line-clamp-2">
              📍 {order.location || (language === 'bm' ? 'Destinasi Pelanggan' : 'Customer Destination')}
            </p>
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
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/15 bg-emerald-500 hover:bg-emerald-400 text-white active:scale-[0.98] border border-emerald-400/30 min-h-[46px]"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{language === 'bm' ? 'Selesai Hantar (Delivered)' : 'Delivered'}</span>
                <BellRing className="w-3.5 h-3.5 text-emerald-100 ml-auto" />
              </button>
            )}

            {/* Quick Communication Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSendWhatsApp();
                  onClose();
                }}
                className="min-h-[44px] py-2.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-stone-700/50"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>WhatsApp</span>
              </button>

              {onCallCustomer ? (
                <button
                  type="button"
                  onClick={() => {
                    onCallCustomer();
                    onClose();
                  }}
                  className="min-h-[44px] py-2.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-stone-700/50"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
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
                  className="min-h-[44px] py-2.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-stone-700/50"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Maps</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Customer Notification Banner */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
          <BellRing className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] sm:text-xs">
            {language === 'bm'
              ? 'Menekan butang "Delivered" akan menghantar notifikasi segera kepada pelanggan yang memuat turun dan menggunakan aplikasi.'
              : 'Pressing "Delivered" immediately sends a push notification to the customer who downloaded and uses the app.'}
          </p>
        </div>

        {/* Bottom Helper Indicator */}
        <div className="text-center pt-1 pb-1">
          <span className="text-[10px] text-stone-500 tracking-wider uppercase font-medium flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            {language === 'bm' ? 'Widget Skrin Utama & Notifikasi Pantas' : 'Home Screen Widget & Instant Notification'}
          </span>
        </div>
      </div>
    </div>
  );
}

