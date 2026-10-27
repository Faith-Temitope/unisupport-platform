"use client";

import { createClient } from "@/lib/supabase";

// Chats: one-to-one, groups, verified accounts, the course folder, and money in chats.
// Everything goes through server functions that check membership; nothing is trusted from the phone.

export interface ChatPerson { id: string; name: string; handle: string | null; color: string }
export type MsgKind = "text" | "image" | "voice" | "file" | "location" | "contact" | "course" | "transfer" | "packet" | "recalled" | "system" | "sticker";
export interface ChatMsg {
  id: string; kind: MsgKind; body: string; meta: Record<string, unknown>; created_at: string; mine: boolean; sender_id: string | null;
  reply: { id: string; mine: boolean; text: string; name?: string } | null;
  /** groups only */ system?: boolean; name?: string; color?: string; handle?: string | null;
}
export interface DmRow { id: string; other: ChatPerson; pinned: boolean; muted: boolean; last_at: string; last: string; unread: number }
export interface GroupRow {
  id: string; name: string; about: string | null; role: "owner" | "admin" | "member"; muted: boolean; invite_code: string | null; members: number; last: string | null; last_at: string | null; unread: number;
  pinned: boolean; remark: string | null; alias: string | null; is_course: boolean; shared_id: string | null; avatars: { name: string; color: string }[];
}
export interface CourseChat {
  group_id: string; shared_id: string; course_id: string | null; code: string; name: string; owner: ChatPerson; mine: boolean; members: number; muted: boolean; pinned: boolean;
  last: string | null; last_at: string; unread: number; notice: { body: string; created_at: string; pinned: boolean } | null;
}
export interface OAccount { id: string; handle: string; name: string; about: string | null; category: string; logo_url: string | null; color: string; school: string | null; menu: OMenu[]; verified: true }
export interface OMenu { label: string; kind?: "link" | "reply"; value?: string; items?: { label: string; kind: "link" | "reply"; value: string }[] }
export interface OARow extends OAccount { pinned: boolean; muted: boolean; last_at: string; last: string | null; unread: number; window_open: boolean }
export interface OAMsg { id: string; from_oa: boolean; kind: "text" | "image" | "article" | "auto" | "menu"; body: string; meta: Record<string, unknown>; created_at: string }
export interface OAPostCard { id: string; kind: "article" | "video"; title: string; summary: string | null; cover_url: string | null; video_url: string | null; views: number; created_at: string }
export interface OAProfile extends OAccount { followers: number; following: boolean; my_role: "owner" | "admin" | null; posts: OAPostCard[] }
export interface CourseFeedRow {
  shared_id: string; course_id: string | null; code: string; name: string; owner: ChatPerson; mine: boolean; price: number | null; members: number;
  post: { id: string; body: string; pinned: boolean; created_at: string; author: ChatPerson } | null;
  chat: { body: string; created_at: string; author: ChatPerson } | null; last_at: string; unread: number;
}
export interface GiveawayInfo {
  id: string; sender: ChatPerson; mine_sent: boolean; kind: "money" | "airtime"; mode: "random" | "equal"; note: string | null; count: number; claimed: number; total: number;
  expired: boolean; expires_at: string; mine: { amount: number; status: string } | null; claims: { person: ChatPerson; amount: number; status: string; at: string }[];
}

const sb = () => createClient();
const errOf = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await sb().rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? errOf(error) || "failed" : null };
}

// ---------- lists
export const myDms = async () => (await call<DmRow[]>("my_dms")).data ?? [];
export const myGroups = async () => (await call<GroupRow[]>("my_groups2")).data ?? [];
export const myCourseChats = async () => (await call<CourseChat[]>("my_course_chats")).data ?? [];
export const courseGroupId = async (shared: string) => (await call<string>("course_group_id", { p_shared: shared })).data;
export const groupSetMe = (id: string, p: { pinned?: boolean; alias?: string; remark?: string }) => call("group_set_me", { p_group: id, p_pinned: p.pinned ?? null, p_alias: p.alias ?? null, p_remark: p.remark ?? null });
export const searchChat = async (scope: Scope, id: string, q: string) => (await call<{ id: string; body: string; created_at: string; mine: boolean; name: string }[]>("search_chat", { p_scope: scope, p_id: id, p_q: q })).data ?? [];
export const myOfficials = async () => (await call<OARow[]>("my_officials")).data ?? [];
export const myCourseFeed = async () => (await call<CourseFeedRow[]>("my_course_feed")).data ?? [];
export const courseFeedRead = (shared: string) => call("course_feed_read", { p_shared: shared });

