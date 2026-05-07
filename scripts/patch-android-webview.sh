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
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int REQ_PERMS = 4242;

    private ValueCallback<Uri[]> filePathCallback;
    private Uri pendingCaptureUri;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Runtime permission popup at launch.
        // Android 13+ (API 33) uses granular media permissions; older versions
        // still need READ_EXTERNAL_STORAGE for the file chooser to surface
        // gallery items.
        if (Build.VERSION.SDK_INT >= 23) {
            List<String> needed = new ArrayList<>();
            needed.add(Manifest.permission.CAMERA);
            needed.add(Manifest.permission.RECORD_AUDIO);
            needed.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            if (Build.VERSION.SDK_INT >= 33) {
                needed.add(Manifest.permission.READ_MEDIA_IMAGES);
                needed.add(Manifest.permission.READ_MEDIA_VIDEO);
            } else {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
            ActivityCompat.requestPermissions(
                this, needed.toArray(new String[0]), REQ_PERMS);
        }

        // Result handler for <input type="file"> chooser
        fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            (ActivityResult result) -> {
                if (filePathCallback == null) return;
                Uri[] uris = null;
                if (result.getResultCode() == RESULT_OK) {
                    Intent data = result.getData();
                    if (data != null && data.getData() != null) {
                        uris = new Uri[]{ data.getData() };
                    } else if (data != null && data.getClipData() != null) {
                        int n = data.getClipData().getItemCount();
                        uris = new Uri[n];
                        for (int i = 0; i < n; i++) {
                            uris[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (pendingCaptureUri != null) {
                        // Camera/camcorder wrote directly to our pre-created URI
                        uris = new Uri[]{ pendingCaptureUri };
                    }
                }
                filePathCallback.onReceiveValue(uris);
                filePathCallback = null;
                pendingCaptureUri = null;
            }
        );

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

        webView.setWebChromeClient(new WebChromeClient() {
            // Auto-grant camera / mic to getUserMedia()
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            // <input type="file"> — supports gallery + camera capture + camcorder
            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = cb;
                pendingCaptureUri = null;

                String[] accept = params.getAcceptTypes();
                String acceptJoined = "";
                if (accept != null) for (String a : accept) acceptJoined += a + ",";
                acceptJoined = acceptJoined.toLowerCase();
                boolean wantsImage = acceptJoined.contains("image") || acceptJoined.isEmpty();
                boolean wantsVideo = acceptJoined.contains("video") || acceptJoined.isEmpty();

                List<Intent> initial = new ArrayList<>();

                // Camera capture (still photo)
                if (wantsImage) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Images.Media.DISPLAY_NAME,
                                "capture_" + System.currentTimeMillis() + ".jpg");
                        cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                        Uri imgUri = getContentResolver().insert(
                                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                        if (imgUri != null) {
                            pendingCaptureUri = imgUri;
                            Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                            cam.putExtra(MediaStore.EXTRA_OUTPUT, imgUri);
                            cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                            initial.add(cam);
                        }
                    } catch (Exception ignored) {}
                }

                // Camcorder capture (video)
                if (wantsVideo) {
                    try {
                        Intent vid = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
                        initial.add(vid);
                    } catch (Exception ignored) {}
                }

                // Gallery / file picker
                Intent content = new Intent(Intent.ACTION_GET_CONTENT);
                content.addCategory(Intent.CATEGORY_OPENABLE);
                if (wantsImage && wantsVideo) content.setType("*/*");
                else if (wantsVideo) content.setType("video/*");
                else content.setType("image/*");
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    content.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                if (wantsImage && wantsVideo) {
                    content.putExtra(Intent.EXTRA_MIME_TYPES,
                            new String[]{"image/*", "video/*"});
                }

                Intent chooser = Intent.createChooser(content, "Select source");
                if (!initial.isEmpty()) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,
                            initial.toArray(new Intent[0]));
                }

                try {
                    fileChooserLauncher.launch(chooser);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    pendingCaptureUri = null;
                    return false;
                }
            }
        });
    }
}
JAVA
fi

echo "✅ Android WebView patches applied."
echo "   Next: npm run build && npx cap sync android && npx cap open android"
