import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { 
  User as UserIcon, 
  History, 
  X, 
  LogOut,
  Sliders,
  MapPin,
  Bell,
  RotateCcw
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { generateInvoicePDF, generateCombinedInvoicePDF, preloadLogoForPDF } from '@/services/pdfService';
import type { Order, CombinedInvoicePayload, UserProfile, SavedLocation } from '@/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getApiUrl } from '@/lib/api';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';

import { ProfileInfoTab } from '@/components/profile/ProfileInfoTab';
import { ProfileLocationsTab } from '@/components/profile/ProfileLocationsTab';
import { ProfilePreferencesTab } from '@/components/profile/ProfilePreferencesTab';
import { ProfileOrdersTab } from '@/components/profile/ProfileOrdersTab';
import { DeliveryMap } from '@/components/delivery/DeliveryMap';

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

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'locations' | 'preferences'>('orders');

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [pokingOrderId, setPokingOrderId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editAttn, setEditAttn] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [notifyOrderStatus, setNotifyOrderStatus] = useState(true);
  const [notifyBilledUpdates, setNotifyBilledUpdates] = useState(true);
  const [notifyCancelApproval, setNotifyCancelApproval] = useState(true);

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [newLocationLabel, setNewLocationLabel] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [, setIncludeNotes] = useState(true);

  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'cancel' | 'delete'; orderId: string } | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const t = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const fetchUserProfile = async (user: User) => {
    setIsLoadingProfile(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setEditName(data.name || user.displayName || '');
        setEditContact(data.contact || user.phoneNumber || '');
        setEditTo(data.to || '');
        setEditAttn(data.attn || '');
        setSelectedCompany(data.to || '');
        setNotifyOrderStatus(data.notifyOrderStatus ?? true);
        setNotifyBilledUpdates(data.notifyBilledUpdates ?? true);
        setNotifyCancelApproval(data.notifyCancelApproval ?? true);
        setSavedLocations(data.savedLocations || []);
      } else {
        setEditName(user.displayName || '');
        setEditContact(user.phoneNumber || '');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchUserOrders = async (uid: string) => {
    setIsLoadingOrders(true);
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });

      fetchedOrders.sort((a, b) => {
        const dateA = (a.createdAt as any)?.seconds || 0;
        const dateB = (b.createdAt as any)?.seconds || 0;
        return dateB - dateA;
      });

      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await Promise.all([
          fetchUserProfile(user),
          fetchUserOrders(user.uid)
        ]);
      } else {
        setProfile(null);
        setOrders([]);
        setSavedLocations([]);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const updatedProfile: Partial<UserProfile> = {
        name: editName,
        contact: editContact,
        to: editTo,
        attn: editAttn,
        notifyOrderStatus,
        notifyBilledUpdates,
        notifyCancelApproval,
        updatedAt: new Date().toISOString()
      };
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, updatedProfile);
      setProfile((prev) => ({ ...(prev || {}), ...updatedProfile } as UserProfile));
      setIsEditingProfile(false);
      toast({
        title: t('Profile Updated', 'Profil Dikemas Kini'),
        description: t('Your profile details have been saved.', 'Butiran profil anda telah disimpan.'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Error saving profile:', err);
      toast({
        title: t('Update Failed', 'Gagal Dikemas Kini'),
        description: t('Could not update profile details.', 'Gagal mengemas kini profil.'),
        variant: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLocation = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser || !newLocationLabel.trim() || !newLocationAddress.trim()) return;

    let updatedList: SavedLocation[];
    if (editingLocationId) {
      updatedList = savedLocations.map(loc => 
        loc.id === editingLocationId 
          ? { ...loc, label: newLocationLabel.trim(), address: newLocationAddress.trim() }
          : loc
      );
    } else {
      const newLoc: SavedLocation = {
        id: `loc_${Date.now()}`,
        label: newLocationLabel.trim(),
        address: newLocationAddress.trim()
      };
      updatedList = [...savedLocations, newLoc];
    }

    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { savedLocations: updatedList });
      setSavedLocations(updatedList);
      setIsAddingLocation(false);
      setEditingLocationId(null);
      setNewLocationLabel('');
      setNewLocationAddress('');
      toast({
        title: editingLocationId ? t('Location Updated', 'Lokasi Dikemas Kini') : t('Location Added', 'Lokasi Ditambah'),
        description: t('Your saved delivery locations have been updated.', 'Senarai lokasi penghantaran anda telah dikemas kini.'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Error saving location:', err);
      toast({
        title: t('Save Failed', 'Gagal Disimpan'),
        description: t('Could not save location.', 'Gagal menyimpan lokasi.'),
        variant: 'error'
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!currentUser) return;
    const updatedList = savedLocations.filter(loc => loc.id !== id);
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, { savedLocations: updatedList });
      setSavedLocations(updatedList);
      toast({
        title: t('Location Removed', 'Lokasi Dipadam'),
        description: t('The location has been deleted.', 'Lokasi telah dipadamkan.'),
        variant: 'success'
      });
    } catch (err) {
      console.error('Error deleting location:', err);
    }
  };

  const handleEditLocationClick = (loc: SavedLocation) => {
    setEditingLocationId(loc.id);
    setNewLocationLabel(loc.label);
    setNewLocationAddress(loc.address);
    setIsAddingLocation(true);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      onClose();
      toast({
        title: t('Signed Out', 'Telah Log Keluar'),
        description: t('You have been signed out successfully.', 'Anda telah berjaya log keluar.'),
        variant: 'info'
      });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleRequestInvoiceEmail = async (order: Order) => {
    if (!order.id) return;
    setPokingOrderId(order.id);
    try {
      let idToken = '';
      if (currentUser) {
        try {
          idToken = await currentUser.getIdToken();
        } catch (err) {
          console.warn('Could not get idToken:', err);
        }
      }

      const response = await fetch(getApiUrl('/api/orders/poke'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ orderId: order.id })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to nudge admin');
      }

      toast({
        title: t('Admin Nudged!', 'Admin Telah Diberitahu!'),
        description: t('We notified restaurant management to send your official invoice email.', 'Pengurusan restoran telah diminta menghantar e-mel invois rasmi anda.'),
        variant: 'success'
      });

      if (currentUser) {
        await fetchUserOrders(currentUser.uid);
      }
    } catch (err) {
      console.error('Poke error:', err);
      toast({
        title: t('Request Failed', 'Permintaan Gagal'),
        description: t('Could not notify admin right now.', 'Gagal memberitahu admin.'),
        variant: 'error'
      });
    } finally {
      setPokingOrderId(null);
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    try {
      toast({
        title: t('Generating PDF...', 'Menjana PDF...'),
        description: t('Preparing invoice document.', 'Menyediakan dokumen invois.'),
        variant: 'info'
      });

      await preloadLogoForPDF();
      const pdfDoc = generateInvoicePDF(order, true, language);
      const fileName = `Invois_Wawasan_${order.invoiceNo || order.id || 'ORDER'}.pdf`;

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

  const handleToggleOrderSelect = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrders(next);
  };

  const handleSelectAllForCombine = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id!).filter(Boolean)));
    }
  };

  const executeCancelOrder = async (orderId: string) => {
    if (!currentUser) return;
    setConfirmDialog(null);
    setCancellingOrderId(orderId);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(getApiUrl('/api/orders/cancel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit cancellation request.');
      }

      toast({
        title: t('Cancellation Requested', 'Pembatalan Diminta'),
        description: t('Your cancellation request has been submitted to the admin for review.', 'Permintaan pembatalan anda telah dihantar kepada admin untuk disemak.'),
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

  const executeDeleteOrder = async (orderId: string) => {
    if (!currentUser) return;
    setConfirmDialog(null);
    setDeletingOrderId(orderId);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(getApiUrl('/api/orders/delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId }),
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

  if (!isEmbedded && !isOpen) return null;

  const content = (
    <div className={cn(
      "relative w-full bg-cream dark:bg-background flex flex-col z-10",
      isEmbedded ? "h-auto" : "h-full max-w-xl border-l border-border shadow-2xl"
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
        <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-[var(--color-sunshine-cta)]/20 flex items-center gap-2">
          <RotateCcw className={`w-4 h-4 text-[var(--color-sunshine-cta)] ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }} />
          {isRefreshing && <span className="microcopy-12-upper font-black text-[var(--color-sunshine-cta)] uppercase tracking-widest">Refreshing</span>}
        </div>
      </motion.div>

      {/* Header */}
      <div className="px-6 border-b border-border flex items-center justify-between pt-[var(--sat)] h-[calc(76px+var(--sat))] relative overflow-hidden bg-white dark:bg-card">
        <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-[var(--color-sunshine-cta)]/10 border border-[var(--color-sunshine-cta)]/20 flex items-center justify-center text-[var(--color-sunshine-cta)]">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-deep-forest tracking-wide">
              {t('Member Portal', 'Portal Ahli')}
            </h2>
            <p className="microcopy-12-upper text-stone uppercase tracking-widest font-bold">
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

      {/* Tab Navigation Segmented Bar */}
      <div className="px-4 pt-2 pb-1 bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-stone-100/90 dark:bg-stone-850/80 rounded-2xl border border-stone-200/70 dark:border-stone-800/70">
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] cursor-pointer select-none",
              activeTab === 'orders'
                ? "bg-white dark:bg-stone-800 text-primary shadow-sm scale-[1.01]"
                : "text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            )}
          >
            <History className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('Orders', 'Tempahan')}</span>
            {orders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono shrink-0 font-bold">
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] cursor-pointer select-none",
              activeTab === 'profile'
                ? "bg-white dark:bg-stone-800 text-primary shadow-sm scale-[1.01]"
                : "text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            )}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('Billing Profile', 'Profil Bil')}</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] cursor-pointer select-none",
              activeTab === 'locations'
                ? "bg-white dark:bg-stone-800 text-primary shadow-sm scale-[1.01]"
                : "text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            )}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('Locations', 'Lokasi')}</span>
            {savedLocations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone/15 text-stone-600 dark:text-stone-300 font-mono shrink-0 font-bold">
                {savedLocations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[42px] cursor-pointer select-none",
              activeTab === 'preferences'
                ? "bg-white dark:bg-stone-800 text-primary shadow-sm scale-[1.01]"
                : "text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            )}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('Preferences', 'Tetapan')}</span>
          </button>
        </div>
      </div>

      {/* Content Scrollable Area */}
      <motion.div 
        className={cn(
          "flex-1 p-6 md:p-8 space-y-6 font-sans",
          isEmbedded ? "overflow-y-visible" : "overflow-y-auto pb-24"
        )}
        animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        {activeTab === 'orders' && (
          <ProfileOrdersTab
            orders={orders}
            isLoadingOrders={isLoadingOrders}
            selectedOrders={selectedOrders}
            isSelectMode={isSelectMode}
            setIsSelectMode={setIsSelectMode}
            setShowCombineModal={setShowCombineModal}
            handleToggleOrderSelect={handleToggleOrderSelect}
            handleSelectAllForCombine={handleSelectAllForCombine}
            onReorder={onReorder}
            handleRequestInvoiceEmail={handleRequestInvoiceEmail}
            pokingOrderId={pokingOrderId}
            setPreviewOrder={setPreviewOrder}
            setConfirmDialog={setConfirmDialog}
            cancellingOrderId={cancellingOrderId}
            deletingOrderId={deletingOrderId}
            setTrackingOrder={setTrackingOrder}
            t={t}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileInfoTab
            profile={profile}
            isLoadingProfile={isLoadingProfile}
            isEditing={isEditingProfile}
            setIsEditing={setIsEditingProfile}
            editName={editName}
            setEditName={setEditName}
            editContact={editContact}
            setEditContact={setEditContact}
            editTo={editTo}
            setEditTo={setEditTo}
            editAttn={editAttn}
            setEditAttn={setEditAttn}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            handleSaveProfile={handleSaveProfile}
            isSaving={isSaving}
            t={t}
          />
        )}

        {activeTab === 'locations' && (
          <ProfileLocationsTab
            savedLocations={savedLocations}
            isAddingLocation={isAddingLocation}
            setIsAddingLocation={setIsAddingLocation}
            editingLocationId={editingLocationId}
            setEditingLocationId={setEditingLocationId}
            newLocationLabel={newLocationLabel}
            setNewLocationLabel={setNewLocationLabel}
            newLocationAddress={newLocationAddress}
            setNewLocationAddress={setNewLocationAddress}
            handleAddLocation={handleAddLocation}
            handleEditLocationClick={handleEditLocationClick}
            handleDeleteLocation={handleDeleteLocation}
            t={t}
            tGlobal={tGlobal}
          />
        )}

        {activeTab === 'preferences' && (
          <ProfilePreferencesTab
            notifyOrderStatus={notifyOrderStatus}
            setNotifyOrderStatus={setNotifyOrderStatus}
            notifyBilledUpdates={notifyBilledUpdates}
            setNotifyBilledUpdates={setNotifyBilledUpdates}
            notifyCancelApproval={notifyCancelApproval}
            setNotifyCancelApproval={setNotifyCancelApproval}
            handleSavePreferences={() => handleSaveProfile()}
            isSaving={isSaving}
            t={t}
          />
        )}
      </motion.div>
    </div>
  );

  const combineModal = (
    <AnimatePresence>
      {showCombineModal && (
        <div key="combine-modal" className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
            className="relative w-full max-w-sm bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-6"
          >
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-deep-forest dark:text-white">
                {t('Invoice Layout', 'Susun Atur Invois')}
              </h3>
              <p className="text-xs text-stone dark:text-stone/75 leading-relaxed">
                {t('Would you like to include the "Notes" section in this consolidated invoice?', 'Adakah anda ingin memasukkan bahagian "Nota" dalam invois gabungan ini?')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setIncludeNotes(true);
                  handleGenerateCombinedInvoice(true);
                }}
                className="w-full h-12 bg-[var(--color-sunshine-cta)] text-white rounded-xl text-sm font-bold hover:bg-crisp-carrot transition-colors"
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

  const confirmModal = (
    <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {confirmDialog?.type === 'cancel'
              ? t('Request Cancellation?', 'Minta Pembatalan?')
              : t('Delete Order?', 'Padam Tempahan?')}
          </DialogTitle>
          <DialogDescription>
            {confirmDialog?.type === 'cancel'
              ? t(
                  'Are you sure you want to request cancellation for this order?',
                  'Adakah anda pasti ingin meminta pembatalan untuk tempahan ini?'
                )
              : t(
                  'Are you sure you want to permanently delete this order from your history?',
                  'Adakah anda pasti ingin memadamkan tempahan ini secara kekal daripada sejarah anda?'
                )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmDialog(null)}
          >
            {t('Cancel', 'Batal')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirmDialog) return;
              if (confirmDialog.type === 'cancel') {
                executeCancelOrder(confirmDialog.orderId);
              } else {
                executeDeleteOrder(confirmDialog.orderId);
              }
            }}
          >
            {confirmDialog?.type === 'cancel'
              ? t('Request Cancellation', 'Minta Pembatalan')
              : t('Delete', 'Padam')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isEmbedded) {
    return (
      <div className="w-full h-full relative">
        {content}
        {combineModal}
        {confirmModal}
        {previewOrder && (
          <PDFPreviewModal
            isOpen={!!previewOrder}
            onClose={() => setPreviewOrder(null)}
            order={previewOrder}
            onDownload={() => handleDownloadPDF(previewOrder)}
            language={language}
          />
        )}
        {trackingOrder && (
          <DeliveryMap
            order={trackingOrder}
            onClose={() => setTrackingOrder(null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="sliding-panel" className="fixed inset-0 z-[1500] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            />
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
      </AnimatePresence>
      {combineModal}
      {confirmModal}
      {previewOrder && (
        <PDFPreviewModal
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          order={previewOrder}
          onDownload={() => handleDownloadPDF(previewOrder)}
          language={language}
        />
      )}
      {trackingOrder && (
        <DeliveryMap
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </>
  );
}
