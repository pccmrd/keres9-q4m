// Demo driver for the 2036 engine — one Newtonian sandbox, two derelicts,
// destructible modules, loose salvage, an offline director whispering on cue.
import { R_MOON, MU } from './engine/orbit.js';
import { World } from './engine/world.js';
import { Entity } from './engine/entity.js';
import { generateShipModules } from './engine/modules.js';
import { Director } from './engine/director.js';
import { CargoItem } from './engine/cargo.js';
import { clamp, hyp, dir } from './engine/math.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
function resize() { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
addEventListener('resize', resize); resize();

const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault(); if (e.code === 'KeyR') resetDemo(); });
addEventListener('keyup', e => keys[e.code] = false);

const COL = { hull: '#1a2236', edge: '#3fd8ff', cockpit: '#16243f', reactor: '#332012', fuel: '#241a33', cargo: '#1c2b1c', hot: '#ffb02e', bad: '#ff4954', good: '#69f58c', salvage: '#ffb02e' };

let world = null, player = null, director = null, salvage = 0, camShake = 0;
const stars = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), b: Math.random() }));

function resetDemo() {
  world = new World({ seed: 2036 });
  salvage = 0; camShake = 0;
  // player: procedural tug in low circular orbit
  const r0 = R_MOON + 2200;
  const vCirc = Math.sqrt(MU / r0);
  const mods = generateShipModules('tug', 1337);
  player = new Entity({ pos: { x: r0, y: 0 }, vel: { x: 0, y: vCirc }, angle: Math.PI / 2, angVel: 0, modules: mods, kind: 'player', name: 'SECOND DEPOSIT' });
  world.add(player);
  // two procedural derelicts in crossing drift
  const d1mods = generateShipModules('derelict', 71);
  const p1 = { x: R_MOON * 1.9, y: R_MOON * 0.35 };
  world.add(new Entity({ pos: p1, vel: { x: 120, y: 95 }, angle: 2.2, angVel: 0.05, modules: d1mods, kind: 'derelict', name: 'MERIDIAN-3 (breakup)' }));
  const d2mods = generateShipModules('derelict', 993);
  const p2 = { x: R_MOON * 1.15, y: -R_MOON * 0.55 };
  world.add(new Entity({ pos: p2, vel: { x: 60, y: -140 }, angle: -0.8, angVel: -0.04, modules: d2mods, kind: 'derelict', name: 'HULK · TUG 88' }));
  // pre-seed loose salvage
  for (const e of world.entities) if (e.kind === 'derelict') for (let i = 0; i < 4; i++)
    world.loose.push({ pos: { x: e.pos.x + (Math.random() - 0.5) * 260, y: e.pos.y + (Math.random() - 0.5) * 260 }, vel: { x: e.vel.x * 0.98, y: e.vel.y * 0.98 }, spin: Math.random() * 6, item: new CargoItem('salvage'), step(dt, g) { this.vel.x += g.x * dt; this.vel.y += g.y * dt; this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; } });
  director = new Director({ seed: 2036, log: m => console.debug(m) });
  document.getElementById('banner').style.display = 'none';
}

