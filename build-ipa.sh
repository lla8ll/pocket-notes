#!/usr/bin/env bash
# Build an IPA for Pocket Notes on a macOS machine with Xcode installed.
# Run from the project root. Requires: macOS, Xcode 15+, Node 22+, CocoaPods optional.
set -euo pipefail

APP_NAME="PocketNotes"
SCHEME="App"
WORKDIR="ios/App"
BUILD_DIR="build"
OUTPUT_DIR="output"

# --- 1. Rebuild web assets and sync into the native project ---
npm install
npm run build
npx cap sync ios

# --- 2. Archive ---
mkdir -p "$OUTPUT_DIR"
xcodebuild \
  -project "$WORKDIR/App.xcodeproj" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
  clean archive \
  DEVELOPMENT_TEAM="[TEAM_ID]" \
  CODE_SIGN_STYLE=Automatic

# --- 3. Export IPA ---
# For a SIGNED IPA, ExportOptions.plist below must reference your team + method.
xcodebuild \
  -exportArchive \
  -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
  -exportPath "$OUTPUT_DIR" \
  -exportOptionsPlist ExportOptions.plist

echo "Done. IPA should be at: $OUTPUT_DIR/$APP_NAME.ipa"
