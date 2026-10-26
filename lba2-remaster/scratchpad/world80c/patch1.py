p = 'src/game/world.js'; s = open(p).read()
def R(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:80]); s = s.replace(a, b)
R("""export function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}""", """export function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}
// WORLD-80: the scatter of trees, bushes, grass, flowers, tulip beds, rocks and the cliffs' rock faces draws its places
// from one random sequence each, so a decision that changes moves everything drawn after it, all over the island (and
// the bushes' and rocks' colliders with it). The scatter decides with the paths, the houses and the west islet's
// ground as they stood before WORLD-80 step 2; whatever now stands on the new path, in the new houses or on the
// islet's new rock face is taken out after the scatter (shrunk to nothing, no collider), as townlife's places are.
const PATHS_SCATTER = PATHS.map((p, i) => (i === 4 ? [[-58, -6], [-66, -18]] : p));
function pathDistScatter(x, z) {
  let d = 1e9;
  for (const p of PATHS_SCATTER) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}
const newPathDist = (x, z) => { const p = PATHS[4]; let d = 1e9; for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1])); return d; };
const NEW_HOUSES = new Set(['bug', 'bug2', 'stoneup']);   // (moved or added by WORLD-80; 'bug' stood at the old place below)
const OLD_BUG = { x: -57, z: -16.8, ry: 0.25, w: 7.6, d: 6.2 };""")
R("""function terraces(x, z) {""", """let NO_LIFT = false;   // (true while the scatter's copy of the islet's old ground is computed: scatterGround)
function terraces(x, z) {""")
R("""    h += (k === 3 && x < ISLET_X ? LEVEL_STEP + ISLET_LIFT : LEVEL_STEP) * s;""", """    h += (k === 3 && x < ISLET_X && !NO_LIFT ? LEVEL_STEP + ISLET_LIFT : LEVEL_STEP) * s;""")
R("""  if (x < ISLET_X) { const D = ISLET.dome,""", """  if (x < ISLET_X && !NO_LIFT) { const D = ISLET.dome,""")
R("""// ---------- the terrain grid, checked for soft-locks ----------""", """// WORLD-80: the ground as the scatter sees it (PATHS_SCATTER): the terrain's own, except on the west islet, where it is
// the islet's ground before its top was raised: the same grid points (computed without the lift; the trap filler never
// reaches the islet) and the same triangles as Terrain.heightAt.
function scatterGround(T) {
  const n = T.segs + 1, I1 = Math.ceil((ISLET_X + 1 - T.x0) / T.step), J0 = Math.max(0, Math.floor((-45 - T.z0) / T.step)), J1 = Math.min(T.segs, Math.ceil((25 - T.z0) / T.step));
  const W1 = I1 + 1, pre = new Float32Array(W1 * (J1 - J0 + 1));
  NO_LIFT = true;
  for (let j = J0; j <= J1; j++) for (let i = 0; i <= I1; i++) pre[(j - J0) * W1 + i] = islandHeight(T.x0 + i * T.step, T.z0 + j * T.step);
  NO_LIFT = false;
  const hv = (i, j) => { i = Math.max(0, Math.min(T.segs, i)); j = Math.max(0, Math.min(T.segs, j)); return i <= I1 && j >= J0 && j <= J1 ? pre[(j - J0) * W1 + i] : T.heights[j * n + i]; };
  const heightAt = (x, z) => {
    if (x > ISLET_X + 4) return T.heightAt(x, z);
    const gx = (x - T.x0) / T.step, gz = (z - T.z0) / T.step, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const h00 = hv(i, j), h10 = hv(i + 1, j), h01 = hv(i, j + 1), h11 = hv(i + 1, j + 1);
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  };
  const slopeAt = (x, z) => {
    if (x > ISLET_X + 6) return T.slopeAt(x, z);
    const e = T.step, dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  };
  return { heightAt, slopeAt };
}

// ---------- the terrain grid, checked for soft-locks ----------""")
R("""    skip: (x, z) => pathDist(x, z) < 3.2 || boxDist(""", """    skip: (x, z) => pathDistScatter(x, z) < 3.2 || boxDist(""")
R("""  const inHouse = (x, z, pad) => W.houses.some((h) => {
    const dx = x - h.x, dz = z - h.z, lx = dx * Math.cos(h.ry) - dz * Math.sin(h.ry), lz = dx * Math.sin(h.ry) + dz * Math.cos(h.ry);
    return Math.abs(lx) < h.w / 2 + pad && Math.abs(lz) < h.d / 2 + pad;
  });
  const okSpot = (x, z, clear = 3) => {
    const h = H(x, z);
    if (h < 1.3) return false;
    if (terrain.slopeAt(x, z) > 0.55) return false;
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r) return false;
    if (pathDist(x, z) < clear) return false;""", """  const inHouseOf = (list) => (x, z, pad) => list.some((h) => {
    const dx = x - h.x, dz = z - h.z, lx = dx * Math.cos(h.ry) - dz * Math.sin(h.ry), lz = dx * Math.sin(h.ry) + dz * Math.cos(h.ry);
    return Math.abs(lx) < h.w / 2 + pad && Math.abs(lz) < h.d / 2 + pad;
  });
  const inHouse = inHouseOf(W.houses);
  // (WORLD-80: the scatter's view — the houses, paths and islet ground before step 2 — and what changed, filtered after)
  const SCATTER_HOUSES = W.houses.filter((h) => h.id !== 'bug2' && h.id !== 'stoneup').map((h) => (h.id === 'bug' ? { ...h, ...OLD_BUG } : h));
  const inHouseS = inHouseOf(SCATTER_HOUSES), inNewHouse = inHouseOf(W.houses.filter((h) => NEW_HOUSES.has(h.id)));
  const SG = scatterGround(terrain), HS = SG.heightAt;
  const isletSteep = (x, z, s) => x < ISLET_X + 2 && terrain.slopeAt(x, z) > s;
  const okSpot = (x, z, clear = 3) => {
    const h = HS(x, z);
    if (h < 1.3) return false;
    if (SG.slopeAt(x, z) > 0.55) return false;
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r) return false;
    if (pathDistScatter(x, z) < clear) return false;""")
