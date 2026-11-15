package com.wawasanpakusop.app.security;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.wawasanpakusop.app.widgets.PricingWidgetUpdater;
import com.wawasanpakusop.app.widgets.UpcomingOrdersWidgetUpdater;
import com.wawasanpakusop.app.widgets.WidgetTokenRefreshWorker;

@CapacitorPlugin(name = "AdminTokenBridge")
public class AdminTokenBridgePlugin extends Plugin {
    @PluginMethod
    public void saveToken(PluginCall call) {
        String token = call.getString("token");
        if (token == null || token.trim().isEmpty()) {
            call.reject("A non-empty admin token is required.");
            return;
        }
        try {
            SecureStorage.saveAdminToken(getContext(), token);
            SecureStorage.setWidgetAuthExpired(getContext(), false);
            WidgetTokenRefreshWorker.schedulePeriodic(getContext());
            PricingWidgetUpdater.refresh(getContext());
            UpcomingOrdersWidgetUpdater.refresh(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure admin session storage is unavailable.", e);
        }
    }

    @PluginMethod
    public void clearToken(PluginCall call) {
        try {
            com.wawasanpakusop.app.rider.RiderLocationService.stopSharing(getContext());
            WidgetTokenRefreshWorker.cancel(getContext());
            SecureStorage.saveAdminToken(getContext(), null);
            SecureStorage.setWidgetAuthExpired(getContext(), false);
            SecureStorage.saveString(getContext(), SecureStorage.KEY_CACHED_PRICING_ORDERS, null);
            SecureStorage.saveString(getContext(), "cached_pricing_orders_json", null);
            getContext().getSharedPreferences("wawasan_widget_prefs", android.content.Context.MODE_PRIVATE)
                .edit().remove("cached_orders_json").remove("cached_orders_last_success_at").apply();
            PricingWidgetUpdater.refresh(getContext());
            UpcomingOrdersWidgetUpdater.refresh(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not clear native admin session securely.", e);
        }
    }
}
