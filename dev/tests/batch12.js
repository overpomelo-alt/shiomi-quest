// 第十二批 before/after shots: field (land/port), ridges orbit (Sqoyaw + 汐見町), hudie back walk.
// usage: node batch12.js <outdir> <tag> [field|ridge|dog|all]
const start=require('./base.js');
const OUT=process.argv[2]||'.',TAG=process.argv[3]||'x',WHAT=process.argv[4]||'all';
const HIDE='#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar{display:none!important}';
const day=p=>p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
const night=p=>p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.night,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
const flt=e=>e.filter(e=>!/reqfail|Failed to load|TUNNEL|firestore|googleapis/.test(e));
(async()=>{
 if(WHAT==='all'||WHAT==='field'){
  for(const land of [true,false]){const {b,p,W,cl,errs}=await start({land,seat:'3'});const sk=land?'L':'P';
   await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(2500);await cl();await day(p);
   await p.evaluate(()=>window.__qf().fieldEnter());await W(4500);await cl();
   const info=await p.evaluate(()=>{const q=window.__qf(),R=q.R2();return {room:R.room,sk:R.sk,x:Math.round(R.x),y:Math.round(R.y),spots:q.r2Spots().map(s=>[s.def[0],Math.round(s.def[1]),Math.round(s.def[2])])};});
   console.log('field',sk,JSON.stringify(info));
   await p.screenshot({path:`${OUT}/${TAG}_field_${sk}_1.jpg`,quality:82});
   await night(p);await W(1200);await p.screenshot({path:`${OUT}/${TAG}_field_${sk}_night.jpg`,quality:82});await day(p);
   console.log('errs',JSON.stringify(flt(errs).slice(0,6)));await b.close();}}
 if(WHAT==='all'||WHAT==='ridge'){
  const {b,p,W,cl,errs}=await start({land:true,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
  await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3500);await cl();await day(p);
  const orbit=async(name,place)=>{for(let k=0;k<8;k++){await p.evaluate(([k,place])=>{const q=window.__qf();place(q);q.cam.yaw=k*Math.PI/4;q.cam.pitch=.06;q.cam.dist=8.6;q.cam.pos.set(0,0,0);},[k,place]);
    await W(1400);await p.screenshot({path:`${OUT}/${TAG}_${name}_${k}.jpg`,quality:72});}};
  await p.evaluate(()=>{const q=window.__qf();q.P.pos.set(2600-20,q.tribeH(-20,-17),-17);q.cam.yaw=0;q.cam.pitch=.06;q.cam.dist=8.6;q.cam.pos.set(0,0,0);});await W(4000);
  for(let k=0;k<8;k++){await p.evaluate(k=>{const q=window.__qf();q.P.pos.set(2600-20,q.tribeH(-20,-17),-17);q.cam.yaw=k*Math.PI/4;q.cam.pitch=.06;q.cam.dist=8.6;q.cam.pos.set(0,0,0);},k);await W(1500);await p.screenshot({path:`${OUT}/${TAG}_sq_${k}.jpg`,quality:72});}
  await night(p);await p.evaluate(()=>{const q=window.__qf();q.cam.yaw=Math.PI;q.cam.pitch=.06;q.cam.pos.set(0,0,0);});await W(1500);await p.screenshot({path:`${OUT}/${TAG}_sq_night.jpg`,quality:72});await day(p);
  await p.evaluate(()=>window.__qf().arriveShiomi());await W(4000);await cl();await day(p);await W(1500);await cl();
  await p.evaluate(()=>{const q=window.__qf();q.P.pos.set(-20,q.groundH(-20,-50),-50);q.cam.yaw=0;q.cam.pos.set(0,0,0);});await W(3000);await cl();
  for(let k=0;k<8;k++){await p.evaluate(k=>{const q=window.__qf();q.P.pos.set(-20,q.groundH(-20,-50),-50);q.cam.yaw=k*Math.PI/4;q.cam.pitch=.06;q.cam.dist=8.6;q.cam.pos.set(0,0,0);},k);await W(1500);await p.screenshot({path:`${OUT}/${TAG}_sm_${k}.jpg`,quality:72});}
  await night(p);await p.evaluate(()=>{const q=window.__qf();q.cam.yaw=Math.PI;q.cam.pitch=.06;q.cam.pos.set(0,0,0);});await W(1500);await p.screenshot({path:`${OUT}/${TAG}_sm_night.jpg`,quality:72});
  const tri=await p.evaluate(()=>window.__qf().renderer.info.render.triangles);console.log('ridge done tri',tri,'errs',JSON.stringify(flt(errs).slice(0,6)));await b.close();}
 if(WHAT==='all'||WHAT==='dog'){
  const {b,p,W,cl,errs}=await start({land:true,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
  await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3000);await cl();await day(p);
  await p.evaluate(()=>{const q=window.__qf();q.W.pet={kind:'dog',coat:'hudie',name:'蝴蝶',full:80,mood:85,bond:0,seen:Date.now()};q.W.hudieCut=Date.now()-9*864e5;q.setupPet();});await W(2500);
  // stand on the long lane, face away from the camera (camera looks along -z ... yaw so the player walks straight away)
  await p.evaluate(()=>{const q=window.__qf();const x=45,z=-46;q.P.pos.set(2600+x,q.tribeH(x,z),z);const d=q.PETf();if(d){d.g.position.set(2600+x+.8,q.tribeH(x,z),z+1.6);}q.cam.pitch=.22;q.cam.dist=6.5;q.cam.pos.set(0,0,0);});await W(1500);
  const res=[];
  for(let i=0;i<2;i++){
   await p.evaluate(()=>{const q=window.__qf();const x=45,z=-46;q.P.pos.set(2600+x,q.tribeH(x,z),z);q.cam.yaw=Math.PI/2;q.cam.pitch=.2;q.cam.dist=7;q.cam.pos.set(0,0,0);});await W(1800);
   await p.evaluate(()=>{const q=window.__qf(),c=q.camera.position,P=q.P.pos;let dx=P.x-c.x,dz=P.z-c.z;const l=Math.hypot(dx,dz);dx/=l;dz/=l;const d=q.PETf();
     if(d){d.g.position.set(P.x-dx*2.2,P.y,P.z-dz*2.2);}});
   await p.keyboard.down('w');await W(i?1500:1000);
   const st=await p.evaluate(()=>{const q=window.__qf(),d=q.PETf();return d&&d.spr?{frame:d.spr.frame,id:d.spr.id}:null;});res.push(st);
   await p.screenshot({path:`${OUT}/${TAG}_dog_${i}.jpg`,quality:80,timeout:120000});await p.keyboard.up('w');await W(400);}
  console.log('dog',JSON.stringify(res),'errs',JSON.stringify(flt(errs).slice(0,6)));await b.close();}
})();
