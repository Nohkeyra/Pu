# UI/UX audit fixes — Wawasan 1.3.157

Base: `50a3aac28176bf86aa5a15c9812aec80bda520bf` (1.3.157) in `Nohkeyra/Pu`.
The audit started at 1.3.156; intervening upstream changes were compared and preserved.
Apply the ZIP paths at the repository root, preserving the directory structure.
The protected brand-font instruction is already present in the latest AGENTS.md; this patch preserves it.

## Corrected behavior

- A shared status presentation now covers the order statuses in both BM and EN,
  including cancellation requests and completed orders. It is used by profile,
  admin orders, mobile admin records, desktop status selectors and calendar
  cards/dialogs. Unknown future statuses have a neutral label, not a false
  pending label. Stored statuses and permitted actions are unchanged.
- The desktop record selector retains its actual value when the current status
  is outside the four editable options. Labels and badge colors share the same
  metadata. This does not add new status transitions.
- The profile distinguishes failed order reads from genuinely empty history.
  It exposes Retry, keeps already-loaded records after an error, and resets the
  error after recovery. Retried/changed listeners are cleaned up, and stale
  callbacks cannot replace the current records. The original auth and data
  sources remain in use.
- Custom accent HEX values are converted to HSL channel values for --ring and
  --primary. Shared primary buttons and the affected Settings dialog buttons
  use a foreground chosen for contrast. Hover/press colors also retain a
  readable foreground. Malformed persisted colors receive a safe fallback.
- Existing surface/text/border aliases now resolve to the app's canonical HSL
  theme tokens. Brand colors and artwork are retained.
- Login's explanatory text and account prompt now follow BM/EN selection.
- The missing pull-to-refresh artwork is replaced by the existing Wawasan
  loader. Splash layout and motion are unchanged.
- Saved review excerpts retain their original text, author and source labels.
  Stale relative dates, the fixed aggregate 4.9 rating and the unverified
  "Verified Google Local Guide" label are removed. The section explicitly
  identifies the material as saved excerpts, not a live feed or current rating.
- The same original font families are hosted locally: **Uncial Antiqua** for
  protected branding, Outfit and Plus Jakarta Sans for existing UI. Official
  font files total about 136 KB, with their OFL licenses included. This improves
  offline reliability without substituting a new brand typeface. The files
  come from Google Fonts; licenses come from google/fonts/ofl on GitHub.

## Validation and limits

Regression tests cover all known status labels in both languages, unknown/legacy
statuses, accessible foreground selection and valid HSL channels. Browser checks
use the actual edited React components with isolated simulated services to
exercise failed reads, Retry, retained records, stale callbacks, true empty
history, and status display/current selection in mobile and desktop admin views.
No live account or production record is accessed by those fixtures.

The production build is also checked in a local browser with external requests
blocked. Checks cover local font loading, the original brand font family,
canonical theme surfaces, valid focus colors, Login language, review disclosure,
and Settings button contrast in light/dark themes with terracotta, gold and
mid-grey accents. The previously affected default button measures about 6.99:1
in its normal state (previously about 1.55:1).

Lint, 265 tests across 27 test files, the production build and the frontend TypeScript project passed. Browser checks passed for profile error/retry recovery, four admin table width/language combinations, and six theme/accent combinations. The
separate Node/server TypeScript project exceeded its available heap; that full
check is not claimed as passed. This patch does not change server source.
Physical Android rendering, native integrations and live backend behavior are
not verified by the browser fixtures.

The patch does not replace landing/menu images, logo artwork, splash artwork,
brand typography or navigation routes. A broader page-header redesign is not
part of this bug-fix package; existing layouts are retained.

## Follow-up improvements — 15 November 2026

Base: `ade0ac9852fc12c76a32b3e0a481bd309d6273f0` (1.3.217).

