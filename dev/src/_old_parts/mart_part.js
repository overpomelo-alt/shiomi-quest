/* ================================================================
   Konbini interior (walk-in shop)
   ================================================================ */
const IX=0,IZ=330;let INDOOR=false;
const MART={basket:[],doorOpen:0,doors:[],winMat:null,steam:null};
function imat(hex,e=.55,extra={}){const c=col(hex);return new T.MeshLambertMaterial(Object.assign({color:c,emissive:c.clone().multiplyScalar(e)},extra));}
function drawGoods(kind){const [c,g]=C2(512,256);g.fillStyle='#e9e7e0';g.fillRect(0,0,512,256);
  const tiers=4,th=256/tiers;
  for(let r=0;r<tiers;r++){const y0=r*th;g.fillStyle='#f6f5f0';g.fillRect(0,y0,512,th-10);g.fillStyle='#b9b6ad';g.fillRect(0,y0+th-10,512,10);g.fillStyle='#e8b33c';g.fillRect(0,y0+th-10,512,3);
    let x=6;while(x<500){const w=kind==='noodle'?44:kind==='stat'?20:kind==='rice'?40:34;const h=th-18-rand()*10;const cc=pick(kind==='rice'?['#2f3a2c','#e9e2cc','#c8322b','#f2c14e']:kind==='bread'?['#d9a45a','#f2d59a','#c07a3a','#f7efe0','#e86a8a']:kind==='snack'?['#e35d4a','#f2c14e','#5aa0d8','#7cc47a','#f08fb0','#9a7ad8']:kind==='noodle'?['#e35d4a','#f2c14e','#f7efe0','#3d6ea8']:kind==='stat'?['#3d6ea8','#e35d4a','#f2c14e','#4fae6c','#1f1f22']:['#8a6ad0','#e8b33c','#4fae6c','#ec8fb0','#3d6ea8']);
      g.fillStyle=cc;const yb=y0+th-10;
      if(kind==='rice'){g.beginPath();g.moveTo(x,yb);g.lineTo(x+w/2,yb-h*.8);g.lineTo(x+w,yb);g.fill();g.fillStyle='#1f2a1c';g.fillRect(x+w*.3,yb-h*.3,w*.4,h*.3);}
      else if(kind==='noodle'){g.fillRect(x+4,yb-h*.8,w-8,h*.8);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(x+4,yb-h*.8,w-8,6);}
      else if(kind==='stat'){g.fillRect(x,yb-h,w-4,h);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(x+3,yb-h+4,w-10,4);}
      else{rrect(g,x,yb-h,w-4,h,5);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+4,yb-h+6,w-12,h*.25);}
      x+=w+2;}}
  return TX(c);}
function coolerTex(){const [c,g]=C2(512,256),[ce,ge]=C2(512,256);g.fillStyle='#dfe8ee';g.fillRect(0,0,512,256);
  for(let r=0;r<4;r++){for(let x=8;x<504;x+=16){const cc=pick(['#f4f4f0','#e35d4a','#f2c14e','#4fae6c','#3d6ea8','#f7a04a','#8fd0e8','#c8e6a0']);g.fillStyle=cc;g.fillRect(x,14+r*62,11,44);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+2,16+r*62,3,40);g.fillStyle='#9aa0a4';g.fillRect(x+2,10+r*62,7,5);}
    g.fillStyle='#b8c2c8';g.fillRect(0,58+r*62,512,4);}
  g.fillStyle='rgba(40,50,60,.9)';for(let x=0;x<=512;x+=128)g.fillRect(x-3,0,6,256);g.fillRect(0,0,512,6);g.fillRect(0,250,512,6);
  ge.drawImage(c,0,0);return {map:TX(c),emap:TX(ce)};}
