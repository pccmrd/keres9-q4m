'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — SAVE / LOAD — localStorage persistence
   ================================================================ */

/* ---------------- SAVE ---------------- */
function save(){
  if(!started)return;
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,S,worldT:W.t,
      resolved:W.bodies.filter(b=>b.resolved&&b.scannable).map(b=>b.id),
      waypoint:W.waypoint&&W.waypoint.body?W.waypoint.body.id:null}));
  }catch(e){}
}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
    const d=JSON.parse(raw);if(d.v!==1)return false;
    const base=newState();
    S=Object.assign(base,d.S);
    S.flags=Object.assign(base.flags,d.S.flags);
    S.rep=Object.assign(base.rep,d.S.rep);
    S.projects=Object.assign(base.projects,d.S.projects);
    S.upgrades=Object.assign(base.upgrades,d.S.upgrades);
    S.owned=Object.assign(base.owned,d.S.owned);
    buildWorld();
    W.t=d.worldT||0;propagate(0);
    for(const b of W.bodies)if(d.resolved.includes(b.id))b.resolved=true;
    if(S.owned.tug){
      const s={id:'ptug',name:'TUG · “SECOND DEPOSIT”',kind:'tug',r:SHIP.tug.r,pos:{x:0,y:0},vel:{x:0,y:0},
        angle:0,angVel:0,docked:{st:W.tianque,bth:W.tB1},state:'docked',timer:9999,thrust:0,hull:100,dv:SHIP.tug.dv};
      W.tB1.ship=s;W.ships.push(s);W.tug=s;dockedFollow(s);
    }
    if(S.owned.lander){
      const s={id:'plander',name:'LANDER · “CLAIM 7-C”',kind:'lander',r:SHIP.lander.r,pos:{x:0,y:0},vel:{x:0,y:0},
        angle:0,angVel:0,docked:{st:W.hyard,bth:W.hyP0},state:'docked',timer:9999,thrust:0,hull:100,dv:SHIP.lander.dv};
      W.hyP0.ship=s;W.ships.push(s);W.lander=s;dockedFollow(s);
    }
    if(d.waypoint){const b=W.bodies.find(b=>b.id===d.waypoint);if(b)W.waypoint={body:b,pos:b.pos};}
    const P=W.player;P.ma=W.hab.ma-0.004;P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);P.dv=suitMaxDV();
    return true;
  }catch(e){return false;}
}
setInterval(()=>{if(started&&!W.player.dead)save();},15000);
window.addEventListener('beforeunload',save);
