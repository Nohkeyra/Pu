import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Navigation, Check, X, LayoutGrid, Smartphone, BellRing } from 'lucide-react';
import type { Order } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface DeliveryWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  exactDistanceMeters: number | null;
  geofenceBreached: boolean;
  onSendWhatsApp: () => void;
  onCallCustomer: () => void;
  onOpenNavigation: () => void;
  onMarkDelivered?: () => void;
}

export function DeliveryWidgetModal({
  isOpen,
  onClose,
  order,
  exactDistanceMeters,
  geofenceBreached,
  onSendWhatsApp,
  onCallCustomer,
  onOpenNavigation,
  onMarkDelivered,
}: DeliveryWidgetModalProps) {
  const { language } = useLanguage();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
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
  }, [language]);

  if (!isOpen) return null;

  const customerName = order.name || 'Pelanggan';
  const orderSummary =
    order.preparationType ||
    (order.meals && order.meals.length > 0 ? order.meals.join(', ') : null) ||
    (order.quantity ? `${order.quantity} Pax` : null);

  const distanceLabel =
    exactDistanceMeters !== null
      ? exactDistanceMeters > 1000
        ? `${(exactDistanceMeters / 1000).toFixed(1)} km`
        : `${exactDistanceMeters} m`
      : 'Dalam Perjalanan';

  return (
    <div
      id="app-widget-preview-modal"
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[2.5rem] bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white p-6 shadow-2xl border-4 border-stone-800 flex flex-col justify-between min-h-[620px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Phone Notch */}
        <div className="flex justify-center mb-3">
          <div className="w-24 h-4 bg-stone-800 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-stone-900 rounded-full mr-2" />
            <div className="w-8 h-1 bg-stone-700 rounded-full" />
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-stone-800/80 hover:bg-stone-700 text-stone-300 rounded-full transition-all"
          aria-label="Tutup Pratonton"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Home Screen Header */}
        <div className="text-center space-y-1 mt-1">
          <div className="flex items-center justify-center gap-1.5 text-stone-400 text-xs font-medium">
            <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'bm' ? 'Widget Skrin Utama' : 'Home Screen Widget'}</span>
          </div>
          <div className="text-4xl font-light tracking-tight font-sans text-stone-100">
            {currentTime || '12:00'}
          </div>
          <div className="text-xs text-stone-400 font-medium capitalize">
            {currentDate}
          </div>
        </div>

        {/* Normal App Widget Card */}
        <div className="my-auto space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-800/95 to-stone-900/95 border border-stone-700/70 shadow-xl shadow-black/50 backdrop-blur-xl space-y-3">
            {/* Widget Banner Header */}
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black shadow-sm">
                  W
                </span>
                <div>
                  <span className="font-bold text-stone-100">Restoran Wawasan</span>
                  <span className="text-[10px] text-amber-400 block font-medium">Live Order Tracker</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                {geofenceBreached ? '🚨 TIBA (200m)' : distanceLabel}
              </span>
            </div>

            {/* Customer & Delivery Details */}
            <div className="space-y-1 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white truncate">{customerName}</h4>
                {orderSummary && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
                    {orderSummary}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 leading-snug line-clamp-2">
                📍 {order.location || 'Destinasi Pelanggan'}
              </p>
            </div>

            {/* Widget Action Buttons */}
            <div className="pt-1 space-y-2">
              {/* Primary 1-Tap 'Delivered' Button */}
              {onMarkDelivered && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkDelivered();
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95 border border-emerald-400/40"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{language === 'bm' ? 'Selesai Hantar (Delivered)' : 'Delivered'}</span>
                  <BellRing className="w-3.5 h-3.5 text-emerald-100 ml-auto" />
                </button>
              )}

              {/* Quick Communication Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSendWhatsApp();
                    onClose();
                  }}
                  className="py-2 px-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCallCustomer();
                    onClose();
                  }}
                  className="py-2 px-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'bm' ? 'Telefon' : 'Call'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenNavigation();
                    onClose();
                  }}
                  className="py-2 px-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                  <span>Maps</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer Push Notification Explanation Banner */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-300">
            <BellRing className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'bm'
                ? 'Menekan butang "Delivered" akan menghantar notifikasi segera kepada pelanggan yang memuat turun dan menggunakan aplikasi.'
                : 'Pressing "Delivered" immediately sends a push notification to the customer who downloaded and uses the app.'}
            </p>
          </div>
        </div>

        {/* Bottom Navigation Indicator */}
        <div className="text-center pt-2">
          <div className="w-32 h-1 bg-stone-600 rounded-full mx-auto mb-2" />
          <span className="text-[10px] text-stone-500 tracking-wider uppercase font-medium flex items-center justify-center gap-1">
            <Smartphone className="w-3 h-3" />
            {language === 'bm' ? 'Widget Skrin Utama & Notifikasi Pantas' : 'Home Screen Widget & Instant Notification'}
          </span>
        </div>
      </div>
    </div>
  );
}
