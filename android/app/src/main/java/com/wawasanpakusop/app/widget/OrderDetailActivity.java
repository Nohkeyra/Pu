package com.wawasanpakusop.app.widget;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;

/**
 * Bottom-sheet style Activity that opens over the home screen when an order card
 * in Widget #1 (Upcoming Orders) is tapped.
 * Displays Date & Time, Meal Type, Menu, and Location details without leaving the home screen.
 */
public class OrderDetailActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_order_detail);

        String orderId = getIntent().getStringExtra("order_id");
        String dateTime = getIntent().getStringExtra("date_time");
        String mealType = getIntent().getStringExtra("meal_type");
        String menu = getIntent().getStringExtra("menu");
        String location = getIntent().getStringExtra("location");
        int pax = getIntent().getIntExtra("pax", 0);
        String clientName = getIntent().getStringExtra("client_name");
        String status = getIntent().getStringExtra("status");

        TextView statusBadge = findViewById(R.id.detail_status_badge);
        TextView clientSummary = findViewById(R.id.detail_client_summary);
        TextView dateTimeText = findViewById(R.id.detail_date_time);
        TextView mealTypeText = findViewById(R.id.detail_meal_type);
        TextView menuText = findViewById(R.id.detail_menu);
        TextView locationText = findViewById(R.id.detail_location);
        Button closeBtn = findViewById(R.id.detail_close_btn);
        Button openAppBtn = findViewById(R.id.detail_open_app_btn);

        // Format Status Badge
        String safeStatus = status != null ? status.toUpperCase() : "PENDING";
        statusBadge.setText(safeStatus);
        if ("APPROVED".equalsIgnoreCase(safeStatus) || "DISAHKAN".equalsIgnoreCase(safeStatus)) {
            statusBadge.setBackgroundColor(Color.parseColor("#10B981")); // Green
            statusBadge.setTextColor(Color.parseColor("#000000"));
        } else if ("BILLED".equalsIgnoreCase(safeStatus) || "SELESAI".equalsIgnoreCase(safeStatus)) {
            statusBadge.setBackgroundColor(Color.parseColor("#38BDF8")); // Blue
            statusBadge.setTextColor(Color.parseColor("#000000"));
        } else {
            statusBadge.setBackgroundColor(Color.parseColor("#F59E0B")); // Amber
            statusBadge.setTextColor(Color.parseColor("#000000"));
        }

        // Summary Line
        String nameStr = (clientName != null && !clientName.trim().isEmpty() && !"N/A".equalsIgnoreCase(clientName))
            ? clientName
            : "Tempahan Katering";
        clientSummary.setText(nameStr + "  •  " + pax + " pax");

        // 1. Date & Time
        dateTimeText.setText((dateTime != null && !dateTime.trim().isEmpty()) ? dateTime : "Tarikh tidak dinyatakan");

        // 2. Meal Type
        mealTypeText.setText((mealType != null && !mealType.trim().isEmpty()) ? mealType : "Katering Utama");

        // 3. Menu
        menuText.setText((menu != null && !menu.trim().isEmpty()) ? menu : "Menu belum ditentukan");

        // 4. Location
        locationText.setText((location != null && !location.trim().isEmpty()) ? location : "Lokasi belum dinyatakan");

        closeBtn.setOnClickListener(v -> finish());

        openAppBtn.setOnClickListener(v -> {
            Intent appIntent = new Intent(this, MainActivity.class);
            appIntent.putExtra("open_admin_panel", true);
            if (orderId != null) {
                appIntent.putExtra("order_id", orderId);
            }
            appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(appIntent);
            finish();
        });
    }
}
