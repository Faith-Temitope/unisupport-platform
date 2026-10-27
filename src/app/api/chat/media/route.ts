import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// Photos, voice notes and files sent in chats live in the private "chat-media" bucket, under
// dm/<thread>/... or group/<group>/... Only members of that chat can upload to it or open it.
// Your own stickers live under stickers/<you>/ and anyone signed in can see them (they're sent around).
//   POST { scope: "dm"|"group"|"sticker", id, name, size, type } -> { path, token }  (phone then uploads straight to storage)
//   PUT  { from, scope, id }  -> { path }   forward: copy a file you can see into another chat you're in
//   GET  ?path=...            -> { url }    a link that works for 5 minutes
const MAX = 25 * 1024 * 1024;
const safe = (n: string) => n.replace(/[^\w.\-() ]+/g, "_").slice(-80) || "file";
const UUID = /^[0-9a-f-]{36}$/i;

async function isMember(sb: Awaited<ReturnType<typeof currentUser>>["sb"], scope: string, id: string) {
  if ((scope !== "dm" && scope !== "group") || !UUID.test(id)) return false;
  const { data } = await sb.rpc("chat_is_member", { p_scope: scope, p_target: id });
  return data === true;
}
/** Can this user open the file at this path? */
async function canSee(sb: Awaited<ReturnType<typeof currentUser>>["sb"], path: string) {
  if (path.includes("..")) return false;
  const [scope, id] = path.split("/");
  if (scope === "stickers") return true;
  return isMember(sb, scope, id ?? "");
}

export async function POST(req: Request) {
  let b: { scope?: string; id?: string; name?: string; size?: number; type?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const { user, sb } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const sticker = b.scope === "sticker";
  if (sticker ? !/^image\//.test(String(b.type)) : !(await isMember(sb, String(b.scope), String(b.id)))) return jsonError(403, "not_member");
  if (!b.size || b.size > (sticker ? 2 * 1024 * 1024 : MAX)) return jsonError(413, "too_large");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const path = sticker ? `stickers/${user.id}/${crypto.randomUUID()}.png` : `${b.scope}/${b.id}/${crypto.randomUUID()}-${safe(String(b.name ?? "file"))}`;
  const { data, error } = await admin.storage.from("chat-media").createSignedUploadUrl(path);
  if (error || !data) return jsonError(500, "upload_failed");
  return NextResponse.json({ path, token: data.token });
}

export async function PUT(req: Request) {
  let b: { from?: string; scope?: string; id?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const { user, sb } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const from = String(b.from ?? "");
  if (!(await canSee(sb, from)) || !(await isMember(sb, String(b.scope), String(b.id)))) return jsonError(403, "not_member");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const name = from.split("/").pop()?.replace(/^[0-9a-f-]{36}-?/i, "") || "file";
  const path = `${b.scope}/${b.id}/${crypto.randomUUID()}-${safe(name)}`;
  const { error } = await admin.storage.from("chat-media").copy(from, path);
  if (error) return jsonError(500, "copy_failed");
  return NextResponse.json({ path });
}

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const { user, sb } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  if (!(await canSee(sb, path))) return jsonError(403, "not_member");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data } = await admin.storage.from("chat-media").createSignedUrl(path, 300);
  if (!data?.signedUrl) return jsonError(404, "not_found");
  return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "private, max-age=240" } });
}
