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
        String dateBadge;
        boolean isPast;
        String location;

        PricingOrderRow(String id, String companyName, String menu, int quantity, String mealsLabel, String status, String dateBadge, boolean isPast, String location) {
            this.id = id;
            this.companyName = companyName;
            this.menu = menu;
            this.quantity = quantity;
            this.mealsLabel = mealsLabel;
            this.status = status;
            this.dateBadge = dateBadge;
            this.isPast = isPast;
            this.location = location;
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
                boolean isPast = o.optBoolean("isPast", false);
                boolean isToday = o.optBoolean("isToday", false);
                String rawDate = o.optString("eventDate", o.optString("date", ""));
                String formattedDate = formatDateShort(rawDate);

                String dateBadge;
                if (isPast) {
                    dateBadge = "⚠️ LALU • " + formattedDate;
                } else if (isToday) {
                    dateBadge = "⭐ HARI INI • " + formattedDate;
                } else {
                    dateBadge = "📅 " + (formattedDate.isEmpty() ? "AKAN DATANG" : formattedDate);
                }

                rows.add(new PricingOrderRow(
                    o.optString("id", ""),
                    o.optString("to", "Pelanggan"),
                    o.optString("menu", "-"),
                    o.optInt("quantity", 0),
                    mealsLabel,
                    o.optString("status", "pending"),
                    dateBadge,
                    isPast,
                    o.optString("location", "-")
                ));
            }
        } catch (Exception ignored) {}
    }

    private String formatDateShort(String rawDate) {
        if (rawDate == null || rawDate.isEmpty()) return "";
        try {
            java.text.SimpleDateFormat inFmt = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault());
            java.util.Date d = inFmt.parse(rawDate);
            if (d != null) {
                java.text.SimpleDateFormat outFmt = new java.text.SimpleDateFormat("d MMM", java.util.Locale.getDefault());
                return outFmt.format(d);
            }
        } catch (Exception ignored) {}
        return rawDate;
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

        view.setTextViewText(R.id.pricing_item_date_badge, row.dateBadge);
        if (row.isPast) {
            view.setTextColor(R.id.pricing_item_date_badge, 0xFFEF4444); // Urgent red for past overdue unpriced
        } else {
            view.setTextColor(R.id.pricing_item_date_badge, 0xFFF59E0B); // Amber gold for today/upcoming
        }

        view.setTextViewText(R.id.pricing_item_company, row.companyName);
        view.setViewVisibility(R.id.pricing_item_company, android.view.View.VISIBLE);

        view.setTextViewText(R.id.pricing_item_menu, "🍽️ " + row.menu);
        view.setViewVisibility(R.id.pricing_item_menu, android.view.View.VISIBLE);

        view.setTextViewText(R.id.pricing_item_location, "📍 " + row.location);
        view.setViewVisibility(R.id.pricing_item_location, android.view.View.VISIBLE);

        view.setTextViewText(R.id.pricing_item_pax, row.quantity + " PAX");
        view.setTextViewText(R.id.pricing_item_meals, row.mealsLabel);

        boolean isBilled = "billed".equals(row.status);
        view.setTextViewText(R.id.pricing_item_action_btn, isBilled ? "✓ Dibil" : "⚡ Tetapkan Harga");

        // Fill-in intent: carries this specific order's ID to PricingInputActivity
        // via the PendingIntentTemplate set on the ListView in PricingWidgetFetchService.
        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("order_id", row.id);
        fillInIntent.putExtra("company_name", row.companyName);
        fillInIntent.putExtra("menu", row.menu);
        fillInIntent.putExtra("quantity", row.quantity);
        fillInIntent.putExtra("meals_label", row.mealsLabel);
        fillInIntent.putExtra("is_billed", isBilled);
        view.setOnClickFillInIntent(R.id.pricing_item_root, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_action_btn, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_meals, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_date_badge, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_pax, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_company, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_menu, fillInIntent);
        view.setOnClickFillInIntent(R.id.pricing_item_location, fillInIntent);

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
