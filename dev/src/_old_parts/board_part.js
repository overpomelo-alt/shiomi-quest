/* ================================================================
   公告板: teacher news · daily tasks · resident requests · reading log
   ================================================================ */
const NB={pos:new T.Vector3(-5.1,0,15.2),tab:'news'};
(function(){const g=new T.Group();g.position.set(-5.9,0,15.2);g.rotation.y=PI/2;g.userData.dyn=true;scene.add(g);
  const wd=lam('#6e4c33'),wl=lam('#8a6446');
  [-1.05,1.05].forEach(x=>mk(bx(.14,2.5,.14),wd,x,1.25,0,g));
  mk(bx(2.3,1.45,.1),wl,0,1.55,0,g);mk(bx(2.5,.08,.5),lam('#3d4553'),0,2.52,0,g).rotation.x=.12;
  const [c,x]=C2(512,320);x.fillStyle='#b98f64';x.fillRect(0,0,512,320);speckle(x,512,320,3000,.12);
  const notes=[['#f6efdc',30,40,150,110,-.06],['#f3e2a8',200,26,130,120,.05],['#f6efdc',350,50,130,100,-.03],['#e8f0dc',60,175,140,110,.04],['#f6efdc',230,175,120,120,-.05],['#f3d6c8',370,180,110,100,.07]];
  notes.forEach(([col_,nx,ny,w,h,r])=>{x.save();x.translate(nx+w/2,ny+h/2);x.rotate(r);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(-w/2+3,-h/2+4,w,h);x.fillStyle=col_;x.fillRect(-w/2,-h/2,w,h);
    x.fillStyle='rgba(60,40,30,.55)';for(let k=0;k<4;k++)x.fillRect(-w/2+12,-h/2+22+k*18,w-24-(k%2)*20,4);x.fillStyle='#c8412b';x.beginPath();x.arc(0,-h/2+8,6,0,PI*2);x.fill();x.restore();});
  const m=emMat(TX(c),TX(c),'signs');mk(new T.PlaneGeometry(2.1,1.3),m,0,1.55,.06,g,false);
  const [tc,tx]=C2(256,64);tx.fillStyle='#3a2a20';tx.fillRect(0,0,256,64);tx.fillStyle='#f3ead9';tx.font=`800 34px ${FG}`;tx.textAlign='center';tx.textBaseline='middle';tx.fillText('公 告 板',128,34);
  mk(new T.PlaneGeometry(1.1,.28),new T.MeshBasicMaterial({map:TX(tc)}),0,2.4,.08,g,false);
  colLocal(g,-1.2,1.2,-.2,.2,3);})();
addMarker(()=>NB.pos,()=>'公告',()=>'info',3.1,{info:true});
inter(NB.pos,2.3,()=>newsUnseen()?'看公告板（有新消息！）':'看公告板',()=>openBoard());

// ---------- daily tasks
const DAILY_POOL=[
  {id:'quiz',t:'挑戰任何一個關卡',ev:'quiz',n:1},{id:'pass',t:'有一關全部答對',ev:'pass',n:1},
  {id:'cat',t:'摸摸 2 隻貓',ev:'catpet',n:2},{id:'feed',t:'餵寵物吃一次東西',ev:'feed',n:1,need:()=>!!W.pet},
  {id:'talk',t:'和 3 位鎮民說說話',ev:'talk',n:3},{id:'buy',t:'在販賣機或便利商店買東西',ev:'buy',n:1},
  {id:'beach',t:'到汐見浜（海灘）走走',ev:'visit:汐見浜',n:1},{id:'shrine',t:'爬到山上的神社',ev:'visit:汐見神社',n:1},
  {id:'station',t:'去車站看看',ev:'visit:汐見駅',n:1},{id:'sit',t:'找個地方坐下來休息',ev:'sit',n:1},
  {id:'read',t:'在公告板寫一則讀書心得',ev:'read',n:1},{id:'decor',t:'回房間佈置一下',ev:'decor',n:1}];
