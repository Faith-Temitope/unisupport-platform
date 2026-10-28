import { NextResponse } from "next/server";
import { gate } from "@/lib/ai/gemini";
import { transcribe } from "@/lib/ai/transcribe";
import { jsonError } from "@/lib/server";

// POST { post } -> { url }  Subtitles for a video uploaded to Channels (YouTube videos have their own).
// They're written once per video; after that everyone gets the saved file (videos/captions/<post>.vtt).
export const maxDuration = 300;
const MAX = 50 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  let b: { post?: string };
  try { b = await req.json(); } catch { return jsonError(400, "invalid_json"); }
  if (!UUID.test(String(b.post))) return jsonError(400, "bad_post");
  const g = await gate("captions", { freeKey: "captions_free", plusKey: "captions_plus", free: 10, plus: 30, label: "new subtitles" });
  if (g.fail) return g.fail;
  const { admin } = g;

  const path = `captions/${b.post}.vtt`;
  const url = admin.storage.from("videos").getPublicUrl(path).data.publicUrl;
  const { data: have } = await admin.storage.from("videos").list("captions", { search: `${b.post}.vtt`, limit: 1 });
  if (have?.some((f) => f.name === `${b.post}.vtt`)) return NextResponse.json({ url });

  const { data: post } = await admin.from("posts").select("video_path").eq("id", b.post).maybeSingle();
  if (!post?.video_path) return jsonError(404, "no_video");
  const { data: blob } = await admin.storage.from("videos").download(post.video_path);
  if (!blob) return jsonError(404, "no_video");
  if (blob.size > MAX) return jsonError(413, "too_long");

  const r = await transcribe(g, blob, blob.type || "video/mp4", "vtt", "captions");
  if ("error" in r) return jsonError(502, r.error);
  const vtt = r.text.startsWith("WEBVTT") ? r.text : "WEBVTT\n\n"; // no speech: an empty track, so it isn't tried again
  await admin.storage.from("videos").upload(path, new Blob([vtt], { type: "text/vtt" }), { upsert: true, contentType: "text/vtt" });
  return NextResponse.json({ url });
}
