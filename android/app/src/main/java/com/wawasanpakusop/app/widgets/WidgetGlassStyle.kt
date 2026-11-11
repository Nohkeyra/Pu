package com.wawasanpakusop.app.widgets

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.wawasanpakusop.app.R

// Match the Bold Heritage palette in tokens/colors.css (.dark).
// Android home-screen widgets render outside the WebView, so this visual palette
// is intentionally fixed rather than depending on the launcher/device theme.
internal val widgetText = ColorProvider(Color(0xFFFFF8EC))
internal val widgetMuted = ColorProvider(Color(0xFFC1B7B1))
internal val widgetGold = ColorProvider(Color(0xFFFFB02E))
internal val widgetAmberText = ColorProvider(Color(0xFF211A19))

@Composable
internal fun GlassWidgetHeader(title: String, compactTitle: String, count: Int, refresh: Action) {
    val compact = LocalSize.current.width < 260.dp
    Column(modifier = GlanceModifier.fillMaxWidth()) {
        Box(
            modifier = GlanceModifier.fillMaxWidth()
                .background(ImageProvider(R.drawable.widget_batik_header_background))
                .padding(horizontal = 7.dp, vertical = 4.dp)
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.Vertical.CenterVertically
            ) {
                Image(
                    provider = ImageProvider(R.drawable.widget_neon_logo),
                    contentDescription = "Restoran Wawasan",
                    contentScale = ContentScale.Fit,
                    modifier = GlanceModifier.width(if (compact) 58.dp else 78.dp).height(42.dp)
                )
                Spacer(modifier = GlanceModifier.width(8.dp))
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(
                        text = if (compact) compactTitle else title,
                        maxLines = 1,
                        style = TextStyle(color = widgetGold, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                    )
                    Text(
                        text = count.toString().padStart(2, '0'),
                        maxLines = 1,
                        style = TextStyle(color = widgetText, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    )
                }
                Box(
                    modifier = GlanceModifier.width(44.dp).height(44.dp)
                        .background(ImageProvider(R.drawable.widget_glass_card))
                        .clickable(refresh),
                    contentAlignment = Alignment.Center
                ) {
                    Text("↻", style = TextStyle(color = widgetGold, fontSize = 24.sp))
                }
            }
        }
        Spacer(modifier = GlanceModifier.height(8.dp))
    }
}
