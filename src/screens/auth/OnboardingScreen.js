// src/screens/auth/OnboardingScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet,  Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, typography, spacing, radius, shadows, POST_TYPES } from '../../lib/tokens';
import { Button, StepIndicator, Divider } from '../../components/UI';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markOnboardingDone } from '../../services/auth.service';

export default function OnboardingScreen({ navigation, completeOnboarding }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [postTypes, setPostTypes] = useState(
    POST_TYPES.map(pt => ({ ...pt, enabled: true }))
  );
  const [inviteInput, setInviteInput] = useState('');
  const [invitesSent, setInvitesSent] = useState([]);
  const [inviteError, setInviteError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [orgSlug,   setOrgSlug]   = useState('');
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const fullName = user.user_metadata?.full_name || '';
      setFirstName(fullName.split(' ')[0]);

      const { data: membership } = await supabase
        .from('memberships')
        .select('organisations(slug, invite_token)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (membership?.organisations) {
        const slug  = membership.organisations.slug;
        const token = membership.organisations.invite_token || 'abc123';
        setOrgSlug(slug);
        setInviteLink(`https://app.notifiqe.com/join/${slug}/${token}`);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const handleFinish = async () => {
    await markOnboardingDone();
    if (completeOnboarding) await completeOnboarding();
  };

  const handleCopy = () => {
    Clipboard.setString(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Join my team on Notifiqe: ${inviteLink}`, url: inviteLink });
    } catch (e) {}
  };

  const addInvite = () => {
    const val = inviteInput.trim();
    if (!val) return;
    if (!val.includes('@')) { setInviteError('Enter a valid email address.'); return; }
    if (invitesSent.includes(val)) { setInviteError('Already added.'); return; }
    setInvitesSent(p => [...p, val]);
    setInviteInput('');
    setInviteError('');
  };

  const removeInvite = (email) => setInvitesSent(p => p.filter(e => e !== email));

  const togglePostType = (index) => {
    setPostTypes(prev => prev.map((pt, i) => i === index ? { ...pt, enabled: !pt.enabled } : pt));
  };


  if (loading) return <SafeAreaView style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <Text style={styles.logo}>notifi<Text style={styles.logoAccent}>qe</Text></Text>
        <TouchableOpacity onPress={handleFinish}>
          <Text style={styles.skipAll}>Skip all →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.main}>
          <StepIndicator steps={['Invite your team', 'Customize workspace']} current={step} />

          {step === 1 && (
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>{firstName ? `Welcome, ${firstName}.` : 'Welcome.'}</Text>
                <Text style={styles.subtitle}>Your workspace is ready. Start by inviting your team — they join in seconds, no app download needed.</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.labelCaps}>Add by email</Text>
                <View style={styles.emailRow}>
                  <TextInput
                    style={[styles.emailInput, inviteError ? styles.emailInputError : null]}
                    placeholder="colleague@company.com"
                    placeholderTextColor={colors.placeholder}
                    value={inviteInput}
                    onChangeText={v => { setInviteInput(v); setInviteError(''); }}
                    onSubmitEditing={addInvite}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={addInvite} activeOpacity={0.85}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {inviteError ? <Text style={styles.inviteError}>{inviteError}</Text> : null}
              </View>

              {invitesSent.length > 0 && (
                <View style={styles.inviteList}>
                  {invitesSent.map(email => (
                    <View key={email} style={styles.inviteChip}>
                      <View style={styles.inviteAvatar}>
                        <Text style={styles.inviteAvatarText}>{email[0].toUpperCase()}</Text>
                      </View>
                      <Text style={styles.inviteEmail} numberOfLines={1}>{email}</Text>
                      <TouchableOpacity onPress={() => removeInvite(email)}>
                        <Text style={styles.inviteRemove}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.dividerSection}>
                <Divider label="or share a link" />
              </View>

              <View style={styles.section}>
                <View style={styles.linkRow}>
                  <View style={styles.linkBox}>
                    <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
                  </View>
                  <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={handleCopy} activeOpacity={0.85}>
                    <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>{copied ? '✓ Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <Text style={styles.shareBtnText}>Share invite link</Text>
              </TouchableOpacity>

              <View style={styles.infoBanner}>
                
                <Text style={styles.infoBannerText}>Anyone with this link can join your workspace. You can disable or regenerate it anytime from workspace settings.</Text>
              </View>

              <View style={styles.btnRow}>
                <Button label="Next: Customize workspace →" onPress={() => setStep(2)} variant="primary" style={{ flex: 2 }} />
                <Button label="Skip" onPress={() => setStep(2)} variant="outline" style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <View style={styles.header}>
                <Text style={styles.title}>Customize your workspace.</Text>
                <Text style={styles.subtitle}>Choose which post types your team can use. You can change these later.</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.labelCaps}>Active post types</Text>
                <Text style={styles.sublabel}>Disable post types your team won't use to keep the feed focused.</Text>
                <View style={styles.postTypeList}>
                  {postTypes.map((pt, i) => (
                    <TouchableOpacity key={pt.id} onPress={() => togglePostType(i)} activeOpacity={0.8}
                      style={[styles.postTypeRow, !pt.enabled && styles.postTypeRowDisabled]}>
                      <Text style={styles.postTypeIcon}>{pt.icon}</Text>
                      <View style={styles.postTypeInfo}>
                        <Text style={[styles.postTypeLabel, !pt.enabled && styles.postTypeLabelDisabled]}>{pt.label}</Text>
                        <Text style={styles.postTypeDesc}>{getPostDesc(pt.id)}</Text>
                      </View>
                      <View style={[styles.toggle, pt.enabled && styles.toggleOn]}>
                        <View style={[styles.toggleThumb, pt.enabled && styles.toggleThumbOn]} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.btnRow}>
                <Button label="← Back" onPress={() => setStep(1)} variant="outline" style={{ flex: 1 }} />
                <Button label="Go to my feed →" onPress={handleFinish} variant="primary" style={{ flex: 2 }} />
              </View>

              <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip and go to feed</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getPostDesc(id) {
  const descs = {
    announcement: 'Important updates for the whole team',
    leave:        'Out of office and absence updates',
    project:      'Progress on client or internal projects',
    question:     'Fast questions that need a quick answer',
    win:          'Celebrate achievements and milestones',
    general:      'Anything else worth sharing',
  };
  return descs[id] || '';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  nav: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  logo: { fontSize: typography.xl, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  logoAccent: { color: colors.brand },
  skipAll: { fontSize: typography.base, color: colors.subtle, fontWeight: typography.medium },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxxl },
  main: { paddingHorizontal: spacing.page, paddingTop: spacing.xxxl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  header: { marginBottom: spacing.xxxl },
  title: { fontSize: typography.h1, fontWeight: typography.black, letterSpacing: -1, color: colors.black, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.md, color: colors.muted, lineHeight: 24 },
  section: { marginBottom: spacing.lg },
  labelCaps: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  sublabel: { fontSize: typography.sm, color: colors.subtle, marginBottom: spacing.md, lineHeight: 20 },
  emailRow: { flexDirection: 'row', gap: spacing.sm },
  emailInput: { flex: 1, height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.base, color: colors.black, backgroundColor: colors.white },
  emailInputError: { borderColor: colors.error },
  addBtn: { height: 46, backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: colors.white, fontSize: typography.base, fontWeight: typography.semibold },
  inviteError: { fontSize: typography.xs, color: colors.error, marginTop: 4 },
  inviteList: { gap: spacing.sm, marginBottom: spacing.lg },
  inviteChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md },
  inviteAvatar: { width: 26, height: 26, borderRadius: radius.full, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  inviteAvatarText: { fontSize: 11, fontWeight: typography.black, color: colors.brand },
  inviteEmail: { flex: 1, fontSize: typography.sm, color: colors.body },
  inviteRemove: { fontSize: 18, color: colors.placeholder, lineHeight: 20 },
  dividerSection: { marginBottom: spacing.lg },
  linkRow: { flexDirection: 'row', gap: spacing.sm },
  linkBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 46, justifyContent: 'center' },
  linkText: { fontSize: typography.sm, color: colors.muted },
  copyBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 46, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  copyBtnDone: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0' },
  copyBtnText: { fontSize: typography.sm, fontWeight: typography.semibold, color: colors.white },
  copyBtnTextDone: { color: colors.success },
  shareBtn: { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, backgroundColor: colors.white },
  shareBtnText: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.body },
  infoBanner: { backgroundColor: colors.brandLight, borderWidth: 1, borderColor: colors.brandBorder, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xxl },
  
  infoBannerText: { flex: 1, fontSize: typography.sm, color: colors.brand, lineHeight: 20 },
  postTypeList: { gap: spacing.sm },
  postTypeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...shadows.sm },
  postTypeRowDisabled: { opacity: 0.45, backgroundColor: colors.surface, borderColor: colors.borderLight },
  postTypeIcon: { fontSize: 22 },
  postTypeInfo: { flex: 1 },
  postTypeLabel: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.black, marginBottom: 2 },
  postTypeLabelDisabled: { color: colors.muted },
  postTypeDesc: { fontSize: typography.xs, color: colors.subtle, lineHeight: 16 },
  toggle: { width: 36, height: 20, borderRadius: radius.full, backgroundColor: colors.border, justifyContent: 'center', padding: 2 },
  toggleOn: { backgroundColor: colors.brand },
  toggleThumb: { width: 16, height: 16, borderRadius: radius.full, backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md },
  skipBtnText: { fontSize: typography.sm, color: colors.subtle, fontWeight: typography.medium },
});