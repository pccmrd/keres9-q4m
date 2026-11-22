'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — CONFIG · UTIL — constants, math helpers, seeded RNG, formatting
   ================================================================ */

/* ---------------- CONFIG ---------------- */
const R_MOON=6000, G0=1.62, MU=G0*R_MOON*R_MOON;
const R_HEAD=12900, OMEGA=Math.sqrt(MU/(R_HEAD*R_HEAD*R_HEAD));
const WALK=7, BOUND=18.2, JUMP_V=5.4, JUMP_HOLD=27, AIR_STEER=5.5, TUCK=3.4;
const FOOT_SAFE=14, JET_AGL=320, SUIT_R=1.4;
const SUIT_DV=240, SUIT_A=8;
const SHIP={
  tug:{r:7,main:16,rcs:8,dv:900,hold:24,price:1600,name:'ORB · TUG'},
  lander:{r:9,main:22,rcs:10,dv:1500,hold:40,price:5200,name:'SFC · LANDER'}
};
const PRICE={tianque:30,armstrong:32,refinery:38,helion:34,hab:26,hyard:28,freight:55};
const SHIFT_RATE=45, SHIFT_BONUS=90, SHIFT_QUOTA=6, SHIFT_WINDOW=300;
const GATE={spd:2.5,ang:20*Math.PI/180,lat:5,rot:0.25};
const SAVE_KEY='luna2035.prospector.v1';
const COL={cyan:'#3fd8ff',amber:'#ffb02e',red:'#ff4954',blue:'#5f8dff',green:'#69f58c',magenta:'#ff5ad1',warn:'#ffd23f',ink:'#dfe9f5',dim:'#7d8ca3',reg:'#c8a882'};
const FACCOL={cn:COL.red,us:COL.blue,hel:COL.amber,com:COL.green};
const FACNAME={cn:'TAOYUAN CONSORTIUM',us:'ARMSTRONG TREATY',hel:'HELION INDUSTRIES',com:'THE COMMONS'};
const SUN_MA=0.55;

/* ---------------- UTIL ---------------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const dir=a=>({x:Math.cos(a),y:Math.sin(a)});
const hyp=(x,y)=>Math.sqrt(x*x+y*y);
const dist=(a,b)=>hyp(a.x-b.x,a.y-b.y);
const wrapA=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rng=mulberry(20351118);
function ihash(i){let x=Math.imul(i,374761393)+668265263;x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967296;}
const fmtM=m=>m>=1000?(m/1000).toFixed(2)+' km':Math.round(m)+' m';
const fmtC=c=>'₡ '+Math.round(c).toLocaleString('en-US');
const $=id=>document.getElementById(id);
function setText(el,s){if(el.__t!==s){el.__t=s;el.textContent=s;}}
function velAt(b,p){return{x:b.vel.x-(b.spin||0)*(p.y-b.pos.y),y:b.vel.y+(b.spin||0)*(p.x-b.pos.x)};}
function kepler(a,e,wp,M0,n,t){
  const M=M0+n*t;let E=M;
  for(let i=0;i<6;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const cE=Math.cos(E),sE=Math.sin(E),r=a*(1-e*cE),f=Math.sqrt(MU*a)/r;
  const px=a*(cE-e),py=a*Math.sqrt(1-e*e)*sE,vx=-f*sE,vy=f*Math.sqrt(1-e*e)*cE;
  const c=Math.cos(wp),s=Math.sin(wp);
  return{pos:{x:px*c-py*s,y:px*s+py*c},vel:{x:vx*c-vy*s,y:vx*s+vy*c}};
}
