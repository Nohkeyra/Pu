# Technical Specification: Restoran Wawasan Catering & Invoicing Portal

## 1. Application Overview

Restoran Wawasan Catering Portal is an enterprise-grade corporate catering order management and invoicing system custom-engineered for Restoran Wawasan (established 1986, Menara PjH, Presint 2, Putrajaya). 

The platform serves two primary user bases:
1. **Corporate & Government Clients**: Enables departments from ministries and corporate entities (e.g., Petronas, Gas District Cooling, Menara PjH, Ministry offices) to submit detailed multi-meal catering requests, manage company presets, track real-time order statuses, and download official PDF invoices.
2. **Restaurant Administrators**: Provides restaurant management and staff with a central operations portal to review incoming requests, specify itemized unit pricing, approve orders, generate single and consolidated PDF invoices, send automated emails with attachments via Brevo SMTP, track audit logs, and export order data to Excel/CSV.

The application operates as a full-stack web app (Vite + Express server, hosted on Render/Cloud Run) with Firebase (Authentication & Firestore) for persistent storage, and is wrapped as a native Android APK via Capacitor with native background services (Android Home Screen Widget, Push Notifications, Haptic Feedback).

---

## 2. User Roles & Permissions

| Role | Access Scope | Key Permissions |
| :--- | :--- | :--- |
| **Corporate Client** | Client Portal (`/`, `/order`, `/profile`) | - Create, view, and cancel own catering requests.<br>- Save and reuse Company Profile Presets.<br>- Download official PDF invoices for own orders.<br>- View real-time status changes and receive email/push updates. |
| **Restaurant Admin** | Admin Dashboard (`/admin`) | - Full read/write access to all orders across all companies.<br>- Set unit pricing per meal type and auto-calculate totals.<br>- Assign/manage sequential invoice numbers (`RW####`).<br>- Approve, Bill, Reject, or Cancel orders.<br>- Generate single & consolidated multi-page PDF invoices.<br>- Send Brevo SMTP invoice emails with PDF attachments.<br>- Export orders to Excel (`.xlsx`) & CSV (`.csv`).<br>- View system-wide diagnostics & audit logs. |

---

## 3. Complete Feature List

### A. Corporate Client Features
1. **Catering Request Submission**:
   - Event Date & Delivery Location selection.
   - Pax count input (minimum 1 pax).
   - Multi-meal selection per event (e.g., Breakfast + Lunch + Hi-Tea).
   - Menu package selection or custom dish notes.
   - Contact Person details (Name, Phone, Email, Attention line).
2. **Company Preset Profiles**:
   - Store company name, department, billing address, delivery address, contact name, contact phone, and email.
   - One-click auto-fill during new order creation.
3. **Order Lifecycle Tracking**:
   - Real-time status badges: `Pending Review` (Menunggu), `Approved/Priced` (Diluluskan), `Billed` (Dibilkan), `Cancel Requested`, `Cancelled` (Dibatalkan), `Rejected` (Ditolak).
   - Request cancellation before invoicing.
4. **Bilingual UI Toggle**:
   - Instant toggle between Bahasa Melayu (BM) and English (EN) across all forms, tables, badges, and generated PDFs.
5. **Invoice Access**:
   - Live PDF preview and direct download of generated official invoices.

### B. Restaurant Admin Features
1. **Admin Orders Management Dashboard**:
   - Comprehensive filterable datatable with status tabs, client search, date filters, and client company dropdown.
   - Quick bulk actions and single-click order inspection.
2. **Itemized Unit Pricing Engine**:
   - Admin enters unit prices (RM) per selected meal type.
   - Real-time subtotal calculation (`unitPrice * pax`) and order grand total computation.
3. **Sequential Invoice Counter & Assignment**:
   - Auto-assigned or manually assigned unique `RW####` invoice numbers.
   - Guarantees strict uniqueness and prevents duplicate invoice numbers.
4. **Official PDF Invoice Generator**:
   - Generates vector-sharp PDF invoices with Batik decorative header, restaurant details, client details, itemized table, total in Malay/English words, bank transfer details, and computer-generated disclaimer.
5. **Consolidated Multi-Page Invoice Engine**:
   - Batch-select multiple orders belonging to a **single client company**.
   - Generates a multi-page PDF where each page/order is treated as its own invoice with a page-specific invoice number (`RW####`) and page total.
   - Final summary page lists all page invoice numbers, page totals, and a reference-only combined grand total.
