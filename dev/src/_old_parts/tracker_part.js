/* ================================================================
   Quest tracker, guide arrow, tips
   ================================================================ */
const QT={pin:null,open:!IS_TOUCH,t:0,last:''};
function questTasks(){const list=allStamps().map(s=>{const st=s.st;let pos=null,where=s.where;
    if(st)pos=(SPOTS[st.spot]||{}).pos||null;else if(s.id==='safety')pos=GUARD.pos;
    else if(s.id==='glass'){const onBeach=P.pos.z<-44.3&&!(P.pos.x>72.6&&P.pos.x<77.4);if(onBeach){let best=null,bd=1e9;GLASS.forEach(g=>{if(g.got)return;const d=Math.hypot(g.x-P.pos.x,g.z-P.pos.z);if(d<bd){bd=d;best=new T.Vector3(g.x,beachH(g.z),g.z);}});pos=best;}else pos=new T.Vector3(-30,0,-42.6);}
    const r=W.st[s.id];const status=stampDone(s.id)?(r?`答對 ${r.c}/${r.t}`:s.id==='glass'?'5/5':'完成'):s.id==='glass'?`${W.glass.length}/5・${where}`:where;
    return {id:s.id,icon:s.subject,title:s.title?`${s.subject}・${s.title}`:s.subject,status,done:stampDone(s.id),pos};});
  let petPos=null;if(!W.pet){if(stampsDone()>=3)petPos=new T.Vector3(-54,0,-35.2);else{let bd=1e9;CATS.forEach(c=>{if(c.isPet||c.dog)return;const d=c.g.position.distanceTo(P.pos);if(d<bd){bd=d;petPos=c.g.position;}});}}
  list.push({id:'pet',icon:'寵',title:'領養一隻寵物（選做）',status:W.pet?`${W.pet.name} Lv.${petLv()}`:stampsDone()>=3?'巴士站的紙箱裡有小狗':'餵同一隻貓三次小魚乾，或拿 3 個印章找村田爺爺',done:!!W.pet,pos:petPos,optional:true});
  list.push({id:'submit',icon:'交',title:'繳交成績',status:W.submitted?'已打開表單':'按 Q 打開集章卡繳交',done:!!W.submitted,pos:null});
  return list;}
function questTarget(tasks){if(QT.pin){const t=tasks.find(x=>x.id===QT.pin&&!x.done&&x.pos);if(t)return t;QT.pin=null;}
  let best=null,bd=1e9;tasks.forEach(t=>{if(t.done||!t.pos||t.optional||t.id==='glass')return;const d=t.pos.distanceTo(P.pos);if(d<bd){bd=d;best=t;}});
  if(!best){const g=tasks.find(t=>t.id==='glass'&&!t.done);if(g)best=g;}return best;}
function iconChip(t){const st=subjStyle(t.icon);const s=document.createElement('span');s.className='q-ic';s.style.background=t.done?'rgba(243,234,217,.12)':st.c;s.textContent=t.done?'✓':(t.icon||'?')[0];return s;}
function renderQuests(){const tasks=questTasks(),ol=$('qList');const done=tasks.filter(t=>t.done&&!t.optional).length,total=tasks.filter(t=>!t.optional).length;$('qCount').textContent=`${done}/${total}`;
  const key=JSON.stringify(tasks.map(t=>[t.id,t.done,t.status]))+QT.pin+QT.open;if(key!==QT.last){QT.last=key;ol.innerHTML='';
    tasks.forEach(t=>{const li=document.createElement('li');const b=document.createElement('button');b.type='button';b.className='q-item'+(t.done?' done':'')+(QT.pin===t.id?' pinned':'');
      b.appendChild(iconChip(t));const tx=document.createElement('span');tx.className='q-tx';const tt=document.createElement('b');tt.textContent=t.title;const ss=document.createElement('span');ss.textContent=t.status;tx.appendChild(tt);tx.appendChild(ss);b.appendChild(tx);
      if(!t.done&&t.pos){const nav=document.createElement('span');nav.className='q-nav';nav.textContent=QT.pin===t.id?'導航中':'導航';b.appendChild(nav);}
      b.onclick=()=>{if(t.id==='submit'){openCard();return;}if(t.done||!t.pos)return;QT.pin=QT.pin===t.id?null:t.id;QT.last='';renderQuests();};li.appendChild(b);ol.appendChild(li);});}
  $('quests').classList.toggle('closed',!QT.open);$('qHead').setAttribute('aria-expanded',String(QT.open));return tasks;}
