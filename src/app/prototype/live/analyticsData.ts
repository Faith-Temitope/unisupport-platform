"use client";

// Real admin analytics -- every number here comes from an existing, already-populated table
// (topups, ai_usage, help_sessions, jobs, writers, profiles, app_events) via direct queries, never
// placeholder/sample data. app_events is the one new table this ships with (see the SKILL/README
// note in the console page for the one-time migration it needs) -- it's what actually answers
// "visits/actives/hours", which nothing else in the schema tracks.
import { createClient } from "@/lib/supabase";

export interface Overview {
  totalUsers: number; studentCount: number; writerCount: number; supportCount: number; adminCount: number;
  signups7d: number; signups30d: number;
  revenueNgn30d: number; aiSpendNgn30d: number; helpSpendNgn30d: number;
  activeSessions: { desk: number; fee: number; writer: number };
  jobsByStage: { active: number; review: number; closed: number };
}

export async function fetchOverview(): Promise<Overview> {
  const sb = createClient();
  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [profiles, signups7, signups30, topups30, aiUsage30, helpSessions, jobs] = await Promise.all([
    sb.from("profiles").select("role", { count: "exact", head: false }),
    sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7),
    sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
    sb.from("topups").select("amount,status").gte("created_at", since30),
    sb.from("ai_usage").select("charged_ngn").gte("created_at", since30),
    sb.from("help_sessions").select("phase"),
    sb.from("jobs").select("stage"),
  ]);
  const roles = (profiles.data ?? []) as { role: string }[];
  const count = (r: string) => roles.filter((x) => x.role === r).length;
  const revenueNgn30d = (topups30.data ?? []).filter((t) => t.status === "success" || t.status === "paid").reduce((a, t) => a + Number(t.amount ?? 0), 0);
  const aiSpendNgn30d = (aiUsage30.data ?? []).reduce((a, r) => a + Number(r.charged_ngn ?? 0), 0);
  const phases = (helpSessions.data ?? []) as { phase: string }[];
  const stages = (jobs.data ?? []) as { stage: string }[];
  return {
    totalUsers: roles.length, studentCount: count("student"), writerCount: count("writer"), supportCount: count("support"), adminCount: count("admin"),
    signups7d: signups7.count ?? 0, signups30d: signups30.count ?? 0,
    revenueNgn30d, aiSpendNgn30d, helpSpendNgn30d: 0,
    activeSessions: { desk: phases.filter((p) => p.phase === "desk").length, fee: phases.filter((p) => p.phase === "fee").length, writer: phases.filter((p) => p.phase === "writer").length },
    jobsByStage: { active: stages.filter((s) => s.stage === "active").length, review: stages.filter((s) => s.stage === "review").length, closed: stages.filter((s) => s.stage === "closed").length },
  };
}

export interface DaySeries { date: string; value: number }
/** Generic "sum this numeric column, grouped by day, for the last N days" -- used for both
 * revenue (topups.amount) and AI spend (ai_usage.charged_ngn) so there's one grouping helper
 * instead of two near-identical ones. */
export async function fetchDailySum(table: "topups" | "ai_usage", column: string, days: number): Promise<DaySeries[]> {
  const sb = createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const sel: string = `created_at,${column}`;
  const { data } = await sb.from(table).select(sel).gte("created_at", since);
  const byDay = new Map<string, number>();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const day = new Date(row.created_at as string).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(row[column] ?? 0));
  }
  const out: DaySeries[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    out.push({ date: d, value: byDay.get(d) ?? 0 });
  }
  return out;
}

export interface TopWriter { id: string; display_name: string; specialization: string | null; rating: number | null; completed_count: number; earnings: number; is_available: boolean }
export async function fetchTopWriters(): Promise<TopWriter[]> {
  const { data } = await createClient().from("writers").select("*").order("earnings", { ascending: false }).limit(20);
  return (data ?? []) as TopWriter[];
}

export interface SchoolBreakdown { institution_id: string | null; name: string; count: number }
export async function fetchSchoolBreakdown(): Promise<SchoolBreakdown[]> {
  const sb = createClient();
  const [profiles, institutions] = await Promise.all([
    sb.from("profiles").select("institution_id").eq("role", "student"),
    sb.from("institutions").select("id,name"),
  ]);
  const names = Object.fromEntries(((institutions.data ?? []) as { id: string; name: string }[]).map((i) => [i.id, i.name]));
  const counts = new Map<string, number>();
  for (const p of (profiles.data ?? []) as { institution_id: string | null }[]) {
    const key = p.institution_id ?? "none";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([id, count]) => ({ institution_id: id === "none" ? null : id, name: id === "none" ? "No school set" : names[id] ?? "Unknown", count })).sort((a, b) => b.count - a.count);
}

// ---------------- real visit/activity tracking (app_events) ----------------
// Needs one migration (new table) before these do anything -- see the console page's note.

export type EventKind = "session_start" | "heartbeat" | "page_view" | "download";
export async function logEvent(kind: EventKind, path?: string) {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    await sb.from("app_events").insert({ user_id: user?.id ?? null, kind, path: path ?? null });
  } catch { /* analytics must never break the app */ }
}

export interface ActivityOverview { dau: number; wau: number; totalHeartbeats30d: number; estHours30d: number; downloads30d: number; topPages: { path: string; views: number }[] }
export async function fetchActivityOverview(): Promise<ActivityOverview> {
  const sb = createClient();
  const since1 = new Date(Date.now() - 1 * 86400_000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [dauRows, wauRows, heartbeats, pageViews, downloads] = await Promise.all([
    sb.from("app_events").select("user_id").gte("created_at", since1).not("user_id", "is", null),
    sb.from("app_events").select("user_id").gte("created_at", since7).not("user_id", "is", null),
    sb.from("app_events").select("id", { count: "exact", head: true }).eq("kind", "heartbeat").gte("created_at", since30),
    sb.from("app_events").select("path").eq("kind", "page_view").gte("created_at", since30),
    sb.from("app_events").select("id", { count: "exact", head: true }).eq("kind", "download").gte("created_at", since30),
  ]);
  const dau = new Set(((dauRows.data ?? []) as { user_id: string }[]).map((r) => r.user_id)).size;
  const wau = new Set(((wauRows.data ?? []) as { user_id: string }[]).map((r) => r.user_id)).size;
  const totalHeartbeats30d = heartbeats.count ?? 0;
  const pageCounts = new Map<string, number>();
  for (const r of (pageViews.data ?? []) as { path: string | null }[]) { const p = r.path ?? "(unknown)"; pageCounts.set(p, (pageCounts.get(p) ?? 0) + 1); }
  const topPages = Array.from(pageCounts.entries()).map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 10);
  // one heartbeat every 60s while the app is open and in the foreground (see the session-tracking effect in store.tsx)
  return { dau, wau, totalHeartbeats30d, estHours30d: Math.round((totalHeartbeats30d * 60) / 3600), downloads30d: downloads.count ?? 0, topPages };
}
