import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppData, AttendanceEvent, BenchmarkResult, WorkerProfile} from '../types';
import {makeId} from '../utils/ids';

const STORAGE_KEY = 'offline-fieldauth:data:v1';
const SETTINGS_KEY = 'offline-fieldauth:settings:v1';

function initialData(): AppData {
  return {
    profiles: [],
    events: [],
    benchmarks: [
      {
        id: makeId('benchmark'),
        modelName: 'MobileFaceNet ArcFace quantized ONNX target',
        modelSizeMb: 18.7,
        avgLatencyMs: 420,
        accuracyPercent: undefined,
        datasetName: 'Pilot volunteer set pending',
        testedSamples: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    device: {
      id: `device_${Math.random().toString(36).slice(2, 8)}`,
      label: 'Android field device',
    },
  };
}

export class LocalStore {
  async loadBackendUrl(fallbackUrl: string): Promise<string> {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return fallbackUrl;
    }

    const settings = JSON.parse(raw) as {backendUrl?: string};
    return settings.backendUrl || fallbackUrl;
  }

  async saveBackendUrl(backendUrl: string) {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({backendUrl}));
  }

  async load(): Promise<AppData> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = initialData();
      await this.save(data);
      return data;
    }

    return JSON.parse(raw) as AppData;
  }

  async save(data: AppData) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async resetDemo() {
    const data = initialData();
    await this.save(data);
    return data;
  }

  async upsertProfile(profile: WorkerProfile) {
    const data = await this.load();
    const existing = data.profiles.findIndex(
      item => item.personnelId === profile.personnelId,
    );

    if (existing >= 0) {
      data.profiles[existing] = {...profile, id: data.profiles[existing].id};
    } else {
      data.profiles.push(profile);
    }

    await this.save(data);
    return data;
  }

  async addEvent(event: AttendanceEvent) {
    const data = await this.load();
    data.events.unshift(event);
    await this.save(data);
    return data;
  }

  async addBenchmark(benchmark: BenchmarkResult) {
    const data = await this.load();
    data.benchmarks.unshift(benchmark);
    await this.save(data);
    return data;
  }

  async markSynced(
    accepted: Array<{deviceEventId: string; serverEventId: string}>,
    failed: Array<{deviceEventId: string}>,
    syncedAt: string,
  ) {
    const data = await this.load();
    data.events = data.events.map(event => {
      const acceptedMatch = accepted.find(
        item => item.deviceEventId === event.deviceEventId,
      );
      const failedMatch = failed.find(
        item => item.deviceEventId === event.deviceEventId,
      );

      if (acceptedMatch) {
        return {
          ...event,
          syncStatus: 'synced',
          serverEventId: acceptedMatch.serverEventId,
        };
      }

      if (failedMatch) {
        return {...event, syncStatus: 'failed'};
      }

      return event;
    });
    data.device.lastSyncAt = syncedAt;
    await this.save(data);
    return data;
  }

  async purgeSyncedEvents() {
    const data = await this.load();
    data.events = data.events.filter(event => event.syncStatus !== 'synced');
    await this.save(data);
    return data;
  }
}
