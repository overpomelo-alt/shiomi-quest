const start=require('./base.js');
(async()=>{const {b,p,W,cl,errs}=await start({land:1,seat:'9'});
 await p.evaluate(()=>{const q=window.__qf();q.arriveTribe('school',true);});await W(3000);await cl();
 const res=await p.evaluate(()=>{const q=window.__qf(),P=q.P,TBX=2600,dt=1/30,out=[];
  const tp=(x,z)=>{P.pos.set(TBX+x,q.groundH(TBX+x,z),z);P.vel.set(0,0,0);P.goal=null;};
  const R=[[-42,24.8],[-47,24.8],[-50.6,27.4],[-53.6,32.6],[-52,37.6],[-50.4,39.8],[-50.6,44.3],[-56,42.8],[-62,36.6],[-73,36.6],[-79,29.6],[-82.2,31.4],[-84.5,33.8],[-84.6,43],[-80,44.5],[-66,44.4],[-57,30],[-59,27.8],[-59,24],[-59,27.8],[-66,27],[-70,24],[-70,26.6],[-75,27.6],[-75,21.2],[-64.05,21.3],[-55,24.2],[-51.4,24.7],[-53,25.5],[-46,25]];
  tp(...R[0]);for(let i=1;i<R.length;i++){const [x,z]=R[i];P.goal={x:TBX+x,z,t:0,best:1e9,st:0};let k=0;for(;k<30*25&&P.goal;k++)q.updatePlayer(dt);
    const d=Math.hypot(P.pos.x-TBX-x,P.pos.z-z),g=q.groundH(P.pos.x,P.pos.z);out.push([i,x,z,+d.toFixed(2),+(P.pos.y-g).toFixed(2),+(P.pos.y).toFixed(2),Math.round(k*dt)]);if(d>.9)tp(x,z);}
  return out;});
 res.forEach(r=>console.log(JSON.stringify(r)+(r[3]>.9?'  <-- STUCK':'')));
 console.log(JSON.stringify(errs.filter(e=>!/reqfail|Failed to load/.test(e)).slice(0,5)));await b.close();})();
