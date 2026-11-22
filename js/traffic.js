'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — TRAFFIC · SHIP AI — port launch queues, NPC ship behaviour, crew shuttle shifts
   ================================================================ */

/* ---------------- TRAFFIC ---------------- */
function portOf(st){return W.ports.find(p=>p.st===st);}
function corridorClear(st,bth,ship){
  const bp=berthPos(st,bth);
  const test=s=>{const rx=s.pos.x-bp.pos.x,ry=s.pos.y-bp.pos.y;
    const along=rx*bp.out.x+ry*bp.out.y,lat=Math.abs(-rx*bp.out.y+ry*bp.out.x);
    return along>-25&&along<320&&lat<95;};
  for(const s of W.ships){if(s===ship||s.docked)continue;if(test(s))return false;}
  const P=W.player;
  if(P.mode==='pilot'&&P.ship&&P.ship!==ship&&test(P.ship))return false;
  return true;
}
function requestLaunch(ship,st,bth,after){
  portOf(st).queue.push({ship,bth,after});
  W.trafficLog.push('T+'+Math.round(W.t)+' REQ '+ship.name+' @ '+st.name);
}
function trafficTick(dt){
  for(const p of W.ports){
    p.cool=Math.max(0,p.cool-dt);
    if(p.cool>0||!p.queue.length)continue;
    const q=p.queue[0];
    if(!corridorClear(p.st,q.bth,q.ship))continue;
    p.queue.shift();p.cool=6;
    const bp=berthPos(p.st,q.bth),bv=velAt(p.st,bp.pos);
    q.ship.docked=null;q.bth.ship=null;
    q.ship.pos={x:bp.pos.x,y:bp.pos.y};
    const isPlayer=q.ship===W.player.ship&&W.player.mode==='pilot';
    if(isPlayer){
      q.ship.vel={x:bv.x+bp.out.x*6,y:bv.y+bp.out.y*6};
      q.ship.state='free';q.ship.angVel=0;
      W.trafficLog.push('T+'+Math.round(W.t)+' CLEAR '+q.ship.name);
      if(q.after)q.after();
    }else{
      q.ship.vel={x:bv.x,y:bv.y};q.ship.state='depart';
      q.ship.route={target:{x:bp.pos.x+bp.out.x*300,y:bp.pos.y+bp.out.y*300},st:p.st,after:q.after};
      W.trafficLog.push('T+'+Math.round(W.t)+' CLEAR '+q.ship.name);
      if(q.ship===W.shuttle)toast('TRAFFIC','Shuttle cleared for departure.','info');
    }
  }
}
function berthFree(st,bth,ship){
  if(bth.ship)return false;
  if(bth.reserved&&(!ship||bth.reserved!==ship.id))return false;
  return true;
}

