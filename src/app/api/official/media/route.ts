import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// Logos, article covers and videos for verified accounts. Public content, so the "official-media"
// bucket is public, but only the account's own team can upload to its folder.
//   POST { oa, name, size, type } -> { path, token, url }
const MAX = 50 * 1024 * 1024;
const safe = (n: string) => n.replace(/[^\w.\-() ]+/g, "_").slice(-80) || "file";

export async function POST(req: Request) {
  let b: { oa?: string; name?: string; size?: number; type?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const { user, sb } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  if (!b.oa || !/^[0-9a-f-]{36}$/i.test(b.oa)) return jsonError(400, "bad_account");
  const { data: allowed } = await sb.rpc("oa_is_admin", { p_oa: b.oa });
  if (allowed !== true) return jsonError(403, "not_allowed");
  if (!b.size || b.size > MAX) return jsonError(413, "too_large");
  if (!/^(image|video)\//.test(String(b.type))) return jsonError(400, "images_and_videos_only");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const path = `oa/${b.oa}/${crypto.randomUUID()}-${safe(String(b.name ?? "file"))}`;
  const { data, error } = await admin.storage.from("official-media").createSignedUploadUrl(path);
  if (error || !data) return jsonError(500, "upload_failed");
  const url = admin.storage.from("official-media").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ path, token: data.token, url });
}
