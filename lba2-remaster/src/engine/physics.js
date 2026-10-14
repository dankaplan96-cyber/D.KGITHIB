// Lightweight character physics in the spirit of the LBA2 engine:
// the ground is a heightfield, everything else is a set of simple
// "bricks" (cylinders and oriented boxes) that either block you or,
// when low enough, can be stood on.

export const GRAVITY = 26;
export const STEP_UP = 0.55;     // max height you can walk onto
export const WATER_FLOOR = -0.35; // deeper than this counts as sea (blocked)
export const MAX_SLOPE = 1.1;     // steepest walkable terrain (rise / run)

export class Physics {
  constructor(terrain) {
    this.terrain = terrain;
    this.colliders = [];
    this.cell = 8;
    this.grid = new Map();
  }

  _key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }

  add(c) {
    // c: {type:'cyl', x,z,r, top, bottom?} | {type:'box', x,z,hw,hd,rot, top, bottom?}
    c.bottom ??= -50;
    c.enabled ??= true;
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
    return this.grid.get(k) || [];
  }

  // Signed penetration test of a circle (x,z,r) against a collider.
  // Returns push-out vector or null.
  _push(c, x, z, r) {
    if (c.type === 'cyl') {
      const dx = x - c.x, dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d >= min) return null;
      if (d < 1e-5) return { x: min, z: 0 };
      return { x: (dx / d) * (min - d), z: (dz / d) * (min - d) };
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
    return { x: ox * c.cos + oz * c.sin, z: -ox * c.sin + oz * c.cos };
  }

  _inside(c, x, z, r = 0) {
    if (c.type === 'cyl') return Math.hypot(x - c.x, z - c.z) < c.r + r;
    const dx = x - c.x, dz = z - c.z;
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    return Math.abs(lx) < c.hw + r && Math.abs(lz) < c.hd + r;
  }

  // Highest surface under (x,z) that is reachable from height y.
  groundAt(x, z, y = Infinity) { return this.groundInfo(x, z, y).h; }

  groundInfo(x, z, y = Infinity) {
    let g = this.terrain.heightAt(x, z), brick = false;
    for (const c of this.near(x, z)) {
      if (!c.enabled || c.noStand) continue;
      if (c.top <= y + STEP_UP && c.top > g && this._inside(c, x, z, -0.05)) { g = c.top; brick = true; }
    }
    // Two floor bricks laid edge to edge leave a 0.1 m seam under the shrink above. Over water (every room is
    // built out over the sea, and the piers) that seam read as sea and stopped the hero dead at it (Twinsen
    // couldn't walk out of his own house): there, a brick within 6 cm still holds him. The same over a drop (the
    // Hamalayi lift's platform docked beside its ramp at the top of the cliff: the seam read as the cliff foot).
    if (!brick && (g < WATER_FLOOR || (Number.isFinite(y) && g < y - 0.6))) {
      for (const c of this.near(x, z)) {
        if (!c.enabled || c.noStand) continue;
        if (c.top <= y + STEP_UP && c.top > g && this._inside(c, x, z, 0.06)) { g = c.top; brick = true; }
      }
    }
    return { h: g, brick };
  }

  // Standing on bare terrain steeper than walkable? Returns the downhill direction (actors slide and can't
  // jump from there — otherwise a cliff can be climbed by hopping from one steep landing to the next).
  steepAt(x, z, y = Infinity, limit = MAX_SLOPE * 1.35) {
    if (this.groundInfo(x, z, y).brick) return null;
    const e = 0.25, H = (a, b) => this.terrain.heightAt(a, b);
    const gx = (H(x + e, z) - H(x - e, z)) / (2 * e), gz = (H(x, z + e) - H(x, z - e)) / (2 * e);
    const s = Math.hypot(gx, gz);
    return s > limit ? { slope: s, dx: -gx / s, dz: -gz / s } : null;
  }

  // Is there a solid brick at this point above height y?
  blockedAt(x, z, y, r = 0) {
    for (const c of this.near(x, z)) {
      if (!c.enabled) continue;
      if (c.top > y + STEP_UP && c.bottom < y + 1.6 && this._inside(c, x, z, r)) return true;
    }
    return false;
  }

  // Is the point (x, y, z) inside a solid brick, within r? (projectiles: no step-up allowance)
  solidAt(x, z, y, r = 0) {
    for (const c of this.near(x, z)) {
      if (!c.enabled || c.seeThrough && c.noBall) continue;
      if (c.top > y - r && c.bottom < y + r && this._inside(c, x, z, r)) return true;
    }
    return false;
  }

  // Move an actor (pos: Vector3, radius) by dx,dz with sliding + step/slope rules.
  move(actor, dx, dz) {
    const p = actor.pos;
    const r = actor.radius;
    const tryMove = (nx, nz) => {
      const gi = this.groundInfo(nx, nz, p.y);
      const g = gi.h;
      if (g < WATER_FLOOR && !gi.brick && !actor.canSwim) return false; // (a floor or stairs below sea level are not sea)
      const rise = g - p.y;
      if (actor.onGround) {
        if (rise > STEP_UP) return false;
        // terrain steeper than MAX_SLOPE is a cliff; bricks are steps
        if (!gi.brick && rise > 0.01 && rise > Math.hypot(nx - p.x, nz - p.z) * MAX_SLOPE) return false;
      } else if (rise > 0.25) return false;
      return true;
    };
    let nx = p.x + dx, nz = p.z + dz;
    if (!tryMove(nx, nz)) {
      if (tryMove(p.x + dx, p.z)) { nx = p.x + dx; nz = p.z; }
      else if (tryMove(p.x, p.z + dz)) { nx = p.x; nz = p.z + dz; }
      else { nx = p.x; nz = p.z; }
    }
    // push out of blocking bricks
    for (let it = 0; it < 2; it++) {
      for (const c of this.near(nx, nz)) {
        if (!c.enabled || c.stair) continue; // (stairs: the height under the feet decides, step by step)
        if (c.top <= p.y + STEP_UP || c.bottom > p.y + 1.7) continue;
        const push = this._push(c, nx, nz, r);
        if (push) { nx += push.x; nz += push.z; }
      }
    }
    // the push may have shoved us into the sea or up a cliff — refuse in that case
    if (!tryMove(nx, nz)) { nx = p.x; nz = p.z; }
    p.x = nx; p.z = nz;
  }

  // Vertical integration; returns true when landing this frame.
  fall(actor, dt) {
    const p = actor.pos;
    const g = this.groundAt(p.x, p.z, p.y);
    actor.groundY = g;
    if (actor.onGround) {
      if (p.y - g > 0.6) { actor.onGround = false; actor.vy = 0; }
      else { p.y = g; actor.vy = 0; return false; }
    }
    actor.vy -= GRAVITY * dt;
    p.y += actor.vy * dt;
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
      for (const c of this.near(x, z)) {
        if (c.enabled && !c.seeThrough && c.top > y && c.bottom < y && this._inside(c, x, z)) return false;
      }
    }
    return true;
  }
}
