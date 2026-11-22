// WORLD-LIFE (WORKLIST #37): the game-side walking planner for ambient residents. The player-input test harness has
// its own planner (tests/lib/player.js P.plan); this one asks the same questions of the same physics (ground height,
// water, slope, a solid brick in the way) so a resident never walks where Twinsen could not, plus what a person
// minds: a wall's shoulder, a tree's branches, a doorway, a stretch of rough grass when a path runs alongside.
//
//   nav.request(from, to, { key }) → job {done, ok, pts[{x,z}]}   a time-sliced A* (a fixed number of expansions a
//                                                                frame, never wall-clock: the same on every machine)
//   nav.step(budget)                                              runs the queued jobs
//   nav.planSync(from, to)                                        the same, at once (tests, prefetch)
//   nav.walkable(x, z) / nav.lineOK(a, b)                         the queries a resident's steering uses
//
// The grid is 0.5 m; a cell is looked at once and remembered. A route is smoothed to its corners (a string pull over
// cells that were checked) and cached by its two ends, so each stop-to-stop leg of a daily round is planned once.
//
// INTERIOR-LIFE: the same planner indoors. A room is a FLOOR here (addFloor: a box of the world and the height of its
// floor): every interior stands on floor bricks out over the sea, at y 0 (or a raised level: the baggage claim's upper
// hall), where the open-air rules (ground under MIN_GROUND is the shore, a low brick on land is a bench) do not apply. On a
// floor a cell is walkable when the ground there is that floor (not a stair, a platform or a gallery), nothing taller
// than a step stands within the body's reach (walls, counters, tables) and no low piece of furniture is underfoot
// (chairs, stools, a plant's stand: a person walks round them, as on the street round a bench). An indoor planner may use
// a finer grid and a tighter reach (options: cell, safeR, hugR, lowR: the berth given low furniture): a room's ways are narrower than the street's
// (src/game/walkers.js, Walkers indoor).
import { WATER_FLOOR } from '../engine/physics.js';
import { streetDist } from './town.js';

const CELL = 0.5, SAFE_R = 0.42, HUG_R = 0.95, MIN_GROUND = 0.35, MAX_SLOPE = 0.7, MAX_STEP = 0.5;
const K = (ix, iz) => (ix + 8192) * 16384 + (iz + 8192);

export class WalkNav {
  constructor(game, { cell = CELL, safeR = SAFE_R, hugR = HUG_R, lowR = 0.5 } = {}) {
    this.game = game;
    this.cell = cell; this.safeR = safeR; this.hugR = hugR; this.lowR = lowR;
    this.floors = [];           // INTERIOR-LIFE: [{x0, x1, z0, z1, y}] rooms' floors (addFloor)
    this.cells = new Map();     // key → {ok, h, c}
    this.cache = new Map();     // 'x,z>x,z' → pts
    this.jobs = [];
    this.keepOut = [];          // [{x, z, r}] doorways and the like: never planned through (cost, not a wall, near their edge)
    this.pathDist = null;       // (x, z) → metres to the nearest footpath (world.js)
    this.stats = { cellsMade: 0, expanded: 0, jobs: 0 };
    this.soft = [];             // [{x, z}] the story's people where they stand now: a route keeps 2 m from them when it can
    this.sig = '';              // what the cast looks like (a route planned for another is not reused)
    this.levels = [];           // [{x0, x1, y}] where the ground is floor bricks over open sea (Zeelich): the level people walk at
    this.shores = [];           // WC-3: [{x0, x1, z0, z1, min}] boxes of low dry land (paving under MIN_GROUND): the shore's line there is `min`
  }
  addLevel(x0, x1, y) { if (!this.levels.some((l) => l.x0 === x0 && l.x1 === x1)) { this.levels.push({ x0, x1, y }); this.cells.clear(); this.cache.clear(); } }
  levelAt(x, z) {
    if (z != null && this.floors.length) { const F = this.floorAt(x, z); if (F) return F.y; }
    for (const l of this.levels) if (x >= l.x0 && x <= l.x1) return l.y;
    return null;
  }
  // INTERIOR-LIFE: a room's floor (or a level of it), once; and the floor a point is on
  addFloor(F) {
    if (this.floors.some((f) => f.x0 === F.x0 && f.x1 === F.x1 && f.z0 === F.z0 && f.z1 === F.z1 && f.y === F.y)) return;
    this.floors.push({ x0: F.x0, x1: F.x1, z0: F.z0, z1: F.z1, y: F.y });
    this.cells.clear(); this.cache.clear();
  }
  // WC-3 (storylife.js): low paving above the sea but under the shore's line (the School's plaza at 0.3 m) is land in this
  // box; every other open-air rule is unchanged there
  addShore(B) {
    if (this.shores.some((b) => b.x0 === B.x0 && b.x1 === B.x1 && b.z0 === B.z0 && b.z1 === B.z1)) return;
    this.shores.push({ x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, min: B.min });
    this.cells.clear(); this.cache.clear();
  }
  minGround(x, z) { for (const b of this.shores) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return b.min; return MIN_GROUND; }
  floorAt(x, z) { for (const f of this.floors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) return f; return null; }
  get P() { return this.game.physics; }
  cellOf(x, z) { return [Math.round(x / this.cell), Math.round(z / this.cell)]; }

