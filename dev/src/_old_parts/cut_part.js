/* ================================================================
   Opening cutscene (in-engine): 燈塔熄滅的那一夜
   ================================================================ */
var CUTON=false;
const CUT={T:0,shot:-1,built:false,replay:false,snap:null,sub:'',rainT:0,windT:0,shake:0,flash:0,black:1,wait:false,ended:false,act:{},fx:{},save:{}};
const CUT_SUBJ=['國語','英文','自然','社會','音樂','健康'];
const CUT_COL=CUT_SUBJ.map(s=>subjStyle(s).c);
const PDX=300,PDZ=480; // 平等 platform set (cutscene only)
(function(){const d=document.createElement('div');d.id='cut';d.hidden=true;
  d.innerHTML=`<div class="ct-black"></div><div class="ct-flash"></div>
  <div class="ct-sub"><b class="ct-who"></b><span class="ct-txt"></span></div>
  <div class="ct-ticket"><div class="tk-in">
    <div class="tk-face tk-front"><div class="tk-top"><span>乘車券</span><small>特別列車</small></div>
      <div class="tk-route"><b>平等</b><i>→</i><b>汐見町</b></div>
      <div class="tk-row"><span>乘客</span><b class="tk-name"></b></div><div class="tk-row"><span>發車</span><b>今晚</b></div>
      <div class="tk-no">No. 000001　・　只限本人</div></div>
    <div class="tk-face tk-back"><p>汐見町需要你。</p><p class="tk-sig">——燈塔守護者</p></div></div></div>
  <div class="ct-mission"><div class="ms-k">任務</div><h2>找回 6 枚印章，<br>讓燈塔重新亮起來！</h2>
    <div class="ms-slots">${CUT_SUBJ.map((s,i)=>`<div class="ms-s" style="--c:${CUT_COL[i]}"><i>${s[0]}</i><span>${s}</span></div>`).join('')}</div>
    <div class="ms-hid"><b>？？？</b>隱藏任務：找出燈塔守護者</div>
    <button type="button" class="btn primary ms-go">出發！</button></div>
  <button type="button" class="ct-skip">跳過 ▸▸</button>`;
  document.body.appendChild(d);d.querySelector('.ct-skip').onclick=()=>cutEnd();d.querySelector('.ms-go').onclick=()=>cutEnd();})();

