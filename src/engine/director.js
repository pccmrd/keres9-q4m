// Director — offline AI storyteller skeleton.
// NOT an LLM: a drama-management director that watches the world state and
// schedules beats along a tension arc. It never teleports the player; it
// acts on the world (spawn encounters, flags, NPC objectives) and narrates.
// Fully deterministic from (seed, worldT, flags) so saves are reproducible.

export class Director {
  constructor({ seed = 1, log = () => {} } = {}) {
    this.seed = seed;
    this.log = log;
    this.tension = 0.15;              // 0 calm .. 1 crisis
    this.beats = [];                  // fired beat records
    this.cooldowns = new Map();
    this.pending = null;              // current beat being delivered
    this.flags = {};
  }

  // world-scan predicates the director reasons over
  observe(world, playerEntity) {
    return {
      t: world.t,
      hullFraction: playerEntity ? playerEntity.hull() / Math.max(1, playerEntity.maxHull()) : 1,
      nearbyHostiles: 0,              // wired once combat entities register as hostile
      salvageLoose: world.loose.length,
      kind: playerEntity ? playerEntity.kind : 'none',
    };
  }

  // Called each frame; returns optional beat to deliver this tick (or null).
  // Skeleton: simple tension curve + cooldowns, deterministic.
  update(world, playerEntity) {
    const obs = this.observe(world, playerEntity);
    // tension rises when hull is low or salvage is at stake nearby
    this.tension = clamp01(0.15 + (1 - obs.hullFraction) * 0.5 + Math.min(0.3, obs.salvageLoose * 0.02));
    const candidate = this._pickBeat(obs);
    return candidate;
  }

  _pickBeat(obs) {
    // deterministic beat table; each entry: id, condition, text, cd (seconds)
    const TABLE = [
      { id: 'belt_stirs', cond: o => o.t > 20, cd: 240, text: 'The belt goes quiet. Even the debris listens.' },
      { id: 'derelict_whisper', cond: o => o.salvageLoose >= 3, cd: 180, text: 'Something glints in the drift — the belt pays those who look down.' },
      { id: 'hull_sings', cond: o => o.hullFraction < 0.45, cd: 90, text: 'The hull sings a lower note than she did this morning.' },
    ];
    const now = obs.t;
    for (const b of TABLE) {
      const last = this.cooldowns.get(b.id) ?? -Infinity;
      if (now - last >= b.cd && b.cond(obs)) {
        this.cooldowns.set(b.id, now);
        const beat = { id: b.id, text: b.text, tension: this.tension, t: now };
        this.beats.push(beat);
        this.log('[director] ' + b.id);
        return beat;
      }
    }
    return null;
  }
}
const clamp01 = v => Math.max(0, Math.min(1, v));
