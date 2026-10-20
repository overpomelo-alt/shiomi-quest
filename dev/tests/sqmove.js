// in ?sq2d=1, arrive at 村子中心 and try to walk with a tap, the joystick and the keyboard (real inputs)
const start=require('./base.js');const OUT=process.argv[2],land=process.argv[3]!=='p';
(async()=>{const {b,p,W,cl,errs}=await start({land,seat:'3'});
 const st=()=>p.evaluate(()=>{const q=window.__qf(),R=q.R2();return {on:R.on,room:R.room,x:Math.round(R.x),y:Math.round(R.y),tgt:R.tgt,fps:q.fps?q.fps():null};});
 await p.evaluate(()=>window.__qf().arriveTribe());await W(5000);await cl();console.log('arrive',JSON.stringify(await st()));
 const vp=p.viewportSize();
 // frame-rate probe
 const fr=await p.evaluate(()=>new Promise(r=>{let n=0,t=performance.now();function f(){n++;if(performance.now()-t<3000)requestAnimationFrame(f);else r(n/3);}requestAnimationFrame(f);}));console.log('fps',fr.toFixed(1));
 // 1) tap the ground a bit above-left of center
 if(land)await p.mouse.click(vp.width*.4,vp.height*.75);else await p.touchscreen.tap(vp.width*.4,vp.height*.75);
 await W(3000);console.log('after tap',JSON.stringify(await st()));
 // 2) keyboard
 await p.keyboard.down('ArrowUp');await W(1500);await p.keyboard.up('ArrowUp');console.log('after key',JSON.stringify(await st()));
 // 3) joystick drag (touch)
 const js=await p.evaluate(()=>{const e=document.querySelector('#joy,#stick,.joy');if(!e)return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,e.id||e.className];});console.log('joy',JSON.stringify(js));
 if(js){const c=await p.context().newCDPSession(p);const T=(type,x,y)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  await T('touchStart',js[0],js[1]);for(let i=1;i<=10;i++){await T('touchMove',js[0]+i*4,js[1]-i*3);await W(30);}await W(1500);console.log('during joy',JSON.stringify(await st()));await T('touchEnd');}
 await p.screenshot({path:OUT+'/move_'+(land?'L':'P')+'.jpg',quality:70});
 console.log('errs',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp|firestore/.test(e)).slice(0,6)));await b.close();})();