/* ---------------- SHIP AI ---------------- */
function seek(s,target,tvel,maxA,dt,arrive){
  const dx=target.x-s.pos.x,dy=target.y-s.pos.y,d=hyp(dx,dy);
  const sp=arrive?clamp(d*0.5,2,120):120;
  let dvx=(d>0.01?dx/d*sp:0)+tvel.x, dvy=(d>0.01?dy/d*sp:0)+tvel.y;
  let ax=(dvx-s.vel.x)*1.3, ay=(dvy-s.vel.y)*1.3;
  for(const b of W.bodies){
    if(b.kind!=='rock'&&b.kind!=='comet'&&b.kind!=='hulk'&&b.kind!=='debris')continue;
    const rx=s.pos.x-b.pos.x,ry=s.pos.y-b.pos.y,rd=hyp(rx,ry);
    if(rd<b.r+230&&rd>1){const push=(b.r+230-rd)*0.35;ax+=rx/rd*push;ay+=ry/rd*push;}
  }
  const am=hyp(ax,ay);if(am>maxA){ax=ax/am*maxA;ay=ay/am*maxA;}
  s.vel.x+=ax*dt;s.vel.y+=ay*dt;s.pos.x+=s.vel.x*dt;s.pos.y+=s.vel.y*dt;
  if(am>0.5)s.angle+=wrapA(Math.atan2(ay,ax)-s.angle)*clamp(2.2*dt,0,1);
  s.thrust=clamp(am/maxA,0,1);
  return d;
}
function npcDock(s,st,bth){
  if(!st||!bth)return;
  s.docked={st,bth};bth.ship=s;s.state='docked';s.thrust=0;s.angVel=0;
  const bp=berthPos(st,bth);s.pos={x:bp.pos.x,y:bp.pos.y};s.vel=velAt(st,bp.pos);
  s.angle=dockAngle(st,bth,bp);AudioSys.clunk();
}
function dockedFollow(s){
  const d=s.docked;if(!d)return;
  if(d.rock){const sp=rockSpot(d.rock,d.ang);s.pos=sp.pos;s.vel=sp.vel;
    s.angle=Math.atan2(-sp.out.y,-sp.out.x);return;}
  const bp=berthPos(d.st,d.bth);s.pos={x:bp.pos.x,y:bp.pos.y};s.vel=velAt(d.st,bp.pos);
  s.angle=dockAngle(d.st,d.bth,bp);
}
function approach(s,st,bth,dt,onDock){
  const bp=berthPos(st,bth),tv=velAt(st,bp.pos),p=portOf(st);
  if(!berthFree(st,bth,s)||(p.approach&&p.approach!==s)){
    s.state='hold';seek(s,{x:bp.pos.x+bp.out.x*440,y:bp.pos.y+bp.out.y*440},tv,6,dt,true);return;}
  p.approach=s;s.state='approach';
  const d=dist(s.pos,bp.pos);
  if(d>95)seek(s,{x:bp.pos.x+bp.out.x*65,y:bp.pos.y+bp.out.y*65},tv,7,dt,true);
  else{
    const dd=seek(s,bp.pos,tv,4,dt,true);
    const rv=hyp(s.vel.x-tv.x,s.vel.y-tv.y);
    s.angle+=wrapA(dockAngle(st,bth,bp)-s.angle)*clamp(3*dt,0,1);
    if(dd<6&&rv<1.7){p.approach=null;onDock();}
  }
}
function transit(s,target,tvel,dt,next){
  const d=seek(s,target,tvel,9,dt,true);
  const rv=hyp(s.vel.x-tvel.x,s.vel.y-tvel.y);
  if(d<42&&rv<7)next();
}
/* Uncontrolled hull: ballistically drifts under the Moon's gravity. */
function coast(s,dt){
  const r=hyp(s.pos.x,s.pos.y);
  if(r>1){const g=MU/(r*r);s.vel.x-=s.pos.x/r*g*dt;s.vel.y-=s.pos.y/r*g*dt;}
  s.pos.x+=s.vel.x*dt;s.pos.y+=s.vel.y*dt;
  s.angle+=(s.angVel||0)*dt;
  s.thrust=0;
}
function updateShips(dt){
  for(const s of W.ships){
    if(s===W.player.ship&&W.player.mode==='pilot'){if(s.docked)dockedFollow(s);continue;}
    if(s.docked){dockedFollow(s);s.timer-=dt;shipIdle(s,dt);continue;}
    s.timer-=dt;
    const r=s.route||{};
    if(s.state==='depart'){transit(s,r.target,velAt(r.st,r.target),dt,r.after);}
    else if(s.state==='transit'){transit(s,r.target,r.tvel(),dt,r.next);}
    else if(s.state==='hold'||s.state==='approach'){approach(s,r.st,r.bth,dt,()=>{npcDock(s,r.st,r.bth);if(r.onDock)r.onDock();});}
    else if(s.state==='orbit'){seek(s,r.target,{x:0,y:0},5,dt,true);if(s.timer<=0)r.next();}
    else coast(s,dt); // 'free' / unknown: Newtonian drift under gravity
  }
}
function shipIdle(s,dt){
  if(s.timer>0)return;
  if(s===W.shuttle){s.timer=9999;return;}
  if(s===W.htug){
    if(s.docked.st===W.hq){
      s.timer=9999;
      requestLaunch(s,W.hq,s.docked.bth,()=>{s.state='transit';
        s.route={target:berthPos(W.refinery,W.rB1).pos,tvel:()=>velAt(W.refinery,berthPos(W.refinery,W.rB1).pos),
          next:()=>{s.state='approach';s.route={st:W.refinery,bth:W.rB1,onDock:()=>{s.timer=22;
            S.projects.reactor=clamp(S.projects.reactor+1.5,0,100);}};}};});
    }else{
      s.timer=9999;
      requestLaunch(s,W.refinery,s.docked.bth,()=>{s.state='transit';
        s.route={target:berthPos(W.hq,W.hqP1).pos,tvel:()=>velAt(W.hq,berthPos(W.hq,W.hqP1).pos),
          next:()=>{s.state='approach';s.route={st:W.hq,bth:W.hqP1,onDock:()=>{s.timer=60;}};}};});
    }
    return;
  }
  if(s===W.kestrel||s===W.ares){
    const homeSt=s===W.kestrel?W.armstrong:W.refinery,homeB=s===W.kestrel?W.aB1:W.rB0;
    if(s.docked.st===homeSt){
      const orR=s===W.kestrel?17500:19500,oa=rng()*Math.PI*2;
      s.timer=9999;
      requestLaunch(s,homeSt,s.docked.bth,()=>{s.state='orbit';s.timer=55;
        s.route={target:{x:Math.cos(oa)*orR,y:Math.sin(oa)*orR},next:()=>{
          s.state='approach';s.route={st:homeSt,bth:homeB,onDock:()=>{s.timer=70+rng()*40;s.demand=30;
            toast('WIRE',s.name+' docked — fresh premium demand.','info');}};}};});
    }else s.timer=60;
    return;
  }
  s.timer=60;
}
function rockSpot(rock,ang){const a=ang+rock.angle,d=dir(a);
  const pos={x:rock.pos.x+d.x*(rock.r+8),y:rock.pos.y+d.y*(rock.r+8)};
  return{pos,vel:velAt(rock,pos),out:d,ang:a};}
