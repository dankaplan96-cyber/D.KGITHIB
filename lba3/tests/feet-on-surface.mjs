// FEET-66 (OPEN-TASKS #66): his feet against the drawn surface he stands on, game-wide. SMALLFIX-26-11 saw his feet
// sink about 10 cm into the Hamalayi stream at the arch's steps; this suite looks for every place of that kind.
//   1. discovery (the drawn static geometry of each area, tests/lib/sweep.js's store, read raw): every spot where a
//      near-flat, up-facing drawn surface lies 3 cm - 0.6 m over the floor the physics gives him there (the terrain or a
//      collider's top), the spot standable (not steep, not inside something that stops him, not sea), the piece lying on
//      that floor (its part reaches down to within 12 cm of it, or a sheet within 35 cm): "sink" spots; and every
//      standable collider top with no drawn surface within 5 cm of it but one 5 cm - 0.6 m under it (an invisible
//      floor): "float" spots. Spots of one piece (one part, or one collider) are one candidate; candidates under
//      0.36 m^2 (a pebble, a collider's rim) are left out. Discovery only nominates: the verdict is the walk's.
//      Classes: A (judged) — a piece whose top lies no more than 30 cm (on average) over his floor, or a floor with
//      nothing drawn at its top; B (listed) — a higher piece walked through (a missing collider);
//      C (listed) — a standable collider over a rock's domed top.
//   2. the walk: Twinsen placed 3 m off each candidate (ISO, logged: hero.pos set on standable ground in its area) and
//      walked across it by input (Classic: face it, ArrowUp held, as tests/lib/player.js does); every frame on the
//      ground over the candidate's footprint, his feet (hero.pos.y) against the candidate's drawn top at his x, z.
//      FAIL: feet more than 3 cm under it, or more than 5 cm over the drawn surface under him (float). Water stays
//      water: the meshes named in WATER (by name, each one listed with the deepest wade measured) are listed, not
//      failed; soft snow (SOFT: the Hamalayi's snow lips and drifts, waded through as snow) likewise, except where a
//      built walk (steps, a path) runs into it.
// Not covered (listed in the output): moving meshes, see-through decals (no depth write), draw-batch copies, foliage
// cards (the store leaves them out), and spots the walk could not reach (blocked: listed with the reason).
// ONLY=<area id substring>; REPORT=<file.json> keeps every candidate and walk; DISCOVER=1 stops after discovery.
// SERVE=1 answers this checkout's files by request routing. Automated runtime only (SwiftShader, headless Chromium).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const SWEEP = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const ONLY = process.env.ONLY || '', REPORT = process.env.REPORT || '', DISCOVER = !!process.env.DISCOVER;
const MAXWALK = +(process.env.MAXWALK || 1000);   // walks per area at most (the biggest candidates first)
const iso = (s) => console.log('ISO  ' + s);
// water: wading is fine (a river, a channel, the sea, a basin); never made walkable. Listed with the deepest wade. (And
// any sheet over 300 m across: a sea plane, as the Desert's)
const WATER = /^(hriver|hchannel|hripples|hfoam|hventwater|water|sea|ocean|bl_basinWater\d*)$/;
// soft snow: waded through as snow (the Hamalayi's rim lips and drifts)
const SOFT = /^(hlip-|.*drift)/;
const SNOW = ['#f6f9ff'];   // (and any piece in the snow's own look, MM.snow: drifts and caps in the dressing kits)

