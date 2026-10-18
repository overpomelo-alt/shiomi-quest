/* ================================================================
   Pets
   ================================================================ */
const PET_SAFE={cat:{'小魚乾':[40,6,'喀滋喀滋，吃得好開心！']},dog:{'狗狗肉乾':[40,6,'搖著尾巴一下子就吃光光！']}};
const PET_OK={'礦泉水':[4,5,'喝了幾口水，精神變好了。'],'鮭魚飯糰':[10,3,'偶爾吃一小口白飯可以，但調味和海苔要少一點喔。'],'鮪魚飯糰':[10,3,'偶爾吃一小口可以，美乃滋太油就不要給太多。'],'麥茶':[3,3,'聞了聞，喝了一小口。水還是最好的喔。']};
const PET_BAD={'巧克力':'巧克力對貓和狗都有毒，絕對不能給牠吃！','熱可可':'可可跟巧克力一樣，對貓狗有毒！','洋芋片':'洋芋片太鹹了，鹽吃太多對寵物的腎臟不好。',
  '牛奶':'很多貓狗喝牛奶會拉肚子（乳糖不耐），不要給牠喝喔。','彈珠汽水':'汽水有很多糖，寵物不能喝。','可爾必思汽水':'汽水有很多糖，寵物不能喝。','哈密瓜汽水':'汽水有很多糖，寵物不能喝。',
  '咖哩便當':'咖哩裡有洋蔥，洋蔥對貓狗有毒！','軟糖':'糖果對寵物的牙齒和身體都不好。','布丁':'布丁有牛奶和很多糖，不適合寵物。','蘇打冰棒':'冰品又冰又甜，寵物會肚子痛。',
  '香草冰淇淋':'冰淇淋有牛奶和糖，寵物吃了會不舒服。','西瓜冰':'冰品又冰又甜，寵物會肚子痛。','杯麵':'泡麵太鹹、調味料太多，不能給寵物吃。','日式炒麵':'炒麵太鹹又太油。',
  '仙貝':'仙貝有醬油，太鹹了。','銅鑼燒':'紅豆餡太甜了。','菠蘿麵包':'麵包又甜又油，不適合寵物。','關東煮':'關東煮的湯很鹹，不適合寵物。','肉包':'肉包裡可能有洋蔥，不能給寵物吃。','烤地瓜':'烤地瓜可以吃一點點，但要放涼、不加調味……這次先不要好了。'};
const TRICKS=[[2,'sit','坐下'],[3,'spin','轉圈'],[4,'paw','握手'],[5,'dance','跳舞']];
let PETOBJ=null,petSaveT=0,petRenderT=0,petHungryWarned=false;
function makeDog(coat,s=1.35){const C={yellow:['#d39a52','#f3e2c4'],black:['#2a2723','#d8c6a6'],white:['#f2efe8','#ddd0ba']}[coat]||['#d39a52','#f3e2c4'];
  const g=new T.Group();g.userData.dyn=true;scene.add(g);const bm=lam(C[0]),lm=lam(C[1]);
  const body=mk(sph(.2,10,8),bm,0,.22,0,g,true);body.scale.set(.85,.8,1.5);
  const head=new T.Group();head.position.set(0,.36,.25);g.add(head);mk(sph(.12,10,8),bm,0,0,0,head);
  mk(bx(.1,.08,.12),lm,0,-.035,.11,head);mk(sph(.022,6,5),M.black,0,-.01,.175,head,false);
  [-1,1].forEach(k=>{const e=mk(new T.ConeGeometry(.045,.1,4),bm,k*.065,.12,-.01,head);e.rotation.z=-k*.15;});
  [-1,1].forEach(k=>mk(sph(.016,6,4),M.black,k*.045,.035,.1,head,false));
  const tail=new T.Group();tail.position.set(0,.3,-.27);g.add(tail);const tm=mk(new T.TorusGeometry(.06,.022,6,10,PI*1.4),bm,0,.06,0,tail);tm.rotation.y=PI/2;
  const legs=[];[[-.08,.14],[.08,.14],[-.08,-.14],[.08,-.14]].forEach(([a,b])=>legs.push(mk(cy(.032,.032,.2,6),bm,a,.1,b,g,false)));
  g.scale.setScalar(s);return {name:'',g,body,head,tail,legs,home:new T.Vector3(),tx:0,tz:0,state:'sit',t:1,follow:0,ph:rand()*6,dog:true};}
