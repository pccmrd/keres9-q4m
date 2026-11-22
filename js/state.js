'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — STATE · GROUND GEOMETRY — save-shaped state, logs, lunar surface math
   ================================================================ */

/* ---------------- STATE ---------------- */
let W=null, started=false, storyOn=false, pilotOn=false;
let camMode=1; const CAMZ=[0.55,1,2.2];
let altMode=0, modalStack=[];
const logs=[];
function log(msg,cls){logs.push({t:W?W.t:0,msg,cls});if(logs.length>220)logs.shift();}
function newState(){
  return{
    credits:0,rep:{cn:1,us:0,hel:0,com:1},
    projects:{skyfield:8,array:5,reactor:12},
    flags:{shiftCount:0,firstShift:false,wenQuest:0,wenCount:0,vesperScanned:false,dataGiven:null,
      fragA:false,fragB:false,fragC:false,doorOpened:false,ending:null,controller:null,
      exclusiveCN:false,jointSurvey:false,fraudFound:false,fraudAction:null,depositReturned:false,
      claim:false,hulkRead:false,armJob:false,armJobN:0,helJob:false,helJobT:0,robotReprogrammed:false,
      cometsScanned:0,reyesHazard:false,vossRedeem:false,postTalk:{}},
    upgrades:{track:false,tank:false,laser:false,hold:false},
    owned:{tug:false,lander:false},
    decisions:[],pile:0,holdOre:0,carry:0,
    shiftsDone:0,massesResolved:0,scansPaid:0,salvage:0,hostilesDown:0
  };
}
let S=newState();

/* ---------------- GROUND GEOMETRY ---------------- */
function groundArc(ma){return (ma-W.moon.angle)*R_MOON;}
function groundH(s){return Math.sin(s*0.021)*0.34+Math.sin(s*0.077+1.3)*0.17+Math.sin(s*0.31+2.7)*0.07-0.28;}
function surfacePoint(ma){const d=dir(ma);const r=R_MOON+SUIT_R+groundH(groundArc(ma));return{x:d.x*r,y:d.y*r};}
function groundPoint(ma,h){const d=dir(ma);const r=R_MOON+(h||0);return{x:d.x*r,y:d.y*r};}
