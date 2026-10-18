/* ================================================================
   部落 — a mountain-valley village (inspired by 環山): the students' homes
   ================================================================ */
const TB={x:2600,z:0,houses:{},spots:{}};
function tbIn(){return !INDOOR&&P.pos.x>2300;}
const TB_HX=[-42,-30,-18,-6,6,18,30,42],TB_ROW=[{lz:.4,y:3},{lz:12.4,y:6},{lz:24.4,y:9}],TB_GAPS=[0,50];
function tribeH(lx,lz){
  if(Math.abs(lx)<1.2&&lz>-38.8&&lz<-23.4){const t=(lz+31.1)/7.7;return .38-.42*(1-t*t);}   // suspension bridge deck
  if(lx>-61&&lx<-43&&lz>-20.6&&lz<-18)return .45;                                             // platform
  for(const gx of TB_GAPS)if(Math.abs(lx-gx)<1.55&&lz>-11.2&&lz<-6.9)return 3*clamp((lz+11.2)/4.3,0,1); // stairs
  const soft=smooth(-46,-48.5,lx),lo=lerp(-8.05,-11.5,soft),hi=lerp(-7.15,-5.5,soft);
  let h=3*smooth(lo,hi,lz)+3*smooth(4.2,7.8,lz)+3*smooth(16.2,19.8,lz);
  h-=2.8*smooth(-37.5,-35,lz)*(1-smooth(-27,-24.5,lz));
  const e=Math.max(0,Math.abs(lx)-64,lz-31,-50-lz);
  if(e>0)h+=smooth(0,30,e)*36+e*.95+(fbm(lx*.025+7,lz*.025+3)-.5)*26*smooth(0,25,e)+(fbm(lx*.09,lz*.09)-.5)*4*smooth(0,8,e);
  return h;}
