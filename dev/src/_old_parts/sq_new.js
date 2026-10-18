/* ================================================================
   Sqoyaw (環山) — the students' home village, laid out after the real map:
   river & suspension bridge to the west, 平等國小 + field in the south-west,
   dense lanes (環山一～三巷) climbing to the north-east, 台7甲 curving round the east.
   Local coords: lx = east, lz = south (north is -z).
   ================================================================ */
const TB={x:2600,z:0,houses:{},spots:{},flags:{}};
function tbIn(){return !INDOOR&&P.pos.x>2300;}
function sqBase(lx,lz){
  let h=(lx+60)*.05+(40-lz)*.045;
  const f=smooth(5,0,Math.max(0,Math.abs(lx+47)-15,Math.abs(lz-36)-17));h=lerp(h,1.4,f);   // school yard + field
  if(lx<-104)h=lerp(h,-9,smooth(-104,-115,lx));                                          // bank down to the river
  if(lx<-131)h=lerp(h,2.5,smooth(-131,-136,lx));                                         // far-bank shelf
  const e=Math.max(0,lx-118,-106-lz,lz-88,-150-lx);
  if(e>0)h+=smooth(0,30,e)*40+e*.95+(fbm(lx*.025+7,lz*.025+3)-.5)*26*smooth(0,25,e);
  return h;}
function tribeH(lx,lz){
  if(lz>-23.4&&lz<-20.6&&lx<-106&&lx>-138){const t=(lx+106)/-32;return lerp(sqBase(-106,-22),2.5,t)-1.3*Math.sin(t*PI);}  // 四季蘭溪吊橋 deck
  if(TB.pads)for(const q of TB.pads)if(lx>q.x0&&lx<q.x1&&lz>q.z0&&lz<q.z1)return q.y;
  return sqBase(lx,lz);}
function tbClamp(p){let lx=p.x-TB.x,lz=p.z-TB.z;
  if(lz>-23.3&&lz<-20.7&&lx<-106&&lx>-138){}                       // on the bridge
  else if(lx<=-138){lx=clamp(lx,-147,-138.01);lz=clamp(lz,-32,-10);}  // far bank (志佳陽登山口)
  else{lx=clamp(lx,-108,114);lz=clamp(lz,-100,82);}
  p.x=TB.x+lx;p.z=TB.z+lz;}
function tbMySeat(){const n=parseInt(W.seat,10);return n>0?((n-1)%5)+1:0;}
// lanes (環山一～三巷 etc.) and 台7甲
const SQ_LANES=[
  {n:'環山二巷',w:4,p:[[14,-58],[26,-57],[38,-65],[54,-76],[68,-81],[84,-90]]},
  {n:'',w:5,p:[[-43,22],[-32,14],[-20,4],[-12,-6],[-4,-16],[3,-26],[8,-33],[5,-39],[0,-44],[-10,-52],[-20,-60],[-26,-68],[-32,-82],[-40,-90],[-45,-102]]},
  {n:'',w:4,p:[[-43,22],[-54,13],[-61,4],[-67,-8],[-75,-15.6],[-86,-19.6],[-98,-21],[-107,-22]]},
  {n:'',w:4,p:[[-17,6],[-9,15],[-1,23],[8,30],[18,32.6],[29,32],[40,30],[45,29]]},
  {n:'',w:3.8,p:[[45,29],[49,22],[50,12],[44,6],[34,0],[23,-6],[14,-11],[5,-16.4]]},
  {n:'',w:3.6,p:[[8,-33],[20,-24],[29,-15],[44,-7],[52,-18],[63,-22.4]]},
  {n:'',w:3.4,p:[[22,-32],[36,-32]]},
  {n:'',w:4,p:[[-4,-98],[1,-78],[8,-67],[14,-58],[10,-44],[8,-33]]},
  {n:'',w:3.8,p:[[45,29],[38,40],[26,48],[18,58],[20,70],[22,84]]},
  {n:'',w:3.4,p:[[-32,27],[-26,38],[-26,43],[-29,61]]},
  {n:'',w:3.2,p:[[-26,43],[-44,61]]}];
const SQ_ROAD=[[-10,90],[20,82],[48,72],[80,58],[102,34],[112,0],[106,-36],[92,-70],[76,-104]];
function sqSegD(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz||1;const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/l2,0,1);return [Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),a[0]+dx*t,a[1]+dz*t];}
function sqNear(x,z,pts){let best=[1e9,0,0];for(let i=0;i<pts.length-1;i++){const r=sqSegD(x,z,pts[i],pts[i+1]);if(r[0]<best[0])best=r;}return best;}
function sqLaneD(x,z){let b=[1e9,0,0];SQ_LANES.forEach(L=>{const r=sqNear(x,z,L.p);if(r[0]-L.w/2<b[0]){b=[r[0]-L.w/2,r[1],r[2]];}});return b;}
// 走讀 Sqoyaw check-in stations (text from the class lesson plan)
const SQW=[
  {id:'school',n:'平等國小',p:[-30,9],s:['部落裡的學校，是踏查的起點和終點。從操場可以看到四面的山。','學校在部落的中心，是大家每天聚在一起的地方。']},
  {id:'trail',n:'環山獵人登山步道登山口',p:[-50,-10],s:['登山口就在學校後方。步道是沿著 Sqoyaw 泰雅族的傳統獵徑修復的，裡面有半穴居、獵人教室。','以前族人就是從這裡上山打獵、採集；2015 年市府和部落長老一起用 GPS 和口述歷史，把古獵徑找回來。','（我們只在入口看解說牌，不進入步道。）']},
  {id:'kinder',n:'幼兒園環山分所',p:[-22,-8],s:['部落唯一的幼兒園。','很多同學都是從這裡長大的。']},
  {id:'shop',n:'便利商店（7-11 環山門市）',p:[28,42],s:['部落裡的便利商店，買東西、繳費、領包裹都在這裡，也是大家見面聊天的地方。','以前沒有商店，祖先是用「以物易物」換東西的。']},
  {id:'fruit',n:'以萬果園水果賣場',p:[14,4],s:['雜貨＋水果＋家常菜，附近還有愛玉商店、青山商行。','門口的甜柿、水蜜桃、雪梨，就是部落現在的產業。']},
  {id:'bus',n:'環山部落公車站',p:[45,4],s:['台 7 甲線上的公車站：往南到梨山，往北翻過思源埡口到宜蘭。','台 7 甲是部落對外的路；以前族人靠走路，現在有公車和蹦蹦車。']},
  {id:'church',n:'教會',p:[8,-5],s:['天主堂、長老教會、真耶穌教會都在環山一巷～二巷，彼此相距不到 100 公尺。','教會是部落聚會、唱歌、學母語的地方；很多歌謠和母語，都是在教會裡保留下來的。']},
  {id:'lane2',n:'環山二巷街道與果園',p:[24,-12],s:['部落的巷道、房子、蹦蹦車（小貨車），還有路邊的果園。','祖先種小米，我們現在種甜柿、水蜜桃、雪梨；秋天甜柿成熟時，整片山都是黃澄澄的。']}];
