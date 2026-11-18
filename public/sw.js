const CACHE_PREFIX = 'jurisplanner-cache-';
const CACHE_NAME = `${CACHE_PREFIX}__JURISPLANNER_BUILD_VERSION__`;
const REQUIRED_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

async function cacheAsset(cache, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not cache ${url}: ${response.status}`);
  if (new URL(response.url).origin !== self.location.origin) {
    throw new Error(`Refusing to cache an external resource: ${response.url}`);
  }
  await cache.put(url, response.clone());
  return response;
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const htmlResponse = await cacheAsset(cache, '/index.html');
  await cache.put('/', htmlResponse.clone());
  const html = await htmlResponse.text();
  const scriptAndStyleUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && /\.(?:js|css)$/.test(url.pathname))
    .map((url) => url.href);
  const requiredUrls = REQUIRED_ASSETS.map((url) => new URL(url, self.location.origin).href);
  const assets = [...new Set([...requiredUrls, ...scriptAndStyleUrls])];

  const responses = await Promise.all(
    assets.map(async (url) => ({ url, response: await cacheAsset(cache, url) })),
  );
  const fontUrls = (await Promise.all(
    responses
      .filter(({ url }) => /\.css$/.test(new URL(url).pathname))
      .map(async ({ url, response }) => {
        const css = await response.clone().text();
        return [...css.matchAll(/url\(([^)]+)\)/g)]
          .map((match) => match[1].trim().replace(/^["']|["']$/g, ''))
          .map((asset) => new URL(asset, url))
          .filter((asset) => asset.origin === self.location.origin)
          .map((asset) => asset.href);
      }),
  )).flat();

  await Promise.all([...new Set(fontUrls)].map((url) => cacheAsset(cache, url)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET'
    || request.destination === 'iframe'
    || url.origin !== self.location.origin
    || url.pathname === '/api'
    || url.pathname.startsWith('/api/')
  ) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedAsset = await cache.match(url.pathname, { ignoreVary: true });
      if (cachedAsset && request.mode !== 'navigate') return cachedAsset;

      try {
        const response = await fetch(request);
        if (
          response.ok
          && response.type !== 'opaque'
          && new URL(response.url).origin === self.location.origin
        ) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(url.pathname, { ignoreVary: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const cachedPage = await cache.match('/index.html', { ignoreVary: true });
          if (cachedPage) return cachedPage;
        }
        throw error;
      }
    })(),
  );
});
