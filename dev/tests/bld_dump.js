const start=require('./base.js');
(async()=>{const {b,p,W,errs}=await start({land:1,seat:'3'});
 const r=await p.evaluate(()=>{const q=window.__qf();const TB=q.TB;return JSON.stringify({bld:TB.bld,houses:Object.fromEntries(Object.entries(TB.houses).map(([k,v])=>[k,[+v.x.toFixed(2),+v.z.toFixed(2),+v.y.toFixed(2),+v.top.toFixed(2)]]))});});
 require('fs').writeFileSync(process.argv[2],r);console.log(r.length,JSON.stringify(errs.slice(0,5)));await b.close();})();
