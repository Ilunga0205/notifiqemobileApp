// src/screens/app/MembersScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Pressable,
  KeyboardAvoidingView, Platform, StatusBar, FlatList,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/tokens';

// ── MOCK DATA ─────────────────────────────────────────────────────────────────

const CURRENT_USER = { user_id: '1', role: 'admin' };

const MOCK_DEPARTMENTS = [
  { id: 'd1', name: 'General'    },
  { id: 'd2', name: 'Management' },
  { id: 'd3', name: 'Dev Team'   },
  { id: 'd4', name: 'Finance'    },
];

const MOCK_MEMBERS = [
  { user_id: '1', membership_id: 'm1', full_name: 'Sarah M.', initials: 'SM', avatar_color: '#1D4ED8', email: 'sarah@acme.com', role: 'admin',  status: 'active', joined_at: '2024-01-10', department_ids: ['d1','d2','d4'], departments: [{ id: 'd1', name: 'General' },{ id: 'd2', name: 'Management' },{ id: 'd4', name: 'Finance' }] },
  { user_id: '2', membership_id: 'm2', full_name: 'James K.', initials: 'JK', avatar_color: '#065F46', email: 'james@acme.com', role: 'admin',  status: 'leave',  joined_at: '2024-01-15', department_ids: ['d1','d2'], departments: [{ id: 'd1', name: 'General' },{ id: 'd2', name: 'Management' }] },
  { user_id: '3', membership_id: 'm3', full_name: 'David O.', initials: 'DO', avatar_color: '#5B21B6', email: 'david@acme.com', role: 'member', status: 'active', joined_at: '2024-02-01', department_ids: ['d1','d3'], departments: [{ id: 'd1', name: 'General' },{ id: 'd3', name: 'Dev Team' }] },
  { user_id: '4', membership_id: 'm4', full_name: 'Priya N.', initials: 'PN', avatar_color: '#9D174D', email: 'priya@acme.com', role: 'member', status: 'leave',  joined_at: '2024-02-10', department_ids: ['d1','d3'], departments: [{ id: 'd1', name: 'General' },{ id: 'd3', name: 'Dev Team' }] },
  { user_id: '5', membership_id: 'm5', full_name: 'Tom R.',   initials: 'TR', avatar_color: '#92400E', email: 'tom@acme.com',   role: 'member', status: 'active', joined_at: '2024-03-01', department_ids: ['d1','d4'], departments: [{ id: 'd1', name: 'General' },{ id: 'd4', name: 'Finance' }] },
  { user_id: '6', membership_id: 'm6', full_name: 'Ben A.',   initials: 'BA', avatar_color: '#0369A1', email: 'ben@acme.com',   role: 'member', status: 'active', joined_at: '2024-03-15', department_ids: ['d1','d3'], departments: [{ id: 'd1', name: 'General' },{ id: 'd3', name: 'Dev Team' }] },
];

const MOCK_PENDING = [
  { membership_id: 'p1', full_name: 'Anna T.',  initials: 'AT', email: 'anna@acme.com'  },
  { membership_id: 'p2', full_name: 'Mark D.',  initials: 'MD', email: 'mark@acme.com'  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 36, color }) {
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

// ── PENDING ROW ───────────────────────────────────────────────────────────────

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
        <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(member.membership_id)} activeOpacity={0.85}>
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── MEMBER ROW ────────────────────────────────────────────────────────────────

