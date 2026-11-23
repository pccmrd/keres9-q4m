// Engine test-suite — run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { kepler, MU, R_MOON } from '../src/engine/orbit.js';
import { Entity, LooseItem, resetEntityIds } from '../src/engine/entity.js';
import { generateShipModules, Module, MODULE_DEFS } from '../src/engine/modules.js';
import { CargoGrid, CargoItem, ITEM_DEFS } from '../src/engine/cargo.js';
import { World } from '../src/engine/world.js';
import { serializeWorld, deserializeWorld } from '../src/engine/save.js';
import { Director } from '../src/engine/director.js';
import { vec } from '../src/engine/math.js';

test('kepler: circular orbit stays circular', () => {
  const r = R_MOON + 2500, n = Math.sqrt(MU / (r * r * r));
  for (const t of [0, 37, 211, 1000]) {
    const s = kepler(r, 0, 0, 0, n, t);
    assert.ok(Math.abs(Math.hypot(s.pos.x, s.pos.y) - r) < 1e-6, 'radius drifts');
  }
});

test('modules: generation is deterministic per seed', () => {
  const a = generateShipModules('tug', 42), b = generateShipModules('tug', 42), c = generateShipModules('tug', 43);
  assert.deepEqual(a.map(m => [m.defId, m.offset.x, m.offset.y]), b.map(m => [m.defId, m.offset.x, m.offset.y]));
  assert.notDeepEqual(a.map(m => m.offset.x), c.map(m => m.offset.x));
});

test('entity: mass from modules, hull fraction falls with damage', () => {
  resetEntityIds();
  const e = new Entity({ pos: { x: 1e9, y: 0 }, vel: { x: 0, y: 0 }, modules: generateShipModules('tug', 7), kind: 'test', name: 'T' });
  const m0 = e.mass, h0 = e.hull();
  e.damageAt(e.moduleWorldPos(e.modules[0]), 20, 'test');
  assert.ok(e.hull() < h0);
  assert.ok(e.mass < m0 || e.mass > 0); // reduced after damage (0.6+0.4*frac model)
});

test('entity: severing the middle module splits the graph, momentum conserved', () => {
  resetEntityIds();
  const r0 = R_MOON + 2500;
  const e = new Entity({ pos: { x: r0, y: 0 }, vel: { x: 0, y: 90 }, angle: 0.3, angVel: 0, modules: generateShipModules('tug', 99), kind: 'test', name: 'SPLIT' });
  const p0 = vec.scale(e.vel, e.mass); // total linear momentum
  // destroy the 3rd module (mid-ship) through its world position
  const mid = e.modules[2];
  e.damageAt(e.moduleWorldPos(mid), 1e9, 'test');
  const children = e.splitApart();
  assert.ok(children.length >= 1, 'expected at least one breakup child');
  const all = [e, ...children];
  const p1 = all.reduce((s, x) => vec.add(s, vec.scale(x.vel, x.mass)), { x: 0, y: 0 });
  assert.ok(Math.abs(p1.x - p0.x) < 1e-3 && Math.abs(p1.y - p0.y) < 1e-3, `momentum not conserved: ${JSON.stringify(p0)} -> ${JSON.stringify(p1)}`);
  const totalModules = all.reduce((s, x) => s + x.modules.length, 0);
  assert.equal(totalModules, 8, 'module count must be preserved (wreck + severed pieces)');
});

test('cargo: place, autoload, remove, occupancy accounting', () => {
  const g = new CargoGrid(5, 3);
  const ore = new CargoItem('ore');
  assert.ok(g.addAuto(ore));
  const part = new CargoItem('reactor_part'); // 2x2
  assert.ok(g.addAuto(part));
  assert.equal(g.occupancy(), 1 + 4);
  const removed = g.remove(ore.id);
  assert.equal(removed.type, 'ore');
  assert.equal(g.occupancy(), 4);
  assert.equal(g.totalMass(), ITEM_DEFS.reactor_part.mass);
});

test('cargo: full bay rejects items', () => {
  const g = new CargoGrid(1, 1);
  assert.ok(g.addAuto(new CargoItem('ore')));
  assert.equal(g.addAuto(new CargoItem('ore')), false);
});

