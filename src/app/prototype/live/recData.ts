"use client";

import { createClient } from "@/lib/supabase";

/** What a student did with a post. These feed the For you ranking (see for_you in the database). */
export type PostEventKind = "view" | "watch" | "like" | "unlike" | "save" | "share" | "search" | "skip" | "comment";

export async function logPostEvent(postId: string | null, kind: PostEventKind, opts: { seconds?: number; term?: string } = {}) {
  try {
    await createClient().rpc("log_post_event", { p_post: postId, p_kind: kind, p_seconds: opts.seconds != null ? Math.round(opts.seconds) : null, p_term: opts.term ?? null });
  } catch { /* ranking signal only; never block the UI */ }
}

export interface Ranked { id: string; reason: string | null }

/** A page of the For you feed, best first. `seed` keeps paging stable for one visit. */
export async function fetchForYou(seed: string, offset: number, limit = 24): Promise<Ranked[]> {
  const { data, error } = await createClient().rpc("for_you", { p_seed: seed, p_limit: limit, p_offset: offset });
  if (error || !data) return [];
  return (data as { id: string; reason: string | null }[]).map((r) => ({ id: r.id, reason: r.reason }));
}

/** Topic chips: the student's own interests first, then the most common topics on Birdie. */
export async function fetchMyTopics(limit = 12): Promise<{ topic: string; mine: boolean }[]> {
  const { data, error } = await createClient().rpc("my_topics", { p_limit: limit });
  if (error || !data) return [];
  return (data as { topic: string; mine: boolean }[]).map((r) => ({ topic: r.topic, mine: r.mine }));
}
