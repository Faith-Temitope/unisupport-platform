"use client";

// Live Help data shared by the student app and the staff app. Everything is read through RLS and
// changed only through SECURITY DEFINER RPCs, so the same hook is safe for every role.
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

export interface HSession { id: string; student_id: string; mode: "mentor" | "full"; title: string; phase: "desk" | "fee" | "writer"; writer_id: string | null; desk_agent_id: string | null; fee_amount: number | null; fee_paid_at: string | null; past_writers: string[]; created_at: string; writers?: { display_name: string; specialization: string | null } | null }
export interface HMessage { id: string; session_id: string; sender_role: "student" | "desk" | "writer" | "system"; body: string; card: "fee" | "quote" | "delivery" | "close" | null; job_id: string | null; attachment_path: string | null; created_at: string }
export interface HJob { id: string; session_id: string; pages: number | null; deadline: string | null; quote_price: number | null; delivery_pages: number | null; delivery_price: number | null; delivery_paid_at: string | null; student_accepted_at: string | null; writer_accepted_at: string | null; stage: "active" | "review" | "closed"; review_due_at: string | null; rating: number | null }

export const DL_LABEL: Record<string, string> = { "24h": "24 hours", "3d": "3 days", "1w": "1 week" };
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const rpcError = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

/** Sessions the signed-in user can see, plus messages and jobs of the open one; refreshes on any change. */
export function useHelpData(activeId: string | null, enabled = true) {
  const [sessions, setSessions] = useState<HSession[]>([]);
  const [messages, setMessages] = useState<HMessage[]>([]);
  const [jobs, setJobs] = useState<HJob[]>([]);
  const [loading, setLoading] = useState(true);
  const active = useRef(activeId); active.current = activeId;

  const loadSessions = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("help_sessions").select("*, writers(display_name,specialization)").order("created_at", { ascending: false });
    setSessions((data ?? []) as unknown as HSession[]); setLoading(false);
  }, []);
  const loadActive = useCallback(async () => {
    const id = active.current; if (!id) { setMessages([]); setJobs([]); return; }
    const sb = createClient();
    const [m, j] = await Promise.all([
      sb.from("help_messages").select("*").eq("session_id", id).order("created_at", { ascending: true }),
      sb.from("jobs").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    ]);
    if (active.current === id) { setMessages((m.data ?? []) as HMessage[]); setJobs((j.data ?? []) as HJob[]); }
  }, []);
  const reload = useCallback(async () => { await Promise.all([loadSessions(), loadActive()]); }, [loadSessions, loadActive]);

  useEffect(() => { if (enabled) void loadSessions(); }, [enabled, loadSessions]);
  useEffect(() => { void loadActive(); }, [activeId, loadActive]);
  useEffect(() => {
    if (!enabled) return;
    const sb = createClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    const later = () => { clearTimeout(t); t = setTimeout(() => { void reload(); }, 150); };
    const ch = sb.channel("help-live-" + Math.random().toString(36).slice(2)).on("postgres_changes", { event: "*", schema: "public", table: "help_messages" }, later).on("postgres_changes", { event: "*", schema: "public", table: "help_sessions" }, later).on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, later).subscribe();
    const poll = setInterval(() => { void reload(); }, 4000); // realtime is the fast path; polling covers dropped sockets
    return () => { clearTimeout(t); clearInterval(poll); void sb.removeChannel(ch); };
  }, [enabled, reload]);
  return { sessions, messages, jobs, loading, reload };
}

export async function sendMessage(sessionId: string, role: "student" | "writer" | "desk", body: string, attachmentPath?: string) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return "Sign in again";
  const { error } = await sb.from("help_messages").insert({ session_id: sessionId, sender_id: user.id, sender_role: role, body, attachment_path: attachmentPath ?? null });
  return error ? rpcError(error) : null;
}

/** Upload a chat attachment; the storage policy only lets session members write under their session id. */
export async function uploadTo(bucket: "session-uploads" | "session-previews" | "session-deliverables", path: string, file: File) {
  const sb = createClient();
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
  return error ? error.message : null;
}
export async function signedUrl(bucket: string, path: string, download?: string) {
  const sb = createClient();
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 300, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
export async function listFolder(bucket: string, folder: string) {
  const sb = createClient();
  const { data } = await sb.storage.from(bucket).list(folder);
  return (data ?? []).filter((f) => f.name && f.id);
}
export const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(0, 80);

/** Open or download a signed URL without tripping popup blockers (they only allow window.open straight after a click). */
export function openUrl(url: string) { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noreferrer"; document.body.appendChild(a); a.click(); a.remove(); }
