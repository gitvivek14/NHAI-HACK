# Model Assets

Place production model assets here before the final native demo:

- `mobilefacenet_arcface_quant.onnx` for ONNX Runtime face embeddings.
- `face_landmarker.task` for MediaPipe Face Landmarker.

Download the official MediaPipe landmarker:

```bash
curl -L \
  -o mobile/assets/models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
```

The app includes the package/runtime integration boundaries and a deterministic
fallback so the hackathon flow remains runnable while assets are being selected
and calibrated.
