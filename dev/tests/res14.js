// 阿澈 (standing NPC) from 8 directions, player hidden.  PORT=.. node res14.js <out> <tag>
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3];
const HIDE='#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar,#quests,#qt{display:none!important}';
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3000);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 for(let k=0;k<8;k++){const yaw=k*Math.PI/4;
  await p.evaluate(yaw=>{const q=window.__qf();const x=-50+Math.sin(yaw)*4.2,z=26+Math.cos(yaw)*4.2;q.P.pos.set(2600+x,q.tribeH(x,z),z);q.cam.yaw=yaw;q.cam.pitch=.08;q.cam.dist=2.4;q.cam.pos.set(0,0,0);const c=q.SPRC();if(c&&c.mat)c.mat.opacity=0;},yaw);
  await W(1500);await p.screenshot({path:`${OUT}/${TAG}_r7_${k}.jpg`,quality:78});}
 console.log('done',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,3)));await b.close();})();
