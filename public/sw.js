/* CourtConnect service worker — static caching + offline digital passes. */

const VERSION = "courtconnect-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const RSC_CACHE = `${VERSION}-rsc`;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // A missing optional asset must not block installation.
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CACHE_PAGE") {
    const urls = Array.isArray(data.urls) ? data.urls : [data.url];
    const assets = Array.isArray(data.assets) ? data.assets : [];

    event.waitUntil(cachePagesAndAssets(urls, assets));
  }
});

async function cachePagesAndAssets(urls, assets) {
  const pageCache = await caches.open(PAGE_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  const discoveredAssets = new Set();

  await Promise.all(
    urls.filter(Boolean).map(async (url) => {
      try {
        const request = new Request(url, {
          credentials: "same-origin",
          headers: { Accept: "text/html" },
        });
        const response = await fetch(request);

        if (!response.ok) {
          return;
        }

        // Read the asset references before the response body is cached. This
        // lets a pass page that has never been opened cold-start offline with
        // its own route chunk, not just the HTML shell.
        const html = await response.clone().text();
        await putInCache(pageCache, url, response);

        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
          const assetUrl = match[1];

          if (
            assetUrl.startsWith("/_next/") ||
            assetUrl.startsWith("/icons/")
          ) {
            discoveredAssets.add(assetUrl);
          }
        }
      } catch {
        // Offline caching is best-effort.
      }
    }),
  );

  const allAssets = new Set([...assets.filter(Boolean), ...discoveredAssets]);

  await Promise.all(
    [...allAssets].map(async (url) => {
      try {
        const response = await fetch(url, {
          credentials: "same-origin",
        });
        if (response.ok) {
          await putInCache(staticCache, url, response);
        }
      } catch {
        // A missing chunk should not stop the pass from being cached.
      }
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // App navigations: cache the rendered page so confirmed passes survive
  // offline. Network is always preferred when the device is online.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Next.js client-side navigation payloads. Only pass/bookings payloads are
  // cached; checkout and venue responses stay network-only.
  if (
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1"
  ) {
    event.respondWith(
      isPassPage(url) ? networkFirst(request, RSC_CACHE) : fetch(request),
    );
    return;
  }

  // Immutable build assets and icons.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Fonts, images, and manifest are cheap to serve stale while revalidating.
  if (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/)
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

function isPassPage(url) {
  return (
    url.pathname === "/my-bookings" ||
    url.pathname.startsWith("/booking/success/")
  );
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const cacheable = isPassPage(url);
  const cache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);

    if (cacheable && response.ok) {
      await putInCache(cache, request, response.clone());
    }

    return response;
  } catch {
    if (cacheable) {
      const cached = await cache.match(request, { ignoreVary: true });

      if (cached) {
        return cached;
      }

      if (url.pathname.startsWith("/booking/success/")) {
        const bookings = await cache.match("/my-bookings", { ignoreVary: true });

        if (bookings) {
          return bookings;
        }
      }
    }

    const offline = await caches.match("/offline.html");
    return offline || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await putInCache(cache, request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request, { ignoreVary: true });
    return cached || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { ignoreVary: true });

  if (cached) {
    return cached;
  }

  const cache = await caches.open(cacheName);
  const response = await fetch(request);

  if (response.ok) {
    await putInCache(cache, request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        void putInCache(cache, request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

async function putInCache(cache, request, response) {
  try {
    await cache.put(request, response);
  } catch {
    // Cache writes are best-effort; never break a live response.
  }
}
