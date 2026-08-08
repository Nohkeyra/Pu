import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  LogOut, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Loader2,
  FileDown,
  ArrowLeft,
  Send,
  Mail,
  MessageSquare,
  Activity,
  RefreshCw,
  Table,
  Sun,
  Moon,
  Bell,
  X
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { TransparentLogo } from '@/components/TransparentLogo';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { generateInvoicePDF, generateCombinedInvoicePDF, preloadLogoForPDF } from '@/services/pdfService';
import { generateConsolidatedInvoicePDF } from '@/services/consolidatedInvoiceService';
import { numberToWords } from '@/services/numberToWordsBM';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { removeSecureItem } from '@/lib/preferences';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { getApiUrl } from '@/lib/api';
import { getAssetUrl } from '@/lib/utils';
import { getDummyCombinedOrders, getDummyConsolidatedOrders } from '@/utils/testData';
import { measureDbLatency } from '@/utils/diagnostics';
import type { Order } from '@/types';
import { AdminOrdersTab } from './admin/AdminOrdersTab';
import { AdminDiagnosticsTab } from './admin/AdminDiagnosticsTab';
import { AdminTablesTab } from './admin/AdminTablesTab';
import AdminMenuTab from './admin/AdminMenuTab';
import { AdminUpdatesTab } from './admin/AdminUpdatesTab';
import InAppUpdateModal from '@/components/InAppUpdateModal';
import type { AppVersionConfig } from '@/services/updateService';
import { Utensils as UtensilsIcon, Radio } from 'lucide-react';

interface SerializedOrder extends Omit<Order, 'createdAt'> {
  createdAt: { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number } | null;
}

const MEAL_LABELS: Record<string, { en: string; bm: string }> = {
  breakfast: { en: 'Breakfast', bm: 'Sarapan' },
  lunch: { en: 'Lunch', bm: 'Makan Tengahari' },
  dinner: { en: 'Dinner', bm: 'Makan Malam' },
  tea_break: { en: 'Tea Break', bm: 'Minum Petang' },
  hi_tea: { en: 'Hi-Tea', bm: 'Minum Petang (Hi-Tea)' },
};

// Derives a display-safe invoice number: uses the real invoiceNo if set,
// otherwise falls back to a preliminary "RW<id prefix>" placeholder. Orders
// missing both invoiceNo and id (should not normally happen for an order
// already loaded into the admin panel) fall back to a literal placeholder
// instead of crashing on order.id.substring(...).
const getDisplayInvoiceNo = (order: Order): string => {
  if (order.invoiceNo) return order.invoiceNo;
  if (order.id) return `RW-${order.id.substring(0, 6).toUpperCase()}`;
  return 'RW-------';
};

