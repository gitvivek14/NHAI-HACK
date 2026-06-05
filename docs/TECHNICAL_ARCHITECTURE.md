# Technical Architecture

NHAI FieldAuth is split into three runnable apps:

- Mobile Android app for enrollment, verification, local queueing, and sync.
- Backend API for event ingestion and admin data.
- Admin dashboard for supervisor visibility.

## Mobile App

The mobile app is a bare React Native TypeScript app.

Screens:

- Dashboard
- Enroll
- Verify
- Queue
- Sync
- Settings

`FieldAuthContext` owns app state and coordinates local storage, authentication,
verification, sync, and settings.

## Face Verification Pipeline

The demo pipeline is:

```text
VisionCamera capture
  -> SCRFD face detection
  -> MiniFAS spoof signal
  -> MediaPipe face landmarks/liveness
  -> 112x112 face tensor
  -> ONNX Runtime embedding inference
  -> cosine similarity match
  -> attendance event
```

Primary files:

- `mobile/src/services/FaceAuthService.ts`
- `mobile/src/services/FaceEmbeddingAdapter.ts`
- `mobile/src/services/ScrfdFaceDetectorAdapter.ts`
- `mobile/src/services/MiniFasAntiSpoofAdapter.ts`
- `mobile/src/services/LivenessEngine.ts`
- `mobile/android/app/src/main/java/com/nhai/offlinefieldauth/fieldauth/MediaPipeFaceLandmarkerModule.kt`

## Model Assets

Bundled Android model assets:

```text
mobile/android/app/src/main/assets/models/face_landmarker.task
mobile/android/app/src/main/assets/models/scrfd_2.5g_bnkps.onnx
mobile/android/app/src/main/assets/models/mobilefacenet_arcface_quant.onnx
mobile/android/app/src/main/assets/models/minifasnet_v2.onnx
```

These assets make the demo self-contained for Android. The model license and
benchmark results must be reviewed before production use.

## Liveness

The liveness layer combines:

- Face presence and face-size checks.
- MediaPipe landmark signals.
- Blink, smile, and head-turn challenge logic.
- MiniFAS spoof score as an advisory signal.

For the hackathon demo, liveness is used as a practical gate. For production,
the anti-spoofing model and thresholds must be validated against photo, screen,
and replay attacks.

## Local Storage

`LocalStore` persists:

- Worker profiles.
- Face embeddings.
- Attendance events.
- Device metadata.
- App settings.

Attendance events remain `pending` while offline. After sync, server-acknowledged
events are marked `synced` and can be purged from the phone.

## Backend API

Backend service:

```text
backend/src/server.js
```

Core endpoints:

- `GET /api/health`
- `POST /api/sync/events`
- `GET /api/admin/summary`
- `GET /api/admin/events`
- `GET /api/admin/workers`
- `GET /api/admin/devices`
- `POST /api/admin/reset`

Benchmark endpoints remain available for future evaluation uploads:

- `POST /api/benchmarks`
- `GET /api/admin/benchmarks`

## Admin Dashboard

Admin service:

```text
admin/src/main.jsx
```

The dashboard polls the backend and displays:

- Total workers.
- Attendance events.
- Active devices.
- Failed liveness count.
- Attendance event table.
- Worker table.
- Device table.

## Sync Model

Each attendance event includes:

- Local device event ID.
- Device ID.
- Personnel ID.
- Verification timestamp.
- Similarity score.
- Liveness result.
- Challenge type.
- Latency.

The backend assigns server IDs and stores events for the dashboard.

## Production Gaps

The prototype is intentionally scoped for hackathon demo:

- No production AWS deployment.
- No enterprise identity/SSO.
- No certified biometric encryption workflow.
- No large validated accuracy dataset yet.
- Android-first; iOS path is scaffolded but not the demo target.
