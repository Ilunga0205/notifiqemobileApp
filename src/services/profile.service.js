// src/services/profile.service.js
//
// All profile-related DB operations.
// Always returns clean data or throws.

import { supabase } from '../lib/supabase';

// ── Fetch ─────────────────────────────────────────────────────────────────────

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_color, avatar_initials')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

// ── Update name ───────────────────────────────────────────────────────────────

export const updateName = async (userId, fullName) => {
  const trimmed  = fullName.trim();
  const initials = trimmed.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed, avatar_initials: initials })
    .eq('id', userId);
  if (error) throw error;

  return { full_name: trimmed, avatar_initials: initials };
};

// ── Update avatar color ───────────────────────────────────────────────────────

export const updateAvatarColor = async (userId, color) => {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_color: color })
    .eq('id', userId);
  if (error) throw error;
};

// ── Upsert (used during invite approval) ─────────────────────────────────────

export const upsertProfile = async ({ id, fullName, email }) => {
  const initials = (fullName || email).trim()
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const { error } = await supabase.from('profiles').upsert({
    id,
    full_name:       fullName,
    email,
    avatar_initials: initials,
    avatar_color:    '#1D4ED8',
  });
  if (error) throw error;
};