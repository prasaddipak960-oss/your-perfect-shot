# Build Real Native APK (Android) — Your Perfect Shot

This project is configured as a **true native Capacitor app**, not a WebView clone.
The APK ships with bundled offline assets — no remote URL, no internet required,
and Android grants real native camera/mic permissions.

## ✅ What's already configured

- `capacitor.config.ts` — `server.url` is **removed** so the APK loads bundled `dist/` assets.
- `@capacitor/camera`, `@capacitor/app`, `@capacitor/share`, `@capacitor/network`,
  `@capacitor/splash-screen` are installed.
- Native permission popup is triggered on first launch (`useCamera.ts` →
  `requestNativeCameraPermission`).
- Splash screen, exit dialog, share, rate-us and offline banner are wired.

## 🔨 One-time setup (on your local machine)

You need a computer with **Node.js 18+**, **Java JDK 17+**, and **Android Studio**
installed (Android Studio gives you the SDK + emulator + APK signer).

```bash
# 1. Clone the project from your GitHub (use the "Export to GitHub" button in Lovable)
git clone <your-repo-url>
cd <your-repo>

# 2. Install dependencies
npm install

# 3. Add the Android platform (only the very first time)
npx cap add android
```

## 🚀 Every time you want a new APK

```bash
# 1. Pull latest changes from Lovable
git pull

# 2. Build the web bundle into dist/
npm run build

# 3. Copy the bundle into the native Android project
npx cap sync android

# 4a. Open Android Studio to build a signed APK / AAB
npx cap open android
#     → in Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)

# 4b. OR run directly on a connected device / emulator
npx cap run android
```

The output APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`
(or `release/app-release.aab` for Play Store).

## 🎯 Why the camera now works in the APK

| Problem before | Fix applied |
|---|---|
| App pointed at remote URL → WebView clone → Play Store reject | `server.url` removed from `capacitor.config.ts` |
| Browser permission popup blocked inside WebView | Native `@capacitor/camera` `requestPermissions()` runs first on launch |
| `getUserMedia` failed silently | Fallback to video-only + "Tap to start" gesture overlay |
| Black screen with no error | `needsGesture` state + retry button in UI |

## 📱 Required permissions (auto-added by `@capacitor/camera`)

After `npx cap sync android`, your `android/app/src/main/AndroidManifest.xml`
should contain:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
```

If any of these are missing, add them manually before building.

## 🧪 Testing checklist

- [ ] Splash screen shows for ~2 seconds
- [ ] Native Android permission popup appears on first launch
- [ ] Camera preview shows immediately after Allow
- [ ] Flip / Flash / Filters / Capture all work
- [ ] Photo appears in Gallery
- [ ] Share button opens native Android share sheet
- [ ] Back button shows "Exit app?" dialog
- [ ] App works with airplane mode ON (proves it's offline)

## ⚠️ DO NOT use online "Website-to-APK" converters

Tools like *WebsiteToApp*, *WebIntoApp*, *Appsgeyser*, *Median.co* wrap your
URL in a stripped-down Android WebView that **blocks camera/mic access** and
**will be rejected from the Play Store**. Always build the APK with the
`npx cap` flow above.