- Restored progress is bounded by the fields still present in the draft. A
  restored review with missing contact details returns to Details, preserving
  event/menu choices. Existing personal-field storage exclusions remain. Saved
  messaging explains that event/menu choices are retained; the help disclosure
  explains contact re-entry and retains Clear draft and Demo. Final submission
  reuses the existing detail validator before continuing through the existing
  account and submission flow.
- Menu failures and server responses marked `isDefault` disclose the built-in
  catalogue and offer Retry. A successful empty catalogue remains empty. Retry
  invalidates the existing request cache, retains choices, and identifies saved
  choices that are absent/unavailable in the refreshed catalogue. Existing
  custom-menu requests remain available.
- Event, serving-style and fulfilment radio cards use one tab stop per group
  and support arrow/Home/End keys. Step 1 errors describe the corresponding
  groups and focus the first invalid control. Step 3 focus recovery also works
  when returning from final review.
- Malay keeps the existing internal BM preference but exposes `ms-MY` to the
  browser. The analytics switch and main navigation have localized names.
- Text/action pairings were adjusted in menu categories, inline errors, saved
  review labels, the sign-in chip, fulfilment descriptions and the green
  catering/support surfaces. The dark error ink is a brighter blend of the
  same approved brand swatches.
- Narrow web screens use a compact version of the existing order illustration.
  The APK composition remains compact. The five navigation destinations retain
  visible labels, adequate label space, at least 48px tab targets, horizontal
  safe-area clearance and content-led height for larger text. Keyboard-driven
  navigation hiding and sticky preview behavior are retained.
- Landing dish actions are labeled as starting a general catering draft rather
  than implying that a particular dish has already been selected. Existing
  drafts and catalogue IDs are unchanged.

No assets, protected wordmark styling, route definitions, database rules, native
permissions, Android build configuration or dependency versions are changed.

Regression coverage is in `e2e/uiux-preservation.spec.ts` and the existing contact
validation tests. The two older dish-selection fixtures now return an explicit
local catalogue; an empty menu response is no longer used as an implicit fixture.
Browser tests use simulated responses and a native CSS presentation marker.
They cover themes, BM/EN, compact/phone/landscape layouts, text enlargement,
keyboard clearance, safe-area insets and preservation of existing controls.
They do not establish physical Android WebView or live-service behavior.

Validation completed for this follow-up: lint; 473 unit tests in 50 files;
frontend TypeScript; production build; visual/source structure checks; 56 main
browser tests and four final APK-layout checks (two repeat enlarged-text cases).
The ten sampled light/dark page and error/menu states returned no violations
for the selected automated WCAG A/AA rules after the targeted corrections.
This is not a full accessibility certification or a physical APK test.

## Reconciled with GitHub 1.3.218

Current package base: `ec36b866944c9fc43c6836e69c8823b5cc08c710` (1.3.218,
Android release 350), including the two commits pushed after the original audit
base. Use the cumulative ZIP in place of the earlier package and extract its
entries at the root of the current 1.3.218 checkout. Every original package path
is included as a complete current file.

Three files overlap the incoming changes: `OrderForm.tsx`,
`Step2DishSelection.tsx`, and `customer-pages.css`. Their latest compact dish
cards, menu heading/search/filter classes, order-note layout, selection count,
illustration and mobile/desktop placement are preserved alongside the audit
fixes. Menu filters retain 48px targets. Selected dish labels in the expanded
summary now use readable theme ink over their existing tinted badge surface.

The latest nonblocking invoice-email flow, per-submission key, offline-storage
failure feedback, scrollable native welcome, logo asset, skip-link focus and
release/version files are preserved. Fourteen incoming files remain byte-for-
byte equal to this GitHub base; only the three overlapping files are merged.

Validation on the combined source: lint, 474 unit tests in 50 files, frontend
TypeScript, production build, visual/source structure checks, and 39 browser
tests passed. The two incoming-menu cases were rerun after the selected-label
contrast adjustment and passed, including a 4.5:1 minimum contrast assertion.
The browser checks use simulated services and native presentation markers;
physical Android and live account/submission services remain unverified.
