/* ================================================================
   Student room: 2D painted room (ChatGPT illustration) drawn over the existing 3D room logic
   ================================================================ */
const HROOM=(()=>{try{return JSON.parse(document.getElementById('hroom').textContent);}catch(e){return null;}})();
const H2={sk:null,img:{},loaded:false,cv:null,g:null,view:{s:1,ox:0,oy:0},cx:null,cy:null,t:0,rects:[],shown:false};
const H2H={landscape:[[270.8541,-120.2804,962.8708],[0,11.155686,694.92843],[0,-.12491854,1]],portrait:[[146.51163,-38.294495,544.02128],[0,7.6617024,738.24814],[0,-.070391538,1]]};
const H2MAP={landscape:{ax:1,az:.9},portrait:{ax:.62,az:1.95}};
const H2FIX={landscape:{win:[656,0,579,346],board:[1303,69,268,178]},portrait:{win:[310,123,435,317],board:[759,198,187,172]}};
const WALL_ID={cream:'ivory',dots:'pink_dots',stripe:'blue_stripes',check:'green_checks',sunset:'sunset_orange',wood:'wood',star:'starry'};
const FLOOR_ID={wood:'natural_wood',dark:'dark_wood',tile:'white_tiles',carpet:'blue_carpet',tatami:'tatami'};
const FURN_SPR={rug:'01_round_rug',plant:'02_large_plant',beanbag:'03_armchair',table:'04_low_table',lamp:'05_floor_lamp',fish:'06_goldfish_bowl',maneki:'07_lucky_cat',teddy:'08_teddy_bear',books:'09_comic_stack',piano:'10_upright_piano',scope:'11_telescope',shell:'12_shell_lamp',crystal:'13_crystal_lamp',petbed:'14_pet_bed',poster:'15_town_poster',clock:'16_wall_clock',lights:'17_star_lights',shelf:'18_wall_bookshelf'};
// the new pet bed from the furniture pack
FURN.splice(FURN.findIndex(f=>f.rare),0,{k:'petbed',name:'寵物窩',price:40,type:'floor',fp:[.6,.5],build:g=>{mk(cy(.32,.3,.12,18),imat('#e9dcc6',.35),0,.06,0,g);mk(cy(.24,.24,.05,18),imat('#f6efe2',.45),0,.12,0,g,false);}});FURN_BY.petbed=FURN.find(f=>f.k==='petbed');
// align the pet's sleeping spot with the painted pet bed
PETBED.x=-2.4;PETBED.z=2.1;
function h2Img(name){if(!HROOM)return null;let i=H2.img[name];if(!i){const src=HROOM.img&&HROOM.img[name];if(!src)return null;i=new Image();i.src=src;H2.img[name]=i;}return i.complete&&i.naturalWidth?i:null;}
function h2Scene(){return innerWidth>=innerHeight?'landscape':'portrait';}
function h2Model(sk,x,z){const m=H2MAP[sk];return [x*m.ax,-3+(z+3)*m.az];}
function h2Proj(sk,xm,zm){const H=H2H[sk];const w=H[2][0]*xm+H[2][1]*zm+H[2][2];return [(H[0][0]*xm+H[0][1]*zm+H[0][2])/w,(H[1][0]*xm+H[1][1]*zm+H[1][2])/w];}
function h2Scale(sk,zm){const a=h2Proj(sk,-.5,zm),b=h2Proj(sk,.5,zm);return b[0]-a[0];}
function h2Pt(sk,x,y,z){const [xm,zm]=h2Model(sk,x,z);const [X,Y]=h2Proj(sk,xm,zm);const s=h2Scale(sk,zm);return [X,Y-y*s,s];}
function h2Inv(sk,X,Y){const H=H2H[sk];const a=H[0][0],b=H[0][1],c=H[0][2],e=H[1][1],f=H[1][2],h=H[2][1];
  // w = h*zm + 1 ; Y*w = e*zm + f  ->  zm = (f - Y)/(Y*h - e)
  const zm=(f-Y)/(Y*h-e),w=h*zm+1,xm=(X*w-b*zm-c)/a;const m=H2MAP[sk];return [xm/m.ax,(zm+3)/m.az-3,zm];}
