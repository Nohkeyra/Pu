package com.wawasanpakusop.app.widgets

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.GlanceTheme
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.wawasanpakusop.app.MainActivity
import com.wawasanpakusop.app.R
import com.wawasanpakusop.app.security.SecureStorage
import com.wawasanpakusop.app.widget.OfflinePricingQueue
import com.wawasanpakusop.app.widget.PricingInputActivity
import com.wawasanpakusop.app.widget.PricingWidgetFetchService
import org.json.JSONArray

class RefreshGlanceActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        // Trigger background fetch from server and refresh Glance widget
        PricingWidgetFetchService.fetchAndUpdate(context, IntArray(0), null)
        try {
            PricingGlanceWidget().updateAll(context)
        } catch (ignored: Exception) {
        }
    }
}

data class GlanceOrderItem(
    val id: String,
    val company: String,
    val menu: String,
    val quantity: Int,
    val mealsLabel: String,
    val status: String,
    val dateBadge: String,
    val isBilled: Boolean
)

class PricingGlanceWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val orders: List<GlanceOrderItem> = try {
            loadOrdersFromCache(context)
        } catch (e: Exception) {
            android.util.Log.e("PricingGlanceWidget", "Error reading order cache", e)
            emptyList()
        }

        provideContent {
            GlanceTheme {
                PricingGlanceScreen(context, orders)
            }
        }
    }

    private fun loadOrdersFromCache(context: Context): List<GlanceOrderItem> {
        val rawJson = SecureStorage.getString(context, PricingWidgetFetchService.PREF_ORDERS_JSON, null)
            ?: return emptyList()

        val list = mutableListOf<GlanceOrderItem>()
        val arr = JSONArray(rawJson)

        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val orderId = o.optString("id", "")
            val isPendingSync = OfflinePricingQueue.hasPendingOrder(context, orderId)
            val mealsArr = o.optJSONArray("meals")
            val mealsLabel = buildMealsLabel(mealsArr)
            val mealCodes = buildMealCodes(mealsArr)
            val isPast = o.optBoolean("isPast", false)
            val isToday = o.optBoolean("isToday", false)
            val rawDate = o.optString("eventDate", o.optString("date", ""))

            val dateBadge = when {
                isPendingSync -> "⏳ PENDING SYNC"
                isPast -> "⚠️ LALU"
                isToday -> "⭐ HARI INI"
                else -> if (rawDate.isNotEmpty()) "📅 $rawDate" else "📅 AKAN DATANG"
            }

            var company = o.optString("to", "Pelanggan")
            if (company.isNullOrEmpty() || company == "N/A") {
                company = o.optString("name", "Pelanggan")
            }

            var rawMenu = o.optString("menu", "")
            if (rawMenu.isNullOrEmpty() || rawMenu == "-") {
                rawMenu = mealsLabel
            }

            val consolidatedMenu = if (mealCodes.isNotEmpty()) "[$mealCodes] $rawMenu" else rawMenu
            val status = o.optString("status", "pending")
            val isBilled = "billed".equals(status, ignoreCase = true)

            list.add(
                GlanceOrderItem(
                    id = orderId,
                    company = company,
                    menu = consolidatedMenu,
                    quantity = o.optInt("quantity", 0),
                    mealsLabel = mealsLabel,
                    status = status,
                    dateBadge = dateBadge,
                    isBilled = isBilled
                )
            )
        }

        return list
    }

    private fun buildMealsLabel(meals: JSONArray?): String {
        if (meals == null || meals.length() == 0) return "Tempahan"
        val sb = StringBuilder()
        for (i in 0 until meals.length()) {
            val m = meals.optString(i, "")
            val label = when (m.lowercase()) {
                "breakfast", "sarapan" -> "Sarapan"
                "lunch", "tengahari" -> "Tengahari"
                "hi_tea", "hi-tea", "tea" -> "Hi-Tea"
                "dinner", "malam" -> "Makan Malam"
                else -> m
            }
            if (sb.isNotEmpty()) sb.append(" + ")
            sb.append(label)
        }
        return if (sb.isNotEmpty()) sb.toString() else "Tempahan"
    }

    private fun buildMealCodes(meals: JSONArray?): String {
        if (meals == null || meals.length() == 0) return ""
        val codes = mutableListOf<String>()
        for (i in 0 until meals.length()) {
            val m = meals.optString(i, "").lowercase()
            if ((m.contains("breakfast") || m.contains("sarapan")) && !codes.contains("BF")) {
                codes.add("BF")
            } else if ((m.contains("lunch") || m.contains("tengahari")) && !codes.contains("LN")) {
                codes.add("LN")
            } else if ((m.contains("hi_tea") || m.contains("hi-tea") || m.contains("tea")) && !codes.contains("HT")) {
                codes.add("HT")
            }
        }
        return codes.joinToString("»")
    }
}

@Composable
fun PricingGlanceScreen(context: Context, orders: List<GlanceOrderItem>) {
    val compact = LocalSize.current.width < 260.dp
    Column(
        modifier = GlanceModifier.fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(10.dp)
    ) {
        GlassWidgetHeader("HARGA TERTUNGGAK", "HARGA", orders.size, actionRunCallback<RefreshGlanceActionCallback>())
        if (orders.isEmpty()) {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            Box(
                modifier = GlanceModifier.fillMaxSize()
                    .background(ImageProvider(R.drawable.widget_glass_card))
                    .clickable(actionStartActivity(intent)).padding(10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("✓  Tiada harga tertunggak", style = TextStyle(color = widgetMuted, fontSize = 12.sp))
            }
        } else {
            LazyColumn(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                items(orders.size) { index ->
                    Column(modifier = GlanceModifier.fillMaxWidth().padding(bottom = 6.dp)) {
                        GlanceOrderRowItem(context, orders[index], compact)
                    }
                }
            }
        }
    }
}

@Composable
fun GlanceOrderRowItem(context: Context, order: GlanceOrderItem, compact: Boolean) {
    val inputIntent = Intent(context, PricingInputActivity::class.java).apply {
        data = Uri.parse("wawasan-widget://pricing/${Uri.encode(order.id)}")
        putExtra("order_id", order.id)
        putExtra("company_name", order.company)
        putExtra("menu", order.menu)
        putExtra("quantity", order.quantity)
        putExtra("meals_label", order.mealsLabel)
        putExtra("is_billed", order.isBilled)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    Row(
        modifier = GlanceModifier.fillMaxWidth()
            .background(ImageProvider(R.drawable.widget_glass_card))
            .clickable(actionStartActivity(inputIntent)).padding(10.dp),
        verticalAlignment = Alignment.Vertical.CenterVertically
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(order.company, maxLines = 1, style = TextStyle(color = widgetText, fontSize = 13.sp, fontWeight = FontWeight.Bold))
            Spacer(modifier = GlanceModifier.height(3.dp))
            Text("${order.dateBadge}  •  ${order.quantity} orang", maxLines = 1, style = TextStyle(color = widgetMuted, fontSize = 11.sp))
            if (!compact) {
                Text(order.menu, maxLines = 1, style = TextStyle(color = widgetMuted, fontSize = 10.sp))
            }
        }
        Spacer(modifier = GlanceModifier.width(6.dp))
        Box(
            modifier = GlanceModifier.background(ImageProvider(R.drawable.widget_amber_button))
                .padding(horizontal = 8.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (order.isBilled) "DIBIL ✓" else if (compact) "HARGA ›" else "Tetap harga ›",
                maxLines = 1,
                style = TextStyle(color = widgetAmberText, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            )
        }
    }
}
