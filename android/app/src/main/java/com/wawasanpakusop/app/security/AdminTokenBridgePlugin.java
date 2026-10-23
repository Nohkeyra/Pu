package com.wawasanpakusop.app.security;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure admin session storage is unavailable.", e);
        }
    }

    @PluginMethod
    public void clearToken(PluginCall call) {
        try {
            SecureStorage.saveAdminToken(getContext(), null);
            SecureStorage.saveString(getContext(), SecureStorage.KEY_CACHED_PRICING_ORDERS, null);
            SecureStorage.saveString(getContext(), "cached_pricing_orders_json", null);
            getContext().getSharedPreferences("wawasan_widget_prefs", android.content.Context.MODE_PRIVATE)
                .edit().remove("cached_orders_json").remove("cached_orders_last_success_at").apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not clear native admin session securely.", e);
        }
    }
}
