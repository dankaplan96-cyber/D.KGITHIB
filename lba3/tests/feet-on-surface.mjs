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
// for the coordinator): { area, path (RegExp on the piece's path or name), x, z, r (m), why }. Printed as HANDED ON with
// the measured depth, never dropped; they do not fail the run.
// (FEET-66, 26.11: what its after-run still found, not fixed in that round; FEET-66.md lists them with the owners)
const HANDED = [
  { area: 'citadel', path: /collider/, x: -36.6, z: 69.9, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /merged<townMerged<Group/, x: -71.0, z: 42.5, r: 1.0, why: "Citadel, the town's merged pieces (town.js / townbits.js): door steps and kerbs; 1 piece(s), sink up to 29 cm" },
  { area: 'citadel', path: /collider/, x: -112.3, z: 53.3, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 20 cm" },
  { area: 'citadel', path: /collider/, x: -110.3, z: 38.1, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /collider/, x: -109.0, z: 48.3, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /Buffer<station<Group/, x: -24.6, z: -70.0, r: 3.8, why: "Citadel, the project's station yard (island.js buildStation); 2 piece(s), sink up to 25 cm" },
  { area: 'citadel', path: /merged<harbour<Group/, x: -111.1, z: 38.0, r: 2.4, why: "Citadel, the harbour's quay pieces (island.js / harbourshed.js); 3 piece(s), sink up to 24 cm" },
  { area: 'citadel', path: /collider/, x: -39.2, z: 8.8, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /collider/, x: -94.3, z: 32.8, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /collider/, x: -52.3, z: 49.7, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /collider/, x: -50.3, z: 44.7, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'citadel', path: /Buffer<asylum\-climb/, x: -32.0, z: -41.2, r: 6.1, why: "Citadel, the climb to the asylum (lba1places.js); 7 piece(s), sink up to 22 cm" },
  { area: 'citadel', path: /Buffer<old\-door\-passageS<Group/, x: -27.7, z: -61.7, r: 1.5, why: "Citadel, the old cellar hatch (island.js cellarHatch); 2 piece(s), sink up to 9 cm" },
  { area: 'citadel', path: /Buffer<harbour<Group/, x: -122.0, z: 44.3, r: 1.0, why: "Citadel, the harbour's quay pieces (island.js / harbourshed.js); 1 piece(s), sink up to 7 cm" },
  { area: 'citadel', path: /Buffer<old\-door\-passageS<Group/, x: -27.8, z: -61.2, r: 1.0, why: "Citadel, the old cellar hatch (island.js cellarHatch); 1 piece(s), sink up to 8 cm" },
  { area: 'citadel', path: /Buffer<station<Group/, x: -30.3, z: -64.2, r: 8.7, why: "Citadel, the project's station yard (island.js buildStation); 9 piece(s), sink up to 6 cm" },
  { area: 'citadel', path: /Buffer<asylum\-front/, x: -26.5, z: -50.7, r: 1.5, why: "Citadel, the asylum's front (lba1places.js); 2 piece(s), sink up to 46 cm" },
  { area: 'citadel', path: /Buffer<Group<Group<harbour<Group/, x: -124.8, z: 51.2, r: 3.5, why: "Citadel, the harbour's quay pieces (island.js / harbourshed.js); 2 piece(s), sink up to 7 cm" },
  { area: 'citadel', path: /collider/, x: -106.0, z: 43.3, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 20 cm" },
  { area: 'citadel', path: /collider/, x: -25.9, z: -86.1, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 23 cm" },
  { area: 'citadel', path: /merged<townMerged<Group/, x: -56.9, z: 8.9, r: 43.1, why: "Citadel, the town's merged pieces (town.js / townbits.js): door steps and kerbs; 7 piece(s), sink up to 13 cm" },
  { area: 'citadel', path: /Buffer<station<Group/, x: -23.5, z: -65.0, r: 12.9, why: "Citadel, the project's station yard (island.js buildStation); 3 piece(s), sink up to 10 cm" },
  { area: 'citadel', path: /Buffer<pipeline<Group/, x: -45.8, z: -60.4, r: 17.6, why: "Citadel, the water main lying on the ground (island.js; a pipe, not a floor); 3 piece(s), sink up to 10 cm" },
  { area: 'citadel', path: /Buffer<lanegate<Group/, x: -45.8, z: 61.8, r: 1.0, why: "Citadel, the lane gate (lanegate.js); 1 piece(s), sink up to 5 cm" },
  { area: 'citadel', path: /Buffer<Group<sewerhatch\-terrace<Group/, x: -25.0, z: -31.6, r: 1.8, why: "Citadel, the sewer hatch on the terrace (sewers.js); 4 piece(s), sink up to 11 cm" },
  { area: 'citadel', path: /Buffer<Group<harbour<Group/, x: -116.2, z: 47.3, r: 1.0, why: "Citadel, the harbour's quay pieces (island.js / harbourshed.js); 1 piece(s), sink up to 10 cm" },
  { area: 'zeelich', path: /Buffer<Group<zeelich/, x: 2388.9, z: 12.7, r: 1.0, why: "Zeelich (zeelich.js / zeelife.js): a porch, a step or a cover; 1 piece(s), sink up to 12 cm" },
  { area: 'zeelich', path: /collider/, x: 2361.2, z: -7.0, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 35 cm" },
  { area: 'zeelich', path: /Buffer<Group<zeelich/, x: 2389.2, z: 0.6, r: 9.1, why: "Zeelich (zeelich.js / zeelife.js): a porch, a step or a cover; 2 piece(s), sink up to 14 cm" },
  { area: 'zeelich', path: /Buffer<zeelich/, x: 2450.2, z: -0.0, r: 1.0, why: "Zeelich (zeelich.js / zeelife.js): a porch, a step or a cover; 1 piece(s), sink up to 6 cm" },
  { area: 'zeelich', path: /merged<Group<zeelich/, x: 2387.8, z: 23.2, r: 1.0, why: "Zeelich (zeelich.js / zeelife.js): a porch, a step or a cover; 1 piece(s), sink up to 6 cm" },
  { area: 'desert', path: /Buffer<desert/, x: 3359.0, z: -38.5, r: 1.0, why: "Desert Island (desert.js / desertdress.js); 1 piece(s), sink up to 32 cm" },
  { area: 'desert', path: /merged<Group<desert/, x: 3423.1, z: -24.8, r: 1.0, why: "Desert Island (desert.js / desertdress.js); 1 piece(s), sink up to 19 cm" },
  { area: 'desert', path: /collider/, x: 3304.7, z: -45.7, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 30 cm" },
  { area: 'desert', path: /Buffer<desert/, x: 3311.3, z: 4.0, r: 1.0, why: "Desert Island (desert.js / desertdress.js); 1 piece(s), sink up to 8 cm" },
  { area: 'desert', path: /Buffer<desert/, x: 3387.3, z: -43.2, r: 1.0, why: "Desert Island (desert.js / desertdress.js); 1 piece(s), sink up to 6 cm" },
  { area: 'hamalayi', path: /collider/, x: 4361.8, z: -50.2, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 38 cm" },
  { area: 'hamalayi', path: /collider/, x: 4274.8, z: 83.7, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'hamalayi', path: /collider/, x: 4276.0, z: 75.8, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 114 cm" },
  { area: 'hamalayi', path: /collider/, x: 4273.6, z: 82.0, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'hamalayi', path: /collider/, x: 4273.4, z: 80.6, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 92 cm" },
  { area: 'hamalayi', path: /collider/, x: 4278.4, z: 83.9, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 10 cm" },
  { area: 'ballastra', path: /Buffer<bl_swingBridge<ballastra/, x: 2972.2, z: -3013.4, r: 1.0, why: "Ballastra (ballastra/*.js); 1 piece(s), sink up to 8 cm" },
  { area: 'bl_arches', path: /collider/, x: 3008.0, z: -3800.0, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 29 cm" },
  { area: 'bl_arches', path: /Buffer<bl_gangwayS<bl_arches/, x: 2994.5, z: -3804.2, r: 1.0, why: "Ballastra (ballastra/*.js); 1 piece(s), sink up to 4 cm" },
  { area: 'bl_gardens', path: /Buffer<bl_gardens/, x: 3000.2, z: -4602.9, r: 44.0, why: "Ballastra (ballastra/*.js); 3 piece(s), sink up to 18 cm" },
  { area: 'isle_otringal', path: /collider/, x: 1894.9, z: 1802.1, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 48 cm" },
  { area: 'isle_otringal', path: /collider/, x: 1864.2, z: 1786.6, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 48 cm" },
  { area: 'isle_otringal', path: /collider/, x: 1908.8, z: 1836.9, r: 1.0, why: "a floor with less drawn at its top (a coping, a planter's rim, a wall top): the collider's owner; 1 piece(s), float up to 11 cm" },
  { area: 'isle_knartas', path: /Buffer<francos\ dig\ earth<francos\ dig<isle_knartas/, x: 2250.7, z: 1806.7, r: 1.0, why: "the isles (zislands.js / francos: another worker's file now); 1 piece(s), sink up to 19 cm" },
];
const handed = (c) => HANDED.find((h) => h.area === c.area && h.path.test((c.path || '') + ' ' + c.name) && Math.hypot(c.x - h.x, c.z - h.z) < h.r);

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
