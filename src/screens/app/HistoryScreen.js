// src/screens/app/HistoryScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { getArchivedPosts, POST_TYPES, getPostType } from '../../services/post.service';
import { getDepartments } from '../../services/member.service';

const PAGE_SIZE = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 28, color }) {
  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color ? color + '18' : '#EFF6FF',
      borderColor:     color ? color + '35' : '#BFDBFE',
    }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33, color: color || colors.brand }]}>
        {initials}
      </Text>
    </View>
  );
}

function timeAgo(date) {
  if (!date) return '';
  const d    = date instanceof Date ? date : new Date(date);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderContent(text, query, typeColor) {
  // Split by @mentions first, then by search query
  const atParts = text.split(/(@[^\s]+)/g);
  return (
    <Text style={styles.postContent} numberOfLines={3}>
      {atParts.map((part, i) => {
        if (part.startsWith('@')) {
          return <Text key={i} style={{ color: typeColor || '#2563EB', fontWeight: '600' }}>{part}</Text>;
        }
        if (!query.trim()) return <Text key={i} style={{ color: '#374151' }}>{part}</Text>;
        // Highlight search within non-mention parts
        const subParts = part.split(new RegExp(`(${query})`, 'gi'));
        return subParts.map((sub, j) =>
          sub.toLowerCase() === query.toLowerCase()
            ? <Text key={`${i}-${j}`} style={styles.highlight}>{sub}</Text>
            : <Text key={`${i}-${j}`} style={{ color: '#374151' }}>{sub}</Text>
        );
      })}
    </Text>
  );
}

// ── Post card (read-only, compact) ────────────────────────────────────────────

function HistoryCard({ post, query, onPress }) {
  const typeInfo = getPostType(post.type);
  const totalReactions = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardStrip, { backgroundColor: typeInfo.bg }]}>
        <View style={[styles.typeDot, { backgroundColor: typeInfo.color }]} />
        <Text style={[styles.typeLabel, { color: typeInfo.color }]}>
          {typeInfo.label.toUpperCase()}
        </Text>
        {post.department?.name && post.department.name.toLowerCase() !== 'general' && (
          <View style={styles.deptChip}>
            <Text style={styles.deptChipText}>{post.department.name}</Text>
          </View>
        )}
        <Text style={styles.timeAgo}>{timeAgo(post.postedAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.authorRow}>
          <Avatar initials={post.authorInitials} size={24} color={post.authorColor} />
          <Text style={styles.authorName}>{post.author}</Text>
        </View>
        {renderContent(post.content, query, typeInfo?.color)}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {totalReactions > 0 && (
            <Text style={styles.statText}>{totalReactions} reaction{totalReactions > 1 ? 's' : ''}</Text>
          )}
          {post.commentCount > 0 && (
            <Text style={styles.statText}>{post.commentCount} repl{post.commentCount > 1 ? 'ies' : 'y'}</Text>
          )}
          {post.requiresAck && (
            <Text style={[styles.statText, { color: post.ackCount >= (post.totalRecipients || 1) ? '#065F46' : colors.muted }]}>
              {post.ackCount >= (post.totalRecipients || 1) ? '✓ All confirmed' : `${post.ackCount} confirmed`}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({ activeType, setActiveType, activeDept, setActiveDept, departments, activePostTypes }) {
  const [showTypes, setShowTypes] = useState(false);
  const [showDepts, setShowDepts] = useState(false);

  const activeTypeInfo = POST_TYPES.find(t => t.id === activeType);
  const activeDeptInfo = departments.find(d => d.id === activeDept);

  return (
    <View>
      <View style={styles.filterRow}>
        {/* Type filter */}
        <TouchableOpacity
          style={[styles.filterBtn, activeType && { backgroundColor: activeTypeInfo?.bg, borderColor: activeTypeInfo?.color + '50' }]}
          onPress={() => { setShowTypes(p => !p); setShowDepts(false); }}
          activeOpacity={0.8}
        >
          {activeType && <View style={[styles.filterDot, { backgroundColor: activeTypeInfo?.color }]} />}
          <Text style={[styles.filterBtnText, activeType && { color: activeTypeInfo?.color, fontWeight: typography.semibold }]}>
            {activeType ? activeTypeInfo?.label : 'Type ▾'}
          </Text>
        </TouchableOpacity>

        {/* Dept filter */}
        <TouchableOpacity
          style={[styles.filterBtn, activeDept && { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}
          onPress={() => { setShowDepts(p => !p); setShowTypes(false); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterBtnText, activeDept && { color: colors.brand, fontWeight: typography.semibold }]}>
            {activeDept ? activeDeptInfo?.name : 'Dept ▾'}
          </Text>
        </TouchableOpacity>

        {/* Clear */}
        {(activeType || activeDept) && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setActiveType(null); setActiveDept(null); setShowTypes(false); setShowDepts(false); }}
            activeOpacity={0.8}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type dropdown */}
      {showTypes && (
        <View style={styles.dropdown}>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => { setActiveType(null); setShowTypes(false); }}>
            <Text style={[styles.dropdownText, !activeType && { color: colors.brand, fontWeight: typography.semibold }]}>All types</Text>
          </TouchableOpacity>
          {(activePostTypes ? POST_TYPES.filter(t => activePostTypes.includes(t.id)) : POST_TYPES).map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.dropdownItem}
              onPress={() => { setActiveType(t.id); setShowTypes(false); }}
            >
              <View style={[styles.filterDot, { backgroundColor: t.color }]} />
              <Text style={[styles.dropdownText, activeType === t.id && { color: t.color, fontWeight: typography.semibold }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Dept dropdown */}
      {showDepts && (
        <View style={styles.dropdown}>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => { setActiveDept(null); setShowDepts(false); }}>
            <Text style={[styles.dropdownText, !activeDept && { color: colors.brand, fontWeight: typography.semibold }]}>All departments</Text>
          </TouchableOpacity>
          {departments.map(d => (
            <TouchableOpacity
              key={d.id}
              style={styles.dropdownItem}
              onPress={() => { setActiveDept(d.id); setShowDepts(false); }}
            >
              <Text style={[styles.dropdownText, activeDept === d.id && { color: colors.brand, fontWeight: typography.semibold }]}>{d.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HistoryScreen({ navigation }) {
  const { user, orgId, orgName, activePostTypes } = useApp();

  const [posts,       setPosts]       = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [page,        setPage]        = useState(0);
  const [query,       setQuery]       = useState('');
  const [activeType,  setActiveType]  = useState(null);
  const [activeDept,  setActiveDept]  = useState(null);

  const searchTimeout = useRef(null);

  // ── Load posts ──────────────────────────────────────────────────────────

  const loadPosts = useCallback(async (pageNum = 0, searchQuery = '', typeFilter = null, deptFilter = null) => {
    if (!orgId || !user?.id) return;
    try {
      // Get all posts with pagination — history shows everything
      const all = await getArchivedPosts(orgId, user.id, {
        limit:  PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
      });

      // Client-side filter by search + type + dept
      let filtered = all;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          p.content?.toLowerCase().includes(q) ||
          p.author?.toLowerCase().includes(q) ||
          p.department?.name?.toLowerCase().includes(q)
        );
      }
      if (typeFilter)  filtered = filtered.filter(p => p.type === typeFilter);
      if (deptFilter)  filtered = filtered.filter(p => p.departmentId === deptFilter);

      if (pageNum === 0) {
        setPosts(filtered);
      } else {
        setPosts(prev => [...prev, ...filtered]);
      }
      setHasMore(all.length === PAGE_SIZE);
    } catch (err) {
      console.warn('HistoryScreen loadPosts error:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [orgId, user?.id]);

  useEffect(() => {
    if (!orgId || !user?.id) return;
    Promise.all([
      loadPosts(0, query, activeType, activeDept),
      getDepartments(orgId).then(setDepartments),
    ]);
  }, [orgId, user?.id]);

  // ── Search with debounce ────────────────────────────────────────────────

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
      setLoading(true);
      loadPosts(0, text, activeType, activeDept);
    }, 350);
  };

  // ── Filter change ───────────────────────────────────────────────────────

  useEffect(() => {
    setPage(0);
    setLoading(true);
    loadPosts(0, query, activeType, activeDept);
  }, [activeType, activeDept]);

  // ── Load more ───────────────────────────────────────────────────────────

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    loadPosts(next, query, activeType, activeDept);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const renderItem = ({ item }) => (
    <HistoryCard
      post={item}
      query={query}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>
        {query ? `No results for "${query}"` : 'No archived posts yet'}
      </Text>
      <Text style={styles.emptySub}>
        {query ? 'Try a different search term or clear your filters.' : 'Posts older than 48 hours will appear here.'}
      </Text>
      {query && (
        <TouchableOpacity onPress={() => { setQuery(''); setActiveType(null); setActiveDept(null); }} style={styles.clearAllBtn} activeOpacity={0.8}>
          <Text style={styles.clearAllBtnText}>Clear search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const myDepts = departments.filter(d =>
    d.department_members?.some(m => m.user_id === user?.id)
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.appHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>History</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      ) : (
        <View style={[styles.headerBlock, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
          <View style={styles.appHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>History</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, authors..."
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterWrap}>
        <FilterBar
          activeType={activeType}
          setActiveType={setActiveType}
          activeDept={activeDept}
          setActiveDept={setActiveDept}
          departments={myDepts}
          activePostTypes={activePostTypes}
        />
      </View>

      {/* Results count */}
      {!loading && (
        <Text style={styles.resultsCount}>
          {posts.length}{hasMore ? '+' : ''} post{posts.length !== 1 ? 's' : ''}
          {activeType || activeDept || query ? ' found' : ' archived · newest first'}
        </Text>
      )}

      {/* List */}
      <FlatList
        data={loading ? [] : posts}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={loadingMore ? (
          <Text style={styles.loadingMore}>Loading more...</Text>
        ) : null}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#F3F4F6' },
  headerBlock:    { backgroundColor: colors.white, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appHeader:      { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, backgroundColor: colors.white },
  backBtn:        { width: 60 },
  backText:       { fontSize: 15, color: colors.brand, fontWeight: typography.medium },
  headerTitle:    { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  searchWrap:     { backgroundColor: colors.white, paddingHorizontal: spacing.page, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  searchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: radius.lg, paddingHorizontal: spacing.md, height: 40 },
  searchIcon:     { fontSize: 16, color: colors.placeholder, marginRight: 6 },
  searchInput:    { flex: 1, fontSize: 14, color: colors.black },
  searchClear:    { fontSize: 14, color: colors.placeholder, padding: 4 },
  filterWrap:     { backgroundColor: colors.white, paddingHorizontal: spacing.page, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  filterRow:      { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  filterBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterDot:      { width: 6, height: 6, borderRadius: 3 },
  filterBtnText:  { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  clearBtn:       { paddingHorizontal: 10, paddingVertical: 7 },
  clearBtnText:   { fontSize: 13, color: colors.brand, fontWeight: typography.medium },
  dropdown:       { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, marginTop: spacing.sm, overflow: 'hidden', zIndex: 100 },
  dropdownItem:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownText:   { fontSize: 14, color: colors.muted },
  resultsCount:   { fontSize: 12, color: colors.subtle, paddingHorizontal: spacing.page, paddingTop: spacing.sm, paddingBottom: 4 },
  listContent:    { paddingHorizontal: spacing.page, paddingTop: spacing.sm, paddingBottom: 40 },
  card:           { backgroundColor: colors.white, borderRadius: radius.xl, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  cardStrip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8 },
  typeDot:        { width: 6, height: 6, borderRadius: 3 },
  typeLabel:      { fontSize: 10, fontWeight: typography.black, letterSpacing: 0.8, flex: 1 },
  deptChip:       { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.06)' },
  deptChipText:   { fontSize: 10, fontWeight: typography.semibold, color: '#374151' },
  timeAgo:        { fontSize: 11, color: colors.subtle },
  cardBody:       { padding: spacing.md },
  authorRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  authorName:     { fontSize: 13, fontWeight: typography.semibold, color: colors.black },
  postContent:    { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 10 },
  highlight:      { backgroundColor: '#FEF9C3', color: '#92400E', fontWeight: typography.semibold },
  statsRow:       { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  statText:       { fontSize: 12, color: colors.subtle },
  emptyWrap:      { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.page },
  emptyTitle:     { fontSize: 16, fontWeight: typography.bold, color: colors.black, marginBottom: 6, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: colors.subtle, textAlign: 'center', lineHeight: 21 },
  clearAllBtn:    { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.brand },
  clearAllBtnText:{ fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  loadingMore:    { textAlign: 'center', fontSize: 12, color: colors.subtle, paddingVertical: 16 },
  avatar:         { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:     { fontWeight: typography.bold },
});