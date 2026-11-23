// Physical cargo — items occupy grid cells inside a cargo bay.
// Mass is real (feeds entity inertia), volume is real (a bay holds exactly
// as much as its cells), and a breached bay spills its contents into space.

export const ITEM_DEFS = {
  ore:         { name: 'Regolith Ore',  w: 1, h: 1, mass: 45,  value: 30  },
  salvage:     { name: 'Salvage',       w: 1, h: 1, mass: 18,  value: 130 },
  food:        { name: 'Rations',       w: 1, h: 1, mass: 12,  value: 8   },
  cells:       { name: 'Power Cells',   w: 1, h: 2, mass: 25,  value: 60  },
  water:       { name: 'Water Ice',     w: 2, h: 1, mass: 38,  value: 25  },
  reactor_part:{ name: 'Reactor Part',  w: 2, h: 2, mass: 110, value: 900 },
  artifacts:   { name: 'Meridian Relic',w: 1, h: 1, mass: 5,   value: 5000 },
};

let nextItemId = 1;

export class CargoItem {
  constructor(type) {
    const def = ITEM_DEFS[type];
    if (!def) throw new Error('unknown item ' + type);
    this.id = nextItemId++;
    this.type = type;
    this.def = def;
  }
  get mass() { return this.def.mass; }
  toJSON() { return { type: this.type }; }
}

export class CargoGrid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cells = new Array(w * h).fill(null); // item id or null
    this.items = new Map();                    // id -> { item, x, y, rot }
  }
  _idx(x, y) { return y * this.w + x; }
  _footprint(item, x, y) {
    const p = [];
    for (let dy = 0; dy < item.def.h; dy++)
      for (let dx = 0; dx < item.def.w; dx++) p.push([x + dx, y + dy]);
    return p;
  }
  canPlace(item, x, y) {
    const cells = this._footprint(item, x, y);
    for (const [cx, cy] of cells) {
      if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return false;
      if (this.cells[this._idx(cx, cy)] !== null) return false;
    }
    return true;
  }
  place(item, x, y) {
    if (!this.canPlace(item, x, y)) return false;
    const cells = this._footprint(item, x, y);
    for (const [cx, cy] of cells) this.cells[this._idx(cx, cy)] = item.id;
    this.items.set(item.id, { item, x, y });
    return true;
  }
  addAuto(item) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.place(item, x, y)) return true;
    return false;
  }
  remove(id) {
    const rec = this.items.get(id);
    if (!rec) return null;
    const { item, x, y } = rec;
    for (const [cx, cy] of this._footprint(item, x, y)) this.cells[this._idx(cx, cy)] = null;
    this.items.delete(id);
    return item;
  }
  totalMass() { let m = 0; for (const { item } of this.items.values()) m += item.mass; return m; }
  totalValue() { let v = 0; for (const { item } of this.items.values()) v += item.def.value; return v; }
  clearAll() {
    const out = [...this.items.values()].map(r => r.item);
    this.cells.fill(null); this.items.clear(); return out;
  }
  occupancy() {
    let n = 0; for (const c of this.cells) if (c !== null) n++; return n;
  }
  toJSON() {
    return { w: this.w, h: this.h, items: [...this.items.values()].map(r => ({ item: r.item.toJSON(), x: r.x, y: r.y })) };
  }
  static fromJSON(d) {
    const g = new CargoGrid(d.w, d.h);
    for (const e of d.items) { const it = new CargoItem(e.item.type); g.place(it, e.x, e.y); }
    return g;
  }
  // ASCII render for tests & debug overlays ('.' empty, 'X' occupied)
  toAscii() {
    let out = '';
    for (let y = 0; y < this.h; y++) {
      let row = '';
      for (let x = 0; x < this.w; x++) row += this.cells[this._idx(x, y)] === null ? '.' : 'X';
      out += row + '\n';
    }
    return out;
  }
}
