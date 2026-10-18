const start=require('./base.js');const land=process.argv[2]==='l',tag=land?'L':'P';
(async()=>{const {b,p,W,cl,errs}=await start({land});
 await p.evaluate(()=>window.__qf().arriveTribe('home',true));await W(500);
 await p.evaluate(()=>window.__qf().enterHome({}));await W(2500);await cl();
 await p.screenshot({path:`sr3_${tag}0.jpg`,quality:70});
 // set a wallpaper/floor and place at bookcase
 const info=await p.evaluate(()=>{const q=window.__qf(),R=q.R2(),C=q.hrCfg2(R.sk);return {sk:R.sk,x:R.x,y:R.y,spots:C.spots.map(s=>[s[0],s[1],s[2]]),walk:C.spots.map(s=>q.r2Walk(s[1],s[2]))};});
 console.log(JSON.stringify(info));
 await p.evaluate(()=>{const q=window.__qf(),R=q.R2(),D=q.hrCfg2(R.sk).spots.find(s=>s[0]==='書櫃');R.x=D[1];R.y=D[2];R.cx=null;});await W(800);
 await p.screenshot({path:`sr3_${tag}1.jpg`,quality:70});
 await p.evaluate(()=>{const q=window.__qf(),H=q.HOME,R=q.R2();const hs=q.W.home;hs.wall=Object.keys(hs).length?hs.wall:0;});
 await p.evaluate(()=>{const q=window.__qf();q.r2Rest(true);});await W(2500);
 await p.screenshot({path:`sr3_${tag}2.jpg`,quality:70});
 console.log(errs.filter(e=>!/font|TUNNEL|404/.test(e)));await b.close();})();
