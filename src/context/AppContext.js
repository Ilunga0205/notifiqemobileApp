// src/context/AppContext.js
//
// Global store for the current user's profile and org.
// App.js handles auth state — AppContext only loads data once logged in.

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const CACHE = {
  profile: 'notifiqe_profile',
  org:     'notifiqe_org',
};

export function AppProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const registering = useRef(false); // suppress SIGNED_IN during registration
  const [profile, setProfile] = useState(null);
  const [org,     setOrg]     = useState(null);
  const [role,    setRole]    = useState(null);
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
      await AsyncStorage.multiRemove([CACHE.profile, CACHE.org]);
      setReady(true);
      return;
    }

    // ✅ Get session synchronously first — fastest way to get user
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setUser(session.user);
    console.log('AppContext load() called with userId:', userId);

    // Show cached data immediately
    const [cachedProfile, cachedOrg] = await Promise.all([
      AsyncStorage.getItem(CACHE.profile),
      AsyncStorage.getItem(CACHE.org),
    ]);
    if (cachedProfile) setProfile(JSON.parse(cachedProfile));
    if (cachedOrg)     setOrg(JSON.parse(cachedOrg));

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
          .maybeSingle(), // ← maybeSingle so it doesn't throw if no active membership
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