// src/services/post.service.js
import { supabase } from '../lib/supabase';

// ── Post types — single source of truth ──────────────────────────────────────

export const POST_TYPES = [
  { id: 'announcement',   label: 'Announcement',   color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'task',           label: 'Task',            color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'project_update', label: 'Project Update', color: '#5B21B6', bg: '#F5F3FF' },
  { id: 'quick_question', label: 'Quick Question', color: '#9D174D', bg: '#FDF2F8' },
  { id: 'team_win',       label: 'Team Win',       color: '#065F46', bg: '#ECFDF5' },
  { id: 'general_update', label: 'General Update', color: '#374151', bg: '#F9FAFB' },
];

export const getPostType = (id) =>
  POST_TYPES.find(t => t.id === id) || POST_TYPES[5];

// ── Fetch posts ───────────────────────────────────────────────────────────────

export const getPosts = async (orgId, userId, { limit = 20, offset = 0 } = {}) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      type,
      content,
      department_id,
      pinned,
      requires_ack,
      created_at,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials),
      department:departments(id, name),
      reactions(emoji, user_id),
      post_acknowledgements(user_id),
      post_seen(user_id),
      comments(id, content, created_at,
        author:profiles!comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
      )
    `)
    .eq('org_id', orgId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(p => formatPost(p, userId));
};


// ── Fetch archived posts (older than 48hrs — for History screen) ──────────────

export const getArchivedPosts = async (orgId, userId, { limit = 30, offset = 0 } = {}) => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      type,
      content,
      department_id,
      pinned,
      requires_ack,
      created_at,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials),
      department:departments(id, name),
      reactions(emoji, user_id),
      post_acknowledgements(user_id),
      post_seen(user_id),
      comments(id, content, created_at,
        author:profiles!comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
      )
    `)
    .eq('org_id', orgId)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(p => formatPost(p, userId));
};

// ── Fetch who is off today ────────────────────────────────────────────────────

export const getOnLeaveToday = async (orgId) => {
  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const { data, error } = await supabase
    .from('leave_events')
    .select(`
      user_id,
      end_date,
      profiles(full_name, avatar_color, avatar_initials)
    `)
    .eq('org_id', orgId)
    .lte('start_date', today)
    .gte('end_date', today);

  if (error) throw error;

  return (data || []).map(l => ({
    userId:   l.user_id,
    name:     l.profiles?.full_name || '',
    initials: l.profiles?.avatar_initials ||
      (l.profiles?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    color:    l.profiles?.avatar_color || '#1D4ED8',
    back:     formatBackDate(l.end_date),
  }));
};

function formatBackDate(endDate) {
  const d = new Date(endDate);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

// ── Create post ───────────────────────────────────────────────────────────────

export const createPost = async ({
  orgId, authorId, type, content, departmentId, requiresAck = false, mentionedIds = [],
}) => {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      org_id:        orgId,
      author_id:     authorId,
      type,
      content:       content.trim(),
      department_id: departmentId,
      requires_ack:  requiresAck,
      pinned:        false,
    })
    .select()
    .single();
  if (error) throw error;

  // Save @mentions from post body → Inbox notification
  // Uses post_id directly — no fake comment needed
  if (data && mentionedIds.length > 0) {
    const uniqueIds = [...new Set(mentionedIds)].filter(id => id !== authorId);
    if (uniqueIds.length > 0) {
      const { error: mentionError } = await supabase
        .from('comment_mentions')
        .insert(uniqueIds.map(userId => ({
          post_id:           data.id,
          mentioned_user_id: userId,
          comment_id:        null,
        })));
      console.log('[createPost] post mentions saved:', uniqueIds.length, mentionError?.message || '✓');
    }
  }

  return data;
};

// ── Pin / Unpin ───────────────────────────────────────────────────────────────

export const pinPost = async (postId) => {
  const { error } = await supabase.from('posts').update({ pinned: true }).eq('id', postId);
  if (error) throw error;
};

