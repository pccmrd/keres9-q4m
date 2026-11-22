'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — ECONOMY · NARRATIVE — shifts, shipyards, trade, story beats
   ================================================================ */

/* ---------------- ECONOMY ---------------- */
function signShift(){
  const P=W.player;
  if(W.shift){toast('BOARD','A shift is already open.','warn');return;}
  if(P.boots!==W.tianque){toast('BOARD','Sign on foot at the Tianque ring. Crew ride the cable, not hulls.','warn');return;}
  let best=null,bd=1e9;
  for(const r of W.rocks){if(!r.nodes.length)continue;const d=dist(r.pos,W.tianque.pos);if(d<bd){bd=d;best=r;}}
  if(!best){toast('BOARD','No workable rock in range.','warn');return;}
  W.shift={rock:best,phase:'await',pile:0,timer:SHIFT_WINDOW,spotAng:0};S.pile=0;
  toast('SHIFT','Site assigned: '+best.name+'. Board the shuttle at Berth 0.','good');
  log('Signed shift — site '+best.name,'e');
  W.wireEvents.push('CREW SHIFT OPEN · SITE '+best.name+' · TQ-2 BOARDING');
  closeDialogue();save();
}
function buyTug(){
  if(S.credits<SHIP.tug.price){toast('FUNDS','Need '+fmtC(SHIP.tug.price)+'.','bad');return;}
  S.credits-=SHIP.tug.price;S.owned.tug=true;
  const s={id:'ptug',name:'TUG · “SECOND DEPOSIT”',kind:'tug',r:SHIP.tug.r,pos:{x:0,y:0},vel:{x:0,y:0},
    angle:0,angVel:0,docked:{st:W.tianque,bth:W.tB1},state:'docked',timer:9999,thrust:0,hull:100,dv:SHIP.tug.dv};
  W.tB1.ship=s;W.ships.push(s);W.tug=s;dockedFollow(s);
  toast('YARD','Tug delivered to Tianque Berth 1. Walk the ring, F to board.','pay');
  AudioSys.pay();log('Bought orbital tug','e');
  W.wireEvents.push('NEW HULL REGISTERED · TUG “SECOND DEPOSIT”');
  renderStation();save();
}
function buyLander(){
  if(S.credits<SHIP.lander.price){toast('FUNDS','Need '+fmtC(SHIP.lander.price)+'.','bad');return;}
  S.credits-=SHIP.lander.price;S.owned.lander=true;S.flags.claim=true;
  const s={id:'plander',name:'LANDER · “CLAIM 7-C”',kind:'lander',r:SHIP.lander.r,pos:{x:0,y:0},vel:{x:0,y:0},
    angle:0,angVel:0,docked:{st:W.hyard,bth:W.hyP0},state:'docked',timer:9999,thrust:0,hull:100,dv:SHIP.lander.dv};
  W.hyP0.ship=s;W.ships.push(s);W.lander=s;dockedFollow(s);
  S.rep.com=clamp(S.rep.com+1,0,10);
  closeDialogue();closeStation();openModal('mClaim');AudioSys.pay();log('Bought lander + claim','e');
  W.wireEvents.push('CLAIM 7-C REGISTERED · SURFACE-RATED HULL');
  save();
}
const UPGRADES=[
  {id:'track',name:'ARRAY AUTO-TRACK',price:600,desc:'Resonance drift damped 70%. Locks hold themselves.'},
  {id:'tank',name:'SUIT ΔV TANK +120',price:450,desc:'Extra 120 m/s of jetpack. The dark masses get closer.'},
  {id:'laser',name:'LASER HEAD Mk2',price:700,desc:'Cutting power ×1.8. Rock becomes ore faster.'},
  {id:'hold',name:'HOLD EXTENSION +16 t',price:800,desc:'Sixteen more tonnes per run. Freighter demand loves you.'}
];
function buyUpgrade(id){
  const u=UPGRADES.find(u=>u.id===id);
  if(S.upgrades[id]){toast('YARD','Already installed.','info');return;}
  if(S.credits<u.price){toast('FUNDS','Need '+fmtC(u.price)+'.','bad');return;}
  S.credits-=u.price;S.upgrades[id]=true;
  toast('YARD',u.name+' installed.','pay');AudioSys.pay();renderStation();save();
}
function sellOre(st){
  const P=W.player;
  let tonnes=0,price=PRICE[st.id]||30;
  if(P.mode==='pilot'&&P.ship&&P.ship.docked&&P.ship.docked.st===st)tonnes=S.holdOre;
  else tonnes=S.carry;
  if(st.id==='helion'&&S.flags.fraudAction==='expose')price=Math.round(price*1.25);
  if(tonnes<=0){toast('INTAKE','Nothing to sell. Cut rock first.','warn');return;}
  const pay=Math.round(tonnes*price);
  S.credits+=pay;
  if(P.mode==='pilot')S.holdOre=0;else S.carry=0;
  if(st.id==='helion'){S.flags.helJobT=(S.flags.helJobT||0)+tonnes;S.projects.reactor=clamp(S.projects.reactor+tonnes*0.2,0,100);S.rep.hel=clamp(S.rep.hel+tonnes*0.03,0,10);}
  if(st.id==='tianque'){S.projects.skyfield=clamp(S.projects.skyfield+tonnes*0.2,0,100);S.rep.cn=clamp(S.rep.cn+tonnes*0.02,0,10);}
  if(st.id==='armstrong'){S.projects.array=clamp(S.projects.array+tonnes*0.15,0,100);S.rep.us=clamp(S.rep.us+tonnes*0.02,0,10);}
  toast('INTAKE',tonnes.toFixed(1)+' t @ '+price+'₡ · '+fmtC(pay),'pay');AudioSys.pay();
  log('Sold '+tonnes.toFixed(1)+' t at '+st.name,'e');
  renderStation();save();
}
function sellFreighter(f){
  const P=W.player;
  if(!(P.mode==='pilot'&&P.ship&&P.ship.docked)){toast('INTAKE','Clamp alongside to transfer ore.','warn');return;}
  if(f.demand<=0){toast('INTAKE',f.name+' demand exhausted. Wait for her next docking.','warn');return;}
  const t=Math.min(S.holdOre,f.demand);
  if(t<=0){toast('INTAKE','Hold is empty.','warn');return;}
  f.demand-=t;S.holdOre-=t;
  const pay=Math.round(t*PRICE.freight);S.credits+=pay;
  toast('FREIGHTER',t.toFixed(1)+' t @ 55₡ premium · '+fmtC(pay),'pay');AudioSys.pay();
  renderStation();save();
}

