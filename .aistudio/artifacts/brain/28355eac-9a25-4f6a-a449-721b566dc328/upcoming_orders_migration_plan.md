# Implementation Plan: Modernize Upcoming Orders Widget to Jetpack Glance

## Overview
Migrate the existing "Upcoming Orders" legacy RemoteViews widget to a modern Jetpack Glance implementation, ensuring architectural consistency with the newly updated Pricing widget.

## Proposed Steps

1. **Codebase Inspection**
   - Audit existing `WawasanWidgetProvider`, `WidgetRemoteViewsService`, `WidgetListFactory`, and associated layout/resource files.
   - Trace the data flow and refresh mechanisms for the current implementation.

2. **Glance Widget Implementation**
   - **`UpcomingOrdersGlanceWidget.kt`**: Implement the new Glance widget, mapping existing layouts to Glance Composable structures.
   - **`UpcomingOrdersWidgetReceiver.kt`**: Create the receiver for the new Glance widget.
   - **Metadata & Config**: Create the required Glance widget metadata XML (`upcoming_orders_glance_info.xml`).

3. **Integration**
   - Ensure seamless integration with the existing data source (`WidgetUpdateService`).
   - Wire up action callbacks to support data refreshing.

4. **Cleanup & Migration**
   - Register the new Glance widget and update `AndroidManifest.xml`.
   - Remove legacy components: `WawasanWidgetProvider`, `WidgetRemoteViewsService`, `WidgetListFactory`, and associated XML layouts.

5. **Verification**
   - Perform project-wide linting (`npm run lint`).
   - Run unit/integration tests (`npm run test`).
   - Run Android build verification.
