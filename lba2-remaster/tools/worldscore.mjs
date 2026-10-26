// WORLD-80: how much each island looks like the original's, as a score out of 100 (docs/WORLD_SIMILARITY.md).
//
//   GAME_URL=http://localhost:8179/ TMPDIR=/dev/shm node tools/worldscore.mjs [options]
//     --dump <file>   keep what the running game measured (ours) as JSON       (default: no file)
//     --from <file>   score a dump kept earlier instead of starting the game
//     --json <file>   write the scores, parts and ranked differences as JSON
//     --png <dir>     write top-down overlays of the original's land outline and ours (numbers only, our drawing)
//     --only a,b      only these islands (citadel, desert, hamalayi, zeelich, otringal, knartas, ...)
//     --top <n>       differences listed per island (default 12)
//
// What is compared (each part 0–100; the island's score is their weighted sum, a part that can't be measured is left
// out and the others re-weighted, and the island is marked "partial"):
//   coast     30 %  IoU of the land masks (ground above 0.05 m) in the original's frame, on the original's own
//                   height-grid points (≈ 1.71 m apart) with a margin of sea round it; our frame is mapped onto the
//                   original's by each builder's own transform (world.js LAYOUT, desert.js DESERT_FIT, the islands'
//                   places), read from the game, so a re-fit is scored as it is.
//   height    20 %  over the land both have: the mean absolute height difference after taking out one uniform lift
//                   (the median difference, reported), as a skill score against the original's own spread:
//                   100 × (1 − MAE / mean |h − mean h|) — 0 is no better than a flat plate at the right height.
//   landmarks 30 %  each named original landmark (tools/worldscore/landmarks.json: houses, the lighthouse, the
//                   harbour, the statue, doors, ...) against our matching object: 100 % within 5 m, falling linearly
//                   to 0 at 30 m; a missing one scores 0. Weights per landmark (major places 2).
//   objects   20 %  per area (cells of half a section, 27.4 m) the count of buildings, tall things (lamps, posts,
//                   towers), fences (railings, bollard runs, low walls) and props, original against ours, per kind
//                   by r = log2((ours + 1) / (orig + 1)): a deficit costs in full (half 50 %, a quarter 0); a surplus
//                   up to twice the original's is free (lived in, twelve years on), four times 50 %, eight times 0;
//                   weighted by the larger count. Ours are the registered buildings (worldfit.js) and the physics
//                   colliders (a tree trunk counts as a prop, as the original's trees do; invisible edge blocks and
//                   disabled colliders are left out). Pieces without a collider (flowers, plants, small things on
//                   steep slopes on Zeelich's islands) are not seen: for ours this part is a lower bound.
// The twelve years' additions (tools/worldscore/additions.json: the Joint Project, the spaceport, new houses, ...)
// are intentional: their areas are left out of the coast, height and objects parts on both sides, and nothing of
// theirs is a landmark. A landmark of the original that an addition displaced is still scored (it was moved).
//
// The originals are numbers measured from the user's own files (tools/lba2-islands.py: tools/worldscore/ref/*.json
// for Citadel and Desert Island, assets/lba2/islands/*.json for Zeelich's islands, the LBA1 Hamalayi summary);
// nothing of the original's graphics is read or written.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ONLY = opt('only') ? new Set(opt('only').split(',')) : null;
const TOP = +opt('top', 12);
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const LANDMARKS = read('tools/worldscore/landmarks.json');
const ADDITIONS = read('tools/worldscore/additions.json');
const WEIGHTS = { coast: 30, height: 20, landmarks: 30, objects: 20 };
const MARGIN = 16;           // grid points of sea sampled round the original's grid (≈ 27 m)
const AREA = 27.4;           // the objects part's cell (half an original section)

// ------------------------------------------------------------------ the islands
const ZISLES = ['otringal', 'knartas', 'mosquibee', 'celebration', 'undergas', 'cxislet', 'platform', 'liftdock'];
const SPECS = [
  { id: 'citadel', name: 'Citadel Island', ref: 'tools/worldscore/ref/citadel.json', frame: 'citadel' },
  { id: 'desert', name: 'Desert Island', ref: 'tools/worldscore/ref/desert.json', frame: 'desert' },
  { id: 'hamalayi', name: 'The Hamalayi (against LBA1)', lba1: 'tools/worldscore/ref/hamalayi-lba1.json', frame: 'hamalayi' },
  { id: 'zeelich', name: 'Zeelich (the terminal island)', frame: 'zeelich', none: 'No original island has its layout: it is our story hub (the spaceport deck, the Esmer street, the mills, the depot and the drill platform) built from LBA2\'s Esmer pieces. Its ground is physics bricks over the cloud sea, not a height grid.' },
  ...ZISLES.map((n) => ({ id: n, name: { undergas: 'Under Celebration', cxislet: 'The CX Islet', liftdock: 'The Lift Dock', platform: 'The Platform', mosquibee: 'Mosquibee Island', celebration: 'Celebration Island', knartas: 'Knartas Island', otringal: 'Otringal' }[n], ref: `assets/lba2/islands/${n}.json`, frame: 'isle_' + n, isle: true })),
].filter((s) => !ONLY || ONLY.has(s.id));

