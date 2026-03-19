// src/components/UI.js
// Notifiqe reusable components — mobile equivalents of your web classes
// btn, input, label etc — same naming as your web code

import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../lib/tokens';

// ─── BUTTON ───────────────────────────────────────────────────────
// Matches: className="btn btn-blue" and "btn btn-outline"
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnOutline,
        (disabled || loading) && styles.btnDisabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={isPrimary ? colors.white : colors.brand} />
        : <Text style={[styles.btnText, !isPrimary && styles.btnOutlineText]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────
// Matches: className="input"
export function Input({ label, hint, error, style, ...props }) {
  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.placeholder}
        {...props}
      />
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.errorText}>⚠ {error}</Text>}
    </View>
  );
}

// ─── ERROR BANNER ─────────────────────────────────────────────────
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>⚠ {message}</Text>
    </View>
  );
}

// ─── DIVIDER WITH LABEL ───────────────────────────────────────────
export function Divider({ label = 'or' }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────
// Matches your 2-step progress dots from register page
export function StepIndicator({ steps, current }) {
  return (
    <View style={styles.stepRow}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = current > stepNum;
        const isActive = current === stepNum;
        return (
          <React.Fragment key={stepNum}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                (isActive || isDone) && styles.stepCircleActive,
              ]}>
                <Text style={[styles.stepNum, (isActive || isDone) && styles.stepNumActive]}>
                  {isDone ? '✓' : stepNum}
                </Text>
              </View>
              <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.stepConnector, isDone && styles.stepConnectorActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  btn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  btnPrimary: {
    backgroundColor: colors.brand,
  },
  btnOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    letterSpacing: 0.1,
  },
  btnOutlineText: {
    color: colors.body,
  },

  // Input
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.body,
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.base,
    color: colors.black,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.subtle,
    marginTop: 4,
  },
  errorText: {
    fontSize: typography.xs,
    color: colors.error,
    fontWeight: typography.medium,
    marginTop: 4,
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: typography.base,
    color: colors.error,
    fontWeight: typography.medium,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerLabel: {
    fontSize: typography.xs,
    color: colors.placeholder,
    fontWeight: typography.medium,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.sm,
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.brand,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: typography.bold,
    color: colors.subtle,
  },
  stepNumActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.subtle,
  },
  stepLabelActive: {
    color: colors.black,
  },
  stepConnector: {
    width: 32,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepConnectorActive: {
    backgroundColor: colors.brand,
  },
});