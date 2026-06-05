# Model Assets

The Android demo includes model files under:

```text
mobile/android/app/src/main/assets/models/
```

These files are bundled into the release APK so the app can run without a
separate model download.

## MediaPipe Liveness Model

Use Google's official MediaPipe Face Landmarker bundle:

```bash
curl -L \
  -o mobile/android/app/src/main/assets/models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
```

Why this file:

- The official MediaPipe Face Landmarker task outputs 3D landmarks,
  blendshape scores, and facial transformation matrices.
- Those outputs are exactly what the app needs for blink, smile, and head-turn
  liveness.

References:

- Google Face Landmarker docs: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
- Official model URL: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task

## Face Recognition Model

Do not download a random `mobilefacenet.onnx` from an unknown GitHub repo and
claim it is open-source.

Safer options:

1. Use an InsightFace/MobileFaceNet ONNX model pack only if the hackathon accepts
   its pretrained-model license. The InsightFace Python package states that the
   code is MIT, but its provided pretrained models are for non-commercial
   research use. That means the weights are not the same as unrestricted MIT
   code.
2. Use ONNX Model Zoo ArcFace for a licensed baseline, but it is likely too large
   for the 20 MB target.
3. Best hackathon-safe path: keep the ONNX adapter, document the target model as
   `MobileFaceNet ArcFace quantized`, and only add a specific model file after
   verifying its weight license.

The current demo includes the downloaded face embedding model renamed to the
asset name expected by the adapter:

```text
mobile/android/app/src/main/assets/models/mobilefacenet_arcface_quant.onnx
```

`FaceEmbeddingAdapter` loads that asset through `onnxruntime-react-native`.
Camera photo capture, MediaPipe face crop, 112x112 tensor preprocessing, and
ONNX inference are wired in the Android app. Before claiming 95%+ accuracy, run
a real same/different identity evaluation manifest and calibrate the cosine
similarity threshold.
