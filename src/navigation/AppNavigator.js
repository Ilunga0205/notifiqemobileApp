// src/navigation/AppNavigator.js
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FeedScreen from '../screens/app/FeedScreen';
import CalendarScreen from '../screens/app/CalendarScreen';
import MembersScreen from '../screens/app/MembersScreen';
import HistoryScreen from '../screens/app/HistoryScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import SettingsScreen from '../screens/app/SettingsScreen';
import InboxScreen from '../screens/app/InboxScreen';
import PostDetailScreen from '../screens/app/PostDetailScreen';
import { colors, typography, spacing } from '../lib/tokens';

const Tab = createBottomTabNavigator();

// ── PLACEHOLDER SCREENS ───────────────────────────────────────────────────────

// CalendarScreen imported below

// MembersScreen imported below

// ── TAB ICONS — simple geometric shapes, render identically on all platforms ──

function FeedIcon({ focused }) {
  const c = focused ? colors.brand : '#C4C9D4';
  return (
    <View style={{ gap: 3, alignItems: 'flex-start' }}>
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: c }} />
      <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: c }} />
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: c }} />
    </View>
  );
}

function CalendarIcon({ focused }) {
  const c = focused ? colors.brand : '#C4C9D4';
  return (
    <View style={{ width: 16, height: 16, borderWidth: 1.5, borderColor: c, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ height: 5, backgroundColor: c }} />
    </View>
  );
}

function MembersIcon({ focused }) {
  const c = focused ? colors.brand : '#C4C9D4';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: c, marginBottom: 1 }} />
    </View>
  );
}

function InboxIcon({ focused, badge }) {
  const c = focused ? colors.brand : '#C4C9D4';
  return (
    <View style={{ width: 18, height: 16, position: 'relative' }}>
      {/* Envelope flap */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, borderWidth: 1.5, borderColor: c, borderBottomWidth: 0, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      {/* Envelope body */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, borderWidth: 1.5, borderColor: c, borderTopWidth: 0 }} />
      {/* Diagonal lines */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: 9, height: 8, borderRightWidth: 1.5, borderRightColor: c, transform: [{ skewX: '30deg' }] }} />
      {badge > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#DC2626', borderRadius: 6, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'white' }}>
          <Text style={{ fontSize: 8, fontWeight: '800', color: 'white' }}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

// ── CUSTOM TAB BAR ────────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: 'Feed',     label: 'Feed',     Icon: FeedIcon     },
    { name: 'Calendar', label: 'Calendar', Icon: CalendarIcon },
    { name: 'Members',  label: 'Members',  Icon: MembersIcon  },
  ];

  return (
    <View style={[
      styles.tabBar,
      { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0) }
    ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { Icon, label } = tabs[index];
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
          >
            {/* Active indicator line at top */}
            <View style={[styles.tabLine, focused && styles.tabLineActive]} />
            <View style={styles.tabContent}>
              <Icon focused={focused} />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── NAVIGATOR ─────────────────────────────────────────────────────────────────

import { createNativeStackNavigator } from '@react-navigation/native-stack';

const AppStack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Feed"     component={FeedScreen}     />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Members"  component={MembersScreen}  />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs"    component={TabNavigator}   />
      <AppStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    // Crisp shadow that works on both platforms
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabLine: {
    height: 2,
    width: '40%',
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  tabLineActive: {
    backgroundColor: colors.brand,
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: typography.medium,
    color: '#C4C9D4',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.brand,
    fontWeight: typography.bold,
  },
});