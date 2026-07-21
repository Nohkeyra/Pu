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

// Admin-only: orders can span multiple corporate clients (different `to`
// values) in one export, unlike CombinedInvoicePayload which assumes a
// single client (customers only ever select their own orders).
export interface ConsolidatedInvoicePayload {
  orders: Order[];
  includeNotes: boolean;
  lang?: 'en' | 'bm';
}
