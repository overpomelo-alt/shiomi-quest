/* ================================================================
   平等車站 (hub): start point after login; trains to home / 汐見町 / (部落, 其他小鎮 — under construction)
   ================================================================ */
const STX=200,STZ=330,ST_W=12,ST_D=7,ST_RH=3.6;var ST_IN=false;
const ST={};
(function(){const G=new T.Group();G.position.set(STX,0,STZ);scene.add(G);ST.g=G;const W_=ST_W/2,D_=ST_D/2,EXT=3.8,RH=ST_RH;
  const rep=(geo,u,v)=>{const a=geo.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,a.getX(i)*u,a.getY(i)*v);return geo;};
  const plaster=(()=>{const [c,g]=C2(256,256);g.fillStyle='#efe6d2';g.fillRect(0,0,256,256);speckle(g,256,256,2500,.05);return TX(c,true);})();
  const wainsc=(()=>{const [c,g]=C2(256,128);g.fillStyle='#7e5638';g.fillRect(0,0,256,128);for(let x=0;x<256;x+=32){g.fillStyle='rgba(40,25,15,.45)';g.fillRect(x,0,2,128);g.fillStyle='rgba(255,230,190,.08)';g.fillRect(x+4,0,10,128);}g.fillStyle='#5a3a24';g.fillRect(0,0,256,10);return TX(c,true);})();
  const tiles=(()=>{const [c,g]=C2(256,256);for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?'#c9b99a':'#ddd0b4';g.fillRect(x*64,y*64,64,64);}g.strokeStyle='rgba(90,70,50,.35)';g.lineWidth=2;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke();}speckle(g,256,256,2000,.05);return TX(c,true);})();
  const em=(t,e=.14)=>new T.MeshLambertMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:e});
  const fg=rep(new T.PlaneGeometry(ST_W,ST_D+EXT),ST_W/2,(ST_D+EXT)/2);fg.rotateX(-PI/2);mk(fg,em(tiles,.12),0,0,EXT/2,G,false);
  const cg=new T.PlaneGeometry(ST_W,ST_D+EXT);cg.rotateX(PI/2);mk(cg,new T.MeshBasicMaterial({color:col('#6b5440')}),0,RH,EXT/2,G,false);
  for(let z=-D_;z<=D_+EXT;z+=2.2)mk(bx(ST_W,.2,.2),new T.MeshBasicMaterial({color:col('#4a3527')}),0,RH-.1,z,G,false);
  const wall=(w,x,z,ry)=>{const up=mk(rep(new T.PlaneGeometry(w,RH-1.1),w/2.4,(RH-1.1)/2.4),em(plaster,.16),x,1.1+(RH-1.1)/2,z,G,false);up.rotation.y=ry;
    const lo=mk(rep(new T.PlaneGeometry(w,1.1),w/2,1),em(wainsc,.12),x,.55,z,G,false);lo.rotation.y=ry;};
  wall(ST_W,0,-D_,0);wall(ST_D+EXT,-W_,EXT/2,PI/2);wall(ST_D+EXT,W_,EXT/2,-PI/2);
  // big window with mountain view (home feeling)
  const [vc,vg]=C2(512,256);const sk=vg.createLinearGradient(0,0,0,256);sk.addColorStop(0,'#7fb0d8');sk.addColorStop(.7,'#dcebf0');sk.addColorStop(1,'#f3e2c4');vg.fillStyle=sk;vg.fillRect(0,0,512,256);
  vg.fillStyle='rgba(255,255,255,.85)';[[90,50,40],[300,36,54],[430,70,30]].forEach(([x,y,r])=>{vg.beginPath();vg.ellipse(x,y,r*1.6,r*.5,0,0,7);vg.fill();});
  [['#8aa0b8',120,.6,0],['#5f7d6a',150,.9,2],['#3f5f4a',185,1.2,4],['#2f4a38',215,1.6,6]].forEach(([c,h,k,s])=>{vg.fillStyle=c;vg.beginPath();vg.moveTo(0,256);for(let x=0;x<=512;x+=8)vg.lineTo(x,h-Math.sin(x*.012*k+s)*34/k-Math.sin(x*.05+s)*10-Math.abs(Math.sin(x*.004+s))*30);vg.lineTo(512,256);vg.fill();});
  vg.fillStyle='rgba(255,255,255,.35)';vg.fillRect(0,230,512,26);
  const vt=TX(vc);mk(new T.PlaneGeometry(5.6,1.9),new T.MeshBasicMaterial({map:vt}),-2.4,2.1,-D_+.02,G,false);
  const frame=imat('#5a3a24',.3);[[0,1],[0,-1]].forEach(([_,s])=>mk(bx(5.8,.1,.1),frame,-2.4,2.1+s*1,-D_+.06,G,false));[-5.3,-3.35,-1.45,.5].forEach(x=>mk(bx(.1,2.1,.1),frame,x,2.1,-D_+.06,G,false));
  mk(bx(5.9,.08,.3),imat('#6e4c33',.3),-2.4,1.1,-D_+.15,G,false);
  // station name board
  const [nc,ng]=C2(512,160);ng.fillStyle='#f6f4ee';ng.fillRect(0,0,512,160);ng.fillStyle='#2f6b56';ng.fillRect(0,112,512,48);ng.fillStyle='#1c1c1c';ng.font=`800 70px ${FG}`;ng.textAlign='center';ng.textBaseline='middle';ng.fillText('平 等',256,52);
  ng.font=`500 20px ${FG}`;ng.fillText('Píngděng Station',256,95);ng.fillStyle='#f6f4ee';ng.font=`700 22px ${FG}`;ng.textAlign='left';ng.fillText('← 部落',16,137);ng.textAlign='right';ng.fillText('汐見町 →',496,137);
  const nbm=emMat(TX(nc),TX(nc),'signs');mk(new T.PlaneGeometry(2.4,.75),nbm,3.2,3.05,-D_+.03,G,false);
  // ticket window + station master
  mk(bx(3,1.05,.7),imat('#8a6446',.3),3.2,.52,-D_+.9,G);mk(bx(3.1,.06,.8),imat('#5a3a24',.3),3.2,1.07,-D_+.9,G);
  mk(new T.PlaneGeometry(2.8,1.1),new T.MeshLambertMaterial({color:col('#cfe4ec'),transparent:true,opacity:.28,depthWrite:false}),3.2,1.7,-D_+.56,G,false);
  [1.7,4.7].forEach(x=>mk(bx(.08,1.2,.08),frame,x,1.66,-D_+.56,G,false));mk(bx(3.1,.1,.1),frame,3.2,2.3,-D_+.56,G,false);
  const [kc,kg]=C2(256,64);kg.fillStyle='#2f6b56';kg.fillRect(0,0,256,64);kg.fillStyle='#fff';kg.font=`700 30px ${FG}`;kg.textAlign='center';kg.textBaseline='middle';kg.fillText('售票・服務台',128,34);
  mk(new T.PlaneGeometry(1.4,.35),emMat(TX(kc),TX(kc),'signs'),3.2,2.52,-D_+.56,G,false);
  addCol(STX+1.65,STX+4.75,STZ-D_,STZ-D_+1.3,2);
  ST.master={g:new T.Group()};npcSprite('guard',ST.master,new T.Vector3(STX+3.2,0,STZ-D_+.35),0,1.7,{indoor:true,face:5});
  // destination board (departures)
  const [dc,dg]=C2(512,320);ST.depCanvas=dc;ST.depTex=TX(dc);
  mk(bx(2.5,1.6,.08),imat('#2a2a30',.2),W_-.06,2.3,-.4,G,false).rotation.y=-PI/2;const dep=mk(new T.PlaneGeometry(2.36,1.48),new T.MeshBasicMaterial({map:ST.depTex}),W_-.11,2.3,-.4,G,false);dep.rotation.y=-PI/2;
  // gate to platform (right wall door)
  mk(new T.PlaneGeometry(1.5,2.4),new T.MeshBasicMaterial({color:col('#1a1c22')}),W_-.02,1.2,1.7,G,false).rotation.y=-PI/2;
  const dl=mk(new T.PlaneGeometry(1.5,2.4),new T.MeshBasicMaterial({color:col('#bfe0f0'),transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false}),W_-.04,1.2,1.7,G,false);dl.rotation.y=-PI/2;
  [[.95],[2.45]].forEach(([z])=>mk(bx(.12,2.5,.12),frame,W_-.08,1.25,z,G,false));mk(bx(.12,.12,1.6),frame,W_-.08,2.45,1.7,G,false);
  const [gc,gg]=C2(256,64);gg.fillStyle='#2f6b56';gg.fillRect(0,0,256,64);gg.fillStyle='#fff';gg.font=`700 30px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText('月台  ➜',128,34);
  const gs=mk(new T.PlaneGeometry(1.1,.28),emMat(TX(gc),TX(gc),'signs'),W_-.06,2.72,1.7,G,false);gs.rotation.y=-PI/2;
  // ticket gates (two small posts)
  [.9,2.5].forEach(z=>{mk(bx(.9,.95,.22),imat('#c9c1b0',.35),W_-1.3,.47,z,G);mk(bx(.3,.05,.18),imat('#3f7d5a',.4),W_-1.3,.97,z,G,false);addCol(STX+W_-1.75,STX+W_-.85,STZ+z-.11,STZ+z+.11,1.2);});
  // benches
  [[-3.4,.5],[-3.4,2.1]].forEach(([x,z])=>{mk(bx(3,.08,.5),imat('#b08a5e',.3),x,.45,z,G);mk(bx(3,.45,.06),imat('#b08a5e',.3),x,.72,z+.24,G);[-1.3,1.3].forEach(dx=>mk(bx(.06,.45,.45),imat('#45484d',.3),x+dx,.22,z,G));addCol(STX+x-1.5,STX+x+1.5,STZ+z-.28,STZ+z+.3,1);});
  // notice board (left wall) + clock + plant + poster
  mk(bx(.08,1.2,1.8),imat('#8a6446',.3),-W_+.06,1.8,-1.2,G,false);const [pc,pg]=C2(256,170);pg.fillStyle='#e8dcbe';pg.fillRect(0,0,256,170);
  [['#f7f2e8',20,24,90,60],['#ffe9a8',130,30,100,52],['#f7f2e8',40,100,110,52],['#d9e8f7',160,94,76,60]].forEach(([c,x,y,w,h])=>{pg.fillStyle=c;pg.fillRect(x,y,w,h);pg.fillStyle='#c8432b';pg.beginPath();pg.arc(x+w/2,y+4,4,0,7);pg.fill();pg.fillStyle='rgba(60,50,40,.5)';for(let k=0;k<3;k++)pg.fillRect(x+8,y+16+k*11,w-16,3);});
  const bp=mk(new T.PlaneGeometry(1.7,1.12),new T.MeshLambertMaterial({map:TX(pc),emissive:0xffffff,emissiveMap:TX(pc),emissiveIntensity:.2}),-W_+.11,1.8,-1.2,G,false);bp.rotation.y=PI/2;
  const [lc,lg]=C2(256,48);lg.fillStyle='#b8452f';lg.fillRect(0,0,256,48);lg.fillStyle='#fff3dd';lg.font=`700 26px ${FG}`;lg.textAlign='center';lg.textBaseline='middle';lg.fillText('班級公告',128,26);
  const lb=mk(new T.PlaneGeometry(.9,.17),new T.MeshBasicMaterial({map:TX(lc)}),-W_+.11,2.55,-1.2,G,false);lb.rotation.y=PI/2;
  mk(cy(.3,.3,.06,24),imat('#f7f2e8',.45),.9,3.0,-D_+.05,G,false).rotation.x=PI/2;const hh=mk(bx(.03,.16,.01),imat('#222',.2),.9,3.05,-D_+.09,G,false);const mh=mk(bx(.02,.23,.01),imat('#222',.2),.9,3.08,-D_+.1,G,false);ST.hands=[hh,mh];
  mk(cy(.22,.17,.42,10),imat('#9a5e42',.3),-W_+.5,.21,-D_+.5,G);for(let i=0;i<6;i++){const f=mk(ico(.22+rand()*.08,0),imat(pick(['#557a4f','#4b6f47','#62855a']),.3),-W_+.5+rr(-.12,.12),.66+i*.12,-D_+.5+rr(-.12,.12),G);f.scale.y=1.3;}addCol(STX-W_,STX-W_+.8,STZ-D_,STZ-D_+.8,2);
  const [oc,og]=C2(160,224);const gr=og.createLinearGradient(0,0,0,224);gr.addColorStop(0,'#26376a');gr.addColorStop(.55,'#f6a06a');gr.addColorStop(1,'#1a2d4a');og.fillStyle=gr;og.fillRect(0,0,160,224);og.fillStyle='#ffe9c0';og.beginPath();og.arc(80,122,20,0,7);og.fill();og.fillStyle='#2a1f2c';og.fillRect(0,150,160,74);og.fillStyle='#f3ead9';og.font=`700 22px ${FG}`;og.textAlign='center';og.fillText('海邊小鎮',80,36);og.font=`800 30px ${FG}`;og.fillText('汐見町',80,72);og.font=`500 15px ${FG}`;og.fillText('搭火車就到了！',80,200);
  const po=mk(new T.PlaneGeometry(.72,1.0),new T.MeshBasicMaterial({map:TX(oc)}),-W_+.11,1.9,1.4,G,false);po.rotation.y=PI/2;
  // exit mat hint
  const [ec,eg]=C2(256,64);eg.fillStyle='#2f6b56';eg.fillRect(0,0,256,64);eg.fillStyle='#fff';eg.font=`700 26px ${FG}`;eg.textAlign='center';eg.textBaseline='middle';eg.fillText('剪票口 → 月台',128,34);
  const em_=mk(new T.PlaneGeometry(1.4,.35),new T.MeshBasicMaterial({map:TX(ec)}),W_-2.4,.012,1.7,G,false);em_.rotation.x=-PI/2;em_.rotation.z=-PI/2;
  // outer colliders
  addCol(STX-W_-.3,STX-W_,STZ-D_,STZ+D_,4);addCol(STX+W_,STX+W_+.3,STZ-D_,STZ+D_,4);addCol(STX-W_,STX+W_,STZ-D_-.3,STZ-D_,4);addCol(STX-W_,STX+W_,STZ+D_,STZ+D_+.3,4);
  const P_=(x,z)=>new T.Vector3(STX+x,0,STZ+z);
  inter(P_(3.2,-D_+1.8),1.4,'和站務員說話',()=>stationTalk());
  inter(P_(W_-.9,1.7),1.5,'剪票口・搭火车'.replace('车','車'),()=>chooseDest());
  inter(P_(W_-.9,-.4),1.4,'看發車時刻表',()=>chooseDest());
  inter(P_(-W_+.9,-1.2),1.5,'看班級公告',()=>openBoard('news'));
  inter(P_(-3.4,1.2),1.2,'坐在長椅上',()=>say('長椅',['窗外的山好近。風從月台吹進來，有一點涼。']));})();
function drawDepBoard(){const g=ST.depCanvas.getContext('2d');g.fillStyle='#15171c';g.fillRect(0,0,512,320);g.fillStyle='#f2c14e';g.font=`700 30px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('發車時刻 Departures',20,34);
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(16,58,480,2);
  DESTS().forEach((d,i)=>{const y=92+i*56;g.fillStyle=d.open?'#e8f0ff':'#7a808c';g.font=`700 30px ${FG}`;g.fillText(`${d.ic} ${d.name}`,24,y);g.textAlign='right';g.font=`600 22px ${FG}`;g.fillStyle=d.open?'#7fe0a0':'#e0a060';g.fillText(d.open?'搭乘中':'施工中',490,y);g.textAlign='left';});
  ST.depTex.needsUpdate=true;}
