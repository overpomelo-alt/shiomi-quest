/* ================================================================
   Tracks sealed + convenience store 2.0 (picture shop, gacha, backpack)
   ================================================================ */
// solid corridor over the rails (only the level crossing stays open); also pushes anyone already on the tracks out
addCol(-420,-4.6,-32.15,-27.45,3);addCol(4.6,420,-32.15,-27.45,3);

const SHOP_CATS=[['rice','🍙','飯糰便當'],['bread','🍮','麵包甜點'],['snack','🍫','零食'],['drink','🥤','飲料'],['ice','🍦','冰品'],['hot','🍢','熱食'],['stat','✏️','文具'],['pet','🐾','寵物用品'],['gacha','🎁','扭蛋']];
const SHOP_ITEMS=[
  ['鮭魚飯糰',30,'🍙','rice','鹹香鮭魚配白飯，早餐好選擇。','#f3e7cf'],['鮪魚飯糰',30,'🍙','rice','鮪魚美乃滋，最受歡迎的口味！','#f3e7cf'],['三明治',35,'🥪','rice','蛋沙拉三明治，軟綿綿。','#f7ecd0'],['咖哩便當',60,'🍛','rice','熱呼呼的咖哩飯，吃得很飽。','#f7dcb0'],
  ['菠蘿麵包',25,'🍞','bread','外酥內軟，剛出爐的香味。','#f7e3bf'],['布丁',25,'🍮','bread','Q 彈的焦糖布丁。','#f8e2b8'],['銅鑼燒',20,'🥞','bread','夾著滿滿紅豆餡。','#f2d6b4'],['草莓大福',30,'🍓','bread','季節限定！軟 Q 麻糬包草莓。','#fbdde4'],
  ['洋芋片',25,'🍟','snack','喀滋喀滋，好吃但很鹹喔。','#fbe3b0'],['巧克力',20,'🍫','snack','甜甜的巧克力，一次吃一點就好。','#ead2c2'],['仙貝',15,'🍘','snack','醬油烤米果，香噴噴。','#f1dcc0'],['軟糖',15,'🍬','snack','水果口味軟糖，記得刷牙！','#fad9e6'],
  ['牛奶',20,'🥛','drink','補充鈣質，長得更高！','#e8f1f8'],['麥茶',20,'🍵','drink','無糖麥茶，最解渴。','#e6efd8'],['柳橙汁',20,'🧃','drink','100% 柳橙原汁，維他命 C 滿滿。','#fde6c4'],['彈珠汽水',25,'🥤','drink','打開時「啵」一聲！','#dcefff'],['礦泉水',15,'💧','drink','口渴就喝水，寵物也能喝。','#e2f2fa'],
  ['蘇打冰棒',20,'🧊','ice','清涼的蘇打口味。','#dff3fb'],['香草冰淇淋',25,'🍦','ice','濃濃香草，一口接一口。','#fbf1dc'],['西瓜冰',20,'🍧','ice','夏天的味道。','#fde0e0'],
  ['關東煮',30,'🍢','hot','櫃台熱食：蘿蔔、魚板、蛋。','#f5e2c6'],['肉包',25,'🥟','hot','櫃台熱食：現蒸肉包。有人在找它喔！','#f7ecdc'],['烤地瓜',25,'🍠','hot','櫃台熱食：香甜的烤地瓜。','#f2d9c9'],
  ['鉛筆',10,'✏️','stat','寫功課用的 2B 鉛筆。','#fbeec2'],['尺',10,'📏','stat','15 公分的直尺。','#f4f0d8'],['筆記本',20,'📒','stat','記下學到的新東西！','#fbeec2'],['閃亮貼紙',50,'✨','stat','閃閃發亮的收藏貼紙。','#fff4c8'],
  ['小魚乾',30,'🐟','pet','貓咪最愛！飽足 +40。也能交到貓咪朋友。','#dcecf6'],['狗狗肉乾',30,'🍖','pet','狗狗最愛！飽足 +40。','#f5dccb'],['逗貓棒',40,'🎣','pet','陪貓咪玩，心情大大提升。','#e9e2f7'],['狗狗玩具球',40,'🎾','pet','丟出去，狗狗會咬回來！','#eef6cf']];
