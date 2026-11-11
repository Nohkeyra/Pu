package com.wawasanpakusop.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.wawasanpakusop.app.security.SecureStorage;
import com.wawasanpakusop.app.telemetry.NativeCrashReporter;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fetches today's pricing orders from the secured endpoint, stores the result
 * in encrypted preferences and triggers the Glance refresh once the request ends.
 */
public class PricingWidgetFetchService {

    private static final String API_BASE_URL = "https://restoran-wawasan-bio.onrender.com";
    private static final String ENDPOINT = "/api/widget/today-pricing-orders";
    private static final int TIMEOUT_MS = 15000;

    public static final String PREF_ORDERS_JSON = "cached_pricing_orders_json";
    public static final String PREF_LAST_SUCCESS_AT = "cached_pricing_orders_last_success_at";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static void fetchAndUpdate(Context context, int[] appWidgetIds, BroadcastReceiver.PendingResult pendingResult) {
        executor.execute(() -> {
            String ordersJson = null;
            boolean success = false;
            boolean authRejected = false;
            String errorReason = null;

            HttpURLConnection conn = null;
            try {
                String adminToken = SecureStorage.INSTANCE.getAdminToken(context);
                if (adminToken == null || adminToken.isEmpty()) {
                    authRejected = true;
                    errorReason = "Sila buka aplikasi dan log masuk sebagai admin untuk menyegarkan widget.";
                    throw new SecurityException("Missing admin session token");
                }

                URL url = new URL(API_BASE_URL + ENDPOINT);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + adminToken);
                conn.setConnectTimeout(TIMEOUT_MS);
                conn.setReadTimeout(TIMEOUT_MS);

                int code = conn.getResponseCode();
                if (code == 200) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);

                        JSONObject json = new JSONObject(sb.toString());
                        if (json.optBoolean("success", false) && json.has("orders")) {
                            ordersJson = json.getJSONArray("orders").toString();
                            success = true;
                        }
                    }
                } else if (code == 401 || code == 403) {
                    authRejected = true;
                    errorReason = "Sesi admin tamat atau akses ditolak. Buka aplikasi dan log masuk semula.";
                } else {
                    errorReason = "Server ralat (HTTP " + code + ")";
                }
            } catch (Exception e) {
                success = false;
                if (errorReason == null) {
                    errorReason = "Tiada sambungan internet.";
                }
                if (!(e instanceof SecurityException)) {
                    NativeCrashReporter.INSTANCE.recordException(e, java.util.Collections.singletonMap("component", "PricingWidgetFetchService"));
                }
            } finally {
                if (conn != null) conn.disconnect();
            }

            // Cache content and timestamp in one encrypted preferences transaction.
            // Never keep previously cached admin order data after logout or denial.
            try {
                if (authRejected) {
                    SecureStorage.INSTANCE.getPrefs(context).edit()
                        .remove(PREF_ORDERS_JSON)
                        .remove(PREF_LAST_SUCCESS_AT)
                        .apply();
                } else if (success && ordersJson != null) {
                    SecureStorage.INSTANCE.getPrefs(context).edit()
                        .putString(PREF_ORDERS_JSON, ordersJson)
                        .putString(PREF_LAST_SUCCESS_AT, Long.toString(System.currentTimeMillis()))
                        .apply();
                    // Drain pending offline price updates only after connectivity is confirmed.
                    OfflinePricingQueue.INSTANCE.flushQueueAsync(context, null);
                }
            } catch (Exception e) {
                android.util.Log.e("PricingWidgetFetchService", "Could not persist secure widget cache", e);
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
