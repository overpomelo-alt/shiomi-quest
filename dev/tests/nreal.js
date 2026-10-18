const start=require('./base.js');const tag=process.argv[2];const sky=process.argv[3];const OV=JSON.parse(process.argv[4]||'{}');
const V=[["lane","s",-20,-17,2.2,0.28,8.6],["vill","s",-40,-20,0.8,0.3,8.6],["main","s",-10,-40,1.6,0.28,8.6],["road","s",30,-43,-1.2,0.28,8.6],["gate","s",-45,30,0.0,0.3,8.6],["ginza","t",0,-10,3.14,0.28,8.6]];
(async()=>{const {b,p,W,cl,errs}=await start({seat:'3'});let area='';
 await p.evaluate(OV=>{const q=window.__qf(),T=window.THREE,D=q.PS.night;for(const k in OV){if(D[k]&&D[k].isColor)D[k].set(OV[k]).convertSRGBToLinear();else if(Array.isArray(OV[k]))D[k].set(...OV[k]).normalize();else D[k]=OV[k];}},OV);await p.evaluate(s=>{window.__qf().CFGf().sky=s;},sky);await W(3000);
 for(const [n,a,x,z,yaw,pitch,dist] of V){
  if(a!==area){area=a;await p.evaluate(a=>a==='s'?window.__qf().arriveTribe('home',true):window.__qf().arriveShiomi(),a);await W(4000);await cl();}
  await p.evaluate(([a,x,z,yaw,pitch,dist])=>{const q=window.__qf();const X=a==='s'?2600+x:x;q.P.pos.set(X,a==='s'?q.tribeH(x,z):q.groundH(x,z),z);q.cam.yaw=yaw;q.cam.pitch=pitch;q.cam.dist=dist;},[a,x,z,yaw,pitch,dist]);
  await W(3500);await cl();await p.evaluate(()=>{for(const id of ['toast','areaTitle'])document.getElementById(id).style.display='none';});
  await p.screenshot({path:`nr_${tag}_${n}.jpg`,quality:75});}
 const st=await p.evaluate(()=>{const q=window.__qf();return {lamps:q.TBf().lamps,night:q.S.night,sky:q.classSky(),exp:q.S.exposure};});console.log(JSON.stringify(st));
 console.log(JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL/.test(e)).slice(0,5)));await b.close();})();
