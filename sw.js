const CACHE_NAME = 'miqat-cache-v2';
const ASSETS_TO_CACHE = [
  './index.html',
  'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Amiri+Quran&family=Readex+Pro:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase (Firestore and sign-in) must always go straight to the network.
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts.')) {
    return;
  }
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    return;
  }

  if (url.origin.includes('api.aladhan.com') || url.origin.includes('alquran.cloud') || url.origin.includes('mp3quran.net')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Own site files (index.html, firebase-config.js, admin.html): network first so
  // changes show up right away, cache only when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (event.request.method === 'GET' && response.ok) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }).catch(() => {})
  );
});
