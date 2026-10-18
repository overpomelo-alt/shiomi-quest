/* ================================================================
   挑戰館 (Challenge Hall) — dojo on the shrine hill; harder questions, timer, gold stamps
   ================================================================ */
const CHX=-40,CHZ=330;var CH_IN=false;
const CH={door:new T.Vector3(-40.6,4,60),out:new T.Vector3(-42.2,4,60)};
function isHall(st){return /^hall/.test(st.spot||'');}
function goldList(){return CFG.stations.filter(isHall);}
// ---- exterior on the shrine plateau
(function(){const g=new T.Group();g.position.set(-37.6,4,60);g.rotation.y=-PI/2;scene.add(g);
  const wood=lam('#5a3a28'),plaster=lam('#e8dcc4'),roof=lam('#ffffff',{map:roofTex('#3d4553'),side:T.DoubleSide});
  mk(bx(5.6,.4,4.4),M.stone,0,.2,0,g);mk(bx(5,2.8,3.8),plaster,0,1.8,0,g);
  [-2.45,2.45].forEach(x=>mk(bx(.22,2.9,.22),wood,x,1.85,1.95,g));mk(bx(5.2,.22,.22),wood,0,3.2,1.95,g);mk(bx(5.2,.18,.22),wood,0,1.0,1.95,g);
  mk(bx(1.4,2.1,.08),lam('#3a2418'),0,1.45,1.93,g);
  const rg=new T.Group();rg.position.y=3.2;g.add(rg);mk(triGeo([...quad([-3.4,0,2.8],[3.4,0,2.8],[3.4,1.6,0],[-3.4,1.6,0]),...quad([3.4,0,-2.8],[-3.4,0,-2.8],[-3.4,1.6,0],[3.4,1.6,0])],new T.Vector3(0,-2,0)),roof,0,0,0,rg);
  const [c,x]=C2(96,256);x.fillStyle='#1a1410';x.fillRect(0,0,96,256);x.strokeStyle='#c9a45a';x.lineWidth=4;x.strokeRect(6,6,84,244);vtext(x,'挑戰館',48,58,56,FM,'#e8cf8a');
  mk(new T.PlaneGeometry(.42,1.1),new T.MeshBasicMaterial({map:TX(c)}),1.6,2.05,1.97,g,false);
  [-1,1].forEach(s=>{const lm=new T.MeshLambertMaterial({color:col('#f4ecdc'),emissive:col('#ffcf8a'),emissiveIntensity:1});EM.lamps.push(lm);const l=mk(sph(.22,12,10),lm,s*1.05,2.75,2.2,g);l.scale.y=1.3;addGlow(s*1.05,2.75,2.3,1.4,'#ffcf8a','lamp',.8,g);});
  addCol(-40.1,-35.2,57.5,62.5,6);})();
