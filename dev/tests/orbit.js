const start=require('./base.js');
const PL=[["vil",-20,-17],["lane",45,-46],["sch",-45,30],["shop",-26,150],["bus",25,20],["l2",-1,-61]];
(async()=>{const {b,p,W,cl,errs}=await start({seat:'3'});
 await p.evaluate(()=>{window.__qf().arriveTribe('home',true);});await W(4000);await cl();
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar{display:none!important}'}).catch(()=>{});
 for(const [n,x,z] of PL){await p.evaluate(([x,z])=>{const q=window.__qf();q.P.pos.set(2600+x,q.tribeH(x,z),z);},[x,z]);await W(2500);
  for(let k=0;k<8;k++){await p.evaluate(k=>{const q=window.__qf();q.cam.yaw=k*Math.PI/4;q.cam.pitch=.28;q.cam.dist=8.6;q.cam.pos.set(0,0,0);},k);await W(1300);await p.screenshot({path:`o6_${n}_${k}.jpg`,quality:70});}}
 console.log(JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL/.test(e)).slice(0,5)));await b.close();})();
