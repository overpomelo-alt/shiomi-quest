/* ================================================================
   老師的山上小屋 (Teacher's cabin / office): pomodoro, exercise, weight (private), reading diary, class reading plan
   ================================================================ */
const TCX=120,TCZ=330,TC_W=12,TC_D=7,TC_RH=3.2;var TC_IN=false;
const TC={items:[],pomMesh:null,boardCanvas:null,boardTex:null};
const TDAY=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function normTL(t){t=JSON.parse(JSON.stringify(t||{}));t.ex=Array.isArray(t.ex)?t.ex:[];t.reads=Array.isArray(t.reads)?t.reads:[];t.pom=t.pom&&typeof t.pom==='object'?t.pom:{};
  t.plan=Object.assign({title:'全班閱讀計畫',goal:10,books:[],note:''},t.plan||{});if(!Array.isArray(t.plan.books))t.plan.books=[];t.at=+t.at||0;return t;}
let TL=null,TL_DIRTY=false;
function tlLoad(){let loc=null;try{loc=JSON.parse(localStorage.getItem('shiomi-tlog')||'null');}catch(e){}const pub=normTL(CFG.teacher);
  if(IS_T&&loc&&(+loc.at||0)>pub.at){TL=normTL(loc);TL_DIRTY=true;}else{TL=pub;TL_DIRTY=false;}return TL;}
