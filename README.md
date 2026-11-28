# Wawasan — Final document template + PETRONAS code autofill

Integration handoff for `Nohkeyra/Pu` (React/Vite/TypeScript, Express, Firebase, Capacitor Android). This archive contains original reference assets, a tested standalone lookup, and implementation requirements. It is not a drop-in patch to all existing document generators; no repository commit or deployment has been made.

## Canonical assets
- `public/assets/invoices/Wawasan_Master_Individu_Refined_Final.pdf` and `public/assets/invoices/Wawasan_Master_Konsolidasi_Final_Border.pdf`: official version 4 invoice masters. See `docs/APPROVED_INVOICE_MASTERS.md`.
- `public/assets/invoices/Restoran_Wawasan_Template_Invois_Individu_Final.pdf`: historical individual and quotation master only. Retain for compatibility.
- `public/assets/invoices/Tandatangan_Asal_Restoran_Wawasan.png`: original signature asset, not AI-redrawn. The master already contains this signature; do not stamp it twice.
- `docs/List of Company Code for PETRONAS Entities.pdf`: owner-supplied source (135 listed entities; list numbering omits 41 and 45).
- `src/constants/petronasCompanyCodes.ts`: shared lookup, codes as four-character strings, strict matching with normalized legal names and registration-number conflict checking.

Receipts are prepared separately in ChatGPT on the owner's request, not generated inside the application. Completed deliveries retain invoices.

## Invoice rendering and verification
- New official individual numbers persist `invoiceLayoutVersion: 4`; new consolidated snapshots persist `layoutVersion: 4`. Existing records keep their original versions and numbers. Quotations keep the historical renderer.
- All final document previews, Web/Android downloads and email attachments use server PDF generation; consolidated review and commit use one normalized page planner. Do not regenerate issued historical layouts using the new master.
- Preserve strict PETRONAS legal-entity company code validation, verified SUBJECT, and explicit email collector eligibility; collector accepts only single individual invoices. See AGENTS.md for submission constraints.
- Run typecheck, lint, Vitest, build and PDF visual fixtures. Physical Android QA remains with the owner. Do not remove historical assets required by an existing renderer.

## Local check included
`tsc src/constants/petronasCompanyCodes.ts --target ES2020 --module commonjs --outDir /tmp/wawasan-code-check --strict --skipLibCheck`
`node tests/petronas-company-code-check.cjs /tmp/wawasan-code-check/petronasCompanyCodes.js`
Standalone check passed. App integration and app tests are not yet performed.
