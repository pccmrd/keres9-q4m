'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — STORY — objectives, Meridian key, foundry endings
   ================================================================ */

/* ---------------- PLOT ---------------- */
function keyWhole(){const F=S.flags;return F.fragA&&F.fragB&&F.fragC;}
function actLabel(){
  const F=S.flags;
  if(F.ending)return'EPILOGUE · FREE WORK';
  if(keyWhole())return'ACT III · THE DOOR';
  if(F.vesperScanned)return'ACT II · THE KEY';
  if(F.firstShift)return'ACT I · THE CATALOG';
  return'ACT 0 · SHIFT WORK';
}
function objective(){
  const F=S.flags,P=W.player;
  if(F.ending)return{text:'Free work. The Moon is decided — the rock still pays.',pos:null};
  if(!F.firstShift){
    if(!W.shift){
      if(P.mode==='lift')return{text:'Ride the cable to synchronous altitude',pos:liftHeadPos()};
      if(P.boots===W.tianque){
        const h=W.tianque.hatches.find(h=>h.npc==='zhao'),a=h.ang+W.tianque.angle,d=dir(a);
        return{text:'Sign on at the SHIFT BOARD — Zhao Lin, Tianque ring',
          pos:{x:W.tianque.pos.x+d.x*W.tianque.r,y:W.tianque.pos.y+d.y*W.tianque.r}};
      }
      const lp=liftFootPos();
      return{text:'Walk east (D) to the CABLE LIFT foot · '+fmtM(dist(playerPos(),lp))+' · F to ride',pos:lp};
    }
    if(W.shift.phase==='await')return{text:'Board the crew shuttle at Tianque Berth 0',pos:W.shuttle.pos};
    if(W.shift.phase==='transit'||W.shift.phase==='boarding')return{text:'Ride to the site rock',pos:W.shift.rock.pos};
    if(W.shift.phase==='site'){
      if(P.mode==='passenger')return{text:'F — disembark onto the rock',pos:W.shuttle.pos};
      if(W.shift.pile>=SHIFT_QUOTA)return{text:'Quota met — board the shuttle to cash out',pos:W.shuttle.pos};
      return{text:'Cut rock (M) · carry · pile '+W.shift.pile+'/'+SHIFT_QUOTA+' at ◎',pos:beaconPos()};
    }
    if(W.shift.phase==='return'||W.shift.phase==='returnWait')return{text:'Return to Tianque — payout on the pile',pos:W.tianque.pos};
  }
  if(F.wenQuest===1&&F.wenCount<6)return{text:'Wen Qiu: resolve masses with the array (C) — '+F.wenCount+'/6',pos:null};
  if(!F.vesperScanned){
    if(!S.owned.tug&&!S.owned.lander)return{text:'Earn a hull: shifts + scan bounties → TUG 1600₡ at Tianque YARD',pos:null};
    return{text:'Scan comet VESPER — the warm reading (chart: magenta)',pos:W.vesper.pos};
  }
  if(!keyWhole()){
    const miss=[];if(!F.fragA)miss.push('A·hulk log');if(!F.fragB)miss.push('B·archive/market');if(!F.fragC)miss.push('C·contract');
    return{text:'Assemble the key — missing: '+miss.join('  '),pos:!F.fragA?W.hulk1.pos:null};
  }
  if(!F.doorOpened)return{text:'The key is whole. Fly to VESPER and open the door.',pos:W.vesper.pos};
  return{text:'Decide who holds the Moon.',pos:W.vesper.pos};
}
function addDecision(txt){S.decisions.push({t:Math.round(W.t),txt});log('DECISION: '+txt,'e');}
function giveFrag(k){
  S.flags['frag'+k]=true;AudioSys.chime();
  toast('KEY','Fragment '+k+' seated. '+[S.flags.fragA,S.flags.fragB,S.flags.fragC].filter(Boolean).length+'/3 of the Meridian key.','faction');
  W.wireEvents.push('RUMOUR: A PROSPECTOR IS ASSEMBLING A PRE-CLAIM KEY');
  if(keyWhole())setTimeout(()=>toast('KEY','THE KEY IS WHOLE. Vesper is waiting.','faction'),1200);
  save();
}
function readHulk(){
  S.flags.hulkRead=true;
  startNarrative([
    'The hatch gives on the third pull. Inside: frost, dead consoles, and a founder\'s log still blinking on reserve cells.',
    'DR. ELIF AYDIN · MERIDIAN FOUNDRY · 2029: "We seeded three hearts before the claims were drawn. Vesper, Lantern, Cold Harbour. Whoever finds the keys decides what the Moon becomes. We were arrogant. Be better."',
    'Taped to the console: a key fragment, cold as everything else. You take it. The log keeps blinking to nobody.'
  ],()=>{giveFrag('A');addDecision('Read the Meridian-3 log. Took fragment A.');});
}
function openDoor(){
  if(!keyWhole()||S.flags.doorOpened)return;
  S.flags.doorOpened=true;closeAllModals();
  AudioSys.swell();AudioSys.chime();W.shake=6;
  const dp=vesperDoorPos();spawnBurst(dp.x,dp.y,40,COL.magenta);
  startNarrative([
    'Three fragments, three keyways. The seam of the door runs warm under your glove, and then the comet opens like a held breath.',
    'Inside Vesper: a lattice of black machinery around a fusion heart that has been patient for six years. A foundry. It eats regolith and prints anything — hulls, habitats, reactors, futures.',
    'Meridian seeded three of these before anyone drew a claim line, then died and lost the keys. The console wakes, reads your fragment, and asks the only question it has left.',
    'WHO HOLDS THE KEY?'
  ],openFoundry);
  addDecision('Opened the door in Vesper.');
}
function foundryOptions(){
  const F=S.flags,integ=integrity();
  return[
    {id:'cn',name:'HAND IT TO TAOYUAN',col:COL.red,desc:'Zhao Lin\'s consortium prints a city. The Moon gets built fast, and it gets built red.',req:S.rep.cn>=2?null:'REQUIRES TAOYUAN STANDING ≥ 2'},
    {id:'us',name:'HAND IT TO THE ARMSTRONG TREATY',col:COL.blue,desc:'Reyes puts the foundry under a long table of flags. Slow, shared, governed.',req:S.rep.us>=2?null:'REQUIRES ARMSTRONG STANDING ≥ 2'},
    {id:'hel',name:'SELL IT TO HELION',col:COL.amber,desc:'Voss wires more money than you have ever seen. The Moon becomes a company town with a sky.',req:S.rep.hel>=1?null:'REQUIRES HELION STANDING ≥ 1'},
    {id:'com',name:'PUBLISH THE KEY TO EVERYONE',col:COL.green,desc:'Wen Qiu broadcasts the schema. Every yard on the Moon can print a heart. No one owns the century.',req:(integ>=60&&S.rep.com>=3)?null:'REQUIRES CATALOG ≥ 60% AND COMMONS STANDING ≥ 3'},
    {id:'seal',name:'SEAL IT. SCUTTLE THE HEARTS.',col:COL.magenta,desc:'Some doors should stay shut. You flood the cores and push the comets out of the system. The Moon grows by hand.',req:null}
  ];
}
function openFoundry(){
  const box=$('fOpts');box.innerHTML='';
  for(const o of foundryOptions()){
    const d=document.createElement('div');d.className='fopt'+(o.req?' lock':'');
    d.innerHTML='<h4 style="color:'+o.col+'">'+o.name+'</h4><p>'+o.desc+'</p>'+(o.req?'<div class="req">⯃ '+o.req+'</div>':'');
    if(!o.req)d.onclick=()=>chooseEnding(o.id);
    box.appendChild(d);
  }
  openModal('mFoundry');
}
function projStatus(){
  const P=S.projects;
  return[
    {id:'skyfield',name:'SKYFIELD RING',patron:'TAOYUAN',col:COL.red,v:P.skyfield,desc:'A rotating habitat for ten thousand, printed from the rocks you drag in.'},
    {id:'array',name:'FAR SIDE ARRAY',patron:'ARMSTRONG',col:COL.blue,v:P.array,desc:'A radio telescope the size of a mare. Every mass you resolve feeds its baseline.'},
    {id:'reactor',name:'REGOLITH REACTOR',patron:'HELION',col:COL.amber,v:P.reactor,desc:'Mass power-beaming from sintered regolith. The plant robots feed it whether you help or not.'},
    {id:'catalog',name:'THE OPEN CATALOG',patron:'COMMONS',col:COL.green,v:integrity(),desc:'A public registry of every mass in cis-lunar space. Progress is the catalog integrity itself.'}
  ];
}
function builtList(){return projStatus().filter(p=>p.v>=100).map(p=>p.name);}
function chooseEnding(id){
  const F=S.flags;F.ending=id;
  F.controller={cn:'cn',us:'us',hel:'hel',com:'com',seal:null}[id];
  closeModal('mFoundry');
  S.credits+={cn:3000,us:2000,hel:8000,com:1200,seal:0}[id];
  if(id==='cn'||id==='us'||id==='hel')F.depositReturned=true;
  if(id==='hel')S.credits+=1500;
  addDecision('THE KEY → '+{cn:'Taoyuan Consortium',us:'Armstrong Treaty',hel:'Helion Industries',com:'published to everyone',seal:'scuttled'}[id]);
  W.wireEvents.push('★ THE VESPER KEY HAS BEEN '+{cn:'DELIVERED TO TAOYUAN',us:'PLACED UNDER TREATY MANDATE',hel:'SOLD TO HELION',com:'PUBLISHED IN THE CLEAR',seal:'DESTROYED — COMETS BOOSTED TO ESCAPE'}[id]+' ★');
  const E=buildEnding(id);
  $('endTitle').textContent=E.title;$('endTitle').style.color=E.col;
  $('endKicker').textContent=E.kicker;
  $('endBody').innerHTML=E.paras.map(p=>'<p>'+p+'</p>').join('');
  drawSigil($('endSigil'),E.col,id);
  $('endStats').innerHTML=[['CREDITS',fmtC(S.credits)],['CATALOG',integrity()+'%'],['SHIFTS',S.shiftsDone],
    ['MASSES RESOLVED',S.massesResolved],['DECISIONS',S.decisions.length],['PROJECTS BUILT',builtList().length+'/4']]
    .map(s=>'<div class="stat"><b>'+s[1]+'</b><span class="micro">'+s[0]+'</span></div>').join('');
  openModal('mEnding');AudioSys.pay();AudioSys.swell();
  log('ENDING: '+E.title,'e');save();
}
function buildEnding(id){
  const F=S.flags,integ=integrity(),built=builtList();
  const builtTxt=built.length?'Built and burning: <b>'+built.join('</b>, <b>')+'</b>. ':'Nothing crossed the hundred-mark; every grand project stays a rendering on a wall. ';
  const stalled=projStatus().filter(p=>p.v<100).map(p=>p.name);
  const stallTxt=stalled.length?'Stalled in committee: '+stalled.join(', ')+'. ':'';
  const joint=F.jointSurvey?'The joint survey you brokered between Zhao and Reyes survives the handover — a condominium clause nobody expected, two flags on one scaffold. ':'';
  const fraud=F.fraudAction==='expose'?(F.vossRedeem?'Dana Voss testified against her own board and lived; Helion survives as a regulated utility, which is more than anyone predicted. ':'The deposit fraud you exposed is now case law; Helion\'s charter is rewritten in public. ')
    :F.fraudAction==='blackmail'?'Your private settlement with Voss never sees daylight. The deposit came back tenfold and your silence came cheap. '
    :F.fraudAction==='commons'?'The fraud ledger you handed the commons became the first entry in the public registry — Helion\'s own books, read aloud. ':'';
  const deposit=F.depositReturned?'Your voided deposit is returned, with interest, by people who are not sorry. ':'Helion never returns your deposit. You find you have stopped asking. ';
  const cat=integ>=75?'Your survey work left the catalog at '+integ+'% — even the winners had to build on your numbers. ':'The catalog stands at '+integ+'%; the dark masses stay dark, and someone will pay for that later. ';
  const E={};
  if(id==='cn'){E.title='THE RED CONSORTIUM';E.col=COL.red;E.kicker='TAOYUAN ASCENDANT · 2036';
    E.paras=[
      'The foundry prints for Taoyuan before the week is out. Zhao Lin walks the first Skyfield scaffold in person and signs your claim permanent with a chop older than the company. <b>Taoyuan controls the Moon</b> — not by treaty, but by tonnage. Armstrong keeps its station and its opinions; Helion is absorbed, its amber signs relit in red.',
      builtTxt+stallTxt+joint+'The catalog goes proprietary — a consortium asset — '+cat,
      'You are Chief of Claims, which means every rock that moves does so on your signature. '+deposit+(S.rep.com>=3?'Wen Qiu keeps a shadow archive in the refinery\'s spare memory, and you pretend not to know. ':'Wen Qiu\'s archive is folded into the consortium registry, her name kept on the door. ')+'Okafor brokers ore for the ring at honest weights. The company hab becomes a city block; your window faces the Earth.',
      'The other two hearts stay sealed in their comets, consortium property, warm and patient. On night shift you sometimes watch Vesper rise over the regolith and think about doors. The Moon is being built. It is being built red.'
    ];}
  if(id==='us'){E.title='THE LONG TABLE';E.col=COL.blue;E.kicker='TREATY MOON · 2036';
    E.paras=[
      'Reyes convenes the table before anyone can print a hull: nine flags, one foundry, a mandate written in the slow language of oversight. <b>The Armstrong Treaty governs the Moon</b> — not owning it, chairing it. Taoyuan gets tonnage rights, Helion gets a regulator permanently camped in its lobby, and the commons gets a seat, which surprises everyone including the commons.',
      builtTxt+stallTxt+joint+fraud+'The Far Side Array\'s first light is a survey of every dark mass left — '+cat,
      'You are a Treaty Inspector: your licence 7-C now outranks yard chiefs. '+deposit+'Zhao Lin calls the arrangement a delay; he signs it anyway, because tonnage is tonnage. Halloran prints inspection hulls and grumbles that they fly too well. Okafor Works becomes a bonded warehouse and Nkem becomes rich slowly, which she says is the only honest speed.',
      'The foundry prints under three keys turned at once. It is slower than greed and faster than fear. The comets stay in orbit, sealed, docketed, argued over annually. The Moon\'s future is a meeting that never quite ends — and somehow, things get built.'
    ];}
  if(id==='hel'){E.title='THE AMBER LEDGER';E.col=COL.amber;E.kicker='COMPANY MOON · 2036';
    E.paras=[
      'Voss\'s wire clears before the door finishes opening. Helion\'s foundry prints a second foundry, then a third, and the regolith starts moving at a speed no treaty can audit. <b>Helion owns the Moon</b> — surface, orbit, catalog, and the air inside every hull. The other powers keep their stations as tenants.',
      builtTxt+stallTxt+'The reactor grid beams power to every base at a metered rate; the meter is the government. '+cat+'Your survey became their price list. ',
      'You are wealthy in a way that surprises you daily. '+deposit+'The hab is company housing forever now, but your window is larger and faces the Earth. Zhao\'s shift boards automate; the crews are printed out of their jobs and into new ones, and the ledger decides which. '+(S.rep.com>=3?'Wen Qiu\'s archive leaks monthly. Helion prices the leaks as marketing. ':'Wen Qiu\'s archive is seized, catalogued, and billed to her. ')+'The robots multiply. They were always going to.',
      'You kept the receipt for your deposit. It is framed. Some nights you fly the lander out to Vesper and look at the door you opened, warm light leaking through the seam, and you tell yourself the ledger balances. The ledger always balances. That is what it is for.'
    ];}
  if(id==='com'){E.title='OPEN SKY';E.col=COL.green;E.kicker='THE COMMONS · 2036';
    E.paras=[
      'Wen Qiu broadcasts the key schema in the clear on every band the array can reach, with your name on the manifest and your survey underneath. By morning every yard on the Moon can print a heart. <b>Nobody controls the Moon</b> — which turns out to be a decision, not an absence. Taoyuan, Armstrong and Helion discover they must compete in daylight.',
      builtTxt+stallTxt+joint+fraud+'The Open Catalog closes at '+integ+'% and keeps climbing — the first public registry of everything humanity has put in orbit, with no paywall and no checksums eaten. ',
      'You are the first Registrar of the Commons, a job that did not exist when you walked to the lift. '+deposit+'Halloran prints open-spec hulls at the Helion yard under a new sign and says it is the first honest work of his life. Okafor brokers ore at weights anyone can verify. '+(F.vossRedeem?'Voss resigns, testifies, and teaches engineering ethics to teenagers who do not forgive her. ':'Voss resigns into a fortune and a silence. ')+'Zhao and Reyes both claim credit for the openness, which Wen allows, because credit is free.',
      'Three hearts, three comets, three keys — all published. The Moon grows in every direction at once, argued over loudly, owned by no one, catalogued by everyone. You still cut rock sometimes. The rock does not care who holds the key, and that was always the point.'
    ];}
  if(id==='seal'){
    const dom=S.rep.cn>=S.rep.us&&S.rep.cn>=S.rep.hel?'cn':S.rep.us>=S.rep.hel?'us':'hel';
    E.title='THE SEALED DOOR';E.col=COL.magenta;E.kicker='QUIET MOON · 2036';
    E.paras=[
      'You flood the cores. All three hearts die warm, and the tugs boost Vesper, Lantern and Cold Harbour onto escape trajectories while the whole system watches on the wire. <b>No machine decides the Moon.</b> It grows by hand — '+{cn:'Taoyuan\'s hand, mostly; the consortium builds the slow way and calls it discipline',us:'the Treaty\'s hand, mostly; the long table governs a century of careful scaffolds',hel:'Helion\'s hand, mostly; the company builds the slow way and bills for every hour'}[dom]+'.',
      builtTxt+stallTxt+joint+fraud+'Whatever gets built now gets built at the speed of people. '+cat,
      'You walk back to the hab because the lander is low on ΔV and you want to feel the regolith anyway. '+deposit+'Zhao keeps signing your shifts. Reyes files your decision under "precedent". Voss files it under "loss". Wen Qiu files it under nothing — she just remembers it, which is the archive that matters. Okafor pours something amber and says the foundry would have printed a better bottle.',
      'The comets leave the system in a straight line, three warm dots fading toward the belt they came from. Some doors should stay shut; you are almost sure this was one. The Moon is quieter than it was going to be. On night shift the robots still drill, the cable still climbs, and the rock still pays. It is enough. You decided it was enough.'
    ];}
  return E;
}
function drawSigil(c,col,id){
  const x=c.getContext('2d'),w=c.width,h=c.height;x.clearRect(0,0,w,h);
  x.strokeStyle=col;x.lineWidth=2;x.shadowColor=col;x.shadowBlur=10;
  x.beginPath();x.arc(w/2,h/2,28,0,Math.PI*2);x.stroke();x.beginPath();
  if(id==='cn'){x.moveTo(w/2,14);x.lineTo(w-16,h-16);x.lineTo(16,h-16);x.closePath();}
  else if(id==='us'){for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5,px=w/2+Math.cos(a)*20,py=h/2+Math.sin(a)*20;i?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();}
  else if(id==='hel')x.rect(w/2-16,h/2-16,32,32);
  else if(id==='com'){x.arc(w/2,h/2,14,0,Math.PI*2);x.moveTo(w/2,8);x.lineTo(w/2,h-8);x.moveTo(8,h/2);x.lineTo(w-8,h/2);}
  else{x.moveTo(w/2-14,h/2-14);x.lineTo(w/2+14,h/2+14);x.moveTo(w/2+14,h/2-14);x.lineTo(w/2-14,h/2+14);}
  x.stroke();x.shadowBlur=0;
}
