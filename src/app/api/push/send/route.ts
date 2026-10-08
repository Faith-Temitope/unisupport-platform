import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminClient, jsonError } from "@/lib/server";

// POST /api/push/send { id } -- called by the database when a notification row is added.
// It carries no secret: we re-read the notification ourselves and only push it if it is real,
// less than five minutes old and hasn't been pushed yet, and only to its owner's phones.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { id?: string } | null;
  const id = body?.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "bad_id");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");

  // Claim it atomically so it is never pushed twice.
  const fresh = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: n } = await admin.from("notifications").update({ pushed_at: new Date().toISOString() })
    .eq("id", id).is("pushed_at", null).gte("created_at", fresh).select("user_id,title,body,link").maybeSingle();
  if (!n) return NextResponse.json({ ok: true, skipped: true });

  const [{ data: keys }, { data: subs }] = await Promise.all([
    admin.from("app_secrets").select("key,value").in("key", ["vapid_public", "vapid_private"]),
    admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", n.user_id),
  ]);
  const pub = keys?.find((k) => k.key === "vapid_public")?.value, priv = keys?.find((k) => k.key === "vapid_private")?.value;
  if (!pub || !priv || !subs?.length) return NextResponse.json({ ok: true, skipped: true });
  webpush.setVapidDetails("mailto:hello@getunisupport.xyz", pub, priv);

  const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.link ?? "/prototype", tag: id });
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "high" }); }
    catch (e) {
      // The phone unsubscribed or the app was removed: forget that subscription.
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }));
  return NextResponse.json({ ok: true, sent: subs.length });
}
