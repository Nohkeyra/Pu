import { toJSDate, toMalaysiaDateTime } from './dateUtils.js';
import { getOrderEventDate, type TimestampedOrder } from './orderTimestamp.js';
import ExcelJS from "exceljs";
interface ExportOrder extends TimestampedOrder {
  to?: string; company?: string; department?: string; division?: string; attn?: string;
  name?: string; customerName?: string; email?: string; customerEmail?: string;
  contact?: string; phone?: string; location?: string;
  quantity?: number; pax?: number; guests?: number;
  meals?: string | string[]; preparationType?: string; prices?: Record<string, number>;
  unitPrice?: number | null; totalAmount?: number | null; status?: string;
  invoiceNo?: string; updatedAt?: unknown; approvedAt?: string; billedAt?: string;
  time?: string; menu?: string; notes?: string;
}

export interface ExportFilterOptions {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  clientCompanyId?: string;
}

export function formatMealTypes(meals: unknown): string {
  if (Array.isArray(meals)) {
    return meals
      .map((m) => {
        const s = String(m).toLowerCase();
        if (s === "breakfast") return "Breakfast";
        if (s === "lunch") return "Lunch";
        if (s === "hi_tea" || s === "hi-tea" || s === "hitea") return "Hi-Tea";
        return String(m);
      })
      .join(", ");
  }
  if (typeof meals === "string") return meals;
  return "-";
}

export function formatPrepType(prep: unknown): string {
  const s = String(prep || "").toLowerCase();
  if (s === "meal_box") return "Meal Box (Bungkus)";
  if (s === "buffet") return "Served Buffet (Sajian)";
  return s || "-";
}

export function formatUnitPrices(order: ExportOrder): string {
  if (order.prices && typeof order.prices === "object") {
    const entries = Object.entries(order.prices)
      .map(([k, v]) => `${k}: RM ${Number(v).toFixed(2)}`)
      .join("; ");
    if (entries) return entries;
  }
  if (order.unitPrice !== undefined && order.unitPrice !== null) {
    return `RM ${Number(order.unitPrice).toFixed(2)}`;
  }
  return "-";
}

export function formatTimestamp(ts: unknown): string {
  if (ts == null || ts === '') return "-";
  if (typeof ts === "string") return toJSDate(ts) ? ts : "-";
  const date = toJSDate(ts);
  return date ? date.toISOString() : "-";
}

const columns = [
    { header: "Order ID", key: "orderId", width: 22 },
    { header: "Client Company", key: "clientCompany", width: 25 },
    { header: "Department", key: "department", width: 20 },
    { header: "Contact Name", key: "contactName", width: 22 },
    { header: "Contact Email", key: "contactEmail", width: 26 },
    { header: "Contact Phone", key: "contactPhone", width: 18 },
    { header: "Event Date", key: "eventDate", width: 16 },
    { header: "Venue/Address", key: "venueAddress", width: 30 },
    { header: "Pax Count", key: "paxCount", width: 12 },
    { header: "Meal Types", key: "mealTypes", width: 22 },
    { header: "Preparation Type", key: "prepType", width: 22 },
    { header: "Unit Prices", key: "unitPrices", width: 28 },
    { header: "Total Amount", key: "totalAmount", width: 16 },
    { header: "Status", key: "status", width: 15 },
    { header: "Invoice Number", key: "invoiceNo", width: 18 },
    { header: "Date Created", key: "dateCreated", width: 22 },
    { header: "Date Updated", key: "dateUpdated", width: 22 },
    { header: "Event Time (MYT)", key: "eventTime", width: 18 },
    { header: "Menu Items", key: "menu", width: 30 },
    { header: "Notes", key: "notes", width: 26 },
  ];

function eventTime(order: ExportOrder, date: string | null): string {
  const explicit = toMalaysiaDateTime(date, order.time);
  if (explicit) return explicit.slice(11, 16);
  if (typeof order.dateTime !== 'string' || !/[Tt ]\d{1,2}:\d{2}/.test(order.dateTime)) return '-';
  const timestamp = toJSDate(order.dateTime);
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(timestamp);
}

/** Canonical data mapping for browser, APK and server exports. */
export function mapOrderExportRow(order: ExportOrder) {
  const date = getOrderEventDate(order);
  const total = Number(order.totalAmount ?? 0);
  return {
    orderId: order.id || '-',
    clientCompany: order.to || order.company || '-',
    department: order.department || order.division || order.attn || '-',
    contactName: order.name || order.customerName || order.attn || '-',
    contactEmail: order.email || order.customerEmail || '-',
    contactPhone: order.contact || order.phone || '-',
    eventDate: date || '-',
    venueAddress: order.location || '-',
    paxCount: order.quantity ?? order.pax ?? order.guests ?? 0,
    mealTypes: formatMealTypes(order.meals),
    prepType: formatPrepType(order.preparationType),
    unitPrices: formatUnitPrices(order),
    totalAmount: Number.isFinite(total) ? total : '-',
    status: (order.status || 'pending').toUpperCase(),
    invoiceNo: order.invoiceNo || '-',
    dateCreated: formatTimestamp(order.createdAt),
    dateUpdated: formatTimestamp(order.updatedAt || order.approvedAt || order.billedAt || order.createdAt),
    eventTime: eventTime(order, date),
    menu: order.menu || '-',
    notes: order.notes || '-',
  };
}

export async function generateOrdersWorkbook(orders: ExportOrder[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Restoran Wawasan Pak Usop";
  workbook.lastModifiedBy = "Admin System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Orders Export", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = columns.map(column => ({ ...column }));

  // Format header row (Bold, background color, centered)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "1E293B" }, // Navy / Charcoal
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  orders.forEach((order) => {
    const row = worksheet.addRow(mapOrderExportRow(order));

    // Format total amount cell with currency format
    const totalCell = row.getCell("totalAmount");
    totalCell.numFmt = '"RM "#,##0.00';
    totalCell.alignment = { horizontal: "right" };

    row.getCell("paxCount").alignment = { horizontal: "center" };
    row.getCell("status").alignment = { horizontal: "center" };
    row.getCell("invoiceNo").alignment = { horizontal: "center" };
  });

  return workbook;
}

/** Preserve the original 17-column CSV contract, using the same canonical mapping. */
export function generateOrdersCSV(orders: ExportOrder[]): string {
  const csvColumns = columns.slice(0, 17);
  const escapeCSV = (value: unknown) => {
    let str = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  };
  const rows = orders.map(order => {
    const row = mapOrderExportRow(order);
    return csvColumns.map(column => {
      const value = row[column.key as keyof typeof row];
      return escapeCSV(column.key === 'totalAmount' && typeof value === 'number' ? 'RM ' + value.toFixed(2) : value);
    }).join(',');
  });
  return '\uFEFF' + [csvColumns.map(column => escapeCSV(column.header)).join(','), ...rows].join('\n');
}
