// Bump this version whenever you deploy changes, so users get fresh files.
const VERSION = "v4";
const STATIC_CACHE = `rentables-static-${VERSION}`;
const RUNTIME_CACHE = `rentables-runtime-${VERSION}`;

const PRECACHE = [
  "./",
  "index.html",
  "front2.html",
  "sign_in2.html",
  "sign_up.html",
  "listing.html",
  "profile2.html",
  "snake.html",
  "tank.html",
  "PS5.html",
  "Cube.html",
  "guitar.html",
  "offline.html",
  "rentables.css",
  "register-sw.js",
  "manifest.json",
  "background.png",
  "icon-192-v2.png",
  "icon-512-v2.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      // One missing file should not stop the whole install
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Pages: network first, fall back to cache, then the offline page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(async () =>
          (await caches.match(req, { ignoreSearch: true })) ||
          (await caches.match("offline.html"))
        )
    );
    return;
  }

  // Everything else (CSS, images, fonts, scripts): serve cached copy, refresh in background
  const cacheName = url.origin === self.location.origin ? STATIC_CACHE : RUNTIME_CACHE;
  event.respondWith(
    caches.open(cacheName).then(async cache => {
      const cached = await cache.match(req);
      const refresh = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
