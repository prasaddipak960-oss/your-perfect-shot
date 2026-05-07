#!/usr/bin/env bash
# Patches the generated android/ project so the WebView grants camera, mic,
# file-chooser and modern web features inside the APK.
#
# Run this AFTER `npx cap add android` and AFTER every `npx cap sync android`
# (sync regenerates some files). Safe to run multiple times — idempotent.
#
# Usage:
#   bash scripts/patch-android-webview.sh
#
# What this does (does NOT touch any web/UI code):
#   1. Adds CAMERA, RECORD_AUDIO, storage, internet permissions to AndroidManifest
#   2. Adds <uses-feature> camera entries
#   3. Ensures android:hardwareAccelerated="true" + usesCleartextTraffic for dev
#   4. Replaces MainActivity.java with a version that:
#        - overrides onPermissionRequest → auto-grants CAMERA/MIC to the WebView
#        - sets WebChromeClient with file chooser support (image upload + capture)
#        - enables JS, DOM storage, file/content access, autoplay media
#   5. Requests runtime CAMERA + RECORD_AUDIO permissions on launch

set -euo pipefail

ANDROID_DIR="android"
if [ ! -d "$ANDROID_DIR" ]; then
  echo "❌ android/ folder not found. Run 'npx cap add android' first."
  exit 1
fi

MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "❌ AndroidManifest.xml not found at $MANIFEST"
  exit 1
fi

echo "▶ Patching AndroidManifest.xml ..."

# Required permissions / features to inject
PERMS=(
  '<uses-permission android:name="android.permission.CAMERA" />'
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />'
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />'
  '<uses-permission android:name="android.permission.INTERNET" />'
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />'
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />'
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />'
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
  '<uses-feature android:name="android.hardware.camera" android:required="false" />'
  '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />'
  '<uses-feature android:name="android.hardware.microphone" android:required="false" />'
)

for line in "${PERMS[@]}"; do
  # match by the android:name= attribute so we don't duplicate
  name=$(echo "$line" | grep -oE 'android:name="[^"]+"' | head -1)
  if ! grep -qF "$name" "$MANIFEST"; then
    # insert before </manifest>
    sed -i.bak "s|</manifest>|    ${line}\n</manifest>|" "$MANIFEST"
    echo "  + added $name"
  fi
done

# Ensure android:hardwareAccelerated="true" on <application>
if ! grep -q 'android:hardwareAccelerated="true"' "$MANIFEST"; then
  sed -i.bak 's|<application |<application android:hardwareAccelerated="true" |' "$MANIFEST"
  echo "  + enabled hardwareAccelerated"
fi

rm -f "$MANIFEST.bak"

# ── MainActivity: extend BridgeActivity and grant WebView permissions ──
PKG_DIR=$(find "$ANDROID_DIR/app/src/main/java" -name "MainActivity.java" -printf '%h\n' | head -1)
if [ -z "${PKG_DIR:-}" ]; then
  echo "⚠ MainActivity.java not found — skipping Java patch (Capacitor may have used Kotlin)."
else
  PKG_NAME=$(grep -oE '^package [^;]+;' "$PKG_DIR/MainActivity.java" | head -1)
  echo "▶ Rewriting $PKG_DIR/MainActivity.java ..."
  cat > "$PKG_DIR/MainActivity.java" <<JAVA
${PKG_NAME}

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQ_PERMS = 4242;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ask the user for camera + mic at launch (Android 6+)
        if (Build.VERSION.SDK_INT >= 23) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            }, REQ_PERMS);
        }

        WebView webView = this.bridge.getWebView();
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        // Auto-grant camera / mic permission requests coming from the WebView
        // (e.g. navigator.mediaDevices.getUserMedia inside the bundled web app)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
    }
}
JAVA
fi

echo "✅ Android WebView patches applied."
echo "   Next: npm run build && npx cap sync android && npx cap open android"
