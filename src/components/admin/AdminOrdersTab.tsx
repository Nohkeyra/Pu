import { createPortal } from 'react-dom';
import { useState } from 'react';
import {
  AlertTriangle, Search, Check, Eye, FileText, FileDown, Send, Trash2, Loader2, FileSpreadsheet, Filter, X, Mail, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ToastVariant } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import type { Order } from '@/types';
import { generateInvoicePDF } from '@/services/pdfService';
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
  dateSortOrder = 'desc',
  setDateSortOrder,
  isSelectMode,
  setIsSelectMode,
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
  dateSortOrder?: 'desc' | 'asc';
  setDateSortOrder?: (v: 'desc' | 'asc') => void;
  isSelectMode: boolean;
  setIsSelectMode: (v: boolean) => void;
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
  handleGenerateConsolidatedInvoice: (withNotes: boolean) => void;
  authHeaders: () => HeadersInit;
  getApiUrl: (path: string) => string;
  fetchOrders: () => void;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  setIsApproving: (v: boolean) => void;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSendingEmailForRequest, setIsSendingEmailForRequest] = useState<string | null>(null);

  const customerRequests = orders.filter(o => o.invoiceEmailRequested && !o.invoiceEmailHandled);

  const handleFulfillInvoiceEmailRequest = async (order: Order) => {
    if (!order.id) return;
    setIsSendingEmailForRequest(order.id);
    try {
      const isFinal = (order.status || '').toLowerCase() === 'invoiced' || (order.status || '').toLowerCase() === 'billed' || (order.status || '').toLowerCase() === 'priced' || (order.status || '').toLowerCase() === 'approved';
      const pdfDoc = generateInvoicePDF(order, isFinal, order.lang || 'bm');
      const pdfBase64 = pdfDoc.output('datauristring');
      const invoiceNo = order.invoiceNo || `RW-${order.id.slice(0, 8).toUpperCase()}`;

      const targetEmail = order.email;

      if (!targetEmail || !targetEmail.includes('@')) {
        openSendDialog(order);
        setIsSendingEmailForRequest(null);
        return;
      }

      const response = await fetch(getApiUrl('/api/send-invoice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: targetEmail,
          name: order.name || order.to,
          invoiceNo,
          pdfBase64,
          isFinal: true,
          lang: order.lang || 'bm',
        }),
      });

      if (!response.ok) {
        throw new Error(language === 'bm' ? 'Gagal menghantar emel invois via pelayan SMTP.' : 'Failed to send invoice email via SMTP server.');
      }

      await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId: order.id,
          data: {
            invoiceEmailHandled: true,
            invoiceEmailHandledAt: new Date().toISOString(),
            invoiceEmailSentAt: new Date().toISOString(),
            invoiceEmailRequested: false,
          }
        })
      });

      toast({
        title: language === 'bm' ? 'Invois Dihantar' : 'Invoice Email Sent',
        description: language === 'bm'
          ? `Invois rasmi berjaya dihantar ke emel ${targetEmail}`
          : `Official invoice successfully sent to ${targetEmail}`,
        variant: 'success',
      });

      fetchOrders();
    } catch (err) {
      console.error('Error fulfilling invoice email request:', err);
      toast({
        title: language === 'bm' ? 'Penghantaran Gagal' : 'Sending Failed',
        description: err instanceof Error ? err.message : 'Failed to send invoice email.',
        variant: 'error',
      });
    } finally {
      setIsSendingEmailForRequest(null);
    }
  };

  const handleDismissInvoiceEmailRequest = async (orderId: string) => {
    try {
      await fetch(getApiUrl('/api/admin/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'update',
          orderId,
          data: {
            invoiceEmailHandled: true,
            invoiceEmailHandledAt: new Date().toISOString(),
            invoiceEmailRequested: false,
          }
        })
      });

      toast({
        title: language === 'bm' ? 'Permintaan Ditanda Selesai' : 'Request Marked Handled',
        variant: 'success',
      });

      fetchOrders();
    } catch (e) {
      console.error('Error dismissing poke request:', e);
    }
  };

  const needsAttentionCount = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    if (s === 'cancelled' || s === 'dibatalkan' || s === 'rejected' || s === 'ditolak') return false;
    if (s === 'invoiced' || s === 'billed' || s === 'dibilkan' || (o.invoiceNo && o.invoiceNo.trim() !== '')) return false;
    const hasUnitPrice = Boolean(o.unitPrice && o.unitPrice > 0) || (o.prices && Object.keys(o.prices).length > 0 && Object.values(o.prices).some(p => p > 0));
    if (s === 'priced' || s === 'approved' || s === 'diluluskan' || hasUnitPrice) return false;
    return true;
  }).length;

  const readyForInvoiceCount = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    if (s === 'cancelled' || s === 'dibatalkan' || s === 'rejected' || s === 'ditolak') return false;
    if (s === 'invoiced' || s === 'billed' || s === 'dibilkan' || (o.invoiceNo && o.invoiceNo.trim() !== '')) return false;
    const hasUnitPrice = Boolean(o.unitPrice && o.unitPrice > 0) || (o.prices && Object.keys(o.prices).length > 0 && Object.values(o.prices).some(p => p > 0));
    return s === 'priced' || s === 'approved' || s === 'diluluskan' || hasUnitPrice;
  }).length;

  const invoicedOrdersCount = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    if (s === 'cancelled' || s === 'dibatalkan' || s === 'rejected' || s === 'ditolak') return false;
    return s === 'invoiced' || s === 'billed' || s === 'dibilkan' || Boolean(o.invoiceNo && o.invoiceNo.trim() !== '');
  }).length;

  return (
    <>
      {/* 3 Core Workflow Visual Notification Cards with Glowing Color Indicators */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: 🔴 Needs Attention */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'submitted' ? 'all' : 'submitted')}
          className={`relative overflow-hidden p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between cursor-pointer border ${
            statusFilter === 'submitted' || statusFilter === 'pending'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30 shadow-[0_4px_20px_rgba(225,29,72,0.2)]'
              : 'bg-white/90 dark:bg-card/90 border-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_4px_16px_rgba(225,29,72,0.12)]'
          }`}
        >
          {/* Subtle Malay Batik motif watermark background accent */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 pointer-events-none select-none">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-rose-900">
              <path d="M50 0 C60 25, 75 40, 100 50 C75 60, 60 75, 50 100 C40 75, 25 60, 0 50 C25 40, 40 25, 50 0 Z" />
            </svg>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/15 text-rose-800 dark:text-rose-300 text-xs font-black uppercase tracking-wider border border-rose-500/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.8)]"></span>
              </span>
              {language === 'bm' ? 'Perlu Tindakan' : 'Needs Attention'}
            </span>
            <span className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              {needsAttentionCount}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-deep-forest dark:text-stone-100">
              {needsAttentionCount === 1
                ? (language === 'bm' ? '1 Pesanan Perlu Tindakan' : '1 Order Needs Attention')
                : `${needsAttentionCount} ${language === 'bm' ? 'Pesanan Perlu Tindakan' : 'Orders Need Attention'}`}
            </p>
            <p className="text-xs text-deep-forest/60 dark:text-stone-400 font-medium leading-relaxed">
              {language === 'bm'
                ? 'Permohonan katering baru (Perlu semakan & harga per unit)'
                : 'New catering requests (Need admin review & unit pricing)'}
            </p>
          </div>
        </button>

        {/* Card 2: 🟡 Ready for Invoice */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'priced' ? 'all' : 'priced')}
          className={`relative overflow-hidden p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between cursor-pointer border ${
            statusFilter === 'priced' || statusFilter === 'approved'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-[0_4px_20px_rgba(217,119,6,0.2)]'
              : 'bg-white/90 dark:bg-card/90 border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_4px_16px_rgba(217,119,6,0.12)]'
          }`}
        >
          {/* Subtle Malay Batik motif watermark background accent */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 pointer-events-none select-none">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-amber-900">
              <path d="M50 0 C60 25, 75 40, 100 50 C75 60, 60 75, 50 100 C40 75, 25 60, 0 50 C25 40, 40 25, 50 0 Z" />
            </svg>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-500/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-[0_0_12px_rgba(217,119,6,0.8)]"></span>
              </span>
              {language === 'bm' ? 'Sedia Untuk Invois' : 'Ready for Invoice'}
            </span>
            <span className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              {readyForInvoiceCount}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-deep-forest dark:text-stone-100">
              {readyForInvoiceCount === 1
                ? (language === 'bm' ? '1 Invois Sedia Dijana' : '1 Invoice Ready')
                : `${readyForInvoiceCount} ${language === 'bm' ? 'Invois Sedia Dijana' : 'Invoices Ready'}`}
            </p>
            <p className="text-xs text-deep-forest/60 dark:text-stone-400 font-medium leading-relaxed">
              {language === 'bm'
                ? 'Harga per unit ditetapkan (Menunggu penjanaan invois rasmi)'
                : 'Unit price entered (Pending final invoice generation)'}
            </p>
          </div>
        </button>

        {/* Card 3: 🟢 Invoiced Orders */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'invoiced' ? 'all' : 'invoiced')}
          className={`relative overflow-hidden p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between cursor-pointer border ${
            statusFilter === 'invoiced' || statusFilter === 'billed'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.2)]'
              : 'bg-white/90 dark:bg-card/90 border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
          }`}
        >
          {/* Subtle Malay Batik motif watermark background accent */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 pointer-events-none select-none">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-emerald-900">
              <path d="M50 0 C60 25, 75 40, 100 50 C75 60, 60 75, 50 100 C40 75, 25 60, 0 50 C25 40, 40 25, 50 0 Z" />
            </svg>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/20">
              <span className="relative flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
              </span>
              {language === 'bm' ? 'Invois Telah Dijana' : 'Invoiced Orders'}
            </span>
            <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {invoicedOrdersCount}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-deep-forest dark:text-stone-100">
              {invoicedOrdersCount === 1
                ? (language === 'bm' ? '1 Pesanan Berinvois' : '1 Invoiced Order')
                : `${invoicedOrdersCount} ${language === 'bm' ? 'Pesanan Berinvois' : 'Invoiced Orders'}`}
            </p>
            <p className="text-xs text-deep-forest/60 dark:text-stone-400 font-medium leading-relaxed">
              {language === 'bm'
                ? 'Invois rasmi telah dikeluarkan & dokumen PDF sedia'
                : 'Final invoice generated & official PDF available'}
            </p>
          </div>
        </button>
      </div>

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

      {/* 📩 Customer Requests Section ("Poke" Feature Notification Cards) */}
      {customerRequests.length > 0 && (
        <div className="mb-8 p-6 bg-amber-500/5 dark:bg-card/90 border border-amber-500/30 rounded-2xl shadow-sm relative overflow-hidden">
          {/* Subtle Malay Batik Motif Watermark */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 opacity-5 pointer-events-none select-none">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-amber-900">
              <path d="M50 0 C60 25, 75 40, 100 50 C75 60, 60 75, 50 100 C40 75, 25 60, 0 50 C25 40, 40 25, 50 0 Z" />
            </svg>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Mail className="w-5 h-5 animate-bounce text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-deep-forest dark:text-stone-100 font-display flex items-center gap-2">
                  📩 {language === 'bm' ? 'Permintaan Pelanggan' : 'Customer Requests'}
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-mono font-bold">
                    {customerRequests.length}
                  </span>
                </h2>
                <p className="text-xs text-deep-forest/60 dark:text-stone-400">
                  {language === 'bm'
                    ? 'Permintaan khas pelanggan untuk penghantaran emel invois rasmi'
                    : 'Customer-triggered requests for official invoice email delivery'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerRequests.map((order, idx) => (
              <div
                key={order.id || `poke-${idx}`}
                className="p-4 bg-white dark:bg-background border border-amber-500/20 rounded-xl flex flex-col justify-between shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 block">
                      {order.invoiceNo || `RW-${order.id?.slice(0, 8).toUpperCase()}`}
                    </span>
                    <h4 className="font-bold text-sm text-deep-forest dark:text-stone-100">
                      {order.to || order.name}
                    </h4>
                    <p className="text-xs text-deep-forest/70 dark:text-stone-300 font-mono">
                      {order.email || order.contact || 'No email provided'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    {language === 'bm' ? 'Mohon Emel Invois' : 'Invoice Requested'}
                  </span>
                </div>

                <div className="text-xs text-deep-forest/60 dark:text-stone-400 flex items-center justify-between border-t border-stone/10 pt-2">
                  <span>
                    {order.quantity ? `${order.quantity} pax` : ''} • {order.menu || 'Katering'}
                  </span>
                  <span className="font-mono text-[10px]">
                    {order.invoiceEmailRequestedAt ? format(new Date(order.invoiceEmailRequestedAt), 'dd MMM, p') : ''}
                  </span>
                </div>

                <div className="pt-1 flex gap-2">
                  <Button
                    onClick={() => handleFulfillInvoiceEmailRequest(order)}
                    disabled={isSendingEmailForRequest === order.id}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingEmailForRequest === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {language === 'bm' ? 'Hantar Emel Invois' : 'Send Invoice Email'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleDismissInvoiceEmailRequest(order.id!)}
                    className="h-9 px-3 text-xs text-deep-forest/60 hover:text-deep-forest border-stone/20"
                    title={language === 'bm' ? 'Tanda selesai' : 'Mark as handled'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Bulk Select Action Bar */}
      <div className="mb-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deep-forest/40" />
          <Input
            placeholder={t('search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-card border-stone/15 dark:border-white/5 shadow-sm text-deep-forest placeholder:text-deep-forest/30 focus:border-sunshine/50"
          />
        </div>
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="border-stone/15 dark:border-white/5 bg-white dark:bg-card text-deep-forest hover:bg-sunshine/10 text-xs font-bold shrink-0 h-10 px-4 rounded-xl flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-sunshine" />
            {language === 'bm' ? 'Eksport Excel/CSV' : 'Export Excel/CSV'}
          </Button>

          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-card border border-stone/15 dark:border-white/5 shadow-sm rounded-xl h-10 shrink-0">
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
            <label htmlFor="select-mode-toggle" className="text-xs font-bold text-deep-forest/80 cursor-pointer select-none">
              {language === 'bm' ? 'Mod Pilih' : 'Select Mode'}
            </label>
          </div>
          {isSelectMode && filteredOrders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => o.id && selectedOrderIds.has(o.id));
                if (allSelected) {
                  setSelectedOrderIds(new Set());
                } else {
                  setSelectedOrderIds(new Set(filteredOrders.filter(o => o.id).map(o => o.id!)));
                }
              }}
              className="border-stone/15 dark:border-white/5 bg-white dark:bg-card text-deep-forest hover:bg-sunshine/10 text-xs font-bold shrink-0 h-10 px-4 rounded-xl flex items-center gap-1.5"
            >
              {filteredOrders.every(o => o.id && selectedOrderIds.has(o.id)) ? (
                <>
                  <Check className="w-3.5 h-3.5 text-sunshine" />
                  {t('deselect_all') || 'Deselect All'}
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-deep-forest/40" />
                  {t('select_all_orders') || 'Select All'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Table Filters: Status / Client / Date Range */}
      <div className="mb-6 p-4 bg-white dark:bg-card border border-stone/15 dark:border-white/5 shadow-sm rounded-xl flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex items-center gap-1.5 text-deep-forest/50 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {language === 'bm' ? 'Tapis' : 'Filters'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 bg-white dark:bg-card border-stone/15 dark:border-white/5 text-sm">
              <SelectValue placeholder={language === 'bm' ? 'Status' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bm' ? 'Semua Status' : 'All Statuses'}</SelectItem>
              <SelectItem value="submitted">🔴 {language === 'bm' ? 'Perlu Tindakan (Perlu Harga)' : 'Needs Attention (Need Pricing)'}</SelectItem>
              <SelectItem value="priced">🟡 {language === 'bm' ? 'Sedia Untuk Invois (Harga Ditetapkan)' : 'Ready for Invoice (Price Entered)'}</SelectItem>
              <SelectItem value="invoiced">🟢 {language === 'bm' ? 'Pesanan Disahkan (Invois Dijana)' : 'Confirmed Orders (Invoiced)'}</SelectItem>
              <SelectItem value="cancel_requested">{t('cancel_requested') || 'Cancel Requested'}</SelectItem>
              <SelectItem value="cancelled">{t('cancelled') || 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-10 bg-white dark:bg-card border-stone/15 dark:border-white/5 text-sm">
              <SelectValue placeholder={language === 'bm' ? 'Klien' : 'Client'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bm' ? 'Semua Klien' : 'All Clients'}</SelectItem>
              {clientOptions.map((client) => (
                <SelectItem key={client} value={client} className="max-w-[280px] truncate">
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              aria-label={language === 'bm' ? 'Dari tarikh' : 'Date from'}
              className="h-10 bg-white dark:bg-card border-stone/15 dark:border-white/5 text-sm w-[140px]"
            />
            <span className="text-deep-forest/30 text-xs shrink-0">{language === 'bm' ? 'hingga' : 'to'}</span>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              aria-label={language === 'bm' ? 'Hingga tarikh' : 'Date to'}
              className="h-10 bg-white dark:bg-card border-stone/15 dark:border-white/5 text-sm w-[140px]"
            />
          </div>

          {/* Event Date Sort Order Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={dateSortOrder}
              onValueChange={(val: 'desc' | 'asc') => setDateSortOrder?.(val)}
            >
              <SelectTrigger className="h-10 bg-white dark:bg-card border-stone/15 dark:border-white/5 text-sm w-[215px] font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-sunshine shrink-0" />
                  <SelectValue placeholder={language === 'bm' ? 'Susunan Tarikh' : 'Event Date Order'} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">
                  📅 {language === 'bm' ? 'Tarikh Acara: Terkini Dahulu' : 'Event Date: Newest First'}
                </SelectItem>
                <SelectItem value="asc">
                  📅 {language === 'bm' ? 'Tarikh Acara: Terlama Dahulu' : 'Event Date: Oldest First'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(statusFilter !== 'all' || clientFilter !== 'all' || dateFromFilter || dateToFilter || dateSortOrder !== 'desc') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setClientFilter('all');
              setDateFromFilter('');
              setDateToFilter('');
              setDateSortOrder?.('desc');
            }}
            className="h-10 px-3 text-deep-forest/60 hover:text-red-500 hover:bg-red-500/10 text-xs font-bold shrink-0 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            {language === 'bm' ? 'Kosongkan Tapisan' : 'Clear Filters'}
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-card rounded-xl border border-stone/15 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone/10 dark:border-white/5 hover:bg-transparent">
                {isSelectMode && (
                  <TableHead className="text-deep-forest/60 w-10">
                    <input
                      type="checkbox"
                      aria-label={t('select_all') || 'Select all'}
                      checked={filteredOrders.length > 0 && filteredOrders.every(o => o.id && selectedOrderIds.has(o.id))}
                      onChange={() => {
                        const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => o.id && selectedOrderIds.has(o.id));
                        if (allSelected) {
                          setSelectedOrderIds(new Set());
                        } else {
                          setSelectedOrderIds(new Set(filteredOrders.filter(o => o.id).map(o => o.id!)));
                        }
                      }}
                      className="w-4 h-4 accent-sunshine cursor-pointer"
                    />
                  </TableHead>
                )}
                <TableHead className="text-deep-forest/60 font-bold">{language === 'bm' ? 'Klien' : 'Client'}</TableHead>
                <TableHead
                  onClick={() => setDateSortOrder?.(dateSortOrder === 'desc' ? 'asc' : 'desc')}
                  className="text-deep-forest/60 font-bold cursor-pointer select-none hover:text-sunshine transition-colors group"
                  title={language === 'bm' ? 'Klik untuk tukar susunan tarikh acara' : 'Click to toggle event date sort order'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('date')}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-sunshine group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono text-sunshine font-semibold bg-sunshine/10 px-1.5 py-0.5 rounded">
                      {dateSortOrder === 'desc' ? (language === 'bm' ? 'Terkini' : 'Newest') : (language === 'bm' ? 'Terlama' : 'Oldest')}
                    </span>
                  </div>
                </TableHead>
                <TableHead className="text-deep-forest/60 font-bold">{t('quantity')}</TableHead>
                <TableHead className="text-deep-forest/60 font-bold">{t('status')}</TableHead>
                <TableHead className="text-deep-forest/60 font-bold text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSelectMode ? 6 : 5} className="text-center text-deep-forest/60 py-20 bg-stone/5 dark:bg-white/5">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-lg font-display font-bold opacity-80">{t('no_orders')}</p>
                      <p className="text-xs opacity-50">Try adjusting your filters or search term</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, idx) => (
                  <TableRow key={order.id || `order-${idx}`} className={`border-stone/10 dark:border-white/5 hover:bg-sunshine/5 ${order.status === 'cancel_requested' ? 'bg-amber-500/5 border-l-4 border-l-amber-500' : ''}`}>
                    {isSelectMode && (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={t('select_order') || 'Select order'}
                          checked={Boolean(order.id && selectedOrderIds.has(order.id))}
                          onChange={() => handleToggleOrderSelect(order.id)}
                          className="w-4 h-4 accent-sunshine cursor-pointer"
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-deep-forest/70 max-w-[200px]">
                      <span className="block truncate" title={order.to}>{order.to || '-'}</span>
                    </TableCell>
                    <TableCell className="text-deep-forest/70">
                      {order.dateTime ? format(new Date(order.dateTime), 'PP') : '-'}
                    </TableCell>
                    <TableCell className="text-deep-forest/70">
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
                              className="text-deep-forest/60 hover:text-sunshine hover:bg-sunshine/10"
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
                              className="text-deep-forest/60 hover:text-blue-400 hover:bg-blue-500/10"
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
                              className="text-deep-forest/60 hover:text-green-400 hover:bg-green-500/10"
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
                              className="text-deep-forest/60 hover:text-sunshine hover:bg-sunshine/10"
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
                              className="text-deep-forest/60 hover:text-red-400 hover:bg-red-500/10"
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
            onClick={() => setShowConsolidateModal(true)}
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
          <div className="relative w-full max-w-sm bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-deep-forest">
                {t('invoice_layout') || 'Invoice Layout'}
              </h3>
              <p className="text-xs text-stone leading-relaxed">
                {t('consolidate_notes_prompt') ||
                  'Include the "Notes" column in this consolidated invoice? Orders are grouped by client automatically.'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleGenerateConsolidatedInvoice(true)}
                className="w-full h-12 bg-sunshine text-white rounded-xl text-sm font-bold hover:bg-crisp-carrot transition-colors"
              >
                {t('include_notes') || 'Yes, include Notes'}
              </button>
              <button
                onClick={() => handleGenerateConsolidatedInvoice(false)}
                className="w-full h-12 bg-cream border border-border text-deep-forest rounded-xl text-sm font-bold hover:bg-black/5 transition-colors"
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
