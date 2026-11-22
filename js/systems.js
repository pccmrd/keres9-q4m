'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — SYSTEMS — mining, catalog scanning, particles, surface robots
   ================================================================ */

/* ---------------- MINING ---------------- */
let miningBeam=null;
function updateMining(dt){
  const P=W.player;miningBeam=null;
  if(!(held.mine||held.fire)||P.dead||P.mode==='lift'||P.mode==='passenger'){AudioSys.laser(false);return;}
  const pp=playerPos(),inShip=P.mode==='pilot';
  const range=inShip?280:70,power=(inShip?2.2:1.2)*(S.upgrades.laser?1.8:1);
  const aim=inShip?P.ship.angle:P.aim;
  let best=null,bd=1e9,bestBody=null;
  for(const b of W.bodies){
    if(!b.nodes||!b.nodes.length)continue;
    if(dist(pp,b.pos)>range+b.r+40)continue;
    for(const n of b.nodes){
      if(n.t<=0)continue;
      const a=n.ang+b.angle,d=dir(a);
      const np={x:b.pos.x+d.x*b.r*0.95,y:b.pos.y+d.y*b.r*0.95};
      const dd=dist(pp,np);if(dd>range)continue;
      const ang=Math.abs(wrapA(Math.atan2(np.y-pp.y,np.x-pp.x)-aim));
      if(ang<=0.35){if(dd<bd){bd=dd;best=n;bestBody=b;}}
      else if(held.mine&&!held.fire&&dd<bd){bd=dd;best=n;bestBody=b;}
    }
  }
  if(held.fire&&!best){
    miningBeam={x0:pp.x,y0:pp.y,x1:pp.x+Math.cos(aim)*range,y1:pp.y+Math.sin(aim)*range,hot:false};
    AudioSys.laser(true);return;
  }
  if(!best){AudioSys.laser(false);return;}
  const a=best.ang+bestBody.angle,d=dir(a);
  const np={x:bestBody.pos.x+d.x*bestBody.r*0.95,y:bestBody.pos.y+d.y*bestBody.r*0.95};
  miningBeam={x0:pp.x,y0:pp.y,x1:np.x,y1:np.y,hot:true};
  AudioSys.laser(true);
  const cut=Math.min(best.t,power*dt);best.t-=cut;
  spawnSparks(np.x,np.y,dt);
  if(inShip){
    const cap=shipSpec(P.ship).hold+(S.upgrades.hold?16:0);
    if(S.holdOre<cap)S.holdOre=Math.min(cap,S.holdOre+cut);
    else{toast('HOLD','Ore hold full — sell at an intake.','warn');AudioSys.laser(false);return;}
  }else{
    best._acc=(best._acc||0)+cut;
    if(best._acc>=1){best._acc-=1;const bv=velAt(bestBody,np);
      W.chunks.push({pos:{x:np.x,y:np.y},vel:{x:bv.x+(rng()-0.5)*3,y:bv.y+(rng()-0.5)*3},t:150,body:bestBody});
      if(W.chunks.length>40)W.chunks.shift();}
  }
  if(best.t<=0){
    bestBody.nodes.splice(bestBody.nodes.indexOf(best),1);
    spawnBurst(np.x,np.y,10,COL.amber);AudioSys.blip(500,0.12,'sawtooth',0.06);
    if(!inShip&&best._acc>0.3){const bv=velAt(bestBody,np);
      W.chunks.push({pos:{x:np.x,y:np.y},vel:{x:bv.x,y:bv.y},t:150,body:bestBody});}
  }
}
function updateChunks(dt){
  for(let i=W.chunks.length-1;i>=0;i--){
    const c=W.chunks[i];c.t-=dt;
    if(c.t<=0){W.chunks.splice(i,1);continue;}
    const r=hyp(c.pos.x,c.pos.y);
    if(r>R_MOON){const g=MU/(r*r)*0.9;c.vel.x-=c.pos.x/r*g*dt;c.vel.y-=c.pos.y/r*g*dt;}
    c.pos.x+=c.vel.x*dt;c.pos.y+=c.vel.y*dt;
    if(c.body){const d=dist(c.pos,c.body.pos);
      if(d<c.body.r+2&&d>0.01){const nx=(c.pos.x-c.body.pos.x)/d,ny=(c.pos.y-c.body.pos.y)/d;
        c.pos.x=c.body.pos.x+nx*(c.body.r+2);c.pos.y=c.body.pos.y+ny*(c.body.r+2);
        c.vel=velAt(c.body,c.pos);}}
  }
}

