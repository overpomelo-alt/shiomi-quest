const {chromium}=require('playwright-core');
module.exports=async function start(o={}){const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const [w,h,mob]=o.tab?[1180,820,1]:o.land?[1200,750,0]:[412,860,1];
 const p=await (await b.newContext({viewport:{width:w,height:h},hasTouch:!!mob,isMobile:!!mob})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
 p.on('requestfailed',r=>errs.push('reqfail:'+r.url().slice(-60)));
 const W=ms=>p.waitForTimeout(ms);const cl=()=>p.evaluate(()=>{const q=window.__qf();for(let i=0;i<8&&q.DLG.open;i++)q.closeDlg();});
 await p.goto('http://localhost:'+(process.env.PORT||8765)+'/test.html');await p.waitForFunction(()=>{const b=document.getElementById('startBtn');return b&&!b.disabled},null,{timeout:200000});
 await p.fill('#inSeat',o.seat||'2');await p.fill('#inName','G');await p.click('#startBtn');await W(2500);
 if(await p.evaluate(()=>!document.getElementById('dress').hidden))await p.click('#drDone');await W(2500);
 await p.evaluate(()=>{const q=window.__qf();if(q.CUTON())q.cutEnd();});await W(2500);await cl();
 return {b,p,W,cl,errs};}
