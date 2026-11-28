# Approved invoice masters (2026-11-28)

These exact PDFs are the approved visual references:
- public/assets/invoices/Wawasan_Master_Individu_Refined_Final.pdf (A4 portrait)
- public/assets/invoices/Wawasan_Master_Konsolidasi_Final_Border.pdf (A4 landscape)

Do not change the approved artwork, Uncial Antiqua title, gold/brown palette, original signature, bank details, SSM or footer without approval. The master PDFs are visual references, not fixed-slot forms.

## Rendering contract
- Individual headers PERIHAL, HARGA / PAX (RM), JUMLAH (RM) centered, uppercase and bold; vertical dividers aligned with columns and amount cell in total bar.
- Consolidated grouped MAKLUMAT and HARGA / PAX (RM) headers; preserve approved column widths, borders and meal information. Never silently omit a valid meal or charge.
- Measure wrapped text with the actual rendering font before pagination; use the same measurement plan for drawing and for allocating consolidated invoice numbers. No fixed row count. Keep each order together whenever it fits a fresh page; handle oversize content explicitly, without clipping or silent truncation.
- Total bar directly follows final row; amount in words directly after **RINGGIT MALAYSIA :** on the same line, uppercase and bold. Handle exceptionally long values without overlap; do not truncate.
- Repeat recipient, table headers, signature, bank and footer on every consolidated page. Each newly issued consolidated page has a distinct persisted RWxxxxx number (five digits, no space or hyphen), and page-specific total; preserve historical numbers and saved issued records. Allocate numbers atomically with the shared individual invoice counter and reuse on retries.
- Individual continuation pages retain the original invoice identity; avoid duplicated charges. Keep bank/signature clear of dynamic content.
- Preview, download and email must use one authoritative rendering path; preserve quotation behavior and historical invoices.
- Regression gates: both approved designs, short/long menu and notes, long recipient/address/subject, page boundary, multi-page numbering, cents and amount-in-words accuracy, signature, email/download parity, existing invoice records, and typecheck/build/test.

## Individual PIC placement (owner-approved)
- Page 1 is the financial document; PIC name, telephone, department, ATTN, email and notes are on page 2. Financial continuation pages follow page 2 when needed, retaining the original invoice number. Oversized PIC notes can continue on additional pages.

## Migration status
Candidate individual layout version 4 is implemented behind an explicit order layout version; new issuance does not yet select it. Historical invoices and quotations retain their prior renderer. CI exports synthetic PDF samples for visual comparison. Candidate consolidated layout version 4 uses the approved eight column widths, original header/signature, shared preview/issuance page planner, and explicit rejection of oversize rows. Extra meals and charges are itemized in Menu without adding unapproved columns. Both candidates remain disabled for new issuance until runtime and visual verification; do not retire historical assets.
