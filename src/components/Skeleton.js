// src/components/Skeleton.js
//
// Reusable skeleton loading components.
// Use these instead of spinners for a premium feel.
//
// Usage:
//   import { SkeletonFeed, SkeletonMembers, SkeletonCalendar } from '../../components/Skeleton';
//   if (loading && feed.length === 0) return <SkeletonFeed />;

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/tokens';

// ── Pulse animation ───────────────────────────────────────────────────────────

function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return opacity;
}

// ── Base bone ─────────────────────────────────────────────────────────────────

function Bone({ width = '100%', height = 14, borderRadius = 8, style }) {
  const opacity = usePulse();
  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: colors.borderLight, opacity }, style]} />
  );
}

// ── Skeleton header (shared across screens) ───────────────────────────────────

function SkeletonHeader() {
  return (
    Platform.OS === 'ios' ? (
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
        <View style={styles.header}>
          <Bone width={90} height={18} borderRadius={6} />
          <View style={{ flex: 1 }} />
          <Bone width={28} height={28} borderRadius={14} />
          <Bone width={28} height={28} borderRadius={14} style={{ marginLeft: 8 }} />
        </View>
      </SafeAreaView>
    ) : (
      <View style={[styles.header, { paddingTop: StatusBar.currentHeight }]}>
        <Bone width={90} height={18} borderRadius={6} />
        <View style={{ flex: 1 }} />
        <Bone width={28} height={28} borderRadius={14} />
        <Bone width={28} height={28} borderRadius={14} style={{ marginLeft: 8 }} />
      </View>
    )
  );
}

// ── Skeleton post card ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardStrip}>
        <Bone width={6} height={6} borderRadius={3} />
        <Bone width={100} height={10} borderRadius={5} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.authorRow}>
          <Bone width={28} height={28} borderRadius={14} />
          <Bone width={80} height={11} borderRadius={5} style={{ marginLeft: 8 }} />
          <View style={{ flex: 1 }} />
          <Bone width={40} height={10} borderRadius={5} />
        </View>
        <Bone width="100%" height={13} borderRadius={6} style={{ marginBottom: 6 }} />
        <Bone width="85%"  height={13} borderRadius={6} style={{ marginBottom: 6 }} />
        <Bone width="60%"  height={13} borderRadius={6} style={{ marginBottom: 14 }} />
        <View style={styles.actionsRow}>
          <Bone width={60} height={28} borderRadius={8} />
          <Bone width={60} height={28} borderRadius={8} style={{ marginLeft: 8 }} />
          <View style={{ flex: 1 }} />
          <Bone width={50} height={10} borderRadius={5} />
        </View>
      </View>
    </View>
  );
}

// ── Skeleton member row ───────────────────────────────────────────────────────

function SkeletonMemberRow() {
  return (
    <View style={styles.memberRow}>
      <Bone width={42} height={42} borderRadius={21} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Bone width="50%" height={13} borderRadius={6} style={{ marginBottom: 6 }} />
        <Bone width="70%" height={11} borderRadius={5} style={{ marginBottom: 6 }} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Bone width={60} height={20} borderRadius={4} />
          <Bone width={50} height={20} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

// ── Skeleton calendar day ─────────────────────────────────────────────────────

function SkeletonCalendarGrid() {
  return (
    <View>
      <View style={styles.monthNav}>
        <Bone width={24} height={24} borderRadius={12} />
        <Bone width={120} height={18} borderRadius={6} />
        <Bone width={24} height={24} borderRadius={12} />
      </View>
      <View style={styles.calGrid}>
        {Array.from({ length: 35 }).map((_, i) => (
          <View key={i} style={styles.calCell}>
            <Bone width={24} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── EXPORTED SKELETON SCREENS ─────────────────────────────────────────────────

export function SkeletonFeed() {
  return (
    <View style={styles.root}>
      <SkeletonHeader />
      <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
        <View style={styles.leaveBone}>
          <Bone width="60%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Bone width={18} height={18} borderRadius={9} />
            <Bone width="50%" height={11} borderRadius={5} />
          </View>
        </View>
        <View style={styles.pillsRow}>
          {[60, 80, 70, 90].map((w, i) => (
            <Bone key={i} width={w} height={30} borderRadius={15} style={{ marginRight: 6 }} />
          ))}
        </View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    </View>
  );
}

export function SkeletonMembers() {
  return (
    <View style={styles.root}>
      <SkeletonHeader />
      <ScrollView contentContainerStyle={styles.membersContent} showsVerticalScrollIndicator={false}>
        <View style={styles.memberPageHeader}>
          <View>
            <Bone width={100} height={20} borderRadius={6} style={{ marginBottom: 6 }} />
            <Bone width={60}  height={12} borderRadius={5} />
          </View>
          <Bone width={80} height={36} borderRadius={10} />
        </View>
        <Bone width="100%" height={44} borderRadius={12} style={{ marginBottom: 12 }} />
        <View style={styles.pillsRow}>
          {[50, 80, 70].map((w, i) => (
            <Bone key={i} width={w} height={30} borderRadius={15} style={{ marginRight: 6 }} />
          ))}
        </View>
        <Bone width={80} height={11} borderRadius={5} style={{ marginBottom: 10 }} />
        <SkeletonMemberRow />
        <SkeletonMemberRow />
        <SkeletonMemberRow />
        <Bone width={80} height={11} borderRadius={5} style={{ marginTop: 16, marginBottom: 10 }} />
        <SkeletonMemberRow />
        <SkeletonMemberRow />
      </ScrollView>
    </View>
  );
}

export function SkeletonCalendar() {
  return (
    <View style={styles.root}>
      <SkeletonHeader />
      <ScrollView contentContainerStyle={styles.calContent} showsVerticalScrollIndicator={false}>
        <SkeletonCalendarGrid />
        <View style={styles.selectedHeader}>
          <Bone width={120} height={14} borderRadius={6} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Bone width={40} height={26} borderRadius={13} />
            <Bone width={60} height={26} borderRadius={13} />
            <Bone width={50} height={26} borderRadius={13} />
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing.page, gap: spacing.sm }}>
          <View style={styles.eventCardBone}>
            <Bone width={60}  height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <Bone width="80%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
            <Bone width="50%" height={11} borderRadius={5} />
          </View>
          <View style={styles.eventCardBone}>
            <Bone width={50}  height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <Bone width="60%" height={14} borderRadius={6} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.white },
  header:          { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  feedContent:     { padding: spacing.page, paddingBottom: 60 },
  membersContent:  { padding: spacing.page, paddingBottom: 60 },
  calContent:      { paddingBottom: 60 },
  leaveBone:       { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  pillsRow:        { flexDirection: 'row', marginBottom: spacing.sm },
  card:            { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.sm, overflow: 'hidden' },
  cardStrip:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, backgroundColor: '#F9FAFB' },
  cardBody:        { padding: spacing.md },
  authorRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actionsRow:      { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  memberRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.sm },
  memberPageHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  monthNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md },
  calGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.page, marginBottom: spacing.md },
  calCell:         { width: '14.28%', aspectRatio: 0.85, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6 },
  selectedHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, marginBottom: spacing.sm },
  eventCardBone:   { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, borderLeftWidth: 4, borderLeftColor: colors.border, padding: spacing.md },
});