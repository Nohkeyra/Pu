import type { RiderSession } from './lib/riderTracking';
export interface NotificationSettings {
  orderStatus: boolean;
  billedUpdates: boolean;
  cancelApproval: boolean;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
  isDefault?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  contact: string;
  to: string;
  attn: string;
  department?: string;
  division?: string;
  initials?: string;
  initialIdentifier?: string;
  companyCode?: string;
  updatedAt?: string;
  notificationSettings?: NotificationSettings;
  notifyOrderStatus?: boolean;
  notifyBilledUpdates?: boolean;
  notifyCancelApproval?: boolean;
  savedLocations?: SavedLocation[];
}

export interface CompanyPreset {
  id: string;
  userId: string;
  presetName: string;
  companyName: string;
  department?: string;
  division?: string;
  initials?: string;
  initialIdentifier?: string;
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

export interface RiderLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
  active?: boolean;
  riderName?: string;
  riderPhone?: string;
  accuracy?: number;
  source?: 'gps';
  capturedAt?: string;
  sessionId?: string;
  sequence?: number;
}

export interface Order {
  id?: string;
  userId?: string;
  presetId?: string | null;
  billingAddress?: string;
  invoiceBatchNo?: string;
  consolidatedInvoiceNo?: string;
  to: string;
  department?: string;
  division?: string;
  initials?: string;
  initialIdentifier?: string;
  attn?: string;
  name: string;
  contact: string;
  phone?: string;
  email: string;
  date?: string | Date;
  dateTime: string;
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  quantity: number;
  meals: ('breakfast' | 'lunch' | 'hi_tea' | string)[];
  preparationType?: 'meal_box' | 'buffet';
  invoiceEmailRequested?: boolean;
  invoiceEmailHandled?: boolean;
  invoiceEmailSentAt?: string;
  menu?: string;
  notes?: string;
  time?: string;
  prices?: Record<string, number>;
  delivery?: unknown;
  deliveryCharge?: number;
  serviceChargeRate?: number;
  serviceChargeAmount?: number;
  totalAmount?: number;
  invoiceNo?: string;
  quoteNo?: string;
  orderId?: string;
  officialInvoiceNo?: string;
  invoiceLayoutVersion?: 4;
  companyCode?: string;
  collectorSubmittedAt?: string;
  lang?: 'en' | 'bm';
  status?:
    | 'pending'
    | 'approved'
    | 'billed'
    | 'in_transit'
    | 'cancel_requested'
    | 'cancelled'
    | 'rejected'
    | 'delivered'
    | 'completed';
  rejectionReason?: string;
  riderLocation?: RiderLocation;
  riderTrackingSession?: RiderSession;
  createdAt?: { seconds: number; nanoseconds: number } | string | Date;
  updatedAt?: { seconds: number; nanoseconds: number } | string | Date;
  approvedAt?: string;
  billedAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
  deletedByAdmin?: boolean;
  deletedByAdminAt?: { seconds: number; nanoseconds: number } | string | Date;
  deletedByUser?: boolean;
  deletedByUserAt?: { seconds: number; nanoseconds: number } | string | Date;
  eventDate?: string | Date;
  eventType?: string;
  guests?: number;
  dishes?: string[];
  company?: string;
}

export interface CombinedInvoicePayload {
  orders: Order[];
  includeNotes: boolean;
  lang?: 'en' | 'bm';
}

export interface AdminConflictNotification {
  id: string;
  type: 'pricing_conflict' | string;
  orderId: string;
  invoiceNo?: string | null;
  customerName?: string;
  submittedPrices?: Record<string, number>;
  clientTimestamp?: string | null;
  serverUpdatedAt?: string | null;
  reason?: string;
  dismissed?: boolean;
  createdAt?: string;
}
