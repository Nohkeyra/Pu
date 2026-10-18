package com.wawasan.app.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class PricingGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // In a production app, you can read your latest pricing from Room DB or DataStore here
        val currentPrice = "RM 10.00"
        val operationalStatus = "Open"

        provideContent {
            GlanceTheme {
                PricingWidgetContent(price = currentPrice, status = operationalStatus)
            }
        }
    }
}

@Composable
fun PricingWidgetContent(price: String, status: String) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.background)
            .padding(16.dp),
        verticalAlignment = Alignment.Vertical.CenterVertically,
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally
    ) {
        Text(
            text = "Restoran Wawasan Pak Usop",
            style = TextStyle(
                color = GlanceTheme.colors.onBackground,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        )
        Spacer(modifier = GlanceModifier.height(6.dp))
        Text(
            text = price,
            style = TextStyle(
                color = GlanceTheme.colors.primary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
            text = "Status: $status",
            style = TextStyle(
                color = GlanceTheme.colors.secondary,
                fontSize = 11.sp
            )
        )
    }
}
