'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — HUD — flight readouts, clamp gates, objective line
   ================================================================ */

/* ---------------- HUD SYNC ---------------- */
let hudTimer=0;
const VERBS={
  foot:'A/D WALK · SHIFT BOUND · W JUMP · F ACTION · R PING · M CUT',
  air:'A/D STEER · HOLD W EXTEND · S TUCK · B BOOTS · CROSSHAIR = TOUCHDOWN',
  boots:'A/D WALK HULL · SHIFT BOUND · W JUMP OFF · B RELEASE · F HATCH',
  float:'WASD JETPACK · B MAG BOOTS · F BOARD · R PING · C SCAN · SPACE FIRE',
  pilot:'WASD RCS · Q/E SPIN · SHIFT/CTRL THR · X MATCH · Z BRAKE · G GEAR · F CLAMP · SPACE FIRE',
  docked:'F STEP OUT · PANEL: LAUNCH / INTAKE / YARD / JOBS / CREW',
  pax:'F DISEMBARK WHEN DOCKED · C SCAN · T TARGET · P STORY',
  lift:'RIDING THE CABLE · C SCAN · P STORY · 1/2/3 CAMERA'
};
function verbKey(){
  const P=W.player;
  if(P.mode==='foot')return P.air?'air':'foot';
  if(P.mode==='pilot')return P.ship.docked?'docked':'pilot';
  if(P.mode==='passenger')return'pax';
  return P.mode;
}
function syncHUD(dt){
  hudTimer-=dt;if(hudTimer>0)return;hudTimer=0.09;
  const P=W.player;
  setText($('hudCredits'),fmtC(S.credits));
  const mk=verbKey();
  const modeName={foot:'FOOT',air:'AIR',boots:'BOOTS',float:'EVA FLOAT',pilot:P.ship?shipSpec(P.ship).name:'HELM',
    docked:'DOCKED',pax:'SHUTTLE',lift:'CABLE'}[mk]||'EVA';
  setText($('hudMode'),modeName);
  $('hudMode').style.color=mk==='air'?COL.warn:mk==='docked'?COL.green:COL.cyan;
  const alt=altMode?hyp(playerPos().x,playerPos().y):agl();
  $('hudAlt').innerHTML=(altMode?'RAD':'ALT')+' <b>'+Math.round(alt)+'</b> m';
  setText($('objText'),objective().text);
  const tgt=W.target;
  setText($('fD'),tgt?fmtM(dist(playerPos(),tgt.pos)):'—');
  setText($('fDV'),Math.round(P.mode==='pilot'&&P.ship?P.ship.dv:P.dv)+'');
  setText($('fORB'),Math.abs(P.groundSpd).toFixed(1));
  const hull=P.mode==='pilot'&&P.ship?P.ship.hull:P.hull;
  setText($('fHull'),Math.max(0,Math.round(hull))+'');
  const threat=typeof threatCount==='function'?threatCount():0;
  setText($('fThreat'),threat+'');$('fThreat').style.color=threat>0?COL.red:'';
  $('fHull').style.color=hull>60?COL.cyan:hull>30?COL.warn:COL.red;
  $('fTgt').innerHTML='TGT ▸ <b>'+(tgt?tgt.name+(tgt.resolved?' · resolved':' · unknown'):'—')+'</b>';
  setText($('verbs'),VERBS[mk]||VERBS.foot);
  const c=getContext(),bf=$('btnF');
  if(c){bf.disabled=!c.fn;setText($('btnFLabel'),c.label);bf.classList.toggle('ready',!!c.fn);
    $('ctxHint').classList.remove('hidden');setText($('ctxHint'),'F — '+c.label);}
  else{bf.disabled=true;setText($('btnFLabel'),'—');bf.classList.remove('ready');$('ctxHint').classList.add('hidden');}
  document.querySelector('[data-act="match"]').classList.toggle('on',P.match);
  document.querySelector('[data-act="brake"]').classList.toggle('on',P.brake);
  document.querySelector('[data-act="gear"]').classList.toggle('on',P.gear);
  document.querySelector('[data-act="boots"]').classList.toggle('on',P.mode==='boots');
  document.querySelector('[data-act="scan"]').classList.toggle('on',tuner.open);
  document.querySelector('[data-act="mine"]').classList.toggle('hot',held.mine);
  document.querySelector('[data-act="fire"]').classList.toggle('hot',held.fire);
  const nb=nearestBerth();
  if(nb){
    $('clampPanel').classList.remove('hidden');
    const g=clampGates(nb);
    gateBar('gSpd',g.spd/GATE.spd,g.spd.toFixed(1)+' m/s',g.spd<GATE.spd);
    gateBar('gAng',g.ang/GATE.ang,Math.round(g.ang*180/Math.PI)+'°',g.ang<GATE.ang);
    gateBar('gLat',g.lat/GATE.lat,g.lat.toFixed(1)+' m',g.lat<GATE.lat);
    gateBar('gRot',g.rot/GATE.rot,g.rot.toFixed(2),g.rot<GATE.rot);
    const hint=$('clampHint');hint.classList.toggle('ready',g.ok);
    hint.textContent=g.ok?'F — '+(nb.b.surface?'LAND':'CLAMP')+' · '+nb.st.name+' '+nb.b.label
      :!g.gearOk?'GEAR DOWN (G) · TAIL TO PAD':'APPROACH · MATCH (X) TO HOLD';
  }else $('clampPanel').classList.add('hidden');
  if(W.shift&&['site','await','returnWait'].includes(W.shift.phase)){
    $('shiftPanel').classList.remove('hidden');
    setText($('sPile'),W.shift.pile+'');setText($('sQuota'),SHIFT_QUOTA+'');
    const t=Math.max(0,W.shift.timer);
    setText($('sTimer'),W.shift.timer>0?Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'):'OVERTIME');
    setText($('sHint'),W.shift.pile>=SHIFT_QUOTA?'QUOTA MET — BOARD TO CASH OUT':'CUT ROCK · CARRY · PILE AT ◎');
  }else $('shiftPanel').classList.add('hidden');
  setText($('btnStory'),storyOn&&P.mode==='pilot'&&pilotOn?'STORY ▸ HELM':'STORY ▸ '+(storyOn?'ON':'OFF'));
  renderStrip();
}
function gateBar(id,ratio,val,ok){
  setText($(id+'V'),val);
  const b=$(id+'B');b.classList.toggle('ok',ok);
  b.querySelector('i').style.transform='scaleX('+clamp(1-ratio,0,1)+')';
}
