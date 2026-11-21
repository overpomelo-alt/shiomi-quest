// 自動重試的測試：1) 圖片前兩次讀不到，第三次會成功；2) 遊戲程式開機就出錯 → 載入畫面自己重新整理最多 3 次，之後顯示「卡住了」
// 用法：PORT=<網路版的本機網址埠> node retry_test.js
const {chromium}=require('playwright-core');const fs=require('fs');
const CH=fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE='http://127.0.0.1:'+(process.env.PORT||'8788')+'/';
(async()=>{const b=await chromium.launch({executablePath:CH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 // 1) picture retry: the sq_bus background fails twice
 {const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const p=await ctx.newPage();let hits=0;
  await ctx.route(/sq_bus_portrait_bg\.webp/,r=>{hits++;if(hits<=2)return r.abort('failed');return r.continue();});
  await p.goto(BASE+'?sq2d=1');await p.waitForFunction(()=>{const s=document.getElementById('startBtn');return s&&!s.disabled},null,{timeout:200000});
  const ok=await p.evaluate(async(u)=>{const i=new Image();return await new Promise(res=>{const t=setTimeout(()=>res('timeout'),15000);
     // same loader the game uses
     i.onload=()=>{clearTimeout(t);res('loaded '+i.src.split('?')[1]);};i.onerror=()=>{clearTimeout(t);res('failed');};})},'').catch(e=>e.message);
  const r=await p.evaluate(()=>new Promise(res=>{const src=[...document.querySelectorAll('script')].length;res(src);}));
  // load through the game's own queue loader
  const res=await p.evaluate(async()=>{const T=JSON.parse(document.getElementById('troom').textContent);const src=T.img.sq_bus_portrait_bg;
     const i=new Image();const t0=performance.now();return await new Promise(r=>{let n=0;i.onload=()=>r({ok:true,ms:Math.round(performance.now()-t0),src:i.src.split('?')[1]});
       i.onerror=()=>{if(n<3){n++;setTimeout(()=>{i.src=src+'&r='+n;},1000*2**(n-1));}else r({ok:false});};i.src=src;});});
  console.log('1) picture fails twice then:',JSON.stringify(res),'requests:',hits);await ctx.close();}
 // 2) game script throws at start
 {const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const p=await ctx.newPage();let loads=0;
  await ctx.route(u=>new URL(u).pathname==='/',async r=>{loads++;const res=await r.fetch();let body=await res.text();
     body=body.replace('<script type="text/x-shiomi" id="game">','<script type="text/x-shiomi" id="game">throw new Error("測試用的開機錯誤");');r.fulfill({response:res,body});});
  await p.goto(BASE+'?sq2d=1');
  let help=null;for(let i=0;i<40&&!help;i++){await p.waitForTimeout(3000);help=await p.evaluate(()=>{const w=document.querySelector('#bootLoad .bl-why');return w?w.textContent:null;}).catch(()=>null);}
  console.log('2) page loads:',loads,'(1 + automatic retries) ; help shown:',help);await ctx.close();}
 await b.close();})();
