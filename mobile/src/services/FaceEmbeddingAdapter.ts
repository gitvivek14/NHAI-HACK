import {deterministicEmbedding} from '../utils/vector';
import {copyBundledModelAsset} from '../native/ModelAssets';

export type EmbeddingInput = {
  personnelId: string;
  name?: string;
  frameSeed?: string;
  tensor?: number[] | Float32Array;
};

export type EmbeddingAdapterStatus = {
  adapter: 'onnxruntime-react-native' | 'deterministic-fallback';
  modelName: string;
  modelSizeMb: number;
  modelAsset: string;
  ready: boolean;
  notes: string;
  inputShape: number[];
  outputDimensions: number;
};

const MODEL_ASSET_PATH = 'models/mobilefacenet_arcface_quant.onnx';
const MODEL_FILE_NAME = 'mobilefacenet_arcface_quant.onnx';
const MODEL_SIZE_MB = 13.1;
const INPUT_SHAPE = [1, 3, 112, 112];
const INPUT_WIDTH = 112;
const INPUT_HEIGHT = 112;
const INPUT_PIXELS = INPUT_WIDTH * INPUT_HEIGHT;
const INPUT_TENSOR_LENGTH = 1 * 3 * INPUT_PIXELS;
const FALLBACK_OUTPUT_DIMENSIONS = 512;

export class FaceEmbeddingAdapter {
  private session: unknown | null = null;
  private status: EmbeddingAdapterStatus = {
    adapter: 'deterministic-fallback',
    modelName: 'w600k MobileFaceNet ONNX',
    modelSizeMb: MODEL_SIZE_MB,
    modelAsset: MODEL_ASSET_PATH,
    ready: false,
    notes: 'ONNX model asset is bundled; session has not been initialized yet.',
    inputShape: INPUT_SHAPE,
    outputDimensions: 512,
  };

  async getStatus(): Promise<EmbeddingAdapterStatus> {
    await this.ensureSession();
    return this.status;
  }

  async embed(input: EmbeddingInput): Promise<number[]> {
    const session = await this.ensureSession();
    if (session) {
      try {
        return await this.runOnnxEmbedding(session, input);
      } catch (error) {
        this.status = {
          ...this.status,
          adapter: 'deterministic-fallback',
          ready: false,
          notes:
            error instanceof Error
              ? `ONNX inference failed, using fallback: ${error.message}`
              : 'ONNX inference failed, using fallback.',
        };
      }
    }

    return this.makeFallbackEmbedding(input);
  }

  private async ensureSession() {
    if (this.session) {
      return this.session;
    }

    try {
      const copied = await copyBundledModelAsset(MODEL_ASSET_PATH, MODEL_FILE_NAME);
      if (!copied?.exists) {
        throw new Error('Bundled ONNX model is not available on this platform.');
      }

      const ort = await import('onnxruntime-react-native');
      this.session = await ort.InferenceSession.create(copied.path);
      this.status = {
        adapter: 'onnxruntime-react-native',
        modelName: 'w600k MobileFaceNet ONNX',
        modelSizeMb: Number((copied.sizeBytes / 1024 / 1024).toFixed(2)),
        modelAsset: copied.path,
        ready: true,
        notes:
          'ONNX Runtime session initialized. Captured camera tensors are used when provided, with a lightweight crop descriptor blended in for demo stability.',
        inputShape: INPUT_SHAPE,
        outputDimensions: 512,
      };
      return this.session;
    } catch (error) {
      this.status = {
        ...this.status,
        adapter: 'deterministic-fallback',
        ready: false,
        notes:
          error instanceof Error
            ? `ONNX session unavailable: ${error.message}`
            : 'ONNX session unavailable.',
      };
      return null;
    }
  }

  private async runOnnxEmbedding(session: unknown, input: EmbeddingInput) {
    const ort = await import('onnxruntime-react-native');
    const typedSession = session as {
      inputNames: string[];
      outputNames: string[];
      run: (feeds: Record<string, unknown>) => Promise<Record<string, {data: unknown}>>;
    };
    const tensorData = this.makeInputTensor(input);
    const feeds = {
      [typedSession.inputNames[0]]: new ort.Tensor(
        'float32',
        tensorData,
        INPUT_SHAPE,
      ),
    };
    const outputs = await typedSession.run(feeds);
    const output = outputs[typedSession.outputNames[0]];
    const values = Array.from(output.data as ArrayLike<number>, value =>
      Number(value),
    );

    const onnxEmbedding = this.l2Normalize(values);
    if (
      input.tensor?.length === INPUT_TENSOR_LENGTH &&
      onnxEmbedding.length === FALLBACK_OUTPUT_DIMENSIONS
    ) {
      const descriptor = this.imageTensorEmbedding(input.tensor);
      return this.l2Normalize(
        onnxEmbedding.map((value, index) => value * 0.75 + descriptor[index] * 0.25),
      );
    }

    return onnxEmbedding;
  }

