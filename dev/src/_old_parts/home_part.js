/* ================================================================
   My room — every seat number has its own room (saved in W.home)
   The game starts here; the front door leads to a house in town.
   ================================================================ */
const HX=40,HZ=330;var HOME_IN=false;
const HOME={RW:7,RD:6,RH:3,g:null,items:[],sel:null,edit:false,pending:null,mode:'edit',tab:'furn',cols:[],act:null,actPos:new T.Vector3(0,-50,0),fish:[],wallMat:null,floorMat:null,townDoor:null,townOut:null};
const PETBED={x:-2.75,z:2.25};
// ---------- wallpaper & floor patterns
function wallTexOf(id){const [c,g]=C2(256,256);
  const P={cream:['#f3e9d6'],dots:['#f6dde2'],stripe:['#e2ecf4'],check:['#e6efdc'],star:['#2c3558'],wood:['#b98c5e'],sunset:['#f7d9bf']}[id]||['#f3e9d6'];
  g.fillStyle=P[0];g.fillRect(0,0,256,256);speckle(g,256,256,500,.03);
  if(id==='dots'){g.fillStyle='#ee9fb3';for(let y=0;y<256;y+=32)for(let x=(y/32%2)*16;x<256;x+=32){g.beginPath();g.arc(x+8,y+8,5,0,PI*2);g.fill();}}
  if(id==='stripe'){for(let x=0;x<256;x+=32){g.fillStyle='#a9c4dc';g.fillRect(x,0,12,256);g.fillStyle='#f7f9fb';g.fillRect(x+14,0,3,256);}}
  if(id==='check'){g.fillStyle='rgba(120,160,100,.35)';for(let x=0;x<256;x+=64){g.fillRect(x,0,26,256);g.fillRect(0,x,256,26);}}
  if(id==='star'){for(let i=0;i<60;i++){g.fillStyle=pick(['#fff6c8','#ffffff','#cfe0ff']);const x=rand()*256,y=rand()*256,r=rand()<.15?2.4:1.1;g.beginPath();g.arc(x,y,r,0,PI*2);g.fill();}
    g.fillStyle='#ffe9a0';g.beginPath();g.arc(190,60,14,0,PI*2);g.fill();g.fillStyle='#2c3558';g.beginPath();g.arc(197,55,12,0,PI*2);g.fill();}
  if(id==='wood'){for(let x=0;x<256;x+=32){g.fillStyle=pick(['#b3855a','#bf9366','#a97d52']);g.fillRect(x,0,31,256);g.fillStyle='rgba(60,35,20,.35)';g.fillRect(x+31,0,1,256);}speckle(g,256,256,1500,.07);}
  if(id==='sunset'){const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#f6c6a8');gr.addColorStop(1,'#fbe7d2');g.fillStyle=gr;g.fillRect(0,0,256,256);g.fillStyle='rgba(217,87,59,.18)';for(let y=20;y<256;y+=64)g.fillRect(0,y,256,6);}
  // wainscot line near the floor
  return TX(c,true);}
function floorTexOf(id){const [c,g]=C2(256,256);
  if(id==='tatami'){g.fillStyle='#c9c48a';g.fillRect(0,0,256,256);g.strokeStyle='rgba(120,110,60,.25)';for(let y=0;y<256;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}g.fillStyle='#3d4a3a';g.fillRect(0,0,256,8);g.fillRect(0,128,256,8);}
  else if(id==='tile'){g.fillStyle='#eeece6';g.fillRect(0,0,256,256);g.strokeStyle='rgba(120,120,110,.35)';g.lineWidth=3;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}
  else if(id==='carpet'){g.fillStyle='#5b7fa8';g.fillRect(0,0,256,256);speckle(g,256,256,6000,.12);}
  else{const dark=id==='dark';for(let y=0;y<256;y+=32){let x=-rand()*120;while(x<256){const w=rr(90,160);g.fillStyle=pick(dark?['#6a4a34','#5e412e','#735139']:['#d8b385','#cfa877','#e0bd91']);g.fillRect(x,y,w-2,30);g.fillStyle='rgba(60,35,20,.35)';g.fillRect(x+w-2,y,2,30);x+=w;}
      g.fillStyle='rgba(60,35,20,.3)';g.fillRect(0,y+30,256,2);}speckle(g,256,256,2000,.06);}
  return TX(c,true);}
const WALLPAPERS=[{id:'cream',name:'米白素面',price:0,sw:'#f3e9d6'},{id:'dots',name:'粉紅點點',price:40,sw:'#f0b8c6'},{id:'stripe',name:'藍色條紋',price:40,sw:'#a9c4dc'},{id:'check',name:'綠色格紋',price:40,sw:'#b9cfa6'},{id:'sunset',name:'夕陽橘',price:50,sw:'#f6c6a8'},{id:'wood',name:'木板牆',price:60,sw:'#b98c5e'},{id:'star',name:'星空',price:80,sw:'#2c3558'}];
const FLOORS=[{id:'wood',name:'原木地板',price:0,sw:'#d8b385'},{id:'dark',name:'深色地板',price:40,sw:'#6a4a34'},{id:'tile',name:'白色磁磚',price:40,sw:'#eeece6'},{id:'carpet',name:'藍色地毯',price:50,sw:'#5b7fa8'},{id:'tatami',name:'榻榻米',price:60,sw:'#c9c48a'}];
// ---------- furniture catalogue: type floor|wall, fp = footprint [w,d] (for walking), build(group)
const FURN=[
  {k:'rug',name:'圓形地毯',price:40,type:'floor',fp:null,build:g=>{const m=mk(cy(1,1,.02,28),imat(pick(['#d9573b','#e6be78','#6f9bc8']),.35),0,.01,0,g,false);m.receiveShadow=true;mk(cy(.8,.8,.025,28),imat('#f3ead9',.35),0,.012,0,g,false);}},
  {k:'plant',name:'大盆栽',price:30,type:'floor',fp:[.5,.5],build:g=>{mk(cy(.22,.17,.42,10),imat('#c8764a',.3),0,.21,0,g);for(let i=0;i<5;i++){const f=mk(ico(.2+rand()*.08,0),imat(pick(['#4f9a5a','#3f8a4a','#63ad6a']),.3),rr(-.12,.12),.62+i*.1,rr(-.12,.12),g);f.scale.y=1.3;}}},
  {k:'beanbag',name:'懶骨頭',price:60,type:'floor',fp:[.8,.8],act:'sit',build:g=>{const c=pick(['#e6be78','#d9573b','#7cae8a','#8f7bc8']);const b=mk(sph(.42,16,12),imat(c,.3),0,.3,0,g);b.scale.set(1,.7,1);const t=mk(sph(.3,14,10),imat(c,.3),0,.45,-.2,g);t.scale.set(1.1,.9,.7);}},
  {k:'table',name:'小矮桌',price:50,type:'floor',fp:[1,.7],build:g=>{mk(bx(1,.06,.7),imat('#a97d52',.3),0,.38,0,g);[[-.42,-.28],[.42,-.28],[-.42,.28],[.42,.28]].forEach(([x,z])=>mk(bx(.06,.36,.06),imat('#8a6040',.3),x,.18,z,g));mk(cy(.07,.06,.1,10),imat('#f3ead9',.4),.2,.46,.05,g);}},
  {k:'lamp',name:'落地燈',price:50,type:'floor',fp:[.4,.4],build:g=>{mk(cy(.18,.2,.05,12),imat('#3a3a3e',.3),0,.03,0,g);mk(cy(.02,.02,1.5,6),imat('#3a3a3e',.3),0,.78,0,g);mk(cy(.16,.26,.32,14),new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:.9}),0,1.6,0,g);addGlow(0,1.55,0,2.2,'#ffd79a','lamp',.9,g);}},
  {k:'fish',name:'金魚缸',price:80,type:'floor',fp:[.5,.5],act:'fish',build:g=>{mk(bx(.5,.7,.5),imat('#8a6040',.3),0,.35,0,g);mk(sph(.3,18,14),new T.MeshLambertMaterial({color:col('#bfe6f2'),transparent:true,opacity:.45,emissive:col('#7fc8e0'),emissiveIntensity:.3,depthWrite:false}),0,.98,0,g,false);
    const f=new T.Group();f.position.set(0,.98,0);g.add(f);const fm=mk(sph(.06,8,6),imat('#f07a2a',.6),.15,0,0,f,false);fm.scale.set(1.6,.9,.7);const tl=mk(new T.ConeGeometry(.05,.08,4),imat('#f07a2a',.6),.25,0,0,f,false);tl.rotation.z=PI/2;g.userData.fish=f;}},
  {k:'maneki',name:'招財貓',price:70,type:'floor',fp:[.4,.4],act:'maneki',build:g=>{mk(bx(.4,.5,.4),imat('#8a6040',.3),0,.25,0,g);const b=mk(sph(.16,12,10),imat('#f7f2e8',.45),0,.66,0,g);b.scale.y=1.1;mk(sph(.13,12,10),imat('#f7f2e8',.45),0,.9,0,g);[-1,1].forEach(s=>{const e=mk(new T.ConeGeometry(.05,.08,4),imat('#f7f2e8',.45),s*.07,1.02,0,g);});mk(cy(.1,.1,.03,12),imat('#d9573b',.5),0,.78,.06,g,false).rotation.x=PI/2;const paw=mk(sph(.05,8,6),imat('#f7f2e8',.45),.13,.95,.05,g);g.userData.paw=paw;}},
  {k:'teddy',name:'熊熊玩偶',price:50,type:'floor',fp:[.4,.4],act:'hug',build:g=>{const c='#b5835a';const b=mk(sph(.2,12,10),imat(c,.35),0,.2,0,g);b.scale.y=.9;mk(sph(.16,12,10),imat(c,.35),0,.48,0,g);[-1,1].forEach(s=>{mk(sph(.06,8,6),imat(c,.35),s*.12,.6,0,g);mk(sph(.07,8,6),imat(c,.35),s*.17,.22,.08,g);});mk(sph(.06,8,6),imat('#e8cfa8',.4),0,.45,.13,g);mk(sph(.018,6,4),imat('#2a1f1c',.2),-.05,.52,.14,g,false);mk(sph(.018,6,4),imat('#2a1f1c',.2),.05,.52,.14,g,false);}},
  {k:'books',name:'一疊漫畫',price:20,type:'floor',fp:[.4,.3],act:'read',build:g=>{let y=0;for(let i=0;i<5;i++){const h=.05;mk(bx(.3+rand()*.06,h,.22),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c','#8a6ad0']),.35),rr(-.02,.02),y+h/2,0,g).rotation.y=rr(-.2,.2);y+=h;}}},
  {k:'piano',name:'電子琴',price:100,type:'floor',fp:[1.1,.45],act:'piano',build:g=>{mk(bx(1.1,.1,.4),imat('#2a2a2e',.25),0,.8,0,g);mk(bx(1,.02,.18),imat('#f6f4ee',.5),0,.86,.08,g,false);for(let i=0;i<9;i++)mk(bx(.04,.025,.1),imat('#1a1a1e',.2),-.42+i*.105,.875,.04,g,false);[-.45,.45].forEach(x=>mk(bx(.05,.8,.05),imat('#2a2a2e',.25),x,.4,0,g));}},
  {k:'scope',name:'天文望遠鏡',price:120,type:'floor',fp:[.6,.6],act:'scope',build:g=>{[0,2.1,4.2].forEach(a=>{const l=mk(cy(.015,.015,1,5),imat('#8a8a8e',.3),Math.sin(a)*.18,.48,Math.cos(a)*.18,g);l.rotation.set(Math.cos(a)*.35,0,-Math.sin(a)*.35);});const t=mk(cy(.07,.09,.8,12),imat('#f4f1ea',.45),0,1.05,0,g);t.rotation.x=-.9;}},
  {k:'poster',name:'小鎮海報',price:30,type:'wall',build:g=>{const [c,x]=C2(128,176);const gr=x.createLinearGradient(0,0,0,176);gr.addColorStop(0,'#26376a');gr.addColorStop(.55,'#f6a06a');gr.addColorStop(1,'#1a2d4a');x.fillStyle=gr;x.fillRect(0,0,128,176);x.fillStyle='#ffe9c0';x.beginPath();x.arc(64,98,16,0,PI*2);x.fill();x.fillStyle='#2a1f2c';x.fillRect(0,120,128,56);x.fillStyle='#f3ead9';x.font=`700 20px ${FG}`;x.textAlign='center';x.fillText('汐見町',64,34);
    mk(bx(.62,.84,.02),imat('#f3ead9',.4),0,0,0,g,false);mk(new T.PlaneGeometry(.56,.78),new T.MeshBasicMaterial({map:TX(c)}),0,0,.012,g,false);}},
  {k:'clock',name:'掛鐘',price:40,type:'wall',build:g=>{mk(cy(.22,.22,.05,24),imat('#8a6040',.3),0,0,0,g,false).rotation.x=PI/2;mk(cy(.19,.19,.02,24),imat('#f7f2e8',.5),0,0,.03,g,false).rotation.x=PI/2;const h=mk(bx(.02,.12,.01),imat('#2a1f1c',.2),0,.05,.045,g,false);const m=mk(bx(.015,.17,.01),imat('#2a1f1c',.2),0,.07,.047,g,false);g.userData.hands=[h,m];}},
  {k:'lights',name:'星星燈串',price:60,type:'wall',build:g=>{for(let i=0;i<9;i++){const x=-.9+i*.225,y=-Math.sin(i/8*PI)*.18;mk(sph(.035,6,5),new T.MeshBasicMaterial({color:col(pick(['#ffd79a','#ffe9c0','#ffc27a']))}),x,y,.02,g,false);addGlow(x,y,.05,.5,'#ffd79a','lamp',.9,g);}}},
  {k:'shelf',name:'壁掛小書架',price:40,type:'wall',build:g=>{mk(bx(.8,.05,.2),imat('#a97d52',.3),0,-.15,.1,g);for(let i=0;i<6;i++)mk(bx(.06,.22,.15),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c']),.35),-.3+i*.1,-.02,.1,g,false);}},
];
const FURN_BY=Object.fromEntries(FURN.map(f=>[f.k,f]));
function homeState(){if(!W.home)W.home={wall:'cream',floor:'wood',items:[],walls:['cream'],floors:['wood']};if(!W.furn)W.furn={};return W.home;}
// ---------- build the room shell + fixed furniture
(function buildHome(){const G=new T.Group();G.position.set(HX,0,HZ);scene.add(G);HOME.g=G;const {RW,RD,RH}=HOME;
  HOME.wallMat=new T.MeshLambertMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.3,map:wallTexOf('cream')});HOME.wallMat.emissiveMap=HOME.wallMat.map;
  HOME.floorMat=new T.MeshLambertMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.25,map:floorTexOf('wood')});HOME.floorMat.emissiveMap=HOME.floorMat.map;
  const fg=new T.PlaneGeometry(RW,RD);fg.rotateX(-PI/2);const uv=fg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*RW/2,uv.getY(i)*RD/2);
  const fl=mk(fg,HOME.floorMat,0,0,0,G,false);fl.userData.pick='floor';
  mk(bx(RW,.2,RD),imat('#f6efe2',.35),0,RH+.1,0,G);
  const wall=(w,h,x,y,z,ry,tag)=>{const g=new T.PlaneGeometry(w,h);const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*w/1.6,u.getY(i)*h/1.6);const m=mk(g,HOME.wallMat,x,y,z,G,false);m.rotation.y=ry;m.userData.pick=tag;return m;};
  wall(RD,RH,-RW/2,RH/2,0,PI/2,'wl');wall(RD,RH,RW/2,RH/2,0,-PI/2,'wr');
  // back wall with a window (x from -1.1 to .9, y .95..2.25)
  wall(RW/2-1.1,RH,(-RW/2-1.1)/2,RH/2,-RD/2,0,'wb');wall(RW/2-.9,RH,(RW/2+.9)/2,RH/2,-RD/2,0,'wb');wall(2,.95,-.1,.475,-RD/2,0,'wb');wall(2,RH-2.25,-.1,(RH+2.25)/2,-RD/2,0,'wb');
  // front wall with a door at x=2.2 (width 1.0, height 2.1)
  const fw=(w,h,x,y)=>{const m=wall(w,h,x,y,RD/2,PI,'wf');};fw(RW/2+1.7,RH,(-RW/2+1.7)/2,RH/2);fw(RW/2-2.7,RH,(2.7+RW/2)/2,RH/2);fw(1,RH-2.1,2.2,(RH+2.1)/2);
  // skirting board + outer shell so the room is closed from any camera angle
  [[RW,.12,.04,0,.06,-RD/2+.02],[RW,.12,.04,0,.06,RD/2-.02],[.04,.12,RD,-RW/2+.02,.06,0],[.04,.12,RD,RW/2-.02,.06,0]].forEach(([a,b,c,x,y,z])=>mk(bx(a,b,c),imat('#9a7650',.3),x,y,z,G,false));
  mk(bx(RW+.6,RH+.4,.2),imat('#2a2230',.1),0,RH/2,-RD/2-.25,G,false);mk(bx(RW+.6,RH+.4,.2),imat('#2a2230',.1),0,RH/2,RD/2+.25,G,false);
  mk(bx(.2,RH+.4,RD+.6),imat('#2a2230',.1),-RW/2-.25,RH/2,0,G,false);mk(bx(.2,RH+.4,RD+.6),imat('#2a2230',.1),RW/2+.25,RH/2,0,G,false);
  // door
  mk(bx(.98,2.08,.06),imat('#9a6a44',.35),2.2,1.04,RD/2-.02,G,false);mk(sph(.04,8,6),imat('#e6be78',.5),1.85,1.0,RD/2-.07,G,false);
  // window + view
  const [vc,vg]=C2(256,160);const gr=vg.createLinearGradient(0,0,0,160);gr.addColorStop(0,'#ffffff');gr.addColorStop(.62,'#f0f0f0');gr.addColorStop(.63,'#9aa6b0');gr.addColorStop(1,'#6a7680');vg.fillStyle=gr;vg.fillRect(0,0,256,160);
  vg.fillStyle='rgba(60,50,60,.55)';for(let x=0;x<256;x+=rr(18,34)){const h=rr(12,30);vg.fillRect(x,100-h,rr(14,26),h+2);}vg.fillStyle='rgba(255,255,255,.6)';vg.fillRect(0,99,256,2);
  HOME.viewMat=new T.MeshBasicMaterial({map:TX(vc),toneMapped:false});mk(new T.PlaneGeometry(2,1.3),HOME.viewMat,-.1,1.6,-RD/2-.05,G,false);
  [[2.1,.08,-.1,2.28],[2.1,.08,-.1,.92]].forEach(([w,h,x,y])=>mk(bx(w,h,.12),imat('#f7f2e8',.45),x,y,-RD/2+.02,G,false));[-1.14,.94,-.1].forEach(x=>mk(bx(.07,1.36,.12),imat('#f7f2e8',.45),x,1.6,-RD/2+.02,G,false));
  [-1.35,1.15].forEach(x=>{const c=mk(bx(.45,1.7,.05),imat('#e8a0a0',.35),x,1.55,-RD/2+.12,G,false);});mk(bx(2.8,.05,.05),imat('#8a6040',.3),-.1,2.42,-RD/2+.12,G,false);
  // bed (back-left)
  mk(bx(1.3,.35,2.1),imat('#9a6a44',.3),-2.8,.18,-1.9,G);mk(bx(1.2,.18,2),imat('#f7f2e8',.45),-2.8,.44,-1.9,G);const bl=mk(bx(1.24,.12,1.3),imat('#6f9bc8',.4),-2.8,.56,-1.5,G);mk(bx(.8,.14,.4),imat('#fbf7ef',.5),-2.8,.6,-2.65,G);mk(bx(1.3,.7,.08),imat('#9a6a44',.3),-2.8,.6,-2.96,G);
  addCol(HX-3.5,HX-2.1,HZ-3,HZ-.8,1);
  inter(new T.Vector3(HX-2.0,0,HZ-1.6),1.4,'在床上睡一下',()=>homeSleep());
  // desk + chair + lamp + catalogue
  mk(bx(1.5,.06,.7),imat('#c9a070',.35),2.3,.75,-2.6,G);[[1.6,-2.9],[3,-2.9],[1.6,-2.3],[3,-2.3]].forEach(([x,z])=>mk(bx(.06,.74,.06),imat('#a97d52',.3),x,.37,z,G));
  mk(bx(.45,.06,.45),imat('#d9573b',.35),2.3,.45,-1.9,G);mk(bx(.45,.5,.06),imat('#d9573b',.35),2.3,.72,-1.68,G);[[2.1,-2.1],[2.5,-2.1],[2.1,-1.7],[2.5,-1.7]].forEach(([x,z])=>mk(bx(.04,.44,.04),imat('#3a3a3e',.3),x,.22,z,G));
  mk(cy(.08,.1,.04,10),imat('#3a3a3e',.3),2.85,.8,-2.75,G);mk(cy(.015,.015,.35,5),imat('#3a3a3e',.3),2.85,.97,-2.75,G);mk(cy(.07,.14,.14,12),new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:.8}),2.85,1.15,-2.7,G,false);addGlow(2.85,1.1,-2.65,1.4,'#ffd79a','lamp',.8,G);
  const [cc,cg]=C2(128,96);cg.fillStyle='#e6be78';cg.fillRect(0,0,128,96);cg.fillStyle='#d9573b';cg.fillRect(0,0,128,26);cg.fillStyle='#fff';cg.font=`700 18px ${FG}`;cg.textAlign='center';cg.fillText('家具型錄',64,20);cg.fillStyle='#8a6040';cg.fillRect(20,40,40,30);cg.fillStyle='#4fae6c';cg.fillRect(70,44,36,26);
  const cat=mk(new T.PlaneGeometry(.36,.27),new T.MeshBasicMaterial({map:TX(cc)}),2.1,.785,-2.55,G,false);cat.rotation.x=-PI/2;cat.rotation.z=.2;
  addCol(HX+1.55,HX+3.05,HZ-3,HZ-2.25,1);
  inter(new T.Vector3(HX+2.2,0,HZ-1.7),1.5,'翻開家具型錄（買家具）',()=>openDecor('shop'));
  // collection shelf (right wall) with the sea-glass jar
  mk(bx(.4,1.5,1.3),imat('#a97d52',.3),3.3,.75,-.5,G);[.35,.8,1.25].forEach(y=>mk(bx(.42,.04,1.3),imat('#8a6040',.3),3.28,y,-.5,G,false));
  mk(cy(.13,.13,.3,14),new T.MeshLambertMaterial({color:col('#d8f0ee'),transparent:true,opacity:.4,emissive:col('#a8dcd6'),emissiveIntensity:.3,depthWrite:false}),3.22,1.43,-.85,G,false);
  HOME.jar=new T.Group();HOME.jar.position.set(3.22,1.3,-.85);G.add(HOME.jar);
  HOME.trophy=new T.Group();HOME.trophy.position.set(3.22,.84,-.2);G.add(HOME.trophy);mk(cy(.05,.08,.06,10),imat('#e6be78',.6),0,.03,0,HOME.trophy,false);mk(cy(.1,.04,.16,12),imat('#e6be78',.6),0,.16,0,HOME.trophy,false);
  for(let i=0;i<6;i++)mk(bx(.18,.24,.05),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c']),.35),3.22,.49,-1+i*.08,G,false).rotation.x=PI/2*.0;
  addCol(HX+3.05,HX+3.5,HZ-1.2,HZ+.2,2);
  inter(new T.Vector3(HX+2.6,0,HZ-.6),1.3,'看看我的收藏',()=>homeCollection());
  // stamp board (left wall above the bed) + certificate
  const [sc]=C2(512,320);HOME.boardCanvas=sc;HOME.boardTex=TX(sc);mk(bx(.05,.95,1.5),imat('#a97d52',.3),-3.47,1.75,-1.2,G,false);const bd=mk(new T.PlaneGeometry(1.4,.86),new T.MeshBasicMaterial({map:HOME.boardTex}),-3.43,1.75,-1.2,G,false);bd.rotation.y=PI/2;
  const [ac,ag]=C2(256,190);ag.fillStyle='#fbf5e6';ag.fillRect(0,0,256,190);ag.strokeStyle='#e6be78';ag.lineWidth=10;ag.strokeRect(8,8,240,174);ag.fillStyle='#d9573b';ag.font=`800 34px ${FG}`;ag.textAlign='center';ag.fillText('獎 狀',128,62);ag.fillStyle='#3a2a20';ag.font=`600 18px ${FG}`;ag.fillText('汐見町闖關 全部過關',128,110);ag.fillText('表現優異 特頒此狀',128,140);ag.fillStyle='#d9573b';ag.beginPath();ag.arc(200,160,14,0,PI*2);ag.fill();
  HOME.award=new T.Group();HOME.award.position.set(-3.44,1.8,.6);HOME.award.rotation.y=PI/2;G.add(HOME.award);mk(bx(.72,.56,.03),imat('#8a6040',.3),0,0,-.015,HOME.award,false);mk(new T.PlaneGeometry(.64,.48),new T.MeshBasicMaterial({map:TX(ac)}),0,0,.005,HOME.award,false);
  // pet bed
  mk(cy(.45,.4,.12,20),imat('#d9573b',.35),PETBED.x,.06,PETBED.z,G);mk(cy(.36,.36,.05,20),imat('#f3ead9',.45),PETBED.x,.12,PETBED.z,G,false);
  // ceiling lamp
  mk(cy(.35,.35,.06,20),new T.MeshBasicMaterial({color:0xfff6e0}),0,RH-.03,0,G,false);
  // walls & door collisions
  addCol(HX-RW/2-.3,HX-RW/2,HZ-RD/2,HZ+RD/2,4);addCol(HX+RW/2,HX+RW/2+.3,HZ-RD/2,HZ+RD/2,4);addCol(HX-RW/2,HX+RW/2,HZ-RD/2-.3,HZ-RD/2,4);addCol(HX-RW/2,HX+RW/2,HZ+RD/2,HZ+RD/2+.3,4);
  inter(new T.Vector3(HX+2.2,0,HZ+2.5),1.3,'出門去小鎮',()=>exitHome());
  inter(HOME.actPos,1.3,()=>HOME.act?HOME.act.label:'',()=>HOME.act&&HOME.act.fn());
})();
// fixed furniture footprints (room-local) — new furniture can't go here
const HOME_BLOCK=[[-3.5,-2.1,-3,-.8],[1.5,3.1,-3,-1.5],[3,3.5,-1.2,.2],[1.6,2.8,1.9,3],[PETBED.x-.5,PETBED.x+.5,PETBED.z-.5,PETBED.z+.5]];
// ---------- town house with "my home" door (closest house to the start of the shopping street)
(function(){if(!HOUSES.length)return;let best=null,bd=1e9;HOUSES.forEach(h=>{const p=l2w(h.g,h.dx,0,h.d/2+1.2);const d=Math.hypot(p.x-(-3),p.z-40);if(d<bd){bd=d;best={h,p};}});if(!best)return;
  const {h,p}=best;HOME.townOut=p;HOME.townYaw=h.g.rotation.y;
  const [c,g]=C2(128,64);g.fillStyle='#f3ead9';rrect(g,4,4,120,56,10);g.fill();g.strokeStyle='#8a6040';g.lineWidth=4;rrect(g,4,4,120,56,10);g.stroke();g.fillStyle='#3a2a20';g.font=`800 30px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('我的家',64,34);
  const pl_=mk(new T.PlaneGeometry(.7,.35),new T.MeshBasicMaterial({map:TX(c)}),h.dx+1.15,1.6,h.d/2+.07,h.g,false);addGlow(h.dx+1.15,2.1,h.d/2+.3,1.2,'#ffd79a','lamp',1,h.g);
  inter(p,1.8,'回家（我的房間）',()=>enterHome());})();
// ---------- enter / leave
function homeSpawn(fromDoor){if(fromDoor){P.pos.set(HX+2.2,0,HZ+2.1);P.yaw=PI;cam.yaw=0;}else{P.pos.set(HX-1.6,0,HZ-.6);P.yaw=PI*.25;cam.yaw=PI*.12;}
  P.vel.set(0,0,0);P.sit=null;cam.pitch=.3;cam.dist=Math.max(cam.dist,5);cam.pos.set(P.pos.x+1.5,2.4,P.pos.z+3);cam.look.set(P.pos.x,1.2,P.pos.z);}
function enterHome(opts={}){const go=()=>{INDOOR=true;HOME_IN=true;homeSpawn(!opts.wake);applyHome();refreshHomeDecor();
    if(PETOBJ){PETOBJ.g.position.set(HX+PETBED.x,0,HZ+PETBED.z);PETOBJ.by=0;}
    curArea=null;areaCool=0;$('homeBar').hidden=false;SND.chime&&SND.chime();
    if(opts.wake){const first=!W.homeSeen;W.homeSeen=true;save();
      setTimeout(()=>say(`${W.name||''}的房間`,first?['早安！這裡是你自己的房間。','書桌上有「家具型錄」，用闖關賺來的金幣可以買家具、換壁紙。','按上方的「佈置」可以把家具擺到喜歡的位置。','準備好了，就從房門走出去，到小鎮闖關吧！']:[pick(['早安！今天也一起加油吧！','又是新的一天！先去哪一關呢？','睡得好嗎？小鎮在等你喔！'])]),700);}};
  if(opts.wake)go();else fadeTo(go);}
function exitHome(){closeDecor();fadeTo(()=>{INDOOR=false;HOME_IN=false;$('homeBar').hidden=true;const p=HOME.townOut||new T.Vector3(0,0,24);P.pos.set(p.x,0,p.z);P.vel.set(0,0,0);P.yaw=(HOME.townYaw||0);cam.yaw=P.yaw+PI;cam.pitch=.2;
  cam.pos.set(p.x+Math.sin(cam.yaw)*5,2.6,p.z+Math.cos(cam.yaw)*5);cam.look.set(p.x,1.4,p.z);if(PETOBJ){PETOBJ.g.position.set(p.x+1,0,p.z+.5);PETOBJ.by=0;}curArea=null;areaCool=0;SND.chime&&SND.chime();});}
function homeSleep(){choose('床','要睡一下嗎？',[{label:'睡個午覺（變成白天）',fn:()=>fadeTo(()=>{setTime(2);if(W.pet){W.pet.mood=Math.min(100,W.pet.mood+10);renderPet();}toast('睡飽了！精神很好');save();})},{label:'睡到晚上（變成夜晚）',fn:()=>fadeTo(()=>{setTime(1);toast('窗外的星星出來了');})},{label:'不用了',fn:null}]);}
function homeCollection(){const all=allStamps(),n=all.filter(s=>stampDone(s.id)).length;
  say('我的收藏',[`印章：${n} / ${all.length} 個（床上方的軟木板）`,`海玻璃：${W.glass.length} / 5 片（架子上的玻璃瓶）`,n>=all.length?'全部過關了！牆上掛著你的獎狀 🎉':`再拿 ${all.length-n} 個印章，牆上就會出現獎狀喔！`]);}
// ---------- apply saved room: wallpaper, floor, furniture, collections
function setWall(id){const t=wallTexOf(id);const m=HOME.wallMat;if(m.map)m.map.dispose();m.map=t;m.emissiveMap=t;m.emissiveIntensity=id==='star'?.55:.3;m.needsUpdate=true;}
function setFloor(id){const t=floorTexOf(id);const m=HOME.floorMat;if(m.map)m.map.dispose();m.map=t;m.emissiveMap=t;m.needsUpdate=true;}
function applyHome(){const H=homeState();setWall(H.wall);setFloor(H.floor);
  HOME.items.forEach(it=>HOME.g.remove(it.g));HOME.items=[];H.items.forEach(d=>spawnItem(d));rebuildHomeCols();}
function spawnItem(d){const f=FURN_BY[d.k];if(!f)return null;const g=new T.Group();f.build(g);g.userData.item=d;HOME.g.add(g);placeItemGroup(g,d);const it={d,g,f};HOME.items.push(it);return it;}
function placeItemGroup(g,d){if(d.wall){const {RW,RD}=HOME;const y=d.y||1.75;
    if(d.wall==='wb'){g.position.set(d.u,y,-RD/2+.03);g.rotation.y=0;}else if(d.wall==='wl'){g.position.set(-RW/2+.03,y,d.u);g.rotation.y=PI/2;}else if(d.wall==='wr'){g.position.set(RW/2-.03,y,d.u);g.rotation.y=-PI/2;}else{g.position.set(d.u,y,RD/2-.03);g.rotation.y=PI;}}
  else{g.position.set(d.x,0,d.z);g.rotation.y=(d.r||0)*PI/2;}}
function rebuildHomeCols(){HOME.cols.forEach(c=>{const i=COLS.indexOf(c);if(i>=0)COLS.splice(i,1);});HOME.cols=[];
  HOME.items.forEach(it=>{if(it.d.wall||!it.f.fp)return;let [w,d]=it.f.fp;if((it.d.r||0)%2){[w,d]=[d,w];}const c={x0:HX+it.d.x-w/2,x1:HX+it.d.x+w/2,z0:HZ+it.d.z-d/2,z1:HZ+it.d.z+d/2,y0:-6,y1:1.2};COLS.push(c);HOME.cols.push(c);});}
function refreshHomeDecor(){// stamp board
  const g=HOME.boardCanvas.getContext('2d');g.fillStyle='#c9a276';g.fillRect(0,0,512,320);speckle(g,512,320,2500,.1);const all=allStamps();
  g.fillStyle='#3a2a20';g.font=`800 26px ${FG}`;g.textAlign='center';g.fillText(`${W.name||''} 的集章板`,256,36);
  all.forEach((s,i)=>{const cols=Math.min(5,all.length),x=56+(i%cols)*100,y=100+Math.floor(i/cols)*110,done=stampDone(s.id);
    g.fillStyle='#fbf5e6';g.beginPath();g.arc(x,y,38,0,PI*2);g.fill();g.fillStyle='#b8452f';g.beginPath();g.arc(x,y-38,5,0,PI*2);g.fill();
    if(done){g.strokeStyle='#d9573b';g.lineWidth=5;g.beginPath();g.arc(x,y,30,0,PI*2);g.stroke();g.fillStyle='#d9573b';g.font=`800 30px ${FG}`;g.textBaseline='middle';g.fillText((s.subject||'?')[0],x,y+2);}
    else{g.strokeStyle='rgba(58,42,32,.3)';g.setLineDash([5,5]);g.lineWidth=3;g.beginPath();g.arc(x,y,30,0,PI*2);g.stroke();g.setLineDash([]);g.fillStyle='rgba(58,42,32,.35)';g.font=`700 24px ${FG}`;g.textBaseline='middle';g.fillText((s.subject||'?')[0],x,y+2);}
    g.textBaseline='alphabetic';});
  HOME.boardTex.needsUpdate=true;
  // sea glass jar
  while(HOME.jar.children.length)HOME.jar.remove(HOME.jar.children[0]);W.glass.forEach((gi,i)=>{const m=mk(sph(.045,6,5),new T.MeshLambertMaterial({color:col(['#7fd0c0','#9ad07a','#8ab8e8','#e8c07a','#c8a0e0'][i%5]),emissive:col('#446'),emissiveIntensity:.3}),rr(-.07,.07),i*.03,rr(-.07,.07),HOME.jar,false);m.scale.y=.6;});
  HOME.award.visible=all.length>0&&all.every(s=>stampDone(s.id));HOME.trophy.visible=all.filter(s=>stampDone(s.id)).length>=Math.ceil(all.length/2);}
// ---------- per-frame: window colour, fish, clock, nearest usable furniture, pet goes to its bed
function homeTick(dt){if(!HOME_IN)return;HOME.viewMat.color.copy(S.skyHorizon).lerp(S.skyTop,.25).multiplyScalar(1.05);
  let best=null,bd=1.3;HOME.items.forEach(it=>{const fu=it.g.userData;if(fu.fish){fu.fish.rotation.y+=dt*1.2;}if(fu.hands){const d=new Date();fu.hands[0].rotation.z=-((d.getHours()%12)+d.getMinutes()/60)/12*PI*2;fu.hands[1].rotation.z=-d.getMinutes()/60*PI*2;}
    if(fu.paw)fu.paw.position.y=.95+Math.max(0,Math.sin(time*3))*.05;
    if(!it.f.act||it.d.wall)return;const d=Math.hypot(P.pos.x-(HX+it.d.x),P.pos.z-(HZ+it.d.z));if(d<bd){bd=d;best=it;}});
  if(best&&!HOME.edit){HOME.actPos.set(HX+best.d.x,0,HZ+best.d.z);HOME.act=furnAct(best);}else{HOME.actPos.set(0,-50,0);HOME.act=null;}
  if(HOME.selRing){HOME.selRing.visible=!!HOME.sel&&HOME.edit;if(HOME.sel){const p=HOME.sel.g.position;HOME.selRing.position.set(p.x,.03,p.z);if(HOME.sel.d.wall)HOME.selRing.visible=false;}}}
function furnAct(it){const k=it.f.act,n=it.f.name;
  if(k==='sit')return {label:`坐在${n}上`,fn:()=>{P.sit={pos:new T.Vector3(HX+it.d.x,.25,HZ+it.d.z),face:(it.d.r||0)*PI/2};}};
  if(k==='piano')return {label:'彈電子琴',fn:()=>{if(A.ready){const t=A.ctx.currentTime;[72,74,76,79,76,74,72,79].forEach((m,i)=>tone(440*Math.pow(2,(m-69)/12),t+i*.22,.5,'triangle',.08,A.sfx));}toast('♪ 叮叮噹噹～');}};
  if(k==='fish')return {label:'餵金魚',fn:()=>{toast('金魚開心地游來游去 🐟');}};
  if(k==='maneki')return {label:'摸摸招財貓',fn:()=>{say('招財貓',[pick(['喵～祝你今天答題全對！','好運來～記得先把題目看清楚喔。','招財貓對你揮揮手。'])]);}};
  if(k==='hug')return {label:'抱抱熊熊',fn:()=>{heart(it.g.getWorldPosition(new T.Vector3()));toast('軟綿綿的～');}};
  if(k==='read')return {label:'看漫畫',fn:()=>{say('漫畫',[pick(['主角說：「失敗了也沒關係，再試一次就好！」','這一集，主角和他的貓一起去海邊撿玻璃。','你看得太入迷，差點忘了還有關卡要闖！'])]);}};
  if(k==='scope')return {label:'看望遠鏡',fn:()=>{say('望遠鏡',[S.night>.5?'看得到好多星星！那顆特別亮的是金星嗎？':'白天看不到星星，但可以看到遠方的漁船和燈塔。'])}};
  return null;}
// ---------- decorate / shop panel
function openDecor(mode){if(!HOME_IN)return;if(DLG.open)closeDlg();HOME.mode=mode;HOME.tab='furn';HOME.edit=mode==='edit';HOME.pending=null;HOME.sel=null;
  if(!HOME.selRing){HOME.selRing=new T.Mesh(new T.RingGeometry(.45,.55,32).rotateX(-PI/2),new T.MeshBasicMaterial({color:0xe6be78,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));HOME.g.add(HOME.selRing);HOME.selRing.visible=false;}
  document.body.classList.toggle('decorating',HOME.edit);$('decor').hidden=false;renderDecor();}
function closeDecor(){if($('decor').hidden)return;$('decor').hidden=true;HOME.edit=false;HOME.pending=null;HOME.sel=null;document.body.classList.remove('decorating');save();cv.focus({preventScroll:true});}
function renderDecor(){const H=homeState();const shop=HOME.mode==='shop';
  $('dcTitle').textContent=shop?'家具型錄':'佈置房間';$('dcCoins').textContent=`金幣 ${W.coins}`;
  const tabs=$('dcTabs');tabs.innerHTML='';[['furn','家具'],['wall','壁紙'],['floor','地板']].forEach(([k,l])=>{const b=el('button',{type:'button',text:l,'aria-selected':String(HOME.tab===k)});b.onclick=()=>{HOME.tab=k;HOME.pending=null;renderDecor();};tabs.appendChild(b);});
  const list=$('dcList');list.innerHTML='';const hint=$('dcHint');const sel=$('dcSel');sel.hidden=true;
  if(HOME.tab==='furn'){
    if(shop){hint.textContent='用闖關賺來的金幣買家具，買了再按上方「佈置」擺到房間裡。';
      FURN.forEach(f=>{const own=W.furn[f.k]||0;const b=el('button',{type:'button',class:'dc-item'},[el('b',{text:f.name}),el('span',{text:`${f.price} 金幣${own?`・已有 ${own}`:''}`}),el('small',{text:f.type==='wall'?'掛牆上':'放地上'})]);
        b.onclick=()=>{if(W.coins<f.price){toast(`金幣不夠（需要 ${f.price}）`);SND.wrong&&SND.wrong();return;}W.coins-=f.price;W.furn[f.k]=own+1;renderPouch();save();SND.register&&SND.register();toast(`買了「${f.name}」！按「佈置」放進房間`);renderDecor();};list.appendChild(b);});}
    else{const placed={};H.items.forEach(d=>placed[d.k]=(placed[d.k]||0)+1);const avail=FURN.filter(f=>(W.furn[f.k]||0)-(placed[f.k]||0)>0);
      hint.textContent=HOME.pending?`點房間裡的${FURN_BY[HOME.pending.k].type==='wall'?'牆壁':'地板'}，把「${FURN_BY[HOME.pending.k].name}」放上去`:avail.length?'點一個家具，再點房間的地板（或牆壁）放下去。點已經放好的家具，可以轉向或收起來。':'還沒有可以擺的家具。書桌上的「家具型錄」可以買喔！（已經擺好的家具，點一下可以移動）';
      avail.forEach(f=>{const left=(W.furn[f.k]||0)-(placed[f.k]||0);const b=el('button',{type:'button',class:'dc-item','aria-pressed':String(!!HOME.pending&&HOME.pending.k===f.k&&!HOME.pending.it)},[el('b',{text:f.name}),el('span',{text:`還有 ${left} 個`})]);b.onclick=()=>{HOME.pending={k:f.k};HOME.sel=null;renderDecor();};list.appendChild(b);});
      if(HOME.sel){sel.hidden=false;sel.innerHTML='';sel.appendChild(el('span',{text:`選到：${HOME.sel.f.name}`}));
        if(!HOME.sel.d.wall){const r=el('button',{type:'button',class:'btn ghost small',text:'轉向'});r.onclick=()=>{HOME.sel.d.r=((HOME.sel.d.r||0)+1)%4;placeItemGroup(HOME.sel.g,HOME.sel.d);rebuildHomeCols();save();};sel.appendChild(r);}
        const mv=el('button',{type:'button',class:'btn ghost small',text:'移動'});mv.onclick=()=>{HOME.pending={k:HOME.sel.d.k,it:HOME.sel};renderDecor();};sel.appendChild(mv);
        const rm=el('button',{type:'button',class:'btn ghost small',text:'收起來'});rm.onclick=()=>{const it=HOME.sel;H.items.splice(H.items.indexOf(it.d),1);HOME.g.remove(it.g);HOME.items.splice(HOME.items.indexOf(it),1);HOME.sel=null;rebuildHomeCols();save();renderDecor();};sel.appendChild(rm);}}}
  else{const isWall=HOME.tab==='wall';const opts=isWall?WALLPAPERS:FLOORS;const ownedList=isWall?H.walls:H.floors;
    hint.textContent=shop?'買了就能隨時換。':'點一下就換上去。還沒買的，到書桌上的型錄買。';
    opts.forEach(o=>{const own=o.price===0||ownedList.includes(o.id);const on=(isWall?H.wall:H.floor)===o.id;
      if(!shop&&!own)return;
      const b=el('button',{type:'button',class:'dc-item','aria-pressed':String(on)},[el('i',{class:'dc-sw',style:`background:${o.sw}`}),el('b',{text:o.name}),el('span',{text:own?(on?'使用中':'已擁有'):`${o.price} 金幣`})]);
      b.onclick=()=>{if(!own){if(W.coins<o.price){toast(`金幣不夠（需要 ${o.price}）`);return;}W.coins-=o.price;ownedList.push(o.id);renderPouch();SND.register&&SND.register();}
        if(isWall){H.wall=o.id;setWall(o.id);}else{H.floor=o.id;setFloor(o.id);}save();renderDecor();};list.appendChild(b);});}}
$('dcDone').onclick=closeDecor;$('dcClose').onclick=closeDecor;
$('bDecor').onclick=()=>openDecor('edit');$('bShop').onclick=()=>openDecor('shop');$('bOut').onclick=()=>exitHome();
// ---------- tap in the room while decorating
const _ray=new T.Raycaster(),_ndc=new T.Vector2();let _hd=null;
cv.addEventListener('pointerdown',e=>{_hd={x:e.clientX,y:e.clientY};});
cv.addEventListener('pointerup',e=>{if(!HOME.edit||!_hd)return;if(Math.hypot(e.clientX-_hd.x,e.clientY-_hd.y)>8)return;homeClick(e);});
function homeClick(e){const r=cv.getBoundingClientRect();_ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);_ray.setFromCamera(_ndc,camera);
  const H=homeState();
  if(!HOME.pending){// select a placed item
    const hits=_ray.intersectObjects(HOME.items.map(i=>i.g),true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.item)o=o.parent;HOME.sel=HOME.items.find(i=>i.g===o)||null;SND.pick&&A.ready&&SND.pick();}else HOME.sel=null;renderDecor();return;}
  const f=FURN_BY[HOME.pending.k];const targets=HOME.g.children.filter(c=>c.userData&&c.userData.pick);const hits=_ray.intersectObjects(targets,false);if(!hits.length)return;
  const h=hits.find(x=>f.type==='wall'?x.object.userData.pick!=='floor':x.object.userData.pick==='floor');if(!h){toast(f.type==='wall'?'這個要掛在牆上喔':'這個要放在地板上喔');return;}
  const lp=HOME.g.worldToLocal(h.point.clone());let d;
  if(f.type==='wall'){const tag=h.object.userData.pick;const u=tag==='wb'||tag==='wf'?lp.x:lp.z;const lim=tag==='wb'||tag==='wf'?HOME.RW/2-.6:HOME.RD/2-.6;
    d={k:f.k,wall:tag,u:Math.round(clamp(u,-lim,lim)*4)/4,y:Math.round(clamp(lp.y,1.2,2.4)*4)/4};
    if(tag==='wb'&&Math.abs(d.u+.1)<1.4&&d.y<2.6&&d.y>.9){toast('這裡是窗戶，換個地方掛吧');return;}if(tag==='wf'&&Math.abs(d.u-2.2)<.9){toast('門口不能掛東西喔');return;}}
  else{const x=Math.round(clamp(lp.x,-3.1,3.1)*4)/4,z=Math.round(clamp(lp.z,-2.7,2.7)*4)/4;const fp=f.fp||[.3,.3];
    if(HOME_BLOCK.some(([a,b,c,dd])=>x+fp[0]/2>a&&x-fp[0]/2<b&&z+fp[1]/2>c&&z-fp[1]/2<dd)&&f.k!=='rug'){toast('這裡有東西了，換個地方吧');return;}
    d={k:f.k,x,z,r:HOME.pending.it?HOME.pending.it.d.r||0:0};}
  if(HOME.pending.it){const it=HOME.pending.it;Object.keys(it.d).forEach(k=>delete it.d[k]);Object.assign(it.d,d);placeItemGroup(it.g,it.d);HOME.sel=it;}
  else{H.items.push(d);HOME.sel=spawnItem(d);}
  HOME.pending=null;rebuildHomeCols();save();SND.pick&&A.ready&&SND.pick();renderDecor();}
