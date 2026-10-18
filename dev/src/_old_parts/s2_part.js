/* ================================================================
   Station lobby: 2D painted scene (ChatGPT illustration) over the 3D station logic
   ================================================================ */
const SROOM=(()=>{try{return JSON.parse(document.getElementById('sroom').textContent);}catch(e){return null;}})();
const S2={on:false,sk:null,x:0,y:0,vx:0,vy:0,view:2,flip:1,ph:0,spd:0,step:0,tgt:null,pend:null,near:null,cx:null,cy:null,stuck:0,
  pet:{x:0,y:0,ph:0,mv:false,flip:1,idle:0,wag:0},cv:null,g:null,img:{},view_:{s:1,ox:0,oy:0},t:0,slotC:{}};
// spots: [INT key ('=' prefix: exact label), footX, footY, hit rect [x,y,w,h]]
const S2CFG={
  landscape:{hA:[655,1062,215,320],zoom:1.1,door:[610,775],
    walk:[{outer:[[0,655],[1920,655],[1920,1062],[0,1062]],holes:[[[0,640],[352,640],[352,702],[300,772],[60,978],[0,982]],[[1606,695],[1660,688],[1920,700],[1920,992],[1866,992],[1612,784]]]}],
    lines:{bench_left:[[45,966],[300,765]],bench_right:[[1630,765],[1880,970]]},
    spots:[['回家',364,668,[60,130,170,480]],['班級公告',444,668,[235,270,150,240]],['=看時刻表',540,668,[440,280,190,190]],['站務員',960,672,[640,240,640,400]],
      ['發車時刻表',1385,668,[1290,280,190,190]],['剪票口',1628,672,[1500,280,290,380]],['長椅',272,862,[0,580,300,400]],['長椅',1650,862,[1620,586,300,390]]]},
  portrait:{hA:[800,1880,215,420],zoom:1.22,door:[800,1270],
    walk:[{outer:[[205,800],[355,800],[355,842],[722,842],[722,800],[855,800],[865,935],[995,1005],[1000,1095],[922,1100],[922,1545],[1080,1565],[1080,1880],[0,1880],[0,1560],[158,1545],[158,1100],[95,1090]],holes:[]}],
    lines:{bench_left:[[150,1222],[25,1532]],bench_right:[[930,1222],[1055,1532]]},
    spots:[['回家',150,1068,[0,420,120,700]],['班級公告',218,880,[110,520,90,300]],['=看時刻表',300,812,[225,410,140,150]],['站務員',540,852,[350,480,380,360]],
      ['發車時刻表',790,812,[720,410,140,150]],['剪票口',850,902,[800,600,180,330]],['長椅',212,1350,[0,1090,160,450]],['長椅',866,1350,[920,1090,160,450]]]}};
if(SROOM){Object.keys(SROOM.img||{}).forEach(k=>{const i=new Image();i.src=SROOM.img[k];S2.img[k]=i;});}
{const c=document.createElement('canvas');c.id='station2d';c.className='scene2d';c.hidden=true;c.tabIndex=-1;$('stage').appendChild(c);S2.cv=c;S2.g=c.getContext('2d');
  c.addEventListener('pointerdown',e=>{if(!S2.on||!started||uiOpen())return;e.preventDefault();if(DLG.open){interact();return;}
    const r=c.getBoundingClientRect(),V=S2.view_;const ix=V.ox+(e.clientX-r.left)/V.s,iy=V.oy+(e.clientY-r.top)/V.s;
    const hit=s2Spots().slice().reverse().find(s=>{const h=s.def[3];return ix>=h[0]&&ix<=h[0]+h[2]&&iy>=h[1]&&iy<=h[1]+h[3];});
    if(hit){S2.tgt=[hit.def[1],hit.def[2]];S2.pend=hit;}else{S2.tgt=[ix,iy];S2.pend=null;}
    audioInit&&audioInit();});}
