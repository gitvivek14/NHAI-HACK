# Implementation Notes

## Current State

Real in this repository:

- Bare React Native mobile app.
- Android release build.
- Camera capture.
- SCRFD face detector adapter.
- MiniFAS anti-spoof adapter.
- MediaPipe Face Landmarker native Android module.
- ONNX Runtime React Native face embedding adapter.
- Offline enrollment and verification.
- Local attendance queue.
- Backend sync API.
- Admin dashboard.
- Evaluation script scaffold.

## Demo Scope

This is a hackathon prototype, not a certified production biometric system.

The demo should focus on:

- Enroll worker.
- Verify worker offline.
- Store pending attendance event.
- Sync event to backend.
- Show event in admin dashboard.
- Purge synced local events.

## Model Assets

Android model assets are bundled under:

```text
mobile/android/app/src/main/assets/models/
```

The demo APK therefore does not need a separate model download.

Before production use, confirm:

- Model weight licenses.
- Dataset evaluation.
- Threshold calibration.
- Anti-spoofing performance.
- Device performance on target phones.

## Java 17

React Native Android builds should use Java 17.

macOS:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Release build:

```bash
cd mobile/android
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew assembleRelease
```

## APK Size

The release APK is large because it bundles:

- ONNX Runtime native binaries.
- VisionCamera/native libraries.
- Multiple Android CPU ABIs.
- ML model assets.

Size can be reduced later by:

- Building only `arm64-v8a`.
- Producing ABI-specific APKs.
- Shipping an Android App Bundle.
- Removing unused ABIs.
- Quantizing or replacing model assets.
