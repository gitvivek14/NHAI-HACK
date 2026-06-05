# Hackathon Pitch

## One-Liner

NHAI FieldAuth verifies field staff attendance on a phone even without network
connectivity, then syncs verified attendance to a supervisor dashboard when the
device comes online.

## Problem

Field teams often work in low-connectivity locations. Online-only attendance
systems fail when the network is unavailable, while manual attendance is slow,
hard to audit, and vulnerable to proxy reporting.

## Solution

NHAI FieldAuth provides:

- One-time worker enrollment on the phone.
- Offline face verification.
- Liveness checks using face signals and challenge flow.
- Local attendance queue.
- Sync to backend after connectivity returns.
- Supervisor dashboard for synced attendance visibility.

## Why This Is Demoable

The project has a complete vertical slice:

- Mobile app.
- Camera capture.
- On-device ML integration boundary.
- Offline local storage.
- Backend sync API.
- Admin dashboard.
- Release APK build.

## Main Demo Moment

The strongest recorded moment is:

```text
Offline verification succeeds on the phone -> local queue shows pending event
-> app goes online -> sync sends the event -> admin dashboard updates.
```

## Why It Scores

Innovation:

- Offline-first biometric attendance.
- Edge ML pipeline instead of online-only verification.
- Sync/purge pattern suitable for field devices.

Feasibility:

- Android-first implementation.
- Local backend and admin dashboard.
- Clear integration API.

Impact:

- Better field attendance reliability.
- Lower dependency on real-time network access.
- Supervisor-level audit visibility.

## Claim Discipline

Say:

```text
The target is above 95% accuracy, and the repository includes a benchmark path.
Actual accuracy must be reported after pilot dataset evaluation.
```

Do not say:

```text
The system already achieves 95%+ accuracy.
```
