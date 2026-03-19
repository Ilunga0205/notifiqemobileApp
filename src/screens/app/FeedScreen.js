// src/screens/app/FeedScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, FlatList, Pressable,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../lib/tokens';

// ── DATA ──────────────────────────────────────────────────────────────────────

const CURRENT_USER = { name: 'Sarah M.', initials: 'SM', color: '#1D4ED8' };
const IS_ADMIN = true;

const TEAM_MEMBERS = [
  { id: 1, name: 'Sarah M.',  initials: 'SM', color: '#1D4ED8' },
  { id: 2, name: 'James K.',  initials: 'JK', color: '#065F46' },
  { id: 3, name: 'David O.',  initials: 'DO', color: '#5B21B6' },
  { id: 4, name: 'Priya N.',  initials: 'PN', color: '#9D174D' },
  { id: 5, name: 'Tom R.',    initials: 'TR', color: '#92400E' },
  { id: 6, name: 'Ben A.',    initials: 'BA', color: '#0369A1' },
];

const DEPARTMENTS = [
  { id: 'general',    label: 'General',    members: ['Sarah M.','James K.','David O.','Priya N.','Tom R.','Ben A.'] },
  { id: 'management', label: 'Management', members: ['Sarah M.','James K.'] },
  { id: 'dev',        label: 'Dev Team',   members: ['Priya N.','Ben A.','David O.'] },
  { id: 'finance',    label: 'Finance',    members: ['Sarah M.','Tom R.'] },
];

const POST_TYPES = [
  { id: 'announcement', label: 'Announcement',  color: '#1D4ED8', bg: '#EFF6FF', lightBg: '#DBEAFE' },
  { id: 'leave',        label: 'Leave Notice',   color: '#0369A1', bg: '#E0F2FE', lightBg: '#BAE6FD' },
  { id: 'project',      label: 'Project Update', color: '#5B21B6', bg: '#F5F3FF', lightBg: '#EDE9FE' },
  { id: 'question',     label: 'Quick Question', color: '#9D174D', bg: '#FDF2F8', lightBg: '#FCE7F3' },
  { id: 'win',          label: 'Team Win',        color: '#065F46', bg: '#ECFDF5', lightBg: '#D1FAE5' },
  { id: 'general',      label: 'General Update',  color: '#374151', bg: '#F9FAFB', lightBg: '#F3F4F6' },
];

const REACTION_OPTIONS = ['👍','🎉','❤️','👀','✅','🙌','🔥'];

const ON_LEAVE_TODAY = [
  { name: 'James K.', initials: 'JK', color: '#065F46', back: 'Monday' },
  { name: 'Priya N.', initials: 'PN', color: '#9D174D', back: 'Wednesday' },
];

// Auto-archive after this many hours per post type
const AUTO_ARCHIVE_HOURS = {
  'Announcement':  30 * 24,
  'Project Update': 60 * 24,
  'Quick Question':  7 * 24,
  'Team Win':       30 * 24,
  'General Update': 14 * 24,
};

// Helper — hours ago
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);