// ---------- one-to-one
export const startDm = (user: string) => call<string>("start_dm", { p_user: user });
export const dmThread = (id: string) => call<{ id: string; other: ChatPerson; pinned: boolean; muted: boolean }>("dm_thread", { p_thread: id });
export const dmMessages = async (id: string, before?: string) => (await call<ChatMsg[]>("dm_messages", { p_thread: id, p_before: before ?? null, p_limit: 60 })).data ?? [];
export const dmSet = (id: string, p: { pinned?: boolean; muted?: boolean; clear?: boolean }) => call("dm_set", { p_thread: id, p_pinned: p.pinned ?? null, p_muted: p.muted ?? null, p_clear: !!p.clear });

// ---------- groups
export const groupMessages = async (id: string, before?: string) => (await call<ChatMsg[]>("group_messages2", { p_group: id, p_before: before ?? null, p_limit: 60 })).data ?? [];

// ---------- either kind of chat
export type Scope = "dm" | "group";
export function sendMessage(scope: Scope, id: string, kind: MsgKind, body: string, meta: Record<string, unknown> = {}, reply?: string | null) {
  return scope === "dm"
    ? call<ChatMsg>("send_dm", { p_thread: id, p_kind: kind, p_body: body, p_meta: meta, p_reply: reply ?? null })
    : call<ChatMsg>("send_group2", { p_group: id, p_kind: kind, p_body: body, p_meta: meta, p_reply: reply ?? null });
}
export function deleteMessage(scope: Scope, id: string, everyone: boolean) {
  return scope === "dm" ? call("dm_delete", { p_message: id, p_everyone: everyone }) : call("group_delete2", { p_message: id, p_everyone: everyone });
}

/** Upload a photo, voice note or file into a chat. Returns the private storage path. */
export async function uploadChatMedia(scope: Scope, id: string, file: Blob, name: string): Promise<{ path?: string; error?: string }> {
  try {
    const r = await fetch("/api/chat/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, id, name, size: file.size, type: file.type }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: j.error === "too_large" ? "That file is over 25 MB" : "Couldn't upload" };
    const up = await sb().storage.from("chat-media").uploadToSignedUrl(j.path, j.token, file, { contentType: file.type || "application/octet-stream" });
    return up.error ? { error: "Couldn't upload" } : { path: j.path as string };
  } catch { return { error: "Couldn't upload. Check your connection." }; }
}
const urlCache = new Map<string, { url: string; at: number }>();
/** A short-lived link to a chat photo/voice/file (checked against chat membership on the server). */
export async function chatMediaUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path);
  if (hit && Date.now() - hit.at < 4 * 60_000) return hit.url;
  try {
    const r = await fetch(`/api/chat/media?path=${encodeURIComponent(path)}`);
    if (!r.ok) return null;
    const { url } = await r.json();
    urlCache.set(path, { url, at: Date.now() });
    return url as string;
  } catch { return null; }
}

