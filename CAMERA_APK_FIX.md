# 📷 Camera-in-APK Fix (Android WebView)

Camera website pe chalti hai but APK mein nahi? Ye guide bilkul wahi karta hai —
**zero UI / design / feature changes**. Sirf native Android WebView ko configure
karta hai taaki camera + mic + file upload allow ho jaaye.

## Ek baar (after `npx cap add android`)

```bash
bash scripts/patch-android-webview.sh
```

Ye script idempotent hai — har baar `npx cap sync android` ke baad re-run kar sakte ho.

## Kya patch hota hai

### 1. AndroidManifest.xml mein permissions
- `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` (Android 13+)
- `WRITE/READ_EXTERNAL_STORAGE` (≤ Android 12)
- `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`
- `<uses-feature>` camera/mic (required=false → Play Store mein bahut devices eligible)
- `android:hardwareAccelerated="true"` on `<application>`

### 2. MainActivity.java
- `WebSettings`: JS, DOM storage, file access, content access, autoplay media,
  mixed-content compat, wide viewport
- `WebChromeClient.onPermissionRequest` → camera/mic auto-grant (warna `getUserMedia` WebView mein silently fail hota hai — yahi tera asli bug hai)
- Runtime permission popup launch pe (`ActivityCompat.requestPermissions`)

### 3. Kuch bhi remove ya redesign nahi
- React app, camera UI, filters, gallery, splash — sab as-is.
- `capacitor.config.ts` already correct hai (`server.url` removed).

## Full flow

```bash
npm install
npx cap add android                    # only first time
bash scripts/patch-android-webview.sh  # apply WebView fixes
npm run build
npx cap sync android
npx cap open android                   # → Build APK / AAB in Android Studio
```

Ya phir GitHub Actions use kar (see `GITHUB_ACTIONS.md`) — workflow `cap add` ke baad
automatically ye script chala leta hai.

## Verify on device

1. APK install karo
2. First launch pe Android system popup aana chahiye: "Allow Camera?" + "Allow Microphone?"
3. Allow karo → camera preview turant aa jaayega (jaise browser mein aata hai)
4. Photo capture / video record / share / gallery — sab kaam karega
5. Airplane mode on karke bhi app khulna chahiye (offline-ready)

## Agar abhi bhi camera black ho

```bash
adb logcat | grep -iE "permission|camera|getusermedia|webview"
```
Common culprits: device pe pehle "Don't ask again" denied kiya tha → Settings → Apps → Your Perfect Shot → Permissions → Camera = Allow.