function DESTS(){const L=[{id:'home',ic:'🏠',name:'回家（我的房間）',open:true},{id:'town',ic:'🌊',name:'汐見町',open:true},{id:'tribe',ic:'⛰️',name:'部落',open:false},{id:'other',ic:'🏙️',name:'其他小鎮',open:false}];
  if(IS_T)L.push({id:'cabin',ic:'🏡',name:'老師的小屋（老師專用）',open:true});return L;}
function chooseDest(){choose('平等車站・剪票口','要去哪裡呢？',[...DESTS().map(d=>({label:`${d.ic} ${d.name}${d.open?'':'（施工中）'}`,fn:()=>goDest(d)})),{label:'先不要',fn:null}]);}
function goDest(d){if(!d.open){say('站務員',[d.id==='tribe'?'往部落的路線還在鋪鐵軌喔！老師正在準備，完成後就能回到部落探險。':'其他小鎮的路線還在規劃中，敬請期待！']);return;}
  if(d.id==='home'){HOME.from='station';enterHome();}
  else if(d.id==='town')trainRide('汐見町',()=>arriveShiomi());
  else if(d.id==='cabin'){trainRide('汐見町',()=>{leaveStation();enterCabinDirect();});}}
function stationTalk(){const first=!W.stSeen;W.stSeen=true;save();
  say('站務員',first?[`${W.name||''}，你好！歡迎來到平等車站。`,'這裡是大家出發的地方。從剪票口進去就能搭火車。','想回家整理房間、還是去海邊的汐見町闖關，都從這裡出發喔！','牆上的「班級公告」有老師的最新消息，記得看一看。']:[pick([`${W.name||''}，今天要去哪裡呢？`,'火車準時發車喔！','闖關累了就回家休息一下吧。'])],{onEnd:()=>chooseDest()});}
