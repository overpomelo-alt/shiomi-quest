const start=require('./base.js');const OUT=process.argv[2],VAR=JSON.parse(process.argv[3]||'[]');
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar{display:none!important}'}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3000);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 const prof=await p.evaluate(()=>{const q=window.__qf();const o=[];for(let a=0;a<8;a++){const r=[];for(const d of [150,200,250,300,350,400,450]){const x=-10+Math.sin(a*Math.PI/4)*d,z=30+Math.cos(a*Math.PI/4)*d;r.push(Math.round(q.TB.terrH?q.TB.terrH(x,z):0));}o.push(r);}return o;});
 console.log('terrain h at 150..450 per 45deg',JSON.stringify(prof));
 for(const v of VAR){const [name,R,y0,y1]=v;
  await p.evaluate(([R,y0,y1])=>{const q=window.__qf(),m=q.RIDGE.sq;const k=R/212;m.scale.set(k,(y1-y0)/330,k);m.position.y=(y0+y1)/2;},[R,y0,y1]);
  for(let k=0;k<4;k++){await p.evaluate(k=>{const q=window.__qf();q.P.pos.set(2600-10,q.tribeH(-10,10),10);q.cam.yaw=k*Math.PI/2;q.cam.pitch=-.05;q.cam.dist=12;q.cam.pos.set(0,0,0);},k);await W(1400);await p.screenshot({path:`${OUT}/sq_${name}_${k}.jpg`,quality:60});}
  await p.evaluate(()=>{const q=window.__qf();const x=45,z=-46;q.P.pos.set(2600+x,q.tribeH(x,z),z);q.cam.yaw=Math.PI/2;q.cam.pitch=.2;q.cam.dist=7;q.cam.pos.set(0,0,0);});await W(1600);await p.screenshot({path:`${OUT}/sq_${name}_4.jpg`,quality:60});}
 console.log(JSON.stringify(errs.slice(0,4)));await b.close();})();
