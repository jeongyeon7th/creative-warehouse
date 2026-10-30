/* 소재창고 서비스 워커
 *
 * 하는 일: 앱 화면 파일(HTML·CSS·JS·아이콘)을 Cache Storage에 보관해 오프라인에서도 앱을 연다.
 * 하지 않는 일: 사용자 기록을 다루지 않는다. 기록은 페이지가 IndexedDB(대체: localStorage)에 저장하며,
 *              이 파일은 그 저장소를 읽거나 지우지 않는다. 외부 주소로 요청을 보내지도 않는다.
 *
 * 배포 규칙: 앱 파일을 하나라도 바꿔 배포할 때는 아래 CACHE_VERSION을 반드시 올린다.
 *           그래야 사용자 기기에서 새 버전이 감지되고 ‘업데이트’ 안내가 나타난다.
 */
const CACHE_VERSION = 'v1.1.1';
const CACHE_PREFIX = 'creative-warehouse-app-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_FILES = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // cache: 'reload' — HTTP 캐시의 낡은 파일이 섞이지 않도록 서버에서 새로 받는다
    await cache.addAll(APP_FILES.map(u => new Request(u, { cache: 'reload' })));
    // 첫 설치일 때만 바로 활성화. 업데이트는 사용자가 ‘지금 업데이트’를 눌렀을 때(SKIP_WAITING) 적용한다.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // 이 앱이 만든 이전 버전의 ‘앱 파일’ 캐시만 지운다(IndexedDB 기록과는 무관)
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') self.skipWaiting();
  else if (msg.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage({ version: CACHE_VERSION });
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 다른 사이트 요청에는 관여하지 않음

  // 페이지 열기(#/… 경로 포함): 저장해 둔 index.html로 즉시 응답 → 오프라인에서도 실행
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./index.html') || await cache.match('./');
      if (cached) return cached;
      try { return await fetch(req); }
      catch (_) { return new Response('<!doctype html><meta charset="utf-8"><title>소재창고</title><p style="font-family:sans-serif;padding:24px">오프라인 상태이며 앱 파일이 아직 저장되지 않았습니다. 인터넷에 연결된 상태에서 한 번 열어 주세요.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
    })());
    return;
  }

  // 앱 파일: 캐시 우선, 없으면 네트워크
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    return fetch(req);
  })());
});
