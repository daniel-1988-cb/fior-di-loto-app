/**
 * Service worker Fior di Loto — offline graceful degrade.
 *
 * Strategia:
 * - NETWORK FIRST per tutto il dinamico (pages, API, server actions).
 *   Se offline → cache fallback. Se cache miss → pagina /offline.
 * - CACHE FIRST per asset immutabili statici (_next/static, icon-*, manifest).
 *
 * NB: le server action POST e le rotte /api/* NON vengono cachate —
 * offline il bot/checkout restano inattivi (corretto: sarebbe pericoloso
 * servire una transazione stale). Solo letture GET vanno in cache.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `fdl-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fdl-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
 "/manifest.json",
 "/icon-192.svg",
 "/icon-512.svg",
];

self.addEventListener("install", (event) => {
 event.waitUntil(
  caches
   .open(STATIC_CACHE)
   .then((cache) => cache.addAll(STATIC_ASSETS))
   .then(() => self.skipWaiting()),
 );
});

self.addEventListener("activate", (event) => {
 event.waitUntil(
  caches
   .keys()
   .then((keys) =>
    Promise.all(
     keys
      .filter((k) => k.startsWith("fdl-") && !k.endsWith(CACHE_VERSION))
      .map((k) => caches.delete(k)),
    ),
   )
   .then(() => self.clients.claim()),
 );
});

// Push notification handler
self.addEventListener("push", (event) => {
 let data = { title: "Fior di Loto", body: "Nuova notifica", url: "/agenda" };
 try {
  if (event.data) {
   const parsed = event.data.json();
   data = { ...data, ...parsed };
  }
 } catch {
  /* fallback to default */
 }
 event.waitUntil(
  self.registration.showNotification(data.title, {
   body: data.body,
   icon: "/icon-192.svg",
   badge: "/icon-192.svg",
   tag: data.tag,
   data: { url: data.url || "/agenda" },
   // iOS richiede requireInteraction=false
  }),
 );
});

// Click su notifica → apri l'app al path specificato
self.addEventListener("notificationclick", (event) => {
 event.notification.close();
 const url = event.notification.data?.url || "/agenda";
 event.waitUntil(
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
   // Se esiste già una tab aperta, focus + navigate
   for (const client of list) {
    if ("focus" in client) {
     client.focus();
     if ("navigate" in client) {
      client.navigate(url);
     }
     return;
    }
   }
   if (self.clients.openWindow) return self.clients.openWindow(url);
  }),
 );
});

self.addEventListener("fetch", (event) => {
 const { request } = event;

 // Solo GET: POST/PUT/DELETE devono passare via rete (server actions,
 // form submit, create/update/delete). Non cacheare.
 if (request.method !== "GET") return;

 const url = new URL(request.url);

 // Cross-origin (es. Supabase, Meta, Gemini) → non intercettare.
 if (url.origin !== self.location.origin) return;

 // Cache first per asset immutabili Next.js
 if (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname)) {
  event.respondWith(
   caches.match(request).then(
    (cached) =>
     cached ||
     fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
      return res;
     }),
   ),
  );
  return;
 }

 // Skip API routes — devono andare sempre live (webhook, cron, send, ecc)
 if (url.pathname.startsWith("/api/")) return;

 // Network first per pages dinamiche, fallback cache
 event.respondWith(
  fetch(request)
   .then((res) => {
    if (res.ok) {
     const copy = res.clone();
     caches.open(DYNAMIC_CACHE).then((c) => c.put(request, copy));
    }
    return res;
   })
   .catch(() =>
    caches.match(request).then(
     (cached) =>
      cached ||
      new Response(
       '<html><body style="font-family:system-ui;padding:40px;text-align:center"><h1>📶 Offline</h1><p>Riprova appena torni online. Le pagine già visitate restano accessibili dalla cache.</p></body></html>',
       {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 503,
       },
      ),
    ),
   ),
 );
});
