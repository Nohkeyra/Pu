import { createPortal } from 'react-dom';
import { useState } from 'react';
import {
  AlertTriangle, Check, Eye, FileText, FileDown, Send, Trash2, Loader2, FileSpreadsheet, X, Star, Edit2, MoreHorizontal, Search, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Inline editing states for Pax and Pricing
  const [editingCell, setEditingCell] = useState<{ orderId: string; field: 'quantity' | 'pricePerPax'; mealKey?: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingCell, setSavingCell] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<{ orderId: string; x: number; y: number } | null>(null);

  const isBm = language === 'bm';

  const handleInlineSave = async (order: Order) => {
    if (!editingCell) return;
    setSavingCell(true);
    try {
      const updates: any = {};
      
      if (editingCell.field === 'quantity') {
        const newQty = parseInt(editValue, 10);
        if (isNaN(newQty) || newQty < 1) {
          toast({
            title: isBm ? 'Ralat' : 'Error',
            description: isBm ? 'Kuantiti pax tidak sah.' : 'Invalid quantity/pax count.',
            variant: 'error',
          });
          return;
        }
        updates.quantity = newQty;
        
        // Recalculate total amount if prices are set
        if (order.prices) {
          let total = 0;
          Object.values(order.prices).forEach((price) => {
            total += (price as number) * newQty;
          });
          updates.totalAmount = Math.round(total * 100) / 100;
        } else {
          // If no custom prices exist yet, use fallback calculation
          updates.totalAmount = newQty * 15;
        }
      } else if (editingCell.field === 'pricePerPax' && editingCell.mealKey) {
        const newPrice = parseFloat(editValue);
        if (isNaN(newPrice) || newPrice < 0) {
          toast({
            title: isBm ? 'Ralat' : 'Error',
            description: isBm ? 'Harga tidak sah.' : 'Invalid price per pax.',
            variant: 'error',
          });
          return;
        }
        
        const updatedPrices = { ...(order.prices || {}) };
        updatedPrices[editingCell.mealKey] = Math.round(newPrice * 100) / 100;
        updates.prices = updatedPrices;

        // Recalculate total amount using updated prices and current quantity
        let total = 0;
        Object.values(updatedPrices).forEach((price) => {
          total += (price as number) * (order.quantity || 1);
        });
        updates.totalAmount = Math.round(total * 100) / 100;
      }

      // Hit standard admin order POST endpoint
      const res = await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          action: 'update',
          orderId: order.id,
          data: updates,
        }),
      });

      if (res.ok) {
        toast({
          title: isBm ? 'Berjaya' : 'Success',
          description: isBm ? 'Perubahan disimpan!' : 'Changes saved successfully!',
          variant: 'success',
        });
        setEditingCell(null);
        fetchOrders();
      } else {
        throw new Error('Failed to update field');
      }
    } catch (err) {
      console.error(err);
      toast({
        title: isBm ? 'Ralat' : 'Error',
        description: isBm ? 'Gagal menyimpan perubahan.' : 'Failed to save changes.',
        variant: 'error',
      });
    } finally {
      setSavingCell(false);
    }
  };

  return (
    <>
      {/* Cancellation Requests Section */}
      {cancelRequests.length > 0 && (
        <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl backdrop-blur-sm">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {t('cancellation_requests') || 'Cancellation Requests'} ({cancelRequests.length})
          </h2>
          <div className="space-y-2.5">
            {cancelRequests.map((order, idx) => (
              <div key={order.id || `cancel-${idx}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 bg-white dark:bg-card border border-amber-500/20 rounded-xl shadow-sm">
                <div>
                  <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{order.name} ({order.quantity} pax)</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{order.dateTime ? format(new Date(order.dateTime), 'PP p') : '-'}</p>
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

      {/* Balanced toolbar — open on phone, compact & professional on desktop */}
      <div className="mb-5 bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-4 md:p-4 shadow-sm space-y-3">
        {/* Primary controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          {/* Date range */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-1 md:flex-none flex items-center gap-2 bg-cream/50 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3.5 h-11 md:h-10 min-h-[44px] md:min-h-[40px]">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                {language === 'bm' ? 'Dari' : 'From'}
              </span>
              <input
                type="date"
                aria-label={language === 'bm' ? 'Tarikh Dari' : 'Date From'}
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full md:w-[8.5rem] min-w-0 bg-transparent text-sm font-semibold text-deep-forest dark:text-white focus:outline-none"
              />
              <span className="text-stone-300 dark:text-stone-600 shrink-0">–</span>
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                {language === 'bm' ? 'Hingga' : 'To'}
              </span>
              <input
                type="date"
                aria-label={language === 'bm' ? 'Tarikh Hingga' : 'Date To'}
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full md:w-[8.5rem] min-w-0 bg-transparent text-sm font-semibold text-deep-forest dark:text-white focus:outline-none"
              />
            </div>
            {(dateFromFilter || dateToFilter) && (
              <button
                onClick={() => { setDateFromFilter(''); setDateToFilter(''); }}
                className="h-11 w-11 md:h-10 md:w-10 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 shrink-0"
                title={language === 'bm' ? 'Reset' : 'Reset'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-56 lg:w-64 order-first md:order-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'bm' ? 'Cari nama, emel, invois…' : 'Search name, email, invoice…'}
              aria-label={language === 'bm' ? 'Cari pesanan' : 'Search orders'}
              className="w-full h-11 md:h-10 min-h-[44px] md:min-h-[40px] pl-9 pr-3 rounded-xl border border-stone/15 dark:border-white/10 bg-cream/50 dark:bg-background/40 text-sm font-medium text-deep-forest dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-sunshine-cta)]/40"
            />
          </div>

          {/* Primary actions — stay in one line on desktop */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 px-3.5 bg-cream/50 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl h-11 md:h-10 min-h-[44px] md:min-h-[40px]">
              <Switch
                id="select-mode-toggle"
                checked={isSelectMode}
                onCheckedChange={(checked) => {
                  setIsSelectMode(checked);
                  if (!checked) setSelectedOrderIds(new Set());
                }}
              />
              <label htmlFor="select-mode-toggle" className="text-sm font-semibold text-deep-forest/80 dark:text-stone/80 cursor-pointer select-none whitespace-nowrap">
                {language === 'bm' ? 'Mod Pilih' : 'Select Mode'}
              </label>
            </div>

            <Button
              variant="default"
              size="default"
              onClick={() => setIsExportOpen(true)}
              className="h-11 md:h-10 min-h-[44px] md:min-h-[40px] font-bold flex items-center gap-2 px-5 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{language === 'bm' ? 'Eksport' : 'Export'}</span>
            </Button>
          </div>
        </div>

        {/* Status filter chips */}
        {setStatusFilter && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={language === 'bm' ? 'Penapis status' : 'Status filter'}>
            {[
              { id: 'all', label: language === 'bm' ? 'Semua' : 'All' },
              { id: 'pending', label: language === 'bm' ? 'Menunggu' : 'Pending' },
              { id: 'approved', label: language === 'bm' ? 'Diluluskan' : 'Approved' },
              { id: 'billed', label: language === 'bm' ? 'Dibilkan' : 'Billed' },
              { id: 'cancel_requested', label: language === 'bm' ? 'Minta Batal' : 'Cancel req.' },
              { id: 'cancelled', label: language === 'bm' ? 'Dibatalkan' : 'Cancelled' },
            ].map((chip) => {
              const active = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  aria-pressed={active}
                  className={`h-9 min-h-[36px] px-3 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-[var(--color-sunshine-cta)] text-white border-[var(--color-sunshine-cta)] shadow-sm'
                      : 'bg-cream/50 dark:bg-background/40 text-deep-forest/70 dark:text-stone/70 border-stone/15 dark:border-white/10 hover:border-[var(--color-sunshine-cta)]/40'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Selection tools — only when Select Mode is on */}
        {isSelectMode && (
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-stone/10 dark:border-white/5">
            <div className="flex items-center gap-2.5 px-3.5 bg-cream/50 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl h-11 md:h-10 min-h-[44px] md:min-h-[40px]">
              <Switch
                id="email-filter-toggle"
                checked={filterBySameEmail}
                onCheckedChange={(checked) => setFilterBySameEmail?.(checked)}
              />
              <label htmlFor="email-filter-toggle" className="text-sm font-semibold text-deep-forest/80 dark:text-stone/80 cursor-pointer select-none whitespace-nowrap">
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
                className="h-11 md:h-10 min-h-[44px] md:min-h-[40px] border-stone/20 font-semibold"
              >
                {searchedOrders.every(o => o.id && selectedOrderIds.has(o.id)) ? (
                  <><Check className="w-4 h-4 mr-1.5 text-[var(--color-sunshine-cta)]" />{t('deselect_all') || 'Deselect'}</>
                ) : (
                  <><Check className="w-4 h-4 mr-1.5 opacity-40" />{t('select_all_orders') || 'Select All'}</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Jotform-style Submissions List */}
      <div className="bg-white dark:bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-sm overflow-hidden divide-y divide-stone/10 dark:divide-white/5 h-[800px] max-h-[70vh]">
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
          <List
            style={{ height: 650, width: '100%' }}
            rowCount={searchedOrders.length}
            rowHeight={typeof window !== 'undefined' && window.innerWidth < 768 ? 260 : 175}
            rowProps={{}}
            rowComponent={(({ index, style }: any) => {
              const order = searchedOrders[index];
              const isSelected = Boolean(order.id && selectedOrderIds.has(order.id));
              const isStarred = Boolean(order.id && starredOrderIds.has(order.id));
              
              // Format header date: Jul 31, 2026 9:30 AM with fallback to eventDate or createdAt
              let formattedHeaderDate = '-';
              const rawDate = order.dateTime || order.eventDate || order.createdAt;
              if (rawDate) {
                try {
                  let d: Date;
                  if (typeof rawDate === 'object' && rawDate !== null) {
                    if ('seconds' in rawDate && typeof (rawDate as any).seconds === 'number') {
                      d = new Date((rawDate as any).seconds * 1000);
                    } else if ('_seconds' in rawDate && typeof (rawDate as any)._seconds === 'number') {
                      d = new Date((rawDate as any)._seconds * 1000);
                    } else {
                      d = new Date(rawDate as any);
                    }
                  } else {
                    d = new Date(rawDate as any);
                  }
                  if (!isNaN(d.getTime())) {
                    formattedHeaderDate = format(d, 'MMM d, yyyy h:mm a');
                  }
                } catch {
                  formattedHeaderDate = String(rawDate);
                }
              }
              if (formattedHeaderDate === '-') {
                formattedHeaderDate = order.orderId ? `#${order.orderId}` : (language === 'bm' ? 'Pesanan Katering' : 'Catering Order');
              }

              // Relative age: e.g. "8h", "1d"
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

              return (
                <div style={style} className="border-b border-stone/10 dark:border-white/5">
                  <div
                    key={order.id || `order-${index}`}
                    onClick={() => openOrderDetail(order)}
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 p-4 md:px-6 hover:bg-cream/15 dark:hover:bg-white/5 transition-colors cursor-pointer relative h-full ${
                      order.status === 'cancel_requested' ? 'bg-amber-500/5 border-l-4 border-l-amber-500' : ''
                    } ${isSelected ? 'bg-[var(--color-sunshine-cta)]/5 dark:bg-[var(--color-sunshine-cta)]/5 border-l-4 border-l-sunshine' : ''}`}
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
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between md:justify-start gap-2">
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-sm md:text-base leading-snug">
                            {formattedHeaderDate}
                          </span>
                          <span className="text-xs text-stone-400 dark:text-stone-500">
                            • {relativeTime} ago
                          </span>
                        </div>

                        {/* Mobile & Desktop Jotform Card Fields Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs bg-cream/20 dark:bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-stone-200/80 dark:border-white/10 mt-2 shadow-2xs" onClick={(e) => e.stopPropagation()}>
                          {/* Client column */}
                          <div className="flex flex-col gap-0.5 min-w-0 bg-white/60 dark:bg-black/20 p-2.5 rounded-xl border border-stone-100 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-400 tracking-wider flex items-center gap-1">
                              {language === 'bm' ? 'Klien' : 'Client'}
                            </span>
                            <span className="font-bold text-deep-forest dark:text-white truncate text-xs sm:text-sm" title={clientName}>
                              {clientName}
                            </span>
                            {order.email && (
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                {order.email}
                              </span>
                            )}
                          </div>

                          {/* Pax / Quantity column */}
                          <div className="flex flex-col gap-0.5 min-w-0 bg-white/60 dark:bg-black/20 p-2.5 rounded-xl border border-stone-100 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-400 tracking-wider">
                              {language === 'bm' ? 'Pax / Kuantiti' : 'Pax / Quantity'}
                            </span>
                            {editingCell?.orderId === order.id && editingCell?.field === 'quantity' ? (
                              <div className="flex items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 h-8 px-2 border border-border bg-white dark:bg-card text-deep-forest dark:text-white rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sunshine-cta)] min-h-[32px]"
                                  disabled={savingCell}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(order);
                                    else if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleInlineSave(order)}
                                  disabled={savingCell}
                                  className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCell(null)}
                                  disabled={savingCell}
                                  className="p-1.5 text-stone bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="group flex items-center gap-1.5 cursor-pointer select-none font-bold text-deep-forest dark:text-white pt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({ orderId: order.id, field: 'quantity' });
                                  setEditValue(String(order.quantity || 0));
                                }}
                                title={language === 'bm' ? 'Klik untuk edit Pax' : 'Click to edit Pax'}
                              >
                                <span className="text-sm">{order.quantity || 0} pax</span>
                                <Edit2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-[var(--color-sunshine-cta)] opacity-60 group-hover:opacity-100 transition-all duration-200" />
                              </div>
                            )}
                          </div>

                          {/* Price per Pax column */}
                          <div className="flex flex-col gap-0.5 min-w-0 bg-white/60 dark:bg-black/20 p-2.5 rounded-xl border border-stone-100 dark:border-white/5">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-400 tracking-wider">
                              {language === 'bm' ? 'Harga per Pax' : 'Price per Pax'}
                            </span>
                            {order.prices ? (
                              <div className="flex flex-col gap-1 items-start pt-0.5">
                                {Object.entries(order.prices).map(([meal, price]) => {
                                  const isCurrentEditing = editingCell?.orderId === order.id && 
                                                           editingCell?.field === 'pricePerPax' && 
                                                           editingCell?.mealKey === meal;
                                  return isCurrentEditing ? (
                                    <div className="flex items-center gap-1" key={meal} onClick={(e) => e.stopPropagation()}>
                                      <span className="text-[9px] text-stone dark:text-stone/75 font-sans capitalize">{meal}:</span>
                                      <span className="text-[9px] text-stone font-mono">RM</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-16 h-7 px-1.5 border border-border bg-white dark:bg-card text-deep-forest dark:text-white rounded-lg text-right text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] min-h-[28px]"
                                        disabled={savingCell}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleInlineSave(order);
                                          else if (e.key === 'Escape') setEditingCell(null);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleInlineSave(order)}
                                        disabled={savingCell}
                                        className="p-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-md transition-colors"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingCell(null)}
                                        disabled={savingCell}
                                        className="p-1 text-stone bg-stone-100 dark:bg-stone-800 rounded-md transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div 
                                      key={meal}
                                      className="group flex items-center gap-1 cursor-pointer select-none leading-none pt-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell({ orderId: order.id, field: 'pricePerPax', mealKey: meal });
                                        setEditValue(String(price));
                                      }}
                                      title={language === 'bm' ? 'Klik untuk edit Harga/Pax' : 'Click to edit Price/Pax'}
                                    >
                                      <span className="text-[10px] text-stone dark:text-stone/75 font-sans capitalize">{meal}:</span>
                                      <span className="font-mono text-xs font-bold text-deep-forest dark:text-stone-100">RM {price.toFixed(2)}</span>
                                      <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-[var(--color-sunshine-cta)] opacity-60 group-hover:opacity-100 transition-all duration-150" />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div 
                                className="group flex items-center gap-1 cursor-pointer text-stone/60 hover:text-[var(--color-sunshine-cta)] select-none text-xs pt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const firstMeal = (order.meals && order.meals[0]) || 'catering';
                                  setEditingCell({ orderId: order.id, field: 'pricePerPax', mealKey: firstMeal });
                                  setEditValue('15.00');
                                }}
                                title={language === 'bm' ? 'Klik untuk menetapkan harga' : 'Click to set pricing'}
                              >
                                <span className="text-xs font-semibold text-[var(--color-sunshine-cta)] underline decoration-dotted">
                                  {language === 'bm' ? '+ Set Harga' : '+ Set Price'}
                                </span>
                                <Edit2 className="w-3 h-3 text-[var(--color-sunshine-cta)] opacity-80" />
                              </div>
                            )}
                          </div>

                          {/* Total Amount column */}
                          <div className="flex flex-col gap-0.5 min-w-0 bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                              {language === 'bm' ? 'Jumlah Keseluruhan' : 'Total Amount'}
                            </span>
                            {order.totalAmount ? (
                              <span className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400 pt-0.5">
                                RM {order.totalAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic text-xs pt-0.5">Pending</span>
                            )}
                          </div>
                        </div>

                        {/* Additional Details (Meals) in small footer text */}
                        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone/5 dark:border-white/5 mt-2">
                          <div className="truncate flex-1">
                            <span className="opacity-70 font-medium">{language === 'bm' ? 'Acara & Menu: ' : 'Event & Menu: '}</span>
                            <span className="font-semibold text-deep-forest dark:text-stone-200">{order.location || '-'}</span>
                            <span className="opacity-50"> • </span>
                            {(order.meals || []).map(m => t(m) || m).join(', ')}
                            {order.preparationType && ` (${order.preparationType === 'buffet' ? (language === 'bm' ? 'Bufet' : 'Buffet') : (language === 'bm' ? 'Kotak' : 'Meal Box')})`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Status badge & Compact actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2.5 shrink-0 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-stone/10 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Primary View Action */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-h-[36px] border-stone/25 hover:border-[var(--color-sunshine-cta)] text-deep-forest dark:text-stone-200 hover:bg-[var(--color-sunshine-cta)]/10 text-xs font-bold px-3.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrderDetail(order);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 group-hover:text-[var(--color-sunshine-cta)]" />
                          <span>{language === 'bm' ? 'Lihat' : 'View'}</span>
                        </Button>

                        {/* More Actions Dropdown Trigger */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 min-h-[36px] min-w-[36px] p-0 text-deep-forest/70 dark:text-stone/70 hover:text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10 rounded-xl flex items-center justify-center shrink-0 border border-stone/15 dark:border-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveMenu({
                              orderId: order.id!,
                              x: rect.left + window.scrollX,
                              y: rect.bottom + window.scrollY
                            });
                          }}
                          title={language === 'bm' ? 'Tindakan Lain' : 'More Actions'}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>

                        {/* Portaled Floating Actions Dropdown */}
                        {activeMenu && activeMenu.orderId === order.id && createPortal(
                          <>
                            {/* Backdrop overlay */}
                            <div 
                              className="fixed inset-0 z-[999] cursor-default" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(null);
                              }} 
                            />
                            <div 
                              className="fixed z-[1000] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl py-1 w-44 font-sans text-xs text-stone-700 dark:text-stone-300 animate-in fade-in slide-in-from-top-1 duration-150"
                              style={{ 
                                top: `${activeMenu.y + 4}px`, 
                                left: `${Math.max(16, activeMenu.x - 144)}px`
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handlePreviewPDF(order, ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || ''));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                <span>{t('preview_pdf') || 'Preview PDF'}</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleDownloadPDF(order, ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || ''));
                                }}
                                disabled={generatingInvoice === order.id}
                                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {generatingInvoice === order.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileDown className="w-3.5 h-3.5 text-green-500" />
                                )}
                                <span>{t('download_pdf') || 'Download PDF'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  openSendDialog(order);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
                              >
                                <Send className="w-3.5 h-3.5 text-amber-500" />
                                <span>{t('send_pdf') || 'Send PDF'}</span>
                              </button>

                              <div className="border-t border-stone-100 dark:border-stone-800 my-1" />

                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  if (order.id) handleDelete(order.id);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-2 font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t('delete_order') || 'Delete Order'}</span>
                              </button>
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) as any}
          />
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
        <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,12px))] left-4 right-4 md:left-auto md:right-8 md:w-96 bg-[var(--color-sunshine-cta)] border border-border/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-[110]">
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
            className="h-10 px-5 bg-white text-[var(--color-sunshine-cta)] hover:bg-cream rounded-xl text-xs font-bold flex items-center gap-2"
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
                placeholder="RW-0015"
                className="font-mono bg-cream/50 dark:bg-background/40 border-stone/15 dark:border-white/10 focus:border-[var(--color-sunshine-cta)] text-sm font-bold text-deep-forest dark:text-white"
              />
              <p className="microcopy-12 text-stone dark:text-stone/70">
                {language === 'bm'
                  ? 'Nombor ini akan digunakan untuk keseluruhan kelompok invois konsolidasi ini.'
                  : 'This number applies to all pages in this consolidated invoice batch.'}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handleGenerateConsolidatedInvoice(true, consolidatedInvoiceNo)}
                className="w-full h-11 bg-[var(--color-sunshine-cta)] text-charcoal rounded-xl text-sm font-bold hover:bg-[var(--color-sunshine-cta)]/90 transition-colors"
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

      <AdminOrdersExportSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredOrders={filteredOrders}
        selectedOrderIds={selectedOrderIds}
        setSelectedOrderIds={setSelectedOrderIds}
        language={language}
        toast={toast}
        prepareConsolidateModal={prepareConsolidateModal}
      />
    </>
  );
}
export default AdminOrdersTab;
