# Batik header refinement

Base: v1.3.192, commit `0e4254c239ee4fc3698ba73e3ee74a5ae016b51f`.

Apply the changed files at the repository root, retaining their original paths.
No files need deletion. No dependency or environment changes are required.

## Visual scope

- Admin section headings; the order progress widget and four wizard headings.
- Calendar month controls and the selected-date agenda heading.
- Member dashboard welcome widget, profile summary and all four profile tabs.
- Profile sign-in introduction and Settings section headings.

The shared `.batik-header` decoration belongs to the existing
`components/ui/presentation.css`. Feature owners retain their layout rules.
The existing horizontal floral artwork, `public/assets/heritage/batik_pattern.jpg`,
is used as a luminance mask: the dark cloth backing becomes transparent and the
flowers blend with the theme. Light mode uses the action color; dark mode uses
the existing gold token. A faded reading zone protects the text. Header paragraph
colors are strengthened where needed. No new asset is required.

Rendered contrast checks also exposed an existing dark-mode issue in the details
and review headings: the legacy charcoal alias resolved to light ink, producing
a pale header under white text. Both headers now use the customer's semantic
surface, text and border colors in both themes.

The decoration has no pointer events or animation. Low selector specificity
preserves the order progress widget's sticky positioning. Existing click,
keyboard, form, account and data handlers are retained.

## Verification and limits

Local checks cover ESLint, 445 unit tests, the frontend TypeScript project,
production build, visual/source architecture checks and 35 existing browser tests.
Browser flows exercise calendar navigation and recovery, date-to-form navigation,
all four order steps through review, header dialogs, focus restoration and the
responsive preview widget.

The final browser rerun passed 33 cases; two reload-heavy cases exceeded the
30-second limit under parallel load and both passed when rerun serially.
The production frontend was then served locally and checked on four guest
screens in both themes, including asset loading and sticky progress positioning.

A separate local visual matrix covers seven screens at 320, 360, 390, 768 and
1024 px, in both themes and with/without the native presentation marker:
140 screen/size/presentation combinations with no horizontal document overflow.
All four member tabs are also exercised; the additional profile tabs are checked
with 22 px root text at all five widths. Member/admin previews use simulated
read-only account data and API responses. External requests are blocked.

Conservative rendered-background contrast samples cover 104 text runs across
the four wizard headings, calendar, access, dashboard, admin and member headers
in both themes. All sampled runs meet 4.5:1 for normal text or 3:1 for large text.
This sampling is scoped to the edited headers, not a complete accessibility audit.

These checks validate local browser presentation. Physical Android/WebView
rendering and a deployed release remain unverified. No push or deployment was
performed.

Rollback: restore the listed source files from the base commit and remove this
document. The existing artwork is retained in the repository.