const SHOP_BY={};SHOP_ITEMS.forEach(it=>SHOP_BY[it[0]]=it);
const EAT_TXT={rice:['好飽！米飯是身體的能量來源。','吃完精神都來了！'],bread:['甜甜的，好幸福～','吃完記得漱口喔。'],snack:['好吃！不過零食要適量，吃太多會蛀牙。','喀滋喀滋～零食偶爾吃就好。'],
  drink:['咕嚕咕嚕，好解渴！','喝完覺得好清爽。'],ice:['好冰！慢慢吃，不然頭會痛。','冰冰涼涼，好消暑。'],hot:['熱呼呼的，暖到心裡。','好香！吃完全身暖暖的。']};
const EAT_TIP={'牛奶':'牛奶有很多鈣質，能讓骨頭和牙齒更強壯。','柳橙汁':'柳橙有維他命 C，可以幫助身體抵抗感冒。','麥茶':'無糖飲料最健康，口渴時多喝水或無糖茶。','礦泉水':'每天要喝足夠的水，大約 6～8 杯。',
  '洋芋片':'洋芋片的鹽和油都很多，一包不要一次吃完。','巧克力':'巧克力有很多糖，吃完記得刷牙。','軟糖':'糖果黏在牙齒上容易蛀牙！','彈珠汽水':'一瓶汽水的糖大約有 7～8 顆方糖那麼多。','咖哩便當':'便當有飯、有肉、有菜，營養很均衡。','三明治':'蛋是很好的蛋白質來源。'};
const GACHA_PRICE=40;
const GACHA=[['clown','小丑魚','🐠',16],['puffer','河豚','🐡',14],['crab','螃蟹','🦀',14],['shell','貝殼','🐚',14],['octo','章魚','🐙',10],['squid','魷魚','🦑',9],['turtle','海龜','🐢',7],['dolphin','海豚','🐬',6],['lobster','龍蝦','🦞',4],['shark','鯊魚','🦈',3],['whale','鯨魚','🐳',2.2],['eyes','浪裡的眼睛','👀',.8]];
const GACHA_RARE=w=>w>=10?['普通','#8a8a8a']:w>=5?['少見','#3d8ad8']:w>=2?['稀有','#b060d8']:['傳說','#e0a020'];
function gachaDraw(){const tot=GACHA.reduce((s,g)=>s+g[3],0);let r=Math.random()*tot;for(const g of GACHA){r-=g[3];if(r<=0)return g;}return GACHA[0];}
function itemIcon(n){const it=SHOP_BY[n];if(it)return it[2];const g=GACHA.find(x=>x[1]===n);return g?g[2]:'📦';}