function h2Active(){return !!(HROOM&&HOME_IN&&!CUTON&&started&&SPR.c&&SPR.c.ready&&h2Img(h2Scene()+'_bg'));}
{const c=document.createElement('canvas');c.id='home2d';c.hidden=true;c.tabIndex=-1;$('stage').appendChild(c);H2.cv=c;H2.g=c.getContext('2d');
  c.addEventListener('pointerdown',e=>{H2.pd={x:e.clientX,y:e.clientY};});
  c.addEventListener('pointerup',e=>{const d=H2.pd;H2.pd=null;if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)return;const r=c.getBoundingClientRect(),V=H2.view;
    const X=V.ox+(e.clientX-r.left)/V.s,Y=V.oy+(e.clientY-r.top)/V.s;if(HOME.edit)h2Click(X,Y);});}
function h2Hide(){if(H2.shown){H2.cv.hidden=true;H2.shown=false;}}
// pick in the painted room while decorating
function h2Click(X,Y){const H=homeState(),sk=H2.sk;
  if(!HOME.pending){const hit=H2.rects.slice().reverse().find(r=>X>=r.r[0]&&X<=r.r[0]+r.r[2]&&Y>=r.r[1]&&Y<=r.r[1]+r.r[3]);HOME.sel=hit?hit.it:null;if(hit&&A.ready)SND.pick&&SND.pick();renderDecor();return;}
  const f=FURN_BY[HOME.pending.k];const back=h2Pt(sk,0,0,-3);let d;
  if(f.type==='wall'){if(Y>back[1]-10){toast('這個要掛在牆上喔');return;}const fx=H2FIX[sk];const inR=(r,p)=>X>r[0]-p&&X<r[0]+r[2]+p&&Y>r[1]-p&&Y<r[1]+r[3]+p;
    if(inR(fx.win,20)){toast('這裡是窗戶，換個地方掛吧');return;}if(inR(fx.board,30)){toast('這裡是集章板，換個地方吧');return;}
    const u=(X-back[0])/back[2]/H2MAP[sk].ax,y=(back[1]-Y)/back[2];d={k:f.k,wall:'wb',u:Math.round(clamp(u,-3.1,3.1)*4)/4,y:Math.round(clamp(y,.9,2.6)*4)/4};}
  else{if(Y<back[1]){toast('這個要放在地板上喔');return;}const [cx,cz]=h2Inv(sk,X,Y);const x=Math.round(clamp(cx,-3.1,3.1)*4)/4,z=Math.round(clamp(cz,-2.7,2.7)*4)/4;const fp=f.fp||[.3,.3];
    if(HOME_BLOCK.some(([a,b,c,dd])=>x+fp[0]/2>a&&x-fp[0]/2<b&&z+fp[1]/2>c&&z-fp[1]/2<dd)&&f.k!=='rug'){toast('這裡有東西了，換個地方吧');return;}
    d={k:f.k,x,z,r:HOME.pending.it?HOME.pending.it.d.r||0:0};}
  if(HOME.pending.it){const it=HOME.pending.it;Object.keys(it.d).forEach(k=>delete it.d[k]);Object.assign(it.d,d);placeItemGroup(it.g,it.d);HOME.sel=it;}
  else{H.items.push(d);HOME.sel=spawnItem(d);}
  HOME.pending=null;rebuildHomeCols();save();SND.pick&&A.ready&&SND.pick();renderDecor();}
function h2Sprite(g,c,x,y,z,sk){if(!c||!c.ready||!c.mat.map)return null;const M=c.meta,im=c.mat.map.image;const [X,Y,s]=h2Pt(sk,x,y,z);const PH=c.m.geometry.parameters.height;
  const dh=PH*s,dw=dh*M.cw/M.ch,fl=Math.sign(c.m.scale.x)||1,rz=c.pivot?c.pivot.rotation.z:0;
  g.save();g.translate(X,Y);g.fillStyle='rgba(40,20,10,.22)';g.beginPath();g.ellipse(0,0,dw*.24,dw*.065,0,0,7);g.fill();
  if(rz){g.translate(0,-dh*.3);g.rotate(-rz);g.translate(0,dh*.3);}g.scale(fl,1);g.drawImage(im,c.frame*M.cw,0,M.cw,M.ch,-dw/2,-dh+3/M.ch*dh,dw,dh);g.restore();return [X-dw/2,Y-dh,dw,dh];}
