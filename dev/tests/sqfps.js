const start=require('./base.js');const land=process.argv[2]!=='p';
(async()=>{const {b,p,W,cl,errs}=await start({land,seat:'3'});
 const fps=()=>p.evaluate(()=>new Promise(r=>{const q=window.__qf();const R=q.renderer||q.ren;let c0=R?R.info.render.frame:0;let n=0,t=performance.now();function f(){n++;if(performance.now()-t<4000)requestAnimationFrame(f);else r({fps:+(n/4).toFixed(1),gl:R?R.info.render.frame-c0:'?',calls:R?R.info.render.calls:'?',tri:R?R.info.render.triangles:'?'});}requestAnimationFrame(f);}));
 await p.evaluate(()=>window.__qf().gateEnter('map'));await W(6000);await cl();console.log('gate',JSON.stringify(await fps()));
 await p.evaluate(()=>window.__qf().arriveTribe());await W(6000);await cl();console.log('sq_bus',JSON.stringify(await fps()), await p.evaluate(()=>window.__qf().R2().room));
 await p.evaluate(()=>window.__qf().sqEnter('sq_animals','to_classmates',{now:1}));await W(5000);await cl();console.log('sq_animals',JSON.stringify(await fps()));
 console.log(await p.evaluate(()=>Object.keys(window.__qf()).filter(k=>/ren|loop|fps/i.test(k)).join(',')));
 await b.close();})();
