// src/screens/app/CalendarScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Pressable, KeyboardAvoidingView,
  Platform, StatusBar, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  EVENT_TYPES, LEAVE_TYPES, getEventType,
  getCalendarData, createCalendarEvent, updateCalendarEvent,
  deleteCalendarEvent, createLeaveEvent, deleteLeaveEvent, rsvpEvent,
} from '../../services/calendar.service';
import { DateRangePicker, DatePicker, dateToStr, strToDate } from '../../components/DatePicker';
import { getDepartments } from '../../services/member.service';

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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

function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function getEventsForDate(dateStr, events, leave) {
  return [
    ...events.filter(e => e.startDate <= dateStr && e.endDate >= dateStr),
    ...leave.filter(l => l.startDate <= dateStr && l.endDate >= dateStr),
  ];
}

// ── Event dot ─────────────────────────────────────────────────────────────────

function EventDots({ items }) {
  if (items.length === 0) return null;

  // Group by color to avoid 10 identical dots
  const colorMap = {};
  items.forEach(item => {
    colorMap[item.color] = (colorMap[item.color] || 0) + 1;
  });
  const uniqueColors = Object.keys(colorMap).slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <View style={styles.dotsRow}>
      {uniqueColors.map((color, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color }]} />
      ))}
      {hasMore && (
        <Text style={styles.dotMore}>+</Text>
      )}
    </View>
  );
}

// ── Event detail sheet ────────────────────────────────────────────────────────

function EventDetailSheet({ item, currentUserId, isAdmin, onClose, onDelete, onRsvp }) {
  if (!item) return null;

  const isLeave    = item.kind === 'leave';
  const typeInfo   = getEventType(item.type);
  const isCreator  = item.creatorId === currentUserId;
  const isMyLeave  = isLeave && item.userId === currentUserId;
  // Leave: only owner can delete their own leave
  // Events: creator or admin can delete
  const canDelete  = isMyLeave || (!isLeave && (isCreator || isAdmin));
  const myInvite   = item.invitees?.find(i => i.userId === currentUserId);
  const isInvited  = !!myInvite;
  const multiDay   = item.startDate !== item.endDate;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.detailSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={[styles.colorBar, { backgroundColor: isLeave ? item.color : typeInfo.color }]} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailBody}>

              {/* Header */}
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.typeBadge, { backgroundColor: isLeave ? '#ECFDF5' : typeInfo.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: isLeave ? '#065F46' : typeInfo.color }]}>
                      {isLeave ? item.title : typeInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.detailTitle}>{isLeave ? `${item.name} — on leave` : item.title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Date + time */}
              <View style={styles.detailRow}>
                <Text style={styles.detailIconText}>Date</Text>
                <Text style={styles.detailText}>
                  {formatDisplayDate(item.startDate)}
                  {multiDay ? ` — ${formatDisplayDate(item.endDate)}` : ''}
                </Text>
              </View>
              {item.startTime ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIconText}>Time</Text>
                  <Text style={styles.detailText}>
                    {formatTime(item.startTime)}{item.endTime ? ` — ${formatTime(item.endTime)}` : ''}
                  </Text>
                </View>
              ) : null}
              {item.location ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIconText}>Where</Text>
                  <Text style={styles.detailText}>{item.location}</Text>
                </View>
              ) : null}
              {item.zoomLink ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIconText}>Link</Text>
                  <Text style={[styles.detailText, { color: colors.brand }]}>{item.zoomLink}</Text>
                </View>
              ) : null}
              {item.note ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={styles.detailIconText}>Note</Text>
                  <Text style={[styles.detailText, { flex: 1, lineHeight: 20 }]}>{item.note}</Text>
                </View>
              ) : null}

              {/* Creator */}
              {!isLeave && item.creator ? (
                <View style={[styles.detailRow, { marginTop: spacing.sm }]}>
                  <Avatar initials={item.creatorInitials} size={22} color={item.creatorColor} />
                  <Text style={styles.detailMeta}>Created by {item.creator}</Text>
                </View>
              ) : null}

              {/* Invitees */}
              {!isLeave && item.invitees?.length > 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.sectionLabel}>INVITEES · {item.invitees.length}</Text>
                  <View style={styles.inviteeList}>
                    {item.invitees.map(inv => (
                      <View key={inv.userId} style={styles.inviteeRow}>
                        <Avatar initials={inv.initials} size={28} color={inv.color} />
                        <Text style={styles.inviteeName}>{inv.name}</Text>
                        <View style={[styles.rsvpBadge, {
                          backgroundColor: inv.rsvp === 'yes' ? '#ECFDF5' : inv.rsvp === 'no' ? '#FEF2F2' : '#F9FAFB',
                        }]}>
                          <Text style={[styles.rsvpText, {
                            color: inv.rsvp === 'yes' ? '#065F46' : inv.rsvp === 'no' ? '#DC2626' : '#9CA3AF',
                          }]}>
                            {inv.rsvp === 'yes' ? '✓ Going' : inv.rsvp === 'no' ? '✕ Declined' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* RSVP buttons for invited members */}
              {isInvited && myInvite.rsvp === 'pending' ? (
                <View style={styles.rsvpRow}>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}
                    onPress={() => onRsvp(item.id, 'yes')}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.rsvpBtnText, { color: '#065F46' }]}>✓ Going</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                    onPress={() => onRsvp(item.id, 'no')}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.rsvpBtnText, { color: '#DC2626' }]}>✕ Can't go</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Delete */}
              {canDelete ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} activeOpacity={0.8}>
                  <Text style={styles.deleteBtnText}>Delete {isLeave ? 'leave' : 'event'}</Text>
                </TouchableOpacity>
              ) : null}

              <View style={{ height: 32 }} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Add event / leave modal ───────────────────────────────────────────────────

