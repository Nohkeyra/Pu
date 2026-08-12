import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Check, 
  Phone, 
  ArrowRight, 
  User as UserIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, safeCopyToClipboard, getAssetUrl, safeJsonStringify } from '@/lib/utils';
import { generateInvoicePDF } from '@/services/pdfService';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { AnimatePresence } from 'motion/react';
import { getApiUrl, fetchWithCache } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AuthModal from './AuthModal';
import { Step1EventMeal } from './order/Step1EventMeal';
import { Step2DishSelection } from './order/Step2DishSelection';
import { Step3ContactDetails } from './order/Step3ContactDetails';
import { Step4ReviewSubmit } from './order/Step4ReviewSubmit';
import { Step5OrderSuccess } from './order/Step5OrderSuccess';
import { DEFAULT_MENU_ITEMS } from '@/constants/menu';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { buildShareableUrl } from '@/lib/share';
import { triggerNotification, NotificationType, triggerLightImpact } from '@/lib/haptics';
import { addPendingOrder } from '@/lib/pendingOrdersQueue';
import { logOrderStep, logOrderSubmitted } from '@/services/analyticsService';
import { recordException } from '@/services/crashlyticsService';
import type { SavedLocation, Order } from '@/types';

// FOOD MENU CONSTANTS FROM KIMI HTML
const LAUK_UTAMA = [
  { id: 'asam_pedas', nameEn: 'Asam Pedas', nameBm: 'Asam Pedas', descEn: 'Fresh fish cooked in spicy, tangy herbal gravy', descBm: 'Ikan segar dimasak asam pedas berempah', price: 12 },
  { id: 'ayam_goreng', nameEn: 'Spiced Fried Chicken', nameBm: 'Ayam Goreng Berempah', descEn: 'Crispy fried chicken with aromatic traditional spices', descBm: 'Ayam goreng crispy dengan rempah istimewa', price: 10 },
  { id: 'daging_masak_merah', nameEn: 'Beef Masak Merah', nameBm: 'Daging Masak Merah', descEn: 'Tender beef cooked in rich sweet and savory tomato sauce', descBm: 'Daging lembu dimasak merah dengan tomato', price: 14 },
  { id: 'sambal_sotong', nameEn: 'Sambal Squid', nameBm: 'Sambal Sotong', descEn: 'Squid cooked in rich chili sambal paste', descBm: 'Sotong dimasak sambal petai', price: 13 },
  { id: 'ikan_keli', nameEn: 'Sambal Catfish', nameBm: 'Ikan Keli Sambal', descEn: 'Crispy fried catfish tossed in fiery house sambal', descBm: 'Ikan keli goreng dengan sambal', price: 11 },
  { id: 'rendang_daging', nameEn: 'Beef Rendang', nameBm: 'Rendang Daging', descEn: 'Slow-cooked traditional caramelized beef curry', descBm: 'Rendang daging lembu tradisional', price: 15 },
  { id: 'kari_kambing', nameEn: 'Mutton Curry', nameBm: 'Kari Kambing', descEn: 'Rich, thick spiced mutton curry', descBm: 'Kari kambing berempah pekat', price: 16 },
  { id: 'udang_goreng', nameEn: 'Crispy Fried Prawns', nameBm: 'Udang Goreng Tepung', descEn: 'Crispy golden batter-fried fresh prawns', descBm: 'Udang goreng tepung rangup', price: 14 }
];

const SAYURAN = [
  { id: 'sayur_campur', nameEn: 'Mixed Vegetables', nameBm: 'Sayur Campur', descEn: 'Stir-fried mixed vegetables with soft tofu', descBm: 'Sayur campur goreng dengan tahu', price: 5 },
  { id: 'kangkung_belacan', nameEn: 'Kangkung Belacan', nameBm: 'Kangkung Belacan', descEn: 'Stir-fried water spinach with spicy shrimp paste', descBm: 'Kangkung tumis belacan pedas', price: 5 },
  { id: 'pucuk_paku', nameEn: 'Pucuk Paku Lemak', nameBm: 'Pucuk Paku Masak Lemak', descEn: 'Jungle fern shoots cooked in rich yellow coconut gravy', descBm: 'Pucuk paku masak lemak dengan udang kering', price: 6 }
];

// TYPES
interface OrderState {
  eventType: 'pejabat' | 'lain' | '';
  mealTypes: ('sarapan' | 'tengahari' | 'hitea')[];
  preparationType: 'buffet' | 'meal_box';
  guests: number;
  dishes: (typeof LAUK_UTAMA[number] & { category?: string })[];
  veggies: typeof SAYURAN[number][];
  name: string;
  contact: string;
  email: string;
  confirmEmail: string;
  date: string;
  time: string;
  location: string;
  delivery: 'delivery' | 'pickup';
  notes: string;
  companyName: string;
  customCompany: string;
  customMenu: string;
}

interface OrderFormProps {
  initialData?: Record<string, unknown> | null;
}

