import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { safeJsonStringify, safeCopyToClipboard } from '@/lib/utils';
import { generateInvoicePDF } from '@/services/pdfService';
import { getApiUrl, fetchWithCache } from '@/lib/api';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { DEFAULT_MENU_ITEMS } from '@/constants/menu';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { buildShareableUrl } from '@/lib/share';
import { triggerNotification, NotificationType, triggerLightImpact } from '@/lib/haptics';
import { addPendingOrder } from '@/lib/pendingOrdersQueue';
import { logOrderStep, logOrderSubmitted } from '@/services/analyticsService';
import { recordException } from '@/services/crashlyticsService';
import type { SavedLocation, Order } from '@/types';

// FOOD MENU CONSTANTS - Derived dynamically from central menu to prevent data clashing
export const LAUK_UTAMA = DEFAULT_MENU_ITEMS.filter(item => 
  item.category === 'lunch' && 
  ['asam_pedas', 'ayam_goreng_berempah', 'daging_masak_merah', 'sambal_sotong', 'ikan_keli_sambal', 'rendang_daging', 'kari_kambing', 'udang_goreng_tepung'].includes(item.id)
).map(item => ({
  id: item.id,
  nameEn: item.nameEn,
  nameBm: item.nameBm,
  descEn: item.descEn,
  descBm: item.descBm,
  price: item.price
}));

export const SAYURAN = DEFAULT_MENU_ITEMS.filter(item => 
  item.category === 'lunch' && 
  ['sayur_campur', 'kangkung_belacan', 'pucuk_paku_masak_lemak'].includes(item.id)
).map(item => ({
  id: item.id,
  nameEn: item.nameEn,
  nameBm: item.nameBm,
  descEn: item.descEn,
  descBm: item.descBm,
  price: item.price
}));

export interface OrderState {
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

function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback to RFC4122 standard
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useOrderWizard(initialData?: Record<string, any> | null) {
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
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  const clearOrderDraft = () => {
    try {
      localStorage.removeItem('wawasan_order_draft_step');
      localStorage.removeItem('wawasan_order_draft_state');
      localStorage.removeItem('wawasan_order_draft');
    } catch (err) {
      console.warn('Failed to clear draft:', err);
    }
  };

  // Hardware back button navigation for native apps
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    let handle: any = null;
    const setupBackButton = async () => {
      try {
        handle = await App.addListener('backButton', () => {
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

  // Load menu
  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      try {
        const data = await fetchWithCache(getApiUrl('/api/menu'), undefined, 120000);
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

  // Multi-step State with draft support
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
      customMenu: ''
    };

    if (initialData) {
      return { ...defaultState, ...(initialData as Partial<OrderState>) };
    }

    try {
      const saved = localStorage.getItem('wawasan_order_draft_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...defaultState,
            ...parsed,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to parse draft state:', err);
    }
    return defaultState;
  });

  // Auto-save draft
  useEffect(() => {
    if (currentStep < 5 && !initialData) {
      try {
        localStorage.setItem('wawasan_order_draft_step', String(currentStep));
        localStorage.setItem('wawasan_order_draft_state', JSON.stringify(orderState));
        setDraftSavedAt(Date.now());
      } catch (err) {
        console.warn('Failed to save draft state:', err);
      }
    }
  }, [currentStep, orderState, initialData]);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const getMealTypesLabel = () => {
    if (orderState.mealTypes.length === 0) return tText('Not selected', 'Belum dipilih');
    const labels: Record<'sarapan' | 'tengahari' | 'hitea', string> = {
      sarapan: tText('Breakfast', 'Sarapan'),
      tengahari: tText('Lunch', 'Makan Tengah Hari'),
      hitea: tText('Hi-Tea', 'Hi-Tea'),
    };
    return orderState.mealTypes.map(m => labels[m]).join(', ');
  };

  // Sync auth profile
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

  // Reverse Geocode lookup
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

  const getPricePerPax = () => {
    const dishSum = orderState.dishes.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const vegSum = orderState.veggies.reduce((acc, curr) => acc + (curr.price || 0), 0);
    return dishSum + vegSum;
  };

  const getGrandTotal = () => {
    return getPricePerPax() * orderState.guests * (orderState.mealTypes.length || 1);
  };

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
      if (g < 1) g = 1;
      if (g > 5000) g = 5000;
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

  const handleDiscardDraft = async () => {
    await triggerLightImpact();
    localStorage.removeItem('wawasan_order_draft_step');
    localStorage.removeItem('wawasan_order_draft_state');
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
      customMenu: ''
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

  const handleOrderSubmission = async () => {
    setIsSubmitting(true);
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

      const formattedDateStr = orderState.date;
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
        status: 'pending',
        prices: pricesRecord,
        totalAmount: getGrandTotal(),
        dishes: orderState.dishes,
        veggies: orderState.veggies,
        customMenu: orderState.customMenu,
        userId: currentUser?.uid || null,
        delivery: orderState.delivery,
        idempotencyKey: idempotencyKeyRef.current
      };
      orderDataForQueue = orderData;

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
      const finalInvoiceNo: string | undefined = resData.invoiceNo;
      const bookingReference = finalInvoiceNo || generatedOrderId;

      setReferenceNumber(bookingReference);
      clearOrderDraft();

      const createdOrder: Order = {
        ...(orderData as unknown as Order),
        id: generatedOrderId,
        invoiceNo: finalInvoiceNo,
        prices: resData.prices || orderData.prices || {},
        totalAmount: resData.totalAmount !== undefined ? resData.totalAmount : orderData.totalAmount,
      };
      setSubmittedOrder(createdOrder);

      // Send preliminary PDF invoice
      try {
        setEmailStatus('sending');
        const pdfDoc = generateInvoicePDF(createdOrder, false, language);
        const pdfBase64 = (pdfDoc as any).output('datauristring').split(',')[1];

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

  return {
    orderState,
    setOrderState,
    currentStep,
    setCurrentStep,
    draftSavedAt,
    isSubmitting,
    referenceNumber,
    submittedOrder,
    setSubmittedOrder,
    showPdfPreviewModal,
    setShowPdfPreviewModal,
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    currentUser,
    isProfileLoading,
    isDetectingLocation,
    emailStatus,
    setEmailStatus,
    savedLocations,
    dynamicMenu,
    menuLoading,
    clearOrderDraft,
    handleDiscardDraft,
    handleResetForm,
    handleDetectLocation,
    handleToggleDish,
    handleToggleMeal,
    adjustGuests,
    handleStepNext,
    handleOrderSubmission,
    handleShareReceipt,
    getPricePerPax,
    getGrandTotal,
    getMealTypesLabel,
    tText,
    t,
    language
  };
}
