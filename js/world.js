'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — WORLD — bodies, stations, bases, orbits, propagation
   ================================================================ */

/* ---------------- WORLD ---------------- */
function makeBody(o){
  return Object.assign({id:'b'+(W?W.bodies.length:0),pos:{x:0,y:0},vel:{x:0,y:0},angle:0,spin:0,
    resolved:false,f0:88+rng()*44,nodes:[],kind:'rock',r:80,name:'—',faction:null,scannable:true},o);
}
function rockNodes(b,n,min,max){for(let i=0;i<n;i++){const t=min+rng()*(max-min);b.nodes.push({ang:rng()*Math.PI*2,t,t0:t});}}
const ROCK_NAMES=['Kestrel','Anvil','Salt Tooth','Marrow','Nine Sisters','Cinder','Bellwether','Tallow','Grist','Harrow','Pale Ox','Sunder','Whetstone','Loom'];
function buildWorld(){
  W={t:0,bodies:[],ships:[],robots:[],chunks:[],particles:[],ports:[],bootprints:[],
    player:null,tug:null,lander:null,shuttle:null,htug:null,kestrel:null,ares:null,
    target:null,waypoint:null,shift:null,ping:0,shake:0,wireEvents:[],trafficLog:[]};
  const habMA=1.150;
  W.moon={pos:{x:0,y:0},vel:{x:0,y:0},spin:OMEGA,r:R_MOON,angle:0};
  W.craters=[];for(let i=0;i<90;i++)W.craters.push({ma:rng()*Math.PI*2,d:rng()*R_MOON*0.92,r:60+rng()*420,s:rng()});
  function base(id,name,ma,fac,tabs){
    const b=makeBody({id,name,kind:'base',r:26,ma,faction:fac,scannable:false,tabs,berths:[],hatches:[]});
    W.bodies.push(b);return b;
  }
  W.hab=base('hab','HAB 7-C',habMA,'hel',['intake','crew']);
  W.liftMA=habMA+0.010;
  W.hq=base('helion','HELION SURFACE HQ',habMA+0.030,'hel',['intake','jobs','crew']);
  W.hyard=base('hyard','HELION YARD',habMA+0.048,'hel',['yard','crew']);
  W.landmarks=[
    {ma:W.hab.ma,label:'HAB',body:W.hab},
    {ma:W.liftMA,label:'LIFT',body:null},
    {ma:W.hq.ma,label:'HQ',body:W.hq},
    {ma:W.hyard.ma,label:'YARD',body:W.hyard}
  ];
  W.corridor={a:groundArcOf(habMA)-40,b:groundArcOf(W.hyard.ma)+70};
  function groundArcOf(ma){return ma*R_MOON;}
  function pad(st,off,label,reserved){
    const b={ang:off,dist:0,alt:11,ship:null,reserved:reserved||null,label,surface:true};
    st.berths.push(b);return b;
  }
  pad(W.hab,-0.005,'HAB PAD');
  W.hqP0=pad(W.hq,-0.006,'HQ PAD 0');W.hqP1=pad(W.hq,0.006,'HQ PAD 1','htug');
  W.hyP0=pad(W.hyard,0.005,'YARD PAD 0');
  function station(id,name,orbit,fac,ringR,spin,tabs){
    const b=makeBody({id,name,kind:'station',r:ringR,faction:fac,spin,tabs,berths:[],hatches:[],orbit,scannable:id!=='tianque'});
    W.bodies.push(b);return b;
  }
  W.tianque=station('tianque','TIANQUE STATION',{type:'sync',ma:W.liftMA},'cn',64,0.05,['intake','yard','jobs','crew']);
  W.tianque.resolved=true;
  W.armstrong=station('armstrong','ARMSTRONG STATION',{type:'circle',r:15600,a0:3.6,n:Math.sqrt(MU/Math.pow(15600,3))},'us',72,-0.04,['intake','yard','jobs','crew']);
  W.refinery=station('refinery','OKAFOR WORKS',{type:'circle',r:13900,a0:5.5,n:Math.sqrt(MU/Math.pow(13900,3))},null,60,0.06,['intake','jobs','crew']);
  function berth(st,ang,label,reserved){const b={ang,dist:st.r+22,ship:null,reserved:reserved||null,label};st.berths.push(b);return b;}
  W.tB0=berth(W.tianque,0.55,'BERTH 0 · SHUTTLE','shuttle');
  W.tB1=berth(W.tianque,3.15,'BERTH 1 · YARD');
  W.tB2=berth(W.tianque,4.60,'BERTH 2 · VISITOR');
  W.aB0=berth(W.armstrong,1.2,'BERTH 0 · VISITOR');
  W.aB1=berth(W.armstrong,3.9,'BERTH 1 · KESTREL','kestrel');
  W.rB0=berth(W.refinery,0.7,'BERTH 0 · ARES','ares');
  W.rB1=berth(W.refinery,2.8,'BERTH 1 · HEL-04','htug');
  W.rB2=berth(W.refinery,4.9,'BERTH 2 · VISITOR');
  function hatch(st,ang,label,tab,npc){st.hatches.push({ang,label,tab,npc});}
  hatch(W.tianque,0.80,'SHIFT BOARD','jobs','zhao');
  hatch(W.tianque,1.60,'CATALOG ARCHIVE',null,'wen');
  hatch(W.tianque,2.35,'INTAKE','intake');
  hatch(W.tianque,3.10,'YARD','yard');
  hatch(W.armstrong,0.6,'TREATY OFFICE',null,'reyes');
  hatch(W.armstrong,2.2,'QUARTERMASTER','yard','okoye');
  hatch(W.armstrong,4.6,'INTAKE','intake');
  hatch(W.refinery,1.6,'OKAFOR COUNTER','intake','okafor');
  hatch(W.refinery,3.8,'CONTRACTS','jobs');
  hatch(W.hq,0,'LIAISON OFFICE','jobs','voss');
  hatch(W.hyard,0.002,'YARD OFFICE','yard','halloran');
  hatch(W.hab,0,'HAB 7-C · HOME','intake');
  W.rocks=[];
  for(let i=0;i<14;i++){
    const r=13300+rng()*9500,rad=55+rng()*150;
    const b=makeBody({id:'rock'+i,name:'CL-'+(100+i),code:'CL-'+(100+i),kind:'rock',r:rad,
      orbit:{type:'circle',r,a0:rng()*Math.PI*2,n:Math.sqrt(MU/(r*r*r))},spin:(rng()-0.5)*0.08,rockName:ROCK_NAMES[i]});
    rockNodes(b,3+Math.floor(rng()*3),3,7);
    b.verts=[];const nv=9+Math.floor(rng()*5);
    for(let k=0;k<nv;k++)b.verts.push(0.72+rng()*0.4);
    if(i<8)b.resolved=true;
    W.bodies.push(b);W.rocks.push(b);
  }
  for(let i=0;i<2;i++){
    const r=14500+rng()*6000;
    const b=makeBody({id:'debris'+i,name:'DEBRIS SWARM '+(i+1),kind:'debris',r:34,
      orbit:{type:'circle',r,a0:rng()*Math.PI*2,n:Math.sqrt(MU/(r*r*r))},spin:0.15});
    rockNodes(b,1,2,3);b.verts=[1,0.6,1.1,0.7,0.9,0.6];W.bodies.push(b);
  }
  function comet(id,name,a,e,wp,M0,special){
    const b=makeBody({id,name,kind:'comet',r:special?110:75,special:!!special,
      orbit:{type:'kepler',a,e,wp,M0,n:Math.sqrt(MU/(a*a*a))},spin:0.02});
    rockNodes(b,special?4:3,4,8);b.verts=[];for(let k=0;k<10;k++)b.verts.push(0.8+rng()*0.3);
    W.bodies.push(b);return b;
  }
  W.vesper=comet('vesper','2031 Q4 · VESPER',16800,0.22,2.1,0.4,true);
  W.comet2=comet('comet2','2032 B1 · LANTERN',18200,0.18,4.4,2.2,false);
  W.comet3=comet('comet3','2033 F2 · COLD HARBOUR',15600,0.12,0.6,4.0,false);
  W.hulk1=makeBody({id:'hulk1',name:'MERIDIAN-3',kind:'hulk',r:60,spin:0.015,
    orbit:{type:'circle',r:14800,a0:1.9,n:Math.sqrt(MU/Math.pow(14800,3))}});
  rockNodes(W.hulk1,3,4,6);W.hulk1.verts=[1,0.9,1.2,0.8,1,0.9,1.1,0.7];
  W.hulk2=makeBody({id:'hulk2',name:'HULK · TUG 88',kind:'hulk',r:42,spin:-0.03,
    orbit:{type:'circle',r:17600,a0:4.9,n:Math.sqrt(MU/Math.pow(17600,3))}});
  rockNodes(W.hulk2,2,3,5);W.hulk2.verts=[1,0.7,1,0.8,1.2,0.7];
  W.bodies.push(W.hulk1,W.hulk2);
  function ship(id,name,kind,r,st,bth){
    const s={id,name,kind,r,pos:{x:0,y:0},vel:{x:0,y:0},angle:0,angVel:0,
      docked:{st,bth},state:'docked',timer:30+rng()*40,route:null,thrust:0,spin:0,faction:null,hull:100};
    bth.ship=s;W.ships.push(s);return s;
  }
  W.shuttle=ship('shuttle','CREW SHUTTLE · TQ-2','shuttle',9,W.tianque,W.tB0);W.shuttle.faction='cn';W.shuttle.timer=9999;
  W.htug=ship('htug','HEL-04 · PLANT TUG','htug',8,W.hq,W.hqP1);W.htug.faction='hel';W.htug.timer=55;
  W.kestrel=ship('kestrel','CVN KESTREL · EARTH','freighter',16,W.armstrong,W.aB1);W.kestrel.faction='us';W.kestrel.timer=80;
  W.ares=ship('ares','MV ARES GATE · MARS','freighter',16,W.refinery,W.rB0);W.ares.timer=100;
  W.kestrel.demand=30;W.ares.demand=30;
  W.fBodyK=makeBody({id:'fBodyK',name:'CVN KESTREL',kind:'freighter',r:16,shipRef:W.kestrel});
  W.fBodyA=makeBody({id:'fBodyA',name:'MV ARES GATE',kind:'freighter',r:16,shipRef:W.ares});
  W.bodies.push(W.fBodyK,W.fBodyA);
  for(let i=0;i<3;i++)W.robots.push({ma:W.hq.ma+0.006+i*0.003,state:'drill',timer:6+i*5,
    home:W.hq.ma+0.006+i*0.003,deposit:W.hq.ma+0.012,carry:0,id:i});
  W.ports=[W.tianque,W.armstrong,W.refinery,W.hq,W.hyard,W.hab].map(st=>({st,cool:0,queue:[],approach:null}));
  W.player={mode:'foot',ma:W.hab.ma-0.004,pos:{x:0,y:0},vel:{x:0,y:0},aim:0,
    boots:null,bootAng:0,ship:null,passenger:null,dv:SUIT_DV,hull:100,jumpT:0,air:false,
    gear:false,match:false,brake:false,thr:0,lift:null,dead:false,lastPrint:0,walkPhase:0,groundSpd:0};
  W.stars=[];for(let i=0;i<300;i++)W.stars.push({x:rng()*4000-2000,y:rng()*4000-2000,z:[0.08,0.18,0.34][i%3],s:0.5+rng()*1.6,tw:rng()*6});
  propagate(0);
  W.cam={x:0,y:0,scale:0.05,rot:0};
  W.wireEvents.push('CATALOG INTEGRITY '+integrity()+'% — '+unresolved()+' MASSES UNVERIFIED IN LUNAR ORBIT');
  W.wireEvents.push('TAOYUAN / ARMSTRONG / HELION · SHIFT BOARD OPEN');
}
function integrity(){const sc=W.bodies.filter(b=>b.scannable);const r=sc.filter(b=>b.resolved).length;return Math.floor(r/sc.length*100);}
function unresolved(){return W.bodies.filter(b=>b.scannable&&!b.resolved).length;}
function padGroundAngle(st,b){return st.ma+b.ang+W.moon.angle;}
function berthPos(st,b){
  if(!b||!st)return{pos:{x:0,y:0},out:{x:1,y:0},ang:0};
  if(b.surface){const ga=padGroundAngle(st,b),d=dir(ga);
    return{pos:{x:d.x*(R_MOON+b.alt),y:d.y*(R_MOON+b.alt)},out:d,ang:ga};}
  const a=b.ang+st.angle,d=dir(a);
  return{pos:{x:st.pos.x+d.x*b.dist,y:st.pos.y+d.y*b.dist},out:d,ang:a};
}
function dockAngle(st,b,bp){return b.surface?Math.atan2(bp.out.y,bp.out.x):Math.atan2(-bp.out.y,-bp.out.x);}
function propagate(dt){
  W.t+=dt;W.moon.angle=OMEGA*W.t;
  for(const b of W.bodies){
    if(b.kind==='base'){const a=b.ma+W.moon.angle,d=dir(a);
      b.pos={x:d.x*R_MOON,y:d.y*R_MOON};b.vel={x:-OMEGA*d.y*R_MOON,y:OMEGA*d.x*R_MOON};b.angle=a;continue;}
    if(b.shipRef){const s=b.shipRef;b.pos={x:s.pos.x,y:s.pos.y};b.vel={x:s.vel.x,y:s.vel.y};b.angle=s.angle;continue;}
    const o=b.orbit;if(!o)continue;
    if(o.type==='circle'){const a=o.a0+o.n*W.t,d=dir(a);
      b.pos={x:d.x*o.r,y:d.y*o.r};b.vel={x:-o.n*d.y*o.r,y:o.n*d.x*o.r};}
    else if(o.type==='sync'){const a=o.ma+W.moon.angle,d=dir(a);
      b.pos={x:d.x*R_HEAD,y:d.y*R_HEAD};b.vel={x:-OMEGA*d.y*R_HEAD,y:OMEGA*d.x*R_HEAD};}
    else if(o.type==='kepler'){const k=kepler(o.a,o.e,o.wp,o.M0,o.n,W.t);b.pos=k.pos;b.vel=k.vel;}
    b.angle+=b.spin*dt;
  }
  for(const st of[W.tianque,W.armstrong,W.refinery])st.angle+=st.spin*dt;
}
