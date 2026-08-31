import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
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
  ArrowRight,
  Coffee,
  Sun,
  CheckCircle2
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
  isWeekend,
  parseISO
} from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PageShell from '@/components/PageShell';
import AuthModal from '@/components/AuthModal';
import type { Order } from '@/types';

const cateringBanner = '/assets/ui/catering_banner.jpg';

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
  const dateLocale = language === 'bm' ? ms : enUS;

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

  // Active Selected Day
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Translation helper
  const tl = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = currentUser?.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;

  // 1. Fetch aggregated calendar workloads and full orders publicly from server-side API
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
      const ordersCol = collection(db, 'orders');
      unsubscribeOrders1 = onSnapshot(ordersCol, (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          list.push({ ...data, id: docSnap.id });
        });
        setOrders(list);
        setLoading(false);
      }, (err) => {
        console.warn("Order stream permission note:", err);
      });

      const notesCol = collection(db, 'calendar_notes');
      unsubscribeNotes = onSnapshot(notesCol, (snapshot) => {
        const list: CalendarNote[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          list.push({ ...data, id: docSnap.id });
        });
        setCalendarNotes(list);
      }, (err) => {
        console.warn("Notes stream permission note:", err);
      });
    } else {
      const ordersCol = collection(db, 'orders');
      const q1 = query(ordersCol, where('userId', '==', currentUser.uid));
      const q2 = query(ordersCol, where('uid', '==', currentUser.uid));

      const handleSnapshot = (snapshot1: any, snapshot2: any) => {
        const map = new Map<string, Order>();
        snapshot1?.forEach((docSnap: any) => {
          map.set(docSnap.id, { ...(docSnap.data() as Order), id: docSnap.id });
        });
        snapshot2?.forEach((docSnap: any) => {
          map.set(docSnap.id, { ...(docSnap.data() as Order), id: docSnap.id });
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

      const notesCol = collection(db, 'calendar_notes');
      const qNotes = query(notesCol, where('userId', '==', currentUser.uid));
      unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
        const list: CalendarNote[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          list.push({ ...data, id: docSnap.id });
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
    return order.dateTime ? order.dateTime.split('T')[1]?.slice(0, 5) || '3:00 PM' : '3:00 PM';
  };

  const getCustomerSelectedEventDay = (order: Order): string => {
    if (order.dateTime) {
      try {
        const parsed = parseISO(order.dateTime);
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'EEEE, dd MMM yyyy', { locale: dateLocale });
        }
      } catch {
        // ignore
      }
    }
    const oDateStr = getOrderDateString(order);
    return oDateStr ? format(parseISO(oDateStr), 'EEEE, dd MMM yyyy', { locale: dateLocale }) : '';
  };

  // Filter out canceled and rejected orders
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled' && o.status !== 'rejected');
  }, [orders]);

  // Retrieve active orders on a given date
  const getOrdersForDay = (date: Date) => {
    const targetDateStr = format(date, 'yyyy-MM-dd');
    return activeOrders.filter((order) => getOrderDateString(order) === targetDateStr);
  };

  // For aggregate counters on the grid cells
  const getDailySessions = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (aggregatedSessions[dateStr]) {
      return aggregatedSessions[dateStr];
    }

    const dayOrders = activeOrders.filter((order) => getOrderDateString(order) === dateStr);

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

  const getNotesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarNotes.filter((n) => {
      if (n.date !== dateStr) return false;
      if (isAdmin) return true;
      return n.userId === currentUser?.uid;
    });
  };

  // Handle click on a calendar cell
  const handleDayClick = async (date: Date) => {
    await triggerLightImpact();
    setSelectedDay(date);

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

  // Quick Preset Insert for Notes
  const handleInsertPresetNote = (preset: string) => {
    setNoteText((prev) => (prev ? `${prev} • ${preset}` : preset));
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
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  // Calendar calculations (Monday-first ISO grid)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayIndex = (getDay(monthStart) + 6) % 7; // Monday = 0

  // Padding days from previous month
  const prevMonthDays = useMemo(() => {
    if (startDayIndex === 0) return [];
    const prevMonthEnd = endOfMonth(subMonths(currentDate, 1));
    const days: Date[] = [];
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(prevMonthEnd);
      d.setDate(prevMonthEnd.getDate() - i);
      days.push(d);
    }
    return days;
  }, [currentDate, startDayIndex]);

  // Trailing days for neat 7xN grid
  const nextMonthDays = useMemo(() => {
    const totalRendered = prevMonthDays.length + daysInMonth.length;
    const remaining = (7 - (totalRendered % 7)) % 7;
    const days: Date[] = [];
    const nextStart = addMonths(monthStart, 1);
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(nextStart);
      d.setDate(i);
      days.push(d);
    }
    return days;
  }, [prevMonthDays, daysInMonth, monthStart]);

  const weekdays = [
    { label: tl('M', 'I'), full: tl('Mon', 'Isn') },
    { label: tl('T', 'S'), full: tl('Tue', 'Sel') },
    { label: tl('W', 'R'), full: tl('Wed', 'Rab') },
    { label: tl('T', 'K'), full: tl('Thu', 'Kha') },
    { label: tl('F', 'J'), full: tl('Fri', 'Jum') },
    { label: tl('S', 'S'), full: tl('Sat', 'Sab'), weekend: true },
    { label: tl('S', 'A'), full: tl('Sun', 'Ahad'), weekend: true },
  ];

  // Quick preset tags for kitchen/operations
  const notePresets = [
    tl('Allergen Alert', 'Awas Alahan'),
    tl('VIP Protocol', 'Protokol VIP'),
    tl('Early Delivery', 'Hantar Awal'),
    tl('Extra Sambal', 'Sambal Tambahan'),
    tl('Buffet Setup', 'Susun Atur Bufet'),
  ];

  const selectedDaySessions = selectedDay ? getDailySessions(selectedDay) : null;
  const selectedDayTotalPax = selectedDaySessions 
    ? (selectedDaySessions.breakfast.pax + selectedDaySessions.lunch.pax + selectedDaySessions.hi_tea.pax)
    : 0;

  const todayAction = (
    <button
      onClick={handleToday}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
    >
      {tl('Today', 'Hari Ini')}
    </button>
  );

  return (
    <ErrorBoundary>
      <PageShell
        title={tl('Catering Schedule', 'Jadual Katering')}
        subtitle={isAdmin 
          ? tl('Kitchen booking management', 'Pengurusan tempahan dapur') 
          : currentUser 
          ? tl('Your catering dates & availability', 'Tarikh katering & ketersediaan') 
          : tl('Kitchen availability & bookings', 'Ketersediaan & tempahan')}
        showBatik={false}
        backHref="/home"
        actions={todayAction}
      >
        <div className="w-full space-y-5 pb-20">

          {/* 1. CALENDAR CONTROLS & RECENTERED HEADER */}
          <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 sm:p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/70 dark:border-stone-800 transition-all cursor-pointer shrink-0"
                aria-label={tl('Previous Month', 'Bulan Sebelumnya')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center flex-1">
                <h2 className="font-display font-bold text-lg sm:text-2xl text-stone-900 dark:text-stone-100 capitalize tracking-tight leading-tight">
                  {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                </h2>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 sm:p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/70 dark:border-stone-800 transition-all cursor-pointer shrink-0"
                aria-label={tl('Next Month', 'Bulan Seterusnya')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. SWAPPED CALENDAR GRID (Dark in Light Mode, Light in Dark Mode) */}
          {loading ? (
            <div className="bg-stone-900 dark:bg-white border border-stone-800 dark:border-stone-200/80 rounded-2xl p-16 text-center shadow-sm">
              <Clock className="w-7 h-7 text-stone-400 dark:text-stone-500 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-stone-400 dark:text-stone-500">
                {tl('Loading kitchen calendar...', 'Memuatkan jadual dapur...')}
              </p>
            </div>
          ) : (
            <div className="bg-stone-900 dark:bg-white border border-stone-800 dark:border-stone-200/80 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
              
              {/* Weekdays Header */}
              <div className="grid grid-cols-7 border-b border-stone-800 dark:border-stone-200 bg-stone-950/80 dark:bg-stone-50/90">
                {weekdays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "py-3 text-center text-[11px] font-extrabold tracking-wider uppercase select-none",
                      day.weekend 
                        ? "text-rose-400 dark:text-rose-600 font-extrabold" 
                        : "text-stone-400 dark:text-stone-600"
                    )}
                  >
                    <span className="hidden sm:inline">{day.full}</span>
                    <span className="sm:hidden">{day.label}</span>
                  </div>
                ))}
              </div>

              {/* Days Matrix - Swapped Mode Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-stone-800 dark:divide-stone-200/80">
                
                {/* 1. Leading Prev Month Days (Diagonal Striped) */}
                {prevMonthDays.map((pDay) => (
                  <div
                    key={`prev-${pDay.toISOString()}`}
                    className="min-h-[80px] sm:min-h-[100px] p-2 sm:p-2.5 relative select-none overflow-hidden cal-striped-outside flex flex-col justify-start"
                  >
                    <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 tabular-nums">
                      {format(pDay, 'd')}
                    </span>
                  </div>
                ))}

                {/* 2. Current Month Days */}
                {daysInMonth.map((day) => {
                  const isCurrentDay = isToday(day);
                  const isDaySelected = selectedDay ? isSameDay(day, selectedDay) : false;
                  const dayOrders = getOrdersForDay(day);
                  const dayNotes = getNotesForDay(day);
                  const sessions = getDailySessions(day);
                  const totalPax = sessions.breakfast.pax + sessions.lunch.pax + sessions.hi_tea.pax;
                  const hasOrders = dayOrders.length > 0;
                  const isWeekendDay = isWeekend(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "min-h-[80px] sm:min-h-[100px] p-2 sm:p-2.5 flex flex-col justify-between transition-all text-left relative cursor-pointer group select-none bg-stone-900 hover:bg-stone-850 dark:bg-white dark:hover:bg-stone-50",
                        isDaySelected 
                          ? "ring-2 ring-inset ring-crisp-carrot bg-stone-800/90 dark:bg-orange-100/70 z-10" 
                          : ""
                      )}
                    >
                      {/* Top Row: Day Number & Indicators */}
                      <div className="flex items-center justify-between w-full">
                        {isCurrentDay ? (
                          <span className="w-7 h-7 rounded-full bg-crisp-carrot text-white text-xs font-black flex items-center justify-center shadow-xs">
                            {format(day, 'd')}
                          </span>
                        ) : (
                          <span className={cn(
                            "text-sm font-bold tabular-nums transition-colors",
                            isDaySelected 
                              ? "text-crisp-carrot scale-110" 
                              : isWeekendDay 
                              ? "text-rose-400 dark:text-rose-600"
                              : "text-stone-100 dark:text-stone-900 group-hover:text-crisp-carrot"
                          )}>
                            {format(day, 'd')}
                          </span>
                        )}

                        {/* Note Indicator */}
                        {dayNotes.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-stone-900 dark:ring-white" title={tl('Has note', 'Ada nota')} />
                        )}
                      </div>

                      {/* Bottom Info: Meal Badges */}
                      <div className="mt-auto pt-1 w-full">
                        {hasOrders ? (
                          <div className="space-y-1">
                            {/* Meal Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {sessions.breakfast.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-stone-950 dark:text-white shadow-2xs leading-none">
                                  B
                                </span>
                              )}
                              {sessions.lunch.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500 text-stone-950 dark:text-white shadow-2xs leading-none">
                                  L
                                </span>
                              )}
                              {sessions.hi_tea.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-pink-500 dark:bg-purple-600 text-white shadow-2xs leading-none">
                                  T
                                </span>
                              )}
                            </div>

                            {/* Pax summary line */}
                            <div className="text-[10px] font-bold tracking-tight text-stone-400 dark:text-stone-600 truncate flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-100 dark:bg-stone-900 dark:text-white font-extrabold tabular-nums text-[9px] leading-none">
                                {totalPax > 0 ? `${totalPax}p` : `${dayOrders.length} ord`}
                              </span>
                              <span className="hidden sm:inline opacity-75 font-medium text-[10px]">
                                ({dayOrders.length})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-transparent select-none leading-none">·</span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* 3. Trailing Next Month Days (Diagonal Striped) */}
                {nextMonthDays.map((nDay) => (
                  <div
                    key={`next-${nDay.toISOString()}`}
                    className="min-h-[80px] sm:min-h-[100px] p-2 sm:p-2.5 relative select-none overflow-hidden cal-striped-outside flex flex-col justify-start"
                  >
                    <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 tabular-nums">
                      {format(nDay, 'd')}
                    </span>
                  </div>
                ))}

              </div>
            </div>
          )}

          {/* 3. REFINED SELECTED DAY AGENDA */}
          {selectedDay && (
            <div className="bg-white dark:bg-card border border-stone-200/70 dark:border-stone-800/80 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Day Header */}
              <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/40 dark:bg-stone-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300 shrink-0">
                    <CalendarIcon className="w-4 h-4 text-crisp-carrot" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white leading-tight">
                        {format(selectedDay, 'EEEE, dd MMMM yyyy', { locale: dateLocale })}
                      </h3>
                      {isToday(selectedDay) && (
                        <span className="px-2 py-0.5 rounded-full bg-crisp-carrot/10 text-crisp-carrot text-[10px] font-bold">
                          {tl('Today', 'Hari Ini')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {selectedDayTotalPax > 0 
                        ? `${selectedDayTotalPax} ${tl('total pax booked', 'jumlah pax ditempah')}` 
                        : tl('No bookings scheduled', 'Tiada tempahan dijadualkan')}
                    </p>
                  </div>
                </div>

                {/* Meal Breakdown Pills */}
                {selectedDaySessions && selectedDayTotalPax > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedDaySessions.breakfast.pax > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-white flex items-center gap-1.5 shadow-xs">
                        <Coffee className="w-3.5 h-3.5" />
                        <span>Breakfast: {selectedDaySessions.breakfast.pax}p</span>
                      </span>
                    )}
                    {selectedDaySessions.lunch.pax > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs">
                        <Sun className="w-3.5 h-3.5" />
                        <span>Lunch: {selectedDaySessions.lunch.pax}p</span>
                      </span>
                    )}
                    {selectedDaySessions.hi_tea.pax > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-600 text-white flex items-center gap-1.5 shadow-xs">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Hi-Tea: {selectedDaySessions.hi_tea.pax}p</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Day Body: Orders & Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-5">
                
                {/* Left: Orders (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-extrabold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {tl('Bookings for this day', 'Tempahan hari ini')} ({getOrdersForDay(selectedDay).length})
                    </span>
                  </div>

                  {getOrdersForDay(selectedDay).length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 space-y-3">
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        {tl('Kitchen is open with no orders scheduled yet.', 'Dapur dibuka tanpa tempahan dijadualkan.')}
                      </p>
                      <button
                        onClick={() => navigate(`/order?date=${format(selectedDay, 'yyyy-MM-dd')}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-crisp-carrot text-white hover:bg-crisp-carrot/90 transition-all shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        {tl('Book for this date', 'Tempah untuk tarikh ini')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {getOrdersForDay(selectedDay).map((ord) => {
                        const totalPax = ord.guests || ord.quantity || 0;
                        const eventDeliveryTime = getCustomerSelectedEventTime(ord);

                        return (
                          <div 
                            key={ord.id}
                            className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/60 hover:border-crisp-carrot/50 transition-all space-y-2.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                                #{ord.invoiceNo || ord.id?.slice(0, 8).toUpperCase()}
                              </span>
                              <span className={cn(
                                "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize",
                                ord.status === 'approved' && "bg-emerald-500 text-white",
                                ord.status === 'pending' && "bg-amber-500 text-white",
                                ord.status === 'billed' && "bg-blue-600 text-white",
                                (ord.status as string) === 'completed' && "bg-stone-600 text-white"
                              )}>
                                {ord.status}
                              </span>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                  {isAdmin ? (ord.to || ord.name) : tl('Corporate Catering Session', 'Sesi Katering Korporat')}
                                </h5>
                                {ord.company && ord.company !== ord.to && (
                                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{ord.company}</p>
                                )}
                              </div>

                              <span className="text-xs font-black text-stone-900 dark:text-stone-100 tabular-nums shrink-0 px-2.5 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
                                {totalPax} {tl('Pax', 'Orang')}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{eventDeliveryTime}</span>
                              </div>
                              {ord.location && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  <span className="truncate">{ord.location}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                              <button
                                onClick={async () => {
                                  await triggerLightImpact();
                                  setSelectedOrder(ord);
                                }}
                                className="text-xs font-bold text-crisp-carrot hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {tl('View Details', 'Lihat Butiran')}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Notes (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      {tl('Operational Notes', 'Nota Operasi')}
                    </span>
                  </div>

                  {!currentUser ? (
                    <div className="p-5 rounded-xl bg-stone-50/60 dark:bg-stone-900/30 border border-stone-200/80 dark:border-stone-800 text-center space-y-2.5">
                      <p className="text-xs text-stone-500 font-medium">
                        {tl('Sign in to leave kitchen instructions or notes for this date.', 'Log masuk untuk menyimpan nota atau arahan dapur.')}
                      </p>
                      <button
                        onClick={async () => {
                          await triggerLightImpact();
                          setAuthModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90 transition-all cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        {tl('Sign In', 'Log Masuk')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Notes list */}
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {getNotesForDay(selectedDay).length === 0 ? (
                          <div className="p-4 text-center rounded-xl bg-stone-50/40 dark:bg-stone-900/20 border border-dashed border-stone-200 dark:border-stone-800">
                            <p className="text-xs text-stone-400">
                              {tl('No notes for this date.', 'Tiada nota untuk tarikh ini.')}
                            </p>
                          </div>
                        ) : (
                          getNotesForDay(selectedDay).map((n) => (
                            <div 
                              key={n.id}
                              className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-stone-400 font-semibold flex items-center gap-1">
                                  {n.userId === 'admin' ? (
                                    <span className="text-amber-600 font-bold flex items-center gap-1">
                                      <Shield className="w-3 h-3" /> Admin
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="w-3 h-3" /> {n.userName}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span>{format(parseISO(n.updatedAt), 'hh:mm a')}</span>
                                </span>

                                {(isAdmin || n.userId === currentUser.uid) && (
                                  <button
                                    onClick={() => handleDeleteNote(n.id)}
                                    className="text-stone-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-stone-700 dark:text-stone-300 font-medium whitespace-pre-wrap">
                                {n.note}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Note composer */}
                      <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {notePresets.slice(0, 3).map((preset, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => handleInsertPresetNote(preset)}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
                            >
                              +{preset}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder={tl('Add prep alert, special request...', 'Tambah arahan penyediaan, permintaan khusus...')}
                          maxLength={500}
                          rows={2}
                          className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-crisp-carrot transition-all resize-none"
                        />

                        <div className="flex items-center justify-end">
                          <button
                            onClick={handleSaveNote}
                            disabled={isSavingNote || !noteText.trim()}
                            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            {isSavingNote ? (
                              <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            {tl('Save Note', 'Simpan')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 4. MODAL: ORDER DETAILS */}
          {selectedOrder && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                
                {/* Banner Header */}
                <div className="relative h-32 w-full overflow-hidden shrink-0">
                  <img 
                    src={cateringBanner} 
                    alt="Catering" 
                    className="w-full h-full object-cover brightness-90"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase bg-crisp-carrot px-2 py-0.5 rounded-md">
                        {tl('Catering Event', 'Acara Katering')}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-display font-bold text-base tracking-tight mt-1 text-white">
                      {selectedOrder.guests || selectedOrder.quantity || 0} Pax • {selectedOrder.meals?.join(' & ') || 'Event'}
                    </h3>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-grow">
                  <div className="pb-2.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                        {isAdmin ? selectedOrder.to || selectedOrder.name : tl('Catering Session', 'Sesi Katering')}
                      </h4>
                      <p className="text-[11px] text-crisp-carrot font-semibold mt-0.5">
                        #{selectedOrder.invoiceNo || selectedOrder.id?.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
                      selectedOrder.status === 'approved' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      selectedOrder.status === 'pending' && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                      selectedOrder.status === 'billed' && "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    )}>
                      {selectedOrder.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 text-stone-600 dark:text-stone-300">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {getCustomerSelectedEventTime(selectedOrder)}
                        </span>
                        <span className="text-stone-400 block text-[11px]">
                          {getCustomerSelectedEventDay(selectedOrder)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {selectedOrder.location || tl('Delivery Location', 'Lokasi Penghantaran')}
                        </span>
                        {selectedOrder.to && (
                          <span className="text-stone-400 block text-[11px]">{selectedOrder.to}</span>
                        )}
                      </div>
                    </div>

                    {(selectedOrder.menu || selectedOrder.dishes) && (
                      <div className="flex items-start gap-2.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                        <div className="flex-grow">
                          <span className="font-semibold text-stone-900 dark:text-white block mb-1">
                            {tl('Menu & Dishes', 'Menu & Hidangan')}
                          </span>
                          {selectedOrder.menu && (
                            <p className="bg-stone-50 dark:bg-stone-800 p-2 rounded-lg text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                              {selectedOrder.menu}
                            </p>
                          )}
                          {selectedOrder.dishes && selectedOrder.dishes.length > 0 && (
                            <div className="space-y-1 mt-1 pl-1">
                              {selectedOrder.dishes.map((dish, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span>{dish}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedOrder.notes && (
                      <div className="flex items-start gap-2.5 pt-1">
                        <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                        <div className="flex-grow">
                          <span className="font-semibold text-stone-900 dark:text-white block">
                            {tl('Notes', 'Nota')}
                          </span>
                          <p className="bg-stone-50 dark:bg-stone-800 p-2 rounded-lg text-[11px] text-stone-600 dark:text-stone-300 italic mt-0.5">
                            "{selectedOrder.notes}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    {tl('Close', 'Tutup')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      if (isAdmin) {
                        navigate('/admin', { state: { highlightOrderId: selectedOrder.id } });
                      } else {
                        navigate('/profile');
                      }
                    }}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-crisp-carrot text-white hover:bg-crisp-carrot/90 transition-all shadow-xs cursor-pointer"
                  >
                    {isAdmin ? tl('Open in Admin', 'Buka di Admin') : tl('View in Profile', 'Lihat di Profil')}
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

