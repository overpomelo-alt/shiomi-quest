  // ---------- houses v2: rows of real mountain-village buildings lining every lane
  //   RC 2–3 storey 透天 with tin roof-top add-ons & water tanks, shop fronts with roll-up shutters,
  //   sheet-metal houses, old gable houses, fruit-packing sheds / carports — packed along the lanes like the satellite view
  {const U=new T.BoxGeometry(1,1,1),UC=new T.CylinderGeometry(1,1,1,14);
   const rib=(a,b,n,vert,sz=64)=>{const [c,g]=C2(sz,sz);g.fillStyle=a;g.fillRect(0,0,sz,sz);g.fillStyle=b;for(let i=0;i<n;i++){const p=i*sz/n;if(vert)g.fillRect(p,0,sz/n*.38,sz);else g.fillRect(0,p,sz,sz/n*.38);}return TX(c,true);};
   const tiles=base=>{const [c,g]=C2(128,128);g.fillStyle=base;g.fillRect(0,0,128,128);g.fillStyle='rgba(0,0,0,.10)';for(let y=0;y<128;y+=5){g.fillRect(0,y,128,1);for(let x=(y/5%2)*6;x<128;x+=12)g.fillRect(x,y,1,5);}return TX(c,true);};
   const TM=(a,b,n,v)=>lam('#ffffff',{map:rib(a,b,n,v)});
   const FAC=['#ece7dc','#e4dccd','#d7dad8','#ead6cc','#efe2bf','#d3e0e4','#d6e4d3','#f2efe8'].map(c=>lam(c));
   const FACT=['#c9a990','#d9c3a5','#b9b2a8','#e2cfb8'].map(c=>lam('#ffffff',{map:tiles(c)}));
   const TINW=[['#cfd6d9','#b7c0c4'],['#a9c3cf','#91abb8'],['#d8d2c4','#c2bbab'],['#b9c9b4','#a3b39e'],['#e6e2d6','#cfcabd']].map(([a,b])=>TM(a,b,12,true));
   const ROOF=[['#3f6ea8','#33598a'],['#3f6ea8','#33598a'],['#4a8466','#3c6e54'],['#b24a32','#953c28'],['#c8cdd0','#adb3b6'],['#2f8a8a','#267373']].map(([a,b])=>TM(a,b,10,true));
   const WOOD=TM('#7a5a40','#5f452f',9,false),SHUT=TM('#b4b8bb','#979ca0',14,false);
   const FR=lam('#3d4045'),RAIL=lam('#5b5f64'),BAND=lam('#bdb5a6'),DARK=lam('#3b3530'),AC=lam('#ecece6'),STEEL=lam('#d6dadd'),BLUET=lam('#3d6fb0'),STEP=lam('#b3ada2'),POST=lam('#7c8186');
   const DOORS=[lam('#a8392f'),lam('#3f6f5a'),M.doorWood,lam('#5a6b7a'),lam('#8a5a3a')],AWN=[lam('#c8432b'),lam('#3b6ea5'),lam('#e0a020'),lam('#4f8a5b'),lam('#e8e4da')];
   const CRATE=[lam('#3b6ea5'),lam('#e0a020'),lam('#4f8a5b'),lam('#d9573b')],TRUCK=[lam('#3d6fb0'),lam('#f2efe8'),lam('#c8432b')];
   const HG=new T.Group();G.add(HG);const BLD=[];
   const Q=(g,mat,x,y,z,w,h,d,o)=>{const m=new T.Mesh(U,mat);m.position.set(x,y,z);m.scale.set(w,h,d);if(o){if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;if(o.ni)m.userData.noInk=1;}g.add(m);return m;};
   const CYL=(g,mat,x,y,z,r,h,ni)=>{const m=new T.Mesh(UC,mat);m.position.set(x,y,z);m.scale.set(r,h,r);if(ni)m.userData.noInk=1;g.add(m);return m;};
   const win=(g,x,y,z,w=1.1,h=1,grill=true)=>{Q(g,FR,x,y,z,w+.16,h+.16,.06,{ni:1});Q(g,winM,x,y,z+.02,w,h,.06,{ni:1});if(grill){Q(g,RAIL,x,y,z+.07,.05,h,.04,{ni:1});for(let k=1;k<3;k++)Q(g,RAIL,x,y-h/2+k*h/3,z+.07,w,.04,.04,{ni:1});}};
   const gable=(g,W,D,Hh,rh,rm,wm)=>{const half=D/2+.45,sl=Math.hypot(half,rh);[-1,1].forEach(s=>Q(g,rm,0,Hh+rh/2,s*half/2,W+.6,.1,sl,{rx:s*Math.atan2(rh,half)}));
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
   const inV=(x,z)=>Math.hypot((x+5)/50,(z+4)/42)<1||Math.hypot(x+8,z-150)<24||(Math.hypot((x+5)/50,(z+4)/42)<1.35&&rand()<.5);
   const laneOK=(x,z,pad)=>{for(const L of SQ_LANES){if(sqNear(x,z,L.p)[0]<L.w/2+pad)return false;}return sqNear(x,z,SQ_ROAD)[0]>4.2+pad;};
   const pts=(c)=>{const o=[];const ux=Math.cos(c.ry),uz=-Math.sin(c.ry),vx=Math.sin(c.ry),vz=Math.cos(c.ry);for(let i=-1;i<=1;i+=.5)for(let j=-1;j<=1;j+=.5)o.push([c.x+ux*c.W/2*i+vx*c.D/2*j,c.z+uz*c.W/2*i+vz*c.D/2*j]);return o;};
   const inside=(c,x,z,pad=0)=>{const dx=x-c.x,dz=z-c.z,ux=Math.cos(c.ry),uz=-Math.sin(c.ry),vx=Math.sin(c.ry),vz=Math.cos(c.ry);return Math.abs(dx*ux+dz*uz)<c.W/2+pad&&Math.abs(dx*vx+dz*vz)<c.D/2+pad;};
   const VC=COLS.filter(q=>q.x1>TB.x-230&&q.x0<TB.x+230&&q.y1-q.y0<60);const colHit=(x,z)=>{const X=TB.x+x;return VC.some(q=>X>q.x0-.3&&X<q.x1+.3&&z>q.z0-.3&&z<q.z1+.3&&q.y1-q.y0<60);};
   // keep NPC spots, dogs, arrival points & check-in flags free
   [[31.5,19.5],[-37,160.5],[-52,33],[-24.8,-12],[-25,-2],[12,-36],[0,24],[-12,-20],[30,12],[45,-44],[-45,30],[35,-20],[-16,-38],[20,-20],[-5,20]].forEach(([x,z])=>reserve(x,z,2.6));
   [[27,24],[-36,30],[-38,50],[-108,-38],[50,-45],[-29,157]].forEach(([x,z])=>reserve(x,z,3.5));SQW.forEach(s=>reserve(s.p[0],s.p[1],3));
   const fits=c=>{if(c.x>18&&c.x<82&&c.z>-62&&c.z<-38)return false;const P=pts(c);let lo=1e9,hi=-1e9;
     for(const [x,z] of P){if(!laneOK(x,z,.35))return false;if(LM.some(([a,b,r])=>Math.hypot(x-a,z-b)<r))return false;if(colHit(x,z))return false;if(BLD.some(o=>inside(o,x,z,.15)))return false;const h=tribeH(x,z);lo=Math.min(lo,h);hi=Math.max(hi,h);}
     if(BLD.some(o=>inside(c,o.x,o.z)))return false;if(hi-lo>3.2)return false;c.y=hi+.08;c.lo=lo;return true;};
   const TYPES=[['rc',.44],['tin',.17],['old',.11],['shed',.12],['wood',.06],['shop',.1]];
   const pickT=main=>{let r=rand()*(main?1:.9);for(const [k,w] of TYPES){if(k==='shop'&&!main)continue;r-=w;if(r<0)return k;}return 'rc';};
   const dims=t=>t==='rc'?[rr(4.8,6.4),rr(6,8)]:t==='shop'?[rr(5.2,6.6),rr(6.5,8)]:t==='shed'?[rr(4.6,6.4),rr(4.6,6)]:[rr(4.6,6),rr(4.6,5.8)];
   const tryAt=(px,pz,tx,tz,s,lw,t,W,D,setb)=>{const nx=-tz*s,nz=tx*s;const c={t,W,D,x:px+nx*(lw/2+setb+D/2),z:pz+nz*(lw/2+setb+D/2),ry:Math.atan2(-nx,-nz)};
     if(!inV(c.x,c.z))return null;if(!fits(c))return null;const fx=px+nx*(lw/2+.2),fz=pz+nz*(lw/2+.2);c.dy=c.y-tribeH(fx,fz);
     const need=c.dy>.45?Math.ceil(c.dy/.25)*.3+.35:0;if(need>setb+.05){if(need>3.2)return null;return tryAt(px,pz,tx,tz,s,lw,t,W,D,need);}c.steps=c.dy>.45?Math.ceil(c.dy/.25):0;c.setb=setb;return c;};
   WSET.forEach((L,li)=>{const P=L.p,main=L.w>=3.8;let acc=0;const seg=[];for(let i=0;i<P.length-1;i++){const l=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);seg.push([acc,l,i]);acc+=l;}
     [-1,1].forEach(s=>{let d=1.5;while(d<acc-2){const t=pickT(main),[W,D]=dims(t);const at=d+W/2;const sg=seg.find(q=>at>=q[0]&&at<=q[0]+q[1])||seg[seg.length-1];const i=sg[2],u=(at-sg[0])/sg[1];
       const tx=(P[i+1][0]-P[i][0])/sg[1],tz=(P[i+1][1]-P[i][1])/sg[1];const px=P[i][0]+tx*sg[1]*u,pz=P[i][1]+tz*sg[1]*u;
       const c=tryAt(px,pz,tx,tz,s,L.w,t,W,D,rr(.7,1.5));if(c){BLD.push(c);d+=W+(rand()<.35?rr(0,.25):rr(.6,1.8));
         // a second house behind it, reached by a little side path (the village is dense)
         if(rand()<.5){const t2=pickT(false),[W2,D2]=dims(t2);const nx=-tz*s,nz=tx*s;const c2={t:t2,W:W2,D:D2,ry:c.ry,x:c.x+nx*(D/2+rr(1.2,2.4)+D2/2)+tx*rr(-1,1),z:c.z+nz*(D/2+rr(1.2,2.4)+D2/2)+tz*rr(-1,1)};
           if(inV(c2.x,c2.z)&&fits(c2)){c2.steps=0;c2.dy=0;BLD.push(c2);}}}
       else d+=1.3;}});});
   // build them
   const cols=c0=>{const c=Object.assign({},c0,{D:c0.D+c0.fr,x:c0.x+Math.sin(c0.ry)*c0.fr/2,z:c0.z+Math.cos(c0.ry)*c0.fr/2});const ux=Math.cos(c.ry),uz=-Math.sin(c.ry),vx=Math.sin(c.ry),vz=Math.cos(c.ry);const long=c.W>=c.D,Lg=long?c.W:c.D,Sh=long?c.D:c.W,n=Math.max(1,Math.ceil(Lg/1.1));
     for(let k=0;k<n;k++){const a=-Lg/2+Lg*(k+.5)/n,cx=c.x+(long?ux:vx)*a,cz=c.z+(long?uz:vz)*a;const hx=(long?Math.abs(ux):Math.abs(vx))*Lg/n/2+(long?Math.abs(vx):Math.abs(ux))*Sh/2,hz=(long?Math.abs(uz):Math.abs(vz))*Lg/n/2+(long?Math.abs(vz):Math.abs(uz))*Sh/2;
       addCol(TB.x+cx-hx,TB.x+cx+hx,cz-hz,cz+hz,c.y+c.top);}};
   BLD.forEach(c=>{const g=new T.Group();g.position.set(c.x,c.y,c.z);g.rotation.y=c.ry;HG.add(g);
     c.top=BT[c.t==='shop'?'rc':c.t](g,c.W,c.D,{shop:c.t==='shop'});
     Q(g,M.concrete,0,-(c.y-c.lo+.6)/2+.04,0,c.W+.14,c.y-c.lo+.6,c.D+.14);   // plinth / retaining wall down to the slope
     if(c.steps){const n=c.steps,hs=c.dy/n,sw=Math.min(c.W-.3,3.2);for(let k=0;k<n;k++)Q(g,STEP,0,-c.dy+(n-k)*hs/2,c.D/2+.15+k*.3,sw,(n-k)*hs,.3);}
     if(c.t==='shop'){const nm=pick(['水果・蔬菜','雜貨','機車行','五金行','麵店','農資行','理髮','早餐']);const vx=Math.sin(c.ry),vz=Math.cos(c.ry);sign(c.x+vx*(c.D/2+.14),c.y+3.5,c.z+vz*(c.D/2+.14),c.ry,nm,Math.min(3.2,c.W*.6),pick(['#fffaf0','#c8432b','#2f5a8a','#3f7f5a']),'#3a2a20');}
     c.fr=.65+(c.steps?c.steps*.3:0);cols(c);reserve(c.x,c.z,Math.max(c.W,c.D)*.55);});
   // scooters & parked trucks along the lanes
   BLD.forEach(c=>{if(rand()>.22)return;const vx=Math.sin(c.ry),vz=Math.cos(c.ry),ux=Math.cos(c.ry),uz=-Math.sin(c.ry);const a=rr(-c.W/2+.6,c.W/2-.6),x=c.x+vx*(c.D/2+.75)+ux*a,z=c.z+vz*(c.D/2+.75)+uz*a;
     if(c.setb<1.1||colHit(x,z)||!laneOK(x,z,-.2))return;const g=new T.Group();g.position.set(x,tribeH(x,z),z);g.rotation.y=c.ry+PI/2;HG.add(g);o_scooter(g,0,0);addCol(TB.x+x-.7,TB.x+x+.7,z-.7,z+.7,tribeH(x,z)+1.3);});
   // ---- static batching: merge by material + area so the whole village is a few dozen draw calls
   HG.updateMatrixWorld(true);const inv=new T.Matrix4().copy(G.matrixWorld).invert(),_w=new T.Vector3(),B=new Map(),ALLB=[],mm=new T.Matrix4();
   HG.traverse(o=>{if(!o.isMesh)return;o.getWorldPosition(_w);const key=o.material.uuid+(o.userData.noInk?'n':'i')+Math.floor(_w.x/40)+'_'+Math.floor(_w.z/40);let b=B.get(key);
     if(!b||b.v>16000){b={m:o.material,ni:!!o.userData.noInk,list:[],v:0};B.set(key,b);ALLB.push(b);}
     mm.multiplyMatrices(inv,o.matrixWorld);const gg=o.geometry.clone().applyMatrix4(mm);b.list.push(gg);b.v+=gg.attributes.position.count;});
   ALLB.forEach(b=>{let n=0,ni=0;b.list.forEach(g=>{n+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;});
     const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2),idx=new Uint32Array(ni);let vo=0,io=0;
     b.list.forEach(g=>{const c=g.attributes.position.count;pos.set(g.attributes.position.array,vo*3);nor.set(g.attributes.normal.array,vo*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,vo*2);
       if(g.index){const a=g.index.array;for(let k=0;k<a.length;k++)idx[io+k]=a[k]+vo;io+=a.length;}else{for(let k=0;k<c;k++)idx[io+k]=vo+k;io+=c;}vo+=c;g.dispose();});
     const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(new T.BufferAttribute(idx,1));geo.computeBoundingSphere();geo.computeBoundingBox();
     const m=new T.Mesh(geo,b.m);m.castShadow=!b.ni;m.receiveShadow=true;if(b.ni){m.userData.ink=true;if(b.m.isMeshLambertMaterial&&!b.m.transparent)try{inkLambert(b.m);}catch(e){}}G.add(m);});
   G.remove(HG);TB.nBld=BLD.length;}
