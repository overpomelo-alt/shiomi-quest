/* ================================================================
   探險：神秘小島 (Mystery Island) & 瀑布迷宮 (Waterfall Maze)
   ================================================================ */
function advS(){if(!W.adv)W.adv={};const a=W.adv;if(!Array.isArray(a.isl))a.isl=[0,0,0];return a;}
function advCount(){const a=W.adv||{};return (a.islDone?1:0)+(a.mz?1:0);}
function normalStampCount(){return CFG.stations.filter(s=>!isHall(s)&&W.st[s.id]).length;}
function advQ(fromHall){const sts=CFG.stations.filter(s=>fromHall?isHall(s):!isHall(s));const pool=[];
  (sts.length?sts:CFG.stations).forEach(s=>(s.qs||[]).forEach(q=>{if(q&&q.q&&Array.isArray(q.o)&&q.o[q.a])pool.push(q);}));
  if(!pool.length)CFG.stations.forEach(s=>(s.qs||[]).forEach(q=>{if(q&&q.q&&Array.isArray(q.o)&&q.o[q.a])pool.push(q);}));return pick(pool);}
// ask one riddle; ok()/bad() callbacks; optional timer (seconds)
function advAsk(who,intro,q,ok,bad,timer){if(!q){say(who,['（這裡的謎題還沒準備好，請老師先出題。）']);return;}
  const opts=shuffle(q.o.map((t,k)=>({t:String(t||'').trim(),k})).filter(o=>o.t));
  choose(who,(intro?intro+'\n\n':'')+q.q,opts.map(o=>({label:o.t,fn:()=>{stopQTimer();if(o.k===+q.a)ok(q);else bad(q);}})));
  if(timer)startQTimer(timer,()=>{closeDlg();bad(q,true);});}
