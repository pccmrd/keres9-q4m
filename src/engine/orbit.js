// Orbital mechanics — Kepler analytic solver, ported from the prototype.
export const R_MOON = 6000, G0 = 1.62, MU = G0 * R_MOON * R_MOON;
export const R_HEAD = 12900, OMEGA = Math.sqrt(MU / (R_HEAD * R_HEAD * R_HEAD));

export function kepler(a, e, wp, M0, n, t) {
  const M = M0 + n * t; let E = M;
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const cE = Math.cos(E), sE = Math.sin(E), r = a * (1 - e * cE), f = Math.sqrt(MU * a) / r;
  const px = a * (cE - e), py = a * Math.sqrt(1 - e * e) * sE;
  const vx = -f * sE, vy = f * Math.sqrt(1 - e * e) * cE;
  const c = Math.cos(wp), s = Math.sin(wp);
  return { pos: { x: px * c - py * s, y: px * s + py * c }, vel: { x: vx * c - vy * s, y: vx * s + vy * c } };
}

// Inverse-square gravity at point p from a body at bodyPos.
export function gravAccel(bodyPos, bodyMu, p) {
  const dx = bodyPos.x - p.x, dy = bodyPos.y - p.y;
  const r2 = dx * dx + dy * dy; const r = Math.sqrt(r2);
  if (r < 1) return { x: 0, y: 0 };
  const a = bodyMu / r2;
  return { x: dx / r * a, y: dy / r * a };
}
