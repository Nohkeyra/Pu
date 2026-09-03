import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Navigation, Check, X, Shield, Lock, Smartphone } from 'lucide-react';
import type { Order } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface LockScreenWidgetModalProps {
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

export function LockScreenWidgetModal({
  isOpen,
  onClose,
  order,
  exactDistanceMeters,
  geofenceBreached,
  onSendWhatsApp,
  onCallCustomer,
  onOpenNavigation,
  onMarkDelivered,
}: LockScreenWidgetModalProps) {
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
          month: 'long',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  if (!isOpen) return null;

  const invoiceNo = order.invoiceNo || order.id?.substring(0, 8).toUpperCase() || 'ORDER';
  const customerName = order.name || 'Pelanggan Katering';
  const distanceLabel =
    exactDistanceMeters !== null
      ? exactDistanceMeters > 1000
        ? `${(exactDistanceMeters / 1000).toFixed(1)} km`
        : `${exactDistanceMeters} m`
      : 'Dalam Perjalanan';

  return (
    <div
      id="lockscreen-widget-preview-modal"
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[2.5rem] bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white p-6 shadow-2xl border-4 border-stone-800 flex flex-col justify-between min-h-[620px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Phone Speaker / Camera Notch */}
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

        {/* Lock Screen Header: Clock & Lock Icon */}
        <div className="text-center space-y-1 mt-2">
          <div className="flex items-center justify-center gap-1.5 text-stone-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'bm' ? 'Skrin Terkunci (Lock Screen)' : 'Locked Screen'}</span>
          </div>
          <div className="text-5xl font-extralight tracking-tight font-sans text-stone-100">
            {currentTime || '12:00'}
          </div>
          <div className="text-xs text-stone-400 font-medium capitalize">
            {currentDate}
          </div>
        </div>

        {/* Android Interactive Notification Widget on Lock Screen */}
        <div className="my-auto space-y-3">
          <div className="p-4 rounded-2xl bg-stone-900/95 border border-stone-700/60 shadow-lg shadow-black/40 backdrop-blur-xl space-y-3">
            {/* Notification App Banner */}
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                  W
                </span>
                <span className="font-semibold text-stone-200">Restoran Wawasan</span>
                <span className="text-stone-500">• Sekarang</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                {geofenceBreached ? '🚨 TIBA (200m)' : distanceLabel}
              </span>
            </div>

            {/* Notification Content */}
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center justify-between">
                <span>🚚 Penghantaran #{invoiceNo}</span>
              </h4>
              <p className="text-xs text-stone-300 leading-snug">
                <strong className="text-white">{customerName}</strong>
                <br />
                <span className="text-stone-400 text-[11px] line-clamp-2">📍 {order.location || 'Destinasi Pelanggan'}</span>
              </p>
            </div>

            {/* Lock Screen Action Buttons */}
            <div className="pt-2 border-t border-stone-800/80 grid grid-cols-1 gap-2">
              {/* Primary 1-Tap Arrival WhatsApp Alert */}
              <button
                type="button"
                onClick={() => {
                  onSendWhatsApp();
                  onClose();
                }}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  geofenceBreached
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>{language === 'bm' ? '💬 WhatsApp Sampai (1-Tekan)' : '💬 Send WhatsApp Arrival'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onCallCustomer();
                    onClose();
                  }}
                  className="py-2 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
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
                  className="py-2 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'bm' ? 'Maps / Waze' : 'Navigate'}</span>
                </button>
              </div>

              {onMarkDelivered && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkDelivered();
                    onClose();
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-stone-800/60 hover:bg-stone-800 text-stone-400 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bm' ? 'Tandai Selesai Dihantar' : 'Mark as Delivered'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[11px] text-amber-300">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'bm'
                ? 'Pada Android, notifikasi ini kekal di skrin kunci (Lock Screen). Anda boleh tekan WhatsApp tanpa perlu buka kod laluan semasa menunggang.'
                : 'On Android, this notification stays on your lock screen so you can tap WhatsApp without unlocking your phone while riding.'}
            </p>
          </div>
        </div>

        {/* Lock Screen Bottom Bar: Swipe to unlock indicator */}
        <div className="text-center pt-2">
          <div className="w-32 h-1 bg-stone-600 rounded-full mx-auto mb-2" />
          <span className="text-[10px] text-stone-500 tracking-wider uppercase font-medium flex items-center justify-center gap-1">
            <Smartphone className="w-3 h-3" />
            {language === 'bm' ? 'Kawal Terus Tanpa Buka Kunci' : 'Control Directly Without Unlocking'}
          </span>
        </div>
      </div>
    </div>
  );
}
