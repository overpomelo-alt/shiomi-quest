// 第十三批 3D 樣板: stills, orbit frames, walk frames, mouse-drag check.  node sample13.js <outdir> <tag> [land|phone] [stills|orbit|walk|drag|all]
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3],MODE=process.argv[4]||'land',WHAT=process.argv[5]||'all';
const fs=require('fs');
(async()=>{const land=MODE==='land';const {b,p,W,cl,errs}=await start({land,seat:'3'});
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,#topbar,#bottomBar,#qcard,#questCard,#tCard,#tbar,#quests{display:none!important}'}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('school',true));await W(3500);await cl();
 await p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS.day,S=q.S;for(const k in D){if(D[k]&&(D[k].isColor||D[k].isVector3))S[k].copy(D[k]);else S[k]=D[k];}});
 const place=(x,z,yaw,cy,pitch,dist)=>p.evaluate(([x,z,yaw,cy,pitch,dist])=>{const q=window.__qf();q.P.pos.set(2600+x,q.tribeH(x,z),z);q.P.vel.set(0,0,0);q.P.yaw=yaw;q.P.goal=null;q.cam.yaw=cy;q.cam.pitch=pitch;q.cam.dist=dist;q.cam.pos.set(0,0,0);},[x,z,yaw,cy,pitch,dist]);
 const shot=(n,o={})=>p.screenshot(Object.assign({path:`${OUT}/${n}.jpg`,quality:82,timeout:120000},o));
 if(WHAT==='all'||WHAT==='stills'){
  const V=[['paint',-63,34,Math.PI,.15,.06,land?11:13],['deck',-58,30,Math.PI,.5,.1,8],['tree',-55.5,29,Math.PI,-.4,.1,7],['wing',-70,30,Math.PI,-.6,.12,9]];
  for(const [n,x,z,yaw,cy,pi,d] of V){await place(x,z,yaw,cy,pi,d);await W(2600);await shot(`${TAG}_${MODE}_${n}`);}}
 if(WHAT==='all'||WHAT==='orbit'){fs.mkdirSync(`${OUT}/orbit_${TAG}_${MODE}`,{recursive:true});
  await place(-60,31,Math.PI/2,Math.PI*1.5,.12,land?8.5:10);await W(2500);
  const y0=await p.evaluate(()=>window.__qf().P.yaw);
  const NO=+(process.env.NO||72);for(let k=0;k<NO;k++){await p.evaluate(([k,NO])=>{const q=window.__qf();q.cam.yaw=Math.PI*1.5+k*Math.PI*2/NO;q.cam.pos.set(0,0,0);},[k,NO]);await W(350);await shot(`orbit_${TAG}_${MODE}/f${String(k).padStart(3,'0')}`,{quality:78});}
  const y1=await p.evaluate(()=>window.__qf().P.yaw);console.log('orbit player yaw before/after',y0.toFixed(3),y1.toFixed(3));}
 if(WHAT==='all'||WHAT==='walk'){fs.mkdirSync(`${OUT}/walk_${TAG}_${MODE}`,{recursive:true});
  await place(-52,33,-Math.PI/2,Math.PI*.5,.14,land?8:9.5);await W(2500);await p.keyboard.down('w');
  const NW=+(process.env.NW||40);for(let k=0;k<NW;k++){await W(120);await shot(`walk_${TAG}_${MODE}/f${String(k).padStart(3,'0')}`,{quality:78});}await p.keyboard.up('w');}
 if((WHAT==='all'||WHAT==='drag')&&land){await place(-60,31,Math.PI/2,Math.PI*1.5,.12,8.5);await W(2000);
  const pos0=await p.evaluate(()=>{const q=window.__qf();return [q.P.pos.x,q.P.pos.z,q.P.yaw];});
  await p.mouse.move(500,400);await p.mouse.down();for(let k=1;k<=12;k++){await p.mouse.move(500+k*25,400+k*2);await W(30);}await p.mouse.move(800,425);await W(60);await p.mouse.up();await W(2500);
  const pos1=await p.evaluate(()=>{const q=window.__qf();return [q.P.pos.x,q.P.pos.z,q.P.yaw,!!q.P.goal];});
  console.log('drag test: before',pos0.map(v=>+(+v).toFixed(2)),'after',pos1.map(v=>typeof v==='number'?+v.toFixed(2):v));}
 console.log('errs',JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,4)));await b.close();})();
