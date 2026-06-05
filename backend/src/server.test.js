import assert from 'node:assert/strict';
import {addBenchmark, getAdminData, resetDb, syncEvents} from './store.js';

resetDb();

const sync = syncEvents([
  {
    deviceEventId: 'audit_1',
    deviceId: 'device_a',
    personnelId: 'NHAI-001',
    workerName: 'Field Officer One',
    verifiedAt: new Date().toISOString(),
    similarity: 0.94,
    livenessPassed: true,
    challengeType: 'blink',
    latencyMs: 412,
  },
]);

assert.equal(sync.accepted.length, 1);
assert.equal(sync.failed.length, 0);
assert.equal(getAdminData().events.length, 1);
assert.equal(getAdminData().workers.length, 1);
assert.equal(getAdminData().devices.length, 1);

addBenchmark({
  modelName: 'MobileFaceNet',
  modelSizeMb: 18.7,
  avgLatencyMs: 420,
  accuracyPercent: 96,
  datasetName: 'pilot',
});

assert.equal(getAdminData().benchmarks.length, 1);
console.log('backend store tests passed');