function tbMySeat(){const n=parseInt(W.seat,10);return n>0?((n-1)%5)+1:0;}
(function(){
  const G=new T.Group();G.position.set(TB.x,0,TB.z);scene.add(G);TB.g=G;const tc=new T.Color(),t2=new T.Color();
  const P_=(x,y,z)=>new T.Vector3(TB.x+x,y,TB.z+z);
  // ---------- terrain: one mesh, dense in the valley, coarse on the mountains
  const axis=(a,b,far)=>{const r=[];for(let v=-far;v<a;v+=12)r.push(v);for(let v=a;v<b;v+=1)r.push(v);for(let v=b;v<=far;v+=12)r.push(v);return r;};
  const xs=axis(-72,72,420),zs=axis(-56,38,420),nx=xs.length,nz=zs.length;
  const pos=new Float32Array(nx*nz*3),cl=new Float32Array(nx*nz*3),idx=[];
  const colAt=(lx,lz,h)=>{const n=fbm(lx*.15+3,lz*.15);const e=Math.max(0,Math.abs(lx)-64,lz-31,-50-lz);
    if(e>1.5){tc.set('#44723f').lerp(t2.set('#2c5132'),clamp(n*1.3-.2,0,1)*.8);if(h>120)tc.lerp(t2.set('#6d8a8c'),smooth(120,220,h));return;}
    const rv=smooth(-37.5,-35,lz)*(1-smooth(-27,-24.5,lz));if(rv>.2){tc.set('#7b7f76').lerp(t2.set('#9a9480'),n);return;}
    if(lz<-7&&lz>-24.8&&lx>-48){if(lz>-16&&lz<-11)tc.set('#6c6b67').lerp(t2.set('#5d5c58'),n*.6);else tc.set('#b09e7e').lerp(t2.set('#9a8b6c'),n*.8);return;}
    tc.set('#8db35a').lerp(t2.set('#6d9846'),n);
    for(const r of TB_ROW)if(lz>r.lz-4.6&&lz<r.lz-2.6&&Math.abs(lx)<50)tc.lerp(t2.set('#c9b891'),.85);
    const s=Math.max(1-Math.abs(lz-6)/2,1-Math.abs(lz-18)/2,lx<-46?1-Math.abs(lz+8)/3.5:0);if(s>0)tc.lerp(t2.set('#7a7048'),s*.7);};
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=xs[i],z=zs[j],h=tribeH(x,z),k=(j*nx+i)*3;pos[k]=x;pos[k+1]=h;pos[k+2]=z;colAt(x,z,h);tc.convertSRGBToLinear();cl[k]=tc.r;cl[k+1]=tc.g;cl[k+2]=tc.b;}
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(pos,3));tg.setAttribute('color',new T.BufferAttribute(cl,3));tg.setIndex(idx);tg.computeVertexNormals();
  const ter=new T.Mesh(tg,new T.MeshLambertMaterial({vertexColors:true}));ter.receiveShadow=true;G.add(ter);
  // river water + stones
  const wm=new T.MeshLambertMaterial({color:col('#5f9fc2'),transparent:true,opacity:.86,emissive:col('#2a5a78'),emissiveIntensity:.25});TB.water=wm;
  const wp=mk(new T.PlaneGeometry(140,11),wm,0,-1.95,-31.1,G,false);wp.rotation.x=-PI/2;wp.receiveShadow=false;
  for(let i=0;i<40;i++){const r=mk(ico(rr(.3,.9),0),M.stone,rr(-62,62),-2.3,rr(-35,-27.2),G);r.scale.y=rr(.4,.8);}
  addCol(TB.x-64,TB.x-1.25,-37.6,-24.4,3);addCol(TB.x+1.25,TB.x+64,-37.6,-24.4,3);
  // ---------- forest on the mountains + clouds (雲海)
  {const N=1500,cone=new T.ConeGeometry(1.7,5.2,7);cone.translate(0,2.4,0);const leafy=new T.IcosahedronGeometry(2.3,0);leafy.translate(0,2.5,0);
    const A=new T.InstancedMesh(cone,new T.MeshLambertMaterial({color:0xffffff}),N),B=new T.InstancedMesh(leafy,new T.MeshLambertMaterial({color:0xffffff}),N);
    const mm=new T.Matrix4(),q=new T.Quaternion(),sv=new T.Vector3(),pv=new T.Vector3();let na=0,nb=0;
    for(let i=0;i<N*3&&(na<N||nb<N);i++){const x=rr(-330,330),z=rr(-330,330);const e=Math.max(0,Math.abs(x)-64,z-31,-50-z);if(e<3)continue;const h=tribeH(x,z);if(h>170)continue;
      const s=rr(.8,1.7);sv.set(s,s*rr(.85,1.3),s);pv.set(x,h-.4,z);q.setFromAxisAngle(T.Object3D.DefaultUp,rr(0,6.3));mm.compose(pv,q,sv);
      const conifer=h>55?rand()<.8:rand()<.35;if(conifer&&na<N){A.setMatrixAt(na,mm);A.setColorAt(na,tc.set(pick(['#2f5a3a','#2a4f35','#3a6640'])).convertSRGBToLinear());na++;}
      else if(nb<N){B.setMatrixAt(nb,mm);B.setColorAt(nb,tc.set(pick(['#4f7f3f','#5f8a44','#3f6f3a','#6a8f4a'])).convertSRGBToLinear());nb++;}}
    A.count=na;B.count=nb;A.castShadow=B.castShadow=false;A.receiveShadow=B.receiveShadow=true;G.add(A);G.add(B);}
  {const [c,g]=C2(256,128);const gr=g.createRadialGradient(128,64,6,128,64,120);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.55,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128);
    const cm=new T.SpriteMaterial({map:TX(c),transparent:true,depthWrite:false,opacity:.8});
    for(let i=0;i<18;i++){const a=i/18*6.28+rr(-.15,.15),r=rr(130,260);const s=new T.Sprite(cm);s.position.set(Math.cos(a)*r,rr(28,62),Math.sin(a)*r);s.scale.set(rr(70,130),rr(20,34),1);G.add(s);}}
  // ---------- mural wall with stairs + 13 murals
  const wallM=lam('#9a9387',{map:plainTex('#9a9387',2600,.14)});
  [[-46,-1.6],[1.6,48.4],[51.6,63]].forEach(([a,b])=>{mk(bx(b-a,3.15,1.2),wallM,(a+b)/2,1.57,-7.5,G);mk(bx(b-a+.1,.16,1.4),M.concrete,(a+b)/2,3.2,-7.5,G);addCol(TB.x+a,TB.x+b,-8.3,-6.7,3.05);});
  TB_GAPS.forEach(gx=>{for(let k=0;k<8;k++){const top=(k+1)*.375,z0=-11.2+k*4.3/8;mk(bx(3.1,top,.56),M.stone,gx,top/2,z0+.28,G);}
    [-1,1].forEach(s=>mk(bx(.12,.9,4.4),M.woodDark,gx+s*1.62,2.1,-9,G,false));});
  const MUR=[['日出的群山','太陽從山後面升起，照亮整個山谷。'],['溪流與魚','清澈的溪水裡，魚兒逆著水流往上游。'],['甜柿豐收','秋天到了，果園裡的甜柿一顆顆變成橘色。'],['雲海','早上的雲像海一樣，在山腰間流動。'],
    ['森林裡的山羌','森林裡，山羌豎起耳朵聽著風聲。'],['滿天星星','晚上沒有光害，抬頭就是滿天星星。'],['蹦蹦車','紅色的蹦蹦車載著水果，在山路上跑來跑去。'],['紫藤吊橋','春天，吊橋掛滿紫色的紫藤花。'],
    ['飛鼠的夜晚','天黑了，飛鼠張開翅膀，從一棵樹滑到另一棵樹。'],['桃花開了','山頭點綴著粉紅色的桃花。'],['大冠鷲','大冠鷲在山谷上空盤旋，發出響亮的叫聲。'],['放學回家','孩子們背著書包，沿著山路走回家。'],['雨後彩虹','雨停了，一道彩虹掛在山谷上。']];
  const MX=[-41,-34,-27,-20,-13,-6,6,13,20,27,34,41,57];
  MX.forEach((mx,i)=>{const c=tbMural(i);const t=TX(c);const pl=mk(new T.PlaneGeometry(4.7,2.35),new T.MeshLambertMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.28}),mx,1.55,-8.13,G,false);pl.rotation.y=PI;
    mk(bx(4.95,2.6,.08),M.woodDark,mx,1.55,-8.13+.05,G,false);
    inter(P_(mx,0,-10.3),1.7,`看壁畫〈${MUR[i][0]}〉`,()=>say('壁畫',[`第 ${i+1} 幅：「${MUR[i][0]}」`,MUR[i][1]]));});
  // ---------- houses on the terraces (seat 1–24)
  const WALLC=['#ece4d3','#dcd2c1','#f1e7cf','#d3dcd5','#e8d6c2','#d8c6ae','#e3e0ea','#f0dcc8'],ROOFC=['#3b6ea5','#2f7f67','#b8452f','#4f86bf','#6f8b3a','#8a5a3a','#3d8a8a','#5a6fa8'];
  const winM=new T.MeshLambertMaterial({color:col('#a9cfe0'),emissive:col('#ffcf8a'),emissiveIntensity:0});EM.windows&&EM.windows.push&&EM.windows.push(winM);TB.winM=winM;
  let seat=0;TB_ROW.forEach((row,ri)=>TB_HX.forEach((hx,hi)=>{const stu=ri===0&&hi>=1&&hi<=5;if(stu)seat++;else if(rand()<.2)return;tbHouse(G,hx+rr(-.6,.6),row.lz+rr(-.3,.4),row.y,stu?seat:0,WALLC,ROOFC,winM);}));
  // ---------- station stop, tunnel, parked train
  mk(bx(18,.45,2.6),M.concrete,-52,.22,-19.3,G);mk(bx(18,.08,.25),lam('#e8c84a'),-52,.46,-20.45,G,false);
  [-1,1].forEach(s=>mk(bx(31,.12,.12),M.rail,-56,.12,-21.6+s*.55,G,false));for(let x=-71;x<-41;x+=1.1)mk(bx(.3,.08,1.7),M.woodDark,x,.04,-21.6,G,false);
  mk(bx(.4,1,2),M.red,-41,.5,-21.6,G);addCol(TB.x-80,TB.x-40.6,-23,-20.65,1.6);
  {const p=mk(bx(1.2,9,7),M.stone,-69.2,3.5,-21.6,G);const d=mk(new T.PlaneGeometry(3.4,4.2),new T.MeshBasicMaterial({color:col('#0c0b10')}),-68.55,2.1,-21.6,G,false);d.rotation.y=PI/2;
    const tr=new T.Group();tr.position.set(-58,.2,-21.6);G.add(tr);mk(bx(13,2.7,2.7),lam('#f2efe6'),0,1.75,0,tr);mk(bx(13.05,.55,2.75),lam('#2f7f5a'),0,.7,0,tr);mk(bx(13.05,.18,2.75),lam('#2f7f5a'),0,2.2,0,tr);
    for(let i=0;i<5;i++)mk(bx(1.5,.9,2.8),M.glassDark,-5+i*2.5,1.7,0,tr,false);mk(bx(13,.25,2.4),M.metalDark,0,3.2,0,tr);[-4.5,4.5].forEach(x=>mk(bx(1.8,.4,2.2),M.black,x,.22,0,tr));}
  {const sh=new T.Group();sh.position.set(-58.2,.45,-18.9);G.add(sh);[-2.6,2.6].forEach(x=>mk(cy(.08,.08,2.6,8),M.metalDark,x,1.3,.6,sh));mk(bx(6.4,.12,2.2),lam('#3b6ea5'),0,2.65,.1,sh);
    mk(bx(3,.08,.5),M.woodLight,0,.45,.8,sh);[-1.3,1.3].forEach(x=>mk(bx(.08,.45,.45),M.metalDark,x,.22,.8,sh));
    const [c,g]=C2(256,96);g.fillStyle='#f6f4ee';g.fillRect(0,0,256,96);g.fillStyle='#2f6b56';g.fillRect(0,70,256,26);g.fillStyle='#1c1c1c';g.font=`800 44px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Sqoyaw',128,36);
    g.fillStyle='#fff';g.font=`700 16px ${FG}`;g.fillText('← 平等・汐見町',128,84);const sg=mk(new T.PlaneGeometry(2.2,.82),new T.MeshBasicMaterial({map:TX(c)}),0,2.05,-.95,sh,false);sg.rotation.y=PI;}
  inter(P_(-47,.45,-19.4),2.2,'搭火車（Sqoyaw 站）',()=>choose('Sqoyaw 站','要搭火車去哪裡呢？',[{label:'🚉 平等車站',fn:()=>trainRide('平等',()=>enterStation({now:true}))},{label:'🌊 汐見町（去闖關）',fn:()=>trainRide('汐見町',()=>arriveShiomi())},{label:'再逛一下',fn:null}]));
  // ---------- welcome statues + arch, street lamps
  [-17.4,-9.6].forEach(z=>{const s=new T.Group();s.position.set(-44,0,z);G.add(s);mk(bx(1.3,.7,1.3),M.stone,0,.35,0,s);mk(cy(.34,.42,1.5,10),lam('#8a6446'),0,1.45,0,s);mk(sph(.3,12,10),lam('#9a7050'),0,2.45,0,s);
    mk(cy(.33,.33,.1,12),lam('#b8452f'),0,2.55,0,s,false);[-1,1].forEach(k=>{const a=mk(cy(.09,.09,1,6),lam('#8a6446'),k*.42,1.6,0,s);a.rotation.z=k*.35;});addCol(TB.x-44.7,TB.x-43.3,z-.7,z+.7,3);});
  {[-17.9,-9.1].forEach(z=>mk(bx(.35,4.2,.35),M.wood,-42.5,2.1,z,G));mk(bx(.4,.4,9.4),M.woodDark,-42.5,4.3,-13.5,G);
    const [c,g]=C2(512,96);g.fillStyle='#6e4c33';g.fillRect(0,0,512,96);g.fillStyle='#f3e6c8';g.font=`800 50px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Sqoyaw 環山',256,50);
    const b=mk(new T.PlaneGeometry(5.4,1),new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide}),-42.7,3.7,-13.5,G,false);b.rotation.y=-PI/2;}
  for(let x=-34;x<=58;x+=14){mk(cy(.07,.09,3.6,8),M.metalDark,x,1.8,-10.2,G);mk(bx(.5,.14,.3),M.lampHead,x,3.6,-10.5,G,false);addGlow(x,3.45,-10.6,2,'#ffd79a','lamp',1,G);}
  // ---------- museum (文物館) + traditional granary
  {const m=new T.Group();m.position.set(-26,0,-20.6);G.add(m);mk(bx(9,3.4,5.4),lam('#b9b3a6',{map:plainTex('#b9b3a6',1800,.12)}),0,1.7,0,m);mk(bx(9.05,1.2,5.45),M.wood,0,.6,0,m);
    const rm=lam('#c7cbcf',{map:(()=>{const [c,g]=C2(64,64);g.fillStyle='#c7cbcf';g.fillRect(0,0,64,64);for(let x=0;x<64;x+=8){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x,0,3,64);}return TX(c,true);})()});
    [-1,1].forEach(s=>{const r=mk(bx(9.8,.14,3.3),rm,0,4.05,s*1.45,m);r.rotation.x=s*.42;});
    mk(bx(2,2.4,.1),M.doorWood,0,1.2,2.73,m);const [c,g]=C2(512,128);g.fillStyle='#3a2a20';g.fillRect(0,0,512,128);g.fillStyle='#f3e6c8';g.font=`800 58px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('文物館',256,66);
    mk(new T.PlaneGeometry(3.6,.9),new T.MeshBasicMaterial({map:TX(c)}),0,3,2.76,m,false);addCol(TB.x-30.5,TB.x-21.5,-23.3,-17.9,6);
    inter(P_(-26,0,-16.6),1.8,'進文物館（收藏館）',()=>tbMuseum());
    const gr=new T.Group();gr.position.set(-17.5,0,-21.2);G.add(gr);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{mk(cy(.12,.14,1.6,8),M.woodDark,a*1.1,.8,b*1.1,gr);mk(cy(.34,.34,.06,12),M.woodLight,a*1.1,1.45,b*1.1,gr,false);});
    mk(bx(2.8,1.7,2.8),lam('#8a6446'),0,2.4,0,gr);[-1,1].forEach(s=>{const r=mk(bx(3.6,.3,2.3),lam('#9a8452'),0,3.75,s*.95,gr);r.rotation.x=s*.62;});
    for(let k=0;k<5;k++)mk(bx(.7,.06,.12),M.woodLight,0,.3+k*.3,1.9-k*.05,gr,false);addCol(TB.x-19,TB.x-16,-22.7,-19.7,5);
    inter(P_(-17.5,0,-18.8),1.5,'看傳統穀倉',()=>say('穀倉',['這是傳統的穀倉，把房子架高，可以防潮、也防老鼠偷吃。','柱子上圓圓的板子，就是擋老鼠爬上去的。','文物館裡還有更多東西，進去看看吧！']));}
  // ---------- school
  {const s=new T.Group();s.position.set(21,0,-20.8);G.add(s);mk(bx(14,6,5),lam('#f1eee6'),0,3,0,s);mk(bx(14.1,.35,5.1),lam('#4f8a5b'),0,3.05,0,s);mk(bx(14.4,.4,5.4),lam('#b8452f'),0,6.2,0,s);
    for(let i=0;i<5;i++){mk(bx(1.6,1.2,.08),winM,-5.2+i*2.6,1.7,2.53,s,false);mk(bx(1.6,1.2,.08),winM,-5.2+i*2.6,4.5,2.53,s,false);}
    const [c,g]=C2(512,96);g.fillStyle='#f1eee6';g.fillRect(0,0,512,96);g.fillStyle='#2f4f3a';g.font=`800 56px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('平等國小',256,50);
    mk(new T.PlaneGeometry(3.2,.6),new T.MeshBasicMaterial({map:TX(c)}),0,5.55,2.56,s,false);mk(cy(.05,.05,7,8),M.metal,8.2,3.5,2.8,s);
    const fl=mk(new T.PlaneGeometry(1.2,.8),lam('#e0674b',{side:T.DoubleSide}),8.8,6.5,2.8,s,false);TB.flag=fl;addCol(TB.x+14,TB.x+28,-23.3,-18.3,8);
    inter(P_(21,0,-16.8),1.8,'看平等國小的公告欄',()=>openBoard('news'));}
  // ---------- persimmon orchard
  {const fruitGeo=sph(.2,8,6),fruitM=lam('#f08a2a',{emissive:col('#a04a10'),emissiveIntensity:.2});const FR=new T.InstancedMesh(fruitGeo,fruitM,100);let nf=0;const mm=new T.Matrix4();
    [[40,-22.6],[45,-22.6],[50,-22.6],[55,-22.6],[60,-22.6],[42.5,-18.4],[47.5,-18.4],[52.5,-18.4],[57.5,-18.4]].forEach(([x,z],i)=>{mk(cy(.18,.26,1.8,8),M.trunk,x,.9,z,G);
      const cr=mk(ico(1.5,1),lam(i%2?'#5a8a3e':'#4f7f3a'),x,2.5,z,G);cr.scale.set(1.1,.85,1.1);
      for(let k=0;k<10&&nf<100;k++){const a=rr(0,6.28),b=rr(.2,1.3);mm.makeTranslation(x+Math.cos(a)*Math.sin(b)*1.6,2.4+Math.cos(b)*1.1,z+Math.sin(a)*Math.sin(b)*1.6);FR.setMatrixAt(nf++,mm);}
      addCol(TB.x+x-.3,TB.x+x+.3,z-.3,z+.3,3);inter(P_(x,0,z+1.7),1.5,()=>tbSeason()?'採甜柿':'看看柿子樹',()=>tbPick());});
    FR.count=nf;G.add(FR);TB.fruit=FR;
    const [c,g]=C2(256,96);g.fillStyle='#6e4c33';g.fillRect(0,0,256,96);g.fillStyle='#ffd9a0';g.font=`800 40px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('甜柿果園',128,50);
    mk(bx(.14,1.6,.14),M.woodDark,37,.8,-16.8,G);const sg=mk(new T.PlaneGeometry(1.8,.68),new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide}),37,1.7,-16.75,G,false);}
  // ---------- 蹦蹦車 (little red truck)
  {const t=new T.Group();t.position.set(-35.5,0,-19);G.add(t);mk(bx(1.5,1.4,1.6),M.red,1.4,1.05,0,t);mk(bx(.05,.6,1.3),M.glassDark,2.16,1.35,0,t,false);mk(bx(2.4,.5,1.7),M.red,-.6,.75,0,t);
    [[-1.5,.85],[-1.5,-.85],[1.4,.85],[1.4,-.85]].forEach(([x,z])=>{const w=mk(cy(.32,.32,.25,12),M.black,x,.32,z,t);w.rotation.x=PI/2;});
    for(let k=0;k<6;k++)mk(sph(.2,8,6),lam('#f08a2a'),-1.4+(k%3)*.5,1.15,(k<3?-.3:.3),t,false);addCol(TB.x-38,TB.x-33.3,-20,-18,2.4);
    inter(P_(-35.5,0,-16.8),1.7,'坐蹦蹦車',()=>choose('蹦蹦車','噗噗噗～要載你去哪裡？',[{label:'🏠 我家門口',fn:()=>tbRide('home')},{label:'🍊 甜柿果園',fn:()=>tbRide('orchard')},{label:'🌉 吊橋',fn:()=>tbRide('bridge')},{label:'🚉 部落站',fn:()=>tbRide('station')},{label:'不用了',fn:null}]));}
  // ---------- suspension bridge with wisteria + trailhead
  {const b=new T.Group();G.add(b);for(let z=-38.6;z<-23.4;z+=.5){const y=tribeH(0,z)-.08;mk(bx(2.3,.1,.42),M.woodLight,0,y,z,b,false);}
    [-23.4,-38.8].forEach(z=>[-1.3,1.3].forEach(x=>mk(bx(.3,3.2,.3),M.woodDark,x,1.6,z,b)));
    const wis=[lam('#9b7fd4'),lam('#b69ae6'),lam('#8a6ac8')],cone=new T.ConeGeometry(.16,.7,6);cone.rotateX(PI);
    [-1.25,1.25].forEach(x=>{const pts=[];for(let i=0;i<=24;i++){const z=-23.4-i*15.4/24,t=(z+31.1)/7.7;pts.push(new T.Vector3(x,1.25+1.95*t*t,z));}
      mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,.035,5),M.metalDark,0,0,0,b,false);
      const rail=pts.map(p=>new T.Vector3(p.x,tribeH(0,p.z)+.95,p.z));mk(new T.TubeGeometry(new T.CatmullRomCurve3(rail),48,.03,5),M.woodDark,0,0,0,b,false);
      pts.forEach((p,i)=>{if(i%2)return;mk(cy(.015,.015,p.y-tribeH(0,p.z),4),M.metalDark,p.x,(p.y+tribeH(0,p.z))/2,p.z,b,false);for(let k=0;k<3;k++)mk(cone,pick(wis),p.x+rr(-.12,.12),p.y-.4-rr(0,.3),p.z+rr(-.25,.25),b,false);});});
    const [c,g]=C2(256,128);g.fillStyle='#6e4c33';g.fillRect(0,0,256,128);g.fillStyle='#f3e6c8';g.font=`800 38px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('獵人步道 ➜',128,46);g.fillStyle='#ffb38a';g.font=`700 26px ${FG}`;g.fillText('（施工中）',128,94);
    mk(bx(.16,1.8,.16),M.woodDark,3,.9,-42,G);const sg=mk(new T.PlaneGeometry(1.8,.9),new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide}),3,1.9,-41.95,G,false);
    [[-2,-45],[2,-45],[6,-44]].forEach(([x,z])=>{mk(bx(1.8,.12,.12),lam('#e0a020'),x,.9,z,G,false);mk(bx(1.8,.12,.12),lam('#c8432b'),x,.6,z,G,false);[-.8,.8].forEach(k=>mk(bx(.1,1,.1),M.woodDark,x+k,.5,z,G,false));});
    inter(P_(3,0,-40.4),1.6,'看路牌（獵人步道）',()=>say('獵人步道',['這條路通往山裡的獵人步道，是以前的人上山的路。','步道還在整理中，之後會變成新的冒險地點，敬請期待！']));}
  // ---------- flowers & peach trees on the terraces
  for(let i=0;i<14;i++){const x=rr(-58,58),r=pick(TB_ROW);const z=r.lz+rr(3,5.5);if(TB_HX.some(h=>Math.abs(h-x)<3.4))continue;mk(cy(.1,.14,1.2,6),M.trunk,x,r.y+.6,z,G);const cr=mk(ico(.9,1),lam(pick(['#f4b6c8','#f8c9d6','#eea3ba'])),x,r.y+1.6,z,G);cr.scale.y=.8;}
  // own-house marker
  {const [c,g]=C2(256,96);g.fillStyle='rgba(255,247,226,.95)';rrect(g,6,8,244,80,40);g.fill();g.strokeStyle='#e0674b';g.lineWidth=6;rrect(g,6,8,244,80,40);g.stroke();g.fillStyle='#3a2a20';g.font=`800 44px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('🏠 你的家',128,50);
    const s=new T.Sprite(new T.SpriteMaterial({map:TX(c),depthTest:false,transparent:true}));s.scale.set(3.2,1.2,1);s.renderOrder=9;s.visible=false;scene.add(s);TB.mark=s;}
  TB.spots={station:[-44.6,-19.3,PI/2],orchard:[46,-16.6,PI/2],bridge:[0,-21.5,PI],houses:[0,-3.6,0],museum:[-26,-15.6,PI]};
  try{scene.updateMatrixWorld(true);inkTown(G);}catch(e){console.error(e);}})();
function tbHouse(G,lx,lz,y,seat,WALLC,ROOFC,winM){const g=new T.Group();g.position.set(lx,y,lz);G.add(g);
  const two=rand()<.4,w=5.2,d=4.4,H=two?5.6:3.1;mk(bx(w,H,d),lam(pick(WALLC)),0,H/2,0,g);mk(bx(w+.12,.35,d+.12),M.concrete,0,.17,0,g);
  const rm=lam(pick(ROOFC)),rh=1.3,half=d/2+.45,sl=Math.hypot(half,rh);
  [-1,1].forEach(s=>{const r=mk(bx(w+.7,.14,sl),rm,0,H+rh/2,s*half/2,g);r.rotation.x=s*Math.atan2(rh,half);});
  {const sh=new T.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rh-.05);sh.closePath();const eg=new T.ExtrudeGeometry(sh,{depth:w-.02,bevelEnabled:false});const e=mk(eg,lam(pick(WALLC)),-w/2+.01,H,0,g);e.rotation.y=PI/2;}
  const dx=pick([-1.3,-.9,.9,1.3]);mk(bx(1.1,2.1,.08),M.doorWood,dx,.35+1.05,-d/2-.03,g);
  const cn=mk(bx(1.8,.08,1.1),rm,dx,2.75,-d/2-.5,g);cn.rotation.x=-.15;
  mk(bx(1.3,1,.06),winM,-dx*.95,1.8,-d/2-.03,g,false);if(two){mk(bx(1.3,1,.06),winM,-1.3,4.4,-d/2-.03,g,false);mk(bx(1.3,1,.06),winM,1.3,4.4,-d/2-.03,g,false);}
  if(rand()<.55){mk(cy(.45,.45,.9,12),M.metal,w/2-1,H+.95,.9,g);mk(bx(.9,.5,.9),M.metalDark,w/2-1,H+.3,.9,g);}
  if(!seat){addCol(TB.x+lx-w/2,TB.x+lx+w/2,lz-d/2,lz+d/2,y+H+2);return;}
  const [c,gg]=C2(128,96);gg.fillStyle='#f3ead9';rrect(gg,4,4,120,88,12);gg.fill();gg.strokeStyle='#6e4c33';gg.lineWidth=5;rrect(gg,4,4,120,88,12);gg.stroke();gg.fillStyle='#3a2a20';gg.font=`900 54px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText(String(seat),64,44);gg.font=`700 18px ${FG}`;gg.fillText('號',64,80);
  const np=mk(new T.PlaneGeometry(.55,.42),new T.MeshBasicMaterial({map:TX(c)}),dx+(dx<0?.95:-.95),1.95,-d/2-.05,g,false);np.rotation.y=PI;
  mk(bx(.16,.16,.1),M.lampHead,dx,2.5,-d/2-.07,g,false);addGlow(dx,2.45,-d/2-.3,1.2,'#ffd79a','lamp',.9,g);
  for(let i=0,n=Math.floor(rr(1,4));i<n;i++)potPlant(g,rr(-w/2+.4,w/2-.4),-d/2-rr(.4,.9),rr(.8,1.2));
  addCol(TB.x+lx-w/2,TB.x+lx+w/2,lz-d/2,lz+d/2,y+H+2);
  const doorX=lx+dx,doorZ=lz-d/2-1.25;TB.houses[seat]={x:doorX,z:doorZ,y,top:y+H+rh+1.4,cx:lx};
  inter(new T.Vector3(TB.x+doorX,y,TB.z+doorZ),1.6,()=>seat===tbMySeat()&&!TS()?'回家（我的房間）':TS()?`看 ${seat} 號的留言板`:`${seat} 號的家`,()=>{
    if(seat===tbMySeat()&&!TS()){HOME.from='tribe';enterHome();return;}
    if(TS()){teacherHomeBoard(String(seat));return;}
    say(`${seat} 號的家`,['叩叩叩……門關著。','之後換成雲端版，就能到同學家玩、在留言板留言喔！']);});}
