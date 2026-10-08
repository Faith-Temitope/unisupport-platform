"use client";

// Course reps. Everything goes through security-definer functions (the tables have no client
// access at all): applying, linking to a rep by code, and reading your own rep status/earnings.
import { createClient } from "@/lib/supabase";

export type RepStatus = "pending" | "active" | "rejected" | "removed";
export interface RepInfo {
  status: RepStatus | null; code: string | null; students: number; earned: number; pct: number;
  by_source: Record<string, number>; pending_ai: number;
  linked_rep: { name: string; code: string; active: boolean } | null;
}
export interface AdminRep {
  user_id: string; status: RepStatus; code: string | null; note: string; applied_at: string; approved_at: string | null;
  name: string; email: string; school: string | null; program: string | null; students: number; earned: number;
}

const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

export async function fetchMyRep(): Promise<RepInfo | null> {
  const { data, error } = await createClient().rpc("my_rep");
  return error ? null : (data as RepInfo);
}
export async function applyRep(note: string): Promise<string | null> {
  const { error } = await createClient().rpc("apply_rep", { p_note: note });
  return error ? msg(error) : null;
}
export async function linkRep(code: string): Promise<{ name?: string; error?: string }> {
  const { data, error } = await createClient().rpc("link_rep", { p_code: code });
  return error ? { error: msg(error) } : { name: data as string };
}
export async function unlinkRep() { await createClient().rpc("unlink_rep"); }

export async function adminListReps(): Promise<AdminRep[]> {
  const { data } = await createClient().rpc("admin_list_reps");
  return (data ?? []) as AdminRep[];
}
export async function adminSetRep(userId: string, status: "active" | "rejected" | "removed"): Promise<string | null> {
  const { error } = await createClient().rpc("admin_set_rep", { p_user: userId, p_status: status });
  return error ? msg(error) : null;
}
