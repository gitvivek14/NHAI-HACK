import React, {useRef, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {CameraPanel, CameraPanelHandle} from '../components/CameraPanel';
import {Card} from '../components/Card';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useFieldAuth} from '../context/FieldAuthContext';
import {colors} from '../theme';

export function EnrollScreen() {
  const {data, enroll} = useFieldAuth();
  const cameraRef = useRef<CameraPanelHandle>(null);
  const [personnelId, setPersonnelId] = useState('NHAI-001');
  const [name, setName] = useState('Field Officer One');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!personnelId.trim() || !name.trim()) {
      Alert.alert('Missing details', 'Enter personnel ID and name.');
      return;
    }

    try {
      setSaving(true);
      const photoPaths = await capturePhotos(cameraRef, 3);
      if (!photoPaths.length) {
        throw new Error('Camera capture is not available. Grant camera permission and try again.');
      }

      await enroll(personnelId, name, photoPaths);
      Alert.alert('Enrolled', `${name} is ready for offline verification.`);
    } catch (error) {
      Alert.alert(
        'Enrollment failed',
        error instanceof Error ? error.message : 'Could not enroll this worker.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.kicker}>Worker enrollment</Text>
            <Text style={styles.heading}>Capture profile</Text>
          </View>
          <StatusBadge label={`${data?.profiles.length ?? 0} LOCAL`} tone="blue" />
        </View>

        <CameraPanel
          ref={cameraRef}
          height={390}
          label="Enrollment camera"
          hint={
            saving
              ? 'Analyzing symmetry and storing embedding'
              : 'Center your face in the mesh'
          }
          status={saving ? 'scanning' : 'idle'}
          scanActive={saving}
        />

        <Card>
          <Text style={styles.sectionLabel}>Identity</Text>
          <TextInput
            value={personnelId}
            onChangeText={setPersonnelId}
            placeholder="Personnel ID"
            autoCapitalize="characters"
            style={styles.input}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            style={styles.input}
          />
        </Card>

      <Card>
        <Text style={styles.heading}>Enrolled profiles</Text>
        {data?.profiles.length ? (
          data.profiles.map(profile => (
            <View key={profile.id} style={styles.profileRow}>
              <View>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.body}>{profile.personnelId}</Text>
              </View>
              <StatusBadge label="LOCAL" tone="blue" />
            </View>
          ))
        ) : (
          <Text style={styles.body}>No workers enrolled yet.</Text>
        )}
      </Card>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={saving ? 'Analyzing face' : 'Capture and enroll'}
          onPress={submit}
          disabled={saving}
        />
      </View>
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
    paddingBottom: 92,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 10,
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
  profileRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileName: {
    color: colors.text,
    fontWeight: '800',
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
      await sleep(220);
    }
  }
  return photoPaths;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}