/* ---------- props (built on first play) ---------- */
function cutBuild(){if(CUT.built)return;CUT.built=true;const F=CUT.fx;
  // rain
  {const N=1300,pos=new Float32Array(N*6);F.rainO=[];for(let i=0;i<N;i++)F.rainO.push([rand()*44-22,rand()*28,rand()*44-22,.7+rand()*.6]);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
    F.rain=new T.LineSegments(g,new T.LineBasicMaterial({color:col('#a9c2dc'),transparent:true,opacity:.42,fog:true,depthWrite:false}));F.rain.frustumCulled=false;F.rain.visible=false;scene.add(F.rain);}
  // the big wave (bezier profile swept along x)
  {const su=56,sv=26,Wd=78,H=15,pos=[],cl=[],idx=[];const c0=col('#08202e'),c1=col('#2b7089'),c2=col('#eaf5f8');
    const prof=(s,hk)=>{const a=(1-s)*(1-s),b=2*(1-s)*s,c=s*s,cu=Math.max(0,(s-.8)/.2);return [a*-14+b*-3+c*8+cu*2.5,a*-4+b*H*1.4*hk+c*H*.6*hk-cu*cu*H*.25*hk];};
    F.waveProf=prof;F.waveH=H;
    for(let j=0;j<=sv;j++){const s=j/sv;for(let i=0;i<=su;i++){const u=i/su,hk=1-.4*Math.pow(2*u-1,2)+.07*Math.sin(u*17);const [z,y]=prof(s,hk);pos.push((u-.5)*Wd,y,z);
      const cc=s<.7?c0.clone().lerp(c1,s/.7):s<.87?c1.clone().lerp(c2,(s-.7)/.17):c2;cl.push(cc.r,cc.g,cc.b);}}
    for(let j=0;j<sv;j++)for(let i=0;i<su;i++){const a=j*(su+1)+i,b=a+1,c=a+su+1,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(cl,3));g.setIndex(idx);g.computeVertexNormals();
    F.wave=new T.Group();F.wave.visible=false;scene.add(F.wave);F.waveMat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,opacity:.97,fog:true});
    const wm=new T.Mesh(g,F.waveMat);wm.frustumCulled=false;F.wave.add(wm);
    F.foam=[];const fm=new T.SpriteMaterial({map:glowTex,color:col('#f4fbff'),transparent:true,opacity:.9,depthWrite:false,fog:true});
    for(let i=0;i<46;i++){const u=i/45,hk=1-.4*Math.pow(2*u-1,2);const [z,y]=prof(.9,hk);const s=new T.Sprite(fm);s.position.set((u-.5)*Wd*.96,y,z+.4);s.scale.setScalar(3+rand()*2.5);s.userData.b=s.position.clone();s.userData.p=rand()*6;F.wave.add(s);F.foam.push(s);}
    // glowing eyes inside the wave
    const [ez,ey]=prof(.56,1);F.eyes=[];
    [-1,1].forEach(sd=>{const m=new T.SpriteMaterial({map:glowTex,color:col('#bff8ff'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0,fog:false});
      const o=new T.Sprite(m);o.position.set(sd*3.6,ey-1.2,ez+1.4);F.wave.add(o);
      const cm=new T.SpriteMaterial({map:glowTex,color:col('#fff6c8'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0,fog:false});const c=new T.Sprite(cm);c.position.copy(o.position);c.position.z+=.1;F.wave.add(c);F.eyes.push([o,c]);});}
  // spray burst
  {F.spray=[];const m=new T.SpriteMaterial({map:glowTex,color:col('#eef6fa'),transparent:true,opacity:.85,depthWrite:false,fog:true});
    for(let i=0;i<70;i++){const s=new T.Sprite(m);s.visible=false;scene.add(s);F.spray.push({s,v:new T.Vector3()});}}
  // lighthouse beam + big lamp glow
  {const bm=new T.MeshBasicMaterial({color:col('#fff0c2'),transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:true});
    const bg=new T.ConeGeometry(5.5,70,20,1,true);bg.translate(0,-35,0);bg.rotateZ(PI/2);
    F.beam=new T.Group();F.beam.position.set(75,8.6,-104.5);F.beam.visible=false;scene.add(F.beam);F.beamMat=bm;F.beam.add(new T.Mesh(bg,bm));const b2=new T.Mesh(bg,bm);b2.rotation.y=PI;F.beam.add(b2);
    F.lampGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffd98a'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));F.lampGlow.position.set(75,8.6,-104.5);F.lampGlow.scale.setScalar(12);scene.add(F.lampGlow);}
  // six stamp orbs + trails
  F.orbs=CUT_COL.map((c,i)=>{const m=new T.SpriteMaterial({map:glowTex,color:col(c),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0,fog:false});
    const s=new T.Sprite(m);s.scale.setScalar(2.6);scene.add(s);const core=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffffff'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0,fog:false}));core.scale.setScalar(.9);scene.add(core);
    const tr=[];for(let k=0;k<7;k++){const t=new T.Sprite(m.clone());t.scale.setScalar(1.7-k*.2);scene.add(t);tr.push(t);}
    const a=-1.25+i*.5;return {s,core,tr,hist:[],to:new T.Vector3(75+Math.sin(a)*70,6+rand()*6,-40+Math.cos(a)*22+rand()*16),up:10+rand()*8};});
  // the ticket (3D, flies in through the window)
  {const [c,g]=C2(256,144);g.fillStyle='#fbf3df';g.fillRect(0,0,256,144);g.fillStyle='#c8432b';g.fillRect(0,0,256,30);g.fillStyle='#fff';g.font=`800 18px ${FG}`;g.textBaseline='middle';g.fillText('乘車券',12,16);
    g.fillStyle='#3a2a20';g.font=`800 30px ${FG}`;g.fillText('平等 → 汐見町',16,74);g.strokeStyle='#c8432b';g.setLineDash([6,5]);g.lineWidth=2;g.strokeRect(6,36,244,100);
    const m=new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide,toneMapped:false,transparent:true});F.ticket=new T.Group();F.ticket.visible=false;scene.add(F.ticket);
    mk(new T.PlaneGeometry(.34,.19),m,0,0,0,F.ticket,false);F.tkGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffe7a8'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:.9}));F.tkGlow.scale.setScalar(1.1);F.ticket.add(F.tkGlow);}
  // 平等 night platform set
  {const G=new T.Group();G.position.set(PDX,0,PDZ);G.visible=false;scene.add(G);F.pd=G;
    const gp=new T.PlaneGeometry(700,700);gp.rotateX(-PI/2);mk(gp,lam('#18231d'),0,-.02,0,G,false);
    mk(bx(120,.24,3.6),lam('#4a4640'),0,.12,-4,G,false);[-.72,.72].forEach(dz=>mk(bx(120,.1,.09),lam('#9aa0a6'),0,.3,-4+dz,G,false));
    for(let x=-60;x<=60;x+=1.1)mk(bx(.26,.07,2.3),lam('#3a2e26'),x,.25,-4,G,false);
    mk(bx(48,.9,3.4),lam('#8d8a82'),0,.45,-.6,G);mk(bx(48,.02,.2),lam('#e8c228'),0,.91,-1.75,G,false);mk(bx(48,.05,.12),lam('#dcd8cc'),0,.9,-2.28,G,false);
    // roof over middle of platform
    mk(bx(16,.12,3),lam('#40505a'),-2,3.5,-.2,G);[-9,-2,5].forEach(x=>mk(cy(.07,.07,2.6,8),lam('#2c3238'),x,2.2,.9,G));
    // mountains
    [[-95,-90,40,32],[-40,-120,55,46],[20,-100,38,30],[80,-130,60,50],[140,-95,40,34],[-150,-120,48,40],[40,-170,70,64]].forEach(([x,z,r,h])=>{const m=mk(new T.ConeGeometry(r,h,7),lam('#1a2a33'),x,h/2-2,z,G,false);m.rotation.y=rand()*3;});
    for(let i=0;i<30;i++)pineTreeAt(G,rr(-70,70),rr(-18,-9),rr(.8,1.3));
    // lamps (turn on one by one)
    F.pdLamps=[];[-18,-10,-2,6,14].forEach(x=>{mk(cy(.06,.08,3.2,8),lam('#2c3238'),x,2.5,.9,G);mk(bx(.5,.12,.3),lam('#2c3238'),x,4.1,.75,G,false);
      const gm=new T.SpriteMaterial({map:glowTex,color:col('#ffd9a0'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0});const s=new T.Sprite(gm);s.position.set(x,3.95,.75);s.scale.setScalar(3.2);G.add(s);
      const pm=new T.MeshBasicMaterial({map:poolTex,color:col('#ffd9a0'),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:0});const p=new T.Mesh(poolGeo,pm);p.scale.set(2.8,1,2.8);p.position.set(x,.93,.2);G.add(p);F.pdLamps.push([gm,pm]);});
    // station name board
    {const [c,g]=C2(512,160);g.fillStyle='#f6f4ee';g.fillRect(0,0,512,160);g.fillStyle='#2f6b56';g.fillRect(0,112,512,48);g.fillStyle='#1c1c1c';g.font=`800 70px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('平 等',256,52);
      g.font=`500 20px ${FG}`;g.fillText('Píngděng Station',256,95);g.fillStyle='#f6f4ee';g.font=`700 22px ${FG}`;g.textAlign='right';g.fillText('汐見町 →',496,137);
      const m=new T.MeshLambertMaterial({map:TX(c),emissive:0xffffff,emissiveMap:TX(c),emissiveIntensity:.35});mk(new T.PlaneGeometry(2.4,.75),m,-7,2.3,.9,G,false);[-8.1,-5.9].forEach(x=>mk(cy(.05,.05,1.9,6),lam('#2c3238'),x,1.85,.88,G));}
    // flip timetable
    {const [c,g]=C2(512,220);F.flipC=c;F.flipG=g;F.flipT=TX(c);mk(bx(2.3,1.05,.12),lam('#1a1a1e'),2.2,2.75,1.02,G,false);
      const m=new T.MeshBasicMaterial({map:F.flipT,toneMapped:false});mk(new T.PlaneGeometry(2.16,.93),m,2.2,2.75,.95,G,false).rotation.y=PI;
      [1.2,3.2].forEach(x=>mk(cy(.04,.04,.6,6),lam('#2c3238'),x,3.4,1.02,G,false));F.flipLast='';}
    // bench
    mk(bx(2.2,.08,.45),lam('#9a7652'),9,1.35,.6,G);mk(bx(2.2,.4,.06),lam('#9a7652'),9,1.6,.82,G);
    // the night train (a copy of the town's train)
    F.pdTrain=TRAIN.g.clone(true);F.pdTrain.position.set(150,0,-4);F.pdTrain.traverse(o=>{if(o.isSprite)o.visible=true;});G.add(F.pdTrain);}
  // signpost for the cat (汐見駅 platform)
  {const g=new T.Group();g.position.set(45.3,.9,-35.2);g.visible=false;scene.add(g);F.post=g;mk(cy(.07,.08,1.5,8),lam('#7a5a3a'),0,.75,0,g);
    const board=(txt,y,ry,colr)=>{const [c,x]=C2(256,64);x.fillStyle=colr;x.fillRect(0,0,256,64);x.fillStyle='#fff8e8';x.font=`800 30px ${FG}`;x.textAlign='center';x.textBaseline='middle';x.fillText(txt,128,34);
      const m=mk(new T.BoxGeometry(.95,.24,.05),[lam('#6a4a2e'),lam('#6a4a2e'),lam('#6a4a2e'),lam('#6a4a2e'),new T.MeshLambertMaterial({map:TX(c)}),new T.MeshLambertMaterial({map:TX(c)})],.3,y,0,g,false);m.rotation.y=ry;};
    board('神秘小島 →',1.32,.3,'#3f7d8a');board('瀑布 ↑',1.04,-.5,'#4f7d4a');board('？？？ ←',.76,.9,'#8a4a4a');mk(bx(.3,.06,.3),lam('#6a4a2e'),0,1.52,0,g,false);}
  // warm light in the cabin window (someone is home)
  {F.cabGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffcf88'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));const p=cyWorld(0,3.4);F.cabGlow.position.set(p.x,CY.y+2.2,p.z);F.cabGlow.scale.setScalar(4);scene.add(F.cabGlow);}
  // actors
  const A_=CUT.act;const mkA=(id,h)=>{if(!SPRITES[id])return null;const c=makeSpr(id,h);sprShow(c,false);return c;};
  A_.guard=mkA('guard',1.7);A_.grandpa=mkA('grandpa',1.6);A_.fisher=mkA('fisher',1.72);A_.cat=mkA('cat_tama',.5);}
function pineTreeAt(G,x,z,s){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);G.add(g);mk(cy(.12,.16,1.4,6),lam('#2e2218'),0,.7,0,g,false);
  [[1.3,1.8,1.6],[1,1.5,2.6],[.7,1.2,3.4]].forEach(([r,h,y])=>mk(new T.ConeGeometry(r,h,7),lam('#16271f'),0,y,0,g,false));}

/* ---------- helpers ---------- */
const cE=t=>t<0?0:t>1?1:t*t*(3-2*t);
const cL=(a,b,t)=>a+(b-a)*t;
function cutCamSet(p,l,fov=50){const port=camera.aspect<1;let sx=0,sy=0;if(CUT.shake>0){sx=(Math.random()-.5)*CUT.shake;sy=(Math.random()-.5)*CUT.shake;}
  camera.position.set(p[0]+sx,p[1]+sy,p[2]);camera.lookAt(l[0]+sx*.5,l[1]+sy*.5,l[2]);const f=port?Math.min(82,fov*1.45):fov;if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix();}camera.updateMatrixWorld();}
function cutCamLerp(t,A,B,fov){const k=cE(t);cutCamSet([cL(A[0],B[0],k),cL(A[1],B[1],k),cL(A[2],B[2],k)],[cL(A[3],B[3],k),cL(A[4],B[4],k),cL(A[5],B[5],k)],fov);}
function cutPlayer(show,x,y,z,yaw,walk){if(SPR.c)sprShow(SPR.c,show);else pl.g.visible=show;if(!show)return;P.pos.set(x,y,z);pl.g.position.set(x,y,z);pl.g.rotation.y=yaw;P.yaw=yaw;P.moving=walk?3.1:0;if(walk)P.ph+=walk;}
function cutHuman(c,show,x,y,z,yaw,walkPh){if(!c)return;sprShow(c,show);if(!show||!c.ready)return;sprPose(c,new T.Vector3(x,y,z),yaw,walkPh||0,walkPh?1:0,time);}
function cutCat(show,x,y,z,frame,flip){const c=CUT.act.cat;if(!c)return;sprShow(c,show);if(!show||!c.ready)return;camRel(c,new T.Vector3(x,y,z),0);sprFrame(c,frame);c.m.scale.set(flip||1,1,1);c.pivot.position.y=0;c.pivot.rotation.z=0;}
function cutEnv(kind){const s=S;
  if(kind==='storm'){blendState(PS.night,PS.night,1,s);s.fog.set(col('#0c1524'));s.fogNear=4;s.fogFar=150;s.clouds=1;s.cloudDark.set(col('#05070d'));s.cloudLit.set(col('#1c2436'));s.stars=0;s.disk=0;s.glow=.1;s.exposure=1.25;s.hemiI=.5;s.seaDeep.set(col('#02060c'));s.seaShallow.set(col('#0a1a28'));s.lamps=.25;s.windows=.5;}
  else if(kind==='night'){blendState(PS.night,PS.night,1,s);s.fogFar=420;}
  else if(kind==='mist'){blendState(PS.day,PS.sunset,.22,s);s.fog.set(col('#dde5e8'));s.fogNear=10;s.fogFar=170;s.clouds=.75;s.lamps=0;s.windows=.05;s.exposure=.95;s.sprTint.set(col('#fff6ee'));}
  else if(kind==='mistfar'){cutEnv('mist');s.fogNear=24;s.fogFar=330;}
  else if(kind==='day'){blendState(PS.day,PS.day,1,s);}
  envK=1;envFrom=envTo=kind==='storm'||kind==='night'?PS.night:PS.day;}
function cutSub(who,txt){const k=who+'|'+txt;if(k===CUT.sub)return;CUT.sub=k;const e=$('cut').querySelector('.ct-sub');e.classList.remove('on');
  if(!txt)return;setTimeout(()=>{if(CUT.sub!==k)return;e.querySelector('.ct-who').textContent=who||'';e.querySelector('.ct-who').hidden=!who;e.querySelector('.ct-txt').textContent=txt;e.classList.add('on');},who||txt?60:0);}
const CUT_SUBS=[[8.4,11,'','那一夜，汐見町的燈塔熄了。'],[23.4,27.2,'','深夜的平等車站——時刻表上，突然多了一班車。'],[32.2,36.8,'站務員','這班車，一百年才來一次。上車吧，時間不多了。'],
  [43.6,47.9,'村田爺爺','燈塔的六枚印章，被那場大浪捲走了……散落在鎮上六個地方。'],[47.9,52.4,'健叔','沒有燈塔，霧一天比一天近。再這樣下去，汐見町會從地圖上消失。'],
  [52.8,55.6,'小玉','喵嗚——！'],[56,60,'','聽說，印章的線索，藏在小鎮的各個角落……'],[60.2,65.4,'','而那個寄車票給你的「燈塔守護者」……從來沒有人見過。']];
function cutSnd(fn){if(A.ready)try{fn(A.ctx.currentTime);}catch(e){}}
function cutThunder(){CUT.flash=1;cutSnd(t=>{nburst(t+.25,2.4,'lowpass',160,.7,.55,A.sfx,.45);nburst(t+.05,.5,'lowpass',900,.5,.25,A.sfx,.8);});}

/* ---------- shots ---------- */
const SHOTS=[
 {t0:0,t1:11,fade:1,enter(){const F=CUT.fx;cutEnv('storm');F.rain.visible=true;F.beam.visible=true;F.wave.visible=false;F.lampOn=1;F.orbT=-1;
    INDOOR=false;HOME_IN=false;ST_IN=false;cutPlayer(false);P.pos.set(74,.5,-86);},
  tick(t,dt){const F=CUT.fx;
    cutCamLerp(t/11,[73.2,3.2,-78,75,7.6,-104.5],[73.8,4.6,-88,75,8.4,-104.5],52);
    if(t>1.5&&!F.th1){F.th1=1;cutThunder();}
    // wave rises (3.2 -> 6.2) then crashes
    const r=cE((t-3.2)/3),cr=cE((t-6.2)/1.1);F.wave.visible=t>3.1&&t<8.2;
    F.wave.position.set(75,SEA_Y-1+r*1,cL(-138,-121,r)+cr*10);F.wave.scale.set(1,.05+r*.95-cr*.7,1);F.wave.rotation.x=cr*.9;F.waveMat.opacity=.97-cE((t-7.1)/1)*.9;
    F.foam.forEach(s=>{const b=s.userData.b;s.position.set(b.x+Math.sin(time*3+s.userData.p)*.6,b.y+Math.sin(time*4+s.userData.p)*.35,b.z);});
    // eyes: open at 4.6, blink at 5.6, close at crash
    const open=cE((t-4.6)/.5)*(1-cE((t-6.3)/.3)),blink=Math.abs(t-5.7)<.12?.1:1;F.eyes.forEach(([o,c])=>{o.material.opacity=open*.95;o.scale.set(3.2,1.5*open*blink+.01,1);c.material.opacity=open;c.scale.set(1.1,.5*open*blink+.01,1);});
    if(t>4.7&&!F.growl){F.growl=1;cutSnd(t0=>{tone(55,t0,1.6,'sawtooth',.06,A.sfx,42);nburst(t0,1.8,'lowpass',120,.8,.3,A.sfx,.4);});}
    if(t>6.2&&!F.crash){F.crash=1;cutThunder();CUT.shake=.35;cutSnd(t0=>nburst(t0,2.6,'lowpass',420,.7,.8,A.sfx,.6));
      F.spray.forEach(p=>{p.s.visible=true;p.s.position.set(75+rr(-8,8),rr(1,6),-104+rr(-6,4));p.v.set(rr(-6,6),rr(5,14),rr(-2,9));p.s.scale.setScalar(rr(1.5,4));});F.orbT=0;
      cutSnd(t0=>[0,1,2,3,4,5].forEach(i=>tone([784,988,1175,1319,1568,1976][i],t0+.2+i*.11,.5,'sine',.05,A.sfx)));}
    CUT.shake=Math.max(0,CUT.shake-dt*.35);
    F.spray.forEach(p=>{if(!p.s.visible)return;p.v.y-=14*dt;p.s.position.addScaledVector(p.v,dt);if(p.s.position.y<-1)p.s.visible=false;});
    // orbs fly out of the lamp over the town
    if(F.orbT>=0){F.orbT+=dt;const L=new T.Vector3(75,8.6,-104.5);F.orbs.forEach((o,i)=>{const k=cE(Math.min(1,(F.orbT-i*.12)/2.4));const vis=F.orbT>i*.12&&k<1;
      const p=new T.Vector3().copy(L).lerp(o.to,k);p.y+=Math.sin(k*PI)*o.up;o.s.position.copy(p);o.core.position.copy(p);o.s.material.opacity=vis?1:0;o.core.material.opacity=vis?1:0;
      o.hist.unshift(p.clone());if(o.hist.length>14)o.hist.pop();o.tr.forEach((s,k2)=>{const h=o.hist[Math.min(o.hist.length-1,k2*2+1)];s.position.copy(h);s.material.opacity=vis?.55-k2*.07:0;});});}
    // lamp: bright, sweeping; flickers and dies after the crash
    let on=1;if(t>6.4){const k=t-6.4;on=k<2.2?(Math.sin(k*23)>.1?1-k/3:0.05):0;}F.lampOn=on;F.beam.rotation.y+=dt*1.1;
    if(t>8.6&&!F.dead){F.dead=1;cutSnd(t0=>{tone(220,t0,.5,'sine',.08,A.sfx,110);});}
    if(t>9.8&&!F.th2){F.th2=1;cutThunder();}}},
 {t0:11,t1:23,fade:1,enter(){const F=CUT.fx;F.rain.visible=false;F.beam.visible=false;F.lampOn=0;F.orbs.forEach(o=>{o.s.material.opacity=0;o.core.material.opacity=0;o.tr.forEach(s=>s.material.opacity=0);});F.spray.forEach(p=>p.s.visible=false);F.wave.visible=false;
    cutEnv('night');INDOOR=true;HOME_IN=true;ST_IN=false;try{applyHome();refreshHomeDecor();}catch(e){}F.ticket.visible=false;F.tk=0;$('cut').querySelector('.tk-name').textContent=W.name||'你';},
  tick(t,dt){const F=CUT.fx,px=HX+.35,pz=HZ-.5;
    const turned=t>5.2;cutPlayer(true,px,0,pz,turned?lerpAng(PI,0,cE((t-5.2)/.5)):PI,0);
    if(t<5.4)cutCamLerp(t/5.4,[HX+1.6,1.85,HZ+2.4,HX-.1,1.5,HZ-3],[HX+1.3,1.75,HZ+1.9,HX-.1,1.45,HZ-3],55);
    else cutCamLerp((t-5.4)/6,[px+.9,1.45,pz+2.2,px,1.15,pz],[px+.6,1.4,pz+1.7,px,1.15,pz],48);
    if(t>1.1&&!F.knock){F.knock=1;cutSnd(t0=>{[0,.26].forEach(d=>{tone(150,t0+d,.09,'triangle',.4,A.sfx);nburst(t0+d,.06,'lowpass',400,.6,.3,A.sfx);});});}
    // ticket flutters in from the window
    const k=(t-2.2)/2.6;F.ticket.visible=k>0&&t<6.2;if(F.ticket.visible){const kk=cE(Math.min(1,k));const a=new T.Vector3(HX-.1,1.65,HZ-2.9),b=new T.Vector3(px,1.12,pz+.28);
      F.ticket.position.copy(a).lerp(b,kk);F.ticket.position.x+=Math.sin(k*7)*.25*(1-kk);F.ticket.position.y+=Math.sin(k*9)*.12*(1-kk);F.ticket.rotation.set(Math.sin(k*6)*.6*(1-kk),Math.sin(k*4)*1.2*(1-kk)+(turned?0:PI),Math.sin(k*8)*.5*(1-kk));
      F.tkGlow.material.opacity=.8+Math.sin(time*6)*.15;if(!F.tkS){F.tkS=1;cutSnd(t0=>[1568,2093,2637,3136].forEach((f,i)=>tone(f,t0+i*.1,.6,'sine',.04,A.sfx)));}}
    const card=$('cut').querySelector('.ct-ticket');card.classList.toggle('on',t>6&&t<11.6);card.querySelector('.tk-in').classList.toggle('flip',t>8.6);
    if(t>8.6&&!F.flipS){F.flipS=1;cutSnd(t0=>nburst(t0,.18,'bandpass',2200,.8,.12,A.sfx));}}},
 {t0:23,t1:37,fade:1,enter(){const F=CUT.fx;$('cut').querySelector('.ct-ticket').classList.remove('on');F.ticket.visible=false;cutEnv('night');INDOOR=false;HOME_IN=false;F.pd.visible=true;F.pdTrain.position.x=150;F.pdLamps.forEach(([a,b])=>{a.opacity=0;b.opacity=0;});F.horn=0;},
  tick(t,dt){const F=CUT.fx,X=PDX,Z=PDZ;
    // flip board jumps, then settles on ??:??
    let txt;if(t<4.6){const q=Math.floor(t*9);txt=String((q*7+3)%24).padStart(2,'0')+':'+String((q*13+7)%60).padStart(2,'0');}else txt='??:??';
    if(txt!==F.flipLast){F.flipLast=txt;const g=F.flipG;g.fillStyle='#121216';g.fillRect(0,0,512,220);g.fillStyle='#f2c14e';g.font=`700 30px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('下一班　開往 汐見町',22,36);
      g.fillStyle='#2a2a30';for(let i=0;i<5;i++)if(i!==2)g.fillRect(40+i*90,72,78,120);g.fillStyle='#ffb040';g.font=`800 104px ${FM}`;g.textAlign='center';[...txt].forEach((ch,i)=>g.fillText(ch,79+i*90,136));F.flipT.needsUpdate=true;
      if(t<4.6)cutSnd(t0=>nburst(t0,.03,'bandpass',3000,1,.08,A.sfx));}
    // lamps on one by one
    F.pdLamps.forEach(([a,b],i)=>{const k=cE((t-4.8-i*.45)/.15);a.opacity=k;b.opacity=k*.5;if(k>0&&!F['l'+i]){F['l'+i]=1;cutSnd(t0=>tone(1200,t0,.04,'square',.03,A.sfx));}});
    if(t>6.6&&F.horn<1){F.horn=1;SND.horn&&SND.horn();}if(t>8.6&&F.horn<2){F.horn=2;SND.horn&&SND.horn();}
    // train arrives (ease-out) 7.2 -> 11.4
    const k=cE((t-7.2)/4.2);F.pdTrain.position.x=cL(150,1,1-(1-k)*(1-k));if(t>7.2&&t<11.4&&(F.clk=(F.clk||0)-dt)<=0){F.clk=.34*(1+k);cutSnd(t0=>nburst(t0,.1,'lowpass',260,.8,.3*(1-k*.6),A.sfx));}
    // actors
    const pw=t>12.3?Math.min(1,(t-12.3)/1.5):0;cutPlayer(true,X-1.2,.9,Z-1.05-pw*.9,PI,pw>0&&pw<1?.2:0);
    cutHuman(CUT.act.guard,true,X+.9,.9,Z-.55,t>8.9?-PI/2-.5:PI*.15,0);
    if(t<9)cutCamLerp(t/9,[X+9,2.3,Z+4.2,X,1.7,Z-2],[X+6,2.1,Z+3.6,X-1,1.6,Z-2.2],50);
    else cutCamLerp((t-9)/5,[X+2.6,1.75,Z+1.8,X-.3,1.45,Z-1],[X+2.2,1.65,Z+1.4,X-.6,1.45,Z-1.2],46);
    P.pos.set(X,.9,Z);}},
 {t0:37,t1:42.6,fade:1,enter(){const F=CUT.fx;F.pd.visible=false;sprShow(CUT.act.guard,false);cutPlayer(false);cutEnv('mistfar');INDOOR=false;TRAIN.x=-152;TRAIN.dir=1;TRAIN.state='run';TRAIN.v=12;cutSnd(t0=>SND.gull&&SND.gull());},
  tick(t,dt){const k=cE((t-1.8)/3.8);cutCamLerp(k,[-107,3.6,-20,-128,3.2,-31],[-100,9.5,-22,-72,-1,-80],50);P.pos.set(-100,0,-30);
    if((CUT.fx.clk=(CUT.fx.clk||0)-dt)<=0){CUT.fx.clk=.3;cutSnd(t0=>{nburst(t0,.1,'lowpass',260,.8,.28,A.sfx);nburst(t0+.11,.08,'lowpass',240,.8,.2,A.sfx);});}}},
 {t0:42.6,t1:52.6,fade:1,enter(){cutEnv('mist');TRAIN.x=48;TRAIN.state='stop';TRAIN.stopT=40;TRAIN.v=0;TRAIN.dir=1;cutSnd(t0=>SND.chime&&SND.chime());},
  tick(t,dt){const w=cE(t/1.3);const px=cL(47.2,46.4,w),pz=cL(-32.5,-33.8,w);const face=t<1.3?PI:lerpAng(PI,-PI/2,cE((t-1.3)/.4));
    cutPlayer(true,px,.9,pz,face,t<1.3?.14:0);
    const g=cE((t-.4)/2.4),f=cE((t-.9)/2.5);cutHuman(CUT.act.grandpa,true,cL(38.2,44.4,g),.9,-34.35,PI/2,g<1&&g>0?t*6:0);cutHuman(CUT.act.fisher,true,cL(37.2,44.7,f),.9,-33.05,PI/2,f<1&&f>0?t*6:0);
    if(t<5.3)cutCamLerp(t/5.3,[60,2.4,-34.6,44.5,1.5,-33.8],[57,2.2,-34.8,44.7,1.5,-33.8],50);
    else cutCamLerp((t-5.3)/4.7,[48.8,1.9,-36.4,45.2,1.55,-33.6],[48.2,1.85,-36.1,45.4,1.55,-33.6],44);}},
 {t0:52.6,t1:56,fade:0,enter(){CUT.fx.post.visible=true;cutSnd(t0=>SND.meow&&SND.meow());},
  tick(t,dt){const A_=CUT.act.cat&&CUT.act.cat.meta.act||{};const j=cE((t-.5)/.6);const x=cL(44.4,45.3,j),z=cL(-34.6,-35.2,j),y=.9+j*1.55+Math.sin(j*PI)*.5;
    const fr=t<.5?0:j<1?(A_.jump!=null?A_.jump:0):(t>1.6?(Math.floor(t*5)%2?(A_.paw!=null?A_.paw:0):(A_.wag_A!=null?A_.wag_A:0)):0);cutCat(true,x,y,z,fr,-1);
    if(t>1.7&&!CUT.fx.meow2){CUT.fx.meow2=1;cutSnd(t0=>SND.meow&&SND.meow());}
    cutPlayer(true,46.4,.9,-33.8,-PI/2+.6,0);cutHuman(CUT.act.grandpa,true,44.4,.9,-34.35,PI/2,0);cutHuman(CUT.act.fisher,true,44.7,.9,-33.05,PI/2,0);
    cutCamLerp(t/3.4,[47.4,2.1,-37.6,45.3,2,-35.2],[47,2.3,-37.2,45.3,2.2,-35.2],44);}},
 {t0:56,t1:57.9,fade:0,enter(){cutPlayer(false);['grandpa','fisher','cat'].forEach(k=>CUT.act[k]&&sprShow(CUT.act[k],false));CUT.fx.post.visible=false;cutEnv('mistfar');
    CUT.save.tabs=(ADV.tabs||[]).map(tb=>[tb.gl.material.opacity,tb.m.emissiveIntensity]);(ADV.tabs||[]).forEach(tb=>{tb.gl.material.opacity=.7;tb.m.emissiveIntensity=.9;});},
  tick(t){cutCamLerp(t/1.9,[34,5.2,-147,34,2.4,-163],[34,4.4,-151,34,2.2,-163],46);P.pos.set(34,2,-156);}},
 {t0:57.9,t1:59.8,fade:0,enter(){(ADV.tabs||[]).forEach((tb,i)=>{const s=CUT.save.tabs&&CUT.save.tabs[i];if(s){tb.gl.material.opacity=s[0];tb.m.emissiveIntensity=s[1];}});},
  tick(t){cutCamLerp(t/1.9,[FALL.x+2.5,5.4,FALL.z-12.5,FALL.x,5.2,FALL.z+2],[FALL.x+1.5,5,FALL.z-9.5,FALL.x,5,FALL.z+2],48);P.pos.set(FALL.x,4,FALL.z-5);}},
 {t0:59.8,t1:61.5,fade:0,enter(){},tick(t){cutCamLerp(t/1.7,[-57.5,5.9,71,-66,5,85],[-59.3,5.6,74,-66.5,5,86],48);P.pos.set(-62,4,78);}},
 {t0:61.5,t1:65.6,fade:1,enter(){cutEnv('mist');S.fogNear=6;S.fogFar=90;},
  tick(t){const a=cyWorld(1.8,15),b=cyWorld(1,11.5),l=cyWorld(0,2);cutCamLerp(t/4.1,[a.x,CY.y+2.4,a.z,l.x,CY.y+2.4,l.z],[b.x,CY.y+2.2,b.z,l.x,CY.y+2.3,l.z],46);P.pos.set(b.x,CY.y,b.z);
    CUT.fx.cabGlow.material.opacity=.55+Math.sin(time*2.2)*.2;}},
 {t0:65.6,t1:1e9,fade:1,enter(){CUT.fx.cabGlow.material.opacity=0;cutEnv('mistfar');CUT.fx.lampOn=0;cutSnd(t0=>SND.wave&&SND.wave(null,.6));},
  tick(t){cutCamLerp(Math.min(1,t/7),[74.1,1.5,-92.5,75,8.1,-104.5],[74.5,3.1,-97,75,8.4,-104.5],50);P.pos.set(74.5,.5,-97);
    const m=$('cut').querySelector('.ct-mission');if(t>1.6&&!m.classList.contains('on')){m.classList.add('on');cutSnd(t0=>SND.chime&&SND.chime());}}}];

