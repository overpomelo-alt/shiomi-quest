/* ================================================================
   留言板 (student home + teacher cabin), cabin decor, anniversary frame, story intro,
   station fixes, Excel question import
   ================================================================ */
const TPHOTOS=(()=>{try{return JSON.parse(document.getElementById('tphotos').textContent);}catch(e){return [];}})();
// ---------- message panel (shared)
(function(){const d=document.createElement('div');d.id='msgp';d.hidden=true;d.innerHTML='<div class="dc-in"><div class="dc-head"><div><p class="card-kicker" id="mpKick">留言板</p><h2 id="mpTitle">留言板</h2></div><button type="button" class="x" id="mpClose" aria-label="關閉">×</button></div><div id="mpBody"></div><div class="dc-foot"><span class="dc-coins" id="mpFoot"></span><button type="button" class="btn primary" id="mpDone">關閉</button></div></div>';document.body.appendChild(d);
  const c=()=>{d.hidden=true;cv.focus({preventScroll:true});};d.querySelector('#mpClose').onclick=c;d.querySelector('#mpDone').onclick=c;})();
function msgOpen(kick,title,render){if(DLG.open)closeDlg();$('mpKick').textContent=kick;$('mpTitle').textContent=title;const B=$('mpBody');B.innerHTML='';$('mpFoot').textContent='';render(B);$('msgp').hidden=false;}
function fmtDT(t){const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function boardTex(title,sub,colr){const [c,g]=C2(256,192);g.fillStyle='#8a6446';g.fillRect(0,0,256,192);g.fillStyle='#c9a67a';g.fillRect(10,10,236,172);
  [['#fff8e0',26,44,90,60,-.06],['#ffe0e8',136,40,94,62,.05],['#e4f2ff',40,112,100,58,.04],['#fffbd0',150,114,82,56,-.05]].forEach(([cc,x,y,w,h,r])=>{g.save();g.translate(x+w/2,y+h/2);g.rotate(r);g.fillStyle=cc;g.fillRect(-w/2,-h/2,w,h);g.fillStyle='#d9573b';g.beginPath();g.arc(0,-h/2+5,4,0,7);g.fill();g.fillStyle='rgba(60,50,40,.45)';for(let k=0;k<3;k++)g.fillRect(-w/2+8,-h/2+16+k*11,w-16,3);g.restore();});
  g.fillStyle=colr||'#6e4c33';g.fillRect(0,0,256,34);g.fillStyle='#fff8ea';g.font=`700 22px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText(title,128,18);return TX(c);}
function msgBoard(parent,x,y,z,ry,title,colr){const gg=new T.Group();gg.position.set(x,y,z);gg.rotation.y=ry;parent.add(gg);[-.5,.5].forEach(px=>mk(cy(.05,.06,1.7,6),M.woodDark,px,.85,0,gg));
  mk(bx(1.2,.9,.06),M.woodDark,0,1.25,0,gg);mk(new T.PlaneGeometry(1.12,.84),new T.MeshLambertMaterial({map:boardTex(title,'',colr),emissive:0xffffff,emissiveMap:null,emissiveIntensity:.05}),0,1.25,.035,gg,false);
  mk(bx(1.35,.1,.2),lam('#5a3520'),0,1.74,0,gg);return gg;}
// ---------- board outside "my home" (town)
(function(){if(!HOME.townOut)return;const p=HOME.townOut,yaw=HOME.townYaw||0;const rx=Math.cos(yaw),rz=-Math.sin(yaw);const bx_=p.x+rx*1.9,bz=p.z+rz*1.9;
  msgBoard(scene,bx_,0,bz,yaw,'我家的留言板','#3d6ea8');addCol(bx_-.3,bx_+.3,bz-.3,bz+.3,2);
  inter(new T.Vector3(bx_+Math.sin(yaw)*.8,0,bz+Math.cos(yaw)*.8),1.4,'看我家的留言板',()=>openHomeBoard());})();
function myNotes(){const s=String(W.seat);return (CFG.notes||[]).filter(n=>n&&n.text&&(String(n.seat).trim()===s||/^(全班|all|\*)$/i.test(String(n.seat).trim())));}
function openHomeBoard(){msgOpen('我家的留言板','給'+(W.name||'你')+'的留言',B=>{const L=myNotes().slice().reverse();
  if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有留言。老師寫給你的話會出現在這裡。'}));
  L.forEach(n=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`${n.from||'老師'}${n.date?' · '+n.date:''}${/^(全班|all|\*)$/i.test(String(n.seat).trim())?' · 給全班':''}`}),el('p',{text:n.text})])));
  B.appendChild(el('p',{class:'help',text:'之後換成雲端版，同學來你家玩也可以在這裡留言喔！'}));
  const seen=(W.notesSeen=W.notesSeen||[]);L.forEach(n=>{const k=n.date+n.text.slice(0,20);if(!seen.includes(k))seen.push(k);});save();});}
// ---------- board outside the teacher's cabin
(function(){const p=cyWorld(2.7,5.2);const g=msgBoard(scene,p.x,CY.y,p.z,CY.r,'寫給老師','#b8452f');addCol(p.x-.3,p.x+.3,p.z-.3,p.z+.3,2);
  const q=cyWorld(2.7,6.0);inter(q,1.4,()=>TS()?'看學生的留言':'寫留言給老師',()=>openTeacherBoard());})();
function allToT(){const out=[];try{Object.keys(localStorage).filter(k=>k.startsWith('shiomi-quest-v1:')).forEach(k=>{const s=JSON.parse(localStorage.getItem(k)||'null');if(s&&s.seat&&s.seat!=='T')(s.toT||[]).forEach(m=>out.push(Object.assign({seat:s.seat,name:s.name},m)));});}catch(e){}return out.sort((a,b)=>b.t-a.t);}
function openTeacherBoard(){
  if(TS()){msgOpen('山上小屋','學生寫給老師的話',B=>{const L=allToT();B.appendChild(el('p',{class:'help',text:'這裡顯示在「這台裝置」上寫的留言。學生在自己平板寫的留言，會跟著成績表單一起送到你那裡。'}));
    if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有留言。'}));L.forEach(m=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`${m.seat} 號 ${m.name||''} · ${fmtDT(m.t)}`}),el('p',{text:m.text})])));});return;}
  msgOpen('山上小屋','寫留言給老師',B=>{const ta=el('textarea',{class:'nb-in',maxlength:'150',placeholder:'想跟老師說的話…（最多 150 字）'});
    B.appendChild(el('div',{class:'nb-card'},[el('b',{text:'寫一張便條'}),ta,el('button',{type:'button',class:'btn primary small',text:'貼上留言板',onclick:()=>{const t=ta.value.trim();if(!t){toast('先寫點什麼吧');return;}
      W.toT=W.toT||[];W.toT.push({t:Date.now(),text:t});if(W.toT.length>30)W.toT.shift();save();SND.pick&&SND.pick();toast('貼好了！老師收成績的時候會看到');openTeacherBoard();}})]));
    const mine=(W.toT||[]).slice().reverse();if(mine.length){B.appendChild(el('div',{class:'nb-meta',style:'margin:8px 2px 4px',text:'你貼過的便條'}));mine.forEach(m=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:fmtDT(m.t)}),el('p',{text:m.text})])));}});}

// ---------- cabin: nicer interior + Q photos + anniversary frame
const ANN={cv:null,tex:null,day:''};
function annDays(){if(!TL)tlLoad();const s=TL.anniv;if(!s)return null;const a=new Date(s+'T00:00:00'),b=new Date();b.setHours(0,0,0,0);return Math.floor((b-a)/864e5)+1;}
function drawAnn(){if(!ANN.cv)return;const g=ANN.cv.getContext('2d'),W_=320,H_=240;g.fillStyle='#fff6ee';g.fillRect(0,0,W_,H_);
  g.strokeStyle='#e8a6b4';g.lineWidth=6;g.setLineDash([10,8]);g.strokeRect(12,12,W_-24,H_-24);g.setLineDash([]);
  const n=annDays();g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c85a78';g.font=`700 26px ${FG}`;g.fillText('♥ 我們在一起 ♥',W_/2,58);
  if(n==null){g.fillStyle='#9a7a6a';g.font=`500 20px ${FG}`;g.fillText('（還沒設定紀念日）',W_/2,130);}
  else{g.fillStyle='#5a3a2a';g.font=`800 64px ${FG}`;g.fillText(`第 ${n} 天`,W_/2,132);g.fillStyle='#9a7a6a';g.font=`500 18px ${FG}`;g.fillText('since '+TL.anniv.replace(/-/g,'.'),W_/2,190);}
  ANN.tex.needsUpdate=true;ANN.day=todayStr();}
(function(){const G=TC.g;if(!G)return;const W_=TC_W/2,D_=TC_D/2,RH=TC_RH;
  const wood=imat('#6e4c33',.3);
  // photos of the teacher (Q-style) on the kitchen partition, facing the office
  TPHOTOS.forEach((src,i)=>{const im=new Image();const t=new T.Texture(im);t.encoding=T.sRGBEncoding;im.onload=()=>{t.needsUpdate=true;};im.src=src;
    const z=-.25+i*1.0;const fr=new T.Group();fr.position.set(-2.6,1.75,z);fr.rotation.y=PI/2;G.add(fr);mk(bx(.72,.86,.05),wood,0,0,0,fr,false);mk(bx(.64,.78,.02),imat('#fbf4e8',.4),0,0,.02,fr,false);
    mk(new T.PlaneGeometry(.56,.68),new T.MeshBasicMaterial({map:t}),0,0,.035,fr,false);});
  // anniversary frame above the bed (on the bathroom partition, facing the office)
  {const [c]=C2(320,240);ANN.cv=c;ANN.tex=TX(c);const fr=new T.Group();fr.position.set(2.6,1.9,.8);fr.rotation.y=-PI/2;G.add(fr);
    mk(bx(1.06,.82,.05),imat('#e8b0c0',.35),0,0,0,fr,false);mk(new T.PlaneGeometry(.96,.72),new T.MeshBasicMaterial({map:ANN.tex}),0,0,.03,fr,false);
    [[-.55,.45],[.55,.45]].forEach(([x,y])=>mk(sph(.06,8,6),imat('#f28fb0',.6),x,y,.03,fr,false));drawAnn();}
  // curtains, pendant lamps, string lights, plants, cushions, books
  [-1,1].forEach(s=>{const cu=mk(bx(.32,1.35,.05),imat('#e8d9b8',.35),-1.7+s*.95,1.85,-D_+.12,G,false);cu.rotation.z=s*.03;});mk(bx(2.4,.06,.06),wood,-1.7,2.55,-D_+.14,G,false);
  [[-1.2,-.6],[1.2,-.6],[0,1.2]].forEach(([x,z])=>{mk(cy(.01,.01,.7,4),imat('#2a2a2a',.2),x,RH-.35,z,G,false);const lm=new T.MeshLambertMaterial({color:col('#f6e0b0'),emissive:col('#ffcf8f'),emissiveIntensity:.9});mk(new T.ConeGeometry(.22,.22,14,1,true),lm,x,RH-.78,z,G,false);addGlow(x,RH-.9,z,1.6,'#ffd79a','adv',.7,G);});
  for(let i=0;i<12;i++){const x=-2.5+i*.45,y=RH-.25-Math.sin(i/11*PI)*.18;mk(sph(.035,6,5),new T.MeshBasicMaterial({color:col(['#ffd79a','#ffe9c0','#ffc27a'][i%3])}),x,y,-D_+.06,G,false);addGlow(x,y,-D_+.1,.45,'#ffd79a','adv',.9,G);}
  const plant=(x,z,s)=>{mk(cy(.18*s,.14*s,.34*s,10),imat('#9a5e42',.3),x,.17*s,z,G);for(let i=0;i<6;i++){const f=mk(ico(.16*s,0),imat(pick(['#557a4f','#4b6f47','#62855a']),.3),x+rr(-.1,.1)*s,.45*s+i*.09*s,z+rr(-.1,.1)*s,G);f.scale.y=1.3;}addCol(TCX+x-.2*s,TCX+x+.2*s,TCZ+z-.2*s,TCZ+z+.2*s,1);};
  plant(-2.35,-3.05,1.2);plant(1.35,-3.1,.9);
  [[-2.15,.55],[-1.65,.35]].forEach(([x,z],i)=>{const cu=mk(bx(.34,.3,.12),imat(i?'#e8c46a':'#d97a5a',.35),x,.62,z,G,false);cu.rotation.y=.6;cu.rotation.x=-.2;});
  for(let i=0;i<4;i++)mk(bx(.32+rand()*.06,.06,.24),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c']),.35),-.5,.03+i*.06,1.6,G,false).rotation.y=rr(-.3,.3);
  const wm=new T.Group();wm.position.set(-1.7,.01,.9);G.add(wm);mk(new T.CylinderGeometry(.55,.55,.015,24),imat('#f3e6cf',.35),0,0,0,wm,false);
  mk(bx(1.6,.05,.25),wood,-.3,2.25,-D_+.16,G,false);[[-.8,'#557a4f'],[-.3,'#e05a4a'],[.2,'#62855a']].forEach(([x,cc])=>{mk(cy(.07,.06,.12,8),imat('#9a5e42',.3),x,2.34,-D_+.16,G,false);mk(ico(.09,0),imat(cc,.35),x,2.46,-D_+.16,G,false);});
  inter(new T.Vector3(TCX+1.55,0,TCZ+.2),1.0,()=>TS()?'紀念日相框（設定日期）':'紀念日相框',()=>{if(TS())openCabin('ann');else{const n=annDays();say('相框',[n?`相框裡寫著：「我們在一起 第 ${n} 天」`:'一個粉紅色的相框，裡面還是空白的。']);}});
  inter(new T.Vector3(TCX-2.0,0,TCZ+.3),1.0,'牆上的照片',()=>say('照片',['牆上掛著老師的 Q 版照片。','一張在沙發上看書，一張坐著對你微笑。']));
  inkify(G);})();

// ---------- story intro (shown once; can be replayed from the notice board)
const STORY=[['很久很久以前，海邊有一座叫做「汐見町」的小鎮。','鎮上的人每天看著潮水來來去去，所以叫它「看得見潮汐的小鎮」。'],
  ['每年秋天，鎮民會把這一年學到的事情，做成一顆一顆的「印章」，','收進防波堤盡頭的燈塔裡。燈塔因此一直亮著，照亮回家的船。'],
  ['可是有一年，一場好大的浪，把燈塔裡的印章全部捲走了。','印章散落在小鎮的各個角落，燈塔的光也慢慢變暗……'],
  ['就在這時候，平等車站出現了一班沒有時刻表的火車。','站務員說：「只有願意學習、願意幫助別人的孩子，才搭得上這班車。」'],
  ['你的任務：走遍汐見町，回答鎮民的問題，把遺失的印章一顆一顆找回來。','集滿印章，燈塔就會重新亮起來！']];
(function(){const d=document.createElement('div');d.id='story';d.hidden=true;d.innerHTML='<div class="sy-in"><p class="sy-k">序章 · 汐見町的故事</p><div class="sy-t"></div><div class="sy-dots"></div><div class="sy-btns"><button type="button" class="btn" id="syskip">略過</button><button type="button" class="btn primary" id="synext">下一頁</button></div></div>';document.body.appendChild(d);})();
function showStory(done){const d=$('story');let i=0;const t=d.querySelector('.sy-t'),dots=d.querySelector('.sy-dots');
  const r=()=>{t.innerHTML='';STORY[i].forEach((l,k)=>{const p=el('p',{text:l});p.style.animationDelay=(k*.5)+'s';t.appendChild(p);});dots.innerHTML=STORY.map((_,k)=>`<i${k===i?' class="on"':''}></i>`).join('');$('synext').textContent=i===STORY.length-1?'出發！':'下一頁';};
  const end=()=>{d.hidden=true;W.introSeen=true;save();done&&done();};$('synext').onclick=()=>{if(i<STORY.length-1){i++;r();}else end();};$('syskip').onclick=end;r();d.hidden=false;}

// ---------- Shiomi platform: keep people off the tracks
(function(){addCol(29,62.6,-32.3,-31.9,1.4);const ym=lam('#e8c24a');mk(bx(28,.02,.3),ym,48,.915,-32.55,scene,false);for(let x=35;x<62;x+=.6)mk(bx(.08,.025,.2),lam('#d6ae36'),x,.93,-32.55,scene,false);
  const sg=new T.Group();sg.position.set(35.2,.9,-35.1);scene.add(sg);mk(cy(.05,.05,2.2,6),M.metal,0,1.1,0,sg);
  const [c,g]=C2(256,80);g.fillStyle='#2f6b56';g.fillRect(0,0,256,80);g.fillStyle='#fff';g.font=`700 32px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('← 出口・小鎮',128,42);
  const m=mk(new T.PlaneGeometry(1.2,.38),emMat(TX(c),TX(c),'signs'),0,2.05,.03,sg,false);const m2=mk(new T.PlaneGeometry(1.2,.38),emMat(TX(c),TX(c),'signs'),0,2.05,-.03,sg,false);m2.rotation.y=PI;})();
