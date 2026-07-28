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
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# F-34 (audit, confirmed by Noh 2026-07-27): minifyEnabled is now true in
# app/build.gradle. These widget/activity classes are referenced only by
# fully-qualified name in AndroidManifest.xml / RemoteViewsService intents,
# not by direct Java/Kotlin references R8 can trace — without these -keep
# rules, R8 could strip or rename them, breaking the home-screen widget in
# a release build with no build-time error (ClassNotFoundException only
# shows up at runtime on-device). Test an actual signed release APK's
# widget after this before shipping it.
-keep class com.wawasanpakusop.app.widget.** { *; }
-keep class com.wawasanpakusop.app.MainActivity { *; }
-keep class com.wawasanpakusop.app.ShareUtils { *; }
-keep class com.wawasanpakusop.app.ShareUtils$* { *; }
