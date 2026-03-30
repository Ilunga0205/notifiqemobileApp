// src/services/org.service.js
//
// All organisation-related DB operations.

import { supabase } from '../lib/supabase';

// ── Fetch ─────────────────────────────────────────────────────────────────────

export const getOrg = async (orgId) => {
  const { data, error } = await supabase
    .from('organisations')
    .select('id, name, slug, timezone, invite_token, logo_url')
    .eq('id', orgId)
    .single();
  if (error) throw error;
  return data;
};

export const getOrgBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('organisations')
    .select('id, name, slug, timezone, invite_token, logo_url')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
};

// ── Update name ───────────────────────────────────────────────────────────────

export const updateOrgName = async (orgId, name) => {
  const { error } = await supabase
    .from('organisations')
    .update({ name: name.trim() })
    .eq('id', orgId);
  if (error) throw error;
};

// ── Update timezone ───────────────────────────────────────────────────────────

export const updateTimezone = async (orgId, timezone) => {
  const { error } = await supabase
    .from('organisations')
    .update({ timezone })
    .eq('id', orgId);
  if (error) throw error;
};

// ── Regenerate invite token ───────────────────────────────────────────────────

export const regenerateInviteToken = async (orgId) => {
  const newToken = Math.random().toString(36).slice(2, 10) +
                   Math.random().toString(36).slice(2, 10);

  const { error } = await supabase
    .from('organisations')
    .update({ invite_token: newToken })
    .eq('id', orgId);
  if (error) throw error;

  return newToken;
};

// ── Build invite link ─────────────────────────────────────────────────────────

export const buildInviteLink = (orgSlug, inviteToken) => {
  if (!orgSlug || !inviteToken) return '';
  return `https://app.notifiqe.com/join/${orgSlug}/${inviteToken}`;
};