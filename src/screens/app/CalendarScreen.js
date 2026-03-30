// src/screens/app/CalendarScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet,  Modal, Pressable,
  KeyboardAvoidingView, Platform, StatusBar, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/tokens';

// ── DATA ──────────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { id: 1, name: 'Sarah M.',  initials: 'SM', color: '#1D4ED8' },
  { id: 2, name: 'James K.',  initials: 'JK', color: '#065F46' },
  { id: 3, name: 'David O.',  initials: 'DO', color: '#5B21B6' },
  { id: 4, name: 'Priya N.',  initials: 'PN', color: '#9D174D' },
  { id: 5, name: 'Tom R.',    initials: 'TR', color: '#92400E' },
  { id: 6, name: 'Ben A.',    initials: 'BA', color: '#0369A1' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_META = {
  leave:    { label: 'Leave',    color: '#065F46' },
  meeting:  { label: 'Meeting',  color: '#1D4ED8' },
  event:    { label: 'Event',    color: '#5B21B6' },
  deadline: { label: 'Deadline', color: '#DC2626' },
};

const TODAY = new Date(2026, 2, 16); // simulate today

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

const INITIAL_EVENTS = [
  { id: 1,  type: 'leave',    title: 'Annual Leave',        person: 'James K.',  startDate: '2026-03-13', endDate: '2026-03-17', color: '#065F46', note: 'Back Monday. Contact Sarah for anything urgent.', allDay: true },
  { id: 2,  type: 'leave',    title: 'Sick Leave',          person: 'Priya N.',  startDate: '2026-03-11', endDate: '2026-03-12', color: '#9D174D', note: 'Feeling under the weather. Back Wednesday.', allDay: true },
  { id: 3,  type: 'leave',    title: 'Annual Leave',        person: 'Sarah M.',  startDate: '2026-03-24', endDate: '2026-03-28', color: '#1D4ED8', note: 'On leave end of month. David covering admin.', allDay: true },
  { id: 4,  type: 'leave',    title: 'Family Leave',        person: 'Tom R.',    startDate: '2026-03-19', endDate: '2026-03-20', color: '#92400E', note: 'Back Thursday.', allDay: true },
  { id: 5,  type: 'meeting',  title: 'Q3 Strategy Meeting', person: null, startDate: '2026-03-12', endDate: '2026-03-12', color: '#1D4ED8', time: '10:00', endTime: '11:30', location: 'Board Room', zoomLink: '', invitees: ['Sarah M.','James K.','Priya N.'], note: 'Review Q3 targets.' },
  { id: 6,  type: 'meeting',  title: 'Weekly Standup',      person: null, startDate: '2026-03-17', endDate: '2026-03-17', color: '#374151', time: '09:00', endTime: '09:15', location: 'Zoom', zoomLink: 'https://zoom.us/j/standup', invitees: TEAM_MEMBERS.map(m => m.name), note: 'Blockers, priorities, updates.' },
  { id: 7,  type: 'meeting',  title: 'Weekly Standup',      person: null, startDate: '2026-03-24', endDate: '2026-03-24', color: '#374151', time: '09:00', endTime: '09:15', location: 'Zoom', zoomLink: 'https://zoom.us/j/standup', invitees: TEAM_MEMBERS.map(m => m.name), note: 'Blockers, priorities, updates.' },
  { id: 8,  type: 'event',    title: 'Client X Presentation', person: null, startDate: '2026-03-15', endDate: '2026-03-15', color: '#5B21B6', time: '14:00', endTime: '15:00', location: '', zoomLink: 'https://zoom.us/j/clientx', invitees: ['Priya N.','David O.','Ben A.'], note: 'Present final designs.' },
  { id: 9,  type: 'deadline', title: 'Q1 Report Due',       person: null, startDate: '2026-03-31', endDate: '2026-03-31', color: '#DC2626', time: '', endTime: '', location: '', zoomLink: '', invitees: ['Sarah M.','James K.'], note: 'Submit Q1 financial report.' },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 28, color }) {
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

function AvatarStack({ names, max = 4 }) {
  const shown  = names.slice(0, max);
  const hidden = names.length - max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((name, i) => {
        const m = TEAM_MEMBERS.find(t => t.name === name);
        return (
          <View key={name} style={[styles.stackAvatar, {
            backgroundColor: m?.color ? m.color + '20' : '#EFF6FF',
            marginLeft: i > 0 ? -5 : 0,
            zIndex: shown.length - i,
          }]}>
            <Text style={[styles.stackAvatarText, { color: m?.color || colors.brand }]}>
              {m?.initials || name[0]}
            </Text>
          </View>
        );
      })}
      {hidden > 0 && (
        <View style={[styles.stackAvatar, { backgroundColor: '#F3F4F6', marginLeft: -5 }]}>
          <Text style={[styles.stackAvatarText, { color: colors.subtle }]}>+{hidden}</Text>
        </View>
      )}
    </View>
  );
}

