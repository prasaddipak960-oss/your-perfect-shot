#!/usr/bin/env bash
# Patches android/app/build.gradle to read signing credentials from
# android/keystore.properties and apply them to the release buildType.
# Idempotent — safe to run multiple times.
#
# Run AFTER `npx cap add android` and BEFORE `scripts/build-release.sh`.

set -e

GRADLE_FILE="android/app/build.gradle"
GITIGNORE="android/.gitignore"

if [ ! -f "$GRADLE_FILE" ]; then
  echo "❌ $GRADLE_FILE not found. Run 'npx cap add android' first."
  exit 1
fi

if grep -q "keystore.properties" "$GRADLE_FILE"; then
  echo "✅ Signing config already installed in $GRADLE_FILE"
else
  echo "🔧 Patching $GRADLE_FILE with signing config…"

  # Inject signing config + release wiring just before the closing brace of `android { … }`.
  # We use a Python helper for a robust, brace-aware insertion.
  python3 - "$GRADLE_FILE" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()

signing_block = r"""
    // === Release signing (added by scripts/install-signing-config.sh) ===
    def keystorePropertiesFile = rootProject.file("keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            if (keystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    // === end signing config ===
"""

# Find the `android {` block and insert before its matching closing brace.
m = re.search(r'\bandroid\s*\{', src)
if not m:
    sys.exit("Could not find `android {` block in build.gradle")

depth = 1
i = m.end()
while i < len(src) and depth > 0:
    if src[i] == '{': depth += 1
    elif src[i] == '}': depth -= 1
    i += 1
close_idx = i - 1

# Remove any pre-existing buildTypes { release { ... } } that lacks signing,
# Capacitor's default is fine to keep — we just append; Gradle merges DSL blocks
# but to avoid duplicate buildTypes we only inject if missing.
patched = src[:close_idx] + signing_block + src[close_idx:]
p.write_text(patched)
print(f"   Inserted signing block ({len(signing_block)} chars).")
PY
fi

# Ensure secrets and build artifacts stay out of git
touch "$GITIGNORE"
for line in "keystore.properties" "*.jks" "*.keystore" "app/release/" "app/build/"; do
  grep -qxF "$line" "$GITIGNORE" || echo "$line" >> "$GITIGNORE"
done

echo "✅ Done. Next: bash scripts/generate-keystore.sh"
