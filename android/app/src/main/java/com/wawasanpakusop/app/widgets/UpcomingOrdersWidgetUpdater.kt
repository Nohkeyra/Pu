package com.wawasanpakusop.app.widgets

import android.content.Context
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

object UpcomingOrdersWidgetUpdater {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @JvmStatic
    fun refresh(context: Context) {
        scope.launch {
            try {
                UpcomingOrdersGlanceWidget().updateAll(context)
            } catch (e: Exception) {
                android.util.Log.w("UpcomingOrdersWidgetUpdater", "Failed to update Glance widgets", e)
            }
        }
    }
}
