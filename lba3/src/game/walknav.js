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
import { WATER_FLOOR } from '../engine/physics.js';
import { streetDist } from './town.js';

const CELL = 0.5, SAFE_R = 0.42, HUG_R = 0.95, MIN_GROUND = 0.35, MAX_SLOPE = 0.7, MAX_STEP = 0.5;
const K = (ix, iz) => (ix + 8192) * 16384 + (iz + 8192);

export class WalkNav {
  constructor(game) {
    this.game = game;
    this.cells = new Map();     // key → {ok, h, c}
    this.cache = new Map();     // 'x,z>x,z' → pts
    this.jobs = [];
    this.keepOut = [];          // [{x, z, r}] doorways and the like: never planned through (cost, not a wall, near their edge)
    this.pathDist = null;       // (x, z) → metres to the nearest footpath (world.js)
    this.stats = { cellsMade: 0, expanded: 0, jobs: 0 };
    this.soft = [];             // [{x, z}] the story's people where they stand now: a route keeps 2 m from them when it can
    this.sig = '';              // what the cast looks like (a route planned for another is not reused)
    this.levels = [];           // [{x0, x1, y}] where the ground is floor bricks over open sea (Zeelich): the level people walk at
  }
  addLevel(x0, x1, y) { if (!this.levels.some((l) => l.x0 === x0 && l.x1 === x1)) { this.levels.push({ x0, x1, y }); this.cells.clear(); this.cache.clear(); } }
  levelAt(x) { for (const l of this.levels) if (x >= l.x0 && x <= l.x1) return l.y; return null; }
  get P() { return this.game.physics; }
  cellOf(x, z) { return [Math.round(x / CELL), Math.round(z / CELL)]; }

