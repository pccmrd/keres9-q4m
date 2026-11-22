'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — RENDER — camera, world drawing, ships, player, guides
   ================================================================ */

/* ---------------- RENDER ---------------- */
const cv=$('cv'),ctx=cv.getContext('2d');
let DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,1.75);
  cv.width=Math.floor(innerWidth*DPR);cv.height=Math.floor(innerHeight*DPR);}
window.addEventListener('resize',resize);resize();
function updateCamera(dt){
  const P=W.player;
  let tx,ty,ts,trot;
  if(!started){
    const a=W.t*0.03;
    tx=Math.cos(a)*8000;ty=Math.sin(a)*8000;ts=0.05;trot=-a*0.4;
  }else{
    const p=playerPos(),r=hyp(p.x,p.y)||1;
    const up=Math.atan2(p.y,p.x);
    trot=-Math.PI/2-up;
    const low=P.mode==='foot'||P.mode==='boots';
    const off=low?7:0;
    tx=p.x+Math.cos(up)*off;ty=p.y+Math.sin(up)*off;
    let base=P.mode==='pilot'?1.5:P.mode==='passenger'?1.2:5;
    if(P.mode==='lift')base=lerp(3.2,0.5,clamp(P.lift?P.lift.t:0,0,1));
    if(P.mode==='float'&&r-R_MOON>JET_AGL)base=2.2;
    ts=base*CAMZ[camMode];
  }
  const k=1-Math.exp(-5*dt);
  W.cam.x=lerp(W.cam.x,tx,k);W.cam.y=lerp(W.cam.y,ty,k);
  W.cam.scale=lerp(W.cam.scale,ts,1-Math.exp(-3.5*dt));
  W.cam.rot+=wrapA(trot-W.cam.rot)*(1-Math.exp(-6*dt));
  W.shake=Math.max(0,W.shake-dt*20);
}
let shX=0,shY=0;
function w2s(x,y){
  const dx=x-W.cam.x,dy=y-W.cam.y,c=Math.cos(W.cam.rot),s=Math.sin(W.cam.rot);
  return{x:(dx*c-dy*s)*W.cam.scale+cv.width/2/DPR+shX,y:(dx*s+dy*c)*W.cam.scale+cv.height/2/DPR+shY};
}
function s2w(sx,sy){
  const dx=(sx-cv.width/2/DPR)/W.cam.scale,dy=(sy-cv.height/2/DPR)/W.cam.scale;
  const c=Math.cos(-W.cam.rot),s=Math.sin(-W.cam.rot);
  return{x:dx*c-dy*s+W.cam.x,y:dx*s+dy*c+W.cam.y};
}
function render(){
  const w=cv.width/DPR,h=cv.height/DPR;
  shX=(Math.random()-0.5)*W.shake;shY=(Math.random()-0.5)*W.shake;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const bg=ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,'#04060d');bg.addColorStop(0.5,'#070b18');bg.addColorStop(1,'#0a0812');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const cc=Math.cos(W.cam.rot),cs=Math.sin(W.cam.rot);
  for(const s of W.stars){
    const ox=(s.x-W.cam.x*s.z)*0.5,oy=(s.y-W.cam.y*s.z)*0.5;
    const px=((ox*cc-oy*cs+w/2)%w+w)%w,py=((ox*cs+oy*cc+h/2)%h+h)%h;
    const tw=0.5+0.5*Math.sin(W.t*1.5+s.tw);
    ctx.fillStyle='rgba(223,233,245,'+(0.2+0.55*tw*s.z*2)+')';
    ctx.fillRect(px,py,s.s,s.s);
  }
  drawSky(w,h);
  const scale=W.cam.scale,viewR=hyp(w,h)/2/scale;
  const camP={x:W.cam.x,y:W.cam.y};
  const mp=w2s(0,0),mr=R_MOON*scale;
  const sunA=SUN_MA+W.moon.angle+W.cam.rot,sd=dir(sunA);
  if(dist(camP,{x:0,y:0})<viewR+R_MOON+400){
    const mg=ctx.createRadialGradient(mp.x+sd.x*mr*0.4,mp.y+sd.y*mr*0.4,mr*0.05,mp.x,mp.y,mr);
    mg.addColorStop(0,'#5b5849');mg.addColorStop(0.5,'#33353f');mg.addColorStop(1,'#15171f');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mp.x,mp.y,mr,0,Math.PI*2);ctx.fill();
    for(const c of W.craters){
      const a=c.ma+W.moon.angle,d=dir(a),cwx=d.x*c.d,cwy=d.y*c.d;
      if(hyp(cwx-W.cam.x,cwy-W.cam.y)>viewR+c.r)continue;
      const cp=w2s(cwx,cwy),cr=c.r*scale;
      if(cr<1.5)continue;
      ctx.fillStyle='rgba(10,12,20,'+(0.22+c.s*0.2)+')';
      ctx.beginPath();ctx.arc(cp.x,cp.y,cr,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(160,150,130,.16)';ctx.lineWidth=Math.max(1,cr*0.06);
      ctx.beginPath();ctx.arc(cp.x,cp.y,cr,sunA-1.6,sunA+1.6);ctx.stroke();
    }
    const tg=ctx.createLinearGradient(mp.x+sd.x*mr,mp.y+sd.y*mr,mp.x-sd.x*mr,mp.y-sd.y*mr);
    tg.addColorStop(0,'rgba(4,6,13,0)');tg.addColorStop(0.5,'rgba(4,6,13,0.12)');tg.addColorStop(1,'rgba(2,3,8,0.9)');
    ctx.save();ctx.beginPath();ctx.arc(mp.x,mp.y,mr,0,Math.PI*2);ctx.clip();
    ctx.fillStyle=tg;ctx.fillRect(mp.x-mr,mp.y-mr,mr*2,mr*2);ctx.restore();
    ctx.strokeStyle='rgba(200,168,130,.2)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(mp.x,mp.y,mr,0,Math.PI*2);ctx.stroke();
  }
  drawGround(w,h,scale,sunA);
  const lf=liftFootPos(),lh=liftHeadPos();
  const lfs=w2s(lf.x,lf.y),lhs=w2s(lh.x,lh.y);
  ctx.strokeStyle='rgba(63,216,255,.4)';ctx.lineWidth=1.4;ctx.setLineDash([7,7]);
  ctx.beginPath();ctx.moveTo(lfs.x,lfs.y);ctx.lineTo(lhs.x,lhs.y);ctx.stroke();ctx.setLineDash([]);
  if(scale>1.2){
    ctx.fillStyle=COL.cyan;ctx.shadowColor=COL.cyan;ctx.shadowBlur=10;
    ctx.fillRect(lfs.x-4,lfs.y-14,8,14);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(63,216,255,.9)';ctx.font='9px IBM Plex Mono';
    ctx.fillText('CABLE LIFT ▲',lfs.x+9,lfs.y-6);
  }
  if(W.player.lift){const ps=w2s(W.player.pos.x,W.player.pos.y);
    ctx.fillStyle=COL.cyan;ctx.shadowColor=COL.cyan;ctx.shadowBlur=12;
    ctx.fillRect(ps.x-4,ps.y-6,8,12);ctx.shadowBlur=0;}
  for(const b of W.bodies){
    if(dist(camP,b.pos)>viewR+b.r+400)continue;
    drawBody(b,scale);
  }
  for(const c of W.chunks){const p=w2s(c.pos.x,c.pos.y);
    ctx.fillStyle=COL.amber;ctx.shadowColor=COL.amber;ctx.shadowBlur=6;
    ctx.fillRect(p.x-2.5,p.y-2.5,5,5);ctx.shadowBlur=0;}
  for(const s of W.ships)drawShip(s,scale);
  drawRobots(scale);
  const bp=beaconPos();
  if(bp){const p=w2s(bp.x,bp.y),pulse=0.5+0.5*Math.sin(W.t*4);
    ctx.strokeStyle=COL.green;ctx.lineWidth=2;ctx.shadowColor=COL.green;ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(p.x,p.y,8+pulse*5,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle=COL.green;ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=COL.green;ctx.font='9px IBM Plex Mono';ctx.fillText('◎ DROP',p.x+12,p.y+3);}
  if(S.flags.vesperScanned||keyWhole()){
    const dp=vesperDoorPos(),p=w2s(dp.x,dp.y);
    ctx.fillStyle=COL.magenta;ctx.shadowColor=COL.magenta;ctx.shadowBlur=14;
    ctx.fillRect(p.x-3,p.y-5,6,10);ctx.shadowBlur=0;
    if(scale>0.8){ctx.fillStyle=COL.magenta;ctx.font='9px IBM Plex Mono';ctx.fillText('▯ DOOR',p.x+8,p.y+3);}
  }
  if(W.hulk1.resolved&&!S.flags.hulkRead){
    const hp=hulkHatchPos(),p=w2s(hp.x,hp.y);
    ctx.strokeStyle=COL.warn;ctx.strokeRect(p.x-4,p.y-4,8,8);
    if(scale>0.8){ctx.fillStyle=COL.warn;ctx.font='9px IBM Plex Mono';ctx.fillText('▯ LOG',p.x+8,p.y+3);}
  }
  if(W.ping>0){
    const alpha=clamp(W.ping/6,0,1);
    for(const b of W.bodies){
      if(!b.nodes||!b.nodes.length)continue;
      if(dist(playerPos(),b.pos)>1600)continue;
      for(const n of b.nodes){
        const a=n.ang+b.angle,d=dir(a);
        const np=w2s(b.pos.x+d.x*b.r*0.95,b.pos.y+d.y*b.r*0.95);
        ctx.strokeStyle='rgba(105,245,140,'+(alpha*0.9)+')';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(np.x,np.y,5+Math.sin(W.t*6)*2,0,Math.PI*2);ctx.stroke();
      }
    }
  }
  if(miningBeam){
    const a=w2s(miningBeam.x0,miningBeam.y0),b=w2s(miningBeam.x1,miningBeam.y1);
    ctx.strokeStyle=miningBeam.hot?COL.amber:'rgba(63,216,255,.6)';
    ctx.lineWidth=miningBeam.hot?2.5:1.5;ctx.shadowColor=miningBeam.hot?COL.amber:COL.cyan;ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.shadowBlur=0;
  }
  ctx.globalCompositeOperation='lighter';
  for(const p of W.particles){
    const s=w2s(p.x,p.y),a=1-p.t/p.life;
    ctx.fillStyle=p.col;ctx.globalAlpha=a*0.8;
    ctx.fillRect(s.x-p.size/2,s.y-p.size/2,p.size,p.size);
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(started){drawCombat(scale);drawFlightAids(scale);}
  if(started&&!W.player.dead)drawPlayer(scale);
  if(started)drawGuides(w,h);
}
function drawCombat(scale){
  if(!W.hostiles)return;
  for(const c of W.canisters){
    const p=w2s(c.pos.x,c.pos.y);
    const blink=0.5+0.5*Math.sin((c.pulse||0)*4);
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle='rgba(255,176,46,'+(0.28+0.4*blink)+')';ctx.fillRect(-3.5,-5,7,10);
    ctx.strokeStyle=COL.amber;ctx.lineWidth=1.2;ctx.shadowColor=COL.amber;ctx.shadowBlur=blink*10;
    ctx.strokeRect(-3.5,-5,7,10);ctx.shadowBlur=0;ctx.restore();
    if(scale>1.4){ctx.fillStyle=COL.amber;ctx.font='8px IBM Plex Mono';ctx.fillText('SALVAGE',p.x+7,p.y+3);}
  }
  for(const h of W.hostiles){
    const p=w2s(h.pos.x,h.pos.y),r=Math.max(4,h.r*scale);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(h.angle+W.cam.rot);
    ctx.fillStyle='#2a0f14';ctx.strokeStyle=COL.red;ctx.lineWidth=1.6;ctx.shadowColor=COL.red;ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(r*1.3,0);ctx.lineTo(-r*0.6,-r*0.85);ctx.lineTo(-r*0.25,0);ctx.lineTo(-r*0.6,r*0.85);ctx.closePath();
    ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle=COL.red;ctx.beginPath();ctx.arc(r*0.35,0,r*0.18,0,Math.PI*2);ctx.fill();
    if(h.thrust>0.05){ctx.fillStyle='rgba(255,73,84,'+(0.3+h.thrust*0.5)+')';
      ctx.beginPath();ctx.moveTo(-r*0.5,-r*0.2);ctx.lineTo(-r*(0.9+h.thrust),0);ctx.lineTo(-r*0.5,r*0.2);ctx.closePath();ctx.fill();}
    ctx.restore();
    const pct=clamp(h.hull/h.maxHull,0,1);
    if(pct<0.999){ctx.fillStyle='rgba(255,73,84,.3)';ctx.fillRect(p.x-14,p.y-22,28,3);
      ctx.fillStyle=COL.red;ctx.fillRect(p.x-14,p.y-22,28*pct,3);}
    if(h.flash>0){ctx.fillStyle=COL.red;ctx.beginPath();ctx.arc(p.x+Math.cos(h.angle+W.cam.rot)*r*1.5,p.y+Math.sin(h.angle+W.cam.rot)*r*1.5,3,0,Math.PI*2);ctx.fill();}
    if(scale>0.8){ctx.fillStyle='rgba(255,73,84,.75)';ctx.font='8px IBM Plex Mono';ctx.fillText(h.name,p.x+r+6,p.y-8);}
  }
  for(const b of W.bolts){
    const p=w2s(b.x,b.y);
    const vl=hyp(b.vx,b.vy)||1,tx=b.vx/vl,ty=b.vy/vl,tl=clamp(vl*0.018,6,16)*scale;
    ctx.strokeStyle=b.hostile?COL.red:COL.cyan;ctx.lineWidth=2;ctx.shadowColor=b.hostile?COL.red:COL.cyan;ctx.shadowBlur=8;
    ctx.beginPath();ctx.moveTo(p.x-tx*tl,p.y-ty*tl);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.shadowBlur=0;
  }
}
function drawFlightAids(scale){
  const P=W.player;
  if(P.mode!=='pilot'||!P.ship||P.ship.docked)return;
  const s=P.ship;
  const sp=w2s(s.pos.x,s.pos.y);
  const vlen=hyp(s.vel.x,s.vel.y);
  if(vlen>1){
    const va=Math.atan2(s.vel.y,s.vel.x)+W.cam.rot;
    ctx.strokeStyle='rgba(105,245,140,.65)';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(sp.x,sp.y);
    ctx.lineTo(sp.x+Math.cos(va)*clamp(vlen*1.6,12,80),sp.y+Math.sin(va)*clamp(vlen*1.6,12,80));ctx.stroke();
  }
  let px=s.pos.x,py=s.pos.y,vx=s.vel.x,vy=s.vel.y;
  const step=0.3;let hit=null,cp=null,cpD=1e18;
  ctx.fillStyle='rgba(63,216,255,.38)';
  for(let i=0;i<110;i++){
    const r=hyp(px,py),g=MU/(r*r);
    vx-=px/r*g*step;vy-=py/r*g*step;px+=vx*step;py+=vy*step;
    const nr=hyp(px,py);
    if(nr<=R_MOON+1){hit={x:px,y:py};break;}
    if(W.target){const d=dist({x:px,y:py},W.target.pos);if(d<cpD){cpD=d;cp={x:px,y:py};}}
    if(i%4===0){const q=w2s(px,py);ctx.fillRect(q.x-1,q.y-1,2,2);}
  }
  if(hit){
    const q=w2s(hit.x,hit.y);
    ctx.strokeStyle=COL.warn;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(q.x-7,q.y);ctx.lineTo(q.x+7,q.y);ctx.moveTo(q.x,q.y-7);ctx.lineTo(q.x,q.y+7);ctx.stroke();
    ctx.fillStyle=COL.warn;ctx.font='8px IBM Plex Mono';ctx.fillText('IMPACT',q.x+9,q.y+3);
  }else if(cp&&cpD<(W.target.r+150)){
    const q=w2s(cp.x,cp.y);
    ctx.strokeStyle='rgba(105,245,140,.55)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(105,245,140,.7)';ctx.font='8px IBM Plex Mono';ctx.fillText('CA',q.x+7,q.y-6);
  }
}
function drawSky(w,h){
  const cx=w/2,cy=h/2,rad=Math.min(w,h)*0.42;
  const ea=W.hab.ma+0.30+W.moon.angle+W.cam.rot;
  const ex=cx+Math.cos(ea)*rad*1.35,ey=cy+Math.sin(ea)*rad*1.35;
  const er=26;
  const eg=ctx.createRadialGradient(ex-er*0.35,ey-er*0.35,er*0.1,ex,ey,er);
  eg.addColorStop(0,'#9fd0ff');eg.addColorStop(0.55,'#2f6cb8');eg.addColorStop(1,'#081832');
  ctx.fillStyle=eg;ctx.beginPath();ctx.arc(ex,ey,er,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(127,184,255,.35)';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='rgba(105,245,140,.22)';
  ctx.beginPath();ctx.ellipse(ex-6,ey+2,7,4,0.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(ex+7,ey-6,5,3,-0.3,0,Math.PI*2);ctx.fill();
  const sa=SUN_MA+W.moon.angle+W.cam.rot;
  const sx=cx+Math.cos(sa)*rad*1.7,sy=cy+Math.sin(sa)*rad*1.7;
  const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,120);
  sg.addColorStop(0,'rgba(255,240,210,.5)');sg.addColorStop(0.25,'rgba(255,200,130,.14)');sg.addColorStop(1,'rgba(255,180,90,0)');
  ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,120,0,Math.PI*2);ctx.fill();
}
function drawGround(w,h,scale,sunA){
  if(scale<1.1)return;
  const P=W.player,pp=playerPos();
  if(hyp(pp.x,pp.y)-R_MOON>500)return;
  const half=Math.min(900,(w/2/scale)+60);
  const centerMA=Math.atan2(W.cam.y,W.cam.x);
  const dA=half/R_MOON;
  const a0=centerMA-dA,a1=centerMA+dA;
  const s0=groundArc(a0),s1=groundArc(a1);
  const N=110;
  ctx.beginPath();
  for(let i=0;i<=N;i++){
    const s=lerp(s0,s1,i/N),ma=s/R_MOON+W.moon.angle;
    const p=w2s(...Object.values(groundPoint(ma,groundH(s))));
    i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);
  }
  for(let i=N;i>=0;i--){
    const s=lerp(s0,s1,i/N),ma=s/R_MOON+W.moon.angle;
    const q=groundPoint(ma,-70);const p=w2s(q.x,q.y);
    ctx.lineTo(p.x,p.y);
  }
  ctx.closePath();
  const gp=w2s(...Object.values(groundPoint(centerMA,0)));
  const gg=ctx.createLinearGradient(gp.x,gp.y-14*scale,gp.x,gp.y+50*scale);
  gg.addColorStop(0,'#6d6252');gg.addColorStop(0.12,'#4a4438');gg.addColorStop(1,'#1a1712');
  ctx.fillStyle=gg;ctx.fill();
  ctx.beginPath();
  for(let i=0;i<=N;i++){
    const s=lerp(s0,s1,i/N),ma=s/R_MOON+W.moon.angle;
    const q=groundPoint(ma,groundH(s));const p=w2s(q.x,q.y);
    i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);
  }
  ctx.strokeStyle='rgba(226,199,158,.55)';ctx.lineWidth=1.6;ctx.stroke();
  // boot prints
  for(const pr of W.bootprints){
    if(pr.s<s0-4||pr.s>s1+4)continue;
    const ma=pr.s/R_MOON+W.moon.angle,q=groundPoint(ma,groundH(pr.s)+0.05),p=w2s(q.x,q.y);
    const age=clamp(1-(W.t-pr.t)/45,0,1);
    ctx.fillStyle='rgba(20,16,12,'+(0.5*age)+')';
    ctx.fillRect(p.x-1.6*scale*0.3,p.y-1,3.2*scale*0.3,2);
  }
  // corridor paint + chevrons
  const ca=W.hab.ma*R_MOON-30,cb=W.hyard.ma*R_MOON+55;
  if(s1>ca&&s0<cb){
    ctx.strokeStyle='rgba(63,216,255,.22)';ctx.lineWidth=1;
    ctx.beginPath();
    let started2=false;
    for(let s=Math.max(s0,ca);s<=Math.min(s1,cb);s+=4){
      const ma=s/R_MOON+W.moon.angle,q=groundPoint(ma,groundH(s)+0.08),p=w2s(q.x,q.y);
      started2?ctx.lineTo(p.x,p.y):(ctx.moveTo(p.x,p.y),started2=true);
    }
    ctx.stroke();
    const step=12;
    for(let s=Math.ceil(Math.max(s0,ca)/step)*step;s<=Math.min(s1,cb);s+=step){
      const ma=s/R_MOON+W.moon.angle,q=groundPoint(ma,groundH(s)+0.1),p=w2s(q.x,q.y);
      ctx.strokeStyle='rgba(63,216,255,.4)';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(p.x-4,p.y-4);ctx.lineTo(p.x+2,p.y);ctx.lineTo(p.x-4,p.y+4);ctx.stroke();
    }
    for(let s=Math.ceil(Math.max(s0,ca)/36)*36;s<=Math.min(s1,cb);s+=36){
      const ma=s/R_MOON+W.moon.angle,q=groundPoint(ma,groundH(s)),p=w2s(q.x,q.y);
      ctx.strokeStyle='rgba(200,168,130,.4)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-9);ctx.stroke();
      ctx.fillStyle='rgba(200,168,130,.65)';ctx.font='8px IBM Plex Mono';
      ctx.fillText(Math.round(s-W.hab.ma*R_MOON)+'m',p.x+3,p.y-10);
    }
  }
  if(scale>2.1){
    const T=8;
    const k0=Math.floor(s0/T),k1=Math.ceil(s1/T);
    for(let k=k0;k<=k1;k++){
      for(let j=0;j<3;j++){
        const hs=ihash(k*13+j*7);
        const s=k*T+hs*T,ma=s/R_MOON+W.moon.angle;
        const sz=0.12+ihash(k*29+j)*0.34;
        const q=groundPoint(ma,groundH(s)+sz*0.4),p=w2s(q.x,q.y);
        ctx.fillStyle=j%2?'rgba(150,136,112,.65)':'rgba(96,88,72,.7)';
        ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.7,sz*scale),0,Math.PI*2);ctx.fill();
      }
      if(ihash(k*31)<0.42){
        const s=k*T+ihash(k*17)*T,ma=s/R_MOON+W.moon.angle;
        const br=0.55+ihash(k*19)*1.7;
        const q=groundPoint(ma,groundH(s)+br*0.55),p=w2s(q.x,q.y);
        const r=br*scale;
        ctx.fillStyle='rgba(28,24,18,.5)';
        ctx.beginPath();ctx.ellipse(p.x,p.y+r*0.7,r*1.2,r*0.35,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();
        for(let i=0;i<7;i++){
          const a=i/7*Math.PI*2,m=0.72+ihash(k*53+i)*0.42;
          const px=p.x+Math.cos(a)*r*m,py=p.y+Math.sin(a)*r*m*0.82;
          i?ctx.lineTo(px,py):ctx.moveTo(px,py);
        }
        ctx.closePath();
        const bgg=ctx.createLinearGradient(p.x-r,p.y-r,p.x+r,p.y+r);
        bgg.addColorStop(0,'#8b7f6a');bgg.addColorStop(1,'#3a352c');
        ctx.fillStyle=bgg;ctx.fill();
        ctx.strokeStyle='rgba(226,199,158,.3)';ctx.lineWidth=0.8;ctx.stroke();
      }
      if(ihash(k*71)<0.3){
        const s=k*T+4,ma=s/R_MOON+W.moon.angle;
        const q=groundPoint(ma,groundH(s)+0.03),p=w2s(q.x,q.y);
        ctx.strokeStyle='rgba(200,168,130,.16)';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(p.x,p.y+3,3.2*scale*0.5,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
      }
    }
  }
  // landmark signs
  for(const l of W.landmarks){
    const s=l.ma*R_MOON;
    if(s<s0-20||s>s1+20)continue;
    const ma=l.ma+W.moon.angle,q=groundPoint(ma,groundH(s)),p=w2s(q.x,q.y);
    const hh=Math.max(14,3.2*scale);
    ctx.strokeStyle='rgba(125,140,163,.8)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-hh);ctx.stroke();
    const label=l.label+(l.ma===W.liftMA?' ▲':'');
    ctx.font='700 9px Chakra Petch';
    const tw=ctx.measureText(label).width+10;
    ctx.fillStyle='rgba(9,15,28,.9)';ctx.fillRect(p.x-tw/2,p.y-hh-13,tw,13);
    ctx.strokeStyle=l.ma===W.liftMA?COL.cyan:'rgba(200,168,130,.6)';ctx.lineWidth=1;
    ctx.strokeRect(p.x-tw/2,p.y-hh-13,tw,13);
    ctx.fillStyle=l.ma===W.liftMA?COL.cyan:COL.reg;
    ctx.fillText(label,p.x-tw/2+5,p.y-hh-4);
  }
}
function drawRobots(scale){
  for(const r of W.robots){
    const gma=(r.state==='drill'?r.deposit:r.ma);
    const s=gma*R_MOON;
    const a=gma+W.moon.angle,d=dir(a);
    const q=groundPoint(a,groundH(s)+0.9),p=w2s(q.x,q.y);
    const col=(S.flags.robotReprogrammed&&r.id===0)?COL.green:COL.amber;
    const sz=Math.max(3,1.6*scale);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a+Math.PI/2+W.cam.rot);
    ctx.fillStyle='#241d12';ctx.fillRect(-sz,-sz*0.7,sz*2,sz*1.4);
    ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(-sz,-sz*0.7,sz*2,sz*1.4);
    ctx.fillStyle=COL.red;ctx.fillRect(sz*0.25,-sz*0.4,sz*0.4,sz*0.4);
    if(r.state==='drill'){ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(0,sz*0.7);ctx.lineTo(0,sz*1.5);ctx.stroke();}
    if(r.carry){ctx.fillStyle=COL.amber;ctx.fillRect(-sz*0.5,-sz*1.2,sz,sz*0.5);}
    ctx.restore();
    if(scale>2.4){ctx.fillStyle=col;ctx.font='8px IBM Plex Mono';ctx.fillText('HEL-R'+r.id+' '+r.state.toUpperCase(),p.x+sz+3,p.y);}
  }
}
function drawBody(b,scale){
  const p=w2s(b.pos.x,b.pos.y),r=b.r*scale;
  if(b.kind==='station'){drawStation(b,p,r,scale);return;}
  if(b.kind==='base'){drawBase(b,p,r,scale);return;}
  if(b.kind==='freighter')return;
  if(r<1){ctx.fillStyle=b.resolved?COL.cyan:'#5a6578';ctx.fillRect(p.x-1,p.y-1,2,2);return;}
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(b.angle+W.cam.rot);
  if(b.kind==='comet'){
    const warm=0.5+0.5*Math.sin(W.t*2+b.f0);
    const cg=ctx.createRadialGradient(0,0,r*0.1,0,0,r*1.7);
    cg.addColorStop(0,'rgba(255,90,209,'+(0.25+warm*0.2)+')');
    cg.addColorStop(0.5,'rgba(127,184,255,.12)');cg.addColorStop(1,'rgba(127,184,255,0)');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,r*1.7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#2a3550';ctx.strokeStyle=b.resolved?COL.magenta:'rgba(138,95,128,.6)';ctx.lineWidth=1.5;
    polyPath(b,r);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,90,209,'+(0.4+warm*0.4)+')';ctx.shadowColor=COL.magenta;ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(0,0,r*0.25,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }else if(b.kind==='hulk'){
    ctx.fillStyle='#1c2030';ctx.strokeStyle=b.resolved?COL.cyan:'rgba(125,140,163,.5)';ctx.lineWidth=1.5;
    polyPath(b,r);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(255,210,63,.5)';ctx.beginPath();ctx.moveTo(-r*0.5,0);ctx.lineTo(r*0.5,0);ctx.stroke();
    if(b===W.hulk1&&Math.sin(W.t*3)>0){ctx.fillStyle=COL.warn;ctx.fillRect(r*0.2,-r*0.2,3,3);}
  }else{
    ctx.fillStyle=b.kind==='debris'?'#232838':'#33353f';
    ctx.strokeStyle=b.resolved?COL.cyan:'rgba(125,140,163,.45)';ctx.lineWidth=1.5;
    polyPath(b,r);ctx.fill();ctx.stroke();
  }
  for(const n of b.nodes){
    const d=dir(n.ang);
    ctx.fillStyle=n.t/n.t0>0.5?COL.amber:COL.warn;
    ctx.beginPath();ctx.arc(d.x*r*0.9,d.y*r*0.9,Math.max(1.5,r*0.035),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  if(b===W.target){ctx.strokeStyle=COL.cyan;ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(p.x,p.y,r+8,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  if(scale>0.5&&(b.resolved||b===W.target)){
    ctx.fillStyle='rgba(223,233,245,.7)';ctx.font='9px IBM Plex Mono';ctx.fillText(b.name,p.x+r+6,p.y+3);}
}
function polyPath(b,r){
  const v=b.verts||[1,0.8,1,0.9,1,0.8];
  ctx.beginPath();
  v.forEach((m,i)=>{const a=i/v.length*Math.PI*2,px=Math.cos(a)*r*m,py=Math.sin(a)*r*m;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});
  ctx.closePath();
}
function drawStation(b,p,r,scale){
  const col=FACCOL[b.faction]||COL.cyan;
  const lightCol=S.flags.controller?FACCOL[S.flags.controller]:col;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,r*0.09);ctx.globalAlpha=0.9;
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(63,216,255,.18)';ctx.lineWidth=Math.max(1,r*0.16);
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
  ctx.rotate(b.angle+W.cam.rot);
  ctx.strokeStyle='rgba(125,140,163,.6)';ctx.lineWidth=Math.max(1,r*0.035);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;
    ctx.beginPath();ctx.moveTo(Math.cos(a)*r*0.25,Math.sin(a)*r*0.25);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
  ctx.fillStyle='#101a30';ctx.strokeStyle=col;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,0,r*0.25,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+W.t*0.5;
    ctx.fillStyle=(Math.sin(W.t*2+i)>0)?lightCol:'rgba(125,140,163,.3)';
    ctx.fillRect(Math.cos(a)*r-1.5,Math.sin(a)*r-1.5,3,3);
  }
  ctx.restore();
  for(const bt of b.berths){
    const bp=berthPos(b,bt),sp=w2s(bp.pos.x,bp.pos.y),free=!bt.ship;
    ctx.fillStyle=free?COL.green:COL.red;ctx.shadowColor=free?COL.green:COL.red;ctx.shadowBlur=6;
    ctx.fillRect(sp.x-2.5,sp.y-2.5,5,5);ctx.shadowBlur=0;
    if(scale>1){ctx.fillStyle='rgba(125,140,163,.85)';ctx.font='8px IBM Plex Mono';ctx.fillText(bt.label,sp.x+6,sp.y+2);}
  }
  if(b===W.tianque){
    const lh=liftHeadPos(),sp=w2s(lh.x,lh.y);
    ctx.strokeStyle=COL.cyan;ctx.lineWidth=1.5;ctx.strokeRect(sp.x-6,sp.y-4,12,8);
    if(scale>1){ctx.fillStyle=COL.cyan;ctx.font='8px IBM Plex Mono';ctx.fillText('LIFT COLLAR ▼',sp.x+9,sp.y+3);}
  }
  for(const h of b.hatches){
    const a=h.ang+b.angle,d=dir(a);
    const hp=w2s(b.pos.x+d.x*(b.r+2),b.pos.y+d.y*(b.r+2));
    ctx.fillStyle=COL.cyan;ctx.fillRect(hp.x-2.5,hp.y-2.5,5,5);
    if(scale>1.6){ctx.fillStyle='rgba(63,216,255,.85)';ctx.font='8px IBM Plex Mono';ctx.fillText(h.label,hp.x+6,hp.y+2);}
    if(h.npc){
      const na=a+Math.sin(W.t*0.4+h.ang*7)*0.2,nd=dir(na);
      const nwp={x:b.pos.x+nd.x*(b.r+1),y:b.pos.y+nd.y*(b.r+1)};
      const np=w2s(nwp.x,nwp.y);
      ctx.fillStyle=FACCOL[NPCS[h.npc].fac];ctx.shadowColor=FACCOL[NPCS[h.npc].fac];ctx.shadowBlur=6;
      ctx.beginPath();ctx.arc(np.x,np.y,3.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      if(started&&dist(playerPos(),nwp)<70){
        ctx.fillStyle=COL.ink;ctx.font='9px IBM Plex Mono';ctx.fillText(NPCS[h.npc].name,np.x+7,np.y-5);}
    }
  }
  if(b===W.target){ctx.strokeStyle=COL.cyan;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(p.x,p.y,r+14,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle='rgba(223,233,245,.85)';ctx.font='10px Chakra Petch';ctx.fillText(b.name,p.x+r+8,p.y-r*0.5);
}
function drawBase(b,p,r,scale){
  const col=FACCOL[b.faction]||COL.cyan;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(b.angle+Math.PI/2+W.cam.rot);
  const bw=r*1.5,bh=r*0.85;
  ctx.fillStyle='#1d1913';ctx.strokeStyle=col;ctx.lineWidth=1.5;
  ctx.fillRect(-bw/2,-bh,bw,bh);ctx.strokeRect(-bw/2,-bh,bw,bh);
  ctx.fillStyle='#101a30';
  ctx.beginPath();ctx.arc(0,-bh,bw*0.26,Math.PI,0);ctx.fill();ctx.stroke();
  for(let i=0;i<4;i++){
    ctx.fillStyle=(Math.sin(W.t*2+i+b.ma*9)>0)?'rgba(255,210,63,.8)':'rgba(125,140,163,.25)';
    ctx.fillRect(-bw/2+bw*(0.14+i*0.22),-bh*0.65,Math.max(2,bw*0.08),Math.max(2,bh*0.22));
  }
  ctx.strokeStyle='rgba(125,140,163,.5)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-bw/2,0);ctx.lineTo(bw/2,0);ctx.stroke();
  ctx.restore();
  for(const bt of b.berths){
    const bp=berthPos(b,bt),sp=w2s(bp.pos.x,bp.pos.y);
    const ga=padGroundAngle(b,bt),gq=groundPoint(ga,groundH(groundArc(ga)));
    const gp=w2s(gq.x,gq.y);
    ctx.strokeStyle=!bt.ship?COL.green:COL.red;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(gp.x-11,gp.y);ctx.lineTo(gp.x+11,gp.y);ctx.stroke();
    ctx.strokeStyle='rgba(200,168,130,.35)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(gp.x-11,gp.y-3);ctx.lineTo(gp.x-11,gp.y+3);
    ctx.moveTo(gp.x+11,gp.y-3);ctx.lineTo(gp.x+11,gp.y+3);ctx.stroke();
    if(scale>1.6){ctx.fillStyle='rgba(125,140,163,.85)';ctx.font='8px IBM Plex Mono';ctx.fillText(bt.label,gp.x+14,gp.y+2);}
  }
  for(const h of b.hatches){
    const hma=b.ma+h.ang+W.moon.angle;
    const hq=groundPoint(hma,groundH(groundArc(hma))+1),hp=w2s(hq.x,hq.y);
    ctx.fillStyle=COL.cyan;ctx.shadowColor=COL.cyan;ctx.shadowBlur=6;
    ctx.fillRect(hp.x-2.5,hp.y-2.5,5,5);ctx.shadowBlur=0;
    if(scale>1.6){ctx.fillStyle='rgba(63,216,255,.85)';ctx.font='8px IBM Plex Mono';ctx.fillText(h.label,hp.x+7,hp.y+2);}
    if(h.npc){
      const nq=groundPoint(hma+0.0012,groundH(groundArc(hma))+1.1),np=w2s(nq.x,nq.y);
      ctx.fillStyle=FACCOL[NPCS[h.npc].fac];ctx.shadowColor=FACCOL[NPCS[h.npc].fac];ctx.shadowBlur=6;
      ctx.beginPath();ctx.arc(np.x,np.y,3.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      if(started&&dist(playerPos(),nq)<70){ctx.fillStyle=COL.ink;ctx.font='9px IBM Plex Mono';ctx.fillText(NPCS[h.npc].name,np.x+7,np.y-6);}
    }
  }
  if(scale>0.5){ctx.fillStyle='rgba(223,233,245,.85)';ctx.font='10px Chakra Petch';ctx.fillText(b.name,p.x+r*1.2,p.y-r*1.2);}
}
function drawShip(s,scale){
  if(dist({x:W.cam.x,y:W.cam.y},s.pos)>hyp(cv.width,cv.height)/2/DPR/scale+250)return;
  const p=w2s(s.pos.x,s.pos.y),r=Math.max(3,s.r*scale);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(s.angle+W.cam.rot);
  const col=s.faction?FACCOL[s.faction]:(s.kind==='lander'?COL.green:COL.cyan);
  if(s.kind==='freighter'){
    ctx.fillStyle='#1c2030';ctx.strokeStyle=col;ctx.lineWidth=1.5;
    ctx.fillRect(-r*1.6,-r*0.4,r*3.2,r*0.8);ctx.strokeRect(-r*1.6,-r*0.4,r*3.2,r*0.8);
    for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#232838':'#33353f';ctx.fillRect(-r*1.4+i*r*0.75,-r*0.3,r*0.6,r*0.6);}
    ctx.fillStyle=col;ctx.fillRect(r*1.3,-r*0.2,r*0.3,r*0.4);
  }else if(s.kind==='shuttle'){
    ctx.fillStyle='#101a30';ctx.strokeStyle=col;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(-r*0.7,-r*0.6);ctx.lineTo(-r*0.7,r*0.6);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=col;ctx.fillRect(-r*0.2,-r*0.15,r*0.4,r*0.3);
  }else if(s.kind==='lander'){
    ctx.fillStyle='#101a30';ctx.strokeStyle=col;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(0,-r*0.7);ctx.lineTo(-r*0.8,-r*0.4);
    ctx.lineTo(-r*0.8,r*0.4);ctx.lineTo(0,r*0.7);ctx.closePath();ctx.fill();ctx.stroke();
    const gearDown=s.docked&&s.docked.bth&&s.docked.bth.surface||(W.player.ship===s&&W.player.gear);
    if(gearDown){
      ctx.strokeStyle=col;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(-r*0.5,-r*0.45);ctx.lineTo(-r*1.0,-r*1.05);
      ctx.moveTo(-r*0.5,r*0.45);ctx.lineTo(-r*1.0,r*1.05);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-r*1.15,-r*1.05);ctx.lineTo(-r*0.85,-r*1.05);
      ctx.moveTo(-r*1.15,r*1.05);ctx.lineTo(-r*0.85,r*1.05);ctx.stroke();
    }
  }else{
    ctx.fillStyle='#101a30';ctx.strokeStyle=col;ctx.lineWidth=1.5;
    ctx.fillRect(-r*0.8,-r*0.5,r*1.6,r);ctx.strokeRect(-r*0.8,-r*0.5,r*1.6,r);
    ctx.fillStyle=col;ctx.fillRect(r*0.5,-r*0.2,r*0.4,r*0.4);
    ctx.strokeStyle='rgba(125,140,163,.6)';
    ctx.beginPath();ctx.moveTo(-r*0.8,-r*0.7);ctx.lineTo(-r*1.3,-r*0.7);
    ctx.moveTo(-r*0.8,r*0.7);ctx.lineTo(-r*1.3,r*0.7);ctx.stroke();
  }
  if(s.thrust>0.05&&!s.docked){
    ctx.fillStyle='rgba(63,216,255,'+(0.4+s.thrust*0.5)+')';ctx.shadowColor=COL.cyan;ctx.shadowBlur=12;
    ctx.beginPath();ctx.moveTo(-r*0.9,-r*0.25);ctx.lineTo(-r*(1.2+s.thrust*1.3),0);ctx.lineTo(-r*0.9,r*0.25);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  }
  ctx.restore();
  if(s===W.player.ship){ctx.strokeStyle=COL.cyan;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(p.x,p.y,r+7,0,Math.PI*2);ctx.stroke();}
  if(scale>0.8){ctx.fillStyle='rgba(223,233,245,.6)';ctx.font='8px IBM Plex Mono';ctx.fillText(s.name,p.x+r+6,p.y+3);}
}
function drawPlayer(scale){
  const P=W.player;
  if(P.mode==='pilot'||P.mode==='passenger'||P.mode==='lift')return;
  const p=w2s(P.pos.x,P.pos.y);
  const up=Math.atan2(P.pos.y,P.pos.x);
  const rot=up+Math.PI/2+W.cam.rot;
  const sz=Math.max(5,1.05*scale);
  // lamp cone
  const aim=P.aim+W.cam.rot;
  const lg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*7);
  lg.addColorStop(0,'rgba(255,210,63,.22)');lg.addColorStop(1,'rgba(255,210,63,0)');
  ctx.fillStyle=lg;ctx.beginPath();ctx.moveTo(p.x,p.y);
  ctx.arc(p.x,p.y,sz*7,aim-0.34,aim+0.34);ctx.closePath();ctx.fill();
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rot);
  const walking=Math.abs(P.groundSpd)>0.2&&!P.air;
  const lp=walking?Math.sin(P.walkPhase*6)*sz*0.35:0;
  ctx.strokeStyle='#b9c6d8';ctx.lineWidth=Math.max(1.2,sz*0.22);
  ctx.beginPath();ctx.moveTo(-sz*0.18,sz*0.35);ctx.lineTo(-sz*0.3+lp,sz*1.0);
  ctx.moveTo(sz*0.18,sz*0.35);ctx.lineTo(sz*0.3-lp,sz*1.0);ctx.stroke();
  ctx.fillStyle='#2b3a52';ctx.fillRect(-sz*0.55,-sz*0.35,sz*0.35,sz*0.8);
  ctx.fillStyle='#e6eef8';ctx.strokeStyle=COL.cyan;ctx.lineWidth=1.2;
  ctx.fillRect(-sz*0.34,-sz*0.5,sz*0.68,sz*0.95);
  ctx.strokeRect(-sz*0.34,-sz*0.5,sz*0.68,sz*0.95);
  ctx.beginPath();ctx.arc(0,-sz*0.72,sz*0.4,0,Math.PI*2);
  ctx.fillStyle='#f2f7ff';ctx.fill();ctx.stroke();
  ctx.fillStyle=COL.cyan;ctx.shadowColor=COL.cyan;ctx.shadowBlur=8;
  ctx.beginPath();ctx.arc(sz*0.1,-sz*0.75,sz*0.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.restore();
  ctx.strokeStyle=COL.cyan;ctx.shadowColor=COL.cyan;ctx.shadowBlur=9;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(p.x,p.y,sz*1.7,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
  for(let i=0;i<S.carry;i++){ctx.fillStyle=COL.amber;ctx.fillRect(p.x-11+i*5,p.y-sz*2.4,3.5,3.5);}
  if(P.air){
    // predicted landing
    let sx=P.pos.x,sy=P.pos.y,vx=P.vel.x,vy=P.vel.y,hit=null;
    for(let i=0;i<110;i++){
      const r=hyp(sx,sy);if(r<1)break;
      const g=MU/(r*r);
      vx-=sx/r*g*0.1;vy-=sy/r*g*0.1;
      sx+=vx*0.1;sy+=vy*0.1;
      if(hyp(sx,sy)<=R_MOON+SUIT_R){hit={x:sx,y:sy};break;}
      if(i%4===0){const q=w2s(sx,sy);
        ctx.fillStyle='rgba(63,216,255,.28)';ctx.fillRect(q.x-1,q.y-1,2,2);}
    }
    if(hit){
      const q=w2s(hit.x,hit.y);
      ctx.strokeStyle=COL.warn;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(q.x-7,q.y);ctx.lineTo(q.x+7,q.y);
      ctx.moveTo(q.x,q.y-7);ctx.lineTo(q.x,q.y+7);ctx.stroke();
      ctx.fillStyle=COL.warn;ctx.font='8px IBM Plex Mono';ctx.fillText('TOUCHDOWN',q.x+9,q.y+3);
    }
    const vlen=hyp(P.vel.x,P.vel.y);
    if(vlen>1){
      const va=Math.atan2(P.vel.y,P.vel.x)+W.cam.rot;
      ctx.strokeStyle='rgba(105,245,140,.7)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+Math.cos(va)*clamp(vlen*1.6,10,70),p.y+Math.sin(va)*clamp(vlen*1.6,10,70));ctx.stroke();
    }
  }
}
function drawGuides(w,h){
  const obj=objective(),guides=[];
  if(obj.pos)guides.push({pos:obj.pos,col:COL.green,label:'OBJ'});
  if(W.waypoint)guides.push({pos:W.waypoint.body?W.waypoint.body.pos:W.waypoint.pos,col:COL.cyan,label:'WP'});
  for(const g of guides){
    const s=w2s(g.pos.x,g.pos.y);
    if(s.x>26&&s.x<w-26&&s.y>110&&s.y<h-110){
      const pulse=0.5+0.5*Math.sin(W.t*4);
      ctx.strokeStyle=g.col;ctx.lineWidth=1.5;ctx.shadowColor=g.col;ctx.shadowBlur=8;
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.PI/4);
      ctx.strokeRect(-6-pulse*3,-6-pulse*3,12+pulse*6,12+pulse*6);ctx.restore();ctx.shadowBlur=0;
    }else{
      const cx=w/2,cy=h/2,a=Math.atan2(s.y-cy,s.x-cx);
      const ex=cx+Math.cos(a)*Math.min(w,h)*0.4,ey=cy+Math.sin(a)*Math.min(w,h)*0.4;
      ctx.save();ctx.translate(ex,ey);ctx.rotate(a);
      ctx.fillStyle=g.col;ctx.shadowColor=g.col;ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-6);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      ctx.restore();
      ctx.fillStyle=g.col;ctx.font='9px IBM Plex Mono';
      ctx.fillText(g.label+' '+fmtM(dist(playerPos(),g.pos)),ex-32,ey+18);
    }
  }
}
