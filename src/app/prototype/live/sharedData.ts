"use client";

// Real backend for Study persistence and Shared Courses. Courses/notes/files/recordings now live
// in Supabase (not just localStorage), keyed by real UUIDs -- this is what lets a shared course's
// files actually be openable by its members (RLS grants read access to course_files/notes/
// recordings/storage objects for anyone in shared_course_members, see the migration this shipped
// with). Every function here is a thin, typed wrapper so store.tsx stays readable; nothing here
// throws -- failures are swallowed (sync is best-effort/background) except where the caller needs
// the result (e.g. the new course id).
import { createClient } from "@/lib/supabase";

export interface RemoteSharedCourse {
  id: string; source_course_id: string; owner_id: string; school: string | null;
  field: string; description: string; learner_count: number; published: boolean; created_at: string;
  price_ngn: number; course_code: string | null; course_name: string | null;
  courses?: { code: string; name: string } | null;
}
export interface RemoteNote { id: string; course_id: string; title: string; body: string; category: string | null; created_at: string }
export interface RemoteFile { id: string; course_id: string; name: string; kind: string; storage_path: string | null; category: string | null; created_at: string }
export type ShareItem = { item_type: "note" | "file" | "recording"; item_id: string };
export interface RemoteRec { id: string; course_id: string; name: string; duration_seconds: number; storage_path: string | null; transcript: string | null; created_at: string }

// ---------------- course / note / file / recording sync (private, per-owner) ----------------

/** Upserts by id so the remote course row's id always matches the local course's id -- local
 * course ids are real UUIDs (minted at creation), so this is the only id either side ever needs;
 * no separate id-mapping field. Safe to call again on a course that's already synced (e.g. a
 * second share after unsharing). */
export async function createRemoteCourse(id: string, userId: string, code: string, name: string, color: string): Promise<string | null> {
  const sb = createClient();
  const { error } = await sb.from("courses").upsert({ id, user_id: userId, code, name, color });
  if (error) { console.error("createRemoteCourse failed", error.message); return null; }
  return id;
}

/** Upserts by id (same reasoning as createRemoteCourse) so the local note id is the only id
 * needed -- deleteRemoteNote can then just target it directly. */
export async function createRemoteNote(id: string, courseId: string, userId: string, title: string, body: string, category?: string) {
  const { error } = await createClient().from("notes").upsert({ id, course_id: courseId, user_id: userId, title, body, category: category ?? null });
  if (error) console.error("createRemoteNote failed", error.message);
}
export async function deleteRemoteNote(noteId: string) {
  await createClient().from("notes").delete().eq("id", noteId);
}

export async function createRemoteFile(courseId: string, userId: string, name: string, kind: string, storagePath: string, category?: string) {
  const { error } = await createClient().from("course_files").insert({ course_id: courseId, user_id: userId, name, kind, storage_path: storagePath, category: category ?? null });
  if (error) console.error("createRemoteFile failed", error.message);
}
export async function deleteRemoteFile(storagePath: string) {
  await createClient().from("course_files").delete().eq("storage_path", storagePath);
}

export async function createRemoteRecording(courseId: string, userId: string, name: string, durationSeconds: number, storagePath: string) {
  const { error } = await createClient().from("recordings").insert({ course_id: courseId, user_id: userId, name, duration_seconds: durationSeconds, storage_path: storagePath, status: "ready" });
  if (error) console.error("createRemoteRecording failed", error.message);
}
export async function updateRemoteRecordingTranscript(storagePath: string, transcript: string) {
  await createClient().from("recordings").update({ transcript }).eq("storage_path", storagePath);
}
export async function deleteRemoteRecording(storagePath: string) {
  await createClient().from("recordings").delete().eq("storage_path", storagePath);
}

type SyncCourse = {
  id: string; code: string; name: string; color: string;
  notes: { id: string; title: string; body: string; category?: string }[];
  files: { name: string; kind: string; storagePath?: string; category?: string }[];
  recs: { name: string; dur: number; storagePath?: string }[];
};

/** Pushes the course and all its notes/uploaded files/recordings to Supabase (safe to repeat --
 * files and recordings already there are matched by storage path, not re-inserted), then returns
 * the remote ids of files/recordings by storage path. Local file/recording ids are short and
 * don't match the remote rows (only notes share ids), so this map is how a picked local item
 * becomes a shared_course_items row. */
