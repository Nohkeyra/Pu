import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import cateringBanner from '@/assets/images/catering_banner_1786465796537.jpg';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Coffee,
  Sun,
  Cookie,
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
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PageShell from '@/components/PageShell';
import AuthModal from '@/components/AuthModal';
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

  // 1. Fetch aggregated calendar workloads publicly from our server-side API (no auth restriction!)
  useEffect(() => {
    const fetchAggregatedSessions = async () => {
      try {
        const res = await fetch('/api/calendar-sessions');
        const data = await res.json();
        if (data.success && data.sessions) {
          setAggregatedSessions(data.sessions);
        }
      } catch (err) {
        console.error("Failed to fetch server-side aggregated calendar sessions:", err);
      } finally {
        if (!auth.currentUser) {
          setLoading(false);
        }
      }
    };
    fetchAggregatedSessions();
  }, [currentUser]);

  // 2. Real-time direct Firestore bindings ONLY matching exact auth permission capability rules
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setCalendarNotes([]);
      setLoading(false);
      return;
    }

    let unsubscribeOrders1 = () => {};
    let unsubscribeOrders2 = () => {};
    let unsubscribeNotes = () => {};

    if (isAdmin) {
      // Admins are authorized to listen to the whole collection
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
        console.warn("Admin order stream permission note:", err);
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
        console.warn("Admin notes stream permission note:", err);
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

  // Normalize and extract Date from an Order
  const getOrderDate = (order: Order): Date | null => {
    if (!order) return null;
    try {
      if (order.eventDate) {
        if (order.eventDate instanceof Date) return order.eventDate;
        if (typeof order.eventDate === 'string') return parseISO(order.eventDate);
        if (typeof order.eventDate === 'object' && 'seconds' in order.eventDate) {
          return new Date((order.eventDate as any).seconds * 1000);
        }
      }
      if (order.date) {
        if (order.date instanceof Date) return order.date;
        if (typeof order.date === 'string') return parseISO(order.date);
        if (typeof order.date === 'object' && 'seconds' in order.date) {
          return new Date((order.date as any).seconds * 1000);
        }
      }
      if (order.dateTime) {
        return parseISO(order.dateTime);
      }
      if (order.createdAt) {
        if (order.createdAt instanceof Date) return order.createdAt;
        if (typeof order.createdAt === 'string') return parseISO(order.createdAt);
        if (typeof order.createdAt === 'object' && 'seconds' in order.createdAt) {
          return new Date((order.createdAt as any).seconds * 1000);
        }
      }
    } catch (e) {
      console.warn("Failed to parse order date:", order, e);
    }
    return null;
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

  // Filter orders based on user permission role:
  // - Admin: see all orders
  // - Logged-in Customer/Member: see only personal orders matching uid/userId
  // - Public: returns empty to protect private details
  const getVisibleOrders = () => {
    if (isAdmin) {
      return activeOrders;
    }
    if (currentUser) {
      return activeOrders.filter(
        (o) => (o as any).uid === currentUser.uid || o.userId === currentUser.uid
      );
    }
    return [];
  };

  // Retrieve active orders on a given date (for displaying detailed rows inside Day modal)
  const getOrdersForDay = (date: Date) => {
    return getVisibleOrders().filter((order) => {
      const oDate = getOrderDate(order);
      return oDate ? isSameDay(oDate, date) : false;
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
      const oDate = getOrderDate(order);
      return oDate ? isSameDay(oDate, date) : false;
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
        <div className="w-full space-y-6 pb-20">
          {/* Month Controller */}
          <div className="flex items-center justify-between bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 p-3 sm:p-4 rounded-xl shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 text-deep-forest dark:text-white hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors"
              title={tl('Previous Month', 'Bulan Sebelumnya')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h3 className="font-display font-extrabold text-base sm:text-lg text-deep-forest dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy')}
            </h3>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 text-deep-forest dark:text-white hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors"
              title={tl('Next Month', 'Bulan Seterusnya')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>


          {/* Status legend — clearer colour meaning */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden />
              {tl('Pending', 'Menunggu')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden />
              {tl('Approved', 'Diluluskan')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden />
              {tl('Billed', 'Dibilkan')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-400" aria-hidden />
              {tl('Notes', 'Nota')}
            </span>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-12 text-center shadow-sm">
              <Clock className="w-8 h-8 text-crisp-carrot animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-deep-forest dark:text-stone-300">
                {tl('Loading live kitchen calendar...', 'Memuatkan jadual langsung dapur...')}
              </p>
            </div>
          ) : (
            /* Monthly Calendar Grid with glowing day highlights */
            <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl shadow-sm overflow-hidden font-sans">
              {/* Day Labels Row */}
              <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 py-2 sm:py-3">
                {weekdays.map((day, index) => (
                  <div key={index} className="text-center text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Tiles Grid */}
              <div className="grid grid-cols-7 bg-stone-100/40 dark:bg-stone-950/20 gap-[1px]">
                {Array.from({ length: startDayIndex }).map((_, i) => (
                  <div 
                    key={`empty-${i}`} 
                    className="min-h-[100px] sm:min-h-[140px] bg-white dark:bg-card/20 opacity-30 border-b border-r border-stone-200/40 dark:border-stone-800/40"
                  />
                ))}

                {daysInMonth.map((day) => {
                  const sessions = getDailySessions(day);
                  const hasBreakfast = sessions.breakfast.count > 0;
                  const hasLunch = sessions.lunch.count > 0;
                  const hasHiTea = sessions.hi_tea.count > 0;
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
                        "min-h-[100px] sm:min-h-[140px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all border-b border-r border-stone-200/50 dark:border-stone-800/50 hover:bg-stone-50/70 dark:hover:bg-stone-900/40 text-left focus:outline-none focus:ring-1 focus:ring-inset focus:ring-crisp-carrot",
                        isCurrentDay ? "bg-amber-500/5" : "bg-white dark:bg-card",
                        // Glowing Color Rings and ambient backing depending on daily volume limit
                        isExtremeVolume && "ring-2 ring-rose-500 bg-rose-500/5 dark:bg-rose-950/15 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse",
                        isHeavyVolume && "ring-2 ring-amber-500 bg-amber-500/5 dark:bg-amber-950/15 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      )}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between w-full">
                        {isCurrentDay ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-crisp-carrot text-white text-xs font-extrabold shadow-sm">
                            {format(day, 'd')}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                            {format(day, 'd')}
                          </span>
                        )}

                        {/* Visual indicator overlay if this date contains notes */}
                        {hasNote && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900 shadow-sm" title={tl('Has Notes', 'Mempunyai Nota')} />
                        )}
                      </div>

                      {/* Sessions List */}
                      <div className="space-y-1.5 mt-2 flex-grow flex flex-col justify-end w-full">
                        {hasBreakfast && (
                          <div className={cn(
                            "p-1 rounded text-[10px] font-bold leading-tight flex items-center justify-between w-full shadow-sm",
                            sessions.breakfast.pax >= 80 
                              ? "bg-rose-600 text-white" 
                              : sessions.breakfast.pax >= 50 
                              ? "bg-amber-500 text-black font-extrabold" 
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          )}>
                            <span className="truncate flex items-center gap-1">
                              <Coffee className="w-2.5 h-2.5 shrink-0" />
                              {tl(`Bf - ${sessions.breakfast.count}`, `Sar - ${sessions.breakfast.count}`)}
                            </span>
                            <span className="ml-1 text-[9px] shrink-0 font-extrabold">
                              {sessions.breakfast.pax}p
                            </span>
                          </div>
                        )}

                        {hasLunch && (
                          <div className={cn(
                            "p-1 rounded text-[10px] font-bold leading-tight flex items-center justify-between w-full shadow-sm",
                            sessions.lunch.pax >= 80 
                              ? "bg-rose-600 text-white" 
                              : sessions.lunch.pax >= 50 
                              ? "bg-amber-500 text-black font-extrabold" 
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          )}>
                            <span className="truncate flex items-center gap-1">
                              <Sun className="w-2.5 h-2.5 shrink-0" />
                              {tl(`Lh - ${sessions.lunch.count}`, `Tgh - ${sessions.lunch.count}`)}
                            </span>
                            <span className="ml-1 text-[9px] shrink-0 font-extrabold">
                              {sessions.lunch.pax}p
                            </span>
                          </div>
                        )}

                        {hasHiTea && (
                          <div className={cn(
                            "p-1 rounded text-[10px] font-bold leading-tight flex items-center justify-between w-full shadow-sm",
                            sessions.hi_tea.pax >= 80 
                              ? "bg-rose-600 text-white" 
                              : sessions.hi_tea.pax >= 50 
                              ? "bg-amber-500 text-black font-extrabold" 
                              : "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          )}>
                            <span className="truncate flex items-center gap-1">
                              <Cookie className="w-2.5 h-2.5 shrink-0" />
                              {tl(`Tea - ${sessions.hi_tea.count}`, `Ptg - ${sessions.hi_tea.count}`)}
                            </span>
                            <span className="ml-1 text-[9px] shrink-0 font-extrabold">
                              {sessions.hi_tea.pax}p
                            </span>
                          </div>
                        )}

                        {maxSessionPax >= 50 && (
                          <div className="pt-0.5 text-center leading-none">
                            { isExtremeVolume ? (
                              <span className="text-[8px] uppercase tracking-wider font-extrabold text-rose-600 dark:text-rose-400 block">
                                ⚠️ {tl('Delay Warning', 'Awas Lewat')}
                              </span>
                            ) : (
                              <span className="text-[8px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-500 block">
                                ⚠️ {tl('Heavy Load', 'Padat')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Day Details Section - Rendered Inline! */}
          {selectedDay && (
            <div id="selected-day-details" className="bg-card dark:bg-card/40 border border-stone-200/85 dark:border-white/10 rounded-xl shadow-sm overflow-hidden font-sans animate-fade-in mt-6">
              {/* Header with visual accents */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-100 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-crisp-carrot/10 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-crisp-carrot" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-deep-forest dark:text-white">
                      {format(selectedDay, tl('EEEE, dd MMMM yyyy', 'EEEE, dd MMMM yyyy'))}
                    </h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      {tl('Schedule & Kitchen Instructions', 'Jadual & Arahan Dapur')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-850 transition-colors"
                >
                  {tl('Clear Selection', 'Kosongkan Pilihan')}
                </button>
              </div>

              {/* Grid content split into two symmetric columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6">
                
                {/* Column 1: Catering Bookings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-stone-100 dark:border-stone-800">
                    <Clock className="w-4 h-4 text-crisp-carrot" />
                    {tl('Catering Bookings on this Day', 'Rekod Tempahan pada Hari Ini')}
                  </h4>

                  {getOrdersForDay(selectedDay).length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-stone-50 dark:bg-stone-950/20 border border-stone-150 dark:border-stone-850/60">
                      <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">
                        {currentUser 
                          ? tl('You have no active catering orders on this date.', 'Tiada tempahan katering aktif anda pada tarikh ini.')
                          : tl('No public sessions listed on this date.', 'Tiada sesi katering am tersenarai pada tarikh ini.')}
                      </p>
                      {!currentUser && (
                        <p className="text-xs text-stone-400 mt-1.5">
                          {tl('Sign in to view your corporate bookings.', 'Log masuk untuk melihat tempahan korporat anda.')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
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
                              "w-full p-4 rounded-xl border transition-all text-left block relative group hover:scale-[1.01] shadow-sm",
                              isAdmin 
                                ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20" 
                                : "bg-stone-50 hover:bg-stone-100 dark:bg-stone-950/40 dark:hover:bg-stone-900/50 border-stone-200 dark:border-white/5"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-crisp-carrot">
                                #{ord.invoiceNo || ord.id?.slice(0, 8).toUpperCase()}
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize",
                                ord.status === 'approved' && "bg-emerald-150 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
                                ord.status === 'pending' && "bg-amber-150 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
                                ord.status === 'billed' && "bg-blue-150 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
                                (ord.status as string) === 'completed' && "bg-stone-150 text-stone-800 dark:bg-stone-950/30 dark:text-stone-400"
                              )}>
                                {ord.status}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-deep-forest dark:text-white mt-2 truncate pr-8">
                              {isAdmin ? ord.to || ord.name : tl('Your Corporate Booking', 'Tempahan Korporat Anda')}
                            </p>

                            <div className="flex items-center justify-between mt-3 text-[11px] text-stone-500 dark:text-stone-400">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 font-semibold text-deep-forest dark:text-stone-300">
                                  <Clock className="w-3.5 h-3.5 text-crisp-carrot shrink-0" /> {eventDeliveryTime}
                                </span>
                                <span className="font-semibold bg-stone-200/50 dark:bg-stone-800/80 px-2 py-0.5 rounded text-[10px]">
                                  {totalPax} Pax
                                </span>
                              </div>
                              <span className="text-[10px] text-crisp-carrot font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {tl('View Details', 'Butiran')} <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Column 2: Personal Scheduling Notes */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-stone-100 dark:border-stone-800">
                    <FileText className="w-4 h-4 text-crisp-carrot" />
                    {tl('Personal Scheduling Notes', 'Nota Jadual Peribadi')}
                  </h4>

                  {!currentUser ? (
                    <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center space-y-4 shadow-sm">
                      <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                        {tl(
                          'You must be signed in to your Member or Administrator account to write and save notes on the calendar.',
                          'Sila log masuk ke akaun Ahli atau Pentadbir untuk menulis dan menyimpan nota peribadi pada kalendar.'
                        )}
                      </p>
                      <button
                        onClick={async () => {
                          await triggerLightImpact();
                          setAuthModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-xl bg-crisp-carrot text-white hover:bg-opacity-90 shadow-sm transition-all"
                      >
                        <LogIn className="w-4 h-4" />
                        {tl('Sign In / Register', 'Log Masuk / Daftar')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Existing notes list display */}
                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                        {getNotesForDay(selectedDay).length === 0 ? (
                          <p className="text-xs text-stone-400 dark:text-stone-500 italic py-4 text-center">
                            {tl('No scheduling notes saved for this date.', 'Tiada nota jadual disimpan untuk tarikh ini.')}
                          </p>
                        ) : (
                          getNotesForDay(selectedDay).map((n) => (
                            <div 
                              key={n.id}
                              className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/20 border border-stone-200/50 dark:border-white/5 space-y-1.5 relative group shadow-sm animate-fade-in"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
                                  {n.userId === 'admin' ? (
                                    <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                                      <Shield className="w-3 h-3" /> Admin
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-stone-500 font-bold">
                                      <UserIcon className="w-3 h-3" /> {n.userName}
                                    </span>
                                  )}
                                  • {format(parseISO(n.updatedAt), 'hh:mm a')}
                                </span>

                                {/* Delete action button (only author can delete) */}
                                {(isAdmin || n.userId === currentUser.uid) && (
                                  <button
                                    onClick={() => handleDeleteNote(n.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                    title={tl('Delete note', 'Padam nota')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs font-medium text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                                {n.note}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Notes Input Field for Editing/Creating */}
                      <div className="space-y-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder={isAdmin 
                            ? tl('Add kitchen instruction note, prep alert, or delivery note...', 'Tambah nota arahan dapur, awas persediaan, atau pesanan penghantaran...')
                            : tl('Add personal reminder, event coordinator name, or guest request...', 'Tambah peringatan peribadi, nama penyelaras acara, atau permintaan tetamu...')}
                          maxLength={1000}
                          rows={3}
                          className="w-full text-xs font-medium p-3 rounded-xl border border-stone-200 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-900/20 text-stone-800 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-crisp-carrot focus:border-crisp-carrot"
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={handleSaveNote}
                            disabled={isSavingNote}
                            className="text-xs font-bold px-4 py-2 rounded-xl bg-crisp-carrot hover:bg-opacity-90 text-white disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                          >
                            {isSavingNote ? (
                              <>
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                {tl('Saving...', 'Menyimpan...')}
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
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
