// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { Button, Input, ErrorBanner, Divider } from '../../components/UI';

export default function LoginScreen({ navigation }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    // Supabase auth will go here
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Logo nav ── */}
          <View style={styles.nav}>
            <Text style={styles.logo}>
              notifi<Text style={styles.logoAccent}>qe</Text>
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.navText}>
                No account?{' '}
                <Text style={styles.navLink}>Sign up free</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Main card ── */}
          <View style={styles.main}>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome back.</Text>
              <Text style={styles.subtitle}>
                Sign in to your workspace and catch up with your team.
              </Text>
            </View>

            {/* Error */}
            <ErrorBanner message={error} />
            {error ? <View style={{ height: spacing.lg }} /> : null}

            {/* Email */}
            <Input
              label="Work email"
              placeholder="you@company.com"
              value={form.email}
              onChangeText={v => handleChange('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error && !form.email ? ' ' : ''}
            />

            <View style={{ height: spacing.lg }} />

            {/* Password */}
            <View>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, error && !form.password && styles.inputError]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={v => handleChange('password', v)}
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => setShowPassword(p => !p)}
                >
                  <Text style={styles.showBtnText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: spacing.xl }} />

            {/* Submit */}
            <Button
              label={loading ? 'Signing in...' : 'Sign in →'}
              onPress={handleSubmit}
              loading={loading}
              variant="primary"
            />

            {/* Divider */}
            <View style={{ marginVertical: spacing.xxl }}>
              <Divider label="or" />
            </View>

            {/* Google SSO */}
            <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text style={styles.footer}>
              By signing in you agree to our{' '}
              <Text style={styles.footerLink}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>.
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flexGrow: 1,
  },

  // Nav
  nav: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logo: {
    fontSize: typography.xl,
    fontWeight: typography.black,
    letterSpacing: -0.5,
    color: colors.black,
  },
  logoAccent: {
    color: colors.brand,
  },
  navText: {
    fontSize: typography.base,
    color: colors.muted,
  },
  navLink: {
    color: colors.brand,
    fontWeight: typography.semibold,
  },

  // Main
  main: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.black,
    letterSpacing: -1,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.muted,
    lineHeight: 24,
  },

  // Password field
  label: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.body,
    marginBottom: 4,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: typography.sm,
    color: colors.brand,
    fontWeight: typography.medium,
  },
  passwordWrapper: {
    position: 'relative',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingRight: 64,
    fontSize: typography.base,
    color: colors.black,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  showBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  showBtnText: {
    fontSize: typography.sm,
    color: colors.subtle,
    fontWeight: typography.medium,
  },

  // Google
  googleBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  googleIcon: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: '#4285F4',
  },
  googleText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.body,
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: typography.xs,
    color: colors.placeholder,
    marginTop: spacing.xxl,
    lineHeight: 20,
  },
  footerLink: {
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});