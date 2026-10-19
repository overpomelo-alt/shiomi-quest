// teacher room v4: lie down on the bed (landscape + portrait), for each of the 6 student looks.  PORT=.. node rest14.js <out>
const start=require('./base.js');const OUT=process.argv[2];
const HIDE='#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar,#quests,#qt{display:none!important}';
(async()=>{for(const land of [true,false]){const {b,p,W,cl,errs}=await start({land,seat:'3'});await p.addStyleTag({content:HIDE}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(2500);await cl();
 await p.evaluate(()=>window.__qf().enterCabinDirect());await W(4500);await cl();
 for(const ch of ['hero1','sailor','hoodie','sporty','green','redcap']){
  await p.evaluate(ch=>{const q=window.__qf();q.applyLook(Object.assign({},q.W.look||{},{ch}));},ch);await W(1500);
  await p.evaluate(()=>{const q=window.__qf(),R=q.R2();const s=q.r2Spots().find(s=>s.def[0]==='床');R.x=s.def[1];R.y=s.def[2];R.cx=null;q.r2Rest(true);});await W(2500);
  await p.screenshot({path:`${OUT}/rest_${land?'L':'P'}_${ch}.jpg`,quality:78});await p.evaluate(()=>window.__qf().r2Rest(false));await W(1200);}
 console.log(land,JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,3)));await b.close();}})();
