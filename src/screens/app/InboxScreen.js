// src/screens/app/InboxScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet,  Platform, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';

// ── DATA ──────────────────────────────────────────────────────────────────────

const CURRENT_USER = { name: 'Abel I.', initials: 'AI', color: '#1D4ED8' };

const MOCK_INBOX = [
  {
    id: 'i1',
    kind: 'mention',        // @ tagged you
    done: false,
    post: {
      id: 4,
      type: 'Announcement',
      typeColor: '#1D4ED8',
      typeBg: '#EFF6FF',
      author: 'Sarah M.',
      authorInitials: 'SM',
      authorColor: '#1D4ED8',
      content: 'Abel please can you make sure the website is updated before the client meeting on Friday.',
      time: '9:04 AM',
      date: 'Today',
    },
  },
  {
    id: 'i2',
    kind: 'ack',            // confirm read
    done: false,
    post: {
      id: 2,
      type: 'Announcement',
      typeColor: '#1D4ED8',
      typeBg: '#EFF6FF',
      author: 'James K.',
      authorInitials: 'JK',
      authorColor: '#065F46',
      content: 'Q2 budget review is on Friday at 3pm. Please have your reports ready.',
      time: '9:30 AM',
      date: 'Today',
    },
  },
  {
    id: 'i3',
    kind: 'question',       // direct question — @mentioned you specifically
    done: false,
    post: {
      id: 5,
      type: 'Quick Question',
      typeColor: '#92400E',
      typeBg: '#FEF3C7',
      author: 'Tom R.',
      authorInitials: 'TR',
      authorColor: '#92400E',
      content: '@Abel are you able to handle the server check before 2pm today?',
      time: '11:45 AM',
      date: 'Today',
    },
  },
  // Done items
  {
    id: 'i4',
    kind: 'mention',
    done: true,
    doneAt: 'Yesterday',
    post: {
      id: 6,
      type: 'Project Update',
      typeColor: '#5B21B6',
      typeBg: '#F5F3FF',
      author: 'Priya N.',
      authorInitials: 'PN',
      authorColor: '#9D174D',
      content: 'Phase 2 starts Monday — @Abel please brief the team at standup.',
      time: '3:00 PM',
      date: 'Yesterday',
    },
  },
  {
    id: 'i5',
    kind: 'ack',
    done: true,
    doneAt: 'Monday',
    post: {
      id: 8,
      type: 'Announcement',
      typeColor: '#1D4ED8',
      typeBg: '#EFF6FF',
      author: 'Sarah M.',
      authorInitials: 'SM',
      authorColor: '#1D4ED8',
      content: 'New office hours from next month: 8am–4pm instead of 9am–5pm.',
      time: '9:00 AM',
      date: 'Monday',
    },
  },
];

// ── KIND CONFIG ───────────────────────────────────────────────────────────────

const KIND_CONFIG = {
  mention:  { label: 'Tagged you',   color: '#1D4ED8', bg: '#EFF6FF', icon: '@' },
  ack:      { label: 'Confirm read', color: '#DC2626', bg: '#FEF2F2', icon: '!' },
  question: { label: 'Asked you',    color: '#92400E', bg: '#FEF3C7', icon: '?' },
};

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

function renderContent(text) {
  const parts = text.split(/(@[\w][\w\s]*[\w.])/g);
  return (
    <Text style={styles.itemContent} numberOfLines={3}>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <Text key={i} style={styles.mention}>{part}</Text>
          : part
      )}
    </Text>
  );
}

// ── INBOX ITEM ────────────────────────────────────────────────────────────────