function h2Furn(g,it,sk,night){const id=FURN_SPR[it.d.k],f=id&&HROOM.furn[id];const im=f&&h2Img('f_'+id);if(!im)return;const d=it.d;let X,Y,s,ax,ay;
  if(d.wall){if(d.wall==='wf')return;const x=d.wall==='wb'?d.u:d.wall==='wl'?-3.45:3.45,z=d.wall==='wb'?-3:d.u;[X,Y,s]=h2Pt(sk,x,d.y||1.75,z);const wa=f.wa||[256,256];ax=wa[0];ay=wa[1];}
  else{[X,Y,s]=h2Pt(sk,d.x,0,d.z);ax=256;ay=512;}
  const k=s/256,fl=!d.wall&&(d.r||0)%2?-1:1,bb=f.bb;
  g.save();g.translate(X,Y);g.scale(fl,1);
  if(f.gbb){const gi=h2Img('g_'+id);if(gi){g.globalAlpha=.55+.45*night;g.drawImage(gi,(f.gbb[0]-ax)*k,(f.gbb[1]-ay)*k,(f.gbb[2]-f.gbb[0])*k,(f.gbb[3]-f.gbb[1])*k);g.globalAlpha=1;}}
  if(!d.wall&&it.d.k!=='rug'){g.fillStyle='rgba(40,20,10,.18)';g.beginPath();g.ellipse(0,-2*k,(bb[2]-bb[0])*k*.42,(bb[2]-bb[0])*k*.08,0,0,7);g.fill();}
  g.drawImage(im,(bb[0]-ax)*k,(bb[1]-ay)*k,(bb[2]-bb[0])*k,(bb[3]-bb[1])*k);g.restore();
  const rx=fl<0?X-(bb[2]-ax)*k:X+(bb[0]-ax)*k;H2.rects.push({it,r:[rx,Y+(bb[1]-ay)*k,(bb[2]-bb[0])*k,(bb[3]-bb[1])*k]});}
