'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — COMBAT & SALVAGE — corsairs, cannon, drifting salvage
   Hostile corsairs patrol the hulks and debris fields. They are
   persistent: once aggroed they hunt for as long as you are in
   their reach. Killing one drops salvage canisters.
   ================================================================ */

/* ---------------- COMBAT ---------------- */
let cannonCd=0, salvageTimer=0;
const CANNON_CD=0.26, BOLT_PLAYER=900, BOLT_HOSTILE=640, HOSTILE_RANGE=520;
const CORSAIR_NAMES=['JACKAL','ORPHAN','HALCYON','MAGPIE','RED HYDRA','CINDER VOW'];

function ensureCombat(){
  if(W.hostiles)return;
  W.hostiles=[];W.bolts=[];W.canisters=[];
  const homes=[W.hulk1,W.hulk2].concat(W.bodies.filter(b=>b.kind==='debris'));
  let idx=0;
  for(const home of homes){
    if(!home)continue;
    const pack=home.kind==='debris'?1:2;
    for(let i=0;i<pack;i++){
      const a=rng()*Math.PI*2,rr=150+rng()*120;
      W.hostiles.push({id:'corsair'+(idx++),name:'CORSAIR · '+CORSAIR_NAMES[idx%CORSAIR_NAMES.length],
        kind:'corsair',r:14,pos:{x:home.pos.x+Math.cos(a)*rr,y:home.pos.y+Math.sin(a)*rr},
        vel:{x:home.vel.x*0.96+(rng()-0.5)*4,y:home.vel.y*0.96+(rng()-0.5)*4},
        angle:rng()*Math.PI*2,spin:0,hull:46,maxHull:46,state:'prowl',
        home:home,orbitR:130+rng()*90,strafeDir:rng()<0.5?1:-1,
        fireCd:1+rng(),flash:0,aggro:false,dead:false,thrust:0});
    }
    for(let i=0;i<3;i++)spawnCanister(home,140+rng()*260);
  }
}
function spawnCanister(home,rad){
  if(!home)return;
  const a=rng()*Math.PI*2;
  W.canisters.push({pos:{x:home.pos.x+Math.cos(a)*rad,y:home.pos.y+Math.sin(a)*rad},
    vel:{x:home.vel.x*0.97+(rng()-0.5)*3,y:home.vel.y*0.97+(rng()-0.5)*3},
    t:420,pulse:rng()*6});
}
function threatCount(){
  if(!W.hostiles)return 0;
  const pp=playerPos();let n=0;
  for(const h of W.hostiles)if(dist(pp,h.pos)<700)n++;
  return n;
}
function segDist(p,a,b){
  const abx=b.x-a.x,aby=b.y-a.y,len2=abx*abx+aby*aby;
  if(len2<0.001)return dist(p,a);
  let t=((p.x-a.x)*abx+(p.y-a.y)*aby)/len2;t=clamp(t,0,1);
  return hyp(p.x-(a.x+abx*t),p.y-(a.y+aby*t));
}
function damageHostile(h,dmg,why){
  if(h.dead)return;
  h.hull-=dmg;h.aggro=true;
  spawnBurst(h.pos.x,h.pos.y,3,COL.amber);
  if(h.hull<=0){
    h.dead=true;
    spawnBurst(h.pos.x,h.pos.y,16,COL.red);spawnBurst(h.pos.x,h.pos.y,12,COL.amber);spawnBurst(h.pos.x,h.pos.y,8,COL.cyan);
    W.shake=Math.min(1,(W.shake||0)+0.35);
    AudioSys.blip(90,0.5,'sawtooth',0.12);
    S.hostilesDown=(S.hostilesDown||0)+1;
    const drops=2+(rng()<0.5?1:0);
    for(let i=0;i<drops;i++)spawnCanister(h,4+rng()*8);
    log('Corsair destroyed — '+h.name,'e');
    toast('CANNON','Corsair down — salvage drifting free.','good');
  }
}
function updateHostile(h,dt){
  const P=W.player,pp=playerPos();
  const toP={x:pp.x-h.pos.x,y:pp.y-h.pos.y},d=Math.max(0.01,hyp(toP.x,toP.y));
  h.fireCd-=dt;h.flash=Math.max(0,h.flash-dt);
  const hunting=h.aggro||d<950||((S.holdOre||0)>=8&&d<1600);
  const state=(h.aggro&&h.hull<h.maxHull*0.28&&d>400)?'retreat':hunting?'hunt':'prowl';
  h.state=state;
  let ax=0,ay=0,maxA=0;
  if(state==='retreat'){
    maxA=3.1;ax=-toP.x/d*maxA;ay=-toP.y/d*maxA;
  }else if(state==='hunt'){
    maxA=2.7;
    if(d>230){ax=toP.x/d*maxA;ay=toP.y/d*maxA;}
    else if(d<130){ax=-toP.x/d*maxA;ay=-toP.y/d*maxA;}
    else{ax=-toP.y/d*maxA*0.85*h.strafeDir;ay=toP.x/d*maxA*0.85*h.strafeDir;}
  }else if(h.home){
    maxA=1.6;
    const hp=h.home.pos,ha=Math.atan2(h.pos.y-hp.y,h.pos.x-hp.x),oa=ha+0.4;
    const tx=hp.x+Math.cos(oa)*h.orbitR,ty=hp.y+Math.sin(oa)*h.orbitR;
    const tv=velAt(h.home,{x:tx,y:ty});
    const dx=tx-h.pos.x,dy=ty-h.pos.y,dd=Math.max(1,hyp(dx,dy));
    ax=dx/dd*maxA+(tv.x-h.vel.x)*0.6;ay=dy/dd*maxA+(tv.y-h.vel.y)*0.6;
    const am=hyp(ax,ay);if(am>maxA){ax=ax/am*maxA;ay=ay/am*maxA;}
  }
  for(const b of W.bodies){
    const rx=h.pos.x-b.pos.x,ry=h.pos.y-b.pos.y,rd=hyp(rx,ry),rad=b.r+120;
    if(rd<rad&&rd>1){const push=(rad-rd)*0.05;ax+=rx/rd*push;ay+=ry/rd*push;}
  }
  const r=hyp(h.pos.x,h.pos.y),g=MU/(r*r);
  h.vel.x+=(ax-h.pos.x/r*g)*dt;h.vel.y+=(ay-h.pos.y/r*g)*dt;
  h.pos.x+=h.vel.x*dt;h.pos.y+=h.vel.y*dt;
  const face=state==='hunt'?Math.atan2(toP.y,toP.x):Math.atan2(h.vel.y,h.vel.x);
  h.angle+=wrapA(face-h.angle)*clamp(3.2*dt,0,1);
  h.thrust=clamp(hyp(ax,ay)/3,0,1);
  if(state==='hunt'&&d<HOSTILE_RANGE&&h.fireCd<=0&&!P.dead){
    const pv=(P.mode==='pilot'&&P.ship)?P.ship.vel:P.vel;
    const lead=clamp(d/BOLT_HOSTILE,0,1.4)*0.85;
    const tp={x:pp.x+pv.x*lead,y:pp.y+pv.y*lead};
    const fa=Math.atan2(tp.y-h.pos.y,tp.x-h.pos.x)+(rng()-0.5)*0.09;
    if(Math.abs(wrapA(fa-h.angle))<0.6){
      W.bolts.push({x:h.pos.x+Math.cos(fa)*12,y:h.pos.y+Math.sin(fa)*12,
        vx:h.vel.x*0.35+Math.cos(fa)*BOLT_HOSTILE,vy:h.vel.y*0.35+Math.sin(fa)*BOLT_HOSTILE,
        t:0,life:2.6,dmg:7,hostile:true});
      h.fireCd=1.35+rng()*0.8;h.flash=0.18;
      spawnBurst(h.pos.x+Math.cos(fa)*14,h.pos.y+Math.sin(fa)*14,3,COL.red);
      AudioSys.blip(240,0.14,'sawtooth',0.08);
    }else h.fireCd=0.25;
  }
}
function updateBolts(dt){
  for(let i=W.bolts.length-1;i>=0;i--){
    const b=W.bolts[i];b.t+=dt;
    if(b.t>b.life){W.bolts.splice(i,1);continue;}
    const r=hyp(b.x,b.y);if(r>1){const g=MU/(r*r)*0.35;b.vx-=b.x/r*g*dt;b.vy-=b.y/r*g*dt;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    let dead=false;
    for(const bd of W.bodies){if(dist(b,bd.pos)<bd.r){spawnSparks(b.x,b.y,0.4);dead=true;break;}}
    if(!dead){
      if(b.hostile){
        const P=W.player;
        if(P.mode==='pilot'&&P.ship&&!P.ship.docked&&dist(b,P.ship.pos)<P.ship.r+4){
          P.ship.hull-=b.dmg;spawnBurst(b.x,b.y,6,COL.red);AudioSys.blip(140,0.2,'sawtooth',0.09);
          log('Corsair hit — hull '+Math.max(0,Math.round(P.ship.hull))+'%','e');
          if(P.ship.hull<=0)shipLost();
          dead=true;
        }else if(P.mode==='float'&&dist(b,P.pos)<2.6){
          damageSuit(6,'corsair fire');dead=true;
        }
      }else{
        for(const h of W.hostiles){if(!h.dead&&dist(b,h.pos)<h.r+4){damageHostile(h,b.dmg,'cannon');dead=true;break;}}
      }
    }
    if(dead)W.bolts.splice(i,1);
  }
}
function beamDamage(dt){
  if(typeof miningBeam==='undefined'||!miningBeam||!miningBeam.hot)return;
  const P=W.player,inShip=P.mode==='pilot';
  const dmg=(inShip?2.4:1.3)*(S.upgrades.laser?1.8:1)*dt;
  const a={x:miningBeam.x0,y:miningBeam.y0},b={x:miningBeam.x1,y:miningBeam.y1};
  for(const h of W.hostiles)if(!h.dead&&segDist(h.pos,a,b)<h.r+3)damageHostile(h,dmg,'laser');
}
function playerFireCannon(){
  const P=W.player;
  if(!held.fire||P.dead)return;
  if(P.mode==='lift'||P.mode==='passenger')return;
  if(P.mode==='pilot'&&P.ship&&P.ship.docked)return;
  if(cannonCd>0)return;
  const inShip=P.mode==='pilot'&&P.ship;
  const pp=playerPos(),range=inShip?380:150;
  const aim=inShip?P.ship.angle:P.aim;
  let best=null,bd=1e9;
  for(const h of W.hostiles){
    if(h.dead)continue;
    const d=dist(pp,h.pos);if(d>range)continue;
    const a=Math.abs(wrapA(Math.atan2(h.pos.y-pp.y,h.pos.x-pp.x)-aim));
    if(a<0.5&&d<bd){bd=d;best=h;}
  }
  if(!best)return;
  cannonCd=CANNON_CD;best.aggro=true;
  const fa=Math.atan2(best.pos.y-pp.y,best.pos.x-pp.x);
  const pv=inShip?P.ship.vel:P.vel;
  const mr=inShip?P.ship.r+4:3;
  W.bolts.push({x:pp.x+Math.cos(fa)*mr,y:pp.y+Math.sin(fa)*mr,
    vx:pv.x*0.35+Math.cos(fa)*BOLT_PLAYER,vy:pv.y*0.35+Math.sin(fa)*BOLT_PLAYER,
    t:0,life:1.6,dmg:9,hostile:false});
  spawnBurst(pp.x+Math.cos(fa)*(mr+2),pp.y+Math.sin(fa)*(mr+2),3,COL.cyan);
  AudioSys.blip(980,0.06,'square',0.07);
}
function updateSalvage(dt){
  salvageTimer-=dt;
  if(salvageTimer<=0){
    salvageTimer=35;
    if(W.canisters.length<6){
      const srcs=[W.hulk1,W.hulk2].concat(W.bodies.filter(b=>b.kind==='debris'));
      spawnCanister(srcs[Math.floor(rng()*srcs.length)],120+rng()*250);
    }
  }
  const P=W.player,pp=playerPos();
  const inShip=P.mode==='pilot'&&P.ship&&!P.ship.docked;
  const canEVA=P.mode==='float'||P.mode==='boots';
  for(let i=W.canisters.length-1;i>=0;i--){
    const c=W.canisters[i];c.t-=dt;c.pulse+=dt;
    if(c.t<=0){W.canisters.splice(i,1);continue;}
    const r=hyp(c.pos.x,c.pos.y);
    if(r>R_MOON){const g=MU/(r*r)*0.9;c.vel.x-=c.pos.x/r*g*dt;c.vel.y-=c.pos.y/r*g*dt;}
    if(inShip){const d=dist(pp,c.pos);
      if(d<70&&d>1){c.vel.x+=(pp.x-c.pos.x)/d*120*dt;c.vel.y+=(pp.y-c.pos.y)/d*120*dt;}}
    c.pos.x+=c.vel.x*dt;c.pos.y+=c.vel.y*dt;
    const d=dist(pp,c.pos);
    if((inShip&&d<16)||(canEVA&&d<2.8)){
      W.canisters.splice(i,1);
      S.salvage=(S.salvage||0)+1;S.credits+=130;
      toast('SALVAGE','+130₡ · canister secured','pay');AudioSys.pay();
      log('Salvage canister recovered (+130₡)','e');
    }
  }
}
function updateCombat(dt){
  ensureCombat();
  cannonCd-=dt;
  for(const h of W.hostiles)updateHostile(h,dt);
  updateBolts(dt);
  beamDamage(dt);
  playerFireCannon();
  updateSalvage(dt);
  for(let i=W.hostiles.length-1;i>=0;i--)if(W.hostiles[i].dead)W.hostiles.splice(i,1);
}