  // everything the planner knows about one cell
  info(ix, iz) {
    const k = K(ix, iz);
    let c = this.cells.get(k);
    if (c) return c;
    const P = this.P, x = ix * this.cell, z = iz * this.cell;
    c = { ok: false, h: 0, c: 1, x, z };
    this.stats.cellsMade++;
    const F = this.floors.length ? this.floorAt(x, z) : null;
    if (F) { this.cells.set(k, this.floorCell(c, F)); return c; }
    const th = P.terrain.heightAt(x, z);
    let yref = th + 0.3, live = th >= WATER_FLOOR - 1;   // (deep water is never a way: skip the brick tests)
    if (!live) { const L = this.levelAt(x); if (L != null) { yref = L + 0.3; live = true; } }
    if (live) {
      const gi = P.groundInfo(x, z, yref), g = gi.h;
      c.h = g;
      // (a low brick standing on land — a bench, a step-up crate, a planter's rim — is something to walk round, not over: the
      //  hero may climb it, a resident does not; a pier's planks over water, and a quay's floor, are the way)
      const base = th >= WATER_FLOOR - 1 ? th : yref - 0.3;
      const minG = this.shores.length ? this.minGround(x, z) : MIN_GROUND;
      let ok = g >= minG && !(base >= minG && ((gi.brick && g - base > 0.3) || this.lowBrick(x, z, base))) && !P.blockedAt(x, z, g, this.safeR) && !P.steepAt(x, z, g + 0.05, MAX_SLOPE);
      if (ok) for (const d of this.keepOut) if (Math.hypot(x - d.x, z - d.z) < d.r) { ok = false; break; }
      c.ok = ok;
      if (ok) {
        let m = 1;
        if (P.blockedAt(x, z, g, this.hugR)) m += 0.7;        // a wall's shoulder, a tree's branches
        const pd = this.pathDist ? Math.min(this.pathDist(x, z), Math.max(0, streetDist(x, z)) + 0.6) : 9;
        if (pd > 1.7) m += Math.min(1, (pd - 1.7) / 5) * 0.9; // a path is the better way when one runs alongside
        for (const d of this.keepOut) { const dd = Math.hypot(x - d.x, z - d.z) - d.r; if (dd < 1.6) m += (1.6 - dd) * 2; }
        c.c = m;
      }
    }
    this.cells.set(k, c);
    return c;
  }
  // INTERIOR-LIFE: a cell on a room's floor: that floor underfoot (within 0.12 m: not a step of a stair, not a platform),
  // no wall or tall furniture within reach, no low furniture underfoot, not in a doorway; a wall's or a counter's
  // shoulder costs more, so a route keeps to the middle of the room's ways
  floorCell(c, F) {
    const P = this.P, x = c.x, z = c.z, g = P.groundInfo(x, z, F.y + 0.3).h;
    c.h = g;
    let ok = Math.abs(g - F.y) < 0.12 && !P.blockedAt(x, z, g, this.safeR) && !this.lowBrick(x, z, g, this.lowR);
    if (ok) for (const d of this.keepOut) if (Math.hypot(x - d.x, z - d.z) < d.r) { ok = false; break; }
    c.ok = ok;
    if (ok) {
      let m = 1;
      if (P.blockedAt(x, z, g, this.hugR)) m += 0.7;
      for (const d of this.keepOut) { const dd = Math.hypot(x - d.x, z - d.z) - d.r; if (dd < 1.0) m += (1.0 - dd) * 2; }
      c.c = m;
    }
    return c;
  }
  // a low solid within reach (a bench, a crate, a planter's rim: not tall enough to push anyone aside, tall enough to climb)
  lowBrick(x, z, base, r = 0.5) {
    for (const c of this.P.near(x, z)) {
      if (!c.enabled || c.stair || c.top - base < 0.25 || c.top - base > 0.7 || c.bottom > base + 0.4) continue;
      if (this.P._inside(c, x, z, r)) return true;
    }
    return false;
  }
  // (GC-STREET: the cell's indices inline, not cellOf's two-element array: walkable and lineOK run thousands of times a frame
  //  on the street, and each array was garbage)
  walkable(x, z) { return this.info(Math.round(x / this.cell), Math.round(z / this.cell)).ok; }
  // the nearest walkable cell to a point, within `maxR` metres
  nearest(x, z, maxR = 4) {
    const cx = Math.round(x / this.cell), cz = Math.round(z / this.cell);
    const c0 = this.info(cx, cz);
    if (c0.ok) return c0;
    const R = Math.ceil(maxR / this.cell);
    let best = null, bd = 1e9;
    for (let r = 1; r <= R; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const c = this.info(cx + dx, cz + dz);
        if (!c.ok) continue;
        const d = Math.hypot(c.x - x, c.z - z);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) return best;
    }
    return null;
  }
  // a straight walk a → b over walkable cells (sampled every 0.25 m)
  lineOK(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.25));
    let py = null;
    for (let i = 0; i <= n; i++) {
      const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n;
      const c = this.info(Math.round(x / this.cell), Math.round(z / this.cell));
      if (!c.ok) return false;
      if (py != null && Math.abs(c.h - py) > MAX_STEP) return false;
      py = c.h;
    }
    return true;
  }

  // ---------------------------------------------------------------- A*
  key(a, b) { return `${Math.round(a.x * 2)},${Math.round(a.z * 2)}>${Math.round(b.x * 2)},${Math.round(b.z * 2)}`; }
  request(from, to, { key = null, prio = 0 } = {}) {
    const ck = (key || this.key(from, to)) + '#' + this.sig;
    const hit = this.cache.get(ck);
    const job = { from: { x: from.x, z: from.z }, to: { x: to.x, z: to.z }, ck, done: false, ok: false, pts: null, prio, openF: null, openK: null, best: null, prev: null, closed: null, node: null, s: null, g: null, n: 0, closestD: null, closestK: undefined, cancelled: false };
    if (hit) { job.done = true; job.ok = hit.ok; job.pts = hit.pts; job.cached = true; return job; }
    this.jobs.push(job);
    this.stats.jobs++;
    return job;
  }
  cancel(job) { if (job) job.cancelled = true; }
  _begin(job) {
    const s = this.nearest(job.from.x, job.from.z, 5), g = this.nearest(job.to.x, job.to.z, 5);
    if (!s || !g) { job.done = true; job.ok = false; job.pts = null; return; }
    job.s = s; job.g = g; job.openF = []; job.openK = []; job.best = new Map(); job.prev = new Map(); job.closed = new Set();
    const k0 = K(Math.round(s.x / this.cell), Math.round(s.z / this.cell));
    job.best.set(k0, 0); job.node = new Map([[k0, s]]);
    this._push(job.openF, job.openK, this._h(s, g), k0);
  }
  _h(a, b) { return Math.hypot(a.x - b.x, a.z - b.z) * 1.15; }
  // (PERF-CPU: swaps through a temporary, not a destructuring array: the planner runs ~120 expansions every frame)
  // (GC-STREET: the open list is two parallel arrays — the cost to sort by (F) and the cell's key (Kk) — not an array of
  //  [cost, key] pairs, one garbage pair per neighbour pushed; the same comparisons in the same order, so the same pops)
  _push(F, Kk, f, k) {
    F.push(f); Kk.push(k);
    let i = F.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= F[i]) break; const t = F[p]; F[p] = F[i]; F[i] = t; const u = Kk[p]; Kk[p] = Kk[i]; Kk[i] = u; i = p; }
  }
  // the cheapest entry's key, taken off the list
  _pop(F, Kk) {
    const top = Kk[0], lastF = F.pop(), lastK = Kk.pop();
    if (F.length) {
      F[0] = lastF; Kk[0] = lastK;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < F.length && F[l] < F[m]) m = l;
        if (r < F.length && F[r] < F[m]) m = r;
        if (m === i) break;
        const t = F[m]; F[m] = F[i]; F[i] = t; const u = Kk[m]; Kk[m] = Kk[i]; Kk[i] = u; i = m;
      }
    }
    return top;
  }
  // run a job for up to `n` expansions; true when it finished
  _run(job, n) {
    if (job.done) return true;
    if (!job.openF) this._begin(job);
    if (job.done) return true;
    const openF = job.openF, openK = job.openK, best = job.best, prev = job.prev, closed = job.closed, node = job.node, g = job.g;
    const gk = K(Math.round(g.x / this.cell), Math.round(g.z / this.cell));
    for (let it = 0; it < n; it++) {
      if (!openF.length) { job.done = true; job.ok = false; this._finish(job, job.closestK); return true; }
      const k = this._pop(openF, openK);
      if (closed.has(k)) continue;
      closed.add(k);
      const c = node.get(k);
      job.n++; this.stats.expanded++;
      const dg = Math.hypot(c.x - g.x, c.z - g.z);
      if (job.closestD == null || dg < job.closestD) { job.closestD = dg; job.closestK = k; }
      if (k === gk || dg < 0.3) { job.done = true; job.ok = true; this._finish(job, k); return true; }
      if (job.n > 9000) { job.done = true; job.ok = false; this._finish(job, job.closestK); return true; }
      const cx = Math.round(c.x / this.cell), cz = Math.round(c.z / this.cell), gc = best.get(k);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const nb = this.info(cx + dx, cz + dz);
        if (!nb.ok || Math.abs(nb.h - c.h) > MAX_STEP) continue;
        if (dx && dz && (!this.info(cx + dx, cz).ok || !this.info(cx, cz + dz).ok)) continue;   // (no cutting a corner)
        const nk = K(cx + dx, cz + dz);
        if (closed.has(nk)) continue;
        let sm = 0;
        for (let si = 0, S = this.soft; si < S.length; si++) { const s = S[si], sd = Math.hypot(nb.x - s.x, nb.z - s.z); if (sd < 2.4) sm += (2.4 - sd) * 1.5; }
        const ng = gc + Math.hypot(dx, dz) * this.cell * (c.c + nb.c + sm) * 0.5;
        if (ng >= (best.get(nk) ?? 1e18)) continue;
        best.set(nk, ng); prev.set(nk, k); node.set(nk, nb);
        this._push(openF, openK, ng + this._h(nb, g), nk);
      }
    }
    return false;
  }
  _finish(job, endK) {
    const prev = job.prev, node = job.node, raw = [];
    // (GC-STREET: the route's cells themselves, not copies of their x, z, h: cells are never changed once made)
    for (let k = endK; k != null; k = prev.get(k)) raw.push(node.get(k));
    raw.reverse();
    // the exact start and end the caller asked for are walkable by contract (a stop's slot), keep them as the ends
    const pts = [];
    if (raw.length) {
      let i = 0; pts.push({ x: raw[0].x, z: raw[0].z });
      while (i < raw.length - 1) {
        let j = Math.min(raw.length - 1, i + 60);
        while (j > i + 1 && !this.lineOK(raw[i], raw[j])) j--;
        pts.push({ x: raw[j].x, z: raw[j].z }); i = j;
      }
    }
    job.pts = pts;
    job.openF = job.openK = job.best = job.prev = job.closed = job.node = null;
    if (job.ok) this.cache.set(job.ck, { ok: true, pts });
  }
  // the queued jobs get `budget` expansions a frame between them (the oldest first)
  step(budget = 160) {
    const J = this.jobs;
    if (!J.length) return;
    // (GC-STREET: the finished and cancelled jobs dropped in place, in order, not by two new filtered arrays a frame)
    let w = 0;
    for (let i = 0; i < J.length; i++) { const j = J[i]; if (!j.cancelled && !j.done) J[w++] = j; }
    J.length = w;
    let left = budget;
    for (let i = 0; i < J.length; i++) { if (left <= 0) break; const j = J[i], before = j.n; this._run(j, left); left -= Math.max(1, j.n - before); }
    w = 0;
    for (let i = 0; i < J.length; i++) { const j = J[i]; if (!j.done) J[w++] = j; }
    J.length = w;
  }
  planSync(from, to, { key = null } = {}) {
    const j = this.request(from, to, { key });
    if (!j.done) { this.jobs = this.jobs.filter((x) => x !== j); while (!j.done) this._run(j, 2000); }
    return j;
  }
  // a path's total length
  static length(pts) { let d = 0; for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return d; }
}
