# Changelog

All notable changes to **Restoran Wawasan** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-11

### Added
- **Native Android & Capacitor Integration**:
  - Full Capacitor 8 runtime setup with Android platform support.
  - Native back button handling, status bar styling, splash screen, and push notification integrations (`@capacitor/app`, `@capacitor/status-bar`, `@capacitor/push-notifications`).
  - Haptic feedback and native share integration (`@capacitor/haptics`, `@capacitor/share`).
  - File system export capabilities for PDF & Excel invoices (`@capacitor/filesystem`).
- **Complete Android Icon & Asset Suite**:
  - Adaptive launcher icons (`ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground.xml`, `ic_launcher_background.xml`).
  - Mipmap densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`, `anydpi-v26`).
  - Splash screen assets across portrait and landscape density variants (`drawable-port-*`, `drawable-land-*`).
- **DevOps & Code Quality Tools**:
  - Created `.prettierrc` for consistent code formatting.
  - Created `.editorconfig` for multi-IDE formatting standardization.
  - Added `.github/dependabot.yml` for automated npm security and framework update tracking.

### Changed
- **Dependencies & Bundle Optimization**:
  - Removed unused dependencies (`recharts`, `react-virtualized-auto-sizer`, `@types/react-virtualized-auto-sizer`) to streamline bundle size.
  - Fixed TypeScript interface alignment for `@capacitor-firebase/crashlytics` `recordException`.
  - Optimized production Vite build and Esbuild server bundling pipeline (`dist/server.cjs`).

### Fixed
- Addressed type safety issues across Capacitor plugins and diagnostic hooks.
- Ensured zero-warning build and lint output for `npm run build`, `npm run lint`, and `npx cap sync android`.