function tlSave(){TL.at=Date.now();TL_DIRTY=true;try{localStorage.setItem('shiomi-tlog',JSON.stringify(TL));}catch(e){}refreshTcBoard();}
function wtLoad(){try{const a=JSON.parse(localStorage.getItem('shiomi-tweight')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function wtSave(a){try{localStorage.setItem('shiomi-tweight',JSON.stringify(a));}catch(e){}}
function exWeek(){const out=[];const now=new Date();for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const k=TDAY(d);out.push({k,lab:'日一二三四五六'[d.getDay()],min:TL.ex.filter(e=>e.d===k).reduce((s,e)=>s+(+e.min||0),0)});}return out;}
function exStreak(){const days=new Set(TL.ex.filter(e=>+e.min>0).map(e=>e.d));let n=0;const d=new Date();if(!days.has(TDAY(d)))d.setDate(d.getDate()-1);while(days.has(TDAY(d))){n++;d.setDate(d.getDate()-1);}return n;}
function pomWeek(){let n=0;const d=new Date();for(let i=0;i<7;i++){n+=+TL.pom[TDAY(d)]||0;d.setDate(d.getDate()-1);}return n;}

/* ---------- exterior: cabin on the hill + trail sign on the shrine plateau ---------- */
(function(){const x=-80,z=104,y=hillH(x,z);const g=new T.Group();g.position.set(x,y,z);g.rotation.y=.5;scene.add(g);
  const logM=lam('#8a5a3a'),dark=lam('#4a3222');mk(bx(7,1.2,5.5),M.stone,0,-.3,0,g);mk(bx(6,3,4.5),logM,0,1.8,0,g);
  for(let i=0;i<7;i++)mk(bx(6.1,.08,4.6),dark,0,.45+i*.45,0,g,false);
  const rg=new T.Group();rg.position.y=3.3;g.add(rg);mk(triGeo([...quad([-3.6,0,2.9],[3.6,0,2.9],[3.6,1.9,0],[-3.6,1.9,0]),...quad([3.6,0,-2.9],[-3.6,0,-2.9],[-3.6,1.9,0],[3.6,1.9,0])],new T.Vector3(0,-2,0)),lam('#ffffff',{map:roofTex('#6a3c2c'),side:T.DoubleSide}),0,0,0,rg);
  mk(bx(.6,2,.6),M.stone,1.8,4.4,-.8,g);
  const wm=new T.MeshLambertMaterial({color:col('#3a2a1a'),emissive:col('#ffc97a'),emissiveIntensity:0});EM.windows.push(wm);
  [-1.6,1.6].forEach(px=>mk(new T.PlaneGeometry(1,.9),wm,px,2,2.27,g,false));mk(new T.PlaneGeometry(1,1.9),lam('#5a3a24'),0,1.25,2.27,g,false);
  addGlow(0,3.2,2.6,4,'#ffc97a','lamp',.6,g);addGlow(-1.6,2,2.5,2.4,'#ffc97a','night',.6,g);addGlow(1.6,2,2.5,2.4,'#ffc97a','night',.6,g);
  // trail sign
  const sx=-64.6,sz=79;const sg=new T.Group();sg.position.set(sx,4,sz);sg.rotation.y=PI/2;scene.add(sg);mk(cy(.07,.08,1.8,6),M.woodDark,0,.9,0,sg);
  const [c,cx_]=C2(256,96);cx_.fillStyle='#8a6446';cx_.fillRect(0,0,256,96);cx_.strokeStyle='#4a3222';cx_.lineWidth=6;cx_.strokeRect(3,3,250,90);cx_.fillStyle='#f3ead9';cx_.font=`700 38px ${FG}`;cx_.textAlign='center';cx_.textBaseline='middle';cx_.fillText('← 山上小屋',128,50);
  const bd=mk(new T.PlaneGeometry(1.3,.48),new T.MeshLambertMaterial({map:TX(c),side:T.DoubleSide}),0,1.55,.05,sg);addCol(sx-.15,sx+.15,sz-.15,sz+.15,2);})();
addMarker(()=>W.tcSeen?null:new T.Vector3(-64.2,4,79),()=>'老師的小屋',()=>'info',2.9,{info:true});
inter(new T.Vector3(-64.2,4,79),1.8,'走山路去老師的小屋',()=>enterCabin());

/* ---------- interior ---------- */
(function(){const G=new T.Group();G.position.set(TCX,0,TCZ);scene.add(G);TC.g=G;const W_=TC_W/2,D_=TC_D/2,EXT=3.8,RH=TC_RH;
  const logTex=(()=>{const [c,g]=C2(256,256);for(let y=0;y<256;y+=32){const gr=g.createLinearGradient(0,y,0,y+32);gr.addColorStop(0,'#a8744c');gr.addColorStop(.5,'#c08a5c');gr.addColorStop(1,'#7e5436');g.fillStyle=gr;g.fillRect(0,y,256,32);g.fillStyle='rgba(50,30,18,.55)';g.fillRect(0,y+30,256,2);}speckle(g,256,256,1500,.07);return TX(c,true);})();
  const tileTex=(()=>{const [c,g]=C2(128,128);g.fillStyle='#e9eef0';g.fillRect(0,0,128,128);g.fillStyle='#b9c7cc';for(let i=0;i<=128;i+=32){g.fillRect(i,0,2,128);g.fillRect(0,i,128,2);}return TX(c,true);})();
  const plank=(()=>{const [c,g]=C2(256,256);g.fillStyle='#9a6c46';g.fillRect(0,0,256,256);for(let x=0;x<256;x+=32){g.fillStyle=`rgba(${rand()<.5?'60,35,20':'150,100,60'},.25)`;g.fillRect(x,0,32,256);g.fillStyle='rgba(40,25,15,.4)';g.fillRect(x+31,0,1,256);}speckle(g,256,256,2000,.06);return TX(c,true);})();
  const wallM=new T.MeshLambertMaterial({map:logTex,emissive:0xffffff,emissiveMap:logTex,emissiveIntensity:.12});
  const tileM=new T.MeshLambertMaterial({map:tileTex,emissive:0xffffff,emissiveMap:tileTex,emissiveIntensity:.15});
  const rep=(geo,u,v)=>{const a=geo.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,a.getX(i)*u,a.getY(i)*v);return geo;};
  // floor (extends toward the camera), ceiling, walls
  const fg=rep(new T.PlaneGeometry(TC_W,TC_D+EXT),TC_W/2.4,(TC_D+EXT)/2.4);fg.rotateX(-PI/2);mk(fg,new T.MeshLambertMaterial({map:plank,emissive:0xffffff,emissiveMap:plank,emissiveIntensity:.1}),0,0,EXT/2,G,false);
  const bf=rep(new T.PlaneGeometry(3.3,TC_D),3.3/1.2,TC_D/1.2);bf.rotateX(-PI/2);mk(bf,tileM,W_-1.65,.006,0,G,false);
  const cg=new T.PlaneGeometry(TC_W,TC_D+EXT);cg.rotateX(PI/2);mk(cg,lam('#6e4c33'),0,RH,EXT/2,G,false);
  for(let x=-W_;x<=W_;x+=2)mk(bx(.18,.2,TC_D+EXT),lam('#5a3a24'),x,RH-.1,EXT/2,G,false);
  const wall=(w,h,x,y,z,ry,m=wallM,u=w/2.4)=>{const geo=rep(new T.PlaneGeometry(w,h),u,h/2.4);const mm=mk(geo,m,x,y,z,G,false);mm.rotation.y=ry;return mm;};
  wall(TC_W,RH,0,RH/2,-D_,0);wall(TC_D+EXT,RH,-W_,RH/2,EXT/2,PI/2);wall(TC_D+EXT,RH,W_,RH/2,EXT/2,-PI/2);
  // bathroom tiles on its back wall
  wall(3.3,RH,W_-1.65,RH/2,-D_+.01,0,tileM,3.3/1.2);
  // partitions (kitchen | office | bathroom), with a way through at the front
  const part=(x,m)=>{mk(bx(.16,RH,TC_D-1.7),m,x,RH/2,-D_+(TC_D-1.7)/2,G,false);addCol(TCX+x-.1,TCX+x+.1,TCZ-D_,TCZ-D_+TC_D-1.7,4);};
  part(-2.7,lam('#9a6a44'));part(2.7,lam('#e3e8ea'));
  // window with a mountain view (office back wall)
  const [vc,vg]=C2(256,160);const sk=vg.createLinearGradient(0,0,0,160);sk.addColorStop(0,'#8fb6d8');sk.addColorStop(1,'#f3d9b8');vg.fillStyle=sk;vg.fillRect(0,0,256,160);
  [['#6d88a0',70,.5],['#4f6b5a',100,.8],['#3c5a44',125,1]].forEach(([c,h,k])=>{vg.fillStyle=c;vg.beginPath();vg.moveTo(0,160);for(let x=0;x<=256;x+=16)vg.lineTo(x,h-Math.sin(x*.03*k+k*3)*22*k-Math.sin(x*.09)*8);vg.lineTo(256,160);vg.fill();});
  const vt=TX(vc);mk(new T.PlaneGeometry(1.5,1.0),new T.MeshBasicMaterial({map:vt}),-1.7,1.9,-D_+.02,G,false);
  [[0,.55,1.62,.08],[0,-.55,1.62,.08],[-.78,0,.08,1.1],[.78,0,.08,1.1],[0,0,.05,1.0]].forEach(([dx,dy,w,h])=>mk(bx(w,h,.08),lam('#f3ead9'),-1.7+dx,1.9+dy,-D_+.05,G,false));
  addGlow(-1.7,1.9,-D_+.3,2.6,'#fff3dd','day',.25,G);
  // ---- office: desk, chair, bookshelf, tomato clock, achievement board, reading chair, exercise corner
  const wood=imat('#7e5638',.3),woodL=imat('#b08a5e',.3);
  mk(bx(2,.07,.8),woodL,.6,.76,-D_+.5,G);[[-.35,-.3],[1.55,-.3],[-.35,.3],[1.55,.3]].forEach(([x,z])=>mk(bx(.06,.74,.06),wood,x,.37,-D_+.5+z,G));
  mk(bx(.7,.44,.03),imat('#2a2a30',.2),.9,1.1,-D_+.3,G);mk(bx(.64,.38,.01),new T.MeshBasicMaterial({color:col('#9fc2e0')}),.9,1.1,-D_+.32,G,false);mk(bx(.08,.18,.08),imat('#2a2a30',.2),.9,.86,-D_+.3,G,false);
  mk(bx(.4,.02,.14),imat('#e8e4dc',.4),.9,.8,-D_+.62,G,false);mk(cy(.05,.04,.1,10),imat('#f3ead9',.4),1.45,.84,-D_+.55,G,false);
  // tomato clock
  const tg=new T.Group();tg.position.set(.05,.8,-D_+.55);G.add(tg);const tom=mk(sph(.14,16,12),imat('#e04a2e',.45),0,.12,0,tg);tom.scale.y=.85;
  const leaf=mk(new T.ConeGeometry(.08,.06,5),imat('#4f9a3a',.4),0,.24,0,tg);const dial=new T.Group();dial.position.set(0,.12,.13);tg.add(dial);mk(bx(.012,.07,.01),imat('#fff',.6),0,.03,0,dial,false);TC.dial=dial;TC.tom=tg;
  // chair
  mk(bx(.5,.06,.5),wood,.6,.46,-D_+1.25,G);mk(bx(.5,.6,.06),wood,.6,.78,-D_+1.5,G);[[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]].forEach(([x,z])=>mk(bx(.05,.44,.05),wood,.6+x,.22,-D_+1.25+z,G));
  addCol(TCX-.45,TCX+1.65,TCZ-D_,TCZ-D_+.95,2);
  // bookshelf
  mk(bx(1.1,2.2,.4),wood,2.05,1.1,-D_+.22,G);for(let r=0;r<4;r++){mk(bx(1.02,.04,.36),woodL,2.05,.3+r*.5,-D_+.24,G,false);for(let i=0;i<8;i++){if(rand()<.2)continue;const h=rr(.26,.38);mk(bx(.09,h,.26),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c','#8a6ad0','#e8dcc4']),.35),1.62+i*.12,.32+r*.5+h/2,-D_+.26,G,false);}}
  addCol(TCX+1.5,TCX+2.6,TCZ-D_,TCZ-D_+.45,3);
  // achievement board (canvas)
  const [bc]=C2(1024,576);TC.boardCanvas=bc;TC.boardTex=TX(bc);mk(bx(2.46,1.42,.06),imat('#5a3a24',.3),.6,2.05,-D_+.05,G,false);
  mk(new T.PlaneGeometry(2.36,1.32),new T.MeshBasicMaterial({map:TC.boardTex}),.6,2.05,-D_+.09,G,false);
  // reading armchair + lamp + rug
  const rugG=new T.CylinderGeometry(1.1,1.1,.02,28);mk(rugG,imat('#9a5a48',.3),-1.3,.01,.6,G,false);mk(new T.CylinderGeometry(.9,.9,.025,28),imat('#e8dcc4',.3),-1.3,.012,.6,G,false);
  const ac=new T.Group();ac.position.set(-1.9,0,.4);ac.rotation.y=.6;G.add(ac);const F='#5f7a55',Cc='#8aa37a';mk(bx(.84,.26,.78),imat(F,.3),0,.2,0,ac);mk(bx(.62,.12,.6),imat(Cc,.35),0,.39,.05,ac);mk(bx(.84,.55,.16),imat(F,.3),0,.6,-.32,ac);[-.36,.36].forEach(x=>mk(bx(.14,.34,.78),imat(F,.3),x,.44,0,ac));
  addCol(TCX-2.35,TCX-1.45,TCZ-.05,TCZ+.85,1);
  mk(cy(.02,.02,1.5,6),imat('#3a3a3e',.3),-2.35,.75,-.35,G);const lm=new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:.9});mk(cy(.16,.26,.32,14),lm,-2.35,1.6,-.35,G,false);addGlow(-2.35,1.55,-.35,2.2,'#ffd79a','adv',.9,G);
  // exercise corner: yoga mat + dumbbells + jump rope
  const mat=mk(bx(.7,.02,1.7),imat('#4a9be0',.35),1.6,.012,1.3,G,false);[[1.15,.9],[1.15,1.2]].forEach(([x,z])=>{const d=mk(cy(.035,.035,.34,8),imat('#3a3a3e',.3),x,.08,z,G,false);d.rotation.z=PI/2;[-.14,.14].forEach(s=>mk(cy(.07,.07,.07,10),imat('#e04a2e',.4),x+s,.08,z,G,false).rotation.z=PI/2);});
  // pennant "以身作則"
  const [pc,pg]=C2(256,64);pg.fillStyle='#b8452f';pg.fillRect(0,0,256,64);pg.fillStyle='#fff3dd';pg.font=`700 34px ${FG}`;pg.textAlign='center';pg.textBaseline='middle';pg.fillText('以身作則・一起加油',128,34);
  const pn=mk(new T.PlaneGeometry(1.6,.4),new T.MeshBasicMaterial({map:TX(pc)}),W_-3.3-.02,2.35,.9,G,false);pn.rotation.y=-PI/2;
  // ---- kitchen
  const kx=-W_+1.6;mk(bx(2.9,.88,.6),imat('#e8dcc4',.3),-W_+1.65,.44,-D_+.32,G);mk(bx(2.96,.05,.66),imat('#6e5238',.3),-W_+1.65,.9,-D_+.33,G);
  mk(bx(.5,.02,.36),imat('#9aa4aa',.4),-W_+1.2,.93,-D_+.33,G,false);[[-W_+2.3,-.1],[-W_+2.6,-.1],[-W_+2.3,.12],[-W_+2.6,.12]].forEach(([x,dz])=>mk(cy(.08,.08,.015,14),imat('#2a2a30',.2),x,.935,-D_+.33+dz,G,false));
  mk(bx(2.9,.6,.34),imat('#c8b89a',.3),-W_+1.65,2.2,-D_+.18,G);const kt=mk(sph(.1,10,8),imat('#c9432a',.4),-W_+2.45,1.0,-D_+.3,G,false);kt.scale.y=.8;
  mk(bx(.7,1.9,.66),imat('#f1ece2',.4),-W_+.4,.95,-.9,G);mk(bx(.03,.4,.03),imat('#9aa4aa',.4),-W_+.77,1.2,-.7,G,false);addCol(TCX-W_,TCX-W_+.8,TCZ-1.25,TCZ-.55,3);
  addCol(TCX-W_,TCX-W_+3.1,TCZ-D_,TCZ-D_+.65,2);
  const tb=new T.Group();tb.position.set(kx+.2,0,.9);G.add(tb);mk(cy(.5,.5,.05,20),woodL,0,.72,0,tb);mk(cy(.05,.07,.7,8),wood,0,.35,0,tb);mk(cy(.07,.06,.1,10),imat('#f3ead9',.4),.1,.8,.05,tb,false);
  [[-.75,0],[.75,0]].forEach(([dx])=>{mk(bx(.4,.05,.4),wood,dx,.45,0,tb);mk(bx(.05,.45,.4),wood,dx+(dx<0?-.18:.18),.68,0,tb);});addCol(TCX+kx+.2-.55,TCX+kx+.2+.55,TCZ+.4,TCZ+1.4,1);
  // ---- bathroom
  const bxX=W_-1.65;const tub=new T.Group();tub.position.set(bxX+.3,0,-D_+.55);G.add(tub);mk(bx(2,.55,.9),imat('#f7f5ee',.45),0,.275,0,tub);mk(bx(1.8,.02,.7),new T.MeshLambertMaterial({color:col('#9fd6ea'),emissive:col('#4a90b0'),emissiveIntensity:.35}),0,.5,0,tub,false);
  mk(cy(.02,.02,.3,6),imat('#c0c6ca',.5),.85,.75,-.3,tub,false);addCol(TCX+bxX-.7,TCX+bxX+1.3,TCZ-D_,TCZ-D_+1.05,1);
  const tl=new T.Group();tl.position.set(W_-.35,0,-.6);tl.rotation.y=-PI/2;G.add(tl);mk(cy(.2,.16,.4,12),imat('#f7f5ee',.45),0,.2,0,tl);mk(bx(.4,.45,.18),imat('#f7f5ee',.45),0,.45,-.25,tl);mk(cy(.22,.22,.04,14),imat('#f1ece2',.45),0,.42,.02,tl,false);addCol(TCX+W_-.7,TCX+W_,TCZ-.9,TCZ-.3,1);
  mk(bx(.6,.14,.4),imat('#f7f5ee',.45),bxX-1.05,.85,.35,G);mk(cy(.03,.03,.8,6),imat('#c0c6ca',.5),bxX-1.05,.42,.35,G,false);
  const mir=mk(new T.PlaneGeometry(.5,.7),new T.MeshPhongMaterial({color:col('#cfe0e8'),specular:0xffffff,shininess:90,emissive:col('#4a5a64')}),bxX-1.33,1.6,.35,G,false);mir.rotation.y=PI/2;
  mk(bx(.04,.04,.7),imat('#c0c6ca',.5),W_-.05,1.3,.9,G,false);mk(bx(.03,.5,.5),imat('#ec8fb0',.4),W_-.07,1.08,.9,G,false);
  // outer colliders (open front only near the door)
  addCol(TCX-W_-.3,TCX-W_,TCZ-D_,TCZ+D_,4);addCol(TCX+W_,TCX+W_+.3,TCZ-D_,TCZ+D_,4);addCol(TCX-W_,TCX+W_,TCZ-D_-.3,TCZ-D_,4);addCol(TCX-W_,TCX+W_,TCZ+D_,TCZ+D_+.3,4);
  const [dc,dg]=C2(128,64);dg.fillStyle='#4a3222';dg.fillRect(0,0,128,64);dg.fillStyle='#f3ead9';dg.font=`700 22px ${FG}`;dg.textAlign='center';dg.textBaseline='middle';dg.fillText('出口 ↓',64,33);
  const dm=mk(new T.PlaneGeometry(1.2,.6),new T.MeshBasicMaterial({map:TX(dc)}),0,.012,D_-.45,G,false);dm.rotation.x=-PI/2;
  // interactions
  const P_=(x,z)=>new T.Vector3(TCX+x,0,TCZ+z);
  inter(P_(0,D_-.6),1.3,'離開小屋',()=>exitCabin());
  inter(P_(.5,-D_+1.5),1.2,'坐到辦公桌前',()=>openCabin(IS_T?'ex':'ex'));
  inter(P_(-.3,-D_+1.3),1.0,'番茄任務時鐘',()=>openCabin('pom'));
  inter(P_(2.05,-D_+.9),1.2,'全班閱讀計畫',()=>openCabin('plan'));
  inter(P_(1.6,1.3),1.2,'運動角',()=>openCabin('ex'));
  inter(P_(-1.6,1.0),1.2,'老師的閱讀日記',()=>openCabin('rd'));
  inter(P_(kx+.2,1.8),1.3,'廚房',()=>say('小廚房',['水壺咕嘟咕嘟地響，老師常在這裡煮一杯熱茶。','冰箱上貼著一張紙條：「多吃蔬菜，早點睡覺！」']));
  inter(P_(bxX,.9),1.3,'浴室',()=>say('浴室',['這是老師的私人浴室。','浴缸裡放好了熱水……咳咳，我們還是回客廳吧！']));})();

/* ---------- board texture ---------- */
function refreshTcBoard(){if(!TC.boardCanvas)return;if(!TL)tlLoad();const g=TC.boardCanvas.getContext('2d'),Wc=1024,Hc=576;
  g.fillStyle='#f4ead6';g.fillRect(0,0,Wc,Hc);speckle(g,Wc,Hc,1400,.05);
  g.fillStyle='#b8452f';g.fillRect(0,0,Wc,64);g.fillStyle='#fff3dd';g.font=`700 36px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('老師的成果牆',28,34);
  g.font=`500 22px ${FG}`;g.textAlign='right';g.fillText('以身作則・一起加油！',Wc-26,36);
  const wk=exWeek(),tot=wk.reduce((s,d)=>s+d.min,0),mx=Math.max(30,...wk.map(d=>d.min));
  g.textAlign='left';g.fillStyle='#3a2a20';g.font=`700 28px ${FG}`;g.fillText('本週運動',30,104);g.font=`500 22px ${FG}`;g.fillStyle='#7a5a40';g.fillText(`共 ${tot} 分鐘・連續 ${exStreak()} 天`,30,140);
  wk.forEach((d,i)=>{const x=36+i*56,h=d.min/mx*230;g.fillStyle=d.min?'#4a9be0':'#d8cbb2';g.fillRect(x,430-Math.max(4,h),36,Math.max(4,h));g.fillStyle='#3a2a20';g.font=`500 20px ${FG}`;g.textAlign='center';g.fillText(d.lab,x+18,456);if(d.min){g.font=`700 17px ${FG}`;g.fillText(d.min,x+18,418-h);}g.textAlign='left';});
  g.fillStyle='rgba(58,42,32,.2)';g.fillRect(440,90,2,440);
  g.fillStyle='#3a2a20';g.font=`700 28px ${FG}`;g.fillText('老師最近在讀',470,104);
  const rd=TL.reads.slice(-4).reverse();g.font=`500 23px ${FG}`;if(!rd.length){g.fillStyle='#9a8a70';g.fillText('（還沒有紀錄）',470,150);}
  rd.forEach((r,i)=>{g.fillStyle='#3a2a20';g.fillText(`📖 ${String(r.book).slice(0,14)}`,470,152+i*44);g.fillStyle='#9a7a5a';g.font=`500 17px ${FG}`;g.fillText(r.d.slice(5).replace('-','/'),940,152+i*44);g.font=`500 23px ${FG}`;});
  g.fillStyle='#3a2a20';g.font=`700 26px ${FG}`;g.fillText(`🍅 本週專注 ${pomWeek()} 顆番茄`,470,358);
  const pl=TL.plan;g.font=`700 26px ${FG}`;g.fillText(`📚 ${pl.title}`,470,414);g.font=`500 21px ${FG}`;g.fillStyle='#7a5a40';g.fillText(`目標：每人讀 ${pl.goal} 本書${pl.books.length?`・推薦 ${pl.books.length} 本`:''}`,470,450);
  if(TL_DIRTY&&IS_T){g.fillStyle='#b8452f';g.font=`700 18px ${FG}`;g.fillText('（有新紀錄還沒發布）',470,520);}
  TC.boardTex.needsUpdate=true;}

/* ---------- enter / exit ---------- */
function enterCabin(){tlLoad();fadeTo(()=>{INDOOR=true;TC_IN=true;W.tcSeen=true;save();P.sit=null;P.pos.set(TCX,0,TCZ+2.4);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;
  cam.pos.set(TCX,3,TCZ+6.5);cam.look.set(TCX,.5,TCZ);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(TCX+1,0,TCZ+2.6);PETOBJ.by=0;}refreshTcBoard();SND.chime&&SND.chime();
  setTimeout(()=>toast(IS_T?'歡迎回來，老師！辦公桌可以記錄運動、體重和閱讀':'這裡是老師的山上小屋，看看老師的成果牆吧！'),500);});}
function exitCabin(){closeCabin();fadeTo(()=>{INDOOR=false;TC_IN=false;P.pos.set(-62.8,4,79);P.vel.set(0,0,0);P.yaw=PI/2;cam.yaw=-PI/2;cam.pitch=.22;cam.pos.set(-67.5,6.5,79);cam.look.set(-62.8,5.2,79);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(-62.2,4,80);PETOBJ.by=4;}SND.chime&&SND.chime();});}

/* ---------- pomodoro ---------- */
const POM={mode:'focus',len:25*60,left:25*60,run:false,end:0,task:''};
const POM_MODES={focus:['專注',25],short:['短休息',5],long:['長休息',15]};
function pomSet(mode,min){POM.mode=mode;POM.len=(min||POM_MODES[mode][1])*60;POM.left=POM.len;POM.run=false;}
function pomToggle(){if(POM.run){POM.left=Math.max(0,(POM.end-Date.now())/1000);POM.run=false;}else{POM.end=Date.now()+POM.left*1000;POM.run=true;audioInit&&audioInit();}}
function pomDone(){POM.run=false;const was=POM.mode;if(A.ready){const t=A.ctx.currentTime;[0,.35,.7].forEach(d=>{tone(1318.5,t+d,.6,'sine',.12,A.sfx);tone(2637,t+d,.3,'sine',.03,A.sfx);});}
  if(was==='focus'){const k=TDAY();if(IS_T){if(!TL)tlLoad();TL.pom[k]=(+TL.pom[k]||0)+1;tlSave();}else{W.pomo=W.pomo||{};W.pomo[k]=(+W.pomo[k]||0)+1;save();}
    toast(`🍅 完成一顆番茄${POM.task?`：「${POM.task}」`:''}！休息 5 分鐘吧`);pomSet('short');}
  else{toast('休息結束！準備好下一顆番茄了嗎？');pomSet('focus');}
  if(CB.tab==='pom'&&!$('cabin').hidden)renderCabin();}
function fmtT(s){s=Math.ceil(s);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

/* ---------- office panel ---------- */
const CB={tab:'ex'};
function openCabin(tab){if(DLG.open)closeDlg();if(!TL)tlLoad();CB.tab=tab||'ex';if(CB.tab==='wt'&&!IS_T)CB.tab='ex';$('cabin').hidden=false;renderCabin();}
function closeCabin(){if($('cabin').hidden)return;$('cabin').hidden=true;cv.focus({preventScroll:true});}
function cbIn(type,val,attrs={}){const i=el(type==='textarea'?'textarea':'input',Object.assign(type==='textarea'?{class:'nb-in'}:{type,class:'nb-in'},attrs));i.value=val==null?'':val;return i;}
function renderCabin(){const tabs=$('cbTabs'),B=$('cbBody');tabs.innerHTML='';B.innerHTML='';
  const T_=[['ex','🏃 運動'],['rd','📖 閱讀日記'],['plan','📚 全班閱讀'],['pom','🍅 番茄鐘']];if(IS_T)T_.splice(1,0,['wt','⚖️ 體重']);
  T_.forEach(([k,l])=>{const b=el('button',{type:'button',text:l,'aria-selected':String(CB.tab===k)});b.onclick=()=>{CB.tab=k;renderCabin();};tabs.appendChild(b);});
  const card=(kids,cls='')=>{const c=el('div',{class:'nb-card '+cls},kids);B.appendChild(c);return c;};
  if(CB.tab==='ex'){const wk=exWeek(),tot=wk.reduce((s,d)=>s+d.min,0),mx=Math.max(30,...wk.map(d=>d.min));
    card([el('b',{text:`本週運動 ${tot} 分鐘`}),el('span',{class:'nb-meta',text:`連續運動 ${exStreak()} 天・總共 ${TL.ex.length} 筆紀錄`}),
      el('div',{class:'cb-bars'},wk.map(d=>el('div',{class:'cb-bar'},[el('i',{text:d.min?String(d.min):''}),el('span',{style:`height:${Math.max(3,d.min/mx*100)}%`}),el('small',{text:d.lab})])))]);
    if(IS_T){const d=cbIn('date',TDAY()),m=cbIn('number','30',{min:'1',max:'600',inputmode:'numeric'}),ty=el('select',{class:'nb-in'},['跑步','快走','騎腳踏車','游泳','重訓','瑜伽','球類','爬山','其他'].map(x=>el('option',{text:x}))),n=cbIn('text','',{placeholder:'心得（可不填）',maxlength:'60'});
      card([el('b',{text:'新增運動紀錄'}),el('div',{class:'cb-row'},[d,m,el('span',{class:'nb-meta',text:'分鐘'})]),ty,n,el('button',{type:'button',class:'btn primary small',text:'記錄',onclick:()=>{const min=Math.round(+m.value);if(!(min>0)){toast('請輸入分鐘數');return;}
        TL.ex.push({d:d.value||TDAY(),min,what:ty.value,note:n.value.trim()});TL.ex.sort((a,b)=>a.d<b.d?-1:1);tlSave();toast(`記錄了 ${min} 分鐘的${ty.value}！`);renderCabin();}})]);}
    const list=TL.ex.slice(-12).reverse();if(!list.length)card([el('p',{text:IS_T?'還沒有運動紀錄，從今天開始吧！':'老師還沒有發布運動紀錄。'})]);
    list.forEach(e=>{const c=card([el('b',{text:`${e.what||'運動'}　${e.min} 分鐘`}),el('span',{class:'nb-meta',text:e.d.replace(/-/g,'/')}),e.note?el('p',{text:e.note}):null]);
      if(IS_T)c.appendChild(el('button',{type:'button',class:'btn small',text:'刪除',onclick:()=>{TL.ex.splice(TL.ex.indexOf(e),1);tlSave();renderCabin();}}));});}
  else if(CB.tab==='wt'&&IS_T){const A_=wtLoad();
    card([el('b',{text:'體重紀錄（只有老師看得到）'}),el('p',{text:'體重只存在這台裝置，不會發布，學生看不到。'})],'cb-private');
    if(A_.length>1){const pts=A_.slice(-30),mn=Math.min(...pts.map(p=>p.kg))-1,mx=Math.max(...pts.map(p=>p.kg))+1,w=360,h=140;
      const xy=pts.map((p,i)=>[12+i*(w-24)/Math.max(1,pts.length-1),h-12-(p.kg-mn)/(mx-mn)*(h-30)]);
      const svg=`<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="體重趨勢"><polyline fill="none" stroke="#e8cf8a" stroke-width="2.5" points="${xy.map(p=>p.join(',')).join(' ')}"/>${xy.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#e8cf8a"><title>${pts[i].d} ${pts[i].kg} kg</title></circle>`).join('')}<text x="${w-8}" y="14" fill="#c9b99a" font-size="12" text-anchor="end">${pts[pts.length-1].kg} kg</text></svg>`;
      const c=card([el('b',{text:`最近 ${pts.length} 筆・變化 ${(pts[pts.length-1].kg-pts[0].kg>0?'+':'')+(pts[pts.length-1].kg-pts[0].kg).toFixed(1)} kg`})]);const box=el('div');box.innerHTML=svg;c.appendChild(box);}
    const d=cbIn('date',TDAY()),kg=cbIn('number',A_.length?A_[A_.length-1].kg:'',{step:'0.1',min:'20',max:'250',inputmode:'decimal'});
    card([el('b',{text:'新增體重'}),el('div',{class:'cb-row'},[d,kg,el('span',{class:'nb-meta',text:'kg'})]),el('button',{type:'button',class:'btn primary small',text:'記錄',onclick:()=>{const v=Math.round(+kg.value*10)/10;if(!(v>20)){toast('請輸入體重');return;}
      const a=wtLoad().filter(x=>x.d!==(d.value||TDAY()));a.push({d:d.value||TDAY(),kg:v});a.sort((x,y)=>x.d<y.d?-1:1);wtSave(a);toast('已記錄（只存在這台裝置）');renderCabin();}})]);
    A_.slice(-8).reverse().forEach(x=>card([el('div',{class:'nb-row'},[el('b',{text:`${x.kg} kg`}),el('span',{class:'nb-meta',text:x.d.replace(/-/g,'/')}),el('button',{type:'button',class:'btn small',text:'刪除',onclick:()=>{wtSave(wtLoad().filter(y=>y.d!==x.d));renderCabin();}})])]));}
  else if(CB.tab==='rd'){
    if(IS_T){const d=cbIn('date',TDAY()),bk=cbIn('text','',{placeholder:'書名',maxlength:'40'}),pg=cbIn('number','',{placeholder:'讀了幾頁（可不填）',min:'0',inputmode:'numeric'}),n=cbIn('textarea','',{placeholder:'今天的心得或喜歡的一句話',maxlength:'200'});
      card([el('b',{text:'寫閱讀日記'}),el('div',{class:'cb-row'},[d,pg]),bk,n,el('button',{type:'button',class:'btn primary small',text:'記錄',onclick:()=>{const b=bk.value.trim();if(!b){toast('請輸入書名');return;}
        TL.reads.push({d:d.value||TDAY(),book:b,pages:+pg.value||0,note:n.value.trim()});TL.reads.sort((a,c)=>a.d<c.d?-1:1);tlSave();toast('寫好了！');renderCabin();}})]);}
    const list=TL.reads.slice(-12).reverse();if(!list.length)card([el('p',{text:IS_T?'還沒有閱讀日記。':'老師還沒有發布閱讀日記。'})]);
    list.forEach(r=>{const c=card([el('b',{text:`📖 ${r.book}`}),el('span',{class:'nb-meta',text:r.d.replace(/-/g,'/')+(r.pages?`・${r.pages} 頁`:'')}),r.note?el('p',{text:r.note}):null]);
      if(IS_T)c.appendChild(el('button',{type:'button',class:'btn small',text:'刪除',onclick:()=>{TL.reads.splice(TL.reads.indexOf(r),1);tlSave();renderCabin();}}));});}
  else if(CB.tab==='plan'){const pl=TL.plan;const mine=new Set((W.reads||[]).map(r=>String(r.book).trim())).size;
    card([el('b',{text:`📚 ${pl.title}`}),el('span',{class:'nb-meta',text:`目標：每人讀 ${pl.goal} 本書`}),pl.note?el('p',{text:pl.note}):null]);
    if(!IS_T){const k=Math.min(1,mine/Math.max(1,pl.goal));card([el('b',{text:`你已經讀了 ${mine} / ${pl.goal} 本`}),el('div',{class:'cb-prog'},[el('span',{style:`width:${k*100}%`})]),el('p',{text:'在公告板的「閱讀紀錄」寫下讀過的書，就會算進來喔！'})]);}
    if(pl.books.length)card([el('b',{text:'老師推薦的書'}),...pl.books.map(b=>el('p',{text:`・${b}`}))]);
    if(IS_T){const ti=cbIn('text',pl.title,{maxlength:'30'}),go=cbIn('number',pl.goal,{min:'1',max:'200',inputmode:'numeric'}),bk=cbIn('textarea',pl.books.join('\n'),{placeholder:'推薦書單，一行一本'}),nt=cbIn('textarea',pl.note,{placeholder:'給全班的話（可不填）'});
      card([el('b',{text:'設定閱讀計畫'}),ti,el('div',{class:'cb-row'},[el('span',{class:'nb-meta',text:'每人目標'}),go,el('span',{class:'nb-meta',text:'本'})]),bk,nt,
        el('button',{type:'button',class:'btn primary small',text:'儲存計畫',onclick:()=>{pl.title=ti.value.trim()||'全班閱讀計畫';pl.goal=Math.max(1,Math.round(+go.value)||10);pl.books=bk.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30);pl.note=nt.value.trim();tlSave();toast('閱讀計畫已更新');renderCabin();}}),
        el('p',{class:'help',text:'目前每位學生在自己的平板上看到自己的進度。等小鎮換成雲端存檔（Firebase）後，這裡就能看到全班即時統計。'})]);}}
  else if(CB.tab==='pom'){const left=POM.run?Math.max(0,(POM.end-Date.now())/1000):POM.left;const k=left/POM.len;
    const ring=el('div',{class:'cb-pom'});ring.innerHTML=`<svg viewBox="0 0 120 120" width="180" height="180"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(243,234,217,.12)" stroke-width="9"/><circle id="pomArc" cx="60" cy="60" r="52" fill="none" stroke="${POM.mode==='focus'?'#e0563a':'#6fb56a'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${2*PI*52}" stroke-dashoffset="${2*PI*52*(1-k)}" transform="rotate(-90 60 60)"/></svg><div class="cb-pom-t"><b id="pomT">${fmtT(left)}</b><small>${POM_MODES[POM.mode][0]}</small></div>`;
    const modes=el('div',{class:'cb-row'},[['focus',25],['short',5],['long',15]].map(([m,mn])=>el('button',{type:'button',class:'btn small'+(POM.mode===m?' primary':''),text:`${POM_MODES[m][0]} ${mn}`,onclick:()=>{pomSet(m,mn);renderCabin();}})));
    const task=cbIn('text',POM.task,{placeholder:'這顆番茄要完成什麼任務？',maxlength:'40'});task.addEventListener('input',()=>POM.task=task.value);
    const today=IS_T?(+TL.pom[TDAY()]||0):(+(W.pomo||{})[TDAY()]||0);
    card([ring,modes,task,el('div',{class:'cb-row'},[el('button',{type:'button',class:'btn primary',text:POM.run?'暫停':'開始專注',onclick:()=>{pomToggle();renderCabin();}}),el('button',{type:'button',class:'btn small',text:'重設',onclick:()=>{pomSet(POM.mode,Math.round(POM.len/60));renderCabin();}})]),
      el('p',{text:`今天完成 ${today} 顆番茄 ${'🍅'.repeat(Math.min(today,12))}`+(IS_T?`（本週 ${pomWeek()} 顆，學生會在成果牆看到）`:'')})],'cb-pomcard');}
  const foot=$('cbFoot');foot.innerHTML='';
  if(IS_T){const st=el('span',{class:'dc-coins',text:TL_DIRTY?'有新紀錄還沒發布給學生':'學生看到的是最新紀錄'});foot.appendChild(st);
    if(TL_DIRTY)foot.appendChild(el('button',{type:'button',class:'btn primary',text:'發布到小鎮',onclick:async e=>{const b=e.currentTarget;let art=null;try{if(window.claude&&typeof window.claude.use==='function')art=await window.claude.use('artifact');}catch(err){}
      if(!art){st.textContent='這個畫面不能發布，請在 Claude 裡用老師的帳號打開。';return;}b.disabled=true;st.textContent='發布中…';const cfg=JSON.parse(JSON.stringify(CFG));cfg.teacher=JSON.parse(JSON.stringify(TL));
      try{sessionStorage.setItem('shiomi-saved','1');}catch(err){}
      try{await art.publish(buildDoc(cfg));st.textContent='已發布！頁面會自動重新載入。';}catch(err){try{sessionStorage.removeItem('shiomi-saved');}catch(x){}b.disabled=false;const c=err&&err.code;st.textContent=c==='conflict'?'頁面剛更新過，重新載入後再發布一次。':`發布失敗（${c||err}）`;}}}));}
  else foot.appendChild(el('span',{class:'dc-coins',text:'老師的成果・以身作則'}));
  foot.appendChild(el('button',{type:'button',class:'btn',text:'關閉',onclick:closeCabin}));}
