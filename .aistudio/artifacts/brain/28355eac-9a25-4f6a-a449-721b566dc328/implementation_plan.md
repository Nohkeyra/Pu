# Jetpack Glance Pricing Widget Integration

Modernize the Android home screen pricing widget by transitioning from legacy RemoteViews to Jetpack Glance with declarative Compose UI, centralized version catalog management, and seamless package integration.

> [!IMPORTANT]
> **Confirmed Technical Decisions**:
> - **Package Alignment**: Using the project's canonical namespace `com.wawasanpakusop.app.widgets` for `PricingGlanceWidget` and `PricingWidgetReceiver`.
> - **Provider Transition**: Replacing the legacy `PricingWidgetProvider` (RemoteViews) in `AndroidManifest.xml` with `PricingWidgetReceiver` while preserving the separate upcoming orders widget.
> - **Gradle Integration**: Placing `libs.versions.toml` in `android/gradle/libs.versions.toml` and linking the Glance dependencies within the existing Groovy DSL `android/app/build.gradle`.

---

### 1. Overview & Core Concept

- **What It Does**: Replaces the imperative RemoteViews home screen pricing widget with a modern, declarative Jetpack Glance widget displaying live pricing and operational status.
- **Target Audience / Persona**: Mobile users and patrons wanting at-a-glance status and pricing directly from their Android device home screen.
- **Key Value**: Declarative UI layout, reactive state binding via GlanceTheme, reduced boilerplate compared to RemoteViews factories, and unified Material 3 color harmony.

---

### 2. User Experience & Visual Design

- **Home Screen Widget Layout**:
  - Size: 2x2 cell widget (minWidth 140dp, minHeight 140dp) with flexible horizontal and vertical resizing.
  - Visual hierarchy:
    - Top: Brand title header ("Restoran Wawasan Pak Usop") in medium contrast font.
    - Center: Prominent price typography ("RM 10.00") styled with bold primary theme accent.
    - Bottom: Operational indicator ("Status: Open") styled in secondary muted tone.
  - Theme harmony: Adapts automatically to system light/dark modes using `GlanceTheme.colors`.
- **Interactivity & State**:
  - Periodic background refresh interval configured at 30 minutes (1,800,000 ms).
  - Clean edge-to-edge padding with rounded card aesthetics aligned with modern Android widget standards.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Package Namespace Alignment (`com.wawasanpakusop.app.widgets`)**:
  - *Chosen Approach*: Match the existing package root `com.wawasanpakusop.app` rather than diverging into a disconnected package.
  - *Why*: Ensures seamless class resolution in AndroidManifest, avoids class-loading discrepancies, and maintains idiomatic Android conventions.
- **Decision 2: Seamless Receiver Replacement**:
  - *Chosen Approach*: Update the pricing widget receiver declaration in `AndroidManifest.xml` to point to `.widgets.PricingWidgetReceiver`, keeping the XML metadata provider reference `pricing_widget_info.xml`.
  - *Why*: Cleanly replaces legacy RemoteViews without introducing orphaned providers or conflicting update actions.
- **Decision 3: Version Catalog in Groovy DSL**:
  - *Chosen Approach*: Introduce `android/gradle/libs.versions.toml` defining the `glance` version and libraries (`androidx-glance-appwidget`, `androidx-glance-material3`), resolving them cleanly in `android/app/build.gradle`.
  - *Why*: Provides dependency version centralisation while preserving existing Gradle scripts and Capacitor plugin integrations.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Android System                         │
│                  (AppWidget Host / Launcher)                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Broadcast APPWIDGET_UPDATE
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PricingWidgetReceiver                       │
│           (androidx.glance.appwidget.GlanceAppWidgetReceiver)│
└──────────────────────────────┬──────────────────────────────┘
                               │ Provides GlanceAppWidget
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  PricingGlanceWidget                        │
│          (androidx.glance.appwidget.GlanceAppWidget)        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │   provideGlance(context, id)                        │   │
│   │   └─► GlanceTheme                                   │   │
│   │       └─► PricingWidgetContent                      │   │
│   │           ├── Column (Center aligned)               │   │
│   │           ├── Header: Restoran Wawasan Pak Usop     │   │
│   │           ├── Price: RM 10.00                       │   │
│   │           └── Status: Open                          │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Target Files & Modifications:
1. `android/gradle/libs.versions.toml`: Define version catalog for `glance = "1.1.0"` with libraries `androidx-glance-appwidget` and `androidx-glance-material3`.
2. `android/app/build.gradle`:
   - Enable Compose build features if required by Glance runtime (`buildFeatures { compose true }` and `composeOptions`).
   - Add Glance dependencies using version catalog / library coordinates.
3. `android/app/src/main/java/com/wawasanpakusop/app/widgets/PricingGlanceWidget.kt`: Create Glance composable widget with `GlanceAppWidget` and `provideContent`.
4. `android/app/src/main/java/com/wawasanpakusop/app/widgets/PricingWidgetReceiver.kt`: Create Glance receiver subclassing `GlanceAppWidgetReceiver`.
5. `android/app/src/main/res/xml/pricing_widget_info.xml`: Update provider dimensions (`minWidth="140dp"`, `minHeight="140dp"`, `targetCellWidth="2"`, `targetCellHeight="2"`, `initialLayout="@android:layout/list_content"`).
6. `android/app/src/main/AndroidManifest.xml`: Register `.widgets.PricingWidgetReceiver` as the appwidget provider for `@xml/pricing_widget_info`.