// class-A findings left for their owners (not this suite's to fix: another worker's file, a protected change, a question
// for the coordinator, or not reached in FEET-66's round). Printed as HANDED ON with the measured depth, never dropped;
// they do not fail the run.
// (FEET-66, 26.11: what the before-run found and FEET-66 did not fix, each piece by its place (the discovery's middle of
// it, deterministic): [area, x, z, owner, depth measured (m; negative: floating)]; FEET-66.md lists them by owner)
const OWNERS = {
  o0: "Citadel, the square's ring steps (island.js buildFlatTown, FLAT-TOWN: protected; a question)",
  o1: "a standable collider over less drawn (a coping, a planter's rim, a wall top): its builder",
  o2: "Citadel, the town's merged pieces (town.js, townbits.js)",
  o3: "Citadel, the project's station yard (island.js buildStation)",
  o4: "Citadel, the cliff rocks (cliffs.js): low rocks walked into",
  o5: "Citadel, the asylum's front (lba1places.js)",
  o6: "Citadel, the old cellar hatch (island.js cellarHatch)",
  o7: "Citadel, the harbour's quay pieces (island.js, harbourshed.js)",
  o8: "Citadel, low stones and beds (world.js, citydress.js)",
  o9: "Citadel, the water main lying on the ground (island.js; a pipe)",
  o10: "Citadel, the lane gate (lanegate.js)",
  o11: "Citadel, the sewer hatch on the terrace (sewers.js)",
  o12: "Zeelich (zeelich.js, zeelife.js): a porch, a step, a low stone",
  o13: "Desert Island (desert.js, desertdress.js): low rocks, a slab",
  o14: "the Hamalayi: a standable wall top or a platform's collider over less drawn (hamalayi.js)",
  o15: "the Hamalayi's low rocks, the gorge's shore stones, the dead tree's root plate (hamalayi.js, hamalayi-finish.js, hamalayi-tree.js)",
  o16: "Ballastra (ballastra/*.js): the swing bridge, a gangway, a bed edge",
  o17: "the isles (zislands.js, francos: another worker's file now)",
};
const HANDED = [
  ['citadel', -42.90, -4.48, 'o0', 0.257], ['citadel', -36.59, 69.86, 'o1', -0.103], ['citadel', -71.00, 42.49, 'o2', 0.289], ['citadel', -112.27, 53.29, 'o1', -0.200],
  ['citadel', -110.25, 38.12, 'o1', -0.103], ['citadel', -108.97, 48.31, 'o1', -0.100], ['citadel', -24.50, -72.83, 'o3', 0.250], ['citadel', -123.95, -69.23, 'o4', 0.696],
  ['citadel', -24.72, -67.17, 'o3', 0.250], ['citadel', -39.20, 8.81, 'o1', -0.097], ['citadel', -26.50, -51.51, 'o5', 0.259], ['citadel', -94.33, 32.81, 'o1', -0.097],
  ['citadel', -52.33, 49.66, 'o1', -0.097], ['citadel', -50.33, 44.71, 'o1', -0.097], ['citadel', -71.25, -31.50, 'o4', 0.497], ['citadel', -27.77, -62.19, 'o6', 0.090],
  ['citadel', -122.00, 44.33, 'o7', 0.070], ['citadel', -27.84, -61.17, 'o6', 0.080], ['citadel', -41.84, 90.58, 'o4', 0.309], ['citadel', -35.51, -65.00, 'o3', 0.055],
  ['citadel', -26.00, -63.59, 'o3', 0.055], ['citadel', -27.73, -61.17, 'o6', 0.090], ['citadel', -37.57, 18.30, 'o8', 0.293], ['citadel', -30.84, -65.00, 'o3', 0.050],
  ['citadel', -24.42, -62.66, 'o3', 0.050], ['citadel', -26.00, -50.67, 'o5', 0.458], ['citadel', -27.00, -50.67, 'o5', 0.444], ['citadel', -74.37, 61.76, 'o8', 0.300],
  ['citadel', -124.17, 48.80, 'o7', 0.070], ['citadel', -105.96, 43.29, 'o1', -0.200], ['citadel', -25.91, -86.07, 'o1', -0.230], ['citadel', -29.25, -64.84, 'o3', 0.055],
  ['citadel', -32.34, -65.00, 'o3', 0.055], ['citadel', -26.67, 9.16, 'o8', 0.284], ['citadel', -86.00, 92.33, 'o8', 0.325], ['citadel', -23.01, -61.69, 'o3', 0.055],
  ['citadel', -28.75, 61.16, 'o8', 0.310], ['citadel', -34.01, -65.00, 'o3', 0.050], ['citadel', -113.34, -81.67, 'o8', 0.293], ['citadel', -64.42, 50.49, 'o8', 0.283],
  ['citadel', -68.00, -30.89, 'o4', 0.151], ['citadel', -53.59, 38.49, 'o8', 0.278], ['citadel', -109.67, -75.67, 'o8', 0.281], ['citadel', -55.51, -76.67, 'o8', 0.251],
  ['citadel', -30.34, 52.66, 'o8', 0.252], ['citadel', -37.51, -65.00, 'o3', 0.050], ['citadel', -125.50, 53.66, 'o7', 0.070], ['citadel', -56.84, -13.51, 'o2', 0.130],
  ['citadel', -58.51, -8.84, 'o2', 0.130], ['citadel', -66.50, 41.16, 'o2', 0.130], ['citadel', -88.84, 30.16, 'o2', 0.130], ['citadel', -26.84, -20.50, 'o2', 0.130],
  ['citadel', -69.50, 12.49, 'o2', 0.072], ['citadel', -19.84, -60.70, 'o3', 0.101], ['citadel', -41.34, 47.66, 'o8', 0.148], ['citadel', -31.50, 21.50, 'o2', 0.130],
  ['citadel', -53.77, -67.37, 'o9', 0.100], ['citadel', -31.50, -55.51, 'o3', 0.070], ['citadel', -45.84, 61.83, 'o10', 0.050], ['citadel', -25.00, -30.84, 'o11', 0.106],
  ['citadel', -116.17, 47.33, 'o7', 0.100], ['citadel', -25.00, -31.50, 'o11', 0.093], ['citadel', -25.00, -31.84, 'o11', 0.085], ['citadel', -50.34, -64.34, 'o9', 0.082],
  ['citadel', -33.34, -49.34, 'o9', 0.090], ['citadel', -25.00, -32.17, 'o11', 0.073], ['citadel', -31.34, -74.00, 'o3', 0.077], ['citadel', -19.30, -60.30, 'o3', 0.031],
  ['zeelich', 2389.10, -10.50, 'o12', 0.615], ['zeelich', 2368.09, 25.79, 'o12', 0.330], ['zeelich', 2388.90, 12.71, 'o12', 0.120], ['zeelich', 2361.23, -6.99, 'o1', -0.350],
  ['zeelich', 2389.49, 8.66, 'o12', 0.140], ['zeelich', 2450.16, -0.01, 'o12', 0.060], ['zeelich', 2388.99, -7.50, 'o12', 0.140], ['zeelich', 2387.83, 23.16, 'o12', 0.055],
  ['desert', 3358.95, -38.54, 'o13', 0.315], ['desert', 3336.49, -72.67, 'o13', 0.319], ['desert', 3423.12, -24.76, 'o13', 0.191], ['desert', 3304.73, -45.66, 'o1', -0.300],
  ['desert', 3305.06, -45.66, 'o13', 0.227], ['desert', 3349.64, 15.99, 'o13', 0.070], ['desert', 3297.33, -71.00, 'o13', 0.092], ['desert', 3317.09, 44.63, 'o13', 0.388],
  ['desert', 3336.88, -64.93, 'o13', 0.250], ['desert', 3355.33, 28.00, 'o13', 0.395], ['desert', 3407.58, -26.50, 'o13', 0.470], ['desert', 3311.33, 4.00, 'o13', 0.076],
  ['desert', 3327.49, -64.89, 'o13', 0.250], ['desert', 3349.66, -120.67, 'o13', 0.360], ['desert', 3333.16, -65.00, 'o13', 0.250], ['desert', 3327.41, -58.59, 'o13', 0.250],
  ['desert', 3336.91, -58.59, 'o13', 0.250], ['desert', 3329.33, -65.00, 'o13', 0.250], ['desert', 3331.33, -65.00, 'o13', 0.250], ['desert', 3334.99, -65.00, 'o13', 0.250],
  ['desert', 3329.98, -78.93, 'o13', 0.091], ['desert', 3387.33, -43.17, 'o13', 0.055], ['hamalayi', 4361.82, -50.21, 'o14', -0.382], ['hamalayi', 4369.49, -49.67, 'o15', 0.378],
  ['hamalayi', 4330.33, 43.66, 'o15', 0.294], ['hamalayi', 4241.33, 38.49, 'o15', 0.444], ['hamalayi', 4274.85, 83.65, 'o14', -0.097], ['hamalayi', 4275.97, 75.80, 'o14', -1.139],
  ['hamalayi', 4273.58, 82.02, 'o14', -0.104], ['hamalayi', 4273.43, 80.56, 'o14', -0.922], ['hamalayi', 4293.74, 37.24, 'o15', 0.127], ['hamalayi', 4278.43, 83.92, 'o14', -0.098],
  ['ballastra', 2971.02, -3013.47, 'o16', 0.100], ['ballastra', 2972.24, -3013.41, 'o16', 0.080], ['bl_arches', 3008.00, -3800.00, 'o1', -0.290], ['bl_arches', 2994.49, -3804.18, 'o16', 0.040],
  ['bl_gardens', 2959.66, -4617.18, 'o16', 0.180], ['isle_otringal', 1946.23, 1860.24, 'o17', 0.453], ['isle_otringal', 1894.94, 1802.06, 'o1', -0.476], ['isle_otringal', 1864.22, 1786.63, 'o1', -0.476],
  ['isle_otringal', 1908.85, 1836.92, 'o1', -0.113], ['isle_otringal', 1891.16, 1765.63, 'o17', 0.070], ['isle_otringal', 1864.16, 1786.99, 'o17', 0.081], ['isle_knartas', 2250.66, 1806.66, 'o17', 0.191],
  ['isle_celebration', 2893.77, 1790.99, 'o17', 0.582], ['isle_oldwatch', 5196.23, 1807.29, 'o17', 0.475], ['isle_oldwatch', 5186.91, 1793.83, 'o17', 0.253],
];
const handed = (c) => { const h = HANDED.find(([a, x, z]) => a === c.area && Math.hypot(c.x - x, c.z - z) < 0.5); return h && { why: OWNERS[h[3]] }; };