(function buildMart(){
  const G=new T.Group();G.position.set(IX,0,IZ);scene.add(G);
  const W_=14,D_=10,H_=3.2;
  const floorT=(()=>{const [c,g]=C2(256,256);g.fillStyle='#ecebe6';g.fillRect(0,0,256,256);speckle(g,256,256,1200,.05);g.strokeStyle='rgba(120,120,110,.28)';g.lineWidth=2;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}return TX(c,true);})();
  const fg=new T.PlaneGeometry(W_,D_);fg.rotateX(-PI/2);const uv=fg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*W_/2.4,uv.getY(i)*D_/2.4);
  mk(fg,imat('#ffffff',.35,{map:floorT}),0,0,0,G,false);
  const wallM=imat('#f4f3ee',.45),ceilM=imat('#f7f6f2',.5);
  mk(bx(W_,.2,D_),ceilM,0,H_+.1,0,G);
  mk(bx(.3,H_,D_),wallM,-W_/2-.15,H_/2,0,G);mk(bx(.3,H_,D_),wallM,W_/2+.15,H_/2,0,G);mk(bx(W_,H_,.3),wallM,0,H_/2,-D_/2-.15,G);
  // front wall with windows and door (door at x=+4)
  mk(bx(W_,.5,.3),wallM,0,.25,D_/2+.15,G);mk(bx(W_,.5,.3),imat('#2b2f6a',.3),0,H_-.25,D_/2+.15,G);
  [[-W_/2,2.9],[5.1,W_/2]].forEach(([a,b])=>{const w=b-a;const win=new T.MeshBasicMaterial({color:0xffffff,map:(()=>{const [c,g]=C2(8,64);const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'#ffffff');gr.addColorStop(.6,'#d8d8d8');gr.addColorStop(1,'#8a8a8a');g.fillStyle=gr;g.fillRect(0,0,8,64);return new T.CanvasTexture(c);})()});MART.winMat=MART.winMat||win;
    const p=mk(new T.PlaneGeometry(w,H_-1),MART.winMat,(a+b)/2,H_/2,D_/2+.02,G,false);p.rotation.y=PI;
    for(let x=a;x<=b+.01;x+=w/Math.max(1,Math.round(w/2.2)))mk(bx(.08,H_-1,.1),imat('#8a9096',.3),x,H_/2,D_/2,G,false);});
  mk(bx(2.2,.12,.3),imat('#8a9096',.3),4,H_-.56,D_/2+.02,G);
  const dm=new T.MeshLambertMaterial({color:col('#cfe4ee'),transparent:true,opacity:.28,emissive:col('#cfe4ee'),emissiveIntensity:.3});
  [-1,1].forEach(s=>{const d=mk(bx(1.1,H_-1.1,.05),dm,4+s*.55,(H_-1.1)/2,D_/2,G,false);d.userData.dyn=true;MART.doors.push({m:d,s});});
  addCol(IX-W_/2-.3,IX-W_/2,IZ-D_/2,IZ+D_/2,4);addCol(IX+W_/2,IX+W_/2+.3,IZ-D_/2,IZ+D_/2,4);addCol(IX-W_/2,IX+W_/2,IZ-D_/2-.3,IZ-D_/2,4);
  addCol(IX-W_/2,IX+2.9,IZ+D_/2-.1,IZ+D_/2+.3,4);addCol(IX+5.1,IX+W_/2,IZ+D_/2-.1,IZ+D_/2+.3,4);addCol(IX+2.9,IX+5.1,IZ+D_/2+.1,IZ+D_/2+.4,4);
  // ceiling lights
  for(let x=-5;x<=5;x+=2.5)for(let z=-3;z<=3;z+=3){mk(bx(1.6,.05,.3),M.lampHead,x,H_-.03,z,G,false);}
  // back-wall drink coolers
  const ct=coolerTex();const cm=new T.MeshLambertMaterial({color:0xffffff,map:ct.map,emissiveMap:ct.emap,emissive:0xffffff,emissiveIntensity:.8});
  mk(bx(11,2.3,.9),imat('#d9dde0',.4),-.5,1.15,-D_/2+.45,G);const cf=mk(new T.PlaneGeometry(10.6,2.05),cm,-.5,1.2,-D_/2+.91,G,false);
  addCol(IX-6,IX+5,IZ-D_/2,IZ-D_/2+.95,3);
  // gondola shelves
  const CATS_SHELF=[
    {x:-1.2,side:-1,key:'rice',name:'飯糰・便當',items:[['鮭魚飯糰',30],['鮪魚飯糰',30],['三明治',35],['咖哩便當',60]]},
    {x:-1.2,side:1,key:'bread',name:'麵包・甜點',items:[['菠蘿麵包',25],['布丁',25],['銅鑼燒',20]]},
    {x:1.6,side:-1,key:'snack',name:'零食',items:[['洋芋片',25],['巧克力',20],['仙貝',15],['軟糖',15]]},
    {x:1.6,side:1,key:'noodle',name:'泡麵',items:[['杯麵',30],['日式炒麵',35]]},
    {x:4.4,side:-1,key:'stat',name:'文具',items:[['鉛筆',10],['橡皮擦',10],['筆記本',20]]},
    {x:4.4,side:1,key:'misc',name:'雜貨・寵物用品',items:[['小魚乾（給貓）',30],['閃亮貼紙',50],['逗貓棒',40]]}];
  const gz0=-3.1,gz1=1.2,gl=gz1-gz0;
  [...new Set(CATS_SHELF.map(c=>c.x))].forEach(x=>{mk(bx(.5,1.55,gl),imat('#d9d7d0',.4),x,.78,(gz0+gz1)/2,G);mk(bx(.9,.12,gl+.1),imat('#c9c6bd',.35),x,.06,(gz0+gz1)/2,G);addCol(IX+x-.48,IX+x+.48,IZ+gz0-.05,IZ+gz1+.05,2);
    [gz0-.02,gz1+.02].forEach((z,i)=>{const e=mk(new T.PlaneGeometry(.9,1.4),imat('#e8b33c',.5),x,.8,z,G,false);if(i===0)e.rotation.y=PI;});});
  CATS_SHELF.forEach(c=>{const t=drawGoods(c.key);const m=new T.MeshLambertMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.55});
    const p=mk(new T.PlaneGeometry(gl,1.45),m,c.x+c.side*.26,.82,(gz0+gz1)/2,G,false);p.rotation.y=c.side>0?PI/2:-PI/2;
    const [sc,sg]=C2(256,64);sg.fillStyle='#2b2f6a';sg.fillRect(0,0,256,64);sg.fillStyle='#fff';sg.font=`700 30px ${FG}`;sg.textAlign='center';sg.textBaseline='middle';sg.fillText(c.name,128,34);
    const sm=new T.MeshBasicMaterial({map:TX(sc)});const s=mk(new T.PlaneGeometry(1.5,.38),sm,c.x+c.side*.3,2.45,(gz0+gz1)/2,G,false);s.rotation.y=c.side>0?PI/2:-PI/2;
    mk(cy(.01,.01,.6,4),M.metalDark,c.x+c.side*.3,2.95,(gz0+gz1)/2,G,false);
    inter(new T.Vector3(IX+c.x+c.side*1.0,0,IZ+(gz0+gz1)/2),1.6,`看看〈${c.name}〉貨架`,()=>shelfMenu(c.name,c.items));});
  // drinks & freezer
  inter(new T.Vector3(IX-.5,0,IZ-3.6),2.2,'打開飲料冷藏櫃',()=>shelfMenu('飲料冷藏櫃',[['牛奶',20],['麥茶',20],['柳橙汁',20],['彈珠汽水',25]]));
  mk(bx(1.3,.85,2.2),imat('#eef2f4',.45),5.9,.43,2.4,G);const fz=mk(new T.PlaneGeometry(1.1,2),new T.MeshLambertMaterial({map:drawGoods('snack'),emissive:0xffffff,emissiveIntensity:.4,transparent:true,opacity:.9}),5.9,.87,2.4,G,false);fz.rotation.x=-PI/2;
  addCol(IX+5.2,IX+6.6,IZ+1.25,IZ+3.55,1);
  inter(new T.Vector3(IX+4.9,0,IZ+2.4),1.5,'打開冰品冷凍櫃',()=>shelfMenu('冰品冷凍櫃',[['蘇打冰棒',20],['香草冰淇淋',25],['西瓜冰',20]]));
  // magazine rack
  mk(bx(.4,1.3,3),imat('#c9c6bd',.4),-6.75,.65,-1.5,G);const mg=mk(new T.PlaneGeometry(3,1.2),new T.MeshLambertMaterial({map:drawGoods('misc'),emissive:0xffffff,emissiveIntensity:.5}),-6.54,.75,-1.5,G,false);mg.rotation.y=PI/2;
  addCol(IX-7,IX-6.5,IZ-3,IZ,2);
  inter(new T.Vector3(IX-5.8,0,IZ-1.5),1.6,'翻翻雜誌',()=>say('雜誌架',[pick(['旅遊雜誌寫著「十個祕密海邊小鎮」，裡面沒有汐見町。太好了。','漫畫週刊的最新一期。封面是一隻會說話的貓。','一本英文繪本：The Very Quiet Cricket。你認得 cricket 這個字嗎？（蟋蟀）'])]));
  // counter
  const cnt=mk(bx(3.6,1.0,.9),imat('#f0efe9',.45),-4.9,.5,1.5,G);mk(bx(3.7,.06,1.0),imat('#9aa0a4',.35),-4.9,1.03,1.5,G);
  const [lc,lg]=C2(512,96);lg.fillStyle='#fbfaf4';lg.fillRect(0,0,512,96);lg.fillStyle='#2b2f6a';lg.fillRect(0,64,512,32);lg.fillStyle='#e8b33c';lg.fillRect(0,56,512,8);lg.fillStyle='#2b2f6a';lg.font=`800 34px ${FG}`;lg.textAlign='center';lg.fillText('ひだまりマート',256,44);
  mk(new T.PlaneGeometry(3.4,.62),new T.MeshBasicMaterial({map:TX(lc)}),-4.9,.55,1.96,G,false);
  addCol(IX-6.8,IX-3.05,IZ+1,IZ+2,2);
  mk(bx(.4,.3,.35),imat('#2a2d33',.2),-4.3,1.2,1.4,G);const scr=mk(bx(.32,.22,.02),new T.MeshBasicMaterial({color:col('#8fe0b0')}),-4.3,1.42,1.6,G,false);scr.rotation.x=-.4;
  // oden pot + steam
  mk(bx(.7,.22,.45),imat('#b8bcc0',.35),-6.0,1.14,1.45,G);const od=mk(new T.PlaneGeometry(.64,.4),imat('#c9933f',.6),-6.0,1.26,1.45,G,false);od.rotation.x=-PI/2;
  const st=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:.25,depthWrite:false}));st.position.set(IX-6,1.6,IZ+1.45);st.scale.set(.8,.8,1);scene.add(st);MART.steam=st;
  // hot case
  mk(bx(.8,.55,.5),new T.MeshLambertMaterial({color:col('#ffe2b0'),transparent:true,opacity:.5,emissive:col('#ffb060'),emissiveIntensity:.5}),-3.6,1.34,1.45,G,false);
  // back shelf behind counter
  mk(bx(3.6,1.8,.4),imat('#d9d7d0',.4),-4.9,.9,-.1,G);
  // clerk
  const ck=person({skin:'#f0d0b4',shirt:'#2b2f6a',collar:'#e8b33c',bottom:'#3a3a3e',legs:'#3a3a3e',shoes:'#2a2522',hair:'#3a2a20',hairStyle:'pony',accent:'#e8b33c'});
  ck.g.position.set(IX-4.9,0,IZ+.7);scene.add(ck.g);MART.clerk=ck;
  inter(new T.Vector3(IX-4.6,0,IZ+2.5),1.8,()=>MART.basket.length?`到櫃台結帳（${MART.basket.length} 件）`:'和店員說話',()=>checkout());
  // exit
  inter(new T.Vector3(IX+4,0,IZ+4.3),1.4,'離開便利商店',()=>exitMart());
  // outside window scenery
  mk(bx(.6,.8,.6),imat('#3c8a4a',.4),6.3,.4,4.4,G);mk(ico(.4,0),imat('#4fae6c',.4),6.3,1.05,4.4,G);
})();
function basketTotal(){return MART.basket.reduce((s,it)=>s+it[1],0);}
function shelfMenu(name,items){const n=MART.basket.length;
  choose(name,`要拿什麼放進購物籃？${n?`（購物籃：${n} 件，共 ${basketTotal()} 金幣）`:''}`,[...items.map(it=>({label:`${it[0]}　${it[1]} 金幣`,fn:()=>{MART.basket.push(it);updateBasket();SND.pick();toast(`放進購物籃：${it[0]}`);shelfMenu(name,items);}})),{label:'不拿了',fn:null}]);}
