// src/screens/app/HistoryScreen.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Pressable,
  Platform, StatusBar, FlatList,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/tokens';

// ── DATA ──────────────────────────────────────────────────────────────────────

const POST_TYPES = [
  { id: 'announcement', label: 'Announcement',  color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'project',      label: 'Project Update', color: '#5B21B6', bg: '#F5F3FF' },
  { id: 'question',     label: 'Quick Question', color: '#9D174D', bg: '#FDF2F8' },
  { id: 'win',          label: 'Team Win',        color: '#065F46', bg: '#ECFDF5' },
  { id: 'general',      label: 'General Update',  color: '#374151', bg: '#F9FAFB' },
];

const DEPARTMENTS = [
  { id: 'general',    label: 'General'    },
  { id: 'management', label: 'Management' },
  { id: 'dev',        label: 'Dev Team'   },
  { id: 'finance',    label: 'Finance'    },
];

// Simulate archived posts — all older than active feed window
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);

const ARCHIVED_POSTS = [
  {
    id: 101, type: 'Announcement', color: '#1D4ED8', bg: '#EFF6FF',
    department: 'general',
    author: 'Sarah M.', authorInitials: 'SM', authorColor: '#1D4ED8',
    archivedAt: hoursAgo(24 * 5),
    content: 'Performance reviews are due by end of month. Please submit your self-assessment via the HR portal before the 31st.',
    requiresAck: true, acknowledged: 6, totalRecipients: 6,
    reactions: { '👍': 3 }, commentCount: 2,
  },
  {
    id: 102, type: 'Team Win', color: '#065F46', bg: '#ECFDF5',
    department: 'general',
    author: 'Ben A.', authorInitials: 'BA', authorColor: '#0369A1',
    archivedAt: hoursAgo(24 * 6),
    content: 'Wrapped up the new onboarding flow. Reduced steps from 8 to 4. Great work from the dev team!',
    requiresAck: false, acknowledged: 0, totalRecipients: 6,
    reactions: { '🎉': 5, '👍': 3 }, commentCount: 2,
  },
  {
    id: 103, type: 'General Update', color: '#374151', bg: '#F9FAFB',
    department: 'general',
    author: 'James K.', authorInitials: 'JK', authorColor: '#065F46',
    archivedAt: hoursAgo(24 * 7),
    content: 'Updated the shared drive folder structure. Everything is now under /Projects/2024. Old links should still redirect.',
    requiresAck: false, acknowledged: 0, totalRecipients: 6,
    reactions: { '👍': 2 }, commentCount: 0,
  },
  {
    id: 104, type: 'Quick Question', color: '#9D174D', bg: '#FDF2F8',
    department: 'dev',
    author: 'Priya N.', authorInitials: 'PN', authorColor: '#9D174D',
    archivedAt: hoursAgo(24 * 8),
    content: 'Does anyone have the login credentials for the staging server? Need to test the new build before Friday.',
    requiresAck: false, acknowledged: 0, totalRecipients: 3,
    reactions: {}, commentCount: 3,
  },
  {
    id: 105, type: 'Announcement', color: '#1D4ED8', bg: '#EFF6FF',
    department: 'management',
    author: 'Sarah M.', authorInitials: 'SM', authorColor: '#1D4ED8',
    archivedAt: hoursAgo(24 * 14),
    content: 'Q1 financials have been submitted. We came in 4% under budget — great work from everyone on managing costs this quarter.',
    requiresAck: true, acknowledged: 2, totalRecipients: 2,
    reactions: { '👍': 2, '🎉': 1 }, commentCount: 0,
  },
  {
    id: 106, type: 'Project Update', color: '#5B21B6', bg: '#F5F3FF',
    department: 'dev',
    author: 'David O.', authorInitials: 'DO', authorColor: '#5B21B6',
    archivedAt: hoursAgo(24 * 18),
    content: 'Phase 1 of the client X migration is complete. Phase 2 starts Monday — @Priya N. please brief the team at standup.',
    requiresAck: false, acknowledged: 0, totalRecipients: 3,
    reactions: { '👍': 1 }, commentCount: 1,
  },
  {
    id: 107, type: 'Team Win', color: '#065F46', bg: '#ECFDF5',
    department: 'general',
    author: 'Tom R.', authorInitials: 'TR', authorColor: '#92400E',
    archivedAt: hoursAgo(24 * 21),
    content: 'We hit 100 paying customers today. Took us 8 months but we got there. Thank you all.',
    requiresAck: false, acknowledged: 0, totalRecipients: 6,
    reactions: { '🎉': 12, '❤️': 8, '👍': 6 }, commentCount: 7,
  },
  {
    id: 108, type: 'Announcement', color: '#1D4ED8', bg: '#EFF6FF',
    department: 'general',
    author: 'Sarah M.', authorInitials: 'SM', authorColor: '#1D4ED8',
    archivedAt: hoursAgo(24 * 32),
    content: 'New office hours from next month: 8am–4pm instead of 9am–5pm. This was voted on by the team. Parking will be arranged accordingly.',
    requiresAck: true, acknowledged: 6, totalRecipients: 6,
    reactions: { '👍': 4 }, commentCount: 3,
  },
  {
    id: 109, type: 'General Update', color: '#374151', bg: '#F9FAFB',
    department: 'finance',
    author: 'Tom R.', authorInitials: 'TR', authorColor: '#92400E',
    archivedAt: hoursAgo(24 * 45),
    content: 'Expense reports for February are due by the 10th. Please use the new template on the shared drive — the old one is no longer accepted.',
    requiresAck: false, acknowledged: 0, totalRecipients: 2,
    reactions: {}, commentCount: 0,
  },
  {
    id: 110, type: 'Project Update', color: '#5B21B6', bg: '#F5F3FF',
    department: 'dev',
    author: 'Ben A.', authorInitials: 'BA', authorColor: '#0369A1',
    archivedAt: hoursAgo(24 * 60),
    content: 'Backend API v2 is now live in production. All endpoints have been updated. Documentation has been pushed to Confluence.',
    requiresAck: false, acknowledged: 0, totalRecipients: 3,
    reactions: { '🎉': 3, '👍': 2 }, commentCount: 1,
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 28, color }) {
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

function formatDate(date) {
  const now      = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7)  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  if (diffDays < 30) return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getDateGroup(date) {
  const now      = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7)  return 'This week';
  if (diffDays < 30) return 'This month';
  if (diffDays < 60) return 'Last month';
  return 'Older';
}