export async function syncCourseForSharing(c: SyncCourse, userId: string): Promise<{ fileIdByPath: Record<string, string>; recIdByPath: Record<string, string> }> {
  const sb = createClient();
  await createRemoteCourse(c.id, userId, c.code, c.name, c.color);
  if (c.notes.length) {
    const { error } = await sb.from("notes").upsert(c.notes.map((n) => ({ id: n.id, course_id: c.id, user_id: userId, title: n.title, body: n.body, category: n.category ?? null })));
    if (error) console.error("note sync failed", error.message);
  }
  const [ef, er] = await Promise.all([
    sb.from("course_files").select("storage_path").eq("course_id", c.id),
    sb.from("recordings").select("storage_path").eq("course_id", c.id),
  ]);
  const haveF = new Set((ef.data ?? []).map((r) => r.storage_path as string));
  const haveR = new Set((er.data ?? []).map((r) => r.storage_path as string));
  const newF = c.files.filter((f) => f.storagePath && !haveF.has(f.storagePath));
  const newR = c.recs.filter((r) => r.storagePath && !haveR.has(r.storagePath));
  await Promise.all([
    newF.length ? sb.from("course_files").insert(newF.map((f) => ({ course_id: c.id, user_id: userId, name: f.name, kind: f.kind, storage_path: f.storagePath, category: f.category ?? null }))) : null,
    newR.length ? sb.from("recordings").insert(newR.map((r) => ({ course_id: c.id, user_id: userId, name: r.name, duration_seconds: r.dur, storage_path: r.storagePath, status: "ready" }))) : null,
  ]);
  const [af, ar] = await Promise.all([
    sb.from("course_files").select("id,storage_path").eq("course_id", c.id),
    sb.from("recordings").select("id,storage_path").eq("course_id", c.id),
  ]);
  return {
    fileIdByPath: Object.fromEntries((af.data ?? []).map((r) => [r.storage_path as string, r.id as string])),
    recIdByPath: Object.fromEntries((ar.data ?? []).map((r) => [r.storage_path as string, r.id as string])),
  };
}

/** Replaces the full set of items a shared listing includes. */
export async function setSharedItems(sharedId: string, items: ShareItem[]): Promise<string | null> {
  const sb = createClient();
  const { error: delErr } = await sb.from("shared_course_items").delete().eq("shared_id", sharedId);
  if (delErr) return delErr.message;
  if (!items.length) return null;
  const { error } = await sb.from("shared_course_items").insert(items.map((i) => ({ shared_id: sharedId, ...i })));
  return error ? error.message : null;
}
export async function getSharedItems(sharedId: string): Promise<ShareItem[]> {
  const { data } = await createClient().from("shared_course_items").select("item_type,item_id").eq("shared_id", sharedId);
  return (data ?? []) as ShareItem[];
}
export async function updateSharedSettings(sharedId: string, priceNgn: number, audience: string, audienceValue: string | null, courseCode: string, courseName: string): Promise<string | null> {
  const { error } = await createClient().from("shared_courses").update({ price_ngn: priceNgn, audience, audience_value: audienceValue, course_code: courseCode, course_name: courseName }).eq("id", sharedId);
  return error ? error.message : null;
}

/** Joins a shared course -- free ones just add membership, paid ones charge the buyer's wallet
 * first (90% goes to the owner). Returns the raw error code ("insufficient_funds" etc) or null. */
export async function buySharedCourse(sharedId: string): Promise<string | null> {
  const { error } = await createClient().rpc("buy_shared_course", { p_shared: sharedId });
  return error ? error.message.replace(/^.*?exception:\s*/i, "") : null;
}

/** Read-only fetch of another course's content -- works for the owner, and (once RLS is applied)
 * for anyone who has joined a shared_courses row wrapping that course. Members only get back the
 * items the owner picked for the listing (RLS filters the rest). */
export async function fetchRemoteCourseContent(remoteCourseId: string): Promise<{ notes: RemoteNote[]; files: RemoteFile[]; recs: RemoteRec[] }> {
  const sb = createClient();
  const [notes, files, recs] = await Promise.all([
    sb.from("notes").select("*").eq("course_id", remoteCourseId).order("created_at", { ascending: false }),
    sb.from("course_files").select("*").eq("course_id", remoteCourseId).order("created_at", { ascending: false }),
    sb.from("recordings").select("*").eq("course_id", remoteCourseId).order("created_at", { ascending: false }),
  ]);
  return { notes: (notes.data ?? []) as RemoteNote[], files: (files.data ?? []) as RemoteFile[], recs: (recs.data ?? []) as RemoteRec[] };
}

// ---------------- Shared Courses (real, multi-user) ----------------