function checkout(){const who='店員 · Clerk';
  if(!MART.basket.length){choose(who,'歡迎光臨！Welcome! 要不要來點熱食？',[{label:'關東煮　30 金幣',fn:()=>{MART.basket.push(['關東煮',30]);updateBasket();checkout();}},{label:'肉包　25 金幣',fn:()=>{MART.basket.push(['肉包',25]);updateBasket();checkout();}},{label:'烤地瓜　25 金幣',fn:()=>{MART.basket.push(['烤地瓜',25]);updateBasket();checkout();}},{label:'不用了，謝謝',fn:null}]);return;}
  const tot=basketTotal(),list=MART.basket.map(i=>i[0]).join('、');
  choose(who,`${list}，一共 ${tot} 金幣。（你有 ${W.coins} 金幣）`,[{label:`付 ${tot} 金幣`,fn:()=>{if(W.coins<tot){say(who,[`金幣好像不夠喔，還差 ${tot-W.coins} 金幣。可以把一些東西放回去，或先去答題賺金幣。`]);return;}
      W.coins-=tot;MART.basket.forEach(i=>addItem(i[0]));MART.basket=[];updateBasket();renderPouch();save();SND.vend&&SND.register();say(who,['謝謝光臨！Thank you! 歡迎再來～']);}},
    {label:'再逛一下',fn:null},{label:'全部放回去',fn:()=>{MART.basket=[];updateBasket();say(who,['好的，我幫你放回去囉。']);}}]);}
