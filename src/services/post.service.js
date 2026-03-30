// src/services/post.service.js
//
// All post-related DB operations.
// Feed, reactions, comments, acknowledgements.

import { supabase } from '../lib/supabase';

// ── Post types config (single source of truth) ───────────────────────────────

export const POST_TYPES = [
  { id: 'announcement', label: 'Announcement',   color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'leave',        label: 'Leave Notice',    color: '#0369A1', bg: '#E0F2FE' },
  { id: 'project',      label: 'Project Update',  color: '#5B21B6', bg: '#F5F3FF' },
  { id: 'question',     label: 'Quick Question',  color: '#9D174D', bg: '#FDF2F8' },
  { id: 'win',          label: 'Team Win',         color: '#065F46', bg: '#ECFDF5' },
  { id: 'general',      label: 'General Update',  color: '#374151', bg: '#F9FAFB' },
];

export const getPostType = (label) =>
  POST_TYPES.find(t => t.label === label) || POST_TYPES[5];

// ── Fetch posts ───────────────────────────────────────────────────────────────

export const getPosts = async (orgId, { limit = 50, offset = 0 } = {}) => {
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
      reactions:post_reactions(emoji, user_id),
      acks:post_acknowledgements(user_id),
      comments:post_comments(count)
    `)
    .eq('org_id', orgId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(formatPost);
};

// ── Fetch archived posts (for History screen) ─────────────────────────────────

export const getArchivedPosts = async (orgId) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, type, content, pinned, requires_ack, created_at,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_color, avatar_initials),
      department:departments(id, name),
      reactions:post_reactions(emoji, user_id),
      acks:post_acknowledgements(user_id),
      comments:post_comments(count)
    `)
    .eq('org_id', orgId)
    .eq('archived', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(formatPost);
};

// ── Fetch post comments ───────────────────────────────────────────────────────

export const getComments = async (postId) => {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      id, content, created_at,
      author:profiles!post_comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

// ── Create post ───────────────────────────────────────────────────────────────

export const createPost = async ({
  orgId,
  authorId,
  type,
  content,
  departmentId,
  requiresAck = false,
  pinned = false,
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
      pinned,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Pin / Unpin post ──────────────────────────────────────────────────────────

export const pinPost = async (postId) => {
  const { error } = await supabase
    .from('posts')
    .update({ pinned: true })
    .eq('id', postId);
  if (error) throw error;
};

export const unpinPost = async (postId) => {
  const { error } = await supabase
    .from('posts')
    .update({ pinned: false })
    .eq('id', postId);
  if (error) throw error;
};

// ── Delete post ───────────────────────────────────────────────────────────────

export const deletePost = async (postId) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
};

// ── React to post ─────────────────────────────────────────────────────────────

export const reactToPost = async (postId, userId, emoji) => {
  // Toggle: if reaction exists remove it, otherwise add it
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('post_reactions').delete().eq('id', existing.id);
  } else {
    await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, emoji });
  }
};

// ── Acknowledge post ──────────────────────────────────────────────────────────

export const acknowledgePost = async (postId, userId) => {
  await supabase.from('post_acknowledgements').upsert(
    { post_id: postId, user_id: userId },
    { onConflict: 'post_id,user_id' }
  );
};

// ── Add comment ───────────────────────────────────────────────────────────────

export const addComment = async (postId, authorId, content) => {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, content: content.trim() })
    .select(`
      id, content, created_at,
      author:profiles!post_comments_author_id_fkey(id, full_name, avatar_color, avatar_initials)
    `)
    .single();
  if (error) throw error;
  return data;
};

// ── Format post (raw DB → clean object) ──────────────────────────────────────

const formatPost = (raw) => {
  const typeInfo = getPostType(raw.type);

  // Group reactions by emoji
  const reactions = {};
  (raw.reactions || []).forEach(r => {
    reactions[r.emoji] = (reactions[r.emoji] || 0) + 1;
  });

  return {
    id:           raw.id,
    type:         raw.type,
    color:        typeInfo.color,
    bg:           typeInfo.bg,
    content:      raw.content,
    pinned:       raw.pinned,
    requiresAck:  raw.requires_ack,
    postedAt:     new Date(raw.created_at),
    department:   raw.department,

    // Author
    authorId:       raw.author?.id,
    author:         raw.author?.full_name || 'Unknown',
    authorInitials: raw.author?.avatar_initials ||
      (raw.author?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    authorColor:    raw.author?.avatar_color || '#1D4ED8',

    // Engagement
    reactions,
    acknowledged:    (raw.acks || []).map(a => a.user_id),
    totalRecipients: 0, // filled in by screen from members count
    commentCount:    raw.comments?.[0]?.count || 0,
  };
};