// src/screens/app/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Pressable,
  Platform, StatusBar, Alert,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── DATA ──────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#1D4ED8','#065F46','#5B21B6','#9D174D','#92400E','#0369A1','#374151','#7C3AED'];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ initials, size = 72, color }) {
  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color ? color + '18' : '#EFF6FF',
      borderColor: color ? color + '35' : '#BFDBFE',
    }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33, color: color || colors.brand }]}>
        {initials}
      </Text>
    </View>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function Toast({ message }) {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastCheck}>✓</Text>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.confirmOverlay} onPress={onClose}>
        <Pressable style={styles.confirmBox} onPress={e => e.stopPropagation()}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmBody}>{body}</Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity style={styles.confirmCancel} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmAction, { backgroundColor: danger ? '#DC2626' : colors.brand }]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmActionText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── FIELD ─────────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [userId,       setUserId]       = useState(null);
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [role,         setRole]         = useState('member');
  const [orgName,      setOrgName]      = useState('');
  const [avatarColor,  setAvatarColor]  = useState('#1D4ED8');
  const [nameEdit,     setNameEdit]     = useState(false);
  const [nameDraft,    setNameDraft]    = useState('');
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [pwError,      setPwError]      = useState('');
  const [pwSaving,     setPwSaving]     = useState(false);
  const [toast,        setToast]        = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ── Load profile — cache first, then refresh from Supabase ──
  useEffect(() => {
    const load = async () => {
      // 1. Load from cache instantly (no flash)
      const cached = await AsyncStorage.getItem('notifiqe_profile');
      if (cached) {
        const p = JSON.parse(cached);
        setUserId(p.userId);
        setName(p.name);
        setEmail(p.email);
        setAvatarColor(p.avatarColor);
        setRole(p.role);
        setOrgName(p.orgName);
        setLoading(false); // show immediately from cache
      }

      // 2. Refresh from Supabase in background
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_color, avatar_initials')
        .eq('id', user.id)
        .single();

      const { data: membership } = await supabase
        .from('memberships')
        .select('role, organisations(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      const freshData = {
        userId:      user.id,
        name:        profile?.full_name || user.user_metadata?.full_name || '',
        email:       profile?.email || user.email || '',
        avatarColor: profile?.avatar_color || '#1D4ED8',
        role:        membership?.role || 'member',
        orgName:     membership?.organisations?.name || '',
      };

      // Update UI with fresh data
      setUserId(freshData.userId);
      setName(freshData.name);
      setEmail(freshData.email);
      setAvatarColor(freshData.avatarColor);
      setRole(freshData.role);
      setOrgName(freshData.orgName);
      setLoading(false);

      // Save to cache for next time
      await AsyncStorage.setItem('notifiqe_profile', JSON.stringify(freshData));
    };
    load();
  }, []);

  // ── Save name ──
  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setSaving(true);
    const initials = trimmed.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    await supabase.from('profiles').update({ full_name: trimmed, avatar_initials: initials }).eq('id', userId);
    setName(trimmed);
    setNameEdit(false);
    setSaving(false);
    // Update cache
    const cached = await AsyncStorage.getItem('notifiqe_profile');
    if (cached) await AsyncStorage.setItem('notifiqe_profile', JSON.stringify({ ...JSON.parse(cached), name: trimmed }));
    showToast('Name updated');
  };

  // ── Save avatar colour ──
  const saveAvatarColor = async (color) => {
    setAvatarColor(color);
    await supabase.from('profiles').update({ avatar_color: color }).eq('id', userId);
    // Update cache
    const cached = await AsyncStorage.getItem('notifiqe_profile');
    if (cached) await AsyncStorage.setItem('notifiqe_profile', JSON.stringify({ ...JSON.parse(cached), avatarColor: color }));
    showToast('Avatar colour updated');
  };

  // ── Change password ──
  const changePassword = async () => {
    setPwError('');
    if (!currentPw)          { setPwError('Enter your current password.'); return; }
    if (newPw.length < 8)    { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    setPwSaving(true);

    // Re-authenticate first
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (signInError) { setPwError('Current password is incorrect.'); setPwSaving(false); return; }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    if (updateError) { setPwError(updateError.message); setPwSaving(false); return; }

    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setPwSaving(false);
    showToast('Password changed');
  };

  // ── Sign out ──
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setConfirmModal(null);
  };

  // ── Leave workspace ──
  const handleLeaveWorkspace = async () => {
    await supabase.from('memberships').update({ status: 'inactive' }).eq('user_id', userId);
    await supabase.auth.signOut();
    setConfirmModal(null);
  };

  const pwStrength = !newPw ? null : newPw.length < 6 ? 'weak' : newPw.length < 10 ? 'fair' : 'strong';
  const pwStrengthColor = { weak: '#DC2626', fair: '#F59E0B', strong: '#10B981' }[pwStrength];
  const pwStrengthWidth = { weak: '33%', fair: '66%', strong: '100%' }[pwStrength];

  if (loading) return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={{ backgroundColor: colors.white }}>
          <View style={styles.appHeader}>
            <View style={{ width: 36 }} />
            <View style={styles.appHeaderCenter}>
              <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <View style={{ width: 36 }} />
            <View style={styles.appHeaderCenter}>
              <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </View>
      )}
      <View style={styles.skeletonWrap}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: 140, marginTop: 6 }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={{ backgroundColor: colors.white }}>
          <View style={styles.appHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.appHeaderCenter}>
              <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
              <Text style={styles.appSep}>/</Text>
              <Text style={styles.appOrg}>{orgName}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.appHeaderCenter}>
              <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
              <Text style={styles.appSep}>/</Text>
              <Text style={styles.appOrg}>{orgName}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar hero ── */}
        <View style={styles.avatarHero}>
          <Avatar initials={getInitials(name)} size={72} color={avatarColor} />
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroEmail}>{email}</Text>

          {/* Color picker */}
          <View style={styles.colorPicker}>
            {AVATAR_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c, borderWidth: avatarColor === c ? 2.5 : 0, borderColor: '#111827' }]}
                onPress={() => saveAvatarColor(c)}
                activeOpacity={0.8}
              />
            ))}
          </View>
          <Text style={styles.colorHint}>Choose your avatar colour</Text>
        </View>

        {/* Workspace settings — visible above the fold */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsLinkCard}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsLinkCardText}>⚙  Workspace settings</Text>
          <Text style={styles.settingsLinkCardChevron}>›</Text>
        </TouchableOpacity>

        {/* ── Profile details ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>

          {/* Name */}
          <Field label="DISPLAY NAME">
            {nameEdit ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onSubmitEditing={saveName}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity style={[styles.editSave, saving && { opacity: 0.7 }]} onPress={saveName} disabled={saving} activeOpacity={0.85}>
                  <Text style={styles.editSaveText}>{saving ? '...' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editCancel} onPress={() => setNameEdit(false)} activeOpacity={0.8}>
                  <Text style={styles.editCancelText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.displayRow}>
                <Text style={styles.displayValue}>{name}</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => { setNameDraft(name); setNameEdit(true); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </Field>

          {/* Email — read only */}
          <Field label="EMAIL ADDRESS">
            <View style={styles.displayRow}>
              <Text style={styles.displayValue}>{email}</Text>
            </View>
          </Field>

          {/* Role */}
          <Field label="ROLE">
            <View style={styles.displayRow}>
              <Text style={styles.displayValue}>Admin</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            </View>
            <Text style={styles.roleHint}>Contact another admin to change your role.</Text>
          </Field>
        </View>

        {/* ── Change password ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change password</Text>

          <Field label="CURRENT PASSWORD">
            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Enter current password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={styles.pwToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.pwToggleText}>{showPw ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="NEW PASSWORD">
            <TextInput
              style={styles.input}
              value={newPw}
              onChangeText={setNewPw}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showPw}
            />
            {newPw ? (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: pwStrengthWidth, backgroundColor: pwStrengthColor }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: pwStrengthColor }]}>{pwStrength}</Text>
              </View>
            ) : null}
          </Field>

          <Field label="CONFIRM NEW PASSWORD">
            <TextInput
              style={[styles.input, confirmPw && confirmPw !== newPw && { borderColor: '#FECACA' }]}
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="Repeat new password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showPw}
            />
          </Field>

          {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}

          <TouchableOpacity
            style={[styles.updatePwBtn, (!currentPw || !newPw || !confirmPw) && styles.updatePwBtnDisabled]}
            onPress={changePassword}
            disabled={!currentPw || !newPw || !confirmPw || pwSaving}
            activeOpacity={0.85}
          >
            <Text style={[styles.updatePwBtnText, (!currentPw || !newPw || !confirmPw) && styles.updatePwBtnTextDisabled]}>
              {pwSaving ? 'Updating...' : 'Update password'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Account actions ── */}
        <View style={styles.card}>
          {/* Sign out */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setConfirmModal({
              title: 'Sign out?',
              body: "You can always sign back in.",
              confirmLabel: 'Sign out',
              danger: false,
              onConfirm: handleSignOut,
            })}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>→</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Sign out</Text>
              <Text style={styles.actionSub}>Sign out of this workspace</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {/* Leave workspace */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setConfirmModal({
              title: 'Leave workspace?',
              body: "You'll lose access to all posts and data. An admin will need to invite you back.",
              confirmLabel: 'Leave workspace',
              danger: true,
              onConfirm: handleLeaveWorkspace,
            })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.actionIconText, { color: '#DC2626' }]}>✕</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: '#DC2626' }]}>Leave workspace</Text>
              <Text style={styles.actionSub}>Remove yourself from this workspace</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Toast */}
      {toast && <Toast message={toast} />}

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          {...confirmModal}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerBlock: { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backBtn: { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: colors.brand, fontWeight: '300', lineHeight: 32 },
  appHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  appLogo: { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent: { color: colors.brand },
  appSep: { fontSize: 14, color: colors.border },
  appOrg: { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.page, paddingTop: spacing.lg },

  // Avatar hero
  avatarHero: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { fontWeight: typography.black },
  heroName: { fontSize: 18, fontWeight: typography.black, letterSpacing: -0.3, color: colors.black, marginBottom: 3 },
  heroEmail: { fontSize: 13, color: colors.subtle, marginBottom: spacing.md },
  colorPicker: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  colorDot: { width: 22, height: 22, borderRadius: 11 },
  colorHint: { fontSize: 11, color: colors.placeholder },

  // Card
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: 14, fontWeight: typography.bold, color: colors.black, marginBottom: spacing.md },

  // Field
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },

  // Display row
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  displayValue: { flex: 1, fontSize: 15, color: colors.black, fontWeight: typography.medium },
  editBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontSize: 12, fontWeight: typography.semibold, color: colors.muted },

  // Edit row
  editRow: { flexDirection: 'row', gap: spacing.sm },
  editInput: { flex: 1, borderWidth: 1, borderColor: colors.brand, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 14, color: colors.black, minHeight: 44 },
  editSave: { backgroundColor: colors.brand, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 8, justifyContent: 'center' },
  editSaveText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  editCancel: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  editCancelText: { fontSize: 13, color: colors.muted },

  // Role
  adminBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  adminBadgeText: { fontSize: 11, fontWeight: typography.bold, color: colors.brand },
  roleHint: { fontSize: 12, color: colors.subtle, marginTop: 5 },

  // Password
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black, minHeight: 44 },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, minHeight: 44 },
  pwInput: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black },
  pwToggle: { paddingHorizontal: spacing.md },
  pwToggleText: { fontSize: 12, fontWeight: typography.semibold, color: colors.brand },
  strengthWrap: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strengthTrack: { flex: 1, height: 3, backgroundColor: colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: typography.bold, textTransform: 'capitalize', width: 40 },
  pwError: { fontSize: 13, color: '#DC2626', marginBottom: spacing.sm },
  updatePwBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  updatePwBtnDisabled: { backgroundColor: colors.border },
  updatePwBtnText: { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  updatePwBtnTextDisabled: { color: colors.subtle },

  // Account actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  actionDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 2 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionIconText: { fontSize: 14, color: colors.muted, fontWeight: typography.bold },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: typography.semibold, color: colors.black },
  actionSub: { fontSize: 12, color: colors.subtle, marginTop: 1 },

  // Toast
  toast: { position: 'absolute', bottom: 80, alignSelf: 'center', backgroundColor: '#111827', borderRadius: 100, paddingHorizontal: spacing.lg, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  toastCheck: { fontSize: 13, color: '#10B981', fontWeight: typography.bold },
  toastText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  skeletonWrap: { alignItems: 'center', paddingTop: 48 },
  skeletonAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.borderLight, marginBottom: 16 },
  skeletonLine: { width: 120, height: 14, borderRadius: 7, backgroundColor: colors.borderLight },

  settingsLinkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.md },
  settingsLinkCardText: { fontSize: 14, fontWeight: typography.semibold, color: colors.black },
  settingsLinkCardChevron: { fontSize: 20, color: colors.muted, fontWeight: '300' },

  // Confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  confirmBox: { backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, width: '100%', maxWidth: 380 },
  confirmTitle: { fontSize: 16, fontWeight: typography.black, color: colors.black, marginBottom: spacing.sm },
  confirmBody: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: spacing.lg },
  confirmBtns: { flexDirection: 'row', gap: spacing.sm },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  confirmAction: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  confirmActionText: { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
});