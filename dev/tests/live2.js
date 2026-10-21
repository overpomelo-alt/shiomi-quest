// phone on slow 4G: first visit, then reload (service worker active) with the exact URL; log progress every 2 s
const {chromium}=require('playwright-core');const Q=process.argv[2]||'';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:412,height:860},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'});
 const p=await ctx.newPage();const log=[];let t0=Date.now();const T=()=>((Date.now()-t0)/1000).toFixed(1);
 p.on('pageerror',e=>log.push(T()+' ERR '+e.message));p.on('console',m=>{if(m.type()==='error')log.push(T()+' cerr '+m.text().slice(0,140));});
 const c=await ctx.newCDPSession(p);await c.send('Network.enable');await c.send('Network.emulateNetworkConditions',{offline:false,latency:120,downloadThroughput:4e6/8,uploadThroughput:1e6/8});
 const watch=async(tag)=>{for(let i=0;i<60;i++){await p.waitForTimeout(2000);const s=await p.evaluate(()=>{const b=document.getElementById('startBtn'),bl=document.querySelector('#bootLoad .bl-bar i');return {btn:b?b.textContent:'(no btn)',bar:bl?bl.style.width:'gone',sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller)};}).catch(e=>({e:e.message.slice(0,60)}));log.push(tag+' '+T()+' '+JSON.stringify(s));if(s.btn&&/Start|蓋不起來/.test(s.btn))break;}};
 await p.goto('http://localhost:'+(process.env.LP||'8766')+'/'+Q,{waitUntil:'commit'});await watch('v1');
 t0=Date.now();await p.reload({waitUntil:'commit'});await watch('v2');
 console.log(log.join('\n'));await b.close();})();
