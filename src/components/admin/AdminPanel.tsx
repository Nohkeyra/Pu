import { useEffect, useState, Suspense } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { usePullToRefresh } from '@/hooks/ui/usePullToRefresh';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  RefreshCw,
  Table,
  Utensils as UtensilsIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { Batik3DMotion } from '@/components/brand/Batik3DMotion';
import { getApiUrl } from '@/lib/api';
import type { Order } from '@/types';
import { AdminHeader } from './AdminHeader';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminTablesTab } from './AdminTablesTab';
import AdminMenuTab from './AdminMenuTab';
import { filterAdminOrders } from '@/lib/adminOrderFilters';
import { getDisplayInvoiceNo } from '@/lib/utils';
import '../ui/presentation.css';

// Hooks
import { useAdminOrders } from '@/hooks/admin/useAdminOrders';
import { useAdminPdf } from '@/hooks/admin/useAdminPdf';
import { useAdminMessaging } from '@/hooks/admin/useAdminMessaging';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const OrderDetailModal = lazyWithRetry(() => import('./OrderDetailModal').then(m => ({ default: m.OrderDetailModal })), 'OrderDetailModal');
const SendInvoiceModal = lazyWithRetry(() => import('./SendInvoiceModal').then(m => ({ default: m.SendInvoiceModal })), 'SendInvoiceModal');
const AdminPdfShareModal = lazyWithRetry(() => import('./AdminPdfShareModal').then(m => ({ default: m.AdminPdfShareModal })), 'AdminPdfShareModal');
const DeliveryMap = lazyWithRetry(() => import('../delivery/DeliveryMap').then(m => ({ default: m.DeliveryMap })), 'DeliveryMap');

