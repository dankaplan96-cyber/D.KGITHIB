// LAZY-REGIONS: the areas away from Citadel are built the first time they are needed, not all at startup.
//
// Citadel (the title's backdrop) is built at startup, with Twinsen's house and the well (the new game's opening) and
// the area a saved game stands in. Every other area — the Zeelich islands, the interiors, Zeelich, Desert Island, the
// Hamalayi, the underground — is a GROUP here, built the first time something needs it and kept afterwards (nothing
// is released: docs/lba3-performance/LAZY_REGIONS.md has the heap figures).
//
// Lifecycle of a group: unloaded → loading → ready (built, hidden) → active (the scene on screen) → cached (left,
// kept). A build that throws is 'failed' (its rooms stay missing; the caller says so and keeps the player where he is).
//
// CONTRACT
//   regions.rooms              what game.rooms is: a room by id, built on first access ('access': a synchronous build,
//                              recorded in regions.log with where it came from); `id in rooms` is true for every known
//                              room, built or not; Object.keys/values/entries list the built ones only
//   regions.has(id)            a room that exists in this build (built or not), without building it
//   regions.built(id)          the room if built, else undefined (never builds)
//   regions.ensure(id, why)    builds the room's group now if needed; returns the room
//   regions.buildAsync(ids, why, step)   builds the groups the rooms need, awaiting step(i, n, group, estMs) before each
//                              one (the loading card paints there)
//   regions.peek(fn)           runs fn with unbuilt rooms reading as undefined (nothing is built)
//   regions.probe(fn)          as peek, and returns { value | error, misses: Set of the unbuilt room ids fn asked for }
//   regions.whenBuilt(id, fn)  fn(room) now if built, else right after its group is built (cleared by clearWaits)
//   regions.summary()          which groups were built at startup, which later (and why), which are not built
import { INTERIOR_BUILDERS } from './interiors.js';
import { buildZeelich } from './zeelich.js';
import { buildUnderground } from './underground.js';
import { buildDesert } from './desert.js';
import { buildCondenser } from './condenser.js';
import { buildTemple } from './temple.js';
import { WIZARD_ROOMS } from './wizards.js';
import { buildLba1Asylum, buildLba1Temple, hasLba1Room } from './lba1places.js';
import { buildHamalayi } from './hamalayi.js';
import { buildObsRoom } from './obsroom.js';
import { buildUpper3 } from './upper.js';
import { buildValveRoom } from './valveroom.js';
import { buildArena } from './arena.js';
import { ISLES, hasIsland, buildIsle } from './zislands.js';

// Reference build times (ms, the development container, SwiftShader, quiet machine): only the loading card's pace,
// scaled by how fast this computer built Citadel (Regions.speed). A wrong guess only makes the bar's pace uneven.
const REF = { house: 450, well: 80, office: 100, projoffice: 110, control: 90, workshop: 180, lighttop: 140, cellar: 70,
  zeelich: 800, underground: 400, desert: 700, condenser: 30, butemple: 30, wtent: 20, school: 30, asylum: 150, bumaze: 170,
  hamalayi: 600, obsv: 15, upper: 350, valves: 20, arena: 10, isle_otringal: 600, isle_knartas: 300, isle_mosquibee: 260,
  isle_celebration: 160, isle_undergas: 320, isle_cxislet: 80, isle_platform: 180, isle_liftdock: 120, isle_tralu: 290,
  isle_orchard: 230, isle_oldwatch: 90, isle: 250 };
