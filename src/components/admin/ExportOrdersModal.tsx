import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileSpreadsheet, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Order, ExportColumnOptions } from '@/types';
import type { ToastVariant } from '@/components/ui/Toast';

interface ExportOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  filteredOrders: Order[];
  selectedOrderIds: Set<string>;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const DEFAULT_COLUMNS: ExportColumnOptions = {
  date: true,
  invoiceNo: true,
  client: true,
  contact: true,
  emailPhone: true,
  location: true,
  pax: true,
  meals: true,
  menu: true,
  totalAmount: true,
  status: true,
  notes: true,
};

export function ExportOrdersModal({
  isOpen,
  onClose,
  orders,
  filteredOrders,
  selectedOrderIds,
  toast,
}: ExportOrdersModalProps) {
  const [scope, setScope] = useState<'filtered' | 'selected' | 'all'>('filtered');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [columns, setColumns] = useState<ExportColumnOptions>(DEFAULT_COLUMNS);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Determine orders to export based on scope
  let targetOrders: Order[] = filteredOrders;
  if (scope === 'all') {
    targetOrders = orders;
  } else if (scope === 'selected') {
    targetOrders = orders.filter(o => o.id && selectedOrderIds.has(o.id));
  }

  const toggleColumn = (key: keyof ExportColumnOptions) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (targetOrders.length === 0) {
        toast({
          title: 'No Orders To Export',
          description: 'There are no orders in the selected scope.',
          variant: 'warning',
        });
        setIsExporting(false);
        return;
      }

      if (exportFormat === 'json') {
        const jsonStr = JSON.stringify(targetOrders, null, 2);
        const fileName = `Wawasan_Orders_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
        
        if (Capacitor.isNativePlatform()) {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: jsonStr,
            directory: Directory.Cache,
          });
          await Share.share({ title: fileName, url: savedFile.uri });
        } else {
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // CSV Generation with UTF-8 BOM for Microsoft Excel Compatibility
        const headers: string[] = [];
        if (columns.date) headers.push('Date & Time');
        if (columns.invoiceNo) headers.push('Invoice No');
        if (columns.client) headers.push('Client / Department');
        if (columns.contact) headers.push('Contact Person');
        if (columns.emailPhone) headers.push('Email & Phone');
        if (columns.location) headers.push('Location / Venue');
        if (columns.pax) headers.push('Pax (Qty)');
        if (columns.meals) headers.push('Meals');
        if (columns.menu) headers.push('Menu Details');
        if (columns.totalAmount) headers.push('Total Amount (RM)');
        if (columns.status) headers.push('Status');
        if (columns.notes) headers.push('Notes');

        const escapeCsvCell = (val: string | number | undefined | null) => {
          if (val === undefined || val === null) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        };

        const rows = targetOrders.map(o => {
          const rowData: string[] = [];
          if (columns.date) {
            const dateStr = o.dateTime ? format(new Date(o.dateTime), 'yyyy-MM-dd HH:mm') : (o.date ? String(o.date) : '-');
            rowData.push(escapeCsvCell(dateStr));
          }
          if (columns.invoiceNo) {
            rowData.push(escapeCsvCell(o.invoiceNo || (o.id ? `RW${o.id.substring(0, 6).toUpperCase()}` : '-')));
          }
          if (columns.client) rowData.push(escapeCsvCell(o.to || 'Majlis Persendirian'));
          if (columns.contact) rowData.push(escapeCsvCell(o.name || o.attn || '-'));
          if (columns.emailPhone) rowData.push(escapeCsvCell(`${o.email || ''} / ${o.contact || ''}`));
          if (columns.location) rowData.push(escapeCsvCell(o.location || '-'));
          if (columns.pax) rowData.push(escapeCsvCell(o.quantity || 0));
          if (columns.meals) rowData.push(escapeCsvCell(Array.isArray(o.meals) ? o.meals.join(', ') : '-'));
          if (columns.menu) rowData.push(escapeCsvCell(o.menu || '-'));
          if (columns.totalAmount) {
            const total = typeof o.totalAmount === 'number' ? o.totalAmount : (parseFloat(String(o.totalAmount || '0')) || 0);
            rowData.push(escapeCsvCell(total.toFixed(2)));
          }
          if (columns.status) rowData.push(escapeCsvCell((o.status || 'pending').toUpperCase()));
          if (columns.notes) rowData.push(escapeCsvCell(o.notes || '-'));

          return rowData.join(',');
        });

        // Add UTF-8 BOM (\uFEFF) so Excel opens UTF-8 text correctly without encoding artifacts
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
        const fileName = `Wawasan_Accounting_Orders_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;

        if (Capacitor.isNativePlatform()) {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: btoa(unescape(encodeURIComponent(csvContent))),
            directory: Directory.Cache,
          });
          await Share.share({ title: fileName, url: savedFile.uri });
        } else {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }

      toast({
        title: 'Orders Exported Successfully',
        description: `Exported ${targetOrders.length} order(s) as ${exportFormat.toUpperCase()}.`,
        variant: 'success',
      });
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: 'Export Failed',
        description: String(err),
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sunshine/10 text-sunshine flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-deep-forest">
                Export Orders to Excel / CSV
              </h3>
              <p className="text-xs text-stone">
                Configure columns and download accounting order records
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scope Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-deep-forest uppercase tracking-wider block">
            1. Select Export Scope
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScope('filtered')}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                scope === 'filtered'
                  ? 'bg-sunshine text-white border-sunshine'
                  : 'bg-cream/40 dark:bg-background/40 border-stone/15 text-stone'
              }`}
            >
              Filtered ({filteredOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setScope('selected')}
              disabled={selectedOrderIds.size === 0}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors disabled:opacity-40 ${
                scope === 'selected'
                  ? 'bg-sunshine text-white border-sunshine'
                  : 'bg-cream/40 dark:bg-background/40 border-stone/15 text-stone'
              }`}
            >
              Selected ({selectedOrderIds.size})
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                scope === 'all'
                  ? 'bg-sunshine text-white border-sunshine'
                  : 'bg-cream/40 dark:bg-background/40 border-stone/15 text-stone'
              }`}
            >
              All Orders ({orders.length})
            </button>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-deep-forest uppercase tracking-wider block">
            2. Export File Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                exportFormat === 'csv'
                  ? 'bg-kiwi/20 text-kiwi border-kiwi'
                  : 'bg-cream/40 dark:bg-background/40 border-stone/15 text-stone'
              }`}
            >
              CSV File (.csv for Excel)
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                exportFormat === 'json'
                  ? 'bg-kiwi/20 text-kiwi border-kiwi'
                  : 'bg-cream/40 dark:bg-background/40 border-stone/15 text-stone'
              }`}
            >
              JSON Data (.json)
            </button>
          </div>
        </div>

        {/* Column Toggles */}
        {exportFormat === 'csv' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone/10 pb-1.5">
              <label className="text-xs font-bold text-deep-forest uppercase tracking-wider">
                3. Column Field Toggles
              </label>
              <button
                type="button"
                onClick={() => {
                  const allActive = Object.values(columns).every(Boolean);
                  const nextState = !allActive;
                  setColumns({
                    date: nextState,
                    invoiceNo: nextState,
                    client: nextState,
                    contact: nextState,
                    emailPhone: nextState,
                    location: nextState,
                    pax: nextState,
                    meals: nextState,
                    menu: nextState,
                    totalAmount: nextState,
                    status: nextState,
                    notes: nextState,
                  });
                }}
                className="text-[10px] font-bold text-sunshine hover:underline"
              >
                Toggle All Fields
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'date', label: 'Date & Time' },
                { key: 'invoiceNo', label: 'Invoice Number' },
                { key: 'client', label: 'Client / Dept' },
                { key: 'contact', label: 'Contact Person' },
                { key: 'emailPhone', label: 'Email & Phone' },
                { key: 'location', label: 'Location / Venue' },
                { key: 'pax', label: 'Pax Quantity' },
                { key: 'meals', label: 'Meals (Sarapan/Lunch)' },
                { key: 'menu', label: 'Menu Details' },
                { key: 'totalAmount', label: 'Total Amount (RM)' },
                { key: 'status', label: 'Order Status' },
                { key: 'notes', label: 'Notes' },
              ].map(({ key, label }) => {
                const colKey = key as keyof ExportColumnOptions;
                const isChecked = columns[colKey];
                return (
                  <div
                    key={key}
                    onClick={() => toggleColumn(colKey)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-sunshine/10 border-sunshine/40'
                        : 'bg-cream/20 dark:bg-background/20 border-stone/10 opacity-60'
                    }`}
                  >
                    <span className="text-xs font-semibold text-deep-forest">
                      {label}
                    </span>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={() => toggleColumn(colKey)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone/10">
          <Button variant="ghost" onClick={onClose} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-sunshine hover:bg-crisp-carrot text-white rounded-xl text-xs font-bold h-11 px-6 flex items-center gap-2 shadow-md"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : `Export ${targetOrders.length} Order(s)`}
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default ExportOrdersModal;