/* ---------- run / end ---------- */
function playOpening(opts={}){try{cutBuild();}catch(e){console.error(e);showStory(()=>{});return;}
  CUT.replay=!!opts.replay;CUT.T=0;CUT.shot=-1;CUT.sub='';CUT.ended=false;CUT.flash=0;CUT.shake=0;CUT.black=1;CUT.fx.th1=CUT.fx.th2=CUT.fx.crash=CUT.fx.dead=CUT.fx.growl=CUT.fx.knock=CUT.fx.tkS=CUT.fx.flipS=CUT.fx.meow2=0;for(let i=0;i<5;i++)CUT.fx['l'+i]=0;
  CUT.snap={f:{INDOOR,HOME_IN,CH_IN,TC_IN,ST_IN,MZ_IN,ISL_IN,CY_IN},p:P.pos.clone(),yaw:P.yaw,cy:cam.yaw,cp:cam.pitch,tod:todIdx,r2:R2.on,pet:PETOBJ?PETOBJ.g.visible:null};
  CUT.save.lampE=COAST.lampMat.emissive.clone();CUT.save.train={x:TRAIN.x,state:TRAIN.state,v:TRAIN.v,dir:TRAIN.dir,stopT:TRAIN.stopT,wait:TRAIN.wait};
  if(R2.on)r2Off();if(DLG.open)closeDlg();closeCabin&&closeCabin();CH_IN=TC_IN=MZ_IN=ISL_IN=CY_IN=false;
  if(PETOBJ)PETOBJ.g.visible=false;CUTON=true;document.body.classList.add('cut','cine');const d=$('cut');d.hidden=false;d.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));d.querySelector('.tk-in').classList.remove('flip');
  if(A.ready){A.mus.gain.setTargetAtTime(0,A.ctx.currentTime,.3);}}
