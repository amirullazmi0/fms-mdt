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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
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