/* ---------------- NARRATIVE ---------------- */
let narQueue=[],narDone=null,narActive=false;
function startNarrative(lines,done){narQueue=lines.slice();narDone=done||null;narActive=true;
  $('narrative').classList.remove('hidden');nextNarrative();}
function nextNarrative(){
  if(!narQueue.length){endNarrative();return;}
  typeText($('narText'),narQueue.shift(),()=>{});AudioSys.swell();
}
function endNarrative(){narActive=false;$('narrative').classList.add('hidden');
  const d=narDone;narDone=null;if(d)d();}
const STORY_BEATS={
  act0:['Forty-one years old and the Moon still does not care what you were before. Process engineer, it says on the voided contract. Prospector, it says on the licence. The rock reads neither.',
    'The cable climbs because someone decided a tether was cheaper than a rocket. Every economy up here is that decision, repeated. You ride it because you are broke, and being broke is the oldest qualification in the industry.'],
  act1:['The catalog ate its checksums and everyone up here is flying blind through their own traffic. Wen Qiu rebuilds it one resonance at a time, like a woman re-shelving a library after a fire. You respect her more than you have said.',
    'Three powers, one Moon. Taoyuan builds, Armstrong governs, Helion meters. None of them voided your contract. All of them would. The rock is the only honest thing in the system, and it pays on the pile.'],
  act2:['Vesper reads warm because something inside is patient. Meridian seeded three hearts before the claims were drawn — a foundry in a comet, a future in a key. The dead founder\'s log still blinks to nobody. You are somebody now. That is the difference.',
    'Every fragment is a door someone else built. The hulk, the archive, the contract. You are assembling a decision, not a key. The Moon will be what you do next, and nobody up here gets to pretend they did not see you do it.'],
  act3:['The key is whole and the door is warm and the console is going to ask the only question it has left. You have cut rock for this. You have resolved masses for this. You have been voided and recovered and voided again for this.',
    'Whoever holds the key holds the century. You are forty-one, ex-process engineer, and the Moon is asking you what it should become. Answer like someone who has walked the regolith. Answer like someone who knows what a deposit is worth.'],
  post:['The decision is made and the rock still pays. That is the surprise nobody tells you: the century changes and the shift board still opens at six. You cut, you carry, you pile. The Moon is what you made it. The work is what it always was.']
};
let storyBeatIdx=0,storyTimer=0;
function storyTick(dt){
  if(!storyOn||narActive||dlgState)return;
  storyTimer-=dt;
  if(storyTimer>0)return;
  const F=S.flags;
  const act=F.ending?'post':keyWhole()?'act3':F.vesperScanned?'act2':F.firstShift?'act1':'act0';
  const beats=STORY_BEATS[act];
  if(storyBeatIdx<beats.length){startNarrative([beats[storyBeatIdx]],null);storyBeatIdx++;storyTimer=45;}
  else storyTimer=60;
}
function toggleStory(){
  storyOn=!storyOn;pilotOn=storyOn&&W.player.mode==='pilot';
  if(storyOn){storyTimer=2;toast('STORY','His story — computer pilot on the helm when you fly. P to toggle.','info');}
  else{pilotOn=false;endNarrative();}
  syncStoryUI();
}
function syncStoryUI(){
  $('btnStory').textContent='STORY ▸ '+(storyOn?'ON':'OFF');
  $('btnStory').classList.toggle('on',storyOn);
  $('pStory').textContent='HIS STORY · COMPUTER PILOT: '+(storyOn?'ON':'OFF');
}
