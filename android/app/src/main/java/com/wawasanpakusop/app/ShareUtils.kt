package com.wawasanpakusop.app

import android.content.Context
import android.content.Intent

/**
 * Reusable share helper for building and firing the native share intent.
 *
 * NOTE ON THIS PROJECT: this app is a Capacitor app whose MainActivity is
 * written in Java (MainActivity.java, extending BridgeActivity). In production
 * the recommended path is to share from the web layer via src/lib/share.ts
 * (Capacitor @capacitor/share plugin), which already handles WhatsApp / SMS /
 * email through the same system share sheet this file triggers.
 *
 * This Kotlin object is provided because it was explicitly requested and is a
 * clean, standalone native implementation. To compile it you must enable Kotlin
 * in android/app/build.gradle (apply the kotlin-android plugin and add the
 * kotlin-stdlib dependency). It can then be called from Java as
 * ShareUtils.INSTANCE.shareOrderForm(context).
 */
object ShareUtils {

    /**
     * Live public URL of the deployed order form. Plain web link — opens in any
     * browser, no app install required. The site is a HashRouter SPA, so the
     * order form lives at the #/order route.
     */
    const val ORDER_FORM_URL = "https://restoran-wawasan-bio.onrender.com/#/order"

    /**
     * Canonical shareable URL that opens the (empty) order form so the customer
     * can fill in their own order details.
     */
    fun buildOrderFormUrl(): String = ORDER_FORM_URL

    /**
     * Trigger the system's native Share sheet (ACTION_SEND) to send a customer
     * a link to the order form. Produces a link like
     * https://restoranwawasan.com/share that opens this app via the /share
     * intent-filter (see MainActivity.handleDeepLink) and routes the customer
     * straight to the order form to enter their own details.
     *
     * @param context   any Context (Activity preferred so the chooser is themed)
     * @param message   optional custom message; the URL is appended if absent
     */
    @JvmStatic
    @JvmOverloads
    fun shareOrderForm(context: Context, message: String? = null) {
        val url = buildOrderFormUrl()
        val body = message?.let { "$it\n$url" } ?: "Place your order here: $url"

        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Restoran Wawasan Pak Usop")
            putExtra(Intent.EXTRA_TEXT, body)
        }

        val chooser = Intent.createChooser(sendIntent, "Share order form").apply {
            if (context !is android.app.Activity) {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        }
        context.startActivity(chooser)
    }
}