function enterStation(opts={}){const go=()=>{INDOOR=true;ST_IN=true;HOME_IN=false;$('homeBar').hidden=true;P.sit=null;P.pos.set(STX-1,0,STZ+2.4);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pos.set(STX,3,STZ+6.5);cam.look.set(STX,.5,STZ);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(STX,0,STZ+2.6);PETOBJ.by=0;}drawDepBoard();SND.chime&&SND.chime();
  if(opts.login){if(!W.stSeen)setTimeout(()=>stationTalk(),900);else setTimeout(()=>toast(`${W.name||''}，歡迎回到平等車站！`),700);}};
  if(opts.now)go();else fadeTo(go);}
function leaveStation(){ST_IN=false;INDOOR=false;}
// ---- train ride overlay (window view scrolling by)
(function(){const mkLayer=(w,h,draw)=>{const [c,g]=C2(w,h);draw(g,w,h);return c.toDataURL('image/png');};
  const far=mkLayer(1024,300,(g,w,h)=>{g.fillStyle='#7d95ad';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,150-Math.sin(x*.006)*40-Math.sin(x*.021)*18-(x<w/2?0:0));g.lineTo(w,h);g.fill();});
  const mid=mkLayer(1024,300,(g,w,h)=>{g.fillStyle='#3f6a50';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,210-Math.sin(x*.012+1)*30-Math.sin(x*.043)*10);g.lineTo(w,h);g.fill();
    for(let i=0;i<40;i++){const x=(i*97)%w,y=200+((i*53)%40);g.fillStyle='#2f5040';g.beginPath();g.moveTo(x,y-40);g.lineTo(x-14,y+10);g.lineTo(x+14,y+10);g.fill();}});
  const near=mkLayer(1024,300,(g,w,h)=>{g.fillStyle='#2a3a2c';g.fillRect(0,262,w,38);for(let x=40;x<w;x+=256){g.fillStyle='#3a3530';g.fillRect(x,40,8,230);g.fillRect(x-30,50,68,6);}g.strokeStyle='rgba(20,20,20,.6)';g.lineWidth=2;g.beginPath();for(let x=0;x<=w;x+=4){const k=(x%256)/256;g.lineTo(x,58+Math.sin(k*PI)*18);}g.stroke();});
  const d=document.createElement('div');d.id='ride';d.hidden=true;d.innerHTML=`<div class="rd-win"><div class="rd-sky"></div><div class="rd-l" style="background-image:url(${far});--sp:14s"></div><div class="rd-l" style="background-image:url(${mid});--sp:6s"></div><div class="rd-l" style="background-image:url(${near});--sp:1.6s"></div><div class="rd-frame"></div></div><p class="rd-t"></p>`;document.body.appendChild(d);})();