$('cbClose').onclick=closeCabin;
$('pomChip').onclick=()=>openCabin('pom');
function cabTick(dt){
  if(POM.run){const left=Math.max(0,(POM.end-Date.now())/1000);if(left<=0)pomDone();
    if(!$('cabin').hidden&&CB.tab==='pom'){const t=$('pomT'),a=$('pomArc');if(t)t.textContent=fmtT(left);if(a)a.setAttribute('stroke-dashoffset',String(2*PI*52*(1-left/POM.len)));}}
  const chip=$('pomChip');const showChip=POM.run&&started&&($('cabin').hidden);chip.hidden=!showChip;if(showChip)chip.textContent=`🍅 ${fmtT(Math.max(0,(POM.end-Date.now())/1000))} ${POM_MODES[POM.mode][0]}中`;
  if(TC.dial)TC.dial.rotation.z=POM.run?-(1-Math.max(0,(POM.end-Date.now())/1000)/POM.len)*PI*2:0;
  if(TC.tom&&POM.run)TC.tom.rotation.z=Math.sin(time*18)*.02;
  if(TC_IN){LANTERN.color.setHex(0xffd6a0);LANTERN.distance=16;LANTERN.intensity=1.1;LANTERN.position.set(TCX,2.8,TCZ-.5);}
  else if(!MZ_IN&&LANTERN.intensity&&LANTERN.distance===16){LANTERN.intensity=0;LANTERN.distance=12;LANTERN.color.setHex(0xffc68a);}}
