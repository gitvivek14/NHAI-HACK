import {FaceEmbeddingAdapter} from '../src/services/FaceEmbeddingAdapter';
import {cosineSimilarity} from '../src/utils/vector';

const tensorLength = 1 * 3 * 112 * 112;

describe('FaceEmbeddingAdapter fallback embeddings', () => {
  it('matches the same face tensor instead of the personnel label', async () => {
    const adapter = new FaceEmbeddingAdapter();
    const tensor = makeFaceLikeTensor(7);

    const enrolled = await adapter.embed({
      personnelId: 'field-worker-001',
      name: 'Worker One',
      tensor,
    });
    const verified = await adapter.embed({
      personnelId: 'live-camera-capture',
      tensor,
    });

    expect(cosineSimilarity(enrolled, verified)).toBeGreaterThan(0.99);
  });

  it('keeps similar captures close and clearly different tensors lower', async () => {
    const adapter = new FaceEmbeddingAdapter();
    const enrolled = await adapter.embed({
      personnelId: 'field-worker-001',
      tensor: makeFaceLikeTensor(3),
    });
    const similarCapture = await adapter.embed({
      personnelId: 'live-camera-capture',
      tensor: makeFaceLikeTensor(3, 0.015),
    });
    const differentCapture = await adapter.embed({
      personnelId: 'live-camera-capture',
      tensor: makeFaceLikeTensor(31),
    });

    expect(cosineSimilarity(enrolled, similarCapture)).toBeGreaterThan(0.93);
    expect(cosineSimilarity(enrolled, differentCapture)).toBeLessThan(0.9);
  });
});

function makeFaceLikeTensor(seed: number, jitter = 0) {
  const tensor = new Float32Array(tensorLength);
  const pixels = 112 * 112;
  const centerX = 56 + Math.sin(seed) * 7;
  const centerY = 55 + Math.cos(seed) * 5;

  for (let y = 0; y < 112; y += 1) {
    for (let x = 0; x < 112; x += 1) {
      const index = y * 112 + x;
      const dx = (x - centerX) / 31;
      const dy = (y - centerY) / 38;
      const oval = Math.exp(-(dx * dx + dy * dy));
      const leftEye = darkSpot(x, y, centerX - 13, centerY - 9, 5);
      const rightEye = darkSpot(x, y, centerX + 13, centerY - 9, 5);
      const mouth = darkSpot(x, y, centerX, centerY + 18, 10);
      const texture = Math.sin((x + seed) * 0.18) * 0.08 +
        Math.cos((y - seed) * 0.14) * 0.08 +
        jitter * Math.sin((x * 13 + y * 7 + seed) * 0.2);
      const base = clamp(oval - leftEye - rightEye - mouth + texture);

      tensor[index] = base;
      tensor[pixels + index] = clamp(base * 0.92 + 0.05);
      tensor[pixels * 2 + index] = clamp(base * 0.82 + 0.08);
    }
  }

  return tensor;
}

function darkSpot(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
) {
  const dx = (x - centerX) / radius;
  const dy = (y - centerY) / radius;
  return Math.exp(-(dx * dx + dy * dy)) * 0.6;
}

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}
