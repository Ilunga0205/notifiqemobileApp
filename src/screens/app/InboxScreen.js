// src/screens/app/InboxScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { getPostType, acknowledgePost, addComment } from '../../services/post.service';
import CommentInput from '../../components/CommentInput';

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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 60000);
  if (diff < 1)   return 'just now';
  if (diff < 60)  return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24)     return `${h}h ago`;
  if (h < 48)     return 'yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── For You Card ──────────────────────────────────────────────────────────────

function ForYouCard({ item, onMarkDone, onPress, onReply, isReplying, replyText, setReplyText, sendingReply, orgId, userId }) {
  const typeInfo = getPostType(item.postType);
  const isCompleted = item.content?.startsWith('✓') && item.content?.includes('marked this done');
  const kindMeta = isCompleted
    ? { label: 'Completed your task', color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' }
    : item.kind === 'mention'
    ? { label: 'Mentioned you — action needed', color: '#5B21B6', bg: '#F5F3FF', border: '#DDD6FE' }
    : { label: 'Replied to your post', color: '#065F46', bg: '#ECFDF5', border: '#BBF7D0' };

  return (
    <TouchableOpacity
      style={[styles.card, item.done && styles.cardDone]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Kind strip */}
      <View style={[styles.kindStrip, { backgroundColor: kindMeta.bg, borderBottomColor: kindMeta.border }]}>
        <View style={[styles.kindDot, { backgroundColor: kindMeta.color }]} />
        <Text style={[styles.kindLabel, { color: kindMeta.color }]}>{kindMeta.label}</Text>
        <Text style={styles.timeAgoText}>{timeAgo(item.createdAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        {/* Post type context */}
        <View style={[styles.postTypeBadge, { backgroundColor: typeInfo.bg }]}>
          <Text style={[styles.postTypeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>

        {/* Original post context for replies */}
        {item.kind === 'reply' && item.originalContent ? (
          <Text style={styles.originalContent} numberOfLines={2}>
            Your post: "{item.originalContent}"
          </Text>
        ) : null}

        {/* Author + content */}
        <View style={styles.authorRow}>
          <Avatar initials={item.authorInitials} size={24} color={item.authorColor} />
          <Text style={styles.authorName}>{item.author}</Text>
        </View>
        <Text style={styles.content} numberOfLines={3}>
          {(() => {
            const typeInfo = getPostType(item.postType);
            const parts = (item.content || '').split(/(@[^\s]+)/g);
            return parts.map((part, i) =>
              part.startsWith('@')
                ? <Text key={i} style={{ color: typeInfo.color, fontWeight: '600' }}>{part}</Text>
                : <Text key={i} style={{ color: '#374151' }}>{part}</Text>
            );
          })()}
        </Text>

        {/* Actions */}
        {item.done ? (
          <Text style={styles.doneLabel}>✓  Done</Text>
        ) : isCompleted ? (
          // Completion notification — just view, no action needed
          <TouchableOpacity style={[styles.viewBtn, { alignSelf: 'flex-start' }]} onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.viewBtnText}>View post →</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.actionRow}>
              {/* Reply inline button */}
              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => onReply(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.replyBtnText}>
                  {isReplying ? 'Cancel' : '↩ Reply'}
                </Text>
              </TouchableOpacity>

              {/* Mark done — only for task and quick_question */}
              {(item.postType === 'task' || item.postType === 'quick_question') && item.kind === 'mention' && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => onMarkDone(item)} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>✓  Mark done</Text>
                </TouchableOpacity>
              )}

              {/* View post — for all types */}
              <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.8}>
                <Text style={styles.viewBtnText}>View →</Text>
              </TouchableOpacity>
            </View>

            {/* Inline reply with @mention support */}
            {isReplying && (
              <View style={{ marginTop: 8 }}>
                <CommentInput
                  orgId={orgId}
                  departmentId={null}
                  authorId={userId}
                  placeholder="Reply... (@ to mention)"
                  onSend={async (text, mentionedIds) => {
                    await addComment(item.postId, userId, text, mentionedIds);
                    onReply(null); // close reply box
                  }}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Confirmation Card ─────────────────────────────────────────────────────────

function ConfirmationCard({ item, onAck, onPress }) {
  const typeInfo = getPostType(item.postType);

  return (
    <TouchableOpacity
      style={[styles.card, item.done && styles.cardDone]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Strip */}
      <View style={[styles.kindStrip, {
        backgroundColor: item.done ? '#F0FDF4' : '#FEF2F2',
        borderBottomColor: item.done ? '#BBF7D0' : '#FECACA',
      }]}>
        <View style={[styles.kindDot, { backgroundColor: item.done ? '#065F46' : '#DC2626' }]} />
        <Text style={[styles.kindLabel, { color: item.done ? '#065F46' : '#DC2626' }]}>
          {item.done ? 'Confirmed' : 'Needs your confirmation'}
        </Text>
        <Text style={styles.timeAgoText}>{timeAgo(item.createdAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.postTypeBadge, { backgroundColor: typeInfo.bg }]}>
          <Text style={[styles.postTypeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>

        <View style={styles.authorRow}>
          <Avatar initials={item.authorInitials} size={24} color={item.authorColor} />
          <Text style={styles.authorName}>{item.author}</Text>
        </View>
        <Text style={styles.content} numberOfLines={3}>
          {(() => {
            const typeInfo = getPostType(item.postType);
            const parts = (item.content || '').split(/(@[^\s]+)/g);
            return parts.map((part, i) =>
              part.startsWith('@')
                ? <Text key={i} style={{ color: typeInfo.color, fontWeight: '600' }}>{part}</Text>
                : <Text key={i} style={{ color: '#374151' }}>{part}</Text>
            );
          })()}
        </Text>

        {!item.done ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.8}>
              <Text style={styles.viewBtnText}>View post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ackBtn} onPress={() => onAck(item)} activeOpacity={0.85}>
              <Text style={styles.ackBtnText}>✓  Confirm read</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.confirmedLabel}>✓  Confirmed</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function InboxScreen({ navigation }) {
  const { user, orgId, profile } = useApp();

  const [forYouItems,    setForYouItems]    = useState([]);
  const [confirmItems,   setConfirmItems]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('foryou');
  const [donePostIds,   setDonePostIds]   = useState(new Set()); // from DB
  const [replyingTo,    setReplyingTo]    = useState(null);
  const [replyText,     setReplyText]     = useState('');
  const [sendingReply,  setSendingReply]  = useState(false);
  const [showDone,      setShowDone]      = useState(false);
  const listRef = useRef(null);

  const loadDataRef = useRef(null);

  // ── Load task completions from DB ──────────────────────────────────────
  const loadCompletions = useCallback(async () => {
    if (!user?.id || !orgId) return;
    const { data } = await supabase
      .from('task_completions')
      .select('post_id')
      .eq('user_id', user.id);
    if (data) setDonePostIds(new Set(data.map(d => d.post_id)));
  }, [user?.id, orgId]);

  useEffect(() => {
    if (user?.id && orgId) loadCompletions();
  }, [user?.id, orgId, loadCompletions]);

  // ── Load inbox ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!orgId || !user?.id) return;
    try {
      // ── For You: mentions ─────────────────────────────────────────────
      // Fetch comment-based mentions
      const { data: commentMentions, error: cm_err } = await supabase
        .from('comment_mentions')
        .select(`
          id, comment_id,
          comments!comment_mentions_comment_id_fkey(
            id, content, created_at, post_id,
            author:profiles!comments_author_id_fkey(id, full_name, avatar_color, avatar_initials),
            posts!comments_post_id_fkey(id, type, content, created_at, org_id,
              author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials)
            )
          )
        `)
        .eq('mentioned_user_id', user.id)
        .not('comment_id', 'is', null)
        .order('id', { ascending: false })
        .limit(50);
      console.log('[Inbox] comment mentions:', commentMentions?.length, cm_err?.message);

      // Fetch post-body mentions separately
      const { data: postMentions, error: pm_err } = await supabase
        .from('comment_mentions')
        .select(`
          id, post_id,
          posts!comment_mentions_post_id_fkey(
            id, type, content, created_at, org_id,
            author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials)
          )
        `)
        .eq('mentioned_user_id', user.id)
        .not('post_id', 'is', null)
        .is('comment_id', null)
        .order('id', { ascending: false })
        .limit(50);
      console.log('[Inbox] post mentions:', postMentions?.length, pm_err?.message);
      console.log('[Inbox] post mentions raw:', JSON.stringify(postMentions));

      const mentions = { commentMentions: commentMentions || [], postMentions: postMentions || [] };

      // ── For You: replies to my posts ───────────────────────────────────
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, type, content')
        .eq('org_id', orgId)
        .eq('author_id', user.id);

      let replies = [];
      if (myPosts?.length > 0) {
        const { data: replyData } = await supabase
          .from('comments')
          .select(`
            id, content, created_at, post_id,
            author:profiles!comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
          `)
          .in('post_id', myPosts.map(p => p.id))
          .neq('author_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        replies = replyData || [];
      }

      // Build For You list
      const forYou = [];

      // Comment mentions
      mentions.commentMentions.forEach(m => {
        const comment = m.comments;
        const post    = comment?.posts;
        if (!comment || !post) return;
        if (post.org_id !== orgId) return;
        forYou.push({
          id:               `mention-${m.id}`,
          kind:             'mention',
          postId:           post.id,
          postType:         post.type,
          author:           comment.author?.full_name || 'Unknown',
          authorInitials:   comment.author?.avatar_initials || getInitials(comment.author?.full_name),
          authorColor:      comment.author?.avatar_color || colors.brand,
          originalAuthorId: post.author?.id,
          content:          comment.content,
          createdAt:        comment.created_at,
        });
      });

      // Post-body mentions (tasks, announcements with @)
      mentions.postMentions.forEach(m => {
        const post = m.posts;
        if (!post) return;
        if (post.org_id !== orgId) return;
        forYou.push({
          id:               `mention-${m.id}`,
          kind:             'mention',
          postId:           post.id,
          postType:         post.type,
          author:           post.author?.full_name || 'Unknown',
          authorInitials:   post.author?.avatar_initials || getInitials(post.author?.full_name),
          authorColor:      post.author?.avatar_color || colors.brand,
          originalAuthorId: post.author?.id,
          content:          post.content,
          createdAt:        post.created_at,
        });
      });

      // Replies
      replies.forEach(reply => {
        const post = myPosts?.find(p => p.id === reply.post_id);
        forYou.push({
          id:              `reply-${reply.id}`,
          kind:            'reply',
          postId:          reply.post_id,
          postType:        post?.type || 'general_update',
          originalContent: post?.content || '',
          author:          reply.author?.full_name || 'Unknown',
          authorInitials:  reply.author?.avatar_initials || getInitials(reply.author?.full_name),
          authorColor:     reply.author?.avatar_color || colors.brand,
          content:         reply.content,
          createdAt:       reply.created_at,
        });
      });

      // Sort newest first
      forYou.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setForYouItems(forYou);

      // ── Confirmations ──────────────────────────────────────────────────
      const { data: ackPosts } = await supabase
        .from('posts')
        .select(`
          id, type, content, created_at,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials),
          post_acknowledgements(user_id),
          departments(id, name, department_members(user_id))
        `)
        .eq('org_id', orgId)
        .eq('requires_ack', true)
        .order('created_at', { ascending: false });

      const confirms = [];
      ;(ackPosts || []).forEach(post => {
        const deptMembers = post.departments?.department_members || [];
        const isInDept    = deptMembers.some(m => m.user_id === user.id);
        if (!isInDept) return;

        const hasAcked = (post.post_acknowledgements || []).some(a => a.user_id === user.id);
        confirms.push({
          id:             `ack-${post.id}`,
          kind:           'ack',
          done:           hasAcked,
          postId:         post.id,
          postType:       post.type,
          author:         post.author?.full_name || 'Unknown',
          authorInitials: post.author?.avatar_initials || getInitials(post.author?.full_name),
          authorColor:    post.author?.avatar_color || colors.brand,
          content:        post.content,
          createdAt:      post.created_at,
        });
      });

      // Pending first
      confirms.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setConfirmItems(confirms);

    } catch (err) {
      console.warn('InboxScreen loadData error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.id]);

  useEffect(() => { loadDataRef.current = loadData; });

  useEffect(() => {
    if (orgId && user?.id) loadData();
  }, [orgId, user?.id, loadData]);

  // ── Realtime ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const reload = () => loadDataRef.current?.();
    const channel = supabase
      .channel(`inbox-${orgId}-${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_acknowledgements' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_mentions'      }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments'              }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `org_id=eq.${orgId}` }, reload)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, user?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleReply = async (item) => {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {

      await addComment(item.postId, user.id, replyText.trim(), []);
      setReplyText('');
      setReplyingTo(null);
      await loadData();
    } catch (e) {
      console.warn('[Inbox] reply error:', e.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleAck = async (item) => {
    setConfirmItems(prev => prev.map(i => i.id === item.id ? { ...i, done: true } : i));
    await acknowledgePost(item.postId, user.id);
  };

  const handleMarkDone = async (item) => {
    // Optimistic update
    setDonePostIds(prev => new Set([...prev, item.postId]));
    setForYouItems(prev => prev.map(i => i.id === item.id ? { ...i, done: true } : i));

    try {
      // Save to DB — persistent record
      await supabase
        .from('task_completions')
        .upsert({ post_id: item.postId, user_id: user.id }, { onConflict: 'post_id,user_id' });

      // Post system comment — sender sees it on feed card AND in their Inbox
      const doneName = profile?.full_name || 'Someone';
      await addComment(
        item.postId,
        user.id,
        `✓ ${doneName} marked this done`,
        [item.originalAuthorId].filter(Boolean)
      );
    } catch (e) {
      console.warn('[Inbox] mark done error:', e.message);
    }
  };

  const handlePress = (item) => {
    // Inbox and PostDetail are both in AppStack — same level
    navigation.navigate('PostDetail', { postId: item.postId });
  };

  // ── Counts ──────────────────────────────────────────────────────────────

  // Mark items done if their postId is in completions
  const forYouDisplay = forYouItems
    .map(i => ({ ...i, done: i.done || donePostIds.has(i.postId) }))
    // Sort: pending task/question first, replies after, done last
    .sort((a, b) => {
      const aActionable = (a.postType === 'task' || a.postType === 'quick_question') && a.kind === 'mention';
      const bActionable = (b.postType === 'task' || b.postType === 'quick_question') && b.kind === 'mention';
      if (a.done !== b.done) return a.done ? 1 : -1;         // done goes to bottom
      if (aActionable !== bActionable) return aActionable ? -1 : 1; // actionable on top
      return new Date(b.createdAt) - new Date(a.createdAt);  // newest first within group
    });

  const forYouPending  = forYouDisplay.filter(i => !i.done && (i.postType === 'task' || i.postType === 'quick_question') && i.kind === 'mention').length;
  const confirmPending = confirmItems.filter(i => !i.done).length;
  const totalPending   = forYouPending + confirmPending;

  // ── Render ──────────────────────────────────────────────────────────────

  const renderEmpty = (tab) => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>✓</Text>
      </View>
      <Text style={styles.emptyTitle}>
        {tab === 'foryou' ? 'Nothing for you yet' : 'All confirmed'}
      </Text>
      <Text style={styles.emptySub}>
        {tab === 'foryou'
          ? 'Mentions and replies to your posts will appear here.'
          : 'You\'ve confirmed all announcements. Good work.'}
      </Text>
    </View>
  );

  const Header = () => (
    <View>
      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.appHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Inbox</Text>
              {totalPending > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalPending}</Text>
                </View>
              )}
            </View>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      ) : (
        <View style={[styles.headerBlock, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
          <View style={styles.appHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Inbox</Text>
              {totalPending > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalPending}</Text>
                </View>
              )}
            </View>
            <View style={{ width: 36 }} />
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'foryou' && styles.tabActive]}
          onPress={() => setActiveTab('foryou')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'foryou' && styles.tabTextActive]}>
            For you {forYouPending > 0 ? `(${forYouPending})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'confirm' && styles.tabActive]}
          onPress={() => setActiveTab('confirm')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'confirm' && styles.tabTextActive]}>
            Confirmations {confirmPending > 0 ? `(${confirmPending})` : ''}
          </Text>
        </TouchableOpacity>
      </View>


    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Fixed header — outside FlatList to avoid white box */}
      <Header />

      {activeTab === 'foryou' && !loading && (
        <View style={styles.summaryStrip}>
          {forYouPending > 0 && (
            <View style={[styles.summaryChip, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <Text style={[styles.summaryChipText, { color: '#5B21B6' }]}>
                {forYouPending} action{forYouPending > 1 ? 's' : ''} needed
              </Text>
            </View>
          )}
          {(() => {
            const actCount = forYouDisplay.filter(i => !i.done && !(
              (i.postType === 'task' || i.postType === 'quick_question') && i.kind === 'mention' &&
              !(i.content?.startsWith('✓'))
            )).length;
            return actCount > 0 ? (
              <View style={[styles.summaryChip, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.summaryChipText, { color: '#065F46' }]}>
                  {actCount} activit{actCount > 1 ? 'ies' : 'y'}
                </Text>
              </View>
            ) : null;
          })()}
          {(() => {
            const doneCount = forYouDisplay.filter(i => i.done).length;
            return doneCount > 0 ? (
              <TouchableOpacity
                style={[styles.summaryChip, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}
                onPress={() => {
                  setShowDone(true);
                  setTimeout(() => {
                    listRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.summaryChipText, { color: colors.muted }]}>
                  {doneCount} done ↓
                </Text>
              </TouchableOpacity>
            ) : null;
          })()}
        </View>
      )}

      {activeTab === 'foryou' ? (
        <FlatList
          ref={listRef}
          data={loading ? [] : (() => {
            const isActionable = (i) =>
              !i.done &&
              (i.postType === 'task' || i.postType === 'quick_question') &&
              i.kind === 'mention' &&
              !(i.content?.startsWith('✓') && i.content?.includes('marked this done'));

            const isActivity = (i) => !i.done && !isActionable(i);

            const actionItems   = forYouDisplay.filter(isActionable);
            const activityItems = forYouDisplay.filter(isActivity);
            const doneItems_    = forYouDisplay.filter(i => i.done);

            const items = [];
            if (actionItems.length > 0) {
              items.push({ _kind: 'section', id: 's1', label: `NEEDS YOUR ACTION · ${actionItems.length}` });
              items.push(...actionItems);
            }
            if (activityItems.length > 0) {
              items.push({ _kind: 'section', id: 's2', label: 'ACTIVITY' });
              items.push(...activityItems);
            }
            if (doneItems_.length > 0) {
              const DONE_LIMIT = 10;
              const visibleDone = doneItems_.slice(0, DONE_LIMIT);
              const hiddenCount = doneItems_.length - DONE_LIMIT;
              items.push({ _kind: 'section', id: 's3', label: `DONE · ${doneItems_.length}`, collapsible: true, count: doneItems_.length });
              if (showDone) {
                items.push(...visibleDone);
                if (hiddenCount > 0) {
                  items.push({ _kind: 'done_more', id: 'done_more', hiddenCount });
                }
              }
            }
            return items;
          })()}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item._kind === 'done_more') {
              return (
                <View style={styles.doneMoreWrap}>
                  <Text style={styles.doneMoreText}>
                    + {item.hiddenCount} more completed tasks — check History to see all
                  </Text>
                </View>
              );
            }
            if (item._kind === 'section') {
              if (item.collapsible) {
                return (
                  <TouchableOpacity
                    style={styles.sectionDivider}
                    onPress={() => setShowDone(p => !p)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionLine} />
                    <Text style={styles.sectionLabel}>
                      {item.label} {showDone ? '▲' : '▼'}
                    </Text>
                    <View style={styles.sectionLine} />
                  </TouchableOpacity>
                );
              }
              return (
                <View style={styles.sectionDivider}>
                  <View style={styles.sectionLine} />
                  <Text style={styles.sectionLabel}>{item.label}</Text>
                  <View style={styles.sectionLine} />
                </View>
              );
            }
            return (
              <ForYouCard
                item={item}
                onMarkDone={handleMarkDone}
                onPress={() => handlePress(item)}
                orgId={orgId}
                userId={user?.id}
                onReply={(i) => {
                  if (i === null) { setReplyingTo(null); return; }
                  setReplyingTo(prev => prev?.id === i.id ? null : i);
                  setReplyText('');
                }}
                isReplying={replyingTo?.id === item.id}
                replyText={replyingTo?.id === item.id ? replyText : ''}
                setReplyText={setReplyText}
                sendingReply={sendingReply}
              />
            );
          }}
          ListEmptyComponent={!loading ? renderEmpty('foryou') : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={loading ? [] : confirmItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ConfirmationCard
              item={item}
              onAck={handleAck}
              onPress={() => handlePress(item)}
            />
          )}
          ListEmptyComponent={!loading ? renderEmpty('confirm') : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F3F4F6' },
  headerBlock:      { backgroundColor: colors.white, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appHeader:        { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, backgroundColor: colors.white },
  backBtn:          { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  backBtnText:      { fontSize: 28, color: colors.brand, fontWeight: '300', lineHeight: 32 },
  headerCenter:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:      { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  badge:            { backgroundColor: '#DC2626', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText:        { fontSize: 11, fontWeight: typography.bold, color: colors.white },
  tabs:             { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tab:              { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:        { borderBottomColor: colors.brand },
  tabText:          { fontSize: 13, fontWeight: typography.medium, color: colors.muted },
  tabTextActive:    { color: colors.brand, fontWeight: typography.semibold },

  listContent:      { paddingHorizontal: spacing.page, paddingTop: spacing.sm, paddingBottom: 60, gap: spacing.sm },
  card:             { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  cardDone:         { opacity: 0.55 },
  kindStrip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1 },
  kindDot:          { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  kindLabel:        { fontSize: 11, fontWeight: typography.bold, letterSpacing: 0.3, flex: 1 },
  timeAgoText:      { fontSize: 11, color: colors.subtle },
  cardBody:         { padding: spacing.md },
  postTypeBadge:    { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: spacing.sm },
  postTypeText:     { fontSize: 10, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  authorRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  authorName:       { fontSize: 13, fontWeight: typography.semibold, color: colors.black },
  content:          { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: spacing.sm },
  originalContent:  { fontSize: 12, color: colors.subtle, fontStyle: 'italic', marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.borderLight },
  actionRow:        { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  viewBtn:          { flex: 1, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  viewBtnText:      { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  doneBtn:          { flex: 1, paddingVertical: 9, borderRadius: radius.md, backgroundColor: '#5B21B6', alignItems: 'center' },
  doneBtnText:      { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  doneLabel:        { fontSize: 12, color: '#5B21B6', fontWeight: typography.semibold, marginTop: 4 },
  sectionDivider:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  sectionLine:      { flex: 1, height: 1, backgroundColor: colors.borderLight },
  sectionLabel:     { fontSize: 10, fontWeight: '700', color: colors.subtle, letterSpacing: 0.8 },
  summaryStrip:     { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.page, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  summaryChip:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  summaryChipText:  { fontSize: 12, fontWeight: '600' },
  doneMoreWrap:     { paddingVertical: 12, alignItems: 'center' },
  doneMoreText:     { fontSize: 12, color: colors.subtle, textAlign: 'center', fontStyle: 'italic' },
  replyBtn:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  replyBtnText:     { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  inlineReply:      { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  inlineInput:      { flex: 1, borderWidth: 1, borderColor: colors.brand, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7, fontSize: 13, color: colors.black, backgroundColor: colors.white },
  inlineSend:       { backgroundColor: colors.brand, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  inlineSendText:   { fontSize: 12, fontWeight: typography.semibold, color: colors.white },
  ackBtn:           { flex: 1, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center' },
  ackBtnText:       { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  confirmedLabel:   { fontSize: 12, color: '#065F46', fontWeight: typography.semibold, marginTop: 4 },
  emptyWrap:        { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.page },
  emptyIcon:        { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyIconText:    { fontSize: 22, color: '#065F46', fontWeight: typography.bold },
  emptyTitle:       { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  emptySub:         { fontSize: 14, color: colors.subtle, textAlign: 'center', lineHeight: 21 },
  avatar:           { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:       { fontWeight: typography.bold },
});