function trainRide(dest,then){if(DLG.open)closeDlg();const r=$('ride');fadeTo(()=>{r.hidden=false;r.querySelector('.rd-t').textContent=`🚃 開往 ${dest}……`;r.classList.remove('out');
  if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<8;i++){nburst(t+i*.34,.12,'lowpass',260,.8,.35,A.sfx);nburst(t+i*.34+.12,.1,'lowpass',240,.8,.25,A.sfx);}}
  setTimeout(()=>{r.classList.add('out');setTimeout(()=>{fadeTo(()=>{r.hidden=true;then();});},300);},2600);});}
function arriveShiomi(){leaveStation();HOME_IN=false;$('homeBar').hidden=true;P.sit=null;P.pos.set(46,.9,-34.4);P.vel.set(0,0,0);P.yaw=0;cam.yaw=PI;cam.pitch=.2;cam.pos.set(46,3,-39);cam.look.set(46,1.9,-34.4);
  TRAIN.x=48;TRAIN.dir=TRAIN.dir||1;TRAIN.state='stop';TRAIN.stopT=5;TRAIN.v=0;if(PETOBJ){PETOBJ.g.position.set(47,.9,-34.6);PETOBJ.by=.9;}curArea=null;areaCoolReset();
  SND.chime&&SND.chime();setTimeout(()=>toast('汐見駅到了！海的味道～'),600);}
inter(new T.Vector3(52,.9,-34.3),1.7,'搭火車回平等車站',()=>choose('汐見駅','要搭火車回平等車站嗎？',[{label:'回平等車站',fn:()=>trainRide('平等',()=>enterStation({now:true}))},{label:'再逛一下',fn:null}]));