function cutCam(dt){if(!CUTON)return;CUT.T+=dt;let i=SHOTS.findIndex(s=>CUT.T>=s.t0&&CUT.T<s.t1);if(i<0)i=SHOTS.length-1;
  if(i!==CUT.shot){CUT.shot=i;try{SHOTS[i].enter();}catch(e){console.error(e);}}
  const sh=SHOTS[i],lt=CUT.T-sh.t0;try{sh.tick(lt,dt);}catch(e){console.error(e);}
  // black fades at shot boundaries
  const fin=sh.fade?Math.min(1,lt/.45):1,fout=(sh.fade&&SHOTS[i+1]&&SHOTS[i+1].fade)?Math.min(1,(sh.t1-CUT.T)/.45):1;CUT.black=1-Math.min(fin,fout);
  const s=CUT_SUBS.find(x=>CUT.T>=x[0]&&CUT.T<x[1]);cutSub(s?s[2]:'',s?s[3]:'');
  // rain sound during the storm
  if(i===0&&A.ready){if((CUT.rainT-=dt)<=0){CUT.rainT=.16;cutSnd(t0=>nburst(t0,.45,'highpass',2400,.4,.05,A.sfx,rr(.8,1.2)));}if((CUT.windT-=dt)<=0){CUT.windT=.7;cutSnd(t0=>nburst(t0,1.2,'lowpass',520,.6,.09,A.sfx,.5));}}}
