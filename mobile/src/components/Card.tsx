import React, {PropsWithChildren} from 'react';
import {StyleSheet, View} from 'react-native';
import {colors, shadows} from '../theme';

export function Card({children}: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 10,
    ...shadows.card,
  },
});
