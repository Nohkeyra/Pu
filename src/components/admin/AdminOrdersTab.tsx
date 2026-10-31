import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Check, Send, FileSpreadsheet, X, Search, Inbox, Trash2,
  SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { formatDateTimeDisplay, normalizeTimestamp } from '@/lib/utils';
import type { Order } from '@/types';
import { AdminOrdersExportSheet } from './AdminOrdersExportSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminOrderRow } from './AdminOrderRow';
import { triggerLightImpact } from '@/lib/haptics';

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
  handleBatchDelete,
  handleRejectCancellation,
  handleUpdateStatus,
  toast,
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
  handleBatchDelete?: (orderIds: string[]) => Promise<void>;
  handleRejectCancellation: (orderId: string) => void;
  handleUpdateStatus?: (id: string, status: string) => void;
  toast: (opts: { title?: string; description?: string; variant?: ToastVariant }) => void;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [starredOrderIds, setStarredOrderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  const [longPressedOrder, setLongPressedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasActiveDate = Boolean(dateFromFilter || dateToFilter);
  const hasActiveStatus = Boolean(statusFilter && statusFilter !== 'all');
  const hasSearch = Boolean(searchQuery.trim());
  const activeFilterCount = (hasActiveDate ? 1 : 0) + (hasActiveStatus ? 1 : 0) + (isSelectMode ? 1 : 0) + (hasSearch ? 1 : 0);

  // Local search over already-filtered orders (name, email, phone, invoice, client)
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    const q = searchQuery.trim().toLowerCase();
    return filteredOrders.filter((o) => {
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
    });
  }, [filteredOrders, searchQuery]);

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
              <Card key={order.id || `cancel-${idx}`} variant="default" padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-amber-500/20">
                <div>
                  <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{order.name} ({order.quantity} pax)</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{formatDateTimeDisplay(order.dateTime || order.eventDate || order.date)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold text-sm shadow-sm px-4"
                    onClick={() => {
                      if (order.id && handleUpdateStatus) {
                        handleUpdateStatus(order.id, 'cancelled');
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
              </Card>
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
            aria-controls="admin-filter-dropdown-panel"
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
              <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
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
            <span className="text-stone-500 dark:text-stone-400 text-xs font-medium">
              {language === 'bm' ? 'Penapis aktif:' : 'Active:'}
            </span>
            {hasActiveStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f69913]/15 text-[#b06300] dark:text-amber-300 font-semibold text-xs">
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
                  aria-label={language === 'bm' ? 'Padam tapisan status' : 'Clear status filter'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {hasActiveDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0c453c]/10 text-[#0c453c] dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold text-xs">
                {dateFromFilter || '...'} – {dateToFilter || '...'}
                <button
                  type="button"
                  onClick={() => { setDateFromFilter(''); setDateToFilter(''); }}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                  title={language === 'bm' ? 'Padam tapisan tarikh' : 'Clear date filter'}
                  aria-label={language === 'bm' ? 'Padam tapisan tarikh' : 'Clear date filter'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isSelectMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
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
              className="text-xs text-[#e03f14] hover:underline font-semibold ml-1 cursor-pointer"
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
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0">
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
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0">
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
                  onClick={() => {
                    triggerLightImpact();
                    setIsExportOpen(true);
                  }}
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
                    count: orders.filter((o: Order) => o.status === 'approved').length 
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
              <div className="flex items-center gap-2">
                {selectedOrderIds.size > 0 && handleBatchDelete && (
                  <Button
                    variant="default"
                    size="default"
                    onClick={async () => {
                      await handleBatchDelete(Array.from(selectedOrderIds));
                      setSelectedOrderIds(new Set());
                    }}
                    className="h-10 min-h-[40px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'bm' ? `Padam (${selectedOrderIds.size})` : `Delete (${selectedOrderIds.size})`}</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    const allSelected = searchedOrders.every(o => o.id && selectedOrderIds.has(o.id));
                    if (allSelected) {
                      setSelectedOrderIds(new Set());
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
              </div>
            )}
          </div>
        )}
      </div>

      {setStatusFilter && (
        <div role="group" aria-label={language === 'bm' ? 'Penapis status pantas' : 'Quick status filters'} className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: language === 'bm' ? 'Semua' : 'All' },
            { id: 'pending', label: language === 'bm' ? 'Menunggu semakan' : 'Pending review' },
            { id: 'approved', label: language === 'bm' ? 'Diluluskan' : 'Approved' },
            { id: 'billed', label: language === 'bm' ? 'Dibilkan' : 'Billed' },
          ].map(chip => (
            <button key={chip.id} type="button" aria-pressed={statusFilter === chip.id} onClick={() => setStatusFilter(chip.id)}
              className={`min-h-[44px] shrink-0 rounded-xl border px-4 text-xs font-semibold transition-colors ${statusFilter === chip.id
                ? 'border-amber-600 bg-amber-500/20 text-amber-900 dark:text-amber-300'
                : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400 dark:border-white/10 dark:bg-card dark:text-stone-300'}`}>
              {chip.label}
            </button>
          ))}
        </div>
      )}

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
            const rowHeight = windowWidth < 420 ? 204 : windowWidth < 768 ? 190 : 180;
            const dynamicListHeight = Math.min(Math.max(searchedOrders.length * rowHeight, 140), 900);

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
                const ts = normalizeTimestamp(o.createdAt || o.dateTime);
                const diffMs = ts > 0 ? Date.now() - (ts * 1000) : 0;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHrs = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHrs / 24);
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
                <AdminOrderRow
                  style={style}
                  order={order}
                  language={language}
                  isSelected={isSelected}
                  isStarred={isStarred}
                  formattedHeaderDate={formattedHeaderDate}
                  relativeTime={relativeTime}
                  clientName={clientName}
                  totalAmount={totalAmount}
                  stripColor={stripColor}
                  isSelectMode={isSelectMode}
                  getStatusBadge={getStatusBadge}
                  handleToggleOrderSelect={handleToggleOrderSelect}
                  setStarredOrderIds={setStarredOrderIds}
                  openOrderDetail={openOrderDetail}
                  openSendDialog={openSendDialog}
                  handleDelete={handleDelete}
                  setLongPressedOrder={setLongPressedOrder}
                />
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

      <Dialog open={!!longPressedOrder} onOpenChange={(open) => !open && setLongPressedOrder(null)}>
        <DialogContent className="sm:max-w-md bg-stone-50 dark:bg-stone-950 p-0 border-0 overflow-hidden">
          <div className="p-4 sm:p-6 bg-white dark:bg-card border-b border-stone-100 dark:border-stone-800">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-deep-forest dark:text-stone-100">
                {language === 'bm' ? 'Tindakan Pantas' : 'Quick Actions'}: #{longPressedOrder?.orderId || longPressedOrder?.id?.slice(-4).toUpperCase()}
              </DialogTitle>
              <DialogDescription className="text-stone-500">
                {longPressedOrder?.name || longPressedOrder?.to || 'Customer'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-2 sm:p-4 grid gap-2">
            {longPressedOrder?.status !== 'approved' && longPressedOrder?.status !== 'billed' && longPressedOrder?.status !== 'cancelled' && (
              <Button 
                variant="outline" 
                className="w-full justify-start py-6 text-[#0c453c] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-200 dark:border-emerald-900"
                onClick={() => {
                  if (longPressedOrder?.id && handleUpdateStatus) {
                    handleUpdateStatus(longPressedOrder.id, 'approved');
                    setLongPressedOrder(null);
                  }
                }}
              >
                <Check className="w-5 h-5 mr-3" />
                {language === 'bm' ? 'Luluskan Tempahan' : 'Approve Order'}
              </Button>
            )}

            {longPressedOrder?.status === 'approved' && (
              <Button 
                variant="outline" 
                className="w-full justify-start py-6 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 border-indigo-200 dark:border-indigo-900"
                onClick={() => {
                  if (longPressedOrder?.id && handleUpdateStatus) {
                    handleUpdateStatus(longPressedOrder.id, 'billed');
                    setLongPressedOrder(null);
                  }
                }}
              >
                <FileSpreadsheet className="w-5 h-5 mr-3" />
                {language === 'bm' ? 'Tandakan Sebagai Dibilkan' : 'Mark as Billed'}
              </Button>
            )}

            <Button 
              variant="outline" 
              className="w-full justify-start py-6 text-[#f69913] hover:bg-sunshine/10 dark:text-amber-500 dark:hover:bg-amber-950 border-sunshine/30 dark:border-amber-900/50"
              onClick={() => {
                if (longPressedOrder) {
                  openSendDialog(longPressedOrder);
                  setLongPressedOrder(null);
                }
              }}
            >
              <Send className="w-5 h-5 mr-3" />
              {language === 'bm' ? 'Hantar Invois WhatsApp' : 'Send WhatsApp Invoice'}
            </Button>

            <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />

            <Button 
              variant="outline" 
              className="w-full justify-start py-6 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900"
              onClick={() => {
                if (longPressedOrder?.id) {
                  handleDelete(longPressedOrder.id);
                  setLongPressedOrder(null);
                }
              }}
            >
              <Trash2 className="w-5 h-5 mr-3" />
              {language === 'bm' ? 'Padam Tempahan' : 'Delete Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default AdminOrdersTab;

