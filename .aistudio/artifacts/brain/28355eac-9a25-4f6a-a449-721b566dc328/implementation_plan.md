# Audit Diagnosis & System Completion Plan

This plan establishes a comprehensive audit and completion roadmap for Restoran Wawasan, executing the confirmed user directives: aligning in-app version broadcast configs with the current build (v1.3.102 / build 234), transitioning catering dish selection and reordering entirely to the live dynamic catalog, and enabling immediate exploratory browsing of the menu and brand story on initial app launch.

### User Review & Critical Decisions

> [!IMPORTANT]
> The three core operational decisions confirmed in Phase 1 guide all changes:
> 1. **Live Updates & Version Synchronization**: Align Firestore `app_config/version` and backend endpoints with current build `1.3.102` (build 234) and standard signed APK release links.
> 2. **Catering Menu Synchronization**: Fully decouple catering selection and reordering from static fallback arrays, wiring them directly to the dynamic backend menu catalog (`/api/menu`).
> 3. **Friction-Free Initial Browsing**: Allow first-time visitors to immediately explore the landing page, dishes, and restaurant history without an artificial login barrier, reserving authentication for order finalization and profile access.

- **Confirmed Decision 1**: Align version configuration in backend and database to `v1.3.102` (build 234).
- **Confirmed Decision 2**: Eliminate legacy static dish arrays in `OrderForm.tsx` and standardize on live dynamic catalog sourcing.
- **Confirmed Decision 3**: Update cold-start routing so `/` serves the Landing Page with open browsing and optional sign-in.

---

### 1. Overview & Core Concept

Restoran Wawasan operates as an enterprise-grade corporate catering and event booking platform serving ministries, government agencies, corporate institutions, and private events in Putrajaya and the Klang Valley.

- **What It Does**: Provides an interactive multi-session meal package booking wizard, automated bilingual corporate quotation and invoice compilation (`RW-XXXX`), native Android home-screen widget synchronization, and real-time in-app update broadcasts.
- **Target Audience**: Corporate administrative officers, government event planners, and private catering clients seeking high-capacity authentic traditional Malaysian feasts.
- **Core Value**: Seamless catering coordination, offline-buffered order resilience with IndexedDB, transparent quotation workflows, and live over-the-air client updates.

---

### 2. User Experience & Visual Design

#### Key User Flows

1. **Exploration & Discovery (Cold-Start)**:
   - Visitor launches the application.
   - The app presents the authentic heritage visual hero (Jawi script insignia, batik ambient geometry, deep forest emerald tones, and warm sunrise accents).
   - Visitor freely browses culinary highlights, menu packages, customer reviews, and restaurant location details without mandatory login friction.
   - Visitor can initiate sign-in at any point via the top bar or header profile trigger.

2. **Catering Reservation Flow**:
   - Client clicks "Book Catering" (`#/order`).
   - Step 1: Select event classification, meal sessions (Sarapan, Makan Tengah Hari, Hi-Tea), and attendee headcount.
   - Step 2: Dynamically browse available dishes organized by meal session and dish categories (mains, vegetables, refreshments), populated directly from the live menu collection.
   - Step 3: Input venue location, organization/ministry details, and contact person.
   - Step 4: Review quotation summary with instant pricing estimation notes.
   - Step 5: Submission confirmed with a unique order reference (`RW-XXXX`), buffered offline in IndexedDB if disconnected and synced automatically upon reconnection.

3. **In-App Live Updates Broadcast**:
   - The application checks Firestore `app_config/version` or `/api/app-version`.
   - If an update is detected, an unobtrusive banner or modal informs the user of new features and offers a direct APK download or instant live update.

#### Visual Identity & Anti-Slop Discipline

- **Color Tokens**:
  - Primary: Deep Forest Emerald (`#0F2D25` / `hsl(165, 50%, 12%)`)
  - Accent / Brand: Warm Sunshine Amber (`#D97706` / `hsl(38, 92%, 50%)`)
  - Surface: Cream (`#FDFBF7` / dark `#121212`)
  - Subtle borders: `rgba(255, 255, 255, 0.08)` / `border-stone-200/80`
- **Zero-Pill Discipline**:
  - Metadata (categories, dates, pax counts, order references) rendered as quiet unboxed text with typographic separators (`·` or `-`).
  - Interactive filters use segmented controls or clean button states, avoiding candy-like floating badges.
