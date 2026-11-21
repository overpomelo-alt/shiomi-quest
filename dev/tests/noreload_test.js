// 新版本上線時：還沒開始玩 → 決定重新載入一次換新版；已經登入在玩（window.__playing）→ 不重新載入，等下次打開
const {chromium}=require('playwright-core');const fs=require('fs');
const CH=fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE='http://127.0.0.1:'+(process.env.PORT||'8788')+'/';
(async()=>{const b=await chromium.launch({executablePath:CH});
 for(const playing of [false,true]){const ctx=await b.newContext({serviceWorkers:'block'});const p=await ctx.newPage();
  if(playing)await p.addInitScript(()=>{window.__playing=true;});
  // 新版本號在 4 秒後才回來（像網路慢的時候，學生已經開始玩了）
  await ctx.route(/version\.json/,async r=>{await new Promise(ok=>setTimeout(ok,4000));await r.fulfill({status:200,contentType:'application/json',body:'{"v":"9999-9999"}'}).catch(()=>{});});
  // 不需要真的建遊戲：把遊戲程式拿掉，只留版本檢查
  await ctx.route(u=>new URL(u).pathname==='/',async r=>{const res=await r.fetch();const body=(await res.text()).replace(/<script id="boot">[\s\S]*?<\/script>/,'');await r.fulfill({response:res,body});});
  await p.goto(BASE,{waitUntil:'commit'});await p.waitForTimeout(7000);
  const rl=await Promise.race([p.evaluate(()=>sessionStorage.getItem('shiomi_rl')).catch(()=>'reloading'),new Promise(ok=>setTimeout(()=>ok('reloading'),5000))]);
  console.log(playing?'已經在玩：':'還沒開始玩：',rl?'會重新載入換新版':'不重新載入');}
 process.exit(0);})();
