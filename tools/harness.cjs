'use strict';
/* Headless smoke-test harness for the game.
   Loads an HTML file in jsdom, mocks canvas + WebAudio, starts a game,
   drives input/frames, and reports any runtime errors. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = process.argv[2];
const durationMs = parseInt(process.argv[3] || '6000', 10);
const script = process.argv[4] || ''; // optional extra scenario JS run in page context after start

function makeCtx() {
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: null,
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', globalAlpha: 1,
    globalCompositeOperation: 'source-over', shadowColor: '', shadowBlur: 0,
    lineCap: '', lineJoin: '', lineDash: [], filter: '',
    save() {}, restore() {}, scale() {}, rotate() {}, translate() {}, setTransform() {},
    resetTransform() {}, transform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
    rect() {}, quadraticCurveTo() {}, bezierCurveTo() {}, stroke() {}, fill() {}, clip() {},
    fillRect() {}, strokeRect() {}, clearRect() {}, arcTo() {},
    fillText() {}, strokeText() {},
    measureText(t) { return { width: (t ? String(t).length : 0) * 6 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    createPattern() { return { __pat: true }; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }; },
    putImageData() {}, drawImage() {},
    setLineDash(d) { this.lineDash = d || []; },
    getLineDash() { return this.lineDash; },
  };
  return ctx;
}

function makeAudioCtx() {
  const param = () => ({
    value: 0,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime() {}, cancelScheduledValues() {}, click() {},
  });
  const node = () => ({
    connect() {}, disconnect() {}, start() {}, stop() {},
    gain: param(), frequency: param(), detune: param(), Q: param(), pan: param(),
    type: '', buffer: null, loop: false, playbackRate: param(), onaudioprocess: null,
    attack: param(), release: param(), knee: param(), ratio: param(), threshold: param(), reduction: 0,
  });
  return {
    state: 'running', sampleRate: 44100, currentTime: 0, destination: node(),
    createGain: node, createOscillator: node, createBiquadFilter: node,
    createDynamicsCompressor: node, createBufferSource: node, createDelay: node,
    createStereoPanner: node, createAnalyser: node, createWaveShaper: node,
    createConvolver: node, createIIRFilter: node,
    createBuffer(ch, len, rate) {
      const data = new Float32Array(len);
      return { numberOfChannels: ch, length: len, sampleRate: rate, duration: len / rate,
        getChannelData() { return data; }, copyFromChannel() {}, copyToChannel() {} };
    },
    resume() { return Promise.resolve(); }, suspend() { return Promise.resolve(); }, close() { return Promise.resolve(); },
  };
}

const errors = [];
const warnings = [];
const { VirtualConsole } = require('jsdom');
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  if (/Not implemented|Could not parse CSS/.test(e.message || '')) { warnings.push(e.message); return; }
  errors.push('jsdomError: ' + (e.stack || e.message));
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => { const m = a.join(' '); if (!/Not implemented|Could not parse CSS/.test(m)) warnings.push(m); });

async function main() {
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Inline external module scripts in order so jsdom runs them as classic scripts,
  // mirroring browser behaviour for multi-file game modules.
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const full = path.resolve(path.dirname(htmlPath), src);
    const code = fs.readFileSync(full, 'utf8');
    return '<script>\n' + code.replace(/<\/script>/g, '<\\/script>') + '\n</script>';
  });
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = function () {
        if (!this.__ctx) { this.__ctx = makeCtx(); this.__ctx.canvas = this; }
        return this.__ctx;
      };
      window.AudioContext = window.webkitAudioContext = function () { return makeAudioCtx(); };
      window.localStorage.__proto__.setItem = function (k, v) { this['__' + k] = String(v); };
      window.localStorage.__proto__.getItem = function (k) { return this['__' + k] ?? null; };
      window.localStorage.__proto__.removeItem = function (k) { delete this['__' + k]; };
      window.addEventListener('error', e => {
        errors.push('window.onerror: ' + (e.error && e.error.stack || e.message));
      });
      window.addEventListener('unhandledrejection', e => {
        errors.push('unhandledrejection: ' + (e.reason && e.reason.stack || e.reason));
      });
    },
  });

  const win = dom.window;
  const origError = win.console.error;
  win.console.error = (...args) => {
    const msg = args.map(a => (a && a.stack) || String(a)).join(' ');
    if (/Not implemented|Could not parse CSS|Error: Not implemented/.test(msg)) { warnings.push(msg); return; }
    errors.push('console.error: ' + msg);
    origError.apply(win.console, args);
  };
  const origWarn = win.console.warn;
  win.console.warn = (...args) => {
    const msg = args.map(a => String(a)).join(' ');
    if (/Not implemented|Could not parse CSS/.test(msg)) { warnings.push(msg); return; }
    warnings.push('console.warn: ' + msg);
  };

  // Inline scripts already executed by jsdom during parse (runScripts: 'dangerously').
  // Catch any parse-time errors reported via jsdom virtual console:
  for (const w of warnings.slice()) { /* placeholder */ }

  const $ = id => win.document.getElementById(id);
  const tick = ms => new Promise(r => setTimeout(r, ms));

  // Wait a few frames for boot
  await tick(150);

  // Title screen visible?
  const title = $('mTitle');
  const titleShown = title && !title.classList.contains('hidden');
  console.log('title shown:', titleShown);

  // Start the game
  try {
    $('btnStart').click();
  } catch (e) { errors.push('btnStart click: ' + (e.stack || e.message)); }
  await tick(200);

  // Helper to dispatch keys
  function key(type, code, opts = {}) {
    const ev = new win.KeyboardEvent(type, { code, key: opts.key || code, bubbles: true, cancelable: true, ...opts });
    win.dispatchEvent(ev);
  }
  function keySequence(codes, holdMs = 100) {
    return (async () => {
      for (const c of codes) { key('keydown', c); }
      await tick(holdMs);
      for (const c of [...codes].reverse()) { key('keyup', c); }
    })();
  }

  // Scenario A: walk east
  await keySequence(['KeyD'], 800);
  await tick(200);

  // Scenario B: jump
  key('keydown', 'KeyW'); await tick(150); key('keyup', 'KeyW');
  await tick(400);

  // Scenario C: ping, target cycle, camera, actions
  for (const k of ['KeyR', 'KeyT', 'KeyV', 'Digit1', 'Digit2', 'Digit3', 'KeyF', 'KeyB', 'KeyC', 'KeyJ', 'KeyL']) {
    key('keydown', k); key('keyup', k);
    await tick(80);
  }
  await key('keydown', 'Escape'); key('keyup', 'Escape');
  await tick(150);
  // close pause if open
  if ($('mPause') && !$('mPause').classList.contains('hidden')) { $('btnResume').click(); await tick(100); }

  // Open journal / manual / chart and close
  try {
    $('btnJournal').click(); await tick(150);
    win.eval('renderManual && 0');
    $('btnJournalX').click(); await tick(80);
    $('btnChart').click(); await tick(250);
    $('btnChartX').click(); await tick(80);
  } catch (e) { errors.push('modal flow: ' + (e.stack || e.message)); }

  // Scenario D: ride the lift via direct context action (walk to lift first is slow; call rideLift)
  try {
    win.eval("if(W.player.mode==='foot'){W.player.ma=W.liftMA+W.moon.angle; W.player.pos=surfacePoint(W.player.ma);}");
    await tick(100);
    key('keydown', 'KeyF'); key('keyup', 'KeyF');
    await tick(300);
  } catch (e) { errors.push('lift: ' + (e.stack || e.message)); }

  // Scenario E: run arbitrary extra scenario (may be async — await its promise)
  if (script) {
    try {
      const r = win.eval(script);
      if (r && typeof r.then === 'function') await r;
      const slog = win.eval('window.__scenarioLog || []');
      if (Array.isArray(slog)) slog.forEach(l => console.log('  SCEN:', l));
    } catch (e) { errors.push('scenario: ' + (e.stack || e.message)); }
    await tick(500);
  }

  // Let the sim run
  const steps = Math.max(1, Math.floor(durationMs / 250));
  for (let i = 0; i < steps; i++) {
    await tick(250);
    if (i === Math.floor(steps / 2)) {
      // move around some more mid-run
      key('keydown', 'KeyA'); await tick(300); key('keyup', 'KeyA');
    }
  }

  // Query some state
  let stateInfo = {};
  try {
    stateInfo = win.eval(`JSON.stringify({
      started, mode: W.player.mode, pos: {x:+W.player.pos.x.toFixed(1), y:+W.player.pos.y.toFixed(1)},
      credits: S.credits, t: +W.t.toFixed(1), particles: W.particles.length,
      ships: W.ships.length, bodies: W.bodies.length, dead: W.player.dead,
      logCount: logs.length, cam: {x:+W.cam.x.toFixed(0), y:+W.cam.y.toFixed(0), scale:+W.cam.scale.toFixed(3)}
    })`);
  } catch (e) { errors.push('state query: ' + (e.stack || e.message)); }
  console.log('state:', stateInfo);

  // Save / load round trip
  try {
    win.eval('save()');
    const raw = win.eval("localStorage.getItem('luna2035.prospector.v1')");
    console.log('save bytes:', raw ? raw.length : 0);
    win.eval('load()');
    await tick(300);
    console.log('load ok');
  } catch (e) { errors.push('save/load: ' + (e.stack || e.message)); }

  await tick(500);

  console.log('--- RESULTS ---');
  console.log('errors:', errors.length);
  errors.slice(0, 30).forEach(e => console.log('  ERR:', e.split('\n').slice(0, 4).join(' | ')));
  if (warnings.length) console.log('warnings(suppressed-not-implemented):', warnings.length);

  const unique = [...new Set(errors)];
  try { fs.writeFileSync(require('path').join(__dirname, 'last-errors.json'), JSON.stringify({ errors: unique, warnings: warnings.slice(0, 50) }, null, 2)); } catch (e) { /* best effort diagnostics */ }
  win.close();
  process.exit(unique.length ? 1 : 0);
}

main().catch(e => { console.error('HARNESS FAIL', e); process.exit(2); });
