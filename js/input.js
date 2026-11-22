'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — INPUT — keyboard, mouse, touch sticks, action bar wiring
   ================================================================ */

/* ---------------- INPUT ---------------- */
const keys={},held={mine:false,fire:false};
const mouse={x:innerWidth/2,y:innerHeight*0.4};
let touchMode=false;const stickL={x:0,y:0},stickR={x:0,y:0};
function readInput(){
  let x=0,y=0,spin=0;
  if(keys.KeyA)x-=1;if(keys.KeyD)x+=1;
  if(keys.KeyW)y-=1;if(keys.KeyS)y+=1;
  if(keys.KeyQ)spin-=1;if(keys.KeyE)spin+=1;
  if(touchMode){x+=stickL.x;y+=stickL.y;spin+=stickR.x;}
  const P=W.player;
  if(P.mode==='pilot'&&!P.ship.docked){
    if(keys.ShiftLeft||keys.ShiftRight)P.thr=clamp(P.thr+0.5/60,0,1);
    if(keys.ControlLeft||keys.ControlRight)P.thr=clamp(P.thr-0.7/60,0,1);
  }
  return{x:clamp(x,-1,1),y:clamp(y,-1,1),spin:clamp(spin,-1,1),sprint:false};
}
const GAME_KEYS=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyM','KeyF','KeyV','KeyB','KeyX','KeyZ','KeyT','KeyG','KeyC','KeyR','KeyP','KeyJ','KeyL','Escape','Digit1','Digit2','Digit3'];
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(GAME_KEYS.includes(e.code))e.preventDefault();
  AudioSys.init();
  if(e.repeat){keys[e.code]=true;return;}
  keys[e.code]=true;
  if(!started)return;
  switch(e.code){
    case 'Escape':escHandler();break;
    case 'KeyF':if(!blockingModal())doAction();break;
    case 'KeyB':if(!blockingModal())toggleBoots();break;
    case 'KeyX':if(!blockingModal())toggleMatch();break;
    case 'KeyZ':if(!blockingModal())toggleBrake();break;
    case 'KeyT':if(!blockingModal())cycleTarget();break;
    case 'KeyG':if(!blockingModal())toggleGear();break;
    case 'KeyC':if(!blockingModal())tuner.open?closeTuner():openTuner();break;
    case 'KeyR':if(!blockingModal())doPing();break;
    case 'KeyP':toggleStory();break;
    case 'KeyJ':toggleModal('mJournal',renderJournal);break;
    case 'KeyL':toggleModal('mLogs',renderLogs);break;
    case 'KeyV':altMode=1-altMode;break;
    case 'KeyM':held.mine=true;break;
    case 'Space':held.fire=true;break;
    case 'Digit1':camMode=0;syncCam();break;
    case 'Digit2':camMode=1;syncCam();break;
    case 'Digit3':camMode=2;syncCam();break;
  }
});
window.addEventListener('keyup',e=>{keys[e.code]=false;
  if(e.code==='KeyM')held.mine=false;if(e.code==='Space')held.fire=false;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;held.mine=false;held.fire=false;});
window.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
window.addEventListener('wheel',e=>{if(!started||blockingModal())return;
  camMode=e.deltaY<0?Math.min(2,camMode+1):Math.max(0,camMode-1);syncCam();},{passive:true});
window.addEventListener('pointerdown',()=>AudioSys.init());
function syncCam(){setText($('btnCam'),'CAM '+['½×','1×','2×'][camMode]);}
function toggleMatch(){
  const P=W.player;
  if(P.mode!=='pilot'){toast('HELM','Match is a helm control.','warn');return;}
  if(!W.target){toast('HELM','No target. T to cycle.','warn');return;}
  P.match=!P.match;if(P.match)P.brake=false;
  toast('HELM',P.match?'Station-keeping on '+W.target.name+'. Push stick to creep at 8 m/s.':'Match off.','info');
}
function toggleBrake(){
  const P=W.player;
  if(P.mode!=='pilot'){toast('HELM','Brake is a helm control.','warn');return;}
  P.brake=!P.brake;if(P.brake)P.match=false;
  toast('HELM',P.brake?'Braking to zero. Push stick to creep.':'Brake off.','info');
}
function toggleGear(){
  const P=W.player;
  if(P.mode!=='pilot'){toast('GEAR','Gear is a hull control.','warn');return;}
  P.gear=!P.gear;AudioSys.clunk();toast('GEAR',P.gear?'Gear down.':'Gear up.','info');
}
document.querySelectorAll('#actionbar .abtn[data-act]').forEach(b=>{
  const act=b.dataset.act;
  if(act==='mine'||act==='fire'){
    b.addEventListener('pointerdown',e=>{e.preventDefault();held[act]=true;AudioSys.init();});
    b.addEventListener('pointerup',()=>held[act]=false);
    b.addEventListener('pointerleave',()=>held[act]=false);
    b.addEventListener('pointercancel',()=>held[act]=false);
  }else b.addEventListener('click',()=>{
    AudioSys.init();if(!started)return;
    if(act==='match')toggleMatch();if(act==='brake')toggleBrake();if(act==='tgt')cycleTarget();
    if(act==='gear')toggleGear();if(act==='boots')toggleBoots();if(act==='ping')doPing();
    if(act==='scan')tuner.open?closeTuner():openTuner();
  });
});
$('btnF').addEventListener('click',()=>{AudioSys.init();if(started&&!blockingModal())doAction();});
function setupStick(el,state){
  const nub=el.querySelector('.nub');let pid=null;
  el.addEventListener('pointerdown',e=>{pid=e.pointerId;el.setPointerCapture(pid);touchMode=true;
    document.body.classList.add('touch');move(e);AudioSys.init();});
  el.addEventListener('pointermove',e=>{if(e.pointerId===pid)move(e);});
  const end=e=>{if(e.pointerId===pid){pid=null;state.x=0;state.y=0;nub.style.transform='translate(0,0)';}};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  function move(e){
    const r=el.getBoundingClientRect();
    let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);
    const m=hyp(dx,dy);if(m>1){dx/=m;dy/=m;}
    state.x=Math.abs(dx)>0.15?dx:0;state.y=Math.abs(dy)>0.15?dy:0;
    nub.style.transform='translate('+(dx*30)+'px,'+(dy*30)+'px)';
  }
}
setupStick($('stickL'),stickL);setupStick($('stickR'),stickR);
if('ontouchstart' in window&&navigator.maxTouchPoints>0){touchMode=true;document.body.classList.add('touch');}
(function(){
  const rail=$('thrRail'),knob=$('thrKnob');let pid=null;
  rail.addEventListener('pointerdown',e=>{pid=e.pointerId;rail.setPointerCapture(pid);move(e);});
  rail.addEventListener('pointermove',e=>{if(e.pointerId===pid)move(e);});
  const end=e=>{if(e.pointerId===pid)pid=null;};
  rail.addEventListener('pointerup',end);rail.addEventListener('pointercancel',end);
  function move(e){
    const r=rail.getBoundingClientRect();
    const v=clamp(1-(e.clientY-r.top)/r.height,0,1);
    if(W.player.mode==='pilot')W.player.thr=v;
    knob.style.bottom=(v*(r.height-22))+'px';
  }
})();
