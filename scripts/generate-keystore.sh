#!/usr/bin/env bash
# Generates a release keystore for signing your Play Store APK/AAB.
# Run ONCE on your local machine. KEEP THE GENERATED .jks FILE SAFE
# AND BACK IT UP — if you lose it, you cannot push updates to your
# existing Play Store listing.
#
# Usage:
#   bash scripts/generate-keystore.sh
#
# It will create:
#   android/app/yourperfectshot-release.jks
#   android/keystore.properties        (gitignored — holds passwords)

set -e

KEYSTORE_DIR="android/app"
KEYSTORE_FILE="$KEYSTORE_DIR/yourperfectshot-release.jks"
PROPS_FILE="android/keystore.properties"

if [ ! -d "android" ]; then
  echo "❌ android/ folder not found. Run 'npx cap add android' first."
  exit 1
fi

if [ -f "$KEYSTORE_FILE" ]; then
  echo "⚠️  Keystore already exists at $KEYSTORE_FILE"
  echo "    Delete it manually if you really want to regenerate (this will"
  echo "    break Play Store updates for the existing app)."
  exit 1
fi

mkdir -p "$KEYSTORE_DIR"

echo "🔐 Generating release keystore for Your Perfect Shot"
echo ""
read -r -p "Key alias [yourperfectshot]: " KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-yourperfectshot}

read -r -s -p "Keystore password (min 6 chars): " STORE_PASS
echo ""
read -r -s -p "Confirm keystore password: " STORE_PASS2
echo ""
if [ "$STORE_PASS" != "$STORE_PASS2" ]; then
  echo "❌ Passwords don't match"; exit 1
fi
if [ ${#STORE_PASS} -lt 6 ]; then
  echo "❌ Password must be at least 6 characters"; exit 1
fi

read -r -s -p "Key password (press Enter to reuse keystore password): " KEY_PASS
echo ""
KEY_PASS=${KEY_PASS:-$STORE_PASS}

read -r -p "Your name (CN) [Your Perfect Shot]: " CN
CN=${CN:-"Your Perfect Shot"}
read -r -p "Organization (O) [Your Perfect Shot]: " O
O=${O:-"Your Perfect Shot"}
read -r -p "City (L) [Mumbai]: " L
L=${L:-Mumbai}
read -r -p "State (ST) [MH]: " ST
ST=${ST:-MH}
read -r -p "Country code (C) [IN]: " C
C=${C:-IN}

DNAME="CN=$CN, O=$O, L=$L, ST=$ST, C=$C"

keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "$DNAME"

cat > "$PROPS_FILE" <<EOF
# DO NOT COMMIT THIS FILE — it contains your signing passwords.
# Already gitignored via android/.gitignore
storeFile=yourperfectshot-release.jks
storePassword=$STORE_PASS
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASS
EOF

chmod 600 "$PROPS_FILE" "$KEYSTORE_FILE"

echo ""
echo "✅ Keystore created: $KEYSTORE_FILE"
echo "✅ Credentials written to: $PROPS_FILE"
echo ""
echo "📦 BACK UP THESE TWO FILES NOW (e.g. password manager + encrypted cloud)."
echo "   Losing the keystore means you can NEVER push updates to the Play Store"
echo "   listing for this app."
echo ""
echo "Next: run 'bash scripts/build-release.sh' to produce a signed APK + AAB."
