# Implementation Plan: Jetpack Compose & Jetpack Glance Integration

## Overview
Configure Android Gradle build tooling and dependencies to fully support Jetpack Compose and Jetpack Glance under Kotlin 2.2+, enabling the modern Jetpack Glance pricing widget and Compose UI system while eliminating `:app:compileDebugKotlin` compilation errors and Gradle 9.0 deprecation warnings.

---

## 1. Problem Analysis & Root Cause

### A. Kotlin 2.0+ Compose Compiler Architecture
In Kotlin 2.0 and above (the project uses Kotlin 2.2.21), Jetpack Compose compilation is handled by the official Jetpack Compose Compiler Gradle plugin (`org.jetbrains.kotlin.plugin.compose`), rather than the legacy `kotlinCompilerExtensionVersion` property inside AGP.
When Kotlin source files contain `@Composable` or references to Compose/Glance APIs without this plugin and matching Compose libraries:
- `kotlinc` (`GradleKotlinCompilerWorkAction`) fails during `:app:compileDebugKotlin`.
- Symbols such as `androidx.compose.material3.*`, `androidx.compose.foundation.*`, `androidx.compose.ui.*`, and Glance Composables remain unresolved.

### B. Missing Dependency Tree
Jetpack Glance 1.1.0 and Jetpack Compose Material 3 require explicit Compose dependencies on the classpath:
- Compose BoM (`androidx.compose:compose-bom`)
- `androidx.compose.ui:ui`
- `androidx.compose.ui:ui-graphics`
- `androidx.compose.foundation:foundation`
- `androidx.compose.material3:material3`
- `androidx.compose.material:material-icons-extended`
- `androidx.glance:glance-appwidget`
- `androidx.glance:glance-material3`

---

## 2. Technical Strategy & Implementation Steps

### Phase 1: Gradle Build Configuration
1. **Top-Level `android/build.gradle`**:
   - Add the Compose compiler Gradle plugin classpath:
     `classpath "org.jetbrains.kotlin:compose-compiler-gradle-plugin:$kotlinVersion"`
   - Modernize the `clean` task registration to use `rootProject.layout.buildDirectory` (eliminates Gradle 9.0 deprecation warning).

2. **App-Level `android/app/build.gradle`**:
   - Apply the plugin: `apply plugin: 'org.jetbrains.kotlin.plugin.compose'`
   - Enable Compose build feature:
     ```groovy
     buildFeatures {
         buildConfig = true
         compose = true
     }
     ```
   - Add the Compose Bill of Materials (BoM) and Compose/Glance dependencies:
     ```groovy
     implementation platform('androidx.compose:compose-bom:2024.10.01')
     implementation 'androidx.compose.ui:ui'
     implementation 'androidx.compose.ui:ui-graphics'
     implementation 'androidx.compose.foundation:foundation'
     implementation 'androidx.compose.material3:material3'
     implementation 'androidx.compose.material:material-icons-core'
     implementation 'androidx.compose.material:material-icons-extended'
     implementation 'androidx.activity:activity-compose:1.9.2'
     implementation 'androidx.glance:glance-appwidget:1.1.0'
     implementation 'androidx.glance:glance-material3:1.1.0'
     ```

### Phase 2: Jetpack Glance Modern Pricing Widget
1. **Implement `PricingGlanceWidget.kt`**:
   - Create a modern Glance widget inheriting `GlanceAppWidget()`.
   - Read cached order and pricing details from `SecureStorage` / `PricingWidgetFetchService.PREF_ORDERS_JSON`.
   - Render orders using Glance Column/Row layout with Material 3 GlanceTheme tokens, formatted pricing display, order status indicator, and dynamic item rows.
   - Wire interactive Glance action callbacks (`actionRunCallback` or `actionStartActivity`) for quick refresh and opening the pricing detail modal.

2. **Implement `PricingWidgetReceiver.kt`**:
   - Subclass `GlanceAppWidgetReceiver()`.
   - Provide `PricingGlanceWidget()` instance.

3. **Glance Widget Metadata (`pricing_widget_info.xml`)**:
   - Update widget dimensions (`targetCellWidth="4"`, `targetCellHeight="1"`, `minResizeWidth="180dp"`, `minResizeHeight="40dp"`).
   - Configure widget provider metadata conforming to Glance standards.

4. **Integration with Offline Pricing Queue & App**:
   - In `OfflinePricingQueue.kt` and `PricingInputActivity.java`, trigger Glance widget refreshes upon price submission using Glance's update mechanism.

### Phase 3: Jetpack Compose UI & Theme Architecture
1. **Theme Architecture (`AppTheme.kt` and `ThemeManager.kt`)**:
   - Maintain `ThemeManager` with `MutableStateFlow<CustomizeUiState>`.
   - Implement `AppTheme` Composable with high-contrast palette support (Standard, Neo-Brutalist, Neon Night).

2. **UI Profile Screen (`CustomizeUIScreen.kt`)**:
   - Provide a clean, robust Compose implementation using Material 3 Card, RadioButton, and typography tokens.

### Phase 4: Verification & Integrity Checks
1. Validate web test suite (`npm run test`).
2. Run ESLint code quality checks (`npm run lint`).
3. Run web production build (`npm run build`).
4. Perform static symbol resolution check on all Kotlin files to verify zero missing imports or broken type signatures.

---

## 3. Risk Mitigation
- **Kotlin 2.2 Compatibility**: Using the official `org.jetbrains.kotlin.plugin.compose` bundled with Kotlin 2.2 ensures strict compatibility without version mismatch between the Kotlin compiler and the Compose compiler.
- **Fail-Safe Fallbacks**: Secure storage lookups gracefully fall back to default states when device is offline or cache is empty.