  // everything the planner knows about one cell
  info(ix, iz) {
    const k = K(ix, iz);
    let c = this.cells.get(k);
    if (c) return c;
    const P = this.P, x = ix * CELL, z = iz * CELL;
    c = { ok: false, h: 0, c: 1, x, z };
    this.stats.cellsMade++;
    const th = P.terrain.heightAt(x, z);
    let yref = th + 0.3, live = th >= WATER_FLOOR - 1;   // (deep water is never a way: skip the brick tests)
    if (!live) { const L = this.levelAt(x); if (L != null) { yref = L + 0.3; live = true; } }
    if (live) {
      const gi = P.groundInfo(x, z, yref), g = gi.h;
      c.h = g;
      // (a low brick standing on land — a bench, a step-up crate, a planter's rim — is something to walk round, not over: the
      //  hero may climb it, a resident does not; a pier's planks over water, and a quay's floor, are the way)
      const base = th >= WATER_FLOOR - 1 ? th : yref - 0.3;
      let ok = g >= MIN_GROUND && !(base >= MIN_GROUND && ((gi.brick && g - base > 0.3) || this.lowBrick(x, z, base))) && !P.blockedAt(x, z, g, SAFE_R) && !P.steepAt(x, z, g + 0.05, MAX_SLOPE);
      if (ok) for (const d of this.keepOut) if (Math.hypot(x - d.x, z - d.z) < d.r) { ok = false; break; }
      c.ok = ok;
      if (ok) {
        let m = 1;
        if (P.blockedAt(x, z, g, HUG_R)) m += 0.7;            // a wall's shoulder, a tree's branches
        const pd = this.pathDist ? Math.min(this.pathDist(x, z), Math.max(0, streetDist(x, z)) + 0.6) : 9;
        if (pd > 1.7) m += Math.min(1, (pd - 1.7) / 5) * 0.9; // a path is the better way when one runs alongside
        for (const d of this.keepOut) { const dd = Math.hypot(x - d.x, z - d.z) - d.r; if (dd < 1.6) m += (1.6 - dd) * 2; }
        c.c = m;
      }
    }
    this.cells.set(k, c);
    return c;
  }
  // a low solid within reach (a bench, a crate, a planter's rim: not tall enough to push anyone aside, tall enough to climb)
  lowBrick(x, z, base) {
    for (const c of this.P.near(x, z)) {
      if (!c.enabled || c.stair || c.top - base < 0.25 || c.top - base > 0.7 || c.bottom > base + 0.4) continue;
      if (this.P._inside(c, x, z, 0.5)) return true;
    }
    return false;
  }
  walkable(x, z) { const [ix, iz] = this.cellOf(x, z); return this.info(ix, iz).ok; }
  // the nearest walkable cell to a point, within `maxR` metres
  nearest(x, z, maxR = 4) {
    const [cx, cz] = this.cellOf(x, z);
    const c0 = this.info(cx, cz);
    if (c0.ok) return c0;
    const R = Math.ceil(maxR / CELL);
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
      const [ix, iz] = this.cellOf(x, z), c = this.info(ix, iz);
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
    const job = { from: { x: from.x, z: from.z }, to: { x: to.x, z: to.z }, ck, done: false, ok: false, pts: null, prio, open: null, best: null, prev: null, closed: null, n: 0, cancelled: false };
    if (hit) { job.done = true; job.ok = hit.ok; job.pts = hit.pts; job.cached = true; return job; }
    this.jobs.push(job);
    this.stats.jobs++;
    return job;
  }
  cancel(job) { if (job) job.cancelled = true; }
  _begin(job) {
    const s = this.nearest(job.from.x, job.from.z, 5), g = this.nearest(job.to.x, job.to.z, 5);
    if (!s || !g) { job.done = true; job.ok = false; job.pts = null; return; }
    job.s = s; job.g = g; job.open = []; job.best = new Map(); job.prev = new Map(); job.closed = new Set();
    const k0 = K(Math.round(s.x / CELL), Math.round(s.z / CELL));
    job.best.set(k0, 0); job.node = new Map([[k0, s]]);
    this._push(job.open, [this._h(s, g), k0]);
  }
  _h(a, b) { return Math.hypot(a.x - b.x, a.z - b.z) * 1.15; }
  // (PERF-CPU: swaps through a temporary, not a destructuring array: the planner runs ~120 expansions every frame)
  _push(h, it) { h.push(it); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; } }
  _pop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; const t = h[m]; h[m] = h[i]; h[i] = t; i = m; } } return top; }
  // run a job for up to `n` expansions; true when it finished
  _run(job, n) {
    if (job.done) return true;
    if (!job.open) this._begin(job);
    if (job.done) return true;
    const { open, best, prev, closed, node, g } = job;
    const gk = K(Math.round(g.x / CELL), Math.round(g.z / CELL));
    for (let it = 0; it < n; it++) {
      if (!open.length) { job.done = true; job.ok = false; this._finish(job, job.closestK); return true; }
      const k = this._pop(open)[1];
      if (closed.has(k)) continue;
      closed.add(k);
      const c = node.get(k);
      job.n++; this.stats.expanded++;
      const dg = Math.hypot(c.x - g.x, c.z - g.z);
      if (job.closestD == null || dg < job.closestD) { job.closestD = dg; job.closestK = k; }
      if (k === gk || dg < 0.3) { job.done = true; job.ok = true; this._finish(job, k); return true; }
      if (job.n > 9000) { job.done = true; job.ok = false; this._finish(job, job.closestK); return true; }
      const cx = Math.round(c.x / CELL), cz = Math.round(c.z / CELL), gc = best.get(k);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const nb = this.info(cx + dx, cz + dz);
        if (!nb.ok || Math.abs(nb.h - c.h) > MAX_STEP) continue;
        if (dx && dz && (!this.info(cx + dx, cz).ok || !this.info(cx, cz + dz).ok)) continue;   // (no cutting a corner)
        const nk = K(cx + dx, cz + dz);
        if (closed.has(nk)) continue;
        let sm = 0;
        for (let si = 0, S = this.soft; si < S.length; si++) { const s = S[si], sd = Math.hypot(nb.x - s.x, nb.z - s.z); if (sd < 2.4) sm += (2.4 - sd) * 1.5; }
        const ng = gc + Math.hypot(dx, dz) * CELL * (c.c + nb.c + sm) * 0.5;
        if (ng >= (best.get(nk) ?? 1e18)) continue;
        best.set(nk, ng); prev.set(nk, k); node.set(nk, nb);
        this._push(open, [ng + this._h(nb, g), nk]);
      }
    }
    return false;
  }
  _finish(job, endK) {
    const { prev, node } = job, raw = [];
    for (let k = endK; k != null; k = prev.get(k)) { const c = node.get(k); raw.push({ x: c.x, z: c.z, h: c.h }); }
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
    job.open = job.best = job.prev = job.closed = job.node = null;
    if (job.ok) this.cache.set(job.ck, { ok: true, pts });
  }
  // the queued jobs get `budget` expansions a frame between them (the oldest first)
  step(budget = 160) {
    if (!this.jobs.length) return;
    this.jobs = this.jobs.filter((j) => !j.cancelled && !j.done);
    let left = budget;
    for (const j of this.jobs) { if (left <= 0) break; const before = j.n; this._run(j, left); left -= Math.max(1, j.n - before); }
    this.jobs = this.jobs.filter((j) => !j.done);
  }
  planSync(from, to, { key = null } = {}) {
    const j = this.request(from, to, { key });
    if (!j.done) { this.jobs = this.jobs.filter((x) => x !== j); while (!j.done) this._run(j, 2000); }
    return j;
  }
  // a path's total length
  static length(pts) { let d = 0; for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return d; }
}
