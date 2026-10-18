package com.wawasanpakusop.app.widget

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.wawasanpakusop.app.security.SecureStorage
import com.wawasanpakusop.app.telemetry.NativeCrashReporter
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

    fun isOnline(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    @Synchronized
    fun enqueue(context: Context, orderId: String, prices: Map<String, Double>) {
        try {
            val rawQueue = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
            val array = JSONArray(rawQueue)

            val item = JSONObject().apply {
                put("orderId", orderId)
                put("prices", JSONObject(prices))
                put("timestamp", System.currentTimeMillis())
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

    @Synchronized
    fun getPendingCount(context: Context): Int {
        return try {
            val raw = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
            JSONArray(raw).length()
        } catch (e: Exception) {
            0
        }
    }

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

    fun flushQueueAsync(context: Context, onComplete: ((successCount: Int, failedCount: Int) -> Unit)? = null) {
        if (!isOnline(context)) {
            Log.d(TAG, "Device offline; skipping queue flush.")
            onComplete?.invoke(0, getPendingCount(context))
            return
        }

        executor.execute {
            var successCount = 0
            var failedCount = 0

            synchronized(this) {
                val raw = SecureStorage.getString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, "[]")
                val queue = try { JSONArray(raw) } catch (e: Exception) { JSONArray() }
                if (queue.length() == 0) return@execute

                val remaining = JSONArray()
                val apiKey = SecureStorage.getWidgetKey(context) ?: PricingWidgetFetchService.WIDGET_API_KEY
                val adminToken = SecureStorage.getAdminToken(context)

                for (i in 0 until queue.length()) {
                    val item = queue.getJSONObject(i)
                    val orderId = item.optString("orderId")
                    val prices = item.optJSONObject("prices")

                    if (orderId.isNullOrEmpty() || prices == null) continue

                    val body = JSONObject().apply {
                        put("orderId", orderId)
                        put("prices", prices)
                    }

                    val success = sendPriceUpdate(body.toString(), apiKey, adminToken)
                    if (success) {
                        successCount++
                        Log.i(TAG, "Successfully synced pending order: $orderId")
                    } else {
                        failedCount++
                        remaining.put(item)
                    }
                }

                SecureStorage.saveString(context, SecureStorage.KEY_OFFLINE_PRICING_QUEUE, remaining.toString())
            }

            if (successCount > 0) {
                PricingWidgetProvider.requestRefresh(context)
            }
            onComplete?.invoke(successCount, failedCount)
        }
    }

    private fun sendPriceUpdate(requestBody: String, widgetKey: String?, adminToken: String?): Boolean {
        return try {
            val url = URL(API_BASE_URL + ENDPOINT)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            if (!widgetKey.isNullOrEmpty()) {
                conn.setRequestProperty("x-widget-key", widgetKey)
            }
            if (!adminToken.isNullOrEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer $adminToken")
            }
            conn.connectTimeout = 15000
            conn.readTimeout = 20000
            conn.doOutput = true

            conn.outputStream.use { os: OutputStream ->
                val input = requestBody.toByteArray(StandardCharsets.UTF_8)
                os.write(input, 0, input.length)
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val response = BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
            conn.disconnect()

            val json = JSONObject(response)
            json.optBoolean("success", false)
        } catch (e: Exception) {
            Log.w(TAG, "Sync attempt failed: ${e.message}")
            false
        }
    }
}
