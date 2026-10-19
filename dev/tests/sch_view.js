// school sample views: node sch_view.js <outdir> <tag> [port]
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3];
const V=[['facade',-62,33,0,.12,9],['deck',-58,30,.5,.1,8],['tree',-55,27,-.7,.12,7],['gate',-44,25.5,-1.4,.12,8]];
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar,#quests{display:none!important}'}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('school',true));await W(3500);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 for(const [n,x,z,yaw,pitch,dist] of V){await p.evaluate(([x,z,yaw,pitch,dist])=>{const q=window.__qf();q.P.pos.set(2600+x,q.tribeH(x,z),z);q.cam.yaw=yaw;q.cam.pitch=pitch;q.cam.dist=dist;q.cam.pos.set(0,0,0);},[x,z,yaw,pitch,dist]);
   await W(2200);await p.screenshot({path:`${OUT}/${TAG}_${n}.jpg`,quality:80,timeout:120000});}
 console.log('done',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,4)));await b.close();})();