function runeTex(seed,hue){const [c,g]=C2(128,192),[ce,ge]=C2(128,192);g.fillStyle='#6d6b66';g.fillRect(0,0,128,192);speckle(g,128,192,900,.14);
  g.fillStyle='rgba(70,95,60,.35)';for(let i=0;i<6;i++){g.beginPath();g.arc(rr(0,128),rr(120,192),rr(8,22),0,7);g.fill();}
  ge.fillStyle='#000';ge.fillRect(0,0,128,192);const R=[...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'];
  [g,ge].forEach((x,k)=>{x.strokeStyle=k?hue:'rgba(30,28,24,.8)';x.lineWidth=k?5:4;x.beginPath();x.arc(64,58,30,0,PI*2);x.stroke();
    x.font=`700 30px serif`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=k?hue:'rgba(30,28,24,.85)';
    for(let i=0;i<3;i++)x.fillText(R[(seed*7+i*5)%R.length],34+i*30,120);x.fillText(R[(seed*3+11)%R.length],64,58);
    for(let i=0;i<3;i++)x.fillText(R[(seed*5+i*3+2)%R.length],34+i*30,158);});
  return {map:TX(c),emap:TX(ce)};}
function chestModel(parent,x,y,z,ry=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;parent.add(g);
  const wood=lam('#7a4a2a'),gold=new T.MeshLambertMaterial({color:col('#d9b24a'),emissive:col('#6a5018'),emissiveIntensity:.6});
  mk(bx(.9,.5,.6),wood,0,.25,0,g);[-.36,.36].forEach(px=>mk(bx(.07,.52,.62),gold,px,.25,0,g,false));
  const lid=new T.Group();lid.position.set(0,.5,-.3);g.add(lid);const lm=mk(cy(.3,.3,.9,12,1),wood,0,0,.3,lid);lm.rotation.z=PI/2;lm.scale.set(1,1,1);
  [-.36,.36].forEach(px=>{const b=mk(cy(.31,.31,.07,12),gold,px,0,.3,lid,false);b.rotation.z=PI/2;});mk(bx(.14,.16,.05),gold,0,-.02,.62,lid,false);
  const glow=addGlow(0,.7,0,2.2,'#ffd27a','adv',0,g);glow.material=glow.material.clone();glow.material.opacity=0;return {g,lid,glow,open:0,want:0};}
const ADV={boats:[],falls:[],chests:[],crystals:[],eyes:[],torches:[],gates:[],lastDrip:0,fallT:0};

/* ---------------- Mystery island ---------------- */
(function(){const R=ISC.r,cx=ISC.x,cz=ISC.z;
  // terrain
  const S_=2*R+10;let g=new T.PlaneGeometry(S_,S_,70,70);g.rotateX(-PI/2);g.translate(cx,0,cz);
  const p=g.attributes.position,cols=[];const sand=col('#d9c7a0'),wet=col('#a8916e'),grass=col('#5f7a45'),moss=col('#4a6a40'),c=new T.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=islandH(x,z);p.setY(i,y);const n=fbm(x*.15,z*.15);
    c.copy(wet).lerp(sand,smooth(-1.9,-1.1,y)).lerp(grass,smooth(.55,.95,y+n*.3)).lerp(moss,smooth(.55,.8,n)*smooth(.8,1.2,y));const k=.93+n*.14;cols.push(c.r*k,c.g*k,c.b*k);}
  g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
  const im=mk(g,new T.MeshLambertMaterial({vertexColors:true}),0,0,0,scene,false);im.userData.nomerge=true;
  // palms
  const palm=(x,z,s,lean)=>{const gg=new T.Group();gg.position.set(x,islandH(x,z),z);gg.rotation.y=lean;scene.add(gg);let px=0,py=0;
    for(let i=0;i<6;i++){const len=.9*s,a=.07*i;const sg=mk(cy(.12*s*(1-i*.08),.15*s*(1-i*.08),len,7),M.trunk,px,py+len/2,0,gg);sg.rotation.z=-a;px+=Math.sin(a)*len;py+=Math.cos(a)*len;}
    for(let i=0;i<8;i++){const f=new T.Group();f.position.set(px,py,0);f.rotation.y=i/8*PI*2+rr(-.2,.2);gg.add(f);const fr=mk(bx(.34*s,.04,1.9*s),M.leaf2,0,-.3*s,.95*s,f);fr.rotation.x=.5+rr(0,.25);}
    for(let i=0;i<3;i++)mk(sph(.13*s,8,6),lam('#5a4028'),px+rr(-.15,.15),py-.15,rr(-.15,.15),gg);addCol(x-.3,x+.3,z-.3,z+.3,4);};
  [[-9,4,1.1],[-7,-7,1],[8,-6,1.2],[10,3,1],[3,-11,.9],[-11,-2,.95],[5,9,.85]].forEach(([x,z,s])=>palm(cx+x,cz+z,s,rr(0,6)));
  // ruins: stone ring, arch
  const stone=lam('#8b877c',{map:plainTex('#8b877c',2400,.16)}),mossy=lam('#6d7a5c');
  const ring=mk(cy(4.2,4.4,.3,28),stone,cx,islandH(cx,cz-1)-.11,cz-1,scene,false);ring.receiveShadow=true;
  const ay=islandH(cx,cz-2.5)+.04;[-1.3,1.3].forEach(s=>{mk(bx(.55,3,.55),stone,cx+s,ay+1.5,cz-2.5);mk(bx(.6,.25,.6),mossy,cx+s,ay+.1,cz-2.5);});
  mk(bx(3.6,.45,.7),stone,cx,ay+3.2,cz-2.5);mk(bx(3.2,.2,.6),mossy,cx,ay+3.5,cz-2.5);addCol(cx-1.6,cx-1,cz-2.8,cz-2.2,5);addCol(cx+1,cx+1.6,cz-2.8,cz-2.2,5);
  [.7,2.4,3.9,5.5].forEach(a=>{const x=cx+Math.cos(a)*5.3,z=cz-1+Math.sin(a)*5.3;const h=rr(.5,1.6);const b=mk(bx(.5,h,.5),stone,x,islandH(x,z)+h/2-.1,z);b.rotation.set(rr(-.15,.15),rr(0,3),rr(-.15,.15));});
  // chest under the arch
  const ch=chestModel(scene,cx,ay,cz-2.5,0);addCol(cx-.5,cx+.5,cz-2.85,cz-2.15,1.2);ADV.islChest=ch;ADV.chests.push(ch);
  // three tablets
  const HUES=['#7ff0ff','#9cffb0','#ffe27a'],NAMES=['潮之碑','風之碑','星之碑'];ADV.tabs=[];
  [[-5.8,1],[5.8,1],[0,-7.2]].forEach(([x,z],i)=>{const tx=cx+x,tz=cz+z,ty=islandH(tx,tz);const t=runeTex(i+2,HUES[i]);
    const m=new T.MeshLambertMaterial({map:t.map,emissiveMap:t.emap,emissive:col(HUES[i]),emissiveIntensity:.05});
    const gg=new T.Group();gg.position.set(tx,ty,tz);gg.rotation.y=Math.atan2(cx-tx,(cz-1)-tz);scene.add(gg);
    mk(bx(1.1,.25,.5),stone,0,.12,0,gg);const slab=mk(bx(.9,1.4,.22),stone,0,.95,0,gg);const face=mk(new T.PlaneGeometry(.8,1.2),m,0,.95,.115,gg,false);
    const gl=addGlow(0,1.0,.3,1.8,HUES[i],'adv',0,gg);gl.material=gl.material.clone();gl.material.opacity=0;addCol(tx-.55,tx+.55,tz-.35,tz+.35,2);
    ADV.tabs.push({m,gl,name:NAMES[i],hue:HUES[i]});
    const front=l2w(gg,0,0,1.1);
    inter(new T.Vector3(front.x,islandH(front.x,front.z),front.z),1.5,()=>advS().isl[i]?`${NAMES[i]}（已點亮）`:`讀「${NAMES[i]}」的謎題`,()=>tabletTalk(i));});
  // crystals
  [[-3,7],[8,-1],[-6,-5],[4,-8.5]].forEach(([x,z],k)=>{const gx=cx+x,gz=cz+z,gy=islandH(gx,gz);const cm=new T.MeshLambertMaterial({color:col('#9fe9ff'),emissive:col('#4fd6ff'),emissiveIntensity:.5,transparent:true,opacity:.9});
    for(let i=0;i<4;i++){const cr=mk(new T.OctahedronGeometry(rr(.18,.34),0),cm,gx+rr(-.4,.4),gy+rr(.2,.45),gz+rr(-.4,.4));cr.scale.y=rr(2,3);cr.rotation.set(rr(-.4,.4),rr(0,3),rr(-.4,.4));}
    ADV.crystals.push({m:cm,g:addGlow(gx,gy+.6,gz,2.4,'#6fdcff','night',.9)});addCol(gx-.5,gx+.5,gz-.5,gz+.5,1.5);});
  // night beam over the ruins (visible from town)
  const bm=new T.MeshBasicMaterial({color:col('#7fe8ff'),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const beam=new T.Mesh(new T.CylinderGeometry(.5,1.2,60,16,1,true),bm);beam.position.set(cx,ay+30,cz-2.5);scene.add(beam);ADV.beam={m:bm,mesh:beam};
  // mist around the island
  for(let i=0;i<10;i++){const a=i/10*PI*2;addGlow(cx+Math.cos(a)*(R+2),SEA_Y+1.2,cz+Math.sin(a)*(R+2),rr(9,13),'#e8f2ff','mist',.16);}
  // message in a bottle
  const bx_=cx-9.5,bz=cz+7.5;const bottle=mk(cy(.07,.09,.34,8),new T.MeshLambertMaterial({color:col('#7ab89a'),transparent:true,opacity:.8}),bx_,islandH(bx_,bz)+.08,bz);bottle.rotation.z=PI/2.3;
  inter(new T.Vector3(bx_,islandH(bx_,bz),bz),1.4,'撿起漂流瓶',()=>{SND.pick&&SND.pick();say('漂流瓶裡的紙條',['「……三塊石碑亮起時，寶藏就會醒來。」','「寶藏裡的地圖，指向神社後方的瀑布。」','「瀑布的後面……千萬不要一個人在晚上進去。」']);});
  // dock + boat on the island
  const dockM=lam('#8a6a4a');for(let i=0;i<7;i++)mk(bx(1.6,.1,.55),dockM,cx,-1.15,cz+R-1.5+i*.62,scene,false);
  [[-.7,0],[.7,0],[-.7,3.4],[.7,3.4]].forEach(([x,z])=>mk(cy(.08,.08,2,6),M.woodDark,cx+x,-1.6,cz+R-1.3+z));
  ADV.boats.push(boatModel(cx+1.6,cz+R,PI));
  ISL.dock=new T.Vector3(cx,-.9,cz+R-2.2);
  inter(new T.Vector3(cx,-.9,cz+R-1),2.2,'搭船回小鎮',()=>islandLeave());})();
function boatModel(x,z,ry){const g=new T.Group();g.position.set(x,SEA_Y+.15,z);g.rotation.y=ry;scene.add(g);g.userData.dyn=true;
  const hull=lam('#f1ece2'),red=lam('#c8432b'),wood=lam('#8a6a4a');
  mk(bx(1.3,.5,2.8),hull,0,.25,0,g);const bow=mk(new T.ConeGeometry(.92,1.1,4,1),hull,0,.25,1.9,g);bow.rotation.set(PI/2,PI/4,0);bow.scale.set(1,1,.55);
  mk(bx(1.34,.1,2.84),red,0,.44,0,g,false);mk(bx(1.1,.06,.5),wood,0,.42,-.2,g,false);mk(bx(1.1,.06,.4),wood,0,.42,.8,g,false);
  mk(bx(.3,.45,.3),lam('#3a3a3e'),0,.5,-1.45,g);const lantern=mk(sph(.1,8,6),M.lampHead,0,1.1,1.2,g,false);mk(cy(.02,.02,.7,5),M.woodDark,0,.75,1.2,g,false);
  addGlow(0,1.1,1.2,1.2,'#ffd79a','lamp',.8,g);return {g,ph:rand()*6};}
// breakwater boat (with Ken)
ADV.boats.push(boatModel(71.2,-97.5,0));
function islandUnlocked(){return normalStampCount()>=3;}
addMarker(()=>islandUnlocked()&&!advS().islDone?new T.Vector3(73.4,.5,-97.5):null,()=>'神秘小島',()=>'info',3.1,{info:true});
inter(new T.Vector3(73.3,.5,-97.5),1.7,'搭船去神秘小島',()=>{const n=normalStampCount();
  if(n<3){say('健叔',['那座小島？聽說上面有古老的石碑，晚上還會發光呢。','等你拿到 3 個印章，我就開船載你去！',`（目前 ${n} / 3 個印章）`]);return;}
  choose('健叔',advS().islDone?'又想去小島看看啦？上船吧！':'要出發去神秘小島嗎？聽說島上有三塊會發光的石碑……',[{label:'出發！',fn:()=>islandGo()},{label:'等一下',fn:null}]);});
function islandGo(){fadeTo(()=>{ISL_IN=true;P.sit=null;const d=ISL.dock;P.pos.set(d.x,groundH(d.x,d.z-1.5),d.z-1.5);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.28;
  cam.pos.set(d.x,3,d.z+4);cam.look.set(d.x,0,d.z-2);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(d.x+1,P.pos.y,d.z-1);PETOBJ.by=P.pos.y;}
  SND.chime&&SND.chime();setTimeout(()=>toast('小船穿過薄霧，來到了神秘小島……'),500);});}
function islandLeave(){fadeTo(()=>{ISL_IN=false;P.sit=null;P.pos.set(74.3,.5,-97);P.vel.set(0,0,0);P.yaw=0;cam.yaw=PI;cam.pitch=.22;cam.pos.set(74.3,3,-102);cam.look.set(74.3,1.4,-97);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(75,.5,-96);PETOBJ.by=.5;}SND.chime&&SND.chime();});}
function tabletTalk(i){const A_=advS(),T_=ADV.tabs[i];
  if(A_.isl[i]){say(T_.name,['石碑上的符文發出柔和的光。',`（已點亮 ${A_.isl.filter(Boolean).length} / 3 塊）`]);return;}
  advAsk(T_.name,'石碑上刻著古老的文字……答對謎題，符文就會亮起來。',advQ(false),()=>{A_.isl[i]=1;save();SND.suzu&&SND.suzu();
      const n=A_.isl.filter(Boolean).length;say(T_.name,[`答對了！「${T_.name}」的符文亮起來了！（${n} / 3）`].concat(n>=3?['遠處傳來石頭移動的聲音……拱門下的寶箱在發光！']:[]));},
    (q,out)=>{SND.wrong&&SND.wrong();say(T_.name,[(out?'時間到……':'石碑上的文字暗了下去……')+`正確答案是「${q.o[q.a]}」。`,'再讀一次試試看，題目會換。']);});}
