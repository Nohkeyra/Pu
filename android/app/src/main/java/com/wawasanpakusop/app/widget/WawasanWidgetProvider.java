package com.wawasanpakusop.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.RemoteViews;

import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;

/**
 * Home-screen widget that shows the nearest upcoming catering orders.
 * Data is fetched from the Render backend's /api/widget/upcoming-orders
 * endpoint by WidgetUpdateService, which then pushes the result back here
 * via updateAppWidget().
 *
 * Every RemoteViews/PendingIntent construction below is wrapped so a
 * transient failure degrades to a bare-safe view instead of throwing out
 * of onUpdate()/onReceive() -- an uncaught exception here runs on the
 * launcher's binder call and is what makes the OS report "Couldn't add
 * widget" for the whole placement, not just this one visual detail.
 */
public class WawasanWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "WawasanWidgetProvider";

    public static final String ACTION_REFRESH = "com.wawasanpakusop.app.widget.ACTION_REFRESH";
    public static final String EXTRA_OPEN_ADMIN = "open_admin_panel";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            pushSafeInitialView(context, appWidgetManager, appWidgetId);
        }

        try {
            BroadcastReceiver.PendingResult pendingResult = goAsync();
            WidgetUpdateService.fetchAndUpdate(context, appWidgetIds, pendingResult);
        } catch (Exception e) {
            // The safe initial view above is already on-screen; a failure
            // kicking off the background fetch just means it stays on the
            // "loading" state until the next scheduled update instead of
            // taking the widget placement down with it.
            Log.w(TAG, "fetchAndUpdate dispatch failed", e);
        }
    }

    /**
     * Renders a minimal, guaranteed-inflatable view immediately, before any
     * PendingIntent or network-touching code runs. If everything below this
     * succeeds it gets replaced a moment later by WidgetUpdateService's real
     * content; if something downstream throws, this is what stays visible
     * instead of an empty/error widget.
     */
    private void pushSafeInitialView(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews bare = new RemoteViews(context.getPackageName(), R.layout.widget_upcoming_orders);
            appWidgetManager.updateAppWidget(appWidgetId, bare);
        } catch (Exception e) {
            Log.e(TAG, "Failed to push safe initial view for widget " + appWidgetId, e);
            return;
        }

        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_upcoming_orders);
            setOpenAdminIntent(context, views);
            setRefreshIntent(context, views);

            // Connect remote adapter immediately to display cached orders without waiting for network
            Intent listIntent = new Intent(context, WidgetRemoteViewsService.class);
            listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            listIntent.setData(android.net.Uri.parse(listIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_orders_list, listIntent);
            views.setEmptyView(R.id.widget_orders_list, R.id.widget_empty_view);

            Intent rowClickIntent = new Intent(context, OrderDetailActivity.class);
            rowClickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent rowClickTemplate = PendingIntent.getActivity(
                context, 0, rowClickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            views.setPendingIntentTemplate(R.id.widget_orders_list, rowClickTemplate);

            appWidgetManager.updateAppWidget(appWidgetId, views);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_orders_list);
        } catch (Exception e) {
            // Bare layout (pushed above) is already showing; click intents
            // just won't be wired until the next successful update.
            Log.w(TAG, "Failed to wire click intents and adapter for widget " + appWidgetId, e);
        }
    }

    private void setOpenAdminIntent(Context context, RemoteViews views) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(EXTRA_OPEN_ADMIN, true);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_title, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_header_bar, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_today_summary, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_empty_view, pendingIntent);
    }

    private void setRefreshIntent(Context context, RemoteViews views) {
        Intent refreshIntent = new Intent(context, WawasanWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
            context, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
        try {
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_orders_list);
        } catch (Exception e) {
            Log.w(TAG, "onAppWidgetOptionsChanged failed for widget " + appWidgetId, e);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) {
            return;
        }

        String action = intent.getAction();

        // Handle adb broadcast where ACTION_APPWIDGET_UPDATE is sent without EXTRA_APPWIDGET_IDS
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            int[] ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
            if (ids == null || ids.length == 0) {
                AppWidgetManager manager = AppWidgetManager.getInstance(context);
                int[] activeIds = manager.getAppWidgetIds(new ComponentName(context, WawasanWidgetProvider.class));
                if (activeIds != null && activeIds.length > 0) {
                    onUpdate(context, manager, activeIds);
                }
            }
            return;
        }

        if (!ACTION_REFRESH.equals(action)) {
            return;
        }

        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, WawasanWidgetProvider.class));
            BroadcastReceiver.PendingResult pendingResult = goAsync();
            WidgetUpdateService.fetchAndUpdate(context, ids, pendingResult);
        } catch (Exception e) {
            Log.w(TAG, "Manual refresh failed", e);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // First widget instance placed on the home screen.
    }

    @Override
    public void onDisabled(Context context) {
        // Last widget instance removed from the home screen.
    }
}
