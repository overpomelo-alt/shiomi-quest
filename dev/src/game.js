
(async function(){
'use strict';
(document.body||document.documentElement).insertAdjacentHTML('afterbegin',MARKUP);
const T=THREE;
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
if(IS_TOUCH) document.body.classList.add('touch');
const tick=async(msg)=>{const b=document.getElementById('startBtn');if(b)b.textContent=msg;await new Promise(r=>setTimeout(r,16));};
await tick('正在蓋小鎮… 5%');
if(!(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;}})())throw new Error('瀏覽器關閉了 3D 繪圖（WebGL）');

/* ================================================================
   Utilities
   ================================================================ */
let seed=20260925;
function rand(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
const rr=(a,b)=>a+(b-a)*rand(), pick=a=>a[Math.floor(rand()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const col=h=>new T.Color(h).convertSRGBToLinear();
const PI=Math.PI;
function hash2(x,y){const h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h);}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(hash2(xi,yi),hash2(xi+1,yi),u),lerp(hash2(xi,yi+1),hash2(xi+1,yi+1),u),v);}
function fbm(x,y){let s=0,a=.5,f=1;for(let i=0;i<4;i++){s+=a*vnoise(x*f,y*f);f*=2.03;a*=.5;}return s/.9375;}

const FM='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
const FG='"Zen Kaku Gothic New","Hiragino Sans","Yu Gothic",sans-serif';
try{ if(document.fonts){ await Promise.race([Promise.all([document.fonts.load('800 60px "Shippori Mincho B1"'),document.fonts.load('700 40px "Zen Kaku Gothic New"')]),new Promise(r=>setTimeout(r,2500))]); } }catch(e){}

// film grain tile
(function(){const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d');const d=g.createImageData(180,180);
  for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}g.putImageData(d,0,0);
  document.getElementById('grain').style.backgroundImage=`url(${c.toDataURL()})`;})();

/* ================================================================
   Renderer / scene
   ================================================================ */
const stage=document.getElementById('stage');
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,IS_TOUCH?1.25:1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=T.sRGBEncoding;
renderer.toneMapping=T.ACESFilmicToneMapping;
// art pack v0.2 look: ACES flattens greens and blues toward grey; give the colour back after the curve (+18% saturation, a touch of contrast)
T.ShaderChunk.tonemapping_pars_fragment=T.ShaderChunk.tonemapping_pars_fragment.replace('color = ACESOutputMat * color;\n\treturn saturate( color );',
  'color = ACESOutputMat * color;\n\tcolor = saturate( color );\n\tfloat lumG = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );\n\tcolor = mix( vec3( lumG ), color, 1.14 );\n\tcolor *= vec3( 1.02, 1.0, 0.975 );\n\tcolor = ( color - 0.5 ) * 1.07 + 0.5;\n\treturn saturate( color );');
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;
const MAXANI=Math.min(8,renderer.capabilities.getMaxAnisotropy());

const scene=new T.Scene();
scene.fog=new T.Fog(0x000000,40,800);
const camera=new T.PerspectiveCamera(50,innerWidth/innerHeight,0.1,3200);
const hemi=new T.HemisphereLight(0xffffff,0x333333,.7);scene.add(hemi);
const sun=new T.DirectionalLight(0xffffff,2);
sun.castShadow=true;sun.shadow.mapSize.set(IS_TOUCH?1024:2048,IS_TOUCH?1024:2048);
Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:420});
sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.035;
scene.add(sun);scene.add(sun.target);

/* ================================================================
   Time of day
   ================================================================ */
const PRESETS={
  sunset:{jp:'夕暮れ',clock:[18,6],sunDir:[.30,.075,-1],sunColor:'#ffc6a0',sunI:1.85,hemiSky:'#cfc0c8',hemiGround:'#4f4a5c',hemiI:.95,
    skyTop:'#26376a',skyHorizon:'#f6a06a',skyBottom:'#c98a78',fog:'#d9a892',fogNear:40,fogFar:950,glowCol:'#ffb070',disk:1,glow:1,
    clouds:.85,cloudLit:'#ffbd8a',cloudDark:'#6a5178',stars:.05,lamps:.62,windows:.6,exposure:1.0,motes:1,seaSun:1.2,night:0,dusk:1,day:0,
    seaDeep:'#1a2d4a',seaShallow:'#3c6275',light:.95,sprTint:'#ffe4d0'},
  // a bright storybook night: strong moonlight and sky fill so roads, houses and trees stay readable, warm street lamps on top
  night:{jp:'夜',clock:[21,12],sunDir:[-.25,.55,-.8],sunColor:'#a0b4ec',sunI:.8,hemiSky:'#6478b6',hemiGround:'#2e3248',hemiI:.9,
    skyTop:'#0c1838',skyHorizon:'#34497c',skyBottom:'#1a2850',fog:'#2a3a64',fogNear:40,fogFar:760,glowCol:'#c3d0ff',disk:.95,glow:.45,
    clouds:.4,cloudLit:'#5a6a98',cloudDark:'#18203a',stars:1,lamps:1,windows:1,exposure:1.4,motes:0,seaSun:.7,night:1,dusk:0,day:0,
    seaDeep:'#0a1428',seaShallow:'#1a3050',light:.6,sprTint:'#b8c2e6'},
  // art pack v0.2: a clear, sunny late morning — deep blue sky, clean far haze, warm white sun
  day:{jp:'昼下がり',clock:[14,32],sunDir:[.55,.62,-.45],sunColor:'#fff0d6',sunI:2.35,hemiSky:'#cfe4f8',hemiGround:'#6f6a52',hemiI:.9,
    skyTop:'#2a7bd6',skyHorizon:'#a8d2f2',skyBottom:'#9ccbea',fog:'#bcdaf0',fogNear:130,fogFar:1250,glowCol:'#fff6e4',disk:1,glow:.45,
    clouds:.95,cloudLit:'#ffffff',cloudDark:'#c3d4e8',stars:0,lamps:0,windows:.04,exposure:1.0,motes:.2,seaSun:.7,night:0,dusk:0,day:1,
    seaDeep:'#1a6ea6',seaShallow:'#36b4c6',light:1.08,sprTint:'#ffffff'}
};
const CK=['sprTint','sunColor','hemiSky','hemiGround','skyTop','skyHorizon','skyBottom','fog','glowCol','cloudLit','cloudDark','seaDeep','seaShallow'];
const NK=['sunI','hemiI','fogNear','fogFar','disk','glow','clouds','stars','lamps','windows','exposure','motes','seaSun','night','dusk','day','light'];
function toState(p){const s={};CK.forEach(k=>s[k]=col(p[k]));NK.forEach(k=>s[k]=p[k]);s.sunDir=new T.Vector3(...p.sunDir).normalize();return s;}
function blendState(a,b,t,o){CK.forEach(k=>{o[k]=o[k]||new T.Color();o[k].copy(a[k]).lerp(b[k],t);});NK.forEach(k=>o[k]=lerp(a[k],b[k],t));o.sunDir=(o.sunDir||new T.Vector3()).copy(a.sunDir).lerp(b.sunDir,t).normalize();return o;}
const PS={};for(const k in PRESETS)PS[k]=toState(PRESETS[k]);
const S=blendState(PS.sunset,PS.sunset,1,{});
const ORDER=['sunset','night','day'];
let todIdx=0,envFrom=PS.sunset,envTo=PS.sunset,envK=1,clockBase=0;

/* ================================================================
   Canvas textures
   ================================================================ */
/* ICONS:BEGIN */
const ICONS={"arrow": "<line x1=\"3.0\" y1=\"12.0\" x2=\"20.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"14.0\" y1=\"6.0\" x2=\"20.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"14.0\" y1=\"18.0\" x2=\"20.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "bag": "<rect x=\"4.0\" y=\"6.0\" width=\"16.0\" height=\"16.0\" rx=\"4.0\" fill=\"none\" stroke=\"currentColor\"/> <rect x=\"8.0\" y=\"2.0\" width=\"8.0\" height=\"5.0\" rx=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <rect x=\"7.0\" y=\"14.0\" width=\"10.0\" height=\"5.0\" rx=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"8.0\" y1=\"10.0\" x2=\"16.0\" y2=\"10.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "book": "<polyline points=\"2.0,4.0 10.0,4.0 12.0,6.0 14.0,4.0 22.0,4.0 22.0,20.0 14.0,20.0 12.0,22.0 10.0,20.0 2.0,20.0 2.0,4.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <line x1=\"12.0\" y1=\"6.0\" x2=\"12.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "chair": "<rect x=\"6.0\" y=\"3.0\" width=\"12.0\" height=\"9.0\" rx=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <rect x=\"4.0\" y=\"13.0\" width=\"16.0\" height=\"4.0\" rx=\"1.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"6.0\" y1=\"17.0\" x2=\"6.0\" y2=\"23.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"18.0\" y1=\"17.0\" x2=\"18.0\" y2=\"23.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"6.0\" y1=\"12.0\" x2=\"6.0\" y2=\"13.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"18.0\" y1=\"12.0\" x2=\"18.0\" y2=\"13.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "check": "<polyline points=\"3.0,12.0 9.0,18.0 21.0,5.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/>", "close": "<line x1=\"5.0\" y1=\"5.0\" x2=\"19.0\" y2=\"19.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"19.0\" y1=\"5.0\" x2=\"5.0\" y2=\"19.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "coin": "<circle cx=\"12.0\" cy=\"12.0\" r=\"9.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"12.0\" cy=\"12.0\" r=\"6.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"12.0\" y1=\"8.0\" x2=\"12.0\" y2=\"16.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "home": "<polyline points=\"2.0,11.0 12.0,2.0 22.0,11.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <line x1=\"5.0\" y1=\"9.0\" x2=\"5.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"19.0\" y1=\"9.0\" x2=\"19.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"5.0\" y1=\"22.0\" x2=\"19.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <rect x=\"10.0\" y=\"14.0\" width=\"5.0\" height=\"8.0\" rx=\"0.0\" fill=\"none\" stroke=\"currentColor\"/>", "jump": "<polyline points=\"5.0,11.0 12.0,4.0 19.0,11.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.0\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <line x1=\"12.0\" y1=\"4.0\" x2=\"12.0\" y2=\"21.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "map": "<polyline points=\"2.0,5.0 8.0,2.0 16.0,5.0 22.0,2.0 22.0,19.0 16.0,22.0 8.0,19.0 2.0,22.0 2.0,5.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <line x1=\"8.0\" y1=\"2.0\" x2=\"8.0\" y2=\"19.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"16.0\" y1=\"5.0\" x2=\"16.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "menu": "<line x1=\"3.0\" y1=\"5.0\" x2=\"21.0\" y2=\"5.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"3.0\" y1=\"12.0\" x2=\"21.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"3.0\" y1=\"19.0\" x2=\"21.0\" y2=\"19.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "paw": "<circle cx=\"12.0\" cy=\"15.0\" r=\"5.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"4.0\" cy=\"9.0\" r=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"8.0\" cy=\"4.0\" r=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"16.0\" cy=\"4.0\" r=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"20.0\" cy=\"9.0\" r=\"2.0\" fill=\"none\" stroke=\"currentColor\"/>", "rotate": "<polyline points=\"19.0,8.0 17.0,4.0 10.0,3.0 5.0,7.0 4.0,14.0 8.0,19.0 15.0,20.0 20.0,16.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <polyline points=\"14.0,8.0 20.0,8.0 20.0,2.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/>", "run": "<circle cx=\"15.0\" cy=\"4.0\" r=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"12.0\" y1=\"8.0\" x2=\"17.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"12.0\" y1=\"8.0\" x2=\"8.0\" y2=\"14.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"8.0\" y1=\"14.0\" x2=\"14.0\" y2=\"17.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"14.0\" y1=\"17.0\" x2=\"16.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"8.0\" y1=\"14.0\" x2=\"3.0\" y2=\"20.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"10.0\" y1=\"9.0\" x2=\"5.0\" y2=\"8.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "settings": "<circle cx=\"12.0\" cy=\"12.0\" r=\"7.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"12.0\" cy=\"12.0\" r=\"2.5\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"12.0\" y1=\"1.0\" x2=\"12.0\" y2=\"5.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"12.0\" y1=\"19.0\" x2=\"12.0\" y2=\"23.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"1.0\" y1=\"12.0\" x2=\"5.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"19.0\" y1=\"12.0\" x2=\"23.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "shop": "<rect x=\"4.0\" y=\"10.0\" width=\"16.0\" height=\"12.0\" rx=\"0.0\" fill=\"none\" stroke=\"currentColor\"/> <polyline points=\"2.0,10.0 4.0,3.0 20.0,3.0 22.0,10.0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/> <line x1=\"2.0\" y1=\"10.0\" x2=\"22.0\" y2=\"10.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <rect x=\"9.0\" y=\"14.0\" width=\"6.0\" height=\"8.0\" rx=\"0.0\" fill=\"none\" stroke=\"currentColor\"/>", "stamp": "<rect x=\"4.0\" y=\"16.0\" width=\"16.0\" height=\"5.0\" rx=\"1.0\" fill=\"none\" stroke=\"currentColor\"/> <circle cx=\"12.0\" cy=\"7.0\" r=\"4.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"9.0\" y1=\"11.0\" x2=\"8.0\" y2=\"16.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"15.0\" y1=\"11.0\" x2=\"16.0\" y2=\"16.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "sun": "<circle cx=\"12.0\" cy=\"12.0\" r=\"5.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"12.0\" y1=\"1.0\" x2=\"12.0\" y2=\"4.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"12.0\" y1=\"20.0\" x2=\"12.0\" y2=\"23.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"1.0\" y1=\"12.0\" x2=\"4.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"20.0\" y1=\"12.0\" x2=\"23.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "task": "<rect x=\"4.0\" y=\"3.0\" width=\"16.0\" height=\"19.0\" rx=\"2.0\" fill=\"none\" stroke=\"currentColor\"/> <rect x=\"8.0\" y=\"1.0\" width=\"8.0\" height=\"4.0\" rx=\"1.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"8.0\" y1=\"10.0\" x2=\"10.0\" y2=\"12.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"10.0\" y1=\"12.0\" x2=\"15.0\" y2=\"7.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"8.0\" y1=\"17.0\" x2=\"16.0\" y2=\"17.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>", "teacher": "<rect x=\"2.0\" y=\"2.0\" width=\"20.0\" height=\"13.0\" rx=\"1.0\" fill=\"none\" stroke=\"currentColor\"/> <line x1=\"7.0\" y1=\"19.0\" x2=\"17.0\" y2=\"19.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"12.0\" y1=\"15.0\" x2=\"12.0\" y2=\"22.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"7.0\" y1=\"6.0\" x2=\"17.0\" y2=\"6.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/> <line x1=\"7.0\" y1=\"10.0\" x2=\"13.0\" y2=\"10.0\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>"};
function ICON(n,c){const b=ICONS[n];return b?`<svg class="ic${c?" "+c:""}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`:"";}
/* ICONS:END */
function C2(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function TX(c,rep){const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=MAXANI;if(rep)t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const SPK_K=.4;   // art pack v0.2 p17: plaster/asphalt keep only a few faint specks
function speckle(g,w,h,n,a=.08){a*=SPK_K;for(let i=0;i<n;i++){g.fillStyle=rand()<.5?`rgba(0,0,0,${rand()*a})`:`rgba(255,255,255,${rand()*a})`;g.fillRect(rand()*w,rand()*h,1+rand()*2.5,1+rand()*2.5);}}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function vtext(g,str,x,y,size,font,color,gap=1.08){g.font=`${size}px ${font}`;g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';[...str].forEach((ch,i)=>g.fillText(ch,x,y+i*size*gap));}

const glowTex=(()=>{const [c,g]=C2(128,128);const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.16,'rgba(255,255,255,.6)');r.addColorStop(.42,'rgba(255,255,255,.14)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new T.CanvasTexture(c);})();
const poolTex=(()=>{const [c,g]=C2(128,128);const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,.9)');r.addColorStop(.45,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new T.CanvasTexture(c);})();

function asphaltTex(kind){const [c,g]=C2(256,256);g.fillStyle='#57565c';g.fillRect(0,0,256,256);speckle(g,256,256,5200,.13);
  for(let i=0;i<5;i++){g.fillStyle=`rgba(22,22,28,${rr(.05,.13)})`;g.fillRect(rr(0,200),rr(0,200),rr(20,70),rr(20,90));}
  g.strokeStyle='rgba(18,18,20,.28)';for(let i=0;i<6;i++){g.beginPath();let x=rr(20,236),y=rr(0,256);g.moveTo(x,y);for(let k=0;k<6;k++){x+=rr(-12,12);y+=rr(-14,14);g.lineTo(x,y);}g.stroke();}
  g.fillStyle='rgba(236,232,222,.9)';
  if(kind!=='plain'){g.fillRect(9,0,7,256);g.fillRect(240,0,7,256);}
  if(kind==='center'){for(let y=0;y<256;y+=128)g.fillRect(125,y,6,70);}
  return TX(c,true);}
function plainTex(base,n,a,rep=true,extra){const [c,g]=C2(256,256);g.fillStyle=base;g.fillRect(0,0,256,256);speckle(g,256,256,n,a);if(extra)extra(g);return TX(c,rep);}
function roofTex(base){const [c,g]=C2(128,128);g.fillStyle=base;g.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=11){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,y,128,2);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(0,y+2,128,2);}
  for(let x=0;x<128;x+=9){g.fillStyle='rgba(0,0,0,.10)';g.fillRect(x,0,2,128);}
  speckle(g,128,128,700,.07);return TX(c,true);}

// facade textures (walls with windows + emissive night windows)
const PALS=[
  {wall:'#f3e7d2',frame:'#fbf6ec'},{wall:'#d9c7a8',frame:'#f6f0e4',siding:1},{wall:'#a07a58',frame:'#efe4d0',wood:1},
  {wall:'#c3ccc6',frame:'#f6f3ea',siding:1},{wall:'#f6efe2',frame:'#be8952'},{wall:'#a9b6bf',frame:'#f4f1e8',siding:1},
  {wall:'#e6c4ad',frame:'#f8f1e6'},{wall:'#b39672',frame:'#f1e8d6',wood:1}];
const LIT=['#ffcf8f','#ffd9a0','#fff0d4','#ffc27a','#e8eeff','#ffe3b8'];
function facadeTex(floors,pal){
  const W=256,H=floors===2?256:150,[c,g]=C2(W,H),[ce,ge]=C2(W,H);
  g.fillStyle=pal.wall;g.fillRect(0,0,W,H);
  if(pal.siding){for(let y=0;y<H;y+=6){g.fillStyle='rgba(0,0,0,.045)';g.fillRect(0,y,W,1);}}
  if(pal.wood){for(let y=0;y<H;y+=9){g.fillStyle='rgba(0,0,0,.1)';g.fillRect(0,y,W,2);g.fillStyle='rgba(255,230,200,.05)';g.fillRect(0,y+2,W,2);}}
  speckle(g,W,H,1800,.07);
  for(let i=0;i<12;i++){g.fillStyle='rgba(40,30,22,.012)';g.fillRect(rr(14,W-8),10,rr(2,7),rr(20,H*.7));}
  ge.fillStyle='#000';ge.fillRect(0,0,W,H);
  const fh=H/floors;
  for(let f=0;f<floors;f++){
    const y0=H-(f+1)*fh;
    if(f>0){g.fillStyle='rgba(0,0,0,.16)';g.fillRect(0,y0+fh-4,W,3);}
    const n=pick([2,3,3]);
    for(let i=0;i<n;i++){
      const ww=W/n*rr(.42,.56),x=(i+.5)*W/n-ww/2,wy=y0+fh*.2,wh=fh*rr(.46,.56);
      g.fillStyle='rgba(78,59,43,.22)';g.fillRect(x-7,wy-7,ww+15,wh+15);g.fillStyle=pal.frame;g.fillRect(x-6,wy-6,ww+12,wh+12);
      g.fillStyle='#5d7383';g.fillRect(x,wy,ww,wh);
      const gr=g.createLinearGradient(x,wy,x+ww,wy+wh);gr.addColorStop(0,'rgba(255,255,255,.2)');gr.addColorStop(.5,'rgba(255,255,255,.02)');gr.addColorStop(1,'rgba(255,255,255,.1)');g.fillStyle=gr;g.fillRect(x,wy,ww,wh);
      const cur=pick(['#e9d7b0','#cfe0d8','#f0c9b8','#d8d0e8',null,null]);
      if(cur){g.globalAlpha=.6;g.fillStyle=cur;g.fillRect(x,wy,ww*.26,wh);g.fillRect(x+ww*.74,wy,ww*.26,wh);g.globalAlpha=1;}
      g.fillStyle='rgba(40,30,22,.45)';g.fillRect(x,wy,ww,5);g.fillRect(x,wy,3,wh);   // recess: the head and jamb throw a shadow on the glass
      g.fillStyle=pal.frame;g.fillRect(x+ww/2-1,wy,3,wh);
      g.fillStyle='#fbf7ee';g.fillRect(x-8,wy+wh+4,ww+16,5);g.fillStyle='rgba(78,59,43,.3)';g.fillRect(x-8,wy+wh+9,ww+16,3);
      if(f===floors-1&&rand()<.4){g.fillStyle='rgba(60,60,60,.5)';g.fillRect(x-5,wy-9,ww+10,5);} // shutter box
      if(rand()<.62){const lc=pick(LIT);ge.fillStyle=lc;ge.fillRect(x,wy,ww,wh);
        if(cur){ge.globalAlpha=.55;ge.fillStyle='#ffb070';ge.fillRect(x,wy,ww*.26,wh);ge.fillRect(x+ww*.74,wy,ww*.26,wh);ge.globalAlpha=1;}
        ge.fillStyle='rgba(0,0,0,.6)';ge.fillRect(x+ww/2-1,wy,3,wh);
        if(rand()<.35){ge.fillStyle='rgba(0,0,0,.45)';ge.fillRect(x+ww*rr(.2,.6),wy+wh*.35,ww*.12,wh*.65);} // silhouette
      }
    }
  }
  return {map:TX(c),emap:TX(ce)};
}

/* ================================================================
   Materials
   ================================================================ */
const MC={};
function lam(h,extra){if(!extra)return MC[h]||(MC[h]=new T.MeshLambertMaterial({color:col(h)}));return new T.MeshLambertMaterial(Object.assign({color:col(h)},extra));}
const EM={windows:[],signs:[],lamps:[],store:[]};
function emMat(map,emap,list,extra={}){const m=new T.MeshLambertMaterial(Object.assign({color:0xffffff,map,emissiveMap:emap||map,emissive:0xffffff,emissiveIntensity:1},extra));EM[list].push(m);return m;}

const M={
  concrete:lam('#a39d92',{map:plainTex('#aaa498',2600,.1)}),
  concreteDark:lam('#7d786f',{map:plainTex('#8a857b',2600,.1)}),
  ground:lam('#ffffff',{map:plainTex('#9a9383',6000,.12,true,g=>{for(let i=0;i<14;i++){g.fillStyle=`rgba(${rand()<.5?'70,80,50':'60,50,40'},${rr(.06,.14)*.3})`;g.beginPath();g.arc(rr(0,256),rr(0,256),rr(8,30),0,7);g.fill();}})}),
  wood:lam('#7a5638'),woodDark:lam('#4a3324'),woodLight:lam('#b08a5e'),
  metal:lam('#7f8c86'),metalDark:lam('#4a5852'),white:lam('#efeeea'),black:lam('#1e1e22'),
  ridge:lam('#4e3b2b'),pole:lam('#a7aea6',{map:plainTex('#a7aea6',1500,.1)}),
  leaf:lam('#4f7a4c'),leaf2:lam('#6a8f52'),pine:lam('#365e50'),trunk:lam('#7a5a40'),
  pot:lam('#a0583a'),pot2:lam('#5f7e8f'),red:lam('#c8432b'),shu:lam('#c9432a'),
  lampHead:new T.MeshLambertMaterial({color:col('#fff4dc'),emissive:col('#ffd9a0'),emissiveIntensity:1}),
  roofFlat:lam('#8b877f'),glassDark:lam('#28323c'),rail:new T.MeshPhongMaterial({color:col('#7a756f'),specular:col('#c9b9a8'),shininess:70}),
  stone:lam('#8f8a80',{map:plainTex('#8f8a80',3000,.14)}),
  block:lam('#ffffff',{map:(()=>{const [c,g]=C2(128,128);g.fillStyle='#a8a59c';g.fillRect(0,0,128,128);speckle(g,128,128,900,.1);g.fillStyle='rgba(0,0,0,.25)';for(let y=0;y<128;y+=32){g.fillRect(0,y,128,2);for(let x=((y/32)%2)*32;x<128;x+=64)g.fillRect(x,y,2,32);}return TX(c,true);})()}),
};
EM.lamps.push(M.lampHead);
const ROOFM=['#3d4553','#2e3138','#6a3c2c','#3b5a78','#4a6758','#8f4a34','#54575d'].map(h=>lam('#ffffff',{map:roofTex(h),side:T.DoubleSide}));
const FAC={1:[],2:[]};
PALS.forEach(p=>{[1,2].forEach(f=>{const t=facadeTex(f,p);FAC[f].push(emMat(t.map,t.emap,'windows'));});});
const doorTex=(()=>{const [c,g]=C2(64,128),[ce,ge]=C2(64,128);g.fillStyle='#b8b6ae';g.fillRect(0,0,64,128);g.fillStyle='#dcd6c6';g.fillRect(5,6,25,116);g.fillRect(34,6,25,116);
  g.strokeStyle='rgba(120,110,95,.55)';for(let y=14;y<120;y+=14){g.beginPath();g.moveTo(5,y);g.lineTo(59,y);g.stroke();}
  ge.fillStyle='#000';ge.fillRect(0,0,64,128);ge.fillStyle='#ffcf96';ge.fillRect(5,6,25,116);ge.fillRect(34,6,25,116);ge.strokeStyle='rgba(0,0,0,.5)';for(let y=14;y<120;y+=14){ge.beginPath();ge.moveTo(5,y);ge.lineTo(59,y);ge.stroke();}
  return {map:TX(c),emap:TX(ce)};})();
M.doorLit=emMat(doorTex.map,doorTex.emap,'windows');
M.doorWood=lam('#ffffff',{map:(()=>{const [c,g]=C2(64,128);g.fillStyle='#6a4a32';g.fillRect(0,0,64,128);for(let x=0;x<64;x+=6){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,0,2,128);}g.fillStyle='#c9b48a';g.fillRect(44,60,5,10);return TX(c);})()});

/* ================================================================
   Geometry helpers
   ================================================================ */
const GC={};
function bx(w,h,d){const k='b'+w.toFixed(3)+'_'+h.toFixed(3)+'_'+d.toFixed(3);return GC[k]||(GC[k]=new T.BoxGeometry(w,h,d));}
function cy(rt,rb,h,s=10){const k='c'+[rt,rb,h,s].join('_');return GC[k]||(GC[k]=new T.CylinderGeometry(rt,rb,h,s));}
function sph(r,a=10,b=8){const k='s'+[r,a,b].join('_');return GC[k]||(GC[k]=new T.SphereGeometry(r,a,b));}
function ico(r,d=0){const k='i'+r+'_'+d;return GC[k]||(GC[k]=new T.IcosahedronGeometry(r,d));}
function mk(geo,mat,x=0,y=0,z=0,parent=scene,cast=true){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function facadeBox(w,h,d){const g=new T.BoxGeometry(w,h,d);const uv=g.attributes.uv;for(let i=8;i<16;i++)uv.setXY(i,.02,.985);return g;}
function quad(a,b,c,d){return [...a,...b,...c,...a,...c,...d];}
const CROWN={a:crownGeo([[1,0,0,0],[.72,.62,-.18,.3],[.7,-.6,-.12,-.2],[.62,.12,.42,-.48],[.6,-.2,.5,.45]]),b:crownGeo([[1,0,0,0],[.75,-.66,-.2,.2],[.66,.6,.1,-.3],[.58,0,.58,.1]]),
  lo:crownGeo([[1,0,0,0],[.74,-.62,-.18,.22],[.68,.58,.06,-.28]],5,.8,3),   // trees near the paths: 3×20 triangles
  mid:crownGeo([[1,0,0,0],[.72,.62,-.18,.3],[.7,-.6,-.12,-.2],[.62,.12,.42,-.48],[.6,-.2,.5,.45]],8,.7,5)};   // town street trees: 5×64
// far hillside trees (v0.3 G04: distant forest with less detail): one 20-triangle blob, shaded smooth so it still reads as a round crown
CROWN.blob=(()=>{const g=new T.IcosahedronGeometry(1,0).toNonIndexed();const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){const l=Math.hypot(p.getX(i),p.getY(i)*1.2,p.getZ(i));n.setXYZ(i,p.getX(i)/l,p.getY(i)*1.2/l,p.getZ(i)/l);}g.scale(1.25,1,1.2);g.computeBoundingSphere();return g;})();
// split an instanced forest: instances where near(x,z) keep the detailed crown, the rest move to a cheap far mesh
function instSplit(I,farGeo,near){const n=I.count,F=new T.InstancedMesh(farGeo,I.material.clone(),Math.max(1,n));const m=new T.Matrix4(),c=new T.Color(1,1,1);let a=0,b=0;if(I.instanceColor)F.setColorAt(0,c);
  for(let i=0;i<n;i++){I.getMatrixAt(i,m);const e=m.elements;if(I.instanceColor)I.getColorAt(i,c);if(near(e[12],e[14])){I.setMatrixAt(a,m);if(I.instanceColor)I.setColorAt(a,c);a++;}else{F.setMatrixAt(b,m);if(I.instanceColor)F.setColorAt(b,c);b++;}}
  I.count=a;F.count=b;I.instanceMatrix.needsUpdate=F.instanceMatrix.needsUpdate=true;if(I.instanceColor)I.instanceColor.needsUpdate=true;if(F.instanceColor)F.instanceColor.needsUpdate=true;
  F.castShadow=I.castShadow;F.receiveShadow=I.receiveShadow;F.frustumCulled=I.frustumCulled;return F;}
function triGeo(arr,center,uvFn){
  const p=arr.slice(),c=center||new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3(),n=new T.Vector3(),m=new T.Vector3(),ce=new T.Vector3();
  for(let i=0;i<p.length;i+=9){a.set(p[i],p[i+1],p[i+2]);b.set(p[i+3],p[i+4],p[i+5]);d.set(p[i+6],p[i+7],p[i+8]);
    n.subVectors(b,a).cross(m.subVectors(d,a));ce.copy(a).add(b).add(d).multiplyScalar(1/3).sub(c);
    if(n.dot(ce)<0){for(let k=0;k<3;k++){const t=p[i+3+k];p[i+3+k]=p[i+6+k];p[i+6+k]=t;}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();
  const nr=g.attributes.normal,uv=[];
  for(let i=0;i<p.length/3;i++){const x=p[i*3],y=p[i*3+1],z=p[i*3+2],nx=Math.abs(nr.getX(i)),nz=Math.abs(nr.getZ(i));
    if(uvFn)uv.push(...uvFn(x,y,z));else if(nz>=nx)uv.push(x*.5,z*.5);else uv.push(z*.5,x*.5);}
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;}

/* colliders */
const COLS=[];
// spatial grid over COLS (8 m cells) so collision / camera rays only test nearby boxes — the village has thousands
let COLSV=0;COLS.push=function(...a){COLSV++;return Array.prototype.push.apply(this,a);};COLS.splice=function(...a){COLSV++;return Array.prototype.splice.apply(this,a);};
const CG={v:-1,m:new Map(),big:[],st:0};const CGS=8;
function cgBuild(){CG.m.clear();CG.big=[];for(const c of COLS){const i0=Math.floor(c.x0/CGS),i1=Math.floor(c.x1/CGS),j0=Math.floor(c.z0/CGS),j1=Math.floor(c.z1/CGS);
  if((i1-i0+1)*(j1-j0+1)>64){CG.big.push(c);continue;}for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=i*65536+j;let L=CG.m.get(k);if(!L){L=[];CG.m.set(k,L);}L.push(c);}}CG.v=COLSV;}
function cgQuery(x0,z0,x1,z1,out){if(CG.v!==COLSV)cgBuild();out.length=0;const st=++CG.st;for(const c of CG.big){c._q=st;out.push(c);}
  const i0=Math.floor(x0/CGS),i1=Math.floor(x1/CGS),j0=Math.floor(z0/CGS),j1=Math.floor(z1/CGS);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const L=CG.m.get(i*65536+j);if(!L)continue;for(const c of L){if(c._q===st)continue;c._q=st;out.push(c);}}return out;}
const _cq=[],_rq=[];
function addCol(x0,x1,z0,z1,y1=8,y0=-6){COLS.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),y0,y1});}
// oriented box collider (rotated houses): centre, yaw, half-width (local x) / half-depth (local z)
function addColO(cx,cz,ry,hw,hd,y1=8,y0=-6){const ux=Math.cos(ry),uz=-Math.sin(ry),vx=Math.sin(ry),vz=Math.cos(ry);const ex=Math.abs(ux)*hw+Math.abs(vx)*hd,ez=Math.abs(uz)*hw+Math.abs(vz)*hd;
  const c={x0:cx-ex,x1:cx+ex,z0:cz-ez,z1:cz+ez,y0,y1,o:{cx,cz,ux,uz,vx,vz,hw,hd}};COLS.push(c);return c;}
function colLocal(gr,lx0,lx1,lz0,lz1,y1){const c=Math.cos(gr.rotation.y),s=Math.sin(gr.rotation.y);let a=1e9,b=-1e9,e=1e9,f=-1e9;
  for(const [x,z] of [[lx0,lz0],[lx1,lz0],[lx0,lz1],[lx1,lz1]]){const wx=gr.position.x+x*c+z*s,wz=gr.position.z-x*s+z*c;a=Math.min(a,wx);b=Math.max(b,wx);e=Math.min(e,wz);f=Math.max(f,wz);}
  addCol(a,b,e,f,y1);}
function l2w(gr,x,y,z){gr.updateMatrixWorld(true);return new T.Vector3(x,y,z).applyMatrix4(gr.matrixWorld);}

/* glows & light pools */
const GLOWM=[];
const GLOWC={};
function glowMat(hex,kind,base){const k=hex+kind+base;if(GLOWC[k])return GLOWC[k];const m=new T.SpriteMaterial({map:glowTex,color:col(hex),blending:T.AdditiveBlending,depthWrite:false,transparent:true});GLOWM.push({m,kind,base});return GLOWC[k]=m;}
function addGlow(x,y,z,size,hex,kind='lamp',base=1,parent=scene){const s=new T.Sprite(glowMat(hex,kind,base));s.position.set(x,y,z);s.scale.set(size,size,1);parent.add(s);return s;}
const poolGeo=new T.PlaneGeometry(2,2);poolGeo.rotateX(-PI/2);
const POOLC={};
function poolMat(hex,kind,base){const k=hex+kind+base;if(POOLC[k])return POOLC[k];const m=new T.MeshBasicMaterial({map:poolTex,color:col(hex),blending:T.AdditiveBlending,depthWrite:false,transparent:true,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});GLOWM.push({m,kind,base});return POOLC[k]=m;}
function addPool(x,z,r,hex,kind='lamp',base=.55,y=null){const m=new T.Mesh(poolGeo,poolMat(hex,kind,base));m.scale.set(r,1,r);m.position.set(x,(y===null?groundH(x,z):y)+.07,z);m.castShadow=false;m.receiveShadow=false;scene.add(m);return m;}

/* ================================================================
   World layout & heights
   ================================================================ */
const SEA_Y=-1.6;
var ISL_IN=false,MZ_IN=false;const ISC={x:34,z:-160,r:15},ISL={};
function islandH(x,z){const d=Math.hypot(x-ISC.x,z-ISC.z),R=ISC.r,n=(fbm(x*.12,z*.12)-.5)*.5;let h;
  if(d<R-5)h=.7+1.4*Math.pow(1-d/(R-5),1.5)+n;else{const t=clamp((d-(R-5))/5,0,1);h=lerp(.7+n*(1-t),-2.1,t);if(d>R)h=Math.max(-4,-2.1-(d-R)*.35);}
  const dr=Math.hypot(x-ISC.x,z-(ISC.z-1));return lerp(h,1.6,1-smooth(4.6,6.2,dr));}
const beachH=z=>-0.6-(-44.3-z)*0.07;
function groundH(x,z){
  if(x>2300)return tribeH(x-2600,z);
  if(z>86&&typeof CY!=='undefined'&&inYard(x,z))return CY.y;
  if(z<-130&&Math.hypot(x-ISC.x,z-ISC.z)<ISC.r+4)return islandH(x,z);
  if(x>-53&&x<-47&&z>=47&&z<=53)return 4*((z-47)/6);
  if(x>=-66&&x<=-34&&z>53&&z<=86)return 4;
  if(z<-44.3){
    if(x>72.6&&x<77.4)return .5;
    if(x>-33&&x<-27&&z>-48)return lerp(0,beachH(-48),(-44.3-z)/3.7);
    return beachH(z);}
  if(x>=34&&x<=62&&z>=-35.6&&z<=-32.2)return .9;
  if(x>=29&&x<34&&z>=-35.6&&z<=-32.2)return .9*(x-29)/5;
  if(z>-32.4&&z<-27.6)return .3*smooth(-32.4,-31.8,z)*(1-smooth(-28.2,-27.6,z));
  return 0;}
function hillH(x,z){
  const ax=Math.abs(x),dx=Math.max(0,ax-116),dz=Math.max(0,z-86),d=Math.hypot(dx,dz);
  let h=d<=0?-2:-2+smooth(0,30,d)*16+d*.22+(fbm(x*.012,z*.012)-.5)*30*smooth(0,40,d)+(fbm(x*.045+3,z*.045)-.5)*6*smooth(0,15,d);
  if(z<-44){if(ax<124)h=-7;else{const t=clamp((-44-z)/30,0,1);h=lerp(h,-6,t*t);}}
  return h;}

await tick('正在蓋小鎮… 15%');
/* ================================================================
   Sky
   ================================================================ */
const NOISE_GLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p*=2.03;a*=.5;}return s;}`;
const skyU={uTop:{value:new T.Color()},uHor:{value:new T.Color()},uBot:{value:new T.Color()},uFog:{value:new T.Color()},uSunDir:{value:new T.Vector3()},
  uGlowCol:{value:new T.Color()},uCloudLit:{value:new T.Color()},uCloudDark:{value:new T.Color()},uDisk:{value:1},uGlow:{value:1},uClouds:{value:.8},uStars:{value:0},uTime:{value:0}};
const sky=new T.Mesh(new T.SphereGeometry(1400,48,24),new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uTop,uHor,uBot,uFog,uSunDir,uGlowCol,uCloudLit,uCloudDark;uniform float uDisk,uGlow,uClouds,uStars,uTime;varying vec3 vDir;${NOISE_GLSL}
  void main(){vec3 d=normalize(vDir);float h=d.y;
    vec3 c=mix(uHor,uTop,pow(clamp(h,0.,1.),.45));
    c=mix(c,uBot,smoothstep(0.,-.2,h));
    float sd=max(dot(d,uSunDir),0.);
    if(uStars>.01){vec3 sp=d*300.;vec3 id=floor(sp);vec3 f=fract(sp)-.5;float r=fract(sin(dot(id,vec3(12.9898,78.233,37.719)))*43758.5453);
      float s=step(.9968,r)*smoothstep(.42,.0,length(f));float tw=.55+.45*sin(uTime*(1.2+r*3.)+r*90.);
      c+=vec3(.9,.93,1.)*s*tw*uStars*smoothstep(.02,.3,h)*1.5;
      float band=exp(-pow(dot(d,normalize(vec3(.6,.3,-.75))),2.)*18.)*smoothstep(0.,.4,h);c+=vec3(.08,.09,.14)*band*uStars*fbm(d.xz*6.);}
    c+=uGlowCol*(pow(sd,5.)*.26+pow(sd,40.)*.5+pow(sd,300.)*1.1)*uGlow;
    c=mix(c,uGlowCol*2.4,smoothstep(.99935,.9997,sd)*uDisk);
    if(h>0.){vec2 uv=d.xz/(h+.22);uv*=vec2(.62,.62);uv+=vec2(uTime*.003,uTime*.0008);
      float n=fbm(uv*1.1+3.1)+.18*fbm(uv*4.3+9.);float cl=smoothstep(.6,.67,n)*uClouds*smoothstep(.02,.12,h)*(1.-smoothstep(.42,.8,h));
      float lit=pow(max(dot(normalize(vec3(d.x,0.,d.z)),normalize(vec3(uSunDir.x,0.,uSunDir.z))),0.),3.);
      vec3 cc=mix(uCloudDark,uCloudLit,.55+.45*smoothstep(.62,.85,n));cc=mix(cc,uCloudLit,.25*lit);
      cc+=uGlowCol*pow(sd,12.)*.5*uGlow*(1.-smoothstep(.6,.85,n));
      c=mix(c,cc,cl*.92);}
    c=mix(uFog,c,smoothstep(-.02,.075,h));
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`}));
sky.renderOrder=-10;sky.frustumCulled=false;sky.userData.dyn=true;scene.add(sky);

/* ================================================================
   Sea (waves, sun path, shore foam)
   ================================================================ */
const seaU={uTime:{value:0},uSunDir:{value:new T.Vector3()},uSunCol:{value:new T.Color()},uTop:{value:new T.Color()},uHor:{value:new T.Color()},
  uDeep:{value:new T.Color()},uShallow:{value:new T.Color()},uFog:{value:new T.Color()},uFogNear:{value:30},uFogFar:{value:900},uSunI:{value:1},uLight:{value:1},uNight:{value:0}};
const seaGeo=new T.PlaneGeometry(4200,2600,168,90);seaGeo.rotateX(-PI/2);
const sea=new T.Mesh(seaGeo,new T.ShaderMaterial({uniforms:seaU,fog:false,
  vertexShader:`uniform float uTime;varying vec3 vW;
  void main(){vec4 w=modelMatrix*vec4(position,1.);
    float a=.6+.4*smoothstep(-50.,-120.,w.z);
    w.y+=(sin(w.x*.05+uTime*.6)*.25+sin(w.z*.08-uTime*.9)*.2+sin((w.x+w.z)*.13+uTime*1.3)*.08)*a;
    vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime,uFogNear,uFogFar,uSunI,uLight,uNight;uniform vec3 uSunDir,uSunCol,uTop,uHor,uDeep,uShallow,uFog;varying vec3 vW;${NOISE_GLSL}
  void main(){
    vec3 toC=cameraPosition-vW;float dist=length(toC);vec3 V=toC/dist;float t=uTime;vec2 p=vW.xz;
    float fade=.35+.65/(1.+dist*.02);
    vec2 g=vec2(.0125*cos(p.x*.05+t*.6),.016*cos(p.y*.08-t*.9));g+=vec2(.0104*cos((p.x+p.y)*.13+t*1.3));
    vec2 d1=normalize(vec2(.3,1.)),d2=normalize(vec2(-.7,.5)),d3=normalize(vec2(.9,-.2)),d4=normalize(vec2(-.2,-1.));
    g+=d1*.032*cos(dot(p,d1)*.9+t*1.9)*fade;g+=d2*.05*cos(dot(p,d2)*1.7+t*2.6)*fade;
    g+=d3*.055*cos(dot(p,d3)*2.9+t*3.4)*fade*fade;g+=d4*.06*cos(dot(p,d4)*5.1+t*4.4)*fade*fade;
    vec3 N=normalize(vec3(-g.x,1.,-g.y));
    float fres=.02+.98*pow(1.-max(dot(N,V),0.),5.);
    vec3 R=reflect(-V,N);R.y=abs(R.y);
    vec3 skyc=mix(uHor,uTop,pow(clamp(R.y,0.,1.),.5));
    float shore=smoothstep(-95.,-58.,vW.z);
    vec3 water=mix(uDeep,uShallow,shore*.85)*uLight;
    vec3 c=mix(water,skyc,clamp(fres*.95,0.,1.));
    float sd=max(dot(R,uSunDir),0.);
    c+=uSunCol*(pow(sd,380.)*7.+pow(sd,36.)*.22)*uSunI;
    float depth=vW.y-(-.6-(-44.3-vW.z)*.07);
    if(vW.x<72.&&vW.x>-140.&&vW.z>-70.){
      float n=noise(vec2(vW.x*.35,vW.z*.9+t*.4));
      float band=.5+.5*sin(vW.z*2.6+t*1.1+n*3.);
      float foam=smoothstep(.45,.0,depth)*(.45+.55*band)*smoothstep(.25,.6,n+.2);
      c=mix(c,vec3(.95,.93,.88)*(.25+.75*uLight),clamp(foam,0.,1.)*.85);}
    float fg=clamp((dist-uFogNear)/(uFogFar-uFogNear),0.,1.);
    c=mix(c,uFog,fg);
    c+=uSunCol*pow(sd,900.)*2.5*uSunI*fg;
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`}));
sea.position.set(0,SEA_Y,-1250);sea.frustumCulled=false;sea.userData.dyn=true;scene.add(sea);

await tick('正在蓋小鎮… 25%');
/* ================================================================
   Beach, terrain, distant land
   ================================================================ */
(function beach(){
  const g=new T.PlaneGeometry(210,32,84,20);g.rotateX(-PI/2);g.translate(-30,0,-60.3);
  const p=g.attributes.position,cols=[];const dry=col('#d6c09b'),wet=col('#a08a6c'),deep=col('#6e6556'),tmp=new T.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const y=beachH(z)+(fbm(x*.2,z*.2)-.5)*.16;p.setY(i,y);
    tmp.copy(dry).lerp(wet,smooth(-53,-58,z)).lerp(deep,smooth(-60,-68,z));const n=.94+fbm(x*.5,z*.5)*.12;cols.push(tmp.r*n,tmp.g*n,tmp.b*n);}
  g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
  const m=mk(g,new T.MeshLambertMaterial({vertexColors:true}),0,0,0,scene,false);m.userData.nomerge=true;
})();
let FAR_RIDGE=null;   // the old striped far-ridge slope behind the town; hidden once the painted 遠山 panorama is in
(function terrain(){
  let g=new T.PlaneGeometry(1300,620,160,78);g.rotateX(-PI/2);g.translate(0,0,220);
  const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,hillH(p.getX(i),p.getZ(i)));
  g=g.toNonIndexed();g.computeVertexNormals();
  const pos=g.attributes.position,nor=g.attributes.normal,cols=new Float32Array(pos.count*3);
  const grass=col('#86a457'),forest=col('#4f7d4a'),dark=col('#365e50'),rock=col('#6e6457'),sand=col('#b3a07c'),c=new T.Color();
  for(let i=0;i<pos.count;i+=3){
    const x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,y=(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3,z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3,ny=nor.getY(i);
    const f=fbm(x*.02,z*.02);c.copy(grass).lerp(forest,smooth(2,14,y)*.8+f*.3).lerp(dark,smooth(.5,.8,f)*.6);
    if(ny<.62)c.lerp(rock,smooth(.62,.4,ny));if(z<-40&&y<3)c.lerp(sand,.6);
    const n=.92+rand()*.12;for(let k=0;k<3;k++){cols[(i+k)*3]=c.r*n;cols[(i+k)*3+1]=c.g*n;cols[(i+k)*3+2]=c.b*n;}}
  g.setAttribute('color',new T.BufferAttribute(cols,3));
  const m=mk(g,new T.MeshLambertMaterial({vertexColors:true}),0,0,0,scene,false);m.userData.nomerge=true;
  // far ridges
  let r=new T.PlaneGeometry(3400,900,70,18);r.rotateX(-PI/2);r.translate(0,0,980);
  const rp=r.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),z=rp.getZ(i);rp.setY(i,-10+smooth(560,800,z)*(90+fbm(x*.003,z*.004)*280));}
  r=r.toNonIndexed();r.computeVertexNormals();
  const rm=mk(r,lam('#34453c'),0,0,0,scene,false);rm.userData.nomerge=true;FAR_RIDGE=rm;
  // islands
  [[-330,-430,70,34,46],[190,-680,110,30,60],[-620,-900,160,55,90]].forEach(([x,z,sx,sy,sz])=>{
    let ig=new T.IcosahedronGeometry(1,3);const ip=ig.attributes.position;for(let i=0;i<ip.count;i++){const v=new T.Vector3().fromBufferAttribute(ip,i);const k=.8+fbm(v.x*2+x,v.z*2)*.5;ip.setXYZ(i,v.x*k,Math.max(v.y,-.1)*k,v.z*k);}
    ig.computeVertexNormals();const im=mk(ig,lam('#2d3830'),x,SEA_Y-2,z,scene,false);im.scale.set(sx,sy,sz);im.userData.nomerge=true;});
  // hill trees (cedar + broadleaf) instanced
  const cone=new T.ConeGeometry(1,1,6);cone.translate(0,.5,0);const ball=CROWN.blob.clone();ball.scale(.95,.85,.95);
  const A=[],B=[];
  for(let i=0;i<5200;i++){const x=rr(-620,620),z=rr(-80,520),h=hillH(x,z);if(h<.8)continue;if(Math.abs(x)<116&&z<90)continue;
    const dens=fbm(x*.01+5,z*.01);if(rand()>dens*1.5)continue;const far=1+Math.max(0,Math.hypot(x,z)-160)/260;
    (dens>.7?A:B).push([x,h-.4,z,rr(2.6,4.6)*far,rand()]);}
  const dm=new T.Object3D();
  const IA=new T.InstancedMesh(cone,new T.MeshLambertMaterial({color:0xffffff}),A.length);
  A.forEach((t,i)=>{dm.position.set(t[0],t[1],t[2]);dm.scale.set(t[3]*.45,t[3]*2.1,t[3]*.45);dm.rotation.set(0,t[4]*6,0);dm.updateMatrix();IA.setMatrixAt(i,dm.matrix);IA.setColorAt(i,col(pick(['#365e50','#3e6656','#31584b','#44695a'])));});
  const IB=new T.InstancedMesh(ball,new T.MeshLambertMaterial({color:0xffffff}),B.length);
  B.forEach((t,i)=>{dm.position.set(t[0],t[1]+t[3]*.6,t[2]);dm.scale.set(t[3],t[3]*.8,t[3]);dm.rotation.set(t[4],t[4]*5,0);dm.updateMatrix();IB.setMatrixAt(i,dm.matrix);IB.setColorAt(i,col(pick(['#5f8f4f','#6e9c56','#557f4a','#80a75c'])));});
  [IA,IB].forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;scene.add(m);});
})();

await tick('正在蓋小鎮… 40%');
/* ================================================================
   Town ground & streets
   ================================================================ */
(function(){const g=new T.PlaneGeometry(270,140);g.rotateX(-PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*34,uv.getY(i)*18);
  mk(g,M.ground,0,0,26,scene,false);})();
const STREETS=[
  {n:'main',ax:'z',x0:-4,x1:4,z0:-37,z1:88,t:'edge',y:.03},
  {n:'A',ax:'x',x0:-112,x1:112,z0:6,z1:13,t:'edge',y:.02},
  {n:'B',ax:'x',x0:-70,x1:70,z0:42,z1:47,t:'plain',y:.02},
  {n:'C',ax:'z',x0:-42,x1:-38,z0:-26,z1:42,t:'plain',y:.02},
  {n:'D',ax:'z',x0:43,x1:47,z0:-26,z1:42,t:'plain',y:.02},
  {n:'R',ax:'x',x0:-112,x1:112,z0:-26,z1:-23,t:'plain',y:.02},
  {n:'coast',ax:'x',x0:-135,x1:135,z0:-44,z1:-37,t:'center',y:.02}];
const RT={edge:lam('#ffffff',{map:asphaltTex('edge')}),plain:lam('#ffffff',{map:asphaltTex('plain')}),center:lam('#ffffff',{map:asphaltTex('center')})};
function roadPlane(x0,x1,z0,z1,ax,mat,y){const W=ax==='z'?x1-x0:z1-z0,L=ax==='z'?z1-z0:x1-x0;const g=new T.PlaneGeometry(W,L);g.rotateX(-PI/2);if(ax==='x')g.rotateY(PI/2);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*L/6);mk(g,mat,(x0+x1)/2,y,(z0+z1)/2,scene,false);}
(function(){
  const X=STREETS.filter(s=>s.ax==='x'),Z=STREETS.filter(s=>s.ax==='z'),inter=[];
  X.forEach(a=>Z.forEach(b=>{const x0=Math.max(a.x0,b.x0),x1=Math.min(a.x1,b.x1),z0=Math.max(a.z0,b.z0),z1=Math.min(a.z1,b.z1);if(x0<x1&&z0<z1)inter.push({x0,x1,z0,z1});}));
  STREETS.forEach(s=>{const lo=s.ax==='z'?s.z0:s.x0,hi=s.ax==='z'?s.z1:s.x1;
    const cuts=inter.filter(r=>s.ax==='z'?(r.x0>=s.x0-.01&&r.x1<=s.x1+.01):(r.z0>=s.z0-.01&&r.z1<=s.z1+.01)).map(r=>s.ax==='z'?[r.z0,r.z1]:[r.x0,r.x1]).sort((a,b)=>a[0]-b[0]);
    let c=lo;cuts.forEach(([a,b])=>{if(a>c+.1)seg(c,a);c=Math.max(c,b);});if(hi>c+.1)seg(c,hi);
    function seg(a,b){if(s.ax==='z')roadPlane(s.x0,s.x1,a,b,'z',RT[s.t],s.y);else roadPlane(a,b,s.z0,s.z1,'x',RT[s.t],s.y);}});
  inter.forEach(r=>roadPlane(r.x0,r.x1,r.z0,r.z1,'z',RT.plain,.035));
})();
// 止まれ markings
const tomareMat=(()=>{const [c,g]=C2(128,256);g.fillStyle='rgba(240,236,226,.9)';g.fillRect(4,6,120,10);g.font=`700 50px ${FG}`;g.textAlign='center';g.textBaseline='middle';
  g.save();g.translate(64,0);g.scale(1,1.6);['止','ま','れ'].forEach((ch,i)=>g.fillText(ch,0,(58+i*52)/1.6+10));g.restore();
  const t=new T.CanvasTexture(c);return new T.MeshLambertMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});})();
function tomare(x,z,dx,dz,w=2.6){const g=new T.PlaneGeometry(w,w*2);g.rotateX(-PI/2);const m=mk(g,tomareMat,x,.045,z,scene,false);m.rotation.y=Math.atan2(-dx,-dz);}
tomare(-40,3.4,0,1,2.4);tomare(-40,15.6,0,-1,2.4);tomare(45,3.4,0,1,2.4);tomare(45,15.6,0,-1,2.4);
tomare(-7,9.5,1,0,3);tomare(7,9.5,-1,0,3);tomare(-6.4,-24.5,1,0,2);tomare(6.4,-24.5,-1,0,2);tomare(-6.5,44.5,1,0,2.4);tomare(6.5,44.5,-1,0,2.4);
// manholes
const manMat=lam('#ffffff',{map:(()=>{const [c,g]=C2(64,64);g.fillStyle='#3d3b3a';g.beginPath();g.arc(32,32,31,0,7);g.fill();g.strokeStyle='#5b5752';g.lineWidth=2;for(let r=8;r<30;r+=6){g.beginPath();g.arc(32,32,r,0,7);g.stroke();}
  for(let a=0;a<6;a++){g.beginPath();g.moveTo(32,32);g.lineTo(32+Math.cos(a)*30,32+Math.sin(a)*30);g.stroke();}return new T.CanvasTexture(c);})(),transparent:true,polygonOffset:true,polygonOffsetFactor:-2});
[[0,-10],[0,24],[0,60],[-30,9.5],[30,9.5],[-60,-40.5],[40,-40.5]].forEach(([x,z])=>{const g=new T.CircleGeometry(.35,16);g.rotateX(-PI/2);mk(g,manMat,x,.045,z,scene,false);});

/* reserved rectangles */
const RES=[];
const resv=(x0,x1,z0,z1)=>RES.push({x0,x1,z0,z1});
const hit=r=>RES.some(q=>r.x0<q.x1&&r.x1>q.x0&&r.z0<q.z1&&r.z1>q.z0);
STREETS.forEach(s=>resv(s.x0-.3,s.x1+.3,s.z0-.3,s.z1+.3));

await tick('正在蓋小鎮… 50%');
/* ================================================================
   Rail line, crossing, station
   ================================================================ */
const TRACK_Z=-30;
const ballastM=lam('#ffffff',{map:plainTex('#7c7870',9000,.2)});
[[-330,-4],[4,330]].forEach(([a,b])=>mk(bx(b-a,.22,4.2),ballastM,(a+b)/2,.11,TRACK_Z,scene,false));
mk(bx(8,.3,4.2),lam('#45443f',{map:plainTex('#4a4944',2500,.12)}),0,.15,TRACK_Z,scene,false);
[-1,1].forEach(s=>{const r=mk(bx(660,.12,.08),M.rail,0,.37,TRACK_Z+s*.53,scene,true);});
(function(){const n=Math.floor(660/.72);const im=new T.InstancedMesh(bx(.24,.12,2.3),lam('#5a5048'),n);const d=new T.Object3D();let k=0;
  for(let i=0;i<n;i++){const x=-330+i*.72;if(Math.abs(x)<4.2)continue;d.position.set(x,.27,TRACK_Z);d.updateMatrix();im.setMatrixAt(k++,d.matrix);}im.count=k;im.receiveShadow=true;scene.add(im);})();
// fences along the line
const fenceM=lam('#5d6e67');
function fence(x0,x1,z,h=1.15){for(let x=x0;x<=x1;x+=2.5)mk(bx(.08,h,.08),fenceM,x,h/2,z,scene,true);
  mk(bx(x1-x0,.06,.06),fenceM,(x0+x1)/2,h,z,scene,true);mk(bx(x1-x0,.04,.04),fenceM,(x0+x1)/2,h*.5,z,scene,false);addCol(x0,x1,z-.15,z+.15,h);}
fence(-128,-5.2,-26.7);fence(5.2,128,-26.7);fence(-128,-5.2,-33.2);fence(5.2,28.8,-33.2);fence(62.4,128,-33.2);
addCol(-5.1,-4.6,-32.9,-27.0,1.2);addCol(4.6,5.1,-32.9,-27.0,1.2);
// catenary
const WIRES=[];
function wire(a,b,sag=.5,n=10){for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n;const p0=new T.Vector3().lerpVectors(a,b,t0),p1=new T.Vector3().lerpVectors(a,b,t1);p0.y-=sag*4*t0*(1-t0);p1.y-=sag*4*t1*(1-t1);WIRES.push(p0,p1);}}
const steel=lam('#65746e');
for(let x=-320;x<=320;x+=40){mk(bx(.26,6.6,.26),steel,x,3.3,-27.3);mk(bx(.14,.14,3.6),steel,x,6.3,-28.9);}
for(let x=-320;x<320;x+=40){wire(new T.Vector3(x,6.2,TRACK_Z),new T.Vector3(x+40,6.2,TRACK_Z),.35,8);wire(new T.Vector3(x,5.35,TRACK_Z),new T.Vector3(x+40,5.35,TRACK_Z),.02,4);
  for(let k=5;k<40;k+=7){const y=6.2-.35*4*(k/40)*(1-k/40);WIRES.push(new T.Vector3(x+k,y,TRACK_Z),new T.Vector3(x+k,5.35,TRACK_Z));}}
// tunnel portals
[-1,1].forEach(s=>{const x=s*129;const g=new T.Group();g.position.set(x,0,-33);g.rotation.y=s>0?-PI/2:PI/2;scene.add(g);
  mk(bx(22,11,2),M.concreteDark,0,5,0,g);mk(bx(5,6,2.2),M.black,3*s,3,.15,g);mk(bx(8,5.5,2.2),M.black,-7.5*s,2.75,.15,g);
  mk(bx(22.6,.8,2.4),M.concrete,0,10.6,0,g);});
// crossing
const XING={arms:[],lamps:[],arrows:[],glows:[]};
const stripeTex=(()=>{const [c,g]=C2(256,32);g.fillStyle='#e8c228';g.fillRect(0,0,256,32);g.fillStyle='#1d1c1c';for(let x=-32;x<256;x+=32){g.beginPath();g.moveTo(x,32);g.lineTo(x+16,32);g.lineTo(x+32,0);g.lineTo(x+16,0);g.fill();}return TX(c,true);})();
const stripeM=lam('#ffffff',{map:stripeTex});
function crossingPost(x,z,armDir){
  const g=new T.Group();g.position.set(x,0,z);g.userData.dyn=true;scene.add(g);
  const pole=new T.CylinderGeometry(.09,.09,4.2,10);const uv=pole.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*1.5),uv.setY(i,uv.getY(i)*12);
  const pm=lam('#ffffff',{map:stripeTex.clone()});pm.map.needsUpdate=true;pm.map.rotation=PI/2;mk(pole,pm,0,2.1,0,g);
  [1,-1].forEach(s=>{const b=mk(bx(1.5,.14,.05),lam('#e8c228'),0,3.75,.02,g);b.rotation.z=s*PI/4;const e=mk(bx(1.56,.2,.04),M.black,0,3.75,.0,g);e.rotation.z=s*PI/4;});
  mk(bx(1.2,.12,.12),M.black,0,3.05,0,g);
  [-1,1].forEach(s=>{
    const lm=new T.MeshLambertMaterial({color:col('#3a0d0a'),emissive:col('#ff3a22'),emissiveIntensity:0});
    const L=mk(new T.CylinderGeometry(.16,.16,.12,16),lm,s*.45,3.05,0,g);L.rotation.x=PI/2;
    mk(bx(.4,.08,.36),M.black,s*.45,3.23,0,g);
    const gl=addGlow(s*.45,3.05,.25,1.6,'#ff4a2a','xing',1,g);const gl2=addGlow(s*.45,3.05,-.25,1.6,'#ff4a2a','xing',1,g);
    XING.lamps.push({m:lm,side:s,g:[gl,gl2]});});
  // direction arrows
  [-1,1].forEach(s=>{const [c,gx]=C2(64,64);gx.fillStyle='#111';gx.fillRect(0,0,64,64);gx.fillStyle='#fff';gx.font=`700 50px ${FG}`;gx.textAlign='center';gx.textBaseline='middle';gx.fillText(s<0?'←':'→',32,34);
    const am=new T.MeshLambertMaterial({color:0x222222,emissive:col('#ffe9c0'),emissiveMap:new T.CanvasTexture(c),emissiveIntensity:0});
    mk(bx(.34,.28,.06),am,-s*.2*armDir,2.6,0,g);XING.arrows.push({m:am,dir:s,armDir});});
  mk(bx(.5,1,.4),lam('#d9d5cc'),0,.5,-armDir*.6,g);
  const piv=new T.Group();piv.position.set(armDir*.1,1.05,-armDir*.6);g.add(piv);
  const arm=new T.BoxGeometry(8.6,.11,.11);const au=arm.attributes.uv;for(let i=0;i<au.count;i++)au.setX(i,au.getX(i)*8);
  const a=mk(arm,stripeM,armDir*4.3,0,0,piv);mk(bx(.3,.3,.3),M.black,-armDir*.2,0,0,piv);
  XING.arms.push({piv,dir:armDir});
  addCol(x-.25,x+.25,z-.25,z+.25,4);
}
crossingPost(-5,-26.3,1);crossingPost(5,-33.7,-1);
{const [c,g]=C2(64,64);g.fillStyle='#f0c771';g.fillRect(0,0,64,64);g.fillStyle='#d9a94a';for(let y=6;y<64;y+=13)for(let x=6;x<64;x+=13){g.beginPath();g.arc(x,y,3.4,0,7);g.fill();}g.fillStyle='rgba(78,59,43,.35)';g.fillRect(0,0,64,2);g.fillRect(0,0,2,64);
  const t=TX(c,true);t.repeat.set(3,1.5);const tm=lam('#ffffff',{map:t});[[-3.2,-25.75],[3.2,-25.75],[-3.2,-34.25],[3.2,-34.25]].forEach(([x,z])=>mk(bx(1.5,.03,.75),tm,x,.03,z,scene,false));}
// station
(function station(){
  mk(bx(28,.9,3.4),M.concrete,48,.45,-33.9);
  const top=new T.PlaneGeometry(28,3.4);top.rotateX(-PI/2);
  const tt=(()=>{const [c,g]=C2(512,64);g.fillStyle='#b6b0a4';g.fillRect(0,0,512,64);speckle(g,512,64,1800,.1);g.fillStyle='#e4b928';g.fillRect(0,50,512,6);g.fillStyle='#eeeae0';g.fillRect(0,60,512,4);return TX(c);})();
  mk(top,lam('#ffffff',{map:tt}),48,.905,-33.9,scene,false);
  mk(triGeo(quad([29,.02,-35.6],[34,.9,-35.6],[34,.9,-32.2],[29,.02,-32.2]),new T.Vector3(31,-3,-34)),M.concrete,0,0,0,scene,false);
  addCol(29,62.3,-32.25,-32.0,1.2);addCol(62,62.4,-35.7,-32.1,2);
  // platform railing (art pack v0.2: dark green posts + two rails)
  {const RG=lam('#3d5650');for(let x=34;x<=62.01;x+=2)mk(bx(.08,1.05,.08),RG,x,.9+.52,-35.75);[.55,1.0].forEach(h=>mk(bx(28,.06,.06),RG,48,.9+h,-35.75));addCol(34,62,-35.9,-35.6,2);}
  // shelter: four dark-green posts, slate roof with a wooden slat ceiling, beams and corner braces, a lamp hanging in the middle
  {const PG=lam('#3d5650'),RF=lam('#4b5a5e'),SL=lam('#b98a5a'),x0=41.6,x1=50.4,z0=-35.15,z1=-33.25;
   [[x0,z0],[x1,z0],[x0,z1],[x1,z1]].forEach(([x,z])=>{mk(bx(.16,2.75,.16),PG,x,.9+1.37,z);addCol(x-.12,x+.12,z-.12,z+.12,4);});
   [z0,z1].forEach(z=>mk(bx(x1-x0+.4,.18,.14),PG,(x0+x1)/2,.9+2.78,z));[x0,x1].forEach(x=>mk(bx(.14,.18,z1-z0+.2),PG,x,.9+2.78,(z0+z1)/2));
   [x0,x1].forEach((x,i)=>[z0,z1].forEach(z=>{const br=mk(bx(.08,.9,.08),PG,x+(i?-.32:.32),.9+2.42,z,scene,false);br.rotation.z=i?.75:-.75;}));
   const r=mk(bx(x1-x0+1.4,.16,3.1),RF,(x0+x1)/2,.9+3.0,-34.2);r.rotation.x=-.07;
   for(let k=0;k<9;k++){const sl=mk(bx(.16,.05,2.6),SL,x0+.2+k*(x1-x0-.4)/8,.9+2.9,-34.2,scene,false);sl.rotation.x=-.07;}
   mk(cy(.02,.02,.35,6),M.metalDark,(x0+x1)/2,.9+2.72,-34.2,scene,false);mk(cy(.16,.22,.16,10),M.lampHead,(x0+x1)/2,.9+2.5,-34.2,scene,false);addGlow((x0+x1)/2,.9+2.42,-34.2,1.6,'#fff1d2');}
  // bench: four long planks on two open dark-green frames, no back (art pack 14_station_props B)
  const bench=new T.Group();bench.position.set(46,.9,-35.05);scene.add(bench);
  {const BW=lam('#c08850'),BF=lam('#3d5650');[-.15,-.05,.05,.15].forEach(z=>mk(bx(3,.05,.09),BW,0,.46,z,bench));
   [-1.25,1.25].forEach(x=>{[-.17,.17].forEach(z=>mk(bx(.05,.44,.05),BF,x,.22,z,bench));mk(bx(.06,.05,.42),BF,x,.42,0,bench);mk(bx(.08,.04,.46),BF,x,.02,0,bench);});}
  addCol(44.5,47.5,-35.35,-34.8,1);
  // name board
  const nb=(()=>{const [c,g]=C2(512,224);g.fillStyle='#f6f4ee';g.fillRect(0,0,512,224);g.fillStyle='#2f6b56';g.fillRect(0,150,512,74);g.fillStyle='#1c1c1c';g.font=`800 92px ${FM}`;g.textAlign='center';g.textBaseline='middle';g.fillText('しおみ',256,64);
    g.font=`500 22px ${FG}`;g.fillText('汐 見   Shiomi',256,128);g.fillStyle='#f6f4ee';g.font=`700 24px ${FG}`;g.textAlign='left';g.fillText('← みさき  Misaki',18,188);g.textAlign='right';g.fillText('はまかぜ  Hamakaze →',494,188);return TX(c);})();
  const sb=new T.Group();sb.position.set(37.5,.9,-35);scene.add(sb);
  [-1.2,1.2].forEach(x=>mk(cy(.05,.05,2.4,8),M.metal,x,1.2,0,sb));
  const pm=emMat(nb,nb,'signs');mk(new T.PlaneGeometry(2.6,1.14),pm,0,1.95,.04,sb);const back=mk(new T.PlaneGeometry(2.6,1.14),pm,0,1.95,-.04,sb);back.rotation.y=PI;
  addCol(36.1,38.9,-35.2,-34.8,3);
  // IC reader
  mk(bx(.3,1.1,.3),lam('#3f7d5a'),33.4,.55+.9,-35.2);
  // platform lamps
  [36,48,60].forEach(x=>{mk(cy(.06,.06,3.2,8),M.metal,x,.9+1.6,-35.55);mk(bx(.6,.1,.25),M.lampHead,x,.9+3.2,-35.45);addGlow(x,.9+3.1,-35.4,2.2,'#fff1d2');addPool(x,-34.6,3.2,'#ffe8c0','lamp',.45,.9);});
  // bikes parked
  for(let i=0;i<5;i++)bike(22+i*.85,-35.4,PI/2+rr(-.12,.12));
  {const RK=lam('#b96854');for(let i=0;i<5;i++){const x=22+i*.85+.22;[-.32,.32].forEach(dz=>mk(bx(.05,.7,.05),RK,x,.35,-35.4+dz,scene,false));mk(bx(.05,.05,.69),RK,x,.7,-35.4,scene,false);}mk(bx(4.3,.05,.05),RK,23.9,.06,-35.08,scene,false);}
})();

/* ================================================================
   Props
   ================================================================ */
function bike(x,z,ry,colr){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);
  const fm=lam(colr||pick(['#b8b4ac','#a33a2e','#3f5f86','#d8d2c2','#4d6b4f']));
  const wg=GC.wheel||(GC.wheel=new T.TorusGeometry(.32,.03,6,18));
  [-.52,.52].forEach(px=>mk(wg,M.black,px,.34,0,g,true));
  const f1=mk(bx(1.0,.04,.04),fm,0,.55,0,g);f1.rotation.z=-.15;const f2=mk(bx(.05,.5,.04),fm,-.18,.62,0,g);f2.rotation.z=.2;
  mk(bx(.22,.05,.12),M.black,-.25,.92,0,g);mk(bx(.04,.04,.55),M.metal,.45,.98,0,g);mk(bx(.05,.5,.04),fm,.45,.72,0,g);
  mk(bx(.32,.22,.36),M.metal,.66,.88,0,g,false);
  return g;}
function potPlant(g,x,z,s=1){mk(cy(.18*s,.14*s,.3*s,8),rand()<.6?M.pot:M.pot2,x,.15*s,z,g);const f=mk(ico(.26*s,0),rand()<.5?M.leaf:M.leaf2,x,.45*s,z,g);f.scale.y=rr(.8,1.4);}
function acUnit(g,x,y,z,ry){const u=new T.Group();u.position.set(x,y,z);u.rotation.y=ry;g.add(u);mk(bx(.82,.58,.3),lam('#dcdad2'),0,0,0,u);mk(new T.CircleGeometry(.2,14),M.metalDark,.14,0,.152,u);}
// art pack v0.2 p14 E: tree crowns are a few soft clustered masses, shaded as one volume (normals bent outward from the crown centre)
function crownGeo(parts,seg=9,bend=.65,hs=0){const P=[],N=[];let cx=0,cy=0,cz=0,ws=0;parts.forEach(([r,x,y,z])=>{cx+=x*r;cy+=y*r;cz+=z*r;ws+=r;});cx/=ws;cy/=ws;cz/=ws;
  const v=new T.Vector3(),n=new T.Vector3(),o=new T.Vector3();
  parts.forEach(([r,x,y,z])=>{const g=new T.SphereGeometry(r,seg,hs||Math.max(4,seg-3)).toNonIndexed();const p=g.attributes.position,nn=g.attributes.normal;
    for(let i=0;i<p.count;i++){v.set(p.getX(i)+x,p.getY(i)+y,p.getZ(i)+z);n.set(nn.getX(i),nn.getY(i),nn.getZ(i));o.set(v.x-cx,(v.y-cy)*1.15,v.z-cz).normalize();n.lerp(o,bend).normalize();P.push(v.x,v.y,v.z);N.push(n.x,n.y,n.z);}g.dispose();});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));
  const uv=new Float32Array(P.length/3*2);g.setAttribute('uv',new T.BufferAttribute(uv,2));g.computeBoundingSphere();g.computeBoundingBox();return g;}
function tree(x,z,s=1,y=0){const g=new T.Group();g.position.set(x,y,z);scene.add(g);mk(cy(.12*s,.18*s,2.4*s,6),M.trunk,0,1.2*s,0,g);
  mk(CROWN.mid,M.leaf,0,3.05*s,0,g).scale.setScalar(1.35*s);
  for(let i=0;i<4;i++){const r=rr(.9,1.4)*s,m=pick([M.leaf,M.leaf2]),px=rr(-.7,.7)*s,py=rr(2.4,3.3)*s,pz=rr(-.7,.7)*s;const f=mk(CROWN.lo,m,px*.9,py+.15*s,pz*.9,g);f.scale.setScalar(r*.62);f.rotation.set(0,rand()*6,0);rand();rand();}
  addCol(x-.25,x+.25,z-.25,z+.25,3);return g;}
function pineTree(x,z,s=1,lean=1){const g=new T.Group();const y=groundH(x,z);g.position.set(x,y,z);g.rotation.y=rr(-.3,.3);scene.add(g);
  let px=0,py=0,pz=0;for(let i=0;i<4;i++){const len=1.7*s;const seg=mk(cy(.13*s*(1-i*.15),.18*s*(1-i*.15),len,6),M.trunk,0,0,0,g);const ang=.18*lean*(i+1)*.5;seg.rotation.x=ang;seg.position.set(px,py+len/2*Math.cos(ang),pz+len/2*Math.sin(ang));py+=len*Math.cos(ang);pz+=len*Math.sin(ang);}
  for(let i=0;i<6;i++){const f=mk(sph(1,8,5),M.pine,rr(-1.6,1.6)*s,py-rr(0,2.2)*s,pz+rr(-1.2,1.4)*s,g);f.scale.set(rr(1,1.8)*s,rr(.32,.5)*s,rr(.9,1.5)*s);}
  addCol(x-.3,x+.3,z-.3,z+.3,4);}
function curveMirror(x,z,ry){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);mk(cy(.05,.05,3,8),lam('#e3782a'),0,1.5,0,g);
  const m=mk(new T.CircleGeometry(.42,20),new T.MeshPhongMaterial({color:col('#9fb2c2'),specular:0xffffff,shininess:90,emissive:col('#1c2733')}),0,3.1,.07,g);
  mk(new T.TorusGeometry(.43,.04,6,20),lam('#e3782a'),0,3.1,.07,g);addCol(x-.1,x+.1,z-.1,z+.1,3);}
function stopSign(x,z,ry){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);mk(cy(.04,.04,2.6,6),M.white,0,1.3,0,g);
  const [c,gx]=C2(128,128);gx.fillStyle='#fff';gx.beginPath();gx.moveTo(4,10);gx.lineTo(124,10);gx.lineTo(64,120);gx.fill();gx.fillStyle='#c8322b';gx.beginPath();gx.moveTo(14,16);gx.lineTo(114,16);gx.lineTo(64,108);gx.fill();
  gx.fillStyle='#fff';gx.font=`700 26px ${FG}`;gx.textAlign='center';gx.fillText('止まれ',64,48);
  const m=mk(new T.PlaneGeometry(.8,.8),lam('#ffffff',{map:TX(c),transparent:true,alphaTest:.5,side:T.DoubleSide}),0,2.5,.05,g,false);}

/* ================================================================
   Houses & shops
   ================================================================ */
const FACE={pz:0,px:PI/2,nz:PI,nx:-PI/2};
const laundryCols=['#f1efe8','#9fc3d9','#e7a8a2','#f0d98a','#bcd3a8','#6d7da8'];
function roofOn(g,w,d,H,type,rm,wm){
  const oh=.55;
  if(type==='flat'){[[w,.5,.14,0,d/2],[w,.5,.14,0,-d/2],[.14,.5,d,w/2,0],[.14,.5,d,-w/2,0]].forEach(([a,b,c,x,z])=>mk(bx(a,b,c),wm,x,H+.25,z,g));
    mk(bx(w-.1,.06,d-.1),M.roofFlat,0,H+.03,0,g,false);
    if(rand()<.5){mk(cy(.5,.5,1.1,10),lam('#c9c4b8'),rr(-w/4,w/4),H+.85,rr(-d/4,d/4),g);}
    else if(rand()<.6)acUnit(g,rr(-w/3,w/3),H+.33,rr(-d/4,d/4),0);return;}
  if(type==='gableZ'){const sub=new T.Group();sub.rotation.y=PI/2;g.add(sub);gableRoof(sub,d,w,H,rm,wm,oh);return;}
  if(type==='hip'){hipRoof(g,w,d,H,rm,oh);return;}
  gableRoof(g,w,d,H,rm,wm,oh);}
function gableRoof(g,w,d,H,rm,wm,oh){const e=d/2+oh,rh=e*rr(.4,.54),yw=rh*oh/e,base=H-yw,x0=-w/2-oh*.8,x1=w/2+oh*.8;
  mk(triGeo([...quad([x0,0,e],[x1,0,e],[x1,rh,0],[x0,rh,0]),...quad([x1,0,-e],[x0,0,-e],[x0,rh,0],[x1,rh,0])],new T.Vector3(0,-2,0)),rm,0,base,0,g);
  mk(triGeo([-w/2,yw,-d/2,-w/2,yw,d/2,-w/2,rh,0,w/2,yw,d/2,w/2,yw,-d/2,w/2,rh,0],new T.Vector3(0,yw,0),()=>[.02,.985]),wm,0,base,0,g);
  mk(bx(x1-x0,.16,.3),M.ridge,0,base+rh+.02,0,g);
  const FA=M.fascia||(M.fascia=lam('#5b4636')),sl=Math.hypot(e,rh),a=Math.atan2(rh,e);[-1,1].forEach(s=>{mk(bx(x1-x0+.1,.26,.12),FA,0,base-.07,s*e,g,false);[x0,x1].forEach(x=>{const b=mk(bx(.12,.24,sl),FA,x,base+rh/2-.02,s*e/2,g,false);b.rotation.x=s*a;});});}
function hipRoof(g,w,d,H,rm,oh){const W=w/2+oh*.8,E=d/2+oh,rh=Math.min(W,E)*rr(.5,.64),r=Math.max(0,W-E),base=H-rh*oh/E;
  mk(triGeo([...quad([-W,0,E],[W,0,E],[r,rh,0],[-r,rh,0]),...quad([W,0,-E],[-W,0,-E],[-r,rh,0],[r,rh,0]),-W,0,-E,-W,0,E,-r,rh,0,W,0,E,W,0,-E,r,rh,0],new T.Vector3(0,-2,0)),rm,0,base,0,g);
  if(r>.1)mk(bx(2*r+.2,.16,.28),M.ridge,0,base+rh+.02,0,g);
  const FA=M.fascia||(M.fascia=lam('#5b4636'));[-1,1].forEach(s=>{mk(bx(2*W+.12,.26,.12),FA,0,base-.07,s*E,g,false);mk(bx(.12,.26,2*E+.12),FA,s*W,base-.07,0,g,false);});}
function laundry(g,x,y,z,len){mk(cy(.02,.02,len,5),M.metal,x,y,z,g).rotation.z=PI/2;const n=Math.floor(len/.45);
  for(let i=0;i<n;i++){if(rand()<.3)continue;const c=mk(bx(rr(.28,.4),rr(.35,.6),.02),lam(pick(laundryCols)),x-len/2+.25+i*.45,y-.3,z,g,true);c.rotation.y=rr(-.15,.15);}}
const HOUSES=[];
function makeHouse(cx,cz,w,d,face,setback){
  const g=new T.Group();g.position.set(cx,0,cz);g.rotation.y=FACE[face];scene.add(g);
  const floors=rand()<.7?2:1,H=floors*2.9+.35,pi=Math.floor(rand()*PALS.length),fm=FAC[floors][pi];
  mk(facadeBox(w,H,d),fm,0,H/2,0,g);mk(bx(w+.12,.4,d+.12),M.concrete,0,.2,0,g);
  const rt=pick(['gable','gable','gableZ','hip','hip','flat']);roofOn(g,w,d,H,rt,pick(ROOFM),fm);
  const dx=clamp(rr(-w/2+1.2,w/2-1.2),-w/2+1.1,w/2-1.1);
  mk(bx(1.7,2.15,.1),rand()<.72?M.doorLit:M.doorWood,dx,.4+1.07,d/2+.03,g);
  const hs=mk(bx(2.4,.07,1),pick(ROOFM),dx,2.78,d/2+.45,g);hs.rotation.x=.16;
  if(rand()<.6){mk(bx(.16,.16,.1),M.lampHead,dx+1.1,2.35,d/2+.07,g,false);addGlow(dx+1.1,2.35,d/2+.25,1.3,'#ffd79a','lamp',.9,g);}
  if(rand()<.65)acUnit(g,(rand()<.5?-1:1)*(w/2+.18),.62,rr(-d/3,d/3),rand()<.5?PI/2:-PI/2);
  if(floors===2&&rand()<.45){const bw=w*rr(.45,.65),bxp=rr(-w/2+bw/2,w/2-bw/2);mk(bx(bw,.1,1),M.concrete,bxp,3.05,d/2+.5,g);
    mk(bx(bw,.85,.05),lam('#9da3a6'),bxp,3.5,d/2+.98,g);if(rand()<.6)laundry(g,bxp,4.9,d/2+.55,bw-.3);}
  else if(rand()<.2)laundry(g,rr(-w/4,w/4),2.2,d/2+.8,2.2);
  const fz=d/2+setback;
  for(let i=0,n=Math.floor(rr(0,4));i<n;i++)potPlant(g,dx+rr(-1.6,1.6),rr(d/2+.35,Math.max(d/2+.4,fz-.4)),rr(.8,1.3));
  if(setback>1.35&&rand()<.45){const wz=fz-.18;const L=w/2,gap0=dx-.8,gap1=dx+.8;
    if(gap0>-L+.2){mk(bx(gap0+L,1.2,.15),M.block,(gap0-L)/2,.6,wz,g);colLocal(g,-L,gap0,wz-.1,wz+.1,1.3);}
    if(L>gap1+.2){mk(bx(L-gap1,1.2,.15),M.block,(gap1+L)/2,.6,wz,g);colLocal(g,gap1,L,wz-.1,wz+.1,1.3);}}
  else if(rand()<.25){const b=bike(0,0,0);scene.remove(b);g.add(b);b.position.set(dx+(rand()<.5?-1.6:1.6),0,d/2+.6);b.rotation.y=rr(-.3,.3);}
  colLocal(g,-w/2,w/2,-d/2,d/2,H+2);HOUSES.push({g,dx,d,w});
  return g;}

const SHOP_INFO={};
function shopFront(kind){
  const [c,g]=C2(256,128),[ce,ge]=C2(256,128);ge.fillStyle='#000';ge.fillRect(0,0,256,128);
  const K={
    kissa(){g.fillStyle='#3d2a1e';g.fillRect(0,0,256,128);g.fillStyle='#e9b77a';g.fillRect(14,16,150,86);g.fillStyle='#6b4a32';for(let x=14;x<164;x+=30)g.fillRect(x,16,3,86);
      g.fillStyle='rgba(60,30,20,.7)';[[40,70],[100,72]].forEach(([x,y])=>{g.fillRect(x,y,24,18);g.fillRect(x+5,y-14,14,14);});
      g.fillStyle='#caa77a';g.fillRect(180,20,60,108);g.fillStyle='#2a1c14';g.fillRect(186,26,48,96);
      ge.fillStyle='#ffc47a';ge.fillRect(14,16,150,86);ge.fillStyle='#3a2414';for(let x=14;x<164;x+=30)ge.fillRect(x,16,3,86);ge.fillStyle='#ffb060';ge.fillRect(186,26,48,96);},
    dagashi(){g.fillStyle='#fbeed2';g.fillRect(0,0,256,128);for(let r=0;r<4;r++)for(let i=0;i<14;i++){g.fillStyle=pick(['#e35d4a','#f2c14e','#5aa0d8','#7cc47a','#f08fb0','#ffffff']);g.fillRect(8+i*17,20+r*24,13,14);}
      g.fillStyle='#8b6a4a';for(let r=0;r<4;r++)g.fillRect(0,36+r*24,256,4);ge.drawImage(c,0,0);ge.fillStyle='rgba(0,0,0,.25)';ge.fillRect(0,0,256,128);},
    shokudo(){g.fillStyle='#4a3424';g.fillRect(0,0,256,128);for(let i=0;i<4;i++){g.fillStyle='#efe0c0';g.fillRect(10+i*62,10,54,112);g.strokeStyle='#5a4028';g.lineWidth=2;for(let x=10+i*62;x<64+i*62;x+=9){g.beginPath();g.moveTo(x,10);g.lineTo(x,122);g.stroke();}}
      for(let i=0;i<4;i++){ge.fillStyle='#ffc98a';ge.fillRect(10+i*62,10,54,112);ge.strokeStyle='#402a18';ge.lineWidth=2;for(let x=10+i*62;x<64+i*62;x+=9){ge.beginPath();ge.moveTo(x,10);ge.lineTo(x,122);ge.stroke();}}},
    tokoya(){g.fillStyle='#e7e4dc';g.fillRect(0,0,256,128);g.fillStyle='#2b3a44';g.fillRect(12,14,150,90);g.fillStyle='rgba(200,60,50,.8)';g.fillRect(60,60,40,26);g.fillRect(70,40,20,22);g.fillStyle='#2b3a44';g.fillRect(180,14,60,114);
      ge.fillStyle='#e8f0ff';ge.fillRect(12,14,150,90);ge.fillStyle='rgba(150,40,30,1)';ge.fillRect(60,60,40,26);},
    hon(){g.fillStyle='#e8dcc4';g.fillRect(0,0,256,128);for(let r=0;r<3;r++)for(let x=8;x<248;x+=rr(5,9)){g.fillStyle=pick(['#8a3a2e','#2f4a6a','#c9a45a','#3e5e3e','#ddd4c0','#5a4a6a']);g.fillRect(x,14+r*36,rr(4,8),30);}
      ge.drawImage(c,0,0);ge.fillStyle='rgba(0,0,0,.3)';ge.fillRect(0,0,256,128);},
    sakaya(){g.fillStyle='#3b2d22';g.fillRect(0,0,256,128);for(let r=0;r<3;r++)for(let x=10;x<246;x+=12){g.fillStyle=pick(['#2f5a2e','#6b4020','#d8d0b8','#1f3a28']);g.fillRect(x,18+r*36,8,28);g.fillRect(x+2,12+r*36,4,8);}
      ge.drawImage(c,0,0);ge.fillStyle='rgba(255,190,110,.35)';ge.fillRect(0,0,256,128);},
    sakanaya(){g.fillStyle='#9ea3a6';g.fillRect(0,0,256,128);for(let y=0;y<128;y+=5){g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,y,256,2);}speckle(g,256,128,600,.1);
      g.fillStyle='#f4f1e8';g.fillRect(96,48,64,36);g.fillStyle='#333';g.font=`500 10px ${FG}`;g.textAlign='center';g.fillText('本日休業',128,62);g.fillText('明朝7時〜',128,76);},
    sento(){g.fillStyle='#5a4432';g.fillRect(0,0,256,128);g.fillStyle='#f0e2c4';g.fillRect(80,20,96,108);g.fillStyle='#3a2a1e';g.fillRect(126,20,4,108);
      ge.fillStyle='#ffd7a0';ge.fillRect(80,20,96,108);}};
  K[kind]();return {map:TX(c),emap:TX(ce)};}
function signTex(text,bg,fg,w=512,h=96,font=FM){const [c,g]=C2(w,h);g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font=`800 ${h*.56}px ${font}`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h*.54);
  g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=4;g.strokeRect(2,2,w-4,h-4);return TX(c);}
function vsignTex(text,bg,fg){const [c,g]=C2(96,320);g.fillStyle=bg;g.fillRect(0,0,96,320);g.strokeStyle=fg;g.lineWidth=3;g.strokeRect(6,6,84,308);const n=[...text].length;const s=Math.min(70,260/n);vtext(g,text,48,160-(n-1)*s*1.08/2,s,FM,fg);return TX(c);}
function norenTex(text,colr){const [c,g]=C2(256,128);g.fillStyle=colr;g.fillRect(0,0,256,128);g.fillStyle='#f4ecdc';g.font=`800 64px ${FM}`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,70);
  g.clearRect(84,24,4,104);g.clearRect(168,24,4,104);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,0,256,10);const t=TX(c);return t;}
const barberPoles=[];
function makeShop(cx,cz,w,d,face,kind,setback=1){
  const info={kissa:{name:'喫茶 しおさい',sign:['#3a2a20','#f2dfb8'],v:'珈琲',awn:null},dagashi:{name:'駄菓子 まるや',sign:['#f4ecdc','#b3362a'],awn:['#c8432b','#f4ecdc']},
    shokudo:{name:'うみねこ食堂',sign:['#f2e6cc','#243a5e'],noren:['めし','#243a5e'],lantern:true},tokoya:{name:'理容 なみ',sign:['#f4f4f0','#233a6a'],pole:true},
    hon:{name:'汐見書店',sign:['#2f4a38','#efe6d0'],awn:['#3c5a3c','#efe6d0']},sakaya:{name:'酒 やまもと',sign:['#2a1d14','#e6c68a'],v:'地酒',noren:['酒','#6b3a1f']},
    sakanaya:{name:'鮮魚 たけうち',sign:['#f4f1e8','#1f4f7a'],awn:['#2f5f8a','#f4ecdc']},sento:{name:'松の湯',sign:['#2a2320','#f4e6c8'],noren:['ゆ','#2a4a7a'],chimney:true,v:'ゆ'}}[kind];
  const g=new T.Group();g.position.set(cx,0,cz);g.rotation.y=FACE[face];scene.add(g);
  const pi=[0,4,6,1][Math.floor(rand()*4)],H=2*2.9+.35,fm=FAC[2][pi];
  mk(facadeBox(w,H,d),fm,0,H/2,0,g);mk(bx(w+.12,.4,d+.12),M.concrete,0,.2,0,g);
  roofOn(g,w,d,H,pick(['gable','hip','flat']),pick(ROOFM),fm);
  const sf=shopFront(kind);const sfm=emMat(sf.map,sf.emap,kind==='sakanaya'?'windows':'signs');
  mk(new T.PlaneGeometry(w-.4,2.5),sfm,0,1.65,d/2+.02,g,false);
  const sm=emMat(signTex(info.name,info.sign[0],info.sign[1]),null,'signs');mk(bx(w-.1,.82,.28),lam(info.sign[0]),0,3.08,d/2+.14,g);mk(bx(w,.08,.32),M.fascia||(M.fascia=lam('#5b4636')),0,3.53,d/2+.14,g,false);mk(new T.PlaneGeometry(w-.3,.66),sm,0,3.08,d/2+.29,g,false);
  if(kind==='kissa'||kind==='shokudo'||kind==='sento')addGlow(0,3.08,d/2+.8,3.5,'#ffd8a0','lamp',.35,g);
  if(info.awn){const [c,gx]=C2(128,64);for(let x=0;x<128;x+=16){gx.fillStyle=info.awn[(x/16)%2];gx.fillRect(x,0,16,64);}const am=lam('#ffffff',{map:TX(c)});const a=mk(bx(w-.3,1.3,.06),am,0,2.55,d/2+.6,g);a.rotation.x=-PI/2+.5;mk(bx(w-.3,.26,.05),am,0,2.13,d/2+1.18,g,false);[-1,1].forEach(sx=>{const br=mk(bx(.05,.05,1.2),M.metalDark,sx*(w/2-.3),2.45,d/2+.62,g,false);br.rotation.x=.5;});}
  if(info.noren){const n=mk(new T.PlaneGeometry(1.8,.9),lam('#ffffff',{map:norenTex(info.noren[0],info.noren[1]),side:T.DoubleSide,transparent:true,alphaTest:.5}),w*.18,2.2,d/2+.12,g);}
  if(info.v){const vt=vsignTex(info.v,'#f4ecdc','#2a1c14');const vm=emMat(vt,vt,'signs');const s=new T.Group();s.position.set(w/2-.2,4.2,d/2+.6);g.add(s);
    mk(bx(.14,1.7,.62),M.white,0,0,0,s);const p1=mk(new T.PlaneGeometry(.58,1.62),vm,.075,0,0,s,false);p1.rotation.y=PI/2;const p2=mk(new T.PlaneGeometry(.58,1.62),vm,-.075,0,0,s,false);p2.rotation.y=-PI/2;}
  if(info.lantern){[-1,1].forEach(sx=>{const [c,gx]=C2(128,64);gx.fillStyle='#c8321f';gx.fillRect(0,0,128,64);gx.fillStyle='#1a1010';gx.font=`800 30px ${FM}`;gx.textAlign='center';gx.textBaseline='middle';gx.fillText('めし',64,34);
    const lm=emMat(TX(c),null,'signs',{color:0xffffff});const l=mk(cy(.26,.26,.62,14),lm,sx*(w/2-.7),2.2,d/2+.45,g);mk(cy(.28,.28,.05,14),M.black,sx*(w/2-.7),2.52,d/2+.45,g);addGlow(sx*(w/2-.7),2.2,d/2+.8,1.8,'#ff6a3a','lamp',.8,g);});}
  if(info.pole){const [c,gx]=C2(64,128);for(let y=-128;y<256;y+=24){gx.fillStyle='#d8322a';gx.save();gx.translate(0,y);gx.transform(1,-.5,0,1,0,0);gx.fillRect(0,0,64,8);gx.fillStyle='#2a4aa0';gx.fillRect(0,12,64,8);gx.restore();}
    gx.globalCompositeOperation='destination-over';gx.fillStyle='#f4f4f0';gx.fillRect(0,0,64,128);const t=TX(c,true);const pm=emMat(t,t,'signs');
    mk(cy(.14,.14,1.1,16),pm,w/2-.4,1.6,d/2+.35,g);mk(sph(.16,10,8),lam('#e8e8e0'),w/2-.4,2.22,d/2+.35,g);mk(cy(.16,.16,.1,12),M.metal,w/2-.4,1.0,d/2+.35,g);barberPoles.push(t);}
  if(info.chimney){mk(cy(.45,.65,15,12),lam('#8a8480',{map:plainTex('#8a8480',1400,.1)}),-w/2+1,7.5,-d/2+1,g);mk(cy(.48,.48,.6,12),M.black,-w/2+1,14.8,-d/2+1,g);}
  {const PB=M.planter||(M.planter=lam('#be8952')),HL=M.hedgeL||(M.hedgeL=lam('#5d8550'));[-1,1].forEach(sx=>{const px=sx*(w/2-.65);mk(bx(.95,.42,.42),PB,px,.21,d/2+.36,g);mk(bx(.99,.05,.46),M.fascia,px,.43,d/2+.36,g,false);const f=mk(CROWN.lo,HL,px,.62,d/2+.36,g);f.scale.set(.32,.24,.2);colLocal(g,px-.5,px+.5,d/2,d/2+.6,1);});}
  colLocal(g,-w/2,w/2,-d/2,d/2,H+2);
  SHOP_INFO[kind]=l2w(g,0,1,d/2+setback*.6+.6);
  return g;}

// main street shops
const shopList=[['kissa',-16,8,'px'],['dagashi',-7,7,'px'],['shokudo',18,8,'px'],['tokoya',27.5,6.5,'px'],['hon',36.5,7,'px'],['sakaya',52,7,'px'],['sakanaya',-16,8,'nx'],['sento',36,9,'nx']];
shopList.forEach(([k,z,w,f])=>{const d=8,sb=1;const cx=f==='px'?-4-sb-d/2:4+sb+d/2;makeShop(cx,z,w,d,f,k,sb);resv(cx-d/2-.5,cx+d/2+.5,z-w/2-.5,z+w/2+.5);});

await tick('正在蓋小鎮… 60%');
/* ================================================================
   Konbini
   ================================================================ */
const KONBINI={door:new T.Vector3(16.5,0,17.8)};
(function(){
  resv(4.8,26,12.8,30.6);
  mk(bx(14,4.3,9),lam('#ecebe6'),13,2.15,23.5);addCol(6,20,19,28,6);
  const inside=(()=>{const [c,g]=C2(512,128);g.fillStyle='#fbfaf4';g.fillRect(0,0,512,128);
    for(let i=0;i<8;i++){g.fillStyle='rgba(255,255,255,1)';g.fillRect(i*64+10,4,44,4);}
    for(let s=0;s<4;s++){const x0=40+s*100;for(let r=0;r<4;r++)for(let i=0;i<14;i++){g.fillStyle=pick(['#e35d4a','#f2c14e','#5aa0d8','#7cc47a','#f08fb0','#9a7ad8','#ffffff','#f7a04a']);g.fillRect(x0+i*5,40+r*20,4,12);}g.fillStyle='#c8c6be';for(let r=0;r<4;r++)g.fillRect(x0-2,52+r*20,74,3);}
    g.fillStyle='#e8e4d8';g.fillRect(0,100,512,28);g.fillStyle='rgba(60,70,80,.9)';for(let x=0;x<=512;x+=64)g.fillRect(x,0,4,128);
    g.fillStyle='#f2c14e';g.fillRect(70,12,40,22);g.fillStyle='#d9573b';g.fillRect(300,12,48,22);g.fillStyle='rgba(0,0,0,.08)';g.fillRect(420,0,92,128);
    return TX(c);})();
  const im=emMat(inside,inside,'store');const f=mk(new T.PlaneGeometry(13,2.9),im,13,1.45,18.98,scene,false);f.rotation.y=PI;
  const logo=(w,h)=>{const [c,g]=C2(w,h);g.fillStyle='#fbfaf4';g.fillRect(0,0,w,h);g.fillStyle='#1f745c';g.fillRect(0,h*.62,w,h*.38);g.fillStyle='#e98a3a';g.fillRect(0,h*.52,w,h*.1);
    g.fillStyle='#e98a3a';g.beginPath();g.arc(h*.7,h*.3,h*.2,0,7);g.fill();g.fillStyle='#1f745c';g.font=`800 ${h*.36}px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('ひだまりマート',h*1.1,h*.3);
    g.fillStyle='#fbfaf4';g.font=`700 ${h*.2}px ${FG}`;g.fillText('HIDAMARI MART · 24h',h*1.1,h*.82);return TX(c);};
  const lt=logo(1024,96);const lm=emMat(lt,lt,'signs');
  mk(bx(14.2,.95,.35),lam('#1f745c'),13,3.8,18.9);mk(bx(14.3,.12,.4),lam('#e98a3a'),13,3.27,18.88,scene,false);mk(bx(14.3,.1,.4),lam('#b96854'),13,3.16,18.88,scene,false);
  {const DF=lam('#4a5852');for(let k=0;k<=8;k++){const x=6.6+k*1.6;if(Math.abs(x-16.5)<1.1)continue;mk(bx(.1,2.9,.12),DF,x,1.45,18.93,scene,false);}mk(bx(13.2,.12,.14),DF,13,2.9,18.93,scene,false);mk(bx(13.2,.14,.14),DF,13,.07,18.93,scene,false);
   [15.45,17.55].forEach(x=>mk(bx(.22,2.95,.6),lam('#ecebe6'),x,1.47,18.72));mk(bx(2.3,.25,.6),lam('#ecebe6'),16.5,2.95,18.72,scene,false);mk(bx(.06,2.6,.1),DF,16.5,1.3,18.9,scene,false);mk(bx(1.9,.03,1.1),lam('#7a8a84'),16.5,.03,18.1,scene,false);}const s1=mk(new T.PlaneGeometry(14.2,.95),lm,13,3.8,18.71,scene,false);s1.rotation.y=PI;
  const s2=mk(new T.PlaneGeometry(9.2,.95),lm,5.97,3.8,23.5,scene,false);s2.rotation.y=-PI/2;mk(bx(.08,.12,9.1),lam('#e98a3a'),5.97,3.27,23.5,scene,false);mk(bx(.08,.1,9.1),lam('#b96854'),5.97,3.16,23.5,scene,false);
  // lot
  const lot=(()=>{const [c,g]=C2(512,160);g.fillStyle='#6a6862';g.fillRect(0,0,512,160);speckle(g,512,160,4000,.12);g.fillStyle='rgba(240,236,226,.9)';for(let i=0;i<=6;i++)g.fillRect(20+i*78,10,5,120);return TX(c);})();
  const lg=new T.PlaneGeometry(19,6);lg.rotateX(-PI/2);mk(lg,lam('#ffffff',{map:lot}),14.5,.025,16,scene,false);
  for(let i=0;i<6;i++)mk(bx(1.3,.12,.18),M.concrete,7.3+i*2.7,.06,18.3,scene,false);
  const ps=new T.Group();ps.position.set(24.4,0,13.8);scene.add(ps);mk(cy(.14,.16,6.5,10),M.metal,0,3.25,0,ps);const sq=logo(256,256);const sqm=emMat(sq,sq,'signs');mk(bx(2.2,2.2,.4),lam('#1f745c'),0,6.8,0,ps);
  [1,-1].forEach(s=>{const p=mk(new T.PlaneGeometry(2.1,2.1),sqm,0,6.8,s*.21,ps,false);if(s<0)p.rotation.y=PI;});addGlow(24.4,6.8,13.8,5,'#ffe8b0','sign',.5);addCol(24.2,24.6,13.6,14,7);
  // outside details
  [['#3d6ea8'],['#3c8a4a'],['#d38a2a']].forEach(([c],i)=>{mk(bx(.55,.95,.5),lam('#d9d7d0'),7.2+i*.65,.48,18.5);mk(bx(.57,.08,.52),lam(c),7.2+i*.65,.98,18.5);});addCol(6.8,9.2,18.2,18.8,1);
  mk(bx(1.3,.9,.7),lam('#e4e8ee'),18.6,.45,18.55);addCol(17.9,19.3,18.2,18.9,1);
  mk(cy(.2,.2,.9,10),M.metal,10.6,.45,18.5);
  addPool(13,16,9,'#eef4ff','sign',.35);addPool(13,19.8,6,'#fff8e8','sign',.45);
  addGlow(13,3.8,18.3,6,'#ffffff','sign',.18);
  // phone box
  const pb=new T.Group();pb.position.set(25,0,25);scene.add(pb);
  const gm=new T.MeshLambertMaterial({color:col('#b9d8c4'),transparent:true,opacity:.35,emissive:col('#e8fff0'),emissiveIntensity:.2});EM.store.push(gm);
  mk(bx(1,.1,1),lam('#3f8a5a'),0,2.35,0,pb);mk(bx(1,.25,1),lam('#3f8a5a'),0,.12,0,pb);[[-.47,-.47],[.47,-.47],[-.47,.47],[.47,.47]].forEach(([x,z])=>mk(bx(.06,2.2,.06),lam('#3f8a5a'),x,1.2,z,pb));
  const gl=mk(bx(.94,2.0,.94),gm,0,1.2,0,pb,false);mk(bx(.3,.45,.2),lam('#3a7a4a'),0,1.4,-.35,pb);addGlow(0,2.1,0,2,'#e8fff0','lamp',.7,pb);addPool(25,25,2.2,'#e8fff0','lamp',.4);
  addCol(24.5,25.5,24.5,25.5,2.5);
  KONBINI.phone=new T.Vector3(25,0,23.9);
})();

/* ================================================================
   Vending machines
   ================================================================ */
const CANS=['#c8322b','#2a5bd7','#f2c14e','#3e9a5a','#1f1f22','#f4f1e8','#e87a2a','#7a4ad8','#6aa8d8','#b58a5a'];
function vendTex(body){const [c,g]=C2(128,256),[ce,ge]=C2(128,256);g.fillStyle=body;g.fillRect(0,0,128,256);speckle(g,128,256,300,.05);
  g.fillStyle='#f7f6f0';g.fillRect(8,10,112,126);
  for(let r=0;r<3;r++){for(let k=0;k<6;k++){const x=12+k*18,y=16+r*40;g.fillStyle=pick(CANS);g.fillRect(x,y,12,24);g.fillStyle='rgba(255,255,255,.4)';g.fillRect(x+2,y+1,3,22);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+9,y,3,24);
      g.fillStyle=pick(['#ffffff','#f2c14e','#1f1f22']);g.fillRect(x,y+9,12,4);g.fillStyle=(r===2&&k>2)?'#d33':'#2a5bd7';g.fillRect(x,y+27,12,6);}
    g.fillStyle='#d9d6cc';g.fillRect(8,49+r*40,112,3);}
  ge.fillStyle='#000';ge.fillRect(0,0,128,256);ge.drawImage(c,8,10,112,126,8,10,112,126);
  g.fillStyle='#1b3f8f';g.fillRect(10,140,50,12);g.fillStyle='#c8322b';g.fillRect(68,140,50,12);g.fillStyle='#fff';g.font=`700 9px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('つめた〜い',35,146);g.fillText('あったか〜い',93,146);
  ge.drawImage(c,8,138,112,16,8,138,112,16);
  g.fillStyle='#2a2a2e';g.fillRect(92,160,22,30);g.fillStyle='#e8e4d8';g.fillRect(96,164,14,8);g.fillStyle='#111';g.fillRect(14,200,100,36);g.fillStyle='#333';g.fillRect(18,204,92,28);
  ge.fillStyle='#ff5a3a';ge.fillRect(96,164,14,8);
  return {map:TX(c),emap:TX(ce)};}
const VENDS=[];
const DRINKS={
  a:[{n:'Barley tea',p:130,l:'A cold can of barley tea rolls out, sweating in your hand.'},{n:'Ramune',p:160,l:'A bottle of ramune. The glass marble rattles when you tilt it.'},{n:'Calpis soda',p:150,l:'Calpis soda. It tastes like every summer at once.'}],
  b:[{n:'Canned coffee',p:130,l:'Hot canned coffee. Slightly too sweet, and exactly right.'},{n:'Corn potage',p:130,l:'Hot corn potage. The last kernels will never come out of the can.'},{n:'Royal milk tea',p:150,l:'Royal milk tea, warm enough to hold with both hands.'}],
  c:[{n:'Melon soda',p:150,l:'Melon soda, an impossible shade of green.'},{n:'Mineral water',p:110,l:'Cold water. Plain, and perfect after the hill.'},{n:'Sports drink',p:160,l:'A sports drink. You feel like you could run to the lighthouse.'}],
  d:[{n:'Green tea',p:150,l:'Green tea, cold and a little bitter.'},{n:'Canned coffee',p:130,l:'Canned coffee from the station machine. It tastes like waiting.'},{n:'Oolong tea',p:140,l:'Oolong tea. Clean and roasted.'}]};
function vending(x,z,ry,body,set){const g=new T.Group();g.position.set(x,groundH(x,z),z);g.rotation.y=ry;scene.add(g);
  const t=vendTex(body);const fm=new T.MeshLambertMaterial({color:0xffffff,map:t.map,emissiveMap:t.emap,emissive:0xffffff,emissiveIntensity:1});EM.store.push(fm);
  const bm=lam(body);const m=new T.Mesh(bx(1.1,1.86,.8),[bm,bm,bm,bm,fm,bm]);m.position.y=.93;m.castShadow=m.receiveShadow=true;g.add(m);
  mk(bx(1.12,.08,.84),lam('#3a3a3e'),0,1.9,0,g);
  addGlow(0,1.2,.75,2.6,'#f4f8ff','sign',.45,g);
  const pp=l2w(g,0,0,1.2);addPool(pp.x,pp.z,2.3,'#f4f8ff','sign',.5);
  colLocal(g,-.55,.55,-.4,.4,2);
  VENDS.push({pos:l2w(g,0,0,1.1),set,g});}
vending(-5.25,-22.15,PI/2,'#eeeeea','a');vending(-5.25,-21.0,PI/2,'#c8322b','b');
vending(21.3,18.4,PI,'#2c5aa0','c');vending(58,-35.1,0,'#eeeeea','d');vending(-46.4,-35.9,PI,'#3f7d4f','b');
vending(-57.5,48.4,PI,'#c8322b','a');vending(47.9,16,-PI/2,'#eeeeea','c');
[[47.3,48.7,15.3,16.7],[-5.8,-22.8,-4.6,-20.4],[20.6,21.9,17.9,18.9],[-47,-45.8,-36.4,-35.4],[-58.1,-56.9,48,49]].forEach(r=>resv(...r));

/* ================================================================
   Shrine on the hill
   ================================================================ */
const SHRINE={};
(function(){
  resv(-68,-32,47,86);
  const stoneWall=lam('#ffffff',{map:(()=>{const [c,g]=C2(256,256);g.fillStyle='#4a463f';g.fillRect(0,0,256,256);for(let i=0;i<120;i++){const x=rr(-10,250),y=rr(-10,250),w=rr(20,44),h=rr(14,30);g.fillStyle=`hsl(40,${rr(4,10)}%,${rr(42,58)}%)`;rrect(g,x,y,w,h,6);g.fill();}speckle(g,256,256,2000,.12);return TX(c,true);})()});
  const topM=lam('#ffffff',{map:plainTex('#9d978a',7000,.14)});
  const pg=new T.BoxGeometry(32,5,33);const uv=pg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*6,uv.getY(i)*1);
  const pl=new T.Mesh(pg,[stoneWall,stoneWall,topM,stoneWall,stoneWall,stoneWall]);pl.position.set(-50,1.5,69.5);pl.receiveShadow=pl.castShadow=true;scene.add(pl);
  addCol(-66.4,-53,52.6,53.2,4.5);addCol(-47,-33.6,52.6,53.2,4.5);addCol(-66.4,-65.8,53,86,4.5);addCol(-34.2,-33.6,53,86,4.5);
  for(let i=0;i<12;i++){const z0=47+i*.5,top=(i+1)*4/12;mk(bx(6,top+.5,53-z0),M.stone,-50,(top-.5)/2,(z0+53)/2,scene,true);}
  [-1,1].forEach(s=>{mk(bx(.4,4.6,6.2),M.stone,-50+s*3.2,1.8,50,scene,true);addCol(-50+s*3.2-.2,-50+s*3.2+.2,47,53,5);});
  // stone path on top
  for(let z=55;z<74;z+=1.3){const s=mk(bx(1.8,.1,1.1),lam('#b8b2a4'),-50+rr(-.08,.08),4.03,z,scene,false);s.rotation.y=rr(-.05,.05);}
  // torii
  function torii(x,y,z,s){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);scene.add(g);
    [-1,1].forEach(k=>{mk(cy(.22,.26,5.2,14),M.shu,k*2.4,2.6,0,g);mk(cy(.3,.3,.35,14),M.black,k*2.4,.17,0,g);});
    mk(bx(6.6,.32,.34),M.shu,0,4.2,0,g);const k1=mk(bx(7.6,.34,.5),M.shu,0,4.95,0,g);const k2=mk(bx(8.2,.22,.6),M.black,0,5.2,0,g);
    [-1,1].forEach(k=>{const e=mk(bx(.8,.22,.6),M.black,k*4.2,5.28,0,g);e.rotation.z=k*.12;});
    mk(bx(.35,.7,.1),M.black,0,4.58,0,g);const [c,gx]=C2(64,160);gx.fillStyle='#1a1a1a';gx.fillRect(0,0,64,160);gx.strokeStyle='#c9a45a';gx.lineWidth=3;gx.strokeRect(4,4,56,152);vtext(gx,'汐見',32,52,42,FM,'#e8cf8a');
    mk(new T.PlaneGeometry(.34,.85),lam('#ffffff',{map:TX(c)}),0,4.58,.06,g,false);
    addCol(x-2.4*s-.3,x-2.4*s+.3,z-.3,z+.3,6);addCol(x+2.4*s-.3,x+2.4*s+.3,z-.3,z+.3,6);}
  torii(-50,0,47.7,1.12);torii(-50,4,56.2,.9);
  // stone lanterns
  function toro(x,y,z){const g=new T.Group();g.position.set(x,y,z);scene.add(g);mk(bx(.7,.25,.7),M.stone,0,.12,0,g);mk(cy(.14,.18,1,8),M.stone,0,.75,0,g);mk(bx(.62,.14,.62),M.stone,0,1.3,0,g);
    const fire=new T.MeshLambertMaterial({color:col('#3b332a'),emissive:col('#ffb35a'),emissiveIntensity:1});EM.lamps.push(fire);mk(bx(.42,.42,.42),fire,0,1.58,0,g);
    const cap=mk(new T.ConeGeometry(.6,.45,4),M.stone,0,2.0,0,g);cap.rotation.y=PI/4;mk(sph(.1,8,6),M.stone,0,2.28,0,g);addGlow(0,1.58,0,1.4,'#ffb35a','lamp',.7,g);addCol(x-.35,x+.35,z-.35,z+.35,2.5);}
  toro(-55.6,0,49.2);toro(-44.4,0,49.2);toro(-53,4,60);toro(-47,4,60);toro(-53,4,68);toro(-47,4,68);
  // hall
  const hg=new T.Group();hg.position.set(-50,4,77.5);hg.rotation.y=PI;scene.add(hg);
  mk(bx(10.5,.6,7.5),M.stone,0,.3,0,hg);
  const lat=(()=>{const [c,g]=C2(256,128),[ce,ge]=C2(256,128);g.fillStyle='#5a2f22';g.fillRect(0,0,256,128);g.fillStyle='#e8dcc0';g.fillRect(40,20,176,100);g.strokeStyle='#5a2f22';g.lineWidth=3;for(let x=40;x<=216;x+=11){g.beginPath();g.moveTo(x,20);g.lineTo(x,120);g.stroke();}for(let y=20;y<=120;y+=11){g.beginPath();g.moveTo(40,y);g.lineTo(216,y);g.stroke();}
    ge.fillStyle='#000';ge.fillRect(0,0,256,128);ge.fillStyle='#ffc070';ge.fillRect(40,20,176,100);ge.strokeStyle='#000';ge.lineWidth=3;for(let x=40;x<=216;x+=11){ge.beginPath();ge.moveTo(x,20);ge.lineTo(x,120);ge.stroke();}return {map:TX(c),emap:TX(ce)};})();
  const hm=emMat(lat.map,lat.emap,'windows');const wood=lam('#6a3526');
  mk(new T.BoxGeometry(8,3.2,5.4),wood,0,2.2,-.2,hg);mk(new T.PlaneGeometry(7.6,3.0),hm,0,2.2,2.52,hg,false);
  [-3.9,3.9].forEach(x=>mk(cy(.18,.18,3.4,10),M.shu,x,2.3,2.8,hg));
  const rm=lam('#ffffff',{map:roofTex('#4f7a6b'),side:T.DoubleSide});const rg=new T.Group();rg.position.y=3.6;hg.add(rg);
  (function(){const w=8,d=5.8,oh=1.6,e=d/2+oh,rh=3.1,x0=-w/2-1.3,x1=w/2+1.3;
    mk(triGeo([...quad([x0,0,e],[x1,0,e],[x1,rh,0],[x0,rh,0]),...quad([x1,0,-e],[x0,0,-e],[x0,rh,0],[x1,rh,0])],new T.Vector3(0,-2,0)),rm,0,0,0,rg);
    mk(triGeo([-w/2,rh*oh/e,-d/2,-w/2,rh*oh/e,d/2,-w/2,rh,0,w/2,rh*oh/e,d/2,w/2,rh*oh/e,-d/2,w/2,rh,0],new T.Vector3(0,1,0),()=>[.5,.5]),wood,0,0,0,rg);
    mk(bx(x1-x0+.4,.3,.4),lam('#2e4a40'),0,rh+.05,0,rg);[-1,1].forEach(s=>{const c=mk(bx(.2,.9,.2),lam('#2e4a40'),s*(x1-x0)/2,rh+.3,0,rg);c.rotation.z=s*-.5;});})();
  // shimenawa & bell
  const rope=mk(cy(.16,.16,6.4,10),lam('#d8c28a'),0,3.35,2.95,hg);rope.rotation.z=PI/2;
  for(let i=-2;i<=2;i++){const sh=mk(new T.PlaneGeometry(.18,.5),lam('#f7f5ee',{side:T.DoubleSide}),i*1.2,3.0,3.0,hg,false);}
  mk(sph(.22,12,10),lam('#c9a24a'),0,3.05,2.95,hg);const br=mk(cy(.05,.05,1.8,6),M.shu,0,2.0,2.95,hg);
  mk(bx(1.6,.8,.8),lam('#4a2a1e'),0,1.0,3.6,hg);for(let i=0;i<7;i++)mk(bx(.06,.04,.82),M.woodLight,-.7+i*.23,1.42,3.6,hg,false);
  [1,2,3].forEach(i=>mk(bx(3,.2,.5),M.stone,0,i*.2-.1+ .0,3.2+ (3-i)*.5+.3,hg,false));
  [-1,1].forEach(s=>{const lm=new T.MeshLambertMaterial({color:col('#f4ecdc'),emissive:col('#ffcf8a'),emissiveIntensity:1});EM.lamps.push(lm);const l=mk(sph(.34,12,10),lm,s*3.1,2.8,3.2,hg);l.scale.y=1.3;mk(cy(.2,.2,.1,10),M.black,s*3.1,3.3,3.2,hg);addGlow(s*3.1,2.8,3.4,2.4,'#ffcf8a','lamp',.9,hg);});
  addCol(-55.3,-44.7,73.5,81.5,7);
  SHRINE.hall=new T.Vector3(-50,4,74.4);
  // sacred tree
  const tg=new T.Group();tg.position.set(-60,4,68);scene.add(tg);mk(cy(.8,1.2,9,10),M.trunk,0,4.5,0,tg);
  const sn=mk(new T.TorusGeometry(1.05,.12,6,20),lam('#d8c28a'),0,2.2,0,tg);sn.rotation.x=PI/2;
  for(let i=0;i<9;i++){const f=mk(ico(rr(2.4,3.4),1),pick([M.leaf,M.pine,M.leaf2]),rr(-3,3),rr(8,12),rr(-3,3),tg);f.scale.y=.75;}
  addCol(-61,-59,67,69,10);SHRINE.tree=new T.Vector3(-58.2,4,68);
  // ema rack
  const eg=new T.Group();eg.position.set(-41.5,4,70);eg.rotation.y=-PI/2;scene.add(eg);mk(bx(.1,1.6,.1),M.woodDark,-1.3,.8,0,eg);mk(bx(.1,1.6,.1),M.woodDark,1.3,.8,0,eg);mk(bx(2.8,.12,.3),M.woodDark,0,1.62,0,eg);
  for(let r=0;r<2;r++)for(let i=0;i<9;i++){const e=mk(bx(.22,.16,.02),M.woodLight,-1.1+i*.27,1.35-r*.28,.06+rand()*.02,eg,false);e.rotation.z=rr(-.1,.1);}
  addCol(-42,-41,68.5,71.5,2);SHRINE.ema=new T.Vector3(-42.6,4,70);
  // omikuji ties
  const og=new T.Group();og.position.set(-58,4,60);scene.add(og);mk(bx(.08,1.4,.08),M.woodDark,-1,.7,0,og);mk(bx(.08,1.4,.08),M.woodDark,1,.7,0,og);
  for(let r=0;r<3;r++){mk(cy(.01,.01,2,4),M.metalDark,0,.8+r*.25,0,og).rotation.z=PI/2;for(let i=0;i<12;i++)if(rand()<.7)mk(bx(.05,.1,.04),M.white,-.9+i*.16,.8+r*.25,0,og,false);}
  addCol(-59.2,-56.8,59.7,60.3,2);
  // cedars behind
  for(let i=0;i<10;i++){const x=rr(-65,-35),z=rr(81,85.5);if(x>-43.5)continue;const c=mk(new T.ConeGeometry(1.6,11,7),M.pine,x,4+5.5,z);addCol(x-.4,x+.4,z-.4,z+.4,10);}
  SHRINE.firefly=new T.Vector3(-50,5.5,67);
})();

/* ================================================================
   Coast: seawall, stairs, breakwater, lighthouse, pines, bus stop
   ================================================================ */
const COAST={};
(function(){
  const swm=lam('#ffffff',{map:plainTex('#a39d90',3500,.12,true,g=>{for(let i=0;i<30;i++){g.fillStyle=`rgba(40,35,28,${rr(.03,.08)})`;g.fillRect(rr(0,256),0,rr(2,8),rr(40,256));}})});
  [[-135,-33],[-27,72.6],[77.4,135]].forEach(([a,b])=>{const g=new T.BoxGeometry(b-a,3.5,.6);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*(b-a)/6);
    mk(g,swm,(a+b)/2,-.85,-44,scene,true);mk(bx(b-a,.1,.72),M.concrete,(a+b)/2,.95,-44,scene,false);addCol(a,b,-44.3,-43.7,1.0);});
  {const RL=lam('#3d4a46');[[-135,-33],[-27,-17.6],[-12.4,72.6],[77.4,135]].forEach(([a,b])=>{const z=-44.24;for(let x=a+.6;x<=b-.5;x+=2.4)mk(bx(.07,.9,.07),RL,x,1.0+.45,z,scene,false);[.48,.9].forEach(h=>mk(bx(b-a-.9,.05,.05),RL,(a+b)/2,1.0+h,z,scene,false));});}
  for(let i=0;i<6;i++){const top=-(i+1)*.145,z0=-44.3-i*.62;mk(bx(6,top+2.2,z0+48),M.concrete,-30,(top-2.2)/2,(z0-48)/2,scene,true);}
  [-33.15,-26.85].forEach(x=>{mk(bx(.3,1.8,3.8),M.concrete,x,-.4,-46.2);addCol(x-.15,x+.15,-48,-44.3,1.2);});
  // breakwater
  mk(bx(4.8,3.5,63.7),swm,75,-1.25,-76.15);const bt=new T.PlaneGeometry(4.8,63.7);bt.rotateX(-PI/2);mk(bt,lam('#ffffff',{map:plainTex('#b0aa9d',3000,.12)}),75,.51,-76.15,scene,false);
  addCol(72.2,72.6,-108,-44.3,1.2);addCol(77.4,77.8,-108,-44.3,1.2);addCol(72.2,77.8,-108.4,-107.9,1.2);
  addCol(-135,72.2,-70,-61.2,.5);
  // lighthouse
  const lg=new T.Group();lg.position.set(75,.5,-104.5);scene.add(lg);
  mk(cy(1.3,1.4,.6,16),M.concrete,0,.3,0,lg);mk(cy(.75,.95,7,16),lam('#c93a2e'),0,4,0,lg);mk(cy(1.1,1.1,.12,16),M.metalDark,0,7.55,0,lg);
  const lm=new T.MeshLambertMaterial({color:col('#502020'),emissive:col('#ff3a28'),emissiveIntensity:0});COAST.lampMat=lm;mk(cy(.5,.5,.8,12),lm,0,8.1,0,lg);mk(new T.ConeGeometry(.65,.6,12),lam('#c93a2e'),0,8.8,0,lg);
  COAST.lampGlow=addGlow(75,8.6,-104.5,9,'#ff3a28','manual',1);COAST.lampGlow.material=COAST.lampGlow.material.clone();COAST.lampGlow.material.opacity=0;
  mk(bx(.5,.35,.05),lam('#d8c89a'),0,1.2,1.05,lg);addCol(73.6,76.4,-106,-103,8);COAST.plaque=new T.Vector3(75,.5,-102.4);
  // tetrapods
  const leg=new T.ConeGeometry(.42,1.4,6);leg.translate(0,.7,0);const tp=[];
  for(let z=-106;z<-48;z+=2.4){[70.8,79.2].forEach(x=>{if(rand()<.85)tp.push([x+rr(-.8,.8),z+rr(-.6,.6)]);});}
  for(let i=0;i<8;i++)tp.push([rr(71,79),rr(-112,-108.8)]);
  tp.forEach(([x,z])=>{if(z>-62&&x<72.6)addCol(x-.9,x+.9,z-.9,z+.9,1);});
  const im=new T.InstancedMesh(leg,lam('#a7a296'),tp.length*4);const d=new T.Object3D(),q=new T.Object3D();const dirs=[[0,1,0],[.943,-.333,0],[-.471,-.333,.816],[-.471,-.333,-.816]];let k=0;
  tp.forEach(([x,z])=>{q.position.set(x,-1.2+rr(-.3,.4),z);q.rotation.set(rr(0,6),rr(0,6),rr(0,6));q.updateMatrix();
    dirs.forEach(v=>{d.position.set(0,0,0);d.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...v));d.updateMatrix();im.setMatrixAt(k++,new T.Matrix4().multiplyMatrices(q.matrix,d.matrix));});});
  im.castShadow=true;im.receiveShadow=true;scene.add(im);
  // beach boats & driftwood
  [[-62,-50.5,.4],[-70,-52,-.3]].forEach(([x,z,r])=>{const g=new T.Group();g.position.set(x,beachH(z)+.1,z);g.rotation.set(0,r,.08);scene.add(g);
    const hs=new T.Shape();hs.moveTo(-2.6,.9);hs.lineTo(2.2,.9);hs.quadraticCurveTo(2.9,.9,3.1,1.1);hs.lineTo(2.2,0);hs.lineTo(-2.4,0);hs.lineTo(-2.6,.9);
    const hg=new T.ExtrudeGeometry(hs,{depth:1.6,bevelEnabled:false});hg.translate(0,0,-.8);mk(hg,lam('#e9e6dc'),0,0,0,g);mk(bx(5.2,.14,1.64),lam('#2f5f8a'),-.2,.7,0,g,false);mk(bx(.3,.3,1.4),M.woodDark,0,.9,0,g);
    addCol(x-2.8,x+2.8,z-1.2,z+1.2,1.2);});
  [[-40,-54],[10,-55.5],[34,-51]].forEach(([x,z])=>{const w=mk(cy(.1,.14,rr(1.4,2.4),6),lam('#9a8b77'),x,beachH(z)+.08,z);w.rotation.set(PI/2,0,rr(0,3));});
  // pines
  [[-110,-35],[-92,-35.4],[-76,-35],[-64,-35.6],[-30,-35.2],[-18,-35],[18,-35.3],[70,-35.2],[86,-35],[104,-35.4],[-88,-47],[-10,-46.8],[40,-47.2]].forEach(([x,z])=>pineTree(x,z,rr(.9,1.25),1));
  // bus stop
  const bs=new T.Group();bs.position.set(-50,0,-35.9);scene.add(bs);
  mk(bx(2.4,.08,.5),M.woodLight,0,.45,0,bs);mk(bx(2.4,.45,.06),M.woodLight,0,.72,-.22,bs);[-1,1].forEach(x=>mk(bx(.06,.45,.45),M.metalDark,x,.22,0,bs));
  [-1.3,1.3].forEach(x=>mk(cy(.05,.05,2.5,6),M.metal,x,1.25,-.5,bs));mk(bx(3,.08,1.3),lam('#51646e'),0,2.5,-.1,bs);
  addCol(-51.5,-48.5,-36.6,-35.5,2.6);
  const sgn=new T.Group();sgn.position.set(-52.6,0,-37.2);scene.add(sgn);mk(cy(.35,.35,.2,12),M.concrete,0,.1,0,sgn);mk(cy(.04,.04,2.2,6),M.metal,0,1.2,0,sgn);
  const [c,gx]=C2(128,128);gx.fillStyle='#f4f4f0';gx.beginPath();gx.arc(64,64,62,0,7);gx.fill();gx.fillStyle='#c8322b';gx.beginPath();gx.arc(64,64,62,0,7);gx.arc(64,64,50,0,7,true);gx.fill();gx.fillStyle='#1f3a6a';gx.font=`800 26px ${FG}`;gx.textAlign='center';gx.fillText('汐見浜',64,60);gx.font=`500 14px ${FG}`;gx.fillText('バス停',64,84);
  const sm=lam('#ffffff',{map:TX(c),transparent:true,alphaTest:.5,side:T.DoubleSide});mk(new T.PlaneGeometry(.7,.7),sm,0,2.35,0,sgn,false);addCol(-52.8,-52.4,-37.4,-37,2.5);
  COAST.bench=new T.Vector3(-50,0,-35.9);
  COAST.sit=new T.Vector3(-15,.95,-44);
  // sea-view railing signs
  // distant headland lighthouse with sweeping beam
  const hx=360,hz=-58,hy=Math.max(hillH(hx,hz),3);const dl=new T.Group();dl.position.set(hx,hy,hz);scene.add(dl);
  mk(cy(1.4,1.9,12,14),M.white,0,6,0,dl,false);mk(cy(1.3,1.3,1.4,12),lam('#333'),0,12.7,0,dl,false);mk(new T.ConeGeometry(1.6,1.4,12),lam('#333'),0,14,0,dl,false);
  addGlow(0,12.7,0,16,'#fff4d8','night',.9,dl);
  const bm=new T.MeshBasicMaterial({color:col('#fff2d0'),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:true});
  const beamG=new T.ConeGeometry(9,220,24,1,true);beamG.translate(0,-110,0);beamG.rotateZ(PI/2);
  const beam=new T.Group();beam.position.set(hx,hy+12.7,hz);beam.userData.dyn=true;scene.add(beam);const b1=new T.Mesh(beamG,bm);beam.add(b1);const b2=new T.Mesh(beamG,bm);b2.rotation.y=PI;beam.add(b2);
  COAST.beam=beam;COAST.beamMat=bm;
})();

/* ================================================================
   Streetlife: poles, wires, lamps, mirrors
   ================================================================ */
let flickerLamp=null;
function poleLine(pts,lampDir,lampEvery=2){
  pts.forEach((p,i)=>{const [x,z]=p;const ang=Math.atan2(lampDir[0],lampDir[1]);
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ang+PI/2;scene.add(g);
    mk(cy(.13,.17,10,8),M.pole,0,5,0,g);mk(bx(1.7,.1,.1),M.metalDark,0,9.1,0,g);mk(bx(1.1,.08,.08),M.metalDark,0,8.2,0,g);
    [-.7,0,.7].forEach(dx=>mk(cy(.04,.05,.18,6),M.white,dx,9.25,0,g,false));
    if(i%3===1){mk(cy(.28,.28,.9,10),lam('#9aa0a2'),.4,7.4,0,g);}
    mk(bx(.3,1.8,.02),lam('#e8c228'),0,1.2,.17,g,false);
    addCol(x-.2,x+.2,z-.2,z+.2,10);
    if(i%lampEvery===0){const ag=new T.Group();ag.position.set(x,6.2,z);ag.rotation.y=ang;scene.add(ag);
      const arm=mk(bx(.06,.06,1.5),M.metal,0,0,.75,ag);mk(bx(.22,.1,.5),M.metalDark,0,-.02,1.45,ag);mk(bx(.18,.04,.42),M.lampHead,0,-.08,1.45,ag,false);
      const w=l2w(ag,0,-.2,1.45);const s=addGlow(w.x,w.y,w.z,2.4,'#ffe7bd');addPool(w.x,w.z,4.2,'#ffd9a0','lamp',.42);
      if(!flickerLamp&&x<-60&&z<-30){flickerLamp=s;s.material=s.material.clone();}}});
  for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1];const dx=x1-x0,dz=z1-z0,L=Math.hypot(dx,dz);if(L>30)continue;const nx=-dz/L,nz=dx/L;
    [[-.7,9.25],[0,9.25],[.7,9.25],[0,8.25]].forEach(([o,y])=>wire(new T.Vector3(x0+nx*o,y,z0+nz*o),new T.Vector3(x1+nx*o,y,z1+nz*o),y<9?.7:.45,10));}}
function range(a,b,s,skip=[]){const r=[];for(let v=a;v<=b;v+=s){if(skip.some(([p,q])=>v>p&&v<q))continue;r.push(v);}return r;}
poleLine(range(-22,84,13,[[5,14],[41,48]]).map(z=>[3.7,z]),[-1,0]);
poleLine(range(-100,100,15,[[-5.5,5.5],[-43.5,-36.5],[41.5,48.5]]).map(x=>[x,13.3]),[0,-1]);
poleLine(range(-124,124,16,[[-6,6],[-54,-46],[26,64]]).map(x=>[x,-36.7]),[0,-1]);
poleLine(range(-100,100,16,[[-6,6],[-43.5,-36.5],[41.5,48.5]]).map(x=>[x,-22.7]),[0,-1],3);
poleLine(range(-68,68,14,[[-6,6],[-43,-37],[42,48]]).map(x=>[x,41.7]),[0,1]);
poleLine(range(-22,40,14,[[5,14]]).map(z=>[-42.3,z]),[1,0]);poleLine(range(-22,40,14,[[5,14]]).map(z=>[47.3,z]),[-1,0]);
curveMirror(-4.6,13.7,PI*.75);curveMirror(4.4,-22.6,-PI*.25);curveMirror(-37.6,13.6,PI*.75);curveMirror(42.6,5.5,-PI*.25);
stopSign(-37.6,5.2,PI);stopSign(47.4,5.2,PI);stopSign(-4.5,-23.6,-PI/2);
// postbox
const POST=new T.Vector3(5.2,0,14.3);
(function(){const g=new T.Group();g.position.copy(POST);scene.add(g);mk(bx(.5,1.1,.42),lam('#c8322b'),0,.85,0,g);mk(cy(.26,.26,.44,12,1),lam('#c8322b'),0,1.4,0,g).rotation.x=PI/2;mk(bx(.3,.3,.3),M.metalDark,0,.15,0,g);
  mk(bx(.3,.04,.02),M.black,0,1.15,.22,g,false);addCol(4.9,5.5,14,14.6,1.6);})();
// susuki grass (instanced with wind)
const GRASS_T={value:0};
(function(){const blade=new T.ConeGeometry(.03,1.5,3);blade.translate(0,.75,0);const plume=new T.ConeGeometry(.04,.5,4);plume.translate(0,1.66,0);
  const pts=[];const clumps=[[-100,-27.5,40],[-70,-27.5,20],[60,-27.5,30],[95,-27.5,30],[-64,52,20],[-36,52,20],[-100,20,26],[100,30,26],[-90,-33.7,18],[100,-33.7,18],[-20,-33.8,16]];
  clumps.forEach(([cx,cz,n])=>{for(let i=0;i<n*6;i++){const x=cx+rr(-5,5),z=cz+(Math.abs(cz+27.5)<.2||Math.abs(cz+33.7)<.2||Math.abs(cz+33.8)<.2?rr(-.4,.4):rr(-3,3));pts.push([x,z,rr(.7,1.3),rr(-.25,.25),rr(-.25,.25)]);}});
  // extra: lots
  const mats=[lam('#8f8a54'),lam('#c9b88c')];
  mats.forEach(m=>{m.onBeforeCompile=sh=>{sh.uniforms.uWind=GRASS_T;sh.vertexShader='uniform float uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float ph=instanceMatrix[3].x*.6+instanceMatrix[3].z*.4;float sw=(sin(uWind*1.7+ph)*.6+sin(uWind*3.1+ph*1.7)*.25)*.14*position.y;transformed.x+=sw;transformed.z+=sw*.5;`);};});
  [blade,plume].forEach((geo,j)=>{const im=new T.InstancedMesh(geo,mats[j],pts.length);const d=new T.Object3D();pts.forEach((p,i)=>{d.position.set(p[0],groundH(p[0],p[1]),p[1]);d.rotation.set(p[3],rand()*6,p[4]);d.scale.setScalar(p[2]);d.updateMatrix();im.setMatrixAt(i,d.matrix);});scene.add(im);});
})();

await tick('正在蓋小鎮… 70%');
/* ================================================================
   Fill the blocks with houses
   ================================================================ */
function fillEdge(ax,fixed,side,a,b){let c=a+rr(.3,1.8);
  while(true){const w=rr(6.5,10.5),d=rr(6,8.5);if(c+w>b)break;const sb=rr(.9,2.3);let cx,cz,face,r;
    if(ax==='x'){cx=c+w/2;cz=fixed+side*(sb+d/2);face=side>0?'nz':'pz';r={x0:c,x1:c+w,z0:cz-d/2,z1:cz+d/2};}
    else{cz=c+w/2;cx=fixed+side*(sb+d/2);face=side>0?'nx':'px';r={x0:cx-d/2,x1:cx+d/2,z0:c,z1:c+w};}
    const pad={x0:r.x0-.7,x1:r.x1+.7,z0:r.z0-.7,z1:r.z1+.7};
    if(!hit(pad)){makeHouse(cx,cz,w,d,face,sb);RES.push(r);}
    c+=w+rr(.9,2.6);}}
const SEG_A=[[-100,-42.5],[-37.5,-4.5],[4.5,42.5],[47.5,100]];
fillEdge('z',-4,-1,-22.5,5.5);fillEdge('z',-4,-1,13.5,41.5);fillEdge('z',-4,-1,47.5,84);
fillEdge('z',4,1,-22.5,5.5);fillEdge('z',4,1,13.5,41.5);fillEdge('z',4,1,47.5,84);
SEG_A.forEach(([a,b])=>{fillEdge('x',13,1,a,b);fillEdge('x',6,-1,a,b);fillEdge('x',-23,1,a,b);});
[[-70,-4.5],[4.5,70]].forEach(([a,b])=>fillEdge('x',47,1,a,b));
[[-70,-42.5],[-37.5,-4.5],[4.5,42.5],[47.5,70]].forEach(([a,b])=>fillEdge('x',42,-1,a,b));
[[-22.5,5.5],[13.5,41.5]].forEach(([a,b])=>{fillEdge('z',-42,-1,a,b);fillEdge('z',-38,1,a,b);fillEdge('z',43,-1,a,b);fillEdge('z',47,1,a,b);});
// garden trees & plots in the leftovers
for(let i=0;i<260;i++){const x=rr(-100,100),z=rr(-21,84);const r={x0:x-1.6,x1:x+1.6,z0:z-1.6,z1:z+1.6};if(hit(r))continue;RES.push(r);
  if(rand()<.7)tree(x,z,rr(.8,1.3));else{const g=new T.Group();g.position.set(x,0,z);scene.add(g);mk(bx(2.6,.25,2.2),lam('#5a4232'),0,.12,0,g,false);for(let k=0;k<4;k++){const f=mk(bx(2.3,.25,.25),M.leaf2,0,.35,-.8+k*.55,g,false);}}}

/* ================================================================
   Wires (one draw call)
   ================================================================ */
(function(){const g=new T.BufferGeometry().setFromPoints(WIRES);const l=new T.LineSegments(g,new T.LineBasicMaterial({color:col('#1a1818'),transparent:true,opacity:.85}));l.frustumCulled=false;scene.add(l);})();

/* ================================================================
   Merge static geometry by material
   ================================================================ */
function mergeStatic(root){
  root.updateMatrixWorld(true);const groups=new Map();
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.nomerge||Array.isArray(o.material))return;let q=o;while(q){if(q.userData.dyn)return;q=q.parent;}
    if(o.geometry.attributes.color)return;const k=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);});
  const nm=new T.Matrix3();
  groups.forEach(list=>{if(list.length<2)return;let n=0;const geos=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;n+=g.attributes.position.count;return g;});
    const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let off=0;const v=new T.Vector3();
    list.forEach((o,i)=>{const g=geos[i],p=g.attributes.position,nr=g.attributes.normal,uv=g.attributes.uv;nm.getNormalMatrix(o.matrixWorld);
      for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);P[(off+j)*3]=v.x;P[(off+j)*3+1]=v.y;P[(off+j)*3+2]=v.z;
        if(nr){v.fromBufferAttribute(nr,j).applyMatrix3(nm).normalize();N[(off+j)*3]=v.x;N[(off+j)*3+1]=v.y;N[(off+j)*3+2]=v.z;}
        if(uv){U[(off+j)*2]=uv.getX(j);U[(off+j)*2+1]=uv.getY(j);}}
      off+=p.count;o.parent.remove(o);});
    const mg=new T.BufferGeometry();mg.setAttribute('position',new T.BufferAttribute(P,3));mg.setAttribute('normal',new T.BufferAttribute(N,3));mg.setAttribute('uv',new T.BufferAttribute(U,2));
    const m=new T.Mesh(mg,list[0].material);m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;root.add(m);});}

/* ================================================================
   Dynamic: people, cats, train, vehicles, birds
   ================================================================ */
const TOON_GRAD=(()=>{const t=new T.DataTexture(new Uint8Array([120,195,255]),3,1,T.LuminanceFormat);t.minFilter=t.magFilter=T.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})();
const TOONC={};function toon(h){if(TOONC[h])return TOONC[h];const c=col(h);return TOONC[h]=new T.MeshToonMaterial({color:c,gradientMap:TOON_GRAD,emissive:c.clone().multiplyScalar(.28)});}
const OUTLINE=new T.MeshBasicMaterial({color:col('#2b1e19'),side:T.BackSide});
OUTLINE.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed+=normal*0.0085;');};
function ol(m){const o=new T.Mesh(m.geometry,OUTLINE);o.castShadow=false;o.receiveShadow=false;m.add(o);return m;}
function tk(geo,hex,x,y,z,parent,outline=true){const m=mk(geo,toon(hex),x,y,z,parent,true);if(outline)ol(m);return m;}
function shadeHex(h,f){const c=new T.Color(h);c.multiplyScalar(1+f);return '#'+c.getHexString();}
const FACET={};
function faceTex(kind,eye,closed){const k=kind+eye+(closed?1:0);if(FACET[k])return FACET[k];const [c,g]=C2(256,160);g.lineCap='round';g.lineJoin='round';
  g.save();g.translate(128,94);g.scale(2.15,2.15);g.translate(-128,-84);const ey=84;
  [[97,-1],[159,1]].forEach(([x,s])=>{
    if(closed||kind==='smile'){g.strokeStyle='#2b1e19';g.lineWidth=5;g.beginPath();if(kind==='smile'&&!closed)g.arc(x,ey+8,13,PI*1.15,PI*1.85);else{g.moveTo(x-13,ey+4);g.quadraticCurveTo(x,ey+10,x+13,ey+4);}g.stroke();
      if(!closed){}}
    else{g.fillStyle='#fffdf8';g.beginPath();g.ellipse(x,ey+2,13,17,0,0,7);g.fill();
      const gr=g.createLinearGradient(0,ey-15,0,ey+19);gr.addColorStop(0,shadeHex(eye,-.55));gr.addColorStop(.55,eye);gr.addColorStop(1,shadeHex(eye,.45));g.fillStyle=gr;g.beginPath();g.ellipse(x,ey+3.5,11,15.5,0,0,7);g.fill();
      g.fillStyle=shadeHex(eye,-.6);g.beginPath();g.ellipse(x,ey+2,5.5,7.5,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(x,ey+12,7,3.5,0,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.ellipse(x-s*4.5,ey-4,4.2,5.2,-.3,0,7);g.fill();g.beginPath();g.arc(x+s*4,ey+9,2,0,7);g.fill();g.beginPath();g.arc(x-s*1,ey+1,1.2,0,7);g.fill();
      g.strokeStyle='#2b1e19';g.lineWidth=4.2;g.beginPath();g.ellipse(x,ey+1,13.5,17.5,0,PI*1.08,PI*1.92);g.stroke();
      g.lineWidth=2.6;g.beginPath();g.moveTo(x+s*12,ey-10);g.quadraticCurveTo(x+s*17,ey-13,x+s*19,ey-9);g.stroke();
      g.lineWidth=1.6;g.strokeStyle='rgba(43,30,25,.6)';g.beginPath();g.ellipse(x,ey+2,12.5,17,0,PI*.25,PI*.75);g.stroke();}
    g.strokeStyle=kind==='old'||kind==='smile'?'rgba(150,140,130,.9)':'rgba(70,45,32,.75)';g.lineWidth=3;g.beginPath();g.moveTo(x-9,ey-27);g.quadraticCurveTo(x,ey-31,x+9,ey-28);g.stroke();
    g.fillStyle='rgba(240,120,120,.32)';g.beginPath();g.ellipse(x+s*7,ey+22,9,4,0,0,7);g.fill();
    g.strokeStyle='rgba(240,110,110,.45)';g.lineWidth=1.1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(x+s*(1+i*4),ey+20);g.lineTo(x+s*(-1+i*4),ey+24);g.stroke();}});
  g.restore();
  g.strokeStyle='#7a3a2a';g.lineWidth=3;g.beginPath();g.moveTo(123,150);g.quadraticCurveTo(128,154,133,150);g.stroke();
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return FACET[k]=t;}
const CLUMP=(()=>{const g=new T.SphereGeometry(1,10,12);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),t=(1-y)/2,k=1-Math.pow(t,1.35)*.94;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}g.computeVertexNormals();return g;})();
const PEOPLE=[];
function person(o){
  const g=new T.Group();g.userData.dyn=true;const R=.2;
  const hs=o.hairStyle==='buzz'?'spiky':(o.hairStyle||(o.long?'long':'short'));const bt=o.pants?'pants':o.skirt?'skirt':'shorts';
  const legs=[],arms=[];
  [-1,1].forEach(s=>{const l=new T.Group();l.position.set(s*.07,.5,0);g.add(l);
    tk(cy(.068,.056,.42,10),o.legs,0,-.21,0,l);
    if(bt==='shorts')tk(cy(.078,.074,.1,10),o.bottom,0,-.04,0,l);
    if(bt!=='pants')mk(cy(.059,.059,.06,10),toon('#f4f1ea'),0,-.37,0,l);
    const sh=tk(sph(.085,12,8),o.shoes,0,-.44,.03,l);sh.scale.set(.92,.62,1.45);legs.push(l);});
  if(bt==='skirt')tk(cy(.13,.23,.22,16),o.bottom,0,.5,0,g);else tk(cy(.138,.15,.14,14),o.bottom,0,.52,0,g);
  const tor=new T.LatheGeometry([[.001,0],[.142,0],[.15,.05],[.142,.17],[.126,.25],[.098,.3],[.045,.335],[.001,.34]].map(p=>new T.Vector2(p[0],p[1])),18);
  tk(tor,o.shirt,0,.53,0,g);
  const top=o.top||'tee';
  if(top==='sailor'){const cm=o.collar||'#27324a';const f=tk(bx(.26,.02,.15),cm,0,.845,-.09,g,false);f.rotation.x=-.25;[-1,1].forEach(s=>{const v=tk(bx(.028,.17,.02),cm,s*.05,.79,.122,g,false);v.rotation.z=s*.45;v.rotation.x=-.25;});tk(sph(.034,8,6),'#d9573b',0,.74,.135,g,false);}
  else if(top==='hoodie'){const h=tk(new T.SphereGeometry(.12,14,10,0,PI*2,0,PI*.55),o.shirt,0,.83,-.08,g);h.rotation.x=-1.2;tk(bx(.17,.08,.03),shadeHex(o.shirt,-.12),0,.62,.135,g,false);}
  else tk(new T.TorusGeometry(.05,.013,6,16),o.collar||shadeHex(o.shirt,-.15),0,.865,.005,g,false).rotation.x=PI/2;
  tk(cy(.042,.046,.07,10),o.skin,0,.9,0,g,false);
  [-1,1].forEach(s=>{const a=new T.Group();a.position.set(s*.148,.83,0);g.add(a);
    const sl=tk(sph(.06,10,8),o.shirt,0,-.025,0,a);sl.scale.set(1,1.2,1);
    tk(cy(.037,.034,.2,8),top==='hoodie'?o.shirt:o.skin,0,-.14,0,a);tk(sph(.05,10,8),o.skin,0,-.265,0,a);arms.push(a);});
  if(o.bag){const bc=o.bagCol||'#c8322b';tk(bx(.26,.27,.12),bc,0,.71,-.19,g);const lid=tk(new T.CylinderGeometry(.06,.06,.26,12,1,false,0,PI),shadeHex(bc,-.1),0,.84,-.19,g);lid.rotation.z=PI/2;
    [-1,1].forEach(s=>mk(bx(.032,.3,.022),toon('#2b1e19'),s*.075,.71,.13,g,false));mk(bx(.055,.045,.02),toon('#e8c060'),0,.68,-.255,g,false);}
  const head=new T.Group();head.position.y=1.16;head.scale.setScalar(1.38);g.add(head);
  tk(sph(R,24,18),o.skin,0,0,0,head).scale.set(1.04,.95,.98);
  [-1,1].forEach(s=>tk(sph(.032,8,6),o.skin,s*R*1.0,-.02,0,head,false));
  const kind=o.face||'normal',eye=o.eye||'#6a4228';const fm=new T.MeshToonMaterial({map:faceTex(kind,eye,false),transparent:true,alphaTest:.1,gradientMap:TOON_GRAD,emissive:0xffffff,emissiveMap:faceTex(kind,eye,false),emissiveIntensity:.35});
  const face=new T.Mesh(new T.SphereGeometry(R*1.006,24,12,PI/2-.75,1.5,PI/2-.62,1.1),fm);face.scale.set(1.04,.95,.98);head.add(face);
  const hc=o.hair;const C=(x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{const m=tk(CLUMP,hc,x,y,z,head);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);return m;};
  const Sp=(geo,x,y,z,sx,sy,sz)=>{const m=tk(geo,hc,x,y,z,head);m.scale.set(sx,sy,sz);return m;};
  {const cap=Sp(new T.SphereGeometry(R*1.08,24,14,0,PI*2,0,PI*.5),0,.02,-.02,1.04,1,1);cap.rotation.x=-.42;}
  Sp(sph(R*1.05,18,14),0,-.015,-.05,1.04,.95,.94);
  [-.95,-.62,-.3,0,.3,.62,.95].forEach((a,i)=>{const len=[.075,.07,.078,.062,.08,.07,.075][i];C(Math.sin(a)*R*.99,.17-Math.abs(a)*.035,Math.cos(a)*R*.95,.058,len,.036,.55,a,a*.3+(i%2?.1:-.1));});
  [-1,1].forEach(s=>{C(s*R*1.0,-.06,.05,.05,.15,.055,0,0,s*.1);C(s*R*.96,-.03,-.06,.055,.13,.06,0,0,s*.18);});
  if(hs==='short'||hs==='spiky'){[-.5,-.2,.2,.5].forEach(a=>C(Math.sin(PI+a)*R*.9,-.1,Math.cos(PI+a)*R*.9,.07,.1,.055,-.25,a,0));}
  if(hs==='long'){[-.9,-.45,0,.45,.9].forEach(a=>C(Math.sin(PI+a)*R*.85,-.2,Math.cos(PI+a)*R*.8,.1,.24,.07,-.12,a,0));[-1,1].forEach(s=>C(s*R*.98,-.17,.03,.058,.24,.06,0,0,s*.06));}
  if(hs==='pony'){tk(new T.TorusGeometry(.04,.015,6,12),o.accent||'#d9573b',0,.07,-.215,head,false).rotation.x=.4;C(0,-.06,-.29,.09,.2,.075,.55,0,0);C(.03,-.12,-.3,.06,.16,.05,.4,0,.2);}
  if(hs==='twin'){[-1,1].forEach(s=>{tk(sph(.03,8,6),o.accent||'#d9573b',s*.2,.07,-.03,head,false);C(s*.25,-.1,-.05,.075,.2,.065,0,0,s*.22);C(s*.27,-.16,-.06,.05,.15,.045,0,0,s*.35);});}
  if(hs==='spiky'){for(let i=0;i<7;i++){const a=i/7*PI*2;C(Math.cos(a)*.1,.2,Math.sin(a)*.1-.03,.05,.1,.05,PI+Math.sin(a)*.7,0,-Math.cos(a)*.7);}}
  const ah=C(0,.25,.03,.018,.07,.018,-.5,0,.5);C(.035,.3,.0,.014,.05,.014,.4,0,-.9);
  const hat=o.hat;const hcol=o.capCol||'#b8452f';
  if(hat){ah.visible=false;}
  if(hat==='straw'){tk(cy(.36,.36,.018,28),'#dcbc7c',0,.17,0,head).rotation.x=-.06;tk(cy(.2,.215,.13,20),'#dcbc7c',0,.24,-.005,head);tk(cy(.217,.217,.04,20),hcol,0,.195,-.005,head,false);}
  if(hat==='cap'){tk(new T.SphereGeometry(R*1.13,20,12,0,PI*2,0,PI*.5),hcol,0,.03,-.005,head);const v=tk(bx(.24,.02,.15),hcol,0,.13,.19,head);v.rotation.x=-.18;tk(sph(.022,6,5),'#f4f1ea',0,.255,0,head,false);}
  if(hat==='beanie'){tk(new T.SphereGeometry(R*1.13,20,12,0,PI*2,0,PI*.55),hcol,0,.04,-.005,head);tk(cy(R*1.14,R*1.14,.055,20),'#f4f1ea',0,.04,-.005,head);tk(sph(.05,8,6),'#f4f1ea',0,.27,-.01,head);}
  const P_={g,legs,arms,head,face,fOpen:faceTex(kind,eye,false),fClosed:faceTex(kind,eye,true),blink:rr(1,4),kind};PEOPLE.push(P_);return P_;}
function blinkPeople(dt){for(const p of PEOPLE){if(p.kind==='smile')continue;p.blink-=dt;if(p.blink<0&&p.face.material.map!==p.fClosed){p.face.material.map=p.face.material.emissiveMap=p.fClosed;p.bt=.12;}
  if(p.face.material.map===p.fClosed){p.bt-=dt;if(p.bt<=0){p.face.material.map=p.face.material.emissiveMap=p.fOpen;p.blink=rr(2,5.5);}}}}
// rk (0..1) blends a walk into a run: longer stride, big pumping arms held out from the body (used by the custom 3D look)
function pose(p,ph,amt,sit,rk=0){
  if(sit){p.legs.forEach(l=>{l.rotation.x=-PI/2+.08;});p.arms.forEach((a,i)=>{a.rotation.x=-.35;a.rotation.z=(i?-1:1)*.05;});return;}
  const sw=Math.sin(ph),lg=(.7+.35*rk)*amt,am=(.6+.55*rk)*amt;
  p.legs[0].rotation.x=sw*lg-.12*rk*amt;p.legs[1].rotation.x=-sw*lg-.12*rk*amt;
  p.arms[0].rotation.x=-sw*am-.25*rk;p.arms[1].rotation.x=sw*am-.25*rk;p.arms[0].rotation.z=-.14-.16*rk;p.arms[1].rotation.z=.14+.16*rk;}

// player
const P={pos:new T.Vector3(0,0,24),vel:new T.Vector3(),yaw:PI,ph:0,sit:null,moving:0,stepAcc:0};
const pl=person({skin:'#f0d0b4',shirt:'#f4f1ea',bottom:'#27324a',legs:'#f0d0b4',shoes:'#ece8de',hair:'#2a1f1c',hat:'straw'});
scene.add(pl.g);pl.g.traverse(o=>{if(o.isMesh)o.castShadow=true;});

// NPCs
const NPC=[];
(function(){
  const old=person({skin:'#e6c4a4',shirt:'#b7a88a',bottom:'#4a4a48',legs:'#4a4a48',pants:true,shoes:'#2a2522',hair:'#d4cfc6',hat:'cap',capCol:'#6a6048',face:'smile'});
  old.g.position.set(-49.4,.02,-35.8);old.g.rotation.y=PI;pose(old,0,0,true);old.g.position.y=-.05;scene.add(old.g);
  NPC.push({name:'Murata-san',jp:'村田さん',p:old,pos:new T.Vector3(-49.4,0,-36.8),kind:'old'});
  const ken=person({skin:'#d9b08c',shirt:'#39506b',bottom:'#3b3b3b',legs:'#3b3b3b',pants:true,shoes:'#222',hair:'#222',hat:'cap',capCol:'#c9c1a8',top:'hoodie'});
  ken.g.position.set(76,.5,-100);ken.g.rotation.y=PI/2;pose(ken,0,0,false);ken.arms[1].rotation.x=-1.1;ken.arms[0].rotation.x=-.9;scene.add(ken.g);
  const rod=new T.Group();rod.position.set(76.3,1.75,-99.9);rod.userData.dyn=true;scene.add(rod);const r=mk(cy(.012,.02,3.6,5),M.black,0,1.6,0,rod);rod.rotation.z=-1.0;
  mk(cy(.18,.15,.3,10),lam('#4a78a8'),76.4,.65,-100.8);
  NPC.push({name:'Ken',jp:'健さん',p:ken,pos:new T.Vector3(75.4,.5,-100),kind:'ken',rod});
})();
// cats
const CATS=[];
function makeCat(name,base,patch,x,z){
  const g=new T.Group();g.userData.dyn=true;scene.add(g);
  const bm=lam(base);const body=mk(sph(.2,10,8),bm,0,.22,0,g,true);body.scale.set(.8,.75,1.45);
  if(patch)[[.08,.3,-.05],[-.09,.27,.12]].forEach(([a,b,c])=>{const s=mk(sph(.11,8,6),lam(patch),a,b,c,g,false);s.scale.set(.9,.5,1.2);});
  const head=new T.Group();head.position.set(0,.36,.25);g.add(head);mk(sph(.12,10,8),bm,0,0,0,head);
  [-1,1].forEach(s=>{const e=mk(new T.ConeGeometry(.045,.1,4),bm,s*.065,.11,0,head);e.rotation.z=-s*.25;});
  [-1,1].forEach(s=>mk(sph(.014,6,4),lam('#c8d86a'),s*.045,.02,.11,head,false));
  const tail=new T.Group();tail.position.set(0,.28,-.26);g.add(tail);const tm=mk(cy(.025,.03,.42,6),bm,0,.2,0,tail);tail.rotation.x=-.5;
  const legs=[];[[-.08,.14],[.08,.14],[-.08,-.14],[.08,-.14]].forEach(([a,b])=>{const l=mk(cy(.03,.03,.18,6),bm,a,.09,b,g,false);legs.push(l);});
  const y=groundH(x,z);g.position.set(x,y,z);
  const c={name,g,body,head,tail,legs,home:new T.Vector3(x,y,z),tx:x,tz:z,state:'sit',t:rr(1,5),follow:0,ph:rand()*6};CATS.push(c);return c;}
makeCat('Tama','#f2eee6','#d98a3c',-13,-41);makeCat('Sumi','#232226',null,15,17);makeCat('Mikan','#d9853a','#f0e0c8',-47,62);makeCat('Nori','#8a8078','#3a3632',73.6,-60);

// fishing line
const fishLine=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(79.2,3.2,-99.9),new T.Vector3(81.5,SEA_Y+.1,-99.4)]),new T.LineBasicMaterial({color:col('#e8e4d8'),transparent:true,opacity:.6}));scene.add(fishLine);

// train
const TRAIN={x:-250,v:12,dir:1,state:'run',stopT:0,wait:0,clack:0,g:new T.Group(),lights:[],len:25.2};
(function(){
  const side=(()=>{const [c,g]=C2(1024,256),[ce,ge]=C2(1024,256);g.fillStyle='#f1e8d0';g.fillRect(0,0,1024,256);g.fillStyle='#1f745c';g.fillRect(0,150,1024,106);g.fillStyle='#f1e8d0';g.fillRect(0,170,1024,6);g.fillStyle='#1f745c';g.fillRect(0,132,1024,6);
    ge.fillStyle='#000';ge.fillRect(0,0,1024,256);
    const win=(x,w)=>{g.fillStyle='#c9bf9f';rrect(g,x-5,41,w+10,84,11);g.fill();g.fillStyle='#3d5a68';rrect(g,x,46,w,74,8);g.fill();g.fillStyle='rgba(255,255,255,.2)';g.fillRect(x+4,50,w*.4,66);ge.fillStyle='#ffe2b0';rrect(ge,x,46,w,74,8);ge.fill();};
    [60,170,560,670,780,890].forEach(x=>win(x,92));[300,300].forEach(()=>{});
    [[270,420],[430,580]].forEach(()=>{});
    [[270],[440]].forEach(([x])=>{g.fillStyle='#1f745c';g.fillRect(x-4,30,98,226);g.fillStyle='#d9ceb0';g.fillRect(x,34,90,222);g.fillStyle='#2b3a44';rrect(g,x+10,48,30,80,4);g.fill();rrect(g,x+50,48,30,80,4);g.fill();
      ge.fillStyle='#ffe2b0';rrect(ge,x+10,48,30,80,4);ge.fill();rrect(ge,x+50,48,30,80,4);ge.fill();});
    g.fillStyle='#ece2c4';g.font=`700 20px ${FG}`;g.fillText('305',960,220);g.font=`700 18px ${FM}`;g.fillText('汐風線',40,222);
    g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,0,1024,6);return {map:TX(c),emap:TX(ce)};})();
  const front=(()=>{const [c,g]=C2(256,256),[ce,ge]=C2(256,256);g.fillStyle='#f1e8d0';g.fillRect(0,0,256,256);g.fillStyle='#1f745c';g.fillRect(0,150,256,106);
    g.fillStyle='#1c1c1c';g.fillRect(40,6,176,30);g.fillStyle='#ffb040';g.font=`800 24px ${FM}`;g.textAlign='center';g.textBaseline='middle';g.fillText('みさき',128,22);
    g.fillStyle='#24313a';rrect(g,20,44,100,86,8);g.fill();rrect(g,136,44,100,86,8);g.fill();
    ge.fillStyle='#000';ge.fillRect(0,0,256,256);ge.fillStyle='#ffb040';ge.font=`800 24px ${FM}`;ge.textAlign='center';ge.textBaseline='middle';ge.fillText('みさき',128,22);
    [60,196].forEach(x=>{g.fillStyle='#fff6d8';g.beginPath();g.arc(x,190,14,0,7);g.fill();ge.fillStyle='#fff6d8';ge.beginPath();ge.arc(x,190,14,0,7);ge.fill();});return {map:TX(c),emap:TX(ce)};})();
  const sm=new T.MeshLambertMaterial({map:side.map,emissiveMap:side.emap,emissive:0xffffff,emissiveIntensity:.3});EM.windows.push(sm);TRAIN.sideMat=sm;
  const fm=new T.MeshLambertMaterial({map:front.map,emissiveMap:front.emap,emissive:0xffffff,emissiveIntensity:.6});EM.signs.push(fm);
  const bodyM=lam('#f1e8d0');
  [-6.3,6.3].forEach((cx,i)=>{const car=new T.Group();car.position.x=cx;TRAIN.g.add(car);
    const b=new T.Mesh(bx(12.4,2.7,2.6),[fm,fm,lam('#8b8c8a'),bodyM,sm,sm]);b.position.y=2.05;b.castShadow=true;b.receiveShadow=true;car.add(b);
    mk(bx(12.2,.3,2.4),lam('#8e9294'),0,3.5,0,car);mk(bx(12,.5,2.3),lam('#2f3436'),0,.55,0,car);[-3.6,0,3.6].forEach(ux=>{if(!(i===0&&ux===0))mk(bx(1.5,.32,1.3),lam('#a7abab'),ux,3.8,0,car);});
    [-4.2,4.2].forEach(bxp=>{mk(bx(2.2,.5,2.1),lam('#2a2a2a'),bxp,.45,0,car);});
    if(i===0){const pg=new T.Group();pg.position.set(0,3.65,0);car.add(pg);const a=mk(bx(.06,1.8,.06),M.metalDark,0,.8,0,pg);a.rotation.z=.5;const b2=mk(bx(.06,1.8,.06),M.metalDark,0,.8,0,pg);b2.rotation.z=-.5;mk(bx(.1,.06,1.4),M.metalDark,0,1.62,0,pg);}});
  [-1,1].forEach(s=>{const hl=addGlow(s*12.65,1.55,0,5,'#fff2d0','train',1,TRAIN.g);TRAIN.lights.push({s,hl});});
  TRAIN.g.userData.dyn=true;TRAIN.g.position.set(TRAIN.x,0,TRACK_Z);scene.add(TRAIN.g);
})();
// kei truck & cyclist
const TRUCK={g:new T.Group(),x:-140,v:8,base:8,wait:0,honk:0};
(function(){const g=TRUCK.g;g.userData.dyn=true;scene.add(g);
  mk(bx(1.5,1.35,1.42),lam('#f1f0ea'),.95,1.05,0,g);mk(bx(.05,.62,1.3),M.glassDark,1.72,1.35,0,g,false);mk(bx(2.1,.3,1.42),lam('#e8e6de'),-.8,.62,0,g);
  [[-.8,.72],[-.8,-.72]].forEach(([x,z])=>mk(bx(2.1,.35,.05),lam('#e8e6de'),x,.95,z,g));mk(bx(.05,.35,1.42),lam('#e8e6de'),-1.85,.95,0,g);
  mk(bx(.6,.4,.5),lam('#e27a2a'),-.8,1.0,.3,g);mk(bx(.6,.4,.5),lam('#3a78c0'),-1.3,1.0,-.25,g);mk(bx(.5,.3,.5),lam('#e27a2a'),-.3,.95,-.3,g);
  const wg=new T.CylinderGeometry(.28,.28,.2,12);wg.rotateX(PI/2);[[1.1,.72],[1.1,-.72],[-1.2,.72],[-1.2,-.72]].forEach(([x,z])=>mk(wg,M.black,x,.28,z,g));
  [-.45,.45].forEach(z=>addGlow(1.75,.75,z,1.8,'#fff2d0','lamp',1,g));g.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.position.set(-140,0,-38.8);})();
const CYC={g:new T.Group(),x:120,v:4.6,base:4.6,ph:0,rider:null,bell:0};
(function(){const g=CYC.g;g.userData.dyn=true;scene.add(g);const b=bike(0,0,0,'#d8d2c2');scene.remove(b);g.add(b);
  const r=person({skin:'#efcfb3',shirt:'#f6f6f2',bottom:'#27324a',legs:'#efcfb3',shoes:'#2a2a2a',hair:'#161214',hairStyle:'long',skirt:true,top:'sailor'});r.g.rotation.y=PI/2;r.g.position.set(-.18,.42,0);g.add(r.g);
  r.arms.forEach(a=>a.rotation.x=-1.1);CYC.rider=r;g.rotation.y=PI;g.position.set(120,0,-42.3);})();
// gulls & crows
const BIRDS=[];
function bird(colr,s){const g=new T.Group();g.userData.dyn=true;const m=lam(colr);mk(bx(.14,.12,.5),m,0,0,0,g,false);const w=[];
  [-1,1].forEach(k=>{const p=new T.Group();g.add(p);const wm=mk(bx(.9,.02,.24),m,k*.45,0,0,p,false);w.push(p);});g.scale.setScalar(s);scene.add(g);return {g,w};}
for(let i=0;i<9;i++){const b=bird('#f2f0ea',rr(1,1.3));BIRDS.push(Object.assign(b,{type:'gull',cx:rr(-80,80),cz:rr(-90,-55),r:rr(12,30),y:rr(10,24),sp:rr(.18,.3)*(rand()<.5?-1:1),ph:rand()*6}));}
for(let i=0;i<7;i++){const b=bird('#141416',rr(1,1.2));BIRDS.push(Object.assign(b,{type:'crow',off:i*6+rr(-2,2),dz:rr(-6,6),dy:rr(-3,3),ph:rand()*6}));}
// squid-fishing boats (漁火)
const BOATS=[];
[[-150,-380],[60,-520],[250,-430],[-320,-600],[420,-720],[-40,-820]].forEach(([x,z])=>{const g=new T.Group();g.position.set(x,SEA_Y,z);g.userData.dyn=true;scene.add(g);
  mk(bx(10,1.4,2.6),lam('#2c3036'),0,.5,0,g,false);mk(bx(2.4,1.6,2),lam('#e8e6de'),-2,1.8,0,g,false);
  for(let i=-3;i<=3;i++)addGlow(i*1.4,3.2,0,4.5,'#e8fff0','night',1,g);addGlow(0,3,0,38,'#d6ffe8','night',.28,g);BOATS.push({g,ph:rand()*6});});
// motes & fireflies
const MOTES=(()=>{const n=260,pos=new Float32Array(n*3);for(let i=0;i<n;i++){pos[i*3]=rr(-14,14);pos[i*3+1]=rr(0,7);pos[i*3+2]=rr(-14,14);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.PointsMaterial({size:.06,map:glowTex,color:col('#ffd9a8'),transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false});
  const p=new T.Points(g,m);p.frustumCulled=false;scene.add(p);return {p,m,pos,n};})();
const FLIES=(()=>{const n=46,pos=new Float32Array(n*3),c=new Float32Array(n*3),base=[];for(let i=0;i<n;i++){const b=[SHRINE.firefly.x+rr(-12,12),SHRINE.firefly.y+rr(-.5,2.5),SHRINE.firefly.z+rr(-12,10),rand()*6];base.push(b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('color',new T.BufferAttribute(c,3));
  const m=new T.PointsMaterial({size:.22,map:glowTex,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false});const p=new T.Points(g,m);p.frustumCulled=false;scene.add(p);return {p,pos,c,base,n};})();
// sea glass collectibles
const GLASS=[];
[[-92,-52,'#6ec4d8'],[-44,-57.2,'#8fd8a6'],[-5,-50,'#f2f2ee'],[22,-56,'#5f9cd8'],[58,-53,'#b8e0a0']].forEach(([x,z,c])=>{const y=beachH(z)+.06;const m=mk(new T.OctahedronGeometry(.07,0),new T.MeshLambertMaterial({color:col(c),emissive:col(c),emissiveIntensity:.5}),x,y,z,scene,false);m.userData.dyn=true;
  const s=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col(c),blending:T.AdditiveBlending,depthWrite:false,transparent:true}));s.position.set(x,y+.15,z);s.scale.set(.9,.9,1);scene.add(s);GLASS.push({m,s,x,z,c,got:false});});

await tick('正在蓋小鎮… 85%');
// cut-away in town too: remember which materials belong to standing things (houses, shops, walls, trees) before they get merged
const TOWN_CUT={tall:new Set(),gnd:new Set()};
{scene.updateMatrixWorld(true);const _b=new T.Box3(),_s=new T.Vector3();scene.traverse(o=>{if(!o.isMesh||o.userData.inkLine)return;_b.setFromObject(o);if(_b.isEmpty())return;_b.getSize(_s);
  const ms=Array.isArray(o.material)?o.material:[o.material];if(_s.x>=30||_s.z>=30||_s.y<.3)ms.forEach(m=>TOWN_CUT.gnd.add(m));else if(_s.y>.8)ms.forEach(m=>TOWN_CUT.tall.add(m));});}
mergeStatic(scene);
TOWN_CUT.tall.forEach(m=>{if(m&&(m.isMeshLambertMaterial||m.isMeshBasicMaterial||m.isMeshToonMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial)&&!TOWN_CUT.gnd.has(m))cutPatch(m);});
COLS.forEach(c=>{if(c.x0>-120&&c.x1<120&&c.z0>-120&&c.z1<100&&(c.x1-c.x0)*(c.z1-c.z0)>=.9&&Math.min(c.x1-c.x0,c.z1-c.z0)>.5&&c.y1-groundH((c.x0+c.x1)/2,(c.z0+c.z1)/2)>2.6)c.see=1;});
// dynamic fishing line already added; wires dyn helper unused

/* ================================================================
   Collision
   ================================================================ */
function collide(p,r){
  const CL=cgQuery(p.x-r-.2,p.z-r-.2,p.x+r+.2,p.z+r+.2,_cq);
  for(let pass=0;pass<2;pass++)for(let i=0;i<CL.length;i++){const c=CL[i];
    if(p.x<c.x0-r-.1||p.x>c.x1+r+.1||p.z<c.z0-r-.1||p.z>c.z1+r+.1)continue;if(p.y>c.y1-.05)continue;
    if(c.o){const o=c.o,qx=p.x-o.cx,qz=p.z-o.cz;let a=qx*o.ux+qz*o.uz,b=qx*o.vx+qz*o.vz;const na=clamp(a,-o.hw,o.hw),nb=clamp(b,-o.hd,o.hd),da=a-na,db=b-nb,e2=da*da+db*db;
      if(e2<r*r){if(e2>1e-8){const e=Math.sqrt(e2);a=na+da/e*r;b=nb+db/e*r;}else{const m=Math.min(o.hw-a,a+o.hw,o.hd-b,b+o.hd);if(m===o.hw-a)a=o.hw+r;else if(m===a+o.hw)a=-o.hw-r;else if(m===o.hd-b)b=o.hd+r;else b=-o.hd-r;}
        p.x=o.cx+a*o.ux+b*o.vx;p.z=o.cz+a*o.uz+b*o.vz;}continue;}
    const nx=clamp(p.x,c.x0,c.x1),nz=clamp(p.z,c.z0,c.z1),dx=p.x-nx,dz=p.z-nz,d2=dx*dx+dz*dz;
    if(d2<r*r){if(d2>1e-8){const d=Math.sqrt(d2);p.x=nx+dx/d*r;p.z=nz+dz/d*r;}
      else{const l=p.x-c.x0,rt=c.x1-p.x,b=p.z-c.z0,t=c.z1-p.z,m=Math.min(l,rt,b,t);if(m===l)p.x=c.x0-r;else if(m===rt)p.x=c.x1+r;else if(m===b)p.z=c.z0-r;else p.z=c.z1+r;}}}
  if(INDOOR)return;if(typeof CY_IN!=='undefined'&&CY_IN){let [lx,lz]=cyLocal(p.x,p.z);lx=clamp(lx,-5.9,5.9);lz=clamp(lz,4.35,8.9);const w=cyWorld(lx,lz);p.x=w.x;p.z=w.z;return;}if(ISL_IN){const dx=p.x-ISC.x,dz=p.z-ISC.z,d=Math.hypot(dx,dz)||1,m=ISC.r-.8;if(d>m){p.x=ISC.x+dx/d*m;p.z=ISC.z+dz/d*m;}return;}if(p.x>2300){tbClamp(p);return;}p.x=clamp(p.x,-103,103);
  const onBW=p.x>72.6&&p.x<77.4;p.z=clamp(p.z,onBW?-107.6:-61.2,85.5);}
// see-through hole: buildings between the camera and the player are cut away (Sqoyaw), so the camera never has to zoom into the player's back
const CUTU={on:false,uCA:{value:new T.Vector3()},uCB:{value:new T.Vector3()},uCR:{value:0}};
const CUT_V='vec4 cutW4=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\ncutW4=instanceMatrix*cutW4;\n#endif\nvCutW=(modelMatrix*cutW4).xyz;';
const CUT_F='{if(uCR>0.&&distance(vCutW,uCA)<3.2)discard;vec3 ab=uCB-uCA;float t=dot(vCutW-uCA,ab)/max(dot(ab,ab),1e-4);if(uCR>0.&&t>-.05&&t<.9&&vCutW.y>uCB.y-1.75){float R=uCR*(1.+(1.-t)*2.6);float dd=length(vCutW-(uCA+ab*t));if(dd<R*.86)discard;}}';
// outline shells: through a cut-away hole you look at the inside of the far walls' shells, which would read as a black blob — drop shell pixels seen through the hole (between camera and player only)
const CUT_SH='{if(uCR>0.){vec3 ab=uCB-uCA;float L=max(length(ab),1e-3);vec3 dr=ab/L;vec3 v=vCutW-uCA;float df=dot(v,dr);float tf=df/L;if(tf>-.05&&tf<1.&&vCutW.y>uCB.y-2.5){float dn=max(df-6.,3.2);float tn=min(dn/L,.9);float ang=uCR*.86*(1.+(1.-tn)*2.6)/dn;if(length(v-dr*df)<ang*max(df,1e-3))discard;}}}';
function cutPatch(m){if(!m||m.userData.cutP)return;m.userData.cutP=true;
  // solid walls get their inside drawn too, so a hole looks into a lit room instead of at the black outline shell behind it (thin textured props like signs stay one-sided)
  m.userData.side0=m.side;
  if(m.side===T.FrontSide&&!m.transparent&&(m.isMeshLambertMaterial||m.isMeshToonMaterial||m.isMeshPhongMaterial)&&(!m.map||EM.windows.includes(m)))m.side=T.DoubleSide;const prev=m.onBeforeCompile,pk=m.customProgramCacheKey?m.customProgramCacheKey.bind(m):null;
  m.onBeforeCompile=(sh,r)=>{if(prev)prev.call(m,sh,r);Object.assign(sh.uniforms,{uCA:CUTU.uCA,uCB:CUTU.uCB,uCR:CUTU.uCR});
    if(sh.vertexShader.includes('#include <project_vertex>')&&sh.fragmentShader.includes('#include <clipping_planes_fragment>')){
      sh.vertexShader='varying vec3 vCutW;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n'+CUT_V);
      sh.fragmentShader='varying vec3 vCutW;uniform vec3 uCA,uCB;uniform float uCR;\n'+sh.fragmentShader.replace('#include <clipping_planes_fragment>',CUT_F+'\n#include <clipping_planes_fragment>');}};
  m.customProgramCacheKey=()=>(pk?pk():'')+'|cut';m.needsUpdate=true;}
function camInside(p){const CL=cgQuery(p.x-.4,p.z-.4,p.x+.4,p.z+.4,_rq);for(const c of CL){if(!c.see||p.y>c.y1+1.5||p.y<c.y0)continue;
  if(c.o){const q=c.o,rx=p.x-q.cx,rz=p.z-q.cz;if(Math.abs(rx*q.ux+rz*q.uz)<q.hw+.3&&Math.abs(rx*q.vx+rz*q.vz)<q.hd+.3)return true;}else if(p.x>c.x0-.3&&p.x<c.x1+.3&&p.z>c.z0-.3&&p.z<c.z1+.3)return true;}return false;}
function rayDist(o,d,maxD,solid){let best=maxD;const sk=CUTU.on&&!solid;const ex=o.x+d.x*maxD,ez=o.z+d.z*maxD;const CL=cgQuery(Math.min(o.x,ex)-.5,Math.min(o.z,ez)-.5,Math.max(o.x,ex)+.5,Math.max(o.z,ez)+.5,_rq);for(const c of CL){if(c.y1<.9||c.nc||(sk&&c.see))continue;if(!c.o&&c.x1-c.x0<.9&&c.z1-c.z0<.9)continue;   // poles, flags, lamp posts never pull the camera in
  let tmin=0,tmax=best;let ax;if(c.o){const q=c.o,rx=o.x-q.cx,rz=o.z-q.cz;ax=[[rx*q.ux+rz*q.uz,d.x*q.ux+d.z*q.uz,-q.hw,q.hw],[o.y,d.y,c.y0,c.y1],[rx*q.vx+rz*q.vz,d.x*q.vx+d.z*q.vz,-q.hd,q.hd]];}else ax=[[o.x,d.x,c.x0,c.x1],[o.y,d.y,c.y0,c.y1],[o.z,d.z,c.z0,c.z1]];let ok=true;
  for(const [oo,dd,a,b] of ax){if(Math.abs(dd)<1e-6){if(oo<a||oo>b){ok=false;break;}}else{let t1=(a-oo)/dd,t2=(b-oo)/dd;if(t1>t2){const t=t1;t1=t2;t2=t;}tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax){ok=false;break;}}}
  if(ok&&tmin>0.2&&tmin<best)best=tmin;}return best;}

/* ================================================================
   Audio (all synthesized)
   ================================================================ */
const A={ready:false,on:true,music:true};
function audioInit(){
  if(A.ready)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC();A.ctx=ctx;
  A.out=ctx.createGain();A.out.gain.value=.9;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;A.out.connect(comp);comp.connect(ctx.destination);
  const len=ctx.sampleRate*3,buf=ctx.createBuffer(2,len,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4);}
  A.rev=ctx.createConvolver();A.rev.buffer=buf;const rg=ctx.createGain();rg.gain.value=.32;A.rev.connect(rg);rg.connect(A.out);
  A.sfx=ctx.createGain();A.sfx.connect(A.out);A.sfxSend=ctx.createGain();A.sfxSend.gain.value=.35;A.sfx.connect(A.sfxSend);A.sfxSend.connect(A.rev);
  A.amb=ctx.createGain();A.amb.connect(A.out);
  A.mus=ctx.createGain();A.mus.gain.value=0;A.mus.connect(A.out);const ms=ctx.createGain();ms.gain.value=.9;A.mus.connect(ms);ms.connect(A.rev);
  const nb=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const nd=nb.getChannelData(0);let b=0;for(let i=0;i<nd.length;i++){const w=Math.random()*2-1;b=(b+.02*w)/1.02;nd[i]=w*.5+b*3.2;}A.noise=nb;
  const loop=(filterType,f,q)=>{const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;s.loopStart=Math.random();const fl=ctx.createBiquadFilter();fl.type=filterType;fl.frequency.value=f;fl.Q.value=q||.7;const g=ctx.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);s.start(0,Math.random()*3);return {s,fl,g};};
  A.wave=loop('lowpass',480);A.wave.g.connect(A.amb);A.wave2=loop('bandpass',1100,.5);A.wave2.g.connect(A.amb);
  A.wind=loop('bandpass',380,.4);A.wind.g.connect(A.amb);
  A.cic=loop('bandpass',5600,5);A.cic.g.connect(A.amb);
  A.rum=loop('lowpass',150);A.trainP=pan();A.rum.g.connect(A.trainP);A.trainP.connect(A.sfx);
  A.brk=ctx.createOscillator();A.brk.type='sine';A.brk.frequency.value=3150;const bg=ctx.createGain();bg.gain.value=0;A.brk.connect(bg);bg.connect(A.trainP);A.brk.start();A.brkG=bg;
  A.eng=ctx.createOscillator();A.eng.type='sawtooth';A.eng.frequency.value=48;const ef=ctx.createBiquadFilter();ef.type='lowpass';ef.frequency.value=240;const eg=ctx.createGain();eg.gain.value=0;A.eng.connect(ef);ef.connect(eg);A.truckP=pan();eg.connect(A.truckP);A.truckP.connect(A.sfx);A.eng.start();A.engG=eg;
  A.next={wave:2,hig:3,crk:1,bird:4,gull:6,crow:5};A.mNext=0;A.bar=0;A.beat=0;
  A.ready=true;applyVolumes();}
function pan(){const p=A.ctx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=5;p.maxDistance=500;p.rolloffFactor=1.1;return p;}
function setP(p,x,y,z){if(p.positionX){p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z;}else p.setPosition(x,y,z);}
function dest(pos){if(!pos)return A.sfx;const p=pan();setP(p,pos.x,pos.y||1,pos.z);p.connect(A.sfx);return p;}
function applyVolumes(){if(!A.ready)return;const t=A.ctx.currentTime;A.out.gain.setTargetAtTime(A.on?.9:0,t,.1);A.mus.gain.setTargetAtTime(A.on&&A.music?.16:0,t,.4);}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
function tone(f,t,dur,type,vol,out,glide){const c=A.ctx,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);env(g,t,.005,vol,dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05);return o;}
function nburst(t,dur,type,f,q,vol,out,rate=1){const c=A.ctx,s=c.createBufferSource();s.buffer=A.noise;s.playbackRate.value=rate;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();env(g,t,.004,vol,dur);s.connect(fl);fl.connect(g);g.connect(out);s.start(t,Math.random()*2);s.stop(t+dur+.1);return fl;}
const SND={
  step(surface){if(!A.ready)return;const t=A.ctx.currentTime;const f={sand:420,wood:900,water:700,stone:1600}[surface]||1300;nburst(t,surface==='sand'?.12:.07,'bandpass',f*rr(.85,1.15),.9,surface==='water'?.16:.1,A.sfx,rr(.9,1.2));
    if(surface==='water')nburst(t+.03,.18,'highpass',2400,.5,.05,A.sfx);},
  kan(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);tone(760,t,.42,'square',.05,o);tone(1520,t,.3,'sine',.07,o);tone(2410,t,.18,'sine',.03,o);},
  vend(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);for(let i=0;i<3;i++)tone(2600+rr(0,700),t+i*.13,.14,'sine',.06,o);tone(96,t+.95,.28,'sine',.5,o);nburst(t+.95,.22,'lowpass',260,.7,.5,o);tone(180,t+1.1,.12,'triangle',.1,o);},
  chime(){if(!A.ready)return;const t=A.ctx.currentTime;[[783.99,0],[659.25,.42],[783.99,.84],[523.25,1.26]].forEach(([f,d])=>{tone(f,t+d,1.3,'sine',.09,A.sfx);tone(f*2,t+d,.6,'sine',.02,A.sfx);});},
  suzu(){if(!A.ready)return;const t=A.ctx.currentTime;for(let k=0;k<4;k++)for(let i=0;i<7;i++)tone(rr(2400,6400),t+k*.16+rr(0,.05),.7,'sine',.025,A.sfx);
    [1.6,2.1].forEach(d=>nburst(t+d,.09,'bandpass',1700,.8,.5,A.sfx));},
  meow(pos){if(!A.ready)return;const c=A.ctx,t=c.currentTime,o=dest(pos),os=c.createOscillator();os.type='sawtooth';os.frequency.setValueAtTime(480,t);os.frequency.linearRampToValueAtTime(820,t+.18);os.frequency.linearRampToValueAtTime(520,t+.55);
    const g=c.createGain();env(g,t,.04,.12,.5);const f1=c.createBiquadFilter();f1.type='bandpass';f1.frequency.value=1000;f1.Q.value=3;const f2=c.createBiquadFilter();f2.type='bandpass';f2.frequency.value=2600;f2.Q.value=4;
    os.connect(f1);os.connect(f2);f1.connect(g);f2.connect(g);g.connect(o);os.start(t);os.stop(t+.7);},
  purr(pos){if(!A.ready)return;const c=A.ctx,t=c.currentTime,o=dest(pos),s=c.createBufferSource();s.buffer=A.noise;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=260;const g=c.createGain();g.gain.value=0;
    const l=c.createOscillator();l.type='square';l.frequency.value=24;const lg=c.createGain();lg.gain.value=.12;l.connect(lg);lg.connect(g.gain);g.gain.setValueAtTime(.12,t);g.gain.linearRampToValueAtTime(0,t+2.4);s.connect(f);f.connect(g);g.connect(o);s.start(t);l.start(t);s.stop(t+2.5);l.stop(t+2.5);},
  bell(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);[0,.16].forEach(d=>{tone(3150,t+d,.9,'sine',.07,o);tone(4230,t+d,.7,'sine',.04,o);});},
  gull(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);for(let i=0,n=Math.floor(rr(2,4));i<n;i++){const os=tone(1250,t+i*.38,.3,'sawtooth',.02,o,1650);}},
  crow(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);for(let i=0,n=Math.floor(rr(2,4));i<n;i++){tone(560,t+i*.5,.34,'sawtooth',.03,o,430);nburst(t+i*.5,.3,'bandpass',900,2,.04,o);}},
  higurashi(pos){if(!A.ready)return;const c=A.ctx,t=c.currentTime,o=dest(pos),os=c.createOscillator(),g=c.createGain();os.type='sine';g.gain.value=0;os.connect(g);g.connect(o);
    const n=30;let tt=t;for(let i=0;i<n;i++){const amp=(i<4?(i+1)/4:1-(i-4)/(n-4))*.05+.001,f=4700-i*14;os.frequency.setValueAtTime(f,tt);os.frequency.exponentialRampToValueAtTime(f*.86,tt+.11);
      g.gain.setValueAtTime(.0001,tt);g.gain.exponentialRampToValueAtTime(amp,tt+.025);g.gain.exponentialRampToValueAtTime(.0001,tt+.12);tt+=.135*(1+i*.012);}os.start(t);os.stop(tt+.1);},
  cricket(pos){if(!A.ready)return;const c=A.ctx,t=c.currentTime,o=dest(pos);const kind=rand()<.5;
    if(kind){const os=c.createOscillator(),am=c.createOscillator(),ag=c.createGain(),g=c.createGain();os.frequency.value=rr(4100,4600);am.frequency.value=rr(38,48);ag.gain.value=.5;am.connect(ag);ag.connect(g.gain);env(g,t,.04,.03,.55);os.connect(g);g.connect(o);os.start(t);am.start(t);os.stop(t+.7);am.stop(t+.7);}
    else{for(let i=0;i<6;i++)tone(rr(3500,3700),t+i*.05,.035,'sine',.02,o);}},
  chirp(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);[0,.16].forEach(d=>tone(2800,t+d,.1,'sine',.03,o,4300));},
  wave(pos,v){if(!A.ready)return;const c=A.ctx,t=c.currentTime,o=dest(pos),s=c.createBufferSource();s.buffer=A.noise;const f=c.createBiquadFilter();f.type='lowpass';f.Q.value=.5;f.frequency.setValueAtTime(250,t);f.frequency.linearRampToValueAtTime(1500,t+1.3);f.frequency.linearRampToValueAtTime(420,t+4.2);
    const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.55*v,t+1.3);g.gain.exponentialRampToValueAtTime(.0001,t+4.4);s.connect(f);f.connect(g);g.connect(o);s.start(t,Math.random()*2);s.stop(t+4.5);},
  horn(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);tone(587,t,.55,'triangle',.07,o);tone(740,t,.55,'triangle',.05,o);},
  pick(){if(!A.ready)return;const t=A.ctx.currentTime;[1320,1760,2640].forEach((f,i)=>tone(f,t+i*.07,.35,'sine',.05,A.sfx));},
  post(){if(!A.ready)return;const t=A.ctx.currentTime;nburst(t,.08,'bandpass',700,1,.3,A.sfx);tone(150,t,.12,'sine',.2,A.sfx);},
  dial(){if(!A.ready)return;const t=A.ctx.currentTime;tone(400,t,1.4,'sine',.05,A.sfx);},
  clack(pos,v){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);[0,.12].forEach(d=>{nburst(t+d,.08,'lowpass',500,1,.35*v,o);tone(90,t+d,.08,'sine',.2*v,o);});},
};
// generative piano
const CHORDS=[[38,[66,69,73,76]],[35,[62,66,69,74]],[43,[62,66,71,74]],[45,[64,69,71,73]],[38,[66,69,73,78]],[42,[64,69,73,76]],[43,[62,67,71,74]],[45,[61,64,69,73]]];
const MEL=[74,76,78,81,83,86,88];
const mf=m=>440*Math.pow(2,(m-69)/12);
function pnote(m,t,v,dur=3){const c=A.ctx,f=mf(m),g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;env(g,t,.006,v,dur);
  [[f,'sine',1],[f*2,'triangle',.22],[f*3,'sine',.06]].forEach(([fr,ty,a])=>{const o=c.createOscillator(),og=c.createGain();o.type=ty;o.frequency.value=fr*(1+(Math.random()-.5)*.002);og.gain.value=a;o.connect(og);og.connect(lp);o.start(t);o.stop(t+dur+.1);});
  lp.connect(g);g.connect(A.mus);}
function musicTick(){if(!A.ready||!A.music||!A.on)return;const c=A.ctx,beat=S.night>.5?1.25:1.08;if(A.mNext<c.currentTime)A.mNext=c.currentTime+.1;
  while(A.mNext<c.currentTime+.6){const t=A.mNext,ch=CHORDS[A.bar%CHORDS.length];
    if(A.beat===0){pnote(ch[0],t,.09,4.5);pnote(ch[0]+12,t+.02,.035,3);ch[1].forEach((m,i)=>pnote(m,t+.14*i+.1,.035,3.5));}
    if(A.beat===2&&rand()<.5)pnote(pick(ch[1]),t,.03,2.5);
    if(rand()<(S.night>.5?.28:.42)){const m=pick(MEL);pnote(m,t+(rand()<.4?beat/2:0),.045,2.6);}
    A.beat++;if(A.beat>=4){A.beat=0;A.bar++;}A.mNext+=beat;}}

/* ================================================================
   Quest config & student state
   ================================================================ */
const $=id=>document.getElementById(id);
const CFG=(()=>{let c=null;try{const el=document.getElementById('quest');if(el)c=JSON.parse(el.textContent);}catch(e){}
  c=c||{};c.stations=Array.isArray(c.stations)?c.stations:[];c.countdowns=Array.isArray(c.countdowns)?c.countdowns:[];c.words=Array.isArray(c.words)?c.words:[];
  c.coinsPerCorrect=+c.coinsPerCorrect||10;c.playLimit=c.playLimit==null?30:Math.max(0,+c.playLimit||0);c.startCoins=c.startCoins==null?30:+c.startCoins;c.formLink=c.formLink||'';c.news=Array.isArray(c.news)?c.news:[];c.notes=Array.isArray(c.notes)?c.notes:[];c.resets=c.resets&&typeof c.resets==='object'?c.resets:{};
  c.stations.forEach((s,i)=>{s.id=s.id||('s'+i);s.qs=Array.isArray(s.qs)?s.qs:[];});return c;})();
const SPOTS={
  books:{name:'汐見書店',who:'書店老闆',pos:SHOP_INFO.hon,r:2.2},
  cafe:{name:'喫茶 しおさい（咖啡店）',who:'咖啡店老闆',pos:SHOP_INFO.kissa,r:2.2},
  diner:{name:'うみねこ食堂',who:'食堂阿姨',pos:SHOP_INFO.shokudo,r:2.2},
  candy:{name:'駄菓子屋（柑仔店）',who:'柑仔店阿嬤',pos:SHOP_INFO.dagashi,r:2.2},
  barber:{name:'理容なみ（理髮店）',who:'理髮師',pos:SHOP_INFO.tokoya,r:2.2},
  fish:{name:'鮮魚たけうち（魚店）',who:'魚店老闆',pos:SHOP_INFO.sakanaya,r:2.2},
  bath:{name:'松の湯（澡堂）',who:'澡堂櫃台阿姨',pos:SHOP_INFO.sento,r:2.4},
  shop:{name:'やまもと（雜貨店）',who:'雜貨店老闆',pos:SHOP_INFO.sakaya,r:2.2},
  bus:{name:'海邊巴士站',who:'村田爺爺',pos:NPC[0].pos,r:2.2},
  pier:{name:'防波堤盡頭',who:'釣魚的健叔',pos:NPC[1].pos,r:2.2},
  shrine:{name:'山上的神社',who:'神社',pos:SHRINE.hall,r:2.6},
  tree:{name:'神社大樟樹',who:'大樟樹',pos:SHRINE.tree,r:3.2},
  ema:{name:'神社許願牌',who:'許願牌',pos:SHRINE.ema,r:1.8},
  light:{name:'紅色燈塔',who:'燈塔',pos:COAST.plaque,r:1.8},
  phone:{name:'便利商店旁公共電話',who:'公共電話',pos:KONBINI.phone,r:1.6},
  post:{name:'紅色郵筒',who:'郵筒',pos:POST.clone().add(new T.Vector3(.8,0,0)),r:1.6}};
const EXTRA_STAMPS=[{id:'safety',subject:'安全',title:'安全過平交道',where:'平交道旁的導護阿姨',ch:'安'},{id:'glass',subject:'英文',title:'海灘英文單字',where:'汐見浜（海灘）找 5 片海玻璃',ch:'貝'}];
function allStamps(){return [...CFG.stations.filter(s=>!isHall(s)).map(s=>({id:s.id,subject:s.subject||'關卡',title:s.title||'',where:(SPOTS[s.spot]||{}).name||'',ch:(s.subject||'關')[0],st:s})),...EXTRA_STAMPS];}
function stampDone(id){if(id==='safety')return !!W.safety;if(id==='glass')return W.glass.length>=5;return !!W.st[id];}
const W={seat:'',name:'',coins:0,items:{},glass:[],st:{},safety:null,time:0};
const SKEY=seat=>'shiomi-quest-v1:'+seat;
function led(a,w,c){if(!W.seat||!a)return;W.ledger=Array.isArray(W.ledger)?W.ledger:[];W.ledger.push({t:Date.now(),a,w,c,b:W.coins});if(W.ledger.length>800)W.ledger.splice(0,W.ledger.length-800);}
function weekAgo(){return Date.now()-7*864e5;}
function ledSum(since){const L=(W.ledger||[]).filter(e=>e.t>=since);const inc=L.filter(e=>e.a>0).reduce((s,e)=>s+e.a,0),out=L.filter(e=>e.a<0).reduce((s,e)=>s-e.a,0);const cat={};L.filter(e=>e.a<0).forEach(e=>cat[e.c]=(cat[e.c]||0)-e.a);const icat={};L.filter(e=>e.a>0).forEach(e=>icat[e.c]=(icat[e.c]||0)+e.a);return {inc,out,cat,icat,n:L.length};}
function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function playToday(){return Math.round(((W.play||{})[dayKey(new Date())]||0)/60);}
function playWeek(){let s=0;const d=new Date();for(let i=0;i<7;i++){s+=(W.play||{})[dayKey(d)]||0;d.setDate(d.getDate()-1);}return Math.round(s/60);}
const PLAY={warned:0,snooze:0,t:0};
function playTick(dt){if(!started||!W.seat||W.seat==='T')return;const k=dayKey(new Date());W.play=W.play||{};W.play[k]=(W.play[k]||0)+dt;
  PLAY.t+=dt;if(PLAY.t<5)return;PLAY.t=0;const lim=+CFG.playLimit;if(!(lim>0))return;const m=W.play[k]/60,cap=lim+PLAY.snooze;
  if(m>=lim*.8&&PLAY.warned<1&&m<lim){PLAY.warned=1;toast(`今天已經玩了 ${Math.floor(m)} 分鐘，快到休息時間囉！`);}
  if(m>=cap&&!DLG.open&&!uiOpen()){PLAY.warned=2;save();say('休息時間到了',[`今天已經玩了 ${Math.floor(m)} 分鐘。`,'讓眼睛看看遠方，起來喝口水、動一動吧！'],{choices:[{label:'好，今天先玩到這裡（登出）',fn:()=>{save();logout();}},{label:'再玩 5 分鐘就好',fn:()=>{PLAY.snooze+=5;toast('好，再 5 分鐘喔！');}}]});}}
function histAdd(k,s){if(!W.seat)return;W.hist=Array.isArray(W.hist)?W.hist:[];W.hist.push({t:Date.now(),k,s});if(W.hist.length>600)W.hist.splice(0,W.hist.length-600);}
function histBackfill(){if(W.histInit)return;W.histInit=true;const H=[];const now=Date.now();
  CFG.stations.forEach(s=>{const r=W.st[s.id];if(r)H.push({t:+r.at||now-1,k:isHall(s)?'gold':'stamp',s:`${isHall(s)?'金章':'印章'}：${s.subject}${s.title?`〈${s.title}〉`:''}`});});
  if(W.safety)H.push({t:now-1,k:'stamp',s:'印章：安全過平交道'});
  (W.reads||[]).forEach(r=>{const t=Date.parse(r.d);H.push({t:isNaN(t)?now-1:t+43200000,k:'read',s:`閱讀：《${r.book}》`});});
  Object.entries(W.req||{}).forEach(([id,t])=>{const r=(typeof REQS!=='undefined'?REQS:[]).find(x=>x.id===id);if(r)H.push({t:+t||now-1,k:'req',s:`幫${r.who}完成委託：${r.t}`});});
  if(W.adv&&W.adv.islDone)H.push({t:now-1,k:'adv',s:'探險：解開神秘小島的三塊石碑'});if(W.adv&&W.adv.mz)H.push({t:now-1,k:'adv',s:'探險：走出瀑布迷宮'});
  if(W.pet)H.push({t:now-1,k:'pet',s:`領養了${W.pet.kind==='dog'?'小狗':'小貓'}「${W.pet.name}」`});
  W.hist=[...H,...(Array.isArray(W.hist)?W.hist:[])].sort((a,b)=>a.t-b.t);}
// progress is saved on this tablet at every change (stamps, coins, items, room, pet ...), every 30 s, and when the page is hidden.
// The chip next to the coins says when it last saved — or that this tablet can't save.
const SV={ok:null,t:0};
var RS_LOCK=false,RSV0=0;
function save(){if(!W.seat||RS_LOCK)return;W.last=Date.now();try{localStorage.setItem(SKEY(W.seat),JSON.stringify(W));SV.ok=true;SV.t=W.last;}catch(e){SV.ok=false;}if(typeof cloudMark==='function')cloudMark();svShow();}
function svShow(){const p=document.getElementById('pouch');if(!p||SV.ok==null||!started)return;let c=document.getElementById('svChip');if(!c){c=document.createElement('span');c.id='svChip';p.appendChild(c);}
  const hm=t=>{const d=new Date(t);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  const cs=typeof CLOUD!=='undefined'?CLOUD.st:'init';
  if(cs==='conflict'){c.className='sv bad';c.textContent='⚠ 另一台電腦有較新的進度';c.title='請按「換人」登出，再用同一個座號登入，就會接上最新的進度';return;}
  if(cs==='ok'&&CLOUD.okT){c.className='sv cloud';c.textContent=`☁ 已存到雲端 ${hm(CLOUD.okT)}`;c.title='進度存在雲端：換一台電腦，用同一個座號登入也接得上';return;}
  c.className=SV.ok?'sv':'sv bad';c.textContent=SV.ok?`✓ 已存檔 ${hm(SV.t)}`:'⚠ 這台平板存不了檔';
  c.title=SV.ok?(cs==='fail'?'雲端暫時連不上，進度先存在這台電腦，連上後會自動補傳':'進度已存在這台電腦，稍後會一起存到雲端'):'可能是無痕模式或瀏覽器擋住了儲存，關掉頁面後進度會不見';}
setInterval(()=>{if(started&&W.seat)save();},30000);
addEventListener('pagehide',()=>{if(started){save();cloudFlush();}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){save();cloudFlush();}});
function loadSeat(seat){try{const v=localStorage.getItem(SKEY(seat));return v?JSON.parse(v):null;}catch(e){return null;}}
/* ---------- cloud save: Firebase (Firestore REST + anonymous auth, no SDK)
   one document per seat: shiomi/seat-<seat> {d: JSON of W, t: W.last, seat, name}
   local save stays the source of truth on this device; the cloud copy is pushed at most once a minute,
   and when the page is hidden / the student logs out. At login the newer of (cloud, local) wins. */
// HOSTED: the game runs on its own address (GitHub Pages / Firebase), not inside Claude — teacher edits then live in Firestore
const HOSTED=/(github\.io|web\.app|firebaseapp\.com|localhost|127\.0\.0\.1)$/.test(location.hostname);
const FB={key:'AIzaSyBadU_r4HVpovuYmKh60Fzra1DJjwg80Xs',proj:'shiomi-quest',db:'(default)',alt:'shiomi-quest-1a2b3'};
const CLOUD={rst:{},st:'init',tok:null,rt:null,exp:0,busy:null,at:0,okT:0,dirty:false,timer:0,pushing:false,ver:true,base:0,all:{},allAt:0,fails:0};
function fbBase(){return `https://firestore.googleapis.com/v1/projects/${FB.proj}/databases/${encodeURIComponent(FB.db)}/documents/shiomi`;}
async function fbFetch(u,o={},ms=8000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{return await fetch(u,Object.assign({signal:c.signal},o));}finally{clearTimeout(t);}}
if(window.__fbTok&&window.__fbTok.tok){CLOUD.tok=window.__fbTok.tok;CLOUD.rt=window.__fbTok.rt;CLOUD.exp=window.__fbTok.exp;}
function fbAuth(){if(CLOUD.tok&&Date.now()<CLOUD.exp-60000)return Promise.resolve(CLOUD.tok);if(CLOUD.busy)return CLOUD.busy;
  CLOUD.busy=(async()=>{try{let s=null;try{s=JSON.parse(localStorage.getItem('shiomi-fb')||'null');}catch(e){}
    CLOUD.tok=null;
    if(s&&s.rt){try{const r=await fbFetch(`https://securetoken.googleapis.com/v1/token?key=${FB.key}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(s.rt)});
      if(r.ok){const j=await r.json();CLOUD.tok=j.id_token;CLOUD.rt=j.refresh_token;CLOUD.exp=Date.now()+(+j.expires_in||3600)*1000;}}catch(e){}}
    if(!CLOUD.tok){const r=await fbFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB.key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"returnSecureToken":true}'});
      if(!r.ok)throw new Error('auth '+r.status);const j=await r.json();CLOUD.tok=j.idToken;CLOUD.rt=j.refreshToken;CLOUD.exp=Date.now()+(+j.expiresIn||3600)*1000;}
    try{localStorage.setItem('shiomi-fb',JSON.stringify({rt:CLOUD.rt}));}catch(e){}return CLOUD.tok;}finally{CLOUD.busy=null;}})();
  return CLOUD.busy;}
async function fbReq(path,o={},again=true){const tok=await fbAuth();const opt=Object.assign({},o,{headers:Object.assign({Authorization:'Bearer '+tok},o.headers||{})});
  const r=await fbFetch(fbBase()+path,opt);
  if(again&&(r.status===401||r.status===403)){CLOUD.tok=null;CLOUD.exp=0;return fbReq(path,o,false);}
  if(again&&r.status===404&&FB.db!==FB.alt){const tx=await r.clone().text().catch(()=>'');if(/does not exist for project/i.test(tx)){FB.db=FB.alt;return fbReq(path,o,false);}}
  return r;}
const fbId=seat=>'seat-'+String(seat).replace(/[^0-9A-Za-z-]/g,'');
function fbUnpack(doc){try{return JSON.parse(doc.fields.d.stringValue);}catch(e){return null;}}
async function cloudGet(seat){const r=await fbReq('/'+fbId(seat));if(r.status===404)return null;if(!r.ok)throw new Error('get '+r.status);return fbUnpack(await r.json());}
async function cloudPut(o){const body={fields:{d:{stringValue:JSON.stringify(o)},t:{integerValue:String(+o.last||Date.now())},seat:{stringValue:String(o.seat)},name:{stringValue:String(o.name||'')}}};
  const r=await fbReq('/'+fbId(o.seat),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('put '+r.status);CLOUD.all[o.seat]=o;}
function cloudDel(seat){delete CLOUD.all[seat];return fbReq('/'+fbId(seat),{method:'DELETE'}).catch(()=>{});}
async function cloudList(){const out={};let pt='';for(let i=0;i<10;i++){const r=await fbReq('?pageSize=100'+(pt?'&pageToken='+encodeURIComponent(pt):''));if(!r.ok)throw new Error('list '+r.status);
    const j=await r.json();(j.documents||[]).forEach(d=>{const gm=String(d.name||'').match(/\/gift-([^/]+)$/);
      if(gm){try{const L=JSON.parse(d.fields.d.stringValue)||[];const t=Math.max(0,...L.map(g=>+(g&&g.reset)||0));if(t)CLOUD.rst[gm[1]]=Math.max(+CLOUD.rst[gm[1]]||0,t);}catch(e){}return;}
      const o=fbUnpack(d);if(o&&o.seat)out[o.seat]=o;});pt=j.nextPageToken;if(!pt)break;}
  CLOUD.all=out;CLOUD.allAt=Date.now();return out;}
// ---- reset a seat: a reset mark goes into that seat's gift list (read at every login and every 3 minutes while playing);
// any save made before the mark — on this device, in the cloud, or still in a student's tablet — no longer counts
function resetAt(seat){return Math.max(+((CFG.resets||{})[seat])||0,+CLOUD.rst[seat]||0);}
function saveOk(s,rt){return !rt||(s.rsv!=null?+s.rsv>=rt:(+s.last||0)>=rt);}
async function seatReset(seat){seat=String(seat);const t=Date.now();try{localStorage.removeItem(SKEY(seat));}catch(e){}
  let ok=true;try{await giftAdd(seat,{id:'rs'+t.toString(36),t,reset:t});}catch(e){ok=false;}await cloudDel(seat);CLOUD.rst[seat]=t;return ok;}
// ---- teacher settings (quests, news, notes, resets…) as one document: shiomi/config {d: JSON, t}
async function cfgPut(cfg){const c=JSON.parse(JSON.stringify(cfg));c.baseRev=Math.max(+c.rev||0,+c.baseRev||0);
  const r=await fbReq('/config',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{d:{stringValue:JSON.stringify(c)},t:{integerValue:String(Date.now())}}})});if(!r.ok)throw new Error('cfg '+r.status);}
// ---- teacher's make-up stamps / coins: shiomi/gift-<seat> {d: JSON list of {id,t,st:[station ids],coins,note}}
const giftId=seat=>'/gift-'+String(seat).replace(/[^0-9A-Za-z-]/g,'');
async function giftList(seat){const r=await fbReq(giftId(seat));if(r.status===404)return [];if(!r.ok)throw new Error('gift '+r.status);try{const j=await r.json();return JSON.parse(j.fields.d.stringValue)||[];}catch(e){return [];}}
async function giftAdd(seat,g){const L=await giftList(seat);L.push(g);const r=await fbReq(giftId(seat),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{d:{stringValue:JSON.stringify(L.slice(-60))}}})});if(!r.ok)throw new Error('gift '+r.status);}
// student side: take any gift not yet received (on login, then every 3 minutes while playing)
async function giftCheck(){if(!started||!W.seat||W.seat==='T')return;const seat=W.seat;let L;try{L=await giftList(seat);}catch(e){return;}if(W.seat!==seat)return;
  W.gifts=Array.isArray(W.gifts)?W.gifts:[];const got=[];let hit=0;
  L.forEach(g=>{if(!g||!g.id)return;if(+g.reset){if(+g.reset>(+W.rsv||0))hit=Math.max(hit,+g.reset);return;}if(W.gifts.includes(g.id)||(+g.t||0)<(+W.rsv||0))return;W.gifts.push(g.id);
    (g.st||[]).forEach(id=>{const st=CFG.stations.find(x=>x.id===id);if(!st||W.st[id])return;W.st[id]={c:0,t:0,at:g.t||Date.now(),tries:0,gift:1};const gold=isHall(st);
      histAdd(gold?'gold':'stamp',`${gold?'金章':'印章'}：${st.subject}${st.title?`〈${st.title}〉`:''}（老師補發）`);got.push(`${gold?'金章':'印章'}「${st.title||st.subject}」`);});
    if(+g.coins>0){W.coins+=+g.coins;led(+g.coins,'老師補發','其他');got.push(`${+g.coins} 金幣`);}
    if(g.note)got.note=(got.note?got.note+' ':'')+g.note;});
  if(hit){RS_LOCK=true;CLOUD.st='conflict';clearTimeout(CLOUD.timer);try{localStorage.removeItem(SKEY(seat));}catch(e){}
    say('老師',['老師把你的進度重設了。','按下一步，遊戲會重新開始。'],{noWave:1,onEnd:()=>location.reload()});return;}
  if(got.length||got.note){save();renderPouch();if(typeof refreshGlass==='function')refreshGlass();SND.stamp&&SND.stamp();
    say('老師的補發',[got.length?'老師補發給你：'+got.join('、')+'！':'老師給你留了話：',...(got.note?[got.note]:[]),'去集章卡看看吧！'],{noWave:1});}}
setInterval(()=>{if(started&&W.seat&&CLOUD.st==='ok')giftCheck();},180000);
// teacher views: re-read the class from the cloud (at most every 15 s), then call back to redraw
function cloudRefresh(cb){if(Date.now()-CLOUD.allAt<15000)return;CLOUD.allAt=Date.now();cloudList().then(()=>{CLOUD.st=CLOUD.st==='conflict'?'conflict':'ok';cb&&cb();},()=>{});}
// every save of the class: this device's saves + the cloud copies, the newer one per seat, minus seats the teacher reset
function allSaves(){const m={};try{Object.keys(localStorage).filter(k=>k.startsWith('shiomi-quest-v1:')).forEach(k=>{const s=JSON.parse(localStorage.getItem(k)||'null');if(s&&s.seat)m[s.seat]=s;});}catch(e){}
  Object.values(CLOUD.all).forEach(s=>{if(s&&s.seat)m[s.seat]=m[s.seat]?mergeSaves(s,m[s.seat]):s;});
  return Object.values(m).filter(s=>s.seat!=='T'&&saveOk(s,resetAt(s.seat)));}
// two saves of the same seat (cloud + this computer): the one with more play time is the base — it already contains the
// other when the student simply carried on — and every stamp / reading / adventure / request the other one has is added,
// so a fresh start on another computer never wipes out stamps that were earned on this one.
function mergeSaves(a,b){const A=JSON.parse(JSON.stringify(a)),B=JSON.parse(JSON.stringify(b));
  const ta=+A.time||0,tb=+B.time||0;let base,o;if(ta!==tb){[base,o]=ta>tb?[A,B]:[B,A];}else{[base,o]=(+A.last||0)>=(+B.last||0)?[A,B]:[B,A];}
  base.st=base.st||{};Object.entries(o.st||{}).forEach(([k,v])=>{if(!base.st[k])base.st[k]=v;});
  if(!base.safety&&o.safety)base.safety=o.safety;
  const uni=(x,y,key)=>{const m=new Map();[...(x||[]),...(y||[])].forEach(e=>{const k=key(e);if(!m.has(k))m.set(k,e);});return [...m.values()];};
  base.reads=uni(base.reads,o.reads,r=>(r&&r.book)+'|'+(r&&r.d));base.toT=uni(base.toT,o.toT,m=>(m&&m.t)+'|'+(m&&m.text)).sort((x,y)=>x.t-y.t).slice(-30);
  base.hist=uni(base.hist,o.hist,h=>(h&&h.t)+'|'+(h&&h.s)).sort((x,y)=>x.t-y.t);
  base.glass=uni(base.glass,o.glass,g=>JSON.stringify(g));
  base.req=Object.assign({},o.req||{},base.req||{});base.reqNote=Object.assign({},o.reqNote||{},base.reqNote||{});
  base.adv=base.adv||{};const oa=o.adv||{};Object.keys(oa).forEach(k=>{const v=base.adv[k];if(v==null||v===false||v===0)base.adv[k]=oa[k];else if(typeof v==='number'&&typeof oa[k]==='number')base.adv[k]=Math.max(v,oa[k]);});
  if(!base.pet&&o.pet)base.pet=o.pet;if(!base.look&&o.look)base.look=o.look;if(!base.home&&o.home){base.home=o.home;base.furn=o.furn||base.furn;}
  base.gifts=[...new Set([...(base.gifts||[]),...(o.gifts||[])])];
  if(o.wild){base.wild=base.wild||{};Object.entries(o.wild).forEach(([k,v])=>{const b=base.wild[k];if(!b){base.wild[k]=v;return;}b.n=Math.max(+b.n||0,+v.n||0);b.rel=Math.max(+b.rel||0,+v.rel||0);b.done=[...new Set([...(b.done||[]),...(v.done||[])])];b.cert=b.cert||v.cert;b.met=b.met||v.met;});}
  base.play=base.play||{};Object.entries(o.play||{}).forEach(([d,v])=>{base.play[d]=Math.max(+base.play[d]||0,+v||0);});
  base.last=Math.max(+A.last||0,+B.last||0);return base;}
function cloudMark(){if(!W.seat||CLOUD.st==='conflict')return;CLOUD.dirty=true;if(!CLOUD.timer)CLOUD.timer=setTimeout(cloudPush,Math.max(1500,CLOUD.at+60000-Date.now()));}
async function cloudPush(){clearTimeout(CLOUD.timer);CLOUD.timer=0;if(!W.seat||!CLOUD.dirty||CLOUD.st==='conflict')return;
  if(CLOUD.pushing){CLOUD.timer=setTimeout(cloudPush,5000);return;}
  CLOUD.pushing=true;const snap=JSON.parse(JSON.stringify(W));CLOUD.dirty=false;CLOUD.at=Date.now();
  try{if(!CLOUD.ver){const c=await cloudGet(snap.seat);if(c&&(+c.last||0)>CLOUD.base){CLOUD.st='conflict';return;}CLOUD.ver=true;}
    await cloudPut(snap);CLOUD.st='ok';CLOUD.okT=Date.now();CLOUD.fails=0;}
  catch(e){CLOUD.st='fail';CLOUD.fails++;if(W.seat===snap.seat){CLOUD.dirty=true;CLOUD.timer=setTimeout(cloudPush,CLOUD.fails>3?300000:120000);}}
  finally{CLOUD.pushing=false;svShow();}}
// page hidden / logout: send what we have right now (no waiting for the minute)
function cloudFlush(){if(!W.seat||!CLOUD.dirty||CLOUD.st==='conflict'||!CLOUD.ver||CLOUD.st==='fail'&&CLOUD.fails>3)return;clearTimeout(CLOUD.timer);CLOUD.timer=0;
  const snap=JSON.parse(JSON.stringify(W));CLOUD.dirty=false;CLOUD.at=Date.now();cloudPut(snap).then(()=>{CLOUD.st='ok';CLOUD.okT=Date.now();svShow();},()=>{CLOUD.st='fail';if(W.seat===snap.seat){CLOUD.dirty=true;cloudMark();}svShow();});}
// warm up the sign-in while the title screen is showing, and say on the title screen whether the cloud is reachable
function cloudHello(){const n=document.getElementById('cloudNote');fbAuth().then(()=>fbReq('/_ping')).then(r=>{const ok=r.ok||r.status===404;if(CLOUD.st==='init')CLOUD.st=ok?'ok':'fail';
    if(n){n.textContent=ok?'☁ 雲端存檔已連線：換電腦也接得上進度':'⚠ 雲端存檔連不上（'+r.status+'），進度只會存在這台電腦';n.className='cloud-note '+(ok?'ok':'bad');}},
  e=>{if(CLOUD.st==='init')CLOUD.st='fail';if(n){n.textContent='⚠ 雲端存檔連不上，進度只會存在這台電腦';n.className='cloud-note bad';n.title=String(e&&e.message||e);}});}
setTimeout(cloudHello,300);
function addItem(n,k=1){W.items[n]=(W.items[n]||0)+k;if(W.items[n]<=0)delete W.items[n];renderPouch();save();}
function renderPouch(){setTimeout(svShow,0);const el=$('pouch');el.innerHTML='';const y=document.createElement('span');y.className='yen';y.innerHTML=ICON('coin')+`<b>${W.coins}</b>`;y.setAttribute('aria-label',`金幣 ${W.coins}`);y.title='打開零用錢帳本';y.style.pointerEvents='auto';y.style.cursor='pointer';y.onclick=()=>{if(started)openBoard('money');};el.appendChild(y);
  const ents=Object.entries(W.items);if(IS_TOUCH){if(ents.length){const s=document.createElement('span');s.textContent=`背包 ${ents.reduce((a,[k,v])=>a+v,0)}`;el.appendChild(s);}}
  else ents.forEach(([k,v])=>{const s=document.createElement('span');s.textContent=v>1?`${k} ×${v}`:k;el.appendChild(s);});
  if(W.glass.length){const s=document.createElement('span');s.textContent=`海玻璃 ${W.glass.length}/5`;el.appendChild(s);}
  if(typeof MART!=='undefined'&&MART&&MART.basket.length){const s=document.createElement('span');s.className='yen';s.textContent=`購物籃 ${MART.basket.length} 件・${MART.basket.reduce((a,i)=>a+i[1],0)} 金幣`;el.appendChild(s);}
  const all=allStamps();$('stampCount').textContent=`${all.filter(s=>stampDone(s.id)).length}/${all.length}`;}
let toastT=0;function toast(msg){if(CUTON)return;const t=$('toast');t.textContent=msg;t.classList.add('show');toastT=3.2;}

/* ================================================================
   Dialog
   ================================================================ */
const DLG={open:false,lines:[],i:0,typed:0,full:'',choices:null,onEnd:null};
function say(who,lines,opts={}){$('dialog').classList.toggle('quiz',!!opts.quiz);if(who&&!opts.quiz&&!opts.noWave&&!opts.choices&&typeof actPlay==='function'&&started&&!INDOOR&&!CUTON&&!P.sit&&!(ACT.on&&ACT.lock))actPlay('wave',{loops:2});{const D=$('dialog');let f=D.querySelector('.dlg-face');if(opts.face){if(!f){f=document.createElement('img');f.className='dlg-face';f.alt='';D.appendChild(f);}f.src=opts.face;f.hidden=false;}else if(f)f.hidden=true;const av=D.querySelector('.ac-view');if(av)av.hidden=!(typeof AC!=='undefined'&&AC.view);}DLG.open=true;DLG.who=who||'';DLG.lines=lines;DLG.i=0;DLG.choices=opts.choices||null;DLG.onEnd=opts.onEnd||null;$('dialog').hidden=false;$('dialog').querySelector('.who').textContent=DLG.who;startLine();}
function startLine(){DLG.full=DLG.lines[DLG.i];DLG.typed=0;$('dialog').querySelector('.txt').textContent='';$('dialog').querySelector('.choices').innerHTML='';$('dialog').querySelector('.more').hidden=true;}
function choose(who,text,choices,extra={}){say(who,[text],Object.assign({choices},extra));}
function showChoices(){const box=$('dialog').querySelector('.choices');box.innerHTML='';DLG.choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${i+1}</b>`;b.appendChild(document.createTextNode(c.label));b.onclick=e=>{e.stopPropagation();pickChoice(i);};box.appendChild(b);});
  const f=box.querySelector('button');if(f&&!IS_TOUCH)f.focus({preventScroll:true});}
function pickChoice(i){if(!DLG.choices||!DLG.choices[i]||DLG.typed<DLG.full.length)return;const c=DLG.choices[i],quiz=$('dialog').classList.contains('quiz');closeDlg();
  if(c.fn&&!quiz&&typeof actPlay==='function'&&!(ACT.on&&ACT.lock)&&!INDOOR)actPlay('i.nod');   // agree: a small nod (before the choice starts its own action)
  c.fn&&c.fn();}
function closeDlg(){DLG.open=false;$('dialog').hidden=true;const f=DLG.onEnd;DLG.onEnd=null;DLG.choices=null;renderer.domElement.focus({preventScroll:true});f&&f();}
function advance(){if(!DLG.open)return;if(DLG.typed<DLG.full.length){DLG.typed=DLG.full.length;$('dialog').querySelector('.txt').textContent=DLG.full;lineDone();return;}
  if(DLG.choices&&DLG.i===DLG.lines.length-1)return;if(DLG.i<DLG.lines.length-1){DLG.i++;startLine();}else closeDlg();}
function lineDone(){if(DLG.choices&&DLG.i===DLG.lines.length-1)showChoices();else $('dialog').querySelector('.more').hidden=false;}
$('dialog').addEventListener('click',()=>advance());

/* extra sounds */
SND.wrong=function(){if(!A.ready)return;const t=A.ctx.currentTime;tone(330,t,.18,'triangle',.08,A.sfx);tone(262,t+.16,.3,'triangle',.08,A.sfx);};
SND.stamp=function(){if(!A.ready)return;const t=A.ctx.currentTime;nburst(t,.12,'lowpass',400,1,.5,A.sfx);tone(110,t,.15,'sine',.3,A.sfx);[784,988,1175].forEach((f,i)=>tone(f,t+.2+i*.09,.5,'sine',.06,A.sfx));};

/* ================================================================
   Quest markers (floating signs above each station)
   ================================================================ */
const SUBJ=[{m:/國|語文|閱讀/,icon:'book',c:'#e0674b'},{m:/英/,icon:'abc',c:'#4a9be0'},{m:/自然|科學/,icon:'leaf',c:'#4fae6c'},{m:/社/,icon:'globe',c:'#e2a93c'},{m:/音/,icon:'note',c:'#a77ae0'},
  {m:/健|體/,icon:'apple',c:'#ec6688'},{m:/數/,icon:'num',c:'#2fb5ac'},{m:/安全/,icon:'xing',c:'#e9b422'},{m:/倒數/,icon:'cal',c:'#5b7fd0'},{m:/時光/,icon:'hour',c:'#3fbcd6'}];
function subjStyle(s){s=s||'';for(const x of SUBJ)if(x.m.test(s))return x;return {icon:'char',c:'#d99a3c'};}
function drawIcon(g,icon,S,colr,label){g.save();g.fillStyle=colr;g.strokeStyle=colr;g.lineCap='round';g.lineJoin='round';g.lineWidth=S*.075;
  const txt=(t,sz,f)=>{g.font=`800 ${S*sz}px ${f||FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText(t,0,S*.02);};
  if(icon==='book'){g.beginPath();g.moveTo(0,-S*.26);g.quadraticCurveTo(-S*.22,-S*.38,-S*.46,-S*.3);g.lineTo(-S*.46,S*.3);g.quadraticCurveTo(-S*.22,S*.22,0,S*.33);g.quadraticCurveTo(S*.22,S*.22,S*.46,S*.3);g.lineTo(S*.46,-S*.3);g.quadraticCurveTo(S*.22,-S*.38,0,-S*.26);g.closePath();
    g.globalAlpha=.16;g.fill();g.globalAlpha=1;g.stroke();g.beginPath();g.moveTo(0,-S*.26);g.lineTo(0,S*.33);g.stroke();g.lineWidth=S*.04;
    for(let k=0;k<3;k++){const y=-S*.1+k*S*.13;g.beginPath();g.moveTo(-S*.36,y);g.lineTo(-S*.1,y+S*.02);g.moveTo(S*.36,y);g.lineTo(S*.1,y+S*.02);g.stroke();}}
  else if(icon==='abc')txt('ABC',.42);
  else if(icon==='num')txt('123',.42);
  else if(icon==='leaf'){g.beginPath();g.moveTo(-S*.38,S*.36);g.quadraticCurveTo(-S*.46,-S*.34,S*.4,-S*.4);g.quadraticCurveTo(S*.4,S*.38,-S*.38,S*.36);g.fill();
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=S*.045;g.beginPath();g.moveTo(-S*.3,S*.28);g.quadraticCurveTo(0,0,S*.3,-S*.32);g.stroke();}
  else if(icon==='globe'){g.beginPath();g.arc(0,0,S*.38,0,7);g.globalAlpha=.16;g.fill();g.globalAlpha=1;g.stroke();g.lineWidth=S*.045;g.beginPath();g.ellipse(0,0,S*.16,S*.38,0,0,7);g.stroke();
    [-.18,0,.18].forEach(k=>{const w=Math.sqrt(.38*.38-k*k)*S;g.beginPath();g.moveTo(-w,k*S);g.lineTo(w,k*S);g.stroke();});}
  else if(icon==='note'){g.save();g.translate(-S*.13,S*.24);g.rotate(-.45);g.beginPath();g.ellipse(0,0,S*.17,S*.12,0,0,7);g.fill();g.restore();
    g.beginPath();g.moveTo(S*.02,S*.2);g.lineTo(S*.02,-S*.38);g.quadraticCurveTo(S*.14,-S*.16,S*.34,-S*.12);g.quadraticCurveTo(S*.22,-S*.26,S*.02,-S*.38);g.stroke();g.fill();}
  else if(icon==='apple'){g.beginPath();g.moveTo(0,-S*.18);g.bezierCurveTo(S*.5,-S*.4,S*.52,S*.3,S*.12,S*.38);g.quadraticCurveTo(0,S*.32,-S*.12,S*.38);g.bezierCurveTo(-S*.52,S*.3,-S*.5,-S*.4,0,-S*.18);g.fill();
    g.lineWidth=S*.05;g.strokeStyle='#6a4a2a';g.beginPath();g.moveTo(0,-S*.18);g.quadraticCurveTo(S*.02,-S*.34,S*.08,-S*.4);g.stroke();
    g.fillStyle='#4fae6c';g.beginPath();g.ellipse(S*.16,-S*.34,S*.1,S*.05,-.5,0,7);g.fill();}
  else if(icon==='xing'){[1,-1].forEach(k=>{g.save();g.rotate(k*PI/4);g.fillStyle='#1d1c1c';g.fillRect(-S*.46,-S*.1,S*.92,S*.2);g.fillStyle=colr;g.fillRect(-S*.42,-S*.065,S*.84,S*.13);g.restore();});}
  else if(icon==='cal'){g.lineWidth=S*.06;rrect(g,-S*.36,-S*.3,S*.72,S*.64,S*.08);g.stroke();g.fillRect(-S*.36,-S*.3,S*.72,S*.17);
    [-.16,.16].forEach(x=>{g.fillRect(x*S-S*.03,-S*.4,S*.06,S*.16);});for(let r=0;r<2;r++)for(let c2=0;c2<3;c2++){g.fillRect(-S*.24+c2*S*.19,-S*.02+r*S*.16,S*.1,S*.09);}}
  else if(icon==='hour'){g.lineWidth=S*.06;g.beginPath();g.moveTo(-S*.26,-S*.36);g.lineTo(S*.26,-S*.36);g.lineTo(-S*.26,S*.36);g.lineTo(S*.26,S*.36);g.closePath();g.stroke();
    g.globalAlpha=.5;g.beginPath();g.moveTo(-S*.13,S*.3);g.lineTo(S*.13,S*.3);g.lineTo(0,S*.12);g.fill();g.globalAlpha=1;g.fillRect(-S*.32,-S*.42,S*.64,S*.06);g.fillRect(-S*.32,S*.36,S*.64,S*.06);}
  else txt((label||'關')[0],.56,FM);
  g.restore();}
const PQT={};
function plaqueTex(subject,state){const k=subject+'|'+state;if(PQT[k])return PQT[k];const [c,g]=C2(256,330);const st=subjStyle(subject);
  if(state==='done'){g.save();g.translate(128,178);g.rotate(-.18);
    g.strokeStyle='#cf3f27';g.lineWidth=13;g.beginPath();g.arc(0,0,100,0,7);g.stroke();g.lineWidth=4;g.beginPath();g.arc(0,0,82,0,7);g.stroke();
    g.fillStyle='#cf3f27';g.font=`800 104px ${FM}`;g.textAlign='center';g.textBaseline='middle';g.fillText((subject||'關')[0],0,4);
    g.globalCompositeOperation='destination-out';for(let i=0;i<260;i++){g.globalAlpha=Math.random()*.6;g.fillRect(Math.random()*240-120,Math.random()*240-120,2+Math.random()*4,2+Math.random()*3);}g.restore();}
  else{const info=state==='info';
    g.strokeStyle='rgba(70,48,32,.9)';g.lineWidth=4;g.beginPath();g.moveTo(128,4);g.lineTo(128,44);g.stroke();g.fillStyle=st.c;g.beginPath();g.arc(128,44,7,0,7);g.fill();
    g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=14;g.shadowOffsetY=6;
    g.beginPath();g.moveTo(128,58);g.lineTo(222,104);g.lineTo(222,286);g.quadraticCurveTo(222,300,208,300);g.lineTo(48,300);g.quadraticCurveTo(34,300,34,286);g.lineTo(34,104);g.closePath();
    const gr=g.createLinearGradient(0,58,0,300);gr.addColorStop(0,'#faf1de');gr.addColorStop(1,'#ead6b0');g.fillStyle=gr;g.fill();g.restore();
    g.save();g.clip();g.strokeStyle='rgba(150,110,70,.13)';g.lineWidth=2;for(let x=40;x<220;x+=9){g.beginPath();g.moveTo(x,60);g.bezierCurveTo(x+6,140,x-6,220,x+3,300);g.stroke();}g.restore();
    g.strokeStyle='#8a6440';g.lineWidth=4;g.stroke();
    g.fillStyle=st.c;g.beginPath();g.moveTo(128,44);g.lineTo(238,100);g.lineTo(238,118);g.lineTo(128,64);g.lineTo(18,118);g.lineTo(18,100);g.closePath();g.fill();
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.moveTo(128,64);g.lineTo(238,118);g.lineTo(238,122);g.lineTo(128,68);g.lineTo(18,122);g.lineTo(18,118);g.closePath();g.fill();
    g.save();g.translate(128,178);drawIcon(g,st.icon,info?92:108,st.c,subject);g.restore();
    const lab=(subject||'').slice(0,4);g.fillStyle='#3a2a20';g.font=`800 ${lab.length>3?26:32}px ${FM}`;g.textAlign='center';g.textBaseline='middle';g.fillText(lab,128,262);}
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return PQT[k]=t;}
const pillarTex=(()=>{const [c,g]=C2(4,256);const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.55,'rgba(255,255,255,.18)');gr.addColorStop(.92,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,.2)');g.fillStyle=gr;g.fillRect(0,0,4,256);return new T.CanvasTexture(c);})();
const PGEO=(()=>{const a=new T.CylinderGeometry(.55,.55,34,24,1,true);a.translate(0,17,0);const b=new T.CylinderGeometry(.14,.14,34,10,1,true);b.translate(0,17,0);const r=new T.RingGeometry(.95,1.18,48);r.rotateX(-PI/2);return {a,b,r};})();
const MARKERS=[];
function addMarker(getPos,getSubj,getState,h=2.9,opts={}){
  const add=m=>new T.MeshBasicMaterial({map:m||null,color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const grp=new T.Group();const pa=add(pillarTex),pb=add(pillarTex),ra=add(),rb=add();
  const A1=new T.Mesh(PGEO.a,pa),A2=new T.Mesh(PGEO.b,pb),R1=new T.Mesh(PGEO.r,ra),R2=new T.Mesh(PGEO.r,rb);[A1,A2,R1,R2].forEach(x=>{x.renderOrder=5;grp.add(x);});R1.position.y=R2.position.y=.07;
  grp.visible=false;scene.add(grp);
  const s=new T.Sprite(new T.SpriteMaterial({map:plaqueTex('','todo'),transparent:true,depthWrite:false,fog:false,toneMapped:false}));s.renderOrder=21;s.visible=false;scene.add(s);
  const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));halo.renderOrder=20;halo.visible=false;scene.add(halo);
  const m={grp,s,halo,pa,pb,ra,rb,R2,getPos,getSubj,getState,h,opts,key:null,ph:rand()*6};MARKERS.push(m);return m;}
function updateMarkers(){for(const m of MARKERS){const p=m.getPos();
  if(!p||!started||CUTON){m.grp.visible=m.s.visible=m.halo.visible=false;continue;}
  const subj=m.getSubj(),st=m.getState(),key=subj+'|'+st;
  if(key!==m.key){m.key=key;m.s.material.map=plaqueTex(subj,st);m.s.material.needsUpdate=true;const c=col(subjStyle(subj).c);[m.pa,m.pb,m.ra,m.rb,m.halo.material].forEach(x=>x.color.copy(c));m.pb.color.lerp(new T.Color(1,1,1),.5);}
  const todo=st==='todo',done=st==='done',ph=m.ph,night=.55+.45*S.lamps;
  const y=p.y+m.h+(done?-.3:Math.sin(time*1.6+ph)*.11);m.s.visible=true;m.s.position.set(p.x,y,p.z);m.s.material.rotation=done?0:Math.sin(time*1.1+ph)*.07;
  const d=camera.position.distanceTo(m.s.position),k=clamp(d/16,1,2.3)*(done?.62:m.opts.info?.8:1);m.s.scale.set(1.18*k,1.52*k,1);
  m.halo.visible=!done;m.halo.position.set(p.x,y-.05,p.z-.01);m.halo.scale.setScalar(2.6*k);m.halo.material.opacity=(m.opts.info?.14:.24+.1*Math.sin(time*2+ph))*night;
  m.grp.visible=todo&&!!m.opts.pillar;if(m.grp.visible){m.grp.position.set(p.x,p.y,p.z);const pu=.75+.25*Math.sin(time*1.8+ph);
    m.pa.opacity=.1*pu*night;m.pb.opacity=.22*pu*night;m.ra.opacity=.55*night;const f=(time*.55+ph)%1;m.R2.scale.setScalar(1+f*1.7);m.rb.opacity=(1-f)*.6*night;}}}


/* ================================================================
   New props: crossing guard, countdown board, time machine
   ================================================================ */
const GUARD={pos:new T.Vector3(6.6,0,-24.4)};
(function(){const g=person({skin:'#e6c4a4',shirt:'#f2c230',bottom:'#3b4a6a',legs:'#3b4a6a',pants:true,shoes:'#2a2522',hair:'#3a2a24',hat:'cap',capCol:'#f2c230'});
  g.g.position.set(6.6,0,-24.4);g.g.rotation.y=-PI/2;g.arms[1].rotation.x=-1.3;scene.add(g.g);
  const fl=new T.Group();fl.position.set(-.16,.58,.2);g.g.add(fl);mk(cy(.012,.012,.7,5),M.white,0,.35,0,fl);
  const f=mk(new T.PlaneGeometry(.34,.24),lam('#e84a2a',{side:T.DoubleSide}),.17,.58,0,fl,false);GUARD.p=g;})();
const BOARD={pos:new T.Vector3(26.2,0,-34.2)};
(function(){const g=new T.Group();g.position.set(27.4,0,-34.4);g.rotation.y=-PI/2;g.userData.dyn=true;scene.add(g);
  [-1,1].forEach(s=>mk(cy(.05,.05,2.2,8),M.metalDark,s*.9,1.1,0,g));mk(bx(2.1,1.35,.08),lam('#2b2f6a'),0,1.75,0,g);
  const [c,x]=C2(512,320);BOARD.canvas=c;BOARD.ctx=x;BOARD.tex=TX(c);
  const m=emMat(BOARD.tex,BOARD.tex,'signs');mk(new T.PlaneGeometry(1.96,1.22),m,0,1.75,.05,g,false);const b=mk(new T.PlaneGeometry(1.96,1.22),m,0,1.75,-.05,g,false);b.rotation.y=PI;
  addCol(27.2,27.6,-35.4,-33.4,2.5);})();
function daysLeft(ds){const d=new Date(ds+'T00:00:00');if(isNaN(d))return null;const n=new Date();n.setHours(0,0,0,0);return Math.round((d-n)/864e5);}
function drawBoard(){const g=BOARD.ctx;g.fillStyle='#f6f2e6';g.fillRect(0,0,512,320);g.fillStyle='#2b2f6a';g.fillRect(0,0,512,70);
  g.fillStyle='#fff';g.font=`800 36px ${FM}`;g.textAlign='left';g.textBaseline='middle';g.fillText('倒數看板',24,36);g.font=`700 18px ${FG}`;g.fillStyle='#e8b33c';g.fillText('COUNTDOWN',200,38);
  const rows=CFG.countdowns.filter(c=>c.name&&c.date).slice(0,4);
  if(!rows.length){g.fillStyle='#6a6458';g.font=`500 24px ${FG}`;g.fillText('（老師還沒設定倒數項目）',24,180);}
  rows.forEach((c,i)=>{const y=110+i*54,d=daysLeft(c.date);g.fillStyle='#1d1b22';g.font=`700 26px ${FG}`;g.textAlign='left';g.fillText(c.name.slice(0,14),24,y);
    g.textAlign='right';g.fillStyle=d!=null&&d<=7?'#c8322b':'#2b2f6a';g.font=`800 34px ${FG}`;g.fillText(d==null?'—':d>0?`${d} 天`:d===0?'今天':'已結束',488,y);
    g.strokeStyle='rgba(0,0,0,.1)';g.beginPath();g.moveTo(24,y+27);g.lineTo(488,y+27);g.stroke();});
  BOARD.tex.needsUpdate=true;}
drawBoard();
const TM={pos:new T.Vector3(12,0,-35.2)};
(function(){const g=new T.Group();g.position.copy(TM.pos);g.userData.dyn=true;scene.add(g);
  mk(cy(1.05,1.2,.3,20),M.metalDark,0,.15,0,g);mk(cy(.9,.9,.1,20),lam('#c9a24a'),0,.35,0,g);
  const gm=new T.MeshLambertMaterial({color:col('#9fd8e8'),transparent:true,opacity:.35,emissive:col('#7fe0ff'),emissiveIntensity:.35});EM.store.push(gm);
  const dome=mk(new T.SphereGeometry(.85,20,14,0,PI*2,0,PI*.62),gm,0,.4,0,g,false);
  const ring=new T.Mesh(new T.TorusGeometry(1.05,.06,8,32),new T.MeshBasicMaterial({color:col('#7fe0ff')}));ring.rotation.x=PI/2;ring.position.y=1.1;g.add(ring);TM.ring=ring;
  mk(bx(.14,1.1,.14),M.metal,1.25,.55,0,g);const [c,x]=C2(128,64);x.fillStyle='#1d1b22';x.fillRect(0,0,128,64);x.fillStyle='#7fe0ff';x.font=`800 26px ${FM}`;x.textAlign='center';x.textBaseline='middle';x.fillText('時光機',64,33);
  const pm=emMat(TX(c),null,'signs');mk(new T.PlaneGeometry(.6,.3),pm,1.25,1.2,.08,g,false);
  addGlow(0,1.1,0,4,'#7fe0ff','always',.35,g);addCol(10.9,13.1,-36.3,-34.1,2);})();

/* ================================================================
   Interactions
   ================================================================ */
const INT=[];
function inter(pos,r,label,act,extra={}){INT.push(Object.assign({pos,r,label,act},extra));}
const buy=(price,fn,why='買東西',cat='零食飲料')=>{if(W.coins<price){say(null,[`金幣不夠喔（需要 ${price}，你有 ${W.coins}）。去答題賺金幣吧！`]);return;}W.coins-=price;led(-price,why,cat);renderPouch();save();fn();dailyEvent('buy');};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// --- stations ---
// each attempt draws a fresh random set from the station's question bank; the stamp needs ALL correct
function askN(st){const n=st.qs.filter(q=>q&&q.q&&Array.isArray(q.o)&&q.o[q.a]).length;const k=+st.ask||Math.min(5,n);return Math.max(1,Math.min(k,n));}
function runStation(st){const sp=SPOTS[st.spot]||{},who=sp.who||st.subject,done=W.st[st.id];
  if(!st.qs.length){say(who,['這一關還沒有題目，請等老師出題。']);return;}
  const n=askN(st),att=(W.att||{})[st.id];
  if(done){choose(who,`你已經拿到「${st.title||st.subject}」的印章了！要再練習一次嗎？每次題目都不一樣。（練習不計分）`,[{label:'再練習一次',fn:()=>quiz(st,true)},{label:'離開',fn:null}]);return;}
  choose(who,(att?`又見面了！上次答對 ${att.last}/${n} 題。這次題目會換，加油！`:(st.intro||`這裡是${st.subject}關卡，準備好了嗎？`))+(isHall(st)?`\n（挑戰館：每次抽 ${n} 題、每題 ${+st.timer||25} 秒，全對拿金章）`:`\n（每次抽 ${n} 題，全部答對才能拿印章）`),[{label:`開始挑戰（${n} 題）Start`,fn:()=>quiz(st,false)},{label:'等一下再來',fn:null}]);}
// ---- typed answers (作答方式：打字作答): no options to guess from — the student types the answer (or taps a radical).
// The correct option is the answer; "/" separates other accepted spellings, e.g. "氵/水" or "Good morning/Good morning!".
// Two tries: a wrong first try gives a hint (first letter + length, or the radical's name), the second shows the answer.
const RAD_EQ={'氵':'水','亻':'人','扌':'手','忄':'心','犭':'犬','礻':'示','衤':'衣','灬':'火','艹':'艸','⺮':'竹','刂':'刀','阝':'阜','辶':'辵','王':'玉','糹':'糸','釒':'金','訁':'言','飠':'食','罒':'网','𧾷':'足','⺼':'肉','爫':'爪','牜':'牛','⺌':'小','攵':'攴','⺗':'心','乚':'乙','丬':'爿','冫':'冰'};
const RAD_PAD=['氵','亻','扌','口','木','艹','言','心','忄','土','日','月','女','金','糸','辶','阝','刂','犭','宀','疒','礻','衤','禾','竹','火','灬','王','石','目','足','車','貝','門','雨','頁','馬','魚','鳥','米','力','又','寸','攵','戈','广','尸','彳','巾','弓','山','人','大','子','囗','冖','厂','田','羊','虫','耳','衣','示','手','水','走','食','雨','隹'];
const RAD_NAME={'氵':'三點水','亻':'單人旁','扌':'提手旁','忄':'豎心旁','犭':'反犬旁','礻':'示字旁','衤':'衣字旁','灬':'四點火','艹':'草字頭','辶':'辵字旁（走馬旁）','阝':'耳朵旁','刂':'立刀旁','宀':'寶蓋頭','疒':'病字旁','糸':'絞絲旁','攵':'反文旁','彳':'雙人旁','广':'廣字頭','冖':'禿寶蓋','囗':'大口框','言':'言字旁','金':'金字旁','竹':'竹字頭','雨':'雨字頭','王':'王字旁','口':'口字旁','木':'木字旁','土':'土字旁','日':'日字旁','月':'月字旁','女':'女字旁','禾':'禾字旁','目':'目字旁','足':'足字旁','車':'車字旁','貝':'貝字旁','門':'門字框','頁':'頁字旁','馬':'馬字旁','魚':'魚字旁','鳥':'鳥字旁','米':'米字旁','石':'石字旁','火':'火字旁','心':'心字底','山':'山字旁','巾':'巾字旁','弓':'弓字旁','虫':'虫字旁','耳':'耳字旁','田':'田字旁','羊':'羊字旁','隹':'隹字旁','食':'食字旁'};
function normAns(t){t=String(t||'').normalize('NFKC').toLowerCase().replace(/['’‘`]/g,'').replace(/[.,!?;:"“”。，！？、；：「」『』（）()\[\]{}\-–—_~]+/g,' ').replace(/\s+/g,' ').trim();
  return [...t].map(ch=>RAD_EQ[ch]||ch).join('');}
// "/" separates accepted answers, except between two digits (so a fraction like 1/2 stays one answer).
function altSplit(t){return String(t||'').split(/(?<!\d)\/|\/(?!\d)|／/).map(x=>x.trim()).filter(Boolean);}
function ansList(q){return altSplit(q.o[q.a]);}
function optText(t){return altSplit(t)[0]||'';}
function isRadQ(q,st){const a=ansList(q)[0]||'';return /部首/.test((st&&(st.subject+st.title))||'')||/部首/.test(q.q)||([...a].length===1&&(RAD_PAD.includes(a)||RAD_EQ[a]!=null));}
// which questions are typed: every 部首 question, every question marked t:'type', and — in a station set to 打字作答 —
// every question whose answer is short enough to type on a tablet (≤3 English words or ≤6 characters); longer ones stay multiple choice.
function typedQ(q,st){if(q.t==='choice')return false;if(q.t==='type'||/部首/.test(q.q))return true;if(st.mode!=='type')return false;
  const a=ansList(q)[0]||'';return /[a-z]/i.test(a)?a.trim().split(/\s+/).length<=3:[...a.replace(/\s/g,'')].length<=6;}
function closeTypeQ(){const d=document.getElementById('typeq');if(d)d.hidden=true;}
function typeAsk(title,q,st,done){let d=document.getElementById('typeq');
  if(!d){d=document.createElement('div');d.id='typeq';d.innerHTML='<div class="tq-in"><div class="tq-t"></div><div class="tq-q"></div><div class="tq-row"><input class="tq-inp" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn primary tq-go">送出</button></div><div class="tq-msg"></div><div class="tq-pad" hidden></div><div class="tq-ft"><button type="button" class="btn small tq-kb">用鍵盤打</button><button type="button" class="btn small tq-clr">清除</button></div></div>';document.body.appendChild(d);
    d.addEventListener('keydown',e=>e.stopPropagation());}
  const inp=d.querySelector('.tq-inp'),msg=d.querySelector('.tq-msg'),pad=d.querySelector('.tq-pad'),go=d.querySelector('.tq-go'),kb=d.querySelector('.tq-kb'),clr=d.querySelector('.tq-clr');
  const rad=isRadQ(q,st),acc=ansList(q),A=acc.map(normAns);let tries=0,closed=false;
  d.querySelector('.tq-t').textContent=title;
  const qt=d.querySelector('.tq-q');qt.textContent='';String(q.q).split(/_{2,}|＿{2,}/).forEach((part,k,arr)=>{qt.appendChild(document.createTextNode(part));if(k<arr.length-1){const b=document.createElement('span');b.className='tq-blank';b.textContent='？';qt.appendChild(b);}});
  inp.value='';msg.textContent=rad?'點下面的部首，或用鍵盤打出來。':'把答案打進框框裡，再按「送出」。';msg.className='tq-msg';
  pad.hidden=!rad;kb.hidden=!rad;clr.hidden=!rad;inp.readOnly=rad&&IS_TOUCH;inp.placeholder=rad?'部首':'在這裡打字';inp.lang=/[a-z]/i.test(acc[0]||'')?'en':'zh-Hant';
  if(rad){pad.innerHTML='';RAD_PAD.filter((r,i,a)=>a.indexOf(r)===i).forEach(r=>{const b=document.createElement('button');b.type='button';b.className='tq-k';b.textContent=r;b.title=RAD_NAME[r]||r;b.onclick=()=>{inp.value=r;SND.pick();};pad.appendChild(b);});}
  kb.onclick=()=>{inp.readOnly=false;inp.focus();};clr.onclick=()=>{inp.value='';};
  const finish=ok=>{if(closed)return;closed=true;d.hidden=true;done(ok);};
  const submit=()=>{const v=normAns(inp.value);if(!v){msg.textContent='還沒有填答案喔！';return;}
    if(A.includes(v)){finish(true);return;}
    tries++;if(tries>=2){finish(false);return;}
    SND.wrong&&SND.wrong();const a0=acc[0];const hint=rad?(RAD_NAME[a0]?`提示：這個部首叫「${RAD_NAME[a0]}」。`:`提示：再看看字的${'左邊、上面或外框'}。`):(/[a-z]/i.test(a0)?`提示：第一個字母是「${a0.trim()[0]}」，一共 ${a0.replace(/[^a-z]/gi,'').length} 個字母。`:`提示：答案有 ${[...a0.replace(/\s/g,'')].length} 個字，第一個字是「${[...a0][0]}」。`);
    msg.textContent='差一點！再試一次。'+hint;msg.className='tq-msg bad';if(!rad||!inp.readOnly)inp.select();};
  go.onclick=submit;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit();}};
  d.hidden=false;if(!inp.readOnly)setTimeout(()=>inp.focus({preventScroll:true}),80);}
function drawQs(key,pool,n){W.seenQ=W.seenQ||{};const seen=Array.isArray(W.seenQ[key])?W.seenQ[key]:[];const fresh=shuffle(pool.filter(q=>!seen.includes(q.q)));
  const old=pool.filter(q=>seen.includes(q.q)).sort((a,b)=>seen.indexOf(a.q)-seen.indexOf(b.q));const qs=shuffle([...fresh,...old].slice(0,n));
  W.seenQ[key]=[...seen.filter(t=>!qs.some(q=>q.q===t)),...qs.map(q=>q.q)].slice(-Math.max(n,pool.length-1));return qs;}
function wbKey(sid,q){return sid+'|'+String(q&&q.q||'').slice(0,80);}
function wbAdd(st,q){if(!st||!q||!W.seat)return;W.wrong=Array.isArray(W.wrong)?W.wrong:[];const k=wbKey(st.id,q);const e=W.wrong.find(x=>x.k===k);if(e){e.n=(e.n||1)+1;e.t=Date.now();}else W.wrong.push({k,sid:st.id,q:String(q.q),t:Date.now(),n:1});if(W.wrong.length>60)W.wrong.splice(0,W.wrong.length-60);}
function wbFix(st,q){if(!Array.isArray(W.wrong)||!st||!q)return false;const k=wbKey(st.id,q),i=W.wrong.findIndex(x=>x.k===k);if(i<0)return false;W.wrong.splice(i,1);return true;}
function wbFind(e){const st=CFG.stations.find(x=>x.id===e.sid);const q=st&&st.qs.find(x=>x&&String(x.q).slice(0,80)===String(e.q).slice(0,80));return q?{st,q}:null;}
function openWrongBook(){const L=(Array.isArray(W.wrong)?W.wrong:[]).filter(e=>wbFind(e));msgOpen('錯題本','答錯過的題目',B=>{
  if(!L.length){B.appendChild(el('p',{class:'dc-hint',text:'目前沒有錯題。答錯的題目會自動收進這裡，之後答對就會消失。'}));return;}
  B.appendChild(el('p',{class:'help',text:`共 ${L.length} 題。在這裡練習答對，或闖關時再遇到並答對，就會從錯題本拿掉。`}));
  B.appendChild(el('button',{type:'button',class:'btn primary',text:`🔁 練習錯題（${Math.min(5,L.length)} 題）`,onclick:()=>{$('msgp').hidden=true;wbPractice();}}));
  L.slice().reverse().forEach(e=>{const {st,q}=wbFind(e);B.appendChild(el('div',{class:'nb-card'},[el('div',{class:'nb-meta',text:`${st.subject}${st.title?'・'+st.title:''}　答錯 ${e.n||1} 次`}),el('p',{text:q.q}),el('p',{class:'help',text:`正確答案：${ansList(q)[0]}${q.e?'　'+q.e:''}`})]));});});}
function wbPractice(){const L=(Array.isArray(W.wrong)?W.wrong:[]).filter(e=>wbFind(e)).slice(0,5);let i=0,ok=0;
  const next=()=>{if(i>=L.length){save();say('錯題練習',[`這次答對 ${ok}/${L.length} 題。`+(ok?'答對的題目已經從錯題本拿掉了！':'沒關係，看看解說，下次再練習。')],{noWave:1});return;}
    const {st,q}=wbFind(L[i]),title=`錯題練習　第 ${i+1} / ${L.length} 題`;const fin=good=>{i++;if(good){ok++;wbFix(st,q);SND.pick();say('答對了！',[q.e||'太棒了！'],{onEnd:next,noWave:1});}else{SND.wrong();wbAdd(st,q);say('再想想…',[`正確答案是「${ansList(q)[0]}」。${q.e?' '+q.e:''}`],{onEnd:next,noWave:1});}};
    if(typedQ(q,st))typeAsk(title,q,st,fin);else{const opts=shuffle(q.o.map((t,k)=>({t:optText(t),k})).filter(o=>o.t));choose(title,q.q,opts.map(o=>({label:o.t,fn:()=>fin(o.k===+q.a)})),{quiz:true});}};
  if(!L.length){say(null,['目前沒有錯題。']);return;}next();}
function quiz(st,practice){const pool=st.qs.filter(q=>q&&q.q&&Array.isArray(q.o)&&q.o[q.a]);const qs=drawQs(st.id,pool,askN(st));let i=0,c=0;const tag=`${st.subject}｜${st.title||''}`;
  const next=()=>{if(i>=qs.length){finish();return;}const q=qs[i];const opts=shuffle(q.o.map((t,k)=>({t:optText(t),k})).filter(o=>o.t));
    if(typedQ(q,st))typeAsk(`${tag}　第 ${i+1} / ${qs.length} 題`,q,st,ok=>answer(ok,q));
    else choose(`${tag}　第 ${i+1} / ${qs.length} 題`,q.q,opts.map(o=>({label:o.t,fn:()=>answer(o.k===+q.a,q)})),{quiz:true});
    if(isHall(st))startQTimer(+st.timer||25,()=>{closeDlg();closeTypeQ();SND.wrong();wbAdd(st,q);i++;say('時間到！',[`正確答案是「${ansList(q)[0]}」。${q.e?' '+q.e:''}`],{onEnd:next});});};
  const answer=(ok,q)=>{stopQTimer();i++;if(ok)wbFix(st,q);else wbAdd(st,q);if(ok){c++;SND.pick();petEvent('ok');say('答對了！ Correct!',[q.e||'太棒了！'],{onEnd:next,noWave:1});setTimeout(()=>actPlay('laugh'),60);}
    else{SND.wrong();setTimeout(()=>actPlay('i.shake'),60);say('再想想… Not quite',[`正確答案是「${ansList(q)[0]}」。${q.e?' '+q.e:''}`],{onEnd:next});}};
  const finish=()=>{const t=qs.length,all=c===t;dailyEvent('quiz');if(all)dailyEvent('pass');
    if(practice){say('練習結束',[`這次答對 ${c}/${t} 題。`]);return;}
    W.att=W.att||{};const a=W.att[st.id]||{n:0,best:0};a.n++;a.last=c;a.best=Math.max(a.best,c);W.att[st.id]=a;
    if(all){const gold=isHall(st),coins=t*CFG.coinsPerCorrect*(gold?2:1);W.coins+=coins;led(coins,`${gold?'金章':'印章'}：${st.subject}`,'闖關');histAdd(gold?'gold':'stamp',`${gold?'金章':'印章'}：${st.subject}${st.title?`〈${st.title}〉`:''}（第 ${a.n} 次挑戰全對）`);W.st[st.id]={c,t,at:Date.now(),tries:a.n};save();renderPouch();SND.stamp();toast(gold?`獲得金章：${st.title||st.subject}`:`獲得印章：${st.subject}`);petEvent('stamp');setTimeout(()=>actPlay('i.cheer_front',{dur:2}),80);
      if(gold){say('金章到手！',[`${t} 題全對，獲得「${st.title||st.subject}」金色印章和 ${coins} 金幣！`+(a.n>1?`（第 ${a.n} 次挑戰成功！）`:'')]);return;}
      say('全部答對！',[`${t} 題全對，獲得「${st.subject}」印章和 ${coins} 金幣！`+(a.n>1?`（第 ${a.n} 次挑戰成功，不放棄真棒！）`:'')]);}
    else{save();setTimeout(()=>actPlay('i.sad_front',{dur:1.8}),80);say('差一點點！',[`這次答對 ${c}/${t} 題。全部答對才能拿印章喔。`,'看看剛剛的解說，再挑戰一次吧！下次的題目會不一樣。'],{choices:[{label:'馬上再挑戰',fn:()=>quiz(st,false)},{label:'先去別的地方',fn:null}]});}};
  if(!qs.length){say(null,['這一關的題目還沒設定完成。']);return;}next();}
const FLAVOR={
  books:()=>say('汐見書店',['櫥窗裡有褪色的小說，玻璃上貼著十月的潮汐表。']),
  cafe:()=>say('喫茶 しおさい',['Coffee 450 · Cream soda 550。老闆在窗邊的位子睡著了，臉上蓋著報紙。']),
  diner:()=>say('うみねこ食堂',['今日定食：烤鯖魚。門簾後面的收音機正在放老歌。']),
  candy:()=>choose('駄菓子屋','一整排十元零食。阿嬤正在寫填字遊戲。',[{label:'買一包零食（10 金幣）',fn:()=>buy(10,()=>{addItem('零食');say(null,['阿嬤頭也不抬地收下金幣：「別掉屑屑喔。」']);},'柑仔店零食')},{label:'只是看看',fn:null}]),
  barber:()=>say('理容なみ',['理髮店的三色燈打烊後還在轉，沒人知道開關在哪裡。']),
  fish:()=>say('鮮魚たけうち',['鐵捲門上貼著紙條：「今天公休，明天早上七點見（看海的心情）。」']),
  bath:()=>say('松の湯',['公共澡堂，門口飄出熱氣。櫃台阿姨在看棒球轉播。']),
  shop:()=>say('やまもと',['櫃台上的招財貓一直在招手。']),
  bus:()=>say('村田爺爺',[pick(['我每天都坐在這裡看海，看了四十年。','平交道的鈴聲，我聽了一輩子。','去防波堤跟健叔打招呼吧，他從來沒釣到魚。'])]),
  pier:()=>say('健叔',[pick(['剛剛還有竹莢魚上鉤……剛剛。','小心消波塊，裡面住著貓。別問我為什麼。','看到海上那片白光嗎？那是捕魷魚的船。'])]),
  shrine:()=>choose('山上的神社','香油錢箱有老杉木的味道，一條粗繩掛著鈴鐺。',[{label:'搖鈴許願（5 金幣）',fn:()=>buy(5,()=>{SND.suzu();setTimeout(()=>say(null,['鞠躬兩次、拍手兩次，你許了一個安靜的願望。']),2300);},'神社香油錢','其他')},{label:'抽籤（10 金幣）',fn:()=>buy(10,()=>{addItem('籤詩');say('抽籤',[pick(['大吉：你等待的事，會搭傍晚的火車來。','中吉：弄丟的東西，會在水邊找回來。','小吉：下一個小小的邀請，答應它。','吉：今天走遠一點的路回家。','末吉：種子已經種下了，耐心等。'])]);},'抽籤','其他')},{label:'安靜離開',fn:null}]),
  tree:()=>say('大樟樹',['比小鎮還老的樟樹。風吹過葉子的聲音，像海浪一樣。']),
  ema:()=>say('許願牌',[pick(['「希望阿嬤的膝蓋在秋祭前好起來。」','「希望有一天能在防波堤看到綠閃光。」','「希望貓咪都胖胖的。」—健叔'])]),
  light:()=>say('汐見港東防波堤燈塔',['1961 年開始發光。每 4 秒閃一次紅光。']),
  phone:()=>{SND.dial();say('公共電話',['綠色公共電話還收十元硬幣。你拿起話筒，聽到長長的嘟聲，然後輕輕掛上。']);},
  post:()=>say('郵筒',['紅色郵筒。收信時間：10:30、15:00。'])};
/* ================================================================
   挑戰館 (Challenge Hall) — dojo on the shrine hill; harder questions, timer, gold stamps
   ================================================================ */
const CHX=-40,CHZ=330;var CH_IN=false;
const CH={door:new T.Vector3(-40.6,4,60),out:new T.Vector3(-42.2,4,60)};
function isHall(st){return /^hall/.test(st.spot||'');}
function goldList(){return CFG.stations.filter(isHall);}
// ---- exterior on the shrine plateau
(function(){const g=new T.Group();g.position.set(-37.6,4,60);g.rotation.y=-PI/2;scene.add(g);
  const wood=lam('#5a3a28'),plaster=lam('#e8dcc4'),roof=lam('#ffffff',{map:roofTex('#3d4553'),side:T.DoubleSide});
  mk(bx(5.6,.4,4.4),M.stone,0,.2,0,g);mk(bx(5,2.8,3.8),plaster,0,1.8,0,g);
  [-2.45,2.45].forEach(x=>mk(bx(.22,2.9,.22),wood,x,1.85,1.95,g));mk(bx(5.2,.22,.22),wood,0,3.2,1.95,g);mk(bx(5.2,.18,.22),wood,0,1.0,1.95,g);
  mk(bx(1.4,2.1,.08),lam('#3a2418'),0,1.45,1.93,g);
  const rg=new T.Group();rg.position.y=3.2;g.add(rg);mk(triGeo([...quad([-3.4,0,2.8],[3.4,0,2.8],[3.4,1.6,0],[-3.4,1.6,0]),...quad([3.4,0,-2.8],[-3.4,0,-2.8],[-3.4,1.6,0],[3.4,1.6,0])],new T.Vector3(0,-2,0)),roof,0,0,0,rg);
  const [c,x]=C2(96,256);x.fillStyle='#1a1410';x.fillRect(0,0,96,256);x.strokeStyle='#c9a45a';x.lineWidth=4;x.strokeRect(6,6,84,244);vtext(x,'挑戰館',48,58,56,FM,'#e8cf8a');
  mk(new T.PlaneGeometry(.42,1.1),new T.MeshBasicMaterial({map:TX(c)}),1.6,2.05,1.97,g,false);
  [-1,1].forEach(s=>{const lm=new T.MeshLambertMaterial({color:col('#f4ecdc'),emissive:col('#ffcf8a'),emissiveIntensity:1});EM.lamps.push(lm);const l=mk(sph(.22,12,10),lm,s*1.05,2.75,2.2,g);l.scale.y=1.3;addGlow(s*1.05,2.75,2.3,1.4,'#ffcf8a','lamp',.8,g);});
  addCol(-40.1,-35.2,57.5,62.5,6);})();
addMarker(()=>CH.door,()=>'挑戰館',()=>{const G=goldList();return G.length&&G.every(s=>W.st[s.id])?'done':'info';},3.4,{info:true});
inter(CH.door,1.8,'走進挑戰館',()=>enterHall());
// ---- interior
const HALL_PED=[[-3,-2],[-1,-2.6],[1,-2.6],[3,-2]];
(function(){const G=new T.Group();G.position.set(CHX,0,CHZ);scene.add(G);const RW=10,RD=8,RH=3.6;CH.g=G;
  const [fc,fg]=C2(256,256);fg.fillStyle='#8a6a4c';fg.fillRect(0,0,256,256);for(let y=0;y<256;y+=32){fg.fillStyle='rgba(40,25,15,.25)';fg.fillRect(0,y+31,256,1);for(let x=(y/32%2)*64;x<256;x+=128){fg.fillRect(x,y,1,32);}}speckle(fg,256,256,3000,.06);
  const ft=TX(fc,true);const fgeo=new T.PlaneGeometry(RW,RD+3);fgeo.rotateX(-PI/2);const uv=fgeo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*RW/2.4,uv.getY(i)*(RD+3)/2.4);
  mk(fgeo,new T.MeshLambertMaterial({map:ft,emissive:0xffffff,emissiveMap:ft,emissiveIntensity:.08}),0,0,1.5,G,false);
  const wm=lam('#d9ccb2'),dark=lam('#4a3222');
  const wall=(w,h,x,y,z,ry)=>{const m=mk(new T.PlaneGeometry(w,h),wm,x,y,z,G,false);m.rotation.y=ry;};
  wall(RW,RH,0,RH/2,-RD/2,0);wall(RD+3,RH,-RW/2,RH/2,1.5,PI/2);wall(RD+3,RH,RW/2,RH/2,1.5,-PI/2);
  const cg=new T.PlaneGeometry(RW,RD+3);cg.rotateX(PI/2);mk(cg,lam('#6e5238'),0,RH,1.5,G,false);
  for(let x=-RW/2;x<=RW/2+.01;x+=RW/5)mk(bx(.22,RH,.22),dark,x,RH/2,-RD/2+.1,G,false);mk(bx(RW,.25,.25),dark,0,RH-.12,-RD/2+.12,G,false);mk(bx(RW,.3,.1),dark,0,.15,-RD/2+.05,G,false);
  // scrolls
  [['心','#1a1410'],['學','#1a1410'],['勇','#8a2a1a']].forEach(([ch,colr],i)=>{const [c,x]=C2(96,256);x.fillStyle='#efe6d0';x.fillRect(0,0,96,256);x.fillStyle='#b8452f';x.fillRect(0,0,96,14);x.fillRect(0,242,96,14);vtext(x,ch,48,120,76,FM,colr);
    mk(new T.PlaneGeometry(.7,1.9),new T.MeshLambertMaterial({map:TX(c),emissive:0xffffff,emissiveMap:TX(c),emissiveIntensity:.25}),-2+i*2,2.1,-RD/2+.03,G,false);});
  // pedestals with glowing scrolls
  HALL_PED.forEach(([x,z],i)=>{mk(bx(.9,.8,.6),dark,x,.4,z,G);const sm=new T.MeshLambertMaterial({color:col('#f4e6c0'),emissive:col('#ffcf7a'),emissiveIntensity:.6});
    const sc=mk(cy(.09,.09,.7,10),sm,x,.9,z,G);sc.rotation.z=PI/2;addGlow(x,1.0,z,1.5,'#ffcf7a','lamp',.8,G);addCol(CHX+x-.45,CHX+x+.45,CHZ+z-.3,CHZ+z+.3,2);});
  // taiko drum & lanterns
  const tk_=mk(cy(.55,.55,.7,20),lam('#8a3a22'),-4,.75,-3.2,G);tk_.rotation.x=PI/2;mk(cy(.5,.5,.72,20),lam('#e8dcc4'),-4,.75,-3.2,G,false).rotation.x=PI/2;
  {const L=new T.PointLight(0xffd0a0,1.3,16,1.4);L.position.set(0,3,0);G.add(L);}
  const [dc,dg]=C2(128,64);dg.fillStyle='#4a3222';dg.fillRect(0,0,128,64);dg.fillStyle='#f3ead9';dg.font=`700 22px ${FG}`;dg.textAlign='center';dg.textBaseline='middle';dg.fillText('出口 ↓',64,33);
  const dm=mk(new T.PlaneGeometry(1.2,.6),new T.MeshBasicMaterial({map:TX(dc)}),0,.012,RD/2-.5,G,false);dm.rotation.x=-PI/2;
  addCol(CHX-RW/2-.3,CHX-RW/2,CHZ-RD/2,CHZ+RD/2,4);addCol(CHX+RW/2,CHX+RW/2+.3,CHZ-RD/2,CHZ+RD/2,4);addCol(CHX-RW/2,CHX+RW/2,CHZ-RD/2-.3,CHZ-RD/2,4);addCol(CHX-RW/2,CHX+RW/2,CHZ+RD/2,CHZ+RD/2+.3,4);
  inter(new T.Vector3(CHX,0,CHZ+RD/2-.6),1.4,'離開挑戰館',()=>exitHall());
  inter(new T.Vector3(CHX-4,0,CHZ-2.4),1.4,'敲太鼓',()=>{if(A.ready){const t=A.ctx.currentTime;nburst(t,.3,'lowpass',180,1,.9,A.sfx);tone(70,t,.5,'sine',.5,A.sfx);}toast('咚——！');});
  inter(new T.Vector3(CHX,0,CHZ+1),1.2,'看館長的留言',()=>{const G_=goldList(),n=G_.filter(s=>W.st[s.id]).length;say('挑戰館',['這裡的題目比較難，每題有時間限制。','全部答對就能拿到「金色印章」。',`你目前拿到 ${n} / ${G_.length} 個金章。`]);});})();
Object.assign(SPOTS,{hall1:{name:'挑戰館・第一卷軸',who:'第一卷軸',pos:new T.Vector3(CHX+HALL_PED[0][0],0,CHZ+HALL_PED[0][1]+.8),r:1.3},
  hall2:{name:'挑戰館・第二卷軸',who:'第二卷軸',pos:new T.Vector3(CHX+HALL_PED[1][0],0,CHZ+HALL_PED[1][1]+.8),r:1.3},
  hall3:{name:'挑戰館・第三卷軸',who:'第三卷軸',pos:new T.Vector3(CHX+HALL_PED[2][0],0,CHZ+HALL_PED[2][1]+.8),r:1.3},
  hall4:{name:'挑戰館・第四卷軸',who:'第四卷軸',pos:new T.Vector3(CHX+HALL_PED[3][0],0,CHZ+HALL_PED[3][1]+.8),r:1.3}});
function enterHall(){fadeTo(()=>{INDOOR=true;CH_IN=true;P.sit=null;P.pos.set(CHX,0,CHZ+2.6);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.3;cam.pos.set(CHX,3,CHZ+6);cam.look.set(CHX,1,CHZ);SND.chime&&SND.chime();curArea=null;areaCoolReset();
  if(PETOBJ){PETOBJ.g.position.set(CHX+1.2,0,CHZ+2.8);PETOBJ.by=0;}});}
function exitHall(){fadeTo(()=>{INDOOR=false;CH_IN=false;P.pos.copy(CH.out);P.vel.set(0,0,0);P.yaw=-PI/2;cam.yaw=PI/2;cam.pitch=.22;cam.pos.set(CH.out.x+5,6.5,CH.out.z);cam.look.set(CH.out.x,5.2,CH.out.z);curArea=null;areaCoolReset();
  if(PETOBJ){PETOBJ.g.position.set(CH.out.x-1,4,CH.out.z+.5);PETOBJ.by=4;}SND.chime&&SND.chime();});}
function areaCoolReset(){areaCool=0;}
// ---- per-question timer overlay
const QT_T={id:0};
function startQTimer(sec,onOut){stopQTimer();const el_=$('qTimer');el_.hidden=false;const t0=performance.now();const id=++QT_T.id;
  const tick=()=>{if(QT_T.id!==id)return;const left=Math.max(0,sec-(performance.now()-t0)/1000);el_.querySelector('b').textContent=Math.ceil(left);el_.querySelector('i').style.width=(left/sec*100)+'%';el_.classList.toggle('low',left<6);
    if(left<=0){stopQTimer();onOut();return;}requestAnimationFrame(tick);};tick();}
function stopQTimer(){QT_T.id++;const e=$('qTimer');if(e)e.hidden=true;}

Object.entries(SPOTS).forEach(([key,sp])=>{
  const st=()=>CFG.stations.find(s=>s.spot===key);
  inter(sp.pos,sp.r,()=>{const s=st();return s?`${s.subject}關卡：${s.title||sp.name}`:({bus:'和村田爺爺聊天',pier:'和健叔聊天',shrine:'站在神社前',light:'看燈塔的牌子',phone:'拿起公共電話',post:'看看郵筒',tree:'抬頭看大樟樹',ema:'看許願牌'}[key]||`看看${sp.name}`);},
    ()=>{const s=st();dailyEvent('talk');if(s)runStation(s);else FLAVOR[key]&&FLAVOR[key]();});
  addMarker(()=>st()?sp.pos:null,()=>{const s=st();return s?(s.subject||'關卡'):'';},()=>{const s=st();return s&&W.st[s.id]?'done':'todo';},key==='bus'?2.7:key==='pier'?3.0:3.2,{pillar:true});});
// --- rewards: vending & konbini ---
const DRINK_ZH={a:[['麥茶','一罐冰麥茶掉下來，冰得手都濕了。'],['彈珠汽水','一瓶彈珠汽水，搖一搖玻璃珠會叮叮響。'],['可爾必思汽水','酸酸甜甜，像整個夏天一次喝下去。']],
  b:[['熱玉米濃湯','熱熱的玉米濃湯。最後幾顆玉米永遠倒不出來。'],['熱奶茶','溫暖的奶茶，要用兩隻手捧著。'],['熱可可','熱可可，喝完嘴巴旁邊有一圈咖啡色。']],
  c:[['哈密瓜汽水','綠得不可思議的哈密瓜汽水。'],['礦泉水','冰涼的白開水，最解渴。'],['運動飲料','喝完覺得可以一路跑到燈塔。']],
  d:[['綠茶','冰綠茶，有一點點苦。'],['烏龍茶','清爽的烏龍茶。'],['柳橙汁','一罐柳橙汁，酸得眼睛瞇起來。']]};
VENDS.forEach(v=>inter(v.pos,1.5,'用自動販賣機（獎勵）',()=>{const set=DRINK_ZH[v.set]||DRINK_ZH.a;
  choose('自動販賣機',v.set==='b'?`紅色標籤是「あったか〜い」熱飲。你有 ${W.coins} 金幣。`:`藍色標籤是「つめた〜い」冰飲。你有 ${W.coins} 金幣。`,[...set.map(([n,l])=>({label:`${n}　20 金幣`,fn:()=>buy(20,()=>{addItem(n);SND.vend(v.pos);setTimeout(()=>say(null,[`喀咚！${l}`]),900);},`販賣機：${n}`)})),{label:'不用了',fn:null}]);}));
inter(KONBINI.door,2.4,'走進便利商店',()=>enterMart());
inter(new T.Vector3(38,.9,-34.1),1.8,'看車站站牌',()=>{let eta;
  if(TRAIN.state==='stop')eta='火車正停在月台，車門開著。';else if(TRAIN.state==='run'){const d=Math.abs(TRAIN.x-48);eta=`下一班車大約 ${Math.max(5,Math.round(d/9))} 秒後到站，注意聽平交道的鈴聲。`;}else eta='下一班車再一兩分鐘就會從隧道出來。';
  say('汐見駅 · Shiomi Station',['無人車站。刷卡請到綠色的柱子。',eta]);});
inter(BOARD.pos,2,'看倒數看板',()=>{const rows=CFG.countdowns.filter(c=>c.name&&c.date);const lines=rows.length?rows.map(c=>{const d=daysLeft(c.date);return `${c.name}：${d==null?'日期未設定':d>0?`還有 ${d} 天（${c.date.slice(5).replace('-','/')}）`:d===0?'就是今天！':`已經過了 ${-d} 天`}`;}).join('\n'):'老師還沒設定倒數項目。';
  const all=allStamps();say('倒數看板 Countdown',[lines,`你的闖關進度：${all.filter(s=>stampDone(s.id)).length} / ${all.length} 個印章。`]);});
inter(TM.pos,2.2,'查看時光機',()=>say('時光機 Time Machine',['面板上寫著：「目的地——部落地圖」。','……還在建造中。等新地圖完成，就可以出發了！']));
function sitAt(pos,face){P.sit={pos:pos.clone(),face};P.pos.copy(pos);dailyEvent('sit');}
inter(new T.Vector3(46,.9,-34.4),1.4,'坐在長椅上等車',()=>sitAt(new T.Vector3(46,.92,-35),0),{sit:true});
inter(new T.Vector3(-15,0,-42.9),1.6,'坐在堤防上看海',()=>sitAt(new T.Vector3(-15,.52,-44.05),PI),{sit:true});
// --- crossing safety mission ---
const MISSION={active:false,viol:0};
inter(GUARD.pos,2.4,()=>W.safety?'和導護阿姨說話':'安全任務：導護阿姨',()=>{dailyEvent('talk');
  if(W.safety){say('導護阿姨',['你已經學會安全過平交道了！每天上下學也要記得喔。']);return;}
  if(MISSION.active){say('導護阿姨',['記得：鈴聲響、紅燈閃、柵欄放下時，一定要在外面等。安全走到對面的海岸通路就完成了！']);return;}
  choose('導護阿姨','要去海邊，一定要經過前面的平交道。你知道怎麼安全通過嗎？',[{label:'接受任務：安全通過平交道',fn:()=>{MISSION.active=true;MISSION.viol=0;
    say('導護阿姨',['規則一：聽到「噹噹噹」、看到紅燈閃，就不能進去。','規則二：柵欄放下時要在外面等，絕對不能鑽過去。','規則三：火車過了、柵欄升起來，左右看一看再走。','走到對面的海岸通路，就算完成任務！']);}},{label:'等一下',fn:null}]);});
addMarker(()=>GUARD.pos,()=>'安全',()=>W.safety?'done':'todo',2.5,{pillar:true});
addMarker(()=>BOARD.pos,()=>'倒數',()=>'info',2.9,{info:true});
addMarker(()=>TM.pos,()=>'時光機',()=>'info',2.7,{info:true});
function questTick(dt){if(!started)return;W.time+=dt;playTick(dt);petTick(dt);acTick(dt);
  if(MISSION.active&&!W.safety){const inX=Math.abs(P.pos.x)<4.8,inZ=P.pos.z>-32.4&&P.pos.z<-27.6;
    if(inX&&inZ&&(xingActive||gateK>.05)){MISSION.viol++;P.pos.set(0,0,-24.2);P.vel.set(0,0,0);SND.wrong();say('導護阿姨',['危險！警報響的時候不能進入平交道。','回到這裡，等火車過了、柵欄升起來再走一次。']);}
    else if(P.pos.z<-34.5&&Math.abs(P.pos.x)<40){W.safety={pass:true,viol:MISSION.viol};histAdd('stamp','印章：安全過平交道');MISSION.active=false;W.coins+=20;led(20,'印章：安全過平交道','闖關');save();renderPouch();SND.stamp();toast('獲得印章：安全');petEvent('stamp');
      say('導護阿姨',[MISSION.viol?`完成了！剛剛有 ${MISSION.viol} 次太急，下次要記得等喔。+20 金幣`:'做得好！你安全通過平交道了。+20 金幣']);}}}
// --- cats ---
['小玉','墨墨','橘子','海苔'].forEach((n,i)=>{if(CATS[i])CATS[i].name=n;});
CATS.forEach(c=>{c.origName=c.name;inter(c.g.position,1.4,()=>c.isPet?`和${c.name}互動`:`摸摸${c.name}`,()=>{if(!c.isPet)dailyEvent('catpet');
  if(c.isPet){openPetMenu();return;}
  SND.meow(c.g.position);heart(c.g.position);
  if(W.items['小魚乾']){addItem('小魚乾',-1);W.catFriend=W.catFriend||{};const f=(W.catFriend[c.name]||0)+1;W.catFriend[c.name]=f;save();
    if(W.pet){c.follow=60;c.state='follow';say(null,[`${c.name}吃得好開心！不過你已經有${W.pet.name}了，要好好照顧牠喔。`]);return;}
    if(f>=3){choose(null,`${c.name}吃完小魚乾，一直蹭你的腳，好像想跟你回家。`,[{label:`讓${c.name}成為我的寵物`,fn:()=>askName(c.name,n=>adoptCat(c,n))},{label:'再想想',fn:null}]);return;}
    c.follow=90;c.state='follow';say(null,[`你拿出一條小魚乾。${c.name}吃完決定跟著你走一會兒。（好感 ${f}/3）`]);return;}
  setTimeout(()=>SND.purr(c.g.position),500);
  say(null,[pick([`${c.name}蹭了蹭你的手，發出呼嚕聲。`,`${c.name}讓你摸了三下，然後轉頭看海。`,`${c.name}翻肚了。這是陷阱，但你還是摸了。`,`${c.name}：「喵～」（貓叫聲的英文是 meow。）`])+(!W.pet&&rand()<.5?'（聽說餵貓咪三次小魚乾，牠就會想跟你回家。）':'')]);},{cat:c});});
// --- sea glass with English words ---
function refreshGlass(){GLASS.forEach((g,i)=>{const got=W.glass.includes(i);g.got=got;g.m.visible=!got;g.s.visible=!got;});}
GLASS.forEach((g,idx)=>inter(new T.Vector3(g.x,beachH(g.z),g.z),1.3,'撿起海玻璃',()=>{if(W.glass.includes(idx))return;if(actHas('i.pickup')){actPlay('i.pickup',{lock:true,yaw:faceTo(g.x,g.z)});}W.glass.push(idx);refreshGlass();W.coins+=5;led(5,'撿到海玻璃','探險');save();renderPouch();SND.pick();
  const w=CFG.words[idx]||{en:'sea',zh:'海'};const lines=[`海玻璃上刻著一個英文單字：「${w.en}」`,`意思是「${w.zh}」。唸唸看：${w.en}！　+5 金幣（${W.glass.length}/5）`];
  if(W.glass.length>=5){lines.push('五片都找到了！它們在口袋裡叮叮響，像小小的風鈴。獲得「海灘英文單字」印章！');SND.stamp();toast('獲得印章：海灘英文單字');petEvent('stamp');}
  say('海玻璃 Sea glass',lines);},{glass:g}));
const HEARTS=[];
const heartTex=(()=>{const [c,g]=C2(64,64);g.fillStyle='#ff8fa0';g.font=`48px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('♡',32,34);return new T.CanvasTexture(c);})();
function heart(p){const s=new T.Sprite(new T.SpriteMaterial({map:heartTex,transparent:true,depthWrite:false}));s.position.copy(p).add(new T.Vector3(0,.8,0));s.scale.set(.4,.4,1);scene.add(s);HEARTS.push({s,t:0});}

/* ================================================================
   Stamp card & submission
   ================================================================ */
function parseForm(link){if(!link)return null;const m=String(link).trim().match(/^(https:\/\/docs\.google\.com\/forms\/[^?#]+)/);if(!m)return null;
  const base=m[1].replace(/\/(edit|prefill|formResponse|viewform)$/,'')+'/viewform';
  const ent=[...String(link).matchAll(/entry\.(\d+)=([^&#]*)/g)].map(x=>{let v='';try{v=decodeURIComponent(x[2].replace(/\+/g,' '));}catch(e){}return {id:x[1],v};});
  const ids={};ent.forEach((e,i)=>{const n=parseInt(e.v,10);const key=n>=1&&n<=4&&!ids[n]?n:i+1;if(key<=4)ids[key]=e.id;});
  return {base,ids,count:Object.keys(ids).length};}
function totals(){let c=0,t=0;CFG.stations.forEach(s=>{const r=W.st[s.id];if(r){c+=r.c;t+=r.t;}});return {c,t};}
function scoreLine(){const all=allStamps(),n=all.filter(s=>stampDone(s.id)).length,pass=CFG.stations.filter(s=>W.st[s.id]).length,tries=Object.values(W.att||{}).reduce((x,a)=>x+a.n,0);return `過關 ${pass}/${CFG.stations.length}・印章 ${n}/${all.length}・總挑戰 ${tries} 次・探險 ${advCount()}/2`;}
function detailLine(){const parts0=[];const parts=CFG.stations.map(s=>{const r=W.st[s.id],a=(W.att||{})[s.id];return `${s.subject}${s.title?`〈${s.title}〉`:''} ${r?`過關（第${r.tries||a&&a.n||1}次）`:a?`未過（試${a.n}次，最佳${a.best}題）`:'未挑戰'}`;});
  parts.push(`平交道 ${W.safety?('通過'+(W.safety.viol?`（違規${W.safety.viol}次）`:'')):'未完成'}`);parts.push(`海玻璃 ${W.glass.length}/5`);parts.push(`金幣 ${W.coins}`);if((W.reads||[]).length)parts.push(`閱讀紀錄 ${W.reads.length} 則（最近：${W.reads.slice(-3).map(r=>r.book).join('、')}）`);parts.push(`居民委託 ${Object.keys(W.req||{}).length}/${REQS.length}`);{const A_=W.adv||{};parts.push(`探險 小島${A_.islDone?'✓':`（石碑${(A_.isl||[]).filter(Boolean).length}/3）`}・迷宮${A_.mz?`✓（走出${A_.mz}次）`:'—'}`);}if(W.pet)parts.push(`寵物 ${W.pet.name} Lv${petLv()}`);{const s=ledSum(0),w=ledSum(weekAgo());parts.push(`零用錢 總收入${s.inc}／總支出${s.out}（家具${s.cat['家具']||0}、零食飲料${s.cat['零食飲料']||0}、其他${s.cat['其他']||0}）・本週支出${w.out}`);}if((W.toT||[]).length)parts.push(`給老師的留言：${W.toT.slice(-3).map(m=>m.text).join(' / ')}`);parts.push(`遊玩 共${Math.round(W.time/60)}分鐘・今天${playToday()}分鐘・本週${playWeek()}分鐘`);return parts.join('｜');}
{const _dl=detailLine;detailLine=function(){let t=_dl();try{t+=`｜收藏：${colSummary()}`;if(W.title)t+=`｜稱號：${titleName(W.title)}`;}catch(e){}return t;};}
function submitURL(){const f=parseForm(CFG.formLink);if(!f||!f.count)return null;const vals={1:W.seat,2:W.name,3:scoreLine(),4:detailLine()};
  return f.base+'?usp=pp_url&'+Object.entries(f.ids).map(([k,id])=>`entry.${id}=${encodeURIComponent(vals[k]||'')}`).join('&');}
function renderCard(){$('cardWho').textContent=`${W.seat} 號　${W.name}${W.title&&typeof titleName==='function'&&titleName(W.title)?`　「${titleName(W.title)}」`:''}`;
  const {c,t}=totals(),all=allStamps(),n=all.filter(s=>stampDone(s.id)).length;
  $('cardSum').innerHTML='';[[`${n}/${all.length}`,'印章'],[`${goldList().filter(s=>W.st[s.id]).length}/${goldList().length}`,'金章'],[W.coins,'金幣']].forEach(([a,b])=>{const d=document.createElement('span');const bb=document.createElement('b');bb.textContent=a;d.appendChild(bb);d.appendChild(document.createTextNode(b));$('cardSum').appendChild(d);});
  const ol=$('stampList');ol.innerHTML='';all.forEach(s=>{const li=document.createElement('li');const done=stampDone(s.id);li.className=done?'done':'';
    const st=document.createElement('span');st.className='stamp';st.textContent=s.ch||(s.subject||'關')[0];
    const tx=document.createElement('span');tx.className='st-txt';const b=document.createElement('b');b.textContent=s.title?`${s.subject}・${s.title}`:s.subject;const sp=document.createElement('span');
    const r=W.st[s.id];sp.textContent=done?(r?`答對 ${r.c}/${r.t}`:s.id==='safety'?(W.safety.viol?`通過（違規 ${W.safety.viol} 次）`:'通過'):'完成'):`地點：${s.where}`;
    tx.appendChild(b);tx.appendChild(sp);li.appendChild(st);li.appendChild(tx);ol.appendChild(li);});
  const url=submitURL(),a=$('submitLink');
  if(url){a.href=url;a.removeAttribute('aria-disabled');$('submitNote').textContent=n<all.length?`還有 ${all.length-n} 個印章沒拿到，也可以先繳交。按下後會打開 Google 表單，確認資料後按「提交」。`:'全部完成！按下後會打開 Google 表單，確認資料後按「提交」。';}
  else{a.href='#';a.setAttribute('aria-disabled','true');$('submitNote').textContent='老師還沒設定成績表單，先繼續闖關吧！';}}
function openCard(){if(!started||TS())return;renderCard();$('card').hidden=false;$('cardClose').focus({preventScroll:true});}
function closeCard(){$('card').hidden=true;$('switchUser').textContent='換人 · 登出';$('switchUser').dataset.arm='';renderer.domElement.focus({preventScroll:true});}
$('cardClose').onclick=closeCard;$('card').addEventListener('click',e=>{if(e.target===$('card'))closeCard();});
$('submitLink').addEventListener('click',e=>{if($('submitLink').getAttribute('aria-disabled')==='true'){e.preventDefault();return;}W.submitted=true;save();toast('已打開 Google 表單，記得按「提交」');});
$('switchUser').onclick=()=>{const b=$('switchUser');if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定換人？再按一次';return;}save();logout();};
$('bCard').onclick=()=>$('card').hidden?openCard():closeCard();

/* ================================================================
   Teacher mode
   ================================================================ */
const RESET=':root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}';
const FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">';
// rebuild this page with a new quest config. Every <script id> block the build wrote is carried over as-is (pictures are
// separate files next to the page — assets/... — so they are referenced, not copied, and stay untouched).
const DOC_IDS=['loader','quest','sprites','faces','resfaces','tphotos','hroom','troom','sroom','tex','engine','game'];
function buildDoc(cfg){const esc=s=>String(s).replace(/<\/script/gi,'<\\/script');const el_=id=>document.getElementById(id);
  let body='\n<title>'+esc(document.title)+'</title>\n'+FONTS+'\n<style id="css">'+el_('css').textContent+'</style>\n';
  DOC_IDS.forEach(id=>{const e=el_(id);if(!e)return;const ty=e.getAttribute('type');const txt=id==='quest'?JSON.stringify(cfg):e.textContent;
    body+='<script'+(ty?' type="'+ty+'"':'')+' id="'+id+'">'+(id==='engine'||id==='game'?txt:esc(txt))+'<\/script>\n';});
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+RESET+'</style></head><body>'+body+'</body></html>';}
// publish the page (index.html replaced as a whole; the picture files under assets/ are separate files of the artifact and carry over)
async function artPublish(art,html){return await art.publish(html);}
function selfReset(B){if(!W.seat)return;const box=el('div',{class:'st-card'});box.appendChild(el('b',{text:`老師自己的進度（座號 ${W.seat}）`}));
  box.appendChild(el('p',{class:'help',text:'想自己從頭玩一次時按這裡：印章、金幣、寵物、房間都會清空，學生的進度不受影響。'}));
  box.appendChild(el('button',{type:'button',class:'btn small danger',text:'重置老師自己的進度',onclick:async e=>{const b=e.currentTarget;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定？再按一次';return;}
    b.disabled=true;b.textContent='重置中…';RS_LOCK=true;CLOUD.st='conflict';clearTimeout(CLOUD.timer);await seatReset(W.seat);toast('已重置，頁面會重新載入');setTimeout(()=>location.reload(),900);}}));B.appendChild(box);}
function rosterTools(B){ED.resets=ED.resets||{};ED.notes=ED.notes||[];
  B.appendChild(el('h3',{text:'重置進度'}));
  B.appendChild(el('p',{class:'help',text:'重置之後，那個座號不管在哪一台平板、手機登入，都會從頭開始（印章、金幣、寵物、房間都清空）。按下去馬上生效，不用再按「儲存並發布」。正在玩的學生，3 分鐘內會自動重新開始。'}));
  const si=el('input',{type:'text',placeholder:'座號，例如 6',style:'width:120px'});const rb=el('button',{type:'button',class:'btn small danger',text:'重置這個座號',onclick:async e=>{const s=si.value.trim().replace(/[^0-9A-Za-z-]/g,'');if(!s)return;const b=e.currentTarget;if(b.dataset.arm!==s){b.dataset.arm=s;b.textContent=`確定重置 ${s} 號？`;return;}b.disabled=true;const ok=await seatReset(s);toast(ok?`已重置 ${s} 號`:`雲端連不上，${s} 號只清掉了這台裝置的進度`);renderTP();}});
  B.appendChild(el('div',{class:'row2'},[si,rb,el('span')]));
}
let ED=null,tpTab='st';var IS_T=false;
// make-up stamps / coins for one seat (stored in the cloud; the student receives them on the next login, or within 3 minutes while playing)
const GIFT={seat:null,msg:''};
function giftForm(B,rows){B.appendChild(el('h3',{text:'補發印章／金幣'}));
  if(CLOUD.st!=='ok'){B.appendChild(el('p',{class:'help',text:'補發要透過雲端存檔，目前連不上雲端。請用新網址的老師登入再補發。'}));return;}
  const box=el('div',{class:'nb-card gift-box',id:'giftForm'});const si=el('input',{type:'text',inputmode:'numeric',placeholder:'座號',style:'width:90px'});si.value=GIFT.seat||'';
  const sv=rows.find(r=>String(r.seat)===String(GIFT.seat)),have=(sv&&sv.st)||{};
  const checks=CFG.stations.map(st=>{const cb=el('input',{type:'checkbox',value:st.id});if(have[st.id])cb.disabled=true;
    return el('label',{class:'gift-st'+(have[st.id]?' got':'')},[cb,` ${isHall(st)?'金章':'印章'}・${st.subject}${st.title?'〈'+st.title+'〉':''}${have[st.id]?'（已經有了）':''}`]);});
  const ci=el('input',{type:'number',min:'0',max:'500',placeholder:'0',style:'width:90px'}),ni=el('input',{type:'text',maxlength:'60',placeholder:'想對他說的話（可以不填）'});
  const go=el('button',{type:'button',class:'btn primary small',text:'送出補發',onclick:async()=>{const seat=si.value.trim().replace(/[^0-9A-Za-z-]/g,'');if(!seat){GIFT.msg='請先填座號。';renderTP();return;}
    const ids=checks.map(l=>l.querySelector('input')).filter(c=>c.checked&&!c.disabled).map(c=>c.value),coins=Math.max(0,Math.min(500,parseInt(ci.value,10)||0)),note=ni.value.trim();
    if(!ids.length&&!coins&&!note){GIFT.msg='請勾選要補的印章，或填金幣。';renderTP();return;}go.disabled=true;go.textContent='送出中…';
    try{await giftAdd(seat,{id:'g'+Date.now().toString(36),t:Date.now(),st:ids,coins,note});GIFT.seat=seat;GIFT.msg=`已補發給 ${seat} 號！學生下次登入（或正在玩的話 3 分鐘內）就會收到。`;}catch(e){GIFT.msg='送出失敗，請確認網路再試一次。';}renderTP();}});
  si.addEventListener('change',()=>{GIFT.seat=si.value.trim();GIFT.msg='';renderTP();});
  box.append(el('p',{class:'help',text:'按表格裡的「補發」會自動帶入座號；已經拿到的印章不能勾。'}),el('div',{class:'row2'},[fld('座號',si),fld('補發金幣',ci),el('span')]),el('div',{class:'gift-list'},checks),fld('留言',ni,true),el('div',{class:'q-tools'},[go]));
  if(GIFT.msg)box.appendChild(el('p',{class:'gift-msg',text:GIFT.msg}));B.appendChild(box);}
function TS(){return IS_T&&W.seat==='T';}
async function detectTeacher(){let ok=false;
  try{if(!ok&&window.claude&&typeof window.claude.use==='function'){const u=await window.claude.use('user');if(u&&typeof u.canEdit==='function')ok=await u.canEdit();}}catch(e){}
  IS_T=!!ok;if(ok)$('teacherLogin').hidden=false;}
detectTeacher();
function el(tag,props={},kids=[]){const e=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!=null)e.setAttribute(k,v);}(Array.isArray(kids)?kids:[kids]).forEach(c=>c!=null&&e.appendChild(typeof c==='string'?document.createTextNode(c):c));return e;}
function fld(label,input,wide){return el('label',{class:'fld'+(wide?' wide':'')},[label,input]);}
function inp(val,on,attrs={}){const i=el('input',Object.assign({type:'text'},attrs));i.value=val==null?'':val;i.addEventListener('input',()=>{on(i.value);dirty();});return i;}
function dirty(){$('tpStatus').textContent='有尚未儲存的修改';}
function openTeacher(){ED=JSON.parse(JSON.stringify(CFG));$('teacher').hidden=false;$('tpStatus').textContent='';renderTP();}
function closeTeacher(){$('teacher').hidden=true;renderer.domElement.focus({preventScroll:true});}
$('bTeacher').onclick=openTeacher;$('bMap').onclick=()=>openMap();$('bPortal').onclick=()=>{if(started&&!CUTON)openPortal();};$('tpClose').onclick=closeTeacher;
document.querySelectorAll('.tp-tabs button').forEach(b=>b.onclick=()=>{tpTab=b.dataset.tab;document.querySelectorAll('.tp-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));renderTP();});
function parseBulk(text){return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const p=l.split(/\t|｜|\|/).map(x=>x.trim());if(p.length<3)return null;return {q:p[0],o:[p[1],p[2],p[3]||'',p[4]||''],a:0,e:p[5]||''};}).filter(Boolean);}
function renderTP(){const B=$('tpBody');B.innerHTML='';
  if(tpTab==='st'){
    {const box=el('details',{class:'st-card'});box.appendChild(el('summary',{text:'📋 從 Excel 貼上題目（一次匯入很多題）'}));
      box.appendChild(el('p',{class:'help',text:'打開「出題範本.xlsx」的「題目」分頁，選取要匯入的列（可以包含標題列），複製，貼到下面。欄位順序：關卡代號、題目、選項A、選項B、選項C、選項D、正確答案(A-D)、解說。'}));
      const ta=el('textarea',{placeholder:'在這裡貼上…',style:'min-height:120px'});box.appendChild(ta);const msg=el('p',{class:'help'});
      const go=mode=>{const rows=ta.value.split(/\r?\n/).map(r=>r.split('\t')).filter(r=>r.length>=4&&r[1]&&r[1].trim()&&!/關卡代號/.test(r[0]));const by={};let bad=0;
        rows.forEach(r=>{const id=(r[0]||'').trim();const o=[r[2],r[3],r[4],r[5]].map(x=>(x||'').trim());const a='ABCD'.indexOf((r[6]||'').trim().toUpperCase().charAt(0));if(!id||a<0||!o[a]||!o[0]||!o[1]){bad++;return;}(by[id]=by[id]||[]).push({q:r[1].trim(),o,a,e:(r[7]||'').trim()});});
        const made=[];Object.entries(by).forEach(([id,qs])=>{let st=ED.stations.find(s=>s.id===id);if(!st){st={id,subject:id,title:'',spot:'',intro:'',ask:5,qs:[]};ED.stations.push(st);made.push(id);}st.qs=mode==='replace'?qs:st.qs.concat(qs);});
        const n=Object.values(by).reduce((s,q)=>s+q.length,0);msg.textContent=`匯入 ${n} 題（${Object.keys(by).length} 關）${bad?`，${bad} 列格式不對跳過`:''}${made.length?`。新關卡：${made.join('、')}（還沒放到小鎮上，請告訴 Claude 要放哪裡）`:''}。記得按「儲存並發布」。`;dirty();if(n){ta.value='';setTimeout(renderTP,1200);}};
      box.appendChild(el('div',{class:'row2'},[el('button',{type:'button',class:'btn small',text:'加到原本的題目後面',onclick:()=>go('add')}),el('button',{type:'button',class:'btn small danger',text:'取代這些關卡的全部題目',onclick:()=>go('replace')}),el('span')]));box.appendChild(msg);B.appendChild(box);}
    B.appendChild(el('p',{class:'help',text:'每一關放在小鎮的一個地點，學生走過去按 E 就會開始答題。每題選一個正確答案（左邊的圓點），學生看到的選項順序會自動打亂。改完記得按右上角「儲存並發布」。'}));
    ED.stations.forEach((s,si)=>{const card=el('div',{class:'st-card'});
      const used=new Set(ED.stations.filter((x,j)=>j!==si).map(x=>x.spot));
      const sel=el('select');Object.entries(SPOTS).forEach(([k,sp])=>{const o=el('option',{value:k,text:sp.name+(used.has(k)?'（已被使用）':'')});if(k===s.spot)o.selected=true;sel.appendChild(o);});
      sel.addEventListener('change',()=>{s.spot=sel.value;dirty();renderTP();});
      card.appendChild(el('div',{class:'st-top'},[fld('科目',inp(s.subject,v=>s.subject=v,{placeholder:'例：國語'})),fld('關卡名稱',inp(s.title,v=>s.title=v,{placeholder:'例：蚊帳大使'})),fld('地點（學生要走去哪裡）',sel)]));
      {const ms=el('select');[['choice','選擇題（4 選 1）'],['type','打字作答（不給選項，英文單字、部首適用）']].forEach(([v,t])=>{const o=el('option',{value:v,text:t});if((s.mode||'choice')===v)o.selected=true;ms.appendChild(o);});ms.addEventListener('change',()=>{s.mode=ms.value;dirty();renderTP();});
       card.appendChild(el('div',{class:'st-top'},[fld('作答方式',ms)]));if(s.mode==='type')card.appendChild(el('p',{class:'help',text:'打字作答：圓點選的那個答案就是學生要打的字（大小寫、標點不影響）。多種寫法用「/」隔開，例如「Thank you/Thanks」。題目裡寫「___」會變成空格。答案太長的題目（超過 3 個英文字或 6 個中文字）會自動改回選擇題。'}));}
      card.appendChild(el('div',{class:'st-top'},[fld(`每次抽幾題（題庫共 ${s.qs.length} 題，題庫越多，每次越不一樣）`,inp(s.ask||'',v=>s.ask=Math.max(0,parseInt(v)||0),{type:'number',min:'1',placeholder:`預設 ${Math.min(5,s.qs.length)}`}))]));
      const ta=el('textarea',{placeholder:'學生按 E 時，關主說的第一句話'});ta.value=s.intro||'';ta.addEventListener('input',()=>{s.intro=ta.value;dirty();});card.appendChild(el('div',{class:'st-top'},[fld('關主開場白',ta,true)]));
      s.qs.forEach((q,qi)=>{const row=el('div',{class:'q-row'});row.appendChild(el('div',{class:'q-num',text:String(qi+1)}));const main=el('div',{class:'q-main'});
        main.appendChild(fld('題目',inp(q.q,v=>q.q=v)));const opts=el('div',{class:'q-opts'});
        for(let k=0;k<4;k++){const r=el('input',{type:'radio',name:`ans-${si}-${qi}`,'aria-label':`選項 ${k+1} 是正確答案`});r.checked=+q.a===k;r.addEventListener('change',()=>{q.a=k;dirty();});
          opts.appendChild(el('div',{class:'q-opt'},[r,inp(q.o[k],v=>q.o[k]=v,{placeholder:k===0?'選項 1':k<2?'選項 2':`選項 ${k+1}（可留空）`})]));}
        main.appendChild(opts);main.appendChild(fld('解說（答完後顯示，可留空）',inp(q.e,v=>q.e=v)));
        main.appendChild(el('div',{class:'q-tools'},[el('button',{type:'button',class:'btn small',text:'上移',onclick:()=>{if(qi>0){[s.qs[qi-1],s.qs[qi]]=[s.qs[qi],s.qs[qi-1]];dirty();renderTP();}}}),el('button',{type:'button',class:'btn small danger',text:'刪除這題',onclick:()=>{s.qs.splice(qi,1);dirty();renderTP();}})]));
        row.appendChild(main);card.appendChild(row);});
      const bulk=el('textarea',{placeholder:'一行一題：題目｜正確答案｜錯誤答案｜錯誤答案｜錯誤答案｜解說\n也可以從 Google 試算表直接複製貼上（每一欄一格）'});bulk.hidden=true;
      const addB=el('button',{type:'button',class:'btn small',text:'加入這些題目',onclick:()=>{const qs=parseBulk(bulk.value);if(!qs.length){$('tpStatus').textContent='沒有讀到題目，請確認格式。';return;}s.qs.push(...qs);dirty();renderTP();}});addB.hidden=true;
      card.appendChild(el('div',{class:'q-tools'},[el('button',{type:'button',class:'btn small',text:'＋ 新增一題',onclick:()=>{s.qs.push({q:'',o:['','','',''],a:0,e:''});dirty();renderTP();}}),
        el('button',{type:'button',class:'btn small',text:'批次貼上題目',onclick:()=>{bulk.hidden=!bulk.hidden;addB.hidden=bulk.hidden;}}),
        el('button',{type:'button',class:'btn small danger',text:'刪除這一關',onclick:e=>{const b=e.currentTarget;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定刪除？再按一次';return;}ED.stations.splice(si,1);dirty();renderTP();}})]));
      card.appendChild(bulk);card.appendChild(el('div',{class:'q-tools'},[addB]));B.appendChild(card);});
    B.appendChild(el('button',{type:'button',class:'btn',text:'＋ 新增關卡',onclick:()=>{const used=new Set(ED.stations.map(x=>x.spot));const free=Object.keys(SPOTS).find(k=>!used.has(k))||'books';
      ED.stations.push({id:'s'+Date.now().toString(36),spot:free,subject:'',title:'',intro:'',qs:[{q:'',o:['','','',''],a:0,e:''}]});dirty();renderTP();}}));}
  else if(tpTab==='rs'){selfReset(B);B.appendChild(el('p',{class:'help',text:CLOUD.st==='ok'?'這裡列出全班存在雲端的進度（不管學生用哪一台電腦玩）。每次打開會重新讀取。':'雲端存檔目前連不上，下面只列出「這台裝置」上玩過的學生。'}));
    cloudRefresh(()=>{if(tpTab==='rs'&&!$('teacher').hidden)renderTP();});
    const rows=allSaves();
    rows.sort((a,b)=>(parseInt(a.seat,10)||0)-(parseInt(b.seat,10)||0));
    if(!rows.length){B.appendChild(el('p',{class:'help',text:'還沒有學生的紀錄。'}));giftForm(B,rows);rosterTools(B);return;}
    const nSt=CFG.stations.filter(s=>!isHall(s)).length,nG=CFG.stations.filter(isHall).length;
    const pw=(s,days)=>{let t=0;const d=new Date();for(let i=0;i<days;i++){t+=(s.play||{})[dayKey(d)]||0;d.setDate(d.getDate()-1);}return Math.round(t/60);};
    const tb=el('table',{class:'rs-t'});tb.appendChild(el('tr',{},['座號','姓名','印章','金章','金幣','今天','本週','本週花費','閱讀','探險','最後上線',''].map(h=>el('th',{text:h}))));
    rows.forEach(s=>{const st=s.st||{};const stamps=CFG.stations.filter(x=>!isHall(x)&&st[x.id]).length,gold=CFG.stations.filter(x=>isHall(x)&&st[x.id]).length;
      const wk=(s.ledger||[]).filter(e=>e.t>=weekAgo()&&e.a<0).reduce((a,e)=>a-e.a,0);const adv=(s.adv&&s.adv.islDone?1:0)+(s.adv&&s.adv.mz?1:0)+(s.tcSeen?1:0);
      const last=s.last?new Date(s.last):null;const today=pw(s,1),lim=+CFG.playLimit||0;
      tb.appendChild(el('tr',{},[s.seat,s.name,`${stamps}/${nSt}`,`${gold}/${nG}`,String(s.coins||0),el('td',{class:lim&&today>lim?'rs-warn':'',text:`${today} 分`}),`${pw(s,7)} 分`,String(wk),String((s.reads||[]).length),`${adv}/3`,last?`${last.getMonth()+1}/${last.getDate()} ${String(last.getHours()).padStart(2,'0')}:${String(last.getMinutes()).padStart(2,'0')}`:'—',el('td',{},[el('button',{type:'button',class:'btn small',text:'補發',onclick:()=>{GIFT.seat=s.seat;GIFT.msg='';renderTP();setTimeout(()=>{const f=document.getElementById('giftForm');f&&f.scrollIntoView({behavior:'smooth',block:'center'});},50);}}),' ',el('button',{type:'button',class:'btn small danger',text:'重置',onclick:async e=>{const b=e.currentTarget;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定重置？';return;}b.disabled=true;b.textContent='重置中…';const ok=await seatReset(s.seat);toast(ok?`已重置 ${s.seat} 號：下次登入會從頭開始（正在玩的話，3 分鐘內會自動重來）`:`${s.seat} 號只清掉了這台裝置的進度：雲端連不上，請連上網路再按一次`);renderTP();}})])].map(v=>typeof v==='string'?el('td',{text:v}):v)));});
    B.appendChild(el('div',{class:'rs-wrap'},tb));
    giftForm(B,rows);rosterTools(B);}
  else if(tpTab==='nw'){B.appendChild(el('p',{class:'help',text:'學生在小鎮的「公告板」會看到這些消息，有新消息時登入會提醒。最新的日期排最上面。'}));
    ED.news=ED.news||[];ED.news.forEach((n,i)=>{const ta=el('textarea',{placeholder:'內容'});ta.value=n.body||'';ta.addEventListener('input',()=>{n.body=ta.value;dirty();});
      B.appendChild(el('div',{class:'st-card'},[el('div',{class:'row2'},[fld('日期',inp(n.date,v=>n.date=v,{type:'date'})),fld('標題',inp(n.title,v=>n.title=v,{placeholder:'例：下週三校外教學'})),el('button',{type:'button',class:'btn small danger',text:'刪除',onclick:()=>{ED.news.splice(i,1);dirty();renderTP();}})]),fld('內容',ta,true)]));});
    B.appendChild(el('button',{type:'button',class:'btn',text:'＋ 新增消息',onclick:()=>{ED.news.unshift({date:todayStr(),title:'',body:''});dirty();renderTP();}}));}
  else if(tpTab==='cd'){B.appendChild(el('p',{class:'help',text:'顯示在車站旁「倒數看板」上，最多顯示前 4 項。學生走到看板按 E 也能看到。'}));
    ED.countdowns.forEach((c,i)=>{const d=inp(c.date,v=>c.date=v,{type:'date'});B.appendChild(el('div',{class:'row2'},[fld('項目名稱',inp(c.name,v=>c.name=v,{placeholder:'例：期中考'})),fld('日期',d),el('button',{type:'button',class:'btn small danger',text:'刪除',onclick:()=>{ED.countdowns.splice(i,1);dirty();renderTP();}})]));});
    B.appendChild(el('button',{type:'button',class:'btn',text:'＋ 新增倒數項目',onclick:()=>{ED.countdowns.push({name:'',date:''});dirty();renderTP();}}));}
  else if(tpTab==='wd'){B.appendChild(el('p',{class:'help',text:'海灘上藏了 5 片海玻璃，每片刻著一個英文單字。可以換成英文課本這一課的單字。'}));
    for(let i=0;i<5;i++){ED.words[i]=ED.words[i]||{en:'',zh:''};const w=ED.words[i];B.appendChild(el('div',{class:'row2'},[fld(`第 ${i+1} 片：英文`,inp(w.en,v=>w.en=v)),fld('中文意思',inp(w.zh,v=>w.zh=v)),el('span')]));}}
  else if(tpTab==='fm'){B.appendChild(el('h3',{text:'用 Google 表單收成績'}));
    B.appendChild(el('ol',{class:'steps'},[el('li',{},['到 Google 表單建立新表單，新增 ',el('b',{text:'4 題「簡答」'}),'，順序是：座號、姓名、成績、明細。']),
      el('li',{},['（建議）在「設定」打開「收集電子郵件地址」，就知道是哪個學生的帳號交的。']),
      el('li',{},['按右上角「⋮」→ ',el('b',{text:'取得預先填入的連結'}),'，四格依序填 ',el('b',{text:'1、2、3、4'}),'，按「取得連結」→「複製連結」。']),
      el('li',{},['把連結貼到下面，按「儲存並發布」。之後在表單的「回覆」分頁可以連到 Google 試算表，看全班成績。'])]));
    const st=el('p',{class:'help'});const upd=()=>{const f=parseForm(ED.formLink);st.textContent=!ED.formLink?'還沒貼上連結。':!f?'這看起來不是 Google 表單的連結，請貼上「預先填入的連結」。':f.count<4?`只讀到 ${f.count} 個欄位，請確認四題都有填 1、2、3、4。`:'✓ 讀到 4 個欄位，可以使用。';};
    const i=inp(ED.formLink,v=>{ED.formLink=v.trim();upd();},{placeholder:'https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry…'});B.appendChild(fld('預先填入的連結',i,true));upd();B.appendChild(st);
    const test=el('a',{class:'btn small',target:'_blank',rel:'noopener',text:'用測試資料打開表單'});test.addEventListener('click',e=>{const f=parseForm(ED.formLink);if(!f||!f.count){e.preventDefault();return;}const v={1:'0',2:'測試',3:'答對 0/0',4:'這是老師的測試'};test.href=f.base+'?usp=pp_url&'+Object.entries(f.ids).map(([k,id])=>`entry.${id}=${encodeURIComponent(v[k])}`).join('&');});B.appendChild(test);}
  else if(tpTab==='ot'){{const cur=classSky();const row=el('div',{class:'skyrow'});
      ['day','sunset','night','auto'].forEach(k=>{const b=el('button',{type:'button',class:'btn small'+(k===cur?' on':''),text:SKYJP[k]});b.setAttribute('aria-pressed',k===cur);
        b.onclick=async()=>{row.querySelectorAll('button').forEach(x=>x.disabled=true);await skySet(k);renderTP();};row.appendChild(b);});
      B.appendChild(el('h3',{text:'天色（全班一起）'}));B.appendChild(row);
      B.appendChild(el('p',{class:'help',text:'按下去就生效，不用按「儲存並發布」。學生一分鐘內會跟著換。「跟著真實時間」會依台灣日出日落自動變化，晚上就是夜晚。'}));}
    B.appendChild(el('div',{class:'row2'},[fld('每答對一題得到的金幣',inp(ED.coinsPerCorrect,v=>ED.coinsPerCorrect=Math.max(0,parseInt(v,10)||0),{type:'number',min:'0'})),fld('學生一開始有的金幣',inp(ED.startCoins,v=>ED.startCoins=Math.max(0,parseInt(v,10)||0),{type:'number',min:'0'})),fld('每天建議遊玩時間（分鐘，0＝不提醒）',inp(ED.playLimit==null?30:ED.playLimit,v=>ED.playLimit=Math.max(0,parseInt(v,10)||0),{type:'number',min:'0'}))]));
    B.appendChild(el('div',{class:'row2'},[fld('班級密碼（學生登入時要輸入，空白＝不需要）',inp(ED.classPass||'',v=>ED.classPass=v.trim().slice(0,20),{maxlength:'20'})),el('span'),el('span')]));
    B.appendChild(el('p',{class:'help',text:'班級密碼只是擋住不是本班的人，不是很嚴密的保護。之後換成雲端登入時會再加強。'}));
    {const cb=el('input',{type:'checkbox'});cb.checked=ED.presence!==false;cb.onchange=()=>{ED.presence=cb.checked;dirty();};
      B.appendChild(el('div',{class:'row2'},[el('label',{class:'fld'},[cb,el('span',{text:' 同時上線時看得到同學（即時同步）'})]),fld('每台裝置每天最多幾分鐘',inp(ED.presenceMin==null?40:ED.presenceMin,v=>ED.presenceMin=Math.max(0,parseInt(v,10)||0),{type:'number',min:'0'})),el('span')]));
      B.appendChild(el('p',{class:'help',text:'即時同步會一直讀寫雲端。免費額度大約夠全班每天各玩 40 分鐘；時間到了只是看不到同學，存檔不受影響。'}));}
    {B.appendChild(el('div',{class:'row2'},[fld('扭蛋一次幾金幣',inp(ED.gachaPrice||40,v=>ED.gachaPrice=Math.max(1,parseInt(v,10)||40),{type:'number',min:'0'})),el('span'),el('span')]));
}
    {const pi=el('input',{type:'password',placeholder:ED.tpass?'已設定（輸入新密碼可更改）':'老師登入密碼',autocomplete:'new-password'});const b=el('button',{type:'button',class:'btn small',text:'設定老師密碼',onclick:async()=>{const v=pi.value.trim();if(!v){ED.tpass='';dirty();toast('已取消老師密碼');return;}ED.tpass=await tHash(v);pi.value='';dirty();toast('老師密碼設好了，記得儲存並發布');}});
      B.appendChild(el('div',{class:'row2'},[fld('老師登入密碼（空白＝不需要）',pi),b,el('span')]));}
    B.appendChild(el('p',{class:'help',text:'學生的闖關進度用座號分開，存在使用的電腦裡，也會自動存到雲端；換一台電腦用同一個座號登入就能接著玩。同一台電腦給不同學生用時，請學生在集章卡按「換人」。'}));
    B.appendChild(el('button',{type:'button',class:'btn small danger',text:'清除所有學生的進度（這台裝置＋雲端）',onclick:async e=>{const b=e.currentTarget;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='確定清除全班？再按一次';return;}
      b.textContent='清除中…';const seats=new Set();try{Object.keys(localStorage).filter(k=>k.startsWith('shiomi-quest-v1:')&&k!==SKEY('T')).forEach(k=>{const s_=JSON.parse(localStorage.getItem(k)||'null');if(s_&&s_.seat)seats.add(String(s_.seat));localStorage.removeItem(k);});}catch(err){}
      try{await cloudList();}catch(err){}Object.keys(CLOUD.all).forEach(k=>seats.add(String(k)));seats.delete('T');if(W.seat)seats.delete(String(W.seat));await Promise.all([...seats].map(seatReset));b.textContent='已清除';}}));}}
$('tpSave').onclick=async()=>{const st=$('tpStatus');
  ED.stations.forEach(s=>{s.qs=s.qs.filter(q=>q.q&&q.q.trim()&&q.o[q.a]&&String(q.o[q.a]).trim());});
  let art=null;try{if(window.claude&&typeof window.claude.use==='function')art=await window.claude.use('artifact');}catch(e){}
  if(!art&&HOSTED&&TS()){st.textContent='儲存中…';$('tpSave').disabled=true;try{await cfgPut(ED);try{sessionStorage.setItem('shiomi-saved','1');}catch(e){}st.textContent='已儲存！頁面會自動重新載入。';setTimeout(()=>location.reload(),1000);}
    catch(err){$('tpSave').disabled=false;st.textContent='儲存失敗，請確認網路再試一次。';}return;}
  if(!art){st.textContent='這個畫面不能儲存。請在 Claude 裡，用擁有這個頁面的帳號打開。';return;}
  st.textContent='儲存中…';$('tpSave').disabled=true;
  try{sessionStorage.setItem('shiomi-saved','1');}catch(e){}
  try{await artPublish(art,buildDoc(ED));st.textContent='已發布！頁面會自動重新載入。';}
  catch(err){try{sessionStorage.removeItem('shiomi-saved');}catch(e){}const c=err&&err.code;$('tpSave').disabled=false;
    st.textContent=(c==='not_writer'||c==='not_granted'||c==='consent_required'||c==='capability_disabled')?'只有老師（這個頁面的擁有者）可以儲存。':c==='conflict'?'頁面剛剛被更新過，正在載入最新版本，請再改一次。':c==='rate_limited'?'儲存太頻繁，請等一下再試。':c==='too_large'?'內容太多，無法儲存。':`儲存失敗，請稍後再試（${c||err}）。`;}};
try{if(sessionStorage.getItem('shiomi-saved')){sessionStorage.removeItem('shiomi-saved');setTimeout(()=>toast('題目已更新並發布'),800);}}catch(e){}

/* ================================================================
   Dress-up (character look)
   ================================================================ */
const LOOK_DEF={ch:'hero1',fe:-1,fn:-1,fm:-1,hs:'short',hc:'#2a1f1c',ec:'#5a3a24',sk:'#f0d0b4',tp:'tee',sh:'#f4f1ea',bt:'shorts',bc:'#27324a',ht:'straw',hcol:'#b8452f',bag:'none',bagc:'#c8322b'};
const DRESS_OPTS=[
  {k:'hs',label:'髮型',type:'chip',opts:[['short','短髮'],['long','長髮'],['pony','馬尾'],['twin','雙馬尾'],['spiky','刺刺頭']]},
  {k:'hc',label:'髮色',type:'sw',opts:['#1f1814','#3a2a20','#5a3a24','#8a5a34']},
  {k:'ec',label:'眼睛顏色',type:'sw',opts:['#5a3a24','#2b1e19','#3d6ea8','#4a8a5a','#8a5ab0']},
  {k:'sk',label:'膚色',type:'sw',opts:['#f3d6bd','#f0d0b4','#e0b894','#c99a72','#a8784f']},
  {k:'tp',label:'上衣樣式',type:'chip',opts:[['tee','T恤'],['sailor','水手服'],['hoodie','帽T']]},
  {k:'sh',label:'上衣顏色',type:'sw',opts:['#f4f1ea','#d9573b','#f2c14e','#4fae6c','#4a9be0','#27324a','#ec8fb0','#8a6ad0']},
  {k:'bt',label:'下身',type:'chip',opts:[['shorts','短褲'],['skirt','裙子'],['pants','長褲']]},
  {k:'bc',label:'下身顏色',type:'sw',opts:['#27324a','#3a3a3e','#6b4a32','#4a78a8','#b8452f','#e6dccb']},
  {k:'ht',label:'帽子',type:'chip',opts:[['straw','草帽'],['cap','棒球帽'],['beanie','毛線帽'],['none','不戴']]},
  {k:'hcol',label:'帽子／緞帶顏色',type:'sw',opts:['#b8452f','#27324a','#f2c14e','#4fae6c','#4a9be0','#ec8fb0']},
  {k:'bag',label:'書包',type:'chip',opts:[['none','不背'],['bag','背書包']]},
  {k:'bagc',label:'書包顏色',type:'sw',opts:['#c8322b','#2b4a8a','#1f1f22','#ec8fb0','#4fae6c']}];
function lookToOpts(L){return {eye:L.ec,top:L.tp,pants:L.bt==='pants',accent:L.hcol,skin:L.sk,shirt:L.sh,bottom:L.bc,legs:L.bt==='pants'?L.bc:L.sk,skirt:L.bt==='skirt',shoes:'#ece8de',hair:L.hc,hairStyle:L.hs,hat:L.ht==='none'?null:L.ht,capCol:L.hcol,bag:L.bag==='bag',bagCol:L.bagc};}
// students may only use the six kids' features; old saves may still hold adult ones (07–11) → back to 原本
function cleanLook(L){if(L&&L.ch==='custom'&&!TS())L.ch=LOOK_DEF.ch;   // students use the six drawn kids (the 3D doll is teacher-only for now)
  if(L){['fe','fn','fm'].forEach(k=>{if(L[k]!=null&&L[k]>=0&&!KID_FACES.includes(L[k]))L[k]=-1;});
  if(FACES&&!Object.values(FACES.chars).some(c=>c.front&&c.front.pieces.nose))L.fn=-1;}return L;}
function applyLook(L){L=cleanLook(Object.assign({},LOOK_DEF,L||{}));scene.remove(pl.g);{const i=PEOPLE.findIndex(x=>x.g===pl.g);if(i>=0)PEOPLE.splice(i,1);}const np=person(lookToOpts(L));np.g.traverse(o=>{if(o.isMesh)o.castShadow=true;});Object.assign(pl,np);scene.add(pl.g);pl.g.position.copy(P.pos);pl.g.rotation.y=P.yaw;setPlayerSprite(L.ch&&L.ch!=='custom'?L.ch:null,{e:L.fe,n:L.fn,m:L.fm});if(typeof MART!=='undefined'&&MART&&MART.bm)updateBasket();}
const DRESS={on:false,after:null,look:null};
function openDress(after){if(!$('card').hidden)closeCard();if(DLG.open)closeDlg();DRESS.on=true;DRESS.after=after||null;DRESS.look=Object.assign({},LOOK_DEF,W.look||{});
  P.sit=null;P.vel.set(0,0,0);P.yaw=0;document.body.classList.add('dressing');const t=$('title');t.classList.add('gone');setTimeout(()=>{if(DRESS.on)t.hidden=true;},1000);
  $('drDone').textContent=started?'完成':'完成，開始闖關';renderDress();$('dress').hidden=false;}
function renderDress(){const box=$('drRows');box.innerHTML='';
  {const row=el('div',{class:'dr-row'},[el('span',{text:'角色'})]);const opts=el('div',{class:'dr-opts'});
    [...SPR_CHARS.map(c=>[c.id,c.name]),...(TS()?[['custom','自己搭配（3D）']]:[])].forEach(v=>{const b=el('button',{type:'button',class:'chip','aria-pressed':String(DRESS.look.ch===v[0]),text:v[1]});
      b.onclick=()=>{DRESS.look.ch=v[0];applyLook(DRESS.look);renderDress();SND.pick&&A.ready&&SND.pick();};opts.appendChild(b);});
    row.appendChild(opts);box.appendChild(row);}
  if(DRESS.look.ch!=='custom'){
    if(hasFace(DRESS.look.ch)){[['fe','eyes','眼睛和眉毛'],['fn','nose','鼻子'],['fm','mouth','嘴巴']].filter(([k,part])=>FACES.chars[DRESS.look.ch].front.pieces[part]).forEach(([k,part,label])=>{
      const row=el('div',{class:'dr-row'},[el('span',{text:label})]);const opts=el('div',{class:'dr-opts fp-opts'});
      [-1,...KID_FACES].forEach(i=>{const on=(DRESS.look[k]??-1)===i;
        const b=el('button',{type:'button',class:'fp','aria-pressed':String(on),'aria-label':i<0?'原本的':FACES.parts[i].names[part],title:i<0?'原本的':FACES.parts[i].names[part]});
        if(i<0)b.textContent='原本';else{const im=document.createElement('img');im.src=FACES.parts[i].img[part];im.alt='';im.className=part;b.appendChild(im);}
        b.onclick=()=>{DRESS.look[k]=i;applyLook(DRESS.look);renderDress();SND.pick&&A.ready&&SND.pick();};opts.appendChild(b);});
      row.appendChild(opts);box.appendChild(row);});}
    box.appendChild(el('p',{class:'dr-note',text:FACE_ON?'選好的臉，走路時也會一直是這個樣子。':'換眼睛、鼻子、嘴巴的功能正在整修，很快回來！'}));return;}
  DRESS_OPTS.forEach(o=>{
  if((o.k==='hcol'&&DRESS.look.ht==='none')||(o.k==='bagc'&&DRESS.look.bag!=='bag'))return;
  const row=el('div',{class:'dr-row'},[el('span',{text:o.label})]);const opts=el('div',{class:'dr-opts'});
  o.opts.forEach(v=>{const val=o.type==='sw'?v:v[0];const on=DRESS.look[o.k]===val;
    const b=o.type==='sw'?el('button',{type:'button',class:'sw','aria-label':`${o.label}顏色`,'aria-pressed':String(on),style:`background:${val}`}):el('button',{type:'button',class:'chip','aria-pressed':String(on),text:v[1]});
    b.onclick=()=>{DRESS.look[o.k]=val;applyLook(DRESS.look);renderDress();SND.pick&&A.ready&&SND.pick();};opts.appendChild(b);});
  row.appendChild(opts);box.appendChild(row);});}
$('drRand').onclick=()=>{if(DRESS.look.ch!=='custom'){const ids=SPR_CHARS.map(c=>c.id);DRESS.look.ch=pick(ids);if(FACE_ON&&KID_FACES.length){DRESS.look.fe=pick(KID_FACES);DRESS.look.fm=pick(KID_FACES);DRESS.look.fn=-1;}applyLook(DRESS.look);renderDress();return;}DRESS_OPTS.forEach(o=>{const v=pick(o.opts);DRESS.look[o.k]=o.type==='sw'?v:v[0];});applyLook(DRESS.look);renderDress();};
$('drDone').onclick=()=>{W.look=Object.assign({},DRESS.look);save();DRESS.on=false;$('dress').hidden=true;document.body.classList.remove('dressing');
  const f=DRESS.after;DRESS.after=null;if(started){cam.yaw=P.yaw+PI;cv.focus({preventScroll:true});}f&&f();};
$('cardDress').onclick=()=>openDress(null);$('cardWrong').onclick=()=>{closeCard();openWrongBook();};

/* ================================================================
   Konbini interior (walk-in shop)
   ================================================================ */
const IX=0,IZ=330;var INDOOR=false;
var MART={basket:[],doorOpen:0,doors:[],winMat:null,steam:null};
function imat(hex,e=.3,extra={}){const c=col(hex);return new T.MeshLambertMaterial(Object.assign({color:c,emissive:c.clone().multiplyScalar(e)},extra));}
function drawGoods(kind){const [c,g]=C2(512,256);g.fillStyle='#e9e7e0';g.fillRect(0,0,512,256);
  const tiers=4,th=256/tiers;
  for(let r=0;r<tiers;r++){const y0=r*th;g.fillStyle='#f6f5f0';g.fillRect(0,y0,512,th-10);g.fillStyle='#b9b6ad';g.fillRect(0,y0+th-10,512,10);g.fillStyle='#e8b33c';g.fillRect(0,y0+th-10,512,3);
    let x=6;while(x<500){const w=kind==='noodle'?44:kind==='stat'?20:kind==='rice'?40:34;const h=th-18-rand()*10;const cc=pick(kind==='rice'?['#2f3a2c','#e9e2cc','#c8322b','#f2c14e']:kind==='bread'?['#d9a45a','#f2d59a','#c07a3a','#f7efe0','#e86a8a']:kind==='snack'?['#e35d4a','#f2c14e','#5aa0d8','#7cc47a','#f08fb0','#9a7ad8']:kind==='noodle'?['#e35d4a','#f2c14e','#f7efe0','#3d6ea8']:kind==='stat'?['#3d6ea8','#e35d4a','#f2c14e','#4fae6c','#1f1f22']:['#8a6ad0','#e8b33c','#4fae6c','#ec8fb0','#3d6ea8']);
      g.fillStyle=cc;const yb=y0+th-10;
      if(kind==='rice'){g.beginPath();g.moveTo(x,yb);g.lineTo(x+w/2,yb-h*.8);g.lineTo(x+w,yb);g.fill();g.fillStyle='#1f2a1c';g.fillRect(x+w*.3,yb-h*.3,w*.4,h*.3);}
      else if(kind==='noodle'){g.fillRect(x+4,yb-h*.8,w-8,h*.8);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(x+4,yb-h*.8,w-8,6);}
      else if(kind==='stat'){g.fillRect(x,yb-h,w-4,h);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(x+3,yb-h+4,w-10,4);}
      else{rrect(g,x,yb-h,w-4,h,5);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+4,yb-h+6,w-12,h*.25);}
      x+=w+2;}}
  return TX(c);}
function coolerTex(){const [c,g]=C2(512,256),[ce,ge]=C2(512,256);g.fillStyle='#dfe8ee';g.fillRect(0,0,512,256);
  for(let r=0;r<4;r++){for(let x=8;x<504;x+=16){const cc=pick(['#f4f4f0','#e35d4a','#f2c14e','#4fae6c','#3d6ea8','#f7a04a','#8fd0e8','#c8e6a0']);g.fillStyle=cc;g.fillRect(x,14+r*62,11,44);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+2,16+r*62,3,40);g.fillStyle='#9aa0a4';g.fillRect(x+2,10+r*62,7,5);}
    g.fillStyle='#b8c2c8';g.fillRect(0,58+r*62,512,4);}
  g.fillStyle='rgba(40,50,60,.9)';for(let x=0;x<=512;x+=128)g.fillRect(x-3,0,6,256);g.fillRect(0,0,512,6);g.fillRect(0,250,512,6);
  ge.drawImage(c,0,0);return {map:TX(c),emap:TX(ce)};}
(function buildMart(){
  const G=new T.Group();G.position.set(IX,0,IZ);scene.add(G);MART.g=G;
  const W_=14,D_=10,H_=3.2;
  const floorT=(()=>{const [c,g]=C2(256,256);g.fillStyle='#ecebe6';g.fillRect(0,0,256,256);speckle(g,256,256,1200,.05);g.strokeStyle='rgba(120,120,110,.28)';g.lineWidth=2;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}return TX(c,true);})();
  const fg=new T.PlaneGeometry(W_,D_);fg.rotateX(-PI/2);const uv=fg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*W_/2.4,uv.getY(i)*D_/2.4);
  mk(fg,imat('#e8e6df',.2,{map:floorT,emissiveMap:floorT}),0,0,0,G,false);
  const wallM=imat('#eeede7',.25),ceilM=imat('#f2f1ec',.32);
  mk(bx(W_,.2,D_),ceilM,0,H_+.1,0,G);
  mk(bx(.3,H_,D_),wallM,-W_/2-.15,H_/2,0,G);mk(bx(.3,H_,D_),wallM,W_/2+.15,H_/2,0,G);mk(bx(W_,H_,.3),wallM,0,H_/2,-D_/2-.15,G);
  // front wall with windows and door (door at x=+4)
  mk(bx(W_,.5,.3),wallM,0,.25,D_/2+.15,G);mk(bx(W_,.5,.3),imat('#2b2f6a',.3),0,H_-.25,D_/2+.15,G);
  [[-W_/2,2.9],[5.1,W_/2]].forEach(([a,b])=>{const w=b-a;const win=new T.MeshBasicMaterial({color:0xffffff,map:(()=>{const [c,g]=C2(8,64);const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'#ffffff');gr.addColorStop(.6,'#d8d8d8');gr.addColorStop(1,'#8a8a8a');g.fillStyle=gr;g.fillRect(0,0,8,64);return new T.CanvasTexture(c);})()});MART.winMat=MART.winMat||win;
    const p=mk(new T.PlaneGeometry(w,H_-1),MART.winMat,(a+b)/2,H_/2,D_/2+.02,G,false);p.rotation.y=PI;
    for(let x=a;x<=b+.01;x+=w/Math.max(1,Math.round(w/2.2)))mk(bx(.08,H_-1,.1),imat('#8a9096',.3),x,H_/2,D_/2,G,false);});
  mk(bx(2.2,.12,.3),imat('#8a9096',.3),4,H_-.56,D_/2+.02,G);
  const dm=new T.MeshLambertMaterial({color:col('#cfe4ee'),transparent:true,opacity:.28,emissive:col('#cfe4ee'),emissiveIntensity:.3});
  [-1,1].forEach(s=>{const d=mk(bx(1.1,H_-1.1,.05),dm,4+s*.55,(H_-1.1)/2,D_/2,G,false);d.userData.dyn=true;MART.doors.push({m:d,s});});
  addCol(IX-W_/2-.3,IX-W_/2,IZ-D_/2,IZ+D_/2,4);addCol(IX+W_/2,IX+W_/2+.3,IZ-D_/2,IZ+D_/2,4);addCol(IX-W_/2,IX+W_/2,IZ-D_/2-.3,IZ-D_/2,4);
  addCol(IX-W_/2,IX+2.9,IZ+D_/2-.1,IZ+D_/2+.3,4);addCol(IX+5.1,IX+W_/2,IZ+D_/2-.1,IZ+D_/2+.3,4);addCol(IX+2.9,IX+5.1,IZ+D_/2+.1,IZ+D_/2+.4,4);
  // ceiling lights
  for(let x=-5;x<=5;x+=2.5)for(let z=-3;z<=3;z+=3){mk(bx(1.6,.05,.3),MART.lightM||(MART.lightM=new T.MeshBasicMaterial({color:0xffffff})),x,H_-.03,z,G,false);}
  // back-wall drink coolers
  const ct=coolerTex();const cm=new T.MeshLambertMaterial({color:0xffffff,map:ct.map,emissiveMap:ct.emap,emissive:0xffffff,emissiveIntensity:.5});
  mk(bx(11,2.3,.9),imat('#d9dde0',.4),-.5,1.15,-D_/2+.45,G);const cf=mk(new T.PlaneGeometry(10.6,2.05),cm,-.5,1.2,-D_/2+.91,G,false);
  addCol(IX-6,IX+5,IZ-D_/2,IZ-D_/2+.95,3);
  // gondola shelves
  const CATS_SHELF=[
    {x:-1.2,side:-1,key:'rice',name:'飯糰・便當',items:[['鮭魚飯糰',30],['鮪魚飯糰',30],['三明治',35],['咖哩便當',60]]},
    {x:-1.2,side:1,key:'bread',name:'麵包・甜點',items:[['菠蘿麵包',25],['布丁',25],['銅鑼燒',20]]},
    {x:1.6,side:-1,key:'snack',name:'零食',items:[['洋芋片',25],['巧克力',20],['仙貝',15],['軟糖',15]]},
    {x:1.6,side:1,key:'noodle',name:'泡麵',items:[['杯麵',30],['日式炒麵',35]]},
    {x:4.4,side:-1,key:'stat',name:'文具',items:[['鉛筆',10],['橡皮擦',10],['筆記本',20]]},
    {x:4.4,side:1,key:'misc',name:'雜貨・寵物用品',items:[['小魚乾',30],['狗狗肉乾',30],['逗貓棒',40],['狗狗玩具球',40],['閃亮貼紙',50]]}];
  const gz0=-3.1,gz1=1.2,gl=gz1-gz0;
  [...new Set(CATS_SHELF.map(c=>c.x))].forEach(x=>{mk(bx(.5,1.0,gl),imat('#d9d7d0',.4),x,.5,(gz0+gz1)/2,G);mk(bx(.9,.12,gl+.1),imat('#c9c6bd',.35),x,.06,(gz0+gz1)/2,G);addCol(IX+x-.48,IX+x+.48,IZ+gz0-.05,IZ+gz1+.05,1.2);
    [gz0-.02,gz1+.02].forEach((z,i)=>{const e=mk(new T.PlaneGeometry(.9,.9),imat('#e8b33c',.5),x,.5,z,G,false);if(i===0)e.rotation.y=PI;});});
  CATS_SHELF.forEach(c=>{const t=drawGoods(c.key);const m=new T.MeshLambertMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.32});
    const p=mk(new T.PlaneGeometry(gl,.92),m,c.x+c.side*.26,.52,(gz0+gz1)/2,G,false);p.rotation.y=c.side>0?PI/2:-PI/2;
    const [sc,sg]=C2(256,64);sg.fillStyle='#2b2f6a';sg.fillRect(0,0,256,64);sg.fillStyle='#fff';sg.font=`700 30px ${FG}`;sg.textAlign='center';sg.textBaseline='middle';sg.fillText(c.name,128,34);
    const sm=new T.MeshBasicMaterial({map:TX(sc)});const s=mk(new T.PlaneGeometry(1.5,.38),sm,c.x+c.side*.3,1.75,(gz0+gz1)/2,G,false);s.rotation.y=c.side>0?PI/2:-PI/2;
    mk(cy(.01,.01,1.2,4),M.metalDark,c.x+c.side*.3,2.5,(gz0+gz1)/2,G,false);
    inter(new T.Vector3(IX+c.x+c.side*1.0,0,IZ+(gz0+gz1)/2),1.6,`看看〈${c.name}〉貨架`,()=>shelfMenu(c.name,c.items));});
  // drinks & freezer
  inter(new T.Vector3(IX-.5,0,IZ-3.6),2.2,'打開飲料冷藏櫃',()=>shelfMenu('飲料冷藏櫃',[['牛奶',20],['麥茶',20],['柳橙汁',20],['彈珠汽水',25]]));
  mk(bx(1.3,.85,2.2),imat('#eef2f4',.45),5.9,.43,2.4,G);const fz=mk(new T.PlaneGeometry(1.1,2),(()=>{const t=drawGoods('snack');return new T.MeshLambertMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.45});})(),5.9,.87,2.4,G,false);fz.rotation.x=-PI/2;
  addCol(IX+5.2,IX+6.6,IZ+1.25,IZ+3.55,1);
  inter(new T.Vector3(IX+4.9,0,IZ+2.4),1.5,'打開冰品冷凍櫃',()=>shelfMenu('冰品冷凍櫃',[['蘇打冰棒',20],['香草冰淇淋',25],['西瓜冰',20]]));
  // magazine rack
  mk(bx(.4,1.3,3),imat('#c9c6bd',.4),-6.75,.65,-1.5,G);const mg=mk(new T.PlaneGeometry(3,1.2),(()=>{const t=drawGoods('misc');return new T.MeshLambertMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.5});})(),-6.54,.75,-1.5,G,false);mg.rotation.y=PI/2;
  addCol(IX-7,IX-6.5,IZ-3,IZ,2);
  inter(new T.Vector3(IX-5.8,0,IZ-1.5),1.6,'翻翻雜誌',()=>say('雜誌架',[pick(['旅遊雜誌寫著「十個祕密海邊小鎮」，裡面沒有汐見町。太好了。','漫畫週刊的最新一期。封面是一隻會說話的貓。','一本英文繪本：The Very Quiet Cricket。你認得 cricket 這個字嗎？（蟋蟀）'])]));
  // counter
  const cnt=mk(bx(3.6,1.0,.9),imat('#f0efe9',.45),-4.9,.5,1.5,G);mk(bx(3.7,.06,1.0),imat('#9aa0a4',.35),-4.9,1.03,1.5,G);
  const [lc,lg]=C2(512,96);lg.fillStyle='#fbfaf4';lg.fillRect(0,0,512,96);lg.fillStyle='#2b2f6a';lg.fillRect(0,64,512,32);lg.fillStyle='#e8b33c';lg.fillRect(0,56,512,8);lg.fillStyle='#2b2f6a';lg.font=`800 34px ${FG}`;lg.textAlign='center';lg.fillText('ひだまりマート',256,44);
  mk(new T.PlaneGeometry(3.4,.62),new T.MeshBasicMaterial({map:TX(lc)}),-4.9,.55,1.96,G,false);
  addCol(IX-6.8,IX-3.05,IZ+1,IZ+2,2);
  mk(bx(.4,.3,.35),imat('#2a2d33',.2),-4.3,1.2,1.4,G);const scr=mk(bx(.32,.22,.02),new T.MeshBasicMaterial({color:col('#8fe0b0')}),-4.3,1.42,1.6,G,false);scr.rotation.x=-.4;
  // oden pot + steam
  mk(bx(.7,.22,.45),imat('#b8bcc0',.35),-6.0,1.14,1.45,G);const od=mk(new T.PlaneGeometry(.64,.4),imat('#c9933f',.6),-6.0,1.26,1.45,G,false);od.rotation.x=-PI/2;
  const st=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:.25,depthWrite:false}));st.position.set(IX-6,1.6,IZ+1.45);st.scale.set(.8,.8,1);scene.add(st);MART.steam=st;
  // hot case
  mk(bx(.8,.55,.5),new T.MeshLambertMaterial({color:col('#ffe2b0'),transparent:true,opacity:.5,emissive:col('#ffb060'),emissiveIntensity:.5}),-3.6,1.34,1.45,G,false);
  // back shelf behind counter
  mk(bx(3.6,1.8,.4),imat('#d9d7d0',.4),-4.9,.9,-.1,G);
  // clerk
  const ck=person({skin:'#f0d0b4',shirt:'#2b2f6a',collar:'#e8b33c',bottom:'#3a3a3e',legs:'#3a3a3e',pants:true,shoes:'#2a2522',hair:'#3a2a20',hairStyle:'pony',accent:'#e8b33c'});
  ck.g.position.set(IX-4.9,0,IZ+.7);scene.add(ck.g);MART.clerk=ck;
  inter(new T.Vector3(IX-4.6,0,IZ+2.5),1.8,()=>MART.basket.length?`到櫃台結帳（${MART.basket.length} 件）`:'和店員說話',()=>checkout());
  // exit
  inter(new T.Vector3(IX+4,0,IZ+4.3),1.4,'離開便利商店',()=>exitMart());
  // outside window scenery
  mk(bx(.6,.8,.6),imat('#3c8a4a',.4),6.3,.4,4.4,G);mk(ico(.4,0),imat('#4fae6c',.4),6.3,1.05,4.4,G);
})();
function basketTotal(){return MART.basket.reduce((s,it)=>s+it[1],0);}
function shelfMenu(name,items){const n=MART.basket.length;
  choose(name,`要拿什麼放進購物籃？${n?`（購物籃：${n} 件，共 ${basketTotal()} 金幣）`:''}`,[...items.map(it=>({label:`${it[0]}　${it[1]} 金幣`,fn:()=>{MART.basket.push(it);updateBasket();SND.pick();toast(`放進購物籃：${it[0]}`);shelfMenu(name,items);}})),{label:'不拿了',fn:null}]);}
function checkout(){const who='店員 · Clerk';
  if(!MART.basket.length){choose(who,'歡迎光臨！Welcome! 要不要來點熱食？',[{label:'關東煮　30 金幣',fn:()=>{MART.basket.push(['關東煮',30]);updateBasket();checkout();}},{label:'肉包　25 金幣',fn:()=>{MART.basket.push(['肉包',25]);updateBasket();checkout();}},{label:'烤地瓜　25 金幣',fn:()=>{MART.basket.push(['烤地瓜',25]);updateBasket();checkout();}},{label:'不用了，謝謝',fn:null}]);return;}
  const tot=basketTotal(),list=MART.basket.map(i=>i[0]).join('、');
  choose(who,`${list}，一共 ${tot} 金幣。（你有 ${W.coins} 金幣）`,[{label:`付 ${tot} 金幣`,fn:()=>{if(W.coins<tot){say(who,[`金幣好像不夠喔，還差 ${tot-W.coins} 金幣。可以把一些東西放回去，或先去答題賺金幣。`]);return;}
      W.coins-=tot;led(-tot,'便利商店購物','零食飲料');MART.basket.forEach(i=>addItem(i[0]));dailyEvent('buy');MART.basket=[];updateBasket();renderPouch();save();SND.register();say(who,['謝謝光臨！Thank you! 歡迎再來～']);}},
    {label:'再逛一下',fn:null},{label:'全部放回去',fn:()=>{MART.basket=[];updateBasket();say(who,['好的，我幫你放回去囉。']);}}]);}
SND.register=function(){if(!A.ready)return;const t=A.ctx.currentTime;[1568,2093].forEach((f,i)=>tone(f,t+i*.09,.35,'sine',.06,A.sfx));nburst(t+.2,.15,'bandpass',3000,1,.08,A.sfx);};
function updateBasket(){if(!MART.bm){const g=new T.Group();const m=lam('#d9573b');mk(bx(.32,.16,.22),m,0,0,0,g,false);mk(bx(.3,.02,.2),lam('#f2c14e'),0,.09,0,g,false);const h=mk(new T.TorusGeometry(.1,.012,6,12,PI),M.metalDark,0,.1,0,g,false);MART.bm=g;}
  const arm=pl.arms[1];if(MART.bm.parent!==arm){if(MART.bm.parent)MART.bm.parent.remove(MART.bm);arm.add(MART.bm);MART.bm.position.set(0,-.34,.06);}
  MART.bm.visible=MART.basket.length>0;renderPouch();}
function fadeTo(fn){const f=$('fade');f.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>f.classList.remove('on'),120);},380);}
function enterMart(from){MART.from=from==='tribe'?'tribe':'town';if(TROOM&&TROOM.mart&&R2.img.mart_landscape_bg&&spr2d()){martEnter2();return;}fadeTo(()=>{INDOOR=true;P.sit=null;P.pos.set(IX+4,0,IZ+3.4);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.22;cam.pos.set(IX+4,2.2,IZ+4.6);cam.look.set(IX+4,1.4,IZ+2);SND.chime();updateBasket();curArea=null;areaCool=0;});}
function exitMart(){if(MART.basket.length){choose('店員 · Clerk','購物籃裡還有東西還沒結帳喔！',[{label:'放回去再離開',fn:()=>{MART.basket=[];updateBasket();exitMart();}},{label:'先去結帳',fn:null}]);return;}
  fadeTo(()=>{if(MART_IN){MART_IN=false;r2Off();}if(MART.from==='tribe'){MART.from='town';INDOOR=false;arriveTribe('shop',true);return;}INDOOR=false;P.pos.set(16.5,0,17.3);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=.9;cam.pos.set(19,2.5,15);cam.look.set(16.5,1.4,17.3);SND.chime();curArea=null;areaCool=0;});}
function martTick(dt){if(!INDOOR||HOME_IN||CH_IN)return;
  const near=Math.hypot(P.pos.x-(IX+4),P.pos.z-(IZ+5))<2.4;MART.doorOpen=clamp(MART.doorOpen+(near?dt*3:-dt*2),0,1);
  MART.doors.forEach(d=>{d.m.position.x=4+d.s*(.55+MART.doorOpen*.95);});
  MART.winMat.color.copy(S.skyHorizon).lerp(S.fog,.3).multiplyScalar(1.1);
  MART.steam.position.y=1.6+Math.sin(time*1.3)*.08;MART.steam.material.opacity=.18+.08*Math.sin(time*2.1);
  const ck=MART.clerk;ck.head.rotation.y=Math.atan2(P.pos.x-ck.g.position.x,P.pos.z-ck.g.position.z)*.5;}
/* ================================================================
   Pets
   ================================================================ */
const PET_SAFE={cat:{'小魚乾':[40,6,'喀滋喀滋，吃得好開心！']},dog:{'狗狗肉乾':[40,6,'搖著尾巴一下子就吃光光！']}};
const PET_OK={'礦泉水':[4,5,'喝了幾口水，精神變好了。'],'鮭魚飯糰':[10,3,'偶爾吃一小口白飯可以，但調味和海苔要少一點喔。'],'鮪魚飯糰':[10,3,'偶爾吃一小口可以，美乃滋太油就不要給太多。'],'麥茶':[3,3,'聞了聞，喝了一小口。水還是最好的喔。']};
const PET_BAD={'巧克力':'巧克力對貓和狗都有毒，絕對不能給牠吃！','熱可可':'可可跟巧克力一樣，對貓狗有毒！','洋芋片':'洋芋片太鹹了，鹽吃太多對寵物的腎臟不好。',
  '牛奶':'很多貓狗喝牛奶會拉肚子（乳糖不耐），不要給牠喝喔。','彈珠汽水':'汽水有很多糖，寵物不能喝。','可爾必思汽水':'汽水有很多糖，寵物不能喝。','哈密瓜汽水':'汽水有很多糖，寵物不能喝。',
  '咖哩便當':'咖哩裡有洋蔥，洋蔥對貓狗有毒！','軟糖':'糖果對寵物的牙齒和身體都不好。','布丁':'布丁有牛奶和很多糖，不適合寵物。','蘇打冰棒':'冰品又冰又甜，寵物會肚子痛。',
  '香草冰淇淋':'冰淇淋有牛奶和糖，寵物吃了會不舒服。','西瓜冰':'冰品又冰又甜，寵物會肚子痛。','杯麵':'泡麵太鹹、調味料太多，不能給寵物吃。','日式炒麵':'炒麵太鹹又太油。',
  '仙貝':'仙貝有醬油，太鹹了。','銅鑼燒':'紅豆餡太甜了。','菠蘿麵包':'麵包又甜又油，不適合寵物。','關東煮':'關東煮的湯很鹹，不適合寵物。','肉包':'肉包裡可能有洋蔥，不能給寵物吃。','烤地瓜':'烤地瓜可以吃一點點，但要放涼、不加調味……這次先不要好了。'};
const TRICKS=[[2,'sit','坐下'],[3,'lie','趴下'],[4,'paw','握手'],[5,'spin','轉圈'],[6,'playdead','裝死'],[7,'roll','翻滾'],[8,'dance','跳舞']];
const PET_LV=[0,20,50,90,140,200,270,350];
const TRICK_DUR={lie:4,playdead:3.4,roll:1.3,sit:2.4,paw:1.6,spin:1.6,dance:2.6};
let PETOBJ=null,petSaveT=0,petRenderT=0,petHungryWarned=false;
var makeDog=function(coat,s=1.35){const C={yellow:['#d39a52','#f3e2c4'],black:['#2a2723','#d8c6a6'],white:['#f2efe8','#ddd0ba']}[coat]||['#d39a52','#f3e2c4'];
  const g=new T.Group();g.userData.dyn=true;scene.add(g);const bm=lam(C[0]),lm=lam(C[1]);
  const body=mk(sph(.2,10,8),bm,0,.22,0,g,true);body.scale.set(.85,.8,1.5);
  const head=new T.Group();head.position.set(0,.36,.25);g.add(head);mk(sph(.12,10,8),bm,0,0,0,head);
  mk(bx(.1,.08,.12),lm,0,-.035,.11,head);mk(sph(.022,6,5),M.black,0,-.01,.175,head,false);
  [-1,1].forEach(k=>{const e=mk(new T.ConeGeometry(.045,.1,4),bm,k*.065,.12,-.01,head);e.rotation.z=-k*.15;});
  [-1,1].forEach(k=>mk(sph(.016,6,4),M.black,k*.045,.035,.1,head,false));
  const tail=new T.Group();tail.position.set(0,.3,-.27);g.add(tail);const tm=mk(new T.TorusGeometry(.06,.022,6,10,PI*1.4),bm,0,.06,0,tail);tm.rotation.y=PI/2;
  const legs=[];[[-.08,.14],[.08,.14],[-.08,-.14],[.08,-.14]].forEach(([a,b])=>legs.push(mk(cy(.032,.032,.2,6),bm,a,.1,b,g,false)));
  g.scale.setScalar(s);return {name:'',g,body,head,tail,legs,home:new T.Vector3(),tx:0,tz:0,state:'sit',t:1,follow:0,ph:rand()*6,dog:true};}
// puppies waiting at the bus stop
const PUPPIES=[];
(function(){const bx0=new T.Group();bx0.position.set(-54,0,-36.1);bx0.userData.dyn=true;scene.add(bx0);const cb=lam('#b88a58');
  mk(bx(1.1,.04,.7),cb,0,.02,0,bx0);[[1.1,.35,.04,0,.18,.35],[1.1,.35,.04,0,.18,-.35],[.04,.35,.7,.55,.18,0],[.04,.35,.7,-.55,.18,0]].forEach(([a,b,c,x,y,z])=>mk(bx(a,b,c),cb,x,y,z,bx0));
  ['yellow','black','white'].forEach((coat,i)=>{const d=makeDog(coat,.72);scene.remove(d.g);bx0.add(d.g);d.g.position.set(-.32+i*.32,.02,0);d.g.rotation.y=rr(-.6,.6)+PI*.1;d.body.rotation.x=-.45;d.head.position.y=.46;d.legs.forEach((l,j)=>l.visible=j<2);d.pose='sleep';PUPPIES.push({coat,d});});
  addCol(-54.6,-53.4,-36.5,-35.7,.6);})();
function refreshPuppies(){PUPPIES.forEach(p=>p.d.g.visible=!(W.pet&&W.pet.kind==='dog'&&W.pet.coat===p.coat));if(typeof acRefresh==='function')acRefresh();}
function petLv(){if(!W.pet)return 0;let l=0;PET_LV.forEach(t=>{if(W.pet.bond>=t)l++;});return l;}
function petNext(){const l=petLv();return l>=PET_LV.length?0:PET_LV[l]-W.pet.bond;}
function bondFrom(kind,n,cap){const p=W.pet;if(!p)return false;const t=todayStr();if(!p.day||p.day.d!==t)p.day={d:t,areas:[]};p.day[kind]=(p.day[kind]||0)+1;if(p.day[kind]>cap)return false;bondUp(n);return true;}
function petArea(jp){const p=W.pet;if(!p||!PETOBJ||PETOBJ.wait)return;const t=todayStr();if(!p.day||p.day.d!==t)p.day={d:t,areas:[]};p.day.areas=p.day.areas||[];if(p.day.areas.includes(jp))return;p.day.areas.push(jp);if(bondFrom('area',1,8))heart(PETOBJ.g.position);}
function stampsDone(){return allStamps().filter(s=>stampDone(s.id)).length;}
// 蝴蝶 — the teacher's own dog (drawn from Tien's old dog): fur grows one stage every 3 days (f0 just trimmed … f3 long), trim it back in the pet menu
const HUDIE_FUR=['剛剪完','長一點了','蓬蓬的','好長，該剪了'];
function hudieFur(){if(W.hudieCut==null)W.hudieCut=Date.now()-9*864e5;return Math.max(0,Math.min(3,Math.floor((Date.now()-W.hudieCut)/(3*864e5))));}
function hudieTrim(){const p=W.pet;if(!p||p.coat!=='hudie')return;const st=hudieFur();if(st===0){say(p.name,[`${p.name}的毛才剛剪過，整整齊齊的。過幾天毛長長了再來剪吧！`]);return;}
  furFx();SND.pick&&SND.pick();setTimeout(()=>{W.hudieCut=Date.now();p.mood=Math.min(100,p.mood+6);bondFrom('trim',1,2);save();setupPet();say(p.name,[`喀嚓喀嚓……剪好了！`,`${p.name}變得清爽又整齊，開心地甩甩身體。`]);},1300);}
function furFx(){const d=document.createElement('div');d.className='furfx';d.innerHTML='<b>✂️</b>'+Array.from({length:22},(_,i)=>`<i style="left:${8+Math.random()*84}%;animation-delay:${(Math.random()*.7).toFixed(2)}s;width:${8+Math.random()*12}px;height:${5+Math.random()*7}px"></i>`).join('');document.body.appendChild(d);setTimeout(()=>d.remove(),2600);}
function setupPet(){teardownPet();if(!W.pet){renderPet();refreshPuppies();return;}const p=W.pet;if(TS()&&p.kind==='dog'&&p.coat==='maltese'){p.coat='hudie';save();}
  const days=p.seen?Math.floor((Date.now()-p.seen)/864e5):0;if(days>0){p.full=Math.max(15,p.full-days*15);p.mood=Math.max(15,p.mood-days*10);}p.seen=Date.now();
  if(p.kind==='cat'){const c=CATS.find(x=>(x.origName||x.name)===p.src);if(c){PETOBJ=c;c.name=p.name;}}
  else{PETOBJ=makeDog(p.coat);PETOBJ.name=p.name;CATS.push(PETOBJ);}
  if(PETOBJ){PETOBJ.isPet=true;PETOBJ.wait=false;PETOBJ.g.position.set(P.pos.x+1.2,P.pos.y,P.pos.z+1.2);PETOBJ.by=P.pos.y;}
  petHungryWarned=false;refreshPuppies();renderPet();}
function teardownPet(){const o=PETOBJ;PETOBJ=null;if(o){o.isPet=false;o.wait=false;o.trick=null;if(o.bub)o.bub.visible=false;
  if(o.dog){scene.remove(o.g);const i=CATS.indexOf(o);if(i>=0)CATS.splice(i,1);}else{o.name=o.origName||o.name;o.state='sit';o.t=2;o.follow=0;}}refreshPuppies();}
function askName(def,cb){say('取名字 · Name',['幫牠取一個名字吧！'],{choices:[{label:'',fn:null}]});DLG.typed=DLG.full.length;$('dialog').querySelector('.txt').textContent=DLG.full;
  const box=$('dialog').querySelector('.choices');box.innerHTML='';const i=document.createElement('input');i.id='petNameIn';i.maxLength=8;i.value=def;i.className='name-in';i.setAttribute('aria-label','寵物名字');
  const b=document.createElement('button');b.type='button';b.textContent='就叫這個名字';const go=()=>{const v=(i.value||'').trim()||def;closeDlg();cb(v);};
  b.onclick=e=>{e.stopPropagation();go();};i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();go();}});i.addEventListener('click',e=>e.stopPropagation());
  box.appendChild(i);box.appendChild(b);setTimeout(()=>{i.focus();i.select();},60);}
function adoptCat(c,name){W.pet={kind:'cat',src:c.origName||c.name,name,full:80,mood:85,bond:0,seen:Date.now()};histAdd('pet',`領養了小貓「${name}」`);save();setupPet();SND.stamp();heart(c.g.position);
  say(name,[`${name}成為你的寵物了！`,'記得常常餵牠、摸摸牠、陪牠玩。按 P 或點左下角的寵物卡，就能照顧牠。']);}
function adoptDog(coat,name){W.pet={kind:'dog',coat,name,full:80,mood:85,bond:0,seen:Date.now()};histAdd('pet',`領養了小狗「${name}」`);save();setupPet();SND.stamp();SND.bark(P.pos);
  say('村田爺爺',[`好孩子，${name}就交給你了。`,'狗狗要吃「狗狗肉乾」，便利商店的寵物用品區有賣。按 P 可以照顧牠。']);}
SND.bark=function(pos){if(!A.ready)return;const t=A.ctx.currentTime,o=dest(pos);[0,.22].forEach(d=>{tone(560,t+d,.13,'sawtooth',.05,o,360);nburst(t+d,.1,'bandpass',900,2,.06,o);});};
function petVoice(){if(!PETOBJ)return;if(PETOBJ.dog)SND.bark(PETOBJ.g.position);else SND.meow(PETOBJ.g.position);}
function petSeq(o,name){const M=o&&o.spr&&o.spr.meta,A_=M&&M.anims&&M.anims[name];if(!A_)return false;o.anim={type:'seq',name,t:0,dur:A_.d.reduce((a,b)=>a+b,0)};o.rest=false;if(name!=='jump')o.still=0;return true;}
function petHop(){if(!PETOBJ)return;if(!PETOBJ.rest&&petSeq(PETOBJ,'jump')){PETOBJ.getUp=.5;}else{PETOBJ.hop=.6;PETOBJ.anim={type:'jump',t:0,dur:.6};}heart(PETOBJ.g.position);}
// a pet that stood still for a while lies down (drawn transition) and must get up (drawn transition) before it walks again
function petWake(o){if(o.rest){o.rest=false;o.still=0;if(petSeq(o,'get_up'))o.getUp=o.anim.dur;}return !(o.getUp>0);}
function bondUp(n){const p=W.pet;if(!p)return;const before=petLv();p.bond+=n;const after=petLv();
  if(after>before){const t=TRICKS.find(x=>x[0]===after);SND.stamp();toast(`${p.name}升到 Lv.${after}！${t?`學會了「${t[2]}」`:''}`);}renderPet();}
function petEvent(kind){if(!W.pet)return;if(kind==='ok')petHop();if(kind==='stamp'){bondUp(5);petHop();petVoice();}if(kind==='daily'){bondUp(2);petHop();}save();}
function openPetMenu(){if(!started||uiOpen())return;
  if(!W.pet){say(null,['你還沒有寵物。','鎮上的貓咪，餵牠三次小魚乾就會想跟你回家；巴士站的村田爺爺家也有小狗在找主人（要先拿到 3 個印章）。']);return;}
  const p=W.pet,lv=petLv(),o=PETOBJ,tricks=TRICKS.filter(t=>lv>=t[0]);
  choose(`${p.name}（${p.kind==='cat'?'貓咪':'小狗'}）Lv.${lv}`,`飽足 ${Math.round(p.full)}%・心情 ${Math.round(p.mood)}%・親密度 ${p.bond}${lv<PET_LV.length?`（再 ${petNext()} 點升到 Lv.${lv+1}）`:'（已經滿級！）'}`,[
    {label:'餵牠吃東西',fn:feedMenu},{label:'摸摸牠',fn:petPat},{label:'陪牠玩',fn:petPlay},...(p.coat==='hudie'?[{label:`✂️ 幫牠剪毛（毛：${HUDIE_FUR[hudieFur()]}）`,fn:hudieTrim}]:[]),
    ...(tricks.length?[{label:'叫牠表演把戲',fn:trickMenu}]:[]),
    {label:o&&o.wait?'叫牠跟我走':'叫牠在這裡等我',fn:()=>{if(!o)return;o.wait=!o.wait;if(o.wait){o.wx=o.g.position.x;o.wz=o.g.position.z;}say(null,[o.wait?`${p.name}乖乖坐下來等你。`:`${p.name}開心地跟上來了！`]);}},
    {label:'改名字',fn:()=>askName(p.name,n=>{p.name=n;if(o)o.name=n;save();renderPet();say(null,[`牠現在叫「${n}」了！`]);})},
    {label:'離開',fn:null}]);}
function feedMenu(){const p=W.pet;const own=Object.keys(W.items).filter(k=>PET_SAFE.cat[k]||PET_SAFE.dog[k]||PET_OK[k]||PET_BAD[k]);
  if(!own.length){say(null,[`你身上沒有${p.name}可以吃的東西。去便利商店「雜貨・寵物用品」買${p.kind==='cat'?'小魚乾':'狗狗肉乾'}吧！`]);return;}
  choose('餵食',`要給${p.name}吃什麼？`,[...own.map(k=>({label:`${k}（有 ${W.items[k]} 個）`,fn:()=>feed(k)})),{label:'不餵了',fn:null}]);}
function feed(k){const p=W.pet;if(!PET_BAD[k])setTimeout(()=>dailyEvent('feed'),0);if(PET_BAD[k]){SND.wrong();say('等一下！',[PET_BAD[k],`（${k}沒有給牠吃，還在你身上）`]);return;}
  let r=PET_SAFE[p.kind][k]||PET_OK[k];if(!r)r=[15,2,p.kind==='cat'?'貓咪吃了一點點狗狗肉乾。還是小魚乾比較適合貓咪喔。':'狗狗吃了小魚乾，不過狗狗肉乾比較適合牠。'];
  if(PETOBJ&&!INDOOR&&actHas('i.feed')){const q=PETOBJ.g.position;actPlay('i.feed',{lock:true,hold:false,yaw:faceTo(q.x,q.z)});}addItem(k,-1);if(PETOBJ&&!petSeq(PETOBJ,'eat'))PETOBJ.anim={type:'eat',t:0,dur:2.2};if(PETOBJ)PETOBJ.getUp=2.4;p.full=Math.min(100,p.full+r[0]);p.mood=Math.min(100,p.mood+r[1]);if(p.full>30)petHungryWarned=false;bondFrom('feed',1,5);if(!PETOBJ||!PETOBJ.spr||!PETOBJ.spr.meta.anims)petHop();petVoice();save();renderPet();say(p.name,[r[2]]);}
function petPat(){const p=W.pet;const now=performance.now();if(PETOBJ&&!INDOOR&&actHas('i.pet')){const q=PETOBJ.g.position;actPlay('i.pet',{lock:true,dur:1.9,yaw:faceTo(q.x,q.z)});}petVoice();if(PETOBJ&&!PETOBJ.dog)setTimeout(()=>SND.purr(PETOBJ.g.position),400);
  if(p.patT&&now-p.patT<10000){say(p.name,[`${p.name}很舒服地瞇起眼睛。（剛剛才摸過，心情已經很好了）`]);return;}
  p.patT=now;p.mood=Math.min(100,p.mood+8);bondFrom('pat',1,10);petHop();save();say(p.name,[pick([`${p.name}蹭了蹭你的手。`,`${p.name}翻過來要你摸肚子。`,`${p.name}的尾巴開心地搖來搖去。`])]);}
function petPlay(){const p=W.pet,toy=p.kind==='cat'?'逗貓棒':'狗狗玩具球';
  if(!W.items[toy]){say(null,[`要陪${p.name}玩，需要「${toy}」。便利商店的寵物用品區有賣。`]);return;}
  const now=performance.now();if(p.playT&&now-p.playT<30000){say(p.name,[`${p.name}玩累了，在喘氣。等一下再玩吧！`]);return;}
  p.playT=now;p.mood=Math.min(100,p.mood+25);p.full=Math.max(0,p.full-5);bondFrom('play',2,6);if(PETOBJ)PETOBJ.trick={type:'spin',t:0};petHop();petVoice();save();
  say(p.name,[p.kind==='cat'?`你揮動逗貓棒，${p.name}跳起來撲了好幾次！`:`你把球丟出去，${p.name}飛奔過去又咬回來！`]);}
function trickMenu(){const p=W.pet,lv=petLv();if(p.full<25||p.mood<30){say(p.name,[p.full<25?`${p.name}肚子餓扁了，沒力氣表演……先餵牠吧！`:`${p.name}有點沒精神，先摸摸牠、陪牠玩一下吧。`]);return;}choose('表演把戲',`要${p.name}表演什麼？`,[...TRICKS.filter(t=>lv>=t[0]).map(t=>({label:t[2],fn:()=>{if(PETOBJ)PETOBJ.trick={type:t[1],t:0,dur:TRICK_DUR[t[1]]};petVoice();setTimeout(()=>heart(PETOBJ?PETOBJ.g.position:P.pos),900);say(null,[`${p.name}${t[2]}了！好厲害！`]);}})),{label:'不用了',fn:null}]);}
inter(new T.Vector3(-54,0,-35.2),1.5,'看看紙箱裡的小狗',()=>{
  if(W.pet){say('村田爺爺',[W.pet.kind==='dog'?`${W.pet.name}的兄弟姊妹還在這裡睡覺呢。要好好照顧牠喔！`:'小狗們在紙箱裡睡覺。你已經有寵物了，要好好照顧牠喔！']);return;}
  const n=stampsDone();if(n<3){say('村田爺爺',['我家的狗生了三隻小狗，想幫牠們找負責任的好主人。',`先去拿到 3 個印章，證明你很負責任，再來找我吧！（目前 ${n}/3）`]);return;}
  choose('村田爺爺','你真的很努力呢！要帶一隻小狗回家嗎？養狗要每天餵牠、陪牠玩喔。',[{label:'黃色的小狗',fn:()=>askName('小黃',nm=>adoptDog('yellow',nm))},{label:'黑色的小狗',fn:()=>askName('小黑',nm=>adoptDog('black',nm))},{label:'白色的小狗',fn:()=>askName('小白',nm=>adoptDog('white',nm))},{label:'再想想',fn:null}]);});
const bubTex=(()=>{const [c,g]=C2(128,64);g.fillStyle='rgba(255,255,255,.92)';rrect(g,4,4,120,44,18);g.fill();g.beginPath();g.moveTo(54,46);g.lineTo(64,60);g.lineTo(72,46);g.fill();g.fillStyle='#3a2a20';g.font=`700 22px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('肚子餓…',64,27);return new T.CanvasTexture(c);})();
function petTick(dt){const p=W.pet;if(!p)return;if(PETOBJ&&!PETOBJ.wait&&!INDOOR&&P.moving>.5){p.walk=(p.walk||0)+P.moving*dt;if(p.walk>=150){p.walk=0;if(bondFrom('walk',1,10))petHop();}}p.full=Math.max(0,p.full-dt/30);p.mood=Math.max(0,p.mood-dt/(p.full<25?20:45));p.seen=Date.now();
  if(p.full<25&&!petHungryWarned){petHungryWarned=true;toast(`${p.name}肚子餓了，記得餵牠！`);}
  const o=PETOBJ;if(o){if(!o.bub){o.bub=new T.Sprite(new T.SpriteMaterial({map:bubTex,transparent:true,depthWrite:false}));o.bub.scale.set(.9,.45,1);scene.add(o.bub);}
    o.bub.visible=p.full<25&&!INDOOR;if(o.bub.visible)o.bub.position.set(o.g.position.x,o.g.position.y+(o.dog?1.15:.9)+Math.sin(time*2)*.05,o.g.position.z);}
  if((petRenderT-=dt)<=0){petRenderT=1;renderPet();}if((petSaveT-=dt)<=0){petSaveT=10;save();}}
function renderPet(){const box=$('petBox');const p=W.pet;box.hidden=!p||!started;if(!p)return;
  $('pbIc').textContent=p.kind==='cat'?'貓':'狗';$('pbName').textContent=p.name;$('pbLv').textContent=`Lv.${petLv()}`;
  $('pbFull').style.width=`${Math.round(p.full)}%`;$('pbMood').style.width=`${Math.round(p.mood)}%`;box.classList.toggle('hungry',p.full<25);}
$('petBtn').onclick=()=>openPetMenu();
/* ================================================================
   Quest tracker, guide arrow, tips
   ================================================================ */
const QT={pin:null,open:!IS_TOUCH,t:0,last:''};
function questTasks(){const list=allStamps().map(s=>{const st=s.st;let pos=null,where=s.where;
    if(st)pos=(SPOTS[st.spot]||{}).pos||null;else if(s.id==='safety')pos=GUARD.pos;
    else if(s.id==='glass'){const onBeach=P.pos.z<-44.3&&!(P.pos.x>72.6&&P.pos.x<77.4);if(onBeach){let best=null,bd=1e9;GLASS.forEach(g=>{if(g.got)return;const d=Math.hypot(g.x-P.pos.x,g.z-P.pos.z);if(d<bd){bd=d;best=new T.Vector3(g.x,beachH(g.z),g.z);}});pos=best;}else pos=new T.Vector3(-30,0,-42.6);}
    const r=W.st[s.id];const status=stampDone(s.id)?(r?`答對 ${r.c}/${r.t}`:s.id==='glass'?'5/5':'完成'):s.id==='glass'?`${W.glass.length}/5・${where}`:where;
    return {id:s.id,icon:s.subject,title:s.title?`${s.subject}・${s.title}`:s.subject,status,done:stampDone(s.id),pos};});
  let petPos=null;if(!W.pet){if(stampsDone()>=3)petPos=new T.Vector3(-54,0,-35.2);else{let bd=1e9;CATS.forEach(c=>{if(c.isPet||c.dog)return;const d=c.g.position.distanceTo(P.pos);if(d<bd){bd=d;petPos=c.g.position;}});}}
  list.push({id:'pet',icon:'寵',title:'領養一隻寵物（選做）',status:W.pet?`${W.pet.name} Lv.${petLv()}`:stampsDone()>=3?'巴士站的紙箱裡有小狗':'餵同一隻貓三次小魚乾，或拿 3 個印章找村田爺爺',done:!!W.pet,pos:petPos,optional:true});
  if(W.seat){const D=dailyState();const nd=D.ids.map(id=>DAILY_POOL.find(x=>x.id===id)).find(d=>d&&!D.done.includes(d.id));list.push({id:'daily',icon:'日',title:`今日任務 ${D.done.length}/${D.ids.length}`,status:nd?nd.t:'今天全部完成！',done:!nd,pos:null,optional:true});}
  {const G=goldList();if(G.length)list.push({id:'gold',icon:'金',title:'挑戰館金章（選做）',status:`${G.filter(s=>W.st[s.id]).length}/${G.length}・山上神社旁的挑戰館`,done:G.every(s=>W.st[s.id]),pos:CH_IN?null:CH.door,optional:true});}
  list.push({id:'submit',icon:'交',title:'繳交成績',status:W.submitted?'已打開表單':'按 Q 打開集章卡繳交',done:!!W.submitted,pos:null});
  return list;}
function questTarget(tasks){if(QT.mapNav){if(!!QT.mapNav.tb===tbIn())return QT.mapNav;}if(QT.pin){const t=tasks.find(x=>x.id===QT.pin&&!x.done&&x.pos);if(t)return t;QT.pin=null;}
  let best=null,bd=1e9;tasks.forEach(t=>{if(t.done||!t.pos||t.optional||t.id==='glass')return;const d=t.pos.distanceTo(P.pos);if(d<bd){bd=d;best=t;}});
  if(!best){const g=tasks.find(t=>t.id==='glass'&&!t.done);if(g)best=g;}return best;}
function iconChip(t){const st=subjStyle(t.icon);const s=document.createElement('span');s.className='q-ic';s.style.background=t.done?'rgba(243,234,217,.12)':st.c;s.textContent=t.done?'✓':(t.icon||'?')[0];return s;}
function renderQuests(){const tasks=questTasks(),ol=$('qList');const done=tasks.filter(t=>t.done&&!t.optional).length,total=tasks.filter(t=>!t.optional).length;$('qCount').textContent=`${done}/${total}`;
  const key=JSON.stringify(tasks.map(t=>[t.id,t.done,t.status]))+QT.pin+QT.open;if(key!==QT.last){QT.last=key;ol.innerHTML='';
    tasks.forEach(t=>{const li=document.createElement('li');const b=document.createElement('button');b.type='button';b.className='q-item'+(t.done?' done':'')+(QT.pin===t.id?' pinned':'');
      b.appendChild(iconChip(t));const tx=document.createElement('span');tx.className='q-tx';const tt=document.createElement('b');tt.textContent=t.title;const ss=document.createElement('span');ss.textContent=t.status;tx.appendChild(tt);tx.appendChild(ss);b.appendChild(tx);
      if(!t.done&&t.pos){const nav=document.createElement('span');nav.className='q-nav';nav.textContent=QT.pin===t.id?'導航中':'導航';b.appendChild(nav);}
      b.onclick=()=>{if(t.id==='submit'){openCard();return;}if(t.done||!t.pos)return;QT.pin=QT.pin===t.id?null:t.id;QT.last='';renderQuests();};li.appendChild(b);ol.appendChild(li);});}
  $('quests').classList.toggle('closed',!QT.open);$('qHead').setAttribute('aria-expanded',String(QT.open));return tasks;}
$('qHead').onclick=()=>{QT.open=!QT.open;QT.last='';renderQuests();};
document.querySelector('#quests .q-next').addEventListener('click',()=>{if(IS_TOUCH){QT.open=!QT.open;QT.last='';renderQuests();}});
// ground chevrons
// guide chevrons: a gold arrow with a dark brown rim, so it reads on dark asphalt AND on light concrete or grass
function chevGeo(k){const s=new T.Shape();s.moveTo(0,.42);s.lineTo(.36,.02);s.lineTo(.2,.02);s.lineTo(0,.24);s.lineTo(-.2,.02);s.lineTo(-.36,.02);s.closePath();
  const geo=new T.ShapeGeometry(s);geo.translate(0,-.22,0);geo.scale(k,k,1);geo.translate(0,.22,0);geo.rotateX(PI/2);return geo;}
const GUIDE=(()=>{const geo=chevGeo(1),geoO=chevGeo(1.32);const g=new T.Group();const mats=[],omats=[];
  for(let i=0;i<3;i++){const m=new T.MeshBasicMaterial({color:col('#ffc94d'),transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-8});
    const mo=new T.MeshBasicMaterial({color:col('#5a3410'),transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
    mats.push(m);omats.push(mo);const o=new T.Mesh(geoO,mo);o.position.z=i*.42;o.renderOrder=6;g.add(o);const c=new T.Mesh(geo,m);c.position.set(0,.005,i*.42);c.renderOrder=7;g.add(c);}
  g.visible=false;scene.add(g);return {g,mats,omats};})();
// ---- Sqoyaw navigation: the way to the next walking-tour stop (or your own house), following the lanes instead of a
// straight line over roofs and slopes. A small graph is built once from the lanes + 台7甲; Dijkstra on ~400 nodes.
const SQNAV={G:null,t:0,route:null,key:''};
function sqGraph(){if(SQNAV.G)return SQNAV.G;const N=[],E=[],line=[];
  const add=(x,z,l)=>{N.push([x,z]);E.push([]);line.push(l);return N.length-1;};const link=(a,b)=>{const d=Math.hypot(N[a][0]-N[b][0],N[a][1]-N[b][1]);E[a].push([b,d]);E[b].push([a,d]);};
  SQ_LANES.map(L=>L.p).concat([SQ_ROAD]).forEach((P_,li)=>{let prev=-1;for(let i=0;i<P_.length-1;i++){const [x0,z0]=P_[i],[x1,z1]=P_[i+1];const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/4));
    for(let k=0;k<n;k++){const t=k/n,id=add(x0+(x1-x0)*t,z0+(z1-z0)*t,li);if(prev>=0)link(prev,id);prev=id;}}const id=add(P_[P_.length-1][0],P_[P_.length-1][1],li);link(prev,id);});
  for(let a=0;a<N.length;a++)for(let b=a+1;b<N.length;b++)if(line[a]!==line[b]&&Math.hypot(N[a][0]-N[b][0],N[a][1]-N[b][1])<3.2)link(a,b);   // junctions
  return SQNAV.G={N,E};}
function sqNearNode(x,z){const {N}=sqGraph();let b=0,bd=1e9;N.forEach((n,i)=>{const d=Math.hypot(n[0]-x,n[1]-z);if(d<bd){bd=d;b=i;}});return [b,bd];}
// walkable test on a 0.5 m grid (cached — the village colliders never move): a cell is blocked when the player can't stand on it
const SQB=new Map();
function sqBlk(i,j){const k=i*100003+j;let v=SQB.get(k);if(v===undefined){const x=TB.x+i*.5,z=j*.5,p={x,z,y:groundH(x,z)};collide(p,.42);v=Math.hypot(p.x-x,p.z-z)>.04;SQB.set(k,v);}return v;}
function sqClear(ax,az,bx,bz){const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.25);for(let k=0;k<=n;k++){const t=k/(n||1);if(sqBlk(Math.round((ax+(bx-ax)*t)/.5),Math.round((az+(bz-az)*t)/.5)))return false;}return true;}
// A* between two points around obstacles (used for the bits of a route that leave the lanes: to/from a door, flag or past a prop)
function sqAstar(ax,az,bx,bz,lim=6000){const si=Math.round(ax/.5),sj=Math.round(az/.5),gi=Math.round(bx/.5),gj=Math.round(bz/.5);
  const key=(i,j)=>i*100003+j,H=(i,j)=>Math.hypot(i-gi,j-gj),g=new Map(),par=new Map(),heap=[];
  const push=(f,i,j)=>{heap.push([f,i,j]);let c=heap.length-1;while(c){const p=(c-1)>>1;if(heap[p][0]<=heap[c][0])break;[heap[p],heap[c]]=[heap[c],heap[p]];c=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let c=0;for(;;){const l=2*c+1,r=l+1;let m=c;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===c)break;[heap[m],heap[c]]=[heap[c],heap[m]];c=m;}}return top;};
  g.set(key(si,sj),0);push(H(si,sj),si,sj);let end=null,n=0;
  while(heap.length&&n++<lim){const [,i,j]=pop(),k=key(i,j),gc=g.get(k);if(H(i,j)<=1.8){end=[i,j];break;}
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ni=i+a,nj=j+b;if(sqBlk(ni,nj))continue;if(a&&b&&(sqBlk(i+a,j)||sqBlk(i,j+b)))continue;
      const nk=key(ni,nj),ng=gc+(a&&b?1.414:1);if(ng<(g.get(nk)??1e9)){g.set(nk,ng);par.set(nk,[i,j]);push(ng+H(ni,nj),ni,nj);}}}
  if(!end)return null;const pts=[];for(let c=end;c;c=par.get(key(c[0],c[1])))pts.push([c[0]*.5,c[1]*.5]);
  pts.reverse();pts[0]=[ax,az];pts.push([bx,bz]);
  const out=[pts[0]];let i=0;while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!sqClear(pts[i][0],pts[i][1],pts[j][0],pts[j][1]))j--;out.push(pts[j]);i=j;}return out;}
function sqRoute(ax,az,bx,bz){const {N,E}=sqGraph();const [s0,ds]=sqNearNode(ax,az),[t0,dt_]=sqNearNode(bx,bz);
  let R;
  if(Math.hypot(ax-bx,az-bz)<Math.max(ds,dt_)+6)R=[[ax,az],[bx,bz]];
  else{const D=new Float64Array(N.length).fill(1e9),Pv=new Int32Array(N.length).fill(-1),done=new Uint8Array(N.length);D[s0]=0;
    for(;;){let u=-1,bd=1e9;for(let i=0;i<N.length;i++)if(!done[i]&&D[i]<bd){bd=D[i];u=i;}if(u<0||u===t0)break;done[u]=1;for(const [v,w] of E[u])if(D[u]+w<D[v]){D[v]=D[u]+w;Pv[v]=u;}}
    const path=[];for(let v=t0;v>=0;v=Pv[v])path.push(N[v]);path.reverse();
    // don't walk back to a lane node that's behind you (or past the goal): join the lane at the next node instead
    const d2=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
    while(path.length>2&&d2([ax,az],path[1])<d2(path[0],path[1]))path.shift();
    while(path.length>2&&d2([bx,bz],path[path.length-2])<d2(path[path.length-1],path[path.length-2]))path.pop();
    R=[[ax,az],...path,[bx,bz]];}
  // any leg that runs into a wall, fence or prop is re-routed around it
  const out=[R[0]];for(let i=0;i<R.length-1;i++){const a=R[i],b=R[i+1];
    if(sqClear(a[0],a[1],b[0],b[1])){out.push(b);continue;}const L=sqAstar(a[0],a[1],b[0],b[1]);if(L)out.push(...L.slice(1));else out.push(b);}
  return out;}
function sqNavTarget(){return null;if(TS())return null;const nx=SQW.find(x=>!(W.sqw&&W.sqw[x.id]));
  if(nx)return {title:'走讀：'+nx.n,pos:new T.Vector3(TB.x+nx.p[0],0,nx.p[1]),sq:true};const h=TB.houses&&TB.houses[tbMySeat()];return h?{title:'回家：'+tbMySeat()+' 號',pos:new T.Vector3(TB.x+h.x,0,h.z),sq:true}:null;}
// route trail: the same glowing chevrons as the town guide, laid along the path and pulsing forward (Sqoyaw)
const CRUMBS=(()=>{const mk_=(geo,color,op,ro,po)=>{const m=new T.InstancedMesh(geo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:op,depthWrite:false,side:T.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:po,polygonOffsetUnits:po}),20);
    const c=new T.Color(color);for(let i=0;i<20;i++)m.setColorAt(i,c);m.count=0;m.renderOrder=ro;m.frustumCulled=false;scene.add(m);return m;};
  const fill=mk_(chevGeo(1.05),'#ffc94d',.95,7,-8);fill.rim=mk_(chevGeo(1.4),'#5a3410',.5,6,-6);return fill;})();
const _crC=new T.Color(),_crB=new T.Color('#ffc94d'),_crL=new T.Color('#fff2c4'),_crS=new T.Vector3();
function updateGuide(dt){const tasks=QT.tasks;if(!tasks)return;let tg=QT.target;
  const sqT=tbIn()&&!INDOOR&&!(tg&&tg.map)?sqNavTarget():null;if(sqT)tg=sqT;
  const show=started&&!INDOOR&&!ISL_IN&&!CY_IN&&(!tbIn()||(tg&&(tg.map||tg.sq)))&&!DLG.open&&!uiOpen()&&tg&&tg.pos;let dist=0;CRUMBS.count=CRUMBS.rim.count=0;
  let aim=tg&&tg.pos;
  if(show&&tbIn()){const ax=P.pos.x-TB.x,az=P.pos.z,bx=tg.pos.x-TB.x,bz=tg.pos.z;const key=tg.title;SQNAV.t-=dt;
    if(SQNAV.t<=0||SQNAV.key!==key){SQNAV.t=.6;SQNAV.key=key;SQNAV.route=sqRoute(ax,az,bx,bz);}
    const R_=SQNAV.route;if(R_){R_[0]=[ax,az];let acc=0,look=null,mtx=new T.Matrix4(),k=0,nextDot=2.6;dist=0;
      for(let i=0;i<R_.length-1;i++){const [x0,z0]=R_[i],[x1,z1]=R_[i+1],l=Math.hypot(x1-x0,z1-z0);dist+=l;
        const ya=Math.atan2(x1-x0,z1-z0);
        while(k<20&&nextDot<=acc+l&&nextDot<30){const t=(nextDot-acc)/(l||1),x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;const w=Math.max(0,Math.sin(time*4-k*.75)),fade=Math.max(.15,1-Math.max(0,nextDot-20)/10),sc=(1+.18*w)*(.6+.4*fade);
          mtx.makeRotationY(ya).scale(_crS.set(sc,1,sc)).setPosition(TB.x+x,tribeH(x,z)+.08,z);CRUMBS.setMatrixAt(k,mtx);CRUMBS.rim.setMatrixAt(k,mtx);
          CRUMBS.setColorAt(k,_crC.copy(_crB).lerp(_crL,w*.8));k++;nextDot+=1.35;}
        if(!look&&acc+l>=3){const t=(3-acc)/(l||1);look=[x0+(x1-x0)*t,z0+(z1-z0)*t];}acc+=l;}
      CRUMBS.count=CRUMBS.rim.count=dist>4?k:0;CRUMBS.instanceMatrix.needsUpdate=CRUMBS.rim.instanceMatrix.needsUpdate=true;if(CRUMBS.instanceColor)CRUMBS.instanceColor.needsUpdate=true;aim=new T.Vector3(TB.x+(look||R_[R_.length-1])[0],0,(look||R_[R_.length-1])[1]);}}
  if(show){const dx=aim.x-P.pos.x,dz=aim.z-P.pos.z;if(!tbIn())dist=Math.hypot(dx,dz);const a=Math.atan2(dx,dz);
    GUIDE.g.visible=dist>4;GUIDE.g.position.set(P.pos.x+Math.sin(a)*1.3,P.pos.y+.07,P.pos.z+Math.cos(a)*1.3);GUIDE.g.rotation.y=a;
    GUIDE.mats.forEach((m,i)=>{const w=Math.max(0,Math.sin(time*4-i*1.1));m.opacity=.45+.5*w;GUIDE.omats[i].opacity=.25+.35*w;});
    const fx=-Math.sin(cam.yaw),fz=-Math.cos(cam.yaw);const rel=Math.atan2(dx*fz-dz*fx,dx*fx+dz*fz);$('qArrow').style.transform=`rotate(${(-rel)*180/PI}deg)`;}
  else GUIDE.g.visible=false;
  const nt=$('qNextT'),nd=$('qNextD');
  if(CY_IN){nt.textContent='山上的小木屋';nd.textContent='門口按 E 進屋・小路盡頭的路牌可以下山或回車站';$('qArrow').style.transform='rotate(0deg)';}
  else if(ST_IN){nt.textContent=ST.ticket?`車票：${ST.ticket.name.replace(/（.*?）/,'')}`:'平等車站：從這裡出發！';nd.textContent=ST.ticket?'到右邊的剪票口按 E':'先到售票・服務台問站務員';$('qArrow').style.transform='rotate(0deg)';}
  else if(MZ_IN){const og=ADV.gates.filter(g=>g.open).length;nt.textContent=ADV.mzChest&&ADV.mzChest.claimed?'沿著光走出迷宮':`找到迷宮深處的寶箱（石門 ${og}/3）`;nd.textContent='看右上角的古老地圖；起點的繩子可以回到外面';$('qArrow').style.transform='rotate(0deg)';}
  else if(ISL_IN){const n=(W.adv&&W.adv.isl||[]).filter(Boolean).length;nt.textContent=W.adv&&W.adv.islDone?'搭船回小鎮':`點亮三塊石碑（${n}/3）`;nd.textContent=W.adv&&W.adv.islDone?'碼頭的小船按 E':'石碑前按 E 解謎';$('qArrow').style.transform='rotate(0deg)';}
  else if(INDOOR){nt.textContent=HOME_IN?'先走出房門':CH_IN?'先走出挑戰館':TC_IN?'老師的山上小屋':'先走出便利商店';nd.textContent=HOME_IN?'房門口按 E，或按「出門」':'門口按 E';$('qArrow').style.transform='rotate(0deg)';}
  else if(tbIn()&&!(tg&&tg.map)){const me=tbMySeat(),n=sqDone(),nx=SQW.find(x=>!(W.sqw&&W.sqw[x.id]));nt.textContent='環山 Sqoyaw';nd.textContent=TS()?'掛號碼牌的房子是同學的家，門口按 E':`自由走走${me?`・你的家是 ${me} 號`:''}・同學巷可以去同學家`;$('qArrow').style.transform='rotate(0deg)';}
  else if(tg){if(tg.map&&dist<3.5){QT.mapNav=null;QT.target=null;toast(`📍 到了：${tg.title.replace(/^導航：/,'')}`);}nt.textContent=tg.title;nd.textContent=tg.pos?(dist<4?'就在這附近，按 E':`約 ${Math.round(dist)} 公尺`):tg.status;}
  else{const all=tasks.filter(t=>!t.optional&&t.id!=='submit').every(t=>t.done);nt.textContent=all?'全部完成！':'自由探索';nd.textContent=all?'按 Q 繳交成績':'點任務清單開始導航';}}
function trackerTick(dt){if(!started)return;QT.t-=dt;if(QT.t<=0){QT.t=.5;QT.tasks=renderQuests();QT.target=questTarget(QT.tasks);tipCheck();}updateGuide(dt);}
// tips (each shown once per student)
const TIPS={move:IS_TOUCH?'用左下的搖桿走路，手指滑動畫面可以轉視角。':'用 W A S D 走路，按住滑鼠拖曳可以轉視角。',
  quest:'右上是任務清單。點任務會開始導航，地上的金色箭頭會帶你過去。',
  stamp1:'拿到第一個印章了！按 Q（或點「集章卡」）可以看所有印章。',
  coins:'金幣可以去便利商店或自動販賣機買東西。走到店門口按 E 就能進去逛。',
  pet3:'你已經有 3 個印章了！巴士站的村田爺爺好像有事想找你。',
  hungry:'寵物肚子餓的時候，按 P 打開照顧選單餵牠。',
  all:'所有印章都拿到了，太厲害了！按 Q 打開集章卡，按「繳交成績」。'};
let tipQ=[],tipT=0,tipGap=0,playT=0;
function tip(k){W.tips=W.tips||{};if(W.tips[k]||tipQ.includes(k))return;tipQ.push(k);}
function tipCheck(){playT+=.5;const n=stampsDone(),all=allStamps().length;
  if(playT>2)tip('move');if(playT>12)tip('quest');if(n>=1)tip('stamp1');if(n>=1&&W.coins>=20&&playT>20)tip('coins');if(n>=3&&!W.pet)tip('pet3');if(W.pet&&W.pet.full<25)tip('hungry');if(n>=all)tip('all');
  tipGap-=.5;const box=$('qTip');
  if(!box.hidden){tipT-=.5;if(tipT<=0){box.hidden=true;tipGap=3;}}
  else if(tipQ.length&&tipGap<=0){const k=tipQ.shift();W.tips[k]=true;save();$('qTipTxt').textContent=TIPS[k];box.hidden=false;tipT=30;}
  $('qDot').hidden=box.hidden||QT.open;}
$('qTipX').onclick=e=>{e.stopPropagation();$('qTip').hidden=true;tipGap=2;$('qDot').hidden=true;};

/* ================================================================
   Areas
   ================================================================ */
const AREAS=[
  {jp:'平等車站',en:'Pingdeng Station 平等車站',t:()=>ST_IN},
  {jp:'わたしの部屋',en:'My Room 我的房間',t:()=>HOME_IN},
  {jp:'挑戦館',en:'Challenge Hall 挑戰館',t:()=>CH_IN},
  {jp:'山の上の小屋',en:'Cabin on the Hill 山上小屋',t:()=>CY_IN},
  {jp:'先生の山小屋',en:"Teacher's Cabin 老師的山上小屋",t:()=>TC_IN},
  {jp:'滝の迷宮',en:'Waterfall Maze 瀑布迷宮',t:()=>MZ_IN},
  {jp:'神秘の島',en:'Mystery Island 神秘小島',t:()=>ISL_IN},
  {jp:'四季蘭溪吊橋',en:'Suspension Bridge 吊橋',t:(x,z)=>x>2300&&x<2490},
  {jp:'平等國小',en:'Pingdeng Elementary School',t:(x,z)=>x>2300&&Math.hypot(x-2540,z-(30))<17},
  {jp:'獵人步道登山口',en:'Hunter Trail 獵人步道',t:(x,z)=>x>2300&&Math.hypot(x-2529,z-(8))<6},
  {jp:'泰雅文物館',en:'Atayal Museum 文物館',t:(x,z)=>x>2300&&Math.hypot(x-2591,z-(-27))<8},
  {jp:'7-ELEVEN 環山門市',en:'Convenience Store 便利商店',t:(x,z)=>x>2300&&Math.hypot(x-2570,z-(163))<10},
  {jp:'環山派出所・環清宮',en:'Police & Temple',t:(x,z)=>x>2300&&Math.hypot(x-2600,z-(152))<14},
  {jp:'甜柿果園',en:'Persimmon Orchard 果園',t:(x,z)=>x>2300&&x-2600>-62&&x-2600<-24&&z>46&&z<80},
  {jp:'同學巷',en:'Classmates Lane',t:(x,z)=>x>2300&&x-2600>20&&x-2600<80&&z>-60&&z<-42},
  {jp:'台7甲',en:'Provincial Highway 7A',t:(x,z)=>x>2300&&sqNear(x-2600,z,SQ_ROAD)[0]<5},
  {jp:'環山產業道路',en:'Huanshan Farm Road',t:(x,z)=>x>2300&&sqNear(x-2600,z,SQ_LANES[9].p)[0]<4&&z>30},
  {jp:'環山二巷',en:'Huanshan Lane 2',t:(x,z)=>x>2300&&sqNear(x-2600,z,SQ_LANES[0].p)[0]<6},
  {jp:'Sqoyaw',en:'Qalang Sqoyaw 環山',t:(x,z)=>x>2300},
  {jp:'7-ELEVEN 環山門市 店內',en:'Inside the Store 便利商店',t:()=>INDOOR&&MART.from==='tribe'&&!HOME_IN&&!TC_IN&&!ST_IN},
  {jp:'ひだまりマート 店內',en:'Inside the Mart 便利商店',t:()=>INDOOR},
  {jp:'東防波堤',en:'East Breakwater 防波堤',t:(x,z)=>x>72&&x<78&&z<-44.5},
  {jp:'汐見浜',en:'Shiomi Beach 海灘',t:(x,z)=>z<-44.3},
  {jp:'汐見駅',en:'Shiomi Station 車站',t:(x,z)=>x>28&&x<64&&z>-36.5&&z<-31},
  {jp:'汐見踏切',en:'Railroad Crossing 平交道',t:(x,z)=>Math.abs(x)<9&&z>-35&&z<-24},
  {jp:'海岸通り',en:'Coast Road 海岸通路',t:(x,z)=>z<-33},
  {jp:'汐見神社',en:'Shrine on the Hill 山上神社',t:(x,z)=>x>-67&&x<-33&&z>46},
  {jp:'ひだまりマート',en:'Convenience Store 便利商店',t:(x,z)=>x>4&&x<26&&z>12.5&&z<30},
  {jp:'線路沿いの道',en:'Path by the Tracks 鐵道小路',t:(x,z)=>z<-22},
  {jp:'汐見銀座',en:'Shopping Street 商店街',t:(x,z)=>Math.abs(x)<7},
  {jp:'山手の住宅街',en:'Hillside Houses 住宅區',t:()=>true}];
let curArea=null,areaT=0,areaCool=0;
function areaCheck(){const a=AREAS.find(a=>a.t(P.pos.x,P.pos.z));if(a!==curArea){curArea=a;if(started&&!INDOOR)petArea(a.jp);dailyEvent('visit:'+a.jp);$('placeJp').textContent=a.jp;$('placeEn').textContent=a.en;
  if(areaCool<=0&&started){const at=$('areaTitle');at.querySelector('.jp').textContent=a.jp;at.querySelector('.en').textContent=a.en;at.classList.add('show');areaT=3.4;areaCool=6;}}}

/* ================================================================
   Input
   ================================================================ */
const keys={};let started=false,lastInput=0;
const cam={yaw:0,pitch:.2,dist:innerWidth<innerHeight?8.6:6.4,pos:new T.Vector3(),look:new T.Vector3()};
// sky follows the real clock (Taiwan sunrise/sunset through the year) so everyone online sees the same time of day;
// the teacher can still preview other times with T (local only), and pressing it through the cycle returns to 「現在」
const RTC={auto:false,tk:0,local:false,mode:null};
function classSky(){const m=CFG.sky;return m==='auto'||m==='night'||m==='sunset'?m:'day';}
const SKYJP={day:'白天',sunset:'傍晚',night:'夜晚',auto:'跟著真實時間'};
function realSky(){const n=new Date(),h=n.getHours()+n.getMinutes()/60+n.getSeconds()/3600;const d=(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())-Date.UTC(n.getFullYear(),0,0))/864e5;
  const sr=5.9-.8*Math.cos(2*PI*(d-172)/365),ss=17.95+.9*Math.cos(2*PI*(d-180)/365);let a='night',b='night',t=0;
  if(h>=sr-.7&&h<sr+.3){a='night';b='sunset';t=h-(sr-.7);}else if(h>=sr+.3&&h<sr+1.5){a='sunset';b='day';t=(h-(sr+.3))/1.2;}else if(h>=sr+1.5&&h<ss-1){a=b='day';}
  else if(h>=ss-1&&h<ss){a='day';b='sunset';t=h-(ss-1);}else if(h>=ss&&h<ss+.45){a=b='sunset';}else if(h>=ss+.45&&h<ss+1.3){a='sunset';b='night';t=(h-(ss+.45))/.85;}
  t=clamp(t,0,1);return {a,b,t:t*t*(3-2*t)};}
function applyRealSky(){const r=realSky();blendState(PS[r.a],PS[r.b],r.t,S);envFrom=envTo=PS[r.t<.5?r.a:r.b];envK=1;todIdx=ORDER.indexOf(r.t<.5?r.a:r.b);const l=$('tBtnLbl');if(l)l.textContent='現在';}
function realTick(dt){if(CUTON||RTC.local)return;const m=classSky();
  if(m==='auto'){if(RTC.mode!=='auto'){RTC.mode='auto';RTC.tk=0;}RTC.auto=true;RTC.tk-=dt;if(RTC.tk>0)return;RTC.tk=2;applyRealSky();return;}
  RTC.auto=false;if(RTC.mode===m)return;const first=RTC.mode===null;RTC.mode=m;const i=ORDER.indexOf(m);
  if(first){todIdx=i;blendState(PS[m],PS[m],1,S);envFrom=envTo=PS[m];envK=1;const l=$('tBtnLbl');if(l)l.textContent=PRESETS[m].jp;}
  else{setTime(i);if(started&&!TS())toast(`老師把天色換成「${SKYJP[m]}」了`);}}
function skyRestore(){RTC.local=false;RTC.mode=null;RTC.tk=0;}
// the T key / 時間 button: students see the teacher's choice; the teacher can preview other times on this device only
function timeBtn(){if(!TS()){toast(`天色由老師設定（現在是「${SKYJP[classSky()]}」）`);return;}
  if(!RTC.local){RTC.local=true;RTC.auto=false;RTC.step=0;setTime(0);toast('只有你這台在預覽；要全班一起換，請到老師面板 →「其他設定」→「天色」');return;}
  RTC.step=(RTC.step||0)+1;if(RTC.step>=3){skyRestore();toast(`回到全班的天色：${SKYJP[classSky()]}`);return;}setTime(RTC.step);}
// students pick up a new class sky without reloading (one small read a minute while playing)
setInterval(async()=>{if(!started||!W.seat||W.seat==='T'||document.hidden||!HOSTED)return;try{const r=await fbReq('/config');if(!r.ok)return;const j=await r.json();const c=JSON.parse(j.fields.d.stringValue);if(c&&c.sky!==CFG.sky)CFG.sky=c.sky;}catch(e){}},60000);
async function skySet(m){const prev=CFG.sky;CFG.sky=m;if(typeof ED!=='undefined'&&ED)ED.sky=m;skyRestore();
  if(!HOSTED){toast(`天色：${SKYJP[m]}（這個頁面沒有連雲端，只改這台）`);return true;}
  try{const c=JSON.parse(JSON.stringify(CFG));await cfgPut(c);toast(`全班的天色換成「${SKYJP[m]}」，學生一分鐘內會跟著換`);return true;}catch(e){CFG.sky=prev;if(typeof ED!=='undefined'&&ED)ED.sky=prev;skyRestore();toast('連不上雲端，天色還沒換，請確認網路再試');return false;}}
function setTime(i){todIdx=i;envFrom=blendState(S,S,0,{});envTo=PS[ORDER[i]];envK=0;clockBase=performance.now();$('tBtnLbl').textContent=PRESETS[ORDER[i]].jp;toast(`${PRESETS[ORDER[i]].jp} · ${['傍晚','夜晚','午後'][i]}`);}
$('cineExit').onclick=()=>toggleCine();
function toggleCine(){document.body.classList.toggle('cine');$('bCine').setAttribute('aria-pressed',document.body.classList.contains('cine'));}
function toggleSound(){A.on=!A.on;$('bSound').setAttribute('aria-pressed',A.on);applyVolumes();}
function toggleMusic(){A.music=!A.music;$('bMusic').setAttribute('aria-pressed',A.music);applyVolumes();}
function toggleHelp(){const h=$('help');h.hidden=!h.hidden;$('bHelp').setAttribute('aria-pressed',!h.hidden);document.body.classList.remove('menuopen');$('bMenu').setAttribute('aria-expanded','false');}
$('helpClose').onclick=()=>{$('help').hidden=true;$('bHelp').setAttribute('aria-pressed','false');};
$('bMenu').onclick=()=>{if(!$('journal').hidden){closeJournal();return;}openJournal();};
// ---- 旅人手帳 (art pack v0.2 menu): one sheet with every entry point; the old top-bar toggles live in its 設定 list
let ACTV=null;
function actVerb(l){const v=!l?'互動':l==='下一句'?'下一句':/^站起來/.test(l)?'站起來':/離開|出門|回到|回家|出去/.test(l)?'離開':/走進|進入|進去|進浴室|走入|搭/.test(l)?'進入':/躺|睡/.test(l)?'休息':/坐/.test(l)?'坐下':/投籃/.test(l)?'投籃':/說話|聊天|打招呼|問/.test(l)?'說話':/摸摸/.test(l)?'摸摸':/買|逛|結帳|販賣|扭蛋/.test(l)?'購買':/看|讀|閱讀|公告|故事|照片|地圖|書/.test(l)?'查看':/溜|拉|玩|跳/.test(l)?'玩':'互動';
  if(v===ACTV)return;ACTV=v;const b=$('tAct');if(b)b.innerHTML=`<span>${v}</span>`;}
function closeJournal(){$('journal').hidden=true;$('bMenu').setAttribute('aria-expanded','false');}
function openJournal(){if(!started)return;const J=$('journal'),grid=$('jnGrid'),set=$('jnSet');
  const go=fn=>()=>{closeJournal();setTimeout(fn,30);};
  const tiles=[['bag','背包',()=>openBag()],['stamp','集章・繳交',()=>$('bCard').click()],['paw',W.pet?`我的寵物・${W.pet.name}`:'我的寵物',()=>openPetMenu()],
    ['book','錯題本',()=>openWrongBook()],['map','地圖',()=>$('bMap').click()],['home','換造型',()=>openDress()]];
  if(!$('bTeacher').hidden)tiles.push(['teacher','老師頁',()=>$('bTeacher').click()]);
  if(!$('bPortal').hidden)tiles.push(['arrow','任意門',()=>$('bPortal').click()]);
  grid.innerHTML='';tiles.forEach(([ic,t,fn])=>{const b=document.createElement('button');b.type='button';b.className='jn-tile';b.innerHTML=ICON(ic)+`<span>${t}</span>`;b.onclick=go(fn);grid.appendChild(b);});
  const on=id=>$(id).getAttribute('aria-pressed')==='true';
  const rows=[['音效',()=>on('bSound')?'開啟':'關閉',()=>{$('bSound').click();openJournal();}],['背景音樂',()=>on('bMusic')?'開啟':'關閉',()=>{$('bMusic').click();openJournal();}],
    ['時間',()=>$('tBtnLbl').textContent,()=>{$('bTime').click();setTimeout(openJournal,40);}],['電影模式',()=>'看風景、拍照用',go(()=>$('bCine').click())],
    ['版本',()=>typeof SHIOMI_BUILD!=='undefined'?SHIOMI_BUILD:'測試',()=>toast('目前版本：'+(typeof SHIOMI_BUILD!=='undefined'?SHIOMI_BUILD:'測試'))],['畫面',()=>GFX.lite?'省電（比較順）':'標準',()=>{gfxToggle();openJournal();}],['操作說明',()=>'',go(()=>$('bHelp').click())],['換人・登出',()=>W.seat?`${W.seat==='T'?'老師':W.seat+' 號'}`:'',go(()=>$('switchUser').click())]];
  set.innerHTML='';rows.forEach(([t,v,fn])=>{const b=document.createElement('button');b.type='button';b.className='jn-row';b.innerHTML=`<b>${t}</b><span>${v()}</span>`+ICON('arrow');b.onclick=fn;set.appendChild(b);});
  J.hidden=false;$('bMenu').setAttribute('aria-expanded','true');}
document.querySelectorAll('i[class^="ic-"]').forEach(el=>{el.outerHTML=ICON(el.className.slice(3));});
$('jnClose').onclick=closeJournal;$('jnGo').onclick=closeJournal;$('journal').addEventListener('pointerdown',e=>{if(e.target.id==='journal')closeJournal();});
['bTime','bSound','bMusic','bCine','bTeacher','bPortal','bMap'].forEach(id=>$(id).addEventListener('click',()=>{if(id!=='bSound'&&id!=='bMusic'){document.body.classList.remove('menuopen');$('bMenu').setAttribute('aria-expanded','false');}}));
const uiOpen=()=>!!(document.getElementById('journal')&&!document.getElementById('journal').hidden)||!!(document.getElementById('typeq')&&!document.getElementById('typeq').hidden)||!$('card').hidden||!$('teacher').hidden||DRESS.on||!$('decor').hidden||!$('board').hidden||!$('cabin').hidden||!$('msgp').hidden||!$('story').hidden||!!(document.getElementById('shop')&&!document.getElementById('shop').hidden)||!!(document.getElementById('portal')&&!document.getElementById('portal').hidden)||!!(document.getElementById('mapv')&&!document.getElementById('mapv').hidden)||!!(document.getElementById('bag')&&!document.getElementById('bag').hidden);
let nearest=null;
let lastAct=0;
$('prompt').addEventListener('pointerdown',e=>{if(!IS_TOUCH||!$('prompt').classList.contains('show'))return;e.preventDefault();e.stopPropagation();interact();});
function interact(){if(!started||uiOpen()||CUTON)return;if(DLG.open){advance();return;}
  const now=performance.now();if(now-lastAct<420||ACT.on&&ACT.lock)return;lastAct=now;   // no double-open / double reward from repeated presses
  if(P.sit){standUp();return;}
  if(nearest){nearest.act();}}
function playerJump(){if(!started||uiOpen()||CUTON||DLG.open||P.sit||ACT.on&&ACT.lock)return;if(INDOOR||R2.on||S2.on){toast('在室內不能跳喔，到外面再跳！');return;}if(actHas('s.jump'))actPlay('s.jump',{lock:true});}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();const tg=e.target&&e.target.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'){if(k==='escape'&&!$('teacher').hidden)closeTeacher();return;}
  if(!$('teacher').hidden){if(k==='escape')closeTeacher();return;}
  if(!$('cabin').hidden){if(k==='escape')closeCabin();return;}
  if(DRESS.on)return;
  if(!started)return;
  if(!$('card').hidden){if(k==='escape'||k==='q')closeCard();return;}
  if(tg==='BUTTON'&&(k===' '||k==='enter'))return;
  keys[k]=true;lastInput=performance.now();
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(e.repeat)return;
  if(k==='e'||k==='enter'||k===' ')interact();
  else if(k==='j')playerJump();
  else if(k==='q'&&!DLG.open)openCard();
  else if(k==='p'&&!DLG.open)openPetMenu();
  else if(k==='t'&&TS())timeBtn();
  else if(k==='c')toggleCine();
  else if(k==='m')toggleSound();
  else if(k==='b')toggleMusic();
  else if(k==='h')toggleHelp();
  else if(k==='escape'){closeDecor();closeBoard();if(DLG.open&&!DLG.choices)closeDlg();$('help').hidden=true;$('bHelp').setAttribute('aria-pressed',false);}
  else if(/^[1-9]$/.test(k)&&DLG.open&&DLG.choices)pickChoice(+k-1);});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const cv=renderer.domElement;let drag=null;
cv.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,far:0};cv.setPointerCapture(e.pointerId);cv.classList.add('drag');lastInput=performance.now();cv.focus({preventScroll:true});});
cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.far=Math.max(drag.far,Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0));const s=e.pointerType==='touch'?1.4:1;
  cam.yaw-=dx*.0048*s;cam.pitch=clamp(cam.pitch+dy*.0036*s,-.12,1.15);lastInput=performance.now();});
const endDrag=e=>{if(drag&&drag.id===e.pointerId){const moved=Math.max(drag.far,Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0));drag=null;cv.classList.remove('drag');if(e.type==='pointerup'&&moved<8)clickWalk(e);}};
// click on the ground (outdoors) → walk there
const GOALM=(()=>{const m=new T.Mesh(new T.RingGeometry(.28,.42,28).rotateX(-PI/2),new T.MeshBasicMaterial({color:col('#ffc94d'),transparent:true,opacity:.9,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-8}));m.renderOrder=7;m.visible=false;scene.add(m);return m;})();
function goalMark(p){if(!p){GOALM.visible=false;return;}GOALM.position.set(p.x,groundH(p.x,p.z)+.06,p.z);GOALM.visible=true;GOALM.userData.t=0;}
function clickWalk(e){if(!started||CUTON||DLG.open||uiOpen()||INDOOR||R2.on||S2.on||HOME.edit||P.sit||(ACT.on&&ACT.lock))return;
  const r=cv.getBoundingClientRect(),nd=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);const rc=new T.Raycaster();rc.setFromCamera(nd,camera);const o=rc.ray.origin,dv=rc.ray.direction;
  let hit=null,prev=0;for(let t=.5;t<160;t+=.5){const x=o.x+dv.x*t,y=o.y+dv.y*t,z=o.z+dv.z*t;if(y<=groundH(x,z)){let a=prev,b=t;for(let k=0;k<8;k++){const m=(a+b)/2;if(o.y+dv.y*m<=groundH(o.x+dv.x*m,o.z+dv.z*m))b=m;else a=m;}hit={x:o.x+dv.x*b,z:o.z+dv.z*b};break;}prev=t;}
  if(!hit)return;const int=INT.some(it=>it.pos&&Math.hypot(it.pos.x-hit.x,it.pos.z-hit.z)<(it.r||1.5)+.8);
  P.goal={x:hit.x,z:hit.z,t:0,best:1e9,st:0,int};goalMark(hit);lastInput=performance.now();}
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*(1+Math.sign(e.deltaY)*.08),2.8,14);},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
$('bTime').onclick=()=>timeBtn();$('bSound').onclick=toggleSound;$('bMusic').onclick=toggleMusic;$('bCine').onclick=toggleCine;$('bHelp').onclick=toggleHelp;
// touch
const STK={x:0,y:0,id:null};let touchRun=false;
if(IS_TOUCH){$('touch').hidden=false;const st=$('stick'),kn=$('knob');
  st.addEventListener('pointerdown',e=>{STK.id=e.pointerId;st.setPointerCapture(e.pointerId);mv(e);});
  const mv=e=>{if(STK.id!==e.pointerId)return;const r=st.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/50,y=(e.clientY-r.top-r.height/2)/50;let l=Math.hypot(x,y);if(l>1){x/=l;y/=l;l=1;}kn.style.transform=`translate(${x*38}px,${y*38}px)`;
    const k=l<.14?0:Math.pow((l-.14)/.86,1.25)/l;STK.x=x*k;STK.y=y*k;STK.fullT=l>.95?(STK.fullT||performance.now()):0;lastInput=performance.now();};
  st.addEventListener('pointermove',mv);const up=e=>{if(STK.id!==e.pointerId)return;STK.id=null;STK.x=STK.y=0;STK.fullT=0;kn.style.transform='';};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  $('tAct').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
  $('tCard').addEventListener('pointerdown',e=>{e.preventDefault();$('card').hidden?openCard():closeCard();});
  $('tRun').addEventListener('pointerdown',e=>{e.preventDefault();touchRun=!touchRun;$('tRun').setAttribute('aria-pressed',touchRun);});
  $('tJump').addEventListener('pointerdown',e=>{e.preventDefault();playerJump();});}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// 畫面：標準 / 省電 (per device). 省電 = fewer pixels (resolution 1×) and no real-time sun shadows: the two biggest costs on an old phone.
const GFX={lite:(()=>{try{const v=localStorage.getItem('shiomi_gfx');if(v)return v==='lite';}catch(e){}return !!(navigator.deviceMemory&&navigator.deviceMemory<=3);})()};
function gfxApply(){const d=window.devicePixelRatio||1;renderer.setPixelRatio(GFX.lite?Math.min(d,1):Math.min(d,IS_TOUCH?1.25:1.75));renderer.setSize(innerWidth,innerHeight);sun.castShadow=!GFX.lite;}
function gfxToggle(){GFX.lite=!GFX.lite;try{localStorage.setItem('shiomi_gfx',GFX.lite?'lite':'std');}catch(e){}gfxApply();toast(GFX.lite?'畫面改成「省電」：比較順，畫面稍微沒那麼細':'畫面改成「標準」');}
gfxApply();

/* ================================================================
   Login / start / logout
   ================================================================ */
function start(){if(started)return;started=true;setTimeout(renderPet,0);audioInit();if(A.ctx&&A.ctx.state==='suspended')A.ctx.resume();$('title').classList.add('gone');document.body.classList.add('playing');
  P.yaw=PI;cam.yaw=0;cam.pitch=camera.aspect<1?.26:.2;curArea=null;areaCool=0;setTimeout(()=>{if(started)$('title').hidden=true;},1500);cv.focus({preventScroll:true});
  $('bTeacher').hidden=!TS();$('bPortal').hidden=!TS();document.body.classList.toggle('tsess',TS());setTimeout(()=>{if(W.pet&&bondFrom('meet',2,1))toast(`${W.pet.name}看到你好開心！親密度 +2`);},4000);enterStation({now:true,login:true});}
let TEACH_LOGIN=false;
async function tHash(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('shiomi:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}catch(e){return 'x'+s;}}
function teacherGo(){TEACH_LOGIN=true;$('inSeat').value='T';$('inName').value='老師';$('loginForm').requestSubmit();}
const T_ENTRY=HOSTED&&/[?&#]teacher\b/.test(location.href);if(T_ENTRY)$('teacherLogin').hidden=false;
$('teacherLogin').onclick=()=>{if(!IS_T&&!T_ENTRY)return;if(!CFG.tpass&&!T_ENTRY){teacherGo();return;}const w=$('tpWrap');w.hidden=false;
  $('inTPass').placeholder=CFG.tpass?'老師密碼':'第一次使用：請設定老師密碼（至少 4 個字）';$('inTPass').focus();};
$('tpGo').onclick=async()=>{const v=$('inTPass').value.trim(),e=$('loginErr');
  if(T_ENTRY&&!CFG.tpass){if(v.length<4){e.textContent='密碼至少要 4 個字';e.hidden=false;return;}const h=await tHash(v);
    try{const c=JSON.parse(JSON.stringify(CFG));c.tpass=h;await cfgPut(c);CFG.tpass=h;}catch(err){e.textContent='連不上雲端，密碼還沒存好，請確認網路再試';e.hidden=false;return;}
    IS_T=true;$('tpWrap').hidden=true;$('inTPass').value='';e.hidden=true;toast('老師密碼設好了！之後用這組密碼登入');teacherGo();return;}
  const h=await tHash(v);if(h===CFG.tpass){if(T_ENTRY)IS_T=true;$('tpWrap').hidden=true;$('inTPass').value='';teacherGo();}else{e.textContent='老師密碼不對';e.hidden=false;}};
$('inTPass').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('tpGo').click();}});
if(CFG.classPass)$('passWrap').hidden=false;
let LOGGING=false;
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(LOGGING)return;const seat=$('inSeat').value.trim().replace(/[^0-9A-Za-z-]/g,''),name=$('inName').value.trim();const err=$('loginErr');
  const asT=TEACH_LOGIN&&IS_T;TEACH_LOGIN=false;
  if(!seat||!name){err.textContent='請填寫座號和姓名。';err.hidden=false;return;}
  if(!asT&&seat.toUpperCase()==='T'){err.textContent='這個座號不能使用，請輸入你的座號。';err.hidden=false;return;}
  if(!asT&&CFG.classPass&&$('inPass').value.trim().toLowerCase()!==String(CFG.classPass).trim().toLowerCase()){err.textContent='班級密碼不對喔，再問問老師。';err.hidden=false;return;}err.hidden=true;
  let old=loadSeat(seat);RSV0=0;
  // the cloud copy of this seat, if it is newer than this device's (wait at most 5 s, then carry on with the local one)
  {LOGGING=true;err.textContent='讀取存檔中…';err.classList.add('wait');err.hidden=false;let cl=null,cok=false;
    let gl=[];try{[cl,gl]=await Promise.race([Promise.all([cloudGet(seat),giftList(seat).catch(()=>[])]),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),5000))]);cok=true;}catch(x){}
    LOGGING=false;err.hidden=true;err.classList.remove('wait');
    const rt=Math.max(+(CFG.resets||{})[seat]||0,...(gl||[]).map(g=>+(g&&g.reset)||0));RSV0=rt;CLOUD.rst[seat]=rt;
    if(cl&&!saveOk(cl,rt)){cloudDel(seat);cl=null;}
    if(old&&!saveOk(old,rt)){try{localStorage.removeItem(SKEY(seat));}catch(e){}old=null;}
    if(cl&&old)old=mergeSaves(cl,old);else if(cl)old=cl;
    clearTimeout(CLOUD.timer);CLOUD.timer=0;CLOUD.dirty=false;CLOUD.at=0;CLOUD.okT=0;CLOUD.fails=0;CLOUD.ver=cok;CLOUD.base=old?(+old.last||0):0;CLOUD.st=cok?'ok':'fail';}
  Object.assign(W,{seat,name,coins:CFG.startCoins,items:{},glass:[],st:{},safety:null,time:0,look:null,pet:null,catFriend:{},tips:{},submitted:false,home:null,furn:{},homeSeen:false,daily:null,req:{},reqReady:{},reqNote:{},reads:[],newsSeen:[],att:{},adv:{},tcSeen:false,pomo:{},hist:[],seenQ:{},histInit:true,stSeen:false,ledger:[],play:{},moneyGoal:null,gifts:[],wild:null,clean:null,wrong:[]});
  PLAY.warned=0;PLAY.snooze=0;if(!old)setTimeout(()=>led(CFG.startCoins,'開始的零用錢','其他'),0);
  if(old){Object.assign(W,old,{seat,name,histInit:!!old.histInit});}W.rsv=RSV0;RS_LOCK=false;
  if(old){W.glass=Array.isArray(W.glass)?W.glass:[];W.st=W.st||{};W.items=W.items||{};cleanLook(W.look);histBackfill();}
  save();refreshGlass();renderPouch();applyLook(W.look);setupPet();if(!W.look)openDress(()=>start());else start();
  setTimeout(()=>toast(old?`歡迎回來，${name}！`:`${name}，歡迎來到平等車站！`),1600);{const gc=n=>{if(started&&W.seat===seat){if(CLOUD.st==='ok'){giftCheck();MSGN.told=false;msgCheck();}}else if(n<30)setTimeout(()=>gc(n+1),3000);};setTimeout(()=>gc(0),5000);}setTimeout(()=>{if(newsUnseen())toast('公告板有老師的新消息！');},5200);});
function logout(){if(W.seat&&PRES.me)fbReq('/pres/live/'+String(W.seat).replace(/[^0-9A-Za-z-]/g,''),{method:'DELETE'}).catch(()=>{});PRES.me=null;presHideAll();save();cloudFlush();r2Off();s2Off();CLS_IN=false;VISIT=null;closePortal();CY_IN=false;$('bTeacher').hidden=true;$('bPortal').hidden=true;document.body.classList.remove('tsess','cine');closeCard();stopQTimer();CH_IN=false;ISL_IN=false;TC_IN=false;ST_IN=false;$('ride').hidden=true;HOME.from=null;closeCabin();if(MZ_IN){MZ_IN=false;$('mzMap').hidden=true;LANTERN.intensity=0;sky.visible=true;scene.background=null;}closeDecor();teardownPet();if(INDOOR){INDOOR=false;}HOME_IN=false;$('homeBar').hidden=true;MART.basket=[];if(MART.bm)MART.bm.visible=false;if(DLG.open)closeDlg();started=false;MISSION.active=false;P.sit=null;P.pos.set(0,0,24);P.vel.set(0,0,0);P.yaw=PI;
  applyLook(LOOK_DEF);CATS.forEach(c=>{c.follow=0;});Object.assign(W,{seat:'',name:'',coins:0,items:{},glass:[],st:{},safety:null,time:0,look:null,pet:null,catFriend:{},tips:{},submitted:false,home:null,furn:{},homeSeen:false,daily:null,req:{},reqReady:{},reqNote:{},reads:[],newsSeen:[],att:{},adv:{},tcSeen:false,pomo:{},hist:[],seenQ:{},histInit:true,stSeen:false,ledger:[],play:{},moneyGoal:null,gifts:[],wild:null,clean:null,wrong:[]});refreshGlass();QT.pin=null;QT.last='';tipQ=[];playT=0;$('qTip').hidden=true;renderPouch();renderPet();
  document.body.classList.remove('playing');const t=$('title');t.hidden=false;t.classList.remove('gone');$('inSeat').value='';$('inName').value='';$('inSeat').focus({preventScroll:true});}
renderPouch();

/* ================================================================
   Illustrated (2D paper-doll) characters
   humans : 5 cells in one row -> 0 front, 1 side (facing right), 2 back, 3 walk A, 4 walk B (front)
   animals: 3 cells -> 0 front (sitting), 1 side walk A, 2 side walk B
   ================================================================ */
const SPRITES=(()=>{try{return JSON.parse(document.getElementById('sprites').textContent);}catch(e){return {};}})();
const SPR_CHARS=[{id:'hero1',name:'草帽男孩'},{id:'sailor',name:'水手服女孩'},{id:'hoodie',name:'粉紅帽T女孩'},{id:'sporty',name:'運動女孩'},{id:'green',name:'綠帽T男孩'},{id:'redcap',name:'紅帽男孩'}].filter(c=>SPRITES[c.id]);
const SPR_TEX={};
const RESFACES=(()=>{try{return JSON.parse(document.getElementById('resfaces').textContent);}catch(e){return {};}})();
const FACES=(()=>{try{return JSON.parse(document.getElementById('faces').textContent);}catch(e){return null;}})();
// students choose among the six kids' features (01–06); the adults' faces stay with the townsfolk
const KID_FACES=FACES?FACES.parts.map((_,i)=>i).filter(i=>+FACES.parts[i].id<=6):[];
// face swap turns on by itself once every student has pixel-exact front bases (faces_build.py → frontExact)
const FACE_ON=!!(FACES&&Object.values(FACES.chars).every(c=>c.frontExact));
function hasFace(id){return FACE_ON&&!!(FACES&&FACES.chars[id]);}
function faceKey(id,f){return f&&hasFace(id)&&(f.e>=0||f.m>=0||f.n>=0)?`${id}|${f.e}|${f.n}|${f.m}`:id;}
// ---- picture loading: pictures are separate files now, so they are fetched in order of need instead of all at once.
// What the current screen needs loads right away; everything else trickles in a few at a time once the game is up
// (hurry() pulls a group to the front when the player heads there). decode() keeps big sheets off the main thread.
const AQ={q:[],busy:0,max:3,open:false};
function aqPump(){while(AQ.open&&AQ.busy<AQ.max&&AQ.q.length){const j=AQ.q.shift();AQ.busy++;j.go(()=>{AQ.busy--;aqPump();});}}
function aqLoad(img,src){return new Promise((res,rej)=>{img.onload=()=>{const fin=()=>res(img);img.decode?img.decode().then(fin,fin):fin();};img.onerror=rej;img.src=src;});}
// lazy image: an <img> whose file is fetched when the queue reaches it (or at once if urgent)
function qImg(src,urgent){const i=new Image();const job={src,go:done=>{aqLoad(i,src).then(done,done);}};if(urgent||!/^assets\//.test(src))aqLoad(i,src).catch(()=>{});else AQ.q.push(job);aqPump();return i;}
function hurry(re){const a=[],b=[];AQ.q.forEach(j=>(re.test(j.src)?a:b).push(j));AQ.q=a.concat(b);if(a.length){const n=AQ.busy;AQ.open=true;a.slice(0,3).forEach(j=>{AQ.q.splice(AQ.q.indexOf(j),1);AQ.busy++;j.go(()=>{AQ.busy--;aqPump();});});}aqPump();}
setTimeout(()=>{AQ.open=true;aqPump();},2500);
const IMGP={};function loadImg(src,lazy){if(IMGP[src]&&!lazy){const j=AQ.q.find(j=>j.src===src);if(j){AQ.q.splice(AQ.q.indexOf(j),1);AQ.busy++;j.go(()=>{AQ.busy--;aqPump();});}}if(!IMGP[src])IMGP[src]=new Promise((res,rej)=>{const i=new Image();if(lazy&&/^assets\//.test(src)){AQ.q.push({src,go:done=>{aqLoad(i,src).then(im=>{done();res(im);},e=>{done();rej(e);});}});aqPump();}else aqLoad(i,src).then(res,rej);});return IMGP[src];}
// Face swap: for each chosen part, draw that part's "blank piece" (the base's skin, only where the
// ORIGINAL part was) and then the chosen part at this frame's anchor via this frame's transform M.
// Parts left on 原本 (-1) are not touched, so they keep this frame's original drawing.
async function composeFace(id,f){const C=FACES.chars[id],meta=SPRITES[id];const base=await loadImg(meta.src);
  const cv=document.createElement('canvas');cv.width=base.width;cv.height=base.height;const g=cv.getContext('2d');g.drawImage(base,0,0);
  const cw=meta.cw,ch=meta.ch;
  const views=[[C.front,FACES.parts,{eyes:f.e,nose:f.n,mouth:f.m}],[C.side,FACES.sparts,{eyes:f.e,mouth:f.m}]];
  for(const [V,PARTS,sel] of views){if(!V||!PARTS)continue;
    const chosen=Object.keys(V.pieces).filter(p=>sel[p]>=0&&PARTS[sel[p]]);if(!chosen.length)continue;
    const pc={},im={};for(const p of chosen){pc[p]=await loadImg(V.pieces[p]);const src=PARTS[sel[p]];im[p]=await loadImg(src.img?src.img[p]:src[p]);}
    const hh=V.y1-V.y0;
    V.cells.forEach((cell,i)=>{for(const p of chosen)g.drawImage(pc[p],i*cw,0,cw,hh,cell*cw,V.y0,cw,hh);
      const M=V.M[cell];g.save();g.beginPath();g.rect(cell*cw,0,cw,ch);g.clip();g.setTransform(M[0],M[3],M[1],M[4],M[2]+cell*cw,M[5]);
      for(const p of chosen){const sid=PARTS[sel[p]].id,sp=V.sp&&V.sp[cell]&&V.sp[cell][sid]&&V.sp[cell][sid][p];const a=sp||V.anc[cell][p],img=im[p],w=a.w,h=a.h||img.height*w/img.width;g.drawImage(img,a.x-w/2,a.y-h/2,w,h);}
      g.restore();});}
  return cv;}
function sprTex(id,cb,face){const key=faceKey(id,face);const E=SPR_TEX[key];if(E){if(E.ok)cb(E.tex);else if(!E.bad)E.q.push(cb);return;}
  const e=SPR_TEX[key]={ok:false,q:[cb],tex:null};
  const done=src=>{const t=src.getContext?new T.CanvasTexture(src):new T.Texture(src);t.encoding=T.sRGBEncoding;t.anisotropy=MAXANI;t.generateMipmaps=true;t.needsUpdate=true;e.tex=t;e.ok=true;e.q.forEach(f=>f(t));e.q=[];};
  const fail=()=>{e.bad=true;e.q=[];if(key!==id){delete SPR_TEX[key];sprTex(id,cb);return;}if(SPR.id===id){toast('這台裝置顯示不了插畫角色，先用 3D 角色');W.look&&(W.look.ch='custom');applyLook(W.look||{ch:'custom'});}};
  if(key!==id)composeFace(id,face).then(done,fail);else loadImg(SPRITES[id].src,!(id===SPR.id||/^act/.test(id))).then(done,fail);}
const SPR_ALL=[];
// h = height of the figure in world units
const SPR_FLATZ=!!(renderer.capabilities&&renderer.capabilities.isWebGL2);const _dz=new T.Vector3();
function makeSpr(id,h,face){const M_=SPRITES[id];const g=new T.Group();g.userData.dyn=true;
  const PH=h*M_.ch/M_.hpx,PW=PH*M_.cw/M_.ch;const geo=new T.PlaneGeometry(PW,PH);geo.translate(0,PH/2-(M_.foot!=null?M_.foot:3)/M_.ch*PH,0);
  const mat=new T.MeshBasicMaterial({transparent:true,alphaTest:.04,side:T.DoubleSide,toneMapped:false,depthWrite:true});
  // uMode (no walk frames for this view): 1 = legs lift alternately (back/front), 2 = legs swing (side)
  const U={uDepth:{value:.5},uMode:{value:0},uStep:{value:0},uHip:{value:M_.hip!=null?M_.hip:.27},uOff:{value:new T.Vector2()},uRep:{value:new T.Vector2(1/(M_.cols||M_.n),1/(M_.rows||1))}};
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader='varying vec2 vLoc;\n'+sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vLoc=uv;');
    sh.fragmentShader='varying vec2 vLoc;uniform float uDepth,uMode,uStep,uHip;uniform vec2 uOff,uRep;\n'+(SPR_FLATZ?sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n gl_FragDepthEXT=uDepth;'):sh.fragmentShader).replace('#include <map_fragment>',`
      #ifdef USE_MAP
      vec2 l=vLoc;
      if(uMode>.5&&l.y<uHip){float w=smoothstep(uHip,uHip*.45,l.y);
        if(uMode<1.5){float up=(l.x<.5?max(uStep,0.):max(-uStep,0.));l.y-=up*.07*w;l.x+=(l.x<.5?-1.:1.)*abs(uStep)*.004*w;}
        else{float k=(uHip-l.y)/uHip;l.x-=uStep*.07*k;}}
      l.x=clamp(l.x,.004,.996);
      vec4 texelColor=texture2D(map,l*uRep+uOff)*(step(.004,l.y)*step(l.y,.975));
      texelColor=mapTexelToLinear(texelColor);diffuseColor*=texelColor;
      #endif`);};
  mat.customProgramCacheKey=()=>'sprLegs';
  const pivot=new T.Group();g.add(pivot);const m=new T.Mesh(geo,mat);pivot.add(m);m.renderOrder=2;
  const blob=new T.Mesh(BLOB_GEO,BLOB_MAT);blob.position.y=.03;const bw_=M_.kind==='animal'?h*1.5:(id==='bike'?1.5:.8);blob.scale.set(bw_,1,M_.kind==='animal'?h*1.1:(id==='bike'?.8:.7));g.add(blob);
  const c={id,meta:M_,g,pivot,m,mat,U,view:0,frame:-1,ready:false};g.visible=false;scene.add(g);SPR_ALL.push(c);
  sprTex(id,t=>{if(c.dead)return;mat.map=t;mat.needsUpdate=true;c.ready=true;g.visible=c.want!==false;sprFrame(c,0,true);},face);
  return c;}
function dropSpr(c){if(!c)return;c.dead=true;scene.remove(c.g);const i=SPR_ALL.indexOf(c);if(i>=0)SPR_ALL.splice(i,1);}
function sprShow(c,v){c.want=v;c.g.visible=v&&c.ready;}
// sheets are a strip (n frames in one row) or a grid (cols x rows, frames left-to-right, top-to-bottom)
function fxy(M,f){const c=M.cols||M.n;return [(f%c)*M.cw,Math.floor(f/c)*M.ch];}
function sprFrame(c,f,force){if(!force&&c.frame===f)return;c.frame=f;const M=c.meta,cols=M.cols||M.n,rows=M.rows||1;c.U.uOff.value.set((f%cols)/cols,1-(Math.floor(f/cols)+1)/rows);}
const _cv=new T.Vector3();
function camRel(c,pos,yaw){_cv.copy(camera.position).sub(pos);c.g.position.copy(pos);c.g.rotation.y=Math.atan2(_cv.x,_cv.z);
  if(SPR_FLATZ){const hl=Math.hypot(_cv.x,_cv.z)||1,k=Math.min((c===SPR.c||typeof ACT!=='undefined'&&c===ACT.c)&&P.sit?.95:(INDOOR?.6:.5),hl*.3);_dz.set(pos.x+_cv.x/hl*k,pos.y+(INDOOR?.25:.45),pos.z+_cv.z/hl*k).project(camera);c.U.uDepth.value=clamp(_dz.z*.5+.5,0,1);}
  c.m.rotation.x=-clamp(Math.atan2(_cv.y-.8,Math.hypot(_cv.x,_cv.z))*.8,0,.95);
  const fx=Math.sin(yaw),fz=Math.cos(yaw);const l=Math.hypot(_cv.x,_cv.z)||1;const tx=_cv.x/l,tz=_cv.z/l;return [fx*tx+fz*tz,fx*tz-fz*tx];}
// humans: pos, facing yaw, walk phase, walk amount (0..1)
function sprPose(c,pos,yaw,ph,amt,t){
  const [d,side]=camRel(c,pos,yaw); // d>0 facing camera, side>0 facing screen-right
  let v=c.view;const lim=.5,hy=.1;
  if(d>lim+(v===0?-hy:hy))v=0;else if(d<-lim-(v===2?-hy:hy))v=2;else if(Math.abs(d)<lim-hy||v===0&&d<lim-hy||v===2&&d>-lim+hy)v=1;
  c.view=v;const s=Math.sin(ph);const M_=c.meta;
  const list=(v===0?M_.fw:v===1?M_.sw:M_.bw)||(v===0&&M_.walk?[3,4]:[]);
  const moving=amt>.15;let f=v,walk=false;
  if(moving&&list.length===4){const q=Math.floor(((ph*1.3/(PI*2))%1+1)%1*4);f=list[q];walk=true;}
  else if(moving&&v===2){f=2;walk=false;}
  else if(moving&&list.length>1){const q=Math.floor(((ph/(PI*2))%1+1)%1*4);f=q===0?list[0]:q===2?list[1]:v;walk=true;}
  else if(moving&&list.length===1){f=Math.abs(s)>.35?list[0]:v;walk=true;}
  if(M_.n<3){f=0;walk=false;}
  sprFrame(c,f);
  c.U.uMode.value=walk||amt<.05?0:v===1?2:1;c.U.uStep.value=s*Math.min(1,amt*1.3);
  const flip=v===1&&side<0?-1:1;
  const bob=M_.walk4&&walk?0:Math.abs(s)*(walk?(v===1?.02:.045):.06)*amt,br=1+Math.sin(t*2.2+c.id.length)*.008*(1-amt);
  c.pivot.position.y=bob;c.m.scale.set(flip*(1+bob*.25),br*(1-bob*.3)+bob*.45,1);
  c.pivot.rotation.z=M_.walk4&&walk?0:v===1?-flip*.04*amt:s*(walk?.025:.055)*amt;
  if(c===SPR.c&&!P.sit){const rk=P.runK||0,sk=Math.max(0,P.skid||0)/.32;
    if(rk>.02&&walk){const st=Math.abs(Math.sin(ph*1.3)),air=st*.075*rk;c.pivot.position.y+=air;
      c.m.scale.y*=1-(1-st)*.045*rk;c.m.scale.x*=1+(1-st)*.03*rk;
      if(v===1)c.pivot.rotation.z=-flip*.11*rk;}
    if(sk>0){c.m.scale.y*=1-.08*sk;c.m.scale.x*=1+.05*sk;if(v===1)c.pivot.rotation.z=flip*.12*sk;}}}
// animals: sitting -> front frame; walking -> side frames A/B
function aniPose(c,pos,yaw,moving,ph){
  const [d,side]=camRel(c,pos,yaw);const s=Math.sin(ph);
  const bw=c.meta.bw;
  if(moving&&bw&&d<-.45){sprFrame(c,s>0?bw[0]:bw[1]);c.m.scale.set(1,1,1);c.pivot.position.y=Math.abs(s)*.02;}
  else if(moving){sprFrame(c,s>0?1:2);c.m.scale.set(side<0?-1:1,1,1);c.pivot.position.y=Math.abs(s)*.025;}
  else{sprFrame(c,0);c.m.scale.set(1,1+Math.sin(time*2+ph)*.012,1);c.pivot.position.y=0;}}
function hide3D(g){g.traverse(o=>{if(o.isMesh&&!o.userData.hid){o.visible=false;o.userData.hid=true;}});}
const BLOB_GEO=new T.PlaneGeometry(1,1).rotateX(-PI/2),BLOB_MAT=new T.MeshBasicMaterial({map:glowTex,color:0x1a0f14,transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false});
const WHITE_C=new T.Color(1,1,1),HOME_TINT=new T.Color(),_sp=new T.Vector3();

// ---- player
const SPR={id:null,c:null};
function setPlayerSprite(id,face){
  const key=id?faceKey(id,face):null;
  if(SPR.c){dropSpr(SPR.c);SPR.c=null;}
  // free the previous custom-face texture (only one is ever in use)
  if(SPR.key&&SPR.key!==key&&SPR.key.includes('|')&&SPR_TEX[SPR.key]){const E=SPR_TEX[SPR.key];if(E.tex)E.tex.dispose();delete SPR_TEX[SPR.key];}
  SPR.id=null;SPR.key=null;
  if(!id||!SPRITES[id]||(SPR_TEX[id]&&SPR_TEX[id].bad))return false;
  SPR.id=id;SPR.key=key;SPR.c=makeSpr(id,1.62,face);sprShow(SPR.c,true);hide3D(pl.g);
  if(typeof ACT!=='undefined'){ACT.on=false;ACT.lock=false;for(const k in ACT.cs)dropSpr(ACT.cs[k]);ACT.cs={};ACT.c=null;for(const k in RUN.cs)dropSpr(RUN.cs[k]);RUN.cs={};RUN.c=null;setTimeout(actPreload,1500);}return true;}

// ---- townsfolk
const NPC_SPR=[];
function npcSprite(id,p3d,pos,yaw,h,opt={}){if(!SPRITES[id])return null;if(!opt.indoor&&pos.x<2300)addCol(pos.x-.32,pos.x+.32,pos.z-.32,pos.z+.32,pos.y+1.8,pos.y-1);hide3D(p3d.g);(opt.hide||[]).forEach(o=>o&&(o.visible=false));
  const n={c:makeSpr(id,h),pos:pos.clone(),yaw0:yaw,yaw,face:opt.face==null?4.5:opt.face,indoor:!!opt.indoor};sprShow(n.c,true);NPC_SPR.push(n);return n;}
(function(){
  const old=NPC.find(n=>n.kind==='old'),ken=NPC.find(n=>n.kind==='ken');
  if(old)npcSprite('grandpa',old.p,new T.Vector3(-49.4,groundH(-49.4,-36.5),-36.5),PI,1.6);
  if(ken)npcSprite('fisher',ken.p,new T.Vector3(76,.5,-100),PI/2,1.72,{hide:[ken.rod],face:3.5});
  if(GUARD.p)npcSprite('guard',GUARD.p,new T.Vector3(6.6,0,-24.4),-PI/2,1.7);
  if(MART.clerk)npcSprite('clerk',MART.clerk,new T.Vector3(IX-4.9,0,IZ+.7),0,1.7,{indoor:true});
})();
// girl walking her bicycle along the coast road (replaces the 3D cyclist)
if(SPRITES.bike){hide3D(CYC.g);CYC.spr=makeSpr('bike',1.6);sprShow(CYC.spr,true);CYC.base=CYC.v=1.35;CYC.wph=0;}

// ---- animals
const ANIS=[];
function aniSprite(o,id,h){if(!SPRITES[id]||o.spr)return;o.spr=makeSpr(id,h);hide3D(o.g);ANIS.push(o);}
{const CAT_ID={'小玉':'cat_tama','墨墨':'cat_sumi','橘子':'cat_mikan','海苔':'cat_nori'};CATS.forEach(c=>{const id=CAT_ID[c.origName||c.name];if(id)aniSprite(c,id,.5);});}
PUPPIES.forEach(p=>aniSprite(p.d,'shiba_'+p.coat,.36));
const _mkDog=makeDog;makeDog=function(coat,s=1.35){const d=_mkDog(coat==='hudie'?'white':coat,s);if(coat==='hudie'&&SPRITES['ani_hudie_f0'])aniSprite(d,'ani_hudie_f'+hudieFur(),.42*s/1.35);else if(SPRITES['shiba_'+coat])aniSprite(d,'shiba_'+coat,.5*s);else aniSprite(d,'ani_'+coat,(typeof DOG_H!=='undefined'&&DOG_H[coat]||.6)*s/1.35);return d;};

const DOG_TRICK={sit:'beg',lie:'lie',paw:'paw',playdead:'playdead',roll:'roll',spin:null,dance:null};
function dogPose(o,dt){const c=o.spr,A_=c.meta.act;let fr=null,rz=0,lift=0;
  if(o.getUp>0)o.getUp-=dt;
  if(o.anim){o.anim.t+=dt;if(o.anim.t>o.anim.dur){const was=o.anim;o.anim=null;if(was.type==='seq'&&was.name==='lie_down')o.rest=true;}}
  if(o.isPet&&c.meta.anims&&!HOME_IN&&!o.mv&&!o.trick&&!o.anim&&!o.rest&&!(o.getUp>0)&&!DLG.open){o.still=(o.still||0)+dt;o.mvT=0;if(o.still>6)petSeq(o,'lie_down');}else if(o.mv){o.mvT=(o.mvT||0)+dt;if(o.mvT>.8)o.still=0;}
  if(o.anim&&o.anim.type==='seq'){const S_=c.meta.anims[o.anim.name];let t=o.anim.t,i=0;while(i<S_.f.length-1&&t>S_.d[i]){t-=S_.d[i];i++;}if(S_.loop)i=Math.floor(o.anim.t/ (S_.d[0]||.3))%S_.f.length;sprFrame(c,S_.f[i]);c.m.scale.set(1,1,1);c.pivot.position.y=0;c.pivot.rotation.z=0;return;}
  if(o.rest&&A_.t_lie_contact!=null){sprFrame(c,A_.t_lie_contact);c.m.scale.set(1,1+Math.sin(time*1.6)*.01,1);c.pivot.position.y=0;c.pivot.rotation.z=0;return;}
  const tr=o.trick;
  if(o.pose==='sleep')fr=A_.sleep;
  else if(tr){const k=tr.t;
    if(tr.type==='dance'){fr=Math.floor(k*5)%2?A_.jump:A_.beg;lift=Math.floor(k*5)%2?.12:0;}
    else if(tr.type==='spin'){fr=null;}
    else if(tr.type==='sit')fr=k<.5?0:A_.beg;
    else if(tr.type==='roll'){fr=A_.roll;rz=-Math.min(1,k/1.2)*PI*2;}
    else fr=A_[DOG_TRICK[tr.type]];}
  else if(o.mv){if(o.slow||(c.meta.bw||[]).includes(c.frame))fr=null;else{const q=Math.floor(((o.ph||0)*1.1%4+4)%4);fr=A_['run_'+(q+1)];}}
  else if(o.anim){const a=o.anim;if(a.type==='jump'){fr=A_.jump;lift=Math.sin(Math.min(1,a.t/a.dur)*PI)*.18;}else if(a.type==='wag')fr=Math.floor(a.t*6)%2?A_.wag_B:A_.wag_A;else fr=A_[a.type];}
  else if(o.isPet&&HOME_IN&&Math.hypot(o.g.position.x-(HX+PETBED.x),o.g.position.z-(HZ+PETBED.z))<.5)fr=A_.sleep;
  if(fr!=null){const sx=o.mv?Math.sign(c.m.scale.x)||1:1;sprFrame(c,fr);c.m.scale.set(sx,1,1);}
  c.pivot.position.y=lift+(fr==null?c.pivot.position.y:0);c.pivot.rotation.z=rz;}
// ---- student action frames
// sheet ''  (act0N)  first action pack: wave, laugh, hold, shoot, dunk, sit
// sheet 'd' (act0Nd) daily: sit down / stand up, read, write, type, bed     -> names 'd.<anim>'
// sheet 'i' (act0Ni) interactions: pet, feed, reach, give, pickup, blink, talk, nod, shake, think, surprised, sad, cheer -> 'i.<anim>'
// sheet 's' (act0Ns) sports: jump, dribble, catch                           -> 's.<anim>'
// The d/i/s sequences (frames, per-frame time, loop) come straight from the art manifests via meta.anims.
const ACTMAP={hero1:'01',sailor:'02',hoodie:'03',sporty:'04',green:'05',redcap:'06'};
const ACTS={wave:{f:[2,3,4,3],d:[.2,.16,.2,.16]},laugh:{f:[5],d:[1.3]},hold:{f:[6],d:[.5]},shoot:{f:[6,7,8,9,10],d:[.35,.24,.18,.14,.6],rel:4,side:1},dunk:{f:[6,11,12,13,14],d:[.25,.32,.2,.38,.45],rel:4,side:1},sit:{f:[0],d:[1e9]},sitS:{f:[1],d:[1e9],side:1}};
const ACT={c:null,id:null,cs:{},a:null,name:'',t:0,i:0,loops:1,cb:null,onRel:null,on:false,lock:false,hold:false,held:false};
function actSid(suf){return SPR.id&&ACTMAP[SPR.id]?'act'+ACTMAP[SPR.id]+(suf||''):null;}
// sequences that begin/end on a plain standing frame: the seat versions drop those (the body is already at the seat)
const NOREF=a=>{const k=a.f.map(f=>a.keys[f]);let i0=0,i1=a.f.length;while(i0<i1-1&&/^reference_/.test(k[i0]))i0++;while(i1>i0+1&&/^reference_/.test(k[i1-1]))i1--;return Object.assign({},a,{f:a.f.slice(i0,i1),d:a.d.slice(i0,i1)});};
function actDef(name){if(ACTS[name])return {sid:actSid(''),a:ACTS[name]};const m=/^([dis])\.(\w+)$/.exec(name);if(!m)return null;
  const sid=actSid(m[1]),M=sid&&SPRITES[sid],A_=M&&M.anims&&M.anims[m[2]];if(!A_)return null;return {sid,a:{f:A_.f,d:A_.d,loop:A_.loop,keys:M.keys}};}
function actHas(name){const D=SPR.c&&actDef(name);return !!(D&&D.sid&&SPRITES[D.sid]);}
function actOk(){return !!(SPR.c&&ACTMAP[SPR.id]&&SPRITES['act'+ACTMAP[SPR.id]]);}
function actPreload(){if(!SPR.id||!ACTMAP[SPR.id])return;['','d','i','s','r'].forEach(x=>{const sid=actSid(x);if(SPRITES[sid])sprTex(sid,()=>{});});}
// o: lock (no walking while it plays), hold (keep the last frame until stopped), dur (seconds, for loops), loops, yaw, cb, onRel, slice [a,b]
function actPlay(name,o={}){if(!SPR.c)return false;if(INDOOR&&!o.indoor)return false;
  let seat=false;if(name==='seat'){seat=true;const v=SPR.c.view===1?'side':'front';name=actHas('d.sit_'+v)?'d.sit_'+v:'sit';}
  const D=actDef(name);if(!D||!D.sid||!SPRITES[D.sid])return false;let a=D.a;
  if(seat&&a.keys)a=NOREF(a);if(o.noref&&a.keys)a=NOREF(a);if(o.slice)a=Object.assign({},a,{f:a.f.slice(o.slice[0],o.slice[1]),d:a.d.slice(o.slice[0],o.slice[1])});
  if(!ACT.cs[D.sid])ACT.cs[D.sid]=makeSpr(D.sid,1.62);for(const k in ACT.cs)if(k!==D.sid)sprShow(ACT.cs[k],false);
  if(ACT.on&&ACT.cb){const cb=ACT.cb;ACT.cb=null;cb();}
  ACT.c=ACT.cs[D.sid];ACT.id=D.sid;
  Object.assign(ACT,{a,name:seat?'seat':name,t:0,i:0,el:0,wait:0,loops:o.loops||1,cb:o.cb||null,onRel:o.onRel||null,lock:!!o.lock,indoor:!!o.indoor,idle:false,on:true,yaw:o.yaw,hold:!!(o.hold||seat),held:false,dur:o.dur||0});return true;}
// running: the drawn run cycle (student-run pack, act0Nr) replaces the walk sheet while running, plus the drawn brake pose on a hard stop
const RUN={cs:{},c:null,ph:0};
function runSid(){return SPR.id&&ACTMAP[SPR.id]?'act'+ACTMAP[SPR.id]+'r':null;}
function runTick(dt){const sid=runSid(),M=sid&&SPRITES[sid];
  const ok=M&&SPR.c&&!P.sit&&!ACT.on&&!INDOOR&&!CUTON&&started;const running=ok&&P.runK>.5&&P.moving>3.5,stopping=ok&&!running&&(P.skid||0)>0;
  let c=null;if(running||stopping){if(!RUN.cs[sid])RUN.cs[sid]=makeSpr(sid,1.62);c=RUN.cs[sid].ready?RUN.cs[sid]:null;}
  for(const k in RUN.cs)if(RUN.cs[k]!==c&&RUN.cs[k].want)sprShow(RUN.cs[k],false);
  if(!c){if(RUN.c){RUN.c=null;if(SPR.c&&!ACT.on)sprShow(SPR.c,true);}if(!running)RUN.ph=0;return;}
  RUN.c=c;sprShow(SPR.c,false);sprShow(c,true);
  const pos=_sp.set(P.pos.x,P.pos.y+(P.pos.y<SEA_Y+.05?-.12:0),P.pos.z);const [d,side]=camRel(c,pos,P.yaw);const v=SPR.c.view,A=M.anims;let f;
  if(stopping)f=v===1?A.run_stop_side.f[0]:v===0?A.run_stop_front.f[0]:A.run_back.f[0];
  else{RUN.ph+=dt*12.5*clamp(P.moving/7.4,.6,1.25);const L=(v===0?A.run_front:v===1?A.run_side:A.run_back).f;f=L[Math.floor(RUN.ph)%L.length];}
  const flip=v===1&&side<0?-1:1;sprFrame(c,f);c.U.uMode.value=0;c.U.uStep.value=0;c.pivot.position.y=0;c.pivot.rotation.z=0;c.m.scale.set(flip,1,1);}
function actStop(){if(!ACT.on)return;ACT.on=false;ACT.lock=false;ACT.held=false;for(const k in ACT.cs)sprShow(ACT.cs[k],false);if(SPR.c)sprShow(SPR.c,true);const cb=ACT.cb;ACT.cb=null;if(cb)cb();}
// stand up from a seat: the drawn stand-up, then step off the seat (walking input or E while seated comes here)
function faceTo(x,z){const yaw=Math.atan2(x-P.pos.x,z-P.pos.z);P.yaw=yaw;if(pl&&pl.g)pl.g.rotation.y=yaw;return yaw;}
function standUp(){if(!P.sit||ACT.lock&&ACT.on)return;const sp=P.sit,fin=()=>{if(P.sit!==sp)return;P.sit=null;P.pos.x+=Math.sin(sp.face)*.7;P.pos.z+=Math.cos(sp.face)*.7;P.pos.y=groundH(P.pos.x,P.pos.z);try{collide(P.pos,.3);}catch(e){}};
  const v=SPR.c&&SPR.c.view===1?'side':'front';if(!INDOOR&&actHas('d.stand_'+v)&&actPlay('d.stand_'+v,{lock:true,noref:true,cb:fin}))return;fin();}
function actTick(dt){if(!ACT.on)return;if(INDOOR&&!ACT.indoor){actStop();return;}const c=ACT.c;if(!c||!c.ready){ACT.wait=(ACT.wait||0)+dt;if(ACT.wait>2.5)actStop();return;}
  if(SPR.c&&SPR.c.g.visible)sprShow(SPR.c,false);if(!c.g.visible)sprShow(c,true);
  const a=ACT.a;ACT.t+=dt;ACT.el+=dt;if(ACT.dur&&ACT.el>ACT.dur){actStop();return;}
  if(!ACT.held)while(ACT.t>a.d[ACT.i]){ACT.t-=a.d[ACT.i];ACT.i++;if(a.rel!=null&&ACT.i===a.rel&&ACT.onRel){const f=ACT.onRel;ACT.onRel=null;f();}
    if(ACT.i>=a.f.length){if(a.loop){ACT.i=0;}else if(--ACT.loops>0){ACT.i=0;}else if(ACT.hold){ACT.i=a.f.length-1;ACT.held=true;break;}else{actStop();return;}}}
  const pos=_sp.copy(pl.g.position);if(P.sit)pos.copy(P.sit.pos);
  if(ACT.name==='dunk'){const a=ACT.a,Ta=a.d[0],T0=Ta+a.d[1],T1=T0+a.d[2]+a.d[3];let tt=ACT.t;for(let k=0;k<ACT.i;k++)tt+=a.d[k];
    if(ACT.dk){const ap=clamp((tt-Ta*.5)/(T0+a.d[2]*.6-Ta*.5),0,1),e=ap*ap*(3-2*ap);{const k_=ACT.dk.a||'z';pos[k_]=lerp(ACT.dk.z0,ACT.dk.z1,e);P.pos[k_]=pos[k_];}}
    const up=clamp((tt-T0)/(a.d[2]),0,1),down=clamp((tt-(T1-.05))/.22,0,1);pos.y+=ACT.dk?(1.15*Math.sin(up*PI/2)*(1-down*down)):Math.sin(clamp((tt-T0+.1)/(T1-T0+.05),0,1)*PI)*.62;}
  const [d,side]=camRel(c,pos,ACT.yaw!=null?ACT.yaw:P.yaw);const M=c.meta;
  let f=a.f[ACT.i],flip=1;
  if(ACT.name==='seat'&&M.anims&&M.anims.sit_front&&M.anims.sit_side&&ACT.held){const S_=M.anims;f=Math.abs(d)<.55?S_.sit_side.f[S_.sit_side.f.length-1]:S_.sit_front.f[S_.sit_front.f.length-1];}
  else if(ACT.name==='seat'&&!M.keys&&Math.abs(d)<.55){f=1;}
  const key=M.keys?M.keys[f]:null;
  if(key?/_side/.test(key):(a.side&&ACTS.hold.f[0]!==f||ACT.name==='seat'&&f===1))flip=side<0?-1:1;
  // seated frames: line the drawn seat point up with the old seat frames, so benches keep their height
  if(P.sit&&key&&M.seat_anchor&&M.seat_anchor[key]){const old=SPRITES[actSid('')],os=old&&old.seat?old.ch-old.seat[1]:56;pos.y+=(os-(M.ch-M.seat_anchor[key][1]))*1.62/M.hpx;c.g.position.y=pos.y;}
  sprFrame(c,f);c.U.uMode.value=0;c.U.uStep.value=0;c.pivot.position.y=0;c.pivot.rotation.z=0;c.m.scale.set(flip,1,1);}
// little life when standing still (front view): settle into the drawn idle stance that blinks now and then
const IDLE={t:0};
let ACT_NEXT=null;function actLater(name,o){ACT_NEXT={name,o:o||{}};}

function idleTick(dt){if(ACT_NEXT&&!uiOpen()&&!DLG.open&&!(ACT.on&&ACT.lock)){const n=ACT_NEXT;ACT_NEXT=null;if(R2.on)r2ActPlay(n.name,n.o);else if(!S2.on)actPlay(n.name,Object.assign({indoor:true},n.o));return;}const busy=!SPR.c||P.sit||INDOOR||DLG.open||P.moving>.05||SPR.c.view!==0;
  if(ACT.on&&ACT.idle){if(busy)actStop();return;}
  if(busy||ACT.on){IDLE.t=0;return;}IDLE.t+=dt;
  if(IDLE.t>2.5&&actHas('i.blink')){IDLE.t=0;if(actPlay('i.blink'))ACT.idle=true;}}
function sprTick(dt){camera.updateMatrixWorld();
  const tint=HOME_IN?HOME_TINT.copy(S.sprTint).lerp(WHITE_C,.5):MZ_IN?MZ_TINT:INDOOR?WHITE_C:S.sprTint;
  SPR_ALL.forEach(c=>c.mat.color.copy(tint));
  {const k=Math.min(1,.22+.78*(S.light||1));for(const n in FOLI.mats)FOLI.mats[n].color.copy(INDOOR?WHITE_C:S.sprTint).multiplyScalar(k);}
  if(SPR.c){const c=SPR.c;const amt=P.sit?0:clamp(P.moving/3.9,0,1.15);
    _sp.copy(pl.g.position);if(P.sit)_sp.y-=.28;sprPose(c,_sp,pl.g.rotation.y,P.ph,amt,time);}
  runTick(dt);
  if(P.sit&&(!ACT.on||ACT.name!=='seat'&&!ACT.lock)&&actOk()&&!INDOOR)actPlay('seat');else if(!P.sit&&ACT.on&&ACT.name==='seat')actStop();idleTick(dt);actTick(dt);
  NPC_SPR.forEach(n=>{const dx=P.pos.x-n.pos.x,dz=P.pos.z-n.pos.z;const near=Math.hypot(dx,dz)<n.face&&!!n.indoor===!!INDOOR;
    n.yaw=lerpAng(n.yaw,near?Math.atan2(dx,dz):n.yaw0,1-Math.exp(-dt*(near?5:1.5)));sprPose(n.c,n.pos,n.yaw,0,0,time);});
  if(CYC.spr){CYC.wph+=CYC.v*dt*2.35;sprShow(CYC.spr,!INDOOR);sprPose(CYC.spr,CYC.g.position,-PI/2,CYC.wph,clamp(CYC.v/1.35,0,1),time);}
  for(let i=ANIS.length-1;i>=0;i--){const o=ANIS[i];
    if(!o.g.parent){dropSpr(o.spr);o.spr=null;ANIS.splice(i,1);continue;}
    let vis=true;for(let q=o.g;q;q=q.parent)if(!q.visible){vis=false;break;}sprShow(o.spr,vis);if(!vis)continue;
    o.g.getWorldPosition(_sp);const wq=o.g.parent===scene?o.g.rotation.y:o.g.rotation.y+(o.g.parent.rotation?o.g.parent.rotation.y:0);
    aniPose(o.spr,_sp,wq,!!o.mv,o.ph||0);
    if(o.spr.meta.act){dogPose(o,dt);continue;}
    {const c=o.spr,tr=o.trick;let rz=0;if(tr){const k=tr.t,du=tr.dur||2.2,out=Math.max(0,1-Math.max(0,k-(du-.35))/.35);
      if(tr.type==='lie'){c.m.scale.x*=1+.14*out;c.m.scale.y*=1-.34*out;}
      else if(tr.type==='playdead'){rz=-Math.min(1,k*3)*1.5*out;}
      else if(tr.type==='roll'){rz=-Math.min(1,k/1.1)*PI*2;}
      else if(tr.type==='paw'){rz=.2*Math.sin(Math.min(1,k*1.6)*PI);}
      else if(tr.type==='sit'){c.m.scale.y*=1+.06*out;}}
      c.pivot.rotation.z=rz;}}}
setPlayerSprite(LOOK_DEF.ch);
// second cut-away pass for town props built after the merge (shop signs, awnings, posts): anything standing near the camera can be cut
{scene.updateMatrixWorld(true);const _b=new T.Box3(),_s=new T.Vector3(),_c=new T.Vector3();scene.traverse(o=>{if(!o.isMesh||o.userData.inkLine||o.isSprite)return;const ms=Array.isArray(o.material)?o.material:[o.material];if(ms.every(m=>!m||m.userData.cutP))return;
  _b.setFromObject(o);if(_b.isEmpty())return;_b.getCenter(_c);if(Math.abs(_c.x)>115||_c.z<-120||_c.z>100)return;_b.getSize(_s);if(_s.x>=30||_s.z>=30||_s.y<.2)return;
  ms.forEach(m=>{if(m&&!TOWN_CUT.gnd.has(m)&&(m.isMeshLambertMaterial||m.isMeshBasicMaterial||m.isMeshToonMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial))cutPatch(m);});});}
/* ================================================================
   My room — every seat number has its own room (saved in W.home)
   The game starts here; the front door leads to a house in town.
   ================================================================ */
const HX=40,HZ=330;var HOME_IN=false;
const H2ZC=1.45; // front edge of the 2D student room (the floor beyond it is cropped)
const HOME={RW:7,RD:6,RH:3.4,g:null,items:[],sel:null,edit:false,pending:null,mode:'edit',tab:'furn',cols:[],act:null,actPos:new T.Vector3(0,-50,0),fish:[],wallMat:null,floorMat:null,townDoor:null,townOut:null};
const PETBED={x:-2.75,z:2.25};
// ---------- wallpaper & floor patterns
function wallTexOf(id){const [c,g]=C2(256,256);
  const P={cream:['#e4d5bd'],dots:['#f6dde2'],stripe:['#e2ecf4'],check:['#e6efdc'],star:['#2c3558'],wood:['#b98c5e'],sunset:['#f7d9bf']}[id]||['#f3e9d6'];
  g.fillStyle=P[0];g.fillRect(0,0,256,256);speckle(g,256,256,500,.03);
  if(id==='dots'){g.fillStyle='#ee9fb3';for(let y=0;y<256;y+=32)for(let x=(y/32%2)*16;x<256;x+=32){g.beginPath();g.arc(x+8,y+8,5,0,PI*2);g.fill();}}
  if(id==='stripe'){for(let x=0;x<256;x+=32){g.fillStyle='#a9c4dc';g.fillRect(x,0,12,256);g.fillStyle='#f7f9fb';g.fillRect(x+14,0,3,256);}}
  if(id==='check'){g.fillStyle='rgba(120,160,100,.35)';for(let x=0;x<256;x+=64){g.fillRect(x,0,26,256);g.fillRect(0,x,256,26);}}
  if(id==='star'){for(let i=0;i<60;i++){g.fillStyle=pick(['#fff6c8','#ffffff','#cfe0ff']);const x=rand()*256,y=rand()*256,r=rand()<.15?2.4:1.1;g.beginPath();g.arc(x,y,r,0,PI*2);g.fill();}
    g.fillStyle='#ffe9a0';g.beginPath();g.arc(190,60,14,0,PI*2);g.fill();g.fillStyle='#2c3558';g.beginPath();g.arc(197,55,12,0,PI*2);g.fill();}
  if(id==='wood'){for(let x=0;x<256;x+=32){g.fillStyle=pick(['#b3855a','#bf9366','#8a6446']);g.fillRect(x,0,31,256);g.fillStyle='rgba(60,35,20,.35)';g.fillRect(x+31,0,1,256);}speckle(g,256,256,1500,.07);}
  if(id==='sunset'){const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#f6c6a8');gr.addColorStop(1,'#fbe7d2');g.fillStyle=gr;g.fillRect(0,0,256,256);g.fillStyle='rgba(217,87,59,.18)';for(let y=20;y<256;y+=64)g.fillRect(0,y,256,6);}
  // wainscot line near the floor
  return TX(c,true);}
function floorTexOf(id){const [c,g]=C2(256,256);
  if(id==='tatami'){g.fillStyle='#c9c48a';g.fillRect(0,0,256,256);g.strokeStyle='rgba(120,110,60,.25)';for(let y=0;y<256;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}g.fillStyle='#3d4a3a';g.fillRect(0,0,256,8);g.fillRect(0,128,256,8);}
  else if(id==='tile'){g.fillStyle='#eeece6';g.fillRect(0,0,256,256);g.strokeStyle='rgba(120,120,110,.35)';g.lineWidth=3;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}
  else if(id==='carpet'){g.fillStyle='#5b7fa8';g.fillRect(0,0,256,256);speckle(g,256,256,6000,.12);}
  else{const dark=id==='dark';for(let y=0;y<256;y+=24){let x=-rand()*120;while(x<256){const w=rr(120,200);g.fillStyle=pick(dark?['#5a3f2e','#553b2b','#5f4331']:['#857062','#80695a','#8a7466','#7c6759']);g.fillRect(x,y,w-1,23);g.fillStyle='rgba(50,30,18,.22)';g.fillRect(x+w-1,y,1,23);x+=w;}
      g.fillStyle='rgba(50,30,18,.2)';g.fillRect(0,y+23,256,1);}speckle(g,256,256,2600,.05);}
  return TX(c,true);}
const WALLPAPERS=[{id:'cream',name:'米白素面',price:0,sw:'#e4d5bd'},{id:'dots',name:'粉紅點點',price:40,sw:'#f0b8c6'},{id:'stripe',name:'藍色條紋',price:40,sw:'#a9c4dc'},{id:'check',name:'綠色格紋',price:40,sw:'#b9cfa6'},{id:'sunset',name:'夕陽橘',price:50,sw:'#f6c6a8'},{id:'wood',name:'木板牆',price:60,sw:'#b98c5e'},{id:'star',name:'星空',price:80,sw:'#2c3558'}];
const FLOORS=[{id:'wood',name:'原木地板',price:0,sw:'#d8b385'},{id:'dark',name:'深色地板',price:40,sw:'#6a4a34'},{id:'tile',name:'白色磁磚',price:40,sw:'#eeece6'},{id:'carpet',name:'藍色地毯',price:50,sw:'#5b7fa8'},{id:'tatami',name:'榻榻米',price:60,sw:'#c9c48a'}];
// ---------- furniture catalogue: type floor|wall, fp = footprint [w,d] (for walking), build(group)
const FURN=[
  {k:'rug',name:'圓形地毯',price:40,type:'floor',fp:null,build:g=>{const m=mk(cy(1,1,.02,28),imat('#9a5a48',.35),0,.01,0,g,false);m.receiveShadow=true;mk(cy(.8,.8,.025,28),imat('#d8c8ac',.35),0,.012,0,g,false);}},
  {k:'plant',name:'大盆栽',price:30,type:'floor',fp:[.5,.5],build:g=>{mk(cy(.22,.17,.42,10),imat('#9a5e42',.3),0,.21,0,g);for(let i=0;i<5;i++){const f=mk(ico(.2+rand()*.08,0),imat(pick(['#557a4f','#4b6f47','#62855a']),.3),rr(-.12,.12),.62+i*.1,rr(-.12,.12),g);f.scale.y=1.3;}}},
  {k:'beanbag',name:'單人沙發',price:60,type:'floor',fp:[.9,.85],act:'sit',build:g=>{const F='#7e5642',C='#b48c6c';
    mk(bx(.84,.26,.78),imat(F,.3),0,.2,0,g);mk(bx(.62,.12,.6),imat(C,.35),0,.39,.05,g);
    mk(bx(.84,.5,.16),imat(F,.3),0,.58,-.32,g);mk(bx(.6,.36,.08),imat(C,.35),0,.6,-.22,g);
    [-.36,.36].forEach(x=>{mk(bx(.14,.34,.78),imat(F,.3),x,.44,0,g);mk(bx(.16,.05,.8),imat('#6a4636',.3),x,.63,0,g);});
    [[-.36,-.34],[.36,-.34],[-.36,.34],[.36,.34]].forEach(([x,z])=>mk(bx(.06,.07,.06),imat('#3e2a20',.2),x,.035,z,g));}},
  {k:'table',name:'小矮桌',price:50,type:'floor',fp:[1,.7],build:g=>{mk(bx(1,.06,.7),imat('#8a6446',.3),0,.38,0,g);[[-.42,-.28],[.42,-.28],[-.42,.28],[.42,.28]].forEach(([x,z])=>mk(bx(.06,.36,.06),imat('#6e4c33',.3),x,.18,z,g));mk(cy(.07,.06,.1,10),imat('#f3ead9',.4),.2,.46,.05,g);}},
  {k:'lamp',name:'落地燈',price:50,type:'floor',fp:[.4,.4],build:g=>{mk(cy(.18,.2,.05,12),imat('#3a3a3e',.3),0,.03,0,g);mk(cy(.02,.02,1.5,6),imat('#3a3a3e',.3),0,.78,0,g);mk(cy(.16,.26,.32,14),new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:.9}),0,1.6,0,g);addGlow(0,1.55,0,2.2,'#ffd79a','lamp',.9,g);}},
  {k:'fish',name:'金魚缸',price:80,type:'floor',fp:[.5,.5],act:'fish',build:g=>{mk(bx(.5,.7,.5),imat('#6e4c33',.3),0,.35,0,g);mk(sph(.3,18,14),new T.MeshLambertMaterial({color:col('#bfe6f2'),transparent:true,opacity:.45,emissive:col('#7fc8e0'),emissiveIntensity:.3,depthWrite:false}),0,.98,0,g,false);
    const f=new T.Group();f.position.set(0,.98,0);g.add(f);const fm=mk(sph(.06,8,6),imat('#f07a2a',.6),.15,0,0,f,false);fm.scale.set(1.6,.9,.7);const tl=mk(new T.ConeGeometry(.05,.08,4),imat('#f07a2a',.6),.25,0,0,f,false);tl.rotation.z=PI/2;g.userData.fish=f;}},
  {k:'maneki',name:'招財貓',price:70,type:'floor',fp:[.4,.4],act:'maneki',build:g=>{mk(bx(.4,.5,.4),imat('#6e4c33',.3),0,.25,0,g);const b=mk(sph(.16,12,10),imat('#f7f2e8',.45),0,.66,0,g);b.scale.y=1.1;mk(sph(.13,12,10),imat('#f7f2e8',.45),0,.9,0,g);[-1,1].forEach(s=>{const e=mk(new T.ConeGeometry(.05,.08,4),imat('#f7f2e8',.45),s*.07,1.02,0,g);});mk(cy(.1,.1,.03,12),imat('#d9573b',.5),0,.78,.06,g,false).rotation.x=PI/2;const paw=mk(sph(.05,8,6),imat('#f7f2e8',.45),.13,.95,.05,g);g.userData.paw=paw;}},
  {k:'teddy',name:'熊熊玩偶',price:50,type:'floor',fp:[.4,.4],act:'hug',build:g=>{const c='#b5835a';const b=mk(sph(.2,12,10),imat(c,.35),0,.2,0,g);b.scale.y=.9;mk(sph(.16,12,10),imat(c,.35),0,.48,0,g);[-1,1].forEach(s=>{mk(sph(.06,8,6),imat(c,.35),s*.12,.6,0,g);mk(sph(.07,8,6),imat(c,.35),s*.17,.22,.08,g);});mk(sph(.06,8,6),imat('#e8cfa8',.4),0,.45,.13,g);mk(sph(.018,6,4),imat('#2a1f1c',.2),-.05,.52,.14,g,false);mk(sph(.018,6,4),imat('#2a1f1c',.2),.05,.52,.14,g,false);}},
  {k:'books',name:'一疊漫畫',price:20,type:'floor',fp:[.4,.3],act:'read',build:g=>{let y=0;for(let i=0;i<5;i++){const h=.05;mk(bx(.3+rand()*.06,h,.22),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c','#8a6ad0']),.35),rr(-.02,.02),y+h/2,0,g).rotation.y=rr(-.2,.2);y+=h;}}},
  {k:'piano',name:'直立鋼琴',price:100,type:'floor',fp:[1.3,1.1],act:'piano',build:g=>{const W_='#3e2a20',Wl='#4e3628';
    mk(bx(1.3,1.15,.46),imat(W_,.3),0,.575,-.3,g);mk(bx(1.34,.06,.5),imat(Wl,.3),0,1.18,-.3,g);mk(bx(1.3,.08,.3),imat(Wl,.3),0,.72,-.02,g);
    mk(bx(1.16,.03,.16),imat('#f1ece2',.5),0,.775,.0,g,false);for(let i=0;i<14;i++){if([2,6,9,13].includes(i))continue;mk(bx(.035,.02,.09),imat('#1a1412',.2),-.52+i*.08,.795,-.03,g,false);}
    mk(bx(1.16,.3,.02),imat(Wl,.3),0,.95,-.06,g,false);mk(bx(.3,.12,.02),imat('#f1ece2',.5),0,1.0,-.05,g,false);
    [-.6,.6].forEach(x=>mk(bx(.08,.7,.08),imat(W_,.3),x,.35,.05,g));
    mk(bx(.7,.08,.34),imat(Wl,.3),0,.48,.42,g);[[-.3,.3],[.3,.3],[-.3,.54],[.3,.54]].forEach(([x,z])=>mk(bx(.05,.45,.05),imat(W_,.3),x,.22,z,g));}},
  {k:'scope',name:'天文望遠鏡',price:120,type:'floor',fp:[.6,.6],act:'scope',build:g=>{[0,2.1,4.2].forEach(a=>{const l=mk(cy(.022,.022,1.02,6),imat('#6a6a70',.3),Math.sin(a)*.2,.48,Math.cos(a)*.2,g);l.rotation.set(Math.cos(a)*.38,0,-Math.sin(a)*.38);});
    mk(cy(.06,.06,.1,10),imat('#3a3a40',.3),0,.98,0,g);const tb=new T.Group();tb.position.set(0,1.08,0);tb.rotation.x=-.85;g.add(tb);
    mk(cy(.085,.1,.95,14),imat('#2f4f8a',.4),0,.05,0,tb);mk(cy(.105,.105,.08,14),imat('#f2c14e',.45),0,.5,0,tb);mk(cy(.103,.103,.04,14),imat('#f4f1ea',.45),0,-.2,0,tb);
    mk(cy(.025,.03,.14,8),imat('#2a2a30',.3),0,-.46,0,tb);const f=mk(cy(.02,.02,.26,8),imat('#f4f1ea',.4),.11,.18,0,tb);}},
  {k:'poster',name:'小鎮海報',price:30,type:'wall',build:g=>{const [c,x]=C2(128,176);const gr=x.createLinearGradient(0,0,0,176);gr.addColorStop(0,'#26376a');gr.addColorStop(.55,'#f6a06a');gr.addColorStop(1,'#1a2d4a');x.fillStyle=gr;x.fillRect(0,0,128,176);x.fillStyle='#ffe9c0';x.beginPath();x.arc(64,98,16,0,PI*2);x.fill();x.fillStyle='#2a1f2c';x.fillRect(0,120,128,56);x.fillStyle='#f3ead9';x.font=`700 20px ${FG}`;x.textAlign='center';x.fillText('汐見町',64,34);
    mk(bx(.62,.84,.02),imat('#f3ead9',.4),0,0,0,g,false);mk(new T.PlaneGeometry(.56,.78),new T.MeshBasicMaterial({map:TX(c)}),0,0,.012,g,false);}},
  {k:'clock',name:'掛鐘',price:40,type:'wall',build:g=>{mk(cy(.22,.22,.05,24),imat('#6e4c33',.3),0,0,0,g,false).rotation.x=PI/2;mk(cy(.19,.19,.02,24),imat('#f7f2e8',.5),0,0,.03,g,false).rotation.x=PI/2;const h=mk(bx(.02,.12,.01),imat('#2a1f1c',.2),0,.05,.045,g,false);const m=mk(bx(.015,.17,.01),imat('#2a1f1c',.2),0,.07,.047,g,false);g.userData.hands=[h,m];}},
  {k:'lights',name:'星星燈串',price:60,type:'wall',build:g=>{const pts=[];for(let i=0;i<9;i++)pts.push(new T.Vector3(-.9+i*.225,-Math.sin(i/8*PI)*.18+.03,.02));
    mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts),40,.008,5,false),imat('#5a4a3a',.2),0,0,0,g,false);
    const sh=new T.Shape();for(let k=0;k<10;k++){const r=k%2?.03:.07,a=k/10*PI*2-PI/2;k?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r);}const sg=new T.ShapeGeometry(sh);
    for(let i=0;i<9;i++){const x=-.9+i*.225,y=-Math.sin(i/8*PI)*.18-.03;const c=pick(['#ffd79a','#ffe9c0','#ffc27a','#ffb3c6','#bfe6ff']);mk(sg,new T.MeshBasicMaterial({color:col(c),side:T.DoubleSide}),x,y,.03,g,false).rotation.z=rr(-.3,.3);mk(cy(.004,.004,.05,4),imat('#5a4a3a',.2),x,y+.05,.02,g,false);addGlow(x,y,.05,.5,c,'lamp',.9,g);}}},
  {k:'shelf',name:'壁掛小書架',price:40,type:'wall',build:g=>{mk(bx(.8,.05,.2),imat('#8a6446',.3),0,-.15,.1,g);for(let i=0;i<6;i++)mk(bx(.06,.22,.15),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c']),.35),-.3+i*.1,-.02,.1,g,false);}},
];
const FURN_BY=Object.fromEntries(FURN.map(f=>[f.k,f]));
let VISIT=null;   // visiting a classmate's room: {seat,name,home,back}
function homeState(){if(VISIT)return VISIT.home;if(!W.home)W.home={wall:'cream',floor:'wood',items:[],walls:['cream'],floors:['wood']};if(!W.furn)W.furn={};
  // a cosy starter set so the room never feels empty (added once; still movable / storable in 佈置)
  // v4 layout: no hard wooden armchair; rug + low table in the middle, goldfish bowl by the right wall
  const ST4=[{k:'rug',x:.1,z:.45},{k:'table',x:.1,z:.35,r:0},{k:'petbed',x:-2.45,z:.95,r:0},{k:'plant',x:-2.9,z:.15,r:0},{k:'lamp',x:1.05,z:-2.55,r:0},{k:'teddy',x:-1.75,z:-2.55,r:0},{k:'books',x:.55,z:-2.6,r:0},{k:'fish',x:2.65,z:.3,r:0},
    {k:'shelf',wall:'wb',u:-2.05,y:1.8},{k:'lights',wall:'wb',u:-2.6,y:2.2}];
  if(W.home.starter&&W.home.starter<4){const near=(d,pts)=>pts.some(([x,z])=>Math.abs(d.x-x)<.01&&Math.abs(d.z-z)<.01);
    W.home.items=W.home.items.filter(d=>!(d.k==='beanbag'&&near(d,[[-1.4,.2],[-1.35,1.15],[-1.3,1.75]])));
    W.home.items.forEach(d=>{if(d.k==='rug'&&near(d,[[-.2,.6],[.1,1.25],[.1,1.9]])){d.x=.1;d.z=1.05;}if(d.k==='table'&&near(d,[[-.2,.5],[.1,1.15],[.1,1.8]])){d.x=.1;d.z=.95;}});
    if(!W.home.items.some(d=>d.k==='fish')){W.home.items.push({k:'fish',x:2.65,z:.3,r:0});W.furn.fish=(W.furn.fish||0)+1;}W.home.starter=4;}
  if(W.home.starter===4){W.home.items.forEach(d=>{if(d.k==='rug'&&Math.abs(d.x-.1)<.01&&Math.abs(d.z-1.05)<.01)d.z=.45;if(d.k==='table'&&Math.abs(d.x-.1)<.01&&Math.abs(d.z-.95)<.01)d.z=.35;if(d.k==='fish'&&Math.abs(d.z-.95)<.01)d.z=.3;});
    if(!W.home.items.some(d=>d.k==='petbed')){W.home.items.push({k:'petbed',x:-2.45,z:.95,r:0});W.furn.petbed=(W.furn.petbed||0)+1;}W.home.starter=5;}
  W.home.items.forEach(d=>{if(!d.wall&&d.z>H2ZC-.2)d.z=H2ZC-.2;});
  if(!W.home.starter){W.home.starter=5;const have=new Set(W.home.items.map(d=>d.k));ST4.forEach(d=>{if(have.has(d.k))return;W.home.items.push(Object.assign({},d));W.furn[d.k]=(W.furn[d.k]||0)+1;});}
  return W.home;}
// ---------- build the room shell + fixed furniture
(function buildHome(){const G=new T.Group();G.position.set(HX,0,HZ);scene.add(G);HOME.g=G;const {RW,RD,RH}=HOME;
  HOME.wallMat=new T.MeshLambertMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.16,map:wallTexOf('cream')});HOME.wallMat.emissiveMap=HOME.wallMat.map;
  HOME.floorMat=new T.MeshLambertMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.07,map:floorTexOf('wood')});HOME.floorMat.emissiveMap=HOME.floorMat.map;
  const fg=new T.PlaneGeometry(RW,RD);fg.rotateX(-PI/2);const uv=fg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*RW/2.2,uv.getY(i)*RD/2.2);
  const fl=mk(fg,HOME.floorMat,0,0,0,G,false);fl.userData.pick='floor';fl.renderOrder=-3;
  {const vg=new T.PlaneGeometry(60,60);vg.rotateX(-PI/2);const v=mk(vg,new T.MeshBasicMaterial({color:0x1c1620,depthWrite:false}),0,-.05,0,G,false);v.renderOrder=-4;}
  HOME.ceil=mk(bx(RW,.2,RD),imat('#f6efe2',.35),0,RH+.1,0,G,false);
  const wall=(w,h,x,y,z,ry,tag)=>{const g=new T.PlaneGeometry(w,h);const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*w/1.6,u.getY(i)*h/1.6);const m=mk(g,HOME.wallMat,x,y,z,G,false);m.rotation.y=ry;m.userData.pick=tag;m.renderOrder=-2;return m;};
  HOME.wallMat.depthWrite=false;HOME.floorMat.depthWrite=false;
  wall(RD,RH,-RW/2,RH/2,0,PI/2,'wl');wall(RD,RH,RW/2,RH/2,0,-PI/2,'wr');
  // back wall with a window (x from -1.1 to .9, y .95..2.25)
  wall(RW/2-1.1,RH,(-RW/2-1.1)/2,RH/2,-RD/2,0,'wb');wall(RW/2-.9,RH,(RW/2+.9)/2,RH/2,-RD/2,0,'wb');wall(2,.95,-.1,.475,-RD/2,0,'wb');wall(2,RH-2.25,-.1,(RH+2.25)/2,-RD/2,0,'wb');
  // front wall with a door at x=2.2 (width 1.0, height 2.1)
  const fw=(w,h,x,y)=>{const m=wall(w,h,x,y,RD/2,PI,'wf');};fw(RW/2+1.7,RH,(-RW/2+1.7)/2,RH/2);fw(RW/2-2.7,RH,(2.7+RW/2)/2,RH/2);fw(1,RH-2.1,2.2,(RH+2.1)/2);
  // skirting board + outer shell so the room is closed from any camera angle
  [[RW,.12,.04,0,.06,-RD/2+.02],[RW,.12,.04,0,.06,RD/2-.02],[.04,.12,RD,-RW/2+.02,.06,0],[.04,.12,RD,RW/2-.02,.06,0]].forEach(([a,b,c,x,y,z])=>mk(bx(a,b,c),imat('#6e4c33',.3),x,y,z,G,false));
  

  // door
  {const [dc,dg]=C2(128,64);dg.fillStyle='#8a6a4a';dg.fillRect(0,0,128,64);dg.strokeStyle='#e6be78';dg.lineWidth=4;dg.strokeRect(6,6,116,52);dg.fillStyle='#f3ead9';dg.font=`700 22px ${FG}`;dg.textAlign='center';dg.textBaseline='middle';dg.fillText('出門 ↓',64,33);
   const t=TX(dc);const mat=mk(new T.PlaneGeometry(1.1,.55),new T.MeshLambertMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.35}),2.2,.012,2.62,G,false);mat.rotation.x=-PI/2;}
  // window + view
  const [vc,vg]=C2(256,160);const gr=vg.createLinearGradient(0,0,0,160);gr.addColorStop(0,'#ffffff');gr.addColorStop(.62,'#f0f0f0');gr.addColorStop(.63,'#9aa6b0');gr.addColorStop(1,'#6a7680');vg.fillStyle=gr;vg.fillRect(0,0,256,160);
  vg.fillStyle='rgba(60,50,60,.55)';for(let x=0;x<256;x+=rr(18,34)){const h=rr(12,30);vg.fillRect(x,100-h,rr(14,26),h+2);}vg.fillStyle='rgba(255,255,255,.6)';vg.fillRect(0,99,256,2);
  HOME.viewMat=new T.MeshBasicMaterial({map:TX(vc),toneMapped:false});mk(new T.PlaneGeometry(2,1.3),HOME.viewMat,-.1,1.6,-RD/2-.05,G,false);
  [[2.1,.08,-.1,2.28],[2.1,.08,-.1,.92]].forEach(([w,h,x,y])=>mk(bx(w,h,.12),imat('#f7f2e8',.45),x,y,-RD/2+.02,G,false));[-1.14,.94,-.1].forEach(x=>mk(bx(.07,1.36,.12),imat('#f7f2e8',.45),x,1.6,-RD/2+.02,G,false));
  [-1.35,1.15].forEach(x=>{const c=mk(bx(.45,1.7,.05),imat('#b08a7a',.35),x,1.55,-RD/2+.12,G,false);});mk(bx(2.8,.05,.05),imat('#6e4c33',.3),-.1,2.42,-RD/2+.12,G,false);
  // bed (back-left)
  mk(bx(1.3,.35,2.1),imat('#7a5638',.3),-2.8,.18,-1.9,G);mk(bx(1.2,.18,2),imat('#f7f2e8',.45),-2.8,.44,-1.9,G);const bl=mk(bx(1.24,.12,1.3),imat('#5a6f86',.4),-2.8,.56,-1.5,G);mk(bx(.8,.14,.4),imat('#fbf7ef',.5),-2.8,.6,-2.65,G);mk(bx(1.3,.7,.08),imat('#7a5638',.3),-2.8,.6,-2.96,G);
  addCol(HX-3.5,HX-2.1,HZ-3,HZ-.8,1);
  inter(new T.Vector3(HX-2.0,0,HZ-1.6),1.4,'在床上睡一下',()=>homeSleep());
  // desk + chair + lamp + catalogue
  mk(bx(1.5,.06,.7),imat('#9c7654',.35),2.3,.75,-2.6,G);[[1.6,-2.9],[3,-2.9],[1.6,-2.3],[3,-2.3]].forEach(([x,z])=>mk(bx(.06,.74,.06),imat('#8a6446',.3),x,.37,z,G));
  mk(bx(.45,.06,.45),imat('#a4563f',.35),2.3,.45,-1.9,G);mk(bx(.45,.5,.06),imat('#a4563f',.35),2.3,.72,-1.68,G);[[2.1,-2.1],[2.5,-2.1],[2.1,-1.7],[2.5,-1.7]].forEach(([x,z])=>mk(bx(.04,.44,.04),imat('#3a3a3e',.3),x,.22,z,G));
  mk(cy(.08,.1,.04,10),imat('#3a3a3e',.3),2.85,.8,-2.75,G);mk(cy(.015,.015,.35,5),imat('#3a3a3e',.3),2.85,.97,-2.75,G);mk(cy(.07,.14,.14,12),new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:.8}),2.85,1.15,-2.7,G,false);addGlow(2.85,1.1,-2.65,1.4,'#ffd79a','lamp',.8,G);
  const [cc,cg]=C2(128,96);cg.fillStyle='#e6be78';cg.fillRect(0,0,128,96);cg.fillStyle='#d9573b';cg.fillRect(0,0,128,26);cg.fillStyle='#fff';cg.font=`700 18px ${FG}`;cg.textAlign='center';cg.fillText('家具型錄',64,20);cg.fillStyle='#6e4c33';cg.fillRect(20,40,40,30);cg.fillStyle='#4fae6c';cg.fillRect(70,44,36,26);
  const cat=mk(new T.PlaneGeometry(.36,.27),new T.MeshBasicMaterial({map:TX(cc)}),2.1,.785,-2.55,G,false);cat.rotation.x=-PI/2;cat.rotation.z=.2;
  addCol(HX+1.55,HX+3.05,HZ-3,HZ-2.25,1);
  inter(new T.Vector3(HX+2.2,0,HZ-1.7),1.5,'翻開家具型錄（買家具）',()=>openDecor('shop'));
  // collection shelf (right wall) with the sea-glass jar
  mk(bx(.4,1.5,1.3),imat('#8a6446',.3),3.3,.75,-.5,G);[.35,.8,1.25].forEach(y=>mk(bx(.42,.04,1.3),imat('#6e4c33',.3),3.28,y,-.5,G,false));
  mk(cy(.13,.13,.3,14),new T.MeshLambertMaterial({color:col('#d8f0ee'),transparent:true,opacity:.4,emissive:col('#a8dcd6'),emissiveIntensity:.3,depthWrite:false}),3.22,1.43,-.85,G,false);
  HOME.jar=new T.Group();HOME.jar.position.set(3.22,1.3,-.85);G.add(HOME.jar);
  HOME.trophy=new T.Group();HOME.trophy.position.set(3.22,.84,-.2);G.add(HOME.trophy);mk(cy(.05,.08,.06,10),imat('#e6be78',.6),0,.03,0,HOME.trophy,false);mk(cy(.1,.04,.16,12),imat('#e6be78',.6),0,.16,0,HOME.trophy,false);
  for(let i=0;i<6;i++)mk(bx(.18,.24,.05),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c']),.35),3.22,.49,-1+i*.08,G,false).rotation.x=PI/2*.0;
  addCol(HX+3.05,HX+3.5,HZ-1.2,HZ+.2,2);
  inter(new T.Vector3(HX+2.6,0,HZ-.6),1.3,'看看我的收藏',()=>homeCollection());
  // stamp board (left wall above the bed) + certificate
  const [sc]=C2(1024,640);HOME.boardCanvas=sc;HOME.boardTex=TX(sc);mk(bx(1.56,1.02,.06),imat('#5e4130',.3),2.3,1.95,-RD/2+.03,G,false);const bd=mk(new T.PlaneGeometry(1.44,.9),new T.MeshBasicMaterial({map:HOME.boardTex}),2.3,1.95,-RD/2+.07,G,false);
  const [ac,ag]=C2(256,190);ag.fillStyle='#fbf5e6';ag.fillRect(0,0,256,190);ag.strokeStyle='#e6be78';ag.lineWidth=10;ag.strokeRect(8,8,240,174);ag.fillStyle='#d9573b';ag.font=`800 34px ${FG}`;ag.textAlign='center';ag.fillText('獎 狀',128,62);ag.fillStyle='#3a2a20';ag.font=`600 18px ${FG}`;ag.fillText('汐見町闖關 全部過關',128,110);ag.fillText('表現優異 特頒此狀',128,140);ag.fillStyle='#d9573b';ag.beginPath();ag.arc(200,160,14,0,PI*2);ag.fill();
  HOME.award=new T.Group();HOME.award.position.set(-2.6,1.95,-RD/2+.05);G.add(HOME.award);mk(bx(.72,.56,.03),imat('#6e4c33',.3),0,0,-.015,HOME.award,false);mk(new T.PlaneGeometry(.64,.48),new T.MeshBasicMaterial({map:TX(ac)}),0,0,.005,HOME.award,false);
  // pet bed
  mk(cy(.45,.4,.12,20),imat('#8e5a45',.35),PETBED.x,.06,PETBED.z,G);mk(cy(.36,.36,.05,20),imat('#f3ead9',.45),PETBED.x,.12,PETBED.z,G,false);
  // ceiling lamp
  HOME.ceil.visible=false;
  // warm lamp light so walls and furniture get soft shading like the town
  {const L=new T.PointLight(0xffd2a0,1.25,13,1.4);L.position.set(-.2,2.7,.3);G.add(L);HOME.light=L;}
  {const [c,g]=C2(128,160);g.filter='blur(4px)';
   [[12,60],[68,116]].forEach(([x0,x1])=>[[14,74],[82,142]].forEach(([y0,y1],r)=>{const k=r?.55:.9;g.fillStyle=`rgba(255,255,255,${k})`;const sk=.12;g.beginPath();g.moveTo(x0+y0*sk,y0);g.lineTo(x1+y0*sk,y0);g.lineTo(x1+y1*sk,y1);g.lineTo(x0+y1*sk,y1);g.closePath();g.fill();}));
   const sm=new T.MeshBasicMaterial({map:TX(c),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,color:0xffb070});
   const sg=new T.PlaneGeometry(2.1,2.4);sg.rotateX(-PI/2);sg.translate(0,0,1.2);const sh=mk(sg,sm,-.1,.02,-RD/2,G,false);sh.renderOrder=-1;HOME.sun=sm;}
  // the part of the room behind the camera: floor, side walls and a ceiling, so we look from inside
  {const EX=3.4;const fg2=new T.PlaneGeometry(RW,EX);fg2.rotateX(-PI/2);const u2=fg2.attributes.uv;for(let i=0;i<u2.count;i++)u2.setXY(i,u2.getX(i)*RW/2.2,u2.getY(i)*EX/2.2);
   const f2=mk(fg2,HOME.floorMat,0,0,RD/2+EX/2,G,false);f2.renderOrder=-3;
   wall(EX,RH,-RW/2,RH/2,RD/2+EX/2,PI/2,'x');wall(EX,RH,RW/2,RH/2,RD/2+EX/2,-PI/2,'x');
   const cg=new T.PlaneGeometry(RW,RD+EX);cg.rotateX(PI/2);const cm=new T.MeshLambertMaterial({color:col('#d9cbb6'),emissive:col('#3a2e24'),emissiveIntensity:.4});
   const c=mk(cg,cm,0,RH,EX/2,G,false);c.renderOrder=-2;
   mk(bx(RW,.12,.1),imat('#5e4130',.25),0,RH-.06,RD/2+EX-.05,G,false);}
  // doll-house shell: dark backdrop behind/around the room (hides the town far away) + wall-top trims
  {const bm=new T.MeshBasicMaterial({color:0x211a22});const pl=(w,h,x,y,z,ry)=>{const m=mk(new T.PlaneGeometry(w,h),bm,x,y,z,G,false);m.rotation.y=ry;m.renderOrder=-6;};
   pl(60,30,0,8,-RD/2-.4,0);pl(40,30,-RW/2-.4,8,0,PI/2);pl(40,30,RW/2+.4,8,0,-PI/2);
   const tm=imat('#5e4130',.25);mk(bx(RW+.36,.14,.36),tm,0,RH+.07,-RD/2-.18,G,false);mk(bx(.36,.14,RD),tm,-RW/2-.18,RH+.07,0,G,false);mk(bx(.36,.14,RD),tm,RW/2+.18,RH+.07,0,G,false);
   mk(bx(.3,RH,.3),tm,-RW/2-.15,RH/2,RD/2-.15,G,false);mk(bx(.3,RH,.3),tm,RW/2+.15,RH/2,RD/2-.15,G,false);}
  // contact shadows: wall/floor seams, and under the fixed furniture
  {const [c,g]=C2(64,64);const r=g.createRadialGradient(32,32,4,32,32,32);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
   const blobT=TX(c);HOME.blobM=new T.MeshBasicMaterial({map:blobT,color:0x2a1a14,transparent:true,depthWrite:false,opacity:.75,toneMapped:false});
   const [c2,g2]=C2(8,64);const lg=g2.createLinearGradient(0,0,0,64);lg.addColorStop(0,'rgba(0,0,0,.5)');lg.addColorStop(1,'rgba(0,0,0,0)');g2.fillStyle=lg;g2.fillRect(0,0,8,64);
   const seamM=new T.MeshBasicMaterial({map:TX(c2),color:0x2a1a14,transparent:true,depthWrite:false,opacity:.55,toneMapped:false});HOME.seamM=seamM;
   const seam=(w,x,z,ry)=>{const gq=new T.PlaneGeometry(w,.55);gq.rotateX(-PI/2);gq.translate(0,0,.275);const m=mk(gq,seamM,x,.015,z,G,false);m.rotation.y=ry;m.renderOrder=-1;};
   seam(RW,0,-RD/2,0);seam(RD,-RW/2,0,PI/2);seam(RD,RW/2,0,-PI/2);
   // vertical wall corner shading
   const vq=(x,z,ry)=>{const gq=new T.PlaneGeometry(RH,.45);gq.translate(0,-.225,0);const m=mk(gq,seamM,x,RH/2,z,G,false);m.rotation.set(0,ry,PI/2);m.renderOrder=-1;};
   vq(-RW/2+.01,-RD/2+.23,0);vq(RW/2-.01,-RD/2+.23,PI);
   const blob=(x,z,w,d,o=.75)=>{const gq=new T.PlaneGeometry(w,d);gq.rotateX(-PI/2);const m=mk(gq,o===.75?HOME.blobM:new T.MeshBasicMaterial({map:blobT,color:0x2a1a14,transparent:true,depthWrite:false,opacity:o,toneMapped:false}),x,.018,z,G,false);m.renderOrder=-1;return m;};
   blob(-2.8,-1.8,1.9,2.9);blob(2.3,-2.55,2.1,1.2,.55);blob(2.3,-1.85,.9,.9,.55);blob(3.25,-.5,.9,1.8);blob(PETBED.x,PETBED.z,1.3,1.3,.5);}
  G.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshLambertMaterial&&o.material.emissive&&!o.material.map)o.material.emissiveIntensity=.32;});
  // walls & door collisions
  addCol(HX-RW/2-.3,HX-RW/2,HZ-RD/2,HZ+RD/2,4);addCol(HX+RW/2,HX+RW/2+.3,HZ-RD/2,HZ+RD/2,4);addCol(HX-RW/2,HX+RW/2,HZ-RD/2-.3,HZ-RD/2,4);addCol(HX-RW/2,HX+RW/2,HZ+RD/2,HZ+RD/2+.3,4);
  inter(new T.Vector3(HX+1.7,0,HZ+1.35),1.3,'出門',()=>exitHome());
  inter(HOME.actPos,1.3,()=>HOME.act?HOME.act.label:'',()=>HOME.act&&HOME.act.fn());
})();
// fixed furniture footprints (room-local) — new furniture can't go here
const HOME_BLOCK=[[-3.5,-2.1,-3,-.8],[1.5,3.1,-3,-1.5],[3,3.5,-1.2,.2],[1.6,2.8,1.9,3],[PETBED.x-.5,PETBED.x+.5,PETBED.z-.5,PETBED.z+.5]];
// ---------- town house with "my home" door (closest house to the start of the shopping street)
(function(){if(!HOUSES.length)return;let best=null,bd=1e9;HOUSES.forEach(h=>{const p=l2w(h.g,h.dx,0,h.d/2+1.2);const d=Math.hypot(p.x-(-3),p.z-40);if(d<bd){bd=d;best={h,p};}});if(!best)return;
  const {h,p}=best;HOME.townOut=p;HOME.townYaw=h.g.rotation.y;
})();
// ---------- enter / leave
function homeSpawn(fromDoor){if(fromDoor){P.pos.set(HX+1.7,0,HZ+1.15);P.yaw=PI;cam.yaw=0;}else{P.pos.set(HX-1.6,0,HZ-.6);P.yaw=PI*.25;cam.yaw=PI*.12;}
  P.vel.set(0,0,0);P.sit=null;cam.pitch=.3;cam.dist=Math.max(cam.dist,5);cam.pos.set(P.pos.x+1.5,2.4,P.pos.z+3);cam.look.set(P.pos.x,1.2,P.pos.z);}
function enterHome(opts={}){VISIT=null;const go=()=>{INDOOR=true;HOME_IN=true;ST_IN=false;if(IS_TOUCH&&QT.open){QT.open=false;QT.last='';renderQuests();}homeSpawn(!opts.wake);applyHome();refreshHomeDecor();if(TROOM&&TROOM.home&&r2Ok())hrEnter(!!opts.wake);
    if(PETOBJ){PETOBJ.g.position.set(HX+PETBED.x,0,HZ+PETBED.z);PETOBJ.by=0;}
    curArea=null;areaCool=0;$('homeBar').hidden=false;SND.chime&&SND.chime();
    if(opts.wake||!W.homeSeen){const first=!W.homeSeen;W.homeSeen=true;save();
      setTimeout(()=>say(`${W.name||''}的房間`,first?['早安！這裡是你自己的房間。','書桌上有「家具型錄」，用闖關賺來的金幣可以買家具、換壁紙。','按「佈置」可以把家具擺到喜歡的位置。','準備好了，就從房門走出去，到車站搭火車去闖關吧！']:[pick(['早安！今天也一起加油吧！','又是新的一天！先去哪一關呢？','睡得好嗎？小鎮在等你喔！'])]),700);}};
  if(opts.wake)go();else fadeTo(go);}
function openLock(){const L=W.homeLock||{mode:'open',pass:''};msgOpen('我的家','門鎖設定',B=>{
  B.appendChild(el('p',{class:'help',text:'設定同學和老師來你家時能不能進門。來的人只能看，不能動你的家具。'}));
  const opts=[['open','🟢 歡迎大家來玩','同學走到門口就能進來'],['pass','🔑 要密碼才能進來','只有知道密碼的同學可以進來'],['closed','🔴 暫時不讓人進來','門口的留言板還是可以留言']];
  const pi=el('input',{class:'nb-in',maxlength:'4',inputmode:'numeric',placeholder:'4 位數字密碼',value:L.pass||''});pi.addEventListener('keydown',e=>e.stopPropagation());
  const box=el('div',{});const draw=()=>{box.innerHTML='';opts.forEach(([k,t,d])=>{const b=el('button',{type:'button',class:'nb-card lk-opt'+(L.mode===k?' on':''),html:`<b>${t}</b><small>${d}</small>`});b.onclick=()=>{L.mode=k;draw();};box.appendChild(b);});
    if(L.mode==='pass')box.appendChild(pi);};draw();B.appendChild(box);
  B.appendChild(el('button',{type:'button',class:'btn primary small',text:'儲存',onclick:()=>{if(L.mode==='pass'&&!/^\d{4}$/.test(pi.value)){toast('密碼要 4 位數字喔');return;}L.pass=L.mode==='pass'?pi.value:'';W.homeLock=L;save();toast(L.mode==='open'?'🟢 大家都可以來玩':L.mode==='pass'?'🔑 設好密碼了':'🔴 暫時不讓人進來');$('msgp').hidden=true;}}));});}
function exitHome(){if(DLG.open)return;if(VISIT){visitLeave();return;}closeDecor();choose('出門','要去哪裡呢？',[{label:'🚉 去平等車站',fn:()=>goOut('station')},{label:'⛰️ 走出家門（Sqoyaw）',fn:()=>goOut('tribe')},{label:'先待在家',fn:null}]);}
function goOut(where){closeDecor();HOME.from=null;if(where==='station'){enterStation();return;}if(where==='tribe'){fadeTo(()=>{INDOOR=false;HOME_IN=false;$('homeBar').hidden=true;arriveTribe('home');if(PETOBJ){PETOBJ.g.position.set(P.pos.x+1,P.pos.y,P.pos.z+.6);PETOBJ.by=P.pos.y;}});return;}fadeTo(()=>{INDOOR=false;HOME_IN=false;$('homeBar').hidden=true;const p=HOME.townOut||new T.Vector3(0,0,24);P.pos.set(p.x,0,p.z);P.vel.set(0,0,0);P.yaw=(HOME.townYaw||0);cam.yaw=P.yaw+.5;cam.pitch=.22;
  cam.pos.set(p.x+Math.sin(cam.yaw)*5,2.6,p.z+Math.cos(cam.yaw)*5);cam.look.set(p.x,1.4,p.z);if(PETOBJ){PETOBJ.g.position.set(p.x+1,0,p.z+.5);PETOBJ.by=0;}curArea=null;areaCool=0;SND.chime&&SND.chime();});}
function todayRecap(){const d0=new Date();d0.setHours(0,0,0,0);const H=(W.hist||[]).filter(h=>h.t>=d0.getTime());const n=k=>H.filter(h=>h.k===k).length;
  const L=[];const st=n('stamp')+n('gold');if(st)L.push(`拿到 ${st} 個印章`);if(n('req'))L.push(`幫鄰居完成 ${n('req')} 個委託`);if(n('adv'))L.push(`探險／走讀 ${n('adv')} 次`);if(n('pet'))L.push('和寵物變成好朋友');
  const inc=(W.ledger||[]).filter(e=>e&&e.t>=d0.getTime()&&e.a>0);const pocket=inc.filter(e=>/零用錢/.test(e.w||'')).reduce((a,e)=>a+e.a,0),gift=inc.filter(e=>/老師補發/.test(e.w||'')).reduce((a,e)=>a+e.a,0),coins=inc.reduce((a,e)=>a+e.a,0)-pocket-gift;
  if(coins)L.push(`賺了 ${coins} 金幣`);if(pocket)L.push(`收到零用錢 ${pocket} 金幣`);if(gift)L.push(`收到老師補發的 ${gift} 金幣`);return L;}
function homeSleep(){choose('床','要躺下來休息一下嗎？',[{label:'😴 躺一下（休息）',fn:()=>{const recap=()=>{if(W.pet){W.pet.mood=Math.min(100,(W.pet.mood||0)+10);renderPet();}save();
  const L=todayRecap();setTimeout(()=>say('今天辛苦了',[L.length?'今天你：'+L.join('、')+'。':'今天慢慢逛也很好。','今天的進度都已經存好了，明天見！'],{noWave:1}),1300);};
  if(R2.on&&R2.room==='home'){
    // fetch this bed's quilt, pillow dent and the sleeper's own head first (a phone may still be loading other pictures), then lie down
    const HN={hero1:'01',sailor:'02',hoodie:'03',sporty:'04',green:'05',redcap:'06'}[SPR.c&&SPR.c.id]||'xx',sk=R2.sk;
    hurry(new RegExp(`home_${sk}_bed_`));const HR=TROOM.home[sk].rest2||{},need=[HR.pillow_dent,HR.blanket_front,HR.heads&&HR.heads[HN]].filter(Boolean).map(e=>R2.img[e[2]]).filter(Boolean);
    const t0=performance.now(),go=()=>{if(need.every(im=>im.complete&&im.naturalWidth)||performance.now()-t0>4000){r2Rest(true);recap();}else setTimeout(go,120);};toast('鑽進被窩……');go();}
  else fadeTo(recap);}},{label:'不用了',fn:null}]);}
function homeCollection(){const all=allStamps(),n=all.filter(s=>stampDone(s.id)).length;
  say('我的收藏',[`印章：${n} / ${all.length} 個（床上方的軟木板）`,`海玻璃：${W.glass.length} / 5 片（架子上的玻璃瓶）`,n>=all.length?'全部過關了！牆上掛著你的獎狀 🎉':`再拿 ${all.length-n} 個印章，牆上就會出現獎狀喔！`]);}
// ---------- apply saved room: wallpaper, floor, furniture, collections
function setWall(id){const t=wallTexOf(id);const m=HOME.wallMat;if(m.map)m.map.dispose();m.map=t;m.emissiveMap=t;m.emissiveIntensity=id==='star'?.4:.16;m.needsUpdate=true;}
function setFloor(id){const t=floorTexOf(id);const m=HOME.floorMat;if(m.map)m.map.dispose();m.map=t;m.emissiveMap=t;m.needsUpdate=true;}
/* ---- illustrated look for rooms: soft cel shading + ink outlines (matches the hand-drawn characters) ---- */
const INK={grad:(()=>{const t=new T.DataTexture(new Uint8Array([105,105,105,255,178,178,178,255,255,255,255,255]),3,1,T.RGBAFormat);t.minFilter=t.magFilter=T.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})(),
  line:new T.MeshBasicMaterial({color:col('#80644e'),side:T.BackSide,toneMapped:false}),paper:col('#f3e6cf'),cache:new Map()};
const INK_GEO=new Set(['BoxGeometry','CylinderGeometry','SphereGeometry','IcosahedronGeometry','ConeGeometry','TorusGeometry','OctahedronGeometry','CapsuleGeometry']);
function inkMat(m){if(INK.cache.has(m))return INK.cache.get(m);const c=m.color.clone().lerp(INK.paper,.12);
  const t=new T.MeshToonMaterial({color:c,map:m.map||null,gradientMap:INK.grad,emissive:m.emissive?m.emissive.clone():new T.Color(0),emissiveMap:m.emissiveMap||null,emissiveIntensity:m.emissiveIntensity==null?1:m.emissiveIntensity,side:m.side});
  if(m.emissive)t.emissive.lerp(c,.35);INK.cache.set(m,t);return t;}
function inkify(root){const list=[];root.traverse(o=>{if(o.isMesh&&!o.userData.ink&&!o.userData.inkLine)list.push(o);});
  list.forEach(o=>{o.userData.ink=true;const m=o.material;if(!m||Array.isArray(m)||m.transparent||!(m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial))return;
    const gt=o.geometry&&o.geometry.type;if(gt==='PlaneGeometry'||gt==='ShapeGeometry'||gt==='TubeGeometry')return;
    if(!(m.emissiveIntensity>.8))o.material=inkMat(m);
    if(!INK_GEO.has(gt))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const s=new T.Vector3();o.geometry.boundingBox.getSize(s);const mx=Math.max(s.x,s.y,s.z),mn=Math.min(s.x,s.y,s.z);if(mx<.07)return;
    const th=Math.min(.012,Math.max(.0045,mn*.13));const h=new T.Mesh(o.geometry,INK.line);h.userData.inkLine=true;h.castShadow=false;h.receiveShadow=false;h.scale.set(1+2*th/Math.max(s.x,.001),1+2*th/Math.max(s.y,.001),1+2*th/Math.max(s.z,.001));h.renderOrder=o.renderOrder;o.add(h);});}
inkify(HOME.g);
function applyHome(){const H=homeState();setWall(H.wall);setFloor(H.floor);
  HOME.items.forEach(it=>HOME.g.remove(it.g));HOME.items=[];H.items.forEach(d=>spawnItem(d));rebuildHomeCols();}
function spawnItem(d){const f=FURN_BY[d.k];if(!f)return null;const g=new T.Group();f.build(g);if(f.type==='floor'&&f.fp){const gq=new T.PlaneGeometry(f.fp[0]*1.5,f.fp[1]*1.5);gq.rotateX(-PI/2);const sh=new T.Mesh(gq,HOME.blobM);sh.position.y=.02;sh.renderOrder=-1;g.add(sh);}g.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshLambertMaterial&&o.material.emissive&&!o.material.map)o.material.emissiveIntensity=.32;});inkify(g);g.userData.item=d;HOME.g.add(g);placeItemGroup(g,d);const it={d,g,f};HOME.items.push(it);return it;}
function placeItemGroup(g,d){if(d.wall){const {RW,RD}=HOME;const y=d.y||1.75;
    if(d.wall==='wb'){g.position.set(d.u,y,-RD/2+.03);g.rotation.y=0;}else if(d.wall==='wl'){g.position.set(-RW/2+.03,y,d.u);g.rotation.y=PI/2;}else if(d.wall==='wr'){g.position.set(RW/2-.03,y,d.u);g.rotation.y=-PI/2;}else{g.position.set(d.u,y,RD/2-.03);g.rotation.y=PI;}}
  else{g.position.set(d.x,0,d.z);g.rotation.y=(d.r||0)*PI/2;}}
function rebuildHomeCols(){HOME.cols.forEach(c=>{const i=COLS.indexOf(c);if(i>=0)COLS.splice(i,1);});HOME.cols=[];
  HOME.items.forEach(it=>{if(it.d.wall||!it.f.fp)return;let [w,d]=it.f.fp;if((it.d.r||0)%2){[w,d]=[d,w];}const c={x0:HX+it.d.x-w/2,x1:HX+it.d.x+w/2,z0:HZ+it.d.z-d/2,z1:HZ+it.d.z+d/2,y0:-6,y1:1.2};COLS.push(c);HOME.cols.push(c);});}
function refreshHomeDecor(){// stamp board — washi paper with vermilion hanko stamps
  const g=HOME.boardCanvas.getContext('2d'),Wc=1024,Hc=640,all=allStamps();
  g.fillStyle='#f4ead6';g.fillRect(0,0,Wc,Hc);
  for(let i=0;i<260;i++){g.strokeStyle=`rgba(150,120,80,${.05+Math.random()*.06})`;g.lineWidth=1;g.beginPath();const x=Math.random()*Wc,y=Math.random()*Hc;g.moveTo(x,y);g.quadraticCurveTo(x+rr(-20,20),y+rr(-20,20),x+rr(-40,40),y+rr(-40,40));g.stroke();}
  g.strokeStyle='#c9a276';g.lineWidth=3;g.strokeRect(22,22,Wc-44,Hc-44);
  const MF='"Shippori Mincho B1","Hiragino Mincho ProN","Noto Serif TC",serif';
  g.fillStyle='#3a2a20';g.font=`800 50px ${MF}`;g.textAlign='center';g.textBaseline='middle';g.fillText(`${W.name||''}的集章帳`,Wc/2,78);
  const done=all.filter(s=>stampDone(s.id)).length;g.fillStyle='#8a6a4a';g.font=`600 26px ${FG}`;g.fillText(`${done} / ${all.length}`,Wc/2,122);
  const cols=Math.min(5,Math.max(1,Math.ceil(all.length/2))),rows=Math.ceil(all.length/cols),cw=(Wc-120)/cols,chh=(Hc-190)/Math.max(1,rows);
  all.forEach((st,i)=>{const cx=60+cw*(i%cols)+cw/2,cy=170+chh*Math.floor(i/cols)+chh/2-10,ok=stampDone(st.id),ch=(st.subject||'?')[0],R=Math.min(cw,chh)*.3;
    if(ok){g.save();g.translate(cx,cy);g.rotate(((i*37)%11-5)*.025);
      g.fillStyle='#c8412b';rrect(g,-R,-R,R*2,R*2,R*.28);g.fill();
      g.globalCompositeOperation='destination-out';for(let k=0;k<70;k++){g.fillStyle=`rgba(0,0,0,${Math.random()*.5})`;g.fillRect(rr(-R,R),rr(-R,R),rr(1,4),rr(1,3));}g.globalCompositeOperation='source-over';
      g.strokeStyle='#f4ead6';g.lineWidth=4;rrect(g,-R+8,-R+8,R*2-16,R*2-16,R*.2);g.stroke();
      g.fillStyle='#f4ead6';g.font=`800 ${Math.round(R*1.15)}px ${MF}`;g.fillText(ch,0,4);g.restore();}
    else{g.strokeStyle='rgba(138,106,74,.45)';g.setLineDash([8,7]);g.lineWidth=3;rrect(g,cx-R,cy-R,R*2,R*2,R*.28);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(138,106,74,.4)';g.font=`700 ${Math.round(R*.9)}px ${MF}`;g.fillText(ch,cx,cy+3);}
    g.fillStyle=ok?'#3a2a20':'rgba(58,42,32,.45)';g.font=`600 22px ${FG}`;const lab=(st.subject||'')+(st.title?'・'+st.title:'');g.fillText(lab.length>8?lab.slice(0,8)+'…':lab,cx,cy+R+30);});
  HOME.boardTex.needsUpdate=true;
  // sea glass jar
  while(HOME.jar.children.length)HOME.jar.remove(HOME.jar.children[0]);W.glass.forEach((gi,i)=>{const m=mk(sph(.045,6,5),new T.MeshLambertMaterial({color:col(['#7fd0c0','#9ad07a','#8ab8e8','#e8c07a','#c8a0e0'][i%5]),emissive:col('#446'),emissiveIntensity:.3}),rr(-.07,.07),i*.03,rr(-.07,.07),HOME.jar,false);m.scale.y=.6;});
  HOME.award.visible=all.length>0&&all.every(s=>stampDone(s.id));HOME.trophy.visible=all.filter(s=>stampDone(s.id)).length>=Math.ceil(all.length/2);}
// ---------- per-frame: window colour, fish, clock, nearest usable furniture, pet goes to its bed
const RD_FRONT=3;
function homeTick(dt){if(!HOME_IN)return;HOME.sun.color.copy(S.glowCol).multiplyScalar(.11*(1-S.night)+.01);HOME.light.intensity=.95+S.night*.35;HOME.light.color.setHex(S.night>.5?0xffc890:0xffe2c6);if(P.moving>.2||!HOME.lastMove)HOME.lastMove=performance.now();HOME.viewMat.color.copy(S.skyHorizon).lerp(S.skyTop,.25).multiplyScalar(1.05);
  let best=null,bd=1.3;HOME.items.forEach(it=>{const fu=it.g.userData;if(fu.fish){fu.fish.rotation.y+=dt*1.2;}if(fu.hands){const d=new Date();fu.hands[0].rotation.z=-((d.getHours()%12)+d.getMinutes()/60)/12*PI*2;fu.hands[1].rotation.z=-d.getMinutes()/60*PI*2;}
    if(fu.paw)fu.paw.position.y=.95+Math.max(0,Math.sin(time*3))*.05;
    if(!it.f.act||it.d.wall)return;const d=Math.hypot(P.pos.x-(HX+it.d.x),P.pos.z-(HZ+it.d.z));if(d<bd){bd=d;best=it;}});
  if(best&&!HOME.edit){HOME.actPos.set(HX+best.d.x,0,HZ+best.d.z);HOME.act=furnAct(best);}else{HOME.actPos.set(0,-50,0);HOME.act=null;}
  if(HOME.selRing){HOME.selRing.visible=!!HOME.sel&&HOME.edit;if(HOME.sel){const p=HOME.sel.g.position;HOME.selRing.position.set(p.x,.03,p.z);if(HOME.sel.d.wall)HOME.selRing.visible=false;}}}
function furnAct(it){const k=it.f.act,n=it.f.name;
  if(k==='sit')return {label:`坐在${n}上`,fn:()=>{P.sit={pos:new T.Vector3(HX+it.d.x,.42,HZ+it.d.z),face:(it.d.r||0)*PI/2};}};
  if(k==='piano')return {label:'彈鋼琴',fn:()=>{if(A.ready){const t=A.ctx.currentTime;[72,74,76,79,76,74,72,79].forEach((m,i)=>tone(440*Math.pow(2,(m-69)/12),t+i*.22,.5,'triangle',.08,A.sfx));}toast('♪ 叮叮噹噹～');}};
  if(k==='fish')return {label:'餵金魚',fn:()=>{toast('金魚開心地游來游去 🐟');}};
  if(k==='maneki')return {label:'摸摸招財貓',fn:()=>{say('招財貓',[pick(['喵～祝你今天答題全對！','好運來～記得先把題目看清楚喔。','招財貓對你揮揮手。'])]);}};
  if(k==='hug')return {label:'抱抱熊熊',fn:()=>{heart(it.g.getWorldPosition(new T.Vector3()));toast('軟綿綿的～');}};
  if(k==='read')return {label:'看漫畫',fn:()=>{say('漫畫',[pick(['主角說：「失敗了也沒關係，再試一次就好！」','這一集，主角和他的貓一起去海邊撿玻璃。','你看得太入迷，差點忘了還有關卡要闖！'])]);}};
  if(k==='scope')return {label:'看望遠鏡',fn:()=>{say('望遠鏡',[S.night>.5?'看得到好多星星！那顆特別亮的是金星嗎？':'白天看不到星星，但可以看到遠方的漁船和燈塔。'])}};
  return null;}
// ---------- decorate / shop panel
function openDecor(mode){if(!HOME_IN)return;if(mode==='edit')dailyEvent('decor');if(DLG.open)closeDlg();HOME.mode=mode;HOME.tab='furn';HOME.edit=mode==='edit';HOME.pending=null;HOME.sel=null;
  if(!HOME.selRing){HOME.selRing=new T.Mesh(new T.RingGeometry(.45,.55,32).rotateX(-PI/2),new T.MeshBasicMaterial({color:0xe6be78,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));HOME.g.add(HOME.selRing);HOME.selRing.visible=false;}
  document.body.classList.toggle('decorating',HOME.edit);$('decor').hidden=false;renderDecor();}
function closeDecor(){if($('decor').hidden)return;$('decor').hidden=true;HOME.edit=false;HOME.pending=null;HOME.sel=null;document.body.classList.remove('decorating');save();cv.focus({preventScroll:true});}
// catalogue photos: render every furniture model once into a small picture (same model the student gets)
const FURN_PIC={};
function furnPics(){if(FURN_PIC._done)return;FURN_PIC._done=true;
  try{const R=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});R.setSize(160,128);R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;
    const sc=new T.Scene();sc.add(new T.HemisphereLight(0xfff4e6,0x6a5040,1.0));const dl=new T.DirectionalLight(0xffe2c6,1.1);dl.position.set(2,4,3);sc.add(dl);
    const cm=new T.PerspectiveCamera(32,160/128,.05,50);
    FURN.forEach(f=>{const g=new T.Group();f.build(g);g.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshLambertMaterial&&o.material.emissive&&!o.material.map)o.material.emissiveIntensity=.32;if(o.isSprite){o.scale.multiplyScalar(.55);o.material=o.material.clone();o.material.opacity=.55;}});inkify(g);
      sc.add(g);const box=new T.Box3().setFromObject(g);const c=box.getCenter(new T.Vector3()),sz=box.getSize(new T.Vector3());const r=Math.max(sz.x,sz.y,sz.z)*.62+.05;
      if(f.type==='wall'){cm.position.set(c.x+r*.25,c.y+r*.15,c.z+r*2.6);}else{cm.position.set(c.x+r*1.55,c.y+r*1.3,c.z+r*2.1);}cm.lookAt(c);
      R.render(sc,cm);FURN_PIC[f.k]=R.domElement.toDataURL('image/png');sc.remove(g);});
    R.dispose();R.forceContextLoss&&R.forceContextLoss();}catch(e){}}
function surfPic(isWall,id){const k=(isWall?'w:':'f:')+id;if(FURN_PIC[k])return FURN_PIC[k];const t=isWall?wallTexOf(id):floorTexOf(id);const src=t.image;const [c,g]=C2(160,96);
  const pat=g.createPattern(src,'repeat');g.save();g.scale(.6,.6);g.fillStyle=pat;g.fillRect(0,0,160/.6,96/.6);g.restore();t.dispose();return FURN_PIC[k]=c.toDataURL('image/png');}
function renderDecor(){furnPics();const H=homeState();const shop=HOME.mode==='shop';
  $('dcTitle').textContent=shop?'家具型錄':'佈置房間';$('dcCoins').textContent=`金幣 ${W.coins}`;
  const tabs=$('dcTabs');tabs.innerHTML='';[['furn','家具'],['wall','壁紙'],['floor','地板']].forEach(([k,l])=>{const b=el('button',{type:'button',text:l,'aria-selected':String(HOME.tab===k)});b.onclick=()=>{HOME.tab=k;HOME.pending=null;renderDecor();};tabs.appendChild(b);});
  const list=$('dcList');list.innerHTML='';const hint=$('dcHint');const sel=$('dcSel');sel.hidden=true;
  if(HOME.tab==='furn'){
    if(shop){hint.textContent='用闖關賺來的金幣買家具，買了再按「佈置」擺到房間裡。';
      FURN.filter(f=>!f.rare).forEach(f=>{const own=W.furn[f.k]||0;const b=el('button',{type:'button',class:'dc-item'},[el('img',{class:'dc-pic',src:FURN_PIC[f.k]||'',alt:''}),el('b',{text:f.name}),el('span',{text:`${f.price} 金幣${own?`・已有 ${own}`:''}`}),el('small',{text:f.type==='wall'?'掛牆上':'放地上'})]);
        b.onclick=()=>{if(W.coins<f.price){toast(`金幣不夠（需要 ${f.price}）`);SND.wrong&&SND.wrong();return;}W.coins-=f.price;led(-f.price,`家具：${f.name}`,'家具');W.furn[f.k]=own+1;renderPouch();save();SND.register&&SND.register();toast(`買了「${f.name}」！按「佈置」放進房間`);renderDecor();};list.appendChild(b);});}
    else{const placed={};H.items.forEach(d=>placed[d.k]=(placed[d.k]||0)+1);const avail=FURN.filter(f=>(W.furn[f.k]||0)-(placed[f.k]||0)>0);
      hint.textContent=HOME.pending?`點房間裡的${FURN_BY[HOME.pending.k].type==='wall'?'牆壁':'地板'}，把「${FURN_BY[HOME.pending.k].name}」放上去`:avail.length?'點一個家具，再點房間的地板（或牆壁）放下去。點已經放好的家具，可以轉向或收起來。':'還沒有可以擺的家具。書桌上的「家具型錄」可以買喔！（已經擺好的家具，點一下可以移動）';
      avail.forEach(f=>{const left=(W.furn[f.k]||0)-(placed[f.k]||0);const b=el('button',{type:'button',class:'dc-item','aria-pressed':String(!!HOME.pending&&HOME.pending.k===f.k&&!HOME.pending.it)},[el('img',{class:'dc-pic',src:FURN_PIC[f.k]||'',alt:''}),el('b',{text:f.name}),el('span',{text:`還有 ${left} 個`})]);b.onclick=()=>{HOME.pending={k:f.k};HOME.sel=null;renderDecor();};list.appendChild(b);});
      if(HOME.sel){sel.hidden=false;sel.innerHTML='';sel.appendChild(el('span',{text:`選到：${HOME.sel.f.name}`}));
        if(!HOME.sel.d.wall){const r=el('button',{type:'button',class:'btn ghost small',text:'轉向'});r.onclick=()=>{HOME.sel.d.r=((HOME.sel.d.r||0)+1)%4;placeItemGroup(HOME.sel.g,HOME.sel.d);rebuildHomeCols();save();};sel.appendChild(r);}
        const mv=el('button',{type:'button',class:'btn ghost small',text:'移動'});mv.onclick=()=>{HOME.pending={k:HOME.sel.d.k,it:HOME.sel};renderDecor();};sel.appendChild(mv);
        const rm=el('button',{type:'button',class:'btn ghost small',text:'收起來'});rm.onclick=()=>{const it=HOME.sel;H.items.splice(H.items.indexOf(it.d),1);HOME.g.remove(it.g);HOME.items.splice(HOME.items.indexOf(it),1);HOME.sel=null;rebuildHomeCols();save();renderDecor();};sel.appendChild(rm);}}}
  else{const isWall=HOME.tab==='wall';const opts=isWall?WALLPAPERS:FLOORS;const ownedList=isWall?H.walls:H.floors;
    hint.textContent=shop?'買了就能隨時換。':'點一下就換上去。還沒買的，到書桌上的型錄買。';
    opts.forEach(o=>{const own=o.price===0||ownedList.includes(o.id);const on=(isWall?H.wall:H.floor)===o.id;
      if(!shop&&!own)return;
      const b=el('button',{type:'button',class:'dc-item','aria-pressed':String(on)},[el('img',{class:'dc-pic',src:surfPic(isWall,o.id),alt:''}),el('b',{text:o.name}),el('span',{text:own?(on?'使用中':'已擁有'):`${o.price} 金幣`})]);
      b.onclick=()=>{if(!own){if(W.coins<o.price){toast(`金幣不夠（需要 ${o.price}）`);return;}W.coins-=o.price;led(-o.price,`裝潢：${o.name}`,'家具');ownedList.push(o.id);renderPouch();SND.register&&SND.register();}
        if(isWall){H.wall=o.id;setWall(o.id);}else{H.floor=o.id;setFloor(o.id);}save();renderDecor();};list.appendChild(b);});}}
$('dcDone').onclick=closeDecor;$('dcClose').onclick=closeDecor;
$('bHist').onclick=()=>openBoard('hist');$('bDecor').onclick=()=>openDecor('edit');$('bShop').onclick=()=>openDecor('shop');$('bOut').onclick=()=>exitHome();$('bLock').onclick=()=>openLock();
// ---------- tap in the room while decorating
const _ray=new T.Raycaster(),_ndc=new T.Vector2();let _hd=null;
cv.addEventListener('pointerdown',e=>{_hd={x:e.clientX,y:e.clientY};});
cv.addEventListener('pointerup',e=>{if(!HOME.edit||!_hd)return;if(Math.hypot(e.clientX-_hd.x,e.clientY-_hd.y)>8)return;homeClick(e);});
function homeClick(e){const r=cv.getBoundingClientRect();_ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);_ray.setFromCamera(_ndc,camera);
  const H=homeState();
  if(!HOME.pending){// select a placed item
    const hits=_ray.intersectObjects(HOME.items.map(i=>i.g),true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.item)o=o.parent;HOME.sel=HOME.items.find(i=>i.g===o)||null;SND.pick&&A.ready&&SND.pick();}else HOME.sel=null;renderDecor();return;}
  const f=FURN_BY[HOME.pending.k];const targets=HOME.g.children.filter(c=>c.userData&&c.userData.pick);const hits=_ray.intersectObjects(targets,false);if(!hits.length)return;
  const h=hits.find(x=>f.type==='wall'?x.object.userData.pick!=='floor':x.object.userData.pick==='floor');if(!h){toast(f.type==='wall'?'這個要掛在牆上喔':'這個要放在地板上喔');return;}
  const lp=HOME.g.worldToLocal(h.point.clone());let d;
  if(f.type==='wall'){const tag=h.object.userData.pick;const u=tag==='wb'||tag==='wf'?lp.x:lp.z;const lim=tag==='wb'||tag==='wf'?HOME.RW/2-.6:HOME.RD/2-.6;
    d={k:f.k,wall:tag,u:Math.round(clamp(u,-lim,lim)*4)/4,y:Math.round(clamp(lp.y,1.2,2.4)*4)/4};
    if(tag==='wb'&&Math.abs(d.u+.1)<1.4&&d.y<2.6&&d.y>.9){toast('這裡是窗戶，換個地方掛吧');return;}if(tag==='wb'&&(Math.abs(d.u-2.3)<1.2||Math.abs(d.u+2.6)<.8)&&d.y>1.3){toast('這裡掛了集章帳／獎狀，換個地方吧');return;}if(tag==='wf'&&Math.abs(d.u-2.2)<.9){toast('門口不能掛東西喔');return;}}
  else{const x=Math.round(clamp(lp.x,-3.1,3.1)*4)/4,z=Math.round(clamp(lp.z,-2.7,2.7)*4)/4;const fp=f.fp||[.3,.3];
    if(HOME_BLOCK.some(([a,b,c,dd])=>x+fp[0]/2>a&&x-fp[0]/2<b&&z+fp[1]/2>c&&z-fp[1]/2<dd)&&f.k!=='rug'){toast('這裡有東西了，換個地方吧');return;}
    d={k:f.k,x,z,r:HOME.pending.it?HOME.pending.it.d.r||0:0};}
  if(HOME.pending.it){const it=HOME.pending.it;Object.keys(it.d).forEach(k=>delete it.d[k]);Object.assign(it.d,d);placeItemGroup(it.g,it.d);HOME.sel=it;}
  else{H.items.push(d);HOME.sel=spawnItem(d);}
  HOME.pending=null;rebuildHomeCols();save();SND.pick&&A.ready&&SND.pick();renderDecor();}

/* ================================================================
   公告板: teacher news · daily tasks · resident requests · reading log
   ================================================================ */
const NB={pos:new T.Vector3(-2.5,0,50.5),tab:'news'};
(function(){const g=new T.Group();g.position.set(-3.5,0,50.5);g.rotation.y=PI/2;g.userData.dyn=true;scene.add(g);
  const wd=lam('#6e4c33'),wl=lam('#8a6446');
  [-1.05,1.05].forEach(x=>mk(bx(.14,2.5,.14),wd,x,1.25,0,g));
  mk(bx(2.3,1.45,.1),wl,0,1.55,0,g);mk(bx(2.5,.08,.5),lam('#3d4553'),0,2.52,0,g).rotation.x=.12;
  const [c,x]=C2(512,320);x.fillStyle='#b98f64';x.fillRect(0,0,512,320);speckle(x,512,320,3000,.12);
  const notes=[['#f6efdc',30,40,150,110,-.06],['#f3e2a8',200,26,130,120,.05],['#f6efdc',350,50,130,100,-.03],['#e8f0dc',60,175,140,110,.04],['#f6efdc',230,175,120,120,-.05],['#f3d6c8',370,180,110,100,.07]];
  notes.forEach(([col_,nx,ny,w,h,r])=>{x.save();x.translate(nx+w/2,ny+h/2);x.rotate(r);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(-w/2+3,-h/2+4,w,h);x.fillStyle=col_;x.fillRect(-w/2,-h/2,w,h);
    x.fillStyle='rgba(60,40,30,.55)';for(let k=0;k<4;k++)x.fillRect(-w/2+12,-h/2+22+k*18,w-24-(k%2)*20,4);x.fillStyle='#c8412b';x.beginPath();x.arc(0,-h/2+8,6,0,PI*2);x.fill();x.restore();});
  const m=emMat(TX(c),TX(c),'signs');mk(new T.PlaneGeometry(2.1,1.3),m,0,1.55,.06,g,false);
  const [tc,tx]=C2(256,64);tx.fillStyle='#3a2a20';tx.fillRect(0,0,256,64);tx.fillStyle='#f3ead9';tx.font=`800 34px ${FG}`;tx.textAlign='center';tx.textBaseline='middle';tx.fillText('公 告 板',128,34);
  mk(new T.PlaneGeometry(1.1,.28),new T.MeshBasicMaterial({map:TX(tc)}),0,2.4,.08,g,false);
  colLocal(g,-1.2,1.2,-.2,.2,3);})();
addMarker(()=>NB.pos,()=>'公告',()=>'info',3.1,{info:true});
inter(NB.pos,2.3,()=>newsUnseen()?'看公告板（有新消息！）':'看公告板',()=>openBoard());

// ---------- daily tasks
const DAILY_POOL=[
  {id:'quiz',t:'挑戰任何一個關卡',ev:'quiz',n:1},{id:'pass',t:'有一關全部答對',ev:'pass',n:1},
  {id:'cat',t:'摸摸 2 隻貓',ev:'catpet',n:2},{id:'feed',t:'餵寵物吃一次東西',ev:'feed',n:1,need:()=>!!W.pet},
  {id:'talk',t:'和 3 位鎮民說說話',ev:'talk',n:3},{id:'buy',t:'在販賣機或便利商店買東西',ev:'buy',n:1},
  {id:'beach',t:'到汐見浜（海灘）走走',ev:'visit:汐見浜',n:1},{id:'shrine',t:'爬到山上的神社',ev:'visit:汐見神社',n:1},
  {id:'station',t:'去車站看看',ev:'visit:汐見駅',n:1},{id:'sit',t:'找個地方坐下來休息',ev:'sit',n:1},
  {id:'read',t:'在公告板寫一則讀書心得',ev:'read',n:1},{id:'decor',t:'回房間佈置一下',ev:'decor',n:1},
  {id:'pier',t:'到防波堤看看釣魚告示牌',ev:'visit:東防波堤',n:1},
  {id:'hall',t:'去挑戰館看看',ev:'visit:挑戦館',n:1},{id:'isle',t:'搭船去神秘小島',ev:'visit:神秘の島',n:1,need:()=>normalStampCount()>=3},
  {id:'maze',t:'穿過瀑布走進迷宮',ev:'visit:滝の迷宮',n:1,need:()=>!!(W.adv&&W.adv.map)}];
function todayStr(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dailyState(){const t=todayStr();if(!W.daily||W.daily.date!==t){let h=0;for(const ch of t+W.seat)h=(h*31+ch.charCodeAt(0))>>>0;
    const pool=DAILY_POOL.filter(d=>!d.need||d.need());const ids=[];while(ids.length<3&&pool.length){h=(h*1103515245+12345)>>>0;ids.push(pool.splice(h%pool.length,1)[0].id);}
    W.daily={date:t,ids,prog:{},done:[],bonus:false};}return W.daily;}
function dailyEvent(ev){if(!started||!W.seat)return;const D=dailyState();let changed=false;
  D.ids.forEach(id=>{const d=DAILY_POOL.find(x=>x.id===id);if(!d||d.ev!==ev||D.done.includes(id))return;D.prog[id]=(D.prog[id]||0)+1;changed=true;
    if(D.prog[id]>=d.n){D.done.push(id);petEvent('daily');W.coins+=15;led(15,`每日任務：${d.t}`,'任務');renderPouch();SND.stamp&&A.ready&&SND.stamp();toast(`每日任務完成：${d.t}（+15 金幣）`);}});
  if(changed&&!D.bonus&&D.done.length>=D.ids.length){D.bonus=true;W.coins+=20;led(20,'每日任務全部完成','任務');renderPouch();setTimeout(()=>toast('今天的每日任務全部完成！額外 +20 金幣'),1800);}
  if(changed){save();if(!$('board').hidden)renderBoard();}}

// ---------- resident requests
const REQS=[
  {id:'murata',who:'村田爺爺',t:'幫我買一個肉包',d:'「年紀大了，走不到便利商店……可以幫我買一個熱熱的肉包嗎？」（買到後回公告板交給我）',reward:40,
    ok:()=>(W.items['肉包']||0)>0,hint:()=>`便利商店櫃台可以買肉包。${(W.items['肉包']||0)>0?'你已經有肉包了！':''}`,take:()=>addItem('肉包',-1)},
  {id:'ken',who:'健叔',t:'撿 3 片海玻璃給我看',d:'「海邊的玻璃被海浪磨得圓圓的，像寶石一樣。撿 3 片來給我看看吧！」',reward:30,ok:()=>W.glass.length>=3,hint:()=>`目前 ${Math.min(3,W.glass.length)}/3 片`},
  {id:'guard',who:'導護阿姨',t:'和寵物成為好朋友',d:'「照顧動物也是一種責任喔。和你的寵物親密度到 Lv.2 再來找我。」',reward:30,ok:()=>!!W.pet&&petLv()>=2,hint:()=>W.pet?`${W.pet.name} 目前 Lv.${petLv()}`:'先領養一隻寵物'},
  {id:'diner',who:'食堂阿姨',t:'找到走丟的小玉',d:'「我家的三花貓小玉跑出去了！她最愛小魚乾，拜託讓她跟著你回到食堂門口。」',reward:40,ok:()=>!!(W.reqReady||{}).diner,hint:()=>'用小魚乾讓小玉跟著你，帶到うみねこ食堂門口'},
  {id:'books',who:'書店老闆',t:'分享一本你讀過的書',d:'「讀完一本書，最開心的就是跟別人分享！在『閱讀紀錄』寫一則心得吧。」',reward:30,ok:()=>(W.reads||[]).length>=1,hint:()=>`已寫 ${(W.reads||[]).length} 則`}];
function reqState(r){const done=(W.req||{})[r.id];return done?'done':r.ok()?'ready':'doing';}
let reqT=0;function reqTick(dt){if(!started||HOME_IN)return;reqT-=dt;if(reqT>0)return;reqT=1;
  const tama=CATS.find(c=>(c.origName||c.name)==='小玉');const dp=(SPOTS.diner||{}).pos;
  if(tama&&dp&&!(W.req||{}).diner&&!(W.reqReady||{}).diner&&tama.follow>0&&tama.g.position.distanceTo(dp)<5&&P.pos.distanceTo(dp)<5){W.reqReady=W.reqReady||{};W.reqReady.diner=true;save();toast('小玉回到食堂了！回公告板領獎吧');}
  REQS.forEach(r=>{if(reqState(r)==='ready'&&!(W.reqNote||{})[r.id]){W.reqNote=W.reqNote||{};W.reqNote[r.id]=1;save();toast(`委託「${r.t}」可以領獎了！到公告板領取`);}});}

// ---------- teacher news
function newsList(){return (CFG.news||[]).filter(n=>n&&(n.title||n.body)).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));}
function newsKey(n){return (n.date||'')+'|'+(n.title||'');}
function newsUnseen(){const seen=W.newsSeen||[];return newsList().some(n=>!seen.includes(newsKey(n)));}

// ---------- panel
function openBoard(tab){if(DLG.open)closeDlg();NB.tab=tab||(newsUnseen()?'news':'daily');dailyState();$('board').hidden=false;renderBoard();}
function closeBoard(){if($('board').hidden)return;$('board').hidden=true;save();cv.focus({preventScroll:true});}
function renderBoard(){const tabs=$('nbTabs');tabs.innerHTML='';
  [['news','老師消息'+(newsUnseen()?' ●':'')],['daily','每日任務'],['req','居民委託'],['read','閱讀紀錄'],['hist','成長冊'],['money','零用錢']].forEach(([k,l])=>{const b=el('button',{type:'button',text:l,'aria-selected':String(NB.tab===k)});b.onclick=()=>{NB.tab=k;renderBoard();};tabs.appendChild(b);});
  const B=$('nbBody');B.innerHTML='';
  if(NB.tab==='money'){const w=ledSum(weekAgo()),all=ledSum(0);
    B.appendChild(el('div',{class:'nb-card'},[el('b',{text:`現在有 ${W.coins} 金幣`}),el('span',{class:'nb-meta',text:`最近 7 天：賺了 ${w.inc}・花了 ${w.out}・${w.inc>=w.out?`存下 ${w.inc-w.out}`:`多花了 ${w.out-w.inc}`}`})]));
    const cats=[['家具','#4a9be0'],['零食飲料','#e0873a'],['其他','#9a8ad0']],tot=Math.max(1,w.out);
    B.appendChild(el('div',{class:'nb-card'},[el('b',{text:'最近 7 天花在哪裡？'}),w.out?el('div',{class:'mn-bar'},cats.map(([c,colr])=>el('span',{style:`width:${(w.cat[c]||0)/tot*100}%;background:${colr}`}))):el('p',{text:'這週還沒有花錢。'}),
      el('div',{class:'mn-leg'},cats.map(([c,colr])=>el('small',{},[el('i',{style:`background:${colr}`}),`${c} ${w.cat[c]||0}`])))]));
    if(w.out>=40&&(w.cat['零食飲料']||0)/w.out>.6)B.appendChild(el('p',{class:'dc-hint',text:'💡 這週大部分的錢都買了零食飲料。要不要存一點，買一件喜歡的家具？'}));
    {const goal=W.moneyGoal&&FURN_BY[W.moneyGoal]&&!FURN_BY[W.moneyGoal].rare?FURN_BY[W.moneyGoal]:null;const sel=el('select',{class:'nb-in'},[el('option',{value:'',text:'選一個存錢目標…'}),...FURN.filter(f=>!f.rare).map(f=>el('option',{value:f.k,text:`${f.name}（${f.price} 金幣）`}))]);sel.value=goal?goal.k:'';sel.onchange=()=>{W.moneyGoal=sel.value||null;save();renderBoard();};
      const kids=[el('b',{text:'🎯 存錢目標'}),sel];if(goal){const k=Math.min(1,W.coins/goal.price);kids.push(el('div',{class:'cb-prog'},[el('span',{style:`width:${k*100}%`})]),el('p',{text:W.coins>=goal.price?`存夠了！可以去書桌上的型錄買「${goal.name}」囉！`:`還差 ${goal.price-W.coins} 金幣就能買「${goal.name}」。`}));}
      B.appendChild(el('div',{class:'nb-card'},kids));}
    const L=(W.ledger||[]).slice(-25).reverse();B.appendChild(el('div',{class:'nb-meta',style:'margin:10px 2px 4px',text:'最近的收支'}));if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有紀錄。'}));
    L.forEach(e=>{const d=new Date(e.t);B.appendChild(el('div',{class:'nb-card nb-row mn-row'},[el('span',{class:'nb-meta',text:`${d.getMonth()+1}/${d.getDate()}`}),el('b',{text:e.w}),el('span',{class:e.a>0?'mn-in':'mn-out',text:`${e.a>0?'+':''}${e.a}`})]));});}
  else if(NB.tab==='hist'){const H=(W.hist||[]).slice().reverse();B.appendChild(el('p',{class:'dc-hint',text:'你在汐見町留下的足跡。每拿到一個印章、讀完一本書、幫居民一個忙，都會記在這裡。'}));
    if(!H.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有紀錄，去闖第一關吧！'}));const IC={stamp:'🔴',gold:'🥇',read:'📖',req:'🤝',adv:'🗺️',pet:'🐾'};
    let last='';H.slice(0,80).forEach(h=>{const d=new Date(h.t),ds=`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;if(ds!==last){last=ds;B.appendChild(el('div',{class:'nb-meta',style:'margin:10px 2px 4px',text:ds}));}
      B.appendChild(el('div',{class:'nb-card nb-row'},[el('span',{text:IC[h.k]||'⭐'}),el('b',{text:h.s})]));});}
  else if(NB.tab==='news'){const L=newsList();{const c=el('div',{class:'nb-card'},[el('b',{text:'📜 汐見町的故事'}),el('p',{text:'為什麼要找印章？再看一次序章吧。'}),el('button',{type:'button',class:'btn small',text:'看序章動畫',onclick:()=>{closeBoard();playOpening({replay:true});}})]);B.appendChild(c);}
    if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'老師還沒有發布消息。'}));
    L.forEach(n=>{const card=el('div',{class:'nb-card'},[el('div',{class:'nb-meta',text:n.date||''}),el('b',{text:n.title||'（無標題）'}),el('p',{text:n.body||''})]);B.appendChild(card);});
    [['🎣','防波堤釣魚（準備中）','健叔說：「我正在修釣竿，過一陣子教你們釣魚！釣到的魚會收進魚類圖鑑喔。」'],['🃏','族語單字翻牌（準備中）','老師正在準備族語單字卡，翻牌配對成功可以拿金幣。敬請期待！']].forEach(([ic,t,b_])=>B.appendChild(el('div',{class:'nb-card nb-soon'},[el('div',{class:'nb-meta',text:'即將開放 · Coming soon'}),el('b',{text:`${ic} ${t}`}),el('p',{text:b_})])));
    W.newsSeen=L.map(newsKey);save();}
  else if(NB.tab==='daily'){const D=dailyState();B.appendChild(el('p',{class:'dc-hint',text:`今天（${D.date.slice(5).replace('-','/')}）的任務，每完成一個 +15 金幣，全部完成再 +20。明天會換新的任務！`}));
    D.ids.forEach(id=>{const d=DAILY_POOL.find(x=>x.id===id);if(!d)return;const ok=D.done.includes(id);
      B.appendChild(el('div',{class:'nb-card nb-row'+(ok?' ok':'')},[el('span',{class:'nb-chk',text:ok?'✓':''}),el('b',{text:d.t}),el('span',{class:'nb-meta',text:ok?'完成':`${Math.min(D.prog[id]||0,d.n)}/${d.n}`})]));});}
  else if(NB.tab==='req'){B.appendChild(el('p',{class:'dc-hint',text:'鎮上居民需要你的幫忙！完成後回到這裡領取獎勵。'}));
    REQS.forEach(r=>{const s=reqState(r);const card=el('div',{class:'nb-card'+(s==='done'?' ok':'')},[el('div',{class:'nb-meta',text:`${r.who}　・　獎勵 ${r.reward} 金幣`}),el('b',{text:r.t}),el('p',{text:r.d})]);
      if(s==='done')card.appendChild(el('div',{class:'nb-meta',text:'✓ 已完成，謝謝你！'}));
      else if(s==='ready'){const b=el('button',{type:'button',class:'btn primary small',text:`交給${r.who}・領 ${r.reward} 金幣`});b.onclick=()=>{r.take&&r.take();W.req=W.req||{};W.req[r.id]=Date.now();histAdd('req',`幫${r.who}完成委託：${r.t}`);actLater('i.give');W.coins+=r.reward;led(r.reward,`委託：${r.who}`,'任務');renderPouch();save();SND.register&&A.ready&&SND.register();toast(`${r.who}：「謝謝你！」 +${r.reward} 金幣`);renderBoard();};card.appendChild(b);}
      else card.appendChild(el('div',{class:'nb-meta',text:'進行中：'+r.hint()}));
      B.appendChild(card);});}
  else if(NB.tab==='read'){const R=W.reads=W.reads||[];const today=todayStr();const gotToday=R.some(x=>x.d===today);
    B.appendChild(el('p',{class:'dc-hint',text:`全班閱讀計畫：讀完書寫一則心得。每天第一則 +20 金幣${gotToday?'（今天已領）':''}。`}));
    const bk=el('input',{type:'text',maxlength:'30',placeholder:'書名，例如：小王子'}),nt=el('textarea',{maxlength:'200',placeholder:'一句心得：我最喜歡的地方是……（至少 10 個字）'});
    [bk,nt].forEach(i=>{i.addEventListener('keydown',e=>e.stopPropagation());i.className='nb-in';});
    const go=el('button',{type:'button',class:'btn primary small',text:'寫進閱讀紀錄'});
    go.onclick=()=>{const book=bk.value.trim(),note=nt.value.trim();if(!book){toast('先寫書名');return;}if(note.length<10){toast('心得至少寫 10 個字喔');return;}
      R.push({d:today,book,note});histAdd('read',`閱讀：《${book}》`);if(!gotToday){W.coins+=20;led(20,'讀書心得','任務');renderPouch();toast('寫好了！+20 金幣');}else toast('寫好了！');save();dailyEvent('read');renderBoard();};
    B.appendChild(el('div',{class:'nb-card'},[bk,nt,go]));
    R.slice().reverse().slice(0,12).forEach(x=>B.appendChild(el('div',{class:'nb-card'},[el('div',{class:'nb-meta',text:x.d}),el('b',{text:`《${x.book}》`}),el('p',{text:x.note})])));}
  $('nbCoins').textContent=`金幣 ${W.coins}`;}
$('nbClose').onclick=closeBoard;$('nbDone').onclick=closeBoard;

/* ================================================================
   探險：神秘小島 (Mystery Island) & 瀑布迷宮 (Waterfall Maze)
   ================================================================ */
function advS(){if(!W.adv)W.adv={};const a=W.adv;if(!Array.isArray(a.isl))a.isl=[0,0,0];return a;}
function advCount(){const a=W.adv||{};return (a.islDone?1:0)+(a.mz?1:0);}
function normalStampCount(){return CFG.stations.filter(s=>!isHall(s)&&W.st[s.id]).length;}
function advQ(fromHall){const sts=CFG.stations.filter(s=>fromHall?isHall(s):!isHall(s));const pool=[];
  (sts.length?sts:CFG.stations).forEach(s=>(s.qs||[]).forEach(q=>{if(q&&q.q&&Array.isArray(q.o)&&q.o[q.a])pool.push(q);}));
  if(!pool.length)CFG.stations.forEach(s=>(s.qs||[]).forEach(q=>{if(q&&q.q&&Array.isArray(q.o)&&q.o[q.a])pool.push(q);}));return pool.length?drawQs(fromHall?'advH':'advN',pool,1)[0]:null;}
// ask one riddle; ok()/bad() callbacks; optional timer (seconds)
function advAsk(who,intro,q,ok,bad,timer){if(!q){say(who,['（這裡的謎題還沒準備好，請老師先出題。）']);return;}
  const opts=shuffle(q.o.map((t,k)=>({t:optText(t),k})).filter(o=>o.t));
  choose(who,(intro?intro+'\n\n':'')+q.q,opts.map(o=>({label:o.t,fn:()=>{stopQTimer();if(o.k===+q.a)ok(q);else bad(q);}})),{quiz:true});
  if(timer)startQTimer(timer,()=>{closeDlg();bad(q,true);});}
function runeTex(seed,hue){const [c,g]=C2(128,192),[ce,ge]=C2(128,192);g.fillStyle='#6d6b66';g.fillRect(0,0,128,192);speckle(g,128,192,900,.14);
  g.fillStyle='rgba(70,95,60,.35)';for(let i=0;i<6;i++){g.beginPath();g.arc(rr(0,128),rr(120,192),rr(8,22),0,7);g.fill();}
  ge.fillStyle='#000';ge.fillRect(0,0,128,192);const R=[...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'];
  [g,ge].forEach((x,k)=>{x.strokeStyle=k?hue:'rgba(30,28,24,.8)';x.lineWidth=k?5:4;x.beginPath();x.arc(64,58,30,0,PI*2);x.stroke();
    x.font=`700 30px serif`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=k?hue:'rgba(30,28,24,.85)';
    for(let i=0;i<3;i++)x.fillText(R[(seed*7+i*5)%R.length],34+i*30,120);x.fillText(R[(seed*3+11)%R.length],64,58);
    for(let i=0;i<3;i++)x.fillText(R[(seed*5+i*3+2)%R.length],34+i*30,158);});
  return {map:TX(c),emap:TX(ce)};}
function chestModel(parent,x,y,z,ry=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;parent.add(g);
  const wood=lam('#7a4a2a'),gold=new T.MeshLambertMaterial({color:col('#d9b24a'),emissive:col('#6a5018'),emissiveIntensity:.6});
  mk(bx(.9,.5,.6),wood,0,.25,0,g);[-.36,.36].forEach(px=>mk(bx(.07,.52,.62),gold,px,.25,0,g,false));
  const lid=new T.Group();lid.position.set(0,.5,-.3);g.add(lid);const lm=mk(cy(.3,.3,.9,12,1),wood,0,0,.3,lid);lm.rotation.z=PI/2;lm.scale.set(1,1,1);
  [-.36,.36].forEach(px=>{const b=mk(cy(.31,.31,.07,12),gold,px,0,.3,lid,false);b.rotation.z=PI/2;});mk(bx(.14,.16,.05),gold,0,-.02,.62,lid,false);
  const glow=addGlow(0,.7,0,2.2,'#ffd27a','adv',0,g);glow.material=glow.material.clone();glow.material.opacity=0;return {g,lid,glow,open:0,want:0};}
const ADV={boats:[],falls:[],chests:[],crystals:[],eyes:[],torches:[],gates:[],lastDrip:0,fallT:0};

/* ---------------- Mystery island ---------------- */
(function(){const R=ISC.r,cx=ISC.x,cz=ISC.z;
  // terrain
  const S_=2*R+10;let g=new T.PlaneGeometry(S_,S_,70,70);g.rotateX(-PI/2);g.translate(cx,0,cz);
  const p=g.attributes.position,cols=[];const sand=col('#d9c7a0'),wet=col('#a8916e'),grass=col('#5f7a45'),moss=col('#4a6a40'),c=new T.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=islandH(x,z);p.setY(i,y);const n=fbm(x*.15,z*.15);
    c.copy(wet).lerp(sand,smooth(-1.9,-1.1,y)).lerp(grass,smooth(.55,.95,y+n*.3)).lerp(moss,smooth(.55,.8,n)*smooth(.8,1.2,y));const k=.93+n*.14;cols.push(c.r*k,c.g*k,c.b*k);}
  g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
  const im=mk(g,new T.MeshLambertMaterial({vertexColors:true}),0,0,0,scene,false);im.userData.nomerge=true;
  // palms
  const palm=(x,z,s,lean)=>{const gg=new T.Group();gg.position.set(x,islandH(x,z),z);gg.rotation.y=lean;scene.add(gg);let px=0,py=0;
    for(let i=0;i<6;i++){const len=.9*s,a=.07*i;const sg=mk(cy(.12*s*(1-i*.08),.15*s*(1-i*.08),len,7),M.trunk,px,py+len/2,0,gg);sg.rotation.z=-a;px+=Math.sin(a)*len;py+=Math.cos(a)*len;}
    for(let i=0;i<8;i++){const f=new T.Group();f.position.set(px,py,0);f.rotation.y=i/8*PI*2+rr(-.2,.2);gg.add(f);const fr=mk(bx(.34*s,.04,1.9*s),M.leaf2,0,-.3*s,.95*s,f);fr.rotation.x=.5+rr(0,.25);}
    for(let i=0;i<3;i++)mk(sph(.13*s,8,6),lam('#5a4028'),px+rr(-.15,.15),py-.15,rr(-.15,.15),gg);addCol(x-.3,x+.3,z-.3,z+.3,4);};
  [[-9,4,1.1],[-7,-7,1],[8,-6,1.2],[10,3,1],[3,-11,.9],[-11,-2,.95],[5,9,.85]].forEach(([x,z,s])=>palm(cx+x,cz+z,s,rr(0,6)));
  // ruins: stone ring, arch
  const stone=lam('#8b877c',{map:plainTex('#8b877c',2400,.16)}),mossy=lam('#6d7a5c');
  const ring=mk(cy(4.2,4.4,.3,28),lam('#b3ad9e',{map:plainTex('#b3ad9e',2400,.16)}),cx,islandH(cx,cz-1)-.11,cz-1,scene,false);ring.receiveShadow=true;
  const ay=islandH(cx,cz-2.5)+.04;[-1.3,1.3].forEach(s=>{mk(bx(.55,3,.55),stone,cx+s,ay+1.5,cz-2.5);mk(bx(.6,.25,.6),mossy,cx+s,ay+.1,cz-2.5);});
  mk(bx(3.6,.45,.7),stone,cx,ay+3.2,cz-2.5);mk(bx(3.2,.2,.6),mossy,cx,ay+3.5,cz-2.5);addCol(cx-1.6,cx-1,cz-2.8,cz-2.2,5);addCol(cx+1,cx+1.6,cz-2.8,cz-2.2,5);
  [.7,2.4,3.9,5.5].forEach(a=>{const x=cx+Math.cos(a)*5.3,z=cz-1+Math.sin(a)*5.3;const h=rr(.5,1.6);const b=mk(bx(.5,h,.5),stone,x,islandH(x,z)+h/2-.1,z);b.rotation.set(rr(-.15,.15),rr(0,3),rr(-.15,.15));});
  // chest under the arch
  const ch=chestModel(scene,cx,ay,cz-2.5,0);addCol(cx-.5,cx+.5,cz-2.85,cz-2.15,1.2);ADV.islChest=ch;ADV.chests.push(ch);
  // three tablets
  const HUES=['#7ff0ff','#9cffb0','#ffe27a'],NAMES=['潮之碑','風之碑','星之碑'];ADV.tabs=[];
  [[-5.8,1],[5.8,1],[0,-7.2]].forEach(([x,z],i)=>{const tx=cx+x,tz=cz+z,ty=islandH(tx,tz);const t=runeTex(i+2,HUES[i]);
    const m=new T.MeshLambertMaterial({map:t.map,emissiveMap:t.emap,emissive:col(HUES[i]),emissiveIntensity:.05});
    const gg=new T.Group();gg.position.set(tx,ty,tz);gg.rotation.y=Math.atan2(cx-tx,(cz-1)-tz);scene.add(gg);
    mk(bx(1.1,.25,.5),stone,0,.12,0,gg);const slab=mk(bx(.9,1.4,.22),stone,0,.95,0,gg);const face=mk(new T.PlaneGeometry(.8,1.2),m,0,.95,.115,gg,false);
    const gl=addGlow(0,1.0,.3,1.8,HUES[i],'adv',0,gg);gl.material=gl.material.clone();gl.material.opacity=0;addCol(tx-.55,tx+.55,tz-.35,tz+.35,2);
    ADV.tabs.push({m,gl,name:NAMES[i],hue:HUES[i]});
    const front=l2w(gg,0,0,1.1);
    inter(new T.Vector3(front.x,islandH(front.x,front.z),front.z),1.5,()=>advS().isl[i]?`${NAMES[i]}（已點亮）`:`讀「${NAMES[i]}」的謎題`,()=>tabletTalk(i));});
  // crystals
  [[-3,7],[8,-1],[-6,-5],[4,-8.5]].forEach(([x,z],k)=>{const gx=cx+x,gz=cz+z,gy=islandH(gx,gz);const cm=new T.MeshLambertMaterial({color:col('#9fe9ff'),emissive:col('#4fd6ff'),emissiveIntensity:.5,transparent:true,opacity:.9});
    for(let i=0;i<4;i++){const cr=mk(new T.OctahedronGeometry(rr(.18,.34),0),cm,gx+rr(-.4,.4),gy+rr(.2,.45),gz+rr(-.4,.4));cr.scale.y=rr(2,3);cr.rotation.set(rr(-.4,.4),rr(0,3),rr(-.4,.4));}
    ADV.crystals.push({m:cm,g:addGlow(gx,gy+.6,gz,2.4,'#6fdcff','night',.9)});addCol(gx-.5,gx+.5,gz-.5,gz+.5,1.5);});
  // night beam over the ruins (visible from town)
  const bm=new T.MeshBasicMaterial({color:col('#7fe8ff'),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const beam=new T.Mesh(new T.CylinderGeometry(.5,1.2,60,16,1,true),bm);beam.position.set(cx,ay+30,cz-2.5);scene.add(beam);ADV.beam={m:bm,mesh:beam};
  // mist around the island
  for(let i=0;i<10;i++){const a=i/10*PI*2;addGlow(cx+Math.cos(a)*(R+2),SEA_Y+1.2,cz+Math.sin(a)*(R+2),rr(9,13),'#e8f2ff','mist',.16);}
  // message in a bottle
  const bx_=cx-9.5,bz=cz+7.5;const bottle=mk(cy(.07,.09,.34,8),new T.MeshLambertMaterial({color:col('#7ab89a'),transparent:true,opacity:.8}),bx_,islandH(bx_,bz)+.08,bz);bottle.rotation.z=PI/2.3;
  inter(new T.Vector3(bx_,islandH(bx_,bz),bz),1.4,'撿起漂流瓶',()=>{SND.pick&&SND.pick();say('漂流瓶裡的紙條',['「……三塊石碑亮起時，寶藏就會醒來。」','「寶藏會告訴你，地圖在誰的手上。」','「瀑布的後面……千萬不要一個人在晚上進去。」']);});
  // dock + boat on the island
  const dockM=lam('#8a6a4a');for(let i=0;i<7;i++)mk(bx(1.6,.1,.55),dockM,cx,-1.15,cz+R-1.5+i*.62,scene,false);
  [[-.7,0],[.7,0],[-.7,3.4],[.7,3.4]].forEach(([x,z])=>mk(cy(.08,.08,2,6),M.woodDark,cx+x,-1.6,cz+R-1.3+z));
  ADV.boats.push(boatModel(cx+1.6,cz+R,PI));
  ISL.dock=new T.Vector3(cx,-.9,cz+R-2.2);
  inter(new T.Vector3(cx,-.9,cz+R-1),2.2,'搭船回小鎮',()=>islandLeave());})();
function boatModel(x,z,ry){const g=new T.Group();g.position.set(x,SEA_Y+.15,z);g.rotation.y=ry;scene.add(g);g.userData.dyn=true;
  const hull=lam('#f1ece2'),red=lam('#c8432b'),wood=lam('#8a6a4a');
  mk(bx(1.3,.5,2.8),hull,0,.25,0,g);const bow=mk(new T.ConeGeometry(.92,1.1,4,1),hull,0,.25,1.9,g);bow.rotation.set(PI/2,PI/4,0);bow.scale.set(1,1,.55);
  mk(bx(1.34,.1,2.84),red,0,.44,0,g,false);mk(bx(1.1,.06,.5),wood,0,.42,-.2,g,false);mk(bx(1.1,.06,.4),wood,0,.42,.8,g,false);
  mk(bx(.3,.45,.3),lam('#3a3a3e'),0,.5,-1.45,g);const lantern=mk(sph(.1,8,6),M.lampHead,0,1.1,1.2,g,false);mk(cy(.02,.02,.7,5),M.woodDark,0,.75,1.2,g,false);
  addGlow(0,1.1,1.2,1.2,'#ffd79a','lamp',.8,g);return {g,ph:rand()*6};}
// breakwater boat (with Ken)
ADV.boats.push(boatModel(69,-97.5,0));{const pl=lam('#8a6a4a');mk(bx(3.6,.08,.9),pl,70.9,.42,-97.5);[69.5,71.2].forEach(x=>mk(cy(.07,.07,2.4,6),M.woodDark,x,-.7,-97.1));}
{const sg=new T.Group();sg.position.set(76.6,.5,-95.5);sg.rotation.y=-PI/2;scene.add(sg);mk(cy(.06,.07,1.5,6),M.woodDark,0,.75,0,sg);
  const [c,x]=C2(256,160);x.fillStyle='#f3ead9';x.fillRect(0,0,256,160);x.strokeStyle='#4a3222';x.lineWidth=8;x.strokeRect(4,4,248,152);x.fillStyle='#b8452f';x.font=`800 40px ${FG}`;x.textAlign='center';x.textBaseline='middle';x.fillText('🎣 釣魚',128,56);x.fillStyle='#3a2a20';x.font=`700 30px ${FG}`;x.fillText('近日開放！',128,110);
  mk(new T.PlaneGeometry(.9,.56),new T.MeshLambertMaterial({map:TX(c),side:T.DoubleSide}),0,1.4,.05,sg);addCol(76.45,76.75,-95.65,-95.35,2);
  inter(new T.Vector3(76,.5,-95.5),1.3,'看告示牌',()=>say('健叔',['喔，你看到告示啦？我正在修理釣竿。','過一陣子就教你們釣魚，釣到的魚還能收進魚類圖鑑！']));}
function islandUnlocked(){return normalStampCount()>=3;}
addMarker(()=>islandUnlocked()&&!advS().islDone?new T.Vector3(73.4,.5,-97.5):null,()=>'神秘小島',()=>'info',3.1,{info:true});
inter(new T.Vector3(73.3,.5,-97.5),1.7,'搭船去神秘小島',()=>{const n=normalStampCount();
  if(n<3){say('健叔',['那座小島？聽說上面有古老的石碑，晚上還會發光呢。','等你拿到 3 個印章，我就開船載你去！',`（目前 ${n} / 3 個印章）`]);return;}
  choose('健叔',advS().islDone?'又想去小島看看啦？上船吧！':'要出發去神秘小島嗎？聽說島上有三塊會發光的石碑……',[{label:'出發！',fn:()=>islandGo()},{label:'等一下',fn:null}]);});
function islandGo(){fadeTo(()=>{ISL_IN=true;P.sit=null;const d=ISL.dock;P.pos.set(d.x,groundH(d.x,d.z-1.5),d.z-1.5);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.28;
  cam.pos.set(d.x,3,d.z+4);cam.look.set(d.x,0,d.z-2);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(d.x+1,P.pos.y,d.z-1);PETOBJ.by=P.pos.y;}
  SND.chime&&SND.chime();setTimeout(()=>toast('小船穿過薄霧，來到了神秘小島……'),500);});}
function islandLeave(){fadeTo(()=>{ISL_IN=false;P.sit=null;P.pos.set(74.3,.5,-97);P.vel.set(0,0,0);P.yaw=0;cam.yaw=PI;cam.pitch=.22;cam.pos.set(74.3,3,-102);cam.look.set(74.3,1.4,-97);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(75,.5,-96);PETOBJ.by=.5;}SND.chime&&SND.chime();});}
function tabletTalk(i){const A_=advS(),T_=ADV.tabs[i];
  if(A_.isl[i]){say(T_.name,['石碑上的符文發出柔和的光。',`（已點亮 ${A_.isl.filter(Boolean).length} / 3 塊）`]);return;}
  advAsk(T_.name,'石碑上刻著古老的文字……答對謎題，符文就會亮起來。',advQ(false),()=>{A_.isl[i]=1;save();SND.suzu&&SND.suzu();
      const n=A_.isl.filter(Boolean).length;say(T_.name,[`答對了！「${T_.name}」的符文亮起來了！（${n} / 3）`].concat(n>=3?['遠處傳來石頭移動的聲音……拱門下的寶箱在發光！']:[]));},
    (q,out)=>{SND.wrong&&SND.wrong();say(T_.name,[(out?'時間到……':'石碑上的文字暗了下去……')+`正確答案是「${ansList(q)[0]}」。`,'再讀一次試試看，題目會換。']);});}
inter(new T.Vector3(ISC.x,0,ISC.z-1.2),1.6,()=>advS().islDone?'空空的寶箱':'古老的寶箱',()=>{const A_=advS(),n=A_.isl.filter(Boolean).length;
  if(A_.islDone){say('寶箱',['寶箱已經空了，只剩下一點沙子。','（地圖指向神社後面的瀑布……）']);return;}
  if(n<3){say('古老的寶箱',['寶箱被一股神秘的力量封住了，打不開。',`三塊石碑都亮起來，封印才會解開。（目前 ${n} / 3）`]);return;}
  A_.islDone=true;A_.clue=true;histAdd('adv','探險：解開神秘小島的三塊石碑');W.furn=W.furn||{};W.furn.shell=(W.furn.shell||0)+1;W.coins+=100;led(100,'神秘小島寶箱','探險');save();renderPouch();ADV.islChest.want=1;SND.stamp();petEvent('stamp');
  say('寶箱打開了！',['裡面有 100 金幣、一盞閃閃發亮的「貝殼燈」（商店買不到！），還有一封舊舊的信。','信上寫著：「通往瀑布迷宮的古老地圖，被一位住在山上的人收起來了。」','「神社附近的樹叢裡，有一條很少人走的小路……」','（貝殼燈已經放進你的家具，回房間按「佈置」就能擺出來）']);});
{const it=INT[INT.length-1];it.pos.y=islandH(it.pos.x,it.pos.z);}

/* ---------------- Waterfall on the shrine hill ---------------- */
const FALL={x:-38.6,z:86.6};
(function(){const x=FALL.x,z=FALL.z;
  const rockTex=plainTex('#6a655c',3200,.18,true,g=>{for(let i=0;i<40;i++){g.fillStyle=`rgba(${rand()<.5?'40,50,35':'20,20,20'},${rr(.08,.22)})`;g.beginPath();g.ellipse(rr(0,256),rr(0,256),rr(10,40),rr(4,14),rr(0,3),0,7);g.fill();}});
  const rock=lam('#ffffff',{map:rockTex});
  // cliff behind the pool
  const cl=mk(bx(13,20,6),rock,x,6,z+3.6);
  [[-5,8,1.5,4],[5.2,6,1,3.4],[-3,15,.5,3],[3.5,16,.2,2.6],[-6.5,3,-.3,2.4],[6.4,2.6,-.2,2.2]].forEach(([dx,y,dz,s])=>{const r=mk(ico(s,0),rock,x+dx,y,z+dz+1.2);r.scale.set(1,1.2,.8);r.rotation.set(rr(0,3),rr(0,3),0);});
  // dark cave mouth
  const hole=mk(new T.CircleGeometry(1.5,20),new T.MeshBasicMaterial({color:0x05060a}),x,5.6,z+.58,scene,false);hole.scale.set(1,1.4,1);
  // water sheets
  const [wc,wg]=C2(64,256);wg.fillStyle='#b8dcea';wg.fillRect(0,0,64,256);for(let i=0;i<60;i++){wg.fillStyle=`rgba(255,255,255,${rr(.2,.7)})`;wg.fillRect(rr(0,64),rr(0,256),rr(1,4),rr(20,90));}
  for(let i=0;i<30;i++){wg.fillStyle=`rgba(60,110,140,${rr(.15,.4)})`;wg.fillRect(rr(0,64),rr(0,256),rr(1,3),rr(20,70));}
  const mkSheet=(w,h,dz,sp,op)=>{const t=TX(wc,true);t.repeat.set(1.5,h/6);const m=new T.MeshLambertMaterial({map:t,transparent:true,opacity:op,emissive:col('#3a5a6a'),emissiveIntensity:.35,depthWrite:false,side:T.DoubleSide});
    const s=mk(new T.PlaneGeometry(w,h),m,x,4+h/2,z+dz,scene,false);s.renderOrder=3;ADV.falls.push({t,sp});return s;};
  mkSheet(3.4,12,.45,1.4,.82);mkSheet(2.6,12,.35,2.1,.55);
  // pool
  const pg=new T.CircleGeometry(3,28);pg.rotateX(-PI/2);mk(pg,new T.MeshLambertMaterial({color:col('#4f8aa0'),emissive:col('#1d3a48'),emissiveIntensity:.5,transparent:true,opacity:.92}),x,4.04,z-1.4,scene,false);
  const fg=new T.RingGeometry(.4,1.6,20);fg.rotateX(-PI/2);const foam=mk(fg,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}),x,4.06,z-.2,scene,false);ADV.foam=foam;
  for(let i=0;i<11;i++){const a=PI+i/10*PI;const s=rr(.35,.6);const st=mk(ico(s,0),rock,x+Math.cos(a)*3.1,4+s*.2,z-1.4+Math.sin(a)*3.1);st.scale.y=.7;}
  for(let i=0;i<4;i++)addGlow(x+rr(-1.4,1.4),4.4+rr(0,.6),z-.2,rr(2.6,3.6),'#f0f6ff','mist',.22);
  addCol(x-6.5,x+6.5,z+.4,z+7,20);})();
addMarker(()=>advS().map&&!advS().mz?new T.Vector3(FALL.x,4,FALL.z-1.8):null,()=>'瀑布迷宮',()=>'info',3.4,{info:true});
inter(new T.Vector3(FALL.x,4,FALL.z-1.6),2,'穿過瀑布',()=>{const A_=advS();
  if(!A_.map){say('瀑布',['轟隆隆……瀑布後面好像有一個黑漆漆的洞穴。','洞裡傳來奇怪的風聲，太暗了，什麼都看不清楚。',A_.clue?'（信上說，地圖被住在山上的人收起來了。神社附近的樹叢裡有一條小路……）':'（聽說有一張古老的地圖，可以在黑暗中找到路……）']);return;}
  choose('瀑布後的洞穴',`拿著古老地圖，就能在黑暗中找到路。\n裡面有 3 道「謎題石門」，每題限時 25 秒。每次進去，迷宮的路都會改變！${A_.mz?`\n（你已經走出迷宮 ${A_.mz} 次）`:''}`,[{label:'走進迷宮',fn:()=>enterMaze()},{label:'還是算了……',fn:null}]);});

/* ---------------- Maze (enclosed zone) ---------------- */
const MZX=-120,MZZ=330,MN=8,MCS=3.2,MWH=2.3;
const MZ={g:null,cols:[],vis:null,start:null,goal:null};
const LANTERN=new T.PointLight(0xffc68a,0,12,1.5);scene.add(LANTERN);
const MZ_WALLM=lam('#ffffff',{map:(()=>{const [c,g]=C2(256,256);g.fillStyle='#4a453e';g.fillRect(0,0,256,256);speckle(g,256,256,4000,.16);
  for(let y=0;y<256;y+=42){g.fillStyle='rgba(15,12,10,.55)';g.fillRect(0,y,256,3);for(let x=((y/42)%2)*40;x<256;x+=80)g.fillRect(x,y,3,42);}
  for(let i=0;i<22;i++){g.fillStyle=`rgba(60,90,55,${rr(.12,.3)})`;g.beginPath();g.ellipse(rr(0,256),rr(150,256),rr(10,30),rr(4,12),0,0,7);g.fill();}return TX(c,true);})()});
const MZ_FLOORM=lam('#ffffff',{map:(()=>{const t=plainTex('#3b3834',4000,.18,true,g=>{for(let i=0;i<30;i++){g.fillStyle=`rgba(0,0,0,${rr(.1,.25)})`;g.beginPath();g.ellipse(rr(0,256),rr(0,256),rr(8,30),rr(4,14),rr(0,3),0,7);g.fill();}});t.repeat.set(8,8);return t;})()});
function genMaze(){const N=MN,cell=[];for(let i=0;i<N;i++){cell[i]=[];for(let j=0;j<N;j++)cell[i][j]={e:1,s:1,v:0};}
  const st=[[0,N-1]];cell[0][N-1].v=1;
  while(st.length){const [i,j]=st[st.length-1];const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[i+a,j+b,a,b]).filter(([a,b])=>a>=0&&b>=0&&a<N&&b<N&&!cell[a][b].v);
    if(!nb.length){st.pop();continue;}const [a,b,da,db]=nb[Math.floor(Math.random()*nb.length)];
    if(da===1)cell[i][j].e=0;else if(da===-1)cell[a][b].e=0;else if(db===1)cell[i][j].s=0;else cell[a][b].s=0;cell[a][b].v=1;st.push([a,b]);}
  return cell;}
function mzOpen(c,i,j,a,b){if(a<0||b<0||a>=MN||b>=MN)return false;if(a===i+1)return !c[i][j].e;if(a===i-1)return !c[a][b].e;if(b===j+1)return !c[i][j].s;return !c[a][b].s;}
function mzC(i,j){const o=MN*MCS/2;return new T.Vector3(MZX-o+(i+.5)*MCS,0,MZZ-o+(j+.5)*MCS);}
function buildMaze(){if(MZ.g){scene.remove(MZ.g);MZ.g.traverse(o=>{if(o.isInstancedMesh)o.dispose&&o.dispose();});}
  MZ.cols.forEach(c=>{const i=COLS.indexOf(c);if(i>=0)COLS.splice(i,1);});MZ.cols=[];ADV.eyes=[];ADV.torches=[];ADV.gates=[];
  INT.splice(0,INT.length,...INT.filter(it=>!it.mz));
  const c=genMaze(),N=MN,o=N*MCS/2,G=new T.Group();scene.add(G);MZ.g=G;MZ.cell=c;MZ.vis=[...Array(N)].map(()=>Array(N).fill(0));
  // BFS from the start for the farthest cell (goal)
  const S0=[0,N-1],dist={},prev={};const key=(i,j)=>i+','+j;dist[key(...S0)]=0;const q=[S0];let far=S0;
  while(q.length){const [i,j]=q.shift();if(dist[key(i,j)]>dist[key(...far)])far=[i,j];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const ni=i+a,nj=j+b;if(mzOpen(c,i,j,ni,nj)&&dist[key(ni,nj)]==null){dist[key(ni,nj)]=dist[key(i,j)]+1;prev[key(ni,nj)]=[i,j];q.push([ni,nj]);}});}
  const path=[far];while(path[0][0]!==S0[0]||path[0][1]!==S0[1])path.unshift(prev[key(...path[0])]);MZ.start=S0;MZ.goal=far;MZ.path=path;
  // floor
  const fg=new T.PlaneGeometry(N*MCS+2,N*MCS+2);fg.rotateX(-PI/2);mk(fg,MZ_FLOORM,MZX,0,MZZ,G,false);
  // walls (instanced)
  const segs=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++){const p=mzC(i,j);if(c[i][j].e&&i<N-1)segs.push([p.x+MCS/2,p.z,1]);if(c[i][j].s&&j<N-1)segs.push([p.x,p.z+MCS/2,0]);}
  for(let k=0;k<N;k++){segs.push([MZX-o,mzC(0,k).z,1],[MZX+o,mzC(0,k).z,1],[mzC(k,0).x,MZZ-o,0],[mzC(k,0).x,MZZ+o,0]);}
  const geo=new T.BoxGeometry(1,1,1);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*1.4,uv.getY(i)*1.2);
  const im=new T.InstancedMesh(geo,MZ_WALLM,segs.length);const m4=new T.Matrix4(),q4=new T.Quaternion(),sc=new T.Vector3();
  segs.forEach(([x,z,vert],k)=>{sc.set(vert?.5:MCS+.5,MWH,vert?MCS+.5:.5);m4.compose(new T.Vector3(x,MWH/2,z),q4,sc);im.setMatrixAt(k,m4);
    const cc={x0:x-sc.x/2,x1:x+sc.x/2,z0:z-sc.z/2,z1:z+sc.z/2,y0:-6,y1:MWH};COLS.push(cc);MZ.cols.push(cc);});
  im.receiveShadow=true;im.frustumCulled=false;G.add(im);
  // start: rope of light from above
  const sp=mzC(...S0);mk(cy(.04,.04,MWH+.2,6),lam('#b89a6a'),sp.x-.9,(MWH+.2)/2,sp.z-.9,G,false);addGlow(sp.x-.9,2.2,sp.z-.9,3,'#bfe3ff','adv',.5,G);
  const shaft=new T.Mesh(new T.CylinderGeometry(.7,1.3,8,12,1,true),new T.MeshBasicMaterial({color:col('#9fd0ff'),transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));shaft.position.set(sp.x-.9,4,sp.z-.9);G.add(shaft);
  inter(new T.Vector3(sp.x-.9,0,sp.z-.9),1.4,'拉繩子回到外面',()=>choose('繩子','要拉著繩子爬回瀑布外面嗎？（迷宮下次會變成新的路）',[{label:'回到外面',fn:()=>exitMaze()},{label:'繼續探險',fn:null}]),{mz:true});
  // gates on the solution path
  const L=path.length;[.28,.55,.8].forEach((f,gi)=>{const k=Math.max(1,Math.min(L-2,Math.round((L-1)*f)));const [i,j]=path[k],[ni,nj]=path[k+1];const a=mzC(i,j),b=mzC(ni,nj);
    const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,vert=ni!==i;const gg=new T.Group();gg.position.set(mx,0,mz);G.add(gg);
    const t=runeTex(gi+7,'#ff6a4a');const gm=new T.MeshLambertMaterial({map:t.map,emissiveMap:t.emap,emissive:col('#ff6a4a'),emissiveIntensity:.9});
    const door=new T.Group();gg.add(door);const slab=mk(new T.BoxGeometry(vert?.35:MCS-.1,MWH,vert?MCS-.1:.35),lam('#5a554c',{map:MZ_WALLM.map}),0,MWH/2,0,door,false);
    [1,-1].forEach(s=>{const f=mk(new T.PlaneGeometry(1.2,1.8),gm,vert?s*.18:0,1.35,vert?0:s*.18,door,false);f.rotation.y=vert?s*PI/2:(s>0?0:PI);});
    const cc={x0:mx-(vert?.3:MCS/2),x1:mx+(vert?.3:MCS/2),z0:mz-(vert?MCS/2:.3),z1:mz+(vert?MCS/2:.3),y0:-6,y1:MWH};COLS.push(cc);MZ.cols.push(cc);
    const gt={door,cc,open:false,y:0,i,j,ni,nj,gi};ADV.gates.push(gt);
    const ip=new T.Vector3(a.x+(b.x-a.x)*.22,0,a.z+(b.z-a.z)*.22);
    inter(ip,1.5,()=>gt.open?'（石門已經打開）':`石門的謎題（第 ${gi+1} 道）`,()=>gateTalk(gt),{mz:true});});
  // goal chest
  const gp=mzC(...far);const ch=chestModel(G,gp.x,0,gp.z-.3,0);{const cc={x0:gp.x-.5,x1:gp.x+.5,z0:gp.z-.65,z1:gp.z+.05,y0:-6,y1:1.2};COLS.push(cc);MZ.cols.push(cc);}ADV.mzChest=ch;ch.claimed=false;
  const cl=new T.MeshLambertMaterial({color:col('#bff4ff'),emissive:col('#6fdcff'),emissiveIntensity:.9});for(let i=0;i<5;i++){const cr=mk(new T.OctahedronGeometry(rr(.12,.22),0),cl,gp.x+rr(-1,1),rr(.2,.4),gp.z+rr(-1,1),G,false);cr.scale.y=2.4;}
  addGlow(gp.x,1.4,gp.z,4,'#8fe6ff','adv',.55,G);
  inter(new T.Vector3(gp.x,0,gp.z+.5),1.5,()=>ch.claimed?'沿著光走出迷宮':'打開迷宮深處的寶箱',()=>mazeChest(),{mz:true});
  // torches and eyes
  const cells=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++)cells.push([i,j]);shuffle(cells);
  cells.slice(0,11).forEach(([i,j])=>{const p=mzC(i,j);const dirs=[[.5,0,'e'],[-.5,0,'w'],[0,.5,'s'],[0,-.5,'n']].filter(([dx,dz])=>!mzOpen(c,i,j,i+Math.sign(dx),j+Math.sign(dz)));if(!dirs.length)return;
    const [dx,dz]=dirs[0];const tx=p.x+dx*(MCS-.62),tz=p.z+dz*(MCS-.62);mk(bx(.08,.5,.08),M.woodDark,tx,1.6,tz,G,false);
    const fl=addGlow(tx,1.95,tz,1.1,'#ffb35a','adv',.9,G);ADV.torches.push(fl);});
  cells.filter(([i,j])=>{let w=0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{if(!mzOpen(c,i,j,i+a,j+b))w++;});return w===3&&!(i===S0[0]&&j===S0[1])&&!(i===far[0]&&j===far[1]);}).slice(0,4).forEach(([i,j])=>{
    const p=mzC(i,j);const e=new T.Group();e.position.set(p.x+rr(-.6,.6),rr(.5,1.4),p.z+rr(-.6,.6));G.add(e);[-.12,.12].forEach(s=>{const sp_=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ff3a2a'),blending:T.AdditiveBlending,depthWrite:false,transparent:true}));sp_.position.x=s;sp_.scale.setScalar(.22);e.add(sp_);});
    ADV.eyes.push({g:e,gone:false,t:rand()*5});});}
function gateTalk(gt){if(gt.open)return;
  advAsk(`第 ${gt.gi+1} 道石門`,'石門上的紅色符文在黑暗中閃爍……（限時 25 秒）',advQ(true),()=>{gt.open=true;const i=COLS.indexOf(gt.cc);if(i>=0)COLS.splice(i,1);
      if(A.ready){const t=A.ctx.currentTime;nburst(t,1.6,'lowpass',160,.7,.8,A.sfx);tone(55,t,1.4,'sine',.35,A.sfx);}SND.suzu&&SND.suzu();toast(`石門轟隆隆地沉下去了！（${ADV.gates.filter(g=>g.open).length} / 3）`);},
    (q,out)=>{if(A.ready){const t=A.ctx.currentTime;tone(70,t,.9,'sawtooth',.12,A.sfx,40);nburst(t,.8,'lowpass',300,.8,.4,A.sfx);}
      say('石門紋風不動……',[(out?'時間到了！':'')+`正確答案是「${ansList(q)[0]}」。`,'黑暗裡好像有什麼東西在笑……再試一次吧，題目會換。']);});}
function mazeChest(){const ch=ADV.mzChest,A_=advS();if(ch.claimed){exitMaze(true);return;}
  ch.claimed=true;ch.want=1;const first=!A_.mz;A_.mz=(A_.mz||0)+1;let lines;
  if(first)histAdd('adv','探險：第一次走出瀑布迷宮');if(first){W.furn=W.furn||{};W.furn.crystal=(W.furn.crystal||0)+1;W.coins+=150;led(150,'瀑布迷宮寶箱','探險');lines=['你走出了恐怖的瀑布迷宮！寶箱裡有 150 金幣和一盞「水晶燈」（商店買不到！）。','（水晶燈已經放進你的家具，回房間按「佈置」就能擺出來）','勇者稱號：瀑布迷宮探險家 🏅'];}
  else{W.coins+=30;led(30,'瀑布迷宮寶箱','探險');lines=[`第 ${A_.mz} 次走出迷宮！寶箱裡有 30 金幣。`,'迷宮每次都會改變路線，下次再來挑戰吧！'];}
  save();renderPouch();SND.stamp();petEvent('stamp');dailyEvent('pass');say('寶箱打開了！',lines,{onEnd:()=>choose('迷宮深處','寶箱後面有一道光……',[{label:'沿著光走出去',fn:()=>exitMaze(true)},{label:'再逛一下',fn:null}])});}
function enterMaze(){buildMaze();fadeTo(()=>{INDOOR=true;MZ_IN=true;P.sit=null;const s=mzC(...MZ.start);P.pos.set(s.x,0,s.z);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=1;
  cam.pos.set(s.x,7,s.z+3);cam.look.set(s.x,1,s.z);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(s.x+.8,0,s.z+.6);PETOBJ.by=0;}$('mzMap').hidden=false;
  if(A.ready){const t=A.ctx.currentTime;tone(98,t,2.5,'sine',.25,A.sfx,65);nburst(t,2.5,'lowpass',300,.5,.3,A.sfx);}setTimeout(()=>toast('好暗……拿好地圖，找到迷宮深處的寶箱！'),600);});}
function exitMaze(win){fadeTo(()=>{INDOOR=false;MZ_IN=false;P.sit=null;P.pos.set(FALL.x,4,FALL.z-3.6);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pitch=.25;cam.pos.set(FALL.x,6.5,FALL.z-8.5);cam.look.set(FALL.x,5.2,FALL.z-3.6);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(FALL.x+1,4,FALL.z-4.2);PETOBJ.by=4;}$('mzMap').hidden=true;LANTERN.intensity=0;sky.visible=true;scene.background=null;SND.chime&&SND.chime();
  if(win)setTimeout(()=>toast('你從瀑布後面走了出來，外面的空氣好新鮮！'),500);});}
// minimap (only what you've explored)
(function(){const c=document.createElement('canvas');c.id='mzMap';c.width=176;c.height=176;c.hidden=true;document.body.appendChild(c);})();
function drawMzMap(){const cv=$('mzMap');if(!cv||cv.hidden||!MZ.cell)return;const g=cv.getContext('2d'),N=MN,s=160/N,o=8;g.clearRect(0,0,176,176);
  g.fillStyle='rgba(20,16,12,.72)';g.fillRect(0,0,176,176);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!MZ.vis[i][j])continue;g.fillStyle='rgba(222,200,150,.35)';g.fillRect(o+i*s,o+j*s,s,s);}
  g.strokeStyle='#e8d6a8';g.lineWidth=2;g.beginPath();
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!MZ.vis[i][j])continue;const x=o+i*s,y=o+j*s;
    if(!mzOpen(MZ.cell,i,j,i+1,j)){g.moveTo(x+s,y);g.lineTo(x+s,y+s);}if(!mzOpen(MZ.cell,i,j,i-1,j)){g.moveTo(x,y);g.lineTo(x,y+s);}
    if(!mzOpen(MZ.cell,i,j,i,j+1)){g.moveTo(x,y+s);g.lineTo(x+s,y+s);}if(!mzOpen(MZ.cell,i,j,i,j-1)){g.moveTo(x,y);g.lineTo(x+s,y);}}g.stroke();
  ADV.gates.forEach(gt=>{if(gt.open||!(MZ.vis[gt.i][gt.j]||MZ.vis[gt.ni][gt.nj]))return;g.fillStyle='#ff6a4a';g.fillRect(o+((gt.i+gt.ni)/2+.5)*s-4,o+((gt.j+gt.nj)/2+.5)*s-4,8,8);});
  const [si,sj]=MZ.start;g.fillStyle='#9fd0ff';g.beginPath();g.arc(o+(si+.5)*s,o+(sj+.5)*s,4,0,7);g.fill();
  const [gi,gj]=MZ.goal;if(MZ.vis[gi][gj]){g.fillStyle='#ffd27a';g.fillRect(o+(gi+.5)*s-5,o+(gj+.5)*s-5,10,10);}
  const px=o+(P.pos.x-(MZX-N*MCS/2))/MCS*s,pz=o+(P.pos.z-(MZZ-N*MCS/2))/MCS*s;g.save();g.translate(px,pz);g.rotate(-P.yaw+PI);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-6);g.lineTo(4.5,5);g.lineTo(-4.5,5);g.closePath();g.fill();g.restore();
  g.font=`700 12px ${FG}`;g.fillStyle='#e8d6a8';g.textAlign='right';g.fillText('古老地圖',170,170);}
const MZ_TINT=new T.Color(.82,.68,.55);
const MZ_FOG=new T.Color('#07080c'),MZ_HS=new T.Color('#3a4a66'),MZ_HG=new T.Color('#1a1510');
function advTick(dt){
  ADV.boats.forEach(b=>{b.ph+=dt;b.g.position.y=SEA_Y+.12+Math.sin(b.ph*1.3)*.08;b.g.rotation.z=Math.sin(b.ph*.9)*.04;b.g.rotation.x=Math.sin(b.ph*1.1)*.03;});
  ADV.falls.forEach(f=>{f.t.offset.y+=dt*f.sp*.35;});if(ADV.foam){const k=1+Math.sin(time*3)*.06;ADV.foam.scale.set(k,1,k);}
  ADV.chests.concat(ADV.mzChest?[ADV.mzChest]:[]).forEach(ch=>{ch.open=lerp(ch.open,ch.want,1-Math.exp(-dt*3));ch.lid.rotation.x=-ch.open*1.9;ch.glow.material.opacity=ch.open*.9;});
  const A_=W.adv||{};if(ADV.tabs)ADV.tabs.forEach((t,i)=>{const on=A_.isl&&A_.isl[i];t.m.emissiveIntensity=lerp(t.m.emissiveIntensity,on?1.5+Math.sin(time*2+i)*.3:.05,.08);t.gl.material.opacity=on?.7:0;});
  if(ADV.islChest&&A_.islDone&&ADV.islChest.want===0)ADV.islChest.want=1;
  const lit=A_.isl?A_.isl.filter(Boolean).length:0;
  if(ADV.islChest&&!A_.islDone&&lit>=3){ADV.islChest.glow.material.opacity=.5+.3*Math.sin(time*3);}
  ADV.beam.m.opacity=A_.islDone?0:S.night*(.1+.05*Math.sin(time*1.3))+(lit>=3?.08:0);
  ADV.crystals.forEach((c,i)=>{c.m.emissiveIntensity=.35+.9*S.night+Math.sin(time*1.5+i)*.15;});
  // waterfall sound
  if(A.ready&&!INDOOR&&started){ADV.fallT-=dt;const d=Math.hypot(P.pos.x-FALL.x,P.pos.z-FALL.z);if(ADV.fallT<=0&&d<30){ADV.fallT=.45;const t=A.ctx.currentTime;nburst(t,.9,'lowpass',700,.4,.22*clamp(1-d/30,0,1),A.sfx);}}
  if(!MZ_IN){if(LANTERN.intensity&&!TC_IN){LANTERN.intensity=0;sky.visible=true;scene.background=null;}return;}
  // --- inside the maze: darkness, lantern, drips, eyes
  scene.fog.color.copy(MZ_FOG);scene.fog.near=6;scene.fog.far=19;hemi.color.copy(MZ_HS);hemi.groundColor.copy(MZ_HG);hemi.intensity=.42;sun.intensity=0;renderer.toneMappingExposure=1;
  if(sky.visible){sky.visible=false;scene.background=MZ_FOG;}
  LANTERN.distance=12;LANTERN.color.setHex(0xffc68a);LANTERN.intensity=1.6+Math.sin(time*9)*.05+Math.sin(time*23)*.04;LANTERN.position.set(P.pos.x+Math.sin(P.yaw)*.3,1.7,P.pos.z+Math.cos(P.yaw)*.3);
  ADV.torches.forEach((f,i)=>{const k=1+Math.sin(time*11+i*3)*.08+Math.sin(time*17+i)*.06;f.scale.set(1.1*k,1.3*k,1);});
  const N=MN,o=N*MCS/2,ci=Math.floor((P.pos.x-(MZX-o))/MCS),cj=Math.floor((P.pos.z-(MZZ-o))/MCS);
  if(ci>=0&&cj>=0&&ci<N&&cj<N&&MZ.vis){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const i=ci+a,j=cj+b;if(i<0||j<0||i>=N||j>=N)continue;if(a===0&&b===0||mzOpen(MZ.cell,ci,cj,i,j)&&(a===0||b===0))MZ.vis[i][j]=1;}}
  ADV.gates.forEach(gt=>{if(gt.open&&gt.y>-MWH-.1){gt.y=Math.max(-MWH-.1,gt.y-dt*1.6);gt.door.position.y=gt.y;gt.door.position.x=Math.sin(time*40)*.02*(gt.y>-MWH);}});
  ADV.eyes.forEach(e=>{if(e.gone)return;e.t+=dt;const blink=(e.t%4)<.15;e.g.visible=!blink;const d=Math.hypot(P.pos.x-e.g.position.x,P.pos.z-e.g.position.z);
    if(d<3.6){e.gone=true;e.g.visible=false;if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<6;i++)tone(rr(3500,5200),t+i*.06,.05,'square',.025,A.sfx);nburst(t,.5,'bandpass',900,1,.15,A.sfx);}toast(pick(['啪嗒啪嗒——一群蝙蝠飛走了！','嚇！原來是蝙蝠……','是誰？……只是蝙蝠啦。']));}});
  if(A.ready){ADV.lastDrip-=dt;if(ADV.lastDrip<=0){ADV.lastDrip=rr(1.2,3.5);const t=A.ctx.currentTime;tone(rr(1300,2100),t,.14,'sine',.045,A.sfx,rr(500,800));if(rand()<.25)nburst(t,2.2,'lowpass',180,.5,.12,A.sfx);}}
  drawMzMap();}
// rare furniture (not sold in the catalogue)
FURN.push(
  {k:'shell',name:'貝殼燈',price:0,rare:true,type:'floor',fp:[.5,.5],build:g=>{mk(cy(.2,.24,.08,14),imat('#d8c8ac',.3),0,.04,0,g);mk(cy(.025,.025,.5,6),imat('#c9a45a',.4),0,.3,0,g);
    const sm=new T.MeshLambertMaterial({color:col('#ffe8f0'),emissive:col('#ffc2d6'),emissiveIntensity:.9,side:T.DoubleSide});const s=mk(new T.SphereGeometry(.26,16,10,0,PI*2,0,PI/2),sm,0,.55,0,g);s.scale.set(1,.8,1);
    for(let i=0;i<8;i++){const r=mk(bx(.02,.02,.5),imat('#e8b0c0',.5),0,.62,0,g,false);r.rotation.set(-.55,i/8*PI*2,0);}addGlow(0,.62,0,1.6,'#ffc2d6','lamp',.9,g);}},
  {k:'crystal',name:'水晶燈',price:0,rare:true,type:'floor',fp:[.6,.6],build:g=>{mk(cy(.26,.3,.14,8),imat('#4a4a58',.3),0,.07,0,g);
    const cm=new T.MeshLambertMaterial({color:col('#c8f4ff'),emissive:col('#6fdcff'),emissiveIntensity:.9,transparent:true,opacity:.92});
    [[0,0,.26,2.6],[.13,.06,.14,2],[-.12,-.05,.16,2.1],[.02,-.14,.12,1.8]].forEach(([x,z,r,s])=>{const c=mk(new T.OctahedronGeometry(r,0),cm,x,.14+r*s*.9,z,g);c.scale.y=s;});addGlow(0,.6,0,2,'#8fe6ff','lamp',.9,g);}});
FURN.slice(-2).forEach(f=>FURN_BY[f.k]=f);

/* ================================================================
   老師的山上小屋 (Teacher's cabin / office): pomodoro, exercise, weight (private), reading diary, class reading plan
   ================================================================ */
const TCX=120,TCZ=330,TC_W=12,TC_D=7,TC_RH=3.2;var TC_IN=false;
const TC={items:[],pomMesh:null,boardCanvas:null,boardTex:null};
const TDAY=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function normTL(t){t=JSON.parse(JSON.stringify(t||{}));t.ex=Array.isArray(t.ex)?t.ex:[];t.reads=Array.isArray(t.reads)?t.reads:[];t.pom=t.pom&&typeof t.pom==='object'?t.pom:{};
  t.anniv=typeof t.anniv==='string'?t.anniv:'';t.plan=Object.assign({title:'全班閱讀計畫',goal:10,books:[],note:''},t.plan||{});if(!Array.isArray(t.plan.books))t.plan.books=[];t.shelf=Array.isArray(t.shelf)?t.shelf:[];t.at=+t.at||0;return t;}
let TL=null,TL_DIRTY=false;
function tlLoad(){let loc=null;try{loc=JSON.parse(localStorage.getItem('shiomi-tlog')||'null');}catch(e){}const pub=normTL(CFG.teacher);
  if(IS_T&&loc&&(+loc.at||0)>pub.at){TL=normTL(loc);TL_DIRTY=true;}else{TL=pub;TL_DIRTY=false;}return TL;}
function tlSave(){TL.at=Date.now();TL_DIRTY=true;try{localStorage.setItem('shiomi-tlog',JSON.stringify(TL));}catch(e){}refreshTcBoard();}
function wtLoad(){try{const a=JSON.parse(localStorage.getItem('shiomi-tweight')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function wtSave(a){try{localStorage.setItem('shiomi-tweight',JSON.stringify(a));}catch(e){}}
function exWeek(){const out=[];const now=new Date();for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const k=TDAY(d);out.push({k,lab:'日一二三四五六'[d.getDay()],min:TL.ex.filter(e=>e.d===k).reduce((s,e)=>s+(+e.min||0),0)});}return out;}
function exStreak(){const days=new Set(TL.ex.filter(e=>+e.min>0).map(e=>e.d));let n=0;const d=new Date();if(!days.has(TDAY(d)))d.setDate(d.getDate()-1);while(days.has(TDAY(d))){n++;d.setDate(d.getDate()-1);}return n;}
function pomWeek(){let n=0;const d=new Date();for(let i=0;i<7;i++){n+=+TL.pom[TDAY(d)]||0;d.setDate(d.getDate()-1);}return n;}

/* ---------- exterior: cabin on the hill + trail sign on the shrine plateau ---------- */
var CY_IN=false;const CY={x:-80,z:104,y:hillH(-80,104),r:2.85};
function cyLocal(px,pz){const dx=px-CY.x,dz=pz-CY.z,c=Math.cos(CY.r),s=Math.sin(CY.r);return [dx*c-dz*s,dx*s+dz*c];}
function cyWorld(lx,lz){const c=Math.cos(CY.r),s=Math.sin(CY.r);return new T.Vector3(CY.x+lx*c+lz*s,CY.y,CY.z-lx*s+lz*c);}
function inYard(px,pz){const [lx,lz]=cyLocal(px,pz);return lx>-6.5&&lx<6.5&&lz>-3.5&&lz<9.5;}
(function(){const x=CY.x,z=CY.z,y=CY.y;const g=new T.Group();g.position.set(x,y,z);g.rotation.y=CY.r;scene.add(g);CY.g=g;
  // ground: flat yard that blends smoothly into the hillside (no floating box)
  {const gg=new T.PlaneGeometry(26,26,52,52);gg.rotateX(-PI/2);gg.translate(0,0,3);const p=gg.attributes.position,cols=[],c=new T.Color(),gA=col('#6f8a4c'),gB=col('#586f3c'),dirt=col('#8a6a48');
    for(let i=0;i<p.count;i++){const lx=p.getX(i),lz=p.getZ(i);const w=cyWorld(lx,lz);const ex=Math.max(0,Math.abs(lx)-6.6,-4-lz,lz-9.6);const k=smooth(0,5,ex);
      const hy=lerp(0,hillH(w.x,w.z)-y,k);p.setY(i,hy-.02*k);const n=fbm(w.x*.2,w.z*.2);c.copy(gA).lerp(gB,n*.8+k*.3);if(Math.abs(lx)<.8&&lz>4&&lz<13)c.lerp(dirt,.45);cols.push(c.r,c.g,c.b);}
    gg.setAttribute('color',new T.Float32BufferAttribute(cols,3));gg.computeVertexNormals();const gm=mk(gg,new T.MeshLambertMaterial({vertexColors:true}),0,0,0,g,false);gm.receiveShadow=true;}
  // log cabin
  const logA=lam('#7a4e30'),logB=lam('#6b432a'),dark=lam('#3e2718'),trim=lam('#efe3c8'),stone=lam('#8f8a80',{map:plainTex('#8f8a80',3000,.16)});
  mk(bx(6.6,.5,5),stone,0,.15,0,g);mk(bx(5.8,2.8,4.2),dark,0,1.7,0,g,false);
  for(let i=0;i<8;i++){const yy=.55+i*.32;const f=mk(cy(.17,.17,6.5,10),i%2?logA:logB,0,yy,2.12,g);f.rotation.z=PI/2;const b_=mk(cy(.17,.17,6.5,10),i%2?logA:logB,0,yy,-2.12,g);b_.rotation.z=PI/2;
    [-2.95,2.95].forEach(sx=>{const s=mk(cy(.17,.17,4.9,10),i%2?logB:logA,sx,yy+.16,0,g);s.rotation.x=PI/2;});}
  // roof (dark shingles, deep overhang over the porch)
  const rm=lam('#ffffff',{map:roofTex('#4a3a33'),side:T.DoubleSide});const rg=new T.Group();rg.position.y=3.05;g.add(rg);
  mk(triGeo([...quad([-3.7,0,3.9],[3.7,0,3.9],[3.7,2,0],[-3.7,2,0]),...quad([3.7,0,-3],[-3.7,0,-3],[-3.7,2,0],[3.7,2,0])],new T.Vector3(0,-2,0)),rm,0,0,0,rg);
  mk(triGeo([-3,0,2.12,3,0,2.12,0,1.95,2.12,3,0,-2.12,-3,0,-2.12,0,1.95,-2.12],new T.Vector3(0,1,0),()=>[.5,.5]),logA,0,0,0,rg);
  mk(bx(7.6,.16,.2),dark,0,2.02,0,rg);
  // chimney
  mk(bx(.8,3.4,.8),stone,2.2,3.4,-1,g);mk(bx(.95,.15,.95),dark,2.2,5.15,-1,g);
  // porch deck, posts, steps, railing
  const deck=lam('#9a6c46');mk(bx(6.4,.18,1.5),deck,0,.42,2.95,g);[-2.9,2.9].forEach(px=>{mk(bx(.18,2.7,.18),logB,px,1.8,3.6,g);});
  mk(bx(1.6,.14,.4),deck,0,.28,3.85,g);mk(bx(1.6,.14,.4),deck,0,.14,4.2,g);
  [-1,1].forEach(s=>{mk(bx(2.1,.08,.08),logB,s*1.9,.95,3.62,g);for(let k=0;k<5;k++)mk(bx(.06,.5,.06),logB,s*(.95+k*.47),.7,3.62,g);});
  // door + windows (warm light at night) + flower boxes
  mk(bx(1.2,2.1,.12),trim,0,1.45,2.3,g);mk(bx(1,1.95,.1),lam('#5a3520'),0,1.42,2.34,g);
  const wm=new T.MeshLambertMaterial({color:col('#3a2a1a'),emissive:col('#ffc97a'),emissiveIntensity:0});EM.windows.push(wm);
  mk(new T.CircleGeometry(.14,16),wm,0,1.95,2.4,g,false);mk(sph(.05,8,6),lam('#c9a24a'),.35,1.4,2.42,g,false);
  [-1.85,1.85].forEach(px=>{mk(bx(1.25,1.05,.1),trim,px,1.75,2.3,g);mk(new T.PlaneGeometry(1.05,.85),wm,px,1.75,2.36,g,false);mk(bx(.06,.85,.04),trim,px,1.75,2.38,g,false);mk(bx(1.05,.06,.04),trim,px,1.75,2.38,g,false);
    [-1,1].forEach(s=>mk(bx(.32,1.05,.06),lam('#4f6b52'),px+s*.8,1.75,2.33,g));
    mk(bx(1.1,.22,.26),lam('#8a5a36'),px,1.12,2.45,g);for(let k=0;k<5;k++)mk(sph(.09,8,6),lam(pick(['#e05a4a','#f2c14e','#f7f2e8','#e88fb0'])),px-.4+k*.2,1.3,2.47,g);});
  mk(bx(1.1,.02,.6),lam('#b8452f'),0,.52,2.9,g,false);
  const lm=new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:1});EM.lamps.push(lm);mk(bx(.18,.26,.18),lm,.85,2.3,2.4,g);addGlow(.85,2.3,2.6,1.8,'#ffcf8f','lamp',.8,g);
  // woodpile & bench
  for(let r=0;r<3;r++)for(let k=0;k<4-r;k++){const lg=mk(cy(.12,.12,.9,8),logA,-3.5,.3+r*.22,-1+k*.26+r*.13,g);lg.rotation.x=PI/2;}
  const bench=new T.Group();bench.position.set(-4.2,0,5.6);bench.rotation.y=.5;g.add(bench);mk(bx(1.6,.08,.45),M.woodLight,0,.45,0,bench);mk(bx(1.6,.4,.06),M.woodLight,0,.7,-.2,bench);[-.7,.7].forEach(dx=>mk(bx(.06,.45,.4),M.woodDark,dx,.22,0,bench));
  // stone path from the porch steps straight to the edge of the yard, then down the hill
  for(let i=0;i<10;i++){const lz=4.7+i*.8,lx=rr(-.15,.15);const w=cyWorld(lx,lz);const ex=Math.max(0,lz-9.6),hy=lerp(0,hillH(w.x,w.z)-y,smooth(0,5,ex));const s=mk(cy(.34,.36,.08,10),M.stone,lx,hy+.05,lz,g,false);s.receiveShadow=true;}
  // fence along the front edge (opening for the path)
  [[-6.3,-1.2],[1.2,6.3]].forEach(([a,b])=>{for(let px=a;px<=b+.01;px+=.9)mk(bx(.08,.7,.08),logB,px,.35,9.2,g);mk(bx(b-a,.07,.06),logB,(a+b)/2,.55,9.2,g);mk(bx(b-a,.07,.06),logB,(a+b)/2,.3,9.2,g);});
  // signpost at the path opening (two arms: down to the shrine / train back to the station)
  const sg=new T.Group();sg.position.set(1.3,0,9.0);g.add(sg);mk(cy(.07,.08,2,6),M.woodDark,0,1,0,sg);
  const arm=(txt,yy,dir,colr)=>{const [c,cx_]=C2(256,80);cx_.fillStyle=colr;cx_.fillRect(0,0,256,80);cx_.strokeStyle='#3e2718';cx_.lineWidth=6;cx_.strokeRect(3,3,250,74);cx_.fillStyle='#fff8ea';cx_.font=`700 30px ${FG}`;cx_.textAlign='center';cx_.textBaseline='middle';cx_.fillText(txt,128,42);
    const m=mk(new T.PlaneGeometry(1.1,.34),new T.MeshLambertMaterial({map:TX(c),side:T.DoubleSide,emissive:0xffffff,emissiveMap:TX(c),emissiveIntensity:.25}),dir*.45,yy,.06,sg,false);m.rotation.z=dir*.05;};
  arm('↓ 下山・神社',1.7,-1,'#8a6446');arm('🚃 平等車站',1.3,1,'#2f6b56');addGlow(0,2.05,.2,1.2,'#ffe2a8','lamp',.7,sg);
  // a few pines around the yard
  [[-7.5,-1],[-8,4],[7.6,0],[8.2,5],[-6,-4.5],[6.5,-4.8]].forEach(([lx,lz])=>{const w=cyWorld(lx,lz);const hy=hillH(w.x,w.z);const t=new T.Group();t.position.set(w.x,Math.max(hy,y-1),w.z);scene.add(t);mk(cy(.18,.25,1.6,7),M.trunk,0,.8,0,t);
    for(let k=0;k<3;k++)mk(new T.ConeGeometry(1.5-k*.35,1.8,8),M.pine,0,1.9+k*1.05,0,t);});
  // hidden path: just a few bushes and stepping stones on the west edge of the shrine plateau
  const sx=-64.6,sz=79;for(let k=0;k<7;k++){const b=mk(ico(rr(.45,.75),0),pick([M.leaf,M.leaf2,M.pine]),sx+rr(-.6,.8),4+rr(.2,.45),sz+rr(-1.6,1.6));b.scale.y=.75;}
  for(let k=0;k<3;k++){const s=mk(cy(.28,.3,.08,8),M.stone,sx+1.4-k*.55,4.04,sz+rr(-.2,.2),scene,false);s.receiveShadow=true;}
  {const hs=new T.Group();hs.position.set(sx+.9,4,sz-1.3);hs.rotation.y=PI/2;scene.add(hs);mk(cy(.05,.06,1.2,6),M.woodDark,0,.6,0,hs);const [c,x_]=C2(256,80);x_.fillStyle='#8a6446';x_.fillRect(0,0,256,80);x_.strokeStyle='#3e2718';x_.lineWidth=6;x_.strokeRect(3,3,250,74);x_.fillStyle='#fff8ea';x_.font=`700 32px ${FG}`;x_.textAlign='center';x_.textBaseline='middle';x_.fillText('↑ 山上小屋',128,42);
    mk(new T.PlaneGeometry(.8,.25),new T.MeshLambertMaterial({map:TX(c),side:T.DoubleSide}),0,1.05,.04,hs,false);hs.visible=false;CY.pathSign=hs;}})();
inter(new T.Vector3(-63.4,4,79),1.6,()=>W.tcSeen?'走小路去老師的小屋':'撥開草叢看看',()=>{if(!W.tcSeen&&!TS())say('草叢',['草叢後面好像有一條很窄的小路，一直往山上延伸……'],{onEnd:()=>choose('小路','要沿著小路往山上走嗎？',[{label:'走上去看看',fn:()=>goYard()},{label:'算了',fn:null}])});else goYard();});

{const d=cyWorld(0,4.4);inter(d,1.6,'進小屋',()=>enterCabin());const s=cyWorld(1.2,8.6);inter(s,1.9,'看路牌（下山／回車站）',()=>choose('路牌','要去哪裡？',[{label:'↓ 走小路下山（神社）',fn:()=>leaveYard()},{label:'🚃 搭車回平等車站',fn:()=>trainRide('平等',()=>{CY_IN=false;enterStation({now:true});})},{label:'留在這裡',fn:null}]));}
function goYard(){fadeTo(()=>{r2Off();INDOOR=false;TC_IN=false;ST_IN=false;HOME_IN=false;CY_IN=true;P.sit=null;const p=cyWorld(.8,8.3);P.pos.set(p.x,CY.y,p.z);P.vel.set(0,0,0);P.yaw=CY.r+PI;cam.yaw=CY.r+.3;cam.pitch=.3;
  cam.pos.set(p.x+Math.sin(cam.yaw)*6,CY.y+3,p.z+Math.cos(cam.yaw)*6);cam.look.set(p.x,CY.y+1.4,p.z);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(p.x+.8,CY.y,p.z+.5);PETOBJ.by=CY.y;}SND.chime&&SND.chime();
  if(!W.tcSeen&&!TS())setTimeout(()=>say('山上',['小路的盡頭，是一間亮著燈的小木屋……','門口好像寫著「老師的家」？']),600);});}
function leaveYard(){fadeTo(()=>{CY_IN=false;P.pos.set(-62.4,4,78.4);P.vel.set(0,0,0);P.yaw=PI/2;cam.yaw=PI/2+.25;cam.pitch=.2;cam.pos.set(-57.6,6.3,79.6);cam.look.set(-62.4,5.3,78.4);setTimeout(()=>toast('想回山上的家，在這叢草旁邊按 E 就能走小路上去'),700);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(-62.2,4,80);PETOBJ.by=4;}SND.chime&&SND.chime();});}

/* ---------- interior ---------- */
(function(){const G=new T.Group();G.position.set(TCX,0,TCZ);scene.add(G);TC.g=G;const W_=TC_W/2,D_=TC_D/2,EXT=3.8,RH=TC_RH;
  const logTex=(()=>{const [c,g]=C2(256,256);for(let y=0;y<256;y+=32){const gr=g.createLinearGradient(0,y,0,y+32);gr.addColorStop(0,'#a8744c');gr.addColorStop(.5,'#c08a5c');gr.addColorStop(1,'#7e5436');g.fillStyle=gr;g.fillRect(0,y,256,32);g.fillStyle='rgba(50,30,18,.55)';g.fillRect(0,y+30,256,2);}speckle(g,256,256,1500,.07);return TX(c,true);})();
  const tileTex=(()=>{const [c,g]=C2(128,128);g.fillStyle='#e9eef0';g.fillRect(0,0,128,128);g.fillStyle='#b9c7cc';for(let i=0;i<=128;i+=32){g.fillRect(i,0,2,128);g.fillRect(0,i,128,2);}return TX(c,true);})();
  const plank=(()=>{const [c,g]=C2(256,256);g.fillStyle='#9a6c46';g.fillRect(0,0,256,256);for(let x=0;x<256;x+=32){g.fillStyle=`rgba(${rand()<.5?'60,35,20':'150,100,60'},.25)`;g.fillRect(x,0,32,256);g.fillStyle='rgba(40,25,15,.4)';g.fillRect(x+31,0,1,256);}speckle(g,256,256,2000,.06);return TX(c,true);})();
  const wallM=new T.MeshLambertMaterial({map:logTex,emissive:0xffffff,emissiveMap:logTex,emissiveIntensity:.12});
  const tileM=new T.MeshLambertMaterial({map:tileTex,emissive:0xffffff,emissiveMap:tileTex,emissiveIntensity:.15});
  const rep=(geo,u,v)=>{const a=geo.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,a.getX(i)*u,a.getY(i)*v);return geo;};
  // floor (extends toward the camera), ceiling, walls
  const fg=rep(new T.PlaneGeometry(TC_W,TC_D+EXT),TC_W/2.4,(TC_D+EXT)/2.4);fg.rotateX(-PI/2);mk(fg,new T.MeshLambertMaterial({map:plank,emissive:0xffffff,emissiveMap:plank,emissiveIntensity:.1}),0,0,EXT/2,G,false);
  const bf=rep(new T.PlaneGeometry(3.3,TC_D),3.3/1.2,TC_D/1.2);bf.rotateX(-PI/2);mk(bf,tileM,W_-1.65,.006,0,G,false);
  const cg=new T.PlaneGeometry(TC_W,TC_D+EXT);cg.rotateX(PI/2);mk(cg,new T.MeshBasicMaterial({color:col('#5e4230')}),0,RH,EXT/2,G,false);
  for(let x=-W_;x<=W_;x+=2)mk(bx(.18,.2,TC_D+EXT),new T.MeshBasicMaterial({color:col('#43301f')}),x,RH-.1,EXT/2,G,false);
  const wall=(w,h,x,y,z,ry,m=wallM,u=w/2.4)=>{const geo=rep(new T.PlaneGeometry(w,h),u,h/2.4);const mm=mk(geo,m,x,y,z,G,false);mm.rotation.y=ry;return mm;};
  wall(TC_W,RH,0,RH/2,-D_,0);wall(TC_D+EXT,RH,-W_,RH/2,EXT/2,PI/2);wall(TC_D+EXT,RH,W_,RH/2,EXT/2,-PI/2);
  // bathroom tiles on its back wall
  wall(3.3,RH,W_-1.65,RH/2,-D_+.01,0,tileM,3.3/1.2);
  // partitions (kitchen | office | bathroom), with a way through at the front
  const part=(x,m)=>{mk(bx(.16,RH,TC_D-1.7),m,x,RH/2,-D_+(TC_D-1.7)/2,G,false);addCol(TCX+x-.1,TCX+x+.1,TCZ-D_,TCZ-D_+TC_D-1.7,4);};
  part(-2.7,lam('#9a6a44'));part(2.7,lam('#e3e8ea'));
  // window with a mountain view (office back wall)
  const [vc,vg]=C2(256,160);const sk=vg.createLinearGradient(0,0,0,160);sk.addColorStop(0,'#8fb6d8');sk.addColorStop(1,'#f3d9b8');vg.fillStyle=sk;vg.fillRect(0,0,256,160);
  [['#6d88a0',70,.5],['#4f6b5a',100,.8],['#3c5a44',125,1]].forEach(([c,h,k])=>{vg.fillStyle=c;vg.beginPath();vg.moveTo(0,160);for(let x=0;x<=256;x+=16)vg.lineTo(x,h-Math.sin(x*.03*k+k*3)*22*k-Math.sin(x*.09)*8);vg.lineTo(256,160);vg.fill();});
  const vt=TX(vc);mk(new T.PlaneGeometry(1.5,1.0),new T.MeshBasicMaterial({map:vt}),-1.7,1.9,-D_+.02,G,false);
  [[0,.55,1.62,.08],[0,-.55,1.62,.08],[-.78,0,.08,1.1],[.78,0,.08,1.1],[0,0,.05,1.0]].forEach(([dx,dy,w,h])=>mk(bx(w,h,.08),lam('#f3ead9'),-1.7+dx,1.9+dy,-D_+.05,G,false));
  addGlow(-1.7,1.9,-D_+.3,2.6,'#fff3dd','day',.25,G);
  // ---- office: desk, chair, bookshelf, tomato clock, achievement board, reading chair, exercise corner
  const wood=imat('#7e5638',.3),woodL=imat('#b08a5e',.3);
  mk(bx(2,.07,.8),woodL,.6,.76,-D_+.5,G);[[-.35,-.3],[1.55,-.3],[-.35,.3],[1.55,.3]].forEach(([x,z])=>mk(bx(.06,.74,.06),wood,x,.37,-D_+.5+z,G));
  mk(bx(.7,.44,.03),imat('#2a2a30',.2),.9,1.1,-D_+.3,G);mk(bx(.64,.38,.01),new T.MeshBasicMaterial({color:col('#9fc2e0')}),.9,1.1,-D_+.32,G,false);mk(bx(.08,.18,.08),imat('#2a2a30',.2),.9,.86,-D_+.3,G,false);
  mk(bx(.4,.02,.14),imat('#e8e4dc',.4),.9,.8,-D_+.62,G,false);mk(cy(.05,.04,.1,10),imat('#f3ead9',.4),1.45,.84,-D_+.55,G,false);
  // tomato clock
  const tg=new T.Group();tg.position.set(.05,.8,-D_+.55);G.add(tg);const tom=mk(sph(.14,16,12),imat('#e04a2e',.45),0,.12,0,tg);tom.scale.y=.85;
  const leaf=mk(new T.ConeGeometry(.08,.06,5),imat('#4f9a3a',.4),0,.24,0,tg);const dial=new T.Group();dial.position.set(0,.12,.13);tg.add(dial);mk(bx(.012,.07,.01),imat('#fff',.6),0,.03,0,dial,false);TC.dial=dial;TC.tom=tg;
  // chair
  mk(bx(.5,.06,.5),wood,.6,.46,-D_+1.25,G);mk(bx(.5,.6,.06),wood,.6,.78,-D_+1.5,G);[[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]].forEach(([x,z])=>mk(bx(.05,.44,.05),wood,.6+x,.22,-D_+1.25+z,G));
  addCol(TCX-.45,TCX+1.65,TCZ-D_,TCZ-D_+.95,2);
  // bookshelf
  mk(bx(1.1,2.2,.4),wood,2.05,1.1,-D_+.22,G);for(let r=0;r<4;r++){mk(bx(1.02,.04,.36),woodL,2.05,.3+r*.5,-D_+.24,G,false);for(let i=0;i<8;i++){if(rand()<.2)continue;const h=rr(.26,.38);mk(bx(.09,h,.26),imat(pick(['#d9573b','#3d6ea8','#f2c14e','#4fae6c','#8a6ad0','#e8dcc4']),.35),1.62+i*.12,.32+r*.5+h/2,-D_+.26,G,false);}}
  addCol(TCX+1.5,TCX+2.6,TCZ-D_,TCZ-D_+.45,3);
  // achievement board (canvas)
  const [bc]=C2(1024,576);TC.boardCanvas=bc;TC.boardTex=TX(bc);mk(bx(2.2,1.27,.06),imat('#5a3a24',.3),.2,2.1,-D_+.05,G,false);
  mk(new T.PlaneGeometry(2.1,1.18),new T.MeshBasicMaterial({map:TC.boardTex}),.2,2.1,-D_+.09,G,false);
  // reading armchair + lamp + rug
  const rugG=new T.CylinderGeometry(1.1,1.1,.02,28);mk(rugG,imat('#9a5a48',.3),-1.3,.01,.6,G,false);mk(new T.CylinderGeometry(.9,.9,.025,28),imat('#e8dcc4',.3),-1.3,.012,.6,G,false);
  const ac=new T.Group();ac.position.set(-1.9,0,.4);ac.rotation.y=.6;G.add(ac);const F='#5f7a55',Cc='#8aa37a';mk(bx(.84,.26,.78),imat(F,.3),0,.2,0,ac);mk(bx(.62,.12,.6),imat(Cc,.35),0,.39,.05,ac);mk(bx(.84,.55,.16),imat(F,.3),0,.6,-.32,ac);[-.36,.36].forEach(x=>mk(bx(.14,.34,.78),imat(F,.3),x,.44,0,ac));
  addCol(TCX-2.35,TCX-1.45,TCZ-.05,TCZ+.85,1);
  mk(cy(.02,.02,1.5,6),imat('#3a3a3e',.3),-2.35,.75,-.35,G);const lm=new T.MeshLambertMaterial({color:col('#fff1cf'),emissive:col('#ffcf8f'),emissiveIntensity:.9});mk(cy(.16,.26,.32,14),lm,-2.35,1.6,-.35,G,false);addGlow(-2.35,1.55,-.35,2.2,'#ffd79a','adv',.9,G);
  // exercise corner: yoga mat + dumbbells + jump rope
  const mat=mk(bx(1.7,.02,.7),imat('#4a9be0',.35),1.85,.012,2.8,G,false);[[.8,2.3],[.8,2.58]].forEach(([x,z])=>{const d=mk(cy(.035,.035,.34,8),imat('#3a3a3e',.3),x,.08,z,G,false);d.rotation.z=PI/2;[-.14,.14].forEach(s=>mk(cy(.07,.07,.07,10),imat('#e04a2e',.4),x+s,.08,z,G,false).rotation.z=PI/2);});
  // pennant "以身作則"
  const [pc,pg]=C2(256,64);pg.fillStyle='#b8452f';pg.fillRect(0,0,256,64);pg.fillStyle='#fff3dd';pg.font=`700 34px ${FG}`;pg.textAlign='center';pg.textBaseline='middle';pg.fillText('以身作則・一起加油',128,34);
  const pn=mk(new T.PlaneGeometry(1.6,.4),new T.MeshBasicMaterial({map:TX(pc)}),W_-3.3-.02,2.35,.9,G,false);pn.rotation.y=-PI/2;
  // ---- kitchen
  const kx=-W_+1.6;mk(bx(2.9,.88,.6),imat('#e8dcc4',.3),-W_+1.65,.44,-D_+.32,G);mk(bx(2.96,.05,.66),imat('#6e5238',.3),-W_+1.65,.9,-D_+.33,G);
  mk(bx(.5,.02,.36),imat('#9aa4aa',.4),-W_+1.2,.93,-D_+.33,G,false);[[-W_+2.3,-.1],[-W_+2.6,-.1],[-W_+2.3,.12],[-W_+2.6,.12]].forEach(([x,dz])=>mk(cy(.08,.08,.015,14),imat('#2a2a30',.2),x,.935,-D_+.33+dz,G,false));
  mk(bx(2.9,.6,.34),imat('#c8b89a',.3),-W_+1.65,2.2,-D_+.18,G);const kt=mk(sph(.1,10,8),imat('#c9432a',.4),-W_+2.45,1.0,-D_+.3,G,false);kt.scale.y=.8;
  mk(bx(.7,1.9,.66),imat('#f1ece2',.4),-W_+.4,.95,-.9,G);mk(bx(.03,.4,.03),imat('#9aa4aa',.4),-W_+.77,1.2,-.7,G,false);addCol(TCX-W_,TCX-W_+.8,TCZ-1.25,TCZ-.55,3);
  addCol(TCX-W_,TCX-W_+3.1,TCZ-D_,TCZ-D_+.65,2);
  const tb=new T.Group();tb.position.set(kx+.2,0,.9);G.add(tb);mk(cy(.5,.5,.05,20),woodL,0,.72,0,tb);mk(cy(.05,.07,.7,8),wood,0,.35,0,tb);mk(cy(.07,.06,.1,10),imat('#f3ead9',.4),.1,.8,.05,tb,false);
  [[-.75,0],[.75,0]].forEach(([dx])=>{mk(bx(.4,.05,.4),wood,dx,.45,0,tb);mk(bx(.05,.45,.4),wood,dx+(dx<0?-.18:.18),.68,0,tb);});addCol(TCX+kx+.2-.55,TCX+kx+.2+.55,TCZ+.4,TCZ+1.4,1);
  // ---- bathroom
  const bxX=W_-1.65;const tub=new T.Group();tub.position.set(bxX+.3,0,-D_+.55);G.add(tub);mk(bx(2,.55,.9),imat('#f7f5ee',.45),0,.275,0,tub);mk(bx(1.8,.02,.7),new T.MeshLambertMaterial({color:col('#9fd6ea'),emissive:col('#4a90b0'),emissiveIntensity:.35}),0,.5,0,tub,false);
  mk(cy(.02,.02,.3,6),imat('#c0c6ca',.5),.85,.75,-.3,tub,false);addCol(TCX+bxX-.7,TCX+bxX+1.3,TCZ-D_,TCZ-D_+1.05,1);
  const tl=new T.Group();tl.position.set(W_-.35,0,-.6);tl.rotation.y=-PI/2;G.add(tl);mk(cy(.2,.16,.4,12),imat('#f7f5ee',.45),0,.2,0,tl);mk(bx(.4,.45,.18),imat('#f7f5ee',.45),0,.45,-.25,tl);mk(cy(.22,.22,.04,14),imat('#f1ece2',.45),0,.42,.02,tl,false);addCol(TCX+W_-.7,TCX+W_,TCZ-.9,TCZ-.3,1);
  mk(bx(.6,.14,.4),imat('#f7f5ee',.45),bxX-1.05,.85,.35,G);mk(cy(.03,.03,.8,6),imat('#c0c6ca',.5),bxX-1.05,.42,.35,G,false);
  const mir=mk(new T.PlaneGeometry(.5,.7),new T.MeshPhongMaterial({color:col('#cfe0e8'),specular:0xffffff,shininess:90,emissive:col('#4a5a64')}),bxX-1.33,1.6,.35,G,false);mir.rotation.y=PI/2;
  mk(bx(.04,.04,.7),imat('#c0c6ca',.5),W_-.05,1.3,.9,G,false);mk(bx(.03,.5,.5),imat('#ec8fb0',.4),W_-.07,1.08,.9,G,false);
  // outer colliders (open front only near the door)
  addCol(TCX-W_-.3,TCX-W_,TCZ-D_,TCZ+D_,4);addCol(TCX+W_,TCX+W_+.3,TCZ-D_,TCZ+D_,4);addCol(TCX-W_,TCX+W_,TCZ-D_-.3,TCZ-D_,4);addCol(TCX-W_,TCX+W_,TCZ+D_,TCZ+D_+.3,4);
  const [dc,dg]=C2(128,64);dg.fillStyle='#4a3222';dg.fillRect(0,0,128,64);dg.fillStyle='#f3ead9';dg.font=`700 22px ${FG}`;dg.textAlign='center';dg.textBaseline='middle';dg.fillText('出口 ↓',64,33);
  const dm=mk(new T.PlaneGeometry(1.2,.6),new T.MeshBasicMaterial({map:TX(dc)}),0,.012,D_-.45,G,false);dm.rotation.x=-PI/2;
  // interactions
  const P_=(x,z)=>new T.Vector3(TCX+x,0,TCZ+z);
  inter(P_(0,D_-.6),1.3,'離開小屋',()=>exitCabin());
  inter(P_(.5,-D_+1.5),1.2,'坐到辦公桌前',()=>openCabin(TS()?'me':'plan'));
  inter(P_(-.3,-D_+1.3),1.0,'番茄任務時鐘',()=>openCabin('pom'));
  inter(P_(2.05,-D_+.9),1.2,'全班閱讀計畫',()=>openCabin('plan'));
  {const bd=new T.Group();bd.position.set(2.08,0,.8);G.add(bd);const wd=imat('#7e5638',.3);mk(bx(1.04,.32,2.04),wd,0,.16,0,bd);mk(bx(.96,.16,1.96),imat('#f3ece0',.4),0,.4,0,bd);
    mk(bx(1.0,.07,1.3),imat('#c8756a',.35),0,.5,.32,bd);mk(bx(1.01,.05,.12),imat('#e8b0a0',.35),0,.52,-.36,bd);mk(bx(.62,.1,.32),imat('#fbf7ee',.45),0,.53,-.72,bd);mk(bx(1.06,.8,.08),wd,0,.4,-1.02,bd);
    addCol(TCX+1.56,TCX+2.6,TCZ-.24,TCZ+1.84,1);inter(P_(1.3,.9),1.1,'床',()=>homeSleep());}
  inter(P_(1.9,2.6),1.2,()=>TS()?(WO.run?'運動中…（按 E 看計時）':'在運動角開始運動'):'老師的運動角',()=>{if(TS())openCabin('wo');else say('運動角',['老師的瑜伽墊和啞鈴。','老師說：「每天動一動，身體和頭腦都會更有精神！」']);});
  inter(P_(-1.6,1.0),1.2,'老師的閱讀日記',()=>openCabin('rd'));
  {const [mc,mg]=C2(256,192);mg.fillStyle='#e8d5a8';mg.fillRect(0,0,256,192);speckle(mg,256,192,900,.1);mg.strokeStyle='#7a5230';mg.lineWidth=3;mg.setLineDash([8,6]);mg.beginPath();mg.moveTo(30,160);mg.bezierCurveTo(80,120,60,70,130,80);mg.bezierCurveTo(190,90,170,40,220,30);mg.stroke();mg.setLineDash([]);
    mg.strokeStyle='#b8452f';mg.lineWidth=5;mg.beginPath();mg.moveTo(208,20);mg.lineTo(232,44);mg.moveTo(232,20);mg.lineTo(208,44);mg.stroke();mg.fillStyle='#4a90b0';mg.fillRect(214,48,12,40);mg.fillStyle='#5a3a24';mg.font=`700 22px ${FM}`;mg.textAlign='center';mg.fillText('瀑布之迷宮',128,178);
    const mp=mk(new T.PlaneGeometry(.8,.6),new T.MeshLambertMaterial({map:TX(mc),emissive:0xffffff,emissiveMap:TX(mc),emissiveIntensity:.15,side:T.DoubleSide}),-2.6+.1,1.6,-1.6,G,false);mp.rotation.y=PI/2;TC.mapMesh=mp;}
  inter(P_(-2.0,-1.4),1.2,()=>W.adv&&W.adv.map?'牆上的古老地圖（已抄下來）':'牆上的古老地圖',()=>{const A_=advS();if(A_.map){say('古老地圖',['你已經把地圖抄下來了。拿著它，就能走進瀑布後面的迷宮。']);return;}
    A_.map=true;histAdd('adv','探險：在老師的小屋找到瀑布迷宮的古老地圖');save();SND.stamp&&SND.stamp();say('古老地圖',['牆上貼著一張泛黃的地圖，上面畫著神社後方的瀑布……','你把地圖仔細抄了下來！','有了這張地圖，就能在黑暗的瀑布迷宮裡找到路。']);});
  inter(P_(kx+.2,1.8),1.3,'廚房',()=>say('小廚房',['水壺咕嘟咕嘟地響，老師常在這裡煮一杯熱茶。','冰箱上貼著一張紙條：「多吃蔬菜，早點睡覺！」']));
  inkify(G);inter(P_(bxX,.9),1.3,'浴室',()=>say('浴室',['這是老師的私人浴室。',TS()?'（浴室裡面之後會做成可以走進去的房間。）':'浴缸裡放好了熱水……咳咳，我們還是回客廳吧！']));})();

/* ---------- board texture ---------- */
function refreshTcBoard(){if(!TC.boardCanvas)return;if(!TL)tlLoad();const g=TC.boardCanvas.getContext('2d'),Wc=1024,Hc=576;
  g.fillStyle='#f4ead6';g.fillRect(0,0,Wc,Hc);speckle(g,Wc,Hc,1400,.05);
  g.fillStyle='#b8452f';g.fillRect(0,0,Wc,64);g.fillStyle='#fff3dd';g.font=`700 36px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('老師的成果牆',28,34);
  g.font=`500 22px ${FG}`;g.textAlign='right';g.fillText('以身作則・一起加油！',Wc-26,36);
  const wk=exWeek(),tot=wk.reduce((s,d)=>s+d.min,0),mx=Math.max(30,...wk.map(d=>d.min));
  g.textAlign='left';g.fillStyle='#3a2a20';g.font=`700 28px ${FG}`;g.fillText('本週運動',30,104);g.font=`500 22px ${FG}`;g.fillStyle='#7a5a40';g.fillText(`共 ${tot} 分鐘・連續 ${exStreak()} 天`,30,140);
  wk.forEach((d,i)=>{const x=36+i*56,h=d.min/mx*230;g.fillStyle=d.min?'#4a9be0':'#d8cbb2';g.fillRect(x,430-Math.max(4,h),36,Math.max(4,h));g.fillStyle='#3a2a20';g.font=`500 20px ${FG}`;g.textAlign='center';g.fillText(d.lab,x+18,456);if(d.min){g.font=`700 17px ${FG}`;g.fillText(d.min,x+18,418-h);}g.textAlign='left';});
  g.fillStyle='rgba(58,42,32,.2)';g.fillRect(440,90,2,440);
  g.fillStyle='#3a2a20';g.font=`700 28px ${FG}`;g.fillText('老師最近在讀',470,104);
  const rd=TL.reads.slice(-4).reverse();g.font=`500 23px ${FG}`;if(!rd.length){g.fillStyle='#9a8a70';g.fillText('（還沒有紀錄）',470,150);}
  rd.forEach((r,i)=>{g.fillStyle='#3a2a20';g.fillText(`📖 ${String(r.book).slice(0,14)}`,470,152+i*44);g.fillStyle='#9a7a5a';g.font=`500 17px ${FG}`;g.fillText(r.d.slice(5).replace('-','/'),940,152+i*44);g.font=`500 23px ${FG}`;});
  g.fillStyle='#3a2a20';g.font=`700 26px ${FG}`;g.fillText(`🍅 本週專注 ${pomWeek()} 顆番茄`,470,358);
  const pl=TL.plan;g.font=`700 26px ${FG}`;g.fillText(`📚 ${pl.title}`,470,414);g.font=`500 21px ${FG}`;g.fillStyle='#7a5a40';g.fillText(`目標：每人讀 ${pl.goal} 本書${pl.books.length?`・推薦 ${pl.books.length} 本`:''}`,470,450);
  if(TL_DIRTY&&TS()){g.fillStyle='#b8452f';g.font=`700 18px ${FG}`;g.fillText('（有新紀錄還沒發布）',470,520);}
  TC.boardTex.needsUpdate=true;}

/* ---------- enter / exit ---------- */
function enterCabin(){fadeTo(()=>enterCabinDirect());}
function enterCabinDirect(){tlLoad();try{drawAnn();}catch(e){}{const found=!W.tcSeen&&!TS();INDOOR=true;TC_IN=true;ST_IN=false;CY_IN=false;HOME_IN=false;CH_IN=false;W.tcSeen=true;if(found){histAdd('adv','探險：找到老師藏在山上的小屋');W.coins+=50;led(50,'找到老師的小屋','探險');renderPouch();}save();P.sit=null;P.pos.set(TCX,0,TCZ+2.4);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;
  cam.pos.set(TCX,3,TCZ+6.5);cam.look.set(TCX,.5,TCZ);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(TCX+1,0,TCZ+2.6);PETOBJ.by=0;}refreshTcBoard();SND.chime&&SND.chime();
  r2Enter();setTimeout(()=>{if(found)say('老師的山上小屋',['你找到老師藏在山上的小屋了！+50 金幣','咦？書桌上放著一疊發著微光的車票……每一張都寫著「平等 → 汐見町」。','旁邊的信紙上寫著：「汐見町需要你。——燈塔守護者」','原來，寄車票給你的燈塔守護者……就是老師！','牆上好像還掛著什麼……到處看看吧！']);else toast(TS()?'歡迎回來，老師！辦公桌可以記錄運動、體重和閱讀':'這裡是老師的山上小屋，看看老師的成果牆吧！');},500);}}
function exitCabin(){closeCabin();fadeTo(()=>{r2Off();INDOOR=false;TC_IN=false;ST_IN=false;CY_IN=true;const p=cyWorld(0,4.9);P.pos.set(p.x,CY.y,p.z);P.vel.set(0,0,0);P.yaw=CY.r;cam.yaw=CY.r;cam.pitch=.28;
  cam.pos.set(p.x+Math.sin(cam.yaw)*6,CY.y+3,p.z+Math.cos(cam.yaw)*6);cam.look.set(p.x,CY.y+1.4,p.z);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(p.x+.8,CY.y,p.z+.5);PETOBJ.by=CY.y;}SND.chime&&SND.chime();});}

/* ---------- pomodoro ---------- */
const POM={mode:'focus',len:25*60,left:25*60,run:false,end:0,task:''};
const POM_MODES={focus:['專注',25],short:['短休息',5],long:['長休息',15]};
function pomStore(){try{localStorage.setItem('shiomi-pom',JSON.stringify(POM));}catch(e){}}
try{const s=JSON.parse(localStorage.getItem('shiomi-pom')||'null');if(s&&POM_MODES[s.mode])Object.assign(POM,s);}catch(e){}
function pomSet(mode,min){POM.mode=mode;POM.len=(min||POM_MODES[mode][1])*60;POM.left=POM.len;POM.run=false;pomStore();}
function pomToggle(){if(POM.run){POM.left=Math.max(0,(POM.end-Date.now())/1000);POM.run=false;}else{POM.end=Date.now()+POM.left*1000;POM.run=true;audioInit&&audioInit();}pomStore();}
function pomDone(){POM.run=false;const was=POM.mode;if(A.ready){const t=A.ctx.currentTime;[0,.35,.7].forEach(d=>{tone(1318.5,t+d,.6,'sine',.12,A.sfx);tone(2637,t+d,.3,'sine',.03,A.sfx);});}
  if(was==='focus'){const k=TDAY();if(TS()){if(!TL)tlLoad();TL.pom[k]=(+TL.pom[k]||0)+1;tlSave();tReward('pom',10,'番茄鐘專注一顆');}else{W.pomo=W.pomo||{};W.pomo[k]=(+W.pomo[k]||0)+1;save();}
    toast(`🍅 完成一顆番茄${POM.task?`：「${POM.task}」`:''}！休息 5 分鐘吧`);pomSet('short');}
  else{toast('休息結束！準備好下一顆番茄了嗎？');pomSet('focus');}
  if(CB.tab==='pom'&&!$('cabin').hidden)renderCabin();}
function fmtT(s){s=Math.ceil(s);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

/* ---------- office panel ---------- */
const CB={tab:'ex'};
const WO={run:false,start:0,what:'跑步'};try{const s=JSON.parse(localStorage.getItem('shiomi-workout')||'null');if(s&&s.run)Object.assign(WO,s);}catch(e){}
function woStore(){try{localStorage.setItem('shiomi-workout',JSON.stringify(WO));}catch(e){}}
function woEl(){return (Date.now()-WO.start)/1000;}
function woFinish(save_){const sec=woEl(),min=Math.max(1,Math.round(sec/60));WO.run=false;woStore();if(!save_){toast('這次運動沒有記錄');renderCabin();return;}
  if(!TL)tlLoad();TL.ex.push({d:TDAY(),min,what:WO.what,note:'即時記錄'});tlSave();const a=tReward('ex',min,`運動：${WO.what} ${min} 分鐘`);
  if(A.ready){const t=A.ctx.currentTime;[523,659,784].forEach((f,i)=>tone(f,t+i*.12,.4,'sine',.1,A.sfx));}
  say('運動完成！',[`${EX_IC[WO.what]||'✨'} ${WO.what} ${min} 分鐘，辛苦了！${rewText(a,'運動')}`,'記得喝水、拉拉筋喔。'],{onEnd:()=>{if(!$('cabin').hidden)renderCabin();}});}
const TREW_CAP={ex:60,rd:40,pom:50};
function tReward(kind,amt,why){if(!TS())return 0;const k=TDAY();W.tRew=W.tRew||{};const d=W.tRew[k]=W.tRew[k]||{};const room=Math.max(0,TREW_CAP[kind]-(d[kind]||0));const a=Math.min(room,Math.round(amt));
  if(a>0){d[kind]=(d[kind]||0)+a;W.coins+=a;led(a,why,kind==='ex'?'運動':kind==='rd'?'閱讀':'專注');renderPouch();save();}return a;}
function rewText(a,kind){return a>0?`（+${a} 金幣）`:`（今天的${kind}獎勵已經領滿了）`;}
// each corner of the cabin opens only its own things: books / office desk / exercise corner / anniversary frame
const CB_GROUPS={book:{t:'我的書櫃',k:'山上小屋 · My Bookshelf',tabs:[['bk','📚 書櫃'],['rd','📖 閱讀日記']]},
  desk:{t:'老師的辦公桌',k:"山上小屋 · Teacher's Office",tabs:[['me','🌤️ 今天的我',1],['plan','🏫 全班閱讀'],['pom','🍅 番茄鐘']]},
  sport:{t:'運動角落',k:'山上小屋 · Exercise Corner',tabs:[['ex','🏃 運動'],['wt','⚖️ 體重',1]]},
  ann:{t:'紀念日',k:'山上小屋 · Anniversary',tabs:[['ann','♥ 紀念日',1]]}};
function cbGroupOf(tab){for(const k in CB_GROUPS)if(CB_GROUPS[k].tabs.some(t=>t[0]===tab))return k;return tab==='wo'?'sport':'desk';}
function openCabin(tab){if(DLG.open)closeDlg();if(!TL)tlLoad();CB.tab=tab||'plan';if((CB.tab==='wt'||CB.tab==='me'||CB.tab==='ann')&&!TS())CB.tab=CB.tab==='wt'?'ex':'plan';CB.group=cbGroupOf(CB.tab);$('cabin').hidden=false;renderCabin();}
function closeCabin(){if($('cabin').hidden)return;$('cabin').hidden=true;cv.focus({preventScroll:true});}
function cbIn(type,val,attrs={}){const i=el(type==='textarea'?'textarea':'input',Object.assign(type==='textarea'?{class:'nb-in'}:{type,class:'nb-in'},attrs));i.value=val==null?'':val;return i;}
const EX_IC={'跑步':'🏃','快走':'🚶','騎腳踏車':'🚴','游泳':'🏊','重訓':'🏋️','瑜伽':'🧘','球類':'⚽','爬山':'⛰️','其他':'✨'};
function cbChips(opts,val,on,cls=''){const w=el('div',{class:'cb-chips '+cls});opts.forEach(([v,l])=>{const b=el('button',{type:'button',class:'cb-chip','aria-pressed':String(String(val)===String(v)),text:l});b.onclick=()=>{w.querySelectorAll('.cb-chip').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');on(v);};w.appendChild(b);});return w;}
function cbRow(ic,title,sub,onDel){const r=el('div',{class:'cb-item'},[el('span',{class:'cb-ic',text:ic}),el('div',{class:'cb-it'},[el('b',{text:title}),sub?el('small',{text:sub}):null])]);if(onDel)r.appendChild(el('button',{type:'button',class:'cb-del','aria-label':'刪除',text:'×',onclick:onDel}));return r;}
function fmtD(d){const p=String(d).split('-');return p.length===3?`${+p[1]}/${+p[2]}`:d;}
function meLoad(){try{return JSON.parse(localStorage.getItem('shiomi-me')||'{}')||{};}catch(e){return {};}}
function meSave(a){try{localStorage.setItem('shiomi-me',JSON.stringify(a));}catch(e){}}
function renderCabin(){const tabs=$('cbTabs'),B=$('cbBody');tabs.innerHTML='';B.innerHTML='';
  const GR=CB_GROUPS[CB.group||cbGroupOf(CB.tab)]||CB_GROUPS.desk;{const hd=$('cabin').querySelector('.dc-head');if(hd){hd.querySelector('h2').textContent=GR.t;hd.querySelector('.card-kicker').textContent=GR.k;}}
  const T_=GR.tabs.filter(t=>!t[2]||TS()).map(t=>[t[0],t[1]]);tabs.hidden=T_.length<2;
  T_.forEach(([k,l])=>{const b=el('button',{type:'button',text:l,'aria-selected':String(CB.tab===k)});b.onclick=()=>{CB.tab=k;renderCabin();};tabs.appendChild(b);});
  const card=(kids,cls='')=>{const c=el('div',{class:'nb-card '+cls},kids);B.appendChild(c);return c;};
  if(false){}
  else if(CB.tab==='ann'&&TS()){const n=annDays();const d=cbIn('date',annGet());
    card([el('b',{text:'♥ 在一起的紀念日'}),el('p',{text:n?`今天是在一起的第 ${n} 天，牆上的相框每天會自動加一天。`:'設定開始的日期，牆上的相框就會每天自動算天數。'}),d,
      el('button',{type:'button',class:'btn primary cb-go',text:'儲存',onclick:()=>{if(!d.value){toast('請選日期');return;}try{localStorage.setItem('shiomi-anniv',d.value);}catch(e){}drawAnn();toast(`第 ${annDays()} 天！`);renderCabin();}}),
      el('p',{class:'help',text:'只存在這台裝置，只有老師登入時看得到，學生看不到這個相框。'})],'cb-form');}
else if(CB.tab==='me'&&TS()){const A_=meLoad(),k=TDAY(),t=A_[k]=A_[k]||{mood:'',sleep:0,water:0,note:''};
    card([el('p',{class:'cb-lock',text:'🔒 只有老師看得到，只存在這台裝置。'})],'cb-private');
    const MO=[['😄','很棒'],['🙂','不錯'],['😐','普通'],['😮‍💨','好累'],['😢','難過']];
    const wk=[];for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*864e5);const kk=d.toISOString().slice(0,10);wk.push([kk,'日一二三四五六'[d.getDay()]]);}
    card([el('b',{text:'這一週的我'}),el('div',{class:'me-week'},wk.map(([kk,l])=>{const r=A_[kk]||{};return el('div',{class:'me-day'+(kk===k?' today':'')},[el('i',{text:r.mood||'·'}),el('small',{text:l}),el('span',{class:'me-w',text:r.water?`💧${r.water}`:''})]);}))]);
    const mood=el('div',{class:'me-moods'});MO.forEach(([e,l])=>{const b=el('button',{type:'button',class:'me-mood','aria-pressed':String(t.mood===e),html:`<i>${e}</i><small>${l}</small>`});b.onclick=()=>{t.mood=e;meSave(A_);renderCabin();};mood.appendChild(b);});
    const cups=el('div',{class:'me-cups'});for(let i=0;i<8;i++){const b=el('button',{type:'button',class:'me-cup'+(i<t.water?' on':''),text:'💧','aria-label':`${i+1} 杯`});b.onclick=()=>{t.water=t.water===i+1?i:i+1;meSave(A_);renderCabin();};cups.appendChild(b);}
    const sl=cbChips([[5,'5'],[6,'6'],[7,'7'],[8,'8'],[9,'9+']],t.sleep,v=>{t.sleep=v;meSave(A_);},'cb-mins');
    const n=cbIn('textarea',t.note,{placeholder:'今天想記下的一句話（感謝的事、開心的事…）',maxlength:'120'});
    card([el('b',{text:'今天的心情'}),mood,el('b',{text:`喝水 ${t.water} / 8 杯`}),cups,el('b',{text:'昨晚睡了幾個小時？'}),sl,el('b',{text:'一句話'}),n,
      el('button',{type:'button',class:'btn primary cb-go',text:'儲存今天的我',onclick:()=>{t.note=n.value.trim();meSave(A_);toast('記下來了 🌤️');renderCabin();}})],'cb-form');
    const past=Object.keys(A_).filter(x=>x!==k&&(A_[x].note||A_[x].mood)).sort().reverse().slice(0,8);
    if(past.length){const c=card([el('b',{text:'之前的我'})],'cb-list');past.forEach(x=>{const r=A_[x];c.appendChild(cbRow(r.mood||'📝',r.note||'（沒有寫字）',fmtD(x)+(r.sleep?`・睡 ${r.sleep} 小時`:'')+(r.water?`・💧${r.water}`:'')));});}}
  else if(CB.tab==='bk'){const SH=TL.shelf,ST=[['reading','📖 正在讀'],['want','🔖 想讀'],['buy','🛒 想買'],['done','✅ 讀完了']];const vis=TS()?ST:ST.filter(x=>x[0]!=='buy');
    const col=t=>{let h=0;for(const ch of String(t))h=(h*31+ch.charCodeAt(0))>>>0;return ['#c8573f','#3b6ea5','#4f8a5b','#d99a2b','#7a5aa8','#2f7f7a','#b5654a','#5a6fa8'][h%8];};
    if(TS()){const F={s:'want'};const t=cbIn('text','',{placeholder:'書名',maxlength:'40'}),a=cbIn('text','',{placeholder:'作者（可不填）',maxlength:'30'});
      card([el('b',{text:'放一本書到書櫃'}),t,a,cbChips(ST.slice(0,3),F.s,v=>F.s=v),el('button',{type:'button',class:'btn primary cb-go',text:'放上書櫃',onclick:()=>{const v=t.value.trim();if(!v){toast('請輸入書名');return;}
        SH.push({t:v,a:a.value.trim(),s:F.s,d:TDAY()});tlSave();toast(`《${v}》放上書櫃了`);renderCabin();}})],'cb-form');}
    vis.forEach(([k,l])=>{const L=SH.filter(b=>b.s===k);const sh=el('div',{class:'bk-shelf'});
      if(!L.length)sh.appendChild(el('span',{class:'bk-empty',text:'（空的）'}));
      L.forEach(b=>{const sp=el('button',{type:'button',class:'bk-book',style:`--c:${col(b.t)};height:${70+(b.t.length%4)*8}px`,title:b.t,html:`<span>${b.t}</span>`});
        sp.onclick=()=>{if(!TS()){toast(`《${b.t}》${b.a?'・'+b.a:''}`);return;}const ch=ST.filter(x=>x[0]!==b.s).map(([kk,ll])=>({label:`移到「${ll}」`,fn:()=>{b.s=kk;b.d=TDAY();tlSave();if(kk==='done'){CB.tab='rd';CB.pre=b.t;toast('讀完了！寫一篇閱讀日記吧');}renderCabin();}}));
          ch.push({label:'從書櫃拿掉',fn:()=>{SH.splice(SH.indexOf(b),1);tlSave();renderCabin();}},{label:'不用了',fn:null});closeCabin();choose(`《${b.t}》`,b.a?`作者：${b.a}`:'要把這本書移到哪裡？',ch.map(c=>({label:c.label,fn:()=>{c.fn&&c.fn();openCabin(CB.tab);}})));};sh.appendChild(sp);});
      card([el('b',{text:`${l}　${L.length} 本`}),sh],'bk-card');});
    card([el('p',{class:'help',text:TS()?'點書背可以移動或拿掉。「想買」只有老師看得到；「正在讀、想讀、讀完了」學生來小屋時看得到。':'這是老師的書櫃，點書背可以看書名。'})]);}
  else if(CB.tab==='wo'){const run=WO.run;
    const tm=el('div',{class:'wo-time'},[el('b',{id:'woT',text:run?fmtT(woEl()).replace(/^(\d\d):/,'$1:'):'00:00'}),el('small',{text:run?`${EX_IC[WO.what]} ${WO.what}中…`:'準備好就按開始'})]);
    const kids=[tm];if(!run)kids.push(el('b',{text:'今天要做什麼運動？'}),cbChips(Object.keys(EX_IC).map(k=>[k,`${EX_IC[k]} ${k}`]),WO.what,v=>WO.what=v,'cb-types'));
    kids.push(run?el('div',{class:'cb-row'},[el('button',{type:'button',class:'btn primary cb-go',text:'結束並記錄',onclick:()=>woFinish(true)}),el('button',{type:'button',class:'btn small',text:'取消',onclick:()=>woFinish(false)})]):
      el('button',{type:'button',class:'btn primary cb-go',text:'開始運動',onclick:()=>{WO.run=true;WO.start=Date.now();woStore();audioInit&&audioInit();toast('開始計時！手機可以放著，回來再按結束');renderCabin();}}));
    kids.push(el('p',{class:'help',text:'計時會一直跑，就算關掉畫面也會記得開始的時間。運動 1 分鐘 = 1 金幣，每天最多 60 金幣；寫閱讀日記每篇 20 金幣（每天最多 40）；番茄鐘每顆 10 金幣。'}));
    card(kids,'cb-form wo-card');}
  else if(CB.tab==='ex'){const wk=exWeek(),tot=wk.reduce((s,d)=>s+d.min,0),mx=Math.max(30,...wk.map(d=>d.min)),today=TDAY();
    card([el('div',{class:'cb-stats'},[el('div',{},[el('b',{text:String(tot)}),el('small',{text:'本週分鐘'})]),el('div',{},[el('b',{text:String(exStreak())}),el('small',{text:'連續天數'})]),el('div',{},[el('b',{text:String(TL.ex.length)}),el('small',{text:'總紀錄'})])]),
      tot?el('div',{class:'cb-bars'},wk.map(d=>el('div',{class:'cb-bar'+(d.k===today?' today':'')},[el('i',{text:d.min?String(d.min):''}),el('span',{style:`height:${Math.max(4,d.min/mx*100)}%`}),el('small',{text:d.lab})]))):el('p',{class:'cb-empty',text:TS()?'這週還沒有運動紀錄。今天動一動，第一根長條就會出現！':'老師這週還沒有記錄運動。'})]);
    if(TS()){const F={d:TDAY(),min:30,what:'跑步'};const d=cbIn('date',F.d);d.onchange=()=>F.d=d.value;const m=cbIn('number','30',{min:'1',max:'600',inputmode:'numeric',class:'nb-in cb-num'});
      m.oninput=()=>{F.min=+m.value;mins.querySelectorAll('.cb-chip').forEach(x=>x.setAttribute('aria-pressed',String(x.textContent===m.value)));};
      const mins=cbChips([[15,'15'],[30,'30'],[45,'45'],[60,'60']],30,v=>{F.min=v;m.value=v;},'cb-mins');const n=cbIn('text','',{placeholder:'一句心得（可不填）',maxlength:'60'});
      card([el('b',{text:'今天動了多久？'}),el('div',{class:'cb-row'},[mins,m,el('span',{class:'nb-meta',text:'分'})]),cbChips(Object.keys(EX_IC).map(k=>[k,`${EX_IC[k]} ${k}`]),F.what,v=>F.what=v,'cb-types'),
        el('div',{class:'cb-row'},[d,n]),el('button',{type:'button',class:'btn primary cb-go',text:'記錄',onclick:()=>{const min=Math.round(+F.min||+m.value);if(!(min>0)){toast('請輸入分鐘數');return;}
          TL.ex.push({d:F.d||TDAY(),min,what:F.what,note:n.value.trim()});TL.ex.sort((a,b)=>a.d<b.d?-1:1);tlSave();{const a=tReward('ex',min,`運動：${F.what} ${min} 分鐘`);toast(`記錄了 ${min} 分鐘的${F.what}！${rewText(a,'運動')}`);}renderCabin();}})],'cb-form');}
    const list=TL.ex.slice(-12).reverse();if(list.length){const c=card([el('b',{text:'最近的紀錄'})],'cb-list');list.forEach(e=>c.appendChild(cbRow(EX_IC[e.what]||'✨',`${e.what||'運動'} ${e.min} 分鐘`,fmtD(e.d)+(e.note?`・${e.note}`:''),TS()?()=>{TL.ex.splice(TL.ex.indexOf(e),1);tlSave();renderCabin();}:null)));}}
  else if(CB.tab==='wt'&&TS()){const A_=wtLoad();
    card([el('p',{class:'cb-lock',text:'🔒 只有老師看得到。體重只存在這台裝置，不會發布給學生。'})],'cb-private');
    if(A_.length>1){const pts=A_.slice(-30),mn=Math.min(...pts.map(p=>p.kg))-.5,mx=Math.max(...pts.map(p=>p.kg))+.5,w=360,h=120;
      const xy=pts.map((p,i)=>[14+i*(w-28)/Math.max(1,pts.length-1),h-14-(p.kg-mn)/(mx-mn)*(h-34)]);const diff=pts[pts.length-1].kg-pts[0].kg;
      const svg=`<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="體重趨勢"><path d="M${xy.map(p=>p.join(',')).join(' L')} L${xy[xy.length-1][0]},${h} L${xy[0][0]},${h}Z" fill="rgba(232,207,138,.12)"/><polyline fill="none" stroke="#e8cf8a" stroke-width="2.5" stroke-linejoin="round" points="${xy.map(p=>p.join(',')).join(' ')}"/>${xy.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#e8cf8a"><title>${pts[i].d} ${pts[i].kg} kg</title></circle>`).join('')}</svg>`;
      const c=card([el('div',{class:'cb-stats'},[el('div',{},[el('b',{text:String(pts[pts.length-1].kg)}),el('small',{text:'最新 kg'})]),el('div',{},[el('b',{text:(diff>0?'+':'')+diff.toFixed(1)}),el('small',{text:`${pts.length} 筆的變化`})])])]);const box=el('div');box.innerHTML=svg;c.appendChild(box);}
    const d=cbIn('date',TDAY()),kg=cbIn('number',A_.length?A_[A_.length-1].kg:'',{step:'0.1',min:'20',max:'250',inputmode:'decimal',class:'nb-in cb-num'});
    card([el('b',{text:'記錄體重'}),el('div',{class:'cb-row'},[d,kg,el('span',{class:'nb-meta',text:'kg'})]),el('button',{type:'button',class:'btn primary cb-go',text:'記錄',onclick:()=>{const v=Math.round(+kg.value*10)/10;if(!(v>20)){toast('請輸入體重');return;}
      const a=wtLoad().filter(x=>x.d!==(d.value||TDAY()));a.push({d:d.value||TDAY(),kg:v});a.sort((x,y)=>x.d<y.d?-1:1);wtSave(a);toast('已記錄（只存在這台裝置）');renderCabin();}})],'cb-form');
    if(A_.length){const c=card([el('b',{text:'最近的紀錄'})],'cb-list');A_.slice(-8).reverse().forEach(x=>c.appendChild(cbRow('⚖️',`${x.kg} kg`,fmtD(x.d),()=>{wtSave(wtLoad().filter(y=>y.d!==x.d));renderCabin();})));}}
  else if(CB.tab==='rd'){
    if(TS()){const d=cbIn('date',TDAY()),bk=cbIn('text',CB.pre||'',{placeholder:'書名',maxlength:'40'});CB.pre='';const _x=0,pg=cbIn('number','',{placeholder:'頁數',min:'0',inputmode:'numeric',class:'nb-in cb-num'}),n=cbIn('textarea','',{placeholder:'今天的心得，或喜歡的一句話',maxlength:'200'});
      card([el('b',{text:'寫閱讀日記'}),bk,el('div',{class:'cb-row'},[d,pg]),n,el('button',{type:'button',class:'btn primary cb-go',text:'記錄',onclick:()=>{const b=bk.value.trim();if(!b){toast('請輸入書名');return;}
        TL.reads.push({d:d.value||TDAY(),book:b,pages:+pg.value||0,note:n.value.trim()});TL.reads.sort((a,c)=>a.d<c.d?-1:1);tlSave();{const a=tReward('rd',20,`閱讀日記：《${b}》`);toast(`寫好了！${rewText(a,'閱讀')}`);}renderCabin();}})],'cb-form');}
    const list=TL.reads.slice(-12).reverse();if(!list.length)card([el('p',{class:'cb-empty',text:TS()?'還沒有閱讀日記。':'老師還沒有發布閱讀日記。'})]);
    list.forEach(r=>{const c=card([el('div',{class:'cb-book'},[el('span',{class:'cb-spine'}),el('div',{},[el('b',{text:r.book}),el('small',{text:fmtD(r.d)+(r.pages?`・${r.pages} 頁`:'')})])]),r.note?el('p',{class:'cb-quote',text:r.note}):null],'cb-read');
      if(TS())c.appendChild(el('button',{type:'button',class:'cb-del','aria-label':'刪除',text:'×',onclick:()=>{TL.reads.splice(TL.reads.indexOf(r),1);tlSave();renderCabin();}}));});}
  else if(CB.tab==='plan'){const pl=TL.plan;const mine=new Set((W.reads||[]).map(r=>String(r.book).trim())).size;
    card([el('b',{text:`📚 ${pl.title}`}),el('span',{class:'nb-meta',text:`目標：每人讀 ${pl.goal} 本書`}),pl.note?el('p',{text:pl.note}):null]);
    if(!TS()){const k=Math.min(1,mine/Math.max(1,pl.goal));card([el('b',{text:`你已經讀了 ${mine} / ${pl.goal} 本`}),el('div',{class:'cb-prog'},[el('span',{style:`width:${k*100}%`})]),el('p',{text:'在公告板的「閱讀紀錄」寫下讀過的書，就會算進來喔！'})]);}
    if(pl.books.length)card([el('b',{text:'老師推薦的書'}),...pl.books.map(b=>el('p',{text:`・${b}`}))]);
    if(TS()){const ti=cbIn('text',pl.title,{maxlength:'30'}),go=cbIn('number',pl.goal,{min:'1',max:'200',inputmode:'numeric'}),bk=cbIn('textarea',pl.books.join('\n'),{placeholder:'推薦書單，一行一本'}),nt=cbIn('textarea',pl.note,{placeholder:'給全班的話（可不填）'});
      card([el('b',{text:'設定閱讀計畫'}),ti,el('div',{class:'cb-row'},[el('span',{class:'nb-meta',text:'每人目標'}),go,el('span',{class:'nb-meta',text:'本'})]),bk,nt,
        el('button',{type:'button',class:'btn primary small',text:'儲存計畫',onclick:()=>{pl.title=ti.value.trim()||'全班閱讀計畫';pl.goal=Math.max(1,Math.round(+go.value)||10);pl.books=bk.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30);pl.note=nt.value.trim();tlSave();toast('閱讀計畫已更新');renderCabin();}}),
        el('p',{class:'help',text:'目前每位學生在自己的平板上看到自己的進度。等小鎮換成雲端存檔（Firebase）後，這裡就能看到全班即時統計。'})]);}}
  else if(CB.tab==='pom'){const left=POM.run?Math.max(0,(POM.end-Date.now())/1000):POM.left;const k=left/POM.len;
    const ring=el('div',{class:'cb-pom'});ring.innerHTML=`<svg viewBox="0 0 120 120" width="180" height="180"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(243,234,217,.12)" stroke-width="9"/><circle id="pomArc" cx="60" cy="60" r="52" fill="none" stroke="${POM.mode==='focus'?'#e0563a':'#6fb56a'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${2*PI*52}" stroke-dashoffset="${2*PI*52*(1-k)}" transform="rotate(-90 60 60)"/></svg><div class="cb-pom-t"><b id="pomT">${fmtT(left)}</b><small>${POM_MODES[POM.mode][0]}</small></div>`;
    const modes=el('div',{class:'cb-row'},[['focus',25],['short',5],['long',15]].map(([m,mn])=>el('button',{type:'button',class:'btn small'+(POM.mode===m?' primary':''),text:`${POM_MODES[m][0]} ${mn}`,onclick:()=>{pomSet(m,mn);renderCabin();}})));
    const task=cbIn('text',POM.task,{placeholder:'這顆番茄要完成什麼任務？',maxlength:'40'});task.addEventListener('input',()=>{POM.task=task.value;pomStore();});
    const today=TS()?(+TL.pom[TDAY()]||0):(+(W.pomo||{})[TDAY()]||0);
    card([ring,modes,task,el('div',{class:'cb-row'},[el('button',{type:'button',class:'btn primary',text:POM.run?'暫停':'開始專注',onclick:()=>{pomToggle();renderCabin();}}),el('button',{type:'button',class:'btn small',text:'重設',onclick:()=>{pomSet(POM.mode,Math.round(POM.len/60));renderCabin();}})]),
      el('p',{text:`今天完成 ${today} 顆番茄 ${'🍅'.repeat(Math.min(today,12))}`+(TS()?`（本週 ${pomWeek()} 顆，學生會在成果牆看到）`:'')})],'cb-pomcard');}
  const foot=$('cbFoot');foot.innerHTML='';
  if(TS()){const st=el('span',{class:'dc-coins',text:TL_DIRTY?'有新紀錄還沒發布給學生':'學生看到的是最新紀錄'});foot.appendChild(st);
    if(TL_DIRTY)foot.appendChild(el('button',{type:'button',class:'btn primary',text:'發布到小鎮',onclick:async e=>{const b=e.currentTarget;let art=null;try{if(window.claude&&typeof window.claude.use==='function')art=await window.claude.use('artifact');}catch(err){}
      if(!art){st.textContent='這個畫面不能發布，請在 Claude 裡用老師的帳號打開。';return;}b.disabled=true;st.textContent='發布中…';const cfg=JSON.parse(JSON.stringify(CFG));cfg.teacher=JSON.parse(JSON.stringify(TL));
      try{sessionStorage.setItem('shiomi-saved','1');}catch(err){}
      try{await artPublish(art,buildDoc(cfg));st.textContent='已發布！頁面會自動重新載入。';}catch(err){try{sessionStorage.removeItem('shiomi-saved');}catch(x){}b.disabled=false;const c=err&&err.code;st.textContent=c==='conflict'?'頁面剛更新過，重新載入後再發布一次。':`發布失敗（${c||err}）`;}}}));}
  else foot.appendChild(el('span',{class:'dc-coins',text:'老師的成果・以身作則'}));
  foot.appendChild(el('button',{type:'button',class:'btn',text:'關閉',onclick:closeCabin}));}
$('cbClose').onclick=closeCabin;
$('pomChip').onclick=()=>openCabin('pom');
{const c=document.createElement('button');c.type='button';c.id='woChip';c.hidden=true;c.onclick=()=>openCabin('wo');document.body.appendChild(c);}
function cabTick(dt){
  if(ANN.day&&ANN.day!==todayStr())drawAnn();if(ANN.g)ANN.g.visible=TS()&&!!annGet();
  if(CY.pathSign)CY.pathSign.visible=started&&(!!W.tcSeen||TS());
  if(WO.run&&started){const t=$('woT');if(t&&!$('cabin').hidden)t.textContent=fmtT(woEl());const c2=$('woChip');c2.hidden=!$('cabin').hidden;if($('cabin').hidden)c2.textContent=`${EX_IC[WO.what]||'🏃'} ${fmtT(woEl())} 運動中`;}else{const c2=$('woChip');if(c2)c2.hidden=true;}
  if(POM.run&&started){const left=Math.max(0,(POM.end-Date.now())/1000);if(left<=0)pomDone();
    if(!$('cabin').hidden&&CB.tab==='pom'){const t=$('pomT'),a=$('pomArc');if(t)t.textContent=fmtT(left);if(a)a.setAttribute('stroke-dashoffset',String(2*PI*52*(1-left/POM.len)));}}
  const chip=$('pomChip');const showChip=POM.run&&started&&($('cabin').hidden);chip.hidden=!showChip;if(showChip)chip.textContent=`🍅 ${fmtT(Math.max(0,(POM.end-Date.now())/1000))} ${POM_MODES[POM.mode][0]}中`;
  if(TC.dial)TC.dial.rotation.z=POM.run?-(1-Math.max(0,(POM.end-Date.now())/1000)/POM.len)*PI*2:0;
  if(TC.tom&&POM.run)TC.tom.rotation.z=Math.sin(time*18)*.02;
  if(TC_IN){LANTERN.color.setHex(0xffd6a0);LANTERN.distance=16;LANTERN.intensity=1.1;LANTERN.position.set(TCX,2.8,TCZ-.5);}}

/* ================================================================
   平等車站 (hub): start point after login; trains to home / 汐見町 / (部落, 其他小鎮 — under construction)
   ================================================================ */
const STX=200,STZ=330,ST_W=12,ST_D=7,ST_RH=3.6;var ST_IN=false;
const ST={};
(function(){const G=new T.Group();G.position.set(STX,0,STZ);scene.add(G);ST.g=G;const W_=ST_W/2,D_=ST_D/2,EXT=3.8,RH=ST_RH;
  const rep=(geo,u,v)=>{const a=geo.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,a.getX(i)*u,a.getY(i)*v);return geo;};
  const plaster=(()=>{const [c,g]=C2(256,256);g.fillStyle='#efe6d2';g.fillRect(0,0,256,256);speckle(g,256,256,2500,.05);return TX(c,true);})();
  const wainsc=(()=>{const [c,g]=C2(256,128);g.fillStyle='#7e5638';g.fillRect(0,0,256,128);for(let x=0;x<256;x+=32){g.fillStyle='rgba(40,25,15,.45)';g.fillRect(x,0,2,128);g.fillStyle='rgba(255,230,190,.08)';g.fillRect(x+4,0,10,128);}g.fillStyle='#5a3a24';g.fillRect(0,0,256,10);return TX(c,true);})();
  const tiles=(()=>{const [c,g]=C2(256,256);for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?'#c9b99a':'#ddd0b4';g.fillRect(x*64,y*64,64,64);}g.strokeStyle='rgba(90,70,50,.35)';g.lineWidth=2;for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke();}speckle(g,256,256,2000,.05);return TX(c,true);})();
  const em=(t,e=.14)=>new T.MeshLambertMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:e});
  const fg=rep(new T.PlaneGeometry(ST_W,ST_D+EXT),ST_W/2,(ST_D+EXT)/2);fg.rotateX(-PI/2);mk(fg,em(tiles,.12),0,0,EXT/2,G,false);
  const cg=new T.PlaneGeometry(ST_W,ST_D+EXT);cg.rotateX(PI/2);mk(cg,new T.MeshBasicMaterial({color:col('#6b5440')}),0,RH,EXT/2,G,false);
  for(let z=-D_;z<=D_+EXT;z+=2.2)mk(bx(ST_W,.2,.2),new T.MeshBasicMaterial({color:col('#4a3527')}),0,RH-.1,z,G,false);
  const wall=(w,x,z,ry)=>{const up=mk(rep(new T.PlaneGeometry(w,RH-1.1),w/2.4,(RH-1.1)/2.4),em(plaster,.16),x,1.1+(RH-1.1)/2,z,G,false);up.rotation.y=ry;
    const lo=mk(rep(new T.PlaneGeometry(w,1.1),w/2,1),em(wainsc,.12),x,.55,z,G,false);lo.rotation.y=ry;};
  wall(ST_W,0,-D_,0);wall(ST_D+EXT,-W_,EXT/2,PI/2);wall(ST_D+EXT,W_,EXT/2,-PI/2);
  // big window with mountain view (home feeling)
  const [vc,vg]=C2(512,256);const sk=vg.createLinearGradient(0,0,0,256);sk.addColorStop(0,'#7fb0d8');sk.addColorStop(.7,'#dcebf0');sk.addColorStop(1,'#f3e2c4');vg.fillStyle=sk;vg.fillRect(0,0,512,256);
  vg.fillStyle='rgba(255,255,255,.85)';[[90,50,40],[300,36,54],[430,70,30]].forEach(([x,y,r])=>{vg.beginPath();vg.ellipse(x,y,r*1.6,r*.5,0,0,7);vg.fill();});
  [['#8aa0b8',120,.6,0],['#5f7d6a',150,.9,2],['#3f5f4a',185,1.2,4],['#2f4a38',215,1.6,6]].forEach(([c,h,k,s])=>{vg.fillStyle=c;vg.beginPath();vg.moveTo(0,256);for(let x=0;x<=512;x+=8)vg.lineTo(x,h-Math.sin(x*.012*k+s)*34/k-Math.sin(x*.05+s)*10-Math.abs(Math.sin(x*.004+s))*30);vg.lineTo(512,256);vg.fill();});
  vg.fillStyle='rgba(255,255,255,.35)';vg.fillRect(0,230,512,26);
  const vt=TX(vc);mk(new T.PlaneGeometry(5.6,1.9),new T.MeshBasicMaterial({map:vt}),-2.4,2.1,-D_+.02,G,false);
  const frame=imat('#5a3a24',.3);[[0,1],[0,-1]].forEach(([_,s])=>mk(bx(5.8,.1,.1),frame,-2.4,2.1+s*1,-D_+.06,G,false));[-5.3,-3.35,-1.45,.5].forEach(x=>mk(bx(.1,2.1,.1),frame,x,2.1,-D_+.06,G,false));
  mk(bx(5.9,.08,.3),imat('#6e4c33',.3),-2.4,1.1,-D_+.15,G,false);
  // station name board
  const [nc,ng]=C2(512,160);ng.fillStyle='#f6f4ee';ng.fillRect(0,0,512,160);ng.fillStyle='#2f6b56';ng.fillRect(0,112,512,48);ng.fillStyle='#1c1c1c';ng.font=`800 70px ${FG}`;ng.textAlign='center';ng.textBaseline='middle';ng.fillText('平 等',256,52);
  ng.font=`500 20px ${FG}`;ng.fillText('Píngděng Station',256,95);ng.fillStyle='#f6f4ee';ng.font=`700 22px ${FG}`;ng.textAlign='left';ng.fillText('← 部落',16,137);ng.textAlign='right';ng.fillText('汐見町 →',496,137);
  const nbm=emMat(TX(nc),TX(nc),'signs');mk(new T.PlaneGeometry(2.4,.75),nbm,3.2,3.05,-D_+.03,G,false);
  // ticket window + station master
  mk(bx(3,1.05,.7),imat('#8a6446',.3),3.2,.52,-D_+.9,G);mk(bx(3.1,.06,.8),imat('#5a3a24',.3),3.2,1.07,-D_+.9,G);
  mk(new T.PlaneGeometry(2.8,1.1),new T.MeshLambertMaterial({color:col('#cfe4ec'),transparent:true,opacity:.28,depthWrite:false}),3.2,1.7,-D_+.56,G,false);
  [1.7,4.7].forEach(x=>mk(bx(.08,1.2,.08),frame,x,1.66,-D_+.56,G,false));mk(bx(3.1,.1,.1),frame,3.2,2.3,-D_+.56,G,false);
  const [kc,kg]=C2(256,64);kg.fillStyle='#2f6b56';kg.fillRect(0,0,256,64);kg.fillStyle='#fff';kg.font=`700 30px ${FG}`;kg.textAlign='center';kg.textBaseline='middle';kg.fillText('售票・服務台',128,34);
  mk(new T.PlaneGeometry(1.4,.35),emMat(TX(kc),TX(kc),'signs'),3.2,2.52,-D_+.56,G,false);
  addCol(STX+1.65,STX+4.75,STZ-D_,STZ-D_+1.3,2);
  {const tt=(title,sub,rows,colr)=>{const [c,x]=C2(256,300);x.fillStyle='#f7f3ea';x.fillRect(0,0,256,300);x.fillStyle=colr;x.fillRect(0,0,256,54);x.fillStyle='#fff';x.font=`800 24px ${FG}`;x.textAlign='center';x.textBaseline='middle';x.fillText(title,128,20);x.font=`500 15px ${FG}`;x.fillText(sub,128,42);
      x.textAlign='left';rows.forEach((r,i)=>{const y=76+i*22;x.fillStyle=i%2?'#efe8da':'#f7f3ea';x.fillRect(8,y-11,240,22);x.fillStyle='#3a2a20';x.font=`800 17px ${FG}`;x.fillText(r[0],18,y+1);x.font=`500 16px ${FG}`;x.fillStyle=r[2]||'#3a2a20';x.fillText(r[1],62,y+1);});
      x.strokeStyle='#5a3a24';x.lineWidth=6;x.strokeRect(3,3,250,294);return TX(c);};
    const A_=tt('時刻表','汐見町方面',[['07','05　35'],['08','05　40'],['09','10'],['10','10'],['12','10'],['13','15　45'],['15','10　40'],['16','10　40'],['17','10'],['18','20'],['','（每班 10 分鐘就到）','#8a6a4a']],'#2f6b56');
    const B_=tt('時刻表','部落方面',[['07','— —'],['09','— —'],['12','— —'],['15','— —'],['17','— —'],['',''],['','🚧 鐵軌鋪設中','#b8452f'],['','敬請期待','#b8452f']],'#8a6446');
    [[1.95,A_],[4.45,B_]].forEach(([x,t])=>{mk(bx(.8,.93,.04),imat('#5a3a24',.3),x,1.72,-D_+.03,G,false);mk(new T.PlaneGeometry(.74,.87),new T.MeshBasicMaterial({map:t,toneMapped:false}),x,1.72,-D_+.055,G,false);});
    inter(new T.Vector3(STX+4.4,0,STZ-D_+1.9),1.1,'看時刻表',()=>say('時刻表',['汐見町方面：早上 7 點到晚上 6 點，每小時都有車，坐 10 分鐘就到。','Sqoyaw 方面：隨時都有車，坐一下就到。','要搭車請跟站務員拿車票喔。']));}
  ST.master={g:new T.Group()};npcSprite('guard',ST.master,new T.Vector3(STX+3.2,.38,STZ-D_+.35),0,1.7,{indoor:true,face:5});
  // destination board (departures)
  const [dc,dg]=C2(512,320);ST.depCanvas=dc;ST.depTex=TX(dc);
  mk(bx(2.5,1.6,.08),imat('#2a2a30',.2),W_-.06,2.3,-.4,G,false).rotation.y=-PI/2;const dep=mk(new T.PlaneGeometry(2.36,1.48),new T.MeshBasicMaterial({map:ST.depTex}),W_-.11,2.3,-.4,G,false);dep.rotation.y=-PI/2;
  // gate to platform (right wall door)
  mk(new T.PlaneGeometry(1.5,2.4),new T.MeshBasicMaterial({color:col('#1a1c22')}),W_-.02,1.2,1.7,G,false).rotation.y=-PI/2;
  const dl=mk(new T.PlaneGeometry(1.5,2.4),new T.MeshBasicMaterial({color:col('#bfe0f0'),transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false}),W_-.04,1.2,1.7,G,false);dl.rotation.y=-PI/2;
  [[.95],[2.45]].forEach(([z])=>mk(bx(.12,2.5,.12),frame,W_-.08,1.25,z,G,false));mk(bx(.12,.12,1.6),frame,W_-.08,2.45,1.7,G,false);
  const [gc,gg]=C2(256,64);gg.fillStyle='#2f6b56';gg.fillRect(0,0,256,64);gg.fillStyle='#fff';gg.font=`700 30px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText('月台  ➜',128,34);
  const gs=mk(new T.PlaneGeometry(1.1,.28),emMat(TX(gc),TX(gc),'signs'),W_-.06,2.72,1.7,G,false);gs.rotation.y=-PI/2;
  // ticket gates (two small posts)
  [.9,2.5].forEach(z=>{mk(bx(.9,.95,.22),imat('#c9c1b0',.35),W_-1.3,.47,z,G);mk(bx(.3,.05,.18),imat('#3f7d5a',.4),W_-1.3,.97,z,G,false);addCol(STX+W_-1.75,STX+W_-.85,STZ+z-.11,STZ+z+.11,1.2);});
  // benches
  [[-3.4,.5],[-3.4,2.1]].forEach(([x,z])=>{mk(bx(3,.08,.5),imat('#b08a5e',.3),x,.45,z,G);mk(bx(3,.45,.06),imat('#b08a5e',.3),x,.72,z+.24,G);[-1.3,1.3].forEach(dx=>mk(bx(.06,.45,.45),imat('#45484d',.3),x+dx,.22,z,G));addCol(STX+x-1.5,STX+x+1.5,STZ+z-.28,STZ+z+.3,1);});
  // notice board (left wall) + clock + plant + poster
  mk(bx(.08,1.2,1.8),imat('#8a6446',.3),-W_+.06,1.8,-1.2,G,false);const [pc,pg]=C2(256,170);pg.fillStyle='#e8dcbe';pg.fillRect(0,0,256,170);
  [['#f7f2e8',20,24,90,60],['#ffe9a8',130,30,100,52],['#f7f2e8',40,100,110,52],['#d9e8f7',160,94,76,60]].forEach(([c,x,y,w,h])=>{pg.fillStyle=c;pg.fillRect(x,y,w,h);pg.fillStyle='#c8432b';pg.beginPath();pg.arc(x+w/2,y+4,4,0,7);pg.fill();pg.fillStyle='rgba(60,50,40,.5)';for(let k=0;k<3;k++)pg.fillRect(x+8,y+16+k*11,w-16,3);});
  const bp=mk(new T.PlaneGeometry(1.7,1.12),new T.MeshLambertMaterial({map:TX(pc),emissive:0xffffff,emissiveMap:TX(pc),emissiveIntensity:.2}),-W_+.11,1.8,-1.2,G,false);bp.rotation.y=PI/2;
  const [lc,lg]=C2(256,48);lg.fillStyle='#b8452f';lg.fillRect(0,0,256,48);lg.fillStyle='#fff3dd';lg.font=`700 26px ${FG}`;lg.textAlign='center';lg.textBaseline='middle';lg.fillText('班級公告',128,26);
  const lb=mk(new T.PlaneGeometry(.9,.17),new T.MeshBasicMaterial({map:TX(lc)}),-W_+.11,2.55,-1.2,G,false);lb.rotation.y=PI/2;
  mk(cy(.3,.3,.06,24),imat('#f7f2e8',.45),.9,3.0,-D_+.05,G,false).rotation.x=PI/2;const hh=mk(bx(.03,.16,.01),imat('#222',.2),.9,3.05,-D_+.09,G,false);const mh=mk(bx(.02,.23,.01),imat('#222',.2),.9,3.08,-D_+.1,G,false);ST.hands=[hh,mh];
  mk(cy(.22,.17,.42,10),imat('#9a5e42',.3),-W_+.5,.21,-D_+.5,G);for(let i=0;i<6;i++){const f=mk(ico(.22+rand()*.08,0),imat(pick(['#557a4f','#4b6f47','#62855a']),.3),-W_+.5+rr(-.12,.12),.66+i*.12,-D_+.5+rr(-.12,.12),G);f.scale.y=1.3;}addCol(STX-W_,STX-W_+.8,STZ-D_,STZ-D_+.8,2);
  const [oc,og]=C2(160,224);const gr=og.createLinearGradient(0,0,0,224);gr.addColorStop(0,'#26376a');gr.addColorStop(.55,'#f6a06a');gr.addColorStop(1,'#1a2d4a');og.fillStyle=gr;og.fillRect(0,0,160,224);og.fillStyle='#ffe9c0';og.beginPath();og.arc(80,122,20,0,7);og.fill();og.fillStyle='#2a1f2c';og.fillRect(0,150,160,74);og.fillStyle='#f3ead9';og.font=`700 22px ${FG}`;og.textAlign='center';og.fillText('海邊小鎮',80,36);og.font=`800 30px ${FG}`;og.fillText('汐見町',80,72);og.font=`500 15px ${FG}`;og.fillText('搭火車就到了！',80,200);
  const po=mk(new T.PlaneGeometry(.72,1.0),new T.MeshBasicMaterial({map:TX(oc)}),-W_+.11,1.9,1.4,G,false);po.rotation.y=PI/2;
  // exit mat hint
  const [ec,eg]=C2(256,64);eg.fillStyle='#2f6b56';eg.fillRect(0,0,256,64);eg.fillStyle='#fff';eg.font=`700 26px ${FG}`;eg.textAlign='center';eg.textBaseline='middle';eg.fillText('剪票口 → 月台',128,34);
  const em_=mk(new T.PlaneGeometry(1.4,.35),new T.MeshBasicMaterial({map:TX(ec)}),W_-2.4,.012,1.7,G,false);em_.rotation.x=-PI/2;em_.rotation.z=-PI/2;
  // outer colliders
  addCol(STX-W_-.3,STX-W_,STZ-D_,STZ+D_,4);addCol(STX+W_,STX+W_+.3,STZ-D_,STZ+D_,4);addCol(STX-W_,STX+W_,STZ-D_-.3,STZ-D_,4);addCol(STX-W_,STX+W_,STZ+D_,STZ+D_+.3,4);
  const P_=(x,z)=>new T.Vector3(STX+x,0,STZ+z);
  inter(P_(3.2,-D_+1.8),1.4,'和站務員說話',()=>stationTalk());
  inter(P_(W_-.9,1.7),1.5,'剪票口',()=>{if(ST.ticket){const d=ST.ticket;ST.ticket=null;goDest(d);}else say('剪票口',['嗶——','請先到「售票・服務台」問站務員，要搭往哪裡的車喔！']);});
  inter(P_(W_-.9,-.4),1.4,'看發車時刻表',()=>say('發車時刻表',[DESTS().map(d=>`${d.ic} ${d.name}　${d.open?'搭乘中':'施工中'}`).join('\n'),'想搭車的話，請到售票・服務台問站務員。回家不用搭車，從左邊的出口走出去就到了。']));
  inter(P_(-W_+.9,-1.2),1.5,'看班級公告',()=>openBoard('news'));
  {const dm2=mk(new T.PlaneGeometry(1.5,2.4),new T.MeshBasicMaterial({color:col('#f3e6c8')}),-W_+.02,1.2,2.3,G,false);dm2.rotation.y=PI/2;
    ST.exitM=[dm2,...[[1.55],[3.05]].map(([z])=>mk(bx(.12,2.5,.12),frame,-W_+.08,1.25,z,G,false)),mk(bx(.12,.12,1.6),frame,-W_+.08,2.45,2.3,G,false)];
    const [xc,xg]=C2(256,64);xg.fillStyle='#b8452f';xg.fillRect(0,0,256,64);xg.fillStyle='#fff';xg.font=`700 28px ${FG}`;xg.textAlign='center';xg.textBaseline='middle';xg.fillText('← 出口・回家',128,34);
    const xs=mk(new T.PlaneGeometry(1.1,.28),emMat(TX(xc),TX(xc),'signs'),-W_+.06,2.72,2.3,G,false);xs.rotation.y=PI/2;ST.exitM.push(xs);
    inter(P_(-W_+.9,2.3),1.5,'走出車站・回家',()=>{HOME.from='station';enterHome();},{hide:()=>TS()});}
  inter(P_(-3.4,1.2),1.2,'坐在長椅上',()=>say('長椅',['窗外的山好近。風從月台吹進來，有一點涼。']));inkify(G);})();
function drawDepBoard(){const g=ST.depCanvas.getContext('2d');g.fillStyle='#15171c';g.fillRect(0,0,512,320);g.fillStyle='#f2c14e';g.font=`700 30px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('發車時刻 Departures',20,34);
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(16,58,480,2);
  DESTS().forEach((d,i)=>{const y=92+i*56;g.fillStyle=d.open?'#e8f0ff':'#7a808c';g.font=`700 30px ${FG}`;g.fillText(`${d.ic} ${d.name}`,24,y);g.textAlign='right';g.font=`600 22px ${FG}`;g.fillStyle=d.open?'#7fe0a0':'#e0a060';g.fillText(d.open?'搭乘中':'施工中',490,y);g.textAlign='left';});
  ST.depTex.needsUpdate=true;}
function DESTS(){const L=[{id:'town',ic:'🌊',name:'汐見町',open:true},{id:'tribe',ic:'⛰️',name:'Sqoyaw 環山',open:true},{id:'other',ic:'🏙️',name:'其他小鎮',open:false}];
  if(TS())L.push({id:'cabin',ic:'🏡',name:'老師的小屋（老師專用）',open:true});return L;}
function chooseDest(){choose('站務員','要去哪裡呢？我幫你開車票。',[...DESTS().map(d=>({label:`${d.ic} ${d.name}${d.open?'':'（施工中）'}`,fn:()=>{if(!d.open){goDest(d);return;}ST.ticket=d;SND.register&&SND.register();say('站務員',[`往「${d.name.replace(/（.*?）/,'')}」的車票，拿好喔！`,'從右邊的剪票口進去就能搭車。'],{onEnd:()=>toast('🎫 拿到車票了！到右邊的剪票口按 E')});}})),{label:'先不要',fn:null}]);}
function goDest(d){if(!d.open){say('站務員',[d.id==='tribe'?'往部落的路線還在鋪鐵軌喔！老師正在準備，完成後就能回到部落探險。':'其他小鎮的路線還在規劃中，敬請期待！']);return;}
  if(d.id==='home'){HOME.from='station';enterHome();}
  else if(d.id==='town')trainRide('汐見町',()=>arriveShiomi());
  else if(d.id==='tribe')trainRide('Sqoyaw',()=>arriveTribe(),'🚌');
  else if(d.id==='cabin'){trainRide('汐見町',()=>{leaveStation();enterCabinDirect();});}}
function stationTalk(){if(TS()){say('站務員',['老師好！今天要去哪裡呢？'],{onEnd:()=>chooseDest()});return;}const first=!W.stSeen;W.stSeen=true;save();
  say('站務員',first?[`${W.name||''}，你好！歡迎來到平等車站。`,'你就是今天要去汐見町找印章的孩子吧？燈塔等你很久了。','這裡是大家出發的地方。要搭火車，先來這裡拿車票，再從右邊的剪票口進去。','想回家的話，不用車票，從左邊的「出口」走出去就到家了！','牆上的「班級公告」有老師的最新消息，記得看一看。']:[pick([`${W.name||''}，今天要去哪裡呢？`,'火車準時發車喔！','闖關累了就回家休息一下吧。'])],{onEnd:()=>chooseDest()});}
function enterStation(opts={}){const fromHome=HOME_IN;const go=()=>{INDOOR=true;ST_IN=true;HOME_IN=false;$('homeBar').hidden=true;P.sit=null;P.pos.set(STX-1,0,STZ+2.4);P.vel.set(0,0,0);P.yaw=PI;cam.yaw=0;cam.pos.set(STX,3,STZ+6.5);cam.look.set(STX,.5,STZ);
  curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(STX,0,STZ+2.6);PETOBJ.by=0;}drawDepBoard();SND.chime&&SND.chime();
  (ST.exitM||[]).forEach(m=>m.visible=!TS());s2Enter(fromHome?'home':null);
  if(opts.login&&!TS()&&!W.introSeen){setTimeout(()=>playOpening(),350);}
  else if(opts.login){if(!W.stSeen)setTimeout(()=>stationTalk(),900);else setTimeout(()=>toast(`${W.name||''}，歡迎回到平等車站！`),700);}};
  if(opts.now)go();else fadeTo(go);}
function leaveStation(){ST_IN=false;INDOOR=false;s2Off();}
// ---- train ride overlay (window view scrolling by)
(function(){const mkLayer=(w,h,draw)=>{const [c,g]=C2(w,h);draw(g,w,h);return c.toDataURL('image/png');};
  const far=mkLayer(1024,300,(g,w,h)=>{g.fillStyle='#7d95ad';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,150-Math.sin(x*.006)*40-Math.sin(x*.021)*18-(x<w/2?0:0));g.lineTo(w,h);g.fill();});
  const mid=mkLayer(1024,300,(g,w,h)=>{g.fillStyle='#3f6a50';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,210-Math.sin(x*.012+1)*30-Math.sin(x*.043)*10);g.lineTo(w,h);g.fill();
    for(let i=0;i<40;i++){const x=(i*97)%w,y=200+((i*53)%40);g.fillStyle='#2f5040';g.beginPath();g.moveTo(x,y-40);g.lineTo(x-14,y+10);g.lineTo(x+14,y+10);g.fill();}});
  const near=mkLayer(1024,300,(g,w,h)=>{g.fillStyle='#2a3a2c';g.fillRect(0,262,w,38);for(let x=40;x<w;x+=256){g.fillStyle='#3a3530';g.fillRect(x,40,8,230);g.fillRect(x-30,50,68,6);}g.strokeStyle='rgba(20,20,20,.6)';g.lineWidth=2;g.beginPath();for(let x=0;x<=w;x+=4){const k=(x%256)/256;g.lineTo(x,58+Math.sin(k*PI)*18);}g.stroke();});
  const poles=mkLayer(1024,300,(g,w,h)=>{for(let x=120;x<w;x+=512){g.fillStyle='#2a221c';g.fillRect(x,0,14,300);g.fillRect(x-40,24,94,8);}g.strokeStyle='rgba(30,25,20,.7)';g.lineWidth=2;for(const y0 of [34,52]){g.beginPath();for(let x=0;x<=w;x+=4){const k=((x-127)%512+512)%512/512;g.lineTo(x,y0+Math.sin(k*PI)*26);}g.stroke();}});
  const d=document.createElement('div');d.id='ride';d.hidden=true;d.innerHTML=`<div class="rd-car"><div class="rd-strap s1"></div><div class="rd-strap s2"></div><div class="rd-strap s3"></div><div class="rd-wins"><div class="rd-win"><div class="rd-sky"></div><div class="rd-sun"></div><div class="rd-l" style="background-image:url(${far});--sp:16s"></div><div class="rd-l" style="background-image:url(${mid});--sp:7s"></div><div class="rd-l" style="background-image:url(${near});--sp:1.8s"></div><div class="rd-l" style="background-image:url(${poles});--sp:.9s"></div><div class="rd-frame"></div></div><div class="rd-win b"><div class="rd-sky"></div><div class="rd-l" style="background-image:url(${far});--sp:16s;animation-delay:-5s"></div><div class="rd-l" style="background-image:url(${mid});--sp:7s;animation-delay:-2s"></div><div class="rd-l" style="background-image:url(${near});--sp:1.8s;animation-delay:-.6s"></div><div class="rd-l" style="background-image:url(${poles});--sp:.9s;animation-delay:-.3s"></div><div class="rd-frame"></div></div></div><div class="rd-seat"></div></div><div class="rd-sign"><span class="rd-next">次は</span><b class="rd-dest"></b></div><p class="rd-t"></p>`;document.body.appendChild(d);})();
function trainRide(dest,then,ic='🚃'){if(DLG.open)closeDlg();const r=$('ride');fadeTo(()=>{r.hidden=false;r.querySelector('.rd-t').textContent=`${ic} 開往 ${dest}……`;r.querySelector('.rd-dest').textContent=dest;r.classList.remove('out');
  if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<8;i++){nburst(t+i*.34,.12,'lowpass',260,.8,.35,A.sfx);nburst(t+i*.34+.12,.1,'lowpass',240,.8,.25,A.sfx);}}
  setTimeout(()=>{r.classList.add('out');setTimeout(()=>{fadeTo(()=>{r.hidden=true;then();});},300);},2600);});}
function arriveShiomi(){leaveStation();HOME_IN=false;$('homeBar').hidden=true;P.sit=null;P.pos.set(46,.9,-34.2);P.vel.set(0,0,0);P.yaw=-PI/2;cam.yaw=PI/2+.35;cam.pitch=.2;cam.pos.set(51,3,-35.8);cam.look.set(46,1.9,-34.2);
  TRAIN.x=48;TRAIN.dir=TRAIN.dir||1;TRAIN.state='stop';TRAIN.stopT=5;TRAIN.v=0;if(PETOBJ){PETOBJ.g.position.set(47,.9,-34.6);PETOBJ.by=.9;}curArea=null;areaCoolReset();
  SND.chime&&SND.chime();if(!W.shSeen&&!TS()){W.shSeen=true;save();setTimeout(()=>say('汐見町',[`${W.name||''}，歡迎來到汐見町！`,'鎮上有六個地方藏著印章的線索，頭上有圖示的鎮民會出題考你。','答對題目，就能把印章一枚一枚找回來。先從月台左邊的斜坡走下去看看吧！']),900);}else setTimeout(()=>toast('汐見駅到了！出口在月台左邊的斜坡，小心別靠近鐵軌'),600);}
inter(new T.Vector3(52,.9,-34.3),1.7,'搭火車回平等車站',()=>choose('汐見駅','要搭火車回平等車站嗎？',[{label:'回平等車站',fn:()=>trainRide('平等',()=>enterStation({now:true}))},{label:'再逛一下',fn:null}]));

/* ================================================================
   留言板 (student home + teacher cabin), cabin decor, anniversary frame, story intro,
   station fixes, Excel question import
   ================================================================ */
const TPHOTOS=(()=>{try{return JSON.parse(document.getElementById('tphotos').textContent);}catch(e){return [];}})();
// ---------- message panel (shared)
(function(){const d=document.createElement('div');d.id='msgp';d.hidden=true;d.innerHTML='<div class="dc-in"><div class="dc-head"><div><p class="card-kicker" id="mpKick">留言板</p><h2 id="mpTitle">留言板</h2></div><button type="button" class="x" id="mpClose" aria-label="關閉">×</button></div><div id="mpBody"></div><div class="dc-foot"><span class="dc-coins" id="mpFoot"></span><button type="button" class="btn primary" id="mpDone">關閉</button></div></div>';document.body.appendChild(d);
  const c=()=>{d.hidden=true;cv.focus({preventScroll:true});};d.querySelector('#mpClose').onclick=c;d.querySelector('#mpDone').onclick=c;})();
function msgOpen(kick,title,render){if(DLG.open)closeDlg();$('mpKick').textContent=kick;$('mpTitle').textContent=title;const B=$('mpBody');B.innerHTML='';$('mpFoot').textContent='';render(B);$('msgp').hidden=false;}
function fmtDT(t){const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function boardTex(title,sub,colr){const [c,g]=C2(256,192);g.fillStyle='#8a6446';g.fillRect(0,0,256,192);g.fillStyle='#c9a67a';g.fillRect(10,10,236,172);
  [['#fff8e0',26,44,90,60,-.06],['#ffe0e8',136,40,94,62,.05],['#e4f2ff',40,112,100,58,.04],['#fffbd0',150,114,82,56,-.05]].forEach(([cc,x,y,w,h,r])=>{g.save();g.translate(x+w/2,y+h/2);g.rotate(r);g.fillStyle=cc;g.fillRect(-w/2,-h/2,w,h);g.fillStyle='#d9573b';g.beginPath();g.arc(0,-h/2+5,4,0,7);g.fill();g.fillStyle='rgba(60,50,40,.45)';for(let k=0;k<3;k++)g.fillRect(-w/2+8,-h/2+16+k*11,w-16,3);g.restore();});
  g.fillStyle=colr||'#6e4c33';g.fillRect(0,0,256,34);g.fillStyle='#fff8ea';g.font=`700 22px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText(title,128,18);return TX(c);}
function msgBoard(parent,x,y,z,ry,title,colr){const gg=new T.Group();gg.position.set(x,y,z);gg.rotation.y=ry;parent.add(gg);[-.5,.5].forEach(px=>mk(cy(.05,.06,1.7,6),M.woodDark,px,.85,0,gg));
  mk(bx(1.2,.9,.06),M.woodDark,0,1.25,0,gg);mk(new T.PlaneGeometry(1.12,.84),new T.MeshLambertMaterial({map:boardTex(title,'',colr),emissive:0xffffff,emissiveMap:null,emissiveIntensity:.05}),0,1.25,.035,gg,false);
  mk(bx(1.35,.1,.2),lam('#5a3520'),0,1.74,0,gg);return gg;}
// ---------- board outside "my home" (town)
(function(){if(!HOME.townOut)return;const p=HOME.townOut,yaw=HOME.townYaw||0;const rx=Math.cos(yaw),rz=-Math.sin(yaw);const bx_=p.x+rx*1.9,bz=p.z+rz*1.9;
  msgBoard(scene,bx_,0,bz,yaw,'我家的留言板','#3d6ea8');addCol(bx_-.3,bx_+.3,bz-.3,bz+.3,2);
  inter(new T.Vector3(bx_+Math.sin(yaw)*.8,0,bz+Math.cos(yaw)*.8),1.4,()=>TS()?'學生家的留言板':'看我家的留言板',()=>openHomeBoard());})();
function myNotes(){const s=String(W.seat);return (CFG.notes||[]).filter(n=>n&&n.text&&(String(n.seat).trim()===s||/^(全班|all|\*)$/i.test(String(n.seat).trim())));}
async function publishCfg(mut,okMsg){let art=null;try{if(window.claude&&typeof window.claude.use==='function')art=await window.claude.use('artifact');}catch(e){}
  if(!art&&HOSTED&&TS()){const cfg=JSON.parse(JSON.stringify(CFG));mut(cfg);if(TL_DIRTY&&TL)cfg.teacher=JSON.parse(JSON.stringify(TL));
    try{await cfgPut(cfg);try{sessionStorage.setItem('shiomi-saved','1');}catch(x){}toast(okMsg||'已儲存！');setTimeout(()=>location.reload(),1200);return true;}catch(err){toast('儲存失敗，請確認網路再試一次');return false;}}
  if(!art){toast('這個畫面不能發布，請在 Claude 裡用老師的帳號打開');return false;}const cfg=JSON.parse(JSON.stringify(CFG));mut(cfg);if(TL_DIRTY&&TL)cfg.teacher=JSON.parse(JSON.stringify(TL));
  try{sessionStorage.setItem('shiomi-saved','1');}catch(e){}try{await artPublish(art,buildDoc(cfg));toast(okMsg||'已發布！');return true;}catch(err){try{sessionStorage.removeItem('shiomi-saved');}catch(x){}toast(`發布失敗（${err&&err.code||err}）`);return false;}}
function teacherHomeBoard(seat){const seats=new Set(allSaves().map(s=>String(s.seat)));if(!seat)cloudRefresh(()=>{if(!$('msgp').hidden&&$('mpTitle').textContent==='要去誰家留言？')teacherHomeBoard();});
  msgOpen('學生家的留言板',seat?`${seat} 號的留言板`:'要去誰家留言？',B=>{
    if(!seat){const si=el('input',{class:'nb-in',placeholder:'座號，例如 6，或「全班」'});B.appendChild(el('div',{class:'nb-card'},[el('b',{text:'輸入座號'}),si,el('button',{type:'button',class:'btn primary small',text:'打開他的留言板',onclick:()=>{const v=si.value.trim();if(v)teacherHomeBoard(v);}})]));
      if(seats.size)B.appendChild(el('div',{class:'cb-chips'},[...seats].sort((a,b)=>(+a||0)-(+b||0)).map(s=>el('button',{type:'button',class:'cb-chip',text:s+' 號',onclick:()=>teacherHomeBoard(s)}))));
      B.appendChild(el('p',{class:'help',text:'之後做好「任意門」，就能直接走到每個學生家門口。'}));return;}
    {const box=el('div',{});B.appendChild(el('h3',{text:'同學貼的便條'}));B.appendChild(box);const draw=M=>{box.innerHTML='';if(!M.length){box.appendChild(el('p',{class:'dc-hint',text:'還沒有同學的便條。'}));return;}
      M.slice().reverse().forEach(m=>box.appendChild(msgCard(m,async()=>{try{const A=await msgList(seat);const R=A.filter(x=>x.id!==m.id);await msgPut(seat,R);draw(R);}catch(e){toast('沒有撕成功');}})));};
      msgList(seat).then(draw,()=>box.appendChild(el('p',{class:'dc-hint',text:'連不上雲端。'})));B.appendChild(el('h3',{text:'老師的便條'}));}
    const L=(CFG.notes||[]).filter(n=>String(n.seat).trim()===String(seat));
    if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有留言。'}));
    L.slice().reverse().forEach(n=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`${n.from||'老師'} · ${n.date||''}`}),el('p',{text:n.text}),el('button',{type:'button',class:'btn small danger',text:'撕掉這張',onclick:async()=>{if(await publishCfg(c=>{c.notes=(c.notes||[]).filter(x=>!(x.seat===n.seat&&x.text===n.text&&x.date===n.date));},'已撕掉，頁面會重新載入'))$('msgp').hidden=true;}})])));
    const ta=el('textarea',{class:'nb-in',maxlength:'200',placeholder:'想對他說的話…'});
    B.appendChild(el('div',{class:'nb-card'},[el('b',{text:'貼一張便條'}),ta,el('button',{type:'button',class:'btn primary small',text:'貼上並發布',onclick:async()=>{const t=ta.value.trim();if(!t)return;const d=new Date();
      if(await publishCfg(c=>{c.notes=c.notes||[];c.notes.push({seat:String(seat),text:t,from:'老師',date:`${d.getMonth()+1}/${d.getDate()}`});},'貼好了！頁面會重新載入'))$('msgp').hidden=true;}})]));
    B.appendChild(el('button',{type:'button',class:'btn small',text:'← 換一個人',onclick:()=>teacherHomeBoard()}));});}
// ================= visiting classmates (their room is read from the cloud; the door lock they chose decides) =================
function doorKnock(seat){seat=String(seat);if(TS()){choose(`${seat} 號的家`,'老師要做什麼？',[{label:'🚪 進去看看房間',fn:()=>visitHome(seat)},{label:'📝 看留言板',fn:()=>teacherHomeBoard(seat)},{label:'算了',fn:null}]);return;}visitHome(seat);}
function askCode(title,line,cb){msgOpen(title,line,B=>{const i=el('input',{class:'nb-in',maxlength:'4',inputmode:'numeric',placeholder:'4 位數字'});i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go();});
  const go=()=>{const v=i.value.trim();$('msgp').hidden=true;cb(v);};B.appendChild(el('div',{class:'nb-card'},[i,el('button',{type:'button',class:'btn primary small',text:'開門',onclick:go})]));setTimeout(()=>i.focus(),60);});}
async function visitHome(seat){if(!started||VISIT)return;if(CLOUD.st==='fail'){say(`${seat} 號的家`,['叩叩叩……','現在連不上雲端，看不到同學的家。等一下再來試試。']);return;}
  toast('叩叩叩……');let o=null;try{o=await Promise.race([cloudGet(seat),new Promise((_,j)=>setTimeout(()=>j(new Error('t')),6000))]);}catch(e){}
  if(!o||!saveOk(o,resetAt(seat))){say(`${seat} 號的家`,['叩叩叩……','好像還沒有人住進來。'],{noWave:1});return;}
  const nm=o.name||(seat+' 號'),L=o.homeLock||{mode:'open'};const go=()=>visitEnter(seat,nm,o);
  if(L.mode==='closed'){say(`${nm}的家`,['門上掛著「暫時不開放」的小牌子。','可以在門口的留言板留言給'+nm+'喔！'],{noWave:1});return;}
  if(L.mode==='pass'){askCode(`${nm}的家`,'門鎖著，要輸入 4 位數密碼',v=>{if(v&&v===String(L.pass))go();else{SND.wrong&&SND.wrong();say(null,['密碼不對，門打不開。'],{noWave:1});}});return;}
  go();}
function visitEnter(seat,nm,o){const home=Object.assign({wall:'cream',floor:'wood',items:[],room2:1},JSON.parse(JSON.stringify(o.home||{})));home.items=Array.isArray(home.items)?home.items:[];
  VISIT={seat,name:nm,home,back:{x:P.pos.x,z:P.pos.z,yaw:P.yaw}};HOME.from='visit';histAdd&&histAdd('adv',`去 ${seat} 號${nm}的家玩`);
  fadeTo(()=>{INDOOR=true;HOME_IN=true;ST_IN=false;homeSpawn(true);try{applyHome();}catch(e){}if(TROOM&&TROOM.home&&r2Ok())hrEnter(false);
    if(PETOBJ){PETOBJ.g.position.set(HX+PETBED.x,0,HZ+PETBED.z);PETOBJ.by=0;}$('homeBar').hidden=true;curArea=null;areaCool=0;SND.chime&&SND.chime();
    setTimeout(()=>say(`${nm}的房間`,[`這是 ${seat} 號${nm}佈置的房間。`,'看完了，從房門走出去就會回到他家門口。'],{noWave:1}),600);});}
function visitLeave(){const b=VISIT&&VISIT.back;fadeTo(()=>{VISIT=null;r2Off();INDOOR=false;HOME_IN=false;HOME.from=null;$('homeBar').hidden=true;try{applyHome();}catch(e){}
  if(b)warpTown(b.x,b.z,b.yaw+PI);if(PETOBJ){PETOBJ.g.position.set(P.pos.x+1,P.pos.y,P.pos.z+.6);PETOBJ.by=P.pos.y;}});}
// classmates' notes on a door board: shiomi/msg-<seat> {d: JSON list of {id,from,name,text,t}}
const msgId=seat=>'/msg-'+String(seat).replace(/[^0-9A-Za-z-]/g,'');
async function msgList(seat){const r=await fbReq(msgId(seat));if(r.status===404)return [];if(!r.ok)throw new Error('msg '+r.status);try{const j=await r.json();return JSON.parse(j.fields.d.stringValue)||[];}catch(e){return [];}}
async function msgPut(seat,L){const r=await fbReq(msgId(seat),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{d:{stringValue:JSON.stringify(L.slice(-40))}}})});if(!r.ok)throw new Error('msg '+r.status);}
const MSG_BAD=['白痴','白癡','智障','去死','幹你','靠北','靠杯','垃圾','醜八怪','笨蛋','滾開','白目','低能','廢物'];
function msgCard(m,del){return el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`${m.from==='T'?'老師':(m.from+' 號 '+(m.name||''))} · ${fmtDT(m.t)}`}),el('p',{text:m.text}),...(del?[el('button',{type:'button',class:'btn small danger',text:'撕掉這張',onclick:del})]:[])]);}
function classBoard(seat){seat=String(seat);let last=0;msgOpen(`${seat} 號的留言板`,`留言給 ${seat} 號`,B=>{const list=el('div',{});list.appendChild(el('p',{class:'dc-hint',text:'讀取中…'}));B.appendChild(list);
  const draw=L=>{list.innerHTML='';const mine=L.filter(m=>m.from===String(W.seat)).slice(-5);
    if(!mine.length)list.appendChild(el('p',{class:'dc-hint',text:'你還沒有在這裡留言。（留言板上別人寫的話只有主人看得到）'}));else{list.appendChild(el('div',{class:'nb-meta',text:'你寫過的留言'}));mine.reverse().forEach(m=>list.appendChild(msgCard(m)));}};
  msgList(seat).then(draw,()=>{list.innerHTML='';list.appendChild(el('p',{class:'dc-hint',text:'現在連不上雲端，等一下再試試。'}));});
  const ta=el('textarea',{class:'nb-in',maxlength:'60',placeholder:'想對他說的話…（最多 60 字）'});ta.addEventListener('keydown',e=>e.stopPropagation());
  B.appendChild(el('div',{class:'nb-card'},[el('b',{text:'寫一張便條'}),ta,el('button',{type:'button',class:'btn primary small',text:'貼上',onclick:async e=>{const t=ta.value.trim().replace(/\s+/g,' ');if(!t)return;
    if(MSG_BAD.some(w=>t.includes(w))){say(null,['這句話可能會讓同學難過，換個說法吧！'],{noWave:1});return;}if(Date.now()-last<20000){toast('慢一點，等一下再貼喔');return;}
    const b=e.currentTarget;b.disabled=true;try{const L=await msgList(seat);L.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),from:String(W.seat),name:W.name||'',text:t,t:Date.now()});await msgPut(seat,L);last=Date.now();ta.value='';SND.pick&&SND.pick();toast('貼好了！');draw(L);}
    catch(err){toast('沒有貼成功，網路好像不穩');}b.disabled=false;}})]));});}
// on login and every few minutes: tell the owner about new notes from classmates
async function msgCheck(){if(!started||!W.seat||W.seat==='T'||CLOUD.st!=='ok')return;let L;try{L=await msgList(W.seat);}catch(e){return;}const seen=+W.msgSeen||0,n=L.filter(m=>m.t>seen&&m.from!==String(W.seat)).length;
  if(n&&!MSGN.told){MSGN.told=true;toast(`📝 有 ${n} 張新的便條貼在你家留言板！`);}}
const MSGN={told:false};setInterval(()=>{if(started&&W.seat&&CLOUD.st==='ok'){MSGN.told=false;msgCheck();}},300000);
function openHomeBoard(){if(TS()){teacherHomeBoard();return;}msgOpen('我家的留言板','給'+(W.name||'你')+'的留言',B=>{const L=myNotes().slice().reverse();
  if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有留言。老師寫給你的話會出現在這裡。'}));
  L.forEach(n=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`${n.from||'老師'}${n.date?' · '+n.date:''}${/^(全班|all|\*)$/i.test(String(n.seat).trim())?' · 給全班':''}`}),el('p',{text:n.text})])));
  
  const box=el('div',{});B.appendChild(el('h3',{text:'同學的便條'}));B.appendChild(box);box.appendChild(el('p',{class:'dc-hint',text:'讀取中…'}));
  const draw=M=>{box.innerHTML='';const S=M.filter(m=>m.from!==String(W.seat));if(!S.length){box.appendChild(el('p',{class:'dc-hint',text:'還沒有同學的便條。同學走到你家門口的留言板就能貼給你。'}));return;}
    S.slice().reverse().forEach(m=>box.appendChild(msgCard(m,async()=>{try{const A=await msgList(W.seat);const R=A.filter(x=>x.id!==m.id);await msgPut(W.seat,R);draw(R);}catch(e){toast('沒有撕成功，網路好像不穩');}})));
    W.msgSeen=Math.max(+W.msgSeen||0,...S.map(m=>m.t));save();};
  msgList(W.seat).then(draw,()=>{box.innerHTML='';box.appendChild(el('p',{class:'dc-hint',text:'現在連不上雲端，看不到同學的便條。'}));});
  const seen=(W.notesSeen=W.notesSeen||[]);L.forEach(n=>{const k=n.date+n.text.slice(0,20);if(!seen.includes(k))seen.push(k);});save();});}
// ---------- board outside the teacher's cabin
(function(){const p=cyWorld(2.7,5.2);const g=msgBoard(scene,p.x,CY.y,p.z,CY.r,'寫給老師','#b8452f');addCol(p.x-.3,p.x+.3,p.z-.3,p.z+.3,2);
  const q=cyWorld(2.7,6.0);inter(q,1.4,()=>TS()?'看學生的留言':'寫留言給老師',()=>openTeacherBoard());})();
function allToT(){const out=[];allSaves().forEach(s=>(s.toT||[]).forEach(m=>out.push(Object.assign({seat:s.seat,name:s.name},m))));return out.sort((a,b)=>b.t-a.t);}
function openTeacherBoard(){
  if(TS()){cloudRefresh(()=>{if(!$('msgp').hidden&&$('mpTitle').textContent==='學生寫給老師的話')openTeacherBoard();});msgOpen('山上小屋','學生寫給老師的話',B=>{const L=allToT();B.appendChild(el('p',{class:'help',text:CLOUD.st==='ok'?'全班寫給你的留言（不管在哪一台電腦寫的）都會出現在這裡。':'雲端存檔目前連不上，只顯示在「這台裝置」上寫的留言。'}));
    if(!L.length)B.appendChild(el('p',{class:'dc-hint',text:'還沒有留言。'}));L.forEach(m=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`${m.seat} 號 ${m.name||''} · ${fmtDT(m.t)}`}),el('p',{text:m.text})])));});return;}
  msgOpen('山上小屋','寫留言給老師',B=>{const ta=el('textarea',{class:'nb-in',maxlength:'150',placeholder:'想跟老師說的話…（最多 150 字）'});
    B.appendChild(el('div',{class:'nb-card'},[el('b',{text:'寫一張便條'}),ta,stickerRow(ta),el('button',{type:'button',class:'btn primary small',text:'貼上留言板',onclick:()=>{const t=ta.value.trim();if(!t){toast('先寫點什麼吧');return;}
      W.toT=W.toT||[];W.toT.push({t:Date.now(),text:t});if(W.toT.length>30)W.toT.shift();save();SND.pick&&SND.pick();toast('貼好了！老師收成績的時候會看到');openTeacherBoard();}})]));
    const mine=(W.toT||[]).slice().reverse();if(mine.length){B.appendChild(el('div',{class:'nb-meta',style:'margin:8px 2px 4px',text:'你貼過的便條'}));mine.forEach(m=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:fmtDT(m.t)}),el('p',{text:m.text})])));}});}

// ---------- cabin: nicer interior + Q photos + anniversary frame
const ANN={cv:null,tex:null,day:''};
function annGet(){try{return localStorage.getItem('shiomi-anniv')||'';}catch(e){return '';}}
function annDays(){const s=annGet();if(!s)return null;const a=new Date(s+'T00:00:00'),b=new Date();b.setHours(0,0,0,0);return Math.floor((b-a)/864e5)+1;}
function drawAnn(){if(!ANN.cv)return;const g=ANN.cv.getContext('2d'),W_=320,H_=240;g.fillStyle='#fff6ee';g.fillRect(0,0,W_,H_);
  g.strokeStyle='#e8a6b4';g.lineWidth=6;g.setLineDash([10,8]);g.strokeRect(12,12,W_-24,H_-24);g.setLineDash([]);
  const n=annDays();g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c85a78';g.font=`800 30px ${FG}`;g.fillText('♥ 我們在一起 ♥',W_/2,56);
  if(n==null){g.fillStyle='#9a7a6a';g.font=`500 20px ${FG}`;g.fillText('（還沒設定紀念日）',W_/2,130);}
  else{g.fillStyle='#5a3a2a';g.font=`900 78px ${FG}`;g.fillText(`${n}`,W_/2,128);g.font=`700 24px ${FG}`;g.fillText('天',W_/2+(String(n).length*24)+26,146);g.fillStyle='#9a7a6a';g.font=`500 18px ${FG}`;g.fillText('since '+annGet().replace(/-/g,'.'),W_/2,190);}
  ANN.tex.needsUpdate=true;ANN.day=todayStr();}
(function(){const G=TC.g;if(!G)return;const W_=TC_W/2,D_=TC_D/2,RH=TC_RH;
  const wood=imat('#6e4c33',.3);
  // photos of the teacher (Q-style) on the kitchen partition, facing the office
  TPHOTOS.forEach((src,i)=>{const im=new Image();const t=new T.Texture(im);t.encoding=T.sRGBEncoding;im.onload=()=>{t.needsUpdate=true;};im.src=src;
    const z=-.25+i*1.0;const fr=new T.Group();fr.position.set(-2.6,1.75,z);fr.rotation.y=PI/2;G.add(fr);mk(bx(.72,.86,.05),wood,0,0,0,fr,false);mk(bx(.64,.78,.02),imat('#fbf4e8',.4),0,0,.02,fr,false);
    mk(new T.PlaneGeometry(.56,.68),new T.MeshBasicMaterial({map:t}),0,0,.035,fr,false);});
  // anniversary frame above the bed (on the bathroom partition, facing the office)
  {const [c]=C2(320,240);ANN.cv=c;ANN.tex=TX(c);const fr=new T.Group();fr.position.set(2.45,1.75,.2);fr.rotation.y=-PI/2+.7;G.add(fr);ANN.g=fr;
    mk(bx(1.24,.96,.05),imat('#e8b0c0',.35),0,0,0,fr,false);mk(new T.PlaneGeometry(1.14,.86),new T.MeshBasicMaterial({map:ANN.tex,toneMapped:false}),0,0,.03,fr,false);
    [[-.64,.5],[.64,.5]].forEach(([x,y])=>mk(sph(.06,8,6),imat('#f28fb0',.6),x,y,.03,fr,false));drawAnn();}
  // curtains, pendant lamps, string lights, plants, cushions, books
  [-1,1].forEach(s=>{const cu=mk(bx(.32,1.35,.05),imat('#e8d9b8',.35),-1.7+s*.95,1.85,-D_+.12,G,false);cu.rotation.z=s*.03;});mk(bx(2.4,.06,.06),wood,-1.7,2.55,-D_+.14,G,false);
  const plant=(x,z,s)=>{mk(cy(.18*s,.14*s,.34*s,10),imat('#9a5e42',.3),x,.17*s,z,G);for(let i=0;i<6;i++){const f=mk(ico(.16*s,0),imat(pick(['#557a4f','#4b6f47','#62855a']),.3),x+rr(-.1,.1)*s,.45*s+i*.09*s,z+rr(-.1,.1)*s,G);f.scale.y=1.3;}addCol(TCX+x-.2*s,TCX+x+.2*s,TCZ+z-.2*s,TCZ+z+.2*s,1);};
  plant(-2.35,-3.05,1.2);
  const wm=new T.Group();wm.position.set(-1.7,.01,.9);G.add(wm);mk(new T.CylinderGeometry(.55,.55,.015,24),imat('#f3e6cf',.35),0,0,0,wm,false);
  inter(new T.Vector3(TCX+1.55,0,TCZ+.2),1.0,'紀念日相框',()=>openCabin('ann'),{hide:()=>!TS()});
  inter(new T.Vector3(TCX-2.0,0,TCZ+.3),1.0,'牆上的照片',()=>say('照片',['牆上掛著老師的 Q 版照片。','一張在沙發上看書，一張坐著對你微笑。']));
  inkify(G);})();

// ---------- story intro (shown once; can be replayed from the notice board)
const STORY=[['很久很久以前，海邊有一座叫做「汐見町」的小鎮。','鎮上的人每天看著潮水來來去去，所以叫它「看得見潮汐的小鎮」。'],
  ['每年秋天，鎮民會把這一年學到的事情，做成一顆一顆的「印章」，','收進防波堤盡頭的燈塔裡。燈塔因此一直亮著，照亮回家的船。'],
  ['可是有一年，一場好大的浪，把燈塔裡的印章全部捲走了。','印章散落在小鎮的各個角落，燈塔的光也慢慢變暗……'],
  ['就在這時候，平等車站出現了一班沒有時刻表的火車。','站務員說：「只有願意學習、願意幫助別人的孩子，才搭得上這班車。」'],
  ['你的任務：走遍汐見町，回答鎮民的問題，把遺失的印章一顆一顆找回來。','集滿印章，燈塔就會重新亮起來！']];
(function(){const d=document.createElement('div');d.id='story';d.hidden=true;d.innerHTML='<div class="sy-in"><p class="sy-k">序章 · 汐見町的故事</p><div class="sy-t"></div><div class="sy-dots"></div><div class="sy-btns"><button type="button" class="btn" id="syskip">略過</button><button type="button" class="btn primary" id="synext">下一頁</button></div></div>';document.body.appendChild(d);})();
function showStory(done){const d=$('story');let i=0;const t=d.querySelector('.sy-t'),dots=d.querySelector('.sy-dots');
  const r=()=>{t.innerHTML='';STORY[i].forEach((l,k)=>{const p=el('p',{text:l});p.style.animationDelay=(k*.5)+'s';t.appendChild(p);});dots.innerHTML=STORY.map((_,k)=>`<i${k===i?' class="on"':''}></i>`).join('');$('synext').textContent=i===STORY.length-1?'出發！':'下一頁';};
  const end=()=>{d.hidden=true;W.introSeen=true;save();done&&done();};$('synext').onclick=()=>{if(i<STORY.length-1){i++;r();}else end();};$('syskip').onclick=end;r();d.hidden=false;}

// ---------- Shiomi platform: keep people off the tracks
(function(){addCol(29,62.6,-32.3,-31.9,1.4);const ym=lam('#e8c24a');mk(bx(28,.02,.3),ym,48,.915,-32.55,scene,false);for(let x=35;x<62;x+=.6)mk(bx(.08,.025,.2),lam('#d6ae36'),x,.93,-32.55,scene,false);
  const sg=new T.Group();sg.position.set(35.2,.9,-35.1);scene.add(sg);mk(cy(.05,.05,2.2,6),M.metal,0,1.1,0,sg);
  const [c,g]=C2(256,80);g.fillStyle='#2f6b56';g.fillRect(0,0,256,80);g.fillStyle='#fff';g.font=`700 32px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('← 出口・小鎮',128,42);
  const m=mk(new T.PlaneGeometry(1.2,.38),emMat(TX(c),TX(c),'signs'),0,2.05,.03,sg,false);const m2=mk(new T.PlaneGeometry(1.2,.38),emMat(TX(c),TX(c),'signs'),0,2.05,-.03,sg,false);m2.rotation.y=PI;})();

/* ---------- teacher cabin: 2D painted room v2 (partitions, walkable polygons) ---------- */
const TROOM=(()=>{try{return JSON.parse(document.getElementById('troom').textContent);}catch(e){return null;}})();
const R2={on:false,sk:null,x:0,y:0,vx:0,vy:0,view:2,flip:1,ph:0,spd:0,step:0,tgt:null,pend:null,near:null,cx:null,cy:null,
  pet:{x:0,y:0,ph:0,mv:false,flip:1,idle:0,wag:0},cv:null,g:null,img:{},view_:{s:1,ox:0,oy:0},t:0};
// hA:[yBack,yFront,hBack,hFront] figure height; zoom = how close the camera sits
// spots: [key (substring of the 3D cabin interaction label), footX, footY, hit rect, label override]
const R2BB=P=>{const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
// teacher room v3 pack: each spot stands on the pack's acc point; spots without an action borrow the 3D cabin interaction whose label contains the key
function cabinCfg(sk){const D=TROOM&&TROOM[sk];if(!D||!D.acc)return null;const A=D.acc,H=D.hh[3];
  const box=k=>{const o=D.occ.find(o=>o.id===k);if(o)return o.b;const s=D.slots[k];if(s)return s;const a=A[k];return a?[a[0]-H*.35,a[1]-H*1.05,H*.7,H*1.05]:[0,0,1,1];};
  const P_=D.pet.access;
  return {hA:D.hh,zoom:sk==='portrait'?1.15:1.2,spots:[
    ['廚房',A.kitchen[0],A.kitchen[1],box('kitchen')],['閱讀日記',A.sofa[0],A.sofa[1],box('sofa')],['古老地圖',A.map[0],A.map[1],box('map')],
    ['辦公桌',A.desk[0],A.desk[1],box('desk')],['番茄',A.pomodoro[0],A.pomodoro[1],box('pomodoro')],
    ['全班閱讀',A.class_wall[0],A.class_wall[1],box('corkboard'),'成果牆・全班閱讀計畫'],['床',A.bed[0],A.bed[1],box('bed'),'躺下休息一下',()=>r2Rest(true)],
    ['紀念日',A.calendar[0],A.calendar[1],box('calendar')],
    ['書櫃',A.bookcase[0],A.bookcase[1],box('bookcase'),'書櫃（想讀・想買）',()=>{if(!r2ActPlay('i.reach',{flip:A.bookcase[0]<R2.x?-1:1,cb:()=>openCabin('bk')}))openCabin('bk');}],
    ['鏡子',A.mirror[0],A.mirror[1],box('mirror'),'照鏡子（換造型）',()=>openDress()],['浴室',A.bathroom[0],A.bathroom[1],box('bathroom'),'進浴室',()=>r2Bath(true)],
    ['寵物窩',P_[0],P_[1],box('pet_bed'),()=>W.pet?`${W.pet.name}的窩`:'蝴蝶的窩',()=>W.pet?openPetMenu():say(null,['蝴蝶的窩，軟軟的，還留著牠的味道。'],{noWave:1})],
    ['運動',A.exercise[0],A.exercise[1],box('dumbbells')],['離開小屋',A.exit[0],A.exit[1],R2BB(D.exit.polygon)]]};}
const R2CFG={landscape:cabinCfg('landscape'),portrait:cabinCfg('portrait')};
// teacher's private bathroom (2D painted room from the bathroom pack)
R2CFG.bath={
  landscape:{hA:[470,1020,330,440],zoom:1.1,spots:[['泡澡',553,582,[240,280,640,270],'泡個熱水澡',()=>r2Soak()],['洗手台',1379,566,[1205,40,365,490],'洗手台・鏡子',()=>r2Sink()],
    ['毛巾',1039,499,[900,180,260,190],'拿毛巾',()=>say(null,['毛巾鬆鬆軟軟的，還有曬過太陽的味道。'])],['回到小屋',960,1010,[640,960,640,120],'回到小屋',()=>r2Bath(false)]]},
  portrait:{hA:[760,1760,340,440],zoom:1.3,spots:[['泡澡',363,800,[140,470,470,300],'泡個熱水澡',()=>r2Soak()],['洗手台',790,800,[650,170,290,560],'洗手台・鏡子',()=>r2Sink()],
    ['毛巾',172,898,[10,420,130,400],'拿毛巾',()=>say(null,['毛巾鬆鬆軟軟的，還有曬過太陽的味道。'])],['回到小屋',540,1745,[200,1690,680,180],'回到小屋',()=>r2Bath(false)]]}};
function r2Bath(on){hurry(/rooms\/bath\//);if(!TROOM||!TROOM.bath)return;fadeTo(()=>{R2.room=on?'bath':'cabin';R2.sk=r2Scene();
    if(on){const sp=TROOM.bath[R2.sk].exit.spawn;[R2.x,R2.y]=r2Near(sp[0],sp[1]-20);}else{const d=R2CFG[R2.sk].spots.find(s=>s[0]==='浴室');[R2.x,R2.y]=r2Near(d[1]-40,d[2]+10);}
    R2.vx=R2.vy=0;R2.view=on?2:0;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;[R2.pet.x,R2.pet.y]=r2Near(R2.x+40,R2.y+6);SND.step&&SND.step('wood');});}
function r2Soak(){say('浴室',['放滿一缸熱水，慢慢泡進去……','♨️ 今天也辛苦了。肩膀放鬆、深呼吸，把今天的事情先放下。'],{onEnd:()=>toast('泡完澡，整個人都暖起來了 ♨️')});}
function r2Sink(){choose('洗手台','要做什麼呢？',[{label:'🧼 洗洗手、洗把臉',fn:()=>say(null,['冰冰涼涼的山泉水，一下子清醒了！'])},{label:'🪞 照鏡子（換造型）',fn:()=>openDress()},{label:'算了',fn:null}]);}
if(TROOM){const im=TROOM.img||{};Object.keys(im).forEach(k=>{R2.img[k]=qImg(im[k]);});}
// 五年級教室 (2D painted room from the classroom pack): walk in from the school corridor in Sqoyaw
let CLS_IN=false;const CLS_DOOR=[-64.05,20.04];
// 便利商店 (2D painted store from the mart pack): the same shop for ひだまりマート and the Sqoyaw 7-11
// 平等國小操場 (2D painted scene from the art pack v0.2 school picture): walk the court, the track and the front of the classrooms
// 平等國小校門口・魚溜滑梯 (gate-v1 pack): the painted gate yard; its exits lead back to the village and on to the field
let GATE_IN=false;R2CFG.gate={};
if(TROOM&&TROOM.gate)['landscape','portrait'].forEach(sk=>{const D=TROOM.gate[sk],A=D.acc,T_=D.tgt||{},H=D.hh[3];D.bgkey=`sgate_${sk}_bg`;
  const ob=id=>(D.occ.find(o=>o.id===id)||{}).b,around=(p,w=.5,h=.7)=>[p[0]-H*w/2,p[1]-H*h,H*w,H*h];
  const E=D.exits;
  R2CFG.gate[sk]={hA:D.hh,zoom:1.0,spots:[
    ['魚滑梯',A.fish_slide[0],A.fish_slide[1],ob('fish_slide')||around(A.fish_slide),'溜魚滑梯',()=>say(null,['你爬上大魚的背——咻！從魚尾溜下來！','這隻藍色的大魚，是平等國小的招牌溜滑梯。'],{noWave:1})],
    ['魚肚洞',A.fish_tunnel[0],A.fish_tunnel[1],around(T_.fish_tunnel||A.fish_tunnel,.35,.35),'鑽魚肚子的小洞',()=>say(null,['你蹲下來，從魚肚子的小洞鑽過去……','裡面暗暗的、涼涼的，下課時大家最愛在這裡玩捉迷藏。'],{noWave:1})],
    ['倉庫',A.storeroom[0],A.storeroom[1],ob('storeroom')||around(A.storeroom),'體育器材倉庫',()=>say(null,['倉庫裡放著籃球、跳繩、呼拉圈和接力棒。','上體育課前，值日生會來這裡搬器材。'],{noWave:1})],
    ['球門',A.goal[0],A.goal[1],ob('goal')||around(A.goal),'踢一球',()=>{const ok=Math.random()<.6;SND.pick&&SND.pick();say(null,[ok?'你助跑、起腳——「咚！」球飛進網子裡，進球了！':'你用力一踢——球擦過門柱，滾到草地上了。再來一次！'],{noWave:1});}],
    ['離開學校',E.to_map.center[0],E.to_map.center[1],R2BB(E.to_map.polygon),'走出校門（回部落）',()=>gateLeave()],
    ['往操場',E.to_field.center[0],E.to_field.center[1],R2BB(E.to_field.polygon),'沿著跑道走到操場',()=>{gateOff();fieldEnter('gate');}]]};});
function gateOff(){GATE_IN=false;}
function gateEnter(from){if(!TROOM||!TROOM.gate||!R2.img.sgate_landscape_bg||!spr2d()){fieldEnter();return;}hurry(/rooms\/sgate\//);
  fadeTo(()=>{GATE_IN=true;FIELD_IN=false;INDOOR=true;P.sit=null;P.pos.set(TB.x-48,tribeH(-48,26),26);P.vel.set(0,0,0);curArea=null;areaCool=0;R2.act=null;R2.rest=null;if(S2.on)s2Off();
    R2.on=true;R2.room='gate';R2.sk=r2Scene();const D=TROOM.gate[R2.sk],e=D.exits[from==='field'?'to_field':'to_map'];[R2.x,R2.y]=r2Near(e.spawn[0],e.spawn[1]);R2.vx=R2.vy=0;
    R2.view=e.facing==='right'?1:e.facing==='back'?2:0;R2.flip=1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;R2.exitArm=false;
    const Q=R2.pet;[Q.x,Q.y]=r2Near(R2.x+r2H(R2.y)*.4,R2.y+4);Q.idle=0;Q.mv=false;Q.flip=-1;R2.cv.hidden=false;toast('🏫 平等國小・校門口');});}
function gateLeave(){fadeTo(()=>{r2Off();GATE_IN=false;INDOOR=false;warpTown(TB.x-42.6,TB.z+24.8,-PI/2);});}
let FIELD_IN=false,CLS_FROM=null;R2CFG.field={};
// 平等國小操場 (field-v1 pack): exits are walked into — right track -> 校門口, white door -> 五年級教室, left track -> 3D 單槓草地 (painted lawn not drawn yet)
if(TROOM&&TROOM.field)['landscape','portrait'].forEach(sk=>{const D=TROOM.field[sk],A=D.acc,T_=D.tgt||{},H=D.hh[3],E=D.exits;
  const ob=id=>(D.occ.find(o=>o.id===id)||{}).b,around=(p,w=.5,h=.7)=>[p[0]-H*w/2,p[1]-H*h,H*w,H*h];
  R2CFG.field[sk]={hA:D.hh,zoom:1.0,spots:[
    ['教室門',A.classroom_door[0],A.classroom_door[1],R2BB(E.classroom_door.polygon.concat([[A.classroom_door[0]-30,T_.classroom_door[1]-40],[A.classroom_door[0]+30,A.classroom_door[1]]])),'走進五年級教室',()=>{CLS_FROM='field';clsEnter();}],
    ['籃框',A.hoop[0],A.hoop[1],ob('hoop')||around(A.hoop),'投籃',()=>fieldShoot()],
    ['中圈',A.center_circle[0],A.center_circle[1],around(A.center_circle,1.2,.45),'在球場中圈玩遊戲',()=>fieldCircle()],
    ['旗桿',A.flag[0],A.flag[1],ob('flagpole')||around(A.flag),'看看國旗和旗桿',()=>say(null,['每天早上，值日生會在這裡升旗。','風一吹，國旗就在山谷裡啪啦啪啦地飄。'],{noWave:1})],
    ['司令台',A.stage[0],A.stage[1],ob('stage_front')?[ob('stage_front')[0],ob('stage_front')[1]-H*.9,ob('stage_front')[2],H*.9+ob('stage_front')[3]]:around(A.stage),'司令台（看全校公告）',()=>choose('司令台','要做什麼呢？',[{label:'📣 看全校公告',fn:()=>openBoard('news')},{label:'🎤 站上去練習說話',fn:()=>say(null,['你站上司令台，整個操場都看得清清楚楚。','（深呼吸——）「各位同學早安！」'],{noWave:1})},{label:'算了',fn:null}])],
    ['木平台',A.deck[0],A.deck[1],around(T_.deck||A.deck,.9,.6),'坐在木平台上',()=>say(null,['木平台被太陽曬得暖暖的。','下課的時候，大家常在這裡畫畫、寫學習單。'],{noWave:1})],
    ['往校門口',E.to_gate.center[0],E.to_gate.center[1],R2BB(E.to_gate.polygon),'沿著跑道走到校門口',()=>fieldLeave()],
    ['往單槓草地',E.to_lawn.center[0],E.to_lawn.center[1],R2BB(E.to_lawn.polygon),'沿著跑道走到單槓草地',()=>fieldLawn()]]};});
function fieldShoot(){const ok=Math.random()<.55;SND.pick&&SND.pick();say(null,[ok?'你瞄準籃框，出手——「唰！」空心進球！':'你出手——球在籃框上轉了兩圈……彈出來了！再試一次！'],{noWave:1});}
function fieldCircle(){const g=pick([['大家圍成一個圓，玩「老師說」。','老師說：摸摸頭！——老師說：單腳站！……咦，你剛剛有沒有偷動？'],['你在中圈練習運球，咚、咚、咚。','運了二十下都沒有掉球，越來越穩了！'],['你們在中圈跳大繩，一個接一個跑進去。','一、二、三……全部的人都跳過了！']]);say(null,g,{noWave:1});}
// the painted lawn is not drawn yet: the left track leads to the 3D lawn with the pull-up bars, west of the school
function fieldLawn(){fadeTo(()=>{r2Off();FIELD_IN=false;INDOOR=false;warpTown(TB.x-79.4,31.4,-PI/2);toast('🌳 單槓草地（手繪版還在畫，先來這裡拉單槓）');});}
function fieldEnter(from){if(!TROOM||!TROOM.field||!R2.img.sfield_landscape_bg||!spr2d()){toast('操場還在準備中，等一下再試試');return;}hurry(/rooms\/sfield\//);
  fadeTo(()=>{FIELD_IN=true;GATE_IN=false;INDOOR=true;P.sit=null;P.pos.set(TB.x-48,tribeH(-48,26),26);P.vel.set(0,0,0);curArea=null;areaCool=0;R2.act=null;R2.rest=null;if(S2.on)s2Off();R2.on=true;R2.room='field';R2.sk=r2Scene();const D=TROOM.field[R2.sk];
    const e=from==='gate'?D.exits.to_gate:from==='class'?D.exits.classroom_door:null,sp=e?e.spawn:(D.spawn||D.exit.spawn);
    [R2.x,R2.y]=r2Near(sp[0],sp[1]);R2.vx=R2.vy=0;R2.view=e?(e.facing==='left'||e.facing==='right'?1:e.facing==='back'?2:0):2;R2.flip=e&&e.facing==='left'?-1:1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;R2.exitArm=false;
    const Q=R2.pet;[Q.x,Q.y]=r2Near(R2.x+r2H(R2.y)*.4,R2.y+4);Q.idle=0;Q.mv=false;Q.flip=-1;R2.cv.hidden=false;toast('🏫 平等國小・操場');});}
function fieldLeave(){if(TROOM&&TROOM.gate){FIELD_IN=false;gateEnter('field');return;}fadeTo(()=>{r2Off();FIELD_IN=false;INDOOR=false;warpTown(TB.x-46.4,TB.z+24.8,PI/2);});}
// the little blank name plate above the classroom door
const FSIGN={};
function fieldSign(g){const D=TROOM.field[R2.sk],r=D&&D.sign;if(!r)return;let c=FSIGN[R2.sk];
  if(!c){const S=8;c=document.createElement('canvas');c.width=Math.round(r[2]*S);c.height=Math.round(r[3]*S);const x=c.getContext('2d');x.fillStyle='#2f4a3e';x.textAlign='center';x.textBaseline='middle';
    let fs=c.height*.78;x.font=`900 ${fs}px ${FG}`;const tw=x.measureText('五年級').width;if(tw>c.width*.92){fs*=c.width*.92/tw;x.font=`900 ${fs}px ${FG}`;}x.fillText('五年級',c.width/2,c.height*.55);FSIGN[R2.sk]=c;}
  g.drawImage(c,r[0],r[1],r[2],r[3]);}
let MART_IN=false;R2CFG.mart={};
if(TROOM&&TROOM.mart)['landscape','portrait'].forEach(sk=>{const D=TROOM.mart[sk],A=D.acc,H=D.hh[3];
  const box=k=>{const o=D.occ.find(o=>o.id===k);if(o)return o.b;const a=A[k];return [a[0]-H*.35,a[1]-H*1.05,H*.7,H*1.05];};
  const S_=(k,label,fn)=>[k,A[k][0],A[k][1],box(k),label,fn];
  R2CFG.mart[sk]={hA:D.hh,zoom:sk==='portrait'?1.12:1.15,spots:[
    S_('shelf_rice','逛逛〈飯糰・便當〉',()=>openShop('rice')),S_('shelf_bread','逛逛〈麵包・甜點〉',()=>openShop('bread')),S_('shelf_snack','逛逛〈零食〉',()=>openShop('snack')),
    S_('shelf_noodle','逛逛〈泡麵〉',()=>openShop('rice')),S_('shelf_stationery','逛逛〈文具〉',()=>openShop('stat')),S_('shelf_pet','逛逛〈雜貨・寵物用品〉',()=>openShop('pet')),
    S_('drink_fridge','打開飲料冷藏櫃',()=>openShop('drink')),S_('ice_freezer','打開冰品冷凍櫃',()=>openShop('ice')),
    S_('counter',()=>MART.basket.length?`到櫃台結帳（${MART.basket.length} 件）`:'櫃台熱食・結帳',()=>openShop(MART.basket.length?null:'hot')),
    S_('gacha','看看扭蛋機',()=>{SHOP.mach=null;openShop('gacha');}),
    ['離開便利商店',D.exit.center[0],D.exit.center[1],R2BB(D.exit.polygon),'離開便利商店',()=>exitMart()]]};});
const MART_SIGN={sign_rice:'飯糰・便當',sign_bread:'麵包・甜點',sign_snack:'零食',sign_noodle:'泡麵',sign_stationery:'文具',sign_pet:'寵物',sign_drink:'飲料',sign_ice:'冰品',sign_gacha:'扭蛋'};
const MSC={};
const MCLERK={img:null,ld:false,pos:{landscape:[1772,598],portrait:[1046,812]}};
function martClerk(g){const M=SPRITES.clerk;if(!M)return;if(!MCLERK.ld){MCLERK.ld=true;loadImg(M.src).then(im=>MCLERK.img=im).catch(()=>{});}const im=MCLERK.img;if(!im)return;
  const [x,y]=MCLERK.pos[R2.sk],H=r2H(y),dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch,br=1+Math.sin(R2.t*2.1)*.008;g.save();g.translate(x,y);g.scale(1,br);const [sx,sy]=fxy(M,0);g.drawImage(im,sx,sy,M.cw,M.ch,-dw/2,-dh+3/M.ch*dh,dw,dh);g.restore();}
function martSign(g,k){const D=TROOM.mart[R2.sk],r=D.slots[k];if(!r)return;const txt=k==='sign_counter'?(MART.from==='tribe'?'7-ELEVEN 環山門市':'ひだまりマート'):MART_SIGN[k];if(!txt)return;
  const q=D.quads[k],key=R2.sk+k+txt;let c=MSC[key];
  if(!c){const [,,w,h]=r,S=4,vert=h>w*1.2;c=document.createElement('canvas');c.width=Math.max(8,Math.round(w*S));c.height=Math.max(8,Math.round(h*S));const x=c.getContext('2d');
    const dark=k==='sign_gacha';x.fillStyle=dark?'#fff':(k==='sign_ice'?'#1f745c':'#365e50');x.textAlign='center';x.textBaseline='middle';
    if(vert){const n=[...txt].length,fs=Math.min(c.width*.8,c.height*.86/n);x.font=`900 ${fs}px ${FG}`;[...txt].forEach((ch,i)=>x.fillText(ch,c.width/2,c.height/2+(i-(n-1)/2)*fs*1.02));}
    else{let fs=c.height*.68;x.font=`900 ${fs}px ${FG}`;const tw=x.measureText(txt).width;if(tw>c.width*.9){fs*=c.width*.9/tw;x.font=`900 ${fs}px ${FG}`;}x.fillText(txt,c.width/2,c.height*.54);}
    MSC[key]=c;}
  if(q)s2Quad(g,c,q);else g.drawImage(c,r[0],r[1],r[2],r[3]);}
R2CFG.class={};
if(TROOM&&TROOM.class)['landscape','portrait'].forEach(sk=>{const D=TROOM.class[sk],A=D.acc,port=sk==='portrait',ob=id=>(D.occ.find(o=>o.id===id)||{b:[0,0,1,1]}).b;
  const bb=P=>{const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
  const sp=[['黑板',A.blackboard[0],A.blackboard[1],port?[250,137,455,213]:[516,76,664,224],'看黑板（班級公告）',()=>openBoard('news')],
    ['講台',A.podium[0],A.podium[1],ob('podium'),'站上講台',()=>say(null,['你站上講台，從這裡看得到全班的座位。','（小聲練習一下：「各位同學早安！」）'])],
    ['閱讀角',A.reading_corner[0],A.reading_corner[1],ob('reading_rack'),'閱讀角・保育動物圖鑑',()=>acBook()],
    ['窗邊',A.window[0],A.window[1],port?[985,0,95,500]:[1640,30,280,430],'看看窗外',()=>say(null,['窗外是環山的山，一層一層的果園。','風吹進來，聽得到操場那邊的鳥叫聲。'])]];
  for(let i=1;i<=5;i++)sp.push(['座位'+i,A['desk_'+i][0],A['desk_'+i][1],ob('desk_'+i),()=>i===tbMySeat()?`我的座位（${i} 號）`:`${i} 號的座位`,()=>clsDesk(i)]);
  sp.push(['離開教室',D.exit.center[0],D.exit.center[1],bb(D.exit.polygon),'離開教室',()=>clsLeave()]);
  R2CFG.class[sk]={hA:port?[500,1900,200,540]:[390,1075,160,380],zoom:port?1.12:1.06,spots:sp};});
function clsDesk(i){if(i!==tbMySeat()){say(null,[`這是 ${i} 號同學的座位，桌子收得很整齊。`]);return;}
  choose('我的座位','坐好了！要做什麼呢？',[{label:'📋 看今天的任務',fn:()=>{QT.open=true;renderQuests();}},{label:'🎒 打開書包',fn:()=>openBag()},{label:'沒事，起來走走',fn:null}]);}
function clsEnter(){if(!TROOM||!TROOM.class||!r2Ok()){toast('教室還在準備中，等一下再試試');return;}hurry(/rooms\/class\//);
  fadeTo(()=>{CLS_IN=true;INDOOR=true;P.sit=null;R2.act=null;R2.rest=null;if(S2.on)s2Off();R2.on=true;R2.room='class';R2.sk=r2Scene();const D=TROOM.class[R2.sk];
    [R2.x,R2.y]=r2Near(D.exit.spawn[0],D.exit.spawn[1]);R2.vx=R2.vy=0;R2.view=2;R2.flip=1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;
    const Q=R2.pet;[Q.x,Q.y]=r2Near(R2.x+r2H(R2.y)*.4,R2.y+4);Q.idle=0;Q.mv=false;Q.flip=-1;R2.cv.hidden=false;toast('🏫 五年級教室');});}
function martEnter2(){hurry(/rooms\/mart\//);fadeTo(()=>{INDOOR=true;MART_IN=true;P.sit=null;P.pos.set(IX+4,0,IZ+3.4);P.vel.set(0,0,0);R2.act=null;R2.rest=null;if(S2.on)s2Off();R2.on=true;R2.room='mart';R2.sk=r2Scene();const D=TROOM.mart[R2.sk];
    [R2.x,R2.y]=r2Near(D.exit.spawn[0],D.exit.spawn[1]);R2.vx=R2.vy=0;R2.view=2;R2.flip=1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;
    const Q=R2.pet;[Q.x,Q.y]=r2Near(R2.x+r2H(R2.y)*.4,R2.y+4);Q.idle=0;Q.mv=false;Q.flip=-1;R2.cv.hidden=false;SND.chime&&SND.chime();updateBasket();curArea=null;areaCool=0;});}
function clsLeave(){if(CLS_FROM==='field'&&TROOM&&TROOM.field){CLS_FROM=null;CLS_IN=false;fieldEnter('class');return;}
  fadeTo(()=>{r2Off();CLS_IN=false;INDOOR=false;warpTown(TB.x+CLS_DOOR[0],TB.z+CLS_DOOR[1]+1.6,0);});}
{const c=document.createElement('canvas');c.id='room2d';c.hidden=true;c.tabIndex=-1;$('stage').appendChild(c);R2.cv=c;R2.g=c.getContext('2d');
  c.addEventListener('pointerdown',e=>{if(R2.on&&started&&R2.room==='home'&&HOME.edit){e.preventDefault();const r=c.getBoundingClientRect(),V=R2.view_;hrClick(V.ox+(e.clientX-r.left)/V.s,V.oy+(e.clientY-r.top)/V.s);return;}
    if(!R2.on||!started||uiOpen())return;e.preventDefault();if(DLG.open){interact();return;}if(R2.rest){if(R2.rest.t>.8)r2Rest(false);return;}
    const r=c.getBoundingClientRect(),V=R2.view_;const ix=V.ox+(e.clientX-r.left)/V.s,iy=V.oy+(e.clientY-r.top)/V.s;
    const hit=r2Spots().slice().reverse().find(s=>{const h=s.def[3];return ix>=h[0]&&ix<=h[0]+h[2]&&iy>=h[1]&&iy<=h[1]+h[3];});
    if(hit){R2.tgt=[hit.def[1],hit.def[2]];R2.pend=hit;}else{R2.tgt=[ix,iy];R2.pend=null;}
    audioInit&&audioInit();});}
const R2INT={};
function r2Int(key){if(R2INT[key])return R2INT[key];const lb=it=>typeof it.label==='function'?it.label():it.label;
  const it=INT.find(it=>it.pos&&Math.abs(it.pos.x-TCX)<7&&Math.abs(it.pos.z-TCZ)<4.5&&String(lb(it)).includes(key));if(it)R2INT[key]=it;return it;}
function r2D(sk){return (R2.room==='bath'?TROOM.bath:R2.room==='home'?TROOM.home:R2.room==='class'?TROOM.class:R2.room==='mart'?TROOM.mart:R2.room==='field'?TROOM.field:R2.room==='gate'?TROOM.gate:TROOM)[sk||R2.sk];}
function r2C(){return R2.room==='class'?R2CFG.class[R2.sk]:R2.room==='mart'?R2CFG.mart[R2.sk]:R2.room==='field'?R2CFG.field[R2.sk]:R2.room==='gate'?R2CFG.gate[R2.sk]:R2.room==='bath'?R2CFG.bath[R2.sk]:R2.room==='home'?hrCfg(R2.sk):R2CFG[R2.sk];}
function r2Spots(){const C=r2C();if(!C)return [];const out=[];
  for(const d of C.spots){if(d[5]){if(d[6]&&!d[6]())continue;out.push({def:d,it:null,label:typeof d[4]==='function'?d[4]():d[4],act:d[5]});continue;}const it=r2Int(d[0]);if(!it)continue;if(it.hide&&it.hide())continue;out.push({def:d,it,label:d[4]||(typeof it.label==='function'?it.label():it.label),act:it.act});}
  const dg=cdogSpot();if(dg)out.push(dg);if(R2.room==='home'&&VISIT)return out.filter(s=>/出門|離開/.test(s.def[0]+s.label));return out;}
// the player as drawn in the painted rooms: the illustrated sheet, or — for a "自己搭配" 3D look — a snapshot of the 3D
// model from the front, side and back (made once per look), so switching looks inside a room never makes the player vanish
let SNAP=null;
function avatarSnap(){if(SNAP&&SNAP.look===JSON.stringify(W.look||{}))return SNAP;
  try{const cw=264,ch=384,foot=3,hpx=360;const R=avatarSnap.R||(avatarSnap.R=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}));R.setSize(cw,ch);R.outputEncoding=T.sRGBEncoding;R.setClearColor(0,0);
    const sc=new T.Scene();sc.add(new T.HemisphereLight(0xfff4e6,0x6a5040,1.05));const dl=new T.DirectionalLight(0xffe2c6,.9);dl.position.set(1.5,3,3);sc.add(dl);
    const g=pl.g,par=g.parent,pos=g.position.clone(),ry=g.rotation.y,vis=g.visible;sc.add(g);g.position.set(0,0,0);g.rotation.y=0;g.visible=true;g.updateMatrixWorld(true);
    const box=new T.Box3().setFromObject(g),h=Math.max(.5,box.max.y-Math.min(0,box.min.y)),u=h/hpx;
    const cm=new T.OrthographicCamera(-cw/2*u,cw/2*u,(ch-foot)*u,-foot*u,.1,20);const cv=document.createElement('canvas');cv.width=cw*3;cv.height=ch;const c2=cv.getContext('2d');
    [[0,0,4],[-4,0,0],[0,0,-4]].forEach(([x,y,z],i)=>{cm.position.set(x,y,z);cm.lookAt(0,0,0);cm.updateProjectionMatrix();R.render(sc,cm);c2.drawImage(R.domElement,i*cw,0);});
    sc.remove(g);if(par)par.add(g);g.position.copy(pos);g.rotation.y=ry;g.visible=vis;
    SNAP={id:'snap',look:JSON.stringify(W.look||{}),ready:true,meta:{cw,ch,n:3,hpx,foot,fw:[],sw:[],bw:[]},mat:{map:{image:cv}}};return SNAP;}catch(e){return null;}}
function spr2d(){if(SPR.c)return SPR.c.ready&&SPR.c.mat.map&&SPR.c.mat.map.image?SPR.c:null;return avatarSnap();}
function r2Ok(){return !!(TROOM&&TROOM.landscape&&R2.img.landscape_bg&&spr2d());}
function r2H(y){const a=r2C().hA;return lerp(a[2],a[3],clamp((y-a[0])/(a[1]-a[0]),0,1));}
function r2Scene(){return innerWidth>=innerHeight?'landscape':'portrait';}
function r2Pip(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function r2Walk(x,y){const W_=r2D().walk;if(!W_.some(w=>r2Pip(x,y,w.outer)&&!w.holes.some(h=>r2Pip(x,y,h))))return false;return R2.room!=='home'||hrFree(x,y);}
function r2Near(x,y){if(r2Walk(x,y))return [x,y];for(let r=6;r<500;r+=8)for(let a=0;a<6.28;a+=.26){const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(r2Walk(px,py))return [px,py];}return [x,y];}
function r2Enter(){R2.act=null;hurry(/rooms\/(cabin|rest)\//);if(!r2Ok()){R2.on=false;return;}if(S2.on)s2Off();R2.on=true;R2.room='cabin';R2.sk=r2Scene();const ex=TROOM[R2.sk].exit.spawn;R2.x=ex[0];R2.y=ex[1];R2.vx=R2.vy=0;R2.view=2;R2.flip=1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;
  const P2=R2.pet;[P2.x,P2.y]=r2Near(R2.x+r2H(R2.y)*.4,R2.y+4);P2.idle=0;P2.mv=false;P2.flip=-1;R2.cv.hidden=false;}
function r2Off(){R2.on=false;R2.act=null;R2.tgt=R2.pend=null;if(R2.cv)R2.cv.hidden=true;}
function r2Swap(sk){const A0=r2D(),B0=r2D(sk);const u=R2.x/A0.w,v=R2.y/A0.h;R2.sk=sk;[R2.x,R2.y]=r2Near(u*B0.w,v*B0.h);[R2.pet.x,R2.pet.y]=r2Near(R2.x+40,R2.y+6);R2.tgt=R2.pend=null;R2.cx=R2.cy=null;}
function r2Move(dt){let ix=0,iy=0;const free=!DLG.open&&started&&!uiOpen();
  if(R2.act){r2ActInput(dt,R2);return;}
  if(R2.rest){R2.rest.t+=dt;const any=keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright||Math.hypot(STK.x,STK.y)>.3;if(any&&R2.rest.t>.8)r2Rest(false);P.moving=0;return;}
  if(free){if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;ix+=STK.x;iy+=STK.y;}
  const H=r2H(R2.y);const run=(keys.shift||touchRun);const spW=H*1.35,sp=spW*(run?1.9:1);let tx=0,ty=0;
  if(Math.hypot(ix,iy)>.1){R2.tgt=R2.pend=null;const l=Math.max(1,Math.hypot(ix,iy));tx=ix/l*sp;ty=iy/l*sp*.78;}
  else if(R2.tgt&&free){const dx=R2.tgt[0]-R2.x,dy=R2.tgt[1]-R2.y,d=Math.hypot(dx,dy);
    if(d<12||(R2.stuck||0)>.5){R2.tgt=null;R2.stuck=0;const s=R2.pend;R2.pend=null;if(s){R2.view=/離開小屋|回到小屋|出門|離開教室|離開便利商店|離開操場|離開學校|往操場/.test(s.def[0])?0:2;R2.vx=R2.vy=0;s.act();}}
    else{const k=Math.min(sp,d*6)/d;tx=dx*k;ty=dy*k;}}
  const e=1-Math.exp(-dt*12);R2.vx=lerp(R2.vx,tx,e);R2.vy=lerp(R2.vy,ty,e);
  const nx=R2.x+R2.vx*dt,ny=R2.y+R2.vy*dt,ox=R2.x,oy=R2.y;
  if(r2Walk(nx,ny)){R2.x=nx;R2.y=ny;}else if(r2Walk(nx,R2.y)){R2.x=nx;R2.vy*=.5;}else if(r2Walk(R2.x,ny)){R2.y=ny;R2.vx*=.5;}else{R2.vx*=.3;R2.vy*=.3;}
  const moved=Math.hypot(R2.x-ox,R2.y-oy);if(R2.tgt&&moved<spW*dt*.05)R2.stuck=(R2.stuck||0)+dt;else R2.stuck=0;
  {const D_=r2D();if(D_&&D_.exits&&(R2.room==='gate'||R2.room==='field')){let inside=null;for(const k in D_.exits)if(r2Pip(R2.x,R2.y,D_.exits[k].polygon))inside=k;if(!inside)R2.exitArm=true;else if(R2.exitArm&&moved>0){R2.exitArm=false;R2.tgt=R2.pend=null;if(R2.room==='field'){if(inside==='to_gate')fieldLeave();else if(inside==='classroom_door'){CLS_FROM='field';clsEnter();}else if(inside==='to_lawn')fieldLawn();}else if(inside==='to_map')gateLeave();else{gateOff();fieldEnter('gate');}}}}
  const spd=moved/Math.max(dt,1e-4);R2.spd=spd/spW;P.moving=R2.spd*3.9;
  if(spd>spW*.12){const ax=Math.abs(R2.vx),ay=Math.abs(R2.vy)/.78;
    if(R2.view===1?ax>ay*.6:ax>ay*1.25){R2.view=1;R2.flip=R2.vx<0?-1:1;}else R2.view=R2.vy<0?2:0;}
  R2.ph+=dt*7.3*Math.min(2,R2.spd);R2.step+=dt*R2.spd;if(R2.step>.34){R2.step=0;SND.step('wood');}
  // pet follows
  const Q=R2.pet;if(PETOBJ&&PETOBJ.spr){const side=R2.view===1?-R2.flip:(Q.x<R2.x?-1:1);const gx=R2.x+side*H*.42,gy=R2.y-8;
    const dx=gx-Q.x,dy=gy-Q.y,d=Math.hypot(dx,dy),busy=PETOBJ.trick||PETOBJ.anim;
    if(!busy&&(d>H*.5||(Q.mv&&d>H*.12))){const ps=Math.max(spd*1.05,H*1.2),st=Math.min(ps*dt,d);let px=Q.x+dx/d*st,py=Q.y+dy/d*st;
      if(!r2Walk(px,py)){if(r2Walk(px,Q.y))py=Q.y;else if(r2Walk(Q.x,py))px=Q.x;else{px=Q.x;py=Q.y;}}Q.x=px;Q.y=py;Q.mv=true;Q.idle=0;if(Math.abs(dx)>4)Q.flip=dx<0?-1:1;Q.back=Q.back?(dy<0&&-dy/.78>Math.abs(dx)*.8):(dy<0&&-dy/.78>Math.abs(dx)*1.25);Q.ph+=dt*10;}
    else{Q.mv=false;Q.idle+=dt;}
    if(Q.wag>0)Q.wag-=dt;else if(!Q.mv&&Q.idle>2&&Q.idle<7&&Math.random()<dt*.25)Q.wag=1.2;}}
function r2Nearest(){if(R2.rest){R2.near=null;return null;}let best=null,bd=1e9;const H=r2H(R2.y);
  for(const s of r2Spots()){const d=Math.hypot(s.def[1]-R2.x,(s.def[2]-R2.y)*1.2);const r=(/離開小屋|回到小屋|出門|離開教室|離開便利商店|離開操場|離開學校|往操場/.test(s.def[0])?H*.5:H*.3)*(IS_TOUCH?1.5:1);if(d<r&&d<bd){bd=d;best=s;}}
  R2.near=best;return best?{label:best.label,act:best.act}:null;}
function r2Cover(g,im,x,y,w,h){if(!im||!im.width)return;const s=Math.max(w/im.width,h/im.height),sw=w/s,sh=h/s;g.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,x,y,w,h);}
function r2RR(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const R2PH=TPHOTOS.map(s=>{const i=new Image();i.src=s;return i;});
const R2WM={};
function r2Night(g,C){const m=C.win&&C.win.mask,im=m&&R2.img[m[2]];if(!im||!im.complete||!im.width)return;let c=R2WM[m[2]];
  if(!c){c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.fillStyle='#16204a';q.fillRect(0,0,c.width,c.height);q.fillStyle='#fff8d8';
    for(let i=0;i<16;i++)q.fillRect((i*97)%c.width,(i*53)%Math.max(1,c.height*.55),2.4,2.4);q.beginPath();q.arc(c.width*.78,c.height*.2,Math.max(3,c.width*.03),0,7);q.fill();
    q.globalCompositeOperation='destination-in';q.drawImage(im,0,0);R2WM[m[2]]=c;}
  g.drawImage(c,m[0],m[1]);}
function r2Photo(g,im,r,q){if(!im||!im.complete||!im.width)return;if(!q){r2Cover(g,im,r[0],r[1],r[2],r[3]);return;}
  const c=document.createElement('canvas');c.width=Math.round(r[2]*3);c.height=Math.round(r[3]*3);r2Cover(c.getContext('2d'),im,0,0,c.width,c.height);s2Quad(g,c,q);}
function r2Slots(g){const C=TROOM[R2.sk],sl=C.slots;
  const nt=S.night||0;if(nt>.02){g.save();g.globalAlpha=Math.min(1,nt*.9);r2Night(g,C);g.restore();}
  [['left_frame_1',0],['left_frame_2',1]].forEach(([k,i])=>{const r=sl[k];if(r)r2Photo(g,R2PH[i],r,C.quads&&C.quads[k]);});
  {const r=sl.corkboard,b=TC.boardCanvas;if(r&&b){const [x,y,w,h]=r,p=w*.06;const s=Math.min((w-2*p)/b.width,(h-2*p)/b.height),dw=b.width*s,dh=b.height*s,dx=x+(w-dw)/2,dy=y+(h-dh)/2;
    g.save();g.shadowColor='rgba(60,30,10,.35)';g.shadowBlur=6;g.shadowOffsetY=3;g.fillStyle='#fffaf0';g.fillRect(dx-3,dy-3,dw+6,dh+6);g.restore();g.drawImage(b,dx,dy,dw,dh);
    g.fillStyle='#d8574a';[[dx+6,dy+2],[dx+dw-6,dy+2]].forEach(([px,py])=>{g.beginPath();g.arc(px,py,Math.max(3,w*.018),0,7);g.fill();});}}
  {const r=sl.calendar;if(r){const c=calCanvas();g.drawImage(c,r[0]+r[2]*.06,r[1]+r[3]*.06,r[2]*.88,r[3]*.88);}}}
// slots painted on a piece of furniture: redrawn right after that furniture's occluder
function r2SlotOwned(g,k){if(R2.room==='mart'){martSign(g,k);return;}if(k==='computer')r2Computer(g);else if(k==='pink_frame')r2Pink(g);}
function r2Pink(g){const r=TROOM[R2.sk].slots.pink_frame;if(!r)return;const [x,y,w,h]=r;g.save();g.fillStyle='#fff6ee';g.fillRect(x+w*.1,y+h*.1,w*.8,h*.8);g.textAlign='center';g.textBaseline='middle';
  const n=TS()?annDays():null;if(n!=null){g.fillStyle='#e0708e';g.font=`900 ${h*.5}px ${FG}`;g.fillText('♥',x+w/2,y+h*.5);}
  else{g.fillStyle='#f0a0b8';g.beginPath();g.arc(x+w/2,y+h*.45,w*.22,0,7);g.fill();g.fillStyle='#f6d36a';g.beginPath();g.arc(x+w/2,y+h*.45,w*.09,0,7);g.fill();}g.restore();}
function r2Computer(g){const r=TROOM[R2.sk].slots.computer;if(!r)return;const [x,y,w,h]=r;g.save();const gr=g.createLinearGradient(x,y,x+w,y+h);g.textAlign='center';g.textBaseline='middle';
  if(POM.run){const left=Math.max(0,(POM.end-Date.now())/1000);gr.addColorStop(0,'#3a1c1c');gr.addColorStop(1,'#1c1010');g.fillStyle=gr;g.fillRect(x,y,w,h);
    g.fillStyle='#ff7a6a';g.font=`800 ${h*.42}px ${FG}`;g.fillText(fmtT(left),x+w/2,y+h*.45);g.font=`600 ${h*.17}px ${FG}`;g.fillStyle='#f4c0b0';g.fillText('🍅 '+(POM_MODES[POM.mode]||['專注'])[0],x+w/2,y+h*.8);}
  else if(WO.run&&TS()){gr.addColorStop(0,'#123a2a');gr.addColorStop(1,'#0c2018');g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='#7fe0a8';g.font=`800 ${h*.4}px ${FG}`;g.fillText(fmtT(woEl()),x+w/2,y+h*.45);g.font=`600 ${h*.17}px ${FG}`;g.fillText('運動中',x+w/2,y+h*.8);}
  else{gr.addColorStop(0,'#5fa8d8');gr.addColorStop(1,'#f3c69a');g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='rgba(255,255,255,.92)';g.font=`700 ${h*.24}px ${FG}`;g.fillText('汐見町',x+w/2,y+h*.5);}
  g.restore();}
/* ================================================================
   Student room v2 (small & cosy painted room) — runs on the 2D room engine (R2.room='home')
   ================================================================ */
const HR={rects:[]};
function hrSolve(A,b){const n=b.length;for(let i=0;i<n;i++){let m=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
    for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i];}return x;}
function hrHomog(src,dst){const A=[],b=[];for(let i=0;i<4;i++){const [x,y]=src[i],[X,Y]=dst[i];A.push([x,y,1,0,0,0,-x*X,-y*X]);b.push(X);A.push([0,0,0,x,y,1,-x*Y,-y*Y]);b.push(Y);}const h=hrSolve(A,b);return [...h,1];}
function hrAp(H,x,y){const w=H[6]*x+H[7]*y+H[8];return [(H[0]*x+H[1]*y+H[2])/w,(H[3]*x+H[4]*y+H[5])/w];}
function hrH(sk){const D=TROOM.home[sk];if(!D._H){const src=[[0,0],[3,0],[3,3.5],[0,3.5]];D._H=hrHomog(src,D.quad);D._Hi=hrHomog(D.quad,src);}return D;}
// model (furniture data) x∈[-3.1,3.1], z∈[-2.7,2.7]  ↔  painted floor plane 3 m × 3.5 m
function hrPt(sk,x,z){const D=hrH(sk);return hrAp(D._H,(x+3.1)/6.2*3,(z+2.7)/5.4*3.5);}
function hrInv(sk,X,Y){const D=hrH(sk);const [u,v]=hrAp(D._Hi,X,Y);return [u/3*6.2-3.1,v/3.5*5.4-2.7];}
function hrHh(sk,Y){const a=TROOM.home[sk].hh;return lerp(a[2],a[3],clamp((Y-a[0])/(a[1]-a[0]),0,1));}
const HRCFG={};
function hrCfg(sk){if(HRCFG[sk])return HRCFG[sk];const D=TROOM.home[sk],A=D.acc,O=D.obounds,bb=P=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;P.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);});return [x0,y0,x1-x0,y1-y0];};
  const sl=bb(D.slot);
  return HRCFG[sk]={hA:D.hh,zoom:sk==='portrait'?1.15:1.2,spots:[
    ['床',A.bed[0],A.bed[1],O.bed_end,'躺在床上休息一下',()=>homeSleep()],
    ['書桌',A.desk[0],A.desk[1],O.desk_front,'書桌：翻開家具型錄',()=>openDecor('shop')],
    ['集章板',A.desk[0]+(sk==='portrait'?60:40),A.desk[1]+4,sl,'看看我的集章卡',()=>openCard()],
    ['窗台',A.window_seat[0],A.window_seat[1],O.window_seat,'坐在窗邊看風景',()=>say(null,[pick(['窗外的風輕輕吹進來，好舒服。','坐在窗台上看外面，天空好漂亮。','窗邊的抱枕軟軟的，好想在這裡看書。'])],{noWave:1})],
    ['書櫃',A.bookcase[0],A.bookcase[1],O.bookcase_front,'看看我的收藏',()=>{const bx=O.bookcase_front[0]+O.bookcase_front[2]/2;if(r2ActPlay('i.reach',{flip:bx<R2.x?-1:1,cb:()=>homeCollection()}))return;homeCollection();}],
    ['懶骨頭',A.beanbag[0],A.beanbag[1],O.beanbag,'窩進懶骨頭看書',()=>{const B=O.beanbag;if(r2ActPlay('d.read',{at:[B[0]+B[2]*.5,B[1]+B[3]*.5],foot:B[1]+B[3]*.92,flip:B[0]+B[2]/2<R2.x?-1:1,over:((D.occ||[]).find(o=>o.id==='beanbag')||{sort:B[1]+B[3]}).sort+1})){toast('窩在懶骨頭裡看書……（動一下就會起來）');if(W.pet){W.pet.mood=Math.min(100,(W.pet.mood||0)+3);}return;}say(null,['軟綿綿的懶骨頭，整個人陷進去了～','（休息一下，精神好多了！）'],{noWave:1});if(W.pet){W.pet.mood=Math.min(100,(W.pet.mood||0)+3);}}],
    ['寵物窩',D.pet.access[0],D.pet.access[1],O.pet_bed,'寵物窩',()=>W.pet?openPetMenu():say(null,['這是寵物窩。以後養了寵物，牠就會在這裡睡覺。'],{noWave:1})],
    ['出門',D.exit.center[0],D.exit.center[1],bb(D.exit.polygon),'出門',()=>exitHome()]]};}
function hrEnter(wake){R2.act=null;hurry(/rooms\/(home|furniture)\//);if(S2.on)s2Off();R2.on=true;R2.room='home';R2.rest=null;R2.sk=r2Scene();const D=TROOM.home[R2.sk];
  const H0=VISIT?null:homeState();if(H0&&!H0.room2){W.home.room2=1;W.home.items=[];try{applyHome();refreshHomeDecor();rebuildHomeCols();}catch(e){}save();}
  const sp=wake?D.acc.bed:D.exit.spawn;[R2.x,R2.y]=r2Near(sp[0],sp[1]);R2.vx=R2.vy=0;R2.view=wake?0:2;R2.flip=1;R2.tgt=R2.pend=null;R2.cx=R2.cy=null;
  const P2=R2.pet;[P2.x,P2.y]=r2Near(R2.x+hrHh(R2.sk,R2.y)*.4,R2.y+4);P2.idle=0;P2.mv=false;P2.flip=-1;R2.cv.hidden=false;}
// placed catalogue furniture stands on the floor: keep feet out of it
function hrFree(x,y){const sk=R2.sk;for(const it of HOME.items){const d=it.d;if(it._skip||d.wall||d.k==='rug'||!it.f||!it.f.fp)continue;const [X,Y]=hrPt(sk,d.x,d.z),s=hrHh(sk,Y)/1.62,r=Math.max(it.f.fp[0],it.f.fp[1])*s*.5;
  if(((x-X)/r)**2+((y-Y)/(r*.42))**2<1)return false;}return true;}
function hrBack(g,C){const H=homeState(),sk=R2.sk;
  const wid=WALL_ID[H.wall]||'ivory',fid=FLOOR_ID[H.floor]||'natural_wood';
  if(wid!=='ivory'&&C.wall[wid]){const im=R2.img[`home_${sk}_wall_${wid}`];if(im&&im.complete)g.drawImage(im,C.wall[wid][0],C.wall[wid][1]);}
  if(fid!=='natural_wood'&&C.floor[fid]){const im=R2.img[`home_${sk}_floor_${fid}`];if(im&&im.complete)g.drawImage(im,C.floor[fid][0],C.floor[fid][1]);}
  const nt=S.night||0;if(nt>.02){g.save();C.win.panes.forEach(P=>{g.beginPath();P.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.globalAlpha=nt*.78;g.fillStyle='#16204a';g.fill();
      g.save();g.clip();g.globalAlpha=nt;g.fillStyle='#fff6d0';for(let i=0;i<10;i++){const x=P[0][0]+((i*53)%97)/97*(P[1][0]-P[0][0]),y=P[0][1]+((i*31)%61)/61*(P[2][1]-P[0][1])*.7;g.fillRect(x,y,2.6,2.6);}g.restore();});g.restore();}
  {const b=HOME.boardCanvas,P=C.slot;if(b){const x0=Math.min(...P.map(p=>p[0])),y0=Math.min(...P.map(p=>p[1])),x1=Math.max(...P.map(p=>p[0])),y1=Math.max(...P.map(p=>p[1]));const w=x1-x0,h=y1-y0,k=Math.min(w/b.width,h/b.height)*.94;g.drawImage(b,x0+(w-b.width*k)/2,y0+(h-b.height*k)/2,b.width*k,b.height*k);}}
  hrWallArt(g,C);}
// student room v3: the blank poster frame and the wall calendar are filled in by the game
const HWA={};
function calCanvas(){const d=new Date(),key=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();if(HWA.ck!==key){HWA.ck=key;const c=HWA.cal||(HWA.cal=document.createElement('canvas'));c.width=200;c.height=500;const q=c.getContext('2d');
      q.fillStyle='#fbf4e6';q.fillRect(0,0,200,500);q.fillStyle='#365e50';q.fillRect(0,0,200,120);q.fillStyle='#f8eedc';q.font=`900 92px ${FG}`;q.textAlign='center';q.textBaseline='middle';q.fillText(String(d.getMonth()+1),100,64);
      const first=new Date(d.getFullYear(),d.getMonth(),1).getDay(),days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();q.font=`700 22px ${FG}`;
      for(let n=1;n<=days;n++){const k=first+n-1,cx=18+(k%7)*27.5,cy=160+Math.floor(k/7)*62;if(n===d.getDate()){q.fillStyle='#b96854';q.beginPath();q.arc(cx,cy,15,0,7);q.fill();q.fillStyle='#fff';}else q.fillStyle=(k%7===0)?'#b96854':'#4e3b2b';q.fillText(String(n),cx,cy);}}return HWA.cal;}
function hrWallArt(g,C){
  if(C.calendar){s2Quad(g,calCanvas(),C.calendar);}
  if(C.poster){if(!HWA.pos){const c=HWA.pos=document.createElement('canvas');c.width=180;c.height=460;const q=c.getContext('2d');
      let gr=q.createLinearGradient(0,0,0,300);gr.addColorStop(0,'#8fc6e6');gr.addColorStop(1,'#dff0f4');q.fillStyle=gr;q.fillRect(0,0,180,460);
      q.fillStyle='#6f9fb3';q.beginPath();q.moveTo(0,250);q.quadraticCurveTo(60,190,120,235);q.quadraticCurveTo(150,215,180,240);q.lineTo(180,300);q.lineTo(0,300);q.fill();
      [['#2f7fa8',290],['#3d93b8',330],['#58a9c4',370]].forEach(([c_,y])=>{q.fillStyle=c_;q.fillRect(0,y,180,460-y);});
      q.fillStyle='#e9dcc0';q.beginPath();q.moveTo(0,420);q.quadraticCurveTo(90,395,180,425);q.lineTo(180,460);q.lineTo(0,460);q.fill();
      q.fillStyle='#f8eedc';q.fillRect(112,170,30,130);q.fillStyle='#b96854';[180,222,264].forEach(y=>q.fillRect(112,y,30,18));q.fillStyle='#4e3b2b';q.fillRect(108,150,38,22);q.fillStyle='#f0c771';q.fillRect(116,155,22,12);q.fillStyle='#b96854';q.beginPath();q.moveTo(104,152);q.lineTo(127,128);q.lineTo(150,152);q.fill();
      q.fillStyle='#fff';q.globalAlpha=.85;q.beginPath();q.ellipse(46,70,26,10,0,0,7);q.ellipse(66,64,18,9,0,0,7);q.fill();q.globalAlpha=1;
      q.fillStyle='#4e3b2b';q.font=`900 30px ${FG}`;q.textAlign='center';q.fillText('汐見町',70,40);q.strokeStyle='#be8952';q.lineWidth=8;q.strokeRect(4,4,172,452);}
    s2Quad(g,HWA.pos,C.poster);}}
function hrItems(g,L){HR.rects=[];const sk=R2.sk,night=S.night||0;HOME.items.filter(it=>it.d.wall).forEach(it=>hrFurn(g,it,sk,night));
  HOME.items.filter(it=>!it.d.wall).forEach(it=>{const [,Y]=hrPt(sk,it.d.x,it.d.z);L.push([it.d.k==='rug'?-1e9:Y,()=>hrFurn(g,it,sk,night)]);});
  if(HOME.edit&&HOME.sel)L.push([1e9,()=>{const r=HR.rects.find(x=>x.it===HOME.sel);if(r){g.save();g.strokeStyle='#f2c14e';g.lineWidth=5;g.setLineDash([14,9]);g.strokeRect(r.r[0]-6,r.r[1]-6,r.r[2]+12,r.r[3]+12);g.restore();}}]);}
function hrFurn(g,it,sk,night){const id=FURN_SPR[it.d.k],f=id&&HROOM.furn[id];const im=f&&h2Img('f_'+id);if(!im)return;const d=it.d;let X,Y,s,ax,ay;
  if(d.wall){if(d.wall!=='wb')return;const D=hrH(sk);const [bx,by]=hrAp(D._H,(d.u+3.1)/6.2*3,0);s=D.hh[2]/1.62;X=bx;Y=by-(d.y||1.75)*s;const wa=f.wa||[256,256];ax=wa[0];ay=wa[1];}
  else{[X,Y]=hrPt(sk,d.x,d.z);s=hrHh(sk,Y)/1.62;ax=256;ay=512;}
  const k=s/256,fl=!d.wall&&(d.r||0)%2?-1:1,bb=f.bb;g.save();g.translate(X,Y);g.scale(fl,1);
  if(f.gbb){const gi=h2Img('g_'+id);if(gi){g.globalAlpha=.55+.45*night;g.drawImage(gi,(f.gbb[0]-ax)*k,(f.gbb[1]-ay)*k,(f.gbb[2]-f.gbb[0])*k,(f.gbb[3]-f.gbb[1])*k);g.globalAlpha=1;}}
  if(!d.wall&&d.k!=='rug'){g.fillStyle='rgba(40,20,10,.18)';g.beginPath();g.ellipse(0,-2*k,(bb[2]-bb[0])*k*.42,(bb[2]-bb[0])*k*.08,0,0,7);g.fill();}
  g.drawImage(im,(bb[0]-ax)*k,(bb[1]-ay)*k,(bb[2]-bb[0])*k,(bb[3]-bb[1])*k);g.restore();
  const rx=fl<0?X-(bb[2]-ax)*k:X+(bb[0]-ax)*k;HR.rects.push({it,r:[rx,Y+(bb[1]-ay)*k,(bb[2]-bb[0])*k,(bb[3]-bb[1])*k]});}
function hrClick(X,Y){const H=homeState(),sk=R2.sk,D=hrH(sk);
  if(!HOME.pending){const hit=HR.rects.slice().reverse().find(r=>X>=r.r[0]&&X<=r.r[0]+r.r[2]&&Y>=r.r[1]&&Y<=r.r[1]+r.r[3]);HOME.sel=hit?hit.it:null;if(hit&&A.ready)SND.pick&&SND.pick();renderDecor();return;}
  const f=FURN_BY[HOME.pending.k];const backY=hrAp(D._H,1.5,0)[1];let d;
  if(f.type==='wall'){if(Y>backY-20){toast('這個要掛在牆上喔');return;}const inP=(P,pad)=>{const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);return X>Math.min(...xs)-pad&&X<Math.max(...xs)+pad&&Y>Math.min(...ys)-pad&&Y<Math.max(...ys)+pad;};
    if(inP(D.win.polygon,30)){toast('這裡是窗戶，換個地方掛吧');return;}if(inP(D.slot,30)){toast('這裡是集章板，換個地方吧');return;}if((D.poster&&inP(D.poster,20))||(D.calendar&&inP(D.calendar,20))){toast('這裡已經有東西了，換個地方吧');return;}
    const p0=hrAp(D._H,0,0),p1=hrAp(D._H,3,0);const u=clamp((X-p0[0])/(p1[0]-p0[0]),0,1)*6.2-3.1,y=(backY-Y)/(D.hh[2]/1.62);d={k:f.k,wall:'wb',u:Math.round(u*4)/4,y:Math.round(clamp(y,.9,2.8)*4)/4};}
  else{const keep=HOME.pending.it;if(keep){keep._skip=1;}const ok=R2.room==='home'&&r2D().walk.some(w=>r2Pip(X,Y,w.outer))&&(f.k==='rug'||hrFree(X,Y));if(keep)keep._skip=0;
    if(!ok){toast('放在地板空的地方喔');return;}const [cx,cz]=hrInv(sk,X,Y);d={k:f.k,x:Math.round(clamp(cx,-3.1,3.1)*20)/20,z:Math.round(clamp(cz,-2.7,2.7)*20)/20,r:HOME.pending.it?HOME.pending.it.d.r||0:0};}
  if(HOME.pending.it){const it=HOME.pending.it;Object.keys(it.d).forEach(k=>delete it.d[k]);Object.assign(it.d,d);placeItemGroup(it.g,it.d);HOME.sel=it;}
  else{H.items.push(d);HOME.sel=spawnItem(d);}
  HOME.pending=null;rebuildHomeCols();save();SND.pick&&A.ready&&SND.pick();renderDecor();}
// ---- lying down in the cabin bed (bed-rest pack): pillow dent + sleeping head + blanket, no change of time of day
function sleepHead(c){const im=c&&c.mat&&c.mat.map&&c.mat.map.image;if(!im)return null;if(c._sh&&c._sh.src===im)return c._sh.cv;const M=c.meta,cw=M.cw,ch=M.ch;
  const F=typeof FACES!=='undefined'&&FACES&&FACES.chars[c.id]?FACES.chars[c.id].front:null;const y1=F?F.y1:ch*.36,y0=F?F.y0:ch*.18;const hb=Math.min(ch,Math.round(y1+(y1-y0)*.62));
  const cv=document.createElement('canvas');cv.width=cw;cv.height=hb;cv.band=y1-y0;const g=cv.getContext('2d');g.drawImage(im,0,0,cw,hb,0,0,cw,hb);
  const fin=()=>{c._sh={src:im,cv};};
  if(F&&F.pieces&&F.pieces.eyes){const i=F.cells.indexOf(0);if(i>=0){loadImg(F.pieces.eyes).then(pc=>{g.drawImage(pc,i*cw,0,cw,F.y1-F.y0,0,F.y0,cw,F.y1-F.y0);
      const Mx=F.M[0],a=F.anc[0]&&F.anc[0].eyes;if(Mx&&a){g.save();g.setTransform(Mx[0],Mx[3],Mx[1],Mx[4],Mx[2],Mx[5]);g.strokeStyle='#3a2418';g.lineCap='round';g.lineWidth=a.w*.035;
        [-1,1].forEach(s=>{const x=a.x+s*a.w*.27,y=a.y+a.w*.02;g.beginPath();g.arc(x,y-a.w*.05,a.w*.085,PI*.2,PI*.8);g.stroke();});g.restore();}}).catch(()=>{});}}
  fin();return cv;}
function r2Rest(on){if(on){if(!TROOM||!TROOM.rest)return;fadeTo(()=>{R2.rest={t:0,qt:!!QT.open};if(QT.open){QT.open=false;renderQuests();}const RS=R2.room==='cabin'?TROOM.rest[R2.sk]:null;if(RS){R2.x=RS.head[0];R2.y=RS.body.feet[1]+40;R2.cx=null;}else if(R2.room==='home'&&TROOM.home[R2.sk].rest2){const D_=TROOM.home[R2.sk];R2.x=D_.rest2.face[0];R2.y=D_.acc.bed[1];R2.cx=null;}R2.tgt=R2.pend=null;R2.vx=R2.vy=0;SND.pick&&SND.pick();});setTimeout(()=>toast('躺下來休息一下……（動一下就會起床）'),700);
    if(W.pet){W.pet.mood=Math.min(100,(W.pet.mood||0)+5);}return;}
  fadeTo(()=>{if(R2.rest&&R2.rest.qt){QT.open=true;renderQuests();}R2.rest=null;const d=(R2.room==='home'?hrCfg(R2.sk):R2CFG[R2.sk]).spots.find(s=>s[0]==='床');if(d)[R2.x,R2.y]=r2Near(d[1],d[2]);R2.view=0;toast('休息好了，精神滿滿！');});}
// the student's own bed has no drawn rest layers: lay the sleeping head (the cabin set's six heads) on the pillow and tuck it under the
// painted sheet by redrawing the sheet/quilt over it (clip to the area below the fold line)
// student room v3: the pack's own rest layers (pillow dent, six sleeping heads, blanket) are drawn after the bed occluder
// lying in the student's own bed: layers drawn for THIS bed (pillow pressed in, the sleeping head, the quilt pulled up to the chin with a body under it)
function hrRest2(g,sk,H,t){const D=TROOM.home[sk]&&TROOM.home[sk].rest2;if(!D)return false;const gi=e=>{const im=e&&R2.img[e[2]];return im&&im.complete&&im.width?im:null;};
  const pd=gi(D.pillow_dent),bl=gi(D.blanket_front);if(!pd||!bl)return false;g.drawImage(pd,D.pillow_dent[0],D.pillow_dent[1]);
  const HN={hero1:'01',sailor:'02',hoodie:'03',sporty:'04',green:'05',redcap:'06'}[SPR.c&&SPR.c.id],he=HN&&D.heads[HN],hi=gi(he),h1=D.heads['01'],i1=gi(h1);
  const box=hi?[he[0],he[1],hi.width,hi.height]:[h1[0],h1[1],i1?i1.width:150,i1?i1.height:140];
  if(hi)g.drawImage(hi,he[0],he[1]);else{const hd=sleepHead(SPR.c||spr2d());if(hd){const k=box[2]/hd.width,w=hd.width*k,h=hd.height*k;g.drawImage(hd,box[0],box[1]+box[3]-h,w,h);}}
  const b=Math.sin(t*1.6)*.006,cy=D.blanket_front[1]+bl.height;g.save();g.translate(0,cy);g.scale(1,1+b);g.translate(0,-cy);g.drawImage(bl,D.blanket_front[0],D.blanket_front[1]);g.restore();
  if(H&&H.front){const oc=(r2D().occ||[]).find(o=>o.id==='bed_end'),oi=oc&&R2.img[oc.file];if(oi&&oi.complete){g.save();g.beginPath();H.front.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();g.drawImage(oi,oc.x,oc.y);g.restore();}}
  for(let k=0;k<3;k++){const p=((t*.45+k/3)%1);g.save();g.globalAlpha=Math.sin(p*PI)*.9;g.fillStyle='#fff';g.strokeStyle='rgba(60,40,90,.6)';g.lineWidth=3;g.font=`900 ${22+p*18}px ${FG}`;
    const x=box[0]+box[2]*.85+p*50,y=box[1]+10-p*90;g.strokeText('Z',x,y);g.fillText('Z',x,y);g.restore();}
  return true;}
function hrRestDraw(g){hrRest2(g,R2.sk,null,R2.rest.t);}
function r2RestDraw(g,RS){const pi=R2.img[RS.pillow_dent[2]],bl=R2.img[RS.blanket_front[2]];if(pi&&pi.complete)g.drawImage(pi,RS.pillow_dent[0],RS.pillow_dent[1]);
  const HN={hero1:'01',sailor:'02',hoodie:'03',sporty:'04',green:'05',redcap:'06'}[SPR.c&&SPR.c.id],ph=HN&&RS.heads&&RS.heads[HN],pim=ph&&R2.img[ph[2]];
  if(pim&&pim.complete&&pim.width){const br=Math.sin(R2.rest.t*1.6)*.006;g.save();g.translate(RS.head[0],RS.head[1]);g.rotate(br);g.translate(-RS.head[0],-RS.head[1]);g.drawImage(pim,ph[0],ph[1]);g.restore();}
  else{const hd=sleepHead(SPR.c);if(hd){const k=RS.hh*.66/(hd.band||hd.height*.4);const w=hd.width*k,h=hd.height*k;const br=Math.sin(R2.rest.t*1.6)*.012;
    g.save();g.translate(RS.head[0],RS.head[1]);g.rotate(RS.rot*PI/180+br);g.drawImage(hd,-w/2,-h*.58,w,h);g.restore();}}
  if(bl&&bl.complete){g.save();const s=1+Math.sin(R2.rest.t*1.6)*.006;g.translate(RS.body.hips[0],RS.body.hips[1]);g.scale(1,s);g.translate(-RS.body.hips[0],-RS.body.hips[1]);g.drawImage(bl,RS.blanket_front[0],RS.blanket_front[1]);g.restore();}
  const t=R2.rest.t;for(let k=0;k<3;k++){const p=((t*.45+k/3)%1);g.save();g.globalAlpha=Math.sin(p*PI)*.9;g.fillStyle='#fff';g.strokeStyle='rgba(60,40,90,.6)';g.lineWidth=3;g.font=`900 ${22+p*18}px ${FG}`;
    const x=RS.head[0]+30+p*50,y=RS.head[1]-40-p*90;g.strokeText('Z',x,y);g.fillText('Z',x,y);g.restore();}}
// ---- actions inside the painted rooms (2D): same sheets and sequences as outside
// o: flip (-1 faces left), at:[x,y] seat point (seated frames are placed by their seat anchor), dur, hold, cb (when it ends), until:'move'
function r2ActPlay(name,o={},E=R2){const D=SPR.c&&actDef(name);if(!D||!D.sid||!SPRITES[D.sid])return false;let a=D.a;if(o.noref&&a.keys)a=NOREF(a);
  const A={name,sid:D.sid,M:SPRITES[D.sid],a,t:0,i:0,el:0,over:o.over!=null?o.over:null,flip:o.flip||1,at:o.at||null,foot:o.foot||null,back:o.at?[E.x,E.y]:null,dur:o.dur||0,hold:!!o.hold,held:false,cb:o.cb||null,im:null};
  loadImg(A.M.src).then(im=>{A.im=im;}).catch(()=>{if(E.act===A)r2ActStop(E);});E.act=A;E.tgt=E.pend=null;E.vx=E.vy=0;if(o.at){E.x=o.at[0];E.y=o.foot||o.at[1];}return true;}
function r2ActStop(E=R2){const A=E.act;if(!A)return;E.act=null;if(A.back){E.x=A.back[0];E.y=A.back[1];}if(A.cb)A.cb();}
function r2ActTick(dt,E=R2){const A=E.act;if(!A||!A.im)return;A.t+=dt;A.el+=dt;if(A.dur&&A.el>A.dur){r2ActStop(E);return;}const a=A.a;
  if(!A.held)while(A.t>a.d[A.i]){A.t-=a.d[A.i];A.i++;if(A.i>=a.f.length){if(a.loop)A.i=0;else if(A.hold){A.i=a.f.length-1;A.held=true;break;}else{r2ActStop(E);return;}}}}
// returns true once it drew (until the sheet has loaded the normal sprite keeps showing)
function r2ActDraw(g,E=R2){const A=E.act;if(!A||!A.im)return false;const M=A.M,f=A.a.f[A.i],key=M.keys[f];const x=A.at?A.at[0]:E.x,y=A.at?A.at[1]:E.y;
  const H=(E===R2?r2H:s2H)(A.foot||y),dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch,k=dh/M.ch;const [sx,sy]=fxy(M,f);
  let ax=M.cw/2,ay=M.ch-(M.foot!=null?M.foot:3);const sa=A.at&&M.seat_anchor&&M.seat_anchor[key];if(sa){ax=sa[0];ay=sa[1];}
  g.save();g.translate(x,y);if(!A.at){g.fillStyle='rgba(40,20,10,.28)';g.beginPath();g.ellipse(0,0,dw*.26,dw*.07,0,0,7);g.fill();}
  g.scale(/_side/.test(key)?A.flip:1,1);g.drawImage(A.im,sx,sy,M.cw,M.ch,-ax*k,-ay*k,dw,dh);g.restore();return true;}
// walking input ends a room action (after a short moment, so the tap that started it doesn't end it)
function r2ActInput(dt,E){r2ActTick(dt,E);const any=keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright||Math.hypot(STK.x,STK.y)>.3;
  if(E.act&&any&&!DLG.open&&!uiOpen()&&E.act.el>.5)r2ActStop(E);P.moving=0;}
function r2Human(g){if(R2.act&&r2ActDraw(g))return;const c=spr2d();if(!c)return;const M=c.meta,im=c.mat.map.image;const H=r2H(R2.y),dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;const v=R2.view,moving=R2.spd>.15;
  const list=v===0?M.fw:v===1?M.sw:M.bw;let f=v;if(moving&&list&&list.length===4){f=list[Math.floor(((R2.ph*1.3/(PI*2))%1+1)%1*4)];}
  const br=moving?1:1+Math.sin(R2.t*2.2)*.008;
  g.save();g.translate(R2.x,R2.y);g.fillStyle='rgba(40,20,10,.28)';g.beginPath();g.ellipse(0,0,dw*.26,dw*.07,0,0,7);g.fill();
  g.scale(v===1?R2.flip:1,br);const [sx,sy]=fxy(M,f);g.drawImage(im,sx,sy,M.cw,M.ch,-dw/2,-dh+(M.foot!=null?M.foot:3)/M.ch*dh,dw,dh);g.restore();}
function r2Pet(g){const o=PETOBJ;if(!o||!o.spr||!o.spr.ready||!o.spr.mat.map)return;const c=o.spr,M=c.meta,A_=M.act||{},im=c.mat.map.image,Q=R2.pet;
  const H=r2H(Q.y)*.42,dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;let f=0,flip=1,rz=0;
  const dtp=o._r2t!=null?Math.min(.1,Math.max(0,R2.t-o._r2t)):0;o._r2t=R2.t;
  if(o.anim&&o.anim.type==='seq'&&M.anims&&M.anims[o.anim.name]){o.anim.t+=dtp;const S_=M.anims[o.anim.name];if(o.anim.t>o.anim.dur){o.anim=null;}else{let t=o.anim.t,i=0;while(i<S_.f.length-1&&t>S_.d[i]){t-=S_.d[i];i++;}f=S_.f[i];}}
  else if(o.trick||o.anim){f=c.frame;rz=c.pivot.rotation.z;flip=Math.sign(c.m.scale.x)||1;}
  else if(Q.mv&&Q.back&&M.bw){f=Math.sin(Q.ph)>0?M.bw[0]:M.bw[1];}   // walking up the picture = away from the viewer: back frames
  else if(Q.mv){f=A_.run_1!=null?A_['run_'+(Math.floor(Q.ph%4)+1)]:(Math.sin(Q.ph)>0?1:2);flip=Q.flip;}
  else if(Q.idle>16&&A_.sleep!=null)f=A_.sleep;else if(Q.idle>8&&A_.lie!=null)f=A_.lie;else if(Q.wag>0&&A_.wag_A!=null)f=Math.floor(Q.wag*6)%2?A_.wag_B:A_.wag_A;
  g.save();g.translate(Q.x,Q.y);g.fillStyle='rgba(40,20,10,.24)';g.beginPath();g.ellipse(0,0,dw*.28,dw*.07,0,0,7);g.fill();
  if(rz){g.translate(0,-dh*.35);g.rotate(-rz);g.translate(0,dh*.35);}g.scale(flip,1);const [sx,sy]=fxy(M,f);g.drawImage(im,sx,sy,M.cw,M.ch,-dw/2,-dh+(M.foot!=null?M.foot:3)/M.ch*dh,dw,dh);g.restore();}
function r2Mirror(g,x,y,w,h){g.save();g.fillStyle='rgba(40,20,10,.25)';g.beginPath();g.ellipse(x+w/2,y+h,w*.6,w*.12,0,0,7);g.fill();
  g.fillStyle='#8a5a32';g.beginPath();g.ellipse(x+w/2,y+h*.42,w/2,h*.42,0,0,7);g.fill();const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,'#dff1f7');gr.addColorStop(.5,'#b9d9e6');gr.addColorStop(1,'#e9f5f8');
  g.fillStyle=gr;g.beginPath();g.ellipse(x+w/2,y+h*.42,w/2-6,h*.42-6,0,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=4;g.beginPath();g.moveTo(x+w*.3,y+h*.2);g.lineTo(x+w*.45,y+h*.12);g.stroke();
  g.fillStyle='#6e4228';g.fillRect(x+w/2-4,y+h*.8,8,h*.2);g.fillRect(x+w*.15,y+h-6,w*.7,8);g.restore();}
function r2Sort(o,x){if(!o.line)return o.sort;const [[x1,y1],[x2,y2]]=o.line;const t=clamp((x-x1)/((x2-x1)||1),0,1);return lerp(y1,y2,t);}
// the teacher's dog 蝴蝶 trots around the cabin, naps, and wags when you pet it
const CDOG={x:0,y:0,tx:0,ty:0,t:2,st:'idle',pose:'sit',flip:1,wag:0,img:null,ok:false,ph:0,sk:null};
function cdogSid(){return SPRITES.ani_hudie_f0?'ani_hudie_f'+hudieFur():'ani_maltese';}
function cdogTick(dt){CDOG.hide=!!(W.pet&&W.pet.kind==='dog'&&(W.pet.coat==='maltese'||W.pet.coat==='hudie'));if(CDOG.hide||!R2.on||R2.room!=='cabin'||!SPRITES[cdogSid()])return;const D=r2D();if(!D)return;
  if(CDOG.ok!==cdogSid()){const sid=cdogSid();CDOG.ok=sid;loadImg(SPRITES[sid].src).then(im=>{if(CDOG.ok===sid)CDOG.img=im;}).catch(()=>{});}
  if(CDOG.sk!==R2.sk){CDOG.sk=R2.sk;[CDOG.x,CDOG.y]=r2Near(D.w*.32,D.h*.8);CDOG.st='idle';CDOG.t=2;}
  CDOG.t-=dt;if(CDOG.wag>0)CDOG.wag-=dt;const H=r2H(CDOG.y);
  if(CDOG.st==='walk'){const dx=CDOG.tx-CDOG.x,dy=CDOG.ty-CDOG.y,d=Math.hypot(dx,dy);
    if(d<6||CDOG.t<0){CDOG.st='idle';CDOG.t=rr(3,8);CDOG.pose=pick(['sit','sit','lie','sleep','wag']);}
    else{const sp=Math.min(d,H*.7*dt),nx=CDOG.x+dx/d*sp,ny=CDOG.y+dy/d*sp;if(r2Walk(nx,ny)){CDOG.x=nx;CDOG.y=ny;}else CDOG.t=-1;if(Math.abs(dx)>3)CDOG.flip=dx<0?-1:1;CDOG.ph+=dt*9;}}
  else if(CDOG.t<0&&CDOG.wag<=0){const [x,y]=r2Near(rr(D.w*.12,D.w*.88),rr(D.h*.5,D.h*.95));CDOG.tx=x;CDOG.ty=y;CDOG.st='walk';CDOG.t=9;}}
function cdogDraw(g){const M=SPRITES[cdogSid()],im=CDOG.img;if(!M||!im)return;const A=M.act||{};let f=0,fl=1;
  if(CDOG.st==='walk'){f=Math.sin(CDOG.ph)>0?1:2;fl=CDOG.flip;}else if(CDOG.wag>0&&A.wag_A!=null)f=Math.floor(CDOG.wag*6)%2?A.wag_B:A.wag_A;
  else if(CDOG.pose==='lie'&&A.lie!=null)f=A.lie;else if(CDOG.pose==='sleep'&&A.sleep!=null)f=A.sleep;else if(CDOG.pose==='wag'&&A.wag_A!=null)f=Math.floor(R2.t*5)%2?A.wag_B:A.wag_A;
  const H=r2H(CDOG.y)*.5,dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;g.save();g.translate(CDOG.x,CDOG.y);g.fillStyle='rgba(40,20,10,.22)';g.beginPath();g.ellipse(0,0,dw*.26,dw*.06,0,0,7);g.fill();
  g.scale(fl,1);const [sx,sy]=fxy(M,f);g.drawImage(im,sx,sy,M.cw,M.ch,-dw/2,-dh+(M.foot!=null?M.foot:4)/M.ch*dh,dw,dh);g.restore();}
function cdogSpot(){if(R2.room!=='cabin'||!CDOG.img||CDOG.hide)return null;const H=r2H(CDOG.y)*.5;
  return {def:['蝴蝶',CDOG.x+(CDOG.x<R2.x?H*.35:-H*.35),CDOG.y+3,[CDOG.x-H*.45,CDOG.y-H*.75,H*.9,H*.8]],it:null,label:'摸摸蝴蝶（老師的狗）',
    act:()=>{CDOG.wag=2.6;CDOG.st='idle';CDOG.t=3;CDOG.pose='wag';SND.pick&&SND.pick();say('蝴蝶',[pick(['蝴蝶搖著尾巴，在你腳邊轉了一圈。','蝴蝶舔了舔你的手，好癢！','蝴蝶翻過身來，想要你摸摸肚子。','蝴蝶是老師的狗，最喜歡在窗邊曬太陽。'])],{noWave:1});}};}
function r2Draw(dt){R2.t+=dt;cdogTick(dt);const cv=R2.cv,g=R2.g;const dpr=Math.min(1.5,devicePixelRatio||1);const cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);
  if(!cw||!ch)return;if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
  const sk=r2Scene();if(sk!==R2.sk)r2Swap(sk);const C=r2D(),Wi=C.w,Hi=C.h,BATH=R2.room==='bath',HOMER=R2.room==='home',CLS=R2.room==='class';
  let s=Math.max(cw/Wi,ch/Hi)*r2C().zoom,vw=cw/s,vh=ch/s;
  const wantX=clamp(R2.x-vw/2,0,Wi-vw),wantY=clamp(R2.y-r2H(R2.y)*.5-vh/2,0,Hi-vh);
  if(R2.cx==null){R2.cx=wantX;R2.cy=wantY;}else{const e=1-Math.exp(-dt*4);R2.cx=lerp(R2.cx,wantX,e);R2.cy=lerp(R2.cy,wantY,e);}
  if(HOMER&&HOME.edit&&!$('decor').hidden){const port=sk==='portrait',aw=port?cw:cw*.64,ah=port?ch*.58:ch;s=Math.min(aw/Wi,ah/Hi);R2.cx=-(aw/s-Wi)/2;R2.cy=-(ah/s-Hi)/2;R2.edited=true;}else if(R2.edited){R2.edited=false;R2.cx=wantX;R2.cy=wantY;}
  R2.view_={s:s/dpr,ox:R2.cx,oy:R2.cy};
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#2a1a10';g.fillRect(0,0,cw,ch);g.setTransform(s,0,0,s,-R2.cx*s,-R2.cy*s);g.imageSmoothingQuality='medium';
  const bg=R2.img[C.bgkey||((BATH?'bath_':HOMER?'home_':CLS?'class_':R2.room==='mart'?'mart_':'')+R2.sk+'_bg')];if(bg&&bg.complete)g.drawImage(bg,0,0,Wi,Hi);
  if(HOMER)hrBack(g,C);else if(R2.room==='mart')martSign(g,'sign_counter');else if(R2.room==='field')fieldSign(g);else if(!BATH&&!CLS&&R2.room!=='field'&&R2.room!=='gate')r2Slots(g);
  const L=[];if(HOMER)hrItems(g,L);if(R2.room==='mart')L.push([MCLERK.pos[R2.sk][1],()=>martClerk(g)]);const RS=R2.rest&&R2.room==='cabin'&&TROOM.rest?TROOM.rest[R2.sk]:null;if(RS){const ob=C.occ.find(o=>o.id==='bed');L.push([(ob?r2Sort(ob,R2.x):R2.y)+.5,()=>r2RestDraw(g,RS)]);}const HRS=R2.rest&&R2.room==='home';if(HRS){const sb=(C.occ.find(o=>o.id==='bed_end')||{sort:R2.y}).sort;L.push([sb+.5,()=>hrRestDraw(g)]);}
  C.occ.forEach(o=>{const im0=R2.img[o.file];const side=(R2.room==='home'||R2.room==='cabin')&&!(RS&&o.id==='bed')&&!o.line&&im0&&im0.width&&(R2.x<o.x+im0.width*.12||R2.x>o.x+im0.width*.88);L.push([side?-1e9:r2Sort(o,R2.x),()=>{const im=R2.img[o.file];if(im&&im.complete)g.drawImage(im,o.x,o.y);const ow=C.own&&C.own[o.id];if(ow)ow.forEach(k=>r2SlotOwned(g,k));}]);});
  if(R2.room==='cabin'&&CDOG.img&&!CDOG.hide)L.push([CDOG.y,()=>cdogDraw(g)]);if(!RS&&!HRS)L.push([R2.act&&R2.act.over!=null?R2.act.over:R2.y,()=>r2Human(g)]);if(PETOBJ)L.push([R2.pet.y,()=>r2Pet(g)]);L.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
  const nt=(R2.room==='mart'||R2.room==='gate'||R2.room==='field')?0:(S.night||0);if(nt>.02){g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(120,110,170,${nt*.35})`;g.fillRect(0,0,Wi,Hi);g.restore();}
  const n=R2.near;if(n&&!/離開小屋|回到小屋|出門|離開教室|離開便利商店|離開操場|離開學校|往操場/.test(n.def[0])&&!DLG.open){const h=n.def[3],mx=h[0]+h[2]/2,my=Math.max(R2.cy+30,h[1]-8)+Math.sin(R2.t*4)*6,sz=r2H(R2.y)*.07;
    g.save();g.fillStyle='#fff';g.strokeStyle='rgba(60,30,10,.6)';g.lineWidth=sz*.18;g.beginPath();g.moveTo(mx-sz,my-sz*1.3);g.lineTo(mx+sz,my-sz*1.3);g.lineTo(mx,my);g.closePath();g.stroke();g.fill();g.restore();}}

/* ================================================================
   Opening cutscene (in-engine): 燈塔熄滅的那一夜
   ================================================================ */
var CUTON=false;
const CUT={q:[],T:0,shot:-1,built:false,replay:false,snap:null,sub:'',rainT:0,windT:0,shake:0,flash:0,black:1,wait:false,ended:false,act:{},fx:{},save:{}};
const CUT_SUBJ=['國語','英文','自然','社會','音樂','健康'];
const CUT_COL=CUT_SUBJ.map(s=>subjStyle(s).c);
const PDX=300,PDZ=480; // 平等 platform set (cutscene only)
(function(){const d=document.createElement('div');d.id='cut';d.hidden=true;
  d.innerHTML=`<div class="ct-black"></div><div class="ct-flash"></div>
  <div class="ct-sub"><b class="ct-who"></b><span class="ct-txt"></span></div>
  <div class="ct-ticket"><div class="tk-in">
    <div class="tk-face tk-front"><div class="tk-top"><span>乘車券</span><small>特別列車</small></div>
      <div class="tk-route"><b>平等</b><i>→</i><b>汐見町</b></div>
      <div class="tk-row"><span>乘客</span><b class="tk-name"></b></div><div class="tk-row"><span>發車</span><b>今晚</b></div>
      <div class="tk-no">No. 000001　・　只限本人</div></div>
    <div class="tk-face tk-back"><p>汐見町需要你。</p><p class="tk-sig">——燈塔守護者</p></div></div></div>
  <div class="ct-mission"><div class="ms-k">任務</div><h2>找回 6 枚印章，<br>讓燈塔重新亮起來！</h2>
    <div class="ms-slots">${CUT_SUBJ.map((s,i)=>`<div class="ms-s" style="--c:${CUT_COL[i]}"><i>${s[0]}</i><span>${s}</span></div>`).join('')}</div>
    <div class="ms-hid"><b>？？？</b>隱藏任務：找出燈塔守護者</div>
    <button type="button" class="btn primary ms-go">出發！</button></div>
  <button type="button" class="ct-skip">跳過 ▸▸</button>`;
  document.body.appendChild(d);d.querySelector('.ct-skip').onclick=()=>cutEnd();d.querySelector('.ms-go').onclick=()=>cutEnd();})();

/* ---------- props (built on first play) ---------- */
function cutBuild(){if(CUT.built)return;CUT.built=true;const F=CUT.fx;
  // rain
  {const N=1300,pos=new Float32Array(N*6);F.rainO=[];for(let i=0;i<N;i++)F.rainO.push([rand()*44-22,rand()*28,rand()*44-22,.7+rand()*.6]);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
    F.rain=new T.LineSegments(g,new T.LineBasicMaterial({color:col('#a9c2dc'),transparent:true,opacity:.42,fog:true,depthWrite:false}));F.rain.frustumCulled=false;F.rain.visible=false;scene.add(F.rain);}
  // the big wave (bezier profile swept along x)
  {const su=56,sv=26,Wd=84,H=19,pos=[],cl=[],idx=[];const c0=col('#041219'),c1=col('#1b566b'),c2=col('#d8eef4');
    const prof=(s,hk)=>{const a=(1-s)*(1-s),b=2*(1-s)*s,c=s*s,cu=Math.max(0,(s-.8)/.2);return [a*-14+b*-3+c*8+cu*2.5,a*-4+b*H*1.4*hk+c*H*.6*hk-cu*cu*H*.25*hk];};
    F.waveProf=prof;F.waveH=H;
    for(let j=0;j<=sv;j++){const s=j/sv;for(let i=0;i<=su;i++){const u=i/su,hk=1-.4*Math.pow(2*u-1,2)+.07*Math.sin(u*17);const [z,y]=prof(s,hk);pos.push((u-.5)*Wd,y,z);
      const cc=s<.78?c0.clone().lerp(c1,s/.78):s<.9?c1.clone().lerp(c2,(s-.78)/.12):c2;cl.push(cc.r,cc.g,cc.b);}}
    for(let j=0;j<sv;j++)for(let i=0;i<su;i++){const a=j*(su+1)+i,b=a+1,c=a+su+1,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(cl,3));g.setIndex(idx);g.computeVertexNormals();
    F.wave=new T.Group();F.wave.visible=false;scene.add(F.wave);F.waveMat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,opacity:.97,fog:true,emissive:col('#0a2a36'),emissiveIntensity:.6});
    const wm=new T.Mesh(g,F.waveMat);wm.frustumCulled=false;F.wave.add(wm);
    F.foam=[];const fm=new T.SpriteMaterial({map:glowTex,color:col('#f4fbff'),transparent:true,opacity:.5,depthWrite:false,fog:true});
    for(let i=0;i<70;i++){const u=i/69,hk=1-.4*Math.pow(2*u-1,2);const [z,y]=prof(.9,hk);const s=new T.Sprite(fm);s.position.set((u-.5)*Wd*.96,y,z+.4);s.scale.setScalar(3+rand()*2.4);s.userData.b=s.position.clone();s.userData.p=rand()*6;F.wave.add(s);F.foam.push(s);}
    // glowing eyes inside the wave
    const [ez,ey]=prof(.56,1);F.eyes=[];
    [-1,1].forEach(sd=>{const m=new T.SpriteMaterial({map:glowTex,color:col('#9ff4ff'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,depthTest:false,opacity:0,fog:false});
      const o=new T.Sprite(m);o.userData.lp=new T.Vector3(-17+sd*3.8,ey-1.2,ez+1.6);scene.add(o);
      const cm=new T.SpriteMaterial({map:glowTex,color:col('#fff6c8'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,depthTest:false,opacity:0,fog:false});const c=new T.Sprite(cm);o.renderOrder=c.renderOrder=9;scene.add(c);F.eyes.push([o,c]);});}
  // spray burst
  {F.spray=[];const m=new T.SpriteMaterial({map:glowTex,color:col('#dfeef4'),transparent:true,opacity:.6,depthWrite:false,fog:true});
    for(let i=0;i<36;i++){const s=new T.Sprite(m);s.visible=false;scene.add(s);F.spray.push({s,v:new T.Vector3()});}}
  // lighthouse beam + big lamp glow
  {const bm=new T.MeshBasicMaterial({color:col('#fff0c2'),transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:true});
    const bg=new T.ConeGeometry(5.5,70,20,1,true);bg.translate(0,-35,0);bg.rotateZ(PI/2);
    F.beam=new T.Group();F.beam.position.set(75,8.6,-104.5);F.beam.visible=false;scene.add(F.beam);F.beamMat=bm;F.beam.add(new T.Mesh(bg,bm));const b2=new T.Mesh(bg,bm);b2.rotation.y=PI;F.beam.add(b2);
    F.lampGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffd98a'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));F.lampGlow.position.set(75,8.6,-104.5);F.lampGlow.scale.setScalar(12);scene.add(F.lampGlow);}
  // six stamp orbs + trails
  F.orbs=CUT_COL.map((c,i)=>{const m=new T.SpriteMaterial({map:glowTex,color:col(c),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0,fog:false});
    const s=new T.Sprite(m);s.scale.setScalar(3.6);scene.add(s);const core=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffffff'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0,fog:false}));core.scale.setScalar(1.3);scene.add(core);
    const tr=[];for(let k=0;k<7;k++){const t=new T.Sprite(m.clone());t.scale.setScalar(1.7-k*.2);scene.add(t);tr.push(t);}
    const a=-1.25+i*.5;return {s,core,tr,hist:[],to:new T.Vector3(75+Math.sin(a)*70,6+rand()*6,-40+Math.cos(a)*22+rand()*16),up:10+rand()*8};});
  // the ticket (3D, flies in through the window)
  {const [c,g]=C2(256,144);g.fillStyle='#fbf3df';g.fillRect(0,0,256,144);g.fillStyle='#c8432b';g.fillRect(0,0,256,30);g.fillStyle='#fff';g.font=`800 18px ${FG}`;g.textBaseline='middle';g.fillText('乘車券',12,16);
    g.fillStyle='#3a2a20';g.font=`800 30px ${FG}`;g.fillText('平等 → 汐見町',16,74);g.strokeStyle='#c8432b';g.setLineDash([6,5]);g.lineWidth=2;g.strokeRect(6,36,244,100);
    const m=new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide,toneMapped:false,transparent:true});F.ticket=new T.Group();F.ticket.visible=false;scene.add(F.ticket);
    mk(new T.PlaneGeometry(.34,.19),m,0,0,0,F.ticket,false);F.tkGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffe7a8'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:.9}));F.tkGlow.scale.setScalar(1.1);F.ticket.add(F.tkGlow);}
  // 平等 night platform set
  {const G=new T.Group();G.position.set(PDX,0,PDZ);G.visible=false;scene.add(G);F.pd=G;
    const gp=new T.PlaneGeometry(700,700);gp.rotateX(-PI/2);mk(gp,lam('#2a3a2e'),0,-.02,0,G,false);
    mk(bx(120,.24,3.6),lam('#4a4640'),0,.12,-4,G,false);[-.72,.72].forEach(dz=>mk(bx(120,.1,.09),lam('#9aa0a6'),0,.3,-4+dz,G,false));
    for(let x=-60;x<=60;x+=1.1)mk(bx(.26,.07,2.3),lam('#3a2e26'),x,.25,-4,G,false);
    mk(bx(48,.9,3.4),lam('#8d8a82'),0,.45,-.6,G);mk(bx(48,.02,.2),lam('#e8c228'),0,.91,-1.75,G,false);mk(bx(48,.05,.12),lam('#dcd8cc'),0,.9,-2.28,G,false);
    // roof over middle of platform
    // mountains
    [[-95,-90,40,32],[-40,-120,55,46],[20,-100,38,30],[80,-130,60,50],[140,-95,40,34],[-150,-120,48,40],[40,-170,70,64]].forEach(([x,z,r,h])=>{const m=mk(new T.ConeGeometry(r,h,7),lam('#1a2a33'),x,h/2-2,z,G,false);m.rotation.y=rand()*3;});
    for(let i=0;i<30;i++)pineTreeAt(G,rr(-70,70),rr(-18,-9),rr(.8,1.3));
    // lamps (turn on one by one)
    F.pdLamps=[];[-18,-10,-2,6,14].forEach(x=>{mk(cy(.06,.08,3.2,8),lam('#2c3238'),x,2.5,.9,G);mk(bx(.5,.12,.3),lam('#2c3238'),x,4.1,.75,G,false);
      const gm=new T.SpriteMaterial({map:glowTex,color:col('#ffd9a0'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0});const s=new T.Sprite(gm);s.position.set(x,3.95,.75);s.scale.setScalar(3.2);G.add(s);
      const pm=new T.MeshBasicMaterial({map:poolTex,color:col('#ffd9a0'),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:0});const p=new T.Mesh(poolGeo,pm);p.scale.set(2.8,1,2.8);p.position.set(x,.93,.2);G.add(p);F.pdLamps.push([gm,pm]);});
    // station name board
    {const [c,g]=C2(512,160);g.fillStyle='#f6f4ee';g.fillRect(0,0,512,160);g.fillStyle='#2f6b56';g.fillRect(0,112,512,48);g.fillStyle='#1c1c1c';g.font=`800 70px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('平 等',256,52);
      g.font=`500 20px ${FG}`;g.fillText('Píngděng Station',256,95);g.fillStyle='#f6f4ee';g.font=`700 22px ${FG}`;g.textAlign='right';g.fillText('汐見町 →',496,137);
      const m=new T.MeshLambertMaterial({map:TX(c),emissive:0xffffff,emissiveMap:TX(c),emissiveIntensity:.35});mk(new T.PlaneGeometry(2.4,.75),m,-7,2.3,.9,G,false);[-8.1,-5.9].forEach(x=>mk(cy(.05,.05,1.9,6),lam('#2c3238'),x,1.85,.88,G));}
    // flip timetable
    {const [c,g]=C2(512,220);F.flipC=c;F.flipG=g;F.flipT=TX(c);mk(bx(2.3,1.05,.12),lam('#1a1a1e'),2.2,2.75,1.02,G,false);
      const m=new T.MeshBasicMaterial({map:F.flipT,toneMapped:false});mk(new T.PlaneGeometry(2.16,.93),m,2.2,2.75,1.09,G,false);[1.3,3.1].forEach(x=>mk(cy(.05,.05,2.3,6),lam('#2c3238'),x,1.55,1.02,G,false));
      F.flipLast='';}
    // bench
    mk(bx(2.2,.08,.45),lam('#9a7652'),9,1.35,.6,G);mk(bx(2.2,.4,.06),lam('#9a7652'),9,1.6,.82,G);
    // the night train (a copy of the town's train)
    F.pdTrain=TRAIN.g.clone(true);F.pdTrain.position.set(150,0,-4);F.pdTrain.traverse(o=>{if(o.isSprite)o.visible=true;});G.add(F.pdTrain);try{inkTown(G);}catch(e){}}
  // signpost for the cat (汐見駅 platform)
  {const g=new T.Group();g.position.set(53.3,.9,-35.2);g.visible=false;scene.add(g);F.post=g;mk(cy(.07,.08,1.5,8),lam('#7a5a3a'),0,.75,0,g);
    const board=(txt,y,ry,colr)=>{const [c,x]=C2(256,64);x.fillStyle=colr;x.fillRect(0,0,256,64);x.fillStyle='#fff8e8';x.font=`800 30px ${FG}`;x.textAlign='center';x.textBaseline='middle';x.fillText(txt,128,34);
      const m=mk(new T.BoxGeometry(.95,.24,.05),[lam('#6a4a2e'),lam('#6a4a2e'),lam('#6a4a2e'),lam('#6a4a2e'),new T.MeshLambertMaterial({map:TX(c)}),new T.MeshLambertMaterial({map:TX(c)})],.3,y,0,g,false);m.rotation.y=ry;};
    board('神秘小島 →',1.32,.3,'#3f7d8a');board('瀑布 ↑',1.04,-.5,'#4f7d4a');board('？？？ ←',.76,.9,'#8a4a4a');mk(bx(.3,.06,.3),lam('#6a4a2e'),0,1.52,0,g,false);try{inkTown(g);}catch(e){}}
  // warm light in the cabin window (someone is home)
  {F.cabGlow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col('#ffcf88'),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));const p=cyWorld(0,3.4);F.cabGlow.position.set(p.x,CY.y+2.2,p.z);F.cabGlow.scale.setScalar(4);scene.add(F.cabGlow);}
  // actors
  const A_=CUT.act;const mkA=(id,h)=>{if(!SPRITES[id])return null;const c=makeSpr(id,h);sprShow(c,false);return c;};
  A_.guard=mkA('guard',1.7);A_.grandpa=mkA('grandpa',1.6);A_.fisher=mkA('fisher',1.72);A_.cat=mkA('cat_tama',.5);}
function pineTreeAt(G,x,z,s){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);G.add(g);mk(cy(.12,.16,1.4,6),lam('#2e2218'),0,.7,0,g,false);
  [[1.3,1.8,1.6],[1,1.5,2.6],[.7,1.2,3.4]].forEach(([r,h,y])=>mk(new T.ConeGeometry(r,h,7),lam('#16271f'),0,y,0,g,false));}

/* ---------- helpers ---------- */
const cE=t=>t<0?0:t>1?1:t*t*(3-2*t);
const cL=(a,b,t)=>a+(b-a)*t;
function cutCamSet(p,l,fov=50){const port=camera.aspect<1;let sx=0,sy=0;if(CUT.shake>0){sx=(Math.random()-.5)*CUT.shake;sy=(Math.random()-.5)*CUT.shake;}
  camera.position.set(p[0]+sx,p[1]+sy,p[2]);camera.lookAt(l[0]+sx*.5,l[1]+sy*.5,l[2]);const f=port?Math.min(82,fov*1.45):fov;if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix();}camera.updateMatrixWorld();}
function cutCamLerp(t,A,B,fov){const k=cE(t);cutCamSet([cL(A[0],B[0],k),cL(A[1],B[1],k),cL(A[2],B[2],k)],[cL(A[3],B[3],k),cL(A[4],B[4],k),cL(A[5],B[5],k)],fov);}
function cutPlayer(show,x,y,z,yaw,walk){if(SPR.c)sprShow(SPR.c,show);else pl.g.visible=show;if(!show)return;P.pos.set(x,y,z);pl.g.position.set(x,y,z);pl.g.rotation.y=yaw;P.yaw=yaw;P.moving=walk?3.1:0;if(walk)P.ph+=walk;}
function cutHuman(c,show,x,y,z,yaw,walkPh){if(!c)return;sprShow(c,show);if(!show||!c.ready)return;CUT.q.push(()=>sprPose(c,new T.Vector3(x,y,z),yaw,walkPh||0,walkPh?1:0,time));}
function cutCat(show,x,y,z,frame,flip){const c=CUT.act.cat;if(!c)return;sprShow(c,show);if(!show||!c.ready)return;CUT.q.push(()=>{camRel(c,new T.Vector3(x,y,z),0);sprFrame(c,frame);c.m.scale.set(flip||1,1,1);c.pivot.position.y=0;c.pivot.rotation.z=0;});}
function cutEnv(kind){const s=S;
  if(kind==='storm'){blendState(PS.night,PS.night,1,s);s.fog.set(col('#0c1524'));s.fogNear=4;s.fogFar=150;s.clouds=1;s.cloudDark.set(col('#05070d'));s.cloudLit.set(col('#1c2436'));s.stars=0;s.disk=0;s.glow=.1;s.exposure=1.25;s.hemiI=.5;s.seaDeep.set(col('#02060c'));s.seaShallow.set(col('#0a1a28'));s.lamps=.25;s.windows=.5;}
  else if(kind==='night'){blendState(PS.night,PS.night,1,s);s.fogFar=420;s.hemiI=.95;s.exposure=1.45;}
  else if(kind==='mist'){blendState(PS.day,PS.sunset,.22,s);s.fog.set(col('#dde5e8'));s.fogNear=10;s.fogFar=170;s.clouds=.75;s.lamps=0;s.windows=.05;s.exposure=.95;s.sprTint.set(col('#fff6ee'));}
  else if(kind==='mistfar'){cutEnv('mist');s.fogNear=24;s.fogFar=330;}
  else if(kind==='day'){blendState(PS.day,PS.day,1,s);}
  envK=1;envFrom=envTo=kind==='storm'||kind==='night'?PS.night:PS.day;}
function cutSub(who,txt){const k=who+'|'+txt;if(k===CUT.sub)return;CUT.sub=k;const e=$('cut').querySelector('.ct-sub');e.classList.remove('on');
  if(!txt)return;setTimeout(()=>{if(CUT.sub!==k)return;e.querySelector('.ct-who').textContent=who||'';e.querySelector('.ct-who').hidden=!who;e.querySelector('.ct-txt').textContent=txt;e.classList.add('on');},who||txt?60:0);}
const CUT_SUBS=[[8.4,11,'','那一夜，汐見町的燈塔熄了。'],[23.4,27.2,'','深夜的平等車站——時刻表上，突然多了一班車。'],[32.2,36.8,'站務員','這班車，一百年才來一次。上車吧，時間不多了。'],
  [43.6,47.9,'村田爺爺','燈塔的六枚印章，被那場大浪捲走了……散落在鎮上六個地方。'],[47.9,52.4,'健叔','沒有燈塔，霧一天比一天近。再這樣下去，汐見町會從地圖上消失。'],
  [52.8,55.6,'小玉','喵嗚——！'],[56,60,'','聽說，印章的線索，藏在小鎮的各個角落……'],[60.2,65.4,'','而那個寄車票給你的「燈塔守護者」……從來沒有人見過。']];
function cutSnd(fn){if(A.ready)try{fn(A.ctx.currentTime);}catch(e){}}
function cutThunder(){CUT.flash=1;cutSnd(t=>{nburst(t+.25,2.4,'lowpass',160,.7,.55,A.sfx,.45);nburst(t+.05,.5,'lowpass',900,.5,.25,A.sfx,.8);});}

/* ---------- shots ---------- */
const SHOTS=[
 {t0:0,t1:11,fade:1,enter(){const F=CUT.fx;cutEnv('storm');F.rain.visible=true;F.beam.visible=true;F.wave.visible=false;F.lampOn=1;F.orbT=-1;
    INDOOR=false;HOME_IN=false;ST_IN=false;cutPlayer(false);P.pos.set(74,.5,-86);},
  tick(t,dt){const F=CUT.fx;
    cutCamLerp(t/11,[73.2,3.2,-78,75,7.6,-104.5],[73.8,4.6,-88,75,8.4,-104.5],52);
    if(t>1.5&&!F.th1){F.th1=1;cutThunder();}
    // wave rises (3.2 -> 6.2) then crashes
    const r=cE((t-3.2)/3),cr=cE((t-6.2)/1.1);F.wave.visible=t>3.1&&t<8.2;
    F.wave.position.set(75,SEA_Y-1+r*1,cL(-138,-121,r)+cr*10);F.wave.scale.set(1,.05+r*.95-cr*.7,1);F.wave.rotation.x=cr*.9;F.waveMat.opacity=.97-cE((t-7.1)/1)*.9;
    F.foam.forEach(s=>{const b=s.userData.b;s.position.set(b.x+Math.sin(time*3+s.userData.p)*.6,b.y+Math.sin(time*4+s.userData.p)*.35,b.z);});
    // eyes: open at 4.6, blink at 5.6, close at crash
    const open=cE((t-4.6)/.5)*(1-cE((t-6.3)/.3)),blink=Math.abs(t-5.7)<.12?.1:1;F.eyeOpen=open;F.eyes.forEach(([o,c])=>{o.material.opacity=open;F.wave.updateMatrixWorld(true);o.position.copy(o.userData.lp).applyMatrix4(F.wave.matrixWorld);c.position.copy(o.position);o.scale.set(7,2.6*open*blink+.01,1);c.material.opacity=open;c.scale.set(2.8,.9*open*blink+.01,1);});
    if(t>4.7&&!F.growl){F.growl=1;cutSnd(t0=>{tone(55,t0,1.6,'sawtooth',.06,A.sfx,42);nburst(t0,1.8,'lowpass',120,.8,.3,A.sfx,.4);});}
    if(t>6.2&&!F.crash){F.crash=1;cutThunder();CUT.shake=.35;cutSnd(t0=>nburst(t0,2.6,'lowpass',420,.7,.8,A.sfx,.6));
      F.spray.forEach(p=>{p.s.visible=true;p.s.position.set(75+rr(-8,8),rr(1,6),-104+rr(-6,4));p.v.set(rr(-6,6),rr(6,15),rr(-2,6));p.s.scale.setScalar(rr(.6,1.6));});F.orbT=0;
      cutSnd(t0=>[0,1,2,3,4,5].forEach(i=>tone([784,988,1175,1319,1568,1976][i],t0+.2+i*.11,.5,'sine',.05,A.sfx)));}
    CUT.shake=Math.max(0,CUT.shake-dt*.35);
    F.spray.forEach(p=>{if(!p.s.visible)return;p.v.y-=14*dt;p.s.position.addScaledVector(p.v,dt);if(p.s.position.y<-1)p.s.visible=false;});
    // orbs fly out of the lamp over the town
    if(F.orbT>=0){F.orbT+=dt;const L=new T.Vector3(75,8.6,-104.5);F.orbs.forEach((o,i)=>{const k=cE(Math.min(1,(F.orbT-i*.12)/2.4));const vis=F.orbT>i*.12&&k<1;
      const p=new T.Vector3().copy(L).lerp(o.to,k);p.y+=Math.sin(k*PI)*o.up;o.s.position.copy(p);o.core.position.copy(p);o.s.material.opacity=vis?1:0;o.core.material.opacity=vis?1:0;
      o.hist.unshift(p.clone());if(o.hist.length>14)o.hist.pop();o.tr.forEach((s,k2)=>{const h=o.hist[Math.min(o.hist.length-1,k2*2+1)];s.position.copy(h);s.material.opacity=vis?.55-k2*.07:0;});});}
    // lamp: bright, sweeping; flickers and dies after the crash
    let on=1;if(t>6.4){const k=t-6.4;on=k<2.2?(Math.sin(k*23)>.1?1-k/3:0.05):0;}F.lampOn=on;F.beam.rotation.y+=dt*1.1;
    if(t>8.6&&!F.dead){F.dead=1;cutSnd(t0=>{tone(220,t0,.5,'sine',.08,A.sfx,110);});}
    if(t>9.8&&!F.th2){F.th2=1;cutThunder();}}},
 {t0:11,t1:23,fade:1,enter(){const F=CUT.fx;F.rain.visible=false;F.beam.visible=false;F.lampOn=0;F.orbs.forEach(o=>{o.s.material.opacity=0;o.core.material.opacity=0;o.tr.forEach(s=>s.material.opacity=0);});F.spray.forEach(p=>p.s.visible=false);F.wave.visible=false;
    cutEnv('night');INDOOR=true;HOME_IN=true;ST_IN=false;try{applyHome();refreshHomeDecor();}catch(e){}F.ticket.visible=false;F.tk=0;$('cut').querySelector('.tk-name').textContent=W.name||'你';},
  tick(t,dt){const F=CUT.fx,px=HX+.35,pz=HZ-.5;
    const turned=t>5.2;cutPlayer(true,px,0,pz,turned?lerpAng(PI,0,cE((t-5.2)/.5)):PI,0);
    if(t<5.4)cutCamLerp(t/5.4,[HX+1.6,1.85,HZ+2.4,HX-.1,1.5,HZ-3],[HX+1.3,1.75,HZ+1.9,HX-.1,1.45,HZ-3],55);
    else{const port=camera.aspect<1;if(port)cutCamLerp((t-5.4)/6,[px+.4,1.55,pz+3.1,px,1.72,pz],[px+.3,1.5,pz+2.7,px,1.7,pz],48);else cutCamLerp((t-5.4)/6,[px+.6,1.45,pz+2.5,px-.95,1.2,pz],[px+.45,1.4,pz+2.1,px-.85,1.2,pz],48);}
    if(t>1.1&&!F.knock){F.knock=1;cutSnd(t0=>{[0,.26].forEach(d=>{tone(150,t0+d,.09,'triangle',.4,A.sfx);nburst(t0+d,.06,'lowpass',400,.6,.3,A.sfx);});});}
    // ticket flutters in from the window
    const k=(t-2.2)/2.6;F.ticket.visible=k>0&&t<6.2;if(F.ticket.visible){const kk=cE(Math.min(1,k));const a=new T.Vector3(HX-.1,1.65,HZ-2.9),b=new T.Vector3(px,1.12,pz+.28);
      F.ticket.position.copy(a).lerp(b,kk);F.ticket.position.x+=Math.sin(k*7)*.25*(1-kk);F.ticket.position.y+=Math.sin(k*9)*.12*(1-kk);F.ticket.rotation.set(Math.sin(k*6)*.6*(1-kk),Math.sin(k*4)*1.2*(1-kk)+(turned?0:PI),Math.sin(k*8)*.5*(1-kk));
      F.tkGlow.material.opacity=.8+Math.sin(time*6)*.15;if(!F.tkS){F.tkS=1;cutSnd(t0=>[1568,2093,2637,3136].forEach((f,i)=>tone(f,t0+i*.1,.6,'sine',.04,A.sfx)));}}
    const card=$('cut').querySelector('.ct-ticket');card.classList.toggle('on',t>6&&t<11.6);card.querySelector('.tk-in').classList.toggle('flip',t>8.6);
    if(t>8.6&&!F.flipS){F.flipS=1;cutSnd(t0=>nburst(t0,.18,'bandpass',2200,.8,.12,A.sfx));}}},
 {t0:23,t1:37,fade:1,enter(){const F=CUT.fx;$('cut').querySelector('.ct-ticket').classList.remove('on');F.ticket.visible=false;cutEnv('night');INDOOR=false;HOME_IN=false;F.pd.visible=true;F.pdTrain.position.x=150;F.pdLamps.forEach(([a,b])=>{a.opacity=0;b.opacity=0;});F.horn=0;},
  tick(t,dt){const F=CUT.fx,X=PDX,Z=PDZ;
    // flip board jumps, then settles on ??:??
    let txt;if(t<4.6){const q=Math.floor(t*9);txt=String((q*7+3)%24).padStart(2,'0')+':'+String((q*13+7)%60).padStart(2,'0');}else txt='??:??';
    if(txt!==F.flipLast){F.flipLast=txt;const g=F.flipG;g.fillStyle='#121216';g.fillRect(0,0,512,220);g.fillStyle='#f2c14e';g.font=`700 30px ${FG}`;g.textAlign='left';g.textBaseline='middle';g.fillText('下一班　開往 汐見町',22,36);
      g.fillStyle='#2a2a30';for(let i=0;i<5;i++)if(i!==2)g.fillRect(40+i*90,72,78,120);g.fillStyle='#ffb040';g.font=`800 104px ${FM}`;g.textAlign='center';[...txt].forEach((ch,i)=>g.fillText(ch,79+i*90,136));F.flipT.needsUpdate=true;
      if(t<4.6)cutSnd(t0=>nburst(t0,.03,'bandpass',3000,1,.08,A.sfx));}
    // lamps on one by one
    F.pdLamps.forEach(([a,b],i)=>{const k=cE((t-4.8-i*.45)/.15);a.opacity=k;b.opacity=k*.5;if(k>0&&!F['l'+i]){F['l'+i]=1;cutSnd(t0=>tone(1200,t0,.04,'square',.03,A.sfx));}});
    if(t>6.6&&F.horn<1){F.horn=1;SND.horn&&SND.horn();}if(t>8.6&&F.horn<2){F.horn=2;SND.horn&&SND.horn();}
    // train arrives (ease-out) 7.2 -> 11.4
    const k=cE((t-7.2)/4.2);F.pdTrain.position.x=cL(150,1,1-(1-k)*(1-k));if(t>7.2&&t<11.4&&(F.clk=(F.clk||0)-dt)<=0){F.clk=.34*(1+k);cutSnd(t0=>nburst(t0,.1,'lowpass',260,.8,.3*(1-k*.6),A.sfx));}
    // actors
    const pw=t>12.3?Math.min(1,(t-12.3)/1.5):0;cutPlayer(true,X-1.2,.9,Z-1.05-pw*.9,PI,pw>0&&pw<1?.2:0);
    cutHuman(CUT.act.guard,true,X+.9,.9,Z-.55,t>8.9?-PI/2-.5:PI*.15,0);
    const pb=camera.aspect<1?2.2:0;if(t<4.4)cutCamLerp(t/4.4,[X+2.2,2.55,Z+3.9+pb,X+2.2,2.72,Z+1],[X+2.2,2.6,Z+3.4+pb,X+2.2,2.74,Z+1],46);
    else if(t<9)cutCamLerp((t-4.4)/3.2,[X+2.4,2.6,Z+3.6,X+2,2.4,Z],[X+7.5,2.2,Z+3.6,X-1.5,1.5,Z-2.4],50);
    else cutCamLerp((t-9)/5,[X+.2,1.75,Z+2.9,X-.15,1.45,Z-1],[X,1.7,Z+2.4,X-.15,1.45,Z-1],46);
    P.pos.set(X,.9,Z);}},
 {t0:37,t1:42.6,fade:1,enter(){const F=CUT.fx;F.pd.visible=false;sprShow(CUT.act.guard,false);cutPlayer(false);cutEnv('mistfar');INDOOR=false;TRAIN.x=-128;TRAIN.dir=1;TRAIN.state='run';TRAIN.v=12;cutSnd(t0=>SND.gull&&SND.gull());},
  tick(t,dt){const tx=TRAIN.x;if(t<2.3)cutCamSet([-74,1.7,-26.6],[-130,2.6,-30.4],44);
    else{const k=cE((t-2.3)/3.3);cutCamSet([tx-7+k*9,cL(4.6,7.8,k),cL(-27.4,-28.8,k)],[tx+6+k*20,cL(2.2,-1.5,k),cL(-31,-95,k)],cL(48,55,k));}P.pos.set(tx,0,-30);
    if((CUT.fx.clk=(CUT.fx.clk||0)-dt)<=0){CUT.fx.clk=.3;cutSnd(t0=>{nburst(t0,.1,'lowpass',260,.8,.28,A.sfx);nburst(t0+.11,.08,'lowpass',240,.8,.2,A.sfx);});}}},
 {t0:42.6,t1:52.6,fade:1,enter(){cutEnv('mist');TRAIN.x=48;TRAIN.state='stop';TRAIN.stopT=40;TRAIN.v=0;TRAIN.dir=1;cutSnd(t0=>SND.chime&&SND.chime());},
  tick(t,dt){const w=cE(t/1.3);const px=cL(55.2,54.5,w),pz=cL(-32.5,-33.8,w);const face=t<1.3?PI:lerpAng(PI,-PI/2,cE((t-1.3)/.4));
    cutPlayer(true,px,.9,pz,face,t<1.3?.14:0);
    const g=cE((t-.4)/2.4),f=cE((t-.9)/2.5);cutHuman(CUT.act.grandpa,true,cL(47,52.6,g),.9,-34.4,PI/2,g<1&&g>0?t*6:0);cutHuman(CUT.act.fisher,true,cL(46,52.9,f),.9,-33.1,PI/2,f<1&&f>0?t*6:0);
    if(t<5.3)cutCamLerp(t/5.3,[57,2.3,-36.9,53.2,1.5,-33.7],[56.6,2.1,-36.6,53.4,1.5,-33.7],50);
    else cutCamLerp((t-5.3)/4.7,[56.4,1.85,-36.4,53.6,1.55,-33.6],[56,1.8,-36.1,53.7,1.55,-33.6],44);}},
 {t0:52.6,t1:56,fade:0,enter(){CUT.fx.post.visible=true;cutSnd(t0=>SND.meow&&SND.meow());},
  tick(t,dt){const A_=CUT.act.cat&&CUT.act.cat.meta.act||{};const j=cE((t-.5)/.6);const x=cL(52.4,53.3,j),z=cL(-34.7,-35.2,j),y=.9+j*1.55+Math.sin(j*PI)*.5;
    const fr=t<.5?0:j<1?(A_.jump!=null?A_.jump:0):(t>1.6?(Math.floor(t*5)%2?(A_.paw!=null?A_.paw:0):(A_.wag_A!=null?A_.wag_A:0)):0);cutCat(true,x,y,z,fr,-1);
    if(t>1.7&&!CUT.fx.meow2){CUT.fx.meow2=1;cutSnd(t0=>SND.meow&&SND.meow());}
    cutPlayer(true,54.5,.9,-33.8,-PI/2+.6,0);cutHuman(CUT.act.grandpa,true,52.6,.9,-34.4,PI/2,0);cutHuman(CUT.act.fisher,true,52.9,.9,-33.1,PI/2,0);
    cutCamLerp(t/3.4,[55.6,2.2,-37.4,53.3,2,-35.2],[55.2,2.4,-37,53.3,2.2,-35.2],44);}},
 {t0:56,t1:57.9,fade:0,enter(){cutPlayer(false);['grandpa','fisher','cat'].forEach(k=>CUT.act[k]&&sprShow(CUT.act[k],false));CUT.fx.post.visible=false;cutEnv('mistfar');
    CUT.save.tabs=(ADV.tabs||[]).map(tb=>[tb.gl.material.opacity,tb.m.emissiveIntensity]);(ADV.tabs||[]).forEach(tb=>{tb.gl.material.opacity=.7;tb.m.emissiveIntensity=.9;});},
  tick(t){cutCamLerp(t/1.9,[34,5.2,-147,34,2.4,-163],[34,4.4,-151,34,2.2,-163],46);P.pos.set(34,2,-156);}},
 {t0:57.9,t1:59.8,fade:0,enter(){(ADV.tabs||[]).forEach((tb,i)=>{const s=CUT.save.tabs&&CUT.save.tabs[i];if(s){tb.gl.material.opacity=s[0];tb.m.emissiveIntensity=s[1];}});},
  tick(t){cutCamLerp(t/1.9,[FALL.x+2.5,5.4,FALL.z-12.5,FALL.x,5.2,FALL.z+2],[FALL.x+1.5,5,FALL.z-9.5,FALL.x,5,FALL.z+2],48);P.pos.set(FALL.x,4,FALL.z-5);}},
 {t0:59.8,t1:61.5,fade:0,enter(){},tick(t){cutCamLerp(t/1.7,[-57.5,5.9,71,-66,5,85],[-59.3,5.6,74,-66.5,5,86],48);P.pos.set(-62,4,78);}},
 {t0:61.5,t1:65.6,fade:1,enter(){cutEnv('mist');S.fogNear=6;S.fogFar=90;},
  tick(t){const a=cyWorld(1.8,15),b=cyWorld(1,11.5),l=cyWorld(0,2);cutCamLerp(t/4.1,[a.x,CY.y+2.4,a.z,l.x,CY.y+2.4,l.z],[b.x,CY.y+2.2,b.z,l.x,CY.y+2.3,l.z],46);P.pos.set(b.x,CY.y,b.z);
    CUT.fx.cabGlow.material.opacity=.55+Math.sin(time*2.2)*.2;}},
 {t0:65.6,t1:1e9,fade:1,enter(){CUT.fx.cabGlow.material.opacity=0;cutEnv('mistfar');CUT.fx.lampOn=0;cutSnd(t0=>SND.wave&&SND.wave(null,.6));},
  tick(t){cutCamLerp(Math.min(1,t/7),[74.1,1.5,-92.5,75,8.1,-104.5],[74.5,3.1,-97,75,8.4,-104.5],50);P.pos.set(74.5,.5,-97);
    const m=$('cut').querySelector('.ct-mission');if(t>1.6&&!m.classList.contains('on')){m.classList.add('on');cutSnd(t0=>SND.chime&&SND.chime());}}}];

/* ---------- run / end ---------- */
function playOpening(opts={}){try{cutBuild();}catch(e){console.error(e);showStory(()=>{});return;}
  CUT.replay=!!opts.replay;CUT.T=0;CUT.shot=-1;CUT.sub='';CUT.ended=false;CUT.flash=0;CUT.shake=0;CUT.black=1;CUT.fx.th1=CUT.fx.th2=CUT.fx.crash=CUT.fx.dead=CUT.fx.growl=CUT.fx.knock=CUT.fx.tkS=CUT.fx.flipS=CUT.fx.meow2=0;for(let i=0;i<5;i++)CUT.fx['l'+i]=0;
  if(CLS_IN||FIELD_IN||MART_IN||GATE_IN){CLS_IN=FIELD_IN=MART_IN=GATE_IN=false;INDOOR=false;r2Off();}
  CUT.snap={f:{INDOOR,HOME_IN,CH_IN,TC_IN,ST_IN,MZ_IN,ISL_IN,CY_IN},p:P.pos.clone(),yaw:P.yaw,cy:cam.yaw,cp:cam.pitch,tod:todIdx,r2:R2.on,s2:S2.on,pet:PETOBJ?PETOBJ.g.visible:null};
  CUT.save.lampE=COAST.lampMat.emissive.clone();CUT.save.train={x:TRAIN.x,state:TRAIN.state,v:TRAIN.v,dir:TRAIN.dir,stopT:TRAIN.stopT,wait:TRAIN.wait};
  if(R2.on)r2Off();if(S2.on)s2Off();if(DLG.open)closeDlg();closeCabin&&closeCabin();CH_IN=TC_IN=MZ_IN=ISL_IN=CY_IN=false;
  if(PETOBJ)PETOBJ.g.visible=false;NPC_SPR.forEach(n=>sprShow(n.c,false));if(CYC.spr)CUT.save.cyc=true;CUTON=true;document.body.classList.add('cut','cine');const d=$('cut');d.hidden=false;d.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));d.querySelector('.tk-in').classList.remove('flip');
  if(A.ready){A.mus.gain.setTargetAtTime(0,A.ctx.currentTime,.3);}}
function cutCam(dt){if(!CUTON)return;CUT.T+=dt;let i=SHOTS.findIndex(s=>CUT.T>=s.t0&&CUT.T<s.t1);if(i<0)i=SHOTS.length-1;
  if(i!==CUT.shot){CUT.shot=i;try{cutReset();SHOTS[i].enter();}catch(e){console.error(e);}}
  const sh=SHOTS[i],lt=CUT.T-sh.t0;CUT.q=[];try{sh.tick(lt,dt);CUT.q.forEach(f=>f());}catch(e){console.error(e);}
  // black fades at shot boundaries
  const fin=sh.fade?Math.min(1,lt/.45):1,fout=(sh.fade&&SHOTS[i+1]&&SHOTS[i+1].fade)?Math.min(1,(sh.t1-CUT.T)/.45):1;CUT.black=1-Math.min(fin,fout);
  const s=CUT_SUBS.find(x=>CUT.T>=x[0]&&CUT.T<x[1]);cutSub(s?s[2]:'',s?s[3]:'');
  // rain sound during the storm
  if(i===0&&A.ready){if((CUT.rainT-=dt)<=0){CUT.rainT=.16;cutSnd(t0=>nburst(t0,.45,'highpass',2400,.4,.05,A.sfx,rr(.8,1.2)));}if((CUT.windT-=dt)<=0){CUT.windT=.7;cutSnd(t0=>nburst(t0,1.2,'lowpass',520,.6,.09,A.sfx,.5));}}}
function cutFx(dt){if(!CUTON)return;const F=CUT.fx;
  // rain around the camera
  if(F.rain&&F.rain.visible){const a=F.rain.geometry.attributes.position.array,c=camera.position;F.rainO.forEach((o,i)=>{const y=((o[1]-time*22*o[3])%28+28)%28;const x=c.x+o[0]+y*.12,z=c.z+o[2],yy=c.y-8+y;a.set([x,yy,z,x-.1,yy+.9,z],i*6);});F.rain.geometry.attributes.position.needsUpdate=true;}
  // lighthouse lamp
  if(F.beam){const on=F.lampOn||0;COAST.lampMat.emissive.set(on>0?col('#ffd68a'):CUT.save.lampE);COAST.lampMat.emissiveIntensity=on*2.4;COAST.lampGlow.material.opacity=0;F.lampGlow.material.opacity=on*.95;F.beamMat.opacity=on*.3*(1-(F.eyeOpen||0)*.85);F.beam.visible=on>0.02&&CUT.shot===0;}
  if(CUT.shot===0)seaU.uTime.value=time*2.6;
  // lightning
  if(CUT.flash>0){hemi.intensity+=CUT.flash*2.2;CUT.flash=Math.max(0,CUT.flash-dt*3.2);}
  const d=$('cut');d.querySelector('.ct-flash').style.opacity=Math.min(.85,CUT.flash*.9).toFixed(3);d.querySelector('.ct-black').style.opacity=CUT.black.toFixed(3);}
function cutReset(){const F=CUT.fx;F.rain.visible=false;F.beam.visible=false;F.wave.visible=false;F.ticket.visible=false;F.pd.visible=false;F.post.visible=false;F.cabGlow.material.opacity=0;F.lampOn=0;
  F.orbs.forEach(o=>{o.s.material.opacity=0;o.core.material.opacity=0;o.tr.forEach(s=>s.material.opacity=0);});F.spray.forEach(p=>p.s.visible=false);F.eyeOpen=0;F.eyes.forEach(([o,c])=>{o.material.opacity=0;c.material.opacity=0;});
  Object.values(CUT.act).forEach(c=>c&&sprShow(c,false));cutPlayer(false);$('cut').querySelector('.ct-ticket').classList.remove('on');CUT.shake=0;}
function cutEnd(){if(!CUTON||CUT.ended)return;CUT.ended=true;const first=!CUT.replay;
  fadeTo(()=>{const F=CUT.fx;CUTON=false;document.body.classList.remove('cut','cine');const d=$('cut');d.hidden=true;d.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));
    F.rain.visible=false;F.beam.visible=false;F.wave.visible=false;F.ticket.visible=false;F.pd.visible=false;F.post.visible=false;F.lampGlow.material.opacity=0;F.cabGlow.material.opacity=0;
    F.orbs.forEach(o=>{o.s.material.opacity=0;o.core.material.opacity=0;o.tr.forEach(s=>s.material.opacity=0);});F.spray.forEach(p=>p.s.visible=false);
    Object.values(CUT.act).forEach(c=>c&&sprShow(c,false));COAST.lampMat.emissive.copy(CUT.save.lampE);
    (ADV.tabs||[]).forEach((tb,i)=>{const s=CUT.save.tabs&&CUT.save.tabs[i];if(s){tb.gl.material.opacity=s[0];tb.m.emissiveIntensity=s[1];}});CUT.save.tabs=null;
    if(SPR.c)sprShow(SPR.c,true);else pl.g.visible=true;if(PETOBJ)PETOBJ.g.visible=true;NPC_SPR.forEach(n=>sprShow(n.c,true));CUT.shake=0;camera.fov=50;camera.updateProjectionMatrix();
    if(A.ready)applyVolumes();
    if(first){W.introSeen=true;save();todIdx=2;blendState(PS.day,PS.day,1,S);envFrom=envTo=PS.day;envK=1;$('tBtnLbl').textContent=PRESETS.day.jp;
      INDOOR=false;HOME_IN=false;ST_IN=false;enterStation({now:true});if(!W.stSeen)setTimeout(()=>stationTalk(),900);}
    else{const s=CUT.snap;Object.assign(TRAIN,CUT.save.train);INDOOR=s.f.INDOOR;HOME_IN=s.f.HOME_IN;CH_IN=s.f.CH_IN;TC_IN=s.f.TC_IN;ST_IN=s.f.ST_IN;MZ_IN=s.f.MZ_IN;ISL_IN=s.f.ISL_IN;CY_IN=s.f.CY_IN;
      P.pos.copy(s.p);P.vel.set(0,0,0);P.yaw=s.yaw;cam.yaw=s.cy;cam.pitch=s.cp;cam.pos.set(P.pos.x+Math.sin(cam.yaw)*6,P.pos.y+3,P.pos.z+Math.cos(cam.yaw)*6);cam.look.set(P.pos.x,P.pos.y+1.4,P.pos.z);
      todIdx=s.tod;blendState(PS[ORDER[todIdx]],PS[ORDER[todIdx]],1,S);envFrom=envTo=PS[ORDER[todIdx]];envK=1;if(HOME_IN){try{applyHome();}catch(e){}}if(s.r2&&TC_IN)r2Enter();if(s.s2&&ST_IN)s2Enter();}});}


/* ---- town ink style: cel-stepped light on Lambert materials (in place) + brown outline shells ---- */
const INKU={max:{value:new T.Color(1,1,1)}};
// outline hull: back faces pushed out along normals, width kept roughly constant on screen
INK.lineOut=new T.ShaderMaterial({uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{uCol:{value:col('#80644e')},uPx:{value:.0017}}]),side:T.BackSide,fog:true,
  vertexShader:`uniform float uPx;attribute vec3 inkN;varying vec3 vCutW;
#include <fog_pars_vertex>
void main(){vCutW=(modelMatrix*vec4(position,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*inkN);mvPosition.xyz+=n*uPx*max(1.5,-mvPosition.z);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,fragmentShader:`uniform vec3 uCol;varying vec3 vCutW;uniform vec3 uCA,uCB;uniform float uCR;
#include <fog_pars_fragment>
void main(){${CUT_F}${CUT_SH}gl_FragColor=vec4(uCol,1.);
#include <fog_fragment>
}`});
Object.assign(INK.lineOut.uniforms,{uCA:CUTU.uCA,uCB:CUTU.uCB,uCR:CUTU.uCR});cutPatch(INK.line);   // the back-face outlines must open up together with the walls they outline, or a dark shell stays behind
const INK_FRAG='reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();';
function inkLambert(m){if(!m||m.userData.inkL||!m.isMeshLambertMaterial)return;m.userData.inkL=true;const prev=m.onBeforeCompile,pk=m.customProgramCacheKey?m.customProgramCacheKey.bind(m):null;
  m.onBeforeCompile=(sh,r)=>{if(prev)prev.call(m,sh,r);if(!sh.fragmentShader.includes(INK_FRAG))return;sh.uniforms.uInkMax=INKU.max;sh.uniforms.uPaint={value:m.userData.paint?1:0};
    sh.fragmentShader='uniform vec3 uInkMax;uniform float uPaint;\n'+sh.fragmentShader.replace(INK_FRAG,`{vec3 dl=reflectedLight.directDiffuse;float mx=max(max(uInkMax.r,uInkMax.g),uInkMax.b)+1e-4;float r0=max(max(dl.r,dl.g),dl.b)/mx;
      float sm=getShadowMask();float rs=r0*sm;float lv=rs<.07?0.:(rs<.45?.56:1.);
      float lvP=.22+.43*smoothstep(.02,.16,rs)+.35*smoothstep(.32,.62,rs);lv=mix(lv,lvP,uPaint);
      reflectedLight.directDiffuse=(r0>1e-4?dl*(lv/r0):vec3(0.))*BRDF_Diffuse_Lambert(diffuseColor.rgb);
      reflectedLight.directDiffuse*=mix(vec3(1.),vec3(1.05,1.,.93),uPaint*lv);}`)
      .replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=mix(vec3(1.),vec3(.9,.96,1.08),uPaint);');};
  m.customProgramCacheKey=()=>'inkL'+(pk?pk():'');m.color.lerp(INK.paper,.08);m.needsUpdate=true;}
function inkNormals(g){if(g.attributes.inkN)return;const p=g.attributes.position,n=g.attributes.normal,c=p.count,M=new Map(),K=new Array(c);
  for(let i=0;i<c;i++){const k=Math.round(p.getX(i)*400)+'_'+Math.round(p.getY(i)*400)+'_'+Math.round(p.getZ(i)*400);K[i]=k;let a=M.get(k);if(!a){a=[0,0,0];M.set(k,a);}a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i);}
  const arr=new Float32Array(c*3);for(let i=0;i<c;i++){const a=M.get(K[i]);const l=Math.hypot(a[0],a[1],a[2])||1;arr[i*3]=a[0]/l;arr[i*3+1]=a[1]/l;arr[i*3+2]=a[2]/l;}g.setAttribute('inkN',new T.BufferAttribute(arr,3));}
function inkTown(root){const list=[];root.traverse(o=>{if(o.isMesh&&!o.userData.ink&&!o.userData.inkLine)list.push(o);});let n=0;
  list.forEach(o=>{o.userData.ink=true;const mats=Array.isArray(o.material)?o.material:[o.material];let ok=false;mats.forEach(m=>{if(m&&m.isMeshLambertMaterial&&!m.transparent){inkLambert(m);ok=true;}});
    if(!ok||o.isInstancedMesh||o.isSkinnedMesh)return;const m0=mats[0];if(!Array.isArray(o.material)&&m0.emissiveIntensity>.8&&m0.emissive&&(m0.emissive.r+m0.emissive.g+m0.emissive.b)>.6)return;
    const g=o.geometry,gt=g&&g.type;if(!g||!g.attributes.normal||/Plane|Shape|Circle|Ring/.test(gt)||g.attributes.position.count>20000)return;if(!g.boundingBox)g.computeBoundingBox();const s=new T.Vector3();g.boundingBox.getSize(s);
    const w=new T.Vector3();o.getWorldScale(w);const mx=Math.max(s.x*w.x,s.y*w.y,s.z*w.z);if(mx<.25)return;
    inkNormals(g);const h=new T.Mesh(g,INK.lineOut);h.userData.inkLine=true;h.castShadow=false;h.receiveShadow=false;h.renderOrder=o.renderOrder;o.add(h);n++;});return n;}
try{scene.updateMatrixWorld(true);INK.nTown=inkTown(scene);}catch(e){console.error(e);}
// ---- surface detail: world-space painted grain / blotches / rain streaks on flat-coloured surfaces + soft contact shadow where walls meet the ground
// one 256² tileable noise texture (R blotches, G grain, B vertical streaks, A big patches), sampled on the face's dominant plane; per-material strength by colour
const DET=(()=>{const N=256,hs=(x,y,s)=>{let h=(x*374761393+y*668265263+s*982451653)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
  const vn=(x,y,f,s)=>{const fx=x*f/N,fy=y*f/N,ix=Math.floor(fx),iy=Math.floor(fy),u=fx-ix,v=fy-iy,a=hs(ix%f,iy%f,s),b=hs((ix+1)%f,iy%f,s),c=hs(ix%f,(iy+1)%f,s),d=hs((ix+1)%f,(iy+1)%f,s),su=u*u*(3-2*u),sv=v*v*(3-2*v);return a+(b-a)*su+(c-a)*sv+(a-b-c+d)*su*sv;};
  const vn2=(x,y,fx_,fy_,s)=>{const fx=x*fx_/N,fy=y*fy_/N,ix=Math.floor(fx),iy=Math.floor(fy),u=fx-ix,v=fy-iy,a=hs(ix%fx_,iy%fy_,s),b=hs((ix+1)%fx_,iy%fy_,s),c=hs(ix%fx_,(iy+1)%fy_,s),d=hs((ix+1)%fx_,(iy+1)%fy_,s),su=u*u*(3-2*u),sv=v*v*(3-2*v);return a+(b-a)*su+(c-a)*sv+(a-b-c+d)*su*sv;};
  const D=new Uint8Array(N*N*4);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=(y*N+x)*4;
    const r=vn(x,y,4,1)*.5+vn(x,y,8,2)*.28+vn(x,y,16,3)*.14+vn(x,y,32,4)*.08;
    const g=hs(x,y,9)*.55+vn(x,y,64,5)*.3+vn(x,y,128,6)*.15;
    const b=vn2(x,y,48,3,7)*.6+vn2(x,y,96,6,8)*.4;
    const a=vn(x,y,2,10)*.6+vn(x,y,4,11)*.4;
    D[i]=Math.round(255*Math.min(1,Math.max(0,(r-.5)*1.7+.5)));D[i+1]=Math.round(255*g);D[i+2]=Math.round(255*Math.min(1,Math.max(0,(b-.5)*1.8+.5)));D[i+3]=Math.round(255*Math.min(1,Math.max(0,(a-.5)*1.8+.5)));}
  const t=new T.DataTexture(D,N,N,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(4,MAXANI);t.needsUpdate=true;
  return {tex:{value:t},on:{value:1},n:0};})();
// painted surface textures (ChatGPT pack): sampled in world space so a wall shows the same brick size everywhere; tinted by the material colour
const SURF=(()=>{let d={};try{d=JSON.parse(document.getElementById('tex').textContent)||{};}catch(e){}const L=new T.TextureLoader(),o={};
  const w=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1,T.RGBAFormat);w.needsUpdate=true;o._white=w;
  Object.keys(d).forEach(k=>{const e={avg:new T.Vector3(...d[k].avg),m:d[k].m,U:[],ok:false};e.tex=L.load(d[k].url,()=>{e.ok=true;e.U.forEach(u=>u.uSurf.value.w=u.str);});
    e.tex.wrapS=e.tex.wrapT=T.RepeatWrapping;e.tex.anisotropy=Math.min(8,MAXANI);o[k]=e;});return o;})();
// art pack school-art-sample-v1 (ChatGPT): painted foliage cards, bark and grass — first used on the school sample
const ART=(()=>{let d={};try{d=JSON.parse(document.getElementById('art').textContent)||{};}catch(e){}const L=new T.TextureLoader(),o={};
  Object.keys(d).forEach(k=>{const t=L.load(d[k]);t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(4,MAXANI);o[k]=t;});return o;})();
// 遠山 (第二批 shiomi-mountains): painted 360° ridge panoramas, sky transparent, on the inside of a big open cylinder.
// Fixed in the world (no turning toward the camera), unlit, no fog / shadow / collision; the 3D slopes in front hide its lower edge.
// Sqoyaw: full circle just outside the valley the students can walk in (it covers the far 3D valley walls).
// 汐見町: only the land side (west - north - east); the ends fade out over the coast so the sea and the sunset stay open.
const RIDGE=(()=>{let d={};try{d=JSON.parse(document.getElementById('env').textContent)||{};}catch(e){}const L=new T.TextureLoader(),o={list:[]};
  const CFG_={sq:{key:'ridge_sqoyaw',x:2590,z:30,R:212,y0:-70,y1:180,arc:PI*2,th0:0,fade:0,mask:2600,vcrop:.35},
              sm:{key:'ridge_shiomi',x:0,z:40,R:600,y0:-30,y1:300,arc:PI*200/180,th0:-PI*100/180,fade:.09}};
  for(const k in CFG_){const c=CFG_[k],url=(GFX.lite&&d[c.key+'_2k'])||d[c.key]||d[c.key+'_2k'];if(!url)continue;
    const t=L.load(url);t.encoding=T.sRGBEncoding;t.wrapS=T.RepeatWrapping;t.wrapT=T.ClampToEdgeWrapping;t.anisotropy=Math.min(4,MAXANI);
    if(c.vcrop){t.repeat.set(1,1-c.vcrop);t.offset.set(0,c.vcrop);}   // Sqoyaw: leave out the painting's big foreground tree band (it sits too close in this narrow valley)
    const g=new T.CylinderGeometry(c.R,c.R,c.y1-c.y0,c.arc>6?128:72,1,true,c.th0,c.arc);
    // seen from inside: flip u so the picture reads left-to-right; keep the arc position for the end fade
    const uv=g.attributes.uv,arcA=new Float32Array(uv.count);for(let i=0;i<uv.count;i++){arcA[i]=uv.getX(i);uv.setX(i,1-uv.getX(i));}g.setAttribute('aArc',new T.BufferAttribute(arcA,1));
    const m=new T.MeshBasicMaterial({map:t,transparent:true,alphaTest:.02,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false});
    const F={value:c.fade};m.onBeforeCompile=sh=>{sh.uniforms.uFade=F;
      sh.vertexShader='attribute float aArc;varying float vArc;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvArc=aArc;');
      sh.fragmentShader='uniform float uFade;varying float vArc;\n'+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(uFade>0.)diffuseColor.a*=smoothstep(0.,uFade,vArc)*smoothstep(0.,uFade,1.-vArc);');};
    m.customProgramCacheKey=()=>'ridgePano';
    const mesh=new T.Mesh(g,m);mesh.position.set(c.x,(c.y0+c.y1)/2,c.z);mesh.renderOrder=-5;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;
    mesh.userData.noInk=1;mesh.userData.nomerge=true;mesh.userData.dyn=true;mesh.visible=false;scene.add(mesh);o[k]=mesh;o.list.push(mesh);
    // Sqoyaw: the real valley walls behind the panorama climb higher than the painted ridge line, so a sky-coloured wall (same sky shader,
    // drawn at the panorama's radius) hides every 3D slope farther away; nearer slopes still stand in front of the painting.
    if(c.mask){const mg=new T.CylinderGeometry(c.R+.5,c.R+.5,c.mask,128,1,true);mg.translate(0,c.mask/2+c.y0+(c.y1-c.y0)*.5,0);
      const mm=new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,fog:false,depthWrite:true,
        vertexShader:`varying vec3 vDir;void main(){vec4 wp=modelMatrix*vec4(position,1.);vDir=wp.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*wp;}`,
        fragmentShader:sky.material.fragmentShader});
      const mk_=new T.Mesh(mg,mm);mk_.position.set(c.x,0,c.z);mk_.frustumCulled=false;mk_.renderOrder=-9;mk_.userData.noInk=1;mk_.userData.nomerge=true;mk_.userData.dyn=true;mk_.visible=false;scene.add(mk_);mesh.userData.mask=mk_;}}
  if(o.sm&&FAR_RIDGE)FAR_RIDGE.visible=false;
  return o;})();
// day colours as painted; dusk a little warm and dim, night dark blue (the painting itself is a daytime picture)
const _rgD=new T.Color(1,1,1),_rgS=new T.Color(.86,.72,.68),_rgN=new T.Color(.2,.24,.4),_rgC=new T.Color();
function ridgeTick(){if(!RIDGE.list.length)return;const out=!INDOOR&&!MZ_IN&&!CH_IN&&!ST_IN&&!(typeof CUTON!=='undefined'&&CUTON);
  const inSq=out&&P.pos.x>2300,inSm=out&&P.pos.x<1500&&P.pos.x>-1500;if(RIDGE.sq){RIDGE.sq.visible=inSq;if(RIDGE.sq.userData.mask)RIDGE.sq.userData.mask.visible=inSq;}if(RIDGE.sm)RIDGE.sm.visible=inSm;
  if(!inSq&&!inSm)return;const n=S.night||0,du=(S.dusk||0)*(1-n),dy=Math.max(0,1-n-du);
  _rgC.setRGB(_rgD.r*dy+_rgS.r*du+_rgN.r*n,_rgD.g*dy+_rgS.g*du+_rgN.g*n,_rgD.b*dy+_rgS.b*du+_rgN.b*n);RIDGE.list.forEach(m=>m.material.color.copy(_rgC));}
const FOLI={mats:{},list:[]};
// a leaf cluster card always turns to face the camera; its centre and size stay fixed in the world (one draw call per picture)
function foliMat(k){if(FOLI.mats[k])return FOLI.mats[k];const t=ART[k];if(!t)return null;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
  const m=new T.MeshBasicMaterial({map:t,alphaTest:.45,side:T.DoubleSide,color:0xffffff});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
vec3 fcC=vec3(instanceMatrix[3]);float fsX=length(vec3(instanceMatrix[0]));float fsY=length(vec3(instanceMatrix[1]));mvPosition=modelViewMatrix*vec4(fcC,1.0);mvPosition.z+=fsX*.3;mvPosition.xy+=position.xy*vec2(fsX,fsY);
#else
mvPosition=modelViewMatrix*mvPosition;
#endif
gl_Position=projectionMatrix*mvPosition;`);};
  const _fv=m.onBeforeCompile;m.onBeforeCompile=sh=>{_fv(sh);sh.vertexShader='varying float vCamD;\n'+sh.vertexShader.replace('gl_Position=projectionMatrix*mvPosition;','gl_Position=projectionMatrix*mvPosition;vCamD=-mvPosition.z;');
    sh.fragmentShader='varying float vCamD;\n'+sh.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(vCamD<3.2)discard;');};
  m.customProgramCacheKey=()=>'foliCard2';FOLI.mats[k]=m;return m;}
// cards: [picture, x, y(centre), z, width, height]
function foliBuild(parent,cards){const by={};cards.forEach(c=>(by[c[0]]=by[c[0]]||[]).push(c));const geo=new T.PlaneGeometry(1,1),m4=new T.Matrix4();
  Object.keys(by).forEach(k=>{const mat=foliMat(k);if(!mat)return;const L=by[k];const im=new T.InstancedMesh(geo,mat,L.length);
    L.forEach((c,i)=>{m4.makeScale(c[4],c[5],1);m4.setPosition(c[1],c[2],c[3]);im.setMatrixAt(i,m4);});im.instanceMatrix.needsUpdate=true;
    im.frustumCulled=false;im.castShadow=im.receiveShadow=false;im.userData.ink=true;im.userData.nomerge=true;parent.add(im);FOLI.list.push(im);});}
// shadow-only stand-in: the old round crowns still throw a soft tree shadow, but are never drawn
const SHADOW_ONLY=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false});
// mode 1: walls (texture upright on every face), mode 2: roofs (corrugation runs down the slope)
// keep: leave the material's own picture (road markings, joints) and lay the painted grain over it; chroma: 0 = only light/dark from the texture, 1 = its colour too
const SURF_K={wall_plaster:.4,wall_tile:.45,wall_pebble:.4,asphalt:.3,concrete:.5,terrazzo:.55,wood_plank:.55,roof_metal:.55,grass:.55,soil:.55,
  wall_brick_red:.85,metal_blue:.8,metal_red:.8,metal_green:.8,wall_wood:.8};   // 第二批 coloured textures show their own colour (chroma 1, base = their average)
function surfSet(m,key,mode,base,str=1,o={}){if(!m||!SURF[key])return;str*=SURF_K[key]||.6;if(m.map&&!o.keep){m.map=null;m.needsUpdate=true;}if(base)m.color.copy(col(base));m.userData.surf={key,mode,str,chroma:o.chroma==null?.6:o.chroma};}
['edge','plain','center'].forEach(k=>surfSet(RT[k],'asphalt',1,null,.7,{keep:1,chroma:0}));   // town roads: painted grain over the markings
const DET_V='vec4 detW4=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\ndetW4=instanceMatrix*detW4;\n#endif\nvDetW=(modelMatrix*detW4).xyz;vDetN=(vec4(transformedNormal,0.)*viewMatrix).xyz;vDetG=aGnd;';
const DET_F=`{vec3 an=abs(normalize(vDetN));float vert=1.-smoothstep(.55,.8,an.y);
  vec2 p=an.y>max(an.x,an.z)?vDetW.xz:(an.x>an.z?vDetW.zy:vDetW.xy);
  if(uSurf.w>0.){vec2 q=p;if(uSurf.z>1.5&&an.y>.3){vec2 dh=normalize(normalize(vDetN).xz+vec2(1e-4));q=vec2(dot(vDetW.xz,vec2(-dh.y,dh.x)),dot(vDetW.xz,dh)/max(an.y,.35));}
    vec3 tc=pow(texture2D(uSurfT,q*uSurf.xy).rgb,vec3(2.2));const vec3 LW=vec3(.2126,.7152,.0722);vec3 rr=mix(vec3(dot(tc,LW)/dot(uSurfAvg,LW)),tc/uSurfAvg,uSurfC);diffuseColor.rgb*=mix(vec3(1.),clamp(rr,0.,2.5),uSurf.w*uDetOn);}
  vec4 g1=texture2D(uDetT,p*.43),g2=texture2D(uDetT,p*.071),g3=texture2D(uDetT,p*.0123),g4=texture2D(uDetT,vec2(p.x*.11,p.y*.05+.37));
  float k=1.+(g1.g-.5)*uDet.x*2.+(g2.r-.5)*uDet.y*2.+(g3.a-.5)*uDet.y*1.4-smoothstep(.56,.92,g4.b)*smoothstep(.35,.7,g2.r)*uDet.z*2.2*vert;
  vec3 c=diffuseColor.rgb*k;c=mix(c,c*uDetTint,smoothstep(.38,.72,g3.a*.7+g2.r*.3));
  if(vDetG>100.){float h=vDetW.y-(vDetG-500.);c*=mix(1.,mix(1.-uDet.w,1.,smoothstep(.0,1.25,h))*mix(1.,1.035,smoothstep(1.5,4.5,h)),vert);}
  diffuseColor.rgb=mix(diffuseColor.rgb,c,uDetOn);}`;
function detClass(m){if(!m||!m.isMeshLambertMaterial||m.transparent||m.userData.noDet)return null;
  if(m.emissive&&m.emissiveIntensity>0&&(m.emissive.r+m.emissive.g+m.emissive.b)>.05)return null;
  const hsl={};m.color.getHSL(hsl);const tx=m.map?.6:1;
  if(m.vertexColors)return {d:[.05,.11,0,.4],t:[1.1,1.05,.84]};
  if(hsl.l<.035)return {d:[.07*tx,.06*tx,.03,.2],t:[1,1,1]};
  if(hsl.h>.16&&hsl.h<.46&&hsl.s>.16)return {d:[.07*tx,.15*tx,0,.42],t:[1.17,1.08,.7]};                 // grass / leaves
  if(hsl.s<.2)return {d:[.075*tx,.1*tx,(hsl.l>.35?.13:.08)*tx,.46],t:[1.03,1.0,.94]};                    // concrete, plaster, tile, metal
  return {d:[.055*tx,.085*tx,.06*tx,.42],t:[1.04,1.0,.93]};}                                              // paint, wood, roof colours
function detPatch(m){if(!m||m.userData.detP)return false;const c=detClass(m);if(!c)return false;c.d=[c.d[0]*.5,c.d[1]*.55,c.d[2]*.35,c.d[3]];if(m.userData.paint)c.d=[c.d[0]*.25,c.d[1]*.4,0,c.d[3]];   // painted style: clean surfaces, keep the soft contact shadow
m.userData.detP=true;DET.n++;
  const prev=m.onBeforeCompile,pk=m.customProgramCacheKey?m.customProgramCacheKey.bind(m):null,U={uDet:{value:new T.Vector4(...c.d)},uDetTint:{value:new T.Vector3(...c.t)}},sf=m.userData.surf,SE=sf&&SURF[sf.key];
  if(SE){U.uDet.value.x*=.5;U.uSurfT={value:SE.tex};U.uSurf={value:new T.Vector4(1/SE.m[0],1/SE.m[1],sf.mode,SE.ok?sf.str:0)};U.uSurfAvg={value:SE.avg};U.uSurfC={value:sf.chroma};U.str=sf.str;SE.U.push(U);}
  else{U.uSurfT={value:SURF._white};U.uSurf={value:new T.Vector4(1,1,0,0)};U.uSurfAvg={value:new T.Vector3(1,1,1)};U.uSurfC={value:0};}
  m.onBeforeCompile=(sh,r)=>{if(prev)prev.call(m,sh,r);
    if(!sh.vertexShader.includes('#include <project_vertex>')||!sh.vertexShader.includes('#include <defaultnormal_vertex>')||!sh.fragmentShader.includes('#include <color_fragment>'))return;
    Object.assign(sh.uniforms,{uDet:U.uDet,uDetTint:U.uDetTint,uSurfT:U.uSurfT,uSurf:U.uSurf,uSurfAvg:U.uSurfAvg,uSurfC:U.uSurfC},{uDetT:DET.tex,uDetOn:DET.on});
    sh.vertexShader='attribute float aGnd;varying vec3 vDetW,vDetN;varying float vDetG;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n'+DET_V);
    sh.fragmentShader='uniform sampler2D uDetT,uSurfT;uniform vec4 uDet,uSurf;uniform vec3 uDetTint,uSurfAvg;uniform float uDetOn,uSurfC;varying vec3 vDetW,vDetN;varying float vDetG;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+DET_F);};
  m.customProgramCacheKey=()=>'det'+(pk?pk():'');m.needsUpdate=true;return true;}
function detPass(root){let n=0;root.traverse(o=>{if(!o.isMesh||o.userData.inkLine||o.isSkinnedMesh)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(detPatch(m))n++;});});return n;}
// ground height under each vertex (lower of the house pad and the bare slope), stored +500 so "no attribute" (0) means no contact shadow
function detGround(geo,mw){const p=geo.attributes.position,n=p.count,a=new Float32Array(n),v=new T.Vector3(),C=new Map();
  for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(mw);const k=Math.round(v.x*4)*100003+Math.round(v.z*4);let g=C.get(k);
    if(g===undefined){g=groundH(v.x,v.z);if(v.x>2300&&TB.terrH){const lx=v.x-TB.x;g=Math.min(g,TB.terrH(lx,v.z));}C.set(k,g);}a[i]=g+500;}
  geo.setAttribute('aGnd',new T.BufferAttribute(a,1));}
// frame-rate guard: drop the outline shells on slow devices (cel light stays)
const INKPERF={t:0,n:0,done:false};
function inkPerf(dt){if(INKPERF.done||!started)return;INKPERF.t+=dt;INKPERF.n++;if(INKPERF.t>8){INKPERF.done=true;const fps=INKPERF.n/INKPERF.t;if(fps<27){INK.lineOut.visible=false;console.log('ink outlines off, fps',fps.toFixed(1));}}}

/* ================================================================
   Tracks sealed + convenience store 2.0 (picture shop, gacha, backpack)
   ================================================================ */
// solid corridor over the rails (only the level crossing stays open); also pushes anyone already on the tracks out
addCol(-420,-4.6,-33.05,-26.85,3);addCol(4.6,420,-33.05,-26.85,3);

const SHOP_CATS=[['rice','🍙','飯糰便當'],['bread','🍮','麵包甜點'],['snack','🍫','零食'],['drink','🥤','飲料'],['ice','🍦','冰品'],['hot','🍢','熱食'],['stat','✏️','文具'],['pet','🐾','寵物用品'],['gacha','🎁','扭蛋']];
const SHOP_ITEMS=[
  ['鮭魚飯糰',30,'🍙','rice','鹹香鮭魚配白飯，早餐好選擇。','#f3e7cf'],['鮪魚飯糰',30,'🍙','rice','鮪魚美乃滋，最受歡迎的口味！','#f3e7cf'],['三明治',35,'🥪','rice','蛋沙拉三明治，軟綿綿。','#f7ecd0'],['咖哩便當',60,'🍛','rice','熱呼呼的咖哩飯，吃得很飽。','#f7dcb0'],
  ['菠蘿麵包',25,'🍞','bread','外酥內軟，剛出爐的香味。','#f7e3bf'],['布丁',25,'🍮','bread','Q 彈的焦糖布丁。','#f8e2b8'],['銅鑼燒',20,'🥞','bread','夾著滿滿紅豆餡。','#f2d6b4'],['草莓大福',30,'🍓','bread','季節限定！軟 Q 麻糬包草莓。','#fbdde4'],
  ['洋芋片',25,'🍟','snack','喀滋喀滋，好吃但很鹹喔。','#fbe3b0'],['巧克力',20,'🍫','snack','甜甜的巧克力，一次吃一點就好。','#ead2c2'],['仙貝',15,'🍘','snack','醬油烤米果，香噴噴。','#f1dcc0'],['軟糖',15,'🍬','snack','水果口味軟糖，記得刷牙！','#fad9e6'],
  ['牛奶',20,'🥛','drink','補充鈣質，長得更高！','#e8f1f8'],['麥茶',20,'🍵','drink','無糖麥茶，最解渴。','#e6efd8'],['柳橙汁',20,'🧃','drink','100% 柳橙原汁，維他命 C 滿滿。','#fde6c4'],['彈珠汽水',25,'🥤','drink','打開時「啵」一聲！','#dcefff'],['礦泉水',15,'💧','drink','口渴就喝水，寵物也能喝。','#e2f2fa'],
  ['蘇打冰棒',20,'🧊','ice','清涼的蘇打口味。','#dff3fb'],['香草冰淇淋',25,'🍦','ice','濃濃香草，一口接一口。','#fbf1dc'],['西瓜冰',20,'🍧','ice','夏天的味道。','#fde0e0'],
  ['關東煮',30,'🍢','hot','櫃台熱食：蘿蔔、魚板、蛋。','#f5e2c6'],['肉包',25,'🥟','hot','櫃台熱食：現蒸肉包。有人在找它喔！','#f7ecdc'],['烤地瓜',25,'🍠','hot','櫃台熱食：香甜的烤地瓜。','#f2d9c9'],
  ['鉛筆',10,'✏️','stat','寫功課用的 2B 鉛筆。','#fbeec2'],['尺',10,'📏','stat','15 公分的直尺。','#f4f0d8'],['筆記本',20,'📒','stat','記下學到的新東西！','#fbeec2'],['閃亮貼紙',50,'✨','stat','閃閃發亮的收藏貼紙。','#fff4c8'],
  ['小魚乾',30,'🐟','pet','貓咪最愛！飽足 +40。也能交到貓咪朋友。','#dcecf6'],['狗狗肉乾',30,'🍖','pet','狗狗最愛！飽足 +40。','#f5dccb'],['逗貓棒',40,'🎣','pet','陪貓咪玩，心情大大提升。','#e9e2f7'],['狗狗玩具球',40,'🎾','pet','丟出去，狗狗會咬回來！','#eef6cf']];
SHOP_ITEMS.push(['甜柿',20,'🍊','fruit','Sqoyaw 秋天的甜柿，脆脆甜甜！','#fde0c4']);
const SHOP_BY={};SHOP_ITEMS.forEach(it=>SHOP_BY[it[0]]=it);
const EAT_TXT={rice:['好飽！米飯是身體的能量來源。','吃完精神都來了！'],bread:['甜甜的，好幸福～','吃完記得漱口喔。'],snack:['好吃！不過零食要適量，吃太多會蛀牙。','喀滋喀滋～零食偶爾吃就好。'],
  drink:['咕嚕咕嚕，好解渴！','喝完覺得好清爽。'],fruit:['好甜！是秋天的味道。','脆脆甜甜，自己採的最好吃！'],ice:['好冰！慢慢吃，不然頭會痛。','冰冰涼涼，好消暑。'],hot:['熱呼呼的，暖到心裡。','好香！吃完全身暖暖的。']};
const EAT_TIP={'甜柿':'甜柿有很多維他命 C 和膳食纖維，是秋天的好水果。','牛奶':'牛奶有很多鈣質，能讓骨頭和牙齒更強壯。','柳橙汁':'柳橙有維他命 C，可以幫助身體抵抗感冒。','麥茶':'無糖飲料最健康，口渴時多喝水或無糖茶。','礦泉水':'每天要喝足夠的水，大約 6～8 杯。',
  '洋芋片':'洋芋片的鹽和油都很多，一包不要一次吃完。','巧克力':'巧克力有很多糖，吃完記得刷牙。','軟糖':'糖果黏在牙齒上容易蛀牙！','彈珠汽水':'一瓶汽水的糖大約有 7～8 顆方糖那麼多。','咖哩便當':'便當有飯、有肉、有菜，營養很均衡。','三明治':'蛋是很好的蛋白質來源。'};
const GACHA_PRICE=40;
// theme machines: items = [id, name, emoji, weight, fact]
const GMACH=[
 {id:'mount',ic:'🐻',name:'山林動物卡',sub:'臺灣山裡的動物朋友，每張卡都有小知識喔！',col:'#4f8a5b',bg:'#e3f0dc',done:'山林圖鑑大師',items:[
  ['muntjac','山羌','🦌',14,'叫聲很像狗在叫，所以又叫「吠鹿」。'],['macaque','臺灣獼猴','🐒',14,'臺灣唯一的野生猴子，一大群一起生活。'],
  ['squirrel','白面鼯鼠（飛鼠）','🐿️',12,'晚上才出來，張開身體兩側的皮膜在樹之間滑翔。'],['magpie','臺灣藍鵲','🐦',12,'尾巴長長的，一家人會一起照顧寶寶。'],
  ['boar','山豬','🐗',8,'鼻子很靈，會用鼻子翻土找東西吃。'],['serow','臺灣長鬃山羊','🐐',7,'很會爬懸崖，住在很高的山上。'],
  ['butterfly','寬尾鳳蝶','🦋',6,'臺灣特有的國寶級蝴蝶，幼蟲只吃臺灣檫樹的葉子。'],['viper','百步蛇','🐍',4,'身上有三角形花紋。在山上看到蛇，要保持距離、慢慢離開。'],
  ['owl','黃魚鴞','🦉',4,'住在溪邊、會抓魚吃的大型貓頭鷹。'],['salmon','櫻花鉤吻鮭','🐟',3,'只住在大甲溪上游冰冷的溪水裡，是冰河時期留下來的魚！'],
  ['pheasant','帝雉','🪶',2.5,'臺灣特有種，公鳥的羽毛是藍黑色的，被印在千元鈔票上。'],['bear','臺灣黑熊','🐻',1.2,'胸前有白色 V 字，是臺灣體型最大的食肉動物。'],
  ['leopard','雲豹','🐆',.6,'已經很多年沒有人在臺灣看見牠了……']]},
 {id:'sea',ic:'🐚',name:'汐見海邊圖鑑',sub:'潮水帶來的海洋朋友。',col:'#2f7fb8',bg:'#dcecf6',done:'海洋博士',items:[
  ['crab','螃蟹','🦀',14,'腳的關節往旁邊彎，所以橫著走路。'],['shell','貝殼','🐚',14,'貝殼是軟體動物的房子，會跟著身體一起長大。'],['clown','小丑魚','🐠',13,'住在海葵裡，海葵的刺不會螫牠。'],
  ['puffer','河豚','🐡',10,'遇到危險會吸水，把身體鼓成一顆球。'],['octo','章魚','🐙',8,'有三顆心臟，血是藍色的！'],['squid','魷魚','🦑',7,'會噴墨汁，趁機逃跑。'],
  ['turtle','海龜','🐢',5,'長大後會回到自己出生的沙灘產卵。'],['dolphin','海豚','🐬',4,'是哺乳類，用肺呼吸，會用聲音找食物。'],['lobster','龍蝦','🦞',3,'長大的時候要脫殼好幾次。'],
  ['shark','鯊魚','🦈',2.2,'牙齒掉了會一直長出新的。'],['whale','鯨魚','🐳',1.2,'地球上最大的動物，也是用肺呼吸。'],['eyes','浪裡的眼睛','👀',.5,'……好像在哪裡看過這雙眼睛？']]},
 {id:'title',ic:'🏷️',name:'稱號扭蛋',sub:'轉到的稱號可以「戴上」，會顯示在你的名字旁邊。',col:'#b0782f',bg:'#f7ead2',done:'稱號收藏家',items:[
  ['bird','早起的小鳥','🐤',14,''],['walk','散步達人','👟',14,''],['book','愛看書的人','📖',12,''],['wind','海風觀察家','🍃',12,''],['cat','貓咪的朋友','🐈',8,''],
  ['hunt','山林小獵人','🏹',7,''],['lang','族語小勇士','🗣️',6,''],['light','燈塔學徒','🔦',5,''],['tide','潮汐解讀者','🌊',3,''],['star','星空旅人','🌌',2.5,''],
  ['guard','汐見町守護者','🛡️',1,''],['gold','燈塔之光','🌟',.5,'']]},
 {id:'sticker',ic:'✨',name:'貼紙扭蛋',sub:'寫留言給老師的時候，可以把貼紙貼上去！',col:'#d0588a',bg:'#fbe3ec',done:'貼紙收藏家',items:[
  ['good','讚','👍',14,''],['fight','加油','💪',14,''],['lol','笑死','😂',12,''],['sleep','想睡','😴',12,''],['please','拜託','🙏',10,''],['wow','好厲害','🤩',10,''],
  ['apple','蘋果','🍎',8,''],['peach','水蜜桃','🍑',7,''],['paw','腳印','🐾',6,''],['rainbow','彩虹','🌈',4,''],['party','恭喜','🎉',4,''],['heart','謝謝老師','💖',2,''],['crown','王冠','👑',.8,'']]}];
const TAYAL_DEF={};
function gPrice(){return +CFG.gachaPrice>0?+CFG.gachaPrice:GACHA_PRICE;}
const GACHA_RARE=w=>w>=10?['普通','#8a8a8a']:w>=5?['少見','#3d8ad8']:w>=2?['稀有','#b060d8']:['傳說','#e0a020'];
function gMach(id){return GMACH.find(m=>m.id===id)||GMACH[0];}
function colS(){const c=W.col||(W.col={});GMACH.forEach(m=>{if(!c[m.id])c[m.id]={};});
  if(!W.colMig){W.colMig=1;const sea=gMach('sea');Object.keys(W.items||{}).forEach(n=>{const it=sea.items.find(i=>i[1]===n);if(it&&!SHOP_BY[n]){c.sea[it[0]]=(c.sea[it[0]]||0)+W.items[n];delete W.items[n];}});}
  return c;}
function gHave(m){const c=colS()[m.id];return m.items.filter(i=>c[i[0]]).length;}
function gDraw(m){const tot=m.items.reduce((s,g)=>s+g[3],0);let r=Math.random()*tot;for(const g of m.items){r-=g[3];if(r<=0)return g;}return m.items[0];}
function tayalW(id){const t=CFG.tayal||{};return t[id]?String(t[id]):(TAYAL_DEF[id]||'');}
function titleName(id){if(!id)return '';const m=GMACH.find(m=>id==='done_'+m.id);if(m)return m.done;const t=gMach('title').items.find(i=>i[0]===id);return t?t[1]:'';}
function colSummary(){colS();return GMACH.map(m=>`${m.name}${gHave(m)}/${m.items.length}`).join('、');}
function itemIcon(n){const it=SHOP_BY[n];return it?it[2]:'📦';}
function renderGacha(grid){const mid=SHOP.mach;colS();
  if(!mid){grid.appendChild(el('p',{class:'gc-note',style:'grid-column:1/-1',text:`每台扭蛋一次 ${gPrice()} 金幣。先點進去看看裡面有什麼，再決定要轉哪一台！轉到重複的會退回一些金幣。`}));
    GMACH.forEach(m=>{const h=gHave(m),n=m.items.length;const c=el('button',{type:'button',class:'gm-card',style:`--c:${m.col};--b:${m.bg}`,
      html:`<div class="gm-dome">${m.items.slice(0,6).map(i=>i[2]).join('')}</div><div class="gm-base">${m.ic} ${m.name}</div><small>${m.sub}</small><div class="gm-bar"><i style="width:${h/n*100}%"></i></div><b>${h===n?'🎉 集滿了！':`收集 ${h} / ${n}`}</b>`});
      c.onclick=()=>{SHOP.mach=m.id;renderShop();SND.pick&&SND.pick();};grid.appendChild(c);});
    return;}
  const m=gMach(mid),c=colS()[m.id],h=gHave(m);
  const back=el('button',{type:'button',class:'btn small gm-back',text:'← 全部扭蛋機'});back.onclick=()=>{SHOP.mach=null;renderShop();};
  grid.appendChild(el('div',{class:'sh-gacha gm-top',style:`--c:${m.col};--b:${m.bg}`},[back,el('div',{class:'gc-mc',html:`<div class="gc-dome">${m.items.slice(0,3).map(i=>i[2]).join('')}<br>${m.items.slice(3,6).map(i=>i[2]).join('')}</div><div class="gc-base">${m.name}</div>`}),
    el('p',{text:m.sub}),el('div',{class:'gm-bar wide'},[el('i',{style:`width:${h/m.items.length*100}%`})]),el('b',{text:h===m.items.length?'🎉 全部集滿了！':`已經收集 ${h} / ${m.items.length}　集滿送 100 金幣和稱號「${m.done}」`}),
    el('button',{type:'button',class:'btn primary',text:`轉一次（${gPrice()} 金幣）`,onclick:()=>gSpin(m)})]));
  grid.appendChild(el('div',{class:'bg-sec',style:'grid-column:1/-1',text:'扭蛋機裡面有：（點一下看介紹）'}));
  const col_=el('div',{class:'gc-col'});m.items.forEach(g=>{const [rn,rc]=GACHA_RARE(g[3]),k=c[g[0]]||0;
    const b=el('button',{type:'button',class:'gc-it'+(k?'':' no')+(m.id==='title'&&W.title===g[0]?' on':''),html:`<i>${g[2]}</i><b>${g[1]}</b><small style="color:${rc}">${rn}</small>${k>1?`<em>×${k}</em>`:''}${k?'':'<span class="gc-lock">還沒有</span>'}`});
    b.onclick=()=>gInfo(m,g);col_.appendChild(b);});
  if(m.id==='title'){const sp=GMACH.filter(x=>colS().title['done_'+x.id]);sp.forEach(x=>{const b=el('button',{type:'button',class:'gc-it sp'+(W.title==='done_'+x.id?' on':''),html:`<i>🏆</i><b>${x.done}</b><small style="color:#e0a020">集滿獎勵</small>`});b.onclick=()=>gInfo(m,['done_'+x.id,x.done,'🏆',0,`集滿「${x.name}」得到的特別稱號。`]);col_.appendChild(b);});}
  grid.appendChild(col_);}
function gInfo(m,g){const c=colS()[m.id],k=c[g[0]]||0,[rn,rc]=g[3]?GACHA_RARE(g[3]):['特別','#e0a020'];const pop=$('shop').querySelector('.sh-pop');pop.innerHTML='';
  const kids=[el('div',{class:'gc-fig sm'+(k?'':' no'),text:g[2]}),el('b',{text:g[1]}),el('span',{class:'gc-r',style:`background:${rc}`,text:rn})];
  if(g[4])kids.push(el('p',{text:k?g[4]:'轉到之後就能看到牠的小知識喔！'}));
  kids.push(el('p',{class:'gc-note',text:k?`你有 ${k} 個`:'還沒轉到'}));
  if(m.id==='title'&&k){const on=W.title===g[0];kids.push(el('button',{type:'button',class:'btn primary',text:on?'拿下稱號':'戴上這個稱號',onclick:()=>{W.title=on?null:g[0];save();renderPouch();pop.hidden=true;renderShop();toast(on?'拿下稱號了':`戴上稱號「${g[1]}」！`);}}));}
  if(m.id==='sticker'&&k)kids.push(el('p',{class:'help',text:'到老師小屋外面的留言板寫便條時，就能貼這張貼紙。'}));
  kids.push(el('button',{type:'button',class:'btn',text:'關閉',onclick:()=>{pop.hidden=true;}}));
  pop.appendChild(el('div',{class:'gc-rev'},kids));pop.hidden=false;}
function gSpin(m){const pr=gPrice();if(W.coins<pr){toast(`金幣不夠，還差 ${pr-W.coins} 金幣`);return;}W.coins-=pr;led(-pr,m.name,'娛樂');
  const c=colS()[m.id],g=gDraw(m),dup=!!c[g[0]];c[g[0]]=(c[g[0]]||0)+1;let refund=0;if(dup){refund=Math.round(pr/4);W.coins+=refund;led(refund,'扭蛋重複退回','娛樂');}
  let done=false;W.colDone=W.colDone||{};if(!W.colDone[m.id]&&gHave(m)===m.items.length){W.colDone[m.id]=1;done=true;W.coins+=100;led(100,`集滿${m.name}`,'獎勵');colS().title['done_'+m.id]=1;}
  renderPouch();save();histAdd&&histAdd('buy',`扭蛋：${m.name}轉到「${g[1]}」${dup?'（重複）':''}`);const [rn,rc]=GACHA_RARE(g[3]);
  const pop=$('shop').querySelector('.sh-pop');pop.innerHTML=`<div class="gc-rev"><div class="gc-cap" style="filter:drop-shadow(0 0 14px ${m.col})">🥚</div></div>`;pop.hidden=false;
  cutSnd&&cutSnd(t=>{for(let i=0;i<6;i++)nburst(t+i*.12,.06,'bandpass',1800+i*200,1,.12,A.sfx);});
  setTimeout(()=>{pop.innerHTML='';const kids=[el('div',{class:'gc-fig',text:g[2]}),el('b',{text:g[1]}),el('span',{class:'gc-r',style:`background:${rc}`,text:rn}),
      el('p',{class:'gc-new'+(dup?' dup':''),text:dup?`重複了！退回 ${refund} 金幣`:'✨ NEW！新收藏'})];
    if(g[4])kids.push(el('p',{text:g[4]}));
    if(m.id==='title'&&!dup)kids.push(el('button',{type:'button',class:'btn',text:'馬上戴上這個稱號',onclick:()=>{W.title=g[0];save();renderPouch();toast(`戴上稱號「${g[1]}」！`);}}));
    if(done)kids.push(el('p',{class:'gc-done',text:`🎉 ${m.name}全部集滿了！+100 金幣，還得到特別稱號「${m.done}」！`}));
    kids.push(el('div',{class:'gc-btns'},[el('button',{type:'button',class:'btn',text:`再轉一次（${pr}）`,onclick:()=>{pop.hidden=true;gSpin(m);}}),el('button',{type:'button',class:'btn primary',text:'好',onclick:()=>{pop.hidden=true;renderShop();}})]));
    pop.appendChild(el('div',{class:'gc-rev open'},kids));
    cutSnd&&cutSnd(t=>(g[3]<2?[1047,1319,1568,2093,2637]:[1047,1319,1568,2093]).forEach((f,i)=>tone(f,t+i*.08,.4,'sine',.06,A.sfx)));},1100);}
function stickerRow(ta){const c=colS().sticker,m=gMach('sticker'),own=m.items.filter(i=>c[i[0]]);
  if(!own.length)return el('p',{class:'help',text:'在便利商店轉「貼紙扭蛋」，就能在便條上貼貼紙喔！'});
  const row=el('div',{class:'stk-row'});own.forEach(i=>{const b=el('button',{type:'button',class:'stk',title:i[1],text:i[2]});b.onclick=()=>{const p=ta.selectionStart??ta.value.length;ta.value=(ta.value.slice(0,p)+i[2]+ta.value.slice(p)).slice(0,150);ta.focus();};row.appendChild(b);});return row;}

/* ---------- store interior: open dollhouse view ---------- */
(function(){const G=MART.g;if(!G)return;const hide=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  G.children.slice().forEach(o=>{if(!o.isMesh)return;const p=o.position;if(p.y>2.9||p.z>4.75){o.material=hide;o.children.forEach(c=>{if(c.userData.inkLine)c.visible=false;});}});
  MART.doors.forEach(d=>d.m.visible=false);
  // exit mat + gacha machine near the door
  const [mc,mg]=C2(256,96);mg.fillStyle='#2b2f6a';mg.fillRect(0,0,256,96);mg.fillStyle='#e8b33c';mg.fillRect(0,80,256,16);mg.fillStyle='#fff';mg.font=`800 40px ${FG}`;mg.textAlign='center';mg.textBaseline='middle';mg.fillText('▼ 出口',128,42);
  const mat=mk(new T.PlaneGeometry(2,.75),new T.MeshLambertMaterial({map:TX(mc),emissive:0xffffff,emissiveMap:TX(mc),emissiveIntensity:.35}),4,.02,4.2,G,false);mat.rotation.x=-PI/2;
  const gm=new T.Group();gm.position.set(1.6,0,3.7);G.add(gm);MART.gachaG=gm;
  mk(bx(.9,.7,.7),imat('#e35d4a',.35),0,.35,0,gm);mk(sph(.42,16,12),new T.MeshLambertMaterial({color:col('#dff3fb'),transparent:true,opacity:.55,emissive:col('#9fd8f0'),emissiveIntensity:.3}),0,1.05,0,gm,false);
  ['#f2c14e','#4a9be0','#4fae6c','#e0674b','#a77ae0','#f08fb0'].forEach((c,i)=>mk(sph(.11,10,8),imat(c,.4),Math.cos(i*1.05)*.2,.9+(i%3)*.1,Math.sin(i*1.05)*.2,gm,false));
  mk(cy(.1,.1,.08,12),imat('#f7f2e8',.4),.2,.42,.36,gm,false).rotation.x=PI/2;mk(bx(.3,.12,.05),imat('#1f1f22',.2),-.2,.3,.36,gm,false);
  const [tc,tg]=C2(256,80);tg.fillStyle='#f2c14e';tg.fillRect(0,0,256,80);tg.fillStyle='#8a2c1c';tg.font=`800 34px ${FG}`;tg.textAlign='center';tg.textBaseline='middle';tg.fillText('扭蛋區',128,42);
  mk(new T.PlaneGeometry(.88,.28),new T.MeshBasicMaterial({map:TX(tc)}),0,1.62,0,gm,false);addCol(IX+1.1,IX+2.1,IZ+3.3,IZ+4.1,2);
  inter(new T.Vector3(IX+1.6,0,IZ+4.5),1.2,'看看扭蛋機',()=>{SHOP.mach=null;openShop('gacha');});
  // redirect the old shelf menus to the picture shop
  const map={'飯糰・便當':'rice','麵包・甜點':'bread','零食':'snack','泡麵':'rice','文具':'stat','雜貨・寵物用品':'pet','飲料冷藏櫃':'drink','冰品冷凍櫃':'ice'};
  INT.forEach(it=>{if(!it.pos||Math.abs(it.pos.x-IX)>8||Math.abs(it.pos.z-IZ)>6)return;const l=typeof it.label==='string'?it.label:'';const m=l.match(/〈(.+)〉|打開(.+)$/);
    if(l.startsWith('看看〈')){const k=map[m[1]]||'rice';it.act=()=>openShop(k);it.label=`逛逛〈${m[1]}〉`;}
    else if(l==='打開飲料冷藏櫃'){it.act=()=>openShop('drink');}else if(l==='打開冰品冷凍櫃'){it.act=()=>openShop('ice');}
    else if(typeof it.label==='function'&&Math.abs(it.pos.x-(IX-4.6))<.1){it.act=()=>openShop(MART.basket.length?null:'hot');it.label=()=>MART.basket.length?`到櫃台結帳（${MART.basket.length} 件）`:'櫃台熱食・結帳';}});})();
// shelf art: real-looking goods
(function(){const G=MART.g;if(!G)return;const kinds={rice:['🍙','🍙','🥪','🍛','🍱'],bread:['🍞','🍮','🥞','🍓','🥐'],snack:['🍟','🍫','🍘','🍬','🍪'],noodle:['🍜','🍜','🍝'],stat:['✏️','📏','📒','✨','📎'],misc:['🐟','🍖','🎣','🎾','🧴']};
  // re-texture the six gondola faces in build order
  const faces=[];G.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry'&&Math.abs(o.geometry.parameters.height-.92)<.01)faces.push(o);});
  const order=['rice','bread','snack','noodle','stat','misc'];
  faces.forEach((o,i)=>{const k=order[i]||'snack',em=kinds[k];const [c,g]=C2(512,256);g.fillStyle='#f6f5f0';g.fillRect(0,0,512,256);
    for(let r=0;r<4;r++){const y0=r*64;g.fillStyle='#b9b6ad';g.fillRect(0,y0+54,512,10);g.fillStyle='#e8b33c';g.fillRect(0,y0+54,512,3);
      g.font='40px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';g.textAlign='center';g.textBaseline='alphabetic';for(let x=0;x<8;x++)g.fillText(em[(x+r*3)%em.length],32+x*64,y0+50);
      g.fillStyle='#fffbe8';for(let x=0;x<8;x+=2){g.fillRect(14+x*64,y0+56,36,8);}}
    const t=TX(c);o.material=new T.MeshLambertMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.42});});})();

/* ---------- picture shop panel ---------- */
(function(){const d=document.createElement('div');d.id='shop';d.hidden=true;d.innerHTML=`<div class="sh-in">
  <div class="sh-hd"><b>🏪 ひだまりマート</b><span class="sh-coin"></span><button type="button" class="sh-x" aria-label="關閉">✕</button></div>
  <div class="sh-tabs"></div><div class="sh-grid"></div>
  <div class="sh-ft"><div class="sh-bk"></div><button type="button" class="btn primary sh-pay">結帳</button></div>
  <div class="sh-pop" hidden></div></div>`;document.body.appendChild(d);
  d.querySelector('.sh-x').onclick=closeShop;d.querySelector('.sh-pay').onclick=()=>{const n=W.coins;shopPay();if(W.coins<n)actLater('i.give');};d.addEventListener('keydown',e=>e.stopPropagation());})();
const SHOP={cat:'rice'};
function openShop(cat){if(DLG.open)closeDlg();{const hb=$('shop').querySelector('.sh-hd b');if(hb)hb.textContent=(tbIn()||MART.from==='tribe')?'🏪 7-ELEVEN 環山門市':'🏪 ひだまりマート';}if(cat&&cat!==SHOP.cat&&cat!=='gacha')SHOP.mach=null;if(cat)SHOP.cat=cat;$('shop').hidden=false;renderShop();SND.pick&&SND.pick();}
function closeShop(){if($('shop').hidden)return;$('shop').hidden=true;cv.focus({preventScroll:true});}
function basketCount(n){return MART.basket.filter(i=>i[0]===n).length;}
function renderShop(){const d=$('shop'),tabs=d.querySelector('.sh-tabs'),grid=d.querySelector('.sh-grid');d.querySelector('.sh-coin').textContent=`💰 ${W.coins} 金幣`;
  tabs.innerHTML='';SHOP_CATS.forEach(([k,ic,nm])=>{const b=el('button',{type:'button',class:'sh-tab'+(SHOP.cat===k?' on':''),html:`<i>${ic}</i>${nm}`});b.onclick=()=>{SHOP.cat=k;SHOP.mach=null;renderShop();};tabs.appendChild(b);});
  grid.innerHTML='';
  if(SHOP.cat==='gacha')renderGacha(grid);
  else SHOP_ITEMS.filter(it=>it[3]===SHOP.cat).forEach(it=>{const [n,p,ic,,desc,bg]=it,k=basketCount(n);
    const tag=PET_SAFE.cat[n]||PET_SAFE.dog[n]?'<span class="tg ok">寵物最愛</span>':PET_BAD[n]?'<span class="tg bad">寵物不能吃</span>':PET_OK[n]?'<span class="tg mid">寵物可以吃一點</span>':'';
    const c=el('div',{class:'sh-card'+(k?' in':''),html:`<div class="sh-pic" style="background:${bg}"><i>${ic}</i>${k?`<em>${k}</em>`:''}</div><b>${n}</b><span class="sh-p">${p} 金幣</span><small>${desc}</small>${tag}${W.items[n]?`<small class="own">背包裡有 ${W.items[n]} 個</small>`:''}`});
    const row=el('div',{class:'sh-qty'});const minus=el('button',{type:'button',class:'q',text:'−'});const plus=el('button',{type:'button',class:'q add',text:k?'＋':'放進購物籃'});
    minus.onclick=e=>{e.stopPropagation();const i=MART.basket.findIndex(x=>x[0]===n);if(i>=0){MART.basket.splice(i,1);updateBasket();renderShop();}};
    plus.onclick=e=>{e.stopPropagation();MART.basket.push([n,p]);updateBasket();SND.pick&&SND.pick();renderShop();};if(k)row.appendChild(minus);row.appendChild(plus);c.appendChild(row);grid.appendChild(c);});
  const tot=basketTotal(),left=W.coins-tot,bk=d.querySelector('.sh-bk'),pay=d.querySelector('.sh-pay');
  bk.innerHTML=MART.basket.length?`🧺 <b>${MART.basket.length}</b> 件・合計 <b>${tot}</b> 金幣　<span class="${left<0?'neg':''}">${left<0?`還差 ${-left} 金幣`:`付完剩 ${left} 金幣`}</span>`:'🧺 購物籃是空的，點商品放進來吧！';
  pay.disabled=!MART.basket.length||left<0;pay.textContent=MART.basket.length?`結帳 ${tot} 金幣`:'結帳';}
function shopPay(){const tot=basketTotal();if(!MART.basket.length||W.coins<tot)return;const before=W.coins,list={};MART.basket.forEach(i=>list[i[0]]=(list[i[0]]||0)+1);
  W.coins-=tot;led(-tot,'便利商店購物','零食飲料');MART.basket.forEach(i=>addItem(i[0]));dailyEvent('buy');MART.basket=[];updateBasket();renderPouch();save();SND.register&&SND.register();
  const pop=$('shop').querySelector('.sh-pop');pop.innerHTML='';pop.appendChild(el('div',{class:'rc'},[el('b',{text:'🧾 收據　ひだまりマート'}),
    ...Object.entries(list).map(([n,k])=>el('div',{class:'rc-r',html:`<span>${itemIcon(n)} ${n} ×${k}</span><span>${SHOP_BY[n][1]*k}</span>`})),
    el('div',{class:'rc-r tot',html:`<span>合計</span><span>${tot} 金幣</span>`}),el('div',{class:'rc-r',html:`<span>付款前</span><span>${before}</span>`}),el('div',{class:'rc-r',html:`<span>剩下</span><span>${W.coins}</span>`}),
    el('p',{text:'謝謝光臨！買的東西都放進背包了，點左上角的「背包」可以使用。'}),el('button',{type:'button',class:'btn primary',text:'好',onclick:()=>{pop.hidden=true;renderShop();}})]));pop.hidden=false;renderShop();}

/* ---------- backpack ---------- */
(function(){const d=document.createElement('div');d.id='bag';d.hidden=true;d.innerHTML=`<div class="sh-in"><div class="sh-hd"><b>🎒 我的背包</b><span class="sh-coin"></span><button type="button" class="sh-x" aria-label="關閉">✕</button></div><div class="bg-list"></div></div>`;
  document.body.appendChild(d);d.querySelector('.sh-x').onclick=closeBag;})();
function openBag(){if(!started)return;if(DLG.open)closeDlg();$('bag').hidden=false;renderBag();}
function closeBag(){if($('bag').hidden)return;$('bag').hidden=true;cv.focus({preventScroll:true});}
function renderBag(){const d=$('bag'),L=d.querySelector('.bg-list');d.querySelector('.sh-coin').textContent=`💰 ${W.coins} 金幣`;L.innerHTML='';
  const ents=Object.entries(W.items);if(!ents.length)L.appendChild(el('p',{class:'bg-empty',text:'背包是空的。去便利商店逛逛吧！'}));
  ents.forEach(([n,k])=>{const it=SHOP_BY[n],cat=it?it[3]:'';const acts=[];
    if(['rice','bread','snack','drink','ice','hot','fruit'].includes(cat))acts.push([cat==='drink'?'喝掉':'吃掉',()=>eatItem(n)]);
    if(W.pet&&(PET_SAFE[W.pet.kind][n]||PET_OK[n]||PET_BAD[n]||PET_SAFE.cat[n]||PET_SAFE.dog[n]))acts.push(['給寵物',()=>{closeBag();feed(n);}]);
    if(n==='逗貓棒'||n==='狗狗玩具球')acts.push(['陪寵物玩',()=>{closeBag();W.pet?petPlay():say(null,['你還沒有寵物喔。'])}]);
    const row=el('div',{class:'bg-it',html:`<div class="sh-pic" style="background:${it?it[5]:'#eee'}"><i>${itemIcon(n)}</i></div><div class="bg-t"><b>${n} <small>×${k}</small></b><small>${it?it[4]:''}</small></div>`});
    const bs=el('div',{class:'bg-acts'});acts.forEach(([t,f])=>bs.appendChild(el('button',{type:'button',class:'btn small',text:t,onclick:f})));row.appendChild(bs);L.appendChild(row);});
  {colS();L.appendChild(el('div',{class:'bg-sec',text:'📖 我的收藏'+(W.title?`　🏷️ 稱號：${titleName(W.title)}`:'')}));
    GMACH.forEach(m=>{const h=gHave(m),n=m.items.length,c=colS()[m.id];const row=el('div',{class:'bg-it',html:`<div class="sh-pic" style="background:${m.bg}"><i>${m.ic}</i></div><div class="bg-t"><b>${m.name} <small>${h}/${n}</small></b><small>${m.items.filter(i=>c[i[0]]).map(i=>i[2]).join(' ')||'還沒有收藏，去便利商店的扭蛋區看看！'}</small></div>`});
      row.appendChild(el('div',{class:'bg-acts'},[el('button',{type:'button',class:'btn small',text:'打開',onclick:()=>{closeBag();SHOP.mach=m.id;openShop('gacha');}})]));L.appendChild(row);});}
  if(W.glass&&W.glass.length)L.appendChild(el('div',{class:'bg-sec',text:`🔹 海玻璃 ${W.glass.length} / 5`}));}
function eatItem(n){const it=SHOP_BY[n];if(!it||!W.items[n])return;addItem(n,-1);const cat=it[3];const line=pick(EAT_TXT[cat]||['好好吃！']);
  SND.pick&&SND.pick();closeBag();say(n,[`${it[2]} ${line}`,...(EAT_TIP[n]?[`💡 ${EAT_TIP[n]}`]:[])]);}
// make the backpack reachable from the pouch
{const _rp=renderPouch;renderPouch=function(){_rp();const p=$('pouch');if(!p)return;const b=document.createElement('span');b.className='bagbtn';b.textContent=`🎒 背包 ${Object.values(W.items).reduce((a,v)=>a+v,0)}`;b.style.pointerEvents='auto';b.style.cursor='pointer';b.onclick=()=>openBag();
  [...p.children].forEach(c=>{if(!c.classList.contains('yen')&&!c.textContent.startsWith('海玻璃'))c.remove();});p.insertBefore(b,p.children[1]||null);
  if(W.title&&titleName(W.title)){const t=document.createElement('span');t.className='ttl';t.textContent=`🏷️ ${titleName(W.title)}`;t.style.pointerEvents='auto';t.style.cursor='pointer';t.onclick=()=>{SHOP.mach='title';SHOP.cat='gacha';openShop('gacha');};p.insertBefore(t,p.children[0]||null);}};}

/* ---------- pinch to zoom (town + store) ---------- */
{const pts=new Map();let d0=0,z0=0;const dist=()=>{const a=[...pts.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);};
  cv.addEventListener('pointerdown',e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){d0=dist();z0=cam.dist;}});
  cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2&&d0>0){cam.dist=clamp(z0*d0/Math.max(20,dist()),2.8,14);}});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)d0=0;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);}

/* ================================================================
   Student room: 2D painted room (ChatGPT illustration) drawn over the existing 3D room logic
   ================================================================ */
const HROOM=(()=>{try{return JSON.parse(document.getElementById('hroom').textContent);}catch(e){return null;}})();
const H2={sk:null,img:{},loaded:false,cv:null,g:null,view:{s:1,ox:0,oy:0},cx:null,cy:null,t:0,rects:[],shown:false};
const H2H={landscape:[[270.8541,-120.2804,962.8708],[0,11.155686,694.92843],[0,-.12491854,1]],portrait:[[146.51163,-38.294495,544.02128],[0,7.6617024,738.24814],[0,-.070391538,1]]};
const H2MAP={landscape:{ax:1,az:.9},portrait:{ax:.62,az:1.95}};
const H2FIX={landscape:{win:[656,0,579,346],board:[1303,69,268,178]},portrait:{win:[310,123,435,317],board:[759,198,187,172]}};
const WALL_ID={cream:'ivory',dots:'pink_dots',stripe:'blue_stripes',check:'green_checks',sunset:'sunset_orange',wood:'wood',star:'starry'};
const FLOOR_ID={wood:'natural_wood',dark:'dark_wood',tile:'white_tiles',carpet:'blue_carpet',tatami:'tatami'};
const FURN_SPR={rug:'01_round_rug',plant:'02_large_plant',beanbag:'03_armchair',table:'04_low_table',lamp:'05_floor_lamp',fish:'06_goldfish_bowl',maneki:'07_lucky_cat',teddy:'08_teddy_bear',books:'09_comic_stack',piano:'10_upright_piano',scope:'11_telescope',shell:'12_shell_lamp',crystal:'13_crystal_lamp',petbed:'14_pet_bed',poster:'15_town_poster',clock:'16_wall_clock',lights:'17_star_lights',shelf:'18_wall_bookshelf'};
// the new pet bed from the furniture pack
FURN.splice(FURN.findIndex(f=>f.rare),0,{k:'petbed',name:'寵物窩',price:40,type:'floor',fp:[.6,.5],build:g=>{mk(cy(.32,.3,.12,18),imat('#e9dcc6',.35),0,.06,0,g);mk(cy(.24,.24,.05,18),imat('#f6efe2',.45),0,.12,0,g,false);}});FURN_BY.petbed=FURN.find(f=>f.k==='petbed');
// align the pet's sleeping spot with the painted pet bed
PETBED.x=-2.45;PETBED.z=.95;
function h2Img(name){if(!HROOM)return null;let i=H2.img[name];if(!i){const src=HROOM.img&&HROOM.img[name];if(!src)return null;i=new Image();i.src=src;H2.img[name]=i;}return i.complete&&i.naturalWidth?i:null;}
function h2Scene(){return innerWidth>=innerHeight?'landscape':'portrait';}
function h2Model(sk,x,z){const m=H2MAP[sk];return [x*m.ax,-3+(z+3)*m.az];}
function h2Proj(sk,xm,zm){const H=H2H[sk];const w=H[2][0]*xm+H[2][1]*zm+H[2][2];return [(H[0][0]*xm+H[0][1]*zm+H[0][2])/w,(H[1][0]*xm+H[1][1]*zm+H[1][2])/w];}
function h2Scale(sk,zm){const a=h2Proj(sk,-.5,zm),b=h2Proj(sk,.5,zm);return b[0]-a[0];}
function h2Pt(sk,x,y,z){const [xm,zm]=h2Model(sk,x,z);const [X,Y]=h2Proj(sk,xm,zm);const s=h2Scale(sk,zm);return [X,Y-y*s,s];}
function h2Inv(sk,X,Y){const H=H2H[sk];const a=H[0][0],b=H[0][1],c=H[0][2],e=H[1][1],f=H[1][2],h=H[2][1];
  // w = h*zm + 1 ; Y*w = e*zm + f  ->  zm = (f - Y)/(Y*h - e)
  const zm=(f-Y)/(Y*h-e),w=h*zm+1,xm=(X*w-b*zm-c)/a;const m=H2MAP[sk];return [xm/m.ax,(zm+3)/m.az-3,zm];}
function h2Active(){return !!(HROOM&&HOME_IN&&!CUTON&&started&&SPR.c&&SPR.c.ready&&h2Img(h2Scene()+'_bg'));}
{const c=document.createElement('canvas');c.id='home2d';c.hidden=true;c.tabIndex=-1;$('stage').appendChild(c);H2.cv=c;H2.g=c.getContext('2d');
  c.addEventListener('pointerdown',e=>{H2.pd={x:e.clientX,y:e.clientY};});
  c.addEventListener('pointerup',e=>{const d=H2.pd;H2.pd=null;if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)return;const r=c.getBoundingClientRect(),V=H2.view;
    const X=V.ox+(e.clientX-r.left)/V.s,Y=V.oy+(e.clientY-r.top)/V.s;if(HOME.edit)h2Click(X,Y);});}
function h2Hide(){if(H2.shown){H2.cv.hidden=true;H2.shown=false;}}
// pick in the painted room while decorating
function h2Click(X,Y){const H=homeState(),sk=H2.sk;
  if(!HOME.pending){const hit=H2.rects.slice().reverse().find(r=>X>=r.r[0]&&X<=r.r[0]+r.r[2]&&Y>=r.r[1]&&Y<=r.r[1]+r.r[3]);HOME.sel=hit?hit.it:null;if(hit&&A.ready)SND.pick&&SND.pick();renderDecor();return;}
  const f=FURN_BY[HOME.pending.k];const back=h2Pt(sk,0,0,-3);let d;
  if(f.type==='wall'){if(Y>back[1]-10){toast('這個要掛在牆上喔');return;}const fx=H2FIX[sk];const inR=(r,p)=>X>r[0]-p&&X<r[0]+r[2]+p&&Y>r[1]-p&&Y<r[1]+r[3]+p;
    if(inR(fx.win,20)){toast('這裡是窗戶，換個地方掛吧');return;}if(inR(fx.board,30)){toast('這裡是集章板，換個地方吧');return;}
    const u=(X-back[0])/back[2]/H2MAP[sk].ax,y=(back[1]-Y)/back[2];d={k:f.k,wall:'wb',u:Math.round(clamp(u,-3.1,3.1)*4)/4,y:Math.round(clamp(y,.9,2.6)*4)/4};}
  else{if(Y<back[1]){toast('這個要放在地板上喔');return;}const [cx,cz]=h2Inv(sk,X,Y);const x=Math.round(clamp(cx,-3.1,3.1)*4)/4,z=Math.round(clamp(cz,-2.7,H2ZC-.2)*4)/4;const fp=f.fp||[.3,.3];
    if(HOME_BLOCK.some(([a,b,c,dd])=>x+fp[0]/2>a&&x-fp[0]/2<b&&z+fp[1]/2>c&&z-fp[1]/2<dd)&&f.k!=='rug'){toast('這裡有東西了，換個地方吧');return;}
    d={k:f.k,x,z,r:HOME.pending.it?HOME.pending.it.d.r||0:0};}
  if(HOME.pending.it){const it=HOME.pending.it;Object.keys(it.d).forEach(k=>delete it.d[k]);Object.assign(it.d,d);placeItemGroup(it.g,it.d);HOME.sel=it;}
  else{H.items.push(d);HOME.sel=spawnItem(d);}
  HOME.pending=null;rebuildHomeCols();save();SND.pick&&A.ready&&SND.pick();renderDecor();}
function h2Sprite(g,c,x,y,z,sk){if(!c||!c.ready||!c.mat.map)return null;const M=c.meta,im=c.mat.map.image;const [X,Y,s0]=h2Pt(sk,x,y,z);const PH=c.m.geometry.parameters.height;
  // damp the perspective so a kid by the door doesn't balloon to a third of the screen
  const sm=h2Pt(sk,0,0,-.4)[2],s=lerp(sm,s0,sk==='portrait'?.5:.45);const dh=PH*s*.86,dw=dh*M.cw/M.ch,fl=Math.sign(c.m.scale.x)||1,rz=c.pivot?c.pivot.rotation.z:0;
  g.save();g.translate(X,Y);g.fillStyle='rgba(40,20,10,.22)';g.beginPath();g.ellipse(0,0,dw*.24,dw*.065,0,0,7);g.fill();
  if(rz){g.translate(0,-dh*.3);g.rotate(-rz);g.translate(0,dh*.3);}g.scale(fl,1);const [sx,sy]=fxy(M,c.frame);g.drawImage(im,sx,sy,M.cw,M.ch,-dw/2,-dh+(M.foot!=null?M.foot:3)/M.ch*dh,dw,dh);g.restore();return [X-dw/2,Y-dh,dw,dh];}
function h2Furn(g,it,sk,night){const id=FURN_SPR[it.d.k],f=id&&HROOM.furn[id];const im=f&&h2Img('f_'+id);if(!im)return;const d=it.d;let X,Y,s,ax,ay;
  if(d.wall){if(d.wall==='wf')return;const x=d.wall==='wb'?d.u:d.wall==='wl'?-3.45:3.45,z=d.wall==='wb'?-3:d.u;[X,Y,s]=h2Pt(sk,x,d.y||1.75,z);const wa=f.wa||[256,256];ax=wa[0];ay=wa[1];}
  else{[X,Y,s]=h2Pt(sk,d.x,0,d.z);ax=256;ay=512;}
  const k=s/256,fl=!d.wall&&(d.r||0)%2?-1:1,bb=f.bb;
  g.save();g.translate(X,Y);g.scale(fl,1);
  if(f.gbb){const gi=h2Img('g_'+id);if(gi){g.globalAlpha=.55+.45*night;g.drawImage(gi,(f.gbb[0]-ax)*k,(f.gbb[1]-ay)*k,(f.gbb[2]-f.gbb[0])*k,(f.gbb[3]-f.gbb[1])*k);g.globalAlpha=1;}}
  if(!d.wall&&it.d.k!=='rug'){g.fillStyle='rgba(40,20,10,.18)';g.beginPath();g.ellipse(0,-2*k,(bb[2]-bb[0])*k*.42,(bb[2]-bb[0])*k*.08,0,0,7);g.fill();}
  g.drawImage(im,(bb[0]-ax)*k,(bb[1]-ay)*k,(bb[2]-bb[0])*k,(bb[3]-bb[1])*k);g.restore();
  const rx=fl<0?X-(bb[2]-ax)*k:X+(bb[0]-ax)*k;H2.rects.push({it,r:[rx,Y+(bb[1]-ay)*k,(bb[2]-bb[0])*k,(bb[3]-bb[1])*k]});}
function h2Draw(dt){H2.t+=dt;const cv=H2.cv,g=H2.g;if(!H2.shown){cv.hidden=false;H2.shown=true;H2.cx=null;}
  const dpr=Math.min(1.5,devicePixelRatio||1),cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);if(!cw||!ch)return;if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
  const sk=h2Scene();if(sk!==H2.sk){H2.sk=sk;H2.cx=null;}const S_=HROOM.scenes[sk],Wi=S_.w,Hi=S_.h,H=homeState();
  // the room ends at z=H2ZC: the big empty front floor is cropped away, so the room feels smaller and cosier
  if(P.pos.z>HZ+H2ZC-.25){P.pos.z=HZ+H2ZC-.25;P.vel.z=0;}
  // keep the player inside the painted view
  {const lx=P.pos.x-HX,lz=P.pos.z-HZ;const [X]=h2Pt(sk,lx,0,lz);const m=90;if(X<m||X>Wi-m){const s=h2Pt(sk,0,0,lz)[2];const nx=((X<m?m:Wi-m)-h2Pt(sk,0,0,lz)[0])/s/H2MAP[sk].ax;P.pos.x=HX+nx;P.vel.x=0;}}
  // view: cover + follow, or contain beside the decorating panel
  let s,ox,oy;const ed=HOME.edit&&!$('decor').hidden;
  if(ed){const port=sk==='portrait',aw=port?cw:cw*.64,ah=port?ch*.58:ch;s=Math.min(aw/Wi,ah/Hi);ox=-(aw-Wi*s)/2/s;oy=-(ah-Hi*s)/2/s;H2.cx=null;}
  else{const Hc=Math.min(Hi,h2Pt(sk,0,0,H2ZC+.35)[1]);s=Math.max(cw/Wi,ch/Hc)*(sk==='portrait'?1.04:1.02);const vw=cw/s,vh=ch/s;const [PX,PY]=h2Pt(sk,P.pos.x-HX,0,P.pos.z-HZ);const wx=clamp(PX-vw/2,0,Wi-vw),wy=clamp(PY-vh*.62,0,Math.max(0,Hc-vh));
    if(H2.cx==null){H2.cx=wx;H2.cy=wy;}else{const e=1-Math.exp(-dt*5);H2.cx=lerp(H2.cx,wx,e);H2.cy=lerp(H2.cy,wy,e);}ox=H2.cx;oy=H2.cy;}
  H2.view={s:s/dpr,ox,oy};g.setTransform(1,0,0,1,0,0);g.fillStyle='#2a1a14';g.fillRect(0,0,cw,ch);g.setTransform(s,0,0,s,-ox*s,-oy*s);g.imageSmoothingQuality='medium';
  const bg=h2Img(sk+'_bg');if(bg)g.drawImage(bg,0,0);
  const wid=WALL_ID[H.wall]||'ivory',fid=FLOOR_ID[H.floor]||'natural_wood';
  const wl=h2Img(`${sk}_wall_${wid}`);if(wl&&wid!=='ivory'){const o=S_.wall[wid];g.drawImage(wl,o[0],o[1]);}
  const fl=h2Img(`${sk}_floor_${fid}`);if(fl&&fid!=='natural_wood'){const o=S_.floor[fid];g.drawImage(fl,o[0],o[1]);}
  const night=S.night||0;
  // window at night
  if(night>.02){const w=H2FIX[sk].win;g.save();g.globalAlpha=night*.72;g.fillStyle='#17214a';g.fillRect(w[0]+w[2]*.07,w[1]+w[3]*.08,w[2]*.86,w[3]*.8);g.globalAlpha=night;g.fillStyle='#fff6d0';for(let i=0;i<12;i++)g.fillRect(w[0]+w[2]*(.1+((i*37)%80)/100),w[1]+w[3]*(.12+((i*23)%40)/100),2.4,2.4);g.restore();}
  // stamp board
  {const r=S_.slot,b=HOME.boardCanvas;if(r&&b){const k=Math.min(r[2]/b.width,r[3]/b.height),w=b.width*k,h=b.height*k;g.drawImage(b,r[0]+(r[2]-w)/2,r[1]+(r[3]-h)/2,w,h);}}
  H2.rects=[];
  // wall items, rugs, then depth-sorted floor items + actors + fixed-furniture fronts
  HOME.items.filter(it=>it.d.wall).forEach(it=>h2Furn(g,it,sk,night));
  HOME.items.filter(it=>!it.d.wall&&it.d.k==='rug').forEach(it=>h2Furn(g,it,sk,night));
  const L=[];HOME.items.filter(it=>!it.d.wall&&it.d.k!=='rug').forEach(it=>{const [,Y]=h2Pt(sk,it.d.x,0,it.d.z);L.push([Y,()=>h2Furn(g,it,sk,night)]);});
  const pp=pl.g.position;const fX=h2Pt(sk,pp.x-HX,0,pp.z-HZ)[0];
  // a fixed-furniture front only hides the player when the feet are really behind it (not standing beside its end)
  S_.occ.forEach(o=>{const im=h2Img(`${sk}_occ_${o.id}`);if(im)L.push([(fX<o.x+im.width*.15||fX>o.x+im.width*.85)?-1e9:o.sort,()=>g.drawImage(im,o.x,o.y)]);});
L.push([h2Pt(sk,pp.x-HX,0,pp.z-HZ)[1]+.1,()=>{H2.me=h2Sprite(g,SPR.c,pp.x-HX,P.sit?Math.max(0,pp.y-.28):0,pp.z-HZ,sk);}]);
  if(PETOBJ&&PETOBJ.spr&&PETOBJ.g.visible){const q=PETOBJ.g.position;L.push([h2Pt(sk,q.x-HX,0,q.z-HZ)[1],()=>h2Sprite(g,PETOBJ.spr,q.x-HX,Math.max(0,q.y),q.z-HZ,sk)]);}
  L.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
  if(night>.02){g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(110,100,160,${night*.32})`;g.fillRect(0,0,Wi,Hi);g.restore();}
  // selection marker while decorating
  if(HOME.edit&&HOME.sel){const r=H2.rects.find(x=>x.it===HOME.sel);if(r){g.save();g.strokeStyle='#f2c14e';g.lineWidth=4/s*dpr;g.setLineDash([12,8]);g.strokeRect(r.r[0]-6,r.r[1]-6,r.r[2]+12,r.r[3]+12);g.restore();}}}
// catalogue pictures from the painted furniture
furnPics=function(){if(FURN_PIC._done2)return;const ok=FURN.every(f=>!FURN_SPR[f.k]||h2Img('f_'+FURN_SPR[f.k]));if(!ok){setTimeout(()=>{if(!$('decor').hidden)renderDecor();},400);}
  FURN.forEach(f=>{const id=FURN_SPR[f.k],im=id&&h2Img('f_'+id);if(!im)return;const [c,g]=C2(160,128);const k=Math.min(140/im.width,108/im.height);g.drawImage(im,(160-im.width*k)/2,(128-im.height*k)/2+(f.type==='wall'?0:6),im.width*k,im.height*k);FURN_PIC[f.k]=c.toDataURL('image/png');});
  if(ok)FURN_PIC._done2=true;};
surfPic=function(isWall,id){const k='2'+(isWall?'w:':'f:')+id;if(FURN_PIC[k])return FURN_PIC[k];const nid=isWall?WALL_ID[id]:FLOOR_ID[id];if(!nid)return '';
  const def=isWall?'ivory':'natural_wood';const base=R2.img.home_landscape_bg,lay=nid===def?null:R2.img[`home_landscape_${isWall?'wall':'floor'}_${nid}`];if(!base||!base.complete||(nid!==def&&(!lay||!lay.complete)))return '';
  const [c,g]=C2(160,96);const src=isWall?[1186,40,92,55]:[700,1000,300,180];g.drawImage(base,src[0],src[1],src[2],src[3],0,0,160,96);
  if(lay){const o=TROOM.home.landscape[isWall?'wall':'floor'][nid];g.drawImage(lay,src[0]-o[0],src[1]-o[1],src[2],src[3],0,0,160,96);}return FURN_PIC[k]=c.toDataURL('image/png');};

function h2Preload(){if(!HROOM||H2.pre)return;H2.pre=true;for(const k in HROOM.img)h2Img(k);}setTimeout(h2Preload,4000);

/* ================================================================
   Station lobby: 2D painted scene (ChatGPT illustration) over the 3D station logic
   ================================================================ */
const SROOM=(()=>{try{return JSON.parse(document.getElementById('sroom').textContent);}catch(e){return null;}})();
const S2={on:false,sk:null,x:0,y:0,vx:0,vy:0,view:2,flip:1,ph:0,spd:0,step:0,tgt:null,pend:null,near:null,cx:null,cy:null,stuck:0,
  pet:{x:0,y:0,ph:0,mv:false,flip:1,idle:0,wag:0},cv:null,g:null,img:{},view_:{s:1,ox:0,oy:0},t:0,slotC:{}};
// spots: [INT key ('=' prefix: exact label), footX, footY, hit rect [x,y,w,h]]
const S2CFG={
  landscape:{hA:[655,1062,215,320],zoom:1.1,door:[610,775],
    walk:[{outer:[[0,655],[1920,655],[1920,1062],[0,1062]],holes:[[[0,640],[352,640],[352,702],[300,772],[60,978],[0,982]],[[1606,695],[1660,688],[1920,700],[1920,992],[1866,992],[1612,784]]]}],
    lines:{bench_left:[[45,966],[300,765]],bench_right:[[1630,765],[1880,970]]},
    spots:[['回家',364,668,[60,130,170,480]],['班級公告',444,668,[235,270,150,240]],['=看時刻表',540,668,[440,280,190,190]],['站務員',960,672,[640,240,640,400]],
      ['發車時刻表',1385,668,[1290,280,190,190]],['剪票口',1628,672,[1500,280,290,380]],['長椅',272,862,[0,580,300,400]],['長椅',1650,862,[1620,586,300,390]]]},
  portrait:{hA:[800,1880,215,420],zoom:1.22,door:[310,1560],
    walk:[{outer:[[205,800],[355,800],[355,842],[722,842],[722,800],[855,800],[865,935],[995,1005],[1000,1095],[922,1100],[922,1545],[1080,1565],[1080,1880],[0,1880],[0,1560],[158,1545],[158,1100],[95,1090]],holes:[]}],
    lines:{bench_left:[[150,1222],[25,1532]],bench_right:[[930,1222],[1055,1532]]},
    spots:[['回家',150,1068,[0,420,120,700]],['班級公告',218,880,[110,520,90,300]],['=看時刻表',300,812,[225,410,140,150]],['站務員',540,852,[350,480,380,360]],
      ['發車時刻表',752,814,[700,400,160,170]],['剪票口',905,985,[830,640,200,300]],['長椅',212,1350,[0,1090,160,450]],['長椅',866,1350,[920,1090,160,450]]]}};
if(SROOM){Object.keys(SROOM.img||{}).forEach(k=>{S2.img[k]=qImg(SROOM.img[k],!/^ic_|door|glow/.test(k));});}
// station v2 (entrance at the bottom, 任意門 painted on the left wall, platform on the right)
if(SROOM&&SROOM.landscape&&SROOM.landscape.walk){['landscape','portrait'].forEach(sk=>{const D=SROOM[sk],A=D.acc,port=sk==='portrait';
  const bb=P=>{const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];},ob=id=>(D.occ.find(o=>o.id===id)||{b:[0,0,1,1]}).b;
  const tl=bb(D.slots.timetable_left),tr=bb(D.slots.timetable_right);
  S2CFG[sk]=Object.assign({},S2CFG[sk],{hA:port?[830,1880,205,420]:[640,1060,228,330],zoom:port?1.18:1.08,door:null,lines:{},walk:D.walk,
    spots:[['回家',D.exitp.center[0],D.exitp.center[1]-25,bb(D.exitp.polygon)],['班級公告',A.noticeboard[0]-(port?18:0),A.noticeboard[1],bb(D.slots.class_noticeboard)],
      ['=看時刻表',tl[0]+tl[2]/2+(port?6:0),port?900:678,tl],['站務員',A.ticket_counter[0],A.ticket_counter[1],ob('counter_front')],
      ['剪票口',A.platform[0],A.platform[1],(()=>{const a=bb(D.platform.polygon),b=ob(port?'ticket_gate_front':'ticket_gate_right');const x0=Math.min(a[0],b[0]),y0=Math.min(a[1],b[1]);return [x0,y0,Math.max(a[0]+a[2],b[0]+b[2])-x0,Math.max(a[1]+a[3],b[1]+b[3])-y0];})()],
      ['長椅',port?210:300,port?1330:842,ob('bench_left')],['長椅',port?870:1620,port?1330:842,ob('bench_right')]]});});}

{const c=document.createElement('canvas');c.id='station2d';c.className='scene2d';c.hidden=true;c.tabIndex=-1;$('stage').appendChild(c);S2.cv=c;S2.g=c.getContext('2d');
  c.addEventListener('pointerdown',e=>{if(!S2.on||!started||uiOpen())return;e.preventDefault();if(DLG.open){interact();return;}
    const r=c.getBoundingClientRect(),V=S2.view_;const ix=V.ox+(e.clientX-r.left)/V.s,iy=V.oy+(e.clientY-r.top)/V.s;
    const hit=s2Spots().slice().reverse().find(s=>{const h=s.def[3];return ix>=h[0]&&ix<=h[0]+h[2]&&iy>=h[1]&&iy<=h[1]+h[3];});
    if(hit){S2.tgt=[hit.def[1],hit.def[2]];S2.pend=hit;}else{S2.tgt=[ix,iy];S2.pend=null;}
    audioInit&&audioInit();});}
const S2INT={};
function s2Int(key){if(S2INT[key])return S2INT[key];const lb=it=>String(typeof it.label==='function'?it.label():it.label);const ex=key[0]==='=',k=ex?key.slice(1):key;
  const it=INT.find(it=>it.pos&&Math.abs(it.pos.x-STX)<8&&Math.abs(it.pos.z-STZ)<6&&(ex?lb(it)===k:lb(it).includes(k)));if(it)S2INT[key]=it;return it;}
function s2Spots(){const C=S2CFG[S2.sk];if(!C)return [];const out=[];
  for(const d of C.spots){const it=s2Int(d[0]);if(!it)continue;if(it.hide&&it.hide())continue;let act=it.act,label=typeof it.label==='function'?it.label():it.label;
    if(d[0]==='長椅'){act=()=>s2Bench(d);label='坐在長椅上';}
    out.push({def:d,it,label,act});}
  const PD=SROOM[S2.sk]&&SROOM[S2.sk].portal;if(PD){const xs=PD.polygon.map(p=>p[0]),ys=PD.polygon.map(p=>p[1]);out.push({def:['任意門',PD.access[0],PD.access[1],[Math.min(...xs)-10,Math.min(...ys),Math.max(...xs)-Math.min(...xs)+20,Math.max(...ys)-Math.min(...ys)]],
    label:TS()?'打開任意門（老師專用）':'任意門',act:()=>{if(TS()&&typeof openPortal==='function')openPortal();else say('任意門',['這是老師專用的任意門，學生打不開喔！','要去別的地方，請到售票台拿車票，從右邊的月台搭火車。'],{noWave:1});}});}
  else if(TS()&&typeof openPortal==='function'&&C.door){const [dx,dy]=C.door,H=s2H(dy)*1.25;out.push({def:['任意門',dx-H*.42,dy+18,[dx-H*.36,dy-H,H*.72,H]],label:'打開任意門（老師專用）',act:()=>openPortal()});}
  return out;}
function s2Ok(){return !!(SROOM&&SROOM.landscape&&S2.img.landscape_bg&&spr2d());}
function s2H(y){const a=S2CFG[S2.sk].hA;return lerp(a[2],a[3],clamp((y-a[0])/(a[1]-a[0]),0,1));}
function s2Walk(x,y){const C=S2CFG[S2.sk];if(TS()&&C.door){const [dx,dy]=C.door,H=s2H(dy)*1.25;if(Math.abs(x-dx)<H*.34&&Math.abs(y-dy)<16)return false;}
  return C.walk.some(w=>r2Pip(x,y,w.outer)&&!w.holes.some(h=>r2Pip(x,y,h)));}
function s2Near(x,y){if(s2Walk(x,y))return [x,y];for(let r=6;r<600;r+=8)for(let a=0;a<6.28;a+=.26){const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(s2Walk(px,py))return [px,py];}return [x,y];}
function s2Enter(from){S2.act=null;if(!s2Ok()){S2.on=false;S2.retry=true;return false;}S2.retry=false;S2.on=true;S2.sk=r2Scene();const C=S2CFG[S2.sk],D=SROOM[S2.sk];
  const sp=D.exitp?null:(from==='home'?C.spots[0]:null);const ep=D.exitp&&D.exitp.spawn;[S2.x,S2.y]=s2Near(ep?ep[0]:sp?sp[1]+60:D.w*.5,ep?ep[1]:sp?sp[2]+30:(S2.sk==='portrait'?1500:900));
  S2.vx=S2.vy=0;S2.view=sp?1:2;S2.flip=1;S2.tgt=S2.pend=null;S2.cx=S2.cy=null;S2.stuck=0;
  const Q=S2.pet;[Q.x,Q.y]=s2Near(S2.x+s2H(S2.y)*.4,S2.y+4);Q.idle=0;Q.mv=false;Q.flip=-1;S2.cv.hidden=false;return true;}
// sit on a station bench (side view, facing into the hall); any movement stands up again
function s2Bench(d){const port=S2.sk==='portrait',left=d[1]<(port?540:960),D=SROOM[S2.sk];const seat=port?[left?88:992,1268]:[left?132:1788,768];
  const oc=D&&(D.occ||[]).find(o=>o.id===(left?'bench_left':'bench_right'));
  if(r2ActPlay('d.sit_side',{at:seat,foot:seat[1]+(port?40:30),flip:left?1:-1,hold:true,over:(oc?oc.sort:seat[1])+1},S2)){toast('坐在長椅上休息……（動一下就會起來）');dailyEvent&&dailyEvent('sit');return;}
  say('長椅',['窗外的山好近。風從月台吹進來，有一點涼。']);}
function s2Off(){S2.on=false;S2.act=null;S2.retry=false;S2.tgt=S2.pend=null;if(S2.cv)S2.cv.hidden=true;}
function s2Swap(sk){const A0=SROOM[S2.sk],B0=SROOM[sk];const u=S2.x/A0.w,v=S2.y/A0.h;S2.sk=sk;[S2.x,S2.y]=s2Near(u*B0.w,v*B0.h);[S2.pet.x,S2.pet.y]=s2Near(S2.x+40,S2.y+6);S2.tgt=S2.pend=null;S2.cx=S2.cy=null;}
function s2Move(dt){let ix=0,iy=0;const free=!DLG.open&&started&&!uiOpen();
  if(S2.act){r2ActInput(dt,S2);return;}
  if(free){if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;ix+=STK.x;iy+=STK.y;}
  const H=s2H(S2.y);const run=(keys.shift||touchRun);const spW=H*1.2,sp=spW*(run?1.9:1);let tx=0,ty=0;
  if(Math.hypot(ix,iy)>.1){S2.tgt=S2.pend=null;const l=Math.max(1,Math.hypot(ix,iy));tx=ix/l*sp;ty=iy/l*sp*.78;}
  else if(S2.tgt&&free){const dx=S2.tgt[0]-S2.x,dy=S2.tgt[1]-S2.y,d=Math.hypot(dx,dy);
    if(d<12||S2.stuck>.5){S2.tgt=null;S2.stuck=0;const s=S2.pend;S2.pend=null;if(s){S2.view=2;S2.vx=S2.vy=0;s.act();}}
    else{const k=Math.min(sp,d*6)/d;tx=dx*k;ty=dy*k;}}
  const e=1-Math.exp(-dt*12);S2.vx=lerp(S2.vx,tx,e);S2.vy=lerp(S2.vy,ty,e);
  const nx=S2.x+S2.vx*dt,ny=S2.y+S2.vy*dt,ox=S2.x,oy=S2.y;
  if(s2Walk(nx,ny)){S2.x=nx;S2.y=ny;}else if(s2Walk(nx,S2.y)){S2.x=nx;S2.vy*=.5;}else if(s2Walk(S2.x,ny)){S2.y=ny;S2.vx*=.5;}else{S2.vx*=.3;S2.vy*=.3;}
  const moved=Math.hypot(S2.x-ox,S2.y-oy);if(S2.tgt&&moved<spW*dt*.05)S2.stuck+=dt;else S2.stuck=0;
  const spd=moved/Math.max(dt,1e-4);S2.spd=spd/spW;P.moving=S2.spd*3.9;
  if(spd>spW*.12){const ax=Math.abs(S2.vx),ay=Math.abs(S2.vy)/.78;
    if(S2.view===1?ax>ay*.6:ax>ay*1.25){S2.view=1;S2.flip=S2.vx<0?-1:1;}else S2.view=S2.vy<0?2:0;}
  // with a ticket in hand, simply walking into the gate passes through it (no need to find the E button)
  if(ST.ticket&&free&&spd>spW*.2){const g=s2Spots().find(q=>/剪票/.test(q.def[0]));if(g&&Math.hypot(g.def[1]-S2.x,g.def[2]-S2.y)<H*.22){S2.vx=S2.vy=0;S2.tgt=S2.pend=null;g.act();return;}}
  S2.ph+=dt*7.3*Math.min(2,S2.spd);S2.step+=dt*S2.spd;if(S2.step>.34){S2.step=0;SND.step('wood');}
  const Q=S2.pet;if(PETOBJ&&PETOBJ.spr){const side=S2.view===1?-S2.flip:(Q.x<S2.x?-1:1);const gx=S2.x+side*H*.42,gy=S2.y-8;
    const dx=gx-Q.x,dy=gy-Q.y,d=Math.hypot(dx,dy),busy=PETOBJ.trick||PETOBJ.anim;
    if(!busy&&(d>H*.5||(Q.mv&&d>H*.12))){const ps=Math.max(spd*1.05,H*1.2),st=Math.min(ps*dt,d);let px=Q.x+dx/d*st,py=Q.y+dy/d*st;
      if(!s2Walk(px,py)){if(s2Walk(px,Q.y))py=Q.y;else if(s2Walk(Q.x,py))px=Q.x;else{px=Q.x;py=Q.y;}}Q.x=px;Q.y=py;Q.mv=true;Q.idle=0;if(Math.abs(dx)>4)Q.flip=dx<0?-1:1;Q.back=Q.back?(dy<0&&-dy/.78>Math.abs(dx)*.8):(dy<0&&-dy/.78>Math.abs(dx)*1.25);Q.ph+=dt*10;}
    else{Q.mv=false;Q.idle+=dt;}
    if(Q.wag>0)Q.wag-=dt;else if(!Q.mv&&Q.idle>2&&Q.idle<7&&Math.random()<dt*.25)Q.wag=1.2;}}
function s2Nearest(){let best=null,bd=1e9;const H=s2H(S2.y);
  // standing IN FRONT of a thing (lower on screen) counts from further away than standing behind it — kids stop in front of the gate, not inside it
  for(const s of s2Spots()){const dy=s.def[2]-S2.y;const d=Math.hypot(s.def[1]-S2.x,dy*(dy<0?.5:1.2));const r=H*(/剪票/.test(s.def[0])?.5:.36)*(IS_TOUCH?1.4:1);if(d<r&&d<bd){bd=d;best=s;}}
  S2.near=best;return best?{label:best.label,act:best.act}:null;}
// draw a rectangular canvas into a (perspective) quad [tl,tr,br,bl] using two affine triangles
function s2Quad(g,src,q){const w=src.width,h=src.height;
  const tri=(s0,s1,s2_,d0,d1,d2)=>{g.save();g.beginPath();g.moveTo(d0[0],d0[1]);g.lineTo(d1[0],d1[1]);g.lineTo(d2[0],d2[1]);g.closePath();g.clip();
    const [x0,y0]=s0,[x1,y1]=s1,[x2,y2]=s2_,den=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    const a=((d1[0]-d0[0])*(y2-y0)-(d2[0]-d0[0])*(y1-y0))/den,b=((d1[1]-d0[1])*(y2-y0)-(d2[1]-d0[1])*(y1-y0))/den,
      c=((d2[0]-d0[0])*(x1-x0)-(d1[0]-d0[0])*(x2-x0))/den,d=((d2[1]-d0[1])*(x1-x0)-(d1[1]-d0[1])*(x2-x0))/den;
    g.transform(a,b,c,d,d0[0]-a*x0-c*y0,d0[1]-b*x0-d*y0);g.drawImage(src,0,0);g.restore();};
  // slight overlap along the diagonal hides the seam
  const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,grow=p=>[p[0]+(p[0]-cx)*.004,p[1]+(p[1]-cy)*.004];
  tri([0,0],[w,0],[w,h],grow(q[0]),grow(q[1]),grow(q[2]));tri([0,0],[w,h],[0,h],grow(q[0]),grow(q[2]),grow(q[3]));}
function s2SlotCanvas(k){const now=Math.floor(Date.now()/60000),key=k+':'+now+':'+(TS()?1:0);if(S2.slotC[k]&&S2.slotC[k].key===key)return S2.slotC[k].c;
  const [c,x]=C2(300,320);x.textAlign='center';x.textBaseline='middle';
  if(k==='timetable_left'){x.fillStyle='#f7f3ea';x.fillRect(0,0,300,320);x.fillStyle='#2f6b56';x.fillRect(0,0,300,62);x.fillStyle='#fff';x.font=`800 30px ${FG}`;x.fillText('時刻表',150,24);x.font=`600 17px ${FG}`;x.fillText('汐見町方面',150,49);
    const rows=[['07','05　35'],['08','05　40'],['09','10'],['10','10'],['12','10'],['13','15　45'],['15','10　40'],['16','10　40'],['17','10'],['18','20']];
    x.textAlign='left';rows.forEach((r,i)=>{const y=82+i*22;x.fillStyle=i%2?'#efe8da':'#f7f3ea';x.fillRect(8,y-11,284,22);x.fillStyle='#3a2a20';x.font=`800 18px ${FG}`;x.fillText(r[0],22,y+1);x.font=`500 17px ${FG}`;x.fillText(r[1],72,y+1);});
    x.textAlign='center';x.fillStyle='#8a6a4a';x.font=`600 16px ${FG}`;x.fillText('每班 10 分鐘就到汐見町',150,305);}
  else if(k==='timetable_right'){x.fillStyle='#15171c';x.fillRect(0,0,300,320);x.fillStyle='#f2c14e';x.font=`800 26px ${FG}`;x.fillText('發車 Departures',150,32);x.fillStyle='rgba(255,255,255,.14)';x.fillRect(12,58,276,2);
    x.textAlign='left';DESTS().forEach((d,i)=>{const y=92+i*52;x.fillStyle=d.open?'#e8f0ff':'#7a808c';x.font=`700 24px ${FG}`;x.fillText(`${d.ic} ${d.name.replace(/（.*?）/,'')}`,16,y);x.textAlign='right';x.font=`700 18px ${FG}`;x.fillStyle=d.open?'#7fe0a0':'#e0a060';x.fillText(d.open?'搭乘中':'施工中',288,y+22);x.textAlign='left';});}
  else if(k==='class_noticeboard'){x.clearRect(0,0,300,320);x.fillStyle='#b8452f';x.fillRect(40,8,220,40);x.fillStyle='#fff3dd';x.font=`800 24px ${FG}`;x.fillText('班級公告',150,29);
    const news=newsList().slice(0,4);const notes=[['#f7f2e8',22,66,124,108,-.05],['#ffe9a8',154,62,124,112,.04],['#d9e8f7',40,188,118,110,.03],['#f7f2e8',166,190,110,104,-.04]];
    notes.forEach(([cl,nx,ny,w,h,r],i)=>{x.save();x.translate(nx+w/2,ny+h/2);x.rotate(r);x.fillStyle='rgba(60,40,20,.25)';x.fillRect(-w/2+3,-h/2+4,w,h);x.fillStyle=cl;x.fillRect(-w/2,-h/2,w,h);
      x.fillStyle='#c8432b';x.beginPath();x.arc(0,-h/2+8,6,0,7);x.fill();const n=news[i];
      if(n&&(n.title||n.body)){x.fillStyle='#3a2a20';x.font=`800 17px ${FG}`;x.textAlign='center';const t=String(n.title||n.body).slice(0,14);x.fillText(t.slice(0,7),0,-h/2+34);if(t.length>7)x.fillText(t.slice(7),0,-h/2+56);}
      x.fillStyle='rgba(60,50,40,.45)';for(let j=0;j<3;j++)x.fillRect(-w/2+14,-h/2+(n?68:28)+j*14,w-28,4);x.restore();});}
  S2.slotC[k]={key,c};return c;}
function s2Slots(g){const D=SROOM[S2.sk];Object.entries(D.slots||{}).forEach(([k,q])=>{const c=s2SlotCanvas(k);g.save();if(k!=='class_noticeboard'){g.globalAlpha=.97;}s2Quad(g,c,q);g.restore();});}
function s2Sprite(g,c,x,y,H,f,flip){const M=c.meta,im=c.mat.map.image;const dh=H*M.ch/M.hpx,dw=dh*M.cw/M.ch;
  g.save();g.translate(x,y);g.fillStyle='rgba(40,20,10,.28)';g.beginPath();g.ellipse(0,0,dw*.26,dw*.07,0,0,7);g.fill();g.scale(flip||1,1);const [sx,sy]=fxy(M,f);g.drawImage(im,sx,sy,M.cw,M.ch,-dw/2,-dh+(M.foot!=null?M.foot:3)/M.ch*dh,dw,dh);g.restore();}
function s2Human(g){if(S2.act&&r2ActDraw(g,S2))return;const c=spr2d();if(!c)return;const M=c.meta;const v=S2.view,moving=S2.spd>.15;const list=v===0?M.fw:v===1?M.sw:M.bw;let f=v;
  if(moving&&list&&list.length===4)f=list[Math.floor(((S2.ph*1.3/(PI*2))%1+1)%1*4)];s2Sprite(g,c,S2.x,S2.y,s2H(S2.y),f,v===1?S2.flip:1);}
function s2Pet(g){const o=PETOBJ;if(!o||!o.spr||!o.spr.ready||!o.spr.mat.map)return;const c=o.spr,A_=c.meta.act||{},Q=S2.pet;let f=0,flip=1;
  if(o.trick||o.anim){f=c.frame;flip=Math.sign(c.m.scale.x)||1;}else if(Q.mv&&Q.back&&c.meta.bw){f=Math.sin(Q.ph)>0?c.meta.bw[0]:c.meta.bw[1];}   // walking up the picture = away from the viewer: back frames
  else if(Q.mv){f=A_.run_1!=null?A_['run_'+(Math.floor(Q.ph%4)+1)]:(Math.sin(Q.ph)>0?1:2);flip=Q.flip;}
  else if(Q.idle>16&&A_.sleep!=null)f=A_.sleep;else if(Q.idle>8&&A_.lie!=null)f=A_.lie;else if(Q.wag>0&&A_.wag_A!=null)f=Math.floor(Q.wag*6)%2?A_.wag_B:A_.wag_A;
  s2Sprite(g,c,Q.x,Q.y,s2H(Q.y)*.42,f,flip);}
function s2Master(g){const n=NPC_SPR.find(n=>Math.abs(n.pos.x-STX)<8&&Math.abs(n.pos.z-STZ)<6);if(!n||!n.c.ready||!n.c.mat.map)return;
  const v2=SROOM[S2.sk]&&SROOM[S2.sk].exitp;const cx=S2.sk==='portrait'?540:960,fy=S2.sk==='portrait'?(v2?800:760):(v2?606:600);s2Sprite(g,n.c,cx,fy,s2H(S2.sk==='portrait'?(v2?840:800):(v2?640:655))*.98,0,1);}
function s2Door(g){if(!TS())return;const [dx,dy]=S2CFG[S2.sk].door,H=s2H(dy)*1.25,im=S2.img.door_closed;if(!im||!im.complete)return;const w=H*im.width/im.height;
  g.save();g.fillStyle='rgba(40,20,10,.25)';g.beginPath();g.ellipse(dx,dy,w*.5,w*.08,0,0,7);g.fill();g.globalAlpha=.35+.2*Math.sin(S2.t*2);g.fillStyle='#ffe7a8';g.beginPath();g.ellipse(dx,dy-H*.5,w*.7,H*.62,0,0,7);g.fill();g.restore();
  g.drawImage(im,dx-w/2,dy-H,w,H);}
function s2Draw(dt){S2.t+=dt;const cv=S2.cv,g=S2.g;const dpr=Math.min(1.5,devicePixelRatio||1);const cw=Math.round(cv.clientWidth*dpr),ch=Math.round(cv.clientHeight*dpr);
  if(!cw||!ch)return;if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch;}
  const sk=r2Scene();if(sk!==S2.sk)s2Swap(sk);const D=SROOM[S2.sk],C=S2CFG[S2.sk],Wi=D.w,Hi=D.h;
  const s=Math.max(cw/Wi,ch/Hi)*C.zoom,vw=cw/s,vh=ch/s;
  const wantX=clamp(S2.x-vw/2,0,Wi-vw),wantY=clamp(S2.y-s2H(S2.y)*.5-vh/2,0,Hi-vh);
  if(S2.cx==null){S2.cx=wantX;S2.cy=wantY;}else{const e=1-Math.exp(-dt*4);S2.cx=lerp(S2.cx,wantX,e);S2.cy=lerp(S2.cy,wantY,e);}
  S2.view_={s:s/dpr,ox:S2.cx,oy:S2.cy};
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#2a1a10';g.fillRect(0,0,cw,ch);g.setTransform(s,0,0,s,-S2.cx*s,-S2.cy*s);g.imageSmoothingQuality='medium';
  const bg=S2.img[S2.sk+'_bg'];if(bg&&bg.complete)g.drawImage(bg,0,0,Wi,Hi);
  s2Slots(g);s2Master(g);
  const L=[];D.occ.forEach(o=>{const ln=C.lines[o.id];L.push([ln?r2Sort({line:ln,sort:o.sort},S2.x):o.sort,()=>{const im=S2.img[o.file];if(im&&im.complete)g.drawImage(im,o.x,o.y);}]);});
  if(TS()&&C.door)L.push([C.door[1],()=>s2Door(g)]);
  L.push([S2.act&&S2.act.over!=null?S2.act.over:S2.y,()=>s2Human(g)]);if(PETOBJ)L.push([S2.pet.y,()=>s2Pet(g)]);L.sort((a,b)=>a[0]-b[0]).forEach(e=>e[1]());
  const nt=S.night||0;if(nt>.02){g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(120,110,170,${nt*.3})`;g.fillRect(0,0,Wi,Hi);g.restore();}
  const n=S2.near;if(n&&!DLG.open){const h=n.def[3],mx=h[0]+h[2]/2,my=Math.max(S2.cy+30,h[1]-8)+Math.sin(S2.t*4)*6,sz=s2H(S2.y)*.07;
    g.save();g.fillStyle='#fff';g.strokeStyle='rgba(60,30,10,.6)';g.lineWidth=sz*.18;g.beginPath();g.moveTo(mx-sz,my-sz*1.3);g.lineTo(mx+sz,my-sz*1.3);g.lineTo(mx,my);g.closePath();g.stroke();g.fill();g.restore();}}

/* ================================================================
   任意門 (teacher only): pick a place, the door opens, warm light, you're there
   ================================================================ */
function warpTown(x,z,yaw,y){const gy=y!=null?y:groundH(x,z);P.sit=null;P.pos.set(x,gy,z);P.vel.set(0,0,0);P.yaw=yaw;cam.yaw=yaw+PI;cam.pitch=.22;
  cam.pos.set(x-Math.sin(yaw)*5,gy+3,z-Math.cos(yaw)*5);cam.look.set(x,gy+1.4,z);curArea=null;areaCoolReset();if(PETOBJ){PETOBJ.g.position.set(x+1,gy,z+.6);PETOBJ.by=gy;}}
function portalReset(){VISIT=null;if(CLS_IN||FIELD_IN||MART_IN||GATE_IN){CLS_IN=FIELD_IN=MART_IN=GATE_IN=false;INDOOR=false;}if(DLG.open)closeDlg();closeShop();closeBag();try{closeCabin();}catch(e){}try{closeDecor();}catch(e){}r2Off();s2Off();
  if(MZ_IN){MZ_IN=false;$('mzMap').hidden=true;LANTERN.intensity=0;sky.visible=true;scene.background=null;}
  CH_IN=ISL_IN=TC_IN=CY_IN=HOME_IN=false;if(ST_IN)leaveStation();INDOOR=false;$('homeBar').hidden=true;P.sit=null;MART.basket=[];if(typeof updateBasket==='function')updateBasket();}
const PORTAL={
  station:()=>enterStation({now:true}),
  shopping_street:()=>warpTown(0,8,PI),
  convenience_store:()=>enterMart(),
  shrine:()=>warpTown(-50,70,0),
  challenge_hall:()=>enterHall(),
  beach:()=>warpTown(24,-49,PI),
  lighthouse:()=>warpTown(75,-99.6,PI),
  mystery_island:()=>islandGo(),
  waterfall:()=>warpTown(FALL.x,FALL.z-3.6,PI,4),
  waterfall_maze:()=>enterMaze(),
  teacher_cabin:()=>enterCabinDirect(),
  student_home:()=>arriveTribe('houses')};
(function(){const d=document.createElement('div');d.id='portal';d.hidden=true;d.innerHTML=`<div class="sh-in"><div class="sh-hd"><b>🚪 任意門</b><span class="sh-coin">老師專用</span><button type="button" class="sh-x" aria-label="關閉">✕</button></div>
  <p class="pt-help">想去哪裡？點一下，門打開就到了。</p><div class="pt-grid"></div></div>`;document.body.appendChild(d);d.querySelector('.sh-x').onclick=closePortal;d.addEventListener('keydown',e=>e.stopPropagation());
  const fx=document.createElement('div');fx.id='portalFx';fx.hidden=true;fx.innerHTML='<div class="pf-bg"></div><img class="pf-door" alt=""><img class="pf-glow" alt="">';document.body.appendChild(fx);})();
function openPortal(){if(!TS()||!SROOM)return;if(DLG.open)closeDlg();const d=$('portal'),G_=d.querySelector('.pt-grid');G_.innerHTML='';
  SROOM.icons.forEach(([id,nm])=>{const im=S2.img['ic_'+id];const b=el('button',{type:'button',class:'pt-it',html:`<img alt="" src="${im?im.src:''}"><b>${id==='student_home'?'學生的家（Sqoyaw）':nm}</b>`});
    b.onclick=()=>{closePortal();portalGo(id,id==='student_home'?'Sqoyaw・學生的家':nm);};G_.appendChild(b);});
  d.hidden=false;SND.pick&&SND.pick();}
function closePortal(){if($('portal').hidden)return;$('portal').hidden=true;cv.focus({preventScroll:true});}
function portalGo(id,nm){const go=PORTAL[id];if(!go)return;const fx=$('portalFx'),door=fx.querySelector('.pf-door'),glow=fx.querySelector('.pf-glow');
  door.src=S2.img.door_closed.src;glow.src=S2.img.glow.src;fx.className='';fx.hidden=false;void fx.offsetWidth;fx.classList.add('in');
  SND.pick&&SND.pick();
  setTimeout(()=>{door.src=S2.img.door_open.src;fx.classList.add('open');cutSnd&&cutSnd(t=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.07,.5,'sine',.05,A.sfx)));},520);
  setTimeout(()=>{fx.classList.add('glow');},820);
  setTimeout(()=>{portalReset();try{go();}catch(e){console.error(e);}},1500);
  setTimeout(()=>{fx.classList.add('out');},2150);
  setTimeout(()=>{fx.hidden=true;fx.className='';toast(`🚪 任意門：到了「${nm}」`);},2900);}

/* ================================================================
   部落 — a mountain-valley village (inspired by 環山): the students' homes
   ================================================================ */
/* ================================================================
   Sqoyaw (環山) — the students' home village, traced from Google Maps (map/satellite/terrain):
   a hillside village rising to the north-east (~20% grade), 大甲溪 gorge to the west,
   平等國小 on a flat terrace in the south-west, 台7甲 round the east, 7-11 / 派出所 / 環清宮 far south.
   Local coords: lx = east, lz = south (north is -z).  ~0.4 game units per metre.
   ================================================================ */
const TB={x:2600,z:0,houses:{},spots:{},flags:{}};
// Sqoyaw 動物之家・野生動物救傷站: a flat yard at the east end of 同學巷 (local x 86..110, z -60..-36)
const AC={x0:86,x1:110,z0:-60,z1:-36,y:19,objs:[],gate:null};
function tbIn(){return !INDOOR&&P.pos.x>2300;}
const SQ_RV=[[-150,-140],[-136,-70],[-130,-45],[-124,-10],[-118,25],[-113,55],[-113,85],[-122,120],[-138,160],[-155,200]];
function sqRX(lz){const R=SQ_RV;if(lz<=R[0][1])return R[0][0];for(let i=0;i<R.length-1;i++){const a=R[i],b=R[i+1];if(lz<=b[1])return lerp(a[0],b[0],(lz-a[1])/(b[1]-a[1]));}return R[R.length-1][0];}
const SQ_MTN=[[-170,-95],[-60,-110],[0,-130],[30,-137],[80,-122],[140,-107],[155,-40],[155,30],[140,85],[112,118],[65,137],[30,152],[10,170],[-20,182],[-60,195],[-95,190],[-105,160],[-130,150],[-160,120],[-175,40],[-180,-40]];
function sqSD(x,z){const Pp=SQ_MTN;let d=1e9,ins=false,qx=0,qz=0;for(let i=0,j=Pp.length-1;i<Pp.length;j=i++){const a=Pp[j],b=Pp[i];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])ins=!ins;const r=sqSegD(x,z,a,b);if(r[0]<d){d=r[0];qx=r[1];qz=r[2];}}return [ins?-d:d,qx,qz];}
function sqE(lx,lz){return Math.max(0,sqSD(lx,lz)[0]+(fbm(lx*.015+3,lz*.015+9)-.5)*14);}
function sqPlane(lx,lz){return 3.2+.142*lx-.144*Math.min(lz,60)-.05*Math.max(0,lz-60);}
function sqBase(lx,lz,old){
  let h=sqPlane(lx,lz)+Math.sin(lx*.07+lz*.05)*.35;
  h=lerp(h,-9.6,smooth(5,0,Math.max(0,old?Math.abs(lx+60)-14:Math.abs(lx+66.5)-21.5,Math.abs(lz-30)-15)));     // 平等國小 terrace + field (widened west for the lawn, fish slide & pull-up bars)
  h=lerp(h,17.5,smooth(5,0,Math.max(0,Math.abs(lx-50)-28,Math.abs(lz+50)-8)));      // 同學巷 terrace
  h=lerp(h,AC.y,smooth(5,0,Math.max(0,Math.abs(lx-98)-12.6,Math.abs(lz+48)-12.6)));   // 動物之家 yard
  const rd=Math.abs(lx-sqRX(lz));h=lerp(-30,h,smooth(6.5,16,rd));                   // 大甲溪 gorge
  const e=sqE(lx,lz);
  if(e>0)h+=e*.5+smooth(4,150,e)*120+(fbm(lx*.02+7,lz*.02+3)-.5)*34*smooth(0,50,e)+(fbm(lx*.07,lz*.07)-.5)*3*smooth(0,10,e);
  return h;}
const SQ_BR={z:-45,x0:-114,x1:-146};
function tribeH(lx,lz){
  if(Math.abs(lz-SQ_BR.z)<1.4&&lx<SQ_BR.x0&&lx>SQ_BR.x1){const t=(lx-SQ_BR.x0)/(SQ_BR.x1-SQ_BR.x0);return lerp(sqBase(SQ_BR.x0,SQ_BR.z),sqBase(SQ_BR.x1,SQ_BR.z),t)-1.3*Math.sin(t*PI);}  // 四季蘭溪吊橋 deck
  if(TB.pads)for(const q of TB.pads)if(q.e?((q.e===2||lz>q.cz)&&((lx-q.cx)/q.rx)**2+((lz-q.cz)/q.rz)**2<1):(lx>q.x0&&lx<q.x1&&lz>q.z0&&lz<q.z1))return q.y;
  return TB.terrH?TB.terrH(lx,lz):sqBase(lx,lz);}
function tbClamp(p){let lx=p.x-TB.x,lz=p.z-TB.z;
  if(Math.abs(lz-SQ_BR.z)<1.3&&lx<SQ_BR.x0+1&&lx>SQ_BR.x1-1){}                                  // on the bridge
  else if(lx<=SQ_BR.x1){lx=clamp(lx,-154,SQ_BR.x1-.01);lz=clamp(lz,-53,-37);}                // far bank (志佳陽登山口)
  else{const [sd,qx,qz]=sqSD(lx,lz);if(sd>-7){const dx=lx-qx,dz=lz-qz,l=Math.hypot(dx,dz)||1,s=sd>0?-1:1;lx=qx+dx/l*s*7;lz=qz+dz/l*s*7;}
    const m=sqRX(lz)+15;if(lx<m)lx=m;}
  p.x=TB.x+lx;p.z=TB.z+lz;}
// static batching: merge every mesh under HG into G by material + 90 m cell (few draw calls), keep ink outlines on big parts
function sqBatch(G,HG){
   G.updateWorldMatrix(true,true);const inv=new T.Matrix4().copy(G.matrixWorld).invert(),_w=new T.Vector3(),B=new Map(),ALLB=[],mm=new T.Matrix4();
   HG.traverse(o=>{if(!o.isMesh)return;o.getWorldPosition(_w);const key=o.material.uuid+(o.userData.noInk?'n':'i')+Math.floor(_w.x/90)+'_'+Math.floor(_w.z/90);let b=B.get(key);
     if(!b||b.v>16000){b={m:o.material,ni:!!o.userData.noInk,list:[],v:0};B.set(key,b);ALLB.push(b);}
     mm.multiplyMatrices(inv,o.matrixWorld);const gg=o.geometry.clone().applyMatrix4(mm);b.list.push(gg);b.v+=gg.attributes.position.count;});
   ALLB.forEach(b=>{let n=0,ni=0;b.list.forEach(g=>{n+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;});
     const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2),idx=new Uint32Array(ni);let vo=0,io=0;
     b.list.forEach(g=>{const c=g.attributes.position.count;pos.set(g.attributes.position.array,vo*3);nor.set(g.attributes.normal.array,vo*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,vo*2);
       if(g.index){const a=g.index.array;for(let k=0;k<a.length;k++)idx[io+k]=a[k]+vo;io+=a.length;}else{for(let k=0;k<c;k++)idx[io+k]=vo+k;io+=c;}vo+=c;g.dispose();});
     const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(new T.BufferAttribute(idx,1));geo.computeBoundingSphere();geo.computeBoundingBox();try{detGround(geo,G.matrixWorld);}catch(e){}
     const m=new T.Mesh(geo,b.m);m.userData.bld=1;m.castShadow=!b.ni;m.receiveShadow=true;if(b.ni){m.userData.ink=true;if(b.m.isMeshLambertMaterial&&!b.m.transparent)try{inkLambert(b.m);}catch(e){}}G.add(m);});
   G.remove(HG);}
// where players actually walk in Sqoyaw (village, school, the store in the south): trees here get the detailed crown
// 3D sample (第十三批): around 平等國小 the slope trees are drawn as painted leaf cards instead of low-poly crowns
const SQPT=[],SQPT_C=[-62,30],SQPT_R=340;
function sqPaintTrees(IM,kind){if(!ART.leaf_broad_mid)return;const m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3(),Z=new T.Matrix4().makeScale(0,0,0);let n=0;
  const hr=(x,z)=>{const v=Math.sin(x*12.9898+z*78.233)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<IM.count;i++){IM.getMatrixAt(i,m);m.decompose(p,q,sc);if(sc.x<1e-4||Math.hypot(p.x-SQPT_C[0],p.z-SQPT_C[1])>SQPT_R)continue;
    const s=sc.x,sy=sc.y,x=p.x,y=p.y,z=p.z,h=hr(x,z);
    if(kind==='conifer'){SQPT.push(['leaf_conifer',x,y+2.7*sy,z,3.6*s,5.6*sy]);}
    else if(kind==='orchard'){const w=2.5*s;SQPT.push([ART.leaf_orchard?'leaf_orchard':'leaf_broad_mid',x,y+1.3*sy,z,w,w*.9]);}
    else{const cy=y+2.9*sy,w=4.6*s;[['leaf_broad_dark',0,-.35,0,1],['leaf_broad_mid',-.28,.05,.2,.82],['leaf_broad_mid',.3,.1,-.2,.8],['leaf_broad_light',.08,.42,.1,.62]]
      .forEach(([k,a,b,c,f],j)=>SQPT.push([k,x+a*w*(h>.5?1:-1),cy+b*w,z+c*w,w*f,w*f*.9]));}
    IM.setMatrixAt(i,Z);n++;}
  IM.instanceMatrix.needsUpdate=true;return n;}
function sqNearPlay(x,z){return Math.hypot((x+15)/185,(z-25)/175)<1||Math.hypot(x+12,z-155)<60;}   // everything a player can see up close; the far ridges get blobs
function tbMySeat(){const n=parseInt(W.seat,10);return n>0?((n-1)%5)+1:0;}
function sqSegD(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz||1;const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/l2,0,1);return [Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),a[0]+dx*t,a[1]+dz*t];}
function sqNear(x,z,pts){let best=[1e9,0,0];for(let i=0;i<pts.length-1;i++){const r=sqSegD(x,z,pts[i],pts[i+1]);if(r[0]<best[0])best=r;}return best;}
// lanes traced from the map (環山二巷 = the main road through the village)
const SQ_LANES=[
  {n:'環山二巷',w:4.6,p:[[22,-112],[15.2,-79.8],[7.6,-62.7],[-5.9,-48.1],[-6.7,-43.7],[-9.1,-41],[-12.4,-34],[-20.5,-17.5],[-28.7,-11.4],[-31.4,-4.9],[-40.5,2.1],[-43.3,5.1],[-49.2,9.1],[-52.8,13.7],[-58.3,14.4],[-60.4,10.5],[-66.9,3]]},
  {n:'',w:4,p:[[-66.9,3],[-71.4,-1.3],[-73.3,-1.7],[-103.5,-32],[-112.3,-42.4],[-114.5,-45]]},
  {n:'',w:3.2,p:[[-103.5,-32],[-76,-49],[-49.4,-65.2]]},
  {n:'',w:3.6,p:[[-5.9,-48.1],[-18,-58.7],[-28.3,-65.5],[-31.4,-66],[-45.6,-74]]},
  {n:'',w:3.8,p:[[-6.5,-43.5],[-2.1,-42.2],[8,-33.3],[20.1,-22.8],[31,-15.2]]},
  {n:'',w:3.6,p:[[31,-15.2],[33.8,-16.9],[47.7,-32.1],[51.9,-34.2],[54,-34.2]]},
  {n:'',w:3.4,p:[[8.6,-33.4],[16.9,-41.8],[20.3,-41.8],[24.9,-38.2],[24,-46]]},
  {n:'',w:3.8,p:[[31,-15.2],[26.8,-9.9],[25.8,-4.75],[37.2,8.2],[38.4,10.8],[37.8,16],[33,23.8],[31.4,25.1]]},
  {n:'',w:3.8,p:[[31.4,25.1],[25.1,23.2],[7.4,26.2],[.6,25.8],[-5.3,21.9],[-13.5,12.9]]},
  {n:'環山產業道路',w:4.4,p:[[31.2,25.3],[29,32.1],[27.2,34],[11,41.6],[5.9,45.8],[-2.7,60.8],[-6,75],[-2,95],[8,115],[22,132]]},
  {n:'',w:3.6,p:[[8,-33.3],[-.6,-23.8],[-1.1,-22],[-2.7,-21.5],[-10.8,-13.7],[-11.4,-11],[-10.5,-8.7],[-10.6,-6.3],[-19.2,2.85],[-18.8,8],[-13.5,12.9]]},
  {n:'',w:3.2,p:[[-31.4,-4.9],[-25.3,1.5],[-19.2,2.85]]},
  {n:'',w:3.4,p:[[-1.1,-21.9],[10.5,-12],[25.7,-4.6]]},
  {n:'',w:3.4,p:[[-13.5,12.5],[-6.8,5.3],[4.2,-4.2],[10.3,-11.8]]},
  {n:'',w:4,p:[[-15.4,12.7],[-24.3,21.7],[-27,23],[-31.4,28.7],[-36.1,34],[-39.1,35.5],[-41.8,39.5],[-43.7,40.3],[-58,54],[-60.2,54.9]]},
  {n:'',w:3.4,p:[[-41.8,39.5],[-40.9,42.6],[-40.5,53.8],[-41,64],[-44,74]]},
  {n:'同學巷',w:4.4,p:[[24,-46],[78,-46]]}];
const SQ_ROAD=[[120,-100],[122,-85],[127,-57],[131,-28],[133,-9.5],[125,9.5],[118,28.5],[110,47.5],[100,66.5],[90,85],[70,108],[40,126],[22,132],[0,143],[-22,152],[-48,164],[-75,175]];
function sqLaneD(x,z){let b=[1e9,0,0];SQ_LANES.forEach(L=>{const r=sqNear(x,z,L.p);if(r[0]-L.w/2<b[0]){b=[r[0]-L.w/2,r[1],r[2]];}});return b;}
// 走讀 Sqoyaw check-in stations (text from the class lesson plan)
const SQW=[
  {id:'school',n:'平等國小',p:[-37,27],s:['部落裡的學校，是踏查的起點和終點。從操場可以看到四面的山。','學校在部落的中心，是大家每天聚在一起的地方。']},
  {id:'trail',n:'環山獵人登山步道登山口',p:[-68,9],s:['登山口就在學校後方。步道是沿著 Sqoyaw 泰雅族的傳統獵徑修復的，裡面有半穴居、獵人教室。','以前族人就是從這裡上山打獵、採集；2015 年市府和部落長老一起用 GPS 和口述歷史，把古獵徑找回來。','（我們只在入口看解說牌，不進入步道。）']},
  {id:'kinder',n:'幼兒園環山分所',p:[-22,8.5],s:['部落唯一的幼兒園。','很多同學都是從這裡長大的。']},
  {id:'shop',n:'便利商店（7-11 環山門市）',p:[-26,158],s:['部落裡的便利商店，買東西、繳費、領包裹都在這裡，也是大家見面聊天的地方。','以前沒有商店，祖先是用「以物易物」換東西的。']},
  {id:'fruit',n:'以萬果園水果賣場',p:[-26,-5],s:['雜貨＋水果＋家常菜，附近還有愛玉商店、青山商行。','門口的甜柿、水蜜桃、雪梨，就是部落現在的產業。']},
  {id:'bus',n:'環山部落公車站',p:[25,20],s:['台 7 甲線上的公車站：往南到梨山，往北翻過思源埡口到宜蘭。','台 7 甲是部落對外的路；以前族人靠走路，現在有公車和蹦蹦車。']},
  {id:'church',n:'教會',p:[14.5,-31.5],s:['天主堂、長老教會、真耶穌教會都在環山一巷～二巷，彼此相距不到 100 公尺。','教會是部落聚會、唱歌、學母語的地方；很多歌謠和母語，都是在教會裡保留下來的。']},
  {id:'lane2',n:'環山二巷街道與果園',p:[-1,-61],s:['部落的巷道、房子、蹦蹦車（小貨車），還有路邊的果園。','祖先種小米，我們現在種甜柿、水蜜桃、雪梨；秋天甜柿成熟時，整片山都是黃澄澄的。']}];
function sqDone(){return SQW.filter(s=>W.sqw&&W.sqw[s.id]).length;}
function sqCheck(id){const st=SQW.find(s=>s.id===id);if(!st)return;W.sqw=W.sqw||{};const f=TB.flags[id];
  if(!W.sqw[id]&&!TS()){W.sqw[id]=Date.now();const n=sqDone();histAdd&&histAdd('adv',`Sqoyaw 地標打卡：${st.n}`);
    if(f)f.material.color.copy(col('#4fae6c'));SND.pick&&SND.pick();
    if(n>=SQW.length){W.coins+=80;led(80,'走讀 Sqoyaw 全部打卡','獎勵');renderPouch();setTimeout(()=>say('走讀 Sqoyaw',['🎉 八個地方全部打卡完成！+80 金幣','你已經認識 Qalang Sqoyaw 的重要地標了。回家問問長輩：「你小時候的部落跟現在有什麼不一樣？」']),400);}
    else toast(`📍 地標打卡：${st.n}（${n}/${SQW.length}）`);save();}}
function sqStory(id){const st=SQW.find(s=>s.id===id);say(st.n,st.s,{onEnd:()=>sqCheck(id)});}
(function(){
  const G=new T.Group();G.position.set(TB.x,0,TB.z);scene.add(G);TB.g=G;const tc=new T.Color(),t2=new T.Color(),tc2=new T.Color();
  const P_=(x,z,dy=0)=>new T.Vector3(TB.x+x,tribeH(x,z)+dy,TB.z+z);const H=(x,z)=>tribeH(x,z);
  // signboards: framed wooden/painted boards with an icon (no more plain white-with-black-text)
  const SIGN_IC=[[/國小/,'🏫'],[/幼兒園/,'🧸'],[/7-ELEVEN/,'🏪'],[/商店|商行|雜貨|五金|農資/,'🏪'],[/早餐/,'🍳'],[/小吃|麵/,'🍜'],[/愛玉/,'🍧'],[/果|蔬菜/,'🍎'],[/教會|天主堂/,'⛪'],[/文物館/,'🏛️'],[/公車/,'🚌'],[/派出所/,'👮'],[/宮/,'🏮'],[/馬鈴薯/,'🥔'],[/露營/,'⛺'],[/吊橋/,'🌉'],[/登山口|步道/,'🥾'],[/空野原|水月|波波家|天空/,'🛏️'],[/同學巷/,'🏠'],[/機車/,'🛵'],[/理髮/,'💈'],[/解說/,'📜']];
  const hexM=(h,k)=>{const n=parseInt(h.slice(1),16);const f=v=>Math.max(0,Math.min(255,Math.round(v*k)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;};
  const hexL=h=>{const n=parseInt(h.slice(1),16);return ((n>>16&255)*.3+(n>>8&255)*.59+(n&255)*.11)/255;};
  const rr_=(g,x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  const sign=(x,y,z,ry,txt,w,bg='#6e4c33',fg='#f3e6c8',sub)=>{if(hexL(bg)>.78){bg=/7-ELEVEN/.test(txt)?'#2f7f4a':'#6e4c33';fg='#fff3dc';}
    const W_=640,H_=sub?190:136;const [c,g]=C2(W_,H_);const ic=(SIGN_IC.find(([re])=>re.test(txt))||[0,''])[1];
    g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=8;g.shadowOffsetY=3;g.fillStyle=hexM(bg,.55);rr_(g,6,6,W_-12,H_-14,26);g.fill();g.restore();
    const gr=g.createLinearGradient(0,16,0,H_-18);gr.addColorStop(0,hexM(bg,1.18));gr.addColorStop(1,hexM(bg,.92));g.fillStyle=gr;rr_(g,16,16,W_-32,H_-34,18);g.fill();
    g.save();rr_(g,16,16,W_-32,H_-34,18);g.clip();g.globalAlpha=.07;g.strokeStyle='#000';for(let k=0;k<14;k++){g.lineWidth=1+((k*7)%3);g.beginPath();const yy=22+k*(H_-40)/14;g.moveTo(16,yy);g.bezierCurveTo(200,yy+3,420,yy-3,W_-16,yy+1);g.stroke();}g.restore();
    g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=2;rr_(g,24,24,W_-48,H_-50,13);g.stroke();
    g.fillStyle='#e8c36a';[[30,30],[W_-30,30],[30,H_-36],[W_-30,H_-36]].forEach(([a,b])=>{g.beginPath();g.arc(a,b,4.5,0,7);g.fill();});
    const tx0=ic?118:W_/2;let fs=58;g.font=`900 ${fs}px ${FG}`;const avail=ic?W_-150:W_-90;const mw=g.measureText(txt).width;if(mw>avail){fs=Math.max(30,Math.floor(fs*avail/mw));g.font=`900 ${fs}px ${FG}`;}
    const ty=sub?70:(H_-10)/2;if(ic){g.font=`64px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText(ic,72,ty+2);g.font=`900 ${fs}px ${FG}`;}
    g.textAlign=ic?'left':'center';g.textBaseline='middle';g.fillStyle='rgba(0,0,0,.35)';g.fillText(txt,tx0+2,ty+3);g.fillStyle=fg;g.fillText(txt,tx0,ty);
    if(sub){g.font=`700 28px ${FG}`;g.globalAlpha=.9;g.fillText(sub,tx0+(ic?0:0),132);g.globalAlpha=1;}
    const geo=new T.PlaneGeometry(w,w*H_/W_);const m=mk(geo,new T.MeshBasicMaterial({map:TX(c),transparent:true,alphaTest:.25}),x,y,z,G,false);m.rotation.y=ry;
    // back of the board: plain wood (a double-sided text plane read mirror-written from behind)
    const bk=new T.Mesh(geo,SIGN_BACK);bk.rotation.y=PI;bk.position.z=-.005;m.add(bk);return m;};
  const SIGN_BACK=new T.MeshBasicMaterial({color:col('#5a3e2a')});
  const post=(x,z,h=1.8)=>{addCol(TB.x+x-.16,TB.x+x+.16,z-.16,z+.16,H(x,z)+h);return mk(bx(.14,h,.14),M.woodDark,x,H(x,z)+h/2,z,G);};
  // ---------- terrain
  const axis=(a,b,far,st)=>{const r=[];for(let v=-far;v<a;v+=14)r.push(v);for(let v=a;v<b;v+=st)r.push(v);for(let v=b;v<=far;v+=14)r.push(v);return r;};
  const xs=axis(-186,162,460,1.6),zs=axis(-142,202,460,1.6),nx=xs.length,nz=zs.length;
  const pos=new Float32Array(nx*nz*3),cl=new Float32Array(nx*nz*3),idx=[];
  const colAt=(lx,lz,h)=>{const n=fbm(lx*.12+3,lz*.12);const e=sqE(lx,lz);
    if(e>1.5){const cn=fbm((lx+h*.8)*.22+7,(lz-h*.6)*.22),cb=fbm(lx*.035+2,lz*.035);tc.set('#2c5544').lerp(t2.set('#4f8449'),smooth(.4,.55,cn)).lerp(tc2.set('#7cab58'),smooth(.58,.72,cn)*.85);tc.lerp(t2.set(cb>.55?'#94bb5e':'#284d3e'),Math.abs(cb-.5)*.8);tc.lerp(t2.set('#4a6c55'),.35);const tr=(1-smooth(40,75,h))*smooth(1.5,8,e);if(tr>0){const st=((h*.55)%1+1)%1;tc.lerp(t2.set('#6a9050').lerp(tc2.set('#93b066'),smooth(.15,.45,st)*smooth(.95,.6,st)),tr*(.05+.04*n));}if(h>120)tc.lerp(t2.set('#748b9b'),smooth(120,220,h));return;}
    if(Math.abs(lx-sqRX(lz))<15&&h<-12){tc.set('#8a8676').lerp(t2.set('#6f7470'),n);return;}
    tc.set('#94b85f').lerp(t2.set('#7fa651'),n);{const st=((h*.7)%1+1)%1;if(st<.3)tc.lerp(t2.set('#b6d074'),.3);}tc.lerp(t2.set('#b0a070'),clamp((fbm(lx*.05,lz*.05)-.6)*1.6,0,.22));
    };
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=xs[i],z=zs[j],h=sqBase(x,z),k=(j*nx+i)*3;pos[k]=x;pos[k+1]=h;pos[k+2]=z;colAt(x,z,h);tc.convertSRGBToLinear();cl[k]=tc.r;cl[k+1]=tc.g;cl[k+2]=tc.b;}
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}
  // the drawn terrain surface (1.6 m grid, linear): roads sample THIS so they never sink under the grass on steep bits
  const H0=new Float32Array(nx*nz);for(let k=0;k<nx*nz;k++)H0[k]=pos[k*3+1];
  const bsr=(A,v)=>{if(v<=A[0])return 0;if(v>=A[A.length-1])return A.length-2;let lo=0,hi=A.length-2;while(lo<hi){const m=(lo+hi+1)>>1;if(A[m]<=v)lo=m;else hi=m-1;}return lo;};
  const terrH=(x,z)=>{const i=bsr(xs,x),j=bsr(zs,z);const u=clamp((x-xs[i])/(xs[i+1]-xs[i]),0,1),v=clamp((z-zs[j])/(zs[j+1]-zs[j]),0,1);const a=H0[j*nx+i],b=H0[j*nx+i+1],c=H0[(j+1)*nx+i],d=H0[(j+1)*nx+i+1];
    return u+v<=1?a+u*(b-a)+v*(c-a):d+(1-u)*(c-d)+(1-v)*(b-d);};
  TB.terrH=terrH;
  {const RL=SQ_LANES.map(L=>[L.p,L.w/2]).concat([[SQ_ROAD,3.7]]).map(([p,hw])=>{const m=hw+2.8;return {p,hw,x0:Math.min(...p.map(q=>q[0]))-m,x1:Math.max(...p.map(q=>q[0]))+m,z0:Math.min(...p.map(q=>q[1]))-m,z1:Math.max(...p.map(q=>q[1]))+m};});
   for(let j=0;j<nz;j++){const z=zs[j];for(let i=0;i<nx;i++){const x=xs[i];let dm=1e9;for(const r of RL){if(x<r.x0||x>r.x1||z<r.z0||z>r.z1)continue;const d=sqNear(x,z,r.p)[0]-r.hw;if(d<dm)dm=d;}
     if(dm<2.6)pos[(j*nx+i)*3+1]-=.24*(1-smooth(.5,2.6,dm));}}}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(pos,3));tg.setAttribute('color',new T.BufferAttribute(cl,3));tg.setIndex(idx);tg.computeVertexNormals();
  const ter=new T.Mesh(tg,new T.MeshLambertMaterial({vertexColors:true}));surfSet(ter.material,'grass',1,null,.18,{chroma:.2});ter.material.userData.paint=1;ter.receiveShadow=true;G.add(ter);
  // river (司界蘭溪 / 大甲溪 upstream)
  const wm=new T.MeshLambertMaterial({color:col('#5f9fc2'),transparent:true,opacity:.88,emissive:col('#2a5a78'),emissiveIntensity:.25});
  // ---------- ribbons: lanes + 台7甲
  const ribbon=(pts,w,mat,dy=.07)=>{const P=[];for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1];const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/.5));for(let k=0;k<n;k++){const t=k/n;P.push([x0+(x1-x0)*t,z0+(z1-z0)*t]);}}P.push(pts[pts.length-1]);
    const v=[],ix=[];P.forEach((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(P.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;const nx_=-dz/l,nz_=dx/l;
      [-1,1].forEach(s=>{const x=p[0]+nx_*w/2*s,z=p[1]+nz_*w/2*s;v.push(x,terrH(x,z)+dy,z);});if(i>0){const k=i*2;ix.push(k-2,k-1,k,k-1,k+1,k);}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.receiveShadow=true;G.add(m);return m;};
  {const v=[],ix=[];for(let z=-150,i=0;z<=210;z+=4,i++){const x=sqRX(z);v.push(x-7,-29.4,z,x+7,-29.4,z);if(i){const k=i*2;ix.push(k-2,k,k-1,k-1,k,k+1);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,wm);m.material.side=T.DoubleSide;G.add(m);
    for(let i=0;i<70;i++){const z=rr(-130,200),x=sqRX(z)+rr(-6,6);const r=mk(ico(rr(.4,1.4),0),M.stone,x,-29.6,z,G);r.scale.y=rr(.4,.8);}}
  // lanes: textured concrete (joints, wear, darker edges) with kerbs + a drain on one side; 環山二巷 & 台7甲 in asphalt
  const rbPts=(pts,st)=>{const P=[];for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1];const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/st));for(let k=0;k<n;k++){const t=k/n;P.push([x0+(x1-x0)*t,z0+(z1-z0)*t]);}}P.push(pts[pts.length-1]);return P;};
  // rows across a polyline: tangent averaged over ±1.5 m (rounded corners); rows whose edge would step backwards on the inside of a sharp bend are dropped (no folded spikes)
  const rbRows=(pts,o0,o1)=>{const P=rbPts(pts,.5),R=[];let last=null;P.forEach((p,i)=>{const a=P[Math.max(0,i-3)],b=P[Math.min(P.length-1,i+3)];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,tx=dx/l,tz=dz/l;
      const e0=[p[0]-tz*o0,p[1]+tx*o0],e1=[p[0]-tz*o1,p[1]+tx*o1];
      if(last&&i<P.length-1&&((e0[0]-last[0][0])*tx+(e0[1]-last[0][1])*tz<.12||(e1[0]-last[1][0])*tx+(e1[1]-last[1][1])*tz<.12))return;
      R.push({p,tx,tz,a:i?Math.hypot(p[0]-(last?last[2][0]:p[0]),p[1]-(last?last[2][1]:p[1])):0});last=[e0,e1,p];});return R;};
  const ribbonUV=(pts,w,mat,dy,vs,off=0)=>{const nc=Math.max(2,Math.ceil(w/.6)+1),RW=rbRows(pts,off-w/2,off+w/2);
    const v=[],uv=[],ix=[];let acc=0;RW.forEach((r,i)=>{acc+=r.a;
      for(let c=0;c<nc;c++){const s=c/(nc-1),o=off+w*(s-.5),x=r.p[0]-r.tz*o,z=r.p[1]+r.tx*o;v.push(x,terrH(x,z)+dy,z);uv.push(s,acc/vs);}
      if(i>0){const k=i*nc,k0=k-nc;for(let c=0;c<nc-1;c++)ix.push(k0+c,k0+c+1,k+c,k0+c+1,k+c+1,k+c);}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.receiveShadow=true;G.add(m);return m;};
  // kerb face: a short vertical strip on the outer edge, so the tucked-in grass never leaves a gap under the road edge
  const skirt=(pts,off,mat,top)=>{const RW=rbRows(pts,off,off),v=[],ix=[];RW.forEach((r,i)=>{const x=r.p[0]-r.tz*off,z=r.p[1]+r.tx*off,h=terrH(x,z);v.push(x,h+top,z,x,h-.55,z);if(i>0){const k=i*2;ix.push(k-2,k-1,k,k-1,k+1,k);}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.receiveShadow=true;G.add(m);return m;};
  const RO=(f)=>({side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:f,polygonOffsetUnits:f});
  const concTex=(()=>{const [c,q]=C2(128,256);q.fillStyle='#b9b4a9';q.fillRect(0,0,128,256);for(let i=0;i<2600;i++){const v=rand();q.fillStyle=v<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.07)';q.fillRect(rand()*128,rand()*256,1+rand()*2,1+rand()*2);}
    for(let i=0;i<9;i++){q.fillStyle=`rgba(90,80,60,${.03+rand()*.05})`;q.beginPath();q.ellipse(rand()*128,rand()*256,6+rand()*18,4+rand()*14,rand()*3,0,7);q.fill();}
    const gr=q.createLinearGradient(0,0,128,0);gr.addColorStop(0,'rgba(60,55,45,.28)');gr.addColorStop(.1,'rgba(60,55,45,0)');gr.addColorStop(.9,'rgba(60,55,45,0)');gr.addColorStop(1,'rgba(60,55,45,.28)');q.fillStyle=gr;q.fillRect(0,0,128,256);
    q.fillStyle='rgba(70,65,58,.55)';q.fillRect(0,0,128,2);q.fillRect(0,128,128,1.5);q.strokeStyle='rgba(70,65,58,.35)';q.lineWidth=1;q.beginPath();q.moveTo(30,40);q.lineTo(38,62);q.lineTo(33,80);q.moveTo(96,170);q.lineTo(88,190);q.stroke();return TX(c,true);})();
  const asphTex=(edge)=>{const [c,q]=C2(128,128);q.fillStyle='#5f5e5a';q.fillRect(0,0,128,128);for(let i=0;i<2400;i++){const v=rand();q.fillStyle=v<.5?'rgba(0,0,0,.055)':'rgba(255,255,255,.045)';q.fillRect(rand()*128,rand()*128,1+rand()*1.2,1+rand()*1.2);}
    for(let i=0;i<6;i++){q.fillStyle=`rgba(${rand()<.5?'20,20,24':'120,118,110'},${.04+rand()*.04})`;q.beginPath();q.ellipse(14+rand()*100,rand()*128,5+rand()*14,8+rand()*22,rand()*3,0,7);q.fill();}
    if(edge){q.fillStyle='rgba(245,243,235,.9)';q.fillRect(5,0,4,128);q.fillRect(119,0,4,128);}return TX(c,true);};
  const laneM=lam('#ffffff',Object.assign({map:concTex},RO(-2)));const mainM=lam('#ffffff',Object.assign({map:asphTex(true)},RO(-3)));surfSet(laneM,'concrete',1,null,.8,{keep:1,chroma:.3});surfSet(mainM,'asphalt',1,null,.8,{keep:1,chroma:0});
  const kerbM=lam('#d4cfc4',RO(-5)),drainM=lam('#ffffff',Object.assign({map:(()=>{const [c,q]=C2(32,64);q.fillStyle='#6d6a63';q.fillRect(0,0,32,64);q.fillStyle='#4a4741';for(let y=4;y<64;y+=8)q.fillRect(4,y,24,3);q.fillStyle='rgba(255,255,255,.15)';q.fillRect(0,0,32,2);return TX(c,true);})()},RO(-4)));
  const inOther=(x,z,L0)=>SQ_LANES.some(L=>L!==L0&&sqNear(x,z,L.p)[0]<L.w/2+.15);
  const edgeRun=(L,off,w,mat,dy,vs,sk)=>{// split the strip where it crosses another lane (no kerbs across junctions)
    const P=[];for(let i=0;i<L.p.length-1;i++){const [x0,z0]=L.p[i],[x1,z1]=L.p[i+1];const l=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(l/.8));for(let k=0;k<n;k++){const t=k/n;P.push([x0+(x1-x0)*t,z0+(z1-z0)*t]);}}P.push(L.p[L.p.length-1]);
    let run=[];const flush=()=>{if(run.length>2){ribbonUV(run,w,mat,dy,vs,off);if(sk)skirt(run,off+Math.sign(off)*w/2,mat,dy);}run=[];};
    P.forEach((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(P.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;const x=p[0]-dz/l*off,z=p[1]+dx/l*off;if(inOther(x,z,L))flush();else run.push(p);});flush();};
  SQ_LANES.forEach((L,li)=>{const main=li===0;ribbonUV(L.p,L.w,main?mainM:laneM,.07+li*.004,main?6:L.w*2);
    edgeRun(L,-(L.w/2+.14),.28,kerbM,.13,2,1);edgeRun(L,L.w/2+.14,.28,kerbM,.13,2,1);if(L.w>=3.4)edgeRun(L,L.w/2+.5,.42,drainM,.06,.9);});
  ribbonUV(SQ_ROAD,7.4,lam('#ffffff',Object.assign({map:asphTex(true)},RO(-2))),.09,7.4);[-3.7,3.7].forEach(o=>skirt(SQ_ROAD,o,kerbM,.09));
  ribbon(SQ_ROAD,.28,lam('#e8c84a',{side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),.12);
  for(let i=0;i<SQ_ROAD.length-1;i++){const [x0,z0]=SQ_ROAD[i],[x1,z1]=SQ_ROAD[i+1];const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/2.2);for(let k=0;k<n;k++){const t=k/n,x=x0+(x1-x0)*t+4.1,z=z0+(z1-z0)*t;mk(bx(.1,.7,.1),M.metal,x,terrH(x,z)+.35,z,G,false);}}
  {const [c,g]=C2(128,128);g.fillStyle='#2f5f9f';g.beginPath();g.moveTo(64,6);g.lineTo(120,40);g.lineTo(100,120);g.lineTo(28,120);g.lineTo(8,40);g.closePath();g.fill();g.strokeStyle='#fff';g.lineWidth=6;g.stroke();g.fillStyle='#fff';g.font=`900 44px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('7甲',64,74);
    post(121,-12,2.6);const s=mk(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:TX(c),side:T.DoubleSide,transparent:true}),121,H(121,-12)+2.6,-12,G,false);s.rotation.y=-PI/2;}
  // ---------- forest + clouds
  {const N=1500,cone=new T.ConeGeometry(1.7,5.2,6);cone.translate(0,2.4,0);const leafy=CROWN.lo.clone();leafy.scale(2.3,1.9,2.3);leafy.translate(0,2.9,0);
    const A=new T.InstancedMesh(cone,new T.MeshLambertMaterial({color:0xffffff}),N),B=new T.InstancedMesh(leafy,new T.MeshLambertMaterial({color:0xffffff}),N);
    const mm=new T.Matrix4(),q=new T.Quaternion(),sv=new T.Vector3(),pv=new T.Vector3();let na=0,nb=0;
    for(let i=0;i<N*3&&(na<N||nb<N);i++){const x=rr(-360,360),z=rr(-360,360);const e=sqE(x,z);const rdd=Math.abs(x-sqRX(z));const bank=rdd>9&&rdd<20&&sqSD(x,z)[0]<0&&!(Math.abs(z+45)<5);if(e<3&&!bank)continue;const h=sqBase(x,z);if(h>170||h<-28)continue;
      const s=rr(.8,1.7);sv.set(s,s*rr(.85,1.3),s);pv.set(x,h-.4,z);q.setFromAxisAngle(T.Object3D.DefaultUp,rr(0,6.3));mm.compose(pv,q,sv);
      const conifer=h>55?rand()<.8:rand()<.35;if(conifer&&na<N){A.setMatrixAt(na,mm);A.setColorAt(na,tc.set(pick(['#365e50','#31584b','#3f6757'])).convertSRGBToLinear());na++;}
      else if(nb<N){B.setMatrixAt(nb,mm);B.setColorAt(nb,tc.set(pick(['#567f4b','#628a50','#4c744a','#6e9055'])).convertSRGBToLinear());nb++;}}
    A.count=na;B.count=nb;A.castShadow=B.castShadow=false;G.add(A);G.add(B);
    // v0.3 G04: pointed conifers no longer dominate — below the high ridges most of them become round broadleaf crowns (deterministic, no rand)
    {const m=new T.Matrix4(),keep=[],mv=[],hr=(x,z)=>{const v=Math.sin(x*12.9898+z*78.233)*43758.5453;return v-Math.floor(v);};
     for(let i=0;i<A.count;i++){A.getMatrixAt(i,m);const e=m.elements;(e[13]<95&&hr(e[12],e[14])<.85?mv:keep).push(m.clone());}
     const CP=['#365e50','#31584b','#3f6757'],BP=['#5f9150','#6e9c56','#527f4a','#7ea75c','#4b7748'];
     keep.forEach((M,i)=>{A.setMatrixAt(i,M);const e=M.elements;A.setColorAt(i,tc.set(CP[Math.floor(hr(e[14],e[12])*3)]).convertSRGBToLinear());});A.count=keep.length;A.instanceMatrix.needsUpdate=true;if(A.instanceColor)A.instanceColor.needsUpdate=true;
     const C=new T.InstancedMesh(leafy,B.material.clone(),Math.max(1,mv.length));C.setColorAt(0,tc.set('#5f9150'));mv.forEach((M,i)=>{C.setMatrixAt(i,M);const e=M.elements;C.setColorAt(i,tc.set(BP[Math.floor(hr(e[14]+1,e[12])*5)]).convertSRGBToLinear());});C.count=mv.length;C.castShadow=false;G.add(C);
     sqPaintTrees(C,'broad');sqPaintTrees(A,'conifer');
     const fc=CROWN.blob.clone();fc.scale(2.4,2,2.4);fc.translate(0,2.9,0);G.add(instSplit(C,fc,sqNearPlay));}
    sqPaintTrees(B,'broad');if(SQPT.length)foliBuild(G,SQPT.splice(0));
    const fb=CROWN.blob.clone();fb.scale(2.4,2,2.4);fb.translate(0,2.9,0);G.add(instSplit(B,fb,sqNearPlay));}
  {const [c,g]=C2(256,128);const gr=g.createRadialGradient(128,64,6,128,64,120);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.55,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128);
    const cm=new T.SpriteMaterial({map:TX(c),transparent:true,depthWrite:false,opacity:.8});
    for(let i=0;i<18;i++){const a=i/18*6.28+rr(-.15,.15),r=rr(190,300);const s=new T.Sprite(cm);s.position.set(Math.cos(a)*r,rr(30,64),Math.sin(a)*r);s.scale.set(rr(70,130),rr(20,34),1);G.add(s);}}
  // ---------- landmarks
  const LM=[];TB.LM=LM;const reserve=(x,z,r)=>LM.push([x,z,r]);reserve(98,-48,18);reserve(82,-46,4);
  const box=(w,h,d,mat,x,z,ry=0,y0)=>{const b=y0!=null?y0:Math.max(H(x-w/2,z-d/2),H(x+w/2,z-d/2),H(x-w/2,z+d/2),H(x+w/2,z+d/2));const g=new T.Group();g.position.set(x,b,z);g.rotation.y=ry;G.add(g);
    mk(bx(w,h,d),mat,0,h/2,0,g);mk(bx(w+.1,4,d+.1),M.concrete,0,-2,0,g);
    if(h>=2.4&&mat!==M.concrete){mk(bx(w+.08,.45,d+.08),lam('#b9b09f'),0,.22,0,g,false);mk(bx(w+.18,.16,d+.18),lam('#8a7f6e'),0,h-.08,0,g,false);
      if(d>=4.5&&h<6)[-1,1].forEach(s=>{const n=Math.max(1,Math.floor(d/3));for(let k=0;k<n;k++){const z=-d/2+d*(k+.5)/n;const wg=new T.Group();wg.position.set(s*(w/2+.01),0,z);wg.rotation.y=s*PI/2;g.add(wg);
        mk(bx(1.25,1.05,.06),lam('#5d6b6f'),0,Math.min(1.7,h-.9),0,wg,false);mk(bx(1.1,.9,.07),lam('#bcd9e6'),0,Math.min(1.7,h-.9),.02,wg,false);mk(bx(1.35,.08,.2),lam('#e8e2d6'),0,Math.min(1.7,h-.9)-.55,.08,wg,false);}});}
    const cs=Math.abs(Math.cos(ry))>.5;const hw=(cs?w:d)/2,hd=(cs?d:w)/2;addCol(TB.x+x-hw,TB.x+x+hw,TB.z+z-hd,TB.z+z+hd,b+h+2);return g;};
  const gable=(g,w,d,h,rh,mat)=>{const half=d/2+.4,sl=Math.hypot(half,rh);[-1,1].forEach(s=>{const r=mk(bx(w+.6,.14,sl),mat,0,h+rh/2,s*half/2,g);r.rotation.x=s*Math.atan2(rh,half);});
    const sh=new T.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rh-.05);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:w-.02,bevelEnabled:false}),g.children[0].material,-w/2+.01,h,0,g);e.rotation.y=PI/2;};
  const flagAt=(id,x,z)=>{post(x,z,2.2);const f=mk(new T.PlaneGeometry(.8,.5),new T.MeshLambertMaterial({color:col('#e0674b'),side:T.DoubleSide}),x+.42,H(x,z)+2,z,G,false);TB.flags[id]=f;};
  const brick=lam('#ffffff',{map:(()=>{const [c,g]=C2(128,128);g.fillStyle='#e6ddd0';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=16)for(let x=((y/16)%2)*16;x<128+16;x+=32){g.fillStyle=pick(['#a8483a','#b4523f','#9c4234']);g.fillRect(x-15,y+1,30,14);}return TX(c,true);})()});
  // 平等國小 — rebuilt from Tien's campus photos (2026-10): a 2-storey U-shaped classroom block in beige 二丁掛 tile under dark-brown eaves,
  // grey balcony parapets with the red / blue diamond tiles between white railings, a 3-storey centre tower (window band + front gable),
  // teal canopy over the wooden deck at its foot, mural stage + flagpole, green court with red keys inside the red PU track,
  // the blue fish slide on its oval pad, pull-up bars under junipers, concrete-post + red-brick fence, a little storeroom with a goal
  {const SEED0=seed;const SG=new T.Group();G.add(SG);const Y0=H(-61,30);
   const B=(w,h,d,m,x,y,z,ni)=>{const o=mk(bx(w,h,d),m,x,Y0+y,z,SG,!ni);if(ni)o.userData.noInk=1;return o;};
   const SCARDS=[],BARK=(()=>{const t=ART.trunk_bark;if(!t)return M.trunk;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1,2);return lam('#ffffff',{map:t});})(),ARTOK=!!ART.leaf_broad_mid;
   const L_=(c,s)=>{const m=lam(c,{});if(s)surfSet(m,s[0],s[1],null,s[2],{chroma:s[3]});return m;};
   const WALL=L_('#f0dbb2',['wall_tile',1,.4,.2]),COLR=L_('#f4e1be',['wall_tile',1,.35,.2]),PLINTH=L_('#b5aa96',['wall_pebble',1,.8,.3]),
     PARA=L_('#8f8c87',['wall_pebble',1,.9,0]),SLAB=L_('#cfc9bd',['terrazzo',1,.9,.4]),ROOF=L_('#6b5446',['roof_metal',2,.8,.3]),EAVE=lam('#6e5140'),
     PINK=L_('#e6c1b0',['wall_plaster',1,.8,.3]),REDR=L_('#b0473a',['roof_metal',2,.8,.5]),STONE=L_('#a19c92',['wall_pebble',1,.8,.2]),
     WOOD=L_('#a8774b',['wood_plank',1,1,.6]),FPOST=L_('#aaa69f',['concrete',1,.8,.2]),
     DOORW=lam('#eef0ec'),GLASS=lam('#bcd9e6'),FRAME=lam('#b7bec1'),GRILL=lam('#8d969a'),RAIL=lam('#f3f3ef'),WHITE=lam('#f4f2ec'),METAL=lam('#9aa7b0'),
     BLUE=lam('#2c62b8'),BLUE2=lam('#24509a'),TEALP=lam('#3f8f7a'),ORANGE=lam('#e07b2c'),HEDGE=lam('#557f3a'),DARK=lam('#2a2c2e');
   const DM=[lam('#c8463a'),lam('#3b62a8')];
   const diamond=(x,y,z,s,k,ry=0)=>{const g=new T.Group();g.position.set(x,Y0+y,z);g.rotation.y=ry;SG.add(g);
     const w=mk(new T.PlaneGeometry(s,s),lam('#f2efe8'),0,0,0,g,false);w.rotation.z=PI/4;const d=mk(new T.PlaneGeometry(s*.64,s*.64),DM[k%2],0,0,.012,g,false);d.rotation.z=PI/4;w.userData.noInk=d.userData.noInk=1;};
   // white tube railing between (xa,za) and (xb,zb2), standing on height y
   const rail=(xa,za,xb,zb2,y,h=1)=>{const l=Math.hypot(xb-xa,zb2-za);if(l<.2)return;const ry=Math.atan2(-(zb2-za),xb-xa),mx=(xa+xb)/2,mz=(za+zb2)/2;
     [h,.1].forEach(yy=>{const r=B(l,.06,.06,RAIL,mx,y+yy,mz,true);r.rotation.y=ry;});const n=Math.max(2,Math.round(l/.17));for(let k=1;k<n;k++){const t=k/n;B(.035,h,.035,RAIL,xa+(xb-xa)*t,y+h/2,za+(zb2-za)*t,true);}};
   const gableTri=(half,rh,mat,x,y,z,ry)=>{const sh=new T.Shape();sh.moveTo(-half,0);sh.lineTo(half,0);sh.lineTo(0,rh);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:.1,bevelEnabled:false}),mat,x,Y0+y,z,SG);e.rotation.y=ry;return e;};
   const SILL=lam('#d8cdbd'),WSHD=lam('#6f6458');
   const win=(x,y,z,w,h,ax,n=1)=>{const P=(a,b,c,dw,dh,dd,m,ni)=>ax==='z'?B(dw,dh,dd,m,x+a,y+b,z+c*n,ni):B(dd,dh,dw,m,x+c*n,y+b,z+a,ni);
     P(0,0,-.005,w-.12,h-.12,.03,GLASS,true);P(0,h/2-.13,.02,w-.14,.07,.01,WSHD,true);P(0,0,.02,.04,h-.12,.03,FRAME,true);
     P(0,h/2-.03,.06,w+.04,.1,.14,FRAME);P(0,-h/2-.02,.1,w+.22,.08,.22,SILL);[-1,1].forEach(k=>P(k*(w/2-.02),0,.06,.09,h,.14,FRAME,true));};
   const x0=-74,x1=-50,L=x1-x0,cx=(x0+x1)/2,zb=15.6,zc=20,zf=22,fh=3.4,NF=2,HT=NF*fh,nb=8,bw=L/nb;   // CLS_DOOR sits on bay 3's door (x0+3*bw+.95)
   // ---- main classroom block (faces the field) + its open corridors
   B(L-3,HT,zc-zb,WALL,cx-1.5,HT/2,(zb+zc)/2);B(3,HT,zc-zb,PINK,x1-1.5,HT/2,(zb+zc)/2);B(L+.08,.55,zc-zb+.08,PLINTH,cx,.27,(zb+zc)/2);   // the east bay is the pink, red-roofed end of the photos
   B(L,.16,zf-zc+.2,SLAB,cx,.08,(zc+zf)/2+.1,true);[fh,HT].forEach(y=>B(L+.3,.3,zf-zc+.45,SLAB,cx,y,(zc+zf)/2+.12));
   const GBAND=lam('#365e50');for(let i=0;i<=nb;i++){const x=x0+i*bw;B(.55,HT,.55,COLR,x,HT/2,zf+.1);B(.6,.55,.6,GBAND,x,.27,zf+.1);[fh-.5,HT-.5].forEach((y,k)=>diamond(x,y,zf+.385,.3,i+k));}
   // 2F balcony: a grey granite panel with a diamond tile in the middle of each bay, white railings either side
   for(let i=0;i<nb;i++){const a=x0+i*bw+.28,b=x0+(i+1)*bw-.28,m=(a+b)/2,pw=bw*.36;
     B(pw,1.05,.2,PARA,m,fh+.68,zf+.25);B(pw+.08,.08,.28,PARA,m,fh+1.22,zf+.25,true);diamond(m,fh+.68,zf+.36,.62,i);
     rail(a,zf+.25,m-pw/2,zf+.25,fh+.15);rail(m+pw/2,zf+.25,b,zf+.25,fh+.15);}
   // white classroom doors with a grille window + aluminium windows (front), windows at the back
   for(let k=0;k<NF;k++)for(let i=0;i<nb;i++){const bx0=x0+i*bw,y=k*fh,dx=bx0+.95;
     B(1.0,2.15,.08,DOORW,dx,y+1.1,zc+.04);B(.56,.52,.09,GRILL,dx,y+1.62,zc+.05,true);
     [bw*.6,bw*.86].forEach(o=>win(bx0+o,y+1.75,zc+.03,.8,1.2,'z'));[bw*.3,bw*.7].forEach(o=>win(bx0+o,y+1.75,zb-.03,1.2,1.2,'z',-1));}
   sign(CLS_DOOR[0],Y0+2.62,zc+.07,0,'五年級教室',2.2,'#3f7f6a','#fff');inter(P_(CLS_DOOR[0],zc+1.3),1.6,'走進五年級教室',()=>clsEnter());
   // low gable roof with the thick dark-brown fascia band of the photos
   {const D=zf-zb+1.3,half=D/2,rh=1,sl=Math.hypot(half,rh),zm=(zb+zf)/2+.1;[-1,1].forEach(s=>{const r=B(L+.9,.16,sl,ROOF,cx,HT+.3+rh/2,zm+s*half/2);r.rotation.x=s*Math.atan2(rh,half);});
     [-1,1].forEach(s=>B(L+.95,.42,.14,EAVE,cx,HT+.22,zm+s*(half+.02),true));gableTri(half,rh,PINK,x1+.4,HT+.3,zm,PI/2);
     {const rh2=1.25,h2=half-.15,sl2=Math.hypot(h2,rh2);[-1,1].forEach(s=>{const r=B(3.6,.16,sl2,REDR,x1-1.5,HT+.62+rh2/2,zm+s*h2/2);r.rotation.x=s*Math.atan2(rh2,h2);});[x1-3.3,x1+.2].forEach(x=>gableTri(h2-.1,rh2*(h2-.1)/h2,PINK,x,HT+.62,zm,PI/2));B(3.4,.3,D-.4,PINK,x1-1.5,HT+.5,zm,true);}}
   // ---- centre tower: 3 storeys, a band of windows on top, front-facing gable
   const tx0=x0+4*bw,tx1=x0+6*bw,tcx=(tx0+tx1)/2,tw=tx1-tx0,tH=HT+fh,tz0=zb-.4,tz1=zc+.02,tcz=(tz0+tz1)/2,td=tz1-tz0;
   B(tw,tH,td,WALL,tcx,tH/2,tcz);B(tw+.1,.2,.3,EAVE,tcx,HT+.85,tz1+.12,true);
   for(let k=0;k<5;k++)win(tx0+.5+(k+.5)*(tw-1)/5,HT+1.75,tz1+.03,(tw-1)/5-.1,1.3,'z');
   {const rh=1.6,half=tw/2+.45,sl=Math.hypot(half,rh);[-1,1].forEach(s=>{const r=B(sl,.18,td+1.1,ROOF,tcx+s*half/2,tH+rh/2,tcz+.15);r.rotation.z=-s*Math.atan2(rh,half);
       const f=B(sl,.34,.12,EAVE,tcx+s*half/2,tH+rh/2-.06,tcz+.15+(td+1.1)/2,true);f.rotation.z=-s*Math.atan2(rh,half);});
     gableTri(tw/2,rh*(tw/2)/half,WALL,tcx,tH,tz1-.08,0);gableTri(tw/2,rh*(tw/2)/half,WALL,tcx,tH,tz0-.02,0);}
   addCol(TB.x+tx0,TB.x+tx1,tz0,tz1,Y0+tH+2);
   // ---- west wing coming forward (its gable end faces the field), corridor on its east side
   const wx0=-80,wx1=-76.2,wxc=-74,wz1=28.4,wzm=(zb+wz1)/2,wd=wz1-zb;
   B(wx1-wx0,HT,wd,WALL,(wx0+wx1)/2,HT/2,wzm);B(wx1-wx0+.08,.55,wd+.08,PLINTH,(wx0+wx1)/2,.27,wzm);
   B(wxc-wx1,HT,zc-zb,WALL,(wx1+wxc)/2,HT/2,(zb+zc)/2);
   B(wxc-wx1+.2,.16,wz1-zc,SLAB,(wx1+wxc)/2+.1,.08,(zc+wz1)/2,true);[fh,HT].forEach(y=>B(wxc-wx1+.45,.3,wz1-zc+.3,SLAB,(wx1+wxc)/2+.12,y,(zc+wz1)/2+.15));
   [25.2,wz1].forEach((z,j)=>{B(.55,HT,.55,COLR,wxc+.1,HT/2,z);B(.6,.55,.6,GBAND,wxc+.1,.27,z);[fh-.5,HT-.5].forEach((y,k)=>diamond(wxc+.385,y,z,.3,j+k+1,PI/2));});
   [[zf+.3,25.2],[25.2,wz1]].forEach(([a,b],i)=>{const m=(a+b)/2,pw=1.1,xx=wxc+.25;B(.2,1.05,pw,PARA,xx,fh+.68,m);B(.28,.08,pw+.08,PARA,xx,fh+1.22,m,true);diamond(xx+.11,fh+.68,m,.62,i+1,PI/2);
     rail(xx,a+.28,xx,m-pw/2,fh+.15);rail(xx,m+pw/2,xx,b-.28,fh+.15);});
   rail(wx1+.1,wz1+.02,wxc-.18,wz1+.02,fh+.15);
   for(let k=0;k<NF;k++){const y=k*fh;[-78.9,-77.2].forEach(x=>win(x,y+1.75,wz1+.03,1.3,1.2,'z'));[17.6,21.2,24.6,27.4].forEach(z=>win(wx0-.03,y+1.75,z,1.2,1.2,'x',-1));
     [[21.3,1],[23.3,0],[25.6,1],[27.3,0]].forEach(([z,d])=>{if(d){B(.08,2.15,1,DOORW,wx1+.04,y+1.1,z);B(.09,.52,.56,GRILL,wx1+.05,y+1.62,z,true);}else win(wx1+.03,y+1.75,z,1.3,1.2,'x');});}
   {const half=(wxc-wx0)/2+.45,rh=1,sl=Math.hypot(half,rh),xm=(wx0+wxc)/2,zl=wd+1.3,zm2=(zb+wz1)/2+.05;
     [-1,1].forEach(s=>{const r=B(sl,.16,zl,ROOF,xm+s*half/2,HT+.3+rh/2,zm2);r.rotation.z=-s*Math.atan2(rh,half);B(.14,.42,zl+.05,EAVE,xm+s*(half+.02),HT+.22,zm2,true);
       const f=B(sl,.34,.12,EAVE,xm+s*half/2,HT+.3+rh/2-.06,zm2+zl/2,true);f.rotation.z=-s*Math.atan2(rh,half);});
     gableTri((wxc-wx0)/2,rh*((wxc-wx0)/2)/half,WALL,xm,HT+.3,wz1-.06,0);}
   addCol(TB.x+wx1,TB.x+x1,zb,zc,Y0+HT+3);addCol(TB.x+wx0,TB.x+wx1,zb,wz1,Y0+HT+3);
   for(let i=0;i<=nb;i++)addCol(TB.x+x0+i*bw-.28,TB.x+x0+i*bw+.28,zf-.18,zf+.38,Y0+HT);[25.2,wz1].forEach(z=>addCol(TB.x+wxc-.18,TB.x+wxc+.38,z-.28,z+.28,Y0+HT));
   // little bushes at the foot of every other column, set just outside it (doors stay clear)
   for(let i=0;i<=nb;i+=2){const x=x0+i*bw;if(ART.bush_hedge){SCARDS.push(['bush_hedge',x-.62,Y0+.42,zf+.55,1.05,.7]);SCARDS.push(['bush_hedge',x+.62,Y0+.42,zf+.55,1.05,.7]);}}
   // hedges in front of the east classrooms
   const hedgeCards=(x0,x1,z0,z1,h)=>{const l=Math.hypot(x1-x0,z1-z0),n=Math.max(2,Math.round(l/.9));for(let k=0;k<n;k++){const t=(k+.5)/n;SCARDS.push(['bush_hedge',x0+(x1-x0)*t,Y0+h*.62,z0+(z1-z0)*t,1.7,.95]);}};
   [[-54.3,23.05,2.2]].forEach(([x,z,w])=>{B(w,.75,.7,ART.bush_hedge?SHADOW_ONLY:HEDGE,x,.37,z);if(ART.bush_hedge)hedgeCards(x-w/2+.4,x+w/2-.4,z,z,.75);addCol(TB.x+x-w/2,TB.x+x+w/2,z-.35,z+.35,Y0+.8);});
   // ---- the wooden deck at the tower's foot, under a teal canopy held up by orange struts
   {const dx0=tx0,dx1=tx1,dz0=zf+.4,dz1=26.3,dxm=(dx0+dx1)/2,dzm=(dz0+dz1)/2,dw=dx1-dx0;B(dw,.3,dz1-dz0,WOOD,dxm,.15,dzm);
     TB.pads=TB.pads||[];TB.pads.push({x0:dx0,x1:dx1,z0:dz0,z1:dz1,y:Y0+.32});
     // teal wave-pattern panels along the front edge, open in the middle
     const [pc,pq]=C2(256,64);pq.fillStyle='#3aa597';pq.fillRect(0,0,256,64);pq.strokeStyle='rgba(255,255,255,.75)';pq.lineWidth=3;for(let r=0;r<3;r++){pq.beginPath();for(let x=0;x<=256;x+=4)pq.lineTo(x,14+r*16+Math.sin(x/16+r)*4);pq.stroke();}
     const PNL=lam('#ffffff',{map:TX(pc)});[[dx0+.1,dxm-1],[dxm+1,dx1-.1]].forEach(([a,b])=>{const m=(a+b)/2;B(b-a,.7,.08,PNL,m,.65,dz1-.08);B(b-a+.04,.07,.12,TEALP,m,1.02,dz1-.08,true);addCol(TB.x+a,TB.x+b,dz1-.2,dz1+.05,Y0+1.05);});
     const PG=lam('#365e50'),TIM=L_('#be8952',['wood_plank',1,.8,.5]);
     const cz0=zf+.45,cz1=dz1+.5,cyF=2.85;
     [dx0+.15,dx0+1.05,dx1-1.05,dx1-.15].forEach(x=>{B(.13,cyF,.13,PG,x,cyF/2,cz1-.1);addCol(TB.x+x-.12,TB.x+x+.12,cz1-.22,cz1+.02,Y0+cyF);});
     B(dw+.3,.16,.13,PG,dxm,cyF,cz1-.1);B(dw+.3,.16,.13,PG,dxm,cyF,cz0+.05);
     [dx0+.15,dxm,dx1-.15].forEach(x=>B(.12,.15,cz1-cz0,PG,x,cyF,(cz0+cz1)/2));
     // open timber beams sloping from the tower wall down over the green frame and past it (no roof sheet)
     for(let k=0;k<9;k++){const x=dx0+.3+k*(dw-.6)/8,ya=cyF+.2,yb=fh+1.25,za=cz1+.45,zb_=zf+.3,l=Math.hypot(za-zb_,yb-ya);const st=B(.1,.17,l,TIM,x,(ya+yb)/2,(za+zb_)/2);st.rotation.x=Math.atan2(yb-ya,za-zb_);}
     [.3,.62].forEach(t=>{const z=cz1+.45-(cz1+.45-zf-.3)*t,y=cyF+.2+(fh+1.25-cyF-.2)*t+.17;B(dw+.4,.1,.1,TIM,dxm,y,z,true);});
     
     inter(P_(dxm,dzm),2.2,'坐在木平台上',()=>say(null,['木平台被太陽曬得暖暖的。','下課的時候，大家常在這裡畫畫、寫學習單。'],{noWave:1}));}
   // ---- mural stage + the flagpole in front of the classrooms
   {const sx0=-72.8,sx1=-67.4,sz0=23,sz1=25.2,sxm=(sx0+sx1)/2;B(sx1-sx0,.45,sz1-sz0,STONE,sxm,.22,(sz0+sz1)/2);B(sx1-sx0+.06,.06,sz1-sz0+.06,lam('#cfc9bd'),sxm,.47,(sz0+sz1)/2,true);
     TB.pads.push({x0:sx0,x1:sx1,z0:sz0,z1:sz1,y:Y0+.5});
     const [mc,mq]=C2(512,224);const sk=mq.createLinearGradient(0,0,0,224);sk.addColorStop(0,'#bfe1f4');sk.addColorStop(1,'#eaf5fa');mq.fillStyle=sk;mq.fillRect(0,0,512,224);
     mq.fillStyle='#f6e7a8';mq.beginPath();mq.arc(400,52,24,0,7);mq.fill();
     [['#7fa7cf',80,0],['#5f8fbf',120,40],['#4f7fa8',150,-30]].forEach(([c,h,o])=>{mq.fillStyle=c;mq.beginPath();mq.moveTo(0,224);for(let x=0;x<=512;x+=8)mq.lineTo(x,224-h*.55-Math.abs(Math.sin((x+o)/70))*h*.5);mq.lineTo(512,224);mq.fill();});
     mq.strokeStyle='#ffffff';mq.lineWidth=5;for(let r=0;r<3;r++){mq.beginPath();for(let x=0;x<=512;x+=6)mq.lineTo(x,180+r*14+Math.sin(x/22+r*2)*5);mq.stroke();}
     mq.fillStyle='#3e7f4e';for(let k=0;k<9;k++){const x=30+k*55,h=26+(k%3)*10;mq.beginPath();mq.moveTo(x,170);mq.lineTo(x-12,170);mq.lineTo(x-6,170-h);mq.fill();}
     mq.strokeStyle='#2f4f86';mq.lineWidth=3;for(let k=0;k<4;k++){const x=180+k*28;mq.beginPath();mq.moveTo(x,40+(k%2)*8);mq.quadraticCurveTo(x+7,34+(k%2)*8,x+14,40+(k%2)*8);mq.quadraticCurveTo(x+21,34+(k%2)*8,x+28,40+(k%2)*8);mq.stroke();}
     [[470,150,'#c8463a'],[470,100,'#3b62a8']].forEach(([x,y,c])=>{mq.save();mq.translate(x,y);mq.rotate(PI/4);mq.fillStyle='#fff';mq.fillRect(-22,-22,44,44);mq.fillStyle=c;mq.fillRect(-14,-14,28,28);mq.restore();});
     mq.strokeStyle='#8a7f6e';mq.lineWidth=8;mq.strokeRect(4,4,504,216);
     const mw=4.8,mh=2.1;B(mw+.2,mh+.2,.22,WALL,sxm,.47+mh/2+.1,sz0+.25);const mp=mk(new T.PlaneGeometry(mw,mh),new T.MeshLambertMaterial({map:TX(mc)}),sxm,Y0+.47+mh/2+.1,sz0+.37,SG,false);mp.userData.noInk=1;
     addCol(TB.x+sxm-mw/2-.1,TB.x+sxm+mw/2+.1,sz0+.1,sz0+.4,Y0+.47+mh+.2);
     inter(P_(sxm,sz1+1),1.8,'看司令台的壁畫',()=>say(null,['司令台後面的牆上畫著大山、溪水和藍天。','朝會、升旗、表演，大家都在這裡集合。'],{noWave:1}));
     const fx=-66,fz=24.4;B(1,.32,1,STONE,fx,.16,fz);addCol(TB.x+fx-.5,TB.x+fx+.5,fz-.5,fz+.5,Y0+.4);mk(cy(.05,.07,8.4,8),METAL,fx,Y0+4.5,fz,SG);mk(sph(.12,8,6),lam('#e8c33a'),fx,Y0+8.75,fz,SG,false);
     const [fc,fq]=C2(192,128);fq.fillStyle='#d8312e';fq.fillRect(0,0,192,128);fq.fillStyle='#1f3a8f';fq.fillRect(0,0,96,64);fq.fillStyle='#ffffff';fq.save();fq.translate(48,32);for(let k=0;k<12;k++){fq.rotate(PI/6);fq.beginPath();fq.moveTo(0,-26);fq.lineTo(5,-11);fq.lineTo(-5,-11);fq.fill();}fq.restore();
     fq.beginPath();fq.arc(48,32,12,0,7);fq.fill();fq.fillStyle='#1f3a8f';fq.beginPath();fq.arc(48,32,10,0,7);fq.fill();fq.fillStyle='#ffffff';fq.beginPath();fq.arc(48,32,8.5,0,7);fq.fill();
     const pv=new T.Group();pv.position.set(fx,Y0+8.1,fz);G.add(pv);const fl=mk(new T.PlaneGeometry(1.35,.9),new T.MeshLambertMaterial({map:TX(fc),side:T.DoubleSide}),.7,0,0,pv,false);TB.flag=pv;}
   // ---- red PU track (stadium shape) round a grass infield; inner kerb of grey drain grates
   const tcX=-68,tcZ=36.6,TL=24,TW=12,HS=TL/2-TW/2;
   {const pm=36.6,[c,q]=C2(Math.round(TL*pm),Math.round(TW*pm));q.translate(TL*pm/2,TW*pm/2);q.scale(pm,pm);
     const stad=r=>{q.beginPath();q.moveTo(-HS,-r);q.lineTo(HS,-r);q.arc(HS,0,r,-PI/2,PI/2);q.lineTo(-HS,r);q.arc(-HS,0,r,PI/2,PI*1.5);q.closePath();};
     stad(TW/2-.05);q.fillStyle='#c26450';q.fill();q.save();q.globalCompositeOperation='destination-out';stad(3.85);q.fill();q.restore();
     q.lineWidth=.26;q.strokeStyle='#7d7f80';stad(3.98);q.stroke();q.setLineDash([.08,.1]);q.lineWidth=.16;q.strokeStyle='#4f5254';stad(3.98);q.stroke();q.setLineDash([]);
     q.strokeStyle='rgba(255,255,255,.92)';q.lineWidth=.05;[4.12,4.55,4.98,5.41,5.88].forEach(r=>{stad(r);q.stroke();});
     q.lineWidth=.06;q.beginPath();q.moveTo(0,4.12);q.lineTo(0,5.88);q.stroke();q.setLineDash([.35,.3]);q.beginPath();q.moveTo(-HS+.6,4.34);q.lineTo(-HS+4,4.34);q.stroke();q.setLineDash([]);
     const fm=mk(new T.PlaneGeometry(TL,TW),new T.MeshLambertMaterial({map:TX(c),alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-2}),tcX,Y0+.06,tcZ,G,false);fm.rotation.x=-PI/2;fm.material.userData.paint=1;}
   // ---- green court with red keys, the school logo in the centre circle, along the infield
   const kcx=tcX,kz=tcZ,kl=11,kw=5.2;
   {const pm=64,mx=.6,[c,q]=C2(Math.round((kl+2*mx)*pm),Math.round((kw+2*mx)*pm));q.fillStyle='#4a8f72';q.fillRect(0,0,c.width,c.height);q.translate(c.width/2,c.height/2);q.scale(pm,pm);
     q.fillStyle='#55997a';q.fillRect(-kl/2,-kw/2,kl,kw);q.fillStyle='#c4604c';[-1,1].forEach(s=>q.fillRect(s>0?kl/2-2.3:-kl/2,-1.05,2.3,2.1));
     q.strokeStyle='#ffffff';q.lineWidth=.06;q.strokeRect(-kl/2,-kw/2,kl,kw);q.beginPath();q.moveTo(0,-kw/2);q.lineTo(0,kw/2);q.stroke();q.beginPath();q.arc(0,0,.78,0,7);q.stroke();
     [-1,1].forEach(s=>{const bx_=s*(kl/2-.6);q.strokeRect(s>0?kl/2-2.3:-kl/2,-1.05,2.3,2.1);q.beginPath();q.arc(s*(kl/2-2.3),0,.7,0,7);q.stroke();
       const a3=Math.asin(2.35/2.45);q.beginPath();q.moveTo(s*kl/2,-2.35);if(s>0)q.arc(bx_,0,2.45,PI+a3,PI-a3,true);else q.arc(bx_,0,2.45,-a3,a3,false);q.lineTo(s*kl/2,2.35);q.stroke();});
     q.fillStyle='#ffffff';q.beginPath();q.ellipse(0,0,.7,.42,0,0,7);q.fill();q.fillStyle='#2f5fae';q.beginPath();q.ellipse(0,0,.6,.34,0,0,7);q.fill();q.strokeStyle='#ffffff';q.lineWidth=.04;q.beginPath();q.moveTo(-.4,.08);q.quadraticCurveTo(0,-.24,.4,.08);q.stroke();
     const ct=mk(new T.PlaneGeometry(kl+2*mx,kw+2*mx),new T.MeshLambertMaterial({map:TX(c),polygonOffset:true,polygonOffsetFactor:-3}),kcx,Y0+.07,kz,G,false);ct.rotation.x=-PI/2;ct.material.userData.paint=1;
     // hoops: padded blue pole outside each baseline, blue arm, white board with a red square; shoot / dunk at either end
     const [rc,rq]=C2(64,48);rq.strokeStyle='#d0392f';rq.lineWidth=5;rq.strokeRect(4,4,56,40);const RSQ=new T.MeshBasicMaterial({map:TX(rc),transparent:true,alphaTest:.3});
     [-1,1].forEach(s=>{const P0=kcx+s*(kl/2+.3),bd=kcx+s*(kl/2-.6),rx=kcx+s*(kl/2-.9),fx=rx-s*3;
       B(.32,1.8,.32,BLUE2,P0,.9,kz);B(.2,3.3,.2,BLUE,P0,1.65,kz);const arm=B(.9,.16,.16,BLUE,(P0+bd)/2,3.15,kz);const br=B(.75,.12,.12,BLUE,(P0+bd)/2+s*.05,2.75,kz,true);br.rotation.z=s*.55;
       B(.06,.86,1.25,BLUE,bd+s*.03,3.1,kz,true);B(.05,.8,1.2,WHITE,bd,3.1,kz);const sq=mk(new T.PlaneGeometry(.5,.38),RSQ,bd-s*.03,Y0+2.98,kz,G,false);sq.rotation.y=-s*PI/2;
       const rim=mk(new T.TorusGeometry(.24,.025,6,14),lam('#e0674b'),rx,Y0+2.75,kz,SG,false);rim.rotation.x=PI/2;
       {const [nc,nx]=C2(64,64);nx.strokeStyle='rgba(255,255,255,.95)';nx.lineWidth=3;for(let k=-64;k<128;k+=16){nx.beginPath();nx.moveTo(k,0);nx.lineTo(k+64,64);nx.stroke();nx.beginPath();nx.moveTo(k+64,0);nx.lineTo(k,64);nx.stroke();}
        const nt=TX(nc,true);nt.repeat.set(3,1);const net=new T.Mesh(new T.CylinderGeometry(.24,.15,.42,14,1,true),new T.MeshBasicMaterial({map:nt,transparent:true,alphaTest:.3,side:T.DoubleSide}));net.position.set(TB.x+rx,Y0+2.75-.21,kz);scene.add(net);TB.nets=TB.nets||[];TB.nets.push({m:net,z:kz,sw:0});}
       addCol(TB.x+P0-.22,TB.x+P0+.22,kz-.22,kz+.22,Y0+3.3);
       inter(new T.Vector3(TB.x+fx,Y0,kz),1.7,'投籃（籃球場）',()=>tbHoop(kz,Y0,rx,fx,s,'x'));});}
   // ---- west lawn: pull-up bars under the junipers, the blue fish slide on its oval pad
   const JUN=[lam('#3f5f36'),lam('#4b6e3c'),lam('#36532f')],LEAF2=[lam('#7fa443'),lam('#93b64e'),lam('#6f963c')];
   const juniper=(x,z,s=1)=>{const y=H(x,z)-Y0;mk(cy(.06*s,.19*s,2.6*s,8),BARK,x,Y0+y+1.3*s,z,SG);
     if(ARTOK){for(let L=0;L<4;L++){const t=L/3,hh=(2.1+t*3.0)*s,r=(.75-t*.45)*s,w=(2.9-t*1.25)*s/.85;for(let k=0;k<3;k++){const a=L*1.1+k*2.094;SCARDS.push(['leaf_juniper',x+Math.cos(a)*r,Y0+y+hh,z+Math.sin(a)*r,w,w*1.05]);}}SCARDS.push(['leaf_juniper',x,Y0+y+5.6*s,z,1.6*s/.85,1.7*s/.85]);}
     for(let k=0;k<14;k++){const a=k*2.4,t=k/13,r=(1.05-t*.65)*s*(.55+.45*((k*7)%3)/2),hh=(1.9+t*3.4)*s;const cc=mk(ico((.82-t*.32)*s,1),ARTOK?SHADOW_ONLY:JUN[k%3],x+Math.cos(a)*r,Y0+y+hh,z+Math.sin(a)*r,SG);cc.scale.set(1.15,.62+.12*(k%2),1.15);cc.rotation.y=a;}
     addCol(TB.x+x-.3*s,TB.x+x+.3*s,z-.3*s,z+.3*s,Y0+y+4*s);};
   const broad=(x,z,s=1)=>{const y=H(x,z)-Y0;mk(cy(.07*s,.21*s,2.9*s,8),BARK,x,Y0+y+1.45*s,z,SG);[[0,3.2,0,1.7],[.9,2.7,.5,1.2],[-.8,2.9,-.4,1.3],[.2,3.9,-.3,1.1]].forEach(([a,b,c2,r],k)=>mk(ico(r*s,1),ARTOK?SHADOW_ONLY:LEAF2[k%3],x+a*s,Y0+y+b*s,z+c2*s,SG));
     if(ARTOK){const cy=Y0+y+3.3*s;[['leaf_broad_dark',0,-.9,0,2.9],['leaf_broad_dark',-.95,-.45,-.6,2.6],['leaf_broad_dark',.9,-.55,.55,2.6],['leaf_broad_mid',0,0,0,3.6],['leaf_broad_mid',-.75,.35,.7,2.4],['leaf_broad_mid',.8,.2,-.75,2.4],['leaf_broad_mid',-.6,.75,-.4,2.1],['leaf_broad_light',.55,.85,-.35,2.2],['leaf_broad_light',.25,1.2,.3,1.8]]
       .forEach(([k,a,b,c2,w])=>SCARDS.push([k,x+a*s,cy+b*s,z+c2*s,w*s/.85,w*s/.85*.9]));}
     addCol(TB.x+x-.3*s,TB.x+x+.3*s,z-.3*s,z+.3*s,Y0+y+4*s);};
   {const bxx=-83.6,zs=[29.6,30.8,32,33.2],hs=[1.5,1.85,2.2],PM=lam('#d6dadb');zs.forEach((z,k)=>{const h=Math.max(hs[Math.max(0,k-1)],hs[Math.min(2,k)]);mk(cy(.05,.05,h+.05,8),PM,bxx,Y0+(h+.05)/2,z,SG);addCol(TB.x+bxx-.1,TB.x+bxx+.1,z-.1,z+.1,Y0+h);});
     hs.forEach((h,k)=>{const b=mk(cy(.025,.025,1.2,6),PM,bxx,Y0+h,(zs[k]+zs[k+1])/2,SG,false);b.rotation.x=PI/2;b.userData.noInk=1;});
     inter(P_(bxx+1.2,31.4),1.6,'拉單槓',()=>say(null,['抓住單槓，用力拉——','一下、兩下、三下！手臂好痠，可是好有成就感！'],{noWave:1}));}
   {const fxc=-50.6,fzc=32.6,prx=2.3,prz=4.3;const [gc,gq]=C2(128,128);gq.fillStyle='#b4b5b1';gq.fillRect(0,0,128,128);for(let i=0;i<1400;i++){gq.fillStyle=pick(['#9a9b97','#c9cac5','#8a8b88','#d6d6d0']);gq.fillRect(rr(0,128),rr(0,128),2,2);}
     const gt=TX(gc,true);gt.repeat.set(4,7);const pad=mk(cy(1,1,.28,48),lam('#ffffff',{map:gt}),fxc,Y0+.14,fzc,SG);pad.scale.set(prx,1,prz);
     const curb=mk(cy(1,1,.2,48),lam('#d4d0c7'),fxc,Y0+.1,fzc,SG);curb.scale.set(prx+.18,1,prz+.18);
     TB.pads.push({e:2,cx:fxc,cz:fzc,rx:prx+.1,rz:prz+.1,y:Y0+.29});
     // fish: a squashed sphere, tail tapered, painted side-on (planar UVs so both flanks show the same face)
     const [c,q]=C2(1024,512);const gr=q.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#5a8be2');gr.addColorStop(.45,'#3c66c9');gr.addColorStop(1,'#2a4c9c');q.fillStyle=gr;q.fillRect(0,0,1024,512);
     q.strokeStyle='rgba(225,236,255,.55)';q.lineWidth=3;for(let row=0;row<16;row++)for(let k=0;k<22;k++){const x=40+k*30+(row%2)*15,y=50+row*20;if(x>650)continue;q.beginPath();q.arc(x,y,15,0,PI);q.stroke();}
     q.strokeStyle='rgba(255,255,255,.8)';q.lineWidth=6;[[30,170],[60,230],[40,290]].forEach(([x,y])=>{q.beginPath();q.arc(x+40,y,30,PI*.2,PI*1.6);q.stroke();});
     const bead=(x,y,k)=>{q.fillStyle=['#e0453a','#ffffff','#f2a33a','#2f5fae'][k%4];q.fillRect(x-7,y-7,14,14);};
     for(let k=0;k<26;k++){const t=k/25,x=690-Math.sin(t*PI)*40,y=372-t*350;bead(x,y,k);bead(x+16,y,k+2);}
     for(let k=0;k<34;k++){bead(120+k*17,30+Math.abs(k-17)*.6,k);}
     q.fillStyle='#ffffff';q.beginPath();q.arc(822,190,66,0,7);q.fill();q.lineWidth=9;q.strokeStyle='#1f2f63';q.stroke();q.fillStyle='#141c33';q.beginPath();q.arc(836,192,36,0,7);q.fill();q.fillStyle='#ffffff';q.beginPath();q.arc(848,180,10,0,7);q.fill();
     q.strokeStyle='#ffffff';q.lineWidth=11;q.lineCap='round';q.beginPath();q.moveTo(1012,262);q.quadraticCurveTo(900,312,772,280);q.stroke();
     q.fillStyle='rgba(255,255,255,.85)';q.beginPath();q.moveTo(560,262);q.quadraticCurveTo(620,205,662,252);q.quadraticCurveTo(620,292,560,262);q.fill();q.strokeStyle='#3c66c9';q.lineWidth=3;for(let k=0;k<4;k++){q.beginPath();q.moveTo(572+k*20,260);q.lineTo(612+k*12,228+k*8);q.stroke();}
     q.fillStyle='#1b2242';q.beginPath();q.moveTo(380,380);q.lineTo(380,330);q.arc(410,330,30,PI,0,false);q.lineTo(440,380);q.closePath();q.fill();
     const fg=new T.SphereGeometry(1,44,26),pa=fg.attributes.position,uv=fg.attributes.uv;for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i);uv.setXY(i,(x+1)/2,(y+1)/2);const t=x<0?1+x*.42:1-Math.max(0,x-.55)*.3;pa.setXYZ(i,x*3,y*1.25*t,z*1.05*t);}
     fg.computeVertexNormals();const g=new T.Group();g.position.set(fxc,Y0+.28,fzc);g.rotation.y=PI/2;SG.add(g);mk(fg,new T.MeshLambertMaterial({map:TX(c)}),0,.55,0,g);
     addCol(TB.x+fxc-1.1,TB.x+fxc+1.1,fzc-2.9,fzc+2.9,Y0+2.2);
     inter(P_(fxc+2.6,fzc),2,'溜魚滑梯',()=>say(null,['咻——從大魚的背上溜下來！','這隻藍色的大魚，是平等國小的招牌溜滑梯。'],{noWave:1}));
     B(.8,.9,7.4,ART.bush_hedge?SHADOW_ONLY:HEDGE,-47.2,.45,fzc);if(ART.bush_hedge)hedgeCards(-47.2,-47.2,fzc-3.3,fzc+3.3,.9);addCol(TB.x-47.6,TB.x-46.8,fzc-3.7,fzc+3.7,Y0+1);}
   [[-82.2,16.9,.95],[-86.5,26.6,.95],[-85.7,30.6,1.1],[-80.9,34.2,.85],[-81.2,44.1,.8],[-86.9,44.2,.85],[-84.6,39.4,1],[-86.6,35.6,.9],[-50.8,44,.8],[-54.4,35,.8]].forEach(([x,z,s])=>juniper(x,z,s));
   broad(-53.6,26.4,.9);broad(-77.6,43.3,.85);broad(-70.5,46.6,1.05);broad(-61.5,46.8,.95);   // big shade trees just outside the south fence, leaning over it (art pack 05)
   const LPM=lam('#77837c');[[-80.8,37.2],[-54.6,30.2]].forEach(([x,z])=>{mk(cy(.06,.08,5,8),LPM,x,Y0+2.5,z,SG);mk(bx(.5,.16,.24),LPM,x+.2,Y0+5,z,SG,false);addCol(TB.x+x-.12,TB.x+x+.12,z-.12,z+.12,Y0+5);});
   // ---- storeroom by the east curve of the track (two white doors) + a small goal
   {const rx0=-49.3,rx1=-45.9,rz0=37.6,rz1=41.8,rxm=(rx0+rx1)/2,rzm=(rz0+rz1)/2;B(rx1-rx0,2.8,rz1-rz0,WALL,rxm,1.4,rzm);B(rx1-rx0+.06,.4,rz1-rz0+.06,PLINTH,rxm,.2,rzm);
     const rf=B(rx1-rx0+.9,.14,rz1-rz0+.8,ROOF,rxm,3.0,rzm);rf.rotation.z=-.1;B(.14,.36,rz1-rz0+.85,EAVE,rx0-.45,2.85,rzm,true);
     [rzm-1.15,rzm+1.15].forEach(z=>{B(.08,2.1,1.0,DOORW,rx0-.04,1.08,z);B(.09,.5,.55,GLASS,rx0-.05,1.6,z,true);});
     addCol(TB.x+rx0,TB.x+rx1,rz0,rz1,Y0+3.2);
     const gx=-47.6,gz0=42.3,gz1=44.4;[gz0,gz1].forEach(z=>{B(.08,1.6,.08,WHITE,gx,.8,z,true);const bk=B(.06,1.75,.06,WHITE,gx+.75,.8,z,true);bk.rotation.z=-.45;addCol(TB.x+gx-.1,TB.x+gx+.9,z-.1,z+.1,Y0+1.6);});B(.08,.08,gz1-gz0,WHITE,gx,1.6,(gz0+gz1)/2,true);
     const [nc,nq]=C2(64,64);nq.strokeStyle='rgba(245,245,245,.9)';nq.lineWidth=2;for(let k=0;k<=64;k+=8){nq.beginPath();nq.moveTo(k,0);nq.lineTo(k,64);nq.stroke();nq.beginPath();nq.moveTo(0,k);nq.lineTo(64,k);nq.stroke();}
     const nt=TX(nc,true);nt.repeat.set(4,3);const NM=new T.MeshBasicMaterial({map:nt,transparent:true,alphaTest:.3,side:T.DoubleSide});const bn=mk(new T.PlaneGeometry(gz1-gz0,1.75),NM,gx+.38,Y0+.8,(gz0+gz1)/2,G,false);bn.rotation.y=PI/2;bn.rotation.x=.45;}
   // ---- fence: grey concrete posts with red-brick panels between (east side keeps the gate)
   {const [bc,bq]=C2(256,96);bq.fillStyle='#d6cdc0';bq.fillRect(0,0,256,96);for(let r=0;r<12;r++){for(let x=(r%2)*-12;x<256;x+=25){bq.fillStyle=pick(['#a8483a','#b4523f','#9c4234','#b85c46']);bq.fillRect(x+1,r*8+1,23,6.4);}}
     const BRK=lam('#ffffff',{map:TX(bc)});
     const fence=(xa,za,xb,zb2)=>{const l=Math.hypot(xb-xa,zb2-za),n=Math.max(1,Math.round(l/2.4)),ry=Math.atan2(-(zb2-za),xb-xa);
       for(let k=0;k<=n;k++){const t=k/n,px=xa+(xb-xa)*t,pz=za+(zb2-za)*t,py=H(px,pz)-Y0;B(.32,1.75,.32,FPOST,px,py+.87,pz);B(.42,.1,.42,FPOST,px,py+1.79,pz,true);
         if(k<n){const t2=(k+.5)/n,mx=xa+(xb-xa)*t2,mz=za+(zb2-za)*t2,my=H(mx,mz)-Y0;const p=B(l/n-.32,.95,.18,BRK,mx,my+.47,mz);p.rotation.y=ry;const cp=B(l/n-.3,.07,.24,FPOST,mx,my+.98,mz,true);cp.rotation.y=ry;}}
       addCol(TB.x+Math.min(xa,xb)-.18,TB.x+Math.max(xa,xb)+.18,Math.min(za,zb2)-.18,Math.max(za,zb2)+.18,Y0+1.8);};
     const gx=-45.2,gz0=22.4,gz1=27.2;[gz0,gz1].forEach(z=>{B(.9,2.6,.9,COLR,gx,1.3,z);B(1.1,.2,1.1,STONE,gx,2.7,z);addCol(TB.x+gx-.45,TB.x+gx+.45,z-.45,z+.45,Y0+2.8);});
     B(.15,.2,gz1-gz0,FRAME,gx,.1,(gz0+gz1)/2,true);B(.5,.45,gz1-gz0+1.1,COLR,gx,3.05,(gz0+gz1)/2);sign(gx+.32,Y0+3.05,(gz0+gz1)/2,PI/2,'平等國小',3.4,'#3a2a20','#f3e6c8');
     fence(gx,15.4,gx,gz0-.5);fence(gx,gz1+.5,gx,45.2);fence(gx,45.2,-88,45.2);fence(-88,45.2,-88,15.4);fence(-88,15.4,wx0-.2,15.4);}
   // bulletin board (公告欄) in front of the east classrooms
   {const bx0=-51.4,bz=23.3;[-1.3,1.3].forEach(o=>{B(.14,2.4,.14,FRAME,bx0+o,1.2,bz);addCol(TB.x+bx0+o-.15,TB.x+bx0+o+.15,bz-.15,bz+.15,Y0+2.4);});B(2.6,1.4,.1,lam('#3f6b4a'),bx0,1.6,bz);B(2.9,.12,.5,EAVE,bx0,2.42,bz);
     ['#f7f2e8','#f2c14e','#bfe3f5','#f6b0a0'].forEach((c,k)=>B(.5,.6,.02,lam(c),bx0-.9+k*.6,1.6+(k%2?.12:-.1),bz+.07,true));}
   sqBatch(G,SG);
   if(ART.grass_a){const t=ART.grass_a;t.wrapS=t.wrapT=T.RepeatWrapping;const x0=-88,x1=-45.2,z0=15.4,z1=45.2;t.repeat.set((x1-x0)/4,(z1-z0)/4);
     const gm=lam('#d6e2c4',{map:t,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});gm.userData.paint=1;const gp=mk(new T.PlaneGeometry(x1-x0,z1-z0),gm,(x0+x1)/2,Y0+.03,(z0+z1)/2,G,false);gp.rotation.x=-PI/2;gp.userData.nomerge=true;}
   if(SCARDS.length)foliBuild(G,SCARDS);
   // dappled shade under the trees and along the planted strip: soft blotchy patches laid on the ground (texture only, no rand())
   {const [dc,dq]=C2(256,256);for(let k=0;k<70;k++){const a=Math.random()*PI*2,r=Math.random()*92,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r*.85,rad=10+Math.random()*26;
       const g_=dq.createRadialGradient(x,y,0,x,y,rad);g_.addColorStop(0,'rgba(255,255,255,.55)');g_.addColorStop(1,'rgba(255,255,255,0)');dq.fillStyle=g_;dq.beginPath();dq.arc(x,y,rad,0,7);dq.fill();}
     dq.globalCompositeOperation='destination-out';for(let k=0;k<40;k++){const x=40+Math.random()*176,y=40+Math.random()*176,rad=3+Math.random()*7;dq.fillStyle='rgba(0,0,0,.8)';dq.beginPath();dq.arc(x,y,rad,0,7);dq.fill();}
     const DM_=new T.MeshBasicMaterial({map:TX(dc),color:col('#1d3a46'),transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
     [[-53.6,26.4,7.5],[-77.6,43.3,7],[-70.5,46,8],[-61.5,46,7.5],[-85.7,30.6,5],[-80.9,34.2,4.5],[-84.6,39.4,5],[-54.4,35,4.5],[-50.8,44,4.5]].forEach(([x,z,w],i)=>{
       const d=mk(new T.PlaneGeometry(w,w*.85),DM_,x+.8,H(x,z)+.09,z+.5,G,false);d.rotation.x=-PI/2;d.rotation.z=i*1.7;d.userData.noInk=1;d.userData.nomerge=true;});}
   SG.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshLambertMaterial)m.userData.paint=1;});});
   reserve(-62,20,12);reserve(-60,34,14);reserve(-48.5,33,7);reserve(-42,24.8,3.5);
   seed=(SEED0+2714*0x6D2B79F5)|0;   // the old school block drew 2714 random numbers: keep the village (houses, students' homes) laid out exactly as before
   flagAt('school',-37,27);inter(P_(-38,28.5),1.8,'平等國小（地標小故事）',()=>sqStory('school'));
   inter(P_(-51.4,24.7),1.8,'看平等國小的公告欄',()=>openBoard('news'));}
   inter(P_(-43.4,24.8),1.8,'走進平等國小',()=>gateEnter('map'));inter(P_(-46.6,24.8),1.4,'走進操場（手繪畫面）',()=>fieldEnter());
  // 獵人步道登山口 (behind the school, west)
  {const x=-73,z=8;[-1.3,1.3].forEach(k=>mk(bx(.3,3,.3),M.woodDark,x,H(x,z+k)+1.5,z+k,G));mk(bx(.4,.4,3.2),M.woodDark,x,H(x,z)+3.1,z,G);
    sign(x+.25,H(x,z)+3.6,z,PI/2,'環山獵人步道',3,'#4a3527','#f3e6c8');post(-70,12.5,1.6);sign(-69.93,H(-70,12.5)+1.5,12.5,PI/2,'解說牌',1.4,'#2f5a3a','#fff','只在入口看，不進入');
    [[-77,5],[-78,11],[-80,8],[-76,14]].forEach(([a,b])=>{mk(cy(.2,.3,2,7),M.trunk,a,H(a,b)+1,b,G);mk(ico(1.6,1),M.leaf,a,H(a,b)+3,b,G);});
    reserve(x,z,4);flagAt('trail',-68,9);inter(P_(-68.5,7),1.8,'獵人步道登山口（地標小故事）',()=>sqStory('trail'));}
  // 幼兒園
  {const g=box(9,3.2,5.5,lam('#fff1d8'),-28,13,PI/2);gable(g,9,5.5,3.2,1.4,lam('#e0674b'));mk(bx(1.3,2.1,.08),M.doorWood,0,1.05,2.8,g);[-3,3].forEach(x=>mk(bx(1.6,1,.08),lam('#bfe3f5'),x,1.8,2.8,g,false));
    const sl=mk(bx(.8,.1,3.4),lam('#f2c14e'),-31,H(-31,5.5)+1,5.5,G);sl.rotation.x=.45;mk(bx(1,.1,1),lam('#4f9ad8'),-31,H(-31,3.9)+1.8,3.9,G);addCol(TB.x-31.6,TB.x-30.4,3.3,7.1,H(-31,5.5)+2);
    sign(-24.82,H(-28,13)+2.5,13,PI/2,'幼兒園環山分所',3.2,'#fff1d8','#c8432b');reserve(-28,13,6);flagAt('kinder',-22,8.5);inter(P_(-22.5,10.5),1.7,'幼兒園（地標小故事）',()=>sqStory('kinder'));}
  // 便利商店 7-ELEVEN 環山門市 (far south, beside 台7甲 — a bit of a walk)
  {const g=box(9,3.4,6,lam('#f7f7f4'),-32,166,PI);mk(bx(9.3,.5,6.3),lam('#f7f7f4'),0,3.45,0,g);mk(bx(7,2.3,.08),lam('#cfe4ec'),0,1.25,3.03,g,false);mk(bx(1.8,2.3,.1),lam('#9fc3d6'),2.6,1.15,3.05,g,false);
    mk(bx(9.4,.55,.25),lam('#2f7f4a'),0,2.95,3.12,g);mk(bx(9.4,.12,.27),lam('#e8873a'),0,2.62,3.13,g,false);mk(bx(9.6,.14,1.6),lam('#e9e6df'),0,3.2,3.8,g);mk(bx(9.4,.1,.27),lam('#c8432b'),0,2.5,3.13,g,false);
    {const DF=lam('#4a5852');for(let k=0;k<=5;k++)mk(bx(.09,2.3,.14),DF,-3.5+k*(5.2/5),1.25,3.1,g,false);mk(bx(7.1,.1,.16),DF,0,.12,3.1,g,false);mk(bx(7.1,.1,.16),DF,0,2.38,3.1,g,false);
     [1.65,3.55].forEach(x=>mk(bx(.16,2.5,.5),lam('#e9e6df'),x,1.25,3.25,g));mk(bx(2.06,.18,.5),lam('#e9e6df'),2.6,2.45,3.25,g,false);mk(bx(.06,2.2,.12),DF,2.6,1.15,3.1,g,false);mk(bx(1.7,.06,.12),DF,2.6,.95,3.12,g,false);mk(bx(1.5,.02,.9),lam('#7a8a84'),2.6,.15,3.6,g,false);}
    [-3.4,-1.4,.6].forEach(x=>mk(bx(.9,1.1,.02),lam(pick(['#f2c14e','#e0674b','#4f9ad8'])),x,1.6,3.09,g,false));mk(bx(9.2,.14,2.2),lam('#cfcac0'),0,.07,4.1,g,false);
    [-4.1,4.1].forEach(x=>{mk(cy(.28,.25,.8,10),lam('#3f6f5a'),x,.4,3.7,g);});
    sign(-32,H(-32,166)+2.98,162.71,PI,'7-ELEVEN 環山門市',4.2,'#2f7f4a','#fff');
    reserve(-32,166,7);flagAt('shop',-24,160.5);inter(P_(-25,159.5),1.8,'便利商店（地標小故事）',()=>sqStory('shop'));inter(P_(-32,161),1.8,'走進 7-11',()=>enterMart('tribe'));}
  // 以萬果園水果賣場
  {const g=box(8,3.2,5,lam('#efe3cf'),-21,-11,-PI/2);mk(bx(8.4,.12,1.6),lam('#4f8a5b'),0,2.9,3.2,g);
    for(let i=0;i<6;i++){mk(bx(1,.5,.7),M.woodLight,-3+i*1.2,.25,3.2,g,false);for(let k=0;k<4;k++)mk(sph(.14,6,5),lam(['#f08a2a','#f6b0a0','#e8e0a0'][i%3]),-3.3+i*1.2+k*.2,.6,3.2,g,false);}
    sign(-23.85,H(-21,-11)+3.4,-11,-PI/2,'以萬果園',3,'#f08a2a','#fff','水果賣場');reserve(-21,-11,5);flagAt('fruit',-26,-5);inter(P_(-25.5,-7.5),1.8,'以萬果園（地標小故事）',()=>sqStory('fruit'));}
  // 阿來小吃店
  {const g=box(5,2.8,4.5,lam('#efe3cf'),-3,13,PI/2);mk(bx(5.4,.12,1.4),lam('#e0a020'),0,2.6,2.9,g);sign(-.6,H(-3,13)+2.25,13,PI/2,'阿來小吃店',2.4,'#f2c14e','#3a2a20');reserve(-3,13,4);
    inter(P_(.8,13),1.6,'阿來小吃店',()=>say('阿來小吃店',['部落的小吃店，飄來炒飯和湯麵的香味。','（老闆在忙，下次再來吃吧！）']));}
  // 公車站
  {const x=29,z=17;[-1.6,1.6].forEach(k=>mk(cy(.07,.07,2.6,8),M.metalDark,x+k,H(x+k,z)+1.3,z+.8,G));mk(bx(4,.12,2),lam('#3b6ea5'),x,H(x,z)+2.65,z+.3,G);
    mk(bx(3,.08,.5),M.woodLight,x,H(x,z)+.45,z+.8,G,false);post(x-2.6,z-.6,2.4);sign(x-2.6,H(x-2.6,z)+2.5,z-.65,PI,'環山 公車站',2,'#2f6b56','#fff','台7甲');
    reserve(x,z,3);flagAt('bus',25,20);inter(P_(26,21.5),2,'環山部落公車站（地標小故事）',()=>sqStory('bus'));
    inter(P_(30.5,20.5),1.6,'搭公車',()=>choose('環山公車站','要搭車去哪裡呢？',[{label:'🚉 平等車站',fn:()=>trainRide('平等',()=>enterStation({now:true}),'🚌')},{label:'🌊 汐見町（去闖關）',fn:()=>trainRide('汐見町',()=>arriveShiomi(),'🚌')},{label:'📍 看地標打卡卡',fn:()=>sqCard()},{label:'再逛一下',fn:null}]));}
  // three churches
  {const church=(x,z,ry,wall,roof,name,tall)=>{const g=box(7,4,10,lam(wall),x,z,ry);gable(g,7,10,4,2.2,lam(roof));const t=tall?7.5:5.2;mk(bx(2.2,t,2.2),lam(wall),0,t/2,-4.2,g);
      const sp=mk(new T.ConeGeometry(1.6,2.6,4),lam(roof),0,t+1.3,-4.2,g);sp.rotation.y=PI/4;mk(bx(.18,1.6,.18),lam('#f2efe8'),0,t+3.3,-4.2,g,false);mk(bx(1,.18,.18),lam('#f2efe8'),0,t+3.5,-4.2,g,false);
      mk(bx(1.6,2.6,.08),M.doorWood,0,1.3,-5.03,g);const sgn=sign(0,0,0,0,name,3.2,'#f2efe8','#3a2a20');G.remove(sgn);g.add(sgn);sgn.position.set(0,t-1.2,-5.33);sgn.rotation.y=PI;reserve(x,z,7);};
    church(21,-32,PI/2,'#f4f0e6','#b8452f','環山天主堂',false);church(-3,-11,PI/2,'#eef2f5','#3b6ea5','真耶穌教會',false);church(60,-34,PI/2,'#f3ead3','#7a4a3a','長老教會',true);
    flagAt('church',14.5,-31.5);inter(P_(14,-29.8),1.8,'教會（地標小故事）',()=>sqStory('church'));}
  // 石板屋, 泰雅文物館 + granary, 眺望點
  {const sl=lam('#8a8680',{map:(()=>{const [c,g]=C2(128,128);g.fillStyle='#8a8680';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=10)for(let x=-(y%20);x<128;x+=22){g.fillStyle=pick(['#7a766f','#96928a','#6f6b65']);g.fillRect(x+1,y+1,20,8);}return TX(c,true);})()});
    const g=box(6,2.2,5,sl,-22,-30,0);gable(g,6,5,2.2,1,sl);mk(bx(1,1.7,.08),M.woodDark,0,.85,2.53,g);reserve(-22,-30,4.5);
    inter(P_(-22,-26.4),1.6,'看石板屋',()=>say('石板屋',['牆壁和屋頂都是用石板一片一片疊起來的。','石板很厚，冬天保暖、夏天涼爽。']));}
  {const m=box(10,4,6,lam('#b9b3a6'),-9,-27,-PI/2);gable(m,10,6,4,1.6,lam('#c7cbcf'));mk(bx(10.05,1.2,6.05),M.wood,0,.6,0,m);mk(bx(2,2.4,.1),M.doorWood,0,1.2,3.03,m);
    sign(-12.1,H(-9,-27)+3.3,-27,-PI/2,'泰雅文物館',3.6,'#3a2a20','#f3e6c8');reserve(-9,-27,7);inter(P_(-13.8,-27),1.8,'進泰雅文物館（收藏館）',()=>tbMuseum());
    const gr=new T.Group();const gx=-1,gz=-31;gr.position.set(gx,H(gx,gz),gz);G.add(gr);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{mk(cy(.12,.14,1.6,8),M.woodDark,a*1.1,.8,b*1.1,gr);mk(cy(.34,.34,.06,12),M.woodLight,a*1.1,1.45,b*1.1,gr,false);});
    mk(bx(2.8,1.7,2.8),lam('#8a6446'),0,2.4,0,gr);[-1,1].forEach(s=>{const r=mk(bx(3.6,.3,2.3),lam('#9a8452'),0,3.75,s*.95,gr);r.rotation.x=s*.62;});addCol(TB.x+gx-1.5,TB.x+gx+1.5,gz-1.5,gz+1.5,H(gx,gz)+5);reserve(gx,gz,3);
    inter(P_(gx,gz+2.6),1.5,'看傳統穀倉',()=>say('穀倉',['這是傳統的穀倉，把房子架高，可以防潮、也防老鼠偷吃。','柱子上圓圓的板子，就是擋老鼠爬上去的。']));}
  {const x=-85.6,z=21,y=H(x,z);mk(bx(4,.3,6),M.woodLight,x,y+.15,z,G);(TB.pads=TB.pads||[]).push({x0:x-2,x1:x+2,z0:z-3,z1:z+3,y:y+.31});mk(bx(.12,1,6),M.woodDark,x-2,y+.8,z,G,false);addCol(TB.x+x-2.3,TB.x+x-1.8,z-3,z+3,y+1.2);[[-3],[3]].forEach(([a])=>mk(bx(4,1,.12),M.woodDark,x,y+.8,z+a,G,false));
    mk(cy(.08,.1,1.1,8),M.metalDark,x-1,y+.85,z,G);mk(cy(.18,.14,.5,10),M.metalDark,x-1,y+1.45,z,G,false).rotation.z=PI/2;addCol(TB.x+x-1.2,TB.x+x-.8,z-.2,z+.2,y+1.5);reserve(-73,34,4);   // keep the old reserve spot so the village layout (random stream) stays identical
    inter(P_(x+.5,z),1.8,'眺望點（看四周的山）',()=>say('眺望點',['從這裡可以看到四周的高山：雪山、南湖大山、志佳陽大山……「環山」就是被高山圍起來的意思。','遠一點的地方：四季蘭溪吊橋在部落西側；清泉橋在南方約 2.5 公里，族人暱稱「巴黎鐵橋」；還有 Sqoyaw 天空。']));}
  // 四季蘭溪吊橋 + 志佳陽大山登山口 (far bank)
  {const b=new T.Group();G.add(b);const BZ=SQ_BR.z,X0=SQ_BR.x0,X1=SQ_BR.x1,L=X0-X1;for(let x=X0;x>X1;x-=.5){mk(bx(.42,.1,2.3),M.woodLight,x,tribeH(x,BZ)-.08,BZ,b,false);}
    const y0=sqBase(X0,BZ),y1=sqBase(X1,BZ);[[X0,y0],[X1,y1]].forEach(([x,y])=>[-1.3,1.3].forEach(k=>mk(bx(.3,3.4,.3),M.woodDark,x,y+1.7,BZ+k,b)));
    [-1.25,1.25].forEach(k=>{const pts=[];for(let i=0;i<=32;i++){const t=i/32,x=X0-L*t;pts.push(new T.Vector3(x,lerp(y0,y1,t)+3.2-2.1*Math.sin(t*PI),BZ+k));}
      mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts),64,.04,5),M.metalDark,0,0,0,b,false);
      const rail=pts.map(p=>new T.Vector3(p.x,tribeH(p.x,BZ)+.95,p.z));mk(new T.TubeGeometry(new T.CatmullRomCurve3(rail),64,.03,5),M.woodDark,0,0,0,b,false);
      pts.forEach((p,i)=>{if(i%2)return;const d=tribeH(p.x,BZ);mk(cy(.015,.015,p.y-d,4),M.metalDark,p.x,(p.y+d)/2,p.z,b,false);});});
    sign(X0+1.5,y0+2.4,BZ-2,PI/2,'四季蘭溪吊橋',2.6,'#4a3527','#f3e6c8','一次限 10 人');post(X0+1.5,BZ-2,2.2);
    inter(P_(X0+2,BZ),1.8,'看吊橋的牌子',()=>say('四季蘭溪吊橋',['民國 77 年建的吊橋，一次限 10 人通行。','溪裡偶爾看得到櫻花鉤吻鮭喔！']));
    post(-150,-40,1.8);sign(-150,H(-150,-40)+1.9,-40,PI/2,'志佳陽大山登山口',3,'#2f5a3a','#fff','無裝備勿前往');
    [[-154,-51],[-154,-45],[-154,-39]].forEach(([x,z])=>{const y=H(x,z);mk(bx(.12,.12,5.6),lam('#e0a020'),x,y+.9,z,G,false);mk(bx(.12,.12,5.6),lam('#c8432b'),x,y+.6,z,G,false);});
    inter(P_(-149,-44),1.8,'看登山口的牌子',()=>say('志佳陽大山登山口',['過了吊橋，就是志佳陽大山登山口，是早期攀登雪山的主要路線。','山路很危險，沒有登山裝備和大人帶領，千萬不要前往！']));}
  // 環山二巷: 蹦蹦車 + orchards; the five students live along this lane
  {const t=new T.Group();const tx=13,tz=-58;t.position.set(tx,H(tx,tz),tz);t.rotation.y=1.15;G.add(t);mk(bx(1.5,1.4,1.6),M.red,1.4,1.05,0,t);mk(bx(.05,.6,1.3),M.glassDark,2.16,1.35,0,t,false);mk(bx(2.4,.5,1.7),M.red,-.6,.75,0,t);
    [[-1.5,.85],[-1.5,-.85],[1.4,.85],[1.4,-.85]].forEach(([x,z])=>{const w=mk(cy(.32,.32,.25,12),M.black,x,.32,z,t);w.rotation.x=PI/2;});for(let k=0;k<6;k++)mk(sph(.2,8,6),lam('#f08a2a'),-1.4+(k%3)*.5,1.15,(k<3?-.3:.3),t,false);
    addCol(TB.x+tx-2.3,TB.x+tx+2.3,tz-1.6,tz+1.6,H(tx,tz)+2.4);reserve(tx,tz,3.5);
    inter(P_(tx-2.5,tz+1.5),1.8,'坐蹦蹦車',()=>choose('蹦蹦車','噗噗噗～要載你去哪裡？',[{label:'🏠 我家門口',fn:()=>tbRide('home')},{label:'🏫 平等國小',fn:()=>tbRide('school')},{label:'🍊 甜柿果園',fn:()=>tbRide('orchard')},{label:'🌉 四季蘭溪吊橋',fn:()=>tbRide('bridge')},{label:'🚌 公車站',fn:()=>tbRide('bus')},{label:'🏪 7-11',fn:()=>tbRide('shop')},{label:'🐾 動物之家',fn:()=>tbRide('animals')},{label:'不用了',fn:null}]));
    flagAt('lane2',-1,-61);inter(P_(-.5,-59),1.6,'環山二巷（地標小故事）',()=>sqStory('lane2'));post(-4,-55,2.2);sign(-4,H(-4,-55)+2.3,-54.95,0,'環山二巷',1.8,'#2f6b56','#fff');}
  {const fruitM=lam('#f08a2a',{emissive:col('#a04a10'),emissiveIntensity:.2});const FR=new T.InstancedMesh(sph(.2,8,6),fruitM,500);let nf=0;const mm=new T.Matrix4();
    const trees=[];for(let x=-60;x<=-26;x+=5)for(let z=48;z<=76;z+=5)trees.push([x+rr(-.6,.6),z+rr(-.6,.6)]);for(let x=60;x<=92;x+=5)for(let z=-80;z<=-64;z+=5)trees.push([x+rr(-.6,.6),z+rr(-.5,.5)]);
    trees.forEach(([x,z],i)=>{if(sqLaneD(x,z)[0]<2.5)return;const y=H(x,z);mk(cy(.16,.24,1.6,7),M.trunk,x,y+.8,z,G);const cr=mk(ico(1.4,1),lam(i%2?'#5a8a3e':'#4f7f3a'),x,y+2.3,z,G);cr.scale.set(1.1,.85,1.1);
      for(let k=0;k<9&&nf<500;k++){const a=rr(0,6.28),b=rr(.2,1.3);mm.makeTranslation(x+Math.cos(a)*Math.sin(b)*1.5,y+2.2+Math.cos(b)*1,z+Math.sin(a)*Math.sin(b)*1.5);FR.setMatrixAt(nf++,mm);}
      addCol(TB.x+x-.3,TB.x+x+.3,z-.3,z+.3,y+3);if(i%3===0)inter(P_(x,z-1.6),1.5,()=>tbSeason()?'採甜柿':'看看柿子樹',()=>tbPick());reserve(x,z,2.4);});
    FR.count=nf;G.add(FR);TB.fruit=FR;post(-50,46,1.6);sign(-50,H(-50,46)+1.6,46.05,0,'甜柿果園',1.8,'#6e4c33','#ffd9a0');}
  // 環山派出所 + 環清宮 beside 台7甲
  {const g=box(8,3.4,6,lam('#f2efe8'),8,148,PI);mk(bx(8.1,1.1,6.1),lam('#a34a3a'),0,.55,0,g);mk(bx(3,2.3,.08),lam('#cfe4ec'),0,1.2,3.03,g,false);mk(bx(8.6,.5,6.6),lam('#4a4a4e'),0,3.6,0,g);
    sign(8,H(8,148)+3.05,144.8,PI,'環山派出所',3.6,'#3a3a3e','#f3e6c8');
    const tw=new T.Group();tw.position.set(10.5,H(8,148)+3.6,150);G.add(tw);[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]].forEach(([a,b])=>mk(bx(.07,1.4,.07),M.metal,a,.7,b,tw,false));mk(cy(.6,.6,1.3,12),lam('#cfd3d6'),0,2,0,tw);
    reserve(8,148,6);inter(P_(8,143.5),1.8,'環山派出所',()=>say('環山派出所',['部落的治安中心，爬山的人也在這裡辦入山登記。','耆老說，以前的舊部落 Ciqölangan 就在派出所東南方的山腰上，那一帶也是祖先打獵的地方。']));
    }
  {const x=-10,z=153;const red=lam('#c8432b'),gold=lam('#e0a020'),green=lam('#3f7f5a');const g=new T.Group();g.position.set(x,H(x,z),z);g.rotation.y=PI;G.add(g);
    [-2.4,2.4].forEach(k=>{mk(bx(.55,4.2,.55),red,k,2.1,0,g);mk(bx(.8,.4,.8),M.stone,k,.2,0,g);});mk(bx(6.2,.6,.8),red,0,4.3,0,g);mk(bx(6.8,.25,1.3),green,0,4.75,0,g);
    [-1,1].forEach(s=>{const r=mk(bx(3.6,.18,1.4),lam('#2f6b4a'),s*1.6,5.05,0,g);r.rotation.z=-s*.16;});mk(bx(3.4,.7,.1),gold,0,3.7,.45,g,false);
    const sg=sign(0,0,0,0,'環清宮',2.6,'#c8432b','#ffe08a');G.remove(sg);g.add(sg);sg.position.set(0,3.7,.52);
    for(let k=-2;k<=2;k++){const l=mk(sph(.2,8,6),lam('#e0473a',{emissive:col('#ff5a3a'),emissiveIntensity:.5}),k*1,3.75,.6,g,false);}
    [-2.4,2.4].forEach(k=>addCol(TB.x+x+k-.3,TB.x+x+k+.3,z-.3,z+.3,H(x,z)+5));
    const t=box(7,3.2,5.5,lam('#f2e2c8'),-10,161,PI);gable(t,7,5.5,3.2,1.4,lam('#c8432b'));mk(bx(2.2,2.4,.1),red,0,1.2,2.8,t);reserve(-10,157,7);
    inter(P_(-10,150.5),1.8,'環清宮',()=>say('環清宮',['部落裡的媽祖廟，也是登山客的香客大樓，爬志佳陽、雪山的人常在這裡過夜。','部落裡有教會也有廟，大家的信仰不一樣，但也都會互相尊重、互相幫忙。']));}
  // ---------- shops, homestays & spots from the map
  {const spot=(x,z,ry,w,d,h,wall,roof,aw,name,lines,sw)=>{const g=box(w,h,d,lam(wall),x,z,ry);gable(g,w,d,h,1,lam(roof));if(aw)mk(bx(w*.9,.1,1.4),lam(aw),0,h-.45,d/2+.7,g,false);
      mk(bx(1.2,2.1,.08),M.doorWood,0,1.05,d/2+.04,g);[-1,1].forEach(k=>mk(bx(1,.8,.06),lam('#bfe3f5'),k*(w/2-1.1),1.7,d/2+.04,g,false));
      const fx=x+Math.sin(ry)*(d/2+.12),fz=z+Math.cos(ry)*(d/2+.12);sign(fx,g.position.y+h-.75,fz,ry,name,sw||Math.min(3.4,w*.7),'#fffaf0','#3a2a20');
      reserve(x,z,Math.max(w,d)*.6+1);const ix=x+Math.sin(ry)*(d/2+1.7),iz=z+Math.cos(ry)*(d/2+1.7);inter(P_(ix,iz),1.6,name,()=>say(name,lines));return g;};
    const g1=spot(-40,-5,PI/2,7,5,3.2,'#f3ead9','#7a5aa8',null,'空野原（紫藤的天空）',['民宿「空野原」，大家叫它「紫藤的天空」。','春天的時候，屋前的紫藤花會開成一片紫色的瀑布。'],3.4);
    {const wg=new T.SphereGeometry(.12,6,5);wg.scale(1,2.6,1);const wm=['#9b7fd4','#b69ae6','#8a6ac8'].map(c=>lam(c));mk(bx(.18,.12,7),M.woodLight||lam('#c9a77a'),2.7,3.15,0,g1,false);for(let k=0;k<40;k++)mk(wg,pick(wm),2.66+rr(-.15,.15),2.85-rr(0,.3),-3.3+k*.165,g1,false);}
    spot(3,7,PI,5,4.5,3,'#e8eefb','#3b6ea5',null,'瑪岱夢水月',['民宿「瑪岱夢水月」，是部落裡評分很高的民宿。','很多登山客和遊客都住在這裡。']);
    spot(36,-4,-PI/2,6,5,3.2,'#fff1d6','#e07a2a',null,'環山的波波家',['民宿「環山的波波家」。','從這裡可以看到對面一層一層的山。']);
    spot(-14,20,PI/2,5,4,2.8,'#efe3cf','#3f7f6a','#c8432b','環青商店',['老字號的雜貨店，旁邊就是阿來小吃店和歌瑟亞早餐店。','雜貨店也是大家聊天、交換消息的地方；以前沒有商店，祖先是用以物易物換東西的。']);
    spot(4,18,0,4.5,4,2.8,'#f7f2e8','#d9573b','#e0a020','歌瑟亞早餐店',['歌瑟亞早餐店，早上上學前常常有人來這裡買早餐。']);
    spot(-27,-20,PI/2,5,4,2.8,'#dfe6e8','#4f8a5b','#3b6ea5','青山商行',['環山一巷的雜貨店，離學校大約 230 公尺。','部落的雜貨店之一，早上八點開到晚上七點。']);
    spot(-35,-12,PI/2,4.5,4,2.6,'#fbeee0','#e0a020','#f2c14e','愛玉商店',['賣愛玉的小店。','夏天來一碗冰冰涼涼的愛玉，最舒服了！']);
    spot(26,-90,-PI/2,6,5,3,'#f1ede2','#8a5a3a','#4f8a5b','環山 IEMo 馬鈴薯小院',['「環山 IEMo 馬鈴薯小院」。','高山上種的馬鈴薯，鬆鬆軟軟的很好吃。'],3.6);
    spot(-29,77,0,6,4.5,2.6,'#f1ede2','#4f86bf',null,'梨山雲頂果園',['梨山雲頂果園，一排一排的果樹沿著山坡種。','秋天是甜柿，冬天還有雪梨。']);
    {const g=spot(92,104,-PI/2,9,6,3.2,'#f3e2c8','#6e4c33','#4f8a5b','詩歌謠天空 Sqoyaw Sky',['「詩歌謠天空」：部落風味餐和民宿。','「詩歌謠」就是 Sqoyaw 的音譯。'],4.4);mk(bx(4,.25,6),M.woodLight,0,.12,6,g);mk(bx(3.9,3.2,5.9),M.concrete,0,-1.6,6,g);}
    {const cx=106,cz=78,y=H(cx,cz);[[0,0,'#e0674b'],[4,1,'#3b6ea5'],[1.5,4.5,'#f2c14e'],[5.5,5,'#4f8a5b']].forEach(([a,b,c])=>{const t=mk(new T.ConeGeometry(1.4,1.8,4),lam(c),cx+a,H(cx+a,cz+b)+.9,cz+b,G);t.rotation.y=PI/4;addCol(TB.x+cx+a-1,TB.x+cx+a+1,cz+b-1,cz+b+1,y+3);});
      post(cx-3,cz-2,1.8);sign(cx-3,y+1.8,cz-2,-PI/2,'平岩山望向芸端露營區',3.2,'#2f5a3a','#fff');reserve(cx+3,cz+2.5,6);inter(P_(cx-3.5,cz),1.6,'露營區',()=>say('平岩山望向芸端露營區',['露營區。晚上可以在帳篷裡看滿天星星。']));}
    }
  // ---------- houses: dense cluster on the slope; 5 of them are the students' homes
  const WALLC=['#e9e6dc','#f1ede2','#dfe6e8','#e6eadb','#efe3cf','#e3e0ea'],ROOFC=['#b8452f','#3f7f6a','#3b6ea5','#8a8f94','#a34a3a','#2f7f67'];
  const winM=new T.MeshLambertMaterial({color:col('#9fb8c4'),emissive:col('#ffcf8a'),emissiveIntensity:0});TB.winM=winM;
  const siding=WALLC.map(h=>lam('#ffffff',{map:(()=>{const [c,g]=C2(64,64);g.fillStyle=h;g.fillRect(0,0,64,64);for(let y=0;y<64;y+=8){g.fillStyle='rgba(0,0,0,.09)';g.fillRect(0,y,64,2);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,y+2,64,1);}return TX(c,true);})()}));
  [30,40,50,60,70].forEach(x=>reserve(x,-54,6.5));
  const stu=[30,40,50,60,70].map(x=>({x,z:-54,qx:x,qz:-46,ld:6}));stu.forEach((c,i)=>tbHouse(G,c,i+1,siding,ROOFC,winM));
  {post(21.5,-43,2.2);sign(21.5,H(21.5,-43)+2.3,-42.95,0,'同學巷',1.6,'#e0674b','#fff');}
  // ---------- houses v2: rows of real mountain-village buildings lining every lane
  //   RC 2–3 storey 透天 with tin roof-top add-ons & water tanks, shop fronts with roll-up shutters,
  //   sheet-metal houses, old gable houses, fruit-packing sheds / carports — packed along the lanes like the satellite view
  {const U=new T.BoxGeometry(1,1,1),UC=new T.CylinderGeometry(1,1,1,14);
   const rib=(a,b,n,vert,sz=64)=>{const [c,g]=C2(sz,sz);g.fillStyle=a;g.fillRect(0,0,sz,sz);g.fillStyle=b;for(let i=0;i<n;i++){const p=i*sz/n;if(vert)g.fillRect(p,0,sz/n*.38,sz);else g.fillRect(0,p,sz,sz/n*.38);}return TX(c,true);};
   const tiles=base=>{const [c,g]=C2(128,128);g.fillStyle=base;g.fillRect(0,0,128,128);g.fillStyle='rgba(0,0,0,.10)';for(let y=0;y<128;y+=5){g.fillRect(0,y,128,1);for(let x=(y/5%2)*6;x<128;x+=12)g.fillRect(x,y,1,5);}return TX(c,true);};
   const TM=(a,b,n,v)=>lam('#ffffff',{map:rib(a,b,n,v)});
   const FAC=['#f6ecda','#eee0ca','#e4ddd2','#f0dccb','#f3e3c2','#dfe4df','#e2e8da','#f7f0e3'].map(c=>lam(c));
   const FACT=['#d8bfa6','#e2cfb2','#cbc3b6','#ecdcc6'].map(c=>lam('#ffffff',{map:tiles(c)}));
   const TINW=[['#cfd6d9','#b7c0c4'],['#a9c3cf','#91abb8'],['#d8d2c4','#c2bbab'],['#b9c9b4','#a3b39e'],['#e6e2d6','#cfcabd']].map(([a,b])=>TM(a,b,12,true));
   const ROOF=[['#3f6ea8','#33598a'],['#b24a32','#953c28'],['#4a8466','#3c6e54'],['#3f6ea8','#33598a'],['#b24a32','#953c28'],['#4a8466','#3c6e54']].map(([a,b])=>TM(a,b,10,true));
   const WOOD=TM('#7a5a40','#5f452f',9,false),SHUT=TM('#b4b8bb','#979ca0',14,false);
   // 第二批 textures (no rand(): only the materials change, every house keeps its pick): roofs blue / red / green corrugated metal,
   // one plaster colour in eight becomes red brick, two of the five tin-wall colours become blue / green metal and one vertical wood boards; wood houses use the board texture
   const TX2=(m,k,mode,base,o={})=>{if(SURF[k])surfSet(m,k,mode,base,1,Object.assign({chroma:1},o));};
   if(SURF.wall_wood)TX2(WOOD,'wall_wood',1,'#896647');else surfSet(WOOD,'wood_plank',1,'#b08258',1,{chroma:.5});
   FAC.forEach((m,i)=>{if(i===6&&SURF.wall_brick_red)TX2(m,'wall_brick_red',1,'#925545');else surfSet(m,'wall_plaster',1);});FACT.forEach((m,i)=>surfSet(m,'wall_tile',1,['#dcc4aa','#e6d4b8','#cfc7bb','#eedfca'][i],1,{chroma:.6}));
   TINW.forEach((m,i)=>{const k2=[null,'metal_blue',null,'metal_green','wall_wood'][i];if(k2&&SURF[k2])TX2(m,k2,1,{metal_blue:'#4f7fae',metal_green:'#5f9068',wall_wood:'#896647'}[k2]);else surfSet(m,'roof_metal',1,['#cfd6d9','#a9c3cf','#d8d2c4','#b9c9b4','#e6e2d6'][i]);});
   ROOF.forEach((m,i)=>{const k2=['metal_blue','metal_red','metal_green'][i%3];if(SURF[k2])TX2(m,k2,2,{metal_blue:'#315986',metal_red:'#88362e',metal_green:'#3e6e49'}[k2]);else surfSet(m,'roof_metal',2,['#3f6ea8','#b24a32','#4a8466'][i%3]);});
   const EAVEB=lam('#5b4636'),FR=lam('#3d4045'),RAIL=lam('#5b5f64'),BAND=lam('#bdb5a6'),DARK=lam('#3b3530'),AC=lam('#ecece6'),STEEL=lam('#d6dadd'),BLUET=lam('#3d6fb0'),STEP=lam('#b3ada2'),POST=lam('#7c8186');
   const DOORS=[lam('#a8392f'),lam('#3f6f5a'),M.doorWood,lam('#5a6b7a'),lam('#8a5a3a')],AWN=[lam('#c8432b'),lam('#3b6ea5'),lam('#e0a020'),lam('#4f8a5b'),lam('#e8e4da')];
   const CRATE=[lam('#3b6ea5'),lam('#e0a020'),lam('#4f8a5b'),lam('#d9573b')],TRUCK=[lam('#3d6fb0'),lam('#f2efe8'),lam('#c8432b')];
   const HG=new T.Group();G.add(HG);const BLD=[];
   const Q=(g,mat,x,y,z,w,h,d,o)=>{const m=new T.Mesh(U,mat);m.position.set(x,y,z);m.scale.set(w,h,d);if(o){if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;if(o.ni)m.userData.noInk=1;}g.add(m);return m;};
   const CYL=(g,mat,x,y,z,r,h,ni)=>{const m=new T.Mesh(UC,mat);m.position.set(x,y,z);m.scale.set(r,h,r);if(ni)m.userData.noInk=1;g.add(m);return m;};
   const WFR=lam('#f4ecdc'),WSILL=lam('#d8cdbd'),WSH=lam('#6f6458'),WGR=lam('#65746e');
   const win=(g,x,y,z,w=1.1,h=1,grill=true)=>{Q(g,winM,x,y,z,w,h,.06,{ni:1});Q(g,WSH,x,y+h/2-.06,z+.035,w,.12,.01,{ni:1});Q(g,WFR,x,y+h/2+.07,z+.07,w+.3,.14,.16);Q(g,WSILL,x,y-h/2-.06,z+.1,w+.42,.1,.22);[-1,1].forEach(s=>Q(g,WFR,x+s*(w/2+.07),y,z+.07,.14,h+.02,.16,{ni:1}));Q(g,WFR,x,y,z+.045,.05,h,.02,{ni:1});if(grill){Q(g,WGR,x,y,z+.12,.04,h,.03,{ni:1});for(let k=1;k<3;k++)Q(g,WGR,x,y-h/2+k*h/3,z+.12,w,.03,.03,{ni:1});}};
   const gable=(g,W,D,Hh,rh,rm,wm)=>{const half=D/2+.45,sl=Math.hypot(half,rh);[-1,1].forEach(s=>{Q(g,rm,0,Hh+rh/2,s*half/2,W+.6,.18,sl,{rx:s*Math.atan2(rh,half)});Q(g,EAVEB,0,Hh-.04,s*(half-.02),W+.66,.24,.1);});[-1,1].forEach(s=>[-1,1].forEach(t=>Q(g,EAVEB,s*(W/2+.31),Hh+rh/2+.02,t*half/2,.1,.22,sl,{rx:t*Math.atan2(rh,half),ni:1})));
     const sh=new T.Shape();sh.moveTo(-D/2,0);sh.lineTo(D/2,0);sh.lineTo(0,rh-.05);sh.closePath();const e=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:W-.02,bevelEnabled:false}),wm);e.position.set(-W/2+.01,Hh,0);e.rotation.y=PI/2;g.add(e);};
   const tank=(g,x,y,z)=>{const m=rand()<.6?STEEL:BLUET;[[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]].forEach(([a,b])=>Q(g,RAIL,x+a,y+.5,z+b,.07,1,.07,{ni:1}));Q(g,RAIL,x,y+1,z,1,.07,1,{ni:1});CYL(g,m,x,y+1.55,z,.48,1.05);};
   const pots=(g,x0,x1,z,n)=>{for(let i=0;i<n;i++){const x=x0+(x1-x0)*(n<2?.5:i/(n-1));CYL(g,rand()<.6?M.pot:M.pot2,x,.16,z,.17,.32,1);const f=new T.Mesh(ico(.27,0),rand()<.5?M.leaf:M.leaf2);f.position.set(x,.45,z);f.scale.y=rr(.8,1.4);f.userData.noInk=1;g.add(f);}};
   const truck=(g,x,z,ry)=>{const t=new T.Group();t.position.set(x,0,z);t.rotation.y=ry;g.add(t);const c=pick(TRUCK);Q(t,c,0,.95,1.05,1.6,1.3,1.1);Q(t,FR,0,1.2,1.62,1.4,.5,.04,{ni:1});Q(t,c,0,.62,-.6,1.6,.35,2.3);
     [-.8,.8].forEach(s=>Q(t,c,s,.95,-.6,.06,.45,2.3,{ni:1}));Q(t,c,0,.95,-1.73,1.6,.45,.06,{ni:1});[[-.78,1],[.78,1],[-.78,-1.1],[.78,-1.1]].forEach(([a,b])=>CYL(t,DARK,a,.3,b,.3,.22,1).rotation.z=PI/2);
     for(let k=0;k<rand()*4;k++)Q(t,pick(CRATE),rr(-.4,.4),1.0,-.3-k*.45,.6,.32,.42,{ni:1});};
   // ---- building types (front = local +z, ground = 0)
   const BT={
    rc(g,W,D,o){const n=rand()<.22?3:2,fh=2.9,Hh=n*fh,wm=rand()<.3?pick(FACT):pick(FAC);Q(g,wm,0,Hh/2,0,W,Hh,D);
      for(let k=1;k<n;k++)Q(g,BAND,0,k*fh,0,W+.06,.14,D+.06,{ni:1});
      Q(g,BAND,0,Hh+.08,0,W+.2,.16,D+.2);[[0,D/2+.04,W+.2,.12],[0,-D/2-.04,W+.2,.12]].forEach(([x,z,w,d])=>Q(g,wm,x,Hh+.45,z,w,.6,d));[-1,1].forEach(s=>Q(g,wm,s*(W/2+.04),Hh+.45,0,.12,.6,D+.2));
      const fz=D/2+.01;
      if(o.shop){const sw=W*.78;Q(g,DARK,-W*.06,1.2,fz-.06,sw,2.3,.06,{ni:1});Q(g,SHUT,-W*.06,2.55,fz+.06,sw+.1,.45,.25);
        for(let k=0;k<3;k++)Q(g,lam('#8a6446'),-W*.06-sw/2+.6+k*(sw-1.2)/2,.9,fz-.5,.9,.06,.5,{ni:1});
        const a=pick(AWN);Q(g,a,0,2.95,fz+.75,W+.3,.08,1.6,{rx:.22});Q(g,a,0,2.72,fz+1.52,W+.3,.4,.04,{ni:1});
        for(let k=0;k<2+rand()*3;k++)Q(g,pick(CRATE),W/2-.6-(k%2)*.65,.17+Math.floor(k/2)*.34,fz+.3,.6,.32,.42);}
      else if(rand()<.5){const sw=Math.min(3,W*.55),sx=-W/2+sw/2+.35;Q(g,SHUT,sx,1.2,fz,sw,2.4,.08);Q(g,BAND,sx,2.48,fz+.05,sw+.2,.18,.18,{ni:1});
        Q(g,pick(DOORS),W/2-1.05,1.05,fz,.95,2.1,.08);win(g,W/2-1.05,2.55,fz,.8,.35,false);}
      else{const dx=rand()<.5?-W/4:W/4;Q(g,pick(DOORS),dx,1.05,fz,1.05,2.1,.08);Q(g,FR,dx,2.2,fz+.05,1.25,.12,.08,{ni:1});win(g,-dx,1.55,fz,1.4,1.05);
        Q(g,AWN[4],dx,2.55,fz+.55,1.6,.06,1.1,{rx:.18});}
      const bal=rand()<.55;
      for(let f=1;f<n;f++){const y=f*fh;
        if(bal&&f===1){Q(g,BAND,0,y+.07,fz+.5,W,.16,1.05);Q(g,wm,0,y+.6,fz+1,W,.9,.12);[-1,1].forEach(s=>Q(g,wm,s*(W/2-.06),y+.6,fz+.5,.12,.9,1.05));
          Q(g,FR,-W/4,y+1.1,fz,W*.42,1.9,.05,{ni:1});Q(g,winM,-W/4,y+1.1,fz+.02,W*.38,1.8,.05,{ni:1});win(g,W/4,y+1.45,fz,1.1,1);
          if(rand()<.6){Q(g,RAIL,0,y+2.05,fz+.75,W*.8,.04,.04,{ni:1});for(let k=0;k<4;k++)Q(g,lam(pick(['#f2efe8','#e0674b','#4f9ad8','#f2c14e','#7fb86a'])),-W*.3+k*W*.2,y+1.75,fz+.75,.42,.55,.03,{ni:1});}
          if(rand()<.6)pots(g,-W/2+.5,-W/2+1.4,fz+.75,2);}
        else{const nw=W>5.4?3:2;for(let k=0;k<nw;k++)win(g,-W/2+W*(k+.5)/nw,y+1.45,fz,nw===3?1:1.25,1.05);}
        if(rand()<.55){Q(g,AC,W/2-.7,y+.55,fz+.2,.75,.5,.32);Q(g,FR,W/2-.7,y+.55,fz+.37,.4,.4,.02,{ni:1});}}
      if(rand()<.6){const sg=new T.Group();sg.position.set(W/2+.01,0,rr(-D/4,D/4));sg.rotation.y=PI/2;g.add(sg);for(let f=0;f<n;f++)win(sg,0,f*fh+1.5,0,.9,.9,rand()<.5);}
      // roof: tin add-on, tank, laundry
      const r=rand();
      if(r<.55){const tw=W*rr(.5,.62),td=D*rr(.45,.6),tz=-D/2+td/2+.3,tm=pick(TINW);Q(g,tm,-W/2+tw/2+.2,Hh+1.1,tz,tw,2.2,td);
        Q(g,pick(ROOF),-W/2+tw/2+.2,Hh+2.35,tz,tw+.5,.08,td+.7,{rx:-.12});Q(g,pick(DOORS),-W/2+tw/2+.2,Hh+1,tz+td/2+.01,.85,1.9,.06);}
      else if(r<.8){Q(g,RAIL,0,Hh+1.6,0,W*.8,.04,.04,{ni:1});[-1,1].forEach(s=>Q(g,RAIL,s*W*.4,Hh+.8,0,.05,1.6,.05,{ni:1}));for(let k=0;k<4;k++)Q(g,lam(pick(['#f2efe8','#e0674b','#4f9ad8','#f2c14e'])),-W*.3+k*W*.2,Hh+1.3,0,.45,.6,.03,{ni:1});}
      if(rand()<.7)tank(g,W/2-.75,Hh+.15,r<.55?D/2-.9:-D/2+.8);
      if(rand()<.35)pots(g,-W/2+.4,W/2-.4,fz+.35,3);
      return Hh+2.6;},
    tin(g,W,D){const Hh=2.8,wm=pick(TINW),rm=pick(ROOF);Q(g,wm,0,Hh/2,0,W,Hh,D);gable(g,W,D,Hh,.6,rm,wm);const fz=D/2+.01,dx=rand()<.5?-W/4:W/4;
      Q(g,pick(DOORS),dx,1.05,fz,1,2.1,.06);win(g,-dx,1.55,fz,1.2,.95,rand()<.5);if(rand()<.5)win(g,W/2+.01,1.55,0,1,.9,false);
      if(rand()<.5)pots(g,dx+.8,dx+1.6,fz+.4,2);return Hh+1;},
    old(g,W,D){const Hh=3.1,wm=pick(FAC),rm=pick(ROOF);Q(g,wm,0,Hh/2,0,W,Hh,D);gable(g,W,D,Hh,rr(.8,1.1),rm,wm);const fz=D/2+.01,dx=pick([-1.2,1.2]);
      Q(g,pick(DOORS),dx,1.05,fz,1.1,2.1,.08);Q(g,rm,dx,2.55,fz+.5,1.8,.08,1.1,{rx:.15});win(g,-dx,1.65,fz,1.2,.95,rand()<.6);
      if(rand()<.5)pots(g,-dx-.8,-dx+.8,fz+.4,3);return Hh+1.2;},
    wood(g,W,D){const Hh=2.7,rm=pick(ROOF);Q(g,WOOD,0,Hh/2,0,W,Hh,D);gable(g,W,D,Hh,.7,rm,WOOD);const fz=D/2+.01;Q(g,M.doorWood,-W/4,1,fz,1,2,.06);win(g,W/4,1.5,fz,1.1,.85,false);
      Q(g,lam('#6e5040'),0,.25,fz+.7,W,.12,1.2);return Hh+1;},
    shed(g,W,D){const Hh=rr(2.8,3.4),rm=pick(ROOF);[[-W/2,-D/2],[W/2,-D/2],[-W/2,D/2],[W/2,D/2]].forEach(([a,b])=>Q(g,POST,a,Hh/2,b,.14,Hh,.14));
      Q(g,rm,0,Hh+.15,0,W+.6,.08,D+.6,{rx:-.1});Q(g,pick(TINW),0,1,-D/2+.05,W,2,.08);Q(g,lam('#9a958a'),0,.04,0,W,.08,D,{ni:1});
      if(rand()<.55)truck(g,rr(-.3,.3),.2,rand()<.5?0:PI);else for(let k=0;k<10;k++)Q(g,pick(CRATE),-W/2+.6+(k%4)*.68,.17+Math.floor(k/4)*.34,-D/2+.6+(k%3===2?.5:0),.6,.32,.42);
      return Hh+1;}};
   function o_scooter(g,x,z){const s=new T.Group();s.position.set(x,0,z);s.rotation.y=rr(-.4,.4);g.add(s);const c=pick([lam('#e0674b'),lam('#3b6ea5'),lam('#f2efe8'),lam('#4f8a5b')]);Q(s,c,0,.45,0,.35,.45,1.3);Q(s,DARK,0,.75,-.15,.3,.15,.6,{ni:1});Q(s,RAIL,0,.9,.55,.04,.8,.04,{ni:1});Q(s,RAIL,0,1.28,.55,.6,.05,.05,{ni:1});}
   // ---- placement
   const WSET=SQ_LANES.slice(0,-1);
   const inV=(x,z)=>{const e=Math.hypot((x+5)/56,(z+4)/47);return e<1||Math.hypot(x+8,z-150)<24||(e<1.3&&rand()<.45);};
   const laneOK=(x,z,pad)=>{for(const L of SQ_LANES){if(sqNear(x,z,L.p)[0]<L.w/2+pad)return false;}return sqNear(x,z,SQ_ROAD)[0]>4.2+pad;};
   const pts=(c)=>{const o=[];const ux=Math.cos(c.ry),uz=-Math.sin(c.ry),vx=Math.sin(c.ry),vz=Math.cos(c.ry);for(let i=-1;i<=1;i+=.5)for(let j=-1;j<=1;j+=.5)o.push([c.x+ux*c.W/2*i+vx*c.D/2*j,c.z+uz*c.W/2*i+vz*c.D/2*j]);return o;};
   const inside=(c,x,z,pad=0)=>{const dx=x-c.x,dz=z-c.z,ux=Math.cos(c.ry),uz=-Math.sin(c.ry),vx=Math.sin(c.ry),vz=Math.cos(c.ry);return Math.abs(dx*ux+dz*uz)<c.W/2+pad&&Math.abs(dx*vx+dz*vz)<c.D/2+pad;};
   const VC=COLS.filter(q=>q.x1>TB.x-230&&q.x0<TB.x+230&&q.y1-q.y0<60);const colHit=(x,z)=>{const X=TB.x+x;return VC.some(q=>X>q.x0-.3&&X<q.x1+.3&&z>q.z0-.3&&z<q.z1+.3&&q.y1-q.y0<60);};
   // keep NPC spots, dogs, arrival points & check-in flags free
   [[31.5,19.5],[-37,160.5],[-52,33],[-24.8,-12],[-25,-2],[12,-36],[0,24],[-12,-20],[30,12],[45,-44],[-45,30],[35,-20],[-16,-38],[20,-20],[-5,20]].forEach(([x,z])=>reserve(x,z,2.6));
   [[27,24],[-36,30],[-38,50],[-108,-38],[50,-45],[-29,157]].forEach(([x,z])=>reserve(x,z,3.5));SQW.forEach(s=>reserve(s.p[0],s.p[1],3));
   // every house must sit square to every lane near it (parallel or perpendicular, never at an odd angle)
   const SEGS=[];SQ_LANES.forEach(L=>{for(let i=0;i<L.p.length-1;i++){const a=L.p[i],b=L.p[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>.5)SEGS.push({a,b,w:L.w,dx:(b[0]-a[0])/l,dz:(b[1]-a[1])/l});}});
   const square=c=>{const ux=Math.cos(c.ry),uz=-Math.sin(c.ry);const P=pts(c);for(const s of SEGS){let dmin=1e9;for(const [x,z] of P)dmin=Math.min(dmin,sqSegD(x,z,s.a,s.b)[0]);if(dmin>s.w/2+1.3)continue;
       const d=Math.abs(ux*s.dx+uz*s.dz),ang=Math.acos(Math.min(1,d));if(Math.min(ang,PI/2-ang)>.12)return false;}return true;};
   const DB=TB.dbg={st:0,lane:0,lm:0,col:0,bld:0,ctr:0,steep:0,inv:0,sq:0};const fits=c=>{if(c.x>18&&c.x<82&&c.z>-62&&c.z<-38){DB.st++;return false;}const P=pts(c);let lo=1e9,hi=-1e9;
     for(const [x,z] of P){if(!laneOK(x,z,.35)){DB.lane++;return false;}if(LM.some(([a,b,r])=>Math.hypot(x-a,z-b)<r)){DB.lm++;return false;}if(colHit(x,z)){DB.col++;return false;}if(BLD.some(o=>inside(o,x,z,.15))){DB.bld++;return false;}const h=tribeH(x,z);lo=Math.min(lo,h);hi=Math.max(hi,h);}
     if(BLD.some(o=>inside(c,o.x,o.z))){DB.ctr++;return false;}if(hi-lo>3.2){DB.steep++;return false;}c.y=hi+.08;c.lo=lo;return true;};
   const TYPES=[['rc',.44],['tin',.17],['old',.11],['shed',.12],['wood',.06],['shop',.1]];
   const pickT=main=>{let r=rand()*(main?1:.9);for(const [k,w] of TYPES){if(k==='shop'&&!main)continue;r-=w;if(r<0)return k;}return 'rc';};
   const dims=t=>t==='rc'?[rr(4.8,6.4),rr(6,8)]:t==='shop'?[rr(5.2,6.6),rr(6.5,8)]:t==='shed'?[rr(4.6,6.4),rr(4.6,6)]:[rr(4.6,6),rr(4.6,5.8)];
   // houses stay square to the map (0° / 90°): facing snapped to the axis closest to the lane's normal, pushed back until clear of every lane
   const tryAt=(px,pz,tx,tz,s,lw,t,W,D,setb)=>{const nx=-tz*s,nz=tx*s;const ax=Math.abs(nx)>=Math.abs(nz)?[Math.sign(nx),0]:[0,Math.sign(nz)];const ry=Math.atan2(-ax[0],-ax[1]);
     const ext=(ax[0]?D:D)/2;for(let k=0;k<9;k++){const off=lw/2+setb+ext+k*.45;const c={t,W,D,x:px+nx*off,z:pz+nz*off,ry};if(!inV(c.x,c.z)){TB.dbg.inv++;return null;}
       if(!fits(c))continue;const fx=c.x-ax[0]*(D/2+.35),fz=c.z-ax[1]*(D/2+.35);c.dy=c.y-tribeH(fx,fz);c.steps=c.dy>.45?Math.ceil(c.dy/.25):0;const need=c.steps?c.steps*.3+.25:.7;
       if(c.steps>10)return null;let ok=true;for(const u of [-.4,0,.4]){const qx=c.x-ax[0]*(D/2+need)+ax[1]*u*W,qz=c.z-ax[1]*(D/2+need)+ax[0]*u*W;if(!laneOK(qx,qz,.1)){ok=false;break;}}if(!ok)continue;
       c.setb=need+.3;return c;}return null;};
   WSET.forEach((L,li)=>{const P=L.p,main=L.w>=3.8;let acc=0;const seg=[];for(let i=0;i<P.length-1;i++){const l=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);seg.push([acc,l,i]);acc+=l;}
     [-1,1].forEach(s=>{let d=1.5;while(d<acc-2){const t=pickT(main),[W,D]=dims(t);const at=d+W/2;const sg=seg.find(q=>at>=q[0]&&at<=q[0]+q[1])||seg[seg.length-1];const i=sg[2],u=(at-sg[0])/sg[1];
       const tx=(P[i+1][0]-P[i][0])/sg[1],tz=(P[i+1][1]-P[i][1])/sg[1];const px=P[i][0]+tx*sg[1]*u,pz=P[i][1]+tz*sg[1]*u;
       let c=tryAt(px,pz,tx,tz,s,L.w,t,W,D,rr(.7,1.5));if(!c){const t3=rand()<.5?'tin':'old';c=tryAt(px,pz,tx,tz,s,L.w,t3,rr(4.3,4.9),rr(4.2,4.8),.8);}if(c){BLD.push(c);d+=W+(rand()<.35?rr(0,.25):rr(.6,1.8));
         // a second house behind it, reached by a little side path (the village is dense)
         if(rand()<.7){const t2=pickT(false),[W2,D2]=dims(t2);const nx=-tz*s,nz=tx*s;const c2={t:t2,W:W2,D:D2,ry:c.ry,x:c.x+nx*(D/2+rr(1.2,2.4)+D2/2)+tx*rr(-1,1),z:c.z+nz*(D/2+rr(1.2,2.4)+D2/2)+tz*rr(-1,1)};
           if(inV(c2.x,c2.z)&&fits(c2)){c2.steps=0;c2.dy=0;BLD.push(c2);}}}
       else d+=1;}});});
   // build them
   const cols=c=>{const f=c.fr||0;addColO(TB.x+c.x+Math.sin(c.ry)*f/2,c.z+Math.cos(c.ry)*f/2,c.ry,c.W/2,(c.D+f)/2,c.y+c.top);};
   BLD.forEach(c=>{const g=new T.Group();g.position.set(c.x,c.y,c.z);g.rotation.y=c.ry;HG.add(g);
     c.top=BT[c.t==='shop'?'rc':c.t](g,c.W,c.D,{shop:c.t==='shop'});
     Q(g,M.concrete,0,-(c.y-c.lo+.6)/2+.04,0,c.W+.14,c.y-c.lo+.6,c.D+.14);   // plinth / retaining wall down to the slope
     if(c.steps){const n=c.steps,hs=c.dy/n,sw=Math.min(c.W-.3,3.2);for(let k=0;k<n;k++)Q(g,STEP,0,-c.dy+(n-k)*hs/2,c.D/2+.15+k*.3,sw,(n-k)*hs,.3);}
     if(c.t==='shop'){const nm=pick(['水果・蔬菜','雜貨','機車行','五金行','麵店','農資行','理髮','早餐']);const vx=Math.sin(c.ry),vz=Math.cos(c.ry);sign(c.x+vx*(c.D/2+.14),c.y+3.5,c.z+vz*(c.D/2+.14),c.ry,nm,Math.min(3.2,c.W*.6),pick(['#fffaf0','#c8432b','#2f5a8a','#3f7f5a']),'#3a2a20');}
     c.fr=c.steps?Math.min(c.setb,c.steps*.3+.15):.55;cols(c);reserve(c.x,c.z,Math.max(c.W,c.D)*.55);});
   // scooters & parked trucks along the lanes
   BLD.forEach(c=>{if(rand()>.22)return;const vx=Math.sin(c.ry),vz=Math.cos(c.ry),ux=Math.cos(c.ry),uz=-Math.sin(c.ry);const a=rr(-c.W/2+.6,c.W/2-.6),x=c.x+vx*(c.D/2+.75)+ux*a,z=c.z+vz*(c.D/2+.75)+uz*a;
     if(c.setb<1.1||colHit(x,z)||!laneOK(x,z,-.2))return;const g=new T.Group();g.position.set(x,tribeH(x,z),z);g.rotation.y=c.ry+PI/2;HG.add(g);o_scooter(g,0,0);addCol(TB.x+x-.7,TB.x+x+.7,z-.7,z+.7,tribeH(x,z)+1.3);});
   // ---- street lamps along every lane and 台7甲 (no rand(): the layout after this point stays the same)
   {const LP=[],C2=COLS.filter(q=>q.x1>TB.x-230&&q.x0<TB.x+230&&q.y1-q.y0<60);
    const hit=(x,z)=>{const X=TB.x+x;return C2.some(q=>X>q.x0-.35&&X<q.x1+.35&&z>q.z0-.35&&z<q.z1+.35);},near=(x,z,r)=>LP.some(p=>Math.hypot(p[0]-x,p[1]-z)<r);
    const lines=SQ_LANES.map((L,i)=>({w:L.w,p:L.p,step:16,side:i%2?1:-1})).concat([{w:8.4,p:SQ_ROAD,step:22,side:1}]);
    lines.forEach(L=>{let acc=L.step*.4;for(let i=0;i<L.p.length-1;i++){const [x0,z0]=L.p[i],[x1,z1]=L.p[i+1],dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz);if(len<.01)continue;
      const tx=dx/len,tz=dz/len,nx=-tz,nz=tx;let d=acc;
      for(;d<len;d+=L.step){for(const sd of [L.side,-L.side]){const off=L.w/2+.55,x=x0+tx*d+nx*sd*off,z=z0+tz*d+nz*sd*off;
          if(!laneOK(x,z,.1)||hit(x,z)||near(x,z,10))continue;if(Math.abs(tribeH(x+1,z)-tribeH(x-1,z))>1.6||Math.abs(tribeH(x,z+1)-tribeH(x,z-1))>1.6)continue;
          const y=tribeH(x,z),ax=-nx*sd,az=-nz*sd,g=new T.Group();g.position.set(x,y,z);g.rotation.y=Math.atan2(ax,az);HG.add(g);
          mk(cy(.15,.17,.3,8),M.concrete,0,.15,0,g);mk(cy(.065,.095,5.4,8),M.metal,0,2.7,0,g);mk(bx(.06,.06,1.6),M.metal,0,5.32,.75,g);
          mk(bx(.26,.11,.56),M.metalDark,0,5.28,1.5,g);mk(bx(.2,.04,.46),M.lampHead,0,5.21,1.5,g,false);
          addCol(TB.x+x-.2,TB.x+x+.2,z-.2,z+.2,y+6);LP.push([x,z,x+ax*1.5,y+5.1,z+az*1.5]);break;}}
      acc=d-len;}});
    TB.lamps=LP.length;TB.lampP=LP;
    // glow halos: one point cloud; light pools: one mesh that follows the slope
    {const pos=new Float32Array(LP.length*3);LP.forEach((p,i)=>{pos[i*3]=p[2];pos[i*3+1]=p[3];pos[i*3+2]=p[4];});
     const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.computeBoundingSphere();
     const m=new T.PointsMaterial({map:glowTex,color:col('#ffe2b0'),size:4.2,sizeAttenuation:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false});GLOWM.push({m,kind:'lamp',base:1});
     const pts=new T.Points(g,m);pts.frustumCulled=false;pts.renderOrder=2;G.add(pts);}
    {const N=8,R=4.8,V=(N+1)*(N+1),pos=new Float32Array(LP.length*V*3),uv=new Float32Array(LP.length*V*2),idx=[];
     LP.forEach((p,k)=>{const cx=p[2],cz=p[4],b=k*V;for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const u=i/N,v=j/N,x=cx+(u*2-1)*R,z=cz+(v*2-1)*R,o=b+j*(N+1)+i;
         pos[o*3]=x;pos[o*3+1]=tribeH(x,z)+.08;pos[o*3+2]=z;uv[o*2]=u;uv[o*2+1]=v;}
       for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=b+j*(N+1)+i;idx.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}});
     const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeBoundingSphere();
     const pm=new T.Mesh(g,poolMat('#ffdca6','lamp',1));pm.renderOrder=1;pm.userData.nomerge=true;G.add(pm);}}
   // ---- static batching: merge by material + area so the whole village is a few dozen draw calls
   sqBatch(G,HG);
   G.remove(HG);TB.nBld=BLD.length;TB.bld=BLD.map(c=>[c.t,Math.round(c.x),Math.round(c.z)]);}
  // farmland: terraced fruit orchards following the contour lines + scattered farm sheds (like the satellite view)
  {const N=900,tg=CROWN.lo.clone();tg.scale(.8,.72,.8);tg.translate(0,1.25,0);const TR=new T.InstancedMesh(tg,new T.MeshLambertMaterial({color:0xffffff}),N);
    const mm=new T.Matrix4(),q=new T.Quaternion(),sv=new T.Vector3(),pv=new T.Vector3();let n=0;const sheds=[];
    for(let x=-104;x<=146&&n<N;x+=2.6)for(let z=-118;z<=178&&n<N;z+=2.6){const px=x+rr(-.5,.5),pz=z+rr(-.5,.5);
      if(sqSD(px,pz)[0]>-9||Math.abs(px-sqRX(pz))<20)continue;if(Math.hypot((px+5)/50,(pz+4)/42)<1)continue;
      if(sqLaneD(px,pz)[0]<3.5||sqNear(px,pz,SQ_ROAD)[0]<7)continue;if(LM.some(([a,b,r])=>Math.hypot(px-a,pz-b)<r+2))continue;
      const h=sqBase(px,pz,1),fr=((h*.45)%1+1)%1;if(fr>.2)continue;const onSch=px>-94&&px<-73&&pz>9&&pz<51&&Math.abs(sqBase(px,pz)-h)>.01;
      if(rand()<.012&&sheds.length<26){sheds.push([px,pz]);continue;}
      const s=rr(.75,1.15);sv.set(s,s*rr(.8,1.1),s);if(onSch)sv.set(0,0,0);pv.set(px,h-.15,pz);q.setFromAxisAngle(T.Object3D.DefaultUp,rr(0,6.3));mm.compose(pv,q,sv);TR.setMatrixAt(n,mm);
      TR.setColorAt(n,tc.set(pick(['#5f8a4e','#6c9454','#56804a','#76995a'])).convertSRGBToLinear());n++;if(!onSch)addCol(TB.x+px-.35,TB.x+px+.35,pz-.35,pz+.35,h+2.5);}
    TR.count=n;TR.castShadow=false;TR.receiveShadow=true;G.add(TR);
    sqPaintTrees(TR,'orchard');if(SQPT.length)foliBuild(G,SQPT.splice(0));
    {const fb=CROWN.blob.clone();fb.scale(.8,.72,.8);fb.translate(0,1.25,0);G.add(instSplit(TR,fb,sqNearPlay));}
    const sm=[lam('#e9e6dc'),lam('#c9ccd0'),lam('#dfe6e8')],rf=[lam('#4f86bf'),lam('#b8452f'),lam('#8a8f94'),lam('#3f7f6a')];
    sheds.forEach(([x,z])=>{const w=rr(2.6,4),d=rr(2.2,3),y=Math.max(H(x-w/2,z-d/2),H(x+w/2,z+d/2),H(x-w/2,z+d/2),H(x+w/2,z-d/2));const g=new T.Group();g.position.set(x,y,z);g.rotation.y=(rr(0,1)<.5?0:PI/2);G.add(g);
      mk(bx(w,2,d),pick(sm),0,1,0,g);mk(bx(w+.1,2.5,d+.1),M.concrete,0,-1.25,0,g);const r=mk(bx(w+.5,.1,d+.6),pick(rf),0,2.15,0,g);r.rotation.x=.12;if(x>-94&&x<-73&&z>9&&z<51){g.visible=false;return;}addCol(TB.x+x-w/2-.2,TB.x+x+w/2+.2,z-d/2-.2,z+d/2+.2,y+3);});}
  // ---- 動物之家・野生動物救傷站
  {const Y=AC.y,V=(x,z,dy=0)=>new T.Vector3(TB.x+x,Y+dy,TB.z+z);
    const dirt=lam('#c2a77c',{}),grass=lam('#7fa95a',{}),grass2=lam('#6e9a4e',{});surfSet(dirt,'soil',1,null,.9,{chroma:.3});surfSet(grass,'grass',1,null,.8,{chroma:.3});surfSet(grass2,'grass',1,null,.8,{chroma:.3});const wood=M.woodDark,woodL=lam('#a77b4f'),wire=lam('#8d9590'),rock=lam('#9a958c'),log=lam('#7a5a3c');
    mk(bx(AC.x1-AC.x0,.16,AC.z1-AC.z0),dirt,(AC.x0+AC.x1)/2,Y-.06,(AC.z0+AC.z1)/2,G);
    mk(bx(11.6,.18,9.2),grass,92,Y-.04,-40.7,G);mk(bx(11.6,.18,9.2),grass2,104,Y-.04,-40.7,G);mk(bx(16.6,.18,10.2),grass,101.5,Y-.04,-54.8,G);
    // a short path from the end of 同學巷 up to the gate
    {const a=[77,-46],b=[86.4,-46.6],ya=H(a[0],a[1]),yb=Y,l=Math.hypot(b[0]-a[0],ya-yb);const pth=mk(bx(l+.4,.14,3.4),M.concrete||lam('#cfcac0'),(a[0]+b[0])/2,(ya+yb)/2+.02,(a[1]+b[1])/2,G);pth.rotation.z=Math.atan2(yb-ya,b[0]-a[0]);pth.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0])*.0;}
    // fences: wooden rail fence (yard) and tall wire fence (enclosures); every run also blocks the player
    const fence=(ax,az,bx_,bz,h,kind)=>{const dx=bx_-ax,dz=bz-az,l=Math.hypot(dx,dz),n=Math.max(1,Math.round(l/(kind==='wire'?2.4:2))),ry=Math.atan2(-dz,dx);
      for(let i=0;i<=n;i++){const t=i/n;mk(bx(.14,h,.14),kind==='wire'?wire:wood,ax+dx*t,Y+h/2,az+dz*t,G);}
      const mid=(r,y,th)=>{const m=mk(bx(l,th,.07),kind==='wire'?wire:woodL,ax+dx/2,Y+y,az+dz/2,G);m.rotation.y=ry;return m;};
      if(kind==='wire'){mid(0,h-.04,.08);mid(0,.12,.08);const pl=new T.Mesh(new T.PlaneGeometry(l,h-.2),AC.mesh);pl.position.set(ax+dx/2,Y+h/2,az+dz/2);pl.rotation.y=ry;pl.userData.noInk=true;G.add(pl);}
      else{mid(0,h*.45,.1);mid(0,h*.85,.1);}
      addCol(TB.x+Math.min(ax,bx_)-.45,TB.x+Math.max(ax,bx_)+.45,Math.min(az,bz)-.45,Math.max(az,bz)+.45,Y+Math.max(h,2.6));COLS[COLS.length-1].nc=1;};
    {const [c,g]=C2(128,128);g.clearRect(0,0,128,128);g.strokeStyle='rgba(70,78,74,.75)';g.lineWidth=2;for(let i=-128;i<256;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+128,128);g.stroke();g.beginPath();g.moveTo(i,128);g.lineTo(i+128,0);g.stroke();}
      const t=TX(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1,1);AC.mesh=new T.MeshBasicMaterial({map:t,transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false});
      AC.mesh.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_UV\nvUv=vUv*vec2(6.,2.);\n#endif');};}
    fence(86,-60,101,-60,1.1,'wood');fence(110,-49.5,110,-45.5,1.1,'wood');fence(86,-60,86,-48.6,1.1,'wood');
    fence(93,-60,93,-49.5,1.0,'wood');fence(93,-49.5,101,-49.5,1.0,'wood');
    fence(101,-60,101,-49.5,3,'wire');fence(101,-49.5,110,-49.5,3,'wire');fence(101,-60,110,-60,3,'wire');fence(110,-60,110,-56,3,'wire');fence(110,-54,110,-49.5,3,'wire');
    fence(86,-45.5,98,-45.5,2.2,'wire');fence(86,-45.5,86,-36,2.2,'wire');fence(86,-36,91,-36,2.2,'wire');fence(93,-36,98,-36,2.2,'wire');
    fence(98,-45.5,110,-45.5,3,'wire');fence(98,-45.5,98,-36,3,'wire');fence(110,-45.5,110,-36,3,'wire');fence(98,-36,110,-36,3,'wire');
    // the leopard cat's release gate (south side, towards the hills): hinged at x=91
    {const gg=new T.Group();gg.position.set(TB.x+91,Y,TB.z-36);scene.add(gg);gg.userData.dyn=true;const pnl=new T.Mesh(new T.PlaneGeometry(2,2),AC.mesh);pnl.position.set(1,1.05,0);gg.add(pnl);
      mk(bx(2,.08,.08),wire,1,2.1,0,gg);mk(bx(2,.08,.08),wire,1,.1,0,gg);mk(bx(.08,2.1,.08),wire,2,1.05,0,gg);AC.gate=gg;addCol(TB.x+91,TB.x+93,-36.45,-35.55,Y+2.6);COLS[COLS.length-1].nc=1;}
    // the bear's release gate (east side, towards the forest): hinged at z=-56
    {const gg=new T.Group();gg.position.set(TB.x+110,Y,TB.z-56);scene.add(gg);gg.userData.dyn=true;gg.rotation.y=-PI/2;const pnl=new T.Mesh(new T.PlaneGeometry(2,2.8),AC.mesh);pnl.position.set(1,1.45,0);gg.add(pnl);
      mk(bx(2,.08,.08),wire,1,2.9,0,gg);mk(bx(2,.08,.08),wire,1,.1,0,gg);mk(bx(.08,2.9,.08),wire,2,1.45,0,gg);AC.gate2=gg;addCol(TB.x+109.55,TB.x+110.45,-56,-54,Y+3);COLS[COLS.length-1].nc=1;}
    // shelter cabin with the station sign
    {const g=new T.Group();g.position.set(TB.x+89.2,Y,TB.z-57);scene.add(g);g.userData.dyn=true;
      mk(bx(5.2,2.7,4.6),lam('#efe6d4'),0,1.35,0,g);const r1=mk(bx(5.8,.12,2.7),lam('#3f7f6a'),0,3.05,-1.1,g);r1.rotation.x=.42;const r2=mk(bx(5.8,.12,2.7),lam('#3f7f6a'),0,3.05,1.1,g);r2.rotation.x=-.42;
      mk(bx(1.1,2,.08),lam('#7a5a3c'),0,1,2.32,g);mk(bx(1,.8,.06),lam('#bfe0ef'),-1.6,1.6,2.32,g);mk(bx(1,.8,.06),lam('#bfe0ef'),1.6,1.6,2.32,g);
      addCol(TB.x+86.5,TB.x+91.9,-59.4,-54.6,Y+3.4);}
    sign(89.2,Y+2.95,-54.62,0,'野生動物救傷站',3.2,'#3f7f6a','#fff');
    post(85.6,-49.2,2.2);sign(85.52,Y+2.3,-49.2,-PI/2,'🐾 Sqoyaw 動物之家',2.4,'#e0674b','#fff');
    sign(97,Y+1.45,-49.42,0,'等待新家的狗狗',2.2,'#6e4c33','#ffe6b8');sign(105.5,Y+2.6,-49.42,0,'台灣黑熊（受傷救援中）',2.4,'#2f2a35','#f3e6c8');
    sign(92,Y+2.45,-45.58,PI,'石虎（受傷救援中）',2.2,'#6e4c33','#ffe6b8');sign(104,Y+3.25,-45.58,PI,'黑豹（保育安置）',2.2,'#2f2a35','#f3e6c8');
    // enclosure furniture: rocks, a log and shelter boxes; the dogs get kennels and a water bowl
    [[89,-39,.6],[96.5,-43.6,.5],[101,-38.4,.8],[108.6,-43.8,.7]].forEach(([x,z,r])=>{const m=mk(ico(r,0),rock,x,Y+r*.45,z,G);m.scale.y=.6;});
    {const l1=mk(cy(.25,.28,3.2,8),log,94.5,Y+.25,-39,G);l1.rotation.z=PI/2;l1.rotation.y=.4;const l2=mk(cy(.3,.34,4,8),log,105,Y+.9,-40.5,G);l2.rotation.z=PI/2+.35;}
    mk(bx(1.8,.9,1.2),woodL,88.2,Y+.45,-44.4,G);mk(bx(1.9,.08,1.4),log,88.2,Y+.94,-44.4,G);
    mk(bx(3,.16,2),woodL,108.2,Y+1.3,-37.4,G);[[107,-36.7],[109.4,-36.7],[107,-38.1],[109.4,-38.1]].forEach(([x,z])=>mk(cy(.08,.08,1.3,6),log,x,Y+.65,z,G));
    [[95,-58.6],[98.6,-58.6]].forEach(([x,z])=>{mk(bx(1.6,1.1,1.3),lam('#c9874f'),x,Y+.55,z,G);const rf=mk(bx(1.8,.1,1.5),lam('#b8452f'),x,Y+1.18,z,G);mk(bx(.6,.6,.04),lam('#3a2a20'),x,Y+.4,z+.66,G);});
    mk(cy(.3,.24,.12,12),lam('#4f86bf'),99.6,Y+.06,-51,G);
    // bear yard: a pool, a climbing platform, a hollow log and rocks
    mk(cy(1.5,1.5,.1,20),lam('#5c95b8'),107.6,Y+.03,-57.4,G);mk(bx(2.6,.16,2),woodL,103.4,Y+1.1,-58.4,G);[[102.3,-57.6],[104.5,-57.6],[102.3,-59.2],[104.5,-59.2]].forEach(([x,z])=>mk(cy(.1,.1,1.1,6),log,x,Y+.55,z,G));
    {const l3=mk(cy(.45,.5,2.6,10),log,106.6,Y+.45,-51.6,G);l3.rotation.z=PI/2;}[[103,-52],[109,-53.4]].forEach(([x,z])=>{const m=mk(ico(.6,0),rock,x,Y+.27,z,G);m.scale.y=.6;});
    // staff
    if(SPRITES.res10){const o={g:new T.Group()};scene.add(o.g);npcSprite('res10',o,V(89.6,-52.6),0,SPRITES.res10.h||1.95);addCol(TB.x+89.2,TB.x+90,-53,-52.2,Y+1.8);
      inter(V(89.6,-51.2),1.9,'和保育員小岑說話',()=>acMenu());}
    inter(V(92,-46.5),1.8,'照顧石虎',()=>acCare('lc'));inter(V(104,-46.5),1.8,'照顧黑豹',()=>acCare('bl'));inter(V(97,-48.4),1.9,'看看等待新家的狗狗',()=>acAdopt());inter(V(105.5,-48.4),1.8,'照顧台灣黑熊',()=>acCare('bb'));
    // the animals (drawn sprites): wander inside their own yard
    const ani=(k,id,h,b,idle)=>{if(!SPRITES[id])return null;const o={k,g:new T.Group(),mv:false,ph:rand()*6,b,idle,st:'idle',t:rr(1,4),slow:true};o.g.position.set(TB.x+rr(b[0],b[1]),Y,TB.z+rr(b[2],b[3]));scene.add(o.g);aniSprite(o,id,h);AC.objs.push(o);AC[k]=o;return o;};
    ani('lc','ani_leopardcat',.5,[87.2,96.8,-44.6,-37],['groom','sniff','alert','lie','sleep','stretch',null]);
    ani('bl','ani_blackleopard',1.05,[99.4,108.8,-44.4,-37.2],['groom','yawn','lie','sleep','alert',null]);
    ani('dog','ani_shepherd',.8,[94,100.2,-58,-50.6],['wag','lie','sniff','alert','sleep',null]);
    ani('dog_m','ani_maltese',.42,[94,100.2,-58,-50.6],['wag','lie','sniff','alert','sleep',null]);
    ani('dog_p','ani_poodle',.45,[94,100.2,-58,-50.6],['wag','lie','sniff','alert','sleep',null]);
    ani('bb','ani_blackbear',.85,[102,109,-59,-50.6],['dig','sniff','eat','lie','sleep','stand_up','alert',null]);
    acRefresh();}
  // own-house marker
  {const [c,g]=C2(256,96);g.fillStyle='rgba(255,247,226,.95)';rrect(g,6,8,244,80,40);g.fill();g.strokeStyle='#e0674b';g.lineWidth=6;rrect(g,6,8,244,80,40);g.stroke();g.fillStyle='#3a2a20';g.font=`800 44px ${FG}`;g.textAlign='center';g.textBaseline='middle';g.fillText('🏠 你的家',128,50);
    const s=new T.Sprite(new T.SpriteMaterial({map:TX(c),depthTest:false,transparent:true}));s.scale.set(3.2,1.2,1);s.renderOrder=9;s.visible=false;scene.add(s);TB.mark=s;}
  TB.spots={bus:[27,24,-PI*.8],station:[27,24,-PI*.8],school:[-54,25,-PI/2],orchard:[-38,50,PI],bridge:[-108,-38,-PI*.75],houses:[50,-45,PI],shop:[-29,157,0],animals:[83,-46,PI/2]};
  try{scene.updateMatrixWorld(true);inkTown(G);}catch(e){console.error(e);}})();
// ================================================================
// Sqoyaw 動物之家・野生動物救傷站: adopt a dog (after a short "are you ready" quiz),
// care for a rescued leopard cat until it is released, and for a black leopard that can never go back to the wild.
// Every care visit is one question about the real animal; the answer's explanation becomes a card in the 圖鑑.
// ================================================================
const AC_CARE={
  lc:{name:'石虎',who:'受傷的石虎「小斑」',need:5,intro:'小斑是在台中山區的馬路邊被發現的，腳受了傷。救傷站要把牠照顧好，再送回山林。',
    facts:['台灣的石虎是野生的貓科動物，跟家貓差不多大。','現在比較穩定的族群在苗栗、臺中、南投、彰化的淺山。','石虎是第一級瀕臨絕種保育類野生動物，不能飼養。'],
    tasks:[
      {id:'id',title:'認出石虎',intro:'新送來的這隻，真的是石虎嗎？我們先確認一下。',q:'下面哪一個是石虎的特徵？',o:['額頭有兩條白線、耳朵背後有白斑','身上是一條一條的虎斑條紋','尾巴短短的、捲起來','耳朵尖尖的、完全沒有花紋'],e:'石虎身上是斑點，不是條紋。額頭的兩條白線、耳背黑底中間的白斑，是最好認的特徵。'},
      {id:'food',title:'準備食物',intro:'今天要幫小斑準備晚餐。',q:'救傷站給石虎吃什麼，最接近牠在野外吃的東西？',o:['老鼠、小鳥這類小動物','貓飼料加牛奶','香蕉和蘋果','人吃剩的便當'],e:'石虎是肉食動物，野外主要吃鼠類、鳥類等小動物。在救傷站就練習吃自然的食物，回到山上才活得下去。'},
      {id:'wild',title:'不要讓牠習慣人',intro:'小斑看起來好可愛，好想摸摸牠……',q:'照顧要野放的石虎，為什麼要盡量不跟牠玩、不讓牠習慣人？',o:['回到野外如果不怕人，容易靠近人家和馬路而發生危險','因為石虎不喜歡被稱讚','因為要處罰牠','其實沒有原因'],e:'野生動物怕人是保護自己的本能。保育員會盡量少說話、少接觸，讓牠保持野性。'},
      {id:'road',title:'牠怎麼受傷的',intro:'小斑是在馬路邊被撿到的。',q:'石虎在野外最常遇到的危險之一是什麼？',o:['晚上過馬路被車撞（路殺）','被海浪捲走','冬天下大雪凍傷','被蚊子叮'],e:'路殺是石虎死亡的重要原因之一。在「石虎出沒」的路段，車子要放慢速度。'},
      {id:'poison',title:'田裡的毒',intro:'獸醫說，有些石虎是因為吃到有毒的老鼠才生病的。',q:'農田裡用毒鼠藥，為什麼也會傷害石虎？',o:['石虎吃了中毒的老鼠，自己也會中毒','毒鼠藥的味道會讓石虎迷路','不會傷害石虎','毒鼠藥會讓石虎長太胖'],e:'毒會跟著食物鏈傳下去。不用毒藥的友善耕作（像是「石虎米」），對石虎和土地都好。'},
      {id:'hen',title:'雞舍的問題',intro:'山下的阿伯說，石虎會偷吃他的雞。',q:'怎麼做，才能讓雞和石虎都安全？',o:['把雞舍用網子圍好，晚上把雞關好','在雞舍旁邊放捕獸夾','在雞舍旁邊放毒藥','把看到的石虎趕走就好'],e:'雞舍圍好，石虎吃不到雞，也就不會因為偷吃雞被抓、被毒。'},
      {id:'home',title:'石虎住在哪',intro:'野放之前，要先想好送牠回哪裡。',q:'現在台灣哪裡還有比較穩定的石虎族群？',o:['苗栗、臺中、南投、彰化的淺山','台北市的市中心','玉山山頂','澎湖'],e:'石虎住在低海拔的淺山，也就是靠近農田和村落的丘陵。所以人怎麼種田、怎麼開車，都會影響牠。'},
      {id:'law',title:'可以帶回家嗎',intro:'有同學問：小斑好了以後，可以帶回家養嗎？',q:'石虎可以抓回家當寵物嗎？',o:['不行，牠是第一級瀕臨絕種保育類野生動物','可以，跟家貓一樣','只要買夠大的籠子就可以','小時候可以養'],e:'石虎是保育類野生動物，不能飼養、買賣。牠屬於山林，健康了就要回家。'}]},
  bl:{name:'黑豹',who:'黑豹「墨影」',need:5,intro:'墨影是從非法走私的貨櫃裡救出來的。牠從小被人關著養，沒有學會野外生活，會一直住在保育中心。',
    facts:['黑豹不是一種獨立的動物，是毛色變黑的花豹或美洲豹。','台灣沒有野生的花豹；台灣原本有雲豹，2013 年被宣布在台灣滅絕。'],
    tasks:[
      {id:'what',title:'黑豹是什麼',intro:'先來認識墨影。',q:'黑豹其實是什麼動物？',o:['毛色變黑的花豹或美洲豹','一種只在晚上出現的豹','塗了黑色顏料的老虎','一種很大的黑貓'],e:'黑色的毛是天生的毛色變化。牠們跟一般花豹、美洲豹是同一種動物。'},
      {id:'spots',title:'看看斑點',intro:'太陽出來了，墨影在木台上曬太陽。',q:'在陽光下仔細看黑豹的毛，會看到什麼？',o:['隱約的梅花形斑點','白色的條紋','彩色的亮片','什麼都沒有'],e:'黑豹身上的梅花斑還在，只是被黑色的毛蓋住，光線好的時候就看得到。'},
      {id:'enrich',title:'藏食物',intro:'保育員把肉藏在木頭縫和紙箱裡，讓墨影自己找。',q:'為什麼要這樣做？',o:['讓牠動腦找食物、多活動，比較不無聊','想要捉弄牠','因為保育中心沒有碗','讓牠吃不到'],e:'這叫「行為豐富化」。圈養的動物也需要像在野外一樣找食物、爬高、探索。'},
      {id:'safe',title:'安全打掃',intro:'今天要打掃墨影的家。',q:'保育員進黑豹的區域打掃，要怎麼做？',o:['先讓黑豹到另一區、把門關好才進去','直接進去摸摸牠','帶食物進去餵牠','越多人一起進去越好'],e:'黑豹是大型猛獸，再親近也不能跟牠待在同一個空間。安全的照顧方式，是人和動物分開。'},
      {id:'smuggle',title:'走私的傷害',intro:'墨影是從走私的貨櫃裡救出來的。',q:'為什麼不能買賣、飼養大型野生貓科動物？',o:['買賣會讓更多動物被抓離野外，而且飼養很危險','因為牠們太便宜','因為牠們不會叫','其實可以'],e:'有人買，就有人去野外抓。不買、不養、不轉賣，是保護牠們最直接的方法。'},
      {id:'home',title:'為什麼不能野放',intro:'有同學問：墨影可以像小斑一樣回到山上嗎？',q:'墨影為什麼不能送到野外？',o:['牠從小被人養、沒學會打獵，而且台灣本來就沒有野生花豹','因為牠太黑了','因為牠不喜歡下雨','野放要收很多錢'],e:'野放的動物要會自己找食物、躲避危險，還要放回牠原本的家。墨影兩個都做不到，所以由保育中心照顧牠一輩子。'},
      {id:'clouded',title:'台灣的雲豹',intro:'墨影讓保育員想起台灣的雲豹。',q:'台灣原本的雲豹後來怎麼了？',o:['2013 年被宣布在台灣已經滅絕','數量越來越多','搬到國外去住了','變成了黑豹'],e:'棲地被破壞和被獵捕，讓雲豹在台灣消失。我們保護石虎、黑熊，就是不想讓牠們變成下一個雲豹。'}]}};
AC_CARE.bb={name:'台灣黑熊',who:'受傷的小黑熊「小月」',need:5,intro:'小月是在山上被發現的小黑熊，前腳被陷阱夾傷了。救傷站要幫牠把傷養好、學會自己找食物，再送回山林。',
  facts:['台灣黑熊是台灣唯一的原生熊，胸前有白色或淡黃色的 V 字形斑紋。','牠是第一級瀕臨絕種保育類野生動物，野外估計只剩幾百隻。','黑熊吃果實、嫩葉、昆蟲，也會把種子帶到森林各地，是山林的好幫手。'],
  tasks:[
    {id:'id',title:'認出台灣黑熊',intro:'先來好好認識小月。',q:'台灣黑熊最明顯的特徵是什麼？',o:['胸前有白色或淡黃色的 V 字形斑紋','全身白色、眼睛周圍黑黑的','尾巴很長、有一圈一圈的環紋','頭上有一對角'],e:'胸前的 V 字像一彎月亮，是台灣黑熊最好認的地方，每隻的形狀都有一點不一樣。'},
    {id:'food',title:'準備食物',intro:'今天要幫小月準備食物。',q:'台灣黑熊秋天最愛吃什麼，吃了會長胖、準備過冬？',o:['青剛櫟的果實（橡實）','炸雞和薯條','人類丟的垃圾','只吃魚'],e:'台灣黑熊是雜食動物。秋天青剛櫟結果時，黑熊會爬上樹大吃，把身體養胖。'},
    {id:'trap',title:'牠怎麼受傷的',intro:'小月的前腳，是被山上的陷阱夾傷的。',q:'為什麼山上的陷阱對黑熊很危險？',o:['陷阱分不出是哪種動物，黑熊踩到會被夾傷、甚至失去腳掌','陷阱會讓黑熊變胖','陷阱只會發出聲音','陷阱對黑熊沒有影響'],e:'捉山豬、山羌的套索和獸夾，常常誤傷黑熊。不放陷阱、看到時通報，就能救牠們。'},
    {id:'wild',title:'不要讓牠習慣人',intro:'小月好可愛，好想餵牠吃東西……',q:'照顧要野放的小熊，為什麼保育員要躲起來餵食、不跟牠玩？',o:['牠如果習慣人、跟人要食物，回到山上會靠近村子而發生危險','因為小熊不喜歡人','因為要處罰牠','其實沒有原因'],e:'習慣人的熊會跑到村子、果園找食物，容易和人發生衝突。讓牠怕人，是在保護牠。'},
    {id:'meet',title:'在山上遇到黑熊',intro:'環山的大人上山工作，偶爾會聽說有黑熊。',q:'爬山時如果遠遠看到黑熊，應該怎麼做？',o:['保持冷靜，不要跑，慢慢往後退離開','跑過去拍照','丟食物給牠吃','轉身拚命跑'],e:'大部分黑熊會避開人。保持距離、慢慢離開；走山路時出聲或掛鈴鐺，讓熊知道有人來。'},
    {id:'trash',title:'垃圾帶下山',intro:'露營的人留下了一包垃圾。',q:'去山上露營，為什麼一定要把食物和垃圾帶下山？',o:['食物的味道會吸引黑熊，讓牠習慣到人的地方找東西吃','因為垃圾太重','因為垃圾很漂亮','不帶下山也沒關係'],e:'黑熊鼻子很靈。吃過人類食物的熊會一直回來找，最後可能被當成危險的熊。'},
    {id:'home',title:'黑熊住在哪',intro:'野放前，要先想好送小月回哪裡。',q:'台灣黑熊住在哪裡？',o:['台灣中高海拔的山區森林，像雪霸、玉山國家公園','台北的公園','海邊的沙灘','只住在動物園'],e:'台灣黑熊住在山區森林。環山附近的雪霸國家公園，也有台灣黑熊的紀錄。'},
    {id:'collar',title:'野放的頸圈',intro:'野放那天，小月會戴上一個特別的頸圈。',q:'野放黑熊時，為什麼常幫牠戴上衛星追蹤頸圈？',o:['追蹤牠回到山上後去了哪裡、過得好不好','讓牠看起來比較漂亮','讓牠不能動','讓別人可以把牠帶回家'],e:'頸圈會回傳位置，保育員就知道牠有沒有適應野外。2018 年在花蓮南安被救起的小黑熊，就是戴著頸圈回到山林的。'}]};
const AC_DOGS=[{coat:'shepherd',name:'狼犬',desc:'大型犬，精力充沛',def:'阿福'},{coat:'maltese',name:'馬爾濟斯',desc:'小型犬，白色長毛',def:'雪球'},{coat:'poodle',name:'貴賓狗',desc:'小型犬，咖啡色捲毛',def:'可可'}];
const DOG_H={shepherd:.8,maltese:.42,poodle:.45,hudie:.42};
const AC_ADOPT=[
  {q:'在台灣養狗，依法要先做什麼？',o:['寵物登記，植入晶片','幫牠剪毛','買很多玩具','什麼都不用做'],e:'寵物登記、植入晶片是法律規定的。狗狗走失時，靠晶片才找得回家。'},
  {q:'狗狗每天需要什麼？',o:['散步、運動，還有陪伴和訓練','一直關在籠子裡','一個禮拜出門一次就好','只要有飯吃就好'],e:'狗狗需要每天出門散步、動一動，也需要主人陪。大型犬像狼犬，需要的運動量更大。'},
  {q:'如果以後不想養了，可以怎麼做？',o:['一開始就想清楚，養了就照顧牠一輩子','帶到山上放生','放在路邊讓別人撿','送到河邊'],e:'棄養是違法的，也會讓狗狗流浪受苦。養之前想清楚，是對牠最大的負責。'},
  {q:'為什麼很多人會幫狗狗結紮？',o:['減少意外生小狗、讓流浪狗變少','讓狗狗長得更快','讓狗狗變聰明','讓狗狗不用吃飯'],e:'結紮可以減少意外懷孕，流浪狗就不會越生越多。'}];

// ---- close-up: while you talk about an animal, it walks up to the fence in front of you and a large drawn card of it sits above the dialog
const AC_VIEW={lc:{sid:'ani_leopardcat',name:'石虎・小斑',seq:['front_sit','groom','alert','front_sit','sniff','eat'],at:[92,-44.6],bg:['#cfe3b4','#8fbf6a']},
  bl:{sid:'ani_blackleopard',name:'黑豹・墨影',seq:['front_sit','yawn','groom','front_sit','alert','lie'],at:[104,-44.4],bg:['#d9d2bf','#8b9a6a']},
  dog:{sid:'ani_shepherd',name:'狼犬（等待新家）',seq:['front_sit','wag_A','wag_B','wag_A','paw','alert'],at:[97,-50.4],bg:['#f1e2bf','#c9a76a']},
  bb:{sid:'ani_blackbear',name:'台灣黑熊・小月',seq:['front_sit','alert','stand_up','front_sit','sniff','eat'],at:[105.5,-50.6],bg:['#d8e6c4','#7f9f62']}};
function acView(k,name){const V=AC_VIEW[k];if(!V||!SPRITES[V.sid])return;AC.view={k,sid:V.sid,name:name||V.name,t:0,i:0,img:null};
  loadImg(SPRITES[V.sid].src).then(im=>{if(AC.view&&AC.view.sid===V.sid)AC.view.img=im;}).catch(()=>{});
  const D=$('dialog');let av=D.querySelector('.ac-view');if(!av){av=document.createElement('div');av.className='ac-view';av.innerHTML='<canvas width="420" height="330"></canvas><b></b>';D.appendChild(av);}
  av.querySelector('b').textContent=AC.view.name;av.hidden=false;
  const o=AC[k];if(o&&!o.cine&&o.g.visible){o.st='walk';o.mv=true;o.anim=null;o.tx=V.at[0];o.tz=V.at[1];o.spd=k==='bl'?1.2:1.1;o.t=12;o.come=1;}}
function acViewTick(dt){const v=AC.view;if(!v)return;if(!DLG.open){AC.view=null;return;}v.t+=dt;const V=AC_VIEW[v.k];if(v.t>1.5){v.t=0;v.i=(v.i+1)%V.seq.length;}
  const av=$('dialog').querySelector('.ac-view');if(!av||av.hidden||!v.img)return;const cv=av.querySelector('canvas'),g=cv.getContext('2d'),M=SPRITES[v.sid];
  const gr=g.createLinearGradient(0,0,0,330);gr.addColorStop(0,V.bg[0]);gr.addColorStop(1,V.bg[1]);g.fillStyle=gr;g.fillRect(0,0,420,330);
  g.fillStyle='rgba(0,0,0,.16)';g.beginPath();g.ellipse(210,300,120,18,0,0,7);g.fill();
  const key=V.seq[v.i],f=M.act&&M.act[key]!=null?M.act[key]:0,[sx,sy]=fxy(M,f),s=Math.min(1.85,240/(M.hpx||150)),br=1+Math.sin(performance.now()/500)*.008;
  g.save();g.translate(210,314);g.scale(1,br);g.drawImage(v.img,sx,sy,M.cw,M.ch,-M.cw*s/2,-M.ch*s+ (M.foot||4)*s,M.cw*s,M.ch*s);g.restore();}

function acW(){W.wild=W.wild||{};['lc','bl','bb'].forEach(k=>{const w=W.wild[k]=W.wild[k]||{};w.n=+w.n||0;w.done=Array.isArray(w.done)?w.done:[];w.last=w.last||'';w.rel=+w.rel||0;});return W.wild;}
function acMenu(){choose('保育員 小岑','歡迎來到 Sqoyaw 動物之家！這裡有等待新家的狗狗，也有受傷、被救回來的保育動物。今天想做什麼？',[
  {label:'🐕 領養狗狗',fn:()=>acAdopt()},{label:'🐾 照顧石虎',fn:()=>acCare('lc')},{label:'🐻 照顧台灣黑熊',fn:()=>acCare('bb')},{label:'🐾 照顧黑豹',fn:()=>acCare('bl')},{label:'📖 保育動物圖鑑',fn:()=>acBook()},{label:'先不用，謝謝',fn:()=>{}}]);}
function acCare(k){if(!W.seat)return;const C=AC_CARE[k],w=acW()[k];acView(k);
  if(!w.met){w.met=1;save();say('保育員 小岑',[C.intro,'每天來幫忙一次，回答對一題，就算完成今天的照顧工作。'],{noWave:1,onEnd:()=>acCare(k)});return;}
  if(w.last===todayStr()&&!TS()){say(C.name,[`今天已經幫${C.who}做完照顧工作了。`,'動物也需要安靜休息，明天再來吧！'],{noWave:1});return;}
  const left=C.tasks.filter(t=>!w.done.includes(t.id)),pool=left.length?left:C.tasks,t=pool[Math.floor(rand()*pool.length)];
  say(`照顧${C.name}：${t.title}`,[t.intro],{noWave:1,onEnd:()=>acQuiz(k,t)});}
function acQuiz(k,t){const C=AC_CARE[k],w=acW()[k];const opts=shuffle(t.o.map((s,i)=>({s,ok:i===0})));
  choose(`照顧${C.name}`,t.q,opts.map(o=>({label:o.s,fn:()=>{
    if(o.ok){w.n++;w.last=todayStr();if(!w.done.includes(t.id))w.done.push(t.id);W.coins+=10;led(10,`照顧${C.name}`,'獎勵');histAdd('adv',`保育：照顧${C.name}（${t.title}）`);renderPouch();save();SND.pick&&SND.pick();
      const o_=AC[k];if(o_&&!o_.cine){o_.st='idle';o_.mv=false;o_.anim={type:k==='bl'?'groom':'eat',t:0,dur:3};o_.t=3;}
      say('答對了！',[t.e,`照顧進度 ${Math.min(w.n,C.need)}/${C.need}，得到 10 金幣。這張知識卡收進圖鑑了。`],{noWave:1,onEnd:()=>acAfter(k)});}
    else say('再想想看',[t.e,'讀完了嗎？再回答一次。'],{noWave:1,onEnd:()=>acQuiz(k,t)});}})));}
function acAfter(k){const C=AC_CARE[k],w=acW()[k];if(w.n<C.need)return;
  if(k==='lc'||k==='bb')setTimeout(()=>acRelease(k),400);
  else if(!w.cert){w.cert=Date.now();W.coins+=50;led(50,'黑豹保育員認證','獎勵');histAdd('adv','保育：成為黑豹「墨影」的保育員');renderPouch();save();SND.stamp&&SND.stamp();
    say('保育員 小岑',['你已經照顧墨影 5 天了，牠現在看到你都很放鬆。','恭喜你得到「黑豹保育員」認證！＋50 金幣','墨影不能回到野外，但牠在這裡會被好好照顧一輩子。'],{noWave:1});}}
// release day: the gate on the hill side opens, the leopard cat runs out, looks back once, and is gone; a new rescue arrives later
// per animal: gate, hinge swing, path out (to the gate, out of it, the look-back spot, the vanishing point)
const AC_REL={lc:{gate:'gate',sw:-1,p:[[92,-37.4],[92,-27],[94,-16]],nm:'小斑',sp:'石虎',cam:[92,-42,PI],
    lines:['小斑的傷完全好了，也學會自己抓食物了。','今天要送牠回到山林！我們一起看著牠。'],bye:['小斑回家了！謝謝你這幾天的照顧。','……啊，剛剛又送來一隻在路邊受傷的石虎。接下來也拜託你了！']},
  bb:{gate:'gate2',sw:1,p:[[109,-55],[117,-55],[126,-51]],nm:'小月',sp:'台灣黑熊',cam:[104,-55,-PI/4],
    lines:['小月的腳傷好了，也會自己找果實和昆蟲吃了。','今天幫牠戴上衛星頸圈，送牠回到森林！'],bye:['小月回家了！頸圈的訊號會告訴我們牠過得好不好。','……又有一隻被陷阱夾傷的小熊送來了。接下來也拜託你了！']}};
function acRelease(k='lc'){const o=AC[k],w=acW()[k],R=AC_REL[k];if(!o||o.cine)return;
  say('野放日',R.lines,{noWave:1,onEnd:()=>{
    o.cine={t:0,step:0};o.mv=false;o.anim=null;if(Math.hypot(P.pos.x-TB.x-R.cam[0],P.pos.z-R.cam[1])<16){cam.yaw=R.cam[2];cam.pitch=.3;}}});
  w.rel++;w.n=0;w.done=[];W.coins+=50;led(50,`幫助${R.sp}回到山林`,'獎勵');histAdd('adv',`保育：幫助${R.sp}「${R.nm}」回到山林`);renderPouch();save();}
function acCine(o,dt){const c=o.cine;c.t+=dt;const R=AC_REL[o.k],G_=AC[R.gate],r0=G_?G_.userData.r0!=null?G_.userData.r0:(G_.userData.r0=G_.rotation.y):0,Pp=R.p;
  const go=(tx,tz,spd)=>{const dx=tx-(o.g.position.x-TB.x),dz=tz-o.g.position.z,d=Math.hypot(dx,dz);if(d<.2)return true;const s=Math.min(d,spd*dt);o.g.position.x+=dx/d*s;o.g.position.z+=dz/d*s;o.g.rotation.y=Math.atan2(dx,dz);o.ph+=dt*spd*5;o.mv=true;return false;};
  if(c.step===0){if(G_)G_.rotation.y=r0+R.sw*-Math.min(1,c.t/1.2)*PI*.55;if(go(Pp[0][0],Pp[0][1],1.4)&&c.t>1.2){c.step=1;c.t=0;o.slow=false;}}
  else if(c.step===1){if(go(Pp[1][0],Pp[1][1],o.k==='bb'?2.4:3.6)){c.step=2;c.t=0;o.mv=false;o.anim={type:'look_back',t:0,dur:1.6};}}
  else if(c.step===2){if(c.t>1.6){c.step=3;c.t=0;o.slow=false;}}
  else if(c.step===3){go(Pp[2][0],Pp[2][1],o.k==='bb'?3:4);if(c.t>2.4){c.step=4;c.t=0;o.g.visible=false;o.mv=false;}}
  else if(c.step===4){if(G_)G_.rotation.y=r0+R.sw*-Math.max(0,1-c.t/1.2)*PI*.55;if(c.t>2){c.step=5;c.t=0;
      say('保育員 小岑',R.bye,{noWave:1});}}
  else if(c.step===5&&c.t>3){o.cine=null;o.slow=true;o.g.position.set(TB.x+rr(o.b[0],o.b[1]),AC.y,TB.z+rr(o.b[2],o.b[3]));o.g.visible=true;o.st='idle';o.t=2;}
  if(c&&c.step>=1&&c.step<5){const lx=o.g.position.x-TB.x,lz=o.g.position.z;o.g.position.y=(lx>AC.x0&&lx<AC.x1&&lz>AC.z0&&lz<AC.z1)?AC.y:tribeH(lx,lz);}}
function acTick(dt){acViewTick(dt);if(!AC.objs.length||!tbIn())return;const px=P.pos.x-TB.x,pz=P.pos.z;if(Math.abs(px-98)>80||Math.abs(pz+48)>80)return;
  AC.objs.forEach(o=>{if(o.cine){acCine(o,dt);return;}if(!o.g.visible)return;o.t-=dt;
    if(o.st==='walk'){const dx=o.tx-(o.g.position.x-TB.x),dz=o.tz-o.g.position.z,d=Math.hypot(dx,dz);
      if(d<.15||o.t<0){o.st='idle';o.mv=false;if(o.come){o.come=0;o.t=AC.view?14:5;o.anim=null;o.g.rotation.y=Math.atan2(P.pos.x-o.g.position.x,P.pos.z-o.g.position.z);}else{o.t=rr(3,7);const a=o.idle[Math.floor(rand()*o.idle.length)];o.anim=a?{type:a,t:0,dur:o.t}:null;}}
      else{const s=Math.min(d,o.spd*dt);o.g.position.x+=dx/d*s;o.g.position.z+=dz/d*s;o.g.rotation.y=Math.atan2(dx,dz);o.ph+=dt*o.spd*6;}}
    else if(o.t<0){if(rand()<.55){const b=o.b;o.st='walk';o.mv=true;o.anim=null;o.tx=rr(b[0],b[1]);o.tz=rr(b[2],b[3]);o.spd=o.k==='bl'?1.05:/^dog/.test(o.k)?1.2:o.k==='bb'?.9:.85;o.t=14;}
      else{o.t=rr(3,7);const a=o.idle[Math.floor(rand()*o.idle.length)];o.anim=a?{type:a,t:0,dur:o.t}:null;}}});}
// the shelter dog stays in its yard until someone adopts that breed
function acRefresh(){[['dog','shepherd'],['dog_m','maltese'],['dog_p','poodle']].forEach(([k,coat])=>{const d=AC[k];if(d)d.g.visible=!(W.pet&&W.pet.kind==='dog'&&W.pet.coat===coat);});}
function acAdopt(){if(!W.seat)return;
  if(W.pet){say('保育員 小岑',[`你已經有${W.pet.name}了。`,'好好照顧一隻寵物最重要。有空常來看看這裡的狗狗！'],{noWave:1});return;}
  acView('dog');const av=AC_DOGS.filter(d=>SPRITES['ani_'+d.coat]);
  choose('動物之家','這些狗狗在等新家。領養前，我們會先問你幾個問題，確定你準備好了。',[...av.map(d=>({label:`🐕 ${d.name}（${d.desc}）`,fn:()=>acAdoptQuiz(d,shuffle(AC_ADOPT.slice()).slice(0,3),0)})),{label:'再想想',fn:()=>{}}]);}
function acAdoptQuiz(d,qs,i){if(i>=qs.length){say('保育員 小岑',['三題都答對了！看得出來你準備好了。','幫牠取一個名字吧！'],{noWave:1,onEnd:()=>askName(d.def,name=>acAdoptDone(d,name))});return;}
  const t=qs[i],opts=shuffle(t.o.map((s,j)=>({s,ok:j===0})));
  choose(`領養問答 ${i+1}/${qs.length}`,t.q,opts.map(o=>({label:o.s,fn:()=>{if(o.ok)say('答對了',[t.e],{noWave:1,onEnd:()=>acAdoptQuiz(d,qs,i+1)});
    else say('保育員 小岑',[t.e,'養狗是一輩子的事。想清楚了再來找我，好嗎？'],{noWave:1});}})));}
function acAdoptDone(d,name){W.pet={kind:'dog',coat:d.coat,name,full:80,mood:85,bond:0,seen:Date.now()};histAdd('pet',`在動物之家領養了${d.name}「${name}」`);save();setupPet();acRefresh();
  {const lx=P.pos.x-TB.x;if(PETOBJ&&lx>AC.x0-2&&lx<AC.x1)PETOBJ.g.position.set(P.pos.x+.9,AC.y,clamp(P.pos.z+.5,-49,-46));}SND.stamp();SND.bark(P.pos);
  say('保育員 小岑',[`從今天起，${name}就是你的家人了！`,'牠已經做好寵物登記、植入晶片了。','狗狗要吃「狗狗肉乾」，便利商店的寵物用品區有賣。按 P 可以照顧牠。'],{noWave:1});}
function acBook(){const w=acW();msgOpen('Sqoyaw 動物之家','保育動物圖鑑',B=>{
  ['lc','bb','bl'].forEach(k=>{const C=AC_CARE[k],x=w[k];const card=el('div',{class:'nb-card ac-card'});
    card.appendChild(el('b',{text:`${C.name}・${C.who.replace(/^.*「|」$/g,'')}`}));
    card.appendChild(el('div',{class:'nb-meta',text:k!=='bl'?`照顧進度 ${Math.min(x.n,C.need)}/${C.need}　已幫助 ${x.rel} 隻${C.name}回到山林`:`照顧進度 ${Math.min(x.n,C.need)}/${C.need}${x.cert?'　已取得黑豹保育員認證':''}`}));
    C.facts.forEach(f=>card.appendChild(el('p',{text:'・'+f})));
    C.tasks.forEach(t=>{const got=x.done.includes(t.id);card.appendChild(el('p',{class:got?'ac-got':'ac-lock',text:got?`✔ ${t.title}：${t.e}`:`？ ${t.title}（照顧時解鎖）`}));});
    B.appendChild(card);});
  B.appendChild(el('p',{class:'help',text:'每天到救傷站照顧一次，回答對一題，就會解鎖一張知識卡。'}));});}
// the five students' homes: a cuter, bigger design (front gable, porch, flower boxes, picket fence, mailbox)
function tbCute(G,c,seat,winM){const CUTE=[{w:'#fbeee0',r:'#d9573b',d:'#3b6ea5'},{w:'#e3f2ea',r:'#2f7f6a',d:'#e0a020'},{w:'#e8eefb',r:'#34508f',d:'#d9573b'},{w:'#fff1d6',r:'#e07a2a',d:'#4f8a5b'},{w:'#f3e6f5',r:'#7a5aa8',d:'#e0674b'}];const P0=CUTE[(seat-1)%CUTE.length];
  const vx=c.qx-c.x,vz=c.qz-c.z;const f=Math.abs(vx)>Math.abs(vz)?[Math.sign(vx),0]:[0,Math.sign(vz)];const ry=Math.atan2(-f[0],-f[1]);
  const w=6,d=5.4,Hh=3.3,rh=2.3;const sx=f[0]?d:w,sz=f[0]?w:d;
  const y=Math.max(tribeH(c.x-sx/2,c.z-sz/2),tribeH(c.x+sx/2,c.z-sz/2),tribeH(c.x-sx/2,c.z+sz/2),tribeH(c.x+sx/2,c.z+sz/2))+.25;
  const g=new T.Group();g.position.set(c.x,y,c.z);g.rotation.y=ry;G.add(g);
  const wall=lam(P0.w),roof=lam(P0.r),trim=lam('#fbfaf6'),door=lam(P0.d);
  mk(bx(w,Hh,d),wall,0,Hh/2,0,g);mk(bx(w+.2,4,d+.2),lam('#b9b3a6'),0,-2,0,g);mk(bx(w+.1,.25,d+.1),trim,0,Hh,0,g);
  // front-facing gable: ridge runs front→back
  const half=w/2+.5,sl=Math.hypot(half,rh);[-1,1].forEach(s=>{const r=mk(bx(sl,.16,d+1),roof,s*half/2,Hh+rh/2,0,g);r.rotation.z=-s*Math.atan2(rh,half);});
  {const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(0,rh-.08);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:d-.02,bevelEnabled:false}),wall,0,Hh,-d/2+.01,g);}
  mk(bx(.6,1.6,.6),lam('#9a5a42'),w/4,Hh+rh*.75,d/4,g);                                        // chimney
  const rw=mk(cy(.55,.55,.12,20),trim,0,Hh+rh*.42,-d/2-.02,g,false);rw.rotation.x=PI/2;const rg=mk(cy(.42,.42,.14,20),winM,0,Hh+rh*.42,-d/2-.04,g,false);rg.rotation.x=PI/2; // round attic window
  // door + porch
  mk(bx(1.5,2.5,.1),trim,0,1.25,-d/2-.02,g,false);mk(bx(1.2,2.2,.12),door,0,1.1,-d/2-.05,g);mk(sph(.07,8,6),lam('#f2c14e'),.42,1.1,-d/2-.13,g,false);
  mk(bx(2.4,.18,1.6),trim,0,2.75,-d/2-.8,g);[-1,1].forEach(s=>mk(cy(.07,.07,2.7,8),trim,s*1.05,1.35,-d/2-1.5,g));mk(bx(2.4,.2,1.4),lam('#c9c3b6'),0,.1,-d/2-.75,g);
  [-1,1].forEach(s=>{mk(bx(.2,.3,.2),M.lampHead,s*.95,2.2,-d/2-.12,g,false);addGlow(s*.95,2.2,-d/2-.35,1.1,'#ffd79a','lamp',.9,g);});
  // windows with flower boxes
  [-1,1].forEach(s=>{mk(bx(1.35,1.15,.08),trim,s*1.9,1.85,-d/2-.02,g,false);mk(bx(1.15,.95,.1),winM,s*1.9,1.85,-d/2-.04,g,false);mk(bx(.06,.95,.12),trim,s*1.9,1.85,-d/2-.06,g,false);
    mk(bx(1.4,.28,.35),lam('#8a5a3a'),s*1.9,1.15,-d/2-.2,g);for(let k=0;k<5;k++)mk(sph(.12,6,5),lam(pick(['#f06a8a','#f2c14e','#f7f2e8','#e0674b','#b69ae6'])),s*1.9-.5+k*.25,1.38,-d/2-.22,g,false);});
  // side windows
  [-1,1].forEach(s=>{mk(bx(.08,1,1.1),trim,s*(w/2+.02),1.85,0,g,false);mk(bx(.1,.8,.9),winM,s*(w/2+.04),1.85,0,g,false);});
  // picket fence around the front yard (gap for the gate), mailbox, stepping stones
  const fz=-d/2-3.1,pk=trim;[[-w/2-.2,-1.2],[1.2,w/2+.2]].forEach(([a,b])=>{mk(bx(b-a,.08,.06),pk,(a+b)/2,.75,fz,g,false);mk(bx(b-a,.08,.06),pk,(a+b)/2,.4,fz,g,false);for(let x=a;x<=b+.01;x+=.35)mk(bx(.1,.95,.05),pk,x,.47,fz,g,false);});
  [-1,1].forEach(s=>{mk(bx(.06,.08,3.1),pk,s*(w/2+.2),.75,-d/2-1.55,g,false);for(let z=-d/2;z>fz;z-=.45)mk(bx(.05,.95,.1),pk,s*(w/2+.2),.47,z,g,false);});
  mk(bx(.1,1.1,.1),M.woodDark,1.6,.55,fz-.25,g);const mb=mk(bx(.45,.35,.6),lam(P0.d),1.6,1.25,fz-.25,g);
  mk(bx(w+.8,3.9,3.5),M.stone,0,-2,-d/2-1.6,g);mk(bx(w+.7,.12,3.4),lam('#8fb35a'),0,-.04,-d/2-1.6,g,false);mk(bx(1.3,.13,3.4),lam('#d8d2c4'),0,-.02,-d/2-1.6,g,false);
  for(let i=0;i<4;i++){const s=i<2?-1:1;mk(sph(.28,8,6),lam(pick(['#5f8a44','#4f7f3f'])),s*(w/2-.6-(i%2)*.8),.28,-d/2-2.2,g);mk(sph(.1,6,5),lam(pick(['#f06a8a','#f2c14e','#b69ae6'])),s*(w/2-.6-(i%2)*.8),.52,-d/2-2.2,g,false);}
  addCol(TB.x+c.x-sx/2,TB.x+c.x+sx/2,TB.z+c.z-sz/2,TB.z+c.z+sz/2,y+Hh+rh+2);
  const [cv,gg]=C2(160,112);gg.fillStyle='#fffaf0';rrect(gg,4,4,152,104,16);gg.fill();gg.strokeStyle=P0.r;gg.lineWidth=7;rrect(gg,4,4,152,104,16);gg.stroke();gg.fillStyle='#3a2a20';gg.font=`900 60px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText(String(seat),80,50);gg.font=`700 20px ${FG}`;gg.fillText('號的家',80,92);
  mk(bx(.86,.6,.06),trim,0,3.13,-d/2-1.5,g,false);const np=mk(new T.PlaneGeometry(.75,.52),new T.MeshBasicMaterial({map:TX(cv)}),0,3.13,-d/2-1.54,g,false);np.rotation.y=PI;
  const cs=Math.cos(ry),sn=Math.sin(ry);const loc=(x,z)=>[c.x+x*cs+z*sn,c.z-x*sn+z*cs];const [ox,oz]=loc(0,-d/2-2.2);
  {const seg=(x0,z0,x1,z1,t=.12)=>{const a=loc(x0,z0),b=loc(x1,z1);addCol(TB.x+Math.min(a[0],b[0])-t,TB.x+Math.max(a[0],b[0])+t,TB.z+Math.min(a[1],b[1])-t,TB.z+Math.max(a[1],b[1])+t,y+1.2);};
   seg(-w/2-.2,fz,-1.2,fz);seg(1.2,fz,w/2+.2,fz);seg(-w/2-.2,-d/2,-w/2-.2,fz);seg(w/2+.2,-d/2,w/2+.2,fz);seg(1.6,fz-.25,1.6,fz-.25,.3);seg(-1.05,-d/2-1.5,-1.05,-d/2-1.5,.12);seg(1.05,-d/2-1.5,1.05,-d/2-1.5,.12);}
  {const q1=loc(-w/2-.4,-d/2-3.35),q2=loc(w/2+.4,-d/2+.05);TB.pads=TB.pads||[];TB.pads.push({x0:Math.min(q1[0],q2[0]),x1:Math.max(q1[0],q2[0]),z0:Math.min(q1[1],q2[1]),z1:Math.max(q1[1],q2[1]),y});}const [cx2,cz2]=loc(0,0);
  TB.houses[seat]={x:ox,z:oz,y,top:y+Hh+rh+1.6,cx:cx2,cz:cz2,f};
  {const bdp=loc(-w/2+.4,-d/2-3.45),bda=loc(-w/2+.7,fz-1.1);const bd=msgBoard(g,-w/2+.7,0,fz-.12,PI,`${seat} 號的留言板`,P0.r);bd.scale.setScalar(.7);
   inter(new T.Vector3(TB.x+bda[0],tribeH(bda[0],bda[1]),TB.z+bda[1]),1.5,()=>seat===tbMySeat()&&!TS()?'看我家門口的留言板':TS()?`看 ${seat} 號的留言板`:`${seat} 號的留言板`,()=>{
     if(seat===tbMySeat()&&!TS()){openHomeBoard();return;}if(TS()){teacherHomeBoard(String(seat));return;}
     classBoard(seat);});}
  inter(new T.Vector3(TB.x+ox,y,TB.z+oz),1.8,()=>seat===tbMySeat()&&!TS()?'回家（我的房間）':`去 ${seat} 號的家`,()=>{
    if(seat===tbMySeat()&&!TS()){HOME.from='tribe';enterHome();return;}
    doorKnock(seat);});}
function tbHouse(G,c,seat,siding,ROOFC,winM){if(seat){tbCute(G,c,seat,winM);return;}
  const vx=c.qx-c.x,vz=c.qz-c.z;const f=Math.abs(vx)>Math.abs(vz)?[Math.sign(vx),0]:[0,Math.sign(vz)];const ry=Math.atan2(-f[0],-f[1]);
  const two=rand()<.35,w=rr(4.6,5.8),d=rr(4,4.8),Hh=two?5.6:3.1;const sx=f[0]?d:w,sz=f[0]?w:d;
  const y=Math.max(tribeH(c.x-sx/2,c.z-sz/2),tribeH(c.x+sx/2,c.z-sz/2),tribeH(c.x-sx/2,c.z+sz/2),tribeH(c.x+sx/2,c.z+sz/2))+.1;
  const g=new T.Group();g.position.set(c.x,y,c.z);g.rotation.y=ry;G.add(g);const wm=pick(siding);
  mk(bx(w,Hh,d),wm,0,Hh/2,0,g);mk(bx(w+.12,4,d+.12),M.concrete,0,-2,0,g);
  const rm=lam(pick(ROOFC)),rh=rr(.7,1.1),half=d/2+.45,sl=Math.hypot(half,rh);
  [-1,1].forEach(s=>{const r=mk(bx(w+.7,.12,sl),rm,0,Hh+rh/2,s*half/2,g);r.rotation.x=s*Math.atan2(rh,half);});
  {const sh=new T.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rh-.05);sh.closePath();const e=mk(new T.ExtrudeGeometry(sh,{depth:w-.02,bevelEnabled:false}),wm,-w/2+.01,Hh,0,g);e.rotation.y=PI/2;}
  const dx=pick([-1.2,-.8,.8,1.2]);mk(bx(1.1,2.1,.08),M.doorWood,dx,1.05,-d/2-.03,g);
  const cn=mk(bx(1.8,.08,1.1),rm,dx,2.6,-d/2-.5,g);cn.rotation.x=-.15;
  mk(bx(1.2,.9,.06),winM,-dx*.95,1.7,-d/2-.03,g,false);if(two){mk(bx(1.2,.9,.06),winM,-1.2,4.3,-d/2-.03,g,false);mk(bx(1.2,.9,.06),winM,1.2,4.3,-d/2-.03,g,false);}
  if(rand()<.6){const tx=-w/2-.9,tz=rr(-1,1);[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]].forEach(([a,b])=>mk(bx(.07,Hh+.2,.07),M.metal,tx+a,(Hh+.2)/2,tz+b,g,false));
    mk(bx(1.1,.08,1.1),M.metal,tx,Hh+.2,tz,g,false);mk(cy(.42,.42,1,12),lam('#d6dadd'),tx,Hh+.75,tz,g);}
  if(rand()<.3){const pz=-d/2-1.6;[[-w/2+.3,pz],[w/2-.3,pz]].forEach(([a,b])=>mk(bx(.1,2.4,.1),lam('#4f8a5b'),a,1.2,b,g,false));mk(bx(w,.08,.08),lam('#4f8a5b'),0,2.4,pz,g,false);for(let k=0;k<4;k++)mk(ico(.5,0),M.leaf2,rr(-w/2,w/2),2.5,pz+rr(-.3,.6),g,false);}
  for(let i=0,n=Math.floor(rr(0,3));i<n;i++)potPlant(g,rr(-w/2+.4,w/2-.4),-d/2-rr(.4,.8),rr(.8,1.2));
  addCol(TB.x+c.x-sx/2,TB.x+c.x+sx/2,TB.z+c.z-sz/2,TB.z+c.z+sz/2,y+Hh+2);
  if(!seat)return;
  const [cv,gg]=C2(128,96);gg.fillStyle='#f3ead9';rrect(gg,4,4,120,88,12);gg.fill();gg.strokeStyle='#6e4c33';gg.lineWidth=5;rrect(gg,4,4,120,88,12);gg.stroke();gg.fillStyle='#3a2a20';gg.font=`900 54px ${FG}`;gg.textAlign='center';gg.textBaseline='middle';gg.fillText(String(seat),64,44);gg.font=`700 18px ${FG}`;gg.fillText('號',64,80);
  const np=mk(new T.PlaneGeometry(.55,.42),new T.MeshBasicMaterial({map:TX(cv)}),dx+(dx<0?.95:-.95),1.9,-d/2-.05,g,false);np.rotation.y=PI;
  mk(bx(.16,.16,.1),M.lampHead,dx,2.4,-d/2-.07,g,false);addGlow(dx,2.35,-d/2-.3,1.2,'#ffd79a','lamp',.9,g);
  const cs=Math.cos(ry),sn=Math.sin(ry);const loc=(x,z)=>[c.x+x*cs+z*sn,c.z-x*sn+z*cs];const [ox,oz]=loc(dx,-d/2-1.3);const [cx2,cz2]=loc(0,0);
  TB.houses[seat]={x:ox,z:oz,y:tribeH(ox,oz),top:y+Hh+rh+1.4,cx:cx2,cz:cz2,f};
  inter(new T.Vector3(TB.x+ox,tribeH(ox,oz),TB.z+oz),1.6,()=>seat===tbMySeat()&&!TS()?'回家（我的房間）':`去 ${seat} 號的家`,()=>{
    if(seat===tbMySeat()&&!TS()){HOME.from='tribe';enterHome();return;}
    doorKnock(seat);});}
function tbSeason(){const m=new Date().getMonth()+1;return m>=9||m<=1;}
function tbPick(){if(!tbSeason()){say('甜柿果園',['柿子還是綠色的，還沒成熟喔！','秋天（9 月到 1 月）再來幫忙採收吧。']);return;}
  const d=new Date().toDateString();W.fruit=W.fruit&&W.fruit.d===d?W.fruit:{d,n:0};
  if(W.fruit.n>=10){say('甜柿果園',['今天已經幫忙採了 10 顆，剩下的留給明天吧！','採下來的甜柿在背包裡，可以吃掉。']);return;}
  W.fruit.n++;addItem('甜柿');W.coins+=2;led(2,'幫忙採甜柿','獎勵');renderPouch();save();SND.pick&&SND.pick();toast(`🍊 採到一顆甜柿！幫忙採收 +2 金幣（今天 ${W.fruit.n}/10）`);}
function tbRide(to){fadeTo(()=>{arriveTribe(to,true);});if(A.ready){const t=A.ctx.currentTime;for(let i=0;i<10;i++)nburst(t+i*.09,.07,'lowpass',180,.8,.3,A.sfx);}}
function arriveTribe(at,quiet){if(ST_IN)leaveStation();VISIT=null;if(CLS_IN||FIELD_IN||MART_IN||GATE_IN){CLS_IN=FIELD_IN=MART_IN=GATE_IN=false;r2Off();}INDOOR=false;HOME_IN=false;CH_IN=TC_IN=MZ_IN=ISL_IN=CY_IN=false;$('homeBar').hidden=true;P.sit=null;
  let [x,z,yaw]=TB.spots.bus;let home=null;
  if(at==='home'){home=TB.houses[tbMySeat()];if(home){x=home.x;z=home.z;yaw=Math.atan2(-home.f[0],-home.f[1])+PI;}else [x,z,yaw]=TB.spots.houses;}
  else if(at&&TB.spots[at])[x,z,yaw]=TB.spots[at];
  warpTown(TB.x+x,TB.z+z,yaw);if(home){cam.yaw=yaw-.55;cam.pitch=.28;cam.dist=Math.max(cam.dist,6);}SND.chime&&SND.chime();
  if(quiet)return;
  if(!W.tbSeen&&!TS()){W.tbSeen=true;save();const me=tbMySeat();setTimeout(()=>say('Sqoyaw',['歡迎回到 Qalang Sqoyaw！','巷子裡掛著號碼牌的房子，就是全班同學的家。'+(me?`你的家門口掛著「${me} 號」。`:''),'插著紅旗的地方有地標的小故事，有空可以去聽聽。','想去汐見町闖關，就到公車站搭車。']),900);}
  else setTimeout(()=>toast(at==='home'?'走出家門，外面就是 Sqoyaw':'Sqoyaw 到了！'),500);}
function sqCard(){msgOpen('走讀 Sqoyaw','打卡任務卡',B=>{const n=sqDone();B.appendChild(el('p',{class:'help',text:`已經打卡 ${n} / ${SQW.length} 站。走到插紅旗的地方按 E，聽完小故事就會打卡。全部完成送 80 金幣！`}));
  SQW.forEach((s,i)=>B.appendChild(el('div',{class:'nb-card mp-note'},[el('div',{class:'nb-meta',text:`第 ${i+1} 站 ${W.sqw&&W.sqw[s.id]?'✅ 已打卡':'⬜ 還沒去'}`}),el('b',{text:s.n})])));});}
function tbMuseum(){msgOpen('泰雅文物館','收藏館',B=>{B.appendChild(el('p',{class:'help',text:'文物館裡有傳統的穀倉、半穴居屋和老東西。這一區展示你在扭蛋收集到的東西，集滿一整套就能拿到特別稱號！'}));
  GMACH.forEach(m=>{const c=colS()[m.id],h=gHave(m);const card=el('div',{class:'nb-card'});card.appendChild(el('b',{text:`${m.ic} ${m.name}　${h} / ${m.items.length}${h===m.items.length?'　🎉':''}`}));
    const gr=el('div',{class:'mu-grid'});m.items.forEach(i=>gr.appendChild(el('div',{class:'mu-it'+(c[i[0]]?'':' no'),html:`<i>${c[i[0]]?i[2]:'？'}</i><small>${c[i[0]]?i[1]:'？？？'}</small>`})));card.appendChild(gr);B.appendChild(card);});});}
function tbTick(dt){const on=tbIn()&&started;const s=TB.mark;
  if(on&&!TS()){const h=TB.houses[tbMySeat()];if(h){s.visible=true;s.position.set(TB.x+h.cx,h.top+Math.sin(time*2.2)*.25,TB.z+h.cz);}else s.visible=false;}else s.visible=false;
  if(!on)return;tbLife(dt);if(TB.flag)TB.flag.rotation.y=Math.sin(time*2.3)*.25;if(TB.fruit)TB.fruit.visible=tbSeason();
  if(!TB.flagsInit){TB.flagsInit=true;Object.entries(TB.flags).forEach(([id,f])=>{if(W.sqw&&W.sqw[id])f.material.color.copy(col('#4fae6c'));});}
  Object.values(TB.flags).forEach((f,i)=>f.rotation.y=Math.sin(time*2+i)*.3);
  if(TB.winM)TB.winM.emissiveIntensity=(S.night||0)*.9;}


/* ---------- Sqoyaw life: village dogs & cats, neighbours, a moving 蹦蹦車, poles & props ---------- */
(function(){if(!TB.g)return;const G=TB.g,H=(x,z)=>tribeH(x,z),W0=(x,z)=>new T.Vector3(TB.x+x,H(x,z),TB.z+z);
  // dogs (village dogs wander around their spot; pat one and it follows you for a while)
  const DOGS=[['小黑','black',-25,-2],['阿黃','yellow',12,-36],['小白','white',0,24],['Lucky','yellow',-12,-20],['黑糖','black',30,12],['豆豆','white',45,-44],['旺財','yellow',-45,30],['雪球','white',35,-20]];
  const LINES=[n=>`${n}搖著尾巴跑過來，聞了聞你的手。`,n=>`${n}翻肚子給你摸，好舒服的樣子。`,n=>`${n}「汪！」一聲，決定跟你走一段路。`,n=>`${n}把一根樹枝叼給你，想跟你玩。`];
  TB.dogs=[];DOGS.forEach(([n,coat,x,z])=>{const d=makeDog(coat,1.15);d.name=n;const p=W0(x,z);d.g.position.copy(p);d.home=p.clone();d.tx=p.x;d.tz=p.z;d.t=rr(1,6);CATS.push(d);TB.dogs.push(d);
    inter(d.g.position,1.5,()=>`摸摸${n}`,()=>{d.follow=45;d.state='walk';SND.pick&&SND.pick();say(null,[pick(LINES)(n)]);dailyEvent&&dailyEvent('catpet');});});
  // cats lounging on walls and doorsteps
  [['咪咪','#f2eee6','#d98a3c',-16,-38,'cat_tama'],['煤炭','#232226',null,20,-20,'cat_sumi'],['橘橘','#d9853a','#f0e0c8',-5,20,'cat_mikan']].forEach(([n,b,pt,x,z,id])=>{
    const c=makeCat(n,b,pt,TB.x+x,z);c.g.position.y=H(x,z);c.home.y=c.g.position.y;aniSprite(c,id,.5);
    inter(c.g.position,1.4,()=>`摸摸${n}`,()=>{SND.pick&&SND.pick();say(null,[pick([`${n}瞇著眼睛，讓你摸了兩下。`,`${n}：「喵～」然後繼續曬太陽。`,`${n}蹭了蹭你的腳。`])]);});});
  // neighbours
  const npc=(id,x,z,yaw,name,lines,h=1.62)=>{if(!SPRITES[id])return;const o={g:new T.Group()};scene.add(o.g);npcSprite(id,o,W0(x,z),yaw,h);addCol(TB.x+x-.35,TB.x+x+.35,z-.35,z+.35,H(x,z)+1.8);inter(W0(x,z+(Math.cos(yaw)>0?1.3:-1.3)),1.8,`和${name}說話`,()=>say(name,lines));};
  npc('grandpa',31.5,19.5,PI*.9,'公車站的爺爺',['你好啊！要去哪裡？','以前我們都是走路上山下山，現在有公車，方便多了。','台 7 甲往南是梨山，往北可以一路到宜蘭喔。']);
  npc('clerk',-37,160.5,PI,'7-11 店員',['歡迎光臨！','從村子走過來有點遠吧？要不要買瓶水？','裡面的東西都可以買喔。']);
  npc('res07',-50,26,PI*.6,'打籃球的哥哥 阿澈',['我是阿澈，國中二年級。要一起打球嗎？','放學後大家都會來學校操場打球。','灌籃的時候要先跑起來，再用力跳！'],SPRITES.res07&&SPRITES.res07.h||2.1);
  npc('sporty',-24.8,-12,-PI/2,'以萬果園的阿姨',['來看看喔！今天的甜柿很甜！','秋天是甜柿，夏天是水蜜桃，冬天還有雪梨。','你們家也有種果樹嗎？']);
  const cFree=(x,z,r)=>{const X=TB.x+x;return !COLS.some(c=>X+r>c.x0&&X-r<c.x1&&z+r>c.z0&&z-r<c.z1&&c.y1-c.y0<60);};
  // residents walking the lanes (stop and chat when you come close)
  // residents walking the lanes (pairs walk side by side; they stop, turn and chat when you come close)
  {const RH=id=>SPRITES[id]&&SPRITES[id].h||1.6,FACE=(id,k)=>RESFACES[id]&&RESFACES[id][k||'happy'];
    const WK=[
      ['res01','樹叔',[0,.18],['今天在果園忙了一整天，甜柿快要可以採了。','山上天氣變得很快，出門記得帶外套。','聽說你們在做「走讀 Sqoyaw」？多認識自己住的地方，很好！'],'happy'],
      ['res02','梅姨',[0,.18],['我跟樹叔每天傍晚都會出來散步。','要不要吃水蜜桃？……啊，現在不是季節，夏天再給你！'],'happy',0],
      ['res03','采玲',[9,.32],['我們要去環青商店買晚餐的菜。','米米，走慢一點，等等媽媽！'],'thinking'],
      ['res04','米米',[9,.32],['我九歲！我的門牙掉了一顆。','你知道學校操場旁邊有籃球場嗎？'],'happy',2],
      ['res05','阿滿奶奶',[14,.5],['孩子，吃飽了沒？','以前這裡沒有柏油路，我們都走小路上山下山。','阿豆，牽好奶奶的手。'],'happy'],
      ['res06','阿豆',[14,.5],['奶奶說今天可以買一顆糖果！','我六歲，明年就要上小學了！'],'surprised',4],
      ['grandpa','散步的爺爺',[4,.6],['今天天氣很好，出來走走。','走路要慢慢走，看看山，看看雲。']],
      ['redcap','放學的男生',[8,.7],['你也住在這附近嗎？','放學後要不要一起去操場打球？']],
      ['hoodie','跳房子的妹妹',[13,.2],['一、二、三……你要一起玩嗎？']],
      ['res01','',[0,0]]].filter(w=>w[1]);
    TB.walk=[];WK.forEach(([id,name,[li,u0],lines,fk,lead],k)=>{if(!SPRITES[id])return;const L=SQ_LANES[li];if(!L)return;const P=L.p;let acc=0;const seg=[];for(let i=0;i<P.length-1;i++){const l=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);seg.push([acc,l,i]);acc+=l;}
      const w={c:makeSpr(id,RH(id)),id,name,P,seg,L:acc,s:acc*u0,dir:k%2?-1:1,v:rr(.95,1.2)*(RH(id)<1.4?1.1:1),ph:rand()*6,pause:0,yaw:0,pos:new T.Vector3(),side:rr(.6,.9),stop:false,lead:lead!=null?TB.walk[lead]:null};
      if(w.lead){const Ld=w.lead;Ld.side=Math.max(.15,Math.min(Ld.side,L.w/2-1.35));w.side=Ld.side+1.15;w.v=Ld.v;w.dir=Ld.dir;}sprShow(w.c,true);TB.walk.push(w);
      inter(w.pos,1.7,()=>`和${name}打招呼`,()=>{w.talk=4;if(w.lead)w.lead.talk=4;say(name,[pick(lines)],{face:FACE(id,fk)});});});
    // four young friends chatting on the corner (one standee)
    if(SPRITES.resgrp){const C=[[12,23],[14,21],[9,27],[16,25],[6,29]];let at=null;for(const [x,z] of C){const ld=sqLaneD(x,z)[0];if(ld>.8&&ld<4&&cFree(x,z,1.8)){at=[x,z];break;}}
      if(at){const [x,z]=at;const o={g:new T.Group()};scene.add(o.g);npcSprite('resgrp',o,W0(x,z),0,RH('resgrp'),{face:0});addCol(TB.x+x-1.3,TB.x+x+1.3,z-.4,z+.4,H(x,z)+2);
        inter(W0(x,z+1.4),2.2,'和年輕人聊天',()=>say('阿澈・阿晴・阿朗・小岑',['阿澈：我們等一下要開車去梨山兜風。','阿晴：你走過四季蘭溪吊橋嗎？走上去會晃喔！','阿朗：肚子好餓……要不要去阿來小吃店？','小岑：我在拍環山的照片，秋天的山最漂亮了。'],{face:FACE('res08','happy')}));}}}
  // power poles + wires along the main lanes
  {const pm=lam('#9a9690'),wm=new T.LineBasicMaterial({color:0x2a2a2a});const pts=[];
    [[-58,14],[-47,6],[-36,-2],[-27,-13],[-18,-23],[-10,-38],[-3,-50],[6,-63],[12,-76]].forEach(([x,z])=>{const px=x+2.8,pz=z+1.5,y=H(px,pz);if(!cFree(px,pz,.4))return;addCol(TB.x+px-.22,TB.x+px+.22,pz-.22,pz+.22,y+7.5);mk(cy(.13,.16,7.5,8),pm,px,y+3.75,pz,G);mk(bx(1.6,.12,.12),pm,px,y+7,pz,G,false);pts.push([px,y+6.9,pz]);});
    for(let i=0;i<pts.length-1;i++)[-.7,.7].forEach(o=>{const a=pts[i],b=pts[i+1];const cv=[];for(let k=0;k<=10;k++){const t=k/10;cv.push(new T.Vector3(a[0]+(b[0]-a[0])*t+o,a[1]+(b[1]-a[1])*t-Math.sin(t*PI)*.6,a[2]+(b[2]-a[2])*t));}const g=new T.BufferGeometry().setFromPoints(cv);G.add(new T.Line(g,wm));});}
  const WIS=new T.SphereGeometry(.12,6,5);WIS.scale(1,2.6,1);const WISM=['#9b7fd4','#b69ae6','#8a6ac8'].map(c=>lam(c));
  {// wisteria pergolas over the lanes (like the street view)
    const segAt=(x,z)=>{let b=null,bd=1e9;SQ_LANES.forEach(L=>{for(let i=0;i<L.p.length-1;i++){const r=sqSegD(x,z,L.p[i],L.p[i+1]);if(r[0]<bd){bd=r[0];b={a:L.p[i],b:L.p[i+1],w:L.w,q:[r[1],r[2]]};}}});return b;};
    let nP=0;[[-62,8.5],[-39.5,3],[-1,-23],[30,-15.5],[-8,-31],[44,-27],[-49,18]].forEach(([x,z])=>{if(nP>=5)return;const S_=segAt(x,z);const [qx,qz]=S_.q;const dx=S_.b[0]-S_.a[0],dz=S_.b[1]-S_.a[1],l=Math.hypot(dx,dz);const nx=-dz/l,nz=dx/l,hw=S_.w/2+.45;
      if(![-1,1].every(s=>[-.6,.6].every(t=>cFree(qx+nx*hw*s+dx/l*t,qz+nz*hw*s+dz/l*t,.9)))||!cFree(qx,qz,1.4))return;nP++;
      const y=H(qx,qz),wd=lam('#6e4228');[-1,1].forEach(s=>[-.6,.6].forEach(t=>{const px=qx+nx*hw*s+dx/l*t,pz=qz+nz*hw*s+dz/l*t;mk(bx(.18,2.9,.18),wd,px,H(px,pz)+1.45,pz,G);addCol(TB.x+px-.18,TB.x+px+.18,pz-.18,pz+.18,H(px,pz)+3);}));
      for(let k=0;k<=8;k++){const t=k/8*2-1,px=qx+nx*hw*t,pz=qz+nz*hw*t,yy=y+2.9+(1-t*t)*.7;const r=mk(bx(.14,.1,1.6),wd,px,yy,pz,G,false);r.rotation.y=Math.atan2(dx,dz);
        for(let j=0;j<5;j++)mk(WIS,pick(WISM),px+rr(-.25,.25),yy-.38-rr(0,.25),pz+rr(-.7,.7),G,false);}});
  }
  // fruit crates, scooters, laundry, flower pots, persimmon trees between houses
  const crate=(x,z,c)=>{if(!cFree(x,z,.45)||sqLaneD(x,z)[0]<.5)return null;addCol(TB.x+x-.4,TB.x+x+.4,z-.3,z+.3,H(x,z)+1);return mk(bx(.7,.35,.5),lam(c),x,H(x,z)+.18,z,G);};
  [[-25,-1.5],[-24.3,-1],[-26.5,-13],[19,-62],[4,30]].forEach(([x,z],i)=>{if(!cFree(x+.4,z,.9)||sqLaneD(x,z)[0]<.6||sqLaneD(x+.75,z)[0]<.6)return;for(let k=0;k<3;k++){const c=mk(bx(.7,.35,.5),lam(pick(['#3b6ea5','#e0a020','#4f8a5b'])),x+(k%2)*.75,H(x,z)+.18+Math.floor(k/2)*.36,z,G);}addCol(TB.x+x-.4,TB.x+x+1.15,z-.3,z+.3,H(x,z)+1);});
  const scooter=(x,z,ry,c)=>{if(!cFree(x,z,.8)||sqLaneD(x,z)[0]<.7)return;addCol(TB.x+x-.7,TB.x+x+.7,z-.7,z+.7,H(x,z)+1.3);const s=new T.Group();s.position.set(x,H(x,z),z);s.rotation.y=ry;G.add(s);mk(bx(.35,.45,1.3),lam(c),0,.45,0,s);mk(bx(.3,.15,.6),M.black,0,.75,-.15,s);mk(cy(.03,.03,.8,6),M.metal,0,.9,.55,s);mk(bx(.6,.05,.05),M.metal,0,1.28,.55,s);
    [-.55,.55].forEach(z=>{const w=mk(cy(.22,.22,.12,10),M.black,0,.22,z,s);w.rotation.z=PI/2;});};
  scooter(-15,-27,.4,'#e0674b');scooter(9,-24,1.2,'#3b6ea5');scooter(10,30,0,'#f2efe8');scooter(-32,12,-.8,'#4f8a5b');scooter(34,-6,.2,'#e0a020');
  [[-16,-1],[3,-30],[18,-4],[-27,-22],[14,16]].forEach(([x,z])=>{if(!cFree(x,z,1.5)||sqLaneD(x,z)[0]<1.4)return;const y=H(x,z);[-1.2,1.2].forEach(k=>{mk(cy(.04,.04,1.8,6),M.metal,x+k,y+.9,z,G,false);addCol(TB.x+x+k-.15,TB.x+x+k+.15,z-.15,z+.15,y+1.8);});mk(cy(.02,.02,2.4,6),M.metal,x,y+1.75,z,G,false).rotation.z=PI/2;
    for(let k=0;k<4;k++)mk(new T.PlaneGeometry(.4,.55),lam(pick(['#f2efe8','#e0674b','#4f9ad8','#f2c14e']),{side:T.DoubleSide}),x-.9+k*.6,y+1.45,z,G,false);});
  for(let i=0;i<30;i++){const x=rr(-45,58),z=rr(-62,40);if(sqLaneD(x,z)[0]<1.2||sqLaneD(x,z)[0]>6||!cFree(x,z,.45)||TB.LM.some(([a,b,r])=>Math.hypot(x-a,z-b)<r))continue;const y=H(x,z);addCol(TB.x+x-.28,TB.x+x+.28,z-.28,z+.28,y+.8);mk(cy(.22,.17,.35,8),rand()<.5?M.pot:M.pot2,x,y+.17,z,G);mk(ico(.3,0),lam(pick(['#5f8a44','#4f7f3f'])),x,y+.5,z,G);if(rand()<.6)mk(sph(.1,6,5),lam(pick(['#f06a8a','#f2c14e','#b69ae6','#f7f2e8'])),x,y+.72,z,G,false);}
  for(let i=0;i<18;i++){const x=rr(-45,58),z=rr(-62,40);const ld=sqLaneD(x,z)[0];if(ld<3||ld>9||!cFree(x,z,1.4)||TB.LM.some(([a,b,r])=>Math.hypot(x-a,z-b)<r+1))continue;const y=H(x,z);mk(cy(.15,.22,1.5,7),M.trunk,x,y+.75,z,G);const cr=mk(ico(1.25,1),lam(pick(['#5a8a3e','#4f7f3a','#6a8f4a'])),x,y+2.1,z,G);cr.scale.y=.85;
    if(tbSeason())for(let k=0;k<6;k++)mk(sph(.16,6,5),lam('#f08a2a'),x+rr(-1,1),y+2+rr(-.4,.6),z+rr(-1,1),G,false);addCol(TB.x+x-.25,TB.x+x+.25,z-.25,z+.25,y+3);}
  // a 蹦蹦車 driving up and down 台7甲
  {const t=new T.Group();G.add(t);const b=new T.Group();t.add(b);mk(bx(1.5,1.4,1.6),M.red,1.4,1.05,0,b);mk(bx(.05,.6,1.3),M.glassDark,2.16,1.35,0,b,false);mk(bx(2.4,.5,1.7),M.red,-.6,.75,0,b);
    [[-1.5,.85],[-1.5,-.85],[1.4,.85],[1.4,-.85]].forEach(([x,z])=>{const w=mk(cy(.32,.32,.25,12),M.black,x,.32,z,b);w.rotation.x=PI/2;});for(let k=0;k<6;k++)mk(bx(.55,.35,.45),lam(pick(['#3b6ea5','#e0a020'])),-1.4+(k%3)*.55,1.2,(k<3?-.3:.3),b,false);
    const R=SQ_ROAD;let L=0;const seg=[];for(let i=0;i<R.length-1;i++){const l=Math.hypot(R[i+1][0]-R[i][0],R[i+1][1]-R[i][1]);seg.push([L,l]);L+=l;}TB.truck={g:t,s:rr(0,L),L,seg,dir:1};}
  try{scene.updateMatrixWorld(true);inkTown(G);}catch(e){}
  // cut-away: building materials in the village + mark big building colliders as see-through for the camera
  {const tall=new Set(),gnd=new Set(),_s=new T.Vector3(),_k=new T.Vector3();const _wb=new T.Box3();G.traverse(o=>{if(!o.isMesh||o.userData.inkLine||o.isInstancedMesh&&false)return;const gb=o.geometry;if(!gb.boundingBox)gb.computeBoundingBox();if(o.userData.bld){gb.boundingBox.getSize(_s);}else{_wb.setFromObject(o);_wb.getSize(_s);}_k.set(1,1,1);const ms=Array.isArray(o.material)?o.material:[o.material];if(!o.userData.bld&&(_s.x*_k.x>=30||_s.z*_k.z>=30||o.geometry.type==='BufferGeometry'&&_s.y*_k.y<.3))ms.forEach(m=>gnd.add(m));else if(o.userData.bld||_s.y*_k.y>.8)ms.forEach(m=>tall.add(m));});
    tall.forEach(m=>{if(m&&(m.isMeshLambertMaterial||m.isMeshBasicMaterial||m.isMeshToonMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial)&&!gnd.has(m))cutPatch(m);});}
  COLS.forEach(c=>{if(c.x0>2300&&(c.x1-c.x0)*(c.z1-c.z0)>=.9&&Math.min(c.x1-c.x0,c.z1-c.z0)>.5&&c.y1-tribeH((c.x0+c.x1)/2-TB.x,(c.z0+c.z1)/2)>2.6)c.see=1;});})();
// basketball: walk up to a hoop and choose 投籃 / 灌籃; the ball is a small 3D sphere flying to the rim
const BALL={m:null,t:-1,from:null,to:null,in:false,dur:.8};
function tbHoop(kx,y0,rz,fz,s,ax){if(!actOk()){toast('這個角色還沒有投籃動作');return;}
  choose('籃球場','要怎麼打？',[{label:'🏀 投籃',fn:()=>hoopGo(kx,y0,rz,fz,s,false,ax)},{label:'💥 灌籃',fn:()=>hoopGo(kx,y0,rz,fz,s,true,ax)},
    ...(actHas('s.dribble')?[{label:'⛹️ 運球',fn:()=>hoopDrill(kx,y0,rz,fz,s,'dribble',ax)}]:[]),...(actHas('s.catch')?[{label:'🤲 接阿澈的傳球',fn:()=>hoopDrill(kx,y0,rz,fz,s,'catch',ax)}]:[]),{label:'算了',fn:null}]);}
// dribble in place (ball is drawn in the frames) / catch a pass: a ball flies in from the front and the catch frames take over
// court frame: kx = lateral coordinate of the court's centre line, rz / fz = along-court coordinates of the rim / shooting spot.
// ax 'z' (old courts): lateral = local x, along = world z.  ax 'x' (平等國小): lateral = world z, along = local x.
function hpW(ax,l,a){return ax==='x'?[TB.x+a,l]:[TB.x+l,a];}
function hpV(ax,l,y,a){const w=hpW(ax,l,a);return new T.Vector3(w[0],y,w[1]);}
function hoopDrill(kx,y0,rz,fz,s,kind,ax){ax=ax||'z';const p0=hpW(ax,kx+.7,fz),rm=hpW(ax,kx,rz);P.pos.set(p0[0],y0,p0[1]);P.vel.set(0,0,0);
  const yaw=Math.atan2(rm[0]-P.pos.x+.01,rm[1]-P.pos.z);
  if(kind==='dribble'){P.yaw=yaw;pl.g.rotation.y=yaw;cam.yaw=yaw+PI*.5;cam.pitch=.14;actPlay('s.dribble',{lock:true,dur:3.4,yaw,cb:()=>toast('運球很穩！')});return;}
  P.yaw=yaw;pl.g.rotation.y=yaw;cam.yaw=yaw;cam.pitch=.14;
  if(!BALL.m){BALL.m=new T.Mesh(new T.SphereGeometry(.13,14,10),lam('#e0732a'));scene.add(BALL.m);}
  const to=new T.Vector3(P.pos.x,y0+.95,P.pos.z).addScaledVector(new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)),.35),from=to.clone().addScaledVector(new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)),5);from.y+=.4;
  actPlay('s.catch',{lock:true,yaw,cb:()=>{toast('接到了！');actPlay('laugh');}});BALL.sw=1;BALL.in=false;BALL.stop=true;BALL.from=from;BALL.to=to;BALL.t=0;BALL.dur=.34;BALL.m.visible=true;BALL.m.position.copy(from);}
function hoopGo(kx,y0,rz,fz,s,dunk,ax){ax=ax||'z';const AX=ax==='x'?'x':'z',aw=a=>ax==='x'?TB.x+a:a;const sl=kx+(dunk?0:.7),z1=rz-s*.55,pa=dunk?rz-s*3.1:fz;
  const p0=hpW(ax,sl,pa);P.pos.set(p0[0],y0,p0[1]);P.vel.set(0,0,0);const rm=hpW(ax,kx,rz);const yaw=Math.atan2(rm[0]-P.pos.x,rm[1]-P.pos.z);P.yaw=yaw;pl.g.rotation.y=yaw;cam.yaw=ax==='x'?-s*.45:Math.atan2(1,0);cam.pitch=.12;
  if(!BALL.m){BALL.m=new T.Mesh(new T.SphereGeometry(.13,14,10),lam('#e0732a'));scene.add(BALL.m);}BALL.m.visible=false;
  const rim=hpV(ax,kx,y0+2.75,rz-s*.02),made=dunk||Math.random()<.68;const miss=ax==='x'?new T.Vector3(s*.25,.15,.35):new T.Vector3(.35,.15,s*.25);
  actPlay(dunk?'dunk':'shoot',{lock:true,yaw,onRel:()=>{const h=dunk?hpV(ax,kx,y0+2.95,z1+s*.2):hpV(ax,sl-.2,y0+1.95,(ax==='x'?P.pos.x-TB.x:P.pos.z)+s*.25);BALL.sw=0;BALL.stop=false;BALL.ph=null;BALL.ax=ax;BALL.floor=y0+.13;BALL.from=h;BALL.to=made?rim.clone():rim.clone().add(miss);BALL.t=0;BALL.dur=dunk?.16:.75;BALL.in=made;BALL.m.visible=true;BALL.m.position.copy(h);},
    cb:()=>{if(dunk){P.pos[AX]=aw(z1);ACT.dk=null;}setTimeout(()=>{toast(made?(dunk?'💥 灌籃成功！太帥了！':'🏀 進了！好球！'):'差一點點！再試一次？');if(made)actPlay('laugh');},250);}});ACT.dk=dunk?{a:AX,z0:aw(rz-s*3.1),z1:aw(z1)}:null;}
function ballTick(dt){(TB.nets||[]).forEach(n=>{if(n.sw>0){n.sw=Math.max(0,n.sw-dt*1.6);const k=n.sw;n.m.scale.set(1+Math.sin(k*18)*.08*k,1+.35*k,1+Math.cos(k*16)*.08*k);n.m.position.y=n.y0!=null?n.y0-.07*k:(n.y0=n.m.position.y);}});if(!BALL.m||BALL.t<0)return;BALL.t+=dt;const k=Math.min(1,BALL.t/BALL.dur);const p=BALL.m.position;
  if(BALL.stop&&k>=1){BALL.stop=false;BALL.t=-1;BALL.m.visible=false;return;}
  if(k<1){p.lerpVectors(BALL.from,BALL.to,k);p.y+=Math.sin(k*PI)*(BALL.dur>.5?1.6:.2);}
  else{const t2=BALL.t-BALL.dur;if(!BALL.ph){p.copy(BALL.to);BALL.ph={vy:BALL.in?-1.2:.6,vx:BALL.in?0:1.1,vz:BALL.in?(Math.random()-.5)*.6:0};if(BALL.ax==='x'){const t_=BALL.ph.vx;BALL.ph.vx=BALL.ph.vz;BALL.ph.vz=t_;}}
    if(BALL.in&&!BALL.sw){BALL.sw=1;(TB.nets||[]).forEach(n=>{if(Math.abs(n.m.position.z-BALL.to.z)<1.2&&Math.abs(n.m.position.x-BALL.to.x)<1.2)n.sw=1;});SND.pick&&SND.pick();}
    const B_=BALL.ph,fl=BALL.floor!=null?BALL.floor:BALL.to.y-2.6;B_.vy-=9.8*dt;p.y+=B_.vy*dt;p.x+=B_.vx*dt;p.z+=B_.vz*dt;
    if(p.y<fl){p.y=fl;B_.vy=Math.abs(B_.vy)>.9?-B_.vy*.55:0;B_.vx*=.75;B_.vz*=.75;}
    if(t2>2.4){BALL.t=-1;BALL.m.visible=false;}}}
function tbLife(dt){const K=TB.truck;if(!K)return;{const px=P.pos.x-TB.x,pz=P.pos.z,gx=K.g.position.x,gz=K.g.position.z,ry=K.g.rotation.y,fx=Math.cos(ry),fz=-Math.sin(ry);const rx=px-gx,rz=pz-gz,d=Math.hypot(rx,rz),ahead=rx*fx+rz*fz;
    K.wait=tbIn()&&!INDOOR&&d<9&&ahead>-1.5;if(tbIn()&&d<2.9&&d>.01){const k=(2.9-d)/d;P.pos.x+=rx*k;P.pos.z+=rz*k;}}
  ballTick(dt);
  if(!K.wait)K.s+=K.dir*dt*7;
  if(TB.walk){const on=tbIn()&&!INDOOR;TB.walk.forEach(w=>{sprShow(w.c,on);if(!on)return;const px=P.pos.x-TB.x,pz=P.pos.z;
    const lx=w.pos.x-TB.x,lz=w.pos.z,dP=Math.hypot(px-lx,pz-lz);w.talk=Math.max(0,(w.talk||0)-dt);const near=dP<2.4||w.talk>0;
    if(dP<.95&&dP>.01){const k=(.95-dP)/dP;P.pos.x+=(px-lx)*k;P.pos.z+=(pz-lz)*k;}
    // never walk into another resident where lanes cross (a grown-up passing "through" a child looked like a hug): the one behind waits
    if(!w.lead){let blk=false;for(const o of TB.walk){if(o===w||o.lead===w||w.lead===o)continue;const dx=o.pos.x-w.pos.x,dz=o.pos.z-w.pos.z,d=Math.hypot(dx,dz);if(d>1.8||d<.001)continue;
        const fx=Math.sin(w.yaw),fz=Math.cos(w.yaw),ahead=(dx*fx+dz*fz)/d;if(ahead>.25){const ofx=Math.sin(o.yaw),ofz=Math.cos(o.yaw),oAhead=(-dx*ofx-dz*ofz)/d;if(oAhead>.25&&TB.walk.indexOf(o)>TB.walk.indexOf(w))continue;blk=true;break;}}
      if(blk)w.hold=Math.max(w.hold||0,.4);}
    let moving=false;if(w.lead){const Ld=w.lead;if(near)Ld.hold=.3;w.s=Ld.s;w.dir=Ld.dir;moving=Ld.moving;}else{w.hold=Math.max(0,(w.hold||0)-dt);
    if(w.pause>0)w.pause-=dt;else if(!near&&!w.hold){w.s+=w.dir*w.v*dt;moving=true;if(w.s>w.L-1.5||w.s<1.5){w.dir*=-1;w.s=clamp(w.s,1.5,w.L-1.5);w.pause=rr(1,3);}else if(rand()<dt*.04)w.pause=rr(2,5);}}w.moving=moving;
    let i=0;while(i<w.seg.length-1&&w.s>w.seg[i][0]+w.seg[i][1])i++;const sg=w.seg[i],a=w.P[sg[2]],b=w.P[sg[2]+1],t=clamp((w.s-sg[0])/sg[1],0,1);const tx=(b[0]-a[0])/sg[1],tz=(b[1]-a[1])/sg[1];
    const x=a[0]+(b[0]-a[0])*t+(-tz)*w.side*w.dir,z=a[1]+(b[1]-a[1])*t+tx*w.side*w.dir;w.pos.set(TB.x+x,tribeH(x,z),z);
    const want=near?Math.atan2(px-x,pz-z):Math.atan2(tx*w.dir,tz*w.dir);w.yaw=lerpAng(w.yaw,want,1-Math.exp(-dt*(near?5:6)));if(moving)w.ph+=w.v*dt*(w.c.meta.resident&&w.c.meta.walk4?4.6:2.35);
    sprPose(w.c,w.pos,w.yaw,w.ph,moving?1:0,time);});}if(K.s>K.L-2){K.s=K.L-2;K.dir=-1;}if(K.s<2){K.s=2;K.dir=1;}
  const R=SQ_ROAD;let i=0;while(i<K.seg.length-1&&K.s>K.seg[i][0]+K.seg[i][1])i++;const t=(K.s-K.seg[i][0])/K.seg[i][1];const a=R[i],b=R[i+1];const lane=K.dir>0?-1.8:1.8;
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);const x=a[0]+dx*t+(-dz/l)*lane,z=a[1]+dz*t+(dx/l)*lane;K.g.position.set(x,(TB.terrH?TB.terrH(x,z):sqBase(x,z))+.1,z);K.g.rotation.y=Math.atan2(-dz*K.dir,dx*K.dir);}

/* ---------- 🗺️ map: a top-down snapshot of where you are, with landmarks and you ---------- */
(function(){const d=document.createElement('div');d.id='mapv';d.hidden=true;d.innerHTML='<div class="mp-in"><div class="sh-hd"><b class="mp-t">🗺️ 地圖</b><button type="button" class="sh-x" aria-label="關閉">✕</button></div><canvas class="mp-cv"></canvas><p class="mp-note"></p></div>';
  document.body.appendChild(d);d.querySelector('.sh-x').onclick=()=>{d.hidden=true;cv.focus({preventScroll:true});};d.addEventListener('pointerdown',e=>{if(e.target===d){d.hidden=true;}});})();
function mapLabels(){const L=[];
  if(tbIn()){SQW.forEach(st=>L.push([(W.sqw&&W.sqw[st.id]?'✅ ':'🚩 ')+st.n.replace(/（.*?）/,''),st.p[0],st.p[1]]));
    L.push(['🏫 五年級教室',CLS_DOOR[0],CLS_DOOR[1]+1.5],['🐟 魚溜滑梯',-50.6,32.6],['🐾 動物之家',98,-48],['🏛️ 泰雅文物館',-9,-27],['⛪ 長老教會',60,-34],['⛪ 天主堂',21,-36],['⛪ 真耶穌教會',-3,-17],['🍜 阿來小吃',-3,17],['🛏️ 空野原',-40,-5],['🛏️ 瑪岱夢水月',3,7],['🛏️ 波波家',36,-4],['🏪 環青商店',-14,20],['🏪 青山商行',-27,-20],['🥔 IEMo 馬鈴薯小院',26,-90],['☕ 詩歌謠天空',92,104],['⛺ 露營區',106,78],['🍎 雲頂果園',-29,77],['🌉 四季蘭溪吊橋',-130,-45],['⛰️ 眺望點',-73,34],['🍊 果園',-44,62],['🛣️ 台7甲',118,30],['🏘️ 同學巷',50,-52],['👮 派出所',8,148],['⛩️ 環清宮',-10,158]);
    const h=TB.houses[tbMySeat()];if(h&&!TS())L.push(['🏠 你的家',h.cx,h.cz,1]);return {L,ox:TB.x,oz:TB.z,cx:-10,cz:20,sx:300,sz:330,t:'Qalang Sqoyaw 環山'};}
  Object.entries(SPOTS).forEach(([k,sp])=>{if(sp.pos&&!['tree','ema','phone','post'].includes(k))L.push(['📍 '+sp.name.replace(/（.*?）/,'').replace(/[（(].*$/,''),sp.pos.x,sp.pos.z]);});
  L.push(['🚉 汐見駅',46,-34],['🏪 便利商店',KONBINI.door.x,KONBINI.door.z],['🏯 挑戰館',CH.door.x,CH.door.z]);
  return {L,ox:0,oz:0,cx:0,cz:-10,sx:215,sz:200,t:'汐見町'};}
function openMap(){if(!started)return;if(INDOOR||ISL_IN||CY_IN||MZ_IN){toast('在這裡看不到地圖，走到外面再打開吧！');return;}
  const M_=mapLabels(),d=$('mapv'),c=d.querySelector('.mp-cv');d.querySelector('.mp-t').textContent='🗺️ '+M_.t;d.hidden=false;
  let W_=Math.min(innerWidth-24,900),H_=Math.min(innerHeight-120,Math.round(W_*M_.sz/M_.sx));
  if(innerWidth<innerHeight){H_=innerHeight-150;const sx=M_.sx*.55;M_.sx=sx;M_.sz=sx*H_/W_;const px=P.pos.x-M_.ox,pz=P.pos.z-M_.oz;M_.cx=px;M_.cz=pz;}const dpr=Math.min(2,devicePixelRatio||1);c.width=W_*dpr;c.height=H_*dpr;c.style.width=W_+'px';c.style.height=H_+'px';
  const src=renderer.domElement,sa=src.width/src.height,da=W_/H_;const req=Math.max(M_.sz,M_.sx/da);
  const cam2=camera.clone();cam2.fov=20;cam2.aspect=sa;cam2.up.set(0,0,-1);const fit=req*(sa<da?da/sa:1)/2/Math.tan(10*PI/180);
  cam2.position.set(M_.ox+M_.cx,fit,M_.oz+M_.cz);cam2.near=Math.max(5,fit-300);cam2.far=fit+400;cam2.lookAt(M_.ox+M_.cx,0,M_.oz+M_.cz);cam2.updateProjectionMatrix();cam2.updateMatrixWorld(true);
  const fog=scene.fog;scene.fog=null;renderer.render(scene,cam2);const g=c.getContext('2d');
  let sw=src.width,sh=src.height,sx=0,sy=0;if(sa>da){sw=sh*da;sx=(src.width-sw)/2;}else{sh=sw/da;sy=(src.height-sh)/2;}
  g.drawImage(src,sx,sy,sw,sh,0,0,c.width,c.height);scene.fog=fog;
  const pr=(x,z)=>{const v=new T.Vector3(x,0,z).project(cam2);const X=(v.x*.5+.5)*src.width,Y=(-v.y*.5+.5)*src.height;return [(X-sx)/sw*c.width,(Y-sy)/sh*c.height];};
  // every place is a small icon pin; names are placed around their pin without overlapping (a name with no free spot is left off —
  // the pin can still be tapped). Priority: you, then unvisited 走讀 flags, then everything else.
  g.textBaseline='middle';const fs=Math.round(11.5*dpr),R=10*dpr,LH=19*dpr,PAD=6*dpr;g.font=`700 ${fs}px ${FG}`;
  const its=M_.L.map(([n,x,z,me])=>{const [px,py]=pr(M_.ox+x,M_.oz+z);const m=n.match(/^([^\u4e00-\u9fffA-Za-z0-9]+)\s*(.*)$/);return {n,ic:m?m[1].trim():'',tx:(m?m[2]:n).replace(/（.*?）/g,''),px,py,me,x:M_.ox+x,z:M_.oz+z,pri:me?0:/🚩/.test(n)?1:2};})
    .filter(o=>o.px>-R&&o.py>-R&&o.px<c.width+R&&o.py<c.height+R).sort((a,b)=>a.pri-b.pri);
  const boxes=its.map(o=>[o.px-R,o.py-R,2*R,2*R]);const ov=(a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
  const hits=[];
  its.forEach(o=>{const w=g.measureText(o.tx).width+PAD*2;const cand=[[o.px+R+2*dpr,o.py-LH/2],[o.px-R-2*dpr-w,o.py-LH/2],[o.px-w/2,o.py-R-LH-1*dpr],[o.px-w/2,o.py+R+1*dpr]];
    o.lab=null;for(const [lx,ly] of cand){const r=[lx,ly,w,LH];if(lx<2||ly<2||lx+w>c.width-2||ly+LH>c.height-2)continue;if(boxes.some(b=>ov(r,b)))continue;o.lab=r;boxes.push(r);break;}
    hits.push({n:o.n,x:o.x,z:o.z,r:[o.px-R*1.8,o.py-R*1.8,R*3.6,R*3.6]});if(o.lab)hits.push({n:o.n,x:o.x,z:o.z,r:o.lab});});
  its.slice().reverse().forEach(o=>{if(o.lab){const [lx,ly,w]=o.lab;g.fillStyle=o.me?'rgba(224,103,75,.96)':'rgba(255,250,240,.92)';rrect(g,lx,ly,w,LH,LH/2);g.fill();g.fillStyle=o.me?'#fff':'#3a2a20';g.textAlign='left';g.fillText(o.tx,lx+PAD,ly+LH/2+1);}
    g.beginPath();g.arc(o.px,o.py,R,0,PI*2);g.fillStyle=o.me?'#e0674b':'#fffaf0';g.fill();g.lineWidth=2*dpr;g.strokeStyle=o.me?'#fff':o.pri===1?'#e0674b':'rgba(58,42,32,.55)';g.stroke();
    if(o.ic){g.textAlign='center';g.font=`${Math.round(11*dpr)}px ${FG}`;g.fillText(o.ic,o.px,o.py+1);g.font=`700 ${fs}px ${FG}`;}});
  hits.reverse();
  const [mx,my]=pr(P.pos.x,P.pos.z);g.save();g.translate(mx,my);g.rotate(-(P.yaw)+PI);g.fillStyle='#e0674b';g.strokeStyle='#fff';g.lineWidth=3*dpr;g.beginPath();g.moveTo(0,-14*dpr);g.lineTo(9*dpr,10*dpr);g.lineTo(0,5*dpr);g.lineTo(-9*dpr,10*dpr);g.closePath();g.stroke();g.fill();g.restore();
  if(tbIn()){g.fillStyle='rgba(255,255,255,.9)';g.font=`800 ${fs}px ${FG}`;g.fillText('北 ↑',26*dpr,18*dpr);}
  c.onclick=e=>{const b=c.getBoundingClientRect(),X=(e.clientX-b.left)*dpr,Y=(e.clientY-b.top)*dpr;const inside=hits.filter(q=>X>=q.r[0]&&X<=q.r[0]+q.r[2]&&Y>=q.r[1]&&Y<=q.r[1]+q.r[3]);const dC=q=>Math.hypot(X-q.r[0]-q.r[2]/2,Y-q.r[1]-q.r[3]/2);const h=inside.sort((a,b)=>dC(a)-dC(b))[0];if(!h)return;
    const nm=h.n.replace(/^[^\u4e00-\u9fffA-Za-z0-9]+\s*/,'');QT.mapNav={title:`導航：${nm}`,pos:new T.Vector3(h.x,0,h.z),map:true,tb:tbIn(),status:''};QT.target=QT.mapNav;d.hidden=true;toast(`🧭 開始導航到「${nm}」，跟著地上的光走！`);};
  d.querySelector('.mp-note').textContent='點地圖上的地點就能導航！紅色箭頭是你。'+(tbIn()?'🚩 是還沒打卡的走讀地點。':'');SND.pick&&SND.pick();}

/* ================================================================
   Main loop
   ================================================================ */
const clock=new T.Clock();let FRAME_RAW=0,time=0,areaTick=0,xingActive=false,xingT=0,bellT=0,gateK=0,lampPhase=0,lhT=0;
const tmpV=new T.Vector3(),fwd=new T.Vector3(),rgt=new T.Vector3();
function surface(){const x=P.pos.x,z=P.pos.z;if(z<-44.3&&!(x>72.6&&x<77.4)&&!(x>-33&&x<-27&&z>-48))return P.pos.y<SEA_Y+.05?'water':'sand';if(x>-66&&x<-34&&z>47)return 'stone';if(x>29&&x<62&&z>-35.6&&z<-32.2)return 'stone';return 'road';}
const DUST={pool:[],tex:null};
function dustCol(){if(P.pos.x>2300)return '#d9c7a2';const sf=surface();return sf==='water'?'#eef6ff':sf==='sand'?'#eadbb4':sf==='stone'?'#d4cec2':'#dcd5c8';}
function dustPuff(n,big){if(!DUST.tex){const [c,g]=C2(64,64);const gr=g.createRadialGradient(32,32,1,32,32,31);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.55,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);DUST.tex=TX(c);}
  const col=dustCol(),bx=-Math.sin(P.yaw),bz=-Math.cos(P.yaw);
  for(let i=0;i<n;i++){let d=DUST.pool.find(d=>!d.s.visible);
    if(!d){if(DUST.pool.length>=18)d=DUST.pool.reduce((a,b)=>a.t>b.t?a:b);else{const m=new T.SpriteMaterial({map:DUST.tex,transparent:true,depthWrite:false,fog:true});const sp=new T.Sprite(m);sp.renderOrder=3;scene.add(sp);d={s:sp,t:0,v:new T.Vector3(),big:1};DUST.pool.push(d);}}
    const j=(rand()-.5)*.5;d.s.position.set(P.pos.x+bx*.25-bz*j,P.pos.y+.1,P.pos.z+bz*.25+bx*j);d.s.material.color.set(col);
    d.v.set(bx*(.5+rand()*.6)+(rand()-.5)*.6,.35+rand()*.3,bz*(.5+rand()*.6)+(rand()-.5)*.6);d.t=0;d.big=big*(.8+rand()*.4);d.s.visible=true;}}
function dustTick(dt){DUST.pool.forEach(d=>{if(!d.s.visible)return;d.t+=dt;const k=d.t/.6;if(k>=1||INDOOR){d.s.visible=false;return;}
  d.s.position.addScaledVector(d.v,dt);d.v.multiplyScalar(Math.exp(-dt*4));const sc=(.22+.55*Math.sqrt(k))*d.big;d.s.scale.set(sc,sc*.8,1);d.s.material.opacity=.55*Math.pow(1-k,1.6);});}
function updatePlayer(dt){
  if(CUTON)return;
  if(ACT.on&&ACT.lock){P.vel.set(0,0,0);P.pos.y=groundH(P.pos.x,P.pos.z);pl.g.position.copy(P.pos);pl.g.rotation.y=P.yaw;P.moving=0;return;}
  if(ACT.on&&!P.sit&&(Math.hypot(STK.x,STK.y)>.2||keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright))actStop();
  // 2D rooms walk in real time even when a slow tablet (or pictures still loading) drops frames: catch up in small steps
  if(R2.on){if(!TC_IN&&!HOME_IN&&!CLS_IN&&!MART_IN&&!FIELD_IN&&!GATE_IN)r2Off();else{for(let t=Math.max(dt,FRAME_RAW);t>1e-4;t-=.05)r2Move(Math.min(.05,t));return;}}
  if(S2.on){if(!ST_IN||CUTON)s2Off();else{for(let t=Math.max(dt,FRAME_RAW);t>1e-4;t-=.05)s2Move(Math.min(.05,t));return;}}
  if(P.sit&&!DLG.open&&started&&!uiOpen()&&(Math.hypot(STK.x,STK.y)>.35||keys.w||keys.s||keys.arrowup||keys.arrowdown))standUp();
  if(P.sit){P.pos.copy(P.sit.pos);pl.g.position.set(P.pos.x,P.pos.y-.05,P.pos.z);P.yaw=lerpAng(P.yaw,P.sit.face,dt*6);pl.g.rotation.y=P.yaw;pose(pl,0,0,true);return;}
  let ix=0,iz=0;
  if(!DLG.open&&started&&!uiOpen()){if(keys.w||keys.arrowup)iz-=1;if(keys.s||keys.arrowdown)iz+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;ix+=STK.x;iz+=STK.y;}
  let tank=false;
  if(false&&!IS_TOUCH&&!DLG.open&&started&&!uiOpen()&&!INDOOR&&Math.hypot(STK.x,STK.y)<.05){const kt=((keys.a||keys.arrowleft)?1:0)-((keys.d||keys.arrowright)?1:0),kf=((keys.w||keys.arrowup)?1:0)-((keys.s||keys.arrowdown)?1:0);
    if(kt||kf){tank=true;P.yaw+=kt*dt*(kf?2.3:2.8);ix=0;iz=0;const fx=Math.sin(P.yaw),fz=Math.cos(P.yaw),bk=kf<0?.6:1;
      if(!drag){cam.yaw=lerpAng(cam.yaw,P.yaw+PI,1-Math.exp(-dt*(kf?2.6:4)));}
      const c=Math.cos(cam.yaw),sn=Math.sin(cam.yaw);const wx=fx*kf*bk,wz=fz*kf*bk;ix=wx*c-wz*sn;iz=wx*sn+wz*c;}}
  // click / tap on the ground to walk there (keys or the stick cancel it); arriving next to something interactive uses it
  if(Math.hypot(ix,iz)>.1)P.goal=null;
  else if(P.goal&&!DLG.open&&started&&!uiOpen()){const g=P.goal,dx=g.x-P.pos.x,dz=g.z-P.pos.z,d=Math.hypot(dx,dz);g.t+=dt;
    if(d<.55||g.t>25){const it=g.int;P.goal=null;goalMark(null);if(it&&$('prompt').classList.contains('show'))interact();}
    else{if(d<g.best-.05){g.best=d;g.st=0;}else if((g.st+=dt)>1.3){P.goal=null;goalMark(null);}
      if(P.goal){const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),wx=dx/d,wz=dz/d,k=Math.min(1,d/1.2+.35);ix=(wx*cy-wz*sy)*k;iz=(wx*sy+wz*cy)*k;}}}
  const il=Math.min(1,Math.hypot(ix,iz));
  const run=(keys.shift||touchRun||(!INDOOR&&STK.fullT&&performance.now()-STK.fullT>1200))&&il>.1;   // pushing the stick to the rim runs only after a moment, so a full push no longer sprints straight away
  fwd.set(-Math.sin(cam.yaw),0,-Math.cos(cam.yaw));rgt.set(Math.cos(cam.yaw),0,-Math.sin(cam.yaw));
  tmpV.set(0,0,0).addScaledVector(fwd,-iz).addScaledVector(rgt,ix);if(tmpV.lengthSq()>1)tmpV.normalize();
  const sp=(run?7.4:3.9)*(INDOOR?.62:1);const water=P.pos.y<SEA_Y+.05?.6:1;
  P.vel.x=lerp(P.vel.x,tmpV.x*sp*water,1-Math.exp(-dt*10));P.vel.z=lerp(P.vel.z,tmpV.z*sp*water,1-Math.exp(-dt*10));
  P.pos.x+=P.vel.x*dt;P.pos.z+=P.vel.z*dt;
  const oy=P.pos.y;collide(P.pos,INDOOR?.46:.38);
  // train pushes
  if(TRAIN.state!=='wait'&&Math.abs(P.pos.x-TRAIN.x)<12.9&&P.pos.z>-31.6&&P.pos.z<-28.4){P.pos.z=P.pos.z<-30?-31.7:-28.3;}
  const gh=groundH(P.pos.x,P.pos.z);P.pos.y=lerp(P.pos.y,gh,1-Math.exp(-dt*(gh>P.pos.y?32:18)));   // stepping up catches up fast, so feet never sink into a step or slope
  const spd=Math.hypot(P.vel.x,P.vel.z);P.moving=spd;
  if(spd>.2&&!tank){const a=Math.atan2(P.vel.x,P.vel.z);P.yaw=lerpAng(P.yaw,a,1-Math.exp(-dt*12));}
  // running: a slower, longer stride with a bounce and a lean (sprPose) + dust kicked up at each step; a hard stop skids
  P.runK=lerp(P.runK||0,run&&spd>4.2?1:0,1-Math.exp(-dt*7));
  if((P.spd0||0)>5.6&&spd<2.6&&!INDOOR){dustPuff(3,1.2);P.skid=.32;}P.spd0=spd;if(P.skid>0)P.skid-=dt;
  P.ph+=spd*dt*2.1*(1-.4*P.runK);const amt=clamp(spd/3.9,0,1.15);const doll=!SPR.c,rk=doll?P.runK:0;pose(pl,P.ph,amt,false,rk);
  // custom 3D look: lean into the run (or back on a hard stop) and spring off the ground mid-stride
  if(pl.g.rotation.order!=='YXZ')pl.g.rotation.order='YXZ';const skk=Math.max(0,P.skid||0)/.32;
  pl.g.rotation.x=doll?.17*rk*clamp(spd/7.4,0,1)-.15*skk:0;pl.head.rotation.x=-pl.g.rotation.x*.6;
  const bob=Math.abs(Math.sin(P.ph))*(.045+.07*rk)*amt;
  pl.g.position.set(P.pos.x,P.pos.y+bob+(P.pos.y<SEA_Y+.05?-.12:0),P.pos.z);pl.g.rotation.y=P.yaw;
  pl.head.rotation.y=Math.sin(time*.4)*.12*(1-amt);
  P.stepAcc+=spd*dt;if(P.stepAcc>(run?1.25:.95)){P.stepAcc=0;SND.step(surface());if(P.runK>.6&&!INDOOR)dustPuff(1,.8);}}
const _cdir=new T.Vector3(),_cw=new T.Vector3();function lerpAng(a,b,t){let d=b-a;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;return a+d*t;}
// first point where the hillside rises above the camera line (so the camera never ends up behind or inside a slope)
function terrOnly(x,z){return x>2300?(TB.terrH?TB.terrH(x-2600,z):sqBase(x-2600,z)):groundH(x,z);}
function terrHit(o,dv,d){for(let i=1;i<=10;i++){const t=d*i/10,x=o.x+dv.x*t,z=o.z+dv.z*t,y=o.y+dv.y*t;if(terrOnly(x,z)+.35>y)return Math.max(0,t-d/10);}return d;}
function updateCamera(dt){
  if(HOME_IN&&HOME.edit){const port=camera.aspect<1;const want=tmpV.set(HX,port?12.5:7.6,HZ+(port?5.4:5.4));const look=new T.Vector3(HX,0,HZ+(port?.2:-.2));
    // keep the whole room visible above (phone) or left of (desktop) the decorating panel
    const ox=port?0:Math.round(innerWidth*.17),oy=port?Math.round(innerHeight*.2):0;
    if(!HOME.vo||HOME.vo[0]!==ox||HOME.vo[1]!==oy||HOME.vo[2]!==innerWidth){camera.setViewOffset(innerWidth,innerHeight,ox,oy,innerWidth,innerHeight);HOME.vo=[ox,oy,innerWidth];}
    cam.pos.lerp(want,1-Math.exp(-dt*5));cam.look.lerp(look,1-Math.exp(-dt*6));camera.position.copy(cam.pos);camera.lookAt(cam.look);return;}
  if(HOME.vo){camera.clearViewOffset();HOME.vo=null;}
  // (outdoors the field of view is eased to its target at the end of this function; forcing it back to 50 here every frame made
  //  phones held upright — target 64 — pump the zoom back and forth with every uneven frame)
  const idle=performance.now()-lastInput>22000&&started&&!DLG.open;
  if(DRESS.on){const port=camera.aspect<1;const yaw=P.yaw+(port?0:.28)+Math.sin(time*.35)*.2,d=port?3.3:2.35;
    const tg=new T.Vector3(P.pos.x,P.pos.y+(port?.4:.8),P.pos.z);const dir=new T.Vector3(Math.sin(yaw)*Math.cos(.1),Math.sin(.1),Math.cos(yaw)*Math.cos(.1));
    const want=tg.clone().addScaledVector(dir,d);const rgt=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const look=tg.clone().addScaledVector(rgt,port?0:.55);
    cam.pos.lerp(want,1-Math.exp(-dt*5));cam.look.lerp(look,1-Math.exp(-dt*6));camera.position.copy(cam.pos);camera.lookAt(cam.look);return;}
  if(ST_IN){const port=camera.aspect<1;const hw=ST_W/2-(port?2.2:3.2);const cx=clamp(P.pos.x,STX-hw,STX+hw);
    const want=tmpV.set(cx,port?3.3:3.1,Math.min(STZ+6.9,P.pos.z+(port?4.6:4.2)));const look=new T.Vector3(cx+(P.pos.x-cx)*.6,.55,P.pos.z-.9);
    const fov=port?66:56;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    cam.pos.lerp(want,1-Math.exp(-dt*4));cam.look.lerp(look,1-Math.exp(-dt*5));camera.position.copy(cam.pos);camera.lookAt(cam.look);cam.yaw=0;return;}
  if(TC_IN){const port=camera.aspect<1;const hw=TC_W/2-(port?2.2:3.2);const cx=clamp(P.pos.x,TCX-hw,TCX+hw);
    const want=tmpV.set(cx,port?2.95:2.85,Math.min(TCZ+6.9,P.pos.z+(port?4.6:4.2)));const look=new T.Vector3(cx+(P.pos.x-cx)*.6,.55,P.pos.z-.9);
    const fov=port?66:56;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    cam.pos.lerp(want,1-Math.exp(-dt*4));cam.look.lerp(look,1-Math.exp(-dt*5));camera.position.copy(cam.pos);camera.lookAt(cam.look);cam.yaw=0;return;}
  if(MZ_IN){const port=camera.aspect<1;const pt=port?1.33:1.27,d=port?8.2:7.2;const tg=new T.Vector3(P.pos.x,.9,P.pos.z);
    const want=tg.clone().add(new T.Vector3(Math.sin(cam.yaw)*Math.cos(pt),Math.sin(pt),Math.cos(cam.yaw)*Math.cos(pt)).multiplyScalar(d));const fov=port?60:50;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    cam.pos.lerp(want,1-Math.exp(-dt*6));cam.look.lerp(tg,1-Math.exp(-dt*8));camera.position.copy(cam.pos);camera.lookAt(cam.look);return;}
  if(CH_IN){const port=camera.aspect<1;const tx=clamp(P.pos.x-CHX,-3.5,3.5)*.5,tz=clamp(P.pos.z-CHZ,-3,3)*.25;
    const want=tmpV.set(CHX+tx,port?3.3:3.1,CHZ+(port?8.6:7.6)+tz);const look=new T.Vector3(CHX+tx*.8,port?.3:.6,CHZ+tz-1);
    const fov=port?64:54;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    cam.pos.lerp(want,1-Math.exp(-dt*4));cam.look.lerp(look,1-Math.exp(-dt*5));camera.position.copy(cam.pos);camera.lookAt(cam.look);cam.yaw=0;return;}
  if(HOME_IN){// doll-house view from the open front of the room (like a Pokémon / Animal Crossing room)
    const port=camera.aspect<1;const tx=clamp(P.pos.x-HX,-2.4,2.4)*(port?.85:.45),tz=clamp(P.pos.z-HZ,-2.6,2.6)*.45;
    const want=tmpV.set(HX+tx*.6,port?3.2:2.9,HZ+RD_FRONT+(port?3.3:2.9)+tz*.2);const look=new T.Vector3(HX+tx*.7,port?.1:.45,HZ+tz*.4-.7);
    const fov=port?66:54;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    cam.pos.lerp(want,1-Math.exp(-dt*4));cam.look.lerp(look,1-Math.exp(-dt*5));camera.position.copy(cam.pos);camera.lookAt(cam.look);cam.yaw=0;return;}
  if(INDOOR&&started&&!ST_IN&&!TC_IN&&!HOME_IN&&!CH_IN&&!MZ_IN){const port=camera.aspect<1;const k=clamp(cam.dist/(port?8.6:6.4),.5,1.35);
    const cx=clamp(P.pos.x,IX-(port?4.8:3.6),IX+(port?4.8:3.6));const want=tmpV.set(cx,1.2+(port?6.6:5.2)*k,Math.min(P.pos.z+(port?6.2:5.4)*k,IZ+9.5));const look=new T.Vector3(cx+(P.pos.x-cx)*.7,.5,P.pos.z-.5);
    const fov=port?60:48;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    cam.pos.lerp(want,1-Math.exp(-dt*5));cam.look.lerp(look,1-Math.exp(-dt*6));camera.position.copy(cam.pos);camera.lookAt(cam.look);cam.yaw=0;return;}
  if(!started){cam.yaw=Math.sin(time*.05)*.35;cam.pitch=.12;}
  else if(P.sit){if(!drag)cam.yaw=lerpAng(cam.yaw,P.sit.face+Math.sin(time*.15)*.25,1-Math.exp(-dt*1.6));}
  else if(idle)cam.yaw+=dt*.035;
  else if(IS_TOUCH&&!drag&&!INDOOR&&STK.y<-.5&&Math.abs(STK.x)<.45&&P.moving>1)cam.yaw=lerpAng(cam.yaw,P.yaw+PI,1-Math.exp(-dt*1.1));   // phone: walking forward slowly brings the camera back behind you
  const target=tmpV.set(P.pos.x,P.pos.y+(P.sit?1.0:1.45),P.pos.z);
  const d=!started?9.5:INDOOR?Math.min(cam.dist,3.6):P.sit?4.6:cam.dist;if(P.sit&&cam.pitch>.14)cam.pitch=lerp(cam.pitch,.1,1-Math.exp(-dt*3));
  // when a building blocks the view outdoors, lift the camera over the roofs instead of zooming into the player's back
  let pb=0;if(started&&!INDOOR&&!CUTON&&!CUTU.on){for(const k of [0,.28,.55,.8]){const pp=Math.min(1.25,cam.pitch+k);const dv=_cdir.set(Math.sin(cam.yaw)*Math.cos(pp),Math.sin(pp),Math.cos(cam.yaw)*Math.cos(pp));if(rayDist(target,dv,d)>=d*.82&&terrHit(target,dv,d)>=d*.9||k===.8){pb=pp-cam.pitch;break;}}}
  else if(started&&!INDOOR&&!CUTON&&CUTU.on){for(const k of [0,.2,.4,.6]){const pp=Math.min(1.25,cam.pitch+k);const dv=_cdir.set(Math.sin(cam.yaw)*Math.cos(pp),Math.sin(pp),Math.cos(cam.yaw)*Math.cos(pp));if(!camInside(_cw.copy(target).addScaledVector(dv,d))&&terrHit(target,dv,d)>=d*.9||k===.6){pb=pp-cam.pitch;break;}}}
  cam.pb=lerp(cam.pb||0,pb,1-Math.exp(-dt*(pb>(cam.pb||0)?6:2)));const pE=cam.pitch+cam.pb;
  const dir=new T.Vector3(Math.sin(cam.yaw)*Math.cos(pE),Math.sin(pE),Math.cos(cam.yaw)*Math.cos(pE));
  let rd=rayDist(target,dir,d);if(started&&!INDOOR)rd=Math.min(rd,terrHit(target,dir,d)+.2);let want=target.clone().addScaledVector(dir,Math.max(1.2,rd-.35));
  // with the cut-away on, the camera may look THROUGH a building but never sit INSIDE one (you'd see the dark inside of its shell)
  if(CUTU.on&&camInside(want)){rd=rayDist(target,dir,d,true);want=target.clone().addScaledVector(dir,Math.max(1.2,rd-.35));}
  const gy=Math.max(groundH(want.x,want.z),want.z<-44.3?SEA_Y+.5:-10)+.35;if(want.y<gy)want.y=gy;if(INDOOR)want.y=Math.min(want.y,2.85);if(CY_IN){const hh=Math.max(hillH(want.x,want.z),inYard(want.x,want.z)?CY.y:-99)+.8;if(want.y<hh)want.y=hh;}
  if(cam.pos.lengthSq()===0)cam.pos.copy(want);cam.pos.lerp(want,1-Math.exp(-dt*9));cam.look.lerp(target,1-Math.exp(-dt*12));if(cam.look.lengthSq()===0)cam.look.copy(target);
  camera.position.copy(cam.pos);camera.lookAt(cam.look);
  CUTU.on=started&&!INDOOR&&!CUTON&&(typeof tbIn==='function'&&tbIn()||!CY_IN&&!ISL_IN&&!MZ_IN&&!CH_IN&&Math.abs(P.pos.x)<110&&P.pos.z>-115&&P.pos.z<95);CUTU.uCR.value=CUTU.on?1.7:0;if(CUTU.on){CUTU.uCA.value.copy(cam.pos);CUTU.uCB.value.copy(target);}
  const port=camera.aspect<1;const fov=document.body.classList.contains('cine')?(port?56:42):(port?64:50);if(Math.abs(camera.fov-fov)>.01){camera.fov=lerp(camera.fov,fov,1-Math.exp(-dt*3));camera.updateProjectionMatrix();}}
function updateTrain(dt){
  const T_=TRAIN;
  if(T_.state==='wait'){T_.wait-=dt;if(T_.wait<=0){T_.state='run';T_.v=12;}}
  else if(T_.state==='stop'){T_.stopT-=dt;T_.v=0;if(T_.stopT<=0){T_.state='depart';SND.horn({x:T_.x+T_.dir*12,y:2,z:TRACK_Z});}}
  else if(T_.state==='run'){const dist=(48-T_.x)*T_.dir;if(dist<=.05){T_.x=48;T_.v=0;T_.state='stop';T_.stopT=9;}else{const vt=Math.min(12,Math.sqrt(2*.9*dist)+.25);T_.v=T_.v>vt?vt:Math.min(vt,T_.v+1.2*dt);}}
  else if(T_.state==='depart'){T_.v=Math.min(12,T_.v+.9*dt);if(Math.abs(T_.x)>250){T_.state='wait';T_.wait=rr(14,26);T_.dir*=-1;T_.x=250*-T_.dir;}}
  if(T_.state==='run'||T_.state==='depart')T_.x+=T_.v*T_.dir*dt;
  T_.g.position.x=T_.x;T_.g.visible=T_.state!=='wait';
  T_.lights.forEach(l=>{l.hl.visible=l.s===T_.dir;});
  // crossing
  const ahead=-T_.x*T_.dir;const act=T_.state!=='wait'&&ahead>-16&&ahead<115;
  if(act&&!xingActive){xingT=0;}xingActive=act;xingT+=dt;
  gateK=act?(xingT>2.4?Math.min(1,gateK+dt/4.5):gateK):Math.max(0,gateK-dt/4);
  XING.arms.forEach(a=>{a.piv.rotation.z=a.dir*(1-smooth(0,1,gateK))*PI*.47;});
  if(act){bellT-=dt;if(bellT<=0){bellT=.52;lampPhase^=1;SND.kan({x:0,y:3,z:-30});}}else lampPhase=0;
  XING.lamps.forEach(l=>{const on=act&&((l.side>0)===(lampPhase===1));l.m.emissiveIntensity=on?2.2:0;l.g.forEach(g=>g.visible=on);});
  XING.arrows.forEach(a=>{a.m.emissiveIntensity=act&&a.dir===-T_.dir*a.armDir?1.4:0;});
  if(A.ready){setP(A.trainP,T_.x,1.5,TRACK_Z);const on=T_.state!=='wait';A.rum.g.gain.setTargetAtTime(on?.06+.34*T_.v/12:0,A.ctx.currentTime,.2);
    const brake=T_.state==='run'&&Math.abs(48-T_.x)<45&&T_.v>.4&&T_.v<9;A.brkG.gain.setTargetAtTime(brake?.012:0,A.ctx.currentTime,.3);
    T_.clack+=T_.v*dt;if(T_.clack>11&&on){T_.clack=0;SND.clack({x:T_.x,y:.5,z:TRACK_Z},T_.v/12);}}}
function updateVehicles(dt){
  // truck (lane z=-38.8, +x)
  const tr=TRUCK;if(tr.wait>0){tr.wait-=dt;tr.g.visible=false;if(tr.wait<=0){tr.x=-140;tr.v=tr.base;}}
  else{tr.g.visible=true;const ahead=P.pos.x-tr.x;const block=ahead>0&&ahead<7.5&&Math.abs(P.pos.z+38.8)<1.4;tr.v=lerp(tr.v,block?0:tr.base,1-Math.exp(-dt*(block?4:1)));
    if(block){tr.honk+=dt;if(tr.honk>3){tr.honk=-6;if(A.ready)SND.horn({x:tr.x,y:1,z:-38.8});}}else tr.honk=Math.min(tr.honk,0);
    tr.x+=tr.v*dt;if(tr.x>140){tr.wait=rr(25,55);}tr.g.position.set(tr.x,0,-38.8);
    if(A.ready){setP(A.truckP,tr.x,1,-38.8);A.engG.gain.setTargetAtTime(tr.g.visible?.05+.05*tr.v/8:0,A.ctx.currentTime,.2);A.eng.frequency.setTargetAtTime(40+tr.v*4,A.ctx.currentTime,.3);}}
  const cy_=CYC;const ahead=cy_.x-P.pos.x;const block=ahead>0&&ahead<5&&Math.abs(P.pos.z+42.3)<1.2;cy_.v=lerp(cy_.v,block?0:cy_.base,1-Math.exp(-dt*3));
  if(ahead>0&&ahead<9&&Math.abs(P.pos.z+42.3)<1.6){cy_.bell-=dt;if(cy_.bell<=0){cy_.bell=5;SND.bell({x:cy_.x,y:1,z:-42.3});}}
  cy_.x-=cy_.v*dt;if(cy_.x<-140)cy_.x=140;cy_.g.position.set(cy_.x,0,-42.3);cy_.ph+=cy_.v*dt*1.6;
  cy_.rider.legs[0].rotation.x=-1.0+Math.sin(cy_.ph)*.5;cy_.rider.legs[1].rotation.x=-1.0-Math.sin(cy_.ph)*.5;}
function petIdle(c,stay,dt){if(!stay||c.trick||DLG.open||c.rest||c.anim&&c.anim.type==='seq'){c.idleT=0;return;}c.idleT=(c.idleT||0)+dt;if(c.idleT<(c.nextIdle||9))return;c.idleT=0;c.nextIdle=rr(7,14);
  const p=W.pet,lv=petLv();if(!p||p.full<25||p.mood<30)return;const acts=['hop','hop'];if(lv>=2)acts.push('sit');if(lv>=3)acts.push('lie','lie');if(lv>=4&&!INDOOR)acts.push('zoom');if(lv>=5)acts.push('spin');if(lv>=6&&rand()<.3)acts.push('playdead');
  if(c.spr&&c.spr.meta.act){acts.push('wag','wag','stretch');if(lv>=3)acts.push('beg');}
  const a=pick(acts);if(a==='wag'||a==='stretch'||a==='beg'){c.anim={type:a,t:0,dur:a==='wag'?2.4:2};if(a==='wag'&&rand()<.5)petVoice();}else if(a==='hop'){petHop();if(rand()<.4)petVoice();}else if(a==='zoom'){c.zoom={t:0,a:Math.atan2(c.g.position.z-P.pos.z,c.g.position.x-P.pos.x)};petVoice();}else c.trick={type:a,t:0,dur:a==='lie'?6:TRICK_DUR[a]};}
function updateCats(dt){
  CATS.forEach(c=>{const p=c.g.position;let moving=false;
    if(c.isPet){let tx,tz,stay=false;
      if(HOME_IN&&performance.now()-HOME.lastMove>6000){tx=HX+PETBED.x;tz=HZ+PETBED.z;}
      else if(HOME_IN){const dx=P.pos.x-p.x,dz=P.pos.z-p.z,d=Math.hypot(dx,dz)||1;tx=P.pos.x-dx/d*1.0;tz=P.pos.z-dz/d*1.0;stay=d<1.4;}
      else if(INDOOR&&!CH_IN&&!MZ_IN&&!TC_IN&&!ST_IN){tx=16.5;tz=16.3;}else if(c.wait){tx=c.wx;tz=c.wz;}
      else{const dx=P.pos.x-p.x,dz=P.pos.z-p.z,d=Math.hypot(dx,dz)||1;if(d>28){p.set(P.pos.x-Math.sin(P.yaw)*1.6,P.pos.y,P.pos.z-Math.cos(P.yaw)*1.6);c.by=P.pos.y;}tx=P.pos.x-dx/d*1.4;tz=P.pos.z-dz/d*1.4;stay=d<2.1;}
      if(c.zoom){c.zoom.t+=dt;c.zoom.a+=dt*3;tx=P.pos.x+Math.cos(c.zoom.a)*2.3;tz=P.pos.z+Math.sin(c.zoom.a)*2.3;stay=false;if(c.zoom.t>3.4)c.zoom=null;}else petIdle(c,stay,dt);
      const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);
      if(!stay&&d>.35&&!c.trick&&(!c.isPet||petWake(c))){const hungry=W.pet&&W.pet.full<25;const sp=Math.min(hungry?3.4:6.8,.8+d*1.4);const tp={x:p.x+dx/d*sp*dt,y:p.y,z:p.z+dz/d*sp*dt};collide(tp,.25);
        // stuck behind something while following: after a moment, hop back next to the player instead of pushing the wall forever
        if(Math.hypot(tp.x-p.x,tp.z-p.z)<sp*dt*.25&&d>2.5){c.stuckT=(c.stuckT||0)+dt;if(c.stuckT>2.2){c.stuckT=0;tp.x=P.pos.x-Math.sin(P.yaw)*1.3;tp.z=P.pos.z-Math.cos(P.yaw)*1.3;c.by=P.pos.y;}}else c.stuckT=0;
        p.x=tp.x;p.z=tp.z;
        c.g.rotation.y=lerpAng(c.g.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*8));moving=true;}
      else if(!c.trick&&!INDOOR)c.g.rotation.y=lerpAng(c.g.rotation.y,Math.atan2(P.pos.x-p.x,P.pos.z-p.z),1-Math.exp(-dt*3));}
    else{
      if(c.follow>0){c.follow-=dt;const dx=P.pos.x-p.x,dz=P.pos.z-p.z,d=Math.hypot(dx,dz);if(d>1.8){c.tx=P.pos.x-dx/d*1.2;c.tz=P.pos.z-dz/d*1.2;c.state='walk';}else c.state='sit';if(c.follow<=0){toast(`${c.name}自己去散步了`);}}
      else{c.t-=dt;if(c.t<=0){if(c.state==='sit'){c.tx=c.home.x+rr(-5,5);c.tz=c.home.z+rr(-5,5);c.state='walk';c.t=10;}else{c.state='sit';c.t=rr(5,14);}}}
      if(c.state==='walk'){const dx=c.tx-p.x,dz=c.tz-p.z,d=Math.hypot(dx,dz);if(d<.25){if(c.follow<=0){c.state='sit';c.t=rr(5,14);}}else{const sp=c.follow>0?Math.min(3.4,1+d*.8):.85;
        const tp={x:p.x+dx/d*sp*dt,y:p.y,z:p.z+dz/d*sp*dt};collide(tp,.34);const moved=Math.hypot(tp.x-p.x,tp.z-p.z);p.x=tp.x;p.z=tp.z;if(moved<sp*dt*.3&&c.follow<=0){c.state='sit';c.t=rr(3,8);}
        c.g.rotation.y=lerpAng(c.g.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*6));moving=true;}}}
    let hop=0;if(c.hop>0){c.hop-=dt;hop=Math.abs(Math.sin((.6-c.hop)/.6*PI*2))*.3;}
    let sitPose=!moving;c.mv=moving;
    if(c.trick){c.trick.t+=dt;const k=c.trick.t,ty=c.trick.type;sitPose=true;if(ty==='spin'){c.g.rotation.y+=dt*6;sitPose=false;}if(ty==='dance'){c.g.rotation.y+=dt*4;hop=Math.abs(Math.sin(k*8))*.22;sitPose=false;}if(k>(c.trick.dur||2.2))c.trick=null;}
    const onBed=HOME_IN&&c.isPet&&Math.hypot(p.x-(HX+PETBED.x),p.z-(HZ+PETBED.z))<.4;c.by=lerp(c.by==null?p.y:c.by,onBed?.14:groundH(p.x,p.z),.3);p.y=c.by+hop;c.ph+=dt*(moving?9:1);
    c.legs.forEach((l,i)=>{l.rotation.x=moving?Math.sin(c.ph+(i%2?PI:0)+(i>1?PI/2:0))*.6:0;l.visible=!l.userData.hid&&(!sitPose||i<2);});
    if(c.trick&&c.trick.type==='paw')c.legs[0].rotation.x=-1.3;
    c.body.rotation.x=lerp(c.body.rotation.x,sitPose?-.45:0,.1);c.body.position.y=lerp(c.body.position.y,sitPose?.2:.22,.1);
    c.head.position.y=lerp(c.head.position.y,sitPose?.46:.36,.1);c.tail.rotation.z=Math.sin(time*(moving||hop?5:1.3)+c.ph)*.5;
    const sad=c.isPet&&W.pet&&W.pet.full<25;c.head.rotation.x=lerp(c.head.rotation.x,sad?.35:0,.1);c.head.rotation.y=moving||c.isPet?0:Math.sin(time*.3+c.ph)*.5;});}
function updateBirds(dt){
  BIRDS.forEach(b=>{if(b.type==='gull'){b.g.visible=S.night<.6;const a=b.ph+time*b.sp;const x=b.cx+Math.cos(a)*b.r,z=b.cz+Math.sin(a)*b.r,y=b.y+Math.sin(time*.3+b.ph)*2;
      b.g.position.set(x,y,z);b.g.rotation.y=-a+(b.sp>0?0:PI);b.g.rotation.z=Math.sin(time*.4+b.ph)*.25*Math.sign(b.sp);const fl=Math.sin(time*.5+b.ph)>.3?Math.sin(time*7+b.ph)*.5:.08;b.w[0].rotation.z=fl;b.w[1].rotation.z=-fl;}
    else{b.g.visible=S.dusk>.4;const cyc=(time*9+b.off)%700;const x=-350+cyc,z=-80+cyc*.3+b.dz,y=38+b.dy+Math.sin(time*.8+b.ph)*1.5;b.g.position.set(x,y,z);b.g.rotation.y=Math.atan2(1,.3);const fl=Math.sin(time*8+b.ph)*.6;b.w[0].rotation.z=fl;b.w[1].rotation.z=-fl;}});}
function updateAmbient(dt){
  // motes
  MOTES.m.opacity=.5*S.motes;MOTES.p.visible=S.motes>.02;if(MOTES.p.visible){const p=MOTES.pos;for(let i=0;i<MOTES.n;i++){p[i*3]+=Math.sin(time*.3+i)*.004+.01;p[i*3+1]+=Math.sin(time*.5+i*1.3)*.003;p[i*3+2]+=Math.cos(time*.27+i)*.004;}
    MOTES.p.position.set(Math.floor(camera.position.x/28)*28,camera.position.y-3,Math.floor(camera.position.z/28)*28);
    for(let i=0;i<MOTES.n;i++){for(let k=0;k<3;k+=2){const base=k===0?MOTES.p.position.x:MOTES.p.position.z,cc=k===0?camera.position.x:camera.position.z;let v=p[i*3+k]+base;if(v-cc>14)p[i*3+k]-=28;if(v-cc<-14)p[i*3+k]+=28;}if(p[i*3+1]>7)p[i*3+1]=0;}
    MOTES.p.geometry.attributes.position.needsUpdate=true;}
  // fireflies
  const nf=S.night;FLIES.p.visible=nf>.05;if(FLIES.p.visible){for(let i=0;i<FLIES.n;i++){const b=FLIES.base[i];FLIES.pos[i*3]=b[0]+Math.sin(time*.3+b[3])*1.5;FLIES.pos[i*3+1]=b[1]+Math.sin(time*.5+b[3]*2)*.6;FLIES.pos[i*3+2]=b[2]+Math.cos(time*.25+b[3])*1.5;
    const k=Math.pow(Math.max(0,Math.sin(time*1.4+b[3]*3)),3)*nf;FLIES.c[i*3]=.8*k;FLIES.c[i*3+1]=1*k;FLIES.c[i*3+2]=.45*k;}FLIES.p.geometry.attributes.position.needsUpdate=true;FLIES.p.geometry.attributes.color.needsUpdate=true;}
  BOATS.forEach(b=>{b.g.position.y=SEA_Y+Math.sin(time*.8+b.ph)*.25;b.g.rotation.z=Math.sin(time*.6+b.ph)*.04;});
  GLASS.forEach(g=>{if(g.got)return;g.s.material.opacity=(.35+.65*Math.pow(Math.max(0,Math.sin(time*2.2+g.x)),6))*(.4+.6*(1-S.day*.5));g.m.rotation.y+=dt;});
  barberPoles.forEach(t=>{t.offset.y=(t.offset.y+dt*.35)%1;});
  // lighthouse flashes: red every 4s
  lhT=(time%4);const fl=lhT<.5?Math.sin(lhT/.5*PI):0;const vis=.35+.65*S.lamps;COAST.lampMat.emissiveIntensity=fl*2.5*vis;COAST.lampGlow.material.opacity=fl*vis;
  COAST.beam.rotation.y=time*.5;COAST.beamMat.opacity=S.night*.09;
  if(flickerLamp){const on=Math.sin(time*23)>-.2&&Math.sin(time*3.1)>-.7||Math.sin(time*.7)>.5;flickerLamp.material.opacity=(on?1:.12)*S.lamps;}
  for(let i=HEARTS.length-1;i>=0;i--){const h=HEARTS[i];h.t+=dt;h.s.position.y+=dt*.5;h.s.material.opacity=Math.max(0,1-h.t/1.6);if(h.t>1.6){scene.remove(h.s);HEARTS.splice(i,1);}}
  GRASS_T.value=time;
  // audio beds
  if(A.ready){const c=A.ctx,t=c.currentTime,pz=P.pos.z;
    const ds=Math.max(0,pz+58.5),near=P.pos.x>72&&pz<-44?1:0;const wv=Math.min(.42,.3/(1+ds/20)+.05+near*.15);
    A.wave.g.gain.setTargetAtTime(wv*(.75+.25*Math.sin(time*.23)),t,.4);A.wave2.g.gain.setTargetAtTime(wv*.25,t,.4);
    A.wind.g.gain.setTargetAtTime(.02+.018*Math.max(0,Math.sin(time*.11))+(P.pos.y>3?.02:0)+near*.02,t,.6);A.wind.fl.frequency.setTargetAtTime(320+120*Math.sin(time*.07),t,.5);
    A.cic.g.gain.setTargetAtTime(0,t,.3);   // cicada hiss removed (too shrill on phones)
    const n=A.next;
    if((n.wave-=dt)<=0){n.wave=rr(5,9);SND.wave({x:P.pos.x+rr(-15,15),y:-1,z:-58.5},Math.min(1,1.1/(1+ds/25)));}
    A.amb.gain.setTargetAtTime(INDOOR?.22:1,t,.3);
    if(INDOOR){n.hig=Math.max(n.hig,2);n.crk=Math.max(n.crk,1);n.gull=Math.max(n.gull,3);n.crow=Math.max(n.crow,3);n.bird=Math.max(n.bird,2);}
    if(S.dusk>.4&&(n.hig-=dt)<=0){n.hig=rr(7,16);SND.higurashi({x:P.pos.x+rr(-40,40),y:12,z:Math.max(P.pos.z+20,rr(60,95))});}
    if(S.night>.4&&(n.crk-=dt)<=0){n.crk=rr(.4,1.6);const a=rand()*6.28;SND.cricket({x:P.pos.x+Math.cos(a)*rr(5,18),y:.2,z:P.pos.z+Math.sin(a)*rr(5,18)});}
    if(S.day>.4&&(n.bird-=dt)<=0){n.bird=rr(3,8);SND.chirp({x:P.pos.x+rr(-20,20),y:6,z:P.pos.z+rr(5,30)});}
    if(S.night<.5&&(n.gull-=dt)<=0){n.gull=rr(9,20);SND.gull({x:P.pos.x+rr(-30,30),y:18,z:-70});}
    if(S.dusk>.4&&(n.crow-=dt)<=0){n.crow=rr(14,28);SND.crow({x:P.pos.x+rr(-40,40),y:30,z:P.pos.z+rr(10,60)});}
    musicTick();
    const L=c.listener;const f=new T.Vector3();camera.getWorldDirection(f);
    if(L.positionX){L.positionX.value=camera.position.x;L.positionY.value=camera.position.y;L.positionZ.value=camera.position.z;L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0;}
    else{L.setPosition(camera.position.x,camera.position.y,camera.position.z);L.setOrientation(f.x,f.y,f.z,0,1,0);}}}
function applyEnv(){
  skyU.uTop.value.copy(S.skyTop);skyU.uHor.value.copy(S.skyHorizon);skyU.uBot.value.copy(S.skyBottom);skyU.uFog.value.copy(S.fog);skyU.uSunDir.value.copy(S.sunDir);
  skyU.uGlowCol.value.copy(S.glowCol);skyU.uCloudLit.value.copy(S.cloudLit);skyU.uCloudDark.value.copy(S.cloudDark);skyU.uDisk.value=S.disk;skyU.uGlow.value=S.glow;skyU.uClouds.value=S.clouds;skyU.uStars.value=S.stars;skyU.uTime.value=time;
  scene.fog.color.copy(S.fog);scene.fog.near=S.fogNear;scene.fog.far=S.fogFar;
  hemi.color.copy(S.hemiSky);hemi.groundColor.copy(S.hemiGround);hemi.intensity=S.hemiI;sun.color.copy(S.sunColor);sun.intensity=S.sunI;renderer.toneMappingExposure=S.exposure;
  seaU.uTime.value=time;seaU.uSunDir.value.copy(S.sunDir);seaU.uSunCol.value.copy(S.glowCol);seaU.uTop.value.copy(S.skyTop);seaU.uHor.value.copy(S.skyHorizon);seaU.uDeep.value.copy(S.seaDeep);seaU.uShallow.value.copy(S.seaShallow);
  seaU.uFog.value.copy(S.fog);seaU.uFogNear.value=S.fogNear;seaU.uFogFar.value=S.fogFar;seaU.uSunI.value=S.seaSun;seaU.uLight.value=S.light;
  EM.windows.forEach(m=>m.emissiveIntensity=S.windows);TRAIN.sideMat.emissiveIntensity=.25+S.windows*.9;
  EM.signs.forEach(m=>m.emissiveIntensity=.3+S.lamps*.85);EM.lamps.forEach(m=>m.emissiveIntensity=.08+S.lamps*1.5);EM.store.forEach(m=>m.emissiveIntensity=.55+S.lamps*.55);
  GLOWM.forEach(({m,kind,base})=>{m.opacity=base*(kind==='lamp'?S.lamps:kind==='night'?S.night:kind==='sign'?(.25+.75*S.lamps):kind==='train'?(.3+.7*S.lamps):1);});
  sun.position.copy(P.pos).addScaledVector(S.sunDir,160);sun.target.position.copy(P.pos);INKU.max.value.copy(sun.color).multiplyScalar(sun.intensity);}
function updateUI(dt){
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('show');}
  if(areaT>0){areaT-=dt;if(areaT<=0)$('areaTitle').classList.remove('show');}areaCool-=dt;
  if(DLG.open&&DLG.typed<DLG.full.length){DLG.typed=Math.min(DLG.full.length,DLG.typed+dt*42);$('dialog').querySelector('.txt').textContent=DLG.full.slice(0,Math.floor(DLG.typed));if(DLG.typed>=DLG.full.length)lineDone();}
  // nearest interaction
  nearest=null;let best=1e9;
  if(!DLG.open&&!P.sit&&started&&!uiOpen()){for(const it of INT){if(it.glass&&it.glass.got)continue;if(it.hide&&it.hide())continue;if(it.cat&&it.cat.isPet)continue;const pos=it.cat?it.cat.g.position:it.pos;const dx=pos.x-P.pos.x,dz=pos.z-P.pos.z,d=Math.hypot(dx,dz);if(d>(IS_TOUCH?it.r*1.45+.35:it.r)||Math.abs(pos.y-P.pos.y)>2.2)continue;if(d<best){best=d;nearest=it;}}}
  if(R2.on)nearest=(!DLG.open&&!P.sit&&started&&!uiOpen())?r2Nearest():(R2.near=null);
  if(S2.on)nearest=(!DLG.open&&!P.sit&&started&&!uiOpen())?s2Nearest():(S2.near=null);
  const pr=$('prompt');
  if(P.sit&&!DLG.open){$('promptTxt').textContent='站起來';pr.classList.add('show');actVerb('站起來');}
  else if(nearest){const L_=typeof nearest.label==='function'?nearest.label():nearest.label;$('promptTxt').textContent=L_;pr.classList.add('show');actVerb(L_);}else{pr.classList.remove('show');actVerb(DLG.open?'下一句':'');}
  if(!RTC.local){const n=new Date();$('clock').textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')} · ${n.getMonth()+1}月${n.getDate()}日`;}
  else{const p=PRESETS[ORDER[todIdx]];const mins=Math.floor((performance.now()-clockBase)/5000);const tm=p.clock[0]*60+p.clock[1]+mins;$('clock').textContent=`${String(Math.floor(tm/60)%24).padStart(2,'0')}:${String(tm%60).padStart(2,'0')} · 預覽`;}}
// ================= 即時同步：同時上線的同學看得到彼此（Firestore shiomi/pres/live/<seat>，輪詢；每台裝置每天有時間上限，保護免費額度） =================
const PRES={others:{},wNext:0,pNext:0,last:null,used:0,day:'',stop:false,told:false,me:null,srvT:0,srvAt:0,hb:0,busy:false,polls:0};
function presArea(){return MZ_IN?'mz':ISL_IN?'isl':CY_IN?'cy':P.pos.x>2300?'tribe':'town';}
function presMax(){return Math.max(0,+(CFG.presenceMin==null?40:CFG.presenceMin))*60;}
function presLoad(){const d=todayStr();if(PRES.day!==d){PRES.day=d;let u=0;try{u=+localStorage.getItem('shiomi-pres:'+d)||0;}catch(e){}PRES.used=u;PRES.stop=false;PRES.told=false;}}
function presOk(){return started&&W.seat&&HOSTED&&CFG.presence!==false&&CLOUD.st!=='fail'&&!document.hidden&&!CUTON&&!PRES.stop;}
function presData(){const L=W.look||{};return {seat:String(W.seat),name:W.name||'',ch:L.ch&&L.ch!=='custom'?L.ch:LOOK_DEF.ch,fe:L.fe,fn:L.fn,fm:L.fm,x:+P.pos.x.toFixed(2),z:+P.pos.z.toFixed(2),yaw:+P.yaw.toFixed(2),ar:presArea(),in:INDOOR||HOME_IN||R2.on||S2.on?1:0,w:PRES.w||0,wt:PRES.wt||'',s:PRES.s||null};}
async function presWrite(){const d=presData();PRES.me=d;PRES.lastW=Date.now();
  try{const r=await fbReq('/pres/live/'+String(W.seat).replace(/[^0-9A-Za-z-]/g,''),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{d:{stringValue:JSON.stringify(d)}}})});
    if(r.ok){const j=await r.json();PRES.srvT=Date.parse(j.updateTime)||PRES.srvT;PRES.srvAt=Date.now();}}catch(e){}}
async function presPoll(){let j;try{const r=await fbReq('/pres/live?pageSize=20');if(!r.ok)return;j=await r.json();}catch(e){return;}
  const now=PRES.srvT?PRES.srvT+(Date.now()-PRES.srvAt):Date.now(),seen={};let fresh=0;
  (j.documents||[]).forEach(doc=>{let d;try{d=JSON.parse(doc.fields.d.stringValue);}catch(e){return;}if(!d||!d.seat||d.seat===String(W.seat))return;
    const ut=Date.parse(doc.updateTime)||0;if(now-ut>16000)return;fresh++;seen[d.seat]=1;presUpsert(d);});
  Object.keys(PRES.others).forEach(k=>{if(!seen[k])PRES.others[k].gone=true;});PRES.fresh=fresh;}
function presTag(text){const [c,g]=C2(256,64);g.font=`800 30px ${FG}`;const w=Math.min(250,g.measureText(text).width+28);g.fillStyle='rgba(22,18,31,.72)';rrect(g,(256-w)/2,8,w,48,22);g.fill();g.fillStyle='#fff3dd';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,33);
  const sp=new T.Sprite(new T.SpriteMaterial({map:TX(c),transparent:true,depthWrite:false}));sp.scale.set(1.9,.48,1);sp.renderOrder=8;scene.add(sp);return sp;}
function presUpsert(d){let o=PRES.others[d.seat];const nm=d.seat==='T'?'老師':`${d.seat} 號 ${d.name||''}`;
  if(!o){o=PRES.others[d.seat]={seat:d.seat,pos:new T.Vector3(d.x,groundH(d.x,d.z),d.z),tgt:new T.Vector3(),yaw:d.yaw||0,ph:0,amt:0,c:null,ch:null,tag:presTag(nm),nm,lastW:d.w||0,lastS:d.s?d.s.t:0,bub:null,bubT:0,vis:false,hello:false,wave:0};
    inter(o.pos,2.2,()=>`跟 ${o.nm} 說話 💬`,()=>presTalk(o),{hide:()=>!o.vis});}
  o.d=d;o.gone=false;o.tgt.set(d.x,groundH(d.x,d.z),d.z);if(o.nm!==nm){o.nm=nm;scene.remove(o.tag);o.tag=presTag(nm);}
  if(o.ch!==d.ch&&SPRITES[d.ch]){if(o.c)dropSpr(o.c);o.c=makeSpr(d.ch,1.62,{e:d.fe,n:d.fn,m:d.fm});o.ch=d.ch;}
  if((d.w||0)>o.lastW){o.lastW=d.w;o.wave=2.6;if(d.wt===String(W.seat)){SND.pick&&SND.pick();toast(`👋 ${nm} 跟你打招呼！`);}}
  if(d.s&&d.s.t>(o.lastS||0)&&typeof d.s.x==='string'){o.lastS=d.s.t;const tx=d.s.x.slice(0,20);if(o.bub)scene.remove(o.bub);o.bub=presBubble(tx);o.bubT=7;if(o.vis||d.s.to===String(W.seat)){SND.pick&&SND.pick();toast(`💬 ${nm}${d.s.to===String(W.seat)?' 對你說':''}：「${tx}」`);}}}
// quick chat: a few ready-made lines + typing your own (≤20 字, unkind words blocked); shows as a speech bubble over your head on everyone's screen
const PRES_LINES=['嗨！你好～','一起去投籃！','來我家玩！','跟我來！','好厲害！','掰掰～'];
function presBubble(text){const [c,g]=C2(512,96);g.font=`800 34px ${FG}`;const w=Math.min(500,g.measureText(text).width+44);g.fillStyle='rgba(255,255,255,.96)';rrect(g,(512-w)/2,6,w,70,26);g.fill();
  g.beginPath();g.moveTo(244,74);g.lineTo(256,92);g.lineTo(268,74);g.fill();g.strokeStyle='rgba(60,40,30,.25)';g.lineWidth=3;rrect(g,(512-w)/2,6,w,70,26);g.stroke();g.fillStyle='#3a2a20';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,42);
  const sp=new T.Sprite(new T.SpriteMaterial({map:TX(c),transparent:true,depthWrite:false,depthTest:false}));sp.scale.set(3.2,.6,1);sp.renderOrder=9;sp.visible=false;scene.add(sp);return sp;}
function presTalk(o){choose(o.nm,'要跟同學說什麼？',[{label:'👋 打招呼',fn:()=>presWave(o)},...PRES_LINES.map(t=>({label:t,fn:()=>presSay(o,t)})),{label:'✏️ 自己打一句',fn:()=>presType(o)},{label:'算了',fn:null}]);}
function presType(o){setTimeout(()=>{let t='';try{t=(prompt(`想對 ${o.nm} 說什麼？（最多 20 個字）`)||'').trim();}catch(e){}if(!t)return;t=t.replace(/\s+/g,' ').slice(0,20);
  if(MSG_BAD.some(w=>t.includes(w))){say(null,['這句話可能會讓同學難過，換個說法吧！'],{noWave:1});return;}presSay(o,t);},60);}
function presSay(o,t){const now=Date.now();if(now-(PRES.sAt||0)<3000){toast('慢一點，等一下再說喔');return;}PRES.sAt=now;PRES.s={t:now,x:t,to:o.seat};PRES.wNext=0;
  if(PRES.myBub)scene.remove(PRES.myBub);PRES.myBub=presBubble(t);PRES.myBubT=7;toast(`你對 ${o.nm} 說：「${t}」`);}
function presWave(o){PRES.w=Date.now();PRES.wt=o.seat;PRES.wNext=0;try{if(!INDOOR)actPlay('wave');}catch(e){}toast(`你向 ${o.nm} 揮揮手 👋`);}
function presHideAll(){Object.values(PRES.others).forEach(o=>{o.vis=false;if(o.c)sprShow(o.c,false);o.tag.visible=false;if(o.bub)o.bub.visible=false;});if(PRES.myBub)PRES.myBub.visible=false;}
function presTick(dt){presLoad();
  if(!presOk()){presHideAll();return;}
  const me=presData(),now=Date.now();PRES.used+=dt;if(Math.floor(PRES.used)%15===0){try{localStorage.setItem('shiomi-pres:'+PRES.day,String(Math.round(PRES.used)));}catch(e){}}
  if(PRES.used>presMax()){PRES.stop=true;presHideAll();if(!PRES.told){PRES.told=true;toast('今天的「線上看到同學」時間用完了，明天再見！（存檔不受影響）');}fbReq('/pres/live/'+String(W.seat).replace(/[^0-9A-Za-z-]/g,''),{method:'DELETE'}).catch(()=>{});return;}
  // write: when you moved / turned / waved (at most every 2 s), otherwise a heartbeat every 8 s
  const L=PRES.me,moved=!L||Math.hypot(me.x-L.x,me.z-L.z)>.25||Math.abs(me.yaw-L.yaw)>.35||me.ar!==L.ar||me.in!==L.in||me.w!==L.w||(me.s&&(!L.s||me.s.t!==L.s.t));
  if(!PRES.busy&&now>PRES.wNext&&(moved||now-(PRES.lastW||0)>(me.in?20000:8000))){PRES.busy=true;PRES.wNext=now+2000;presWrite().finally(()=>{PRES.busy=false;});}
  if(now>PRES.pNext){PRES.pNext=now+(me.in?30000:PRES.fresh?4000:15000);presPoll();}
  // draw everyone who is outdoors in the same place as you
  const hereOut=!me.in;
  Object.values(PRES.others).forEach(o=>{const d=o.d;const show=hereOut&&!o.gone&&d&&!d.in&&d.ar===me.ar&&o.c;
    if(o.bubT>0)o.bubT-=dt;
    if(!show){if(o.vis){o.vis=false;if(o.c)sprShow(o.c,false);o.tag.visible=false;}if(o.bub)o.bub.visible=false;return;}
    if(!o.vis){o.vis=true;o.pos.copy(o.tgt);if(!o.hello){o.hello=true;toast(`👋 ${o.nm} 也在這裡！走過去可以打招呼`);}}
    const dx=o.tgt.x-o.pos.x,dz=o.tgt.z-o.pos.z,dd=Math.hypot(dx,dz);if(dd>12){o.pos.copy(o.tgt);}
    const sp=dd>.05?Math.min(dd,Math.max(1.2,dd*1.6)*dt):0;if(sp>0){o.pos.x+=dx/dd*sp;o.pos.z+=dz/dd*sp;o.yaw=lerpAng(o.yaw,Math.atan2(dx,dz),1-Math.exp(-dt*10));}else o.yaw=lerpAng(o.yaw,d.yaw||0,1-Math.exp(-dt*4));
    o.pos.y=groundH(o.pos.x,o.pos.z);o.amt=lerp(o.amt,clamp(sp/Math.max(dt,1e-3)/3.9,0,1.15),1-Math.exp(-dt*8));o.ph+=o.amt*3.9*dt*2.1;
    sprShow(o.c,true);sprPose(o.c,o.pos,o.yaw,o.ph,o.amt,time);o.tag.visible=true;o.tag.position.set(o.pos.x,o.pos.y+2.15+(o.wave>0?.25*Math.abs(Math.sin(time*8)):0),o.pos.z);
    if(o.bub){o.bub.visible=o.bubT>0;if(o.bub.visible)o.bub.position.set(o.pos.x,o.pos.y+2.75,o.pos.z);}
    if(o.wave>0){o.wave-=dt;o.tag.material.opacity=1;}});
  if(PRES.myBub){PRES.myBubT-=dt;PRES.myBub.visible=PRES.myBubT>0&&!me.in;if(PRES.myBub.visible)PRES.myBub.position.set(P.pos.x,P.pos.y+2.6,P.pos.z);}}
addEventListener('pagehide',()=>{if(W.seat&&PRES.me)fbReq('/pres/live/'+String(W.seat).replace(/[^0-9A-Za-z-]/g,''),{method:'DELETE',keepalive:true}).catch(()=>{});});
function frame(){
  const rawDt=Math.min(.3,clock.getDelta()),dt=Math.min(.1,rawDt);FRAME_RAW=rawDt;time+=dt;   // up to 1/10 s per frame: a slow tablet stays choppy-but-real-speed instead of slow motion
  realTick(dt);
  if(envK<1){envK=Math.min(1,envK+dt/3.4);blendState(envFrom,envTo,envK*envK*(3-2*envK),S);}
  updatePlayer(dt);dustTick(dt);if(GOALM.visible){GOALM.userData.t+=dt;const k=1+.15*Math.sin(GOALM.userData.t*6);GOALM.scale.set(k,1,k);if(!P.goal)GOALM.visible=false;}questTick(dt);martTick(dt);updateTrain(dt);updateVehicles(dt);updateCats(dt);updateBirds(dt);updateCamera(dt);cutCam(dt);sprTick(dt);homeTick(dt);reqTick(dt);updateAmbient(dt);applyEnv();advTick(dt);cabTick(dt);cutFx(dt);inkPerf(dt);tbTick(dt);try{presTick(dt);}catch(e){}
  if(!CUTON&&(areaTick-=dt)<=0){areaTick=.3;areaCheck();}
  updateUI(dt);updateMarkers();blinkPeople(dt);trackerTick(dt);TM.ring.rotation.z+=dt*.8;sky.position.copy(camera.position);ridgeTick();
  if(S2.retry&&ST_IN&&!S2.on&&!CUTON&&started&&s2Ok()){s2Enter();}
  if(R2.on)r2Draw(dt);else if(S2.on)s2Draw(dt);else if(h2Active())h2Draw(dt);else{h2Hide();renderer.render(scene,camera);}requestAnimationFrame(frame);}
try{console.log('detail materials',detPass(scene));}catch(e){console.error(e);}
applyEnv();clockBase=performance.now();
requestAnimationFrame(frame);
renderer.compile(scene,camera);
const sb=$('startBtn');sb.disabled=false;sb.textContent='開始闖關 Start';if(!IS_TOUCH)$('inSeat').focus({preventScroll:true});
})().catch(e=>{console.error(e);const b=document.getElementById('startBtn');if(b){b.textContent='小鎮蓋不起來';b.disabled=true;}
  const p=document.createElement('p');p.className='t-err';p.textContent='這台裝置無法顯示 3D 畫面（'+(e&&e.message||e)+'）。請改用 Chrome 或 Safari 開啟，或換一台電腦試試。';
  const side=document.querySelector('.t-side');if(side)side.appendChild(p);});
