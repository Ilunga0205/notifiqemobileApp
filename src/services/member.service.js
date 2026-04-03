// src/services/member.service.js
//
// All member and department DB operations.

import { supabase } from '../lib/supabase';

// ── Fetch members ─────────────────────────────────────────────────────────────

export const getMembers = async (orgId) => {
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('id, role, status, joined_at, user_id')
    .eq('org_id', orgId)
    .in('status', ['active', 'invited']);

  if (error) throw error;
  if (!memberships?.length) return [];

  const userIds = memberships.map(m => m.user_id);

  const [{ data: profiles }, { data: deptMembers }] = await Promise.all([
    supabase.from('profiles')
      .select('id, full_name, email, avatar_color, avatar_initials')
      .in('id', userIds),
    supabase.from('department_members')
      .select('user_id, departments!inner(id, name, org_id)')
      .in('user_id', userIds)
      .eq('departments.org_id', orgId),
  ]);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  const deptMap = {};
  (deptMembers || []).forEach(dm => {
    if (!deptMap[dm.user_id]) deptMap[dm.user_id] = [];
    if (dm.departments) deptMap[dm.user_id].push(dm.departments);
  });

  return memberships.map(m => {
    const profile  = profileMap[m.user_id] || {};
    const fullName = profile.full_name || profile.email?.split('@')[0] || 'Unknown';
    const initials = profile.avatar_initials ||
      fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const depts = deptMap[m.user_id] || [];

    return {
      membership_id:  m.id,
      user_id:        m.user_id,
      org_id:         orgId,
      full_name:      fullName,
      initials,
      avatar_color:   profile.avatar_color || '#1D4ED8',
      email:          profile.email || '',
      status:         m.status,
      role:           m.role,
      joined_at:      m.joined_at,
      departments:    depts,
      department_ids: depts.map(d => d.id),
    };
  });
};

// ── Fetch pending join requests ───────────────────────────────────────────────

export const getPendingRequests = async (orgId) => {
  const { data, error } = await supabase
    .from('join_requests')
    .select('id, full_name, email, created_at')
    .eq('org_id', orgId)
    .eq('status', 'pending');

  if (error) throw error;

  return (data || []).map(r => ({
    membership_id: r.id,
    full_name:     r.full_name || r.email,
    email:         r.email,
    initials:      (r.full_name || r.email || '?')
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
  }));
};

// ── Fetch departments ─────────────────────────────────────────────────────────

export const getDepartments = async (orgId) => {
  const { data, error } = await supabase
    .from('departments')
    .select(`
      id, name, slug,
      department_members(
        user_id,
        profiles(id, full_name, avatar_color, avatar_initials)
      )
    `)
    .eq('org_id', orgId)
    .order('name');
  if (error) throw error;
  return data || [];
};

// ── Update member role + departments ─────────────────────────────────────────

export const updateMember = async (member, role, departmentIds, orgDeptIds) => {
  // Update role
  await supabase
    .from('memberships')
    .update({ role })
    .eq('id', member.membership_id);

  // ✅ Only delete dept memberships within THIS org — not other orgs
  if (orgDeptIds && orgDeptIds.length > 0) {
    await supabase
      .from('department_members')
      .delete()
      .eq('user_id', member.user_id)
      .in('department_id', orgDeptIds);
  }

  // Re-insert selected departments
  if (departmentIds.length > 0) {
    await supabase.from('department_members').insert(
      departmentIds.map(dId => ({ department_id: dId, user_id: member.user_id }))
    );
  }
};

// ── Remove member (via Edge Function) ────────────────────────────────────────

export const removeMember = async (userId, orgId, isSelf = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.functions.invoke('remove-member', {
    body:    { userId, orgId, isSelf },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
};

// ── Approve join request (via Edge Function) ──────────────────────────────────

export const approveRequest = async (requestId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.functions.invoke('approve-member', {
    body:    { requestId },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
};

// ── Decline join request ──────────────────────────────────────────────────────

export const declineRequest = async (requestId) => {
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
};

// ── Add department ────────────────────────────────────────────────────────────

export const addDepartment = async (orgId, name) => {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, slug, org_id: orgId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Rename department ─────────────────────────────────────────────────────────

export const renameDepartment = async (deptId, name) => {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { error } = await supabase
    .from('departments')
    .update({ name, slug })
    .eq('id', deptId);
  if (error) throw error;
};

// ── Delete department ─────────────────────────────────────────────────────────

export const deleteDepartment = async (deptId) => {
  await supabase.from('department_members').delete().eq('department_id', deptId);
  const { error } = await supabase.from('departments').delete().eq('id', deptId);
  if (error) throw error;
};