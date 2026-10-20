// 第十五批: the same spots in the hand-drawn scenes with ?look=orig / soft / pale.  Q=look=soft PORT=.. node look15.js <out> <tag> [l|p]
const start=require('./base.js');const OUT=process.argv[2],TAG=process.argv[3],land=process.argv[4]!=='p',sk=land?'L':'P';
const HIDE='#toast,#quests,#qt{display:none!important}';
(async()=>{const {b,p,W,cl,errs}=await start({land,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
 const look=await p.evaluate(()=>typeof LOOK!=='undefined'?LOOK:new URLSearchParams(location.search).get('look'));
 const shot=n=>p.screenshot({path:`${OUT}/${TAG}_${sk}_${n}.jpg`,quality:80});
 const go=(x,y)=>p.evaluate(([x,y])=>{const R=window.__qf().R2();R.x=x;R.y=y;R.cx=null;R.view=0;R.tgt=R.pend=null;},[x,y]);
 const spot=k=>p.evaluate(k=>{const q=window.__qf(),s=q.r2Spots().find(s=>s.def[0]===k||String(s.def[0]).includes(k));return s?[s.def[1],s.def[2]]:null;},k);
 const room=async(name,enter,k)=>{await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(2000);await cl();
   await p.evaluate(e=>{const q=window.__qf();(new Function('q',e))(q);},enter);await W(4500);await cl();const s=await spot(k);if(s)await go(...s);await W(5000);await shot(name);};
 await room('1gate','q.gateEnter("map")','溜魚');
 await room('2field','q.fieldEnter()','投籃');
 await room('3class','q.clsEnter()','座位2');
 await room('4home','q.enterHome()','書桌');
 await room('5cabin','q.enterCabinDirect()','辦公桌');
 await room('6mart','q.enterMart("tribe")','counter');
 await p.evaluate(()=>window.__qf().enterStation&&window.__qf().enterStation());await W(6000);await cl();await shot('7station');
 console.log(look,JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,4)));await b.close();})();
