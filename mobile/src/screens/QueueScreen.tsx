import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Card} from '../components/Card';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useFieldAuth} from '../context/FieldAuthContext';
import {colors} from '../theme';
import {formatTime} from '../utils/ids';

export function QueueScreen() {
  const {data, online, syncNow, purgeSynced, lastSyncMessage} = useFieldAuth();

  return (
    <View>
      <Card>
        <Text style={styles.heading}>Offline attendance queue</Text>
        <Text style={styles.body}>
          Events stay local while offline. When online, the sync API accepts
          events from any device and returns server event IDs.
        </Text>
        <Text style={styles.syncMessage}>{lastSyncMessage}</Text>
        <PrimaryButton label="Sync now" onPress={syncNow} disabled={!online} />
        <PrimaryButton
          label="Purge synced events"
          variant="secondary"
          onPress={purgeSynced}
        />
      </Card>

      {data?.events.length ? (
        data.events.map(event => (
          <Card key={event.id}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.eventName}>{event.workerName}</Text>
                <Text style={styles.body}>{event.personnelId}</Text>
              </View>
              <StatusBadge
                label={event.syncStatus.toUpperCase()}
                tone={
                  event.syncStatus === 'synced'
                    ? 'good'
                    : event.syncStatus === 'failed'
                      ? 'bad'
                      : 'warn'
                }
              />
            </View>
            <Text style={styles.body}>Verified: {formatTime(event.verifiedAt)}</Text>
            <Text style={styles.body}>
              Device {event.deviceId} | Similarity {event.similarity.toFixed(2)} |
              Latency {event.latencyMs} ms
            </Text>
            {event.serverEventId ? (
              <Text style={styles.body}>Server ID: {event.serverEventId}</Text>
            ) : null}
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.body}>No attendance events in local storage.</Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  flex: {
    flex: 1,
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
  eventName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