addMarker(()=>CH.door,()=>'挑戰館',()=>{const G=goldList();return G.length&&G.every(s=>W.st[s.id])?'done':'info';},3.4,{info:true});
inter(CH.door,1.8,'走進挑戰館',()=>enterHall());
// ---- interior
const HALL_PED=[[-3,-2],[-1,-2.6],[1,-2.6],[3,-2]];
(function(){const G=new T.Group();G.position.set(CHX,0,CHZ);scene.add(G);const RW=10,RD=8,RH=3.6;CH.g=G;
  const [fc,fg]=C2(256,256);fg.fillStyle='#8a6a4c';fg.fillRect(0,0,256,256);for(let y=0;y<256;y+=32){fg.fillStyle='rgba(40,25,15,.25)';fg.fillRect(0,y+31,256,1);for(let x=(y/32%2)*64;x<256;x+=128){fg.fillRect(x,y,1,32);}}speckle(fg,256,256,3000,.06);
  const ft=TX(fc,true);const fgeo=new T.PlaneGeometry(RW,RD+3);fgeo.rotateX(-PI/2);const uv=fgeo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*RW/2.4,uv.getY(i)*(RD+3)/2.4);
  mk(fgeo,new T.MeshLambertMaterial({map:ft,emissive:0xffffff,emissiveMap:ft,emissiveIntensity:.08}),0,0,1.5,G,false);
  const wm=lam('#d9ccb2'),dark=lam('#4a3222');
  const wall=(w,h,x,y,z,ry)=>{const m=mk(new T.PlaneGeometry(w,h),wm,x,y,z,G,false);m.rotation.y=ry;};
  wall(RW,RH,0,RH/2,-RD/2,0);wall(RD+3,RH,-RW/2,RH/2,1.5,PI/2);wall(RD+3,RH,RW/2,RH/2,1.5,-PI/2);
  const cg=new T.PlaneGeometry(RW,RD+3);cg.rotateX(PI/2);mk(cg,lam('#6e5238'),0,RH,1.5,G,false);
  for(let x=-RW/2;x<=RW/2+.01;x+=RW/5)mk(bx(.22,RH,.22),dark,x,RH/2,-RD/2+.1,G,false);mk(bx(RW,.25,.25),dark,0,RH-.12,-RD/2+.12,G,false);mk(bx(RW,.3,.1),dark,0,.15,-RD/2+.05,G,false);
  // scrolls
  [['心','#1a1410'],['學','#1a1410'],['勇','#8a2a1a']].forEach(([ch,colr],i)=>{const [c,x]=C2(96,256);x.fillStyle='#efe6d0';x.fillRect(0,0,96,256);x.fillStyle='#b8452f';x.fillRect(0,0,96,14);x.fillRect(0,242,96,14);vtext(x,ch,48,120,76,FM,colr);
    mk(new T.PlaneGeometry(.7,1.9),new T.MeshLambertMaterial({map:TX(c),emissive:0xffffff,emissiveMap:TX(c),emissiveIntensity:.25}),-2+i*2,2.1,-RD/2+.03,G,false);});
  // pedestals with glowing scrolls
  HALL_PED.forEach(([x,z],i)=>{mk(bx(.9,.8,.6),dark,x,.4,z,G);const sm=new T.MeshLambertMaterial({color:col('#f4e6c0'),emissive:col('#ffcf7a'),emissiveIntensity:.6});
    const sc=mk(cy(.09,.09,.7,10),sm,x,.9,z,G);sc.rotation.z=PI/2;addGlow(x,1.0,z,1.5,'#ffcf7a','lamp',.8,G);addCol(CHX+x-.45,CHX+x+.45,CHZ+z-.3,CHZ+z+.3,2);});
  // taiko drum & lanterns
  const tk_=mk(cy(.55,.55,.7,20),lam('#8a3a22'),-4,.75,-3.2,G);tk_.rotation.x=PI/2;mk(cy(.5,.5,.72,20),lam('#e8dcc4'),-4,.75,-3.2,G,false).rotation.x=PI/2;
  {const L=new T.PointLight(0xffd0a0,1.3,16,1.4);L.position.set(0,3,0);G.add(L);}
  const [dc,dg]=C2(128,64);dg.fillStyle='#4a3222';dg.fillRect(0,0,128,64);dg.fillStyle='#f3ead9';dg.font=`700 22px ${FG}`;dg.textAlign='center';dg.textBaseline='middle';dg.fillText('出口 ↓',64,33);
  const dm=mk(new T.PlaneGeometry(1.2,.6),new T.MeshBasicMaterial({map:TX(dc)}),0,.012,RD/2-.5,G,false);dm.rotation.x=-PI/2;
  addCol(CHX-RW/2-.3,CHX-RW/2,CHZ-RD/2,CHZ+RD/2,4);addCol(CHX+RW/2,CHX+RW/2+.3,CHZ-RD/2,CHZ+RD/2,4);addCol(CHX-RW/2,CHX+RW/2,CHZ-RD/2-.3,CHZ-RD/2,4);addCol(CHX-RW/2,CHX+RW/2,CHZ+RD/2,CHZ+RD/2+.3,4);
  inter(new T.Vector3(CHX,0,CHZ+RD/2-.6),1.4,'離開挑戰館',()=>exitHall());
  inter(new T.Vector3(CHX-4,0,CHZ-2.4),1.4,'敲太鼓',()=>{if(A.ready){const t=A.ctx.currentTime;nburst(t,.3,'lowpass',180,1,.9,A.sfx);tone(70,t,.5,'sine',.5,A.sfx);}toast('咚——！');});
  inter(new T.Vector3(CHX,0,CHZ+1),1.2,'看館長的留言',()=>{const G_=goldList(),n=G_.filter(s=>W.st[s.id]).length;say('挑戰館',['這裡的題目比較難，每題有時間限制。','全部答對就能拿到「金色印章」。',`你目前拿到 ${n} / ${G_.length} 個金章。`]);});})();
Object.assign(SPOTS,{hall1:{name:'挑戰館・第一卷軸',who:'第一卷軸',pos:new T.Vector3(CHX+HALL_PED[0][0],0,CHZ+HALL_PED[0][1]+.8),r:1.3},
  hall2:{name:'挑戰館・第二卷軸',who:'第二卷軸',pos:new T.Vector3(CHX+HALL_PED[1][0],0,CHZ+HALL_PED[1][1]+.8),r:1.3},
  hall3:{name:'挑戰館・第三卷軸',who:'第三卷軸',pos:new T.Vector3(CHX+HALL_PED[2][0],0,CHZ+HALL_PED[2][1]+.8),r:1.3},
  hall4:{name:'挑戰館・第四卷軸',who:'第四卷軸',pos:new T.Vector3(CHX+HALL_PED[3][0],0,CHZ+HALL_PED[3][1]+.8),r:1.3}});
function enterHall(){fadeTo(()=>{INDOOR=true;CH_IN=true;P.sit=null;P.pos.set(CHX,0,CHZ+2.6);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.3;cam.pos.set(CHX,3,CHZ+6);cam.look.set(CHX,1,CHZ);SND.chime&&SND.chime();curArea=null;areaCoolReset();
  if(PETOBJ){PETOBJ.g.position.set(CHX+1.2,0,CHZ+2.8);PETOBJ.by=0;}});}
function exitHall(){fadeTo(()=>{INDOOR=false;CH_IN=false;P.pos.copy(CH.out);P.vel.set(0,0,0);P.yaw=-PI/2;cam.yaw=PI/2;cam.pitch=.22;cam.pos.set(CH.out.x+5,6.5,CH.out.z);cam.look.set(CH.out.x,5.2,CH.out.z);curArea=null;areaCoolReset();
  if(PETOBJ){PETOBJ.g.position.set(CH.out.x-1,4,CH.out.z+.5);PETOBJ.by=4;}SND.chime&&SND.chime();});}
function areaCoolReset(){areaCool=0;}
// ---- per-question timer overlay
const QT_T={id:0};
function startQTimer(sec,onOut){stopQTimer();const el_=$('qTimer');el_.hidden=false;const t0=performance.now();const id=++QT_T.id;
  const tick=()=>{if(QT_T.id!==id)return;const left=Math.max(0,sec-(performance.now()-t0)/1000);el_.querySelector('b').textContent=Math.ceil(left);el_.querySelector('i').style.width=(left/sec*100)+'%';el_.classList.toggle('low',left<6);
    if(left<=0){stopQTimer();onOut();return;}requestAnimationFrame(tick);};tick();}
function stopQTimer(){QT_T.id++;const e=$('qTimer');if(e)e.hidden=true;}