inter(new T.Vector3(ISC.x,0,ISC.z-1.2),1.6,()=>advS().islDone?'空空的寶箱':'古老的寶箱',()=>{const A_=advS(),n=A_.isl.filter(Boolean).length;
  if(A_.islDone){say('寶箱',['寶箱已經空了，只剩下一點沙子。','（地圖指向神社後面的瀑布……）']);return;}
  if(n<3){say('古老的寶箱',['寶箱被一股神秘的力量封住了，打不開。',`三塊石碑都亮起來，封印才會解開。（目前 ${n} / 3）`]);return;}
  A_.islDone=true;A_.map=true;W.furn=W.furn||{};W.furn.shell=(W.furn.shell||0)+1;W.coins+=100;save();renderPouch();ADV.islChest.want=1;SND.stamp();petEvent('stamp');
  say('寶箱打開了！',['裡面有 100 金幣、一盞閃閃發亮的「貝殼燈」（商店買不到！），還有一張泛黃的「古老地圖」。','地圖上畫著：神社後面的瀑布……瀑布裡面，是一座迷宮？！','（貝殼燈已經放進你的家具，回房間按「佈置」就能擺出來）']);});
{const it=INT[INT.length-1];it.pos.y=islandH(it.pos.x,it.pos.z);}

/* ---------------- Waterfall on the shrine hill ---------------- */
const FALL={x:-40,z:86.6};{const ced=COLS.filter(c=>c.y1===10&&c.x1-c.x0<.9&&c.z0>80);FALL.x=[-40,-38,-42,-44,-46,-48,-52,-56,-60].find(x=>ced.every(c=>Math.abs((c.x0+c.x1)/2-x)>3.6))||-40;}
(function(){const x=FALL.x,z=FALL.z;
  const rockTex=plainTex('#6a655c',3200,.18,true,g=>{for(let i=0;i<40;i++){g.fillStyle=`rgba(${rand()<.5?'40,50,35':'20,20,20'},${rr(.08,.22)})`;g.beginPath();g.ellipse(rr(0,256),rr(0,256),rr(10,40),rr(4,14),rr(0,3),0,7);g.fill();}});
  const rock=lam('#ffffff',{map:rockTex});
  // cliff behind the pool
  const cl=mk(bx(13,20,6),rock,x,6,z+3.6);
  [[-5,8,1.5,4],[5.2,6,1,3.4],[-3,15,.5,3],[3.5,16,.2,2.6],[-6.5,3,-.3,2.4],[6.4,2.6,-.2,2.2]].forEach(([dx,y,dz,s])=>{const r=mk(ico(s,0),rock,x+dx,y,z+dz+1.2);r.scale.set(1,1.2,.8);r.rotation.set(rr(0,3),rr(0,3),0);});
  // dark cave mouth
  const hole=mk(new T.CircleGeometry(1.5,20),new T.MeshBasicMaterial({color:0x05060a}),x,5.6,z+.58,scene,false);hole.scale.set(1,1.4,1);
  // water sheets
  const [wc,wg]=C2(64,256);wg.fillStyle='#b8dcea';wg.fillRect(0,0,64,256);for(let i=0;i<60;i++){wg.fillStyle=`rgba(255,255,255,${rr(.2,.7)})`;wg.fillRect(rr(0,64),rr(0,256),rr(1,4),rr(20,90));}
  for(let i=0;i<30;i++){wg.fillStyle=`rgba(60,110,140,${rr(.15,.4)})`;wg.fillRect(rr(0,64),rr(0,256),rr(1,3),rr(20,70));}
  const mkSheet=(w,h,dz,sp,op)=>{const t=TX(wc,true);t.repeat.set(1.5,h/6);const m=new T.MeshLambertMaterial({map:t,transparent:true,opacity:op,emissive:col('#3a5a6a'),emissiveIntensity:.35,depthWrite:false,side:T.DoubleSide});
    const s=mk(new T.PlaneGeometry(w,h),m,x,4+h/2,z+dz,scene,false);s.renderOrder=3;ADV.falls.push({t,sp});return s;};
  mkSheet(3.4,12,.45,1.4,.82);mkSheet(2.6,12,.35,2.1,.55);
  // pool
  const pg=new T.CircleGeometry(3,28);pg.rotateX(-PI/2);mk(pg,new T.MeshLambertMaterial({color:col('#4f8aa0'),emissive:col('#1d3a48'),emissiveIntensity:.5,transparent:true,opacity:.92}),x,4.04,z-1.4,scene,false);
  const fg=new T.RingGeometry(.4,1.6,20);fg.rotateX(-PI/2);const foam=mk(fg,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}),x,4.06,z-.2,scene,false);ADV.foam=foam;
  for(let i=0;i<11;i++){const a=PI+i/10*PI;const s=rr(.35,.6);const st=mk(ico(s,0),rock,x+Math.cos(a)*3.1,4+s*.2,z-1.4+Math.sin(a)*3.1);st.scale.y=.7;}
  for(let i=0;i<4;i++)addGlow(x+rr(-1.4,1.4),4.4+rr(0,.6),z-.2,rr(2.6,3.6),'#f0f6ff','mist',.22);
  addCol(x-6.5,x+6.5,z+.4,z+7,20);})();
