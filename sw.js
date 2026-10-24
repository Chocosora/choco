const CACHE_NAME = 'choco-prom-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
    if (event.data?.type !== 'CACHE_PAGE') return;
    event.waitUntil((async () => {
        try {
            const url = new URL(event.data.url);
            if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) throw new Error('허용되지 않은 주소입니다.');
            const response = await fetch(url.href, { cache: 'reload' });
            if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('text/html')) throw new Error('앱 화면을 저장하지 못했습니다.');
            const cache = await caches.open(CACHE_NAME);
            await cache.put(url.href, response);
            event.ports[0]?.postMessage({ ok: true });
        } catch (error) { event.ports[0]?.postMessage({ ok: false, error: error.message }); }
    })());
});
self.addEventListener('fetch', event => {
    if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const saved = await cache.match(event.request);
        if (!saved) return fetch(event.request);
        // Cached shell opens immediately even on a slow or disconnected network.
        event.waitUntil(fetch(event.request).then(response => {
            if (response.ok && !response.redirected && response.headers.get('content-type')?.includes('text/html')) return cache.put(event.request, response);
        }).catch(() => {}));
        return saved;
    })());
});
