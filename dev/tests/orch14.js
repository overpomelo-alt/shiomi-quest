// persimmon orchard + lane-side trees, fixed spots.  PORT=.. node orch14.js <out> <tag>
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3];
const HIDE='#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar,#quests,#qt{display:none!important}';
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3000);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 const V=[[-43,43,Math.PI,.12,6],[-20,60,Math.PI*1.5,.1,6],[76,-58,0,.12,6],[10,-20,Math.PI*.75,.15,7]];
 for(let k=0;k<V.length;k++){const [x,z,yaw,pt,d]=V[k];
  await p.evaluate(([x,z,yaw,pt,d])=>{const q=window.__qf();q.P.pos.set(2600+x,q.tribeH(x,z),z);q.cam.yaw=yaw;q.cam.pitch=pt;q.cam.dist=d;q.cam.pos.set(0,0,0);},[x,z,yaw,pt,d]);
  await W(1800);await p.screenshot({path:`${OUT}/${TAG}_or_${k}.jpg`,quality:78});}
 console.log('done',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,3)));await b.close();})();
