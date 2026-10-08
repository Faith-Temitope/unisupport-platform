// Birdie service worker: lets the app open with no internet.
//  - Pages: network first (always fresh when online), falling back to the last copy saved here.
//  - Built JS/CSS (/_next/static, hashed so they never change): cache first.
//  - Icons, fonts, images on our domain: served from cache, refreshed in the background.
//  - Videos and files the student chose to "save offline" live in their own cache (birdie-offline),
//    written by the app itself; we only ever read from it here.
//  - Anything else (Supabase data, payments, AI) is never cached: it needs the internet.
const SHELL = "birdie-shell-v2";
const STATIC = "birdie-static-v2";
const OFFLINE = "birdie-offline";
const START = ["/prototype", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(START.map((u) => c.add(u).catch(() => undefined)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, STATIC, OFFLINE].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const offlinePage = () => new Response(
  "<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:system-ui;padding:40px;text-align:center;color:#1E1428;background:#FAF7FD'><h2>You're offline</h2><p>Open Birdie once while connected and it will work offline after that.</p></body>",
  { status: 503, headers: { "Content-Type": "text/html" } });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Saved-offline media (any origin): cache first.
  e.respondWith((async () => {
    const saved = await caches.open(OFFLINE).then((c) => c.match(req, { ignoreSearch: true }));
    if (saved) return saved;

    if (url.origin !== self.location.origin) return fetch(req);
    if (url.pathname.startsWith("/api/")) return fetch(req);

    if (url.pathname.startsWith("/_next/static/")) {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
      return res;
    }

    if (req.mode === "navigate") {
      try {
        const res = await fetch(req);
        if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
        return res;
      } catch {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match("/prototype")) || offlinePage();
      }
    }

    // Other same-origin files (icons, images, fonts, Next data): stale while revalidate.
    const hit = await caches.match(req);
    const net = fetch(req).then((res) => { if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone())); return res; }).catch(() => undefined);
    return hit || (await net) || new Response("", { status: 504 });
  })());
});
