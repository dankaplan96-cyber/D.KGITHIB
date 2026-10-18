// Scenery between the play camera and Twinsen, handled the way LBA2 handles it (VP-10).
//
// What LBA2 does (GPL source, github.com/2point21/lba2-classic; docs/lba3-visual/evidence/VP-10/README.md): nothing
// outdoors ever fades, turns see-through or is cut away (a scenery object is only ever hidden by a story variable,
// DEC_INVISIBLE). Instead, each time the exterior camera re-centres (Twinsen near the edge of the screen, Enter,
// a scene start), SearchCameraPos (3DEXT/MAPTOOLS.CPP) walks the sight line from Twinsen (512 units above his feet)
// back toward where the camera would stand, in 512-unit steps from 1000 units out to the view distance. Where a step
// lies under the terrain or inside a scenery object's box (its ZV, or a scripted object's box), that point is lifted
// to the top + 200 units and the pitch (AlphaCam) is re-aimed from Twinsen through it; later steps follow the
// steeper line. The camera keeps its heading and distance and so rises over whatever stood in the way, and the
// look-ahead (DISTANCE_VISEE) shrinks along the view as the view steepens (to nothing looking straight down). The
// shot stays until the next re-centre, which starts again from the default pitch (FlagCameraForcee).
//
// Here: the same search over volumes that the builders register (houses, the fortress, the project buildings, the
// spaceport terminal and its dome, Nell's lean-to roof) plus the terrain. A volume is an oriented box, optionally
// with a roof slope across its local x (a gable or a barrel roof's ridge), or an upright solid of revolution given
// as a radius → height profile (a tower and its cone, a dome). They are tighter than LBA2's single bounding box per
// object (a house is its walls plus its roof's slope, not the box round its ridge), so the camera rises only as far
// as the real roof line needs: the rule is LBA2's, the volumes are finer. The steps are 0.25 m (LBA2: 512 units).
//
// CONTRACT: occOf(W) → the world's registry (made on first use). reg.add(volume) with
//   { kind: 'box', x, z, hw, hd, rot = 0, y0, y1, slope = 0 }  top at local (lx, lz) = y1 - slope·|lx|
//   { kind: 'rev', x, z, y0, base, profile: [[r, h], …] }     r ascending; top at radius r = base + h(r) (linear)
// A volume marked camOnly (the pipeline's tube) is one the camera only keeps its own spot out of (camera.js
// _clearance, BUG-WALL): the search and the hidden test pass through it, so the view never rises over a pipe.
// reg.search(hero, yaw, pitch, dist, opts) → the pitch LBA2 would use; reg.blocked(a, b) → is the segment a→b
// through scenery or terrain (volumes Twinsen stands under are left out: no camera height can show him there).
export const EYE = 0.65;        // LBA2: 512 units above the feet (Twinsen ≈ 1400 units tall)
export const LIFT = 0.25;       // LBA2: 200 units above the top of what is in the way
const STEP = 0.25, START = 1.0;
const CELL = 12;

export class Occluders {
  constructor(terrain) { this.terrain = terrain; this.list = []; this.grid = new Map(); this.under = new Set(); }

  add(v) {
    v.rot ??= 0; v.slope ??= 0;
    v.cos = Math.cos(v.rot); v.sin = Math.sin(v.rot);
    if (v.kind === 'rev') v.R = v.profile[v.profile.length - 1][0];
    const R = v.kind === 'rev' ? v.R : Math.hypot(v.hw, v.hd);
    v.top = v.kind === 'rev' ? v.base + Math.max(...v.profile.map((p) => p[1])) : v.y1;
    for (let i = Math.floor((v.x - R) / CELL); i <= Math.floor((v.x + R) / CELL); i++) {
      for (let j = Math.floor((v.z - R) / CELL); j <= Math.floor((v.z + R) / CELL); j++) {
        const k = i + ',' + j;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(v);
      }
    }
    this.list.push(v);
    return v;
  }

  near(x, z) { return this.grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)) || NONE; }

  // the top of v above (x, z), or -Infinity off its footprint
  topAt(v, x, z) {
    const dx = x - v.x, dz = z - v.z;
    if (v.kind === 'rev') {
      const r = Math.hypot(dx, dz), P = v.profile;
      if (r > v.R) return -Infinity;
      if (r <= P[0][0]) return v.base + P[0][1];
      for (let i = 1; i < P.length; i++) if (r <= P[i][0]) { const [r0, h0] = P[i - 1], [r1, h1] = P[i]; return v.base + h0 + (h1 - h0) * (r - r0) / (r1 - r0); }
      return v.base + P[P.length - 1][1];
    }
    const lx = dx * v.cos - dz * v.sin, lz = dx * v.sin + dz * v.cos;
    if (Math.abs(lx) > v.hw || Math.abs(lz) > v.hd) return -Infinity;
    return v.y1 - v.slope * Math.abs(lx);
  }

  // the highest top among the volumes that hold (x, y, z) (not those in skip), or -Infinity
  hit(x, y, z, skip = this.under) {
    let best = -Infinity;
    for (const v of this.near(x, z)) {
      if (y < v.y0 || y > v.top || v.camOnly || skip.has(v)) continue;
      const t = this.topAt(v, x, z);
      if (y <= t && t > best) best = t;
    }
    return best;
  }

  // the volumes over Twinsen's head (a roof he stands under): no camera height shows him there, so the search
  // and the hidden test leave them out (LBA2's scenery boxes are solid, so he is never under one)
  setUnder(hero) {
    this.under.clear();
    for (const v of this.near(hero.x, hero.z)) if (v.y0 > hero.y + 0.4 && this.topAt(v, hero.x, hero.z) > -Infinity) this.under.add(v);
    return this.under;
  }

  // LBA2's SearchCameraPos: the pitch at which the camera, `dist` from Twinsen along heading yaw (the camera's side),
  // looks over everything between; the default pitch when nothing is in the way
  search(hero, yaw, pitch, dist, { maxPitch = 1.4 } = {}) {
    this.setUnder(hero);
    const ox = hero.x, oy = hero.y + EYE, oz = hero.z, sy = Math.sin(yaw), cy = Math.cos(yaw);
    let p = pitch;
    for (let n = START; n < dist; n += STEP) {
      const hd = Math.cos(p) * n, x = ox + sy * hd, z = oz + cy * hd, y = oy + Math.sin(p) * n;
      let ny = y;
      const g = this.terrain ? this.terrain.heightAt(x, z) : -Infinity;
      if (g > ny) ny = g + LIFT;
      const t = this.hit(x, ny, z);
      if (t > -Infinity) ny = t + LIFT;
      if (ny !== y) p = Math.min(maxPitch, Math.max(p, Math.atan2(ny - oy, hd)));
    }
    return p;
  }

  // is the straight segment a → b through scenery or the terrain? (samples every STEP; volumes in `under` skipped)
  blocked(a, b, { terrain = true } = {}) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz), n = Math.ceil(L / STEP);
    for (let i = 1; i < n; i++) {
      const k = i / n, x = a.x + dx * k, y = a.y + dy * k, z = a.z + dz * k;
      if (terrain && this.terrain && this.terrain.heightAt(x, z) > y + 0.05) return true;
      if (this.hit(x, y, z) > -Infinity) return true;
    }
    return false;
  }
}
const NONE = [];

export const occOf = (W) => (W.occ ??= new Occluders(W.terrain));