addMarker(()=>advS().map&&!advS().mz?new T.Vector3(FALL.x,4,FALL.z-1.8):null,()=>'瀑布迷宮',()=>'info',3.4,{info:true});
inter(new T.Vector3(FALL.x,4,FALL.z-1.6),2,'穿過瀑布',()=>{const A_=advS();
  if(!A_.map){say('瀑布',['轟隆隆……瀑布後面好像有一個黑漆漆的洞穴。','洞裡傳來奇怪的風聲，太暗了，什麼都看不清楚。','（聽說海上的神秘小島，藏著一張古老的地圖……）']);return;}
  choose('瀑布後的洞穴',`拿著古老地圖，就能在黑暗中找到路。\n裡面有 3 道「謎題石門」，每題限時 25 秒。每次進去，迷宮的路都會改變！${A_.mz?`\n（你已經走出迷宮 ${A_.mz} 次）`:''}`,[{label:'走進迷宮',fn:()=>enterMaze()},{label:'還是算了……',fn:null}]);});

/* ---------------- Maze (enclosed zone) ---------------- */
const MZX=-120,MZZ=330,MN=8,MCS=3.2,MWH=2.7;
const MZ={g:null,cols:[],vis:null,start:null,goal:null};
const LANTERN=new T.PointLight(0xffc68a,0,12,1.5);scene.add(LANTERN);
const MZ_WALLM=lam('#ffffff',{map:(()=>{const [c,g]=C2(256,256);g.fillStyle='#4a453e';g.fillRect(0,0,256,256);speckle(g,256,256,4000,.16);
  for(let y=0;y<256;y+=42){g.fillStyle='rgba(15,12,10,.55)';g.fillRect(0,y,256,3);for(let x=((y/42)%2)*40;x<256;x+=80)g.fillRect(x,y,3,42);}
  for(let i=0;i<22;i++){g.fillStyle=`rgba(60,90,55,${rr(.12,.3)})`;g.beginPath();g.ellipse(rr(0,256),rr(150,256),rr(10,30),rr(4,12),0,0,7);g.fill();}return TX(c,true);})()});
