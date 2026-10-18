package com.wawasanpakusop.app.telemetry

import android.content.Context
import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Centralized telemetry and crash reporting for Android native components
 * (Glance widgets, background services, broadcast receivers, and native activities).
 */
object NativeCrashReporter {

    private const val TAG = "NativeCrashReporter"
    private var isInitialized = false

    @JvmStatic
    @Synchronized
    fun initialize(context: Context) {
        if (isInitialized) return
        isInitialized = true

        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                Log.e(TAG, "Uncaught native exception in thread: ${thread.name}", throwable)
                recordException(throwable, mapOf("thread_name" to thread.name, "source" to "native_uncaught_handler"))
            } catch (ignored: Exception) {
            } finally {
                defaultHandler?.uncaughtException(thread, throwable)
            }
        }

        Log.i(TAG, "NativeCrashReporter initialized with Firebase Crashlytics hook")
    }

    @JvmStatic
    fun recordException(throwable: Throwable, attributes: Map<String, String> = emptyMap()) {
        try {
            val crashlytics = FirebaseCrashlytics.getInstance()
            attributes.forEach { (k, v) ->
                crashlytics.setCustomKey(k, v)
            }
            crashlytics.recordException(throwable)
        } catch (e: Exception) {
            Log.w(TAG, "Crashlytics unavailable to record exception: ${throwable.message}")
        }
    }

    @JvmStatic
    fun logBreadcrumb(message: String) {
        try {
            FirebaseCrashlytics.getInstance().log(message)
        } catch (e: Exception) {
            Log.d(TAG, "Breadcrumb: $message")
        }
    }

    @JvmStatic
    fun setUserId(userId: String) {
        try {
            FirebaseCrashlytics.getInstance().setUserId(userId)
        } catch (ignored: Exception) {
        }
    }
}
