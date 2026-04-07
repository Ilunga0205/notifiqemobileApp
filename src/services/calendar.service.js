// src/services/calendar.service.js
import { supabase } from '../lib/supabase';

// ── Event type config ─────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  { id: 'meeting',  label: 'Meeting',  color: '#1D4ED8', bg: '#EFF6FF' },
  { id: 'event',    label: 'Event',    color: '#5B21B6', bg: '#F5F3FF' },
  { id: 'deadline', label: 'Deadline', color: '#DC2626', bg: '#FEF2F2' },
];

export const LEAVE_TYPES = [
  'Annual leave',
  'Sick leave',
  'Family leave',
  'Public holiday',
  'Other',
];

export const getEventType = (id) =>
  EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[0];

// ── Fetch all calendar data for a month ───────────────────────────────────────

export const getCalendarData = async (orgId, year, month) => {
  // First and last day of month with buffer
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`;
  const lastDay  = new Date(year, month, 0).toISOString().split('T')[0];

  const [eventsRes, leaveRes] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(`
        id, title, type, start_date, end_date,
        start_time, end_time, location, zoom_link, note, created_at,
        creator:profiles!calendar_events_creator_id_fkey(id, full_name, avatar_color, avatar_initials),
        event_invitees(
          id, user_id, rsvp,
          profiles(id, full_name, avatar_color, avatar_initials)
        )
      `)
      .eq('org_id', orgId)
      .lte('start_date', lastDay)
      .gte('end_date', firstDay)
      .order('start_date', { ascending: true }),

    supabase
      .from('leave_events')
      .select(`
        id, user_id, start_date, end_date, leave_type, created_at,
        profiles(id, full_name, avatar_color, avatar_initials)
      `)
      .eq('org_id', orgId)
      .lte('start_date', lastDay)
      .gte('end_date', firstDay)
      .order('start_date', { ascending: true }),
  ]);

  return {
    events: (eventsRes.data || []).map(formatEvent),
    leave:  (leaveRes.data  || []).map(formatLeave),
  };
};

// ── Fetch upcoming events (for dashboard / feed banner) ───────────────────────

export const getUpcomingEvents = async (orgId, limit = 5) => {
  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      id, title, type, start_date, start_time, location,
      event_invitees(user_id)
    `)
    .eq('org_id', orgId)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(formatEvent);
};

// ── Create calendar event ─────────────────────────────────────────────────────

export const createCalendarEvent = async ({
  orgId, creatorId, title, type,
  startDate, endDate, startTime, endTime,
  location, zoomLink, note, inviteeIds = [],
}) => {
  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      org_id:     orgId,
      creator_id: creatorId,
      title:      title.trim(),
      type,
      start_date: startDate,
      end_date:   endDate || startDate,
      start_time: startTime || null,
      end_time:   endTime   || null,
      location:   location  || null,
      zoom_link:  zoomLink  || null,
      note:       note      || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Add invitees
  if (inviteeIds.length > 0) {
    await supabase.from('event_invitees').insert(
      inviteeIds.map(userId => ({
        event_id: event.id,
        user_id:  userId,
        rsvp:     'pending',
      }))
    );
  }

  return event;
};

// ── Update calendar event ─────────────────────────────────────────────────────

export const updateCalendarEvent = async (eventId, updates, inviteeIds) => {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      title:      updates.title?.trim(),
      type:       updates.type,
      start_date: updates.startDate,
      end_date:   updates.endDate || updates.startDate,
      start_time: updates.startTime || null,
      end_time:   updates.endTime   || null,
      location:   updates.location  || null,
      zoom_link:  updates.zoomLink  || null,
      note:       updates.note      || null,
    })
    .eq('id', eventId);

  if (error) throw error;

  // Replace invitees if provided
  if (inviteeIds !== undefined) {
    await supabase.from('event_invitees').delete().eq('event_id', eventId);
    if (inviteeIds.length > 0) {
      await supabase.from('event_invitees').insert(
        inviteeIds.map(userId => ({
          event_id: eventId,
          user_id:  userId,
          rsvp:     'pending',
        }))
      );
    }
  }
};

// ── Delete calendar event ─────────────────────────────────────────────────────

export const deleteCalendarEvent = async (eventId) => {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
};

// ── Create leave event ────────────────────────────────────────────────────────

export const createLeaveEvent = async ({
  orgId, userId, startDate, endDate, leaveType,
}) => {
  const { data, error } = await supabase
    .from('leave_events')
    .insert({
      org_id:     orgId,
      user_id:    userId,
      start_date: startDate,
      end_date:   endDate || startDate,
      leave_type: leaveType || 'Annual leave',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Delete leave event ────────────────────────────────────────────────────────

export const deleteLeaveEvent = async (leaveId) => {
  const { error } = await supabase
    .from('leave_events')
    .delete()
    .eq('id', leaveId);
  if (error) throw error;
};

// ── RSVP ──────────────────────────────────────────────────────────────────────

export const rsvpEvent = async (eventId, userId, rsvp) => {
  const { error } = await supabase
    .from('event_invitees')
    .update({ rsvp })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
};

// ── Format helpers ────────────────────────────────────────────────────────────

const formatEvent = (raw) => {
  const typeInfo = getEventType(raw.type);
  return {
    id:         raw.id,
    type:       raw.type,
    kind:       'event',
    title:      raw.title,
    color:      typeInfo.color,
    bg:         typeInfo.bg,
    startDate:  raw.start_date,
    endDate:    raw.end_date || raw.start_date,
    startTime:  raw.start_time || null,
    endTime:    raw.end_time   || null,
    location:   raw.location   || '',
    zoomLink:   raw.zoom_link  || '',
    note:       raw.note       || '',
    createdAt:  raw.created_at,
    creatorId:  raw.creator?.id,
    creator:    raw.creator?.full_name || 'Unknown',
    creatorInitials: raw.creator?.avatar_initials ||
      (raw.creator?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
    creatorColor: raw.creator?.avatar_color || '#1D4ED8',
    invitees:   (raw.event_invitees || []).map(i => ({
      id:       i.id,
      userId:   i.user_id,
      rsvp:     i.rsvp,
      name:     i.profiles?.full_name || '',
      initials: i.profiles?.avatar_initials ||
        (i.profiles?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
      color:    i.profiles?.avatar_color || '#6B7280',
    })),
  };
};

const formatLeave = (raw) => ({
  id:        raw.id,
  kind:      'leave',
  type:      'leave',
  color:     raw.profiles?.avatar_color || '#065F46',
  bg:        '#ECFDF5',
  title:     raw.leave_type || 'Leave',
  userId:    raw.user_id,
  name:      raw.profiles?.full_name || '',
  initials:  raw.profiles?.avatar_initials ||
    (raw.profiles?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
  startDate: raw.start_date,
  endDate:   raw.end_date || raw.start_date,
  createdAt: raw.created_at,
});