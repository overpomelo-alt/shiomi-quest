  // 平等國小: a real-looking mountain primary school — 3-storey classroom block with open corridors facing the field,
  // red-tile roof cap, stair tower with clock, flag platform, PU track, covered basketball court (風雨球場), gate & fence
  {const SG=new T.Group();G.add(SG);const Y0=H(-61,30);
   const B=(w,h,d,m,x,y,z,ni)=>{const o=mk(bx(w,h,d),m,x,Y0+y,z,SG,!ni);if(ni)o.userData.noInk=1;return o;};
   const WALL=lam('#f0e3c4'),WALL2=lam('#e6d5b0'),COLR=lam('#b5604a'),PARA=lam('#f7f3ea'),BAND=lam('#3f8a8a'),SLAB=lam('#d9d2c4'),ROOFR=lam('#b0503a'),
     DOORG=lam('#4f8a6a'),GLASS=lam('#bcd9e6'),FRAME=lam('#5d6b6f'),STONE=lam('#9a958a'),METAL=lam('#8fa0ad'),COURT=lam('#3d6fa8'),WHITE=lam('#f4f2ec');
   const x0=-73,x1=-53,L=x1-x0,cx=(x0+x1)/2,zb=15.6,zc=20,zf=22,fh=3.3,NF=3,HT=NF*fh;
   // classroom block + corridor slabs, columns and parapets
   B(L,HT,zc-zb,WALL,cx,HT/2,(zb+zc)/2);B(L+.1,.6,zc-zb+.1,WALL2,cx,.3,(zb+zc)/2);
   B(L,.16,zf-zc+.2,SLAB,cx,.08,(zc+zf)/2+.1,true);
   for(let k=1;k<=NF;k++){B(L+.3,.28,zf-zc+.45,SLAB,cx,k*fh,(zc+zf)/2+.12);}
   for(let k=1;k<NF;k++){B(L+.3,1,.2,PARA,cx,k*fh+.62,zf+.25);B(L+.32,.2,.24,BAND,cx,k*fh+1.02,zf+.25);}
   B(L+.3,.9,.2,PARA,cx,HT+.55,zf+.25);B(L+.32,.2,.24,BAND,cx,HT+.9,zf+.25);
   const nb=5,bw=L/nb;for(let i=0;i<=nb;i++)B(.45,HT,.45,COLR,x0+i*bw,HT/2,zf+.1);
   for(let k=0;k<NF;k++)for(let i=0;i<nb;i++){const bx0=x0+i*bw,y=k*fh;B(1.05,2.15,.08,DOORG,bx0+.95,y+1.1,zc+.04);
     [bw*.5,bw*.78].forEach(o=>{B(1.25,1.15,.06,FRAME,bx0+o+.2,y+1.75,zc+.03,true);B(1.1,1,.07,GLASS,bx0+o+.2,y+1.75,zc+.05,true);});
     [bw*.3,bw*.7].forEach(o=>{B(1.4,1.2,.06,FRAME,bx0+o,y+1.75,zb-.03,true);B(1.25,1.05,.07,GLASS,bx0+o,y+1.75,zb-.05,true);});}
   // red-tile pitched roof cap over the whole block
   {const D=zf-zb+1.2,half=D/2,rh=1.7,sl=Math.hypot(half,rh),zm=(zb+zf)/2;[-1,1].forEach(s=>{const r=B(L+1,.16,sl,ROOFR,cx,HT+.35+rh/2,zm+s*half/2);r.rotation.x=s*Math.atan2(rh,half);});
     const sh=new T.Shape();sh.moveTo(-half,0);sh.lineTo(half,0);sh.lineTo(0,rh);sh.closePath();[x0-.45,x1+.45].forEach(x=>{const e=mk(new T.ExtrudeGeometry(sh,{depth:.1,bevelEnabled:false}),WALL,x,Y0+HT+.35,zm,SG);e.rotation.y=PI/2;});}
   // stair tower + clock at the east end
   {const tx=-51.4,tz=18.6;B(3.4,HT+2,5.4,WALL2,tx,(HT+2)/2,tz);B(3.6,.3,5.6,COLR,tx,HT+2.1,tz);B(.9,HT-1,.08,GLASS,tx,HT/2+.6,tz+2.72,true);
     for(let k=0;k<NF;k++)B(1.2,.12,.12,FRAME,tx,k*fh+1.9,tz+2.76,true);
     const ck=mk(new T.CylinderGeometry(.75,.75,.12,24),WHITE,tx,Y0+HT+1.2,tz+2.78,SG,false);ck.rotation.x=PI/2;mk(new T.CylinderGeometry(.85,.85,.08,24),FRAME,tx,Y0+HT+1.2,tz+2.72,SG,false).rotation.x=PI/2;
     B(.06,.5,.04,FRAME,tx,HT+1.42,tz+2.86,true);const hh=B(.06,.38,.04,FRAME,tx+.13,HT+1.15,tz+2.86,true);hh.rotation.z=1.1;}
   addCol(TB.x+x0,TB.x+x1,zb,zc,Y0+HT+3);addCol(TB.x-53.1,TB.x-49.7,15.9,21.3,Y0+HT+3);
   for(let i=0;i<=nb;i++)addCol(TB.x+x0+i*bw-.25,TB.x+x0+i*bw+.25,zf-.15,zf+.35,Y0+HT);
   sign(cx,Y0+HT+1.55,zf+.4,0,'臺中市和平區平等國民小學',8.4,'#2f6b4a','#fff6dc');
   // flag platform + 3 poles
   {const fx=-63,fz=24.9;B(4.4,.6,2.2,STONE,fx,.3,fz);B(4.6,.1,2.4,WALL2,fx,.62,fz,true);[0,1].forEach(k=>B(2,.2,.35,STONE,fx,.1,fz+1.25+k*.3,true));
     [-1.5,0,1.5].forEach((o,i)=>{mk(cy(.05,.06,i===1?8:7,8),METAL,fx+o,Y0+.6+(i===1?4:3.5),fz-.6,SG);});addCol(TB.x+fx-2.2,TB.x+fx+2.2,fz-1.1,fz+1.1,Y0+.7);
     const fl=mk(new T.PlaneGeometry(1.3,.85),lam('#3d6fa8',{side:T.DoubleSide}),fx+.66,Y0+8.1,fz-.6,G,false);TB.flag=fl;
     for(let k=0;k<4;k++){mk(ico(.45,0),pick([M.leaf,M.leaf2]),fx-5+k*1.2,Y0+.45,fz,G,false);mk(sph(.12,6,5),lam(pick(['#f06a8a','#f2c14e','#f7f2e8'])),fx-5+k*1.2,Y0+.85,fz,G,false);}}
   // bulletin board (公告欄)
   {const bx0=-56.5,bz=23.6;[-1.3,1.3].forEach(o=>{B(.14,2.4,.14,FRAME,bx0+o,1.2,bz);addCol(TB.x+bx0+o-.15,TB.x+bx0+o+.15,bz-.15,bz+.15,Y0+2.4);});B(2.6,1.4,.1,lam('#3f6b4a'),bx0,1.6,bz);B(2.9,.12,.5,ROOFR,bx0,2.42,bz);
     ['#f7f2e8','#f2c14e','#bfe3f5','#f6b0a0'].forEach((c,k)=>B(.5,.6,.02,lam(c),bx0-.9+k*.6,1.6+(k%2?.12:-.1),bz+.07,true));}
   // PU track + infield
   {const [c,q]=C2(512,280);q.fillStyle='#b8573f';q.fillRect(0,0,512,280);q.fillStyle='#5f9a48';q.beginPath();q.ellipse(256,140,190,82,0,0,7);q.fill();
     q.strokeStyle='rgba(255,255,255,.9)';q.lineWidth=2.5;for(let k=0;k<4;k++){q.beginPath();q.ellipse(256,140,194+k*14,86+k*14,0,0,7);q.stroke();}
     q.globalAlpha=.25;q.fillStyle='#4a8a3c';for(let k=0;k<9;k++)q.fillRect(80+k*40,62,20,156);q.globalAlpha=1;q.strokeStyle='rgba(255,255,255,.85)';q.lineWidth=2;q.strokeRect(186,104,140,72);q.beginPath();q.moveTo(256,104);q.lineTo(256,176);q.stroke();
     const fm=mk(new T.PlaneGeometry(21,12),lam('#ffffff',{map:TX(c),polygonOffset:true,polygonOffsetFactor:-2}),-62,Y0+.06,34,G,false);fm.rotation.x=-PI/2;}
   // covered basketball court (風雨球場)
   {const kx=-48.5,kz=33.5,kw=5.6,kl=12;const [c,q]=C2(128,256);q.fillStyle='#3d6fa8';q.fillRect(0,0,128,256);q.fillStyle='#c8573f';q.fillRect(8,8,112,240);q.strokeStyle='#fff';q.lineWidth=3;q.strokeRect(10,10,108,236);q.beginPath();q.moveTo(10,128);q.lineTo(118,128);q.stroke();
     q.beginPath();q.arc(64,128,18,0,7);q.stroke();[10,246].forEach(y=>{q.beginPath();q.arc(64,y,40,y<100?0:PI,y<100?PI:2*PI);q.stroke();});
     const ct=mk(new T.PlaneGeometry(kw,kl),lam('#ffffff',{map:TX(c),polygonOffset:true,polygonOffsetFactor:-3}),kx,Y0+.07,kz,G,false);ct.rotation.x=-PI/2;
     for(let i=0;i<4;i++)[-1,1].forEach(s=>{const z=kz-kl/2+i*kl/3,x=kx+s*(kw/2+.25);B(.3,6.2,.3,METAL,x,3.1,z);addCol(TB.x+x-.2,TB.x+x+.2,z-.2,z+.2,Y0+6);});
     for(let k=0;k<7;k++){const a=-.55+k*1.1/6,r=B(kw+1.4,.12,kl/6.5,lam('#a9b6bf'),kx,6.25+Math.cos(a*1.2)*.9-.2,kz);r.scale.set(1,1,1);r.position.z=kz;r.rotation.x=0;}
     {const ar=new T.Group();ar.position.set(kx,Y0+6.2,kz);SG.add(ar);for(let k=0;k<8;k++){const a=-.6+k*1.2/7,seg=mk(bx(kw/8*1.06,.12,kl+1),lam('#a9b6bf'),Math.sin(a)*kw*.62,Math.cos(a)*1.2-1.2+.9,0,ar);seg.rotation.z=-a;}}
     [-1,1].forEach(s=>{const z=kz+s*(kl/2-.3);B(.14,3,.14,METAL,kx,1.5,z);B(1.2,.8,.06,WHITE,kx,3.1,z-s*.2);const rim=mk(new T.TorusGeometry(.24,.025,6,14),lam('#e0674b'),kx,Y0+2.75,z-s*.5,SG,false);rim.rotation.x=PI/2;addCol(TB.x+kx-.15,TB.x+kx+.15,z-.15,z+.15,Y0+3);});}
   // gate + fence on the east & south
   {const gx=-45.2,gz0=22.4,gz1=27.2;[gz0,gz1].forEach(z=>{B(.9,2.6,.9,COLR,gx,1.3,z);B(1.1,.2,1.1,STONE,gx,2.7,z);addCol(TB.x+gx-.45,TB.x+gx+.45,z-.45,z+.45,Y0+2.8);});
     B(.15,.2,gz1-gz0,FRAME,gx,.1,(gz0+gz1)/2,true);sign(gx+.5,Y0+2.15,gz0-.02,PI/2,'平等國小',2.6,'#3a2a20','#f3e6c8');
     const fence=(xa,za,xb,zb2)=>{const l=Math.hypot(xb-xa,zb2-za),n=Math.ceil(l/2.4);for(let k=0;k<n;k++){const t0=k/n,t1=(k+1)/n,ax=xa+(xb-xa)*t0,az=za+(zb2-za)*t0,bx_=xa+(xb-xa)*t1,bz=za+(zb2-za)*t1,mx=(ax+bx_)/2,mz=(az+bz)/2,ll=Math.hypot(bx_-ax,bz-az);
       const yy=H(mx,mz)-Y0;const w_=B(ll,.7,.22,WALL2,mx,yy+.35,mz);w_.rotation.y=Math.atan2(-(bz-az),bx_-ax);const r=B(ll,.06,.06,FRAME,mx,yy+1.4,mz,true);r.rotation.y=w_.rotation.y;B(.1,1.4,.1,FRAME,ax,yy+.7,az,true);
       addCol(TB.x+Math.min(ax,bx_)-.15,TB.x+Math.max(ax,bx_)+.15,Math.min(az,bz)-.15,Math.max(az,bz)+.15,H(mx,mz)+1.5);}};
     fence(gx,15.4,gx,gz0-.5);fence(gx,gz1+.5,gx,45.2);fence(gx,45.2,-74,45.2);}
   // swings + trees
   {const sx=-70.2,sz=25;[-1.4,1.4].forEach(o=>{const a=B(.12,2.6,.12,lam('#e0a020'),sx+o,1.3,sz-.6);a.rotation.x=.22;const b=B(.12,2.6,.12,lam('#e0a020'),sx+o,1.3,sz+.6);b.rotation.x=-.22;addCol(TB.x+sx+o-.2,TB.x+sx+o+.2,sz-.9,sz+.9,Y0+2.6);});
     B(3,.12,.12,lam('#e0a020'),sx,2.5,sz);[-.6,.6].forEach(o=>{B(.6,.06,.25,lam('#e0674b'),sx+o,.6,sz);[-.25,.25].forEach(p=>B(.02,1.85,.02,FRAME,sx+o+p,1.55,sz,true));});
     [[-70,43.6],[-65,43.6],[-60,43.6],[-55,43.6],[-50.5,43.6],[-72.8,30],[-72.8,38]].forEach(([x,z])=>{mk(cy(.18,.26,1.8,7),M.trunk,x,Y0+.9,z,SG);mk(ico(1.5,1),pick([M.leaf,M.leaf2]),x,Y0+2.9,z,SG);addCol(TB.x+x-.3,TB.x+x+.3,z-.3,z+.3,Y0+4);});}
   sqBatch(G,SG);
   reserve(-62,20,12);reserve(-60,34,14);reserve(-48.5,33,7);flagAt('school',-37,27);inter(P_(-38,28.5),1.8,'平等國小（走讀打卡）',()=>sqStory('school'));
   inter(P_(-56.5,25),1.8,'看平等國小的公告欄',()=>openBoard('news'));}