// ------------------------------------------------------------------ stage 1: measure ours in the running game
async function dumpGame() {
  const { launch, open, menu } = await import(path.join(ROOT, 'tests/lib/boot.mjs'));
  const { browser, page } = await launch({ width: 480, height: 270 });
  await open(page, '?nocine');
  await menu(page, 'new');
  const want = SPECS.map((s) => {
    if (!s.ref) return { id: s.id, frame: s.frame };
    const L = read(s.ref);
    return { id: s.id, frame: s.frame, nx: L.nx, nz: L.nz, cell: L.cell };
  });
  const dump = await page.evaluate(async ({ want, MARGIN }) => {
    const G = game, P = G.world.physics, T = P.terrain;
    const Wm = await import('./src/game/world.js'), Dm = await import('./src/game/desert.js');
    const { FIT } = await import('./src/game/worldfit.js'), { MAX_SLOPE } = await import('./src/engine/physics.js'), { WIZ } = await import('./src/game/wizards.js');
    const r2 = (v) => Math.round(v * 100) / 100;
    // each frame: ours (world) = R(deg) · original + t + region origin
    const frameOf = (f) => {
      if (f === 'citadel') return { deg: 0, tx: Wm.LAYOUT.dx, tz: Wm.LAYOUT.dz, ox: 0, oz: 0 };
      if (f === 'desert') return { deg: Dm.DESERT_FIT.deg, tx: Dm.DESERT_FIT.tx, tz: Dm.DESERT_FIT.tz, ox: Dm.DESERT.x, oz: Dm.DESERT.z };
      const R = G.rooms[f]; const p = R.group.position; return { deg: 0, tx: 0, tz: 0, ox: p.x, oz: p.z };
    };
    const spot = (v) => {
      if (!v || typeof v !== 'object') return null;
      if (v.isObject3D) { v.updateWorldMatrix(true, false); const e = v.matrixWorld.elements; return { x: r2(e[12]), z: r2(e[14]) }; }
      if (typeof v.x === 'number' && typeof v.z === 'number' && Number.isFinite(v.x)) {
        const o = { x: r2(v.x), z: r2(v.z) };
        for (const k of ['to', 'id', 'name', 'kind', 'w', 'd', 'ry']) if (typeof v[k] === 'string' || typeof v[k] === 'number') o[k] = typeof v[k] === 'number' ? r2(v[k]) : v[k];
        return o;
      }
      for (const k of ['group', 'root', 'mesh']) if (v[k]?.isObject3D) return spot(v[k]);
      return null;
    };
    const named = (o) => {
      const out = {};
      for (const [k, v] of Object.entries(o || {})) {
        if (k.startsWith('_') || k === 'terrain' || k === 'root' || k === 'group') continue;
        const s = Array.isArray(v) ? null : spot(v);
        if (s) out[k] = s;
        else if (Array.isArray(v) && v.length && v.length <= 400) { const a = v.map(spot).filter(Boolean); if (a.length) out[k] = a; }
      }
      return out;
    };
    const colliderList = (x0, x1, z0, z1) => {
      const out = [];
      for (const c of P.colliders) {
        if (!c.enabled || c.x < x0 || c.x > x1 || c.z < z0 || c.z > z1) continue;
        const g = T.heightAt(c.x, c.z);
        out.push({ t: c.type === 'box' ? 'b' : 'c', x: r2(c.x), z: r2(c.z), w: r2(c.type === 'box' ? 2 * c.hw : 2 * c.r), d: r2(c.type === 'box' ? 2 * c.hd : 2 * c.r), rot: r2(c.rot || 0), h: r2(c.top - g),
          see: !!c.seeThrough, ns: !!c.noStand, cam: !!c.camSkip });
      }
      return out;
    };
    const res = { regions: {}, fit: FIT.map((b) => ({ region: b.region, name: b.name, x: r2(b.x), z: r2(b.z), w: r2(b.w), d: r2(b.d), ry: r2(b.ry || 0) })), POI: Wm.POI, version: G.version, MAX_SLOPE };
    for (const w of want) {
      const out = { frame: null };
      if (w.frame === 'hamalayi' || w.frame === 'zeelich') {
        const R = G.rooms[w.frame]; const p = R.group.position;
        const half = R.terrain ? R.terrain.size / 2 : 80, step = 1;
        const n = Math.round(2 * half / step) + 1, hs = new Array(n * n), gs = new Array(n * n);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = p.x - half + i * step, z = p.z - half + j * step;
          hs[j * n + i] = Math.round(T.heightAt(x, z) * 100);
          gs[j * n + i] = Math.round(P.groundAt(x, z, 60) * 100);
        }
        out.frame = { ox: p.x, oz: p.z, half, step, n };
        out.heights = hs; out.ground = gs;
        out.spots = named(R);
        out.colliders = colliderList(p.x - half, p.x + half, p.z - half, p.z + half);
        res.regions[w.id] = out; continue;
      }
      const F = frameOf(w.frame), c = Math.cos(F.deg * Math.PI / 180), s = Math.sin(F.deg * Math.PI / 180);
      const W0 = (w.nx - 1) * w.cell, D0 = (w.nz - 1) * w.cell;
      const NX = w.nx + 2 * MARGIN, NZ = w.nz + 2 * MARGIN, hs = new Array(NX * NZ);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const ox = -W0 / 2 + (i - MARGIN) * w.cell, oz = -D0 / 2 + (j - MARGIN) * w.cell;
        const x = c * ox - s * oz + F.tx + F.ox, z = s * ox + c * oz + F.tz + F.oz;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        hs[j * NX + i] = Math.round(T.heightAt(x, z) * 100);
      }
      out.frame = F; out.grid = { NX, NZ, cell: w.cell, W0, D0, MARGIN }; out.heights = hs;
      out.colliders = colliderList(x0, x1, z0, z1);
      out.spots = w.frame === 'citadel' ? { ...named(G.world), houses: (G.world.houses || []).map((h) => ({ id: h.id, x: r2(h.x), z: r2(h.z), w: r2(h.w), d: r2(h.d), ry: r2(h.ry || 0), door: h.door ? spot(h.door) : null })),
        trees: (G.world.trees || []).map((t) => ({ x: r2(t.x), z: r2(t.z), kind: t.kind, orig: !!t.orig })), wizTent: WIZ.tent } : named(G.rooms[w.frame]);
      if (w.frame === 'desert') { const S = G.rooms.school; out.spots.schoolOut = (G.rooms.desert.exits || []).filter((e) => e.to === 'school').map(spot)[0] || null; out.spots.exitsAll = (G.rooms.desert.exits || []).map(spot).filter(Boolean); out.spots.school = { x: Dm.DESERT.x + WIZ.school.local.x, z: Dm.DESERT.z + WIZ.school.local.z }; void S; }
      res.regions[w.id] = out;
    }
    return res;
  }, { want, MARGIN });
  await browser.close();
  return dump;
}