/* ---------------- SCAN ---------------- */
const tuner={open:false,target:null,freq:110,lock:0,hist:[],sweep:false,sweepDir:1};
function openTuner(){
  const t=W.target;
  if(!t||!t.scannable){toast('SCAN','No catalogued-mass target. T to cycle targets.','warn');return;}
  if(t.resolved){toast('SCAN',t.name+' already resolved.','info');return;}
  if(dist(playerPos(),t.pos)>1200){toast('SCAN','Out of array range (1200 m).','warn');return;}
  tuner.open=true;tuner.target=t;tuner.lock=0;tuner.hist=[];tuner.sweep=false;
  $('tunerPanel').classList.remove('hidden');
  setText($('tTgtName'),t.name);
  if(W.player.mode==='pilot'&&!W.player.ship.docked){W.player.match=true;toast('HELM','Station-keeping engaged while you tune.','info');}
  AudioSys.blip(1400,0.08,'sine',0.05);
}
function closeTuner(){tuner.open=false;tuner.target=null;$('tunerPanel').classList.add('hidden');}
function updateTuner(dt){
  if(!tuner.open)return;
  const t=tuner.target;
  if(!t||dist(playerPos(),t.pos)>1500){closeTuner();toast('SCAN','Target out of range — array stowed.','warn');return;}
  const f0=t.f0+Math.sin(W.t*0.35+t.f0)*(S.upgrades.track?0.5:1.6);
  if(tuner.sweep){
    tuner.freq+=tuner.sweepDir*14*dt;
    if(tuner.freq>140){tuner.freq=140;tuner.sweepDir=-1;}
    if(tuner.freq<80){tuner.freq=80;tuner.sweepDir=1;}
    $('tFreq').value=tuner.freq;
    if(Math.exp(-Math.pow((tuner.freq-f0)/1.1,2))>0.5)tuner.sweep=false;
  }
  const sig=Math.exp(-Math.pow((tuner.freq-f0)/1.1,2));
  tuner.hist.push(sig);if(tuner.hist.length>120)tuner.hist.shift();
  if(sig>0.78)tuner.lock=Math.min(3,tuner.lock+dt);else tuner.lock=Math.max(0,tuner.lock-dt*1.5);
  $('tRead').innerHTML=tuner.freq.toFixed(1)+' <small>kHz</small>';
  $('tSig').style.transform='scaleX('+sig.toFixed(3)+')';
  $('tLock').style.transform='scaleX('+(tuner.lock/3).toFixed(3)+')';
  drawScope();
  if(tuner.lock>=3)resolveMass(t);
}
function drawScope(){
  const c=$('tScope'),x=c.getContext('2d'),w=c.width,h=c.height;
  x.fillStyle='#060b16';x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(63,216,255,.12)';x.lineWidth=1;
  for(let i=1;i<4;i++){x.beginPath();x.moveTo(0,h*i/4);x.lineTo(w,h*i/4);x.stroke();}
  x.beginPath();
  tuner.hist.forEach((s,i)=>{const px=i/119*w,py=h-4-s*(h-8);i?x.lineTo(px,py):x.moveTo(px,py);});
  x.strokeStyle=COL.cyan;x.lineWidth=1.6;x.shadowColor=COL.cyan;x.shadowBlur=6;x.stroke();x.shadowBlur=0;
  x.fillStyle='rgba(105,245,140,.7)';x.fillRect(0,h-4-0.78*(h-8)-1,w,1);
}
function resolveMass(t){
  t.resolved=true;S.massesResolved++;S.flags.wenCount++;
  const bounty={rock:140,comet:320,hulk:260,freighter:180,station:220,debris:90}[t.kind]||120;
  S.credits+=bounty;S.scansPaid+=bounty;
  S.projects.array=clamp(S.projects.array+1,0,100);
  S.rep.com=clamp(S.rep.com+0.15,0,10);
  if(t.kind==='rock'&&t.rockName)t.name=t.code+' “'+t.rockName+'”';
  toast('CATALOG',t.name+' resolved · bounty '+fmtC(bounty),'pay');
  AudioSys.chime();log('Resolved '+t.name,'e');
  W.wireEvents.push('MASS RESOLVED · '+t.name+' · INTEGRITY '+integrity()+'%');
  if(t===W.vesper){S.flags.vesperScanned=true;
    toast('VESPER','Thermal core confirmed. Someone built a fire inside a comet. Three people want your data.','faction');
    W.wireEvents.push('WARM CORE CONFIRMED IN 2031 Q4 · VESPER');}
  if(t.kind==='comet'&&t!==W.vesper)S.flags.cometsScanned++;
  if(t===W.hulk1)toast('HULK','MERIDIAN-3 — a dead company\'s tug. Boots on, find the log hatch.','faction');
  closeTuner();save();
}

