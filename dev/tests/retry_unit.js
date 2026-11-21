// 用遊戲自己的 aqLoad / fbFetch 測自動重試（本機版 test.html）
const start=require('./base.js');
(async()=>{const {b,p,W,errs}=await start({seat:'3'});const ctx=p.context();
 // 圖片：前兩次讀不到 → 馬上回報失敗（不擋排隊），背景再試，第三次讀到
 let hits=0;await ctx.route(/sq_bus_portrait_bg\.webp/,r=>{hits++;return hits<=2?r.abort('failed'):r.continue();});
 const pic=await p.evaluate(async()=>{const q=window.__qf();const T=JSON.parse(document.getElementById('troom').textContent);const i=new Image();
   let first;try{await q.aqLoad(i,T.img.sq_bus_portrait_bg);first='ok';}catch(e){first='failed-first';}
   await new Promise(ok=>setTimeout(ok,6000));return first+' → later '+(i.complete&&i.naturalWidth?'loaded '+i.src.split('?')[1]:'not loaded');});
 console.log('picture (fails twice):',pic,'requests',hits);
 // 雲端：忙兩次 → 第三次成功
 await p.evaluate(()=>window.__qf().fbDownReset());
 let n=0;await ctx.route('**/fake-cloud/**',r=>{n++;return n<=2?r.fulfill({status:503,body:'busy'}):r.fulfill({status:200,body:'{"ok":1}'});});
 const cloud=await p.evaluate(async()=>{const r=await window.__qf().fbFetch(location.origin+'/fake-cloud/x');return r.status+' '+(await r.text());});
 console.log('cloud (busy twice):',cloud,'requests',n);
 // 雲端：一直連不上 → 試 4 次後放棄，接下來 1 分鐘不再重試
 await p.evaluate(()=>window.__qf().fbDownReset());
 let m=0;await ctx.route('**/fake-down/**',r=>{m++;return r.abort('failed');});
 let t0=Date.now();const down=await p.evaluate(async()=>{try{await window.__qf().fbFetch(location.origin+'/fake-down/x');return 'no error?';}catch(e){return 'gave up';}});
 console.log('cloud (always down):',down,'requests',m,'after',((Date.now()-t0)/1000).toFixed(1),'s');
 m=0;t0=Date.now();await p.evaluate(async()=>{try{await window.__qf().fbFetch(location.origin+'/fake-down/y');}catch(e){}});
 console.log('cloud (next call within 1 min):','requests',m,'after',((Date.now()-t0)/1000).toFixed(1),'s');
 await b.close();})();
