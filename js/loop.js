'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — LOOP — fixed-step simulation + render pump
   ================================================================ */

/* ---------------- LOOP ---------------- */
let last=performance.now(),acc=0;
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000;last=now;
  if(dt>0.25)dt=0.25;
  const run=!modalStack.some(m=>BLOCKERS.includes(m));
  if(run){
    acc+=dt;let steps=0;
    while(acc>=1/60&&steps<4){
      const s=1/60;
      propagate(s);trafficTick(s);updateShips(s);
      if(started&&!W.player.dead)updatePlayer(s);
      updateMining(s);updateCombat(s);updateChunks(s);updateTuner(s);updateRobots(s);updateParticles(s);
      if(W.shift&&W.shift.phase==='site'&&W.shift.timer>0){
        W.shift.timer-=s;
        if(W.shift.timer<=0)toast('SHIFT','Punctuality window closed. The shuttle still waits for you — no crew left behind.','warn');
      }
      storyTick(s);
      acc-=1/60;steps++;
    }
    if(steps===4)acc=0;
  }else{AudioSys.thrust(0);AudioSys.laser(false);acc=0;}
  updateCamera(dt);
  render();
  if(started)syncHUD(dt);
  tickerTimer-=dt;
  if(tickerTimer<=0){rebuildTicker();tickerTimer=10;}
  if(!$('mChart').classList.contains('hidden'))renderChart();
}