const S2INT={};
function s2Int(key){if(S2INT[key])return S2INT[key];const lb=it=>String(typeof it.label==='function'?it.label():it.label);const ex=key[0]==='=',k=ex?key.slice(1):key;
  const it=INT.find(it=>it.pos&&Math.abs(it.pos.x-STX)<8&&Math.abs(it.pos.z-STZ)<6&&(ex?lb(it)===k:lb(it).includes(k)));if(it)S2INT[key]=it;return it;}
function s2Spots(){const C=S2CFG[S2.sk];if(!C)return [];const out=[];
  for(const d of C.spots){const it=s2Int(d[0]);if(!it)continue;if(it.hide&&it.hide())continue;out.push({def:d,it,label:typeof it.label==='function'?it.label():it.label,act:it.act});}
  if(TS()&&typeof openPortal==='function'){const [dx,dy]=C.door,H=s2H(dy)*1.25;out.push({def:['任意門',dx-H*.42,dy+18,[dx-H*.36,dy-H,H*.72,H]],label:'打開任意門（老師專用）',act:()=>openPortal()});}
  return out;}
function s2Ok(){return !!(SROOM&&SROOM.landscape&&S2.img.landscape_bg&&SPR.c&&SPR.c.ready&&SPR.c.mat.map&&SPR.c.mat.map.image);}
function s2H(y){const a=S2CFG[S2.sk].hA;return lerp(a[2],a[3],clamp((y-a[0])/(a[1]-a[0]),0,1));}
function s2Walk(x,y){const C=S2CFG[S2.sk];if(TS()){const [dx,dy]=C.door,H=s2H(dy)*1.25;if(Math.abs(x-dx)<H*.34&&Math.abs(y-dy)<16)return false;}
  return C.walk.some(w=>r2Pip(x,y,w.outer)&&!w.holes.some(h=>r2Pip(x,y,h)));}
function s2Near(x,y){if(s2Walk(x,y))return [x,y];for(let r=6;r<600;r+=8)for(let a=0;a<6.28;a+=.26){const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(s2Walk(px,py))return [px,py];}return [x,y];}
function s2Enter(from){if(!s2Ok()){S2.on=false;return false;}S2.on=true;S2.sk=r2Scene();const C=S2CFG[S2.sk],D=SROOM[S2.sk];
  const sp=from==='home'?C.spots[0]:null;[S2.x,S2.y]=s2Near(sp?sp[1]+60:D.w*.5,sp?sp[2]+30:(S2.sk==='portrait'?1500:900));
  S2.vx=S2.vy=0;S2.view=sp?1:2;S2.flip=1;S2.tgt=S2.pend=null;S2.cx=S2.cy=null;S2.stuck=0;
  const Q=S2.pet;[Q.x,Q.y]=s2Near(S2.x+s2H(S2.y)*.4,S2.y+4);Q.idle=0;Q.mv=false;Q.flip=-1;S2.cv.hidden=false;return true;}