function renderContent(text) {
  const parts = text.split(/(@[\w][\w\s]*\w)/g);
  return (
    <Text style={styles.postDetailContent}>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <Text key={i} style={styles.mention}>{part}</Text>
          : part
      )}
    </Text>
  );
}

// ── POST DETAIL SHEET ─────────────────────────────────────────────────────────

function PostDetailSheet({ post, onClose }) {
  if (!post) return null;
  const typeInfo = POST_TYPES.find(p => p.label === post.type);
  const dept     = DEPARTMENTS.find(d => d.id === post.department);
  const hasReactions = Object.keys(post.reactions).length > 0;

  return (
    <Modal visible={!!post} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.detailSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          {/* Colored type strip */}
          <View style={[styles.detailTypeStrip, { backgroundColor: typeInfo?.bg }]}>
            <View style={[styles.detailTypeDot, { backgroundColor: typeInfo?.color }]} />
            <Text style={[styles.detailTypeLabel, { color: typeInfo?.color }]}>
              {post.type.toUpperCase()}
            </Text>
            {dept && dept.id !== 'general' && (
              <View style={styles.detailDeptChip}>
                <Text style={styles.detailDeptChipText}>{dept.label}</Text>
              </View>
            )}
            <View style={styles.archiveBadge}>
              <Text style={styles.archiveBadgeText}>Archived</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll}>
            {/* Author + date */}
            <View style={styles.detailMeta}>
              <Avatar initials={post.authorInitials} size={32} color={post.authorColor} />
              <View>
                <Text style={styles.detailAuthor}>{post.author}</Text>
                <Text style={styles.detailDate}>{formatDate(post.archivedAt)}</Text>
              </View>
            </View>

            {/* Content */}
            <View style={styles.detailContentWrap}>
              {renderContent(post.content)}
            </View>

            {/* Ack info (read only) */}
            {post.requiresAck && (
              <View style={styles.detailAckBar}>
                <View style={styles.detailAckTrack}>
                  <View style={[styles.detailAckFill, {
                    width: `${Math.round((post.acknowledged / post.totalRecipients) * 100)}%`,
                    backgroundColor: post.acknowledged >= post.totalRecipients ? '#10B981' : typeInfo?.color,
                  }]} />
                </View>
                <Text style={styles.detailAckText}>
                  {post.acknowledged >= post.totalRecipients
                    ? 'Everyone confirmed'
                    : `${post.acknowledged} of ${post.totalRecipients} confirmed`}
                </Text>
              </View>
            )}

            {/* Reactions (read only) */}
            {hasReactions && (
              <View style={styles.detailReactions}>
                {Object.entries(post.reactions).map(([emoji, count]) => (
                  <View key={emoji} style={styles.detailReactionChip}>
                    <Text style={styles.detailReactionText}>{emoji} {count}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats */}
            <View style={styles.detailStats}>
              {post.commentCount > 0 && (
                <Text style={styles.detailStatText}>
                  {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
                </Text>
              )}
              <Text style={styles.detailStatNote}>Read only · This post has been archived</Text>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── HISTORY ROW (compact) ─────────────────────────────────────────────────────

function HistoryRow({ post, onPress }) {
  const typeInfo = POST_TYPES.find(p => p.label === post.type);
  const hasReactions = Object.keys(post.reactions).length > 0;

  return (
    <TouchableOpacity style={styles.historyRow} onPress={onPress} activeOpacity={0.8}>
      {/* Left color bar */}
      <View style={[styles.historyRowBar, { backgroundColor: typeInfo?.color }]} />

      <View style={styles.historyRowContent}>
        {/* Type + dept + time */}
        <View style={styles.historyRowTop}>
          <View style={[styles.historyTypeBadge, { backgroundColor: typeInfo?.bg }]}>
            <View style={[styles.historyTypeDot, { backgroundColor: typeInfo?.color }]} />
            <Text style={[styles.historyTypeText, { color: typeInfo?.color }]}>
              {post.type}
            </Text>
          </View>
          <Text style={styles.historyRowTime}>
            {formatDate(post.archivedAt)}
          </Text>
        </View>

        {/* Content preview */}
        <Text style={styles.historyRowText} numberOfLines={2}>
          {post.content}
        </Text>

        {/* Author + stats */}
        <View style={styles.historyRowBottom}>
          <Avatar initials={post.authorInitials} size={18} color={post.authorColor} />
          <Text style={styles.historyRowAuthor}>{post.author}</Text>

          {hasReactions && (
            <View style={styles.historyRowStats}>
              {Object.entries(post.reactions).slice(0, 2).map(([emoji, count]) => (
                <Text key={emoji} style={styles.historyRowStat}>{emoji} {count}</Text>
              ))}
            </View>
          )}

          {post.commentCount > 0 && (
            <Text style={styles.historyRowStat}>💬 {post.commentCount}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function HistoryScreen({ navigation }) {
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selected,   setSelected]   = useState(null);

  const orgName = 'Acme Corp';

  // Filter posts
  const filtered = useMemo(() => {
    return ARCHIVED_POSTS
      .filter(p => typeFilter === 'All' || p.type === typeFilter)
      .filter(p => deptFilter === 'all' || p.department === deptFilter)
      .filter(p => !search || p.content.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.archivedAt - a.archivedAt);
  }, [search, typeFilter, deptFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(p => {
      const group = getDateGroup(p.archivedAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(p);
    });
    // Return in order
    const order = ['This week', 'This month', 'Last month', 'Older'];
    return order.filter(g => groups[g]).map(g => ({ title: g, data: groups[g] }));
  }, [filtered]);

  // Flatten for FlatList with section headers
  const listItems = useMemo(() => {
    const items = [];
    grouped.forEach(group => {
      items.push({ _kind: 'header', title: group.title, count: group.data.length });
      group.data.forEach(p => items.push({ _kind: 'post', ...p }));
    });
    return items;
  }, [grouped]);

  const renderItem = ({ item }) => {
    if (item._kind === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupHeaderText}>{item.title}</Text>
          <View style={styles.groupHeaderLine} />
          <Text style={styles.groupHeaderCount}>{item.count}</Text>
        </View>
      );
    }
    return <HistoryRow post={item} onPress={() => setSelected(item)} />;
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
            <View style={styles.backBtn} />
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
            <View style={styles.backBtn} />
          </View>
        </View>
      )}

      {/* Page title + search */}
      <View style={styles.topSection}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>History</Text>
          <Text style={styles.pageSub}>{filtered.length} post{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts..."
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

        {/* Type filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {['All', ...POST_TYPES.map(p => p.label)].map(f => {
            const t      = POST_TYPES.find(p => p.label === f);
            const active = typeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.typePill, active && styles.typePillActive]}
                onPress={() => setTypeFilter(f)}
                activeOpacity={0.8}
              >
                {t && <View style={[styles.typePillDot, { backgroundColor: active ? 'rgba(255,255,255,0.7)' : t.color }]} />}
                <Text style={[styles.typePillText, active && styles.typePillTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dept filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {[{ id: 'all', label: 'All departments' }, ...DEPARTMENTS].map(d => (
            <TouchableOpacity
              key={d.id}
              style={[styles.deptPill, deptFilter === d.id && (d.id === 'all' ? styles.deptPillAllActive : styles.deptPillActive)]}
              onPress={() => setDeptFilter(d.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.deptPillText, deptFilter === d.id && (d.id === 'all' ? styles.deptPillTextAllActive : styles.deptPillTextActive)]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Post list */}
      <FlatList
        data={listItems}
        keyExtractor={(item, index) => item.id ? String(item.id) : `header-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No posts found</Text>
            <Text style={styles.emptySub}>
              {search ? 'Try a different search term.' : 'Nothing archived yet.'}
            </Text>
            {(search || typeFilter !== 'All' || deptFilter !== 'all') && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setSearch(''); setTypeFilter('All'); setDeptFilter('all'); }}
                activeOpacity={0.8}
              >
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Post detail */}
      <PostDetailSheet post={selected} onClose={() => setSelected(null)} />
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

  // Top section
  topSection: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingTop: spacing.md },
  pageTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, paddingHorizontal: spacing.page, marginBottom: spacing.md },
  pageTitle: { fontSize: 22, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  pageSub: { fontSize: 13, color: colors.subtle },

  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, paddingHorizontal: spacing.md, marginHorizontal: spacing.page, marginBottom: spacing.sm, minHeight: 42 },
  searchIcon: { fontSize: 16, color: colors.placeholder, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: colors.black },
  searchClear: { fontSize: 14, color: colors.placeholder, padding: 4 },

  // Filters
  filterScroll: { marginBottom: spacing.sm },
  filterContent: { gap: 6, paddingHorizontal: spacing.page },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  typePillActive: { backgroundColor: colors.black, borderColor: colors.black },
  typePillDot: { width: 5, height: 5, borderRadius: 3 },
  typePillText: { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  typePillTextActive: { color: colors.white },
  deptPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  deptPillActive: { backgroundColor: '#EFF6FF', borderColor: colors.brand },
  deptPillAllActive: { backgroundColor: colors.black, borderColor: colors.black },
  deptPillText: { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  deptPillTextActive: { color: colors.brand, fontWeight: typography.semibold },
  deptPillTextAllActive: { color: colors.white, fontWeight: typography.semibold },

  // List
  listContent: { paddingHorizontal: spacing.page, paddingTop: spacing.md, paddingBottom: 48 },

  // Group headers
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.md },
  groupHeaderText: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8 },
  groupHeaderLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  groupHeaderCount: { fontSize: 11, fontWeight: typography.bold, color: colors.placeholder },

  // History row — compact
  historyRow: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.xl, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  historyRowBar: { width: 3, flexShrink: 0 },
  historyRowContent: { flex: 1, padding: spacing.md },
  historyRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  historyTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  historyTypeDot: { width: 5, height: 5, borderRadius: 3 },
  historyTypeText: { fontSize: 10, fontWeight: typography.black, letterSpacing: 0.4, textTransform: 'uppercase' },
  historyRowTime: { fontSize: 11, color: colors.subtle },
  historyRowText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
  historyRowBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyRowAuthor: { fontSize: 12, color: colors.muted, fontWeight: typography.medium, flex: 1 },
  historyRowStats: { flexDirection: 'row', gap: 8 },
  historyRowStat: { fontSize: 12, color: colors.subtle },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  emptySub: { fontSize: 14, color: colors.subtle, marginBottom: spacing.lg },
  clearBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: 10 },
  clearBtnText: { fontSize: 14, fontWeight: typography.semibold, color: '#374151' },

  // Avatar
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: typography.bold },

  // Post detail sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  detailTypeStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.md, paddingVertical: 10 },
  detailTypeDot: { width: 7, height: 7, borderRadius: 4 },
  detailTypeLabel: { fontSize: 11, fontWeight: typography.black, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  detailDeptChip: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  detailDeptChipText: { fontSize: 10, fontWeight: typography.semibold, color: '#374151' },
  archiveBadge: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  archiveBadgeText: { fontSize: 10, fontWeight: typography.bold, color: '#374151' },
  detailScroll: { padding: spacing.page },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  detailAuthor: { fontSize: 14, fontWeight: typography.bold, color: colors.black },
  detailDate: { fontSize: 12, color: colors.subtle, marginTop: 1 },
  detailContentWrap: { marginBottom: spacing.md },
  postDetailContent: { fontSize: 16, color: '#1F2937', lineHeight: 25 },
  mention: { color: colors.brand, fontWeight: typography.semibold },
  detailAckBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  detailAckTrack: { width: 48, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  detailAckFill: { height: '100%', borderRadius: 2 },
  detailAckText: { fontSize: 12, color: colors.muted, flex: 1 },
  detailReactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  detailReactionChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  detailReactionText: { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },
  detailStats: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md, gap: 4 },
  detailStatText: { fontSize: 13, color: colors.muted },
  detailStatNote: { fontSize: 12, color: colors.subtle, fontStyle: 'italic' },
});