import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError, roleOf } from "@/lib/server";

// Which vendor keys are installed on the server (admins only). Never returns the keys themselves.
export async function GET() {
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  if ((await roleOf(admin, user.id)) !== "admin") return jsonError(403, "admin_only");
  return NextResponse.json({
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
