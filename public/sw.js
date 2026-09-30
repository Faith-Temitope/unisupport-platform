// Minimal service worker: just enough for installability and a friendlier offline state.
// It does not try to cache the app shell aggressively — Birdie's real data lives in Supabase and
// a stale cached bundle would be worse than a clear "you're offline" message.
const VERSION = "birdie-sw-v1";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then((hit) => hit ?? new Response("You're offline. Reconnect to keep using Birdie.", { status: 503, headers: { "Content-Type": "text/plain" } }))
    )
  );
});