export default function AdminPanel({ adminToken, onLogout }: { adminToken?: string; onLogout?: () => void | Promise<void> }) {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    orders,
    loading,
    isApproving,
    fetchOrders,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleBatchDelete,
    authHeaders
  } = useAdminOrders({ adminToken, onLogout: () => onLogout?.(), toast, t, language });

  const {
    generatingInvoice,
    isPreviewOpen,
    setIsPreviewOpen,
    previewPdfUrl,
    previewFileName,
    isGeneratingConsolidated,
    consolidatedInvoiceNo,
    setConsolidatedInvoiceNo,
    showConsolidateModal,
    setShowConsolidateModal,
    handlePreviewPDF,
    handleDownloadPDF,
    prepareConsolidateModal,
    handleGenerateConsolidatedInvoice
  } = useAdminPdf({ t, language, toast, authHeaders });

  const {
    isSendDialogOpen,
    setIsSendDialogOpen,
    sendOrder,
    recipientEmail,
    setRecipientEmail,
    recipientPhone,
    setRecipientPhone,
    sendingEmail,
    openSendDialog,
    handleSendEmail,
    handleSendWhatsApp
  } = useAdminMessaging({ t, language, toast, authHeaders, getDisplayInvoiceNo });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  useEffect(() => {
    const openRequestedOrder = () => {
      const requested = sessionStorage.getItem('wawasan_open_rider_order');
      const match = requested ? orders.find(order => order.id === requested) : null;
      if (match) { sessionStorage.removeItem('wawasan_open_rider_order'); setTrackingOrder(match); }
    };
    openRequestedOrder();
    window.addEventListener('rider:open-order', openRequestedOrder);
    return () => window.removeEventListener('rider:open-order', openRequestedOrder);
  }, [orders]);

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'menu'>('orders');

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [filterBySameEmail, setFilterBySameEmail] = useState(true);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchOrders(true);
    }
  });

  const handleApprove = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let total = 0;
    const mealPrices: Record<string, number> = {};
    order.meals.forEach(meal => {
      const price = parseFloat(prices[meal] || '0');
      const roundedPrice = Math.round(price * 100) / 100;
      mealPrices[meal] = roundedPrice;
      total += roundedPrice * order.quantity;
    });

    const updatedInvoiceNo = order.invoiceNo
      ? (order.invoiceNo.startsWith('QT') ? order.invoiceNo.replace(/^QT\s*/i, 'RW ') : order.invoiceNo)
      : undefined;

    const success = await handleUpdateOrderStatus(orderId, {
      prices: mealPrices,
      totalAmount: Math.round(total * 100) / 100,
      ...(updatedInvoiceNo ? { invoiceNo: updatedInvoiceNo } : {}),
      status: 'billed',
      approvedAt: order.approvedAt || new Date().toISOString(),
      billedAt: order.billedAt || new Date().toISOString(),
    }, language === 'bm' ? 'Harga Ditetapkan & Invois Dihasilkan' : 'Pricing Set & Order Billed');

    if (success) {
      handleDownloadPDF({ ...order, prices: mealPrices, totalAmount: total, invoiceNo: updatedInvoiceNo || getDisplayInvoiceNo(order), status: 'billed' }, true);
      setPrices({});
      setSelectedOrder(null);
      setIsDetailOpen(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    if (order.prices && Object.keys(order.prices).length > 0) {
      const priceStrings = Object.keys(order.prices).reduce((acc, key) => {
        acc[key] = order.prices![key].toString();
        return acc;
      }, {} as Record<string, string>);
      setPrices(priceStrings);
    } else {
      setPrices({});
    }
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status?: string) => <OrderStatusBadge status={status} language={language} />;

  const filteredOrders = filterAdminOrders({
    orders,
    searchTerm: '',
    statusFilter,
    clientFilter: 'all',
    dateFromFilter,
    dateToFilter,
  });

  const cancelRequests = orders.filter(o => o.status === 'cancel_requested');

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-3">
        <WawasanLoader size={80} />
        <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">Memuatkan...</p>
      </div>
    );
  }

  return (
    <div className="wawasan-admin-shell min-h-screen bg-cream dark:bg-background grid grid-cols-1 lg:grid-cols-[220px_1fr] grid-rows-[auto_auto_1fr] lg:grid-rows-[auto_1fr] [grid-template-areas:'header''nav''content'] lg:[grid-template-areas:'header_header''nav_content'] relative">
      <motion.div 
        className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
        animate={{ 
          y: isRefreshing ? 20 : Math.max(0, Math.min(pullDistance - 40, 20)),
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          scale: pullDistance > 10 || isRefreshing ? 1 : 0.8
        }}
      >
        <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-[var(--color-sunshine-cta)]/20 flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 text-[var(--color-sunshine-cta)] ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing && <span className="microcopy-12-upper font-black text-[var(--color-sunshine-cta)]">Refreshing</span>}
        </div>
      </motion.div>
 
      <AdminHeader
        language={language}
        theme={theme}
        toggleTheme={toggleTheme}
        navigate={navigate}
        t={t}
        adminToken={adminToken}
        onLogout={() => onLogout?.()}
        getApiUrl={getApiUrl}
      />
 
      <nav aria-label={language === 'bm' ? 'Navigasi pentadbiran' : 'Admin navigation'} className="wawasan-admin-sidebar [grid-area:nav] p-3 sm:p-4 lg:p-5 bg-stone-50/90 dark:bg-stone-900/40 border-b lg:border-b-0 lg:border-r border-stone/15 dark:border-white/10 relative overflow-hidden flex flex-col justify-start">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Batik3DMotion maxRotation={10} imgClassName="opacity-[0.06] dark:opacity-[0.1]" mode="background" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <p className="hidden lg:block text-xs font-black text-[var(--color-sunshine-cta)] uppercase tracking-wider mb-3">
            {language === 'en' ? 'Administrative' : 'Pentadbiran'}
          </p>
          <div className="app-admin-tabs flex flex-row lg:flex-col justify-center lg:justify-start gap-2 p-1 lg:p-0 bg-white dark:bg-card lg:bg-transparent rounded-2xl lg:rounded-none border border-stone-200/80 lg:border-0 dark:border-white/10 shadow-sm lg:shadow-none overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-none pr-4 lg:pr-0">
            {[
              { id: 'orders' as const, label: t('orders'), icon: FileText, onClick: () => setActiveTab('orders'), badge: cancelRequests.length > 0 ? <Badge className="ml-auto bg-amber-500 text-stone-950 px-1.5 py-0.5 text-xs font-bold">{cancelRequests.length}</Badge> : null },
              { id: 'tables' as const, label: language === 'en' ? 'Tables View' : 'Paparan Jadual', icon: Table, onClick: () => setActiveTab('tables') },
              { id: 'menu' as const, label: language === 'en' ? 'Menu Manager' : 'Pengurus Menu', icon: UtensilsIcon, onClick: () => setActiveTab('menu') },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={tab.onClick}
                  className={`px-3.5 py-2.5 font-bold text-xs flex items-center gap-2.5 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap shrink-0 cursor-pointer select-none ${
                    isActive 
                      ? 'bg-[var(--color-sunshine-cta)] text-[var(--ui-on-action)] shadow-md scale-[1.01]' 
                      : 'text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 z-10 shrink-0 ${isActive ? 'text-white' : 'text-stone'}`} />
                  <span className="app-admin-tab-label z-10">{tab.label}</span>
                  {tab.badge}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <motion.main className="wawasan-admin-content [grid-area:content] p-4 sm:p-6 lg:p-8 min-w-0 relative">
        <div className="wawasan-admin-heading mb-6">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-deep-forest dark:text-stone-100 mb-1 tracking-tight">
            {activeTab === 'orders' ? t('orders') : activeTab === 'menu' ? (language === 'en' ? 'Menu Manager' : 'Pengurus Menu') : (language === 'en' ? 'Submissions' : 'Senarai Permohonan')}
          </h1>
          <p className="text-deep-forest/60 dark:text-stone-400 text-xs sm:text-sm">
            {activeTab === 'orders' ? t('orders_subtitle') : activeTab === 'menu'
              ? (language === 'en' ? 'Manage your menu items, prices and visibility.' : 'Urus item menu, harga dan paparan pelanggan.')
              : (language === 'en' ? 'Search, review and manage submitted orders.' : 'Cari, semak dan urus pesanan yang diterima.')}
          </p>
        </div>

        {activeTab === 'orders' && (
          <AdminOrdersTab
            t={t}
            language={language}
            orders={orders}
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
            selectedOrderIds={selectedOrderIds}
            setSelectedOrderIds={setSelectedOrderIds}
            generatingInvoice={generatingInvoice}
            getStatusBadge={getStatusBadge}
            handleToggleOrderSelect={(id) => {
              if (!id) return;
              setSelectedOrderIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
              });
            }}
            openOrderDetail={openOrderDetail}
            openSendDialog={openSendDialog}
            handlePreviewPDF={handlePreviewPDF}
            handleDownloadPDF={handleDownloadPDF}
            handleDelete={handleDeleteOrder}
            handleBatchDelete={handleBatchDelete}
            handleRejectCancellation={(id) => handleUpdateOrderStatus(id, { status: 'approved' }, 'Cancellation rejected')}
            handleUpdateStatus={(id, status) => handleUpdateOrderStatus(id, { status: status as any }, `Status updated to ${status}`)}
            toast={toast}
          />
        )}

        {activeTab === 'tables' && (
          <AdminTablesTab
            orders={orders}
            language={language as 'en' | 'bm'}
            openOrderDetail={openOrderDetail}
            handlePreviewPDF={handlePreviewPDF}
            handleDownloadPDF={handleDownloadPDF}
            handleDelete={handleDeleteOrder}
            fetchOrders={() => fetchOrders(true)}
            authHeaders={authHeaders}
            getApiUrl={getApiUrl}
            toast={toast}
            prepareConsolidateModal={prepareConsolidateModal}
            consolidatedInvoiceNo={consolidatedInvoiceNo}
            setConsolidatedInvoiceNo={setConsolidatedInvoiceNo}
            showConsolidateModal={showConsolidateModal}
            setShowConsolidateModal={setShowConsolidateModal}
            isGeneratingConsolidated={isGeneratingConsolidated}
            handleGenerateConsolidatedInvoice={handleGenerateConsolidatedInvoice}
          />
        )}
        {activeTab === 'menu' && (
          <AdminMenuTab
            language={language as 'en' | 'bm'}
            authHeaders={authHeaders}
            getApiUrl={getApiUrl}
            toast={toast}
          />
        )}

        <Suspense fallback={null}>
          {isDetailOpen && selectedOrder && (
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
              handleCancelOrderAdmin={(id: string) => { handleUpdateOrderStatus(id, { status: 'cancelled' }, 'Order cancelled'); }}
              handleRejectCancellation={(id: string) => { handleUpdateOrderStatus(id, { status: 'approved' }, 'Cancellation rejected'); }}
              handleApprove={(id: string) => { handleApprove(id); }}
              handleRejectOrder={(id: string) => { handleUpdateOrderStatus(id, { status: 'rejected' }, 'Order rejected'); }}
              handleDeleteOrder={(id: string) => { handleDeleteOrder(id); }}
              handleUpdateStatus={(id: string, status: string) => { handleUpdateOrderStatus(id, { status: status as any }, `Status updated to ${status}`); }}
              openSendDialog={openSendDialog}
              handleTrack={(order) => setTrackingOrder(order)}
            />
          )}
          {trackingOrder && (
            <DeliveryMap
              order={trackingOrder}
              isAdmin={true}
              onClose={() => setTrackingOrder(null)}
              onUpdateStatus={async (id, status) => {
                const updated = await handleUpdateOrderStatus(id, { status: status as any }, `Status updated to ${status}`);
                if (!updated) throw new Error('Order status was not saved');
                setTrackingOrder(prev => prev ? { ...prev, status: status as any } : null);
              }}
            />
          )}
          {isSendDialogOpen && sendOrder && (
            <SendInvoiceModal
              isOpen={isSendDialogOpen}
              onClose={() => setIsSendDialogOpen(false)}
              sendOrder={sendOrder}
              recipientEmail={recipientEmail}
              setRecipientEmail={setRecipientEmail}
              recipientPhone={recipientPhone}
              setRecipientPhone={setRecipientPhone}
              sendingEmail={sendingEmail}
              handleSendEmail={handleSendEmail}
              handleSendWhatsApp={handleSendWhatsApp}
              t={t}
              language={language}
            />
          )}
          {isPreviewOpen && (
            <AdminPdfShareModal
              isOpen={isPreviewOpen}
              onClose={() => setIsPreviewOpen(false)}
              previewFileName={previewFileName}
              previewPdfUrl={previewPdfUrl}
              t={t}
              language={language}
              toast={toast}
            />
          )}
        </Suspense>
      </motion.main>
    </div>
  );
}

