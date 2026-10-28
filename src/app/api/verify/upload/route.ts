import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// POST { type } -> { path, token }  Somewhere to upload an ID card, a selfie or a company document.
// Files go in the private "verifications" bucket under <you>/..., which only the Birdie team can open.
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { type?: string; size?: number };
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const ext = TYPES[String(b.type)];
  if (!ext) return jsonError(400, "bad_type");
  if (!b.size || b.size > 10 * 1024 * 1024) return jsonError(413, "too_large");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await admin.storage.from("verifications").createSignedUploadUrl(path);
  if (error || !data) return jsonError(500, "upload_failed");
  return NextResponse.json({ path, token: data.token });
}
