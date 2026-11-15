package com.wawasanpakusop.app.widgets

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.wawasanpakusop.app.BuildConfig
import com.wawasanpakusop.app.security.SecureStorage
import com.wawasanpakusop.app.widget.PricingWidgetFetchService
import com.wawasanpakusop.app.widget.WidgetUpdateService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit

/**
 * Periodically rotates the widget's stored Admin JWT while the current session
 * remains active, and sets WIDGET_AUTH_EXPIRED = true on 401/403 so Glance
 * widgets surface an explicit session-expired state instead of failing silently.
 */
class WidgetTokenRefreshWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val currentToken = try {
            SecureStorage.getAdminToken(applicationContext)
        } catch (e: Exception) {
            Log.e(TAG, "Unable to read secure admin token", e)
            return@withContext Result.retry()
        }

        if (currentToken.isNullOrBlank()) {
            if (SecureStorage.isWidgetAuthExpired(applicationContext)) {
                refreshWidgets(applicationContext)
            }
            return@withContext Result.success()
        }

        var conn: HttpURLConnection? = null
        try {
            val baseUrl = BuildConfig.RIDER_API_BASE_URL.ifBlank { DEFAULT_API_BASE_URL }
            val url = URL(URL(baseUrl), REFRESH_ENDPOINT)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                instanceFollowRedirects = false
                connectTimeout = 15_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Authorization", "Bearer $currentToken")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
            conn.outputStream.use { os ->
                os.write("{}".toByteArray(StandardCharsets.UTF_8))
            }

            val code = conn.responseCode
            if (code == 200) {
                val body = BufferedReader(InputStreamReader(conn.inputStream, StandardCharsets.UTF_8)).use {
                    it.readText()
                }
                val json = JSONObject(body)
                val nextToken = json.optString("token", "")
                if (json.optBoolean("success", false) && nextToken.isNotBlank()) {
                    SecureStorage.saveAdminToken(applicationContext, nextToken)
                    SecureStorage.setWidgetAuthExpired(applicationContext, false)
                    refreshWidgets(applicationContext)
                    return@withContext Result.success()
                }
                return@withContext Result.retry()
            }

            if (code == 401 || code == 403) {
                markSessionExpired(applicationContext)
                return@withContext Result.failure()
            }

            return@withContext Result.retry()
        } catch (e: Exception) {
            Log.w(TAG, "Widget token refresh failed transiently: ${e.message}")
            return@withContext Result.retry()
        } finally {
            conn?.disconnect()
        }
    }

    private fun markSessionExpired(context: Context) {
        try {
            SecureStorage.setWidgetAuthExpired(context, true)
            SecureStorage.getPrefs(context).edit()
                .remove(PricingWidgetFetchService.PREF_ORDERS_JSON)
                .remove(PricingWidgetFetchService.PREF_LAST_SUCCESS_AT)
                .apply()
            context.getSharedPreferences(WidgetUpdateService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(WidgetUpdateService.PREF_ORDERS_JSON)
                .remove(WidgetUpdateService.PREF_LAST_SUCCESS_AT)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed clearing widget cache on auth expiration", e)
        }
        refreshWidgets(context)
    }

    private fun refreshWidgets(context: Context) {
        PricingWidgetUpdater.refresh(context)
        UpcomingOrdersWidgetUpdater.refresh(context)
    }

    companion object {
        private const val TAG = "WidgetTokenRefreshWorker"
        private const val DEFAULT_API_BASE_URL = "https://restoran-wawasan-bio.onrender.com"
        private const val REFRESH_ENDPOINT = "/api/admin/refresh-widget-token"
        private const val PERIODIC_WORK_NAME = "wawasan_widget_token_refresh_periodic"
        private const val IMMEDIATE_WORK_NAME = "wawasan_widget_token_refresh_immediate"

        @JvmStatic
        fun schedulePeriodic(context: Context) {
            try {
                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
                val request = PeriodicWorkRequestBuilder<WidgetTokenRefreshWorker>(12, TimeUnit.HOURS)
                    .setConstraints(constraints)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
                    .build()
                WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
                    PERIODIC_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
            } catch (e: Exception) {
                Log.w(TAG, "Unable to schedule periodic widget token refresh", e)
            }
        }

        @JvmStatic
        fun triggerImmediate(context: Context) {
            try {
                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
                val request = OneTimeWorkRequestBuilder<WidgetTokenRefreshWorker>()
                    .setConstraints(constraints)
                    .build()
                WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                    IMMEDIATE_WORK_NAME,
                    ExistingWorkPolicy.KEEP,
                    request
                )
            } catch (e: Exception) {
                Log.w(TAG, "Unable to trigger immediate widget token refresh", e)
            }
        }

        @JvmStatic
        fun cancel(context: Context) {
            try {
                val wm = WorkManager.getInstance(context.applicationContext)
                wm.cancelUniqueWork(PERIODIC_WORK_NAME)
                wm.cancelUniqueWork(IMMEDIATE_WORK_NAME)
            } catch (e: Exception) {
                Log.w(TAG, "Unable to cancel widget token refresh work", e)
            }
        }
    }
}