// puppies waiting at the bus stop
const PUPPIES=[];
(function(){const bx0=new T.Group();bx0.position.set(-54,0,-36.1);bx0.userData.dyn=true;scene.add(bx0);const cb=lam('#b88a58');
  mk(bx(1.1,.04,.7),cb,0,.02,0,bx0);[[1.1,.35,.04,0,.18,.35],[1.1,.35,.04,0,.18,-.35],[.04,.35,.7,.55,.18,0],[.04,.35,.7,-.55,.18,0]].forEach(([a,b,c,x,y,z])=>mk(bx(a,b,c),cb,x,y,z,bx0));
  ['yellow','black','white'].forEach((coat,i)=>{const d=makeDog(coat,.72);scene.remove(d.g);bx0.add(d.g);d.g.position.set(-.32+i*.32,.02,0);d.g.rotation.y=rr(-.6,.6)+PI*.1;d.body.rotation.x=-.45;d.head.position.y=.46;d.legs.forEach((l,j)=>l.visible=j<2);PUPPIES.push({coat,d});});
  addCol(-54.6,-53.4,-36.5,-35.7,.6);})();
function refreshPuppies(){PUPPIES.forEach(p=>p.d.g.visible=!(W.pet&&W.pet.kind==='dog'&&W.pet.coat===p.coat));}
function petLv(){return W.pet?Math.min(5,1+Math.floor(W.pet.bond/25)):0;}
function stampsDone(){return allStamps().filter(s=>stampDone(s.id)).length;}
function setupPet(){teardownPet();if(!W.pet){renderPet();refreshPuppies();return;}const p=W.pet;
  const days=p.seen?Math.floor((Date.now()-p.seen)/864e5):0;if(days>0){p.full=Math.max(15,p.full-days*15);p.mood=Math.max(15,p.mood-days*10);}p.seen=Date.now();
  if(p.kind==='cat'){const c=CATS.find(x=>(x.origName||x.name)===p.src);if(c){PETOBJ=c;c.name=p.name;}}
  else{PETOBJ=makeDog(p.coat);PETOBJ.name=p.name;CATS.push(PETOBJ);}
  if(PETOBJ){PETOBJ.isPet=true;PETOBJ.wait=false;PETOBJ.g.position.set(P.pos.x+1.2,P.pos.y,P.pos.z+1.2);PETOBJ.by=P.pos.y;}
  petHungryWarned=false;refreshPuppies();renderPet();}
function teardownPet(){const o=PETOBJ;PETOBJ=null;if(o){o.isPet=false;o.wait=false;o.trick=null;if(o.bub)o.bub.visible=false;
  if(o.dog){scene.remove(o.g);const i=CATS.indexOf(o);if(i>=0)CATS.splice(i,1);}else{o.name=o.origName||o.name;o.state='sit';o.t=2;o.follow=0;}}refreshPuppies();}
function askName(def,cb){say('取名字 · Name',['幫牠取一個名字吧！'],{choices:[{label:'',fn:null}]});DLG.typed=DLG.full.length;$('dialog').querySelector('.txt').textContent=DLG.full;
  const box=$('dialog').querySelector('.choices');box.innerHTML='';const i=document.createElement('input');i.id='petNameIn';i.maxLength=8;i.value=def;i.className='name-in';i.setAttribute('aria-label','寵物名字');
  const b=document.createElement('button');b.type='button';b.textContent='就叫這個名字';const go=()=>{const v=(i.value||'').trim()||def;closeDlg();cb(v);};
  b.onclick=e=>{e.stopPropagation();go();};i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();go();}});i.addEventListener('click',e=>e.stopPropagation());
  box.appendChild(i);box.appendChild(b);setTimeout(()=>{i.focus();i.select();},60);}
function adoptCat(c,name){W.pet={kind:'cat',src:c.origName||c.name,name,full:80,mood:85,bond:0,seen:Date.now()};save();setupPet();SND.stamp();heart(c.g.position);
  say(name,[`${name}成為你的寵物了！`,'記得常常餵牠、摸摸牠、陪牠玩。按 P 或點左下角的寵物卡，就能照顧牠。']);}
function adoptDog(coat,name){W.pet={kind:'dog',coat,name,full:80,mood:85,bond:0,seen:Date.now()};save();setupPet();SND.stamp();SND.bark(P.pos);
  say('村田爺爺',[`好孩子，${name}就交給你了。`,'狗狗要吃「狗狗肉乾」，便利商店的寵物用品區有賣。按 P 可以照顧牠。']);}
