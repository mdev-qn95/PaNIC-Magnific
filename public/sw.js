/* Service worker PaNIC-Magnific — cache app shell + static assets (CLAUDE.md mục 9).
   Dữ liệu lễ offline nằm ở IndexedDB (lib/offline.ts), không cache API Supabase ở đây. */
const CACHE = 'magnific-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Static Next.js assets + fonts: cache-first (bất biến theo build)
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(woff2?|ttf|png|svg|ico|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Điều hướng trang: network-first, fallback bản đã cache (mất mạng vẫn mở được app)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) ?? (await caches.match('/')) ?? Response.error()),
    );
  }
});