const MZ_FLOORM=lam('#ffffff',{map:(()=>{const t=plainTex('#3b3834',4000,.18,true,g=>{for(let i=0;i<30;i++){g.fillStyle=`rgba(0,0,0,${rr(.1,.25)})`;g.beginPath();g.ellipse(rr(0,256),rr(0,256),rr(8,30),rr(4,14),rr(0,3),0,7);g.fill();}});t.repeat.set(8,8);return t;})()});
function genMaze(){const N=MN,cell=[];for(let i=0;i<N;i++){cell[i]=[];for(let j=0;j<N;j++)cell[i][j]={e:1,s:1,v:0};}
  const st=[[0,N-1]];cell[0][N-1].v=1;
  while(st.length){const [i,j]=st[st.length-1];const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[i+a,j+b,a,b]).filter(([a,b])=>a>=0&&b>=0&&a<N&&b<N&&!cell[a][b].v);
    if(!nb.length){st.pop();continue;}const [a,b,da,db]=nb[Math.floor(Math.random()*nb.length)];
    if(da===1)cell[i][j].e=0;else if(da===-1)cell[a][b].e=0;else if(db===1)cell[i][j].s=0;else cell[a][b].s=0;cell[a][b].v=1;st.push([a,b]);}
  return cell;}
function mzOpen(c,i,j,a,b){if(a<0||b<0||a>=MN||b>=MN)return false;if(a===i+1)return !c[i][j].e;if(a===i-1)return !c[a][b].e;if(b===j+1)return !c[i][j].s;return !c[a][b].s;}
function mzC(i,j){const o=MN*MCS/2;return new T.Vector3(MZX-o+(i+.5)*MCS,0,MZZ-o+(j+.5)*MCS);}
function buildMaze(){if(MZ.g){scene.remove(MZ.g);MZ.g.traverse(o=>{if(o.isInstancedMesh)o.dispose&&o.dispose();});}
  MZ.cols.forEach(c=>{const i=COLS.indexOf(c);if(i>=0)COLS.splice(i,1);});MZ.cols=[];ADV.eyes=[];ADV.torches=[];ADV.gates=[];
  INT.splice(0,INT.length,...INT.filter(it=>!it.mz));
  const c=genMaze(),N=MN,o=N*MCS/2,G=new T.Group();scene.add(G);MZ.g=G;MZ.cell=c;MZ.vis=[...Array(N)].map(()=>Array(N).fill(0));
  // BFS from the start for the farthest cell (goal)
  const S0=[0,N-1],dist={},prev={};const key=(i,j)=>i+','+j;dist[key(...S0)]=0;const q=[S0];let far=S0;
  while(q.length){const [i,j]=q.shift();if(dist[key(i,j)]>dist[key(...far)])far=[i,j];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const ni=i+a,nj=j+b;if(mzOpen(c,i,j,ni,nj)&&dist[key(ni,nj)]==null){dist[key(ni,nj)]=dist[key(i,j)]+1;prev[key(ni,nj)]=[i,j];q.push([ni,nj]);}});}
  const path=[far];while(path[0][0]!==S0[0]||path[0][1]!==S0[1])path.unshift(prev[key(...path[0])]);MZ.start=S0;MZ.goal=far;MZ.path=path;
  // floor
  const fg=new T.PlaneGeometry(N*MCS+2,N*MCS+2);fg.rotateX(-PI/2);mk(fg,MZ_FLOORM,MZX,0,MZZ,G,false);
  // walls (instanced)
  const segs=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++){const p=mzC(i,j);if(c[i][j].e&&i<N-1)segs.push([p.x+MCS/2,p.z,1]);if(c[i][j].s&&j<N-1)segs.push([p.x,p.z+MCS/2,0]);}
  for(let k=0;k<N;k++){segs.push([MZX-o,mzC(0,k).z,1],[MZX+o,mzC(0,k).z,1],[mzC(k,0).x,MZZ-o,0],[mzC(k,0).x,MZZ+o,0]);}
  const geo=new T.BoxGeometry(1,1,1);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*1.4,uv.getY(i)*1.2);
  const im=new T.InstancedMesh(geo,MZ_WALLM,segs.length);const m4=new T.Matrix4(),q4=new T.Quaternion(),sc=new T.Vector3();
  segs.forEach(([x,z,vert],k)=>{sc.set(vert?.5:MCS+.5,MWH,vert?MCS+.5:.5);m4.compose(new T.Vector3(x,MWH/2,z),q4,sc);im.setMatrixAt(k,m4);
    const cc={x0:x-sc.x/2,x1:x+sc.x/2,z0:z-sc.z/2,z1:z+sc.z/2,y0:-6,y1:MWH};COLS.push(cc);MZ.cols.push(cc);});
  im.receiveShadow=true;im.frustumCulled=false;G.add(im);
  // start: rope of light from above
  const sp=mzC(...S0);mk(cy(.04,.04,MWH+3,6),lam('#b89a6a'),sp.x-.9,(MWH+3)/2,sp.z-.9,G,false);addGlow(sp.x-.9,2.2,sp.z-.9,3,'#bfe3ff','adv',.5,G);
  const shaft=new T.Mesh(new T.CylinderGeometry(.7,1.3,8,12,1,true),new T.MeshBasicMaterial({color:col('#9fd0ff'),transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));shaft.position.set(sp.x-.9,4,sp.z-.9);G.add(shaft);
  inter(new T.Vector3(sp.x-.9,0,sp.z-.9),1.4,'拉繩子回到外面',()=>choose('繩子','要拉著繩子爬回瀑布外面嗎？（迷宮下次會變成新的路）',[{label:'回到外面',fn:()=>exitMaze()},{label:'繼續探險',fn:null}]),{mz:true});
  // gates on the solution path
  const L=path.length;[.28,.55,.8].forEach((f,gi)=>{const k=Math.max(1,Math.min(L-2,Math.round((L-1)*f)));const [i,j]=path[k],[ni,nj]=path[k+1];const a=mzC(i,j),b=mzC(ni,nj);
    const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,vert=ni!==i;const gg=new T.Group();gg.position.set(mx,0,mz);G.add(gg);
    const t=runeTex(gi+7,'#ff6a4a');const gm=new T.MeshLambertMaterial({map:t.map,emissiveMap:t.emap,emissive:col('#ff6a4a'),emissiveIntensity:.9});
    const door=new T.Group();gg.add(door);const slab=mk(new T.BoxGeometry(vert?.35:MCS-.1,MWH,vert?MCS-.1:.35),lam('#5a554c',{map:MZ_WALLM.map}),0,MWH/2,0,door,false);
    [1,-1].forEach(s=>{const f=mk(new T.PlaneGeometry(1.2,1.8),gm,vert?s*.18:0,1.35,vert?0:s*.18,door,false);f.rotation.y=vert?s*PI/2:(s>0?0:PI);});
    const cc={x0:mx-(vert?.3:MCS/2),x1:mx+(vert?.3:MCS/2),z0:mz-(vert?MCS/2:.3),z1:mz+(vert?MCS/2:.3),y0:-6,y1:MWH};COLS.push(cc);MZ.cols.push(cc);
    const gt={door,cc,open:false,y:0,i,j,ni,nj,gi};ADV.gates.push(gt);
    const ip=new T.Vector3(a.x+(b.x-a.x)*.22,0,a.z+(b.z-a.z)*.22);
    inter(ip,1.5,()=>gt.open?'（石門已經打開）':`石門的謎題（第 ${gi+1} 道）`,()=>gateTalk(gt),{mz:true});});
  // goal chest
  const gp=mzC(...far);const ch=chestModel(G,gp.x,0,gp.z-.3,0);{const cc={x0:gp.x-.5,x1:gp.x+.5,z0:gp.z-.65,z1:gp.z+.05,y0:-6,y1:1.2};COLS.push(cc);MZ.cols.push(cc);}ADV.mzChest=ch;ch.claimed=false;
  const cl=new T.MeshLambertMaterial({color:col('#bff4ff'),emissive:col('#6fdcff'),emissiveIntensity:.9});for(let i=0;i<5;i++){const cr=mk(new T.OctahedronGeometry(rr(.12,.22),0),cl,gp.x+rr(-1,1),rr(.2,.4),gp.z+rr(-1,1),G,false);cr.scale.y=2.4;}
  addGlow(gp.x,1.4,gp.z,4,'#8fe6ff','adv',.55,G);
  inter(new T.Vector3(gp.x,0,gp.z+.5),1.5,()=>ch.claimed?'沿著光走出迷宮':'打開迷宮深處的寶箱',()=>mazeChest(),{mz:true});
  // torches and eyes
  const cells=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++)cells.push([i,j]);shuffle(cells);
  cells.slice(0,11).forEach(([i,j])=>{const p=mzC(i,j);const dirs=[[.5,0,'e'],[-.5,0,'w'],[0,.5,'s'],[0,-.5,'n']].filter(([dx,dz])=>!mzOpen(c,i,j,i+Math.sign(dx),j+Math.sign(dz)));if(!dirs.length)return;
    const [dx,dz]=dirs[0];const tx=p.x+dx*(MCS-.62),tz=p.z+dz*(MCS-.62);mk(bx(.08,.5,.08),M.woodDark,tx,1.6,tz,G,false);
    const fl=addGlow(tx,1.95,tz,1.1,'#ffb35a','adv',.9,G);ADV.torches.push(fl);});
  cells.filter(([i,j])=>{let w=0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{if(!mzOpen(c,i,j,i+a,j+b))w++;});return w===3&&!(i===S0[0]&&j===S0[1])&&!(i===far[0]&&j===far[1]);}).slice(0,4).forEach(([i,j])=>{
    const p=mzC(i,j);const e=new T.Group();e.position.set(p.x+rr(-.6,.6),rr(.5,1.4),p.z+rr(-.6,.6));G.add(e);[-.12,.12].forEach(s=>{const sp_=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ff3a2a'),blending:T.AdditiveBlending,depthWrite:false,transparent:true}));sp_.position.x=s;sp_.scale.setScalar(.22);e.add(sp_);});
    ADV.eyes.push({g:e,gone:false,t:rand()*5});});}
function gateTalk(gt){if(gt.open)return;
  advAsk(`第 ${gt.gi+1} 道石門`,'石門上的紅色符文在黑暗中閃爍……（限時 25 秒）',advQ(true),()=>{gt.open=true;const i=COLS.indexOf(gt.cc);if(i>=0)COLS.splice(i,1);
      if(A.ready){const t=A.ctx.currentTime;nburst(t,1.6,'lowpass',160,.7,.8,A.sfx);tone(55,t,1.4,'sine',.35,A.sfx);}SND.suzu&&SND.suzu();toast(`石門轟隆隆地沉下去了！（${ADV.gates.filter(g=>g.open).length} / 3）`);},
    (q,out)=>{if(A.ready){const t=A.ctx.currentTime;tone(70,t,.9,'sawtooth',.12,A.sfx,40);nburst(t,.8,'lowpass',300,.8,.4,A.sfx);}
      say('石門紋風不動……',[(out?'時間到了！':'')+`正確答案是「${q.o[q.a]}」。`,'黑暗裡好像有什麼東西在笑……再試一次吧，題目會換。']);});}
function mazeChest(){const ch=ADV.mzChest,A_=advS();if(ch.claimed){exitMaze(true);return;}
  ch.claimed=true;ch.want=1;const first=!A_.mz;A_.mz=(A_.mz||0)+1;let lines;
  if(first){W.furn=W.furn||{};W.furn.crystal=(W.furn.crystal||0)+1;W.coins+=150;lines=['你走出了恐怖的瀑布迷宮！寶箱裡有 150 金幣和一盞「水晶燈」（商店買不到！）。','（水晶燈已經放進你的家具，回房間按「佈置」就能擺出來）','勇者稱號：瀑布迷宮探險家 🏅'];}
  else{W.coins+=30;lines=[`第 ${A_.mz} 次走出迷宮！寶箱裡有 30 金幣。`,'迷宮每次都會改變路線，下次再來挑戰吧！'];}
  save();renderPouch();SND.stamp();petEvent('stamp');dailyEvent('pass');say('寶箱打開了！',lines,{onEnd:()=>choose('迷宮深處','寶箱後面有一道光……',[{label:'沿著光走出去',fn:()=>exitMaze(true)},{label:'再逛一下',fn:null}])});}
function enterMaze(){buildMaze();fadeTo(()=>{INDOOR=true;MZ_IN=true;P.sit=null;const s=mzC(...MZ.start);P.pos.set(s.x,0,s.z);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=1;
  cam.pos.set(s.x,7,s.z+3);cam.look.set(s.x,1,s.z);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(s.x+.8,0,s.z+.6);PETOBJ.by=0;}$('mzMap').hidden=false;
  if(A.ready){const t=A.ctx.currentTime;tone(98,t,2.5,'sine',.25,A.sfx,65);nburst(t,2.5,'lowpass',300,.5,.3,A.sfx);}setTimeout(()=>toast('好暗……拿好地圖，找到迷宮深處的寶箱！'),600);});}