6. **Brevo SMTP Email Dispatcher**:
   - Direct manual or automated email delivery of generated invoice PDFs to client emails with dynamic email bodies and base64 PDF attachments.
7. **Data Export Suite**:
   - Export filtered dataset to `.xlsx` (Excel) and `.csv` format.

### C. Mobile & Native Android Capabilities (Capacitor)
1. **Native Android APK Wrapper**: Capacitor bridge for Android execution.
2. **Push Notifications**: Firebase Cloud Messaging (FCM) notifications for status updates.
3. **Haptic Engine**: Haptic feedback on button presses and submission confirmations.
4. **Offline Handling**: Local storage fallback with network status monitoring.
5. **Android Home Screen Widget**: Custom Java/Kotlin widget (`WawasanWidgetProvider`) displaying upcoming catering deliveries on the user's Android launcher.

---

## 4. Detailed Business Logic & Workflows

### Workflow 1: Client Order Creation
1. Client logs in or selects a saved **Company Preset**.
2. Client selects event date, delivery address, pax count, and checks required meal types (e.g. Breakfast, Lunch).
3. Client inputs dish notes or menu selection and submits.
4. Backend writes document to Firestore `orders` collection with initial `status: "pending"`, creating an audit log entry.
5. Admin dashboard receives real-time update.

### Workflow 2: Admin Pricing & Approval
1. Admin opens order detail modal for a `pending` order.
2. Admin specifies per-meal unit prices (e.g., Breakfast RM 8.00, Lunch RM 22.00).
3. System calculates total amount: `sum(mealUnitPrice * pax)`.
4. Admin clicks **Approve / Generate Invoice**:
   - System checks if `invoiceNo` exists; if null, fetches next sequential counter from Firestore (`RW` + 4-digit number e.g. `RW0014`) and updates `invoiceCounter`.
   - Order document is updated with `status: "approved"`, `prices`, `totalAmount`, `invoiceNo`, and `approvedAt`.
   - Invoice PDF is generated.
   - Backend `/api/submissions/bill` endpoint is called to dispatch Brevo SMTP email with attached PDF and update status to `billed`.

### Workflow 3: Consolidated Invoice Generation
1. Admin uses Client filter to narrow orders to a single client company (e.g., Gas District Cooling).
2. Admin selects multiple orders using table checkboxes. System validates that all selected orders belong to the exact same client (`to`).
3. Admin clicks **Consolidated Invoice**:
   - System passes payload to `generateConsolidatedInvoicePDF`.
   - Page 1 to N: Renders each order as an itemized invoice page with a fresh random/assigned invoice number (`RW####`) and page total.
   - Final Page: Administrative summary page listing Page numbers, Invoice Numbers, Page Totals, and Combined Reference Total.
4. Admin previews or downloads the multi-page PDF.

---

## 5. Database Schema (Firestore)

### Collection: `orders`
```typescript
interface OrderDocument {
  id: string; // Document ID
  to: string; // Company / Client Name (e.g., "GAS DISTRICT COOLING")
  attn?: string; // Attention person
  name: string; // Contact Person Name
  contact: string; // Phone number
  email: string; // Client email address
  dateTime: string; // ISO date string of event
  location: string; // Delivery venue / address
  quantity: number; // Pax count
  meals: ('breakfast' | 'lunch' | 'tea_break' | 'hi_tea' | 'dinner')[];
  menu?: string; // Selected menu or package notes
  notes?: string; // Special instructions
  prices?: Record<string, number>; // Meal unit prices e.g. { breakfast: 8, lunch: 22 }
  totalAmount?: number; // Calculated grand total in RM
  invoiceNo?: string; // e.g. "RW0012"
  status: 'pending' | 'approved' | 'billed' | 'cancel_requested' | 'cancelled' | 'rejected';
  lang?: 'en' | 'bm';
  createdAt: string | Date;
  updatedAt?: string | Date;
  approvedAt?: string;
  billedAt?: string;
}
```

### Collection: `companies`
```typescript
interface CompanyDocument {
  id: string;
  name: string;
  department?: string;
  billingAddress: string;
  deliveryAddress: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
}
```

### Collection: `meta` / Document: `invoiceCounter`
```typescript
interface InvoiceCounterDocument {
  current: number; // e.g., 14 -> Next invoice will be RW0015
  updatedAt: string;
}
```

---

