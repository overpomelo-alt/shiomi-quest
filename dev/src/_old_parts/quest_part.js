/* ================================================================
   Quest config & student state
   ================================================================ */
const $=id=>document.getElementById(id);
const CFG=(()=>{let c=null;try{const el=document.getElementById('quest');if(el)c=JSON.parse(el.textContent);}catch(e){}
  c=c||{};c.stations=Array.isArray(c.stations)?c.stations:[];c.countdowns=Array.isArray(c.countdowns)?c.countdowns:[];c.words=Array.isArray(c.words)?c.words:[];
  c.coinsPerCorrect=+c.coinsPerCorrect||10;c.startCoins=c.startCoins==null?30:+c.startCoins;c.formLink=c.formLink||'';
  c.stations.forEach((s,i)=>{s.id=s.id||('s'+i);s.qs=Array.isArray(s.qs)?s.qs:[];});return c;})();
const SPOTS={
  books:{name:'汐見書店',who:'書店老闆',pos:SHOP_INFO.hon,r:2.2},
  cafe:{name:'喫茶 しおさい（咖啡店）',who:'咖啡店老闆',pos:SHOP_INFO.kissa,r:2.2},
  diner:{name:'うみねこ食堂',who:'食堂阿姨',pos:SHOP_INFO.shokudo,r:2.2},
  candy:{name:'駄菓子屋（柑仔店）',who:'柑仔店阿嬤',pos:SHOP_INFO.dagashi,r:2.2},
  barber:{name:'理容なみ（理髮店）',who:'理髮師',pos:SHOP_INFO.tokoya,r:2.2},
  fish:{name:'鮮魚たけうち（魚店）',who:'魚店老闆',pos:SHOP_INFO.sakanaya,r:2.2},
  bath:{name:'松の湯（澡堂）',who:'澡堂櫃台阿姨',pos:SHOP_INFO.sento,r:2.4},
  shop:{name:'やまもと（雜貨店）',who:'雜貨店老闆',pos:SHOP_INFO.sakaya,r:2.2},
  bus:{name:'海邊巴士站',who:'村田爺爺',pos:NPC[0].pos,r:2.2},
  pier:{name:'防波堤盡頭',who:'釣魚的健叔',pos:NPC[1].pos,r:2.2},
  shrine:{name:'山上的神社',who:'神社',pos:SHRINE.hall,r:2.6},
  tree:{name:'神社大樟樹',who:'大樟樹',pos:SHRINE.tree,r:3.2},
  ema:{name:'神社許願牌',who:'許願牌',pos:SHRINE.ema,r:1.8},
  light:{name:'紅色燈塔',who:'燈塔',pos:COAST.plaque,r:1.8},
  phone:{name:'便利商店旁公共電話',who:'公共電話',pos:KONBINI.phone,r:1.6},
  post:{name:'紅色郵筒',who:'郵筒',pos:POST.clone().add(new T.Vector3(.8,0,0)),r:1.6}};
const EXTRA_STAMPS=[{id:'safety',subject:'安全',title:'安全過平交道',where:'平交道旁的導護阿姨',ch:'安'},{id:'glass',subject:'英文',title:'海灘英文單字',where:'汐見浜（海灘）找 5 片海玻璃',ch:'貝'}];
function allStamps(){return [...CFG.stations.map(s=>({id:s.id,subject:s.subject||'關卡',title:s.title||'',where:(SPOTS[s.spot]||{}).name||'',ch:(s.subject||'關')[0],st:s})),...EXTRA_STAMPS];}
function stampDone(id){if(id==='safety')return !!W.safety;if(id==='glass')return W.glass.length>=5;return !!W.st[id];}
const W={seat:'',name:'',coins:0,items:{},glass:[],st:{},safety:null,time:0};
const SKEY=seat=>'shiomi-quest-v1:'+seat;
function save(){if(!W.seat)return;try{localStorage.setItem(SKEY(W.seat),JSON.stringify(W));}catch(e){}}
function loadSeat(seat){try{const v=localStorage.getItem(SKEY(seat));return v?JSON.parse(v):null;}catch(e){return null;}}
function addItem(n,k=1){W.items[n]=(W.items[n]||0)+k;if(W.items[n]<=0)delete W.items[n];renderPouch();save();}
function renderPouch(){const el=$('pouch');el.innerHTML='';const y=document.createElement('span');y.className='yen';y.textContent=`金幣 ${W.coins}`;el.appendChild(y);
  Object.entries(W.items).forEach(([k,v])=>{const s=document.createElement('span');s.textContent=v>1?`${k} ×${v}`:k;el.appendChild(s);});
  if(W.glass.length){const s=document.createElement('span');s.textContent=`海玻璃 ${W.glass.length}/5`;el.appendChild(s);}
  const all=allStamps();$('stampCount').textContent=`${all.filter(s=>stampDone(s.id)).length}/${all.length}`;}
let toastT=0;function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');toastT=3.2;}

/* ================================================================
   Dialog
   ================================================================ */
