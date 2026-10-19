// 第十二批 正式操場 field-v1: spots reachable, walk-in exits, occluders in front of / behind the player.  node field12.js <outdir> [l]
const start=require('./base.js');const OUT=process.argv[2]||'.',land=process.argv[3]==='l',tag=land?'L':'P';
(async()=>{const {b,p,W,cl,errs}=await start({land,seat:'3'});
 const shot=n=>p.screenshot({path:`${OUT}/fd_${tag}_${n}.jpg`,quality:75,timeout:120000});
 const st=()=>p.evaluate(()=>{const q=window.__qf(),R=q.R2();return [R.room,R.on,Math.round(R.x),Math.round(R.y),R.sk];});
 const go=(x,y,v=2)=>p.evaluate(([x,y,v])=>{const R=window.__qf().R2();R.x=x;R.y=y;R.cx=null;R.view=v;R.tgt=R.pend=null;},[x,y,v]);
 const walkTo=(x,y)=>p.evaluate(([x,y])=>{const R=window.__qf().R2();R.tgt=[x,y];R.pend=null;},[x,y]);
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(2500);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.W.pet={kind:'dog',coat:'hudie',name:'蝴蝶',full:80,mood:85,bond:0,seen:Date.now()};q.setupPet();});await W(1500);
 await p.evaluate(()=>window.__qf().fieldEnter());await W(4500);await cl();
 const info=await p.evaluate(()=>{const q=window.__qf(),R=q.R2(),D=q.TB&&null;return {st:[R.room,R.sk,Math.round(R.x),Math.round(R.y)],spots:q.r2Spots().map(s=>[s.def[0],s.label,q.r2Walk(s.def[1],s.def[2])])};});
 console.log('enter',JSON.stringify(info));
 await shot('0enter');
 const D=await p.evaluate(()=>{const q=window.__qf(),R=q.R2();return JSON.parse(JSON.stringify(q.r2Spots().map(s=>[s.def[0],s.def[1],s.def[2]])));});
 const at=k=>D.find(d=>d[0]===k);
 // occluders: behind the hoop pole, behind the deck fence, behind the stage front, at the bottom-left near the foreground tree
 const L=land;
 await go(...(L?[1800,740]:[1060,1130]));await W(1000);await shot('1hoop_behind');
 let s=at('木平台');await go(s[1],s[2]);await W(1000);await shot('2deck');
 s=at('司令台');await go(s[1],s[2]);await W(1000);await shot('3stage');
 await go(...(L?[330,1000]:[600,1780]),0);await W(1000);await shot('4tree');
 // walk up the picture (away from the viewer): the dog should show its back
 await go(...(L?[1100,1000]:[600,1700]),2);await W(800);await walkTo(...(L?[1100,760]:[600,1250]));await W(900);
 const dog=await p.evaluate(()=>{const q=window.__qf(),R=q.R2();return {back:R.pet.back,mv:R.pet.mv};});console.log('dog walking up',JSON.stringify(dog));await shot('5dogback');
 // classroom door: walk into the mat
 s=at('教室門');await go(s[1],s[2]+30,2);await W(800);
 const E=await p.evaluate(()=>{const q=window.__qf(),R=q.R2();const D=q.TB?null:null;return null;});
 await p.evaluate(()=>{const q=window.__qf(),R=q.R2();R.exitArm=true;});
 const door=await p.evaluate(()=>{const q=window.__qf();const R=q.R2();const D=JSON.parse(document.getElementById('troom').textContent).field[R.sk];return D.exits;});
 await walkTo(door.classroom_door.center[0],door.classroom_door.center[1]);await W(5000);const c1=await st();
 await p.evaluate(()=>window.__qf().clsLeave());await W(4500);const c2=await st();
 // right track -> gate, then the gate's track back -> field (arrives at the right track)
 await go(door.to_gate.center[0]-120,door.to_gate.center[1]+10);await W(600);await walkTo(door.to_gate.center[0],door.to_gate.center[1]);await W(6000);const c3=await st();
 await p.evaluate(()=>{const q=window.__qf();const s=q.r2Spots().find(s=>s.def[0]==='往操場');s.act();});await W(4500);const c4=await st();
 // left track -> 3D lawn with the pull-up bars
 await go(door.to_lawn.center[0]+110,door.to_lawn.center[1]+10);await W(600);await walkTo(door.to_lawn.center[0],door.to_lawn.center[1]);await W(6000);
 const c5=await p.evaluate(()=>{const q=window.__qf();return [q.R2().on,Math.round(q.P.pos.x-2600),Math.round(q.P.pos.z)];});
 await W(1500);await shot('6lawn3d');
 console.log(JSON.stringify({class:c1,backFromClass:c2,toGate:c3,gateToField:c4,lawn3d:c5}),JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,6)));
 await b.close();})();
