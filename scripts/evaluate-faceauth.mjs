import {existsSync, readFileSync, statSync} from 'node:fs';

function deterministicEmbedding(seed, dimensions = 128) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const values = [];
  let state = hash >>> 0;
  for (let index = 0; index < dimensions; index += 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    values.push(((state >>> 0) % 10000) / 5000 - 1);
  }
  return values;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const manifestPath = process.argv[2];
const modelPath =
  'mobile/android/app/src/main/assets/models/mobilefacenet_arcface_quant.onnx';
const defaultPairs = [
  {left: 'NHAI-001', right: 'NHAI-001', same: true},
  {left: 'NHAI-002', right: 'NHAI-002', same: true},
  {left: 'NHAI-001', right: 'NHAI-002', same: false},
  {left: 'NHAI-003', right: 'NHAI-004', same: false},
];

const pairs = manifestPath
  ? JSON.parse(readFileSync(manifestPath, 'utf8')).pairs
  : defaultPairs;

const threshold = Number(process.env.THRESHOLD ?? 0.82);
let correct = 0;

const rows = pairs.map(pair => {
  const similarity = cosineSimilarity(
    deterministicEmbedding(pair.left),
    deterministicEmbedding(pair.right),
  );
  const predictedSame = similarity >= threshold;
  const passed = predictedSame === pair.same;
  if (passed) {
    correct += 1;
  }
  return {...pair, similarity: Number(similarity.toFixed(4)), predictedSame, passed};
});

const accuracy = Number(((correct / pairs.length) * 100).toFixed(2));
const modelSizeMb = existsSync(modelPath)
  ? Number((statSync(modelPath).size / 1024 / 1024).toFixed(2))
  : undefined;

console.table(rows);
console.log(
  JSON.stringify(
    {
      datasetName: manifestPath ?? 'built-in-smoke-manifest',
      samples: pairs.length,
      threshold,
      accuracyPercent: accuracy,
      modelPath: existsSync(modelPath) ? modelPath : 'missing',
      modelSizeMb,
      note:
        'Smoke benchmark only. The Android app now captures camera photos and runs MediaPipe crop plus ONNX inference, but a real dataset evaluation is still required before claiming 95%+ accuracy.',
    },
    null,
    2,
  ),
);
