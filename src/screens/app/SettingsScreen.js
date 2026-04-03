// src/screens/app/SettingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet,  Modal, Pressable,
  Platform, StatusBar, Switch, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { updateOrgName, updateTimezone, regenerateInviteToken, buildInviteLink } from '../../services/org.service';
import { POST_TYPES } from '../../services/post.service';
import { logout, clearOnboarding, deleteWorkspace } from '../../services/auth.service';
import { supabase } from '../../lib/supabase';

const TIMEZONES = [
  'Africa/Johannesburg', 'UTC', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Asia/Dubai',
  'Asia/Singapore', 'Australia/Sydney',
];

const EXPIRY_OPTIONS = ['24 hours', '3 days', '7 days', '30 days', 'Never'];

// ── Small components ──────────────────────────────────────────────────────────

function Toast({ message }) {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastCheck}>✓</Text>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

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

function Section({ title, description, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description && <Text style={styles.sectionDesc}>{description}</Text>}
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({ icon, label, description, danger, last, children }) {
  return (
    <View style={[styles.settingsRow, !last && styles.settingsRowBorder]}>
      {icon && (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Text style={[styles.rowIconText, danger && { color: '#DC2626' }]}>{icon}</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, danger && { color: '#DC2626' }]}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      {children && <View style={styles.rowAction}>{children}</View>}
    </View>
  );
}

function TimezonePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.pickerBtnText} numberOfLines={1}>{value.replace(/_/g, ' ')}</Text>
        <Text style={styles.pickerChevron}>›</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pickerTitle}>Timezone</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TIMEZONES.map(tz => (
                <TouchableOpacity key={tz} style={[styles.pickerOption, value === tz && styles.pickerOptionActive]} onPress={() => { onChange(tz); setOpen(false); }} activeOpacity={0.8}>
                  <Text style={[styles.pickerOptionText, value === tz && styles.pickerOptionTextActive]}>{tz.replace(/_/g, ' ')}</Text>
                  {value === tz && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
              <View style={{ height: 32 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ExpiryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.pickerBtnText}>{value}</Text>
        <Text style={styles.pickerChevron}>›</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pickerTitle}>Link expiry</Text>
            {EXPIRY_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={[styles.pickerOption, value === opt && styles.pickerOptionActive]} onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.8}>
                <Text style={[styles.pickerOptionText, value === opt && styles.pickerOptionTextActive]}>{opt}</Text>
                {value === opt && <Text style={styles.pickerCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: 32 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen({ navigation }) {
  // ✅ All org data from AppContext — no Supabase call needed
  const { org, orgId, orgName, isAdmin, updateOrg, user, activePostTypes, setActivePostTypes } = useApp();
  // ✅ Local ref holds post types to avoid stale closure + realtime collision
  const postTypesRef = useRef(activePostTypes);
  useEffect(() => { postTypesRef.current = activePostTypes; }, [activePostTypes]);

  const [orgNameEdit,   setOrgNameEdit]   = useState(false);
  const [orgNameDraft,  setOrgNameDraft]  = useState('');
  const [timezone,      setTimezone]      = useState(org?.timezone || 'Africa/Johannesburg');
  const [inviteToken,   setInviteToken]   = useState(org?.invite_token || '');

  // ✅ Sync from AppContext when org loads (handles cache-first async load)
  useEffect(() => {
    if (org?.timezone)     setTimezone(org.timezone);
    if (org?.invite_token) setInviteToken(org.invite_token);
  }, [org?.id, org?.timezone, org?.invite_token]);
  const [inviteCopied,  setInviteCopied]  = useState(false);
  const [linkExpiry,    setLinkExpiry]    = useState('7 days');
  const [toast,         setToast]         = useState(null);
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [notifications, setNotifications] = useState({
    announcements: true,
    mentions:      true,
    weeklyDigest:  false,
  });

  const inviteLink = buildInviteLink(org?.slug, inviteToken);

  // Load notification prefs from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('notifiqe_notifications').then(raw => {
      if (raw) setNotifications(JSON.parse(raw));
    });
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ── Save org name ─────────────────────────────────────────────────────────

  const saveOrgName = async () => {
    const trimmed = orgNameDraft.trim();
    if (!trimmed || !orgId) return;
    try {
      await updateOrgName(orgId, trimmed);
      await updateOrg({ name: trimmed }); // update AppContext cache
      setOrgNameEdit(false);
      showToast('Organisation name saved');
    } catch (err) {
      showToast('Failed to save name');
    }
  };

  // ── Save timezone ─────────────────────────────────────────────────────────

  const saveTimezone = async (tz) => {
    setTimezone(tz);
    try {
      await updateTimezone(orgId, tz);
      await updateOrg({ timezone: tz }); // update AppContext cache
      showToast('Timezone saved');
    } catch (err) {
      showToast('Failed to save timezone');
    }
  };

  // ── Copy invite link ──────────────────────────────────────────────────────

  const handleCopy = () => {
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
    showToast('Invite link copied');
  };

  // ── Share invite link ─────────────────────────────────────────────────────

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${orgName} on Notifiqe: ${inviteLink}`,
        url: inviteLink,
      });
    } catch (e) {}
  };

  // ── Regenerate invite link ────────────────────────────────────────────────

  const handleRegenerateLink = async () => {
    try {
      const newToken = await regenerateInviteToken(orgId);
      setInviteToken(newToken);
      await updateOrg({ invite_token: newToken }); // update AppContext cache
      setConfirmModal(null);
      showToast('New invite link generated');
    } catch (err) {
      showToast('Failed to regenerate link');
    }
  };

  // ── Notification toggles (device only — no DB) ────────────────────────────

  const toggleNotif = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    await AsyncStorage.setItem('notifiqe_notifications', JSON.stringify(updated));
    showToast('Notification preference saved');
  };

  // ── Delete workspace ──────────────────────────────────────────────────────
  // Deletes everything: posts, members, departments, org — then signs out
  // Members who try to log in will land on NoWorkspace screen

  const handleDeleteWorkspace = async () => {
    setConfirmModal(null);
    try {
      // Check for other active members first
      const { data: otherMembers } = await supabase
        .from('memberships')
        .select('id')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .neq('user_id', user?.id)
        .limit(1);

      if (otherMembers?.length > 0) {
        showToast('Remove all members before deleting the workspace.');
        return;
      }

      await clearOnboarding();
      await deleteWorkspace(orgId); // deletes everything + signs out

    } catch (err) {
      showToast('Failed to delete workspace. Please try again.');
      console.warn('Delete workspace error:', err.message);
    }
  };

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

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSub}>Manage your workspace</Text>
        </View>

        {/* Organisation */}
        <Section title="Organisation" description="How your workspace appears to your team.">
          <SettingsRow icon="↑" label="Workspace logo" description="Shown in the header and invite emails">
            <TouchableOpacity style={styles.uploadBtn} onPress={() => showToast('Logo upload coming soon')} activeOpacity={0.8}>
              <Text style={styles.uploadBtnText}>Upload</Text>
            </TouchableOpacity>
          </SettingsRow>

          <SettingsRow icon="✎" label="Organisation name" description="Shown to all members">
            {isAdmin ? (
              orgNameEdit ? (
                <View style={styles.inlineEditRow}>
                  <TextInput style={styles.inlineInput} value={orgNameDraft} onChangeText={setOrgNameDraft} onSubmitEditing={saveOrgName} autoFocus returnKeyType="done" />
                  <TouchableOpacity style={styles.inlineSave} onPress={saveOrgName} activeOpacity={0.85}>
                    <Text style={styles.inlineSaveText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inlineCancel} onPress={() => setOrgNameEdit(false)} activeOpacity={0.8}>
                    <Text style={styles.inlineCancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.editBtn} onPress={() => { setOrgNameDraft(orgName); setOrgNameEdit(true); }} activeOpacity={0.8}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )
            ) : (
              <Text style={{ fontSize: 13, color: colors.subtle }}>{orgName}</Text>
            )}
          </SettingsRow>

          <SettingsRow icon="🌐" label="Timezone" description="Used for calendar events" last>
            <TimezonePicker value={timezone} onChange={saveTimezone} />
          </SettingsRow>
        </Section>

        {/* Invite link */}
        <Section title="Invite link" description="Share this link to add people to your workspace.">
          <View style={styles.inviteSection}>
            <View style={styles.inviteLinkRow}>
              <View style={styles.inviteLinkBox}>
                <Text style={styles.inviteLinkIcon}>🔗</Text>
                <Text style={styles.inviteLinkText} numberOfLines={1}>{inviteLink}</Text>
              </View>
              <TouchableOpacity style={[styles.copyBtn, inviteCopied && styles.copyBtnDone]} onPress={handleCopy} activeOpacity={0.85}>
                <Text style={[styles.copyBtnText, inviteCopied && styles.copyBtnTextDone]}>{inviteCopied ? '✓ Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* Share — everyone can share the link */}
            <TouchableOpacity style={[styles.regenerateBtn, { marginBottom: spacing.sm, borderColor: colors.brand }]} onPress={handleShare} activeOpacity={0.8}>
              <Text style={[styles.regenerateBtnText, { color: colors.brand }]}>Share invite link</Text>
            </TouchableOpacity>

            {/* Expiry + Regenerate — admin only */}
            {isAdmin && (
              <>
                <View style={styles.expiryRow}>
                  <View style={styles.expiryInfo}>
                    <Text style={styles.expiryLabel}>Link expiry</Text>
                    <Text style={styles.expiryDesc}>Link stops working after this period</Text>
                  </View>
                  <ExpiryPicker value={linkExpiry} onChange={(v) => { setLinkExpiry(v); showToast('Expiry updated'); }} />
                </View>
                <TouchableOpacity
                  style={styles.regenerateBtn}
                  onPress={() => setConfirmModal({ title: 'Regenerate invite link?', body: "The current link will stop working immediately. Anyone who hasn't joined yet will need the new link.", confirmLabel: 'Regenerate', danger: false, onConfirm: handleRegenerateLink })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.regenerateBtnText}>↻  Regenerate link</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Choose what you get notified about.">
          {[
            { key: 'announcements', label: 'Announcements', desc: 'Get notified of new announcements' },
            { key: 'mentions',      label: 'Mentions',      desc: 'Get notified when someone @mentions you' },
            { key: 'weeklyDigest',  label: 'Weekly digest', desc: 'Summary of activity every Monday morning' },
          ].map((item, i, arr) => (
            <SettingsRow key={item.key} label={item.label} description={item.desc} last={i === arr.length - 1}>
              <Switch value={notifications[item.key]} onValueChange={() => toggleNotif(item.key)} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.white} />
            </SettingsRow>
          ))}
        </Section>

        {/* Post types — admin only */}
        {isAdmin && (
          <Section title="Post types" description="Choose which post types your team can use.">
            {POST_TYPES.map((pt, i) => {
              const isActive = !activePostTypes || activePostTypes.includes(pt.id);
              return (
                <SettingsRow
                  key={pt.id}
                  label={pt.label}
                  last={i === POST_TYPES.length - 1}
                >
                  <Switch
                    value={isActive}
                    onValueChange={async (val) => {
                      const current = postTypesRef.current || POST_TYPES.map(t => t.id);
                      const updated = val
                        ? [...new Set([...current, pt.id])]
                        : current.filter(id => id !== pt.id);
                      // ✅ 1. Update ref immediately — no stale closure on rapid toggles
                      postTypesRef.current = updated;
                      // ✅ 2. Update AppContext state — instant UI
                      setActivePostTypes(updated);
                      // ✅ 3. Update AsyncStorage cache — survives r reload
                      await AsyncStorage.setItem('notifiqe_post_types', JSON.stringify(updated));
                      // ✅ 4. Save to DB
                      await supabase
                        .from('org_settings')
                        .upsert({ org_id: orgId, active_post_types: updated }, { onConflict: 'org_id' });
                      showToast('Post types saved');
                    }}
                    trackColor={{ false: colors.border, true: colors.brand }}
                    thumbColor={colors.white}
                  />
                </SettingsRow>
              );
            })}
          </Section>
        )}

        {/* Danger zone — admin only */}
        {isAdmin && (
          <Section title="Danger zone" description="These actions cannot be undone.">
            <SettingsRow icon="🗑" label="Delete workspace" description="Permanently delete this workspace and all its data" danger last>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setConfirmModal({ title: 'Delete workspace?', body: `This will permanently delete "${orgName}" and all posts, members, and data. This cannot be undone.`, confirmLabel: 'Delete workspace', danger: true, onConfirm: handleDeleteWorkspace })}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </SettingsRow>
          </Section>
        )}

        {/* Quick links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <Text style={styles.quickLink}>My profile</Text>
          </TouchableOpacity>
          <Text style={styles.quickLinkSep}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Members' })} activeOpacity={0.7}>
            <Text style={styles.quickLink}>Members & access</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {toast && <Toast message={toast} />}
      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#F3F4F6' },
  headerBlock:        { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader:          { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backBtn:            { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText:        { fontSize: 28, color: colors.brand, fontWeight: '300', lineHeight: 32 },
  appHeaderCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  appLogo:            { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent:      { color: colors.brand },
  appSep:             { fontSize: 14, color: colors.border },
  appOrg:             { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  scroll:             { flex: 1 },
  scrollContent:      { paddingHorizontal: spacing.page, paddingTop: spacing.lg },
  pageHeader:         { marginBottom: spacing.lg },
  pageTitle:          { fontSize: 22, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black, marginBottom: 3 },
  pageSub:            { fontSize: 13, color: colors.subtle },
  section:            { marginBottom: spacing.lg },
  sectionHeader:      { marginBottom: spacing.sm },
  sectionTitle:       { fontSize: 14, fontWeight: typography.bold, color: colors.black, marginBottom: 2 },
  sectionDesc:        { fontSize: 12, color: colors.subtle },
  sectionCard:        { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.xl, overflow: 'hidden' },
  settingsRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 14, minHeight: 60 },
  settingsRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon:            { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowIconDanger:      { backgroundColor: '#FEF2F2' },
  rowIconText:        { fontSize: 14, color: colors.muted },
  rowInfo:            { flex: 1, minWidth: 0 },
  rowLabel:           { fontSize: 14, fontWeight: typography.semibold, color: colors.black },
  rowDesc:            { fontSize: 12, color: colors.subtle, marginTop: 2 },
  rowAction:          { flexShrink: 0 },
  inlineEditRow:      { flexDirection: 'row', gap: 6 },
  inlineInput:        { borderWidth: 1, borderColor: colors.brand, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.black, width: 120, minHeight: 36 },
  inlineSave:         { backgroundColor: colors.brand, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  inlineSaveText:     { fontSize: 12, fontWeight: typography.semibold, color: colors.white },
  inlineCancel:       { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  inlineCancelText:   { fontSize: 12, color: colors.muted },
  editBtn:            { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText:        { fontSize: 12, fontWeight: typography.semibold, color: colors.muted },
  uploadBtn:          { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  uploadBtnText:      { fontSize: 12, fontWeight: typography.semibold, color: colors.muted },
  pickerBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 140 },
  pickerBtnText:      { fontSize: 12, color: '#374151', fontWeight: typography.medium, flex: 1 },
  pickerChevron:      { fontSize: 14, color: colors.muted },
  pickerOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet:        { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32 },
  sheetHandle:        { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  pickerTitle:        { fontSize: 16, fontWeight: typography.bold, color: colors.black, paddingHorizontal: spacing.page, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  pickerOption:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  pickerOptionActive: { backgroundColor: '#EFF6FF' },
  pickerOptionText:   { fontSize: 14, color: '#374151', fontWeight: typography.medium },
  pickerOptionTextActive: { color: colors.brand, fontWeight: typography.semibold },
  pickerCheck:        { fontSize: 14, color: colors.brand, fontWeight: typography.bold },
  inviteSection:      { padding: spacing.md },
  inviteLinkRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  inviteLinkBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 44 },
  inviteLinkIcon:     { fontSize: 12 },
  inviteLinkText:     { flex: 1, fontSize: 12, color: colors.muted },
  copyBtn:            { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  copyBtnDone:        { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0' },
  copyBtnText:        { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  copyBtnTextDone:    { color: '#065F46' },
  expiryRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  expiryInfo:         { flex: 1, marginRight: spacing.md },
  expiryLabel:        { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },
  expiryDesc:         { fontSize: 11, color: colors.subtle, marginTop: 2 },
  regenerateBtn:      { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  regenerateBtnText:  { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  deleteBtn:          { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText:      { fontSize: 12, fontWeight: typography.semibold, color: '#DC2626' },
  quickLinks:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md },
  quickLink:          { fontSize: 13, fontWeight: typography.semibold, color: colors.brand },
  quickLinkSep:       { fontSize: 13, color: colors.border },
  toast:              { position: 'absolute', bottom: 80, alignSelf: 'center', backgroundColor: '#111827', borderRadius: 100, paddingHorizontal: spacing.lg, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  toastCheck:         { fontSize: 13, color: '#10B981', fontWeight: typography.bold },
  toastText:          { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  confirmOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  confirmBox:         { backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, width: '100%', maxWidth: 380 },
  confirmTitle:       { fontSize: 16, fontWeight: typography.black, color: colors.black, marginBottom: spacing.sm },
  confirmBody:        { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: spacing.lg },
  confirmBtns:        { flexDirection: 'row', gap: spacing.sm },
  confirmCancel:      { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  confirmCancelText:  { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  confirmAction:      { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  confirmActionText:  { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
});