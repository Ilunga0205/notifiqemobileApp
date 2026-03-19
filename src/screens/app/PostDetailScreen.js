// src/screens/app/PostDetailScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CURRENT_USER = { name: 'Sarah M.', initials: 'SM', color: '#1D4ED8' };
const TEAM_MEMBERS = [
  { id: 1, name: 'Sarah M.',  initials: 'SM', color: '#1D4ED8' },
  { id: 2, name: 'James K.',  initials: 'JK', color: '#065F46' },
  { id: 3, name: 'David O.',  initials: 'DO', color: '#5B21B6' },
  { id: 4, name: 'Priya N.',  initials: 'PN', color: '#9D174D' },
  { id: 5, name: 'Tom R.',    initials: 'TR', color: '#92400E' },
  { id: 6, name: 'Ben A.',    initials: 'BA', color: '#0369A1' },
];

const REACTION_OPTIONS = ['👍','🎉','❤️','👀','✅','🙌','🔥'];

function Avatar({ initials, size = 32, color }) {
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

export default function PostDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Post comes from navigation params
  const { post } = route.params || {};

  const [reactions,    setReactions]    = useState(post?.reactions || {});
  const [comments,     setComments]     = useState([]);
  const [comment,      setComment]      = useState('');
  const [showPicker,   setShowPicker]   = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  if (!post) return null;

  const typeInfo = { color: post.color, bg: post.bg };
  const totalComments = (post.commentCount || 0) + comments.length;
  const hasReactions  = Object.keys(reactions).length > 0;

  const react = (emoji) => {
    setReactions(p => ({ ...p, [emoji]: (p[emoji] || 0) + 1 }));
    setShowPicker(false);
  };

  const handleCommentChange = (text) => {
    setComment(text);
    const lastAt = text.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === text.length - 1) {
      setShowMentions(true);
      setMentionQuery('');
    } else if (lastAt !== -1) {
      setShowMentions(true);
      setMentionQuery(text.slice(lastAt + 1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name) => {
    const lastAt = comment.lastIndexOf('@');
    setComment(comment.slice(0, lastAt) + `@${name} `);
    setShowMentions(false);
  };

  const postComment = () => {
    if (!comment.trim()) return;
    setComments(p => [...p, {
      id: Date.now(),
      text: comment,
      author: CURRENT_USER.name,
      initials: CURRENT_USER.initials,
      color: CURRENT_USER.color,
      time: 'Just now',
    }]);
    setComment('');
    setShowMentions(false);
  };

  const filteredMembers = TEAM_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(mentionQuery)
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
            <Text style={styles.headerTitle}>Post</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 52 : 0}
      >
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Post card ── */}
          <View style={styles.postCard}>
            {/* Type strip */}
            <View style={[styles.typeStrip, { backgroundColor: typeInfo.bg }]}>
              <View style={[styles.typeDot, { backgroundColor: typeInfo.color }]} />
              <Text style={[styles.typeLabel, { color: typeInfo.color }]}>
                {post.type.toUpperCase()}
              </Text>
              {post.pinned && (
                <View style={styles.pinnedChip}>
                  <Text style={[styles.pinnedChipText, { color: typeInfo.color }]}>Pinned</Text>
                </View>
              )}
            </View>

            <View style={styles.postBody}>
              {/* Author */}
              <View style={styles.authorRow}>
                <Avatar initials={post.authorInitials} size={36} color={post.authorColor} />
                <View>
                  <Text style={styles.authorName}>{post.author}</Text>
                  <Text style={styles.authorTime}>{post.date} · {post.time}</Text>
                </View>
              </View>

              {/* Content — full, no truncation */}
              <View style={styles.contentWrap}>
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
                <View style={[styles.ackBar, post.acknowledged?.length >= post.totalRecipients && styles.ackBarDone]}>
                  <View style={styles.ackTrack}>
                    <View style={[styles.ackFill, {
                      width: `${Math.round(((post.acknowledged?.length || 0) / post.totalRecipients) * 100)}%`,
                      backgroundColor: post.acknowledged?.length >= post.totalRecipients ? '#10B981' : post.color,
                    }]} />
                  </View>
                  <Text style={styles.ackText}>
                    {post.acknowledged?.length >= post.totalRecipients
                      ? 'Everyone confirmed'
                      : `${post.acknowledged?.length || 0} of ${post.totalRecipients} confirmed`}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPicker(p => !p)} activeOpacity={0.7}>
                  <Text style={styles.actionText}>React</Text>
                </TouchableOpacity>
                <Text style={styles.commentCount}>
                  {totalComments > 0 ? `${totalComments} ${totalComments === 1 ? 'reply' : 'replies'}` : 'No replies yet'}
                </Text>
              </View>

              {/* Reaction picker */}
              {showPicker && (
                <View style={styles.reactionPicker}>
                  {REACTION_OPTIONS.map(e => (
                    <TouchableOpacity key={e} onPress={() => react(e)} style={styles.reactionPickerBtn} activeOpacity={0.7}>
                      <Text style={styles.reactionPickerEmoji}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ── Comments ── */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionLabel}>
              {totalComments > 0 ? `${totalComments} ${totalComments === 1 ? 'Reply' : 'Replies'}` : 'Replies'}
            </Text>

            {totalComments === 0 && (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>No replies yet. Be the first to respond.</Text>
              </View>
            )}

            {/* Existing comments from post */}
            {post.commentCount > 0 && (
              <View style={styles.commentPlaceholder}>
                <Text style={styles.commentPlaceholderText}>
                  {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'} — will load from Supabase
                </Text>
              </View>
            )}

            {/* New comments */}
            {comments.map(c => (
              <View key={c.id} style={styles.commentRow}>
                <Avatar initials={c.initials} size={28} color={c.color} />
                <View style={styles.commentBubble}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{c.author}</Text>
                    <Text style={styles.commentTime}>{c.time}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}

            {/* Mention suggestions */}
            {showMentions && filteredMembers.length > 0 && (
              <View style={styles.mentionList}>
                {filteredMembers.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.mentionRow}
                    onPress={() => insertMention(m.name)}
                    activeOpacity={0.8}
                  >
                    <Avatar initials={m.initials} size={26} color={m.color} />
                    <Text style={styles.mentionName}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>

        {/* ── Reply input — fixed at bottom ── */}
        <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Avatar initials="SM" size={28} color={colors.brand} />
          <TextInput
            style={styles.replyInput}
            placeholder="Reply... (@ to mention)"
            placeholderTextColor={colors.placeholder}
            value={comment}
            onChangeText={handleCommentChange}
            multiline
            returnKeyType="send"
            onSubmitEditing={postComment}
          />
          {comment.trim() && (
            <TouchableOpacity style={styles.sendBtn} onPress={postComment} activeOpacity={0.85}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerBlock: { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backBtn: { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: colors.brand, fontWeight: '300', lineHeight: 32 },
  headerTitle: { fontSize: 15, fontWeight: typography.bold, color: colors.black },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.page, paddingTop: spacing.md },

  // Post card
  postCard: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', marginBottom: spacing.md },
  typeStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.md, paddingVertical: 10 },
  typeDot: { width: 7, height: 7, borderRadius: 4 },
  typeLabel: { fontSize: 11, fontWeight: typography.black, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  pinnedChip: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pinnedChipText: { fontSize: 10, fontWeight: typography.bold },
  postBody: { padding: spacing.md },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  authorName: { fontSize: 15, fontWeight: typography.bold, color: colors.black },
  authorTime: { fontSize: 12, color: colors.subtle, marginTop: 1 },
  contentWrap: { marginBottom: spacing.md },
  postContent: { fontSize: 16, color: '#1F2937', lineHeight: 26 },
  mention: { color: colors.brand, fontWeight: typography.semibold },

  // Reactions
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  reactionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  reactionText: { fontSize: 14, fontWeight: typography.semibold, color: '#374151' },

  // Ack bar
  ackBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  ackBarDone: { backgroundColor: '#F0FDF4' },
  ackTrack: { width: 48, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  ackFill: { height: '100%', borderRadius: 2 },
  ackText: { fontSize: 12, color: colors.muted, flex: 1 },

  // Actions
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  actionText: { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  commentCount: { fontSize: 13, color: colors.subtle },

  // Reaction picker
  reactionPicker: { flexDirection: 'row', gap: 4, paddingTop: spacing.sm, flexWrap: 'wrap' },
  reactionPickerBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F9FAFB' },
  reactionPickerEmoji: { fontSize: 22 },

  // Comments section
  commentsSection: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  commentsSectionLabel: { fontSize: 13, fontWeight: typography.bold, color: colors.black, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  noComments: { padding: spacing.lg, alignItems: 'center' },
  noCommentsText: { fontSize: 13, color: colors.subtle, textAlign: 'center' },
  commentPlaceholder: { padding: spacing.md, backgroundColor: colors.surface, margin: spacing.sm, borderRadius: radius.md },
  commentPlaceholderText: { fontSize: 12, color: colors.subtle, fontStyle: 'italic' },
  commentRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  commentBubble: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: typography.bold, color: colors.black },
  commentTime: { fontSize: 11, color: colors.subtle },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },

  // Mentions
  mentionList: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, margin: spacing.sm, overflow: 'hidden' },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight, minHeight: 48 },
  mentionName: { fontSize: 14, fontWeight: typography.semibold, color: colors.black },

  // Reply bar — padding handled via insets in component
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight },
  replyInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 100, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 14, color: colors.black, backgroundColor: '#F9FAFB', maxHeight: 100 },
  sendBtn: { backgroundColor: colors.brand, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  sendBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  // Avatar
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: typography.bold },
});