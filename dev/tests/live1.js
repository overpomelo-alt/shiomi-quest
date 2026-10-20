// load the published index.html like a phone, log timing + errors + screenshots
const {chromium}=require('playwright-core');const OUT=process.argv[2],Q=process.argv[3]||'';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await (await b.newContext({viewport:{width:412,height:860},hasTouch:true,isMobile:true})).newPage();const log=[];const t0=Date.now();const T=()=>((Date.now()-t0)/1000).toFixed(1);
 p.on('pageerror',e=>log.push(T()+' ERR '+e.message+' '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')log.push(T()+' '+m.type()+' '+m.text().slice(0,200));});
 p.on('requestfailed',r=>log.push(T()+' fail '+r.url().slice(0,90)));
 await p.goto('http://localhost:8766/'+(Q?'?'+Q:''));
 for(let i=0;i<12;i++){await p.waitForTimeout(5000);const s=await p.evaluate(()=>{const b=document.getElementById('startBtn');return {btn:b?(b.disabled?'disabled':'ready'):'none',game:!!document.getElementById('game')};});log.push(T()+' '+JSON.stringify(s));if(s.btn==='ready')break;}
 await p.screenshot({path:OUT+'/a_load.jpg',quality:70});
 console.log(log.join('\n'));await b.close();})();