/* ---------- store interior: open dollhouse view ---------- */
(function(){const G=MART.g;if(!G)return;const hide=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  G.traverse(o=>{if(!o.isMesh||o===G)return;const p=o.position;if(p.y>2.9||p.z>4.75)o.material=hide;});
  MART.doors.forEach(d=>d.m.visible=false);
  // exit mat + gacha machine near the door
  const [mc,mg]=C2(256,96);mg.fillStyle='#2b2f6a';mg.fillRect(0,0,256,96);mg.fillStyle='#e8b33c';mg.fillRect(0,80,256,16);mg.fillStyle='#fff';mg.font=`800 40px ${FG}`;mg.textAlign='center';mg.textBaseline='middle';mg.fillText('▼ 出口',128,42);
  const mat=mk(new T.PlaneGeometry(2,.75),new T.MeshLambertMaterial({map:TX(mc),emissive:0xffffff,emissiveMap:TX(mc),emissiveIntensity:.35}),4,.02,4.2,G,false);mat.rotation.x=-PI/2;
  const gm=new T.Group();gm.position.set(1.6,0,3.7);G.add(gm);MART.gachaG=gm;
  mk(bx(.9,.7,.7),imat('#e35d4a',.35),0,.35,0,gm);mk(sph(.42,16,12),new T.MeshLambertMaterial({color:col('#dff3fb'),transparent:true,opacity:.55,emissive:col('#9fd8f0'),emissiveIntensity:.3}),0,1.05,0,gm,false);
  ['#f2c14e','#4a9be0','#4fae6c','#e0674b','#a77ae0','#f08fb0'].forEach((c,i)=>mk(sph(.11,10,8),imat(c,.4),Math.cos(i*1.05)*.2,.9+(i%3)*.1,Math.sin(i*1.05)*.2,gm,false));
  mk(cy(.1,.1,.08,12),imat('#f7f2e8',.4),.2,.42,.36,gm,false).rotation.x=PI/2;mk(bx(.3,.12,.05),imat('#1f1f22',.2),-.2,.3,.36,gm,false);
  const [tc,tg]=C2(256,80);tg.fillStyle='#f2c14e';tg.fillRect(0,0,256,80);tg.fillStyle='#8a2c1c';tg.font=`800 34px ${FG}`;tg.textAlign='center';tg.textBaseline='middle';tg.fillText('海洋扭蛋 40',128,42);
  mk(new T.PlaneGeometry(.88,.28),new T.MeshBasicMaterial({map:TX(tc)}),0,1.62,0,gm,false);addCol(IX+1.1,IX+2.1,IZ+3.3,IZ+4.1,2);
  inter(new T.Vector3(IX+1.6,0,IZ+4.5),1.2,`轉扭蛋（${GACHA_PRICE} 金幣）`,()=>openShop('gacha'));
  // redirect the old shelf menus to the picture shop
  const map={'飯糰・便當':'rice','麵包・甜點':'bread','零食':'snack','泡麵':'rice','文具':'stat','雜貨・寵物用品':'pet','飲料冷藏櫃':'drink','冰品冷凍櫃':'ice'};
  INT.forEach(it=>{if(!it.pos||Math.abs(it.pos.x-IX)>8||Math.abs(it.pos.z-IZ)>6)return;const l=typeof it.label==='string'?it.label:'';const m=l.match(/〈(.+)〉|打開(.+)$/);
    if(l.startsWith('看看〈')){const k=map[m[1]]||'rice';it.act=()=>openShop(k);it.label=`逛逛〈${m[1]}〉`;}
    else if(l==='打開飲料冷藏櫃'){it.act=()=>openShop('drink');}else if(l==='打開冰品冷凍櫃'){it.act=()=>openShop('ice');}
    else if(typeof it.label==='function'&&Math.abs(it.pos.x-(IX-4.6))<.1){it.act=()=>openShop(MART.basket.length?null:'hot');it.label=()=>MART.basket.length?`到櫃台結帳（${MART.basket.length} 件）`:'櫃台熱食・結帳';}});})();
// shelf art: real-looking goods
(function(){const G=MART.g;if(!G)return;const kinds={rice:['🍙','🍙','🥪','🍛','🍱'],bread:['🍞','🍮','🥞','🍓','🥐'],snack:['🍟','🍫','🍘','🍬','🍪'],noodle:['🍜','🍜','🍝'],stat:['✏️','📏','📒','✨','📎'],misc:['🐟','🍖','🎣','🎾','🧴']};
  // re-texture the six gondola faces in build order
  const faces=[];G.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry'&&Math.abs(o.geometry.parameters.height-1.45)<.01)faces.push(o);});
  const order=['rice','bread','snack','noodle','stat','misc'];
  faces.forEach((o,i)=>{const k=order[i]||'snack',em=kinds[k];const [c,g]=C2(512,256);g.fillStyle='#f6f5f0';g.fillRect(0,0,512,256);
    for(let r=0;r<4;r++){const y0=r*64;g.fillStyle='#b9b6ad';g.fillRect(0,y0+54,512,10);g.fillStyle='#e8b33c';g.fillRect(0,y0+54,512,3);
      g.font='40px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='alphabetic';for(let x=0;x<8;x++)g.fillText(em[(x+r*3)%em.length],32+x*64,y0+50);
      g.fillStyle='#fffbe8';for(let x=0;x<8;x+=2){g.fillRect(14+x*64,y0+56,36,8);}}
    const t=TX(c);o.material=new T.MeshLambertMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.42});});})();

/* ---------- picture shop panel ---------- */
(function(){const d=document.createElement('div');d.id='shop';d.hidden=true;d.innerHTML=`<div class="sh-in">
  <div class="sh-hd"><b>🏪 ひだまりマート</b><span class="sh-coin"></span><button type="button" class="sh-x" aria-label="關閉">✕</button></div>
  <div class="sh-tabs"></div><div class="sh-grid"></div>
  <div class="sh-ft"><div class="sh-bk"></div><button type="button" class="btn primary sh-pay">結帳</button></div>
  <div class="sh-pop" hidden></div></div>`;document.body.appendChild(d);
  d.querySelector('.sh-x').onclick=closeShop;d.querySelector('.sh-pay').onclick=shopPay;d.addEventListener('keydown',e=>e.stopPropagation());})();
