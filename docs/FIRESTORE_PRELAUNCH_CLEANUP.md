# Firestore pre-launch cleanup
The owner confirmed current orders are tests. Never execute reset once real customer records exist. Back up any test records to retain and stop submissions and invoice workers before resetting. Run in a local authenticated checkout; use existing Firebase Admin credentials or ADC, never commit keys.

```sh
export FIREBASE_PROJECT_ID=restoran-wawasan
npm run firestore:prelaunch -- --project-id=restoran-wawasan
```
Preview counts first. To permanently remove the seven listed order/invoice test collections:
```sh
npm run firestore:prelaunch -- --project-id=restoran-wawasan --mode=reset --confirm=ALL-TEST-ORDERS-restoran-wawasan
```
Counts are top-level; recursive deletion includes descendants. Deletes consume quota. Auth accounts, users, menus, settings, calendar notes, audit logs, number registry and counters are retained. External emails/calendar events are not affected. No automatic CI or public reset endpoint.

## Enable optimized queries
Deploy writers that explicitly initialize both deletion flags, and stop obsolete writers. If old records remain, use modes visibility-preview, visibility-apply (with --confirm=restoran-wawasan), and visibility-verify. Verify zero pending. Deploy Firestore indexes and check readiness before enabling FIRESTORE_ORDER_VISIBILITY_READY=true on server and VITE_FIRESTORE_ORDER_VISIBILITY_READY=true for web/APK builds. Complete the separate calendar index verification before enabling FIRESTORE_CALENDAR_INDEX_READY.
The admin/customer listeners, REST and calendar queries then exclude their hidden records before reading. The live listener remains primary; fallback no longer duplicates a healthy listener. Full active admin data remains available for virtualized filters; true server-side pagination needs a separate UI contract. If verification fails, keep readiness flags disabled. Real customer invoices retain soft-delete protection. Verify usage in Firebase Console; no live reset or savings assumed.
