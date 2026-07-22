// Nhịp Ngày — Service Worker v4
// Cache strategy: shell + dynamic caching, offline fallback

const CACHE_NAME = "nhip-ngay-shell-v4";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];

// ── Install: cache shell ──────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // addAll fails if ANY request fails — use individual adds with catch
        Promise.allSettled(SHELL.map((url) => cache.add(url).catch(() => {})))
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for assets, network-first for navigation ───────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (e.g. Mistral API, Google Fonts CDN during build)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fallback to cached "/"
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() =>
          caches.match("/").then(
            (cached) =>
              cached ||
              new Response("<h1>Nhịp Ngày</h1><p>Đang ngoại tuyến…</p>", {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              })
          )
        )
    );
    return;
  }

  // Static assets (_next/static for Next.js, /assets/ for Vite/vinext, fonts, images)
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico|webp|avif)$/);

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Everything else (API routes, etc.): network-first, no cache fallback
  event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
});