// Where each room stands (its group's origin; an interior's centre where it differs), known before it is built: for
// data-only questions such as "which scene is this point in" (regions.sceneOf; the tests' harness). Checked against
// the built room in regions.buildGroup (a mismatch is a console warning).
const AT = { house: [1000, 0], well: [1100, 0], office: [1200, 0], projoffice: [1300, 0], control: [1400, 0], workshop: [1500, 0],
  lighttop: [1600, 0], cellar: [1700, 0], c3shaft: [1799.2, -1], c3deep: [1899.4, -0.8], c3gallery: [1998, -2], c3sendell: [2100, 0],
  c3core: [2199, -1], condA: [3700, 0], condB: [3760, 0], butemple: [3830, 0], wtent: [5400, 0], school: [5600, 0], asylum: [7000, 0],
  bumaze: [7200, 0], buhalls: [7400, 0], obsv: [4600, 0], upper: [4800, 0], council: [4850, 0], archive: [4900, 0], valves: [5000, 0],
  arena: [6200, 0] };
const OUT_AT = { zeelich: [2400, 0], desert: [3400, 0], hamalayi: [4300, 0] };
const isleAt = (id) => { const i = ISLES.indexOf(id.slice(5)); return i >= 0 ? [1900 + i * 330, 1800] : null; };
export const CITADEL_REF = 5200;   // (Citadel's own build, the same machine)

// The areas a chapter's own code works in while it is the chapter in progress (its cast's spots, its doors, its
// updates): built behind the black of the scene change that starts the chapter, and behind the loading screen when a
// save in that chapter is loaded. (Anything else is built when the player goes there; a room read before it is built
// is built on the spot and recorded in regions.log with where it was read: tests/stability.mjs lists them.)
export const CHAPTER_AREAS = {
  well: ['house', 'well'],
  project: ['office', 'control', 'projoffice'],
  zeelich: ['zeelich', 'workshop', 'lighttop'],
  shell: ['c3shaft'],
  core: ['c3core'],
  dig: ['desert', 'butemple'],
  steam: ['desert', 'condA'],
  pass: ['hamalayi'],
  observatory: ['hamalayi', 'obsv'],
  evacuation: [],
  council: ['zeelich', 'upper', 'workshop'],
  network: ['zeelich', 'desert', 'hamalayi', 'valves', 'lighttop', 'obsv', 'workshop'],
  home: ['house'],
};

function groupDefs() {
  const G = [];
  const add = (id, rooms, build) => G.push({ id, rooms, build, ref: REF[id] ?? (id.startsWith('isle_') ? REF.isle : 200) });
  for (const [id, fn] of Object.entries(INTERIOR_BUILDERS)) add(id, [id], (S, P) => ({ [id]: fn(S, P) }));
  add('zeelich', ['zeelich'], (S, P) => ({ zeelich: buildZeelich(S, P) }));
  add('underground', ['c3shaft', 'c3deep', 'c3gallery', 'c3sendell', 'c3core'], buildUnderground);
  add('desert', ['desert'], (S, P) => ({ desert: buildDesert(S, P) }));
  add('condenser', ['condA', 'condB'], buildCondenser);
  add('butemple', ['butemple'], buildTemple);
  for (const [id, fn] of Object.entries(WIZARD_ROOMS)) add(id, [id], (S, P) => ({ [id]: fn(S, P) }));
  if (hasLba1Room('asylum')) add('asylum', ['asylum'], buildLba1Asylum);
  const bu = ['bumaze', 'buhalls'].filter(hasLba1Room);
  if (bu.length) add('bumaze', bu, buildLba1Temple);
  add('hamalayi', ['hamalayi'], (S, P) => ({ hamalayi: buildHamalayi(S, P) }));
  add('obsv', ['obsv'], buildObsRoom);
  add('upper', ['upper', 'council', 'archive'], buildUpper3);
  add('valves', ['valves'], (S, P) => ({ valves: buildValveRoom(S, P) }));
  add('arena', ['arena'], (S, P) => ({ arena: buildArena(S, P) }));
  for (const n of ISLES) if (hasIsland(n)) add('isle_' + n, ['isle_' + n], (S, P) => ({ ['isle_' + n]: buildIsle(S, P, n) }));
  return G;
}

