/* ---------- teacher cabin: 2D painted room v2 (partitions, walkable polygons) ---------- */
const TROOM=(()=>{try{return JSON.parse(document.getElementById('troom').textContent);}catch(e){return null;}})();
const R2={on:false,sk:null,x:0,y:0,vx:0,vy:0,view:2,flip:1,ph:0,spd:0,step:0,tgt:null,pend:null,near:null,cx:null,cy:null,
  pet:{x:0,y:0,ph:0,mv:false,flip:1,idle:0,wag:0},cv:null,g:null,img:{},view_:{s:1,ox:0,oy:0},t:0};
// hA:[yBack,yFront,hBack,hFront] figure height; zoom = how close the camera sits
// spots: [key (substring of the 3D cabin interaction label), footX, footY, hit rect, label override]
const R2CFG={
  landscape:{hA:[455,1065,300,430],zoom:1.12,win:[770,50,350,220],map:[340,150,78,92],
    spots:[['廚房',212,812,[0,294,280,436]],['閱讀日記',621,531,[470,270,300,230]],['古老地圖',444,560,[330,140,96,112]],['辦公桌',947,533,[780,250,300,240]],
      ['番茄',1095,540,[1060,280,70,60]],['全班閱讀',1320,540,[1200,90,245,190],'成果牆・全班閱讀計畫'],['床',1708,697,[1500,260,300,360]],['紀念日',1610,700,[1560,105,92,120]],
      ['浴室',1825,662,[1830,130,90,560]],['運動',1711,949,[1740,640,180,260]],['離開小屋',938,1013,[760,955,360,110]]]},
  portrait:{hA:[630,1905,250,410],zoom:1.32,win:[410,190,270,250],map:[175,760,86,78],
    spots:[['廚房',266,1129,[0,940,190,480]],['閱讀日記',316,718,[130,450,270,230]],['古老地圖',230,1000,[165,750,106,98]],['辦公桌',528,715,[400,410,280,260]],
      ['番茄',620,705,[610,460,70,60]],['全班閱讀',700,690,[730,265,120,185],'成果牆・全班閱讀計畫'],['床',790,700,[810,420,270,300]],['紀念日',810,760,[880,272,68,118]],
      ['浴室',994,1399,[1015,780,65,600]],['運動',901,1398,[870,1060,200,220]],['離開小屋',542,1775,[355,1690,370,170]]]}};
if(TROOM){const im=TROOM.img||{};Object.keys(im).forEach(k=>{const i=new Image();i.src=im[k];R2.img[k]=i;});}
{const c=document.createElement('canvas');c.id='room2d';c.hidden=true;c.tabIndex=-1;$('stage').appendChild(c);R2.cv=c;R2.g=c.getContext('2d');
  c.addEventListener('pointerdown',e=>{if(!R2.on||!started||uiOpen())return;e.preventDefault();if(DLG.open){interact();return;}
    const r=c.getBoundingClientRect(),V=R2.view_;const ix=V.ox+(e.clientX-r.left)/V.s,iy=V.oy+(e.clientY-r.top)/V.s;
    const hit=r2Spots().slice().reverse().find(s=>{const h=s.def[3];return ix>=h[0]&&ix<=h[0]+h[2]&&iy>=h[1]&&iy<=h[1]+h[3];});
    if(hit){R2.tgt=[hit.def[1],hit.def[2]];R2.pend=hit;}else{R2.tgt=[ix,iy];R2.pend=null;}
    audioInit&&audioInit();});}
const R2INT={};
function r2Int(key){if(R2INT[key])return R2INT[key];const lb=it=>typeof it.label==='function'?it.label():it.label;
  const it=INT.find(it=>it.pos&&Math.abs(it.pos.x-TCX)<7&&Math.abs(it.pos.z-TCZ)<4.5&&String(lb(it)).includes(key));if(it)R2INT[key]=it;return it;}
