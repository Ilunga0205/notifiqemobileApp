// supabase/functions/approve-member/index.ts
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
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Load join request
    const { data: request, error: reqError } = await supabase
      .from("join_requests")
      .select("id, org_id, full_name, email, status")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "pending") {
      return new Response(JSON.stringify({ error: "Request already reviewed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;

    // 2. Check if user already exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(
      (u) => u.email?.toLowerCase() === request.email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
      // Resend invite so they get a fresh link
      await supabase.auth.admin.generateLink({
        type: "invite",
        email: request.email,
      });
    } else {
      // New user — invite by email
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        request.email,
        { data: { full_name: request.full_name } }
      );
      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = inviteData.user.id;
    }

    // 3. Upsert profile
    await supabase.from("profiles").upsert({
      id:              userId,
      full_name:       request.full_name || request.email,
      email:           request.email,
      avatar_initials: (request.full_name || request.email).trim().split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
      avatar_color:    "#1D4ED8",
    });

    // 4. Create or update membership — status: 'invited' until they log in
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id, status")
      .eq("user_id", userId)
      .eq("org_id", request.org_id)
      .maybeSingle();

    if (existingMembership) {
      // Only update if not already active
      if (existingMembership.status !== "active") {
        await supabase.from("memberships")
          .update({ status: "invited" })
          .eq("user_id", userId)
          .eq("org_id", request.org_id);
      }
    } else {
      await supabase.from("memberships").insert({
        org_id:  request.org_id,
        user_id: userId,
        role:    "member",
        status:  "invited",   // ← invited, not active
      });
    }

    // 5. Add to General department
    const { data: generalDept } = await supabase
      .from("departments")
      .select("id")
      .eq("org_id", request.org_id)
      .eq("slug", "general")
      .maybeSingle();

    if (generalDept) {
      await supabase.from("department_members").upsert(
        { department_id: generalDept.id, user_id: userId },
        { onConflict: "department_id,user_id" }
      );
    }

    // 6. Mark approved
    await supabase.from("join_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});