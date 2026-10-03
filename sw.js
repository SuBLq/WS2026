'use strict';
const VERSION = '83832c838718';
const SHELL_CACHE = 'wos-guide-shell-' + VERSION;
const RUNTIME_CACHE = 'wos-guide-runtime-' + VERSION;
const SAVED_CACHE = 'wos-guide-saved-v1';
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./assets/icons/favicon.svg", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/css/shell.css?v=9113c68b9c", "./assets/css/content.css?v=759843efec", "./assets/css/interface.css?v=3ecc262c14", "./assets/js/theme.js?v=4299827f73", "./assets/js/search.js?v=abc984bc6b", "./assets/js/library.js?v=09cf33f0c5", "./assets/js/tables.js?v=4c7277d582", "./assets/js/offline.js?v=b87e685010", "./assets/js/app.js?v=f7850ce940", "./assets/js/catalog-data.js?v=a180d1d8cb"];
const scope = new URL('./', self.location.href);
const scoped = url => url.origin === scope.origin && url.pathname.startsWith(scope.pathname);

self.addEventListener('install', event => {
  // Do not replace an active page until the user chooses to update.
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith('wos-guide-site-') || key.startsWith('wos-guide-shell-') || key.startsWith('wos-guide-runtime-')) && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
async function cached(request) {
  for (const name of [SHELL_CACHE, RUNTIME_CACHE, SAVED_CACHE]) {
    const cache = await caches.open(name);
    const match = await cache.match(request) || await cache.match(request, { ignoreSearch: true });
    if (match) return match;
  }
}
async function store(request, response) {
  if (!response.ok || response.type === 'opaque') return;
  const cache = await caches.open(RUNTIME_CACHE); await cache.put(request, response.clone());
  const keys = await cache.keys(); await Promise.all(keys.slice(0, Math.max(0, keys.length - 100)).map(key => cache.delete(key)));
}
async function fromNetwork(request) { const response = await fetch(request); await store(request, response).catch(() => {}); return response; }
async function navigation(request) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 4000);
  try { const response = await fetch(request, { signal: controller.signal }); await store(request, response).catch(() => {}); return response; }
  catch (_) {
    const response = await cached(request); if (response) return response;
    return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Нет соединения</title><body style="font:16px/1.6 system-ui;padding:24px;background:#edf4f7;color:#18384b"><h1>Этот гайд ещё не сохранён</h1><p>Подключитесь к сети или откройте материал, который посещали раньше.</p><a href="' + scope.pathname + 'index.html#library">Вернуться в справочник</a></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } finally { clearTimeout(timer); }
}
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || !scoped(url)) return;
  if (request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  // Hashed scripts/styles are immutable. Never substitute a different version online.
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE), shell = await caches.open(SHELL_CACHE);
    const exact = await shell.match(request) || await cache.match(request);
    if (exact) return exact;
    const saved = await (await caches.open(SAVED_CACHE)).match(request);
    if (saved) return saved;
    try { return await fromNetwork(request); }
    catch (_) { return await cached(request) || Response.error(); }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE') { self.skipWaiting(); return; }
  if (event.data?.type !== 'SAVE_PAGE') return;
  event.waitUntil((async () => {
    try {
      const urls = [...new Set([event.data.url, ...(event.data.resources || [])])].map(value => new URL(value, scope)).filter(scoped);
      if (!urls.length || urls.length > 250) throw new Error('resources');
      const cache = await caches.open(SAVED_CACHE);
      // Fetch before committing: a failed download must never be labelled complete.
      const responses = await Promise.all(urls.map(async url => { const response = await fetch(url.href); if (!response.ok) throw new Error('network'); return [url.href, response]; }));
      await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
      event.ports[0]?.postMessage({ ok: true });
    } catch (error) { event.ports[0]?.postMessage({ ok: false, error: String(error) }); }
  })());
});
