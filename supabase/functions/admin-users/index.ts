// Sure Seal Production — add, reset and remove logins from Setup → Users.
// Runs on Supabase's servers with the service key, which never reaches the browser.
// Only active owners and managers can call it; only owners can touch owner logins.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ROLES = ["none", "owner", "manager", "production", "warehouse", "office"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: who, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !who?.user) return json({ error: "Please sign in again." }, 401);
    const { data: me } = await admin.from("profiles").select("role,active").eq("id", who.user.id).maybeSingle();
    if (!me || !me.active || !["owner", "manager"].includes(me.role)) {
      return json({ error: "Only owners and managers can manage logins." }, 403);
    }
    const isOwner = me.role === "owner";
    const b = await req.json();
    const target = async (id: string) =>
      (await admin.from("profiles").select("id,role,active,email").eq("id", id).maybeSingle()).data;
    const activeOwners = async () =>
      (await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner").eq("active", true)).count || 0;

    if (b.action === "create") {
      const email = String(b.email || "").trim().toLowerCase();
      const password = String(b.password || "");
      const role = String(b.role || "");
      const name = String(b.name || "").trim() || email.split("@")[0];
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter the login as an email address." }, 400);
      if (password.length < 8) return json({ error: "The password needs at least 8 characters." }, 400);
      if (!ROLES.includes(role) || role === "none") return json({ error: "Choose a role." }, 400);
      if (role === "owner" && !isOwner) return json({ error: "Only an owner can add an owner." }, 403);
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) {
        return json({ error: /already|exists|registered/i.test(error.message) ? "A login with that email already exists." : error.message }, 400);
      }
      const { error: pe } = await admin.from("profiles")
        .upsert({ id: data.user.id, email, name, role, active: true }, { onConflict: "id" });
      if (pe) return json({ error: pe.message }, 400);
      return json({ ok: true, id: data.user.id });
    }

    if (b.action === "password" || b.action === "remove") {
      const t = await target(String(b.id || ""));
      if (!t) return json({ error: "That login was not found." }, 404);
      if (t.role === "owner" && !isOwner) return json({ error: "Only an owner can change an owner login." }, 403);
      if (b.action === "password") {
        const password = String(b.password || "");
        if (password.length < 8) return json({ error: "The password needs at least 8 characters." }, 400);
        const { error } = await admin.auth.admin.updateUserById(t.id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      if (t.id === who.user.id) return json({ error: "You can't remove your own login." }, 400);
      if (t.role === "owner" && t.active && (await activeOwners()) <= 1) {
        return json({ error: "At least one active owner is required." }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(t.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
