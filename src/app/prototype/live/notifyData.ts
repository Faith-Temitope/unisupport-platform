// The Notifications page, Birdie's own nudges (sent as real push notifications), and the public heart on Channels.
import { createClient } from "@/lib/supabase";
import type { ChatPerson } from "./chatData";

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const { data, error } = await createClient().rpc(fn, args);
  return error ? null : ((data as T) ?? null);
}

export interface ServerNotice { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string }
export const myNotifications = async (before?: string) => (await call<ServerNotice[]>("my_notifications", { p_before: before ?? null })) ?? [];
export const unreadNotifications = async () => (await call<number>("notifications_unread")) ?? 0;
export const markNotificationsRead = (id?: string) => call("mark_notifications_read", { p_id: id ?? null });
export const clearNotifications = () => call("clear_notifications");
/** A push to yourself (recommendations, badges, streaks). The server keeps it to 3 a day. */
export const notifySelf = async (title: string, body?: string, link?: string) => !!(await call<boolean>("notify_self", { p_title: title, p_body: body ?? null, p_link: link ?? null }));

export interface Hearts { hearts: number; hearted: boolean; friends: string[] }
export const heartPost = (post: string, on: boolean) => call("heart_post", { p_post: post, p_on: on });
export const postHeartsInfo = async (ids: string[]) => (ids.length ? await call<Record<string, Hearts>>("post_hearts_info", { p_posts: ids }) : null) ?? {};
export const friendsHeartsRecent = async () => (await call<{ friends: number; latest: ChatPerson | null }>("friends_hearts_recent")) ?? { friends: 0, latest: null };
