// src/screens/auth/NoWorkspaceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createWorkspace, logout, getCurrentUser, parseAuthError } from '../../services/auth.service';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ +/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

export default function NoWorkspaceScreen({ navigation }) {
  const { load } = useApp();
  const [email,       setEmail]       = useState('');
  const [orgName,     setOrgName]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [oldOrgName,  setOldOrgName]  = useState(null); // ← name of orphaned org if found

  const slug = slugify(orgName);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      if (user.email) setEmail(user.email);

      // ── Check for orphaned org ──────────────────────────────────────────────
      // Find inactive/removed membership for this user
      const { data: oldMembership } = await supabase
        .from('memberships')
        .select('org_id, organisations(name)')
        .eq('user_id', user.id)
        .in('status', ['inactive', 'removed'])
        .maybeSingle();

      if (!oldMembership?.org_id) return;

      // Check if that org has any other active members
      const { data: otherMembers } = await supabase
        .from('memberships')
        .select('id')
        .eq('org_id', oldMembership.org_id)
        .in('status', ['active', 'invited'])
        .neq('user_id', user.id)
        .limit(1);

      // Only pre-fill if org is truly orphaned (no other active members)
      if (!otherMembers?.length) {
        const name = oldMembership.organisations?.name;
        if (name) {
          setOldOrgName(name);
          setOrgName(name); // pre-fill the input
        }
      }
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const user = await getCurrentUser();
      await createWorkspace(user.id, orgName.trim());
      await load(user.id);
      navigation.replace('Onboarding');
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.nav}>
            <Text style={styles.logo}>notifi<Text style={styles.accent}>qe</Text></Text>
          </View>
          <View style={styles.main}>
            <Text style={styles.title}>No workspace found.</Text>
            <Text style={styles.sub}>
              {email ? <Text style={styles.bold}>{email}</Text> : null}
              {email ? ' — ' : ''}
              You're not a member of any workspace. Create one below, or open an invite link from an admin to join an existing one.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* ── Previous workspace hint ── */}
            {oldOrgName ? (
              <View style={styles.hintBox}>
                <Text style={styles.hintIcon}>↩</Text>
                <Text style={styles.hintText}>
                  We found your previous workspace <Text style={styles.hintBold}>{oldOrgName}</Text>. You can reuse this name or type a new one.
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Workspace name</Text>
            <TextInput
              style={styles.input}
              value={orgName}
              onChangeText={(v) => { setOrgName(v); setError(''); }}
              placeholder="Acme Corp"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              autoFocus={!oldOrgName} // only autofocus if no pre-fill
            />
            {slug ? (
              <View style={styles.slugBox}>
                <Text style={styles.slugText}>notifiqe.com/<Text style={styles.slugAccent}>{slug}</Text></Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, (!orgName.trim() || loading) && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!orgName.trim() || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{loading ? 'Creating workspace...' : 'Create workspace →'}</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.removedNote}>
              Been removed from a workspace?{' '}
              <Text style={styles.removedStrong}>Ask your admin to resend your invite link.</Text>
            </Text>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
              <Text style={styles.signOutText}>Sign out / use a different account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#fff' },
  scroll:        { flexGrow: 1 },
  nav:           { height: 64, justifyContent: 'center', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logo:          { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, color: '#111827' },
  accent:        { color: '#1D4ED8' },
  main:          { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 },
  title:         { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -1, marginBottom: 12 },
  sub:           { fontSize: 15, color: '#6B7280', lineHeight: 24, marginBottom: 32 },
  bold:          { fontWeight: '700', color: '#111827' },
  errorBox:      { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:     { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  hintBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 12, marginBottom: 16 },
  hintIcon:      { fontSize: 14, color: '#1D4ED8', marginTop: 1 },
  hintText:      { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 20 },
  hintBold:      { fontWeight: '700' },
  label:         { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:         { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', marginBottom: 10 },
  slugBox:       { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 8, padding: 10, marginBottom: 20 },
  slugText:      { fontSize: 12, color: '#6B7280' },
  slugAccent:    { color: '#1D4ED8', fontWeight: '600' },
  btn:           { backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 28 },
  btnDisabled:   { backgroundColor: '#E5E7EB' },
  btnText:       { fontSize: 15, fontWeight: '700', color: '#fff' },
  divider:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#F3F4F6' },
  dividerText:   { fontSize: 12, color: '#9CA3AF' },
  removedNote:   { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 32 },
  removedStrong: { color: '#374151', fontWeight: '500' },
  signOutBtn:    { alignItems: 'center', paddingVertical: 10 },
  signOutText:   { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});