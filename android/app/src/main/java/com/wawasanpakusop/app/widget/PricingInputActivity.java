package com.wawasanpakusop.app.widget;

import android.app.Activity;
import android.os.AsyncTask;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.wawasanpakusop.app.R;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Transparent bottom-sheet-style Activity that opens when tapping a "Tetapkan
 * Harga" row in the pricing widget. Shows one price-per-pax input per meal
 * type present in that specific order, calculates the live total, and on
 * submit calls POST /api/widget/set-pricing which — server-side — computes
 * the final total, generates the official invoice PDF, emails it to the
 * customer, and marks the order 'billed'.
 *
 * This looks like a small popup over the home screen (the widget stays
 * visible behind it) rather than opening the full app — true inline typing
 * directly inside a RemoteViews AppWidget surface isn't reliably supported
 * across Android versions, so this is the standard, stable pattern for
 * "quick input from a widget" on Android.
 */
public class PricingInputActivity extends Activity {

    private String orderId;
    private int quantity;
    private String mealsLabel;
    private boolean isBilled;

    private LinearLayout rowBreakfast, rowLunch, rowHitea;
    private EditText inputBreakfast, inputLunch, inputHitea;
    private TextView totalPreview, orderSummaryText, menuPreviewText;
    private Button submitBtn, cancelBtn;