const DLG={open:false,lines:[],i:0,typed:0,full:'',choices:null,onEnd:null};
function say(who,lines,opts={}){DLG.open=true;DLG.who=who||'';DLG.lines=lines;DLG.i=0;DLG.choices=opts.choices||null;DLG.onEnd=opts.onEnd||null;$('dialog').hidden=false;$('dialog').querySelector('.who').textContent=DLG.who;startLine();}
function startLine(){DLG.full=DLG.lines[DLG.i];DLG.typed=0;$('dialog').querySelector('.txt').textContent='';$('dialog').querySelector('.choices').innerHTML='';$('dialog').querySelector('.more').hidden=true;}
function choose(who,text,choices){say(who,[text],{choices});}
function showChoices(){const box=$('dialog').querySelector('.choices');box.innerHTML='';DLG.choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${i+1}</b>`;b.appendChild(document.createTextNode(c.label));b.onclick=e=>{e.stopPropagation();pickChoice(i);};box.appendChild(b);});
  const f=box.querySelector('button');if(f&&!IS_TOUCH)f.focus({preventScroll:true});}
function pickChoice(i){if(!DLG.choices||!DLG.choices[i]||DLG.typed<DLG.full.length)return;const c=DLG.choices[i];closeDlg();c.fn&&c.fn();}
function closeDlg(){DLG.open=false;$('dialog').hidden=true;const f=DLG.onEnd;DLG.onEnd=null;DLG.choices=null;renderer.domElement.focus({preventScroll:true});f&&f();}
function advance(){if(!DLG.open)return;if(DLG.typed<DLG.full.length){DLG.typed=DLG.full.length;$('dialog').querySelector('.txt').textContent=DLG.full;lineDone();return;}
  if(DLG.choices&&DLG.i===DLG.lines.length-1)return;if(DLG.i<DLG.lines.length-1){DLG.i++;startLine();}else closeDlg();}
function lineDone(){if(DLG.choices&&DLG.i===DLG.lines.length-1)showChoices();else $('dialog').querySelector('.more').hidden=false;}
$('dialog').addEventListener('click',()=>advance());

/* extra sounds */
SND.wrong=function(){if(!A.ready)return;const t=A.ctx.currentTime;tone(330,t,.18,'triangle',.08,A.sfx);tone(262,t+.16,.3,'triangle',.08,A.sfx);};
SND.stamp=function(){if(!A.ready)return;const t=A.ctx.currentTime;nburst(t,.12,'lowpass',400,1,.5,A.sfx);tone(110,t,.15,'sine',.3,A.sfx);[784,988,1175].forEach((f,i)=>tone(f,t+.2+i*.09,.5,'sine',.06,A.sfx));};

/* ================================================================
   Quest markers (floating signs above each station)
   ================================================================ */
const MKT={};
function markerTex(ch,state){const k=ch+state;if(MKT[k])return MKT[k];const [c,g]=C2(128,160);
  g.fillStyle=state==='done'?'#d9573b':state==='info'?'#2b2f6a':'#f3ead9';g.beginPath();g.arc(64,64,54,0,7);g.fill();
  g.beginPath();g.moveTo(44,108);g.lineTo(84,108);g.lineTo(64,150);g.fill();
  g.strokeStyle=state==='todo'?'#d9573b':'rgba(255,255,255,.85)';g.lineWidth=6;g.beginPath();g.arc(64,64,46,0,7);g.stroke();
  g.fillStyle=state==='todo'?'#2a1c14':'#fff';g.font=`800 56px ${FM}`;g.textAlign='center';g.textBaseline='middle';g.fillText(state==='done'?'✓':ch,64,68);
  const t=new T.CanvasTexture(c);return MKT[k]=t;}
const MARKERS=[];
function addMarker(getPos,ch,getState,h=2.9){const s=new T.Sprite(new T.SpriteMaterial({map:markerTex(ch,'todo'),depthTest:false,transparent:true,fog:false}));s.renderOrder=20;s.scale.set(.9,1.12,1);scene.add(s);
  const m={s,getPos,ch,getState,h,state:null,ph:rand()*6};MARKERS.push(m);return m;}
function updateMarkers(){for(const m of MARKERS){const p=m.getPos();if(!p){m.s.visible=false;continue;}m.s.visible=started;const st=m.getState();if(st!==m.state){m.state=st;m.s.material.map=markerTex(m.ch,st);m.s.material.needsUpdate=true;}
  m.s.position.set(p.x,p.y+m.h+Math.sin(time*2+m.ph)*.12,p.z);const d=camera.position.distanceTo(m.s.position);const k=clamp(d/14,1,4.2);m.s.scale.set(.9*k,1.12*k,1);}}

/* ================================================================
   New props: crossing guard, countdown board, time machine
   ================================================================ */
const GUARD={pos:new T.Vector3(6.6,0,-24.4)};
(function(){const g=person({skin:'#e6c4a4',shirt:'#f2c230',bottom:'#3b4a6a',legs:'#3b4a6a',shoes:'#2a2522',hair:'#3a2a24',hat:'cap',capCol:'#f2c230'});
  g.g.position.set(6.6,0,-24.4);g.g.rotation.y=-PI/2;g.arms[1].rotation.x=-1.3;scene.add(g.g);
  const fl=new T.Group();fl.position.set(-.21,1.0,.3);g.g.add(fl);mk(cy(.012,.012,.7,5),M.white,0,.35,0,fl);
  const f=mk(new T.PlaneGeometry(.34,.24),lam('#e84a2a',{side:T.DoubleSide}),.17,.58,0,fl,false);GUARD.p=g;})();
const BOARD={pos:new T.Vector3(26.2,0,-34.2)};
(function(){const g=new T.Group();g.position.set(27.4,0,-34.4);g.rotation.y=-PI/2;g.userData.dyn=true;scene.add(g);
  [-1,1].forEach(s=>mk(cy(.05,.05,2.2,8),M.metalDark,s*.9,1.1,0,g));mk(bx(2.1,1.35,.08),lam('#2b2f6a'),0,1.75,0,g);
  const [c,x]=C2(512,320);BOARD.canvas=c;BOARD.ctx=x;BOARD.tex=TX(c);
  const m=emMat(BOARD.tex,BOARD.tex,'signs');mk(new T.PlaneGeometry(1.96,1.22),m,0,1.75,.05,g,false);const b=mk(new T.PlaneGeometry(1.96,1.22),m,0,1.75,-.05,g,false);b.rotation.y=PI;
  addCol(27.2,27.6,-35.4,-33.4,2.5);})();
function daysLeft(ds){const d=new Date(ds+'T00:00:00');if(isNaN(d))return null;const n=new Date();n.setHours(0,0,0,0);return Math.round((d-n)/864e5);}
function drawBoard(){const g=BOARD.ctx;g.fillStyle='#f6f2e6';g.fillRect(0,0,512,320);g.fillStyle='#2b2f6a';g.fillRect(0,0,512,70);
  g.fillStyle='#fff';g.font=`800 36px ${FM}`;g.textAlign='left';g.textBaseline='middle';g.fillText('倒數看板',24,36);g.font=`700 18px ${FG}`;g.fillStyle='#e8b33c';g.fillText('COUNTDOWN',200,38);
  const rows=CFG.countdowns.filter(c=>c.name&&c.date).slice(0,4);
  if(!rows.length){g.fillStyle='#6a6458';g.font=`500 24px ${FG}`;g.fillText('（老師還沒設定倒數項目）',24,180);}
  rows.forEach((c,i)=>{const y=110+i*54,d=daysLeft(c.date);g.fillStyle='#1d1b22';g.font=`700 26px ${FG}`;g.textAlign='left';g.fillText(c.name.slice(0,14),24,y);
    g.textAlign='right';g.fillStyle=d!=null&&d<=7?'#c8322b':'#2b2f6a';g.font=`800 34px ${FG}`;g.fillText(d==null?'—':d>0?`${d} 天`:d===0?'今天':'已結束',488,y);
    g.strokeStyle='rgba(0,0,0,.1)';g.beginPath();g.moveTo(24,y+27);g.lineTo(488,y+27);g.stroke();});
  BOARD.tex.needsUpdate=true;}
drawBoard();
const TM={pos:new T.Vector3(12,0,-35.2)};
(function(){const g=new T.Group();g.position.copy(TM.pos);g.userData.dyn=true;scene.add(g);
  mk(cy(1.05,1.2,.3,20),M.metalDark,0,.15,0,g);mk(cy(.9,.9,.1,20),lam('#c9a24a'),0,.35,0,g);
  const gm=new T.MeshLambertMaterial({color:col('#9fd8e8'),transparent:true,opacity:.35,emissive:col('#7fe0ff'),emissiveIntensity:.35});EM.store.push(gm);
  const dome=mk(new T.SphereGeometry(.85,20,14,0,PI*2,0,PI*.62),gm,0,.4,0,g,false);
  const ring=new T.Mesh(new T.TorusGeometry(1.05,.06,8,32),new T.MeshBasicMaterial({color:col('#7fe0ff')}));ring.rotation.x=PI/2;ring.position.y=1.1;g.add(ring);TM.ring=ring;
  mk(bx(.14,1.1,.14),M.metal,1.25,.55,0,g);const [c,x]=C2(128,64);x.fillStyle='#1d1b22';x.fillRect(0,0,128,64);x.fillStyle='#7fe0ff';x.font=`800 26px ${FM}`;x.textAlign='center';x.textBaseline='middle';x.fillText('時光機',64,33);
  const pm=emMat(TX(c),null,'signs');mk(new T.PlaneGeometry(.6,.3),pm,1.25,1.2,.08,g,false);
  addGlow(0,1.1,0,4,'#7fe0ff','always',.35,g);addCol(10.9,13.1,-36.3,-34.1,2);})();

/* ================================================================
   Interactions
   ================================================================ */
const INT=[];
function inter(pos,r,label,act,extra={}){INT.push(Object.assign({pos,r,label,act},extra));}
const buy=(price,fn)=>{if(W.coins<price){say(null,[`金幣不夠喔（需要 ${price}，你有 ${W.coins}）。去答題賺金幣吧！`]);return;}W.coins-=price;renderPouch();save();fn();};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// --- stations ---
function runStation(st){const sp=SPOTS[st.spot]||{},who=sp.who||st.subject,done=W.st[st.id];
  if(!st.qs.length){say(who,['這一關還沒有題目，請等老師出題。']);return;}
  if(done){choose(who,`你已經完成「${st.title||st.subject}」，答對 ${done.c}/${done.t} 題。要再練習一次嗎？（練習不計分，也不會拿金幣）`,[{label:'再練習一次',fn:()=>quiz(st,true)},{label:'離開',fn:null}]);return;}
  choose(who,st.intro||`這裡是${st.subject}關卡，準備好了嗎？`,[{label:`開始挑戰（${st.qs.length} 題）Start`,fn:()=>quiz(st,false)},{label:'等一下再來',fn:null}]);}
function quiz(st,practice){const qs=st.qs.filter(q=>q&&q.q&&Array.isArray(q.o)&&q.o[q.a]);let i=0,c=0;const tag=`${st.subject}｜${st.title||''}`;
  const next=()=>{if(i>=qs.length){finish();return;}const q=qs[i];const opts=shuffle(q.o.map((t,k)=>({t:String(t||'').trim(),k})).filter(o=>o.t));
    choose(`${tag}　第 ${i+1} / ${qs.length} 題`,q.q,opts.map(o=>({label:o.t,fn:()=>answer(o.k===+q.a,q)})));};
  const answer=(ok,q)=>{i++;if(ok){c++;if(!practice){W.coins+=CFG.coinsPerCorrect;renderPouch();save();}SND.pick();say('答對了！ Correct!',[(practice?'':`+${CFG.coinsPerCorrect} 金幣。`)+(q.e?` ${q.e}`:'')||'太棒了！'],{onEnd:next});}
    else{SND.wrong();say('再想想… Try again next time',[`正確答案是「${q.o[q.a]}」。${q.e?' '+q.e:''}`],{onEnd:next});}};
  const finish=()=>{if(!practice){W.st[st.id]={c,t:qs.length,at:Date.now()};save();renderPouch();SND.stamp();toast(`獲得印章：${st.subject}`);}
    say(practice?'練習結束':'完成關卡！',[practice?`這次答對 ${c}/${qs.length} 題。`:`答對 ${c}/${qs.length} 題，獲得「${st.subject}」印章！按 Q 可以看集章卡。`]);};
  if(!qs.length){say(null,['這一關的題目還沒設定完成。']);return;}next();}
const FLAVOR={
  books:()=>say('汐見書店',['櫥窗裡有褪色的小說，玻璃上貼著十月的潮汐表。']),
  cafe:()=>say('喫茶 しおさい',['Coffee 450 · Cream soda 550。老闆在窗邊的位子睡著了，臉上蓋著報紙。']),
  diner:()=>say('うみねこ食堂',['今日定食：烤鯖魚。門簾後面的收音機正在放老歌。']),
  candy:()=>choose('駄菓子屋','一整排十元零食。阿嬤正在寫填字遊戲。',[{label:'買一包零食（10 金幣）',fn:()=>buy(10,()=>{addItem('零食');say(null,['阿嬤頭也不抬地收下金幣：「別掉屑屑喔。」']);})},{label:'只是看看',fn:null}]),
  barber:()=>say('理容なみ',['理髮店的三色燈打烊後還在轉，沒人知道開關在哪裡。']),
  fish:()=>say('鮮魚たけうち',['鐵捲門上貼著紙條：「今天公休，明天早上七點見（看海的心情）。」']),
  bath:()=>say('松の湯',['公共澡堂，門口飄出熱氣。櫃台阿姨在看棒球轉播。']),
  shop:()=>say('やまもと',['櫃台上的招財貓一直在招手。']),
  bus:()=>say('村田爺爺',[pick(['我每天都坐在這裡看海，看了四十年。','平交道的鈴聲，我聽了一輩子。','去防波堤跟健叔打招呼吧，他從來沒釣到魚。'])]),
  pier:()=>say('健叔',[pick(['剛剛還有竹莢魚上鉤……剛剛。','小心消波塊，裡面住著貓。別問我為什麼。','看到海上那片白光嗎？那是捕魷魚的船。'])]),
  shrine:()=>choose('山上的神社','香油錢箱有老杉木的味道，一條粗繩掛著鈴鐺。',[{label:'搖鈴許願（5 金幣）',fn:()=>buy(5,()=>{SND.suzu();setTimeout(()=>say(null,['鞠躬兩次、拍手兩次，你許了一個安靜的願望。']),2300);})},{label:'抽籤（10 金幣）',fn:()=>buy(10,()=>{addItem('籤詩');say('抽籤',[pick(['大吉：你等待的事，會搭傍晚的火車來。','中吉：弄丟的東西，會在水邊找回來。','小吉：下一個小小的邀請，答應它。','吉：今天走遠一點的路回家。','末吉：種子已經種下了，耐心等。'])]);})},{label:'安靜離開',fn:null}]),
  tree:()=>say('大樟樹',['比小鎮還老的樟樹。風吹過葉子的聲音，像海浪一樣。']),
  ema:()=>say('許願牌',[pick(['「希望阿嬤的膝蓋在秋祭前好起來。」','「希望有一天能在防波堤看到綠閃光。」','「希望貓咪都胖胖的。」—健叔'])]),
  light:()=>say('汐見港東防波堤燈塔',['1961 年開始發光。每 4 秒閃一次紅光。']),
  phone:()=>{SND.dial();say('公共電話',['綠色公共電話還收十元硬幣。你拿起話筒，聽到長長的嘟聲，然後輕輕掛上。']);},
  post:()=>say('郵筒',['紅色郵筒。收信時間：10:30、15:00。'])};
Object.entries(SPOTS).forEach(([key,sp])=>{
  const st=()=>CFG.stations.find(s=>s.spot===key);
  inter(sp.pos,sp.r,()=>{const s=st();return s?`${s.subject}關卡：${s.title||sp.name}`:({bus:'和村田爺爺聊天',pier:'和健叔聊天',shrine:'站在神社前',light:'看燈塔的牌子',phone:'拿起公共電話',post:'看看郵筒',tree:'抬頭看大樟樹',ema:'看許願牌'}[key]||`看看${sp.name}`);},
    ()=>{const s=st();if(s)runStation(s);else FLAVOR[key]&&FLAVOR[key]();});
  addMarker(()=>st()?sp.pos:null,'!',()=>{const s=st();return s&&W.st[s.id]?'done':'todo';},key==='bus'?2.6:key==='pier'?2.9:3.1);});
// fix marker chars to subject
MARKERS.forEach((m,i)=>{const key=Object.keys(SPOTS)[i];const s=CFG.stations.find(x=>x.spot===key);if(s)m.ch=(s.subject||'關')[0];});
// --- rewards: vending & konbini ---
const DRINK_ZH={a:[['麥茶','一罐冰麥茶掉下來，冰得手都濕了。'],['彈珠汽水','一瓶彈珠汽水，搖一搖玻璃珠會叮叮響。'],['可爾必思汽水','酸酸甜甜，像整個夏天一次喝下去。']],
  b:[['熱玉米濃湯','熱熱的玉米濃湯。最後幾顆玉米永遠倒不出來。'],['熱奶茶','溫暖的奶茶，要用兩隻手捧著。'],['熱可可','熱可可，喝完嘴巴旁邊有一圈咖啡色。']],
  c:[['哈密瓜汽水','綠得不可思議的哈密瓜汽水。'],['礦泉水','冰涼的白開水，最解渴。'],['運動飲料','喝完覺得可以一路跑到燈塔。']],
  d:[['綠茶','冰綠茶，有一點點苦。'],['烏龍茶','清爽的烏龍茶。'],['柳橙汁','一罐柳橙汁，酸得眼睛瞇起來。']]};
VENDS.forEach(v=>inter(v.pos,1.5,'用自動販賣機（獎勵）',()=>{const set=DRINK_ZH[v.set]||DRINK_ZH.a;
  choose('自動販賣機',v.set==='b'?`紅色標籤是「あったか〜い」熱飲。你有 ${W.coins} 金幣。`:`藍色標籤是「つめた〜い」冰飲。你有 ${W.coins} 金幣。`,[...set.map(([n,l])=>({label:`${n}　20 金幣`,fn:()=>buy(20,()=>{addItem(n);SND.vend(v.pos);setTimeout(()=>say(null,[`喀咚！${l}`]),900);})})),{label:'不用了',fn:null}]);}));
inter(KONBINI.door,2.4,'進入便利商店（獎勵）',()=>{SND.chime();choose('ひだまりマート','「歡迎光臨～」冷氣迎面吹來。你有 '+W.coins+' 金幣。',[
  {label:'鮭魚飯糰　30 金幣',fn:()=>buy(30,()=>{addItem('飯糰');say(null,['照著一、二、三的順序撕開包裝，海苔脆脆的。成功！']);})},
  {label:'蘇打冰棒　20 金幣',fn:()=>buy(20,()=>{addItem('冰棒');say(null,['淡藍色的蘇打冰棒。走到海邊前一定會融化。']);})},
  {label:'小魚乾（給貓咪）　30 金幣',fn:()=>buy(30,()=>{addItem('小魚乾');say(null,['一小包小魚乾。現在全鎮的貓都聞得到了。拿去餵貓，牠會跟著你走！']);})},
  {label:'閃亮貼紙　50 金幣',fn:()=>buy(50,()=>{addItem('閃亮貼紙');say(null,['一張會反光的海浪貼紙。可以貼在集章卡上！']);})},
  {label:'看看雜誌就好',fn:()=>say(null,['旅遊雜誌寫著「十個祕密海邊小鎮」，裡面沒有汐見町。太好了。'])}]);});
inter(new T.Vector3(38,.9,-34.1),1.8,'看車站站牌',()=>{let eta;
  if(TRAIN.state==='stop')eta='火車正停在月台，車門開著。';else if(TRAIN.state==='run'){const d=Math.abs(TRAIN.x-48);eta=`下一班車大約 ${Math.max(5,Math.round(d/9))} 秒後到站，注意聽平交道的鈴聲。`;}else eta='下一班車再一兩分鐘就會從隧道出來。';
  say('汐見駅 · Shiomi Station',['無人車站。刷卡請到綠色的柱子。',eta]);});
inter(BOARD.pos,2,'看倒數看板',()=>{const rows=CFG.countdowns.filter(c=>c.name&&c.date);const lines=rows.length?rows.map(c=>{const d=daysLeft(c.date);return `${c.name}：${d==null?'日期未設定':d>0?`還有 ${d} 天（${c.date.slice(5).replace('-','/')}）`:d===0?'就是今天！':`已經過了 ${-d} 天`}`;}).join('\n'):'老師還沒設定倒數項目。';
  const all=allStamps();say('倒數看板 Countdown',[lines,`你的闖關進度：${all.filter(s=>stampDone(s.id)).length} / ${all.length} 個印章。`]);});
inter(TM.pos,2.2,'查看時光機',()=>say('時光機 Time Machine',['面板上寫著：「目的地——部落地圖」。','……還在建造中。等新地圖完成，就可以出發了！']));
function sitAt(pos,face){P.sit={pos:pos.clone(),face};P.pos.copy(pos);}
inter(new T.Vector3(46,.9,-34.4),1.4,'坐在長椅上等車',()=>sitAt(new T.Vector3(46,.92,-35),0),{sit:true});
inter(new T.Vector3(-15,0,-42.9),1.6,'坐在堤防上看海',()=>sitAt(new T.Vector3(-15,.52,-44.05),PI),{sit:true});
// --- crossing safety mission ---
const MISSION={active:false,viol:0};
inter(GUARD.pos,2.4,()=>W.safety?'和導護阿姨說話':'安全任務：導護阿姨',()=>{
  if(W.safety){say('導護阿姨',['你已經學會安全過平交道了！每天上下學也要記得喔。']);return;}
  if(MISSION.active){say('導護阿姨',['記得：鈴聲響、紅燈閃、柵欄放下時，一定要在外面等。安全走到對面的海岸通路就完成了！']);return;}
  choose('導護阿姨','要去海邊，一定要經過前面的平交道。你知道怎麼安全通過嗎？',[{label:'接受任務：安全通過平交道',fn:()=>{MISSION.active=true;MISSION.viol=0;
    say('導護阿姨',['規則一：聽到「噹噹噹」、看到紅燈閃，就不能進去。','規則二：柵欄放下時要在外面等，絕對不能鑽過去。','規則三：火車過了、柵欄升起來，左右看一看再走。','走到對面的海岸通路，就算完成任務！']);}},{label:'等一下',fn:null}]);});
addMarker(()=>GUARD.pos,'安',()=>W.safety?'done':'todo',2.3);
addMarker(()=>BOARD.pos,'倒',()=>'info',2.6);
addMarker(()=>TM.pos,'時',()=>'info',2.4);
function questTick(dt){if(!started)return;W.time+=dt;
  if(MISSION.active&&!W.safety){const inX=Math.abs(P.pos.x)<4.8,inZ=P.pos.z>-32.4&&P.pos.z<-27.6;
    if(inX&&inZ&&(xingActive||gateK>.05)){MISSION.viol++;P.pos.set(0,0,-24.2);P.vel.set(0,0,0);SND.wrong();say('導護阿姨',['危險！警報響的時候不能進入平交道。','回到這裡，等火車過了、柵欄升起來再走一次。']);}
    else if(P.pos.z<-34.5&&Math.abs(P.pos.x)<40){W.safety={pass:true,viol:MISSION.viol};MISSION.active=false;W.coins+=20;save();renderPouch();SND.stamp();toast('獲得印章：安全');
      say('導護阿姨',[MISSION.viol?`完成了！剛剛有 ${MISSION.viol} 次太急，下次要記得等喔。+20 金幣`:'做得好！你安全通過平交道了。+20 金幣']);}}}
// --- cats ---
['小玉','墨墨','橘子','海苔'].forEach((n,i)=>{if(CATS[i])CATS[i].name=n;});
CATS.forEach(c=>inter(c.g.position,1.4,()=>`摸摸${c.name}`,()=>{
  SND.meow(c.g.position);
  if(W.items['小魚乾']){addItem('小魚乾',-1);c.follow=150;c.state='follow';say(null,[`你拿出一條小魚乾。${c.name}決定跟著你走了！`]);}
  else{setTimeout(()=>SND.purr(c.g.position),500);say(null,[pick([`${c.name}蹭了蹭你的手，發出呼嚕聲。`,`${c.name}讓你摸了三下，然後轉頭看海。`,`${c.name}翻肚了。這是陷阱，但你還是摸了。`,`${c.name}：「喵～」（Meow! 貓叫聲的英文是 meow。）`])]);}
  heart(c.g.position);},{cat:c}));
// --- sea glass with English words ---
function refreshGlass(){GLASS.forEach((g,i)=>{const got=W.glass.includes(i);g.got=got;g.m.visible=!got;g.s.visible=!got;});}
GLASS.forEach((g,idx)=>inter(new T.Vector3(g.x,beachH(g.z),g.z),1.3,'撿起海玻璃',()=>{if(W.glass.includes(idx))return;W.glass.push(idx);refreshGlass();W.coins+=5;save();renderPouch();SND.pick();
  const w=CFG.words[idx]||{en:'sea',zh:'海'};const lines=[`海玻璃上刻著一個英文單字：「${w.en}」`,`意思是「${w.zh}」。唸唸看：${w.en}！　+5 金幣（${W.glass.length}/5）`];
  if(W.glass.length>=5){lines.push('五片都找到了！它們在口袋裡叮叮響，像小小的風鈴。獲得「海灘英文單字」印章！');SND.stamp();toast('獲得印章：海灘英文單字');}
  say('海玻璃 Sea glass',lines);},{glass:g}));
const HEARTS=[];
const heartTex=(()=>{const [c,g]=C2(64,64);g.fillStyle='#ff8fa0';g.font=`48px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('♡',32,34);return new T.CanvasTexture(c);})();
function heart(p){const s=new T.Sprite(new T.SpriteMaterial({map:heartTex,transparent:true,depthWrite:false}));s.position.copy(p).add(new T.Vector3(0,.8,0));s.scale.set(.4,.4,1);scene.add(s);HEARTS.push({s,t:0});}