export const unpinPost = async (postId) => {
  const { error } = await supabase.from('posts').update({ pinned: false }).eq('id', postId);
  if (error) throw error;
};

// ── Delete post ───────────────────────────────────────────────────────────────

export const deletePost = async (postId) => {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
};

// ── React ─────────────────────────────────────────────────────────────────────

export const reactToPost = async (postId, userId, emoji) => {
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    return 'removed';
  } else {
    await supabase.from('reactions').insert({ post_id: postId, user_id: userId, emoji });
    return 'added';
  }
};

// ── Acknowledge ───────────────────────────────────────────────────────────────

export const acknowledgePost = async (postId, userId) => {
  const { error } = await supabase
    .from('post_acknowledgements')
    .insert({ post_id: postId, user_id: userId });
  if (error && !error.message?.includes('duplicate')) throw error;
};

// ── Mark seen ─────────────────────────────────────────────────────────────────

export const markPostsSeen = async (postIds, userId) => {
  if (!postIds.length) return;
  await supabase
    .from('post_seen')
    .upsert(
      postIds.map(postId => ({ post_id: postId, user_id: userId })),
      { onConflict: 'post_id,user_id', ignoreDuplicates: true }
    );
};

// ── Add comment ───────────────────────────────────────────────────────────────

export const addComment = async (postId, authorId, content, mentionedUserIds = []) => {
  console.log('[addComment] postId:', postId);
  console.log('[addComment] authorId:', authorId);
  console.log('[addComment] content:', content);
  console.log('[addComment] mentionedUserIds:', mentionedUserIds);
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: authorId, content: content.trim() })
    .select(`
      id, content, created_at,
      author:profiles!comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
    `)
    .single();
  if (error) throw error;

  // Save mentions so they appear in mentioned users' Inbox
  if (data && mentionedUserIds.length > 0) {
    const uniqueIds = [...new Set(mentionedUserIds)].filter(id => id !== authorId);
    console.log('[addComment] saving mentions for uniqueIds:', uniqueIds);
    if (uniqueIds.length > 0) {
      const { error: mentionError } = await supabase.from('comment_mentions').insert(
        uniqueIds.map(userId => ({ comment_id: data.id, mentioned_user_id: userId }))
      );
      console.log('[addComment] mention insert error:', mentionError?.message || 'none');
    }
  } else {
    console.log('[addComment] no mentions to save — mentionedUserIds empty or no data');
  }

  return data;
};

// ── Format post ───────────────────────────────────────────────────────────────

const formatPost = (raw, userId) => {
  const typeInfo = getPostType(raw.type);

  const reactions = {};
  const userReactions = [];
  (raw.reactions || []).forEach(r => {
    reactions[r.emoji] = (reactions[r.emoji] || 0) + 1;
    if (r.user_id === userId) userReactions.push(r.emoji);
  });

  const acks        = raw.post_acknowledgements || [];
  const userHasAcked = acks.some(a => a.user_id === userId);
  const seenCount   = (raw.post_seen || []).length;
  const userHasSeen = (raw.post_seen || []).some(s => s.user_id === userId);

  return {
    id:             raw.id,
    type:           raw.type,
    color:          typeInfo.color,
    bg:             typeInfo.bg,
    content:        raw.content,
    pinned:         raw.pinned,
    requiresAck:    raw.requires_ack,
    postedAt:       new Date(raw.created_at),
    department:     raw.department,
    departmentId:   raw.department_id,

    // Author
    authorId:       raw.author?.id,
    author:         raw.author?.full_name || 'Unknown',
    authorInitials: raw.author?.avatar_initials ||
      (raw.author?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    authorColor:    raw.author?.avatar_color || '#1D4ED8',

    // Engagement
    reactions,
    userReactions,
    ackCount:       acks.length,
    userHasAcked,
    seenCount,
    userHasSeen,
    commentCount:   (raw.comments || []).length,
    comments:       raw.comments || [],
  };
};