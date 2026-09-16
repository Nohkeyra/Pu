# Invoice Specifications

Read before modifying any invoice-related code.

---

## Individual Invoice Spec

**CRITICAL RULE:** The 2-page layout below is strictly and exclusively for **Individual
Invoices** (`generateServerInvoicePdf` in `/server/services/serverPdfService.ts` and
`CustomerInvoicePreviewModal.tsx`). It must **NEVER** be applied to **Consolidated
Invoices** (`generateServerConsolidatedInvoicePdf`), which has its own separate
multi-order summary structure (see below).

### Template architecture

**1. Brand logo**
- Asset path: `/assets/brand/apk_logo_clean.png`
  (transparent background, strictly without black background or black outline)
- Server PDF dimensions & coordinates: `x=15, y=8, w=20, h=20`

**2. Page 1 — Order Information, Items Table & Account Details**
- Header: pure white; gold divider `#C2932D`; brand title `#A67C1E`;
  charcoal `#1A1816`; document title `#A67C1E`
- Metadata cards at rows `y=40`, `54`, `68`, `82` with the specified bilingual
  labels and widths
- Line-items table at `y=98`, header `#725014`, alternating warm rows, with
  Description, Price / Pax (RM), Amount (RM)
- Description must use realistic catering data: service type, menu details,
  preparation type, and pax count
- Grand Total row uses `#725014` with white bold text
- Amount in words is bilingual
- Official account details:
  - Bank: **Bank Muamalat Malaysia Berhad**
  - Account Name: **RESTORAN WAWASAN**
  - Account Number: **16010000-405710**
- Footer address note at `y=285`

**3. Page 2**
- Header white with gold divider at `y=36`
- `#725014` section banner: `PERSON IN CHARGE DETAILS`
- PIC cards at `y=54`, `68`, `82`, `96`
- Prepared By at `y=135`, signature rule at `y=157`
- Footer: `Terima kasih di atas kepercayaan anda | ON BEHALF OF RESTORAN WAWASAN`
- Computer-generated notice at `y=280`

---

## Consolidated Invoice & Excel Master Spec

**CRITICAL MANDATE:**

1. **Never modify or overwrite** `/public/RW_Invoice_v3_Blank.xlsx`. It is the
   immutable corporate template.

2. Consolidated invoice generation (`exportOrdersAsExcelTemplate`,
   `generateServerConsolidatedInvoicePdf`, and `consolidatedInvoiceService.ts`) must
   mirror the layout and column matrix of that template:

   - Metadata: Client / Ministry (`C8`), Attn / Name (`C9`),
     Master Invoice No (`I8`), Event / Issue Date (`I9`)
   - Matrix rows 15–24:
     - B: Date
     - C: Preparation / Meal Type
     - D: Quantity / Pax
     - E: Notes / Catatan
     - F: Menu Items
     - G: Breakfast price
     - H: Lunch price
     - I: Hi-Tea price
     - Total: Amount (RM)
   - **Strict single-client rule**: multiple events for one corporate/ministry
     client only; never mix clients.