function MemberRow({ member, onPress }) {
  const isOnLeave = member.status === 'leave';
  return (
    <TouchableOpacity style={styles.memberRow} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar with leave ring */}
      <View style={styles.memberAvatarWrap}>
        <Avatar initials={member.initials} size={42} color={member.avatar_color} />
        {isOnLeave && <View style={styles.leaveRing} />}
      </View>

      <View style={styles.memberInfo}>
        {/* Name + badges */}
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          {member.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
          {isOnLeave && (
            <View style={styles.leaveBadge}>
              <Text style={styles.leaveBadgeText}>On leave</Text>
            </View>
          )}
        </View>

        {/* Email */}
        <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>

        {/* Dept chips */}
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

// ── MEMBER DETAIL SHEET ───────────────────────────────────────────────────────

function MemberDetailSheet({ member, departments, adminCount, onClose, onUpdate, onRemove }) {
  const [role,          setRole]          = useState(member.role);
  const [memberDepts,   setMemberDepts]   = useState(member.department_ids || []);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isSelf      = member.user_id === CURRENT_USER.user_id;
  const isLastAdmin = member.role === 'admin' && adminCount <= 1;
  const roleIsLocked = isSelf || isLastAdmin;
  const canEdit      = !isSelf;

  const toggleDept = (id) => {
    const dept      = departments.find(d => d.id === id);
    const isGeneral = dept?.name.toLowerCase() === 'general';
    if (isGeneral && memberDepts.length === 1) return;
    setMemberDepts(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSave = () => {
    const updatedDepts = departments.filter(d => memberDepts.includes(d.id));
    onUpdate({ ...member, role, department_ids: memberDepts, departments: updatedDepts });
    onClose();
  };

  const handleRemove = () => {
    onRemove(member.user_id);
    onClose();
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
                    {member.email && <Text style={styles.detailEmail}>{member.email}</Text>}
                    <Text style={styles.detailJoined}>
                      Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* On leave notice */}
              {member.status === 'leave' && (
                <View style={styles.leaveNotice}>
                  <Text style={styles.leaveNoticeText}>
                    {member.full_name.split(' ')[0]} is currently on leave
                  </Text>
                </View>
              )}

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
              {isSelf && !isLastAdmin && (
                <Text style={styles.roleHint}>You can't change your own role.</Text>
              )}
              {isLastAdmin && (
                <Text style={styles.roleHint}>Can't demote the only admin. Promote someone else first.</Text>
              )}
              {role === 'admin' && !roleIsLocked && (
                <Text style={styles.roleHint}>Admins can pin posts, manage departments, and change member roles.</Text>
              )}

              {/* Departments */}
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>DEPARTMENTS</Text>
              <View style={styles.deptList}>
                {departments.map(dept => {
                  const isIn      = memberDepts.includes(dept.id);
                  const isGeneral = dept.name.toLowerCase() === 'general';
                  const isLocked  = isGeneral && memberDepts.length === 1 && memberDepts.includes(dept.id);
                  return (
                    <TouchableOpacity
                      key={dept.id}
                      style={[styles.deptRow, isIn && { borderColor: (member.avatar_color || colors.brand) + '40', backgroundColor: (member.avatar_color || colors.brand) + '08' }]}
                      onPress={() => canEdit && !isLocked && toggleDept(dept.id)}
                      activeOpacity={canEdit && !isLocked ? 0.8 : 1}
                    >
                      <Text style={styles.deptRowName}>{dept.name}</Text>
                      {isLocked && (
                        <View style={styles.defaultChip}>
                          <Text style={styles.defaultChipText}>default</Text>
                        </View>
                      )}
                      <View style={[styles.deptCheck, isIn && { backgroundColor: colors.brand, borderColor: colors.brand }, isLocked && { opacity: 0.5 }]}>
                        {isIn && <Text style={styles.deptCheckMark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Remove confirm */}
              {confirmRemove && (
                <View style={styles.removeConfirmBox}>
                  <Text style={styles.removeConfirmTitle}>
                    Remove {member.full_name.split(' ')[0]}?
                  </Text>
                  <Text style={styles.removeConfirmSub}>
                    They'll lose access immediately. An admin can re-invite them.
                  </Text>
                  <View style={styles.removeConfirmBtns}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmRemove(false)} activeOpacity={0.8}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} activeOpacity={0.85}>
                      <Text style={styles.removeBtnText}>Remove</Text>
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
                    {canEdit && (
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                        <Text style={styles.saveBtnText}>Save changes</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {canEdit && (
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

// ── INVITE MODAL ──────────────────────────────────────────────────────────────

function InviteModal({ visible, onClose, orgName }) {
  const [copied,    setCopied]    = useState(false);
  const [email,     setEmail]     = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error,     setError]     = useState('');

  const inviteLink = 'https://app.notifiqe.com/join/acme-corp/abc123';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return; }
    setEmailSent(true);
    setError('');
  };

  const handleClose = () => {
    setEmail(''); setEmailSent(false); setError(''); setCopied(false);
    onClose();
  };

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
              {/* Email invite */}
              <Text style={styles.sectionLabel}>INVITE BY EMAIL</Text>
              {emailSent ? (
                <View style={styles.sentConfirm}>
                  <Text style={styles.sentConfirmText}>✓  Invite sent to {email}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.emailRow}>
                    <TextInput
                      style={[styles.emailInput, error && { borderColor: '#FECACA' }]}
                      placeholder="colleague@company.com"
                      placeholderTextColor={colors.placeholder}
                      value={email}
                      onChangeText={v => { setEmail(v); setError(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
                      <Text style={styles.sendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </>
              )}

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or share link</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Invite link */}
              <View style={styles.linkRow}>
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnDone]}
                  onPress={handleCopy}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inviteNote}>
                New members need admin approval before they can access the workspace
              </Text>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const [members,        setMembers]        = useState(MOCK_MEMBERS);
  const [pending,        setPending]        = useState(MOCK_PENDING);
  const [departments,    setDepartments]    = useState(MOCK_DEPARTMENTS);
  const [filterDept,     setFilterDept]     = useState('all');
  const [search,         setSearch]         = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showInvite,     setShowInvite]     = useState(false);
  const [addingDept,     setAddingDept]     = useState(false);
  const [newDeptName,    setNewDeptName]    = useState('');

  const isAdmin    = CURRENT_USER.role === 'admin';
  const adminCount = members.filter(m => m.role === 'admin').length;
  const orgName    = 'Acme Corp';

  // Filter members
  const visible = members
    .filter(m => filterDept === 'all' || m.department_ids.includes(filterDept))
    .filter(m =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    );

  const admins  = visible.filter(m => m.role === 'admin');
  const regular = visible.filter(m => m.role === 'member');

  const handleApprove = (id) => setPending(p => p.filter(m => m.membership_id !== id));
  const handleDecline = (id) => setPending(p => p.filter(m => m.membership_id !== id));

  const handleUpdate = (updated) =>
    setMembers(prev => prev.map(m => m.user_id === updated.user_id ? updated : m));

  const handleRemove = (userId) =>
    setMembers(prev => prev.filter(m => m.user_id !== userId));

  const handleAddDept = () => {
    const name = newDeptName.trim();
    if (!name) return;
    const newDept = { id: `d${Date.now()}`, name };
    setDepartments(prev => [...prev, newDept].sort((a, b) => a.name.localeCompare(b.name)));
    setNewDeptName('');
    setAddingDept(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={{ backgroundColor: colors.white }}>
          <View style={styles.appHeader}>
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

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Pending section */}
        {pending.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingSectionHeader}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingSectionLabel}>Pending · {pending.length}</Text>
            </View>
            <View style={styles.pendingList}>
              {pending.map(m => (
                <PendingRow
                  key={m.membership_id}
                  member={m}
                  onApprove={handleApprove}
                  onDecline={handleDecline}
                />
              ))}
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Department filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deptFilterScroll}
          contentContainerStyle={styles.deptFilterContent}
        >
          <TouchableOpacity
            style={[styles.filterPill, filterDept === 'all' && styles.filterPillAllActive]}
            onPress={() => setFilterDept('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filterDept === 'all' && styles.filterPillTextAllActive]}>
              All
            </Text>
          </TouchableOpacity>

          {departments.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[styles.filterPill, filterDept === d.id && styles.filterPillActive]}
              onPress={() => setFilterDept(d.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, filterDept === d.id && styles.filterPillTextActive]}>
                {d.name}
              </Text>
            </TouchableOpacity>
          ))}

          {isAdmin && !addingDept && (
            <TouchableOpacity
              style={styles.filterPillDashed}
              onPress={() => setAddingDept(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterPillDashedText}>+ New</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Inline add dept */}
        {addingDept && (
          <View style={styles.addDeptRow}>
            <TextInput
              style={styles.addDeptInput}
              placeholder="Department name..."
              placeholderTextColor={colors.placeholder}
              value={newDeptName}
              onChangeText={setNewDeptName}
              autoFocus
              onSubmitEditing={handleAddDept}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addDeptSave} onPress={handleAddDept} activeOpacity={0.85}>
              <Text style={styles.addDeptSaveText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addDeptCancel} onPress={() => { setAddingDept(false); setNewDeptName(''); }} activeOpacity={0.8}>
              <Text style={styles.addDeptCancelText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admins */}
        {admins.length > 0 && (
          <View style={styles.memberSection}>
            <Text style={styles.sectionHeader}>ADMINS · {admins.length}</Text>
            <View style={styles.memberList}>
              {admins.map(m => (
                <MemberRow key={m.user_id} member={m} onPress={() => setSelectedMember(m)} />
              ))}
            </View>
          </View>
        )}

        {/* Members */}
        {regular.length > 0 && (
          <View style={styles.memberSection}>
            <Text style={styles.sectionHeader}>MEMBERS · {regular.length}</Text>
            <View style={styles.memberList}>
              {regular.map(m => (
                <MemberRow key={m.user_id} member={m} onPress={() => setSelectedMember(m)} />
              ))}
            </View>
          </View>
        )}

        {visible.length === 0 && members.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>⊕</Text>
            </View>
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
          onClose={() => setSelectedMember(null)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      )}

      {/* Invite modal */}
      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        orgName={orgName}
      />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerBlock: { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, gap: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appLogo: { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent: { color: colors.brand },
  appSep: { fontSize: 14, color: colors.border },
  appOrg: { flex: 1, fontSize: 13, fontWeight: typography.semibold, color: colors.muted },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.page, paddingTop: spacing.md },

  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle: { fontSize: 20, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black, marginBottom: 2 },
  pageSub: { fontSize: 13, color: colors.subtle },
  inviteBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8 },
  inviteBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  // Pending
  pendingSection: { marginBottom: spacing.lg },
  pendingSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  pendingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D97706' },
  pendingSectionLabel: { fontSize: 11, fontWeight: typography.bold, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.8 },
  pendingList: { gap: spacing.sm },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  pendingInfo: { flex: 1, minWidth: 0 },
  pendingName: { fontSize: 14, fontWeight: typography.bold, color: colors.black },
  pendingEmail: { fontSize: 12, color: colors.subtle, marginTop: 1 },
  pendingActions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  declineBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  declineBtnText: { fontSize: 12, fontWeight: typography.semibold, color: colors.muted },
  approveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.brand },
  approveBtnText: { fontSize: 12, fontWeight: typography.semibold, color: colors.white },

  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, marginBottom: spacing.sm, minHeight: 44 },
  searchIcon: { fontSize: 16, color: colors.placeholder, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: colors.black },
  searchClear: { fontSize: 14, color: colors.placeholder, padding: 4 },

  // Dept filter
  deptFilterScroll: { marginBottom: spacing.sm },
  deptFilterContent: { gap: 6, paddingRight: spacing.page },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterPillActive: { backgroundColor: '#EFF6FF', borderColor: colors.brand },
  filterPillAllActive: { backgroundColor: colors.black, borderColor: colors.black },
  filterPillText: { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  filterPillTextActive: { color: colors.brand, fontWeight: typography.semibold },
  filterPillTextAllActive: { color: colors.white, fontWeight: typography.semibold },
  filterPillDashed: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.white },
  filterPillDashedText: { fontSize: 13, color: colors.subtle, fontWeight: typography.medium },

  // Add dept inline
  addDeptRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addDeptInput: { flex: 1, borderWidth: 1, borderColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 14, color: colors.black },
  addDeptSave: { backgroundColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, justifyContent: 'center' },
  addDeptSaveText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  addDeptCancel: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 8, justifyContent: 'center' },
  addDeptCancelText: { fontSize: 13, color: colors.muted },

  // Member sections
  memberSection: { marginBottom: spacing.lg },
  sectionHeader: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  memberList: { gap: spacing.sm },

  // Member row
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, minHeight: 72 },
  memberAvatarWrap: { position: 'relative', flexShrink: 0 },
  leaveRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 100, borderWidth: 2, borderColor: '#FDE68A', borderStyle: 'dashed' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  memberName: { fontSize: 15, fontWeight: typography.bold, color: colors.black },
  adminBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { fontSize: 10, fontWeight: typography.bold, color: colors.brand },
  leaveBadge: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  leaveBadgeText: { fontSize: 10, fontWeight: typography.bold, color: '#92400E' },
  memberEmail: { fontSize: 12, color: colors.subtle, marginBottom: 5 },
  memberDepts: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  deptChip: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deptChipText: { fontSize: 11, color: colors.muted, fontWeight: typography.medium },
  chevron: { fontSize: 20, color: colors.placeholder, fontWeight: '300' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  emptySub: { fontSize: 14, color: colors.subtle },

  // Avatar
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: typography.bold },

  // Shared sheet styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  colorBar: { height: 4, width: '100%' },

  // Member detail sheet
  detailSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  detailBody: { padding: spacing.page },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  detailName: { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.3, color: colors.black, marginBottom: 2 },
  detailEmail: { fontSize: 13, color: colors.subtle, marginBottom: 2 },
  detailJoined: { fontSize: 12, color: colors.subtle },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 16, color: colors.subtle },
  leaveNotice: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  leaveNoticeText: { fontSize: 13, color: colors.muted },
  sectionLabel: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 6 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  roleBtnActive: { borderColor: colors.brand, backgroundColor: '#EFF6FF' },
  roleBtnText: { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  roleBtnTextActive: { color: colors.brand },
  roleHint: { fontSize: 12, color: colors.subtle, marginBottom: spacing.sm, lineHeight: 17 },
  deptList: { gap: spacing.sm, marginBottom: spacing.lg },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: '#F9FAFB', minHeight: 48 },
  deptRowName: { flex: 1, fontSize: 14, fontWeight: typography.medium, color: '#374151' },
  defaultChip: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultChipText: { fontSize: 10, color: colors.subtle, fontWeight: typography.medium },
  deptCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  deptCheckMark: { fontSize: 10, color: colors.white, fontWeight: typography.bold },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.brand, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  removeLink: { alignItems: 'center', paddingVertical: spacing.md },
  removeLinkText: { fontSize: 13, color: '#EF4444', fontWeight: typography.medium },
  removeConfirmBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  removeConfirmTitle: { fontSize: 14, fontWeight: typography.bold, color: '#DC2626', marginBottom: 4 },
  removeConfirmSub: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: spacing.md },
  removeConfirmBtns: { flexDirection: 'row', gap: spacing.sm },
  removeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: '#DC2626', alignItems: 'center' },
  removeBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  // Invite sheet
  inviteSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  inviteTitle: { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  inviteBody: { padding: spacing.page },
  emailRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  emailInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black },
  sendBtn: { backgroundColor: colors.brand, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center' },
  sendBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  sentConfirm: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  sentConfirmText: { fontSize: 14, color: '#065F46', fontWeight: typography.semibold },
  errorText: { fontSize: 12, color: '#DC2626', marginBottom: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: { fontSize: 12, color: colors.placeholder, fontWeight: typography.medium },
  linkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  linkBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center' },
  linkText: { fontSize: 12, color: colors.muted },
  copyBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  copyBtnDone: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0' },
  copyBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  copyBtnTextDone: { color: '#065F46' },
  inviteNote: { fontSize: 12, color: colors.subtle, textAlign: 'center', lineHeight: 17 },
});