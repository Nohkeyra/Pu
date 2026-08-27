import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Trash2, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Columns, 
  Filter, 
  Check, 
  Building2,
  Calendar,
  Layers,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Order } from '../../types';
import type { ToastMessage } from '../ui/Toast';
import { exportOrdersAsExcelTemplate } from '@/lib/exportUtils';
import { getDisplayInvoiceNo } from '@/lib/utils';

interface AdminTablesTabProps {
  orders: Order[];
  language: 'en' | 'bm';
  openOrderDetail: (order: Order) => void;
  handlePreviewPDF: (order: Order, isFinal: boolean) => Promise<void> | void;
  handleDownloadPDF: (order: Order, isFinal: boolean) => void;
  handleDelete: (id: string) => void;
  fetchOrders: () => Promise<void>;
  authHeaders: () => HeadersInit;
  getApiUrl: (endpoint: string) => string;
  toast: (options: Omit<ToastMessage, 'id'>) => void;
}

type SortField = 'date' | 'to' | 'name' | 'quantity' | 'totalAmount' | 'status' | 'createdAt' | 'pricePerPax';
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
  { key: 'meals', labelEn: 'Meal', labelBm: 'Hidangan', defaultVisible: true },
  { key: 'quantity', labelEn: 'Pax', labelBm: 'Pax', defaultVisible: true },
  { key: 'menu', labelEn: 'Menu', labelBm: 'Menu', defaultVisible: true },
  { key: 'preparationType', labelEn: 'Prep', labelBm: 'Sajian', defaultVisible: true },
  { key: 'pricePerPax', labelEn: 'Price per Pax', labelBm: 'Harga per Pax', defaultVisible: true },
  { key: 'totalAmount', labelEn: 'Total', labelBm: 'Jumlah', defaultVisible: true },
  { key: 'status', labelEn: 'Status', labelBm: 'Status', defaultVisible: true },
  { key: 'invoiceNo', labelEn: 'Ref / Invoice No', labelBm: 'No. Rujukan / Invois', defaultVisible: false },
  { key: 'createdAt', labelEn: 'Submitted Date', labelBm: 'Tarikh Hantar', defaultVisible: false },
  { key: 'to', labelEn: 'Client / Organization', labelBm: 'Klien / Organisasi', defaultVisible: false },
  { key: 'name', labelEn: 'Contact Person', labelBm: 'Pegawai Bertanggungjawab', defaultVisible: false },
  { key: 'contact', labelEn: 'Phone Number', labelBm: 'No. Telefon', defaultVisible: false },
  { key: 'email', labelEn: 'Email Address', labelBm: 'Alamat Emel', defaultVisible: false },
  { key: 'location', labelEn: 'Event Location', labelBm: 'Lokasi Acara', defaultVisible: false },
  { key: 'actions', labelEn: 'Actions', labelBm: 'Tindakan', defaultVisible: true },
];

