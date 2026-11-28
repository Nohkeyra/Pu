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

## Migration status
Visual masters only in this change. Existing production renderers/assets remain until replacement is implemented and verified. Do not treat this commit as renderer migration.
