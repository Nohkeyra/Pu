if (import.meta.env.DEV) { import("eruda").then(m => m.default.init()); }
import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Loader2,
  Activity,
  RefreshCw,
  Table,
  Bell
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { generateInvoicePDF, generateCombinedInvoicePDF, preloadLogoForPDF } from '@/services/pdfService';
import { generateConsolidatedInvoicePDF } from '@/services/consolidatedInvoiceService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { getApiUrl } from '@/lib/api';
import { getDummyCombinedOrders, getDummyConsolidatedOrders } from '@/utils/testData';
import { measureDbLatency } from '@/utils/diagnostics';
import type { Order } from '@/types';
import { AdminHeader } from './admin/AdminHeader';
import { AdminOrdersTab } from './admin/AdminOrdersTab';
import { AdminDiagnosticsTab } from './admin/AdminDiagnosticsTab';
import { AdminTablesTab } from './admin/AdminTablesTab';
import AdminMenuTab from './admin/AdminMenuTab';
import { AdminUpdatesTab } from './admin/AdminUpdatesTab';
import InAppUpdateModal from '@/components/InAppUpdateModal';
import type { AppVersionConfig } from '@/services/updateService';
import { filterAdminOrders } from '@/lib/adminOrderFilters';

const OrderDetailModal = lazy(() => import('./admin/OrderDetailModal').then(m => ({ default: m.OrderDetailModal })));
const SendInvoiceModal = lazy(() => import('./admin/SendInvoiceModal').then(m => ({ default: m.SendInvoiceModal })));
const PdfPreviewModal = lazy(() => import('./admin/PdfPreviewModal').then(m => ({ default: m.PdfPreviewModal })));
import { Utensils as UtensilsIcon, Radio } from 'lucide-react';

