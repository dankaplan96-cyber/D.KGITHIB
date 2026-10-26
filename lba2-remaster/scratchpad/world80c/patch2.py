p = 'src/game/town.js'; s = open(p).read()
def R(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:80]); s = s.replace(a, b)
# no pad for the WORLD-80 houses (their floors are enough): noPad instead of the tiny pad
R("{ id: 'bug', x: -61.4, z: -14.3, ry: Math.PI / 2, pad: 0.01,", "{ id: 'bug', x: -61.4, z: -14.3, ry: Math.PI / 2, noPad: true,")
R("{ id: 'bug2', x: -62.3, z: -8.2, ry: Math.PI / 2, pad: 0.01,", "{ id: 'bug2', x: -62.3, z: -8.2, ry: Math.PI / 2, noPad: true,")
R("{ id: 'stoneup', x: -25.25, z: -31.45, ry: Math.PI, pad: 0.01,", "{ id: 'stoneup', x: -25.25, z: -31.45, ry: Math.PI, noPad: true,")
R("// the south one. They stand on one floor (flatWith) and no pad of their own (pad ~0: the floor is enough).",
  "// the south one. They stand on one floor (flatWith) and no pad of their own (noPad: their floors are enough).")
R("""for (const h of HOUSES) if (!h.pad && Math.hypot(h.x - V.x, h.z - V.z) > 18) h.pad = Math.max(h.w, h.d) * 0.75 + 2;
export const HOUSE_KEEP = HOUSES.filter((h) => !h.pad).map((h) => [h.x, h.z, Math.max(h.w, h.d) * 0.72]);

// houses that stand outside the town core get a level pad (world.js)
export const HOUSE_PADS = HOUSES.filter((h) => h.pad).map((h) => ({ x: h.x, z: h.z, r: h.pad }));""",
"""for (const h of HOUSES) if (!h.pad && !h.noPad && Math.hypot(h.x - V.x, h.z - V.z) > 18) h.pad = Math.max(h.w, h.d) * 0.75 + 2;
export const HOUSE_KEEP = HOUSES.filter((h) => !h.pad && !h.noPad).map((h) => [h.x, h.z, Math.max(h.w, h.d) * 0.72]);

// houses that stand outside the town core get a level pad (world.js)
const padsOf = (list) => list.filter((h) => h.pad).map((h) => ({ x: h.x, z: h.z, r: h.pad }));
export const HOUSE_PADS = padsOf(HOUSES);""")
R("""export const HOUSE_FLATS = HOUSES.map((h) => {
  const c = Math.cos(h.ry), s = Math.sin(h.ry), dx = h.door?.x ?? 0, dz = h.d / 2 + 0.9;
  return { id: h.id, x: h.x, z: h.z, c, s, hw: h.w / 2, hd: h.d / 2, flat: h.flat ?? 1.15, ease: h.ease ?? 2.6, door: [h.x + c * dx + s * dz, h.z - s * dx + c * dz] };
});
// (WORLD-80: two houses built side by side stand on one floor: the level before the first one's door)
for (const f of HOUSE_FLATS) { const w = HOUSES.find((h) => h.id === f.id).flatWith; if (w) f.with = HOUSE_FLATS.findIndex((g) => g.id === w); }""",
"""const flatsOf = (list) => {
  const F = list.map((h) => {
    const c = Math.cos(h.ry), s = Math.sin(h.ry), dx = h.door?.x ?? 0, dz = h.d / 2 + 0.9;
    return { id: h.id, x: h.x, z: h.z, c, s, hw: h.w / 2, hd: h.d / 2, flat: h.flat ?? 1.15, ease: h.ease ?? 2.6, door: [h.x + c * dx + s * dz, h.z - s * dx + c * dz] };
  });
  // (WORLD-80: two houses built side by side stand on one floor: the level before the named one's door)
  for (const [i, h] of list.entries()) if (h.flatWith) F[i].with = list.findIndex((g) => g.id === h.flatWith);
  return F;
};
export const HOUSE_FLATS = flatsOf(HOUSES);
// WORLD-80: the houses as they stood before step 2 (Bug Street's one house between the original's pair, no porch on
// the terrace): world.js's scatter decides with the ground they made, so nothing else on the island moves
export const OLD_BUG = { id: 'bug', x: -57, z: -16.8, ry: 0.25, w: 7.6, d: 6.2, door: { x: 1.9 } };
OLD_BUG.pad = Math.max(OLD_BUG.w, OLD_BUG.d) * 0.75 + 2;
const HOUSES_PRE = HOUSES.filter((h) => h.id !== 'bug2' && h.id !== 'stoneup').map((h) => (h.id === 'bug' ? OLD_BUG : h));
export const HOUSE_PADS_PRE = padsOf(HOUSES_PRE), HOUSE_FLATS_PRE = flatsOf(HOUSES_PRE);""")
open(p, 'w').write(s)