const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine&allregions&nobatch');   // (nobatch: the draw-batched pieces (Citadel's rocks) drawn as themselves, so the store holds them)
await menu(page, 'new');
await page.addScriptTag({ path: SWEEP });
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); game.hero.hasBall = true; });
iso('every outdoor area built at the start (?allregions, as worldfit does); a new game, chapter 1 flags (prologue done)');

const areas = await ev((ONLY) => {
  const G = game, out = [{ id: 'citadel', bounds: { x0: -215, x1: 63, z0: -123, z1: 155 } }];
  for (const [id, R] of Object.entries(G.rooms)) if (R.outdoor && id !== 'citadel') out.push({ id, room: id });
  return out.filter((a) => !ONLY || a.id.includes(ONLY));
}, ONLY);
console.log('areas: ' + areas.map((a) => a.id).join(' '));

const all = { areas: {}, notCovered: [] };
let fails = 0;
for (const area of areas) {
  // ---------------------------------------------------------------- 1. discovery
  const disc = await ev(async ({ area, WATERs, SOFTs, SNOW }) => {
    const G = game, PH = G.physics, WATER = new RegExp(WATERs), SOFT = new RegExp(SOFTs);
    const res = await SW.scan(area.room ? { room: area.room } : { bounds: area.bounds }, { buildOnly: true });
    const A = res.A, S = SW.raw.solids(), C = 0.33, MIN_N = Math.ceil(0.36 / (C * C));
    if (area.room) area.bounds = { x0: A.x0, x1: A.x1, z0: A.z0, z1: A.z1 };
    const nameOf = (oi) => { const o = SW.raw.obj(oi).o; return o.name || o.parent?.name || ''; };
    const sinks = new Map(), floats = new Map();
    // (a floor at this drawn top within 8 cm: the piece has its collider; physics.js reads a brick 5 cm in from its edges,
    //  so on the last 5 cm of a step he is on the step below for a frame: not a missing floor)
    const ownFloor = (x, z, y) => PH.near(x, z).some((c) => c.enabled && !c.noStand && Math.abs(c.top - y) < 0.015 && PH._inside(c, x, z, 0.08));
    // (the floor under him here is a step: a stair collider's top)
    const stairAt = (x, z, s) => PH.near(x, z).some((c) => c.enabled && c.stair && Math.abs(c.top - s) < 1e-4 && PH._inside(c, x, z, 0));
    // (a) sink spots: walk the cells that hold drawn geometry
    const cells = new Set();
    for (const s of S) { const b = s.box; if (b[4] - b[1] > 1.2 && b[3] - b[0] < 30) continue;   // (a tall piece: not a thing lying on the floor)
      for (let x = Math.floor(Math.max(b[0], A.x0)); x <= Math.floor(Math.min(b[3], A.x1)); x++) for (let z = Math.floor(Math.max(b[2], A.z0)); z <= Math.floor(Math.min(b[5], A.z1)); z++) cells.add(x * 100003 + z); }
    let cols = 0;
    for (const key of cells) {
      const cx = Math.round(key / 100003), cz = key - cx * 100003;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const x = cx + (i + 0.5) * C, z = cz + (j + 0.5) * C;
        const { hits } = SW.raw.column(x, z); cols++;
        // the top drawn surface facing up, seen from above
        const top = hits.find((h) => h.ny > 0.3 && (h.side === 2 || h.side === 0));
        if (!top || top.ny < 0.85) continue;
        const s = PH.groundAt(x, z, top.y + 0.02), d = top.y - s;
        if (d <= 0.03 || d >= 0.6) continue;
        if (ownFloor(x, z, top.y)) continue;   // (a step's edge: its own floor is there, read 5 cm in from its edges)
        if (s < -0.35 && !PH.groundInfo(x, z, top.y + 0.02).brick) continue;   // (the sea)
        if (PH.steepAt(x, z, s) || PH.blockedAt(x, z, s, 0)) continue;
        const part = S[top.si], b = part.box, sheet = b[4] - b[1] < 0.03;
        if (!(sheet ? d < 0.35 : (b[1] <= s + 0.12 || b[4] - b[1] <= 0.25))) continue;   // (lying on the floor, or a thin slab over it: a floe)
        // (soft snow over a built walk — steps (stair colliders) — is not waded snow: its own candidate)
        const built = (SOFT.test(nameOf(top.oi)) || SNOW.includes(SW.raw.look(top.lk).hex)) && stairAt(x, z, s), key = top.si + (built ? ':built' : '');
        let c = sinks.get(key); if (!c) sinks.set(key, c = { si: top.si, oi: top.oi, built, n: 0, dMax: 0, dSum: 0, x: 0, z: 0, pts: [], th: [] });
        // (its thickness on this ray: from its top to its own underside under it, or to its foot; a sheet none)
        { const k = hits.indexOf(top), und = hits.slice(k + 1).find((h) => h.si === top.si && h.ny < -0.3); c.th.push(sheet ? 0 : und ? top.y - und.y : top.y - b[1]); }
        c.n++; c.dMax = Math.max(c.dMax, d); c.dSum += d; c.x += x; c.z += z; if (c.pts.length < 400) c.pts.push([+x.toFixed(2), +z.toFixed(2), +top.y.toFixed(3), +s.toFixed(3)]);
      }
    }
    // (b) float spots: every standable collider top in the area, its footprint shrunk 0.15 m
    const near = (x, z) => x > A.x0 && x < A.x1 && z > A.z0 && z < A.z1;
    for (const c of PH.colliders) {
      if (!c.enabled || c.noStand || c.top < -40 || !near(c.x, c.z)) continue;
      // (only a floor he can step onto from the ground beside it: a building's roof box is not walked on)
      { const R = (c.type === 'cyl' ? c.r : Math.max(c.hw, c.hd)) + 0.5; let ok = false;
        for (let k = 0; k < 8 && !ok; k++) { const x = c.x + Math.sin(k * 0.785) * R, z = c.z + Math.cos(k * 0.785) * R, g = PH.groundAt(x, z, c.top + 0.3); if (g >= c.top - 0.55 && g < c.top - 0.02 && !PH.steepAt(x, z, g)) ok = true; }
        if (!ok) continue; }
      const pts = [];
      if (c.type === 'cyl') { for (let r = 0; r < c.r - 0.15; r += C) { const n = Math.max(1, Math.round(2 * Math.PI * r / C)); for (let k = 0; k < n; k++) pts.push([c.x + Math.sin(k / n * 6.283) * r, c.z + Math.cos(k / n * 6.283) * r]); } }
      else for (let lx = -c.hw + 0.15; lx <= c.hw - 0.15; lx += C) for (let lz = -c.hd + 0.15; lz <= c.hd - 0.15; lz += C) pts.push([c.x + lx * c.cos + lz * c.sin, c.z - lx * c.sin + lz * c.cos]);
      if (pts.length < MIN_N) continue;
      let f = null;
      for (const [x, z] of pts) {
        if (PH.groundAt(x, z, c.top + 0.01) !== c.top) continue;   // (not the floor here)
        if (PH.blockedAt(x, z, c.top, 0)) continue;
        const { hits, tg } = SW.raw.column(x, z); cols++;
        const ys = hits.filter((h) => h.ny > 0.3).map((h) => h.y); if (tg != null) ys.push(tg);
        if (ys.some((y) => Math.abs(y - c.top) <= 0.05)) continue;
        const under = ys.filter((y) => y < c.top - 0.05).sort((a, b) => b - a)[0];
        const gap = under == null ? 9 : c.top - under; if (gap >= 0.6 && under != null) continue;   // (a drop: a different fault, not his feet over a surface)
        if (!f) f = { c, n: 0, gMax: 0, x: 0, z: 0, pts: [], rock: 0 };
        { const uh = hits.find((h) => h.ny > 0.3 && Math.abs(h.y - under) < 1e-6); if (uh && (S[uh.si].rock || uh.ny < 0.95)) f.rock++; }   // (a rock's part, or a domed top)
        f.n++; f.gMax = Math.max(f.gMax, gap); f.x += x; f.z += z; if (f.pts.length < 400) f.pts.push([+x.toFixed(2), +z.toFixed(2), under == null ? null : +under.toFixed(3), +c.top.toFixed(3)]);
      }
      if (f && f.n >= MIN_N) floats.set(PH.colliders.indexOf(c), f);
    }
    const r3 = (v) => Math.round(v * 1000) / 1000;
    const cand = [];
    for (const c of sinks.values()) { if (c.n < MIN_N) continue; const nm = nameOf(c.oi), path = SW.raw.path(c.oi), lk = SW.raw.look(S[c.si].lk);
      const th = c.th.sort((a, b) => a - b)[c.th.length >> 1];
      // (A: its top on average no more than 30 cm over his floor — a sheet, a slab, a pad, a step, snow over a step, a low
      //  stone; higher is a thing at knee height walked through, a bench's seat, a table, a boulder: B. Its thickness is
      //  kept for the report: a snow lip or a step runs on down into the ground under him)
      cand.push({ kind: 'sink', cls: c.dSum / c.n <= 0.3 ? 'A' : 'B', th: r3(th), area: area.id, si: c.si, name: nm + (c.built ? ' over a built walk' : ''), path, look: lk.hex + (lk.tex ? '/' + lk.tex : '') + (lk.transparent ? ' (see-through)' : ''), water: WATER.test(nm) || S[c.si].box[3] - S[c.si].box[0] > 300, soft: (SOFT.test(nm) || SNOW.includes(lk.hex)) && !c.built, m2: r3(c.n * C * C), dMax: r3(c.dMax), dMean: r3(c.dSum / c.n), x: r3(c.x / c.n), z: r3(c.z / c.n), box: S[c.si].box.map(r3), pts: c.pts }); }
    for (const [ci, f] of floats) cand.push({ kind: 'float', cls: f.rock > f.n / 2 ? 'C' : 'A', area: area.id, ci, name: 'collider ' + ci + (f.c.stair ? ' (stair)' : '') + (f.c.type === 'cyl' ? ' cyl r ' + f.c.r : ` box ${r3(f.c.hw * 2)}x${r3(f.c.hd * 2)}`), top: r3(f.c.top), m2: r3(f.n * C * C), dMax: r3(f.gMax), x: r3(f.x / f.n), z: r3(f.z / f.n), pts: f.pts });
    cand.sort((a, b) => b.m2 * b.dMax - a.m2 * a.dMax);
    return { census: res.census, decals: res.decals.length, cols, cand };
  }, { area, WATERs: WATER.source, SOFTs: SOFT.source, SNOW });
  console.log(`\n== ${area.id}: ${disc.cand.length} candidates (${disc.cand.filter((c) => c.kind === 'sink').length} sink, ${disc.cand.filter((c) => c.kind === 'float').length} float); ${disc.cols} columns; store ${JSON.stringify(disc.census)}`);
  for (const c of disc.cand.slice(0, 60)) console.log(`  ${c.cls} ${c.kind} ${c.water ? '[water] ' : ''}${c.soft ? '[soft] ' : ''}${c.m2} m2 max ${c.dMax} at (${c.x}, ${c.z}) ${c.name} | ${c.path || ''} ${c.look || ''} ${c.top != null ? 'top ' + c.top : ''}`);
  all.areas[area.id] = { census: disc.census, decals: disc.decals, cand: disc.cand, walks: [] };
  if (disc.decals) all.notCovered.push(`${area.id}: ${disc.decals} see-through decal mesh(es) not in the store`);
  if (DISCOVER) { await ev(() => SW.free()); continue; }
  // ---------------------------------------------------------------- 2. the walks (the store kept: his x, z read against it)
  // (soft snow is listed, not walked; water is walked for its depth, the three biggest pieces)
  // (class A — a surface he stands on: a sheet or a slab up to 30 cm thick, or a floor with no drawn top — walked and
  //  judged, every one; class B — a solid piece over 30 cm thick walked through, a missing collider — and class C — a
  //  standable rock's flat collider over its domed top — listed for their owners, not walked; soft snow listed; water
  //  walked for its depth, the three biggest pieces)
  const soft = disc.cand.filter((c) => c.soft), wet = disc.cand.filter((c) => c.water).slice(0, 3), judged = disc.cand.filter((c) => !c.soft && !c.water && c.cls === 'A');
  for (const c of soft) all.areas[area.id].walks.push({ ...c, pts: undefined, walk: null, verdict: 'LISTED soft snow (not walked)' });
  for (const c of disc.cand.filter((q) => !q.soft && !q.water && q.cls !== 'A')) all.areas[area.id].walks.push({ ...c, pts: undefined, walk: null, verdict: `LISTED class ${c.cls} (${c.cls === 'B' ? 'a solid piece walked through: a missing collider' : 'a rock\'s flat collider over its dome'}; not walked)` });
  const todo = [...wet, ...judged.slice(0, MAXWALK)];
  if (judged.length > MAXWALK) all.notCovered.push(`${area.id}: ${judged.length - MAXWALK} class-A candidate(s) not walked (MAXWALK ${MAXWALK})`);
  for (const c of todo) {
    const w = await ev(({ c, areaId }) => {
      const G = game, h = G.hero, PH = G.physics;
      const put = (x, z, y) => {
        if (areaId === 'citadel') { if (G.room) { G.exitRoom({ x, z, a: 0 }, true, true); G.step(0.3); } }
        else if (G.room?.id !== areaId) { G.enterRoom(areaId, { x, z, a: 0 }, true, true); G.step(0.3); }
        if (G.state !== 'play' || G.trans) P.settle();   // (an arrival's remark, a fade: played through as a player would, E)
        for (const e of G.enemies) if (e.present) e.present = false;
        G.doorCool = 1e6;
        h.pos.set(x, PH.groundAt(x, z, y + 0.3), z); h.vy = 0; h.onGround = true; h.resetMotion?.(); h.behaviour = 'normal'; h.hp = h.maxHp; h.dead = false; G.step(0.1);
      };
      // the candidate's footprint: its sample spots; the target the spot nearest the middle
      const pts = c.pts, T = pts.reduce((b, p) => (Math.hypot(p[0] - c.x, p[1] - c.z) < Math.hypot(b[0] - c.x, b[1] - c.z) ? p : b), pts[0]);
      const floorY = c.kind === 'sink' ? T[3] : T[3];
      const inPrint = (x, z) => pts.some((p) => Math.abs(p[0] - x) < 0.2 && Math.abs(p[1] - z) < 0.2);
      // his feet against the drawn surface here: sink — the candidate's own top over his feet; float — his feet over the
      // nearest drawn surface under them (the terrain counts) with none within 3 cm of them
      const measure = (x, z, y) => {
        const { hits, tg } = SW.raw.column(x, z);
        if (c.kind === 'sink') { const t = hits.find((q) => q.si === c.si && q.ny > 0.85); return !t || PH.near(x, z).some((q) => q.enabled && !q.noStand && Math.abs(q.top - t.y) < 0.015 && PH._inside(q, x, z, 0.08)) ? null : t.y - y; }   // (a step's edge: as discovery's ownFloor)
        const ys = hits.filter((q) => q.ny > 0.3).map((q) => q.y); if (tg != null) ys.push(tg);
        if (ys.some((v) => Math.abs(v - y) <= 0.03)) return 0;
        const under = ys.filter((v) => v < y).sort((a, b) => b - a)[0];
        return under == null ? null : -(y - under);   // (negative: floating by that much)
      };
      const tries = [];
      for (let k = 0; k < 8 && tries.filter((t) => t.over).length < 2 && tries.length < 3; k++) {
        const a = k * Math.PI / 4 + 0.3;
        let st = null;
        for (const d of [3, 2.2, 1.5]) { const x = T[0] + Math.sin(a) * d, z = T[1] + Math.cos(a) * d, g = PH.groundAt(x, z, floorY + 0.6);
          if (Math.abs(g - floorY) < 0.8 && g > -0.35 && !PH.steepAt(x, z, g) && PH.overlapAt(x, z, g, h.radius) === 0 && !inPrint(x, z)) { st = [x, z, g, d]; break; } }
        if (!st) continue;
        put(st[0], st[1], st[2]);
        if (G.state !== 'play') { tries.push({ a: +a.toFixed(2), skipped: 'state ' + G.state }); continue; }
        h.angle = Math.atan2(T[0] - st[0], T[1] - st[1]); G.step(0.05);
        const I = G.input; I.keys.add('ArrowUp');
        let over = 0, worst = 0, at = null, t = 0;
        while (t < (st[3] + 3) / 2.2 + 1) {
          G.step(1 / 30); t += 1 / 30;
          if (!h.onGround || !inPrint(h.pos.x, h.pos.z)) continue;
          const m = measure(h.pos.x, h.pos.z, h.pos.y); if (m == null) continue;
          over++; if (Math.abs(m) > Math.abs(worst)) { worst = m; at = [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(3)); }
          if (Math.hypot(h.pos.x - st[0], h.pos.z - st[1]) > st[3] + 2.5) break;
        }
        I.keys.delete('ArrowUp'); G.step(0.1);
        tries.push({ a: +a.toFixed(2), from: st.slice(0, 3).map((v) => +v.toFixed(2)), over, worst: +worst.toFixed(3), at });
      }
      G.doorCool = 0;
      const walked = tries.filter((t) => t.over);
      const worst = walked.reduce((m, t) => (Math.abs(t.worst) > Math.abs(m) ? t.worst : m), 0);
      return { tries, walked: walked.length, worst: +worst.toFixed(3) };
    }, { c, areaId: area.id });
    const sinkBad = c.kind === 'sink' && w.worst > 0.03, floatBad = c.kind === 'float' && w.worst < -0.05;
    const exempt = c.water ? 'water (wading)' : c.soft ? 'soft snow' : '';
    const hd = handed(c);
    const verdict = !w.walked ? 'NOT REACHED' : (sinkBad || floatBad) ? (exempt ? 'LISTED ' + exempt : hd ? 'HANDED ON: ' + hd.why : 'FAIL') : 'ok';
    if (verdict === 'FAIL') fails++;
    all.areas[area.id].walks.push({ ...c, pts: undefined, walk: w, verdict });
    console.log(`  WALK ${verdict} ${c.kind} ${c.name} (${c.x}, ${c.z}) ${c.m2} m2: worst ${w.worst} m (${c.kind === 'sink' ? 'drawn top over his feet' : 'his feet over the drawn surface, negative'}), ${w.walked}/${w.tries.length} walks over it`);
  }
  await ev(() => SW.free());
}
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(all, null, 1));
check('discovery ran over every area asked', Object.keys(all.areas).length === areas.length, { areas: Object.keys(all.areas) });
if (!DISCOVER) {
  const W = Object.values(all.areas).flatMap((a) => a.walks).filter((w) => w.walk);
  const bad = W.filter((w) => w.verdict === 'FAIL').map((w) => `${w.area} ${w.kind} ${w.name} (${w.x}, ${w.z}) ${w.walk.worst}`);
  const listed = W.filter((w) => /^LISTED/.test(w.verdict)).map((w) => `${w.area} ${w.name} (${w.x}, ${w.z}) ${w.walk.worst} ${w.verdict}`);
  console.log(`walked ${W.filter((w) => w.walk.walked).length} of ${W.length} candidates; not reached ${W.filter((w) => !w.walk.walked).length}`);
  for (const l of listed) console.log('  LISTED ' + l);
  for (const w of W.filter((q) => /^HANDED/.test(q.verdict))) console.log(`  ${w.verdict} | ${w.area} ${w.kind} ${w.path || w.name} (${w.x}, ${w.z}) ${w.walk.worst} m`);
  const all2 = Object.values(all.areas).flatMap((a) => a.walks), cnt = (f) => all2.filter(f).length;
  console.log(`SUMMARY: class A walked ${W.filter((w) => w.cls === 'A' && !w.water).length} (ok ${cnt((w) => w.verdict === 'ok')}, FAIL ${cnt((w) => w.verdict === 'FAIL')}, handed on ${cnt((w) => /^HANDED/.test(w.verdict))}, not reached ${cnt((w) => w.verdict === 'NOT REACHED')}); class B listed ${cnt((w) => /class B/.test(w.verdict))}; class C listed ${cnt((w) => /class C/.test(w.verdict))}; soft snow listed ${cnt((w) => /soft snow/.test(w.verdict))}; water walked ${cnt((w) => w.water && w.walk)}`);
  for (const n of all.notCovered) console.log('  NOT COVERED ' + n);
  check('his feet on every drawn surface he walks over: never more than 3 cm under it, never more than 5 cm over the drawn surface under him (water and soft snow listed, not judged)', fails === 0, bad);
}
await browser.close();
done();
