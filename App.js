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

// ── These are defined OUTSIDE Inner so they never get recreated ───────────────
const AppScreen  = () => <AppNavigator />;

function Inner() {
  const { load, setResolve, ready, registering } = useApp();
  const [appState, setAppState]     = useState('loading');
  const mounted                     = useRef(true);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingDone();
    setAppState('app');
  }, []);

  const resolve = useCallback(async (session) => {
    try {
      if (!session?.user) {
        await load(null);
        setAppState('auth');
        return;
      }

      const { data: memberships } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .limit(1);

      if (!memberships?.length) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          setAppState('auth');
          return;
        }

        await load(null);
        setAppState('no_workspace');
        return;
      }

      await load(session.user.id);
      const done = await isOnboardingDone();
      setAppState(done ? 'app' : 'onboarding');

    } catch (err) {
      console.warn('resolve error:', err.message);
      setAppState('auth');
    }
  }, [load]);

  useEffect(() => {
    setResolve(resolve);
  }, [resolve]);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted.current) return;
      if (!user) { setAppState('auth'); return; }
      resolve({ user });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;
        if (event === 'SIGNED_OUT') {
          console.log('SIGNED_OUT → auth');
          await load(null);
          setAppState('auth');
        }
        // ✅ Ignore SIGNED_IN during registration — RegisterScreen handles its own flow
        if (event === 'SIGNED_IN' && !registering.current) {
          console.log('SIGNED_IN → resolve');
          resolve(session);
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

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

  // ✅ AuthScreen is stable — created once per appState value
  // completeOnboarding is memoized so it never changes reference
  return (
    <NavigationContainer>
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