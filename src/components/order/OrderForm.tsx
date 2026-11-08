import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  User as UserIcon,
  Ghost,
  CircleHelp,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { safeCopyToClipboard, getAssetUrl, safeJsonStringify } from '@/lib/utils';
import { CustomerInvoicePreviewModal } from '@/components/order/CustomerInvoicePreviewModal';
import { motion } from 'motion/react';
import { getApiUrl, fetchWithCache } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { onAuthStateChanged, sendEmailVerification, type User } from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AuthModal from '../auth/AuthModal';
import { OrderFormTip } from '@/components/order/OrderFormTip';
import { Step1EventMeal } from './Step1EventMeal';
import { Step2DishSelection } from './Step2DishSelection';
import { Step3ContactDetails } from './Step3ContactDetails';
import { Step4ReviewSubmit } from './Step4ReviewSubmit';
import { Step5OrderSuccess } from './Step5OrderSuccess';
import { OrderPreviewProgress } from './OrderPreviewProgress';
import { DemoOverlay } from '@/ghost/DemoOverlay';
import { DEFAULT_MENU_ITEMS, type MenuItem } from '@/constants/menu';
import { SAVED_COMPANIES } from '@/constants/companies';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { buildShareableUrl } from '@/lib/share';
import { triggerNotification, NotificationType, triggerLightImpact } from '@/lib/haptics';
import { addPendingOrder } from '@/lib/pendingOrdersQueue';
import { logOrderStep, logOrderSubmitted } from '@/services/analyticsService';
import { recordException } from '@/services/crashlyticsService';
import { SET_BOX_MENU_TITLE } from '@/services/orderCalculation';
import { useMobileKeyboard } from '@/hooks/native/useMobileKeyboard';
import { useMascotStepTransition } from '@/hooks/ui/useMascotStepTransition';
import type { SavedLocation, Order } from '@/types';
import { validateOrderContactDetails, ORDER_CONTACT_FOCUS_IDS, type OrderContactField, type OrderContactErrors } from '@/lib/orderContactValidation';
import { evaluateVerifiedOrderAccess } from '@/lib/verifiedOrdering';

// TYPES
export interface OrderState {
  eventType: 'pejabat' | 'lain' | '';
  mealTypes: ('sarapan' | 'tengahari' | 'hitea')[];
  preparationType: 'buffet' | 'meal_box';
  guests: number;
  dishes: (MenuItem & { category?: string })[];
  veggies: (MenuItem & { category?: string })[];
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
  department: string;
  initials: string;
  attn: string;
  customMenu: string;
}

