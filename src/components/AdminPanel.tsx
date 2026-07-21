import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Timestamp } from 'firebase/firestore';
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
  Palette,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { generateInvoicePDF, generateCombinedInvoicePDF, generateConsolidatedInvoicePDF, preloadLogoForPDF } from '@/services/pdfService';
import { numberToWords } from '@/services/numberToWordsBM';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { removeSecureItem } from '@/lib/preferences';
import { getApiUrl } from '@/lib/api';
import { getAssetUrl } from '@/lib/utils';
import { getDummyCombinedOrders, getDummyConsolidatedOrders } from '@/utils/testData';
import { measureDbLatency } from '@/utils/diagnostics';
import type { Order } from '@/types';
import { AdminOrdersTab } from './admin/AdminOrdersTab';
import { AdminDiagnosticsTab } from './admin/AdminDiagnosticsTab';
import { AdminBrandingTab } from './admin/AdminBrandingTab';

interface SerializedOrder extends Omit<Order, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number } | null;
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
  if (order.id) return `RW${order.id.substring(0, 6).toUpperCase()}`;
  return 'RW------';
};

export default function AdminPanel({ adminToken, onLogout }: { adminToken?: string; onLogout?: () => void }) {
  const { t, language } = useLanguage();
  const { theme, toggleTheme, accent, updateAccentInDb } = useTheme();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Consolidated Invoice (admin-only): lets the admin select orders across
  // multiple different clients and export one grouped-by-client PDF.
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
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

  const [activeTab, setActiveTab] = useState<'orders' | 'diagnostics' | 'branding'>('orders');

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

  const handleAccentChange = async (newAccent: 'sunshine' | 'kiwi') => {
    try {
      await updateAccentInDb(newAccent, adminToken);
      toast({
        title: 'Branding Updated',
        description: `Theme accent color switched to ${newAccent === 'sunshine' ? 'Sunshine Orange' : 'Kiwi Green'} successfully.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not update global branding setting.';
      toast({
        title: 'Branding Update Failed',
        description: errorMessage,
        variant: 'error',
      });
    }
  };

  const runFirebaseDiag = async () => {
    setDiagFirebase({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/firebase'));
      if (response.ok) {
        const data = await response.json();
        setDiagFirebase({ status: 'pass', projectId: data.projectId });
      } else {
        const data = await response.json();
        setDiagFirebase({ status: 'fail', message: data.error || 'Failed to authenticate/write to Firestore' });
      }
    } catch (err: unknown) {
      setDiagFirebase({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
    }
  };

  const runCalendarDiag = async () => {
    setDiagCalendar({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/calendar'));
      if (response.ok) {
        const data = await response.json();
        setDiagCalendar({ status: 'pass', calendarsReturned: data.calendarsReturned });
      } else {
        const data = await response.json();
        setDiagCalendar({ status: 'fail', message: data.message || data.error || 'Google Calendar API connection failed' });
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
        const ok = await measureDbLatency(toast);
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
      const response = await fetch(getApiUrl('/api/diagnostics/calendar'));
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
            let timestamp = null;
            if (order.createdAt && typeof order.createdAt.seconds === 'number') {
              try {
                timestamp = new Timestamp(order.createdAt.seconds, order.createdAt.nanoseconds || 0);
              } catch (e) {
                console.error('Failed to create timestamp for order', order.id, e);
              }
            }
            return {
              ...order,
              createdAt: timestamp
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

      const invoiceNo = order.invoiceNo || `RW${orderId.substring(0, 6).toUpperCase()}`;

      // Update meal prices and invoiceNo on the order document via secure admin endpoint
      const updateResponse = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data: {
            prices: mealPrices,
            invoiceNo,
            approvedAt: new Date().toISOString(),
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
      
      // Extract as a Base64 string and POST it to backend endpoint (/api/submissions/bill)
      try {
        const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
        
        const response = await fetch(getApiUrl('/api/submissions/bill'), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            submissionId: orderId,
            totalAmount: total,
            pdfBase64: pdfBase64,
            fileName: fileName,
            collectionName: 'orders'
          })
        });
        
        if (!response.ok) {
          console.warn('Could not send email or update status via server. Have you configured SMTP in .env?');
        } else {
          console.log('Invoice email sent and document billed successfully via backend!');
        }
      } catch (err) {
        console.error('Error triggering billing and email API:', err);
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
        invoiceNo = `RW${order.id.substring(0, 6).toUpperCase()}-PRE`;
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
        const pdfDataUri = pdfDoc.output('datauristring');
        setPreviewPdfUrl(pdfDataUri);
        setPreviewFileName(fileName);
        setIsPreviewOpen(true);
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
          invoiceNo = `RW${orderId.substring(0, 6).toUpperCase()}-PRE`;
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
        toast({
          title: t('error'),
          description: 'Download Error: ' + errorMessage,
          variant: 'error'
        });
      } finally {
        setGeneratingInvoice(null);
      }
    }, 50);
  };

  const handleToggleOrderSelect = (id?: string) => {
    if (!id) return;
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateConsolidatedInvoice = async (withNotes: boolean) => {
    setShowConsolidateModal(false);
    setIsGeneratingConsolidated(true);

    try {
      await preloadLogoForPDF();

      const selectedOrderData = orders.filter(o => o.id && selectedOrderIds.has(o.id));
      const pdfDoc = generateConsolidatedInvoicePDF(
        { orders: selectedOrderData, includeNotes: withNotes },
        true
      );
      const fileName = `Invois_Konsolidasi_Wawasan_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;

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

      setSelectedOrderIds(new Set());
      toast({
        title: t('success') || 'Success',
        description: 'Consolidated invoice generated.',
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
        },
        body: JSON.stringify({
          email: recipientEmail,
          name: sendOrder.name,
          invoiceNo,
          pdfBase64,
          isFinal: sendOrder.status === 'approved',
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
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');

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

    const status = order.status ? order.status.toLowerCase() : '';
    const isCancelled = status === 'cancelled' || status === 'dibatalkan';

    return (
      order.to.toLowerCase().includes(sLower) ||
      order.name.toLowerCase().includes(sLower) ||
      order.email.toLowerCase().includes(sLower) ||
      dateMatch
    ) && !isCancelled;
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
          <div className="bg-white/50 dark:bg-card/50 rounded-3xl border border-border p-1 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-background">
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
          <RefreshCw className={`w-4 h-4 text-sunshine ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }} />
          {isRefreshing && <span className="text-[10px] font-black text-sunshine uppercase tracking-widest">Refreshing</span>}
        </div>
      </motion.div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-deep-forest/[0.03] dark:border-white/5 pt-[var(--sat)]">
        <div className="flex items-center justify-between px-6 md:px-12 h-[76px]">
          <div className="flex items-center gap-4">
            <div onClick={() => navigate('/home', { replace: true })} className="flex items-center gap-3 group cursor-pointer transition-all hover:opacity-80">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm border border-deep-forest/5">
                <img
                  src={getAssetUrl("/assets/wawasan_logo.jpg")}
                  alt="Restoran Wawasan Logo"
                  className="w-full h-full object-contain mix-blend-multiply"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="font-display font-black text-xl text-deep-forest leading-none tracking-tight">
                  Wawasan
                </span>
                <span className="block font-sans text-[10px] text-sunshine font-black uppercase tracking-widest leading-tight mt-0.5">
                  Admin Control
                </span>
              </div>
            </div>
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
                <Sun className="w-5 h-5 text-sunshine" />
              )}
            </button>

            <Button 
              variant="ghost" 
              onClick={() => navigate('/home', { replace: true })} 
              className="hidden sm:flex h-11 px-6 rounded-2xl text-deep-forest/60 hover:text-sunshine hover:bg-sunshine/5 font-bold transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
            
            <Button 
              variant="ghost" 
              className="h-11 px-6 rounded-2xl text-deep-forest/40 hover:text-red-500 hover:bg-red-500/5 font-bold transition-all"
              onClick={async () => {
                if (onLogout) {
                  onLogout();
                } else {
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
      </header>

      {/* Main Content */}
      <motion.main 
        className="pt-[calc(72px+var(--sat)+2rem)]"
        animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        <div className="p-6 md:p-8">
          {/* Page Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-deep-forest mb-2">
                {t('orders')}
              </h1>
              <p className="text-deep-forest/50">
                {t('orders_subtitle')}
              </p>
            </div>
            
            {calendarState.loading ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-cream dark:bg-background/5 text-deep-forest/50 border border-deep-forest/10 rounded-md">
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

          {/* Tab Navigation */}
          <div className="flex border-b border-sunshine/10 mb-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all duration-200 ${
                activeTab === 'orders'
                  ? 'border-sunshine text-sunshine bg-sunshine/5'
                  : 'border-transparent text-deep-forest/50 hover:text-deep-forest/80 hover:bg-deep-forest/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t('orders') || 'Orders'}</span>
              {cancelRequests.length > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="ml-2 flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold"
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
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all duration-200 ${
                activeTab === 'diagnostics'
                  ? 'border-sunshine text-sunshine bg-sunshine/5'
                  : 'border-transparent text-deep-forest/50 hover:text-deep-forest/80 hover:bg-deep-forest/5'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Diagnostics</span>
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all duration-200 ${
                activeTab === 'branding'
                  ? 'border-sunshine text-sunshine bg-sunshine/5'
                  : 'border-transparent text-deep-forest/50 hover:text-deep-forest/80 hover:bg-deep-forest/5'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Branding</span>
            </button>
          </div>

          {activeTab === 'orders' ? (
            <AdminOrdersTab
              t={t}
              language={language}
              filteredOrders={filteredOrders}
              cancelRequests={cancelRequests}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isSelectMode={isSelectMode}
              setIsSelectMode={setIsSelectMode}
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
          ) : (
            <AdminBrandingTab
              accent={accent}
              onAccentChange={handleAccentChange}
            />
          )}
        </div>
      </motion.main>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-cream dark:bg-card border-sunshine/20 text-deep-forest max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {t('order_details')}
            </DialogTitle>
            <DialogDescription>
              {t('order_details_desc')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-cream dark:bg-background/50">
                <span className="text-deep-forest/60">Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sunshine">{t('customer_info')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-deep-forest/50">{t('to')}:</span>
                    <p className="text-deep-forest">{selectedOrder.to}</p>
                  </div>
                  <div>
                    <span className="text-deep-forest/50">{t('attn')}:</span>
                    <p className="text-deep-forest">{selectedOrder.attn || '-'}</p>
                  </div>
                  <div>
                    <span className="text-deep-forest/50">{t('name')}:</span>
                    <p className="text-deep-forest">{selectedOrder.name}</p>
                  </div>
                  <div>
                    <span className="text-deep-forest/50">{t('contact')}:</span>
                    <p className="text-deep-forest">{selectedOrder.contact}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-deep-forest/50">{t('email')}:</span>
                    <p className="text-deep-forest">{selectedOrder.email}</p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sunshine">{t('event_details')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-deep-forest/50">{t('datetime')}:</span>
                    <p className="text-deep-forest">
                      {selectedOrder.dateTime 
                        ? format(new Date(selectedOrder.dateTime), 'PPp')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-deep-forest/50">{t('quantity')}:</span>
                    <p className="text-deep-forest">{selectedOrder.quantity} pax</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-deep-forest/50">{t('location')}:</span>
                    <p className="text-deep-forest">{selectedOrder.location}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-deep-forest/50">{t('meals')}:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedOrder.meals.map((meal, idx) => (
                        <Badge 
                          key={`${meal}-${idx}`} 
                          variant="outline" 
                          className="border-sunshine/30 text-deep-forest"
                        >
                          {MEAL_LABELS[meal]?.[selectedOrder.lang || 'en'] || meal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {selectedOrder.menu && (
                    <div className="col-span-2">
                      <span className="text-deep-forest/50">{t('menu')}:</span>
                      <p className="text-deep-forest mt-1">{selectedOrder.menu}</p>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="col-span-2">
                      <span className="text-deep-forest/50">{t('notes')}:</span>
                      <p className="text-deep-forest mt-1">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4 pt-4 border-t border-sunshine/10">
                <h4 className="font-semibold text-sunshine">{t('price_pax')}</h4>
                <div className="space-y-3">
                  {selectedOrder.meals.map((meal, idx) => (
                    <div key={`${meal}-${idx}`} className="flex items-center gap-4">
                      <Label className="w-32 text-deep-forest/70">
                        {MEAL_LABELS[meal]?.[selectedOrder.lang || 'en'] || meal}
                      </Label>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-forest/50">RM</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prices[meal] || ''}
                          onChange={(e) => setPrices(prev => ({ 
                            ...prev, 
                            [meal]: e.target.value 
                          }))}
                          className="pl-10 bg-cream dark:bg-background/50 border-sunshine/20 text-deep-forest"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Preview */}
                <div className="p-4 bg-cream dark:bg-background/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-deep-forest/60">{t('grand_total')}:</span>
                    <span className="text-2xl font-bold text-sunshine">
                      RM {selectedOrder.meals.reduce((total, meal) => {
                        const price = parseFloat(prices[meal] || '0');
                        return total + (price * selectedOrder.quantity);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-deep-forest/50 italic">
                    {numberToWords(selectedOrder.meals.reduce((total, meal) => {
                      const price = parseFloat(prices[meal] || '0');
                      return total + (price * selectedOrder.quantity);
                    }, 0), selectedOrder.lang)}
                  </p>
                </div>
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 mt-6 flex-wrap md:flex-nowrap">
            {selectedOrder?.status === 'cancel_requested' ? (
              <>
                <Button
                  onClick={async () => {
                    const confirmCancelApprove = confirm("Are you sure you want to APPROVE this cancellation? This will permanently delete the order and notify the customer.");
                    if (!confirmCancelApprove) return;
                    setIsApproving(true);
                    try {
                      const response = await fetch(getApiUrl('/api/admin/orders'), {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify({
                          action: 'delete',
                          orderId: selectedOrder.id
                        })
                      });
                      if (response.ok) {
                        toast({
                          title: t('success') || 'Success',
                          description: 'Order cancelled and deleted successfully.',
                          variant: 'success'
                        });
                        setIsDetailOpen(false);
                        fetchOrders();
                      } else {
                        throw new Error('Failed to delete order');
                      }
                    } catch (error) {
                      console.error('Error deleting cancelled order:', error);
                      toast({
                        title: t('error') || 'Error',
                        description: 'Failed to delete order.',
                        variant: 'error'
                      });
                    } finally {
                      setIsApproving(false);
                    }
                  }}
                  disabled={isApproving}
                  className="bg-tomato-burst hover:bg-tomato-burst/85 text-white"
                >
                  {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {t('approve_cancellation') || 'Approve Cancellation'}
                </Button>
                <Button
                  onClick={() => selectedOrder.id && handleRejectCancellation(selectedOrder.id)}
                  disabled={isApproving}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('reject_cancellation') || 'Reject Cancellation'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleApprove(selectedOrder?.id || '')}
                disabled={isApproving || !selectedOrder || selectedOrder.meals.some(m => !prices[m] || parseFloat(prices[m]) <= 0)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {selectedOrder?.status === 'approved' || selectedOrder?.status === 'billed' ? t('update_invoice') || 'Update Invoice' : t('approve')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsDetailOpen(false)}
              className="border-sunshine/30 text-deep-forest hover:bg-sunshine/10"
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-md bg-cream dark:bg-card border-sunshine/20 text-deep-forest">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-sunshine flex items-center gap-2">
              <Send className="w-5 h-5 text-sunshine" />
              {t('send_invoice_pdf')}
            </DialogTitle>
            <DialogDescription>
              {t('send_invoice_desc')}
            </DialogDescription>
          </DialogHeader>

          {sendOrder && (
            <div className="space-y-6 py-4">
              {/* Summary Box */}
              <div className="p-4 bg-cream dark:bg-background/50 rounded-xl border border-sunshine/10 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-deep-forest/50">{t('invoice_no_label')}</span>
                  <span className="font-mono font-medium text-deep-forest">
                    {getDisplayInvoiceNo(sendOrder)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-deep-forest/50">{t('customer_label')}</span>
                  <span className="font-medium text-deep-forest">{sendOrder.to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-deep-forest/50">{t('grand_total_label')}</span>
                  <span className="font-bold text-sunshine">
                    RM {(sendOrder.totalAmount || sendOrder.meals.reduce((sum, meal) => {
                      const price = sendOrder.prices?.[meal] || 0;
                      return sum + (price * sendOrder.quantity);
                    }, 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-5">
                {/* Email Option */}
                <div className="p-4 rounded-xl border border-sunshine/10 bg-cream dark:bg-background/20 space-y-4">
                  <div className="flex items-center gap-2 font-semibold text-deep-forest">
                    <Mail className="w-4 h-4 text-sunshine" />
                    <span>{t('option_email')}</span>
                  </div>
                  <p className="text-xs text-deep-forest/60">
                    {t('email_desc')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="send-email-input" className="text-xs text-deep-forest/50">
                      {t('recipient_email')}
                    </Label>
                    <Input
                      id="send-email-input"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="bg-cream dark:bg-background/50 border-sunshine/20 text-deep-forest focus:border-sunshine/50 h-10 text-sm"
                      placeholder="customer@email.com"
                    />
                  </div>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !recipientEmail}
                    className="w-full bg-sunshine text-charcoal font-semibold hover:bg-[#E0BC74] transition-all duration-200 h-10 text-sm"
                  >
                    {sendingEmail ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('sending')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        <Mail className="w-4 h-4" />
                        {t('send_invoice_email')}
                      </span>
                    )}
                  </Button>
                </div>

                {/* WhatsApp Option */}
                <div className="p-4 rounded-xl border border-sunshine/10 bg-cream dark:bg-background/20 space-y-4">
                  <div className="flex items-center gap-2 font-semibold text-deep-forest">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>{t('option_whatsapp')}</span>
                  </div>
                  <p className="text-xs text-deep-forest/60">
                    {t('whatsapp_desc')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="send-phone-input" className="text-xs text-deep-forest/50">
                      {t('recipient_phone')}
                    </Label>
                    <Input
                      id="send-phone-input"
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="bg-cream dark:bg-background/50 border-sunshine/20 text-deep-forest focus:border-sunshine/50 h-10 text-sm"
                      placeholder="e.g. 0123456789"
                    />
                  </div>
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={!recipientPhone}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-200 h-10 text-sm"
                  >
                    <span className="flex items-center gap-2 justify-center">
                      <MessageSquare className="w-4 h-4" />
                      {t('open_whatsapp')}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsSendDialogOpen(false)}
              className="border-sunshine/30 text-deep-forest hover:bg-sunshine/10 w-full md:w-auto text-sm"
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-cream dark:bg-card border-sunshine/20 text-deep-forest flex flex-col p-6">
          <DialogHeader className="pb-2 border-b border-sunshine/10 flex-shrink-0">
            <DialogTitle className="text-xl font-display font-bold text-sunshine">
              {previewFileName || 'PDF Preview'}
            </DialogTitle>
            <DialogDescription>
              {t('pdf_preview_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 bg-cream dark:bg-background/50 rounded-lg overflow-hidden relative my-4 border border-sunshine/10">
            {previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                title="PDF Preview Frame"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-deep-forest/40">
                {t('loading') || 'Loading preview...'}
              </div>
            )}
          </div>

          {/* Mobile / Sandbox Preview Tip Box */}
          <div className="mb-4 p-4 bg-sunshine/5 border border-sunshine/10 rounded-xl text-xs text-deep-forest/70 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-sunshine">
              <span>💡</span>
              {language === 'bm' ? 'Nota Pratonton PDF:' : 'PDF Preview Note:'}
            </p>
            <p className="leading-relaxed text-[11px]">
              {language === 'bm' 
                ? 'Pratonton dalam talian mungkin kelihatan kosong pada peranti mudah alih atau dalam kotak pasir. Ini adalah perkara biasa. Sila klik butang Muat Turun di bawah untuk melihat atau menyimpan PDF anda.' 
                : 'Inline previews may appear blank on mobile devices or inside sandboxed environments. This is normal behavior. Please click the Download/Share button below to view or save your PDF.'}
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-sunshine/10 justify-end flex-shrink-0">
            <Button
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  try {
                    let base64data = '';
                    if (previewPdfUrl.startsWith('data:')) {
                      base64data = previewPdfUrl.split(',')[1];
                    } else {
                      // Promisified fallback in case it's a blob/web URL
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
                      description: language === 'bm' ? 'Invois berjaya dibuka untuk perkongsian.' : 'Invoice shared successfully via native share.',
                      variant: 'success'
                    });
                  } catch (err) {
                    console.error('Failed to download/share PDF natively:', err);
                    toast({
                      title: 'Error',
                      description: 'Failed to share PDF: ' + (err instanceof Error ? err.message : String(err)),
                      variant: 'error'
                    });
                  }
                } else {
                  // Standard web browser fallback download
                  const link = document.createElement('a');
                  link.href = previewPdfUrl;
                  link.download = previewFileName;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              className="bg-sunshine text-charcoal font-semibold hover:bg-[#E0BC74]"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {t('download')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsPreviewOpen(false);
                setPreviewPdfUrl('');
              }}
              className="border-sunshine/30 text-deep-forest hover:bg-sunshine/10"
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