function exitMaze(win){fadeTo(()=>{INDOOR=false;MZ_IN=false;P.sit=null;P.pos.set(FALL.x,4,FALL.z-3.6);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.25;cam.pos.set(FALL.x,6.5,FALL.z-8.5);cam.look.set(FALL.x,5.2,FALL.z-3.6);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(FALL.x+1,4,FALL.z-4.2);PETOBJ.by=4;}$('mzMap').hidden=true;LANTERN.intensity=0;sky.visible=true;scene.background=null;SND.chime&&SND.chime();
  if(win)setTimeout(()=>toast('你從瀑布後面走了出來，外面的空氣好新鮮！'),500);});}
// minimap (only what you've explored)
(function(){const c=document.createElement('canvas');c.id='mzMap';c.width=176;c.height=176;c.hidden=true;document.body.appendChild(c);})();
function drawMzMap(){const cv=$('mzMap');if(!cv||cv.hidden||!MZ.cell)return;const g=cv.getContext('2d'),N=MN,s=160/N,o=8;g.clearRect(0,0,176,176);
  g.fillStyle='rgba(20,16,12,.72)';g.fillRect(0,0,176,176);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!MZ.vis[i][j])continue;g.fillStyle='rgba(222,200,150,.35)';g.fillRect(o+i*s,o+j*s,s,s);}
  g.strokeStyle='#e8d6a8';g.lineWidth=2;g.beginPath();
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!MZ.vis[i][j])continue;const x=o+i*s,y=o+j*s;
    if(!mzOpen(MZ.cell,i,j,i+1,j)){g.moveTo(x+s,y);g.lineTo(x+s,y+s);}if(!mzOpen(MZ.cell,i,j,i-1,j)){g.moveTo(x,y);g.lineTo(x,y+s);}
    if(!mzOpen(MZ.cell,i,j,i,j+1)){g.moveTo(x,y+s);g.lineTo(x+s,y+s);}if(!mzOpen(MZ.cell,i,j,i,j-1)){g.moveTo(x,y);g.lineTo(x+s,y);}}g.stroke();
  ADV.gates.forEach(gt=>{if(gt.open||!(MZ.vis[gt.i][gt.j]||MZ.vis[gt.ni][gt.nj]))return;g.fillStyle='#ff6a4a';g.fillRect(o+((gt.i+gt.ni)/2+.5)*s-4,o+((gt.j+gt.nj)/2+.5)*s-4,8,8);});
  const [si,sj]=MZ.start;g.fillStyle='#9fd0ff';g.beginPath();g.arc(o+(si+.5)*s,o+(sj+.5)*s,4,0,7);g.fill();
  const [gi,gj]=MZ.goal;if(MZ.vis[gi][gj]){g.fillStyle='#ffd27a';g.fillRect(o+(gi+.5)*s-5,o+(gj+.5)*s-5,10,10);}
  const px=o+(P.pos.x-(MZX-N*MCS/2))/MCS*s,pz=o+(P.pos.z-(MZZ-N*MCS/2))/MCS*s;g.save();g.translate(px,pz);g.rotate(-P.yaw+PI);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-6);g.lineTo(4.5,5);g.lineTo(-4.5,5);g.closePath();g.fill();g.restore();
  g.font=`700 12px ${FG}`;g.fillStyle='#e8d6a8';g.textAlign='right';g.fillText('古老地圖',170,170);}