/* ---------------- PARTICLES ---------------- */
function push(p){if(W.particles.length>760)W.particles.shift();W.particles.push(p);}
function spawnBurst(x,y,n,col){
  for(let i=0;i<n;i++){const a=rng()*Math.PI*2,sp=4+rng()*22;
    push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.5+rng()*0.7,t:0,size:1+rng()*2,col});}
}
function spawnSparks(x,y,dt){
  if(rng()<dt*30){const a=rng()*Math.PI*2,sp=6+rng()*30;
    push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.3+rng()*0.4,t:0,size:0.8+rng()*1.4,col:rng()<0.5?COL.amber:COL.warn});}
}
function spawnThrust(x,y,ax,ay,dt){
  if(rng()<dt*40){const m=hyp(ax,ay)||1;
    push({x,y,vx:ax/m*30+(rng()-0.5)*8,vy:ay/m*30+(rng()-0.5)*8,life:0.25+rng()*0.3,t:0,size:1.5+rng()*2,col:COL.cyan});}
}
function spawnDust(x,y,_,__,inpX,d,spd){
  for(let i=0;i<3;i++){
    const tx=-d.y*(-inpX),ty=d.x*(-inpX);
    push({x,y,vx:tx*spd*0.18+(rng()-0.5)*2+d.x*(1+rng()*2),vy:ty*spd*0.18+(rng()-0.5)*2+d.y*(1+rng()*2),
      life:0.6+rng()*0.7,t:0,size:1+rng()*1.6,col:'#9c8768'});
  }
}
function updateParticles(dt){
  for(let i=W.particles.length-1;i>=0;i--){const p=W.particles[i];
    p.t+=dt;if(p.t>=p.life){W.particles.splice(i,1);continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.98;p.vy*=0.98;}
}

/* ---------------- ROBOTS ---------------- */
function updateRobots(dt){
  for(const r of W.robots){
    r.timer-=dt;
    if(r.state==='drill'){
      if(rng()<dt*8){const a=r.deposit+W.moon.angle,d=dir(a);spawnSparks(d.x*(R_MOON+2),d.y*(R_MOON+2),0.1);}
      if(r.timer<=0){r.state='haul';r.carry=2;}
    }else if(r.state==='haul'){
      const d=r.home-r.ma;
      r.ma+=Math.sign(d)*Math.min(Math.abs(d),5/R_MOON*dt);
      if(Math.abs(d)<0.0004){r.state='dump';r.timer=4;}
    }else if(r.timer<=0){
      if(S.flags.robotReprogrammed&&r.id===0)S.projects.array=clamp(S.projects.array+0.6,0,100);
      else S.projects.reactor=clamp(S.projects.reactor+0.6,0,100);
      r.state='drill';r.timer=10+rng()*8;r.carry=0;
    }
  }
}
