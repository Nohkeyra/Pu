# Resolve Android GitHub Actions Build Failure & Finalize Widget Wiring

## Summary
Ensure the Android GitHub Actions APK build passes without error by resolving the `:app:compileDebugKotlin` failures (`Unresolved reference 'GlanceTheme'` and `@Composable` scope mismatch) through canonical import alignment, direct core Glance library inclusion, and full Intent metadata wiring.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The failing CI run reported two linked errors in `:app:compileDebugKotlin`:
> 1. `Unresolved reference 'GlanceTheme'`: Caused when `androidx.glance.material3.GlanceTheme` is imported (which does not exist in AndroidX) or when `androidx.glance:glance` is missing from the module dependencies.
> 2. `@Composable invocations can only happen from the context of a @Composable function`: Occurs as a syntax cascade when `GlanceTheme` is unresolved, causing the compiler to treat the trailing lambda as a regular, non-composable block.

- **Confirmed Decision 1**: Standardize on `import androidx.glance.GlanceTheme` across all widgets (`PricingGlanceWidget.kt` and `UpcomingOrdersGlanceWidget.kt`).
- **Confirmed Decision 2**: Ensure `androidx-glance = { module = "androidx.glance:glance", version.ref = "glance" }` is directly linked in `android/gradle/libs.versions.toml` and applied via `implementation libs.androidx.glance` in `android/app/build.gradle`.
- **Confirmed Decision 3**: Complete intent wiring for `PricingInputActivity` and `OrderDetailActivity` so widget interaction functions seamlessly on the device without blank states or missing ID toasts.

---

## 1. Overview & Core Concept

- **What It Does**: Resolves all compile-time obstacles in the Android Gradle Kotlin build pipeline and ensures the native home screen widgets (`Pricing` and `Upcoming Orders`) execute properly on physical devices and emulators.
- **Target Audience**: Mobile administrators and operations staff monitoring catering orders and setting meal prices directly from the home screen.
- **Key Value**: Guarantees reproducible, green APK and AAB builds in GitHub Actions CI/CD workflows and reliable widget interactions.

---

## 2. User Experience & Visual Design

- **Widget Interactions**:
  - Tapping an order row on the **Pricing Widget** launches `PricingInputActivity` pre-populated with company name, meal types, and quantity.
  - Tapping an order card on the **Upcoming Orders Widget** launches `OrderDetailActivity` displaying date, time, pax count, meal types, and order status pill.
- **Theme & Aesthetic**:
  - The widgets render using Material 3 GlanceTheme tokens (`GlanceTheme.colors.surface`, `primaryContainer`, `onSurfaceVariant`).
  - High-contrast visual cards with clean hierarchy and responsive padding.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct `androidx.glance:glance` Dependency Declaration**
  - *Chosen Approach*: Declare `androidx.glance:glance` explicitly in `android/app/build.gradle`.
  - *Why*: In Gradle with Kotlin 2.2+, `implementation` dependencies are isolated from the consumer's compile classpath. Even though `glance-appwidget` depends on `glance`, direct usage of `GlanceTheme` requires direct dependency.
- **Decision 2: Intent Payload Robustness**
  - *Chosen Approach*: Supply both snake_case (`order_id`) and camelCase (`orderId`) in Intent extras alongside complete metadata.
  - *Why*: Prevents runtime crashes (`"Ralat: Order ID tiada."`) and guarantees backward compatibility with both Java activities.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System Wiring & Compilation Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI Pipeline                │
│                 (.github/workflows/build-apk.yml)            │
│                                                              │
│  1. Setup JDK 21 (Temurin) & Android SDK Platform-Tools     │
│  2. Web Build & Capacitor Sync (`npx cap sync android`)     │
│  3. Compile Debug Kotlin (`./gradlew assembleDebug`)        │
│  4. Keystore Signing & Release Generation                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                 Gradle Dependency Resolution                 │
│                                                              │
│  libs.versions.toml:                                         │
│    glance = "1.1.0"                                          │
│    androidx-glance = "androidx.glance:glance"                │
│    androidx-glance-appwidget = "...:glance-appwidget"        │
│    androidx-glance-material3 = "...:glance-material3"        │
│                                                              │
│  android/app/build.gradle:                                   │
│    implementation libs.androidx.glance                       │
│    implementation libs.androidx.glance.appwidget             │
│    implementation libs.androidx.glance.material3             │
└──────────────────────────────┬───────────────────────────────┘
                               │ compileDebugKotlin
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    Widget & Activity Wiring                  │
│                                                              │
│  ┌───────────────────────────┐    Intent Extras (order_id)   │
│  │   PricingGlanceWidget     ├──────────────────────────┐    │
│  │  - androidx.glance.       │                          │    │
│  │    GlanceTheme            │                          ▼    │
│  └───────────────────────────┘             ┌─────────────────┤
│                                            │PricingInputAct. │
│  ┌───────────────────────────┐             └─────────────────┤
│  │ UpcomingOrdersGlanceWidget│                          ▲    │
│  │  - androidx.glance.       ├──────────────────────────┘    │
│  │    GlanceTheme            │    Intent Extras (pax, menu)  │
│  └───────────────────────────┘                               │
└──────────────────────────────────────────────────────────────┘
```

### Steps to Execute
1. Confirm all files are aligned with `import androidx.glance.GlanceTheme`.
2. Confirm `android/gradle/libs.versions.toml` and `android/app/build.gradle` have `androidx.glance:glance`.
3. Verify test suite (`npm run test`) and code linting (`npm run lint`).
4. Validate web production build (`npm run build`).
5. Execute Capacitor sync (`npx cap sync android`) to keep web assets and plugins up to date.
