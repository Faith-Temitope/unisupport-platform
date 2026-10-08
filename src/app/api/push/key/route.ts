import { NextResponse } from "next/server";
import { adminClient, jsonError } from "@/lib/server";

// GET /api/push/key -> the public half of the push key pair (safe to share; phones need it to subscribe).
export async function GET() {
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data } = await admin.from("app_secrets").select("value").eq("key", "vapid_public").maybeSingle();
  if (!data) return jsonError(501, "push_not_configured");
  return NextResponse.json({ key: data.value }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
