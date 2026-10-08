"use client";

import { createClient } from "@/lib/supabase";

// Phone notifications. Once turned on, anything that lands in your Birdie notifications (messages,
// Unisupport replies, orders, comments, badges, your buddy's study nudge) also shows on the phone's
// notification bar with its normal sound, even when Birdie is closed.

export type PushState = "unsupported" | "default" | "granted" | "denied";

export function pushState(): PushState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission as PushState;
}

/** iPhones only allow notifications once Birdie is added to the Home Screen. */
export const needsHomeScreen = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.matchMedia("(display-mode: standalone)").matches);

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Ask permission, subscribe this phone and save it. Returns an error message or null. */
export async function enablePush(): Promise<string | null> {
  if (pushState() === "unsupported") return needsHomeScreen() ? "On iPhone, add Birdie to your Home Screen first (Share > Add to Home Screen), then turn this on." : "This browser can't show notifications.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "Notifications are blocked. Allow them for Birdie in your phone's settings." : "Notifications weren't allowed.";
  try {
    const r = await fetch("/api/push/key"); if (!r.ok) return "Notifications aren't set up yet.";
    const { key } = await r.json() as { key: string };
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await createClient().rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    return error ? "Couldn't turn notifications on. Try again." : null;
  } catch { return "Couldn't turn notifications on. Try again."; }
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await createClient().rpc("delete_push_subscription", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
  } catch { /* already off */ }
}

/** Is this phone subscribed right now? */
export async function isSubscribed(): Promise<boolean> {
  if (pushState() !== "granted") return false;
  try { return !!(await (await navigator.serviceWorker.ready).pushManager.getSubscription()); } catch { return false; }
}

/** A notification from inside the app (e.g. Birdie answered while you switched to another app). */
export async function localNotify(title: string, body: string, url: string) {
  if (typeof document === "undefined" || !document.hidden || pushState() !== "granted") return;
  try { await (await navigator.serviceWorker.ready).showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "birdie-local", data: { url } }); } catch { /* ignore */ }
}
