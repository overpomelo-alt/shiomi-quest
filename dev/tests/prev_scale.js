// mockup: rooms with the character at the current size vs. scaled up
const start=require('./base.js');const OUT=process.argv[2];
(async()=>{const {b,p,W,cl,errs}=await start({land:true,seat:'3'});
 await p.addStyleTag({content:'#hud,#prompt,#toast,#areaTitle,.hud,#topbar,#bottomBar,#qcard,#questCard,#joy,#tAct,#tJump,#tRun,#tCard,#tbar,#quests,#qt{display:none!important}'}).catch(()=>{});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(2500);await cl();
 // student room
 await p.evaluate(()=>{const q=window.__qf();q.enterHome&&q.enterHome();});await W(5000);await cl();
 const roomInfo=await p.evaluate(()=>{const q=window.__qf(),R=q.R2();return [R.on,R.room,R.sk];});console.log('home',JSON.stringify(roomInfo));
 const run=async(name,cfgExpr,k,pos)=>{const base=await p.evaluate(e=>{const q=window.__qf();return (new Function('q','return '+e))(q).hA.slice();},cfgExpr);
   for(const [tag,f] of [['now',1],['big',k]]){await p.evaluate(([e,f,base,pos])=>{const q=window.__qf();const C=(new Function('q','return '+e))(q);C.hA=[base[0],base[1],base[2]*f,base[3]*f];const R=q.R2();R.x=pos[0];R.y=pos[1];R.cx=null;R.view=0;R.tgt=R.pend=null;},[cfgExpr,f,base,pos]);
     await W(1500);await p.screenshot({path:`${OUT}/${name}_${tag}.jpg`,quality:80});}
   await p.evaluate(([e,base])=>{const q=window.__qf();(new Function('q','return '+e))(q).hA=base;},[cfgExpr,base]);};
 await run('home',"q.hrCfg2(q.R2().sk)",2.0,[900,760]);
 await p.evaluate(()=>window.__qf().clsEnter());await W(5000);await cl();
 await run('class',"q.R2CFGf().class[q.R2().sk]",1.5,[700,900]);
 console.log(JSON.stringify(errs.filter(e=>!/reqfail|Failed to load|TUNNEL|signUp/.test(e)).slice(0,4)));await b.close();})();