function h2Draw(dt){H2.t+=dt;const cv=H2.cv,g=H2.g;if(!H2.shown){cv.hidden=false;H2.shown=true;H2.cx=null;}
  const dpr=Math.min(2,devicePixelRatio||1),cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);if(!cw||!ch)return;if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
  const sk=h2Scene();if(sk!==H2.sk){H2.sk=sk;H2.cx=null;}const S_=HROOM.scenes[sk],Wi=S_.w,Hi=S_.h,H=homeState();
  // keep the player inside the painted view
  {const lx=P.pos.x-HX,lz=P.pos.z-HZ;const [X]=h2Pt(sk,lx,0,lz);const m=90;if(X<m||X>Wi-m){const s=h2Pt(sk,0,0,lz)[2];const nx=((X<m?m:Wi-m)-h2Pt(sk,0,0,lz)[0])/s/H2MAP[sk].ax;P.pos.x=HX+nx;}}
  // view: cover + follow, or contain beside the decorating panel
  let s,ox,oy;const ed=HOME.edit&&!$('decor').hidden;
  if(ed){const port=sk==='portrait',aw=port?cw:cw*.64,ah=port?ch*.58:ch;s=Math.min(aw/Wi,ah/Hi);ox=-(aw-Wi*s)/2/s;oy=-(ah-Hi*s)/2/s;H2.cx=null;}
  else{s=Math.max(cw/Wi,ch/Hi);const vw=cw/s,vh=ch/s;const [PX,PY]=h2Pt(sk,P.pos.x-HX,0,P.pos.z-HZ);const wx=clamp(PX-vw/2,0,Wi-vw),wy=clamp(PY-vh*.62,0,Hi-vh);
    if(H2.cx==null){H2.cx=wx;H2.cy=wy;}else{const e=1-Math.exp(-dt*5);H2.cx=lerp(H2.cx,wx,e);H2.cy=lerp(H2.cy,wy,e);}ox=H2.cx;oy=H2.cy;}
  H2.view={s:s/dpr,ox,oy};g.setTransform(1,0,0,1,0,0);g.fillStyle='#2a1a14';g.fillRect(0,0,cw,ch);g.setTransform(s,0,0,s,-ox*s,-oy*s);g.imageSmoothingQuality='high';
  const bg=h2Img(sk+'_bg');if(bg)g.drawImage(bg,0,0);
  const wid=WALL_ID[H.wall]||'ivory',fid=FLOOR_ID[H.floor]||'natural_wood';
  const wl=h2Img(`${sk}_wall_${wid}`);if(wl&&wid!=='ivory'){const o=S_.wall[wid];g.drawImage(wl,o[0],o[1]);}
  const fl=h2Img(`${sk}_floor_${fid}`);if(fl&&fid!=='natural_wood'){const o=S_.floor[fid];g.drawImage(fl,o[0],o[1]);}
  const night=S.night||0;
  // window at night
  if(night>.02){const w=H2FIX[sk].win;g.save();g.globalAlpha=night*.72;g.fillStyle='#17214a';g.fillRect(w[0]+w[2]*.07,w[1]+w[3]*.08,w[2]*.86,w[3]*.8);g.globalAlpha=night;g.fillStyle='#fff6d0';for(let i=0;i<12;i++)g.fillRect(w[0]+w[2]*(.1+((i*37)%80)/100),w[1]+w[3]*(.12+((i*23)%40)/100),2.4,2.4);g.restore();}
  // stamp board
  {const r=S_.slot,b=HOME.boardCanvas;if(r&&b){const k=Math.min(r[2]/b.width,r[3]/b.height),w=b.width*k,h=b.height*k;g.drawImage(b,r[0]+(r[2]-w)/2,r[1]+(r[3]-h)/2,w,h);}}
  H2.rects=[];
  // wall items, rugs, then depth-sorted floor items + actors + fixed-furniture fronts
  HOME.items.filter(it=>it.d.wall).forEach(it=>h2Furn(g,it,sk,night));
  HOME.items.filter(it=>!it.d.wall&&it.d.k==='rug').forEach(it=>h2Furn(g,it,sk,night));
  const L=[];HOME.items.filter(it=>!it.d.wall&&it.d.k!=='rug').forEach(it=>{const [,Y]=h2Pt(sk,it.d.x,0,it.d.z);L.push([Y,()=>h2Furn(g,it,sk,night)]);});
  S_.occ.forEach(o=>{const im=h2Img(`${sk}_occ_${o.id}`);if(im)L.push([o.sort,()=>g.drawImage(im,o.x,o.y)]);});
  const pp=pl.g.position;L.push([h2Pt(sk,pp.x-HX,0,pp.z-HZ)[1]+.1,()=>{H2.me=h2Sprite(g,SPR.c,pp.x-HX,P.sit?Math.max(0,pp.y-.28):0,pp.z-HZ,sk);}]);
  if(PETOBJ&&PETOBJ.spr&&PETOBJ.g.visible){const q=PETOBJ.g.position;L.push([h2Pt(sk,q.x-HX,0,q.z-HZ)[1],()=>h2Sprite(g,PETOBJ.spr,q.x-HX,Math.max(0,q.y),q.z-HZ,sk)]);}
  L.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
  if(night>.02){g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(110,100,160,${night*.32})`;g.fillRect(0,0,Wi,Hi);g.restore();}
  // selection marker while decorating
  if(HOME.edit&&HOME.sel){const r=H2.rects.find(x=>x.it===HOME.sel);if(r){g.save();g.strokeStyle='#f2c14e';g.lineWidth=4/s*dpr;g.setLineDash([12,8]);g.strokeRect(r.r[0]-6,r.r[1]-6,r.r[2]+12,r.r[3]+12);g.restore();}}}
// catalogue pictures from the painted furniture
furnPics=function(){if(FURN_PIC._done2)return;const ok=FURN.every(f=>!FURN_SPR[f.k]||h2Img('f_'+FURN_SPR[f.k]));if(!ok){setTimeout(()=>{if(!$('decor').hidden)renderDecor();},400);}
  FURN.forEach(f=>{const id=FURN_SPR[f.k],im=id&&h2Img('f_'+id);if(!im)return;const [c,g]=C2(160,128);const k=Math.min(140/im.width,108/im.height);g.drawImage(im,(160-im.width*k)/2,(128-im.height*k)/2+(f.type==='wall'?0:6),im.width*k,im.height*k);FURN_PIC[f.k]=c.toDataURL('image/png');});
  if(ok)FURN_PIC._done2=true;};
surfPic=function(isWall,id){const k='2'+(isWall?'w:':'f:')+id;if(FURN_PIC[k])return FURN_PIC[k];const nid=isWall?WALL_ID[id]:FLOOR_ID[id];if(!nid)return '';
  const def=isWall?'ivory':'natural_wood';const base=h2Img('landscape_bg'),lay=nid===def?null:h2Img(`landscape_${isWall?'wall':'floor'}_${nid}`);if(!base||(nid!==def&&!lay))return '';
  const [c,g]=C2(160,96);const src=isWall?[300,90,300,180]:[640,640,420,252];g.drawImage(base,src[0],src[1],src[2],src[3],0,0,160,96);
  if(lay){const o=HROOM.scenes.landscape[isWall?'wall':'floor'][nid];g.drawImage(lay,src[0]-o[0],src[1]-o[1],src[2],src[3],0,0,160,96);}return FURN_PIC[k]=c.toDataURL('image/png');};

function h2Preload(){if(!HROOM||H2.pre)return;H2.pre=true;for(const k in HROOM.img)h2Img(k);}setTimeout(h2Preload,4000);