const SHOP={cat:'rice'};
function openShop(cat){if(DLG.open)closeDlg();if(cat)SHOP.cat=cat;$('shop').hidden=false;renderShop();SND.pick&&SND.pick();}
function closeShop(){if($('shop').hidden)return;$('shop').hidden=true;cv.focus({preventScroll:true});}
function basketCount(n){return MART.basket.filter(i=>i[0]===n).length;}
function renderShop(){const d=$('shop'),tabs=d.querySelector('.sh-tabs'),grid=d.querySelector('.sh-grid');d.querySelector('.sh-coin').textContent=`💰 ${W.coins} 金幣`;
  tabs.innerHTML='';SHOP_CATS.forEach(([k,ic,nm])=>{const b=el('button',{type:'button',class:'sh-tab'+(SHOP.cat===k?' on':''),html:`<i>${ic}</i>${nm}`});b.onclick=()=>{SHOP.cat=k;renderShop();};tabs.appendChild(b);});
  grid.innerHTML='';
  if(SHOP.cat==='gacha'){const own=W.gacha||{},got=GACHA.filter(g=>own[g[0]]).length;
    const box=el('div',{class:'sh-gacha'},[el('div',{class:'gc-mc',html:'<div class="gc-dome">🐠🦀🐙<br>🐚🐬🐢</div><div class="gc-base">海洋扭蛋</div>'}),
      el('p',{text:`一次 ${GACHA_PRICE} 金幣，隨機轉出一隻海洋朋友！收集到 ${got} / ${GACHA.length} 種。`}),
      el('p',{class:'gc-note',text:'小提醒：扭蛋是「碰運氣」，可能會轉到重複的。先想想要花多少錢再轉喔！'}),
      el('button',{type:'button',class:'btn primary',text:`轉一次（${GACHA_PRICE} 金幣）`,onclick:gachaSpin})]);grid.appendChild(box);
    const col_=el('div',{class:'gc-col'});GACHA.forEach(g=>{const n=own[g[0]]||0,[rn,rc]=GACHA_RARE(g[3]);col_.appendChild(el('div',{class:'gc-it'+(n?'':' no'),html:`<i>${n?g[2]:'？'}</i><b>${n?g[1]:'？？？'}</b><small style="color:${rc}">${rn}${n>1?` ×${n}`:''}</small>`}));});grid.appendChild(col_);}
  else SHOP_ITEMS.filter(it=>it[3]===SHOP.cat).forEach(it=>{const [n,p,ic,,desc,bg]=it,k=basketCount(n);
    const tag=PET_SAFE.cat[n]||PET_SAFE.dog[n]?'<span class="tg ok">寵物最愛</span>':PET_BAD[n]?'<span class="tg bad">寵物不能吃</span>':PET_OK[n]?'<span class="tg mid">寵物可以吃一點</span>':'';
    const c=el('div',{class:'sh-card'+(k?' in':''),html:`<div class="sh-pic" style="background:${bg}"><i>${ic}</i>${k?`<em>${k}</em>`:''}</div><b>${n}</b><span class="sh-p">${p} 金幣</span><small>${desc}</small>${tag}${W.items[n]?`<small class="own">背包裡有 ${W.items[n]} 個</small>`:''}`});
    const row=el('div',{class:'sh-qty'});const minus=el('button',{type:'button',class:'q',text:'−'});const plus=el('button',{type:'button',class:'q add',text:k?'＋':'放進購物籃'});
    minus.onclick=e=>{e.stopPropagation();const i=MART.basket.findIndex(x=>x[0]===n);if(i>=0){MART.basket.splice(i,1);updateBasket();renderShop();}};
    plus.onclick=e=>{e.stopPropagation();MART.basket.push([n,p]);updateBasket();SND.pick&&SND.pick();renderShop();};if(k)row.appendChild(minus);row.appendChild(plus);c.appendChild(row);grid.appendChild(c);});
  const tot=basketTotal(),left=W.coins-tot,bk=d.querySelector('.sh-bk'),pay=d.querySelector('.sh-pay');
  bk.innerHTML=MART.basket.length?`🧺 <b>${MART.basket.length}</b> 件・合計 <b>${tot}</b> 金幣　<span class="${left<0?'neg':''}">${left<0?`還差 ${-left} 金幣`:`付完剩 ${left} 金幣`}</span>`:'🧺 購物籃是空的，點商品放進來吧！';
  pay.disabled=!MART.basket.length||left<0;pay.textContent=MART.basket.length?`結帳 ${tot} 金幣`:'結帳';}
