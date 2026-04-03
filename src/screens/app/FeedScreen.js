// src/screens/app/FeedScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, FlatList, Pressable,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  POST_TYPES, getPostType,
  getPosts, createPost, pinPost, unpinPost, deletePost,
  reactToPost, acknowledgePost, addComment, markPostsSeen,
  getOnLeaveToday,
} from '../../services/post.service';
import { getDepartments } from '../../services/member.service';

const REACTION_OPTIONS = ['👍','🎉','❤️','👀','✅','🙌','🔥'];

const AUTO_ARCHIVE_HOURS = {
  announcement:   30 * 24,
  project_update: 60 * 24,
  quick_question:  7 * 24,
  team_win:       30 * 24,
  general_update: 14 * 24,
  leave_notice:    3 * 24,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Ack Bar ───────────────────────────────────────────────────────────────────

function AckBar({ post, isAdmin, deptMembers, onAcknowledge, typeColor }) {
  const allAcked = post.ackCount >= (deptMembers?.length || 1);
  const pct = Math.min(100, Math.round((post.ackCount / (deptMembers?.length || 1)) * 100));

  const pendingNames = isAdmin
    ? (deptMembers || [])
        .filter(m => !post.post_acknowledgements?.some?.(a => a.user_id === m.user_id) &&
                     post.ackCount < (deptMembers?.length || 1))
        .map(m => m.profiles?.full_name)
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return (
    <View style={[styles.ackBar, allAcked && styles.ackBarDone]}>
      <View style={styles.ackBarRow}>
        <View style={styles.ackLeft}>
          <View style={styles.ackTrack}>
            <View style={[styles.ackFill, { width: `${pct}%`, backgroundColor: allAcked ? '#10B981' : typeColor }]} />
          </View>
          <Text style={[styles.ackLabel, allAcked && { color: '#065F46' }]}>
            {allAcked ? 'Everyone confirmed' : `${post.ackCount} of ${deptMembers?.length || '?'} confirmed`}
          </Text>
        </View>
        {!post.userHasAcked ? (
          <TouchableOpacity style={[styles.ackBtn, { backgroundColor: typeColor }]} onPress={onAcknowledge} activeOpacity={0.85}>
            <Text style={styles.ackBtnText}>✓  Confirm</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.ackDoneText}>✓  Confirmed</Text>
        )}
      </View>
      {isAdmin && pendingNames.length > 0 && (
        <Text style={styles.ackPending}>Waiting on: {pendingNames.join(', ')}</Text>
      )}
    </View>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, isAdmin, userId, deptMembers, activeDeptId, onAcknowledge, onPin, onUnpin, onDelete, onReact, onComment, onPress }) {
  const [showPicker,   setShowPicker]   = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [comment,      setComment]      = useState('');
  const [posting,      setPosting]      = useState(false);

  const typeInfo = getPostType(post.type);

  const handleReact = (emoji) => {
    onReact(post.id, emoji);
    setShowPicker(false);
  };

  const handleComment = async () => {
    if (!comment.trim() || posting) return;
    setPosting(true);
    try {
      await onComment(post.id, comment.trim());
      setComment('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.97} style={styles.card}>

      {/* Type strip */}
      <View style={[styles.cardTypeStrip, { backgroundColor: typeInfo?.bg }]}>
        <View style={[styles.cardTypeDot, { backgroundColor: typeInfo?.color }]} />
        <Text style={[styles.cardTypeLabel, { color: typeInfo?.color }]}>
          {typeInfo?.label?.toUpperCase()}
        </Text>
        {post.pinned && (
          <View style={styles.pinnedChip}>
            <Text style={[styles.pinnedChipText, { color: typeInfo?.color }]}>Pinned</Text>
          </View>
        )}
        {post.department?.name && post.department.name.toLowerCase() !== 'general' && activeDeptId === 'all' && (
          <View style={styles.deptChip}>
            <Text style={styles.deptChipText}>{post.department.name}</Text>
          </View>
        )}
        {isAdmin && (
          <View style={styles.menuWrap}>
            <TouchableOpacity onPress={() => setShowMenu(p => !p)} style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.moreBtnText, { color: typeInfo?.color + '99' }]}>•••</Text>
            </TouchableOpacity>
            {showMenu && (
              <View style={styles.menuDropdown}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { post.pinned ? onUnpin(post.id) : onPin(post.id); setShowMenu(false); }}>
                  <Text style={styles.menuItemText}>{post.pinned ? 'Unpin' : 'Pin to top'}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => { onDelete(post.id); setShowMenu(false); }}>
                  <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <View style={styles.cardAuthorRow}>
          <Avatar initials={post.authorInitials} size={28} color={post.authorColor} />
          <Text style={styles.cardAuthor}>{post.author}</Text>
          <Text style={styles.cardTime}>
            {post.postedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.cardContentWrap}>
          {renderContent(post.content)}
        </View>

        {/* Reactions */}
        {Object.keys(post.reactions || {}).length > 0 && (
          <View style={styles.reactions}>
            {Object.entries(post.reactions).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.reactionChip, post.userReactions?.includes(emoji) && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={() => handleReact(emoji)}
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
            isAdmin={isAdmin}
            deptMembers={deptMembers}
            onAcknowledge={() => onAcknowledge(post.id)}
            typeColor={typeInfo?.color}
          />
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPicker(p => !p)} activeOpacity={0.7}>
            <Text style={styles.actionText}>React</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(p => !p)} activeOpacity={0.7}>
            <Text style={styles.actionText}>
              {post.commentCount > 0 ? `${post.commentCount} ${post.commentCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
            </Text>
          </TouchableOpacity>
          {isAdmin && (
            <Text style={styles.seenText}>Seen {post.seenCount}/{deptMembers?.length || '?'}</Text>
          )}
        </View>

        {/* Reaction picker */}
        {showPicker && (
          <View style={styles.reactionPicker}>
            {REACTION_OPTIONS.map(e => (
              <TouchableOpacity key={e} onPress={() => handleReact(e)} style={styles.reactionPickerBtn} activeOpacity={0.7}>
                <Text style={styles.reactionPickerEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Comments */}
        {showComments && (
          <View style={styles.commentsWrap}>
            {(post.comments || []).map((c, i) => (
              <View key={c.id || i} style={styles.commentRow}>
                <Avatar
                  initials={c.author?.avatar_initials || (c.author?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                  size={24}
                  color={c.author?.avatar_color}
                />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentMeta}>{c.author?.full_name || 'Unknown'} · {new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.commentText}>{c.content}</Text>
                </View>
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Reply..."
                placeholderTextColor={colors.placeholder}
                value={comment}
                onChangeText={setComment}
                onSubmitEditing={handleComment}
                returnKeyType="send"
              />
              {comment.trim() ? (
                <TouchableOpacity style={styles.commentSendBtn} onPress={handleComment} activeOpacity={0.85} disabled={posting}>
                  <Text style={styles.commentSendText}>{posting ? '...' : 'Send'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Post Modal ────────────────────────────────────────────────────────────────

function PostModal({ visible, onClose, onPost, departments, defaultDeptId, activePostTypes }) {
  const [step,        setStep]        = useState(0);
  const [selectedType, setSelectedType] = useState(null);
  const [content,     setContent]     = useState('');
  const [deptId,      setDeptId]      = useState(defaultDeptId || null);
  const [requiresAck, setRequiresAck] = useState(false);
  const [posting,     setPosting]     = useState(false);

  const typeInfo       = POST_TYPES.find(p => p.id === selectedType);
  const isAnnouncement = selectedType === 'announcement';
  const deptInfo       = departments.find(d => d.id === deptId);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setSelectedType(null);
      setContent('');
      setDeptId(defaultDeptId || departments[0]?.id || null);
      setRequiresAck(false);
    }
  }, [visible]);

  const handlePost = async () => {
    if (!content.trim() || !selectedType || !deptId || posting) return;
    setPosting(true);
    try {
      await onPost({ type: selectedType, content, departmentId: deptId, requiresAck: isAnnouncement && requiresAck });
      onClose();
    } catch (err) {
      console.warn('Post error:', err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 0 ? 'Who are you posting to?' : step === 1 ? 'What type of update?' : `${typeInfo?.label} → ${deptInfo?.name || 'General'}`}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {step === 0 && (
              <View style={styles.modalBody}>
                <Text style={styles.modalSectionLabel}>Choose your audience</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
                  {departments.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.deptPill, deptId === d.id && { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}
                      onPress={() => setDeptId(d.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.deptPillText, deptId === d.id && { color: colors.brand, fontWeight: typography.semibold }]}>
                        {d.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.subtle, marginLeft: 4 }}>
                        {d.department_members?.length || 0} members
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.postBtn, { backgroundColor: colors.brand, alignSelf: 'flex-end' }]}
                  onPress={() => setStep(1)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.postBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 1 && (
              <View style={styles.typeGrid}>
                {POST_TYPES.filter(t => !activePostTypes || activePostTypes.includes(t.id)).map(({ id, label, color, bg }) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.typeOption, { backgroundColor: bg, borderColor: color + '30' }]}
                    onPress={() => { setSelectedType(id); setStep(2); }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.typeOptionDot, { backgroundColor: color }]} />
                    <Text style={[styles.typeOptionText, { color }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 2 && (
              <View style={styles.modalBody}>
                {/* Type + dept reminder */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md, backgroundColor: typeInfo?.bg, borderRadius: radius.md, padding: spacing.sm }}>
                  <View style={[styles.typeOptionDot, { backgroundColor: typeInfo?.color }]} />
                  <Text style={{ fontSize: 13, fontWeight: typography.semibold, color: typeInfo?.color, flex: 1 }}>{typeInfo?.label}</Text>
                  <Text style={{ fontSize: 12, color: typeInfo?.color + '99' }}>→ {deptInfo?.name}</Text>
                </View>

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

                {isAnnouncement && (
                  <TouchableOpacity
                    style={[styles.ackToggleRow, requiresAck && { backgroundColor: typeInfo?.bg, borderColor: typeInfo?.color + '40' }]}
                    onPress={() => setRequiresAck(p => !p)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ackToggleTitle, requiresAck && { color: typeInfo?.color }]}>Require read confirmation</Text>
                      <Text style={styles.ackToggleDesc}>Team must confirm they've read this</Text>
                    </View>
                    <View style={[styles.toggle, requiresAck && { backgroundColor: typeInfo?.color }]}>
                      <View style={[styles.toggleThumb, requiresAck && styles.toggleThumbOn]} />
                    </View>
                  </TouchableOpacity>
                )}

                <View style={styles.modalFooter}>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <TouchableOpacity onPress={() => { setSelectedType(null); setStep(0); }}>
                      <Text style={styles.changeTypeText}>← Audience</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSelectedType(null); setStep(1); }}>
                      <Text style={styles.changeTypeText}>← Type</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.postBtn, { backgroundColor: content.trim() && !posting ? typeInfo?.color : colors.border }]}
                    onPress={handlePost}
                    disabled={!content.trim() || posting}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Post update'}</Text>
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

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FeedScreen({ navigation }) {
  const { user, profile, orgId, orgName, isAdmin, initials, avatarColor, activePostTypes, setActivePostTypes } = useApp();

  const [feed,          setFeed]          = useState([]);
  const [departments,   setDepartments]   = useState([]);
  const [onLeave,       setOnLeave]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeDeptId,  setActiveDeptId]  = useState('all');
  const [filter,        setFilter]        = useState('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEarlier,     setShowEarlier]     = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const lastVisit    = useRef(null);
  const loadDataRef  = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; });
  const now       = new Date();
  const cutoff    = new Date(now - 48 * 60 * 60 * 1000);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!orgId || !user?.id) return;
    try {
      const [posts, depts, leave, settings] = await Promise.all([
        getPosts(orgId, user.id),
        getDepartments(orgId),
        getOnLeaveToday(orgId),
        // ✅ Always fetch fresh post types — don't rely on cached AppContext
        supabase.from('org_settings').select('active_post_types').eq('org_id', orgId).maybeSingle(),
      ]);

      setFeed(posts);
      setDepartments(depts);
      setOnLeave(leave);

      // Sync activePostTypes into AppContext if it changed
      if (settings?.data?.active_post_types) {
        setActivePostTypes(settings.data.active_post_types);
      }

      // Mark all posts as seen
      const unseenIds = posts.filter(p => !p.userHasSeen).map(p => p.id);
      if (unseenIds.length > 0) markPostsSeen(unseenIds, user.id);

    } catch (err) {
      console.warn('FeedScreen loadData error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.id]);

  useEffect(() => {
    if (!orgId || !user?.id) return; // wait for AppContext to be ready
    lastVisit.current = new Date();
    loadData();
  }, [orgId, user?.id, loadData]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const reload = () => loadDataRef.current?.();
    const channel = supabase
      .channel(`feed-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts',                filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' },                                          reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' },                                           reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_acknowledgements' },                               reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_members' },                                  reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments',          filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_events',         filter: `org_id=eq.${orgId}` }, reload)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [orgId, loadData]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAcknowledge = async (postId) => {
    // Optimistic update
    setFeed(prev => prev.map(p => p.id === postId
      ? { ...p, ackCount: p.ackCount + 1, userHasAcked: true }
      : p
    ));
    await acknowledgePost(postId, user.id);
  };

  const handlePin = async (postId) => {
    setFeed(prev => prev.map(p => ({ ...p, pinned: p.id === postId })));
    await pinPost(postId);
  };

  const handleUnpin = async (postId) => {
    setFeed(prev => prev.map(p => p.id === postId ? { ...p, pinned: false } : p));
    await unpinPost(postId);
  };

  const handleDelete = async (postId) => {
    setFeed(prev => prev.filter(p => p.id !== postId));
    await deletePost(postId);
  };

  const handleReact = async (postId, emoji) => {
    const post = feed.find(p => p.id === postId);
    const hasReacted = post?.userReactions?.includes(emoji);
    // Optimistic update
    setFeed(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const reactions = { ...p.reactions };
      const userReactions = [...(p.userReactions || [])];
      if (hasReacted) {
        if (reactions[emoji] > 1) reactions[emoji]--; else delete reactions[emoji];
        return { ...p, reactions, userReactions: userReactions.filter(e => e !== emoji) };
      } else {
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...p, reactions, userReactions: [...userReactions, emoji] };
      }
    }));
    await reactToPost(postId, user.id, emoji);
  };

  const handleComment = async (postId, content) => {
    const newComment = await addComment(postId, user.id, content);
    setFeed(prev => prev.map(p => p.id !== postId ? p : {
      ...p,
      commentCount: p.commentCount + 1,
      comments: [...(p.comments || []), newComment],
    }));
  };

  const handlePost = async ({ type, content, departmentId, requiresAck }) => {
    await createPost({ orgId, authorId: user.id, type, content, departmentId, requiresAck });
    await loadData();
  };

  // ── Feed computation ──────────────────────────────────────────────────────

  const deptMemberMap = {};
  departments.forEach(d => { deptMemberMap[d.id] = d.department_members || []; });

  const myDepts = departments.filter(d =>
    d.department_members?.some(m => m.user_id === user?.id)
  );

  const activeFeed = feed.filter(p => {
    const archiveAfter = AUTO_ARCHIVE_HOURS[p.type] || 14 * 24;
    return now < new Date(p.postedAt.getTime() + archiveAfter * 60 * 60 * 1000);
  });

  const filteredFeed = activeFeed
    .filter(p => activeDeptId === 'all' || p.departmentId === activeDeptId)
    .filter(p => filter === 'all' || p.type === filter);

  const pinnedPost   = filteredFeed.find(p => p.pinned);
  const unpinnedFeed = filteredFeed.filter(p => !p.pinned);
  const recentFeed   = unpinnedFeed.filter(p => p.postedAt >= cutoff);
  const olderFeed    = unpinnedFeed.filter(p => p.postedAt < cutoff);
  const newCount     = lastVisit.current
    ? unpinnedFeed.filter(p => p.postedAt > lastVisit.current).length
    : 0;

  const pendingAcks = feed.filter(p => p.requiresAck && !p.userHasAcked &&
    myDepts.some(d => d.id === p.departmentId)
  );

  // ── Build feed items list ─────────────────────────────────────────────────

  const buildFeedItems = () => {
    const items = [];
    if (pinnedPost) items.push({ ...pinnedPost, _kind: 'post' });
    if (newCount > 0) items.push({ _kind: 'separator_new', count: newCount });
    recentFeed.forEach(p => items.push({ ...p, _kind: 'post' }));
    if (recentFeed.length === 0 && !pinnedPost) items.push({ _kind: 'caught_up' });
    if (olderFeed.length > 0) items.push({ _kind: 'load_earlier', count: olderFeed.length });
    if (showEarlier) {
      items.push({ _kind: 'separator_earlier' });
      olderFeed.forEach(p => items.push({ ...p, _kind: 'post' }));
    }
    return items;
  };

  const feedItems = buildFeedItems();

  // ── Render ────────────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View>
      {/* Who's off today — personalised */}
      {onLeave.length > 0 && (() => {
        const myLeave     = onLeave.find(l => l.userId === user?.id);
        const othersLeave = onLeave.filter(l => l.userId !== user?.id);
        const showOthers  = othersLeave.slice(0, 3);
        const hiddenCount = othersLeave.length - showOthers.length;
        return (
          <View style={styles.leaveCard}>
            {myLeave && (
              <View style={styles.leaveRow}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: myLeave.color, flexShrink: 0 }} />
                <Text style={styles.leaveName}>
                  <Text style={{ fontWeight: typography.bold, color: colors.black }}>You</Text>
                  {' '}are off today — back {myLeave.back}
                </Text>
              </View>
            )}
            {showOthers.length > 0 && (
              <>
                <Text style={[styles.leaveTitle, myLeave && { marginTop: 6 }]}>
                  {!myLeave
                    ? (othersLeave.length === 1 ? '1 teammate is off today' : `${othersLeave.length} teammates are off today`)
                    : (othersLeave.length === 1 ? 'Also off today:' : `${othersLeave.length} others also off:`)}
                </Text>
                {showOthers.map(p => (
                  <View key={p.userId} style={styles.leaveRow}>
                    <Avatar initials={p.initials} size={18} color={p.color} />
                    <Text style={styles.leaveName}>{p.name} — back {p.back}</Text>
                  </View>
                ))}
                {hiddenCount > 0 && (
                  <Text style={{ fontSize: 12, color: colors.brand, marginTop: 4, fontWeight: typography.medium }}>
                    + {hiddenCount} more — check the calendar
                  </Text>
                )}
              </>
            )}
          </View>
        );
      })()}

      {/* Pending ack banner */}
      {pendingAcks.length > 0 && (
        <View style={styles.ackBanner}>
          <View style={styles.ackBannerDot} />
          <Text style={styles.ackBannerText}>
            <Text style={{ fontWeight: typography.bold }}>
              {pendingAcks.length} announcement{pendingAcks.length > 1 ? 's' : ''}
            </Text>{' '}need your confirmation
          </Text>
          <TouchableOpacity onPress={() => setFilter('announcement')} style={styles.ackBannerBtn}>
            <Text style={styles.ackBannerBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dept pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={styles.pillsContent}>
        {[{ id: 'all', name: 'All' }, ...myDepts].map(d => (
          <TouchableOpacity
            key={d.id}
            style={[styles.pill, activeDeptId === d.id && (d.id === 'all' ? styles.pillAllActive : styles.pillActive)]}
            onPress={() => setActiveDeptId(d.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeDeptId === d.id && (d.id === 'all' ? styles.pillTextAllActive : styles.pillTextActive)]}>
              {d.name}
            </Text>
          </TouchableOpacity>
        ))}
        {/* Filter button */}
        <TouchableOpacity
          style={[styles.pill, filter !== 'all' && styles.pillActive]}
          onPress={() => setShowFilterSheet(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillText, filter !== 'all' && styles.pillTextActive]}>
            {filter !== 'all' ? (POST_TYPES.find(t => t.id === filter)?.label || 'Filter') : 'Filter ▾'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item._kind === 'separator_new') {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <View style={styles.separatorBadge}>
            <View style={styles.separatorDot} />
            <Text style={styles.separatorText}>{item.count} new since your last visit</Text>
          </View>
          <View style={styles.separatorLine} />
        </View>
      );
    }
    if (item._kind === 'caught_up') {
      return (
        <View style={styles.caughtUp}>
          <Text style={styles.caughtUpTitle}>You're all caught up</Text>
          <Text style={styles.caughtUpSub}>Nothing new in the last 48 hours.</Text>
        </View>
      );
    }
    if (item._kind === 'load_earlier') {
      return (
        <TouchableOpacity style={styles.loadEarlier} onPress={() => setShowEarlier(p => !p)} activeOpacity={0.8}>
          <View style={styles.loadEarlierLine} />
          <Text style={styles.loadEarlierText}>
            {showEarlier ? 'Hide earlier posts' : `Load ${item.count} earlier post${item.count > 1 ? 's' : ''}`}
          </Text>
          <View style={styles.loadEarlierLine} />
        </TouchableOpacity>
      );
    }
    if (item._kind === 'separator_earlier') {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorEarlierText}>Earlier</Text>
          <View style={styles.separatorLine} />
        </View>
      );
    }
    return (
      <PostCard
        post={item}
        isAdmin={isAdmin}
        userId={user?.id}
        deptMembers={deptMemberMap[item.departmentId]}
        activeDeptId={activeDeptId}
        onAcknowledge={handleAcknowledge}
        onPin={handlePin}
        onUnpin={handleUnpin}
        onDelete={handleDelete}
        onReact={handleReact}
        onComment={handleComment}
        onPress={() => navigation.getParent().navigate('PostDetail', { post: item })}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 13, color: colors.subtle }}>Loading feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.appHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('History')} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={styles.appOrg} numberOfLines={1}>{orgName}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Inbox')} style={styles.bellBtn} activeOpacity={0.8}>
              <BellIcon color={pendingAcks.length > 0 ? '#DC2626' : colors.muted} />
              {pendingAcks.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Profile')} activeOpacity={0.8}>
              <Avatar initials={initials} size={30} color={avatarColor} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('History')} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={styles.appOrg} numberOfLines={1}>{orgName}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Inbox')} style={styles.bellBtn} activeOpacity={0.8}>
              <BellIcon color={pendingAcks.length > 0 ? '#DC2626' : colors.muted} />
              {pendingAcks.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent().navigate('Profile')} activeOpacity={0.8}>
              <Avatar initials={initials} size={30} color={avatarColor} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={feedItems}
        keyExtractor={(item, index) => item.id ? String(item.id) : `${item._kind}-${index}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share an update with your team.</Text>
          </View>
        }
        contentContainerStyle={styles.feedList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowPostModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Type filter sheet */}
      <Modal visible={showFilterSheet} transparent animationType="slide" onRequestClose={() => setShowFilterSheet(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterSheet(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by type</Text>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: spacing.page, gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.filterTypeRow, filter === 'all' && styles.filterTypeRowActive]}
                onPress={() => { setFilter('all'); setShowFilterSheet(false); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTypeLabel, filter === 'all' && { color: colors.brand, fontWeight: typography.semibold }]}>All types</Text>
                {filter === 'all' && <Text style={{ color: colors.brand, fontSize: 14 }}>✓</Text>}
              </TouchableOpacity>
              {(activePostTypes
                ? POST_TYPES.filter(t => activePostTypes.includes(t.id))
                : POST_TYPES
              ).map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.filterTypeRow, filter === t.id && styles.filterTypeRowActive]}
                  onPress={() => { setFilter(t.id); setShowFilterSheet(false); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cardTypeDot, { backgroundColor: t.color }]} />
                  <Text style={[styles.filterTypeLabel, filter === t.id && { color: t.color, fontWeight: typography.semibold }]}>{t.label}</Text>
                  {filter === t.id && <Text style={{ color: t.color, fontSize: 14 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <PostModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPost={handlePost}
        departments={myDepts}
        defaultDeptId={activeDeptId !== 'all' ? activeDeptId : myDepts[0]?.id}
        activePostTypes={activePostTypes}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F3F4F6' },
  headerBlock:      { backgroundColor: colors.white, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, height: 52, gap: spacing.sm, backgroundColor: colors.white },
  appLogo:          { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent:    { color: colors.brand },
  appSep:           { fontSize: 14, color: colors.border },
  appOrg:           { fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  bellBtn:          { position: 'relative', width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellBadge:        { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626', borderWidth: 1.5, borderColor: colors.white },
  feedList:         { paddingHorizontal: spacing.page, paddingTop: spacing.md, paddingBottom: 100 },
  leaveCard:        { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  leaveTitle:       { fontSize: 13, fontWeight: typography.bold, color: '#374151', marginBottom: 5 },
  leaveRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  leaveName:        { fontSize: 12, color: colors.muted },
  ackBanner:        { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ackBannerDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626', flexShrink: 0 },
  ackBannerText:    { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },
  ackBannerBtn:     { borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ackBannerBtnText: { fontSize: 12, fontWeight: typography.semibold, color: '#DC2626' },
  pillsRow:         { marginBottom: spacing.sm },
  pillsContent:     { gap: 6, paddingRight: spacing.page },
  pill:             { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  pillActive:       { backgroundColor: '#EFF6FF', borderColor: colors.brand },
  pillAllActive:    { backgroundColor: colors.black, borderColor: colors.black },
  pillText:         { fontSize: 13, fontWeight: typography.medium, color: colors.muted },
  pillTextActive:   { color: colors.brand, fontWeight: typography.semibold },
  pillTextAllActive: { color: colors.white, fontWeight: typography.semibold },
  card:             { backgroundColor: colors.white, borderRadius: radius.xl, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  cardTypeStrip:    { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.md, paddingVertical: 10 },
  cardTypeDot:      { width: 7, height: 7, borderRadius: 4 },
  cardTypeLabel:    { fontSize: 11, fontWeight: typography.black, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  pinnedChip:       { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  pinnedChipText:   { fontSize: 10, fontWeight: typography.bold },
  deptChip:         { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.06)' },
  deptChipText:     { fontSize: 10, fontWeight: typography.semibold, color: '#374151' },
  menuWrap:         { position: 'relative' },
  moreBtn:          { padding: 4 },
  moreBtnText:      { fontSize: 13, letterSpacing: 1 },
  menuDropdown:     { position: 'absolute', top: 28, right: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, minWidth: 150, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  menuItem:         { paddingHorizontal: spacing.md, paddingVertical: 14 },
  menuItemText:     { fontSize: 14, fontWeight: typography.medium, color: '#374151' },
  menuDivider:      { height: 1, backgroundColor: colors.borderLight },
  cardBody:         { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  cardAuthorRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  cardAuthor:       { fontSize: 13, fontWeight: typography.semibold, color: colors.black, flex: 1 },
  cardTime:         { fontSize: 11, color: colors.subtle },
  cardContentWrap:  { marginBottom: 12 },
  postContent:      { fontSize: 15, color: '#1F2937', lineHeight: 23 },
  mention:          { color: colors.brand, fontWeight: typography.semibold },
  reactions:        { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  reactionChip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  reactionText:     { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },
  ackBar:           { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.sm, marginBottom: 10 },
  ackBarDone:       { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  ackBarRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ackLeft:          { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ackTrack:         { width: 48, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  ackFill:          { height: '100%', borderRadius: 2 },
  ackLabel:         { fontSize: 12, color: colors.muted },
  ackBtn:           { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  ackBtnText:       { fontSize: 12, fontWeight: typography.bold, color: colors.white },
  ackDoneText:      { fontSize: 12, fontWeight: typography.semibold, color: '#065F46' },
  ackPending:       { fontSize: 11, color: colors.subtle, marginTop: 4 },
  cardActions:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  actionText:       { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  seenText:         { marginLeft: 'auto', fontSize: 12, color: colors.subtle },
  reactionPicker:   { flexDirection: 'row', paddingTop: 8, gap: 4 },
  reactionPickerBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F9FAFB' },
  reactionPickerEmoji: { fontSize: 20 },
  commentsWrap:     { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8, marginTop: 8 },
  commentRow:       { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentBubble:    { flex: 1, backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 10 },
  commentMeta:      { fontSize: 11, color: colors.subtle, marginBottom: 2 },
  commentText:      { fontSize: 13, color: '#374151', lineHeight: 18 },
  commentInputRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput:     { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: colors.black, backgroundColor: '#F9FAFB' },
  commentSendBtn:   { backgroundColor: colors.brand, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  commentSendText:  { fontSize: 13, fontWeight: typography.semibold, color: colors.white },
  avatar:           { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:       { fontWeight: typography.bold },
  emptyWrap:        { alignItems: 'center', paddingVertical: 48 },
  emptyTitle:       { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6 },
  emptySubtitle:    { fontSize: 14, color: colors.subtle, textAlign: 'center' },
  separator:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  separatorLine:    { flex: 1, height: 1, backgroundColor: colors.borderLight },
  separatorBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brandLight, borderWidth: 1, borderColor: colors.brandBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  separatorDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand },
  separatorText:    { fontSize: 12, fontWeight: typography.semibold, color: colors.brand },
  separatorEarlierText: { fontSize: 12, fontWeight: typography.semibold, color: colors.subtle, paddingHorizontal: spacing.sm },
  loadEarlier:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  loadEarlierLine:  { flex: 1, height: 1, backgroundColor: colors.borderLight },
  loadEarlierText:  { fontSize: 12, fontWeight: typography.semibold, color: colors.muted, paddingHorizontal: spacing.sm },
  caughtUp:         { alignItems: 'center', paddingVertical: spacing.xl, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, marginBottom: spacing.sm, backgroundColor: colors.white },
  caughtUpTitle:    { fontSize: 14, fontWeight: typography.bold, color: colors.black, marginBottom: 4 },
  caughtUpSub:      { fontSize: 13, color: colors.subtle },
  fab:              { position: 'absolute', bottom: 24, right: spacing.page, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  fabText:          { fontSize: 28, color: colors.white, lineHeight: 32, fontWeight: '300' },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:       { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  sheetHandle:      { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle:       { fontSize: 16, fontWeight: typography.bold, color: colors.black, flex: 1 },
  modalCloseText:   { fontSize: 16, color: colors.subtle, padding: 4 },
  modalBody:        { padding: spacing.page },
  modalSectionLabel: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  deptPill:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  deptPillText:     { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  typeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.page },
  typeOption:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, width: '47%' },
  typeOptionDot:    { width: 9, height: 9, borderRadius: 5 },
  typeOptionText:   { fontSize: 14, fontWeight: typography.semibold },
  modalTextarea:    { minHeight: 110, fontSize: 15, color: colors.black, lineHeight: 22, marginBottom: spacing.md },
  ackToggleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, marginBottom: spacing.md },
  ackToggleTitle:   { fontSize: 13, fontWeight: typography.semibold, color: '#374151' },
  ackToggleDesc:    { fontSize: 11, color: colors.subtle, marginTop: 2 },
  toggle:           { width: 36, height: 20, borderRadius: 100, backgroundColor: colors.border, padding: 2 },
  toggleThumb:      { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white, alignSelf: 'flex-start' },
  toggleThumbOn:    { alignSelf: 'flex-end' },
  modalFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  changeTypeText:   { fontSize: 13, color: colors.muted },
  postBtn:          { borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: 12 },
  postBtnText:      { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  filterTypeRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white },
  filterTypeRowActive: { borderColor: colors.brand + '40', backgroundColor: '#EFF6FF' },
  filterTypeLabel:  { flex: 1, fontSize: 14, color: colors.muted, fontWeight: typography.medium },
});