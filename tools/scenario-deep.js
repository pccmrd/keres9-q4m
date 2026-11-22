(async function(){
  const tick = ms => new Promise(r => setTimeout(r, ms));
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, {code, key: code, bubbles: true, cancelable: true}));
  const step = (n) => { for (let i = 0; i < n; i++) { /* advance a few rAF frames */ } };
  const log = [];
  function check(name, cond, extra) { log.push((cond?'PASS ':'FAIL ')+name+(extra?' :: '+extra:'')); }

  // --- 1. Walk to lift and ride up (already at lift from harness? ensure)
  W.player.mode='foot'; W.player.air=false; W.player.lift=null; W.player.dead=false;
  W.player.ma=W.liftMA+W.moon.angle; W.player.pos=surfacePoint(W.player.ma);
  await tick(100);
  key('keydown','KeyF'); key('keyup','KeyF'); // ride lift up
  await tick(300);
  check('lift started', W.player.mode==='lift', 'mode='+W.player.mode);
  // fast-forward lift
  if (W.player.lift) { W.player.lift.t = 0.999; }
  await tick(600);
  check('arrived Tianque (boots)', W.player.mode==='boots' && W.player.boots===W.tianque, 'mode='+W.player.mode+' boots='+(W.player.boots&&W.player.boots.id));

  // --- 2. Sign a shift via dialogue
  startDialogue('zhao');
  await tick(120);
  document.getElementById('dlgText').click(); // skip typewriter
  await tick(120);
  // click first choice if present (sign shift)
  const choices = document.querySelectorAll('#dlgChoices .dchoice');
  log.push('dialogue choices: '+choices.length);
  let signed = false;
  for (const c of choices) { if (/sign the shift/i.test(c.textContent)) { c.click(); signed = true; break; } }
  await tick(300);
  check('shift signed', !!W.shift, 'shift='+(W.shift?W.shift.phase:'none'));
  if (dlgState) closeDialogue();

  // --- 3. Walk to shuttle berth 0 and board
  if (W.shift) {
    const bp = berthPos(W.tianque, W.tB0);
    W.player.mode='boots'; W.player.boots=W.tianque; W.player.air=false; W.player.lift=null;
    W.player.bootAng = Math.atan2(W.shuttle.pos.y-W.tianque.pos.y, W.shuttle.pos.x-W.tianque.pos.x);
    await tick(150);
    const ctx = getContext();
    log.push('ctx at shuttle: '+(ctx?ctx.label:'null'));
    if (ctx && ctx.fn) ctx.fn();
    await tick(300);
    check('boarded shuttle (passenger)', W.player.mode==='passenger', 'mode='+W.player.mode+' phase='+(W.shift&&W.shift.phase));
  }

  // --- 4. Wait for shuttle transit to site (may take a while) — force it
  if (W.shift && W.shift.phase !== 'site') {
    // jump: simulate arrival
    if (W.shift.phase==='await'||W.shift.phase==='boarding'||W.shift.phase==='transit') {
      W.shift.phase='site'; W.shift.spotAng=0.5;
      W.shuttle.docked={rock:W.shift.rock, ang:W.shift.spotAng}; W.shuttle.state='docked'; dockedFollow(W.shuttle);
      W.shift.timer=SHIFT_WINDOW;
      // disembark as passenger
      if (W.player.mode==='passenger') playerDisembark();
      await tick(200);
    }
  }
  check('at site', W.shift && W.shift.phase==='site', 'phase='+(W.shift&&W.shift.phase)+' mode='+W.player.mode);

  // --- 5. Disembark onto rock (boots) & mine
  if (W.player.mode==='passenger') { playerDisembark(); await tick(200); }
  check('boots on rock', W.player.mode==='boots' && W.player.boots && W.player.boots.kind==='rock', 'mode='+W.player.mode);

  // Find a node and hold mine for a bit
  if (W.player.mode==='boots') {
    const rock = W.shift.rock;
    if (rock.nodes.length) {
      const n = rock.nodes[0];
      // stand next to node
      const a = n.ang + rock.angle, d = dir(a);
      const rr = rock.r + 2.5;
      W.player.bootAng = a;
      held.mine = true;
      W.player.aim = Math.atan2((rock.pos.y+d.y*rr)-W.player.pos.y, (rock.pos.x+d.x*rr)-W.player.pos.x);
      await tick(5500);
      held.mine = false;
      check('mining produced ore', W.chunks.length > 0 || S.holdOre > 0 || S.carry > 0, 'chunks='+W.chunks.length+' hold='+S.holdOre+' carry='+S.carry);
    } else log.push('rock has no nodes');
  }

  // --- 6. Deposit carried ore at beacon (chunks auto-pickup into carry within 5 m)
  if (S.carry > 0 && W.shift) {
    check('chunk pickup (carry)', S.carry > 0, 'carry='+S.carry);
    const bp = beaconPos();
    if (bp && W.player.mode==='boots' && W.player.boots) {
      // boots mode recomputes pos from bootAng — aim the player at the beacon instead
      W.player.bootAng = Math.atan2(bp.y-W.player.boots.pos.y, bp.x-W.player.boots.pos.x);
      await tick(400);
    }
    check('pile increased', W.shift.pile > 0, 'pile='+W.shift.pile+' carry='+S.carry);
  }

  // --- 7. Buy a tug (give credits)
  S.credits = 5000;
  buyTug();
  await tick(200);
  check('tug bought', S.owned.tug && !!W.tug, 'owned='+S.owned.tug);
  check('tug docked at tianque', W.tug && W.tug.docked && W.tug.docked.st===W.tianque, W.tug&&JSON.stringify({d:!!W.tug.docked}));

  // --- 8. Board tug and undock
  if (W.tug) {
    // put player next to tug
    W.player.mode='boots'; W.player.boots=W.tianque; W.player.air=false; W.player.lift=null;
    W.player.bootAng = Math.atan2(W.tug.pos.y-W.tianque.pos.y, W.tug.pos.x-W.tianque.pos.x);
    await tick(150);
    let ctx=getContext(); log.push('ctx at tug: '+(ctx?ctx.label:'null'));
    if (ctx&&ctx.fn) ctx.fn();
    await tick(200);
    check('boarding tug', W.player.mode==='pilot' && W.player.ship===W.tug, 'mode='+W.player.mode);
    if (W.player.mode==='pilot') {
      playerUndock();
      await tick(1500); // wait for traffic clear
      check('tug launched', !W.tug.docked, 'state='+W.tug.state+' docked='+!!W.tug.docked);
      // thrust a bit
      key('keydown','KeyW'); // RCS forward? W = translate up in ship frame
      await tick(600);
      key('keyup','KeyW');
      const spd = hyp(W.tug.vel.x, W.tug.vel.y);
      log.push('tug speed after burn: '+spd.toFixed(2)+' m/s, dv='+W.tug.dv.toFixed(0));
      check('tug moving (newtonian)', spd > 0.5, 'spd='+spd.toFixed(2));
      // verify velocity persists after keys released
      await tick(1000);
      const spd2 = hyp(W.tug.vel.x, W.tug.vel.y);
      check('velocity persists (no friction)', Math.abs(spd2-spd) < spd*0.5+2, 'spd2='+spd2.toFixed(2));
      // spin
      key('keydown','KeyQ'); await tick(400); key('keyup','KeyQ');
      check('ship rotating', Math.abs(W.tug.angVel) > 0.001 || Math.abs(W.tug.angle) > 0, 'angVel='+W.tug.angVel.toFixed(3));
      // target cycle + match
      key('keydown','KeyT'); key('keyup','KeyT'); await tick(100);
      key('keydown','KeyX'); key('keyup','KeyX'); await tick(400);
      log.push('target='+(W.target?W.target.name:'none')+' match='+(W.player.match));
      // scan tuner on a target
      key('keydown','KeyC'); key('keyup','KeyC'); await tick(300);
      log.push('tuner open='+tuner.open+' target='+(tuner.target?tuner.target.name:'none'));
      if (tuner.open) { closeTuner(); }
      // EVA exit
      playerExitShip();
      await tick(200);
      check('EVA exit', W.player.mode==='float', 'mode='+W.player.mode);
      // mag boots back on tug
      toggleBoots();
      await tick(200);
      check('mag boots on hull', W.player.mode==='boots', 'mode='+W.player.mode+' on='+(W.player.boots&&W.player.boots.name));
      // board again
      boardShip(W.tug);
      await tick(100);
      // clamp back at a berth: teleport near visitor berth with gates met
      const st=W.tianque, b=W.tB2, bp=berthPos(st,b);
      W.tug.pos={x:bp.pos.x,y:bp.pos.y};
      W.tug.vel=velAt(st,bp.pos);
      W.tug.angle=dockAngle(st,b,bp); W.tug.angVel=0;
      W.player.gear=false;
      await tick(300);
      const nb=nearestBerth();
      check('near berth for clamp', !!nb, nb?('d='+nb.d.toFixed(1)+' label='+nb.b.label):'none');
      if (nb) {
        const g=clampGates(nb);
        check('gates met', g.ok, JSON.stringify({spd:+g.spd.toFixed(2),ang:+g.ang.toFixed(2),lat:+g.lat.toFixed(2),rot:+g.rot.toFixed(2),gear:g.gearOk}));
        if (g.ok) { playerClamp(nb); await tick(300); check('clamped', !!W.tug.docked, 'docked='+!!W.tug.docked); }
      }
    }
  }

  // --- 9. Sell ore from hold at intake
  if (W.player.mode==='pilot' && W.tug && W.tug.docked && W.tug.docked.st===W.tianque) {
    S.holdOre = Math.max(S.holdOre, 1); // ensure something to sell
    const before = S.credits;
    sellOre(W.tianque);
    check('ore sold', S.credits > before, 'before='+before+' after='+S.credits+' hold='+S.holdOre);
  }

  // --- 10. Chart open + waypoint
  toggleModal('mChart', renderChart);
  await tick(300);
  check('chart open', !document.getElementById('mChart').classList.contains('hidden'));
  closeModal('mChart');

  // --- 11. Journal tabs
  for (const t of ['mission','factions','projects','record']) {
    jTab = t; renderJournal();
    const body = document.getElementById('jBody').innerHTML;
    check('journal tab '+t, body.length > 50, 'len='+body.length);
  }

  // --- 12. Pause + save
  save();
  const raw = localStorage.getItem('luna2035.prospector.v1');
  check('save exists', !!raw && raw.length>500, 'bytes='+(raw?raw.length:0));

  // --- 13. Resolve a mass via tuner quickly (hack lock)
  const rock = W.rocks.find(r=>!r.resolved && r.scannable);
  if (rock) {
    W.target = rock;
    const c0 = S.credits;
    openTuner();
    await tick(200);
    if (tuner.open) {
      // force resolve
      resolveMass(rock);
      check('mass resolved bounty', S.credits > c0, 'c0='+c0+' c1='+S.credits+' integ='+integrity());
      closeTuner();
    }
  }

  // --- 14. Story beats / narrative
  startNarrative(['Test line one.','Test line two.'], null);
  await tick(300);
  check('narrative shown', !document.getElementById('narrative').classList.contains('hidden'));
  nextNarrative(); await tick(200); nextNarrative(); await tick(200);

  // --- 15. Death + recovery flow
  if (W.player.mode==='pilot') { damageSuit(999,'test'); }
  await tick(300);
  if (W.player.dead) { acceptRecovery(); await tick(200); check('recovered', !W.player.dead && W.player.mode==='foot', 'mode='+W.player.mode); }


  // --- COMBAT & SALVAGE PHASE ---
  check('corsairs seeded', Array.isArray(W.hostiles) && W.hostiles.length>0, 'n='+(W.hostiles||[]).length);
  check('salvage canisters seeded', W.canisters.length>0, 'n='+W.canisters.length);
  check('threat HUD present', !!document.getElementById('fThreat'));
  const h = W.hostiles[0];
  // relocate corsair + player into clear sky above the nearside (no bodies in the line of fire)
  const skyA=W.moon.angle+Math.PI*0.72, skyR=R_MOON+120;
  const sky={x:Math.cos(skyA)*skyR, y:Math.sin(skyA)*skyR};
  h.pos={x:sky.x, y:sky.y}; h.vel={x:0, y:0};
  W.player.mode='float'; W.player.air=false; W.player.lift=null; W.player.dead=false;
  W.player.pos={x:sky.x+110, y:sky.y}; W.player.vel={x:0, y:0}; W.player.dv=200;
  touchMode=true; // freeze mouse-aim so the aim lock holds in headless
  held.fire=true;
  for(let i=0;i<40;i++){
    W.player.aim=Math.atan2(h.pos.y-W.player.pos.y, h.pos.x-W.player.pos.x);
    W.player.pos.x=sky.x+110; W.player.pos.y=sky.y; // hold formation for the test
    W.player.vel={x:0, y:0};
    await tick(50);
  }
  held.fire=false; touchMode=false;
  check('cannon fired & corsair damaged', h.hull<h.maxHull || h.dead || (S.hostilesDown||0)>0,
    'hull='+Math.round(h.hull*10)/10+'/'+h.maxHull+' down='+(S.hostilesDown||0));
  const h2 = W.hostiles.find(x=>!x.dead);
  check('another corsair available for destruction test', !!h2);
  const beforeC=W.canisters.length; const down0=S.hostilesDown||0;
  if(h2) damageHostile(h2, 999, 'test');
  await tick(300);
  check('corsair destroyed counted', (S.hostilesDown||0)>=down0+1, 'down='+S.hostilesDown);
  check('salvage dropped on kill', W.canisters.length>beforeC, 'canisters='+W.canisters.length);
  const c=W.canisters[W.canisters.length-1];
  c.pos={x:W.player.pos.x+1, y:W.player.pos.y}; c.vel={x:W.player.vel.x, y:W.player.vel.y};
  const cr0=S.credits, sv0=S.salvage||0;
  await tick(300);
  check('canister collected (+130c salvage)', (S.salvage||0)>sv0 && S.credits>=cr0+130,
    'salvage='+S.salvage+' credits='+S.credits);
  let cycled=true; try { for(let i=0;i<3;i++) cycleTarget(); } catch(e){ cycled=false; }
  check('cycleTarget handles combat', cycled);
  check('salvage stats in state', 'salvage' in S && 'hostilesDown' in S);
  window.__scenarioLog = log;
  return log.join('\n');
})()