export class Regions {
  // onBuilt(groupId, rooms, why): after a group is built (the game hooks the story, travel, actors… there); then the
  // whenBuilt waits run; then afterBuilt(groupId, rooms, why) (set by the game: the cast is placed again)
  constructor(scene, physics, onBuilt) {
    this.S = scene; this.P = physics; this.onBuilt = onBuilt;
    this.rooms_ = {};             // built rooms by id
    this.groups = new Map();      // group id → { id, rooms, build, ref, state, ms, why, phase, stack }
    this.of = new Map();          // room id → group id
    for (const d of groupDefs()) { this.groups.set(d.id, { ...d, state: 'unloaded', ms: 0, why: null, phase: null }); for (const r of d.rooms) this.of.set(r, d.id); }
    this.mode = 'auto';           // 'auto' builds on access; 'peek' and 'probe' read unbuilt rooms as undefined
    this.misses = null;
    this.waits = new Map();       // room id → [fn] (whenBuilt)
    this.log = [];                // every build: { group, ms, why, phase, at }
    this.phase = 'startup';       // 'startup' until the title shows, then 'play'
    this.speed = 1;               // this computer's build time against the reference (the loading card's pace)
    this.active = null;
    const self = this;
    this.rooms = new Proxy(this.rooms_, {
      get(t, k) {
        if (typeof k !== 'string' || k in t || !self.of.has(k)) return t[k];
        if (self.mode !== 'auto') { self.misses?.add(k); return undefined; }
        self.ensure(k, 'access');
        return t[k];
      },
      has(t, k) { return k in t || self.of.has(k); },
    });
  }
  has(id) { return id in this.rooms_ || this.of.has(id); }
  built(id) { const r = this.rooms_[id]; if (!r && this.mode === 'probe' && this.of.has(id)) this.misses?.add(id); return r; }
  groupOf(id) { return this.of.get(id) ?? null; }
  stateOf(id) { return this.groups.get(this.of.get(id) ?? id)?.state ?? (id in this.rooms_ ? 'ready' : null); }
  // the groups the rooms need that are not built yet (in the order asked)
  missing(ids) {
    const out = [];
    for (const id of ids) { const g = this.of.get(id); if (g && !(id in this.rooms_) && this.groups.get(g).state === 'unloaded' && !out.includes(g)) out.push(g); }
    return out;
  }
  estimate(gid) { return Math.round((this.groups.get(gid)?.ref ?? 200) * this.speed); }

  peek(fn) { const m = this.mode; this.mode = this.mode === 'probe' ? 'probe' : 'peek'; try { return fn(); } finally { this.mode = m; } }
  probe(fn) {
    const m = this.mode, ms = this.misses, mine = new Set();
    this.mode = 'probe'; this.misses = mine;
    try { return { value: fn(), misses: mine }; } catch (error) { return { error, misses: mine }; } finally { this.mode = m; this.misses = ms; if (ms) for (const k of mine) ms.add(k); }
  }

