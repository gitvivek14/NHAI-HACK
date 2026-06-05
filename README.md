# NHAI FieldAuth

Android-first hackathon prototype for offline field attendance using on-device
face verification, liveness checks, local queueing, and backend sync.

The project is built for a demoable government field-use case: a worker can be
enrolled on a phone, verified without network access, stored in a local
attendance queue, and synced to a supervisor dashboard when connectivity returns.

## What This Repository Contains

- `mobile/`: Bare React Native TypeScript Android app.
- `backend/`: Node.js/Express sync API.
- `admin/`: React/Vite supervisor dashboard.
- `docs/`: Architecture, setup, demo script, model notes, and benchmark plan.
- `scripts/`: Offline evaluation helper script.

## Implemented Demo Features

- Android camera capture with `react-native-vision-camera`.
- Face detection pipeline using SCRFD and MediaPipe face landmarks.
- On-device ONNX face embedding inference with MobileFaceNet-style model asset.
- Liveness flow using MediaPipe-supported face signals and challenge checks.
- Offline worker enrollment and verification.
- Local attendance queue with pending/synced status.
- Backend sync API.
- Admin dashboard showing synced workers, devices, and attendance events.
- USB backend preset for local demo using `adb reverse`.
- Verified success screen with green confirmation state after a match.

## Important Accuracy Note

Do not claim production-grade accuracy or 95%+ accuracy from this repository
unless you run a real benchmark dataset and include the measured result.

Recommended demo wording:

```text
Target accuracy: above 95%.
Current measured result: pending pilot benchmark.
The repository includes the evaluation harness and model integration path.
```

## Prerequisites

Install these on the target computer:

- Node.js 22 or newer.
- npm.
- Java 17.
- Android Studio.
- Android SDK Platform Tools.
- Android SDK Build Tools.
- Android device with USB debugging enabled, or Android emulator.

Recommended Java 17 check:

```bash
/usr/libexec/java_home -V
```

For Android builds, use Java 17:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

## Fresh Setup From Zip Or Clone

From the repository root:

```bash
npm install --prefix backend
npm install --prefix admin
npm install --prefix mobile
```

If Android SDK location is not detected automatically, create:

```text
mobile/android/local.properties
```

Example:

```properties
sdk.dir=/Users/YOUR_NAME/Library/Android/sdk
```

Do not commit `local.properties`.

## Run The Demo Locally

Start backend:

```bash
npm run backend:start
```

Start admin dashboard:

```bash
npm run admin:dev
```

Open:

```text
http://localhost:5173
```

Start Metro:

```bash
npm run mobile:start
```

Run Android debug app:

```bash
npm run mobile:android
```

For a physical phone connected by USB:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000
```

Then in the app:

```text
Settings -> USB backend
```

For an Android emulator, use:

```text
Settings -> Emulator
```

## Build Release APK

```bash
cd mobile/android
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew assembleRelease
```

Release APK output:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Demo Flow

1. Open the admin dashboard and show an empty attendance table.
2. Open the mobile app.
3. Enroll a worker with personnel ID and name.
4. Switch app status to offline.
5. Verify the worker using the camera.
6. Show the green verified confirmation.
7. Show the event in the local queue as pending.
8. Switch app status online.
9. Tap sync.
10. Refresh or wait for the admin dashboard to show the synced event.
11. Purge synced local events while keeping enrollment data.

## Verification Commands

```bash
npm run mobile:typecheck
npm run mobile:test -- --watchman=false
npm run backend:test
npm run admin:build
```

## Documentation

- [Setup Guide](docs/SETUP.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Model Assets](docs/MODEL_ASSETS.md)
- [Benchmark Plan](docs/BENCHMARK_PLAN.md)
- [Implementation Notes](docs/IMPLEMENTATION_NOTES.md)
- [Hackathon Pitch](docs/HACKATHON_PITCH.md)

## Current Limitations

- Android is the primary demo target.
- Backend is a local MVP service, not production AWS infrastructure.
- Biometric storage is suitable for a hackathon prototype, not certified
  production biometric storage.
- Anti-spoofing is challenge/heuristic based; it is not a dedicated production
  spoof classifier.
- Accuracy must be measured with the benchmark plan before making performance
  claims.
