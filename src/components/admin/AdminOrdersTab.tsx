import { useState } from 'react';
import {
  AlertTriangle, Check, Eye, Send, FileSpreadsheet, X, Star, Search, Inbox, Trash2,
  SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { formatDateTimeDisplay } from '@/lib/utils';
import type { Order } from '@/types';
import { AdminOrdersExportSheet } from './AdminOrdersExportSheet';
import { EmptyState } from '@/components/ui/EmptyState';

import { List } from 'react-window';

// Extracted from AdminPanel.tsx (previously the `activeTab === 'orders'`
// JSX block, lines ~1326-1664). Purely presentational — no local state
// or fetch logic of its own. All order data, selection state, and action
// handlers (approve/delete/PDF/send/etc.) still live in the parent
// AdminPanel, which also owns the Order Detail Dialog, Send Invoice
// Dialog, and PDF Preview Dialog rendered alongside this tab (those
// dialogs are shared with the Diagnostics tab's test-PDF preview, so
// they were kept in the parent rather than moved here).

export function AdminOrdersTab({
  t,
  language,
  orders = [],
  filteredOrders,
  cancelRequests,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  statusFilter = 'all',
  setStatusFilter,
  isSelectMode,
  setIsSelectMode,
  filterBySameEmail = true,
  setFilterBySameEmail,
  selectedOrderIds,
  setSelectedOrderIds,
  getStatusBadge,
  handleToggleOrderSelect,
  openOrderDetail,
  openSendDialog,
  handleDelete,
  handleRejectCancellation,
  authHeaders,
  getApiUrl,
  fetchOrders,
  toast,
  setIsApproving,
}: {
  t: (key: string) => string;
  language: string;
  orders?: Order[];
  filteredOrders: Order[];
  cancelRequests: Order[];
  dateFromFilter: string;
  setDateFromFilter: (v: string) => void;
  dateToFilter: string;
  setDateToFilter: (v: string) => void;
  statusFilter?: string;
  setStatusFilter?: (v: string) => void;
  isSelectMode: boolean;
  setIsSelectMode: (v: boolean) => void;
  filterBySameEmail?: boolean;
  setFilterBySameEmail?: (v: boolean) => void;
  selectedOrderIds: Set<string>;
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  generatingInvoice: string | null;
  getStatusBadge: (status?: string) => React.ReactNode;
  handleToggleOrderSelect: (id?: string) => void;
  openOrderDetail: (order: Order) => void;
  openSendDialog: (order: Order) => void;
  handlePreviewPDF: (order: Order, isFinal: boolean) => void;
  handleDownloadPDF: (order: Order, isFinal: boolean) => void;
  handleDelete: (orderId: string) => void;
  handleRejectCancellation: (orderId: string) => void;
  authHeaders: () => HeadersInit;
  getApiUrl: (path: string) => string;
  fetchOrders: () => void;
  toast: (opts: { title?: string; description?: string; variant?: ToastVariant }) => void;
  setIsApproving: (v: boolean) => void;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [starredOrderIds, setStarredOrderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const hasActiveDate = Boolean(dateFromFilter || dateToFilter);
  const hasActiveStatus = Boolean(statusFilter && statusFilter !== 'all');
  const activeFilterCount = (hasActiveDate ? 1 : 0) + (hasActiveStatus ? 1 : 0) + (isSelectMode ? 1 : 0);

  // Local search over already-filtered orders (name, email, phone, invoice, client)
  const searchedOrders = searchQuery.trim()
    ? filteredOrders.filter((o) => {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          o.name,
          o.email,
          o.contact || o.phone,
          o.invoiceNo,
          o.to,
          o.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
    : filteredOrders;

  return (
    <>
      {/* Cancellation Requests Section */}
      {cancelRequests.length > 0 && (
        <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl backdrop-blur-sm">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t('cancellation_requests') || 'Cancellation Requests'} ({cancelRequests.length})
          </h2>
          <div className="space-y-2.5">
            {cancelRequests.map((order, idx) => (
              <div key={order.id || `cancel-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 bg-white dark:bg-card border border-amber-500/20 rounded-xl shadow-sm">
                <div>
                  <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{order.name} ({order.quantity} pax)</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{formatDateTimeDisplay(order.dateTime || order.eventDate || order.date)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold text-sm shadow-sm px-4"
                    onClick={async () => {
                      setIsApproving(true);
                      try {
                        const response = await fetch(getApiUrl('/api/admin/orders'), {
                          method: 'POST',
                          headers: authHeaders(),
                          body: JSON.stringify({
                            action: 'update',
                            orderId: order.id,
                            data: { status: 'cancelled' }
                          })
                        });
                        if (response.ok) {
                          toast({
                            title: t('success'),
                            description: t('cancellation_approved'),
                            variant: 'success'
                          });
                          fetchOrders();
                        }
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsApproving(false);
                      }
                    }}
                  >
                    {t('approve')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 min-h-[40px] bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 border-rose-500/30 font-bold text-sm px-4"
                    onClick={() => order.id && handleRejectCancellation(order.id)}
                  >
                    {t('reject')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balanced toolbar */}
      <div className="mb-4 bg-white dark:bg-card border border-[var(--color-light-forest)] dark:border-stone-800 rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
        {/* Row 1: Search Input & Dropdown Toggle Button */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" aria-hidden />
            <input
              id="admin-order-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'bm' ? 'Cari nama, emel, invois…' : 'Search name, email, invoice…'}
              aria-label={language === 'bm' ? 'Cari pesanan' : 'Search orders'}
              className="w-full h-11 min-h-[44px] pl-10 pr-3.5 rounded-lg border border-[var(--color-light-forest)] dark:border-stone-800 bg-[var(--color-cream-dark)] dark:bg-background/50 text-sm font-medium text-[#0c453c] dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#f69913]/40 transition-all"
            />
          </div>

          {/* Filter Dropdown Toggle Button */}
          <button
            id="admin-filter-dropdown-toggle"
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            aria-expanded={isFilterDropdownOpen}
            aria-label={language === 'bm' ? 'Buka atau tutup penapis' : 'Toggle filters dropdown'}
            className={`h-11 min-h-[44px] px-3 sm:px-4 flex items-center justify-center gap-2 rounded-lg border font-semibold text-xs sm:text-sm transition-all cursor-pointer shrink-0 select-none ${
              isFilterDropdownOpen
                ? 'bg-[#0c453c] text-white border-[#0c453c] shadow-xs dark:bg-emerald-600 dark:border-emerald-600'
                : activeFilterCount > 0
                  ? 'bg-[#0c453c]/10 text-[#0c453c] border-[#0c453c]/40 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                  : 'bg-[var(--color-cream-dark)] hover:bg-[var(--color-cream)] dark:bg-background/60 dark:hover:bg-background border-[var(--color-light-forest)] dark:border-stone-800 text-[#0c453c] dark:text-stone-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="inline">
              {language === 'bm' ? 'Penapis' : 'Filter'}
            </span>
            {activeFilterCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                isFilterDropdownOpen
                  ? 'bg-[#f69913] text-white'
                  : 'bg-[#0c453c] text-white dark:bg-emerald-400 dark:text-stone-900'
              }`}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Compact Active Filter Chips when Dropdown is collapsed */}
        {!isFilterDropdownOpen && activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
            <span className="text-stone-500 dark:text-stone-400 text-[11px] font-medium">
              {language === 'bm' ? 'Penapis aktif:' : 'Active:'}
            </span>
            {hasActiveStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f69913]/15 text-[#b06300] dark:text-amber-300 font-semibold text-[11px]">
                {statusFilter === 'pending' ? (language === 'bm' ? 'Menunggu' : 'Pending')
                  : statusFilter === 'approved' ? (language === 'bm' ? 'Diluluskan' : 'Approved')
                  : statusFilter === 'billed' ? (language === 'bm' ? 'Dibilkan' : 'Billed')
                  : statusFilter === 'cancel_requested' ? (language === 'bm' ? 'Minta Batal' : 'Cancel req.')
                  : statusFilter === 'cancelled' ? (language === 'bm' ? 'Dibatalkan' : 'Cancelled')
                  : statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter?.('all')}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                  title={language === 'bm' ? 'Padam tapisan status' : 'Clear status filter'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {hasActiveDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0c453c]/10 text-[#0c453c] dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold text-[11px]">
                {dateFromFilter || '...'} – {dateToFilter || '...'}
                <button
                  type="button"
                  onClick={() => { setDateFromFilter(''); setDateToFilter(''); }}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                  title={language === 'bm' ? 'Padam tapisan tarikh' : 'Clear date filter'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isSelectMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                {language === 'bm' ? 'Mod Pilih Aktif' : 'Select Mode'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStatusFilter?.('all');
                setDateFromFilter('');
                setDateToFilter('');
              }}
              className="text-[11px] text-[#e03f14] hover:underline font-semibold ml-1 cursor-pointer"
            >
              {language === 'bm' ? 'Set Semula' : 'Reset All'}
            </button>
          </div>
        )}

        {/* Dropdown Panel: Date range, Select Mode, Export, and Status chips */}
        {isFilterDropdownOpen && (
          <div
            id="admin-filter-dropdown-panel"
            className="pt-3 border-t border-[var(--color-light-forest)]/70 dark:border-stone-800/70 space-y-3"
          >
            {/* Row 1 inside dropdown: Date range, Select Mode, and Primary action buttons */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Date range picker group */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 bg-[var(--color-cream-dark)] dark:bg-background/50 border border-[var(--color-light-forest)] dark:border-stone-800 rounded-lg px-2.5 sm:px-3.5 py-1 sm:py-0 min-h-[44px]">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                    {language === 'bm' ? 'Dari' : 'From'}
                  </span>
                  <input
                    id="admin-date-from"
                    type="date"
                    aria-label={language === 'bm' ? 'Tarikh Dari' : 'Date From'}
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full sm:w-[8.2rem] min-w-[100px] bg-transparent text-xs sm:text-sm font-semibold text-[#0c453c] dark:text-emerald-400 focus:outline-none"
                  />
                  <span className="text-stone-300 dark:text-stone-600 shrink-0 hidden sm:inline">–</span>
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                    {language === 'bm' ? 'Hingga' : 'To'}
                  </span>
                  <input
                    id="admin-date-to"
                    type="date"
                    aria-label={language === 'bm' ? 'Tarikh Hingga' : 'Date To'}
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="w-full sm:w-[8.2rem] min-w-[100px] bg-transparent text-xs sm:text-sm font-semibold text-[#0c453c] dark:text-emerald-400 focus:outline-none"
                  />
                </div>
                {(dateFromFilter || dateToFilter) && (
                  <button
                    id="admin-clear-date-filter"
                    onClick={() => { setDateFromFilter(''); setDateToFilter(''); }}
                    className="h-11 w-11 flex items-center justify-center text-[#e03f14] dark:text-rose-400 hover:bg-[#e03f14]/10 rounded-lg border border-[#e03f14]/20 dark:border-rose-500/30 shrink-0 transition-colors"
                    title={language === 'bm' ? 'Reset' : 'Reset'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Primary actions toolbar */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-4 bg-[var(--color-cream-dark)] dark:bg-background/50 border border-[var(--color-light-forest)] dark:border-stone-800 rounded-lg h-11 min-h-[44px]">
                  <Switch
                    id="select-mode-toggle"
                    checked={isSelectMode}
                    onCheckedChange={(checked) => {
                      setIsSelectMode(checked);
                      if (!checked) setSelectedOrderIds(new Set());
                    }}
                  />
                  <label htmlFor="select-mode-toggle" className="text-xs sm:text-sm font-semibold text-[#0c453c]/80 dark:text-stone-200 cursor-pointer select-none whitespace-nowrap">
                    {language === 'bm' ? 'Mod Pilih' : 'Select Mode'}
                  </label>
                </div>

                <Button
                  id="admin-export-btn"
                  variant="default"
                  size="default"
                  onClick={() => setIsExportOpen(true)}
                  className="flex-1 sm:flex-initial h-11 min-h-[44px] font-bold flex items-center justify-center gap-2 px-5 shadow-sm bg-[#e96212] hover:bg-[#e96212]/90 text-white border-0 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Eksport' : 'Export'}</span>
                </Button>
              </div>
            </div>

            {/* Row 2 inside dropdown: Status filter chips with live counts */}
            {setStatusFilter && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap scrollbar-none pt-2 border-t border-[var(--color-light-forest)]/70 dark:border-stone-800/70">
                {[
                  { 
                    id: 'all', 
                    label: language === 'bm' ? 'Semua' : 'All',
                    count: orders.length 
                  },
                  { 
                    id: 'pending', 
                    label: language === 'bm' ? 'Menunggu' : 'Pending',
                    count: orders.filter(o => o.status === 'pending').length 
                  },
                  { 
                    id: 'approved', 
                    label: language === 'bm' ? 'Diluluskan' : 'Approved',
                    count: orders.filter((o: Order) => o.status === 'approved' || (o.status as string) === 'confirmed').length 
                  },
                  { 
                    id: 'billed', 
                    label: language === 'bm' ? 'Dibilkan' : 'Billed',
                    count: orders.filter(o => o.status === 'billed').length 
                  },
                  { 
                    id: 'cancel_requested', 
                    label: language === 'bm' ? 'Minta Batal' : 'Cancel req.',
                    count: cancelRequests.length 
                  },
                  { 
                    id: 'cancelled', 
                    label: language === 'bm' ? 'Dibatalkan' : 'Cancelled',
                    count: orders.filter(o => o.status === 'cancelled').length 
                  },
                ].map((chip) => {
                  const active = statusFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      id={`admin-filter-status-${chip.id}`}
                      type="button"
                      onClick={() => setStatusFilter(chip.id)}
                      aria-pressed={active}
                      className={`h-9 min-h-[36px] px-3.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                        active
                          ? 'bg-sunshine-cta text-white border-sunshine-cta shadow-[0_3px_10px_rgba(224,63,20,0.30)]'
                          : 'bg-[var(--color-cream-dark)] dark:bg-background/50 text-[#0c453c]/80 dark:text-stone-300 border-[var(--color-light-forest)] dark:border-stone-800 hover:border-[#f69913]/50 hover:bg-[#F7F2EA]'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-black ${
                        active 
                          ? 'bg-white/25 text-white' 
                          : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}>
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Row 3: Selection tools — only when Select Mode is on */}
        {isSelectMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-light-forest)] dark:border-stone-800">
            <div className="flex items-center gap-2.5 px-3.5 bg-[var(--color-cream-dark)] dark:bg-background/50 border border-[var(--color-light-forest)] dark:border-stone-800 rounded-xl h-10 min-h-[40px]">
              <Switch
                id="email-filter-toggle"
                checked={filterBySameEmail}
                onCheckedChange={(checked) => setFilterBySameEmail?.(checked)}
              />
              <label htmlFor="email-filter-toggle" className="text-xs sm:text-sm font-semibold text-[#0c453c]/80 dark:text-stone-200 cursor-pointer select-none whitespace-nowrap">
                {language === 'bm' ? 'Emel Sama' : 'Same Email'}
              </label>
            </div>

            {searchedOrders.length > 0 && (
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  const allSelected = searchedOrders.every(o => o.id && selectedOrderIds.has(o.id));
                  if (allSelected) {
                    setSelectedOrderIds(new Set());
                    return;
                  }
                  const distinctClients = new Set(searchedOrders.map(o => o.to));
                  if (distinctClients.size > 1) {
                    toast({
                      title: t('error') || 'Error',
                      description: language === 'bm'
                        ? 'Paparan semasa merangkumi lebih daripada satu klien. Sila gunakan tapisan Klien untuk pilih satu klien sahaja sebelum "Select All".'
                        : 'The current view spans more than one client. Please use the Client filter to narrow to a single client before "Select All".',
                      variant: 'error'
                    });
                    return;
                  }
                  let toSelect = searchedOrders.filter(o => Boolean(o.id));
                  if (filterBySameEmail) {
                    const first = toSelect.find(o => o.email);
                    if (first?.email) {
                      const target = String(first.email).trim().toLowerCase();
                      toSelect = toSelect.filter(o => String(o.email || '').trim().toLowerCase() === target);
                    }
                  }
                  setSelectedOrderIds(new Set(toSelect.map(o => o.id!)));
                }}
                className="h-10 min-h-[40px] border-[var(--color-light-forest)] dark:border-stone-800 font-semibold rounded-xl text-xs sm:text-sm text-[#0c453c] dark:text-stone-200 hover:bg-[#f69913]/10 dark:hover:bg-stone-800"
              >
                {searchedOrders.every(o => o.id && selectedOrderIds.has(o.id)) ? (
                  <><Check className="w-4 h-4 mr-1.5 text-[#f69913]" />{t('deselect_all') || 'Deselect'}</>
                ) : (
                  <><Check className="w-4 h-4 mr-1.5 opacity-40" />{t('select_all_orders') || 'Select All'}</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Jotform-style Submissions List */}
      <div className="rounded-xl border border-[var(--color-light-forest)] dark:border-stone-800 bg-white dark:bg-card overflow-hidden shadow-xs">
        {searchedOrders.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<Inbox className="w-10 h-10 opacity-70" aria-hidden />}
            title={searchQuery.trim()
              ? (language === 'bm' ? 'Tiada hasil carian' : 'No matching orders')
              : (t('no_orders') || 'No orders')}
            description={searchQuery.trim()
              ? (language === 'bm'
                  ? 'Cuba tukar kata kunci atau kosongkan carian.'
                  : 'Try a different keyword or clear the search.')
              : (language === 'bm'
                  ? 'Laraskan penapis tarikh atau tunggu pesanan baharu.'
                  : 'Adjust date filters or wait for new orders.')}
          />
        ) : (
          (() => {
            const rowHeight = typeof window !== 'undefined' && window.innerWidth < 420 ? 146 : typeof window !== 'undefined' && window.innerWidth < 768 ? 134 : 118;
            const dynamicListHeight = Math.min(Math.max(searchedOrders.length * rowHeight, 140), 620);

            return (
              <List
                style={{ height: dynamicListHeight, width: '100%' }}
                rowCount={searchedOrders.length}
                rowHeight={rowHeight}
                rowProps={{}}
                rowComponent={(({ index, style }: any) => {
              const order = searchedOrders[index];
              const isSelected = Boolean(order.id && selectedOrderIds.has(order.id));
              const isStarred = Boolean(order.id && starredOrderIds.has(order.id));

              let formattedHeaderDate = '-';
              const rawDate = order.dateTime || order.eventDate || order.createdAt;
              if (rawDate) {
                formattedHeaderDate = formatDateTimeDisplay(rawDate);
              }
              if (formattedHeaderDate === '-') {
                formattedHeaderDate = order.orderId ? `#${order.orderId}` : (language === 'bm' ? 'Pesanan Katering' : 'Catering Order');
              }

              const getRelativeTime = (o: Order) => {
                let dateVal = new Date();
                if (o.createdAt) {
                  if (typeof o.createdAt === 'object') {
                    if ('seconds' in o.createdAt && typeof o.createdAt.seconds === 'number') {
                      dateVal = new Date(o.createdAt.seconds * 1000);
                    } else if ('_seconds' in o.createdAt && typeof (o.createdAt as any)._seconds === 'number') {
                      dateVal = new Date((o.createdAt as any)._seconds * 1000);
                    } else {
                      dateVal = new Date(o.createdAt as any);
                    }
                  } else {
                    dateVal = new Date(o.createdAt);
                  }
                } else if (o.dateTime) {
                  dateVal = new Date(o.dateTime);
                }
                const timeMs = dateVal.getTime();
                const diffMs = isNaN(timeMs) ? 0 : Date.now() - timeMs;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHrs = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHrs / 24);
                if (isNaN(diffMins) || diffMs < 0) return '1m';
                if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
                if (diffHrs < 24) return `${diffHrs}h`;
                return `${diffDays}d`;
              };

              const relativeTime = getRelativeTime(order);
              const clientName = order.to || order.name || (order as any).company || '-';
              const totalAmount = order.totalAmount != null ? `RM ${Number(order.totalAmount).toFixed(2)}` : '—';

              const stripColor =
                order.status === 'approved' || order.status === 'billed'
                  ? 'bg-[#0c453c]'
                  : order.status === 'cancel_requested'
                  ? 'bg-amber-500'
                  : order.status === 'cancelled'
                  ? 'bg-[#e03f14]'
                  : 'bg-[#f69913]';

              return (
                <div style={style} className="px-2 sm:px-3 py-1">
                  <div
                    onClick={() => openOrderDetail(order)}
                    className={`
                      relative flex flex-col justify-between gap-1.5 p-2.5 sm:p-3 rounded-lg bg-white dark:bg-card border border-[var(--color-light-forest)] dark:border-stone-800
                      cursor-pointer transition-all duration-150
                      hover:shadow-xs hover:-translate-y-0.5
                      ${isSelected ? 'ring-1.5 ring-sunshine-cta shadow-xs' : ''}
                      ${order.status === 'cancel_requested' ? 'ring-1.5 ring-amber-400/60' : ''}
                    `}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${stripColor}`} />

                    <div className="flex items-start justify-between gap-1.5 pl-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-[13px] text-[#0c453c] dark:text-emerald-400 leading-tight">
                            {formattedHeaderDate}
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500">· {relativeTime} ago</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm text-[#0c453c] dark:text-stone-100 truncate mt-0.5 leading-snug">
                          {clientName}
                        </h3>
                        {order.email && (
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0">{order.email}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isSelectMode ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleOrderSelect(order.id)}
                            className="w-4 h-4 accent-[#f69913] rounded cursor-pointer"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              if (!order.id) return;
                              setStarredOrderIds(prev => {
                                const next = new Set(prev);
                                if (next.has(order.id!)) {
                                  next.delete(order.id!);
                                } else {
                                  next.add(order.id!);
                                }
                                return next;
                              });
                            }}
                            className="p-1 rounded-full hover:bg-[#f69913]/15 dark:hover:bg-stone-800 transition-colors"
                          >
                            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-[#f69913] text-[#f69913]' : 'text-stone-300 dark:text-stone-600'}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center justify-center min-w-[40px] h-8 rounded-lg bg-[#f69913]/10 dark:bg-[#f69913]/15 border border-[#f69913]/25 px-1.5">
                          <span className="font-bold text-xs sm:text-sm text-[#0c453c] dark:text-amber-300 leading-none">{order.quantity ?? '–'}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-[#0c453c]/60 dark:text-amber-300/80 mt-0.5">pax</span>
                        </div>

                        <div>
                          <p className="text-[8px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider leading-none mb-0.5">Total</p>
                          <p className="font-bold text-[#0c453c] dark:text-emerald-400 text-xs font-mono leading-none">{totalAmount}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg hover:bg-[#f69913]/15 dark:hover:bg-stone-800 text-[#0c453c] dark:text-stone-200"
                          onClick={() => openOrderDetail(order)}
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg hover:bg-[#e96212]/15 dark:hover:bg-stone-800 text-[#0c453c] dark:text-stone-200"
                          onClick={() => openSendDialog(order)}
                          title="Send Invoice"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg hover:bg-rose-500/15 dark:hover:bg-stone-800 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400"
                          onClick={() => order.id && handleDelete(order.id)}
                          title={language === 'bm' ? 'Padam Tempahan' : 'Delete Order'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          />
        );
      })()
    )}
      </div>

      <AdminOrdersExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredOrders={filteredOrders}
        selectedOrderIds={selectedOrderIds}
        setSelectedOrderIds={setSelectedOrderIds}
        language={language}
        toast={toast}
      />
    </>
  );
}
export default AdminOrdersTab;