R("""  for (const [x, z, k] of PROPS.trees) {
    const h = H(x, z);
    if (h < 1.0 || terrain.slopeAt(x, z) > 0.6 || inHouse(x, z, 1.6) || pathDist(x, z) < 1.8 || streetDist(x, z) < 0.9 || keepClear(x, z, 1.2)) continue;""", """  for (const [x, z, k] of PROPS.trees) {
    const h = H(x, z);
    if (HS(x, z) < 1.0 || SG.slopeAt(x, z) > 0.6 || inHouseS(x, z, 1.6) || pathDistScatter(x, z) < 1.8 || streetDist(x, z) < 0.9 || keepClear(x, z, 1.2)) continue;""")
R("""[-59.5, 8.5, 'round', 0.9], [-34.5, -23, 'pine', 1.1]]) if (!inHouse(x, z, 1.2) &&""", """[-59.5, 8.5, 'round', 0.9], [-34.5, -23, 'pine', 1.1]]) if (!inHouseS(x, z, 1.2) &&""")
R("""[-27.6, -13.7], [-58.4, -1.8], [-26.5, 9.6]]) if (!inHouse(x, z, 0.8)) bushes.push""", """[-27.6, -13.7], [-58.4, -1.8], [-26.5, 9.6]]) if (!inHouseS(x, z, 0.8)) bushes.push""")
R("""  for (const t of trees) if (!t.gone && doorLane(t.x, t.z, 0.45 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && doorLane(b.x, b.z, 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }""", """  for (const t of trees) if (!t.gone && doorLane(t.x, t.z, 0.45 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && doorLane(b.x, b.z, 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }
  // (WORLD-80: off the new path to the stepping stones, out of Bug Street's pair and the stone house's porch, off the
  // islet's raised rock face)
  for (const t of trees) if (!t.gone && (newPathDist(t.x, t.z) < 2.2 || inNewHouse(t.x, t.z, 1.4) || isletSteep(t.x, t.z, 0.55))) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && (newPathDist(b.x, b.z) < 1.9 || inNewHouse(b.x, b.z, 0.9) || isletSteep(b.x, b.z, 0.55))) { b.s = 1e-4; b.gone = true; }""")