SND.bark=function(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);[0,.22].forEach(d=>{tone(560,t+d,.13,'sawtooth',.05,o,360);nburst(t+d,.1,'bandpass',900,2,.06,o);});};
function petVoice(){if(!PETOBJ)return;if(PETOBJ.dog)SND.bark(PETOBJ.g.position);else SND.meow(PETOBJ.g.position);}
function petHop(){if(!PETOBJ)return;PETOBJ.hop=.6;heart(PETOBJ.g.position);}
function bondUp(n){const p=W.pet;if(!p)return;const before=petLv();p.bond+=n;const after=petLv();
  if(after>before){const t=TRICKS.find(x=>x[0]===after);SND.stamp();toast(`${p.name}升到 Lv.${after}！${t?`學會了「${t[2]}」`:''}`);}renderPet();}
function petEvent(kind){if(!W.pet)return;if(kind==='ok')petHop();if(kind==='stamp'){bondUp(5);petHop();petVoice();}save();}
function openPetMenu(){if(!started||uiOpen())return;
  if(!W.pet){say(null,['你還沒有寵物。','鎮上的貓咪，餵牠三次小魚乾就會想跟你回家；巴士站的村田爺爺家也有小狗在找主人（要先拿到 3 個印章）。']);return;}
  const p=W.pet,lv=petLv(),o=PETOBJ,tricks=TRICKS.filter(t=>lv>=t[0]);
  choose(`${p.name}（${p.kind==='cat'?'貓咪':'小狗'}）Lv.${lv}`,`飽足 ${Math.round(p.full)}%・心情 ${Math.round(p.mood)}%・親密度 ${p.bond}${lv<5?`（再 ${25-(p.bond%25)} 點升級）`:''}`,[
    {label:'餵牠吃東西',fn:feedMenu},{label:'摸摸牠',fn:petPat},{label:'陪牠玩',fn:petPlay},
    ...(tricks.length?[{label:'叫牠表演把戲',fn:trickMenu}]:[]),
    {label:o&&o.wait?'叫牠跟我走':'叫牠在這裡等我',fn:()=>{if(!o)return;o.wait=!o.wait;if(o.wait){o.wx=o.g.position.x;o.wz=o.g.position.z;}say(null,[o.wait?`${p.name}乖乖坐下來等你。`:`${p.name}開心地跟上來了！`]);}},
    {label:'改名字',fn:()=>askName(p.name,n=>{p.name=n;if(o)o.name=n;save();renderPet();say(null,[`牠現在叫「${n}」了！`]);})},
    {label:'離開',fn:null}]);}
function feedMenu(){const p=W.pet;const own=Object.keys(W.items).filter(k=>PET_SAFE.cat[k]||PET_SAFE.dog[k]||PET_OK[k]||PET_BAD[k]);
  if(!own.length){say(null,[`你身上沒有${p.name}可以吃的東西。去便利商店「雜貨・寵物用品」買${p.kind==='cat'?'小魚乾':'狗狗肉乾'}吧！`]);return;}
  choose('餵食',`要給${p.name}吃什麼？`,[...own.map(k=>({label:`${k}（有 ${W.items[k]} 個）`,fn:()=>feed(k)})),{label:'不餵了',fn:null}]);}
function feed(k){const p=W.pet;if(PET_BAD[k]){SND.wrong();say('等一下！',[PET_BAD[k],`（${k}沒有給牠吃，還在你身上）`]);return;}
  let r=PET_SAFE[p.kind][k]||PET_OK[k];if(!r)r=[15,2,p.kind==='cat'?'貓咪吃了一點點狗狗肉乾。還是小魚乾比較適合貓咪喔。':'狗狗吃了小魚乾，不過狗狗肉乾比較適合牠。'];
  addItem(k,-1);p.full=Math.min(100,p.full+r[0]);p.mood=Math.min(100,p.mood+r[1]);if(p.full>30)petHungryWarned=false;bondUp(1);petHop();petVoice();save();renderPet();say(p.name,[r[2]]);}
function petPat(){const p=W.pet;const now=performance.now();petVoice();if(PETOBJ&&!PETOBJ.dog)setTimeout(()=>SND.purr(PETOBJ.g.position),400);
  if(p.patT&&now-p.patT<10000){say(p.name,[`${p.name}很舒服地瞇起眼睛。（剛剛才摸過，心情已經很好了）`]);return;}
  p.patT=now;p.mood=Math.min(100,p.mood+8);bondUp(1);petHop();save();say(p.name,[pick([`${p.name}蹭了蹭你的手。`,`${p.name}翻過來要你摸肚子。`,`${p.name}的尾巴開心地搖來搖去。`])]);}
