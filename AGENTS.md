# AGENTS.md — Restoran Wawasan

## 1. Purpose & Operating Principle
Act as an evidence-driven project agent. Adapt to the actual project, task, stack, tools, and constraints.
Understand → Discover → Classify → Plan → Execute → Review → Verify → Diagnose/Repair → Re-verify → Quality Gate → Report.

Use fewer stages for trivial work and the full loop for complex/risky work. Never treat a plausible change as a verified result.

## 2. Project
- Stack: React/Vite + Express/Node.js + Capacitor (Android).
- Database/Auth: Firebase Firestore + Firebase Auth.
- Server: modular routes in `/server/routes`, binds to `0.0.0.0:3000`.
- Main directories: `/src`, `/server`, `/android`, `/scripts`, `/public`, `/docs`, `/e2e`.
- Package manager: `npm` only. Never generate `bun.lock`.
- Scripts: `dev`, `build`, `start`, `lint`, `test`.

## 3. Evidence & Discovery
Never assume framework, language, repository layout, package manager, database, auth, deployment platform, design system, test framework, build command, or runtime.
Inspect the project and relevant documentation first.

Classify conclusions:
- **CONFIRMED** — directly supported by inspected/observed/executed evidence.
- **INFERRED** — reasonable conclusion from evidence, not directly confirmed.
- **UNKNOWN** — insufficient evidence; do not guess.

Never claim to have inspected, executed, searched, tested, rendered, or verified something unless it actually happened. If evidence contradicts an earlier conclusion, update it.

## 4. Implementation
Before non-trivial changes:
1. Inspect relevant files/configuration.
2. Understand existing implementation and conventions.
3. Trace affected data/behavior flow.
4. Identify the actual requirement/root cause.
5. Make the smallest coherent change.
6. Avoid unrelated refactoring/dependencies.
7. Verify the result.

Preserve existing behavior outside the requested scope. Do not rewrite working systems merely because another approach is preferred.
Use available filesystem, shell, web/search, and other tools when they materially improve correctness.
Look before leaping: inspect existing configuration before adding tools/workflows.

## 5. Debugging
When something fails:
1. Establish the exact failure.
2. Reproduce when possible.
3. Localize it.
4. Form a testable hypothesis.
5. Identify the root cause.
6. Apply the smallest appropriate repair.
7. Re-run the failing check.
8. Check regressions.

Do not hide errors, suppress warnings, add arbitrary retries, or make random edits just to pass a check.

## 6. Automatic Capability Routing
Apply only capabilities relevant to the task, adding more when evidence requires them:
requirements • repository/architecture analysis • research • frontend/backend • API/data flow • database • UI/UX • accessibility/responsive design • debugging • security • performance • refactoring • testing • build/deployment • code review • QA • documentation • risk assessment.

## 7. UI/UX
Treat interface quality as first-class. Evaluate:
- hierarchy, composition, spacing, alignment
- typography, color/contrast
- component consistency
- responsive behavior and accessibility
- interaction states
- loading/empty/error/success states
- usability, visual fidelity, maintainability

Use supplied screenshots/reference designs as evidence. Do not sacrifice functionality, accessibility, performance, or maintainability for visual polish.

## 8. Security
For auth, authorization, user data, payments, secrets, APIs, databases, uploads/files, or privileged operations, inspect trust boundaries and server-side enforcement.
Check evidence for:
- unauthorized access / privilege escalation
- secret exposure
- injection / unsafe input
- data leakage
- insecure client/server trust
- unsafe file handling
- sensitive-data exposure

Do not invent vulnerabilities without evidence.

## 9. Project-Specific Mandatory Specs
Read the relevant specification **before** changing the associated area:
- Android builds/releases → `/docs/BUILD.md` + `/docs/CI_CD_COMPLETE.md`
- WhatsApp/Email/Calendar integrations → `/docs/AGENTS.md`
- Auth/Firebase/security-sensitive code → `/docs/SECURITY_SPEC.md`

Integration locations:
- WhatsApp → `/server/services/whatsappBusinessService.ts`; verify API signatures and message payloads.
- Email → `/server/emailService.ts`; templates must support BM locale and mobile responsiveness.
- Calendar → `/server/calendarService.ts`; handle Malaysian Standard Time (MYT) correctly.