// ------------------------------------------------------------------ helpers
const toOrig = (F, x, z) => {   // world → the original's island-centred frame
  const qx = x - F.ox - F.tx, qz = z - F.oz - F.tz, c = Math.cos(F.deg * Math.PI / 180), s = Math.sin(F.deg * Math.PI / 180);
  return [c * qx + s * qz, -s * qx + c * qz];
};
const toWorld = (F, ox, oz) => { const c = Math.cos(F.deg * Math.PI / 180), s = Math.sin(F.deg * Math.PI / 180); return [c * ox - s * oz + F.tx + F.ox, s * ox + c * oz + F.tz + F.oz]; };
const near = (d) => (d <= 5 ? 1 : d >= 30 ? 0 : (30 - d) / 25);
// tools/lba2-islands.py's size classes (small → prop), with long thin things (railings, bollard runs, low walls) as fences
const kindOf = (sx, sy, sz) => (Math.max(sx, sz) > 2.5 && Math.min(sx, sz) < 1.2 && sy < 2.5 ? 'fence'
  : Math.max(sx, sz) > 4.2 ? 'building' : sy > 2.2 * Math.max(sx, sz, 0.3) && sy > 2.5 ? 'tall' : 'prop');
const r1 = (v) => Math.round(v * 10) / 10;
// the additions' shapes (our world frame): {rect:[x0,z0,x1,z1]} or {circle:[x,z,r]}
const inShape = (A, x, z) => (A.rect ? x >= A.rect[0] && x <= A.rect[2] && z >= A.rect[1] && z <= A.rect[3] : Math.hypot(x - A.circle[0], z - A.circle[1]) <= A.circle[2]);
// connected blobs of a mask on the grid (4-neighbour), biggest first
function blobs(mask, NX, NZ) {
  const seen = new Uint8Array(NX * NZ), out = [];
  for (let s = 0; s < NX * NZ; s++) {
    if (!mask[s] || seen[s]) continue;
    const q = [s]; seen[s] = 1; const cells = [];
    while (q.length) { const k = q.pop(); cells.push(k); const i = k % NX, j = (k - i) / NX;
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const m = b * NX + a; if (mask[m] && !seen[m]) { seen[m] = 1; q.push(m); } } }
    out.push(cells);
  }
  return out.sort((a, b) => b.length - a.length);
}

