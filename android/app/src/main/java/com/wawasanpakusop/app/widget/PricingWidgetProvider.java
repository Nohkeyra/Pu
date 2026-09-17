package com.wawasanpakusop.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.RemoteViews;

import com.wawasanpakusop.app.R;

/**
 * Second, separate home-screen widget dedicated to setting prices on today's
 * orders and auto-emailing the final invoice -- independent from
 * WawasanWidgetProvider (the read-only upcoming-orders list widget).
 *
 * Same defensive pattern as WawasanWidgetProvider: a bare-safe view is
 * pushed synchronously first, and everything that can throw (PendingIntent
 * construction, broadcast dispatch) is caught so it degrades instead of
 * failing the whole widget placement.
 */
public class PricingWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "PricingWidgetProvider";

    public static final String ACTION_REFRESH = "com.wawasanpakusop.app.widget.PRICING_ACTION_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            pushSafeInitialView(context, appWidgetManager, appWidgetId);
        }

        try {
            BroadcastReceiver.PendingResult pendingResult = goAsync();
            PricingWidgetFetchService.fetchAndUpdate(context, appWidgetIds, pendingResult);
        } catch (Exception e) {
            Log.w(TAG, "fetchAndUpdate dispatch failed", e);
        }
    }

    /**
     * Renders the plain, guaranteed-inflatable layout immediately so
     * something is always on screen the instant the widget is placed,
     * before PricingWidgetFetchService's PendingIntents / network-touching
     * code has a chance to run.
     */
    private void pushSafeInitialView(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews bare = new RemoteViews(context.getPackageName(), R.layout.widget_pricing);
            appWidgetManager.updateAppWidget(appWidgetId, bare);
        } catch (Exception e) {
            Log.e(TAG, "Failed to push safe initial view for widget " + appWidgetId, e);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
        try {
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.pricing_widget_orders_list);
        } catch (Exception e) {
            Log.w(TAG, "onAppWidgetOptionsChanged failed for widget " + appWidgetId, e);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || !ACTION_REFRESH.equals(intent.getAction())) {
            return;
        }
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, PricingWidgetProvider.class));
            BroadcastReceiver.PendingResult pendingResult = goAsync();
            PricingWidgetFetchService.fetchAndUpdate(context, ids, pendingResult);
        } catch (Exception e) {
            Log.w(TAG, "Manual refresh failed", e);
        }
    }

    /**
     * Called by PricingInputActivity after a successful save, so the widget
     * refreshes immediately (shows "Sudah Dibil") without waiting for the
     * next 30-minute updatePeriodMillis cycle.
     */
    public static void requestRefresh(Context context) {
        try {
            Intent intent = new Intent(context, PricingWidgetProvider.class);
            intent.setAction(ACTION_REFRESH);
            context.sendBroadcast(intent);
        } catch (Exception e) {
            Log.w(TAG, "requestRefresh failed", e);
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
