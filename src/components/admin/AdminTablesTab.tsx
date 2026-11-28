import { InvoiceBatchDialog } from './InvoiceBatchDialog';
import { useRememberedState } from '@/hooks/ui/useRememberedView';
import { invoiceRecipient, invoiceMatchText } from '@/lib/invoiceBatch';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { getOrderStatus, VALID_STATUS_TRANSITIONS } from '@/lib/orderStatus';
import { hasPositiveOrderPricing } from '@/lib/adminKpiStats';
import { formatAdminEvent, getAdminEventDate, getAdminEventTime, getAdminOrderPax } from '@/lib/adminOrderFilters';
import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  Loader2,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns,
  Check,
  Building2,
  Calendar,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Order } from '../../types';
import type { ToastMessage } from '../ui/Toast';
import { Button } from '@/components/ui/button';
import { exportOrdersAsExcelStandard } from '@/lib/exportUtils';
import {
  compareTimestampValues,
  getDisplayInvoiceNo,
  formatDateDisplay,
} from '@/lib/utils';

interface AdminTablesTabProps {
  viewScope?: string;
  onReadOrder?: (order: Order) => void;
  onSendInvoice?: (order: Order) => void;
  orders: Order[];
  filteredOrders: Order[];
  selectedIds: Set<string>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  language: 'en' | 'bm';
  openOrderDetail: (order: Order) => void;
  handlePreviewPDF: (order: Order, isFinal: boolean) => Promise<void> | void;
  handleDownloadPDF: (order: Order, isFinal: boolean) => void;
  handleDelete: (id: string) => void;
  fetchOrders: () => Promise<void>;
  authHeaders: () => HeadersInit;
  getApiUrl: (endpoint: string) => string;
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  prepareConsolidateModal?: (orders?: Order[]) => Promise<void> | void;
  consolidatedInvoiceNo?: string;
  setConsolidatedInvoiceNo?: (v: string) => void;
  showConsolidateModal?: boolean;
  setShowConsolidateModal?: (v: boolean) => void;
  isGeneratingConsolidated?: boolean;
  handleGenerateConsolidatedInvoice?: (
    orders: Order[],
    withNotes: boolean,
    invoiceNo?: string,
    billingAddress?: string
  ) => Promise<string | null>;
}

type SortField =
  'date' | 'to' | 'name' | 'quantity' | 'totalAmount' | 'status' | 'createdAt' | 'pricePerPax' | 'invoiceNo';
type SortOrder = 'asc' | 'desc';
type TableDensity = 'compact' | 'normal' | 'spacious';

interface ColumnDef {
  key: string;
  labelEn: string;
  labelBm: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'dateTime', labelEn: 'Event Date', labelBm: 'Tarikh Acara', defaultVisible: true },
  { key: 'meals', labelEn: 'Meal', labelBm: 'Hidangan', defaultVisible: false },
  { key: 'quantity', labelEn: 'Pax', labelBm: 'Pax', defaultVisible: true },
  { key: 'menu', labelEn: 'Menu', labelBm: 'Menu', defaultVisible: false },
  { key: 'preparationType', labelEn: 'Prep', labelBm: 'Sajian', defaultVisible: false },
  { key: 'pricePerPax', labelEn: 'Price per Pax', labelBm: 'Harga per Pax', defaultVisible: false },
  { key: 'totalAmount', labelEn: 'Total', labelBm: 'Jumlah', defaultVisible: false },
  { key: 'status', labelEn: 'Status', labelBm: 'Status', defaultVisible: true },
  {
    key: 'invoiceNo',
    labelEn: 'Ref / Invoice No',
    labelBm: 'No. Rujukan / Invois',
    defaultVisible: true,
  },
  { key: 'createdAt', labelEn: 'Submitted Date', labelBm: 'Tarikh Hantar', defaultVisible: false },
  {
    key: 'to',
    labelEn: 'Client / Organization',
    labelBm: 'Klien / Organisasi',
    defaultVisible: true,
  },
  {
    key: 'name',
    labelEn: 'Contact Person',
    labelBm: 'Pegawai Bertanggungjawab',
    defaultVisible: false,
  },
  { key: 'contact', labelEn: 'Phone Number', labelBm: 'No. Telefon', defaultVisible: false },
  { key: 'email', labelEn: 'Email Address', labelBm: 'Alamat Emel', defaultVisible: false },
  { key: 'location', labelEn: 'Event Location', labelBm: 'Lokasi Acara', defaultVisible: false },
  { key: 'actions', labelEn: 'Actions', labelBm: 'Tindakan', defaultVisible: true },
];