function tbMural(i){const [c,g]=C2(512,256);const W_=512,H_=256;
  const sky=(a,b)=>{const gr=g.createLinearGradient(0,0,0,H_);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,W_,H_);};
  const hills=(cols,base)=>cols.forEach((cc,k)=>{g.fillStyle=cc;g.beginPath();g.moveTo(0,H_);for(let x=0;x<=W_;x+=8)g.lineTo(x,base+k*26-Math.sin(x*.011*(k+1)+k*2)*34/(k+1)-Math.abs(Math.sin(x*.004+k))*40);g.lineTo(W_,H_);g.fill();});
  const circ=(x,y,r,cc)=>{g.fillStyle=cc;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
  switch(i){
    case 0:sky('#f6a06a','#fde7c0');circ(256,120,38,'#fff1b8');hills(['#7f8fb0','#5f7d6a','#3f5f4a'],140);break;
    case 1:sky('#bfe3f5','#e8f5fb');hills(['#6f9a64','#4f7f4a'],110);g.fillStyle='#5aa3cc';g.fillRect(0,170,W_,86);g.fillStyle='rgba(255,255,255,.5)';for(let k=0;k<12;k++)g.fillRect(k*44,190+(k%3)*18,26,3);
      for(let k=0;k<6;k++){const x=60+k*75,y=205+(k%2)*22;g.fillStyle='#e8a060';g.beginPath();g.ellipse(x,y,20,9,0,0,7);g.fill();g.beginPath();g.moveTo(x-18,y);g.lineTo(x-32,y-9);g.lineTo(x-32,y+9);g.fill();}break;
    case 2:sky('#a8d4ef','#eaf6fb');hills(['#8aa86a'],150);for(let k=0;k<5;k++){const x=60+k*100;g.fillStyle='#6a4a32';g.fillRect(x-6,170,12,60);circ(x,150,46,'#4f7f3a');for(let j=0;j<9;j++)circ(x+Math.cos(j*2.1)*30,150+Math.sin(j*1.7)*28,8,'#f08a2a');}
      g.fillStyle='#a0703a';g.fillRect(230,210,60,34);break;
    case 3:sky('#f8d9b0','#fff6e6');hills(['#6f7f9a','#4f6a7a'],90);g.fillStyle='rgba(255,255,255,.92)';for(let k=0;k<9;k++){g.beginPath();g.ellipse(k*64,190+Math.sin(k)*10,70,26,0,0,7);g.fill();}g.fillRect(0,196,W_,60);break;
    case 4:sky('#cfe8d0','#eef7ea');for(let k=0;k<14;k++){const x=k*38;g.fillStyle=k%2?'#3f6f3a':'#2f5a33';g.beginPath();g.moveTo(x,256);g.lineTo(x+20,70+(k%4)*18);g.lineTo(x+40,256);g.fill();}
      g.fillStyle='#8a5a32';g.beginPath();g.ellipse(270,200,44,20,0,0,7);g.fill();g.fillRect(236,205,6,40);g.fillRect(296,205,6,40);g.beginPath();g.ellipse(316,178,14,12,0,0,7);g.fill();g.fillRect(312,160,4,14);g.fillRect(320,160,4,14);break;
    case 5:sky('#0e1636','#2a3a6a');g.fillStyle='#fff8d8';for(let k=0;k<70;k++)g.fillRect((k*97)%W_,(k*53)%170,2.2,2.2);circ(420,56,22,'#fff3c4');circ(430,50,20,'#1a2448');hills(['#1a2330'],170);break;
    case 6:sky('#bfe0f3','#f0f8fb');hills(['#7fa06a','#5f8a4f'],120);g.fillStyle='#8a8478';g.fillRect(0,220,W_,36);g.fillStyle='#c8432b';g.fillRect(200,180,110,40);g.fillRect(300,160,50,60);g.fillStyle='#28323c';g.fillRect(318,168,26,22);
      circ(225,222,14,'#1e1e22');circ(330,222,14,'#1e1e22');for(let k=0;k<5;k++)circ(215+k*18,176,9,'#f08a2a');break;
    case 7:sky('#dff0e8','#f5fbf6');hills(['#6f9a64'],150);g.fillStyle='#5aa3cc';g.fillRect(0,210,W_,46);g.strokeStyle='#4a3527';g.lineWidth=4;g.beginPath();g.moveTo(20,120);g.quadraticCurveTo(256,230,492,120);g.stroke();
      g.beginPath();g.moveTo(20,160);g.quadraticCurveTo(256,260,492,160);g.stroke();for(let k=0;k<22;k++){const t=k/21,x=20+t*472,y=120+(1-(2*t-1)**2)*55;g.fillStyle=k%2?'#9b7fd4':'#b69ae6';g.beginPath();g.ellipse(x,y+14,7,16,0,0,7);g.fill();}break;
    case 8:sky('#101a3a','#26365e');g.fillStyle='#fff8d8';for(let k=0;k<30;k++)g.fillRect((k*131)%W_,(k*37)%120,2,2);g.fillStyle='#1a2a22';g.fillRect(40,60,26,196);g.fillRect(430,40,30,216);circ(53,70,50,'#1f3a2c');circ(445,56,56,'#1f3a2c');
      g.fillStyle='#b89a7a';g.beginPath();g.moveTo(190,120);g.lineTo(300,100);g.lineTo(320,140);g.lineTo(210,160);g.closePath();g.fill();circ(318,112,14,'#b89a7a');g.fillStyle='#fff';g.fillRect(320,106,3,3);break;
    case 9:sky('#dcecf8','#f6fbff');hills(['#8fb07a','#6f9a64'],150);g.strokeStyle='#6a4a32';g.lineWidth=7;g.beginPath();g.moveTo(0,40);g.quadraticCurveTo(180,90,340,60);g.stroke();g.lineWidth=4;g.beginPath();g.moveTo(120,70);g.lineTo(170,20);g.stroke();
      for(let k=0;k<26;k++)circ(10+k*13+Math.sin(k)*10,60+Math.cos(k*1.3)*22,8,k%2?'#f4b6c8':'#f8c9d6');break;
    case 10:sky('#9cc8ea','#e6f3fb');hills(['#6f8f9a','#4f7f5a'],160);g.fillStyle='#5a3a24';const bird=(x,y,s)=>{g.beginPath();g.moveTo(x-60*s,y-10*s);g.quadraticCurveTo(x-20*s,y-24*s,x,y);g.quadraticCurveTo(x+20*s,y-24*s,x+60*s,y-10*s);g.quadraticCurveTo(x+20*s,y-6*s,x,y+10*s);g.quadraticCurveTo(x-20*s,y-6*s,x-60*s,y-10*s);g.fill();};bird(250,90,1.4);bird(400,60,.6);break;
    case 11:sky('#f6c68a','#fde9c6');hills(['#8a9a7a','#6f8a5a'],130);g.fillStyle='#b9ab8e';g.beginPath();g.moveTo(0,256);g.lineTo(200,180);g.lineTo(512,190);g.lineTo(512,256);g.fill();
      [[150,210,'#e0674b'],[210,200,'#3b6ea5'],[270,205,'#4f8a5b'],[330,198,'#e0a020']].forEach(([x,y,cc])=>{circ(x,y-44,11,'#6a4a32');g.fillStyle=cc;g.fillRect(x-10,y-34,20,26);g.fillStyle='#3a2a20';g.fillRect(x-8,y-8,6,14);g.fillRect(x+2,y-8,6,14);g.fillStyle='#8a5a32';g.fillRect(x+8,y-32,8,18);});break;
    case 12:sky('#bcd8e8','#eef6fa');['#e8554a','#f0a040','#f2d64a','#6fbf6a','#4f9ad8','#7a6ac8'].forEach((cc,k)=>{g.strokeStyle=cc;g.lineWidth=9;g.beginPath();g.arc(256,280,210-k*9,PI,0);g.stroke();});hills(['#6f9a64','#4f7f4a'],175);break;}
  g.strokeStyle='#5a3a24';g.lineWidth=10;g.strokeRect(5,5,W_-10,H_-10);return c;}
