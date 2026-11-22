'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — DIALOGUE — NPCs, conversation trees
   ================================================================ */

/* ---------------- NPCS & DIALOGUE ---------------- */
const NPCS={
  zhao:{name:'Zhao Lin',role:'Shift Foreman · Taoyuan',fac:'cn',st:'tianque'},
  wen:{name:'Wen Qiu',role:'Catalog Archivist',fac:'com',st:'tianque'},
  reyes:{name:'Cmdr. Imani Reyes',role:'Treaty Officer · Armstrong',fac:'us',st:'armstrong'},
  okoye:{name:'Dale Okoye',role:'Quartermaster · Armstrong',fac:'us',st:'armstrong'},
  voss:{name:'Dana Voss',role:'Helion Liaison',fac:'hel',st:'helion'},
  halloran:{name:'“Gus” Halloran',role:'Yard Chief · Helion Yard',fac:'hel',st:'hyard'},
  okafor:{name:'Nkem Okafor',role:'Refinery Operator',fac:'com',st:'refinery'}
};
function npcNode(id){
  const F=S.flags,R=S.rep;
  const postLines={
    zhao:{cn:'The ring is being printed as we speak. Your signature is on the first beam. Good work, prospector.',us:'A long table. I signed it. Tonnage is tonnage — we build anyway.',hel:'Tenants. We are all tenants now. Sign your shifts, the board still pays.',com:'Open schemas. My yards print for everyone and I sleep worse and better. Go figure.',seal:'Slow way, then. The board still opens at six. Some things should not change.'},
    wen:{cn:'They closed the catalog. I keep a copy where closed things go to wait.',us:'A seat at the table. I took it. The registry stays public — that was my only condition.',hel:'They billed me for my own archive. I paid. I kept a copy.',com:'Registrar. You. I still cannot believe you did it. The registry is at '+integrity()+'% and climbing.',seal:'I filed your decision under nothing. I just remember it. That is the archive that matters.'},
    reyes:{cn:'Tonnage outranks law today. I am writing the law anyway.',us:'Nine flags, one foundry. Inspect something, Inspector.',hel:'A regulator in their lobby. It is me. I live there now.',com:'Nobody controls it. I chair the argument. It is the best outcome I did not plan.',seal:'Precedent. I cited you in three filings this month.'},
    okoye:{cn:'Consortium scrip spends fine. Upgrades still in stock.',us:'Tissue-thin margins, treaty-grade paperwork. Buy something.',hel:'Company store prices. Sorry. Inventory is inventory.',com:'Open-spec parts, honest weights. Best stock I have ever carried.',seal:'Hand-built century. My parts will outlive us all.'},
    voss:{cn:'Absorbed. My badge is red now. The deposit was returned — I saw to that.',us:'Regulated. I testified. Do not ask me about the hearings.',hel:'The ledger balances. I told you it would. Enjoy the window.',com:'I resigned. I teach now. The students do not forgive me. Correct.',seal:'A loss. Filed. The company builds slower and bills longer.'},
    halloran:{cn:'Red hulls, same welds. Yard is busy. You did fine, kid.',us:'Inspection hulls. Fly too well. Grumble accordingly.',hel:'Company yard, company sky. I print what they order. Mostly.',com:'Open-spec hulls under my own sign. First honest work of my life.',seal:'Hand-built. Every weld mine. Would not trade it.'},
    okafor:{cn:'Ring ore, honest weights. The refinery does not care whose flag.',us:'Bonded warehouse now. Rich slowly. The honest speed.',hel:'Metered power, metered ore. I verify the meters. Someone should.',com:'Weights anyone can check. The commons pays in trust and it spends.',seal:'Amber pour, on the house. The foundry would have printed a better bottle.'}
  };
  if(F.ending&&!F.postTalk[id]){F.postTalk[id]=true;
    return{text:postLines[id][F.ending],choices:[{t:'[ Nod. Back to work. ]'}]};}
  switch(id){
  case 'zhao':
    if(!F.firstShift&&!W.shift)return{text:'New licence, old story. Helion voided you, kept your deposit, and the rock does not care. Sign my board: cut, carry, pile at the drop point. Shuttle pays on the pile. Six chunks is quota. Do not die on my shift — the paperwork is worse than the funeral.',
      choices:[{t:'Sign the shift. <em>· site assigned, board the shuttle</em>',do:signShift},{t:'What is in it for Taoyuan?',next:'zhao_why'},{t:'Not yet.'}]};
    if(W.shift&&W.shift.phase==='await')return{text:'Site is marked on your chart. Shuttle is at Berth 0 — walk the ring, boots on, F to board. She launches when traffic clears; one ship at a time on my port.',choices:[{t:'Understood.'}]};
    if(F.shiftCount>=2&&!F.exclusiveCN&&!F.ending)return{text:'Two shifts, clean piles. Here is a proposal: fly Taoyuan exclusive. My board pays twenty percent over, priority sites, and the consortium remembers its friends when the claims get redrawn. Helion\'s board stops taking your signature. The Moon is being decided, prospector. Pick a column.',
      choices:[{t:'Sign exclusive. <em>· +20% shift pay, CN standing, Helion jobs close</em>',do:()=>{F.exclusiveCN=true;S.rep.cn=clamp(S.rep.cn+2,0,10);S.rep.hel=clamp(S.rep.hel-1,0,10);S.projects.skyfield=clamp(S.projects.skyfield+8,0,100);addDecision('Signed Taoyuan-exclusive crew contract.');toast('CONTRACT','Taoyuan exclusive — shifts pay +20%.','faction');save();}},{t:'Stay independent.',do:()=>{S.rep.com=clamp(S.rep.com+0.5,0,10);addDecision('Refused Taoyuan exclusivity.');}},{t:'Ask about the comet first.',next:'zhao_vesper'}]};
    if(!F.jointSurvey&&R.cn>=2&&R.us>=2&&F.vesperScanned&&!F.ending)return{text:'Reyes and I have not spoken in a year. But her array needs my tonnage and my ring needs her legitimacy. You have standing with both of us — broker it. A joint survey. Two flags on one scaffold. I will not ask twice.',
      choices:[{t:'Broker the joint survey. <em>· both projects surge</em>',do:()=>{F.jointSurvey=true;S.projects.skyfield=clamp(S.projects.skyfield+20,0,100);S.projects.array=clamp(S.projects.array+20,0,100);S.rep.cn=clamp(S.rep.cn+1,0,10);S.rep.us=clamp(S.rep.us+1,0,10);addDecision('Brokered the Taoyuan–Armstrong joint survey.');W.wireEvents.push('TAOYUAN × ARMSTRONG · JOINT SURVEY SIGNED');toast('DIPLOMACY','Joint survey signed. Both projects surge.','faction');save();}},{t:'Not my table.'}]};
    return{text:F.exclusiveCN?'My crew. Board is open, priority sites flagged. The ring gets built one pile at a time.':'Board is open. Quota is six. The shuttle waits for traffic, not for cowards.',
      choices:[{t:'Sign a shift.',do:signShift,if:()=>!W.shift},{t:'About the warm comet…',next:'zhao_vesper',if:()=>F.vesperScanned},{t:'Back to work.'}]};
  case 'zhao_why':return{text:'Tonnage. Every rock you pile is a beam in the Skyfield Ring — a habitat for ten thousand, printed from the belt. Armstrong wants to govern a Moon that does not exist yet. Helion wants to meter it. We want to build it. Builders should hold the keys. Sign or walk.',
    choices:[{t:'Sign the shift.',do:signShift},{t:'Walk.'}]};
  case 'zhao_vesper':return{text:'Vesper. Warm core, sealed hull, pre-claim launch vector. Meridian Foundry seeded something up there before the companies died. If it is what I think, whoever opens it prints the century. Bring me proof of standing and I will back your claim on it. Or sell your survey to Voss and find out what company loyalty costs.',choices:[{t:'Noted.'}]};
  case 'wen':
    if(F.wenQuest===0)return{text:'You resolved a mass on your first shift. Do you know what that means? The catalog ate its checksums three years ago and every power up here is flying blind through its own traffic. I rebuild it one resonance at a time. Resolve six masses for me. I pay in bounties and in trust — and trust is the only currency that survives what is coming.',
      choices:[{t:'Take the archive contract. <em>· 6 masses, 500₡</em>',do:()=>{F.wenQuest=1;F.wenCount=0;addDecision('Accepted Wen Qiu\'s catalog contract.');toast('CONTRACT','Resolve 6 masses with the array (C).','faction');}},{t:'What is coming?',next:'wen_coming'},{t:'Not now.'}]};
    if(F.wenQuest===1&&F.wenCount<6)return{text:'Six masses. You are at '+F.wenCount+'. Tune the array, track the drift, hold the lock. The dark ones pay best — comets, hulks. Every resolution feeds the Far Side Array too; Reyes pretends not to notice.',choices:[{t:'Back to the array.'}]};
    if(F.wenQuest===1&&F.wenCount>=6)return{text:'Six. Clean locks, honest drift. Here — 500₡, and something better: Meridian\'s archive key, fragment B. It came to me in a dead drop from a founder who is six years dead. I kept it because I did not trust anyone with it. I am deciding to trust you. Do not make me wrong.',
      choices:[{t:'Take fragment B.',do:()=>{F.wenQuest=2;S.credits+=500;S.rep.com=clamp(S.rep.com+2,0,10);giveFrag('B');addDecision('Completed the archive contract. Wen entrusted fragment B.');toast('PAYOUT','Archive contract · '+fmtC(500),'pay');AudioSys.pay();}},{t:'Why trust me?',next:'wen_trust'}]};
    if(F.vesperScanned&&!F.dataGiven&&!F.ending)return{text:'Your Vesper survey. Three people want it: Voss will pay and bury it, Reyes will classify it, I will publish it — every band, every yard, no paywall. Publication makes enemies of both boards and friends of everyone who cuts rock. The commons is not a faction, prospector. It is a bet that the Moon belongs to the people on it.',
      choices:[{t:'Publish through the archive. <em>· commons standing, both boards displeased</em>',do:()=>{F.dataGiven='open';S.rep.com=clamp(S.rep.com+2,0,10);S.rep.hel=clamp(S.rep.hel-1,0,10);S.rep.us=clamp(S.rep.us-0.5,0,10);S.rep.cn=clamp(S.rep.cn-0.5,0,10);for(const b of W.bodies)if(b.scannable&&!b.resolved&&rng()<0.12){b.resolved=true;S.massesResolved++;}addDecision('Published the Vesper survey in the clear.');W.wireEvents.push('VESPER SURVEY PUBLISHED IN THE CLEAR');toast('PUBLICATION','The survey is public. The commons remembers.','faction');save();}},{t:'Hold the data for now.'}]};
    if(keyWhole()&&!F.doorOpened&&!F.ending)return{text:'The key is whole. I can hear it in your boots. When you open that door, remember: a foundry is a future, and futures should not have owners. If your catalog work is strong enough — sixty percent, and the yards trust you — you can publish the schema itself. Open sky. Otherwise the boards will take it, and you will have chosen which board.',choices:[{t:'I will remember.'}]};
    return{text:F.wenQuest===2?'The registry is at '+integrity()+'%. Every lock you hold is a light on someone\'s chart. Keep going.':'The archive is open. The dark masses are waiting.',choices:[{t:'Back to work.'}]};
  case 'wen_coming':return{text:'A comet with a door in it. Meridian Foundry — pre-claim, pre-company, six years dead — seeded three hearts in three comets and lost the keys. Vesper reads warm because something inside is patient. Whoever assembles the key decides what the Moon becomes. I would rather it were someone who resolves masses for 140₡ a bounty than someone who voids deposits.',
    choices:[{t:'Take the archive contract.',do:()=>{F.wenQuest=1;F.wenCount=0;addDecision('Accepted Wen Qiu\'s catalog contract.');}},{t:'Not now.'}]};
  case 'wen_trust':return{text:'Because you resolved six masses nobody paid you enough to resolve. Because Helion voided you and you still show up to the lift. Because the alternative is Voss, and I have read what Voss does to deposits. Take the fragment. Publish nothing yet. Open the right door.',
    choices:[{t:'Take fragment B.',do:()=>{F.wenQuest=2;S.credits+=500;S.rep.com=clamp(S.rep.com+2,0,10);giveFrag('B');addDecision('Completed the archive contract. Wen entrusted fragment B.');toast('PAYOUT','Archive contract · '+fmtC(500),'pay');AudioSys.pay();}}]};
  case 'reyes':
    if(!F.armJob&&!F.ending)return{text:'Commander Reyes, Armstrong Treaty. Your licence is valid and your survey work is noticed. The Treaty pays for data, not tonnage: resolve three masses on contract and I file you as a survey asset. The Far Side Array is built from exactly this kind of work. Governed space is safe space.',
      choices:[{t:'Take the survey contract. <em>· resolve 3 masses → 450₡</em>',do:()=>{F.armJob=true;F.armJobN=S.massesResolved;addDecision('Accepted Armstrong survey contract.');}},{t:'The Treaty\'s read on Vesper?',next:'reyes_vesper',if:()=>F.vesperScanned},{t:'Not now.'}]};
    if(F.armJob===true&&S.massesResolved-F.armJobN>=3)return{text:'Three clean resolutions. The Array\'s baseline improves and your file thickens. 450₡, survey asset. Keep the array fed.',
      choices:[{t:'Collect. <em>+450₡</em>',do:()=>{F.armJob='paid';S.credits+=450;S.rep.us=clamp(S.rep.us+1.5,0,10);S.projects.array=clamp(S.projects.array+15,0,100);addDecision('Completed Armstrong survey contract.');toast('PAYOUT','Survey contract · '+fmtC(450),'pay');AudioSys.pay();save();}}]};
    if(F.vesperScanned&&!F.reyesHazard&&F.dataGiven!=='helion'&&!F.ending)return{text:'Your Vesper data. The Treaty\'s read: a pre-claim autonomous foundry is a hazard until proven otherwise — uncontrolled replication in cis-lunar space ends every treaty at once. File a hazard survey with me: Vesper plus two more comets, full thermal. I will give you fragment C — it came to us in a Meridian dead drop — and the Treaty will owe you a seat at whatever table follows.',
      choices:[{t:'File the hazard survey.',if:()=>F.cometsScanned>=2,req:'SCAN 2 MORE COMETS ('+F.cometsScanned+'/2)',do:()=>{F.reyesHazard=true;F.dataGiven=F.dataGiven||'armstrong';S.rep.us=clamp(S.rep.us+2,0,10);S.rep.hel=clamp(S.rep.hel-1,0,10);S.projects.array=clamp(S.projects.array+10,0,100);giveFrag('C');addDecision('Filed the Vesper hazard survey. Received fragment C.');}},{t:'Sell it to Helion instead.',next:'reyes_warn'},{t:'Not yet.'}]};
    if(F.fraudFound&&F.fraudAction===null&&!F.ending)return{text:'Halloran gave you the deposit ledger. Helion voids contracts on manufactured cause and keeps the deposits — hundreds of them, yours included. Give it to me. I file it public, the Treaty prosecutes, and Helion\'s charter gets rewritten. Their yard prices will rise for you. The law is slow but it is not nothing.',
      choices:[{t:'Hand over the ledger. <em>· expose · Helion prices +25%</em>',do:()=>{F.fraudAction='expose';S.rep.us=clamp(S.rep.us+2,0,10);S.rep.hel=clamp(S.rep.hel-2,0,10);S.rep.com=clamp(S.rep.com+1,0,10);addDecision('Exposed Helion\'s deposit fraud through the Treaty.');W.wireEvents.push('HELION DEPOSIT FRAUD FILED PUBLIC');toast('LEGAL','The ledger is filed. Helion remembers your name.','faction');save();}},{t:'Hold it.'}]};
    if(F.fraudAction==='expose'&&!F.vossRedeem&&!F.ending)return{text:'Voss wants to testify. Against her own board, in exchange for immunity and a teaching post. It would gut Helion\'s defense and save the company as a regulated utility. The Treaty benefits either way. Your call — you are the one they voided.',
      choices:[{t:'Let her testify. <em>· Helion reformed</em>',do:()=>{F.vossRedeem=true;F.depositReturned=true;S.rep.us=clamp(S.rep.us+1,0,10);addDecision('Allowed Voss to testify; Helion survives as a utility.');toast('LEGAL','Voss testifies. Your deposit is returned by court order.','faction');save();}},{t:'Let the board burn.'}]};
    return{text:F.ending?'Inspector. The table sits. The work continues.':'The Array is at '+Math.round(S.projects.array)+'%. Data is governance, prospector. Keep resolving.',choices:[{t:'Back to work.'}]};
  case 'reyes_vesper':return{text:'Warm core, sealed hull, pre-claim vector. Meridian Foundry seeded autonomous constructors before the claims were drawn. Uncontrolled replication in cis-lunar space is a hazard that ends every treaty at once. Scan it, scan its siblings, and file with me before Voss files a purchase order.',choices:[{t:'Understood.'}]};
  case 'reyes_warn':return{text:'Then you will learn what company loyalty costs. Voss buys data to bury it. When the foundry wakes under an amber flag, remember which side of the deposit ledger you stood on. The offer stands until the door opens.',choices:[{t:'Noted.'}]};
  case 'okoye':return{text:'Quartermaster Okoye. Suit tanks, array trackers, laser heads, hold extensions — Treaty-grade, no company scrip. The Armstrong yard tab is open to you. And a word: the freighters pay premium when they are docked. Watch the traffic, time your hauls.',
    choices:[{t:'Open the yard tab.',do:()=>openStation(W.armstrong,'yard')},{t:'What do you make of the comet?',next:'okoye_vesper',if:()=>F.vesperScanned},{t:'Back to work.'}]};
  case 'okoye_vesper':return{text:'I make it a retirement plan for whoever opens it. Nkem at the refinery knows the Meridian story better than I do — she fenced their last cargo. If you are assembling what I think you are assembling, the yard tab stays open. Treaty-grade parts for a treaty-grade future.',
    choices:[{t:'Open the yard tab.',do:()=>openStation(W.armstrong,'yard')},{t:'Noted.'}]};
  case 'voss':
    if(F.fraudAction==='blackmail'&&!F.ending)return{text:'We have an arrangement. The ledger stays dark, your deposit came back tenfold, and Helion\'s board stays open to you. Do not mistake this for friendship. It is a balance, and balances are maintained.',choices:[{t:'Understood.'}]};
    if(!F.helJob&&!F.ending)return{text:'Dana Voss, Helion liaison. Yes, we voided your contract. Yes, we kept the deposit. The cause was manufactured and the ledger proves it — I am telling you this because I would rather recruit you than audit you. Helion pays for delivery: twelve tonnes to our intake, and a survey of the warm comet. Do both and I give you fragment C and a seat at the amber table.',
      choices:[{t:'Take the Helion contract. <em>· 12 t + Vesper data</em>',do:()=>{F.helJob=true;F.helJobT=0;addDecision('Accepted Helion delivery contract.');toast('CONTRACT','Deliver 12 t to Helion intake, then sell the Vesper survey.','faction');}},{t:'You manufactured the cause.',next:'voss_fraud'},{t:'Not now.'}]};
    if(F.helJob===true&&F.helJobT>=12&&F.dataGiven!=='helion'&&F.vesperScanned&&!F.ending)return{text:'Twelve tonnes, clean weights. Now the survey. Sell me Vesper — thermal, vector, the door. Helion buries it in patent filings and you walk away with 800₡ and fragment C. The comet becomes company property before anyone else can claim it is a hazard. This is how the Moon gets owned, prospector. Efficiently.',
      choices:[{t:'Sell the survey. <em>+800₡ · fragment C</em>',do:()=>{F.dataGiven='helion';F.helJob='paid';S.credits+=800;S.rep.hel=clamp(S.rep.hel+2,0,10);S.rep.com=clamp(S.rep.com-1.5,0,10);S.rep.us=clamp(S.rep.us-1,0,10);S.projects.reactor=clamp(S.projects.reactor+12,0,100);giveFrag('C');addDecision('Sold the Vesper survey to Helion. Received fragment C.');toast('PAYOUT','Survey purchase · '+fmtC(800),'pay');AudioSys.pay();save();}},{t:'Refuse. The data stays mine.',do:()=>{S.rep.hel=clamp(S.rep.hel-1,0,10);S.rep.com=clamp(S.rep.com+0.5,0,10);addDecision('Refused to sell the Vesper survey to Helion.');}}]};
    if(F.helJob===true&&F.helJobT<12)return{text:'Delivery first. '+F.helJobT.toFixed(1)+' of 12 tonnes at our intake. The plant robots feed the reactor whether you help or not — but the board notices who hauls. Then we talk about the comet.',choices:[{t:'Back to work.'}]};
    if(F.fraudFound&&F.fraudAction===null&&!F.ending)return{text:'Halloran gave you the ledger. Of course he did. Here is the counteroffer: 2000₡, your deposit returned tenfold, and the ledger stays dark. No prosecution, no charter rewrite, no slow law. You were wronged; this is what being made whole looks like when the company does it quietly. Take it or take it to Reyes. Both are decisions.',
      choices:[{t:'Take the settlement. <em>+3500₡ · silence</em>',do:()=>{F.fraudAction='blackmail';F.depositReturned=true;S.credits+=3500;S.rep.hel=clamp(S.rep.hel+2,0,10);S.rep.com=clamp(S.rep.com-2,0,10);addDecision('Accepted Helion\'s quiet settlement.');toast('PAYOUT','Settlement · '+fmtC(3500),'pay');AudioSys.pay();save();}},{t:'The ledger goes public.',next:'voss_refuse'}]};
    return{text:F.ending?'The ledger balances. It always balances.':'Helion\'s board is open. Deliver, survey, and the amber table has a chair for you.',choices:[{t:'Back to work.'}]};
  case 'voss_fraud':return{text:'It was. The cause was manufactured by a board that metrics deposits as revenue. I am telling you because I would rather you hate the board than the company — the company is the only thing up here that builds at scale. Take the contract or take the grievance. Both are fuel.',
    choices:[{t:'Take the contract.',do:()=>{F.helJob=true;F.helJobT=0;addDecision('Accepted Helion delivery contract.');}},{t:'Not now.'}]};
  case 'voss_refuse':return{text:'Then file it. Reyes will prosecute, the charter will be rewritten, and our yard prices will rise for you personally — I will see to that. You will have the law and I will have the ledger\'s memory. Choose the door you can live behind.',choices:[{t:'Noted.'}]};
  case 'halloran':
    if(!S.owned.lander&&!F.ending)return{text:'Gus Halloran, yard chief. You want surface-rated? The lander is 5200₡ and it comes with your own claim — no more shift boards, no more foremen, nobody assigns your day. Launch from the regolith, work orbit, come home and land. Gear down, tail to the pad, four gates green. I will watch your first landing from the window and judge you silently.',
      choices:[{t:'Buy the lander + claim. <em>5200₡</em>',if:()=>S.credits>=5200,req:'NEED '+fmtC(5200),do:buyLander},{t:'What is the claim worth?',next:'halloran_claim'},{t:'Not yet.'}]};
    if(S.owned.lander&&!F.fraudFound&&!F.ending)return{text:'You own a hull now, so I will tell you what I tell every owner: Helion voided you on manufactured cause. I pulled the ledger — hundreds of deposits, yours included, booked as revenue. Take it. Expose it through Reyes, hand it to Wen for the commons, or let Voss buy your silence. I am a yard chief, not a priest. But you should know what was done to you.',
      choices:[{t:'Take the ledger.',do:()=>{F.fraudFound=true;addDecision('Received the Helion deposit ledger from Halloran.');toast('EVIDENCE','The deposit ledger is yours. Three doors open.','faction');W.wireEvents.push('RUMOUR: HELION DEPOSIT LEDGER IN PROSPECTOR HANDS');save();}},{t:'Why give it to me?',next:'halloran_why'}]};
    if(F.fraudAction==='commons'&&!F.robotReprogrammed&&!F.ending)return{text:'You gave the ledger to the commons. Good. Here is my share: I reprogrammed plant robot zero. Its hauls feed the public registry now instead of the reactor. Small theft, honest direction. The board will notice in a quarter; by then the registry will be too useful to shut.',
      choices:[{t:'Let the robot work for everyone.',do:()=>{F.robotReprogrammed=true;S.rep.com=clamp(S.rep.com+1,0,10);addDecision('Halloran reprogrammed robot zero for the commons.');toast('PLANT','Robot zero repaints green. Its hauls feed the registry.','faction');save();}}]};
    return{text:F.ending?'Yard is open. Hulls are hulls. Fly safe, kid.':'Lander is on the pad, fuelled. The claim is yours. The sky is not — yet.',
      choices:[{t:'Open the yard tab.',do:()=>openStation(W.hyard,'yard')},{t:'Back to work.'}]};
  case 'halloran_claim':return{text:'Worth exactly what you make of it. A claim means your pile is your pile, your rock is your rock, and the shift board is a thing you walk past. It also means nobody comes looking for you when your transponder goes quiet. Ownership is freedom plus responsibility, kid. The regolith does not discount either.',
    choices:[{t:'Buy the lander + claim. <em>5200₡</em>',if:()=>S.credits>=5200,req:'NEED '+fmtC(5200),do:buyLander},{t:'Not yet.'}]};
  case 'halloran_why':return{text:'Because I welded the hatches on the habs they voided people out of. Because the ledger has my countersign on it and I would rather it be evidence than a souvenir. Because you bought a hull instead of a grudge. Take it. Do something with it that I would not have the nerve to do.',
    choices:[{t:'Take the ledger.',do:()=>{F.fraudFound=true;addDecision('Received the Helion deposit ledger from Halloran.');toast('EVIDENCE','The deposit ledger is yours. Three doors open.','faction');save();}}]};
  case 'okafor':
    if(F.vesperScanned&&!F.fragB&&!F.ending)return{text:'Nkem Okafor. I refine ore and I remember things. Meridian Foundry — I fenced their last cargo before they died. Six years ago they seeded three hearts in three comets and lost the keys. I have fragment B. Wen Qiu will give you hers for trust; I will sell you mine for 1400₡. Same fragment, different door. The Moon does not care which you walk through.',
      choices:[{t:'Buy fragment B. <em>1400₡</em>',if:()=>S.credits>=1400,req:'NEED '+fmtC(1400),do:()=>{S.credits-=1400;S.rep.com=clamp(S.rep.com+0.5,0,10);giveFrag('B');addDecision('Bought fragment B from Okafor.');toast('PAYOUT','Fragment B · −'+fmtC(1400),'pay');}},{t:'Tell me about Meridian.',next:'okafor_meridian'},{t:'Refinery prices?',next:'okafor_prices'}]};
    return{text:'Refinery pays 38₡ a tonne, freighters pay 55 when docked — watch the traffic. Ore is ore; the flag on the intake does not change the assay. '+(F.vesperScanned?'And the comet? I fenced Meridian\'s last cargo. Three hearts, three keys, one decision. Spend it well.':'And whatever you hear about warm comets — I fenced Meridian\'s last cargo. Ask me when you have seen one.'),
      choices:[{t:'Meridian?',next:'okafor_meridian',if:()=>F.vesperScanned},{t:'Prices?',next:'okafor_prices'},{t:'Back to work.'}]};
  case 'okafor_meridian':return{text:'Dr. Elif Aydin, founder. Brilliant, arrogant, dead. Meridian seeded self-replicating foundries in three comets — Vesper, Lantern, Cold Harbour — before the claims were drawn, so the Moon would be built before it was owned. Then the company died and the keys scattered. One is in their tug, MERIDIAN-3, still in orbit with her log blinking. Boots on, find the hatch. The dead keep better secrets than the living.',
    choices:[{t:'Buy fragment B. <em>1400₡</em>',if:()=>S.credits>=1400&&!F.fragB,req:'NEED '+fmtC(1400),do:()=>{S.credits-=1400;giveFrag('B');addDecision('Bought fragment B from Okafor.');}},{t:'Noted.'}]};
  case 'okafor_prices':return{text:'Refinery 38₡/t, always open. Tianque 30, Armstrong 32, Helion 34 — Helion adds a quarter if you exposed them, so factor your principles. Kestrel and Ares Gate pay 55 with 30 t demand per docking. They hold, they queue, they berth — one ship at a time, like civilized traffic. Time your hauls to the wire.',choices:[{t:'Back to work.'}]};
  }
  return{text:'…',choices:[{t:'[ End ]'}]};
}
let dlgState=null;
function startDialogue(id){dlgState={id,node:id};renderDialogue();$('dlg').classList.remove('hidden');AudioSys.blip(700,0.05,'sine',0.05);}
function renderDialogue(){
  const id=dlgState.id,node=npcNode(dlgState.node),npc=NPCS[id];
  setText($('dlgName'),npc.name);setText($('dlgRole'),npc.role);
  drawPortrait($('dlgPortrait'),npc.fac);
  $('dlgChoices').innerHTML='';
  typeText($('dlgText'),node.text,()=>showChoices(node));
}
function showChoices(node){
  const box=$('dlgChoices');box.innerHTML='';
  for(const c of node.choices){
    const fails=c.if&&!c.if();
    if(fails&&!c.req)continue;
    const b=document.createElement('button');b.className='dchoice';b.innerHTML=c.t;
    if(fails){b.classList.add('lock');b.innerHTML=c.t+'<span class="req">⯃ '+c.req+'</span>';}
    else b.onclick=()=>{AudioSys.blip(950,0.04,'square',0.04);
      if(c.do)c.do();
      if(c.next){dlgState.node=c.next;renderDialogue();}
      else closeDialogue();};
    box.appendChild(b);
  }
}
function closeDialogue(){dlgState=null;$('dlg').classList.add('hidden');}
function drawPortrait(c,fac){
  const x=c.getContext('2d'),w=c.width,h=c.height,col=FACCOL[fac]||COL.cyan;
  x.fillStyle='#060b16';x.fillRect(0,0,w,h);
  x.strokeStyle=col;x.lineWidth=1.5;x.shadowColor=col;x.shadowBlur=6;
  x.beginPath();x.arc(w/2,h/2-4,12,0,Math.PI*2);x.stroke();
  x.beginPath();x.moveTo(w/2-16,h-6);x.quadraticCurveTo(w/2,h-26,w/2+16,h-6);x.stroke();
  x.fillStyle=col;x.fillRect(w/2-2,h/2-6,4,2);
  x.shadowBlur=0;x.strokeStyle='rgba(63,216,255,.2)';x.strokeRect(1,1,w-2,h-2);
}
let typeTimer=null;
function typeText(el,text,done){
  if(typeTimer)clearInterval(typeTimer);
  el.textContent='';let i=0;
  el.onclick=()=>{if(typeTimer){clearInterval(typeTimer);typeTimer=null;el.textContent=text;if(done)done();}};
  typeTimer=setInterval(()=>{i+=2;el.textContent=text.slice(0,i);
    if(i>=text.length){clearInterval(typeTimer);typeTimer=null;if(done)done();}},16);
}
