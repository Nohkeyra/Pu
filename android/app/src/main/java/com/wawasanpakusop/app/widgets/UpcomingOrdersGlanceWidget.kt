package com.wawasanpakusop.app.widgets

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.actionStartActivity
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
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.wawasanpakusop.app.MainActivity
import com.wawasanpakusop.app.widget.OrderDetailActivity
import com.wawasanpakusop.app.widget.WidgetUpdateService
import org.json.JSONArray

class RefreshUpcomingOrdersGlanceActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        WidgetUpdateService.fetchAndUpdate(context, IntArray(0), null)
        try {
            UpcomingOrdersGlanceWidget().updateAll(context)
        } catch (ignored: Exception) {
        }
    }
}

data class UpcomingOrderItem(
    val id: String,
    val company: String,
    val menu: String,
    val quantity: Int,
    val dateLabel: String,
    val timeLabel: String,
    val status: String
)

class UpcomingOrdersGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val orders = try {
            loadOrders(context)
        } catch (e: Exception) {
            emptyList()
        }

        provideContent {
            GlanceTheme {
                UpcomingOrdersScreen(context, orders)
            }
        }
    }

    private fun loadOrders(context: Context): List<UpcomingOrderItem> {
        val prefs = context.getSharedPreferences(WidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
        val rawJson = prefs.getString(WidgetUpdateService.PREF_ORDERS_JSON, null) ?: return emptyList()

        val list = mutableListOf<UpcomingOrderItem>()
        val arr = JSONArray(rawJson)
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val id = o.optString("id", o.optString("orderId", ""))
            var company = o.optString("to", "Pelanggan")
            if (company.isEmpty() || company == "N/A") company = o.optString("name", "Pelanggan")
            val date = o.optString("date", o.optString("eventDate", ""))
            val time = o.optString("time", "00:00")
            val menu = o.optString("menu", o.optString("mealType", "Tempahan"))
            val qty = o.optInt("quantity", 0)
            val status = o.optString("status", "pending")

            list.add(UpcomingOrderItem(id, company, menu, qty, date, time, status))
        }
        return list
    }
}

@Composable
fun UpcomingOrdersScreen(context: Context, orders: List<UpcomingOrderItem>) {
    val refreshAction = actionRunCallback<RefreshUpcomingOrdersGlanceActionCallback>()
    val openAppIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val headerClickAction = actionStartActivity(openAppIntent)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#0B100E")))
            .padding(12.dp)
    ) {
        // Header
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .clickable(headerClickAction),
            verticalAlignment = Alignment.Vertical.CenterVertically
        ) {
            Text(
                text = "🍽️ Tempahan Wawasan",
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#E0E6E2")),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                ),
                modifier = GlanceModifier.defaultWeight()
            )
            Box(
                modifier = GlanceModifier
                    .background(androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#1B2E23")))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
                    .clickable(refreshAction)
            ) {
                Text(
                    text = "🔄 Segar",
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#4ADE80")),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                )
            }
        }

        Spacer(modifier = GlanceModifier.height(8.dp))

        if (orders.isEmpty()) {
            Box(
                modifier = GlanceModifier.fillMaxWidth().padding(vertical = 24.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Tiada tempahan akan datang.",
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#8E9E95")),
                        fontSize = 13.sp
                    )
                )
            }
        } else {
            Column(modifier = GlanceModifier.fillMaxWidth()) {
                val displayOrders = orders.take(4)
                for (order in displayOrders) {
                    val detailIntent = Intent(context, OrderDetailActivity::class.java).apply {
                        putExtra("order_id", order.id)
                        putExtra("orderId", order.id)
                        putExtra("client_name", order.company)
                        putExtra("pax", order.quantity)
                        putExtra("menu", order.menu)
                        putExtra("meal_type", order.menu)
                        putExtra("date_time", "${order.dateLabel} • ${order.timeLabel}")
                        putExtra("status", order.status)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val rowClick = actionStartActivity(detailIntent)

                    Box(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .background(androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#141D17")))
                            .padding(10.dp)
                            .clickable(rowClick)
                    ) {
                        Column(modifier = GlanceModifier.fillMaxWidth()) {
                            Row(modifier = GlanceModifier.fillMaxWidth()) {
                                Text(
                                    text = order.company,
                                    style = TextStyle(
                                        color = androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#FFFFFF")),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    ),
                                    modifier = GlanceModifier.defaultWeight()
                                )
                                Text(
                                    text = "${order.quantity} pax",
                                    style = TextStyle(
                                        color = androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#38BDF8")),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                )
                            }
                            Spacer(modifier = GlanceModifier.height(2.dp))
                            Text(
                                text = "📅 ${order.dateLabel} • ⏰ ${order.timeLabel}",
                                style = TextStyle(
                                    color = androidx.glance.unit.ColorProvider(android.graphics.Color.parseColor("#A3B8AD")),
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}