SND.register=function(){if(!A.ready)return;const t=A.ctx.currentTime;[1568,2093].forEach((f,i)=>tone(f,t+i*.09,.35,'sine',.06,A.sfx));nburst(t+.2,.15,'bandpass',3000,1,.08,A.sfx);};
function updateBasket(){if(!MART.bm){const g=new T.Group();const m=lam('#d9573b');mk(bx(.32,.16,.22),m,0,0,0,g,false);mk(bx(.3,.02,.2),lam('#f2c14e'),0,.09,0,g,false);const h=mk(new T.TorusGeometry(.1,.012,6,12,PI),M.metalDark,0,.1,0,g,false);MART.bm=g;}
  const arm=pl.arms[1];if(MART.bm.parent!==arm){if(MART.bm.parent)MART.bm.parent.remove(MART.bm);arm.add(MART.bm);MART.bm.position.set(0,-.66,.06);}
  MART.bm.visible=MART.basket.length>0;renderPouch();}
function fadeTo(fn){const f=$('fade');f.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>f.classList.remove('on'),120);},380);}
function enterMart(){fadeTo(()=>{INDOOR=true;P.sit=null;P.pos.set(IX+4,0,IZ+3.4);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.22;cam.pos.set(IX+4,2.2,IZ+4.6);cam.look.set(IX+4,1.4,IZ+2);SND.chime();updateBasket();curArea=null;areaCool=0;});}
function exitMart(){if(MART.basket.length){choose('店員 · Clerk','購物籃裡還有東西還沒結帳喔！',[{label:'放回去再離開',fn:()=>{MART.basket=[];updateBasket();exitMart();}},{label:'先去結帳',fn:null}]);return;}
  fadeTo(()=>{INDOOR=false;P.pos.set(16.5,0,17.3);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=.9;cam.pos.set(19,2.5,15);cam.look.set(16.5,1.4,17.3);SND.chime();curArea=null;areaCool=0;});}
function martTick(dt){if(!INDOOR)return;
  const near=Math.hypot(P.pos.x-(IX+4),P.pos.z-(IZ+5))<2.4;MART.doorOpen=clamp(MART.doorOpen+(near?dt*3:-dt*2),0,1);
  MART.doors.forEach(d=>{d.m.position.x=4+d.s*(.55+MART.doorOpen*.95);});
  MART.winMat.color.copy(S.skyHorizon).lerp(S.fog,.3).multiplyScalar(1.1);
  MART.steam.position.y=1.6+Math.sin(time*1.3)*.08;MART.steam.material.opacity=.18+.08*Math.sin(time*2.1);
  const ck=MART.clerk;ck.head.rotation.y=Math.atan2(P.pos.x-ck.g.position.x,P.pos.z-ck.g.position.z)*.5;}
