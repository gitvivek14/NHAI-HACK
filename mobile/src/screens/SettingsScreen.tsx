import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {Card} from '../components/Card';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useFieldAuth} from '../context/FieldAuthContext';
import {FaceEmbeddingAdapter} from '../services/FaceEmbeddingAdapter';
import {MiniFasAntiSpoofAdapter} from '../services/MiniFasAntiSpoofAdapter';
import {ScrfdFaceDetectorAdapter} from '../services/ScrfdFaceDetectorAdapter';
import {getMediaPipeStatus} from '../native/MediaPipeFaceLandmarker';
import {colors} from '../theme';

export function SettingsScreen() {
  const {data, backendUrl, setBackendUrl} = useFieldAuth();
  const [draftUrl, setDraftUrl] = useState(backendUrl);
  const [modelStatus, setModelStatus] = useState('');
  const [scrfdStatus, setScrfdStatus] = useState('');
  const [miniFasStatus, setMiniFasStatus] = useState('');
  const [mediaPipeStatus, setMediaPipeStatus] = useState('');

  useEffect(() => {
    new FaceEmbeddingAdapter().getStatus().then(status => {
      setModelStatus(
        status.ready ? 'Face recognition ready' : 'Face recognition loading',
      );
    });
    new ScrfdFaceDetectorAdapter().getStatus().then(status => {
      setScrfdStatus(
        status.ready ? 'Face detector ready' : 'Face detector loading',
      );
    });
    new MiniFasAntiSpoofAdapter().getStatus().then(status => {
      setMiniFasStatus(
        status.ready ? 'Spoof signal available' : 'Spoof signal loading',
      );
    });
    getMediaPipeStatus().then(status => {
      setMediaPipeStatus(
        status.available ? 'Liveness landmarks ready' : 'Liveness loading',
      );
    });
  }, []);

  const applyBackendUrl = (url: string) => {
    setDraftUrl(url);
    setBackendUrl(url);
  };

  return (
    <View>
      <Card>
        <Text style={styles.heading}>Device</Text>
        <Text style={styles.body}>Device ID: {data?.device.id ?? 'Loading'}</Text>
        <Text style={styles.body}>Android field attendance unit</Text>
      </Card>

      <Card>
        <Text style={styles.heading}>Backend connection</Text>
        <TextInput
          value={draftUrl}
          onChangeText={setDraftUrl}
          autoCapitalize="none"
          style={styles.input}
        />
        <View style={styles.presetRow}>
          <PrimaryButton
            label="USB backend"
            onPress={() => applyBackendUrl('http://127.0.0.1:4000')}
            variant="secondary"
          />
          <PrimaryButton
            label="Emulator"
            onPress={() => applyBackendUrl('http://10.0.2.2:4000')}
            variant="secondary"
          />
        </View>
        <PrimaryButton label="Save backend URL" onPress={() => setBackendUrl(draftUrl)} />
      </Card>

      <Card>
        <Text style={styles.heading}>System readiness</Text>
        <StatusBadge label="On-device auth" tone="blue" />
        <Text style={styles.body}>{scrfdStatus || 'Loading SCRFD status...'}</Text>
        <Text style={styles.body}>{miniFasStatus || 'Loading MiniFAS status...'}</Text>
        <Text style={styles.body}>{modelStatus || 'Loading ONNX status...'}</Text>
        <Text style={styles.body}>{mediaPipeStatus || 'Loading MediaPipe status...'}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  pipeline: {
    color: colors.text,
    marginTop: 10,
    fontWeight: '800',
    lineHeight: 20,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    marginTop: 12,
    color: colors.text,
    backgroundColor: colors.white,
  },
  presetRow: {
    gap: 8,
    marginTop: 4,
  },
});
