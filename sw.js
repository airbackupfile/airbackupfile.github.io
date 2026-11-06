/* AIR offline helper: always tries the internet first (so updates show at once), uses the saved copy only when offline. */
const C='air-v2';const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 const fresh=r.mode==='navigate'||/\.html$|\/$/.test(u.pathname)||u.pathname.endsWith('sw.js');e.respondWith(fetch(fresh?new Request(r,{cache:'no-cache'}):r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./index.html'))))});
