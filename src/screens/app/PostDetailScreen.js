// src/screens/app/PostDetailScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  getPostType, reactToPost, acknowledgePost, addComment, getPosts,
} from '../../services/post.service';
import CommentInput from '../../components/CommentInput';

const REACTION_OPTIONS = ['👍','🎉','❤️','👀','✅','🙌','🔥'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 32, color }) {
  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color ? color + '18' : '#EFF6FF',
      borderColor:     color ? color + '35' : '#BFDBFE',
    }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33, color: color || colors.brand }]}>
        {initials}
      </Text>
    </View>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const postDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (postDay.getTime() === today.getTime()) return time;
  if (postDay.getTime() === yesterday.getTime()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`;
}

function renderContent(text, typeColor) {
  if (!text) return null;
  const parts = text.split(/(@[^\s]+)/g);
  return (
    <Text style={styles.postContent}>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <Text key={i} style={[styles.mention, { color: typeColor }]}>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PostDetailScreen({ navigation, route }) {
  const { user, orgId, isAdmin, profile } = useApp();
  const { post: passedPost, postId } = route.params || {};

  const [post,         setPost]         = useState(passedPost || null);
  const [loading,      setLoading]      = useState(!passedPost);
  const [showPicker,   setShowPicker]   = useState(false);
  const [deptMembers,  setDeptMembers]  = useState([]);

  const loadDataRef = useRef(null);

  // ── Load post ─────────────────────────────────────────────────────────

  const loadPost = useCallback(async () => {
    if (!orgId || !user?.id) return;
    const id = postId || passedPost?.id;
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, type, content, created_at, pinned, requires_ack,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials),
          department:departments(id, name,
            department_members(user_id,
              profiles(id, full_name, avatar_color, avatar_initials)
            )
          ),
          reactions(emoji, user_id),
          post_acknowledgements(user_id),
          post_seen(user_id),
          comments(id, content, created_at,
            author:profiles!comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const typeInfo = getPostType(data.type);
      const reactMap = {};
      const userReactions = [];
      (data.reactions || []).forEach(r => {
        reactMap[r.emoji] = (reactMap[r.emoji] || 0) + 1;
        if (r.user_id === user.id) userReactions.push(r.emoji);
      });

      setPost({
        id:              data.id,
        type:            data.type,
        content:         data.content,
        postedAt:        new Date(data.created_at),
        pinned:          data.pinned,
        requiresAck:     data.requires_ack,
        author:          data.author?.full_name || 'Unknown',
        authorId:        data.author?.id,
        authorInitials:  data.author?.avatar_initials ||
          (data.author?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
        authorColor:     data.author?.avatar_color || colors.brand,
        departmentId:    data.department?.id,
        departmentName:  data.department?.name,
        reactions:       reactMap,
        userReactions,
        ackCount:        (data.post_acknowledgements || []).length,
        userHasAcked:    (data.post_acknowledgements || []).some(a => a.user_id === user.id),
        seenCount:       (data.post_seen || []).length,
        comments:        (data.comments || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)),
        totalRecipients: (data.department?.department_members || []).length,
        typeColor:       typeInfo.color,
        typeBg:          typeInfo.bg,
        typeLabel:       typeInfo.label,
      });

      // Set dept members for @mention
      setDeptMembers(data.department?.department_members || []);
    } catch (err) {
      console.warn('[PostDetail] load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.id, postId, passedPost?.id]);

  useEffect(() => { loadDataRef.current = loadPost; });

  useEffect(() => {
    if (orgId && user?.id) loadPost();
  }, [orgId, user?.id, loadPost]);

  // ── Realtime ──────────────────────────────────────────────────────────

  useEffect(() => {
    const id = postId || passedPost?.id;
    if (!id) return;
    const reload = () => loadDataRef.current?.();
    const channel = supabase
      .channel(`post-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions',             filter: `post_id=eq.${id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments',              filter: `post_id=eq.${id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_acknowledgements', filter: `post_id=eq.${id}` }, reload)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [postId, passedPost?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleReact = async (emoji) => {
    if (!post) return;
    const hasReacted = post.userReactions?.includes(emoji);
    setPost(prev => {
      const reactions = { ...prev.reactions };
      const userReactions = [...(prev.userReactions || [])];
      if (hasReacted) {
        if (reactions[emoji] > 1) reactions[emoji]--; else delete reactions[emoji];
        return { ...prev, reactions, userReactions: userReactions.filter(e => e !== emoji) };
      } else {
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...prev, reactions, userReactions: [...userReactions, emoji] };
      }
    });
    setShowPicker(false);
    await reactToPost(post.id, user.id, emoji);
  };

  const handleAck = async () => {
    if (!post || post.userHasAcked) return;
    setPost(prev => ({ ...prev, userHasAcked: true, ackCount: prev.ackCount + 1 }));
    await acknowledgePost(post.id, user.id);
  };

  const handleComment = async (text, mentionedIds) => {
    await addComment(post.id, user.id, text, mentionedIds);
    await loadPost();
  };

  // ── Loading / empty ───────────────────────────────────────────────────

  if (loading || !post) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.subtle, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  const isMyPost       = post.authorId === user?.id;
  const allAcked       = post.ackCount >= (post.totalRecipients || 1);
  const ackPct         = Math.min(100, Math.round((post.ackCount / (post.totalRecipients || 1)) * 100));
  const isDoneComment  = (c) => c.content?.startsWith('✓') && c.content?.includes('marked this done');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={[styles.typeBadge, { backgroundColor: post.typeBg }]}>
              <Text style={[styles.typeLabel, { color: post.typeColor }]}>{post.typeLabel}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      ) : (
        <View style={[styles.headerBlock, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={[styles.typeBadge, { backgroundColor: post.typeBg }]}>
              <Text style={[styles.typeLabel, { color: post.typeColor }]}>{post.typeLabel}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post body */}
          <View style={[styles.postCard, { borderLeftColor: post.typeColor }]}>
            <View style={styles.authorRow}>
              <Avatar initials={post.authorInitials} size={36} color={post.authorColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{post.author}</Text>
                {post.departmentName && (
                  <Text style={styles.deptName}>{post.departmentName}</Text>
                )}
              </View>
              <Text style={styles.postTime}>{formatTime(post.postedAt)}</Text>
            </View>

            {renderContent(post.content, post.typeColor)}

            {/* Reactions */}
            {Object.keys(post.reactions || {}).length > 0 && (
              <View style={styles.reactions}>
                {Object.entries(post.reactions).map(([emoji, count]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reactionChip, post.userReactions?.includes(emoji) && styles.reactionChipActive]}
                    onPress={() => handleReact(emoji)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reactionText}>{emoji} {count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reaction picker */}
            {showPicker && (
              <View style={styles.picker}>
                {REACTION_OPTIONS.map(e => (
                  <TouchableOpacity key={e} onPress={() => handleReact(e)} style={styles.pickerBtn} activeOpacity={0.7}>
                    <Text style={styles.pickerEmoji}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPicker(p => !p)} activeOpacity={0.7}>
                <Text style={styles.actionText}>React</Text>
              </TouchableOpacity>
              {isAdmin && (
                <Text style={styles.seenText}>Seen {post.seenCount}/{post.totalRecipients}</Text>
              )}
            </View>

            {/* Ack bar */}
            {post.requiresAck && (
              <View style={[styles.ackBar, allAcked && styles.ackBarDone]}>
                <View style={styles.ackBarRow}>
                  <View style={styles.ackLeft}>
                    <View style={styles.ackTrack}>
                      <View style={[styles.ackFill, { width: `${ackPct}%`, backgroundColor: allAcked ? '#10B981' : post.typeColor }]} />
                    </View>
                    <Text style={[styles.ackLabel, allAcked && { color: '#065F46' }]}>
                      {allAcked ? 'Everyone confirmed' : `${post.ackCount} of ${post.totalRecipients} confirmed`}
                    </Text>
                  </View>
                  {!post.userHasAcked ? (
                    <TouchableOpacity style={[styles.ackBtn, { backgroundColor: post.typeColor }]} onPress={handleAck} activeOpacity={0.85}>
                      <Text style={styles.ackBtnText}>✓ Confirm</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.ackDone}>✓ Confirmed</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Comments section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>
              {post.comments?.length || 0} {(post.comments?.length || 0) === 1 ? 'reply' : 'replies'}
            </Text>

            {(post.comments || []).map((c, i) => {
              const done = isDoneComment(c);
              return (
                <View key={c.id || i} style={done ? styles.doneComment : styles.commentRow}>
                  {done ? (
                    <Text style={styles.doneCommentText}>{c.content}</Text>
                  ) : (
                    <>
                      <Avatar
                        initials={c.author?.avatar_initials ||
                          (c.author?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                        size={28}
                        color={c.author?.avatar_color}
                      />
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentMeta}>
                          {c.author?.full_name || 'Unknown'} · {formatTime(c.created_at)}
                        </Text>
                        <Text style={styles.commentText}>{c.content}</Text>
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        {/* Reply input */}
        <View style={styles.replyWrap}>
          <CommentInput
            orgId={orgId}
            departmentId={post.departmentId}
            authorId={user?.id}
            placeholder="Reply..."
            onSend={handleComment}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#F3F4F6' },
  headerBlock:     { backgroundColor: colors.white, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header:          { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, backgroundColor: colors.white },
  backBtn:         { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText:     { fontSize: 28, color: colors.brand, fontWeight: '300', lineHeight: 32 },
  typeBadge:       { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  typeLabel:       { fontSize: 12, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll:          { flex: 1 },
  scrollContent:   { padding: spacing.page, paddingBottom: 24 },
  postCard:        { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, borderLeftWidth: 4, padding: spacing.md, marginBottom: spacing.md },
  authorRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  authorName:      { fontSize: 14, fontWeight: typography.bold, color: colors.black },
  deptName:        { fontSize: 12, color: colors.subtle, marginTop: 1 },
  postTime:        { fontSize: 12, color: colors.subtle },
  postContent:     { fontSize: 16, color: '#1F2937', lineHeight: 24, marginBottom: spacing.md },
  mention:         { fontWeight: '600' },
  reactions:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  reactionChip:    { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  reactionChipActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  reactionText:    { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },
  picker:          { flexDirection: 'row', paddingVertical: 8, gap: 4 },
  pickerBtn:       { padding: 6, borderRadius: 8, backgroundColor: '#F9FAFB' },
  pickerEmoji:     { fontSize: 22 },
  actions:         { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: spacing.sm },
  actionBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  actionText:      { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  seenText:        { marginLeft: 'auto', fontSize: 12, color: colors.subtle },
  ackBar:          { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
  ackBarDone:      { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  ackBarRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ackLeft:         { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ackTrack:        { width: 48, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  ackFill:         { height: '100%', borderRadius: 2 },
  ackLabel:        { fontSize: 12, color: colors.muted },
  ackBtn:          { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  ackBtnText:      { fontSize: 12, fontWeight: typography.bold, color: colors.white },
  ackDone:         { fontSize: 12, fontWeight: typography.semibold, color: '#065F46' },
  commentsSection: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
  commentsHeader:  { fontSize: 13, fontWeight: typography.bold, color: colors.black, marginBottom: spacing.md },
  commentRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  commentBubble:   { flex: 1, backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 10 },
  commentMeta:     { fontSize: 11, color: colors.subtle, marginBottom: 3 },
  commentText:     { fontSize: 14, color: '#374151', lineHeight: 20 },
  doneComment:     { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#6EE7B7', marginBottom: spacing.sm },
  doneCommentText: { fontSize: 14, color: '#065F46', fontWeight: '700' },
  replyWrap:       { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight, padding: spacing.md, paddingBottom: Platform.OS === 'ios' ? 32 : spacing.md },
  avatar:          { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { fontWeight: typography.bold },
});