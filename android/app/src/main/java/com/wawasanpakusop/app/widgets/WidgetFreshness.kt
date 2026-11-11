package com.wawasanpakusop.app.widgets

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Shared, conservative freshness policy for both home-screen widgets.
 * Unknown timestamps never imply that an empty cache means zero orders.
 */
internal data class WidgetFreshnessStatus(
    val label: String,
    val compactLabel: String,
    val isStale: Boolean,
    val hasSuccessfulSync: Boolean
)

internal object WidgetFreshness {
    const val STALE_AFTER_MS = 2L * 60 * 60 * 1000

    fun from(lastSuccessAt: Long, nowMillis: Long = System.currentTimeMillis()): WidgetFreshnessStatus {
        if (lastSuccessAt <= 0 || lastSuccessAt > nowMillis) {
            return WidgetFreshnessStatus("Belum disegerak", "Belum sync", true, false)
        }

        val stale = nowMillis - lastSuccessAt >= STALE_AFTER_MS
        if (stale) {
            return WidgetFreshnessStatus("Data lama · tekan ↻", "Data lama", true, true)
        }

        val time = SimpleDateFormat("HH:mm", Locale.forLanguageTag("ms-MY")).format(Date(lastSuccessAt))
        return WidgetFreshnessStatus("Kemas kini $time", time, false, true)
    }
}
