# Pu UI/UX audit

The audit covers the React web app in local Chromium. External requests were blocked or replaced with fixtures when exercising signed-in or service-dependent paths. The browser runs used desktop and mobile viewports, light and dark themes, and both Malay and English for the account and dashboard checks.

## Route and role inventory

| Frontend route or surface | Roles | Workflows |
| --- | --- | --- |
| `/`, `/home`, `/main` | Public visitor and customer | Browse the restaurant, search and filter dishes, open a catering draft, sign in |
| Unknown routes | All | Redirect to the entry screen |
| `/login` and sign-in dialogs | Visitor, customer and administrator | Email and Google sign-in, registration, password reset, verification, guest entry and administrator access |
| `/app` | Signed-in customer | Start a booking, access order history, calendar and account settings. Signed-out visitors redirect to sign-in and administrators redirect to admin |
| `/order` | Guest and customer | Draft event and meals, select dishes, enter contact and event details, review, verify eligibility, submit, recover from failure and view the booking reference |
| `/profile` and account dialog | Guest and customer | Guest sign-in prompt, profile, history, order status, reordering, invoice request and download |
| `/calendar` | Guest, customer and administrator | Browse calendar, select dates, see booking details, start a draft from a date, maintain admin notes |
| `/settings` | Guest, customer and administrator | Language, theme, text size, notifications, device features, account deletion and admin diagnostics |
| `/admin` | Administrator, plus the signed-out gate | Orders, submissions and menu views, order actions, invoice preview, individual and combined invoicing |
| Invoice dialogs under profile and admin | Customer for owned orders and administrator | Preview and download PDFs, request or send invoice, combine records |
| Capacitor Android entry | Signed-out visitor, customer and administrator | Native routing, app links, notifications, system Back, safe areas, biometric and device services |

Routes are defined in [AppContent](../src/components/app/AppContent.tsx). Native entry and deep-link routing are defined in [appEntryRoutes](../src/lib/appEntryRoutes.ts).

## Browser coverage

Service-dependent successes and failures in this table were simulated. The routes rendered the production React components.

| Surface | Exercised in Chromium | Coverage still open |
| --- | --- | --- |
| Landing and routing | Landing menu search, empty results, keyboard navigation, drawer focus, catering entry, mobile header, aliases and fallback | Cross-browser and assistive-technology checks |
| Sign-in and account | Sign-in, registration and reset views in both languages, mode focus and return to opener, invalid email and credentials, simulated reset and sign-in success, admin gate and simulated account deletion with offline and incorrect-password states | Live sign-in, registration, verification and mailbox receipt |
| Customer dashboard | Simulated customer entry, verification prompt and settings shortcut at 390 and 1280 px in both languages and themes | Live customer session and populated account data |
| Catering order | Menu fallback and retry, empty menu, draft restoration, keyboard choices, field validation, review, simulated service rejection, retry and booking confirmation | Live persistence, notifications and confirmation delivery |
| Calendar | Date selection and order handoff, empty and error states, retry, event detail focus and touch target on mobile and desktop | Live membership data, note mutations and external synchronization |
| Profile | Guest sign-in prompt, simulated signed-in history failure, retry and empty history | Populated live history, saved locations, edits and member invoice actions |
| Settings | Advanced controls, language, a keyboard-operated haptic switch, and local account deletion. Measured deletion actions for 44 px targets and 4.5:1 minimum contrast where applicable | Real OS settings, permissions and account deletion against services |
| Admin | Gate and simulated administrator entry, switching Orders, Tables View and Menu Manager at 390 and 1280 px, screen overflow, accessible controls and isolated order-read recovery | Live order mutations, catalogue changes and administrator sign-in |
| Invoicing | Simulated failed request, retry and opening a locally generated sample PDF in the admin preview | Live PDF generation, combined invoices, download/share on a physical device and delivery |
| Android | Browser presentation with simulated phone insets, plus isolated bridge fixtures for navigation | Installed APK on an emulator or physical device |

The [platform tests](../e2e/platform-restyle.spec.ts), [calendar tests](../e2e/calendar-flow.spec.ts), [account and role tests](../e2e/delete-account.spec.ts) and [order preservation tests](../e2e/uiux-preservation.spec.ts) record the fixtures and assertions.

## Findings and fixes

| Severity | Route and role | How to reproduce the original issue | Fix |
| --- | --- | --- | --- |
| High | Calendar, any user with an event visible | Open event details with the keyboard, then Tab or press Escape. The original overlay had no dialog semantics or keyboard dismissal | Reuse the shared dialog primitive, move focus inside, trap Tab, restore focus to the event control on close and give the icon a 44 px target |
| High | Calendar to order, guest or member | Select a day and immediately start a booking while the device feedback call is pending. The previous selected date could still be used | Update the selected date immediately and run feedback independently |
| Medium | Sign-in and registration dialogs, visitor or administrator | Activate registration or password reset by keyboard. The action that held focus is removed when the form changes | Focus the new form heading when the mode changes. Localize the admin entry name and field examples |
| Medium | Admin, administrator | Open Tables View at 390 px. The accessibility tree exposes three main landmarks, a nameless icon-only sign-out button, and unnamed filter and pagination controls | Keep one main landmark, add localized control names and enlarge pagination targets |
| Medium | Order, verified customer | Return a failed response on submission after a valid review. The form displayed the raw exception, including an English HTTP status message in Malay | Explain that the draft is still open and can be reviewed and retried in either language |
| Low | Settings, guest, member or administrator | Switch to Malay and inspect the accessible names of notifications or advanced settings switches. Several were English-only | Match the accessible names to the localized labels in each row |

## Verification results

- All 32 focused Chromium tests passed. They covered calendar, account, dashboard, settings, admin, simulated submission and invoice preview, route aliases and interface preservation.
- All 12 selected platform and order tests passed. The layout matrix included 1280 px desktop and 390 px mobile in both themes, with two additional simulated APK presentation cases.
- Five separate profile and motion checks passed. The earlier broad Chromium run was stopped after failures in timing-sensitive fixtures. Selected motion failures passed on a lower-concurrency rerun.
- Lint, the frontend TypeScript check and the production build passed. All 555 unit tests passed in the serial rerun. Three server tests had timed out while the earlier unit run shared resources with Chromium.

## Verification limits

Live Firebase credentials and a native Android runtime were unavailable. An APK screen rendered in Chromium with simulated device insets covers layout only. The native runtime is still needed for biometric prompts, Android Back behavior and real notifications, permissions, file sharing and device gestures. Live accounts and test-service access are still needed for email and Google sign-in, mailbox delivery, live order persistence, calendar synchronization, and invoice generation and dispatch. Keyboard behavior and selected contrast ratios were checked in the browser. Assistive technology and exhaustive contrast coverage across all states remain open.
