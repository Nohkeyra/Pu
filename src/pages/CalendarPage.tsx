import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import { BungaRayaSpinner } from '@/components/ui/BungaRayaSpinner';
const cateringBanner = '/assets/ui/catering_banner.jpg';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Plus,
  Trash2,
  X,
  FileText,
  User as UserIcon,
  Shield,
  LogIn,
  MapPin,
  UtensilsCrossed,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { cn, getAssetUrl } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PageShell from '@/components/PageShell';
import AuthModal from '@/components/AuthModal';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import type { Order } from '@/types';

interface CalendarNote {
  id: string;
  date: string;
  userId: string;
  userName: string;
  note: string;
  updatedAt: string;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);
  const [aggregatedSessions, setAggregatedSessions] = useState<Record<string, {
    breakfast: { count: number; pax: number };
    lunch: { count: number; pax: number };
    hi_tea: { count: number; pax: number };
  }>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Active Selected Day Modal & Nested Selected Order details (Google Calendar style!)
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [quickPopoverDay, setQuickPopoverDay] = useState<Date | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Translate local label function
  const tl = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = currentUser?.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;

  // 1. Fetch aggregated calendar workloads and full orders publicly from server-side API (no auth restriction!)
  useEffect(() => {
    const controller = new AbortController();
    const fetchCalendarData = async () => {
      try {
        const [sessionsRes, ordersRes] = await Promise.all([
          fetch('/api/calendar-sessions', { signal: controller.signal }),
          fetch('/api/calendar-orders', { signal: controller.signal })
        ]);
        const sessionsData = await sessionsRes.json();
        if (sessionsData.success && sessionsData.sessions) {
          setAggregatedSessions(sessionsData.sessions);
        }
        const ordersData = await ordersRes.json();
        if (ordersData.success && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.error("Failed to fetch server-side calendar data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendarData();

    return () => {
      controller.abort();
    };
  }, []);

  // 2. Real-time direct Firestore bindings
  useEffect(() => {
    let unsubscribeOrders1 = () => {};
    let unsubscribeOrders2 = () => {};
    let unsubscribeNotes = () => {};

    if (isAdmin || !currentUser) {
      // Admins and public visitors can view the master kitchen schedule
      const ordersCol = collection(db, 'orders');
      unsubscribeOrders1 = onSnapshot(ordersCol, (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Order;
          list.push({ ...data, id: doc.id });
        });
        setOrders(list);
        setLoading(false);
      }, (err) => {
        console.warn("Order stream permission note:", err);
      });

      const notesCol = collection(db, 'calendar_notes');
      unsubscribeNotes = onSnapshot(notesCol, (snapshot) => {
        const list: CalendarNote[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          list.push({ ...data, id: doc.id });
        });
        setCalendarNotes(list);
      }, (err) => {
        console.warn("Notes stream permission note:", err);
      });
    } else {
      // Members/Customers: ONLY subscribe to queries matching their own userId/uid
      const ordersCol = collection(db, 'orders');
      const q1 = query(ordersCol, where('userId', '==', currentUser.uid));
      const q2 = query(ordersCol, where('uid', '==', currentUser.uid));

      const handleSnapshot = (snapshot1: any, snapshot2: any) => {
        const map = new Map<string, Order>();
        snapshot1?.forEach((doc: any) => {
          map.set(doc.id, { ...(doc.data() as Order), id: doc.id });
        });
        snapshot2?.forEach((doc: any) => {
          map.set(doc.id, { ...(doc.data() as Order), id: doc.id });
        });
        setOrders(Array.from(map.values()));
        setLoading(false);
      };

      let snap1Docs: any[] = [];
      let snap2Docs: any[] = [];

      unsubscribeOrders1 = onSnapshot(q1, (snapshot) => {
        snap1Docs = snapshot.docs;
        handleSnapshot(snap1Docs, snap2Docs);
      }, (err) => console.warn("Member order Q1 permission note:", err));

      unsubscribeOrders2 = onSnapshot(q2, (snapshot) => {
        snap2Docs = snapshot.docs;
        handleSnapshot(snap1Docs, snap2Docs);
      }, (err) => console.warn("Member order Q2 permission note:", err));

      // Members: Only subscribe to their own notes
      const notesCol = collection(db, 'calendar_notes');
      const qNotes = query(notesCol, where('userId', '==', currentUser.uid));
      unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
        const list: CalendarNote[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          list.push({ ...data, id: doc.id });
        });
        setCalendarNotes(list);
      }, (err) => {
        console.warn("Member notes stream permission note:", err);
      });
    }

    return () => {
      unsubscribeOrders1();
      unsubscribeOrders2();
      unsubscribeNotes();
    };
  }, [currentUser, isAdmin]);

  // Normalize and extract Date string YYYY-MM-DD from an Order
  const getOrderDateString = (order: Order): string | null => {
    try {
      const val = order.eventDate || order.date || order.dateTime || order.createdAt;
      if (!val) return null;
      if (typeof val === 'string') {
        if (val.length >= 10 && val[4] === '-' && val[7] === '-') {
          return val.slice(0, 10);
        }
      }
      let d: Date | null = null;
      if (val instanceof Date) d = val;
      else if (typeof val === 'object' && val !== null && 'seconds' in (val as any)) {
        d = new Date((val as any).seconds * 1000);
      } else if (typeof val === 'string') {
        d = new Date(val);
      }
      if (d && !isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch (e) {
      console.debug("Date string parse error:", e);
    }
    return null;
  };

  // Normalize and extract Date from an Order
  const getOrderDate = (order: Order): Date | null => {
    const ds = getOrderDateString(order);
    return ds ? parseISO(ds) : null;
  };

  // Helper to format customer selected event delivery time (NOT creation time!)
  const getCustomerSelectedEventTime = (order: Order): string => {
    if (order.dateTime) {
      try {
        const parsed = parseISO(order.dateTime);
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'h:mm a');
        }
      } catch {
        // ignore
      }
    }
    // Fallback directly to event details
    return order.dateTime ? order.dateTime.split('T')[1]?.slice(0, 5) || '3:00 PM' : '3:00 PM';
  };

  // Helper to format exact event day of delivery
  const getCustomerSelectedEventDay = (order: Order): string => {
    if (order.dateTime) {
      try {
        const parsed = parseISO(order.dateTime);
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'EEEE, dd MMM yyyy');
        }
      } catch {
        // ignore
      }
    }
    const oDate = getOrderDate(order);
    return oDate ? format(oDate, 'EEEE, dd MMM yyyy') : '';
  };

  // Helper to filter out canceled and rejected orders
  const activeOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'rejected'
  );

  // Filter orders for master calendar view
  const getVisibleOrders = () => {
    return activeOrders;
  };

  // Retrieve active orders on a given date (for displaying detailed rows inside Day modal)
  const getOrdersForDay = (date: Date) => {
    const targetDateStr = format(date, 'yyyy-MM-dd');
    return getVisibleOrders().filter((order) => {
      return getOrderDateString(order) === targetDateStr;
    });
  };

  // For aggregate counters on the grid cells
  const getDailySessions = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (aggregatedSessions[dateStr]) {
      return aggregatedSessions[dateStr];
    }

    // Fallback/Admin-only real-time local calculations:
    const dayOrders = activeOrders.filter((order) => {
      const targetDateStr = format(date, 'yyyy-MM-dd');
      return getOrderDateString(order) === targetDateStr;
    });

    const sessions = {
      breakfast: { count: 0, pax: 0 },
      lunch: { count: 0, pax: 0 },
      hi_tea: { count: 0, pax: 0 },
    };

    dayOrders.forEach((order) => {
      const pax = order.guests || order.quantity || 0;
      const meals = order.meals || [];

      if (meals.includes('breakfast')) {
        sessions.breakfast.count += 1;
        sessions.breakfast.pax += pax;
      }
      if (meals.includes('lunch')) {
        sessions.lunch.count += 1;
        sessions.lunch.pax += pax;
      }
      if (meals.includes('hi_tea') || meals.includes('hi-tea') || meals.includes('tea_break')) {
        sessions.hi_tea.count += 1;
        sessions.hi_tea.pax += pax;
      }
    });

    return sessions;
  };

  // Retrieve notes written on a specific day (Admin sees all; Member sees their own)
  const getNotesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarNotes.filter((n) => {
      const matchesDate = n.date === dateStr;
      if (!matchesDate) return false;
      if (isAdmin) return true;
      return n.userId === currentUser?.uid;
    });
  };

  // Handle click on a calendar cell
  const handleDayClick = async (date: Date) => {
    await triggerLightImpact();
    setSelectedDay(date);
    setQuickPopoverDay(date);

    // If logged in, pre-populate editing state if they have an existing note
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingUserNote = calendarNotes.find(
      (n) => n.date === dateStr && n.userId === (isAdmin ? 'admin' : currentUser?.uid)
    );
    setNoteText(existingUserNote ? existingUserNote.note : '');
  };

  // Save/Update note in Firestore
  const handleSaveNote = async () => {
    if (!currentUser || !selectedDay) return;
    setIsSavingNote(true);

    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      const uid = isAdmin ? 'admin' : currentUser.uid;
      const docId = `${uid}_${dateStr}`;

      if (!noteText.trim()) {
        // If empty, delete
        await deleteDoc(doc(db, 'calendar_notes', docId));
      } else {
        await setDoc(doc(db, 'calendar_notes', docId), {
          date: dateStr,
          userId: uid,
          userName: isAdmin ? 'Admin' : (currentUser.displayName || currentUser.email?.split('@')[0] || 'Member'),
          note: noteText.trim(),
          updatedAt: new Date().toISOString()
        });
      }

      await triggerMediumImpact();
      setIsSavingNote(false);
    } catch (error) {
      console.error("Failed to save calendar note:", error);
      setIsSavingNote(false);
    }
  };

  // Delete note from Firestore
  const handleDeleteNote = async (noteId: string) => {
    await triggerLightImpact();
    try {
      await deleteDoc(doc(db, 'calendar_notes', noteId));
      await triggerMediumImpact();
      setNoteText('');
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  // Navigation handlers
  const handlePrevMonth = async () => {
    await triggerLightImpact();
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = async () => {
    await triggerLightImpact();
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleToday = async () => {
    await triggerLightImpact();
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayIndex = (getDay(monthStart) + 6) % 7;

  const weekdays = [
    tl('Mon', 'Isn'),
    tl('Tue', 'Sel'),
    tl('Wed', 'Rab'),
    tl('Thu', 'Kha'),
    tl('Fri', 'Jum'),
    tl('Sat', 'Sab'),
    tl('Sun', 'Aha'),
  ];

  const todayAction = (
    <button
      onClick={handleToday}
      className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-850 text-deep-forest dark:text-white hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-colors"
    >
      {tl('Today', 'Hari Ini')}
    </button>
  );

  return (
    <ErrorBoundary>
      <PageShell
        title={tl('Kitchen Schedule', 'Jadual Dapur')}
        subtitle={isAdmin 
          ? tl('Admin Master Calendar', 'Kalendar Induk Pentadbir') 
          : currentUser 
          ? tl('Member Schedule', 'Jadual Rekod Ahli') 
          : tl('Live Capacity Trackers', 'Pemantauan Kapasiti')}
        showBatik={true}
        backHref="/home"
        actions={todayAction}
      >
        <div className="w-full space-y-5 pb-20">
          {/* Month Controller & Quick Action Toolbar */}
          <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-white/10 p-3 sm:p-5 rounded-3xl shadow-sm relative overflow-hidden group">
            {/* Subtle Batik background for Month Controller */}
            <div 
              className="absolute inset-0 opacity-[0.12] dark:opacity-[0.18] pointer-events-none group-hover:opacity-[0.20] transition-opacity duration-700"
              style={{
                backgroundImage: `url(${getAssetUrl('/assets/ui/batik_pattern.jpg')})`,
                backgroundSize: '240px',
                backgroundPosition: 'center',
              }}
            />
            
            <ResponsiveButtonGroup align="between">
              <div className="flex items-center justify-between w-full sm:w-auto gap-4 relative z-10">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-deep-forest dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-850 hover:border-crisp-carrot/40 dark:hover:border-crisp-carrot/40 transition-all cursor-pointer select-none active:scale-90"
                    title={tl('Previous Month', 'Bulan Sebelumnya')}
                    aria-label={tl('Previous Month', 'Bulan Sebelumnya')}
                  >
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={handleNextMonth}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-deep-forest dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-850 hover:border-crisp-carrot/40 dark:hover:border-crisp-carrot/40 transition-all cursor-pointer select-none active:scale-90"
                    title={tl('Next Month', 'Bulan Seterusnya')}
                    aria-label={tl('Next Month', 'Bulan Seterusnya')}
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-crisp-carrot/80 mb-0.5">
                    {tl('Catering Schedule', 'Jadual Katering')}
                  </span>
                  <h3 className="font-display font-black text-lg sm:text-xl text-deep-forest dark:text-white capitalize tracking-tight leading-none">
                    {format(currentDate, 'MMMM yyyy')}
                  </h3>
                </div>
              </div>

              {/* Quick Actions (Today Button & Sync Indicator) */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end relative z-10">
                <button
                  onClick={handleToday}
                  className="w-full sm:w-auto text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-850/60 text-deep-forest dark:text-white hover:bg-white dark:hover:bg-stone-800 hover:shadow-md transition-all cursor-pointer select-none active:scale-95 shadow-sm"
                >
                  {tl('Today', 'Hari Ini')}
                </button>
              </div>
            </ResponsiveButtonGroup>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
              <BungaRayaSpinner className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-deep-forest dark:text-stone-300">
                {tl('Loading live kitchen calendar...', 'Memuatkan jadual langsung dapur...')}
              </p>
            </div>
          ) : (
            /* Monthly Calendar Grid with glowing day highlights */
            <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden font-sans">
              {/* Day Labels Row */}
              <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 py-3">
                {weekdays.map((day, index) => (
                  <div key={index} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Tiles Grid */}
              <div className="grid grid-cols-7 bg-stone-200/30 dark:bg-stone-900/40 gap-[1px]">
                {Array.from({ length: startDayIndex }).map((_, i) => (
                  <div 
                    key={`empty-${i}`} 
                    className="min-h-[100px] sm:min-h-[140px] bg-stone-50/30 dark:bg-stone-950/20 opacity-30"
                  />
                ))}

                {daysInMonth.map((day) => {
                  const sessions = getDailySessions(day);
                  const isCurrentDay = isToday(day);

                  // Notes check
                  const dailyNotes = getNotesForDay(day);
                  const hasNote = dailyNotes.length > 0;

                  // Glowing color detection logic
                  const maxSessionPax = Math.max(
                    sessions.breakfast.pax,
                    sessions.lunch.pax,
                    sessions.hi_tea.pax
                  );

                  const isExtremeVolume = maxSessionPax >= 80;
                  const isHeavyVolume = maxSessionPax >= 50 && maxSessionPax < 80;

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "min-h-[100px] sm:min-h-[140px] p-2 sm:p-3 flex flex-col justify-between transition-all group/day text-left focus:outline-none",
                        isCurrentDay ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]" : "bg-white dark:bg-card",
                        "hover:bg-stone-50 dark:hover:bg-stone-900/60",
                        // Glowing Color Rings and ambient backing depending on daily volume limit
                        isExtremeVolume && "bg-rose-50/30 dark:bg-rose-950/10 ring-1 ring-inset ring-rose-500/20 animate-pulse-slow",
                        isHeavyVolume && "bg-amber-50/30 dark:bg-amber-950/10 ring-1 ring-inset ring-amber-500/20"
                      )}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between w-full">
                        {isCurrentDay ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-crisp-carrot text-white text-xs font-black shadow-md shadow-crisp-carrot/20">
                            {format(day, 'd')}
                          </span>
                        ) : (
                          <span className={cn(
                            "text-xs font-black transition-colors",
                            isSameDay(day, selectedDay!) ? "text-crisp-carrot" : "text-stone-700 dark:text-stone-300 group-hover/day:text-deep-forest dark:group-hover/day:text-white"
                          )}>
                            {format(day, 'd')}
                          </span>
                        )}

                        {/* Visual indicator overlay if this date contains notes */}
                        {hasNote && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" title={tl('Has Notes', 'Mempunyai Nota')} />
                        )}
                      </div>

                      {/* Individual Orders List (Google Calendar Style) */}
                      <div className="space-y-1 mt-2 flex-grow flex flex-col justify-end w-full overflow-hidden max-h-[85px]">
                        {getOrdersForDay(day).map((ord, idx) => {
                          const pax = ord.guests || ord.quantity || 0;
                          const meals = ord.meals || [];
                          const mealLabel = meals.length > 0 
                            ? meals.map(m => {
                                if (m === 'breakfast') return 'Bre';
                                if (m === 'lunch') return 'Lunc';
                                if (m === 'hi_tea' || m === 'hi-tea' || m === 'tea_break') return "Hi'te";
                                return m.slice(0, 4);
                              }).join(', ')
                            : 'Order';

                          return (
                            <div 
                              key={ord.id || idx}
                              className="px-1.5 py-1 rounded-md text-[9px] font-black leading-none bg-rose-500/15 dark:bg-rose-500/25 text-rose-900 dark:text-rose-200 border border-rose-500/30 truncate shadow-xs"
                            >
                              {pax} Pax | {mealLabel}
                            </div>
                          );
                        })}

                        {getNotesForDay(day).map((note, idx) => (
                          <div 
                            key={note.id || idx}
                            className="px-1.5 py-1 rounded-md text-[9px] font-bold leading-none bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 truncate"
                          >
                            {note.note || '(No title)'}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Day Details Section - Rendered Inline! */}
          {selectedDay && (
            <div id="selected-day-details" className="bg-white dark:bg-card border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8 relative">
              {/* Decorative Batik Strip at the top - Now more subtle */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 opacity-20 z-20"
                style={{
                  backgroundImage: `url(${getAssetUrl('/assets/ui/batik_pattern.jpg')})`,
                  backgroundSize: '160px',
                  backgroundPosition: 'center',
                }}
              />

              {/* Header with visual accents */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-100 dark:border-stone-850 bg-stone-50/30 dark:bg-stone-950/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-crisp-carrot/10 rounded-2xl flex items-center justify-center shadow-inner">
                    <CalendarIcon className="w-6 h-6 text-crisp-carrot" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-deep-forest dark:text-white leading-tight">
                      {format(selectedDay, tl('EEEE, dd MMMM yyyy', 'EEEE, dd MMMM yyyy'))}
                    </h3>
                    <p className="text-[10px] text-crisp-carrot font-black uppercase tracking-[0.2em] mt-0.5">
                      {tl('Daily Production Schedule', 'Jadual Persediaan Dapur')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await triggerLightImpact();
                    setSelectedDay(null);
                  }}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-white dark:hover:bg-stone-850 transition-all hover:shadow-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid content split into two symmetric columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
                
                {/* Column 1: Catering Bookings */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.15em] flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-crisp-carrot/80" />
                      {tl('Confirmed Deliveries', 'Penghantaran Disahkan')}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-black text-stone-500">
                      {getOrdersForDay(selectedDay).length}
                    </span>
                  </div>

                  {getOrdersForDay(selectedDay).length === 0 ? (
                    <div className="p-10 text-center rounded-3xl bg-stone-50/50 dark:bg-stone-950/20 border-2 border-dashed border-stone-200 dark:border-stone-800/50">
                      <div className="w-12 h-12 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                        <Clock className="w-6 h-6 text-stone-400" />
                      </div>
                      <p className="text-sm font-bold text-stone-500 dark:text-stone-400">
                        {currentUser 
                          ? tl('No active catering orders.', 'Tiada tempahan katering aktif.')
                          : tl('No public sessions listed.', 'Tiada sesi katering am.')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {getOrdersForDay(selectedDay).map((ord) => {
                        const totalPax = ord.guests || ord.quantity || 0;
                        const eventDeliveryTime = getCustomerSelectedEventTime(ord);

                        return (
                          <button 
                            key={ord.id}
                            onClick={async () => {
                              await triggerLightImpact();
                              setSelectedOrder(ord);
                            }}
                            className={cn(
                              "w-full p-5 rounded-2xl border transition-all text-left block relative group hover:shadow-lg",
                              isAdmin 
                                ? "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-500/30" 
                                : "bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-white/5"
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-black tracking-widest text-crisp-carrot px-2 py-1 bg-crisp-carrot/5 rounded-md">
                                #{ord.invoiceNo || ord.id?.slice(0, 8).toUpperCase()}
                              </span>
                              <span className={cn(
                                "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter",
                                ord.status === 'approved' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                ord.status === 'pending' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                ord.status === 'billed' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                (ord.status as string) === 'completed' && "bg-stone-500/10 text-stone-600 dark:text-stone-400"
                              )}>
                                {ord.status}
                              </span>
                            </div>

                            <p className="text-sm font-black text-deep-forest dark:text-white group-hover:text-crisp-carrot transition-colors truncate">
                              {isAdmin ? ord.to || ord.name : tl('Your Corporate Booking', 'Tempahan Korporat Anda')}
                            </p>

                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                                  <Clock className="w-3.5 h-3.5 text-crisp-carrot/70" />
                                  <span className="text-xs font-bold tabular-nums">{eventDeliveryTime}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                                  <UserIcon className="w-3.5 h-3.5 text-crisp-carrot/70" />
                                  <span className="text-xs font-bold tabular-nums">{totalPax} {tl('Pax', 'Orang')}</span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                <ArrowRight className="w-4 h-4 text-crisp-carrot" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Column 2: Personal Scheduling Notes */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.15em] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-crisp-carrot/80" />
                      {tl('Operational Notes', 'Nota Operasi')}
                    </h4>
                  </div>

                  {!currentUser ? (
                    <div className="p-8 rounded-3xl bg-amber-500/[0.03] border border-amber-500/10 text-center space-y-5 shadow-inner">
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-bold">
                        {tl(
                          'Sign in to your account to save notes and specific instructions for this date.',
                          'Sila log masuk untuk menyimpan nota dan arahan khusus pada tarikh ini.'
                        )}
                      </p>
                      <button
                        onClick={async () => {
                          await triggerLightImpact();
                          setAuthModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl bg-crisp-carrot text-white hover:bg-opacity-90 shadow-lg shadow-crisp-carrot/20 transition-all active:scale-95"
                      >
                        <LogIn className="w-4 h-4" />
                        {tl('Sign In', 'Log Masuk')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Existing notes list display */}
                      <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {getNotesForDay(selectedDay).length === 0 ? (
                          <div className="p-6 text-center italic">
                            <p className="text-xs text-stone-400 font-bold">
                              {tl('No scheduling notes saved.', 'Tiada nota jadual disimpan.')}
                            </p>
                          </div>
                        ) : (
                          getNotesForDay(selectedDay).map((n) => (
                            <div 
                              key={n.id}
                              className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 space-y-2 relative group shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                  {n.userId === 'admin' ? (
                                    <span className="flex items-center gap-1 text-amber-600 font-black">
                                      <Shield className="w-3 h-3" /> ADMIN
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-stone-500 font-black">
                                      <UserIcon className="w-3 h-3" /> {n.userName.toUpperCase()}
                                    </span>
                                  )}
                                  <span className="opacity-50">•</span> {format(parseISO(n.updatedAt), 'hh:mm a')}
                                </span>

                                {(isAdmin || n.userId === currentUser.uid) && (
                                  <button
                                    onClick={() => handleDeleteNote(n.id)}
                                    className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100"
                                    title={tl('Delete note', 'Padam nota')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs font-bold text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                                {n.note}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Notes Input Field for Editing/Creating */}
                      <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                        <div className="relative">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder={isAdmin 
                              ? tl('Add kitchen instruction, prep alert...', 'Tambah arahan dapur, awas persediaan...')
                              : tl('Add personal reminder, request...', 'Tambah peringatan, permintaan...')}
                            maxLength={1000}
                            rows={3}
                            className="w-full text-xs font-bold p-4 rounded-2xl border border-stone-200 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-900/40 text-deep-forest dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-crisp-carrot/20 focus:border-crisp-carrot transition-all resize-none shadow-inner"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={handleSaveNote}
                            disabled={isSavingNote || !noteText.trim()}
                            className="text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl bg-deep-forest dark:bg-white text-white dark:text-deep-forest hover:shadow-lg disabled:opacity-40 transition-all flex items-center gap-2 active:scale-95"
                          >
                            {isSavingNote ? (
                              <>
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                {tl('Saving...', 'Menyimpan...')}
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                {tl('Save Note', 'Simpan Nota')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        {/* Nested Google Calendar-Style Event Detail Drawer */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-md animate-fade-in font-sans">
            <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              
              {/* Premium Event Banner Header */}
              <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
                <img 
                  src={cateringBanner} 
                  alt="Catering Setup" 
                  className="w-full h-full object-cover brightness-95"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-widest uppercase bg-crisp-carrot px-2.5 py-1 rounded-full shadow-sm">
                      {tl('Corporate Event Delivery', 'Penghantaran Korporat')}
                    </span>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-1.5 rounded-full bg-white/25 hover:bg-white/40 text-white transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-display font-extrabold text-base sm:text-lg tracking-tight mt-2 text-white">
                    {selectedOrder.guests || selectedOrder.quantity || 0} Pax • {selectedOrder.meals?.join(' & ') || 'Event'}
                  </h3>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-grow">
                {/* Event Name & Invoice info */}
                <div className="pb-4 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-display font-extrabold text-deep-forest dark:text-white leading-snug">
                      {isAdmin ? selectedOrder.to || selectedOrder.name : tl('Your Corporate Event Session', 'Sesi Acara Korporat Anda')}
                    </h2>
                  </div>
                  <p className="text-[11px] font-bold text-crisp-carrot mt-1">
                    Invoice No: #{selectedOrder.invoiceNo || selectedOrder.id?.slice(0, 8).toUpperCase()} • {selectedOrder.status?.toUpperCase()}
                  </p>
                </div>

                {/* Structured details rows */}
                <div className="space-y-4 text-xs font-sans text-stone-700 dark:text-stone-300">
                  
                  {/* Event Time row (Set by customer) */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-deep-forest dark:text-white block text-[13px]">
                        {getCustomerSelectedEventTime(selectedOrder)}
                      </span>
                      <span className="text-[11px] font-medium text-stone-400 block mt-0.5">
                        {getCustomerSelectedEventDay(selectedOrder)}
                      </span>
                    </div>
                  </div>

                  {/* Location row */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-deep-forest dark:text-white block text-[13px]">
                        {selectedOrder.location || tl('Plant Location', 'Lokasi Kilang')}
                      </span>
                      <span className="text-[11px] font-medium text-stone-400 block mt-0.5 leading-relaxed">
                        {selectedOrder.to || tl('Corporate Office Block Address', 'Alamat Blok Pejabat Korporat')}
                      </span>
                    </div>
                  </div>

                  {/* Menu packages checklist row */}
                  {(selectedOrder.menu || selectedOrder.dishes) && (
                    <div className="flex items-start gap-3.5">
                      <div className="h-8 w-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div className="flex-grow">
                        <span className="font-extrabold text-deep-forest dark:text-white block text-[13px] mb-1.5">
                          {tl('Scheduled Menu & Dishes', 'Menu Acara & Hidangan')}
                        </span>
                        
                        {selectedOrder.menu && (
                          <div className="bg-stone-50 dark:bg-stone-950/40 border border-stone-200/50 dark:border-white/5 p-2.5 rounded-xl mb-2">
                            <span className="font-bold text-crisp-carrot block text-[11px]">
                              {selectedOrder.menu}
                            </span>
                          </div>
                        )}

                        {selectedOrder.dishes && selectedOrder.dishes.length > 0 && (
                          <div className="space-y-1 mt-1 pl-1">
                            {selectedOrder.dishes.map((dish, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-stone-600 dark:text-stone-300">{dish}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Customer Preparation details row */}
                  {selectedOrder.preparationType && (
                    <div className="flex items-start gap-3.5">
                      <div className="h-8 w-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-deep-forest dark:text-white block text-[13px]">
                          {selectedOrder.preparationType === 'buffet' ? tl('Classic Buffet Catering', 'Hidangan Katering Bufet') : tl('Individual Meal Box Delivery', 'Penghantaran Kotak Hidangan Peribadi')}
                        </span>
                        <span className="text-[11px] font-medium text-stone-400 block mt-0.5">
                          {tl('Setup details & warming trays provided', 'Peralatan persediaan & pemanas makanan disediakan')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Customer specific instructions note */}
                  {selectedOrder.notes && (
                    <div className="flex items-start gap-3.5 pt-1">
                      <div className="h-8 w-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-grow">
                        <span className="font-extrabold text-deep-forest dark:text-white block text-[13px]">
                          {tl('Special Delivery Notes', 'Nota Khas Penghantaran')}
                        </span>
                        <p className="bg-red-500/5 text-rose-900 dark:text-rose-300 p-2.5 rounded-xl border border-red-500/10 text-[11px] leading-relaxed mt-1.5 font-medium italic">
                          "{selectedOrder.notes}"
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-850 bg-stone-50 dark:bg-stone-950/40 shrink-0 flex gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 text-xs font-bold py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-850 transition-colors"
                >
                  {tl('Close Details', 'Tutup')}
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setSelectedDay(null);
                    if (isAdmin) {
                      navigate('/admin', { state: { highlightOrderId: selectedOrder.id } });
                    } else {
                      navigate('/profile');
                    }
                  }}
                  className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-crisp-carrot hover:bg-opacity-95 text-white shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isAdmin ? tl('Open in Admin panel', 'Buka di Panel Admin') : tl('View Order History', 'Butiran Tempahan')}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Quick Compact Popover Modal when clicking any day tile */}
        {quickPopoverDay && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-md animate-fade-in font-sans">
            <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-crisp-carrot/10 rounded-xl flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-crisp-carrot" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-deep-forest dark:text-white">
                      {format(quickPopoverDay, 'EEEE, dd MMMM yyyy')}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-crisp-carrot">
                      {tl('Date Orders & Schedule', 'Ringkasan Tempahan Tarikh')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await triggerLightImpact();
                    setQuickPopoverDay(null);
                  }}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Orders List */}
              <div className="p-5 overflow-y-auto max-h-[380px] space-y-3.5 custom-scrollbar">
                {getOrdersForDay(quickPopoverDay).length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-stone-50 dark:bg-stone-950/30 border border-dashed border-stone-200 dark:border-stone-800">
                    <p className="text-xs font-bold text-stone-500">
                      {tl('No orders listed for this date.', 'Tiada pesanan disenaraikan pada tarikh ini.')}
                    </p>
                  </div>
                ) : (
                  getOrdersForDay(quickPopoverDay).map((ord) => {
                    const totalPax = ord.guests || ord.quantity || 0;
                    const eventArrival = getCustomerSelectedEventTime(ord);
                    return (
                      <div 
                        key={ord.id}
                        className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200/80 dark:border-stone-800 space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black tracking-widest text-crisp-carrot px-2 py-0.5 bg-crisp-carrot/10 rounded">
                            #{ord.invoiceNo || ord.id?.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={cn(
                            "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-tighter",
                            ord.status === 'approved' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            ord.status === 'pending' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            ord.status === 'billed' && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>
                            {ord.status}
                          </span>
                        </div>

                        <p className="font-black text-deep-forest dark:text-white text-sm">
                          {isAdmin ? ord.to || ord.name : tl('Your Corporate Order', 'Tempahan Korporat Anda')}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200/50 dark:border-stone-800/50">
                          {/* Waktu Event (Sampai di Lokasi) */}
                          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                            <Clock className="w-3.5 h-3.5 text-crisp-carrot shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-bold uppercase">{tl('Event Arrival Time', 'Waktu Sampai Event')}</span>
                              <span className="font-black tabular-nums">{eventArrival}</span>
                            </div>
                          </div>

                          {/* Quantity / Pax */}
                          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                            <UserIcon className="w-3.5 h-3.5 text-crisp-carrot shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-bold uppercase">{tl('Quantity', 'Kuantiti')}</span>
                              <span className="font-black tabular-nums">{totalPax} {tl('Pax', 'Orang')}</span>
                            </div>
                          </div>

                          {/* Lokasi */}
                          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 col-span-2">
                            <MapPin className="w-3.5 h-3.5 text-crisp-carrot shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-bold uppercase">{tl('Location / Address', 'Lokasi / Alamat')}</span>
                              <span className="font-bold truncate">{ord.location || ord.to || '-'}</span>
                            </div>
                          </div>

                          {/* Meal For */}
                          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 col-span-2">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-crisp-carrot shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-bold uppercase">{tl('Meal For', 'Jenis Hidangan')}</span>
                              <span className="font-bold capitalize">{ord.meals?.join(', ') || '-'}</span>
                            </div>
                          </div>

                          {/* Menu / Dishes */}
                          {(ord.menu || (ord.dishes && ord.dishes.length > 0)) && (
                            <div className="col-span-2 pt-1">
                              <span className="text-[10px] text-stone-400 block font-bold uppercase">{tl('Menu & Dishes', 'Menu & Hidangan')}</span>
                              <p className="font-medium text-stone-600 dark:text-stone-400 mt-0.5">
                                {ord.menu || ord.dishes?.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => {
                              setQuickPopoverDay(null);
                              setSelectedOrder(ord);
                            }}
                            className="text-[11px] font-black uppercase tracking-wider text-crisp-carrot hover:underline flex items-center gap-1"
                          >
                            {tl('View Full Order Details →', 'Lihat Butiran Penuh →')}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/30 flex justify-end">
                <button
                  onClick={() => setQuickPopoverDay(null)}
                  className="px-5 py-2 rounded-xl bg-deep-forest dark:bg-white text-white dark:text-deep-forest font-bold text-xs"
                >
                  {tl('Close', 'Tutup')}
                </button>
              </div>

            </div>
          </div>
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode="signin"
        />
      </div>
    </PageShell>
  </ErrorBoundary>
  );
}
