// Lightweight character physics in the spirit of the LBA2 engine:
// the ground is a heightfield, everything else is a set of simple
// "bricks" (cylinders and oriented boxes) that either block you or,
// when low enough, can be stood on.

export const GRAVITY = 26;
export const STEP_UP = 0.55;     // max height you can walk onto
export const WATER_FLOOR = -0.35; // deeper than this counts as sea (blocked)
export const MAX_SLOPE = 1.1;     // steepest walkable terrain (rise / run)
export const BLOCK_LOW = 0.12;   // a `block` collider lower than this over the feet is stepped over (it is under them)
const LIP = 0.15;                 // the most a bank's lip may stand over a bridge's end plank to be covered (bridgeTreads)

const NONE = Object.freeze([]);   // (PERF-CPU: near()'s answer for an empty cell)
const _pushOut = { x: 0, z: 0 };   // (GC-STREET: _push's answer)

export class Physics {
  constructor(terrain) {
    this.terrain = terrain;
    this.colliders = [];
    this.cell = 8;
    this.grid = new Map();
    this._brick = false;   // (GC-STREET: _ground's second answer)
  }

  _key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }

  add(c) {
    // c: {type:'cyl', x,z,r, ri?, top, bottom?} | {type:'box', x,z,hw,hd,rot, top, bottom?}   (ri: a ring, its hole's radius;
    // for a stair only: _push, which a stair never uses, reads the whole disc)
    // block: a low solid that is not a step (a bench, a planter box, a flower tub, a pot: SOLID-NPC props): never stepped
    // onto, it stops an actor like a wall once it stands above the ankle (BLOCK_LOW); never stood on either (noStand)
    c.bottom ??= -50;
    if (c.block) c.noStand = true;
    c.enabled ??= true;
    c._cam = 0;   // (GC-STREET: the camera's per-query mark, camera.js _stamp)
    if (c.type === 'box') {
      c.cos = Math.cos(c.rot || 0);
      c.sin = Math.sin(c.rot || 0);
      c.bound = Math.hypot(c.hw, c.hd);
    } else c.bound = c.r;
    this.colliders.push(c);
    this._insert(c);
    return c;
  }

  _insert(c) {
    const b = c.bound + 1;
    const x0 = Math.floor((c.x - b) / this.cell), x1 = Math.floor((c.x + b) / this.cell);
    const z0 = Math.floor((c.z - b) / this.cell), z1 = Math.floor((c.z + b) / this.cell);
    c._cells = [];
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = this._key(ix, iz);
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(c);
      c._cells.push(k);
    }
  }

  // Re-index a collider after it moved (e.g. rising stepping stones only change top, so not needed there).
  update(c) {
    for (const k of c._cells) {
      const arr = this.grid.get(k);
      const i = arr.indexOf(c);
      if (i >= 0) arr.splice(i, 1);
    }
    if (c.type === 'box') { c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0); }
    this._insert(c);
  }

  near(x, z) {
    const k = this._key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    return this.grid.get(k) || NONE;   // (PERF-CPU: a shared empty list, not a new one per call)
  }

  // Signed penetration test of a circle (x,z,r) against a collider.
  // Returns push-out vector or null.
  // (GC-STREET: the vector is one shared object, overwritten by the next call: every caller reads it at once)
  _push(c, x, z, r) {
    const out = _pushOut;
    if (c.type === 'cyl') {
      const dx = x - c.x, dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d >= min) return null;
      if (d < 1e-5) { out.x = min; out.z = 0; return out; }
      out.x = (dx / d) * (min - d); out.z = (dz / d) * (min - d); return out;
    }
    // oriented box -> local space
    const dx = x - c.x, dz = z - c.z;
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    const cx = Math.max(-c.hw, Math.min(c.hw, lx));
    const cz = Math.max(-c.hd, Math.min(c.hd, lz));
    let px = lx - cx, pz = lz - cz;
    let d = Math.hypot(px, pz);
    let ox, oz;
    if (d > 1e-5) {
      if (d >= r) return null;
      ox = (px / d) * (r - d); oz = (pz / d) * (r - d);
    } else {
      // center inside box: push along the smallest axis
      const ex = c.hw - Math.abs(lx), ez = c.hd - Math.abs(lz);
      if (ex < ez) { ox = Math.sign(lx || 1) * (ex + r); oz = 0; }
      else { ox = 0; oz = Math.sign(lz || 1) * (ez + r); }
    }
    // back to world
    out.x = ox * c.cos + oz * c.sin; out.z = -ox * c.sin + oz * c.cos; return out;
  }

  _inside(c, x, z, r = 0) {
    if (c.type === 'cyl') { const d = Math.hypot(x - c.x, z - c.z); return d < c.r + r && !(c.ri > 0 && d <= c.ri - r); }   // (ri: a ring's hole, FEET-66B: the square's ring steps)
    const dx = x - c.x, dz = z - c.z;
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    return Math.abs(lx) < c.hw + r && Math.abs(lz) < c.hd + r;
  }

  // Highest surface under (x,z) that is reachable from height y.
  groundAt(x, z, y = Infinity) { return this._ground(x, z, y); }

  groundInfo(x, z, y = Infinity) { const h = this._ground(x, z, y); return { h, brick: this._brick }; }
  // (GC-STREET) groundInfo's height, with whether a brick gives it in this._brick (read at once): groundAt, move and steepAt
  // ask it without the object groundInfo returns
  _ground(x, z, y) {
    let g = this.terrain.heightAt(x, z), brick = false;
    for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
      if (!c.enabled || c.noStand) continue;
      if (c.top <= y + STEP_UP && c.top > g && this._inside(c, x, z, -0.05)) { g = c.top; brick = true; }
    }
    // Two floor bricks laid edge to edge leave a 0.1 m seam under the shrink above. Over water (every room is
    // built out over the sea, and the piers) that seam read as sea and stopped the hero dead at it (Twinsen
    // couldn't walk out of his own house): there, a brick within 6 cm still holds him. The same over a drop (the
    // Hamalayi lift's platform docked beside its ramp at the top of the cliff: the seam read as the cliff foot).
    if (!brick && (g < WATER_FLOOR || (Number.isFinite(y) && g < y - 0.6))) {
      for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
        if (!c.enabled || c.noStand) continue;
        if (c.top <= y + STEP_UP && c.top > g && this._inside(c, x, z, 0.06)) { g = c.top; brick = true; }
      }
    }
    this._brick = brick;
    return g;
  }

  // BRIDGES: a deck laid as separate planks (the islands' plank bridges: each of the original's slats is its own object,
  // and so its own collider) leaves a gap between each two that the one point under his middle reads as the drop under
  // the bridge: he stopped at the first gap, or fell through it. Once, as an area is built (regions.js finish), every
  // run of three or more planks — thin boxes (≤ 0.6 m deep, a floor one can pass under) turned alike, of about one
  // length across the run, in line (within 0.5 m), each 2–60 cm from the next at nearly one height (≤ 0.3 m), over a drop of a metre or
  // more — gets an unseen tread across each gap, at the lower plank's top. Nothing else changes: stepping stones
  // (cylinders), blocks and crates (solid to the ground), two floors side by side, one gap alone stay as they were.
  // Returns the treads added. (globalThis.__noTreads: none, for the tests' before pictures and the A/B)
  bridgeTreads(cols) {
    if (globalThis.__noTreads) return [];
    const plank = (c) => c.type === 'box' && c.enabled && !c.noStand && !c.block && !c.stair && !c.tread && c.bottom > -40 && c.top - c.bottom <= 0.6
      && Math.min(c.hw, c.hd) <= 0.6 && Math.max(c.hw, c.hd) >= 1.5 * Math.min(c.hw, c.hd);
    const P = cols.filter(plank); if (P.length < 3) return [];
    const id = new Map(P.map((c, i) => [c, i])), links = new Map(), edges = [];
    const axes = (c) => (c.hw <= c.hd ? { ux: c.cos, uz: -c.sin, s: c.hw, l: c.hd } : { ux: c.sin, uz: c.cos, s: c.hd, l: c.hw });   // (its short axis in the world, half-widths)
    for (const a of P) {
      const A = axes(a);
      for (const b of this.near(a.x, a.z)) {
        if (!(id.get(b) > id.get(a)) || Math.abs(a.top - b.top) > 0.3) continue;
        const B = axes(b);
        if (Math.abs(A.ux * B.uz - A.uz * B.ux) > 0.12) continue;   // (turned alike: their short axes parallel)
        const dx = b.x - a.x, dz = b.z - a.z, al = dx * A.ux + dz * A.uz, ac = -dx * A.uz + dz * A.ux;
        const gap = Math.abs(al) - A.s - B.s;
        if (gap < 0.02 || gap > 0.6 || Math.abs(ac) > 0.5 || Math.min(A.l, B.l) < 0.55 * Math.max(A.l, B.l)) continue;
        const k = Math.sign(al), mx = a.x + A.ux * k * (A.s + gap / 2) - A.uz * ac / 2, mz = a.z + A.uz * k * (A.s + gap / 2) + A.ux * ac / 2;
        const top = Math.min(a.top, b.top);
        if (this._ground(mx, mz, top + 0.05) > top - 1.0) continue;   // (floor under it: not a drop)
        edges.push({ a, b, mx, mz, gap, top, l: Math.min(A.l, B.l), rot: Math.atan2(A.ux, A.uz) });
        for (const [p, q] of [[a, b], [b, a]]) { if (!links.has(p)) links.set(p, []); links.get(p).push(q); }
      }
    }
    // runs: the planks linked one to the next; three or more make a deck
    const runOf = new Map();
    for (const c of links.keys()) {
      if (runOf.has(c)) continue;
      const run = [c]; runOf.set(c, run);
      for (let i = 0; i < run.length; i++) for (const q of links.get(run[i])) if (!runOf.has(q)) { runOf.set(q, run); run.push(q); }
    }
    const out = [];
    for (const e of edges) {
      if (runOf.get(e.a).length < 3) continue;
      // (the tread's long side across the run, as long as the shorter plank; 5 cm onto each)
      out.push(this.add({ type: 'box', x: e.mx, z: e.mz, hw: e.l, hd: e.gap / 2 + 0.05, rot: e.rot, top: e.top, bottom: e.top - 0.3, seeThrough: true, tread: true }));
    }
    // the sides (the user, 25.11: "block the sides"): the drawn rails stand outside the planks, so he could walk off the
    // deck's long edges into the drop. Along each run, an unseen guard at each plank end, from the first plank's middle to
    // the last's (the two ends stay open to step on and off), a metre high, that the ball and the eye pass
    for (const run of new Set(runOf.values())) {
      if (run.length < 3) continue;
      const A = axes(run[0]);
      let cx = 0, cz = 0, l = Infinity, top = -Infinity;
      for (const c of run) { cx += c.x / run.length; cz += c.z / run.length; l = Math.min(l, axes(c).l); top = Math.max(top, c.top); }
      let t0 = Infinity, t1 = -Infinity;
      for (const c of run) { const t = (c.x - cx) * A.ux + (c.z - cz) * A.uz; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
      const px = -A.uz, pz = A.ux, D = 0.25;
      for (const k of [-1, 1]) {
        // (only over a drop: where ground or a stair meets the edge — Mosquibee's steps down to the honey yard — it stays open)
        const drop = (t) => this._ground(cx + A.ux * t + px * k * (l + 0.35), cz + A.uz * t + pz * k * (l + 0.35), top + 0.05) < top - 1.0;
        const seg = (a, b) => { const tm = (a + b) / 2;
          out.push(this.add({ type: 'box', x: cx + A.ux * tm + px * k * (l + 0.06), z: cz + A.uz * tm + pz * k * (l + 0.06), hw: 0.06, hd: (b - a) / 2,
            rot: Math.atan2(A.ux, A.uz), top: top + 1.0, bottom: top - 0.3, seeThrough: true, noBall: true, block: true, tread: 'side' })); };
        let a = null;
        for (let t = t0; t <= t1 + 1e-6; t += D) {
          if (drop(t)) { if (a == null) a = t; }
          else if (a != null) { if (t - D - a > 0.1) seg(a, t - D); a = null; }
        }
        if (a != null && t1 - a > 0.1) seg(a, t1);
      }
    }
    // the ends: where the bank an end plank meets rises steeply through its far half to a lip a few cm over it (Mosquibee's
    // east end: 7 cm, steeper than he walks up from a standing step: he walked off the bank onto the bridge and could not
    // walk back), a tread over the lip at its crest's height, from where the ground comes up through the plank to 15 cm
    // past the crest (at most LIP over the plank, within a metre past its edge; ground lower than the plank: nothing)
    for (const [c, nb] of links) {
      if (nb.length !== 1 || runOf.get(c).length < 3) continue;
      const A = axes(c), q = nb[0], k = Math.sign((c.x - q.x) * A.ux + (c.z - q.z) * A.uz) || 1;
      let s1 = null, sM = 0, m = -Infinity;
      for (let s = 0; s <= A.s + 1.0; s += 0.025) {
        const g = this._ground(c.x + A.ux * k * s, c.z + A.uz * k * s, c.top + LIP + 0.01);
        if (g > c.top + 0.01 && s1 == null) s1 = s;
        if (s1 != null && g > m) { m = g; sM = s; }
      }
      if (s1 == null || m > c.top + LIP) continue;
      const a0 = Math.max(0, s1 - 0.05), a1 = sM + 0.15, am = (a0 + a1) / 2, top = m + 0.02;   // (2 cm over the crest: the ground between the samples never stands over it)
      out.push(this.add({ type: 'box', x: c.x + A.ux * k * am, z: c.z + A.uz * k * am, hw: A.l, hd: (a1 - a0) / 2, rot: Math.atan2(A.ux, A.uz), top, bottom: top - 0.3, seeThrough: true, tread: 'end' }));
    }
    return out;
  }

  // Standing on bare terrain steeper than walkable? Returns the downhill direction (actors slide and can't
  // jump from there — otherwise a cliff can be climbed by hopping from one steep landing to the next).
  steepAt(x, z, y = Infinity, limit = MAX_SLOPE * 1.35) {
    this._ground(x, z, y); if (this._brick) return null;
    const e = 0.25, H = (a, b) => this.terrain.heightAt(a, b);
    const gx = (H(x + e, z) - H(x - e, z)) / (2 * e), gz = (H(x, z + e) - H(x, z - e)) / (2 * e);
    const s = Math.hypot(gx, gz);
    return s > limit ? { slope: s, dx: -gx / s, dz: -gz / s } : null;
  }

  // Is there a solid brick at this point above height y?
  blockedAt(x, z, y, r = 0) {
    for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
      if (!c.enabled) continue;
      if ((c.top > y + STEP_UP || (c.block && c.top > y + BLOCK_LOW)) && c.bottom < y + 1.6 && this._inside(c, x, z, r)) return true;
    }
    return false;
  }

  // Is the point (x, y, z) inside a solid brick, within r? (projectiles: no step-up allowance)
  solidAt(x, z, y, r = 0) {
    for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
      if (!c.enabled || c.seeThrough && c.noBall) continue;
      if (c.top > y - r && c.bottom < y + r && this._inside(c, x, z, r)) return true;
    }
    return false;
  }

  // ... and which one (ACTION-SOUND-2: the ball's bounce asks what it struck), or null
  solidCollider(x, z, y, r = 0) {
    for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
      if (!c.enabled || c.seeThrough && c.noBall) continue;
      if (c.top > y - r && c.bottom < y + r && this._inside(c, x, z, r)) return c;
    }
    return null;
  }

  // Is the point inside a collider that is seen through but stops the ball (a chain-link fence, a railing; not one
  // marked noBall)? Line of sight passes these, solidAt does not: the aim uses this to leave out what the ball can't reach.
  ballFenceAt(x, z, y, r = 0) {
    for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
      if (c.enabled && c.seeThrough && !c.noBall && c.top > y - r && c.bottom < y + r && this._inside(c, x, z, r)) return true;
    }
    return false;
  }
  // ... anywhere on the straight line from a to b, stopping `margin` metres (horizontally) short of b
  ballFenceBetween(ax, ay, az, bx, by, bz, margin = 0, r = 0) {
    const d = Math.hypot(bx - ax, bz - az);
    if (d <= margin) return false;
    const n = Math.ceil((d - margin) / 0.1), k = (d - margin) / d;
    for (let i = 1; i <= n; i++) {
      const t = (i / n) * k;
      if (this.ballFenceAt(ax + (bx - ax) * t, az + (bz - az) * t, ay + (by - ay) * t, r)) return true;
    }
    return false;
  }

  // Move an actor (pos: Vector3, radius) by dx,dz with sliding + step/slope rules.
  // (GC-STREET: a method, not a closure made at every move; the ground asked without groundInfo's object)
  _tryMove(actor, p, nx, nz) {
    const g = this._ground(nx, nz, p.y), brick = this._brick;
    if (g < WATER_FLOOR && !brick && !actor.canSwim) return false; // (a floor or stairs below sea level are not sea)
    const rise = g - p.y;
    if (actor.onGround) {
      if (rise > STEP_UP) return false;
      // terrain steeper than MAX_SLOPE is a cliff; bricks are steps
      if (!brick && rise > 0.01 && rise > Math.hypot(nx - p.x, nz - p.z) * MAX_SLOPE) return false;
    } else if (rise > 0.25) return false;
    return true;
  }

  move(actor, dx, dz) {
    const p = actor.pos;
    const r = actor.radius;
    let nx = p.x + dx, nz = p.z + dz;
    if (!this._tryMove(actor, p, nx, nz)) {
      if (this._tryMove(actor, p, p.x + dx, p.z)) { nx = p.x + dx; nz = p.z; }
      else if (this._tryMove(actor, p, p.x, p.z + dz)) { nx = p.x; nz = p.z + dz; }
      else { nx = p.x; nz = p.z; }
    }
    // push out of blocking bricks
    for (let it = 0; it < 2; it++) {
      for (let ni = 0, NL = this.near(nx, nz); ni < NL.length; ni++) { const c = NL[ni];
        if (!c.enabled || c.stair) continue; // (stairs: the height under the feet decides, step by step)
        if ((c.top <= p.y + STEP_UP && !(c.block && c.top > p.y + BLOCK_LOW)) || c.bottom > p.y + 1.7) continue;
        const push = this._push(c, nx, nz, r);
        if (push) { nx += push.x; nz += push.z; }
      }
    }
    // the push may have shoved us into the sea or up a cliff — refuse in that case
    if (!this._tryMove(actor, p, nx, nz)) { nx = p.x; nz = p.z; }
    p.x = nx; p.z = nz;
  }

  // Does this brick stop an actor whose feet are at y? (the bricks move() pushes him out of)
  stops(c, y) {
    return c.enabled && !c.stair && !((c.top <= y + STEP_UP && !(c.block && c.top > y + BLOCK_LOW)) || c.bottom > y + 1.7);
  }

  // How far a circle (x, z, r) with the feet at y reaches into the bricks that stop an actor there (the same bricks
  // move() pushes him out of); 0: clear of them all. (DEPOT-CORNER: a save made where he stood wedged, game.unwedge)
  overlapAt(x, z, y, r) {
    let worst = 0;
    for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
      if (!this.stops(c, y) || !this._inside(c, x, z, r)) continue;
      const push = this._push(c, x, z, r);
      worst = Math.max(worst, push ? Math.hypot(push.x, push.z) : r);
    }
    return worst;
  }

  // Vertical integration; returns true when landing this frame. (actor.gravity: an actor's own for the moment — the
  // hero's jump, actors.js JUMP — else GRAVITY)
  fall(actor, dt) {
    const p = actor.pos;
    const g = this.groundAt(p.x, p.z, p.y);
    actor.groundY = g;
    if (actor.onGround) {
      if (p.y - g > 0.6) { actor.onGround = false; actor.vy = 0; }
      else { p.y = g; actor.vy = 0; return false; }
    }
    // FPS30: the fall as a 60 fps step makes it, at any step: 60's step (vy -= g·h; y += vy·h, h = 1/60) is the exact arc
    // of a take-off g/120 slower, so y += (vy − g·(dt + 1/60)/2)·dt is that arc exactly — identical to before at 60 fps,
    // and a jump at 30 (or 144) rises as high and lands when it does at 60 (at 30 it was 5 cm lower, at 144 3 cm higher)
    const gr = actor.gravity || GRAVITY;
    p.y += (actor.vy - gr * (dt + 1 / 60) * 0.5) * dt;
    actor.vy -= gr * dt;
    if (p.y <= g) {
      p.y = g;
      const impact = actor.vy;
      actor.vy = 0;
      actor.onGround = true;
      return impact;
    }
    return false;
  }

  // Line of sight that stops `margin` metres short of b (for targets mounted on, or inside, a collider)
  clearTo(ax, ay, az, bx, by, bz, margin = 0.7) {
    const d = Math.hypot(bx - ax, by - ay, bz - az);
    if (d <= margin) return true;
    const k = (d - margin) / d;
    return this.lineOfSight(ax, ay, az, ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k);
  }

  // Ray-march line of sight between two points (used by guards' vision).
  lineOfSight(ax, ay, az, bx, by, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / 0.25); // fine enough not to step over a thin wall
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t;
      if (this.terrain.heightAt(x, z) > y) return false;
      for (let ni = 0, NL = this.near(x, z); ni < NL.length; ni++) { const c = NL[ni];
        if (c.enabled && !c.seeThrough && c.top > y && c.bottom < y && this._inside(c, x, z)) return false;
      }
    }
    return true;
  }
}
