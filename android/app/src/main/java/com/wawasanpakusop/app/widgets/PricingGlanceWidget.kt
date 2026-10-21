package com.wawasanpakusop.app.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
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
import androidx.glance.material3.GlanceTheme
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.wawasanpakusop.app.MainActivity
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
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.surface)
            .padding(12.dp)
    ) {
        Row(
            modifier = GlanceModifier.fillMaxWidth().padding(bottom = 8.dp),
            verticalAlignment = Alignment.Vertical.CenterVertically
        ) {
            Column(modifier = GlanceModifier.defaultWeight()) {
                Text(
                    text = "Restoran Wawasan • Pricing (beta)",
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurface,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Text(
                    text = if (orders.isEmpty()) "✓ Tiada tempahan tertunggak" else "${orders.size} tempahan",
                    style = TextStyle(
                        color = GlanceTheme.colors.secondary,
                        fontSize = 11.sp
                    )
                )
            }
            Box(
                modifier = GlanceModifier
                    .clickable(actionRunCallback<RefreshGlanceActionCallback>())
                    .padding(horizontal = 8.dp, vertical = 4.dp)
                    .background(GlanceTheme.colors.primaryContainer)
            ) {
                Text(
                    text = "🔄 Muat Semula",
                    style = TextStyle(
                        color = GlanceTheme.colors.onPrimaryContainer,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                )
            }
        }

        if (orders.isEmpty()) {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .clickable(actionStartActivity<MainActivity>())
                    .padding(12.dp)
                    .background(GlanceTheme.colors.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.Horizontal.CenterHorizontally) {
                    Text(
                        text = "✓ Tiada tempahan tertunggak harga",
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurfaceVariant,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(
                        text = "Ketik untuk Buka Aplikasi",
                        style = TextStyle(
                            color = GlanceTheme.colors.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }
        } else {
            val displayOrders = orders.take(3)
            for (order in displayOrders) {
                GlanceOrderRowItem(context, order)
                Spacer(modifier = GlanceModifier.height(6.dp))
            }
        }
    }
}

@Composable
fun GlanceOrderRowItem(context: Context, order: GlanceOrderItem) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .clickable(actionStartActivity<PricingInputActivity>())
            .background(GlanceTheme.colors.surfaceVariant)
            .padding(8.dp),
        verticalAlignment = Alignment.Vertical.CenterVertically
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = "${order.company} • ${order.quantity} pax",
                style = TextStyle(
                    color = GlanceTheme.colors.onSurfaceVariant,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = GlanceModifier.height(2.dp))
            Text(
                text = "${order.dateBadge}  ${order.menu}",
                style = TextStyle(
                    color = GlanceTheme.colors.onSurfaceVariant,
                    fontSize = 11.sp
                )
            )
        }
        Spacer(modifier = GlanceModifier.width(6.dp))
        Box(
            modifier = GlanceModifier
                .background(if (order.isBilled) GlanceTheme.colors.surface else GlanceTheme.colors.primary)
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                text = if (order.isBilled) "DIBIL ✓" else "SET 💵",
                style = TextStyle(
                    color = if (order.isBilled) GlanceTheme.colors.onSurface else GlanceTheme.colors.onPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            )
        }
    }
}
