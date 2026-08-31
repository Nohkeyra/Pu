package com.wawasanpakusop.app.widget;

import android.content.Intent;
import android.widget.RemoteViewsService;

/**
 * Hosts PricingWidgetListFactory for the pricing widget's ListView, same
 * pattern as the existing WidgetRemoteViewsService for the upcoming-orders
 * widget.
 */
public class PricingWidgetRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new PricingWidgetListFactory(this.getApplicationContext(), intent);
    }
}
