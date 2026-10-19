const start=require('./base.js');const OUT=process.argv[2];
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar{display:none!important}'}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveShiomi());await W(4000);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 for(const [n,x,z] of [['a',0,-40],['b',-60,20],['c',30,60],['d',-20,-50]]){for(let k=0;k<4;k++){await p.evaluate(([x,z,k])=>{const q=window.__qf();q.P.pos.set(x,q.groundH(x,z),z);q.cam.yaw=k*Math.PI/2;q.cam.pitch=.04;q.cam.dist=8.6;q.cam.pos.set(0,0,0);},[x,z,k]);await W(1300);await p.screenshot({path:`${OUT}/t_${n}_${k}.jpg`,quality:60});}}
 console.log(JSON.stringify(errs.slice(0,4)));await b.close();})();
