// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { Button, Input, ErrorBanner, Divider, StepIndicator } from '../../components/UI';

const FREE_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
  'yahoo.co.uk', 'hotmail.co.uk', 'ymail.com',
];

function formatOrgName(domain) {
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getEmailMeta(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { isFree: true, domain: '', orgName: '' };
  const isFree = FREE_PROVIDERS.includes(domain);
  return { isFree, domain, orgName: isFree ? '' : formatOrgName(domain) };
}

const ORG_SIZES = ['1–5', '6–20', '21–50', '51–100', '100+'];

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    orgName: '', orgSize: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailMeta, setEmailMeta] = useState(null);

  const handleChange = (field, value) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Password strength — same logic as web
  const passwordStrength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['', colors.error, colors.warning, colors.success][passwordStrength];
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];

  const handleStep1 = () => {
    if (!form.fullName || !form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    const meta = getEmailMeta(form.email);
    setEmailMeta(meta);
    if (!meta.isFree) {
      setForm(prev => ({ ...prev, orgName: meta.orgName }));
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.orgName || !form.orgSize) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    // Supabase auth will go here
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Onboarding');
    }, 1000);
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
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.navText}>
                Have an account?{' '}
                <Text style={styles.navLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.main}>

            {/* Step indicator — matches web exactly */}
            <StepIndicator
              steps={['Your account', 'Your workspace']}
              current={step}
            />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {step === 1 ? 'Create your account.' : 'Set up your workspace.'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? 'Free to start. No credit card required.'
                  : 'Almost there — tell us about your organisation.'}
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <>
                <ErrorBanner message={error} />
                <View style={{ height: spacing.lg }} />
              </>
            ) : null}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <View style={styles.form}>

                <Input
                  label="Full name"
                  placeholder="Jane Smith"
                  value={form.fullName}
                  onChangeText={v => handleChange('fullName', v)}
                  autoComplete="name"
                  autoCapitalize="words"
                />

                <View style={{ height: spacing.lg }} />

                <Input
                  label="Work email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChangeText={v => handleChange('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  hint="Personal emails work too — you'll set up your org name in the next step."
                />

                <View style={{ height: spacing.lg }} />

                {/* Password with strength bar */}
                <View>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={colors.placeholder}
                      secureTextEntry={!showPassword}
                      value={form.password}
                      onChangeText={v => handleChange('password', v)}
                      autoComplete="new-password"
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

                  {/* Strength bar */}
                  {form.password.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3].map(i => (
                          <View
                            key={i}
                            style={[
                              styles.strengthBar,
                              { backgroundColor: passwordStrength >= i ? strengthColor : colors.borderLight },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                        {strengthLabel}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ height: spacing.xl }} />

                <Button label="Continue →" onPress={handleStep1} variant="primary" />

                <View style={{ marginVertical: spacing.xxl }}>
                  <Divider label="or" />
                </View>

                <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>

              </View>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <View style={styles.form}>

                {/* Domain detection banner */}
                {emailMeta && (
                  <View style={[
                    styles.detectionBanner,
                    { backgroundColor: emailMeta.isFree ? '#FFFBEB' : colors.brandLight,
                      borderColor: emailMeta.isFree ? '#FDE68A' : colors.brandBorder },
                  ]}>
                    <Text style={styles.detectionIcon}>
                      {emailMeta.isFree ? '💡' : '✅'}
                    </Text>
                    <Text style={[
                      styles.detectionText,
                      { color: emailMeta.isFree ? colors.warning : colors.brand },
                    ]}>
                      {emailMeta.isFree
                        ? "Looks like a personal email — no problem. Just enter your organisation name below."
                        : `We detected your domain (${emailMeta.domain}). We've pre-filled your organisation name.`}
                    </Text>
                  </View>
                )}

                <View style={{ height: spacing.lg }} />

                <Input
                  label="Organisation name"
                  placeholder="Acme Corp"
                  value={form.orgName}
                  onChangeText={v => handleChange('orgName', v)}
                  hint="This becomes your workspace name. You can change it later."
                />

                <View style={{ height: spacing.lg }} />

                {/* Team size selector */}
                <View>
                  <Text style={styles.label}>Team size</Text>
                  <View style={styles.sizeGrid}>
                    {ORG_SIZES.map(size => (
                      <TouchableOpacity
                        key={size}
                        onPress={() => { setError(''); handleChange('orgSize', size); }}
                        style={[
                          styles.sizeBtn,
                          form.orgSize === size && styles.sizeBtnActive,
                        ]}
                      >
                        <Text style={[
                          styles.sizeBtnText,
                          form.orgSize === size && styles.sizeBtnTextActive,
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ height: spacing.lg }} />

                {/* What happens next card */}
                <View style={styles.nextCard}>
                  <Text style={styles.nextCardTitle}>What happens next</Text>
                  {[
                    'Your private workspace is created instantly',
                    "You'll get an invite link to share with your team",
                    'Your team joins with their work email — no app download needed',
                  ].map((item, i) => (
                    <View key={i} style={styles.nextCardRow}>
                      <Text style={styles.nextCardCheck}>✓</Text>
                      <Text style={styles.nextCardText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: spacing.xl }} />

                {/* Back + Submit row */}
                <View style={styles.stepBtns}>
                  <Button
                    label="← Back"
                    onPress={() => { setStep(1); setError(''); setEmailMeta(null); }}
                    variant="outline"
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={loading ? 'Creating workspace...' : 'Create workspace →'}
                    onPress={handleSubmit}
                    loading={loading}
                    variant="primary"
                    style={{ flex: 2 }}
                  />
                </View>

              </View>
            )}

            {/* Footer */}
            <Text style={styles.footer}>
              By signing up you agree to our{' '}
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
  form: {
    width: '100%',
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

  // Label
  label: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.body,
    marginBottom: 6,
  },

  // Password
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

  // Strength bar
  strengthContainer: {
    marginTop: spacing.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
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

  // Domain detection banner
  detectionBanner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detectionIcon: {
    fontSize: 16,
  },
  detectionText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: typography.medium,
    lineHeight: 20,
  },

  // Team size
  sizeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sizeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  sizeBtnText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.muted,
  },
  sizeBtnTextActive: {
    color: colors.brand,
  },

  // What happens next card
  nextCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  nextCardTitle: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.body,
    marginBottom: spacing.sm,
  },
  nextCardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nextCardCheck: {
    color: colors.brand,
    fontWeight: typography.black,
    fontSize: typography.xs,
    marginTop: 1,
  },
  nextCardText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.muted,
    lineHeight: 18,
  },

  // Step buttons row
  stepBtns: {
    flexDirection: 'row',
    gap: spacing.md,
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