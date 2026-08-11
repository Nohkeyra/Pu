import { createPortal } from 'react-dom';
import { useState } from 'react';
import {
  AlertTriangle, Check, Eye, FileText, FileDown, Send, Trash2, Loader2, FileSpreadsheet, X, Star, Edit2, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import type { Order } from '@/types';
import { AdminOrdersExportSheet } from './AdminOrdersExportSheet';

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-3">
          {/* Inline Compact Filter Dropdowns & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date From & Date To */}
            <div className="flex items-center gap-2 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3 h-9">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                {language === 'bm' ? 'Dari:' : 'From:'}
              </span>
              <input
                type="date"
                aria-label={language === 'bm' ? 'Tarikh Dari' : 'Date From'}
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer min-w-[110px]"
              />
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0">
                {language === 'bm' ? 'Hingga:' : 'To:'}
              </span>
              <input
                type="date"
                aria-label={language === 'bm' ? 'Tarikh Hingga' : 'Date To'}
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer min-w-[110px]"
              />
            </div>

            {/* Clear Filter Button */}
            {(dateFromFilter || dateToFilter) && (
              <button
                onClick={() => {
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
                className="border-stone/15 dark:border-white/10 bg-cream/60 dark:bg-background/40 text-deep-forest dark:text-white hover:bg-[var(--color-sunshine-cta)]/10 text-xs font-semibold h-9 px-3 rounded-xl flex items-center gap-1.5 !min-h-0"
              >
                {filteredOrders.every(o => o.id && selectedOrderIds.has(o.id)) ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)]" />
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
              className="border-[var(--color-sunshine-cta)]/30 bg-[var(--color-sunshine-cta)]/10 text-deep-forest dark:text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/20 text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5 !min-h-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)]" />
              <span>{language === 'bm' ? 'Eksport' : 'Export'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Jotform-style Submissions List */}
      <div className="bg-white dark:bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-sm overflow-hidden divide-y divide-stone/10 dark:divide-white/5 h-[800px] max-h-[70vh]">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-deep-forest/60 dark:text-stone/60 py-20 bg-stone/5 dark:bg-white/5">
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-display font-bold opacity-80 text-deep-forest dark:text-white">{t('no_orders')}</p>
              <p className="text-xs opacity-50 dark:text-stone/60">Try adjusting your filters or search term</p>
            </div>
          </div>
        ) : (
          <List
            style={{ height: 650, width: '100%' }}
            rowCount={filteredOrders.length}
            rowHeight={typeof window !== 'undefined' && window.innerWidth < 768 ? 260 : 175}
            rowProps={{}}
            rowComponent={(({ index, style }: any) => {
              const order = filteredOrders[index];
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
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 p-3 md:px-6 hover:bg-cream/15 dark:hover:bg-white/5 transition-colors cursor-pointer relative h-full ${
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

                        {/* Beautiful Jotform Fields Layout */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3.5 text-xs bg-cream/10 dark:bg-white/5 p-3 rounded-xl border border-stone/10 dark:border-white/5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Client column */}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">
                              {language === 'bm' ? 'Klien' : 'Client'}
                            </span>
                            <span className="font-semibold text-deep-forest dark:text-white truncate" title={clientName}>
                              {clientName}
                            </span>
                          </div>

                          {/* Pax / Quantity column */}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">
                              {language === 'bm' ? 'Pax / Kuantiti' : 'Pax / Quantity'}
                            </span>
                            {editingCell?.orderId === order.id && editingCell?.field === 'quantity' ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 h-7 px-1.5 border border-border bg-white dark:bg-card text-deep-forest dark:text-white rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
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
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCell(null)}
                                  disabled={savingCell}
                                  className="p-1 text-stone hover:bg-stone/10 rounded-md transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="group flex items-center gap-1.5 cursor-pointer select-none font-bold text-deep-forest dark:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({ orderId: order.id, field: 'quantity' });
                                  setEditValue(String(order.quantity || 0));
                                }}
                                title={language === 'bm' ? 'Klik untuk edit Pax' : 'Click to edit Pax'}
                              >
                                <span>{order.quantity || 0} pax</span>
                                <Edit2 className="w-3 h-3 text-stone/50 group-hover:text-[var(--color-sunshine-cta)] opacity-0 group-hover:opacity-100 transition-all duration-200" />
                              </div>
                            )}
                          </div>

                          {/* Price per Pax column */}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">
                              {language === 'bm' ? 'Harga per Pax' : 'Price per Pax'}
                            </span>
                            {order.prices ? (
                              <div className="flex flex-col gap-1 items-start">
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
                                        className="w-14 h-6 px-1 border border-border bg-white dark:bg-card text-deep-forest dark:text-white rounded-lg text-right text-[11px] font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
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
                                        className="p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-colors"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingCell(null)}
                                        disabled={savingCell}
                                        className="p-0.5 text-stone hover:bg-stone/10 rounded-md transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div 
                                      key={meal}
                                      className="group flex items-center gap-1 cursor-pointer select-none leading-none"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell({ orderId: order.id, field: 'pricePerPax', mealKey: meal });
                                        setEditValue(String(price));
                                      }}
                                      title={language === 'bm' ? 'Klik untuk edit Harga/Pax' : 'Click to edit Price/Pax'}
                                    >
                                      <span className="text-[10px] text-stone dark:text-stone/75 font-sans capitalize">{meal}:</span>
                                      <span className="font-mono text-xs font-semibold text-deep-forest dark:text-stone-100">RM {price.toFixed(2)}</span>
                                      <Edit2 className="w-2.5 h-2.5 text-stone/40 group-hover:text-[var(--color-sunshine-cta)] opacity-0 group-hover:opacity-100 transition-all duration-150" />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div 
                                className="group flex items-center gap-1 cursor-pointer text-stone/50 hover:text-[var(--color-sunshine-cta)] select-none text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const firstMeal = (order.meals && order.meals[0]) || 'catering';
                                  setEditingCell({ orderId: order.id, field: 'pricePerPax', mealKey: firstMeal });
                                  setEditValue('15.00');
                                }}
                                title={language === 'bm' ? 'Klik untuk menetapkan harga' : 'Click to set pricing'}
                              >
                                <span className="text-xs font-normal italic group-hover:not-italic group-hover:font-semibold">
                                  {language === 'bm' ? '+ Set Harga' : '+ Set Price'}
                                </span>
                                <Edit2 className="w-3 h-3 text-stone/40 opacity-0 group-hover:opacity-100 transition-all duration-150" />
                              </div>
                            )}
                          </div>

                          {/* Total Amount column */}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">
                              {language === 'bm' ? 'Jumlah Keseluruhan' : 'Total Amount'}
                            </span>
                            {order.totalAmount ? (
                              <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                                RM {order.totalAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic">Pending</span>
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
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 self-stretch md:self-auto pt-1 md:pt-0 border-t md:border-t-0 border-stone/10 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Primary View Action */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-stone/20 text-deep-forest dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold px-3 rounded-lg flex items-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrderDetail(order);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'bm' ? 'Lihat' : 'View'}</span>
                        </Button>

                        {/* More Actions Dropdown Trigger */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-deep-forest/60 dark:text-stone/60 hover:text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10 rounded-lg flex items-center justify-center shrink-0"
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
