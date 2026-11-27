# Proposed Android Security & Release-Signing Changes

> **Notice:** `lingo/android/` was intentionally left untouched during automated hardening (per safety constraints requiring human review before modifying native Android project files or running `cap sync` / `build:apk`). Apply the changes below before publishing a release APK or Google Play App Bundle (`.aab`).

---

## 1. Release Keystore & Gradle Signing (`SEC-08`)

### A. Generate a release keystore (store OUTSIDE the Git repository)

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE\.android\lingo-upload.jks" `
  -keyalg RSA -keysize 2048 -validity 10000 -alias lingo-upload
```

> Both `.gitignore` and `lingo/.gitignore` now ignore `*.jks`, `*.keystore`, `keystore.properties`, `*.p12`, and `*.pem`. Never commit your keystore or passwords.

### B. Update `lingo/android/app/build.gradle`

Inside `android { ... }`, add a `signingConfigs.release` block backed by environment variables and enable minification/resource shrinking for `release`:

```groovy
    signingConfigs {
        release {
            def ksPath = System.getenv("LINGO_KEYSTORE_PATH")
            if (ksPath) {
                storeFile file(ksPath)
                storePassword System.getenv("LINGO_KEYSTORE_PASSWORD")
                keyAlias System.getenv("LINGO_KEY_ALIAS")
                keyPassword System.getenv("LINGO_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            if (System.getenv("LINGO_KEYSTORE_PATH")) {
                signingConfig signingConfigs.release
            }
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
```

Ensure `lingo/scripts/build-apk.mjs` verifies that `LINGO_KEYSTORE_PATH` is set when producing distribution APKs (`assembleRelease` instead of debug-signed artifacts), and outputs `apk-manifest.json` with the signed APK's `sha256` checksum (now surfaced cleanly on the website download tooltip and `/api/app/version`).

---

## 2. Manifest & Transport Hardening (`SEC-08`)

In `lingo/android/app/src/main/AndroidManifest.xml`:

- Set `android:allowBackup="false"` (prevents local `adb backup` extraction of WebView storage / Preferences).
- Set `android:usesCleartextTraffic="false"` (disables plaintext HTTP traffic in production builds; move cleartext allowance strictly into `lingo/android/app/src/debug/AndroidManifest.xml` for live-reload dev builds).

```xml
    <application
        android:allowBackup="false"
        android:usesCleartextTraffic="false"
        ... >
```

---

## 3. Native Hardware Back Button Support (`BUG-05`)

Currently `lingo/package.json` does not include `@capacitor/app`, so pressing Android's hardware back button during a lesson/modal/subpage exits the app immediately rather than navigating back.

Proposed follow-up when updating native dependencies:

1. Install `@capacitor/app@^7` inside `lingo/`.
2. Register `App.addListener('backButton', ...)` on native platforms to close open modals, exit active lesson/game overlays cleanly, return subpages (`profile`, `reminders`, `friends`, `practice`, `learn`) to `home`, and only `App.minimizeApp()` when already on the root home screen.
3. Run `npm --prefix lingo run build:mobile`.