interface OrderFormProps {
  initialData?: Record<string, any> | null;
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

/**
 * Restore only recognized order fields from an older or current draft.
 * localStorage is untrusted and can contain partially-written or outdated JSON.
 */
function parseStoredOrderDraft(value: string): Partial<OrderState> | null {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const draft: Partial<OrderState> = {};

  if (record.eventType === '' || record.eventType === 'pejabat' || record.eventType === 'lain') {
    draft.eventType = record.eventType;
  }
  if (Array.isArray(record.mealTypes)) {
    draft.mealTypes = record.mealTypes.filter((item): item is OrderState['mealTypes'][number] =>
      item === 'sarapan' || item === 'tengahari' || item === 'hitea'
    );
  }
  if (record.preparationType === 'buffet' || record.preparationType === 'meal_box') {
    draft.preparationType = record.preparationType;
  }
  if (typeof record.guests === 'number' && Number.isFinite(record.guests)) {
    draft.guests = Math.min(5000, Math.max(1, Math.floor(record.guests)));
  }
  const validItems = (items: unknown): OrderState['dishes'] =>
    Array.isArray(items)
      ? items.filter((item): item is OrderState['dishes'][number] =>
          !!item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0
        )
      : [];
  if (Array.isArray(record.dishes)) draft.dishes = validItems(record.dishes);
  if (Array.isArray(record.veggies)) draft.veggies = validItems(record.veggies);
  const stringFields = [
    'name', 'contact', 'email', 'confirmEmail', 'date', 'time', 'location',
    'notes', 'companyName', 'customCompany', 'department', 'initials', 'attn', 'customMenu',
  ] as const;
  for (const field of stringFields) {
    if (typeof record[field] === 'string') draft[field] = record[field];
  }
  if (record.delivery === 'pickup' || record.delivery === 'delivery') {
    draft.delivery = record.delivery;
  }
  return draft;
}

export default function OrderForm({ initialData }: OrderFormProps) {
  const isNativePresentation = typeof document !== 'undefined' && document.documentElement.classList.contains('wawasan-native');
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { isKeyboardVisible } = useMobileKeyboard();

  // Only scroll when a focused field would actually be obscured by the IME.
  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        if (!target.isConnected || document.activeElement !== target) return;
        const viewport = window.visualViewport;
        const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        const rect = target.getBoundingClientRect();
        const lowerLimit = visibleBottom - 24;
        const header = document.querySelector('.customer-page-header');
        const progress = document.querySelector('.customer-order-progress');
        const upperLimit = (header?.getBoundingClientRect().bottom || 0) + (progress?.getBoundingClientRect().height || 0) + 20;
        if (rect.bottom > lowerLimit) {
          window.scrollBy({ top: rect.bottom - lowerLimit, behavior: 'smooth' });
        } else if (rect.top < upperLimit) {
          window.scrollBy({ top: rect.top - upperLimit, behavior: 'smooth' });
        }
      }, 320);
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, []);

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

  // Multi-step State with localStorage draft support
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [orderState, setOrderState] = useState<OrderState>((): OrderState => {
    const defaultState: OrderState = {
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
      department: '',
      initials: '',
      attn: '',
      customMenu: ''
    };

    if (initialData) {
      return { ...defaultState, ...(initialData as Partial<OrderState>) };
    }

    // Current draft takes priority; legacy storage is used only as a fallback.
    // Read during initialization so a mount-time effect cannot overwrite newer data.
    for (const key of ['wawasan_order_draft_state', 'wawasan_order_draft']) {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        const restored = parseStoredOrderDraft(saved);
        if (restored) return { ...defaultState, ...restored };
      } catch (err) {
        console.warn(`Failed to restore order draft from ${key}:`, err);
      }
    }
    return defaultState;
  });

  // Ghost Demo Shadow State
  const [contactFieldErrors, setContactFieldErrors] = useState<OrderContactErrors>({});
  const clearContactFieldError = useCallback((field: OrderContactField) => {
    setContactFieldErrors(previous => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const [demoActive, setDemoActive] = useState(false);
  const [demoState, setDemoState] = useState<Partial<OrderState>>({});
  const [demoStep, setDemoStep] = useState(1);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const { videoRef: mascotVideoRef, navigate: navigateStep, busy: stepTransitionBusy, pulling: stepPulling, visible: mascotVisible, finishWithoutAnimation, pullDuration } = useMascotStepTransition(currentStep, setCurrentStep, demoActive);

  useEffect(() => {
    if (stepTransitionBusy) setPullDistance(stepContentRef.current?.getBoundingClientRect().width ?? 0);
  }, [stepTransitionBusy]);

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
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [dynamicMenu, setDynamicMenu] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // Derived Values
  const effectiveState = demoActive ? { ...orderState, ...demoState } : orderState;
  const effectiveStep = demoActive ? demoStep : currentStep;

  // useCallback Hooks
  const applyDemoUpdate = useCallback((key: string, value: any) => {
    setDemoState(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyDemoStep = useCallback((step: number) => {
    setDemoStep(step);
  }, []);

  const handleEndDemo = useCallback(() => {
    setDemoActive(false);
    setDemoState({});
    setDemoStep(1);
  }, []);

  const handleStartDemo = useCallback(() => {
    setDemoState({});
    setDemoStep(1);
    setDemoActive(true);
  }, []);

  // Demo is opt-in; do not interrupt a customer's first order or draft.

  // Automatically scroll page to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [effectiveStep]);

  // Helper to clear saved draft
  const clearOrderDraft = () => {
    try {
      localStorage.removeItem('wawasan_order_draft_step');
      localStorage.removeItem('wawasan_order_draft_state');
      localStorage.removeItem('wawasan_order_draft');
    } catch (err) {
      console.warn('Failed to clear draft:', err);
    }
  };

  // NativeBackButtonHandler owns the only Capacitor Back listener.
  // This cancelable DOM event gives the wizard priority over browser history.
  useEffect(() => {
    const handleOrderStepBack = (event: Event) => {
      if (demoActive) {
        event.preventDefault();
        handleEndDemo();
        return;
      }
      if (currentStep > 1 && currentStep < 5) {
        event.preventDefault();
        if (!stepTransitionBusy) {
          triggerLightImpact();
          navigateStep(step => step - 1);
        }
      }
    };
    document.addEventListener('wawasan:order-step-back', handleOrderStepBack);
    return () => document.removeEventListener('wawasan:order-step-back', handleOrderStepBack);
  }, [currentStep, demoActive, handleEndDemo, navigateStep, stepTransitionBusy]);

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

  // Save draft on every state or step change
  useEffect(() => {
    if (demoActive) return;
    if (currentStep < 5 && !initialData) {
      try {
        localStorage.setItem('wawasan_order_draft_step', String(currentStep));
        localStorage.setItem('wawasan_order_draft_state', JSON.stringify(orderState));
        setDraftSavedAt(Date.now());
      } catch (err) {
        console.warn('Failed to save draft state:', err);
      }
    }
  }, [currentStep, orderState, initialData, demoActive]);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // Human-readable label for the selected meal types. orderState.mealTypes is
  // a multi-select array (customer can pick breakfast + lunch + hi-tea
  // together), so this joins all selected labels rather than checking a
  // single value.
  const getMealTypesLabel = () => {
    const mealTypes = effectiveState.mealTypes || [];
    if (mealTypes.length === 0) return tText('Not selected', 'Belum dipilih');
    const labels: Record<'sarapan' | 'tengahari' | 'hitea', string> = {
      sarapan: tText('Breakfast', 'Sarapan'),
      tengahari: tText('Lunch', 'Makan Tengah Hari'),
      hitea: tText('Hi-Tea', 'Hi-Tea'),
    };
    return mealTypes.map(m => labels[m]).join(', ');
  };

  // Sync Logged-In User Profile details
  const syncProfileDataToState = (profile: any) => {
    const userTo = profile.to || '';
    const isKnownCompany = userTo && SAVED_COMPANIES.includes(userTo);
    
    setOrderState(prev => ({
      ...prev,
      companyName: prev.companyName || (isKnownCompany ? userTo : (userTo ? 'other' : '')),
      customCompany: prev.customCompany || (!isKnownCompany && userTo ? userTo : ''),
      department: prev.department || profile.department || profile.division || '',
      initials: prev.initials || profile.initials || profile.initialIdentifier || '',
      attn: prev.attn || profile.attn || '',
      name: prev.name || profile.name || '',
      contact: prev.contact || profile.contact || '',
      email: prev.email || profile.email || '',
      confirmEmail: prev.confirmEmail || profile.email || '',
    }));
  };

  const handleSyncFromActiveProfile = async () => {
    if (!currentUser) return;
    try {
      setIsProfileLoading(true);
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const profile = userSnap.data();
        syncProfileDataToState(profile);
        toast({
          title: tText('Profile Details Synced', 'Profil Disegerakkan'),
          description: tText('Corporate billing details auto-filled from active session.', 'Butiran bil korporat diisi daripada sesi profil aktif.'),
          variant: 'success'
        });
      }
    } catch (err) {
      console.error('Error syncing profile details:', err);
    } finally {
      setIsProfileLoading(false);
    }
  };

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
            syncProfileDataToState(profile);
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

      // Restore chosen dishes from previous order text or menu field using dynamic/default menu
      const previousMenuText = asString(initialData.menu).toLowerCase();
      const menuCatalog = dynamicMenu.length > 0 ? dynamicMenu : DEFAULT_MENU_ITEMS;
      const matchedDishes = menuCatalog.filter(d =>
        d.category !== 'drinks' &&
        (previousMenuText.includes((d.nameBm || '').toLowerCase()) ||
         previousMenuText.includes((d.nameEn || '').toLowerCase()) ||
         previousMenuText.includes((d.name || '').toLowerCase()))
      );
      const matchedVeggies = menuCatalog.filter(v =>
        (v.category === 'veggies' || v.category === 'veggie' || v.category === 'vegetables') &&
        (previousMenuText.includes((v.nameBm || '').toLowerCase()) ||
         previousMenuText.includes((v.nameEn || '').toLowerCase()) ||
         previousMenuText.includes((v.name || '').toLowerCase()))
      );

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
        department: asString(initialData.department),
        initials: asString(initialData.initials),
        attn: asString(initialData.attn),
        customMenu: ''
      });
    }
  }, [initialData, dynamicMenu]);

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

  // HANDLERS FOR FIELD UPDATES
  const handleToggleDish = async (dish: any) => {
    if (demoActive) return;
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
    if (demoActive) return;
    await triggerLightImpact();
    setOrderState(prev => {
      let g = prev.guests + delta;
      if (g < 1) g = 1; // Min 1 pax as requested
      if (g > 5000) g = 5000; // Allow high max cap
      return { ...prev, guests: g };
    });
  };

  const handleToggleMeal = async (id: 'sarapan' | 'tengahari' | 'hitea') => {
    if (demoActive) return;
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

  const handleDiscardDraft = async () => {
    if (demoActive) return;
    await triggerLightImpact();
    clearOrderDraft();
    setContactFieldErrors({});
    setDraftSavedAt(null);
    setCurrentStep(1);
    setOrderState({
      eventType: '',
      mealTypes: [],
      preparationType: 'meal_box',
      guests: 50,
      dishes: [],
      veggies: [],
      name: currentUser?.displayName || '',
      contact: currentUser?.phoneNumber || '',
      email: currentUser?.email || '',
      confirmEmail: currentUser?.email || '',
      date: '',
      time: '12:00',
      location: '',
      delivery: 'delivery',
      notes: '',
      companyName: '',
      customCompany: '',
      department: '',
      initials: '',
      attn: '',
      customMenu: ''
    });
  };

  const handleStepNext = async (step: number) => {
    await triggerLightImpact();
    const triggerWarning = () => triggerNotification(NotificationType.Warning);

    if (step === 1) {
      if (!effectiveState.eventType) {
        triggerWarning();
        toast({
          title: tText('Event Type Required', 'Pilih Jenis Majlis'),
          description: tText('Please select whether this is a corporate or other event.', 'Sila pilih sama ada ini jamuan pejabat atau majlis lain.'),
          variant: 'warning'
        });
        return;
      }
      if (effectiveState.mealTypes.length === 0) {
        triggerWarning();
        toast({
          title: tText('Meal Type Required', 'Pilih Jenis Hidangan'),
          description: tText('Please select the serving time/meal block.', 'Sila pilih hidangan yang diperlukan.'),
          variant: 'warning'
        });
        return;
      }
      if (!effectiveState.guests || effectiveState.guests < 1) {
        triggerWarning();
        toast({
          title: tText('Minimum Quantity Required', 'Kuantiti Minimum Diperlukan'),
          description: tText('Minimum catering order is 1 pax.', 'Minimum tempahan katering adalah 1 orang.'),
          variant: 'warning'
        });
        return;
      }
      if (!demoActive) navigateStep(2);
      logOrderStep(2, 'dish_selection');
    }

    if (step === 2) {
      if (!demoActive && !effectiveState.dishes.length && !effectiveState.veggies.length && !effectiveState.customMenu?.trim()) {
        setOrderState(prev => ({ ...prev, customMenu: 'Set Box Makanan dan Minuman' }));
      }
      if (!demoActive) navigateStep(3);
      logOrderStep(3, 'contact_details');
    }

    if (step === 3) {
      const errors = validateOrderContactDetails(effectiveState, tText);
      setContactFieldErrors(errors);
      const firstInvalidField = (Object.keys(errors) as OrderContactField[])[0];
      if (firstInvalidField) {
        triggerWarning();
        toast({
          title: tText('Check booking details', 'Semak butiran tempahan'),
          description: errors[firstInvalidField],
          variant: 'warning',
        });
        const targetId = ORDER_CONTACT_FOCUS_IDS[firstInvalidField];
        if (targetId) {
          requestAnimationFrame(() => {
            const target = document.getElementById(targetId);
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target?.focus({ preventScroll: true });
          });
        }
        return;
      }
      if (!demoActive) navigateStep(4);
      logOrderStep(4, 'review_submit');
    }
  };

  const resendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (!user) { setAuthMode('signin'); setAuthModalOpen(true); return; }
    setVerificationBusy(true);
    try {
      await sendEmailVerification(user);
      toast({ title: tText('Check your inbox', 'Semak peti masuk'), description: tText('A verification link has been sent. Open it, then come back and submit.', 'Pautan pengesahan dihantar. Buka pautan tersebut, kemudian kembali untuk menghantar.'), variant: 'info' });
    } catch (error) {
      toast({ title: tText('Could not send verification', 'Gagal menghantar pengesahan'), description: error instanceof Error ? error.message : String(error), variant: 'error' });
    } finally {
      setVerificationBusy(false);
    }
  };

  // FINAL ORDER SUBMISSION PIPELINE
  const handleOrderSubmission = async () => {
    if (demoActive || isSubmitting) return;
    const signedInUser = auth.currentUser;
    if (!signedInUser) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      toast({ title: tText('Sign in to send', 'Log masuk untuk menghantar'), description: tText('Your draft stays here. Sign in or register before sending your catering request.', 'Draf kekal di sini. Log masuk atau daftar sebelum menghantar permohonan katering.'), variant: 'info' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Firebase refresh is needed when the email verification link was just opened.
      await signedInUser.reload();
      const access = evaluateVerifiedOrderAccess({ uid: signedInUser.uid, emailVerified: signedInUser.emailVerified });
      if (!access.allowed) {
        toast({ title: tText('Email verification required', 'Sahkan alamat e-mel'), description: tText('Verify your email, then tap Submit again.', 'Sahkan e-mel anda, kemudian tekan Hantar sekali lagi.'), variant: 'warning' });
        return;
      }
    } catch (error) {
      toast({ title: tText('Verification unavailable', 'Pengesahan tidak tersedia'), description: error instanceof Error ? error.message : String(error), variant: 'error' });
      return;
    } finally {
      setIsSubmitting(false);
    }
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
        combinedMenuStr = SET_BOX_MENU_TITLE;
      }

      const formattedDateStr = orderState.date; // YYYY-MM-DD
      const pricesRecord: Record<string, number> = {};

      const orderData = {
        to: billingCompany || 'Majlis Persendirian',
        attn: orderState.attn || orderState.name,
        department: orderState.department || '',
        division: orderState.department || '',
        initials: orderState.initials || '',
        initialIdentifier: orderState.initials || '',
        name: orderState.name,
        contact: orderState.contact,
        email: orderState.email,
        date: formattedDateStr,
        eventDate: formattedDateStr,
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
        totalAmount: 0,
        dishes: orderState.dishes,
        veggies: orderState.veggies,
        customMenu: orderState.customMenu,
        userId: signedInUser.uid,
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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await signedInUser.getIdToken(true)}`,
          },
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

      const createdOrder: Order = {
        // F-DISHES-TYPE (2026-08-18): orderData.dishes holds rich client-side
        // dish objects ({id, nameEn, nameBm, price, category}) — needed for the
        // POST body to the server (server normalizes it to string[] before
        // persisting, see server/routes/orderRoutes.ts). Order.dishes (types.ts)
        // is typed as string[], so casting orderData straight to Order failed
        // tsc on the dishes field. Excluding dishes from the cast (via the
        // destructure below) and setting a normalized string[] version
        // (mirroring the server's own normalization) fixes the type error
        // without touching orderData itself.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dishes is intentionally omitted, not used
        ...((({ dishes, ...rest }) => rest)(orderData) as Order),
        dishes: orderState.dishes.map(d =>
          (language === 'bm' ? d.nameBm : d.nameEn) || d.nameBm || d.nameEn || ''
        ),
        id: generatedOrderId,
        invoiceNo: finalInvoiceNo,
        prices: resData.prices || orderData.prices || {},
        totalAmount: resData.totalAmount !== undefined ? resData.totalAmount : orderData.totalAmount,
      };
      setSubmittedOrder(createdOrder);

      // Generate Invoice PDF & Mail to customer
      try {
        setEmailStatus('sending');
        // F-BUNDLE (2026-08-18): pdfService.ts (jsPDF + jspdf-autotable) was
        // previously a static top-level import, so it shipped inside every
        // customer's OrderForm bundle even if they never reached this point.
        // Loading it here, only once an order is actually submitted, keeps
        // that weight out of the initial order-form chunk for everyone else.


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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await signedInUser.getIdToken(true)}` },
            body: safeJsonStringify({
              email: orderData.email,
              name: orderData.name,
              
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
      triggerNotification(NotificationType.Error);

      // F-OFFLINE (audit 2026-08-11): only queue when the request never
      // reached the server (see OrderNetworkError tagging above). A
      // server-rejected request (validation, 500, etc.) would just fail the
      // same way again on retry, so those are NOT queued — only genuine
      // "couldn't send it at all" failures are.
      //
      // BUGFIX (2026-08-13): recordException used to fire unconditionally
      // right here, before this check — so every offline order (an expected,
      // handled path with its own "saved for later" UX below) was also
      // reported to Crashlytics as a crash. That's a false positive: nothing
      // crashed, the app did exactly what it's supposed to do when offline.
      // Left unfixed, it drowns out real crash signal in noise every time a
      // customer orders from a weak-signal spot. Only the else branch below
      // (a genuine, unhandled submission error) is now reported.
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
        recordException(err instanceof Error ? err : new Error(String(err)), {
          type: 'order_submission_error',
          eventType: orderState.eventType,
        });
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
    setContactFieldErrors({});
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
      department: '',
      initials: '',
      attn: '',
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
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} onSuccess={() => setCurrentUser(auth.currentUser)} />

      {/* Main Container with responsive layout: full width header, split 2-column view on desktop */}
      <div 
        className="customer-order-form flex flex-col w-full max-w-6xl mx-auto font-sans transition-all duration-200"
        data-keyboard-visible={isKeyboardVisible}
      >
        
        <OrderPreviewProgress
          step={effectiveStep}
          language={language}
          dishes={effectiveState.dishes}
          veggies={effectiveState.veggies}
          customMenu={effectiveState.customMenu}
          isDemo={demoActive}
          guests={effectiveState.guests}
          preparationType={effectiveState.preparationType}
          isKeyboardVisible={isKeyboardVisible}
        >
            <div className="customer-progress-copy" role="status">
              <span>{tText('STEP', 'LANGKAH')} <strong>{effectiveStep} / 4</strong></span>
              <span>{tText('Event → Menu → Details → Review', 'Majlis → Menu → Butiran → Semak')}</span>
            </div>
            <div className="customer-progress-track" aria-hidden="true">
              {[1, 2, 3, 4].map(step => <span key={step} data-complete={step <= effectiveStep} />)}
            </div>
            {!demoActive && !initialData && (
              <div className="customer-progress-extras">
                {draftSavedAt && !initialData ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{tText('Draft saved', 'Draf disimpan')}</span>
                    <Button variant="ghost" type="button" onClick={handleDiscardDraft}>{tText('Clear draft', 'Padam draf')}</Button>
                  </div>
                ) : <span />}
                <details className="customer-order-help">
                  <summary><CircleHelp className="h-4 w-4" aria-hidden="true" /><span>{tText('Help', 'Bantuan')}</span></summary>
                  <div className="customer-order-help-content">
                    <OrderFormTip language={language} />
                    <Button variant="ghost" type="button" onClick={handleStartDemo} aria-label={tText('Watch demo', 'Tonton demo')}>
                      <Ghost className="h-4 w-4" aria-hidden="true" />{tText('Watch demo', 'Tonton demo')}
                    </Button>
                  </div>
                </details>
              </div>
            )}
        </OrderPreviewProgress>

        {!currentUser && (
          <div className="customer-guest-banner">
            <span><UserIcon className="h-4 w-4" aria-hidden="true" />{tText('Draft mode — sign in to submit', 'Mod draf — log masuk untuk hantar')}</span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" onClick={() => { setAuthMode('signin'); setAuthModalOpen(true); }}>{tText('Sign in', 'Log masuk')}</Button>
              <Button type="button" variant="ghost" onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}>{tText('Sign up', 'Daftar')}</Button>
            </div>
          </div>
        )}

        {currentUser && !currentUser.emailVerified && (
          <div className="mx-3 my-3 flex flex-col gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--color-surface-muted)] p-3 sm:flex-row sm:items-center sm:justify-between" role="status">
            <p className="text-sm text-[var(--color-text)]">{tText('You can prepare your order, but please verify your email before sending.', 'Anda boleh menyediakan tempahan, tetapi sila sahkan e-mel sebelum menghantarnya.')}</p>
            <Button type="button" variant="outline" size="sm" disabled={verificationBusy} onClick={resendVerificationEmail}>{verificationBusy ? tText('Sending…', 'Menghantar…') : tText('Resend verification', 'Hantar semula pengesahan')}</Button>
          </div>
        )}

        {/* Responsive Grid: Steps Form on Left + Live Order Summary Sidebar on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Stepper Wizard & Inputs Panel */}
          <div className="customer-form-panel lg:col-span-7 xl:col-span-8 overflow-hidden">
            
            {/* Form Steps Container */}
            <div className="customer-step-content overflow-hidden" aria-busy={stepTransitionBusy} onKeyDownCapture={event => { if (stepTransitionBusy) { event.preventDefault(); event.stopPropagation(); } }}>
              <motion.div ref={stepContentRef} key={effectiveStep} initial={false} animate={{ x: stepPulling ? '100%' : 0 }} transition={{ duration: pullDuration, ease: [0.5, 0.05, 0.25, 1] }} style={{ pointerEvents: stepTransitionBusy ? 'none' : undefined }}>
            
            {/* STEP 1: PILIH JENIS MAJLIS & HIDANGAN */}
            {effectiveStep === 1 && (
              <Step1EventMeal
                orderState={effectiveState}
                setOrderState={setOrderState}
                handleToggleMeal={handleToggleMeal}
                adjustGuests={adjustGuests}
                handleStepNext={handleStepNext}
                tText={tText}
              />
            )}

            {/* STEP 2: PILIH LAUK PAUK & CALCULATE PRICE */}
            {effectiveStep === 2 && (
              <Step2DishSelection
                orderState={effectiveState}
                setOrderState={setOrderState}
                menuLoading={menuLoading}
                dynamicMenu={dynamicMenu}
                handleToggleDish={handleToggleDish}
                handleStepNext={handleStepNext}
                setCurrentStep={navigateStep}
                triggerLightImpact={triggerLightImpact}
                tText={tText}
                t={t}
              />
            )}

            {/* STEP 3: BUTIRAN TEMPAHAN */}
            {effectiveStep === 3 && (
              <Step3ContactDetails
                orderState={effectiveState}
                setOrderState={setOrderState}
                isProfileLoading={isProfileLoading}
                savedLocations={savedLocations}
                isDetectingLocation={isDetectingLocation}
                handleDetectLocation={handleDetectLocation}
                handleStepNext={handleStepNext}
                setCurrentStep={navigateStep}
                triggerLightImpact={triggerLightImpact}
                currentUser={currentUser}
                handleSyncFromActiveProfile={handleSyncFromActiveProfile}
                tText={tText}
                t={t}
                fieldErrors={contactFieldErrors}
                clearFieldError={clearContactFieldError}
              />
            )}

            {/* STEP 4: REVIEW & CONFIRMATION */}
            {effectiveStep === 4 && (
              <Step4ReviewSubmit
                orderState={effectiveState}
                getMealTypesLabel={getMealTypesLabel}
                isSubmitting={isSubmitting}
                handleOrderSubmission={handleOrderSubmission}
                setCurrentStep={navigateStep}
                triggerLightImpact={triggerLightImpact}
                tText={tText}
                t={t}
              />
            )}

            {/* STEP 5: KEJAYAAN / SUCCESS */}
            {effectiveStep === 5 && (
              <Step5OrderSuccess
                orderState={effectiveState}
                referenceNumber={referenceNumber}
                getMealTypesLabel={getMealTypesLabel}
                emailStatus={emailStatus}
                setShowPdfPreviewModal={setShowPdfPreviewModal}
                handleResetForm={handleResetForm}
                handleShareReceipt={handleShareReceipt}
                tText={tText}
              />
            )}

          </motion.div>
        </div>

        </div>

        {/* Right Column: Interactive Sticky Live Summary Card */}
        <div className="customer-order-aside lg:col-span-5 xl:col-span-4 lg:sticky space-y-4">
          <details className="customer-live-summary customer-order-summary rounded-2xl border p-5 sm:p-6 relative" open={!isNativePresentation || effectiveStep >= 4}>
            <summary className="customer-order-summary-heading">
              <span className="customer-order-summary-title">{tText('Order summary', 'Ringkasan tempahan')}</span>
              <span className="customer-order-summary-count">{effectiveState.guests} {tText('pax', 'orang')}</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </summary>
            <div className="customer-order-summary-content">
            {/* Event Type & Pax Badge */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone font-medium">{tText('Event Type:', 'Jenis Majlis:')}</span>
                <span className="font-bold text-deep-forest dark:text-white">
                  {effectiveState.eventType === 'pejabat' 
                    ? tText('Office Feast', 'Jamuan Pejabat') 
                    : effectiveState.eventType === 'lain'
                      ? tText('Private Event', 'Lain-Lain')
                      : tText('Not Selected', 'Belum Dipilih')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone font-medium">{tText('Guest Count:', 'Kuantiti Pax:')}</span>
                <span className="font-bold text-deep-forest dark:text-white">
                  {effectiveState.guests} {tText('pax', 'orang')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone font-medium">{tText('Serving Time:', 'Hidangan Untuk:')}</span>
                <span className="font-bold text-deep-forest dark:text-white text-right">
                  {getMealTypesLabel() || tText('Not Selected', 'Belum Dipilih')}
                </span>
              </div>

              {effectiveState.date && (
                <div className="flex justify-between items-center">
                  <span className="text-stone font-medium">{tText('Date & Time:', 'Tarikh & Masa:')}</span>
                  <span className="font-bold text-deep-forest dark:text-white">
                    {effectiveState.date} @ {effectiveState.time}
                  </span>
                </div>
              )}

              {/* Selected Dishes Badges */}
              <div className="pt-2 border-t border-stone/10 space-y-1.5">
                <span className="microcopy-12-upper font-extrabold text-stone uppercase tracking-wider block">
                  {tText('Selected Menu Items:', 'Menu Pilihan:')}
                </span>
                
                {effectiveState.dishes.length > 0 || effectiveState.veggies.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
                    {effectiveState.dishes.map(d => (
                      <span key={d.id} className="inline-block bg-crisp-carrot/10 text-crisp-carrot font-bold px-2 py-0.5 rounded microcopy-12-upper border border-crisp-carrot/20">
                        {tText(d.nameEn, d.nameBm)}
                      </span>
                    ))}
                    {effectiveState.veggies.map(v => (
                      <span key={v.id} className="inline-block bg-deep-forest/20 text-deep-forest dark:text-sunshine font-bold px-2 py-0.5 rounded microcopy-12-upper border border-deep-forest/30">
                        {tText(v.nameEn, v.nameBm)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="microcopy-12 text-stone italic block">
                    {tText('Select dishes in Step 2 or use the Box Set.', 'Pilih lauk di Langkah 2 atau gunakan Set Kotak.')}
                  </span>
                )}
              </div>

              {/* Estimation Total Calculation */}
              <div className="customer-quote-box p-4 rounded-xl border relative overflow-hidden mt-4 space-y-2">
                <div 
                  className="customer-quote-batik absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="customer-quote-basis relative z-10 flex justify-between items-center">
                  <span className="text-stone-300 microcopy-12 font-medium uppercase tracking-wider">
                    {tText('Pricing Basis:', 'Asas Harga:')}
                  </span>
                  <span className="font-bold text-[var(--color-sunshine-cta)] text-xs uppercase tracking-wider">
                    {tText('Inquiry / Custom Quote', 'Pertanyaan / Sebut Harga')}
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="min-w-0 flex flex-col gap-0.5 lg:flex-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      {tText('Catering Price:', 'Harga Katering:')}
                    </span>
                    <span className="customer-quote-status text-xs font-bold uppercase tracking-wider font-display lg:text-sm">
                      {tText('Quotation Pending', 'Menunggu Sebut Harga')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Contact & Support Button */}
              <div className="pt-2">
                <a
                  href="https://wa.me/60173157731?text=Hai%20Pak%20Usop%20%2F%20Restoran%20Wawasan,%20saya%20hendak%20bertanya%20mengenai%20tempahan%20katering"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="customer-whatsapp-inquiry w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{tText('Direct WhatsApp Inquiry', 'Tanya Direct WhatsApp')}</span>
                </a>
              </div>

            </div>
            </div>
          </details>
        </div>

      </div> {/* End of Responsive Grid */}
      </div> {/* End of Outer Wrapper */}

      {/* PDF Preview Modal for submitted order */}
      {submittedOrder && (
        <CustomerInvoicePreviewModal
          isOpen={showPdfPreviewModal}
          onClose={() => setShowPdfPreviewModal(false)}
          order={submittedOrder}
          language={language}
        />
      )}

      <motion.video
        ref={mascotVideoRef}
        src={getAssetUrl('/assets/mascots/daun_penarik.webm')}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onError={finishWithoutAnimation}
        initial={false}
        animate={{ x: stepPulling ? pullDistance : 0 }}
        transition={{ duration: pullDuration, ease: [0.5, 0.05, 0.25, 1] }}
        className="pointer-events-none fixed right-0 z-[60] w-[min(34vw,140px)]"
        style={{ bottom: 'calc(130px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))', visibility: mascotVisible ? 'visible' : 'hidden' }}
      />

      {/* Screen-reader feedback during asynchronous order submission. */}
      <span role="status" aria-live="polite" className="sr-only">
        {isSubmitting ? tText('Submitting your order. Please wait.', 'Menghantar tempahan anda. Sila tunggu.') : ''}
      </span>

      {/* Ghost Demo Overlay & Floating Skip Button */}
      {demoActive && (
        <div className="fixed top-[calc(68px+env(safe-area-inset-top,8px))] right-3 sm:right-6 z-[9999]">
          <Button
            type="button"
            onClick={handleEndDemo}
            className="bg-stone-900/90 hover:bg-black text-white px-3.5 py-1.5 h-auto rounded-full text-xs font-bold shadow-lg border border-white/20 flex items-center gap-1.5 backdrop-blur-md cursor-pointer active:scale-95"
          >
            <span>{tText('Skip demo', 'Langkau demo')} ✕</span>
          </Button>
        </div>
      )}
      <DemoOverlay
        active={demoActive}
        onDone={handleEndDemo}
        applyDemoUpdate={applyDemoUpdate}
        applyDemoStep={applyDemoStep}
      />

    </>
  );
}

