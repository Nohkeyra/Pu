export interface NotificationSettings {
  orderStatus: boolean;
  billedUpdates: boolean;
  cancelApproval: boolean;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
}

export interface UserProfile {
  name: string;
  email: string;
  contact: string;
  to: string;
  attn: string;
  updatedAt?: string;
  notificationSettings?: NotificationSettings;
  savedLocations?: SavedLocation[];
}

export interface ExportColumnOptions {
  date: boolean;
  invoiceNo: boolean;
  client: boolean;
  contact: boolean;
  emailPhone: boolean;
  location: boolean;
  pax: boolean;
  meals: boolean;
  menu: boolean;
  totalAmount: boolean;
  status: boolean;
  notes: boolean;
}

export interface Order {
  id?: string;
  to: string;
  attn?: string;
  name: string;
  contact: string;
  email: string;
  date?: string | Date;
  dateTime: string;
  location: string;
  quantity: number;
  meals: string[];
  menu?: string;
  notes?: string;
  prices?: Record<string, number>;
  totalAmount?: number;
  invoiceNo?: string;
  lang?: 'en' | 'bm';
  status?: string;
  createdAt?: { seconds: number; nanoseconds: number } | string | Date;
  userId?: string;
}

export interface CombinedInvoicePayload {
  orders: Order[];
  includeNotes: boolean;
  lang?: 'en' | 'bm';
}

// Admin-only: consolidates MULTIPLE ORDERS from a SINGLE client into one
// multi-page export (e.g. every meeting order for Gas District Cooling in a
// given month), matching how real invoices work — one client per invoice.
// All orders passed in must belong to the same client (`to`);
// generateConsolidatedInvoicePDF validates this and throws if orders from
// more than one client are passed in. Each resulting page gets its own
// fresh random invoice number generated internally (not supplied here) and
// its own separate total, since each page is treated as its own invoice.
export interface ConsolidatedInvoicePayload {
  orders: Order[];
  includeNotes: boolean;
  lang?: 'en' | 'bm';
}