function shopPay(){const tot=basketTotal();if(!MART.basket.length||W.coins<tot)return;const before=W.coins,list={};MART.basket.forEach(i=>list[i[0]]=(list[i[0]]||0)+1);
  W.coins-=tot;led(-tot,'便利商店購物','零食飲料');MART.basket.forEach(i=>addItem(i[0]));dailyEvent('buy');MART.basket=[];updateBasket();renderPouch();save();SND.register&&SND.register();
  const pop=$('shop').querySelector('.sh-pop');pop.innerHTML='';pop.appendChild(el('div',{class:'rc'},[el('b',{text:'🧾 收據　ひだまりマート'}),
    ...Object.entries(list).map(([n,k])=>el('div',{class:'rc-r',html:`<span>${itemIcon(n)} ${n} ×${k}</span><span>${SHOP_BY[n][1]*k}</span>`})),
    el('div',{class:'rc-r tot',html:`<span>合計</span><span>${tot} 金幣</span>`}),el('div',{class:'rc-r',html:`<span>付款前</span><span>${before}</span>`}),el('div',{class:'rc-r',html:`<span>剩下</span><span>${W.coins}</span>`}),
    el('p',{text:'謝謝光臨！買的東西都放進背包了，點左上角的「背包」可以使用。'}),el('button',{type:'button',class:'btn primary',text:'好',onclick:()=>{pop.hidden=true;renderShop();}})]));pop.hidden=false;renderShop();}
function gachaSpin(){if(W.coins<GACHA_PRICE){toast(`金幣不夠，還差 ${GACHA_PRICE-W.coins} 金幣`);return;}W.coins-=GACHA_PRICE;led(-GACHA_PRICE,'海洋扭蛋','娛樂');renderPouch();
  const g=gachaDraw();W.gacha=W.gacha||{};const isNew=!W.gacha[g[0]];W.gacha[g[0]]=(W.gacha[g[0]]||0)+1;save();const [rn,rc]=GACHA_RARE(g[3]);
  if(isNew)histAdd&&histAdd('buy',`扭蛋：轉到新朋友「${g[1]}」`);
  const pop=$('shop').querySelector('.sh-pop');pop.innerHTML=`<div class="gc-rev"><div class="gc-cap">🥚</div></div>`;pop.hidden=false;
  cutSnd&&cutSnd(t=>{for(let i=0;i<6;i++)nburst(t+i*.12,.06,'bandpass',1800+i*200,1,.12,A.sfx);});
  setTimeout(()=>{pop.innerHTML='';pop.appendChild(el('div',{class:'gc-rev open'},[el('div',{class:'gc-fig',text:g[2]}),el('b',{text:g[1]}),el('span',{class:'gc-r',style:`background:${rc}`,text:rn}),
    el('p',{text:isNew?(g[0]==='eyes'?'傳說中的「浪裡的眼睛」……牠好像在看著你。':'新朋友！收進扭蛋收藏冊了。'):`重複了！你已經有 ${W.gacha[g[0]]} 隻${g[1]}。`}),
    el('button',{type:'button',class:'btn primary',text:'好',onclick:()=>{pop.hidden=true;renderShop();}})]));
    cutSnd&&cutSnd(t=>[1047,1319,1568,2093].forEach((f,i)=>tone(f,t+i*.08,.4,'sine',.06,A.sfx)));},1100);}

/* ---------- backpack ---------- */
(function(){const d=document.createElement('div');d.id='bag';d.hidden=true;d.innerHTML=`<div class="sh-in"><div class="sh-hd"><b>🎒 我的背包</b><span class="sh-coin"></span><button type="button" class="sh-x" aria-label="關閉">✕</button></div><div class="bg-list"></div></div>`;
  document.body.appendChild(d);d.querySelector('.sh-x').onclick=closeBag;})();