function shuttleToSite(){
  const sh=W.shift,rock=sh.rock;
  sh.phase='transit';
  sh.spotAng=Math.atan2(W.tianque.pos.y-rock.pos.y,W.tianque.pos.x-rock.pos.x)+Math.PI;
  requestLaunch(W.shuttle,W.tianque,W.tB0,()=>{
    W.shuttle.state='transit';
    W.shuttle.route={target:rockSpot(rock,sh.spotAng).pos,tvel:()=>rockSpot(rock,sh.spotAng).vel,
      next:()=>{W.shuttle.docked={rock,ang:sh.spotAng};W.shuttle.state='docked';W.shuttle.timer=9999;
        dockedFollow(W.shuttle);AudioSys.clunk();
        sh.phase='site';sh.timer=SHIFT_WINDOW;
        toast('SHIFT','On site — '+rock.name+'. F to disembark. Cut, carry, pile at ◎.','good');
        log('Shuttle clamped at site rock','e');}};
  });
}
function shuttleReturn(){
  const sh=W.shift;if(!sh||(sh.phase!=='site'&&sh.phase!=='returnWait'))return;
  sh.phase='return';
  const sp=rockSpot(sh.rock,sh.spotAng);
  W.shuttle.docked=null;W.shuttle.state='transit';
  W.shuttle.vel={x:sp.vel.x+sp.out.x*14,y:sp.vel.y+sp.out.y*14};
  W.shuttle.route={target:berthPos(W.tianque,W.tB0).pos,tvel:()=>velAt(W.tianque,berthPos(W.tianque,W.tB0).pos),
    next:()=>{W.shuttle.state='approach';W.shuttle.route={st:W.tianque,bth:W.tB0,onDock:finishShift};}};
  toast('SHIFT','Shuttle returning to Tianque.','info');
}
function finishShift(){
  const sh=W.shift;if(!sh)return;
  const pile=sh.pile;
  if(pile>0){
    let pay=pile*SHIFT_RATE+(pile>=SHIFT_QUOTA?SHIFT_BONUS:0)+(sh.timer>0?60:0);
    if(S.flags.exclusiveCN)pay=Math.round(pay*1.2);
    S.credits+=pay;S.shiftsDone++;S.flags.shiftCount++;S.flags.firstShift=true;
    S.rep.cn=clamp(S.rep.cn+0.5,0,10);S.projects.skyfield=clamp(S.projects.skyfield+3,0,100);
    toast('PAYOUT',fmtC(pay)+' — '+pile+' chunks'+(pile>=SHIFT_QUOTA?' · QUOTA BONUS':'')+(sh.timer>0?' · ON TIME':''),'pay');
    AudioSys.pay();log('Shift paid '+pay+'₡','e');
    W.wireEvents.push('CREW SHIFT CLOSED · '+pile+' CHUNKS · TIANQUE INTAKE');
    if(S.flags.shiftCount===1)setTimeout(()=>toast('JOURNAL','Wen Qiu wants you at the CATALOG ARCHIVE hatch.','faction'),1600);
    if(S.flags.shiftCount===2)setTimeout(()=>toast('JOURNAL','Zhao Lin has a proposal about exclusivity.','faction'),1600);
  }
  W.shift=null;S.pile=0;save();
}
