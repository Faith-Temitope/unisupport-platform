import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminClient, currentUser, jsonError } from "@/lib/server";

// POST { action, password, device } -- the account actions someone could abuse with your unlocked phone
// all need your password first:
//   verify -> ok (before changing your password)
//   check  -> ok (then the app signs out your other devices)
//   main   -> this phone becomes your main phone
//   export -> a copy of your data
//   delete -> your account and everything in it, gone
// When it isn't your main phone doing it, your account also gets a notification, so your main phone sees it.
type Device = { id?: string; name?: string };
const ACTIONS = ["verify", "check", "main", "export", "delete"] as const;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { action?: string; password?: string; device?: Device };
  const { user } = await currentUser();
  if (!user?.email) return jsonError(401, "sign_in_required");
  const action = ACTIONS.find((a) => a === b.action);
  if (!action) return jsonError(400, "bad_action");
  const admin = adminClient();
  if (!admin) return jsonError(501, "not_configured");

  // Too many wrong passwords: wait.
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { count } = await admin.from("password_attempts").select("user_id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 5) return jsonError(429, "locked");
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error } = await anon.auth.signInWithPassword({ email: user.email, password: String(b.password ?? "") });
  if (error || signed.user?.id !== user.id) {
    await admin.from("password_attempts").insert({ user_id: user.id }).then(() => null, () => null);
    return jsonError(403, "wrong_password");
  }
  // End only the session this check opened. (A plain signOut() is global and would sign the student out everywhere.)
  if (signed.session) await admin.auth.admin.signOut(signed.session.access_token, "local").catch(() => {});

  const device = { id: String(b.device?.id ?? "").slice(0, 64), name: String(b.device?.name ?? "A phone").slice(0, 80) };
  const { data: prof } = await admin.from("profiles").select("main_device").eq("id", user.id).maybeSingle();
  const main = prof?.main_device as { id?: string; name?: string } | null;
  const elsewhere = !!main?.id && main.id !== device.id;
  const tell = async (title: string) => { if (elsewhere) await admin.from("notifications").insert({ user_id: user.id, title, body: `From ${device.name}. If this wasn't you, change your password now.`, link: "/prototype?tab=me" }); };

  if (action === "verify") { await tell("Your password is being changed"); return NextResponse.json({ ok: true }); }
  if (action === "check") { await tell("Your other devices were signed out"); return NextResponse.json({ ok: true, elsewhere }); }
  if (action === "main") {
    await admin.from("profiles").update({ main_device: { ...device, at: new Date().toISOString() } }).eq("id", user.id);
    if (main?.id && main.id !== device.id) await admin.from("notifications").insert({ user_id: user.id, title: "Your main phone changed", body: `It's now ${device.name}.`, link: "/prototype?tab=me" });
    return NextResponse.json({ ok: true });
  }
  if (action === "export") {
    await tell("A copy of your Birdie data was downloaded");
    const q = (t: string, col = "user_id") => admin.from(t).select("*").eq(col, user.id).limit(5000).then((r) => r.data ?? [], () => []);
    const [profile, channel, state, posts, moments, wallet, notices, follows, groupMsgs, dmMsgs, campus] = await Promise.all([
      q("profiles", "id"), q("channels", "id"), q("user_state"), q("posts", "author_id"), q("moments", "author_id"), q("wallet_transactions"),
      q("notifications"), q("follows", "follower_id"), q("chat_group_messages", "sender_id"), q("dm_messages", "sender_id"), q("campus_posts", "author_id"),
    ]);
    const strip = (rows: Record<string, unknown>[]) => rows.map(({ main_device, ...r }) => { void main_device; return r; });
    return NextResponse.json({ exported_at: new Date().toISOString(), email: user.email, profile: strip(profile), channel, study: state, posts, moments, wallet, notifications: notices, following: follows, group_messages: groupMsgs, direct_messages: dmMsgs, campus_posts: campus });
  }
  // delete
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return jsonError(500, "delete_failed");
  return NextResponse.json({ ok: true });
}