function r2Spots(){const C=R2CFG[R2.sk];if(!C)return [];const out=[];
  for(const d of C.spots){const it=r2Int(d[0]);if(!it)continue;if(it.hide&&it.hide())continue;out.push({def:d,it,label:d[4]||(typeof it.label==='function'?it.label():it.label),act:it.act});}return out;}
function r2Ok(){return !!(TROOM&&TROOM.landscape&&R2.img.landscape_bg&&SPR.c&&SPR.c.ready&&SPR.c.mat.map&&SPR.c.mat.map.image);}
function r2H(y){const a=R2CFG[R2.sk].hA;return lerp(a[2],a[3],clamp((y-a[0])/(a[1]-a[0]),0,1));}
function r2Scene(){return innerWidth>=innerHeight?'landscape':'portrait';}
function r2Pip(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function r2Walk(x,y){const W_=TROOM[R2.sk].walk;return W_.some(w=>r2Pip(x,y,w.outer)&&!w.holes.some(h=>r2Pip(x,y,h)));}
function r2Near(x,y){if(r2Walk(x,y))return [x,y];for(let r=6;r<500;r+=8)for(let a=0;a<6.28;a+=.26){const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(r2Walk(px,py))return [px,py];}return [x,y];}
function r2Enter(){if(!r2Ok()){R2.on=false;return;}R2.on=true;R2.sk=r2Scene();const ex=TROOM[R2.sk].exit.spawn;R2.x=ex[0];R2.y=ex[1];R2.vx=R2.vy=0;R2.view=2;R2.flip=1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;
  const P2=R2.pet;[P2.x,P2.y]=r2Near(R2.x+r2H(R2.y)*.4,R2.y+4);P2.idle=0;P2.mv=false;P2.flip=-1;R2.cv.hidden=false;}
function r2Off(){R2.on=false;R2.tgt=R2.pend=null;if(R2.cv)R2.cv.hidden=true;}
function r2Swap(sk){const A0=TROOM[R2.sk],B0=TROOM[sk];const u=R2.x/A0.w,v=R2.y/A0.h;R2.sk=sk;[R2.x,R2.y]=r2Near(u*B0.w,v*B0.h);[R2.pet.x,R2.pet.y]=r2Near(R2.x+40,R2.y+6);R2.tgt=R2.pend=null;R2.cx=R2.cy=null;}
function r2Move(dt){let ix=0,iy=0;const free=!DLG.open&&started&&!uiOpen();
  if(free){if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;ix+=STK.x;iy+=STK.y;}
  const H=r2H(R2.y);const run=(keys.shift||touchRun||Math.hypot(STK.x,STK.y)>.95);const spW=H*1.2,sp=spW*(run?1.9:1);let tx=0,ty=0;
  if(Math.hypot(ix,iy)>.1){R2.tgt=R2.pend=null;const l=Math.max(1,Math.hypot(ix,iy));tx=ix/l*sp;ty=iy/l*sp*.78;}
  else if(R2.tgt&&free){const dx=R2.tgt[0]-R2.x,dy=R2.tgt[1]-R2.y,d=Math.hypot(dx,dy);
    if(d<12||(R2.stuck||0)>.5){R2.tgt=null;R2.stuck=0;const s=R2.pend;R2.pend=null;if(s){R2.view=s.def[0]==='離開小屋'?0:2;R2.vx=R2.vy=0;s.act();}}
    else{const k=Math.min(sp,d*6)/d;tx=dx*k;ty=dy*k;}}
  const e=1-Math.exp(-dt*12);R2.vx=lerp(R2.vx,tx,e);R2.vy=lerp(R2.vy,ty,e);
  const nx=R2.x+R2.vx*dt,ny=R2.y+R2.vy*dt,ox=R2.x,oy=R2.y;
  if(r2Walk(nx,ny)){R2.x=nx;R2.y=ny;}else if(r2Walk(nx,R2.y)){R2.x=nx;R2.vy*=.5;}else if(r2Walk(R2.x,ny)){R2.y=ny;R2.vx*=.5;}else{R2.vx*=.3;R2.vy*=.3;}
  const moved=Math.hypot(R2.x-ox,R2.y-oy);if(R2.tgt&&moved<spW*dt*.05)R2.stuck=(R2.stuck||0)+dt;else R2.stuck=0;
  const spd=moved/Math.max(dt,1e-4);R2.spd=spd/spW;P.moving=R2.spd*3.1;
  if(spd>spW*.12){const ax=Math.abs(R2.vx),ay=Math.abs(R2.vy)/.78;
    if(R2.view===1?ax>ay*.6:ax>ay*1.25){R2.view=1;R2.flip=R2.vx<0?-1:1;}else R2.view=R2.vy<0?2:0;}
  R2.ph+=dt*7.3*Math.min(2,R2.spd);R2.step+=dt*R2.spd;if(R2.step>.34){R2.step=0;SND.step('wood');}
  // pet follows
  const Q=R2.pet;if(PETOBJ&&PETOBJ.spr){const side=R2.view===1?-R2.flip:(Q.x<R2.x?-1:1);const gx=R2.x+side*H*.42,gy=R2.y-8;
    const dx=gx-Q.x,dy=gy-Q.y,d=Math.hypot(dx,dy),busy=PETOBJ.trick||PETOBJ.anim;
    if(!busy&&(d>H*.5||(Q.mv&&d>H*.12))){const ps=Math.max(spd*1.05,H*1.2),st=Math.min(ps*dt,d);let px=Q.x+dx/d*st,py=Q.y+dy/d*st;
      if(!r2Walk(px,py)){if(r2Walk(px,Q.y))py=Q.y;else if(r2Walk(Q.x,py))px=Q.x;else{px=Q.x;py=Q.y;}}Q.x=px;Q.y=py;Q.mv=true;Q.idle=0;if(Math.abs(dx)>4)Q.flip=dx<0?-1:1;Q.ph+=dt*10;}
    else{Q.mv=false;Q.idle+=dt;}
    if(Q.wag>0)Q.wag-=dt;else if(!Q.mv&&Q.idle>2&&Q.idle<7&&Math.random()<dt*.25)Q.wag=1.2;}}
function r2Nearest(){let best=null,bd=1e9;const H=r2H(R2.y);
  for(const s of r2Spots()){const d=Math.hypot(s.def[1]-R2.x,(s.def[2]-R2.y)*1.2);const r=s.def[0]==='離開小屋'?H*.5:H*.3;if(d<r&&d<bd){bd=d;best=s;}}
  R2.near=best;return best?{label:best.label,act:best.act}:null;}
function r2Cover(g,im,x,y,w,h){if(!im||!im.width)return;const s=Math.max(w/im.width,h/im.height),sw=w/s,sh=h/s;g.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,x,y,w,h);}
function r2RR(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const R2PH=TPHOTOS.map(s=>{const i=new Image();i.src=s;return i;});
function r2Slots(g){const C=TROOM[R2.sk],sl=C.slots,cf=R2CFG[R2.sk];
  const nt=S.night||0;if(nt>.02){const w=cf.win;g.save();g.globalAlpha=nt*.78;g.fillStyle='#16204a';g.fillRect(w[0],w[1],w[2],w[3]);g.globalAlpha=nt;g.fillStyle='#fff8d8';
    for(let i=0;i<14;i++){const sx=w[0]+((i*97)%w[2]),sy=w[1]+((i*53)%(w[3]*.55));g.fillRect(sx,sy,2.2,2.2);}g.beginPath();g.arc(w[0]+w[2]*.78,w[1]+w[3]*.2,w[2]*.035,0,7);g.fill();g.restore();}
  [['left_frame_1',0],['left_frame_2',1]].forEach(([k,i])=>{const r=sl[k],im=R2PH[i];if(r&&im&&im.complete&&im.width)r2Cover(g,im,r[0],r[1],r[2],r[3]);});
  {const r=sl.pink_frame;if(r){const [x,y,w,h]=r;g.save();g.fillStyle='#fff6ee';g.fillRect(x,y,w,h);g.textAlign='center';g.textBaseline='middle';
    const n=TS()?annDays():null;
    if(n!=null){g.fillStyle='#e0708e';g.font=`800 ${w*.2}px ${FG}`;g.fillText('♥',x+w/2,y+h*.17);g.fillStyle='#5a3a2a';const fs=Math.min(w*.9/String(n).length*1.45,h*.36);g.font=`900 ${fs}px ${FG}`;g.fillText(String(n),x+w/2,y+h*.47);
      g.font=`700 ${w*.16}px ${FG}`;g.fillStyle='#c85a78';g.fillText('天',x+w/2,y+h*.76);g.font=`500 ${w*.1}px ${FG}`;g.fillStyle='#9a7a6a';g.fillText('在一起',x+w/2,y+h*.9);}
    else{const cx=x+w/2,cy=y+h*.42,rr_=w*.13;g.strokeStyle='#7aa06a';g.lineWidth=w*.03;g.beginPath();g.moveTo(cx,cy);g.quadraticCurveTo(cx-w*.05,cy+h*.25,cx+w*.02,y+h*.9);g.stroke();
      g.fillStyle='#f0a0b8';for(let i=0;i<5;i++){const a=i*1.2566;g.beginPath();g.ellipse(cx+Math.cos(a)*rr_,cy+Math.sin(a)*rr_,rr_*.8,rr_*.55,a,0,7);g.fill();}g.fillStyle='#f6d36a';g.beginPath();g.arc(cx,cy,rr_*.45,0,7);g.fill();}
    g.restore();}}
  {const r=sl.corkboard,b=TC.boardCanvas;if(r&&b){const [x,y,w,h]=r,p=w*.06;const s=Math.min((w-2*p)/b.width,(h-2*p)/b.height),dw=b.width*s,dh=b.height*s,dx=x+(w-dw)/2,dy=y+(h-dh)/2;
    g.save();g.shadowColor='rgba(60,30,10,.35)';g.shadowBlur=6;g.shadowOffsetY=3;g.fillStyle='#fffaf0';g.fillRect(dx-3,dy-3,dw+6,dh+6);g.restore();g.drawImage(b,dx,dy,dw,dh);
    g.fillStyle='#d8574a';[[dx+6,dy+2],[dx+dw-6,dy+2]].forEach(([px,py])=>{g.beginPath();g.arc(px,py,Math.max(3,w*.018),0,7);g.fill();});}}
  {const [x,y,w,h]=cf.map;g.save();g.translate(x+w/2,y+h/2);g.rotate(-.05);g.shadowColor='rgba(60,30,10,.35)';g.shadowBlur=5;g.shadowOffsetY=2;
    g.fillStyle='#ecd9a8';g.beginPath();g.moveTo(-w/2,-h/2);for(let i=0;i<=6;i++)g.lineTo(-w/2+w*i/6,-h/2+(i%2?2:-1));g.lineTo(w/2,h/2);for(let i=6;i>=0;i--)g.lineTo(-w/2+w*i/6,h/2+(i%2?-2:1));g.closePath();g.fill();g.shadowColor='transparent';
    g.strokeStyle='#8a6a3a';g.lineWidth=1.2;g.strokeRect(-w/2+4,-h/2+4,w-8,h-8);
    g.strokeStyle='#5b8fc0';g.lineWidth=2.4;g.beginPath();g.moveTo(-w*.28,-h*.36);g.lineTo(-w*.26,h*.05);g.stroke();g.lineWidth=1.4;[-.33,-.23,-.19].forEach(k=>{g.beginPath();g.moveTo(w*k,-h*.34);g.lineTo(w*k,h*.02);g.stroke();});
    g.strokeStyle='#7a5a32';g.setLineDash([3,3]);g.lineWidth=1.5;g.beginPath();g.moveTo(-w*.24,h*.12);g.lineTo(-w*.05,h*.2);g.lineTo(w*.02,-h*.05);g.lineTo(w*.2,h*.05);g.lineTo(w*.24,-h*.2);g.stroke();g.setLineDash([]);
    g.strokeStyle='#c0392b';g.lineWidth=2.2;const m=w*.06;g.beginPath();g.moveTo(w*.24-m,-h*.2-m);g.lineTo(w*.24+m,-h*.2+m);g.moveTo(w*.24+m,-h*.2-m);g.lineTo(w*.24-m,-h*.2+m);g.stroke();
    g.fillStyle='#b8402e';g.beginPath();g.arc(0,-h/2+3,3,0,7);g.fill();g.restore();}}
function r2Computer(g){const r=TROOM[R2.sk].slots.computer;if(!r)return;const [x,y,w,h]=r;g.save();const gr=g.createLinearGradient(x,y,x+w,y+h);g.textAlign='center';g.textBaseline='middle';
  if(POM.run){const left=Math.max(0,(POM.end-Date.now())/1000);gr.addColorStop(0,'#3a1c1c');gr.addColorStop(1,'#1c1010');g.fillStyle=gr;g.fillRect(x,y,w,h);
    g.fillStyle='#ff7a6a';g.font=`800 ${h*.42}px ${FG}`;g.fillText(fmtT(left),x+w/2,y+h*.45);g.font=`600 ${h*.17}px ${FG}`;g.fillStyle='#f4c0b0';g.fillText('🍅 '+(POM_MODES[POM.mode]||['專注'])[0],x+w/2,y+h*.8);}
  else if(WO.run&&TS()){gr.addColorStop(0,'#123a2a');gr.addColorStop(1,'#0c2018');g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='#7fe0a8';g.font=`800 ${h*.4}px ${FG}`;g.fillText(fmtT(woEl()),x+w/2,y+h*.45);g.font=`600 ${h*.17}px ${FG}`;g.fillText('運動中',x+w/2,y+h*.8);}
  else{gr.addColorStop(0,'#5fa8d8');gr.addColorStop(1,'#f3c69a');g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='rgba(255,255,255,.92)';g.font=`700 ${h*.24}px ${FG}`;g.fillText('汐見町',x+w/2,y+h*.5);}
  g.restore();}
function r2Human(g){const c=SPR.c,M=c.meta,im=c.mat.map.image;const H=r2H(R2.y),dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;const v=R2.view,moving=R2.spd>.15;
  const list=v===0?M.fw:v===1?M.sw:M.bw;let f=v;if(moving&&list&&list.length===4){f=list[Math.floor(((R2.ph*1.3/(PI*2))%1+1)%1*4)];}
  const br=moving?1:1+Math.sin(R2.t*2.2)*.008;
  g.save();g.translate(R2.x,R2.y);g.fillStyle='rgba(40,20,10,.28)';g.beginPath();g.ellipse(0,0,dw*.26,dw*.07,0,0,7);g.fill();
  g.scale(v===1?R2.flip:1,br);g.drawImage(im,f*M.cw,0,M.cw,M.ch,-dw/2,-dh+3/M.ch*dh,dw,dh);g.restore();}
function r2Pet(g){const o=PETOBJ;if(!o||!o.spr||!o.spr.ready||!o.spr.mat.map)return;const c=o.spr,M=c.meta,A_=M.act||{},im=c.mat.map.image,Q=R2.pet;
  const H=r2H(Q.y)*.42,dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;let f=0,flip=1,rz=0;
  if(o.trick||o.anim){f=c.frame;rz=c.pivot.rotation.z;flip=Math.sign(c.m.scale.x)||1;}
  else if(Q.mv){f=A_.run_1!=null?A_['run_'+(Math.floor(Q.ph%4)+1)]:(Math.sin(Q.ph)>0?1:2);flip=Q.flip;}
  else if(Q.idle>16&&A_.sleep!=null)f=A_.sleep;else if(Q.idle>8&&A_.lie!=null)f=A_.lie;else if(Q.wag>0&&A_.wag_A!=null)f=Math.floor(Q.wag*6)%2?A_.wag_B:A_.wag_A;
  g.save();g.translate(Q.x,Q.y);g.fillStyle='rgba(40,20,10,.24)';g.beginPath();g.ellipse(0,0,dw*.28,dw*.07,0,0,7);g.fill();
  if(rz){g.translate(0,-dh*.35);g.rotate(-rz);g.translate(0,dh*.35);}g.scale(flip,1);g.drawImage(im,f*M.cw,0,M.cw,M.ch,-dw/2,-dh+3/M.ch*dh,dw,dh);g.restore();}
function r2Sort(o,x){if(!o.line)return o.sort;const [[x1,y1],[x2,y2]]=o.line;const t=clamp((x-x1)/((x2-x1)||1),0,1);return lerp(y1,y2,t);}
function r2Draw(dt){R2.t+=dt;const cv=R2.cv,g=R2.g;const dpr=Math.min(2,devicePixelRatio||1);const cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);
  if(!cw||!ch)return;if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
  const sk=r2Scene();if(sk!==R2.sk)r2Swap(sk);const C=TROOM[R2.sk],Wi=C.w,Hi=C.h;
  const s=Math.max(cw/Wi,ch/Hi)*R2CFG[R2.sk].zoom,vw=cw/s,vh=ch/s;
  const wantX=clamp(R2.x-vw/2,0,Wi-vw),wantY=clamp(R2.y-r2H(R2.y)*.5-vh/2,0,Hi-vh);
  if(R2.cx==null){R2.cx=wantX;R2.cy=wantY;}else{const e=1-Math.exp(-dt*4);R2.cx=lerp(R2.cx,wantX,e);R2.cy=lerp(R2.cy,wantY,e);}
  R2.view_={s:s/dpr,ox:R2.cx,oy:R2.cy};
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#2a1a10';g.fillRect(0,0,cw,ch);g.setTransform(s,0,0,s,-R2.cx*s,-R2.cy*s);g.imageSmoothingQuality='high';
  const bg=R2.img[R2.sk+'_bg'];if(bg&&bg.complete)g.drawImage(bg,0,0,Wi,Hi);
  r2Slots(g);r2Computer(g);
  const L=[];C.occ.forEach(o=>{L.push([r2Sort(o,R2.x),()=>{const im=R2.img[o.file];if(im&&im.complete)g.drawImage(im,o.x,o.y);if(o.id==='desk')r2Computer(g);}]);});
  L.push([R2.y,()=>r2Human(g)]);if(PETOBJ)L.push([R2.pet.y,()=>r2Pet(g)]);L.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
  const nt=S.night||0;if(nt>.02){g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(120,110,170,${nt*.35})`;g.fillRect(0,0,Wi,Hi);g.restore();}
  const n=R2.near;if(n&&n.def[0]!=='離開小屋'&&!DLG.open){const h=n.def[3],mx=h[0]+h[2]/2,my=Math.max(R2.cy+30,h[1]-8)+Math.sin(R2.t*4)*6,sz=r2H(R2.y)*.07;
    g.save();g.fillStyle='#fff';g.strokeStyle='rgba(60,30,10,.6)';g.lineWidth=sz*.18;g.beginPath();g.moveTo(mx-sz,my-sz*1.3);g.lineTo(mx+sz,my-sz*1.3);g.lineTo(mx,my);g.closePath();g.stroke();g.fill();g.restore();}}