// ---------- money
export const hasPin = async () => (await call<boolean>("has_wallet_pin")).data === true;
export const setPin = async (pin: string, old?: string) => (await call<{ ok: boolean; error?: string }>("set_wallet_pin", { p_pin: pin, p_old: old ?? null })).data ?? { ok: false, error: "failed" };
export async function sendMoney(thread: string, amount: number, note: string, pin: string) {
  return (await call<{ ok: boolean; error?: string; max?: number; left?: number; message?: ChatMsg }>("send_money", { p_thread: thread, p_amount: amount, p_note: note, p_pin: pin })).data ?? { ok: false, error: "failed" };
}
export async function createGiveaway(scope: Scope, target: string, p: { kind: "money" | "airtime"; total: number; count: number; mode: "random" | "equal"; note: string }, pin: string) {
  return (await call<{ ok: boolean; error?: string; max?: number; left?: number; id?: string; message?: ChatMsg }>("create_giveaway", {
    p_scope: scope, p_target: target, p_kind: p.kind, p_total: p.total, p_count: p.count, p_mode: p.mode, p_note: p.note, p_pin: pin,
  })).data ?? { ok: false, error: "failed" };
}
export const claimGiveaway = async (id: string) => (await call<{ ok: boolean; error?: string; amount?: number }>("claim_giveaway", { p_id: id })).data ?? { ok: false, error: "failed" };
export const giveawayInfo = async (id: string) => (await call<GiveawayInfo>("giveaway_info", { p_id: id })).data;
export async function claimAirtime(id: string, phone: string, network: string): Promise<{ ok: boolean; error?: string; amount?: number }> {
  try {
    const r = await fetch("/api/chat/airtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, phone, network }) });
    return await r.json();
  } catch { return { ok: false, error: "network" }; }
}

/** Plain-English reasons for money errors. */
export function moneyError(e?: string, extra?: { max?: number; left?: number }): string {
  const n = (x?: number) => `₦${Number(x ?? 0).toLocaleString()}`;
  switch (e) {
    case "wrong": return "Wrong PIN. Try again.";
    case "locked": return "Too many wrong PINs. Your wallet is locked for 30 minutes.";
    case "no_pin": return "Set a wallet PIN first.";
    case "insufficient": return "Not enough in your wallet. Top up first.";
    case "too_small": return "That amount is too small.";
    case "too_big": return `The most you can send at once is ${n(extra?.max)}.`;
    case "daily_limit": return `Daily limit reached. You can still send ${n(extra?.left)} today.`;
    case "bad_count": return `You can make at most ${extra?.max ?? 0} packets here.`;
    case "uneven": return "For equal shares, the total must divide evenly.";
    case "airtime_off": return "Airtime giveaways switch on soon.";
    case "airtime_amount": return "Each airtime share must be between ₦50 and ₦2,000.";
    case "claimed": return "You already opened this one.";
    case "own": return "This one is for the other person.";
    case "expired": return "This giveaway has expired. Unclaimed money went back to the sender.";
    case "gone": return "Too late! It's all been claimed.";
    case "bad_phone": return "Check the phone number and network.";
    default: return "Something went wrong. Try again.";
  }
}

// ---------- verified accounts
export const searchOfficials = async (q: string) => (await call<(OAccount & { followers: number; following: boolean })[]>("search_officials", { p_q: q })).data ?? [];
export const officialProfile = async (key: string) => (await call<OAProfile>("official_profile", { p_key: key })).data;
export const followOfficial = (id: string, on: boolean) => call("follow_official", { p_oa: id, p_on: on });
export const oaChat = (id: string) => call<{ account: OAccount; following: boolean; pinned: boolean; muted: boolean; messages: OAMsg[] }>("oa_chat", { p_oa: id });
export const oaSend = (id: string, body: string) => call<{ account: OAccount; following: boolean; pinned: boolean; muted: boolean; messages: OAMsg[] }>("oa_send", { p_oa: id, p_body: body });
export const oaMenuTap = (id: string, label: string) => call<{ account: OAccount; following: boolean; pinned: boolean; muted: boolean; messages: OAMsg[] }>("oa_menu_tap", { p_oa: id, p_label: label });
export const oaSet = (id: string, p: { pinned?: boolean; muted?: boolean }) => call("oa_set", { p_oa: id, p_pinned: p.pinned ?? null, p_muted: p.muted ?? null });
export const oaPost = async (id: string) => (await call<OAPostCard & { body: string | null; link_url: string | null; account: OAccount; following: boolean }>("oa_post", { p_id: id })).data;

// ---------- running a verified account
export interface OAManaged extends OAccount { role: "owner" | "admin"; followers: number; unread: number }
export interface OAAdminInfo extends OAccount {
  welcome: string | null; auto_reply: string | null; keywords: { k: string; reply: string }[]; status: string; role: "owner" | "admin"; followers: number;
  admins: (ChatPerson & { role: string })[]; posts_today: number; posts_daily: number;
}
export interface OAInboxRow { user: ChatPerson; last_at: string; last: string; unread: number; window_open: boolean; window_ends: string | null }
export const myManagedOfficials = async () => (await call<OAManaged[]>("my_managed_officials")).data ?? [];
export const oaAdminInfo = (id: string) => call<OAAdminInfo>("oa_admin_info", { p_oa: id });
export const oaInbox = async (id: string) => (await call<OAInboxRow[]>("oa_inbox", { p_oa: id })).data ?? [];
export const oaConversation = (id: string, user: string) => call<{ user: ChatPerson; messages: OAMsg[]; window_open: boolean; window_ends: string | null }>("oa_conversation", { p_oa: id, p_user: user });
export const oaReply = (id: string, user: string, body: string) => call<{ user: ChatPerson; messages: OAMsg[]; window_open: boolean; window_ends: string | null }>("oa_reply", { p_oa: id, p_user: user, p_body: body });
export const oaPublish = (id: string, p: { kind: "article" | "video"; title: string; summary: string; body: string; cover: string | null; video: string | null; link: string }) =>
  call<{ post: OAPostCard; delivered: number }>("oa_publish", { p_oa: id, p_kind: p.kind, p_title: p.title, p_summary: p.summary, p_body: p.body, p_cover: p.cover, p_video: p.video, p_link: p.link });
export const oaDeletePost = (id: string) => call("oa_delete_post", { p_id: id });
export const oaUpdate = (id: string, p: Record<string, unknown>) => call<OAAdminInfo>("oa_update", { p_oa: id, p });
export const oaAddAdmin = (id: string, handle: string) => call("oa_add_admin", { p_oa: id, p_handle: handle });
export const oaRemoveAdmin = (id: string, user: string) => call("oa_remove_admin", { p_oa: id, p_user: user });
export const applyOfficial = (p: Record<string, string>) => call<string>("apply_official", { p });
export const myOfficialApplications = async () => (await call<{ id: string; name: string; status: string; created_at: string; oa_id: string | null }[]>("my_official_applications")).data ?? [];

/** Upload a logo, cover photo or video for a verified account. Returns its public link. */
export async function uploadOfficialMedia(oa: string, file: File): Promise<{ url?: string; error?: string }> {
  try {
    const r = await fetch("/api/official/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oa, name: file.name, size: file.size, type: file.type }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: j.error === "too_large" ? "That file is over 50 MB" : "Couldn't upload" };
    const up = await sb().storage.from("official-media").uploadToSignedUrl(j.path, j.token, file, { contentType: file.type || "application/octet-stream" });
    return up.error ? { error: "Couldn't upload" } : { url: j.url as string };
  } catch { return { error: "Couldn't upload. Check your connection." }; }
}

// ---------- shared helpers
export const clock = (t: string) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
/** WeChat-style list time: today shows the time, this week the weekday, older the date. */
export function listTime(t: string | null | undefined): string {
  if (!t) return "";
  const d = new Date(t), now = new Date();
  if (d.toDateString() === now.toDateString()) return clock(t);
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 2 && new Date(now.getTime() - 86_400_000).toDateString() === d.toDateString()) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "2-digit" });
}

