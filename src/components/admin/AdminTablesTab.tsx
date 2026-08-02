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
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '../../types';
import type { ToastMessage } from '../ui/Toast';

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

type SortField = 'date' | 'to' | 'name' | 'quantity' | 'totalAmount' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type TableDensity = 'compact' | 'normal' | 'spacious';

interface ColumnDef {
  key: string;
  labelEn: string;
  labelBm: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'invoiceNo', labelEn: 'Ref / Invoice No', labelBm: 'No. Rujukan / Invois', defaultVisible: true },
  { key: 'createdAt', labelEn: 'Submitted Date', labelBm: 'Tarikh Hantar', defaultVisible: true },
  { key: 'to', labelEn: 'Client / Organization', labelBm: 'Klien / Organisasi', defaultVisible: true },
  { key: 'name', labelEn: 'Contact Person', labelBm: 'Pegawai Bertanggungjawab', defaultVisible: true },
  { key: 'contact', labelEn: 'Phone Number', labelBm: 'No. Telefon', defaultVisible: true },
  { key: 'email', labelEn: 'Email Address', labelBm: 'Alamat Emel', defaultVisible: true },
  { key: 'dateTime', labelEn: 'Event Date & Time', labelBm: 'Tarikh & Masa Acara', defaultVisible: true },
  { key: 'location', labelEn: 'Event Location', labelBm: 'Lokasi Acara', defaultVisible: true },
  { key: 'preparationType', labelEn: 'Prep Type', labelBm: 'Jenis Sajian', defaultVisible: true },
  { key: 'quantity', labelEn: 'Pax (Qty)', labelBm: 'Bil. Pax', defaultVisible: true },
  { key: 'meals', labelEn: 'Meal Types', labelBm: 'Jenis Hidangan', defaultVisible: true },
  { key: 'menu', labelEn: 'Menu Breakdown', labelBm: 'Butiran Menu', defaultVisible: false },
  { key: 'totalAmount', labelEn: 'Total (RM)', labelBm: 'Jumlah (RM)', defaultVisible: true },
  { key: 'status', labelEn: 'Status', labelBm: 'Status', defaultVisible: true },
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
  const [density, setDensity] = useState<TableDensity>('normal');
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
          const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
          const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
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
          ...authHeaders,
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
    try {
      const ExcelJS = await import('exceljs');
      
      // Fetch the blank template file
      const response = await fetch('/RW_Invoice_v3_Blank.xlsx');
      if (!response.ok) {
        throw new Error('Failed to fetch Excel template file');
      }
      const arrayBuffer = await response.arrayBuffer();

      // Determine target orders based on selection
      const targetOrders = selectedIds.size > 0 
        ? filteredAndSortedOrders.filter(o => o.id && selectedIds.has(o.id))
        : filteredAndSortedOrders;

      if (targetOrders.length === 0) {
        toast({
          title: isBm ? 'Tiada Rekod' : 'No Records',
          description: isBm ? 'Tiada rekod untuk dieksport' : 'There are no records to export',
          variant: 'warning',
        });
        return;
      }

      const workbook = new ExcelJS.Workbook();

      // Helper function to copy a worksheet's structure, styling and merges
      const copyWorksheet = (sourceSheet: any, targetSheet: any) => {
        targetSheet.pageSetup = { ...sourceSheet.pageSetup };
        targetSheet.views = [...sourceSheet.views];

        // Copy merged cells
        if (sourceSheet.model && sourceSheet.model.merges) {
          sourceSheet.model.merges.forEach((mergeRange: any) => {
            targetSheet.mergeCells(mergeRange);
          });
        }

        // Copy column widths and styling
        sourceSheet.columns.forEach((col: any, idx: number) => {
          const targetCol = targetSheet.getColumn(idx + 1);
          targetCol.width = col.width;
          if (col.style) {
            targetCol.style = { ...col.style };
          }
        });

        // Copy row heights and cells
        sourceSheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
          const targetRow = targetSheet.getRow(rowNumber);
          targetRow.height = row.height;
          
          row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
            const targetCell = targetRow.getCell(colNumber);
            
            if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
              targetCell.value = { formula: cell.value.formula, result: cell.value.result };
            } else {
              targetCell.value = cell.value;
            }

            if (cell.style) {
              targetCell.style = { ...cell.style };
            }
          });
        });
      };

      const populateOrderSheet = (o: any, sheet: any) => {
        // Safe worksheet name (max 31 chars, no special characters: \ / ? * : [ ])
        const rawName = o.invoiceNo || (o.id ? `RW-${o.id.substring(0, 6).toUpperCase()}` : 'Invoice');
        let safeName = rawName.replace(/[\\/?*:[\]]/g, '_');
        if (safeName.length > 30) safeName = safeName.substring(0, 30);
        sheet.name = safeName;

        // Fill client and billing metadata
        sheet.getCell('C8').value = o.to || 'Majlis Persendirian'; // C8
        sheet.getCell('C9').value = o.name || o.attn || ''; // C9 (Attn)
        sheet.getCell('I8').value = o.invoiceNo || (o.id ? `RW${o.id.substring(0, 6).toUpperCase()}` : '-'); // I8 (Invoice No)
        
        let formattedDate = '-';
        if (o.dateTime) {
          try {
            formattedDate = format(new Date(o.dateTime), 'dd/MM/yyyy');
          } catch {
            formattedDate = String(o.dateTime);
          }
        } else if (o.date) {
          try {
            formattedDate = format(new Date(o.date), 'dd/MM/yyyy');
          } catch {
            formattedDate = String(o.date);
          }
        }
        sheet.getCell('I9').value = formattedDate; // I9 (Date)

        // Reset and fill order details starting at Row 15 to Row 24 (10 rows available)
        // Since we want to use the template exactly as is, we fill Row 15 and clear the remaining detail rows,
        // which leaves the existing formulas in columns J, K, L, M completely untouched to compute correctly.
        for (let r = 15; r <= 24; r++) {
          if (r === 15) {
            sheet.getCell(`B${r}`).value = formattedDate; // Date
            sheet.getCell(`C${r}`).value = o.preparationType === 'meal_box' ? 'Meal Box' : 'Buffet'; // For / Prep Type
            sheet.getCell(`D${r}`).value = o.quantity || 0; // QTY / Pax
            sheet.getCell(`E${r}`).value = o.notes || ''; // Notes
            sheet.getCell(`F${r}`).value = o.menu || ''; // Menu Details

            const prices = o.prices || {};
            const meals = o.meals || [];
            
            // Normalize meal selection list
            const normalizedMeals = meals.map((m: string) => String(m).toLowerCase());
            const hasBreakfast = normalizedMeals.includes('breakfast');
            const hasLunch = normalizedMeals.includes('lunch');
            const hasHiTea = normalizedMeals.includes('hi_tea') || normalizedMeals.includes('hi-tea') || normalizedMeals.includes('hi tea');

            sheet.getCell(`G${r}`).value = hasBreakfast ? (prices.breakfast || 0) : null;
            sheet.getCell(`H${r}`).value = hasLunch ? (prices.lunch || 0) : null;
            sheet.getCell(`I${r}`).value = hasHiTea ? (prices.hi_tea || prices['hi-tea'] || prices['hi tea'] || 0) : null;
          } else {
            // Clear details for rows 16-24 to avoid stale/placeholder data
            sheet.getCell(`B${r}`).value = null;
            sheet.getCell(`C${r}`).value = null;
            sheet.getCell(`D${r}`).value = null;
            sheet.getCell(`E${r}`).value = null;
            sheet.getCell(`F${r}`).value = null;
            sheet.getCell(`G${r}`).value = null;
            sheet.getCell(`H${r}`).value = null;
            sheet.getCell(`I${r}`).value = null;
          }
        }
      };

      if (targetOrders.length === 1) {
        // For a single order, load and modify the template workbook directly to preserve all background drawing media and layouts perfectly!
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        populateOrderSheet(targetOrders[0], worksheet);
      } else {
        // For multiple orders, copy the template worksheet structure into a single spreadsheet, with one sheet per order
        const tempWorkbook = new ExcelJS.Workbook();
        await tempWorkbook.xlsx.load(arrayBuffer);
        const sourceSheet = tempWorkbook.worksheets[0];

        targetOrders.forEach((o, index) => {
          const targetSheet = workbook.addWorksheet(`TempSheet_${index}`);
          copyWorksheet(sourceSheet, targetSheet);
          populateOrderSheet(o, targetSheet);
        });
      }

      // Generate spreadsheet binary write buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const downloadName = targetOrders.length === 1
        ? `Invoice_${targetOrders[0].invoiceNo || targetOrders[0].id?.substring(0, 8) || 'Order'}.xlsx`
        : `Wawasan_Invoices_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: isBm ? 'Kejayaan' : 'Success',
        description: isBm ? 'Fail Excel berjaya dimuat turun menggunakan template' : 'Excel file downloaded successfully using the template',
        variant: 'success',
      });
    } catch (err) {
      console.error('Failed to export to Excel:', err);
      toast({
        title: isBm ? 'Ralat' : 'Error',
        description: isBm ? 'Gagal mengeksport fail Excel' : 'Failed to export Excel file',
        variant: 'error',
      });
    }
  };

  // Density classes
  const densityCellPadding = {
    compact: 'py-2 px-3 text-xs',
    normal: 'py-3.5 px-4 text-sm',
    spacious: 'py-5 px-5 text-sm',
  }[density];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Table Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-card border border-stone/15 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-deep-forest/60 dark:text-stone/60 uppercase tracking-wider">
              {isBm ? 'Jumlah Permohonan' : 'Total Submissions'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sunshine/10 text-sunshine flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-deep-forest dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs text-deep-forest/40 dark:text-stone/40">{isBm ? 'rekod' : 'records'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {isBm ? 'Menunggu Disahkan' : 'Pending Review'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
              {stats.pending}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">
              {stats.pending}
            </span>
            <span className="text-xs text-amber-600/60 dark:text-amber-400/60">{isBm ? 'perlu tindakan' : 'need review'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {isBm ? 'Invois / Diluluskan' : 'Approved & Billed'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
              {stats.approved + stats.billed}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">
              {stats.approved + stats.billed}
            </span>
            <span className="text-xs text-emerald-600/60 dark:text-emerald-400/60">{isBm ? 'selesai' : 'completed'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-card border border-sunshine/30 dark:border-sunshine/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-deep-forest/60 dark:text-stone/60 uppercase tracking-wider">
              {isBm ? 'Hasil Terkumpul' : 'Total Revenue'}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sunshine/20 text-deep-forest dark:text-sunshine">
              RM
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs font-bold text-sunshine">RM</span>
            <span className="text-2xl font-display font-bold text-deep-forest dark:text-white">
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
              className="w-full pl-9 pr-8 h-9 bg-cream/50 dark:bg-background/40 border border-stone/15 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sunshine/40 text-deep-forest dark:text-white transition-all"
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
                <Columns className="w-3.5 h-3.5 text-sunshine" />
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
                        className="text-[10px] text-sunshine hover:underline font-semibold"
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
                            className="rounded border-stone/30 text-sunshine focus:ring-sunshine cursor-pointer"
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
                  density === 'compact' ? 'bg-sunshine text-charcoal shadow-xs' : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                S
              </button>
              <button
                onClick={() => setDensity('normal')}
                title="Normal View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'normal' ? 'bg-sunshine text-charcoal shadow-xs' : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                M
              </button>
              <button
                onClick={() => setDensity('spacious')}
                title="Spacious View"
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  density === 'spacious' ? 'bg-sunshine text-charcoal shadow-xs' : 'text-deep-forest/60 dark:text-stone/60'
                }`}
              >
                L
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-sunshine/15 hover:bg-sunshine/25 text-deep-forest dark:text-sunshine font-semibold rounded-xl text-xs transition-all border border-sunshine/30"
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
          <div className="bg-sunshine/10 dark:bg-sunshine/5 border-b border-sunshine/20 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-deep-forest dark:text-sunshine">{isBm ? 'Tapis Active:' : 'Active Filters:'}</span>
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
              className="text-xs font-bold text-deep-forest hover:underline dark:text-sunshine"
            >
              {isBm ? 'Set Semula Tapis' : 'Reset All Filters'}
            </button>
          </div>
        )}

        {/* Selected Rows Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-charcoal text-white px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-sunshine" />
              <span className="font-semibold">
                {selectedIds.size} {isBm ? 'rekod dipilih' : 'rows selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3 py-1 bg-sunshine text-charcoal font-bold rounded-lg hover:bg-sunshine/90 transition-all"
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
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedOrders.length > 0 && selectedIds.size === paginatedOrders.length}
                    onChange={handleSelectAll}
                    className="rounded border-stone/30 text-sunshine focus:ring-sunshine"
                  />
                </th>

                {visibleColumns.has('invoiceNo') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'No. Invois / Ref' : 'Invoice / Ref'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('createdAt') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Tarikh Hantar' : 'Submitted'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('to') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10" onClick={() => handleSort('to')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Organisasi / Klien' : 'Organization'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('name') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>{isBm ? 'Pemohon' : 'Contact Person'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('contact') && (
                  <th className="py-3 px-4">{isBm ? 'Telefon' : 'Phone'}</th>
                )}

                {visibleColumns.has('email') && (
                  <th className="py-3 px-4">{isBm ? 'Emel' : 'Email'}</th>
                )}

                {visibleColumns.has('dateTime') && (
                  <th className="py-3 px-4">{isBm ? 'Tarikh Acara' : 'Event Date'}</th>
                )}

                {visibleColumns.has('location') && (
                  <th className="py-3 px-4">{isBm ? 'Lokasi' : 'Location'}</th>
                )}

                {visibleColumns.has('preparationType') && (
                  <th className="py-3 px-4">{isBm ? 'Sajian' : 'Prep'}</th>
                )}

                {visibleColumns.has('quantity') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10 text-right" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Pax</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('meals') && (
                  <th className="py-3 px-4">{isBm ? 'Hidangan' : 'Meals'}</th>
                )}

                {visibleColumns.has('menu') && (
                  <th className="py-3 px-4">{isBm ? 'Menu' : 'Menu Details'}</th>
                )}

                {visibleColumns.has('totalAmount') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10 text-right" onClick={() => handleSort('totalAmount')}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{isBm ? 'Jumlah' : 'Total'}</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('status') && (
                  <th className="py-3 px-4 cursor-pointer hover:bg-stone/10" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-deep-forest/40" />
                    </div>
                  </th>
                )}

                {visibleColumns.has('actions') && (
                  <th className="py-3 px-4 text-center sticky right-0 bg-cream/95 dark:bg-background/95 backdrop-blur-md z-10">
                    {isBm ? 'Tindakan' : 'Actions'}
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
                  const isBilled = order.status === 'billed' || order.status === ('dibilkan' as string);

                  return (
                    <tr
                      key={order.id || index}
                      className={`hover:bg-cream/40 dark:hover:bg-white/5 transition-colors group ${
                        isSelected ? 'bg-sunshine/10 dark:bg-sunshine/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className={`${densityCellPadding} text-center`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(order.id!)}
                          className="rounded border-stone/30 text-sunshine focus:ring-sunshine"
                        />
                      </td>

                      {/* Invoice / Ref */}
                      {visibleColumns.has('invoiceNo') && (
                        <td className={`${densityCellPadding} font-mono font-bold text-deep-forest dark:text-white whitespace-nowrap`}>
                          <button
                            onClick={() => openOrderDetail(order)}
                            className="hover:text-sunshine text-left underline-offset-2 hover:underline transition-colors"
                          >
                            {order.invoiceNo || order.id || 'N/A'}
                          </button>
                        </td>
                      )}

                      {/* Submitted Date */}
                      {visibleColumns.has('createdAt') && (
                        <td className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 whitespace-nowrap`}>
                          {order.createdAt
                            ? (typeof order.createdAt === 'string'
                                ? new Date(order.createdAt).toLocaleDateString('en-GB')
                                : new Date((order.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString('en-GB'))
                            : '-'}
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
                            <a href={`mailto:${order.email}`} className="hover:text-sunshine hover:underline">
                              {order.email}
                            </a>
                          ) : '-'}
                        </td>
                      )}

                      {/* Event Date & Time */}
                      {visibleColumns.has('dateTime') && (
                        <td className={`${densityCellPadding} text-deep-forest/80 dark:text-stone/80 whitespace-nowrap`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-sunshine shrink-0" />
                            <span>{order.dateTime || '-'}</span>
                          </div>
                        </td>
                      )}

                      {/* Location */}
                      {visibleColumns.has('location') && (
                        <td className={`${densityCellPadding} text-deep-forest/70 dark:text-stone/70 max-w-[180px] truncate`} title={order.location}>
                          {order.location || '-'}
                        </td>
                      )}

                      {/* Prep Type */}
                      {visibleColumns.has('preparationType') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            order.preparationType === 'meal_box'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {order.preparationType === 'meal_box' ? 'Meal Box' : 'Buffet'}
                          </span>
                        </td>
                      )}

                      {/* Pax */}
                      {visibleColumns.has('quantity') && (
                        <td className={`${densityCellPadding} font-bold text-right text-deep-forest dark:text-white whitespace-nowrap`}>
                          {order.quantity || 0}
                        </td>
                      )}

                      {/* Meals */}
                      {visibleColumns.has('meals') && (
                        <td className={`${densityCellPadding} whitespace-nowrap`}>
                          <div className="flex flex-wrap gap-1">
                            {(order.meals || []).map(m => (
                              <span key={m} className="px-1.5 py-0.5 bg-stone/10 dark:bg-white/10 rounded text-[10px] font-medium uppercase tracking-wider text-deep-forest dark:text-white">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}

                      {/* Menu Breakdown */}
                      {visibleColumns.has('menu') && (
                        <td className={`${densityCellPadding} max-w-[200px] truncate text-xs text-deep-forest/70 dark:text-stone/70`} title={order.menu}>
                          {order.menu || '-'}
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

                      {/* Actions Sticky Column */}
                      {visibleColumns.has('actions') && (
                        <td className={`${densityCellPadding} text-center sticky right-0 bg-white group-hover:bg-cream/90 dark:bg-card dark:group-hover:bg-card/90 z-10 whitespace-nowrap shadow-xs`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openOrderDetail(order)}
                              className="p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-sunshine transition-colors"
                              title="View Full Submission Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handlePreviewPDF(order, isBilled)}
                              className="p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-blue-500 transition-colors"
                              title="Preview Official PDF Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDownloadPDF(order, isBilled)}
                              className="p-1.5 hover:bg-stone/10 rounded-lg text-deep-forest/70 dark:text-stone/70 hover:text-emerald-500 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(order.id!)}
                              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 transition-colors"
                              title="Delete Submission"
                            >
                              <Trash2 className="w-4 h-4" />
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