const INITIAL_FEED = [
  // ── Recent (within 48hrs) ─────────────────────────────────────────────────
  {
    id: 1, type: 'Announcement', color: '#1D4ED8', bg: '#EFF6FF',
    department: 'general', pinned: true,
    author: 'Sarah M.', authorInitials: 'SM', authorColor: '#1D4ED8',
    time: '9:04 AM', date: 'Today',
    content: 'Office closed 16 June — public holiday. Enjoy the long weekend!',
    reactions: { '👍': 4, '🎉': 2 }, commentCount: 1,
    requiresAck: true, acknowledged: ['Sarah M.', 'James K.', 'David O.'],
    totalRecipients: 6,
    seenBy: ['Sarah M.', 'James K.', 'David O.', 'Priya N.'],
    postedAt: hoursAgo(2),
  },
  {
    id: 2, type: 'Announcement', color: '#1D4ED8', bg: '#EFF6FF',
    department: 'management', pinned: false,
    author: 'Sarah M.', authorInitials: 'SM', authorColor: '#1D4ED8',
    time: '9:30 AM', date: 'Today',
    content: 'Reminder: Q2 budget review is on Friday at 3pm. Please have your reports ready.',
    reactions: {}, commentCount: 0,
    requiresAck: true, acknowledged: ['Sarah M.'], totalRecipients: 2,
    seenBy: ['Sarah M.', 'James K.'],
    postedAt: hoursAgo(4),
  },
  {
    id: 3, type: 'Team Win', color: '#065F46', bg: '#ECFDF5',
    department: 'general', pinned: false,
    author: 'David O.', authorInitials: 'DO', authorColor: '#5B21B6',
    time: '10:30 AM', date: 'Today',
    content: 'We landed the ABC account! Great work everyone — this one was a real team effort.',
    reactions: { '🎉': 8, '👍': 5, '❤️': 3 }, commentCount: 4,
    requiresAck: false, acknowledged: [], totalRecipients: 6,
    seenBy: ['Sarah M.', 'James K.', 'David O.', 'Priya N.', 'Tom R.', 'Ben A.'],
    postedAt: hoursAgo(6),
  },
  {
    id: 4, type: 'Project Update', color: '#5B21B6', bg: '#F5F3FF',
    department: 'dev', pinned: false,
    author: 'Priya N.', authorInitials: 'PN', authorColor: '#9D174D',
    time: '11:15 AM', date: 'Today',
    content: 'Client X designs ready for review. @Ben A. can you check the typography section?',
    reactions: { '👍': 1 }, commentCount: 2,
    requiresAck: false, acknowledged: [], totalRecipients: 3,
    seenBy: ['Priya N.', 'Ben A.'],
    postedAt: hoursAgo(10),
  },
  {
    id: 5, type: 'Leave Notice', color: '#0369A1', bg: '#E0F2FE',
    department: 'general', pinned: false,
    author: 'James K.', authorInitials: 'JK', authorColor: '#065F46',
    time: '8:00 AM', date: 'Today',
    content: 'Out of office 13–17 March — annual leave. Back Monday. Contact Sarah for anything urgent.',
    reactions: {}, commentCount: 0,
    requiresAck: false, acknowledged: [], totalRecipients: 6,
    seenBy: ['James K.', 'Sarah M.'],
    postedAt: hoursAgo(1),
  },
  {
    id: 6, type: 'Quick Question', color: '#9D174D', bg: '#FDF2F8',
    department: 'general', pinned: false,
    author: 'Tom R.', authorInitials: 'TR', authorColor: '#92400E',
    time: '11:45 AM', date: 'Today',
    content: 'Anyone free for a 15-min sync at 2pm? Need to align on the Q3 roadmap.',
    reactions: {}, commentCount: 3,
    requiresAck: false, acknowledged: [], totalRecipients: 6,
    seenBy: ['Tom R.', 'Sarah M.', 'James K.'],
    postedAt: hoursAgo(14),
  },
  // ── Older (beyond 48hrs — hidden by default) ──────────────────────────────
  {
    id: 6, type: 'General Update', color: '#374151', bg: '#F9FAFB',
    department: 'general', pinned: false,
    author: 'James K.', authorInitials: 'JK', authorColor: '#065F46',
    time: '3:00 PM', date: 'Monday',
    content: 'Updated the shared drive folder structure. Everything is now under /Projects/2024.',
    reactions: { '👍': 2 }, commentCount: 0,
    requiresAck: false, acknowledged: [], totalRecipients: 6,
    seenBy: ['James K.', 'Sarah M.', 'Tom R.'],
    postedAt: hoursAgo(60),
  },
  {
    id: 7, type: 'Team Win', color: '#065F46', bg: '#ECFDF5',
    department: 'general', pinned: false,
    author: 'Ben A.', authorInitials: 'BA', authorColor: '#0369A1',
    time: '10:00 AM', date: 'Monday',
    content: 'Just wrapped up the new onboarding flow. Reduced steps from 8 to 4.',
    reactions: { '🎉': 5, '👍': 3 }, commentCount: 2,
    requiresAck: false, acknowledged: [], totalRecipients: 6,
    seenBy: ['Ben A.', 'Priya N.', 'Sarah M.'],
    postedAt: hoursAgo(72),
  },
  {
    id: 8, type: 'Announcement', color: '#1D4ED8', bg: '#EFF6FF',
    department: 'general', pinned: false,
    author: 'Sarah M.', authorInitials: 'SM', authorColor: '#1D4ED8',
    time: '9:00 AM', date: 'Last week',
    content: 'Reminder: performance reviews are due by end of month. Please submit your self-assessment.',
    reactions: {}, commentCount: 1,
    requiresAck: true, acknowledged: ['Sarah M.', 'James K.', 'David O.', 'Priya N.', 'Tom R.', 'Ben A.'],
    totalRecipients: 6,
    seenBy: ['Sarah M.', 'James K.', 'David O.', 'Priya N.', 'Tom R.', 'Ben A.'],
    postedAt: hoursAgo(120),
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 32, color }) {
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2,
        backgroundColor: color ? color + '18' : '#EFF6FF',
        borderColor: color ? color + '35' : '#BFDBFE' }
    ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33, color: color || colors.brand }]}>
        {initials}
      </Text>
    </View>
  );
}


