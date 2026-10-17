/**
 * Famart Clinic EMR service worker.
 *
 * Strategy:
 * - Navigations: network-first, falling back to the cached app shell so the EMR
 *   opens (offline screen/UI shell) without connectivity. Clinical data itself
 *   always comes from Supabase and is never served from cache.
 * - Hashed build assets: cache-first (immutable filenames).
 * - Other same-origin GETs and Google Fonts: stale-while-revalidate.
 * - Supabase requests (auth, REST, realtime) are never intercepted.
 *
 * Register with `?dev=1` during local development: the worker then installs an
 * empty fetch handler (so the app stays installable) without caching anything.
 */
const VERSION = 'v1';
const IS_DEV = new URL(self.location.href).searchParams.get('dev') === '1';

const SHELL_CACHE = `famart-shell-${VERSION}`;
const RUNTIME_CACHE = `famart-runtime-${VERSION}`;
const FONT_CACHE = `famart-fonts-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/famart-logo.png',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Famart Clinic EMR · Offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #0f172a;
        color: #e2e8f0;
        font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
      }
      .card {
        max-width: 380px;
        background: #ffffff;
        color: #0f172a;
        border-radius: 16px;
        padding: 28px 24px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
      }
      img { width: 56px; height: 56px; object-fit: contain; }
      h1 { font-size: 18px; margin: 14px 0 6px; }
      p { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 18px; }
      button {
        border: 0;
        border-radius: 10px;
        background: #2563eb;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 18px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <img src="/famart-logo.png" alt="Famart Clinic" />
      <h1>You're offline</h1>
      <p>Famart EMR needs a connection to load clinical records. Reconnect to the clinic network or mobile data and try again.</p>
      <button onclick="location.reload()">Retry</button>
    </div>
  </body>
</html>`;

self.addEventListener('install', (event) => {
  if (IS_DEV) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        SHELL_ASSETS.map(async (asset) => {
          try {
            await cache.add(new Request(asset, { cache: 'reload' }));
          } catch {
            // A single missing asset must not abort the installation.
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE];
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('famart-') && !keep.includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

const isSupabaseRequest = (hostname) =>
  hostname.endsWith('supabase.co') ||
  hostname.endsWith('supabase.in') ||
  hostname.endsWith('supabase.net');

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      try {
        await cache.put('/index.html', response.clone());
      } catch {
        // Ignore uncacheable responses.
      }
    }
    return response;
  } catch {
    const cached = (await cache.match('/index.html')) || (await cache.match('/'));
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
    try {
      await cache.put(request, response.clone());
    } catch {
      // Ignore uncacheable responses.
    }
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
        try {
          await cache.put(request, response.clone());
        } catch {
          // Ignore uncacheable responses.
        }
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (IS_DEV || request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Live clinical data must never be served from cache.
  if (isSupabaseRequest(url.hostname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      url.pathname.startsWith('/assets/')
        ? cacheFirst(request, RUNTIME_CACHE)
        : staleWhileRevalidate(request, RUNTIME_CACHE)
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
  }
});