function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback to standard RFC4122 compliant manual generation
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function OrderForm({ initialData }: OrderFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (initialData) return 1;
    try {
      const saved = localStorage.getItem('wawasan_order_draft_step');
      if (saved) {
        const parsedStep = parseInt(saved, 10);
        if (parsedStep > 1 && parsedStep < 5) return parsedStep;
      }
    } catch (err) {
      console.warn('Failed to load draft step:', err);
    }
    return 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // C-03 (2026-08-06): stable per-attempt key so a retried/duplicate submit
  // (network timeout + retry, offline-queue replay) can't create a second
  // order — the server dedupes on this. Regenerated in handleResetForm()
  // below whenever the user actually starts a fresh order.
  const idempotencyKeyRef = useRef<string>(generateUUID());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [dynamicMenu, setDynamicMenu] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // Helper to clear saved draft
  const clearOrderDraft = () => {
    try {
      localStorage.removeItem('wawasan_order_draft_step');
      localStorage.removeItem('wawasan_order_draft_state');
    } catch (err) {
      console.warn('Failed to clear draft:', err);
    }
  };

  // Handle mobile / hardware back button step navigation in form
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    let handle: any = null;
    const setupBackButton = async () => {
      try {
        handle = await Capacitor.Plugins.App.addListener('backButton', () => {
          if (currentStep > 1 && currentStep < 5) {
            triggerLightImpact();
            setCurrentStep(s => s - 1);
          }
        });
      } catch (err) {
        console.warn('Failed to add backButton listener:', err);
      }
    };
    setupBackButton();

    return () => {
      if (handle && typeof handle.remove === 'function') {
        handle.remove();
      }
    };
  }, [currentStep]);

  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      try {
        const data = await fetchWithCache(getApiUrl('/api/menu'), undefined, 120000); // 2 minutes cache
        if (!isMounted) return;
        if (data && data.menuItems && data.menuItems.length > 0) {
          setDynamicMenu(data.menuItems);
        } else {
          setDynamicMenu(DEFAULT_MENU_ITEMS);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
          setDynamicMenu(DEFAULT_MENU_ITEMS);
          return;
        }
        console.warn('Could not load menu items from endpoint, using local fallback:', err?.message || err);
        setDynamicMenu(DEFAULT_MENU_ITEMS);
      } finally {
        if (isMounted) {
          setMenuLoading(false);
        }
      }
    };
    fetchMenu();
    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-step State with localStorage draft support
  const [orderState, setOrderState] = useState<OrderState>(() => {
    if (initialData) return initialData;
    try {
      const saved = localStorage.getItem('wawasan_order_draft_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            eventType: parsed.eventType || '',
            mealTypes: parsed.mealTypes || [],
            preparationType: parsed.preparationType || 'meal_box',
            guests: parsed.guests || 50,
            dishes: parsed.dishes || [],
            veggies: parsed.veggies || [],
            name: parsed.name || '',
            contact: parsed.contact || '',
            email: parsed.email || '',
            confirmEmail: parsed.confirmEmail || '',
            date: parsed.date || '',
            time: parsed.time || '12:00',
            location: parsed.location || '',
            delivery: parsed.delivery || 'delivery',
            notes: parsed.notes || '',
            companyName: parsed.companyName || '',
            customCompany: parsed.customCompany || '',
            customMenu: parsed.customMenu || ''
          };
        }
      }
    } catch (err) {
      console.warn('Failed to parse draft state:', err);
    }
    return {
      eventType: '',
      mealTypes: [],
      preparationType: 'meal_box',
      guests: 50,
      dishes: [],
      veggies: [],
      name: '',
      contact: '',
      email: '',
      confirmEmail: '',
      date: '',
      time: '12:00',
      location: '',
      delivery: 'delivery',
      notes: '',
      companyName: '',
      customCompany: '',
      customMenu: ''
    };
  });

  // Save draft on every state or step change
  useEffect(() => {
    if (currentStep < 5 && !initialData) {
      try {
        localStorage.setItem('wawasan_order_draft_step', String(currentStep));
        localStorage.setItem('wawasan_order_draft_state', JSON.stringify(orderState));
      } catch (err) {
        console.warn('Failed to save draft state:', err);
      }
    }
  }, [currentStep, orderState, initialData]);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // Human-readable label for the selected meal types. orderState.mealTypes is
  // a multi-select array (customer can pick breakfast + lunch + hi-tea
  // together), so this joins all selected labels rather than checking a
  // single value.
  const getMealTypesLabel = () => {
    if (orderState.mealTypes.length === 0) return tText('Not selected', 'Belum dipilih');
    const labels: Record<'sarapan' | 'tengahari' | 'hitea', string> = {
      sarapan: tText('Breakfast', 'Sarapan'),
      tengahari: tText('Lunch', 'Makan Tengah Hari'),
      hitea: tText('Hi-Tea', 'Hi-Tea'),
    };
    return orderState.mealTypes.map(m => labels[m]).join(', ');
  };

  // Sync Logged-In User Profile details
  useEffect(() => {
    setIsProfileLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && !initialData) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const profile = userSnap.data();
            setOrderState(prev => ({
              ...prev,
              companyName: profile.to || prev.companyName,
              name: profile.name || prev.name,
              contact: profile.contact || prev.contact,
              email: profile.email || prev.email,
              confirmEmail: profile.email || prev.confirmEmail,
            }));
            if (profile.savedLocations) {
              setSavedLocations(profile.savedLocations);
            } else {
              setSavedLocations([]);
            }
          } else {
            setOrderState(prev => ({
              ...prev,
              name: user.displayName || prev.name,
              email: user.email || prev.email,
              confirmEmail: user.email || prev.confirmEmail,
              contact: user.phoneNumber || prev.contact,
            }));
            setSavedLocations([]);
          }
        } catch (err) {
          console.error("Error fetching user profile for wizard form:", err);
          setSavedLocations([]);
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setIsProfileLoading(false);
      }
    });
    return () => unsubscribe();
  }, [initialData]);

  // Load Reorder state if initialData is provided
  useEffect(() => {
    if (initialData) {
      // initialData is loosely-typed (Record<string, unknown>) since it comes
      // from a previous order's raw data. This safely extracts a string
      // field, falling back to '' for anything that isn't actually a string
      // (rather than assuming `|| ''` alone makes the type safe).
      const asString = (value: unknown, fallback = ''): string =>
        typeof value === 'string' ? value : fallback;

      let initialDateStr = '';
      if (initialData.date) {
        try {
          const d = new Date(initialData.date as string | number | Date);
          if (!isNaN(d.getTime())) {
            initialDateStr = format(d, 'yyyy-MM-dd');
          }
        } catch (err) {
          console.error('Error parsing prefill date:', err);
        }
      }

      // Restore chosen dishes from previous order text or menu field
      const previousMenuText = asString(initialData.menu).toLowerCase();
      const matchedDishes = LAUK_UTAMA.filter(d => previousMenuText.includes((d.nameBm || '').toLowerCase()) || previousMenuText.includes((d.nameEn || '').toLowerCase()));
      const matchedVeggies = SAYURAN.filter(v => previousMenuText.includes((v.nameBm || '').toLowerCase()) || previousMenuText.includes((v.nameEn || '').toLowerCase()));

      const restoredMealTypes: ('sarapan' | 'tengahari' | 'hitea')[] = [];
      if (Array.isArray(initialData.meals)) {
        initialData.meals.forEach((m: string) => {
          if (m === 'breakfast') restoredMealTypes.push('sarapan');
          else if (m === 'lunch') restoredMealTypes.push('tengahari');
          else if (m === 'tea_break' || m === 'hitea') restoredMealTypes.push('hitea');
        });
      }

      setOrderState({
        eventType: initialData.to ? 'pejabat' : 'lain',
        mealTypes: restoredMealTypes,
        preparationType: (initialData.preparationType as 'buffet' | 'meal_box') || 'buffet',
        guests: Number(initialData.quantity) || 50,
        dishes: matchedDishes,
        veggies: matchedVeggies,
        name: asString(initialData.name),
        contact: asString(initialData.contact),
        email: asString(initialData.email),
        confirmEmail: asString(initialData.email),
        date: initialDateStr,
        time: asString(initialData.time, '12:00'),
        location: asString(initialData.location),
        delivery: initialData.delivery === 'pickup' ? 'pickup' : 'delivery',
        notes: asString(initialData.notes),
        companyName: asString(initialData.to),
        customCompany: '',
        customMenu: ''
      });
    }
  }, [initialData]);

  // Load draft from localStorage on mount if no initialData
  useEffect(() => {
    if (!initialData) {
      try {
        const savedDraft = localStorage.getItem('wawasan_order_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && typeof parsed === 'object') {
            setOrderState(prev => {
              const safeParsed: Partial<OrderState> = {};
              
              if (parsed.eventType === 'pejabat' || parsed.eventType === 'lain' || parsed.eventType === '') {
                safeParsed.eventType = parsed.eventType;
              }
              if (Array.isArray(parsed.mealTypes)) {
                safeParsed.mealTypes = parsed.mealTypes.filter((m: any) => m === 'sarapan' || m === 'tengahari' || m === 'hitea');
              } else {
                safeParsed.mealTypes = prev.mealTypes || [];
              }
              if (parsed.preparationType === 'buffet' || parsed.preparationType === 'meal_box') {
                safeParsed.preparationType = parsed.preparationType;
              }
              if (typeof parsed.guests === 'number' && !isNaN(parsed.guests)) {
                safeParsed.guests = parsed.guests;
              }
              if (Array.isArray(parsed.dishes)) {
                safeParsed.dishes = parsed.dishes.filter((d: any) => d && typeof d === 'object' && d.id);
              } else {
                safeParsed.dishes = prev.dishes || [];
              }
              if (Array.isArray(parsed.veggies)) {
                safeParsed.veggies = parsed.veggies.filter((v: any) => v && typeof v === 'object' && v.id);
              } else {
                safeParsed.veggies = prev.veggies || [];
              }
              
              // String fields
              const fields = [
                'name', 'contact', 'email', 'confirmEmail', 'date', 'time', 
                'location', 'delivery', 'notes', 'companyName', 'customCompany', 'customMenu'
              ];
              fields.forEach(f => {
                if (typeof parsed[f] === 'string') {
                  (safeParsed as any)[f] = parsed[f];
                }
              });
              
              return {
                ...prev,
                ...safeParsed
              };
            });
          }
        }
      } catch (e) {
        console.error('Failed to load order draft from localStorage:', e);
      }
    }
  }, [initialData]);

  // Save draft to localStorage on change
  useEffect(() => {
    if (!initialData) {
      try {
        localStorage.setItem('wawasan_order_draft', JSON.stringify(orderState));
      } catch (e) {
        console.error('Failed to save order draft to localStorage:', e);
      }
    }
  }, [orderState, initialData]);

  // Auto Geolocate Reverse Address lookup
  const handleDetectLocation = async () => {
    try {
      setIsDetectingLocation(true);
      triggerNotification(NotificationType.Success);

      if (Capacitor.isNativePlatform()) {
        const permResult = await Geolocation.checkPermissions();
        if (permResult.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          if (requestResult.location !== 'granted') {
            throw new Error('Location permission denied / Kebenaran lokasi dinafikan.');
          }
        }
      }

      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude, longitude } = coordinates.coords;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      const displayName = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      setOrderState(prev => ({ ...prev, location: displayName }));
      toast({
        title: tText('Location Detected', 'Lokasi Diperoleh'),
        description: tText('Successfully auto-filled your location.', 'Berjaya mengisi lokasi anda secara automatik.'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Error detecting location:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: tText('Location Error', 'Ralat Lokasi'),
        description: errMsg.includes('denied') 
          ? tText('Please enable location permissions in your settings.', 'Sila benarkan akses lokasi dalam tetapan anda.')
          : tText('Could not retrieve location. Please type manually.', 'Tidak dapat memperoleh lokasi. Sila taip secara manual.'),
        variant: 'error',
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // REALTIME CALCULATIONS FOR STEP 2 BUDGET PREVIEW
  const getPricePerPax = () => {
    const dishSum = orderState.dishes.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const vegSum = orderState.veggies.reduce((acc, curr) => acc + (curr.price || 0), 0);
    return dishSum + vegSum;
  };

  const getGrandTotal = () => {
    return getPricePerPax() * orderState.guests * (orderState.mealTypes.length || 1);
  };

  // HANDLERS FOR FIELD UPDATES
  const handleToggleDish = async (dish: any) => {
    await triggerLightImpact();
    setOrderState(prev => {
      const exists = prev.dishes.some(d => d.id === dish.id);
      if (exists) {
        return { ...prev, dishes: prev.dishes.filter(d => d.id !== dish.id) };
      } else {
        return { ...prev, dishes: [...prev.dishes, dish] };
      }
    });
  };
  const adjustGuests = async (delta: number) => {
    await triggerLightImpact();
    setOrderState(prev => {
      let g = prev.guests + delta;
      if (g < 1) g = 1; // Min 1 pax as requested
      if (g > 5000) g = 5000; // Allow high max cap
      return { ...prev, guests: g };
    });
  };

  const handleToggleMeal = async (id: 'sarapan' | 'tengahari' | 'hitea') => {
    await triggerLightImpact();
    setOrderState(prev => {
      const exists = prev.mealTypes.includes(id);
      if (exists) {
        return { ...prev, mealTypes: prev.mealTypes.filter(m => m !== id) };
      } else {
        return { ...prev, mealTypes: [...prev.mealTypes, id] };
      }
    });
  };

  const handleStepNext = async (step: number) => {
    await triggerLightImpact();
    const triggerWarning = () => triggerNotification(NotificationType.Warning);

    if (step === 1) {
      if (!orderState.eventType) {
        triggerWarning();
        toast({
          title: tText('Event Type Required', 'Pilih Jenis Majlis'),
          description: tText('Please select whether this is a corporate or other event.', 'Sila pilih sama ada ini jamuan pejabat atau majlis lain.'),
          variant: 'warning'
        });
        return;
      }
      if (orderState.mealTypes.length === 0) {
        triggerWarning();
        toast({
          title: tText('Meal Type Required', 'Pilih Jenis Hidangan'),
          description: tText('Please select the serving time/meal block.', 'Sila pilih hidangan yang diperlukan.'),
          variant: 'warning'
        });
        return;
      }
      if (!orderState.guests || orderState.guests < 1) {
        triggerWarning();
        toast({
          title: tText('Minimum Quantity Required', 'Kuantiti Minimum Diperlukan'),
          description: tText('Minimum catering order is 1 pax.', 'Minimum tempahan katering adalah 1 orang.'),
          variant: 'warning'
        });
        return;
      }
      setCurrentStep(2);
      logOrderStep(2, 'dish_selection');
    }

    if (step === 2) {
      setCurrentStep(3);
      logOrderStep(3, 'contact_details');
    }

    if (step === 3) {
      // Validate customer & billing info
      if (orderState.eventType === 'pejabat') {
        if (!orderState.companyName) {
          triggerWarning();
          toast({
            title: tText('Company Billing Info', 'Nama Syarikat/Jabatan'),
            description: tText('Please select or specify your department billing address.', 'Sila pilih atau nyatakan jabatan untuk rujukan bil.'),
            variant: 'warning'
          });
          return;
        }
        if (orderState.companyName === 'other' && !orderState.customCompany) {
          triggerWarning();
          toast({
            title: tText('Company Name Needed', 'Nama Jabatan'),
            description: tText('Please write your department or company name.', 'Sila masukkan nama syarikat/jabatan secara manual.'),
            variant: 'warning'
          });
          return;
        }
      }

      if (!orderState.name.trim()) {
        triggerWarning();
        toast({ title: tText('Name Needed', 'Nama Diperlukan'), description: tText('Please enter your full name.', 'Sila masukkan nama penuh anda.'), variant: 'warning' });
        return;
      }

      if (!orderState.contact.trim()) {
        triggerWarning();
        toast({ title: tText('Contact Needed', 'No. Telefon Diperlukan'), description: tText('Please enter a valid phone number.', 'Sila masukkan nombor telefon yang sah.'), variant: 'warning' });
        return;
      }

      if (!orderState.email.trim()) {
        triggerWarning();
        toast({ title: tText('Email Needed', 'Emel Diperlukan'), description: tText('Please enter your email address for invoices.', 'Sila masukkan alamat emel anda untuk penerimaan invois.'), variant: 'warning' });
        return;
      }

      if ((orderState.email || '').trim().toLowerCase() !== (orderState.confirmEmail || '').trim().toLowerCase()) {
        triggerWarning();
        toast({ title: tText('Email Mismatch', 'Emel Tidak Sepadan'), description: tText('The confirm email field does not match.', 'Alamat emel pengesahan tidak sepadan.'), variant: 'warning' });
        return;
      }

      if (!orderState.date) {
        triggerWarning();
        toast({ title: tText('Date Required', 'Tarikh Diperlukan'), description: tText('Please choose your event date.', 'Sila pilih tarikh majlis anda.'), variant: 'warning' });
        return;
      }

      if (!orderState.time) {
        triggerWarning();
        toast({ title: tText('Time Required', 'Masa Diperlukan'), description: tText('Please select a serving time.', 'Sila tetapkan masa majlis anda.'), variant: 'warning' });
        return;
      }

      if (!orderState.location.trim()) {
        triggerWarning();
        toast({ title: tText('Location Required', 'Lokasi Diperlukan'), description: tText('Please enter your event location or address.', 'Sila isi alamat atau lokasi majlis.'), variant: 'warning' });
        return;
      }

      setCurrentStep(4);
      logOrderStep(4, 'review_submit');
    }
  };

  // FINAL ORDER SUBMISSION PIPELINE
  const handleOrderSubmission = async () => {
    setIsSubmitting(true);
    // F-OFFLINE (audit 2026-08-11): orderData itself is built inside the try
    // block below and is out of scope in catch. This holds a reference to
    // the same object once it's built, purely so a network-failure catch
    // can queue it — it does not change orderData's own declaration/scope.
    let orderDataForQueue: Record<string, unknown> | null = null;

    try {
      const mappedMeals = orderState.mealTypes.map(m => {
        if (m === 'sarapan') return 'breakfast';
        if (m === 'tengahari') return 'lunch';
        if (m === 'hitea') return 'hi_tea';
        return 'tea_break';
      });

      const billingCompany = orderState.eventType === 'pejabat' 
        ? (orderState.companyName === 'other' ? orderState.customCompany : orderState.companyName)
        : '';

      // Construct dishes list text for the single menu string field
      const bfDishes = orderState.dishes.filter(d => d.category === 'breakfast').map(d => d.nameBm).join(', ');
      const lhDishes = orderState.dishes.filter(d => d.category === 'lunch').map(d => d.nameBm).join(', ');
      const htDishes = orderState.dishes.filter(d => d.category === 'hi tea').map(d => d.nameBm).join(', ');
      const drDishes = orderState.dishes.filter(d => d.category === 'drinks').map(d => d.nameBm).join(', ');
      
      let combinedMenuStr = '';
      const sections: string[] = [];
      if (bfDishes) sections.push(`Sarapan: ${bfDishes}`);
      if (lhDishes) sections.push(`Tengahari: ${lhDishes}`);
      if (htDishes) sections.push(`Hi Tea: ${htDishes}`);
      if (drDishes) sections.push(`Minuman: ${drDishes}`);
      
      const legacyDishes = orderState.dishes.filter(d => !d.category).map(d => d.nameBm).join(', ');
      const legacyVeg = orderState.veggies.map(v => v.nameBm).join(', ');
      if (legacyDishes) sections.push(`Lauk Utama: ${legacyDishes}`);
      if (legacyVeg) sections.push(`Sayuran: ${legacyVeg}`);

      if (sections.length > 0) {
        combinedMenuStr = sections.join(' | ');
        if (orderState.customMenu) {
          combinedMenuStr += ` | Menu Lain: ${orderState.customMenu}`;
        }
      } else if (orderState.customMenu) {
        combinedMenuStr = `Menu Lain: ${orderState.customMenu}`;
      } else {
        combinedMenuStr = 'Set Box Makanan & Minuman';
      }

      const formattedDateStr = orderState.date; // YYYY-MM-DD
      const pricePerPax = getPricePerPax();

      const pricesRecord: Record<string, number> = {};
      mappedMeals.forEach(m => {
        pricesRecord[m] = pricePerPax;
      });

      const orderData = {
        to: billingCompany || 'Majlis Persendirian',
        attn: orderState.name,
        name: orderState.name,
        contact: orderState.contact,
        email: orderState.email,
        date: formattedDateStr,
        time: orderState.time,
        location: orderState.location,
        quantity: orderState.guests,
        meals: mappedMeals,
        menu: combinedMenuStr,
        preparationType: orderState.preparationType || 'buffet',
        notes: orderState.notes,
        dateTime: new Date(`${formattedDateStr}T${orderState.time || '12:00'}`).toISOString(),
        lang: language,
        status: 'pending', // Pending status inside database
        prices: pricesRecord,
        totalAmount: getGrandTotal(),
        userId: currentUser?.uid || null,
        delivery: orderState.delivery,
        idempotencyKey: idempotencyKeyRef.current
      };
      orderDataForQueue = orderData;

      // Submit to Backend Server API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      let response;
      try {
        response = await fetch(getApiUrl('/api/orders'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify(orderData),
          signal: controller.signal
        });
      } catch (err: any) {
        // F-OFFLINE (audit 2026-08-11): both branches here mean the request
        // never reached the server at all (abort/timeout or a raw network
        // failure like DNS/offline) — as opposed to the `!response.ok`
        // branch below, where the server *did* receive and reject the
        // request. Tagging with a distinct error name lets the outer catch
        // decide whether this order is safe to queue for retry, without
        // guessing from the error message text.
        const networkErr = new Error(
          err?.name === 'AbortError'
            ? tText('Connection timed out. Please try again.', 'Sambungan tamat masa (network slow). Sila cuba lagi.')
            : (err instanceof Error ? err.message : String(err))
        );
        networkErr.name = 'OrderNetworkError';
        throw networkErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Submission failed with status: ${response.status}`);
      }

      const resData = await response.json();
      const generatedOrderId = resData.id;
      // F-INV (audit 2026-08-06): invoiceNo is only ever assigned server-side
      // when an admin approves/bills an order (see server.ts, generateSequentialInvoiceNo).
      // A freshly-created 'pending' order never has one, so resData.invoiceNo was
      // always undefined here and the on-screen reference number was blank.
      // The order ID is what actually exists at this point, so use that as the
      // customer-facing booking reference until a real invoice number is issued.
      const finalInvoiceNo: string | undefined = resData.invoiceNo;
      const bookingReference = finalInvoiceNo || generatedOrderId;

      setReferenceNumber(bookingReference);

      // Clear draft storage upon successful order
      try {
        localStorage.removeItem('wawasan_order_draft');
      } catch {
        // ignore
      }

      const createdOrder: Order = {
        ...(orderData as Order),
        id: generatedOrderId,
        invoiceNo: finalInvoiceNo,
      };
      setSubmittedOrder(createdOrder);

      // Generate Invoice PDF & Mail to customer
      try {
        setEmailStatus('sending');
        const pdfDoc = generateInvoicePDF(createdOrder, false, language);
        const pdfBase64 = (pdfDoc as any).output('datauristring').split(',')[1];

        // F-INV (audit 2026-08-06): this used to call /api/send-invoice, which
        // requires an admin JWT (verifyAdminToken). OrderForm is customer-facing
        // and never has one, so this always failed with 401 and the email was
        // never sent — silently, since only setEmailStatus('failed') ran.
        // Switched to /api/orders/:id/send-preliminary-invoice, a public endpoint
        // that verifies pdfBase64/email against the actual stored order before
        // emailing, so it can't be used to relay mail to arbitrary addresses.
        const emailController = new AbortController();
        const emailTimeoutId = setTimeout(() => emailController.abort(), 15000);
        
        let emailResponse;
        try {
          emailResponse = await fetch(getApiUrl(`/api/orders/${generatedOrderId}/send-preliminary-invoice`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: safeJsonStringify({
              email: orderData.email,
              name: orderData.name,
              pdfBase64: pdfBase64,
              lang: language
            }),
            signal: emailController.signal
          });
        } finally {
          clearTimeout(emailTimeoutId);
        }

        if (emailResponse.ok) {
          setEmailStatus('success');
          toast({
            title: t('invoice_emailed'),
            description: t('email_sent_to').replace('{email}', orderData.email),
            variant: 'success'
          });
        } else {
          setEmailStatus('failed');
          console.warn('Backend failed to send email relay.');
        }
      } catch (pdfErr) {
        console.error('Error generating/sending preliminary PDF invoice:', pdfErr);
        setEmailStatus('failed');
      }

      triggerNotification(NotificationType.Success);
      toast({
        title: tText('Booking Sent', 'Tempahan Dihantar'),
        description: tText('Your catering inquiry has been processed.', 'Permohonan tempahan katering anda telah berjaya dihantar.'),
        variant: 'success'
      });
      logOrderSubmitted(
        bookingReference,
        orderData.totalAmount,
        orderState.dishes.length + orderState.veggies.length,
        orderState.eventType
      );
      clearOrderDraft();
      setCurrentStep(5);
    } catch (err) {
      console.error('Catering submission error:', err);
      recordException(err instanceof Error ? err : new Error(String(err)), {
        type: 'order_submission_error',
        eventType: orderState.eventType,
      });
      triggerNotification(NotificationType.Error);

      // F-OFFLINE (audit 2026-08-11): only queue when the request never
      // reached the server (see OrderNetworkError tagging above). A
      // server-rejected request (validation, 500, etc.) would just fail the
      // same way again on retry, so those are NOT queued — only genuine
      // "couldn't send it at all" failures are.
      if (err instanceof Error && err.name === 'OrderNetworkError' && orderDataForQueue) {
        addPendingOrder(orderDataForQueue, idempotencyKeyRef.current);
        toast({
          title: tText('Order Saved for Later', 'Tempahan Disimpan'),
          description: tText(
            'No connection right now. Your order is saved on this device and you\'ll be asked to send it once you\'re back online.',
            'Tiada sambungan sekarang. Tempahan anda disimpan dalam peranti ini dan anda akan diminta menghantarnya semula bila online.'
          ),
          variant: 'warning',
          duration: 8000
        });
      } else {
        toast({
          title: t('error'),
          description: err instanceof Error ? err.message : String(err),
          variant: 'error'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    clearOrderDraft();
    idempotencyKeyRef.current = generateUUID();
    setOrderState({
      eventType: '',
      mealTypes: [],
      preparationType: 'meal_box',
      guests: 50,
      dishes: [],
      veggies: [],
      name: '',
      contact: '',
      email: '',
      confirmEmail: '',
      date: '',
      time: '12:00',
      location: '',
      delivery: 'delivery',
      notes: '',
      companyName: '',
      customCompany: '',
      customMenu: ''
    });
    setReferenceNumber('');
    setSubmittedOrder(null);
    setShowPdfPreviewModal(false);
    setEmailStatus('idle');
    setCurrentStep(1);
  };

  const getShareableUrl = () => {
    if (Capacitor.isNativePlatform()) {
      return buildShareableUrl(window.location.hash);
    }
    return window.location.origin + '/' + window.location.hash;
  };

  const handleShareReceipt = async () => {
    const textMsg = tText(
      `Restoran Wawasan Catering Booking Reference: ${referenceNumber}. Status: Quotation Pending. Form Link:`,
      `Rujukan Tempahan Katering Restoran Wawasan: ${referenceNumber}. Status: Menunggu Sebut Harga. Pautan:`
    );

    const shareData = {
      title: 'Restoran Wawasan Catering Receipt',
      text: `${textMsg} ${getShareableUrl()}`,
      url: getShareableUrl()
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        await safeCopyToClipboard(getShareableUrl());
        toast({ title: t('link_copied'), variant: 'success' });
      }
    } else {
      await safeCopyToClipboard(getShareableUrl());
      toast({ title: t('link_copied'), variant: 'success' });
    }
  };

  return (
    <>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      {/* Main Container with responsive layout: full width header, split 2-column view on desktop */}
      <div className="w-full max-w-6xl mx-auto font-sans space-y-6 pb-24 lg:pb-0">
        
        {/* App Header Bar mirroring Wawasan brand */}
        <div className="bg-charcoal text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-charcoal/80 relative overflow-hidden">
          {/* Background Batik Pattern for Header */}
          <div 
            className="absolute inset-0 opacity-[0.25] pointer-events-none"
            style={{
              backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div>
              <span className="microcopy-12 text-[var(--color-sunshine-cta)] font-bold uppercase tracking-widest block mb-0.5">
                {tText('CATERING BOOKING SYSTEM', 'SISTEM TEMPAHAN KATERING')}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
                Restoran Wawasan Pak Usop
              </h1>
              <p className="text-xs text-stone font-medium tracking-wide mt-1">
                Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kiwi/20 text-kiwi text-xs font-bold border border-kiwi/30">
                <span className="w-2 h-2 rounded-full bg-kiwi animate-pulse" />
                {tText('Accepting Bookings', 'Menerima Tempahan')}
              </span>
              <a 
                href="tel:+60178582642" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/10"
              >
                <Phone className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)]" />
                017-858 2642
              </a>
            </div>
          </div>
        </div>

        {/* Sign In / Sign Up banner for unauthenticated guests */}
        {!currentUser && (
          <div className="bg-[var(--color-sunshine-cta)]/10 border border-[var(--color-sunshine-cta)]/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 text-deep-forest dark:text-stone-200">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-sunshine-cta)]/15 flex items-center justify-center shrink-0">
                <UserIcon className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
              </div>
              <p className="text-xs font-medium">
                <span className="font-bold block text-sm text-deep-forest dark:text-white">
                  {tText('Have an account with Restoran Wawasan?', 'Ada akaun dengan Restoran Wawasan?')}
                </span>
                {tText('Sign in or register to auto-fill your saved profile & billing details.', 'Log masuk atau daftar untuk isi automatik maklumat profil & bil anda.')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthModalOpen(true); }}
                className="btn-cta px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>{tText('Sign In', 'Log Masuk')}</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
                className="px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold border border-stone/20 hover:border-[var(--color-sunshine-cta)] bg-white dark:bg-card text-deep-forest dark:text-white hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex-1 sm:flex-initial flex items-center justify-center gap-1.5"
              >
                <span>{tText('Sign Up', 'Daftar')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Responsive Grid: Steps Form on Left + Live Order Summary Sidebar on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Stepper Wizard & Inputs Panel */}
          <div className="lg:col-span-7 xl:col-span-8 bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-xl overflow-hidden">
            
            {/* Progress Bar Indicator */}
            {currentStep <= 4 && (
              <div className="px-6 pt-6 pb-4 bg-muted/40 border-b border-stone/10" role="navigation" aria-label={tText('Order progress', 'Kemajuan tempahan')}>
                <div className="flex items-center justify-between">
                  {[
                    { s: 1, label: tText('Event', 'Jenis') },
                    { s: 2, label: tText('Menu', 'Menu') },
                    { s: 3, label: tText('Billing', 'Butiran') },
                    { s: 4, label: tText('Review', 'Semakan') }
                  ].map((item, idx) => {
                    const isCurrent = currentStep === item.s;
                    const isDone = currentStep > item.s;
                    return (
                      <div key={item.s} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1 relative z-10">
                          <div
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300",
                              isCurrent
                                ? "bg-crisp-carrot border-crisp-carrot text-white shadow-crisp scale-105"
                                : isDone
                                  ? "bg-[#A8E10C] border-[#A8E10C] text-[#161618]"
                                  : "bg-muted border-stone/20 text-stone"
                            )}
                          >
                            {isDone ? <Check className="w-4 h-4" /> : item.s}
                          </div>
                          <span className={cn(
                            "microcopy-12-upper font-semibold transition-colors duration-300",
                            isCurrent ? "text-crisp-carrot font-bold" : "text-stone"
                          )}>
                            {item.label}
                          </span>
                        </div>

                        {idx < 3 && (
                          <div className="flex-1 h-[2px] mx-2 bg-stone/10 relative -translate-y-2.5" aria-hidden="true">
                            <div
                              className="absolute inset-y-0 left-0 bg-[#A8E10C] transition-all duration-500"
                              style={{ width: isDone ? '100%' : '0%' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Steps Container */}
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
            
            {/* STEP 1: PILIH JENIS MAJLIS & HIDANGAN */}
            {currentStep === 1 && (
              <Step1EventMeal
                orderState={orderState}
                setOrderState={setOrderState}
                handleToggleMeal={handleToggleMeal}
                adjustGuests={adjustGuests}
                handleStepNext={handleStepNext}
                tText={tText}
              />
            )}

            {/* STEP 2: PILIH LAUK PAUK & CALCULATE PRICE */}
            {currentStep === 2 && (
              <Step2DishSelection
                orderState={orderState}
                setOrderState={setOrderState}
                menuLoading={menuLoading}
                dynamicMenu={dynamicMenu}
                handleToggleDish={handleToggleDish}
                handleStepNext={handleStepNext}
                setCurrentStep={setCurrentStep}
                triggerLightImpact={triggerLightImpact}
                tText={tText}
                t={t}
              />
            )}

            {/* STEP 3: BUTIRAN TEMPAHAN */}
            {currentStep === 3 && (
              <Step3ContactDetails
                orderState={orderState}
                setOrderState={setOrderState}
                isProfileLoading={isProfileLoading}
                savedLocations={savedLocations}
                isDetectingLocation={isDetectingLocation}
                handleDetectLocation={handleDetectLocation}
                handleStepNext={handleStepNext}
                setCurrentStep={setCurrentStep}
                triggerLightImpact={triggerLightImpact}
                tText={tText}
                t={t}
              />
            )}

            {/* STEP 4: REVIEW & CONFIRMATION */}
            {currentStep === 4 && (
              <Step4ReviewSubmit
                orderState={orderState}
                getMealTypesLabel={getMealTypesLabel}
                isSubmitting={isSubmitting}
                handleOrderSubmission={handleOrderSubmission}
                setCurrentStep={setCurrentStep}
                triggerLightImpact={triggerLightImpact}
                tText={tText}
                t={t}
              />
            )}

            {/* STEP 5: KEJAYAAN / SUCCESS */}
            {currentStep === 5 && (
              <Step5OrderSuccess
                orderState={orderState}
                referenceNumber={referenceNumber}
                getMealTypesLabel={getMealTypesLabel}
                emailStatus={emailStatus}
                setShowPdfPreviewModal={setShowPdfPreviewModal}
                handleResetForm={handleResetForm}
                handleShareReceipt={handleShareReceipt}
                tText={tText}
              />
            )}

          </AnimatePresence>
        </div>

        </div>

        {/* Right Column: Interactive Sticky Live Summary Card */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 space-y-4">
          <div className="bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-xl p-5 sm:p-6 overflow-hidden relative">
            {/* Card Title Header */}
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-stone/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-crisp-carrot animate-pulse" />
                <h3 className="text-xs font-extrabold text-deep-forest dark:text-white uppercase tracking-wider font-display">
                  {tText('Live Order Summary', 'Ringkasan Tempahan')}
                </h3>
              </div>
              <span className="microcopy-12-upper font-extrabold text-crisp-carrot bg-crisp-carrot/10 px-2.5 py-0.5 rounded-full uppercase border border-crisp-carrot/20">
                Step {currentStep} / 4
              </span>
            </div>

            {/* Event Type & Pax Badge */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone font-medium">{tText('Event Type:', 'Jenis Majlis:')}</span>
                <span className="font-bold text-deep-forest dark:text-white">
                  {orderState.eventType === 'pejabat' 
                    ? tText('Office Feast', 'Jamuan Pejabat') 
                    : orderState.eventType === 'lain'
                      ? tText('Private Event', 'Lain-Lain')
                      : tText('Not Selected', 'Belum Dipilih')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone font-medium">{tText('Guest Count:', 'Kuantiti Pax:')}</span>
                <span className="font-bold text-deep-forest dark:text-white">
                  {orderState.guests} {tText('pax', 'orang')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone font-medium">{tText('Serving Time:', 'Hidangan Untuk:')}</span>
                <span className="font-bold text-deep-forest dark:text-white text-right">
                  {getMealTypesLabel() || tText('Not Selected', 'Belum Dipilih')}
                </span>
              </div>

              {orderState.date && (
                <div className="flex justify-between items-center">
                  <span className="text-stone font-medium">{tText('Date & Time:', 'Tarikh & Masa:')}</span>
                  <span className="font-bold text-deep-forest dark:text-white">
                    {orderState.date} @ {orderState.time}
                  </span>
                </div>
              )}

              {/* Selected Dishes Badges */}
              <div className="pt-2 border-t border-stone/10 space-y-1.5">
                <span className="microcopy-12-upper font-extrabold text-stone uppercase tracking-wider block">
                  {tText('Selected Menu Items:', 'Menu Pilihan:')}
                </span>
                
                {orderState.dishes.length > 0 || orderState.veggies.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
                    {orderState.dishes.map(d => (
                      <span key={d.id} className="inline-block bg-crisp-carrot/10 text-crisp-carrot font-bold px-2 py-0.5 rounded microcopy-12-upper border border-crisp-carrot/20">
                        {tText(d.nameEn, d.nameBm)}
                      </span>
                    ))}
                    {orderState.veggies.map(v => (
                      <span key={v.id} className="inline-block bg-[#A8E10C]/20 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded microcopy-12-upper border border-[#A8E10C]/30">
                        {tText(v.nameEn, v.nameBm)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="microcopy-12 text-stone italic block">
                    {tText('Select dishes in Step 2 or auto default to Box Set.', 'Pilih lauk di Langkah 2 atau ditetapkan lalai ke Set Kotak.')}
                  </span>
                )}
              </div>

              {/* Estimation Total Calculation */}
              <div className="bg-charcoal text-white p-4 rounded-xl border border-charcoal/80 relative overflow-hidden mt-4 space-y-2">
                <div 
                  className="absolute inset-0 opacity-[0.2] pointer-events-none"
                  style={{
                    backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="relative z-10 flex justify-between items-center">
                  <span className="text-stone-300 microcopy-12 font-medium uppercase tracking-wider">
                    {tText('Rate / Pax:', 'Kadar / Orang:')}
                  </span>
                  <span className="font-bold text-[var(--color-sunshine-cta)] text-xs">
                    {getPricePerPax() > 0 ? `RM ${getPricePerPax().toFixed(2)}` : tText('Quote Pending', 'Ganti Sebut Harga')}
                  </span>
                </div>

                <div className="relative z-10 flex justify-between items-baseline pt-1 border-t border-white/10">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                    {tText('Est. Total:', 'Anggaran Jumlah:')}
                  </span>
                  <span className="text-xl font-black text-[var(--color-sunshine-cta)] font-display">
                    {getGrandTotal() > 0 ? `RM ${getGrandTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : tText('Admin Quote', 'Sebut Harga')}
                  </span>
                </div>
              </div>

              {/* Fast Contact & Support Button */}
              <div className="pt-2">
                <a
                  href="https://wa.me/60173157721?text=Hai%20Noh,%20saya%20hendak%20bertanya%20mengenai%20tempahan%20katering"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-white" />
                  <span>{tText('Direct WhatsApp Inquiry', 'Tanya Direct WhatsApp')}</span>
                </a>
              </div>

            </div>
          </div>
        </div>

      </div> {/* End of Responsive Grid */}
      </div> {/* End of Outer Wrapper */}

      {/* PDF Preview Modal for submitted order */}
      {submittedOrder && (
        <PDFPreviewModal
          isOpen={showPdfPreviewModal}
          onClose={() => setShowPdfPreviewModal(false)}
          order={submittedOrder}
          language={language}
        />
      )}

      {/* Sticky Mobile Price Bar (< lg breakpoint) */}
      {currentStep <= 4 && (
        <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,12px))] left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-40 lg:hidden border border-white/20 bg-charcoal/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 flex items-center justify-between gap-3 text-white">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 microcopy-12-upper text-stone-300 font-semibold uppercase tracking-wider truncate">
              <span>{orderState.guests} pax</span>
              <span>•</span>
              <span className="truncate">{getMealTypesLabel() || tText('Not Selected', 'Belum Dipilih')}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="microcopy-12 text-[var(--color-sunshine-cta)] font-bold shrink-0">
                {getPricePerPax() > 0 ? `RM ${getPricePerPax().toFixed(2)}/pax` : tText('Quote', 'Sebut Harga')}
              </span>
              <span className="text-base font-extrabold text-white font-display shrink-0">
                {getGrandTotal() > 0 ? `RM ${getGrandTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'RM 0.00'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStep < 4 ? (
              <Button
                onClick={() => handleStepNext(currentStep)}
                className="bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-crisp flex items-center gap-1 cursor-pointer"
              >
                <span>{tText('Next', 'Seterusnya')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleOrderSubmission}
                disabled={isSubmitting}
                className="bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-crisp flex items-center gap-1 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{tText('Submit', 'Hantar')}</span>
                    <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

    </>
  );
}
