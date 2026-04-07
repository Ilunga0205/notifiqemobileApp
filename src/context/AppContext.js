// src/context/AppContext.js
//
// Global store for the current user's profile and org.
// App.js handles auth state — AppContext only loads data once logged in.

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const CACHE = {
  profile:   'notifiqe_profile',
  org:       'notifiqe_org',
  postTypes: 'notifiqe_post_types',
};

export function AppProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const registering = useRef(false); // suppress SIGNED_IN during registration
  const [profile, setProfile] = useState(null);
  const [org,     setOrg]     = useState(null);
  const [role,    setRole]    = useState(null);
  const [activePostTypes, setActivePostTypes] = useState(null); // null = not loaded yet
  const [ready,   setReady]   = useState(false); // true after first load()
  const resolveRef = useRef(null); // ✅ holds App.js resolve function

  // Called by App.js to register its resolve function
  const setResolve = useCallback((fn) => { resolveRef.current = fn; }, []);

  // Called by any screen to trigger App.js re-evaluation
  const recheck = useCallback(async () => {
    if (resolveRef.current) {
      const { data: { session } } = await supabase.auth.getSession();
      await resolveRef.current(session);
    }
  }, []);

  const load = useCallback(async (userId) => {
    if (!userId) {
      setUser(null);
      setProfile(null);
      setOrg(null);
      setRole(null);
      setActivePostTypes(null);
      await AsyncStorage.multiRemove([CACHE.profile, CACHE.org, CACHE.postTypes]);
      setReady(true);
      return;
    }

    // ✅ Get session synchronously first — fastest way to get user
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setUser(session.user);
    console.log('AppContext load() called with userId:', userId);

    // Show cached data — clear stale org cache first
    await AsyncStorage.removeItem(CACHE.org); // always use fresh org
    const [cachedProfile, cachedPostTypes] = await Promise.all([
      AsyncStorage.getItem(CACHE.profile),
      AsyncStorage.getItem(CACHE.postTypes),
    ]);
    const cachedOrg = null; // never use cached org
    if (cachedProfile) setProfile(JSON.parse(cachedProfile));
    if (cachedPostTypes) setActivePostTypes(JSON.parse(cachedPostTypes));
    // Note: intentionally NOT restoring cached org — orgId must be fresh and correct

    // Fetch fresh data in background
    try {
      // ✅ Always fetch profile — even if membership is gone
      const [profileRes, membershipRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_color, avatar_initials')
          .eq('id', userId)
          .single(),
        supabase
          .from('memberships')
          .select('role, organisations(id, name, slug, timezone, invite_token, logo_url)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      const freshProfile = profileRes.data;
      const freshOrg     = membershipRes.data?.organisations || null;
      const freshRole    = membershipRes.data?.role || null;

      if (freshProfile) {
        setProfile(freshProfile);
        await AsyncStorage.setItem(CACHE.profile, JSON.stringify(freshProfile));
      }
      if (freshOrg) {
        setOrg(freshOrg);
        setRole(freshRole);
        await AsyncStorage.setItem(CACHE.org, JSON.stringify(freshOrg));

        // Load active post types from org_settings
        const { data: settings } = await supabase
          .from('org_settings')
          .select('active_post_types')
          .eq('org_id', freshOrg.id)
          .maybeSingle();
        const types = settings?.active_post_types || ['announcement','task','project_update','quick_question','team_win','general_update'];
        setActivePostTypes(types);
        await AsyncStorage.setItem(CACHE.postTypes, JSON.stringify(types));
      }
      console.log('AppContext loaded — profile:', freshProfile?.full_name, 'org:', freshOrg?.name, 'role:', freshRole);
    } catch (err) {
      console.warn('AppContext load error:', err.message);
    } finally {
      setReady(true);
    }
  }, []);

  const updateProfile = async (updates) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await AsyncStorage.setItem(CACHE.profile, JSON.stringify(updated));
  };

  const updateOrg = async (updates) => {
    const updated = { ...org, ...updates };
    setOrg(updated);
    await AsyncStorage.setItem(CACHE.org, JSON.stringify(updated));
  };

  const isAdmin     = role === 'admin';
  const displayName = profile?.full_name || user?.email?.split('@')[0] || '';
  const initials    = profile?.avatar_initials ||
    displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const avatarColor = profile?.avatar_color || '#1D4ED8';
  const orgName     = org?.name || '';
  const orgId       = org?.id || null;

  // ── Realtime — sync org name + settings to ALL devices ──────────────────
  useEffect(() => {
    if (!org?.id) return;
    const channel = supabase
      .channel(`org-context-${org.id}`)
      // Org name / settings changes
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'organisations',
        filter: `id=eq.${org.id}`,
      }, async (payload) => {
        if (!payload.new) return;
        const updatedOrg = { ...org, ...payload.new };
        setOrg(updatedOrg);
        await AsyncStorage.setItem(CACHE.org, JSON.stringify(updatedOrg));
      })
      // Post types changes
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'org_settings',
        filter: `org_id=eq.${org.id}`,
      }, async (payload) => {
        const types = payload.new?.active_post_types;
        if (!types) return;
        setActivePostTypes(types);
        await AsyncStorage.setItem(CACHE.postTypes, JSON.stringify(types));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [org?.id]);

  return (
    <AppContext.Provider value={{
      // Auth
      user,
      // Profile
      profile,
      displayName,
      initials,
      avatarColor,
      // Org
      org,
      orgId,
      orgName,
      activePostTypes,
      setActivePostTypes,
      // Role
      role,
      isAdmin,
      // State
      ready,
      registering,
      // Actions
      load,
      setRegistering: (v) => { registering.current = v; },
      updateProfile,
      updateOrg,
      setResolve,
      recheck,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}