function sqDone(){return SQW.filter(s=>W.sqw&&W.sqw[s.id]).length;}
function sqCheck(id){const st=SQW.find(s=>s.id===id);if(!st)return;W.sqw=W.sqw||{};const f=TB.flags[id];
  if(!W.sqw[id]&&!TS()){W.sqw[id]=Date.now();const n=sqDone();histAdd&&histAdd('adv',`走讀 Sqoyaw 打卡：${st.n}`);
    if(f)f.material.color.copy(col('#4fae6c'));SND.pick&&SND.pick();
    if(n>=SQW.length){W.coins+=80;led(80,'走讀 Sqoyaw 全部打卡','獎勵');renderPouch();setTimeout(()=>say('走讀 Sqoyaw',['🎉 八個地方全部打卡完成！+80 金幣','你已經認識 Qalang Sqoyaw 的重要地標了。回家問問長輩：「你小時候的部落跟現在有什麼不一樣？」']),400);}
    else toast(`📍 走讀打卡：${st.n}（${n}/${SQW.length}）`);save();}}
function sqStory(id){const st=SQW.find(s=>s.id===id);say(st.n,st.s,{onEnd:()=>sqCheck(id)});}
(function(){
  const G=new T.Group();G.position.set(TB.x,0,TB.z);scene.add(G);TB.g=G;const tc=new T.Color(),t2=new T.Color();
  const P_=(x,z,dy=0)=>new T.Vector3(TB.x+x,tribeH(x,z)+dy,TB.z+z);const H=(x,z)=>tribeH(x,z);
  const sign=(x,y,z,ry,txt,w,bg='#6e4c33',fg='#f3e6c8',sub)=>{const [c,g]=C2(512,sub?160:112);g.fillStyle=bg;g.fillRect(0,0,512,c.height);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
    g.font=`800 ${txt.length>8?40:54}px ${FG}`;g.fillText(txt,256,sub?58:58);if(sub){g.font=`600 30px ${FG}`;g.globalAlpha=.85;g.fillText(sub,256,124);}
    const m=mk(new T.PlaneGeometry(w,w*c.height/512),new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide}),x,y,z,G,false);m.rotation.y=ry;return m;};
  const post=(x,z,h=1.8)=>mk(bx(.14,h,.14),M.woodDark,x,H(x,z)+h/2,z,G);
  // ---------- terrain
  const axis=(a,b,far,st)=>{const r=[];for(let v=-far;v<a;v+=14)r.push(v);for(let v=a;v<b;v+=st)r.push(v);for(let v=b;v<=far;v+=14)r.push(v);return r;};
  const xs=axis(-152,120,440,1.6),zs=axis(-108,92,440,1.6),nx=xs.length,nz=zs.length;
  const pos=new Float32Array(nx*nz*3),cl=new Float32Array(nx*nz*3),idx=[];
  const colAt=(lx,lz,h)=>{const n=fbm(lx*.12+3,lz*.12);const e=Math.max(0,lx-118,-106-lz,lz-88,-150-lx);
    if(e>1.5){tc.set('#4a7440').lerp(t2.set('#2c5132'),clamp(n*1.3-.2,0,1)*.8);if(h>120)tc.lerp(t2.set('#6d8a8c'),smooth(120,220,h));return;}
    if(lx<-106&&lx>-136&&h<1){tc.set('#8a8676').lerp(t2.set('#6f7470'),n);return;}
    tc.set('#9aa866').lerp(t2.set('#7f9650'),n);tc.lerp(t2.set('#a8956f'),clamp((fbm(lx*.05,lz*.05)-.55)*2.2,0,.6));
    };
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=xs[i],z=zs[j],h=sqBase(x,z),k=(j*nx+i)*3;pos[k]=x;pos[k+1]=h;pos[k+2]=z;colAt(x,z,h);tc.convertSRGBToLinear();cl[k]=tc.r;cl[k+1]=tc.g;cl[k+2]=tc.b;}
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(pos,3));tg.setAttribute('color',new T.BufferAttribute(cl,3));tg.setIndex(idx);tg.computeVertexNormals();
  const ter=new T.Mesh(tg,new T.MeshLambertMaterial({vertexColors:true}));ter.receiveShadow=true;G.add(ter);
  // river (司界蘭溪 / 大甲溪 upstream)
  const wm=new T.MeshLambertMaterial({color:col('#5f9fc2'),transparent:true,opacity:.88,emissive:col('#2a5a78'),emissiveIntensity:.25});
  const wp=mk(new T.PlaneGeometry(17,230),wm,-123,-8.3,-10,G,false);wp.rotation.x=-PI/2;wp.receiveShadow=false;
  for(let i=0;i<50;i++){const r=mk(ico(rr(.4,1.3),0),M.stone,rr(-130,-116),-8.6,rr(-100,80),G);r.scale.y=rr(.4,.8);}
  // ---------- ribbons: lanes + 台7甲
  const ribbon=(pts,w,mat,dy=.07)=>{const P=[];for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1];const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/1.2));for(let k=0;k<n;k++){const t=k/n;P.push([x0+(x1-x0)*t,z0+(z1-z0)*t]);}}P.push(pts[pts.length-1]);
    const v=[],ix=[];P.forEach((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(P.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;const nx_=-dz/l,nz_=dx/l;
      [-1,1].forEach(s=>{const x=p[0]+nx_*w/2*s,z=p[1]+nz_*w/2*s;v.push(x,sqBase(x,z)+dy,z);});if(i>0){const k=i*2;ix.push(k-2,k-1,k,k-1,k+1,k);}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.receiveShadow=true;G.add(m);return m;};
  const laneM=lam('#a29e95',{side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  SQ_LANES.forEach(L=>ribbon(L.p,L.w,laneM));
  ribbon(SQ_ROAD,7.4,lam('#5d5c58',{side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),.09);
  ribbon(SQ_ROAD,.28,lam('#e8c84a',{side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),.12);
  for(let i=0;i<SQ_ROAD.length-1;i++){const [x0,z0]=SQ_ROAD[i],[x1,z1]=SQ_ROAD[i+1];const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/2.2);for(let k=0;k<n;k++){const t=k/n,x=x0+(x1-x0)*t+4.1,z=z0+(z1-z0)*t;mk(bx(.1,.7,.1),M.metal,x,sqBase(x,z)+.35,z,G,false);}}
  {const [c,g]=C2(128,128);g.fillStyle='#2f5f9f';g.beginPath();g.moveTo(64,6);g.lineTo(120,40);g.lineTo(100,120);g.lineTo(28,120);g.lineTo(8,40);g.closePath();g.fill();g.strokeStyle='#fff';g.lineWidth=6;g.stroke();g.fillStyle='#fff';g.font=`900 44px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('7甲',64,74);
    post(104,20,2.6);const s=mk(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide,transparent:true}),104,H(104,20)+2.6,20,G,false);s.rotation.y=-PI/2;}
  // ---------- forest + clouds
  {const N=1500,cone=new T.ConeGeometry(1.7,5.2,7);cone.translate(0,2.4,0);const leafy=new T.IcosahedronGeometry(2.3,0);leafy.translate(0,2.5,0);
    const A=new T.InstancedMesh(cone,new T.MeshLambertMaterial({color:0xffffff}),N),B=new T.InstancedMesh(leafy,new T.MeshLambertMaterial({color:0xffffff}),N);
    const mm=new T.Matrix4(),q=new T.Quaternion(),sv=new T.Vector3(),pv=new T.Vector3();let na=0,nb=0;
    for(let i=0;i<N*3&&(na<N||nb<N);i++){const x=rr(-360,360),z=rr(-360,360);const e=Math.max(0,x-118,-106-z,z-88,-150-x);const bank=x<-106&&x>-114||x<-134&&x>-150;if(e<3&&!bank)continue;const h=sqBase(x,z);if(h>170||h<-7)continue;
      const s=rr(.8,1.7);sv.set(s,s*rr(.85,1.3),s);pv.set(x,h-.4,z);q.setFromAxisAngle(T.Object3D.DefaultUp,rr(0,6.3));mm.compose(pv,q,sv);
      const conifer=h>55?rand()<.8:rand()<.35;if(conifer&&na<N){A.setMatrixAt(na,mm);A.setColorAt(na,tc.set(pick(['#2f5a3a','#2a4f35','#3a6640'])).convertSRGBToLinear());na++;}
      else if(nb<N){B.setMatrixAt(nb,mm);B.setColorAt(nb,tc.set(pick(['#4f7f3f','#5f8a44','#3f6f3a','#6a8f4a'])).convertSRGBToLinear());nb++;}}
    A.count=na;B.count=nb;A.castShadow=B.castShadow=false;G.add(A);G.add(B);}
  {const [c,g]=C2(256,128);const gr=g.createRadialGradient(128,64,6,128,64,120);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.55,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128);
    const cm=new T.SpriteMaterial({map:TX(c),transparent:true,depthWrite:false,opacity:.8});
    for(let i=0;i<18;i++){const a=i/18*6.28+rr(-.15,.15),r=rr(190,300);const s=new T.Sprite(cm);s.position.set(Math.cos(a)*r,rr(30,64),Math.sin(a)*r);s.scale.set(rr(70,130),rr(20,34),1);G.add(s);}}
  // ---------- landmarks
  const LM=[];const reserve=(x,z,r)=>LM.push([x,z,r]);
  const box=(w,h,d,mat,x,z,ry=0,y0)=>{const b=y0!=null?y0:Math.max(H(x-w/2,z-d/2),H(x+w/2,z-d/2),H(x-w/2,z+d/2),H(x+w/2,z+d/2));const g=new T.Group();g.position.set(x,b,z);g.rotation.y=ry;G.add(g);
    mk(bx(w,h,d),mat,0,h/2,0,g);mk(bx(w+.1,4,d+.1),M.concrete,0,-2,0,g);const cs=Math.abs(Math.cos(ry))>.5;const hw=(cs?w:d)/2,hd=(cs?d:w)/2;addCol(TB.x+x-hw,TB.x+x+hw,TB.z+z-hd,TB.z+z+hd,b+h+2);return g;};
  const gable=(g,w,d,h,rh,mat)=>{const half=d/2+.4,sl=Math.hypot(half,rh);[-1,1].forEach(s=>{const r=mk(bx(w+.6,.14,sl),mat,0,h+rh/2,s*half/2,g);r.rotation.x=s*Math.atan2(rh,half);});
    const sh=new T.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rh-.05);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:w-.02,bevelEnabled:false}),g.children[0].material,-w/2+.01,h,0,g);e.rotation.y=PI/2;};
  const flagAt=(id,x,z)=>{post(x,z,2.2);const f=mk(new T.PlaneGeometry(.8,.5),new T.MeshLambertMaterial({color:col('#e0674b'),side:T.DoubleSide}),x+.42,H(x,z)+2,z,G,false);TB.flags[id]=f;};
  const brick=lam('#ffffff',{map:(()=>{const [c,g]=C2(128,128);g.fillStyle='#e6ddd0';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=16)for(let x=((y/16)%2)*16;x<128+16;x+=32){g.fillStyle=pick(['#a8483a','#b4523f','#9c4234']);g.fillRect(x-15,y+1,30,14);}return TX(c,true);})()});
  // 平等國小 + field (south-west)
  {const g=box(22,7,7,brick,-50,26);for(let i=0;i<8;i++)[2.2,5].forEach(y=>mk(bx(1.6,1.3,.08),lam('#dfe9ee'),-9+i*2.6,y,-3.53,g,false));
    mk(bx(22.4,.35,7.4),lam('#f2efe8'),0,3.6,0,g);mk(bx(22.6,.5,7.6),lam('#f2efe8'),0,7.2,0,g);mk(bx(3,3,3),brick,0,8.9,0,g);mk(cy(.05,.05,4,6),M.metal,0,11.5,0,g);
    const fl=mk(new T.PlaneGeometry(1.2,.8),lam('#e0674b',{side:T.DoubleSide}),.6,12.8,0,g,false);TB.flag=fl;
    sign(-50,H(-50,26)+6.2,22.44,PI,'平等國小',5,'#f2efe8','#2f4f3a');
    const [c,gg]=C2(256,160);gg.fillStyle='#b3553f';gg.fillRect(0,0,256,160);gg.fillStyle='#6fa04a';gg.beginPath();gg.ellipse(128,80,100,48,0,0,7);gg.fill();gg.strokeStyle='#fff';gg.lineWidth=3;gg.beginPath();gg.ellipse(128,80,112,60,0,0,7);gg.stroke();gg.beginPath();gg.ellipse(128,80,120,68,0,0,7);gg.stroke();
    const fm=mk(new T.PlaneGeometry(26,15),lam('#ffffff',{map:TX(c),polygonOffset:true,polygonOffsetFactor:-2}),-44,1.47,44,G,false);fm.rotation.x=-PI/2;
    [[-55,44],[-33,44]].forEach(([x,z])=>{mk(cy(.08,.08,3,6),M.metal,x,1.4+1.5,z,G);mk(bx(.1,.9,1.2),lam('#f2efe8'),x+(x<-44?.3:-.3),1.4+3,z,G,false);});
    reserve(-50,26,13);reserve(-44,44,15);flagAt('school',-38,21.5);inter(P_(-39,20.5),1.8,'平等國小（走讀打卡）',()=>sqStory('school'));
    inter(P_(-50,21.2),1.8,'看平等國小的公告欄',()=>openBoard('news'));}
  // 獵人步道登山口 (behind the school, west)
  {const x=-59,z=18;[-1.3,1.3].forEach(k=>mk(bx(.3,3,.3),M.woodDark,x,H(x,z+k)+1.5,z+k,G));mk(bx(.4,.4,3.2),M.woodDark,x,H(x,z)+3.1,z,G);
    sign(x+.25,H(x,z)+3.6,z,PI/2,'環山獵人步道',3,'#4a3527','#f3e6c8');post(-56,22.5,1.6);sign(-55.93,H(-56,22.5)+1.5,22.5,PI/2,'解說牌',1.4,'#2f5a3a','#fff','只在入口看，不進入');
    [[-62,14],[-63,21],[-64,17],[-61,24]].forEach(([a,b])=>{mk(cy(.2,.3,2,7),M.trunk,a,H(a,b)+1,b,G);mk(ico(1.6,1),M.leaf,a,H(a,b)+3,b,G);});
    reserve(x,z,4);flagAt('trail',-55,17);inter(P_(-56,17.5),1.8,'獵人步道登山口（走讀打卡）',()=>sqStory('trail'));}
  // 幼兒園
  {const g=box(9,3.2,5.5,lam('#fff1d8'),-15,24,PI);gable(g,9,5.5,3.2,1.4,lam('#e0674b'));mk(bx(1.3,2.1,.08),M.doorWood,0,1.05,2.8,g);[-3,3].forEach(x=>mk(bx(1.6,1,.08),lam('#bfe3f5'),x,1.8,2.8,g,false));
    const sl=mk(bx(.8,.1,3.4),lam('#f2c14e'),-21,H(-21,20)+1,20,G);sl.rotation.x=.45;mk(bx(1,.1,1),lam('#4f9ad8'),-21,H(-21,20)+1.8,18.4,G);
    sign(-15,H(-15,24)+2.5,21.18,PI,'幼兒園環山分所',3.2,'#fff1d8','#c8432b');reserve(-15,24,6);flagAt('kinder',-10,19.5);inter(P_(-11,19),1.7,'幼兒園（走讀打卡）',()=>sqStory('kinder'));}
  // 便利商店 7-ELEVEN 環山門市 (far south, beside 台7甲 — a bit of a walk)
  {const g=box(9,3.4,6,lam('#f7f7f4'),27,70,-PI/2);mk(bx(9.3,.5,6.3),lam('#f7f7f4'),0,3.45,0,g);mk(bx(7,2.3,.08),lam('#cfe4ec'),0,1.25,3.03,g,false);mk(bx(1.8,2.3,.1),lam('#9fc3d6'),2.6,1.15,3.05,g,false);
    sign(23.9,H(23.9,70)+3.05,70,-PI/2,'7-ELEVEN 環山門市',5.2,'#ffffff','#2f7f4a');
    reserve(27,70,7);flagAt('shop',22.5,65.5);inter(P_(22.8,67),1.8,'便利商店（走讀打卡）',()=>sqStory('shop'));inter(P_(22.8,72.5),1.6,'進去逛逛（7-11）',()=>openShop('rice'));}
  // 以萬果園水果賣場
  {const g=box(8,3.2,5,lam('#efe3cf'),18,26,0);mk(bx(8.4,.12,1.6),lam('#4f8a5b'),0,2.9,3.2,g);
    for(let i=0;i<6;i++){mk(bx(1,.5,.7),M.woodLight,-3+i*1.2,.25,3.2,g,false);for(let k=0;k<4;k++)mk(sph(.14,6,5),lam(['#f08a2a','#f6b0a0','#e8e0a0'][i%3]),-3.3+i*1.2+k*.2,.6,3.2,g,false);}
    sign(18,H(18,26)+3.4,28.75,0,'以萬果園',3,'#f08a2a','#fff','水果賣場');reserve(18,26,5);flagAt('fruit',22.5,30);inter(P_(21.5,30.5),1.8,'以萬果園（走讀打卡）',()=>sqStory('fruit'));}
  // 公車站
  {const x=34,z=35.5;[-1.6,1.6].forEach(k=>mk(cy(.07,.07,2.6,8),M.metalDark,x+k,H(x+k,z)+1.3,z+.8,G));mk(bx(4,.12,2),lam('#3b6ea5'),x,H(x,z)+2.65,z+.3,G);
    mk(bx(3,.08,.5),M.woodLight,x,H(x,z)+.45,z+.8,G,false);post(x-2.6,z-.6,2.4);sign(x-2.6,H(x-2.6,z)+2.5,z-.65,PI,'環山 公車站',2,'#2f6b56','#fff','台7甲');
    reserve(x,z,3);flagAt('bus',31,32);inter(P_(32.5,32.2),2,'環山部落公車站（走讀打卡）',()=>sqStory('bus'));
    inter(P_(36,32.2),1.6,'搭公車',()=>choose('環山公車站','要搭車去哪裡呢？',[{label:'🚉 平等車站',fn:()=>trainRide('平等',()=>enterStation({now:true}),'🚌')},{label:'🌊 汐見町（去闖關）',fn:()=>trainRide('汐見町',()=>arriveShiomi(),'🚌')},{label:'📍 看走讀打卡卡',fn:()=>sqCard()},{label:'再逛一下',fn:null}]));}
  // three churches
  {const church=(x,z,ry,wall,roof,name,tall)=>{const g=box(7,4,10,lam(wall),x,z,ry);gable(g,7,10,4,2.2,lam(roof));const t=tall?7.5:5.2;mk(bx(2.2,t,2.2),lam(wall),0,t/2,-4.2,g);
      const sp=mk(new T.ConeGeometry(1.6,2.6,4),lam(roof),0,t+1.3,-4.2,g);sp.rotation.y=PI/4;mk(bx(.18,1.6,.18),lam('#f2efe8'),0,t+3.3,-4.2,g,false);mk(bx(1,.18,.18),lam('#f2efe8'),0,t+3.5,-4.2,g,false);
      mk(bx(1.6,2.6,.08),M.doorWood,0,1.3,-5.03,g);const sgn=sign(0,0,0,0,name,3.2,'#f2efe8','#3a2a20');G.remove(sgn);g.add(sgn);sgn.position.set(0,t-1.2,-5.33);sgn.rotation.y=PI;reserve(x,z,7);};
    church(30,18,0,'#f4f0e6','#b8452f','環山天主堂',false);church(22,4,PI/2,'#eef2f5','#3b6ea5','真耶穌教會',false);church(65,-29,0,'#f3ead3','#7a4a3a','長老教會',true);
    flagAt('church',27,11.5);inter(P_(28,11),1.8,'教會（走讀打卡）',()=>sqStory('church'));}
  // 石板屋, 泰雅文物館 + granary, 眺望點
  {const sl=lam('#8a8680',{map:(()=>{const [c,g]=C2(128,128);g.fillStyle='#8a8680';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=10)for(let x=-(y%20);x<128;x+=22){g.fillStyle=pick(['#7a766f','#96928a','#6f6b65']);g.fillRect(x+1,y+1,20,8);}return TX(c,true);})()});
    const g=box(6,2.2,5,sl,-5,-31,0);gable(g,6,5,2.2,1,sl);mk(bx(1,1.7,.08),M.woodDark,0,.85,2.53,g);reserve(-5,-31,4.5);
    inter(P_(-5,-27.4),1.6,'看石板屋',()=>say('石板屋',['牆壁和屋頂都是用石板一片一片疊起來的。','石板很厚，冬天保暖、夏天涼爽。']));}
  {const m=box(10,4,6,lam('#b9b3a6'),-13,-19,PI/2);gable(m,10,6,4,1.6,lam('#c7cbcf'));mk(bx(10.05,1.2,6.05),M.wood,0,.6,0,m);mk(bx(2,2.4,.1),M.doorWood,0,1.2,3.03,m);
    sign(-9.9,H(-9.9,-19)+3.3,-19,PI/2,'泰雅文物館',3.6,'#3a2a20','#f3e6c8');reserve(-13,-19,7);inter(P_(-8.4,-19),1.8,'進泰雅文物館（收藏館）',()=>tbMuseum());
    const gr=new T.Group();const gx=-15,gz=-28;gr.position.set(gx,H(gx,gz),gz);G.add(gr);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{mk(cy(.12,.14,1.6,8),M.woodDark,a*1.1,.8,b*1.1,gr);mk(cy(.34,.34,.06,12),M.woodLight,a*1.1,1.45,b*1.1,gr,false);});
    mk(bx(2.8,1.7,2.8),lam('#8a6446'),0,2.4,0,gr);[-1,1].forEach(s=>{const r=mk(bx(3.6,.3,2.3),lam('#9a8452'),0,3.75,s*.95,gr);r.rotation.x=s*.62;});addCol(TB.x+gx-1.5,TB.x+gx+1.5,gz-1.5,gz+1.5,H(gx,gz)+5);reserve(gx,gz,3);
    inter(P_(gx+2.6,gz),1.5,'看傳統穀倉',()=>say('穀倉',['這是傳統的穀倉，把房子架高，可以防潮、也防老鼠偷吃。','柱子上圓圓的板子，就是擋老鼠爬上去的。']));}
  {const x=62,z=26,y=H(x,z);mk(bx(4,.3,6),M.woodLight,x,y+.15,z,G);mk(bx(.12,1,6),M.woodDark,x+2,y+.8,z,G,false);[[-3],[3]].forEach(([a])=>mk(bx(4,1,.12),M.woodDark,x,y+.8,z+a,G,false));
    mk(cy(.08,.1,1.1,8),M.metalDark,x+1,y+.85,z,G);mk(cy(.18,.14,.5,10),M.metalDark,x+1,y+1.45,z,G,false).rotation.z=PI/2;reserve(x,z,4);
    inter(P_(x-1,z),1.8,'眺望點（看四周的山）',()=>say('眺望點',['從這裡可以看到四周的高山：雪山、南湖大山、志佳陽大山……「環山」就是被高山圍起來的意思。','遠一點的地方：四季蘭溪吊橋在部落西側；清泉橋在南方約 2.5 公里，族人暱稱「巴黎鐵橋」；還有 Sqoyaw 天空。']));}
  // 四季蘭溪吊橋 + 志佳陽大山登山口 (far bank)
  {const b=new T.Group();G.add(b);const BZ=-22;for(let x=-106;x>-138;x-=.5){mk(bx(.42,.1,2.3),M.woodLight,x,tribeH(x,BZ)-.08,BZ,b,false);}
    const y0=sqBase(-106,BZ);[[-106,y0],[-138,2.5]].forEach(([x,y])=>[-1.3,1.3].forEach(k=>mk(bx(.3,3.4,.3),M.woodDark,x,y+1.7,BZ+k,b)));
    [-1.25,1.25].forEach(k=>{const pts=[];for(let i=0;i<=32;i++){const x=-106-i,t=i/32;pts.push(new T.Vector3(x,lerp(y0,2.5,t)+3.2-2.1*Math.sin(t*PI),BZ+k));}
      mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts),64,.04,5),M.metalDark,0,0,0,b,false);
      const rail=pts.map(p=>new T.Vector3(p.x,tribeH(p.x,BZ)+.95,p.z));mk(new T.TubeGeometry(new T.CatmullRomCurve3(rail),64,.03,5),M.woodDark,0,0,0,b,false);
      pts.forEach((p,i)=>{if(i%2)return;const d=tribeH(p.x,BZ);mk(cy(.015,.015,p.y-d,4),M.metalDark,p.x,(p.y+d)/2,p.z,b,false);});});
    sign(-104.5,y0+2.4,BZ-2,PI/2,'四季蘭溪吊橋',2.6,'#4a3527','#f3e6c8','一次限 10 人');post(-104.5,BZ-2,2.2);
    inter(P_(-104,BZ),1.8,'看吊橋的牌子',()=>say('四季蘭溪吊橋',['民國 77 年建的吊橋，一次限 10 人通行。','溪裡偶爾看得到櫻花鉤吻鮭喔！']));
    post(-142,-17,1.8);sign(-142,2.5+1.9,-17,PI/2,'志佳陽大山登山口',3,'#2f5a3a','#fff','無裝備勿前往');
    [[-145.5,-28],[-145.5,-22],[-145.5,-16]].forEach(([x,z])=>{mk(bx(.12,.12,5.6),lam('#e0a020'),x,2.5+.9,z,G,false);mk(bx(.12,.12,5.6),lam('#c8432b'),x,2.5+.6,z,G,false);});
    inter(P_(-141,-20),1.8,'看登山口的牌子',()=>say('志佳陽大山登山口',['過了吊橋，就是志佳陽大山登山口，是早期攀登雪山的主要路線。','山路很危險，沒有登山裝備和大人帶領，千萬不要前往！']));}
  // 環山二巷: 蹦蹦車 + orchards; the five students live along this lane
  {const t=new T.Group();const tx=31,tz=-55.5;t.position.set(tx,H(tx,tz),tz);t.rotation.y=.55;G.add(t);mk(bx(1.5,1.4,1.6),M.red,1.4,1.05,0,t);mk(bx(.05,.6,1.3),M.glassDark,2.16,1.35,0,t,false);mk(bx(2.4,.5,1.7),M.red,-.6,.75,0,t);
    [[-1.5,.85],[-1.5,-.85],[1.4,.85],[1.4,-.85]].forEach(([x,z])=>{const w=mk(cy(.32,.32,.25,12),M.black,x,.32,z,t);w.rotation.x=PI/2;});for(let k=0;k<6;k++)mk(sph(.2,8,6),lam('#f08a2a'),-1.4+(k%3)*.5,1.15,(k<3?-.3:.3),t,false);
    addCol(TB.x+tx-2.3,TB.x+tx+2.3,tz-1.6,tz+1.6,H(tx,tz)+2.4);reserve(tx,tz,3.5);
    inter(P_(tx-1,tz-2.4),1.8,'坐蹦蹦車',()=>choose('蹦蹦車','噗噗噗～要載你去哪裡？',[{label:'🏠 我家門口',fn:()=>tbRide('home')},{label:'🏫 平等國小',fn:()=>tbRide('school')},{label:'🍊 甜柿果園',fn:()=>tbRide('orchard')},{label:'🌉 四季蘭溪吊橋',fn:()=>tbRide('bridge')},{label:'🚌 公車站',fn:()=>tbRide('bus')},{label:'🏪 7-11',fn:()=>tbRide('shop')},{label:'不用了',fn:null}]));
    flagAt('lane2',21,-54.5);inter(P_(21,-56),1.6,'環山二巷（走讀打卡）',()=>sqStory('lane2'));post(17,-54,2.2);sign(17,H(17,-54)+2.3,-53.95,0,'環山二巷',1.8,'#2f6b56','#fff');}
  {const fruitM=lam('#f08a2a',{emissive:col('#a04a10'),emissiveIntensity:.2});const FR=new T.InstancedMesh(sph(.2,8,6),fruitM,500);let nf=0;const mm=new T.Matrix4();
    const trees=[];for(let x=-20;x<=10;x+=5)for(let z=46;z<=62;z+=5)trees.push([x+rr(-.6,.6),z+rr(-.6,.6)]);for(let x=44;x<=72;x+=5)for(let z=-72;z<=-64;z+=5)trees.push([x+rr(-.6,.6),z+rr(-.5,.5)]);
    trees.forEach(([x,z],i)=>{if(sqLaneD(x,z)[0]<2.5)return;const y=H(x,z);mk(cy(.16,.24,1.6,7),M.trunk,x,y+.8,z,G);const cr=mk(ico(1.4,1),lam(i%2?'#5a8a3e':'#4f7f3a'),x,y+2.3,z,G);cr.scale.set(1.1,.85,1.1);
      for(let k=0;k<9&&nf<500;k++){const a=rr(0,6.28),b=rr(.2,1.3);mm.makeTranslation(x+Math.cos(a)*Math.sin(b)*1.5,y+2.2+Math.cos(b)*1,z+Math.sin(a)*Math.sin(b)*1.5);FR.setMatrixAt(nf++,mm);}
      addCol(TB.x+x-.3,TB.x+x+.3,z-.3,z+.3,y+3);if(i%3===0)inter(P_(x,z-1.6),1.5,()=>tbSeason()?'採甜柿':'看看柿子樹',()=>tbPick());reserve(x,z,2.4);});
    FR.count=nf;G.add(FR);TB.fruit=FR;post(-22,45,1.6);sign(-22,H(-22,45)+1.6,44.95,0,'甜柿果園',1.8,'#6e4c33','#ffd9a0');}
  // ---------- houses: dense cluster on the slope; 5 of them are the students' homes
  const WALLC=['#e9e6dc','#f1ede2','#dfe6e8','#e6eadb','#efe3cf','#e3e0ea'],ROOFC=['#b8452f','#3f7f6a','#3b6ea5','#8a8f94','#a34a3a','#2f7f67'];
  const winM=new T.MeshLambertMaterial({color:col('#a9cfe0'),emissive:col('#ffcf8a'),emissiveIntensity:0});TB.winM=winM;
  const siding=WALLC.map(h=>lam('#ffffff',{map:(()=>{const [c,g]=C2(64,64);g.fillStyle=h;g.fillRect(0,0,64,64);for(let y=0;y<64;y+=8){g.fillStyle='rgba(0,0,0,.09)';g.fillRect(0,y,64,2);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,y+2,64,1);}return TX(c,true);})()}));
  const cands=[];const addC=(px,pz)=>{const [ld,qx,qz]=sqLaneD(px,pz);if(ld<3.4||ld>11)return;if(sqNear(px,pz,SQ_ROAD)[0]<8)return;if(LM.some(([a,b,r])=>Math.hypot(px-a,pz-b)<r+3.2))return;if(cands.some(c=>Math.hypot(c.x-px,c.z-pz)<6.6))return;cands.push({x:px,z:pz,qx,qz,ld});};
  {const L=SQ_LANES[0].p;for(let i=0;i<L.length-1;i++){const [x0,z0]=L[i],[x1,z1]=L[i+1];const l=Math.hypot(x1-x0,z1-z0),n=Math.floor(l/8.5);for(let k=0;k<=n;k++){const t=(k+.5)/(n+1),x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,nx_=-(z1-z0)/l,nz_=(x1-x0)/l;[-1,1].forEach(s=>addC(x+nx_*8*s,z+nz_*8*s));}}}
  const stuC=cands.slice();
  for(let x=-30;x<=66;x+=7)for(let z=-56;z<=36;z+=6.5)addC(x+rr(-1.2,1.2),z+rr(-1.2,1.2));
  const stu=[];stuC.filter(c=>c.ld>=5.6).sort((a,b)=>a.x-b.x).forEach(c=>{if(stu.length<5)stu.push(c);});
  let seat=0;cands.forEach(c=>{const me=stu.includes(c);if(!me&&(rand()<.22||stu.some(q=>Math.hypot(q.x-c.x,q.z-c.z)<8.5)))return;tbHouse(G,c,me?++seat:0,siding,ROOFC,winM);});
  // own-house marker
  {const [c,g]=C2(256,96);g.fillStyle='rgba(255,247,226,.95)';rrect(g,6,8,244,80,40);g.fill();g.strokeStyle='#e0674b';g.lineWidth=6;rrect(g,6,8,244,80,40);g.stroke();g.fillStyle='#3a2a20';g.font=`800 44px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('🏠 你的家',128,50);
    const s=new T.Sprite(new T.SpriteMaterial({map:TX(c),depthTest:false,transparent:true}));s.scale.set(3.2,1.2,1);s.renderOrder=9;s.visible=false;scene.add(s);TB.mark=s;}
  TB.spots={bus:[33,31.5,-PI/2],station:[33,31.5,-PI/2],school:[-40,19,PI],orchard:[-8,42,PI],bridge:[-102,-22,-PI/2],houses:[26,-58.5,PI*.75],shop:[20.5,69,PI/2]};
  try{scene.updateMatrixWorld(true);inkTown(G);}catch(e){console.error(e);}})();
// the five students' homes: a cuter, bigger design (front gable, porch, flower boxes, picket fence, mailbox)
function tbCute(G,c,seat,winM){const CUTE=[{w:'#fbeee0',r:'#d9573b',d:'#3b6ea5'},{w:'#e3f2ea',r:'#2f7f6a',d:'#e0a020'},{w:'#e8eefb',r:'#34508f',d:'#d9573b'},{w:'#fff1d6',r:'#e07a2a',d:'#4f8a5b'},{w:'#f3e6f5',r:'#7a5aa8',d:'#e0674b'}];const P0=CUTE[(seat-1)%CUTE.length];
  const vx=c.qx-c.x,vz=c.qz-c.z;const f=Math.abs(vx)>Math.abs(vz)?[Math.sign(vx),0]:[0,Math.sign(vz)];const ry=Math.atan2(-f[0],-f[1]);
  const w=6,d=5.4,Hh=3.3,rh=2.3;const sx=f[0]?d:w,sz=f[0]?w:d;
  const y=Math.max(tribeH(c.x-sx/2,c.z-sz/2),tribeH(c.x+sx/2,c.z-sz/2),tribeH(c.x-sx/2,c.z+sz/2),tribeH(c.x+sx/2,c.z+sz/2))+.25;
  const g=new T.Group();g.position.set(c.x,y,c.z);g.rotation.y=ry;G.add(g);
  const wall=lam(P0.w),roof=lam(P0.r),trim=lam('#fbfaf6'),door=lam(P0.d);
  mk(bx(w,Hh,d),wall,0,Hh/2,0,g);mk(bx(w+.2,4,d+.2),lam('#b9b3a6'),0,-2,0,g);mk(bx(w+.1,.25,d+.1),trim,0,Hh,0,g);
  // front-facing gable: ridge runs front→back
  const half=w/2+.5,sl=Math.hypot(half,rh);[-1,1].forEach(s=>{const r=mk(bx(sl,.16,d+1),roof,s*half/2,Hh+rh/2,0,g);r.rotation.z=-s*Math.atan2(rh,half);});
  {const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(0,rh-.08);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:d-.02,bevelEnabled:false}),wall,0,Hh,-d/2+.01,g);}
  mk(bx(.6,1.6,.6),lam('#9a5a42'),w/4,Hh+rh*.75,d/4,g);                                        // chimney
  const rw=mk(cy(.55,.55,.12,20),trim,0,Hh+rh*.42,-d/2-.02,g,false);rw.rotation.x=PI/2;const rg=mk(cy(.42,.42,.14,20),winM,0,Hh+rh*.42,-d/2-.04,g,false);rg.rotation.x=PI/2; // round attic window
  // door + porch
  mk(bx(1.5,2.5,.1),trim,0,1.25,-d/2-.02,g,false);mk(bx(1.2,2.2,.12),door,0,1.1,-d/2-.05,g);mk(sph(.07,8,6),lam('#f2c14e'),.42,1.1,-d/2-.13,g,false);
  mk(bx(2.4,.18,1.6),trim,0,2.75,-d/2-.8,g);[-1,1].forEach(s=>mk(cy(.07,.07,2.7,8),trim,s*1.05,1.35,-d/2-1.5,g));mk(bx(2.4,.2,1.4),lam('#c9c3b6'),0,.1,-d/2-.75,g);
  [-1,1].forEach(s=>{mk(bx(.2,.3,.2),M.lampHead,s*.95,2.2,-d/2-.12,g,false);addGlow(s*.95,2.2,-d/2-.35,1.1,'#ffd79a','lamp',.9,g);});
  // windows with flower boxes
  [-1,1].forEach(s=>{mk(bx(1.35,1.15,.08),trim,s*1.9,1.85,-d/2-.02,g,false);mk(bx(1.15,.95,.1),winM,s*1.9,1.85,-d/2-.04,g,false);mk(bx(.06,.95,.12),trim,s*1.9,1.85,-d/2-.06,g,false);
    mk(bx(1.4,.28,.35),lam('#8a5a3a'),s*1.9,1.15,-d/2-.2,g);for(let k=0;k<5;k++)mk(sph(.12,6,5),lam(pick(['#f06a8a','#f2c14e','#f7f2e8','#e0674b','#b69ae6'])),s*1.9-.5+k*.25,1.38,-d/2-.22,g,false);});
  // side windows
  [-1,1].forEach(s=>{mk(bx(.08,1,1.1),trim,s*(w/2+.02),1.85,0,g,false);mk(bx(.1,.8,.9),winM,s*(w/2+.04),1.85,0,g,false);});
  // picket fence around the front yard (gap for the gate), mailbox, stepping stones
  const fz=-d/2-3.1,pk=trim;[[-w/2-.2,-1.2],[1.2,w/2+.2]].forEach(([a,b])=>{mk(bx(b-a,.08,.06),pk,(a+b)/2,.75,fz,g,false);mk(bx(b-a,.08,.06),pk,(a+b)/2,.4,fz,g,false);for(let x=a;x<=b+.01;x+=.35)mk(bx(.1,.95,.05),pk,x,.47,fz,g,false);});
  [-1,1].forEach(s=>{mk(bx(.06,.08,3.1),pk,s*(w/2+.2),.75,-d/2-1.55,g,false);for(let z=-d/2;z>fz;z-=.45)mk(bx(.05,.95,.1),pk,s*(w/2+.2),.47,z,g,false);});
  mk(bx(.1,1.1,.1),M.woodDark,1.6,.55,fz-.25,g);const mb=mk(bx(.45,.35,.6),lam(P0.d),1.6,1.25,fz-.25,g);
  mk(bx(w+.8,3.9,3.5),M.stone,0,-2,-d/2-1.6,g);mk(bx(w+.7,.12,3.4),lam('#8fb35a'),0,-.04,-d/2-1.6,g,false);mk(bx(1.3,.13,3.4),lam('#d8d2c4'),0,-.02,-d/2-1.6,g,false);
  for(let i=0;i<4;i++){const s=i<2?-1:1;mk(sph(.28,8,6),lam(pick(['#5f8a44','#4f7f3f'])),s*(w/2-.6-(i%2)*.8),.28,-d/2-2.2,g);mk(sph(.1,6,5),lam(pick(['#f06a8a','#f2c14e','#b69ae6'])),s*(w/2-.6-(i%2)*.8),.52,-d/2-2.2,g,false);}
  addCol(TB.x+c.x-sx/2,TB.x+c.x+sx/2,TB.z+c.z-sz/2,TB.z+c.z+sz/2,y+Hh+rh+2);
  const [cv,gg]=C2(160,112);gg.fillStyle='#fffaf0';rrect(gg,4,4,152,104,16);gg.fill();gg.strokeStyle=P0.r;gg.lineWidth=7;rrect(gg,4,4,152,104,16);gg.stroke();gg.fillStyle='#3a2a20';gg.font=`900 60px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText(String(seat),80,50);gg.font=`700 20px ${FG}`;gg.fillText('號的家',80,92);
  const np=mk(new T.PlaneGeometry(.75,.52),new T.MeshBasicMaterial({map:TX(cv)}),-1.05,2.35,-d/2-.07,g,false);np.rotation.y=PI;
  const cs=Math.cos(ry),sn=Math.sin(ry);const loc=(x,z)=>[c.x+x*cs+z*sn,c.z-x*sn+z*cs];const [ox,oz]=loc(0,-d/2-2.2);
  {const q1=loc(-w/2-.4,-d/2-3.35),q2=loc(w/2+.4,-d/2+.05);TB.pads=TB.pads||[];TB.pads.push({x0:Math.min(q1[0],q2[0]),x1:Math.max(q1[0],q2[0]),z0:Math.min(q1[1],q2[1]),z1:Math.max(q1[1],q2[1]),y});}const [cx2,cz2]=loc(0,0);
  TB.houses[seat]={x:ox,z:oz,y,top:y+Hh+rh+1.6,cx:cx2,cz:cz2,f};
  inter(new T.Vector3(TB.x+ox,y,TB.z+oz),1.8,()=>seat===tbMySeat()&&!TS()?'回家（我的房間）':TS()?`看 ${seat} 號的留言板`:`${seat} 號的家`,()=>{
    if(seat===tbMySeat()&&!TS()){HOME.from='tribe';enterHome();return;}
    if(TS()){teacherHomeBoard(String(seat));return;}
    say(`${seat} 號的家`,['叩叩叩……門關著。','之後換成雲端版，就能到同學家玩、在留言板留言喔！']);});}
function tbHouse(G,c,seat,siding,ROOFC,winM){if(seat){tbCute(G,c,seat,winM);return;}
  const vx=c.qx-c.x,vz=c.qz-c.z;const f=Math.abs(vx)>Math.abs(vz)?[Math.sign(vx),0]:[0,Math.sign(vz)];const ry=Math.atan2(-f[0],-f[1]);
  const two=rand()<.35,w=rr(4.6,5.8),d=rr(4,4.8),Hh=two?5.6:3.1;const sx=f[0]?d:w,sz=f[0]?w:d;
  const y=Math.max(tribeH(c.x-sx/2,c.z-sz/2),tribeH(c.x+sx/2,c.z-sz/2),tribeH(c.x-sx/2,c.z+sz/2),tribeH(c.x+sx/2,c.z+sz/2))+.1;
  const g=new T.Group();g.position.set(c.x,y,c.z);g.rotation.y=ry;G.add(g);const wm=pick(siding);
  mk(bx(w,Hh,d),wm,0,Hh/2,0,g);mk(bx(w+.12,4,d+.12),M.concrete,0,-2,0,g);
  const rm=lam(pick(ROOFC)),rh=rr(.7,1.1),half=d/2+.45,sl=Math.hypot(half,rh);
  [-1,1].forEach(s=>{const r=mk(bx(w+.7,.12,sl),rm,0,Hh+rh/2,s*half/2,g);r.rotation.x=s*Math.atan2(rh,half);});
  {const sh=new T.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rh-.05);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:w-.02,bevelEnabled:false}),wm,-w/2+.01,Hh,0,g);e.rotation.y=PI/2;}
  const dx=pick([-1.2,-.8,.8,1.2]);mk(bx(1.1,2.1,.08),M.doorWood,dx,1.05,-d/2-.03,g);
  const cn=mk(bx(1.8,.08,1.1),rm,dx,2.6,-d/2-.5,g);cn.rotation.x=-.15;
  mk(bx(1.2,.9,.06),winM,-dx*.95,1.7,-d/2-.03,g,false);if(two){mk(bx(1.2,.9,.06),winM,-1.2,4.3,-d/2-.03,g,false);mk(bx(1.2,.9,.06),winM,1.2,4.3,-d/2-.03,g,false);}
  if(rand()<.6){const tx=-w/2-.9,tz=rr(-1,1);[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]].forEach(([a,b])=>mk(bx(.07,Hh+.2,.07),M.metal,tx+a,(Hh+.2)/2,tz+b,g,false));
    mk(bx(1.1,.08,1.1),M.metal,tx,Hh+.2,tz,g,false);mk(cy(.42,.42,1,12),lam('#d6dadd'),tx,Hh+.75,tz,g);}
  if(rand()<.3){const pz=-d/2-1.6;[[-w/2+.3,pz],[w/2-.3,pz]].forEach(([a,b])=>mk(bx(.1,2.4,.1),lam('#4f8a5b'),a,1.2,b,g,false));mk(bx(w,.08,.08),lam('#4f8a5b'),0,2.4,pz,g,false);for(let k=0;k<4;k++)mk(ico(.5,0),M.leaf2,rr(-w/2,w/2),2.5,pz+rr(-.3,.6),g,false);}
  for(let i=0,n=Math.floor(rr(0,3));i<n;i++)potPlant(g,rr(-w/2+.4,w/2-.4),-d/2-rr(.4,.8),rr(.8,1.2));
  addCol(TB.x+c.x-sx/2,TB.x+c.x+sx/2,TB.z+c.z-sz/2,TB.z+c.z+sz/2,y+Hh+2);
  if(!seat)return;
  const [cv,gg]=C2(128,96);gg.fillStyle='#f3ead9';rrect(gg,4,4,120,88,12);gg.fill();gg.strokeStyle='#6e4c33';gg.lineWidth=5;rrect(gg,4,4,120,88,12);gg.stroke();gg.fillStyle='#3a2a20';gg.font=`900 54px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText(String(seat),64,44);gg.font=`700 18px ${FG}`;gg.fillText('號',64,80);
  const np=mk(new T.PlaneGeometry(.55,.42),new T.MeshBasicMaterial({map:TX(cv)}),dx+(dx<0?.95:-.95),1.9,-d/2-.05,g,false);np.rotation.y=PI;
  mk(bx(.16,.16,.1),M.lampHead,dx,2.4,-d/2-.07,g,false);addGlow(dx,2.35,-d/2-.3,1.2,'#ffd79a','lamp',.9,g);
  const cs=Math.cos(ry),sn=Math.sin(ry);const loc=(x,z)=>[c.x+x*cs+z*sn,c.z-x*sn+z*cs];const [ox,oz]=loc(dx,-d/2-1.3);const [cx2,cz2]=loc(0,0);
  TB.houses[seat]={x:ox,z:oz,y:tribeH(ox,oz),top:y+Hh+rh+1.4,cx:cx2,cz:cz2,f};
  inter(new T.Vector3(TB.x+ox,tribeH(ox,oz),TB.z+oz),1.6,()=>seat===tbMySeat()&&!TS()?'回家（我的房間）':TS()?`看 ${seat} 號的留言板`:`${seat} 號的家`,()=>{
    if(seat===tbMySeat()&&!TS()){HOME.from='tribe';enterHome();return;}
    if(TS()){teacherHomeBoard(String(seat));return;}
    say(`${seat} 號的家`,['叩叩叩……門關著。','之後換成雲端版，就能到同學家玩、在留言板留言喔！']);});}
