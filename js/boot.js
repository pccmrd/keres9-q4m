'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — BOOT — new world, start flow, button wiring
   ================================================================ */

/* ---------------- BOOT ---------------- */
function newWorld(){
  S=newState();buildWorld();
  const P=W.player;P.ma=W.hab.ma-0.004;P.pos=surfacePoint(P.ma);P.lastPrint=groundArc(P.ma);
  storyBeatIdx=0;storyTimer=0;stripKey='';
  document.body.classList.remove('piloting');
}
function startGame(cont,watch){
  if(cont){if(!load())newWorld();}else newWorld();
  started=true;
  closeModal('mTitle');
  if(watch){storyOn=true;pilotOn=false;storyTimer=1;syncStoryUI();}
  W.cam.x=W.player.pos.x;W.cam.y=W.player.pos.y;W.cam.scale=5;
  W.cam.rot=-Math.PI/2-Math.atan2(W.player.pos.y,W.player.pos.x);
  rebuildTicker();renderStrip();
  toast('LICENCE','Licence 7-C VALID. Hold D to walk east 60 m to the cable lift. SHIFT to bound.','good');
  log('Shift started','e');
  AudioSys.init();AudioSys.swell();save();
}
$('btnStart').addEventListener('click',()=>startGame(false,false));
$('btnWatch').addEventListener('click',()=>startGame(false,true));
$('btnContinue').addEventListener('click',()=>startGame(true,false));
$('btnTManual').addEventListener('click',()=>openModal('mManual',renderManual));
$('btnTSound').addEventListener('click',()=>{AudioSys.init();AudioSys.setMute(!AudioSys.on);syncSound();});
function syncSound(){
  $('btnTSound').textContent='SOUND: '+(AudioSys.on?'ON':'OFF');
  $('btnSound').textContent='SND '+(AudioSys.on?'ON':'OFF');
  $('btnSound').classList.toggle('on',AudioSys.on);
  $('pSound').textContent='SOUND: '+(AudioSys.on?'ON':'OFF');
}
$('btnSound').addEventListener('click',()=>{AudioSys.init();AudioSys.setMute(!AudioSys.on);syncSound();});
$('btnStory').addEventListener('click',toggleStory);
$('btnJournal').addEventListener('click',()=>toggleModal('mJournal',renderJournal));
$('btnChart').addEventListener('click',()=>{if(started)toggleModal('mChart',renderChart);});
$('btnCam').addEventListener('click',()=>{camMode=(camMode+1)%3;syncCam();});
$('btnPause').addEventListener('click',()=>{if(started){openModal('mPause');syncPause();}});
$('btnPauseX').addEventListener('click',()=>closeModal('mPause'));
$('btnResume').addEventListener('click',()=>closeModal('mPause'));
$('pStory').addEventListener('click',()=>{toggleStory();syncPause();});
$('btnPJournal').addEventListener('click',()=>{closeModal('mPause');openModal('mJournal',renderJournal);});
$('btnPManual').addEventListener('click',()=>{closeModal('mPause');openModal('mManual',renderManual);});
$('pSound').addEventListener('click',()=>{AudioSys.init();AudioSys.setMute(!AudioSys.on);syncSound();});
$('btnPLogs').addEventListener('click',()=>{closeModal('mPause');openModal('mLogs',renderLogs);});
$('btnRecover').addEventListener('click',()=>{closeModal('mPause');emergencyRecovery();});
$('btnAbandon').addEventListener('click',()=>{
  closeModal('mPause');
  $('cfText').textContent='Abandon this world? Credits, standing, the key, the decision — all of it goes back to the regolith. A new world is seeded.';
  openModal('mConfirm');
  $('btnCfYes').onclick=()=>{closeModal('mConfirm');try{localStorage.removeItem(SAVE_KEY);}catch(e){}
    started=false;newWorld();openModal('mTitle');$('btnContinue').classList.add('hidden');};
});
$('btnExitTitle').addEventListener('click',()=>{closeModal('mPause');save();started=false;
  openModal('mTitle');$('btnContinue').classList.remove('hidden');});
$('btnCfNo').addEventListener('click',()=>closeModal('mConfirm'));
$('btnJournalX').addEventListener('click',()=>closeModal('mJournal'));
$('btnManualX').addEventListener('click',()=>closeModal('mManual'));
$('btnLogsX').addEventListener('click',()=>closeModal('mLogs'));
$('btnDeathOk').addEventListener('click',acceptRecovery);
$('btnClaimOk').addEventListener('click',()=>{closeModal('mClaim');
  toast('CLAIM','The lander is on Yard Pad 0. F to board. The sky is not yours yet.','good');});
$('btnKeep').addEventListener('click',()=>{closeModal('mEnding');
  toast('EPILOGUE','The Moon is decided. The rock still pays. Free work.','good');});
$('btnNewWorld').addEventListener('click',()=>{closeModal('mEnding');
  try{localStorage.removeItem(SAVE_KEY);}catch(e){}
  started=false;newWorld();openModal('mTitle');$('btnContinue').classList.add('hidden');});
$('btnDlgClose').addEventListener('click',closeDialogue);
$('btnTuneClose').addEventListener('click',closeTuner);
$('tFreq').addEventListener('input',e=>{tuner.freq=parseFloat(e.target.value);tuner.sweep=false;});
$('btnSweep').addEventListener('click',()=>{tuner.sweep=true;AudioSys.blip(1200,0.06,'sine',0.05);});
$('btnTakeOver').addEventListener('click',()=>{pilotOn=false;storyOn=false;endNarrative();syncStoryUI();toast('HELM','Your stick.','info');});
$('btnSkip').addEventListener('click',nextNarrative);
$('hudObj').addEventListener('click',()=>{if(started)openModal('mChart',renderChart);});
window.addEventListener('error',e=>{try{toast('DIAG','Runtime: '+e.message,'bad');log('ERR '+e.message);}catch(_){}});
newWorld();
try{if(localStorage.getItem(SAVE_KEY))$('btnContinue').classList.remove('hidden');}catch(e){}
renderManual();rebuildTicker();syncSound();syncCam();
requestAnimationFrame(frame);