function cutFx(dt){if(!CUTON)return;const F=CUT.fx;
  // rain around the camera
  if(F.rain&&F.rain.visible){const a=F.rain.geometry.attributes.position.array,c=camera.position;F.rainO.forEach((o,i)=>{const y=((o[1]-time*22*o[3])%28+28)%28;const x=c.x+o[0]+y*.12,z=c.z+o[2],yy=c.y-8+y;a.set([x,yy,z,x-.1,yy+.9,z],i*6);});F.rain.geometry.attributes.position.needsUpdate=true;}
  // lighthouse lamp
  if(F.beam){const on=F.lampOn||0;COAST.lampMat.emissive.set(on>0?col('#ffd68a'):CUT.save.lampE);COAST.lampMat.emissiveIntensity=on*2.4;COAST.lampGlow.material.opacity=0;F.lampGlow.material.opacity=on*.95;F.beamMat.opacity=on*.3;F.beam.visible=on>0.02&&CUT.shot===0;}
  if(CUT.shot===0)seaU.uTime.value=time*2.6;
  // lightning
  if(CUT.flash>0){hemi.intensity+=CUT.flash*2.2;CUT.flash=Math.max(0,CUT.flash-dt*3.2);}
  const d=$('cut');d.querySelector('.ct-flash').style.opacity=Math.min(.85,CUT.flash*.9).toFixed(3);d.querySelector('.ct-black').style.opacity=CUT.black.toFixed(3);}