## 10. Verification Gate
Before declaring completion, use the strongest applicable checks:
tests • type checks • lint • build • runtime • browser/UI • API • database • security • device checks.

Changing code alone is not verification.

Final status must be one of:
- **PASS** — completed and appropriately verified.
- **PARTIAL** — meaningful work completed, but scope remains.
- **BLOCKED** — a concrete limitation prevents completion/verification.
- **NOT VERIFIED** — implementation may exist, but required verification could not be performed.
- **FAILED** — attempted, but requested result was not achieved.

Never convert BLOCKED, NOT VERIFIED, or FAILED into PASS.

## 11. Scope & Communication
Respect explicit user scope and project conventions. Do not introduce speculative requirements or unrelated changes. If a directly relevant issue blocks the requested outcome, fix it or report it clearly.

For substantial work, briefly state objective, classification, complexity/risk, capabilities used, verification plan, and important assumptions.

Final report:
1. Inspected
2. Findings/root causes
3. Changed/produced
4. Verification performed
5. Exact result
6. Remaining risks
7. Unknowns/blocked checks

Be concise for simple work and appropriately detailed for complex work.

## 12. Completion Standard
The goal is not confident-sounding output. Produce the correct result, supported by evidence, with limitations stated honestly.

## 13. Solve, Don't Just Report
When a bug, failure, incomplete implementation, or directly relevant issue is found, fix or solve it when the tools and scope permit. Do not stop at diagnosis or recommendations unless the user explicitly requests analysis only. After each fix, re-verify the affected behavior and check for regressions. If blocked, state exactly why.

## 14. Prohibited Topics & Communication Restrictions
Strictly do not talk about, suggest, or discuss the following restricted topics in conversation, reports, plans, or communications:
- `payment`
- `staff`
- `kitchen`
- `preparation time`
- `delivery time`
- `table number`

Higher-priority system, developer, safety, platform, and explicit user instructions always override this file.

## 15. Standard Individual Invoice Specification (Individual Invoice SAHAJA)
**CRITICAL RULE**: The 2-page invoice layout specified below is strictly and exclusively for **Individual Invoices** (`generateServerInvoicePdf` in `/server/services/serverPdfService.ts` and `CustomerInvoicePreviewModal.tsx`). It must **NEVER** be applied to Consolidated Invoices (`generateServerConsolidatedInvoicePdf`), which has its own separate multi-order summary structure.

### Template Architecture & Design Specifications:
1. **Brand Logo**:
   - Asset path: `/assets/brand/apk_logo_clean.png` (transparent background, strictly without black background or black outline).
   - Server PDF dimensions & coordinates: `x=15, y=8, w=20, h=20`.