export default function AdminPanel({ adminToken, onLogout }: { adminToken?: string; onLogout?: () => void | Promise<void> }) {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper: builds the Authorization header sent with every admin API call.
  // Replaces the old pattern of resending the raw admin password in the
  // request body — the server now validates this short-lived JWT instead.
  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [searchTerm] = useState('');
  // Table filters (Orders tab): status/client narrow down filteredOrders in
  // addition to the free-text searchTerm above. Both permanently sit at
  // 'all' (no-op) now — the UI to change them was removed from the Orders
  // tab as a duplicate of Tables View's own independent filter controls.
  // Kept as read-only state (not full useState) because filteredOrders'
  // memo below still reads them; AdminTablesTab.tsx has its own separate
  // statusFilter/clientFilter local state and is unaffected by this.
  const [statusFilter] = useState<string>('all');
  const [clientFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Consolidated Invoice (admin-only): lets the admin select orders across
  // multiple different clients and export one grouped-by-client PDF.
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [filterBySameEmail, setFilterBySameEmail] = useState(true);
  const [consolidatedInvoiceNo, setConsolidatedInvoiceNo] = useState('');
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [isGeneratingConsolidated, setIsGeneratingConsolidated] = useState(false);

  // PDF Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  // Send Invoice Dialog States
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sendOrder, setSendOrder] = useState<Order | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [calendarState, setCalendarState] = useState<{
    ok: boolean;
    error?: string;
    loading: boolean;
  }>({ ok: false, loading: true });

  const [activeTab, setActiveTab] = useState<'orders' | 'diagnostics' | 'tables' | 'menu' | 'updates'>('orders');
  const [previewUpdateConfig, setPreviewUpdateConfig] = useState<AppVersionConfig | null>(null);

  // Real-time synchronization and Firestore WebSocket monitoring status
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'offline' | 'syncing'>('connecting');

  useEffect(() => {
    // 1. Listen for background sync messages from the registered Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_SYNC_IN_PROGRESS') {
        setSyncStatus('syncing');
      } else if (event.data?.type === 'BACKGROUND_SYNC_COMPLETE') {
        if (event.data.status === 'success') {
          setSyncStatus('connected');
          toast({
            title: language === 'en' ? 'Background Sync Succeeded' : 'Penyelarasan Latar Belakang Berjaya',
            description: language === 'en' ? 'Orders have been synced with the cloud.' : 'Pesanan telah diselaraskan dengan awan.',
            variant: 'success',
          });
        } else {
          setSyncStatus('offline');
        }
      }
    };
    
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 2. Setup a real-time Firestore WebSocket monitoring listener on the orders collection.
    // If the snapshot metadata is from cache, the socket is offline/caching.
    // If metadata.fromCache is false, the real-time WebSocket connection is verified.
    const q = query(collection(db, 'orders'), limit(1));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const isOnline = !snapshot.metadata.fromCache;
      setSyncStatus(isOnline ? 'connected' : 'offline');
    }, (error) => {
      console.warn('Real-time connection monitoring error (possibly offline):', error);
      setSyncStatus('offline');
    });

    // 3. Keep in sync with standard navigator offline status
    const handleOnline = () => setSyncStatus('connecting');
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language, toast]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        fetchOrders(),
        fetchCalendarState()
      ]);
    }
  });

  // Diagnostics states
  const [diagFirebase, setDiagFirebase] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string; projectId?: string }>({ status: 'idle' });
  const [diagCalendar, setDiagCalendar] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string; calendarsReturned?: number }>({ status: 'idle' });
  const [diagEmail, setDiagEmail] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
  const [diagPdf, setDiagPdf] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
  const [diagNative, setDiagNative] = useState<{
    status: 'idle' | 'running' | 'pass' | 'fail';
    details?: {
      isNative: boolean;
      platform: string;
      hasFilesystem: boolean;
      hasShare: boolean;
      userAgent?: string;
      deviceInfo?: Record<string, unknown>;
      deviceId?: Record<string, unknown>;
      batteryInfo?: Record<string, unknown>;
      error?: string;
    };
  }>({ status: 'idle' });
  
  const [diagTests, setDiagTests] = useState<{ id: string; status: 'idle' | 'running' | 'pass' | 'fail'; name: string }[]>([
    { id: 'combined_invoice', name: 'Combined Invoice Service (Multi-Order)', status: 'idle' },
    { id: 'consolidated_invoice', name: 'Consolidated Invoice Service (Multi-Client)', status: 'idle' },
    { id: 'db_latency', name: 'Cloud Firestore Latency (Live Ping)', status: 'idle' },
    { id: 'auth_session', name: 'Admin Session Integrity', status: 'idle' }
  ]);
  
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const [erudaEnabled, setErudaEnabled] = useState(
    () => localStorage.getItem('wawasan_eruda_enabled') === 'true'
  );

  const toggleEruda = async () => {
    const nextState = !erudaEnabled;
    setErudaEnabled(nextState);
    localStorage.setItem('wawasan_eruda_enabled', nextState ? 'true' : 'false');
    
    const erudaWin = window as unknown as { eruda?: { destroy: () => void } };
    
    if (nextState) {
      toast({
        title: "Developer Toolkit Enabled",
        description: "Loading inspector console... Look for the gear icon in the bottom-right corner of your screen.",
      });
      try {
        const erudaModule = await import('eruda');
        if (!document.getElementById('eruda') && !erudaWin.eruda) {
          erudaModule.default.init();
        }
      } catch (err) {
        console.error('Failed to load Eruda dynamically:', err);
        toast({
          title: "Toolkit Load Failed",
          description: "Could not load eruda module.",
          variant: "error"
        });
      }
    } else {
      toast({
        title: "Developer Toolkit Disabled",
        description: "The inspector console has been deactivated. Refresh to fully unload.",
      });
      if (erudaWin.eruda) {
        try {
          erudaWin.eruda.destroy();
          erudaWin.eruda = undefined;
        } catch (e) {
          console.warn('Eruda destroy error:', e);
        }
      }
    }
  };

  const runFirebaseDiag = async () => {
    setDiagFirebase({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/firebase'), { headers: authHeaders() });
      const data = await response.json();
      if (response.ok) {
        setDiagFirebase({ 
          status: 'pass', 
          projectId: data.projectId,
          message: data.message || `Connected from ${Capacitor.isNativePlatform() ? 'Android APK' : 'Web Browser'}` 
        });
      } else {
        setDiagFirebase({ 
          status: 'fail', 
          message: data.message || data.error || 'Failed to authenticate/write to Firestore' 
        });
      }
    } catch (err: unknown) {
      setDiagFirebase({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
    }
  };

  const runCalendarDiag = async () => {
    setDiagCalendar({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/calendar'), { headers: authHeaders() });
      const data = await response.json();
      if (response.ok && data.status === 'healthy') {
        setDiagCalendar({ 
          status: 'pass', 
          calendarsReturned: data.calendarsReturned,
          message: data.message 
        });
      } else {
        setDiagCalendar({ 
          status: 'fail', 
          message: data.message || data.error || `Status: ${data.status || response.status}` 
        });
      }
    } catch (err: unknown) {
      setDiagCalendar({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
    }
  };

  const runNativeDiag = async () => {
    setDiagNative({ status: 'running' });
    try {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const hasFilesystem = typeof Filesystem !== 'undefined';
      const hasShare = typeof Share !== 'undefined';

      let deviceInfo: Record<string, unknown> | undefined;
      let deviceId: Record<string, unknown> | undefined;
      let batteryInfo: Record<string, unknown> | undefined;

      try {
        deviceInfo = (await Device.getInfo()) as unknown as Record<string, unknown>;
        deviceId = (await Device.getId()) as unknown as Record<string, unknown>;
      } catch (e) {
        console.warn('Device info or ID not available:', e);
      }

      try {
        batteryInfo = (await Device.getBatteryInfo()) as unknown as Record<string, unknown>;
      } catch (e) {
        console.warn('Battery info not available:', e);
      }
      
      setDiagNative({
        status: 'pass',
        details: {
          isNative,
          platform,
          hasFilesystem,
          hasShare,
          userAgent: navigator.userAgent,
          deviceInfo,
          deviceId,
          batteryInfo,
        }
      });
    } catch (err: unknown) {
      setDiagNative({
        status: 'fail',
        details: {
          isNative: false,
          platform: 'unknown',
          hasFilesystem: false,
          hasShare: false,
          error: err instanceof Error ? err.message : String(err),
        }
      });
    }
  };

  const runPdfDiag = async () => {
    setDiagPdf({ status: 'running' });
    try {
      const pdfData = {
        id: 'diag_' + Math.random().toString(36).substring(2, 8),
        to: 'Pejabat Pentadbiran Diagnostik',
        attn: 'Bahagian Teknologi Maklumat',
        name: 'Sistem Diagnostik Wawasan',
        contact: '03-88880000',
        email: 'diagnostic-test@wawasan.com',
        dateTime: new Date().toISOString(),
        location: 'Blok B, Kompleks Kerajaan, Putrajaya',
        quantity: 50,
        meals: ['breakfast', 'lunch'],
        menu: 'Nasi Lemak Ayam Goreng, Teh Tarik, Buah-buahan',
        notes: 'Ujian diagnostik in-memory PDF generator.',
        status: 'approved' as const,
        prices: { breakfast: 7.50, lunch: 12.50 },
        totalAmount: 1000.00,
        lang: 'bm' as const,
        invoiceNo: 'DIAG-2026-0001'
      };

      const pdfDoc = generateInvoicePDF(pdfData as unknown as Parameters<typeof generateInvoicePDF>[0], true, 'bm');
      const dataUri = pdfDoc.output('datauristring');
      if (dataUri && dataUri.startsWith('data:application/pdf')) {
        setDiagPdf({ status: 'pass', message: 'PDF generated successfully (Size: ' + Math.round(dataUri.length / 1024) + ' KB)' });
      } else {
        setDiagPdf({ status: 'fail', message: 'PDF output is invalid' });
      }
    } catch (err: unknown) {
      setDiagPdf({ status: 'fail', message: err instanceof Error ? err.message : 'PDF Generation threw an unexpected exception' });
    }
  };

  const runSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast({
        title: 'Error',
        description: 'Please enter a test recipient email address',
        variant: 'error'
      });
      return;
    }

    setIsSendingTestEmail(true);
    setDiagEmail({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/email'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          testEmail: testEmailAddress
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDiagEmail({ status: 'pass', message: `Test email sent! Message ID: ${data.messageId}` });
        toast({
          title: 'Email Sent',
          description: 'Diagnostics test email dispatched successfully',
          variant: 'success'
        });
      } else {
        const data = await response.json();
        setDiagEmail({ status: 'fail', message: data.error || 'SMTP failed' });
        toast({
          title: 'Email Failed',
          description: data.error || 'Failed to send test email',
          variant: 'error'
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setDiagEmail({ status: 'fail', message: errorMsg });
      toast({
        title: 'Network Error',
        description: errorMsg,
        variant: 'error'
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const runFeatureTest = async (testId: string) => {
    setDiagTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'running' } : t));
    
    // Simulate slight delay for "professional designer" feel
    await new Promise(r => setTimeout(r, 1200));

    try {
      if (testId === 'combined_invoice') {
        const dummyOrders = getDummyCombinedOrders();

        await preloadLogoForPDF();
        const doc = generateCombinedInvoicePDF({
          orders: dummyOrders,
          includeNotes: true,
          lang: 'bm'
        });

        const dataUri = doc.output('datauristring');
        setPreviewPdfUrl(dataUri);
        setPreviewFileName(`TEST_COMBINED_INVOICE_${format(new Date(), 'yyyyMMdd')}.pdf`);
        setIsPreviewOpen(true);
      } else if (testId === 'consolidated_invoice') {
        const dummyOrders = getDummyConsolidatedOrders();

        await preloadLogoForPDF();
        const doc = generateConsolidatedInvoicePDF({
          orders: dummyOrders,
          includeNotes: false,
          lang: 'en'
        });

        const dataUri = doc.output('datauristring');
        setPreviewPdfUrl(dataUri);
        setPreviewFileName(`TEST_CONSOLIDATED_INVOICE_${format(new Date(), 'yyyyMMdd')}.pdf`);
        setIsPreviewOpen(true);
      } else if (testId === 'db_latency') {
        const latency = await measureDbLatency();
        const ok = latency > 0;
        if (!ok) throw new Error('Database ping failed');
      } else if (testId === 'auth_session') {
        if (!adminToken) throw new Error('Token missing');
        setDiagTests(prev => prev.map(t => t.id === 'auth_session' ? { ...t, status: 'pass' } : t));
        toast({ title: 'Auth Verified', description: 'Your current session token is valid and active.' });
        return;
      }
      
      setDiagTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'pass' } : t));
    } catch (err) {
      console.error('Test failed:', err);
      setDiagTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'fail' } : t));
      toast({ 
        title: 'Feature Test Failed', 
        description: err instanceof Error ? err.message : 'Unknown error during PDF generation', 
        variant: 'error' 
      });
    }
  };

  const runAllDiagnostics = () => {
    runFirebaseDiag();
    runCalendarDiag();
    runNativeDiag();
    runPdfDiag();
  };

  const fetchCalendarState = async () => {
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/calendar'), { headers: authHeaders() });
      if (response.ok) {
        const data = await response.json();
        setCalendarState({
          ok: data.ok,
          error: data.message,
          loading: false
        });
      } else {
        const data = await response.json();
        setCalendarState({
          ok: false,
          error: data.message || data.error || 'Failed to authenticate',
          loading: false
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to server';
      setCalendarState({
        ok: false,
        error: errorMsg,
        loading: false
      });
    }
  };

  const getCalendarEnableUrl = () => {
    if (!calendarState.error) return 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=restoran-wawasan';
    const match = calendarState.error.match(/(https:\/\/console\S+)/);
    return match ? match[1] : 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=restoran-wawasan';
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'fetch'
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const formattedOrders = result.orders.map((order: SerializedOrder) => {
            let createdAtObj = order.createdAt;
            if (order.createdAt) {
              const sec = typeof order.createdAt.seconds === 'number'
                ? order.createdAt.seconds
                : (typeof order.createdAt._seconds === 'number' ? order.createdAt._seconds : null);
              const nanosec = typeof order.createdAt.nanoseconds === 'number'
                ? order.createdAt.nanoseconds
                : (typeof order.createdAt._nanoseconds === 'number' ? order.createdAt._nanoseconds : 0);
              
              if (sec !== null) {
                createdAtObj = {
                  seconds: sec,
                  nanoseconds: nanosec,
                };
              }
            }
            return {
              ...order,
              createdAt: createdAtObj,
            };
          });
          setOrders(formattedOrders);
        }
      } else if (response.status === 401) {
        // Session token expired or invalid — force re-login rather than
        // leaving the admin looking at a panel where every action silently fails.
        console.warn('Admin session expired or invalid, logging out.');
        onLogout?.();
      } else {
        console.error('Failed to fetch orders from admin endpoint');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on load
  useEffect(() => {
    fetchOrders();
    fetchCalendarState();
    
    const interval = setInterval(fetchOrders, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const handleApprove = async (orderId: string) => {
    setIsApproving(true);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Calculate total from prices
      const mealPrices: Record<string, number> = {};
      let total = 0;
      
      order.meals.forEach(meal => {
        const price = parseFloat(prices[meal] || '0');
        const roundedPrice = Math.round(price * 100) / 100;
        mealPrices[meal] = roundedPrice;
        total += roundedPrice * order.quantity;
      });

      total = Math.round(total * 100) / 100;

      const invoiceNo = order.invoiceNo || `RW-${orderId.substring(0, 6).toUpperCase()}`;

      const newStatus = order.status === 'billed' ? 'billed' : 'approved';

      // Update meal prices, total, and invoiceNo on the order document via secure admin endpoint
      const updateResponse = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data: {
            prices: mealPrices,
            totalAmount: total,
            invoiceNo,
            status: newStatus,
            approvedAt: order.approvedAt || new Date().toISOString(),
          }
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update order details on server');
      }

      // Generate and download PDF
      const pdfData = {
        ...order,
        prices: mealPrices,
        totalAmount: total,
        invoiceNo,
      };
      
      const pdfDoc = generateInvoicePDF(pdfData, true, order.lang);
      const fileName = `Invoice_${invoiceNo}.pdf`;
      
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

      setPrices({});
      setSelectedOrder(null);
      setIsDetailOpen(false);
      // Refresh the orders list to show updated status/invoice immediately
      fetchOrders();
      
      toast({
        title: t('success'),
        description: t('order_approved'),
        variant: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: t('error'),
        description: t('error_approving'),
        variant: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm(t('delete_order_confirm'))) return;
    
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'delete',
          orderId
        })
      });
      if (response.ok) {
        toast({
          title: t('success'),
          description: t('order_deleted'),
          variant: 'success'
        });
        fetchOrders();
      } else {
        throw new Error('Failed to delete order via Admin API');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: t('error'),
        description: 'Failed to delete order.',
        variant: 'error'
      });
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt(t('rejection_reason_prompt') || 'Please enter the reason for rejection:');
    if (reason === null) return;

    setIsApproving(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data: {
            status: 'rejected',
            rejectionReason: reason || 'Order rejected by admin',
            rejectedAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        toast({
          title: t('success') || 'Success',
          description: t('rejected') || 'Order rejected',
          variant: 'success'
        });
        setIsDetailOpen(false);
        fetchOrders();
      } else {
        throw new Error('Failed to reject order');
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast({
        title: t('error') || 'Error',
        description: 'Failed to reject order.',
        variant: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancelOrderAdmin = async (orderId: string) => {
    const confirmCancel = confirm(t('confirm_cancel_order') || 'Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    setIsApproving(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data: {
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        toast({
          title: t('success') || 'Success',
          description: t('cancelled') || 'Order cancelled',
          variant: 'success'
        });
        setIsDetailOpen(false);
        fetchOrders();
      } else {
        throw new Error('Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: t('error') || 'Error',
        description: 'Failed to cancel order.',
        variant: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectCancellation = async (orderId: string) => {
    const confirmReject = confirm("Are you sure you want to REJECT this cancellation request? This will restore the order status to Approved.");
    if (!confirmReject) return;

    setIsApproving(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data: {
            status: 'approved',
            rejectedCancellationAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        toast({
          title: t('success') || 'Success',
          description: 'Cancellation request rejected. Order status restored to Approved.',
          variant: 'success'
        });
        setIsDetailOpen(false);
        fetchOrders();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast({
        title: t('error') || 'Error',
        description: 'Failed to reject cancellation request.',
        variant: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handlePreviewPDF = async (order: Order, isFinal: boolean) => {
    try {
      if (!order.id) {
        throw new Error('This order is missing its database ID and cannot be previewed.');
      }

      let pdfData = order;
      let invoiceNo = order.invoiceNo;
      
      if (!isFinal) {
        invoiceNo = `RW-${order.id.substring(0, 6).toUpperCase()}-PRE`;
        pdfData = { ...order, invoiceNo };
      }

      const pdfDoc = generateInvoicePDF(pdfData, isFinal, order.lang);
      const fileName = `${isFinal ? 'Invoice' : 'Preliminary'}_${invoiceNo}.pdf`;

      const pdfDataUri = pdfDoc.output('datauristring');
      setPreviewPdfUrl(pdfDataUri);
      setPreviewFileName(fileName);
      setIsPreviewOpen(true);

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = pdfDataUri.split(',')[1];
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
        } catch (err) {
          console.warn('Could not pre-cache PDF on native platform:', err);
        }
      }
    } catch (error: unknown) {
      console.error('Error in preview:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: t('error'),
        description: 'Preview Error: ' + errorMessage,
        variant: 'error'
      });
    }
  };

  const handleDownloadPDF = (order: Order, isFinal: boolean) => {
    if (!order.id) {
      toast({
        title: t('error'),
        description: 'This order is missing its database ID and cannot be downloaded.',
        variant: 'error'
      });
      return;
    }
    const orderId = order.id;

    setGeneratingInvoice(orderId);
    
    setTimeout(async () => {
      try {
        let pdfData = order;
        let invoiceNo = order.invoiceNo;
        
        if (!isFinal) {
          invoiceNo = `RW-${orderId.substring(0, 6).toUpperCase()}-PRE`;
          pdfData = { ...order, invoiceNo };
        }

        const pdfDoc = generateInvoicePDF(pdfData, isFinal, order.lang);
        const fileName = `${isFinal ? 'Invoice' : 'Preliminary'}_${invoiceNo}.pdf`;

        if (Capacitor.isNativePlatform()) {
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
        } else {
          pdfDoc.save(fileName);
        }
      } catch (error: unknown) {
        console.error('Error in download:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.toLowerCase().includes('cancel') && !errorMessage.toLowerCase().includes('dismiss')) {
          toast({
            title: t('error'),
            description: 'Download Error: ' + errorMessage,
            variant: 'error'
          });
        }
      } finally {
        setGeneratingInvoice(null);
      }
    }, 50);
  };

  const prepareConsolidateModal = async () => {
    try {
      const res = await fetch(getApiUrl('/api/admin/next-invoice-number'), { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.nextInvoiceNo) {
          setConsolidatedInvoiceNo(data.nextInvoiceNo);
        } else {
          setConsolidatedInvoiceNo(`RW-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      } else {
        setConsolidatedInvoiceNo(`RW-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch {
      setConsolidatedInvoiceNo(`RW-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setShowConsolidateModal(true);
  };

  const handleToggleOrderSelect = (id?: string) => {
    if (!id) return;
    const targetOrder = orders.find(o => o.id === id);
    if (!targetOrder) return;

    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }

      if (next.size > 0) {
        const firstSelectedId = Array.from(next)[0];
        const firstSelectedOrder = orders.find(o => o.id === firstSelectedId);
        if (firstSelectedOrder) {
          // Client check strictly based on 'to' field matching consolidatedInvoiceService
          const firstClient = (firstSelectedOrder.to || '-').trim();
          const targetClient = (targetOrder.to || '-').trim();
          if (firstClient !== targetClient) {
            toast({
              title: t('error') || 'Error',
              description: language === 'bm'
                ? `Tidak boleh pilih klien berbeza. Invois konsolidasi hanya untuk satu syarikat (${firstSelectedOrder.to || '-'}) sahaja.`
                : `Cannot select a different client. Consolidated invoices are limited to a single company (${firstSelectedOrder.to || '-'}) at a time.`,
              variant: 'error'
            });
            return prev;
          }
        }
      }

      next.add(id);
      return next;
    });
  };

  const handleGenerateConsolidatedInvoice = async (withNotes: boolean, customInvoiceNo?: string) => {
    setShowConsolidateModal(false);

    const selectedOrderData = orders.filter(o => o.id && selectedOrderIds.has(o.id));
    if (selectedOrderData.length === 0) {
      return;
    }

    // Check if selected orders have different clients based strictly on 'to' field.
    // Matching consolidatedInvoiceService.ts enforcement.
    const distinctClients = new Set(selectedOrderData.map(o => (o.to || '-').trim()));
    if (distinctClients.size > 1) {
      const clientList = Array.from(distinctClients).join(', ');
      toast({
        title: language === 'bm' ? 'Klien Berbeza Dikesan' : 'Different Clients Detected',
        description: language === 'bm'
          ? `Invois konsolidasi hanya dibenarkan untuk SATU klien/syarikat sahaja. Pesanan yang dipilih merangkumi ${distinctClients.size} klien berbeza (${clientList}). Sila pilih pesanan daripada satu klien sahaja.`
          : `Consolidated invoices are strictly limited to a SINGLE client/company. The selected orders span ${distinctClients.size} different clients (${clientList}). Please select orders from one client only.`,
        variant: 'error'
      });
      return;
    }

    // Different emails on the same client do NOT warn — proceed directly to PDF generation
    await runGenerateConsolidatedInvoice(withNotes, customInvoiceNo);
  };

  const runGenerateConsolidatedInvoice = async (withNotes: boolean, customInvoiceNo?: string) => {
    setIsGeneratingConsolidated(true);

    try {
      await preloadLogoForPDF();

      const selectedOrderData = orders.filter(o => o.id && selectedOrderIds.has(o.id));
      if (selectedOrderData.length === 0) {
        setIsGeneratingConsolidated(false);
        return;
      }

      const finalInvoiceNo = customInvoiceNo?.trim() || consolidatedInvoiceNo?.trim() || `RW-${Math.floor(1000 + Math.random() * 9000)}`;

      const pdfDoc = generateConsolidatedInvoicePDF(
        { orders: selectedOrderData, includeNotes: withNotes, invoiceNo: finalInvoiceNo, lang: language as 'bm' | 'en' },
        true
      );
      const fileName = `Invois_Konsolidasi_${finalInvoiceNo}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

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
          console.error('Error sharing consolidated invoice PDF on mobile:', shareErr);
        }
      } else {
        pdfDoc.save(fileName);
      }

      setSelectedOrderIds(new Set());
      toast({
        title: t('success') || 'Success',
        description: `Consolidated invoice ${finalInvoiceNo} generated.`,
        variant: 'success'
      });
    } catch (error: unknown) {
      console.error('Error generating consolidated invoice:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: t('error'),
        description: 'Consolidated Invoice Error: ' + errorMessage,
        variant: 'error'
      });
    } finally {
      setIsGeneratingConsolidated(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    if (order.status === 'approved' && order.prices) {
      const prices = order.prices;
      const priceStrings = Object.keys(prices).reduce((acc, key) => {
        acc[key] = prices[key].toString();
        return acc;
      }, {} as Record<string, string>);
      setPrices(priceStrings);
    } else {
      setPrices({});
    }
    setIsDetailOpen(true);
  };

  const openSendDialog = (order: Order) => {
    setSendOrder(order);
    setRecipientEmail(order.email || '');
    setRecipientPhone(order.contact || '');
    setIsSendDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!sendOrder) return;
    setSendingEmail(true);

    try {
      const invoiceNo = getDisplayInvoiceNo(sendOrder);
      
      // Generate the PDF
      const pdfDoc = generateInvoicePDF(sendOrder, sendOrder.status === 'approved', sendOrder.lang);
      const pdfBase64 = pdfDoc.output('datauristring');

      const response = await fetch(getApiUrl('/api/send-invoice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          orderId: sendOrder.id,
          email: recipientEmail,
          name: sendOrder.name,
          invoiceNo,
          pdfBase64,
          isFinal: true,
          lang: sendOrder.lang
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email. Please verify SMTP is configured.');
      }

      toast({
        title: t('invoice_emailed'),
        description: t('invoice_emailed_desc').replace('{email}', recipientEmail),
        variant: 'success',
        duration: 4000
      });
      setIsSendDialogOpen(false);
      fetchOrders();
    } catch (err: unknown) {
      console.error('Error sending invoice email:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: t('sending_failed'),
        description: errorMessage || t('sending_failed_desc'),
        variant: 'error'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '60' + clean.slice(1);
    } else if (!clean.startsWith('6')) {
      clean = '60' + clean;
    }
    return clean;
  };

  const handleSendWhatsApp = () => {
    if (!sendOrder) return;

    const invoiceNo = getDisplayInvoiceNo(sendOrder);
    const total = sendOrder.totalAmount || sendOrder.meals.reduce((sum, meal) => {
      const price = sendOrder.prices?.[meal] || 0;
      return sum + (price * sendOrder.quantity);
    }, 0);
    
    const eventDate = sendOrder.dateTime ? format(new Date(sendOrder.dateTime), 'PP') : '-';
    const formattedPhone = formatPhoneForWhatsApp(recipientPhone);

    const msgEn = `Hello *${sendOrder.name}*,\n\nThis is Restoran Wawasan. 🍽️\n\nHere is the invoice for your catering booking:\n- No. Invoice: *${invoiceNo}*\n- Event Date: *${eventDate}*\n- Quantity: *${sendOrder.quantity} pax*\n- Preferred Menu: *${sendOrder.menu || '-'}*\n- Total Amount: *RM ${total.toFixed(2)}*\n\nPlease check your email (${recipientEmail}) for the official PDF invoice attachment. If you have any questions, feel free to contact us.\n\nThank you for choosing Restoran Wawasan!`;
    
    const msgBm = `Salam *${sendOrder.name}*,\n\nIni daripada Restoran Wawasan. 🍽️\n\nBerikut adalah invois untuk tempahan katering anda:\n- No. Invois: *${invoiceNo}*\n- Tarikh Majlis: *${eventDate}*\n- Kuantiti: *${sendOrder.quantity} pax*\n- Menu Pilihan: *${sendOrder.menu || '-'}*\n- Jumlah Keseluruhan: *RM ${total.toFixed(2)}*\n\nSila semak emel anda (${recipientEmail}) untuk lampiran rasmi PDF invois. Jika ada sebarang pertanyaan, sila hubungi kami.\n\nTerima kasih kerana memilih Restoran Wawasan!`;

    const messageText = sendOrder.lang === 'bm' ? msgBm : msgEn;
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    
    if (Capacitor.isNativePlatform()) {
      window.location.assign(whatsappUrl);
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    toast({
      title: t('whatsapp_opened'),
      description: t('whatsapp_opened_desc'),
      variant: 'success',
      duration: 5000
    });
    setIsSendDialogOpen(false);
  };

  const getStatusBadge = (status?: string) => {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'cancel_requested':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold animate-pulse shadow-sm">
            {t('cancel_requested') || 'Cancel Requested'}
          </Badge>
        );
      case 'billed':
      case 'dibilkan':
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold shadow-sm">
            {t('billed') || 'Billed'}
          </Badge>
        );
      case 'approved':
      case 'diluluskan':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium shadow-sm">
            {t('approved') || 'Approved'}
          </Badge>
        );
      case 'cancelled':
      case 'dibatalkan':
        return (
          <Badge className="bg-stone/15 text-stone dark:text-stone-300 border border-stone/20 font-normal shadow-sm">
            {t('cancelled') || 'Cancelled'}
          </Badge>
        );
      case 'rejected':
      case 'ditolak':
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium shadow-sm">
            {t('rejected') || 'Rejected'}
          </Badge>
        );
      case 'menunggu':
      case 'pending':
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium shadow-sm">
            {t('pending') || 'Pending'}
          </Badge>
        );
    }
  };

  // Status filter groups map UI selections to the underlying bm/en status
  // strings stored on the order (see getStatusBadge above for the same
  // pairs). 'all' intentionally still excludes cancelled orders below,
  // matching the pre-existing default behavior of this list.
  const STATUS_FILTER_GROUPS: Record<string, string[]> = {
    pending: ['pending', 'menunggu'],
    approved: ['approved', 'diluluskan'],
    billed: ['billed', 'dibilkan'],
    rejected: ['rejected', 'ditolak'],
    cancelled: ['cancelled', 'dibatalkan'],
    cancel_requested: ['cancel_requested'],
  };

  const filteredOrders = orders.filter(order => {
    const sLower = searchTerm.toLowerCase();
    const dateMatch = (() => {
      if (!order.dateTime) return false;
      try {
        const d = new Date(order.dateTime);
        const formattedPP = format(d, 'PP').toLowerCase();
        const formattedSlash = format(d, 'dd/MM/yyyy').toLowerCase();
        const formattedMonth = format(d, 'MMMM').toLowerCase();
        const formattedDay = format(d, 'EEEE').toLowerCase();
        const formattedYear = d.getFullYear().toString();
        return formattedPP.includes(sLower) || 
               formattedSlash.includes(sLower) || 
               formattedMonth.includes(sLower) ||
               formattedDay.includes(sLower) ||
               formattedYear.includes(sLower);
      } catch {
        return false;
      }
    })();

    const status = order.status ? String(order.status).toLowerCase() : '';
    const isCancelled = status === 'cancelled' || status === 'dibatalkan';

    const matchesSearch = (
      (order.to || '').toLowerCase().includes(sLower) ||
      (order.name || '').toLowerCase().includes(sLower) ||
      (order.email || '').toLowerCase().includes(sLower) ||
      (order.orderId || '').toLowerCase().includes(sLower) ||
      (order.officialInvoiceNo || order.invoiceNo || '').toLowerCase().includes(sLower) ||
      dateMatch
    );

    // Status filter: 'all' keeps the original default (exclude cancelled).
    // Any explicit selection (including 'cancelled') overrides that default
    // so the admin can still look up cancelled orders on purpose.
    const matchesStatus = statusFilter === 'all'
      ? !isCancelled
      : (STATUS_FILTER_GROUPS[statusFilter] || []).includes(status);

    const matchesClient = clientFilter === 'all' || order.to === clientFilter;

    const matchesDateRange = (() => {
      if (!dateFromFilter && !dateToFilter) return true;
      if (!order.dateTime) return false;
      try {
        const orderDate = new Date(order.dateTime);
        if (dateFromFilter && orderDate < new Date(dateFromFilter)) return false;
        if (dateToFilter) {
          // Include the entire "to" day, not just midnight of that day.
          const endOfDay = new Date(dateToFilter);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
        return true;
      } catch {
        return false;
      }
    })();

    return matchesSearch && matchesStatus && matchesClient && matchesDateRange;
  });

  const cancelRequests = orders.filter(o => o.status === 'cancel_requested');

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background p-6 space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="bg-white/50 dark:bg-card/50 rounded-2xl border border-stone/15 dark:border-white/10 p-1 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-background grid grid-cols-1 lg:grid-cols-[280px_1fr] grid-rows-[auto_auto_1fr] lg:grid-rows-[auto_1fr] [grid-template-areas:'header''nav''content'] lg:[grid-template-areas:'header_header''nav_content']">
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
          <RefreshCw className={`w-4 h-4 text-[var(--color-sunshine-cta)] ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }} />
          {isRefreshing && <span className="microcopy-12-upper font-black text-[var(--color-sunshine-cta)] uppercase tracking-widest">Refreshing</span>}
        </div>
      </motion.div>

      {/* Header */}
      <header className="[grid-area:header] z-50 bg-white dark:bg-background border-b border-stone/15 dark:border-white/10 pt-[var(--sat)]">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-12 min-h-[60px] sm:min-h-[64px]">
          <div className="flex items-center gap-4">
            {/*
              P0 — `<div onClick>` collapsed to a semantic <button> so
              keyboard activation, focus ring, and the 44 × 44 px tap
              floor all behave correctly.
            */}
            <button
              type="button"
              onClick={() => navigate('/home', { replace: true })}
              className="touch-target-row flex items-center gap-3 group transition-all hover:opacity-80"
              aria-label="Go to home"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {/*
                  Brand asset path preserved verbatim — visual logo /
                  Malaysian heritage graphic must remain 100% intact.
                */}
                <TransparentLogo
                  src={getAssetUrl("/assets/wawasan_logo.svg")}
                  alt="Restoran Wawasan Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-display font-black text-xl text-deep-forest dark:text-white leading-none tracking-tight">
                  Wawasan
                </span>
                <span className="block font-sans microcopy-12-upper text-[var(--color-sunshine-cta)] font-black uppercase tracking-widest leading-tight mt-0.5">
                  Admin Control
                </span>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="w-11 h-11 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all text-deep-forest active:scale-90"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-deep-forest" />
              ) : (
                <Sun className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
              )}
            </button>

            <Button 
              variant="ghost" 
              onClick={() => navigate('/home', { replace: true })} 
              className="hidden sm:flex h-11 px-6 rounded-2xl text-deep-forest/60 hover:text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/5 font-bold transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
            
            <Button 
              variant="ghost" 
              className="h-11 px-6 rounded-2xl text-deep-forest/40 hover:text-red-500 hover:bg-red-500/5 font-bold transition-all"
              onClick={async () => {
                if (onLogout) {
                  await onLogout();
                } else {
                  if (adminToken) {
                    try {
                      await fetch(getApiUrl('/api/admin/logout'), {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${adminToken}`,
                          'Content-Type': 'application/json',
                        },
                      });
                    } catch (err) {
                      console.warn('[Admin Auth] Server logout token revocation failed (non-fatal):', err);
                    }
                  }
                  await removeSecureItem('wawasan_admin_token');
                  await removeSecureItem('wawasan_admin_authenticated');
                  window.location.reload();
                }
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>

        {/* Subtle Syncing Indicator Bar */}
        <div className={`w-full h-8 px-6 md:px-12 border-t border-stone/15 dark:border-white/10 flex items-center justify-between text-xs font-semibold transition-all duration-300 ${
          syncStatus === 'connected' 
            ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
            : syncStatus === 'syncing'
            ? 'bg-sky-500/5 text-sky-600 dark:text-sky-400'
            : syncStatus === 'connecting'
            ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400'
            : 'bg-stone-500/5 text-stone-500 dark:text-stone-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {syncStatus !== 'offline' && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  syncStatus === 'connected' 
                    ? 'bg-emerald-500' 
                    : syncStatus === 'syncing'
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
                }`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                syncStatus === 'connected' 
                  ? 'bg-emerald-500' 
                  : syncStatus === 'syncing'
                  ? 'bg-sky-500'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-500'
                  : 'bg-stone-400'
              }`}></span>
            </span>
            <span>
              {syncStatus === 'connected' && (language === 'en' ? 'Live connection active — Receiving real-time notifications' : 'Sambungan langsung aktif — Menerima notifikasi masa nyata')}
              {syncStatus === 'connecting' && (language === 'en' ? 'Connecting to Firestore WebSocket...' : 'Menghubungkan ke WebSocket Firestore...')}
              {syncStatus === 'syncing' && (language === 'en' ? 'Background syncing database logs...' : 'Penyelarasan latar belakang log pangkalan data...')}
              {syncStatus === 'offline' && (language === 'en' ? 'Offline — Reconnecting automatically' : 'Luar talian — Menyambung semula secara automatik')}
            </span>
          </div>
          
          <span className="microcopy-12-upper uppercase tracking-wider opacity-60">
            {syncStatus === 'connected' && 'Synced'}
            {syncStatus === 'connecting' && 'Connecting'}
            {syncStatus === 'syncing' && 'Syncing'}
            {syncStatus === 'offline' && 'Offline'}
          </span>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <nav className="[grid-area:nav] p-6 lg:p-8 bg-stone/5 dark:bg-card/20 border-b lg:border-b-0 lg:border-r border-stone/15 dark:border-white/10 relative overflow-hidden flex flex-col justify-start">
        {/* Background Batik Pattern for Tab Navigation Bar */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Batik3DMotion
            maxRotation={10}
            imgClassName="opacity-[0.06] dark:opacity-[0.1]"
            mode="background"
          />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <p className="hidden lg:block microcopy-12 font-black text-[var(--color-sunshine-cta)] uppercase tracking-widest mb-4">
            {language === 'en' ? 'Administrative' : 'Pentadbiran'}
          </p>
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap flex-shrink-0 lg:w-full lg:justify-start ${
                activeTab === 'orders'
                  ? 'text-[var(--color-sunshine-cta)]'
                  : 'text-deep-forest/70 dark:text-stone/70 hover:text-deep-forest dark:hover:text-white hover:bg-stone/10'
              }`}
            >
              {activeTab === 'orders' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-[var(--color-sunshine-cta)]/20 dark:bg-[var(--color-sunshine-cta)]/25 rounded-xl border border-[var(--color-sunshine-cta)]/40 z-0"
                  animate={{
                    boxShadow: [
                      '0 0 2px rgba(251, 191, 36, 0.15)',
                      '0 0 10px rgba(251, 191, 36, 0.55)',
                      '0 0 2px rgba(251, 191, 36, 0.15)'
                    ],
                    borderColor: [
                      'rgba(251, 191, 36, 0.4)',
                      'rgba(251, 191, 36, 0.85)',
                      'rgba(251, 191, 36, 0.4)'
                    ]
                  }}
                  transition={{
                    boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    default: { type: 'spring', bounce: 0.15, duration: 0.5 }
                  }}
                />
              )}
              <FileText className="w-4 h-4 z-10" />
              <span className="z-10">{t('orders') || 'Orders'}</span>
              {cancelRequests.length > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="ml-auto flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold z-10"
                >
                  <Bell className="w-3 h-3" />
                  <span>{cancelRequests.length}</span>
                </motion.div>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('diagnostics');
                runAllDiagnostics();
              }}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap flex-shrink-0 lg:w-full lg:justify-start ${
                activeTab === 'diagnostics'
                  ? 'text-[var(--color-sunshine-cta)]'
                  : 'text-deep-forest/70 dark:text-stone/70 hover:text-deep-forest dark:hover:text-white hover:bg-stone/10'
              }`}
            >
              {activeTab === 'diagnostics' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-[var(--color-sunshine-cta)]/20 dark:bg-[var(--color-sunshine-cta)]/25 rounded-xl border border-[var(--color-sunshine-cta)]/40 z-0"
                  animate={{
                    boxShadow: [
                      '0 0 2px rgba(251, 191, 36, 0.15)',
                      '0 0 10px rgba(251, 191, 36, 0.55)',
                      '0 0 2px rgba(251, 191, 36, 0.15)'
                    ],
                    borderColor: [
                      'rgba(251, 191, 36, 0.4)',
                      'rgba(251, 191, 36, 0.85)',
                      'rgba(251, 191, 36, 0.4)'
                    ]
                  }}
                  transition={{
                    boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    default: { type: 'spring', bounce: 0.15, duration: 0.5 }
                  }}
                />
              )}
              <Activity className="w-4 h-4 z-10" />
              <span className="z-10">Diagnostics</span>
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap flex-shrink-0 lg:w-full lg:justify-start ${
                activeTab === 'tables'
                  ? 'text-[var(--color-sunshine-cta)]'
                  : 'text-deep-forest/70 dark:text-stone/70 hover:text-deep-forest dark:hover:text-white hover:bg-stone/10'
              }`}
            >
              {activeTab === 'tables' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-[var(--color-sunshine-cta)]/20 dark:bg-[var(--color-sunshine-cta)]/25 rounded-xl border border-[var(--color-sunshine-cta)]/40 z-0"
                  animate={{
                    boxShadow: [
                      '0 0 2px rgba(251, 191, 36, 0.15)',
                      '0 0 10px rgba(251, 191, 36, 0.55)',
                      '0 0 2px rgba(251, 191, 36, 0.15)'
                    ],
                    borderColor: [
                      'rgba(251, 191, 36, 0.4)',
                      'rgba(251, 191, 36, 0.85)',
                      'rgba(251, 191, 36, 0.4)'
                    ]
                  }}
                  transition={{
                    boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    default: { type: 'spring', bounce: 0.15, duration: 0.5 }
                  }}
                />
              )}
              <Table className="w-4 h-4 z-10" />
              <span className="z-10">Tables View</span>
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap flex-shrink-0 lg:w-full lg:justify-start ${
                activeTab === 'menu'
                  ? 'text-[var(--color-sunshine-cta)]'
                  : 'text-deep-forest/70 dark:text-stone/70 hover:text-deep-forest dark:hover:text-white hover:bg-stone/10'
              }`}
            >
              {activeTab === 'menu' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-[var(--color-sunshine-cta)]/20 dark:bg-[var(--color-sunshine-cta)]/25 rounded-xl border border-[var(--color-sunshine-cta)]/40 z-0"
                  animate={{
                    boxShadow: [
                      '0 0 2px rgba(251, 191, 36, 0.15)',
                      '0 0 10px rgba(251, 191, 36, 0.55)',
                      '0 0 2px rgba(251, 191, 36, 0.15)'
                    ],
                    borderColor: [
                      'rgba(251, 191, 36, 0.4)',
                      'rgba(251, 191, 36, 0.85)',
                      'rgba(251, 191, 36, 0.4)'
                    ]
                  }}
                  transition={{
                    boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    default: { type: 'spring', bounce: 0.15, duration: 0.5 }
                  }}
                />
              )}
              <UtensilsIcon className="w-4 h-4 z-10" />
              <span className="z-10">{language === 'en' ? 'Menu Manager' : 'Pengurus Menu'}</span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap flex-shrink-0 lg:w-full lg:justify-start ${
                activeTab === 'updates'
                  ? 'text-[var(--color-sunshine-cta)]'
                  : 'text-deep-forest/70 dark:text-stone/70 hover:text-deep-forest dark:hover:text-white hover:bg-stone/10'
              }`}
            >
              {activeTab === 'updates' && (
                <motion.div
                  layoutId="adminActiveTab"
                  className="absolute inset-0 bg-[var(--color-sunshine-cta)]/20 dark:bg-[var(--color-sunshine-cta)]/25 rounded-xl border border-[var(--color-sunshine-cta)]/40 z-0"
                  animate={{
                    boxShadow: [
                      '0 0 2px rgba(251, 191, 36, 0.15)',
                      '0 0 10px rgba(251, 191, 36, 0.55)',
                      '0 0 2px rgba(251, 191, 36, 0.15)'
                    ],
                    borderColor: [
                      'rgba(251, 191, 36, 0.4)',
                      'rgba(251, 191, 36, 0.85)',
                      'rgba(251, 191, 36, 0.4)'
                    ]
                  }}
                  transition={{
                    boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    default: { type: 'spring', bounce: 0.15, duration: 0.5 }
                  }}
                />
              )}
              <Radio className="w-4 h-4 z-10" />
              <span className="z-10">{language === 'en' ? 'Live Updates' : 'Kemaskini In-App'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <motion.main 
        className="[grid-area:content] p-6 md:p-8 min-w-0"
        animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        <div>
          {/* Page Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-deep-forest mb-2">
                {activeTab === 'orders' 
                  ? t('orders') 
                  : activeTab === 'diagnostics' 
                  ? 'Diagnostics' 
                  : activeTab === 'menu'
                  ? (language === 'en' ? 'Menu Manager' : 'Pengurus Menu')
                  : activeTab === 'updates'
                  ? (language === 'en' ? 'In-App Live Updates' : 'Kemaskini In-App')
                  : 'Submissions Table'}
              </h1>
              <p className="text-deep-forest/50 text-sm">
                {activeTab === 'orders' 
                  ? t('orders_subtitle') 
                  : activeTab === 'diagnostics' 
                  ? 'Run system diagnostics, API connection probes, and trace telemetry.' 
                  : activeTab === 'menu'
                  ? 'Pengurusan item menu dan senarai harga restoran.'
                  : activeTab === 'updates'
                  ? 'Siarkan kemaskini versi aplikasi, pautan APK terkini, dan nota pelepasan secara real-time.'
                  : 'Jotform-style submission grid with customizable columns, inline status editing, and CSV exports.'}
              </p>
            </div>
            
            {calendarState.loading ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-cream dark:bg-background/5 text-deep-forest/50 border border-stone/15 dark:border-white/10 rounded-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Checking Calendar Sync...</span>
              </div>
            ) : calendarState.ok ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md" title="Google Calendar Sync is fully operational.">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Calendar Auto-Synced</span>
              </div>
            ) : calendarState.error && (calendarState.error.includes('disabled') || calendarState.error.includes('not been used')) ? (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md" title="Google Calendar API must be enabled.">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Calendar API Disabled</span>
                </div>
                <a 
                  href={getCalendarEnableUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  Click here to enable Google Calendar API
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md" title={calendarState.error || "Calendar is not fully synced."}>
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Calendar Sync Offline</span>
              </div>
            )}
          </div>

          {activeTab === 'orders' ? (
            <AdminOrdersTab
              t={t}
              language={language}
              filteredOrders={filteredOrders}
              cancelRequests={cancelRequests}
              dateFromFilter={dateFromFilter}
              setDateFromFilter={setDateFromFilter}
              dateToFilter={dateToFilter}
              setDateToFilter={setDateToFilter}
              isSelectMode={isSelectMode}
              setIsSelectMode={setIsSelectMode}
              filterBySameEmail={filterBySameEmail}
              setFilterBySameEmail={setFilterBySameEmail}
              consolidatedInvoiceNo={consolidatedInvoiceNo}
              setConsolidatedInvoiceNo={setConsolidatedInvoiceNo}
              prepareConsolidateModal={prepareConsolidateModal}
              selectedOrderIds={selectedOrderIds}
              setSelectedOrderIds={setSelectedOrderIds}
              showConsolidateModal={showConsolidateModal}
              setShowConsolidateModal={setShowConsolidateModal}
              isGeneratingConsolidated={isGeneratingConsolidated}
              generatingInvoice={generatingInvoice}
              getStatusBadge={getStatusBadge}
              handleToggleOrderSelect={handleToggleOrderSelect}
              openOrderDetail={openOrderDetail}
              openSendDialog={openSendDialog}
              handlePreviewPDF={handlePreviewPDF}
              handleDownloadPDF={handleDownloadPDF}
              handleDelete={handleDelete}
              handleRejectCancellation={handleRejectCancellation}
              handleGenerateConsolidatedInvoice={handleGenerateConsolidatedInvoice}
              authHeaders={authHeaders}
              getApiUrl={getApiUrl}
              fetchOrders={fetchOrders}
              toast={toast}
              setIsApproving={setIsApproving}
            />
          ) : activeTab === 'diagnostics' ? (
            <AdminDiagnosticsTab
              diagFirebase={diagFirebase}
              diagCalendar={diagCalendar}
              diagPdf={diagPdf}
              diagNative={diagNative}
              diagEmail={diagEmail}
              diagTests={diagTests}
              testEmailAddress={testEmailAddress}
              isSendingTestEmail={isSendingTestEmail}
              erudaEnabled={erudaEnabled}
              runAllDiagnostics={runAllDiagnostics}
              runFirebaseDiag={runFirebaseDiag}
              runCalendarDiag={runCalendarDiag}
              runPdfDiag={runPdfDiag}
              runNativeDiag={runNativeDiag}
              runSendTestEmail={runSendTestEmail}
              runFeatureTest={runFeatureTest}
              toggleEruda={toggleEruda}
              setTestEmailAddress={setTestEmailAddress}
              setDiagTests={setDiagTests}
            />
          ) : activeTab === 'menu' ? (
            <AdminMenuTab
              language={language}
              authHeaders={authHeaders}
              getApiUrl={getApiUrl}
              toast={toast}
            />
          ) : activeTab === 'updates' ? (
            <AdminUpdatesTab
              adminToken={adminToken}
              onPreviewModal={(config) => setPreviewUpdateConfig(config)}
            />
          ) : (
            <AdminTablesTab
              orders={orders}
              language={language}
              openOrderDetail={openOrderDetail}
              handlePreviewPDF={handlePreviewPDF}
              handleDownloadPDF={handleDownloadPDF}
              handleDelete={handleDelete}
              fetchOrders={fetchOrders}
              authHeaders={authHeaders}
              getApiUrl={getApiUrl}
              toast={toast}
            />
          )}
        </div>
      </motion.main>

      {/* Admin Update Preview Modal */}
      <InAppUpdateModal
        isOpen={Boolean(previewUpdateConfig)}
        config={previewUpdateConfig}
        isForceUpdate={previewUpdateConfig?.forceUpdate || false}
        onDismiss={() => setPreviewUpdateConfig(null)}
      />

      {/* Order Detail Dialog */}
      {isDetailOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsDetailOpen(false)}
        >
          {/* Backdrop with blur - separate from content to avoid layout issues */}
          <div className="absolute inset-0 bg-deep-forest/80 backdrop-blur-md" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full h-full max-w-5xl bg-cream dark:bg-card border border-[var(--color-sunshine-cta)]/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative text-deep-forest"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--color-sunshine-cta)]/10 flex items-center justify-between bg-white/40 dark:bg-background/40 backdrop-blur-sm flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white truncate">
                  {t('order_details')}
                </h2>
                {selectedOrder && (
                  <p className="text-xs md:text-sm text-deep-forest/60 dark:text-stone/40 mt-0.5 font-medium">
                    {selectedOrder.invoiceNo || selectedOrder.id ? `Ref: ${selectedOrder.invoiceNo || selectedOrder.id}` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="ml-4 p-2 rounded-full hover:bg-stone/10 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-deep-forest/60 dark:text-stone/60" />
              </button>
            </div>

            {/* Body - Scrollable Area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-10">
              {selectedOrder ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Main section: All fields */}
                  <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white/50 dark:bg-background/20 p-6 md:p-8 rounded-3xl border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-8">
                      {[
                        { label: language === 'bm' ? "Tarikh Hantar :" : "Submitted Date :", value: (() => {
                          const d = selectedOrder.createdAt;
                          if (!d) return '-';
                          const date = d instanceof Date ? d : typeof d === 'string' ? new Date(d) : 'seconds' in d ? new Date((d as any).seconds * 1000) : '_seconds' in d ? new Date((d as any)._seconds * 1000) : null;
                          return date ? format(date, 'EEEE, d MMMM yyyy, h:mm a') : '-';
                        })() },
                        { label: language === 'bm' ? "Klien / Organisasi :" : "Client / Organization :", value: selectedOrder.to || '-' },
                        selectedOrder.department ? { label: language === 'bm' ? "Jabatan :" : "Department :", value: selectedOrder.department } : null,
                        selectedOrder.attn ? { label: language === 'bm' ? "Untuk Perhatian :" : "Attn :", value: selectedOrder.attn } : null,
                        { label: language === 'bm' ? "Pegawai Bertanggungjawab :" : "Contact Person :", value: selectedOrder.name || '-' },
                        { label: language === 'bm' ? "Nombor Telefon :" : "Contact Number :", value: selectedOrder.contact || '-' },
                        { label: language === 'bm' ? "Alamat Emel :" : "Email Address :", value: selectedOrder.email || '-' },
                        { label: language === 'bm' ? "Tarikh & Masa Acara :" : "Event Date & Time :", value: selectedOrder.dateTime ? format(new Date(selectedOrder.dateTime), 'EEEE, d MMMM yyyy, h:mm a') : '-' },
                        { label: language === 'bm' ? "Lokasi Acara :" : "Event Location :", value: selectedOrder.location || '-' },
                        { label: language === 'bm' ? "Jenis Sajian :" : "Preparation Type :", value: selectedOrder.preparationType === 'meal_box' ? (language === 'bm' ? 'Pek Makanan (Meal Box)' : 'Meal Box') : selectedOrder.preparationType === 'buffet' ? 'Buffet' : '-' },
                        { label: language === 'bm' ? "Bilangan Pax :" : "Quantity :", value: selectedOrder.quantity != null ? `${selectedOrder.quantity} pax` : '-' },
                        { label: language === 'bm' ? "Hidangan Untuk :" : "Meal For :", value: selectedOrder.meals?.map(m => MEAL_LABELS[m]?.[selectedOrder.lang || 'en'] || m).join(', ') || '-' },
                        { label: language === 'bm' ? "Butiran Menu :" : "Menu Details :", value: selectedOrder.menu || '-' },
                        { label: language === 'bm' ? "Nota :" : "Notes :", value: selectedOrder.notes || '-' },
                      ].filter(Boolean).map((field, idx) => (
                        <div key={idx} className="pb-6 border-b border-[var(--color-sunshine-cta)]/10 last:border-0 last:pb-0">
                          <span className="text-xs font-bold text-[var(--color-sunshine-cta)] uppercase tracking-widest block mb-2 opacity-80">
                            {field!.label}
                          </span>
                          <p className="text-lg md:text-xl font-bold text-deep-forest dark:text-white leading-relaxed break-words whitespace-pre-line">
                            {field!.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar section: Status & Pricing */}
                  <div className="lg:col-span-1 space-y-6">
                    
                    {/* Status Banner */}
                    <div className="p-6 rounded-3xl bg-white/50 dark:bg-background/20 border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-3">
                      <span className="text-xs font-bold text-deep-forest/50 dark:text-stone/40 uppercase tracking-widest block">Status</span>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>

                    {/* Pricing and Grand Total */}
                    <div className="p-6 rounded-3xl bg-white/50 dark:bg-background/20 border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-6">
                      <h4 className="font-bold text-deep-forest dark:text-white border-b border-[var(--color-sunshine-cta)]/10 pb-3 uppercase tracking-wider text-sm">{t('price_pax')}</h4>
                      <div className="space-y-5">
                        {selectedOrder.meals.map((meal, idx) => (
                          <div key={`${meal}-${idx}`} className="flex flex-col gap-2">
                            <Label className="text-xs text-deep-forest/70 dark:text-stone/40 font-bold uppercase tracking-wide">
                              {MEAL_LABELS[meal]?.[selectedOrder.lang || 'en'] || meal}
                            </Label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-deep-forest/40">RM</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prices[meal] || ''}
                                onChange={(e) => setPrices(prev => ({ 
                                  ...prev, 
                                  [meal]: e.target.value 
                                }))}
                                className="pl-12 h-12 bg-cream/30 dark:bg-background/40 border-[var(--color-sunshine-cta)]/20 text-deep-forest dark:text-white text-lg font-bold rounded-2xl focus:ring-[var(--color-sunshine-cta)]/30"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Preview */}
                      <div className="p-5 bg-[var(--color-sunshine-cta)]/5 dark:bg-background/60 rounded-2xl border border-[var(--color-sunshine-cta)]/10">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-deep-forest/60 dark:text-stone/40 uppercase tracking-widest">{t('grand_total')}:</span>
                          <span className="text-2xl font-black text-[var(--color-sunshine-cta)]">
                            RM {selectedOrder.meals.reduce((total, meal) => {
                              const price = parseFloat(prices[meal] || '0');
                              return total + (price * selectedOrder.quantity);
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-deep-forest/50 dark:text-stone/50 italic leading-relaxed font-medium">
                          {numberToWords(selectedOrder.meals.reduce((total, meal) => {
                            const price = parseFloat(prices[meal] || '0');
                            return total + (price * selectedOrder.quantity);
                          }, 0), selectedOrder.lang)}
                        </p>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-deep-forest/40">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <p className="font-medium">Loading order details...</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-5 border-t border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/40 backdrop-blur-sm flex flex-wrap gap-3 items-center justify-end flex-shrink-0">
              {selectedOrder && (
                <div className="flex flex-wrap gap-2 flex-1">
                  {selectedOrder?.status === 'cancel_requested' ? (
                    <>
                      <Button
                        onClick={() => selectedOrder.id && handleCancelOrderAdmin(selectedOrder.id)}
                        disabled={isApproving}
                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                      >
                        {isApproving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                        {t('approve_cancellation') || 'Approve Cancellation'}
                      </Button>
                      <Button
                        onClick={() => selectedOrder.id && handleRejectCancellation(selectedOrder.id)}
                        disabled={isApproving}
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl px-6 py-6 h-auto font-bold transition-all active:scale-95"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        {t('reject_cancellation') || 'Reject Cancellation'}
                      </Button>
                    </>
                  ) : selectedOrder?.status === 'pending' ? (
                    <>
                      <Button
                        onClick={() => handleApprove(selectedOrder?.id || '')}
                        disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => prices[m] === undefined || prices[m] === '' || isNaN(parseFloat(prices[m])) || parseFloat(prices[m]) < 0)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-8 py-6 h-auto font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex-1 sm:flex-none"
                      >
                        {isApproving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                        {t('approve') || 'Approve & Set Pricing'}
                      </Button>
                      <Button
                        onClick={() => selectedOrder?.id && handleRejectOrder(selectedOrder.id)}
                        disabled={isApproving}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 rounded-2xl px-6 py-6 h-auto font-bold transition-all active:scale-95"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        {t('reject_order') || 'Reject Order'}
                      </Button>
                    </>
                  ) : (selectedOrder?.status === 'approved' || selectedOrder?.status === 'billed') ? (
                    <>
                      <Button
                        onClick={() => handleApprove(selectedOrder?.id || '')}
                        disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => prices[m] === undefined || prices[m] === '' || isNaN(parseFloat(prices[m])) || parseFloat(prices[m]) < 0)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        {isApproving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                        {t('update_invoice') || 'Update Invoice'}
                      </Button>
                      <Button
                        onClick={() => selectedOrder && openSendDialog(selectedOrder)}
                        disabled={isApproving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        {t('send_invoice') || 'Send Invoice'}
                      </Button>
                      <Button
                        onClick={() => selectedOrder?.id && handleCancelOrderAdmin(selectedOrder.id)}
                        variant="outline"
                        className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-2xl px-6 py-6 h-auto font-bold transition-all active:scale-95"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        {t('cancel_order') || 'Cancel Order'}
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => setIsDetailOpen(false)}
                className="text-deep-forest/60 hover:bg-stone/10 rounded-2xl px-6 py-6 h-auto font-bold"
              >
                {t('close')}
              </Button>
            </div>
          </motion.div>
        </div>, document.body)}



      {/* Send Invoice Modal */}
      {isSendDialogOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-6"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-deep-forest/80 backdrop-blur-md" 
            onClick={() => setIsSendDialogOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="w-full h-auto max-h-[95vh] max-w-xl bg-cream dark:bg-card border border-[var(--color-sunshine-cta)]/30 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative z-[2001]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-[var(--color-sunshine-cta)]/10 flex items-center justify-between bg-white/40 dark:bg-background/40 backdrop-blur-md flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[var(--color-sunshine-cta)]/10 rounded-2xl">
                  <Send className="w-6 h-6 text-[var(--color-sunshine-cta)]" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white">
                    {t('send_invoice_pdf')}
                  </h2>
                  <p className="text-xs text-deep-forest/50 font-medium">
                    {t('send_invoice_desc')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSendDialogOpen(false)}
                className="p-2 rounded-full hover:bg-stone/10 transition-all hover:rotate-90"
              >
                <X className="w-6 h-6 text-deep-forest/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {sendOrder && (
                <div className="space-y-8">
                  {/* Summary Box */}
                  <div className="p-6 bg-white/60 dark:bg-background/20 rounded-[2rem] border border-[var(--color-sunshine-cta)]/10 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-[var(--color-sunshine-cta)]/5 pb-3">
                      <span className="text-xs font-black text-deep-forest/40 uppercase tracking-widest">{t('invoice_no_label')}</span>
                      <span className="font-mono font-bold text-deep-forest dark:text-white">
                        {getDisplayInvoiceNo(sendOrder)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[var(--color-sunshine-cta)]/5 pb-3">
                      <span className="text-xs font-black text-deep-forest/40 uppercase tracking-widest">{t('customer_label')}</span>
                      <span className="font-bold text-deep-forest dark:text-white">{sendOrder.to}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-black text-deep-forest/40 uppercase tracking-widest">{t('grand_total_label')}</span>
                      <span className="text-xl font-black text-[var(--color-sunshine-cta)]">
                        RM {(sendOrder.totalAmount || sendOrder.meals.reduce((sum, meal) => {
                          const price = sendOrder.prices?.[meal] || 0;
                          return sum + (price * sendOrder.quantity);
                        }, 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-6">
                    {/* Email Option */}
                    <div className="p-6 rounded-[2rem] border border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/20 shadow-sm space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                          <Mail className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="font-bold text-deep-forest dark:text-white">{t('option_email')}</span>
                      </div>
                      <p className="text-xs text-deep-forest/60 leading-relaxed italic">
                        {t('email_desc')}
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="send-email-input" className="text-[10px] font-black text-deep-forest/40 uppercase tracking-widest ml-1">
                          {t('recipient_email')}
                        </Label>
                        <Input
                          id="send-email-input"
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="bg-white/40 dark:bg-background/40 border-[var(--color-sunshine-cta)]/10 text-deep-forest dark:text-white focus:ring-[var(--color-sunshine-cta)]/30 h-14 rounded-2xl text-base px-5 font-medium"
                          placeholder="customer@email.com"
                        />
                      </div>
                      <Button
                        onClick={handleSendEmail}
                        disabled={sendingEmail || !recipientEmail}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl h-14 text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95 uppercase tracking-widest"
                      >
                        {sendingEmail ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('sending')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-3 justify-center">
                            <Mail className="w-5 h-5" />
                            {t('send_invoice_email')}
                          </span>
                        )}
                      </Button>
                    </div>

                    {/* WhatsApp Option */}
                    <div className="p-6 rounded-[2rem] border border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/20 shadow-sm space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                          <MessageSquare className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="font-bold text-deep-forest dark:text-white">{t('option_whatsapp')}</span>
                      </div>
                      <p className="text-xs text-deep-forest/60 leading-relaxed italic">
                        {t('whatsapp_desc')}
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="send-phone-input" className="text-[10px] font-black text-deep-forest/40 uppercase tracking-widest ml-1">
                          {t('recipient_phone')}
                        </Label>
                        <Input
                          id="send-phone-input"
                          type="text"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          className="bg-white/40 dark:bg-background/40 border-[var(--color-sunshine-cta)]/10 text-deep-forest dark:text-white focus:ring-emerald-500/30 h-14 rounded-2xl text-base px-5 font-medium"
                          placeholder="e.g. 0123456789"
                        />
                      </div>
                      <Button
                        onClick={handleSendWhatsApp}
                        disabled={!recipientPhone}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-14 text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95 uppercase tracking-widest"
                      >
                        <span className="flex items-center gap-3 justify-center">
                          <MessageSquare className="w-5 h-5" />
                          {t('open_whatsapp')}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-[var(--color-sunshine-cta)]/10 bg-white/40 dark:bg-background/40 backdrop-blur-md flex justify-end flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setIsSendDialogOpen(false)}
                className="text-deep-forest/40 hover:text-deep-forest hover:bg-stone/10 rounded-2xl px-10 py-7 h-auto font-black uppercase tracking-widest transition-all"
              >
                {t('cancel')}
              </Button>
            </div>
          </motion.div>
        </div>, document.body)}

      {/* PDF Preview Modal */}
      {isPreviewOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-6"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-deep-forest/90 backdrop-blur-md" 
            onClick={() => setIsPreviewOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="w-full h-full max-w-6xl bg-white dark:bg-stone-900 border border-white/20 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative z-[2001]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white truncate">
                  {previewFileName || 'PDF Invoice Preview'}
                </h2>
                <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                  {t('pdf_preview_desc')}
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="ml-4 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-all hover:rotate-90"
              >
                <X className="w-7 h-7 text-stone-400" />
              </button>
            </div>

            {/* PDF View Container */}
            <div className="flex-1 min-h-0 bg-stone-100 dark:bg-black/20 overflow-hidden relative">
              {previewPdfUrl ? (
                Capacitor.isNativePlatform() ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center space-y-6">
                    <div className="w-24 h-24 bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/20 rounded-[2rem] flex items-center justify-center">
                      <FileText className="w-12 h-12 text-[var(--color-sunshine-cta)]" />
                    </div>
                    <div className="space-y-3 max-w-sm">
                      <h3 className="text-2xl font-display font-bold text-deep-forest dark:text-white">Mobile View Restricted</h3>
                      <p className="text-sm text-stone-500 leading-relaxed">
                        In-app PDF preview is restricted by mobile security. Use the button below to download or share the invoice.
                      </p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={previewPdfUrl}
                    title="PDF Preview Frame"
                    className="w-full h-full border-0"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 text-stone-400">
                  <Loader2 className="w-12 h-12 animate-spin text-[var(--color-sunshine-cta)]" />
                  <p className="font-bold tracking-widest uppercase text-xs">{t('loading') || 'Generating Document'}</p>
                </div>
              )}
            </div>

            {/* Tip Box */}
            {!Capacitor.isNativePlatform() && (
              <div className="px-6 py-4 bg-stone-50 dark:bg-stone-800/40 border-y border-stone-200 dark:border-stone-800 text-xs flex items-center gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 text-base">💡</span>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed italic">
                  {language === 'bm' 
                    ? 'Nota: Jika paparan kosong, klik "Muat Turun PDF" untuk membuka fail secara manual.' 
                    : 'Note: If the preview appears blank, click "Download PDF" to open the file manually.'}
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="px-8 py-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md flex flex-wrap gap-4 items-center justify-end flex-shrink-0">
              <Button
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    try {
                      let base64data = '';
                      if (previewPdfUrl.startsWith('data:')) {
                        base64data = previewPdfUrl.split(',')[1];
                      } else {
                        const response = await fetch(previewPdfUrl);
                        const blob = await response.blob();
                        base64data = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const res = reader.result as string;
                            resolve(res.split(',')[1]);
                          };
                          reader.onerror = reject;
                          reader.readAsDataURL(blob);
                        });
                      }

                      const savedFile = await Filesystem.writeFile({
                        path: previewFileName,
                        data: base64data,
                        directory: Directory.Cache
                      });

                      await Share.share({
                        title: previewFileName,
                        url: savedFile.uri,
                      });

                      toast({
                        title: language === 'bm' ? 'Sedia untuk Dikongsi' : 'Ready to Share',
                        description: language === 'bm' ? 'Invois berjaya dibuka untuk perkongsian.' : 'Invoice shared successfully.',
                        variant: 'success'
                      });
                    } catch (err) {
                      console.error('Failed to share PDF:', err);
                    }
                  } else {
                    const link = document.createElement('a');
                    link.href = previewPdfUrl;
                    link.download = previewFileName;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="bg-[var(--color-sunshine-cta)] text-white hover:brightness-110 rounded-2xl px-10 py-7 h-auto font-black shadow-xl shadow-[var(--color-sunshine-cta)]/20 transition-all active:scale-95 flex-1 md:flex-none uppercase tracking-widest"
              >
                <FileDown className="w-6 h-6 mr-3" />
                {t('download')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewPdfUrl('');
                }}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl px-10 py-7 h-auto font-black uppercase tracking-widest transition-all"
              >
                {t('close')}
              </Button>
            </div>
          </motion.div>
        </div>, document.body)}
    </div>
  );
}
