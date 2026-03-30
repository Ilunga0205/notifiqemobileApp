// src/services/calendar.service.js
//
// All calendar-related DB operations.
// Events, leave notices, RSVPs.

import { supabase } from '../lib/supabase';

// ── Fetch events for a month ──────────────────────────────────────────────────

export const getEvents = async (orgId, year, month) => {
  const start = new Date(year, month - 1, 1).toISOString();
  const end   = new Date(year, month,     0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      id, title, type, start_date, end_date, all_day, description,
      created_by,
      organiser:profiles!calendar_events_created_by_fkey(id, full_name, avatar_color, avatar_initials),
      rsvps:event_rsvps(user_id, status)
    `)
    .eq('org_id', orgId)
    .gte('start_date', start)
    .lte('start_date', end)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

// ── Fetch leave notices ───────────────────────────────────────────────────────

export const getLeaveNotices = async (orgId, year, month) => {
  const start = new Date(year, month - 1, 1).toISOString();
  const end   = new Date(year, month,     0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from('leave_notices')
    .select(`
      id, start_date, end_date, note,
      member:profiles!leave_notices_user_id_fkey(id, full_name, avatar_color, avatar_initials)
    `)
    .eq('org_id', orgId)
    .gte('start_date', start)
    .lte('end_date', end)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

// ── Create event ──────────────────────────────────────────────────────────────

export const createEvent = async ({
  orgId,
  createdBy,
  title,
  type,
  startDate,
  endDate,
  allDay = true,
  description,
  inviteUserIds = [],
}) => {
  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      org_id:      orgId,
      created_by:  createdBy,
      title,
      type,
      start_date:  startDate,
      end_date:    endDate || startDate,
      all_day:     allDay,
      description,
    })
    .select()
    .single();
  if (error) throw error;

  // Add invited members as 'pending' RSVPs
  if (inviteUserIds.length > 0) {
    await supabase.from('event_rsvps').insert(
      inviteUserIds.map(userId => ({
        event_id: event.id,
        user_id:  userId,
        status:   'pending',
      }))
    );
  }

  return event;
};

// ── Create leave notice ───────────────────────────────────────────────────────

export const createLeaveNotice = async ({
  orgId,
  userId,
  startDate,
  endDate,
  note,
}) => {
  const { data, error } = await supabase
    .from('leave_notices')
    .insert({
      org_id:     orgId,
      user_id:    userId,
      start_date: startDate,
      end_date:   endDate,
      note,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── RSVP to event ─────────────────────────────────────────────────────────────

export const rsvpEvent = async (eventId, userId, status) => {
  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: 'event_id,user_id' }
    );
  if (error) throw error;
};

// ── Delete event ──────────────────────────────────────────────────────────────

export const deleteEvent = async (eventId) => {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
};

// ── Delete leave notice ───────────────────────────────────────────────────────

export const deleteLeaveNotice = async (noticeId) => {
  const { error } = await supabase
    .from('leave_notices')
    .delete()
    .eq('id', noticeId);
  if (error) throw error;
};