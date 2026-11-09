# CI PDF timeout correction

Base: v1.3.193 (`060286357430f26f312f20befaeadbbc959051cc`).
The supplied logs are from `465c24daf8b1be8c1e38dc0078987563065b9266`;
the affected renderer, tests and CI workflow are identical between these commits.

## Findings

- Confirmed: the uploaded CI run failed three PDF tests at the default 5-second
  limit. The build job depends on those tests. Lint/typecheck, dependency audit,
  Trivy and CodeQL completed successfully in those logs.
- Confirmed: saved invoices enable document compression. With no explicit PNG
  compression argument, jsPDF selects `SLOW` for the 1024 × 1024 logo. This costs
  substantial CPU during rendering, especially with coverage enabled.
- Local controls did not reproduce a timeout. However, the same three covered
  tests took approximately 3.4–3.7 seconds before correction, leaving little
  headroom for differences in runner load. The uploaded logs directly establish
  the timeout; local profiling identifies the avoidable rendering work.
- The logs also identify deprecated Node 20 action runtimes and CodeQL Action v3.

## Changes

`src/services/invoiceBatchPdf.ts` explicitly uses lossless PNG compression
`FAST` for the existing logo. The existing content and pagination checks remain
active. Test deadlines and test data are retained.

`.github/workflows/ci.yml` moves checkout/setup-node to v6 and CodeQL to v4.
Their official action manifests use Node 24. The app continues to use Node 22;
job commands, permissions, conditions and dependencies are retained.

Official manifests checked:

- https://github.com/actions/checkout/blob/v6/action.yml
- https://github.com/actions/setup-node/blob/v6/action.yml
- https://github.com/github/codeql-action/blob/v4/init/action.yml
- https://github.com/github/codeql-action/blob/v4/analyze/action.yml

## Verification

- ESLint; both frontend/server TypeScript projects; production build.
- Full coverage suite: 445 tests across 47 files, including a complete run on
  Node 22.23.4, the exact version in the uploaded CI logs. Migration scripts:
  44 tests.
- The 23 focused PDF/authorization tests passed with coverage. The three affected
  cases dropped from 3,461 / 3,390 / 3,697 ms to 423 / 396 / 734 ms in the local
  Node 24 comparison. These timings describe this environment, not a guarantee
  for every host.
- On Node 22.23.4, the pre-fix control took 3,354 / 3,473 / 3,520 ms for those
  cases. The corrected full-suite run took 485 / 440 / 736 ms, with the original
  5-second deadlines.
- A complete dummy saved invoice rendered in about 368 ms before and 92 ms after
  in a warmed backend bundle. Size fell from 610,596 to 604,401 bytes.
- Before/after PDF text is identical. Rasterizing the sample at 150 DPI produced
  identical 1754 × 1241 pixel pages, confirming lossless visual output.
- Workflow YAML parses, and a structural comparison confirms only action refs
  changed. The remote GitHub Actions workflow itself has not been rerun here.

Apply the ZIP paths at the repository root. No files need deletion. No version,
dependency lockfile, production data or deployment changes are included.
