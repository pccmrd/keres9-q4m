'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — PLAYER · CONTEXT ACTIONS — EVA modes, piloting, boarding, docking, actions
   ================================================================ */

/* ---------------- PLAYER ---------------- */
function suitMaxDV(){return SUIT_DV+(S.upgrades.tank?120:0);}
function shipSpec(s){return SHIP[s.kind==='lander'?'lander':'tug'];}
function playerPos(){const P=W.player;
  if(P.mode==='pilot')return P.ship.pos;
  if(P.mode==='passenger')return P.passenger.pos;
  return P.pos;}
function playerVel(){const P=W.player;
  if(P.mode==='pilot')return P.ship.vel;
  if(P.mode==='passenger')return P.passenger.vel;
  return P.vel;}
function agl(){const p=playerPos();return hyp(p.x,p.y)-R_MOON;}
function camFrame(){const p=playerPos(),r=hyp(p.x,p.y)||1;
  const ux=p.x/r,uy=p.y/r;return{ux,uy,rx:-uy,ry:ux};}
function updatePlayer(dt){
  const P=W.player;if(P.dead)return;
  const inp=readInput();
  if(P.mode==='foot')footUpdate(P,inp,dt);
  else if(P.mode==='boots')bootsUpdate(P,inp,dt);
  else if(P.mode==='float')floatUpdate(P,inp,dt);
  else if(P.mode==='pilot')pilotUpdate(P,inp,dt);
  else if(P.mode==='passenger')passengerUpdate(P,dt);
  else if(P.mode==='lift')liftUpdate(P,dt);
  if(P.mode==='foot'||P.mode==='boots'){
    for(let i=W.chunks.length-1;i>=0;i--){const c=W.chunks[i];
      if(dist(c.pos,P.pos)<5&&S.carry<5){S.carry++;W.chunks.splice(i,1);AudioSys.blip(1200,0.05,'square',0.05);
        spawnBurst(c.pos.x,c.pos.y,4,COL.green);}}
    if(W.shift&&W.shift.phase==='site'&&S.carry>0){
      const bp=beaconPos();
      if(bp&&dist(bp,P.pos)<9){
        W.shift.pile+=S.carry;S.pile=W.shift.pile;
        spawnBurst(bp.x,bp.y,S.carry*3,COL.green);AudioSys.blip(700,0.08,'square',0.06);
        toast('PILE',S.carry+' chunks piled · '+W.shift.pile+'/'+SHIFT_QUOTA,'good');S.carry=0;
        if(W.shift.pile>=SHIFT_QUOTA)toast('SHIFT','Quota met. Board the shuttle at the clamp to cash out.','good');
      }
    }
  }
  W.ping=Math.max(0,W.ping-dt);
  for(let i=W.bootprints.length-1;i>=0;i--)if(W.t-W.bootprints[i].t>45)W.bootprints.splice(i,1);
}
function footUpdate(P,inp,dt){
  const sprint=keys.ShiftLeft||keys.ShiftRight||inp.sprint;
  const spd=sprint?BOUND:WALK;
  if(!P.air){
    const w=inp.x*spd/(R_MOON+SUIT_R);
    P.ma+=(OMEGA+w)*dt;
    P.pos=surfacePoint(P.ma);
    const d=dir(P.ma);
    P.groundSpd=inp.x*spd;
    P.vel={x:-OMEGA*d.y*R_MOON-d.y*P.groundSpd,y:OMEGA*d.x*R_MOON+d.x*P.groundSpd};
    if(Math.abs(inp.x)>0.1){
      P.walkPhase+=Math.abs(spd)*dt*0.55;
      const s=groundArc(P.ma);
      if(Math.abs(s-P.lastPrint)>0.95){
        P.lastPrint=s;W.bootprints.push({s,t:W.t});
        if(W.bootprints.length>170)W.bootprints.shift();
        AudioSys.step();
        const fp=groundPoint(P.ma,groundH(s));
        spawnDust(fp.x,fp.y,0,0,inp.x,d,spd);
      }
    }else P.groundSpd=0;
    if(inp.y<-0.55){P.air=true;P.jumpT=0;
      P.vel.x+=d.x*JUMP_V;P.vel.y+=d.y*JUMP_V;AudioSys.blip(300,0.1,'sine',0.05);
      spawnBurst(P.pos.x-d.x*1.2,P.pos.y-d.y*1.2,6,'#8d7a63');}
    P.aim=touchMode?P.ma+Math.PI/2+stickR.x*1.2:mouseAim(P);
  }else{
    P.jumpT+=dt;
    const r=hyp(P.pos.x,P.pos.y),d={x:P.pos.x/r,y:P.pos.y/r};
    let ax=0,ay=0;
    if(inp.y<-0.55&&P.jumpT<0.34){ax+=d.x*JUMP_HOLD;ay+=d.y*JUMP_HOLD;}
    if(inp.y>0.55){ax-=d.x*TUCK;ay-=d.y*TUCK;}
    ax+=-d.y*inp.x*AIR_STEER;ay+=d.x*inp.x*AIR_STEER;
    const g=MU/(r*r);
    P.vel.x+=(ax-d.x*g)*dt;P.vel.y+=(ay-d.y*g)*dt;
    P.pos.x+=P.vel.x*dt;P.pos.y+=P.vel.y*dt;
    P.groundSpd=(P.vel.x*(-d.y)+P.vel.y*d.x)-OMEGA*r;
    if(Math.abs(inp.x)>0.1)spawnThrust(P.pos.x,P.pos.y,-(-d.y*inp.x),-(d.x*inp.x),dt*0.4);
    const nr=hyp(P.pos.x,P.pos.y);
    if(nr<=R_MOON+SUIT_R){
      const nd={x:P.pos.x/nr,y:P.pos.y/nr};
      const vr=P.vel.x*nd.x+P.vel.y*nd.y;
      P.air=false;P.ma+=wrapA(Math.atan2(P.pos.y,P.pos.x)-P.ma);
      P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);
      if(-vr>FOOT_SAFE)damageSuit((-vr-FOOT_SAFE)*6,'hard landing');
      else{AudioSys.step();spawnBurst(P.pos.x-nd.x,P.pos.y-nd.y,5,'#8d7a63');}
      const sd=dir(P.ma);P.vel={x:-OMEGA*sd.y*R_MOON,y:OMEGA*sd.x*R_MOON};P.groundSpd=0;
    }
    P.aim=touchMode?P.aim+stickR.x*2.4*dt:mouseAim(P);
  }
}
function mouseAim(P){
  const w=s2w(mouse.x,mouse.y);
  return Math.atan2(w.y-P.pos.y,w.x-P.pos.x);
}
function bootsUpdate(P,inp,dt){
  const b=P.boots;if(!b){P.mode='float';return;}
  const sprint=keys.ShiftLeft||keys.ShiftRight||inp.sprint;
  const spd=sprint?BOUND:WALK,rr=b.r+SUIT_R;
  P.bootAng+=inp.x*spd/rr*dt+(b.spin||0)*dt;
  const d=dir(P.bootAng);
  P.pos={x:b.pos.x+d.x*rr,y:b.pos.y+d.y*rr};
  P.vel=velAt(b,P.pos);
  P.vel.x+=-d.y*inp.x*spd;P.vel.y+=d.x*inp.x*spd;
  P.groundSpd=inp.x*spd;
  if(Math.abs(inp.x)>0.1){P.walkPhase+=spd*dt*0.55;if(rng()<dt*6)AudioSys.step();}
  if(inp.y<-0.55){P.mode='float';P.boots=null;
    P.vel.x+=d.x*JUMP_V;P.vel.y+=d.y*JUMP_V;AudioSys.blip(300,0.1,'sine',0.05);}
  P.aim=touchMode?P.bootAng+stickR.x*1.2:mouseAim(P);
}
function floatUpdate(P,inp,dt){
  const r=hyp(P.pos.x,P.pos.y),d={x:P.pos.x/r,y:P.pos.y/r};
  const high=r-R_MOON>JET_AGL,A=high?SUIT_A:1.6;
  let ax=0,ay=0;
  if(P.dv>0&&(Math.abs(inp.x)>0.1||Math.abs(inp.y)>0.1)){
    const f=camFrame();
    ax=(f.rx*inp.x+f.ux*(-inp.y))*A;ay=(f.ry*inp.x+f.uy*(-inp.y))*A;
    P.dv=Math.max(0,P.dv-A*dt);
    spawnThrust(P.pos.x,P.pos.y,-ax,-ay,dt);AudioSys.thrust(0.5);
  }else AudioSys.thrust(0);
  const g=MU/(r*r);
  P.vel.x+=(ax-d.x*g)*dt;P.vel.y+=(ay-d.y*g)*dt;
  P.pos.x+=P.vel.x*dt;P.pos.y+=P.vel.y*dt;
  P.groundSpd=hyp(P.vel.x,P.vel.y);
  const nr=hyp(P.pos.x,P.pos.y);
  if(nr<=R_MOON+SUIT_R&&r-R_MOON<=JET_AGL){
    const nd={x:P.pos.x/nr,y:P.pos.y/nr},vr=P.vel.x*nd.x+P.vel.y*nd.y;
    if(-vr>FOOT_SAFE)damageSuit((-vr-FOOT_SAFE)*6,'hard landing');
    P.mode='foot';P.air=false;P.ma=Math.atan2(P.pos.y,P.pos.x);P.pos=surfacePoint(P.ma);
    P.lastPrint=groundArc(P.ma);
    const sd=dir(P.ma);P.vel={x:-OMEGA*sd.y*R_MOON,y:OMEGA*sd.x*R_MOON};AudioSys.thrust(0);
  }
  P.aim=touchMode?P.aim+stickR.x*2.4*dt:mouseAim(P);
}
function pilotUpdate(P,inp,dt){
  const s=P.ship,spec=shipSpec(s);
  if(s.docked){dockedFollow(s);s.thrust=0;AudioSys.thrust(0);return;}
  s.angVel+=inp.spin*2.2*dt;s.angVel*=Math.exp(-2.5*dt);s.angVel=clamp(s.angVel,-1.3,1.3);
  s.angle+=s.angVel*dt;
  const nose=dir(s.angle),left={x:-nose.y,y:nose.x};
  let ax=0,ay=0,burn=0;
  const manual=Math.abs(inp.x)>0.1||Math.abs(inp.y)>0.1||Math.abs(inp.spin)>0.1||P.thr>0.01;
  if(manual&&pilotOn){pilotOn=false;toast('HELM','Computer pilot disengaged — your stick.','warn');syncStoryUI();}
  if(pilotOn&&storyOn&&W.waypoint){
    const wp=W.waypoint,tv=wp.body?wp.body.vel:{x:0,y:0};
    const tgt=wp.body?{x:wp.body.pos.x+(wp.body.r+130),y:wp.body.pos.y}:wp.pos;
    seek(s,tgt,tv,spec.main*0.7,dt,true);burn=spec.main*0.7*s.thrust;
  }else if(P.match&&W.target){
    const tv=velAt(W.target,s.pos);
    const cx=(nose.x*(-inp.y)+left.x*inp.x)*8,cy=(nose.y*(-inp.y)+left.y*inp.x)*8;
    ax=(tv.x+cx-s.vel.x)*1.4;ay=(tv.y+cy-s.vel.y)*1.4;
    const am=hyp(ax,ay),mx=spec.rcs*1.4;if(am>mx){ax=ax/am*mx;ay=ay/am*mx;}burn=hyp(ax,ay);
  }else if(P.brake){
    const cx=(nose.x*(-inp.y)+left.x*inp.x)*8,cy=(nose.y*(-inp.y)+left.y*inp.x)*8;
    ax=(cx-s.vel.x)*1.4;ay=(cy-s.vel.y)*1.4;
    const am=hyp(ax,ay),mx=spec.rcs*1.4;if(am>mx){ax=ax/am*mx;ay=ay/am*mx;}burn=hyp(ax,ay);
  }else{
    const main=P.thr*spec.main;
    ax=nose.x*main+(nose.x*(-inp.y)+left.x*inp.x)*spec.rcs;
    ay=nose.y*main+(nose.y*(-inp.y)+left.y*inp.x)*spec.rcs;
    burn=hyp(ax,ay);
  }
  if(s.dv<=0){ax=0;ay=0;burn=0;}
  s.dv=Math.max(0,s.dv-burn*dt);
  const r=hyp(s.pos.x,s.pos.y),g=MU/(r*r);
  s.vel.x+=(ax-s.pos.x/r*g)*dt;s.vel.y+=(ay-s.pos.y/r*g)*dt;
  s.pos.x+=s.vel.x*dt;s.pos.y+=s.vel.y*dt;
  s.thrust=clamp(burn/spec.main,0,1);
  AudioSys.thrust(s.thrust);
  if(s.thrust>0.05)spawnThrust(s.pos.x-nose.x*s.r,s.pos.y-nose.y*s.r,-nose.x*ax,-nose.y*ay,dt);
  for(const b of W.bodies){
    if(b.kind==='freighter'||b.kind==='base')continue;
    const rr=hyp(s.pos.x-b.pos.x,s.pos.y-b.pos.y),min=b.r+spec.r;
    if(rr<min&&rr>0.01){
      const nx=(s.pos.x-b.pos.x)/rr,ny=(s.pos.y-b.pos.y)/rr,bv=velAt(b,s.pos);
      const vn=(s.vel.x-bv.x)*nx+(s.vel.y-bv.y)*ny;
      s.pos.x=b.pos.x+nx*min;s.pos.y=b.pos.y+ny*min;
      if(vn<0){s.vel.x-=nx*vn*1.3;s.vel.y-=ny*vn*1.3;
        if(-vn>12){s.hull-=(-vn-12)*3;W.shake=Math.min(14,W.shake-vn*0.4);AudioSys.clunk();
          toast('IMPACT','Hull stress — '+Math.round(s.hull)+'%','bad');
          if(s.hull<=0){shipLost();return;}}}
    }
  }
  const nr=hyp(s.pos.x,s.pos.y);
  if(nr<R_MOON+spec.r){
    const nd={x:s.pos.x/nr,y:s.pos.y/nr},bv={x:-OMEGA*nd.y*R_MOON,y:OMEGA*nd.x*R_MOON};
    const vn=(s.vel.x-bv.x)*nd.x+(s.vel.y-bv.y)*nd.y;
    s.pos.x=nd.x*(R_MOON+spec.r);s.pos.y=nd.y*(R_MOON+spec.r);
    if(vn<0){s.vel.x-=nd.x*vn*1.3;s.vel.y-=nd.y*vn*1.3;
      if(-vn>10){s.hull-=(-vn-10)*4;W.shake=14;AudioSys.alarm();
        if(s.hull<=0){shipLost();return;}
        toast('IMPACT','Regolith strike — hull '+Math.round(s.hull)+'%','bad');}}
  }
}
function passengerUpdate(P,dt){
  const s=P.passenger;P.pos={x:s.pos.x,y:s.pos.y};P.vel={x:s.vel.x,y:s.vel.y};
  AudioSys.thrust(s.thrust*0.5);
}
function liftUpdate(P,dt){
  const L=P.lift;L.t+=dt/L.dur;
  const a=W.liftMA+W.moon.angle,d=dir(a),r=lerp(L.r0,L.r1,clamp(L.t,0,1));
  P.pos={x:d.x*r,y:d.y*r};P.vel={x:-OMEGA*d.y*r,y:OMEGA*d.x*r};
  if(L.t>=1){
    if(L.up){P.mode='boots';P.boots=W.tianque;
      P.bootAng=Math.atan2(P.pos.y-W.tianque.pos.y,P.pos.x-W.tianque.pos.x);
      P.dv=suitMaxDV();
      toast('TIANQUE','Mag boots on the ring. A/D walk it, SHIFT to bound. F at hatches.','good');
      log('Rode the cable to Tianque','e');
    }else{P.mode='foot';P.air=false;P.ma=a;P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(a);P.dv=suitMaxDV();
      toast('SURFACE','Cable foot. The hab corridor is graded flat — A/D to walk.','info');}
    P.lift=null;AudioSys.clunk();
  }
}
function damageSuit(v,why){
  const P=W.player;P.hull-=v;W.shake=Math.min(14,W.shake+v*0.3);AudioSys.alarm();
  toast('SUIT','Impact — '+why+' · integrity '+Math.max(0,Math.round(P.hull))+'%','bad');
  if(P.hull<=0)playerLost();
}
function playerLost(){
  const P=W.player;P.dead=true;AudioSys.thrust(0);AudioSys.laser(false);
  $('deathCost').textContent='ACCEPT RECOVERY · −15% CREDITS ('+fmtC(Math.round(S.credits*0.15))+')';
  openModal('mDeath');log('SIGNAL LOST','e');
}
function shipLost(){
  const P=W.player,s=P.ship;
  if(s.docked&&s.docked.bth)s.docked.bth.ship=null;
  const home=s.kind==='lander'?{st:W.hyard,bth:W.hyP0}:{st:W.tianque,bth:W.tB1};
  if(home.bth.ship&&home.bth.ship!==s)home.bth.ship=null;
  s.docked={st:home.st,bth:home.bth};home.bth.ship=s;s.state='docked';s.timer=9999;s.hull=60;s.dv=shipSpec(s).dv*0.5;
  S.holdOre=0;P.mode='float';P.ship=null;P.dead=true;
  document.body.classList.remove('piloting');
  $('deathCost').textContent='ACCEPT RECOVERY · −15% CREDITS ('+fmtC(Math.round(S.credits*0.15))+') · HULL TOWED TO YARD';
  openModal('mDeath');AudioSys.thrust(0);log('HULL LOST — towed to yard','e');
}
function acceptRecovery(){
  S.credits=Math.round(S.credits*0.85);S.carry=0;
  const P=W.player;P.dead=false;P.hull=100;P.dv=suitMaxDV();
  P.mode='foot';P.air=false;P.boots=null;P.ship=null;P.passenger=null;P.lift=null;
  P.match=false;P.brake=false;P.thr=0;
  P.ma=W.hab.ma-0.004;P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);
  document.body.classList.remove('piloting');
  if(W.shift){W.shift=null;toast('SHIFT','Shift aborted. The rock keeps what you were carrying.','warn');}
  closeModal('mDeath');save();
  toast('RECOVERY','Lunar Mutual dropped you at HAB 7-C.','info');
}
function emergencyRecovery(){
  if(S.credits<400){toast('FUNDS','Recovery costs 400₡. You have '+fmtC(S.credits)+'.','bad');return;}
  S.credits-=400;
  const P=W.player;
  if(P.mode==='pilot'&&P.ship){
    const s=P.ship;let best=null,bd=1e9;
    for(const st of[W.tianque,W.armstrong,W.refinery])for(const b of st.berths)
      if(!b.surface&&berthFree(st,b,null)){const d=dist(s.pos,berthPos(st,b).pos);if(d<bd){bd=d;best={st,b};}}
    if(best){if(s.docked&&s.docked.bth)s.docked.bth.ship=null;npcDock(s,best.st,best.b);s.timer=9999;}
    P.ship=null;
  }
  P.mode='foot';P.air=false;P.boots=null;P.passenger=null;P.lift=null;P.dead=false;P.thr=0;
  P.ma=W.hab.ma-0.004;P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);P.dv=suitMaxDV();P.hull=100;
  document.body.classList.remove('piloting');
  closeAllModals();toast('RECOVERY','400₡ paid. Cargo kept. HAB 7-C under your boots.','pay');save();
}

