import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, Truck, CheckCircle2, AlertCircle, Utensils, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { type User } from 'firebase/auth';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact } from '@/lib/haptics';

export interface OrderNotification {
  id: string;
  orderId: string;
  invoiceNo: string;
  title: string;
  message: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'billed' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';
  read: boolean;
  pax: number;
}

interface NotificationBellProps {
  currentUser: User | null;
  onOpenProfileWithOrder?: (orderId: string) => void;
  isScrolled?: boolean;
}

export function NotificationBell({ currentUser, onOpenProfileWithOrder, isScrolled }: NotificationBellProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('wawasan_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Listen to user's orders real-time
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    try {
      const ordersRef = collection(db, 'orders');
      // Query orders by userId or user email
      const q = query(
        ordersRef,
        where('userId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifs: OrderNotification[] = [];
          
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const orderId = docSnap.id;
            const invoiceNo = data.invoiceNo || data.officialInvoiceNo || orderId.slice(0, 8);
            const status = data.status || 'pending';
            const pax = data.guests || data.pax || 0;
            const updatedAt = data.updatedAt || data.createdAt || new Date().toISOString();

            let title = t('Pesanan Dikemas Kini', 'Order Updated');
            let message = t('Status pesanan anda telah dikemas kini.', 'Your order status has been updated.');

            if (status === 'pending') {
              title = t('Pesanan Diterima', 'Order Received');
              message = t(
                `Pesanan #${invoiceNo} (${pax} pax) sedang menantikan pengesahan daripada pihak restoran.`,
                `Order #${invoiceNo} (${pax} pax) is pending confirmation from restaurant.`
              );
            } else if (status === 'approved' || status === 'billed') {
              title = t('Pesanan Disahkan & Invois Dikeluarkan', 'Order Confirmed & Invoiced');
              message = t(
                `Tempahan #${invoiceNo} telah disahkan dan dijadualkan. Invois rasmi sedia dimuat turun.`,
                `Booking #${invoiceNo} has been confirmed. Official invoice is ready.`
              );
            } else if (status === 'preparing') {
              title = t('Dapur Sedang Memasak', 'Kitchen Preparing');
              message = t(
                `Hidangan katering #${invoiceNo} sedang disediakan segar di dapur Pak Usop.`,
                `Catering dishes for #${invoiceNo} are being prepared in kitchen.`
              );
            } else if (status === 'in_transit') {
              title = t('Penghantar Dalam Perjalanan', 'Out for Delivery');
              message = t(
                `Pesanan #${invoiceNo} sedang dihantar oleh kru katering Wawasan Pak Usop.`,
                `Order #${invoiceNo} is on the way with Pak Usop catering team.`
              );
            } else if (status === 'delivered') {
              title = t('Sajian Selesai Dihantar', 'Catering Delivered');
              message = t(
                `Pesanan #${invoiceNo} telah selamat disampaikan. Selamat menjamu selera!`,
                `Order #${invoiceNo} successfully delivered. Enjoy your meal!`
              );
            } else if (status === 'cancelled') {
              title = t('Pesanan Dibatalkan', 'Order Cancelled');
              message = t(
                `Pesanan #${invoiceNo} telah dibatalkan.`,
                `Order #${invoiceNo} has been cancelled.`
              );
            }

            notifs.push({
              id: `${orderId}-${status}`,
              orderId,
              invoiceNo,
              title,
              message,
              timestamp: updatedAt,
              status,
              read: readIds.has(`${orderId}-${status}`),
              pax,
            });
          });

          // Sort by timestamp descending
          notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setNotifications(notifs);
        },
        (error) => {
          console.warn('Notification query error:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to subscribe notifications:', err);
    }
  }, [currentUser, readIds, t]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    triggerLightImpact();
    const newRead = new Set(readIds);
    notifications.forEach(n => newRead.add(n.id));
    setReadIds(newRead);
    try {
      localStorage.setItem('wawasan_read_notifications', JSON.stringify(Array.from(newRead)));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (notif: OrderNotification) => {
    triggerLightImpact();
    const newRead = new Set(readIds);
    newRead.add(notif.id);
    setReadIds(newRead);
    try {
      localStorage.setItem('wawasan_read_notifications', JSON.stringify(Array.from(newRead)));
    } catch {
      // ignore
    }

    setIsOpen(false);
    if (onOpenProfileWithOrder) {
      onOpenProfileWithOrder(notif.orderId);
    }
  };

  if (!currentUser) return null;

  const buttonStyleClass = isScrolled
    ? 'icon-button-soft touch-target-row h-11 w-11 relative flex items-center justify-center font-bold text-deep-forest dark:text-white'
    : 'inline-flex h-11 w-11 relative items-center justify-center rounded-2xl border border-tomato-burst/50 bg-deep-forest/40 text-white font-bold shadow-md backdrop-blur-xl transition-all duration-300 hover:bg-deep-forest/60 active:scale-[0.95] drop-shadow-[0_1px_2px_rgba(12,69,60,0.80)]';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          triggerLightImpact();
          setIsOpen(!isOpen);
        }}
        className={buttonStyleClass}
        aria-label={t('Pemberitahuan Status', 'Status Notifications')}
        title={t('Pemberitahuan Status', 'Status Notifications')}
      >
        <Bell className="h-5 w-5 text-amber-400" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#121916] p-0 shadow-2xl z-[2000] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/10 bg-stone-50/80 dark:bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <span className="font-accent text-xs font-black uppercase tracking-wider text-deep-forest dark:text-white">
                  {t('Pemberitahuan Status', 'Status Alerts')}
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {unreadCount} {t('baru', 'new')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>{t('Baca semua', 'Mark read')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-stone-100 dark:divide-white/5">
              {notifications.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <Bell className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-600 mb-2" />
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    {t('Tiada pemberitahuan lagi.', 'No status notifications yet.')}
                  </p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                    {t('Status tempahan katering anda akan dipaparkan di sini.', 'Your catering booking status will appear here.')}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !readIds.has(notif.id);

                  let StatusIcon = Clock;
                  let iconBg = 'bg-amber-500/10 text-amber-500';

                  if (notif.status === 'approved' || notif.status === 'billed') {
                    StatusIcon = CheckCircle2;
                    iconBg = 'bg-emerald-500/10 text-emerald-500';
                  } else if (notif.status === 'preparing') {
                    StatusIcon = Utensils;
                    iconBg = 'bg-blue-500/10 text-blue-500';
                  } else if (notif.status === 'in_transit') {
                    StatusIcon = Truck;
                    iconBg = 'bg-purple-500/10 text-purple-500';
                  } else if (notif.status === 'delivered') {
                    StatusIcon = CheckCircle2;
                    iconBg = 'bg-emerald-500/10 text-emerald-500';
                  } else if (notif.status === 'cancelled') {
                    StatusIcon = AlertCircle;
                    iconBg = 'bg-red-500/10 text-red-500';
                  }

                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-stone-50 dark:hover:bg-white/5 ${
                        isUnread ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      <div className={`shrink-0 rounded-xl p-2.5 ${iconBg}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-xs text-deep-forest dark:text-white truncate">
                            {notif.title}
                          </span>
                          <span className="text-[10px] font-medium text-stone-400 shrink-0">
                            {formatRelativeTime(notif.timestamp)}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            #{notif.invoiceNo}
                          </span>
                          <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 flex items-center gap-0.5 hover:text-amber-500">
                            <span>{t('Lihat Pesanan', 'View Order')}</span>
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>

                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatRelativeTime(isoDateString: string): string {
  try {
    const diff = Date.now() - new Date(isoDateString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Baru sahaja';
    if (minutes < 60) return `${minutes}m lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}d lalu`;
  } catch {
    return '';
  }
}
