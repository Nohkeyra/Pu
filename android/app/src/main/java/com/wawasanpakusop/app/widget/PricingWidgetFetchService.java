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

import com.wawasanpakusop.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.wawasanpakusop.app.security.SecureStorage;
import com.wawasanpakusop.app.telemetry.NativeCrashReporter;

/**
 * Fetches today's pending/approved orders (with menu + pax, no other PII)
 * from the secured /api/widget/today-pricing-orders endpoint, caches the raw
 * JSON securely using EncryptedSharedPreferences,
 * then triggers Glance widget updates.
 */
public class PricingWidgetFetchService {

    private static final String API_BASE_URL = "https://restoran-wawasan-bio.onrender.com";
    private static final String ENDPOINT = "/api/widget/today-pricing-orders";
    private static final int TIMEOUT_MS = 15000;

    public static final String PREF_ORDERS_JSON = "cached_pricing_orders_json";

    static final String WIDGET_API_KEY = com.wawasanpakusop.app.BuildConfig.WIDGET_API_KEY;

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void fetchAndUpdate(Context context, int[] appWidgetIds, BroadcastReceiver.PendingResult pendingResult) {
        executor.execute(() -> {
            String ordersJson = null;
            boolean success = false;
            String errorReason = null;

            try {
                String effectiveKey = SecureStorage.INSTANCE.getWidgetKey(context);
                if (effectiveKey == null || effectiveKey.isEmpty()) {
                    effectiveKey = WIDGET_API_KEY;
                }
                String adminToken = SecureStorage.INSTANCE.getAdminToken(context);

                URL url = new URL(API_BASE_URL + ENDPOINT);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                if (effectiveKey != null && !effectiveKey.isEmpty()) {
                    conn.setRequestProperty("x-widget-key", effectiveKey);
                }
                if (adminToken != null && !adminToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + adminToken);
                }
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
                } else if (code == 401 || code == 403) {
                    errorReason = "Pengesahan gagal (Kunci/Akses ditolak).";
                } else {
                    errorReason = "Server ralat (HTTP " + code + ")";
                }
                conn.disconnect();
            } catch (Exception e) {
                success = false;
                errorReason = "Tiada sambungan internet.";
                NativeCrashReporter.INSTANCE.recordException(e, java.util.Collections.singletonMap("component", "PricingWidgetFetchService"));
            }

            if (success && ordersJson != null) {
                SecureStorage.INSTANCE.saveString(context, PREF_ORDERS_JSON, ordersJson);
                // Drain any pending offline price updates when connectivity is confirmed
                OfflinePricingQueue.INSTANCE.flushQueueAsync(context, null);
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
        com.wawasanpakusop.app.widgets.PricingWidgetUpdater.refresh(context);
    }
}