function s2Off(){S2.on=false;S2.tgt=S2.pend=null;if(S2.cv)S2.cv.hidden=true;}
function s2Swap(sk){const A0=SROOM[S2.sk],B0=SROOM[sk];const u=S2.x/A0.w,v=S2.y/A0.h;S2.sk=sk;[S2.x,S2.y]=s2Near(u*B0.w,v*B0.h);[S2.pet.x,S2.pet.y]=s2Near(S2.x+40,S2.y+6);S2.tgt=S2.pend=null;S2.cx=S2.cy=null;}
function s2Move(dt){let ix=0,iy=0;const free=!DLG.open&&started&&!uiOpen();
  if(free){if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;ix+=STK.x;iy+=STK.y;}
  const H=s2H(S2.y);const run=(keys.shift||touchRun||Math.hypot(STK.x,STK.y)>.95);const spW=H*1.2,sp=spW*(run?1.9:1);let tx=0,ty=0;
  if(Math.hypot(ix,iy)>.1){S2.tgt=S2.pend=null;const l=Math.max(1,Math.hypot(ix,iy));tx=ix/l*sp;ty=iy/l*sp*.78;}
  else if(S2.tgt&&free){const dx=S2.tgt[0]-S2.x,dy=S2.tgt[1]-S2.y,d=Math.hypot(dx,dy);
    if(d<12||S2.stuck>.5){S2.tgt=null;S2.stuck=0;const s=S2.pend;S2.pend=null;if(s){S2.view=2;S2.vx=S2.vy=0;s.act();}}
    else{const k=Math.min(sp,d*6)/d;tx=dx*k;ty=dy*k;}}
  const e=1-Math.exp(-dt*12);S2.vx=lerp(S2.vx,tx,e);S2.vy=lerp(S2.vy,ty,e);
  const nx=S2.x+S2.vx*dt,ny=S2.y+S2.vy*dt,ox=S2.x,oy=S2.y;
  if(s2Walk(nx,ny)){S2.x=nx;S2.y=ny;}else if(s2Walk(nx,S2.y)){S2.x=nx;S2.vy*=.5;}else if(s2Walk(S2.x,ny)){S2.y=ny;S2.vx*=.5;}else{S2.vx*=.3;S2.vy*=.3;}
  const moved=Math.hypot(S2.x-ox,S2.y-oy);if(S2.tgt&&moved<spW*dt*.05)S2.stuck+=dt;else S2.stuck=0;
  const spd=moved/Math.max(dt,1e-4);S2.spd=spd/spW;P.moving=S2.spd*3.1;
  if(spd>spW*.12){const ax=Math.abs(S2.vx),ay=Math.abs(S2.vy)/.78;
    if(S2.view===1?ax>ay*.6:ax>ay*1.25){S2.view=1;S2.flip=S2.vx<0?-1:1;}else S2.view=S2.vy<0?2:0;}
  S2.ph+=dt*7.3*Math.min(2,S2.spd);S2.step+=dt*S2.spd;if(S2.step>.34){S2.step=0;SND.step('wood');}
  const Q=S2.pet;if(PETOBJ&&PETOBJ.spr){const side=S2.view===1?-S2.flip:(Q.x<S2.x?-1:1);const gx=S2.x+side*H*.42,gy=S2.y-8;
    const dx=gx-Q.x,dy=gy-Q.y,d=Math.hypot(dx,dy),busy=PETOBJ.trick||PETOBJ.anim;
    if(!busy&&(d>H*.5||(Q.mv&&d>H*.12))){const ps=Math.max(spd*1.05,H*1.2),st=Math.min(ps*dt,d);let px=Q.x+dx/d*st,py=Q.y+dy/d*st;
      if(!s2Walk(px,py)){if(s2Walk(px,Q.y))py=Q.y;else if(s2Walk(Q.x,py))px=Q.x;else{px=Q.x;py=Q.y;}}Q.x=px;Q.y=py;Q.mv=true;Q.idle=0;if(Math.abs(dx)>4)Q.flip=dx<0?-1:1;Q.ph+=dt*10;}
    else{Q.mv=false;Q.idle+=dt;}
    if(Q.wag>0)Q.wag-=dt;else if(!Q.mv&&Q.idle>2&&Q.idle<7&&Math.random()<dt*.25)Q.wag=1.2;}}
function s2Nearest(){let best=null,bd=1e9;const H=s2H(S2.y);
  for(const s of s2Spots()){const d=Math.hypot(s.def[1]-S2.x,(s.def[2]-S2.y)*1.2);const r=s.def[0]==='回家'||s.def[0]==='剪票口'?H*.5:H*.34;if(d<r&&d<bd){bd=d;best=s;}}
  S2.near=best;return best?{label:best.label,act:best.act}:null;}
