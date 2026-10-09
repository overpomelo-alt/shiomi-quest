/* 汐見町 service worker: pictures and fonts are kept on the device (their addresses change whenever a picture changes),
   the page itself is always fetched fresh when there is a network, and from the device when there isn't. */
const PAGE='shiomi-page-v2',PICS='shiomi-pics-v1';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keep=[PAGE,PICS];for(const k of await caches.keys())if(!keep.includes(k))await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(/googleapis\.com$/.test(u.hostname)&&!/fonts\./.test(u.hostname))return; // database / sign-in: never cached
  const pic=(u.origin===location.origin&&/\/assets\//.test(u.pathname))||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(pic){e.respondWith((async()=>{const c=await caches.open(PICS);const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==='opaque')c.put(r,res.clone());return res;})());return;}
  // the page: always try the network first (so a new version shows on the next reload); only when the network is slow
  // (over 3 s) or offline is the copy on the device used
  if(u.origin===location.origin&&(r.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname))){e.respondWith((async()=>{const c=await caches.open(PAGE),key=new URL('./',location).href;
    const net=fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok)c.put(key,res.clone());return res;});
    const slow=new Promise(ok=>setTimeout(ok,3000)).then(()=>c.match(key));
    try{const first=await Promise.race([net,slow]);if(first)return first;return await net;}catch(err){const hit=await c.match(key);if(hit)return hit;throw err;}})());}});
