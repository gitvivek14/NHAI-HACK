import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Alert,
  Easing,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {CameraPanel, CameraPanelHandle} from '../components/CameraPanel';
import {Card} from '../components/Card';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useFieldAuth} from '../context/FieldAuthContext';
import {analyzePhotoWithNativeMediaPipe} from '../native/MediaPipeFaceLandmarker';
import {LivenessEngine} from '../services/LivenessEngine';
import {colors} from '../theme';

const liveness = new LivenessEngine();

export function VerifyScreen() {
  const {data, currentChallenge, latestVerification, verify, nextChallenge} =
    useFieldAuth();
  const cameraRef = useRef<CameraPanelHandle>(null);
  const scanBusyRef = useRef(false);
  const lastAutoRunAtRef = useRef(0);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<
    string | undefined
  >();
  const [spoofMode, setSpoofMode] = useState(false);
  const [running, setRunning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'scanning' | 'ready' | 'success' | 'error'
  >('idle');
  const [cameraMessage, setCameraMessage] = useState('Place face in the mesh');
  const [showVerifiedSplash, setShowVerifiedSplash] = useState(false);

  const selected = useMemo(
    () =>
      data?.profiles.find(
        profile => profile.personnelId === selectedPersonnelId,
      ) ?? data?.profiles[0],
    [data?.profiles, selectedPersonnelId],
  );

  const runVerification = useCallback(
    async (initialPhotoPaths: string[] = []) => {
      if (running) {
        return;
      }

      try {
        setRunning(true);
        setCameraStatus('scanning');
        setCameraMessage('Verifying...');
        const photoPaths = [
          ...initialPhotoPaths,
          ...(await capturePhotos(
            cameraRef,
            Math.max(0, 3 - initialPhotoPaths.length),
          )),
        ];
        if (!photoPaths.length) {
          throw new Error(
            'Camera capture is not available. Grant camera permission and try again.',
          );
        }

        await verify(selectedPersonnelId, spoofMode, photoPaths);
      } catch (error) {
        Alert.alert(
          'Verification failed',
          error instanceof Error
            ? error.message
            : 'Could not capture or verify this face.',
        );
      } finally {
        setRunning(false);
      }
    },
    [running, selectedPersonnelId, spoofMode, verify],
  );

  useEffect(() => {
    if (!data?.profiles.length) {
      setCameraStatus('idle');
      setCameraMessage('Enroll a worker first');
      return;
    }

    let cancelled = false;
    async function scanFace() {
      if (
        cancelled ||
        running ||
        showVerifiedSplash ||
        scanBusyRef.current ||
        Date.now() - lastAutoRunAtRef.current < 4500
      ) {
        return;
      }

      try {
        scanBusyRef.current = true;
        setCameraStatus('scanning');
        setCameraMessage('Looking for face...');
        const photoPath = await cameraRef.current?.takePhoto();
        if (!photoPath || cancelled) {
          setCameraStatus('idle');
          setCameraMessage('Camera warming up');
          return;
        }

        const analysis = await analyzePhotoWithNativeMediaPipe(
          currentChallenge,
          photoPath,
          false,
        );
        if (cancelled) {
          return;
        }

        if (analysis.facePresent) {
          setCameraStatus('ready');
          setCameraMessage(
            'Face detected. Verifying...',
          );
          lastAutoRunAtRef.current = Date.now();
          await runVerification([photoPath]);
        } else if (analysis.tensor?.length) {
          setCameraStatus('scanning');
          setCameraMessage('Looking for a centered face');
        } else {
          setCameraStatus('error');
          setCameraMessage('Move closer and center face');
        }
      } catch {
        if (!cancelled) {
          setCameraStatus('error');
          setCameraMessage('Face scan failed. Keep face centered.');
        }
      } finally {
        scanBusyRef.current = false;
      }
    }

    const start = setTimeout(scanFace, 650);
    const interval = setInterval(scanFace, 1500);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [
    currentChallenge,
    data?.profiles.length,
    runVerification,
    running,
    selected?.personnelId,
    showVerifiedSplash,
    spoofMode,
  ]);

  useEffect(() => {
    if (!latestVerification) {
      return;
    }

    if (latestVerification.reasonCode === 'passed') {
      setCameraStatus('success');
      setCameraMessage('Verified');
      setShowVerifiedSplash(true);
    } else {
      setCameraStatus('error');
      setCameraMessage(`Rejected: ${latestVerification.reasonCode}`);
      setShowVerifiedSplash(false);
    }
  }, [latestVerification]);

  useEffect(() => {
    if (!showVerifiedSplash) {
      return;
    }

    const timeout = setTimeout(() => setShowVerifiedSplash(false), 2800);
    return () => clearTimeout(timeout);
  }, [showVerifiedSplash]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.kicker}>Field attendance</Text>
            <Text style={styles.heading}>Verify worker</Text>
          </View>
          <StatusBadge label={currentChallenge} tone="blue" />
        </View>

        {showVerifiedSplash && latestVerification?.reasonCode === 'passed' ? (
          <VerifiedSplash
            workerName={latestVerification.workerName ?? 'Worker'}
            similarity={latestVerification.similarity}
            latencyMs={latestVerification.latencyMs}
          />
        ) : (
          <CameraPanel
            ref={cameraRef}
            height={360}
            label="Verification camera"
            hint={cameraMessage}
            status={cameraStatus}
          />
        )}

        <View style={styles.challenge}>
          <View style={styles.flex}>
            <Text style={styles.challengeLabel}>Challenge</Text>
            <Text style={styles.challengeText}>
              {liveness.labelFor(currentChallenge)} or hold steady
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={nextChallenge}
            style={styles.challengeButton}>
            <Text style={styles.challengeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <Text style={styles.sectionLabel}>Claimed identity</Text>
          {data?.profiles.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workerList}>
              <TouchableOpacity
                onPress={() => setSelectedPersonnelId(undefined)}
                style={[
                  styles.workerOption,
                  !selectedPersonnelId ? styles.activeWorker : null,
                ]}>
                <Text style={styles.workerName}>Auto identify</Text>
                <Text style={styles.workerId}>Best face match</Text>
              </TouchableOpacity>
              {data.profiles.map(profile => {
                const active =
                  selectedPersonnelId === profile.personnelId;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    onPress={() => setSelectedPersonnelId(profile.personnelId)}
                    style={[
                      styles.workerOption,
                      active ? styles.activeWorker : null,
                    ]}>
                    <Text style={styles.workerName}>{profile.name}</Text>
                    <Text style={styles.workerId}>{profile.personnelId}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.body}>Enroll at least one worker first.</Text>
          )}
        </Card>

        <Card>
          <View style={styles.spoofRow}>
            <View style={styles.flex}>
              <Text style={styles.sectionLabel}>Spoof demo</Text>
              <Text style={styles.body}>Photo/screen rejection path</Text>
            </View>
            <Switch value={spoofMode} onValueChange={setSpoofMode} />
          </View>
        </Card>

        {latestVerification ? (
          <Card>
            <Text style={styles.heading}>Verification result</Text>
            <StatusBadge
              label={latestVerification.reasonCode}
              tone={latestVerification.reasonCode === 'passed' ? 'good' : 'bad'}
            />
            <Text style={styles.resultMain}>
              {latestVerification.reasonCode === 'passed'
                ? `${latestVerification.workerName} matched`
                : 'Verification rejected'}
            </Text>
            <Text style={styles.body}>
              Similarity {latestVerification.similarity.toFixed(2)} | Latency{' '}
              {latestVerification.latencyMs} ms
            </Text>
            {latestVerification.challengeResults.map((result, index) => (
              <Text key={`${result.challenge}-${index}`} style={styles.body}>
                {result.challenge}: {result.passed ? 'passed' : 'failed'} (
                {result.score.toFixed(2)}) - {result.evidence}
              </Text>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={running ? 'Verifying' : 'Verify now'}
          onPress={() => runVerification()}
          disabled={running || !data?.profiles.length}
        />
      </View>
    </View>
  );
}

function VerifiedSplash({
  workerName,
  similarity,
  latencyMs,
}: {
  workerName: string;
  similarity: number;
  latencyMs: number;
}) {
  const scale = useRef(new Animated.Value(0.78)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 95,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.verifiedPanel}>
      <Animated.View
        style={[
          styles.checkCircle,
          {
            opacity,
            transform: [{scale}],
          },
        ]}>
        <Text style={styles.checkMark}>✓</Text>
      </Animated.View>
      <Text style={styles.verifiedTitle}>Verified</Text>
      <Text style={styles.verifiedName}>{workerName}</Text>
      <Text style={styles.verifiedMeta}>
        Similarity {similarity.toFixed(2)} | {latencyMs} ms
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroller: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  kicker: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  body: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  challenge: {
    borderRadius: 8,
    backgroundColor: colors.panelAlt,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  challengeLabel: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  challengeText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  challengeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  challengeButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  workerList: {
    gap: 8,
    paddingTop: 10,
  },
  workerOption: {
    minWidth: 150,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  activeWorker: {
    borderColor: colors.ink,
    backgroundColor: '#EEF5FA',
  },
  workerName: {
    color: colors.text,
    fontWeight: '800',
  },
  workerId: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  flex: {
    flex: 1,
  },
  spoofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultMain: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  verifiedPanel: {
    height: 360,
    borderRadius: 8,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#30D27A',
  },
  checkCircle: {
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: '#30D27A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30D27A',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 6,
  },
  checkMark: {
    color: colors.white,
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 60,
  },
  verifiedTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 18,
  },
  verifiedName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  verifiedMeta: {
    color: '#D8F7E8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});

async function capturePhotos(
  cameraRef: React.RefObject<CameraPanelHandle | null>,
  count: number,
) {
  const photoPaths: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const photoPath = await cameraRef.current?.takePhoto();
    if (photoPath) {
      photoPaths.push(photoPath);
    }
    if (index < count - 1) {
      await sleep(260);
    }
  }
  return photoPaths;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}
