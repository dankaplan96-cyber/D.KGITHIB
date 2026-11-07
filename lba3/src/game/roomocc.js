// VP-10 for the outdoor areas that are rooms (Zeelich and its islands, Desert Island, the Hamalayi): the camera handles
// the scenery between it and Twinsen as on Citadel and as in LBA2 — nothing fades or turns see-through; each new shot
// rises over whatever would hide him (src/engine/occlude.js, src/engine/camera.js). Citadel's builders register their
// shapes in W.occ; an outdoor room keeps its own registry in R.occ, which the play camera reads while he is in it
// (main.js: camRig.occ).
//
// Two ways in:
//   - a builder registers its buildings' shapes itself (roomOcc(R, terrain).add({...}) as occlude.js describes: tight
//     walls, a dome or a tower as a solid of revolution), and marks their colliders camSkip (the camera reads the
//     shape instead of the collider);
//   - every other solid an area's build added that stands at least OCC_MIN_H over the ground and is not a post, a tree
//     or a rail becomes a volume of its own collider's shape (occAuto, run for every outdoor room when its area is built:
//     regions.js). Such a volume follows its collider: while the collider is disabled (a gate opened, a shield off) the
//     camera passes through it.
//
// CONTRACT
//   roomOcc(R, terrain) → R.occ (made on first use); a volume { walkUnder: true } (a porch) is passed through while
//     Twinsen stands under it
//   occCollider(occ, c, { y0, top, name }) → the volume of collider c (box or cylinder); c becomes camSkip
//   occAuto(R, colliders, { terrain, floor }) → how many of `colliders` became volumes (R.occFloor: the lowest ground the
//     area's own floor stands on, for an area built of bricks over the clouds — Zeelich — so its floor is not "tall")
import { Occluders } from '../engine/occlude.js';

export const OCC_MIN_H = 1.8;   // m over the ground: lower solids (a crate, a bench, a low wall) the camera simply looks over

class RoomOccluders extends Occluders {
  // (a volume made from a collider is out while the collider is disabled; a porch he can walk under, walkUnder, is out
  //  while he stands under it: the camera keeps its arm and the porch fades instead, as Nell's lean-to on Citadel —
  //  from outside it is as solid as the rest)
  topAt(v, x, z) {
    if (v.src && !v.src.enabled) return -Infinity;
    if (v.walkUnder) { const h = globalThis.game?.hero?.pos; if (h && h.y < v.y1 && super.topAt(v, h.x, h.z) > -Infinity) return -Infinity; }
    return super.topAt(v, x, z);
  }
}

export function roomOcc(R, terrain) { return (R.occ ??= new RoomOccluders(terrain || null)); }

export function occCollider(occ, c, { y0 = null, top = null, name = '' } = {}) {
  const yb = y0 ?? (c.bottom > -50 ? c.bottom : -50), yt = top ?? c.top;
  c.camSkip = true;
  if (c.type === 'cyl') return occ.add({ kind: 'rev', x: c.x, z: c.z, y0: yb, base: yb, profile: [[c.r, yt - yb]], src: c, name });
  return occ.add({ kind: 'box', x: c.x, z: c.z, hw: c.hw, hd: c.hd, rot: c.rot || 0, y0: yb, y1: yt, src: c, name });
}

// is collider c a piece of scenery the camera should rise over? (not a post, a tree's trunk, a rail, a thin slab)
function sceneryLike(c, g) {
  if (!c.enabled || c.camSkip || c.seeThrough || c.fades || c.noCamOcc) return false;
  if (c.type === 'cyl') { if (c.r < 1.5) return false; }
  else if (Math.min(c.hw, c.hd) < 0.08 || c.hw * c.hd * 4 < 2.0) return false;
  const base = Math.max(c.bottom > -50 ? c.bottom : -Infinity, g);
  return c.top - base >= OCC_MIN_H;
}

export function occAuto(R, colliders, { terrain = null, floor = R.occFloor ?? -Infinity } = {}) {
  const occ = roomOcc(R, terrain);
  let n = 0;
  for (const c of colliders) {
    const g = Math.max(floor, terrain ? terrain.heightAt(c.x, c.z) : -Infinity);
    if (!sceneryLike(c, g)) continue;
    occCollider(occ, c, { y0: c.bottom > -50 ? c.bottom : (Number.isFinite(g) ? g - 1 : -50), name: 'auto' });
    n++;
  }
  R.occAuto = n;
  return n;
}
