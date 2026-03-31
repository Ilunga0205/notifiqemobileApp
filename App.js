// App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthNavigator            from './src/navigation/AuthNavigator';
import AppNavigator             from './src/navigation/AppNavigator';
import { AppProvider, useApp }  from './src/context/AppContext';
import { supabase }             from './src/lib/supabase';
import { isOnboardingDone, markOnboardingDone } from './src/services/auth.service';

const RootStack = createNativeStackNavigator();

const AppScreen = () => <AppNavigator />;

function Inner() {
  const { load, setResolve, ready, registering } = useApp();
  const [appState, setAppState]   = useState('loading');
  const appStateRef               = useRef('loading'); // ✅ always current value
  const mounted                   = useRef(true);

  // ✅ Always update both the ref and the state together
  const updateAppState = useCallback((s) => {
    appStateRef.current = s;
    setAppState(s);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingDone();
    updateAppState('app');
  }, []);

  const resolve = useCallback(async (session) => {
    try {
      if (!session?.user) {
        await load(null);
        updateAppState('auth');
        return;
      }

      const { data: memberships } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .limit(1);

      if (!memberships?.length) {
        console.log('No active membership found');
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        console.log('Profile exists:', !!profile);

        if (!profile) {
          console.log('No profile → signing out');
          await supabase.auth.signOut();
          updateAppState('auth');
          return;
        }

        console.log('Has profile → no_workspace');
        await load(null);
        updateAppState('no_workspace');
        return;
      }

      await load(session.user.id);
      const done = await isOnboardingDone();
      console.log('resolve → about to setAppState, done:', done);
      updateAppState(done ? 'app' : 'onboarding');

    } catch (err) {
      console.warn('resolve error FULL:', err);
      updateAppState('auth');
    }
  }, [load]);

  // ✅ Keep setResolve in sync
  useEffect(() => {
    setResolve(resolve);
  }, [resolve]);

  // ✅ Initial session check
  useEffect(() => {
    mounted.current = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted.current) return;
      if (!user) {
        updateAppState('auth');
        return;
      }
      resolve({ user });
    });

    return () => {
      mounted.current = false;
    };
  }, [resolve]);

  // ✅ Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AUTH EVENT:', event, 'registering:', registering.current, 'appState:', appStateRef.current);

        if (!mounted.current) return;

        if (event === 'SIGNED_OUT') {
          registering.current = false;
          await load(null);
          updateAppState('auth');
        }

        // ✅ Ignore SIGNED_IN if already in the app — prevents leave-workspace
        // from firing resolve() while Login screen is mounted with spinner running
        if (event === 'SIGNED_IN' && !registering.current && appStateRef.current !== 'app') {
          console.log('SIGNED_IN → calling resolve with user:', session?.user?.id);
          resolve(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [resolve]);

  if (appState === 'loading' || (appState === 'app' && !ready)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color="#1D4ED8" />
      </View>
    );
  }

  if (appState === 'app') {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          <RootStack.Screen name="App" component={AppScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  const authInitialRoute =
    appState === 'no_workspace' ? 'NoWorkspace' :
    appState === 'onboarding'   ? 'Onboarding'  :
    'Login';

  return (
    // ✅ key={authInitialRoute} forces a full remount of NavigationContainer
    // whenever the target screen changes (e.g. Login → NoWorkspace).
    // This is necessary because initialRoute is read-once on mount —
    // changing it as a prop has no effect on an already-mounted navigator.
    <NavigationContainer key={authInitialRoute}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <RootStack.Screen name="Auth">
          {(props) => (
            <AuthNavigator
              {...props}
              completeOnboarding={completeOnboarding}
              initialRoute={authInitialRoute}
            />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Inner />
      </AppProvider>
    </SafeAreaProvider>
  );
}