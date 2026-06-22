const CACHE_NAME = "finwise-v2";

const PRECACHE_URLS = ["/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, and API routes
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;
  if (url.pathname.startsWith("/api/")) return;

  // Never cache page HTML. Authenticated financial pages must always come
  // from the network so stale or user-specific content is not stored offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets (fonts, images, CSS, JS chunks)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|woff2?|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }
});