/* ---------------- CONTEXT ACTIONS ---------------- */
function nearestBerth(){
  const P=W.player;if(P.mode!=='pilot'||!P.ship||P.ship.docked)return null;
  const s=P.ship;let best=null,bd=1e9;
  for(const st of[W.tianque,W.armstrong,W.refinery,W.hq,W.hyard,W.hab])
    for(const b of st.berths){
      if(b.ship)continue;
      if(b.reserved&&b.reserved!==s.id)continue;
      if(b.surface&&s.kind!=='lander')continue;
      const bp=berthPos(st,b),d=dist(s.pos,bp.pos);
      if(d<bd){bd=d;best={st,b,bp,d};}
    }
  return best&&best.d<75?best:null;
}
function clampGates(nb){
  const P=W.player,s=P.ship,tv=velAt(nb.st,nb.bp.pos);
  const spd=hyp(s.vel.x-tv.x,s.vel.y-tv.y);
  const rx=s.pos.x-nb.bp.pos.x,ry=s.pos.y-nb.bp.pos.y;
  const lat=Math.abs(-rx*nb.bp.out.y+ry*nb.bp.out.x);
  const along=rx*nb.bp.out.x+ry*nb.bp.out.y;
  const ang=Math.abs(wrapA(s.angle-dockAngle(nb.st,nb.b,nb.bp)));
  const rot=Math.abs(s.angVel);
  const gearOk=!nb.b.surface||P.gear;
  return{spd,ang,lat,rot,gearOk,along,
    ok:spd<GATE.spd&&ang<GATE.ang&&lat<GATE.lat&&rot<GATE.rot&&Math.abs(along)<32&&gearOk};
}
function beaconPos(){const sh=W.shift;if(!sh||sh.phase!=='site')return null;
  return rockSpot(sh.rock,sh.spotAng+0.45).pos;}
