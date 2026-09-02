package com.wawasanpakusop.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import com.wawasanpakusop.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fetches today's pending/approved orders (with menu + pax, no other PII)
 * from the secured /api/widget/today-pricing-orders endpoint, caches the raw
 * JSON to SharedPreferences (read by PricingWidgetListFactory), then tells
 * Android the ListView's data changed.
 *
 * Mirrors WidgetUpdateService's pattern but hits a widget-key-protected
 * endpoint instead of the fully public one, since this response includes
 * menu text and is a write-capable pipeline (pricing/invoice generation).
 */
public class PricingWidgetFetchService {

    private static final String API_BASE_URL = "https://restoran-wawasan-bio.onrender.com";
    private static final String ENDPOINT = "/api/widget/today-pricing-orders";
    private static final int TIMEOUT_MS = 15000;

    static final String PREFS_NAME = "wawasan_pricing_widget_prefs";
    static final String PREF_ORDERS_JSON = "cached_pricing_orders_json";

    // Widget API key — must match WIDGET_API_KEY env var on Render.
    // Stored here as a build constant (this is a self-distributed sideload
    // APK, not published, so an embedded key is an acceptable trade-off vs.
    // the complexity of a secure runtime secret store for a solo-dev app).
    static final String WIDGET_API_KEY = com.wawasanpakusop.app.BuildConfig.WIDGET_API_KEY;

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void fetchAndUpdate(Context context, int[] appWidgetIds, BroadcastReceiver.PendingResult pendingResult) {
        executor.execute(() -> {
            String ordersJson = null;
            boolean success = false;
            String errorReason = null;

            try {
                URL url = new URL(API_BASE_URL + ENDPOINT);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("x-widget-key", WIDGET_API_KEY);
                conn.setConnectTimeout(TIMEOUT_MS);
                conn.setReadTimeout(TIMEOUT_MS);

                int code = conn.getResponseCode();
                if (code == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();

                    JSONObject json = new JSONObject(sb.toString());
                    if (json.optBoolean("success", false) && json.has("orders")) {
                        ordersJson = json.getJSONArray("orders").toString();
                        success = true;
                    }
                } else if (code == 401) {
                    errorReason = "Widget key salah / tidak sepadan dengan server.";
                } else {
                    errorReason = "Server ralat (HTTP " + code + ")";
                }
                conn.disconnect();
            } catch (Exception e) {
                success = false;
                errorReason = "Tiada sambungan internet.";
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (success && ordersJson != null) {
                prefs.edit().putString(PREF_ORDERS_JSON, ordersJson).apply();
            }

            final boolean finalSuccess = success;
            final String finalError = errorReason;
            new Handler(Looper.getMainLooper()).post(() -> {
                applyUpdate(context, appWidgetIds, finalSuccess, finalError);
                if (pendingResult != null) {
                    pendingResult.finish();
                }
            });
        });
    }

    private static void applyUpdate(Context context, int[] appWidgetIds, boolean fetchSucceeded, String errorReason) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String cachedJson = prefs.getString(PREF_ORDERS_JSON, null);
        boolean hasData = cachedJson != null && !cachedJson.equals("[]");

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_pricing);

            // Refresh button
            Intent refreshIntent = new Intent(context, PricingWidgetProvider.class);
            refreshIntent.setAction(PricingWidgetProvider.ACTION_REFRESH);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 2, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.pricing_widget_refresh_button, refreshPendingIntent);
            views.setOnClickPendingIntent(R.id.pricing_widget_header_bar, refreshPendingIntent);
            views.setOnClickPendingIntent(R.id.pricing_widget_empty_view, refreshPendingIntent);

            Intent listIntent = new Intent(context, PricingWidgetRemoteViewsService.class);
            listIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            listIntent.setData(android.net.Uri.parse(listIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.pricing_widget_orders_list, listIntent);
            views.setEmptyView(R.id.pricing_widget_orders_list, R.id.pricing_widget_empty_view);

            // Each row supplies its own fillInIntent with orderId (set in
            // PricingWidgetListFactory) — this template makes taps launch
            // PricingInputActivity with that specific order's data.
            Intent rowClickIntent = new Intent(context, PricingInputActivity.class);
            rowClickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_HISTORY);
            PendingIntent rowClickTemplate = PendingIntent.getActivity(
                context, 0, rowClickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            views.setPendingIntentTemplate(R.id.pricing_widget_orders_list, rowClickTemplate);

            if (!hasData) {
                String emptyMsg;
                if (!fetchSucceeded) {
                    emptyMsg = (errorReason != null ? errorReason : "Gagal memuatkan data") + "\nKetik untuk cuba semula";
                } else {
                    emptyMsg = "✓ Tiada tempahan tertunggak harga\nSemua tempahan telah dikey-in harga";
                }
                views.setTextViewText(R.id.pricing_widget_empty_view, emptyMsg);
            }

            // Summary pill: count of orders still needing a price (past & new)
            int pendingCount = 0;
            int pastCount = 0;
            int totalPax = 0;
            try {
                JSONArray arr = new JSONArray(cachedJson != null ? cachedJson : "[]");
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject o = arr.getJSONObject(i);
                    totalPax += o.optInt("quantity", 0);
                    if (!"billed".equals(o.optString("status", ""))) {
                        pendingCount++;
                        if (o.optBoolean("isPast", false)) {
                            pastCount++;
                        }
                    }
                }
            } catch (Exception ignored) {}

            String summaryText;
            if (pendingCount > 0) {
                summaryText = "⚡ " + pendingCount + " belum key-in harga" + (pastCount > 0 ? " (" + pastCount + " lalu)" : "") + "  •  " + totalPax + " pax";
            } else if (hasData || fetchSucceeded) {
                summaryText = "✓ Semua tempahan telah dikey-in harga";
            } else {
                summaryText = "Memuatkan...";
            }
            views.setTextViewText(R.id.pricing_widget_summary, summaryText);

            manager.updateAppWidget(appWidgetId, views);
        }

        manager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.pricing_widget_orders_list);
    }
}