function tbSeason(){const m=new Date().getMonth()+1;return m>=9||m<=1;}
function tbPick(){if(!tbSeason()){say('甜柿果園',['柿子還是綠色的，還沒成熟喔！','秋天（9 月到 1 月）再來幫忙採收吧。']);return;}
  const d=new Date().toDateString();W.fruit=W.fruit&&W.fruit.d===d?W.fruit:{d,n:0};
  if(W.fruit.n>=10){say('甜柿果園',['今天已經幫忙採了 10 顆，剩下的留給明天吧！','採下來的甜柿在背包裡，可以吃掉。']);return;}
  W.fruit.n++;addItem('甜柿');W.coins+=2;led(2,'幫忙採甜柿','獎勵');renderPouch();save();SND.pick&&SND.pick();toast(`🍊 採到一顆甜柿！幫忙採收 +2 金幣（今天 ${W.fruit.n}/10）`);}
function tbRide(to){fadeTo(()=>{arriveTribe(to,true);});if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<10;i++)nburst(t+i*.09,.07,'lowpass',180,.8,.3,A.sfx);}}
function arriveTribe(at,quiet){if(ST_IN)leaveStation();INDOOR=false;HOME_IN=false;CH_IN=TC_IN=MZ_IN=ISL_IN=CY_IN=false;$('homeBar').hidden=true;P.sit=null;
  let [x,z,yaw]=TB.spots.station;
  if(at==='home'){const h=TB.houses[tbMySeat()];if(h){x=h.x;z=h.z;yaw=PI;}else [x,z,yaw]=TB.spots.houses;}
  else if(at&&TB.spots[at])[x,z,yaw]=TB.spots[at];
  warpTown(TB.x+x,TB.z+z,yaw);if(at==='houses'){cam.yaw=PI;cam.pitch=.3;}if(at==='home'){cam.yaw=PI-.55;cam.pitch=.28;cam.dist=Math.max(cam.dist,6);}SND.chime&&SND.chime();
  if(quiet)return;
  if(!W.tbSeen&&!TS()){W.tbSeen=true;save();const me=tbMySeat();setTimeout(()=>say('Sqoyaw',['歡迎回到 Sqoyaw！這裡是大家住的地方。','山坡上掛著號碼牌的房子，就是全班同學的家。'+(me?`你的家門口掛著「${me} 號」。`:''),'平等國小、文物館、甜柿果園都可以逛逛；紅色的蹦蹦車可以載你到處跑。','想去汐見町闖關，就回月台搭火車！']),900);}
  else setTimeout(()=>toast(at==='home'?'走出家門，外面就是 Sqoyaw 的山谷':'Sqoyaw 到了！'),500);}
