// src/navigation/AuthNavigator.js
import React, { useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen        from '../screens/auth/LoginScreen';
import RegisterScreen     from '../screens/auth/RegisterScreen';
import OnboardingScreen   from '../screens/auth/OnboardingScreen';
import NoWorkspaceScreen  from '../screens/auth/NoWorkspaceScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ completeOnboarding, initialRoute = 'Login' }) {
  // Lock initial route on first mount — never changes
  const lockedRoute = useRef(initialRoute).current;

  return (
    <Stack.Navigator
      initialRouteName={lockedRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login"       component={LoginScreen} />
      <Stack.Screen name="Register">
        {props => <RegisterScreen {...props} completeOnboarding={completeOnboarding} />}
      </Stack.Screen>
      <Stack.Screen name="NoWorkspace">
        {props => <NoWorkspaceScreen {...props} completeOnboarding={completeOnboarding} />}
      </Stack.Screen>
      <Stack.Screen name="Onboarding">
        {props => <OnboardingScreen {...props} completeOnboarding={completeOnboarding} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}