'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — UI — modals, station panels, strip navigator, journal, manual, chart, toasts
   ================================================================ */

/* ---------------- MODALS / UI ---------------- */
const BLOCKERS=['mTitle','mPause','mJournal','mManual','mLogs','mChart','mDeath','mClaim','mFoundry','mEnding','mConfirm'];
function openModal(id,render){$(id).classList.remove('hidden');if(!modalStack.includes(id))modalStack.push(id);if(render)render();}
function closeModal(id){$(id).classList.add('hidden');modalStack=modalStack.filter(m=>m!==id);}
function toggleModal(id,render){$(id).classList.contains('hidden')?openModal(id,render):closeModal(id);}
function closeAllModals(){for(const m of modalStack.slice())closeModal(m);}
function blockingModal(){return modalStack.some(m=>BLOCKERS.includes(m));}
function escHandler(){
  if(dlgState){closeDialogue();return;}
  if(tuner.open){closeTuner();return;}
  if(modalStack.length){
    const top=modalStack[modalStack.length-1];
    if(['mTitle','mDeath','mFoundry','mEnding'].includes(top))return;
    if(top==='mStation'){closeStation();return;}
    closeModal(top);return;
  }
  openModal('mPause');syncPause();
}
function syncPause(){$('pSound').textContent='SOUND: '+(AudioSys.on?'ON':'OFF');syncStoryUI();}
let stationState=null;
function openStation(st,tab){
  stationState={st,tab:tab||'intake'};
  setText($('stName'),st.name);
  const pil=W.player.mode==='pilot'&&W.player.ship&&W.player.ship.docked&&W.player.ship.docked.st===st;
  $('btnUndock').classList.toggle('hidden',!pil);
  setText($('btnUndock'),pil&&W.player.ship.docked.bth.surface?'LAUNCH':'UNDOCK');
  renderStation();openModal('mStation');
}
function closeStation(){closeModal('mStation');stationState=null;}
function stVar(st){return{tianque:'tianque',armstrong:'armstrong',refinery:'refinery',helion:'hq',hyard:'hyard',hab:'hab'}[st.id];}
function renderStation(){
  if(!stationState)return;
  const{st,tab}=stationState,body=$('stBody'),F=S.flags,P=W.player;
  document.querySelectorAll('#stTabs .tab').forEach(t=>{
    const avail=(st.tabs||['intake']).includes(t.dataset.st);
    t.style.display=avail?'':'none';
    t.classList.toggle('on',t.dataset.st===tab);
  });
  let h='';
  if(tab==='intake'){
    let price=PRICE[st.id]||30;
    if(st.id==='helion'&&F.fraudAction==='expose')price=Math.round(price*1.25);
    const inShip=P.mode==='pilot'&&P.ship&&P.ship.docked&&P.ship.docked.st===st;
    const tonnes=inShip?S.holdOre:S.carry;
    h+='<div class="shoprow"><div class="sinfo"><h4>ORE INTAKE · '+st.name+'</h4><p>'+price+'₡ / tonne · '+(inShip?'hold '+tonnes.toFixed(1)+' t':'carrying '+tonnes+' chunks')+'</p></div><div class="bigstat">'+fmtC(Math.round(tonnes*price))+'</div><button class="btn amber" onclick="sellOre(W.'+stVar(st)+')">SELL</button></div>';
    for(const f of[W.kestrel,W.ares])
      if(f.docked&&f.docked.st===st)
        h+='<div class="shoprow"><div class="sinfo"><h4 class="bl">'+f.name+' · DOCKED</h4><p>Premium 55₡/t · demand remaining '+f.demand.toFixed(0)+' t</p></div><button class="btn" onclick="sellFreighter(W.'+(f===W.kestrel?'kestrel':'ares')+')">TRANSFER</button></div>';
    if(st.id==='hab')h+='<div class="shoprow"><div class="sinfo"><h4>HAB 7-C · HOME</h4><p>Company housing. Deposit voided. The window faces the Earth. Sleep saves the world.</p></div><button class="btn green" onclick="save();toast(\'HAB\',\'World saved. The bunk is narrow and honest.\',\'good\')">SLEEP · SAVE</button></div>';
    h+='<p class="micro" style="margin-top:8px">ΔV AND SUIT REFILL ON CLAMP / LANDING · FREIGHTERS HOLD AND QUEUE — ONE SHIP MOVES AT A TIME</p>';
  }
  else if(tab==='yard'){
    if(st.id==='tianque')h+=S.owned.tug
      ?'<div class="shoprow"><div class="sinfo"><h4 class="gn">TUG “SECOND DEPOSIT” · DELIVERED</h4><p>Berth 1. No heat shield — orbital work only. Walk the ring, F to board.</p></div></div>'
      :'<div class="shoprow"><div class="sinfo"><h4>ORBITAL TUG</h4><p>Rung two. Mine from the hull, haul to refinery or the Mars/Earth freighters. No heat shield — she never touches regolith. Delivered to Berth 1.</p></div><div class="price">'+fmtC(SHIP.tug.price)+'</div><button class="btn amber" onclick="buyTug()">BUY</button></div>';
    if(st.id==='hyard'){
      h+=S.owned.lander
        ?'<div class="shoprow"><div class="sinfo"><h4 class="gn">LANDER “CLAIM 7-C” · ON PAD 0</h4><p>Surface-rated. Gear down, tail to pad, four gates green. The claim is yours.</p></div></div>'
        :'<div class="shoprow"><div class="sinfo"><h4>SURFACE LANDER + CLAIM</h4><p>Rung three. Launch from the regolith, work orbit, come home and land. Includes your own claim — nobody assigns your shift any more.</p></div><div class="price">'+fmtC(SHIP.lander.price)+'</div><button class="btn amber" onclick="buyLander()">BUY</button></div>';
      h+='<div class="shoprow"><div class="sinfo"><h4>HULL REPAIR</h4><p>Yard welds, honest weights.</p></div><div class="price">'+fmtC(200)+'</div><button class="btn" onclick="repairHulls()">REPAIR</button></div>';
    }
    if(st.id==='armstrong')
      for(const u of UPGRADES)h+='<div class="shoprow"><div class="sinfo"><h4'+(S.upgrades[u.id]?' class="gn"':'')+'>'+u.name+(S.upgrades[u.id]?' · INSTALLED':'')+'</h4><p>'+u.desc+'</p></div><div class="price">'+fmtC(u.price)+'</div><button class="btn" '+(S.upgrades[u.id]?'disabled':'')+' onclick="buyUpgrade(\''+u.id+'\')">FIT</button></div>';
  }
  else if(tab==='jobs'){
    if(st.id==='tianque'){
      h+='<div class="shoprow"><div class="sinfo"><h4 class="rd">CREW SHIFT BOARD · ZHAO LIN</h4><p>Cut, carry, pile at ◎. '+SHIFT_RATE+'₡/chunk, quota '+SHIFT_QUOTA+' → +'+SHIFT_BONUS+'₡.'+(F.exclusiveCN?' Exclusive: +20%.':'')+' Sign on foot at the ring.</p></div><button class="btn red" onclick="closeStation();startDialogue(\'zhao\')">TALK / SIGN</button></div>';
      h+='<div class="shoprow"><div class="sinfo"><h4>RECORD</h4><p>'+S.shiftsDone+' shifts · '+S.massesResolved+' masses resolved · catalog '+integrity()+'%</p></div></div>';
    }
    if(st.id==='armstrong')h+='<div class="shoprow"><div class="sinfo"><h4 class="bl">TREATY SURVEY CONTRACTS · REYES</h4><p>Data is governance. Resolve masses, file surveys, feed the Far Side Array.</p></div><button class="btn" onclick="closeStation();startDialogue(\'reyes\')">TALK</button></div>';
    if(st.id==='helion')h+='<div class="shoprow"><div class="sinfo"><h4 class="am">HELION DELIVERY CONTRACTS · VOSS</h4><p>'+(F.exclusiveCN?'Closed to Taoyuan-exclusive crew.':'12 t delivery + Vesper survey. The amber table has a chair.')+'</p></div><button class="btn amber" '+(F.exclusiveCN?'disabled':'')+' onclick="closeStation();startDialogue(\'voss\')">TALK</button></div>';
    if(st.id==='refinery')h+='<div class="shoprow"><div class="sinfo"><h4>SPOT MARKET · OKAFOR</h4><p>38₡/t always. Freighters 55₡ when docked. And the Meridian story, if you have seen a warm comet.</p></div><button class="btn" onclick="closeStation();startDialogue(\'okafor\')">TALK</button></div>';
  }
  else if(tab==='crew'){
    const list=Object.entries(NPCS).filter(([id,n])=>n.st===st.id);
    if(!list.length)h+='<p class="micro">NO CREW POSTED HERE. EVERY NAME ABOARD HAS WORK — THERE ARE NO TOURISTS ON THIS MOON.</p>';
    for(const[id,n]of list)
      h+='<div class="crewrow"><canvas width="44" height="44" data-pf="'+n.fac+'"></canvas><div class="sinfo"><h4 style="color:'+FACCOL[n.fac]+'">'+n.name+'</h4><p>'+n.role+'</p></div><button class="btn" onclick="closeStation();startDialogue(\''+id+'\')">TALK</button></div>';
  }
  body.innerHTML=h;
  body.querySelectorAll('canvas[data-pf]').forEach(c=>drawPortrait(c,c.dataset.pf));
}
function repairHulls(){
  if(S.credits<200){toast('FUNDS','Need 200₡.','bad');return;}
  S.credits-=200;if(W.lander)W.lander.hull=100;if(W.tug)W.tug.hull=100;
  toast('YARD','Hulls repaired.','pay');renderStation();save();
}
document.querySelectorAll('#stTabs .tab').forEach(t=>t.addEventListener('click',()=>{
  if(!stationState)return;stationState.tab=t.dataset.st;renderStation();AudioSys.blip(900,0.04,'square',0.04);
}));
$('btnUndock').addEventListener('click',playerUndock);
$('btnStationX').addEventListener('click',closeStation);

