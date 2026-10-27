/* 你說我猜 · 离线缓存
 * 牌面文件名里带内容哈希，内容变了名字就变，所以可以放心地一直缓存：先看本机有没有，没有再下载。
 * 页面、脚本和牌的清单先走网络拿最新的，断网时才用本机存的版本。
 */
const CARDS = 'dm-cards-v1';
const CORE = 'dm-core-v1';
const KEEP = [CARDS, CORE];

// 装好时先存下页面、联机库、牌的清单和缩略拼图，断网也能打开
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const core = await caches.open(CORE);
    await core.addAll(['./', 'mqtt.min.js', 'cards/manifest.json']).catch(() => {});
    try {
      const res = await core.match('cards/manifest.json');
      const m = res && (await res.json());
      if (m && m.mini) await (await caches.open(CARDS)).add('cards/' + m.mini.file);
    } catch (err) { /* 没有照片牌时跳过 */ }
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const IMMUTABLE = /\/cards\/(?:[sl]\/[0-9a-f]{12}|mini-[0-9a-f]{10})\.webp$/;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (IMMUTABLE.test(url.pathname)) e.respondWith(cacheFirst(req));
  else if (url.pathname.endsWith('/mqtt.min.js')) e.respondWith(staleWhileRevalidate(req));
  else if (req.mode === 'navigate' || /\/(?:index\.html|manifest\.json|[^/]+\.js)$/.test(url.pathname) || url.pathname.endsWith('/')) e.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CARDS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CORE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CORE);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()).catch(() => {}); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}