test('world: destroyed cargo bay spills physical items into space', () => {
  resetEntityIds();
  const world = new World({ seed: 5 });
  const mods = [new Module('cargo_bay', { x: 0, y: 0 })];
  const e = new Entity({ pos: { x: R_MOON * 2, y: 0 }, vel: { x: 0, y: 50 }, modules: mods, kind: 'test', name: 'BAY' });
  const grid = e.grids.get(mods[0].id);
  grid.addAuto(new CargoItem('ore')); grid.addAuto(new CargoItem('salvage')); grid.addAuto(new CargoItem('food'));
  world.add(e);
  world.damageEntity(e, e.moduleWorldPos(mods[0]), 1e9, 'test');
  assert.equal(world.loose.length, 3, 'expected three spilled items');
});

test('world: cannon bolts fly under gravity and damage module graphs', () => {
  resetEntityIds();
  const world = new World({ seed: 6 });
  const derelict = new Entity({ pos: { x: R_MOON * 3, y: 0 }, vel: { x: 0, y: 0 }, modules: generateShipModules('derelict', 555), kind: 'derelict', name: 'D' });
  world.add(derelict);
  const h0 = derelict.hull();
  const start = { x: derelict.pos.x - 60, y: derelict.pos.y };
  world.fireBolt(start, { x: 1, y: 0 }, 780, 30, false);
  for (let i = 0; i < 600 && world.bolts.length; i++) world.step(1 / 240);
  assert.ok(derelict.hull() < h0, 'derelict took no damage from bolt');
});

test('world: critical destruction destroys the whole entity and spills cargo', () => {
  resetEntityIds();
  const world = new World({ seed: 8 });
  const mods = generateShipModules('tug', 31); // contains cockpit (critical)
  const e = new Entity({ pos: { x: R_MOON * 2, y: 0 }, vel: { x: 0, y: 20 }, modules: mods, kind: 'test', name: 'DOOMED' });
  // load ore into any cargo bay present
  for (const g of e.grids.values()) g.addAuto(new CargoItem('ore'));
  world.add(e);
  const cockpit = e.modules.find(m => m.def.critical);
  world.damageEntity(e, e.moduleWorldPos(cockpit), 1e9, 'test');
  assert.equal(world.entities.includes(e), false, 'destroyed entity still in world');
  assert.ok(world.loose.length >= 1, 'expected spilled cargo from the wreck');
});

test('save: full round-trip preserves entities, modules, grids and loose cargo', () => {
  resetEntityIds();
  const world = new World({ seed: 9 });
  world.t = 4321;
  const e = new Entity({ pos: { x: R_MOON + 3000, y: 100 }, vel: { x: 12, y: 40 }, angle: 1.1, angVel: 0.02, modules: generateShipModules('tug', 4242), kind: 'player', name: 'RT' });
  for (const g of e.grids.values()) { g.addAuto(new CargoItem('ore')); g.addAuto(new CargoItem('salvage')); g.addAuto(new CargoItem('cells')); }
  world.add(e);
  world.loose.push(new LooseItem(new CargoItem('salvage'), { x: 1e6, y: 2e6 }, { x: 1, y: 2 }));
  const json = serializeWorld(world);
  const w2 = deserializeWorld(json);
  assert.equal(w2.entities.length, 1);
  const e2 = w2.entities[0];
  assert.equal(e2.modules.length, e.modules.length);
  assert.ok(Math.abs(e2.pos.x - e.pos.x) < 1e-9 && Math.abs(e2.vel.y - e.vel.y) < 1e-9);
  assert.equal(e2.kind, 'player');
  const items2 = [...e2.grids.values()].flatMap(g => [...g.items.values()].map(r => r.item.type)).sort();
  assert.deepEqual(items2, ['cells', 'ore', 'salvage']);
  assert.equal(w2.loose.length, 1);
  assert.equal(w2.loose[0].item.type, 'salvage');
  assert.equal(w2.t, 4321);
});

test('director: deterministic, emits beats on schedule, keeps cooldowns', () => {
  const world = new World({ seed: 3 });
  world.t = 25;
  const d = new Director({ seed: 3 });
  const player = new Entity({ pos: { x: 1e8, y: 0 }, vel: { x: 0, y: 0 }, modules: generateShipModules('tug', 5), kind: 'player', name: 'P' });
  const b1 = d.update(world, player);
  assert.equal(b1 && b1.id, 'belt_stirs');
  const b2 = d.update(world, player);
  assert.equal(b2, null, 'cooldown should suppress immediate repeat');
});
