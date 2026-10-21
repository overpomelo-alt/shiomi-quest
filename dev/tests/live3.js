// very slow network: the loading screen should show the "stuck" note + reload button after 20 s; then a normal-speed load
const {chromium}=require('playwright-core');const OUT=process.argv[2],PORT=process.argv[3]||'8767';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:412,height:860},hasTouch:true,isMobile:true});const p=await ctx.newPage();const c=await ctx.newCDPSession(p);await c.send('Network.enable');
 await c.send('Network.emulateNetworkConditions',{offline:false,latency:300,downloadThroughput:60e3,uploadThroughput:30e3});
 await p.goto('http://localhost:'+PORT+'/?sq2d=1&teacher',{waitUntil:'commit'});await p.waitForTimeout(26000);
 const h=await p.evaluate(()=>{const w=document.querySelector('#bootLoad .bl-why');return w?w.textContent:null;}).catch(e=>'eval failed '+e.message);console.log('slow, 26 s:',h);await p.screenshot({path:OUT+'/stuck.jpg',quality:70});
 await c.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:8e6/8,uploadThroughput:2e6/8});
 const t0=Date.now();await p.click('#bootLoad button').catch(e=>console.log('no button',e.message));
 await p.waitForFunction(()=>{const b=document.getElementById('startBtn');return b&&!b.disabled},null,{timeout:200000}).catch(()=>{});
 console.log('after button: ready in',((Date.now()-t0)/1000).toFixed(1),'s; help shown now:',await p.evaluate(()=>!!document.querySelector('#bootLoad .bl-why')));
 await b.close();})();
