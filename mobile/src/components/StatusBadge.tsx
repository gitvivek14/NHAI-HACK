import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {colors} from '../theme';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue';
}) {
  return <Text style={[styles.badge, styles[tone]]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800',
  },
  neutral: {
    color: colors.text,
    backgroundColor: colors.panelAlt,
  },
  good: {
    color: colors.green,
    backgroundColor: '#e9f8f1',
  },
  warn: {
    color: colors.amber,
    backgroundColor: '#fff3dd',
  },
  bad: {
    color: colors.red,
    backgroundColor: '#ffeded',
  },
  blue: {
    color: colors.blue,
    backgroundColor: '#e8f2fb',
  },
});
