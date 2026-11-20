const {chromium}=require('playwright-core');const fs=require('fs');
// 瀏覽器：環境變數 CHROME，或自動找 /opt/pw-browsers 裡的 chromium（換環境不用改這裡）
function chromePath(){if(process.env.CHROME)return process.env.CHROME;const B='/opt/pw-browsers';
  for(const p of [B+'/chromium',...fs.readdirSync(B).filter(d=>/^chromium-\d+$/.test(d)).sort().reverse().flatMap(d=>[B+'/'+d+'/chrome-linux64/chrome',B+'/'+d+'/chrome-linux/chrome'])])
    try{if(fs.statSync(p).isFile())return p;}catch(e){}throw new Error('找不到 chromium，請設定 CHROME');}
// 畫面大小：環境變數 SIZE 優先（phone=390×844、small=360×780、tab=學校平板橫式 1280×800），沒設就照舊（o.land 橫式電腦、o.tab 平板、預設手機直式）
const SIZES={phone:[390,844,1],small:[360,780,1],tab:[1280,800,1]};
module.exports=async function start(o={}){const b=await chromium.launch({executablePath:chromePath(),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const [w,h,mob]=SIZES[process.env.SIZE]||(o.tab?[1180,820,1]:o.land?[1200,750,0]:[412,860,1]);
 const p=await (await b.newContext({viewport:{width:w,height:h},hasTouch:!!mob,isMobile:!!mob})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
 p.on('requestfailed',r=>errs.push('reqfail:'+r.url().slice(-60)));
 const W=ms=>p.waitForTimeout(ms);const cl=()=>p.evaluate(()=>{const q=window.__qf();for(let i=0;i<8&&q.DLG.open;i++)q.closeDlg();});
 await p.goto('http://localhost:'+(process.env.PORT||8765)+'/test.html'+(process.env.Q?'?'+process.env.Q:''));await p.waitForFunction(()=>{const b=document.getElementById('startBtn');return b&&!b.disabled},null,{timeout:200000});
 await p.fill('#inSeat',o.seat||'2');await p.fill('#inName','G');await p.click('#startBtn');await W(2500);
 if(await p.evaluate(()=>!document.getElementById('dress').hidden))await p.click('#drDone');await W(2500);
 await p.evaluate(()=>{const q=window.__qf();if(q.CUTON())q.cutEnd();});await W(2500);await cl();
 return {b,p,W,cl,errs};}
