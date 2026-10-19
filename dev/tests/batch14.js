// 第十四批 before/after: room character size (teacher room / student room / classroom / mart) and residents Q.
// usage: PORT=8765 node batch14.js <outdir> <tag> [rooms|res|all] [l|p|lp]
const start=require('./base.js');
const OUT=process.argv[2]||'.',TAG=process.argv[3]||'x',WHAT=process.argv[4]||'all',ORI=process.argv[5]||'lp';
const HIDE='#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar,#quests,#qt{display:none!important}';
const day=p=>p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
const flt=e=>e.filter(e=>!/reqfail|Failed to load|TUNNEL|firestore|googleapis|signUp/.test(e));
// rooms: [name, enter expression, spot keys to stand at]
const ROOMS=[['cabin','q.enterCabinDirect()',['浴室','辦公桌','床','閱讀日記']],['home','q.enterHome()',['*0','*1','*2']],
  ['class','q.clsEnter()',['*0','*1','*2']],['mart','q.enterMart("tribe")',['counter','*1','*3']]];
(async()=>{
 if(WHAT==='all'||WHAT==='rooms')for(const land of [true,false]){if(!ORI.includes(land?'l':'p'))continue;
  const {b,p,W,cl,errs}=await start({land,seat:'3'});const sk=land?'L':'P';await p.addStyleTag({content:HIDE}).catch(()=>{});
  for(const [nm,ent,keys] of ROOMS){
   await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(2500);await cl();await day(p);
   await p.evaluate(e=>{const q=window.__qf();(new Function('q',e))(q);},ent);await W(4500);await cl();
   const sp=await p.evaluate(()=>{const q=window.__qf();return q.r2Spots().map(s=>[s.def[0],Math.round(s.def[1]),Math.round(s.def[2])]);});
   console.log(nm,sk,JSON.stringify(sp.map(s=>s[0])),'hA',JSON.stringify(await p.evaluate(()=>{const q=window.__qf(),R=q.R2();return [R.room,R.sk,(q.R2CFGf()[R.room]||q.R2CFGf())[R.sk]?.hA||null];})));
   await p.screenshot({path:`${OUT}/${TAG}_${nm}_${sk}_0.jpg`,quality:78});
   let i=1;for(const k of keys){const s=k[0]==='*'?sp.filter(s=>!/離開|出門|往/.test(s[0]))[+k.slice(1)]:sp.find(s=>s[0]===k||String(s[0]).includes(k));if(!s){console.log('nospot',nm,k);continue;}
    await p.evaluate(([x,y])=>{const R=window.__qf().R2();R.x=x;R.y=y;R.cx=null;R.view=0;R.tgt=R.pend=null;},[s[1],s[2]]);await W(1300);
    await p.screenshot({path:`${OUT}/${TAG}_${nm}_${sk}_${i++}.jpg`,quality:78});}
   await p.evaluate(()=>{const q=window.__qf();try{q.exitCabin();}catch(e){}try{q.exitHome();}catch(e){}try{q.clsLeave();}catch(e){}try{q.exitMart();}catch(e){}});await W(2500);}
  console.log('errs',JSON.stringify(flt(errs).slice(0,6)));await b.close();}
 if(WHAT==='all'||WHAT==='res'){
  const {b,p,W,cl,errs}=await start({land:true,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
  await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(3000);await cl();await day(p);
  // hide the player (alphaTest discards a fully transparent sprite) so only the resident is in the picture
  const hideMe=()=>p.evaluate(()=>{const q=window.__qf(),c=q.SPRC();if(c&&c.mat)c.mat.opacity=0;});
  // camera looks along -(sin yaw, cos yaw); stand the player D m from the resident toward the camera, camera 2 m behind the player
  const aim=(x,z,yaw,D)=>p.evaluate(([x,z,yaw,D])=>{const q=window.__qf();const px=x+Math.sin(yaw)*D,pz=z+Math.cos(yaw)*D;q.P.pos.set(2600+px,q.tribeH(px,pz),pz);q.cam.yaw=yaw;q.cam.pitch=.1;q.cam.dist=2.2;q.cam.pos.set(0,0,0);},[x,z,yaw,D]);
  // standing resident: 阿澈 by the court (faces yaw .6 PI): front, side, back
  for(const [k,yaw] of [[0,Math.PI*.6],[1,Math.PI*1.1],[2,Math.PI*1.6]]){await aim(-50,26,yaw,4.6);await hideMe();await W(1800);await hideMe();await W(300);await p.screenshot({path:`${OUT}/${TAG}_res07_${k}.jpg`,quality:78});}
  // walking residents (they stop and turn when the player is within 2.4 m, so stay 3.4 m away): front and side while moving
  for(const id of ['res03','res05','res01'])for(let k=0;k<2;k++){
   const pos=await p.evaluate(id=>{const q=window.__qf();const w=q.TB.walk.find(w=>w.id===id);if(!w)return null;return [w.c.g.position.x-2600,w.c.g.position.z,w.yaw];},id);
   if(!pos){console.log('no',id);continue;}
   await aim(pos[0],pos[1],pos[2]+(k?Math.PI/2:0),3.4);await hideMe();await W(400);
   const pos2=await p.evaluate(id=>{const q=window.__qf();const w=q.TB.walk.find(w=>w.id===id);return [w.c.g.position.x-2600,w.c.g.position.z,w.yaw,w.stop,w.c.frame];},id);
   await aim(pos2[0],pos2[1],pos2[2]+(k?Math.PI/2:0),3.4);await W(250);await p.screenshot({path:`${OUT}/${TAG}_walk_${id}_${k}.jpg`,quality:78});console.log(id,k,JSON.stringify(pos2));}
  console.log('res errs',JSON.stringify(flt(errs).slice(0,6)));await b.close();}
})();
