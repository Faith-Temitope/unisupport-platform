"use client";

// Real backend for Explore's social layer: public channels, posts (videos/text), likes, follows.
// Posts and follows are readable by anyone signed in; writes are always "your own" (RLS). Video
// files go in the public `videos` bucket under the uploader's own folder.
import { createClient } from "@/lib/supabase";

export type Link = { label: string; url: string };
export interface Channel {
  id: string; handle: string | null; display_name: string; bio: string; links: Link[];
  school: string | null; country: string | null; region: string | null; program: string | null; color: string;
}
export interface RemotePost {
  id: string; author_id: string; kind: "video" | "text"; title: string; body: string | null; video_path: string | null;
  field: string | null; tags: string[]; duration_seconds: number | null; created_at: string;
}
export interface FeedPost extends RemotePost { videoUrl?: string; likes: number; liked: boolean }

/** Only http(s) links are ever stored or rendered -- a `javascript:` URL in a bio link would run
 * script for whoever taps it. Bare "instagram.com/x" style input gets https:// added. */
export function cleanUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try { const u = new URL(withScheme); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null; } catch { return null; }
}

export const videoUrl = (path: string) => createClient().storage.from("videos").getPublicUrl(path).data.publicUrl;

// ---------------- channels ----------------

export async function fetchChannels(ids: string[]): Promise<Channel[]> {
  if (!ids.length) return [];
  const { data } = await createClient().from("channels").select("*").in("id", ids);
  return (data ?? []) as Channel[];
}

export async function upsertMyChannel(userId: string, c: Omit<Channel, "id" | "color"> & { color?: string }): Promise<string | null> {
  const links = c.links.map((l) => ({ label: l.label.trim().slice(0, 40), url: cleanUrl(l.url) })).filter((l): l is Link => !!l.url).slice(0, 5);
  const { error } = await createClient().from("channels").upsert({ id: userId, ...c, handle: c.handle || null, links, updated_at: new Date().toISOString() });
  if (!error) return null;
  return /channels_handle_key|duplicate key/i.test(error.message) ? "handle_taken" : error.message;
}

export async function fetchChannelStats(id: string, me?: string): Promise<{ followers: number; likes: number; iFollow: boolean }> {
  const sb = createClient();
  const [f, posts, mine] = await Promise.all([
    sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", id),
    sb.from("posts").select("id").eq("author_id", id),
    me ? sb.from("follows").select("follower_id").eq("followee_id", id).eq("follower_id", me).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ids = (posts.data ?? []).map((p) => p.id as string);
  const likes = ids.length ? (await sb.from("post_likes").select("post_id", { count: "exact", head: true }).in("post_id", ids)).count ?? 0 : 0;
  return { followers: f.count ?? 0, likes, iFollow: !!mine.data };
}

// ---------------- posts ----------------

async function withLikes(rows: RemotePost[], me?: string): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const { data } = await createClient().from("post_likes").select("post_id,user_id").in("post_id", rows.map((r) => r.id));
  const count: Record<string, number> = {}; const mine = new Set<string>();
  for (const l of data ?? []) { count[l.post_id as string] = (count[l.post_id as string] ?? 0) + 1; if (l.user_id === me) mine.add(l.post_id as string); }
  return rows.map((r) => ({ ...r, tags: r.tags ?? [], videoUrl: r.video_path ? videoUrl(r.video_path) : undefined, likes: count[r.id] ?? 0, liked: mine.has(r.id) }));
}

export async function fetchFeed(me?: string, limit = 100): Promise<FeedPost[]> {
  const { data } = await createClient().from("posts").select("*").order("created_at", { ascending: false }).limit(limit);
  return withLikes((data ?? []) as RemotePost[], me);
}
export async function fetchPostsBy(authorId: string, me?: string): Promise<FeedPost[]> {
  const { data } = await createClient().from("posts").select("*").eq("author_id", authorId).order("created_at", { ascending: false }).limit(200);
  return withLikes((data ?? []) as RemotePost[], me);
}

/** Uploads the video (if any), then creates the post. Returns the new post or an error message. */
export async function createPost(userId: string, p: { kind: "video" | "text"; title: string; body?: string; field: string; tags: string[]; durationSeconds?: number; file?: File }): Promise<{ post?: FeedPost; error?: string }> {
  const sb = createClient();
  let video_path: string | null = null;
  if (p.kind === "video") {
    if (!p.file) return { error: "Choose a video first" };
    const ext = (p.file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    video_path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("videos").upload(video_path, p.file, { contentType: p.file.type || "video/mp4", upsert: false });
    if (error) return { error: `Video upload failed: ${error.message}` };
  }
  const { data, error } = await sb.from("posts").insert({ author_id: userId, kind: p.kind, title: p.title, body: p.body ?? null, video_path, field: p.field, tags: p.tags, duration_seconds: p.durationSeconds ?? null }).select("*").single();
  if (error) {
    if (video_path) await sb.storage.from("videos").remove([video_path]);
    return { error: error.message };
  }
  return { post: { ...(data as RemotePost), tags: (data as RemotePost).tags ?? [], videoUrl: video_path ? videoUrl(video_path) : undefined, likes: 0, liked: false } };
}

export async function deletePostRemote(id: string, videoPath?: string | null) {
  const sb = createClient();
  await sb.from("posts").delete().eq("id", id);
  if (videoPath) await sb.storage.from("videos").remove([videoPath]);
}

export async function setLike(postId: string, userId: string, on: boolean) {
  const sb = createClient();
  if (on) await sb.from("post_likes").upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
  else await sb.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
}

// ---------------- follows ----------------

export async function fetchMyFollowing(userId: string): Promise<string[]> {
  const { data } = await createClient().from("follows").select("followee_id").eq("follower_id", userId);
  return (data ?? []).map((r) => r.followee_id as string);
}
export async function setFollow(followerId: string, followeeId: string, on: boolean) {
  const sb = createClient();
  if (on) await sb.from("follows").upsert({ follower_id: followerId, followee_id: followeeId }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true });
  else await sb.from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId);
}
