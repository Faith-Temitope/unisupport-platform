import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError, roleOf } from "@/lib/server";

// POST /api/admin/ad-media  (multipart, field "file") -> { url, kind }
// Admin-only upload of a sponsor's flyer, picture, video or PDF into the public "ads" bucket.
const MAX = 50 * 1024 * 1024;
const KIND = (type: string) => (type.startsWith("image/") ? "image" : /^video\/(mp4|webm)$/.test(type) ? "video" : type === "application/pdf" ? "pdf" : null);
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm", "application/pdf": "pdf" };

export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  if ((await roleOf(admin, user.id)) !== "admin") return jsonError(403, "admin_only");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "file_required");
  if (file.size > MAX) return jsonError(413, "too_large");
  const kind = KIND(file.type);
  if (!kind || !EXT[file.type]) return jsonError(415, "bad_type");

  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[file.type]}`;
  const { error } = await admin.storage.from("ads").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return jsonError(500, "upload_failed");
  const { data } = admin.storage.from("ads").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, kind });
}
