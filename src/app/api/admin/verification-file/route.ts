import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError, roleOf } from "@/lib/server";

// GET ?path=... -> { url }  An ID card, selfie or company document, for the Birdie team only (5 minutes).
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  if ((await roleOf(admin, user.id)) !== "admin") return jsonError(403, "admins_only");
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic|pdf)$/i.test(path)) return jsonError(400, "bad_path");
  const { data } = await admin.storage.from("verifications").createSignedUrl(path, 300);
  return data ? NextResponse.json({ url: data.signedUrl }) : jsonError(404, "not_found");
}
