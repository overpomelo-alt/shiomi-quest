// Sqoyaw open view, 8 directions (same spot/camera for before & after)  node sq_view.js <outdir> <tag>
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3];
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar{display:none!important}'}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3000);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 const pl=()=>p.evaluate(()=>{const q=window.__qf();q.P.pos.set(2600-10,q.tribeH(-10,10),10);});
 await pl();await p.evaluate(()=>{const q=window.__qf();q.cam.yaw=0;q.cam.pitch=-.03;q.cam.dist=12;q.cam.pos.set(0,0,0);});await W(4000);
 for(let k=0;k<8;k++){await p.evaluate(k=>{const q=window.__qf();q.P.pos.set(2600-10,q.tribeH(-10,10),10);q.cam.yaw=k*Math.PI/4;q.cam.pitch=-.03;q.cam.dist=12;q.cam.pos.set(0,0,0);},k);await W(1600);await p.screenshot({path:`${OUT}/${TAG}_sqv_${k}.jpg`,quality:72,timeout:120000});}
 console.log('sqv done',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,4)));await b.close();})();