const MZ_TINT=new T.Color(.82,.68,.55);
const MZ_FOG=new T.Color('#07080c'),MZ_HS=new T.Color('#3a4a66'),MZ_HG=new T.Color('#1a1510');
function advTick(dt){
  ADV.boats.forEach(b=>{b.ph+=dt;b.g.position.y=SEA_Y+.12+Math.sin(b.ph*1.3)*.08;b.g.rotation.z=Math.sin(b.ph*.9)*.04;b.g.rotation.x=Math.sin(b.ph*1.1)*.03;});
  ADV.falls.forEach(f=>{f.t.offset.y+=dt*f.sp*.35;});if(ADV.foam){const k=1+Math.sin(time*3)*.06;ADV.foam.scale.set(k,1,k);}
  ADV.chests.concat(ADV.mzChest?[ADV.mzChest]:[]).forEach(ch=>{ch.open=lerp(ch.open,ch.want,1-Math.exp(-dt*3));ch.lid.rotation.x=-ch.open*1.9;ch.glow.material.opacity=ch.open*.9;});
  const A_=W.adv||{};if(ADV.tabs)ADV.tabs.forEach((t,i)=>{const on=A_.isl&&A_.isl[i];t.m.emissiveIntensity=lerp(t.m.emissiveIntensity,on?1.5+Math.sin(time*2+i)*.3:.05,.08);t.gl.material.opacity=on?.7:0;});
  if(ADV.islChest&&A_.islDone&&ADV.islChest.want===0)ADV.islChest.want=1;
  const lit=A_.isl?A_.isl.filter(Boolean).length:0;
  if(ADV.islChest&&!A_.islDone&&lit>=3){ADV.islChest.glow.material.opacity=.5+.3*Math.sin(time*3);}
  ADV.beam.m.opacity=A_.islDone?0:S.night*(.1+.05*Math.sin(time*1.3))+(lit>=3?.08:0);
  ADV.crystals.forEach((c,i)=>{c.m.emissiveIntensity=.35+.9*S.night+Math.sin(time*1.5+i)*.15;});
  // waterfall sound
  if(A.ready&&!INDOOR&&started){ADV.fallT-=dt;const d=Math.hypot(P.pos.x-FALL.x,P.pos.z-FALL.z);if(ADV.fallT<=0&&d<30){ADV.fallT=.45;const t=A.ctx.currentTime;nburst(t,.9,'lowpass',700,.4,.22*clamp(1-d/30,0,1),A.sfx);}}
  if(!MZ_IN){if(LANTERN.intensity){LANTERN.intensity=0;sky.visible=true;scene.background=null;}return;}
  // --- inside the maze: darkness, lantern, drips, eyes
  scene.fog.color.copy(MZ_FOG);scene.fog.near=3;scene.fog.far=16;hemi.color.copy(MZ_HS);hemi.groundColor.copy(MZ_HG);hemi.intensity=.55;sun.intensity=0;renderer.toneMappingExposure=1;
  if(sky.visible){sky.visible=false;scene.background=MZ_FOG;}
  LANTERN.intensity=1.6+Math.sin(time*9)*.05+Math.sin(time*23)*.04;LANTERN.position.set(P.pos.x+Math.sin(P.yaw)*.3,1.7,P.pos.z+Math.cos(P.yaw)*.3);
  ADV.torches.forEach((f,i)=>{const k=1+Math.sin(time*11+i*3)*.08+Math.sin(time*17+i)*.06;f.scale.set(1.1*k,1.3*k,1);});
  const N=MN,o=N*MCS/2,ci=Math.floor((P.pos.x-(MZX-o))/MCS),cj=Math.floor((P.pos.z-(MZZ-o))/MCS);
  if(ci>=0&&cj>=0&&ci<N&&cj<N&&MZ.vis){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const i=ci+a,j=cj+b;if(i<0||j<0||i>=N||j>=N)continue;if(a===0&&b===0||mzOpen(MZ.cell,ci,cj,i,j)&&(a===0||b===0))MZ.vis[i][j]=1;}}
  ADV.gates.forEach(gt=>{if(gt.open&&gt.y>-MWH-.1){gt.y=Math.max(-MWH-.1,gt.y-dt*1.6);gt.door.position.y=gt.y;gt.door.position.x=Math.sin(time*40)*.02*(gt.y>-MWH);}});
  ADV.eyes.forEach(e=>{if(e.gone)return;e.t+=dt;const blink=(e.t%4)<.15;e.g.visible=!blink;const d=Math.hypot(P.pos.x-e.g.position.x,P.pos.z-e.g.position.z);
    if(d<3.6){e.gone=true;e.g.visible=false;if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<6;i++)tone(rr(3500,5200),t+i*.06,.05,'square',.025,A.sfx);nburst(t,.5,'bandpass',900,1,.15,A.sfx);}toast(pick(['啪嗒啪嗒——一群蝙蝠飛走了！','嚇！原來是蝙蝠……','是誰？……只是蝙蝠啦。']));}});
  if(A.ready){ADV.lastDrip-=dt;if(ADV.lastDrip<=0){ADV.lastDrip=rr(1.2,3.5);const t=A.ctx.currentTime;tone(rr(1300,2100),t,.14,'sine',.045,A.sfx,rr(500,800));if(rand()<.25)nburst(t,2.2,'lowpass',180,.5,.12,A.sfx);}}
  drawMzMap();}
