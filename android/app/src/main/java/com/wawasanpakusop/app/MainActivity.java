package com.wawasanpakusop.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleWidgetIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra("open_admin_panel", false)) {
            // The web app uses HashRouter, so navigating within the SPA just
            // means changing window.location.hash — no page reload needed.
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.location.hash = '#/admin';", null
                )
            );
        }
    }

    @Override
    public void onBackPressed() {
        // With HashRouter, in-app navigation (e.g. landing -> /admin) changes
        // the hash but doesn't always leave a WebView history entry the way
        // a normal multi-page site would. Explicitly check canGoBack() first
        // so the physical/gesture back button steps back through the SPA's
        // own navigation before falling through to exiting the app —
        // otherwise Android has nothing to "go back" to and either exits
        // immediately or reloads from a blank state.
        WebView webView = getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