- **Micro-Interactions**:
  - Haptic feedback on mobile touch points (Capacitor Haptics).
  - Smooth page reveals via Motion (`y: 8px -> 0px`).
  - Skeleton loaders for dynamic menu grids during data fetching.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Open Discovery vs. Forced Session Gate**:
  - *Chosen Approach*: Route `/` and `/home` directly to the Landing Page. Wrap sensitive account and booking management routes in authenticated guards, but allow menu discovery.
  - *Why*: Maximizes visitor conversion and reduces barrier to entry while maintaining security where user data or administrative actions are involved.
  - *Alternatives Considered*: Retaining the cold-start modal redirecting to `/login` — discarded as it caused high drop-off for casual corporate prospects.

- **Decision 2: Dynamic Menu Normalization**:
  - *Chosen Approach*: Fully bind dish selection and previous-order reordering to `/api/menu` / `DEFAULT_MENU_ITEMS`, eliminating hardcoded `LAUK_UTAMA` / `SAYURAN` lists.
  - *Why*: Ensures menu additions, seasonal items, or availability toggles made in the Admin Menu Tab immediately reflect in the catering wizard.
  - *Alternatives Considered*: Dual-state fallback arrays — discarded to prevent inconsistent dish IDs between the admin manager and client submission.

- **Decision 3: Update Service Alignment**:
  - *Chosen Approach*: Standardize version numbers across `package.json`, `android/app/build.gradle`, `server/routes/updateRoutes.ts`, and `src/services/updateService.ts` at `v1.3.102` (build 234).
  - *Why*: Prevents false "update available" notifications for users already on the latest release.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATION                            │
│                                                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   Landing Page   │    │  Catering Form   │    │   Admin Panel    │  │
│  │ (Open Discovery) │    │  (Dynamic Menu)  │    │ (Menu & Updates) │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │            │
│  ┌────────▼───────────────────────▼───────────────────────▼─────────┐  │
│  │                   State & Service Orchestration                  │  │
│  │  - updateService.ts (Version config listener & Capgo OTA)        │  │
│  │  - pendingOrdersQueue.ts (IndexedDB offline buffer)              │  │
│  │  - authService.ts (Firebase Auth & Session Management)           │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ HTTPS / REST / WebSockets
┌───────────────────────────────────▼────────────────────────────────────┐
│                        EXPRESS SERVER / BACKEND                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Modular Routes:                                                 │  │
│  │  - /api/menu (GET menu catalog, POST/PUT/PATCH admin updates)    │  │
│  │  - /api/app-version (GET current version, POST admin broadcast)  │  │
│  │  - /api/invoice (PDF generation & corporate invoice specs)       │  │
│  │  - /api/admin/* (Authentication & privileged operations)         │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │ Admin SDK                          │
│  ┌────────────────────────────────▼─────────────────────────────────┐  │
│  │                 FIRESTORE DATABASE ((default))                   │  │
│  │  - app_config/version (Live broadcast version configuration)     │  │
│  │  - menu/{itemId} (Dynamic dishes, categories, availability)      │  │
│  │  - orders/{orderId} (Catering bookings & quotation lifecycle)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Planned Modifications

1. **Routing & Cold-Start Refinement**:
   - Update `src/components/app/AppContent.tsx` so route `/` renders `LandingPageComp` directly.
   - Adjust `src/App.tsx` cold-start logic to remove the forced login redirect, ensuring new visitors land on the showcase.
   - Update `SessionGuard` to allow public browsing routes while guarding user profiles and sensitive operations.

2. **Catering Menu Synchronization**:
   - In `src/components/OrderForm.tsx`, replace remaining references to static `LAUK_UTAMA` and `SAYURAN` arrays with `dynamicMenu`.
   - Update reorder matching logic so previously ordered items map correctly against all catalog categories.

3. **Version & In-App Broadcast Alignment**:
   - Verify `server/routes/updateRoutes.ts` and `src/services/updateService.ts` defaults align at `v1.3.102` / build 234.
   - Ensure the version endpoints return clean structured configs that avoid false update prompts.

4. **Verification & Audit Gate**:
   - Run typecheck (`tsc`), linter (`eslint`), test suite (`vitest`), and applet build (`vite build` + `esbuild`) to achieve clean verification.