export async function listPublishedShared(): Promise<RemoteSharedCourse[]> {
  const sb = createClient();
  const { data, error } = await sb.from("shared_courses").select("*, courses(code,name)").eq("published", true).order("created_at", { ascending: false }).limit(200);
  if (error) { console.error("listPublishedShared failed", error.message); return []; }
  return data as unknown as RemoteSharedCourse[];
}

/** List + member/file/message counts in one round trip (3 extra batched queries, grouped
 * client-side) -- the Explore list shows these counts per card, not just in the detail view. */
export type ItemCounts = { notes: number; files: number; recs: number };

export async function listPublishedSharedWithCounts(): Promise<{
  list: RemoteSharedCourse[];
  membersBySharedId: Record<string, string[]>;
  fileNamesByCourseId: Record<string, string[]>;
  messageCountBySharedId: Record<string, number>;
  itemCountsBySharedId: Record<string, ItemCounts>;
}> {
  const list = await listPublishedShared();
  if (list.length === 0) return { list, membersBySharedId: {}, fileNamesByCourseId: {}, messageCountBySharedId: {}, itemCountsBySharedId: {} };
  const sb = createClient();
  const sharedIds = list.map((s) => s.id);
  const courseIds = list.map((s) => s.source_course_id);
  const [members, files, messages, items] = await Promise.all([
    sb.from("shared_course_members").select("shared_id,user_id").in("shared_id", sharedIds),
    sb.from("course_files").select("course_id,name").in("course_id", courseIds),
    sb.from("shared_course_messages").select("shared_id").in("shared_id", sharedIds),
    sb.from("shared_course_items").select("shared_id,item_type").in("shared_id", sharedIds),
  ]);
  const membersBySharedId: Record<string, string[]> = {};
  for (const r of members.data ?? []) (membersBySharedId[r.shared_id as string] ??= []).push(r.user_id as string);
  const fileNamesByCourseId: Record<string, string[]> = {};
  for (const r of files.data ?? []) (fileNamesByCourseId[r.course_id as string] ??= []).push(r.name as string);
  const messageCountBySharedId: Record<string, number> = {};
  for (const r of messages.data ?? []) messageCountBySharedId[r.shared_id as string] = (messageCountBySharedId[r.shared_id as string] ?? 0) + 1;
  // Item counts come from the public listing table, so buyers see "4 notes, 2 files" before paying
  // even though the content itself stays locked until they do.
  const itemCountsBySharedId: Record<string, ItemCounts> = {};
  for (const r of items.data ?? []) {
    const c = (itemCountsBySharedId[r.shared_id as string] ??= { notes: 0, files: 0, recs: 0 });
    if (r.item_type === "note") c.notes++; else if (r.item_type === "file") c.files++; else c.recs++;
  }
  return { list, membersBySharedId, fileNamesByCourseId, messageCountBySharedId, itemCountsBySharedId };
}

export async function publishSharedCourse(sourceCourseId: string, ownerId: string, school: string, field: string, description: string, priceNgn = 0, audience = "everyone", audienceValue: string | null = null, courseCode = "", courseName = ""): Promise<string | null> {
  const sb = createClient();
  const { data, error } = await sb.from("shared_courses").insert({ source_course_id: sourceCourseId, owner_id: ownerId, school: school || null, field, description, published: true, price_ngn: priceNgn, audience, audience_value: audienceValue, course_code: courseCode, course_name: courseName }).select("id").single();
  if (error) { console.error("publishSharedCourse failed", error.message); return null; }
  return data.id as string;
}

export async function listMembers(sharedId: string): Promise<string[]> {
  const { data } = await createClient().from("shared_course_members").select("user_id").eq("shared_id", sharedId);
  return (data ?? []).map((r) => r.user_id as string);
}

export async function leaveSharedCourse(sharedId: string, userId: string) {
  await createClient().from("shared_course_members").delete().eq("shared_id", sharedId).eq("user_id", userId);
}

export interface RemoteMsg { id: string; shared_id: string; author_id: string; body: string; created_at: string }
export async function listMessages(sharedId: string): Promise<RemoteMsg[]> {
  const { data } = await createClient().from("shared_course_messages").select("*").eq("shared_id", sharedId).order("created_at", { ascending: true });
  return (data ?? []) as RemoteMsg[];
}
export async function postMessage(sharedId: string, authorId: string, body: string): Promise<string | null> {
  const { error } = await createClient().from("shared_course_messages").insert({ shared_id: sharedId, author_id: authorId, body });
  return error ? error.message : null;
}
