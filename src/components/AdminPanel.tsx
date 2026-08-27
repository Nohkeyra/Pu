import { useState, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  RefreshCw,
  Table,
  Utensils as UtensilsIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import WawasanLoader from '@/components/WawasanLoader';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { getApiUrl } from '@/lib/api';
import type { Order } from '@/types';
import { AdminHeader } from './admin/AdminHeader';
import { AdminOrdersTab } from './admin/AdminOrdersTab';
import { AdminTablesTab } from './admin/AdminTablesTab';
import AdminMenuTab from './admin/AdminMenuTab';
import { AdminStatsCards } from './admin/AdminStatsCards';
import { filterAdminOrders } from '@/lib/adminOrderFilters';

// Hooks
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useAdminPdf } from '@/hooks/useAdminPdf';
import { useAdminMessaging } from '@/hooks/useAdminMessaging';

const OrderDetailModal = lazy(() => import('./admin/OrderDetailModal').then(m => ({ default: m.OrderDetailModal })));
const SendInvoiceModal = lazy(() => import('./admin/SendInvoiceModal').then(m => ({ default: m.SendInvoiceModal })));
const AdminPdfShareModal = lazy(() => import('./admin/AdminPdfShareModal').then(m => ({ default: m.AdminPdfShareModal })));

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

  const {
    orders,
    loading,
    isApproving,
    setIsApproving,
    fetchOrders,
    handleUpdateOrderStatus,
    handleDeleteOrder,
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

    const invoiceNo = order.invoiceNo || `RW-${orderId.substring(0, 6).toUpperCase()}`;
    const success = await handleUpdateOrderStatus(orderId, {
      prices: mealPrices,
      totalAmount: Math.round(total * 100) / 100,
      invoiceNo,
      status: order.status === 'billed' ? 'billed' : 'approved',
      approvedAt: order.approvedAt || new Date().toISOString(),
    }, t('order_approved'));

    if (success) {
      handleDownloadPDF({ ...order, prices: mealPrices, totalAmount: total, invoiceNo }, true);
      setPrices({});
      setSelectedOrder(null);
      setIsDetailOpen(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    if (order.status === 'approved' && order.prices) {
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

  const getStatusBadge = (status?: string) => {
    const s = status ? status.toLowerCase() : '';
    switch (s) {
      case 'cancel_requested':
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold animate-pulse shadow-sm">{t('cancel_requested')}</Badge>;
      case 'billed':
        return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">{t('billed')}</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{t('approved')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-stone/15 text-stone dark:text-stone-300 border-stone/20">{t('cancelled')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">{t('rejected')}</Badge>;
      case 'in_transit':
        return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 animate-pulse">{language === 'bm' ? 'Dalam Perjalanan' : 'In Transit'}</Badge>;
      case 'delivered':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{language === 'bm' ? 'Dihantar' : 'Delivered'}</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">{t('pending')}</Badge>;
    }
  };

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
    <div className="min-h-screen bg-cream dark:bg-background grid grid-cols-1 lg:grid-cols-[280px_1fr] grid-rows-[auto_auto_1fr] lg:grid-rows-[auto_1fr] [grid-template-areas:'header''nav''content'] lg:[grid-template-areas:'header_header''nav_content'] relative">
      <motion.div 
        className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
        animate={{ 
          y: isRefreshing ? 20 : Math.min(pullDistance - 40, 20),
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
        syncStatus="connected"
        language={language}
        theme={theme}
        toggleTheme={toggleTheme}
        navigate={navigate}
        t={t}
        adminToken={adminToken}
        onLogout={() => onLogout?.()}
        getApiUrl={getApiUrl}
      />

      <nav className="[grid-area:nav] p-3 sm:p-4 lg:p-8 bg-stone/5 dark:bg-card/20 border-b lg:border-b-0 lg:border-r border-stone/15 dark:border-white/10 relative overflow-hidden flex flex-col justify-start">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Batik3DMotion maxRotation={10} imgClassName="opacity-[0.06] dark:opacity-[0.1]" mode="background" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <p className="hidden lg:block microcopy-12 font-black text-[var(--color-sunshine-cta)] uppercase tracking-widest mb-4">
            {language === 'en' ? 'Administrative' : 'Pentadbiran'}
          </p>
          <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-none pr-4 lg:pr-0">
            {[
              { id: 'orders' as const, label: t('orders'), icon: FileText, onClick: () => setActiveTab('orders'), badge: cancelRequests.length > 0 ? <Badge className="ml-auto bg-amber-500 text-stone-950">{cancelRequests.length}</Badge> : null },
              { id: 'tables' as const, label: 'Tables View', icon: Table, onClick: () => setActiveTab('tables') },
              { id: 'menu' as const, label: language === 'en' ? 'Menu Manager' : 'Pengurus Menu', icon: UtensilsIcon, onClick: () => setActiveTab('menu') },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`px-4 sm:px-5 py-3 font-bold text-xs sm:text-sm flex items-center gap-2.5 sm:gap-3 rounded-xl transition-all duration-200 relative z-10 whitespace-nowrap shrink-0 ${
                    isActive ? 'text-[var(--color-sunshine-cta)]' : 'text-deep-forest/70 dark:text-stone/70 hover:bg-stone/10'
                  }`}
                >
                  {isActive && <motion.div layoutId="adminActiveTab" className="absolute inset-0 bg-[var(--color-sunshine-cta)]/20 rounded-xl border border-[var(--color-sunshine-cta)]/40 z-0" />}
                  <Icon className="w-4 h-4 z-10" />
                  <span className="z-10">{tab.label}</span>
                  {tab.badge}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <motion.main className="[grid-area:content] p-4 sm:p-6 md:p-8 min-w-0 relative">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-deep-forest mb-2">
            {activeTab === 'orders' ? t('orders') : activeTab === 'menu' ? (language === 'en' ? 'Menu Manager' : 'Pengurus Menu') : 'Submissions Table'}
          </h1>
          <p className="text-deep-forest/50 text-sm">
            {activeTab === 'orders' ? t('orders_subtitle') : 'Jotform-style submission grid with customizable columns.'}
          </p>
        </div>

        {activeTab === 'orders' && (
          <>
            <AdminStatsCards orders={orders} t={t} language={language} />
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
              handleRejectCancellation={(id) => handleUpdateOrderStatus(id, { status: 'approved' }, 'Cancellation rejected')}
              handleGenerateConsolidatedInvoice={(notes, inv) => handleGenerateConsolidatedInvoice(orders.filter(o => o.id && selectedOrderIds.has(o.id)), notes, inv)}
              authHeaders={authHeaders}
              getApiUrl={getApiUrl}
              fetchOrders={() => fetchOrders(true)}
              toast={toast}
              setIsApproving={setIsApproving}
            />
          </>
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
              handleUpdateStatus={(id: string, status: string) => { handleUpdateOrderStatus(id, { status: status as any }, `Status updated to ${status}`); }}
              openSendDialog={openSendDialog}
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
