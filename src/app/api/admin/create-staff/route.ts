import { createClient as createAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

// POST /api/admin/create-staff  { email, full_name, role } -> { email, temp_password }
// Admin-only. Creates a real writer/support/admin account directly, with email already confirmed
// (no confirmation email sent -- side-steps relying on transactional email working, which this
// project's experience with Supabase/Brevo delivery has already shown is not always reliable).
// The temp password is returned once in the response for the admin to hand to that person
// directly; it is never logged or stored anywhere beyond Supabase's own hashed credential.
const err = (status: number, error: string) => NextResponse.json({ error }, { status });
const ROLES = ["writer", "support", "admin"] as const;

function tempPassword() {
  // 12 random bytes -> readable base64url, plus a guaranteed digit so it always passes basic
  // password rules. Shown once; the person should change it after first sign-in.
  return crypto.randomBytes(12).toString("base64url") + "9";
}

export async function POST(req: Request) {
  let body: { email?: string; full_name?: string; role?: string };
  try { body = await req.json(); } catch { return err(400, "invalid_json"); }
  const email = body.email?.trim().toLowerCase();
  const full_name = body.full_name?.trim();
  const role = body.role;
  if (!email || !full_name || !role) return err(400, "email_name_and_role_required");
  if (!ROLES.includes(role as (typeof ROLES)[number])) return err(400, "invalid_role");

  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err(401, "sign_in_required");
  const { data: me } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return err(403, "admin_only");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return err(501, "not_configured");
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });

  const password = tempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (createErr || !created.user) return err(409, createErr?.message === "User already registered" ? "email_already_registered" : "create_failed");

  const uid = created.user.id;
  const { error: roleErr } = await admin.from("profiles").update({ role, full_name }).eq("id", uid);
  if (roleErr) return err(500, "role_update_failed");

  if (role === "writer") {
    await admin.from("writers").insert({ id: uid, display_name: full_name, specialization: "General", subjects: [], is_available: false });
  }

  return NextResponse.json({ email, temp_password: password });
}
