import { NextResponse } from "next/server";
import { gate } from "@/lib/ai/gemini";
import { transcribe } from "@/lib/ai/transcribe";
import { currentUser, jsonError } from "@/lib/server";

// POST { path } -> { text }  A voice note as text ("To Text" in a chat), for members of that chat only.
export const maxDuration = 120;
const MAX = 20 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  let b: { path?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  const path = String(b.path ?? "");
  const [scope, id] = path.split("/");
  if (path.includes("..") || (scope !== "dm" && scope !== "group") || !UUID.test(id ?? "")) return jsonError(400, "bad_path");
  // The same membership check the chat itself uses, as the signed-in student.
  const { sb } = await currentUser();
  const { data: member } = await sb.rpc("chat_is_member", { p_scope: scope, p_target: id });
  if (member !== true) return jsonError(403, "not_member");
  const g = await gate("voice_text", { freeKey: "voice_text_free", plusKey: "voice_text_plus", free: 30, plus: 100, label: "voice notes to text" });
  if (g.fail) return g.fail;
  const { data: blob } = await g.admin.storage.from("chat-media").download(path);
  if (!blob) return jsonError(404, "not_found");
  if (blob.size > MAX) return jsonError(413, "too_long");
  const r = await transcribe(g, blob, blob.type || (path.endsWith(".m4a") ? "audio/mp4" : "audio/webm"), "text", "voice_text");
  return "error" in r ? jsonError(502, r.error) : NextResponse.json({ text: r.text });
}