// ── EVENT DETAIL SHEET ────────────────────────────────────────────────────────

function EventDetailSheet({ event, onClose }) {
  const [rsvp, setRsvp] = useState(null);
  if (!event) return null;

  const meta   = TYPE_META[event.type];
  const member = TEAM_MEMBERS.find(m => m.name === event.person);
  const start  = new Date(event.startDate);
  const end    = new Date(event.endDate);
  const days   = Math.round((end - start) / 86400000) + 1;
  const back   = new Date(end); back.setDate(back.getDate() + 1);

  return (
    <Modal visible={!!event} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.detailSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          {/* Color bar */}
          <View style={[styles.colorBar, { backgroundColor: event.color }]} />

          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {/* Type badge */}
            <View style={[styles.typeBadge, { backgroundColor: event.color + '15' }]}>
              <Text style={[styles.typeBadgeText, { color: event.color }]}>
                {meta?.label?.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.detailTitle}>{event.title}</Text>

            {/* Person */}
            {member && (
              <View style={styles.detailPersonRow}>
                <Avatar initials={member.initials} size={26} color={member.color} />
                <Text style={styles.detailPerson}>{event.person}</Text>
              </View>
            )}

            {/* Info pills */}
            <View style={styles.infoPills}>
              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Date</Text>
                <Text style={styles.infoPillValue}>
                  {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {event.startDate !== event.endDate && ` → ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </Text>
              </View>

              {event.type === 'leave' && (
                <>
                  <View style={styles.infoPill}>
                    <Text style={styles.infoPillLabel}>Duration</Text>
                    <Text style={styles.infoPillValue}>{days} day{days !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Text style={styles.infoPillLabel}>Back</Text>
                    <Text style={styles.infoPillValue}>
                      {back.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </>
              )}

              {event.time && (
                <View style={styles.infoPill}>
                  <Text style={styles.infoPillLabel}>Time</Text>
                  <Text style={styles.infoPillValue}>
                    {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Location */}
            {event.location ? (
              <View style={styles.locationRow}>
                <View style={styles.locationDot} />
                <Text style={styles.locationText}>{event.location}</Text>
              </View>
            ) : null}

            {/* Zoom */}
            {event.zoomLink ? (
              <View style={[styles.locationRow, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <View style={[styles.locationDot, { backgroundColor: colors.brand }]} />
                <Text style={[styles.locationText, { color: colors.brand, fontWeight: typography.semibold }]}>
                  Zoom link available
                </Text>
              </View>
            ) : null}

            {/* Note */}
            {event.note ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>
                  {event.type === 'leave' ? 'NOTE' : 'AGENDA'}
                </Text>
                <Text style={styles.noteText}>{event.note}</Text>
              </View>
            ) : null}

            {/* RSVP */}
            {(event.type === 'meeting' || event.type === 'event') && (
              <View style={styles.rsvpSection}>
                <Text style={styles.rsvpLabel}>YOUR RSVP</Text>
                <View style={styles.rsvpRow}>
                  {[['Going','#065F46','#ECFDF5'],['Maybe','#92400E','#FFFBEB'],["Can't go",'#DC2626','#FEF2F2']].map(([label, color, bg]) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.rsvpBtn, { borderColor: rsvp === label ? color : colors.border, backgroundColor: rsvp === label ? bg : colors.white }]}
                      onPress={() => setRsvp(label)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.rsvpBtnText, { color: rsvp === label ? color : colors.muted }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Invitees */}
            {event.invitees?.length > 0 && (
              <View style={styles.inviteesSection}>
                <Text style={styles.rsvpLabel}>INVITED · {event.invitees.length}</Text>
                <View style={styles.inviteesList}>
                  {event.invitees.map(name => {
                    const m = TEAM_MEMBERS.find(t => t.name === name);
                    return m ? (
                      <View key={name} style={styles.inviteeChip}>
                        <Avatar initials={m.initials} size={20} color={m.color} />
                        <Text style={styles.inviteeChipText}>{name}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── ADD LEAVE MODAL ───────────────────────────────────────────────────────────

function AddLeaveModal({ visible, onClose, onSave }) {
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [note,      setNote]      = useState('');
  const [error,     setError]     = useState('');

  const LEAVE_TYPES = ['Annual Leave','Sick Leave','Family Leave','Study Leave','Other'];

  const duration = startDate && endDate && endDate >= startDate
    ? Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1
    : null;

  const handleSave = () => {
    if (!startDate || !endDate) { setError('Please enter both dates.'); return; }
    if (endDate < startDate)    { setError('End date must be after start date.'); return; }
    onSave({ id: Date.now(), type: 'leave', title: leaveType, person: 'Sarah M.', startDate, endDate, color: '#1D4ED8', note, allDay: true });
    onClose();
    setStartDate(''); setEndDate(''); setNote(''); setError('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={[styles.colorBar, { backgroundColor: '#065F46' }]} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add leave</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Leave type */}
              <Text style={styles.fieldLabel}>LEAVE TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }} contentContainerStyle={{ gap: 6 }}>
                {LEAVE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, leaveType === t && styles.typePillActive]}
                    onPress={() => setLeaveType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typePillText, leaveType === t && styles.typePillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Dates */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FROM</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholder}
                    value={startDate}
                    onChangeText={setStartDate}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>TO</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholder}
                    value={endDate}
                    onChangeText={setEndDate}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              {/* Duration preview */}
              {duration && (
                <View style={styles.durationRow}>
                  <View style={[styles.durationChip, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}>
                    <Text style={styles.durationNum}>{duration}</Text>
                    <Text style={styles.durationLabel}>days</Text>
                  </View>
                  <View style={[styles.durationChip, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.durationNum, { fontSize: 13, color: '#374151' }]}>
                      Back {new Date(new Date(endDate).getTime() + 86400000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Note */}
              <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Who to contact, handover notes..."
                placeholderTextColor={colors.placeholder}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#065F46' }]} onPress={handleSave} activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>Add to calendar</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── ADD EVENT MODAL ───────────────────────────────────────────────────────────

function AddEventModal({ visible, onClose, onSave }) {
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState('meeting');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('09:00');
  const [endTime,  setEndTime]  = useState('10:00');
  const [location, setLocation] = useState('');
  const [note,     setNote]     = useState('');
  const [invitees, setInvitees] = useState([]);
  const [color,    setColor]    = useState(colors.brand);

  const COLORS = ['#1D4ED8','#065F46','#5B21B6','#9D174D','#92400E','#DC2626'];

  const toggleInvitee = (name) =>
    setInvitees(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);

  const handleSave = () => {
    if (!title.trim() || !date) return;
    onSave({ id: Date.now(), type, title, person: null, startDate: date, endDate: date, color, time, endTime, location, zoomLink: '', note, invitees, allDay: false });
    onClose();
    setTitle(''); setType('meeting'); setDate(''); setTime('09:00'); setEndTime('10:00');
    setLocation(''); setNote(''); setInvitees([]); setColor(colors.brand);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
          <Pressable style={[styles.modalSheet, { maxHeight: '92%' }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={[styles.colorBar, { backgroundColor: color }]} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New event</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <TextInput
                style={styles.titleInput}
                placeholder="Event title"
                placeholderTextColor={colors.placeholder}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              {/* Type + color row */}
              <View style={styles.typeColorRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {['meeting','event','deadline'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typePill, type === t && styles.typePillActive]}
                      onPress={() => setType(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.colorRow}>
                  {COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 2.5 : 0, borderColor: '#111827' }]}
                      onPress={() => setColor(c)}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>
              </View>

              {/* Date + time */}
              <View style={styles.dateRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>DATE</Text>
                  <TextInput style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.placeholder} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>START</Text>
                  <TextInput style={styles.dateInput} placeholder="09:00" placeholderTextColor={colors.placeholder} value={time} onChangeText={setTime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>END</Text>
                  <TextInput style={styles.dateInput} placeholder="10:00" placeholderTextColor={colors.placeholder} value={endTime} onChangeText={setEndTime} />
                </View>
              </View>

              {/* Location */}
              <Text style={styles.fieldLabel}>LOCATION</Text>
              <TextInput style={styles.fieldInput} placeholder="e.g. Board Room or Zoom" placeholderTextColor={colors.placeholder} value={location} onChangeText={setLocation} />

              {/* Agenda */}
              <Text style={styles.fieldLabel}>AGENDA</Text>
              <TextInput style={styles.textarea} placeholder="What's on the agenda..." placeholderTextColor={colors.placeholder} value={note} onChangeText={setNote} multiline numberOfLines={3} textAlignVertical="top" />

              {/* Invite team */}
              <Text style={styles.fieldLabel}>INVITE TEAM</Text>
              <View style={styles.inviteTeamList}>
                {TEAM_MEMBERS.map(m => {
                  const selected = invitees.includes(m.name);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.inviteTeamRow, selected && { borderColor: m.color + '40', backgroundColor: m.color + '08' }]}
                      onPress={() => toggleInvitee(m.name)}
                      activeOpacity={0.8}
                    >
                      <Avatar initials={m.initials} size={28} color={m.color} />
                      <Text style={styles.inviteTeamName}>{m.name}</Text>
                      <View style={[styles.inviteCheck, selected && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                        {selected && <Text style={{ color: colors.white, fontSize: 10, fontWeight: typography.bold }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: title.trim() ? color : colors.border }]}
                  onPress={handleSave}
                  disabled={!title.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>Create event</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── AGENDA VIEW ───────────────────────────────────────────────────────────────

function AgendaView({ events, year, month, daysInMonth, onEventPress }) {
  const todayStr = toDateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  // Build list of days that have events
  const activeDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d        = toDateStr(year, month, day);
    const leave    = events.filter(e => e.type === 'leave' && d >= e.startDate && d <= e.endDate);
    const dayEvts  = events.filter(e => e.type !== 'leave' && e.startDate === d);
    if (leave.length > 0 || dayEvts.length > 0) {
      activeDays.push({ day, dateStr: d, leave, events: dayEvts });
    }
  }

  if (activeDays.length === 0) {
    return (
      <View style={styles.agendaEmpty}>
        <View style={styles.agendaEmptyIcon}>
          <Text style={styles.agendaEmptyIconText}>▦</Text>
        </View>
        <Text style={styles.agendaEmptyTitle}>Nothing scheduled</Text>
        <Text style={styles.agendaEmptyText}>{'No events or leave this month.\nTap + to add something.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.agendaList}>
      {activeDays.map((item, idx) => {
        const date    = new Date(year, month, item.day);
        const isToday = item.dateStr === todayStr;
        const isLast  = idx === activeDays.length - 1;
        return (
          <View key={item.day} style={[styles.agendaDayRow, !isLast && styles.agendaDayRowBorder]}>
            {/* Date column */}
            <View style={styles.agendaDateCol}>
              <Text style={styles.agendaWeekday}>
                {date.toLocaleDateString('en-GB', { weekday: 'short' })}
              </Text>
              <View style={[styles.agendaDayNum, isToday && styles.agendaDayNumToday]}>
                <Text style={[styles.agendaDayNumText, isToday && styles.agendaDayNumTextToday]}>
                  {item.day}
                </Text>
              </View>
            </View>

            {/* Events column */}
            <View style={styles.agendaEventsCol}>
              {item.leave.map(lv => {
                const m = TEAM_MEMBERS.find(t => t.name === lv.person);
                const c = m?.color || lv.color;
                return (
                  <TouchableOpacity
                    key={lv.id}
                    style={[styles.agendaEventRow, { borderLeftColor: c, backgroundColor: c + '10' }]}
                    onPress={() => onEventPress(lv)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.agendaEventTitle, { color: '#111827' }]}>
                      {lv.person?.split(' ')[0]} — {lv.title}
                    </Text>
                    {item.dateStr === lv.startDate && (
                      <Text style={styles.agendaEventSub}>Leave starts today</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {item.events.map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.agendaEventRow, { borderLeftColor: ev.color, backgroundColor: ev.color + '10' }]}
                  onPress={() => onEventPress(ev)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.agendaEventTitle, { color: '#111827' }]} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  {ev.time && (
                    <Text style={styles.agendaEventSub}>
                      {ev.time}{ev.endTime ? ` – ${ev.endTime}` : ''} · {TYPE_META[ev.type]?.label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── MONTH SUMMARY (collapsible sections) ─────────────────────────────────────

function SummarySection({ label, count, color, children }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.summarySection}>
      <TouchableOpacity style={styles.summarySectionHeader} onPress={() => setOpen(p => !p)} activeOpacity={0.8}>
        <View style={[styles.summarySectionDot, { backgroundColor: color }]} />
        <Text style={styles.summarySectionLabel}>{label}</Text>
        <View style={[styles.summarySectionCount, { backgroundColor: color }]}>
          <Text style={styles.summarySectionCountText}>{count}</Text>
        </View>
        <Text style={[styles.summarySectionChevron, open && { transform: [{ rotate: '180deg' }] }]}>›</Text>
      </TouchableOpacity>
      {open && <View style={styles.summarySectionBody}>{children}</View>}
    </View>
  );
}

function LeaveRow({ ev, onPress }) {
  const m     = TEAM_MEMBERS.find(t => t.name === ev.person);
  const c     = m?.color || ev.color;
  const start = new Date(ev.startDate);
  const end   = new Date(ev.endDate);
  const days  = Math.round((end - start) / 86400000) + 1;
  const back  = new Date(end); back.setDate(back.getDate() + 1);
  return (
    <TouchableOpacity style={styles.summaryRow} onPress={() => onPress(ev)} activeOpacity={0.8}>
      <View style={[styles.summaryRowBar, { backgroundColor: c }]} />
      <Avatar initials={m?.initials || '?'} size={34} color={c} />
      <View style={styles.summaryRowInfo}>
        <View style={styles.summaryRowTop}>
          <Text style={styles.summaryRowName}>{ev.person}</Text>
          <View style={[styles.summaryRowBadge, { backgroundColor: c + '15' }]}>
            <Text style={[styles.summaryRowBadgeText, { color: c }]}>{ev.title}</Text>
          </View>
        </View>
        <Text style={styles.summaryRowSub}>
          {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · Back {back.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <View style={styles.summaryRowDays}>
        <Text style={[styles.summaryRowDaysNum, { color: c }]}>{days}</Text>
        <Text style={styles.summaryRowDaysLabel}>days</Text>
      </View>
    </TouchableOpacity>
  );
}

function EventRow({ ev, onPress }) {
  const date  = new Date(ev.startDate);
  const c     = ev.color || TYPE_META[ev.type]?.color || '#374151';
  return (
    <TouchableOpacity style={styles.summaryRow} onPress={() => onPress(ev)} activeOpacity={0.8}>
      <View style={[styles.summaryRowBar, { backgroundColor: c }]} />
      <View style={styles.summaryRowDate}>
        <Text style={[styles.summaryRowDateNum, { color: c }]}>{date.getDate()}</Text>
        <Text style={styles.summaryRowDateMonth}>
          {date.toLocaleDateString('en-GB', { month: 'short' })}
        </Text>
      </View>
      <View style={styles.summaryRowInfo}>
        <View style={styles.summaryRowTop}>
          <Text style={styles.summaryRowName} numberOfLines={1}>{ev.title}</Text>
          <View style={[styles.summaryRowBadge, { backgroundColor: c + '15' }]}>
            <Text style={[styles.summaryRowBadgeText, { color: c }]}>{TYPE_META[ev.type]?.label}</Text>
          </View>
        </View>
        {ev.time && (
          <Text style={styles.summaryRowSub}>
            {ev.time}{ev.endTime ? ` – ${ev.endTime}` : ''}
            {ev.location ? ` · ${ev.location}` : ev.zoomLink ? ' · Zoom' : ''}
          </Text>
        )}
        {ev.invitees?.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <AvatarStack names={ev.invitees} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MonthSummary({ events, year, month, daysInMonth, onEventPress }) {
  const monthStart = toDateStr(year, month, 1);
  const monthEnd   = toDateStr(year, month, daysInMonth);

  const leaveEvts   = events.filter(e => e.type === 'leave'    && e.startDate <= monthEnd && e.endDate >= monthStart);
  const meetingEvts = events.filter(e => e.type === 'meeting'  && e.startDate >= monthStart && e.startDate <= monthEnd);
  const otherEvts   = events.filter(e => e.type === 'event'    && e.startDate >= monthStart && e.startDate <= monthEnd);
  const deadlines   = events.filter(e => e.type === 'deadline' && e.startDate >= monthStart && e.startDate <= monthEnd);

  if (!leaveEvts.length && !meetingEvts.length && !otherEvts.length && !deadlines.length) return null;

  return (
    <View style={styles.monthlySummary}>
      {leaveEvts.length > 0 && (
        <SummarySection label="On leave" count={leaveEvts.length} color="#065F46">
          {leaveEvts.map(ev => <LeaveRow key={ev.id} ev={ev} onPress={onEventPress} />)}
        </SummarySection>
      )}
      {meetingEvts.length > 0 && (
        <SummarySection label="Meetings" count={meetingEvts.length} color="#1D4ED8">
          {meetingEvts.sort((a,b) => a.startDate.localeCompare(b.startDate)).map(ev => <EventRow key={ev.id} ev={ev} onPress={onEventPress} />)}
        </SummarySection>
      )}
      {otherEvts.length > 0 && (
        <SummarySection label="Events" count={otherEvts.length} color="#5B21B6">
          {otherEvts.map(ev => <EventRow key={ev.id} ev={ev} onPress={onEventPress} />)}
        </SummarySection>
      )}
      {deadlines.length > 0 && (
        <SummarySection label="Deadlines" count={deadlines.length} color="#DC2626">
          {deadlines.map(ev => <EventRow key={ev.id} ev={ev} onPress={onEventPress} />)}
        </SummarySection>
      )}
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const [viewDate,      setViewDate]      = useState(TODAY);
  const [events,        setEvents]        = useState(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddLeave,  setShowAddLeave]  = useState(false);
  const [showAddEvent,  setShowAddEvent]  = useState(false);

  const year        = viewDate.getFullYear();
  const month       = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday   = () => setViewDate(TODAY);

  const handleSaveLeave = (ev) => setEvents(p => [...p, ev]);
  const handleSaveEvent = (ev) => setEvents(p => [...p, ev]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />

      {Platform.OS === 'ios' ? (
        <SafeAreaView style={{ backgroundColor: colors.white }}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <Text style={styles.appOrg}>Acme Corp</Text>
          </View>
        </SafeAreaView>
      ) : (
        <View style={[styles.headerBlock]}>
          <View style={styles.appHeader}>
            <Text style={styles.appLogo}>notifi<Text style={styles.appLogoAccent}>qe</Text></Text>
            <Text style={styles.appSep}>/</Text>
            <Text style={styles.appOrg}>Acme Corp</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <View style={styles.monthNavBtns}>
            <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.8}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={goToday} activeOpacity={0.8}>
              <Text style={[styles.navBtnText, { fontSize: 12, paddingHorizontal: 4 }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.8}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.leaveBtn} onPress={() => setShowAddLeave(true)} activeOpacity={0.85}>
            <Text style={styles.leaveBtnText}>Add leave</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.eventBtn} onPress={() => setShowAddEvent(true)} activeOpacity={0.85}>
            <Text style={styles.eventBtnText}>+ New event</Text>
          </TouchableOpacity>
        </View>

        {/* Agenda */}
        <View style={styles.agendaCard}>
          <AgendaView
            events={events}
            year={year}
            month={month}
            daysInMonth={daysInMonth}
            onEventPress={setSelectedEvent}
          />
        </View>

        {/* Month summary */}
        <MonthSummary
          events={events}
          year={year}
          month={month}
          daysInMonth={daysInMonth}
          onEventPress={setSelectedEvent}
        />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Event detail */}
      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* Modals */}
      <AddLeaveModal visible={showAddLeave} onClose={() => setShowAddLeave(false)} onSave={handleSaveLeave} />
      <AddEventModal visible={showAddEvent} onClose={() => setShowAddEvent(false)} onSave={handleSaveEvent} />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerBlock: { backgroundColor: colors.white, paddingTop: StatusBar.currentHeight, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appHeader: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, gap: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  appLogo: { fontSize: 17, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  appLogoAccent: { color: colors.brand },
  appSep: { fontSize: 14, color: colors.border },
  appOrg: { flex: 1, fontSize: 13, fontWeight: typography.semibold, color: colors.muted },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.page, paddingTop: spacing.md },

  // Month nav
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthTitle: { fontSize: 18, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black },
  monthNavBtns: { flexDirection: 'row', gap: 6 },
  navBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 16, color: colors.muted, fontWeight: typography.medium },

  // Actions
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  leaveBtn: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, flex: 1, alignItems: 'center' },
  leaveBtnText: { fontSize: 13, fontWeight: typography.semibold, color: '#065F46' },
  eventBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, flex: 1, alignItems: 'center' },
  eventBtnText: { fontSize: 13, fontWeight: typography.semibold, color: colors.white },

  // Agenda card
  agendaCard: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.md },
  agendaEmpty: { paddingVertical: 48, alignItems: 'center', gap: spacing.sm },
  agendaEmptyIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  agendaEmptyIconText: { fontSize: 22, color: colors.brand },
  agendaEmptyTitle: { fontSize: 15, fontWeight: typography.bold, color: colors.black },
  agendaEmptyText: { fontSize: 13, color: colors.subtle, textAlign: 'center', lineHeight: 20 },
  agendaList: { gap: 0 },
  agendaDayRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  agendaDayRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  agendaDateCol: { width: 44, alignItems: 'center' },
  agendaWeekday: { fontSize: 10, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  agendaDayNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  agendaDayNumToday: { backgroundColor: colors.brand },
  agendaDayNumText: { fontSize: 16, fontWeight: typography.black, color: colors.black },
  agendaDayNumTextToday: { color: colors.white },
  agendaEventsCol: { flex: 1, gap: 6, paddingTop: 4 },
  agendaEventRow: { borderLeftWidth: 3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minHeight: 44 },
  agendaEventTitle: { fontSize: 13, fontWeight: typography.bold, lineHeight: 18 },
  agendaEventSub: { fontSize: 11, color: colors.subtle, marginTop: 2 },

  // Month summary
  monthlySummary: { gap: spacing.sm, marginBottom: spacing.md },
  summarySection: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.xl, overflow: 'hidden' },
  summarySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14, minHeight: 52 },
  summarySectionDot: { width: 8, height: 8, borderRadius: 4 },
  summarySectionLabel: { flex: 1, fontSize: 14, fontWeight: typography.semibold, color: '#374151' },
  summarySectionCount: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  summarySectionCountText: { fontSize: 12, fontWeight: typography.bold, color: colors.white },
  summarySectionChevron: { fontSize: 18, color: colors.placeholder, fontWeight: typography.bold },
  summarySectionBody: { borderTopWidth: 1, borderTopColor: colors.borderLight, padding: spacing.sm, gap: spacing.sm },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, minHeight: 60 },
  summaryRowBar: { width: 3, height: 36, borderRadius: 2, flexShrink: 0 },
  summaryRowDate: { width: 36, alignItems: 'center', flexShrink: 0 },
  summaryRowDateNum: { fontSize: 18, fontWeight: typography.black, letterSpacing: -0.5, lineHeight: 20 },
  summaryRowDateMonth: { fontSize: 10, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase' },
  summaryRowInfo: { flex: 1, minWidth: 0 },
  summaryRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  summaryRowName: { fontSize: 14, fontWeight: typography.bold, color: colors.black },
  summaryRowBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  summaryRowBadgeText: { fontSize: 10, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryRowSub: { fontSize: 12, color: colors.subtle, lineHeight: 16 },
  summaryRowDays: { alignItems: 'center', flexShrink: 0 },
  summaryRowDaysNum: { fontSize: 18, fontWeight: typography.black, letterSpacing: -0.5, lineHeight: 20 },
  summaryRowDaysLabel: { fontSize: 10, fontWeight: typography.semibold, color: colors.subtle, textTransform: 'uppercase' },

  // Avatar
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: typography.bold },
  stackAvatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stackAvatarText: { fontSize: 9, fontWeight: typography.black },

  // Detail sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  detailScroll: { padding: spacing.page },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  colorBar: { height: 4, width: '100%' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: spacing.sm },
  typeBadgeText: { fontSize: 11, fontWeight: typography.black, letterSpacing: 0.6 },
  detailTitle: { fontSize: 20, fontWeight: typography.black, letterSpacing: -0.5, color: colors.black, marginBottom: spacing.sm, lineHeight: 26 },
  detailPersonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  detailPerson: { fontSize: 14, fontWeight: typography.semibold, color: '#374151' },
  infoPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  infoPill: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flex: 1, minWidth: 80 },
  infoPillLabel: { fontSize: 10, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  infoPillValue: { fontSize: 13, fontWeight: typography.bold, color: colors.black },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm },
  locationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.subtle },
  locationText: { fontSize: 13, fontWeight: typography.medium, color: '#374151' },
  noteBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  noteLabel: { fontSize: 10, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 21 },
  rsvpSection: { marginBottom: spacing.md },
  rsvpLabel: { fontSize: 10, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  rsvpRow: { flexDirection: 'row', gap: spacing.sm },
  rsvpBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  rsvpBtnText: { fontSize: 13, fontWeight: typography.semibold },
  inviteesSection: { marginBottom: spacing.md },
  inviteesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inviteeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4 },
  inviteeChipText: { fontSize: 12, fontWeight: typography.medium, color: '#374151' },

  // Modals
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle: { fontSize: 16, fontWeight: typography.bold, color: colors.black },
  modalClose: { fontSize: 16, color: colors.subtle, padding: 4 },
  modalBody: { padding: spacing.page },
  fieldLabel: { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black, backgroundColor: colors.white, marginBottom: spacing.md },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dateInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 13, color: colors.black, backgroundColor: colors.white },
  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.black, minHeight: 80, marginBottom: spacing.md, lineHeight: 20 },
  typePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  typePillActive: { backgroundColor: '#EFF6FF', borderColor: colors.brand },
  typePillText: { fontSize: 13, color: colors.muted, fontWeight: typography.medium },
  typePillTextActive: { color: colors.brand, fontWeight: typography.semibold },
  durationRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  durationChip: { flex: 1, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center' },
  durationNum: { fontSize: 22, fontWeight: typography.black, color: '#065F46', lineHeight: 26 },
  durationLabel: { fontSize: 11, color: '#065F46', fontWeight: typography.semibold, textTransform: 'uppercase' },
  errorText: { fontSize: 13, color: '#DC2626', marginBottom: spacing.sm },
  modalFooter: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: typography.semibold, color: colors.muted },
  saveBtn: { flex: 2, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: typography.semibold, color: colors.white },
  titleInput: { fontSize: 18, fontWeight: typography.bold, color: colors.black, borderBottomWidth: 2, borderBottomColor: colors.borderLight, paddingVertical: 8, marginBottom: spacing.md },
  typeColorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.sm },
  colorRow: { flexDirection: 'row', gap: 6 },
  colorDot: { width: 22, height: 22, borderRadius: 11 },
  inviteTeamList: { gap: spacing.sm, marginBottom: spacing.md },
  inviteTeamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, minHeight: 48 },
  inviteTeamName: { flex: 1, fontSize: 14, fontWeight: typography.medium, color: colors.black },
  inviteCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});