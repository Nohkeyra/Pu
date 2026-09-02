package com.wawasanpakusop.app.widget;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Supplies rows to the widget's ListView: a date header row (e.g. "Mon, 21 Jul")
 * followed by one card per order on that date, grouped and sorted chronologically —
 * similar in spirit to how Google Calendar's agenda widget groups events by day.
 */
public class WidgetListFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final List<Row> rows = new ArrayList<>();

    private static final int VIEW_TYPE_HEADER = 0;
    private static final int VIEW_TYPE_ORDER = 1;

    public WidgetListFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        rows.clear();
        SharedPreferences prefs = context.getSharedPreferences(WidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE);
        String cachedJson = prefs.getString(WidgetUpdateService.PREF_ORDERS_JSON, null);

        if (cachedJson == null) return;

        try {
            JSONArray arr = new JSONArray(cachedJson);
            // Group orders under a date-label key while preserving chronological
            // order (LinkedHashMap keeps insertion order, and the backend already
            // returns orders sorted ascending by eventTimestamp).
            Map<String, List<OrderRow>> grouped = new LinkedHashMap<>();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                // F-WIDGET (audit 2026-08-06): the backend (/api/widget/upcoming-orders
                // in server.ts) sends 'date' as YYYY-MM-DD and 'time' as HH:mm — two
                // separate plain fields, never a combined ISO datetime string. This
                // used to call parseIso(o.optString("date")) alone, expecting
                // "yyyy-MM-dd'T'HH:mm:ss", which never matched real data and made
                // every row silently fall back to "Unknown date" with a blank time.
                String rawDate = o.optString("date", "");
                String rawTime = o.optString("time", "");
                Date parsed = parseDateAndTime(rawDate, rawTime);
                String dayLabel = formatDayLabel(parsed);
                String timeLabel = formatTime(parsed);
                if (timeLabel.isEmpty() && !rawTime.isEmpty()) {
                    timeLabel = rawTime;
                }
                if (timeLabel.isEmpty()) {
                    timeLabel = "--:--";
                }

                // Extract & translate meal type into clean Malay
                String mealType = o.optString("mealType", "");
                if (mealType.isEmpty() || mealType.equals("N/A")) {
                    JSONArray mealsArr = o.optJSONArray("meals");
                    if (mealsArr != null && mealsArr.length() > 0) {
                        StringBuilder sb = new StringBuilder();
                        for (int m = 0; m < mealsArr.length(); m++) {
                            String val = mealsArr.optString(m);
                            if ("breakfast".equalsIgnoreCase(val)) val = "Sarapan";
                            else if ("lunch".equalsIgnoreCase(val)) val = "Tengahari";
                            else if ("hi_tea".equalsIgnoreCase(val)) val = "Hi-Tea";
                            else if ("dinner".equalsIgnoreCase(val)) val = "Makan Malam";
                            if (sb.length() > 0) sb.append(" + ");
                            sb.append(val);
                        }
                        mealType = sb.toString();
                    } else {
                        String mStr = o.optString("meals", "Katering");
                        if ("breakfast".equalsIgnoreCase(mStr)) mealType = "Sarapan";
                        else if ("lunch".equalsIgnoreCase(mStr)) mealType = "Tengahari";
                        else if ("hi_tea".equalsIgnoreCase(mStr)) mealType = "Hi-Tea";
                        else mealType = mStr;
                    }
                }
                if (mealType.isEmpty()) mealType = "Katering";

                String loc = o.optString("location", "");
                if (loc.isEmpty() || loc.equals("N/A")) {
                    loc = o.optString("deliveryLocation", "Lokasi Belum Dinyatakan");
                }
                if (loc.isEmpty() || loc.equals("N/A")) {
                    loc = "Lokasi Belum Dinyatakan";
                }

                String client = o.optString("to", "");
                if (client.isEmpty() || client.equals("N/A")) {
                    client = o.optString("name", "");
                }

                OrderRow item = new OrderRow(
                    o.optString("id", ""),
                    o.optInt("quantity", 0),
                    mealType,
                    loc,
                    o.optString("menu", ""),
                    timeLabel,
                    client,
                    o.optString("status", "pending")
                );

                grouped.computeIfAbsent(dayLabel, k -> new ArrayList<>()).add(item);
            }

            for (Map.Entry<String, List<OrderRow>> entry : grouped.entrySet()) {
                rows.add(Row.header(entry.getKey()));
                for (OrderRow item : entry.getValue()) {
                    rows.add(Row.order(item));
                }
            }
        } catch (Exception e) {
            // Malformed cache — leave rows empty, widget will show "no data".
        }
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
        Row row = rows.get(position);

        if (row.type == VIEW_TYPE_HEADER) {
            RemoteViews headerView = new RemoteViews(context.getPackageName(), R.layout.widget_date_header);
            headerView.setTextViewText(R.id.header_date_label, row.headerLabel);
            return headerView;
        }

        RemoteViews itemView = new RemoteViews(context.getPackageName(), R.layout.widget_order_item);
        OrderRow item = row.order;

        // "meal type | Quantity | lokasi | time" display ONLY
        // Line 1: Meal Type & Quantity (Pax)
        itemView.setTextViewText(R.id.item_meal_type, item.meals);
        itemView.setTextViewText(R.id.item_pax_badge, item.quantity + " PAX");

        // Line 2: Lokasi & Time
        itemView.setTextViewText(R.id.item_meal_location, "📍 " + item.location);
        itemView.setTextViewText(R.id.item_time, "⏰ " + item.time);
        
        // Status stripe color with refined palette
        int stripeColor;
        switch (item.status != null ? item.status.toLowerCase() : "") {
            case "approved": 
            case "disahkan":
                stripeColor = 0xFF10B981; // Emerald green
                break;
            case "billed":   
            case "selesai":
                stripeColor = 0xFF38BDF8; // Sky blue
                break;
            default:         
                stripeColor = 0xFFF59E0B; // Amber gold (pending)
                break;
        }
        itemView.setInt(R.id.item_status_stripe, "setBackgroundColor", stripeColor);

        // Tapping an individual order card opens the app directly to /admin,
        // consistent with tapping the widget title.
        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("open_admin_panel", true);
        fillInIntent.putExtra("order_id", item.id);
        itemView.setOnClickFillInIntent(R.id.item_root, fillInIntent);

        return itemView;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 2;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }

    /**
     * Combines the backend's separate 'date' (YYYY-MM-DD) and 'time' (HH:mm,
     * optional) fields into a single Date. Falls back to midnight if time is
     * missing/unparseable, and to null if date itself is missing/unparseable
     * (caller already handles a null Date as "Unknown date").
     */
    private Date parseDateAndTime(String rawDate, String rawTime) {
        if (rawDate == null || rawDate.isEmpty()) return null;
        String safeTime = (rawTime == null || rawTime.isEmpty()) ? "00:00" : rawTime;
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
            return format.parse(rawDate + " " + safeTime);
        } catch (Exception e) {
            // Fall back to date-only parsing in case 'time' was present but malformed.
            try {
                SimpleDateFormat dateOnlyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                return dateOnlyFormat.parse(rawDate);
            } catch (Exception e2) {
                return null;
            }
        }
    }

    private String formatDayLabel(Date date) {
        if (date == null) return "Unknown date";
        try {
            SimpleDateFormat dayFormat = new SimpleDateFormat("EEE, d MMM", Locale.getDefault());
            return dayFormat.format(date);
        } catch (Exception e) {
            return "Unknown date";
        }
    }

    private String formatTime(Date date) {
        if (date == null) return "";
        try {
            SimpleDateFormat timeFormat = new SimpleDateFormat("h:mm a", Locale.getDefault());
            return timeFormat.format(date);
        } catch (Exception e) {
            return "";
        }
    }

    /** A single row in the widget list — either a date header or an order card. */
    private static class Row {
        final int type;
        final String headerLabel;
        final OrderRow order;

        private Row(int type, String headerLabel, OrderRow order) {
            this.type = type;
            this.headerLabel = headerLabel;
            this.order = order;
        }

        static Row header(String label) {
            return new Row(VIEW_TYPE_HEADER, label, null);
        }

        static Row order(OrderRow item) {
            return new Row(VIEW_TYPE_ORDER, null, item);
        }
    }

    private static class OrderRow {
        final String id;
        final int quantity;
        final String meals;
        final String location;
        final String menu;
        final String time;
        final String clientName;
        final String status;

        OrderRow(String id, int quantity, String meals, String location, String menu, String time, String clientName, String status) {
            this.id = id;
            this.quantity = quantity;
            this.meals = meals;
            this.location = location;
            this.menu = menu;
            this.time = time;
            this.clientName = clientName;
            this.status = status;
        }
    }
}
