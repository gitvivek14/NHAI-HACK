import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const dbPath = resolve(process.cwd(), 'data', 'fieldauth-db.json');

function emptyDb() {
  return {
    workers: [],
    events: [],
    devices: [],
    benchmarks: [],
  };
}

function readDb() {
  if (!existsSync(dbPath)) {
    writeDb(emptyDb());
  }
  return JSON.parse(readFileSync(dbPath, 'utf8'));
}

function writeDb(db) {
  mkdirSync(dirname(dbPath), {recursive: true});
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function resetDb() {
  writeDb(emptyDb());
}

export function syncEvents(events) {
  const db = readDb();
  const accepted = [];
  const failed = [];
  const syncedAt = new Date().toISOString();

  for (const event of events) {
    if (!event.deviceEventId || !event.personnelId || !event.deviceId) {
      failed.push({
        deviceEventId: event.deviceEventId ?? 'missing',
        reason: 'Missing required sync fields',
      });
      continue;
    }

    const serverEventId = `srv_${event.deviceId}_${event.deviceEventId}`;
    const existing = db.events.find(
      item => item.deviceEventId === event.deviceEventId && item.deviceId === event.deviceId,
    );

    if (!existing) {
      db.events.unshift({
        ...event,
        id: serverEventId,
        serverEventId,
        syncStatus: 'synced',
        syncedAt,
      });
    }

    upsertWorker(db, event);
    upsertDevice(db, event.deviceId, syncedAt);
    accepted.push({deviceEventId: event.deviceEventId, serverEventId});
  }

  writeDb(db);
  return {accepted, failed, syncedAt};
}

export function addBenchmark(benchmark) {
  const db = readDb();
  const record = {
    id: benchmark.id ?? `bench_${Date.now()}`,
    modelName: benchmark.modelName,
    modelSizeMb: Number(benchmark.modelSizeMb),
    avgLatencyMs: Number(benchmark.avgLatencyMs),
    accuracyPercent:
      benchmark.accuracyPercent === undefined
        ? undefined
        : Number(benchmark.accuracyPercent),
    datasetName: benchmark.datasetName,
    createdAt: benchmark.createdAt ?? new Date().toISOString(),
  };
  db.benchmarks.unshift(record);
  writeDb(db);
  return record;
}

export function getAdminData() {
  return readDb();
}

function upsertWorker(db, event) {
  const existing = db.workers.find(item => item.personnelId === event.personnelId);
  if (existing) {
    return;
  }

  db.workers.push({
    id: `worker_${event.personnelId}`,
    personnelId: event.personnelId,
    name: event.workerName ?? event.personnelId,
    enrolledAt: event.verifiedAt ?? new Date().toISOString(),
    sourceDeviceId: event.deviceId,
  });
}

function upsertDevice(db, deviceId, syncedAt) {
  const existing = db.devices.find(item => item.id === deviceId);
  if (existing) {
    existing.lastSyncAt = syncedAt;
    return;
  }

  db.devices.push({
    id: deviceId,
    label: 'Field device',
    lastSyncAt: syncedAt,
  });
}
