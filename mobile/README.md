# NHAI FieldAuth Mobile

Bare React Native TypeScript mobile app for the NHAI FieldAuth hackathon demo.
Android is the primary target.

## Core Screens

- Dashboard: online/offline state, pending events, latest verification.
- Enroll: worker profile capture and face enrollment.
- Verify: camera verification, liveness result, similarity, verified success.
- Queue: pending/synced events, sync, purge.
- Sync: backend connectivity and sync status.
- Settings: backend URL, USB/emulator presets, model readiness.

## ML Pipeline

The app is structured around this demo pipeline:

```text
Camera capture
  -> SCRFD face detection
  -> MiniFAS spoof signal
  -> MediaPipe face landmarks/liveness
  -> MobileFaceNet-style ONNX embedding
  -> cosine similarity match
  -> local attendance event
```

The bundled model assets live in:

```text
mobile/android/app/src/main/assets/models/
```

## Local Setup

Install dependencies from the repository root:

```bash
npm install --prefix mobile
```

Create `mobile/android/local.properties` if Android SDK is not detected:

```properties
sdk.dir=/Users/YOUR_NAME/Library/Android/sdk
```

## Run Android Debug App

Start Metro:

```bash
npm --prefix mobile run start
```

Run Android:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) npm --prefix mobile run android
```

For USB backend sync:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000
```

Then select:

```text
Settings -> USB backend
```

## Build Release APK

```bash
cd mobile/android
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew assembleRelease
```

Output:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Checks

```bash
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile test -- --watchman=false
```
