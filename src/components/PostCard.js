// src/components/PostCard.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Pressable,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius } from '../lib/tokens';
import { getPostType } from '../services/post.service';
import CommentInput from './CommentInput';

const REACTION_OPTIONS = ['👍','🎉','❤️','👀','✅','🙌','🔥'];

function Avatar({ initials, size = 32, color }) {
  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color ? color + '18' : '#EFF6FF',
      borderColor: color ? color + '35' : '#BFDBFE',
    }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33, color: color || colors.brand }]}>
        {initials}
      </Text>
    </View>
  );
}

function renderContent(text, typeColor) {
  const parts = text.split(/(@[^\s]+)/g);
  return (
    <Text style={styles.postContent}>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <Text key={i} style={[styles.mention, { color: typeColor || '#2563EB' }]}>{part}</Text>
          : <Text key={i} style={{ color: '#1F2937' }}>{part}</Text>
      )}
    </Text>
  );
}

function formatPostTime(date) {
  if (!date) return '';
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const postDay   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr   = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (postDay.getTime() === today.getTime())     return timeStr;
  if (postDay.getTime() === yesterday.getTime()) return `Yesterday ${timeStr}`;
  if (now - date < 7 * 86400000) return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${timeStr}`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function AckBar({ post, isAdmin, deptMembers, onAcknowledge, typeColor }) {
  const allAcked = post.ackCount >= (deptMembers?.length || 1);
  const pct = Math.min(100, Math.round((post.ackCount / (deptMembers?.length || 1)) * 100));

  const pendingNames = isAdmin
    ? (deptMembers || [])
        .filter(m => !post.post_acknowledgements?.some?.(a => a.user_id === m.user_id) &&
                     post.ackCount < (deptMembers?.length || 1))
        .map(m => m.profiles?.full_name)
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return (
    <View style={[styles.ackBar, allAcked && styles.ackBarDone]}>
      <View style={styles.ackBarRow}>
        <View style={styles.ackLeft}>
          <View style={styles.ackTrack}>
            <View style={[styles.ackFill, { width: `${pct}%`, backgroundColor: allAcked ? '#10B981' : typeColor }]} />
          </View>
          <Text style={[styles.ackLabel, allAcked && { color: '#065F46' }]}>
            {allAcked ? 'Everyone confirmed' : `${post.ackCount} of ${deptMembers?.length || '?'} confirmed`}
          </Text>
        </View>
        {!post.userHasAcked ? (
          <TouchableOpacity style={[styles.ackBtn, { backgroundColor: typeColor }]} onPress={onAcknowledge} activeOpacity={0.85}>
            <Text style={styles.ackBtnText}>✓  Confirm</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.ackDoneText}>✓  Confirmed</Text>
        )}
      </View>
      {isAdmin && pendingNames.length > 0 && (
        <Text style={styles.ackPending}>Waiting on: {pendingNames.join(', ')}</Text>
      )}
    </View>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, isAdmin, userId, orgId, deptMembers, activeDeptId, onAcknowledge, onPin, onUnpin, onDelete, onReact, onComment, onPress }) {
  console.log('=== PostCard render === orgId:', orgId, 'postId:', post?.id);
  const isOwner = post.authorId === userId || post.author_id === userId;
  const [showPicker,   setShowPicker]   = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);

  const typeInfo = getPostType(post.type);

  const handleReact = (emoji) => {
    onReact(post.id, emoji);
    setShowPicker(false);
  };

  return (
    <TouchableOpacity onPress={showComments ? undefined : onPress} activeOpacity={showComments ? 1 : 0.97} style={styles.card}>

      {/* Type strip */}
      <View style={[styles.cardTypeStrip, { backgroundColor: typeInfo?.bg }]}>
        <View style={[styles.cardTypeDot, { backgroundColor: typeInfo?.color }]} />
        <Text style={[styles.cardTypeLabel, { color: typeInfo?.color }]}>
          {typeInfo?.label?.toUpperCase()}
        </Text>
        {post.pinned && (
          <View style={styles.pinnedChip}>
            <Text style={[styles.pinnedChipText, { color: typeInfo?.color }]}>Pinned</Text>
          </View>
        )}
        {post.department?.name && post.department.name.toLowerCase() !== 'general' && activeDeptId === 'all' && (
          <View style={styles.deptChip}>
            <Text style={styles.deptChipText}>{post.department.name}</Text>
          </View>
        )}
        {(isAdmin || isOwner) && (
          <View style={styles.menuWrap}>
            <TouchableOpacity onPress={() => setShowMenu(p => !p)} style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.moreBtnText, { color: typeInfo?.color + '99' }]}>•••</Text>
            </TouchableOpacity>
            {showMenu && (
              <View style={styles.menuDropdown}>
                {isAdmin && (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { post.pinned ? onUnpin(post.id) : onPin(post.id); setShowMenu(false); }}>
                      <Text style={styles.menuItemText}>{post.pinned ? 'Unpin' : 'Pin to top'}</Text>
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                  </>
                )}
                <TouchableOpacity style={styles.menuItem} onPress={() => { onDelete(post.id); setShowMenu(false); }}>
                  <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete my post</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <View style={styles.cardAuthorRow}>
          <Avatar initials={post.authorInitials} size={28} color={post.authorColor} />
          <Text style={styles.cardAuthor}>{post.author}</Text>
          <Text style={styles.cardTime}>
            {formatPostTime(post.postedAt)}
          </Text>
        </View>

        <View style={styles.cardContentWrap}>
          {renderContent(post.content, typeInfo?.color)}
        </View>

        {/* Reactions */}
        {Object.keys(post.reactions || {}).length > 0 && (
          <View style={styles.reactions}>
            {Object.entries(post.reactions).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.reactionChip, post.userReactions?.includes(emoji) && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={() => handleReact(emoji)}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionText}>{emoji} {count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ack bar */}
        {post.requiresAck && (
          <AckBar
            post={post}
            isAdmin={isAdmin}
            deptMembers={deptMembers}
            onAcknowledge={() => onAcknowledge(post.id)}
            typeColor={typeInfo?.color}
          />
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPicker(p => !p)} activeOpacity={0.7}>
            <Text style={styles.actionText}>React</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(p => !p)} activeOpacity={0.7}>
            <Text style={styles.actionText}>
              {post.commentCount > 0 ? `${post.commentCount} ${post.commentCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
            </Text>
          </TouchableOpacity>
          {isAdmin && (
            <Text style={styles.seenText}>Seen {post.seenCount}/{deptMembers?.length || '?'}</Text>
          )}
        </View>

        {/* Reaction picker */}
        {showPicker && (
          <View style={styles.reactionPicker}>
            {REACTION_OPTIONS.map(e => (
              <TouchableOpacity key={e} onPress={() => handleReact(e)} style={styles.reactionPickerBtn} activeOpacity={0.7}>
                <Text style={styles.reactionPickerEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Comments */}
        {showComments && (
          <Pressable onPress={e => e.stopPropagation()}>
          <View style={styles.commentsWrap}>
            {(post.comments || []).map((c, i) => {
              const isDone = c.content?.startsWith('✓') && c.content?.includes('marked this done');
              return (
                <View key={c.id || i} style={isDone ? styles.doneComment : styles.commentRow}>
                  {isDone ? (
                    <Text style={styles.doneCommentText}>{c.content}</Text>
                  ) : (
                    <>
                      <Avatar
                        initials={c.author?.avatar_initials || (c.author?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                        size={24}
                        color={c.author?.avatar_color}
                      />
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentMeta}>{c.author?.full_name || 'Unknown'} · {new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Text style={styles.commentText}>{c.content}</Text>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
            <CommentInput
              orgId={orgId}
              departmentId={post.departmentId}
              authorId={userId}
              onSend={async (text, mentionedIds) => {
                console.log('[PostCard] onSend called, mentionedIds:', mentionedIds);
                await onComment(post.id, text, mentionedIds);
              }}
            />


          </View>
          </Pressable>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:             { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  cardTypeStrip:    { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10 },
  cardTypeDot:      { width: 7, height: 7, borderRadius: 4 },
  cardTypeLabel:    { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  pinnedChip:       { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  pinnedChipText:   { fontSize: 10, fontWeight: '700' },
  deptChip:         { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.06)' },
  deptChipText:     { fontSize: 10, fontWeight: '600', color: '#374151' },
  menuWrap:         { position: 'relative' },
  moreBtn:          { padding: 4 },
  moreBtnText:      { fontSize: 13, letterSpacing: 1 },
  menuDropdown:     { position: 'absolute', top: 28, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, minWidth: 150, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  menuItem:         { paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText:     { fontSize: 14, fontWeight: '500', color: '#374151' },
  menuDivider:      { height: 1, backgroundColor: '#F3F4F6' },
  cardBody:         { paddingHorizontal: 16, paddingBottom: 8 },
  cardAuthorRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  cardAuthor:       { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  cardTime:         { fontSize: 11, color: '#9CA3AF' },
  cardContentWrap:  { marginBottom: 12 },
  postContent:      { fontSize: 15, color: '#1F2937', lineHeight: 23 },
  mention:          { color: '#2563EB', fontWeight: '600' },
  reactions:        { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  reactionChip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  reactionText:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  ackBar:           { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, marginBottom: 10 },
  ackBarDone:       { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  ackBarRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ackLeft:          { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ackTrack:         { width: 48, height: 3, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  ackFill:          { height: '100%', borderRadius: 2 },
  ackLabel:         { fontSize: 12, color: '#9CA3AF' },
  ackBtn:           { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  ackBtnText:       { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  ackDoneText:      { fontSize: 12, fontWeight: '600', color: '#065F46' },
  ackPending:       { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  cardActions:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  actionText:       { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  seenText:         { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' },
  reactionPicker:   { flexDirection: 'row', paddingTop: 8, gap: 4 },
  reactionPickerBtn:{ padding: 6, borderRadius: 8, backgroundColor: '#F9FAFB' },
  reactionPickerEmoji: { fontSize: 20 },
  commentsWrap:     { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8, marginTop: 8 },
  commentRow:       { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentBubble:    { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 },
  commentMeta:      { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  commentText:      { fontSize: 13, color: '#374151', lineHeight: 18 },
  doneComment:      { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#6EE7B7', marginVertical: 2 },
  doneCommentText:  { fontSize: 14, color: '#065F46', fontWeight: '700', letterSpacing: 0.1 },
  avatar:           { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:       { fontWeight: '700' },
});

export default PostCard;