$('qHead').onclick=()=>{QT.open=!QT.open;QT.last='';renderQuests();};
// ground chevrons
const GUIDE=(()=>{const s=new T.Shape();s.moveTo(0,.42);s.lineTo(.36,.02);s.lineTo(.2,.02);s.lineTo(0,.24);s.lineTo(-.2,.02);s.lineTo(-.36,.02);s.closePath();
  const geo=new T.ShapeGeometry(s);geo.rotateX(PI/2);const g=new T.Group();const mats=[];
  for(let i=0;i<3;i++){const m=new T.MeshBasicMaterial({color:col('#ffd27a'),transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});mats.push(m);const c=new T.Mesh(geo,m);c.position.z=i*.42;c.renderOrder=6;g.add(c);}
  g.visible=false;scene.add(g);return {g,mats};})();
function updateGuide(dt){const tasks=QT.tasks;if(!tasks)return;const tg=QT.target;
  const show=started&&!INDOOR&&!DLG.open&&!uiOpen()&&tg&&tg.pos;let dist=0;
  if(show){const dx=tg.pos.x-P.pos.x,dz=tg.pos.z-P.pos.z;dist=Math.hypot(dx,dz);const a=Math.atan2(dx,dz);
    GUIDE.g.visible=dist>4;GUIDE.g.position.set(P.pos.x+Math.sin(a)*1.3,P.pos.y+.07,P.pos.z+Math.cos(a)*1.3);GUIDE.g.rotation.y=a;
    GUIDE.mats.forEach((m,i)=>{m.opacity=(.35+.55*Math.max(0,Math.sin(time*4-i*1.1)))*(.7+.3*S.lamps);});
    const fx=-Math.sin(cam.yaw),fz=-Math.cos(cam.yaw);const rel=Math.atan2(dx*fz-dz*fx,dx*fx+dz*fz);$('qArrow').style.transform=`rotate(${(-rel)*180/PI}deg)`;}
  else GUIDE.g.visible=false;
  const nt=$('qNextT'),nd=$('qNextD');
  if(INDOOR){nt.textContent='先走出便利商店';nd.textContent='門口按 E';$('qArrow').style.transform='rotate(0deg)';}
  else if(tg){nt.textContent=tg.title;nd.textContent=tg.pos?(dist<4?'就在這附近，按 E':`約 ${Math.round(dist)} 公尺`):tg.status;}
  else{const all=tasks.filter(t=>!t.optional&&t.id!=='submit').every(t=>t.done);nt.textContent=all?'全部完成！':'自由探索';nd.textContent=all?'按 Q 繳交成績':'點任務清單開始導航';}}
function trackerTick(dt){if(!started)return;QT.t-=dt;if(QT.t<=0){QT.t=.5;QT.tasks=renderQuests();QT.target=questTarget(QT.tasks);tipCheck();}updateGuide(dt);}
// tips (each shown once per student)
const TIPS={move:IS_TOUCH?'用左下的搖桿走路，手指滑動畫面可以轉視角。':'用 W A S D 走路，按住滑鼠拖曳可以轉視角。',
  quest:'右上是任務清單。點任務會開始導航，地上的金色箭頭會帶你過去。',
  stamp1:'拿到第一個印章了！按 Q（或點「集章卡」）可以看所有印章。',
  coins:'金幣可以去便利商店或自動販賣機買東西。走到店門口按 E 就能進去逛。',
  pet3:'你已經有 3 個印章了！巴士站的村田爺爺好像有事想找你。',
  hungry:'寵物肚子餓的時候，按 P 打開照顧選單餵牠。',
  all:'所有印章都拿到了，太厲害了！按 Q 打開集章卡，按「繳交成績」。'};
let tipQ=[],tipT=0,tipGap=0,playT=0;
function tip(k){W.tips=W.tips||{};if(W.tips[k]||tipQ.includes(k))return;tipQ.push(k);}
function tipCheck(){playT+=.5;const n=stampsDone(),all=allStamps().length;
  if(playT>2)tip('move');if(playT>12)tip('quest');if(n>=1)tip('stamp1');if(n>=1&&W.coins>=20&&playT>20)tip('coins');if(n>=3&&!W.pet)tip('pet3');if(W.pet&&W.pet.full<25)tip('hungry');if(n>=all)tip('all');
  tipGap-=.5;const el=$('tip');if(tipT>0){tipT-=.5;if(tipT<=0){el.classList.remove('show');tipGap=4;}}
  else if(tipQ.length&&tipGap<=0&&!DLG.open&&!uiOpen()){const k=tipQ.shift();W.tips[k]=true;save();$('tipTxt').textContent=TIPS[k];el.hidden=false;el.classList.add('show');tipT=7.5;}}
$('tip').addEventListener('click',()=>{$('tip').classList.remove('show');tipT=0;tipGap=2;});
