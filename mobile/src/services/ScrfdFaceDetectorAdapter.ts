import {copyBundledModelAsset} from '../native/ModelAssets';

export type ScrfdDetectionResult = {
  adapter: 'scrfd-onnx' | 'mediapipe-fallback' | 'unavailable';
  ready: boolean;
  facePresent: boolean;
  confidence: number;
  evidence: string;
};

type OnnxTensorLike = {
  data: ArrayLike<number>;
  dims?: readonly number[];
};

type OnnxSessionLike = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, OnnxTensorLike>>;
};

const MODEL_ASSET_PATH = 'models/scrfd_2.5g_bnkps.onnx';
const MODEL_FILE_NAME = 'scrfd_2.5g_bnkps.onnx';
const INPUT_SHAPE = [1, 3, 640, 640];
const INPUT_TENSOR_LENGTH = 1 * 3 * 640 * 640;
const FACE_THRESHOLD = 0.35;

export class ScrfdFaceDetectorAdapter {
  private session: OnnxSessionLike | null = null;
  private initFailedReason: string | null = null;

  async detect(params: {
    tensor?: number[] | Float32Array;
    mediaPipeFacePresent: boolean;
  }): Promise<ScrfdDetectionResult> {
    const session = await this.ensureSession();

    if (!session || !params.tensor?.length) {
      return {
        adapter: session ? 'scrfd-onnx' : 'mediapipe-fallback',
        ready: Boolean(session),
        facePresent: params.mediaPipeFacePresent,
        confidence: params.mediaPipeFacePresent ? 0.7 : 0,
        evidence: session
          ? 'SCRFD model is ready, but no SCRFD tensor was available.'
          : `SCRFD unavailable; using MediaPipe detector fallback. ${this.initFailedReason ?? ''}`.trim(),
      };
    }

    if (params.tensor.length !== INPUT_TENSOR_LENGTH) {
      return {
        adapter: 'scrfd-onnx',
        ready: true,
        facePresent: false,
        confidence: 0,
        evidence: `SCRFD tensor shape mismatch: expected ${INPUT_TENSOR_LENGTH}, got ${params.tensor.length}.`,
      };
    }

    try {
      const ort = await import('onnxruntime-react-native');
      const tensorData =
        params.tensor instanceof Float32Array
          ? params.tensor
          : Float32Array.from(params.tensor);
      const feeds = {
        [session.inputNames[0]]: new ort.Tensor('float32', tensorData, INPUT_SHAPE),
      };
      const outputs = await session.run(feeds);
      const confidence = bestScrfdConfidence(outputs);

      return {
        adapter: 'scrfd-onnx',
        ready: true,
        facePresent: confidence >= FACE_THRESHOLD,
        confidence,
        evidence: `SCRFD confidence ${confidence.toFixed(2)}.`,
      };
    } catch (error) {
      return {
        adapter: 'unavailable',
        ready: false,
        facePresent: params.mediaPipeFacePresent,
        confidence: params.mediaPipeFacePresent ? 0.7 : 0,
        evidence:
          error instanceof Error
            ? `SCRFD inference failed; using MediaPipe fallback. ${error.message}`
            : 'SCRFD inference failed; using MediaPipe fallback.',
      };
    }
  }

  async getStatus() {
    const session = await this.ensureSession();
    return {
      adapter: session ? 'scrfd-onnx' : 'unavailable',
      ready: Boolean(session),
      modelAsset: MODEL_ASSET_PATH,
      inputShape: INPUT_SHAPE,
      threshold: FACE_THRESHOLD,
      notes: session
        ? 'SCRFD ONNX detector is ready.'
        : this.initFailedReason ?? 'SCRFD ONNX detector is not initialized.',
    };
  }

  private async ensureSession() {
    if (this.session) {
      return this.session;
    }
    if (this.initFailedReason) {
      return null;
    }

    try {
      const copied = await copyBundledModelAsset(MODEL_ASSET_PATH, MODEL_FILE_NAME);
      if (!copied?.exists) {
        throw new Error('Bundled SCRFD model asset is not available.');
      }

      const ort = await import('onnxruntime-react-native');
      this.session = (await ort.InferenceSession.create(copied.path)) as unknown as OnnxSessionLike;
      return this.session;
    } catch (error) {
      this.initFailedReason =
        error instanceof Error ? error.message : 'SCRFD session initialization failed.';
      return null;
    }
  }
}

function bestScrfdConfidence(outputs: Record<string, OnnxTensorLike>) {
  const scoreOutputs = Object.values(outputs).filter(output => {
    const dims = output.dims ?? [];
    return dims.length >= 2 && output.data.length > 0 && inferScrfdStride(output.data.length) > 0;
  });

  let best = 0;
  for (const output of scoreOutputs) {
    for (let index = 0; index < output.data.length; index += 1) {
      const value = Number(output.data[index]);
      if (Number.isFinite(value) && value > best) {
        best = value;
      }
    }
  }

  return best;
}

function inferScrfdStride(scoreCount: number) {
  const anchorsPerLocation = 2;
  const locations = scoreCount / anchorsPerLocation;
  const side = Math.sqrt(locations);
  if (!Number.isFinite(side) || side <= 0) {
    return 0;
  }

  const stride = 640 / side;
  return [8, 16, 32].includes(Math.round(stride)) ? Math.round(stride) : 0;
}
