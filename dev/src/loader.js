/* boot loading screen: dark night sky, title, progress, and the class running along the bottom (video cut-outs) */
(function(){if(document.getElementById('bootLoad'))return;
  const css=`#bootLoad{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4E3B2B;
    background:linear-gradient(180deg,#bfe0f2 0%,#e9f2ee 38%,#F8EEDC 70%,#F3E4CB 100%);transition:opacity .8s ease;font-family:"Zen Kaku Gothic New","Hiragino Sans","Noto Sans TC",system-ui,sans-serif}
  #bootLoad.out{opacity:0;pointer-events:none}
  #bootLoad .bl-stars{position:absolute;inset:0;pointer-events:none}
  #bootLoad .bl-mid{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:12vh;text-align:center;padding:0 24px}
  #bootLoad .bl-kana{font:500 12px "Shippori Mincho B1","Hiragino Mincho ProN",serif;letter-spacing:.5em;color:#365E50;opacity:.9;margin:0}
  #bootLoad h1{font:800 clamp(44px,9vh,78px)/1 "Shippori Mincho B1","Hiragino Mincho ProN","Noto Serif TC",serif;letter-spacing:.18em;margin:4px 0 6px;text-shadow:0 3px 0 rgba(255,255,255,.75)}
  #bootLoad .bl-bar{width:min(240px,60vw);height:4px;border-radius:4px;background:rgba(78,59,43,.14);overflow:hidden;margin-top:10px}
  #bootLoad .bl-bar i{display:block;height:100%;width:3%;background:#365E50;border-radius:4px;transition:width .35s ease}
  #bootLoad .bl-msg{font-size:13px;letter-spacing:.14em;color:rgba(78,59,43,.72);margin:2px 0 0}
  #bootLoad .bl-run{position:absolute;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));pointer-events:none}
  #bootLoad canvas{display:block;width:100%;height:clamp(78px,13vh,124px)}
  #bootLoad .bl-track{height:1px;margin:0 6vw;background:repeating-linear-gradient(90deg,rgba(78,59,43,.3) 0 10px,transparent 10px 20px)}
  #bootLoad .bl-cap{margin:8px 0 0;text-align:center;font-size:12px;letter-spacing:.2em;color:rgba(78,59,43,.55)}`;
  const st=document.createElement('style');st.textContent=css;document.head?document.head.appendChild(st):document.body.appendChild(st);
  const el=document.createElement('div');el.id='bootLoad';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.innerHTML='<canvas class="bl-stars" aria-hidden="true"></canvas><div class="bl-mid"><p class="bl-kana">しおみちょう · 闖關地圖</p><h1>汐見町</h1><div class="bl-bar"><i></i></div><p class="bl-msg">正在蓋小鎮…</p></div><div class="bl-run"><canvas aria-hidden="true"></canvas><div class="bl-track"></div><p class="bl-cap">大家一起出發！</p></div>';
  document.body.appendChild(el);
  // stars
  const sc=el.querySelector('.bl-stars'),sx=sc.getContext('2d');const stars=[...Array(90)].map(()=>[Math.random(),Math.random()*.7,Math.random()*1.2+.3,Math.random()*6]);
  // runners
  const cv=el.querySelector('.bl-run canvas'),ctx=cv.getContext('2d');const CW=384,CH=192,COLS=8,FR=27,DUR=4200;
  const img=new Image();img.src='__SHEET__';let sil=null,ok=false;img.onload=()=>{sil=document.createElement('canvas');sil.width=img.width;sil.height=img.height;const g=sil.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fffaf0';g.fillRect(0,0,sil.width,sil.height);ok=true;};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const t0=performance.now();let raf=0,dead=false;
  function fit(c){const d=Math.min(devicePixelRatio||1,2);const w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return d;}
  function draw(now){if(dead)return;const t=now-t0;
    let d=fit(sc);sx.setTransform(d,0,0,d,0,0);const W=sc.clientWidth,H=sc.clientHeight;sx.clearRect(0,0,W,H);
    stars.forEach(([x,y,r,p])=>{sx.globalAlpha=0;sx.fillStyle='#ffffff';sx.beginPath();sx.arc(x*W,y*H,r,0,7);sx.fill();});sx.globalAlpha=1;
    d=fit(cv);ctx.setTransform(d,0,0,d,0,0);const w=cv.clientWidth,h=cv.clientHeight;ctx.clearRect(0,0,w,h);
    if(ok){const gw=Math.min(300,w*.8,(h-6)*2),gh=gw/2,p=(t%DUR)/DUR,f=reduced?13:Math.min(FR-1,Math.floor(p*FR));const x=reduced?(w-gw)/2:-gw+p*(w+gw),y=h-gh;
      const cw=img.width/COLS,ch=img.height/Math.ceil(FR/COLS),fx=(f%COLS)*cw,fy=Math.floor(f/COLS)*ch;for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.drawImage(sil,fx,fy,cw,ch,x+Math.cos(a)*2,y+Math.sin(a)*2,gw,gh);}ctx.drawImage(img,fx,fy,cw,ch,x,y,gw,gh);}
    raf=requestAnimationFrame(draw);}
  raf=requestAnimationFrame(draw);
  const bar=el.querySelector('.bl-bar i'),msg=el.querySelector('.bl-msg');
  // watchdog: if loading stops moving for 20 s, say which step it is stuck on and offer a clean reload
  // (drops the offline copies and the service worker; the student's save is kept)
  window.__ldErr=window.__ldErr||'';addEventListener('error',e=>{window.__ldErr=(e&&e.message)||'error';});addEventListener('unhandledrejection',e=>{const r=e&&e.reason;window.__ldErr=(r&&r.message)||String(r||'');});
  let lastW='',lastT=performance.now(),help=null;
  function stage(){const s=window.__ldStage;const b=document.getElementById('startBtn');
    if(window.__ldErr&&s==='run')return '遊戲程式出錯：'+String(window.__ldErr).slice(0,120);
    if(!s)return '網頁還在下載中（網路比較慢，或手機裡留著舊的檔案）';if(s==='boot')return '正在讀老師的設定';if(!b)return '遊戲程式啟動中';return '正在蓋小鎮（'+(b.textContent||'').replace(/[^0-9%]/g,'')+'）';}
  function showHelp(){if(!help){help=document.createElement('div');help.style.cssText='margin-top:14px;max-width:300px;font-size:13px;line-height:1.6;letter-spacing:.04em;color:#4E3B2B';
      help.innerHTML='<p class="bl-why" style="margin:0 0 8px"></p><button type="button" style="font:700 15px system-ui,sans-serif;padding:10px 18px;border-radius:999px;border:0;background:#365E50;color:#fff">清除舊檔、重新載入</button><p style="margin:8px 0 0;font-size:11px;opacity:.6" class="bl-ver"></p>';
      el.querySelector('.bl-mid').appendChild(help);help.querySelector('button').onclick=async function(){this.disabled=true;this.textContent='重新載入中…';
        try{if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));}}catch(e){}
        try{if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));}}catch(e){}
        try{sessionStorage.removeItem('shiomi_rl');}catch(e){}location.reload();};}
    help.querySelector('.bl-why').textContent='卡住了：'+stage();help.querySelector('.bl-ver').textContent='版本 '+(window.SHIOMI_BUILD||'?')+(navigator.onLine===false?'・手機沒有連上網路':'');}
  const dog=setInterval(()=>{if(dead||el.classList.contains('out')){clearInterval(dog);return;}const w=bar.style.width+'|'+(window.__ldStage||'');if(w!==lastW){lastW=w;lastT=performance.now();}
    if(performance.now()-lastT>20000||(window.__ldErr&&window.__ldStage==='run'&&performance.now()-lastT>4000))showHelp();},1000);
  const poll=setInterval(()=>{const b=document.getElementById('startBtn');if(!b)return;const m=/(\d+)%/.exec(b.textContent||'');if(m)bar.style.width=Math.max(3,+m[1])+'%';
    if(/蓋不起來/.test(b.textContent||'')||!b.disabled){bar.style.width='100%';msg.textContent=b.disabled?'':'小鎮蓋好了！';clearInterval(poll);setTimeout(()=>{el.classList.add('out');setTimeout(()=>{dead=true;cancelAnimationFrame(raf);el.remove();},900);},350);}},150);
})();
