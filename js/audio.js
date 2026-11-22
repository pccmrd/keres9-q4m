'use strict';
/* ================================================================
   LUNA 2035 // PROSPECTOR — AUDIO — procedural WebAudio SFX engine
   ================================================================ */

/* ---------------- AUDIO ---------------- */
const AudioSys={
  ctx:null,master:null,on:true,thrG:null,lasG:null,ambG:null,
  init(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      this.ctx=new C();
      const comp=this.ctx.createDynamicsCompressor();
      this.master=this.ctx.createGain();this.master.gain.value=this.on?0.9:0;
      this.master.connect(comp);comp.connect(this.ctx.destination);
      this.ambG=this.ctx.createGain();this.ambG.gain.value=0.05;this.ambG.connect(this.master);
      [55,55.4,110.3].forEach((f,i)=>{const o=this.ctx.createOscillator();o.type='sine';o.frequency.value=f;
        const g=this.ctx.createGain();g.gain.value=i===2?0.12:0.5;o.connect(g);g.connect(this.ambG);o.start();});
      const nb=this.noiseBuf();const ns=this.ctx.createBufferSource();ns.buffer=nb;ns.loop=true;
      const nf=this.ctx.createBiquadFilter();nf.type='lowpass';nf.frequency.value=180;
      const ng=this.ctx.createGain();ng.gain.value=0.25;ns.connect(nf);nf.connect(ng);ng.connect(this.ambG);ns.start();
      const lfo=this.ctx.createOscillator();lfo.frequency.value=0.07;const lg=this.ctx.createGain();lg.gain.value=70;
      lfo.connect(lg);lg.connect(nf.frequency);lfo.start();
      const ts=this.ctx.createBufferSource();ts.buffer=nb;ts.loop=true;
      const tf=this.ctx.createBiquadFilter();tf.type='bandpass';tf.frequency.value=650;tf.Q.value=0.7;
      this.thrG=this.ctx.createGain();this.thrG.gain.value=0;ts.connect(tf);tf.connect(this.thrG);this.thrG.connect(this.master);ts.start();
      const lo=this.ctx.createOscillator();lo.type='sawtooth';lo.frequency.value=170;
      const lf=this.ctx.createBiquadFilter();lf.type='highpass';lf.frequency.value=900;
      this.lasG=this.ctx.createGain();this.lasG.gain.value=0;lo.connect(lf);lf.connect(this.lasG);this.lasG.connect(this.master);lo.start();
    }catch(e){}
  },
  noiseBuf(){const b=this.ctx.createBuffer(1,this.ctx.sampleRate*1.2,this.ctx.sampleRate);
    const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;},
  setMute(on){this.on=on;if(this.master)this.master.gain.setTargetAtTime(on?0.9:0,this.ctx.currentTime,0.08);},
  thrust(v){if(this.thrG)this.thrG.gain.setTargetAtTime(clamp(v,0,1)*0.14,this.ctx.currentTime,0.08);},
  laser(v){if(this.lasG)this.lasG.gain.setTargetAtTime(v?0.045:0,this.ctx.currentTime,0.03);},
  blip(f=880,d=0.06,type='square',g=0.08){if(!this.ctx||!this.on)return;const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(),gn=this.ctx.createGain();o.type=type;o.frequency.value=f;
    gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(0.0001,t+d);
    o.connect(gn);gn.connect(this.master);o.start(t);o.stop(t+d+0.02);},
  step(){if(!this.ctx||!this.on)return;const t=this.ctx.currentTime;
    const s=this.ctx.createBufferSource();s.buffer=this.noiseBuf();
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1500;f.Q.value=1.2;
    const g=this.ctx.createGain();g.gain.setValueAtTime(0.05,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+0.1);},
  chime(){this.blip(880,0.25,'sine',0.1);setTimeout(()=>this.blip(1320,0.4,'sine',0.09),110);},
  pay(){[660,880,990,1320].forEach((f,i)=>setTimeout(()=>this.blip(f,0.12,'square',0.06),i*70));},
  clunk(){if(!this.ctx||!this.on)return;const t=this.ctx.currentTime;
    const s=this.ctx.createBufferSource();s.buffer=this.noiseBuf();
    const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=280;
    const g=this.ctx.createGain();g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+0.3);
    const o=this.ctx.createOscillator();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(45,t+0.2);
    const og=this.ctx.createGain();og.gain.setValueAtTime(0.25,t);og.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
    o.connect(og);og.connect(this.master);o.start(t);o.stop(t+0.3);},
  alarm(){[0,180,360].forEach(d=>setTimeout(()=>this.blip(220,0.14,'square',0.1),d));},
  ping(){if(!this.ctx||!this.on)return;const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(1400,t);o.frequency.exponentialRampToValueAtTime(420,t+0.4);
    const g=this.ctx.createGain();g.gain.setValueAtTime(0.09,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+0.5);},
  swell(){if(this.ambG){this.ambG.gain.setTargetAtTime(0.11,this.ctx.currentTime,0.5);this.ambG.gain.setTargetAtTime(0.05,this.ctx.currentTime+3,1.5);}}
};
