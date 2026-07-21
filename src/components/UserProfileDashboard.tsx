import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { 
  User as UserIcon, 
  Phone, 
  Building, 
  Briefcase, 
  History, 
  FileDown, 
  RotateCcw, 
  X, 
  Loader2, 
  Edit3, 
  Check, 
  LogOut,
  Sliders,
  ChevronDown,
  Utensils,
  Trash2,
  Ban,
  Bell,
  Plus,
  MapPin
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { generateInvoicePDF, generateCombinedInvoicePDF, preloadLogoForPDF } from '@/services/pdfService';
import type { Order, CombinedInvoicePayload, UserProfile, SavedLocation } from '@/types';
import { SAVED_COMPANIES } from '@/constants/companies';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getAssetUrl } from '@/lib/utils';
import { getApiUrl } from '@/lib/api';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';

// Remove local interface UserProfile since we imported it from types

interface UserProfileDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onReorder: (orderData: Order) => void;
  isEmbedded?: boolean;
}

export default function UserProfileDashboard({ isOpen, onClose, onReorder, isEmbedded = false }: UserProfileDashboardProps) {
  const { language, t: tGlobal } = useLanguage();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      if (currentUser) {
        await Promise.all([
          fetchUserProfile(currentUser),
          fetchUserOrders(currentUser.uid)
        ]);
      }
    }
  });

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Combine Invoice State
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [, setIncludeNotes] = useState(true);

  // Edit fields state
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editTo, setEditTo] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editAttn, setEditAttn] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Notification settings state
  const [notifyOrderStatus, setNotifyOrderStatus] = useState(true);
  const [notifyBilledUpdates, setNotifyBilledUpdates] = useState(true);
  const [notifyCancelApproval, setNotifyCancelApproval] = useState(true);

  // Saved Locations state
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationLabel, setNewLocationLabel] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Translation helpers
  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const fetchUserProfile = async (user: User) => {
    setIsLoadingProfile(true);
    if (!db) {
      console.warn('Firestore db is undefined, skipping profile load.');
      setIsLoadingProfile(false);
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setProfile(data);
        setEditName(data.name || '');
        setEditContact(data.contact || '');
        setEditTo(data.to || '');
        if (data.to && SAVED_COMPANIES.includes(data.to)) {
          setSelectedCompany(data.to);
        } else if (data.to) {
          setSelectedCompany('other');
        } else {
          setSelectedCompany('');
        }
        setEditAttn(data.attn || '');
        
        // Load notification settings
        if (data.notificationSettings) {
          setNotifyOrderStatus(data.notificationSettings.orderStatus ?? true);
          setNotifyBilledUpdates(data.notificationSettings.billedUpdates ?? true);
          setNotifyCancelApproval(data.notificationSettings.cancelApproval ?? true);
        }

        // Load saved locations
        if (data.savedLocations) {
          setSavedLocations(data.savedLocations);
        } else {
          setSavedLocations([]);
        }
      } else {
        // If profile doesn't exist yet, construct from Google login or defaults
        const defaultProfile: UserProfile = {
          name: user.displayName || '',
          email: user.email || '',
          contact: user.phoneNumber || '',
          to: '',
          attn: '',
        };
        setProfile(defaultProfile);
        setEditName(defaultProfile.name);
        setEditContact(defaultProfile.contact);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchUserOrders = async (uid: string) => {
    if (!uid) return;
    setIsLoadingOrders(true);
    if (!db) {
      console.warn('Firestore db is undefined, skipping user orders load.');
      setIsLoadingOrders(false);
      return;
    }
    try {
      const ordersRef = collection(db, 'orders');
      // Read orders for this customer based on userId
      const q = query(
        ordersRef, 
        where('userId', '==', uid)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedOrders.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Order);
      });

      // Sort by createdAt descending manually since composite index might not exist in sandbox
      fetchedOrders.sort((a, b) => {
        const aTime = (a.createdAt as { seconds?: number })?.seconds ? (a.createdAt as { seconds?: number }).seconds! * 1000 : new Date(a.dateTime || 0).getTime();
        const bTime = (b.createdAt as { seconds?: number })?.seconds ? (b.createdAt as { seconds?: number }).seconds! * 1000 : new Date(b.dateTime || 0).getTime();
        return bTime - aTime;
      });

      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchUserProfile(user);
        fetchUserOrders(user.uid);
      } else {
        setProfile(null);
        setOrders([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const updatedProfile = {
        name: editName,
        contact: editContact,
        to: editTo,
        attn: editAttn,
        notificationSettings: {
          orderStatus: notifyOrderStatus,
          billedUpdates: notifyBilledUpdates,
          cancelApproval: notifyCancelApproval
        },
        updatedAt: new Date().toISOString()
      };

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, updatedProfile);
      
      setProfile((prev) => prev ? { ...prev, ...updatedProfile } : null);
      setIsEditing(false);
      
      toast({
        title: t('Profile Updated', 'Profil Dikemaskini'),
        description: t('Your profile details have been saved successfully.', 'Butiran profil anda telah berjaya disimpan.'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({
        title: t('Update Failed', 'Kemaskini Gagal'),
        description: t('Failed to update your profile.', 'Gagal mengemaskini profil anda.'),
        variant: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('wawasan_guest_allowed');
      sessionStorage.removeItem('wawasan_session_started');
      await auth.signOut();
      toast({
        title: t('Signed Out', 'Log Keluar Berjaya'),
        description: t('Successfully signed out of your account.', 'Berjaya log keluar daripada akaun anda.'),
        variant: 'success'
      });
      onClose();
    } catch (err) {
      console.error('Sign Out error:', err);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newLocationLabel.trim() || !newLocationAddress.trim()) return;

    try {
      const updatedLocations = [...savedLocations];
      if (editingLocationId) {
        // Edit mode
        const index = updatedLocations.findIndex(l => l.id === editingLocationId);
        if (index !== -1) {
          updatedLocations[index] = {
            id: editingLocationId,
            label: newLocationLabel.trim(),
            address: newLocationAddress.trim()
          };
        }
      } else {
        // Add mode
        updatedLocations.push({
          id: `loc-${Date.now()}`,
          label: newLocationLabel.trim(),
          address: newLocationAddress.trim()
        });
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        savedLocations: updatedLocations,
        updatedAt: new Date().toISOString()
      });

      setSavedLocations(updatedLocations);
      setProfile(prev => prev ? { ...prev, savedLocations: updatedLocations } : null);
      
      // Reset state
      setIsAddingLocation(false);
      setNewLocationLabel('');
      setNewLocationAddress('');
      setEditingLocationId(null);

      toast({
        title: tGlobal('location_saved_success'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Error saving location:', err);
      toast({
        title: t('Failed to save location', 'Gagal menyimpan lokasi'),
        variant: 'error'
      });
    }
  };

  const handleEditLocationClick = (loc: SavedLocation) => {
    setEditingLocationId(loc.id);
    setNewLocationLabel(loc.label);
    setNewLocationAddress(loc.address);
    setIsAddingLocation(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!currentUser) return;
    try {
      const updatedLocations = savedLocations.filter(l => l.id !== id);
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        savedLocations: updatedLocations,
        updatedAt: new Date().toISOString()
      });

      setSavedLocations(updatedLocations);
      setProfile(prev => prev ? { ...prev, savedLocations: updatedLocations } : null);

      toast({
        title: tGlobal('location_deleted_success'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Error deleting location:', err);
      toast({
        title: t('Failed to delete location', 'Gagal memadam lokasi'),
        variant: 'error'
      });
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    try {
      toast({
        title: t('Downloading PDF...', 'Memuat Turun PDF...'),
        description: t('Generating your official preliminary document.', 'Menjana dokumen awal rasmi anda.'),
        variant: 'info'
      });

      // Standardize date and initial values
      const pdfData = {
        ...order,
        date: order.date || format(new Date(order.dateTime), 'yyyy-MM-dd'),
      };

      const pdfDoc = generateInvoicePDF(pdfData, false, language);
      const fileName = `Invois_Wawasan_${order.id}.pdf`;

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = pdfDoc.output('datauristring').split(',')[1];
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          await Share.share({
            title: fileName,
            url: savedFile.uri,
          });
        } catch (shareErr) {
          console.error('Error sharing PDF on mobile:', shareErr);
        }
      } else {
        pdfDoc.save(fileName);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast({
        title: t('Download Failed', 'Muat Turun Gagal'),
        description: t('Could not generate PDF document.', 'Gagal menjana dokumen PDF.'),
        variant: 'error'
      });
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrders(next);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!currentUser) return;
    const confirmCancel = window.confirm(
      t(
        'Are you sure you want to request cancellation for this order?',
        'Adakah anda pasti ingin meminta pembatalan untuk tempahan ini?'
      )
    );
    if (!confirmCancel) return;

    setCancellingOrderId(orderId);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(getApiUrl('/api/orders/cancel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit cancellation request.');
      }

      toast({
        title: t('Cancellation Requested', 'Pembatalan Diminta'),
        description: t(
          'Your cancellation request has been submitted to the admin for review.',
          'Permintaan pembatalan anda telah dihantar kepada admin untuk disemak.'
        ),
        variant: 'success',
      });

      await fetchUserOrders(currentUser.uid);
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast({
        title: t('Cancellation Failed', 'Permintaan Batal Gagal'),
        description: err instanceof Error ? err.message : t('Failed to request cancellation.', 'Gagal meminta pembatalan.'),
        variant: 'error',
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!currentUser) return;
    const confirmDelete = window.confirm(
      t(
        'Are you sure you want to permanently delete this billed order from your history?',
        'Adakah anda pasti ingin memadamkan tempahan dibilkan ini secara kekal daripada sejarah anda?'
      )
    );
    if (!confirmDelete) return;

    setDeletingOrderId(orderId);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(getApiUrl('/api/orders/delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete order.');
      }

      toast({
        title: t('Order Deleted', 'Tempahan Dipadam'),
        description: t('The order has been removed from your history.', 'Tempahan telah dipadam daripada sejarah anda.'),
        variant: 'success',
      });

      await fetchUserOrders(currentUser.uid);
    } catch (err) {
      console.error('Error deleting order:', err);
      toast({
        title: t('Deletion Failed', 'Padam Gagal'),
        description: err instanceof Error ? err.message : t('Failed to delete order.', 'Gagal memadamkan tempahan.'),
        variant: 'error',
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleGenerateCombinedInvoice = async (withNotes: boolean) => {
    setShowCombineModal(false);
    try {
      toast({
        title: t('Generating PDF...', 'Menjana PDF...'),
        description: t('Creating consolidated invoice.', 'Sedang mencipta invois gabungan.'),
        variant: 'info'
      });

      await preloadLogoForPDF();
      
      const selectedOrderData = orders.filter(o => selectedOrders.has(o.id!));
      const payload: CombinedInvoicePayload = {
        orders: selectedOrderData,
        includeNotes: withNotes,
        lang: language
      };

      const pdfDoc = generateCombinedInvoicePDF(payload, true);
      const fileName = `Invois_Gabungan_Wawasan_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = pdfDoc.output('datauristring').split(',')[1];
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          await Share.share({
            title: fileName,
            url: savedFile.uri,
          });
        } catch (shareErr) {
          console.error('Error sharing PDF on mobile:', shareErr);
        }
      } else {
        pdfDoc.save(fileName);
      }
      
      setSelectedOrders(new Set());
      toast({
        title: t('Success', 'Berjaya'),
        description: t('Consolidated invoice generated.', 'Invois gabungan telah dijana.'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Failed to generate combined PDF:', err);
      toast({
        title: t('Error', 'Ralat'),
        description: t('Failed to generate combined invoice.', 'Gagal menjana invois gabungan.'),
        variant: 'error'
      });
    }
  };

  const getStatusColor = (status: string) => {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'billed':
        return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/25 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/20 font-semibold';
      case 'cancel_requested':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20 font-bold animate-pulse';
      case 'rejected':
      case 'ditolak':
        return 'bg-red-500/10 text-red-600 border border-red-500/25 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20';
      case 'cancelled':
      case 'dibatalkan':
        return 'bg-stone/15 text-stone border border-stone/20 dark:bg-stone/25 dark:text-stone/40';
      case 'pending':
      default:
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
  };

  const getStatusText = (status: string) => {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'approved':
        return t('Approved', 'Diluluskan');
      case 'billed':
        return t('Billed (Official)', 'Telah Dibilkan');
      case 'cancel_requested':
        return t('Cancellation Requested', 'Minta Batal');
      case 'rejected':
        return t('Rejected', 'Ditolak');
      case 'cancelled':
        return t('Cancelled', 'Dibatalkan');
      case 'pending':
      default:
        return t('Pending / Menunggu', 'Menunggu');
    }
  };

  const renderOrderDate = (dateVal: unknown) => {
    if (!dateVal) return '—';
    try {
      let d: Date | null = null;
      if (dateVal instanceof Date) {
        d = dateVal;
      } else if (dateVal && typeof dateVal === 'object' && 'toDate' in dateVal && typeof (dateVal as { toDate: () => unknown }).toDate === 'function') {
        const possibleDate = (dateVal as { toDate: () => unknown }).toDate();
        if (possibleDate instanceof Date) {
          d = possibleDate;
        }
      } else if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal && typeof (dateVal as { seconds: unknown }).seconds === 'number') {
        d = new Date((dateVal as { seconds: number }).seconds * 1000);
      } else {
        const parsed = new Date(dateVal as string | number);
        if (!isNaN(parsed.getTime())) {
          d = parsed;
        }
      }
      if (d && !isNaN(d.getTime())) {
        return format(d, 'dd/MM/yyyy');
      }
    } catch (err) {
      console.error("renderOrderDate error:", err);
    }
    return '—';
  };

  if (!isEmbedded && !isOpen) return null;

  const content = (
    <div className={cn(
      "relative w-full h-full bg-cream dark:bg-background flex flex-col z-10",
      !isEmbedded && "max-w-xl border-l border-border shadow-2xl"
    )}>
      {/* Pull to Refresh Indicator */}
      <motion.div 
        className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
        animate={{ 
          y: isRefreshing ? 20 : Math.min(pullDistance - 40, 20),
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          scale: pullDistance > 10 || isRefreshing ? 1 : 0.8
        }}
      >
        <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-sunshine/20 flex items-center gap-2">
          <RotateCcw className={`w-4 h-4 text-sunshine ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }} />
          {isRefreshing && <span className="text-[10px] font-black text-sunshine uppercase tracking-widest">Refreshing</span>}
        </div>
      </motion.div>

      {/* Header with Top Safe Area Padding and Geometric Pattern */}
      <div className="px-6 border-b border-border flex items-center justify-between pt-[var(--sat)] h-[calc(76px+var(--sat))] relative overflow-hidden bg-white dark:bg-card">
        <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-sunshine/10 border border-sunshine/20 flex items-center justify-center text-sunshine">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-deep-forest tracking-wide">
              {t('Member Portal', 'Portal Ahli')}
            </h2>
            <p className="text-[10px] text-stone uppercase tracking-widest font-bold">
              Restoran Wawasan
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="p-2 text-stone hover:text-tomato-burst hover:bg-tomato-burst/10 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Log Out', 'Log Keluar')}</p>
            </TooltipContent>
          </Tooltip>
          {!isEmbedded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="p-2 text-stone hover:text-deep-forest hover:bg-black/5 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Close', 'Tutup')}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Content Scrollable Area */}
      <motion.div 
        className="flex-1 overflow-y-auto p-6 space-y-8 font-sans pb-24"
        animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        
        {/* Dashboard Headers & Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-card border border-deep-forest/[0.03] dark:border-white/5 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-stone dark:text-stone/60 uppercase tracking-wider font-black mb-1.5">{t('Total', 'Jumlah')}</span>
            <span className="text-2xl font-display font-black text-deep-forest ">{orders.length}</span>
          </div>
          <div className="bg-white dark:bg-card border border-deep-forest/[0.03] dark:border-white/5 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-sunshine uppercase tracking-wider font-black mb-1.5">{t('Active', 'Aktif')}</span>
            <span className="text-2xl font-display font-black text-sunshine">
              {orders.filter(o => ['approved', 'pending'].includes(o.status || 'pending')).length}
            </span>
          </div>
          <div className="bg-white dark:bg-card border border-deep-forest/[0.03] dark:border-white/5 rounded-2xl p-5 flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-kiwi uppercase tracking-wider font-black mb-1.5">{t('Billed', 'Dibilkan')}</span>
            <span className="text-2xl font-display font-black text-deep-forest ">
              {orders.filter(o => ['billed'].includes(o.status || '')).length}
            </span>
          </div>
        </div>

        {/* FEATURED DISH (FOOD-FIRST UX) */}
        <div className="bg-white dark:bg-card border border-deep-forest/[0.03] dark:border-white/5 rounded-2xl p-5 flex gap-5 items-center shadow-premium relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Utensils className="w-12 h-12 rotate-12" />
          </div>
          <img src={getAssetUrl('assets/nasi-lemak.jpg')} alt="Nasi Lemak" className="w-20 h-20 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform duration-500" />
          <div className="relative z-10">
             <span className="text-[10px] font-black text-sunshine uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1">
               <div className="w-1.5 h-1.5 rounded-full bg-sunshine animate-pulse" />
               {t('Daily Special', 'Istimewa Hari Ini')}
             </span>
             <h4 className="font-display font-black text-deep-forest  text-lg leading-tight">Nasi Lemak Ayam Berempah</h4>
             <p className="text-xs text-stone dark:text-stone/70 mt-1 font-medium">{t('Perfect for your next catering event.', 'Pilihan tepat untuk katering anda.')}</p>
          </div>
        </div>

        {/* 1. PROFILE PROFILE MANAGEMENT */}
        <div className="bg-white dark:bg-card border border-deep-forest/[0.03] dark:border-white/5 rounded-2xl p-7 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1.5 bg-cream border border-border text-sunshine hover:text-crisp-carrot hover:border-sunshine/40 rounded-xl transition-all duration-200"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditing ? t('Cancel', 'Batal') : t('Edit Profile', 'Edit Profil')}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <h3 className="text-xs uppercase tracking-wider font-bold text-deep-forest mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sunshine" />
            {t('Billing Profile Details', 'Profil Pengebilan')}
          </h3>

          {isLoadingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  <Skeleton className="w-4 h-4 shrink-0 mt-0.5 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-2.5 w-1/3 rounded bg-black/5" />
                    <Skeleton className="h-4 w-2/3 rounded bg-black/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-sm text-deep-forest">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone uppercase font-bold">{t('Name', 'Nama')}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 px-4 bg-cream border border-border rounded-xl text-xs text-deep-forest focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone uppercase font-bold">{t('Contact', 'Telefon')}</label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full h-11 px-4 bg-cream border border-border rounded-xl text-xs text-deep-forest focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone uppercase font-bold">{t('Organization', 'Syarikat')}</label>
                  <div className="relative">
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCompany(val);
                        if (val === 'other') {
                          setEditTo('');
                        } else {
                          setEditTo(val);
                        }
                      }}
                      className="w-full h-11 pl-4 pr-10 bg-cream border border-border rounded-xl text-xs text-deep-forest focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none appearance-none"
                    >
                      <option value="" className="text-stone">-- {t('Select Company', 'Pilih Syarikat')} --</option>
                      {SAVED_COMPANIES.map((company, idx) => (
                        <option key={idx} value={company} className="text-deep-forest">
                          {company}
                        </option>
                      ))}
                      <option value="other" className="text-sunshine font-semibold">{t('Other (Specify)', 'Lain-lain (Nyatakan)')}</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone pointer-events-none" />
                  </div>
                  {selectedCompany === 'other' && (
                    <input
                      type="text"
                      value={editTo}
                      onChange={(e) => setEditTo(e.target.value)}
                      placeholder={t('e.g. PMO Putrajaya', 'cth. PMO Putrajaya')}
                      className="w-full h-11 px-4 mt-2 bg-cream border border-border rounded-xl text-xs text-deep-forest focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone uppercase font-bold">{t('Attention (Attn)', 'Untuk Perhatian')}</label>
                  <input
                    type="text"
                    value={editAttn}
                    onChange={(e) => setEditAttn(e.target.value)}
                    className="w-full h-11 px-4 bg-cream border border-border rounded-xl text-xs text-deep-forest focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="h-11 px-6 bg-sunshine text-white rounded-xl text-xs font-bold hover:bg-crisp-carrot transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t('Save Details', 'Simpan Butiran')}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs text-deep-forest">
              <div className="flex gap-3 items-start">
                <UserIcon className="w-4 h-4 text-sunshine shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] text-stone uppercase font-bold">{t('PIC Name', 'Nama PIC')}</span>
                  <span className="font-semibold text-deep-forest">{profile?.name || '—'}</span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <Phone className="w-4 h-4 text-sunshine shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] text-stone uppercase font-bold">{t('Phone Number', 'No. Telefon')}</span>
                  <span className="font-semibold text-deep-forest">{profile?.contact || '—'}</span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <Building className="w-4 h-4 text-sunshine shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] text-stone uppercase font-bold">{t('Company / Org', 'Organisasi / Syarikat')}</span>
                  <span className="font-semibold text-deep-forest">{profile?.to || '—'}</span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <Briefcase className="w-4 h-4 text-sunshine shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] text-stone uppercase font-bold">{t('Attention (Attn)', 'Untuk Perhatian (Attn)')}</span>
                  <span className="font-semibold text-deep-forest">{profile?.attn || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. NOTIFICATION SETTINGS */}
        <div className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-xs uppercase tracking-wider font-bold text-deep-forest mb-6 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sunshine" />
            {tGlobal('notification_settings')}
          </h3>

          <div className="space-y-6">
            {/* Order Status Updates */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-deep-forest block">
                  {tGlobal('order_status_updates')}
                </label>
                <span className="text-[10px] text-stone leading-none">
                  {tGlobal('order_status_desc')}
                </span>
              </div>
              <Switch 
                checked={notifyOrderStatus}
                onCheckedChange={(checked) => {
                  setNotifyOrderStatus(checked);
                }}
              />
            </div>

            {/* Billed Updates */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-deep-forest block">
                  {tGlobal('billed_updates')}
                </label>
                <span className="text-[10px] text-stone leading-none">
                  {tGlobal('billed_updates_desc')}
                </span>
              </div>
              <Switch 
                checked={notifyBilledUpdates}
                onCheckedChange={setNotifyBilledUpdates}
              />
            </div>

            {/* Cancel Approval Updates */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-deep-forest block">
                  {tGlobal('cancel_approval')}
                </label>
                <span className="text-[10px] text-stone leading-none">
                  {tGlobal('cancel_approval_desc')}
                </span>
              </div>
              <Switch 
                checked={notifyCancelApproval}
                onCheckedChange={setNotifyCancelApproval}
              />
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving}
                className="w-full h-10 bg-sunshine hover:bg-crisp-carrot text-white rounded-xl text-xs font-bold transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {tGlobal('update_notifications')}
              </Button>
            </div>
          </div>
        </div>

        {/* 2.5 SAVED LOCATIONS */}
        <div className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-bold text-deep-forest  flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sunshine" />
              {tGlobal('saved_locations')}
            </h3>
            {!isAddingLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingLocationId(null);
                  setNewLocationLabel('');
                  setNewLocationAddress('');
                  setIsAddingLocation(true);
                }}
                className="h-8 rounded-xl text-xs flex items-center gap-1.5 border-sunshine/30 hover:border-sunshine text-deep-forest  dark:hover:bg-cream/10"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('Add New', 'Tambah Baru')}
              </Button>
            )}
          </div>

          {isAddingLocation ? (
            <form onSubmit={handleAddLocation} className="space-y-4 border border-sunshine/15 bg-cream/35 dark:bg-cream/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                <span className="text-xs font-bold text-deep-forest ">
                  {editingLocationId ? tGlobal('edit_location') : tGlobal('add_location')}
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddingLocation(false);
                    setEditingLocationId(null);
                  }}
                  className="text-stone hover:text-crisp-carrot dark:text-stone/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone dark:text-stone/80 uppercase font-bold">{tGlobal('location_label')}</label>
                  <input
                    type="text"
                    value={newLocationLabel}
                    onChange={(e) => setNewLocationLabel(e.target.value)}
                    placeholder="e.g. Office HQ, Main Hall, Home"
                    className="w-full h-10 px-3 bg-cream dark:bg-background border border-border rounded-xl text-xs text-deep-forest  focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone dark:text-stone/80 uppercase font-bold">{tGlobal('location_address')}</label>
                  <textarea
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                    placeholder="Full delivery address for catering..."
                    className="w-full h-20 p-3 bg-cream dark:bg-background border border-border rounded-xl text-xs text-deep-forest  focus:border-sunshine focus:ring-1 focus:ring-sunshine outline-none resize-none"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    className="flex-1 h-9 bg-sunshine hover:bg-crisp-carrot text-white rounded-xl text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {t('Save Location', 'Simpan Lokasi')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingLocation(false);
                      setEditingLocationId(null);
                    }}
                    className="h-9 rounded-xl text-xs "
                  >
                    {t('Cancel', 'Batal')}
                  </Button>
                </div>
              </div>
            </form>
          ) : savedLocations.length === 0 ? (
            <div className="text-center py-6 bg-cream/10 border border-dashed border-border/85 rounded-2xl">
              <MapPin className="w-8 h-8 text-stone/40 mx-auto mb-2" />
              <p className="text-xs text-stone dark:text-stone/70 font-medium">
                {t('No saved locations yet.', 'Tiada lokasi disimpan lagi.')}
              </p>
              <p className="text-[10px] text-stone/60 dark:text-stone/50 mt-0.5">
                {t('Save common event venues for faster booking.', 'Simpan tempat acara biasa untuk tempahan lebih cepat.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savedLocations.map((loc) => (
                <div 
                  key={loc.id} 
                  className="group relative flex items-start gap-3 p-3.5 bg-cream/15 dark:bg-card/40 border border-border/60 rounded-2xl hover:border-sunshine/30 transition-all"
                >
                  <div className="w-8 h-8 bg-sunshine/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-sunshine" />
                  </div>
                  <div className="flex-1 min-w-0 pr-16 text-xs text-deep-forest ">
                    <span className="font-semibold block truncate text-sm">{loc.label}</span>
                    <span className="text-[11px] text-stone dark:text-stone/80 line-clamp-2 mt-0.5 leading-normal">{loc.address}</span>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleEditLocationClick(loc)}
                          className="p-1.5 hover:bg-cream dark:hover:bg-cream/10 border border-transparent hover:border-border rounded-lg text-sunshine hover:text-crisp-carrot transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('Edit', 'Edit')}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.id)}
                          className="p-1.5 hover:bg-cream dark:hover:bg-cream/10 border border-transparent hover:border-border rounded-lg text-stone hover:text-red-500 transition-all dark:text-stone/80"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('Delete', 'Padam')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2.6 HELP & SUPPORT FAQ */}
        <div className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-bold text-deep-forest  flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sunshine" />
            {tGlobal('help_support')}
          </h3>

          <div className="space-y-3.5">
            {[
              {
                q: t('What is the minimum order quantity (pax)?', 'Apakah kuantiti tempahan minimum (pax)?'),
                a: t('The minimum order quantity for catering is usually 50 pax per order.', 'Kuantiti tempahan minimum untuk katering biasanya adalah 50 pax setiap tempahan.')
              },
              {
                q: t('How many hours in advance should I order?', 'Berapa jam sebelum saya perlu membuat tempahan?'),
                a: t('Catering requests must be made at least 24-48 hours in advance for schedule approval.', 'Permintaan katering mesti dibuat sekurang-kurangnya 24-48 jam sebelum acara untuk kelulusan jadual.')
              },
              {
                q: t('How is pricing finalized?', 'Bagaimanakah harga dimuktamadkan?'),
                a: t('After you submit, our team will review details and provide a finalized quote with itemized prices via WhatsApp or Email.', 'Selepas anda menghantar, pasukan kami akan menyemak butiran dan menyediakan sebut harga muktamad dengan harga terperinci via WhatsApp atau Emel.')
              },
              {
                q: t('What is the cancellation policy?', 'Apakah polisi pembatalan tempahan?'),
                a: t('Cancellations can be requested from your bookings panel and must be approved by the admin.', 'Pembatalan boleh diminta dari panel rekod tempahan anda dan mesti diluluskan oleh admin.')
              }
            ].map((faq, i) => (
              <details key={i} className="group border-b border-border/55 last:border-0 pb-3.5 last:pb-0 text-xs">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-deep-forest  hover:text-sunshine transition-colors">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone dark:text-stone/50 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <p className="mt-2 text-stone dark:text-stone/85 leading-relaxed pl-1 pr-4">
                  {faq.a}
                </p>
              </details>
            ))}

            <div className="pt-2">
              <a 
                href="https://wa.me/60123456789" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full h-11 border border-sunshine/40 hover:bg-sunshine/5 hover:border-sunshine text-deep-forest  rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer bg-transparent decoration-transparent hover:no-underline"
              >
                <Utensils className="w-4 h-4 text-sunshine" />
                {tGlobal('contact_support_whatsapp')}
              </a>
            </div>
          </div>
        </div>

        {/* 3. ORDER HISTORY SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h3 className="text-xs uppercase tracking-wider font-bold text-deep-forest flex items-center gap-2">
              <History className="w-4 h-4 text-sunshine" />
              {t('Catering Order History', 'Sejarah Tempahan Katering')}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-cream/50 dark:bg-card border border-sunshine/10 rounded-lg">
                <Switch
                  id="user-select-mode"
                  checked={isSelectMode}
                  onCheckedChange={(checked) => {
                    setIsSelectMode(checked);
                    if (!checked) {
                      setSelectedOrders(new Set());
                    }
                  }}
                  className="scale-90"
                />
                <label htmlFor="user-select-mode" className="text-[10px] font-bold text-deep-forest/80 cursor-pointer select-none">
                  {t('Select Mode', 'Mod Pilih')}
                </label>
              </div>
              {isSelectMode && orders.length > 0 && !isLoadingOrders && (
                <button
                  onClick={() => {
                    const allSelected = orders.length > 0 && orders.every(o => o.id && selectedOrders.has(o.id));
                    if (allSelected) {
                      setSelectedOrders(new Set());
                    } else {
                      setSelectedOrders(new Set(orders.filter(o => o.id).map(o => o.id!)));
                    }
                  }}
                  className="text-[11px] font-black text-sunshine hover:text-crisp-carrot transition-colors cursor-pointer bg-transparent border-0"
                >
                  {orders.every(o => o.id && selectedOrders.has(o.id))
                    ? t('Deselect All', 'Nyahpilih Semua')
                    : t('Select All', 'Pilih Semua')}
                </button>
              )}
            </div>
          </div>

          {isLoadingOrders ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="bg-white dark:bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-1/4 rounded bg-black/5" />
                      <Skeleton className="h-4 w-3/4 rounded bg-black/5" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full bg-black/5" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-border pt-4">
                    <div className="space-y-1">
                      <Skeleton className="h-2.5 w-1/3 rounded bg-black/5" />
                      <Skeleton className="h-3.5 w-1/2 rounded bg-black/5" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-2.5 w-1/3 rounded bg-black/5" />
                      <Skeleton className="h-3.5 w-1/2 rounded bg-black/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white dark:bg-card border border-border rounded-3xl p-8 text-center shadow-sm">
              <p className="text-xs text-stone font-medium">
                {t('No past catering orders found.', 'Tiada rekod tempahan katering dijumpai.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, idx) => (
                <div 
                  key={order.id || `order-${idx}`}
                  className={cn(
                    "bg-white dark:bg-card border rounded-3xl p-5 transition-all duration-300 space-y-4 shadow-sm",
                    (isSelectMode && selectedOrders.has(order.id!)) ? 'border-sunshine ring-1 ring-sunshine' : 'border-border hover:border-sunshine/30'
                  )}
                >
                  {/* Top Row: Invoice + Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      {isSelectMode && (
                        <button
                          onClick={() => handleToggleSelect(order.id!)}
                          className={cn(
                            "mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                            selectedOrders.has(order.id!) 
                              ? 'bg-sunshine border-sunshine text-white' 
                              : 'border-stone/40 hover:border-sunshine'
                          )}
                        >
                          {selectedOrders.has(order.id!) && <Check className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <div>
                        <span className="text-[10px] text-sunshine font-mono font-bold tracking-wider block">
                          {order.invoiceNo || `RW-${order.id!.slice(0, 8).toUpperCase()}`}
                        </span>
                        <span className="font-display font-bold text-sm text-deep-forest block mt-0.5">
                          {order.menu || 'Set box katering'} ({order.quantity} Pax)
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                       <span className={cn("text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider", getStatusColor(order.status || 'menunggu'))}>
                         {getStatusText(order.status || 'menunggu')}
                       </span>
                       {order.totalAmount && (
                         <span className="text-xs font-bold text-deep-forest">
                           RM {Number(order.totalAmount).toFixed(2)}
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Info block */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] border-t border-border pt-4">
                    <div>
                      <span className="block text-[8px] text-stone uppercase font-bold">{t('Event Date', 'Tarikh Acara')}</span>
                      <span className="font-medium text-deep-forest">{renderOrderDate(order.date)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-stone uppercase font-bold">{t('Location', 'Lokasi')}</span>
                      <span className="font-medium text-deep-forest truncate block max-w-[150px]">{order.location || '—'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-border pt-4 flex-wrap">
                    {/* Download PDF */}
                    <button
                      onClick={() => setPreviewOrder(order)}
                      className="flex-1 min-w-[80px] h-10 bg-cream border border-border text-xs text-deep-forest hover:text-sunshine hover:border-sunshine/30 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold"
                    >
                      <FileDown className="w-4 h-4 text-stone" />
                      {t('Invoice PDF', 'Invois PDF')}
                    </button>

                    {/* One-click reorder */}
                    <button
                      onClick={() => {
                        onReorder(order);
                        onClose();
                      }}
                      className="flex-1 min-w-[80px] h-10 bg-sunshine/10 border border-sunshine/20 text-xs text-sunshine hover:bg-sunshine hover:text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 font-bold"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('Reorder', 'Tempah Semula')}
                    </button>

                    {/* Direct Delete of Billed Order */}
                    {['dibilkan', 'billed'].includes(order.status || '') && (
                      <button
                        onClick={() => handleDeleteOrder(order.id!)}
                        disabled={deletingOrderId === order.id}
                        className="flex-1 min-w-[80px] h-10 bg-tomato-burst/10 border border-tomato-burst/20 text-tomato-burst hover:bg-tomato-burst hover:text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 font-bold text-xs"
                        title={t('Delete Order', 'Hapus Tempahan')}
                      >
                        {deletingOrderId === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {t('Delete', 'Padam')}
                      </button>
                    )}

                    {/* Request Cancellation for Pending/Approved Orders */}
                    {(['pending', 'approved'].includes(order.status || '') || !order.status) && (
                      <button
                        onClick={() => handleCancelOrder(order.id!)}
                        disabled={cancellingOrderId === order.id}
                        className="flex-1 min-w-[80px] h-10 bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 font-bold text-xs"
                        title={t('Request Cancellation', 'Minta Batal')}
                      >
                        {cancellingOrderId === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                        {t('Cancel', 'Batal')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </motion.div>

      {/* FAB for Combine Invoice */}
      <AnimatePresence>
        {selectedOrders.size >= 2 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "absolute bottom-6 left-6 right-6 bg-sunshine border border-border/10 rounded-[2rem] p-4 shadow-2xl flex items-center justify-between z-50 overflow-hidden",
              isEmbedded && "bottom-4 left-4 right-4"
            )}
          >
            <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />
            <div className="text-sm font-bold text-white relative z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                <span className="text-white">{selectedOrders.size}</span>
              </div>
              {t('Orders Selected', 'Tempahan Dipilih')}
            </div>
            <button
              onClick={() => setShowCombineModal(true)}
              className="h-10 px-5 bg-white text-sunshine rounded-2xl text-xs font-bold hover:bg-cream transition-colors flex items-center gap-2 relative z-10 shadow-sm hover:-translate-y-0.5"
            >
              <FileDown className="w-4 h-4" />
              {t('Combine Invoice', 'Gabung Invois')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const combineModal = (
    <AnimatePresence>
      {showCombineModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCombineModal(false)}
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-sm bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-6"
          >
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-deep-forest">
                {t('Invoice Layout', 'Susun Atur Invois')}
              </h3>
              <p className="text-xs text-stone leading-relaxed">
                {t('Would you like to include the "Notes" section in this consolidated invoice?', 'Adakah anda ingin memasukkan bahagian "Nota" dalam invois gabungan ini?')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setIncludeNotes(true);
                  handleGenerateCombinedInvoice(true);
                }}
                className="w-full h-12 bg-sunshine text-white rounded-xl text-sm font-bold hover:bg-crisp-carrot transition-colors"
              >
                {t('Yes, include Notes', 'Ya, masukkan Nota')}
              </button>
              <button
                onClick={() => {
                  setIncludeNotes(false);
                  handleGenerateCombinedInvoice(false);
                }}
                className="w-full h-12 bg-cream border border-border text-deep-forest rounded-xl text-sm font-bold hover:bg-black/5 transition-colors"
              >
                {t('No, hide Notes', 'Tidak, sembunyikan Nota')}
              </button>
            </div>
            
            <button
              onClick={() => setShowCombineModal(false)}
              className="absolute top-4 right-4 p-2 text-stone hover:text-deep-forest hover:bg-black/5 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (isEmbedded) {
    return (
      <div className="w-full h-full relative">
        {content}
        {combineModal}
        {previewOrder && (
          <InvoicePreviewModal
            isOpen={!!previewOrder}
            onClose={() => setPreviewOrder(null)}
            order={previewOrder}
            onDownload={() => handleDownloadPDF(previewOrder)}
            language={language}
          />
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1500] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-xl h-full flex flex-col z-10 shadow-2xl"
          >
            {content}
          </motion.div>
        </div>
      )}
      {combineModal}
      {previewOrder && (
        <InvoicePreviewModal
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          order={previewOrder}
          onDownload={() => handleDownloadPDF(previewOrder)}
          language={language}
        />
      )}
    </AnimatePresence>
  );
}
