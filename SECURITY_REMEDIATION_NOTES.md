# Restoran Wawasan — Security Remediation Notes

## Scope of this patch

This patch makes targeted security and correctness changes while preserving the existing React/Vite, Capacitor, Express, Firebase and Gradle architecture.

- Privileged widget endpoints now require an admin JWT or Firebase ID token; the APK-shared `WIDGET_API_KEY` is no longer an authorization fallback.
- Added a Capacitor native bridge that copies the app's admin session token into Android encrypted storage for native widget requests, and clears widget caches on logout.
- Both native widgets send the admin bearer token. Operational upcoming-order data is no longer served by an unauthenticated widget endpoint.
- Pricing validates finite positive values, positive finite quantity, and a price for every meal before calculating a total.
- Billing status validation and the `billed` transition now run in a Firestore transaction; the transaction rejects status or meal/quantity changes detected since the initial read.
- Removed the Android platform middleware's wildcard CORS response and stopped trusting `X-App-Platform` as a platform-classification override.
- Removed plaintext `SharedPreferences` fallback when encrypted native storage cannot initialize.
- Widget endpoints return generic client-facing error messages rather than raw exception strings.

## Important rollout sequence

This is a coordinated server + Android change. Do not deploy only one side and assume the widget remains compatible.

1. Build and test the new Android application with `AdminTokenBridge` registered.
2. Confirm admin login calls `saveAdminToken` on Android and that the native bridge stores the token successfully.
3. Deploy the server version that rejects the old shared-key authorization path.
4. Distribute/install the matching Android build and have an admin sign in once so the native widget session is populated.
5. Verify both widgets, token expiry/re-login, logout cache clearing, pricing submission, invoice generation, and offline queue resynchronization.
6. Keep the previous release artifacts for rollback. If rollback is needed, restore a matched server/app pair; do not reintroduce the APK-shared key as a permanent authorization method.

## Business rules preserved

- Roles remain `admin`, `client`, and `guest`.
- Admin credentials are required for privileged widget operations.
- Clients and guests do not determine authoritative prices.
- No arbitrary maximum meal price was invented. If the business wants a price ceiling, it must be explicitly set by the owner/admin and enforced server-side.
- Existing invoice generation and asynchronous email queue behaviour are retained.

## Verification status

- Source changes were inspected after editing.
- `npm run typecheck` was attempted but could not run successfully because dependency installation was incomplete; required type definitions were unavailable.
- `npm ci --ignore-scripts --no-audit --no-fund` did not finish within the available execution window. No successful dependency installation was established.
- No unit tests, production build, Android Gradle build, deployed API test, or physical-device widget test is claimed to have passed.

## Remaining work before production

- Complete dependency installation in the intended build environment and run typecheck, lint, unit tests, production build and Android Gradle build.
- Add automated tests for admin-only widget routes, invalid/non-finite prices, missing meal prices, concurrent billing attempts and order changes during pricing.
- Review broad origin suffixes in the central CORS allowlist separately. This patch removes the platform middleware's wildcard CORS override, but does not claim that every origin allowlist entry has been fully hardened.
- Review the public contents of Firebase `app_config`, `settings`, and `restaurant_metadata` documents against the deployed rules.
- Confirm deployed secrets, Firebase rules and API configuration in the real production environment without exposing secret values.

## Biometric / session hardening (follow-up patch)

- Biometric enrolment is opt-in, native Android keystore only, and confirmed with a fingerprint/face prompt before anything is saved. There is no plaintext fallback; `purgeLegacyPlaintextCredentials()` removes keys written by older builds on every boot (including an admin "token" that was really the password).
- Opening the member sign-in form or the admin gate with biometrics enabled shows the system prompt once; cancelling falls back to the password form. Member and admin biometrics are fully separate.
- A persisted Firebase/admin session no longer bypasses the admin biometric check: the admin panel stays locked until this app launch passes biometrics (or a fresh password login), and re-locks after 5 minutes in the background.
- Logout keeps biometric enrolment; only the explicit "disable" switch deletes keystore credentials. Stale credentials (password changed) are removed automatically.
- CORS: `claude.ai` / `anthropic.com` removed; any-port localhost only outside production. Platform detector no longer trusts every `*.google.com`; referer allow-list no longer lists claude.ai/anthropic.com.
- Firestore: only `app_config/version` is public-read (rules not yet tested against the emulator or deployed).

## Accepted / open items

- `capacitor-native-biometric` 4.2.2 does not bind its Keystore key to user authentication (confirmed in its Java source), so the biometric check is an app-level gate. Hardware-bound protection needs a plugin or custom native code using `setUserAuthenticationRequired(true)`; not done here because it cannot be built or device-tested in this environment.
- `npm audit --omit=dev`: 4 moderate. `@hono/node-server` (via `@modelcontextprotocol/node`, `serveStatic` is not used by this repo) and `uuid` (via `exceljs`/`gaxios`, fix is a breaking `exceljs` downgrade). `npm audit fix` itself crashed in this environment; revisit on a normal machine.
- UI helpers (Header, BottomNavigation, etc.) still infer "admin" from a stored token for display only; the server verifies every admin request.
- Confirming deployed secrets, Firebase rules deployment and widget behaviour on a physical device must be done in the real environment.

## Hardening batch (from external audit review)

- `apkUrl` (both `/api/app-version` routes) must be an `.apk` under `https://github.com/Nohkeyra/Pu/releases/download/`; anything else returns 400.
- `render.yaml` builds with `npm ci --include=dev` (lockfile enforced).
- `/api/widget/upcoming-orders` now has the same rate limit as the pricing widget routes (60 / 15 min).
- 500 responses on non-admin routes return a generic message; the detail is logged server-side. Admin-only routes still return detail for diagnosis.
- `/healthz` answers like `/health` (docker-compose and nginx probe it).
- `firebaseConfig.ts` comment now states the real behaviour (env first, committed applet config as fallback, sandbox == production project).
- Not changed on purpose: guest order create/poke rules, helmet frame/CSP policy (needs per-host `frame-ancestors` and testing), branch protection, public calendar endpoints.
