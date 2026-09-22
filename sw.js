const CACHE_NAME = 'my-app-v1';

// Các tệp cần lưu cache dựa trên cấu trúc dự án của bạn
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.json'
];

// Cài đặt Service Worker và lưu trữ tài nguyên
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Dọn dẹp cache cũ khi nâng cấp
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Lấy dữ liệu từ cache khi offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});