R("""    const h = H(x, z);
    if (h < 1.2 || terrain.slopeAt(x, z) > 0.6) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.5) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 32 && (streetDist(x, z) < 0.5 || inHouse(x, z, 0.4))) continue;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 11) continue;
    if (pathDist(x, z) < 1.4 || townSoil(x, z) > 0.3) continue;""", """    const h = H(x, z);
    if (HS(x, z) < 1.2 || SG.slopeAt(x, z) > 0.6) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.5) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 32 && (streetDist(x, z) < 0.5 || inHouseS(x, z, 0.4))) continue;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 11) continue;
    if (pathDistScatter(x, z) < 1.4 || townSoil(x, z) > 0.3) continue;""")
R("""streetDist(x, z) < 0.4 || inHouse(x, z, 0.25) || !inHouse(x, z, 1.4) || townSoil(x, z) > 0.5) continue;""", """streetDist(x, z) < 0.4 || inHouseS(x, z, 0.25) || !inHouseS(x, z, 1.4) || townSoil(x, z) > 0.5) continue;""")
R("""  clearLife(grass); clearLife(flowers);""", """  clearLife(grass); clearLife(flowers);
  for (const t of [...grass, ...flowers]) if (!t.gone && (inNewHouse(t.x, t.z, 0.4) || isletSteep(t.x, t.z, 0.6))) { t.s = 1e-4; t.gone = true; }   // (WORLD-80)""")
R("""  const bedOk = (x, z) => {
    const h = H(x, z);
    if (h < 1.3 || terrain.slopeAt(x, z) > 0.35) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.8) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 34 && (streetDist(x, z) < 0.7 || inHouse(x, z, 0.5))) return false;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 15) return false;
    if (pathDist(x, z) < 1.7 || keepClear(x, z, 0.2)) return false;""", """  const bedOk = (x, z) => {
    const h = HS(x, z);
    if (h < 1.3 || SG.slopeAt(x, z) > 0.35) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.8) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 34 && (streetDist(x, z) < 0.7 || inHouseS(x, z, 0.5))) return false;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 15) return false;
    if (pathDistScatter(x, z) < 1.7 || keepClear(x, z, 0.2)) return false;""")
R("""  for (const path of PATHS) {
    for (let i = 0; i < path.length - 1; i++) {""", """  for (const path of PATHS_SCATTER) {
    for (let i = 0; i < path.length - 1; i++) {""")
R("""  // beds along the town's house fronts
  for (const hs of W.houses || []) {""", """  // beds along the town's house fronts
  for (const hs of SCATTER_HOUSES) {""")
R("""  const lifeBeds = new Set(); for (const list of beds) for (const t of list) if (lifeClear(t.x, t.z)) lifeBeds.add(t.bed);""", """  const lifeBeds = new Set(); for (const list of beds) for (const t of list) if (lifeClear(t.x, t.z) || inNewHouse(t.x, t.z, 0.6) || newPathDist(t.x, t.z) < 1.7) lifeBeds.add(t.bed);""")
R("""    const h = H(x, z);
    if (h < -1 || h > 18) continue;
    if (!okSpot(x, z, 2.5) && h > 1.3) continue;
    rocks.push({ x, z, h: h - 0.1, s: 0.3 + rand() * 0.8, ry: rand() * 6 });
  }
  for (const r of rocks) if (doorLane(r.x, r.z, r.s * 1.1) || isletClear(r.x, r.z)) r.s = 1e-4;   // (the doors' lanes, as the trees and bushes; the islet's dome)""", """    const h = H(x, z), hs = HS(x, z);
    if (hs < -1 || hs > 18) continue;
    if (!okSpot(x, z, 2.5) && hs > 1.3) continue;
    rocks.push({ x, z, h: h - 0.1, s: 0.3 + rand() * 0.8, ry: rand() * 6 });
  }
  // (the doors' lanes, as the trees and bushes; WORLD-80: the new path, the new houses, the islet's dome and rock face)
  for (const r of rocks) if (doorLane(r.x, r.z, r.s * 1.1) || isletClear(r.x, r.z) || newPathDist(r.x, r.z) < 2.5 || inNewHouse(r.x, r.z, r.s * 1.1 + 0.3) || (r.h > 1.2 && isletSteep(r.x, r.z, 0.55))) r.s = 1e-4;""")
open(p, 'w').write(s)
print('ok')
