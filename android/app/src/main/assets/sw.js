// Zero望月明工作台 — Service Worker 离线缓存壳
// 缓存应用外壳，优先走网络以保证微信/浏览器永远拿到最新版本。
const CACHE_NAME = 'zwm-todo-v16';
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
  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      // 导航请求/页面：网络优先，失败才回缓存，保证更新即时生效
      if (isNavigation) {
        return fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function () {
          return cached || caches.match('./index.html');
        });
      }
      // 静态资源：先缓存后网络，离线也能用
      return cached || fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