function tbSeason(){const m=new Date().getMonth()+1;return m>=9||m<=1;}
function tbPick(){if(!tbSeason()){say('甜柿果園',['柿子還是綠色的，還沒成熟喔！','秋天（9 月到 1 月）再來幫忙採收吧。']);return;}
  const d=new Date().toDateString();W.fruit=W.fruit&&W.fruit.d===d?W.fruit:{d,n:0};
  if(W.fruit.n>=10){say('甜柿果園',['今天已經幫忙採了 10 顆，剩下的留給明天吧！','採下來的甜柿在背包裡，可以吃掉。']);return;}
  W.fruit.n++;addItem('甜柿');W.coins+=2;led(2,'幫忙採甜柿','獎勵');renderPouch();save();SND.pick&&SND.pick();toast(`🍊 採到一顆甜柿！幫忙採收 +2 金幣（今天 ${W.fruit.n}/10）`);}
function tbRide(to){fadeTo(()=>{arriveTribe(to,true);});if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<10;i++)nburst(t+i*.09,.07,'lowpass',180,.8,.3,A.sfx);}}
function arriveTribe(at,quiet){if(ST_IN)leaveStation();INDOOR=false;HOME_IN=false;CH_IN=TC_IN=MZ_IN=ISL_IN=CY_IN=false;$('homeBar').hidden=true;P.sit=null;
  let [x,z,yaw]=TB.spots.bus;let home=null;
  if(at==='home'){home=TB.houses[tbMySeat()];if(home){x=home.x;z=home.z;yaw=Math.atan2(-home.f[0],-home.f[1])+PI;}else [x,z,yaw]=TB.spots.houses;}
  else if(at&&TB.spots[at])[x,z,yaw]=TB.spots[at];
  warpTown(TB.x+x,TB.z+z,yaw);if(home){cam.yaw=yaw-.55;cam.pitch=.28;cam.dist=Math.max(cam.dist,6);}SND.chime&&SND.chime();
  if(quiet)return;
  if(!W.tbSeen&&!TS()){W.tbSeen=true;save();const me=tbMySeat();setTimeout(()=>say('Sqoyaw',['歡迎回到 Qalang Sqoyaw！','巷子裡掛著號碼牌的房子，就是全班同學的家。'+(me?`你的家門口掛著「${me} 號」。`:''),'跟著課堂上的走讀路線，到八個地標插著紅旗的地方打卡吧！（公車站可以看打卡卡）','想去汐見町闖關，就到公車站搭車。']),900);}
  else setTimeout(()=>toast(at==='home'?'走出家門，外面就是 Sqoyaw':'Sqoyaw 到了！'),500);}
