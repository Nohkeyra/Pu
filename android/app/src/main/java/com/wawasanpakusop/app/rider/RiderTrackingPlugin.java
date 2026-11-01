package com.wawasanpakusop.app.rider;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.wawasanpakusop.app.security.SecureStorage;

@CapacitorPlugin(name = "RiderTracking", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class RiderTrackingPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationResult");
            return;
        }
        locationResult(call);
    }

    @PermissionCallback
    private void locationResult(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Precise location permission is required.", "PERMISSION_DENIED"); return;
        }
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationResult"); return;
        }
        notificationResult(call);
    }

    @PermissionCallback
    private void notificationResult(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Allow notifications to keep the stop control visible.", "NOTIFICATION_REQUIRED"); return;
        }
        String orderId = call.getString("orderId", "");
        String sessionId = call.getString("sessionId", "");
        if (!orderId.matches("^[A-Za-z0-9_-]{1,100}$") || !sessionId.matches("^[A-Za-z0-9_-]{16,80}$")) {
            call.reject("Invalid tracking session.", "INVALID_SESSION"); return;
        }
        if (!getActivity().getLifecycle().getCurrentState().isAtLeast(androidx.lifecycle.Lifecycle.State.STARTED)) {
            call.reject("Open the app to start sharing.", "APP_NOT_VISIBLE"); return;
        }
        LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (manager == null || (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER) && !manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))) {
            call.reject("Turn on device location.", "GPS_DISABLED"); return;
        }
        try {
            String token = SecureStorage.getAdminToken(getContext());
            if (token == null || token.isEmpty()) { call.reject("Sign in again.", "AUTH_REQUIRED"); return; }
            Intent intent = new Intent(getContext(), RiderLocationService.class).putExtra("orderId", orderId).putExtra("sessionId", sessionId);
            ContextCompat.startForegroundService(getContext(), intent);
            com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
            result.put("active", true); result.put("orderId", orderId); result.put("sessionId", sessionId); result.put("phase", "acquiring");
            call.resolve(result);
        } catch (Exception error) { call.reject("Could not start location sharing.", "START_FAILED"); }
    }

    @PluginMethod public void getState(PluginCall call) { call.resolve(RiderLocationService.getState()); }
    @PluginMethod public void stop(PluginCall call) { RiderLocationService.stopSharing(getContext(), () -> call.resolve(RiderLocationService.getState())); }
}
