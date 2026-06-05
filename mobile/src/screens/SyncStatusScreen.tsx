import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {Card} from '../components/Card';
import {MetricCard} from '../components/MetricCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useFieldAuth} from '../context/FieldAuthContext';
import {colors} from '../theme';
import {formatTime} from '../utils/ids';

export function SyncStatusScreen() {
  const {data, online, setOnline, syncNow, purgeSynced, backendUrl, lastSyncMessage} = useFieldAuth();
  const pending = data?.events.filter(event => event.syncStatus === 'pending').length ?? 0;
  const failed = data?.events.filter(event => event.syncStatus === 'failed').length ?? 0;

  return (
    <View>
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.heading}>Network mode</Text>
            <Text style={styles.body}>
              Judges should see records stay hidden from the admin dashboard
              while the device is offline.
            </Text>
          </View>
          <Switch value={online} onValueChange={setOnline} />
        </View>
        <StatusBadge
          label={online ? 'Device online' : 'Zero-network mode'}
          tone={online ? 'good' : 'warn'}
        />
      </Card>

      <View style={styles.metrics}>
        <MetricCard label="Pending" value={`${pending}`} tone={pending ? 'warn' : 'good'} />
        <MetricCard label="Failed" value={`${failed}`} tone={failed ? 'bad' : 'neutral'} />
        <MetricCard
          label="Last sync"
          value={data?.device.lastSyncAt ? 'Done' : 'None'}
          tone={data?.device.lastSyncAt ? 'good' : 'neutral'}
        />
      </View>

      <Card>
        <Text style={styles.heading}>Backend API</Text>
        <Text style={styles.body}>{backendUrl}</Text>
        <Text style={styles.body}>Last sync: {formatTime(data?.device.lastSyncAt)}</Text>
        <Text style={styles.syncMessage}>{lastSyncMessage}</Text>
        <PrimaryButton label="Sync / reconcile events" onPress={syncNow} disabled={!online} />
        <PrimaryButton label="Purge acknowledged events" variant="secondary" onPress={purgeSynced} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  flex: {
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  syncMessage: {
    color: colors.text,
    marginTop: 10,
    lineHeight: 20,
    fontWeight: '700',
  },
});
