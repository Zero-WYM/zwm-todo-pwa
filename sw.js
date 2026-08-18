// Zero望月明工作台 — Service Worker 离线缓存壳
// 缓存应用外壳，首次加载后支持离线以 standalone 模式运行。
const CACHE_NAME = 'zwm-todo-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      // cache-first，回退 network，再回退首页
      return cached ||
        fetch(event.request).catch(function () {
          return caches.match('./index.html');
        });
    })
  );
});
