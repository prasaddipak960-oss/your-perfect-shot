#!/usr/bin/env bash
# Builds a signed release APK + AAB ready for Play Store / Uptodown upload.
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

echo "📦 1/3  Building web bundle (vite)…"
npm run build

echo "🔄 2/3  Syncing assets into Android project…"
npx cap sync android

echo "🔨 3/3  Assembling signed release APK + AAB…"
cd android
./gradlew clean
./gradlew assembleRelease     # produces app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease       # produces app/build/outputs/bundle/release/app-release.aab
cd ..

APK="android/app/build/outputs/apk/release/app-release.apk"
AAB="android/app/build/outputs/bundle/release/app-release.aab"

echo ""
echo "✅ DONE"
[ -f "$APK" ] && echo "   APK: $APK   ($(du -h "$APK" | cut -f1))"
[ -f "$AAB" ] && echo "   AAB: $AAB   ($(du -h "$AAB" | cut -f1)) ← upload THIS to Play Store"
echo ""
echo "Verify the APK is signed:"
echo "   apksigner verify --verbose $APK"