function todayStr(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dailyState(){const t=todayStr();if(!W.daily||W.daily.date!==t){let h=0;for(const ch of t+W.seat)h=(h*31+ch.charCodeAt(0))>>>0;
    const pool=DAILY_POOL.filter(d=>!d.need||d.need());const ids=[];while(ids.length<3&&pool.length){h=(h*1103515245+12345)>>>0;ids.push(pool.splice(h%pool.length,1)[0].id);}
    W.daily={date:t,ids,prog:{},done:[],bonus:false};}return W.daily;}
function dailyEvent(ev){if(!started||!W.seat)return;const D=dailyState();let changed=false;
  D.ids.forEach(id=>{const d=DAILY_POOL.find(x=>x.id===id);if(!d||d.ev!==ev||D.done.includes(id))return;D.prog[id]=(D.prog[id]||0)+1;changed=true;
    if(D.prog[id]>=d.n){D.done.push(id);W.coins+=15;renderPouch();SND.stamp&&A.ready&&SND.stamp();toast(`每日任務完成：${d.t}（+15 金幣）`);}});
  if(changed&&!D.bonus&&D.done.length>=D.ids.length){D.bonus=true;W.coins+=20;renderPouch();setTimeout(()=>toast('今天的每日任務全部完成！額外 +20 金幣'),1800);}
  if(changed){save();if(!$('board').hidden)renderBoard();}}

// ---------- resident requests
const REQS=[
  {id:'murata',who:'村田爺爺',t:'幫我買一個肉包',d:'「年紀大了，走不到便利商店……可以幫我買一個熱熱的肉包嗎？」（買到後回公告板交給我）',reward:40,
    ok:()=>(W.items['肉包']||0)>0,hint:()=>`便利商店櫃台可以買肉包。${(W.items['肉包']||0)>0?'你已經有肉包了！':''}`,take:()=>addItem('肉包',-1)},
  {id:'ken',who:'健叔',t:'撿 3 片海玻璃給我看',d:'「海邊的玻璃被海浪磨得圓圓的，像寶石一樣。撿 3 片來給我看看吧！」',reward:30,ok:()=>W.glass.length>=3,hint:()=>`目前 ${Math.min(3,W.glass.length)}/3 片`},
  {id:'guard',who:'導護阿姨',t:'和寵物成為好朋友',d:'「照顧動物也是一種責任喔。和你的寵物親密度到 Lv.2 再來找我。」',reward:30,ok:()=>!!W.pet&&petLv()>=2,hint:()=>W.pet?`${W.pet.name} 目前 Lv.${petLv()}`:'先領養一隻寵物'},
  {id:'diner',who:'食堂阿姨',t:'找到走丟的小玉',d:'「我家的三花貓小玉跑出去了！她最愛小魚乾，拜託讓她跟著你回到食堂門口。」',reward:40,ok:()=>!!(W.reqReady||{}).diner,hint:()=>'用小魚乾讓小玉跟著你，帶到うみねこ食堂門口'},
  {id:'books',who:'書店老闆',t:'分享一本你讀過的書',d:'「讀完一本書，最開心的就是跟別人分享！在『閱讀紀錄』寫一則心得吧。」',reward:30,ok:()=>(W.reads||[]).length>=1,hint:()=>`已寫 ${(W.reads||[]).length} 則`}];
function reqState(r){const done=(W.req||{})[r.id];return done?'done':r.ok()?'ready':'doing';}
let reqT=0;function reqTick(dt){if(!started||HOME_IN)return;reqT-=dt;if(reqT>0)return;reqT=1;
  const tama=CATS.find(c=>(c.origName||c.name)==='小玉');const dp=(SPOTS.diner||{}).pos;
  if(tama&&dp&&!(W.req||{}).diner&&!(W.reqReady||{}).diner&&tama.follow>0&&tama.g.position.distanceTo(dp)<5&&P.pos.distanceTo(dp)<5){W.reqReady=W.reqReady||{};W.reqReady.diner=true;save();toast('小玉回到食堂了！回公告板領獎吧');}
  REQS.forEach(r=>{if(reqState(r)==='ready'&&!(W.reqNote||{})[r.id]){W.reqNote=W.reqNote||{};W.reqNote[r.id]=1;save();toast(`委託「${r.t}」可以領獎了！到公告板領取`);}});}

// ---------- teacher news
function newsList(){return (CFG.news||[]).filter(n=>n&&(n.title||n.body)).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));}
function newsKey(n){return (n.date||'')+'|'+(n.title||'');}
function newsUnseen(){const seen=W.newsSeen||[];return newsList().some(n=>!seen.includes(newsKey(n)));}

