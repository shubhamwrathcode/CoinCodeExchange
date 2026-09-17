# React Native 0.79 + Hermes + New Architecture
# Keep reflection/JNI surfaces. Do not keep all of AndroidX/GMS — that tanks Play obfuscation %.

-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStripAny
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStripAny

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep @com.facebook.proguard.annotations.DoNotStripAny class * {
    *;
}
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.jni.annotations.DoNotStrip *;
}
-keep @com.facebook.jni.annotations.DoNotStripAny class * {
    *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod *;
    public <init>(...);
}
-keepnames class * extends com.facebook.react.uimanager.ViewManager
-keepnames class * extends com.facebook.react.uimanager.ReactShadowNode
-keep class **$$PropsSetter
-keep class **$$ReactModuleInfoProvider

-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }
-keep,includedescriptorclasses class com.facebook.react.internal.turbomodule.core.** { *; }
-keep class com.facebook.react.bridge.ReadableType { *; }
-keepclassmembers class com.facebook.react.bridge.queue.MessageQueueThread {
  public boolean isOnThread();
  public void assertIsOnThread();
}

-dontwarn com.facebook.react.**
-dontwarn com.facebook.jni.**

# RN 0.79 New Architecture / Hermes — keep the whole RN surface so release does not crash on launch
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.perftest.** { *; }
-keep class com.facebook.systrace.** { *; }
-keep class com.facebook.debug.** { *; }
-keep class com.facebook.proguard.** { *; }

-keep class * implements com.facebook.react.ReactPackage { *; }
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule { *; }
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }

# App native modules
-keep class com.coincode.exchange.** { *; }

# Yoga
-keep,allowobfuscation @interface com.facebook.yoga.annotations.DoNotStrip
-keep @com.facebook.yoga.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.yoga.annotations.DoNotStrip *;
}

# Reanimated / Gesture Handler / Screens (JNI + codegen)
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# FastImage / Glide
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule {
 <init>(...);
}
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
  **[] $VALUES;
  public *;
}
-keep class com.bumptech.glide.load.data.ParcelFileDescriptorRewinder$InternalRewinder {
  *** rewind();
}

# Image crop picker / uCrop
-keep class com.yalantis.ucrop.** { *; }
-keep interface com.yalantis.ucrop.** { *; }
-keep class com.reactnative.ivpusic.imagepicker.** { *; }

# Lottie
-keep class com.airbnb.lottie.** { *; }

# Google Sign-In (AAR also ships consumer rules)
-keep class com.google.android.gms.auth.api.signin.** { *; }

# Passkeys / Credential Manager
-keep class androidx.credentials.** { *; }
-keep class androidx.credentials.playservices.** { *; }
-keep class androidx.credentials.exceptions.** { *; }

# WebView / reCAPTCHA
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, java.lang.String);
}

# Push notifications
-keep class com.dieam.reactnativepushnotification.** { *; }

# Hardware back (DeviceEventManagerModule / OnBackPressedDispatcher)
-keep class com.facebook.react.modules.core.DeviceEventManagerModule { *; }
-keep class androidx.activity.OnBackPressedDispatcher { *; }
-keep class androidx.activity.OnBackPressedCallback { *; }

# SVG / vector icons reflection
-keep class com.horcrux.svg.** { *; }
-keep public class com.horcrux.rnsvg.** { *; }

# Okio
-keep class sun.misc.Unsafe { *; }
-dontwarn java.nio.file.**
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn okio.**
-dontwarn okhttp3.**
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlin.**

# Crash deobfuscation (upload mapping.txt to Play)
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,Exceptions,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Optimization (not renaming) is what typically breaks RN release launches.
-dontoptimize

# Third-party RN modules (JNI / reflection)
-keep class com.swmansion.** { *; }
-keep class com.th3rdwave.** { *; }
-keep class com.reactnativecommunity.** { *; }
-keep class org.devio.** { *; }
-keep class com.learnium.** { *; }
-keep class com.zoontek.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.google.android.libraries.** { *; }
-keep class kotlinx.** { *; }
-keep class com.bumptech.glide.** { *; }
-keep class **AppGlideModule { *; }
-keep class **GeneratedAppGlideModuleImpl { *; }
-keep class androidx.activity.** { *; }
-keep class androidx.core.view.WindowCompat { *; }
-keep class com.facebook.fbreact.specs.** { *; }
-keep class com.facebook.react.viewmanagers.** { *; }
-keep class com.oblador.** { *; }
-keep class cl.json.** { *; }
-keep class com.RNFetchBlob.** { *; }
-keep class app.notifee.** { *; }
-keep class io.invertase.** { *; }
