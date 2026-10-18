const start=require('./base.js');const tag=process.argv[2];const V=JSON.parse(process.argv[3]);
(async()=>{global.TOD=process.argv[4]||"day";const {b,p,W,cl,errs}=await start({seat:'3'});
 const day=()=>p.evaluate(()=>{const q=window.__qf();q.RTC.auto=false;const D=q.PS[window.__tod||"day"],S=q.S;for(const k in D){if(D[k]&&D[k].isColor)S[k].copy(D[k]);else if(D[k]&&D[k].isVector3)S[k].copy(D[k]);else S[k]=D[k];}});
 let area='';
 for(const [n,a,x,z,yaw,pitch,dist] of V){
  if(a!==area){area=a;await p.evaluate(a=>a==='s'?window.__qf().arriveTribe('home',true):window.__qf().arriveShiomi(),a);await W(4000);await cl();}
  await p.evaluate(t=>{window.__tod=t},TOD);await day();
  await p.evaluate(([a,x,z,yaw,pitch,dist])=>{const q=window.__qf();const X=a==='s'?2600+x:x;q.P.pos.set(X,a==='s'?q.tribeH(x,z):q.groundH(x,z),z);q.cam.yaw=yaw;q.cam.pitch=pitch;q.cam.dist=dist;},[a,x,z,yaw,pitch,dist]);
  await W(3500);await cl();await p.evaluate(()=>{const t=document.getElementById('toast');if(t)t.style.display='none';const d=document.getElementById('areaTitle');if(d)d.style.display='none';});
  await p.screenshot({path:`ph_${tag}_${n}.jpg`,quality:75});}
 console.log(JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL/.test(e)).slice(0,5)));await b.close();})();
