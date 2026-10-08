"use client";

// Real backend for Explore's social layer: public channels, posts (videos/text), likes, follows.
// Posts and follows are readable by anyone signed in; writes are always "your own" (RLS). Video
// files go in the public `videos` bucket under the uploader's own folder.
import { createClient } from "@/lib/supabase";

export type Link = { label: string; url: string };
export interface Channel {
  id: string; handle: string | null; display_name: string; bio: string; links: Link[];
  school: string | null; country: string | null; region: string | null; program: string | null; color: string;
  /** Their study buddy's look, so it can meet yours in chats. */
  mascot?: string | null;
}
export interface RemotePost {
  id: string; author_id: string; kind: "video" | "text"; title: string; body: string | null; video_path: string | null;
  field: string | null; tags: string[]; duration_seconds: number | null; created_at: string;
  youtube_id: string | null; source_name: string | null; pinned_at: string | null;
  /** Real topics (AI, Maths, Web Dev...) worked out by the database from the title and description. */
  topics?: string[];
  comment_count?: number;
}
export interface Playlist { id: string; title: string; description: string; is_public: boolean; count: number; cover: string | null; cover_kind: "youtube" | "upload" | "text" | null }
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
  return rows.map((r) => ({ ...r, tags: r.topics?.length ? r.topics : r.tags ?? [], videoUrl: r.video_path ? videoUrl(r.video_path) : undefined, likes: count[r.id] ?? 0, liked: mine.has(r.id) }));
}

/** Newest first, a page at a time (`before` = createdAt of the last post already shown). `term`
 * searches title, subject and tags server-side, so it finds posts that aren't loaded yet. */
export async function fetchFeed(me?: string, opts: { limit?: number; before?: string; term?: string } = {}): Promise<FeedPost[]> {
  let q = createClient().from("posts").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 40);
  if (opts.before) q = q.lt("created_at", opts.before);
  const t = opts.term?.trim().replace(/[,()*%"{}\\]/g, " ").trim();
  if (t) q = q.or(`title.ilike.*${t}*,field.ilike.*${t}*,source_name.ilike.*${t}*,tags.cs.{${t.toLowerCase()}},topics.cs.{"${t}"}`);
  let { data, error } = await q;
  // Older databases without the topics column: search without it.
  if (error && t) {
    let q2 = createClient().from("posts").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 40);
    if (opts.before) q2 = q2.lt("created_at", opts.before);
    ({ data, error } = await q2.or(`title.ilike.*${t}*,field.ilike.*${t}*,source_name.ilike.*${t}*,tags.cs.{${t.toLowerCase()}}`));
  }
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

/** Posts by id, kept in the order given (playlists, liked list). */
export async function fetchPostsByIds(ids: string[], me?: string): Promise<FeedPost[]> {
  if (!ids.length) return [];
  const { data } = await createClient().from("posts").select("*").in("id", ids.slice(0, 500));
  const byId = new Map(((data ?? []) as RemotePost[]).map((p) => [p.id, p]));
  return withLikes(ids.map((id) => byId.get(id)).filter((p): p is RemotePost => !!p), me);
}
export async function fetchLikedPosts(me: string): Promise<FeedPost[]> {
  const { data } = await createClient().from("post_likes").select("post_id").eq("user_id", me).order("created_at", { ascending: false }).limit(300);
  return fetchPostsByIds((data ?? []).map((r) => r.post_id as string), me);
}

// ---------------- pins & playlists ----------------

const rpcMsg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");
export async function pinPost(id: string, on: boolean): Promise<string | null> {
  const { error } = await createClient().rpc("pin_post", { p_id: id, p_on: on });
  return error ? rpcMsg(error) : null;
}
export async function listPlaylists(owner: string): Promise<Playlist[]> {
  const { data } = await createClient().rpc("list_playlists", { p_owner: owner });
  return (data ?? []) as Playlist[];
}
export async function getPlaylist(id: string): Promise<{ id: string; owner_id: string; title: string; description: string; is_public: boolean; post_ids: string[] } | null> {
  const { data } = await createClient().rpc("get_playlist", { p_id: id });
  return (data as never) ?? null;
}
export async function savePlaylist(id: string | null, title: string, description: string, isPublic: boolean): Promise<{ id?: string; error?: string }> {
  const { data, error } = await createClient().rpc("save_playlist", { p_id: id, p_title: title, p_description: description, p_public: isPublic });
  return error ? { error: rpcMsg(error) } : { id: data as string };
}
export async function deletePlaylist(id: string) { await createClient().rpc("delete_playlist", { p_id: id }); }
export async function playlistToggle(playlist: string, post: string, on: boolean): Promise<string | null> {
  const { error } = await createClient().rpc("playlist_toggle", { p_playlist: playlist, p_post: post, p_on: on });
  return error ? rpcMsg(error) : null;
}
export async function myPlaylistsFor(post: string): Promise<{ id: string; title: string; is_public: boolean; has: boolean }[]> {
  const { data } = await createClient().rpc("my_playlists_for", { p_post: post });
  return (data ?? []) as { id: string; title: string; is_public: boolean; has: boolean }[];
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

// ---------------- comments ----------------

export interface Comment { id: string; user_id: string; parent_id: string | null; body: string; created_at: string; name: string; color: string; mine: boolean }
export async function listComments(post: string): Promise<Comment[]> {
  const { data } = await createClient().rpc("list_comments", { p_post: post });
  return (data ?? []) as Comment[];
}
export async function addComment(post: string, body: string, parent?: string): Promise<{ id?: string; error?: string }> {
  const { data, error } = await createClient().rpc("add_comment", { p_post: post, p_body: body, p_parent: parent ?? null });
  return error ? { error: /slow_down/.test(error.message) ? "You're commenting too fast. Wait a moment." : rpcMsg(error) } : { id: data as string };
}
export async function deleteComment(id: string) { await createClient().rpc("delete_comment", { p_id: id }); }

// ---------------- finding people by username ----------------

/** Search everyone on Birdie by username or name (not just people already loaded). */
export async function findChannels(q: string, me?: string): Promise<Channel[]> {
  const t = q.trim().replace(/^@/, "").replace(/[,()*%"{}\\]/g, " ").trim();
  if (t.length < 2) return [];
  let query = createClient().from("channels").select("*").or(`handle.ilike.${t}*,display_name.ilike.*${t}*`).limit(20);
  if (me) query = query.neq("id", me);
  const { data } = await query;
  return (data ?? []) as Channel[];
}
export async function channelByHandle(handle: string): Promise<Channel | null> {
  const h = handle.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(h)) return null;
  const { data } = await createClient().from("channels").select("*").ilike("handle", h).maybeSingle();
  return (data as Channel | null) ?? null;
}
