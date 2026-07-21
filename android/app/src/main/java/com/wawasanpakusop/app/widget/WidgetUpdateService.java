package com.wawasanpakusop.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fetches the nearest upcoming orders from the production backend, caches
 * the raw JSON to SharedPreferences (so WidgetListFactory can read it from
 * its own process), then tells Android the ListView's data changed.
 */
public class WidgetUpdateService {

    private static final String API_BASE_URL = "https://restoran-wawasan-bio.onrender.com";
    private static final String ENDPOINT = "/api/widget/upcoming-orders?limit=5";
    private static final int TIMEOUT_MS = 15000;

    static final String PREFS_NAME = "wawasan_widget_prefs";
    static final String PREF_ORDERS_JSON = "cached_orders_json";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void fetchAndUpdate(Context context, int[] appWidgetIds) {
        executor.execute(() -> {
            String ordersJson = null;
            boolean success = false;

            try {
                URL url = new URL(API_BASE_URL + ENDPOINT);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(TIMEOUT_MS);
                conn.setReadTimeout(TIMEOUT_MS);

                if (conn.getResponseCode() == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();

                    JSONObject json = new JSONObject(sb.toString());
                    if (json.optBoolean("success", false)) {
                        ordersJson = json.getJSONArray("orders").toString();
                        success = true;
                    }
                }
                conn.disconnect();
            } catch (Exception e) {
                success = false;
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (success) {
                prefs.edit().putString(PREF_ORDERS_JSON, ordersJson).apply();
            }

            final boolean finalSuccess = success;
            new Handler(Looper.getMainLooper()).post(() ->
                applyUpdate(context, appWidgetIds, finalSuccess)
            );
        });
    }

    private static void applyUpdate(Context context, int[] appWidgetIds, boolean fetchSucceeded) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String cachedJson = prefs.getString(PREF_ORDERS_JSON, null);
        boolean hasData = cachedJson != null && !cachedJson.equals("[]");

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_upcoming_orders);

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.putExtra("open_admin_panel", true);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openPendingIntent = PendingIntent.getActivity(
                context, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_title, openPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_empty_view, openPendingIntent);

            Intent listIntent = new Intent(context, WidgetRemoteViewsService.class);
            listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            listIntent.setData(android.net.Uri.parse(listIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_orders_list, listIntent);
            views.setEmptyView(R.id.widget_orders_list, R.id.widget_empty_view);

            // Each row in the list supplies its own "fill-in" intent (set in
            // WidgetListFactory) with the specific order's data; this template
            // is what makes that click actually launch the app.
            Intent rowClickIntent = new Intent(context, MainActivity.class);
            rowClickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent rowClickTemplate = PendingIntent.getActivity(
                context, 0, rowClickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            views.setPendingIntentTemplate(R.id.widget_orders_list, rowClickTemplate);

            if (!hasData) {
                views.setTextViewText(
                    R.id.widget_empty_view,
                    fetchSucceeded ? "No upcoming orders" : "Unable to load orders"
                );
            }

            manager.updateAppWidget(appWidgetId, views);
        }

        manager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_orders_list);
    }
}
