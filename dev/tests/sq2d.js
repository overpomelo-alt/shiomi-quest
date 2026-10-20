// Sqoyaw 手繪場景（?sq2d=1）: arrive, walk the exits, doors, pens; screenshots with the player at the near edge.
// usage: Q=sq2d=1 PORT=.. node sq2d.js <outdir> <tag> [l|p]
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3],land=process.argv[4]!=='p',sk=land?'L':'P';
const HIDE='#toast,#quests,#qt,#prompt{display:none!important}';
(async()=>{const {b,p,W,cl,errs}=await start({land,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
 await p.evaluate(()=>{const q=window.__qf();q.W.pet={kind:'dog',coat:'hudie',name:'蝴蝶',full:80,mood:85,bond:0,seen:Date.now()};q.setupPet();});await W(1500);
 const st=()=>p.evaluate(()=>{const q=window.__qf(),R=q.R2();return {room:R.on?R.room:'3D',sk:R.sk,x:Math.round(R.x),y:Math.round(R.y),h:R.on?Math.round(q.R2CFGf()[R.room]?.[R.sk]?.ss?0:0):0};});
 const H=()=>p.evaluate(()=>{const q=window.__qf(),R=q.R2();return R.on&&q.r2Hf?Math.round(q.r2Hf(R.y,R.x)):null;});
 const shot=n=>p.screenshot({path:`${OUT}/${TAG}_${sk}_${n}.jpg`,quality:80});
 const go=(x,y)=>p.evaluate(([x,y])=>{const q=window.__qf(),R=q.R2();[R.x,R.y]=q.r2Near?q.r2Near(x,y):[x,y];R.cx=null;R.view=0;R.tgt=R.pend=null;},[x,y]);
 const D=()=>p.evaluate(()=>{const q=window.__qf(),R=q.R2();return JSON.parse(document.getElementById('troom').textContent)[R.room][R.sk];});
 const walkInto=async k=>{const d=await D(),e=d.exits[k];await go(e.spawn[0],e.spawn[1]);await W(500);await p.evaluate(([x,y])=>{const R=window.__qf().R2();R.exitArm=true;R.tgt=[x,y];R.pend=null;},e.center);await W(5000);await cl();};
 const spot=k=>p.evaluate(k=>{const q=window.__qf(),s=q.r2Spots().find(s=>s.def[0]===k||String(s.label).includes(k));return s?[s.def[1],s.def[2],s.label]:null;},k);
 const act=k=>p.evaluate(k=>{const q=window.__qf(),s=q.r2Spots().find(s=>s.def[0]===k||String(s.label).includes(k));if(s)s.act();return !!s;},k);
 const log={};
 // 1) arriving by train / bus -> 村子中心
 await p.evaluate(()=>window.__qf().arriveTribe());await W(4500);await cl();log.arrive=await st();await shot('1bus');
 const near=async(n)=>{const d=await D();let best=null;for(let y=d.h-4;y>d.h*.6&&!best;y-=6)for(let x=d.w*.5;x>0&&x<d.w;x+= (x<d.w*.5?-1:1)*0){break;}
   // walk straight down from the middle until the bottom edge of the walkable ground
   const r=await p.evaluate(([w,h])=>{const q=window.__qf();let x=w*.55,y=h-2;for(;y>h*.5;y-=4)if(q.r2Walk(x,y))break;return [x,y];},[d.w,d.h]);await go(r[0],r[1]);await W(2500);log['near_'+n]=Object.assign(await st(),{H:await H()});await shot(n);};
 await near('2bus_near');
 // 2) exits: orchard (not drawn yet), then classmates
 await walkInto('to_orchard');log.orchard=await st();
 await walkInto('to_classmates');log.toClassmates=await st();await W(1500);await shot('3classmates');
 log.doors=await p.evaluate(()=>window.__qf().r2Spots().map(s=>s.def[0]+'='+s.label));
 await near('4classmates_near');
 const s3=await spot('door_3');if(s3){await go(s3[0],s3[1]);await W(1800);await shot('5door3');log.door3H=await H();}
 // own door (seat 3 lives in 3 號) -> my room -> 出門 Sqoyaw -> back at door 3
 await act('door_3');await W(5000);await cl();log.home=await st();
 await p.evaluate(()=>{const q=window.__qf();q.goOut('tribe');});await W(5000);await cl();log.backFromHome=await st();
 // 3) to 動物之家
 await walkInto('to_animals');log.toAnimals=await st();await W(2500);await shot('6animals');
 log.pens=await p.evaluate(()=>window.__qf().r2Spots().map(s=>s.def[0]+'='+s.label));
 await near('7animals_near');
 // 4) back: animals -> classmates -> bus -> gate -> bus
 await walkInto('to_classmates');log.back1=await st();
 await walkInto('to_bus');log.back2=await st();
 await walkInto('to_gate');await W(8000);log.gate=await st();await shot('8gate');
 await p.evaluate(()=>window.__qf().gateLeave());await W(4500);await cl();log.gateBack=await st();
 console.log(JSON.stringify(log,null,0));console.log('errs',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp|firestore/.test(e)).slice(0,6)));await b.close();})();