// ── BELL ICON ────────────────────────────────────────────────────────────────
function BellIcon({ color = '#6B7280', size = 17 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.75, height: size * 0.55, borderTopLeftRadius: size * 0.4, borderTopRightRadius: size * 0.4, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0 }} />
      <View style={{ width: size * 0.88, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: size * 0.3, height: 1.5, backgroundColor: color, borderRadius: 1, marginTop: 1.5 }} />
    </View>
  );
}

function renderContent(text) {
  const parts = text.split(/(@[\w][\w\s]*\w)/g);
  return (
    <Text style={styles.postContent}>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <Text key={i} style={styles.mention}>{part}</Text>
          : part
      )}
    </Text>
  );
}

// ── ACK BAR ───────────────────────────────────────────────────────────────────

function AckBar({ post, onAcknowledge, typeColor }) {
  const hasAcked = post.acknowledged.includes(CURRENT_USER.name);
  const ackCount = post.acknowledged.length;
  const total    = post.totalRecipients;
  const allAcked = ackCount >= total;
  const pct      = Math.round((ackCount / total) * 100);

  const pending = TEAM_MEMBERS
    .filter(m => DEPARTMENTS.find(d => d.id === post.department)?.members.includes(m.name))
    .filter(m => !post.acknowledged.includes(m.name))
    .map(m => m.name);

  return (
    <View style={[styles.ackBar, allAcked && styles.ackBarDone]}>
      <View style={styles.ackBarRow}>
        <View style={styles.ackLeft}>
          <View style={styles.ackTrack}>
            <View style={[styles.ackFill, {
              width: `${pct}%`,
              backgroundColor: allAcked ? '#10B981' : typeColor,
            }]} />
          </View>
          <Text style={[styles.ackLabel, allAcked && { color: '#065F46' }]}>
            {allAcked ? 'Everyone confirmed' : `${ackCount} of ${total} confirmed`}
          </Text>
        </View>
        {!hasAcked ? (
          <TouchableOpacity
            style={[styles.ackBtn, { backgroundColor: typeColor }]}
            onPress={onAcknowledge}
            activeOpacity={0.85}
          >
            <Text style={styles.ackBtnText}>✓  Confirm</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.ackDoneText}>✓  Confirmed</Text>
        )}
      </View>
      {IS_ADMIN && !allAcked && pending.length > 0 && (
        <Text style={styles.ackPending}>
          Waiting on: {pending.slice(0, 3).join(', ')}{pending.length > 3 ? ` +${pending.length - 3}` : ''}
        </Text>
      )}
    </View>
  );
}

// ── POST CARD ─────────────────────────────────────────────────────────────────

