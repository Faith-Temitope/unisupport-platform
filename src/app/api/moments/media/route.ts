import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// Photos in Moments (and your Moments cover). Stored privately under moments/<you>/...; only you and
// friends who can see your Moments get a link (the same rules as the feed, checked on the server).
//   POST { size, type } -> { path, token }
//   GET  ?path=<owner>/<file> -> { url }
const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  let b: { size?: number; type?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  if (!/^image\//.test(String(b.type))) return jsonError(400, "images_only");
  if (!b.size || b.size > MAX) return jsonError(413, "too_large");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { data, error } = await admin.storage.from("moments").createSignedUploadUrl(path);
  if (error || !data) return jsonError(500, "upload_failed");
  return NextResponse.json({ path, token: data.token });
}

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const { user, sb } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  if (path.includes("..")) return jsonError(400, "bad_path");
  const { data: ok } = await sb.rpc("can_view_moment_media", { p_path: path });
  if (ok !== true) return jsonError(403, "not_allowed");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data } = await admin.storage.from("moments").createSignedUrl(path, 300);
  if (!data?.signedUrl) return jsonError(404, "not_found");
  return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "private, max-age=240" } });
}
