import { createPortal } from 'react-dom';
import { useState } from 'react';
import {
  AlertTriangle, Search, Check, Eye, FileText, FileDown, Send, Trash2, Loader2, FileSpreadsheet, Filter, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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

  return (
    <>
      {/* Cancellation Requests Section */}
      {cancelRequests.length > 0 && (
        <div className="mb-8 p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <h2 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('cancellation_requests') || 'Cancellation Requests'}
          </h2>
          <div className="space-y-3">
            {cancelRequests.map((order, idx) => (
              <div key={order.id || `cancel-${idx}`} className="flex items-center justify-between p-4 bg-white dark:bg-card border border-amber-500/10 rounded-lg">
                <div>
                  <p className="font-semibold">{order.name} ({order.quantity} pax)</p>
                  <p className="text-sm text-deep-forest/60">{order.dateTime ? format(new Date(order.dateTime), 'PP') : '-'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 font-semibold"
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
                    className="bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20 font-semibold"
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

      {/* Streamlined Compact Toolbar (Matching Table View Style) */}
      <div className="mb-4 bg-white dark:bg-card border border-stone/15 dark:border-white/5 rounded-2xl p-3 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deep-forest/40 dark:text-stone/40" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-cream/50 dark:bg-background/40 border-stone/15 dark:border-white/10 text-xs text-deep-forest dark:text-white placeholder:text-deep-forest/40 focus:ring-1 focus:ring-sunshine/50 rounded-xl"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-deep-forest/40 hover:text-deep-forest dark:text-stone/40 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Inline Compact Filter Dropdowns & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3 h-9">
              <Filter className="w-3.5 h-3.5 text-deep-forest/50 dark:text-stone/50 shrink-0" />
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

      {/* Orders Table */}
      <div className="bg-white dark:bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream/70 dark:bg-white/5 border-b border-stone/15 dark:border-white/10 hover:bg-transparent">
                {isSelectMode && (
                  <TableHead className="text-deep-forest/80 dark:text-stone/70 font-bold text-xs w-10">
                    <input
                      type="checkbox"
                      aria-label={t('select_all') || 'Select all'}
                      checked={filteredOrders.length > 0 && filteredOrders.every(o => o.id && selectedOrderIds.has(o.id))}
                      onChange={() => {
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
                              ? 'Paparan semasa merangkumi lebih daripada satu klien. Sila gunakan tapisan Klien untuk pilih satu klien sahaja sebelum "Select All", kerana invois konsolidasi hanya untuk satu klien.'
                              : 'The current view spans more than one client. Please use the Client filter to narrow to a single client before "Select All" — consolidated invoices are limited to one client at a time.',
                            variant: 'error'
                          });
                          return;
                        }
                        setSelectedOrderIds(new Set(filteredOrders.filter(o => o.id).map(o => o.id!)));
                      }}
                      className="w-4 h-4 accent-sunshine cursor-pointer rounded border-stone/30"
                    />
                  </TableHead>
                )}
                <TableHead className="text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider">{language === 'bm' ? 'Klien' : 'Client'}</TableHead>
                <TableHead className="text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider">{t('date')}</TableHead>
                <TableHead className="text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider">{t('quantity')}</TableHead>
                <TableHead className="text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider">{t('status')}</TableHead>
                <TableHead className="text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSelectMode ? 6 : 5} className="text-center text-deep-forest/60 dark:text-stone/60 py-20 bg-stone/5 dark:bg-white/5">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-lg font-display font-bold opacity-80 text-deep-forest dark:text-white">{t('no_orders')}</p>
                      <p className="text-xs opacity-50 dark:text-stone/60">Try adjusting your filters or search term</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, idx) => (
                  <TableRow key={order.id || `order-${idx}`} className={`border-b border-stone/10 dark:border-white/5 hover:bg-cream/40 dark:hover:bg-white/5 transition-colors ${order.status === 'cancel_requested' ? 'bg-amber-500/5 border-l-4 border-l-amber-500' : ''}`}>
                    {isSelectMode && (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={t('select_order') || 'Select order'}
                          checked={Boolean(order.id && selectedOrderIds.has(order.id))}
                          onChange={() => handleToggleOrderSelect(order.id)}
                          className="w-4 h-4 accent-sunshine cursor-pointer rounded border-stone/30"
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-deep-forest dark:text-white font-medium text-xs max-w-[200px]">
                      <span className="block truncate" title={order.to}>{order.to || '-'}</span>
                    </TableCell>
                    <TableCell className="text-deep-forest/70 dark:text-stone/70 text-xs">
                      {order.dateTime ? format(new Date(order.dateTime), 'PP') : '-'}
                    </TableCell>
                    <TableCell className="text-deep-forest dark:text-white text-xs font-semibold">
                      {order.quantity} pax
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-deep-forest/60 dark:text-stone/60 hover:text-sunshine dark:hover:text-sunshine hover:bg-sunshine/10"
                              onClick={() => openOrderDetail(order)}
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
                              className="text-deep-forest/60 dark:text-stone/60 hover:text-blue-400 hover:bg-blue-500/10"
                              onClick={() => handlePreviewPDF(order, ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || ''))}
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
                              className="text-deep-forest/60 dark:text-stone/60 hover:text-green-400 hover:bg-green-500/10"
                              onClick={() => handleDownloadPDF(order, ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || ''))}
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
                              className="text-deep-forest/60 dark:text-stone/60 hover:text-sunshine hover:bg-sunshine/10"
                              onClick={() => openSendDialog(order)}
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
                              className="text-deep-forest/60 dark:text-stone/60 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => order.id && handleDelete(order.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('delete_order')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
                  ? 'Sila sahkan nombor invois dan tetapan lajur nota untuk invois konsolidasi ini.'
                  : 'Confirm invoice number and notes layout for this consolidated invoice.'}
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