function PostCard({ post, onAcknowledge, onPin, onUnpin, onDelete, onPress }) {
  const [reactions,    setReactions]    = useState(post.reactions);
  const [showPicker,   setShowPicker]   = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment,      setComment]      = useState('');
  const [comments,     setComments]     = useState([]);
  const [showMenu,     setShowMenu]     = useState(false);

  const typeInfo    = POST_TYPES.find(p => p.label === post.type);
  const dept        = DEPARTMENTS.find(d => d.id === post.department);
  const totalInDept = dept?.members.length || post.totalRecipients;
  const totalComments = post.commentCount + comments.length;
  const hasReactions  = Object.keys(reactions).length > 0;

  const react = (emoji) => {
    setReactions(p => ({ ...p, [emoji]: (p[emoji] || 0) + 1 }));
    setShowPicker(false);
  };

  const postComment = () => {
    if (!comment.trim()) return;
    setComments(p => [...p, { text: comment, author: 'You', initials: 'SM', time: 'now' }]);
    setComment('');
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.97} style={styles.card}>

      {/* ── TYPE HEADER STRIP ── */}
      <View style={[styles.cardTypeStrip, { backgroundColor: typeInfo?.bg }]}>
        <View style={[styles.cardTypeDot, { backgroundColor: typeInfo?.color }]} />
        <Text style={[styles.cardTypeLabel, { color: typeInfo?.color }]}>
          {post.type.toUpperCase()}
        </Text>
        {post.pinned && (
          <View style={styles.pinnedChip}>
            <Text style={[styles.pinnedChipText, { color: typeInfo?.color }]}>Pinned</Text>
          </View>
        )}
        {dept && dept.id !== 'general' && (
          <View style={styles.deptChip}>
            <Text style={styles.deptChipText}>{dept.label}</Text>
          </View>
        )}

        {/* More menu */}
        {IS_ADMIN && (
          <View style={styles.menuWrap}>
            <TouchableOpacity
              onPress={() => setShowMenu(p => !p)}
              style={styles.moreBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.moreBtnText, { color: typeInfo?.color + '99' }]}>•••</Text>
            </TouchableOpacity>
            {showMenu && (
              <View style={styles.menuDropdown}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { post.pinned ? onUnpin(post.id) : onPin(post.id); setShowMenu(false); }}
                >
                  <Text style={styles.menuItemText}>{post.pinned ? 'Unpin' : 'Pin to top'}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { onDelete(post.id); setShowMenu(false); }}
                >
                  <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── CONTENT ── */}
      <View style={styles.cardBody}>
        {/* Author row */}
        <View style={styles.cardAuthorRow}>
          <Avatar initials={post.authorInitials} size={28} color={post.authorColor} />
          <Text style={styles.cardAuthor}>{post.author}</Text>
          <Text style={styles.cardTime}>{post.time}</Text>
        </View>

        {/* Message */}
        <View style={styles.cardContentWrap}>
          {renderContent(post.content)}
        </View>

        {/* Reactions */}
        {hasReactions && (
          <View style={styles.reactions}>
            {Object.entries(reactions).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionChip}
                onPress={() => react(emoji)}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionText}>{emoji} {count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ack bar */}
        {post.requiresAck && (
          <AckBar
            post={post}
            onAcknowledge={() => onAcknowledge(post.id)}
            typeColor={typeInfo?.color}
          />
        )}

        {/* ── ACTIONS ROW ── */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowPicker(p => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>React</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowComments(p => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>
              {totalComments > 0 ? `${totalComments} ${totalComments === 1 ? 'reply' : 'replies'}` : 'Reply'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.seenText}>
            Seen by {post.seenBy.length}{IS_ADMIN ? `/${totalInDept}` : ''}
          </Text>
        </View>

        {/* Reaction picker */}
        {showPicker && (
          <View style={styles.reactionPicker}>
            {REACTION_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                onPress={() => react(e)}
                style={styles.reactionPickerBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionPickerEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Comments */}
        {showComments && (
          <View style={styles.commentsWrap}>
            {comments.map((c, i) => (
              <View key={i} style={styles.commentRow}>
                <Avatar initials={c.initials} size={24} color={colors.brand} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentMeta}>{c.author} · {c.time}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <Avatar initials="SM" size={24} color={colors.brand} />
              <TextInput
                style={styles.commentInput}
                placeholder="Reply..."
                placeholderTextColor={colors.placeholder}
                value={comment}
                onChangeText={setComment}
                onSubmitEditing={postComment}
                returnKeyType="send"
              />
              {comment.trim() ? (
                <TouchableOpacity style={styles.commentSendBtn} onPress={postComment} activeOpacity={0.85}>
                  <Text style={styles.commentSendText}>Send</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── POST MODAL ────────────────────────────────────────────────────────────────

function PostModal({ visible, onClose, onPost, defaultDepartment }) {
  const [selectedType, setSelectedType] = useState(null);
  const [content,      setContent]      = useState('');
  const [department,   setDepartment]   = useState(defaultDepartment || 'general');
  const [requiresAck,  setRequiresAck]  = useState(false);

  const myDepts        = DEPARTMENTS.filter(d => d.members.includes(CURRENT_USER.name));
  const isAnnouncement = selectedType === 'Announcement';
  const typeInfo       = POST_TYPES.find(p => p.label === selectedType);

  const reset = () => {
    setSelectedType(null);
    setContent('');
    setDepartment(defaultDepartment || 'general');
    setRequiresAck(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePost = () => {
    if (!content.trim() || !selectedType) return;
    const type = POST_TYPES.find(p => p.label === selectedType);
    const dept = DEPARTMENTS.find(d => d.id === department);
    onPost({
      id: Date.now(), ...type, type: selectedType, department, pinned: false,
      author: CURRENT_USER.name, authorInitials: CURRENT_USER.initials, authorColor: CURRENT_USER.color,
      time: 'Just now', date: 'Today', content, reactions: {}, commentCount: 0,
      requiresAck: isAnnouncement && requiresAck,
      acknowledged: isAnnouncement && requiresAck ? [CURRENT_USER.name] : [],
      totalRecipients: dept?.members.length || 6,
      seenBy: [CURRENT_USER.name],
    });
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {!selectedType ? 'What type of update?' : selectedType}
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedType ? (
              /* Step 1: pick type */
              <View style={styles.typeGrid}>
                {POST_TYPES.map(({ label, color, bg, lightBg }) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.typeOption, { backgroundColor: bg, borderColor: color + '30' }]}
                    onPress={() => setSelectedType(label)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.typeOptionDot, { backgroundColor: color }]} />
                    <Text style={[styles.typeOptionText, { color }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              /* Step 2: write */
              <View style={styles.modalBody}>
                {/* Dept pills */}
                <Text style={styles.modalSectionLabel}>Post to</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }} contentContainerStyle={{ gap: 6 }}>
                  {myDepts.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.deptPill, department === d.id && { backgroundColor: typeInfo?.bg, borderColor: typeInfo?.color + '50' }]}
                      onPress={() => setDepartment(d.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.deptPillText, department === d.id && { color: typeInfo?.color, fontWeight: typography.semibold }]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Textarea */}
                <TextInput
                  style={styles.modalTextarea}
                  placeholder="Share your update..."
                  placeholderTextColor={colors.placeholder}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  autoFocus
                  maxLength={500}
                  textAlignVertical="top"
                />

                {/* Ack toggle */}
                {isAnnouncement && (
                  <TouchableOpacity
                    style={[styles.ackToggleRow, requiresAck && { backgroundColor: typeInfo?.bg, borderColor: typeInfo?.color + '40' }]}
                    onPress={() => setRequiresAck(p => !p)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ackToggleTitle, requiresAck && { color: typeInfo?.color }]}>
                        Require read confirmation
                      </Text>
                      <Text style={styles.ackToggleDesc}>Team must confirm they've read this</Text>
                    </View>
                    <View style={[styles.toggle, requiresAck && { backgroundColor: typeInfo?.color }]}>
                      <View style={[styles.toggleThumb, requiresAck && styles.toggleThumbOn]} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setSelectedType(null)}>
                    <Text style={styles.changeTypeText}>← Change type</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.postBtn, { backgroundColor: content.trim() ? typeInfo?.color : colors.border }]}
                    onPress={handlePost}
                    disabled={!content.trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.postBtnText}>Post update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function FeedScreen({ navigation }) {
  const [feed,          setFeed]          = useState(INITIAL_FEED);
  const [activeDept,    setActiveDept]    = useState('all');
  const [filter,        setFilter]        = useState('All');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEarlier,   setShowEarlier]   = useState(false);

  // Track last visit — in production this comes from AsyncStorage
  // Simulating: user last visited 1 hour ago
  const lastVisit = useRef(hoursAgo(1));

  const orgName = 'Acme Corp'; // from context later
  const now     = new Date();
  const cutoff  = new Date(now - 48 * 60 * 60 * 1000); // 48hrs ago

  const myDepts     = DEPARTMENTS.filter(d => d.members.includes(CURRENT_USER.name));
  const pendingAcks = feed.filter(p =>
    p.requiresAck && !p.acknowledged.includes(CURRENT_USER.name) &&
    myDepts.some(d => d.id === p.department)
  );

  // Filter out auto-archived posts
  const activeFeed = feed.filter(p => {
    const archiveAfter = AUTO_ARCHIVE_HOURS[p.type] || 14 * 24;
    const archiveDate  = new Date(p.postedAt.getTime() + archiveAfter * 60 * 60 * 1000);
    return now < archiveDate;
  });

  // Apply dept + type filters
  const filteredFeed = activeFeed
    .filter(p => activeDept === 'all' || p.department === activeDept)
    .filter(p => filter === 'All' || p.type === filter);

  // Split into recent (<=48hrs) and older
  const pinnedPost   = filteredFeed.find(p => p.pinned);
  const unpinnedFeed = filteredFeed.filter(p => !p.pinned);
  const recentFeed   = unpinnedFeed.filter(p => p.postedAt >= cutoff);
  const olderFeed    = unpinnedFeed.filter(p => p.postedAt < cutoff);

  // New since last visit (excluding pinned)
  const newCount = unpinnedFeed.filter(p => p.postedAt > lastVisit.current).length;

  const handleAcknowledge = (id) =>
    setFeed(prev => prev.map(p =>
      p.id === id && !p.acknowledged.includes(CURRENT_USER.name)
        ? { ...p, acknowledged: [...p.acknowledged, CURRENT_USER.name] } : p
    ));
  const handlePin    = (id) => setFeed(prev => prev.map(p => ({ ...p, pinned: p.department === prev.find(x => x.id === id)?.department ? p.id === id : p.pinned })));
  const handleUnpin  = (id) => setFeed(prev => prev.map(p => p.id === id ? { ...p, pinned: false } : p));
  const handleDelete = (id) => setFeed(prev => prev.filter(p => p.id !== id));
  const handlePost   = (post) => setFeed(prev => [{ ...post, postedAt: new Date() }, ...prev]);

  // Build the final feed items list with separators as special objects
  const buildFeedItems = () => {
    const items = [];

    // Pinned always first
    if (pinnedPost) items.push({ ...pinnedPost, _kind: 'post' });

    // "New since last visit" separator
    if (newCount > 0) {
      items.push({ _kind: 'separator_new', count: newCount });
    }

    // Recent posts
    recentFeed.forEach(p => items.push({ ...p, _kind: 'post' }));

    // All caught up state
    if (recentFeed.length === 0 && !pinnedPost) {
      items.push({ _kind: 'caught_up' });
    }

    // "Load earlier" button
    if (olderFeed.length > 0) {
      items.push({ _kind: 'load_earlier', count: olderFeed.length });
    }

    // Older posts (shown after tapping "load earlier")
    if (showEarlier) {
      items.push({ _kind: 'separator_earlier' });
      olderFeed.forEach(p => items.push({ ...p, _kind: 'post' }));
    }

    return items;
  };

  const feedItems = buildFeedItems();

  const renderHeader = () => (
    <View>
      {/* Who's out */}
      {ON_LEAVE_TODAY.length > 0 && (
        <View style={styles.leaveCard}>
          <Text style={styles.leaveTitle}>
            {ON_LEAVE_TODAY.length === 1 ? '1 person is off today' : `${ON_LEAVE_TODAY.length} people are off today`}
          </Text>
          {ON_LEAVE_TODAY.map(p => (
            <View key={p.name} style={styles.leaveRow}>
              <Avatar initials={p.initials} size={18} color={p.color} />
              <Text style={styles.leaveName}>{p.name} — back {p.back}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pending ack banner */}
      {pendingAcks.length > 0 && (
        <View style={styles.ackBanner}>
          <View style={styles.ackBannerDot} />
          <Text style={styles.ackBannerText}>
            <Text style={{ fontWeight: typography.bold }}>
              {pendingAcks.length} announcement{pendingAcks.length > 1 ? 's' : ''}
            </Text>{' '}need your confirmation
          </Text>
          <TouchableOpacity onPress={() => setFilter('Announcement')} style={styles.ackBannerBtn}>
            <Text style={styles.ackBannerBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dept pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={styles.pillsContent}>
        {[{ id: 'all', label: 'All' }, ...myDepts].map(d => (
          <TouchableOpacity
            key={d.id}
            style={[styles.pill, activeDept === d.id && (d.id === 'all' ? styles.pillAllActive : styles.pillActive)]}
            onPress={() => setActiveDept(d.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeDept === d.id && (d.id === 'all' ? styles.pillTextAllActive : styles.pillTextActive)]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={styles.pillsContent}>
        {['All', ...POST_TYPES.map(p => p.label)].map(f => {
          const t      = POST_TYPES.find(p => p.label === f);
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.typePill, active && styles.typePillActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              {t && <View style={[styles.typePillDot, { backgroundColor: active ? 'rgba(255,255,255,0.7)' : t.color }]} />}
              <Text style={[styles.typePillText, active && styles.typePillTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }) => {
    // New since last visit separator
    if (item._kind === 'separator_new') {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <View style={styles.separatorBadge}>
            <View style={styles.separatorDot} />
            <Text style={styles.separatorText}>
              {item.count} new since your last visit
            </Text>
          </View>
          <View style={styles.separatorLine} />
        </View>
      );
    }

    // All caught up
    if (item._kind === 'caught_up') {
      return (
        <View style={styles.caughtUp}>
          <Text style={styles.caughtUpTitle}>You're all caught up</Text>
          <Text style={styles.caughtUpSub}>Nothing new in the last 48 hours.</Text>
        </View>
      );
    }

    // Load earlier button
    if (item._kind === 'load_earlier') {
      return (
        <TouchableOpacity
          style={styles.loadEarlier}
          onPress={() => setShowEarlier(p => !p)}
          activeOpacity={0.8}
        >
          <View style={styles.loadEarlierLine} />
          <Text style={styles.loadEarlierText}>
            {showEarlier ? 'Hide earlier posts' : `Load ${item.count} earlier post${item.count > 1 ? 's' : ''}`}
          </Text>
          <View style={styles.loadEarlierLine} />
        </TouchableOpacity>
      );
    }

    // Earlier separator
    if (item._kind === 'separator_earlier') {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorEarlierText}>Earlier</Text>
          <View style={styles.separatorLine} />
        </View>
      );
    }

    // Regular post card
    return (
      <PostCard
        post={item}
        onAcknowledge={handleAcknowledge}
        onPin={handlePin}
        onUnpin={handleUnpin}
        onDelete={handleDelete}
        onPress={() => navigation.getParent().navigate('PostDetail', { post: item })}
      />
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* White block that covers status bar + header.
          On Android: translucent status bar, we pad by StatusBar.currentHeight
          On iOS: SafeAreaView handles it automatically */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={{ backgroundColor: colors.white }}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('History')} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={[styles.appOrg, styles.appOrgTappable]} numberOfLines={1}>{orgName}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Inbox')} style={styles.bellBtn} activeOpacity={0.8}>
              <BellIcon color={pendingAcks.length > 0 ? '#DC2626' : colors.muted} />
              {pendingAcks.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Profile')} activeOpacity={0.8}>
              <Avatar initials="SM" size={30} color={colors.brand} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('History')} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={[styles.appOrg, styles.appOrgTappable]} numberOfLines={1}>{orgName}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Inbox')} style={styles.bellBtn} activeOpacity={0.8}>
              <BellIcon color={pendingAcks.length > 0 ? '#DC2626' : colors.muted} />
              {pendingAcks.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Profile')} activeOpacity={0.8}>
              <Avatar initials="SM" size={30} color={colors.brand} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Feed */}
      <FlatList
        data={feedItems}
        keyExtractor={(item, index) => item.id ? String(item.id) : `${item._kind}-${index}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No posts here yet</Text>
            <Text style={styles.emptySubtitle}>Try clearing your filters or post the first update.</Text>
          </View>
        }
        contentContainerStyle={styles.feedList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowPostModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <PostModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPost={handlePost}
        defaultDepartment={activeDept === 'all' ? 'general' : activeDept}
      />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header block — covers status bar + nav bar, white all the way up
  headerBlock: {
    backgroundColor: colors.white,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    height: 52,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  appLogo:   { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent: { color: colors.brand },
  appSep:    { fontSize: 14, color: colors.border },
  appOrg:    { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  appOrgTappable: { color: colors.brand, textDecorationLine: 'underline', textDecorationColor: colors.brand + '50' },
  bellBtn: { position: 'relative', width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626', borderWidth: 1.5, borderColor: colors.white },


  // Feed
  feedList: { paddingHorizontal: spacing.page, paddingTop: spacing.md, paddingBottom: 100 },

  // Leave card
  leaveCard:  { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  leaveTitle: { fontSize: 13, fontWeight: typography.bold, color: '#374151', marginBottom: 5 },
  leaveRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  leaveName:  { fontSize: 12, color: colors.muted },

  // Ack banner
  ackBanner:      { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ackBannerDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626', flexShrink: 0 },
  ackBannerText:  { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },
  ackBannerBtn:   { borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ackBannerBtnText: { fontSize: 12, fontWeight: typography.semibold, color: '#DC2626' },

  // Pills
  pillsRow:     { marginBottom: spacing.sm },
  pillsContent: { gap: 6, paddingRight: spacing.page },
  pill:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  pillActive:   { backgroundColor: '#EFF6FF', borderColor: colors.brand },
  pillAllActive: { backgroundColor: colors.black, borderColor: colors.black },
  pillText:         { fontSize: 13, fontWeight: typography.medium, color: colors.muted },
  pillTextActive:    { color: colors.brand, fontWeight: typography.semibold },
  pillTextAllActive: { color: colors.white, fontWeight: typography.semibold },
  typePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  typePillActive: { backgroundColor: colors.black, borderColor: colors.black },
  typePillDot:  { width: 5, height: 5, borderRadius: 3 },
  typePillText: { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  typePillTextActive: { color: colors.white },

  // ── POST CARD ──
  card: { backgroundColor: colors.white, borderRadius: radius.xl, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },

  // Type strip — the hero
  cardTypeStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.md, paddingVertical: 10 },
  cardTypeDot:   { width: 7, height: 7, borderRadius: 4 },
  cardTypeLabel: { fontSize: 11, fontWeight: typography.black, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  pinnedChip:    { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  pinnedChipText: { fontSize: 10, fontWeight: typography.bold },
  deptChip:      { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.06)' },
  deptChipText:  { fontSize: 10, fontWeight: typography.semibold, color: '#374151' },

  // Menu
  menuWrap:    { position: 'relative' },
  moreBtn:     { padding: 4 },
  moreBtnText: { fontSize: 13, letterSpacing: 1 },
  menuDropdown: { position: 'absolute', top: 28, right: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, minWidth: 150, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  menuItem:    { paddingHorizontal: spacing.md, paddingVertical: 14 },
  menuItemText: { fontSize: 14, fontWeight: typography.medium, color: '#374151' },
  menuDivider: { height: 1, backgroundColor: colors.borderLight },

  // Card body
  cardBody:        { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  cardAuthorRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  cardAuthor:      { fontSize: 13, fontWeight: typography.semibold, color: colors.black, flex: 1 },
  cardTime:        { fontSize: 11, color: colors.subtle },
  cardContentWrap: { marginBottom: 12 },
  postContent:     { fontSize: 15, color: '#1F2937', lineHeight: 23, fontWeight: '400' },
  mention:         { color: colors.brand, fontWeight: typography.semibold },

  // Reactions
  reactions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  reactionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  reactionText: { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },

  // Ack bar
  ackBar:     { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.sm, marginBottom: 10 },
  ackBarDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  ackBarRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ackLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ackTrack:   { width: 48, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  ackFill:    { height: '100%', borderRadius: 2 },
  ackLabel:   { fontSize: 12, color: colors.muted },
  ackBtn:     { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  ackBtnText: { fontSize: 12, fontWeight: typography.bold, color: colors.white },
  ackDoneText: { fontSize: 12, fontWeight: typography.semibold, color: '#065F46' },
  ackPending: { fontSize: 11, color: colors.subtle, marginTop: 4 },

  // Actions
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  actionText:  { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  seenText:    { marginLeft: 'auto', fontSize: 12, color: colors.subtle },

  // Reaction picker
  reactionPicker:     { flexDirection: 'row', paddingTop: 8, gap: 4 },
  reactionPickerBtn:  { padding: 6, borderRadius: 8, backgroundColor: '#F9FAFB' },
  reactionPickerEmoji: { fontSize: 20 },

  // Comments
  commentsWrap:    { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8, marginTop: 8 },
  commentRow:      { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentBubble:   { flex: 1, backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 10 },
  commentMeta:     { fontSize: 11, color: colors.subtle, marginBottom: 2 },
  commentText:     { fontSize: 13, color: '#374151', lineHeight: 18 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput:    { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: colors.black, backgroundColor: '#F9FAFB' },
  commentSendBtn:  { backgroundColor: colors.brand, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  commentSendText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  // Avatar
  avatar:     { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: typography.bold },

  // Empty
  emptyWrap:     { alignItems: 'center', paddingVertical: 48 },
  emptyTitle:    { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: colors.subtle, textAlign: 'center' },

  // ── FEED SEPARATORS ──
  separator: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginVertical: spacing.md,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  separatorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.brandLight,
    borderWidth: 1, borderColor: colors.brandBorder,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  separatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand },
  separatorText: { fontSize: 12, fontWeight: typography.semibold, color: colors.brand },
  separatorEarlierText: { fontSize: 12, fontWeight: typography.semibold, color: colors.subtle, paddingHorizontal: spacing.sm },

  // Load earlier
  loadEarlier: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginVertical: spacing.md,
  },
  loadEarlierLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  loadEarlierText: { fontSize: 12, fontWeight: typography.semibold, color: colors.muted, paddingHorizontal: spacing.sm },

  // Caught up
  caughtUp: {
    alignItems: 'center', paddingVertical: spacing.xl,
    borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: radius.lg, marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  caughtUpTitle: { fontSize: 14, fontWeight: typography.bold, color: colors.black, marginBottom: 4 },
  caughtUpSub:   { fontSize: 13, color: colors.subtle },

  // FAB
  fab:     { position: 'absolute', bottom: 24, right: spacing.page, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabText: { fontSize: 28, color: colors.white, lineHeight: 32, fontWeight: '300' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  sheetHandle:  { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle:   { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  modalCloseText: { fontSize: 16, color: colors.subtle, padding: 4 },
  typeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.page },
  typeOption:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, width: '47%' },
  typeOptionDot: { width: 9, height: 9, borderRadius: 5 },
  typeOptionText: { fontSize: 14, fontWeight: typography.semibold },
  modalBody:    { padding: spacing.page },
  modalSectionLabel: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  deptPill:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  deptPillText: { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  modalTextarea: { minHeight: 110, fontSize: 15, color: colors.black, lineHeight: 22, marginBottom: spacing.md },
  ackToggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, marginBottom: spacing.md },
  ackToggleTitle: { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },
  ackToggleDesc:  { fontSize: 11, color: colors.subtle, marginTop: 2 },
  toggle:        { width: 36, height: 20, borderRadius: 100, backgroundColor: colors.border, padding: 2 },
  toggleThumb:   { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  toggleThumbOn: { alignSelf: 'flex-end' },
  modalFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  changeTypeText: { fontSize: 13, color: colors.muted },
  postBtn:       { borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: 12 },
  postBtnText:   { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
});