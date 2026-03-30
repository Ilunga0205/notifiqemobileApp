// src/screens/auth/RegisterScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { Button, Input, ErrorBanner, Divider, StepIndicator } from '../../components/UI';
import { register, parseAuthError } from '../../services/auth.service';
import { useApp } from '../../context/AppContext';

const FREE_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
  'yahoo.co.uk', 'hotmail.co.uk', 'ymail.com',
];

function getEmailMeta(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { isFree: true, domain: '', orgName: '' };
  const isFree = FREE_PROVIDERS.includes(domain);
  const name   = isFree ? '' : domain.split('.')[0];
  const orgName = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  return { isFree, domain, orgName };
}

const ORG_SIZES = ['1–5', '6–20', '21–50', '51–100', '100+'];

export default function RegisterScreen({ navigation, completeOnboarding }) {
  const { load, setRegistering } = useApp();
  const [step,         setStep]         = useState(1);
  const [form,         setForm]         = useState({ fullName: '', email: '', password: '', orgName: '', orgSize: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [emailMeta,    setEmailMeta]    = useState(null);
  const submitting = useRef(false);

  const passwordStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor    = ['', colors.error, colors.warning, colors.success][passwordStrength];
  const strengthLabel    = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];

  const handleChange = (field, value) => {
    setError('');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStep1 = () => {
    if (!form.fullName || !form.email || !form.password) { setError('Please fill in all fields.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    const meta = getEmailMeta(form.email);
    setEmailMeta(meta);
    if (!meta.isFree) setForm(prev => ({ ...prev, orgName: meta.orgName }));
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.orgName || !form.orgSize) { setError('Please fill in all fields.'); return; }
    if (submitting.current) return;
    submitting.current = true;
    setRegistering(true); // 🔒 block App.js from reacting to SIGNED_IN

    setLoading(true);
    setError('');

    try {
      const result = await register({
        fullName: form.fullName,
        email:    form.email,
        password: form.password,
        orgName:  form.orgName,
        orgSize:  form.orgSize,
      });

      if (result?.user?.id) {
        await load(result.user.id);
      }

      navigation.replace('Onboarding');

    } catch (err) {
      console.warn('Register error:', err.message);
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
      submitting.current = false;
      setRegistering(false); // 🔓 unblock
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.nav}>
            <Text style={styles.logo}>notifi<Text style={styles.logoAccent}>qe</Text></Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.navText}>Have an account? <Text style={styles.navLink}>Sign in</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.main}>
            <StepIndicator steps={['Your account', 'Your workspace']} current={step} />

            <View style={styles.header}>
              <Text style={styles.title}>{step === 1 ? 'Create your account.' : 'Set up your workspace.'}</Text>
              <Text style={styles.subtitle}>{step === 1 ? 'Free to start. No credit card required.' : 'Almost there — tell us about your organisation.'}</Text>
            </View>

            {error ? (<><ErrorBanner message={error} /><View style={{ height: spacing.lg }} /></>) : null}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <View style={styles.form}>
                <Input label="Full name" placeholder="Jane Smith" value={form.fullName} onChangeText={v => handleChange('fullName', v)} autoComplete="name" autoCapitalize="words" />
                <View style={{ height: spacing.lg }} />
                <Input label="Work email" placeholder="you@company.com" value={form.email} onChangeText={v => handleChange('email', v)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" hint="Personal emails work too — you'll set up your org name in the next step." />
                <View style={{ height: spacing.lg }} />
                <View>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput style={styles.input} placeholder="Min. 8 characters" placeholderTextColor={colors.placeholder} secureTextEntry={!showPassword} value={form.password} onChangeText={v => handleChange('password', v)} autoComplete="new-password" />
                    <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(p => !p)}>
                      <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                  {form.password.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3].map(i => (
                          <View key={i} style={[styles.strengthBar, { backgroundColor: passwordStrength >= i ? strengthColor : colors.borderLight }]} />
                        ))}
                      </View>
                      <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                    </View>
                  )}
                </View>
                <View style={{ height: spacing.xl }} />
                <Button label="Continue →" onPress={handleStep1} variant="primary" />
                <View style={{ marginVertical: spacing.xxl }}><Divider label="or" /></View>
                <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <View style={styles.form}>
                {emailMeta && (
                  <View style={[styles.detectionBanner, { backgroundColor: emailMeta.isFree ? '#FFFBEB' : colors.brandLight, borderColor: emailMeta.isFree ? '#FDE68A' : colors.brandBorder }]}>
                    <Text style={styles.detectionIcon}>{emailMeta.isFree ? '💡' : '✅'}</Text>
                    <Text style={[styles.detectionText, { color: emailMeta.isFree ? colors.warning : colors.brand }]}>
                      {emailMeta.isFree ? "Looks like a personal email — no problem. Just enter your organisation name below." : `We detected your domain (${emailMeta.domain}). We've pre-filled your organisation name.`}
                    </Text>
                  </View>
                )}
                <View style={{ height: spacing.lg }} />
                <Input label="Organisation name" placeholder="Acme Corp" value={form.orgName} onChangeText={v => handleChange('orgName', v)} hint="This becomes your workspace name. You can change it later." />
                <View style={{ height: spacing.lg }} />
                <View>
                  <Text style={styles.label}>Team size</Text>
                  <View style={styles.sizeGrid}>
                    {ORG_SIZES.map(size => (
                      <TouchableOpacity key={size} onPress={() => { setError(''); handleChange('orgSize', size); }} style={[styles.sizeBtn, form.orgSize === size && styles.sizeBtnActive]}>
                        <Text style={[styles.sizeBtnText, form.orgSize === size && styles.sizeBtnTextActive]}>{size}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ height: spacing.lg }} />
                <View style={styles.nextCard}>
                  <Text style={styles.nextCardTitle}>What happens next</Text>
                  {['Your private workspace is created instantly', "You'll get an invite link to share with your team", 'Your team joins with their work email — no app download needed'].map((item, i) => (
                    <View key={i} style={styles.nextCardRow}>
                      <Text style={styles.nextCardCheck}>✓</Text>
                      <Text style={styles.nextCardText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ height: spacing.xl }} />
                <View style={styles.stepBtns}>
                  <Button label="← Back" onPress={() => { setStep(1); setError(''); setEmailMeta(null); }} variant="outline" style={{ flex: 1 }} />
                  <TouchableOpacity
                    style={[styles.submitBtn, (loading || !form.orgName || !form.orgSize) && styles.submitBtnDisabled, { flex: 2 }]}
                    onPress={handleSubmit}
                    disabled={loading || !form.orgName || !form.orgSize}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>{loading ? 'Creating workspace...' : 'Create workspace →'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.footer}>
              By signing up you agree to our <Text style={styles.footerLink}>Terms</Text>{' '}and <Text style={styles.footerLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.white },
  scroll:             { flexGrow: 1 },
  nav:                { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  logo:               { fontSize: typography.xl, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  logoAccent:         { color: colors.brand },
  navText:            { fontSize: typography.base, color: colors.muted },
  navLink:            { color: colors.brand, fontWeight: typography.semibold },
  main:               { flex: 1, paddingHorizontal: spacing.page, paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl, maxWidth: 420, width: '100%', alignSelf: 'center' },
  form:               { width: '100%' },
  header:             { marginBottom: spacing.xxxl },
  title:              { fontSize: typography.h1, fontWeight: typography.black, letterSpacing: -1, color: colors.black, marginBottom: spacing.sm },
  subtitle:           { fontSize: typography.md, color: colors.muted, lineHeight: 24 },
  label:              { fontSize: typography.sm, fontWeight: typography.semibold, color: colors.body, marginBottom: 6 },
  passwordWrapper:    { position: 'relative' },
  input:              { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingRight: 64, fontSize: typography.base, color: colors.black, backgroundColor: colors.white },
  showBtn:            { position: 'absolute', right: spacing.md, top: 0, bottom: 0, justifyContent: 'center' },
  showBtnText:        { fontSize: typography.sm, color: colors.subtle, fontWeight: typography.medium },
  strengthContainer:  { marginTop: spacing.sm },
  strengthBars:       { flexDirection: 'row', gap: 4, marginBottom: 4 },
  strengthBar:        { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel:      { fontSize: typography.xs, fontWeight: typography.bold },
  googleBtn:          { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.white },
  googleIcon:         { fontSize: typography.lg, fontWeight: typography.bold, color: '#4285F4' },
  googleText:         { fontSize: typography.base, fontWeight: typography.semibold, color: colors.body },
  detectionBanner:    { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detectionIcon:      { fontSize: 16 },
  detectionText:      { flex: 1, fontSize: typography.sm, fontWeight: typography.medium, lineHeight: 20 },
  sizeGrid:           { flexDirection: 'row', gap: spacing.sm },
  sizeBtn:            { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  sizeBtnActive:      { borderColor: colors.brand, backgroundColor: colors.brandLight },
  sizeBtnText:        { fontSize: typography.xs, fontWeight: typography.semibold, color: colors.muted },
  sizeBtnTextActive:  { color: colors.brand },
  nextCard:           { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.lg },
  nextCardTitle:      { fontSize: typography.xs, fontWeight: typography.bold, color: colors.body, marginBottom: spacing.sm },
  nextCardRow:        { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: 6 },
  nextCardCheck:      { color: colors.brand, fontWeight: typography.black, fontSize: typography.xs, marginTop: 1 },
  nextCardText:       { flex: 1, fontSize: typography.xs, color: colors.muted, lineHeight: 18 },
  stepBtns:           { flexDirection: 'row', gap: spacing.md },
  submitBtn:          { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled:  { backgroundColor: colors.border },
  submitBtnText:      { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  footer:             { textAlign: 'center', fontSize: typography.xs, color: colors.placeholder, marginTop: spacing.xxl, lineHeight: 20 },
  footerLink:         { color: colors.muted, textDecorationLine: 'underline' },
});