/* strip navigator */
let stripKey='';
function stripModel(){
  const P=W.player;
  if(P.mode==='foot'){
    const a=W.hab.ma*R_MOON-45,b=W.hyard.ma*R_MOON+80;
    const you=groundArc(P.ma);
    return{key:'surface',title:'SURFACE CORRIDOR · HAB → YARD',a,b,you,
      ticks:W.landmarks.map(l=>({s:l.ma*R_MOON,label:l.label,goal:l.ma===W.liftMA&&!S.flags.firstShift})),
      unit:'m'};
  }
  if(P.mode==='boots'&&P.boots&&P.boots.hatches){
    const st=P.boots;
    const ticks=st.hatches.map(h=>({s:wrapA(h.ang)+Math.PI,label:h.npc?NPCS[h.npc].name.split(' ')[0].toUpperCase():h.label.split(' ')[0]}))
      .concat(st.berths.filter(b=>!b.surface).map(b=>({s:wrapA(b.ang)+Math.PI,label:b.label.split(' · ')[0]})));
    return{key:'ring'+st.id,title:st.name+' · RING WALK',a:0,b:Math.PI*2,you:wrapA(P.bootAng-st.angle)+Math.PI,ticks,unit:'°'};
  }
  return null;
}
function renderStrip(){
  const m=stripModel(),el=$('strip');
  if(!m){el.classList.add('hidden');stripKey='';return;}
  el.classList.remove('hidden');
  setText($('stripTitle'),m.title);
  if(stripKey!==m.key){
    stripKey=m.key;
    const track=$('stripTrack');
    track.querySelectorAll('.stick-t').forEach(n=>n.remove());
    for(const t of m.ticks){
      const d=document.createElement('div');d.className='stick-t'+(t.goal?' goal':'');
      d.style.left=(clamp((t.s-m.a)/(m.b-m.a),0,1)*100)+'%';
      d.innerHTML='<span>'+t.label+'</span><i></i>';
      track.appendChild(d);
    }
  }
  const pct=clamp((m.you-m.a)/(m.b-m.a),0,1)*100;
  $('stripYou').style.left=pct+'%';
  if(m.unit==='m'){
    const lift=W.liftMA*R_MOON;
    setText($('stripDist'),'LIFT '+(m.you<lift?'▸ ':'◂ ')+Math.abs(Math.round(lift-m.you))+' m');
  }else setText($('stripDist'),Math.round(m.you/Math.PI*180)+'°');
}

