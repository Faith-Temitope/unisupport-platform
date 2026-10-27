import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// Photos, voice notes and files sent in chats live in the private "chat-media" bucket, under
// dm/<thread>/... or group/<group>/... Only members of that chat can upload to it or open it.
//   POST { scope, id, name, size, type } -> { path, token }   (then the phone uploads straight to storage)
//   GET  ?path=dm/<thread>/<file>       -> { url }            (a link that works for 5 minutes)
const MAX = 25 * 1024 * 1024;
const safe = (n: string) => n.replace(/[^\w.\-() ]+/g, "_").slice(-80) || "file";

async function isMember(scope: string, id: string) {
  const { user, sb } = await currentUser();
  if (!user) return { user: null, ok: false };
  if ((scope !== "dm" && scope !== "group") || !/^[0-9a-f-]{36}$/i.test(id)) return { user, ok: false };
  const { data } = await sb.rpc("chat_is_member", { p_scope: scope, p_target: id });
  return { user, ok: data === true };
}

export async function POST(req: Request) {
  let b: { scope?: string; id?: string; name?: string; size?: number; type?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const m = await isMember(String(b.scope), String(b.id));
  if (!m.user) return jsonError(401, "sign_in_required");
  if (!m.ok) return jsonError(403, "not_member");
  if (!b.size || b.size > MAX) return jsonError(413, "too_large");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const path = `${b.scope}/${b.id}/${crypto.randomUUID()}-${safe(String(b.name ?? "file"))}`;
  const { data, error } = await admin.storage.from("chat-media").createSignedUploadUrl(path);
  if (error || !data) return jsonError(500, "upload_failed");
  return NextResponse.json({ path, token: data.token });
}

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const [scope, id] = path.split("/");
  if (path.includes("..")) return jsonError(400, "bad_path");
  const m = await isMember(scope, id ?? "");
  if (!m.user) return jsonError(401, "sign_in_required");
  if (!m.ok) return jsonError(403, "not_member");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data } = await admin.storage.from("chat-media").createSignedUrl(path, 300);
  if (!data?.signedUrl) return jsonError(404, "not_found");
  return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "private, max-age=240" } });
}
