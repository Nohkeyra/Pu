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

import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fetches the nearest upcoming orders from the production backend, caches
 * the raw JSON to SharedPreferences (so WidgetListFactory can read it from
 * its own process), then tells Android the ListView's data changed.
 */
public class WidgetUpdateService {

    private static final String API_BASE_URL = "https://restoran-wawasan-bio.onrender.com";
    private static final String ENDPOINT = "/api/widget/upcoming-orders?limit=50";
    private static final int TIMEOUT_MS = 15000;

    static final String PREFS_NAME = "wawasan_widget_prefs";
    static final String PREF_ORDERS_JSON = "cached_orders_json";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void fetchAndUpdate(Context context, int[] appWidgetIds, BroadcastReceiver.PendingResult pendingResult) {
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
                    if (json.optBoolean("success", false) && json.has("orders")) {
                        ordersJson = json.getJSONArray("orders").toString();
                        success = true;
                    }
                }
                conn.disconnect();
            } catch (Exception e) {
                success = false;
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (success && ordersJson != null) {
                prefs.edit().putString(PREF_ORDERS_JSON, ordersJson).apply();
            }

            final boolean finalSuccess = success;
            new Handler(Looper.getMainLooper()).post(() -> {
                applyUpdate(context, appWidgetIds, finalSuccess);
                if (pendingResult != null) {
                    pendingResult.finish();
                }
            });
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
            views.setOnClickPendingIntent(R.id.widget_header_bar, openPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_today_summary, openPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_empty_view, openPendingIntent);

            // Manual Refresh Intent
            Intent refreshIntent = new Intent(context, WawasanWidgetProvider.class);
            refreshIntent.setAction(WawasanWidgetProvider.ACTION_REFRESH);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 1, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent);

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
                    fetchSucceeded 
                        ? "Tiada Tempahan Terdekat\nKetik untuk buka sistem pengurusan" 
                        : "Gagal memuatkan data\nKetik untuk cuba semula atau buka sistem"
                );
            }

            // Calculate today & future orders summary
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            int todayOrders = 0;
            int todayPax = 0;
            int futureOrders = 0;
            String earliestFutureDate = null;

            try {
                JSONArray arr = new JSONArray(cachedJson != null ? cachedJson : "[]");
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject o = arr.getJSONObject(i);
                    String orderDate = o.optString("date", "");
                    if (orderDate.isEmpty()) {
                        orderDate = o.optString("eventDate", "");
                    }
                    if (orderDate.length() >= 10 && orderDate.charAt(4) == '-' && orderDate.charAt(7) == '-') {
                        orderDate = orderDate.substring(0, 10);
                    }
                    int qty = o.optInt("quantity", 0);

                    if (orderDate.equals(todayStr)) {
                        todayOrders++;
                        todayPax += qty;
                    } else if (orderDate.compareTo(todayStr) > 0) {
                        futureOrders++;
                        if (earliestFutureDate == null || orderDate.compareTo(earliestFutureDate) < 0) {
                            earliestFutureDate = orderDate;
                        }
                    }
                }
            } catch (Exception ignored) {}

            String summaryText;
            if (todayOrders > 0) {
                if (futureOrders > 0) {
                    summaryText = "⚡ Hari Ini: " + todayPax + " Pax (" + todayOrders + ")  •  📅 Akan Datang: " + futureOrders;
                } else {
                    summaryText = "⚡ Hari Ini: " + todayPax + " Pax  •  " + todayOrders + " Tempahan";
                }
            } else if (futureOrders > 0 && earliestFutureDate != null) {
                String formattedNearest = formatShortDate(earliestFutureDate);
                summaryText = "📅 Terdekat: " + formattedNearest + "  •  " + futureOrders + " Tempahan Hadapan";
            } else {
                summaryText = "✓ Tiada tempahan aktif buat masa ini";
            }

            views.setTextViewText(R.id.widget_today_summary, summaryText);

            manager.updateAppWidget(appWidgetId, views);
        }

        manager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_orders_list);
    }

    private static String formatShortDate(String dateStr) {
        if (dateStr == null || dateStr.length() < 10) return dateStr;
        try {
            SimpleDateFormat inFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date d = inFmt.parse(dateStr.substring(0, 10));
            if (d == null) return dateStr;
            Calendar cal = Calendar.getInstance();
            cal.setTime(d);
            int day = cal.get(Calendar.DAY_OF_MONTH);
            int m = cal.get(Calendar.MONTH);
            String[] months = {"Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"};
            return day + " " + months[m];
        } catch (Exception e) {
            return dateStr;
        }
    }
}
