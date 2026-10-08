"use client";

import { useSyncExternalStore } from "react";

// "Save offline": the student picks videos and course files to keep on the phone. They're stored in
// the browser's Cache Storage ("birdie-offline", the same cache the service worker reads), keyed by
// a stable id so signed links that change every time still find the saved copy.
const CACHE = "birdie-offline";
const INDEX = "birdie-offline-index";
type Entry = { key: string; name: string; kind: "video" | "file"; size: number; at: number };

const keyUrl = (key: string) => `${location.origin}/__offline/${encodeURIComponent(key)}`;
function readIndex(): Record<string, Entry> { try { return JSON.parse(localStorage.getItem(INDEX) ?? "{}"); } catch { return {}; } }
function writeIndex(i: Record<string, Entry>) { try { localStorage.setItem(INDEX, JSON.stringify(i)); } catch { /* full */ } emit(); }

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let snapshot = typeof window === "undefined" ? "{}" : (localStorage.getItem(INDEX) ?? "{}");
function subscribe(f: () => void) { subs.add(f); return () => subs.delete(f); }
subs.add(() => { snapshot = localStorage.getItem(INDEX) ?? "{}"; });

/** Download something and keep it on this phone. Returns an error message or null. */
export async function saveOffline(key: string, url: string, name: string, kind: Entry["kind"]): Promise<string | null> {
  if (!("caches" in window)) return "This browser can't save files offline";
  try {
    const res = await fetch(url);
    if (!res.ok) return "Couldn't download it";
    const blob = await res.blob();
    await (await caches.open(CACHE)).put(keyUrl(key), new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream", "Content-Length": String(blob.size) } }));
    writeIndex({ ...readIndex(), [key]: { key, name, kind, size: blob.size, at: Date.now() } });
    return null;
  } catch { return "Couldn't download it. Check your connection."; }
}

/** A local link to the saved copy, or null if it isn't saved. */
export async function offlineUrl(key: string): Promise<string | null> {
  if (!("caches" in window) || !readIndex()[key]) return null;
  const hit = await (await caches.open(CACHE)).match(keyUrl(key));
  return hit ? URL.createObjectURL(await hit.blob()) : null;
}

export async function removeOffline(key: string) {
  if ("caches" in window) await (await caches.open(CACHE)).delete(keyUrl(key));
  const i = readIndex(); delete i[key]; writeIndex(i);
}

/** Everything saved offline (re-renders when it changes). */
export function useOfflineIndex(): Record<string, Entry> {
  const raw = useSyncExternalStore(subscribe, () => snapshot, () => "{}");
  try { return JSON.parse(raw); } catch { return {}; }
}

/** Whether the phone has internet right now. */
export function useOnline(): boolean {
  return useSyncExternalStore((f) => { window.addEventListener("online", f); window.addEventListener("offline", f); return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); }; }, () => navigator.onLine, () => true);
}

export const fmtMB = (n: number) => `${(n / 1048576).toFixed(n > 10485760 ? 0 : 1)} MB`;
