import { format } from 'date-fns';
import { formatDateDisplay } from './dateUtils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Order } from '@/types';
import type { ToastVariant } from '@/components/ui/Toast';

export interface ExportToastFn {
  (opts: { title: string; description?: string; variant?: ToastVariant }): void;
}

/**
 * Shared save/download helper. On native platforms it writes the file to
 * cache and triggers the OS share sheet (same pattern used throughout the
 * app — see ExportOrdersModal.tsx / AdminPanel.tsx consolidated invoice
 * flow). On web it falls back to a normal <a download> click.
 */
async function saveOrShareFile(fileName: string, blob: Blob, base64Data?: string) {
  if (Capacitor.isNativePlatform()) {
    const data = base64Data ?? (await blobToBase64(blob));
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
    });
    await Share.share({ title: fileName, url: savedFile.uri });
  } else {
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      resolve(res.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Export orders using the RW_Invoice_v3_Blank.xlsx template — one sheet per
 * order, with client/date/pricing cells filled in at their fixed template
 * coordinates (C8, C9, I8, I9, B15:I24).
 *
 * EXTRACTED FROM (behavior unchanged): AdminTablesTab.tsx `handleExportExcel`.
 * This is a pure relocation — the cell-mapping logic, single-vs-multi-order
 * branching, and worksheet-copy helper are copied verbatim so Tables View's
 * proven output is not altered. AdminTablesTab.tsx now calls this function
 * instead of keeping its own local copy.
 */
export async function exportOrdersAsExcelTemplate(
  orders: Order[],
  toast: ExportToastFn,
  isBm: boolean
): Promise<void> {
  try {
    const ExcelJS = await import('exceljs');

    const response = await fetch('/RW_Invoice_v3_Blank.xlsx');
    if (!response.ok) {
      throw new Error('Failed to fetch Excel template file');
    }
    const arrayBuffer = await response.arrayBuffer();

    if (orders.length === 0) {
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

      if (sourceSheet.model && sourceSheet.model.merges) {
        sourceSheet.model.merges.forEach((mergeRange: any) => {
          targetSheet.mergeCells(mergeRange);
        });
      }

      sourceSheet.columns.forEach((col: any, idx: number) => {
        const targetCol = targetSheet.getColumn(idx + 1);
        targetCol.width = col.width;
        if (col.style) {
          targetCol.style = { ...col.style };
        }
      });

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
      const rawName = o.invoiceNo || (o.id ? `RW-${o.id.substring(0, 6).toUpperCase()}` : 'Invoice');
      let safeName = rawName.replace(/[\\/?*:[\]]/g, '_');
      if (safeName.length > 30) safeName = safeName.substring(0, 30);
      sheet.name = safeName;

      sheet.getCell('C8').value = o.to || 'Majlis Persendirian';
      sheet.getCell('C9').value = o.name || o.attn || '';
      sheet.getCell('I8').value = o.invoiceNo || (o.id ? `RW-${o.id.substring(0, 6).toUpperCase()}` : '-');

      const formattedDate = formatDateDisplay(o.dateTime || o.eventDate || o.date);
      sheet.getCell('I9').value = formattedDate;

      for (let r = 15; r <= 24; r++) {
        if (r === 15) {
          sheet.getCell(`B${r}`).value = formattedDate;
          sheet.getCell(`C${r}`).value = o.preparationType === 'meal_box' ? 'Meal Box' : 'Buffet';
          sheet.getCell(`D${r}`).value = o.quantity || 0;
          sheet.getCell(`E${r}`).value = o.notes || '';
          sheet.getCell(`F${r}`).value = o.menu || '';

          const prices = o.prices || {};
          const meals = o.meals || [];

          const normalizedMeals = meals.map((m: string) => String(m).toLowerCase());
          const hasBreakfast = normalizedMeals.includes('breakfast');
          const hasLunch = normalizedMeals.includes('lunch');
          const hasHiTea = normalizedMeals.includes('hi_tea') || normalizedMeals.includes('hi-tea') || normalizedMeals.includes('hi tea');

          sheet.getCell(`G${r}`).value = hasBreakfast ? (prices.breakfast || 0) : null;
          sheet.getCell(`H${r}`).value = hasLunch ? (prices.lunch || 0) : null;
          sheet.getCell(`I${r}`).value = hasHiTea ? (prices.hi_tea || prices['hi-tea'] || prices['hi tea'] || 0) : null;
        } else {
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

    if (orders.length === 1) {
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      populateOrderSheet(orders[0], worksheet);
    } else {
      const tempWorkbook = new ExcelJS.Workbook();
      await tempWorkbook.xlsx.load(arrayBuffer);
      const sourceSheet = tempWorkbook.worksheets[0];

      orders.forEach((o, index) => {
        const targetSheet = workbook.addWorksheet(`TempSheet_${index}`);
        copyWorksheet(sourceSheet, targetSheet);
        populateOrderSheet(o, targetSheet);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const downloadName = orders.length === 1
      ? `Invoice_${orders[0].invoiceNo || orders[0].id?.substring(0, 8) || 'Order'}.xlsx`
      : `Wawasan_Invoices_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    await saveOrShareFile(downloadName, blob);

    toast({
      title: isBm ? 'Kejayaan' : 'Success',
      description: isBm ? 'Fail Excel berjaya dimuat turun menggunakan template' : 'Excel file downloaded successfully using the template',
      variant: 'success',
    });
  } catch (err) {
    console.error('Failed to export to Excel (template):', err);
    toast({
      title: isBm ? 'Ralat' : 'Error',
      description: isBm ? 'Gagal mengeksport fail Excel' : 'Failed to export Excel file',
      variant: 'error',
    });
  }
}

/**
 * Export orders as a plain flat spreadsheet table — one row per order,
 * standard columns (no template, no per-order sheets). This is the
 * "Standard Table" option alongside the invoice-template export above.
 *
 * Column set intentionally mirrors the 17-column CSV/XLSX export structure
 * documented in the project knowledge base, minus columns that don't apply
 * to admin bulk export (kept to the fields already surfaced elsewhere in
 * the Orders/Tables views).
 */
export async function exportOrdersAsExcelStandard(
  orders: Order[],
  toast: ExportToastFn,
  isBm: boolean
): Promise<void> {
  try {
    if (orders.length === 0) {
      toast({
        title: isBm ? 'Tiada Rekod' : 'No Records',
        description: isBm ? 'Tiada rekod untuk dieksport' : 'There are no records to export',
        variant: 'warning',
      });
      return;
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');

    sheet.columns = [
      { header: 'Order ID', key: 'id', width: 14 },
      { header: 'Company Name', key: 'to', width: 22 },
      { header: 'Contact Person', key: 'name', width: 18 },
      { header: 'Contact Number', key: 'contact', width: 16 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Delivery Date', key: 'date', width: 14 },
      { header: 'Delivery Time', key: 'time', width: 12 },
      { header: 'Pax (Quantity)', key: 'pax', width: 12 },
      { header: 'Meal Type', key: 'meals', width: 20 },
      { header: 'Preparation Type', key: 'prep', width: 16 },
      { header: 'Menu Items', key: 'menu', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Invoice Number', key: 'invoiceNo', width: 16 },
      { header: 'Total Amount (RM)', key: 'total', width: 16 },
      { header: 'Notes', key: 'notes', width: 26 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

    orders.forEach((o) => {
      const dateStr = formatDateDisplay(o.dateTime || o.eventDate || o.date);
      let timeStr = '-';
      if (o.dateTime) {
        try {
          const d = new Date(o.dateTime);
          timeStr = format(d, 'HH:mm');
        } catch {
          timeStr = '-';
        }
      }

      sheet.addRow({
        id: o.id ? o.id.substring(0, 8) : '-',
        to: o.to || 'Majlis Persendirian',
        name: o.name || o.attn || '-',
        contact: o.contact || '-',
        email: o.email || '-',
        date: dateStr,
        time: timeStr,
        pax: o.quantity || 0,
        meals: Array.isArray(o.meals) ? o.meals.join(', ') : '-',
        prep: o.preparationType === 'meal_box' ? 'Meal Box' : (o.preparationType === 'buffet' ? 'Buffet' : '-'),
        menu: o.menu || '-',
        status: (o.status || 'pending').toUpperCase(),
        invoiceNo: o.invoiceNo || 'N/A',
        total: typeof o.totalAmount === 'number' ? o.totalAmount : (parseFloat(String(o.totalAmount || '0')) || 0),
        notes: o.notes || '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Wawasan_Orders_Standard_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;

    await saveOrShareFile(fileName, blob);

    toast({
      title: isBm ? 'Kejayaan' : 'Success',
      description: isBm ? `${orders.length} pesanan berjaya dieksport` : `${orders.length} order(s) exported successfully`,
      variant: 'success',
    });
  } catch (err) {
    console.error('Failed to export to Excel (standard):', err);
    toast({
      title: isBm ? 'Ralat' : 'Error',
      description: isBm ? 'Gagal mengeksport fail Excel' : 'Failed to export Excel file',
      variant: 'error',
    });
  }
}
