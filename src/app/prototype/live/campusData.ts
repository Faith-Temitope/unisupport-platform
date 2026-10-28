// The class timetable (course chats' events and weekly class slots) and Campus Updates / Campus Gist.
import { createClient } from "@/lib/supabase";
import type { ChatPerson } from "./chatData";

const errOf = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await createClient().rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? errOf(error) || "failed" : null };
}

// ---------- Timetable
export type EventKind = "class" | "test" | "exam" | "deadline" | "cancelled" | "other";
export interface CourseEvent { id: string; group_id: string; course: string; kind: EventKind; title: string; starts_at: string; ends_at: string | null; venue: string | null; note: string | null; by: ChatPerson; can_manage: boolean }
export interface CourseSlot { id: string; group_id: string; course: string; weekday: number; starts: string; ends: string; kind: "lecture" | "tutorial" | "practical" | "lab"; venue: string | null; can_manage: boolean }
export interface Schedule { events: CourseEvent[]; slots: CourseSlot[]; manage: { group_id: string; course: string }[] }

export const mySchedule = async (from: Date, to: Date) => (await call<Schedule>("my_schedule", { p_from: from.toISOString(), p_to: to.toISOString() })).data ?? { events: [], slots: [], manage: [] };
export const addCourseEvent = (group: string, e: { kind: EventKind; title: string; starts: Date; ends?: Date | null; venue?: string | null; note?: string | null }) =>
  call<CourseEvent>("add_course_event", { p_group: group, p_kind: e.kind, p_title: e.title, p_starts: e.starts.toISOString(), p_ends: e.ends?.toISOString() ?? null, p_venue: e.venue ?? null, p_note: e.note ?? null });
export const deleteCourseEvent = (id: string) => call("delete_course_event", { p_id: id });
export const addCourseSlot = (group: string, s: { weekday: number; starts: string; ends: string; kind: CourseSlot["kind"]; venue?: string | null }) =>
  call<string>("add_course_slot", { p_group: group, p_weekday: s.weekday, p_starts: s.starts, p_ends: s.ends, p_kind: s.kind, p_venue: s.venue ?? null });
export const deleteCourseSlot = (id: string) => call("delete_course_slot", { p_id: id });

/** Does a rep's message look like it announces something with a time (worth asking Birdie to read)? */
export const looksLikeEvent = (t: string) =>
  /\b(test|exam|quiz|class|lecture|tutorial|practical|lab|deadline|submi(t|ssion)|assignment|presentation|seminar|cancel+ed|no class|postponed|moved)\b/i.test(t)
  && /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|\btoday\b|\btomorrow\b|\bnext week\b|\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}(st|nd|rd|th)\b|\b\d{1,2}[/-]\d{1,2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(t);

// ---------- Campus Updates and Campus Gist
export interface CampusPost {
  id: string; kind: "update" | "gist"; title: string | null; body: string; important: boolean; created_at: string;
  author: ChatPerson | null; account: { id: string; handle: string; name: string; logo_url: string | null; color: string } | null;
  likes: number; liked: boolean; comments: number; mine: boolean;
}
export interface CampusComment { id: string; body: string; created_at: string; user: ChatPerson; mine: boolean }
export const campusFeed = async (kind: "update" | "gist", before?: string) => (await call<CampusPost[]>("campus_feed", { p_kind: kind, p_before: before ?? null })).data ?? [];
export const postCampusUpdate = (oa: string, title: string, body: string, important: boolean) => call<CampusPost>("post_campus_update", { p_oa: oa, p_title: title || null, p_body: body, p_important: important });
export const postGist = (title: string, body: string) => call<CampusPost>("post_gist", { p_title: title || null, p_body: body });
export const deleteCampusPost = (id: string) => call("delete_campus_post", { p_id: id });
export const campusLike = (id: string, on: boolean) => call<CampusPost>("campus_like", { p_id: id, p_on: on });
export const campusComment = (id: string, body: string) => call<CampusPost>("campus_comment", { p_id: id, p_body: body });
export const campusComments = async (id: string) => (await call<CampusComment[]>("campus_comments", { p_id: id })).data ?? [];
export const deleteCampusComment = (id: string) => call("delete_campus_comment", { p_id: id });