function petPlay(){const p=W.pet,toy=p.kind==='cat'?'逗貓棒':'狗狗玩具球';
  if(!W.items[toy]){say(null,[`要陪${p.name}玩，需要「${toy}」。便利商店的寵物用品區有賣。`]);return;}
  const now=performance.now();if(p.playT&&now-p.playT<30000){say(p.name,[`${p.name}玩累了，在喘氣。等一下再玩吧！`]);return;}
  p.playT=now;p.mood=Math.min(100,p.mood+25);p.full=Math.max(0,p.full-5);bondUp(2);if(PETOBJ)PETOBJ.trick={type:'spin',t:0};petHop();petVoice();save();
  say(p.name,[p.kind==='cat'?`你揮動逗貓棒，${p.name}跳起來撲了好幾次！`:`你把球丟出去，${p.name}飛奔過去又咬回來！`]);}
function trickMenu(){const p=W.pet,lv=petLv();choose('表演把戲',`要${p.name}表演什麼？`,[...TRICKS.filter(t=>lv>=t[0]).map(t=>({label:t[2],fn:()=>{if(PETOBJ)PETOBJ.trick={type:t[1],t:0};petVoice();setTimeout(()=>heart(PETOBJ?PETOBJ.g.position:P.pos),900);say(null,[`${p.name}${t[2]}了！好厲害！`]);}})),{label:'不用了',fn:null}]);}
inter(new T.Vector3(-54,0,-35.2),1.5,'看看紙箱裡的小狗',()=>{
  if(W.pet){say('村田爺爺',[W.pet.kind==='dog'?`${W.pet.name}的兄弟姊妹還在這裡睡覺呢。要好好照顧牠喔！`:'小狗們在紙箱裡睡覺。你已經有寵物了，要好好照顧牠喔！']);return;}
  const n=stampsDone();if(n<3){say('村田爺爺',['我家的狗生了三隻小狗，想幫牠們找負責任的好主人。',`先去拿到 3 個印章，證明你很負責任，再來找我吧！（目前 ${n}/3）`]);return;}
  choose('村田爺爺','你真的很努力呢！要帶一隻小狗回家嗎？養狗要每天餵牠、陪牠玩喔。',[{label:'黃色的小狗',fn:()=>askName('小黃',nm=>adoptDog('yellow',nm))},{label:'黑色的小狗',fn:()=>askName('小黑',nm=>adoptDog('black',nm))},{label:'白色的小狗',fn:()=>askName('小白',nm=>adoptDog('white',nm))},{label:'再想想',fn:null}]);});
const bubTex=(()=>{const [c,g]=C2(128,64);g.fillStyle='rgba(255,255,255,.92)';rrect(g,4,4,120,44,18);g.fill();g.beginPath();g.moveTo(54,46);g.lineTo(64,60);g.lineTo(72,46);g.fill();g.fillStyle='#3a2a20';g.font=`700 22px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('肚子餓…',64,27);return new T.CanvasTexture(c);})();
function petTick(dt){const p=W.pet;if(!p)return;p.full=Math.max(0,p.full-dt/30);p.mood=Math.max(0,p.mood-dt/(p.full<25?20:45));p.seen=Date.now();
  if(p.full<25&&!petHungryWarned){petHungryWarned=true;toast(`${p.name}肚子餓了，記得餵牠！`);}
  const o=PETOBJ;if(o){if(!o.bub){o.bub=new T.Sprite(new T.SpriteMaterial({map:bubTex,transparent:true,depthWrite:false}));o.bub.scale.set(.9,.45,1);scene.add(o.bub);}
    o.bub.visible=p.full<25&&!INDOOR;if(o.bub.visible)o.bub.position.set(o.g.position.x,o.g.position.y+(o.dog?1.15:.9)+Math.sin(time*2)*.05,o.g.position.z);}
  if((petRenderT-=dt)<=0){petRenderT=1;renderPet();}if((petSaveT-=dt)<=0){petSaveT=10;save();}}
function renderPet(){const box=$('petBox');const p=W.pet;box.hidden=!p||!started;if(!p)return;
  $('pbIc').textContent=p.kind==='cat'?'貓':'狗';$('pbName').textContent=p.name;$('pbLv').textContent=`Lv.${petLv()}`;
  $('pbFull').style.width=`${Math.round(p.full)}%`;$('pbMood').style.width=`${Math.round(p.mood)}%`;box.classList.toggle('hungry',p.full<25);}
$('petBtn').onclick=()=>openPetMenu();