// ------------------------------------------------------------------ stage 2: score one island
function scoreIsland(S, D) {
  const R = D.regions[S.id];
  const res = { id: S.id, name: S.name, parts: {}, notes: [], diffs: [], landmarks: [], partial: false };
  if (S.none) { res.none = S.none; return res; }
  if (S.lba1) return scoreHamalayi(S, R, D, res);
  const L = read(S.ref), F = R.frame, G = R.grid;
  const spotsAll = R.spots || {};
  const adds = (ADDITIONS[S.id] || []).map((A) => {   // ({spot, r}: a circle round one of the region's named spots)
    if (!A.spot) return A;
    const v = A.spot.split('.').reduce((o, k) => (o == null ? o : o[k]), spotsAll);
    return v ? { ...A, circle: [v.x, v.z, A.r] } : null;
  }).filter(Boolean);
  const inAdd = (x, z) => adds.find((A) => inShape(A, x, z));
  // the two height grids in the original's frame (the original padded with sea)
  const N = G.NX * G.NZ, ho = new Float32Array(N), hu = new Float32Array(N), ex = new Uint8Array(N), wx = new Float32Array(N), wz = new Float32Array(N);
  for (let j = 0; j < G.NZ; j++) for (let i = 0; i < G.NX; i++) {
    const k = j * G.NX + i, a = i - G.MARGIN, b = j - G.MARGIN;
    ho[k] = a >= 0 && b >= 0 && a < L.nx && b < L.nz ? L.heights[b * L.nx + a] / 100 : -6;
    hu[k] = R.heights[k] / 100;
    const [x, z] = toWorld(F, -G.W0 / 2 + a * G.cell, -G.D0 / 2 + b * G.cell);
    wx[k] = x; wz[k] = z; ex[k] = inAdd(x, z) ? 1 : 0;
  }
  const LAND = 0.05;
  const lo = (k) => ho[k] > LAND, lu = (k) => hu[k] > LAND;
  const cellA = G.cell * G.cell;
  // --- coast
  const decks = S.id === 'liftdock';
  let inter = 0, uni = 0, oOnly = new Uint8Array(N), uOnly = new Uint8Array(N), areaO = 0, areaU = 0;
  for (let k = 0; k < N; k++) {
    if (ex[k]) continue;
    const a = lo(k), b = lu(k);
    if (a) areaO++; if (b) areaU++;
    if (a && b) inter++; if (a || b) uni++;
    if (a && !b) oOnly[k] = 1; if (b && !a) uOnly[k] = 1;
  }
  if (decks) { res.notes.push('The Lift Dock: the original\'s ground is 252 m² at 0.1 m (its decks are objects); ours keeps its decks as the ground over the clouds. Coast and height are not comparable.'); res.partial = true; }
  else {
    const iou = inter / uni;
    res.parts.coast = 100 * iou;
    res.measure = { landOrig: Math.round(areaO * cellA), landOurs: Math.round(areaU * cellA), iou: +iou.toFixed(3) };
    // the biggest mismatches and what fixing each would give (exactly, for the IoU)
    for (const [mask, kind] of [[oOnly, 'original-only land (ours is sea)'], [uOnly, 'our land where the original has sea']]) {
      for (const cells of blobs(mask, G.NX, G.NZ).slice(0, 6)) {
        if (cells.length * cellA < 40) break;
        const n = cells.length, iou2 = kind.startsWith('original') ? (inter + n) / uni : inter / (uni - n);
        const cx = cells.reduce((s, k) => s + wx[k], 0) / n, cz = cells.reduce((s, k) => s + wz[k], 0) / n;
        let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity; for (const k of cells) { xa = Math.min(xa, wx[k]); xb = Math.max(xb, wx[k]); za = Math.min(za, wz[k]); zb = Math.max(zb, wz[k]); }
        res.diffs.push({ part: 'coast', what: `${kind}: ${Math.round(n * cellA)} m² round our (${r1(cx)}, ${r1(cz)}), x ${Math.round(xa)}…${Math.round(xb)}, z ${Math.round(za)}…${Math.round(zb)}`, gain: (iou2 - iou) * 100 * WEIGHTS.coast / 100, at: [r1(cx), r1(cz)] });
      }
    }
    // --- height
    const both = []; for (let k = 0; k < N; k++) if (!ex[k] && lo(k) && lu(k)) both.push(k);
    const dif = both.map((k) => hu[k] - ho[k]).sort((a, b) => a - b), off = dif[Math.floor(dif.length / 2)] || 0;
    const mo = both.reduce((s, k) => s + ho[k], 0) / both.length, mad = both.reduce((s, k) => s + Math.abs(ho[k] - mo), 0) / both.length;
    const err = new Float32Array(N); let mae = 0;
    for (const k of both) { err[k] = hu[k] - ho[k] - off; mae += Math.abs(err[k]); }
    mae /= both.length;
    res.parts.height = Math.max(0, 100 * (1 - mae / mad));
    Object.assign(res.measure, { lift: +off.toFixed(2), mae: +mae.toFixed(2), spread: +mad.toFixed(2) });
    if (Math.abs(off) > 0.75) res.notes.push(`Our ground stands ${off > 0 ? 'higher' : 'lower'} than the original's by ${Math.abs(off).toFixed(1)} m overall (taken out before the height part; the shore is where it shows).`);
    for (const [sign, label] of [[1, 'too high'], [-1, 'too low']]) {
      const mask = new Uint8Array(N); for (const k of both) if (err[k] * sign > 1.5) mask[k] = 1;
      for (const cells of blobs(mask, G.NX, G.NZ).slice(0, 5)) {
        if (cells.length * cellA < 60) break;
        const n = cells.length, sum = cells.reduce((s, k) => s + Math.abs(err[k]), 0), mean = sum / n;
        const cx = cells.reduce((s, k) => s + wx[k], 0) / n, cz = cells.reduce((s, k) => s + wz[k], 0) / n;
        const oh = cells.reduce((s, k) => s + ho[k], 0) / n, uh = cells.reduce((s, k) => s + hu[k] - off, 0) / n;
        res.diffs.push({ part: 'height', what: `ground ${label} by ${mean.toFixed(1)} m on average over ${Math.round(n * cellA)} m² round our (${r1(cx)}, ${r1(cz)}) (original ${oh.toFixed(1)} m, ours ${uh.toFixed(1)} m after the lift)`, gain: Math.min(100 - res.parts.height, 100 * sum / both.length / mad) * WEIGHTS.height / 100, at: [r1(cx), r1(cz)] });
      }
    }
  }
  // --- landmarks
  const spots = R.spots || {}, fit = D.fit.filter((b) => b.region === (S.id === 'citadel' ? 'citadel' : S.isle ? 'isle_' + S.id : S.id));
  const dig = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), { spots, POI: D.POI });
  const origAt = (o) => {
    if (o.xz) return o.xz;
    if (o.body != null) { const m = L.decor.filter((d) => d[8] === o.body); if (!m.length) return null; const pick = o.i != null ? [m[o.i]] : m; return [pick.reduce((s, d) => s + d[0], 0) / pick.length, pick.reduce((s, d) => s + d[1], 0) / pick.length]; }
    if (o.door != null) { const m = (L.doors || []).filter((d) => d[3] === o.door); if (!m.length) return null; const pick = o.i != null ? [m[o.i]] : m; return [pick.reduce((s, d) => s + d[0], 0) / pick.length, pick.reduce((s, d) => s + d[1], 0) / pick.length]; }
    return null;
  };
  const claimed = new Set();
  // our candidates for auto matching: registered buildings, then big colliders (one per 2 m: a house's parts are one
  // house), none inside an addition (an addition is not a landmark)
  const cands = fit.filter((b) => !inAdd(b.x, b.z)).map((b) => ({ x: b.x, z: b.z, a: b.w * b.d, id: 'fit:' + b.name }));
  for (const [i, c] of R.colliders.entries()) {
    if (c.t !== 'b' || Math.max(c.w, c.d) <= 3 || Math.min(c.w, c.d) < 1.2 || c.h <= 2 || c.see || inAdd(c.x, c.z)) continue;
    const dup = cands.find((q) => Math.hypot(q.x - c.x, q.z - c.z) < 2 || (q.id.startsWith('fit:') && Math.hypot(q.x - c.x, q.z - c.z) < Math.sqrt(q.a) / 2));
    if (dup) continue;
    cands.push({ x: c.x, z: c.z, a: c.w * c.d, id: 'col:' + i });
  }
  const oursAt = (u, ow, near0) => {
    if (!u) return null;
    if (u.fit) { const b = fit.find((f) => f.name === u.fit); if (b) claimed.add('fit:' + b.name); return b ? { x: b.x, z: b.z, by: 'registered building "' + u.fit + '"' } : null; }
    if (u.spot) { const v = dig(u.spot); const p = Array.isArray(v) ? v[u.i ?? 0] : v; return p ? { x: p.x, z: p.z, by: u.spot } : null; }
    if (u.xz) return { x: u.xz[0], z: u.xz[1], by: 'our coordinates ' + (u.why || '') };
    if (u.door) {   // the nearest of our doors (the houses' doors, the region's door spots and exits)
      const doors = [...(spots.houses || []).map((h) => h.door).filter(Boolean), ...(spots.houseDoors || []), ...(spots.lharDoors || []), ...(spots.exitsAll || []), ...(u.also || []).map((p) => dig(p)).filter(Boolean)];
      let best = null; for (const p of doors) { const dd = Math.hypot(p.x - near0[0], p.z - near0[1]); if (!best || dd < best.d) best = { ...p, d: dd }; }
      return best && best.d < 30 ? { x: best.x, z: best.z, by: 'nearest door of ours' } : null;
    }
    if (u.auto) {   // the nearest unclaimed building of a similar footprint
      let best = null;
      for (const c of cands) { if (claimed.has(c.id)) continue; if (ow.a && (c.a < ow.a * 0.3 || c.a > ow.a * 3.5)) continue; const dd = Math.hypot(c.x - near0[0], c.z - near0[1]); if (dd < 30 && (!best || dd < best.d)) best = { ...c, d: dd }; }
      if (!best) return null; claimed.add(best.id); return { x: best.x, z: best.z, by: 'nearest building of its size (' + best.id + ')' };
    }
    return null;
  };
  let list = LANDMARKS[S.id] || [];
  if (S.isle && !list.length) {   // Zeelich's islands: every original building of 10 m² or more, matched automatically
    // (the original often keeps one building as several overlapping records: those within 3 m, or whose footprints
    // overlap, are one landmark with their joint footprint)
    const recs = L.decor.filter((d) => d[7] === 'building' && d[3] * d[5] >= 10 && d[4] >= 2).map((d) => ({ x0: d[0] - d[3] / 2, x1: d[0] + d[3] / 2, z0: d[1] - d[5] / 2, z1: d[1] + d[5] / 2 }));
    const groups = [];
    for (const r of recs) {
      const touch = (g) => g.some((q) => Math.hypot((q.x0 + q.x1 - r.x0 - r.x1) / 2, (q.z0 + q.z1 - r.z0 - r.z1) / 2) < 3
        || (Math.min(q.x1, r.x1) - Math.max(q.x0, r.x0) > 0.5 && Math.min(q.z1, r.z1) - Math.max(q.z0, r.z0) > 0.5));
      const hit = groups.filter(touch);
      if (!hit.length) groups.push([r]);
      else { hit[0].push(r); for (const g of hit.slice(1)) { hit[0].push(...g); groups.splice(groups.indexOf(g), 1); } }
    }
    list = groups.map((g) => {
      const x0 = Math.min(...g.map((q) => q.x0)), x1 = Math.max(...g.map((q) => q.x1)), z0 = Math.min(...g.map((q) => q.z0)), z1 = Math.max(...g.map((q) => q.z1));
      const cx = r1((x0 + x1) / 2), cz = r1((z0 + z1) / 2);
      return { name: `building ${r1(x1 - x0)} × ${r1(z1 - z0)} m at the original's (${cx}, ${cz})${g.length > 1 ? ` (${g.length} parts)` : ''}`, orig: { xz: [cx, cz] }, a: (x1 - x0) * (z1 - z0), ours: { auto: 'building' } };
    });
  }
  let lw = 0, ls = 0;
  list = [...list.filter((m) => !m.ours?.auto), ...list.filter((m) => m.ours?.auto)];
  for (const m of list) {
    const o = origAt(m.orig); if (!o) { res.notes.push('landmark not found in the original data: ' + m.name); continue; }
    const [x, z] = toWorld(F, o[0], o[1]);
    const u = oursAt(m.ours, { a: m.a || 0 }, [x, z]);
    const d = u ? Math.hypot(u.x - x, u.z - z) : null, s = u ? near(d) : 0, w = m.w ?? 1;
    lw += w; ls += w * s;
    const row = { name: m.name, w, orig: [r1(x), r1(z)], ours: u ? [r1(u.x), r1(u.z)] : null, by: u?.by || null, dist: d == null ? null : r1(d), score: Math.round(s * 100), note: m.note || null };
    res.landmarks.push(row);
  }
  if (lw) {
    res.parts.landmarks = 100 * ls / lw;
    for (const row of res.landmarks) if (row.score < 100) {
      const g = (100 - row.score) / 100 * row.w / lw * WEIGHTS.landmarks;
      const dir = row.ours ? (() => { const dx = row.ours[0] - row.orig[0], dz = row.ours[1] - row.orig[1]; const a = Math.atan2(dx, -dz) * 180 / Math.PI; return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((a + 360) % 360) / 45) % 8]; })() : '';
      res.diffs.push({ part: 'landmarks', what: row.ours ? `${row.name}: ours is ${row.dist} m ${dir} of the original's (original at our (${row.orig}), ours at (${row.ours}))` : `missing: ${row.name} (the original's at our (${row.orig}))${row.note ? ' — ' + row.note : ''}`, gain: g, at: row.orig });
    }
  }
  // --- objects per area
  const kinds = ['building', 'tall', 'fence', 'prop'];
  const cellOf = (ox, oz) => `${Math.floor((ox + 400) / AREA)},${Math.floor((oz + 400) / AREA)}`;
  const C = {};
  const add = (key, kind, who) => { (C[key] ||= { o: { building: 0, tall: 0, fence: 0, prop: 0 }, u: { building: 0, tall: 0, fence: 0, prop: 0 } })[who][kind]++; };
  for (const d of L.decor) { const [x, z] = toWorld(F, d[0], d[1]); if (inAdd(x, z)) continue; add(cellOf(d[0], d[1]), kindOf(d[3], d[4], d[5]), 'o'); }
  const fitAt = fit.map((b) => ({ ...b }));
  const inFit = (c) => fitAt.some((b) => { const dx = c.x - b.x, dz = c.z - b.z, co = Math.cos(b.ry), si = Math.sin(b.ry); return Math.abs(co * dx - si * dz) < b.w / 2 + 0.6 && Math.abs(si * dx + co * dz) < b.d / 2 + 0.6; });
  let nOurs = 0;
  for (const b of fitAt) { if (inAdd(b.x, b.z)) continue; const [ox, oz] = toOrig(F, b.x, b.z); add(cellOf(ox, oz), 'building', 'u'); nOurs++; }
  for (const c of R.colliders) {
    if (inAdd(c.x, c.z) || c.h < 0.3 || c.h > 40) continue;
    if (c.t === 'b' && c.see && c.ns && Math.abs(c.w - c.d) < 0.01 && Math.abs(c.w - (L.cell || 0)) < 0.02) continue;   // (the islands' invisible edge blocks)
    if (inFit(c)) continue;
    let kind;
    if (c.t === 'c' && c.w >= 0.5 && c.w <= 1.0 && c.h > 3.4) kind = 'prop';   // a tree's trunk (the original counts its trees as props)
    else kind = kindOf(c.w, c.h, c.d);
    const [ox, oz] = toOrig(F, c.x, c.z);
    add(cellOf(ox, oz), kind, 'u'); nOurs++;
  }
  let ow = 0, os = 0; const cellRows = [];
  for (const [key, v] of Object.entries(C)) for (const k of kinds) {
    const a = v.o[k], b = v.u[k]; if (!a && !b) continue;
    // a deficit costs in full; a surplus up to twice the original's is free (lived in, twelve years on), then falls off
    const lr = Math.log2((b + 1) / (a + 1)), s = Math.max(0, 1 - (lr < 0 ? -lr : Math.max(0, lr - 1)) / 2), w = Math.max(a, b);
    ow += w; os += w * s; cellRows.push({ key, k, a, b, s, w });
  }
  res.parts.objects = ow ? 100 * os / ow : null;
  res.measure = { ...(res.measure || {}), objectsOrig: L.decor.length, objectsOurs: nOurs };
  // the cells costing most, grouped per area
  const byCell = {};
  for (const c of cellRows) { const g = (1 - c.s) * c.w / ow * WEIGHTS.objects; (byCell[c.key] ||= { gain: 0, rows: [] }).gain += g; byCell[c.key].rows.push(c); }
  for (const [key, v] of Object.entries(byCell)) {
    const [ci, cj] = key.split(',').map(Number), [x, z] = toWorld(F, ci * AREA - 400 + AREA / 2, cj * AREA - 400 + AREA / 2);
    // a deficit (fewer than the original's) and a surplus (more than twice) are listed apart: only a deficit is a fix
    for (const surplus of [false, true]) {
      const rows = v.rows.filter((r) => r.s < 0.99 && (r.b > r.a) === surplus);
      if (!rows.length) continue;
      const g = rows.reduce((t, r) => t + (1 - r.s) * r.w / ow * WEIGHTS.objects, 0);
      res.diffs.push({ part: 'objects', surplus, what: `${surplus ? 'more than twice the original’s' : 'fewer than the original’s'} round our (${r1(x)}, ${r1(z)}) (27 m square): original → ours ${rows.map((r) => `${r.k}s ${r.a} → ${r.b}`).join(', ')}`, gain: g, at: [r1(x), r1(z)] });
    }
  }
  finish(res);
  // the overlay
  res._png = { G, ho, hu, ex, lo: (k) => lo(k), lu: (k) => lu(k), N, landmarks: res.landmarks, F, decks };
  return res;
}

