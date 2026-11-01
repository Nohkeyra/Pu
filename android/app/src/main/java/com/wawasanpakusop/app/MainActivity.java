package com.wawasanpakusop.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.wawasanpakusop.app.security.AdminTokenBridgePlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdminTokenBridgePlugin.class);
        registerPlugin(com.wawasanpakusop.app.rider.RiderTrackingPlugin.class);
        super.onCreate(savedInstanceState);

        // Initialize centralized crash reporter for native threads and uncaught exceptions
        com.wawasanpakusop.app.telemetry.NativeCrashReporter.INSTANCE.initialize(getApplicationContext());

        // Optimize WebView rendering performance & hardware acceleration
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setLoadsImagesAutomatically(true);
            settings.setUserAgentString(settings.getUserAgentString() + " RestoranWawasan/" + BuildConfig.VERSION_NAME + " (https://github.com/Nohkeyra/Pu)");
        }

        // Native back button handling for API 33+
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        if (savedInstanceState == null) {
            handleWidgetIntent(getIntent());
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        // Fix: Ensure intent is explicit and strictly from our widget package
        if (intent != null && intent.getBooleanExtra("open_admin_panel", false)) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Post to main queue without replacing BridgeWebViewClient
                String orderId = intent.getStringExtra("rider_order_id");
                String script = orderId != null && orderId.matches("^[A-Za-z0-9_-]{1,100}$")
                    ? "sessionStorage.setItem('wawasan_open_rider_order', " + org.json.JSONObject.quote(orderId) + "); window.location.hash = '#/admin'; window.dispatchEvent(new Event('rider:open-order'));"
                    : "window.location.hash = '#/admin';";
                webView.post(() -> webView.evaluateJavascript(script, null));
            }
        }
    }
}