p = 'src/game/world.js'; s = open(p).read()
R("import { buildTown, townHeight, streetDist, HOUSE_PADS, HOUSE_KEEP, HOUSE_FLATS } from './town.js';",
  "import { buildTown, townHeight, streetDist, HOUSE_PADS, HOUSE_KEEP, HOUSE_FLATS, HOUSE_PADS_PRE, HOUSE_FLATS_PRE, OLD_BUG } from './town.js';")
R("""const NEW_HOUSES = new Set(['bug', 'bug2', 'stoneup']);   // (moved or added by WORLD-80; 'bug' stood at the old place below)
const OLD_BUG = { x: -57, z: -16.8, ry: 0.25, w: 7.6, d: 6.2 };""", """const NEW_HOUSES = new Set(['bug', 'bug2', 'stoneup']);   // (moved or added by WORLD-80; 'bug' stood at town.js OLD_BUG)""")
R("let NO_LIFT = false;   // (true while the scatter's copy of the islet's old ground is computed: scatterGround)",
  "let PRE80 = false;   // (true while the scatter's copy of the ground before WORLD-80 step 2 is computed: scatterGround)")
R("    h += (k === 3 && x < ISLET_X && !NO_LIFT ? LEVEL_STEP + ISLET_LIFT : LEVEL_STEP) * s;",
  "    h += (k === 3 && x < ISLET_X && !PRE80 ? LEVEL_STEP + ISLET_LIFT : LEVEL_STEP) * s;")
R("  if (x < ISLET_X && !NO_LIFT) { const D = ISLET.dome,", "  if (x < ISLET_X && !PRE80) { const D = ISLET.dome,")
R("    for (const p of HOUSE_PADS) h = lerp(h, LEVEL0 + 0.05,", "    for (const p of PRE80 ? HOUSE_PADS_PRE : HOUSE_PADS) h = lerp(h, LEVEL0 + 0.05,")
R("""let profiles = null;
function buildProfiles() {
  profiles = PATHS.map((p) => {""", """let profiles = null, profilesPre = null;
function buildProfiles(paths) {
  return paths.map((p) => {""")
R("""function pathRamp(x, z, h) {
  if (!profiles) buildProfiles();
  let wsum = 0, hsum = 0, wmax = 0;
  for (const P of profiles) {""", """function pathRamp(x, z, h) {
  if (PRE80) profilesPre ??= buildProfiles(PATHS_SCATTER); else profiles ??= buildProfiles(PATHS);
  let wsum = 0, hsum = 0, wmax = 0;
  for (const P of PRE80 ? profilesPre : profiles) {""")
