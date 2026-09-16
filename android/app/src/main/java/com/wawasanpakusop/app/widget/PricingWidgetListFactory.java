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
 * written by PricingWidgetFetchService.
 * Exactly ONE row per order, grouping all meal types (BF, LN, HT) tightly together
 * with a single "SET💵" action button, and supporting full vertical scrolling.
 */
public class PricingWidgetListFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final int appWidgetId;
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
        if (intent != null) {
            this.appWidgetId = intent.getIntExtra(
                android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,
                android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
            );
        } else {
            this.appWidgetId = android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID;
        }
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
                JSONArray mealsArr = o.optJSONArray("meals");
                String mealsLabel = buildMealsLabel(mealsArr);
                String mealCodes = buildMealCodes(mealsArr, o.optString("mealType", ""));
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

                String company = o.optString("to", "Pelanggan");
                if (company == null || company.isEmpty() || company.equals("N/A")) {
                    company = o.optString("name", "Pelanggan");
                }

                String rawMenu = o.optString("menu", "");
                if (rawMenu == null || rawMenu.isEmpty() || rawMenu.equals("-")) {
                    rawMenu = mealsLabel;
                }

                // Compactly join meal code badges (BF»LN»HT) with dish details in one tight row per order
                String consolidatedMenu;
                if (!mealCodes.isEmpty()) {
                    consolidatedMenu = "[" + mealCodes + "] " + rawMenu;
                } else {
                    consolidatedMenu = rawMenu;
                }

                rows.add(new PricingOrderRow(
                    o.optString("id", ""),
                    company,
                    consolidatedMenu,
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
            switch (m.toLowerCase()) {
                case "breakfast":
                case "sarapan":
                    label = "Sarapan";
                    break;
                case "lunch":
                case "tengahari":
                    label = "Tengahari";
                    break;
                case "hi_tea":
                case "hi-tea":
                case "tea":
                    label = "Hi-Tea";
                    break;
                case "dinner":
                case "malam":
                    label = "Makan Malam";
                    break;
                default:
                    label = m;
                    break;
            }
            if (sb.length() > 0) sb.append(" + ");
            sb.append(label);
        }
        return sb.length() > 0 ? sb.toString() : "Tempahan";
    }

    private String buildMealCodes(JSONArray meals, String fallbackMealType) {
        List<String> codes = new ArrayList<>();
        if (meals != null && meals.length() > 0) {
            for (int i = 0; i < meals.length(); i++) {
                String m = meals.optString(i, "").toLowerCase();
                if (m.contains("breakfast") || m.contains("sarapan")) {
                    if (!codes.contains("BF")) codes.add("BF");
                } else if (m.contains("lunch") || m.contains("tengahari")) {
                    if (!codes.contains("LN")) codes.add("LN");
                } else if (m.contains("hi_tea") || m.contains("hi-tea") || m.contains("tea")) {
                    if (!codes.contains("HT")) codes.add("HT");
                } else if (m.contains("dinner") || m.contains("malam")) {
                    if (!codes.contains("DN")) codes.add("DN");
                }
            }
        } else if (fallbackMealType != null && !fallbackMealType.isEmpty()) {
            String m = fallbackMealType.toLowerCase();
            if (m.contains("breakfast") || m.contains("sarapan")) codes.add("BF");
            if (m.contains("lunch") || m.contains("tengahari")) codes.add("LN");
            if (m.contains("hi_tea") || m.contains("hi-tea") || m.contains("tea")) codes.add("HT");
            if (m.contains("dinner") || m.contains("malam")) codes.add("DN");
        }

        if (codes.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (String c : codes) {
            if (sb.length() > 0) sb.append("»");
            sb.append(c);
        }
        return sb.toString();
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
        if (position < 0 || position >= rows.size()) return null;

        RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.widget_pricing_order_item);
        PricingOrderRow row = rows.get(position);

        view.setTextViewText(R.id.pricing_item_date_badge, row.dateBadge);
        if (row.isPast) {
            view.setTextColor(R.id.pricing_item_date_badge, 0xFFEF4444);
        } else {
            view.setTextColor(R.id.pricing_item_date_badge, 0xFFF59E0B);
        }

        view.setTextViewText(R.id.pricing_item_company, row.companyName);
        view.setViewVisibility(R.id.pricing_item_company, android.view.View.VISIBLE);

        view.setTextViewText(R.id.pricing_item_menu, "🍽️ " + row.menu);
        view.setViewVisibility(R.id.pricing_item_menu, android.view.View.VISIBLE);

        view.setTextViewText(R.id.pricing_item_location, "📍 " + row.location);
        view.setViewVisibility(R.id.pricing_item_location, android.view.View.VISIBLE);

        // Hide divider line on the last order row for a clean bottom edge
        if (position == rows.size() - 1) {
            view.setViewVisibility(R.id.pricing_item_divider, android.view.View.GONE);
        } else {
            view.setViewVisibility(R.id.pricing_item_divider, android.view.View.VISIBLE);
        }

        view.setTextViewText(R.id.pricing_item_pax, row.quantity + " PAX");
        view.setTextViewText(R.id.pricing_item_meals, row.mealsLabel);

        boolean isBilled = "billed".equals(row.status);
        if (isBilled) {
            view.setTextViewText(R.id.pricing_item_action_btn, "✓ Dibil");
            view.setTextColor(R.id.pricing_item_action_btn, 0xFF38BDF8);
        } else {
            view.setTextViewText(R.id.pricing_item_action_btn, "SET 💵");
            view.setTextColor(R.id.pricing_item_action_btn, 0xFFF59E0B);
        }

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