function AddModal({ visible, onClose, onAdd, members, currentUser, selectedDate }) {
  const [mode,       setMode]       = useState('event'); // 'event' | 'leave'
  const [title,      setTitle]      = useState('');
  const [type,       setType]       = useState('meeting');
  const [startDate,  setStartDate]  = useState(selectedDate ? new Date(selectedDate + 'T00:00:00') : null);
  const [endDate,    setEndDate]    = useState(selectedDate ? new Date(selectedDate + 'T00:00:00') : null);
  const [startTime,  setStartTime]  = useState('');
  const [endTime,    setEndTime]    = useState('');
  const [location,   setLocation]   = useState('');
  const [zoomLink,   setZoomLink]   = useState('');
  const [note,       setNote]       = useState('');
  const [leaveType,  setLeaveType]  = useState('Annual leave');
  const [inviteeIds, setInviteeIds] = useState([]);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (visible) {
      setMode('event');
      setTitle('');
      setType('meeting');
      setStartDate(selectedDate ? new Date(selectedDate + 'T00:00:00') : null);
      setEndDate(selectedDate ? new Date(selectedDate + 'T00:00:00') : null);
      setStartTime('');
      setEndTime('');
      setLocation('');
      setZoomLink('');
      setNote('');
      setLeaveType('Annual leave');
      setInviteeIds([]);
    }
  }, [visible, selectedDate]);

  const toggleInvitee = (userId) => {
    setInviteeIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (saving) return;
    if (mode === 'event' && !title.trim()) return;
    if (!startDate) return;
    setSaving(true);
    try {
      await onAdd({ mode, title, type,
        startDate: dateToStr(startDate),
        endDate:   dateToStr(endDate),
        startTime, endTime, location, zoomLink, note, leaveType, inviteeIds
      });
      onClose();
    } catch (err) {
      console.warn('Add event error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const typeInfo = getEventType(type);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
          <Pressable style={styles.addSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.addHeader}>
              <Text style={styles.addTitle}>Add to calendar</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Mode toggle */}
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'event' && styles.modeBtnActive]}
                  onPress={() => setMode('event')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modeBtnText, mode === 'event' && styles.modeBtnTextActive]}>Event / Meeting</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'leave' && styles.modeBtnActive]}
                  onPress={() => setMode('leave')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modeBtnText, mode === 'leave' && styles.modeBtnTextActive]}>My Leave</Text>
                </TouchableOpacity>
              </View>

              {mode === 'event' ? (
                <>
                  {/* Type */}
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.typeRow}>
                    {EVENT_TYPES.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.typeChip, type === t.id && { backgroundColor: t.bg, borderColor: t.color + '50' }]}
                        onPress={() => setType(t.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.typeDot, { backgroundColor: t.color }]} />
                        <Text style={[styles.typeChipText, type === t.id && { color: t.color, fontWeight: typography.semibold }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Title */}
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Weekly standup"
                    placeholderTextColor={colors.placeholder}
                    value={title}
                    onChangeText={setTitle}
                  />

                  {/* Dates */}
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartChange={setStartDate}
                    onEndChange={setEndDate}
                    startLabel="Start date"
                    endLabel="End date"
                  />

                  {/* Times */}
                  <View style={styles.dateRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Start time</Text>
                      <TextInput style={styles.input} placeholder="09:00" placeholderTextColor={colors.placeholder} value={startTime} onChangeText={setStartTime} />
                    </View>
                    <View style={{ width: spacing.md }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>End time</Text>
                      <TextInput style={styles.input} placeholder="10:00" placeholderTextColor={colors.placeholder} value={endTime} onChangeText={setEndTime} />
                    </View>
                  </View>

                  {/* Location + Zoom */}
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput style={styles.input} placeholder="Board room, Zoom, etc." placeholderTextColor={colors.placeholder} value={location} onChangeText={setLocation} />

                  <Text style={styles.fieldLabel}>Zoom / meeting link</Text>
                  <TextInput style={styles.input} placeholder="https://zoom.us/j/..." placeholderTextColor={colors.placeholder} value={zoomLink} onChangeText={setZoomLink} autoCapitalize="none" />

                  {/* Note */}
                  <Text style={styles.fieldLabel}>Note</Text>
                  <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Any details..." placeholderTextColor={colors.placeholder} value={note} onChangeText={setNote} multiline />

                  {/* Invitees */}
                  <Text style={styles.fieldLabel}>Invite team members</Text>
                  <View style={styles.inviteeGrid}>
                    {members.map(m => {
                      const selected = inviteeIds.includes(m.user_id);
                      return (
                        <TouchableOpacity
                          key={m.user_id}
                          style={[styles.inviteeChip, selected && { backgroundColor: typeInfo.bg, borderColor: typeInfo.color + '50' }]}
                          onPress={() => toggleInvitee(m.user_id)}
                          activeOpacity={0.8}
                        >
                          <Avatar initials={m.initials} size={22} color={m.avatar_color} />
                          <Text style={[styles.inviteeChipText, selected && { color: typeInfo.color, fontWeight: typography.semibold }]}>
                            {m.full_name?.split(' ')[0]}
                          </Text>
                          {selected && <Text style={{ fontSize: 10, color: typeInfo.color }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  {/* Leave type */}
                  <Text style={styles.fieldLabel}>Leave type</Text>
                  <View style={styles.leaveTypeList}>
                    {LEAVE_TYPES.map(lt => (
                      <TouchableOpacity
                        key={lt}
                        style={[styles.leaveTypeRow, leaveType === lt && styles.leaveTypeRowActive]}
                        onPress={() => setLeaveType(lt)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.leaveTypeText, leaveType === lt && { color: '#065F46', fontWeight: typography.semibold }]}>{lt}</Text>
                        {leaveType === lt && <Text style={{ color: '#065F46', fontSize: 12 }}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Dates */}
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartChange={setStartDate}
                    onEndChange={setEndDate}
                    startLabel="From"
                    endLabel="To"
                  />

                  <View style={[styles.infoBanner]}>
                    <Text style={styles.infoBannerText}>
                      Your leave will appear on the team calendar and the "who's off today" banner in the feed.
                    </Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: (mode === 'event' ? !title.trim() : false) || !startDate || saving ? colors.border : colors.brand }]}
                onPress={handleSave}
                disabled={saving || (mode === 'event' && !title.trim()) || !startDate}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : mode === 'leave' ? 'Add leave' : 'Add to calendar'}</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }) {
  const { user, orgId, orgName, isAdmin } = useApp();

  const today     = new Date();
  const todayStr  = today.toISOString().split('T')[0];

  const [year,          setYear]          = useState(today.getFullYear());
  const [month,         setMonth]         = useState(today.getMonth() + 1);
  const [events,        setEvents]        = useState([]);
  const [leave,         setLeave]         = useState([]);
  const [members,       setMembers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedDate,  setSelectedDate]  = useState(todayStr);
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [filter,        setFilter]        = useState('all'); // 'all' | 'event' | 'leave'

  // ── Load data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!orgId || !user?.id) return;
    try {
      const [calData, depts] = await Promise.all([
        getCalendarData(orgId, year, month),
        getDepartments(orgId),
      ]);
      setEvents(calData.events);
      setLeave(calData.leave);

      // Flatten members from all depts
      const allMembers = [];
      const seen = new Set();
      depts.forEach(d => {
        (d.department_members || []).forEach(m => {
          if (!seen.has(m.user_id)) {
            seen.add(m.user_id);
            allMembers.push({
              user_id:         m.user_id,
              full_name:       m.profiles?.full_name || '',
              avatar_color:    m.profiles?.avatar_color || '#1D4ED8',
              avatar_initials: m.profiles?.avatar_initials ||
                (m.profiles?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
              initials:        m.profiles?.avatar_initials ||
                (m.profiles?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
            });
          }
        });
      });
      setMembers(allMembers);
    } catch (err) {
      console.warn('CalendarScreen loadData error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, user?.id, year, month]);

  // ✅ Ref always points to latest loadData — no stale closure in realtime
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; });

  useEffect(() => {
    if (orgId && user?.id) loadData();
  }, [orgId, user?.id, year, month, loadData]);

  // ── Realtime ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const reload = () => loadDataRef.current?.();
    const channel = supabase
      .channel(`calendar-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_events',    filter: `org_id=eq.${orgId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_invitees' },                                reload)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, loadData]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleAdd = async ({ mode, title, type, startDate, endDate, startTime, endTime, location, zoomLink, note, leaveType, inviteeIds }) => {
    if (mode === 'leave') {
      await createLeaveEvent({ orgId, userId: user.id, startDate, endDate, leaveType });
    } else {
      await createCalendarEvent({ orgId, creatorId: user.id, title, type, startDate, endDate, startTime, endTime, location, zoomLink, note, inviteeIds });
    }
    await loadData();
  };

  const handleDelete = async (item) => {
    if (item.kind === 'leave') {
      await deleteLeaveEvent(item.id);
    } else {
      await deleteCalendarEvent(item.id);
    }
    setSelectedItem(null);
    await loadData();
  };

  const handleRsvp = async (eventId, rsvp) => {
    await rsvpEvent(eventId, user.id, rsvp);
    setSelectedItem(prev => prev ? {
      ...prev,
      invitees: prev.invitees.map(i => i.userId === user.id ? { ...i, rsvp } : i)
    } : null);
    await loadData();
  };

  // ── Calendar grid ────────────────────────────────────────────────────────

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth     = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // ── Selected date items ──────────────────────────────────────────────────

  const selectedItems = getEventsForDate(selectedDate, events, leave)
    .filter(item => filter === 'all' || (filter === 'leave' ? item.kind === 'leave' : item.kind === 'event'));

  // ── Upcoming leave (for banner) ──────────────────────────────────────────

  const onLeaveToday = leave.filter(l => l.startDate <= todayStr && l.endDate >= todayStr);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 13, color: colors.subtle }}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {/* Header */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
          <View style={[styles.appHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <Text style={styles.appOrg} numberOfLines={1}>{orgName}</Text>
          </View>
        </SafeAreaView>
      ) : (
        <View style={styles.headerBlock}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <Text style={styles.appOrg} numberOfLines={1}>{orgName}</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Who's off today — personalised */}
        {onLeaveToday.length > 0 && (() => {
          const myLeave     = onLeaveToday.find(l => l.userId === user?.id);
          const othersLeave = onLeaveToday.filter(l => l.userId !== user?.id);
          const showOthers  = othersLeave.slice(0, 3);
          const hiddenCount = othersLeave.length - showOthers.length;

          const backDay = (endDate) => {
            const d = new Date(endDate + 'T00:00:00');
            d.setDate(d.getDate() + 1);
            return d.toLocaleDateString('en-GB', { weekday: 'long' });
          };

          return (
            <View style={styles.leaveToday}>
              {/* You are off today */}
              {myLeave && (
                <View style={styles.leaveTodayRow}>
                  <View style={[styles.leaveSelfDot, { backgroundColor: myLeave.color }]} />
                  <Text style={styles.leaveTodayName}>
                    <Text style={{ fontWeight: typography.bold, color: colors.black }}>You</Text>
                    {' '}are off today — back {backDay(myLeave.endDate)}
                  </Text>
                </View>
              )}

              {/* Others off today */}
              {showOthers.length > 0 && (
                <>
                  {!myLeave && (
                    <Text style={styles.leaveTodayTitle}>
                      {othersLeave.length === 1 ? '1 teammate is off today' : `${othersLeave.length} teammates are off today`}
                    </Text>
                  )}
                  {myLeave && othersLeave.length > 0 && (
                    <Text style={[styles.leaveTodayTitle, { marginTop: 4 }]}>
                      {othersLeave.length === 1 ? 'Also off today:' : `${othersLeave.length} others also off:`}
                    </Text>
                  )}
                  {showOthers.map(l => (
                    <View key={l.id} style={styles.leaveTodayRow}>
                      <Avatar initials={l.initials} size={16} color={l.color} />
                      <Text style={styles.leaveTodayName}>{l.name} — back {backDay(l.endDate)}</Text>
                    </View>
                  ))}
                  {hiddenCount > 0 && (
                    <Text style={styles.leaveTodayMore}>+ {hiddenCount} more — tap calendar to see all</Text>
                  )}
                </>
              )}
            </View>
          );
        })()}

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
            <Text style={styles.monthNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
            <Text style={styles.monthNavArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS_SHORT.map(d => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.cell} />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day     = i + 1;
            const dateStr = toDateStr(year, month, day);
            const items   = getEventsForDate(dateStr, events, leave);
            const isToday = dateStr === todayStr;
            const isSel   = dateStr === selectedDate;

            return (
              <TouchableOpacity
                key={day}
                style={[styles.cell, isSel && styles.cellSelected, isToday && !isSel && styles.cellToday]}
                onPress={() => setSelectedDate(dateStr)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.cellDay,
                  isToday && styles.cellDayToday,
                  isSel && styles.cellDaySelected,
                ]}>{day}</Text>
                {items.length > 0 && <EventDots items={items} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date header */}
        <View style={styles.selectedHeader}>
          <Text style={styles.selectedDateText}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <View style={styles.filterRow}>
            {['all', 'event', 'leave'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                  {f === 'all' ? 'All' : f === 'leave' ? 'Leave' : 'Events'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Events for selected date */}
        {selectedItems.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>Nothing on this day</Text>
            <TouchableOpacity onPress={() => setShowAdd(true)} activeOpacity={0.8}>
              <Text style={styles.emptyDayAdd}>+ Add event or leave</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventList}>
            {selectedItems.map(item => {
              const isLeave  = item.kind === 'leave';
              const typeInfo = getEventType(item.type);
              return (
                <TouchableOpacity
                  key={`${item.kind}-${item.id}`}
                  style={[styles.eventCard, { borderLeftColor: isLeave ? item.color : typeInfo.color }]}
                  onPress={() => setSelectedItem(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.eventCardTop}>
                    <View style={[styles.eventTypeBadge, { backgroundColor: isLeave ? '#ECFDF5' : typeInfo.bg }]}>
                      <Text style={[styles.eventTypeBadgeText, { color: isLeave ? '#065F46' : typeInfo.color }]}>
                        {isLeave ? 'Leave' : typeInfo.label}
                      </Text>
                    </View>
                    {item.startTime ? <Text style={styles.eventTime}>{formatTime(item.startTime)}</Text> : null}
                  </View>
                  <Text style={styles.eventTitle}>
                    {isLeave ? `${item.name} — ${item.title}` : item.title}
                  </Text>
                  {item.location ? <Text style={styles.eventMeta}>{item.location}</Text> : null}
                  {item.invitees?.length > 0 ? (
                    <View style={styles.eventInvitees}>
                      {item.invitees.slice(0, 4).map(inv => (
                        <Avatar key={inv.userId} initials={inv.initials} size={20} color={inv.color} />
                      ))}
                      {item.invitees.length > 4 && (
                        <Text style={styles.eventMoreText}>+{item.invitees.length - 4}</Text>
                      )}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Detail sheet */}
      <EventDetailSheet
        item={selectedItem}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        onRsvp={handleRsvp}
      />

      {/* Add modal */}
      <AddModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAdd}
        members={members}
        currentUser={user}
        selectedDate={selectedDate}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: colors.white },
  headerBlock:       { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader:         { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, gap: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appLogo:           { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent:     { color: colors.brand },
  appSep:            { fontSize: 14, color: colors.border },
  appOrg:            { flex: 1, fontSize: 13, fontWeight: typography.semibold, color: colors.muted },
  scroll:            { flex: 1 },
  scrollContent:     { paddingBottom: 40 },
  leaveToday:        { backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: colors.borderLight, padding: spacing.md, paddingHorizontal: spacing.page },
  leaveTodayTitle:   { fontSize: 12, fontWeight: typography.bold, color: '#374151', marginBottom: 4 },
  leaveTodayRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  leaveTodayName:    { fontSize: 12, color: colors.muted, flex: 1 },
  leaveTodayMore:    { fontSize: 12, color: colors.brand, marginTop: 4, fontWeight: typography.medium },
  leaveSelfDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  monthNav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md },
  monthNavBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthNavArrow:     { fontSize: 24, color: colors.brand, fontWeight: '300' },
  monthTitle:        { fontSize: 17, fontWeight: typography.bold, color: colors.black, letterSpacing: -0.3 },
  dayHeaders:        { flexDirection: 'row', paddingHorizontal: spacing.page, marginBottom: 4 },
  dayHeader:         { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: typography.semibold, color: colors.subtle, textTransform: 'uppercase' },
  grid:              { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.page, marginBottom: spacing.md },
  cell:              { width: '14.28%', aspectRatio: 0.85, alignItems: 'center', paddingTop: 6, borderRadius: 8 },
  cellSelected:      { backgroundColor: colors.brand },
  cellToday:         { backgroundColor: '#EFF6FF' },
  cellDay:           { fontSize: 13, fontWeight: typography.medium, color: colors.black },
  cellDayToday:      { color: colors.brand, fontWeight: typography.bold },
  cellDaySelected:   { color: colors.white, fontWeight: typography.bold },
  dotsRow:           { flexDirection: 'row', gap: 2, marginTop: 2, alignItems: 'center' },
  dot:               { width: 4, height: 4, borderRadius: 2 },
  dotMore:           { fontSize: 8, color: colors.subtle, lineHeight: 10, fontWeight: typography.bold },
  selectedHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  selectedDateText:  { fontSize: 13, fontWeight: typography.bold, color: colors.black, flex: 1 },
  filterRow:         { flexDirection: 'row', gap: 4 },
  filterPill:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterPillActive:  { backgroundColor: colors.black, borderColor: colors.black },
  filterPillText:    { fontSize: 11, color: colors.muted, fontWeight: typography.medium },
  filterPillTextActive: { color: colors.white, fontWeight: typography.semibold },
  emptyDay:          { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyDayText:      { fontSize: 14, color: colors.subtle, marginBottom: 8 },
  emptyDayAdd:       { fontSize: 13, color: colors.brand, fontWeight: typography.semibold },
  eventList:         { paddingHorizontal: spacing.page, gap: spacing.sm },
  eventCard:         { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, borderLeftWidth: 4, padding: spacing.md },
  eventCardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  eventTypeBadge:    { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  eventTypeBadgeText:{ fontSize: 10, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTime:         { fontSize: 12, color: colors.muted, fontWeight: typography.medium },
  eventTitle:        { fontSize: 14, fontWeight: typography.bold, color: colors.black, marginBottom: 4 },
  eventMeta:         { fontSize: 12, color: colors.subtle, marginBottom: 4 },
  eventInvitees:     { flexDirection: 'row', gap: 4, marginTop: 4, alignItems: 'center' },
  eventMoreText:     { fontSize: 11, color: colors.subtle, marginLeft: 2 },
  fab:               { position: 'absolute', bottom: 24, right: spacing.page, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  fabText:           { fontSize: 28, color: colors.white, lineHeight: 32, fontWeight: '300' },
  overlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetHandle:       { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  colorBar:          { height: 3, width: '100%' },
  detailSheet:       { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  detailBody:        { padding: spacing.page },
  detailHeader:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md },
  typeBadge:         { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 6 },
  typeBadgeText:     { fontSize: 11, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailTitle:       { fontSize: 18, fontWeight: typography.black, color: colors.black, letterSpacing: -0.3, lineHeight: 24 },
  closeBtn:          { fontSize: 16, color: colors.subtle, padding: 4 },
  detailRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  detailIcon:        { fontSize: 14, width: 20, textAlign: 'center' },
  detailIconText:    { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.4, width: 40 },
  detailText:        { fontSize: 14, color: '#374151' },
  detailMeta:        { fontSize: 13, color: colors.muted },
  sectionLabel:      { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inviteeList:       { gap: spacing.sm, marginBottom: spacing.md },
  inviteeRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteeName:       { flex: 1, fontSize: 14, color: colors.black, fontWeight: typography.medium },
  rsvpBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rsvpText:          { fontSize: 12, fontWeight: typography.semibold },
  rsvpRow:           { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  rsvpBtn:           { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  rsvpBtnText:       { fontSize: 14, fontWeight: typography.semibold },
  deleteBtn:         { marginTop: spacing.lg, paddingVertical: 12, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  deleteBtnText:     { fontSize: 14, fontWeight: typography.semibold, color: '#DC2626' },
  addSheet:          { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '95%' },
  addHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  addTitle:          { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  addBody:           { padding: spacing.page },
  modeRow:           { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, backgroundColor: '#F3F4F6', borderRadius: radius.lg, padding: 4 },
  modeBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md },
  modeBtnActive:     { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeBtnText:       { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  modeBtnTextActive: { color: colors.black, fontWeight: typography.semibold },
  fieldLabel:        { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: spacing.md },
  input:             { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black, backgroundColor: colors.white },
  dateRow:           { flexDirection: 'row', alignItems: 'flex-end' },
  typeRow:           { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  typeChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  typeDot:           { width: 7, height: 7, borderRadius: 4 },
  typeChipText:      { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  inviteeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inviteeChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  inviteeChipText:   { fontSize: 12, color: colors.muted },
  leaveTypeList:     { gap: spacing.sm },
  leaveTypeRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: '#F9FAFB' },
  leaveTypeRowActive:{ backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' },
  leaveTypeText:     { fontSize: 14, color: colors.muted },
  infoBanner:        { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  infoBannerText:    { fontSize: 13, color: colors.brand, lineHeight: 20 },
  saveBtn:           { paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText:       { fontSize: 15, fontWeight: typography.semibold, color: colors.white },
  avatar:            { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:        { fontWeight: typography.bold },
});