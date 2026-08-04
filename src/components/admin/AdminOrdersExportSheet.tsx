import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import type { Order } from '@/types';
import type { ToastVariant } from '@/components/ui/Toast';
import { exportOrdersAsExcelTemplate, exportOrdersAsExcelStandard } from '@/lib/exportUtils';

interface AdminOrdersExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** All orders currently visible under the active filters (date-range etc). */
  filteredOrders: Order[];
  /** Order IDs the admin has ticked in Select Mode (may be empty). */
  selectedOrderIds: Set<string>;
  language: string;
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  /**
   * Opens the existing consolidated-invoice confirmation flow (fetches the
   * next invoice number, then shows the notes-inclusion modal). Reused as-is
   * rather than duplicating that logic here — see handleGenerateConsolidatedInvoice
   * in AdminPanel.tsx for the actual PDF generation and its single-client
   * enforcement.
   */
  prepareConsolidateModal?: () => void;
  /** Same selection setter Select Mode uses elsewhere in this tab. */
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

type ActiveFormat = 'excel-template' | 'excel-standard' | null;

/**
 * Bottom sheet for exporting orders, modeled on the Jotform "Download all /
 * Download selected" pattern (see project reference screenshots). Replaces
 * ExportOrdersModal.tsx entirely — column selection from that modal is
 * intentionally dropped for now per product decision, to be revisited later
 * as a separate enhancement if needed.
 *
 * PDF export does not do its own generation here — it hands off to the
 * existing consolidated-invoice flow in AdminPanel (prepareConsolidateModal),
 * which already enforces single-client selection and fetches a real invoice
 * number. This sheet's job for PDF is only: (1) auto-select all visible
 * orders if nothing is selected yet, then (2) open that existing flow.
 */
export function AdminOrdersExportSheet({
  isOpen,
  onClose,
  filteredOrders,
  selectedOrderIds,
  language,
  toast,
  prepareConsolidateModal,
  setSelectedOrderIds,
}: AdminOrdersExportSheetProps) {
  const [busyFormat, setBusyFormat] = useState<ActiveFormat>(null);
  const isBm = language === 'bm';

  if (!isOpen) return null;

  const hasSelection = selectedOrderIds.size > 0;
  const targetOrders = hasSelection
    ? filteredOrders.filter(o => o.id && selectedOrderIds.has(o.id))
    : filteredOrders;

  const heading = hasSelection
    ? (isBm ? 'Muat Turun Pilihan' : 'Download selected')
    : (isBm ? 'Muat Turun Semua' : 'Download all');

  const subheading = hasSelection
    ? `${targetOrders.length} ${isBm ? 'pesanan dipilih' : 'order(s) selected'}`
    : `${targetOrders.length} ${isBm ? 'pesanan (mengikut tapisan semasa)' : 'order(s) (current filters)'}`;

  const runExcel = async (mode: 'excel-template' | 'excel-standard') => {
    if (targetOrders.length === 0) {
      toast({
        title: isBm ? 'Tiada Rekod' : 'No Records',
        description: isBm ? 'Tiada pesanan untuk dieksport' : 'There are no orders to export',
        variant: 'warning',
      });
      return;
    }
    setBusyFormat(mode);
    try {
      if (mode === 'excel-template') {
        await exportOrdersAsExcelTemplate(targetOrders, toast, isBm);
      } else {
        await exportOrdersAsExcelStandard(targetOrders, toast, isBm);
      }
      onClose();
    } finally {
      setBusyFormat(null);
    }
  };

  const runPdf = () => {
    if (targetOrders.length === 0) {
      toast({
        title: isBm ? 'Tiada Rekod' : 'No Records',
        description: isBm ? 'Tiada pesanan untuk dieksport' : 'There are no orders to export',
        variant: 'warning',
      });
      return;
    }
    // "Download all" case: nothing ticked yet in Select Mode, so auto-select
    // every currently-visible order before handing off. If those orders span
    // more than one client, the downstream consolidated-invoice flow will
    // reject with its own toast — that's expected (see conversation: PDF
    // bulk-export across clients is an accepted edge case, not something
    // this sheet auto-splits).
    if (!hasSelection) {
      setSelectedOrderIds(new Set(targetOrders.filter(o => o.id).map(o => o.id!)));
    }
    onClose();
    // Deferred so the selection state above has committed before the
    // existing consolidated-invoice flow reads selectedOrderIds.
    setTimeout(() => {
      if (prepareConsolidateModal) prepareConsolidateModal();
    }, 0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-md bg-white dark:bg-card border border-stone/15 dark:border-white/10 rounded-t-3xl md:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl space-y-1">
        <div className="flex items-center justify-between pb-3 border-b border-stone/10 dark:border-white/10">
          <div>
            <h3 className="font-display font-bold text-lg text-deep-forest dark:text-white">
              {heading}
            </h3>
            <p className="microcopy-12 text-stone-500 dark:text-stone-400">
              {subheading}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-stone/10 dark:hover:bg-white/10 text-stone-500 dark:text-stone-400"
            aria-label={isBm ? 'Tutup' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={() => runExcel('excel-template')}
            disabled={busyFormat !== null}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-stone/15 dark:border-white/10 hover:bg-[var(--color-sunshine-cta)]/10 disabled:opacity-50 transition-colors text-left"
          >
            <div className="w-10 h-10 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              {busyFormat === 'excel-template' ? (
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-deep-forest dark:text-white">
                {isBm ? 'Excel — Templat Invois' : 'Excel — Invoice Template'}
              </p>
              <p className="microcopy-12 text-stone-500 dark:text-stone-400">
                {isBm ? 'Satu helaian per pesanan, ikut borang RW rasmi' : 'One sheet per order, using the official RW template'}
              </p>
            </div>
          </button>

          <button
            onClick={() => runExcel('excel-standard')}
            disabled={busyFormat !== null}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-stone/15 dark:border-white/10 hover:bg-[var(--color-sunshine-cta)]/10 disabled:opacity-50 transition-colors text-left"
          >
            <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-500/10 flex items-center justify-center">
              {busyFormat === 'excel-standard' ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-deep-forest dark:text-white">
                {isBm ? 'Excel — Jadual Standard' : 'Excel — Standard Table'}
              </p>
              <p className="microcopy-12 text-stone-500 dark:text-stone-400">
                {isBm ? 'Satu baris per pesanan, senarai ringkas' : 'One row per order, flat spreadsheet list'}
              </p>
            </div>
          </button>

          <button
            onClick={runPdf}
            disabled={busyFormat !== null || !prepareConsolidateModal}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-stone/15 dark:border-white/10 hover:bg-[var(--color-sunshine-cta)]/10 disabled:opacity-50 transition-colors text-left"
            title={!prepareConsolidateModal ? (isBm ? 'Tidak tersedia' : 'Not available') : undefined}
          >
            <div className="w-10 h-10 shrink-0 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-deep-forest dark:text-white">
                {isBm ? 'PDF — Invois Konsolidasi' : 'PDF — Consolidated Invoice'}
              </p>
              <p className="microcopy-12 text-stone-500 dark:text-stone-400">
                {isBm ? 'Satu klien sahaja setiap invois; akan diminta sahkan nombor invois' : 'Single client only per invoice; you\'ll confirm the invoice number next'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AdminOrdersExportSheet;
