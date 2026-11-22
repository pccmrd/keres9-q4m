// LUNA 2036 — seeded RNG + vector math. No dependencies.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const hyp = (x, y) => Math.hypot(x, y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export const dir = a => ({ x: Math.cos(a), y: Math.sin(a) });

export const vec = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  len: a => Math.hypot(a.x, a.y),
  norm: a => { const l = Math.hypot(a.x, a.y); return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }; },
  rot: (a, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }; },
  perp: a => ({ x: -a.y, y: a.x }),
};

// Rotate a point in entity-local frame to world frame
export function localToWorld(entity, local) {
  const r = vec.rot(local, entity.angle);
  return { x: entity.pos.x + r.x, y: entity.pos.y + r.y };
}
export function worldToLocal(entity, world) {
  const d = vec.sub(world, entity.pos);
  return vec.rot(d, -entity.angle);
}