## 6. API Endpoints & Backend Architecture

The application utilizes an Express backend (`server.ts`) running on port 3000:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check | No |
| `GET` | `/api/admin/orders` | Fetch all orders for admin panel | Yes (Admin token) |
| `POST` | `/api/admin/orders` | Create or update order pricing / status / invoice numbers | Yes (Admin token) |
| `POST` | `/api/submissions/bill` | Triggers billing update and dispatches Brevo SMTP email with PDF attachment | Yes (Admin token) |
| `POST` | `/api/send-invoice` | Low-level email endpoint for sending invoice PDFs via Brevo | Yes |
| `GET` | `/api/widget/upcoming` | JSON endpoint for Android Home Screen Widget fetching upcoming deliveries | No |

---

## 7. Third-Party Integrations

1. **Firebase Firestore & Auth**: Persistent database for orders, company presets, counters, and admin authentication.
2. **Brevo (formerly Sendinblue) SMTP**: Transactional email API for delivering official invoice PDFs directly to client inbox (`process.env.BREVO_API_KEY` or SMTP credentials).
3. **jsPDF**: Client-side vector PDF generation library for instant invoice compilation without external rendering dependencies.
4. **Capacitor Android**:
   - `@capacitor/filesystem`: Local PDF saving on mobile devices.
   - `@capacitor/haptics`: Tactical touch feedback.
   - Native Java `WawasanWidgetProvider`: Android AppWidget engine.

---

## 8. PDF Invoice Generation Logic

### Invoice PDF Structure (A4 Portrait)
1. **Header Banner**: Top Batik-pattern background artwork (38mm height) overlaying restaurant identity.
2. **Header Text**: Left: "RESTORAN WAWASAN", Menara PjH, Presint 2, Putrajaya, Est. 1986. Right: "INVOICE", Date, Invoice No (`RW####`).
3. **Bill To Box**: Cream-accented box (`KEPADA / TO`) displaying company name, attention line, department, and address.
4. **Itemized Matrix Table**:
   - Left section: Order details (Date, Qty/Pax, Menu/Notes).
   - Right section: Price Per Unit per meal type (Breakfast, Lunch, etc.) and total column.
5. **Totals & Amount in Words**:
   - Numerical Grand Total.
   - Grand Total in words spelled out in Malay or English using `numberToWordsBM` utility (e.g., "RINGGIT MALAYSIA SERIBU DUA RATUS SAHAJA").
6. **Payment & Bank Account Box**:
   - Account Holder: RESTORAN WAWASAN
   - Bank: BANK MUAMALAT
   - Account No: 16010000-405710
7. **Footer**: Gold divider line, restaurant details, and computer-generated document disclaimer.

---

## 9. Email Notification System

### Invoice Email Delivery
- **Sender**: `Restoran Wawasan <noreply@wawasanpakusop.com>`
- **Recipient**: Client contact email from order record
- **Subject**: `Invois Rasmi RW#### - Restoran Wawasan Putrajaya`
- **Body**: Custom HTML template with order recap, delivery location, event date, total amount, bank payment details, and attachment notice.
- **Attachment**: Base64 encoded PDF file (`Invois_RW####.pdf`).

---

## 10. Native Mobile & Android Capabilities

- **App Package**: `com.wawasanpakusop.app`
- **Widget Service**: `WidgetRemoteViewsService.java` & `WawasanWidgetProvider.java`
- **Widget Res**: `widget_upcoming_orders.xml` displaying upcoming deliveries directly on the Android home screen.
- **Deep Linking**: Configured in `AndroidManifest.xml` for `https://wawasanpakusop.com` links.

---

## 11. Validation Rules & Edge Cases

1. **Single-Client Rule for Consolidated Invoices**: Consolidated multi-page invoices are strictly per-client documents. The UI and `generateConsolidatedInvoicePDF` service validate that all selected orders belong to the exact same client (`to`); attempting to merge different clients throws a clear error toast.
2. **Sequential Counter Integrity**: Invoice numbers follow `RW` + 4 digits (`RW0001` to `RW9999`).
3. **Bilingual Text Wrapping**: All table cells in generated PDFs auto-calculate line heights using `doc.splitTextToSize` to prevent text truncation across any screen width or PDF page.
4. **Transparent Logo Masking**: The PDF generator automatically strips pure white backgrounds from the logo image, allowing the emblem to sit seamlessly atop the batik header banner.
