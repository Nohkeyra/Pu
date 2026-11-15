package com.wawasanpakusop.app.widget

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.wawasanpakusop.app.security.SecureStorage
import com.wawasanpakusop.app.telemetry.NativeCrashReporter
import com.wawasanpakusop.app.widgets.PricingWidgetUpdater
import com.wawasanpakusop.app.widgets.UpcomingOrdersWidgetUpdater
import com.wawasanpakusop.app.widgets.WidgetTokenRefreshWorker
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors

/**
 * Manages persistent offline queueing for price submissions from the native widget
 * or overlay activities. Ensures no price entry is dropped during network outages.
 */
object OfflinePricingQueue {

    private const val TAG = "OfflinePricingQueue"
    private const val API_BASE_URL = "https://restoran-wawasan-bio.onrender.com"
    private const val ENDPOINT = "/api/widget/set-pricing"
    private val executor = Executors.newSingleThreadExecutor()

    @JvmStatic
    fun isOnline(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    @JvmStatic
    @Synchronized
    fun enqueue(context: Context, orderId: String, prices: Map<String, Double>) {
        try {
            val rawQueue = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
            val array = JSONArray(rawQueue)

            val nowMs = System.currentTimeMillis()
            val item = JSONObject().apply {
                put("orderId", orderId)
                put("prices", JSONObject(prices))
                put("clientTimestamp", nowMs)
                put("timestamp", nowMs)
                put("status", "pending_sync")
            }

            // Remove previous pending entry for same orderId if present
            val newArray = JSONArray()
            for (i in 0 until array.length()) {
                val existing = array.getJSONObject(i)
                if (existing.optString("orderId") != orderId) {
                    newArray.put(existing)
                }
            }
            newArray.put(item)

            SecureStorage.saveString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, newArray.toString())
            Log.i(TAG, "Enqueued offline pricing for order $orderId. Total pending: ${newArray.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enqueue offline pricing", e)
            NativeCrashReporter.recordException(e, mapOf("action" to "enqueue_offline_pricing"))
        }
    }

    @JvmStatic
    @Synchronized
    fun getPendingCount(context: Context): Int {
        return try {
            val raw = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
            JSONArray(raw).length()
        } catch (e: Exception) {
            0
        }
    }

    @JvmStatic
    @Synchronized
    fun hasPendingOrder(context: Context, orderId: String): Boolean {
        return try {
            val raw = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                if (arr.getJSONObject(i).optString("orderId") == orderId) return true
            }
            false
        } catch (e: Exception) {
            false
        }
    }

    @JvmStatic
    fun flushQueueAsync(context: Context, onComplete: ((successCount: Int, failedCount: Int) -> Unit)? = null) {
        if (!isOnline(context)) {
            Log.d(TAG, "Device offline; skipping queue flush.")
            onComplete?.invoke(0, getPendingCount(context))
            return
        }

        executor.execute {
            var successCount = 0
            var failedCount = 0
            var conflictDetected = false
            var authExpired = false

            synchronized(this) {
                val raw = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
                val queue = try { JSONArray(raw) } catch (e: Exception) { JSONArray() }
                if (queue.length() == 0) return@execute

                val remaining = JSONArray()
                val adminToken = SecureStorage.getAdminToken(context)
                if (adminToken.isNullOrBlank()) {
                    Log.w(TAG, "Admin session missing; pending prices remain queued until the admin signs in again.")
                    onComplete?.invoke(0, queue.length())
                    return@execute
                }

                for (i in 0 until queue.length()) {
                    val item = queue.getJSONObject(i)
                    val orderId = item.optString("orderId")
                    val prices = item.optJSONObject("prices")
                    val clientTimestamp = item.optLong("clientTimestamp", item.optLong("timestamp", System.currentTimeMillis()))

                    if (orderId.isNullOrEmpty() || prices == null) continue

                    if (authExpired) {
                        failedCount++
                        remaining.put(item)
                        continue
                    }

                    val body = JSONObject().apply {
                        put("orderId", orderId)
                        put("prices", prices)
                        put("clientTimestamp", clientTimestamp)
                    }

                    when (sendPriceUpdate(body.toString(), adminToken)) {
                        SyncOutcome.SYNCED -> {
                            successCount++
                            Log.i(TAG, "Successfully synced pending order: $orderId")
                        }
                        SyncOutcome.CONFLICT -> {
                            failedCount++
                            conflictDetected = true
                            // Reject stale local change and remove from retry queue; server recorded admin conflict alert.
                            Log.w(TAG, "Conflict (HTTP 409) rejected stale offline pricing for order: $orderId")
                        }
                        SyncOutcome.AUTH_EXPIRED -> {
                            failedCount++
                            authExpired = true
                            remaining.put(item)
                            Log.w(TAG, "Widget auth expired while syncing pending order: $orderId")
                        }
                        SyncOutcome.TRANSIENT_ERROR -> {
                            failedCount++
                            remaining.put(item)
                        }
                    }
                }

                SecureStorage.saveString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, remaining.toString())
            }

            if (authExpired) {
                SecureStorage.setWidgetAuthExpired(context, true)
                WidgetTokenRefreshWorker.triggerImmediate(context)
                PricingWidgetUpdater.refresh(context)
                UpcomingOrdersWidgetUpdater.refresh(context)
            } else if (successCount > 0 || conflictDetected) {
                PricingWidgetUpdater.refresh(context)
            }
            onComplete?.invoke(successCount, failedCount)
        }
    }

    private enum class SyncOutcome {
        SYNCED,
        CONFLICT,
        AUTH_EXPIRED,
        TRANSIENT_ERROR
    }

    private fun sendPriceUpdate(requestBody: String, adminToken: String): SyncOutcome {
        return try {
            val url = URL(API_BASE_URL + ENDPOINT)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            conn.setRequestProperty("Authorization", "Bearer $adminToken")
            conn.connectTimeout = 15000
            conn.readTimeout = 20000
            conn.doOutput = true

            conn.outputStream.use { os: OutputStream ->
                val input = requestBody.toByteArray(StandardCharsets.UTF_8)
                os.write(input, 0, input.size)
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val response = if (stream != null) {
                BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
            } else {
                "{}"
            }
            conn.disconnect()

            if (code == 401 || code == 403) {
                return SyncOutcome.AUTH_EXPIRED
            }
            if (code == 409) {
                return SyncOutcome.CONFLICT
            }

            val json = try { JSONObject(response) } catch (_: Exception) { JSONObject() }
            if (code in 200..299 && json.optBoolean("success", false)) {
                SyncOutcome.SYNCED
            } else {
                SyncOutcome.TRANSIENT_ERROR
            }
        } catch (e: Exception) {
            Log.w(TAG, "Sync attempt failed: ${e.message}")
            SyncOutcome.TRANSIENT_ERROR
        }
    }
}