/* journal */
let jTab='mission';
document.querySelectorAll('#jTabs .tab').forEach(t=>t.addEventListener('click',()=>{jTab=t.dataset.jt;renderJournal();}));
function renderJournal(){
  document.querySelectorAll('#jTabs .tab').forEach(t=>t.classList.toggle('on',t.dataset.jt===jTab));
  const F=S.flags,body=$('jBody');let h='';
  if(jTab==='mission'){
    h+='<div class="jq"><h4>'+actLabel()+'</h4><p>'+objective().text+'</p></div>';
    const steps=[['Ride the cable · sign the board · pile six · cash out',F.firstShift],
      ['Wen Qiu: resolve six masses for the archive',F.wenQuest===2],
      ['Scan VESPER — confirm the warm core',F.vesperScanned],
      ['Assemble the Meridian key (3 fragments)',keyWhole()],
      ['Open the door · decide who holds the Moon',!!F.ending]];
    h+='<div class="jq"><h4>THE SPINE</h4>'+steps.map((s,i)=>{
      const now=!s[1]&&(i===0||steps[i-1][1]);
      return'<div class="jstep '+(s[1]?'ok':now?'now':'')+'">'+s[0]+'</div>';}).join('')+'</div>';
    h+='<div class="jq"><h4 class="mg">THE MERIDIAN KEY</h4><div class="keyslots">'
      +'<div class="keyslot'+(F.fragA?' got':'')+'"><b>A</b>'+(F.fragA?'SEATED':'MERIDIAN-3 HULK LOG')+'</div>'
      +'<div class="keyslot'+(F.fragB?' got':'')+'"><b>B</b>'+(F.fragB?'SEATED':'WEN\'S TRUST (6 MASSES) · OR OKAFOR 1400₡')+'</div>'
      +'<div class="keyslot'+(F.fragC?' got':'')+'"><b>C</b>'+(F.fragC?'SEATED':'VOSS CONTRACT (12 t + DATA) · OR REYES HAZARD SURVEY')+'</div>'
      +'</div><p>Every fragment is a door someone else built. Choose whose.</p></div>';
    const side=[];
    if(F.shiftCount>=2&&!F.exclusiveCN)side.push('Zhao Lin proposes Taoyuan exclusivity.');
    if(F.vesperScanned&&!F.dataGiven)side.push('Three people want your Vesper survey: Voss, Reyes, Wen.');
    if(F.fraudFound&&!F.fraudAction)side.push('The deposit ledger: expose via Reyes, or let Voss buy silence.');
    if(F.fraudAction==='commons'&&!F.robotReprogrammed)side.push('Halloran offers to reprogram robot zero for the commons.');
    if(S.rep.cn>=2&&S.rep.us>=2&&F.vesperScanned&&!F.jointSurvey)side.push('Broker the Taoyuan–Armstrong joint survey through Zhao.');
    if(side.length)h+='<div class="jq"><h4 class="am">OPEN FORKS</h4>'+side.map(s=>'<div class="jstep now">'+s+'</div>').join('')+'</div>';
  }
  else if(jTab==='factions'){
    h+='<p class="micro" style="margin-bottom:10px">STANDING DECIDES WHICH DOORS OPEN AT THE FOUNDRY. EVERY COLLABORATION IS A BET ON WHO CONTROLS THE MOON.</p>';
    for(const f of['cn','us','hel','com'])
      h+='<div class="frow"><span class="fname" style="color:'+FACCOL[f]+'">'+FACNAME[f]+'</span><div class="fbar"><i style="background:'+FACCOL[f]+';transform:scaleX('+(S.rep[f]/10)+')"></i></div><span class="fval2">'+S.rep[f].toFixed(1)+'</span></div>';
    h+='<div class="jq" style="margin-top:12px"><h4>WHAT THEY WANT</h4>'
      +'<div class="jstep"><b class="rd">TAOYUAN</b> — build the Moon fast. Skyfield Ring. Tonnage is legitimacy.</div>'
      +'<div class="jstep"><b class="bl">ARMSTRONG</b> — govern the Moon slowly. Far Side Array. Data is governance.</div>'
      +'<div class="jstep"><b class="am">HELION</b> — own the Moon efficiently. Regolith Reactor. The meter is the government.</div>'
      +'<div class="jstep"><b class="gn">COMMONS</b> — belong the Moon to everyone on it. Open Catalog. Trust is the currency.</div></div>';
    if(F.controller)h+='<div class="jq"><h4 class="gn">OUTCOME</h4><p>The Moon is under '+FACNAME[F.controller]+'.</p></div>';
    if(F.ending==='seal')h+='<div class="jq"><h4 class="mg">OUTCOME</h4><p>The hearts are scuttled. The Moon grows by hand.</p></div>';
  }
  else if(jTab==='projects'){
    for(const p of projStatus()){
      const built=p.v>=100;
      h+='<div class="pcard"><h4 style="color:'+p.col+'">'+p.name+'</h4><div class="micro">PATRON · '+p.patron+'</div><p>'+p.desc+'</p>'
        +'<div class="fbar"><i style="background:linear-gradient(90deg,'+p.col+',#eafaff);transform:scaleX('+clamp(p.v/100,0,1)+')"></i></div>'
        +'<div class="pstat" style="color:'+(built?COL.green:p.v>=60?COL.warn:COL.dim)+';margin-top:4px">'+(built?'■ BUILT':p.v>=60?'▲ CONSTRUCTION':'▸ RESEARCH')+' · '+Math.round(p.v)+'%</div></div>';
    }
    h+='<p class="micro">PROJECTS CROSS 100% TO BE BUILT. WHAT YOU HAUL, RESOLVE, AND DECIDE FEEDS THEM. THE ENDING NAMES WHAT GOT BUILT.</p>';
  }
  else{
    h+='<div class="statgrid">'
      +'<div class="stat"><b>'+fmtC(S.credits)+'</b><span class="micro">CREDITS</span></div>'
      +'<div class="stat"><b>'+integrity()+'%</b><span class="micro">CATALOG INTEGRITY</span></div>'
      +'<div class="stat"><b>'+S.shiftsDone+'</b><span class="micro">SHIFTS CLOSED</span></div>'
      +'<div class="stat"><b>'+S.massesResolved+'</b><span class="micro">MASSES RESOLVED</span></div>'
      +'<div class="stat"><b>'+S.scansPaid+'₡</b><span class="micro">BOUNTIES</span></div>'
      +'<div class="stat"><b>'+(F.depositReturned?'RETURNED':'VOIDED')+'</b><span class="micro">DEPOSIT</span></div></div>';
    h+='<div class="jq" style="margin-top:12px"><h4>DECISIONS</h4>'+(S.decisions.length?S.decisions.map(d=>'<div class="declog"><b>T+'+Math.floor(d.t/60)+':'+String(d.t%60).padStart(2,'0')+'</b> — '+d.txt+'</div>').join(''):'<p>No decisions recorded. The Moon is waiting.</p>')+'</div>';
  }
  body.innerHTML=h;
}
function renderManual(){
  const M=[
    ['ON FOOT · GRAVITY IS REAL',[
      ['<kbd>A</kbd> <kbd>D</kbd> walk','The suit walks the local surface at 7 m/s. The camera keeps the Moon below you, so <b>D is always east, A is always west</b>. The corridor ruler under the HUD shows exactly where you are between HAB and YARD.'],
      ['<kbd>SHIFT</kbd> bound','Hold to sprint at 18 m/s — the long lunar lope. Boot prints and dust trail behind you.'],
      ['<kbd>W</kbd> jump','A hop straight up, away from the Moon. <b>Keep holding W</b> through the first third of a second to stretch it into a ~25 m bound.'],
      ['In the air','<kbd>A</kbd>/<kbd>D</kbd> steer at 5.5 m/s², <kbd>S</kbd> tucks to fall faster. A dotted arc and a crosshair mark your predicted touchdown. You can steer, not fly.'],
      ['Falls','Only impacts above 14 m/s damage the suit. A stumble is a stumble.'],
      ['MAG BOOTS · <kbd>B</kbd>','Stick to any hull — station ring, asteroid, or a moving ship — and walk on it. You inherit its velocity and its spin. Boots off = free float; above 320 m that gives you the jetpack.'],
      ['PING · <kbd>R</kbd>','Hand-scanner pulse. Outlines ore nodes for six seconds.']]],
    ['WHO YOU ARE LOOKING AT',[
      ['▲ cyan ring','You. On foot a suit with a lamp; in a hull the ship.'],
      ['● named crew','<b>Every name aboard has work, a price, or a secret.</b> Zhao signs shifts, Wen rebuilds the catalog, Reyes governs, Okoye outfits, Voss recruits, Halloran builds, Okafor remembers. There are no tourists on this Moon.'],
      ['▪ amber, red eye','Surface robots — Helion autonomous plant. They drill, haul and dump at the intake, feeding the Regolith Reactor whether you help or not.'],
      ['◎ green ring','The drop point. Pile loot here during a crew shift.']]],
    ['THE WORLD',[
      ['The Moon','A round body, turning once every twenty minutes. Gravity points at its centre: 1.62 m/s² on the regolith, 0.35 at the cable head. Fly tangentially fast enough and you orbit for free.'],
      ['Everything orbits','Stations, rocks, comets, freighters and hulks ride Kepler orbits. Their ports move — match the port\'s velocity, not zero.'],
      ['Cable lift','A tether to synchronous altitude, turning with the Moon. Cheap, slow, and the only way up when you are broke. Step off at the head and you are already in orbit.'],
      ['TRAFFIC & BERTHS','Every ship starts docked at its own berth or pad. <b>One launch at a time per port</b>, corridor checked, arrivals hold at 440 m until the berth frees. Green light free, red busy. No blockage at ports.']]],
    ['THE THREE RUNGS',[
      ['1 · EVA CREW','Walk east 60 m to the lift foot, ride up, walk the Tianque ring to the SHIFT BOARD, sign, board the shuttle at Berth 0. On site: scan, cut, carry, pile. The shuttle pays on the pile and waits for you.'],
      ['2 · ORBITAL TUG','Buy at Tianque YARD (1600₡), delivered to Berth 1. Mine from the hull, haul to refinery or the Mars/Earth freighters. <b>No heat shield.</b>'],
      ['3 · SURFACE LANDER','Buy at Helion Yard (5200₡) with your own claim. Reach the yard on foot — 288 m east of the hab, or ride the cable down. Launch from the regolith, work orbit, come home and land.']]],
    ['FLIGHT',[
      ['<kbd>W A S D</kbd> / left stick','In a hull: RCS translation, ship-frame. Velocity persists. On foot in free float: jetpack in screen frame.'],
      ['<kbd>Q E</kbd> / right stick','Torque; on foot it aims lamp and hand laser (mouse aims on desktop).'],
      ['Throttle','<kbd>SHIFT</kbd>/<kbd>CTRL</kbd> or the rail (touch). Main engine along the nose.'],
      ['MATCH <kbd>X</kbd> · BRAKE <kbd>Z</kbd>','Station-keeping on the target or on zero. Push the stick to creep at 8 m/s while it holds.'],
      ['CLAMP / LAND · <kbd>F</kbd>','Four gates: ΔV, angle, lateral, spin. Orbital berths take the nose; surface pads want <b>GEAR <kbd>G</kbd> down and tail to the pad</b>. Pads take landers only.'],
      ['SCAN · <kbd>C</kbd>','Tune to the resonance, track its drift, hold LOCK three seconds. Pays a bounty and feeds the Far Side Array.'],
      ['MINE <kbd>M</kbd> · FIRE <kbd>SPACE</kbd>','M auto-cuts the nearest node; FIRE fires along your aim — the cannon bolt if a corsair is in arc, the cutting laser otherwise. Foot chunks are carried (max 5) and piled; ship cutting feeds the hold.'],
      ['<kbd>P</kbd> · <kbd>J</kbd> · <kbd>L</kbd>','P hands the stick to the computer and tells his story. J journal. L logs. <kbd>T</kbd> target, <kbd>V</kbd> altimeter, <kbd>1/2/3</kbd> or wheel: camera.']]],
    ['SALVAGE & CORSAIRS',[
      ['▲ red dart','Corsairs — outlaw marauders who haunt the Meridian-3 hulk, her sister hulk, and the debris swarms. They prowl their home rock, and anything that smells of ore (8 t+ in the hold) is prey. They lead their shots — <b>do not fly straight for long</b>.'],
      ['Aggression','A corsair you burn turns aggro and stays aggro. Below 28% hull it breaks off and runs — it will be back for revenge another day.'],
      ['SALVAGE','A downed corsair bursts into drifting canisters — worth <b>130₡ each</b> on recovery. A ship\'s tractor reels them in from 70 m; on foot or on the hull, walk into them.'],
      ['Salvage in the belt','The hulks and debris swarms seed salvage canisters. New ones wash into the belt every few minutes, so working the derelicts is a living, not a one-time job.']]],
    ['FACTIONS & THE KEY',[
      ['Three powers','Taoyuan builds, Armstrong governs, Helion owns. Standing with each opens different doors at the foundry. The commons is a fourth bet: that the Moon belongs to the people on it.'],
      ['The key','Three fragments: <b>A</b> in the Meridian-3 hulk log, <b>B</b> from Wen\'s trust or Okafor\'s market, <b>C</b> from Voss\'s contract or Reyes\'s hazard survey. Every fragment is a collaboration. Choose whose.'],
      ['Projects','Skyfield Ring, Far Side Array, Regolith Reactor, Open Catalog. What you haul, resolve and decide feeds them. Cross 100% and they get built. The ending names them.'],
      ['The door','When the key is whole, fly to Vesper and open it. Five answers. Five Moons. The rock will remember which one you chose.']]]
  ];
  $('manBody').innerHTML=M.map(s=>'<div class="mansec"><h3>'+s[0]+'</h3>'+s[1].map(r=>'<div class="manrow"><div class="mk">'+r[0]+'</div><div class="mv">'+r[1]+'</div></div>').join('')+'</div>').join('');
}
function renderLogs(){
  const P=W.player;
  const diag={mode:P.mode,air:P.air,ma:P.ma.toFixed(4),groundArc:Math.round(groundArc(P.ma)),
    agl:Math.round(agl()),spd:P.groundSpd.toFixed(1),dv:Math.round(P.mode==='pilot'&&P.ship?P.ship.dv:P.dv),
    credits:S.credits,integrity:integrity(),ships:W.ships.length,particles:W.particles.length,prints:W.bootprints.length,
    traffic:W.ports.map(p=>p.st.id+':q'+p.queue.length+(p.approach?'/app':'')).join(' '),
    salvage:S.salvage||0,corsairsDown:S.hostilesDown||0,
    flags:Object.entries(S.flags).filter(([k,v])=>v===true).map(([k])=>k).join(',')};
  $('logBody').innerHTML='<div class="le">DIAGNOSTIC SNAPSHOT · T+'+Math.round(W.t)+'s</div><div>'+Object.entries(diag).map(([k,v])=>'<span class="lt">'+k+'</span> '+v).join(' · ')+'</div><br>'
    +logs.slice(-120).map(l=>'<div><span class="lt">T+'+Math.floor(l.t/60)+':'+String(Math.floor(l.t%60)).padStart(2,'0')+'</span> <span class="'+(l.cls==='e'?'le':'')+'">'+l.msg+'</span></div>').join('');
}
$('btnCopy').addEventListener('click',()=>{
  const txt=$('logBody').innerText;
  if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>toast('LOGS','Report copied.','good'),()=>toast('LOGS','Clipboard blocked.','warn'));
  else{const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('LOGS','Report copied.','good');}
});
$('btnRefresh').addEventListener('click',renderLogs);
let chartPending=null;
function renderChart(){
  const c=$('chartCv'),rect=c.getBoundingClientRect();
  if(rect.width<10)return;
  c.width=rect.width*DPR;c.height=rect.height*DPR;
  const x=c.getContext('2d');x.scale(DPR,DPR);
  const w=rect.width,h=rect.height,cx=w/2,cy=h/2,sc=Math.min(w,h)/2/27000;
  x.fillStyle='#04060d';x.fillRect(0,0,w,h);
  x.fillStyle='rgba(223,233,245,.35)';
  for(let i=0;i<80;i++)x.fillRect((i*137.5)%w,(i*89.7)%h,1,1);
  const mr=R_MOON*sc;
  const mg=x.createRadialGradient(cx-mr*0.3,cy-mr*0.3,mr*0.1,cx,cy,mr);
  mg.addColorStop(0,'#3a3f4d');mg.addColorStop(1,'#171a24');
  x.fillStyle=mg;x.beginPath();x.arc(cx,cy,mr,0,Math.PI*2);x.fill();
  x.strokeStyle='rgba(63,216,255,.3)';x.stroke();
  const la=W.liftMA+W.moon.angle,ld=dir(la);
  x.strokeStyle='rgba(63,216,255,.4)';x.setLineDash([3,4]);
  x.beginPath();x.moveTo(cx+ld.x*mr,cy+ld.y*mr);x.lineTo(cx+ld.x*R_HEAD*sc,cy+ld.y*R_HEAD*sc);x.stroke();x.setLineDash([]);
  for(const b of W.bodies){
    const px=cx+b.pos.x*sc,py=cy+b.pos.y*sc;
    if(b.orbit&&b.orbit.type==='circle'){x.strokeStyle='rgba(125,140,163,.12)';x.beginPath();x.arc(cx,cy,b.orbit.r*sc,0,Math.PI*2);x.stroke();}
    if(b.orbit&&b.orbit.type==='kepler'){x.strokeStyle='rgba(255,90,209,.15)';x.beginPath();
      for(let i=0;i<=60;i++){const k=kepler(b.orbit.a,b.orbit.e,b.orbit.wp,b.orbit.M0,b.orbit.n,i/60*Math.PI*2/b.orbit.n);
        const qx=cx+k.pos.x*sc,qy=cy+k.pos.y*sc;i?x.lineTo(qx,qy):x.moveTo(qx,qy);}x.stroke();}
    let col=b.resolved?COL.cyan:'#5a6578';
    if(b.faction==='cn')col=COL.red;if(b.faction==='us')col=COL.blue;if(b.faction==='hel')col=COL.amber;
    if(b.kind==='comet')col=b.resolved?COL.magenta:'#8a5f80';
    const r=b.kind==='station'?5:b.kind==='base'?4:b.kind==='comet'?4:3;
    x.fillStyle=col;x.shadowColor=col;x.shadowBlur=6;
    x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();x.shadowBlur=0;
    if(b.kind==='station'||b.kind==='base'||b.special||b===W.target){
      x.fillStyle='rgba(223,233,245,.8)';x.font='9px IBM Plex Mono';x.fillText(b.name,px+7,py+3);}
    b.__chart={x:px,y:py};
  }
  const pp=playerPos();
  x.fillStyle=COL.cyan;x.shadowColor=COL.cyan;x.shadowBlur=8;
  x.beginPath();x.moveTo(cx+pp.x*sc,cy+pp.y*sc-5);x.lineTo(cx+pp.x*sc+4,cy+pp.y*sc+4);x.lineTo(cx+pp.x*sc-4,cy+pp.y*sc+4);x.closePath();x.fill();x.shadowBlur=0;
  if(W.waypoint){const wp=W.waypoint.body?W.waypoint.body.pos:W.waypoint.pos;
    x.strokeStyle=COL.green;x.beginPath();x.arc(cx+wp.x*sc,cy+wp.y*sc,8,0,Math.PI*2);x.stroke();}
}
$('chartCv').addEventListener('click',e=>{
  const c=$('chartCv'),r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  let best=null,bd=18;
  for(const b of W.bodies){if(!b.__chart)continue;
    const d=hyp(mx-b.__chart.x,my-b.__chart.y);if(d<bd){bd=d;best=b;}}
  if(best){chartPending=best;
    $('wpLabel').textContent='WAYPOINT ▸ '+best.name+(best.resolved?' · resolved':' · uncatalogued');
    $('btnWpOk').classList.remove('hidden');$('btnWpNo').classList.remove('hidden');
    AudioSys.blip(1000,0.04,'square',0.04);}
});
$('btnWpOk').addEventListener('click',()=>{
  if(chartPending){W.waypoint={body:chartPending,pos:chartPending.pos};toast('CHART','Waypoint set — '+chartPending.name,'good');}
  chartPending=null;$('btnWpOk').classList.add('hidden');$('btnWpNo').classList.add('hidden');
  $('wpLabel').textContent='waypoint confirmed';closeModal('mChart');
});
$('btnWpNo').addEventListener('click',()=>{chartPending=null;$('btnWpOk').classList.add('hidden');$('btnWpNo').classList.add('hidden');$('wpLabel').textContent='no waypoint pending';});
$('btnChartX').addEventListener('click',()=>closeModal('mChart'));
function toast(tag,msg,type){
  const box=$('toasts');
  while(box.children.length>5)box.removeChild(box.firstChild);
  const d=document.createElement('div');d.className='toast '+(type||'info');
  d.innerHTML='<div class="micro">'+tag+'</div>'+msg;
  box.appendChild(d);
  setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),350);},4200);
}
let tickerTimer=0;
function rebuildTicker(){
  const F=S.flags;
  const lines=['LICENCE 7-C · Player … '+(F.ending?'REGISTRAR':'VALID'),
    'CATALOG INTEGRITY '+integrity()+'% — '+unresolved()+' MASSES UNVERIFIED IN LUNAR ORBIT',
    'TAOYUAN / ARMSTRONG / HELION · SHIFT BOARD '+(W.shift?'ACTIVE':'OPEN'),
    'SKYFIELD '+Math.round(S.projects.skyfield)+'% · ARRAY '+Math.round(S.projects.array)+'% · REACTOR '+Math.round(S.projects.reactor)+'%'];
  if(F.controller)lines.push('★ MOON UNDER '+FACNAME[F.controller]+' · BUILT: '+(builtList().join(' / ')||'NONE YET')+' ★');
  if(F.ending==='seal')lines.push('★ COMETS BOOSTED TO ESCAPE · THE MOON GROWS BY HAND ★');
  lines.push(...W.wireEvents.slice(-4));
  const s=lines.map(l=>'<i>▸</i> '+l).join(' &nbsp;&nbsp; ')+' &nbsp;&nbsp; ';
  $('tickerTrack').innerHTML=s+s;
  $('tickerTrack').style.animationDuration=Math.max(40,lines.join('').length*0.28)+'s';
}
