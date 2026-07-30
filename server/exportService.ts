import ExcelJS from "exceljs";
import type { OrderData } from "./firebaseAdmin.js";

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

export function formatUnitPrices(order: OrderData): string {
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
  if (!ts) return "-";
  if (typeof ts === "string") return ts;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "object" && ts !== null && "seconds" in ts) {
    const sec = (ts as { seconds: number }).seconds;
    return new Date(sec * 1000).toISOString();
  }
  return String(ts);
}

export async function generateOrdersWorkbook(orders: OrderData[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Restoran Wawasan Pak Usop";
  workbook.lastModifiedBy = "Admin System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Orders Export", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
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
  ];

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
    const row = worksheet.addRow({
      orderId: order.id || "-",
      clientCompany: order.to || "-",
      department: order.department || order.attn || "-",
      contactName: order.name || "-",
      contactEmail: order.email || order.customerEmail || "-",
      contactPhone: order.contact || "-",
      eventDate: order.date || (order.dateTime ? String(order.dateTime).split("T")[0] : "-"),
      venueAddress: order.location || "-",
      paxCount: order.quantity || order.pax || 0,
      mealTypes: formatMealTypes(order.meals),
      prepType: formatPrepType(order.preparationType),
      unitPrices: formatUnitPrices(order),
      totalAmount: typeof order.totalAmount === "number" ? order.totalAmount : Number(order.totalAmount || 0),
      status: (order.status || "pending").toUpperCase(),
      invoiceNo: order.invoiceNo || "-",
      dateCreated: formatTimestamp(order.createdAt),
      dateUpdated: formatTimestamp(order.updatedAt || order.approvedAt || order.billedAt || order.createdAt),
    });

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

export function generateOrdersCSV(orders: OrderData[]): string {
  const headers = [
    "Order ID",
    "Client Company",
    "Department",
    "Contact Name",
    "Contact Email",
    "Contact Phone",
    "Event Date",
    "Venue/Address",
    "Pax Count",
    "Meal Types",
    "Preparation Type",
    "Unit Prices",
    "Total Amount",
    "Status",
    "Invoice Number",
    "Date Created",
    "Date Updated",
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = orders.map((order) => [
    escapeCSV(order.id || "-"),
    escapeCSV(order.to || "-"),
    escapeCSV(order.department || order.attn || "-"),
    escapeCSV(order.name || "-"),
    escapeCSV(order.email || order.customerEmail || "-"),
    escapeCSV(order.contact || "-"),
    escapeCSV(order.date || (order.dateTime ? String(order.dateTime).split("T")[0] : "-")),
    escapeCSV(order.location || "-"),
    escapeCSV(order.quantity || order.pax || 0),
    escapeCSV(formatMealTypes(order.meals)),
    escapeCSV(formatPrepType(order.preparationType)),
    escapeCSV(formatUnitPrices(order)),
    escapeCSV(typeof order.totalAmount === "number" ? `RM ${order.totalAmount.toFixed(2)}` : (order.totalAmount ? `RM ${Number(order.totalAmount).toFixed(2)}` : "RM 0.00")),
    escapeCSV((order.status || "pending").toUpperCase()),
    escapeCSV(order.invoiceNo || "-"),
    escapeCSV(formatTimestamp(order.createdAt)),
    escapeCSV(formatTimestamp(order.updatedAt || order.approvedAt || order.billedAt || order.createdAt)),
  ]);

  // Include UTF-8 BOM
  const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows.map((r) => r.join(","))].join("\n");
  return csvContent;
}
