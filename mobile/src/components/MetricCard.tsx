import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';

export function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue';
}) {
  return (
    <View style={[styles.metric, styles[tone]]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    flex: 1,
    minWidth: 130,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  neutral: {},
  good: {
    borderColor: '#98cfb8',
    backgroundColor: '#eef9f4',
  },
  warn: {
    borderColor: '#e1c28e',
    backgroundColor: '#fff7e8',
  },
  blue: {
    borderColor: '#9bbfe0',
    backgroundColor: '#edf6ff',
  },
  bad: {
    borderColor: '#e0a5a5',
    backgroundColor: '#fff0f0',
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
