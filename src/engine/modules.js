import { mulberry32 as mulberry } from './math.js';

// Procedural module definitions & instances.
// Everything physical in the world — hulls, reactors, racks, radiators —
// is a module instance hung off an Entity. Modules carry mass, hitpoints,
// volume and (optionally) a cargo grid and capabilities.
export const MODULE_DEFS = {
  hull:        { name: 'Hull Segment',  mass: 420, hp: 120, r: 3.6, critical: false },
  cockpit:     { name: 'Cockpit',       mass: 130, hp: 70,  r: 2.4, critical: true  },
  reactor:     { name: 'Reactor Core',  mass: 260, hp: 80,  r: 2.6, critical: false, volatile: 90 },
  thruster:    { name: 'Main Thruster', mass: 190, hp: 70,  r: 2.2, critical: false, thrust: 3400 },
  fuel_tank:   { name: 'Fuel Tank',     mass: 160, hp: 60,  r: 2.4, critical: false, volatile: 140 },
  cargo_bay:   { name: 'Cargo Bay',     mass: 220, hp: 90,  r: 3.0, critical: false, hold: { w: 5, h: 3 } },
  habitat:     { name: 'Habitat Ring',  mass: 340, hp: 130, r: 3.4, critical: false },
  radiator:    { name: 'Radiator',      mass: 60,  hp: 30,  r: 2.0, critical: false },
  antenna:     { name: 'Array Antenna', mass: 45,  hp: 25,  r: 1.6, critical: false },
  laser:       { name: 'Mining Laser',  mass: 95,  hp: 50,  r: 1.8, critical: false },
  hangar:      { name: 'Docking Cradle',mass: 280, hp: 100, r: 3.0, critical: false },
};

let nextModuleId = 1;

export class Module {
  constructor(defId, offset) {
    const def = MODULE_DEFS[defId];
    if (!def) throw new Error('unknown module def: ' + defId);
    this.defId = defId;
    this.def = def;
    this.id = nextModuleId++;
    this.offset = { x: offset.x, y: offset.y };
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.cargoHold = def.hold ? def.hold : null; // filled by Entity as grid
  }
  get mass() { return this.def.mass; } // mass is invariant under damage — destruction must conserve momentum
  get alive() { return this.hp > 0; }
  damage(d) { this.hp -= d; return this.hp <= 0; }
  toJSON() {
    return { defId: this.defId, offset: { x: this.offset.x, y: this.offset.y }, hp: this.hp };
  }
}

export function moduleFromJSON(d) {
  const m = new Module(d.defId, d.offset);
  m.hp = d.hp;
  return m;
}

// Procedural ship generator: a walk from the cockpit, snapping modules onto
// open mount points with a seeded RNG. Returns an array of Modules offset
// in local coordinates. `recipe` selects a hull class.
export const RECIPES = {
  tug:      ['cockpit', 'reactor', 'thruster', 'fuel_tank', 'hull', 'hull', 'cargo_bay', 'radiator'],
  freighter:['cockpit', 'reactor', 'thruster', 'fuel_tank', 'fuel_tank', 'cargo_bay', 'cargo_bay', 'cargo_bay', 'hull', 'hull', 'hull', 'radiator'],
  liner:    ['cockpit', 'reactor', 'thruster', 'habitat', 'habitat', 'cargo_bay', 'cargo_bay', 'hull', 'hull', 'radiator', 'antenna'],
  derelict: ['hull', 'hull', 'reactor', 'fuel_tank', 'cargo_bay', 'radiator', 'antenna'],
};

export function generateShipModules(recipeName, seed) {
  const list = RECIPES[recipeName];
  if (!list) throw new Error('unknown recipe ' + recipeName);
  const rng = mulberry(seedFor(recipeName, seed));
  const modules = [];
  // deterministic layout: place along a spine with occasional flank pods
  let x = 0;
  for (let i = 0; i < list.length; i++) {
    const defId = list[i];
    const def = MODULE_DEFS[defId];
    let offset;
    if (defId === 'cockpit') offset = { x: 0, y: 0 };
    else {
      x += 3.1 + rng() * 1.2;
      const flank = rng() < 0.35 ? (rng() < 0.5 ? -1 : 1) : 0;
      offset = { x, y: flank * (def.r + 1.6) };
    }
    modules.push(new Module(defId, offset));
  }
  // center of mass at origin
  const total = modules.reduce((s, m) => s + m.mass, 0);
  const com = modules.reduce((s, m) => ({ x: s.x + m.offset.x * m.mass / total, y: s.y + m.offset.y * m.mass / total }), { x: 0, y: 0 });
  for (const m of modules) { m.offset.x -= com.x; m.offset.y -= com.y; }
  return modules;
}
function seedFor(recipe, seed) {
  let h = (seed >>> 0) || 1;
  for (let i = 0; i < recipe.length; i++) h = Math.imul(h ^ recipe.charCodeAt(i), 2654435761);
  return h >>> 0;
}
