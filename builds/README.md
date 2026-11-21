# Saakshya ASHA - Android APK Artifacts

This directory stores standalone Android APK binaries produced by `./scripts/build-apk.sh` (or `npm run build:apk`).

## Artifact Details

- **Application ID / Package**: `org.nhm.sakshya.asha`
- **Application Name**: Saakshya ASHA
- **Version**: 1.0.0 (Version Code: 1)
- **Target SDK**: Android 14 (API 34)
- **Min SDK**: Android 6.0 (API 23)
- **Engine**: Hermes JS Engine (bundled offline bytecode in `assets/index.android.bundle`)
- **Active Release APK**: `builds/sakshya-asha-release.apk` (63 MB)

## Installation Instructions

### 1. Install via ADB
Connect an Android device or emulator and run:
```bash
adb install -r builds/sakshya-asha-release.apk
```

### 2. Direct Device Installation
Transfer `sakshya-asha-release.apk` to an Android phone (via USB, Drive, or WhatsApp) and tap to install (enable "Install unknown apps" for the installer if prompted).

## Rebuilding the APK
To rebuild a fresh APK at any time:
```bash
npm run build:apk
```

