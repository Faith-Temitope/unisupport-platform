import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// GET /api/courses/:id -> a course someone shared with you (or yours), with short-lived file links.
// Access is checked on the server with course_access(): owner, a person it was shared with, or the
// Unisupport desk agent / writer on a chat it was shared into. Nobody else gets anything.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "bad_id");
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");

  const { data: role } = await admin.rpc("course_access", { p_course: id, p_user: user.id });
  if (!role) return jsonError(403, "no_access");

  const [{ data: course }, { data: notes }, { data: files }] = await Promise.all([
    admin.from("courses").select("code,name,color,user_id").eq("id", id).maybeSingle(),
    admin.from("notes").select("id,title,body,category,created_at").eq("course_id", id).order("created_at", { ascending: false }).limit(500),
    admin.from("course_files").select("name,kind,storage_path,category").eq("course_id", id).limit(500),
  ]);
  if (!course) return jsonError(404, "not_found");
  const { data: owner } = await admin.from("channels").select("display_name").eq("id", course.user_id).maybeSingle();
  const withUrls = await Promise.all((files ?? []).map(async (f) => {
    const { data } = await admin.storage.from("study-files").createSignedUrl(f.storage_path, 900);
    return { name: f.name, kind: f.kind, category: f.category, url: data?.signedUrl ?? null };
  }));
  return NextResponse.json({ course: { code: course.code, name: course.name, color: course.color, owner: owner?.display_name ?? null }, role, notes: notes ?? [], files: withUrls });
}