// The Hamalayi: LBA1's are eight separate 55 m scenes of ledges with no common map, so the coast and the landmarks
// can't be compared; what can: how much walkable ground there is and at which heights (relative to its lowest).
function scoreHamalayi(S, R, D, res) {
  const H = read(S.lba1), Fr = R.frame, n = Fr.n, step = Fr.step;
  res.partial = true;
  res.notes.push('LBA1\'s Hamalayi is eight separate exterior scenes (each a 64 × 64-cell grid, 55 m square) with no common map: the coast IoU and the landmarks have nothing to align to. Scored here: walkable area (as the coast part) and the heights of the walkable ground above its lowest level (as the height part). Our Hamalayi\'s places (Lhar, the lift, the monastery, the observatory) are ours: no LBA1 counterpart to place.');
  // ours: walkable ground = terrain points with a slope he can stand on, above the sea
  const h = R.heights.map((v) => v / 100), ok = [];
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const k = j * n + i; if (h[k] < 0.3) continue;
    const sx = (h[k + 1] - h[k - 1]) / (2 * step), sz = (h[k + n] - h[k - n]) / (2 * step);
    if (Math.hypot(sx, sz) <= D.MAX_SLOPE) ok.push(h[k]);
  }
  const areaU = ok.length * step * step, areaO = H.scenes.reduce((s, c) => s + c.area, 0);
  res.parts.coast = 100 * Math.min(areaU, areaO) / Math.max(areaU, areaO);
  // heights above the lowest walkable level, in 1 m bins, both as shares
  const lay = H.layer, orig = [];
  for (const sc of H.scenes) { const lowest = sc.layers.findIndex((v) => v > 0); sc.layers.forEach((c, i) => { for (let q = 0; q < c; q++) orig.push((i - lowest) * lay); }); }
  const low = ok.slice().sort((a, b) => a - b)[Math.floor(ok.length * 0.02)] || 0;
  const bins = (arr, base) => { const b = new Array(40).fill(0); for (const v of arr) b[Math.max(0, Math.min(39, Math.floor(v - base)))]++; return b.map((c) => c / arr.length); };
  const bo = bins(orig, 0), bu = bins(ok, low);
  res.parts.height = 100 * bo.reduce((s, p, i) => s + Math.min(p, bu[i]), 0);
  const pct = (arr, q) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.floor(a.length * q)]; };
  res.measure = { walkOrig: areaO, walkOurs: Math.round(areaU), climbOrigP90: +pct(orig, 0.9).toFixed(1), climbOursP90: +(pct(ok, 0.9) - low).toFixed(1) };
  res.diffs.push({ part: 'coast', what: `walkable ground ${Math.round(areaU)} m² against LBA1's ${areaO} m² (${(areaU / areaO).toFixed(1)}×): our one 230 m patch against its eight 55 m ledge scenes`, gain: (100 - res.parts.coast) * WEIGHTS.coast / (WEIGHTS.coast + WEIGHTS.height) });
  res.diffs.push({ part: 'height', what: `90 % of the walkable ground lies within ${res.measure.climbOursP90} m of our lowest level against ${res.measure.climbOrigP90} m in LBA1 (our levels 3 / 12 / 16 / 22 / 30 m for the lift, the ledge, the ridge and the descent)`, gain: (100 - res.parts.height) * WEIGHTS.height / (WEIGHTS.coast + WEIGHTS.height) });
  finish(res);
  return res;
}

