import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MetricCard} from '../components/MetricCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useFieldAuth} from '../context/FieldAuthContext';
import {colors} from '../theme';
import {formatTime} from '../utils/ids';

export function DashboardScreen() {
  const {data, online, latestVerification, setOnline, resetDemo} = useFieldAuth();
  const pending = data?.events.filter(event => event.syncStatus === 'pending').length ?? 0;
  const synced = data?.events.filter(event => event.syncStatus === 'synced').length ?? 0;

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.tricolor}>
          <View style={[styles.tricolorSegment, styles.saffron]} />
          <View style={[styles.tricolorSegment, styles.whiteSegment]} />
          <View style={[styles.tricolorSegment, styles.greenSegment]} />
        </View>
        <View style={styles.row}>
          <View>
            <Text style={styles.heading}>Field auth status</Text>
            <Text style={styles.body}>
              Offline verification and queue sync.
            </Text>
          </View>
          <StatusBadge
            label={online ? 'ONLINE' : 'OFFLINE'}
            tone={online ? 'good' : 'warn'}
          />
        </View>
        <PrimaryButton
          label={online ? 'Switch to Offline Demo' : 'Switch to Online Demo'}
          onPress={() => setOnline(!online)}
        />
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Enrolled workers" value={`${data?.profiles.length ?? 0}`} />
        <MetricCard label="Pending events" value={`${pending}`} tone={pending ? 'warn' : 'good'} />
        <MetricCard label="Synced events" value={`${synced}`} tone="blue" />
        <MetricCard
          label="Last sync"
          value={data?.device.lastSyncAt ? 'Done' : 'None'}
          tone={data?.device.lastSyncAt ? 'good' : 'neutral'}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Latest verification</Text>
        {latestVerification ? (
          <View style={styles.result}>
            <Text style={styles.resultMain}>
              {latestVerification.reasonCode === 'passed'
                ? `${latestVerification.workerName} verified`
                : `Result: ${latestVerification.reasonCode}`}
            </Text>
            <Text style={styles.body}>
              Similarity {latestVerification.similarity.toFixed(2)} | Latency{' '}
              {latestVerification.latencyMs} ms | Audit{' '}
              {latestVerification.auditEventId}
            </Text>
          </View>
        ) : (
          <Text style={styles.body}>No verification has been run yet.</Text>
        )}
      </View>

      <View style={styles.devicePanel}>
        <View>
          <Text style={styles.sectionTitle}>Device</Text>
          <Text style={styles.body}>ID: {data?.device.id ?? 'Loading'}</Text>
          <Text style={styles.body}>Last sync: {formatTime(data?.device.lastSyncAt)}</Text>
        </View>
        <View style={styles.resetButton}>
          <PrimaryButton label="Reset" variant="secondary" onPress={resetDemo} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 10,
  },
  hero: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    padding: 12,
  },
  tricolor: {
    height: 4,
    flexDirection: 'row',
    marginHorizontal: -12,
    marginTop: -12,
    marginBottom: 12,
  },
  tricolorSegment: {
    flex: 1,
  },
  saffron: {
    backgroundColor: colors.saffron,
  },
  whiteSegment: {
    backgroundColor: colors.white,
  },
  greenSegment: {
    backgroundColor: colors.green,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  devicePanel: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  resetButton: {
    width: 92,
  },
  result: {
    marginTop: 6,
  },
  resultMain: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