  ensure(id, why = 'ensure') {
    if (id in this.rooms_) return this.rooms_[id];
    const g = this.of.get(id);
    if (g) this.buildGroup(g, why);
    return this.rooms_[id];
  }
  ensureAll(why = 'all') { for (const g of this.groups.keys()) this.buildGroup(g, why); }
  async buildAsync(ids, why, step) {
    const list = this.missing(ids);
    for (let i = 0; i < list.length; i++) {
      if (this.groups.get(list[i]).state !== 'unloaded') continue;   // (built meanwhile)
      await step?.(i, list.length, list[i], this.estimate(list[i]));
      this.buildGroup(list[i], why);
    }
    return list;
  }
  buildGroup(gid, why) {
    const G = this.groups.get(gid);
    if (!G || G.state !== 'unloaded') return false;
    G.state = 'loading';
    const t0 = performance.now(), S = this.S, n0 = S.children.length, m = this.mode;
    this.mode = 'peek';   // (a builder never builds another area)
    let rooms;
    try { rooms = G.build(S, this.P) || {}; }
    catch (e) { G.state = 'failed'; G.error = String(e?.message || e); this.mode = m; console.warn('region build failed', gid, e); throw e; }
    this.mode = m;
    for (let i = n0; i < S.children.length; i++) S.children[i].userData.src ??= gid;   // (tests/drawcalls.mjs: what each builder added)
    Object.assign(this.rooms_, rooms);
    for (const [id, R] of Object.entries(rooms)) { const c = this.centreOf(id), r = R.center || R.group?.position; if (c && r && Math.hypot(c.x - r.x, c.z - r.z) > 0.5) console.warn('regions.js AT is out of date for', id, [r.x, r.z]); }
    G.ms = Math.round(performance.now() - t0); G.state = 'ready'; G.why = why; G.phase = this.phase;
    if (why === 'access' && this.phase === 'play') {
      // (built where something read it, not ahead: correct, but the build ran wherever that was — listed for the tests)
      G.stack = (new Error().stack || '').split('\n').slice(3, 9).map((l) => l.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\//, '').replace(/\)$/, '')).join(' < ');
      console.info('[regions] built on first access:', gid, G.ms + ' ms', G.stack);
    }
    this.log.push({ group: gid, ms: G.ms, why, phase: this.phase, at: Math.round(t0) });
    this.onBuilt?.(gid, rooms, why);
    for (const id of Object.keys(rooms)) {
      const q = this.waits.get(id);
      if (q) { this.waits.delete(id); for (const fn of q) fn(rooms[id]); }
    }
    this.afterBuilt?.(gid, rooms, why);
    return true;
  }
  // where a room stands, built or not: { x, z, outdoor } (an interior's centre; an outdoor area's origin)
  centreOf(id) {
    const R = this.rooms_[id];
    if (R) { const c = R.center || R.group.position; return { x: c.x, z: c.z, outdoor: !!R.outdoor }; }
    const a = AT[id] || OUT_AT[id] || (id.startsWith('isle_') && this.of.has(id) ? isleAt(id) : null);
    return a ? { x: a[0], z: a[1], outdoor: !AT[id] } : null;
  }
  // the scene a point belongs to, built or not: a room within 60 m of its centre, an outdoor area within 400 m of its
  // origin, else Citadel ('citadel')
  sceneOf(x, z) {
    let best = null, bd = 60;
    for (const id of this.of.keys()) { const c = this.centreOf(id); if (!c || c.outdoor) continue; const d = Math.hypot(x - c.x, z - c.z); if (d < bd) { bd = d; best = id; } }
    if (best) return best;
    for (const id of this.of.keys()) { const c = this.centreOf(id); if (c?.outdoor && Math.hypot(x - c.x, z - c.z) < 400) return id; }
    return 'citadel';
  }
  whenBuilt(id, fn) {
    if (id in this.rooms_) { fn(this.rooms_[id]); return; }
    if (!this.of.has(id)) return;
    let q = this.waits.get(id); if (!q) this.waits.set(id, (q = []));
    q.push(fn);
  }
  clearWaits() { this.waits.clear(); }
  // the scene on screen: its group is 'active', the one left 'cached'
  activate(id) {
    const g = id ? this.of.get(id) : null;
    if (this.active && this.active !== g) { const A = this.groups.get(this.active); if (A?.state === 'active') A.state = 'cached'; }
    this.active = g;
    if (g) { const G = this.groups.get(g); if (G && (G.state === 'ready' || G.state === 'cached')) G.state = 'active'; }
  }
  summary() {
    const startup = [], later = [], deferred = [];
    for (const G of this.groups.values()) {
      if (G.state === 'unloaded' || G.state === 'failed') deferred.push(G.id);
      else (G.phase === 'startup' ? startup : later).push({ group: G.id, ms: G.ms, why: G.why, ...(G.stack ? { from: G.stack } : {}) });
    }
    return { startup, later, deferred, speed: +this.speed.toFixed(2) };
  }
}
