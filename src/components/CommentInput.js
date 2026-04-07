// src/components/CommentInput.js
//
// Comment input with @mention support.
// Shows ALL org members when @ is typed — dept members first.
// Uses inline list — no Modal, no z-index issues.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { colors, typography, spacing } from '../lib/tokens';
import { supabase } from '../lib/supabase';

export default function CommentInput({ orgId, departmentId, authorId, onSend }) {
  const [text,       setText]       = useState('');
  const [posting,    setPosting]    = useState(false);
  const [allMembers, setAllMembers] = useState([]); // all org members
  const [showList,   setShowList]   = useState(false);
  const [query,      setQuery]      = useState('');

  // ── Load ALL org members once ─────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
supabase
      .from('memberships')
      .select('user_id, profiles(full_name, avatar_color, avatar_initials)')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[CommentInput] fetch error:', error.message);
          return;
        }
        console.log('[CommentInput] raw data:', JSON.stringify(data));
        const others = (data || []).filter(m => m.user_id !== authorId);
        console.log('[CommentInput] loaded', others.length, 'members:', others.map(m => m.profiles?.full_name));
        setAllMembers(others);
      });
  }, [orgId, departmentId, authorId]);

  // ── Detect @ and filter ───────────────────────────────────────────────
  const handleChange = (val) => {
    setText(val);
    const atIndex = val.lastIndexOf('@');
    if (atIndex !== -1) {
      const after = val.slice(atIndex + 1);
      if (!after.includes(' ')) {
        setQuery(after.toLowerCase());
        setShowList(true);
        return;
      }
    }
    setShowList(false);
    setQuery('');
  };

  // ── Pick a member from the list ───────────────────────────────────────
  const pickMember = (member) => {
    const name    = member.profiles?.full_name || '';
    const atIndex = text.lastIndexOf('@');
    setText(text.slice(0, atIndex) + `@${name} `);
    setShowList(false);
    setQuery('');
  };

  // ── Send comment ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const mentionedIds = allMembers
        .filter(m => {
          const name = m.profiles?.full_name || '';
          return name.length > 0 && text.includes(`@${name}`);
        })
        .map(m => m.user_id);
      await onSend(text.trim(), mentionedIds);
      setText('');
    } catch (e) {
      console.warn('[CommentInput] send error:', e.message);
    } finally {
      setPosting(false);
    }
  };

  // ── Filter members by query ───────────────────────────────────────────
  const filtered = query.length === 0
    ? allMembers
    : allMembers.filter(m =>
        m.profiles?.full_name?.toLowerCase().includes(query)
      );

  return (
    <View>
      {/* Member list — appears when @ typed */}
      {showList && filtered.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.groupLabel}>Team members — tap to mention</Text>
          {filtered.map(m => (
            <MemberRow key={m.user_id} member={m} onPress={() => pickMember(m)} />
          ))}
        </View>
      )}

      {showList && filtered.length === 0 && (
        <View style={styles.noMatch}>
          <Text style={styles.noMatchText}>No member found for "@{query}"</Text>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Reply... (@ to mention)"
          placeholderTextColor={colors.placeholder}
          value={text}
          onChangeText={handleChange}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          autoCorrect={false}
        />
        {text.trim() ? (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            disabled={posting}
            activeOpacity={0.85}
          >
            <Text style={styles.sendText}>{posting ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, onPress }) {
  const name     = member.profiles?.full_name || 'Unknown';
  const initials = member.profiles?.avatar_initials ||
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const color    = member.profiles?.avatar_color || '#2563EB';

  return (
    <TouchableOpacity style={styles.memberRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: color + '20', borderColor: color + '50' }]}>
        <Text style={[styles.avatarText, { color }]}>{initials}</Text>
      </View>
      <Text style={styles.memberName}>{name}</Text>
      <Text style={styles.mentionAt}>@</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list:         { backgroundColor: '#F0F9FF', borderWidth: 1.5, borderColor: '#7DD3FC', borderRadius: 12, marginBottom: 6, overflow: 'hidden' },
  groupLabel:   { fontSize: 10, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E0F2FE', borderBottomWidth: 1, borderBottomColor: '#BAE6FD' },
  memberRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0F2FE' },
  avatar:       { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 11, fontWeight: '700' },
  memberName:   { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  mentionAt:    { fontSize: 16, color: '#2563EB', fontWeight: '700' },
  noMatch:      { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 6 },
  noMatchText:  { fontSize: 13, color: '#92400E', textAlign: 'center' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input:        { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB' },
  sendBtn:      { backgroundColor: '#2563EB', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  sendText:     { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});