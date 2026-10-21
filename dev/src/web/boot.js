/* hosted boot: read the teacher's saved settings (shiomi/config in Firestore) before the game starts.
   Waits at most 3.5 s — without a network the game starts with the settings built into the page. */
(function(){window.__ldStage='boot';const KEY='AIzaSyBadU_r4HVpovuYmKh60Fzra1DJjwg80Xs',BASE='https://firestore.googleapis.com/v1/projects/shiomi-quest/databases/(default)/documents/shiomi';
  let done=false;const run=()=>{if(done)return;done=true;window.__ldStage='run';['engine','game'].forEach(id=>{const o=document.getElementById(id);const s=document.createElement('script');s.textContent=o.textContent;document.body.appendChild(s);});};
  const T=setTimeout(run,3500);
  const to=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
  async function auth(){let s=null;try{s=JSON.parse(localStorage.getItem('shiomi-fb')||'null');}catch(e){}
    if(s&&s.rt){try{const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+KEY,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(s.rt)});
      if(r.ok){const j=await r.json();return {tok:j.id_token,rt:j.refresh_token,exp:Date.now()+(+j.expires_in||3600)*1000};}}catch(e){}}
    const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"returnSecureToken":true}'});
    if(!r.ok)throw new Error('auth');const j=await r.json();return {tok:j.idToken,rt:j.refreshToken,exp:Date.now()+(+j.expiresIn||3600)*1000};}
  (async()=>{try{const a=await to(auth(),3000);window.__fbTok=a;try{localStorage.setItem('shiomi-fb',JSON.stringify({rt:a.rt}));}catch(e){}
    const r=await to(fetch(BASE+'/config',{headers:{Authorization:'Bearer '+a.tok}}),3000);
    if(r.ok&&!done){const j=await r.json();const rem=JSON.parse(j.fields.d.stringValue),q=document.getElementById('quest'),emb=JSON.parse(q.textContent);
      // the teacher's saved settings win; stations added to the game after her last save are appended
      if((+emb.rev||0)>(+rem.baseRev||0)){const ids=new Set((rem.stations||[]).map(s=>s.id));(emb.stations||[]).forEach(s=>{if(!ids.has(s.id))(rem.stations=rem.stations||[]).push(s);});}
      rem.rev=emb.rev;q.textContent=JSON.stringify(rem);window.__cfgRemote=+j.fields.t.integerValue||1;}}catch(e){}
    clearTimeout(T);run();})();
  if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));})();
