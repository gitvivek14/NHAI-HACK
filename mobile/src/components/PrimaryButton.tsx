import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {colors} from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[variant], disabled ? styles.disabled : null]}>
      {disabled ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.label, variant === 'secondary' ? styles.darkLabel : null]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primary: {
    backgroundColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.panelAlt,
    borderWidth: 1,
    borderColor: colors.line,
  },
  danger: {
    backgroundColor: colors.red,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  darkLabel: {
    color: colors.text,
  },
});
