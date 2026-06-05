export type LivenessChallenge = 'blink' | 'smile' | 'turnLeft' | 'turnRight';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export type WorkerProfile = {
  id: string;
  personnelId: string;
  name: string;
  embedding: number[];
  enrolledAt: string;
  sourceDeviceId: string;
  modelVersion: string;
};

export type ChallengeResult = {
  challenge: LivenessChallenge;
  passed: boolean;
  score: number;
  evidence: string;
};

export type VerificationReason =
  | 'passed'
  | 'liveness_failed'
  | 'no_match'
  | 'no_face'
  | 'spoof_demo_failed';

export type VerificationResult = {
  matchedUserId: string | null;
  personnelId: string | null;
  workerName: string | null;
  similarity: number;
  livenessPassed: boolean;
  challengeResults: ChallengeResult[];
  latencyMs: number;
  reasonCode: VerificationReason;
  auditEventId: string;
};

export type AttendanceEvent = {
  id: string;
  deviceEventId: string;
  serverEventId?: string;
  deviceId: string;
  personnelId: string;
  workerName: string;
  verifiedAt: string;
  similarity: number;
  livenessPassed: boolean;
  challengeType: LivenessChallenge;
  latencyMs: number;
  syncStatus: SyncStatus;
};

export type DeviceRecord = {
  id: string;
  label: string;
  lastSyncAt?: string;
};

export type BenchmarkResult = {
  id: string;
  modelName: string;
  modelSizeMb: number;
  avgLatencyMs: number;
  accuracyPercent?: number;
  datasetName: string;
  testedSamples: number;
  createdAt: string;
};

export type AppData = {
  profiles: WorkerProfile[];
  events: AttendanceEvent[];
  benchmarks: BenchmarkResult[];
  device: DeviceRecord;
};

export type SyncResponse = {
  accepted: Array<{deviceEventId: string; serverEventId: string}>;
  failed: Array<{deviceEventId: string; reason: string}>;
  syncedAt: string;
};
