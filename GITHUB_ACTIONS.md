# GitHub Actions — Auto Build Signed APK + AAB

Har push tag pe (`v1.0.0`, `v1.1.0`, etc.) ya manual trigger pe GitHub
automatically signed APK + AAB build karke GitHub Releases mein download
link ke saath publish kar dega.

## 🔑 One-time setup

### 1. Local machine pe keystore generate karo (agar nahi banaya)

```bash
bash scripts/generate-keystore.sh
```

Ye `android/app/release.jks` aur `android/keystore.properties` banayega.

### 2. Keystore ko Base64 mein convert karo

```bash
base64 -w 0 android/app/release.jks > keystore.b64
cat keystore.b64
```

(macOS pe: `base64 -i android/app/release.jks | tr -d '\n' > keystore.b64`)

### 3. GitHub repo Secrets add karo

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|---|---|
| `KEYSTORE_BASE64` | `keystore.b64` ka pura content |
| `KEYSTORE_PASSWORD` | keystore banate waqt jo password diya tha |
| `KEY_ALIAS` | alias name (default: `upload`) |
| `KEY_PASSWORD` | key password (usually same as keystore password) |

⚠️ `keystore.b64` file delete kar dena local se after copy.

## 🚀 Build trigger karna

### Option A: Tag push (auto-publish to Releases)

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions chalega → APK + AAB build hoga → **Releases page** pe
download link aa jayega.

### Option B: Manual trigger

Repo → **Actions tab → Build Signed APK + AAB → Run workflow**

Build artifacts (APK + AAB) workflow run page pe download ke liye milenge.

## 📥 Download

- Tag push ke baad: `https://github.com/<user>/<repo>/releases/latest`
- Manual run ke baad: Actions tab → run → Artifacts section

## ⚠️ Important

- Keystore kabhi commit mat karo (`.gitignore` mein already hai).
- `KEYSTORE_BASE64` secret ko backup karke rakho — lose hua to Play Store
  pe app update push nahi kar paoge.
- Pehli baar workflow chalane se pehle local pe `bash scripts/install-signing-config.sh`
  ek baar chala lo, ya workflow khud chala lega (already included).