function cutEnd(){if(!CUTON||CUT.ended)return;CUT.ended=true;const first=!CUT.replay;
  fadeTo(()=>{const F=CUT.fx;CUTON=false;document.body.classList.remove('cut','cine');const d=$('cut');d.hidden=true;d.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));
    F.rain.visible=false;F.beam.visible=false;F.wave.visible=false;F.ticket.visible=false;F.pd.visible=false;F.post.visible=false;F.lampGlow.material.opacity=0;F.cabGlow.material.opacity=0;
    F.orbs.forEach(o=>{o.s.material.opacity=0;o.core.material.opacity=0;o.tr.forEach(s=>s.material.opacity=0);});F.spray.forEach(p=>p.s.visible=false);
    Object.values(CUT.act).forEach(c=>c&&sprShow(c,false));COAST.lampMat.emissive.copy(CUT.save.lampE);
    (ADV.tabs||[]).forEach((tb,i)=>{const s=CUT.save.tabs&&CUT.save.tabs[i];if(s){tb.gl.material.opacity=s[0];tb.m.emissiveIntensity=s[1];}});CUT.save.tabs=null;
    if(SPR.c)sprShow(SPR.c,true);else pl.g.visible=true;if(PETOBJ)PETOBJ.g.visible=true;CUT.shake=0;camera.fov=50;camera.updateProjectionMatrix();
    if(A.ready)applyVolumes();
    if(first){W.introSeen=true;save();todIdx=2;blendState(PS.day,PS.day,1,S);envFrom=envTo=PS.day;envK=1;$('tBtnLbl').textContent=PRESETS.day.jp;
      INDOOR=false;HOME_IN=false;ST_IN=false;arriveShiomi();setTimeout(()=>say('汐見町',[`${W.name||''}，歡迎來到汐見町！`,'鎮上有六個地方藏著印章的線索，頭上有圖示的鎮民會出題考你。','答對題目，就能把印章一枚一枚找回來。先從月台左邊的斜坡走下去看看吧！']),900);}
    else{const s=CUT.snap;Object.assign(TRAIN,CUT.save.train);INDOOR=s.f.INDOOR;HOME_IN=s.f.HOME_IN;CH_IN=s.f.CH_IN;TC_IN=s.f.TC_IN;ST_IN=s.f.ST_IN;MZ_IN=s.f.MZ_IN;ISL_IN=s.f.ISL_IN;CY_IN=s.f.CY_IN;
      P.pos.copy(s.p);P.vel.set(0,0,0);P.yaw=s.yaw;cam.yaw=s.cy;cam.pitch=s.cp;cam.pos.set(P.pos.x+Math.sin(cam.yaw)*6,P.pos.y+3,P.pos.z+Math.cos(cam.yaw)*6);cam.look.set(P.pos.x,P.pos.y+1.4,P.pos.z);
      todIdx=s.tod;blendState(PS[ORDER[todIdx]],PS[ORDER[todIdx]],1,S);envFrom=envTo=PS[ORDER[todIdx]];envK=1;if(HOME_IN){try{applyHome();}catch(e){}}if(s.r2&&TC_IN)r2Enter();}});}
