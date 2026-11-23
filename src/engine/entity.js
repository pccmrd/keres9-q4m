// Entity — a physical object built from module instances.
// Total destruction model: hit points live on modules, modules are destroyed,
// the module graph is re-tested for connectivity, and disconnected groups
// separate into new free entities with conserved momentum. Volatile modules
// detonate and damage neighbours. Cargo bays that die spill their grid into space.

import { vec, localToWorld, clamp } from './math.js';
import { Module, MODULE_DEFS } from './modules.js';
import { CargoItem, CargoGrid } from './cargo.js';

let nextEntityId = 1;
export function resetEntityIds() { nextEntityId = 1; }

export class Entity {
  constructor({ pos, vel, angle = 0, angVel = 0, modules = [], kind = 'ship', name = 'object' }) {
    this.id = nextEntityId++;
    this.pos = { x: pos.x, y: pos.y };
    this.vel = { x: vel.x, y: vel.y };
    this.angle = angle; this.angVel = angVel;
    this.modules = modules;             // Module[]
    this.kind = kind; this.name = name;
    this.grids = new Map();             // moduleId -> CargoGrid
    this.dead = false;
    for (const m of this.modules) if (m.cargoHold) this.grids.set(m.id, new CargoGrid(m.cargoHold.w, m.cargoHold.h));
  }

  static fromModules(opts) { return new Entity(opts); }

  get mass() { return this.modules.reduce((s, m) => s + m.mass, 0) + this.cargoMass(); }
  cargoMass() { let m = 0; for (const g of this.grids.values()) m += g.totalMass(); return m; }
  maxHull() { return this.modules.reduce((s, m) => s + m.maxHp, 0); }
  hull() { return this.modules.reduce((s, m) => s + Math.max(0, m.hp), 0); }
  moduleWorldPos(m) { return localToWorld(this, m.offset); }
  velocityAt(worldPt) {
    // v_point = v_com + omega × r
    const rx = worldPt.x - this.pos.x, ry = worldPt.y - this.pos.y;
    return { x: this.vel.x - this.angVel * ry, y: this.vel.y + this.angVel * rx };
  }

  // nearest module whose world circle contains/overlaps the point; returns {module, d, dist}
  hitTest(worldPt) {
    let best = null;
    for (const m of this.modules) {
      const wp = this.moduleWorldPos(m);
      const d = Math.hypot(worldPt.x - wp.x, worldPt.y - wp.y);
      const rr = m.def.r;
      if (d <= rr) { const score = d / rr; if (!best || score < best.score) best = { module: m, score, point: wp }; }
    }
    return best;
  }

  // Apply damage at a world point. Returns events describing what happened.
  damageAt(worldPt, dmg, cause = 'impact') {
    const events = [];
    const hit = this.hitTest(worldPt);
    if (!hit) return events;
    const m = hit.module;
    const destroyed = m.damage(dmg);
    events.push({ type: 'hit', entity: this, module: m, dmg, cause });
    if (destroyed) {
      events.push({ type: 'module_destroyed', entity: this, module: m, cause });
      this._moduleDestroyed(m, events);
    }
    return events;
  }

  // Radius damage (explosions). Returns events.
  damageRadius(center, radius, dmg, cause = 'explosion') {
    const events = [];
    for (const m of [...this.modules]) {
      const wp = this.moduleWorldPos(m);
      const d = Math.hypot(center.x - wp.x, center.y - wp.y);
      if (d > radius + m.def.r) continue;
      const fall = clamp(1 - d / (radius + m.def.r), 0.15, 1);
      const destroyed = m.damage(dmg * fall);
      events.push({ type: 'hit', entity: this, module: m, dmg: dmg * fall, cause });
      if (destroyed) {
        events.push({ type: 'module_destroyed', entity: this, module: m, cause });
        this._moduleDestroyed(m, events);
      }
    }
    return events;
  }

  _moduleDestroyed(m, events) {
    // volatile modules cook off
    const vol = m.def.volatile;
    const wp = this.moduleWorldPos(m);
    if (vol) {
      events.push({ type: 'detonation', entity: this, module: m, at: wp, radius: vol * 0.14, dmg: vol });
    }
    // cargo bay dies -> its grid becomes loose items spawned by caller (needs world)
    if (this.grids.has(m.id)) {
      const grid = this.grids.get(m.id);
      const items = grid.clearAll();
      if (items.length) events.push({ type: 'cargo_spill', entity: this, module: m, items, at: wp, vel: this.velocityAt(wp) });
      this.grids.delete(m.id);
    }
  }

