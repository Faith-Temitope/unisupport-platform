"use client";

import { createClient } from "@/lib/supabase";

// Group chats (a department, a class, a study group). Everything goes through the group_* functions,
// which check membership on the server.

export interface Group { id: string; name: string; about: string | null; role: "owner" | "admin" | "member"; muted: boolean; invite_code: string | null; members: number; last: string | null; last_at: string | null; unread: number }
export interface GroupMsg { id: string; body: string; created_at: string; sender_id: string | null; mine: boolean; system: boolean; name: string; color: string }
export interface GroupMember { user_id: string; role: "owner" | "admin" | "member"; name: string; handle: string | null; color: string }

const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

export async function myGroups(): Promise<Group[]> { const { data } = await createClient().rpc("my_groups"); return (data ?? []) as Group[]; }
export async function createGroup(name: string, about: string): Promise<{ id?: string; code?: string; error?: string }> {
  const { data, error } = await createClient().rpc("create_group", { p_name: name, p_about: about || null });
  return error ? { error: msg(error) } : { id: (data as { id: string }).id, code: (data as { invite_code: string }).invite_code };
}
export async function joinGroup(code: string): Promise<{ id?: string; error?: string }> {
  const { data, error } = await createClient().rpc("join_group", { p_code: code });
  return error ? { error: msg(error) } : { id: data as string };
}
export async function groupPreview(code: string): Promise<{ id: string; name: string; about: string | null; members: number; joined: boolean } | null> {
  const { data } = await createClient().rpc("group_preview", { p_code: code }); return (data as never) ?? null;
}
export async function groupMessages(id: string): Promise<GroupMsg[]> { const { data } = await createClient().rpc("group_messages", { p_group: id }); return (data ?? []) as GroupMsg[]; }
export async function groupMembers(id: string): Promise<GroupMember[]> { const { data } = await createClient().rpc("group_members", { p_group: id }); return (data ?? []) as GroupMember[]; }
export async function sendGroupMessage(id: string, body: string): Promise<string | null> {
  const { error } = await createClient().rpc("send_group_message", { p_group: id, p_body: body });
  return error ? (msg(error) === "slow_down" ? "You're sending too fast. Wait a moment." : "Couldn't send") : null;
}
export async function groupAdd(id: string, userId: string): Promise<string | null> { const { error } = await createClient().rpc("group_add_member", { p_group: id, p_user: userId }); return error ? msg(error) : null; }
export async function groupLeave(id: string, userId?: string): Promise<string | null> { const { error } = await createClient().rpc("group_leave", { p_group: id, p_user: userId ?? null }); return error ? msg(error) : null; }
export async function groupUpdate(id: string, p: { name?: string; about?: string; newLink?: boolean; muted?: boolean; admin?: string }): Promise<{ code?: string; error?: string }> {
  const { data, error } = await createClient().rpc("group_update", { p_group: id, p_name: p.name ?? null, p_about: p.about ?? null, p_new_link: !!p.newLink, p_muted: p.muted ?? null, p_admin: p.admin ?? null });
  return error ? { error: msg(error) } : { code: (data as { invite_code: string }).invite_code };
}
export const groupLink = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/g/${code}`;