function finish(res) {
  let w = 0, s = 0;
  for (const [k, v] of Object.entries(res.parts)) if (v != null) { w += WEIGHTS[k]; s += WEIGHTS[k] * v; }
  if (w < 100) res.partial = true;
  res.score = w ? s / w : null;
  // a part's gain is in points of the island's score when all four parts count; re-weight for a partial island
  for (const d of res.diffs) d.gain = d.gain * 100 / (w || 100);
  res.diffs.sort((a, b) => b.gain - a.gain);
}

// ------------------------------------------------------------------ PNG (our own drawing from the numbers)
function png(file, w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// Two panels side by side, the original's frame with north (−z) up (Desert Island: the original's own turn, ours is
// turned 275° from it). Left, the outlines: white land both (shaded by the original's height), red the original's
// land that is sea in ours, cyan our land where the original has sea, hatched grey the twelve years' additions;
// yellow rings the original's landmarks, a magenta dot and line to ours (a white ring: missing). Right, the height
// difference on the land both have, after the uniform lift: red ours higher, blue ours lower (full colour at 4 m).
// The bar at the bottom left is 50 m.
function overlay(res, file) {
  const P = res._png, G = P.G, S = 4, PW = G.NX * S, GAP = 12, W = PW * 2 + GAP, H = G.NZ * S, buf = Buffer.alloc(W * H * 3, 255);
  const lift = res.measure?.lift ?? 0;
  for (let j = 0; j < G.NZ; j++) for (let i = 0; i < G.NX; i++) {
    const k = j * G.NX + i, a = P.lo(k), b = P.lu(k);
    let c = [24, 40, 70];
    if (a && b && !P.ex[k]) { const e = Math.max(-1, Math.min(1, (P.hu[k] - P.ho[k] - lift) / 4)); c = e > 0 ? [255, Math.round(255 - 200 * e), Math.round(255 - 200 * e)] : [Math.round(255 + 200 * e), Math.round(255 + 200 * e), 255]; }
    else if (a || b) c = [150, 150, 150];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = ((j * S + y) * W + PW + GAP + i * S + x) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; }
  }
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; };
  // the original's frame, north (−z) up: x → right, z → down
  for (let j = 0; j < G.NZ; j++) for (let i = 0; i < G.NX; i++) {
    const k = j * G.NX + i, a = P.lo(k), b = P.lu(k);
    let c = a && b ? [236, 232, 220] : a ? [222, 64, 52] : b ? [40, 170, 210] : [24, 40, 70];
    if (a && b) { const t = Math.min(1, Math.max(0, P.ho[k] / 20)); c = [236 - 90 * t, 232 - 80 * t, 220 - 60 * t].map(Math.round); }
    if (P.ex[k]) c = c.map((v, q) => Math.round(v * 0.55 + [120, 120, 120][q] * 0.45));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) put(i * S + x, j * S + y, (P.ex[k] && (x + y) % 4 === 0) ? [90, 90, 90] : c);
  }
  // landmarks: original (yellow ring), ours (magenta dot), a line between
  const pix = (wx, wz) => { const [ox, oz] = toOrig(P.F, wx, wz); return [Math.round(((ox + G.W0 / 2) / G.cell + G.MARGIN) * S + S / 2), Math.round(((oz + G.D0 / 2) / G.cell + G.MARGIN) * S + S / 2)]; };
  P.landmarks.forEach((m) => {
    const [ax, ay] = pix(m.orig[0], m.orig[1]);
    if (m.ours) { const [bx, by] = pix(m.ours[0], m.ours[1]); const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1); for (let t = 0; t <= n; t++) put(Math.round(ax + (bx - ax) * t / n), Math.round(ay + (by - ay) * t / n), [255, 60, 220]);
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) put(bx + x, by + y, [255, 60, 220]); }
    for (let a = 0; a < 6.283; a += 0.1) put(Math.round(ax + Math.cos(a) * 5), Math.round(ay + Math.sin(a) * 5), m.ours ? [255, 220, 40] : [255, 255, 255]);
  });
  // a legend strip and a 50 m scale bar
  const bar = Math.round(50 / G.cell * S); for (let x = 8; x < 8 + bar; x++) for (let y = H - 10; y < H - 6; y++) put(x, y, [255, 255, 255]);
  png(file, W, H, buf);
}

