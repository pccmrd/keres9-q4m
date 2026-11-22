# LUNA 2035 // PROSPECTOR

A 2D Newtonian space-simulation game for the browser. Trade commodities between
factions, mine ore off asteroids and hulks, explore a living Kepler-solved solar
system, fight corsair marauders in EVA or from the helm, and scavenge the belt for
salvage. Every body orbits under real inverse-square gravity — you inherit every
rustle of momentum the Moon gives you.

## Run it

No build step. Serve the folder and open `index.html`:

```sh
python3 -m http.server 8080
# open http://localhost:8080/
```

Or just open `index.html` from disk — everything is plain HTML/CSS/JS.

## The game

- **Trade** — haul ore between Tianque (Taoyuan), Armstrong (Armstrong), Helion
  intake and passing freighters. Demand, prices and faction standing all move.
- **Mine** — cut ore nodes with the mining laser (M / SPACE). Foot-cutting yields
  chunks you carry; ship-cutting fills the hold.
- **Explore** — the Moon, rocks, comets (including the rogue Vesper) and two
  derelict hulks ride Kepler orbits. Tune their resonances with the array (C) to
  build the catalog and get paid.
- **Combat** — corsairs haunt the hulks and debris swarms. They prowl, lead their
  shots, and remember being shot at. Your hull (or your suit) is all that keeps
  you alive out there.
- **Scavenge** — destroyed corsairs and the belt itself drop salvage canisters
  (130¢ each; ship tractors reel them in from 70 m).

See the in-game Manual (press **J** then the MANUAL tab) for full systems.

## Architecture

Single-page browser game; simulation in fixed-step (60 Hz) classic-script modules,
split by domain under `js/` and loaded in dependency order by `index.html`:

| Module | Domain |
| --- | --- |
| `js/config.js` | constants (gravity, Moon radius, MU), math helpers, palette |
| `js/audio.js` | WebAudio synth (engine, laser, UI, payouts) |
| `js/state.js` | save-shaped game state (`newState()`), logs, ground geometry |
| `js/world.js` | world construction — orbits (analytic Kepler), bases, rocks, traffic seeding |
| `js/traffic.js` | port queues, berth reservation, NPC ship AI, docked/free flight |
| `js/player.js` | the suit & the helm — walk/air/EVA/boots/lift/pilot modes, suit damage |
| `js/systems.js` | mining, array scan tuning, particles, robots, chunks |
| `js/combat.js` | corsair AI, cannon, bolts, salvage canisters |
| `js/story.js` | the plot — Meridian-3 key, five endings |
| `js/dialogue.js` | NPC conversations and choices |
| `js/economy.js` | prices, demand, selling, faction payouts |
| `js/input.js` | keyboard/mouse/touch → actions, `held.*` fire state |
| `js/ui.js` | panels, manual, journal, station screens, diagnostics |
| `js/render.js` | canvas renderer — bodies, ships, effects, flight-aid prediction |
| `js/hud.js` | flight readouts, clamp gates, objective ticker |
| `js/save.js` | localStorage persistence (`luna2035.prospector.v1`) |
| `js/loop.js` | fixed-step simulation loop + render pump |
| `js/boot.js` | title screen, new game, wiring |

`keres9-q4m.html` is the original single-file prototype, kept for reference.

### Newtonian core

- Kepler problemetix orbits solved analytically (`kepler()` in `js/config.js`);
  station-keeping is match-velocity, not position.
- Inverse-square gravity everywhere: `g = MU / r²`, MU derived from the Moon's
  spin and radius. Cannon bolts are affected (×0.35), salvage and ore chunks too.
- The ship prediction aid integrates your current state vector forward 33 s and
  dots it across the void; it flags impact with the surface and closest approach
  to the targeted body.

### Testing

Headless smoke + gameplay scenarios run under jsdom (no browser needed):

```sh
npm install        # pulls jsdom (dev-only; the game itself has no dependencies)
npm test           # headless deep scenario
```

`tools/harness.js` loads `index.html` in jsdom, mocks canvas/WebAudio, starts a
game and drives input frames; `tools/scenario-deep.js` asserts the full loop —
lift, shift signing, shuttle, mining, beacon deposit, tug purchase, Newtonian
burn, EVA, clamp gates, ore sale, journal, save/load, narrative, death/recovery,
plus corsair seeding, cannon damage, the kill→salvage→collect cycle — 40+
assertions, no browser required.

## LUNA 2036 // NEW ENGINE (in progress)

A ground-up engine rehaul, built **inside this repo** on the same Newtonian core.
The classic 2035 game stays at `index.html`; the new engine and its playable
skeleton live at **`engine.html`**. Plain ES modules, no build step, no deps.

```sh
npm run start   # serve, then open http://localhost:8080/engine.html
npm test        # 11 engine tests (orbit, modules, destruction, cargo, save, director)
npm run test:game  # legacy 2035 jsdom gameplay scenario (40 assertions)
```

### What exists today (engine skeleton)

- **Modules as first-class objects** — every ship/station/hulk is a graph of
  module instances (cockpit, reactor, thruster, fuel tank, cargo bay, radiator…).
  Each module has mass, HP and a world-space collision circle (`src/engine/modules.js`).
- **Total destruction** — damage is applied per-module; dead modules become
  persistent **wreck entities** (nothing vanishes, momentum is conserved exactly).
  When the module graph disconnects, the parent **splits into real breakup
  entities** with mass-weighted momentum. Volatile modules (reactor, fuel tank)
  detonate AoE on destruction; killing a critical module destroys the entity and
  spills its cargo (`src/engine/entity.js`, `src/engine/world.js`).
- **Physical cargo** — items occupy real grid cells (`CargoGrid`); a bay holds
  exactly its cells; a destroyed bay **spills its contents as loose, drifting
  items** in space (`src/engine/cargo.js`).
- **Newtonian flight** — inverse-square gravity, semi-implicit Euler integration,
  gravity-bent cannon bolts (`src/engine/orbit.js`, `src/engine/world.js`).
- **Procedural ships** — seeded generator builds module layouts from hull-class
  recipes (`tug`, `freighter`, `liner`, `derelict`) — every vessel is unique but
  reproducible (`src/engine/modules.js`).
- **Save round-trip** — entities, module graphs, cargo grids and loose items
  serialize to `luna2036.engine.v2` (`src/engine/save.js`).
- **Offline Director skeleton** — a deterministic drama-management storyteller
  (tension model, beat cooldowns) — NOT an LLM; lives in `src/engine/director.js`.
- **Playable demo** — `engine.html`: fly a procedural tug in Luna orbit, orbit
  two derelicts, blow them apart, collect the spilled salvage.

### Known limits / not built yet (next pillars)

- Interiors (walkable station/ship/cave rooms, airlocks, interactables)
- EVA ΔV economics near the surface (jetpack-to-orbit exploit fix)
- Interior/exterior transitions; NPC/crew inside interiors
- Director wired to game events (currently passive narration hints only)
- The 2035 renderer screen-flicker issue (unaddressed — render pipeline audit pending)
- Breakup child entities keep the parent's angular velocity (linear momentum is
  conserved exactly; angular momentum is approximated)
- Legacy v1 saves are not migrated (module graph did not exist)

### Layout

```
src/engine/   math.js orbit.js modules.js cargo.js entity.js world.js save.js director.js
src/demo.js   engine.html demo driver
tools/        engine.test.mjs (new) · harness.cjs + scenario-deep.js (2035 regression)
```
