import { createPortal } from 'react-dom';
import { useState } from 'react';
import {
  AlertTriangle, Search, Check, Eye, FileText, FileDown, Send, Trash2, Loader2, FileSpreadsheet, Filter, X, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { Order } from '@/types';
import { ExportOrdersModal } from './ExportOrdersModal';

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
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  clientFilter,
  setClientFilter,
  clientOptions,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  isSelectMode,
  setIsSelectMode,
  filterBySameEmail = true,
  setFilterBySameEmail,
  consolidatedInvoiceNo = '',
  setConsolidatedInvoiceNo,
  prepareConsolidateModal,
  selectedOrderIds,
  setSelectedOrderIds,
  showConsolidateModal,
  setShowConsolidateModal,
  isGeneratingConsolidated,
  generatingInvoice,
  getStatusBadge,
  handleToggleOrderSelect,
  openOrderDetail,
  openSendDialog,
  handlePreviewPDF,
  handleDownloadPDF,
  handleDelete,
  handleRejectCancellation,
  handleGenerateConsolidatedInvoice,
  authHeaders,
  getApiUrl,
  fetchOrders,
  toast,
  setIsApproving,
}: {
  t: (key: string) => string;
  language: string;
  orders: Order[];
  filteredOrders: Order[];
  cancelRequests: Order[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  clientFilter: string;
  setClientFilter: (v: string) => void;
  clientOptions: string[];
  dateFromFilter: string;
  setDateFromFilter: (v: string) => void;
  dateToFilter: string;
  setDateToFilter: (v: string) => void;
  isSelectMode: boolean;
  setIsSelectMode: (v: boolean) => void;
  filterBySameEmail?: boolean;
  setFilterBySameEmail?: (v: boolean) => void;
  consolidatedInvoiceNo?: string;
  setConsolidatedInvoiceNo?: (v: string) => void;
  prepareConsolidateModal?: () => void;
  selectedOrderIds: Set<string>;
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  showConsolidateModal: boolean;
  setShowConsolidateModal: (v: boolean) => void;
  isGeneratingConsolidated: boolean;
  generatingInvoice: string | null;
  getStatusBadge: (status?: string) => React.ReactNode;
  handleToggleOrderSelect: (id?: string) => void;
  openOrderDetail: (order: Order) => void;
  openSendDialog: (order: Order) => void;
  handlePreviewPDF: (order: Order, isFinal: boolean) => void;
  handleDownloadPDF: (order: Order, isFinal: boolean) => void;
  handleDelete: (orderId: string) => void;
  handleRejectCancellation: (orderId: string) => void;
  handleGenerateConsolidatedInvoice: (withNotes: boolean, invoiceNo?: string) => void;
  authHeaders: () => HeadersInit;
  getApiUrl: (path: string) => string;
  fetchOrders: () => void;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  setIsApproving: (v: boolean) => void;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [starredOrderIds, setStarredOrderIds] = useState<Set<string>>(new Set());

  // Calculate quick summary metrics from current orders list
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'pending' || !o.status).length;
  const approvedCount = orders.filter((o) => (o.status as string) === 'approved' || (o.status as string) === 'diluluskan').length;
  const billedCount = orders.filter((o) => (o.status as string) === 'billed' || (o.status as string) === 'dibilkan').length;
  const totalPax = orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);

  return (
    <>
      {/* KPI Summary Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-5">
        <div className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            {language === 'bm' ? 'Jumlah Pesanan' : 'Total Orders'}
          </p>
          <p className="text-xl font-black text-deep-forest dark:text-white mt-1">{totalCount}</p>
        </div>

        <div className="bg-white dark:bg-card border border-amber-500/20 rounded-2xl p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            {language === 'bm' ? 'Menunggu' : 'Pending'}
          </p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
        </div>

        <div className="bg-white dark:bg-card border border-emerald-500/20 rounded-2xl p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {language === 'bm' ? 'Diluluskan' : 'Approved'}
          </p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</p>
        </div>

        <div className="bg-white dark:bg-card border border-blue-500/20 rounded-2xl p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {language === 'bm' ? 'Dibilkan' : 'Billed'}
          </p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{billedCount}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            {language === 'bm' ? 'Jumlah Pax' : 'Total Pax'}
          </p>
          <p className="text-xl font-black text-sunshine dark:text-sunshine mt-1">{totalPax.toLocaleString()} pax</p>
        </div>
      </div>

      {/* Cancellation Requests Section */}
      {cancelRequests.length > 0 && (
        <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl backdrop-blur-sm">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t('cancellation_requests') || 'Cancellation Requests'} ({cancelRequests.length})
          </h2>
          <div className="space-y-2.5">
            {cancelRequests.map((order, idx) => (
              <div key={order.id || `cancel-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-card border border-amber-500/20 rounded-xl shadow-sm">
                <div>
                  <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{order.name} ({order.quantity} pax)</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{order.dateTime ? format(new Date(order.dateTime), 'PP p') : '-'}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30 font-bold text-xs"
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
                    className="h-8 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 border-rose-500/30 font-bold text-xs"
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

      {/* Streamlined Compact Toolbar */}
      <div className="mb-4 bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 bg-cream/50 dark:bg-background/40 border-stone/15 dark:border-white/10 text-xs text-deep-forest dark:text-white placeholder:text-stone-400 focus:ring-1 focus:ring-sunshine/50 rounded-xl"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Inline Compact Filter Dropdowns & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3 h-9">
              <Filter className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">{language === 'bm' ? 'Semua Status' : 'All Statuses'}</option>
                <option value="pending">{t('pending') || 'Pending'}</option>
                <option value="approved">{t('approved') || 'Approved'}</option>
                <option value="billed">{t('billed') || 'Billed'}</option>
                <option value="rejected">{t('rejected') || 'Rejected'}</option>
                <option value="cancel_requested">{t('cancel_requested') || 'Cancel Requested'}</option>
                <option value="cancelled">{t('cancelled') || 'Cancelled'}</option>
              </select>
            </div>

            {/* Client Filter */}
            {clientOptions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3 h-9 max-w-[170px]">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer truncate w-full"
                >
                  <option value="all">{language === 'bm' ? 'Semua Klien' : 'All Clients'}</option>
                  {clientOptions.map((client) => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date From & Date To */}
            <div className="flex items-center gap-1 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-2.5 h-9">
              <input
                type="date"
                aria-label={language === 'bm' ? 'Tarikh Dari' : 'Date From'}
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer"
              />
              <span className="text-stone-400 text-[10px]">-</span>
              <input
                type="date"
                aria-label={language === 'bm' ? 'Tarikh Hingga' : 'Date To'}
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            {/* Clear Filter Button */}
            {(statusFilter !== 'all' || clientFilter !== 'all' || dateFromFilter || dateToFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setClientFilter('all');
                  setDateFromFilter('');
                  setDateToFilter('');
                }}
                className="h-9 w-9 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all border border-rose-500/20"
                title={language === 'bm' ? 'Reset Tapisan' : 'Reset Filters'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Select Mode Switch */}
            <div className="flex items-center gap-2 px-3 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl h-9">
              <Switch
                id="select-mode-toggle"
                checked={isSelectMode}
                onCheckedChange={(checked) => {
                  setIsSelectMode(checked);
                  if (!checked) {
                    setSelectedOrderIds(new Set());
                  }
                }}
              />
              <label htmlFor="select-mode-toggle" className="text-xs font-semibold text-deep-forest/80 dark:text-stone/80 cursor-pointer select-none">
                {language === 'bm' ? 'Mod Pilih' : 'Select Mode'}
              </label>
            </div>

            {isSelectMode && (
              <div className="flex items-center gap-2 px-3 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl h-9">
                <Switch
                  id="email-filter-toggle"
                  checked={filterBySameEmail}
                  onCheckedChange={(checked) => {
                    if (setFilterBySameEmail) setFilterBySameEmail(checked);
                  }}
                />
                <label htmlFor="email-filter-toggle" className="text-xs font-semibold text-deep-forest/80 dark:text-stone/80 cursor-pointer select-none">
                  {language === 'bm' ? 'Emel Sama' : 'Same Email'}
                </label>
              </div>
            )}

            {isSelectMode && filteredOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => o.id && selectedOrderIds.has(o.id));
                  if (allSelected) {
                    setSelectedOrderIds(new Set());
                    return;
                  }
                  const distinctClients = new Set(filteredOrders.map(o => o.to));
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
                  let toSelect = filteredOrders.filter(o => Boolean(o.id));
                  if (filterBySameEmail) {
                    const firstWithEmail = toSelect.find(o => Boolean(o.email));
                    if (firstWithEmail && firstWithEmail.email) {
                      const targetEmail = String(firstWithEmail.email).trim().toLowerCase();
                      toSelect = toSelect.filter(o => String(o.email || '').trim().toLowerCase() === targetEmail);
                    }
                  }
                  setSelectedOrderIds(new Set(toSelect.map(o => o.id!)));
                }}
                className="border-stone/15 dark:border-white/10 bg-cream/60 dark:bg-background/40 text-deep-forest dark:text-white hover:bg-sunshine/10 text-xs font-semibold h-9 px-3 rounded-xl flex items-center gap-1.5 !min-h-0"
              >
                {filteredOrders.every(o => o.id && selectedOrderIds.has(o.id)) ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-sunshine" />
                    {t('deselect_all') || 'Deselect'}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-deep-forest/40" />
                    {t('select_all_orders') || 'Select All'}
                  </>
                )}
              </Button>
            )}

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="border-sunshine/30 bg-sunshine/10 text-deep-forest dark:text-sunshine hover:bg-sunshine/20 text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5 !min-h-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sunshine" />
              <span>{language === 'bm' ? 'Eksport' : 'Export'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Jotform-style Submissions List */}
      <div className="bg-white dark:bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-sm overflow-hidden divide-y divide-stone/10 dark:divide-white/5">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-deep-forest/60 dark:text-stone/60 py-20 bg-stone/5 dark:bg-white/5">
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-display font-bold opacity-80 text-deep-forest dark:text-white">{t('no_orders')}</p>
              <p className="text-xs opacity-50 dark:text-stone/60">Try adjusting your filters or search term</p>
            </div>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const isSelected = Boolean(order.id && selectedOrderIds.has(order.id));
            const isStarred = Boolean(order.id && starredOrderIds.has(order.id));
            
            // Format header date: Jul 31, 2026 9:30 AM
            let formattedHeaderDate = '-';
            if (order.dateTime) {
              try {
                formattedHeaderDate = format(new Date(order.dateTime), 'MMM d, yyyy h:mm a');
              } catch {
                formattedHeaderDate = String(order.dateTime);
              }
            }

            // Relative age: e.g. "8h", "1d"
            const getRelativeTime = (o: Order) => {
              const dateVal = o.createdAt ? new Date(
                typeof o.createdAt === 'object' && 'seconds' in o.createdAt
                  ? o.createdAt.seconds * 1000
                  : o.createdAt
              ) : (o.dateTime ? new Date(o.dateTime) : new Date());
              
              const diffMs = Date.now() - dateVal.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHrs = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHrs / 24);

              if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
              if (diffHrs < 24) return `${diffHrs}h`;
              return `${diffDays}d`;
            };

            const relativeTime = getRelativeTime(order);

            return (
              <div
                key={order.id || `order-${idx}`}
                onClick={() => openOrderDetail(order)}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 hover:bg-cream/15 dark:hover:bg-white/5 transition-colors cursor-pointer relative ${
                  order.status === 'cancel_requested' ? 'bg-amber-500/5 border-l-4 border-l-amber-500' : ''
                } ${isSelected ? 'bg-sunshine/5 dark:bg-sunshine/5 border-l-4 border-l-sunshine' : ''}`}
              >
                {/* Left Side: Select or Star & Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Select or Star Control */}
                  <div className="flex items-center h-5 shrink-0 pt-0.5 md:pt-0">
                    {isSelectMode ? (
                      <input
                        type="checkbox"
                        aria-label={t('select_order') || 'Select order'}
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleToggleOrderSelect(order.id)}
                        className="w-4 h-4 accent-sunshine cursor-pointer rounded border-stone/30"
                      />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (order.id) {
                            setStarredOrderIds(prev => {
                              const next = new Set(prev);
                              if (next.has(order.id!)) {
                                next.delete(order.id!);
                              } else {
                                next.add(order.id!);
                              }
                              return next;
                            });
                          }
                        }}
                        className="p-1 hover:bg-stone/10 dark:hover:bg-white/10 rounded-full transition-colors group"
                        title={isStarred ? "Unstar" : "Star"}
                      >
                        <Star
                          className={`w-4 h-4 transition-all duration-200 ${
                            isStarred
                              ? 'fill-amber-400 text-amber-400 scale-110'
                              : 'text-stone-300 dark:text-stone-600 group-hover:text-amber-400'
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Main Header / Content Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm md:text-base leading-snug">
                        {formattedHeaderDate}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-stone-500 hidden md:inline">
                        • {relativeTime} ago
                      </span>
                    </div>

                    {/* Beautiful Jotform Fields Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-stone-400 dark:text-stone-500 shrink-0 font-medium">
                          {language === 'bm' ? 'Sajian Untuk:' : 'Meal for:'}
                        </span>
                        <span className="font-semibold text-deep-forest dark:text-white truncate" title={order.to}>
                          {order.to || '-'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-stone-400 dark:text-stone-500 font-medium">
                          {language === 'bm' ? 'Kuantiti:' : 'Quantity:'}
                        </span>
                        <span className="font-bold text-deep-forest dark:text-white bg-stone/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
                          {order.quantity} pax
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-stone-400 dark:text-stone-500 shrink-0 font-medium">
                          {language === 'bm' ? 'Acara:' : 'Event:'}
                        </span>
                        <span className="font-semibold text-deep-forest dark:text-white truncate" title={order.location}>
                          {order.location || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Additional Details (Meals) in small footer text */}
                    {order.meals && order.meals.length > 0 && (
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                        <span className="opacity-70">{language === 'bm' ? 'Menu Hidangan: ' : 'Meals: '}</span>
                        {order.meals.map(m => t(m) || m).join(', ')}
                        {order.preparationType && ` (${order.preparationType === 'buffet' ? (language === 'bm' ? 'Bufet' : 'Buffet') : (language === 'bm' ? 'Kotak' : 'Meal Box')})`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Status badge & Compact actions */}
                <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch md:self-auto pl-7 md:pl-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 md:hidden font-medium">
                      {relativeTime} ago
                    </span>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Actions Grid */}
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-deep-forest/60 dark:text-stone/60 hover:text-sunshine dark:hover:text-sunshine hover:bg-sunshine/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrderDetail(order);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('view_edit_details')}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-deep-forest/60 dark:text-stone/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewPDF(order, ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || ''));
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('preview_pdf')}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-deep-forest/60 dark:text-stone/60 hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(order, ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || ''));
                          }}
                          disabled={generatingInvoice === order.id}
                        >
                          {generatingInvoice === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('download_pdf')}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-deep-forest/60 dark:text-stone/60 hover:text-sunshine hover:bg-sunshine/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSendDialog(order);
                          }}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('send_pdf')}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-deep-forest/60 dark:text-stone/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (order.id) handleDelete(order.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('delete_order')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/*
        NOTE (root-cause fix): the floating "Consolidate Invoice" bar and the
        modal below are rendered via createPortal(..., document.body) instead
        of inline. This tab is rendered inside <motion.main animate={{ y: ... }}>
        in AdminPanel.tsx (used for the pull-to-refresh effect). Framer Motion
        applies an inline `transform` for that animation even when y is 0, and
        per the CSS spec any ancestor with a `transform` becomes the containing
        block for descendant `position: fixed` elements. That silently trapped
        this bar inside motion.main's box instead of the real viewport, so it
        never appeared on screen even though selectedOrderIds.size >= 2 was
        true. Portaling to document.body sidesteps that containing-block issue
        without touching the pull-to-refresh animation in AdminPanel.tsx.
      */}
      {selectedOrderIds.size >= 2 && createPortal(
        <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,12px))] left-4 right-4 md:left-auto md:right-8 md:w-96 bg-sunshine border border-border/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-[110]">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white">{selectedOrderIds.size}</span>
            </div>
            {t('orders_selected') || 'Orders Selected'}
          </div>
          <Button
            onClick={() => {
              if (prepareConsolidateModal) {
                prepareConsolidateModal();
              } else {
                setShowConsolidateModal(true);
              }
            }}
            disabled={isGeneratingConsolidated}
            className="h-10 px-5 bg-white text-sunshine hover:bg-cream rounded-xl text-xs font-bold flex items-center gap-2"
          >
            {isGeneratingConsolidated ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {t('consolidate_invoice') || 'Consolidate Invoice'}
          </Button>
        </div>,
        document.body
      )}

      {showConsolidateModal && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            onClick={() => setShowConsolidateModal(false)}
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="space-y-1.5">
              <h3 className="font-display font-bold text-lg text-deep-forest dark:text-white">
                {language === 'bm' ? 'Invois Konsolidasi' : 'Consolidated Invoice'}
              </h3>
              <p className="text-xs text-stone dark:text-stone/70 leading-relaxed">
                {language === 'bm'
                  ? 'Sila sahkan nombor invois dan tetapan lajur nota. Semakan berasaskan klien dikuatkuasakan secara ketat; penjanaan akan GAGAL jika pesanan merangkumi klien berbeza.'
                  : 'Confirm invoice number and notes layout. Client-based validation is strictly enforced; generation will FAIL if orders span different clients.'}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-deep-forest dark:text-white">
                {language === 'bm' ? 'Nombor Invois Konsolidasi (Auto / Boleh Diubah)' : 'Consolidated Invoice Number (Auto / Editable)'}
              </label>
              <Input
                value={consolidatedInvoiceNo}
                onChange={(e) => setConsolidatedInvoiceNo && setConsolidatedInvoiceNo(e.target.value)}
                placeholder="RW0015"
                className="font-mono bg-cream/50 dark:bg-background/40 border-stone/15 dark:border-white/10 focus:border-sunshine text-sm font-bold text-deep-forest dark:text-white"
              />
              <p className="text-[11px] text-stone dark:text-stone/70">
                {language === 'bm'
                  ? 'Nombor ini akan digunakan untuk keseluruhan kelompok invois konsolidasi ini.'
                  : 'This number applies to all pages in this consolidated invoice batch.'}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handleGenerateConsolidatedInvoice(true, consolidatedInvoiceNo)}
                className="w-full h-11 bg-sunshine text-charcoal rounded-xl text-sm font-bold hover:bg-sunshine/90 transition-colors"
              >
                {t('include_notes') || 'Yes, include Notes'}
              </button>
              <button
                onClick={() => handleGenerateConsolidatedInvoice(false, consolidatedInvoiceNo)}
                className="w-full h-11 bg-cream dark:bg-white/10 border border-stone/15 dark:border-white/10 text-deep-forest dark:text-white rounded-xl text-sm font-bold hover:bg-black/5 dark:hover:bg-white/15 transition-colors"
              >
                {t('exclude_notes') || 'No, hide Notes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ExportOrdersModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        orders={orders}
        filteredOrders={filteredOrders}
        selectedOrderIds={selectedOrderIds}
        toast={toast}
      />
    </>
  );
}
export default AdminOrdersTab;
