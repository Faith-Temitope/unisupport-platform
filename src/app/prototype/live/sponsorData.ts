"use client";

// Sponsored placements (campus businesses, deals, internship/SIWES posts, sponsored cards). Students
// only get what's live and targeted at their school/region/country, via my_placements().
import { createClient } from "@/lib/supabase";

export type PlacementKind = "campus" | "deal" | "internship" | "card";
export type Surface = "birdie" | "video_end" | "explore" | "study" | "help" | "courses" | "watch";
export type MediaKind = "none" | "image" | "video" | "pdf";
export const CAMPUS_CATEGORIES = ["Food", "Printing", "Hostels", "Repairs", "Fashion & laundry", "Transport", "Data & gadgets", "Other"];
export const DEAL_CATEGORIES = ["Laptops & phones", "Data & airtime", "Food", "Courses & books", "Fashion", "Other"];

export interface Placement {
  id: string; sponsor_name: string; kind: PlacementKind; surface: Surface | null; category: string | null; title: string; body: string;
  cta_label: string; url: string | null; image_url: string | null; discount_code: string | null;
  company: string | null; location: string | null; deadline: string | null;
  /** A flyer/picture, a video or a PDF the sponsor sent. */
  media_kind?: MediaKind; media_url?: string | null;
}
export interface AdminPlacement extends Placement {
  sponsor_contact: string | null; countries: string[]; regions: string[]; schools: string[];
  starts_at: string; ends_at: string | null; active: boolean; priority: number; created_at: string;
  views: number; viewers: number; clicks: number; clickers: number;
}

const cache = new Map<string, { at: number; data: Placement[] }>();
const inflight = new Map<string, Promise<Placement[]>>();
const TTL = 5 * 60_000;

/** Cached for 5 minutes, and concurrent callers (e.g. every video card in the feed) share one request. */
export function fetchPlacements(kind: PlacementKind, surface?: Surface): Promise<Placement[]> {
  const key = `${kind}:${surface ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.data);
  const running = inflight.get(key);
  if (running) return running;
  const p = (async () => {
    const { data, error } = await createClient().rpc("my_placements", { p_kind: kind, p_surface: surface ?? null });
    const list = error ? [] : ((data ?? []) as Placement[]);
    cache.set(key, { at: Date.now(), data: list });
    inflight.delete(key);
    return list;
  })();
  inflight.set(key, p);
  return p;
}

export function logPlacement(id: string, kind: "view" | "click") {
  void createClient().rpc("log_placement_event", { p_placement: id, p_kind: kind });
}

export type BusinessApp = {
  id: string; kind: "business" | "suggestion"; business_name: string; category: string | null; school: string | null; location: string | null; phone: string | null;
  offer: string | null; discount_code: string | null; logo_url: string | null; website: string | null; contact_name: string | null; note: string | null;
  status: "new" | "contacted" | "approved" | "rejected"; placement_id: string | null; created_at: string; submitter: string | null;
};
/** Businesses (no account needed) and students' suggestions. Returns an error code or null. */
export async function submitBusiness(p: Partial<BusinessApp> & { kind: "business" | "suggestion" }): Promise<string | null> {
  const { error } = await createClient().rpc("submit_business", { p });
  return error ? error.message.replace(/^.*?exception:\s*/i, "") : null;
}
export async function adminListBusinessApps(): Promise<BusinessApp[]> {
  const { data } = await createClient().rpc("admin_list_business_apps");
  return (data ?? []) as BusinessApp[];
}
export async function adminSetBusinessApp(id: string, status: "contacted" | "approved" | "rejected"): Promise<string | null> {
  const { error } = await createClient().rpc("admin_set_business_app", { p_id: id, p_status: status });
  return error ? error.message.replace(/^.*?exception:\s*/i, "") : null;
}

export async function adminListPlacements(): Promise<AdminPlacement[]> {
  const { data } = await createClient().rpc("admin_list_placements");
  return (data ?? []) as AdminPlacement[];
}
export async function adminSavePlacement(p: Partial<AdminPlacement>): Promise<string | null> {
  const { error } = await createClient().rpc("admin_save_placement", { p });
  return error ? error.message.replace(/^.*?exception:\s*/i, "") : null;
}
export async function adminDeletePlacement(id: string): Promise<string | null> {
  const { error } = await createClient().rpc("admin_delete_placement", { p_id: id });
  return error ? error.message : null;
}