function sqCard(){msgOpen('走讀 Sqoyaw','打卡任務卡',B=>{const n=sqDone();B.appendChild(el('p',{class:'help',text:`已經打卡 ${n} / ${SQW.length} 站。走到插紅旗的地方按 E，聽完小故事就會打卡。全部完成送 80 金幣！`}));
  SQW.forEach((s,i)=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`第 ${i+1} 站 ${W.sqw&&W.sqw[s.id]?'✅ 已打卡':'⬜ 還沒去'}`}),el('b',{text:s.n})])));});}
function tbMuseum(){msgOpen('泰雅文物館','收藏館',B=>{B.appendChild(el('p',{class:'help',text:'文物館裡有傳統的穀倉、半穴居屋和老東西。這一區展示你在扭蛋收集到的東西，集滿一整套就能拿到特別稱號！'}));
  GMACH.forEach(m=>{const c=colS()[m.id],h=gHave(m);const card=el('div',{class:'nb-card'});card.appendChild(el('b',{text:`${m.ic} ${m.name}　${h} / ${m.items.length}${h===m.items.length?'　🎉':''}`}));
    const gr=el('div',{class:'mu-grid'});m.items.forEach(i=>gr.appendChild(el('div',{class:'mu-it'+(c[i[0]]?'':' no'),html:`<i>${c[i[0]]?i[2]:'？'}</i><small>${c[i[0]]?i[1]:'？？？'}</small>`})));card.appendChild(gr);B.appendChild(card);});});}
function tbTick(dt){const on=tbIn()&&started;const s=TB.mark;
  if(on&&!TS()){const h=TB.houses[tbMySeat()];if(h){s.visible=true;s.position.set(TB.x+h.cx,h.top+Math.sin(time*2.2)*.25,TB.z+h.cz);}else s.visible=false;}else s.visible=false;
  if(!on)return;if(TB.flag)TB.flag.rotation.y=Math.sin(time*2.3)*.25;if(TB.fruit)TB.fruit.visible=tbSeason();
  if(!TB.flagsInit){TB.flagsInit=true;Object.entries(TB.flags).forEach(([id,f])=>{if(W.sqw&&W.sqw[id])f.material.color.copy(col('#4fae6c'));});}
  Object.values(TB.flags).forEach((f,i)=>f.rotation.y=Math.sin(time*2+i)*.3);
  if(TB.winM)TB.winM.emissiveIntensity=(S.night||0)*.9;}