/* ================================================================
   Stamp card & submission
   ================================================================ */
function parseForm(link){if(!link)return null;const m=String(link).trim().match(/^(https:\/\/docs\.google\.com\/forms\/[^?#]+)/);if(!m)return null;
  const base=m[1].replace(/\/(edit|prefill|formResponse|viewform)$/,'')+'/viewform';
  const ent=[...String(link).matchAll(/entry\.(\d+)=([^&#]*)/g)].map(x=>{let v='';try{v=decodeURIComponent(x[2].replace(/\+/g,' '));}catch(e){}return {id:x[1],v};});
  const ids={};ent.forEach((e,i)=>{const n=parseInt(e.v,10);const key=n>=1&&n<=4&&!ids[n]?n:i+1;if(key<=4)ids[key]=e.id;});
  return {base,ids,count:Object.keys(ids).length};}
function totals(){let c=0,t=0;CFG.stations.forEach(s=>{const r=W.st[s.id];if(r){c+=r.c;t+=r.t;}});return {c,t};}
function scoreLine(){const {c,t}=totals(),all=allStamps(),n=all.filter(s=>stampDone(s.id)).length;return `答對 ${c}/${t}${t?`（${Math.round(c/t*100)}%）`:''}・印章 ${n}/${all.length}`;}
function detailLine(){const parts=CFG.stations.map(s=>{const r=W.st[s.id];return `${s.subject}${s.title?`〈${s.title}〉`:''} ${r?`${r.c}/${r.t}`:'未完成'}`;});
  parts.push(`平交道 ${W.safety?('通過'+(W.safety.viol?`（違規${W.safety.viol}次）`:'')):'未完成'}`);parts.push(`海玻璃 ${W.glass.length}/5`);parts.push(`金幣 ${W.coins}`);parts.push(`遊玩 ${Math.round(W.time/60)} 分鐘`);return parts.join('｜');}
function submitURL(){const f=parseForm(CFG.formLink);if(!f||!f.count)return null;const vals={1:W.seat,2:W.name,3:scoreLine(),4:detailLine()};
  return f.base+'?usp=pp_url&'+Object.entries(f.ids).map(([k,id])=>`entry.${id}=${encodeURIComponent(vals[k]||'')}`).join('&');}
function renderCard(){$('cardWho').textContent=`${W.seat} 號　${W.name}`;
  const {c,t}=totals(),all=allStamps(),n=all.filter(s=>stampDone(s.id)).length;
  $('cardSum').innerHTML='';[[`${n}/${all.length}`,'印章'],[`${c}/${t}`,'答對題數'],[W.coins,'金幣']].forEach(([a,b])=>{const d=document.createElement('span');const bb=document.createElement('b');bb.textContent=a;d.appendChild(bb);d.appendChild(document.createTextNode(b));$('cardSum').appendChild(d);});
  const ol=$('stampList');ol.innerHTML='';all.forEach(s=>{const li=document.createElement('li');const done=stampDone(s.id);li.className=done?'done':'';
    const st=document.createElement('span');st.className='stamp';st.textContent=s.ch||(s.subject||'關')[0];
    const tx=document.createElement('span');tx.className='st-txt';const b=document.createElement('b');b.textContent=s.title?`${s.subject}・${s.title}`:s.subject;const sp=document.createElement('span');
    const r=W.st[s.id];sp.textContent=done?(r?`答對 ${r.c}/${r.t}`:s.id==='safety'?(W.safety.viol?`通過（違規 ${W.safety.viol} 次）`:'通過'):'完成'):`地點：${s.where}`;
    tx.appendChild(b);tx.appendChild(sp);li.appendChild(st);li.appendChild(tx);ol.appendChild(li);});
  const url=submitURL(),a=$('submitLink');
  if(url){a.href=url;a.removeAttribute('aria-disabled');$('submitNote').textContent=n<all.length?`還有 ${all.length-n} 個印章沒拿到，也可以先繳交。按下後會打開 Google 表單，確認資料後按「提交」。`:'全部完成！按下後會打開 Google 表單，確認資料後按「提交」。';}
  else{a.href='#';a.setAttribute('aria-disabled','true');$('submitNote').textContent='老師還沒設定成績表單，先繼續闖關吧！';}}
function openCard(){if(!started)return;renderCard();$('card').hidden=false;$('cardClose').focus({preventScroll:true});}
function closeCard(){$('card').hidden=true;$('switchUser').textContent='換人 · 登出';$('switchUser').dataset.arm='';renderer.domElement.focus({preventScroll:true});}
$('cardClose').onclick=closeCard;$('card').addEventListener('click',e=>{if(e.target===$('card'))closeCard();});
$('submitLink').addEventListener('click',e=>{if($('submitLink').getAttribute('aria-disabled')==='true'){e.preventDefault();return;}save();toast('已打開 Google 表單，記得按「提交」');});
$('switchUser').onclick=()=>{const b=$('switchUser');if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定換人？再按一次';return;}save();logout();};
$('bCard').onclick=()=>$('card').hidden?openCard():closeCard();

/* ================================================================
   Teacher mode
   ================================================================ */
const RESET=':root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}';
const FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">';
function buildDoc(cfg){const esc=s=>String(s).replace(/<\/script/gi,'<\\/script');const src=id=>document.getElementById(id).textContent;
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+RESET+'</style></head><body>\n<title>'+esc(document.title)+'</title>\n'+FONTS+'\n<style id="css">'+src('css')+'</style>\n<script type="application/json" id="quest">'+esc(JSON.stringify(cfg))+'<\/script>\n<script id="engine">'+src('engine')+'<\/script>\n<script id="game">'+src('game')+'<\/script>\n</body></html>';}
let ED=null,tpTab='st';
async function detectTeacher(){let ok=location.hash.replace('#','')==='teacher';
  try{if(!ok&&window.claude&&typeof window.claude.use==='function'){const u=await window.claude.use('user');if(u&&typeof u.canEdit==='function')ok=await u.canEdit();}}catch(e){}
  if(ok)$('bTeacher').hidden=false;}
detectTeacher();
function el(tag,props={},kids=[]){const e=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')e.textContent=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!=null)e.setAttribute(k,v);}(Array.isArray(kids)?kids:[kids]).forEach(c=>c!=null&&e.appendChild(typeof c==='string'?document.createTextNode(c):c));return e;}
function fld(label,input,wide){return el('label',{class:'fld'+(wide?' wide':'')},[label,input]);}
function inp(val,on,attrs={}){const i=el('input',Object.assign({type:'text'},attrs));i.value=val==null?'':val;i.addEventListener('input',()=>{on(i.value);dirty();});return i;}
function dirty(){$('tpStatus').textContent='有尚未儲存的修改';}
function openTeacher(){ED=JSON.parse(JSON.stringify(CFG));$('teacher').hidden=false;$('tpStatus').textContent='';renderTP();}
function closeTeacher(){$('teacher').hidden=true;renderer.domElement.focus({preventScroll:true});}
$('bTeacher').onclick=openTeacher;$('tpClose').onclick=closeTeacher;
document.querySelectorAll('.tp-tabs button').forEach(b=>b.onclick=()=>{tpTab=b.dataset.tab;document.querySelectorAll('.tp-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));renderTP();});
function parseBulk(text){return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const p=l.split(/\t|｜|\|/).map(x=>x.trim());if(p.length<3)return null;return {q:p[0],o:[p[1],p[2],p[3]||'',p[4]||''],a:0,e:p[5]||''};}).filter(Boolean);}
function renderTP(){const B=$('tpBody');B.innerHTML='';
  if(tpTab==='st'){
    B.appendChild(el('p',{class:'help',text:'每一關放在小鎮的一個地點，學生走過去按 E 就會開始答題。每題選一個正確答案（左邊的圓點），學生看到的選項順序會自動打亂。改完記得按右上角「儲存並發布」。'}));
    ED.stations.forEach((s,si)=>{const card=el('div',{class:'st-card'});
      const used=new Set(ED.stations.filter((x,j)=>j!==si).map(x=>x.spot));
      const sel=el('select');Object.entries(SPOTS).forEach(([k,sp])=>{const o=el('option',{value:k,text:sp.name+(used.has(k)?'（已被使用）':'')});if(k===s.spot)o.selected=true;sel.appendChild(o);});
      sel.addEventListener('change',()=>{s.spot=sel.value;dirty();renderTP();});
      card.appendChild(el('div',{class:'st-top'},[fld('科目',inp(s.subject,v=>s.subject=v,{placeholder:'例：國語'})),fld('關卡名稱',inp(s.title,v=>s.title=v,{placeholder:'例：蚊帳大使'})),fld('地點（學生要走去哪裡）',sel)]));
      const ta=el('textarea',{placeholder:'學生按 E 時，關主說的第一句話'});ta.value=s.intro||'';ta.addEventListener('input',()=>{s.intro=ta.value;dirty();});card.appendChild(el('div',{class:'st-top'},[fld('關主開場白',ta,true)]));
      s.qs.forEach((q,qi)=>{const row=el('div',{class:'q-row'});row.appendChild(el('div',{class:'q-num',text:String(qi+1)}));const main=el('div',{class:'q-main'});
        main.appendChild(fld('題目',inp(q.q,v=>q.q=v)));const opts=el('div',{class:'q-opts'});
        for(let k=0;k<4;k++){const r=el('input',{type:'radio',name:`ans-${si}-${qi}`,'aria-label':`選項 ${k+1} 是正確答案`});r.checked=+q.a===k;r.addEventListener('change',()=>{q.a=k;dirty();});
          opts.appendChild(el('div',{class:'q-opt'},[r,inp(q.o[k],v=>q.o[k]=v,{placeholder:k===0?'選項 1':k<2?'選項 2':`選項 ${k+1}（可留空）`})]));}
        main.appendChild(opts);main.appendChild(fld('解說（答完後顯示，可留空）',inp(q.e,v=>q.e=v)));
        main.appendChild(el('div',{class:'q-tools'},[el('button',{type:'button',class:'btn small',text:'上移',onclick:()=>{if(qi>0){[s.qs[qi-1],s.qs[qi]]=[s.qs[qi],s.qs[qi-1]];dirty();renderTP();}}}),el('button',{type:'button',class:'btn small danger',text:'刪除這題',onclick:()=>{s.qs.splice(qi,1);dirty();renderTP();}})]));
        row.appendChild(main);card.appendChild(row);});
      const bulk=el('textarea',{placeholder:'一行一題：題目｜正確答案｜錯誤答案｜錯誤答案｜錯誤答案｜解說\n也可以從 Google 試算表直接複製貼上（每一欄一格）'});bulk.hidden=true;
      const addB=el('button',{type:'button',class:'btn small',text:'加入這些題目',onclick:()=>{const qs=parseBulk(bulk.value);if(!qs.length){$('tpStatus').textContent='沒有讀到題目，請確認格式。';return;}s.qs.push(...qs);dirty();renderTP();}});addB.hidden=true;
      card.appendChild(el('div',{class:'q-tools'},[el('button',{type:'button',class:'btn small',text:'＋ 新增一題',onclick:()=>{s.qs.push({q:'',o:['','','',''],a:0,e:''});dirty();renderTP();}}),
        el('button',{type:'button',class:'btn small',text:'批次貼上題目',onclick:()=>{bulk.hidden=!bulk.hidden;addB.hidden=bulk.hidden;}}),
        el('button',{type:'button',class:'btn small danger',text:'刪除這一關',onclick:e=>{const b=e.currentTarget;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定刪除？再按一次';return;}ED.stations.splice(si,1);dirty();renderTP();}})]));
      card.appendChild(bulk);card.appendChild(el('div',{class:'q-tools'},[addB]));B.appendChild(card);});
    B.appendChild(el('button',{type:'button',class:'btn',text:'＋ 新增關卡',onclick:()=>{const used=new Set(ED.stations.map(x=>x.spot));const free=Object.keys(SPOTS).find(k=>!used.has(k))||'books';
      ED.stations.push({id:'s'+Date.now().toString(36),spot:free,subject:'',title:'',intro:'',qs:[{q:'',o:['','','',''],a:0,e:''}]});dirty();renderTP();}}));}
  else if(tpTab==='cd'){B.appendChild(el('p',{class:'help',text:'顯示在車站旁「倒數看板」上，最多顯示前 4 項。學生走到看板按 E 也能看到。'}));
    ED.countdowns.forEach((c,i)=>{const d=inp(c.date,v=>c.date=v,{type:'date'});B.appendChild(el('div',{class:'row2'},[fld('項目名稱',inp(c.name,v=>c.name=v,{placeholder:'例：期中考'})),fld('日期',d),el('button',{type:'button',class:'btn small danger',text:'刪除',onclick:()=>{ED.countdowns.splice(i,1);dirty();renderTP();}})]));});
    B.appendChild(el('button',{type:'button',class:'btn',text:'＋ 新增倒數項目',onclick:()=>{ED.countdowns.push({name:'',date:''});dirty();renderTP();}}));}
  else if(tpTab==='wd'){B.appendChild(el('p',{class:'help',text:'海灘上藏了 5 片海玻璃，每片刻著一個英文單字。可以換成英文課本這一課的單字。'}));
    for(let i=0;i<5;i++){ED.words[i]=ED.words[i]||{en:'',zh:''};const w=ED.words[i];B.appendChild(el('div',{class:'row2'},[fld(`第 ${i+1} 片：英文`,inp(w.en,v=>w.en=v)),fld('中文意思',inp(w.zh,v=>w.zh=v)),el('span')]));}}
  else if(tpTab==='fm'){B.appendChild(el('h3',{text:'用 Google 表單收成績'}));
    B.appendChild(el('ol',{class:'steps'},[el('li',{},['到 Google 表單建立新表單，新增 ',el('b',{text:'4 題「簡答」'}),'，順序是：座號、姓名、成績、明細。']),
      el('li',{},['（建議）在「設定」打開「收集電子郵件地址」，就知道是哪個學生的帳號交的。']),
      el('li',{},['按右上角「⋮」→ ',el('b',{text:'取得預先填入的連結'}),'，四格依序填 ',el('b',{text:'1、2、3、4'}),'，按「取得連結」→「複製連結」。']),
      el('li',{},['把連結貼到下面，按「儲存並發布」。之後在表單的「回覆」分頁可以連到 Google 試算表，看全班成績。'])]));
    const st=el('p',{class:'help'});const upd=()=>{const f=parseForm(ED.formLink);st.textContent=!ED.formLink?'還沒貼上連結。':!f?'這看起來不是 Google 表單的連結，請貼上「預先填入的連結」。':f.count<4?`只讀到 ${f.count} 個欄位，請確認四題都有填 1、2、3、4。`:'✓ 讀到 4 個欄位，可以使用。';};
    const i=inp(ED.formLink,v=>{ED.formLink=v.trim();upd();},{placeholder:'https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry…'});B.appendChild(fld('預先填入的連結',i,true));upd();B.appendChild(st);
    const test=el('a',{class:'btn small',target:'_blank',rel:'noopener',text:'用測試資料打開表單'});test.addEventListener('click',e=>{const f=parseForm(ED.formLink);if(!f||!f.count){e.preventDefault();return;}const v={1:'0',2:'測試',3:'答對 0/0',4:'這是老師的測試'};test.href=f.base+'?usp=pp_url&'+Object.entries(f.ids).map(([k,id])=>`entry.${id}=${encodeURIComponent(v[k])}`).join('&');});B.appendChild(test);}
  else if(tpTab==='ot'){B.appendChild(el('div',{class:'row2'},[fld('每答對一題得到的金幣',inp(ED.coinsPerCorrect,v=>ED.coinsPerCorrect=Math.max(0,parseInt(v,10)||0),{type:'number',min:'0'})),fld('學生一開始有的金幣',inp(ED.startCoins,v=>ED.startCoins=Math.max(0,parseInt(v,10)||0),{type:'number',min:'0'})),el('span')]));
    B.appendChild(el('p',{class:'help',text:'學生的闖關進度存在各自使用的平板上（用座號分開）。同一台平板給不同學生用時，請學生在集章卡按「換人」。'}));
    B.appendChild(el('button',{type:'button',class:'btn small danger',text:'清除這台裝置上所有學生的進度',onclick:e=>{const b=e.currentTarget;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定清除？再按一次';return;}
      try{Object.keys(localStorage).filter(k=>k.startsWith('shiomi-quest-v1:')).forEach(k=>localStorage.removeItem(k));}catch(err){}b.textContent='已清除';}}));}}
$('tpSave').onclick=async()=>{const st=$('tpStatus');
  ED.stations.forEach(s=>{s.qs=s.qs.filter(q=>q.q&&q.q.trim()&&q.o[q.a]&&String(q.o[q.a]).trim());});
  let art=null;try{if(window.claude&&typeof window.claude.use==='function')art=await window.claude.use('artifact');}catch(e){}
  if(!art){st.textContent='這個畫面不能儲存。請在 Claude 裡，用擁有這個頁面的帳號打開。';return;}
  st.textContent='儲存中…';$('tpSave').disabled=true;
  try{sessionStorage.setItem('shiomi-saved','1');}catch(e){}
  try{await art.publish(buildDoc(ED));st.textContent='已發布！頁面會自動重新載入。';}
  catch(err){try{sessionStorage.removeItem('shiomi-saved');}catch(e){}const c=err&&err.code;$('tpSave').disabled=false;
    st.textContent=(c==='not_writer'||c==='not_granted'||c==='consent_required'||c==='capability_disabled')?'只有老師（這個頁面的擁有者）可以儲存。':c==='conflict'?'頁面剛剛被更新過，正在載入最新版本，請再改一次。':c==='rate_limited'?'儲存太頻繁，請等一下再試。':c==='too_large'?'內容太多，無法儲存。':`儲存失敗，請稍後再試（${c||err}）。`;}};
try{if(sessionStorage.getItem('shiomi-saved')){sessionStorage.removeItem('shiomi-saved');setTimeout(()=>toast('題目已更新並發布'),800);}}catch(e){}

/* ================================================================
   Areas
   ================================================================ */
const AREAS=[
  {jp:'東防波堤',en:'East Breakwater 防波堤',t:(x,z)=>x>72&&x<78&&z<-44.5},
  {jp:'汐見浜',en:'Shiomi Beach 海灘',t:(x,z)=>z<-44.3},
  {jp:'汐見駅',en:'Shiomi Station 車站',t:(x,z)=>x>28&&x<64&&z>-36.5&&z<-31},
  {jp:'汐見踏切',en:'Railroad Crossing 平交道',t:(x,z)=>Math.abs(x)<9&&z>-35&&z<-24},
  {jp:'海岸通り',en:'Coast Road 海岸通路',t:(x,z)=>z<-33},
  {jp:'汐見神社',en:'Shrine on the Hill 山上神社',t:(x,z)=>x>-67&&x<-33&&z>46},
  {jp:'ひだまりマート',en:'Convenience Store 便利商店',t:(x,z)=>x>4&&x<26&&z>12.5&&z<30},
  {jp:'線路沿いの道',en:'Path by the Tracks 鐵道小路',t:(x,z)=>z<-22},
  {jp:'汐見銀座',en:'Shopping Street 商店街',t:(x,z)=>Math.abs(x)<7},
  {jp:'山手の住宅街',en:'Hillside Houses 住宅區',t:()=>true}];
let curArea=null,areaT=0,areaCool=0;
function areaCheck(){const a=AREAS.find(a=>a.t(P.pos.x,P.pos.z));if(a!==curArea){curArea=a;$('placeJp').textContent=a.jp;$('placeEn').textContent=a.en;
  if(areaCool<=0&&started){const at=$('areaTitle');at.querySelector('.jp').textContent=a.jp;at.querySelector('.en').textContent=a.en;at.classList.add('show');areaT=3.4;areaCool=6;}}}

/* ================================================================
   Input
   ================================================================ */
const keys={};let started=false,lastInput=0;
const cam={yaw:0,pitch:.2,dist:innerWidth<innerHeight?8.6:6.4,pos:new T.Vector3(),look:new T.Vector3()};
function setTime(i){todIdx=i;envFrom=blendState(S,S,0,{});envTo=PS[ORDER[i]];envK=0;clockBase=performance.now();$('tBtnLbl').textContent=PRESETS[ORDER[i]].jp;toast(`${PRESETS[ORDER[i]].jp} · ${['傍晚','夜晚','午後'][i]}`);}
function toggleCine(){document.body.classList.toggle('cine');$('bCine').setAttribute('aria-pressed',document.body.classList.contains('cine'));}
function toggleSound(){A.on=!A.on;$('bSound').setAttribute('aria-pressed',A.on);applyVolumes();}
function toggleMusic(){A.music=!A.music;$('bMusic').setAttribute('aria-pressed',A.music);applyVolumes();}
function toggleHelp(){const h=$('help');h.hidden=!h.hidden;$('bHelp').setAttribute('aria-pressed',!h.hidden);}
const uiOpen=()=>!$('card').hidden||!$('teacher').hidden;
let nearest=null;
function interact(){if(!started||uiOpen())return;if(DLG.open){advance();return;}
  if(P.sit){P.sit=null;P.pos.z+=(P.pos.z<-43?1.2:.9);return;}
  if(nearest){nearest.act();}}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();const tg=e.target&&e.target.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'){if(k==='escape'&&!$('teacher').hidden)closeTeacher();return;}
  if(!$('teacher').hidden){if(k==='escape')closeTeacher();return;}
  if(!started)return;
  if(!$('card').hidden){if(k==='escape'||k==='q')closeCard();return;}
  if(tg==='BUTTON'&&(k===' '||k==='enter'))return;
  keys[k]=true;lastInput=performance.now();
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(e.repeat)return;
  if(k==='e'||k==='enter'||k===' ')interact();
  else if(k==='q'&&!DLG.open)openCard();
  else if(k==='t')setTime((todIdx+1)%3);
  else if(k==='c')toggleCine();
  else if(k==='m')toggleSound();
  else if(k==='b')toggleMusic();
  else if(k==='h')toggleHelp();
  else if(k==='escape'){if(DLG.open&&!DLG.choices)closeDlg();$('help').hidden=true;$('bHelp').setAttribute('aria-pressed',false);}
  else if(/^[1-4]$/.test(k)&&DLG.open&&DLG.choices)pickChoice(+k-1);});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const cv=renderer.domElement;let drag=null;
cv.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);cv.classList.add('drag');lastInput=performance.now();cv.focus({preventScroll:true});});
cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;const s=e.pointerType==='touch'?1.4:1;
  cam.yaw-=dx*.0048*s;cam.pitch=clamp(cam.pitch+dy*.0036*s,-.12,1.15);lastInput=performance.now();});
const endDrag=e=>{if(drag&&drag.id===e.pointerId){drag=null;cv.classList.remove('drag');}};
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*(1+Math.sign(e.deltaY)*.08),2.8,14);},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
$('bTime').onclick=()=>setTime((todIdx+1)%3);$('bSound').onclick=toggleSound;$('bMusic').onclick=toggleMusic;$('bCine').onclick=toggleCine;$('bHelp').onclick=toggleHelp;
// touch
const STK={x:0,y:0,id:null};let touchRun=false;
if(IS_TOUCH){$('touch').hidden=false;const st=$('stick'),kn=$('knob');
  st.addEventListener('pointerdown',e=>{STK.id=e.pointerId;st.setPointerCapture(e.pointerId);mv(e);});
  const mv=e=>{if(STK.id!==e.pointerId)return;const r=st.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/50,y=(e.clientY-r.top-r.height/2)/50;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}STK.x=x;STK.y=y;kn.style.transform=`translate(${x*38}px,${y*38}px)`;lastInput=performance.now();};
  st.addEventListener('pointermove',mv);const up=e=>{if(STK.id!==e.pointerId)return;STK.id=null;STK.x=STK.y=0;kn.style.transform='';};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  $('tAct').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
  $('tCard').addEventListener('pointerdown',e=>{e.preventDefault();$('card').hidden?openCard():closeCard();});
  $('tRun').addEventListener('pointerdown',e=>{e.preventDefault();touchRun=!touchRun;$('tRun').setAttribute('aria-pressed',touchRun);});}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

/* ================================================================
   Login / start / logout
   ================================================================ */
function start(){if(started)return;started=true;audioInit();if(A.ctx&&A.ctx.state==='suspended')A.ctx.resume();$('title').classList.add('gone');document.body.classList.add('playing');
  cam.yaw=0;cam.pitch=camera.aspect<1?.26:.2;curArea=null;areaCool=0;setTimeout(()=>{if(started)$('title').hidden=true;},1500);cv.focus({preventScroll:true});}
$('loginForm').addEventListener('submit',e=>{e.preventDefault();const seat=$('inSeat').value.trim().replace(/[^0-9A-Za-z-]/g,''),name=$('inName').value.trim();const err=$('loginErr');
  if(!seat||!name){err.textContent='請填寫座號和姓名。';err.hidden=false;return;}err.hidden=true;
  const old=loadSeat(seat);
  Object.assign(W,{seat,name,coins:CFG.startCoins,items:{},glass:[],st:{},safety:null,time:0});
  if(old){Object.assign(W,old,{seat,name});W.glass=Array.isArray(W.glass)?W.glass:[];W.st=W.st||{};W.items=W.items||{};}
  save();refreshGlass();renderPouch();start();
  setTimeout(()=>toast(old?`歡迎回來，${name}！按 Q 看集章卡`:`${name}，歡迎來到汐見町！頭上有「!」的地方就是關卡`),1600);});
function logout(){closeCard();if(DLG.open)closeDlg();started=false;MISSION.active=false;P.sit=null;P.pos.set(0,0,24);P.vel.set(0,0,0);P.yaw=PI;
  CATS.forEach(c=>{c.follow=0;});Object.assign(W,{seat:'',name:'',coins:0,items:{},glass:[],st:{},safety:null,time:0});refreshGlass();renderPouch();
  document.body.classList.remove('playing');const t=$('title');t.hidden=false;t.classList.remove('gone');$('inSeat').value='';$('inName').value='';$('inSeat').focus({preventScroll:true});}
renderPouch();
