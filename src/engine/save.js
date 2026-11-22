// Save/load — full round-trip of entities, their module graphs and cargo grids.
// Versioned: luna2036.engine.v2. (Legacy v1 saves of the prototype are not
// convertible — the module graph did not exist then.)
import { World } from './world.js';
import { Entity, LooseItem } from './entity.js';
import { Module, moduleFromJSON } from './modules.js';
import { CargoGrid, CargoItem } from './cargo.js';

export const ENGINE_SAVE_KEY = 'luna2036.engine.v2';

export function serializeWorld(world) {
  return JSON.stringify({
    v: 2, t: world.t, seed: world.seed,
    entities: world.entities.map(e => ({
      kind: e.kind, name: e.name,
      pos: { ...e.pos }, vel: { ...e.vel }, angle: e.angle, angVel: e.angVel,
      modules: e.modules.map(m => m.toJSON()),
      grids: [...e.grids].map(([moduleId, grid]) => ({ moduleIndex: e.modules.findIndex(m => m.id === moduleId), grid: grid.toJSON() })).filter(g => g.moduleIndex >= 0),
    })),
    loose: world.loose.map(l => l.toJSON()),
  });
}

export function deserializeWorld(json) {
  const d = JSON.parse(json);
  if (d.v !== 2) throw new Error('unsupported save version ' + d.v);
  const world = new World({ seed: d.seed ?? 1 });
  world.t = d.t || 0;
  for (const ed of d.entities) {
    const modules = ed.modules.map(moduleFromJSON);
    const e = new Entity({ pos: ed.pos, vel: ed.vel, angle: ed.angle, angVel: ed.angVel, modules, kind: ed.kind, name: ed.name });
    // Rebind cargo grids via explicit module indices captured at save time
    for (const gd of ed.grids) {
      const m = e.modules[gd.moduleIndex];
      if (m && m.cargoHold) e.grids.set(m.id, CargoGrid.fromJSON(gd.grid));
    }
    world.entities.push(e);
  }
  for (const ld of d.loose) {
    const item = new CargoItem(ld.type);
    world.loose.push(new LooseItem(item, ld.pos, ld.vel));
  }
  return world;
}

export function saveWorld(world, storage = globalThis.localStorage) {
  if (!storage) return false;
  storage.setItem(ENGINE_SAVE_KEY, serializeWorld(world));
  return true;
}
export function loadWorld(storage = globalThis.localStorage) {
  if (!storage) return null;
  const raw = storage.getItem(ENGINE_SAVE_KEY);
  return raw ? deserializeWorld(raw) : null;
}
