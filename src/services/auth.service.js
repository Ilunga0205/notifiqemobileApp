// src/services/auth.service.js
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'notifiqe_onboarding_done';

// ── Login ─────────────────────────────────────────────────────────────────────

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
};

// ── Register ──────────────────────────────────────────────────────────────────

export const register = async ({ fullName, email, password, orgName, orgSize }) => {
  const baseSlug = orgName.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Find a unique slug — try base, then base-2, base-3 etc.
  let slug = baseSlug;
  let slugAttempt = 1;
  while (true) {
    const { data: existing } = await supabase
      .from('organisations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    slugAttempt++;
    slug = baseSlug + '-' + slugAttempt;
  }

  // 1. Sign up — creates auth user WITHOUT signing in (no SIGNED_IN event yet)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email:   email.trim().toLowerCase(),
    password,
    options: { data: { full_name: fullName.trim() } },
  });

  let userId;

  if (signUpError) {
    if (!signUpError.message?.includes('already registered')) throw signUpError;
  } else {
    userId = signUpData.user?.id;
  }

  // If signUp failed (user already exists), sign in to get userId
  if (!userId) {
    const { data: tempSignIn, error: tempError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (tempError) throw tempError;
    userId = tempSignIn.user.id;
  }

  // 2. Create org + profile + membership + dept atomically via DB function
  const { data: org, error: orgError } = await supabase.rpc('create_workspace', {
    org_name:   orgName.trim(),
    org_slug:   slug,
    p_user_id:  userId,
  });
  if (orgError) throw orgError;

  // 3. Sign in — fires SIGNED_IN AFTER workspace is created
  // RegisterScreen has already navigated away by this point
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email:   email.trim().toLowerCase(),
    password,
  });
  if (signInError) throw signInError;

  return { user: signInData.user, org };
};

// ── Create workspace (for existing user with no workspace) ────────────────────

export const createWorkspace = async (userId, orgName) => {
  const baseSlug = orgName.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // ✅ DB function handles cleanup + slug uniqueness + creation atomically
  const { data: org, error } = await supabase.rpc('create_workspace', {
    org_name:  orgName.trim(),
    org_slug:  baseSlug, // DB function finds unique slug internally
    p_user_id: userId,
  });
  if (error) throw error;

  return org;
};

// ── Logout ────────────────────────────────────────────────────────────────────
// Scenario 1 — plain logout, touch nothing in DB

export const logout = async () => {
  await supabase.auth.signOut();
};

// ── Leave workspace ───────────────────────────────────────────────────────────
// Scenario 2 — mark inactive, keep org + data
// Caller must call clearOnboarding() + logout() after

export const leaveWorkspace = async (userId, orgId) => {
  const { data: orgDepts } = await supabase
    .from('departments')
    .select('id')
    .eq('org_id', orgId);

  const deptIds = (orgDepts || []).map(d => d.id);
  if (deptIds.length > 0) {
    await supabase.from('department_members')
      .delete()
      .eq('user_id', userId)
      .in('department_id', deptIds);
  }

  await supabase.from('memberships')
    .update({ status: 'inactive' })
    .eq('user_id', userId)
    .eq('org_id', orgId);
};

// ── Delete workspace ──────────────────────────────────────────────────────────
// Scenario 3 — delete everything except auth + profile
// Caller must call clearOnboarding() before calling this

export const deleteWorkspace = async (orgId) => {
  const { data: depts } = await supabase
    .from('departments').select('id').eq('org_id', orgId);
  const deptIds = (depts || []).map(d => d.id);

  if (deptIds.length > 0) {
    await supabase.from('department_members').delete().in('department_id', deptIds);
  }
  await supabase.from('departments').delete().eq('org_id', orgId);
  await supabase.from('organisations').delete().eq('id', orgId);
  // Delete memberships last — after this get_my_org_id() returns null
  await supabase.from('memberships').delete().eq('org_id', orgId);

  await supabase.auth.signOut();
};

// ── Change password ───────────────────────────────────────────────────────────

export const changePassword = async (email, currentPassword, newPassword) => {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw new Error('Current password is incorrect.');

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) throw updateError;
};

// ── Onboarding ────────────────────────────────────────────────────────────────

export const markOnboardingDone = async () => {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
};

export const isOnboardingDone = async () => {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
};

export const clearOnboarding = async () => {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
};

// ── Session ───────────────────────────────────────────────────────────────────

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ── Error messages ────────────────────────────────────────────────────────────

export const parseAuthError = (error) => {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials'))  return 'Incorrect email or password.';
  if (msg.includes('Email not confirmed'))         return 'Please confirm your email first.';
  if (msg.includes('already registered'))          return 'An account with this email already exists.';
  if (msg.includes('Password should be'))          return 'Password must be at least 8 characters.';
  return msg || 'Something went wrong. Please try again.';
};