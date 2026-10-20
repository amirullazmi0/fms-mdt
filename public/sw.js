// Service worker MDT: simpan "kulit" aplikasi (HTML, JS, CSS, ikon) supaya tablet tetap bisa
// membuka MDT di pit / tongkang tanpa sinyal. Data API nggak pernah di-cache di sini; status
// operator disimpan di IndexedDB oleh aplikasi dan dikirim saat ada sinyal.
const CACHE = 'mdt-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'mdt-tiles-v1').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Tile peta OSM: yang pernah dibuka disimpan, jadi area front / dumping tetap kelihatan tanpa sinyal.
const TILES = 'mdt-tiles-v1';
const MAX_TILES = 300;

async function cacheTile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') {
      await cache.put(req, res.clone());
      const keys = await cache.keys();
      if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => cache.delete(k)));
    }
    return res;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === 'GET' && url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(cacheTile(req));
    return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // API backend: langsung ke jaringan

  // Halaman: coba jaringan dulu (dapat versi terbaru), kalau gagal pakai yang tersimpan.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  // Aset build (nama file pakai hash, nggak berubah): ambil dari cache dulu.
  if (url.pathname.startsWith('/_next/static/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
      ),
    );
  }
});
