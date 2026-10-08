import { createClient as createAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/orders/<id>/files -> short-lived download links for a print/handwrite order's files.
// Staff only (help desk or admin). The files live in the student's private study-files folder, so
// staff never get bucket access, just a 15-minute link per file for the order they're working on.
const err = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return err(401, "sign_in_required");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return err(501, "not_configured");
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin" && me?.role !== "support") return err(403, "not_allowed");

  const { data: order } = await admin.from("print_orders").select("user_id,files").eq("id", id).maybeSingle();
  if (!order) return err(404, "not_found");
  const files = (order.files ?? []) as { name: string; path: string }[];
  const out = await Promise.all(files.map(async (f) => {
    // Only ever sign paths inside the ordering student's own folder.
    if (!f.path?.startsWith(`${order.user_id}/`)) return { name: f.name, url: null };
    const { data } = await admin.storage.from("study-files").createSignedUrl(f.path, 900, { download: f.name });
    return { name: f.name, url: data?.signedUrl ?? null };
  }));
  return NextResponse.json({ files: out });
}
