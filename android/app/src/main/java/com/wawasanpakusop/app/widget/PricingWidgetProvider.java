package com.wawasanpakusop.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * Second, separate home-screen widget dedicated to setting prices on today's
 * orders and auto-emailing the final invoice — independent from
 * WawasanWidgetProvider (the read-only upcoming-orders list widget).
 */
public class PricingWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_REFRESH = "com.wawasanpakusop.app.widget.PRICING_ACTION_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        PendingResult pendingResult = goAsync();
        PricingWidgetFetchService.fetchAndUpdate(context, appWidgetIds, pendingResult);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new android.content.ComponentName(context, PricingWidgetProvider.class)
            );
            PendingResult pendingResult = goAsync();
            PricingWidgetFetchService.fetchAndUpdate(context, ids, pendingResult);
        }
    }

    /**
     * Called by PricingInputActivity after a successful save, so the widget
     * refreshes immediately (shows "Sudah Dibil") without waiting for the
     * next 30-minute updatePeriodMillis cycle.
     */
    public static void requestRefresh(Context context) {
        Intent intent = new Intent(context, PricingWidgetProvider.class);
        intent.setAction(ACTION_REFRESH);
        context.sendBroadcast(intent);
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