function step(dt) {
  // keep simulating the world even after the player is gone (wreckage drifts on)
  if (!player || player.dead) { world.step(dt); return; }
  const ship = player;
  const mass = ship.mass;
  const thrust = ship.thrustAvailable();
  const A = thrust / mass;
  // rotation: A/D with mild damping (reaction wheels, not Newtonian purity — tractability)
  const torque = 3.2;
  if (keys['KeyA']) ship.angVel -= torque * dt;
  if (keys['KeyD']) ship.angVel += torque * dt;
  ship.angVel *= Math.max(0, 1 - 1.6 * dt);
  // main engine along the nose
  const nose = dir(ship.angle);
  if (keys['KeyW']) { ship.vel.x += nose.x * A * dt; ship.vel.y += nose.y * A * dt; }
  if (keys['KeyS']) { ship.vel.x -= nose.x * A * 0.6 * dt; ship.vel.y -= nose.y * A * 0.6 * dt; }
  // cannon
  cannonCd -= dt;
  if (keys['Space'] && cannonCd <= 0 && thrust !== undefined) {
    cannonCd = 0.22;
    const muzzle = { x: ship.pos.x + nose.x * 14, y: ship.pos.y + nose.y * 14 };
    world.fireBolt(muzzle, nose, 780, 16, false);
  }
  world.step(dt);
  // pickup loose salvage by proximity
  for (let i = world.loose.length - 1; i >= 0; i--) {
    const c = world.loose[i];
    if (hyp(c.pos.x - ship.pos.x, c.pos.y - ship.pos.y) < 26) { world.loose.splice(i, 1); salvage++; camShake = Math.min(1, camShake + 0.08); }
  }
  // splash damage events → camera shake
  for (const ev of world.events.splice(0)) if (ev.type === 'detonation' || ev.type === 'entity_destroyed') camShake = Math.min(1, camShake + 0.4);
  // Moon impact kills you
  const r = hyp(ship.pos.x, ship.pos.y);
  if (r <= R_MOON + 2) blowPlayer();
  // director
  const beat = director.update(world, ship);
  document.getElementById('director').textContent = beat ? '“' + beat.text + '”' : '';
}
let cannonCd = 0;
function blowPlayer() {
  if (player.dead) return;
  player.dead = true;
  world.spawnLooseFrom(player.explode(), player.pos, player.vel, 6);
  world.remove(player);
  document.getElementById('banner').style.display = 'block';
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#04060d'; ctx.fillRect(0, 0, W, H);
  camShake = Math.max(0, camShake - 0.03);
  const shx = (Math.random() - 0.5) * camShake * 14, shy = (Math.random() - 0.5) * camShake * 14;
  const cam = player && !player.dead ? { x: player.pos.x, y: player.pos.y, rot: -player.angle - Math.PI / 2, scale: 2.1 } : { x: 0, y: 0, rot: 0, scale: 0.022 };
  // stars
  for (const s of stars) { ctx.globalAlpha = 0.25 + s.b * 0.65; ctx.fillStyle = '#cfe6ff'; ctx.fillRect(s.x * W, s.y * H, s.b > 0.8 ? 2 : 1, s.b > 0.8 ? 2 : 1); }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(W / 2 + shx, H / 2 + shy);
  ctx.scale(cam.scale, cam.scale);
  ctx.rotate(cam.rot);
  ctx.translate(-cam.x, -cam.y);
  // Moon
  const mg = ctx.createRadialGradient(-R_MOON * 0.3, R_MOON * 0.3, R_MOON * 0.1, 0, 0, R_MOON * 1.06);
  mg.addColorStop(0, '#6d6252'); mg.addColorStop(0.55, '#3f3a30'); mg.addColorStop(1, '#0d0b08');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, R_MOON, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,168,130,.6)'; ctx.lineWidth = 14 / cam.scale; ctx.stroke();
  // loose salvage
  for (const c of world.loose) {
    ctx.save(); ctx.translate(c.pos.x, c.pos.y); ctx.rotate(c.spin || 0);
    ctx.fillStyle = 'rgba(255,176,46,.28)'; ctx.fillRect(-6, -7, 12, 14);
    ctx.strokeStyle = COL.salvage; ctx.lineWidth = 2; ctx.strokeRect(-6, -7, 12, 14);
    ctx.restore();
  }
  // entities as module graphs
  for (const e of world.entities) {
    for (const m of e.modules) {
      const wp = e.moduleWorldPos(m);
      const rr = m.def.r;
      const frac = clamp(m.hp / m.maxHp, 0, 1);
      ctx.beginPath(); ctx.arc(wp.x, wp.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = moduleColor(m.defId, frac); ctx.fill();
      ctx.strokeStyle = e.kind === 'player' ? COL.edge : 'rgba(255,73,84,.85)';
      ctx.lineWidth = 1.4; ctx.stroke();
      // damage scorch
      if (frac < 0.6) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(wp.x, wp.y, rr * (1 - frac), 0, Math.PI * 2); ctx.fill(); }
    }
    if (e.kind === 'player') { ctx.strokeStyle = COL.edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, 26, 0, Math.PI * 2); ctx.stroke(); }
  }
  // bolts
  for (const b of world.bolts) {
    ctx.strokeStyle = COL.hot; ctx.lineWidth = 2.4; ctx.shadowColor = COL.hot; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();
  // HUD
  if (player && !player.dead) {
    const r = hyp(player.pos.x, player.pos.y);
    const v = hyp(player.vel.x, player.vel.y);
    const hull = player.hull(), max = player.maxHull();
    setText('hAlt', Math.round(r - R_MOON) + ' m');
    setText('hSpd', v.toFixed(1) + ' m/s');
    setText('hHull', Math.round(hull / max * 100) + '%');
    setText('hMod', player.modules.length + '');
    document.getElementById('hHull').className = hull / max > 0.6 ? 'ok' : hull / max > 0.3 ? 'warn' : 'bad';
  }
  setText('hSalv', String(salvage));
}
function moduleColor(defId, frac) {
  const base = { hull: '#232c44', cockpit: '#1d2f52', reactor: '#3a2412', thruster: '#1f2f3f', fuel_tank: '#2c2140', cargo_bay: '#20301f', habitat: '#26204a', radiator: '#333', antenna: '#2a2a2a', laser: '#3a2a1a', hangar: '#23303a' }[defId] || '#233';
  return base;
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

resetDemo();
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
  acc += dt; const s = 1 / 60; let n = 0;
  while (acc >= s && n < 4) { step(s); acc -= s; n++; }
  render();
}
requestAnimationFrame(frame);
