// src/navigation/AuthNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import AppNavigator from './AppNavigator';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ completeOnboarding }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"      component={LoginScreen}      />
      <Stack.Screen name="Register"   component={RegisterScreen}   />
      <Stack.Screen name="Onboarding">
        {props => <OnboardingScreen {...props} completeOnboarding={completeOnboarding} />}
      </Stack.Screen>
      <Stack.Screen name="App"        component={AppNavigator}     />
    </Stack.Navigator>
  );
}