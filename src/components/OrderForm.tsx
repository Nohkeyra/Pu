import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/Skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Utensils, 
  Share2, 
  Check, 
  MapPin, 
  Phone, 
  Clock, 
  Truck, 
  Store, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Briefcase,
  Smile,
  Coffee,
  Sun
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, safeCopyToClipboard, getAssetUrl } from '@/lib/utils';
import { generateInvoicePDF } from '@/services/pdfService';
import { motion, AnimatePresence } from 'motion/react';
import { getApiUrl } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AuthModal from './AuthModal';
import { SAVED_COMPANIES } from '@/constants/companies';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Geolocation } from '@capacitor/geolocation';
import { buildShareableUrl } from '@/lib/share';
import { triggerNotification, NotificationType, triggerLightImpact } from '@/lib/haptics';
import type { SavedLocation } from '@/types';

// TYPES
interface OrderState {
  eventType: 'pejabat' | 'lain' | '';
  mealTypes: ('sarapan' | 'tengahari' | 'hitea')[];
  guests: number;
  dishes: typeof LAUK_UTAMA[number][];
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

interface OrderFormProps {
  initialData?: Record<string, unknown> | null;
}

export default function OrderForm({ initialData }: OrderFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  // Multi-step State
  const [orderState, setOrderState] = useState<OrderState>({
    eventType: '',
    mealTypes: [],
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
      const matchedDishes = LAUK_UTAMA.filter(d => previousMenuText.includes(d.nameBm.toLowerCase()) || previousMenuText.includes(d.nameEn.toLowerCase()));
      const matchedVeggies = SAYURAN.filter(v => previousMenuText.includes(v.nameBm.toLowerCase()) || previousMenuText.includes(v.nameEn.toLowerCase()));

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
    const dishSum = orderState.dishes.reduce((acc, curr) => acc + curr.price, 0);
    const vegSum = orderState.veggies.reduce((acc, curr) => acc + curr.price, 0);
    return dishSum + vegSum;
  };

  const getGrandTotal = () => {
    return getPricePerPax() * orderState.guests * (orderState.mealTypes.length || 1);
  };

  // HANDLERS FOR FIELD UPDATES
  const handleToggleDish = async (dish: typeof LAUK_UTAMA[number]) => {
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

  const handleToggleVeggie = async (veg: typeof SAYURAN[number]) => {
    await triggerLightImpact();
    setOrderState(prev => {
      const exists = prev.veggies.some(v => v.id === veg.id);
      if (exists) {
        return { ...prev, veggies: prev.veggies.filter(v => v.id !== veg.id) };
      } else {
        return { ...prev, veggies: [...prev.veggies, veg] };
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
    }

    if (step === 2) {
      setCurrentStep(3);
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

      if (orderState.email.trim().toLowerCase() !== orderState.confirmEmail.trim().toLowerCase()) {
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
    }
  };

  // FINAL ORDER SUBMISSION PIPELINE
  const handleOrderSubmission = async () => {
    setIsSubmitting(true);

    try {
      const mappedMeals = orderState.mealTypes.map(m => {
        if (m === 'sarapan') return 'breakfast';
        if (m === 'tengahari') return 'lunch';
        return 'tea_break';
      });

      const billingCompany = orderState.eventType === 'pejabat' 
        ? (orderState.companyName === 'other' ? orderState.customCompany : orderState.companyName)
        : '';

      // Construct dishes list text for the single menu string field
      const dishListText = orderState.dishes.map(d => d.nameBm).join(', ');
      const vegListText = orderState.veggies.map(v => v.nameBm).join(', ');
      
      let combinedMenuStr = '';
      if (dishListText || vegListText) {
        combinedMenuStr = `Lauk Utama: ${dishListText || '-'} | Sayuran: ${vegListText || '-'}`;
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
        notes: orderState.notes,
        dateTime: new Date(`${formattedDateStr}T${orderState.time || '12:00'}`).toISOString(),
        lang: language,
        status: 'pending', // Pending status inside database
        prices: pricesRecord,
        totalAmount: getGrandTotal(),
        userId: currentUser?.uid || null,
        delivery: orderState.delivery
      };

      // Submit to Backend Server API
      const response = await fetch(getApiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error(`Submission failed with status: ${response.status}`);
      }

      const resData = await response.json();
      const generatedOrderId = resData.id;
      const finalInvoiceNo = resData.invoiceNo;

      setReferenceNumber(finalInvoiceNo);

      // Generate Invoice PDF & Auto Mail
      try {
        setEmailStatus('sending');
        const pdfData = {
          ...orderData,
          id: generatedOrderId,
          invoiceNo: finalInvoiceNo,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfDoc = generateInvoicePDF(pdfData as any, false, language);
        const fileName = `Invois_Wawasan_${finalInvoiceNo}.pdf`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfBase64 = (pdfDoc as any).output('datauristring').split(',')[1];

        // Trigger native download / Share sheets
        if (Capacitor.isNativePlatform()) {
          try {
            const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: pdfBase64,
              directory: Directory.Cache
            });
            await Share.share({
              title: fileName,
              url: savedFile.uri,
            });
          } catch (shareErr) {
            console.error('Error sharing PDF:', shareErr);
          }
        } else {
          pdfDoc.save(fileName);
        }

        // Email it using Brevo / Nodemailer on backend
        const emailResponse = await fetch(getApiUrl('/api/send-invoice'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: orderData.email,
            name: orderData.name,
            invoiceNo: finalInvoiceNo,
            pdfBase64: pdfBase64,
            isFinal: false,
            lang: language,
            orderDetails: orderData
          })
        });

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
      setCurrentStep(5);
    } catch (err) {
      console.error('Catering submission error:', err);
      triggerNotification(NotificationType.Error);
      toast({
        title: t('error'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareForm = async () => {
    const url = 'https://restoran-wawasan-bio.onrender.com/';
    const shareData = {
      title: tText('Restoran Wawasan Booking', 'Tempahan Restoran Wawasan'),
      text: tText('Order catering from Restoran Wawasan Pak Usop here:', 'Tempah katering Restoran Wawasan Pak Usop di sini:'),
      url: url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn('Share failed:', err);
        await safeCopyToClipboard(url);
        toast({ title: t('link_copied'), variant: 'success' });
      }
    } else {
      await safeCopyToClipboard(url);
      toast({ title: t('link_copied'), variant: 'success' });
    }
  };

  const handleResetForm = () => {
    setOrderState({
      eventType: '',
      mealTypes: [],
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
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Main Container mirroring Kimi mockup mobile shell but fully responsive on large screens */}
      <div className="w-full max-w-2xl mx-auto bg-card rounded-3xl border border-stone/10 shadow-2xl overflow-hidden font-sans">
        
        {/* App Header Bar mirroring Wawasan brand */}
        <div className="bg-charcoal text-white p-5 rounded-b-[24px] shadow-lg border-b border-charcoal/80 relative overflow-hidden">
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
          <div className="flex justify-between items-center relative z-10">
            <div>
              <span className="text-[11px] text-sunshine font-bold uppercase tracking-widest block mb-0.5">
                {tText('CATERING BOOKING', 'TEMPAHAN KATERING')}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
                Restoran Wawasan
              </h1>
              <p className="text-[10px] text-stone font-medium tracking-wide mt-0.5">
                Unit 3, Level B3, Menara PjH, Putrajaya
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sunshine flex items-center justify-center font-bold text-sm shadow-md text-white border border-white/20 select-none">
              RW
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 items-center relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kiwi/20 text-kiwi text-[11px] font-bold border border-kiwi/30">
              <span className="w-1.5 h-1.5 rounded-full bg-kiwi animate-pulse" />
              {tText('Accepting Bookings', 'Menerima Tempahan')}
            </span>
            <a 
              href="tel:+60178582642" 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors"
            >
              <Phone className="w-3 h-3 text-sunshine" />
              +60 17-858 2642
            </a>
          </div>
        </div>

        {/* Progress Bar Indicator */}
        {currentStep <= 4 && (
          <div className="px-6 pt-5 pb-2" role="navigation" aria-label={tText('Order progress', 'Kemajuan tempahan')}>
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
                            ? "bg-crisp-carrot border-crisp-carrot text-white shadow-crisp"
                            : isDone
                              ? "bg-[#A8E10C] border-[#A8E10C] text-[#161618]"
                              : "bg-muted border-stone/20 text-stone"
                        )}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : item.s}
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold transition-colors duration-300",
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

        {/* Stepper Wizard Panels */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: PILIH JENIS MAJLIS & HIDANGAN */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-deep-forest font-display">
                    {tText('Select Event Type', 'Pilih Jenis Majlis')}
                  </h2>
                  <p className="text-xs text-stone font-light mt-0.5">
                    {tText('Choose your catering hosting style.', 'Sila tentukan jenis majlis catering anda.')}
                  </p>
                </div>

                {/* Event Type option cards */}
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tText('Event type', 'Jenis Majlis')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={orderState.eventType === 'pejabat'}
                    onClick={() => setOrderState(prev => ({ ...prev, eventType: 'pejabat' }))}
                    className={cn(
                      "p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer relative",
                      orderState.eventType === 'pejabat' 
                        ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm" 
                        : "bg-muted hover:bg-muted/80 border-stone/15 text-stone"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      orderState.eventType === 'pejabat' ? "bg-crisp-carrot text-white" : "bg-card border border-stone/10 text-stone"
                    )}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold block">{tText('Office Feast', 'Jamuan Pejabat')}</span>
                    <span className="text-[10px] text-stone leading-tight font-light">{tText('Meetings, workshops & corporate.', 'Urusan rasmi menteri, mesyuarat, kursus.')}</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={orderState.eventType === 'lain'}
                    onClick={() => setOrderState(prev => ({ ...prev, eventType: 'lain' }))}
                    className={cn(
                      "p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer relative",
                      orderState.eventType === 'lain' 
                        ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm" 
                        : "bg-muted hover:bg-muted/80 border-stone/15 text-stone"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      orderState.eventType === 'lain' ? "bg-crisp-carrot text-white" : "bg-card border border-stone/10 text-stone"
                    )}>
                      <Smile className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold block">{tText('Private Events', 'Lain-lain')}</span>
                    <span className="text-[10px] text-stone leading-tight font-light">{tText('Birthday, reunion, gatherings.', 'Sambutan hari jadi, tahlil, reuni.')}</span>
                  </button>
                </div>

                {/* Meal Type selection */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-stone uppercase tracking-wider">
                    {tText('Meals For / Hidangan Untuk', 'Hidangan Untuk *')}
                  </Label>
                  
                  <div className="grid grid-cols-3 gap-3" role="group" aria-label={tText('Meal type', 'Hidangan')}>
                    {[
                      { id: 'sarapan', label: () => tText('Breakfast', 'Sarapan'), time: '7AM - 10AM', icon: Coffee },
                      { id: 'tengahari', label: () => tText('Lunch', 'Makan Tengah Hari'), time: '12PM - 3PM', icon: Sun },
                      { id: 'hitea', label: () => tText('Hi-Tea', 'Hi-Tea'), time: '3PM - 6PM', icon: Utensils }
                    ].map(m => {
                      const Icon = m.icon;
                      const mealId = m.id as 'sarapan' | 'tengahari' | 'hitea';
                      const isSelected = orderState.mealTypes.includes(mealId);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleToggleMeal(mealId)}
                          className={cn(
                            "p-3 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-1.5 cursor-pointer relative",
                            isSelected 
                              ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm" 
                              : "bg-muted border-stone/15 text-stone"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-crisp-carrot text-white rounded-full p-0.5">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                          <Icon className={cn("w-4 h-4", isSelected ? "text-crisp-carrot" : "text-stone")} />
                          <span className="text-[11px] font-bold block leading-none">{m.label()}</span>
                          <span className="text-[9px] text-stone leading-none font-light">{m.time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Counter */}
                <div className="bg-muted border border-stone/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label htmlFor="guests-input" className="text-sm font-bold text-deep-forest">
                        {tText('Quantity', 'Kuantiti')}
                      </Label>
                      <span className="text-[10px] text-stone font-light block leading-none mt-1">
                        {tText('Minimum order: 1 pax.', 'Minima tempahan katering: 1 orang.')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3" role="group" aria-label={tText('Quantity', 'Kuantiti')}>
                      <button
                        type="button"
                        aria-label={tText('Decrease quantity', 'Kurangkan kuantiti')}
                        onClick={() => adjustGuests(-1)}
                        className="w-10 h-10 rounded-xl bg-card border border-stone/15 flex items-center justify-center font-bold text-lg hover:border-crisp-carrot hover:text-crisp-carrot cursor-pointer transition-colors shadow-sm select-none"
                      >
                        –
                      </button>
                      <input
                        id="guests-input"
                        type="number"
                        min="1"
                        max="5000"
                        inputMode="numeric"
                        value={orderState.guests || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setOrderState(prev => ({
                            ...prev,
                            guests: isNaN(val) ? 0 : val
                          }));
                        }}
                        onBlur={() => {
                          setOrderState(prev => ({
                            ...prev,
                            guests: prev.guests < 1 ? 1 : prev.guests
                          }));
                        }}
                        aria-label={tText('Number of guests', 'Bilangan tetamu')}
                        className="text-xl font-bold text-deep-forest w-20 text-center bg-card border border-stone/15 rounded-xl h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-crisp-carrot"
                      />
                      <button
                        type="button"
                        aria-label={tText('Increase quantity', 'Tambah kuantiti')}
                        onClick={() => adjustGuests(1)}
                        className="w-10 h-10 rounded-xl bg-card border border-stone/15 flex items-center justify-center font-bold text-lg hover:border-crisp-carrot hover:text-crisp-carrot cursor-pointer transition-colors shadow-sm select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <Button
                  onClick={() => handleStepNext(1)}
                  className="w-full bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm tracking-wide shadow-crisp"
                >
                  {tText('Next: Choose Menu', 'Seterusnya: Pilih Menu')}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </motion.div>
            )}

            {/* STEP 2: PILIH LAUK PAUK & CALCULATE PRICE */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-deep-forest font-display">
                    {tText('Select Menu Dishes', 'Pilih Hidangan Lauk-Pauk')}
                  </h2>
                  <p className="text-xs text-stone font-light mt-0.5">
                    {tText('Includes steam white rice, mineral cups and utensils automatically.', 'Nasi putih, air minuman cawan, dan set hidangan dimasukkan percuma.')}
                  </p>
                </div>

                {/* Main Dishes */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-stone/10 pb-1.5">
                    <Label className="text-xs font-black text-[#A8E10C] uppercase tracking-wider block">
                      {tText('Main Dishes', 'Lauk Utama')}
                    </Label>
                    <span className="text-[10px] font-bold text-crisp-carrot bg-crisp-carrot/10 px-2 py-0.5 rounded-full">
                      {orderState.dishes.length} / 8
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {LAUK_UTAMA.map(d => {
                      const isSelected = orderState.dishes.some(x => x.id === d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => handleToggleDish(d)}
                          className={cn(
                            "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all duration-200",
                            isSelected 
                              ? "bg-crisp-carrot/15 border-crisp-carrot shadow-sm" 
                              : "bg-muted border-stone/10 hover:bg-muted/80"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-crisp-carrot border-crisp-carrot text-white" : "border-stone/20 bg-card"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold block text-deep-forest truncate">
                              {tText(d.nameEn, d.nameBm)}
                            </span>
                            <span className="text-[10px] text-stone leading-tight block truncate font-light">
                              {tText(d.descEn, d.descBm)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vegetables */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-stone/10 pb-1.5">
                    <Label className="text-xs font-black text-[#A8E10C] uppercase tracking-wider block">
                      {tText('Vegetable Selection', 'Sayur-sayuran')}
                    </Label>
                    <span className="text-[10px] font-bold text-crisp-carrot bg-crisp-carrot/10 px-2 py-0.5 rounded-full">
                      {orderState.veggies.length} / 3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {SAYURAN.map(v => {
                      const isSelected = orderState.veggies.some(x => x.id === v.id);
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleToggleVeggie(v)}
                          className={cn(
                            "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all duration-200",
                            isSelected 
                              ? "bg-crisp-carrot/15 border-crisp-carrot shadow-sm" 
                              : "bg-muted border-stone/10 hover:bg-muted/80"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-crisp-carrot border-crisp-carrot text-white" : "border-stone/20 bg-card"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold block text-deep-forest truncate">
                              {tText(v.nameEn, v.nameBm)}
                            </span>
                            <span className="text-[10px] text-stone leading-tight block truncate font-light">
                              {tText(v.descEn, v.descBm)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Menu Request */}
                <div className="space-y-2 pt-2 border-t border-stone/10">
                  <Label className="text-xs font-black text-[#A8E10C] uppercase tracking-wider block">
                    {tText('Other / Custom Menu Request (Optional)', 'Permintaan Menu Lain / Khas (Pilihan)')}
                  </Label>
                  <p className="text-[11px] text-stone font-light leading-tight">
                    {tText(
                      'Feel free to specify any custom dishes, drinks, or requests. If you skip this menu step completely, the app will auto-setup to our default "Set Box Makanan & Minuman".',
                      'Sila nyatakan jika ada lauk, minuman atau permintaan khas. Jika anda melangkau bahagian menu ini, tempahan akan ditetapkan secara automatik kepada "Set Box Makanan & Minuman".'
                    )}
                  </p>
                  <Textarea
                    placeholder={tText(
                      'e.g. Nasi Minyak dengan Ayam Masak Merah, Air Sirap Bandung, vegetarian options...',
                      'cth. Nasi Minyak dengan Ayam Masak Merah, Air Sirap Bandung, menu vegetarian...'
                    )}
                    value={orderState.customMenu}
                    onChange={(e) => setOrderState(prev => ({ ...prev, customMenu: e.target.value }))}
                    className="w-full min-h-[90px] border-stone/20 rounded-2xl p-3 bg-card text-xs text-deep-forest focus:border-crisp-carrot focus:ring-1 focus:ring-crisp-carrot"
                  />
                </div>

                {/* REALTIME SELECTION SUMMARY PANEL */}
                <div className="bg-muted border border-[#A8E10C]/30 p-5 rounded-2xl space-y-2.5 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('Quantity:', 'Kuantiti:')}</span>
                    <span className="font-bold text-deep-forest">{orderState.guests} {tText('pax', 'orang')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('Dishes Selected:', 'Hidangan Dipilih')}</span>
                    <span className="font-bold text-deep-forest">
                      {orderState.dishes.length + orderState.veggies.length} {tText('dishes', 'lauk')}
                    </span>
                  </div>
                  <div className="border-t border-stone/10 pt-2.5 flex justify-between items-center">
                    <span className="text-sm font-bold text-deep-forest uppercase tracking-wider">
                      {tText('Pricing Status:', 'Status Harga:')}
                    </span>
                    <span className="text-xs font-bold text-[#A8E10C] bg-[#A8E10C]/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
                      {tText('To Be Quoted by Admin', 'Ditentukan oleh Admin')}
                    </span>
                  </div>
                </div>

                {/* Buttons Navigation */}
                <div className="flex gap-3">
                  <Button
                    onClick={async () => { await triggerLightImpact(); setCurrentStep(1); }}
                    variant="outline"
                    className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    {t('back')}
                  </Button>
                  <Button
                    onClick={() => handleStepNext(2)}
                    className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
                  >
                    {tText('Next: Details', 'Seterusnya: Butiran')}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: BUTIRAN TEMPAHAN */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-deep-forest font-display">
                    {tText('Enter Booking Details', 'Butiran Tempahan')}
                  </h2>
                  <p className="text-xs text-stone font-light mt-0.5">
                    {tText('Fill in event details, billing and delivery method.', 'Isi maklumat majlis, pembayar, dan kaedah penghantaran.')}
                  </p>
                </div>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* Conditionally Render Company/Department selection for Office event */}
                  {orderState.eventType === 'pejabat' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-stone uppercase tracking-wider">
                        {tText('Syarikat / Kementerian / Jabatan', 'Syarikat / Kementerian / Jabatan *')}
                      </Label>
                      {isProfileLoading ? (
                        <Skeleton className="h-11 w-full rounded-2xl" />
                      ) : (
                        <>
                          <Select
                            value={orderState.companyName}
                            onValueChange={(val) => setOrderState(prev => ({ ...prev, companyName: val }))}
                            required
                          >
                            <SelectTrigger className="w-full h-11 rounded-2xl border-stone/20 bg-muted focus:ring-crisp-carrot/20">
                              <SelectValue placeholder={`-- ${tText('Select Organization', 'Pilih Jabatan')} --`} />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-stone/10">
                              {SAVED_COMPANIES.map((company, idx) => (
                                <SelectItem key={idx} value={company} className="text-deep-forest focus:bg-crisp-carrot/10">
                                  {company}
                                </SelectItem>
                              ))}
                              <SelectItem value="other" className="text-crisp-carrot font-bold">
                                {tText('Other Organization / Syarikat Lain', 'Syarikat Lain (Taip Manual)')}
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {orderState.companyName === 'other' && (
                            <Input
                              value={orderState.customCompany}
                              onChange={(e) => setOrderState(prev => ({ ...prev, customCompany: e.target.value }))}
                              placeholder={tText('Type Company/Department Name', 'Taip nama syarikat atau kementerian')}
                              required
                              className="mt-2 h-11 rounded-2xl font-sans"
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Full Name', 'Nama Penuh *')}</Label>
                    <Input
                      value={orderState.name}
                      onChange={(e) => setOrderState(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={tText('e.g. Ahmad bin Abdullah', 'Contoh: Ahmad bin Abdullah')}
                      className="h-11 rounded-2xl font-sans"
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Contact Phone', 'Nombor Telefon *')}</Label>
                    <Input
                      type="tel"
                      value={orderState.contact}
                      onChange={(e) => setOrderState(prev => ({ ...prev, contact: e.target.value }))}
                      placeholder={tText('e.g. 012-345 6789', 'Contoh: 012-345 6789')}
                      className="h-11 rounded-2xl font-sans"
                    />
                  </div>

                  {/* Email & Confirm Email Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Email Address', 'Alamat E-mel *')}</Label>
                      <Input
                        type="email"
                        value={orderState.email}
                        onChange={(e) => setOrderState(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={tText('e.g. ahmad@gmail.com', 'Contoh: ahmad@gmail.com')}
                        className="h-11 rounded-2xl font-sans"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Confirm Email', 'Sahkan E-mel *')}</Label>
                      <Input
                        type="email"
                        value={orderState.confirmEmail}
                        onChange={(e) => setOrderState(prev => ({ ...prev, confirmEmail: e.target.value }))}
                        placeholder={tText('Re-type email address', 'Ulang alamat e-mel')}
                        className="h-11 rounded-2xl font-sans"
                      />
                    </div>
                  </div>

                  {/* Date & Time Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-date" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Event Date', 'Tarikh Majlis *')}</Label>
                      <input
                        id="event-date"
                        type="date"
                        value={orderState.date}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setOrderState(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full h-11 px-4 border border-stone/10 bg-card text-deep-forest rounded-2xl font-sans text-sm focus:outline-none focus:border-crisp-carrot focus:ring-2 focus:ring-crisp-carrot/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="event-time" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Serving Time', 'Masa Majlis *')}</Label>
                      <input
                        id="event-time"
                        type="time"
                        value={orderState.time}
                        onChange={(e) => setOrderState(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full h-11 px-4 border border-stone/10 bg-card text-deep-forest rounded-2xl font-sans text-sm focus:outline-none focus:border-crisp-carrot focus:ring-2 focus:ring-crisp-carrot/10"
                      />
                    </div>
                  </div>

                  {/* Geolocation Autocomplete Venue Location */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-stone uppercase tracking-wider">
                        {tText('Event Venue Address', 'Lokasi / Alamat Majlis *')}
                      </Label>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isDetectingLocation}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-crisp-carrot hover:text-crisp-carrot/80 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isDetectingLocation ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{tText('Detecting...', 'Mengesan...')}</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{tText('Autofill Location', 'Kesan Lokasi')}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {savedLocations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
                        <span className="text-[10px] text-stone font-bold uppercase tracking-wider block w-full">
                          {tText('Choose from Saved Locations:', 'Pilih dari Lokasi Disimpan:')}
                        </span>
                        {savedLocations.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => setOrderState(prev => ({ ...prev, location: loc.address }))}
                            className={cn(
                              "px-3 py-1.5 bg-cream/30 dark:bg-card border border-stone/10 hover:border-sunshine text-[11px] font-medium rounded-xl text-deep-forest  transition-all cursor-pointer",
                              orderState.location === loc.address && "border-sunshine bg-sunshine/5 ring-1 ring-sunshine"
                            )}
                          >
                            {loc.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <Textarea
                      value={orderState.location}
                      onChange={(e) => setOrderState(prev => ({ ...prev, location: e.target.value }))}
                      placeholder={tText('e.g. No 10, Jalan Presint 8, Putrajaya', 'Contoh: No 10, Jalan Presint 8, Putrajaya')}
                      className="rounded-2xl min-h-[70px] font-sans"
                    />
                  </div>

                  {/* Delivery vs Pickup Method Cards */}
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Delivery Method', 'Kaedah Penghantaran')}</Label>

                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tText('Delivery method', 'Kaedah Penghantaran')}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={orderState.delivery === 'delivery'}
                        onClick={() => setOrderState(prev => ({ ...prev, delivery: 'delivery' }))}
                        className={cn(
                          "p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-crisp-carrot/40",
                          orderState.delivery === 'delivery'
                            ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm"
                            : "bg-muted border-stone/15 text-stone"
                        )}
                      >
                        <Truck className="w-5 h-5 text-crisp-carrot" />
                        <span className="text-xs font-bold block">{tText('Delivery to Location', 'Hantar ke Lokasi')}</span>
                        <span className="text-[9px] text-stone leading-tight font-light">{tText('Delivered to your event address.', 'Dihantar terus ke tapak majlis.')}</span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={orderState.delivery === 'pickup'}
                        onClick={() => setOrderState(prev => ({ ...prev, delivery: 'pickup' }))}
                        className={cn(
                          "p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-crisp-carrot/40",
                          orderState.delivery === 'pickup'
                            ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm"
                            : "bg-muted border-stone/15 text-stone"
                        )}
                      >
                        <Store className="w-5 h-5 text-crisp-carrot" />
                        <span className="text-xs font-bold block">{tText('Pickup at Restaurant', 'Ambil di Restoran')}</span>
                        <span className="text-[9px] text-stone leading-tight font-light">{tText('Collect directly from Pak Usop.', 'Ambil sendiri di Restoran Wawasan.')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes input */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Additional Notes (Optional)', 'Nota Tambahan (pilihan)')}</Label>
                    <Textarea
                      value={orderState.notes}
                      onChange={(e) => setOrderState(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={tText('e.g. Vegetarian attendees, buffer tables needed, etc.', 'Contoh: Ada tetamu yang vegetarian, perlu meja buffet, dll.')}
                      className="rounded-2xl min-h-[70px] font-sans"
                    />
                  </div>

                </div>

                {/* Buttons Navigation */}
                <div className="flex gap-3">
                  <Button
                    onClick={async () => { await triggerLightImpact(); setCurrentStep(2); }}
                    variant="outline"
                    className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    {t('back')}
                  </Button>
                  <Button
                    onClick={() => handleStepNext(3)}
                    className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
                  >
                    {tText('Next: Review', 'Seterusnya: Semak')}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: REVIEW & CONFIRMATION */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-deep-forest font-display">
                    {tText('Review & Confirm Inquiry', 'Semak & Sahkan')}
                  </h2>
                  <p className="text-xs text-stone font-light mt-0.5">
                    {tText('Double check all information below before submitting.', 'Sila semak butiran tempahan anda sebelum menghantar.')}
                  </p>
                </div>

                {/* Info summary table cards */}
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* Event & Serve Summary */}
                  <div className="bg-muted border border-stone/10 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-[#A8E10C] uppercase tracking-wider block mb-1">
                      {tText('Event Summary', 'Maklumat Majlis')}
                    </span>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('Event Type', 'Jenis Majlis')}</span>
                      <span className="font-bold text-deep-forest">{orderState.eventType === 'pejabat' ? tText('Corporate Feast', 'Jamuan Pejabat') : tText('Private Event', 'Lain-lain')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('Catering Block', 'Hidangan Untuk')}</span>
                      <span className="font-bold text-deep-forest">
                        {getMealTypesLabel()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('Quantity', 'Kuantiti')}</span>
                      <span className="font-bold text-deep-forest">{orderState.guests} {tText('pax', 'orang')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('Date & Time', 'Tarikh & Masa')}</span>
                      <span className="font-bold text-deep-forest">{orderState.date} @ {orderState.time}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('Method', 'Kaedah')}</span>
                      <span className="font-bold text-deep-forest">{orderState.delivery === 'delivery' ? tText('Delivery to Location', 'Hantar ke Lokasi') : tText('Collect at Restaurant', 'Ambil di Restoran')}</span>
                    </div>
                  </div>

                  {/* Customer Billing Summary */}
                  <div className="bg-muted border border-stone/10 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-[#A8E10C] uppercase tracking-wider block mb-1">
                      {tText('Customer & Billing Info', 'Maklumat Pembayar')}
                    </span>
                    {orderState.eventType === 'pejabat' && (
                      <div className="flex justify-between items-start text-xs gap-4">
                        <span className="text-stone shrink-0">{tText('Organization', 'Syarikat/Jabatan')}</span>
                        <span className="font-bold text-deep-forest text-right">
                          {orderState.companyName === 'other' ? orderState.customCompany : orderState.companyName}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('PIC Name', 'Nama')}</span>
                      <span className="font-bold text-deep-forest">{orderState.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('PIC Phone', 'Telefon')}</span>
                      <span className="font-bold text-deep-forest">{orderState.contact}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone">{tText('PIC Email', 'E-mel')}</span>
                      <span className="font-bold text-deep-forest break-all text-right">{orderState.email}</span>
                    </div>
                    <div className="flex justify-between items-start text-xs gap-4">
                      <span className="text-stone shrink-0">{tText('Venue Location', 'Lokasi')}</span>
                      <span className="font-bold text-deep-forest text-right">{orderState.location}</span>
                    </div>
                  </div>

                    {/* Selected Menu Dishes Summary */}
                    <div className="bg-muted border border-stone/10 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-black text-[#A8E10C] uppercase tracking-wider block mb-1">
                        {tText('Selected Dishes Menu', 'Senarai Hidangan')}
                      </span>
                      <div className="text-xs text-deep-forest space-y-1 font-semibold">
                        {orderState.dishes.length > 0 && (
                          <>
                            <p className="text-stone text-[11px] uppercase">{tText('Main Lauk:', 'Lauk Utama:')}</p>
                            <div className="pl-2 flex flex-wrap gap-1">
                              {orderState.dishes.map(d => (
                                <span key={d.id} className="inline-block bg-card border border-stone/10 px-2 py-0.5 rounded text-[10px]">
                                  {tText(d.nameEn, d.nameBm)}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        {orderState.veggies.length > 0 && (
                          <>
                            <p className="text-stone text-[11px] uppercase pt-1">{tText('Vegetables:', 'Sayur-sayuran:')}</p>
                            <div className="pl-2 flex flex-wrap gap-1">
                              {orderState.veggies.map(v => (
                                <span key={v.id} className="inline-block bg-card border border-stone/10 px-2 py-0.5 rounded text-[10px]">
                                  {tText(v.nameEn, v.nameBm)}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        {orderState.customMenu && (
                          <>
                            <p className="text-stone text-[11px] uppercase pt-1">{tText('Custom Menu / Request:', 'Menu Khas / Permintaan:')}</p>
                            <p className="pl-2 text-[11px] font-normal text-deep-forest italic whitespace-pre-wrap bg-card p-2 rounded-lg border border-stone/5 mt-0.5">
                              "{orderState.customMenu}"
                            </p>
                          </>
                        )}

                        {orderState.dishes.length === 0 && orderState.veggies.length === 0 && !orderState.customMenu && (
                          <div className="bg-[#A8E10C]/10 border border-[#A8E10C]/30 p-2.5 rounded-lg text-center mt-2">
                            <p className="text-xs font-bold text-[#A8E10C]">
                              {tText('Set Box Makanan & Minuman (Default)', 'Set Box Makanan & Minuman (Lalai)')}
                            </p>
                            <p className="text-[10px] text-stone font-light mt-0.5 leading-tight">
                              {tText('You have skipped individual dish selection. Standard boxed meal set will be served.', 'Anda melangkau pilihan lauk. Set hidangan kotak standard akan disediakan.')}
                            </p>
                          </div>
                        )}
                      </div>

                    <div className="border-t border-stone/10 pt-2.5 mt-2 flex justify-between items-center">
                      <span className="text-xs font-bold text-deep-forest uppercase tracking-wider">
                        {tText('Catering Price:', 'Harga Katering:')}
                      </span>
                      <span className="text-xs font-bold text-[#A8E10C] bg-[#A8E10C]/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
                        {tText('Quotation Pending', 'Menunggu Sebut Harga')}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-stone leading-tight italic text-center px-4">
                    {tText(
                      '* Note: The restaurant admin will review your booking details and provide a finalized quote via WhatsApp or Email within 24 hours.',
                      '* Nota: Admin restoran akan menyemak butiran tempahan dan memberikan sebut harga muktamad melalui WhatsApp atau E-mel dalam masa 24 jam.'
                    )}
                  </p>

                </div>

                {/* Submitting Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={async () => { await triggerLightImpact(); setCurrentStep(3); }}
                    disabled={isSubmitting}
                    variant="outline"
                    className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    {t('back')}
                  </Button>
                  <Button
                    onClick={handleOrderSubmission}
                    disabled={isSubmitting}
                    className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        <span>{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        <span>{tText('Submit Order', 'Hantar Tempahan')}</span>
                        <Check className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: KEJAYAAN / SUCCESS */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center"
              >
                <div className="py-4">
                  <div className="w-16 h-16 rounded-full bg-[#A8E10C]/15 text-[#A8E10C] flex items-center justify-center mx-auto mb-4 scale-110 shadow-sm">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h2 className="text-xl font-bold text-deep-forest font-display">
                    {tText('Booking Request Sent!', 'Tempahan Dihantar!')}
                  </h2>
                  <p className="text-xs text-stone font-light max-w-sm mx-auto mt-1">
                    {tText(
                      'Thank you. Restoran Wawasan will review your booking details and contact you within 24 hours to confirm.',
                      'Terima kasih. Pihak Restoran Wawasan akan menyemak butiran dan menghubungi anda dalam masa 24 jam untuk pengesahan.'
                    )}
                  </p>
                </div>

                {/* Bill details receipt box */}
                <div className="bg-muted border border-stone/10 p-5 rounded-2xl text-left space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('Reference Number:', 'Nombor Rujukan')}</span>
                    <span className="font-bold text-[#A8E10C] text-sm tracking-wider select-all">{referenceNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('PIC Name:', 'Nama')}</span>
                    <span className="font-bold text-deep-forest">{orderState.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('PIC Contact:', 'Telefon')}</span>
                    <span className="font-bold text-deep-forest">{orderState.contact}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('Event Date:', 'Tarikh Majlis')}</span>
                    <span className="font-bold text-deep-forest">{orderState.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone">{tText('Meal serving:', 'Hidangan Untuk')}</span>
                    <span className="font-bold text-deep-forest">
                      {getMealTypesLabel()}
                    </span>
                  </div>
                  
                  <div className="border-t border-stone/10 pt-2.5 mt-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-deep-forest uppercase tracking-wider">
                      {tText('Catering Price:', 'Harga Katering:')}
                    </span>
                    <span className="text-xs font-bold text-[#A8E10C] bg-[#A8E10C]/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
                      {tText('Quotation Pending', 'Menunggu Sebut Harga')}
                    </span>
                  </div>
                </div>

                {/* Email Delivery relay receipt check */}
                <div className="p-4 bg-card rounded-2xl border border-stone/10 text-left space-y-2.5 shadow-sm" aria-live="polite">
                  <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">
                    {tText('INVOICE / RECEIPT STATUS', 'STATUS PENGHANTARAN INVOIS')}
                  </span>

                  <div className="space-y-1.5 text-xs text-stone">
                    <p className="flex items-center gap-1.5 text-deep-forest font-semibold">
                      <span className="text-[#A8E10C]">✓</span>
                      <span>{tText('Preliminary PDF generated', 'Invois PDF dihasilkan')}</span>
                    </p>
                    
                    {emailStatus === 'sending' && (
                      <p className="flex items-center gap-1.5 animate-pulse text-crisp-carrot">
                        <span className="text-crisp-carrot font-bold">●</span>
                        <span>{tText('Mailing PDF copy...', 'Sedang menghantar salinan emel...')}</span>
                      </p>
                    )}

                    {emailStatus === 'success' && (
                      <p className="flex items-center gap-1.5 text-deep-forest font-semibold">
                        <span className="text-[#A8E10C]">✓</span>
                        <span>{tText(`E-mailed copy successfully to ${orderState.email}`, `Salinan invois emel berjaya dihantar ke ${orderState.email}`)}</span>
                      </p>
                    )}

                    {emailStatus === 'failed' && (
                      <p className="flex items-center gap-1.5 text-rose-600 font-semibold">
                        <span className="text-rose-600 font-bold">×</span>
                        <span>{tText('SMTP delivery deferred. Admin will send copy manually.', 'Penghantaran emel tertangguh. Invois akan dihantar manual.')}</span>
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-stone italic">
                  {tText('Please save or share this reference number for future inquiries.', 'Sila simpan nombor rujukan ini untuk rujukan masa hadapan.')}
                </p>

                {/* Success Screen Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={handleResetForm}
                    className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
                  >
                    {tText('New Order Inquiry', 'Tempahan Baharu')}
                  </Button>
                  
                  <Button
                    onClick={handleShareReceipt}
                    variant="outline"
                    className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-deep-forest cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4 text-crisp-carrot" />
                    <span>{tText('Share Invoice / Receipt', 'Kongsi Resit')}</span>
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Bottom Navigation mimics Kimi bottom bar layout */}
        {currentStep <= 4 && (
          <div className="bg-card border-t border-stone/10 p-3 pb-6 flex justify-around items-center select-none">
            <button
              type="button"
              onClick={async () => { await triggerLightImpact(); setCurrentStep(1); }}
              className={cn(
                "flex flex-col items-center gap-0.5 cursor-pointer text-xs font-semibold px-4 py-1.5 rounded-xl transition-all",
                currentStep < 5 ? "text-crisp-carrot bg-crisp-carrot/15" : "text-stone"
              )}
            >
              <Utensils className="w-5 h-5 shrink-0" />
              <span>{tText('Booking', 'Tempahan')}</span>
            </button>

            <a
              href="tel:+60178582642"
              className="flex flex-col items-center gap-0.5 cursor-pointer text-xs font-semibold text-stone hover:text-crisp-carrot px-4 py-1.5 rounded-xl transition-all"
            >
              <Phone className="w-5 h-5 shrink-0" />
              <span>{tText('Call Now', 'Hubungi')}</span>
            </a>

            <button
              type="button"
              onClick={handleShareForm}
              className="flex flex-col items-center gap-0.5 cursor-pointer text-xs font-semibold text-stone hover:text-crisp-carrot px-4 py-1.5 rounded-xl transition-all"
            >
              <Share2 className="w-5 h-5 shrink-0 text-crisp-carrot" />
              <span>{tText('Share', 'Kongsi')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toast({
                  title: tText('Restoran Wawasan', 'Restoran Wawasan'),
                  description: tText('Putrajaya, Malaysia. Open Mon-Sat 7AM - 4PM.', 'Putrajaya, Malaysia. Buka Isnin-Sabtu 7AM - 4PM.'),
                  variant: 'success'
                });
              }}
              className="flex flex-col items-center gap-0.5 cursor-pointer text-xs font-semibold text-stone hover:text-crisp-carrot px-4 py-1.5 rounded-xl transition-all"
            >
              <Clock className="w-5 h-5 shrink-0" />
              <span>{tText('Information', 'Maklumat')}</span>
            </button>
          </div>
        )}

      </div>
    </>
  );
}
