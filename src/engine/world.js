// World — owns entities, gravity wells, bolts and loose cargo.
// Semi-implicit Euler integration; bolts are gravity-affected; hits are
// resolved per-module; destruction (split/spill/explode) is routed here.

import { gravAccel, R_MOON, MU } from './orbit.js';
import { Entity, LooseItem } from './entity.js';
import { CargoItem } from './cargo.js';
import { dist, hyp, vec } from './math.js';

export class World {
  constructor({ seed = 1 } = {}) {
    this.seed = seed;
    this.t = 0;
    this.entities = [];
    this.loose = [];        // LooseItem[]
    this.bolts = [];
    this.particles = [];
    this.gravityWells = [{ pos: () => ({ x: 0, y: 0 }), mu: MU, surfaceRadius: R_MOON }];
    this.events = [];
  }

  add(entity) { this.entities.push(entity); return entity; }
  remove(entity) { const i = this.entities.indexOf(entity); if (i >= 0) this.entities.splice(i, 1); }

  gravityAt(p) {
    let ax = 0, ay = 0;
    for (const w of this.gravityWells) {
      const a = gravAccel(typeof w.pos === 'function' ? w.pos() : w.pos, w.mu, p);
      ax += a.x; ay += a.y;
    }
    return { x: ax, y: ay };
  }

  spawnLooseFrom(items, at, vel, spread = 2) {
    for (const it of items) {
      this.loose.push(new LooseItem(it, { x: at.x + (Math.random() - 0.5) * 3, y: at.y + (Math.random() - 0.5) * 3 },
        { x: vel.x + (Math.random() - 0.5) * spread, y: vel.y + (Math.random() - 0.5) * spread }));
    }
  }

  fireBolt(from, dirNorm, speed, damage, hostile = false) {
    this.bolts.push({ x: from.x, y: from.y, vx: dirNorm.x * speed, vy: dirNorm.y * speed, t: 0, life: 3.0, dmg: damage, hostile });
  }

  // damage entity at world point; routes destruction events; returns events for callers/UI
  damageEntity(entity, worldPt, dmg, cause) {
    const events = entity.damageAt(worldPt, dmg, cause);
    const children = entity.splitApart();
    for (const c of children) this.entities.push(c);
    this._settleEvents(entity, events);
    if (entity.dead) this.remove(entity);
    return events;
  }

  damageEntityRadius(entity, center, radius, dmg, cause) {
    const events = entity.damageRadius(center, radius, dmg, cause);
    const children = entity.splitApart();
    for (const c of children) this.entities.push(c);
    this._settleEvents(entity, events);
    if (entity.dead) this.remove(entity);
    return events;
  }

  _settleEvents(entity, events) {
    for (const ev of events) {
      if (ev.type === 'detonation') {
        // AoE damages the same entity and splashes into callers' other entities next step
        const aoe = this.damageEntityRadius(entity, ev.at, ev.radius, ev.dmg, 'detonation');
        events.push(...aoe);
      } else if (ev.type === 'cargo_spill') {
        this.spawnLooseFrom(ev.items, ev.at, ev.vel, 3);
        this.events.push(ev);
      } else if (ev.type === 'module_destroyed' && ev.module.def.critical) {
        const items = entity.explode();
        this.spawnLooseFrom(items, entity.pos, entity.vel, 5);
        this.events.push({ type: 'entity_destroyed', entity, at: { ...entity.pos } });
      }
    }
  }

  step(dt) {
    this.t += dt;
    // integrate loose items
    for (const c of this.loose) c.step(dt, this.gravityAt(c.pos));
    // integrate entities (semi-implicit Euler)
    for (const e of this.entities) {
      const g = this.gravityAt(e.pos);
      e.vel.x += g.x * dt; e.vel.y += g.y * dt;
      e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt;
      e.angle += e.angVel * dt;
    }
    // bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t += dt;
      if (b.t > b.life) { this.bolts.splice(i, 1); continue; }
      const g = this.gravityAt(b); b.vx += g.x * 0.35 * dt; b.vy += g.y * 0.35 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      // hit entities
      let dead = false;
      for (const e of [...this.entities]) {
        const hit = e.hitTest({ x: b.x, y: b.y });
        if (hit) {
          this.damageEntity(e, { x: b.x, y: b.y }, b.dmg, 'cannon');
          dead = true; break;
        }
      }
      // hit the Moon's surface
      if (!dead && Math.hypot(b.x, b.y) <= R_MOON) dead = true;
      if (dead) this.bolts.splice(i, 1);
    }
    // cleanup destroyed entities
    for (let i = this.entities.length - 1; i >= 0; i--) if (this.entities[i].dead) this.entities.splice(i, 1);
  }
}