// ---------- panel
function openBoard(tab){if(DLG.open)closeDlg();NB.tab=tab||(newsUnseen()?'news':'daily');dailyState();$('board').hidden=false;renderBoard();}
function closeBoard(){if($('board').hidden)return;$('board').hidden=true;save();cv.focus({preventScroll:true});}
function renderBoard(){const tabs=$('nbTabs');tabs.innerHTML='';
  [['news','老師消息'+(newsUnseen()?' ●':'')],['daily','每日任務'],['req','居民委託'],['read','閱讀紀錄']].forEach(([k,l])=>{const b=el('button',{type:'button',text:l,'aria-selected':String(NB.tab===k)});b.onclick=()=>{NB.tab=k;renderBoard();};tabs.appendChild(b);});
  const B=$('nbBody');B.innerHTML='';
  if(NB.tab==='news'){const L=newsList();if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'老師還沒有發布消息。'}));
    L.forEach(n=>{const card=el('div',{class:'nb-card'},[el('div',{class:'nb-meta',text:n.date||''}),el('b',{text:n.title||'（無標題）'}),el('p',{text:n.body||''})]);B.appendChild(card);});
    W.newsSeen=L.map(newsKey);save();}
  else if(NB.tab==='daily'){const D=dailyState();B.appendChild(el('p',{class:'dc-hint',text:`今天（${D.date.slice(5).replace('-','/')}）的任務，每完成一個 +15 金幣，全部完成再 +20。明天會換新的任務！`}));
    D.ids.forEach(id=>{const d=DAILY_POOL.find(x=>x.id===id);if(!d)return;const ok=D.done.includes(id);
      B.appendChild(el('div',{class:'nb-card nb-row'+(ok?' ok':'')},[el('span',{class:'nb-chk',text:ok?'✓':''}),el('b',{text:d.t}),el('span',{class:'nb-meta',text:ok?'完成':`${Math.min(D.prog[id]||0,d.n)}/${d.n}`})]));});}
  else if(NB.tab==='req'){B.appendChild(el('p',{class:'dc-hint',text:'鎮上居民需要你的幫忙！完成後回到這裡領取獎勵。'}));
    REQS.forEach(r=>{const s=reqState(r);const card=el('div',{class:'nb-card'+(s==='done'?' ok':'')},[el('div',{class:'nb-meta',text:`${r.who}　・　獎勵 ${r.reward} 金幣`}),el('b',{text:r.t}),el('p',{text:r.d})]);
      if(s==='done')card.appendChild(el('div',{class:'nb-meta',text:'✓ 已完成，謝謝你！'}));
      else if(s==='ready'){const b=el('button',{type:'button',class:'btn primary small',text:`交給${r.who}・領 ${r.reward} 金幣`});b.onclick=()=>{r.take&&r.take();W.req=W.req||{};W.req[r.id]=Date.now();W.coins+=r.reward;renderPouch();save();SND.register&&A.ready&&SND.register();toast(`${r.who}：「謝謝你！」 +${r.reward} 金幣`);renderBoard();};card.appendChild(b);}
      else card.appendChild(el('div',{class:'nb-meta',text:'進行中：'+r.hint()}));
      B.appendChild(card);});}
  else if(NB.tab==='read'){const R=W.reads=W.reads||[];const today=todayStr();const gotToday=R.some(x=>x.d===today);
    B.appendChild(el('p',{class:'dc-hint',text:`全班閱讀計畫：讀完書寫一則心得。每天第一則 +20 金幣${gotToday?'（今天已領）':''}。`}));
    const bk=el('input',{type:'text',maxlength:'30',placeholder:'書名，例如：小王子'}),nt=el('textarea',{maxlength:'200',placeholder:'一句心得：我最喜歡的地方是……（至少 10 個字）'});
    [bk,nt].forEach(i=>{i.addEventListener('keydown',e=>e.stopPropagation());i.className='nb-in';});
    const go=el('button',{type:'button',class:'btn primary small',text:'寫進閱讀紀錄'});
    go.onclick=()=>{const book=bk.value.trim(),note=nt.value.trim();if(!book){toast('先寫書名');return;}if(note.length<10){toast('心得至少寫 10 個字喔');return;}
      R.push({d:today,book,note});if(!gotToday){W.coins+=20;renderPouch();toast('寫好了！+20 金幣');}else toast('寫好了！');save();dailyEvent('read');renderBoard();};
    B.appendChild(el('div',{class:'nb-card'},[bk,nt,go]));
    R.slice().reverse().slice(0,12).forEach(x=>B.appendChild(el('div',{class:'nb-card'},[el('div',{class:'nb-meta',text:x.d}),el('b',{text:`《${x.book}》`}),el('p',{text:x.note})])));}
  $('nbCoins').textContent=`金幣 ${W.coins}`;}
$('nbClose').onclick=closeBoard;$('nbDone').onclick=closeBoard;
