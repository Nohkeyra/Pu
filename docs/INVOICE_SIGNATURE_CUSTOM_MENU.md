# Combined invoice signature and custom-menu cleanup

Compatible base: v1.3.195 (`4c70a2f`, checked against current upstream).
The earlier FAST PNG compression correction is retained.
Apply all ZIP files at the repository root, preserving the included paths.
No files require deletion. No dependency or environment changes are needed.

## Changes

- New combined invoices use the approved grouped table: order details, meal unit
  prices, meal subtotals, day total and a `TOTAL AMOUNT (RM)` row.
- Original generated “Pak Usop” calligraphy is placed at the lower right, above
  the existing account-information box. The same image is reused on exports;
  it does not change randomly between copies of an invoice.
- The signature is embedded once in `src/services/invoiceSignature.ts` so browser,
  backend and offline exports use the same image without another asset request.
- The redundant estimate card below the custom-menu textarea is removed.
  The custom-menu input, validation, navigation and separate order summary remain.

New batches are saved as layout version 3. Historical version 2 batches keep
their original format and saved page allocation; no saved record is migrated.
The planner reserves space for the signature before invoice numbers are allocated.
PDF download and email-preview routes recognize both versions.

Meal aliases are grouped under the matching column; existing additional meal
types remain represented. Missing unit prices display a dash. Saved row/page
totals remain authoritative. Notes are shown only when the existing option is
enabled, while the Notes header remains in the approved table.

## Verification

Regression tests cover column mapping, exact cents, missing prices, meal aliases,
multi-page output, repeated signature labels and historical version 2 rendering.
Browser fixtures exercise custom-menu entry and progression in light/dark themes
with local simulated services and external requests blocked. Generated sample
PDFs use fictional data, and their pages were rendered for visual inspection.

Local verification passed ESLint, both TypeScript projects, 449 coverage tests
across 48 files (also repeated on the CI's Node 22.23.4), 44 migration tests and
the production build. Both theme-specific
browser checks passed, including preservation of the custom request after moving
Next and Back. Existing timeout limits were retained.

The hosted
release and a physical Android device have not been checked for this change.
No push or deployment is performed by this package.