export function AdminTablesTab({
  orders,
  language,
  openOrderDetail,
  handlePreviewPDF,
  handleDownloadPDF,
  handleDelete,
  fetchOrders,
  authHeaders,
  getApiUrl,
  toast,
}: AdminTablesTabProps) {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Table customization
  const [density, setDensity] = useState<TableDensity>('compact');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline status update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);

  const isBm = language === 'bm';

  // Extract distinct client options
  const clientOptions = useMemo(() => {
    const clients = new Set<string>();
    orders.forEach(o => {
      if (o.to) clients.add(o.to);
    });
    return Array.from(clients).sort();
  }, [orders]);

  // Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let billedCount = 0;

    orders.forEach(o => {
      const s = (o.status || 'pending').toLowerCase();
      if (s === 'pending' || s === 'cancel_requested') pendingCount++;
      if (s === 'approved') approvedCount++;
      if (s === 'billed') billedCount++;

      if (o.totalAmount && (s === 'approved' || s === 'billed')) {
        totalRevenue += o.totalAmount;
      }
    });

    return {
      total: orders.length,
      revenue: totalRevenue,
      pending: pendingCount,
      approved: approvedCount,
      billed: billedCount,
    };
  }, [orders]);

  // Filtering & Sorting logic
  const filteredAndSortedOrders = useMemo(() => {
    return orders
      .filter(order => {
        // Status filter
        if (statusFilter !== 'all') {
          const s = (order.status || 'pending').toLowerCase();
          if (statusFilter === 'pending' && s !== 'pending') return false;
          if (statusFilter === 'approved' && s !== 'approved') return false;
          if (statusFilter === 'billed' && s !== 'billed') return false;
          if (statusFilter === 'cancelled' && s !== 'cancelled' && s !== 'dibatalkan') return false;
          if (statusFilter === 'cancel_requested' && s !== 'cancel_requested') return false;
        }

        // Client filter
        if (clientFilter !== 'all') {
          if (order.to !== clientFilter) return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchTo = (order.to || '').toLowerCase().includes(term);
          const matchName = (order.name || '').toLowerCase().includes(term);
          const matchEmail = (order.email || '').toLowerCase().includes(term);
          const matchPhone = (order.contact || '').toLowerCase().includes(term);
          const matchInvoice = (order.invoiceNo || order.id || '').toLowerCase().includes(term);
          const matchLocation = (order.location || '').toLowerCase().includes(term);
          const matchMenu = (order.menu || '').toLowerCase().includes(term);

          if (!matchTo && !matchName && !matchEmail && !matchPhone && !matchInvoice && !matchLocation && !matchMenu) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortField === 'createdAt' || sortField === 'date') {
          const getMs = (dateVal: any) => {
            if (!dateVal) return 0;
            if (typeof dateVal === 'string') {
              const d = new Date(dateVal);
              return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            if (dateVal instanceof Date) return dateVal.getTime();
            if (typeof dateVal === 'object') {
              if ('seconds' in dateVal && typeof dateVal.seconds === 'number') {
                return dateVal.seconds * 1000;
              }
              if ('_seconds' in dateVal && typeof dateVal._seconds === 'number') {
                return dateVal._seconds * 1000;
              }
            }
            return 0;
          };
          const timeA = getMs(a.createdAt);
          const timeB = getMs(b.createdAt);
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }

        if (sortField === 'to') {
          valA = (a.to || '').toLowerCase();
          valB = (b.to || '').toLowerCase();
        } else if (sortField === 'name') {
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
        } else if (sortField === 'quantity') {
          valA = a.quantity || 0;
          valB = b.quantity || 0;
        } else if (sortField === 'totalAmount') {
          valA = a.totalAmount || 0;
          valB = b.totalAmount || 0;
        } else if (sortField === 'status') {
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [orders, statusFilter, clientFilter, searchTerm, sortField, sortOrder]);

  // Paginated Data
  const totalPages = Math.ceil(filteredAndSortedOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedOrders.slice(start, start + pageSize);
  }, [filteredAndSortedOrders, currentPage, pageSize]);

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
    if (e.target.checked) {
      const allIds = new Set(paginatedOrders.map(o => o.id!).filter(Boolean));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Inline Status Change
  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(getApiUrl(`/api/admin/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({
          title: isBm ? 'Status Diikemaskini' : 'Status Updated',
          description: isBm ? `Order status changed to ${newStatus}` : `Status order telah bertukar ke ${newStatus}`,
          variant: 'success',
        });
        await fetchOrders();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        title: isBm ? 'Ralat' : 'Error',
        description: isBm ? 'Gagal mengemaskini status' : 'Failed to update order status',
        variant: 'error',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Export Filtered/Selected Table to Excel using the provided RW_Invoice_v3_Blank.xlsx template
  const handleExportExcel = async () => {
    const targetOrders = selectedIds.size > 0
      ? filteredAndSortedOrders.filter(o => o.id && selectedIds.has(o.id))
      : filteredAndSortedOrders;
    await exportOrdersAsExcelTemplate(targetOrders, toast, isBm);
  };

  // Density classes
  const densityCellPadding = {
    compact: 'py-2 px-3 text-xs',
    normal: 'py-3.5 px-4 text-sm',
    spacious: 'py-5 px-5 text-sm',
  }[density];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Table Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-card border border-stone/15 dark:border-white/5 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-deep-forest/60 dark:text-stone/60 uppercase tracking-wider truncate">
              {isBm ? 'Jumlah Permohonan' : 'Total Submissions'}
            </span>
            <div className="w-6 h-6 rounded-md bg-[var(--color-sunshine-cta)]/10 text-[var(--color-sunshine-cta)] flex items-center justify-center font-bold text-xs shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-display font-bold text-deep-forest dark:text-white leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] text-deep-forest/40 dark:text-stone/40">{isBm ? 'rekod' : 'records'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-amber-500/20 dark:border-amber-500/10 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
              {isBm ? 'Menunggu Disahkan' : 'Pending Review'}
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-[10px] shrink-0">
              {stats.pending}
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-display font-bold text-amber-600 dark:text-amber-400 leading-none">
              {stats.pending}
            </span>
            <span className="text-[10px] text-amber-600/60 dark:text-amber-400/60">{isBm ? 'tindakan' : 'pending'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-emerald-500/20 dark:border-emerald-500/10 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
              {isBm ? 'Invois / Diluluskan' : 'Approved & Billed'}
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
              {stats.approved + stats.billed}
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400 leading-none">
              {stats.approved + stats.billed}
            </span>
            <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60">{isBm ? 'selesai' : 'done'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-[var(--color-sunshine-cta)]/30 dark:border-[var(--color-sunshine-cta)]/20 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-deep-forest/60 dark:text-stone/60 uppercase tracking-wider truncate">
              {isBm ? 'Hasil Terkumpul' : 'Total Revenue'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-sunshine-cta)]/20 text-deep-forest dark:text-[var(--color-sunshine-cta)] shrink-0">
              RM
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-0.5">
            <span className="text-[10px] font-bold text-[var(--color-sunshine-cta)]">RM</span>
            <span className="text-xl font-display font-bold text-deep-forest dark:text-white leading-none">
              {stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Jotform-Style Toolbar */}
      <div className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deep-forest/40 dark:text-stone/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={isBm ? "Cari rujukan, nama, emel, klien, lokasi..." : "Search ref, name, email, client, location..."}
              className="w-full pl-9 pr-8 h-9 bg-cream/50 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-sunshine-cta)]/40 text-deep-forest dark:text-white transition-all"
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

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3 h-9">
              <Filter className="w-3.5 h-3.5 text-deep-forest/50 dark:text-stone/50 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">{isBm ? 'Semua Status' : 'All Statuses'}</option>
                <option value="pending">{isBm ? 'Menunggu (Pending)' : 'Pending'}</option>
                <option value="approved">{isBm ? 'Diluluskan (Approved)' : 'Approved'}</option>
                <option value="billed">{isBm ? 'Dibilkan (Billed)' : 'Billed'}</option>
                <option value="cancel_requested">{isBm ? 'Permohonan Batal' : 'Cancel Requested'}</option>
                <option value="cancelled">{isBm ? 'Dibatalkan' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Client Filter */}
            {clientOptions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl px-3 h-9">
                <Building2 className="w-3.5 h-3.5 text-deep-forest/50 dark:text-stone/50 shrink-0" />
                <select
                  value={clientFilter}
                  onChange={(e) => { setClientFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-semibold text-deep-forest dark:text-white focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">{isBm ? 'Semua Klien' : 'All Clients'}</option>
                  {clientOptions.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>
            )}

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
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowColumnPicker(false)} 
                  />
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-60 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl shadow-2xl z-30 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-stone/10 dark:border-white/5 pb-2 px-1">
                      <span className="text-xs font-bold text-deep-forest dark:text-white">
                        {isBm ? 'Sesuaikan Lajur' : 'Customize Columns'}
                      </span>
                      <button
                        onClick={() => setVisibleColumns(new Set(ALL_COLUMNS.map(c => c.key)))}
                        className="microcopy-12-upper text-[var(--color-sunshine-cta)] hover:underline font-semibold"
                      >
                        {isBm ? 'Pilih Semua' : 'Select All'}
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {ALL_COLUMNS.map(col => (
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
            <div className="flex items-center bg-cream/60 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl p-1">
              <button
                onClick={() => setDensity('compact')}
                title="Compact View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'compact' ? 'bg-[var(--color-sunshine-cta)] text-charcoal shadow-xs' : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                S
              </button>
              <button
                onClick={() => setDensity('normal')}
                title="Normal View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'normal' ? 'bg-[var(--color-sunshine-cta)] text-charcoal shadow-xs' : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                M
              </button>
              <button
                onClick={() => setDensity('spacious')}
                title="Spacious View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'spacious' ? 'bg-[var(--color-sunshine-cta)] text-charcoal shadow-xs' : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                L
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-sunshine-cta)]/15 hover:bg-[var(--color-sunshine-cta)]/25 text-deep-forest dark:text-[var(--color-sunshine-cta)] font-semibold rounded-xl text-xs transition-all border border-[var(--color-sunshine-cta)]/30"
              title="Export visible table rows to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchOrders()}
              className="p-2 bg-cream/60 dark:bg-background/40 hover:bg-stone/10 border border-stone/15 dark:border-white/10 rounded-xl text-deep-forest dark:text-white transition-all"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Jotform Grid Container */}
      <div className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        {/* Active Filters Bar if active */}
        {(searchTerm || statusFilter !== 'all' || clientFilter !== 'all') && (
          <div className="bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/5 border-b border-[var(--color-sunshine-cta)]/20 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-deep-forest dark:text-[var(--color-sunshine-cta)]">{isBm ? 'Tapis Active:' : 'Active Filters:'}</span>
              {searchTerm && (
                <span className="px-2 py-0.5 bg-white dark:bg-background/80 rounded-md border border-stone/15 font-medium">
                  "{searchTerm}"
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-white dark:bg-background/80 rounded-md border border-stone/15 font-medium capitalize">
                  Status: {statusFilter}
                </span>
              )}
              {clientFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-white dark:bg-background/80 rounded-md border border-stone/15 font-medium">
                  Client: {clientFilter}
                </span>
              )}
            </div>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setClientFilter('all'); }}
              className="text-xs font-bold text-deep-forest hover:underline dark:text-[var(--color-sunshine-cta)]"
            >
              {isBm ? 'Set Semula Tapis' : 'Reset All Filters'}
            </button>
          </div>
        )}

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
                onClick={handleExportExcel}
                className="px-3 py-1 bg-[var(--color-sunshine-cta)] text-charcoal font-bold rounded-lg hover:bg-[var(--color-sunshine-cta)]/90 transition-all"
              >
                Export Selected Excel
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 font-medium rounded-lg transition-all"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Interactive Data Table */}
        <div className="overflow-x-auto min-h-[400px] scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cream/70 dark:bg-white/5 border-b border-stone/15 dark:border-white/10 text-deep-forest/80 dark:text-stone/70 font-bold text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                <th className="py-3 px-4 w-10 min-w-[40px] text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={paginatedOrders.length > 0 && selectedIds.size === paginatedOrders.length}
                    onChange={handleSelectAll}
                    className="rounded border-stone/30 text-[var(--color-sunshine-cta)] focus:ring-[var(--color-sunshine-cta)]"
                  />
                </th>

                {visibleColumns.has('dateTime') && (
                  <th className="py-3 px-4 min-w-[165px] whitespace-nowrap">{isBm ? 'Tarikh Acara' : 'Event Date'}</th>
                )}

                {visibleColumns.has('meals') && (
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">{isBm ? 'Hidangan' : 'Meal'}</th>
                )}

                {visibleColumns.has('quantity') && (
                  <th className="py-3 px-4 min-w-[100px] whitespace-nowrap cursor-pointer hover:bg-stone/10 text-right" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Pax</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('menu') && (
                  <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">{isBm ? 'Menu' : 'Menu'}</th>
                )}

                {visibleColumns.has('preparationType') && (
                  <th className="py-3 px-4 min-w-[110px] whitespace-nowrap">{isBm ? 'Sajian' : 'Prep'}</th>
                )}

                {visibleColumns.has('pricePerPax') && (
                  <th className="py-3 px-4 min-w-[150px] whitespace-nowrap text-right">{isBm ? 'Harga/Pax' : 'Price/Pax'}</th>
                )}

                {visibleColumns.has('totalAmount') && (
                  <th className="py-3 px-4 min-w-[110px] whitespace-nowrap cursor-pointer hover:bg-stone/10 text-right" onClick={() => handleSort('totalAmount')}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{isBm ? 'Jumlah' : 'Total'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('status') && (
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-stone/10" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('invoiceNo') && (
                  <th className="py-3 px-4 min-w-[150px] whitespace-nowrap cursor-pointer hover:bg-stone/10" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'No. Invois / Ref' : 'Invoice / Ref'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('createdAt') && (
                  <th className="py-3 px-4 min-w-[140px] whitespace-nowrap cursor-pointer hover:bg-stone/10" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Tarikh Hantar' : 'Submitted'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('to') && (
                  <th className="py-3 px-4 min-w-[200px] whitespace-nowrap cursor-pointer hover:bg-stone/10" onClick={() => handleSort('to')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Organisasi / Klien' : 'Organization'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('name') && (
                  <th className="py-3 px-4 min-w-[160px] whitespace-nowrap cursor-pointer hover:bg-stone/10" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Pemohon' : 'Contact Person'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('contact') && (
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">{isBm ? 'Telefon' : 'Phone'}</th>
                )}

                {visibleColumns.has('email') && (
                  <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">{isBm ? 'Emel' : 'Email'}</th>
                )}

                {visibleColumns.has('location') && (
                  <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">{isBm ? 'Lokasi' : 'Location'}</th>
                )}

                {visibleColumns.has('actions') && (
                  <th className={`py-3 px-2 ${openActionRowId ? 'min-w-[320px]' : 'min-w-[60px]'} text-center sticky right-0 bg-cream dark:bg-background border-l border-stone/15 dark:border-white/10 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] z-20 whitespace-nowrap transition-all duration-300`}>
                    {openActionRowId ? (isBm ? 'Tindakan' : 'Actions') : <MoreHorizontal className="w-4 h-4 mx-auto opacity-40" />}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone/10 dark:divide-white/5 font-sans">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={ALL_COLUMNS.length + 1} className="py-16 text-center text-deep-forest/50 dark:text-stone/50">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-cream dark:bg-background/40 flex items-center justify-center mx-auto text-deep-forest/30">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-sm">
                        {isBm ? 'Tiada permohonan dijumpai.' : 'No submission records found.'}
                      </p>
                      <p className="text-xs">
                        {isBm ? 'Cuba tukar carian atau tapis status.' : 'Try adjusting your search query or filter settings.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, index) => {
                  const isSelected = selectedIds.has(order.id!);
                  const isFinal = ['approved', 'diluluskan', 'billed', 'dibilkan'].includes(order.status || '');

                  return (
                    <tr
                      key={order.id || index}
                      className={`hover:bg-cream/40 dark:hover:bg-white/5 transition-colors group ${
                        isSelected ? 'bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className={`${densityCellPadding} text-center`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(order.id!)}
                          className="rounded border-stone/30 text-[var(--color-sunshine-cta)] focus:ring-[var(--color-sunshine-cta)]"
                        />
                      </td>

                      {/* Event Date & Time */}
                      {visibleColumns.has('dateTime') && (
                        <td className={`${densityCellPadding} text-deep-forest/80 dark:text-stone/80 whitespace-nowrap`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)] shrink-0" />
                            <span>{order.dateTime || '-'}</span>
                          </div>
                        </td>
                      )}

                      {/* Meals */}
                      {visibleColumns.has('meals') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <div className="flex flex-wrap gap-1">
                            {(order.meals || []).map(m => (
                              <span key={m} className="px-1.5 py-0.5 bg-stone/10 dark:bg-white/10 rounded microcopy-12-upper font-medium uppercase tracking-wider text-deep-forest dark:text-white">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}

                      {/* Pax */}
                      {visibleColumns.has('quantity') && (
                        <td className={`${densityCellPadding} text-right font-bold text-deep-forest dark:text-white whitespace-nowrap`}>
                          {order.quantity || 0}
                        </td>
                      )}

                      {/* Menu Breakdown */}
                      {visibleColumns.has('menu') && (
                        <td className={`${densityCellPadding} max-w-[200px] truncate text-xs text-deep-forest/70 dark:text-stone/70`} title={order.menu}>
                          {order.menu || '-'}
                        </td>
                      )}

                      {/* Prep Type */}
                      {visibleColumns.has('preparationType') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <span className={`px-2 py-0.5 rounded-full microcopy-12 font-semibold ${
                            order.preparationType === 'meal_box'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {order.preparationType === 'meal_box' ? 'Meal Box' : 'Buffet'}
                          </span>
                        </td>
                      )}

                      {/* Price per Pax */}
                      {visibleColumns.has('pricePerPax') && (
                        <td className={`${densityCellPadding} text-right font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}>
                          {order.prices ? (
                            <div className="flex flex-col items-end">
                              {Object.entries(order.prices).map(([meal, price]) => (
                                <span key={meal} className="text-[10px] leading-tight">
                                  {meal.charAt(0).toUpperCase() + meal.slice(1)}: RM {price.toFixed(2)}
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
                        <td className={`${densityCellPadding} text-right font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}>
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
                      {visibleColumns.has('status') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <div className="relative inline-block">
                            <select
                              disabled={updatingId === order.id}
                              value={order.status || 'pending'}
                              onChange={(e) => handleQuickStatusChange(order.id!, e.target.value)}
                              className={`text-xs font-semibold rounded-lg px-2 py-1 border border-stone/20 dark:border-white/10 focus:outline-none cursor-pointer ${
                                (order.status || 'pending') === 'approved'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                                  : (order.status || 'pending') === 'billed'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : (order.status || 'pending') === 'cancelled'
                                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="billed">Billed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      )}

                      {/* Invoice / Ref */}
                      {visibleColumns.has('invoiceNo') && (
                        <td className={`${densityCellPadding} font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}>
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
                        <td className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 whitespace-nowrap`}>
                          {(() => {
                            if (!order.createdAt) return '-';
                            let dateVal: Date;
                            if (typeof order.createdAt === 'string') {
                              dateVal = new Date(order.createdAt);
                            } else if (order.createdAt instanceof Date) {
                              dateVal = order.createdAt;
                            } else if (typeof order.createdAt === 'object') {
                              if ('seconds' in order.createdAt && typeof order.createdAt.seconds === 'number') {
                                dateVal = new Date(order.createdAt.seconds * 1000);
                              } else if ('_seconds' in order.createdAt && typeof (order.createdAt as any)._seconds === 'number') {
                                dateVal = new Date((order.createdAt as any)._seconds * 1000);
                              } else {
                                dateVal = new Date(order.createdAt as any);
                              }
                            } else {
                              dateVal = new Date(order.createdAt);
                            }
                            return isNaN(dateVal.getTime()) ? '-' : dateVal.toLocaleDateString('en-GB');
                          })()}
                        </td>
                      )}

                      {/* Client / Organization */}
                      {visibleColumns.has('to') && (
                        <td className={`${densityCellPadding} font-medium text-deep-forest dark:text-white max-w-[180px] truncate`}>
                          <div className="flex items-center gap-1.5" title={order.to}>
                            <Building2 className="w-3.5 h-3.5 text-deep-forest/40 dark:text-stone/40 shrink-0" />
                            <span className="truncate">{order.to || '-'}</span>
                          </div>
                        </td>
                      )}

                      {/* Contact Person */}
                      {visibleColumns.has('name') && (
                        <td className={`${densityCellPadding} font-medium text-deep-forest dark:text-white whitespace-nowrap`}>
                          {order.name || '-'}
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.has('contact') && (
                        <td className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 whitespace-nowrap font-mono text-xs`}>
                          {order.contact || '-'}
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.has('email') && (
                        <td className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 max-w-[160px] truncate font-mono text-xs`}>
                          {order.email ? (
                            <a href={`mailto:${order.email}`} className="hover:text-[var(--color-sunshine-cta)] hover:underline">
                              {order.email}
                            </a>
                          ) : '-'}
                        </td>
                      )}

                      {/* Location */}
                      {visibleColumns.has('location') && (
                        <td className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 max-w-[180px] truncate`} title={order.location}>
                          {order.location || '-'}
                        </td>
                      )}

                      {/* Actions Sticky Column - Collapsible */}
                      {visibleColumns.has('actions') && (
                        <td className={`${densityCellPadding} text-center sticky right-0 bg-white dark:bg-card group-hover:bg-cream dark:group-hover:bg-stone/25 border-l border-stone/15 dark:border-white/10 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] z-10 whitespace-nowrap transition-all duration-300`}>
                          <div className="flex items-center justify-center">
                            <AnimatePresence initial={false}>
                              {openActionRowId === order.id && (
                                <motion.div
                                  initial={{ width: 0, opacity: 0, x: 20 }}
                                  animate={{ width: 'auto', opacity: 1, x: 0 }}
                                  exit={{ width: 0, opacity: 0, x: 20 }}
                                  className="flex items-center gap-1 overflow-hidden"
                                >
                                  <button
                                    onClick={() => openOrderDetail(order)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-[var(--color-sunshine-cta)] transition-colors min-w-[44px]"
                                    title="View Full Submission Details"
                                    aria-label={isBm ? 'Lihat' : 'View'}
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">{isBm ? 'Lihat' : 'View'}</span>
                                  </button>

                                  <button
                                    onClick={() => handlePreviewPDF(order, isFinal)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-blue-500 transition-colors min-w-[44px]"
                                    title="Preview Official PDF Invoice"
                                    aria-label={isBm ? 'Pratonton' : 'Preview'}
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">{isBm ? 'Pratonton' : 'Preview'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleDownloadPDF(order, isFinal)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-emerald-500 transition-colors min-w-[44px]"
                                    title="Download PDF"
                                    aria-label={isBm ? 'Muat Turun' : 'Download'}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">{isBm ? 'Muat Turun' : 'Download'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleDelete(order.id!)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 transition-colors min-w-[44px]"
                                    title="Delete Submission"
                                    aria-label={isBm ? 'Padam' : 'Delete'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="microcopy-12 leading-none">{isBm ? 'Padam' : 'Delete'}</span>
                                  </button>
                                  <div className="w-[1px] h-4 bg-stone/20 mx-1" />
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <button
                              onClick={() => setOpenActionRowId(openActionRowId === order.id ? null : (order.id || null))}
                              className={`p-2 rounded-full transition-all duration-300 ${
                                openActionRowId === order.id 
                                  ? 'bg-stone/10 text-deep-forest dark:text-white' 
                                  : 'text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10'
                              }`}
                              title={openActionRowId === order.id ? (isBm ? 'Tutup' : 'Close') : (isBm ? 'Buka Tindakan' : 'Open Actions')}
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
              <span className="text-deep-forest/50 dark:text-stone/50">{isBm ? 'Baris:' : 'Rows:'}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
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
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-stone/15 dark:border-white/10 bg-white dark:bg-card text-deep-forest dark:text-white disabled:opacity-40 hover:bg-stone/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-deep-forest dark:text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-stone/15 dark:border-white/10 bg-white dark:bg-card text-deep-forest dark:text-white disabled:opacity-40 hover:bg-stone/10 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminTablesTab;