2. **Page 1 (Order Information, Items Table & Account Details)**:
   - **Header**:
     - Background: Pure clean white (`doc.setFillColor(255, 255, 255); doc.rect(0, 0, 210, 36, 'F')`).
     - Divider: Gold line (`#C2932D` / `RGB(194, 147, 45)`, width `0.4`, from `x=15` to `x=195` at `y=36`).
     - Brand Title: Gold (`#A67C1E` / `RGB(166, 124, 30)`), font size 15 bold at `x=39, y=16`.
     - Address: Charcoal (`#1A1816` / `RGB(26, 24, 22)`), font size 8.5 normal at `x=39`.
     - Document Title: Gold (`#A67C1E`), font size 22 bold, right-aligned at `x=195, y=20` (`INVOICE` / `INVOIS` or `QUOTATION` / `SEBUT HARGA`).
     - Document Date: Right-aligned at `x=195, y=27`.
   - **Metadata Cards** (`drawInvoiceBox` with `#FDFCFA` fill, `#C2932D` border, Gold `#A67C1E` label, Charcoal `#1A1816` text):
     - Row 1 (`y=40`): `NO. INVOIS / INVOICE NO.` (width 85), `TARIKH ACARA / EVENT DATE` (width 85).
     - Row 2 (`y=54`): `KEPADA / TO` (width 180, full width).
     - Row 3 (`y=68`): `LOKASI ACARA / EVENT LOCATION` (width 85), `JENIS HIDANGAN / MEAL FOR` (width 85).
     - Row 4 (`y=82`): `BILANGAN PAX / QUANTITY` (width 180, full width).
   - **Line Items Table** (`y=98`):
     - Table Header: `#725014` (Deep Royal Bronze-Gold / `RGB(114, 80, 20)`), white bold text for Description, Price / Pax (RM), Amount (RM).
     - Rows: Alternating `#FDFCFA` / `#FFFFFF` with warm subtle borders at `x=15`, `x=110`, `x=165`, `x=195`.
     - Description Column Content: Strictly populate with realistic, real-world catering data: Catering service type (e.g. Sarapan Pagi / Makan Tengah Hari / Minum Petang), itemized menu details/dishes, preparation type (e.g. Pek Makanan / Bufet), and pax count. Never omit or distort valid order menu data.
     - Grand Total Row: `#725014`, white bold text.
   - **Amount in Words**: Bilingual spelling (Ringgit Malaysia ... sahaja / Ringgit Malaysia ... only).
   - **Official Bank Account Details Box**:
     - Bank: Bank Muamalat Malaysia Berhad
     - Account Name: RESTORAN WAWASAN
     - Account Number: 16010000-405710
   - **Page 1 Footer**: Address note at `y=285` in warm stone `#877D73`.

3. **Page 2 (Person in Charge Details & Authorization)**:
   - **Header**: White background with gold divider line at `y=36`.
   - **Section Banner**: Unified `#725014` (Deep Royal Bronze-Gold) bar with white bold text `PERSON IN CHARGE DETAILS` (`y=42`).
   - **PIC Metadata Cards**:
     - Row 1 (`y=54`): `NAMA / NAME`, `NO. TELEFON / CONTACT NUMBER`.
     - Row 2 (`y=68`): `JABATAN / DEPARTMENT`, `ATTN`.
     - Row 3 (`y=82`): `E-MEL / EMAIL` (full width).
     - Row 4 (`y=96`): `NOTA / NOTES` (full width, height 25).
   - **Prepared By Section** (`y=135`):
     - `DISEDIAKAN OLEH / PREPARED BY` in gold `#A67C1E`.
     - `Restoran Wawasan` in bold charcoal.
     - Signature rule (`#C2932D` gold line, `x=15` to `x=85` at `y=157`).
   - **Page 2 Footer**:
     - `Terima kasih di atas kepercayaan anda | ON BEHALF OF RESTORAN WAWASAN`
     - Computer generated notice at `y=280` in warm stone `#877D73`.

## 16. Consolidated Invoice & Excel Master Template Specification (Invois Terkumpul)
**CRITICAL MANDATE**:
1. **Never Modify or Overwrite `/public/RW_Invoice_v3_Blank.xlsx`**:
   - The master Excel file `public/RW_Invoice_v3_Blank.xlsx` is the immutable corporate template. Under no circumstances should it be rewritten, overwritten, or modified.
2. **Consolidated Invoice Layout Alignment**:
   - All consolidated invoice generation (both Excel export via `exportOrdersAsExcelTemplate` and PDF generation via `generateServerConsolidatedInvoicePdf` / `consolidatedInvoiceService.ts`) must mirror the layout and column matrix defined in `RW_Invoice_v3_Blank.xlsx`:
     - **Metadata placement**: Client / Ministry (`C8`), Attn / Name (`C9`), Master Invoice No (`I8`), Event / Issue Date (`I9`).
     - **Itemized Matrix Grid** (Rows 15 to 24):
       - Column B: Date
       - Column C: Preparation / Meal Type (Meal Box / Buffet)
       - Column D: Quantity / Pax
       - Column E: Notes / Catatan
       - Column F: Menu Items
       - Column G: Breakfast price
       - Column H: Lunch price
       - Column I: Hi-Tea price
       - Column Total: Amount (RM)
     - **Strict Single-Client Rule**: Consolidated invoices group multiple events for a single corporate / ministry client; never mix multiple clients into one document.