export function AdminTablesTab({
  viewScope = 'admin',
  onReadOrder,
  onSendInvoice,
  orders,
  filteredOrders,
  selectedIds,
  setSelectedIds,
  currentPage,
  setCurrentPage,
  language,
  openOrderDetail,
  handlePreviewPDF,
  handleDownloadPDF,
  handleDelete,
  fetchOrders,
  authHeaders,
  getApiUrl,
  toast,
  prepareConsolidateModal,
  consolidatedInvoiceNo = '',
  showConsolidateModal,
  setShowConsolidateModal,
  isGeneratingConsolidated = false,
  handleGenerateConsolidatedInvoice,
}: AdminTablesTabProps) {
  const reduceMotion = useReducedMotion();
  // Sorting
  const [sortField, setSortField] = useRememberedState<SortField>(
    viewScope + ':tables:sortField',
    'createdAt'
  );
  const [sortOrder, setSortOrder] = useRememberedState<SortOrder>(
    viewScope + ':tables:sortOrder',
    'desc'
  );

  // Table customization
  const [density, setDensity] = useRememberedState<TableDensity>(
    viewScope + ':tables:density',
    'compact'
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useRememberedState<number>(viewScope + ':tables:pageSize', 15);

  // Inline status update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);

  // Consolidation state (with local fallback if parent does not provide)
  const [localShowConsolidateModal, setLocalShowConsolidateModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Order | null>(null);

  const isBm = language === 'bm';

  const isModalOpen =
    showConsolidateModal !== undefined ? showConsolidateModal : localShowConsolidateModal;
  const setIsModalOpen = setShowConsolidateModal || setLocalShowConsolidateModal;
  const currentInvoiceNo = consolidatedInvoiceNo;
  const isGenerating = isGeneratingConsolidated;

  const filteredAndSortedOrders = useMemo(() => {
    return [...filteredOrders]
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortField === 'createdAt') {
          return compareTimestampValues(a.createdAt, b.createdAt, sortOrder);
        }

        if (sortField === 'date') {
          const eventKey = (order: Order) => {
            const date = getAdminEventDate(order);
            return date && `${date}T${getAdminEventTime(order) || '00:00'}:00+08:00`;
          };
          return compareTimestampValues(eventKey(a), eventKey(b), sortOrder);
        }

        if (sortField === 'to') {
          valA = (a.to || '').toLowerCase();
          valB = (b.to || '').toLowerCase();
        } else if (sortField === 'name') {
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
        } else if (sortField === 'quantity') {
          valA = getAdminOrderPax(a);
          valB = getAdminOrderPax(b);
        } else if (sortField === 'totalAmount') {
          valA = a.totalAmount || 0;
          valB = b.totalAmount || 0;
        } else if (sortField === 'status') {
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
        } else if (sortField === 'invoiceNo') {
          valA = getDisplayInvoiceNo(a).toLowerCase();
          valB = getDisplayInvoiceNo(b).toLowerCase();
        } else if (sortField === 'pricePerPax') {
          const getPaxPriceSum = (order: Order): number => {
            if (!order.prices || typeof order.prices !== 'object') return -1;
            const positives = Object.values(order.prices).filter(
              (price) => typeof price === 'number' && Number.isFinite(price) && price > 0
            );
            return positives.length > 0 ? positives.reduce((sum, p) => sum + p, 0) : -1;
          };
          valA = getPaxPriceSum(a);
          valB = getPaxPriceSum(b);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [filteredOrders, sortField, sortOrder]);

  // Paginated Data
  const totalPages = Math.ceil(filteredAndSortedOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (Math.min(Math.max(1, currentPage), totalPages) - 1) * pageSize;
    return filteredAndSortedOrders.slice(start, start + pageSize);
  }, [filteredAndSortedOrders, currentPage, pageSize, totalPages]);

  // Toggle Column Visibility
  const toggleColumn = (key: string) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) {
      if (next.size > 2) next.delete(key); // keep at least 2 columns
    } else {
      next.add(key);
    }
    setVisibleColumns(next);
  };

  // Sort Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Bulk Select
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      paginatedOrders.forEach((order) => {
        if (!order.id) return;
        if (checked) next.add(order.id);
        else next.delete(order.id);
      });
      return next;
    });
  };

  const handleSelectRow = (id?: string) => {
    if (!id) return;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Inline Status Change
  const handleQuickStatusChange = async (order: Order, newStatus: string) => {
    const orderId = order.id;
    if (!orderId) return;

    if (newStatus === 'billed' && !hasPositiveOrderPricing(order)) {
      toast({
        title: isBm ? 'Harga Diperlukan' : 'Pricing Required',
        description: isBm
          ? 'Sila tetapkan harga per pax dan jumlah positif sebelum menandakan pesanan sebagai Dibilkan.'
          : 'Please set unit prices and a positive total before marking as Billed.',
        variant: 'warning',
      });
      openOrderDetail(order);
      return;
    }

    setUpdatingId(orderId);
    try {
      const res = await fetch(getApiUrl(`/api/admin/orders/${encodeURIComponent(orderId)}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({
          title: isBm ? 'Status Dikemaskini' : 'Status Updated',
          description: isBm
            ? `Status pesanan telah bertukar ke ${getOrderStatus(newStatus, 'bm').label}`
            : `Order status changed to ${getOrderStatus(newStatus, 'en').label}`,
          variant: 'success',
        });
        await fetchOrders();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        title: isBm ? 'Ralat' : 'Error',
        description:
          err instanceof Error && err.message && err.message !== 'Failed to update status'
            ? err.message
            : isBm
              ? 'Gagal mengemaskini status'
              : 'Failed to update order status',
        variant: 'error',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Download all orders into one excel file (Standard tabular export)
  const handleDownloadAllExcel = async () => {
    const targetOrders = filteredAndSortedOrders;
    if (targetOrders.length === 0) {
      toast({
        title: isBm ? 'Tiada Rekod' : 'No Records',
        description: isBm ? 'Tiada pesanan untuk dieksport' : 'There are no orders to export',
        variant: 'warning',
      });
      return;
    }
    await exportOrdersAsExcelStandard(targetOrders, toast, isBm);
  };

  // Open Consolidated Invoice Modal (PDF only)
  const handleOpenConsolidateModal = () => {
    if (selectedIds.size === 0) {
      toast({
        title: isBm ? 'Tiada Rekod' : 'No Records',
        description: isBm
          ? 'Sila pilih sekurang-kurangnya satu pesanan'
          : 'Please select at least one order',
        variant: 'warning',
      });
      return;
    }

    const selectedOrders = orders.filter((order) => order.id && selectedIds.has(order.id));
    if (prepareConsolidateModal) void prepareConsolidateModal(selectedOrders);
  };
  const handleConfirmConsolidate = async (withNotes: boolean, billingAddress: string) => {
    const selectedOrders = orders.filter((order) => order.id && selectedIds.has(order.id));
    if (!selectedOrders.length || !handleGenerateConsolidatedInvoice) return;
    const savedNo = await handleGenerateConsolidatedInvoice(
      selectedOrders,
      withNotes,
      currentInvoiceNo,
      billingAddress
    );
    if (savedNo) {
      setLastSaved({ ...selectedOrders[0], invoiceBatchNo: savedNo });
      setSelectedIds(new Set());
      await fetchOrders();
    }
  };
  const selectSameCustomer = () => {
    const first = orders.find((order) => order.id && selectedIds.has(order.id));
    if (!first) return;
    const key = (order: Order) => {
      const r = invoiceRecipient(order);
      return [r.company, r.address, r.email].map(invoiceMatchText).join('\u0000');
    };
    setSelectedIds(
      new Set(
        filteredAndSortedOrders
          .filter((order) => order.id && key(order) === key(first))
          .map((order) => order.id!)
      )
    );
  };

  // Density classes
  const densityCellPadding = {
    compact: 'py-2 px-3 text-xs',
    normal: 'py-3.5 px-4 text-sm',
    spacious: 'py-5 px-5 text-sm',
  }[density];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="admin-order-tools">
        <div className="flex flex-wrap items-center gap-2">
            {/* Columns Customizer Popover */}
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="flex items-center gap-1.5 px-3 h-9 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl text-xs font-semibold text-deep-forest dark:text-white hover:bg-stone/10 transition-all"
              >
                <Columns className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)]" />
                <span>{isBm ? 'Lajur' : 'Columns'}</span>
                <ChevronDown className="w-3 h-3 text-deep-forest/50 dark:text-stone/50" />
              </button>

              {showColumnPicker && (
                <>
                  {/* Backdrop for closing popover when clicking outside */}
                  <div className="fixed inset-0 z-20" onClick={() => setShowColumnPicker(false)} />
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-60 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl shadow-2xl z-30 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-stone/10 dark:border-white/5 pb-2 px-1">
                      <span className="text-xs font-bold text-deep-forest dark:text-white">
                        {isBm ? 'Sesuaikan Lajur' : 'Customize Columns'}
                      </span>
                      <button
                        onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map((c) => c.key)))}
                        className="microcopy-12-upper text-[var(--color-sunshine-cta)] hover:underline font-semibold"
                      >
                        {isBm ? 'Pilih Semua' : 'Select All'}
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {ALL_COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-cream dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                        >
                          <span className="text-deep-forest/80 dark:text-stone/80 font-medium">
                            {isBm ? col.labelBm : col.labelEn}
                          </span>
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-stone/30 text-[var(--color-sunshine-cta)] focus:ring-[var(--color-sunshine-cta)] cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Density Selector */}
            <div className="hidden md:flex items-center bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl p-1">
              <button
                onClick={() => setDensity('compact')}
                title="Compact View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'compact'
                    ? 'bg-[var(--color-sunshine-cta)] text-charcoal shadow-xs'
                    : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                S
              </button>
              <button
                onClick={() => setDensity('normal')}
                title="Normal View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'normal'
                    ? 'bg-[var(--color-sunshine-cta)] text-charcoal shadow-xs'
                    : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                M
              </button>
              <button
                onClick={() => setDensity('spacious')}
                title="Spacious View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'spacious'
                    ? 'bg-[var(--color-sunshine-cta)] text-charcoal shadow-xs'
                    : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                L
              </button>
            </div>

            {/* Shrunk Excel Download Button: Exports all orders in one Excel file */}
            <button
              onClick={handleDownloadAllExcel}
              className="h-8 px-2.5 bg-cream/60 dark:bg-background/40 hover:bg-stone/10 border border-stone/15 dark:border-white/10 rounded-xl text-deep-forest dark:text-white transition-all text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title={
                isBm
                  ? 'Muat turun hasil tapisan dalam satu fail Excel'
                  : 'Download filtered orders in one Excel file'
              }
              aria-label={
                isBm ? 'Eksport hasil tapisan ke Excel' : 'Export filtered orders to Excel'
              }
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline text-xs font-semibold">Excel</span>
            </button>

        </div>
      </div>

      <div className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        {/* Selected Rows Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-charcoal text-white px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
              <span className="font-semibold">
                {selectedIds.size} {isBm ? 'rekod dipilih' : 'rows selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenConsolidateModal}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-sunshine-cta)] text-charcoal font-bold rounded-lg hover:bg-[var(--color-sunshine-cta)]/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>
                  {isBm ? 'Jana Invois Pelanggan (PDF)' : 'Generate Customer Invoices (PDF)'}
                </span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 font-medium rounded-lg transition-all"
              >
                {isBm ? 'Kosongkan pilihan' : 'Clear selection'}
              </button>
            </div>
          </div>
        )}

        {/* Compact, expandable records for smaller screens */}
        <div className="md:hidden">
          <div className="flex items-end gap-2 border-b border-stone/15 px-4 py-3 dark:border-white/10">
            <label className="min-w-0 flex-1 text-xs font-medium text-deep-forest/70 dark:text-stone/70">
              {isBm ? 'Susun mengikut' : 'Sort by'}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="mt-1 block min-h-11 w-full rounded-lg border border-stone/20 bg-white px-3 text-sm text-deep-forest dark:border-white/10 dark:bg-background dark:text-white"
              >
                <option value="createdAt">{isBm ? 'Tarikh hantar' : 'Submitted date'}</option>
                <option value="date">{isBm ? 'Tarikh acara' : 'Event date'}</option>
                <option value="to">{isBm ? 'Organisasi' : 'Organization'}</option>
                <option value="name">{isBm ? 'Nama' : 'Name'}</option>
                <option value="quantity">Pax</option>
                <option value="pricePerPax">{isBm ? 'Harga/Pax' : 'Price/Pax'}</option>
                <option value="totalAmount">{isBm ? 'Jumlah' : 'Total'}</option>
                <option value="invoiceNo">{isBm ? 'No. Invois / Ref' : 'Invoice / Ref'}</option>
                <option value="status">Status</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))}
              className="min-h-11 rounded-lg border border-stone/20 px-3 text-sm font-semibold text-deep-forest dark:border-white/10 dark:text-white"
              aria-label={isBm ? 'Tukar arah susunan' : 'Change sort direction'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          {paginatedOrders.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-deep-forest/60 dark:text-stone/60">
              {isBm
                ? 'Tiada permohonan dijumpai. Cuba ubah carian atau penapis.'
                : 'No submissions found. Try changing your search or filters.'}
            </p>
          ) : (
            <>
              <label className="flex items-center gap-3 border-b border-stone/15 px-4 py-3 text-sm font-medium text-deep-forest/70 dark:border-white/10 dark:text-stone/70">
                <input
                  type="checkbox"
                  checked={
                    paginatedOrders.some((o) => !!o.id) &&
                    paginatedOrders.filter((o) => !!o.id).every((o) => selectedIds.has(o.id!))
                  }
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-stone/30"
                />
                {isBm ? 'Pilih semua pada halaman ini' : 'Select all on this page'}
              </label>
              <div className="space-y-3 p-3">
                {paginatedOrders.map((order, index) => {
                  const isFinal = ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(
                    order.status || ''
                  );
                  return (
                    <article
                      key={order.id || index}
                      className="rounded-2xl border border-stone/15 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          disabled={!order.id}
                          checked={!!order.id && selectedIds.has(order.id)}
                          onChange={() => order.id && handleSelectRow(order.id)}
                          aria-label={isBm ? 'Pilih rekod' : 'Select record'}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-stone/30"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-bold text-deep-forest dark:text-white">
                            {order.to || order.name || (isBm ? 'Tanpa nama' : 'Unnamed')}
                          </h3>
                          {order.to && order.name && (
                            <p className="mt-0.5 break-words text-xs text-deep-forest/60 dark:text-stone/70">
                              {order.name}
                            </p>
                          )}
                          {visibleColumns.has('dateTime') && (
                            <p className="mt-2 text-sm text-deep-forest/70 dark:text-stone/80">
                              {formatAdminEvent(order, language) || '—'}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            {visibleColumns.has('status') && (
                              <OrderStatusBadge status={order.status} language={language} />
                            )}
                            {visibleColumns.has('quantity') && (
                              <span className="rounded-full bg-stone/10 px-2.5 py-1 font-semibold text-deep-forest dark:bg-white/10 dark:text-stone-100">
                                {order.quantity || 0} pax
                              </span>
                            )}
                            {visibleColumns.has('totalAmount') && (
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {typeof order.totalAmount === 'number'
                                  ? `RM ${order.totalAmount.toFixed(2)}`
                                  : isBm
                                    ? 'Jumlah belum ditetapkan'
                                    : 'Total pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <details className="group mt-4 border-t border-stone/10 pt-3 dark:border-white/10">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-deep-forest dark:text-stone-100">
                          {isBm ? 'Butiran dan tindakan' : 'Details and actions'}
                          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                          {visibleColumns.has('meals') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'Hidangan' : 'Meals'}
                              </dt>
                              <dd className="mt-1 break-words text-deep-forest dark:text-stone-100">
                                {(order.meals || []).join(', ') || '—'}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('menu') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                Menu
                              </dt>
                              <dd className="mt-1 whitespace-pre-wrap break-words text-deep-forest dark:text-stone-100">
                                {order.menu || '—'}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('preparationType') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'Sajian' : 'Serving style'}
                              </dt>
                              <dd className="mt-1 text-deep-forest dark:text-stone-100">
                                {order.preparationType === 'meal_box' ? 'Meal Box' : 'Buffet'}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('pricePerPax') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'Harga per pax' : 'Price per pax'}
                              </dt>
                              <dd className="mt-1 text-deep-forest dark:text-stone-100">
                                {order.prices
                                  ? Object.entries(order.prices)
                                      .map(([meal, price]) => `${meal}: RM ${price.toFixed(2)}`)
                                      .join(' · ')
                                  : '—'}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('invoiceNo') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'No. rujukan / invois' : 'Reference / invoice'}
                              </dt>
                              <dd className="mt-1 break-all text-deep-forest dark:text-stone-100">
                                {getDisplayInvoiceNo(order)}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('createdAt') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'Tarikh hantar' : 'Submitted'}
                              </dt>
                              <dd className="mt-1 text-deep-forest dark:text-stone-100">
                                {formatDateDisplay(order.createdAt)}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('contact') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'Telefon' : 'Phone'}
                              </dt>
                              <dd className="mt-1 break-words text-deep-forest dark:text-stone-100">
                                {order.contact || '—'}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('email') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                Email
                              </dt>
                              <dd className="mt-1 break-all text-deep-forest dark:text-stone-100">
                                {order.email || '—'}
                              </dd>
                            </div>
                          )}
                          {visibleColumns.has('location') && (
                            <div>
                              <dt className="text-xs text-deep-forest/60 dark:text-stone/60">
                                {isBm ? 'Lokasi' : 'Location'}
                              </dt>
                              <dd className="mt-1 break-words text-deep-forest dark:text-stone-100">
                                {order.location || '—'}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {visibleColumns.has('status') && order.id && (() => {
                          const currentKey = getOrderStatus(order.status, language).key;
                          const allowedNext = VALID_STATUS_TRANSITIONS[currentKey] || [];
                          const statusOptions = Array.from(
                            new Set([order.status || currentKey, ...allowedNext])
                          );
                          const isTerminal = allowedNext.length === 0;
                          return (
                            <label className="mt-4 block text-xs font-medium text-deep-forest/70 dark:text-stone/70">
                              {isBm ? 'Tukar status' : 'Change status'}
                              <select
                                disabled={updatingId === order.id || isTerminal}
                                value={order.status || currentKey}
                                onChange={(e) => handleQuickStatusChange(order, e.target.value)}
                                className="mt-1 block min-h-11 w-full rounded-lg border border-stone/20 bg-white px-3 text-sm text-deep-forest dark:border-white/10 dark:bg-background dark:text-white disabled:opacity-60"
                              >
                                {statusOptions.map((st) => (
                                  <option key={st} value={st}>
                                    {getOrderStatus(st, language).label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        })()}
                        {visibleColumns.has('actions') && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openOrderDetail(order)}
                              className="min-h-11 rounded-lg bg-[var(--color-sunshine-cta)] px-3 text-sm font-bold text-charcoal"
                            >
                              {isBm ? 'Lihat pesanan' : 'View order'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePreviewPDF(order, isFinal)}
                              className="min-h-11 rounded-lg border border-stone/20 px-3 text-sm dark:border-white/15 dark:text-white"
                            >
                              {isBm ? 'Pratonton PDF' : 'Preview PDF'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(order, isFinal)}
                              className="min-h-11 rounded-lg border border-stone/20 px-3 text-sm dark:border-white/15 dark:text-white"
                            >
                              {isBm ? 'Muat turun' : 'Download'}
                            </button>
                            {order.id && (
                              <button
                                type="button"
                                onClick={() => handleDelete(order.id!)}
                                className="min-h-11 rounded-lg border border-rose-500/30 px-3 text-sm text-rose-600 dark:text-rose-400"
                              >
                                {isBm ? 'Padam' : 'Delete'}
                              </button>
                            )}
                          </div>
                        )}
                      </details>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Interactive Data Table */}
        <div className="hidden md:block overflow-x-auto min-h-[400px] scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cream/70 dark:bg-white/5 border-b border-stone/15 dark:border-white/10 text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                <th className="py-3 px-4 w-10 min-w-[40px] text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    aria-label="Select all orders"
                    checked={
                      paginatedOrders.some((o) => !!o.id) &&
                      paginatedOrders.filter((o) => !!o.id).every((o) => selectedIds.has(o.id!))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-stone/30 text-[var(--color-sunshine-cta)] focus:ring-[var(--color-sunshine-cta)]"
                  />
                </th>

                {visibleColumns.has('dateTime') && (
                  <th
                    className="py-3 px-4 min-w-[165px] whitespace-nowrap cursor-pointer hover:bg-stone/10"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Tarikh Acara' : 'Event Date'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('meals') && (
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">
                    {isBm ? 'Hidangan' : 'Meal'}
                  </th>
                )}

                {visibleColumns.has('quantity') && (
                  <th
                    className="py-3 px-4 min-w-[100px] whitespace-nowrap cursor-pointer hover:bg-stone/10 text-right"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Pax</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('menu') && (
                  <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">
                    {isBm ? 'Menu' : 'Menu'}
                  </th>
                )}

                {visibleColumns.has('preparationType') && (
                  <th className="py-3 px-4 min-w-[110px] whitespace-nowrap">
                    {isBm ? 'Sajian' : 'Prep'}
                  </th>
                )}

                {visibleColumns.has('pricePerPax') && (
                  <th
                    className="py-3 px-4 min-w-[150px] whitespace-nowrap cursor-pointer hover:bg-stone/10 text-right"
                    onClick={() => handleSort('pricePerPax')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{isBm ? 'Harga/Pax' : 'Price/Pax'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('totalAmount') && (
                  <th
                    className="py-3 px-4 min-w-[110px] whitespace-nowrap cursor-pointer hover:bg-stone/10 text-right"
                    onClick={() => handleSort('totalAmount')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{isBm ? 'Jumlah' : 'Total'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('status') && (
                  <th
                    className="py-3 px-4 min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-stone/10"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('invoiceNo') && (
                  <th
                    className="py-3 px-4 min-w-[150px] whitespace-nowrap cursor-pointer hover:bg-stone/10"
                    onClick={() => handleSort('invoiceNo')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'No. Invois / Ref' : 'Invoice / Ref'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('createdAt') && (
                  <th
                    className="py-3 px-4 min-w-[140px] whitespace-nowrap cursor-pointer hover:bg-stone/10"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Tarikh Hantar' : 'Submitted'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('to') && (
                  <th
                    className="py-3 px-4 min-w-[200px] whitespace-nowrap cursor-pointer hover:bg-stone/10"
                    onClick={() => handleSort('to')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Organisasi / Klien' : 'Organization'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('name') && (
                  <th
                    className="py-3 px-4 min-w-[160px] whitespace-nowrap cursor-pointer hover:bg-stone/10"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Pemohon' : 'Contact Person'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('contact') && (
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">
                    {isBm ? 'Telefon' : 'Phone'}
                  </th>
                )}

                {visibleColumns.has('email') && (
                  <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">
                    {isBm ? 'Emel' : 'Email'}
                  </th>
                )}

                {visibleColumns.has('location') && (
                  <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">
                    {isBm ? 'Lokasi' : 'Location'}
                  </th>
                )}

                {visibleColumns.has('actions') && (
                  <th
                    className={`py-3 px-2 ${openActionRowId ? 'min-w-[320px]' : 'min-w-[60px]'} text-center sticky right-0 bg-cream dark:bg-background border-l border-stone/15 dark:border-white/10 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] z-20 whitespace-nowrap transition-colors duration-200`}
                  >
                    {openActionRowId ? (
                      isBm ? (
                        'Tindakan'
                      ) : (
                        'Actions'
                      )
                    ) : (
                      <MoreHorizontal className="w-4 h-4 mx-auto opacity-40" />
                    )}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone/10 dark:divide-white/5 font-sans">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={ALL_COLUMNS.length + 1}
                    className="py-16 text-center text-deep-forest/50 dark:text-stone/50"
                  >
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-cream dark:bg-background/40 flex items-center justify-center mx-auto text-deep-forest/30">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-sm">
                        {isBm ? 'Tiada permohonan dijumpai.' : 'No submission records found.'}
                      </p>
                      <p className="text-xs">
                        {isBm
                          ? 'Cuba tukar carian atau tapis status.'
                          : 'Try adjusting your search query or filter settings.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, index) => {
                  const isSelected = selectedIds.has(order.id!);
                  const isFinal = ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(
                    order.status || ''
                  );

                  return (
                    <tr
                      key={order.id || index}
                      className={`hover:bg-cream/40 dark:hover:bg-white/5 transition-colors group ${
                        isSelected
                          ? 'bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/5'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className={`${densityCellPadding} text-center`}>
                        <input
                          type="checkbox"
                          aria-label="Select order"
                          checked={isSelected}
                          disabled={!order.id}
                          onChange={() => handleSelectRow(order.id)}
                          className="rounded border-stone/30 text-[var(--color-sunshine-cta)] focus:ring-[var(--color-sunshine-cta)]"
                        />
                      </td>

                      {/* Event Date & Time */}
                      {visibleColumns.has('dateTime') && (
                        <td
                          className={`${densityCellPadding} text-deep-forest/80 dark:text-stone/80 whitespace-nowrap`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)] shrink-0" />
                            <span>
                              {formatAdminEvent(order, language) || '—'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Meals */}
                      {visibleColumns.has('meals') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <div className="flex flex-wrap gap-1">
                            {(order.meals || []).map((m) => (
                              <span
                                key={m}
                                className="px-1.5 py-0.5 bg-stone/10 dark:bg-white/10 rounded microcopy-12-upper font-medium uppercase tracking-wider text-deep-forest dark:text-white"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}

                      {/* Pax */}
                      {visibleColumns.has('quantity') && (
                        <td
                          className={`${densityCellPadding} text-right font-bold text-deep-forest dark:text-white whitespace-nowrap`}
                        >
                          {order.quantity || 0}
                        </td>
                      )}

                      {/* Menu Breakdown */}
                      {visibleColumns.has('menu') && (
                        <td
                          className={`${densityCellPadding} max-w-[200px] truncate text-xs text-deep-forest/70 dark:text-stone/70`}
                          title={order.menu}
                        >
                          {order.menu || '-'}
                        </td>
                      )}

                      {/* Prep Type */}
                      {visibleColumns.has('preparationType') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <span
                            className={`px-2 py-0.5 rounded-full microcopy-12 font-semibold ${
                              order.preparationType === 'meal_box'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                            }`}
                          >
                            {order.preparationType === 'meal_box' ? 'Meal Box' : 'Buffet'}
                          </span>
                        </td>
                      )}

                      {/* Price per Pax */}
                      {visibleColumns.has('pricePerPax') && (
                        <td
                          className={`${densityCellPadding} text-right font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}
                        >
                          {order.prices ? (
                            <div className="flex flex-col items-end">
                              {Object.entries(order.prices).map(([meal, price]) => (
                                <span key={meal} className="text-xs leading-tight">
                                  {meal.charAt(0).toUpperCase() + meal.slice(1)}: RM{' '}
                                  {price.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-deep-forest/40 dark:text-stone/40 font-normal italic text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                      )}

                      {/* Total Amount */}
                      {visibleColumns.has('totalAmount') && (
                        <td
                          className={`${densityCellPadding} text-right font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}
                        >
                          {order.totalAmount ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              RM {order.totalAmount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-deep-forest/40 dark:text-stone/40 font-normal italic text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                      )}

                      {/* Interactive Status Selector */}
                      {visibleColumns.has('status') && (() => {
                        const currentKey = getOrderStatus(order.status, language).key;
                        const allowedNext = VALID_STATUS_TRANSITIONS[currentKey] || [];
                        const statusOptions = Array.from(
                          new Set([order.status || currentKey, ...allowedNext])
                        );
                        const isTerminal = allowedNext.length === 0;
                        return (
                          <td className={`${densityCellPadding} whitespace-nowrap`}>
                            <div className="relative inline-block">
                              <select
                                disabled={updatingId === order.id || isTerminal}
                                value={order.status || currentKey}
                                onChange={(e) => handleQuickStatusChange(order, e.target.value)}
                                aria-label={isBm ? 'Tukar status tempahan' : 'Change order status'}
                                className={`min-h-11 text-xs font-semibold rounded-lg px-2 py-1 border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-60 disabled:cursor-default ${getOrderStatus(order.status, language).className}`}
                              >
                                {statusOptions.map((st) => (
                                  <option key={st} value={st}>
                                    {getOrderStatus(st, language).label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        );
                      })()}

                      {/* Invoice / Ref */}
                      {visibleColumns.has('invoiceNo') && (
                        <td
                          className={`${densityCellPadding} font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}
                        >
                          <button
                            onClick={() => openOrderDetail(order)}
                            className="hover:text-[var(--color-sunshine-cta)] text-left underline-offset-2 hover:underline transition-colors"
                          >
                            {getDisplayInvoiceNo(order)}
                          </button>
                        </td>
                      )}

                      {/* Submitted Date */}
                      {visibleColumns.has('createdAt') && (
                        <td
                          className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 whitespace-nowrap`}
                        >
                          {formatDateDisplay(order.createdAt)}
                        </td>
                      )}

                      {/* Client / Organization */}
                      {visibleColumns.has('to') && (
                        <td
                          className={`${densityCellPadding} font-medium text-deep-forest dark:text-white max-w-[180px] truncate`}
                        >
                          <button type="button" className="flex w-full items-center gap-1.5 text-start hover:underline"
                            title={order.to || order.name} onClick={() => openOrderDetail(order)}>
                            <Building2 className="w-3.5 h-3.5 text-deep-forest/40 dark:text-stone/40 shrink-0" aria-hidden="true" />
                            <span className="truncate">{order.to || order.name || '—'}</span>
                          </button>
                        </td>
                      )}

                      {/* Contact Person */}
                      {visibleColumns.has('name') && (
                        <td
                          className={`${densityCellPadding} font-medium text-deep-forest dark:text-white whitespace-nowrap`}
                        >
                          {order.name || '-'}
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.has('contact') && (
                        <td
                          className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 whitespace-nowrap font-mono text-xs`}
                        >
                          {order.contact || '-'}
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.has('email') && (
                        <td
                          className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 max-w-[160px] truncate font-mono text-xs`}
                        >
                          {order.email ? (
                            <a
                              href={`mailto:${order.email}`}
                              className="hover:text-[var(--color-sunshine-cta)] hover:underline"
                            >
                              {order.email}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {/* Location */}
                      {visibleColumns.has('location') && (
                        <td
                          className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 max-w-[180px] truncate`}
                          title={order.location}
                        >
                          {order.location || '-'}
                        </td>
                      )}

                      {/* Actions Sticky Column - Collapsible */}
                      {visibleColumns.has('actions') && (
                        <td
                          className={`${densityCellPadding} text-center sticky right-0 bg-white dark:bg-card group-hover:bg-cream dark:group-hover:bg-stone/25 border-l border-stone/15 dark:border-white/10 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] z-10 whitespace-nowrap transition-colors duration-200`}
                        >
                          <div className="flex items-center justify-center">
                            <AnimatePresence initial={false}>
                              {openActionRowId === order.id && (
                                <motion.div
                                  initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : 4 }}
                                  transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
                                  className="flex items-center gap-1 overflow-hidden"
                                >
                                  <button
                                    onClick={() => openOrderDetail(order)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-[var(--color-sunshine-cta)] transition-colors min-w-[44px]"
                                    title="View Full Submission Details"
                                    aria-label={isBm ? 'Lihat' : 'View'}
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">
                                      {isBm ? 'Lihat' : 'View'}
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => handlePreviewPDF(order, isFinal)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-blue-500 transition-colors min-w-[44px]"
                                    title="Preview Official PDF Invoice"
                                    aria-label={isBm ? 'Pratonton' : 'Preview'}
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">
                                      {isBm ? 'Pratonton' : 'Preview'}
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => handleDownloadPDF(order, isFinal)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-emerald-500 transition-colors min-w-[44px]"
                                    title="Download PDF"
                                    aria-label={isBm ? 'Muat Turun' : 'Download'}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">
                                      {isBm ? 'Muat Turun' : 'Download'}
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => handleDelete(order.id!)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 transition-colors min-w-[44px]"
                                    title="Delete Submission"
                                    aria-label={isBm ? 'Padam' : 'Delete'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">
                                      {isBm ? 'Padam' : 'Delete'}
                                    </span>
                                  </button>
                                  <div className="w-[1px] h-4 bg-stone/20 mx-1" />
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <button
                              onClick={() =>
                                setOpenActionRowId(
                                  openActionRowId === order.id ? null : order.id || null
                                )
                              }
                              className={`p-2 rounded-full transition-all duration-300 ${
                                openActionRowId === order.id
                                  ? 'bg-stone/10 text-deep-forest dark:text-white'
                                  : 'text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10'
                              }`}
                              title={
                                openActionRowId === order.id
                                  ? isBm
                                    ? 'Tutup'
                                    : 'Close'
                                  : isBm
                                    ? 'Buka Tindakan'
                                    : 'Open Actions'
                              }
                            >
                              {openActionRowId === order.id ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronLeft className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Jotform Grid Footer Pagination */}
        <div className="bg-cream/60 dark:bg-background/40 border-t border-stone/15 dark:border-white/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-4">
            <span className="text-deep-forest/60 dark:text-stone/60 font-medium">
              {isBm
                ? `Menunjukkan ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredAndSortedOrders.length)} daripada ${filteredAndSortedOrders.length} rekod`
                : `Showing ${(currentPage - 1) * pageSize + (filteredAndSortedOrders.length > 0 ? 1 : 0)}–${Math.min(currentPage * pageSize, filteredAndSortedOrders.length)} of ${filteredAndSortedOrders.length} submissions`}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-deep-forest/50 dark:text-stone/50">
                {isBm ? 'Baris:' : 'Rows:'}
              </span>
              <select
                aria-label={isBm ? 'Baris setiap halaman' : 'Rows per page'}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-lg px-2 py-1 font-semibold text-deep-forest dark:text-white focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isBm ? 'Halaman sebelumnya' : 'Previous page'}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone/15 dark:border-white/10 bg-white dark:bg-card text-deep-forest dark:text-white disabled:opacity-40 hover:bg-stone/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-deep-forest dark:text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              aria-label={isBm ? 'Halaman seterusnya' : 'Next page'}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone/15 dark:border-white/10 bg-white dark:bg-card text-deep-forest dark:text-white disabled:opacity-40 hover:bg-stone/10 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="outline" onClick={selectSameCustomer}>
            {isBm ? 'Pilih pelanggan sama dalam senarai' : 'Select matching customer in this list'}
          </Button>
          {selectedIds.size === 1 && onReadOrder && (
            <Button
              variant="outline"
              onClick={() => {
                const order = orders.find((o) => o.id && selectedIds.has(o.id));
                if (order) onReadOrder(order);
              }}
            >
              {isBm ? 'Kad Bacaan Besar' : 'Large Reading Card'}
            </Button>
          )}
        </div>
      )}
      {lastSaved && onSendInvoice && (
        <Button className="my-3" onClick={() => onSendInvoice(lastSaved)}>
          {isBm ? 'Semak & emel PDF tersimpan' : 'Review & email saved PDF'}
        </Button>
      )}
      {isModalOpen && (
        <InvoiceBatchDialog
          orders={orders.filter((order) => order.id && selectedIds.has(order.id))}
          invoiceNo={currentInvoiceNo}
          language={language}
          busy={isGenerating}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmConsolidate}
        />
      )}
    </div>
  );
}

export default AdminTablesTab;