  // Remove dead modules, split the graph into connected components.
  // Returns array of NEW entities (the original may survive with fewer modules).
  splitApart() {
    const before = this.modules.length;
    // destroyed modules become persistent wreck entities (momentum is conserved:
    // nothing vanishes, it just stops being one ship).
    const deadMods = this.modules.filter(m => !m.alive);
    const wrecks = [];
    for (const m of deadMods) {
      const wp = this.moduleWorldPos(m);
      const v = this.velocityAt(wp);
      const wreck = new Entity({ pos: { x: wp.x, y: wp.y }, vel: { x: v.x, y: v.y }, angle: this.angle, angVel: this.angVel, modules: [m], kind: 'debris', name: m.def.name + ' (wreck)' });
      wreck.grids.delete(m.id); // no grid on the wreck itself; contents already spilled
      wrecks.push(wreck);
    }
    this.modules = this.modules.filter(m => m.alive);
    if (this.modules.length === 0) { this.dead = true; return wrecks; }
    if (this.modules.length === before) return [];

    const components = this._components();
    if (components.length <= 1) return [];

    // keep the largest (by mass) component as this entity; others become debris entities
    components.sort((a, b) => massOf(b) - massOf(a));
    const keep = components[0];
    const spawned = [];
    // spawn children FIRST so they can claim their cargo grids from this.grids
    for (const comp of components.slice(1)) spawned.push(this._spawnChild(comp));
    this.modules = keep;
    this._recenter();
    return spawned.concat(wrecks);
  }

  _components() {
    const mods = this.modules;
    const adj = new Map(mods.map(m => [m.id, []]));
    for (let i = 0; i < mods.length; i++)
      for (let j = i + 1; j < mods.length; j++) {
        const a = mods[i], b = mods[j];
        const lx = a.offset.x - b.offset.x, ly = a.offset.y - b.offset.y;
        if (Math.hypot(lx, ly) <= a.def.r + b.def.r + 0.9) { adj.get(a.id).push(b.id); adj.get(b.id).push(a.id); }
      }
    const seen = new Set(), comps = [];
    for (const m of mods) {
      if (seen.has(m.id)) continue;
      const comp = [], stack = [m]; seen.add(m.id);
      while (stack.length) { const cur = stack.pop(); comp.push(cur);
        for (const nid of adj.get(cur.id)) if (!seen.has(nid)) { seen.add(nid); stack.push(mods.find(mm => mm.id === nid)); } }
      comps.push(comp);
    }
    return comps;
  }

  // Create an Entity from a component group; conserves momentum by giving the
  // child the mass-weighted velocity of its modules' world points.
  _spawnChild(comp) {
    const total = comp.reduce((s, m) => s + m.mass, 0);
    let px = 0, py = 0, vx = 0, vy = 0;
    for (const m of comp) {
      const wp = this.moduleWorldPos(m);
      const v = this.velocityAt(wp);
      px += wp.x * m.mass; py += wp.y * m.mass; vx += v.x * m.mass; vy += v.y * m.mass;
      // angular momentum about origin of the child frame is recomputed after recentering
    }
    px /= total; py /= total; vx /= total; vy /= total;
    const child = new Entity({ pos: { x: px, y: py }, vel: { x: vx, y: vy }, angle: this.angle, angVel: this.angVel, modules: comp.slice(), kind: 'debris', name: this.name + ' (breakup)' });
    // offsets were anchored at the parent origin; re-express relative to the child COM
    for (const m of comp) {
      const wp = this.moduleWorldPos(m);
      const rel = vec.sub(wp, { x: px, y: py });
      const local = vec.rot(rel, -this.angle);
      m.offset = local;
    }
    // move grids that belonged to these modules
    for (const m of comp) if (this.grids.has(m.id)) { child.grids.set(m.id, this.grids.get(m.id)); this.grids.delete(m.id); }
    return child;
  }

  // after losing modules, shift origin to the new COM (world-preserving)
  _recenter() {
    const total = this.modules.reduce((s, m) => s + m.mass, 0);
    if (total <= 0) return;
    const com = this.modules.reduce((s, m) => ({ x: s.x + m.offset.x * m.mass / total, y: s.y + m.offset.y * m.mass / total }), { x: 0, y: 0 });
    if (Math.hypot(com.x, com.y) > 1e-9) {
      const dw = vec.rot(com, this.angle);
      this.pos.x += dw.x; this.pos.y += dw.y;
      for (const m of this.modules) { m.offset.x -= com.x; m.offset.y -= com.y; }
    }
  }

  criticalModules() { return this.modules.filter(m => m.def.critical); }
  criticalsDestroyed() { return this.criticalModules().every(m => !m.alive); }
  destructionFraction() { const max = this.maxHull(); return max > 0 ? 1 - this.hull() / max : 1; }

  // Whole entity destroyed: returns spilled items + position for FX
  explode() {
    this.dead = true;
    const items = [];
    for (const g of this.grids.values()) items.push(...g.clearAll());
    this.grids.clear();
    return items;
  }

  thrustAvailable() {
    return this.modules.filter(m => m.alive && m.def.thrust).reduce((s, m) => s + m.def.thrust, 0);
  }
  dryMass() { return Math.max(1, this.mass); }
}

function massOf(mods) { return mods.reduce((s, m) => s + m.mass, 0); }

// Loose item drifting in space (recoverable with EVA / tractor)
export class LooseItem {
  constructor(item, pos, vel) {
    this.id = item.id;
    this.item = item;
    this.pos = { x: pos.x, y: pos.y };
    this.vel = { x: vel.x, y: vel.y };
    this.spin = Math.random() * Math.PI * 2;
  }
  step(dt, gravity) { if (gravity) { this.vel.x += gravity.x * dt; this.vel.y += gravity.y * dt; } this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; }
  toJSON() { return { type: this.item.type, pos: { ...this.pos }, vel: { ...this.vel } }; }
}