// draw a rectangular canvas into a (perspective) quad [tl,tr,br,bl] using two affine triangles
function s2Quad(g,src,q){const w=src.width,h=src.height;
  const tri=(s0,s1,s2_,d0,d1,d2)=>{g.save();g.beginPath();g.moveTo(d0[0],d0[1]);g.lineTo(d1[0],d1[1]);g.lineTo(d2[0],d2[1]);g.closePath();g.clip();
    const [x0,y0]=s0,[x1,y1]=s1,[x2,y2]=s2_,den=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    const a=((d1[0]-d0[0])*(y2-y0)-(d2[0]-d0[0])*(y1-y0))/den,b=((d1[1]-d0[1])*(y2-y0)-(d2[1]-d0[1])*(y1-y0))/den,
      c=((d2[0]-d0[0])*(x1-x0)-(d1[0]-d0[0])*(x2-x0))/den,d=((d2[1]-d0[1])*(x1-x0)-(d1[1]-d0[1])*(x2-x0))/den;
    g.transform(a,b,c,d,d0[0]-a*x0-c*y0,d0[1]-b*x0-d*y0);g.drawImage(src,0,0);g.restore();};
  // slight overlap along the diagonal hides the seam
  const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,grow=p=>[p[0]+(p[0]-cx)*.004,p[1]+(p[1]-cy)*.004];
  tri([0,0],[w,0],[w,h],grow(q[0]),grow(q[1]),grow(q[2]));tri([0,0],[w,h],[0,h],grow(q[0]),grow(q[2]),grow(q[3]));}
function s2SlotCanvas(k){const now=Math.floor(Date.now()/60000),key=k+':'+now+':'+(TS()?1:0);if(S2.slotC[k]&&S2.slotC[k].key===key)return S2.slotC[k].c;
  const [c,x]=C2(300,320);x.textAlign='center';x.textBaseline='middle';
  if(k==='timetable_left'){x.fillStyle='#f7f3ea';x.fillRect(0,0,300,320);x.fillStyle='#2f6b56';x.fillRect(0,0,300,62);x.fillStyle='#fff';x.font=`800 30px ${FG}`;x.fillText('時刻表',150,24);x.font=`600 17px ${FG}`;x.fillText('汐見町方面',150,49);
    const rows=[['07','05　35'],['08','05　40'],['09','10'],['10','10'],['12','10'],['13','15　45'],['15','10　40'],['16','10　40'],['17','10'],['18','20']];
    x.textAlign='left';rows.forEach((r,i)=>{const y=82+i*22;x.fillStyle=i%2?'#efe8da':'#f7f3ea';x.fillRect(8,y-11,284,22);x.fillStyle='#3a2a20';x.font=`800 18px ${FG}`;x.fillText(r[0],22,y+1);x.font=`500 17px ${FG}`;x.fillText(r[1],72,y+1);});
    x.textAlign='center';x.fillStyle='#8a6a4a';x.font=`600 16px ${FG}`;x.fillText('每班 10 分鐘就到汐見町',150,305);}
  else if(k==='timetable_right'){x.fillStyle='#15171c';x.fillRect(0,0,300,320);x.fillStyle='#f2c14e';x.font=`800 26px ${FG}`;x.fillText('發車 Departures',150,32);x.fillStyle='rgba(255,255,255,.14)';x.fillRect(12,58,276,2);
    x.textAlign='left';DESTS().forEach((d,i)=>{const y=92+i*52;x.fillStyle=d.open?'#e8f0ff':'#7a808c';x.font=`700 24px ${FG}`;x.fillText(`${d.ic} ${d.name.replace(/（.*?）/,'')}`,16,y);x.textAlign='right';x.font=`700 18px ${FG}`;x.fillStyle=d.open?'#7fe0a0':'#e0a060';x.fillText(d.open?'搭乘中':'施工中',288,y+22);x.textAlign='left';});}
  else if(k==='class_noticeboard'){x.clearRect(0,0,300,320);x.fillStyle='#b8452f';x.fillRect(40,8,220,40);x.fillStyle='#fff3dd';x.font=`800 24px ${FG}`;x.fillText('班級公告',150,29);
    const news=newsList().slice(0,4);const notes=[['#f7f2e8',22,66,124,108,-.05],['#ffe9a8',154,62,124,112,.04],['#d9e8f7',40,188,118,110,.03],['#f7f2e8',166,190,110,104,-.04]];
    notes.forEach(([cl,nx,ny,w,h,r],i)=>{x.save();x.translate(nx+w/2,ny+h/2);x.rotate(r);x.fillStyle='rgba(60,40,20,.25)';x.fillRect(-w/2+3,-h/2+4,w,h);x.fillStyle=cl;x.fillRect(-w/2,-h/2,w,h);
      x.fillStyle='#c8432b';x.beginPath();x.arc(0,-h/2+8,6,0,7);x.fill();const n=news[i];
      if(n&&(n.title||n.body)){x.fillStyle='#3a2a20';x.font=`800 17px ${FG}`;x.textAlign='center';const t=String(n.title||n.body).slice(0,14);x.fillText(t.slice(0,7),0,-h/2+34);if(t.length>7)x.fillText(t.slice(7),0,-h/2+56);}
      x.fillStyle='rgba(60,50,40,.45)';for(let j=0;j<3;j++)x.fillRect(-w/2+14,-h/2+(n?68:28)+j*14,w-28,4);x.restore();});}
  S2.slotC[k]={key,c};return c;}
