const start=require('./base.js');
(async()=>{const {b,p,W,cl,errs}=await start({land:1,seat:'9'});
 await p.evaluate(()=>{const q=window.__qf();q.arriveTribe('home',true);});await W(3000);await cl();
 const res=await p.evaluate(()=>{const q=window.__qf(),P=q.P,TBX=2600,dt=1/30,out={stuck:[],sink:[],inside:[],walked:0,probes:0};
  const inside=()=>{const x=P.pos.x,z=P.pos.z;for(const c of q.COLS){if(x>c.x0+.08&&x<c.x1-.08&&z>c.z0+.08&&z<c.z1-.08&&P.pos.y<c.y1-.15&&P.pos.y+1.2>(c.y0==null?-6:c.y0))return c;}return null;};
  const chk=(tag)=>{const g=q.groundH(P.pos.x,P.pos.z);if(!isFinite(P.pos.y)||P.pos.y<g-.3){out.sink.push([tag,+P.pos.x.toFixed(1),+P.pos.z.toFixed(1),+(P.pos.y-g).toFixed(2)]);return true;}const c=inside();if(c){out.inside.push([tag,+P.pos.x.toFixed(1),+P.pos.z.toFixed(1)]);return true;}return false;};
  const tp=(x,z)=>{P.pos.set(x,q.groundH(x,z),z);P.vel.set(0,0,0);P.goal=null;};
  // 1) walk every Sqoyaw lane and the highway, waypoint to waypoint
  const lanes=[...q.SQ_LANES.map(L=>L.p),q.SQ_ROAD||[]];
  lanes.forEach((pts,li)=>{if(!pts||pts.length<2)return;tp(TBX+pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++){const gx=TBX+pts[i][0],gz=pts[i][1];P.goal={x:gx,z:gz,t:0,best:1e9,st:0};let bad=false;
      for(let k=0;k<30*40&&P.goal;k++){q.updatePlayer(dt);out.walked+=dt;if(!bad&&chk('lane'+li))bad=true;}
      const d=Math.hypot(P.pos.x-gx,P.pos.z-gz);if(d>.9)out.stuck.push(['lane'+li+'#'+i,+(P.pos.x-TBX).toFixed(1),+P.pos.z.toFixed(1),+d.toFixed(1)]);tp(gx,gz);}});
  // 2) random probes: walk straight for 2.5 s from random free spots (Sqoyaw incl. school & animal centre, then the town)
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const probe=(area,x0,x1,z0,z1,n,off)=>{for(let i=0;i<n;i++){const x=off+x0+rnd()*(x1-x0),z=z0+rnd()*(z1-z0);tp(x,z);if(inside())continue;for(let k=0;k<15;k++)q.updatePlayer(dt);if(Math.hypot(P.pos.x-x,P.pos.z-z)>.3||Math.abs(P.pos.y-q.groundH(P.pos.x,P.pos.z))>.05)continue;out.probes++;
    const yaw=rnd()*6.283;q.cam.yaw=yaw;q.keys.w=true;let bad=false;for(let k=0;k<75;k++){q.updatePlayer(dt);if(!bad&&chk(area))bad=true;}q.keys.w=false;}};
  probe('sqoyaw',-120,140,-110,170,260,TBX);probe('school',-90,-38,10,46,140,TBX);probe('animals',84,112,-62,-34,50,TBX);probe('town',-100,100,-100,90,260,0);
  return out;});
 console.log(JSON.stringify({walked:Math.round(res.walked),probes:res.probes,stuck:res.stuck.length,sink:res.sink.length,inside:res.inside.length}));
 console.log('STUCK',JSON.stringify(res.stuck));console.log('SINK',JSON.stringify(res.sink.slice(0,40)));console.log('INSIDE',JSON.stringify(res.inside.slice(0,40)));
 console.log(JSON.stringify(errs.filter(e=>!/reqfail|Failed to load/.test(e)).slice(0,5)));await b.close();})();