function InboxItem({ item, onDone, onConfirm }) {
  const [replyOpen,   setReplyOpen]   = useState(false);
  const [replyText,   setReplyText]   = useState('');
  const [replySent,   setReplySent]   = useState(false);
  const kind = KIND_CONFIG[item.kind];

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplySent(true);
    setReplyText('');
    setTimeout(() => {
      setReplyOpen(false);
      setReplySent(false);
      onDone(item.id);
    }, 800);
  };

  const handleDone = () => {
    if (item.kind === 'ack') onConfirm(item.id);
    else onDone(item.id);
  };

  return (
    <View style={styles.item}>
      {/* Type strip */}
      <View style={[styles.itemStrip, { backgroundColor: kind.bg }]}>
        <View style={[styles.itemStripDot, { backgroundColor: kind.color }]} />
        <Text style={[styles.itemStripLabel, { color: kind.color }]}>
          {kind.label.toUpperCase()}
        </Text>
        <Text style={styles.itemTime}>{item.post.date} · {item.post.time}</Text>
      </View>

      {/* Body */}
      <View style={styles.itemBody}>
        {/* Author + post type */}
        <View style={styles.itemAuthorRow}>
          <Avatar initials={item.post.authorInitials} size={24} color={item.post.authorColor} />
          <Text style={styles.itemAuthor}>{item.post.author}</Text>
          <View style={[styles.itemTypeBadge, { backgroundColor: item.post.typeBg }]}>
            <Text style={[styles.itemTypeBadgeText, { color: item.post.typeColor }]}>
              {item.post.type}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.itemContentWrap}>
          {renderContent(item.post.content)}
        </View>

        {/* Actions */}
        {!replyOpen ? (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.doneBtn, { borderColor: kind.color + '40', backgroundColor: kind.bg }]}
              onPress={handleDone}
              activeOpacity={0.85}
            >
              <Text style={[styles.doneBtnText, { color: kind.color }]}>
                {item.kind === 'ack' ? 'Confirm' : 'Mark done'}
              </Text>
            </TouchableOpacity>

            {item.kind !== 'ack' && (
              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => setReplyOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.replyBtnText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Inline reply sheet */
          <View style={styles.replySheet}>
            <View style={styles.replyInputRow}>
              <Avatar initials={CURRENT_USER.initials} size={26} color={CURRENT_USER.color} />
              <TextInput
                style={styles.replyInput}
                placeholder={replySent ? 'Sent!' : 'Type your reply...'}
                placeholderTextColor={replySent ? '#10B981' : colors.placeholder}
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
                multiline
                maxLength={500}
              />
            </View>
            <View style={styles.replyFooter}>
              <TouchableOpacity
                onPress={() => { setReplyOpen(false); setReplyText(''); }}
                style={styles.replyCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.replyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.replySendBtn, !replyText.trim() && styles.replySendBtnDisabled]}
                onPress={handleSendReply}
                disabled={!replyText.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.replySendText}>Send reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── DONE ITEM (compact) ───────────────────────────────────────────────────────

function DoneItem({ item }) {
  const kind = KIND_CONFIG[item.kind];
  return (
    <View style={styles.doneItem}>
      <View style={[styles.doneItemCheck, { backgroundColor: '#ECFDF5' }]}>
        <Text style={styles.doneItemCheckText}>✓</Text>
      </View>
      <View style={styles.doneItemInfo}>
        <Text style={styles.doneItemAuthor}>{item.post.author}</Text>
        <Text style={styles.doneItemContent} numberOfLines={1}>{item.post.content}</Text>
      </View>
      <Text style={styles.doneItemTime}>{item.doneAt}</Text>
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function InboxScreen({ navigation }) {
  const [items,        setItems]        = useState(MOCK_INBOX);
  const [doneExpanded, setDoneExpanded] = useState(false);

  const orgName = 'Acme Corp';

  const pending = items.filter(i => !i.done);
  const done    = items.filter(i => i.done);

  const handleDone = (id) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, done: true, doneAt: 'Just now' } : i
    ));
  };

  const handleConfirm = (id) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, done: true, doneAt: 'Just now' } : i
    ));
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

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page title */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Inbox</Text>
            {pending.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pending.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.pageSub}>Things the team needs from you</Text>
        </View>

        {/* All caught up */}
        {pending.length === 0 && (
          <View style={styles.caughtUp}>
            <Text style={styles.caughtUpIcon}>✓</Text>
            <Text style={styles.caughtUpTitle}>You're all caught up</Text>
            <Text style={styles.caughtUpSub}>Nothing needs your attention right now.</Text>
          </View>
        )}

        {/* Pending items */}
        {pending.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>
              NEEDS YOUR ATTENTION · {pending.length}
            </Text>
            <View style={styles.groupList}>
              {pending.map((item, i) => (
                <View key={item.id}>
                  <InboxItem
                    item={item}
                    onDone={handleDone}
                    onConfirm={handleConfirm}
                  />
                  {i < pending.length - 1 && <View style={styles.itemDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Done section — collapsed by default */}
        {done.length > 0 && (
          <View style={styles.group}>
            <TouchableOpacity
              style={styles.doneHeader}
              onPress={() => setDoneExpanded(p => !p)}
              activeOpacity={0.8}
            >
              <Text style={styles.groupLabel}>DONE · {done.length}</Text>
              <Text style={styles.doneChevron}>{doneExpanded ? '▾' : '▸'}</Text>
            </TouchableOpacity>

            {doneExpanded && (
              <View style={styles.doneList}>
                {done.map((item, i) => (
                  <View key={item.id}>
                    <DoneItem item={item} />
                    {i < done.length - 1 && <View style={styles.itemDivider} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerBlock: { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  backBtn: { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: colors.brand, fontWeight: '300', lineHeight: 32 },
  appLogo: { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent: { color: colors.brand },
  appSep: { fontSize: 14, color: colors.border },
  appOrg: { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.page, paddingTop: spacing.lg },

  // Page header
  pageHeader: { marginBottom: spacing.lg },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  pendingBadge: { backgroundColor: '#DC2626', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  pendingBadgeText: { fontSize: 12, fontWeight: typography.bold, color: colors.white },
  pageSub: { fontSize: 13, color: colors.subtle },

  // Caught up
  caughtUp: { alignItems: 'center', paddingVertical: 56, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.lg },
  caughtUpIcon: { fontSize: 28, color: '#10B981', marginBottom: spacing.md },
  caughtUpTitle: { fontSize: 17, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  caughtUpSub: { fontSize: 14, color: colors.subtle },

  // Groups
  group: { marginBottom: spacing.lg },
  groupLabel: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  groupList: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  itemDivider: { height: 1, backgroundColor: colors.borderLight },

  // Inbox item
  item: { overflow: 'hidden' },
  itemStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.md, paddingVertical: 9 },
  itemStripDot: { width: 6, height: 6, borderRadius: 3 },
  itemStripLabel: { fontSize: 10, fontWeight: typography.black, letterSpacing: 0.8, flex: 1 },
  itemTime: { fontSize: 11, color: colors.subtle },
  itemBody: { padding: spacing.md, paddingBottom: spacing.lg },
  itemAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  itemAuthor: { fontSize: 13, fontWeight: typography.bold, color: colors.black, flex: 1 },
  itemTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  itemTypeBadgeText: { fontSize: 10, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  itemContentWrap: { marginBottom: 18 },
  itemContent: { fontSize: 14, color: '#374151', lineHeight: 21 },
  mention: { color: colors.brand, fontWeight: typography.semibold },

  // Item actions
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  doneBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  doneBtnText: { fontSize: 13, fontWeight: typography.bold },
  replyBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.white },
  replyBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },

  // Inline reply sheet
  replySheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  replyInputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  replyInput: { flex: 1, fontSize: 14, color: colors.black, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' },
  replyFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  replyCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  replyCancelText: { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  replySendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.brand },
  replySendBtnDisabled: { backgroundColor: colors.border },
  replySendText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  // Done section
  doneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  doneChevron: { fontSize: 14, color: colors.subtle, fontWeight: typography.bold },
  doneList: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  doneItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 52 },
  doneItemCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneItemCheckText: { fontSize: 12, color: '#065F46', fontWeight: typography.bold },
  doneItemInfo: { flex: 1, minWidth: 0 },
  doneItemAuthor: { fontSize: 12, fontWeight: typography.semibold, color: colors.muted },
  doneItemContent: { fontSize: 13, color: colors.subtle },
  doneItemTime: { fontSize: 11, color: colors.placeholder, flexShrink: 0 },

  // Avatar
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: typography.bold },
});