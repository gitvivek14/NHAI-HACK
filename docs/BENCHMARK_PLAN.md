# Benchmark Plan

## Goals

Measure whether NHAI FieldAuth can meet the hackathon targets:

- Model footprint around 20 MB or lower.
- Verification under one second.
- Accuracy target above 95%, only if measured on the pilot dataset.
- Robustness across lighting and basic spoof attempts.

## Pilot Dataset

Use 10-30 volunteers.

For each volunteer:

- 3 enrollment captures.
- 5 verification captures.
- Indoor normal light.
- Outdoor harsh sunlight.
- Low-light/shadow case.

Record:

- Personnel ID.
- Capture condition.
- Verification latency.
- Similarity score.
- Pass/fail result.

## Accuracy Tests

Run:

- Genuine match pairs.
- Impostor pairs.
- Threshold sweep from 0.70 to 0.95.
- False accept rate.
- False reject rate.
- Best threshold report.

Claim only the measured result. If no evaluation has been run, say the target is
pending validation.

## Liveness Tests

Run:

- Real blink.
- Real smile.
- Real turn left/right.
- Printed photo attack.
- Phone-screen replay attack.
- Wrong challenge response.

Report:

- Pass rate for real users.
- Rejection rate for spoof attempts.

## Performance Tests

Measure on a mid-range Android phone:

- Camera-to-result latency.
- Embedding inference latency.
- Liveness latency.
- Memory behavior over 20 repeated attempts.
- App package/model footprint.

## Sync Tests

Run:

- Offline verification creates pending event.
- App restart preserves pending event.
- Online sync returns server event ID.
- Admin dashboard displays event.
- Purge removes synced event locally.
- Multiple devices sync to the same backend.

## Benchmark Script

Run:

```bash
npm run benchmark
```

For the final report, pass a manifest:

```bash
node scripts/evaluate-faceauth.mjs ./benchmarks/pilot-manifest.json
```

Manifest shape:

```json
{
  "pairs": [
    {"left": "NHAI-001", "right": "NHAI-001", "same": true},
    {"left": "NHAI-001", "right": "NHAI-002", "same": false}
  ]
}
```