function s2Slots(g){const D=SROOM[S2.sk];Object.entries(D.slots||{}).forEach(([k,q])=>{const c=s2SlotCanvas(k);g.save();if(k!=='class_noticeboard'){g.globalAlpha=.97;}s2Quad(g,c,q);g.restore();});}
function s2Sprite(g,c,x,y,H,f,flip){const M=c.meta,im=c.mat.map.image;const dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;
  g.save();g.translate(x,y);g.fillStyle='rgba(40,20,10,.28)';g.beginPath();g.ellipse(0,0,dw*.26,dw*.07,0,0,7);g.fill();g.scale(flip||1,1);g.drawImage(im,f*M.cw,0,M.cw,M.ch,-dw/2,-dh+3/M.ch*dh,dw,dh);g.restore();}
function s2Human(g){const c=SPR.c,M=c.meta;const v=S2.view,moving=S2.spd>.15;const list=v===0?M.fw:v===1?M.sw:M.bw;let f=v;
  if(moving&&list&&list.length===4)f=list[Math.floor(((S2.ph*1.3/(PI*2))%1+1)%1*4)];s2Sprite(g,c,S2.x,S2.y,s2H(S2.y),f,v===1?S2.flip:1);}
function s2Pet(g){const o=PETOBJ;if(!o||!o.spr||!o.spr.ready||!o.spr.mat.map)return;const c=o.spr,A_=c.meta.act||{},Q=S2.pet;let f=0,flip=1;
  if(o.trick||o.anim){f=c.frame;flip=Math.sign(c.m.scale.x)||1;}else if(Q.mv){f=A_.run_1!=null?A_['run_'+(Math.floor(Q.ph%4)+1)]:(Math.sin(Q.ph)>0?1:2);flip=Q.flip;}
  else if(Q.idle>16&&A_.sleep!=null)f=A_.sleep;else if(Q.idle>8&&A_.lie!=null)f=A_.lie;else if(Q.wag>0&&A_.wag_A!=null)f=Math.floor(Q.wag*6)%2?A_.wag_B:A_.wag_A;
  s2Sprite(g,c,Q.x,Q.y,s2H(Q.y)*.42,f,flip);}
function s2Master(g){const n=NPC_SPR.find(n=>Math.abs(n.pos.x-STX)<8&&Math.abs(n.pos.z-STZ)<6);if(!n||!n.c.ready||!n.c.mat.map)return;
  const cx=S2.sk==='portrait'?540:960,fy=S2.sk==='portrait'?760:600;s2Sprite(g,n.c,cx,fy,s2H(S2.sk==='portrait'?800:655)*.98,0,1);}