// ------------------------------------------------------------------ main
const dump = opt('from') ? JSON.parse(fs.readFileSync(opt('from'), 'utf8')) : await dumpGame();
if (opt('dump')) fs.writeFileSync(opt('dump'), JSON.stringify(dump));
const results = SPECS.map((S) => scoreIsland(S, dump));
const fmt = (v) => (v == null ? '  —  ' : v.toFixed(1).padStart(5));
console.log(`WORLD-80 similarity (game ${dump.version}); parts coast ${WEIGHTS.coast} / height ${WEIGHTS.height} / landmarks ${WEIGHTS.landmarks} / objects ${WEIGHTS.objects}`);
console.log('island                          score  coast height  landm objects');
for (const r of results) {
  if (r.none) { console.log(`${r.name.padEnd(30)}   n/a  (${r.none.slice(0, 90)}…)`); continue; }
  console.log(`${r.name.padEnd(30)} ${fmt(r.score)}${r.partial ? '*' : ' '} ${fmt(r.parts.coast)} ${fmt(r.parts.height)} ${fmt(r.parts.landmarks)} ${fmt(r.parts.objects)}`);
}
console.log('(* partial: a part that can\'t be compared is left out and the others re-weighted)');
for (const r of results) {
  if (r.none) continue;
  console.log(`\n== ${r.name}: ${r.score?.toFixed(1)}  ${JSON.stringify(r.measure || {})}`);
  for (const n of r.notes) console.log('  note: ' + n);
  for (const d of r.diffs.filter((q) => !q.surplus).slice(0, TOP)) console.log(`  +${d.gain.toFixed(1).padStart(4)}  [${d.part}] ${d.what}`);
  const sur = r.diffs.filter((q) => q.surplus);
  if (sur.length) console.log(`  (surplus, no fix proposed: ${sur.length} areas, ${sur.reduce((t, q) => t + q.gain, 0).toFixed(1)} points; largest: ${sur[0].what})`);
}
if (opt('png')) { fs.mkdirSync(opt('png'), { recursive: true }); for (const r of results) if (r._png) overlay(r, path.join(opt('png'), `${r.id}-overlay.png`)); }
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify({ version: dump.version, weights: WEIGHTS, results: results.map(({ _png, ...r }) => r) }, null, 1));
