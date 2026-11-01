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