// rare furniture (not sold in the catalogue)
FURN.push(
  {k:'shell',name:'貝殼燈',price:0,rare:true,type:'floor',fp:[.5,.5],build:g=>{mk(cy(.2,.24,.08,14),imat('#d8c8ac',.3),0,.04,0,g);mk(cy(.025,.025,.5,6),imat('#c9a45a',.4),0,.3,0,g);
    const sm=new T.MeshLambertMaterial({color:col('#ffe8f0'),emissive:col('#ffc2d6'),emissiveIntensity:.9,side:T.DoubleSide});const s=mk(new T.SphereGeometry(.26,16,10,0,PI*2,0,PI/2),sm,0,.55,0,g);s.scale.set(1,.8,1);
    for(let i=0;i<8;i++){const r=mk(bx(.02,.02,.5),imat('#e8b0c0',.5),0,.62,0,g,false);r.rotation.set(-.55,i/8*PI*2,0);}addGlow(0,.62,0,1.6,'#ffc2d6','lamp',.9,g);}},
  {k:'crystal',name:'水晶燈',price:0,rare:true,type:'floor',fp:[.6,.6],build:g=>{mk(cy(.26,.3,.14,8),imat('#4a4a58',.3),0,.07,0,g);
    const cm=new T.MeshLambertMaterial({color:col('#c8f4ff'),emissive:col('#6fdcff'),emissiveIntensity:.9,transparent:true,opacity:.92});
    [[0,0,.26,2.6],[.13,.06,.14,2],[-.12,-.05,.16,2.1],[.02,-.14,.12,1.8]].forEach(([x,z,r,s])=>{const c=mk(new T.OctahedronGeometry(r,0),cm,x,.14+r*s*.9,z,g);c.scale.y=s;});addGlow(0,.6,0,2,'#8fe6ff','lamp',.9,g);}});
FURN.slice(-2).forEach(f=>FURN_BY[f.k]=f);