/** Forwarding a photo, voice note or file: the server copies it into the other chat's folder. */
export async function forwardMedia(path: string, scope: Scope, id: string): Promise<string | null> {
  try {
    const r = await fetch("/api/chat/media", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: path, scope, id }) });
    if (!r.ok) return null;
    return (await r.json()).path as string;
  } catch { return null; }
}
/** Your own sticker images (kept in stickers/<you>/). */
export async function uploadSticker(file: Blob): Promise<{ path?: string; error?: string }> {
  try {
    const r = await fetch("/api/chat/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "sticker", id: "me", name: "sticker.png", size: file.size, type: file.type }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: "Couldn't add the sticker" };
    const up = await sb().storage.from("chat-media").uploadToSignedUrl(j.path, j.token, file, { contentType: file.type || "image/png" });
    return up.error ? { error: "Couldn't add the sticker" } : { path: j.path as string };
  } catch { return { error: "Couldn't add the sticker" }; }
}

// ---------- people: friends, remarks, privacy
export interface ContactInfo extends ChatPerson {
  display_name: string; remark: string | null; school: string | null; region: string; level: string | null; program: string | null; bio: string | null;
  is_me: boolean; is_friend: boolean; thread: string | null; prefs: { chats_only: boolean; hide_my_posts: boolean; hide_their_posts: boolean };
  moments: string[]; moments_count: number; videos: { id: string; title: string; youtube_id: string | null; video_path: string | null }[];
}
export const contactInfo = async (id: string) => (await call<ContactInfo>("contact_info", { p_user: id })).data;
export const setContactPrefs = (id: string, p: { chatsOnly?: boolean; hideMine?: boolean; hideTheirs?: boolean; remark?: string }) =>
  call("set_contact_prefs", { p_user: id, p_chats_only: p.chatsOnly ?? null, p_hide_my: p.hideMine ?? null, p_hide_their: p.hideTheirs ?? null, p_remark: p.remark ?? null });

// ---------- Moments
export interface Moment {
  id: string; author: ChatPerson; body: string; images: string[]; location: string | null; created_at: string; mine: boolean; liked: boolean;
  likes: { id: string; name: string }[]; comments: { id: string; mine: boolean; body: string; created_at: string; user: { id: string; name: string }; reply_to: { id: string; name: string } | null }[];
}
export const momentsFeed = async (before?: string) => (await call<Moment[]>("moments_feed", { p_before: before ?? null })).data ?? [];
export const userMoments = async (user: string, before?: string) => (await call<Moment[]>("user_moments", { p_user: user, p_before: before ?? null })).data ?? [];
export const momentsHeader = async (user?: string) => (await call<{ person: ChatPerson; cover: string | null; can_see: boolean }>("moments_header", { p_user: user ?? null })).data;
export const postMoment = (body: string, images: string[], location: string | null) => call<Moment>("post_moment", { p_body: body, p_images: images, p_location: location });
export const deleteMoment = (id: string) => call("delete_moment", { p_id: id });
export const likeMoment = (id: string, on: boolean) => call<Moment>("like_moment", { p_id: id, p_on: on });
export const commentMoment = (id: string, body: string, replyTo?: string | null) => call<Moment>("comment_moment", { p_id: id, p_body: body, p_reply_to: replyTo ?? null });
export const deleteMomentComment = (id: string) => call("delete_moment_comment", { p_id: id });
export const setMomentsCover = (path: string) => call("set_moments_cover", { p_path: path });
export async function uploadMomentPhoto(file: Blob): Promise<{ path?: string; error?: string }> {
  try {
    const r = await fetch("/api/moments/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: file.size, type: file.type }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: j.error === "too_large" ? "That photo is too big" : "Couldn't upload" };
    const up = await sb().storage.from("moments").uploadToSignedUrl(j.path, j.token, file, { contentType: file.type || "image/jpeg" });
    return up.error ? { error: "Couldn't upload" } : { path: j.path as string };
  } catch { return { error: "Couldn't upload. Check your connection." }; }
}
const momentUrls = new Map<string, { url: string; at: number }>();
export async function momentMediaUrl(path: string): Promise<string | null> {
  const hit = momentUrls.get(path);
  if (hit && Date.now() - hit.at < 4 * 60_000) return hit.url;
  try {
    const r = await fetch(`/api/moments/media?path=${encodeURIComponent(path)}`);
    if (!r.ok) return null;
    const { url } = await r.json();
    momentUrls.set(path, { url, at: Date.now() });
    return url as string;
  } catch { return null; }
}

// ---------- Discover
export type ArticleCard = OAPostCard & { account: OAccount; following?: boolean };
export const topStories = async (before?: string) => (await call<ArticleCard[]>("top_stories", { p_before: before ?? null })).data ?? [];
export const searchAll = async (q: string) => (await call<{ people: (ChatPerson & { school: string | null; is_friend: boolean })[]; accounts: OAccount[]; articles: ArticleCard[] }>("search_all", { p_q: q })).data ?? { people: [], accounts: [], articles: [] };
export const peopleAtSchool = async () => (await call<(ChatPerson & { school: string | null; program: string | null; level: string | null; is_friend: boolean })[]>("people_at_school")).data ?? [];
export const shake = async () => (await call<(ChatPerson & { school: string | null; is_friend: boolean }) | null>("shake")).data;
