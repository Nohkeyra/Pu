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
                String isoDate = o.optString("date", "");
                Date parsed = parseIso(isoDate);
                String dayLabel = formatDayLabel(parsed);
                String timeLabel = formatTime(parsed);

                OrderRow item = new OrderRow(
                    o.optString("id", ""),
                    o.optInt("quantity", 0),
                    o.optString("meals", "N/A"),
                    o.optString("location", "N/A"),
                    o.optString("menu", "N/A"),
                    timeLabel
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

        itemView.setTextViewText(R.id.item_time_pax, item.quantity + " Pax | " + item.meals + " | " + item.location + "  •  " + item.time);
        itemView.setTextViewText(R.id.item_meal_location, "Menu: " + item.menu);
        itemView.setViewVisibility(R.id.item_menu, android.view.View.GONE);

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

    private Date parseIso(String isoDate) {
        try {
            SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            return isoFormat.parse(isoDate.replace("Z", ""));
        } catch (Exception e) {
            return null;
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

        OrderRow(String id, int quantity, String meals, String location, String menu, String time) {
            this.id = id;
            this.quantity = quantity;
            this.meals = meals;
            this.location = location;
            this.menu = menu;
            this.time = time;
        }
    }
}
