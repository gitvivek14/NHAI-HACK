import {copyBundledModelAsset} from '../native/ModelAssets';

export type MiniFasResult = {
  adapter: 'minifasnet-onnx' | 'unavailable';
  ready: boolean;
  live: boolean;
  liveScore: number;
  printScore: number;
  replayScore: number;
  evidence: string;
};

type OnnxTensorLike = {
  data: ArrayLike<number>;
};

type OnnxSessionLike = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, OnnxTensorLike>>;
};

const MODEL_ASSET_PATH = 'models/minifasnet_v2.onnx';
const MODEL_FILE_NAME = 'minifasnet_v2.onnx';
const INPUT_SHAPE = [1, 3, 80, 80];
const INPUT_TENSOR_LENGTH = 1 * 3 * 80 * 80;
const LIVE_THRESHOLD = 0.45;

export class MiniFasAntiSpoofAdapter {
  private session: OnnxSessionLike | null = null;
  private initFailedReason: string | null = null;

  async evaluate(tensor?: number[] | Float32Array): Promise<MiniFasResult> {
    const session = await this.ensureSession();

    if (!session || !tensor?.length) {
      return {
        adapter: session ? 'minifasnet-onnx' : 'unavailable',
        ready: Boolean(session),
        live: false,
        liveScore: 0,
        printScore: 0,
        replayScore: 0,
        evidence: session
          ? 'MiniFAS model is ready, but no anti-spoof tensor was available.'
          : this.initFailedReason ?? 'MiniFAS model is unavailable.',
      };
    }

    if (tensor.length !== INPUT_TENSOR_LENGTH) {
      return {
        adapter: 'minifasnet-onnx',
        ready: true,
        live: false,
        liveScore: 0,
        printScore: 0,
        replayScore: 0,
        evidence: `MiniFAS tensor shape mismatch: expected ${INPUT_TENSOR_LENGTH}, got ${tensor.length}.`,
      };
    }

    try {
      const ort = await import('onnxruntime-react-native');
      const tensorData = tensor instanceof Float32Array ? tensor : Float32Array.from(tensor);
      const feeds = {
        [session.inputNames[0]]: new ort.Tensor('float32', tensorData, INPUT_SHAPE),
      };
      const outputs = await session.run(feeds);
      const output = outputs[session.outputNames[0]];
      const probabilities = normalizeScores(
        Array.from(output.data as ArrayLike<number>, Number),
      );
      const liveScore = probabilities[0] ?? 0;
      const printScore = probabilities[1] ?? 0;
      const replayScore = probabilities[2] ?? 0;
      const live = liveScore >= LIVE_THRESHOLD;

      return {
        adapter: 'minifasnet-onnx',
        ready: true,
        live,
        liveScore,
        printScore,
        replayScore,
        evidence: `MiniFAS real ${liveScore.toFixed(2)}, print ${printScore.toFixed(2)}, replay ${replayScore.toFixed(2)}.`,
      };
    } catch (error) {
      return {
        adapter: 'unavailable',
        ready: false,
        live: false,
        liveScore: 0,
        printScore: 0,
        replayScore: 0,
        evidence:
          error instanceof Error
            ? `MiniFAS inference failed: ${error.message}`
            : 'MiniFAS inference failed.',
      };
    }
  }

  async getStatus() {
    const session = await this.ensureSession();
    return {
      adapter: session ? 'minifasnet-onnx' : 'unavailable',
      ready: Boolean(session),
      modelAsset: MODEL_ASSET_PATH,
      inputShape: INPUT_SHAPE,
      threshold: LIVE_THRESHOLD,
      notes: session
        ? 'MiniFASNet-V2 ONNX anti-spoof model is ready. Output classes are treated as [live, print, replay].'
        : this.initFailedReason ?? 'MiniFASNet-V2 ONNX model is not initialized.',
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
        throw new Error('Bundled MiniFAS model asset is not available.');
      }

      const ort = await import('onnxruntime-react-native');
      this.session = (await ort.InferenceSession.create(copied.path)) as OnnxSessionLike;
      return this.session;
    } catch (error) {
      this.initFailedReason =
        error instanceof Error ? error.message : 'MiniFAS session initialization failed.';
      return null;
    }
  }
}

function normalizeScores(values: number[]) {
  if (!values.length) {
    return [0, 0, 0];
  }

  const finiteValues = values.filter(Number.isFinite);
  const probabilityTotal = finiteValues.reduce((sum, value) => sum + value, 0);
  const alreadyProbabilities =
    finiteValues.length === values.length &&
    values.every(value => value >= 0 && value <= 1) &&
    probabilityTotal > 0.98 &&
    probabilityTotal < 1.02;

  if (alreadyProbabilities) {
    return values;
  }

  const maxValue = Math.max(...values);
  const exp = values.map(value => Math.exp(value - maxValue));
  const total = exp.reduce((sum, value) => sum + value, 0) || 1;
  return exp.map(value => value / total);
}
