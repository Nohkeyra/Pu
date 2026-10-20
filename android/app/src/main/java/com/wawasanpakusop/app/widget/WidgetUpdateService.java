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
import android.view.View;

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
    static final String PREF_LAST_SUCCESS_AT = "cached_orders_last_success_at";

    // If a refresh fails and the cache hasn't been successfully updated in
    // this long, the cache is treated as stale rather than silently shown
    // as if it were current. updatePeriodMillis is 30 min, so 2 hours means
    // several refresh cycles in a row have failed — a real signal, not one
    // transient network blip.
    private static final long STALE_THRESHOLD_MS = 2L * 60 * 60 * 1000;

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
                prefs.edit()
                    .putString(PREF_ORDERS_JSON, ordersJson)
                    .putLong(PREF_LAST_SUCCESS_AT, System.currentTimeMillis())
                    .apply();
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
        com.wawasanpakusop.app.widgets.UpcomingOrdersWidgetUpdater.refresh(context);
    }
}
