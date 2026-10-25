#!/usr/bin/env bash
set -Eeuo pipefail

# Run from apps/mobile on a macOS EAS worker. Signing happens on the
# owner's computer after download; no Apple credentials enter this build.
mkdir -p build
if ! xcodebuild \
  -workspace ios/BBPlayerPreview.xcworkspace \
  -scheme BBPlayerPreview \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/unsigned \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  DEVELOPMENT_TEAM= \
  build > build/unsigned-xcode.log 2>&1; then
  tail -n 100 build/unsigned-xcode.log
  exit 1
fi

app_path='build/unsigned/Build/Products/Release-iphoneos/BBPlayerPreview.app'
test -d "$app_path"
mkdir -p build/unsigned-ipa/Payload
ditto "$app_path" build/unsigned-ipa/Payload/BBPlayerPreview.app
(
  cd build/unsigned-ipa
  ditto -c -k --keepParent Payload ../BiliMusic-unsigned.ipa
)
unzip -t build/BiliMusic-unsigned.ipa
