import { calculateOrderCharges, isSelfPickup, validCharge, validServiceRate } from '@/lib/orderCharges';
import {
  useRememberedState,
  useRememberedPageScroll,
  adminViewScope,
  clearRememberedViews,
} from '@/hooks/ui/useRememberedView';
import { OrderReadingCard } from './OrderReadingCard';
import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { usePullToRefresh } from '@/hooks/ui/usePullToRefresh';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { AlertTriangle, ArrowRight, CalendarDays, Ellipsis, FileText, House, RefreshCw, Utensils, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { TransparentLogo } from '@/components/brand/TransparentLogo';
import { getApiUrl } from '@/lib/api';
import type { Order } from '@/types';
import { AdminHeader } from './AdminHeader';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminTablesTab } from './AdminTablesTab';
import AdminMenuTab from './AdminMenuTab';
import { AdminOverview } from './AdminOverview';
import { AdminOrderSearch, type AdminOrderLayout, type AdminOrderSearchState } from './AdminOrderSearch';
import { getMalaysiaTodayISO } from '@/lib/adminKpiStats';
import { filterAdminOrders, getAdminConflictOrderIds, getAdminOfficialInvoiceNo, matchesAdminOrderFilter, type AdminScheduleRange } from '@/lib/adminOrderFilters';
import { getAssetUrl, getDisplayInvoiceNo } from '@/lib/utils';
import '../ui/presentation.css';
import './admin-panel.css';

// Hooks
import { useAdminOrders } from '@/hooks/admin/useAdminOrders';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAdminPdf } from '@/hooks/admin/useAdminPdf';
import { useAdminMessaging } from '@/hooks/admin/useAdminMessaging';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const OrderDetailModal = lazyWithRetry(
  () => import('./OrderDetailModal').then((m) => ({ default: m.OrderDetailModal })),
  'OrderDetailModal'
);
const SendInvoiceModal = lazyWithRetry(
  () => import('./SendInvoiceModal').then((m) => ({ default: m.SendInvoiceModal })),
  'SendInvoiceModal'
);
const AdminPdfShareModal = lazyWithRetry(
  () => import('./AdminPdfShareModal').then((m) => ({ default: m.AdminPdfShareModal })),
  'AdminPdfShareModal'
);
const DeliveryMap = lazyWithRetry(
  () => import('../delivery/DeliveryMap').then((m) => ({ default: m.DeliveryMap })),
  'DeliveryMap'
);

const adminDestinations = [
  { id: 'today', icon: House },
  { id: 'orders', icon: FileText },
  { id: 'schedule', icon: CalendarDays },
  { id: 'more', icon: Ellipsis },
] as const;

type AdminDestination = (typeof adminDestinations)[number]['id'] | 'menu';

