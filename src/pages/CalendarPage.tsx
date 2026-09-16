import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/api';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import WawasanLoader from '@/components/WawasanLoader';
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
  CheckCircle2,
  Sparkles
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
import { getMalaysiaHolidayInfo } from '@/constants/malaysiaHolidays';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
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
          fetch(getApiUrl('/api/calendar-sessions'), { signal: controller.signal }),
          fetch(getApiUrl('/api/calendar-orders'), { signal: controller.signal })
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

    if (isAdmin) {
      const ordersCol = collection(db, 'orders');
      const qOrders = query(ordersCol, orderBy('createdAt', 'desc'), limit(150));
      unsubscribeOrders1 = onSnapshot(qOrders, (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          list.push({ ...data, id: docSnap.id });
        });
        setOrders(list);
        setLoading(false);
      }, (err) => {
        console.warn("Order stream permission note:", err);
        setLoading(false);
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
    } else if (currentUser) {
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
    } else {
      // Unauthenticated visitor
      setOrders([]);
      setCalendarNotes([]);
      setLoading(false);
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

  // Bucket active orders by date string ONCE per activeOrders change, instead
  // of re-scanning the full array for every rendered day cell (~35-42 cells
  // per month). getOrdersForDay/getDailySessions become O(1) map lookups.
  const ordersByDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of activeOrders) {
      const key = getOrderDateString(order);
      if (!key) continue;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(order);
      } else {
        map.set(key, [order]);
      }
    }
    return map;
  }, [activeOrders]);

  type DailySessions = {
    breakfast: { count: number; pax: number };
    lunch: { count: number; pax: number };
    hi_tea: { count: number; pax: number };
  };

  // Same idea for the per-day session aggregates used as a fallback when the
  // server-computed `aggregatedSessions` cache doesn't have an entry.
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, DailySessions>();
    for (const order of activeOrders) {
      const key = getOrderDateString(order);
      if (!key) continue;
      let sessions = map.get(key);
      if (!sessions) {
        sessions = {
          breakfast: { count: 0, pax: 0 },
          lunch: { count: 0, pax: 0 },
          hi_tea: { count: 0, pax: 0 },
        };
        map.set(key, sessions);
      }

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
    }
    return map;
  }, [activeOrders]);

  const emptySessions: DailySessions = {
    breakfast: { count: 0, pax: 0 },
    lunch: { count: 0, pax: 0 },
    hi_tea: { count: 0, pax: 0 },
  };

  // Same idea for notes: bucket by date once per calendarNotes change.
  const notesByDate = useMemo(() => {
    const map = new Map<string, CalendarNote[]>();
    for (const note of calendarNotes) {
      const bucket = map.get(note.date);
      if (bucket) {
        bucket.push(note);
      } else {
        map.set(note.date, [note]);
      }
    }
    return map;
  }, [calendarNotes]);

  // Retrieve active orders on a given date
  const getOrdersForDay = (date: Date) => {
    const targetDateStr = format(date, 'yyyy-MM-dd');
    return ordersByDate.get(targetDateStr) || [];
  };

  // For aggregate counters on the grid cells
  const getDailySessions = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (aggregatedSessions[dateStr]) {
      return aggregatedSessions[dateStr];
    }
    return sessionsByDate.get(dateStr) || emptySessions;
  };

  const getNotesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayNotes = notesByDate.get(dateStr) || [];
    if (isAdmin) return dayNotes;
    return dayNotes.filter((n) => n.userId === currentUser?.uid);
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

  // Save/Update note in Firestore via Express API
  const handleSaveNote = async () => {
    if (!currentUser || !selectedDay) return;
    setIsSavingNote(true);

    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      const uid = isAdmin ? 'admin' : currentUser.uid;
      const docId = `${uid}_${dateStr}`;

      const token = localStorage.getItem('wawasan_admin_token') || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      if (!noteText.trim()) {
        const res = await fetch(getApiUrl(`/api/calendar-notes/${docId}`), {
          method: 'DELETE',
          headers
        });
        if (!res.ok) throw new Error('Failed to delete note');
      } else {
        const res = await fetch(getApiUrl('/api/calendar-notes'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            date: dateStr,
            note: noteText.trim()
          })
        });
        if (!res.ok) throw new Error('Failed to save note');
      }

      await triggerMediumImpact();
      setIsSavingNote(false);
    } catch (error) {
      console.error("Failed to save calendar note via API:", error);
      setIsSavingNote(false);
    }
  };

  // Delete note from Firestore via Express API
  const handleDeleteNote = async (noteId: string) => {
    await triggerLightImpact();
    try {
      const token = localStorage.getItem('wawasan_admin_token') || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch(getApiUrl(`/api/calendar-notes/${noteId}`), {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete note');
      await triggerMediumImpact();
      setNoteText('');
    } catch (error) {
      console.error("Failed to delete note via API:", error);
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleToday}
      className="text-xs font-semibold px-3 py-1.5 h-auto rounded-lg"
    >
      {tl('Today', 'Hari Ini')}
    </Button>
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
        showBatik={true}
        backHref="/home"
        actions={todayAction}
      >
        <div className="w-full space-y-5 pb-20">

          {/* 1. CALENDAR CONTROLS & HEADER */}
          <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors duration-200">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={handlePrevMonth}
                className="rounded-xl shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/60 dark:border-stone-700/60"
                aria-label={tl('Previous Month', 'Bulan Sebelumnya')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="text-center flex-1">
                <h2 className="font-display font-bold text-lg sm:text-2xl text-stone-900 dark:text-stone-100 capitalize tracking-tight leading-tight">
                  {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                </h2>
              </div>

              <Button
                variant="secondary"
                size="icon"
                onClick={handleNextMonth}
                className="rounded-xl shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/60 dark:border-stone-700/60"
                aria-label={tl('Next Month', 'Bulan Seterusnya')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 2. CALENDAR GRID WITH BATIK PATTERN OVERLAYS */}
          {loading ? (
            <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-stone-800 rounded-2xl p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
              <WawasanLoader size={64} />
              <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">
                {tl('Loading kitchen calendar...', 'Memuatkan jadual dapur...')}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
              
              {/* Weekdays Header Row with Batik Overlay */}
              <div className="relative overflow-hidden grid grid-cols-7 border-b border-amber-900/10 dark:border-stone-800 bg-deep-forest text-amber-100 dark:bg-stone-900 dark:text-amber-200 shadow-inner">
                {/* Batik Background Layer for Weekday Header */}
                <div 
                  className="absolute inset-0 pattern-batik opacity-35 dark:opacity-25 pointer-events-none mix-blend-overlay"
                  aria-hidden="true"
                />
                {weekdays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "relative z-10 py-2.5 sm:py-3 text-center text-xs sm:text-xs font-black tracking-widest uppercase select-none drop-shadow-xs",
                      day.weekend 
                        ? "text-rose-300 dark:text-rose-400 font-black" 
                        : "text-amber-100 dark:text-amber-200/90"
                    )}
                  >
                    <span className="hidden sm:inline">{day.full}</span>
                    <span className="sm:hidden">{day.label}</span>
                  </div>
                ))}
              </div>

              {/* Days Matrix */}
              <div className="grid grid-cols-7 divide-x divide-y divide-stone-200/80 dark:divide-stone-800">
                
                {/* 1. Leading Prev Month Days (Batik Overlay + Stripe Shading) */}
                {prevMonthDays.map((pDay) => (
                  <div
                    key={`prev-${pDay.toISOString()}`}
                    className="min-h-[64px] sm:min-h-[100px] p-1 sm:p-2.5 relative select-none overflow-hidden cal-striped-outside pattern-batik flex flex-col justify-start bg-amber-950/5 dark:bg-amber-100/5"
                  >
                    <span className="text-xs sm:text-xs font-semibold text-stone-400 dark:text-stone-500 tabular-nums relative z-10">
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
                  const dateIso = format(day, 'yyyy-MM-dd');
                  const holiday = getMalaysiaHolidayInfo(dateIso);

                  return (
                    /**
                     * DESIGN-SYSTEM-EXCEPTION: Calendar Matrix Day Cell
                     * Domain-specific calendar grid cell (aspect-square matrix item with indicators).
                     * Exempt from generic <Button> primitive migration.
                     */
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "min-h-[64px] sm:min-h-[100px] p-1 sm:p-2.5 flex flex-col justify-between transition-all text-left relative cursor-pointer group select-none bg-white hover:bg-stone-50/80 dark:bg-card dark:hover:bg-stone-800/60",
                        isDaySelected 
                          ? "ring-2 ring-inset ring-crisp-carrot bg-orange-50/70 dark:bg-orange-950/30 z-10" 
                          : holiday
                          ? "bg-amber-50/60 dark:bg-amber-950/20"
                          : ""
                      )}
                    >
                      {/* Top Row: Day Number & Indicators */}
                      <div className="flex items-center justify-between w-full">
                        {isCurrentDay ? (
                          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-crisp-carrot text-white text-xs sm:text-xs font-black flex items-center justify-center shadow-xs">
                            {format(day, 'd')}
                          </span>
                        ) : (
                          <span className={cn(
                            "text-xs sm:text-sm font-bold tabular-nums transition-colors flex items-center gap-1",
                            isDaySelected 
                              ? "text-crisp-carrot scale-105" 
                              : holiday
                              ? "text-amber-600 dark:text-amber-400 font-black"
                              : isWeekendDay 
                              ? "text-rose-500 dark:text-rose-400"
                              : "text-stone-700 dark:text-stone-200 group-hover:text-crisp-carrot"
                          )}>
                            {format(day, 'd')}
                          </span>
                        )}

                        {/* Holiday / Note Indicators */}
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          {holiday && (
                            <span title={holiday.nameBm}>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                            </span>
                          )}
                          {dayNotes.length > 0 && (
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-stone-900" title={tl('Has note', 'Ada nota')} />
                          )}
                        </div>
                      </div>

                      {/* Holiday Micro-label */}
                      {holiday && (
                        <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400 truncate max-w-full my-0.5" title={holiday.nameBm}>
                          {holiday.nameBm}
                        </div>
                      )}

                      {/* Bottom Info: Meal Badges */}
                      <div className="mt-auto pt-1 w-full">
                        {hasOrders ? (
                          <div className="space-y-1">
                            {/* Meal Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {sessions.breakfast.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-extrabold bg-[var(--color-warning)] text-stone-950 dark:text-white shadow-2xs leading-none">
                                  B
                                </span>
                              )}
                              {sessions.lunch.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-extrabold bg-[var(--color-success)] text-white shadow-2xs leading-none">
                                  L
                                </span>
                              )}
                              {sessions.hi_tea.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-extrabold bg-[var(--color-accent)] text-white shadow-2xs leading-none">
                                  T
                                </span>
                              )}
                            </div>

                            {/* Pax summary line */}
                            <div className="text-xs font-bold tracking-tight text-stone-500 dark:text-stone-400 truncate flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-extrabold tabular-nums text-xs leading-none">
                                {totalPax > 0 ? `${totalPax}p` : `${dayOrders.length} ord`}
                              </span>
                              <span className="hidden sm:inline opacity-75 font-medium text-xs">
                                ({dayOrders.length})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-transparent select-none leading-none">·</span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* 3. Trailing Next Month Days (Batik Overlay + Stripe Shading) */}
                {nextMonthDays.map((nDay) => (
                  <div
                    key={`next-${nDay.toISOString()}`}
                    className="min-h-[64px] sm:min-h-[100px] p-1 sm:p-2.5 relative select-none overflow-hidden cal-striped-outside pattern-batik flex flex-col justify-start bg-amber-950/5 dark:bg-amber-100/5"
                  >
                    <span className="text-xs sm:text-xs font-semibold text-stone-400 dark:text-stone-500 tabular-nums relative z-10">
                      {format(nDay, 'd')}
                    </span>
                  </div>
                ))}

              </div>
            </div>
          )}

          {/* 3. REFINED SELECTED DAY AGENDA */}
          {selectedDay && (
            <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
              
              {/* Day Header */}
              <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300 shrink-0">
                    <CalendarIcon className="w-4 h-4 text-crisp-carrot" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 leading-tight">
                        {format(selectedDay, 'EEEE, dd MMMM yyyy', { locale: dateLocale })}
                      </h3>
                      {isToday(selectedDay) && (
                        <span className="px-2 py-0.5 rounded-full bg-crisp-carrot/10 text-crisp-carrot text-xs font-bold">
                          {tl('Today', 'Hari Ini')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
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
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-warning)] text-stone-950 flex items-center gap-1.5 shadow-xs">
                          <Coffee className="w-3.5 h-3.5" />
                          <span>Breakfast: {selectedDaySessions.breakfast.pax}p</span>
                        </span>
                      )}
                      {selectedDaySessions.lunch.pax > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-success)] text-white flex items-center gap-1.5 shadow-xs">
                          <Sun className="w-3.5 h-3.5" />
                          <span>Lunch: {selectedDaySessions.lunch.pax}p</span>
                        </span>
                      )}
                      {selectedDaySessions.hi_tea.pax > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-accent)] text-white flex items-center gap-1.5 shadow-xs">
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
                      <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        {tl('Bookings for this day', 'Tempahan hari ini')} ({getOrdersForDay(selectedDay).length})
                      </span>
                    </div>

                    {getOrdersForDay(selectedDay).length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 space-y-3">
                        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          {tl('Kitchen is open with no orders scheduled yet.', 'Dapur dibuka tanpa tempahan dijadualkan.')}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/order?date=${format(selectedDay, 'yyyy-MM-dd')}`)}
                          className="gap-1.5 text-xs font-bold rounded-xl shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          {tl('Book for this date', 'Tempah untuk tarikh ini')}
                        </Button>
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
                                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                                  #{ord.invoiceNo || ord.id?.slice(0, 8).toUpperCase()}
                                </span>
                                <span className={cn(
                                  "text-xs font-extrabold px-2.5 py-0.5 rounded-full capitalize",
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    await triggerLightImpact();
                                    setSelectedOrder(ord);
                                  }}
                                  className="text-xs font-bold text-crisp-carrot hover:underline gap-1 p-0 h-auto"
                                >
                                  {tl('View Details', 'Lihat Butiran')}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
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
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        {tl('Operational Notes', 'Nota Operasi')}
                      </span>
                    </div>

                    {!currentUser ? (
                      <div className="p-5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 text-center space-y-2.5">
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                          {tl('Sign in to leave kitchen instructions or notes for this date.', 'Log masuk untuk menyimpan nota atau arahan dapur.')}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            await triggerLightImpact();
                            setAuthModalOpen(true);
                          }}
                          className="gap-1.5 text-xs font-semibold rounded-lg"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          {tl('Sign In', 'Log Masuk')}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Notes list */}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {getNotesForDay(selectedDay).length === 0 ? (
                            <div className="p-4 text-center rounded-xl bg-stone-50/60 dark:bg-stone-900/30 border border-dashed border-stone-200 dark:border-stone-800">
                              <p className="text-xs text-stone-400">
                                {tl('No notes for this date.', 'Tiada nota untuk tarikh ini.')}
                              </p>
                            </div>
                          ) : (
                            getNotesForDay(selectedDay).map((n) => (
                              <div 
                                key={n.id}
                                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1">
                                    {n.userId === 'admin' ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
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
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteNote(n.id)}
                                      className="text-stone-400 hover:text-rose-500 p-0.5 h-6 w-6 rounded transition-colors"
                                      aria-label={tl('Delete note', 'Padam nota')}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-stone-800 dark:text-stone-200 font-medium whitespace-pre-wrap">
                                  {n.note}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Note composer */}
                        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {notePresets.slice(0, 3).map((preset, pIdx) => (
                              <Chip
                                key={pIdx}
                                variant="preset"
                                size="xs"
                                onClick={() => handleInsertPresetNote(preset)}
                              >
                                +{preset}
                              </Chip>
                            ))}
                          </div>

                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder={tl('Add prep alert, special request...', 'Tambah arahan penyediaan, permintaan khusus...')}
                            maxLength={500}
                            rows={2}
                            className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-crisp-carrot transition-all resize-none"
                          />

                          <div className="flex items-center justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleSaveNote}
                              disabled={isSavingNote || !noteText.trim()}
                              className="text-xs font-semibold rounded-lg gap-1"
                            >
                              {isSavingNote ? (
                                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              {tl('Save Note', 'Simpan')}
                            </Button>
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
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
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
                      <span className="text-xs font-bold uppercase bg-crisp-carrot px-2 py-0.5 rounded-md">
                        {tl('Catering Event', 'Acara Katering')}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedOrder(null)}
                        className="p-1 h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                        aria-label={tl('Close', 'Tutup')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
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
                      <p className="text-xs text-crisp-carrot font-semibold mt-0.5">
                        #{selectedOrder.invoiceNo || selectedOrder.id?.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full capitalize",
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
                        <span className="text-stone-400 block text-xs">
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
                          <span className="text-stone-400 block text-xs">{selectedOrder.to}</span>
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
                            <p className="bg-stone-50 dark:bg-stone-800 p-2 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200">
                              {selectedOrder.menu}
                            </p>
                          )}
                          {selectedOrder.dishes && selectedOrder.dishes.length > 0 && (
                            <div className="space-y-1 mt-1 pl-1">
                              {selectedOrder.dishes.map((dish, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
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
                          <p className="bg-stone-50 dark:bg-stone-800 p-2 rounded-lg text-xs text-stone-600 dark:text-stone-300 italic mt-0.5">
                            "{selectedOrder.notes}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs font-semibold rounded-lg"
                  >
                    {tl('Close', 'Tutup')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(null);
                      if (isAdmin) {
                        navigate('/admin', { state: { highlightOrderId: selectedOrder.id } });
                      } else {
                        navigate('/profile');
                      }
                    }}
                    className="text-xs font-semibold rounded-lg shadow-xs"
                  >
                    {isAdmin ? tl('Open in Admin', 'Buka di Admin') : tl('View in Profile', 'Lihat di Profil')}
                  </Button>
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

