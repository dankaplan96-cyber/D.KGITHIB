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
const SNOW = ['#f6f9ff', '#f4f6fa'];   // (FEET-66B: and the wave-5 tin stacks' snow pad)   // (and any piece in the snow's own look, MM.snow: drifts and caps in the dressing kits)

// class-A findings left for their owners (not this suite's to fix: another worker's file, or a true exception). Printed
// as HANDED ON with the measured depth, never dropped; they do not fail the run.
// (FEET-66B, 27.11: FEET-66 handed on 122; FEET-66B fixed every one outside the isles (FEET-66B.md). Left: the isles'
// pieces, zislands.js being PATHS-140B's file until it lands, and one true exception. Each [area, x, z, owner, depth
// measured by the discovery (m; negative: floating)], by the discovery's middle of the piece (0.5 m))
const OWNERS = {
  x1: "a house's roof eave, 7 cm over the house's wall collider: reached only by the hop-pack from the promenade (2.24 m below); a pitched roof is not a floor (a true exception)",
};
// (SMALLFIX-27-11: the isles' 13 fixed (SMALLFIX-27-11.md): their noStand colliders are obstacles, their rocks too, the
//  things on a slope's edge have one, Celebration's portal plinth a floor, Franco's spoil heaps and seat obstacles)
const HANDED = [
  ['citadel', -69.505, 12.495, 'x1', 0.072],
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
    // (FEET-66B) where he can be at all: a flood over a 0.5 m grid from the ground he can walk on (the terrain, not steep,
    //  not under anything that stops him) and from where he arrives in the area, step by step as physics moves him (a step
    //  up to STEP_UP, any drop) and, generously, a hop of the hop-pack (jetpack.js JET.cap 2.4 m, landing 0.25 m up) onto a floor
    //  beside him; up to three floors a cell (under a bridge and on it). A drawn top over a floor no flood reaches (a
    //  house's roof over its walls' collider, a tank's lid, a fortress wall's top) is not a place he stands: listed as
    //  UNREACHABLE per piece, never judged.
    const RF = (() => {
      const C = 0.5, X0 = A.x0, Z0 = A.z0, NX = Math.ceil((A.x1 - A.x0) / C) + 1, NZ = Math.ceil((A.z1 - A.z0) / C) + 1;
      const lv = new Float32Array(NX * NZ * 3).fill(NaN), q = [];
      const R = 0.25, HOP = 2.4 + 0.25;   // (the highest floor a hop lands on: the pack's lift over the take-off ground, and the 0.25 m physics lets a falling actor land up onto)
      const add = (i, j, y) => { const k = (i * NZ + j) * 3; for (let n = 0; n < 3; n++) { const v = lv[k + n]; if (v === v) { if (Math.abs(v - y) < 0.05) return; continue; } lv[k + n] = y; q.push(i, j, y); return; } };
      const okAt = (x, z, g) => { const gi = PH.groundInfo(x, z, g + 0.01); return !(g < -0.35 && !gi.brick) && !PH.blockedAt(x, z, g, R); };
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = X0 + i * C, z = Z0 + j * C; const gi = PH.groundInfo(x, z, 1e4); if (gi.brick) continue; const g = gi.h; if (g < -0.35 || PH.steepAt(x, z, g) || PH.blockedAt(x, z, g, R)) continue; add(i, j, g); }
      // (seeds: the area's arrival and safe spots, and every place a door, an exit, a search, a giver or an interactable of
      //  any room puts him or asks him to stand that lies in the area — a deck reached only through a building's door,
      //  the spaceport's through its terminal)
      const SEEDS = [], pick = (o, d = 0) => { if (!o || typeof o !== 'object' || d > 2) return; if (Number.isFinite(o.x) && Number.isFinite(o.z)) SEEDS.push(o); for (const k of ['to', 'out', 'spawn', 'at', 'pos', 'door', 'sill']) pick(o[k], d + 1); };
      for (const rm of Object.values(G.rooms)) { pick(rm.spawn); for (const k of ['safe', 'exits', 'searches', 'givers', 'reads']) for (const o of rm[k] || []) pick(o); }
      for (const k of ['interactables', 'givers', 'seats']) for (const o of G.world[k] || []) pick(o);
      for (const o of G.world.houses || []) pick(o.door);   // (a house's door, not its middle: that is its roof)
      for (const h of SEEDS) { if (!h || !Number.isFinite(h.x) || h.x < X0 || h.z < Z0 || h.x > A.x1 || h.z > A.z1) continue;
        const i = Math.round((h.x - X0) / C), j = Math.round((h.z - Z0) / C); if (i >= 0 && j >= 0 && i < NX && j < NZ) add(i, j, PH.groundAt(X0 + i * C, Z0 + j * C, PH.groundAt(h.x, h.z) + 0.1)); }
      while (q.length) { const y = q.pop(), j = q.pop(), i = q.pop();
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
          const x = X0 + a * C, z = Z0 + b * C, g = PH.groundAt(x, z, y + 0.01);
          if (g > y + 0.05 && PH.steepAt(x, z, g)) {} else if (okAt(x, z, g)) add(a, b, g);
          const g2 = PH.groundAt(x, z, y + HOP - 0.55 + 0.01); if (g2 > g + 0.3 && okAt(x, z, g2)) add(a, b, g2); } }
      // (SMALLFIX-27-11: how much he reaches, for the log: grid points and floors reached; a fix that adds obstacles must
      //  not shrink it beyond their own footprint)
      let reached = 0; for (let k = 0; k < lv.length; k++) if (lv[k] === lv[k]) reached++; G._reached = reached;
      // (a spot's floor f reached: from a floor reached at one of the four grid points round it, a step takes him onto f)
      return (x, z, f) => { const i0 = Math.floor((x - X0) / C), j0 = Math.floor((z - Z0) / C); for (let a = i0; a <= i0 + 1; a++) for (let b = j0; b <= j0 + 1; b++) { if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const k = (a * NZ + b) * 3; for (let n = 0; n < 3; n++) { const L = lv[k + n]; if (L === L && Math.abs(PH.groundAt(x, z, L + 0.05) - f) < 0.02) return true; } } return false; };
    })();
    const unreach = new Map(), RAD = G.hero.radius - 0.05;
    // (FEET-66B: the drawn surfaces a foot rests on: up-facing tops at his x, z and 8 cm round it — a grating's bars, a
    //  deck's planks with gaps between them: a single ray down between two bars met the ground under them)
    const footYs = (x, z, hits, tg) => { const ys = hits.filter((h) => h.ny > 0.3).map((h) => h.y); if (tg != null) ys.push(tg);
      for (const [dx, dz] of [[0.08, 0], [-0.08, 0], [0, 0.08], [0, -0.08]]) { const q = SW.raw.column(x + dx, z + dz); for (const h of q.hits) if (h.ny > 0.3) ys.push(h.y); } return ys; };
    G.footYs = footYs;
    // (FEET-66B: his feet inside a layer of soft snow — between a snow piece's underside and its top: a wall's snow cap, a
    //  drift — are in the snow, as he wades the drifts: not floating over the stone under it)
    const SOFTr = SOFT, inSnow = (hits, y) => hits.some((q) => { if (q.ny <= 0.3 || !(SOFTr.test(nameOf(q.oi)) || SNOW.includes(SW.raw.look(q.lk).hex))) return false;
      const u = hits.find((h2) => h2.si === q.si && h2.ny < -0.3 && h2.y < q.y); return !!u && y >= u.y - 0.05 && y <= q.y + 0.05; });
    G.inSnow = inSnow;
    let byRadius = 0, narrow = 0;
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
        // (FEET-66B: his middle cannot come within his radius of what stops him: a spot there is not one he stands on —
        //  a stone's drawn edge outside its collider; counted)
        if (PH.blockedAt(x, z, s, RAD)) { byRadius++; continue; }
        // (FEET-66B: a top narrower than a foot — a rail, a bar, a pipe's crown, 18 cm or less across — is stepped over, not
        //  stood on: the same part's top missing 9 cm to both sides of the spot, along x or along z; counted)
        { const has = (dx, dz) => SW.raw.column(x + dx, z + dz).hits.some((q) => q.si === top.si && q.ny > 0.3 && Math.abs(q.y - top.y) < 0.05);
          if ((!has(0.09, 0) && !has(-0.09, 0)) || (!has(0, 0.09) && !has(0, -0.09))) { narrow++; continue; } }
        if (!RF(x, z, s)) { const nm = SW.raw.path(top.oi), u = unreach.get(nm) || { n: 0, at: `(${x.toFixed(2)}, ${z.toFixed(2)}) floor ${s.toFixed(2)}` }; u.n++; unreach.set(nm, u); continue; }
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
    // (SMALLFIX-27-11: the isles lie side by side, and an isle's bounds (its drawn things) took in a neighbour's ground:
    //  Knartas's held Undergas's, the Platform's and the Lift Dock's colliders, the Platform's Oldwatch's; nothing of theirs
    //  is drawn in this area's store, so each read as a floor over nothing. A collider is judged in the outdoor area whose
    //  middle is nearest it)
    const OUT = Object.keys(G.rooms).map((id) => [id, G.regions.centreOf(id)]).filter(([, c]) => c?.outdoor);
    const mine = (c) => { if (!area.room) return true; const own = G.regions.centreOf(area.room); if (!own) return true; const d0 = Math.hypot(c.x - own.x, c.z - own.z); return !OUT.some(([id, q]) => id !== area.room && Math.hypot(c.x - q.x, c.z - q.z) < d0); };
    for (const c of PH.colliders) {
      if (!c.enabled || c.noStand || c.top < -40 || !near(c.x, c.z) || !mine(c)) continue;
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
        if (!RF(x, z, c.top)) { const nm = 'collider ' + PH.colliders.indexOf(c), u = unreach.get(nm) || { n: 0, at: `(${x.toFixed(2)}, ${z.toFixed(2)}) floor ${c.top.toFixed(2)}` }; u.n++; unreach.set(nm, u); continue; }
        const { hits, tg } = SW.raw.column(x, z); cols++;
        const ys = footYs(x, z, hits, tg);
        if (ys.some((y) => Math.abs(y - c.top) <= 0.05) || inSnow(hits, c.top)) continue;
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
    return { census: res.census, decals: res.decals.length, cols, cand, byRadius, narrow, reached: G._reached, unreach: [...unreach].map(([k, v]) => `${k} (${v.n} spots, one at ${v.at})`) };
  }, { area, WATERs: WATER.source, SOFTs: SOFT.source, SNOW });
  console.log(`\n== ${area.id}: ${disc.cand.length} candidates (${disc.cand.filter((c) => c.kind === 'sink').length} sink, ${disc.cand.filter((c) => c.kind === 'float').length} float); ${disc.cols} columns; store ${JSON.stringify(disc.census)}`);
  console.log(`  reach: ${disc.reached} floors at the 0.5 m grid's points reached on foot or by the hop-pack`);
  console.log(`  left out: ${disc.byRadius} spot(s) within his radius of something that stops him; ${disc.narrow} on a top narrower than a foot (a rail, a bar); UNREACHABLE (no way there on foot or by the hop-pack): ${disc.unreach.length ? disc.unreach.join('; ') : 'none'}`);
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
        const ys = G.footYs(x, z, hits, tg);   // (FEET-66B: as discovery's: a foot on a grating's bars; in soft snow)
        if (ys.some((v) => Math.abs(v - y) <= 0.03) || G.inSnow(hits, y)) return 0;
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
