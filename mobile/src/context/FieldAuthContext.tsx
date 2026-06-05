import React, {createContext, PropsWithChildren, useContext, useEffect, useMemo, useState} from 'react';
import {Platform} from 'react-native';
import {FaceAuthService} from '../services/FaceAuthService';
import {LivenessEngine} from '../services/LivenessEngine';
import {LocalStore} from '../services/LocalStore';
import {SyncQueue} from '../services/SyncQueue';
import {
  AppData,
  AttendanceEvent,
  LivenessChallenge,
  VerificationResult,
} from '../types';
import {makeId, isoNow} from '../utils/ids';

type FieldAuthContextValue = {
  data: AppData | null;
  online: boolean;
  backendUrl: string;
  currentChallenge: LivenessChallenge;
  latestVerification: VerificationResult | null;
  lastSyncMessage: string;
  loading: boolean;
  enroll: (
    personnelId: string,
    name: string,
    photoPaths: string[],
  ) => Promise<void>;
  verify: (
    selectedPersonnelId?: string,
    spoofMode?: boolean,
    photoPaths?: string[],
  ) => Promise<void>;
  nextChallenge: () => void;
  syncNow: () => Promise<void>;
  purgeSynced: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setBackendUrl: (url: string) => void;
  resetDemo: () => Promise<void>;
};

const FieldAuthContext = createContext<FieldAuthContextValue | undefined>(
  undefined,
);

const store = new LocalStore();
const faceAuth = new FaceAuthService();
const livenessEngine = new LivenessEngine();
const syncQueue = new SyncQueue();
const defaultBackendUrl =
  Platform.OS === 'android' ? 'http://127.0.0.1:4000' : 'http://localhost:4000';

export function FieldAuthProvider({children}: PropsWithChildren) {
  const [data, setData] = useState<AppData | null>(null);
  const [online, setOnline] = useState(false);
  const [backendUrl, setBackendUrl] = useState(defaultBackendUrl);
  const [lastSyncMessage, setLastSyncMessage] = useState('No sync attempted yet.');
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge>(
    livenessEngine.nextChallenge(),
  );
  const [latestVerification, setLatestVerification] =
    useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      store.load(),
      store.loadBackendUrl(defaultBackendUrl),
    ]).then(([nextData, nextBackendUrl]) => {
      setData(nextData);
      setBackendUrl(nextBackendUrl);
      setLoading(false);
    });
  }, []);

  const value = useMemo<FieldAuthContextValue>(
    () => ({
      data,
      online,
      backendUrl,
      currentChallenge,
      latestVerification,
      lastSyncMessage,
      loading,
      async enroll(personnelId: string, name: string, photoPaths: string[]) {
        if (!data) {
          return;
        }

        const profile = await faceAuth.enroll({
          personnelId,
          name,
          deviceId: data.device.id,
          photoPaths,
        });
        setData(await store.upsertProfile(profile));
      },
      async verify(
        selectedPersonnelId?: string,
        spoofMode = false,
        photoPaths = [],
      ) {
        if (!data) {
          return;
        }

        const result = await faceAuth.verify({
          profiles: data.profiles,
          selectedPersonnelId,
          photoPaths,
          challenge: currentChallenge,
          spoofMode,
        });
        setLatestVerification(result);

        if (result.reasonCode === 'passed' && result.personnelId && result.workerName) {
          const event: AttendanceEvent = {
            id: makeId('event'),
            deviceEventId: result.auditEventId,
            deviceId: data.device.id,
            personnelId: result.personnelId,
            workerName: result.workerName,
            verifiedAt: isoNow(),
            similarity: result.similarity,
            livenessPassed: result.livenessPassed,
            challengeType: currentChallenge,
            latencyMs: result.latencyMs,
            syncStatus: 'pending',
          };
          setData(await store.addEvent(event));
        }

        setCurrentChallenge(livenessEngine.nextChallenge());
      },
      nextChallenge() {
        setCurrentChallenge(livenessEngine.nextChallenge());
      },
      async syncNow() {
        if (!data) {
          return;
        }

        const response = await syncQueue.syncNow({
          backendUrl,
          events: data.events,
          online,
        });
        if (response.accepted.length) {
          setLastSyncMessage(
            `Synced ${response.accepted.length} event(s) at ${new Date(
              response.syncedAt,
            ).toLocaleTimeString()}.`,
          );
        } else if (response.failed.length) {
          setLastSyncMessage(
            `Sync failed: ${response.failed[0].reason ?? 'backend unavailable'}`,
          );
        } else {
          setLastSyncMessage('No pending events to sync.');
        }
        setData(
          await store.markSynced(
            response.accepted,
            response.failed,
            response.syncedAt,
          ),
        );
      },
      async purgeSynced() {
        setData(await store.purgeSyncedEvents());
      },
      setOnline,
      setBackendUrl(url: string) {
        setBackendUrl(url);
        store.saveBackendUrl(url).catch(() => undefined);
      },
      async resetDemo() {
        setLatestVerification(null);
        setData(await store.resetDemo());
      },
    }),
    [
      backendUrl,
      currentChallenge,
      data,
      latestVerification,
      lastSyncMessage,
      loading,
      online,
    ],
  );

  return (
    <FieldAuthContext.Provider value={value}>
      {children}
    </FieldAuthContext.Provider>
  );
}

export function useFieldAuth() {
  const context = useContext(FieldAuthContext);
  if (!context) {
    throw new Error('useFieldAuth must be used inside FieldAuthProvider');
  }
  return context;
}
