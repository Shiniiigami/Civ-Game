// Crown Waters service worker — offline support + installable PWA.
// HTML is network-first so new versions arrive when online; icons/manifest are cache-first.
const CACHE = "crownwaters-v17-3";
const STATIC = ["./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png", "./favicon-16.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isDoc = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (isDoc) {
    // Network-first: always try to get the latest game, fall back to cache when offline.
    e.respondWith(
      fetch(e.request)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html")))
    );
  } else {
    // Cache-first for static assets (icons, manifest).
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(r => {
        const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r;
      }))
    );
  }
});
