package com.wawasanpakusop.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;

/**
 * Home-screen widget that shows the nearest upcoming catering orders.
 * Data is fetched from the Render backend's /api/widget/upcoming-orders
 * endpoint by WidgetUpdateService, which then pushes the result back here
 * via updateAppWidget().
 */
public class WawasanWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_REFRESH = "com.wawasanpakusop.app.widget.ACTION_REFRESH";
    public static final String EXTRA_OPEN_ADMIN = "open_admin_panel";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            // Show a lightweight "loading" state immediately, then kick off
            // the network fetch which will update the view when it completes.
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_upcoming_orders);
            setOpenAdminIntent(context, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
        WidgetUpdateService.fetchAndUpdate(context, appWidgetIds);
    }

    private void setOpenAdminIntent(Context context, RemoteViews views) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(EXTRA_OPEN_ADMIN, true);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_title, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_empty_view, pendingIntent);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new android.content.ComponentName(context, WawasanWidgetProvider.class)
            );
            WidgetUpdateService.fetchAndUpdate(context, ids);
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
