// src/screens/app/MembersScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet,  Modal, Pressable,
  KeyboardAvoidingView, Platform, StatusBar, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  getMembers, getPendingRequests, getDepartments,
  updateMember, removeMember, approveRequest, declineRequest,
  addDepartment, renameDepartment, deleteDepartment,
} from '../../services/member.service';
import { buildInviteLink } from '../../services/org.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 36, color }) {
  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color ? color + '18' : '#EFF6FF',
      borderColor:     color ? color + '35' : '#BFDBFE',
    }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33, color: color || colors.brand }]}>
        {initials || '?'}
      </Text>
    </View>
  );
}

// ── Pending row ───────────────────────────────────────────────────────────────

function PendingRow({ member, onApprove, onDecline }) {
  return (
    <View style={styles.pendingRow}>
      <Avatar initials={member.initials} size={38} color="#6B7280" />
      <View style={styles.pendingInfo}>
        <Text style={styles.pendingName}>{member.full_name}</Text>
        <Text style={styles.pendingEmail}>{member.email}</Text>
      </View>
      <View style={styles.pendingActions}>
        <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(member.membership_id)} activeOpacity={0.8}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.approveBtn, member.approving && { opacity: 0.6 }]}
          onPress={() => !member.approving && onApprove(member.membership_id)}
          activeOpacity={0.85}
        >
          <Text style={styles.approveBtnText}>{member.approving ? '...' : 'Approve'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, onPress }) {
  const isOnLeave = member.status === 'leave';
  return (
    <TouchableOpacity style={styles.memberRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.memberAvatarWrap}>
        <Avatar initials={member.initials} size={42} color={member.avatar_color} />
        {isOnLeave && <View style={styles.leaveRing} />}
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          {member.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
          {isOnLeave && <View style={styles.leaveBadge}><Text style={styles.leaveBadgeText}>On leave</Text></View>}
          {member.status === 'invited' && <View style={styles.invitedBadge}><Text style={styles.invitedBadgeText}>Invited</Text></View>}
        </View>
        <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
        <View style={styles.memberDepts}>
          {member.departments.map(d => (
            <View key={d.id} style={styles.deptChip}>
              <Text style={styles.deptChipText}>{d.name}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Member detail sheet ───────────────────────────────────────────────────────

function MemberDetailSheet({ member, departments, adminCount, currentUserId, isAdmin, onClose, onUpdate, onRemove }) {
  const [role,          setRole]          = useState(member.role);
  const [memberDepts,   setMemberDepts]   = useState(member.department_ids || []);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving,        setSaving]        = useState(false);

  const isSelf        = member.user_id === currentUserId;
  const isLastAdmin   = member.role === 'admin' && adminCount <= 1;
  const roleIsLocked  = isSelf || isLastAdmin || !isAdmin;
  // Admins can edit depts for anyone including themselves
  // But cannot change their own role
  const canEditDepts  = isAdmin;
  const canEditRole   = isAdmin && !isSelf;
  const canRemove     = isAdmin && !isSelf;

  const toggleDept = (id) => {
    const isCurrentlyIn = memberDepts.includes(id);
    // Block removing if it would leave member with zero departments
    if (isCurrentlyIn && memberDepts.length === 1) return;
    setMemberDepts(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  // ✅ Uses member.service instead of direct Supabase calls
  const handleSave = async () => {
    setSaving(true);
    try {
      const orgDeptIds = departments.map(d => d.id);
      await updateMember(member, role, memberDepts, orgDeptIds);
      const updatedDepts = departments.filter(d => memberDepts.includes(d.id));
      onUpdate({ ...member, role, department_ids: memberDepts, departments: updatedDepts });
      onClose();
    } catch (err) {
      console.warn('Save member error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await removeMember(member.user_id, member.org_id, false);
      onRemove(member.user_id);
      onClose();
    } catch (err) {
      console.warn('Remove member error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!member} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.detailSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={[styles.colorBar, { backgroundColor: member.avatar_color || colors.brand }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailBody}>
              {/* Header */}
              <View style={styles.detailHeader}>
                <View style={styles.detailHeaderLeft}>
                  <Avatar initials={member.initials} size={48} color={member.avatar_color} />
                  <View>
                    <Text style={styles.detailName}>{member.full_name}</Text>
                    {member.email ? <Text style={styles.detailEmail}>{member.email}</Text> : null}
                    <Text style={styles.detailJoined}>
                      Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Role */}
              <Text style={styles.sectionLabel}>ROLE</Text>
              <View style={styles.roleRow}>
                {['member', 'admin'].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleBtn, role === r && styles.roleBtnActive, roleIsLocked && { opacity: 0.6 }]}
                    onPress={() => !roleIsLocked && setRole(r)}
                    activeOpacity={roleIsLocked ? 1 : 0.8}
                  >
                    <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isSelf && <Text style={styles.roleHint}>You can't change your own role.</Text>}
              {isLastAdmin && <Text style={styles.roleHint}>Can't demote the only admin.</Text>}

              {/* Departments */}
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>DEPARTMENTS</Text>
              <View style={styles.deptList}>
                {departments.map(dept => {
                  const isIn      = memberDepts.includes(dept.id);
                  const isLocked  = memberDepts.length === 1 && isIn; // last dept — can't remove
                  return (
                    <TouchableOpacity
                      key={dept.id}
                      style={[styles.deptRow, isIn && { borderColor: (member.avatar_color || colors.brand) + '40', backgroundColor: (member.avatar_color || colors.brand) + '08' }]}
                      onPress={() => canEditDepts && !isLocked ? toggleDept(dept.id) : null}
                      activeOpacity={canEditDepts && !isLocked ? 0.8 : 1}
                    >
                      <Text style={styles.deptRowName}>{dept.name}</Text>
                      {isLocked && <View style={styles.defaultChip}><Text style={styles.defaultChipText}>last dept</Text></View>}
                      <View style={[styles.deptCheck, isIn && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                        {isIn && <Text style={styles.deptCheckMark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Remove confirm */}
              {confirmRemove && (
                <View style={styles.removeConfirmBox}>
                  <Text style={styles.removeConfirmTitle}>Remove {member.full_name.split(' ')[0]}?</Text>
                  <Text style={styles.removeConfirmSub}>They'll lose access immediately. An admin can re-invite them.</Text>
                  <View style={styles.removeConfirmBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmRemove(false)} activeOpacity={0.8}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.removeBtn, saving && { opacity: 0.6 }]} onPress={handleRemove} disabled={saving} activeOpacity={0.85}>
                      <Text style={styles.removeBtnText}>{saving ? '...' : 'Remove'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              {!confirmRemove && (
                <>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    {canEditDepts && (
                      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                        <Text style={styles.saveBtnText}>{saving ? '...' : 'Save changes'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {canRemove && (
                    <TouchableOpacity onPress={() => setConfirmRemove(true)} style={styles.removeLink}>
                      <Text style={styles.removeLinkText}>Remove from workspace</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <View style={{ height: 32 }} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({ visible, onClose, orgName, orgSlug, orgToken, isAdmin }) {
  const [copied,    setCopied]    = useState(false);
  const [email,     setEmail]     = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error,     setError]     = useState('');

  // ✅ Uses org.service buildInviteLink
  const inviteLink = buildInviteLink(orgSlug, orgToken);

  const handleCopy  = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleShare = async () => {
    try { await Share.share({ message: `Join ${orgName} on Notifiqe: ${inviteLink}`, url: inviteLink }); } catch (e) {}
  };
  const handleSend  = () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return; }
    setEmailSent(true); setError('');
  };
  const handleClose = () => { setEmail(''); setEmailSent(false); setError(''); setCopied(false); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
          <Pressable style={styles.inviteSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={[styles.colorBar, { backgroundColor: colors.brand }]} />
            <View style={styles.inviteHeader}>
              <Text style={styles.inviteTitle}>Invite to {orgName}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inviteBody}>
              {isAdmin && (
                <>
                  <Text style={styles.sectionLabel}>INVITE BY EMAIL</Text>
                  {emailSent ? (
                    <View style={styles.sentConfirm}><Text style={styles.sentConfirmText}>✓  Invite sent to {email}</Text></View>
                  ) : (
                    <>
                      <View style={styles.emailRow}>
                        <TextInput style={[styles.emailInput, error && { borderColor: '#FECACA' }]} placeholder="colleague@company.com" placeholderTextColor={colors.placeholder} value={email} onChangeText={v => { setEmail(v); setError(''); }} keyboardType="email-address" autoCapitalize="none" />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}><Text style={styles.sendBtnText}>Send</Text></TouchableOpacity>
                      </View>
                      {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </>
                  )}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or share link</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}
              {!isAdmin && (
                <Text style={styles.sectionLabel}>SHARE INVITE LINK</Text>
              )}
              <View style={styles.linkRow}>
                <View style={styles.linkBox}><Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text></View>
                <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={handleCopy} activeOpacity={0.85}>
                  <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>{copied ? '✓ Copied' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <Text style={styles.shareBtnText}>Share invite link</Text>
              </TouchableOpacity>
              <Text style={styles.inviteNote}>
                {isAdmin
                  ? 'New members will need your approval before they can access the workspace.'
                  : 'Share this link with anyone you want to invite. An admin will need to approve them before they get access.'}
              </Text>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MembersScreen() {
  // ✅ Org data from AppContext — no extra Supabase call needed
  const { user, org, orgId, orgName, isAdmin } = useApp();

  const [loading,        setLoading]        = useState(true); // always true until data loads
  const [members,        setMembers]        = useState([]);
  const [pending,        setPending]        = useState([]);
  const [departments,    setDepartments]    = useState([]);
  const [filterDept,     setFilterDept]     = useState('all');
  const [search,         setSearch]         = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showInvite,     setShowInvite]     = useState(false);
  const [addingDept,     setAddingDept]     = useState(false);
  const [newDeptName,    setNewDeptName]    = useState('');
  const [editingDept,    setEditingDept]    = useState(null);
  const [editDeptName,   setEditDeptName]   = useState('');
  const [deletingDept,   setDeletingDept]   = useState(null);

  const adminCount = members.filter(m => m.role === 'admin').length;

  // ── Load data using services ──────────────────────────────────────────────

  const loadData = useCallback(async (showSpinner = false) => {
    if (!orgId) {
      // orgId not ready yet — keep spinner, don't show empty state
      return;
    }
    if (showSpinner) setLoading(true);
    try {
      const [freshMembers, freshPending, freshDepts] = await Promise.all([
        getMembers(orgId),
        getPendingRequests(orgId),
        getDepartments(orgId),
      ]);
      setMembers(freshMembers);
      setPending(freshPending);
      setDepartments(freshDepts);
    } catch (err) {
      console.warn('MembersScreen loadData error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // ✅ Ref always points to latest loadData — no stale closure in realtime
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; });

  useEffect(() => {
    if (orgId) loadData(true);
  }, [orgId, loadData]);

  // ── Realtime subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const reload = () => loadDataRef.current?.();
    const channel = supabase
      .channel(`members-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships',       filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests',     filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments',       filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_members'                               }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles'                                         }, reload)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, loadData]);

  // ── Filter + search ───────────────────────────────────────────────────────

  const visible = members
    .filter(m => filterDept === 'all' || m.department_ids.includes(filterDept))
    .filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  const admins  = visible.filter(m => m.role === 'admin');
  const regular = visible.filter(m => m.role === 'member');

  // ── Approve / Decline ─────────────────────────────────────────────────────

  const handleApprove = async (id) => {
    setPending(p => p.map(m => m.membership_id === id ? { ...m, approving: true } : m));
    try {
      await approveRequest(id);
    } catch (err) {
      console.warn('Approve error:', err.message);
      setPending(p => p.map(m => m.membership_id === id ? { ...m, approving: false } : m));
    }
    await loadData();
  };

  const handleDecline = async (id) => {
    setPending(p => p.filter(m => m.membership_id !== id));
    try {
      await declineRequest(id);
    } catch (err) {
      console.warn('Decline error:', err.message);
      await loadData();
    }
  };

  // ── Member update / remove ────────────────────────────────────────────────

  const handleUpdate = (updated) => setMembers(prev => prev.map(m => m.user_id === updated.user_id ? updated : m));
  const handleRemove = (userId) => setMembers(prev => prev.filter(m => m.user_id !== userId));

  // ── Department management ─────────────────────────────────────────────────

  const handleAddDept = async () => {
    const name = newDeptName.trim();
    if (!name || !orgId) return;
    try {
      const data = await addDepartment(orgId, name);
      setDepartments(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) { console.warn('Add dept error:', err.message); }
    setNewDeptName('');
    setAddingDept(false);
  };

  const handleEditDept = async () => {
    const name = editDeptName.trim();
    if (!name || !editingDept) return;
    try {
      await renameDepartment(editingDept.id, name);
      setDepartments(prev => prev.map(d => d.id === editingDept.id ? { ...d, name } : d).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) { console.warn('Rename dept error:', err.message); }
    setEditingDept(null);
    setEditDeptName('');
  };

  const handleDeleteDept = async (deptId) => {
    setDeletingDept(deptId);
    try {
      await deleteDepartment(deptId);
      setDepartments(prev => prev.filter(d => d.id !== deptId));
      setMembers(prev => prev.map(m => ({
        ...m,
        departments:    m.departments.filter(d => d.id !== deptId),
        department_ids: m.department_ids.filter(id => id !== deptId),
      })));
      if (filterDept === deptId) setFilterDept('all');
    } catch (err) { console.warn('Delete dept error:', err.message); }
    setDeletingDept(null);
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) return (
    <View style={[styles.root, { backgroundColor: '#F3F4F6' }]}>
      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.appHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
          </View>
        </View>
      )}
      <View style={{ padding: spacing.page, gap: spacing.md }}>
        {[1,2,3].map(i => (
          <View key={i} style={[styles.memberRow, { opacity: 0.4 }]}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.borderLight }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.borderLight }} />
              <View style={{ width: '40%', height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.appHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <Text style={styles.appOrg}>{orgName}</Text>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <Text style={styles.appOrg}>{orgName}</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Page header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Members</Text>
            <Text style={styles.pageSub}>
              {members.length} active{pending.length > 0 ? ` · ${pending.length} pending` : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
            <Text style={styles.inviteBtnText}>+ Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Pending */}
        {pending.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingSectionHeader}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingSectionLabel}>Pending · {pending.length}</Text>
            </View>
            <View style={styles.pendingList}>
              {pending.map(m => (
                <PendingRow key={m.membership_id} member={m} onApprove={handleApprove} onDecline={handleDecline} />
              ))}
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput style={styles.searchInput} placeholder="Search members..." placeholderTextColor={colors.placeholder} value={search} onChangeText={setSearch} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dept filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptFilterScroll} contentContainerStyle={styles.deptFilterContent}>
          <TouchableOpacity style={[styles.filterPill, filterDept === 'all' && styles.filterPillAllActive]} onPress={() => setFilterDept('all')} activeOpacity={0.8}>
            <Text style={[styles.filterPillText, filterDept === 'all' && styles.filterPillTextAllActive]}>All</Text>
          </TouchableOpacity>

          {departments.map(d => {
            const isGeneral = d.name.toLowerCase() === 'general';
            if (editingDept?.id === d.id) return (
              <View key={d.id} style={styles.editDeptRow}>
                <TextInput style={styles.editDeptInput} value={editDeptName} onChangeText={setEditDeptName} onSubmitEditing={handleEditDept} autoFocus returnKeyType="done" />
                <TouchableOpacity style={styles.editDeptSave} onPress={handleEditDept} activeOpacity={0.85}><Text style={styles.editDeptSaveText}>Save</Text></TouchableOpacity>
                <TouchableOpacity style={styles.editDeptCancel} onPress={() => setEditingDept(null)} activeOpacity={0.8}><Text style={styles.editDeptCancelText}>✕</Text></TouchableOpacity>
              </View>
            );
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.filterPill, filterDept === d.id && styles.filterPillActive]}
                onPress={() => setFilterDept(d.id)}
                onLongPress={() => {
                  if (!isAdmin) return;
                  Alert.alert(d.name, 'What would you like to do?', [
                    { text: 'Rename', onPress: () => { setEditingDept(d); setEditDeptName(d.name); } },
                    ...(!isGeneral ? [{ text: 'Delete', style: 'destructive', onPress: () => setDeletingDept(d.id) }] : []),
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, filterDept === d.id && styles.filterPillTextActive]}>{d.name}</Text>
              </TouchableOpacity>
            );
          })}

          {isAdmin && !addingDept && (
            <TouchableOpacity style={styles.filterPillDashed} onPress={() => setAddingDept(true)} activeOpacity={0.8}>
              <Text style={styles.filterPillDashedText}>+ New dept</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Inline add dept */}
        {addingDept && (
          <View style={styles.addDeptRow}>
            <TextInput style={styles.addDeptInput} placeholder="Department name..." placeholderTextColor={colors.placeholder} value={newDeptName} onChangeText={setNewDeptName} autoFocus onSubmitEditing={handleAddDept} returnKeyType="done" />
            <TouchableOpacity style={styles.addDeptSave} onPress={handleAddDept} activeOpacity={0.85}><Text style={styles.addDeptSaveText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.addDeptCancel} onPress={() => { setAddingDept(false); setNewDeptName(''); }} activeOpacity={0.8}><Text style={styles.addDeptCancelText}>✕</Text></TouchableOpacity>
          </View>
        )}

        {/* Admins */}
        {admins.length > 0 && (
          <View style={styles.memberSection}>
            <Text style={styles.sectionHeader}>ADMINS · {admins.length}</Text>
            <View style={styles.memberList}>
              {admins.map(m => <MemberRow key={m.user_id} member={m} onPress={() => setSelectedMember(m)} />)}
            </View>
          </View>
        )}

        {/* Members */}
        {regular.length > 0 && (
          <View style={styles.memberSection}>
            <Text style={styles.sectionHeader}>MEMBERS · {regular.length}</Text>
            <View style={styles.memberList}>
              {regular.map(m => <MemberRow key={m.user_id} member={m} onPress={() => setSelectedMember(m)} />)}
            </View>
          </View>
        )}

        {visible.length === 0 && members.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>⊕</Text></View>
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptySub}>Invite your team to get started.</Text>
            <TouchableOpacity style={styles.emptyInviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
              <Text style={styles.emptyInviteBtnText}>+ Invite your first member</Text>
            </TouchableOpacity>
          </View>
        )}

        {visible.length === 0 && members.length > 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No members found</Text>
            <Text style={styles.emptySub}>Try a different filter or search term.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Member detail sheet */}
      {selectedMember && (
        <MemberDetailSheet
          member={selectedMember}
          departments={departments}
          adminCount={adminCount}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setSelectedMember(null)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      )}

      {/* Delete dept confirm */}
      {deletingDept && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDeletingDept(null)}>
          <Pressable style={styles.overlay} onPress={() => setDeletingDept(null)}>
            <Pressable style={styles.confirmBox} onPress={e => e.stopPropagation()}>
              <Text style={styles.confirmTitle}>Delete department?</Text>
              <Text style={styles.confirmBody}>All members will be removed from this department. This can't be undone.</Text>
              <View style={styles.confirmBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeletingDept(null)} activeOpacity={0.8}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleDeleteDept(deletingDept)} activeOpacity={0.85}><Text style={styles.removeBtnText}>Delete</Text></TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Invite modal */}
      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        orgName={orgName}
        orgSlug={org?.slug}
        orgToken={org?.invite_token}
        isAdmin={isAdmin}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:                   { flex: 1, backgroundColor: '#F3F4F6' },
  headerBlock:            { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader:              { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, gap: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appLogo:                { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent:          { color: colors.brand },
  appSep:                 { fontSize: 14, color: colors.border },
  appOrg:                 { flex: 1, fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  scroll:                 { flex: 1 },
  scrollContent:          { paddingHorizontal: spacing.page, paddingTop: spacing.md },
  pageHeader:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle:              { fontSize: 20, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black, marginBottom: 2 },
  pageSub:                { fontSize: 13, color: colors.subtle },
  inviteBtn:              { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8 },
  inviteBtnText:          { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  pendingSection:         { marginBottom: spacing.lg },
  pendingSectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  pendingDot:             { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D97706' },
  pendingSectionLabel:    { fontSize: 11, fontWeight: typography.bold, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.8 },
  pendingList:            { gap: spacing.sm },
  pendingRow:             { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  pendingInfo:            { flex: 1, minWidth: 0 },
  pendingName:            { fontSize: 14, fontWeight: typography.bold, color: colors.black },
  pendingEmail:           { fontSize: 12, color: colors.subtle, marginTop: 1 },
  pendingActions:         { flexDirection: 'row', gap: 8, flexShrink: 0 },
  declineBtn:             { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  declineBtnText:         { fontSize: 12, fontWeight: typography.semibold, color: colors.muted },
  approveBtn:             { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.brand },
  approveBtnText:         { fontSize: 12, fontWeight: typography.semibold, color: colors.white },
  searchWrap:             { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, marginBottom: spacing.sm, minHeight: 44 },
  searchIcon:             { fontSize: 16, color: colors.placeholder, marginRight: spacing.sm },
  searchInput:            { flex: 1, fontSize: 14, color: colors.black },
  searchClear:            { fontSize: 14, color: colors.placeholder, padding: 4 },
  deptFilterScroll:       { marginBottom: spacing.sm },
  deptFilterContent:      { gap: 6, paddingRight: spacing.page },
  filterPill:             { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterPillActive:       { backgroundColor: '#EFF6FF', borderColor: colors.brand },
  filterPillAllActive:    { backgroundColor: colors.black, borderColor: colors.black },
  filterPillText:         { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  filterPillTextActive:   { color: colors.brand, fontWeight: typography.semibold },
  filterPillTextAllActive:{ color: colors.white, fontWeight: typography.semibold },
  filterPillDashed:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.white },
  filterPillDashedText:   { fontSize: 13, color: colors.subtle, fontWeight: typography.medium },
  addDeptRow:             { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addDeptInput:           { flex: 1, borderWidth: 1, borderColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 14, color: colors.black },
  addDeptSave:            { backgroundColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, justifyContent: 'center' },
  addDeptSaveText:        { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  addDeptCancel:          { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, justifyContent: 'center' },
  addDeptCancelText:      { fontSize: 13, color: colors.muted },
  memberSection:          { marginBottom: spacing.lg },
  sectionHeader:          { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  memberList:             { gap: spacing.sm },
  memberRow:              { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, minHeight: 72 },
  memberAvatarWrap:       { position: 'relative', flexShrink: 0 },
  leaveRing:              { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 100, borderWidth: 2, borderColor: '#FDE68A', borderStyle: 'dashed' },
  memberInfo:             { flex: 1, minWidth: 0 },
  memberNameRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  memberName:             { fontSize: 15, fontWeight: typography.bold, color: colors.black },
  adminBadge:             { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText:         { fontSize: 10, fontWeight: typography.bold, color: colors.brand },
  leaveBadge:             { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  leaveBadgeText:         { fontSize: 10, fontWeight: typography.bold, color: '#92400E' },
  invitedBadge:           { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  invitedBadgeText:       { fontSize: 10, fontWeight: typography.bold, color: '#5B21B6' },
  memberEmail:            { fontSize: 12, color: colors.subtle, marginBottom: 5 },
  memberDepts:            { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  deptChip:               { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deptChipText:           { fontSize: 11, color: colors.muted, fontWeight: typography.medium },
  chevron:                { fontSize: 20, color: colors.placeholder, fontWeight: '300' },
  emptyWrap:              { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:              { width: 56, height: 56, borderRadius: 16, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyIconText:          { fontSize: 24, color: colors.brand },
  emptyTitle:             { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  emptySub:               { fontSize: 14, color: colors.subtle, marginBottom: 6 },
  emptyInviteBtn:         { backgroundColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: 12, marginTop: spacing.sm },
  emptyInviteBtnText:     { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  avatar:                 { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:             { fontWeight: typography.bold },
  overlay:                { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetHandle:            { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  colorBar:               { height: 4, width: '100%' },
  detailSheet:            { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  detailBody:             { padding: spacing.page },
  detailHeader:           { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
  detailHeaderLeft:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  detailName:             { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.3, color: colors.black, marginBottom: 2 },
  detailEmail:            { fontSize: 13, color: colors.subtle, marginBottom: 2 },
  detailJoined:           { fontSize: 12, color: colors.subtle },
  closeBtn:               { padding: 4 },
  closeBtnText:           { fontSize: 16, color: colors.subtle },
  sectionLabel:           { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  roleRow:                { flexDirection: 'row', gap: spacing.sm, marginBottom: 6 },
  roleBtn:                { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  roleBtnActive:          { borderColor: colors.brand, backgroundColor: '#EFF6FF' },
  roleBtnText:            { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  roleBtnTextActive:      { color: colors.brand },
  roleHint:               { fontSize: 12, color: colors.subtle, marginBottom: spacing.sm, lineHeight: 17 },
  deptList:               { gap: spacing.sm, marginBottom: spacing.lg },
  deptRow:                { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: '#F9FAFB', minHeight: 48 },
  deptRowName:            { flex: 1, fontSize: 14, fontWeight: typography.medium, color: '#374151' },
  defaultChip:            { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultChipText:        { fontSize: 10, color: colors.subtle, fontWeight: typography.medium },
  deptCheck:              { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  deptCheckMark:          { fontSize: 10, color: colors.white, fontWeight: typography.bold },
  actionRow:              { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:              { flex: 1, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText:          { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  saveBtn:                { flex: 2, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.brand, alignItems: 'center' },
  saveBtnText:            { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  removeLink:             { alignItems: 'center', paddingVertical: spacing.md },
  removeLinkText:         { fontSize: 13, color: '#EF4444', fontWeight: typography.medium },
  removeConfirmBox:       { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  removeConfirmTitle:     { fontSize: 14, fontWeight: typography.bold, color: '#DC2626', marginBottom: 4 },
  removeConfirmSub:       { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: spacing.md },
  removeConfirmBtns:      { flexDirection: 'row', gap: spacing.sm },
  removeBtn:              { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: '#DC2626', alignItems: 'center' },
  removeBtnText:          { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  editDeptRow:            { flexDirection: 'row', gap: 6, alignItems: 'center' },
  editDeptInput:          { borderWidth: 1, borderColor: colors.brand, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, color: colors.black, minWidth: 100 },
  editDeptSave:           { backgroundColor: colors.brand, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  editDeptSaveText:       { fontSize: 11, fontWeight: typography.semibold, color: colors.white },
  editDeptCancel:         { borderWidth: 1, borderColor: colors.border, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4 },
  editDeptCancelText:     { fontSize: 11, color: colors.muted },
  shareBtn:               { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginBottom: spacing.md },
  shareBtnText:           { fontSize: 14, fontWeight: typography.semibold, color: colors.body },
  confirmBox:             { backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, width: '85%', alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto' },
  confirmTitle:           { fontSize: 16, fontWeight: typography.black, color: colors.black, marginBottom: spacing.sm },
  confirmBody:            { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: spacing.lg },
  confirmBtns:            { flexDirection: 'row', gap: spacing.sm },
  inviteSheet:            { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  inviteHeader:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  inviteTitle:            { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  inviteBody:             { padding: spacing.page },
  emailRow:               { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  emailInput:             { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black },
  sendBtn:                { backgroundColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center' },
  sendBtnText:            { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  sentConfirm:            { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  sentConfirmText:        { fontSize: 14, color: '#065F46', fontWeight: typography.semibold },
  errorText:              { fontSize: 12, color: '#DC2626', marginBottom: spacing.sm },
  divider:                { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine:            { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText:            { fontSize: 12, color: colors.placeholder, fontWeight: typography.medium },
  linkRow:                { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  linkBox:                { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center' },
  linkText:               { fontSize: 12, color: colors.muted },
  copyBtn:                { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  copyBtnDone:            { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0' },
  copyBtnText:            { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  copyBtnTextDone:        { color: '#065F46' },
  inviteNote:             { fontSize: 12, color: colors.subtle, textAlign: 'center', lineHeight: 17 },
});