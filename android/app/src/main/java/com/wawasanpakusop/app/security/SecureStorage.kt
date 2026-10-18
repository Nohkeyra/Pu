package com.wawasanpakusop.app.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Hardware-backed secure storage using Android Jetpack Security (EncryptedSharedPreferences).
 * Encrypts keys and values using AES-256-SIV (keys) and AES-256-GCM (values)
 * managed by Android Keystore.
 */
object SecureStorage {

    private const val TAG = "SecureStorage"
    private const val SECURE_PREFS_FILE = "wawasan_secure_prefs"

    // Key constants
    const val KEY_ADMIN_TOKEN = "admin_auth_jwt"
    const val KEY_WIDGET_API_KEY = "widget_api_key"
    const val KEY_OFFLINE_PRICING_QUEUE = "offline_pricing_queue"
    const val KEY_CACHED_PRICING_ORDERS = "cached_pricing_orders"

    @Volatile
    private var securePrefs: SharedPreferences? = null

    @JvmStatic
    @Synchronized
    fun getPrefs(context: Context): SharedPreferences {
        if (securePrefs == null) {
            synchronized(this) {
                if (securePrefs == null) {
                    securePrefs = createEncryptedPreferences(context.applicationContext)
                }
            }
        }
        return securePrefs!!
    }

    private fun createEncryptedPreferences(appContext: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(appContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                appContext,
                SECURE_PREFS_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.e(
                TAG,
                "Failed to initialize EncryptedSharedPreferences; falling back to private SharedPreferences.",
                e
            )
            appContext.getSharedPreferences(SECURE_PREFS_FILE + "_fallback", Context.MODE_PRIVATE)
        }
    }

    @JvmStatic
    fun saveString(context: Context, key: String, value: String?) {
        val editor = getPrefs(context).edit()
        if (value != null) {
            editor.putString(key, value)
        } else {
            editor.remove(key)
        }
        editor.apply()
    }

    @JvmStatic
    fun getString(context: Context, key: String, defaultValue: String? = null): String? {
        return getPrefs(context).getString(key, defaultValue)
    }

    @JvmStatic
    fun saveAdminToken(context: Context, token: String?) {
        saveString(context, KEY_ADMIN_TOKEN, token)
    }

    @JvmStatic
    fun getAdminToken(context: Context): String? {
        return getString(context, KEY_ADMIN_TOKEN, null)
    }

    @JvmStatic
    fun saveWidgetKey(context: Context, key: String?) {
        saveString(context, KEY_WIDGET_API_KEY, key)
    }

    @JvmStatic
    fun getWidgetKey(context: Context): String? {
        return getString(context, KEY_WIDGET_API_KEY, null)
    }

    @JvmStatic
    fun clearAll(context: Context) {
        getPrefs(context).edit().clear().apply()
    }
}
