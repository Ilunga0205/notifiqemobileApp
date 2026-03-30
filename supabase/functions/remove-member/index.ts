// supabase/functions/remove-member/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId, isSelf } = await req.json();

    if (!userId || !orgId) {
      return new Response(JSON.stringify({ error: "userId and orgId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user: caller } } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // If not self — verify caller is admin
    if (!isSelf) {
      const { data: callerMembership } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("org_id", orgId)
        .eq("status", "active")
        .single();

      if (!callerMembership || callerMembership.role !== "admin") {
        return new Response(JSON.stringify({ error: "Only admins can remove members" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If self — verify userId matches caller
    if (isSelf && userId !== caller.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Delete department_members
    await supabase.from("department_members").delete().eq("user_id", userId);

    // 2. Delete memberships
    await supabase.from("memberships").delete()
      .eq("user_id", userId)
      .eq("org_id", orgId);

    // 3. Delete join_requests for this org
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profile?.email) {
      await supabase.from("join_requests").delete()
        .eq("email", profile.email)
        .eq("org_id", orgId);
    }

    // 4. Delete profile
    await supabase.from("profiles").delete().eq("id", userId);

    // 5. Delete auth user
    await supabase.auth.admin.deleteUser(userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});