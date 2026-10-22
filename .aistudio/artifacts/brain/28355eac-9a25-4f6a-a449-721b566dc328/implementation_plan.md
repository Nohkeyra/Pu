# Fix actionStartActivity Intent Overload Package & Preference Visibility

## Summary
Apply the two exact compiler fixes identified by compiler logs:
1. Switch `actionStartActivity` imports in `PricingGlanceWidget.kt` and `UpcomingOrdersGlanceWidget.kt` from `androidx.glance.action.actionStartActivity` to `androidx.glance.appwidget.action.actionStartActivity`, providing the overload that accepts `android.content.Intent`.
2. Change `PREFS_NAME`, `PREF_ORDERS_JSON`, and `PREF_LAST_SUCCESS_AT` in `WidgetUpdateService.java` from package-private to `public static final String` so they can be accessed across packages by `UpcomingOrdersGlanceWidget.kt`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - `androidx.glance.action.actionStartActivity` only accepts `ComponentName` or `Class<out Activity>`. The overload accepting an `android.content.Intent` is provided by `androidx.glance.appwidget.action.actionStartActivity`.
> - `UpcomingOrdersGlanceWidget.kt` (package `com.wawasanpakusop.app.widgets`) accesses `WidgetUpdateService.PREFS_NAME` and `PREF_ORDERS_JSON` (package `com.wawasanpakusop.app.widget`), which were package-private and failed compilation across package boundaries.

---

## 1. Overview & Core Concept
- **Target Files**:
  - `android/app/src/main/java/com/wawasanpakusop/app/widgets/PricingGlanceWidget.kt`
  - `android/app/src/main/java/com/wawasanpakusop/app/widgets/UpcomingOrdersGlanceWidget.kt`
  - `android/app/src/main/java/com/wawasanpakusop/app/widget/WidgetUpdateService.java`
- **Goal**: Direct compile-time fix for the 3 compiler errors in `actionStartActivity(Intent)` and cross-package field access in `WidgetUpdateService`.

---

## 2. Proposed Changes

### A. Update `actionStartActivity` Package Import
In `PricingGlanceWidget.kt` and `UpcomingOrdersGlanceWidget.kt`:
Replace:
```kotlin
import androidx.glance.action.actionStartActivity
```
With:
```kotlin
import androidx.glance.appwidget.action.actionStartActivity
```

### B. Expose Preference Keys Publicly in `WidgetUpdateService.java`
In `WidgetUpdateService.java`:
Replace:
```java
    static final String PREFS_NAME = "wawasan_widget_prefs";
    static final String PREF_ORDERS_JSON = "cached_orders_json";
    static final String PREF_LAST_SUCCESS_AT = "cached_orders_last_success_at";
```
With:
```java
    public static final String PREFS_NAME = "wawasan_widget_prefs";
    public static final String PREF_ORDERS_JSON = "cached_orders_json";
    public static final String PREF_LAST_SUCCESS_AT = "cached_orders_last_success_at";
```

---

## 3. Verification Plan
- Run `npm run lint` and `npm run test` to verify zero workspace regressions.
- Verify web app compilation via `compile_applet`.
- Verify file diff with `git diff`.