function s2Door(g){if(!TS())return;const [dx,dy]=S2CFG[S2.sk].door,H=s2H(dy)*1.25,im=S2.img.door_closed;if(!im||!im.complete)return;const w=H*im.width/im.height;
  g.save();g.fillStyle='rgba(40,20,10,.25)';g.beginPath();g.ellipse(dx,dy,w*.5,w*.08,0,0,7);g.fill();g.globalAlpha=.35+.2*Math.sin(S2.t*2);g.fillStyle='#ffe7a8';g.beginPath();g.ellipse(dx,dy-H*.5,w*.7,H*.62,0,0,7);g.fill();g.restore();
  g.drawImage(im,dx-w/2,dy-H,w,H);}
function s2Draw(dt){S2.t+=dt;const cv=S2.cv,g=S2.g;const dpr=Math.min(2,devicePixelRatio||1);const cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);
  if(!cw||!ch)return;if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
  const sk=r2Scene();if(sk!==S2.sk)s2Swap(sk);const D=SROOM[S2.sk],C=S2CFG[S2.sk],Wi=D.w,Hi=D.h;
  const s=Math.max(cw/Wi,ch/Hi)*C.zoom,vw=cw/s,vh=ch/s;
  const wantX=clamp(S2.x-vw/2,0,Wi-vw),wantY=clamp(S2.y-s2H(S2.y)*.5-vh/2,0,Hi-vh);
  if(S2.cx==null){S2.cx=wantX;S2.cy=wantY;}else{const e=1-Math.exp(-dt*4);S2.cx=lerp(S2.cx,wantX,e);S2.cy=lerp(S2.cy,wantY,e);}
  S2.view_={s:s/dpr,ox:S2.cx,oy:S2.cy};
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#2a1a10';g.fillRect(0,0,cw,ch);g.setTransform(s,0,0,s,-S2.cx*s,-S2.cy*s);g.imageSmoothingQuality='high';
  const bg=S2.img[S2.sk+'_bg'];if(bg&&bg.complete)g.drawImage(bg,0,0,Wi,Hi);
  s2Slots(g);s2Master(g);
  const L=[];D.occ.forEach(o=>{const ln=C.lines[o.id];L.push([ln?r2Sort({line:ln,sort:o.sort},S2.x):o.sort,()=>{const im=S2.img[o.file];if(im&&im.complete)g.drawImage(im,o.x,o.y);}]);});
  if(TS())L.push([C.door[1],()=>s2Door(g)]);
  L.push([S2.y,()=>s2Human(g)]);if(PETOBJ)L.push([S2.pet.y,()=>s2Pet(g)]);L.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
  const nt=S.night||0;if(nt>.02){g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(120,110,170,${nt*.3})`;g.fillRect(0,0,Wi,Hi);g.restore();}
  const n=S2.near;if(n&&!DLG.open){const h=n.def[3],mx=h[0]+h[2]/2,my=Math.max(S2.cy+30,h[1]-8)+Math.sin(S2.t*4)*6,sz=s2H(S2.y)*.07;
    g.save();g.fillStyle='#fff';g.strokeStyle='rgba(60,30,10,.6)';g.lineWidth=sz*.18;g.beginPath();g.moveTo(mx-sz,my-sz*1.3);g.lineTo(mx+sz,my-sz*1.3);g.lineTo(mx,my);g.closePath();g.stroke();g.fill();g.restore();}}

/* ================================================================
   任意門 (teacher only): pick a place, the door opens, warm light, you're there
   ================================================================ */
function warpTown(x,z,yaw,y){const gy=y!=null?y:groundH(x,z);P.sit=null;P.pos.set(x,gy,z);P.vel.set(0,0,0);P.yaw=yaw;cam.yaw=yaw+PI;cam.pitch=.22;
  cam.pos.set(x-Math.sin(yaw)*5,gy+3,z-Math.cos(yaw)*5);cam.look.set(x,gy+1.4,z);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(x+1,gy,z+.6);PETOBJ.by=gy;}}
function portalReset(){if(DLG.open)closeDlg();closeShop();closeBag();try{closeCabin();}catch(e){}try{closeDecor();}catch(e){}r2Off();s2Off();
  if(MZ_IN){MZ_IN=false;$('mzMap').hidden=true;LANTERN.intensity=0;sky.visible=true;scene.background=null;}
  CH_IN=ISL_IN=TC_IN=CY_IN=HOME_IN=false;if(ST_IN)leaveStation();INDOOR=false;$('homeBar').hidden=true;P.sit=null;MART.basket=[];if(typeof updateBasket==='function')updateBasket();}
const PORTAL={
  station:()=>enterStation({now:true}),
  shopping_street:()=>warpTown(0,8,PI),
  convenience_store:()=>enterMart(),
  shrine:()=>warpTown(-50,70,0),
  challenge_hall:()=>enterHall(),
  beach:()=>warpTown(24,-49,PI),
  lighthouse:()=>warpTown(75,-99.6,PI),
  mystery_island:()=>islandGo(),
  waterfall:()=>warpTown(FALL.x,FALL.z-3.6,PI,4),
  waterfall_maze:()=>enterMaze(),
  teacher_cabin:()=>enterCabinDirect(),
  student_home:null};
(function(){const d=document.createElement('div');d.id='portal';d.hidden=true;d.innerHTML=`<div class="sh-in"><div class="sh-hd"><b>🚪 任意門</b><span class="sh-coin">老師專用</span><button type="button" class="sh-x" aria-label="關閉">✕</button></div>
  <p class="pt-help">想去哪裡？點一下，門打開就到了。</p><div class="pt-grid"></div></div>`;document.body.appendChild(d);d.querySelector('.sh-x').onclick=closePortal;d.addEventListener('keydown',e=>e.stopPropagation());
  const fx=document.createElement('div');fx.id='portalFx';fx.hidden=true;fx.innerHTML='<div class="pf-bg"></div><img class="pf-door" alt=""><img class="pf-glow" alt="">';document.body.appendChild(fx);})();
function openPortal(){if(!TS()||!SROOM)return;if(DLG.open)closeDlg();const d=$('portal'),G_=d.querySelector('.pt-grid');G_.innerHTML='';
  SROOM.icons.forEach(([id,nm])=>{const im=S2.img['ic_'+id];const b=el('button',{type:'button',class:'pt-it',html:`<img alt="" src="${im?im.src:''}"><b>${id==='student_home'?'學生的家（留言板）':nm}</b>`});
    b.onclick=()=>{closePortal();if(id==='student_home'){teacherHomeBoard();return;}portalGo(id,nm);};G_.appendChild(b);});
  d.hidden=false;SND.pick&&SND.pick();}
function closePortal(){if($('portal').hidden)return;$('portal').hidden=true;cv.focus({preventScroll:true});}
function portalGo(id,nm){const go=PORTAL[id];if(!go)return;const fx=$('portalFx'),door=fx.querySelector('.pf-door'),glow=fx.querySelector('.pf-glow');
  door.src=S2.img.door_closed.src;glow.src=S2.img.glow.src;fx.className='';fx.hidden=false;void fx.offsetWidth;fx.classList.add('in');
  SND.pick&&SND.pick();
  setTimeout(()=>{door.src=S2.img.door_open.src;fx.classList.add('open');cutSnd&&cutSnd(t=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.07,.5,'sine',.05,A.sfx)));},520);
  setTimeout(()=>{fx.classList.add('glow');},820);
  setTimeout(()=>{portalReset();try{go();}catch(e){console.error(e);}},1500);
  setTimeout(()=>{fx.classList.add('out');},2150);
  setTimeout(()=>{fx.hidden=true;fx.className='';toast(`🚪 任意門：到了「${nm}」`);},2900);}