function vesperDoorPos(){const a=W.vesper.angle+0.8,d=dir(a);
  return{x:W.vesper.pos.x+d.x*(W.vesper.r+4),y:W.vesper.pos.y+d.y*(W.vesper.r+4)};}
function hulkHatchPos(){const a=W.hulk1.angle+1.7,d=dir(a);
  return{x:W.hulk1.pos.x+d.x*(W.hulk1.r+3),y:W.hulk1.pos.y+d.y*(W.hulk1.r+3)};}
function liftFootPos(){return groundPoint(W.liftMA+W.moon.angle,1);}
function liftHeadPos(){const a=W.liftMA+W.moon.angle,d=dir(a),r=R_HEAD-W.tianque.r-4;
  return{x:d.x*r,y:d.y*r};}
function getContext(){
  const P=W.player;if(P.dead||P.lift)return null;
  const pp=playerPos();
  if(P.mode==='pilot'){
    const s=P.ship;
    if(s.docked)return{label:s.docked.bth&&s.docked.bth.surface?'EXIT · SURFACE':'EXIT · EVA',fn:disembarkShip};
    if(keyWhole()&&!S.flags.doorOpened&&dist(pp,vesperDoorPos())<70)return{label:'OPEN THE DOOR',fn:openDoor};
    const nb=nearestBerth();
    if(nb){const g=clampGates(nb);
      if(g.ok)return{label:nb.b.surface?'LAND':'CLAMP',fn:()=>playerClamp(nb)};
      return{label:'GATES NOT MET',fn:null};}
    return{label:'EXIT · EVA',fn:playerExitShip};
  }
  if(P.mode==='passenger')return P.passenger.docked?{label:'DISEMBARK',fn:playerDisembark}:null;
  if(keyWhole()&&!S.flags.doorOpened&&dist(pp,vesperDoorPos())<26)return{label:'OPEN THE DOOR',fn:openDoor};
  if(!S.flags.doorOpened&&dist(pp,vesperDoorPos())<26)
    return{label:'INSPECT DOOR',fn:()=>{toast('VESPER','A door. Seam warm to the glove. Three keyways, three fragments.','faction');AudioSys.blip(500,0.2,'sine',0.06);}};
  if(P.boots===W.hulk1&&dist(pp,hulkHatchPos())<22&&!S.flags.hulkRead)return{label:'OPEN LOG',fn:readHulk};
  for(const s of[W.tug,W.lander])
    if(s&&dist(pp,s.pos)<28&&P.mode!=='pilot')return{label:'BOARD '+s.name.split(' · ')[0],fn:()=>boardShip(s)};
  if(dist(pp,W.shuttle.pos)<30&&P.mode!=='pilot'&&W.shift){
    if(W.shift.phase==='await')return{label:'BOARD SHUTTLE',fn:boardShuttle};
    if(W.shift.phase==='site'||W.shift.phase==='returnWait')return{label:'BOARD · RETURN',fn:boardShuttleReturn};
  }
  const bp=beaconPos();
  if(bp&&dist(pp,bp)<11&&W.shift.pile>=SHIFT_QUOTA)return{label:'CALL RETURN',fn:()=>{W.shift.phase='returnWait';shuttleReturn();}};
  if(P.mode==='foot'&&dist(pp,liftFootPos())<32)return{label:'RIDE LIFT UP',fn:()=>rideLift(true)};
  if(P.boots===W.tianque&&dist(pp,liftHeadPos())<42)return{label:'RIDE LIFT DOWN',fn:()=>rideLift(false)};
  if(P.mode==='boots'&&P.boots&&P.boots.hatches){
    const st=P.boots;
    for(const h of st.hatches){
      const a=h.ang+st.angle,d=dir(a);
      const hp={x:st.pos.x+d.x*(st.r+2),y:st.pos.y+d.y*(st.r+2)};
      if(dist(pp,hp)<22){
        if(h.npc)return{label:'TALK · '+NPCS[h.npc].name.toUpperCase(),fn:()=>startDialogue(h.npc)};
        return{label:h.label,fn:()=>openStation(st,h.tab||'intake')};
      }
    }
  }
  if(P.mode==='foot'){
    for(const st of[W.hq,W.hyard,W.hab])
      for(const h of st.hatches){
        const hp=groundPoint(st.ma+h.ang+W.moon.angle,2);
        if(dist(pp,hp)<28){
          if(h.npc)return{label:'TALK · '+NPCS[h.npc].name.toUpperCase(),fn:()=>startDialogue(h.npc)};
          return{label:h.label,fn:()=>openStation(st,h.tab||'intake')};
        }
      }
  }
  return null;
}
function doAction(){const c=getContext();if(c&&c.fn){AudioSys.blip(900,0.05,'square',0.05);c.fn();}}
function rideLift(up){
  const P=W.player;P.mode='lift';P.boots=null;P.air=false;
  P.lift={up,t:0,dur:34,r0:up?R_MOON+4:R_HEAD-W.tianque.r-6,r1:up?R_HEAD-W.tianque.r-6:R_MOON+4};
  toast('CABLE LIFT',up?'Climbing to synchronous altitude. 34 seconds of Moon falling away.':'Descending. The regolith comes up to meet you.','info');
  AudioSys.swell();log('Cable lift '+(up?'ascent':'descent'),'e');
}
function boardShip(s){
  const P=W.player;P.boots=null;P.air=false;
  P.mode='pilot';P.ship=s;P.match=false;P.brake=false;P.thr=0;
  s.hull=s.hull||100;s.dv=s.dv||shipSpec(s).dv;
  document.body.classList.add('piloting');
  AudioSys.thrust(0);
  toast('HELM',s.name+' — helm is yours.'+(s.docked?' F to step out, panel to launch.':''),'info');
  if(s.docked&&s.docked.st)openStation(s.docked.st,'intake');
  log('Boarded '+s.name,'e');
}
function playerExitShip(){
  const P=W.player,s=P.ship;
  if(s.docked){disembarkShip();return;}
  P.mode='float';P.ship=null;document.body.classList.remove('piloting');
  const d=dir(s.angle+Math.PI/2);
  P.pos={x:s.pos.x+d.x*(s.r+4),y:s.pos.y+d.y*(s.r+4)};
  P.vel={x:s.vel.x,y:s.vel.y};P.dv=Math.max(P.dv,60);
  AudioSys.thrust(0);AudioSys.clunk();
  toast('EVA','Free float. WASD is the jetpack. B for mag boots on any hull.','info');
}
function disembarkShip(){
  const P=W.player,s=P.ship;if(!s.docked)return;
  const d=s.docked;
  document.body.classList.remove('piloting');P.ship=null;
  AudioSys.thrust(0);AudioSys.clunk();
  if(d.bth&&d.bth.surface){
    P.mode='foot';P.air=false;P.ma=padGroundAngle(d.st,d.bth)+0.004;
    P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);
    toast('SURFACE','Boots on the apron. A/D walk, SHIFT bound.','good');
  }else if(d.st){
    P.mode='boots';P.boots=d.st;P.bootAng=d.bth.ang+d.st.angle;
    toast('EVA','Boots on the ring. A/D walk it, F at hatches.','good');
  }
  P.dv=suitMaxDV();P.hull=Math.min(100,P.hull+30);
  closeStation();
}
function playerUndock(){
  const P=W.player,s=P.ship;if(!s||!s.docked)return;
  const{st,bth}=s.docked;
  closeStation();
  s.state='queued';
  requestLaunch(s,st,bth,()=>{toast('TRAFFIC','Departure clearance granted. Corridor is yours.','good');});
  toast('TRAFFIC','Launch queued — one ship moves at a time on this port.','info');
}
function playerClamp(nb){
  const P=W.player,s=P.ship;
  npcDock(s,nb.st,nb.b);s.timer=9999;
  toast('CLAMP',nb.b.surface?'Landed — '+nb.st.name+' '+nb.b.label:'Clamped — '+nb.st.name+' '+nb.b.label,'good');
  s.dv=shipSpec(s).dv;P.dv=suitMaxDV();P.hull=Math.min(100,P.hull+30);
  openStation(nb.st,'intake');save();
}
function boardShuttle(){
  const P=W.player;P.mode='passenger';P.passenger=W.shuttle;P.boots=null;
  W.shift.phase='boarding';
  toast('SHUTTLE','Aboard TQ-2. She launches when traffic clears.','info');
  shuttleToSite();
}
function boardShuttleReturn(){
  const P=W.player;P.mode='passenger';P.passenger=W.shuttle;P.boots=null;
  if(W.shift.phase==='site'||W.shift.phase==='returnWait')shuttleReturn();
}
function playerDisembark(){
  const P=W.player,s=P.passenger;P.passenger=null;
  if(s.docked&&s.docked.rock){
    P.mode='boots';P.boots=s.docked.rock;P.bootAng=s.docked.ang+s.docked.rock.angle+0.25;
    toast('EVA','Boots on the rock. ◎ drop beacon is east. M to cut, F at the shuttle to return.','good');
  }else if(s.docked&&s.docked.st){
    const st=s.docked.st;
    if(s.docked.bth.surface){P.mode='foot';P.air=false;P.ma=padGroundAngle(st,s.docked.bth)+0.004;
      P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);}
    else{P.mode='boots';P.boots=st;P.bootAng=s.docked.bth.ang+st.angle;}
    P.dv=suitMaxDV();P.hull=Math.min(100,P.hull+30);
  }else{P.mode='float';P.pos={x:s.pos.x+12,y:s.pos.y};P.vel={x:s.vel.x,y:s.vel.y};}
  AudioSys.clunk();
}
function toggleBoots(){
  const P=W.player;
  if(P.mode==='boots'){P.mode='float';P.boots=null;toast('BOOTS','Mag boots off — free float. WASD jetpack.','info');return;}
  if(P.mode==='float'||P.mode==='foot'){
    let best=null,bd=1e9;
    for(const b of W.bodies){if(b.kind==='base'||b.kind==='freighter')continue;
      const d=dist(P.pos,b.pos)-b.r;if(d<14&&d<bd){bd=d;best=b;}}
    for(const s of W.ships){if(s===P.ship)continue;const d=dist(P.pos,s.pos)-s.r;if(d<12&&d<bd){bd=d;best=s;}}
    if(best){P.mode='boots';P.boots=best;P.air=false;
      P.bootAng=Math.atan2(P.pos.y-best.pos.y,P.pos.x-best.pos.x);
      toast('BOOTS','Mag boots on '+(best.name||'hull')+'. You inherit her motion.','good');AudioSys.clunk();}
    else toast('BOOTS','No hull in reach. Get closer.','warn');
  }
}
function cycleTarget(){
  const pp=playerPos();
  const list=W.bodies.filter(b=>b.kind!=='base').concat(W.hostiles||[]).sort((a,b)=>dist(pp,a.pos)-dist(pp,b.pos));
  W.target=list[(list.indexOf(W.target)+1)%list.length];
  AudioSys.blip(1000,0.04,'square',0.04);
}
function doPing(){W.ping=6;AudioSys.ping();toast('PING','Hand-scanner pulse — valuables outlined for six seconds.','info');}
