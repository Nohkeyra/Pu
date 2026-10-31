package com.wawasanpakusop.app.widgets

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.ImageProvider
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
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
import androidx.glance.unit.ColorProvider
import com.wawasanpakusop.app.MainActivity
import com.wawasanpakusop.app.R
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
    override val sizeMode = SizeMode.Exact

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
    Column(
        modifier = GlanceModifier.fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(10.dp)
    ) {
        GlassWidgetHeader("TEMPAHAN AKAN DATANG", "TEMPAHAN", orders.size, actionRunCallback<RefreshUpcomingOrdersGlanceActionCallback>())
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
                Text("Tiada tempahan akan datang", style = TextStyle(color = widgetMuted, fontSize = 12.sp))
            }
        } else {
            LazyColumn(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                items(orders.size) { index ->
                    val order = orders[index]
                    val detailIntent = Intent(context, OrderDetailActivity::class.java).apply {
                        data = Uri.parse("wawasan-widget://upcoming/${Uri.encode(order.id)}")
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
                    Row(
                        modifier = GlanceModifier.fillMaxWidth().padding(bottom = 6.dp)
                            .background(ImageProvider(R.drawable.widget_glass_card))
                            .clickable(actionStartActivity(detailIntent)).padding(10.dp),
                        verticalAlignment = Alignment.Vertical.CenterVertically
                    ) {
                        Column(modifier = GlanceModifier.defaultWeight()) {
                            Text(order.company, maxLines = 1, style = TextStyle(color = widgetText, fontSize = 13.sp, fontWeight = FontWeight.Bold))
                            Spacer(modifier = GlanceModifier.height(3.dp))
                            Text("${order.dateLabel}  •  ${order.timeLabel}", maxLines = 1, style = TextStyle(color = widgetMuted, fontSize = 11.sp))
                            Text("${order.quantity} orang", maxLines = 1, style = TextStyle(color = widgetMuted, fontSize = 10.sp))
                        }
                        Text("›", style = TextStyle(color = widgetText, fontSize = 22.sp))
                    }
                }
            }
        }
    }
}