function openBag(){if(!started)return;if(DLG.open)closeDlg();$('bag').hidden=false;renderBag();}
function closeBag(){if($('bag').hidden)return;$('bag').hidden=true;cv.focus({preventScroll:true});}
function renderBag(){const d=$('bag'),L=d.querySelector('.bg-list');d.querySelector('.sh-coin').textContent=`💰 ${W.coins} 金幣`;L.innerHTML='';
  const ents=Object.entries(W.items);if(!ents.length)L.appendChild(el('p',{class:'bg-empty',text:'背包是空的。去便利商店逛逛吧！'}));
  ents.forEach(([n,k])=>{const it=SHOP_BY[n],cat=it?it[3]:'';const acts=[];
    if(['rice','bread','snack','drink','ice','hot'].includes(cat))acts.push([cat==='drink'?'喝掉':'吃掉',()=>eatItem(n)]);
    if(W.pet&&(PET_SAFE[W.pet.kind][n]||PET_OK[n]||PET_BAD[n]||PET_SAFE.cat[n]||PET_SAFE.dog[n]))acts.push(['給寵物',()=>{closeBag();feed(n);}]);
    if(n==='逗貓棒'||n==='狗狗玩具球')acts.push(['陪寵物玩',()=>{closeBag();W.pet?petPlay():say(null,['你還沒有寵物喔。'])}]);
    const row=el('div',{class:'bg-it',html:`<div class="sh-pic" style="background:${it?it[5]:'#eee'}"><i>${itemIcon(n)}</i></div><div class="bg-t"><b>${n} <small>×${k}</small></b><small>${it?it[4]:''}</small></div>`});
    const bs=el('div',{class:'bg-acts'});acts.forEach(([t,f])=>bs.appendChild(el('button',{type:'button',class:'btn small',text:t,onclick:f})));row.appendChild(bs);L.appendChild(row);});
  const own=W.gacha||{},got=GACHA.filter(g=>own[g[0]]);L.appendChild(el('div',{class:'bg-sec',text:`🐚 扭蛋收藏冊 ${got.length} / ${GACHA.length}`}));
  const col_=el('div',{class:'gc-col'});GACHA.forEach(g=>{const n=own[g[0]]||0,[rn,rc]=GACHA_RARE(g[3]);col_.appendChild(el('div',{class:'gc-it'+(n?'':' no'),html:`<i>${n?g[2]:'？'}</i><b>${n?g[1]:'？？？'}</b><small style="color:${rc}">${rn}${n>1?` ×${n}`:''}</small>`}));});L.appendChild(col_);
  if(W.glass&&W.glass.length)L.appendChild(el('div',{class:'bg-sec',text:`🔹 海玻璃 ${W.glass.length} / 5`}));}
function eatItem(n){const it=SHOP_BY[n];if(!it||!W.items[n])return;addItem(n,-1);const cat=it[3];const line=pick(EAT_TXT[cat]||['好好吃！']);
  SND.pick&&SND.pick();closeBag();say(n,[`${it[2]} ${line}`,...(EAT_TIP[n]?[`💡 ${EAT_TIP[n]}`]:[])]);}
// make the backpack reachable from the pouch
{const _rp=renderPouch;renderPouch=function(){_rp();const p=$('pouch');if(!p)return;const b=document.createElement('span');b.className='bagbtn';b.textContent=`🎒 背包 ${Object.values(W.items).reduce((a,v)=>a+v,0)}`;b.style.pointerEvents='auto';b.style.cursor='pointer';b.onclick=()=>openBag();
  [...p.children].forEach(c=>{if(!c.classList.contains('yen')&&!c.textContent.startsWith('海玻璃'))c.remove();});p.insertBefore(b,p.children[1]||null);};}

/* ---------- pinch to zoom (town + store) ---------- */
{const pts=new Map();let d0=0,z0=0;const dist=()=>{const a=[...pts.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);};
  cv.addEventListener('pointerdown',e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){d0=dist();z0=cam.dist;}});
  cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2&&d0>0){cam.dist=clamp(z0*d0/Math.max(20,dist()),2.8,14);}});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)d0=0;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);}
