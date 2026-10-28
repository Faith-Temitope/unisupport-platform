import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// GET ?order=...&i=0 -> { url, name }  A file from a print job, for the student who sent it or the
// print shop's team only, as a link that works for 10 minutes.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get("order") ?? "", i = Number(q.get("i") ?? 0);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(i) || i < 0) return jsonError(400, "bad_request");
  const { user } = await currentUser();
  if (!user) return jsonError(401, "sign_in_required");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");
  const { data: o } = await admin.from("biz_orders").select("user_id, oa_id, files, status").eq("id", id).maybeSingle();
  if (!o) return jsonError(404, "not_found");
  if (o.user_id !== user.id) {
    const { data: role } = await admin.rpc("_oa_role", { p_oa: o.oa_id, p_user: user.id });
    if (!role) return jsonError(403, "not_allowed");
    if (o.status === "awaiting_payment") return jsonError(403, "not_paid");
  }
  const f = ((o.files ?? []) as { path: string; name?: string }[])[i];
  if (!f || !f.path.startsWith(`${o.user_id}/orders/`)) return jsonError(404, "not_found");
  const { data } = await admin.storage.from("study-files").createSignedUrl(f.path, 600);
  return data ? NextResponse.json({ url: data.signedUrl, name: f.name ?? "file" }) : jsonError(404, "not_found");
}
