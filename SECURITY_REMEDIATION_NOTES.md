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
