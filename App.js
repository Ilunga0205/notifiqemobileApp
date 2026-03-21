// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator  from './src/navigation/AppNavigator';
import { supabase }  from './src/lib/supabase';

const RootStack = createNativeStackNavigator();

// Key to track onboarding completion
const ONBOARDING_KEY = 'notifiqe_onboarding_done';

export default function App() {
  const [session,           setSession]           = useState(null);
  const [checking,          setChecking]          = useState(true);
  const [onboardingDone,    setOnboardingDone]    = useState(false);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('notifiqe_onboarding_done', 'true');
    setOnboardingDone(true);
  };

  useEffect(() => {
    const init = async () => {
      // Check session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // Check if onboarding was completed
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingDone(done === 'true');

      setChecking(false);
    };
    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!session ? (
            <RootStack.Screen name="Auth">
              {props => <AuthNavigator {...props} completeOnboarding={completeOnboarding} />}
            </RootStack.Screen>
          ) : onboardingDone ? (
            <RootStack.Screen name="App" component={AppNavigator} />
          ) : (
            // Has session but hasn't done onboarding yet
            <RootStack.Screen name="Auth">
              {props => <AuthNavigator {...props} completeOnboarding={completeOnboarding} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}