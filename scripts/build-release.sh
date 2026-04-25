#!/usr/bin/env bash
# Builds a signed release APK + AAB ready for Play Store / Uptodown upload,
# then verifies the signature and prints SHA-1 / SHA-256 / MD5 fingerprints.
#
# Prerequisites (one-time):
#   1. npx cap add android
#   2. bash scripts/install-signing-config.sh   (copies signing block into Gradle)
#   3. bash scripts/generate-keystore.sh        (creates the .jks)
#
# Usage:
#   bash scripts/build-release.sh

set -e

if [ ! -d "android" ]; then
  echo "❌ android/ folder missing. Run 'npx cap add android' first."
  exit 1
fi
if [ ! -f "android/keystore.properties" ]; then
  echo "❌ android/keystore.properties missing. Run scripts/generate-keystore.sh first."
  exit 1
fi

echo "📦 1/4  Building web bundle (vite)…"
npm run build

echo "🔄 2/4  Syncing assets into Android project…"
npx cap sync android

echo "🔨 3/4  Assembling signed release APK + AAB…"
cd android
./gradlew clean
./gradlew assembleRelease     # → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease       # → app/build/outputs/bundle/release/app-release.aab
cd ..

APK="android/app/build/outputs/apk/release/app-release.apk"
AAB="android/app/build/outputs/bundle/release/app-release.aab"

# ────────────────────────────────────────────────────────────────────────────
# 4/4  VERIFY SIGNATURE + PRINT FINGERPRINTS
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔍 4/4  Verifying signatures and fingerprints…"
echo "════════════════════════════════════════════════════════════"

# Locate apksigner (lives in Android SDK build-tools/<version>/)
APKSIGNER=""
if command -v apksigner >/dev/null 2>&1; then
  APKSIGNER="apksigner"
elif [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME/build-tools" ]; then
  # pick the highest installed build-tools version
  LATEST_BT=$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)
  if [ -x "$ANDROID_HOME/build-tools/$LATEST_BT/apksigner" ]; then
    APKSIGNER="$ANDROID_HOME/build-tools/$LATEST_BT/apksigner"
  fi
elif [ -n "$ANDROID_SDK_ROOT" ] && [ -d "$ANDROID_SDK_ROOT/build-tools" ]; then
  LATEST_BT=$(ls "$ANDROID_SDK_ROOT/build-tools" | sort -V | tail -1)
  if [ -x "$ANDROID_SDK_ROOT/build-tools/$LATEST_BT/apksigner" ]; then
    APKSIGNER="$ANDROID_SDK_ROOT/build-tools/$LATEST_BT/apksigner"
  fi
fi

# ---- APK verification ------------------------------------------------------
if [ -f "$APK" ]; then
  echo ""
  echo "📱 APK: $APK ($(du -h "$APK" | cut -f1))"
  echo "------------------------------------------------------------"
  if [ -n "$APKSIGNER" ]; then
    echo "▶ apksigner verify --verbose --print-certs"
    "$APKSIGNER" verify --verbose --print-certs "$APK" || {
      echo "❌ APK signature verification FAILED"; exit 1;
    }
  else
    echo "⚠️  apksigner not found in PATH or \$ANDROID_HOME/build-tools/."
    echo "    Install Android SDK Build-Tools or run manually:"
    echo "      \$ANDROID_HOME/build-tools/<ver>/apksigner verify --verbose --print-certs $APK"
  fi
else
  echo "⚠️  APK not found at $APK"
fi

# ---- AAB verification (jarsigner — apksigner doesn't handle .aab) ---------
if [ -f "$AAB" ]; then
  echo ""
  echo "📦 AAB: $AAB ($(du -h "$AAB" | cut -f1))"
  echo "------------------------------------------------------------"
  if command -v jarsigner >/dev/null 2>&1; then
    echo "▶ jarsigner -verify -verbose -certs"
    jarsigner -verify -verbose -certs "$AAB" | tail -20 || {
      echo "❌ AAB signature verification FAILED"; exit 1;
    }
  else
    echo "⚠️  jarsigner not found (ships with the JDK). Install JDK 17+."
  fi
fi

# ---- Keystore fingerprints (SHA-1 / SHA-256 / MD5) -------------------------
KEYSTORE="android/app/yourperfectshot-release.jks"
PROPS="android/keystore.properties"
if [ -f "$KEYSTORE" ] && [ -f "$PROPS" ]; then
  echo ""
  echo "🔑 Signing certificate fingerprints"
  echo "------------------------------------------------------------"
  # shellcheck disable=SC1090
  STORE_PASS=$(grep '^storePassword=' "$PROPS" | cut -d'=' -f2-)
  KEY_ALIAS=$(grep '^keyAlias=' "$PROPS" | cut -d'=' -f2-)
  if command -v keytool >/dev/null 2>&1; then
    keytool -list -v \
      -keystore "$KEYSTORE" \
      -alias "$KEY_ALIAS" \
      -storepass "$STORE_PASS" 2>/dev/null \
      | grep -E "(Owner|Issuer|Valid|SHA1:|SHA-1:|SHA256:|SHA-256:|MD5:)" \
      || echo "⚠️  keytool returned no fingerprint output (check alias/password)"
  else
    echo "⚠️  keytool not found (ships with the JDK)."
  fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ DONE"
[ -f "$APK" ] && echo "   APK: $APK"
[ -f "$AAB" ] && echo "   AAB: $AAB ← upload THIS to Play Store"
echo ""
echo "💡 Save the SHA-1 / SHA-256 fingerprints above — you'll need them for"
echo "   Google Sign-In, Firebase, Maps API, and Play Console app integrity."
