package com.wawasanpakusop.app.widget;

import android.content.Intent;
import android.widget.RemoteViewsService;

/**
 * Required boilerplate: Android widgets cannot bind a ListView's adapter
 * directly (RemoteViews runs in a different process). This service is the
 * bridge — it hands back a RemoteViewsFactory that supplies one row per order.
 */
public class WidgetRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetListFactory(getApplicationContext());
    }
}
