/* AIR offline helper: always tries the internet first (so updates show at once), uses the saved copy only when offline. */
const C='air-v3';const CORE=['./','./index.html','./upload.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 const fresh=r.mode==='navigate'||/\.html$|\/$/.test(u.pathname)||u.pathname.endsWith('sw.js');e.respondWith(fetch(fresh?new Request(r,{cache:'no-cache'}):r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./index.html'))))});

/* AIR pending uploads: files kept on the phone (IndexedDB "AIR_UPQ") go up when the network is back, even with the page closed (Chrome / Android) */
function qOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('AIR_UPQ',1);r.onupgradeneeded=()=>r.result.createObjectStore('q',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function qDo(db,mode,fn){return new Promise((res,rej)=>{const t=db.transaction('q',mode),q=fn(t.objectStore('q'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})}
async function swFlush(){const db=await qOpen(),L=((await qDo(db,'readonly',s=>s.getAll()))||[]).sort((a,b)=>a.at-b.at);let netFail=false;
 for(const it of L){if(it.err||(it.lock&&Date.now()-it.lock<180000))continue;it.lock=Date.now();await qDo(db,'readwrite',s=>{s.put(it)});
  try{const r=await fetch(it.api,{method:'POST',body:JSON.stringify(it.body)}),j=await r.json();
   if(j&&j.ok){await qDo(db,'readwrite',s=>{s.delete(it.id)});if(it.ck&&it.kind==='h'){const f={};f[it.ck]='y';fetch(it.api,{method:'POST',body:JSON.stringify({action:'publicExtract',k:it.k,doc:'chk',fields:f})}).catch(()=>{})}}
   else{it.lock=0;it.err=(j&&j.error)||'not accepted';await qDo(db,'readwrite',s=>{s.put(it)})}}
  catch(e){it.lock=0;it.tries=(it.tries||0)+1;await qDo(db,'readwrite',s=>{s.put(it)});netFail=true;break}}
 if(netFail)throw new Error('network');}
self.addEventListener('sync',e=>{if(e.tag==='air-upq')e.waitUntil(swFlush())});