  private makeInputTensor(input: EmbeddingInput) {
    if (input.tensor?.length === INPUT_TENSOR_LENGTH) {
      return input.tensor instanceof Float32Array
        ? input.tensor
        : Float32Array.from(input.tensor);
    }

    const seed = `${input.personnelId}:${input.name ?? ''}:${input.frameSeed ?? ''}`
      .trim()
      .toLowerCase();
    const base = deterministicEmbedding(seed, 112 * 112);
    const tensor = new Float32Array(1 * 3 * 112 * 112);

    for (let pixelIndex = 0; pixelIndex < 112 * 112; pixelIndex += 1) {
      const value = base[pixelIndex];
      tensor[pixelIndex] = value;
      tensor[112 * 112 + pixelIndex] = value * 0.92;
      tensor[2 * 112 * 112 + pixelIndex] = value * 0.84;
    }

    return tensor;
  }

  private makeFallbackEmbedding(input: EmbeddingInput) {
    if (input.tensor?.length === INPUT_TENSOR_LENGTH) {
      return this.imageTensorEmbedding(input.tensor);
    }

    const identitySeed = `${input.personnelId}:${input.name ?? ''}`
      .trim()
      .toLowerCase();
    return this.l2Normalize(
      deterministicEmbedding(identitySeed, FALLBACK_OUTPUT_DIMENSIONS),
    );
  }

  private imageTensorEmbedding(tensorInput: number[] | Float32Array) {
    const tensor =
      tensorInput instanceof Float32Array
        ? tensorInput
        : Float32Array.from(tensorInput);
    const gray = new Float32Array(INPUT_PIXELS);
    let mean = 0;

    for (let index = 0; index < INPUT_PIXELS; index += 1) {
      const red = tensor[index];
      const green = tensor[INPUT_PIXELS + index];
      const blue = tensor[INPUT_PIXELS * 2 + index];
      const value = (red + green + blue) / 3;
      gray[index] = value;
      mean += value;
    }

    mean /= INPUT_PIXELS;
    let variance = 0;
    for (let index = 0; index < INPUT_PIXELS; index += 1) {
      const delta = gray[index] - mean;
      variance += delta * delta;
    }
    const std = Math.sqrt(variance / INPUT_PIXELS) || 1;
    const features: number[] = [];

    this.appendBlockFeatures(features, 16, index => (gray[index] - mean) / std);
    this.appendBlockFeatures(features, 8, index => {
      const row = Math.floor(index / INPUT_WIDTH);
      const col = index % INPUT_WIDTH;
      const left = gray[row * INPUT_WIDTH + Math.max(0, col - 1)];
      const right = gray[row * INPUT_WIDTH + Math.min(INPUT_WIDTH - 1, col + 1)];
      const up = gray[Math.max(0, row - 1) * INPUT_WIDTH + col];
      const down = gray[Math.min(INPUT_HEIGHT - 1, row + 1) * INPUT_WIDTH + col];
      const dx = (right - left) / std;
      const dy = (down - up) / std;
      return Math.min(3, Math.hypot(dx, dy));
    });
    this.appendBlockFeatures(features, 8, index => {
      const row = Math.floor(index / INPUT_WIDTH);
      const col = index % INPUT_WIDTH;
      const left = gray[row * INPUT_WIDTH + Math.max(0, col - 1)];
      const right = gray[row * INPUT_WIDTH + Math.min(INPUT_WIDTH - 1, col + 1)];
      return (right - left) / std;
    });
    this.appendBlockFeatures(features, 8, index => {
      const row = Math.floor(index / INPUT_WIDTH);
      const col = index % INPUT_WIDTH;
      const up = gray[Math.max(0, row - 1) * INPUT_WIDTH + col];
      const down = gray[Math.min(INPUT_HEIGHT - 1, row + 1) * INPUT_WIDTH + col];
      return (down - up) / std;
    });
    this.appendBlockFeatures(features, 8, index => {
      const red = tensor[index];
      const green = tensor[INPUT_PIXELS + index];
      return red - green;
    });
    this.appendBlockFeatures(features, 8, index => {
      const blue = tensor[INPUT_PIXELS * 2 + index];
      return blue - gray[index];
    });

    return this.l2Normalize(features.slice(0, FALLBACK_OUTPUT_DIMENSIONS));
  }

  private appendBlockFeatures(
    features: number[],
    gridSize: number,
    valueAt: (index: number) => number,
  ) {
    const blockWidth = INPUT_WIDTH / gridSize;
    const blockHeight = INPUT_HEIGHT / gridSize;

    for (let blockY = 0; blockY < gridSize; blockY += 1) {
      for (let blockX = 0; blockX < gridSize; blockX += 1) {
        const startX = Math.floor(blockX * blockWidth);
        const endX = Math.floor((blockX + 1) * blockWidth);
        const startY = Math.floor(blockY * blockHeight);
        const endY = Math.floor((blockY + 1) * blockHeight);
        let sum = 0;
        let count = 0;

        for (let y = startY; y < endY; y += 1) {
          for (let x = startX; x < endX; x += 1) {
            sum += valueAt(y * INPUT_WIDTH + x);
            count += 1;
          }
        }

        features.push(Number((sum / Math.max(1, count)).toFixed(6)));
      }
    }
  }

  private l2Normalize(values: number[]) {
    const magnitude =
      Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
    return values.map(value => Number((value / magnitude).toFixed(6)));
  }
}
