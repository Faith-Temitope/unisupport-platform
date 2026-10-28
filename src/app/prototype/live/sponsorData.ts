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
    const [{ data, error }, paid] = await Promise.all([
      createClient().rpc("my_placements", { p_kind: kind, p_surface: surface ?? null }),
      campaignAds(kind, surface),
    ]);
    // Businesses' own campaigns (bought in Birdie for Business) come first, then any older listings.
    const list = [...paid, ...(error ? [] : ((data ?? []) as Placement[]))];
    cache.set(key, { at: Date.now(), data: list });
    inflight.delete(key);
    return list;
  })();
  inflight.set(key, p);
  return p;
}

export function logPlacement(id: string, kind: "view" | "click") {
  if (campaignIds.has(id)) { void createClient().rpc("ad_event", { p_id: id, p_kind: kind }); return; }
  void createClient().rpc("log_placement_event", { p_placement: id, p_kind: kind });
}

// ---------- Business campaigns, shaped like placements so every existing slot can show them.
// Which ad format fills which slot: Moments and feeds, Courses cards, under videos, Campus Deals.
const SLOT: Partial<Record<string, "moment" | "course_card" | "channels" | "featured">> = {
  "card:explore": "moment", "card:study": "course_card", "card:courses": "course_card", "card:help": "course_card", "card:birdie": "course_card",
  "card:watch": "course_card", "card:video_end": "channels", "deal:": "featured", "campus:": "featured",
};
const campaignIds = new Set<string>();
type CampaignAd = { id: string; format: string; title: string; body: string | null; cta_label: string; target: string; target_id: string | null; url: string | null; media_kind: MediaKind; media_url: string | null; sponsor_name: string; business: { id: string; biz_type: string; logo_url: string | null; address: string | null; biz_category: string | null } };
/** Where tapping a campaign goes: the business's shop or page, one of its jobs, or its website. */
export const campaignLink = (a: Pick<CampaignAd, "target" | "target_id" | "url" | "business">) =>
  a.target === "url" ? a.url : a.target === "opportunity" && a.target_id ? `/prototype?job=${a.target_id}` : a.business.biz_type === "campus_business" ? `/prototype?store=${a.business.id}` : `/prototype?tab=chats&oa=${a.business.id}`;
async function campaignAds(kind: PlacementKind, surface?: Surface): Promise<Placement[]> {
  const slot = SLOT[`${kind}:${surface ?? ""}`];
  if (!slot) return [];
  const { data, error } = await createClient().rpc("ads_for_me", { p_surface: slot, p_limit: slot === "featured" ? 4 : 2 });
  if (error) return [];
  return ((data ?? []) as CampaignAd[]).map((a) => {
    campaignIds.add(a.id);
    return { id: a.id, sponsor_name: a.sponsor_name, kind, surface: surface ?? null, category: a.business.biz_category, title: a.title, body: a.body ?? "", cta_label: a.cta_label,
      url: campaignLink(a), image_url: a.business.logo_url, discount_code: null, company: a.sponsor_name, location: a.business.address, deadline: null, media_kind: a.media_kind, media_url: a.media_url };
  });
}

export type BusinessApp = {
  id: string; kind: "business" | "suggestion" | "internship"; deadline?: string | null; business_name: string; category: string | null; school: string | null; location: string | null; phone: string | null;
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