function tbMuseum(){msgOpen('文物館','收藏館',B=>{B.appendChild(el('p',{class:'help',text:'這裡展示你在扭蛋收集到的東西。集滿一整套，就能拿到特別稱號！'}));
  GMACH.forEach(m=>{const c=colS()[m.id],h=gHave(m);const card=el('div',{class:'nb-card'});card.appendChild(el('b',{text:`${m.ic} ${m.name}　${h} / ${m.items.length}${h===m.items.length?'　🎉':''}`}));
    const gr=el('div',{class:'mu-grid'});m.items.forEach(i=>gr.appendChild(el('div',{class:'mu-it'+(c[i[0]]?'':' no'),html:`<i>${c[i[0]]?i[2]:'？'}</i><small>${c[i[0]]?i[1]:'？？？'}</small>`})));card.appendChild(gr);B.appendChild(card);});
  B.appendChild(el('p',{class:'help',text:'到汐見町便利商店的「扭蛋區」可以轉到新的收藏。'}));});}
function tbTick(dt){const on=tbIn()&&started;const s=TB.mark;
  if(on&&!TS()){const h=TB.houses[tbMySeat()];if(h){s.visible=true;s.position.set(TB.x+h.cx,h.top+Math.sin(time*2.2)*.25,TB.z+h.z+1.25);}else s.visible=false;}else s.visible=false;
  if(!on)return;if(TB.flag)TB.flag.rotation.y=Math.sin(time*2.3)*.25;if(TB.fruit)TB.fruit.visible=tbSeason();
  if(TB.winM)TB.winM.emissiveIntensity=(S.night||0)*.9;}
