# Repository structure — Restoran Wawasan

This project uses **responsibility-first, incremental organization**, not a wholesale framework rewrite. Existing Firebase, Express, Android, and deployment entrypoints remain where they are because moving them would add risk without a demonstrated benefit.

## Directory ownership

| Directory | Responsibility |
|---|---|
| `src/pages/` | Route-level page composition |
| `src/components/admin/` | Admin dashboard and admin-only panels |
| `src/components/order/` | Customer order wizard, order status, invoice UI |
| `src/components/profile/` | User profile dashboard and tabs |
| `src/components/layout/` | Headers, footers, navigation, page shells |
| `src/components/brand/` | Batik motion, splash, brand logo and loader |
| `src/components/auth/` | Authentication and biometric enrolment UI |
| `src/components/notifications/` | Notification UI and event handlers |
| `src/components/system/` | Native lifecycle, diagnostics, updates, fallback dialogs |
| `src/components/marketing/` | Landing/marketing UI components |
| `src/components/ui/` | Shared, reusable UI primitives with no feature ownership |
| `src/components/calendar/`, `delivery/`, `app/` | Existing feature-specific components |
| `src/hooks/admin/`, `delivery/`, `native/`, `ui/` | Hooks grouped by their ownership |
| `src/context/` | Shared React context providers |
| `src/services/`, `src/lib/`, `src/constants/` | Existing application services, utilities and constants |
| `src/ghost/` | Existing demo engine; retained intentionally |
| `server/routes/`, `server/services/`, `server/mcp/` | Express endpoint controllers, business services and MCP |
| `android/` | Capacitor / Android native project. Preserve Gradle/Android conventions |
| `public/assets/` | Static runtime assets accessed by URL; not source-code imports |
| `tokens/`, `src/index.css`, `src/wawasan-page-backgrounds.css` | Shared design tokens and page-wide visual ownership |
| `tests` (`*.test.ts`) and `e2e/` | Regression suites; do not remove as unused production code |

`src/components/customer-pages.css` deliberately remains at its established location: shared customer-page styling with existing visual-ownership guardrails. Layout-specific `bottom-navigation-polish.css` is colocated with `BottomNavigation.tsx`.

## Import and code ownership rules

1. Prefer `@/...` imports for cross-feature relationships and relative imports inside the same folder.
2. Put a new feature component in its owning feature directory; do not re-create a flat collection in `src/components/`.
3. Shared `ui/` components must not import an admin/order/profile feature merely for convenience.
4. Keep tests close to the implementation; tests are not dead code simply because the production bundle excludes them.
5. Before deleting/moving modules, inspect static and dynamic imports, CSS imports, Android, build scripts and runtime asset references.
6. Never create an import-only compatibility file at the old path unless a verified external consumer requires it; such shims become a second source of truth.
7. Keep the existing `server`, `android`, `public` and toolchain directories stable unless a focused investigation justifies a move.
8. For a UI styling edit, follow `docs/visual-architecture.md` and `npm run lint:visual` to avoid cascading overrides.

## Checks

```bash
npm ci
npm run lint:structure
npm run lint:visual
npm run typecheck
npm test
npm run build
```

`npm run lint:structure` parses source files and checks resolvable relative and `@/` imports and feature placement. It does not prove type-safety, runtime integration, Firebase connectivity, or pixel-level visual equivalence. Run the full checks above before merging.

## Migration

`docs/repository-structure-moves.json` records **every original path and new path**. A changes-only package requires **deleting all original paths** after copying the replacements. Do not leave duplicates with the same component implementation in both locations.

### Historical checksums

`docs/LANDING_PAGE_RESTYLE_FILES.sha256` and `docs/RIDER_TRACKING_FILES.sha256` represent **historical snapshots**, not valid hashes for this updated source tree. Their original hashes and paths were preserved as historical evidence, not silently rewritten to match the restructuring.
