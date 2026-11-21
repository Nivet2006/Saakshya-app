#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$HOME/.local/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "=================================================="
echo " Sakshya ASHA Mobile - Android APK Builder        "
echo "=================================================="
echo "Project root: $PROJECT_ROOT"
echo "Android SDK:  $ANDROID_HOME"

cd "$PROJECT_ROOT"

# Ensure local.properties exists
if [ ! -f "android/local.properties" ]; then
  mkdir -p android
  echo "sdk.dir=$ANDROID_HOME" > android/local.properties
fi

# Ensure licenses directory has accepted license
mkdir -p "$ANDROID_HOME/licenses"
if [ ! -f "$ANDROID_HOME/licenses/android-sdk-license" ]; then
  printf "\n24333f8a63b6825ea9c5514f83c2829b004d1fee\nd56f5187479451eabf01fb78af6dfcb131a6481e\n24333f8a63b6825ea9c5514f83c2829b004d1fee" > "$ANDROID_HOME/licenses/android-sdk-license"
fi

echo "Building Android Release APK (Hermes + JS bundle embedded)..."
cd "$PROJECT_ROOT/android"
chmod +x gradlew

# Run gradle assembleRelease
./gradlew assembleRelease --no-daemon

APK_PATH="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
  # Check if assembleDebug was built instead or check outputs
  APK_PATH=$(find "$PROJECT_ROOT/android/app/build/outputs/apk" -name "*.apk" | head -n 1)
fi

if [ -f "$APK_PATH" ]; then
  echo ""
  echo "=================================================="
  echo "✅ BUILD SUCCESSFUL"
  echo "APK Location: $APK_PATH"
  ls -lh "$APK_PATH"
  echo "=================================================="
else
  echo "❌ Error: APK not found in build outputs."
  exit 1
fi