interface SerializedOrder extends Omit<Order, 'createdAt'> {
  createdAt: { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number } | null;
}

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const clientFilter = 'all';
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
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : !snapshot.metadata.fromCache;
      setSyncStatus(isOnline ? 'connected' : 'offline');
    }, (error) => {
      console.warn('Real-time connection monitoring error (possibly offline):', error);
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected');
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
  const [erudaEnabled, setErudaEnabled] = useState(false);

  const toggleEruda = async () => {
    const nextState = !erudaEnabled;
    setErudaEnabled(nextState);
    
    if (nextState) {
      toast({
        title: "Developer Toolkit Enabled",
        description: "Loading inspector console... Look for the gear icon in the bottom-right corner of your screen.",
      });
      try {
        const erudaModule = await import('eruda');
        erudaModule.default.init();
      } catch (err) {
        console.error('Failed to load Eruda dynamically:', err);
        toast({
          title: "Toolkit Load Failed",
          variant: "error"
        });
      }
    } else {
      toast({
        title: "Developer Toolkit Disabled",
        description: "The inspector console has been deactivated. Refresh to fully unload.",
      });
      try {
        const erudaModule = await import('eruda');
        erudaModule.default.destroy();
      } catch (e) {
        console.warn('Eruda destroy error:', e);
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

  // BUGFIX (2026-08-13): fetchOrders used to call setLoading(true) on every
  // invocation, including the 30s background poll below. Since `loading`
  // gates the ENTIRE panel render (see the `if (loading)` full-screen
  // skeleton further down), every 30s the whole Admin Panel — header, stat
  // cards, table, everything — was replaced by a skeleton and then swapped
  // back once the fetch resolved. That flash is what read as "the app
  // refreshes every ~30 seconds". The `silent` param lets the background
  // poll refresh `orders` data without touching `loading`, so only the
  // initial page load (and any explicit manual refresh) shows the skeleton.
  const fetchOrders = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    
    try {
      const payload: any = { action: 'fetch', pageSize: 50 };
      
      const response = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
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
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Fetch orders on load
  useEffect(() => {
    fetchOrders();
    fetchCalendarState();
    
    // silent=true: background poll must not trigger the full-panel loading skeleton
    const interval = setInterval(() => fetchOrders(true), 30000); // Poll every 30 seconds
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

  // Apply centralized filter logic from filterAdminOrders utility
  const filteredOrders = filterAdminOrders({
    orders,
    searchTerm,
    statusFilter,
    clientFilter,
    dateFromFilter,
    dateToFilter,
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
      <AdminHeader
        syncStatus={syncStatus}
        language={language}
        theme={theme}
        toggleTheme={toggleTheme}
        navigate={navigate}
        t={t}
        adminToken={adminToken}
        onLogout={onLogout}
        getApiUrl={getApiUrl}
      />

      {/* Sidebar Navigation */}
      <nav className="[grid-area:nav] p-3 sm:p-4 lg:p-8 bg-stone/5 dark:bg-card/20 border-b lg:border-b-0 lg:border-r border-stone/15 dark:border-white/10 relative overflow-hidden flex flex-col justify-start">
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
          <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-none pr-4 lg:pr-0">
            {[
              {
                id: 'orders' as const,
                label: t('orders') || 'Orders',
                icon: FileText,
                onClick: () => setActiveTab('orders'),
                badge: cancelRequests.length > 0 ? (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="ml-auto flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold z-10"
                  >
                    <Bell className="w-3 h-3" />
                    <span>{cancelRequests.length}</span>
                  </motion.div>
                ) : null,
              },
              {
                id: 'diagnostics' as const,
                label: 'Diagnostics',
                icon: Activity,
                onClick: () => {
                  setActiveTab('diagnostics');
                  runAllDiagnostics();
                },
              },
              {
                id: 'tables' as const,
                label: 'Tables View',
                icon: Table,
                onClick: () => setActiveTab('tables'),
              },
              {
                id: 'menu' as const,
                label: language === 'en' ? 'Menu Manager' : 'Pengurus Menu',
                icon: UtensilsIcon,
                onClick: () => setActiveTab('menu'),
              },
              {
                id: 'updates' as const,
                label: language === 'en' ? 'Live Updates' : 'Kemaskini In-App',
                icon: Radio,
                onClick: () => setActiveTab('updates'),
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`px-5 py-3.5 font-bold text-sm flex items-center gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap flex-shrink-0 lg:w-full lg:justify-start min-h-[48px] ${
                    isActive
                      ? 'text-[var(--color-sunshine-cta)]'
                      : 'text-deep-forest/70 dark:text-stone/70 hover:text-deep-forest dark:hover:text-white hover:bg-stone/10'
                  }`}
                >
                  {isActive && (
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
                  <Icon className="w-4 h-4 z-10 shrink-0" />
                  <span className="z-10">{tab.label}</span>
                  {tab.badge}
                </button>
              );
            })}
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
                <button 
                  onClick={async (e) => {
                    e.preventDefault();
                    const url = getCalendarEnableUrl();
                    if (Capacitor.isNativePlatform()) {
                      try {
                        const { Browser } = await import('@capacitor/browser');
                        await Browser.open({ url });
                      } catch {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }
                    } else {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors cursor-pointer text-right"
                >
                  Click here to enable Google Calendar API
                </button>
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
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
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

      {/* Order Detail Modal */}
      <Suspense fallback={null}>
      <OrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        selectedOrder={selectedOrder}
        t={t}
        language={language}
        prices={prices}
        setPrices={setPrices}
        getStatusBadge={getStatusBadge}
        isApproving={isApproving}
        handleCancelOrderAdmin={handleCancelOrderAdmin}
        handleRejectCancellation={handleRejectCancellation}
        handleApprove={handleApprove}
        handleRejectOrder={handleRejectOrder}
        openSendDialog={openSendDialog}
      />



      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={isSendDialogOpen}
        onClose={() => setIsSendDialogOpen(false)}
        sendOrder={sendOrder}
        t={t}
        recipientEmail={recipientEmail}
        setRecipientEmail={setRecipientEmail}
        recipientPhone={recipientPhone}
        setRecipientPhone={setRecipientPhone}
        sendingEmail={sendingEmail}
        handleSendEmail={handleSendEmail}
        handleSendWhatsApp={handleSendWhatsApp}
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewPdfUrl('');
        }}
        previewFileName={previewFileName}
        previewPdfUrl={previewPdfUrl}
        t={t}
        language={language}
        toast={toast}
      />
      </Suspense>
    </div>
  );
}
