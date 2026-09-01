package com.wawasanpakusop.app.widget;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.wawasanpakusop.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Supplies each row of the pricing widget's ListView from the cached JSON
 * written by PricingWidgetFetchService. One row per order that still needs
 * a price (or was already billed today, shown with a "Sudah Dibil" state).
 */
public class PricingWidgetListFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private List<PricingOrderRow> rows = new ArrayList<>();

    static class PricingOrderRow {
        String id;
        String companyName;
        String menu;
        int quantity;
        String mealsLabel;
        String status;

        PricingOrderRow(String id, String companyName, String menu, int quantity, String mealsLabel, String status) {
            this.id = id;
            this.companyName = companyName;
            this.menu = menu;
            this.quantity = quantity;
            this.mealsLabel = mealsLabel;
            this.status = status;
        }
    }

    PricingWidgetListFactory(Context context, Intent intent) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        loadData();
    }

    @Override
    public void onDataSetChanged() {
        loadData();
    }

    private void loadData() {
        rows = new ArrayList<>();
        SharedPreferences prefs = context.getSharedPreferences(
            PricingWidgetFetchService.PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(PricingWidgetFetchService.PREF_ORDERS_JSON, "[]");

        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String mealsLabel = buildMealsLabel(o.optJSONArray("meals"));
                rows.add(new PricingOrderRow(
                    o.optString("id", ""),
                    o.optString("to", "Pelanggan"),
                    o.optString("menu", "-"),
                    o.optInt("quantity", 0),
                    mealsLabel,
                    o.optString("status", "pending")
                ));
            }
        } catch (Exception ignored) {}
    }

    private String buildMealsLabel(JSONArray meals) {
        if (meals == null || meals.length() == 0) return "Tempahan";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < meals.length(); i++) {
            String m = meals.optString(i, "");
            String label;
            switch (m) {
                case "breakfast": label = "Sarapan"; break;
                case "lunch": label = "Tengahari"; break;
                case "hi_tea": label = "Hi-Tea"; break;
                default: label = m; break;
            }
            if (sb.length() > 0) sb.append(" + ");
            sb.append(label);
        }
        return sb.length() > 0 ? sb.toString() : "Tempahan";
    }

    @Override
    public void onDestroy() {
        rows.clear();
    }

    @Override
    public int getCount() {
        return rows.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.widget_pricing_order_item);
        PricingOrderRow row = rows.get(position);

        view.setTextViewText(R.id.pricing_item_company, row.companyName);
        view.setTextViewText(R.id.pricing_item_pax, row.quantity + " pax");
        view.setTextViewText(R.id.pricing_item_menu, "Menu: " + row.menu);
        view.setTextViewText(R.id.pricing_item_meals, row.mealsLabel);

        boolean isBilled = "billed".equals(row.status);
        view.setTextViewText(R.id.pricing_item_action_btn, isBilled ? "✓ Harga Ditetapkan" : "⚡ Tetapkan Harga");

        // Fill-in intent: carries this specific order's ID to PricingInputActivity
        // via the PendingIntentTemplate set on the ListView in PricingWidgetFetchService.
        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("order_id", row.id);
        fillInIntent.putExtra("company_name", row.companyName);
        fillInIntent.putExtra("menu", row.menu);
        fillInIntent.putExtra("quantity", row.quantity);
        fillInIntent.putExtra("meals_label", row.mealsLabel);
        fillInIntent.putExtra("is_billed", isBilled);
        view.setOnClickFillInIntent(R.id.pricing_item_action_btn, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_meals, fillInIntent);

        return view;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
