// phone, slow network, empty cache: station -> train to Sqoyaw (the real path), then walk; screenshots every few seconds
const start=require('./base.js');const OUT=process.argv[2];
(async()=>{const {b,p,W,cl,errs}=await start({land:false,seat:'3'});
 const c=await p.context().newCDPSession(p);await c.send('Network.enable');await c.send('Network.setCacheDisabled',{cacheDisabled:true});
 await c.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.5e6/8,uploadThroughput:7.5e5/8});
 const st=()=>p.evaluate(()=>{const q=window.__qf(),R=q.R2();return {on:R.on,room:R.room,x:Math.round(R.x),y:Math.round(R.y),cv:!R.cv.hidden,fade:getComputedStyle(document.getElementById('fade')||document.body).opacity,ride:!document.getElementById('ride').hidden};});
 await p.evaluate(()=>window.__qf().enterStation({now:true}));await W(3000);await cl();
 await p.evaluate(()=>window.__qf().goDest({id:'tribe',open:true}));const t0=Date.now();
 for(let i=0;i<10;i++){await W(3000);const s=await st();console.log(((Date.now()-t0)/1000).toFixed(0)+'s',JSON.stringify(s));await p.screenshot({path:`${OUT}/real_${i}.jpg`,quality:60});}
 const vp=p.viewportSize();await p.touchscreen.tap(vp.width*.5,vp.height*.6);await W(3000);console.log('after tap',JSON.stringify(await st()));
 console.log('errs',JSON.stringify(errs.filter(e=>!/signUp|firestore|fonts/.test(e)).slice(0,8)));await b.close();})();