export default function AdminPanel({
  adminToken,
  onLogout,
}: {
  adminToken?: string;
  onLogout?: () => void | Promise<void>;
}) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view');
  const activeTab = view === 'orders' || view === 'schedule' || view === 'more' || view === 'menu' ? view : 'today';
  const currentDestination = activeTab === 'menu' ? 'more' : activeTab;
  const mainRef = useRef<HTMLDivElement>(null);
  const focusDestination = useRef(false);
  const goTo = (next: AdminDestination) => {
    if (next === activeTab) return;
    focusDestination.current = true;
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next === 'today') params.delete('view');
      else params.set('view', next);
      return params;
    });
  };
  useEffect(() => {
    if (focusDestination.current) {
      mainRef.current?.focus({ preventScroll: true });
      focusDestination.current = false;
    }
  }, [activeTab]);

  const [today, setToday] = useState(() => getMalaysiaTodayISO());
  useEffect(() => {
    const updateToday = () => setToday(getMalaysiaTodayISO());
    const timer = window.setInterval(updateToday, 30_000);
    document.addEventListener('visibilitychange', updateToday);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateToday);
    };
  }, []);
  const [scheduleRange, setScheduleRange] = useState<AdminScheduleRange>('today');
  const viewScope = adminViewScope(adminToken);
  const [readingOrder, setReadingOrder] = useState<Order | null>(null);
  const logout = async () => {
    await onLogout?.();
    clearRememberedViews(viewScope);
  };

  const {
    orders,
    conflicts,
    loading,
    ordersError,
    isApproving,
    fetchOrders,
    fetchConflicts,
    dismissConflict,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleBatchDelete,
    authHeaders,
  } = useAdminOrders({
    adminToken,
    onLogout: () => {
      void logout();
    },
    toast,
    t,
    language,
  });

  const {
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
    handleGenerateConsolidatedInvoice,
  } = useAdminPdf({ t, language, toast, authHeaders });

  const {
    isSendDialogOpen,
    setIsSendDialogOpen,
    sendOrder,
    recipientEmail,
    setRecipientEmail,
    recipientPhone,
    setRecipientPhone,
    submissionMode,
    setSubmissionMode,
    collectorEligible,
    setCollectorEligible,
    supportingFiles,
    addSupportingFiles,
    removeSupportingFile,
    sendingEmail,
    emailPreview,
    emailPdfUrl,
    preparingEmail,
    prepareEmailPreview,
    openEmailAttachment,
    openSendDialog: openInvoiceSender,
    handleSendEmail,
    handleSendWhatsApp,
  } = useAdminMessaging({ t, language, toast, authHeaders, getDisplayInvoiceNo });

  const detailOrigin = useRef<HTMLElement | null>(null);
  const trackingOrigin = useRef<HTMLElement | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const openSendDialog = (order: Order) => {
    setIsDetailOpen(false);
    openInvoiceSender(order);
  };
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  useEffect(() => {
    const openRequestedOrder = () => {
      const requested = sessionStorage.getItem('wawasan_open_rider_order');
      const match = requested ? orders.find((order) => order.id === requested) : null;
      if (match) {
        sessionStorage.removeItem('wawasan_open_rider_order');
        setTrackingOrder(match);
      }
    };
    openRequestedOrder();
    window.addEventListener('rider:open-order', openRequestedOrder);
    return () => window.removeEventListener('rider:open-order', openRequestedOrder);
  }, [orders]);

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [serviceRate, setServiceRate] = useState('0');
  const [statusFilter, setStatusFilter] = useRememberedState<string>(
    viewScope + ':statusFilter',
    'all'
  );
  const [dateFromFilter, setDateFromFilter] = useRememberedState<string>(
    viewScope + ':dateFromFilter',
    ''
  );
  const [dateToFilter, setDateToFilter] = useRememberedState<string>(
    viewScope + ':dateToFilter',
    ''
  );
  const [search, setSearch] = useRememberedState<string>(viewScope + ':orders:search', '');
  const [clientFilter, setClientFilter] = useRememberedState<string>(viewScope + ':tables:clientFilter', 'all');
  const [tablePage, setTablePage] = useRememberedState<number>(viewScope + ':tables:currentPage', 1);
  const [preferredLayout, setPreferredLayout] = useRememberedState<AdminOrderLayout | 'auto'>(viewScope + ':orders:layout', 'auto');
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const layout = preferredLayout === 'auto' ? (compact ? 'list' : 'table') : preferredLayout;
  const setOrderFilters = (filters: Partial<AdminOrderSearchState>) => {
    setTablePage(1);
    if (filters.search !== undefined) setSearch(filters.search);
    if (filters.status !== undefined) setStatusFilter(filters.status);
    if (filters.client !== undefined) setClientFilter(filters.client);
    if (filters.from !== undefined) setDateFromFilter(filters.from);
    if (filters.to !== undefined) setDateToFilter(filters.to);
  };
  const openFilteredOrders = (filter: string) => {
    if (filter !== 'all') setOrderFilters({ status: filter, search: '', client: 'all', from: '', to: '' });
    goTo('orders');
  };

  useRememberedPageScroll(viewScope + ':' + activeTab + ':scroll', !loading);

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [filterBySameEmail, setFilterBySameEmail] = useState(true);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    enabled: !loading,
    onRefresh: async () => {
      await Promise.all([fetchOrders(true), fetchConflicts()]);
    },
  });

  const [calendarState, setCalendarState] = useState<{
    ok: boolean;
    error?: string;
    loading: boolean;
  }>({
    ok: false,
    loading: Boolean(adminToken),
  });

  useEffect(() => {
    if (!adminToken) {
      setCalendarState({ ok: false, loading: false });
      return;
    }
    const controller = new AbortController();
    setCalendarState((prev) => ({ ...prev, loading: true }));
    fetch(getApiUrl('/api/diagnostics/calendar'), {
      headers: { Authorization: `Bearer ${adminToken}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (controller.signal.aborted) return;
        setCalendarState({
          ok: Boolean(res.ok && data?.ok),
          error: data?.message || data?.error,
          loading: false,
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setCalendarState({
          ok: false,
          error: err instanceof Error ? err.message : 'Calendar diagnostic failed',
          loading: false,
        });
      });

    return () => controller.abort();
  }, [adminToken]);

  const handleApprove = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const safeMeals = Array.isArray(order.meals) ? order.meals : [];
    const rawQty = Number(order.quantity ?? order.guests ?? 0);
    const safeQty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 0;

    if (safeMeals.length === 0 || safeQty <= 0) {
      toast({
        title: language === 'bm' ? 'Data Tidak Lengkap' : 'Incomplete Order Data',
        description:
          language === 'bm'
            ? 'Pesanan mesti mempunyai hidangan dan bilangan pax yang sah.'
            : 'Order must have at least one meal and a positive guest count.',
        variant: 'warning',
      });
      return;
    }

    let total = 0;
    const mealPrices: Record<string, number> = {};
    for (const meal of safeMeals) {
      const price = parseFloat(prices[meal] || '0');
      if (!Number.isFinite(price) || price <= 0) {
        toast({
          title: language === 'bm' ? 'Harga Tidak Sah' : 'Invalid Unit Price',
          description:
            language === 'bm'
              ? 'Setiap hidangan mesti mempunyai harga positif melebihi RM 0.00.'
              : 'Each meal must have a positive unit price greater than RM 0.00.',
          variant: 'warning',
        });
        return;
      }
      const roundedPrice = Math.round(price * 100) / 100;
      mealPrices[meal] = roundedPrice;
      total += roundedPrice * safeQty;
    }

    const deliveryCharge = isSelfPickup(order.delivery) ? 0 : Number(deliveryFee);
    const serviceChargeRate = order.preparationType === 'buffet' ? Number(serviceRate) : 0;
    if (!validCharge(deliveryCharge) || !validServiceRate(serviceChargeRate)) {
      toast({ title: language === 'bm' ? 'Caj tidak sah' : 'Invalid charges', variant: 'warning' });
      return;
    }
    const charges = calculateOrderCharges(total, { ...order, deliveryCharge, serviceChargeRate });
    const existingNonQtInvoiceNo =
      order.invoiceNo && !order.invoiceNo.startsWith('QT') ? order.invoiceNo : undefined;
    let allocatedInvoiceNo = existingNonQtInvoiceNo;

    const success = await handleUpdateOrderStatus(
      orderId,
      {
        prices: mealPrices,
        deliveryCharge: charges.deliveryCharge,
        serviceChargeRate: charges.serviceChargeRate,
        serviceChargeAmount: charges.serviceChargeAmount,
        totalAmount: charges.totalAmount,
        ...(existingNonQtInvoiceNo ? { invoiceNo: existingNonQtInvoiceNo } : {}),
        status: 'billed',
        approvedAt: order.approvedAt || new Date().toISOString(),
        billedAt: order.billedAt || new Date().toISOString(),
      },
      language === 'bm' ? 'Harga Ditetapkan & Invois Dihasilkan' : 'Pricing Set & Order Billed',
      (saved) => {
        if (saved.invoiceNo) allocatedInvoiceNo = saved.invoiceNo;
      }
    );

    if (success) {
      handleDownloadPDF(
        {
          ...order,
          prices: mealPrices,
          deliveryCharge: charges.deliveryCharge,
          serviceChargeRate: charges.serviceChargeRate,
          serviceChargeAmount: charges.serviceChargeAmount,
          totalAmount: charges.totalAmount,
          invoiceNo: allocatedInvoiceNo || getDisplayInvoiceNo(order),
          status: 'billed',
        },
        true
      );
      setPrices({});
      setSelectedOrder(null);
      setIsDetailOpen(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    detailOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedOrder(order);
    setDeliveryFee(String(isSelfPickup(order.delivery) ? 0 : order.deliveryCharge ?? 0));
    setServiceRate(String(order.preparationType === 'buffet' ? order.serviceChargeRate ?? 0 : 0));
    if (order.prices && Object.keys(order.prices).length > 0) {
      const priceStrings = Object.keys(order.prices).reduce(
        (acc, key) => {
          acc[key] = order.prices![key].toString();
          return acc;
        },
        {} as Record<string, string>
      );
      setPrices(priceStrings);
    } else {
      setPrices({});
    }
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status?: string) => (
    <OrderStatusBadge status={status} language={language} />
  );

  const conflictIds = useMemo(() => getAdminConflictOrderIds(conflicts), [conflicts]);
  const filteredOrders = useMemo(() => filterAdminOrders({
    orders, searchTerm: search, statusFilter, clientFilter, dateFromFilter, dateToFilter, today, conflictIds,
  }), [orders, search, statusFilter, clientFilter, dateFromFilter, dateToFilter, today, conflictIds]);
  const clients = useMemo(() => [...new Set(orders.map((order) => order.to).filter(Boolean))].sort(), [orders]);
  const cancelRequests = filteredOrders.filter((order) => matchesAdminOrderFilter(order, 'cancel_requested', today));
  const showOrderData = (!loading && !ordersError) || orders.length > 0;
  const effectiveOrder = selectedOrder?.id
    ? orders.find((order) => order.id === selectedOrder.id) ?? selectedOrder
    : selectedOrder;
  const overviewProps = {
    orders, today, range: scheduleRange, onRangeChange: setScheduleRange, conflictIds,
    onOpenOrder: openOrderDetail,
    onOpenOrders: openFilteredOrders,
    onOpenDelivery: (order: Order) => {
      trackingOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setTrackingOrder(order);
    },
    onOpenSchedule: () => goTo('schedule'),
  };
  const navigation = (
    <nav className="admin-destinations" aria-label={t('admin_nav')}>
      {adminDestinations.map(({ id, icon: Icon }) => (
        <button key={id} type="button" aria-current={currentDestination === id ? 'page' : undefined}
          onClick={() => goTo(id)}>
          <Icon size={19} aria-hidden="true" /> <span>{t(`admin_${id}`)}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="wawasan-admin-shell">
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
        animate={{
          y: reduceMotion ? 0 : isRefreshing ? 20 : Math.max(0, Math.min(pullDistance - 40, 20)),
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          scale: reduceMotion || pullDistance > 10 || isRefreshing ? 1 : 0.8,
        }}
        transition={reduceMotion ? { duration: 0 } : undefined}
      >
        <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-[var(--color-sunshine-cta)]/20 flex items-center gap-2">
          <RefreshCw
            className={`w-4 h-4 text-[var(--color-sunshine-cta)] ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {isRefreshing && (
            <span className="microcopy-12-upper font-black text-[var(--color-sunshine-cta)]">
              {t('admin_refreshing')}
            </span>
          )}
        </div>
      </motion.div>

      <aside className="wawasan-admin-sidebar">
        <button type="button" className="admin-brand" onClick={() => goTo('today')}>
          <TransparentLogo src={getAssetUrl('/assets/brand/wawasan_logo.png')} alt="" className="admin-brand-logo" />
          <span className="font-artistic">Restoran Wawasan</span>
        </button>
        {navigation}
        <div className="admin-rail-batik" aria-hidden="true" />
      </aside>

      <AdminHeader
        language={language}
        theme={theme}
        toggleTheme={toggleTheme}
        calendarState={calendarState}
        navigate={navigate}
        t={t}
        title={t(`admin_${activeTab}`)}
        onToggleLanguage={() => setLanguage(language === 'bm' ? 'en' : 'bm')}
        onRefresh={() => { void Promise.all([fetchOrders(true), fetchConflicts()]); }}
        refreshDisabled={loading}
        onLogout={logout}
      />

      <div id="admin-content" ref={mainRef} tabIndex={-1} className="wawasan-admin-content">
        {activeTab === 'menu' && (
          <button className="admin-text-button" type="button" onClick={() => goTo('more')}>{t('admin_back_more')}</button>
        )}
        {(activeTab !== 'today' || !showOrderData) && (
          <div className="admin-page-heading">
            <h1>{t(`admin_${activeTab}`)}</h1>
            {activeTab === 'schedule' && <p>{t('admin_schedule_description')}</p>}
            {activeTab === 'menu' && <p>{t('admin_menu_description')}</p>}
          </div>
        )}
        {activeTab !== 'menu' && activeTab !== 'more' && loading && !showOrderData && (
          <div className="admin-loading" role="status"><WawasanLoader size={65} /><p>{t('admin_loading')}</p></div>
        )}
        {activeTab !== 'menu' && activeTab !== 'more' && ordersError && (
          <ErrorState
            title={t('admin_orders_unavailable')}
            description={t(orders.length > 0 ? 'admin_orders_retained' : 'admin_orders_retry')}
            onRetry={() => { void fetchOrders(); }}
            retryLabel={t('admin_retry')}
            className="mb-3"
          />
        )}
        {activeTab === 'today' && showOrderData && <AdminOverview {...overviewProps} compact />}
        {activeTab === 'schedule' && showOrderData && <AdminOverview {...overviewProps} />}
        {activeTab === 'more' && (
          <div className="admin-more">
            <section className="admin-overview-panel admin-more-card">
              <Utensils aria-hidden="true" size={22} />
              <div><h2>{t('admin_menu')}</h2><p>{t('admin_menu_description')}</p></div>
              <button type="button" className="admin-text-button" onClick={() => goTo('menu')}>
                {t('admin_open_menu')} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </section>
            <section className="admin-overview-panel admin-more-card">
              <FileText aria-hidden="true" size={22} />
              <div>
                <h2>{t('admin_filter_invoiced')}</h2>
                <p>{t('admin_invoiced_description')}</p>
                {showOrderData && !ordersError && (
                  <dl className="admin-invoice-counts">
                    <div><dt>{t('admin_billed_count')}</dt><dd>{orders.filter((order) => matchesAdminOrderFilter(order, 'invoiced', today)).length}</dd></div>
                    <div><dt>{t('admin_official_invoice_count')}</dt><dd>{new Set(orders.filter((order) => !order.deletedByAdmin).map(getAdminOfficialInvoiceNo).filter(Boolean)).size}</dd></div>
                  </dl>
                )}
              </div>
              <button type="button" className="admin-text-button" onClick={() => openFilteredOrders('invoiced')}>
                {t('admin_open_orders')} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </section>
          </div>
        )}

        {activeTab === 'orders' && showOrderData && (
          <AdminOrderSearch
            filters={{ search, status: statusFilter, client: clientFilter, from: dateFromFilter, to: dateToFilter }}
            onChange={setOrderFilters}
            clients={clients}
            resultCount={filteredOrders.length}
            layout={layout}
            onLayoutChange={(mode) => {
              if (selectedOrderIds.size > 0 && mode === 'list') setIsSelectMode(true);
              setPreferredLayout(mode);
            }}
          />
        )}
        {activeTab === 'orders' && statusFilter === 'conflict' && conflicts.length > 0 && (
          <section aria-label={t('admin_filter_conflict')} className="mb-3 space-y-2">
            {conflicts.map((conflict) => {
              const targetOrder = orders.find((o) => o.id === conflict.orderId);
              const priceSummary = conflict.submittedPrices
                ? Object.entries(conflict.submittedPrices)
                    .map(([meal, val]) => `${meal}: RM ${Number(val).toFixed(2)}`)
                    .join(', ')
                : '';
              return (
                <div
                  key={conflict.id}
                  role="alert"
                  className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 text-xs sm:text-sm text-stone-800 dark:text-stone-100">
                      <p className="font-bold">
                        {language === 'bm' ? 'Konflik Penyegerakan Harga Luar Talian' : 'Offline Pricing Sync Conflict'}
                        {' — '}
                        {conflict.customerName || conflict.orderId}
                        {conflict.invoiceNo ? ` (${conflict.invoiceNo})` : ''}
                      </p>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                        {conflict.reason ||
                          (language === 'bm'
                            ? 'Rekod pelayan mempunyai kemas kini yang lebih baharu; perubahan luar talian ditolak.'
                            : 'Server record had a newer timestamp; stale offline pricing submission was rejected.')}
                        {priceSummary ? ` [${priceSummary}]` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {targetOrder && (
                      <button
                        type="button"
                        onClick={() => openOrderDetail(targetOrder)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        {language === 'bm' ? 'Semak Pesanan' : 'Review Order'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void dismissConflict(conflict.id);
                      }}
                      aria-label={language === 'bm' ? 'Tutup amaran konflik' : 'Dismiss conflict alert'}
                      className="p-1.5 rounded-lg border border-stone-300 dark:border-white/15 text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
        {activeTab === 'orders' && layout === 'list' && showOrderData && (
          <AdminOrdersTab
            viewScope={viewScope}
            onReadOrder={setReadingOrder}
            t={t}
            language={language}
            orders={orders}
            filteredOrders={filteredOrders}
            hasSearch={Boolean(search.trim())}
            cancelRequests={statusFilter === 'cancel_requested' ? cancelRequests : []}
            isSelectMode={isSelectMode}
            setIsSelectMode={setIsSelectMode}
            filterBySameEmail={filterBySameEmail}
            setFilterBySameEmail={setFilterBySameEmail}
            selectedOrderIds={selectedOrderIds}
            setSelectedOrderIds={setSelectedOrderIds}
            getStatusBadge={getStatusBadge}
            handleToggleOrderSelect={(id) => {
              if (!id) return;
              setSelectedOrderIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            openOrderDetail={openOrderDetail}
            openSendDialog={openSendDialog}
            handleDelete={handleDeleteOrder}
            handleBatchDelete={handleBatchDelete}
            handleRejectCancellation={(id) =>
              handleUpdateOrderStatus(id, { status: 'approved' }, 'Cancellation rejected')
            }
            handleUpdateStatus={(id, status) =>
              handleUpdateOrderStatus(id, { status: status as any }, `Status updated to ${status}`)
            }
            toast={toast}
          />
        )}

        {activeTab === 'orders' && layout === 'table' && showOrderData && (
          <AdminTablesTab
            viewScope={viewScope}
            onReadOrder={setReadingOrder}
            orders={orders}
            filteredOrders={filteredOrders}
            selectedIds={selectedOrderIds}
            currentPage={tablePage}
            setCurrentPage={setTablePage}
            setSelectedIds={setSelectedOrderIds}
            language={language as 'en' | 'bm'}
            openOrderDetail={openOrderDetail}
            handlePreviewPDF={handlePreviewPDF}
            handleDownloadPDF={handleDownloadPDF}
            handleDelete={handleDeleteOrder}
            fetchOrders={() => fetchOrders(true)}
            authHeaders={authHeaders}
            getApiUrl={getApiUrl}
            toast={toast}
            onSendInvoice={openSendDialog}
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

        <OrderReadingCard
          order={readingOrder}
          language={language}
          onClose={() => setReadingOrder(null)}
        />
        <Suspense fallback={null}>
          {isDetailOpen && effectiveOrder && (
            <OrderDetailModal
              onReadOrder={setReadingOrder}
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
              selectedOrder={effectiveOrder}
              t={t}
              language={language}
              prices={prices}
              setPrices={setPrices}
              deliveryFee={deliveryFee}
              setDeliveryFee={setDeliveryFee}
              serviceRate={serviceRate}
              setServiceRate={setServiceRate}
              getStatusBadge={getStatusBadge}
              isApproving={isApproving}
              handleCancelOrderAdmin={(id: string) => {
                handleUpdateOrderStatus(id, { status: 'cancelled' }, 'Order cancelled');
              }}
              handleRejectCancellation={(id: string) => {
                handleUpdateOrderStatus(id, { status: 'approved' }, 'Cancellation rejected');
              }}
              handleApprove={(id: string) => {
                handleApprove(id);
              }}
              handleRejectOrder={(id: string) => {
                handleUpdateOrderStatus(id, { status: 'rejected' }, 'Order rejected');
              }}
              handleDeleteOrder={(id: string) => {
                handleDeleteOrder(id);
              }}
              handleUpdateStatus={(id: string, status: string) => {
                handleUpdateOrderStatus(
                  id,
                  { status: status as any },
                  `Status updated to ${status}`
                );
              }}
              openSendDialog={openSendDialog}
              handleTrack={(order) => {
                trackingOrigin.current = detailOrigin.current;
                setTrackingOrder(order);
              }}
              onPreviewInvoice={(order) => {
                setIsDetailOpen(false);
                void handlePreviewPDF(order, true);
              }}
            />
          )}
          {trackingOrder && (
            <DeliveryMap
              order={trackingOrder}
              isAdmin={true}
              onClose={() => {
                setTrackingOrder(null);
                const origin = trackingOrigin.current;
                trackingOrigin.current = null;
                if (origin) window.requestAnimationFrame(() => origin.focus({ preventScroll: true }));
              }}
              onUpdateStatus={async (id, status) => {
                const updated = await handleUpdateOrderStatus(
                  id,
                  { status: status as any },
                  `Status updated to ${status}`
                );
                if (!updated) throw new Error('Order status was not saved');
                setTrackingOrder((prev) => (prev ? { ...prev, status: status as any } : null));
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
              submissionMode={submissionMode}
              setSubmissionMode={setSubmissionMode}
              collectorEligible={collectorEligible}
              setCollectorEligible={setCollectorEligible}
              supportingFiles={supportingFiles}
              addSupportingFiles={addSupportingFiles}
              removeSupportingFile={removeSupportingFile}
              emailPreview={emailPreview}
              emailPdfUrl={emailPdfUrl}
              preparingEmail={preparingEmail}
              prepareEmailPreview={prepareEmailPreview}
              openEmailAttachment={openEmailAttachment}
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
      </div>
      <div className="admin-bottom-nav">{navigation}</div>
    </div>
  );
}
