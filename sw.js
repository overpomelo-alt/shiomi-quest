/* 汐見町 service worker: pictures and fonts are kept on the device (their addresses change whenever a picture changes),
   the page itself is always fetched fresh when there is a network, and from the device when there isn't. */
const PAGE='shiomi-page-v3',PICS='shiomi-pics-v1';
// storage on some phones can hang or fail (full, private mode); never let it hold up the game: give up after 3 s and use the network
const lim=(p,ms=3000)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('cache timeout')),ms))]);
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{try{const keep=[PAGE,PICS];for(const k of await caches.keys())if(!keep.includes(k))await caches.delete(k);
  // each picture is stored under its address + ?v=<version>; old versions of the same picture pile up over the weeks, so keep only the newest
  const c=await caches.open(PICS),ks=await c.keys(),last={};ks.forEach(q=>{const u=new URL(q.url);last[u.origin+u.pathname]=q;});
  for(const q of ks){const u=new URL(q.url);if(last[u.origin+u.pathname]!==q)await c.delete(q);}}catch(err){}await self.clients.claim();})());});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(/googleapis\.com$/.test(u.hostname)&&!/fonts\./.test(u.hostname))return; // database / sign-in: never cached
  const pic=(u.origin===location.origin&&/\/assets\//.test(u.pathname))||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(pic){e.respondWith((async()=>{let c=null;try{c=await lim(caches.open(PICS));const hit=await lim(c.match(r));if(hit)return hit;}catch(err){c=null;}const res=await fetch(r);if(c&&(res.ok||res.type==='opaque'))c.put(r,res.clone()).catch(()=>{});return res;})());return;}
  // the page: always try the network first (so a new version shows on the next reload); only when the network is slow
  // (over 10 s) or offline is the copy on the device used
  if(u.origin===location.origin&&(r.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname))){e.respondWith((async()=>{const key=new URL('./',location).href;
    const net=fetch(r,{cache:'no-cache'});net.then(res=>{if(res.ok){const cp=res.clone();lim(caches.open(PAGE)).then(c=>c.put(key,cp)).catch(()=>{});}}).catch(()=>{});
    const cached=()=>lim(caches.open(PAGE)).then(c=>lim(c.match(key))).catch(()=>undefined);
    const slow=new Promise(ok=>setTimeout(ok,10000)).then(cached);
    try{const first=await Promise.race([net,slow]);if(first)return first;return await net;}catch(err){const hit=await cached();if(hit)return hit;throw err;}})());}});
