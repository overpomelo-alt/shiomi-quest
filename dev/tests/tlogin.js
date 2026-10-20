const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const q of ['','?sq2d=1','?sq2d=1&teacher','?teacher&sq2d=1']){const p=await (await b.newContext({viewport:{width:412,height:860},hasTouch:true,isMobile:true})).newPage();
  await p.goto('http://localhost:8766/'+q);await p.waitForFunction(()=>{const b=document.getElementById('startBtn');return b&&!b.disabled},null,{timeout:200000});
  console.log(JSON.stringify(q),'teacherLogin visible:',await p.evaluate(()=>!document.getElementById('teacherLogin').hidden));await p.close();}
 await b.close();})();
