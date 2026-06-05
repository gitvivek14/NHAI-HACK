# Demo Script

Use this flow for a recorded hackathon demo.

## Before Recording

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

For phone demo over USB:

```bash
adb reverse tcp:4000 tcp:4000
```

In the app:

```text
Settings -> USB backend
```

## Suggested Demo Narration

NHAI FieldAuth is an offline field attendance prototype. A worker can enroll and
verify on a phone even without network access. Attendance is stored locally and
synced to a supervisor dashboard when connectivity returns.

## Recording Flow

1. Show the admin dashboard.
   - Point out workers, attendance events, devices, and failed liveness cards.
   - Show that attendance is empty before sync.

2. Show the mobile dashboard.
   - Point out online/offline mode and pending queue count.

3. Enroll a worker.
   - Enter personnel ID.
   - Enter worker name.
   - Capture face.
   - Show enrollment success.

4. Switch app offline.
   - This simulates a field zone without network.

5. Verify the worker.
   - Keep face visible in camera.
   - Let verification run.
   - Show green Verified confirmation.

6. Show local queue.
   - The event should be pending while offline.

7. Switch app online.
   - Tap Sync.

8. Show admin dashboard.
   - Synced attendance event appears.
   - Show worker, personnel ID, device ID, liveness, similarity, latency, and time.

9. Purge synced local records.
   - Explain that attendance events can be purged after server acknowledgement
     while enrollment stays available for future offline verification.

## What To Say About Accuracy

Say:

```text
The system has real on-device model integration and a benchmark harness.
The 95% target must be validated on a pilot dataset before claiming it.
```

Do not say:

```text
This already has 95%+ accuracy.
```

## What To Avoid In The Demo

- Do not present the app as production certified.
- Do not claim real AWS deployment.
- Do not claim national-scale biometric readiness.
- Do not claim benchmark accuracy without measured results.
