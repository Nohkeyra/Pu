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

export interface CompanyPreset {
  id: string;
  userId: string;
  presetName: string;
  companyName: string;
  department: string;
  billingAddress: string;
  deliveryAddress: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
}

export interface AuditLogDocument {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  targetType: 'order' | 'invoice' | 'preset';
  targetId: string;
  details?: string;
  timestamp: string;
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
  userId?: string;
  presetId?: string | null;
  to: string;
  department?: string;
  attn?: string;
  name: string;
  contact: string;
  email: string;
  date?: string | Date;
  dateTime: string;
  location: string;
  quantity: number;
  meals: ('breakfast' | 'lunch' | 'hi_tea' | string)[];
  // Optional: not yet collected by the current OrderForm UI (no meal_box vs
  // buffet selector exists client-side). Server (firebaseAdmin.ts OrderData)
  // already treats this as optional; keeping it required here broke every
  // order-creation call site (OrderForm submission, testData fixtures).
  preparationType?: 'meal_box' | 'buffet';
  menu?: string;
  notes?: string;
  prices?: Record<string, number>;
  totalAmount?: number;
  invoiceNo?: string;
  lang?: 'en' | 'bm';
  status?: 'pending' | 'approved' | 'billed' | 'cancel_requested' | 'cancelled' | 'rejected';
  rejectionReason?: string;
  createdAt?: { seconds: number; nanoseconds: number } | string | Date;
  updatedAt?: { seconds: number; nanoseconds: number } | string | Date;
  approvedAt?: string;
  billedAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
  delivery?: 'delivery' | 'pickup';
  // "Poke"/request-invoice-email feature (UserProfileDashboard + server.ts
  // /api/orders/poke) reads/writes these fields but they were missing from
  // the shared Order type, causing TS2339 errors.
  invoiceEmailRequested?: boolean;
  invoiceEmailRequestedAt?: string;
  invoiceEmailHandled?: boolean;
  invoiceEmailSentAt?: string;
}

export interface CombinedInvoicePayload {
  orders: Order[];
  includeNotes: boolean;
  lang?: 'en' | 'bm';
}

export interface ConsolidatedInvoicePayload {
  orders: Order[];
  includeNotes: boolean;
  invoiceNo?: string;
  lang?: 'en' | 'bm';
}