R("""let FLAT_LVL = null;
function houseFlats(x, z, h) {
  FLAT_LVL ??= HOUSE_FLATS.map((f) => islandHeight0(f.door[0], f.door[1])).map((v, i, a) => (HOUSE_FLATS[i].with != null ? a[HOUSE_FLATS[i].with] : v));
  for (let i = 0; i < HOUSE_FLATS.length; i++) {
    const f = HOUSE_FLATS[i], dx = x - f.x, dz = z - f.z, R = f.flat + f.ease;""", """let FLAT_LVL = null, FLAT_LVL_PRE = null;
const flatLevels = (F) => F.map((f) => islandHeight0(f.door[0], f.door[1])).map((v, i, a) => (F[i].with != null ? a[F[i].with] : v));
function houseFlats(x, z, h) {
  const FL = PRE80 ? HOUSE_FLATS_PRE : HOUSE_FLATS;
  const LV = PRE80 ? (FLAT_LVL_PRE ??= flatLevels(FL)) : (FLAT_LVL ??= flatLevels(FL));
  for (let i = 0; i < FL.length; i++) {
    const f = FL[i], dx = x - f.x, dz = z - f.z, R = f.flat + f.ease;""")
R("    if (d < R) h = lerp(FLAT_LVL[i], h, smoothstep(f.flat, R, d));", "    if (d < R) h = lerp(LV[i], h, smoothstep(f.flat, R, d));")
# scatterGround: boxes (the islet, Bug Street with both paths' ramps, the stone house's porch)
R("""// WORLD-80: the ground as the scatter sees it (PATHS_SCATTER): the terrain's own, except on the west islet, where it is
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
}""", """// WORLD-80: the ground as the scatter sees it (PATHS_SCATTER): the ground before step 2 where step 2 changed it — the
// west islet (its raised top, the dome's floor), Bug Street (its pair's floors, the path round them) and the stone
// house's porch — on the terrain's own grid points (computed as before; the trap filler never reached those places)
// and its own triangles (Terrain.heightAt); elsewhere the terrain itself.
const PRE80_BOXES = [[-206, -45, ISLET_X + 1, 25], [-76, -30, -46, 2], [-33, -38, -18, -24]];
function scatterGround(T) {
  const n = T.segs + 1, pre = new Map();
  const ix = (x) => Math.round((x - T.x0) / T.step), jz = (z) => Math.round((z - T.z0) / T.step);
  PRE80 = true;
  for (const [x0, z0, x1, z1] of PRE80_BOXES) {
    for (let j = Math.max(0, jz(z0)); j <= Math.min(T.segs, jz(z1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(T.segs, ix(x1)); i++) {
      const k = j * n + i; if (!pre.has(k)) pre.set(k, islandHeight(T.x0 + i * T.step, T.z0 + j * T.step));
    }
  }
  PRE80 = false;
  const hv = (i, j) => { i = Math.max(0, Math.min(T.segs, i)); j = Math.max(0, Math.min(T.segs, j)); const k = j * n + i; return pre.has(k) ? pre.get(k) : T.heights[k]; };
  const near = (x, z, m) => PRE80_BOXES.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  const heightAt = (x, z) => {
    if (!near(x, z, 2)) return T.heightAt(x, z);
    const gx = (x - T.x0) / T.step, gz = (z - T.z0) / T.step, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const h00 = hv(i, j), h10 = hv(i + 1, j), h01 = hv(i, j + 1), h11 = hv(i + 1, j + 1);
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  };
  const slopeAt = (x, z) => {
    if (!near(x, z, 4)) return T.slopeAt(x, z);
    const e = T.step, dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  };
  return { heightAt, slopeAt, changed: (x, z) => near(x, z, 0) && Math.abs(heightAt(x, z) - T.heightAt(x, z)) > 0.05 };
}""")
R("""  const SCATTER_HOUSES = W.houses.filter((h) => h.id !== 'bug2' && h.id !== 'stoneup').map((h) => (h.id === 'bug' ? { ...h, ...OLD_BUG } : h));""",
  """  const SCATTER_HOUSES = W.houses.filter((h) => h.id !== 'bug2' && h.id !== 'stoneup').map((h) => (h.id === 'bug' ? { ...h, ...OLD_BUG, door: null } : h));""")
open(p, 'w').write(s)
print('ok')
