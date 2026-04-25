# Release Signing — Play Store / Uptodown Ready

This project ships with a complete signing pipeline: one script generates
your keystore, one patches `android/app/build.gradle`, and one builds a
**signed release APK + AAB** ready to upload.

## 🚦 Three-step setup (run on your local machine, ONCE)

```bash
# 0. Make sure the Android project exists
npx cap add android        # skip if you already ran it

# 1. Patch Gradle to read keystore.properties for release signing
bash scripts/install-signing-config.sh

# 2. Generate your release keystore (interactive — sets passwords + DN)
bash scripts/generate-keystore.sh
```

That creates:
- `android/app/yourperfectshot-release.jks` — your signing key (10000-day validity)
- `android/keystore.properties` — passwords (auto-gitignored)

> 🔒 **BACK BOTH FILES UP IMMEDIATELY** to a password manager / encrypted
> drive. Losing the keystore means you can never publish updates for this
> app on the Play Store.

## 📦 Build a signed release every time you want to ship

```bash
bash scripts/build-release.sh
```

Outputs:
- `android/app/build/outputs/apk/release/app-release.apk` → side-load / Uptodown
- `android/app/build/outputs/bundle/release/app-release.aab` → **upload to Play Store**

## ✅ Verify the signature

```bash
# APK signature
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose \
  android/app/build/outputs/apk/release/app-release.apk

# AAB / SHA-1 fingerprint (needed for Google Sign-In, Maps, etc.)
keytool -list -v -keystore android/app/yourperfectshot-release.jks \
  -alias yourperfectshot
```

## 🆙 Pushing an update

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`
   (Play Store rejects same `versionCode`).
2. `bash scripts/build-release.sh`
3. Upload the new `.aab` in Play Console → Production → Create release.

## 🔁 CI / GitHub Actions (optional)

Don't commit the keystore. Instead:

1. Base64-encode locally: `base64 -w0 android/app/yourperfectshot-release.jks > ks.b64`
2. Add GitHub Secrets:
   - `ANDROID_KEYSTORE_BASE64` (the contents of `ks.b64`)
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. In your workflow:
   ```yaml
   - run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/yourperfectshot-release.jks
   - run: |
       cat > android/keystore.properties <<EOF
       storeFile=yourperfectshot-release.jks
       storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
       keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
       keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
       EOF
   - run: bash scripts/install-signing-config.sh
   - run: bash scripts/build-release.sh
   ```

## 🧯 Troubleshooting

| Error | Fix |
|---|---|
| `Keystore was tampered with, or password was incorrect` | Wrong password in `keystore.properties` — re-enter or regenerate |
| `Failed to read key from keystore` | `keyAlias` mismatch — must equal what you typed in `generate-keystore.sh` |
| `Execution failed for task ':app:validateSigningRelease'` | `keystore.properties` missing or `storeFile` path wrong |
| Play Console: "You uploaded an APK that is not signed with the upload certificate" | You're using a different keystore than your first upload — restore the original `.jks` from backup |