    private boolean hasBreakfast, hasLunch, hasHitea;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pricing_input);

        orderId = getIntent().getStringExtra("order_id");
        String companyName = getIntent().getStringExtra("company_name");
        String menu = getIntent().getStringExtra("menu");
        quantity = getIntent().getIntExtra("quantity", 0);
        mealsLabel = getIntent().getStringExtra("meals_label");
        isBilled = getIntent().getBooleanExtra("is_billed", false);

        bindViews();

        if (orderId == null || orderId.isEmpty()) {
            Toast.makeText(this, "Ralat: Order ID tiada.", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        if (isBilled) {
            Toast.makeText(this, "Tempahan ini sudah dibil dan invois telah dihantar.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        orderSummaryText.setText(quantity + " pax  •  " + (mealsLabel != null ? mealsLabel : ""));
        menuPreviewText.setText(menu != null && !menu.isEmpty() ? "Menu: " + menu : "");

        // Show only the meal-type rows actually present in this order.
        String meals = mealsLabel != null ? mealsLabel : "";
        hasBreakfast = meals.contains("Sarapan");
        hasLunch = meals.contains("Tengahari");
        hasHitea = meals.contains("Hi-Tea");

        // Fallback: if label parsing found nothing (unexpected format), show all three.
        if (!hasBreakfast && !hasLunch && !hasHitea) {
            hasBreakfast = true; hasLunch = true; hasHitea = true;
        }

        rowBreakfast.setVisibility(hasBreakfast ? View.VISIBLE : View.GONE);
        rowLunch.setVisibility(hasLunch ? View.VISIBLE : View.GONE);
        rowHitea.setVisibility(hasHitea ? View.VISIBLE : View.GONE);

        TextWatcher recalc = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { updateTotalPreview(); }
            @Override public void afterTextChanged(Editable s) {}
        };
        inputBreakfast.addTextChangedListener(recalc);
        inputLunch.addTextChangedListener(recalc);
        inputHitea.addTextChangedListener(recalc);

        cancelBtn.setOnClickListener(v -> finish());
        submitBtn.setOnClickListener(v -> submitPricing());

        updateTotalPreview();
    }

    private void bindViews() {
        rowBreakfast = findViewById(R.id.price_row_breakfast);
        rowLunch = findViewById(R.id.price_row_lunch);
        rowHitea = findViewById(R.id.price_row_hitea);
        inputBreakfast = findViewById(R.id.price_input_breakfast);
        inputLunch = findViewById(R.id.price_input_lunch);
        inputHitea = findViewById(R.id.price_input_hitea);
        totalPreview = findViewById(R.id.price_input_total_preview);
        orderSummaryText = findViewById(R.id.price_input_order_summary);
        menuPreviewText = findViewById(R.id.price_input_menu_preview);
        submitBtn = findViewById(R.id.price_input_submit_btn);
        cancelBtn = findViewById(R.id.price_input_cancel_btn);
    }

    private double parseOrZero(EditText field) {
        try {
            String text = field.getText().toString().trim();
            if (text.isEmpty()) return 0;
            return Double.parseDouble(text);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void updateTotalPreview() {
        double perPaxSum = 0;
        if (hasBreakfast) perPaxSum += parseOrZero(inputBreakfast);
        if (hasLunch) perPaxSum += parseOrZero(inputLunch);
        if (hasHitea) perPaxSum += parseOrZero(inputHitea);

        // Total = sum over each meal's (price-per-pax * quantity) — matches
        // server's calculation in POST /api/widget/set-pricing.
        double total = 0;
        if (hasBreakfast) total += parseOrZero(inputBreakfast) * quantity;
        if (hasLunch) total += parseOrZero(inputLunch) * quantity;
        if (hasHitea) total += parseOrZero(inputHitea) * quantity;

        totalPreview.setText(String.format("RM %.2f", total));
    }

    private void submitPricing() {
        double breakfastPrice = hasBreakfast ? parseOrZero(inputBreakfast) : 0;
        double lunchPrice = hasLunch ? parseOrZero(inputLunch) : 0;
        double hiteaPrice = hasHitea ? parseOrZero(inputHitea) : 0;

        boolean anyEntered = (hasBreakfast && breakfastPrice > 0)
            || (hasLunch && lunchPrice > 0)
            || (hasHitea && hiteaPrice > 0);

        if (!anyEntered) {
            Toast.makeText(this, "Sila isi sekurang-kurangnya satu harga.", Toast.LENGTH_SHORT).show();
            return;
        }

        submitBtn.setEnabled(false);
        submitBtn.setText("Menghantar...");

        try {
            JSONObject prices = new JSONObject();
            if (hasBreakfast && breakfastPrice > 0) prices.put("breakfast", breakfastPrice);
            if (hasLunch && lunchPrice > 0) prices.put("lunch", lunchPrice);
            if (hasHitea && hiteaPrice > 0) prices.put("hi_tea", hiteaPrice);

            JSONObject body = new JSONObject();
            body.put("orderId", orderId);
            body.put("prices", prices);

            new SubmitPricingTask().execute(body.toString());
        } catch (JSONException e) {
            Toast.makeText(this, "Ralat membina permintaan.", Toast.LENGTH_SHORT).show();
            submitBtn.setEnabled(true);
            submitBtn.setText("Simpan Harga →");
        }
    }

    /**
     * AsyncTask (not a background Service) is deliberate here: this call
     * only needs to live as long as the Activity is on screen — the user is
     * actively waiting for the result (success/fail toast) before the sheet
     * closes. A WorkManager job would be the wrong tool since there's a UI
     * waiting on the outcome, not a fire-and-forget background task.
     */
    private class SubmitPricingTask extends AsyncTask<String, Void, TaskResult> {

        static final String API_BASE_URL = "https://restoran-wawasan-bio.onrender.com";
        static final String ENDPOINT = "/api/widget/set-pricing";

        @Override
        protected TaskResult doInBackground(String... params) {
            String requestBody = params[0];
            try {
                URL url = new URL(API_BASE_URL + ENDPOINT);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setRequestProperty("x-widget-key", PricingWidgetFetchService.WIDGET_API_KEY);
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(25000); // PDF generation + email send can take a few seconds
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = requestBody.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                InputStreamReader streamReader = new InputStreamReader(
                    code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream(),
                    StandardCharsets.UTF_8
                );
                BufferedReader reader = new BufferedReader(streamReader);
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();
                conn.disconnect();

                JSONObject json = new JSONObject(sb.toString());
                boolean success = json.optBoolean("success", false);
                String message = json.optString(success ? "message" : "error", success ? "Berjaya." : "Ralat tidak diketahui.");
                String invoiceNo = json.optString("invoiceNo", null);

                return new TaskResult(success, message, invoiceNo);
            } catch (IOException | JSONException e) {
                return new TaskResult(false, "Sambungan gagal: " + e.getMessage(), null);
            }
        }

        @Override
        protected void onPostExecute(TaskResult result) {
            submitBtn.setEnabled(true);
            submitBtn.setText("Simpan Harga →");

            if (result.success) {
                Toast.makeText(PricingInputActivity.this,
                    "✓ Invois " + (result.invoiceNo != null ? result.invoiceNo : "") + " dihantar ke pelanggan!",
                    Toast.LENGTH_LONG).show();
                PricingWidgetProvider.requestRefresh(getApplicationContext());
                finish();
            } else {
                // Deliberately NOT closing the sheet on failure — the price
                // values the user typed stay on screen so they can retry
                // without re-entering everything (e.g. after a timeout).
                Toast.makeText(PricingInputActivity.this, "✗ " + result.message, Toast.LENGTH_LONG).show();
            }
        }
    }

    private static class TaskResult {
        final boolean success;
        final String message;
        final String invoiceNo;
        TaskResult(boolean success, String message, String invoiceNo) {
            this.success = success;
            this.message = message;
            this.invoiceNo = invoiceNo;
        }
    }
}
