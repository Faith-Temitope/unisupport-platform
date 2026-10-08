import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Shared helpers for API routes. Everything that needs the service-role key lives on the server;
// the key is never sent to the browser.

export const jsonError = (status: number, error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/** The signed-in user for this request (from their session cookie), or null. */
export async function currentUser() {
  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  return { user, sb };
}

/** Service-role client. Returns null when the server isn't configured. */
export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } }) : null;
}

/** The user's role from profiles, read with the service key so it can't be spoofed by the client. */
export async function roleOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as string | undefined) ?? null;
}
