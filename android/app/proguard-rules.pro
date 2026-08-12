# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keep class com.wawasanpakusop.app.widget.** { *; }
-keep class com.wawasanpakusop.app.MainActivity { *; }

# Capacitor Core & Android Runtime
-keep class com.getcapacitor.** { *; }
-keep public class com.getcapacitor.* { *; }
-dontwarn com.getcapacitor.**

# Capacitor Plugins (including Capacitor Updater & Firebase plugins)
-keep class ee.forgr.capacitor_updater.** { *; }
-dontwarn ee.forgr.capacitor_updater.**
-keep class com.capacitorjs.** { *; }
-keep class capacitor.android.** { *; }
-keep class com.capacitor_community.** { *; }
-keep class @capacitor-firebase.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# OkHttp, Okio, Gson, and Networking
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keep class com.google.gson.** { *; }
-keep class sun.misc.Unsafe { *; }

