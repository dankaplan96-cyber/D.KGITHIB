// Searchable containers outdoors (CONTAINERS): bins, barrels, crates, suitcases and a luggage trolley that Twinsen
// searches with the action (LBA2's zone giver: Game.giverHop). One bonus pops out per visit (CONTAINERS-2: it fills
// again when he comes back through a door, a region change or a shuttle, as in LBA2: main.js refillGivers); it lands
// and stays on the ground until he walks over it (main.js keeps it in the save as `loot`).
//
// CONTAINERS-2 added about as many again: on Citadel by the houses, the square's market, the street corners and the
// harbour (ours: the original has no more outdoor givers there), more of the original's own spots on Zeelich's
// islands, four on Zeelich's street, and on Desert Island by Kesh's houses, Ilka's camp, the track to the dig and the
// dig's rim (our layout). Each keeps off doors and their way out, paths, people's places and routes, story spots.
//
// Where they stand: the original's own outdoor givers (SCENE.HQR zones of type 4 in the exterior scenes, read from the
// user's files as numbers only: docs/LBA2_MEASUREMENTS.md "Givers and bonuses"). On Citadel the original's nine sat
// by the town's baskets: two where the harbour path leaves the lane, three along the harbour path, two west of the
// square, one on the lighthouse headland and one by Twinsen's house (that one already has the house's barrels, so it
// is left out). They stand here as our own street pieces (props.js: the painted litter bin, the barrel, the crate)
// at the original's place, fitted to our town (a metre or two off a path, a door or a tree); a luggage trolley on
// the quay is ours. On Zeelich's islands the original's givers sit by a barrel, a jar or a crate that
// zislands.js already rebuilt as our piece at the same place: the giver is put on that piece (nothing new drawn). On
// Zeelich itself (our own island, not the original's) the givers go on the pier's cargo crates, the barrels by the
// drill platform and the workshop's crate.
//
// The new pieces are static and built before the area is first drawn, so they join its draw and shadow batches
// (engine/drawbatch.js, shadowcull.js): no extra draw call of their own, only one per material a cell did not have
// yet (Desert Island's are drawn in the island's own materials). The searchable ones get a small glint
// (ContainerCues: a twinkle every few seconds on the nearest unsearched ones, none once searched).
//
// CONTRACT: buildCitadelContainers(root, physics, W) → W.containers {placed:[{id,x,z,kind}], skipped:[...]};
//           buildRegionContainers(rooms, physics) → {regionId: {placed, skipped}}; each placed one is pushed to
//           W.givers / R.givers as { id, x, z, y?, r, top, kinds, n, kind }.
import * as THREE from 'three';
import * as P from './props.js';
import { Kit } from './props.js';
import { streetDist } from './town.js';
import { lifeClear } from './townlife.js';
import { ZEELICH } from './zeelich.js';
import { ISLES, ISLE_AT } from './zislands.js';
import * as EP from './props-esmer.js';
import { Batch, tm, pm, bbox, cyl } from './kit.js';
import { DESERT, coastDist, trackDist } from './desert.js';
import { routeDist, keshClear } from './keshlife.js';
import { zlClear } from './zeelife.js';

const ANY = ['money', 'life', 'magic'];   // the original's Info0 112 (16 money + 32 life + 64 magic)
// Citadel, in our frame (the original's place + world.js LAYOUT); n is the original's Info1 (a coin worth n kashes)
export const CITADEL = [
  { id: 'c-lane-bin', kind: 'bin', x: -43.7, z: 28.3, kinds: ANY, n: 1 },        // scene 42: where the harbour path leaves the lane
  { id: 'c-lane-barrel', kind: 'barrel', x: -47.9, z: 28.3, kinds: ANY, n: 1 },  // scene 42
  { id: 'c-path-barrel', kind: 'barrel', x: -68.3, z: 32.1, kinds: ANY, n: 1 },  // scene 42: along the harbour path
  { id: 'c-path-bin', kind: 'bin', x: -63.4, z: 33.5, kinds: ANY, n: 2 },        // scene 42
  { id: 'c-path-crate', kind: 'crate', x: -65.8, z: 43.2, kinds: ANY, n: 1 },    // scene 42
  { id: 'c-west-barrel', kind: 'barrel', x: -63.6, z: -4.2, kinds: ['life'], n: 1 },  // scene 48: west of the square (Info0 32: life only)
  { id: 'c-west-bin', kind: 'bin', x: -57.5, z: -6.7, kinds: ANY, n: 3 },        // scene 48
  { id: 'c-head-crate', kind: 'crate', x: -112.7, z: 99.0, kinds: ANY, n: 3 },   // scene 46: the lighthouse headland
  { id: 'c-quay-cases', kind: 'cases', x: -113.4, z: 46.2, kinds: ['money'], n: 3, ry: Math.PI / 2 },   // ours: luggage on the quay
  // CONTAINERS-2 (ours: the original has no more outdoor givers on Citadel): by the houses (their own frame, the
  // door side +z; the ring search below moves one up to 3 m off a door's way, a path or a person), the square's
  // market, the street corners and the harbour
  { id: 'c-market-crate', kind: 'crate', x: -52.5, z: 4.5, kinds: ['money'], n: 1 },                 // behind the fruit stall
  { id: 'c-corner-bin', kind: 'bin', x: -47.0, z: 12.0, kinds: ['money'], n: 1 },                    // where the south lane bends
  { id: 'c-bug-barrel', kind: 'barrel', house: 'bug', lx: -4.5, lz: 1.6, kinds: ANY, n: 2 },        // by the house in Bug Street
  { id: 'c-pink-barrel', kind: 'barrel', house: 'pink', lx: -3.8, lz: 1.5, kinds: ['life'], n: 1 },   // by the pink house
  { id: 'c-south-crate', kind: 'crate', house: 'south', lx: -3.0, lz: -4.0, kinds: ['money'], n: 1 }, // behind the stone house in the south lane
  { id: 'c-museum-barrel', kind: 'barrel', x: -78.5, z: 46.0, kinds: ANY, n: 1 },                   // behind the museum
  { id: 'c-baggage-cases', kind: 'suitcases', x: -80.0, z: 33.0, kinds: ['money'], n: 2 },           // left outside the baggage claim
  { id: 'c-wing2-bin', kind: 'bin', x: -95.0, z: 34.0, kinds: ['money'], n: 1 },                     // by the harbour building
  { id: 'c-quay-barrel', kind: 'barrel', x: -117.5, z: 38.5, kinds: ANY, n: 2 },                     // the quay's end
  { id: 'c-nbr-crate', kind: 'crate', house: 'nbr', lx: 3.4, lz: 1.0, kinds: ['money'], n: 2 },       // by the neighbour's house, Twinsen's end of town
];
// Zeelich's islands: the original's givers by the island's pieces (island-centred metres, as assets/lba2/islands)
export const ISLES_AT = {
  otringal: [
    { x: -45.8, z: -4.7, kinds: ANY, n: 2 },                 // scene 87
    { x: -52.6, z: 15.7, kinds: ANY, n: 3 },                 // scene 87
    { x: -53.4, z: -11.7, kinds: ['life', 'magic'], n: 4 },  // scene 87 (Info0 96)
    // CONTAINERS-2: more of the original's (SCENE.HQR type-4 zones, scenes 87–90; a cluster of zones within 2.5 m
    // is one container; the clover-only ones and those within 3 m of another are left out; kashes capped at 3)
    { x: -47.5, z: -14.1, kinds: ['money'], n: 2 },          // scene 87
    { x: -47.1, z: 13.3, kinds: ['money'], n: 2 },           // scene 87
    { x: 2.1, z: -48.4, kinds: ANY, n: 3 },                  // scene 88
    { x: 7.3, z: -7.3, kinds: ['money'], n: 3 },             // scene 89 (n 5)
    { x: -9.8, z: 2.1, kinds: ['money'], n: 2 },             // scene 89
    { x: -7.7, z: 33.4, kinds: ANY, n: 3 },                  // scene 90 (n 10)
  ],
  knartas: [
    { x: -33.3, z: -19.3, kinds: ANY, n: 3 },                // scene 107
    { x: -12.4, z: -25.3, kinds: ANY, n: 3 },                // scene 107
    { x: 24.4, z: -10.7, kinds: ANY, n: 1 },                 // scene 108
    { x: -33.8, z: -39.8, kinds: ['money'], n: 2 },          // scene 107 (CONTAINERS-2)
    { x: 29.1, z: -31.2, kinds: ['money'], n: 1 },           // scene 108 (CONTAINERS-2)
  ],
  platform: [
    { x: 46.2, z: 9.0, kinds: ANY, n: 1 },                   // scene 99
    { x: 8.1, z: 15.0, kinds: ANY, n: 1 },                   // scene 99
  ],
  cxislet: [
    { x: 2.1, z: 4.7, kinds: ANY, n: 5 },                    // scene 110
    { x: -4.7, z: -2.1, kinds: ['money'], n: 2 },            // scene 110 (CONTAINERS-2)
  ],
};
// Zeelich (our own island; local metres from zeelich.js): on pieces already there, else one of ours
export const ZEELICH_AT = [
  { id: 'z-pier-crates', x: -51.6, z: -1.5, kinds: ANY, n: 2 },     // the cargo crates by the pier
  { id: 'z-depot-barrels', x: 5.0, z: 13.4, kinds: ANY, n: 3 },     // the barrels by the drill platform
  { id: 'z-yard-barrels', x: 22.7, z: 10.3, kinds: ['life', 'magic'], n: 1 },
  // CONTAINERS-2: the Esmer street, by the houses' corners (not on the street's middle, where people walk)
  { id: 'z-street-west', x: -36.0, z: -7.6, kinds: ['money'], n: 1 },   // by the minaret house
  { id: 'z-street-arcade', x: -19.6, z: -9.6, kinds: ['money'], n: 2 }, // past the arcade house
  { id: 'z-street-east', x: -6.6, z: -8.2, kinds: ANY, n: 1 },          // by the domed house
  { id: 'z-street-south', x: -33.6, z: 8.0, kinds: ['money'], n: 1 },   // across the street
];
// Desert Island (CONTAINERS-2; local metres from desert.js, our own layout: the original's ~60 desert givers stood on
// its own village and paths, which ours does not follow): by Kesh's houses, Ilka's tent at the camp, the track up to
// the dig (the temple's approach) and the dig's rim. Citadel's pieces (props.js), the kind given here.
export const DESERT_AT = [
  { id: 'd-kesh-east', kind: 'barrel', x: -32.5, z: 17.5, kinds: ['money'], n: 1 },    // beside the east house
  { id: 'd-kesh-west', kind: 'barrel', x: -60.5, z: 14.5, kinds: ['money'], n: 2 },    // by the house under the screens
  { id: 'd-kesh-tarra', kind: 'crate', x: -44.5, z: 19.5, kinds: ['money'], n: 1 },    // behind Tarra's house
  { id: 'd-camp-trunk', kind: 'trunk', x: -13.6, z: -49.0, kinds: ['money'], n: 2 },    // Ilka's trunk by her tent
  { id: 'd-camp-crate', kind: 'crate', x: -14.5, z: -42.5, kinds: ['life', 'magic'], n: 1 }, // the camp's stores
  { id: 'd-track-crate', kind: 'crate', x: 40.0, z: 18.5, kinds: ANY, n: 2 },          // the last bend before the dig
  { id: 'd-dig-north', kind: 'crate', x: 58.0, z: 8.5, kinds: ['money'], n: 2 },       // the dig's rim
  { id: 'd-dig-west', kind: 'barrel', x: 45.5, z: 37.0, kinds: ANY, n: 1 },            // the dig's rim, by the track's end
];

// ---------------------------------------------------------------- the pieces (props.js builders)
const BIN_COLORS = ['#2f6a9a', '#2a8a7a', '#3f8a4a'];
let binN = 0;
const BUILD = {
  bin: (k) => P.litterBin(k, { color: BIN_COLORS[binN++ % BIN_COLORS.length] }),
  barrel: (k) => P.barrel(k, { r: 0.34, h: 0.9 }),
  crate: (k) => P.crate(k, 0.72, { pal: 'honey' }),
  cases: (k) => P.luggageTrolley(k, { seed: 4, load: 3 }),
  suitcases: (k) => P.suitcaseStack(k, { seed: 3, n: 3 }),
};
const FOOT = { bin: { r: 0.29 }, barrel: { r: 0.36 }, crate: { hw: 0.36, hd: 0.36 }, cases: { hw: 0.56, hd: 0.33 }, suitcases: { hw: 0.4, hd: 0.27 }, trunk: { hw: 0.42, hd: 0.28 } };
// Desert Island's pieces, in the materials desert.js already draws with (kit.js caches them by name and colour), so
// they join the island's own batches: no material of their own. A crate of the camp's planks with dark battens, a
// barrel of the pier's wood with iron hoops, a dark wooden trunk with iron bands.
const DW = { wood: () => tm('wood', { color: '#9a6a40' }), dark: () => tm('wood', { color: '#6a4528' }), crate: () => tm('planks', { color: '#c8a070' }), iron: () => pm('#4a4440', 0.55, { metalness: 0.5 }) };
const DESERT_PIECE = {
  crate(B, x, y, z, ry) {
    const s = 0.7, c = Math.cos(ry), sn = Math.sin(ry);
    B.add(bbox(s, s, s, 0.03, 1), DW.crate(), x, y + s / 2, z, 0, ry, 0);
    for (const k of [-1, 1]) B.add(bbox(0.07, s + 0.01, s + 0.02, 0.01, 1), DW.dark(), x + c * k * s * 0.36, y + s / 2, z - sn * k * s * 0.36, 0, ry, 0);
    return { hw: s / 2, hd: s / 2, top: s };
  },
  barrel(B, x, y, z) {
    const h = 0.86;
    B.add(cyl(0.3, 0.27, h, 12, 1), DW.wood(), x, y + h / 2, z);
    for (const hy of [0.16, h - 0.16]) B.add(cyl(0.305, 0.305, 0.05, 12, 0), DW.iron(), x, y + hy, z);
    B.add(cyl(0.27, 0.27, 0.02, 12, 0), DW.dark(), x, y + h + 0.01, z);
    return { r: 0.31, top: h + 0.02 };
  },
  trunk(B, x, y, z, ry) {
    const w = 0.84, d = 0.54, h = 0.5, c = Math.cos(ry), sn = Math.sin(ry);
    B.add(bbox(w, h, d, 0.04, 1), DW.dark(), x, y + h / 2, z, 0, ry, 0);
    for (const k of [-1, 1]) B.add(bbox(0.05, h + 0.02, d + 0.02, 0.01, 1), DW.iron(), x + c * k * w * 0.3, y + h / 2, z - sn * k * w * 0.3, 0, ry, 0);
    return { hw: w / 2, hd: d / 2, top: h + 0.01 };
  },
};
const rad = (fp) => fp.r ?? Math.hypot(fp.hw, fp.hd);

// Citadel's NPC places (as citydress.js keeps them clear) and the crystals (main.js crystalSpots)
const NPC_SPOTS = [[-39.6, -2.4], [-40.8, -1.1], [-46.2, -0.9], [-118, 45.2], [-49, 4], [-47.7, 4], [-35.5, -11.5], [-40, 6], [-34, -7.5], [-50, 30], [-30, 45], [-60, 55], [-29.3, 75.3]];
const CRYSTALS = [[-113, 85], [-28, 40], [-45, -84], [-85, -49.5]];

// is there room for a piece of radius r at (x, z), and somewhere beside it to stand and hop?
function roomFor(physics, x, z, r, ground, why) {
  const h = ground(x, z);
  for (const c of physics.near(x, z)) {
    if (!c.enabled || c.top < h + 0.05) continue;
    if (physics._inside(c, x, z, r + 0.12)) return why('collider');
  }
  // (not by a brink: no drop of more than 0.7 m within 1.3 m of it, so neither he nor its bonus goes over)
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    if (ground(x + Math.sin(a) * (r + 1.3), z + Math.cos(a) * (r + 1.3)) < h - 0.7) return why('brink');
  }
  let open = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, sx = x + Math.sin(a) * (r + 0.65), sz = z + Math.cos(a) * (r + 0.65);
    if (Math.abs(ground(sx, sz) - h) > 0.4) continue;
    if (physics.near(sx, sz).some((c) => c.enabled && c.top > h + 0.3 && physics._inside(c, sx, sz, 0.3))) continue;
    open++;
  }
  return open >= 3 ? null : why('no room to stand');
}

// Where a container of radius r may stand on Citadel: a reason it may not, or null. Off the paths, the streets'
// middles, every door's way out, signs, other givers, NPCs' places and routes (townlife), the crystals, the dogs'
// yards; level, above the sea, not by a drop, with room to stand beside it.
export function citadelFit(W, physics) {
  const T = W.terrain, H = (x, z) => T.heightAt(x, z);
  // (the way out of every house door stays open: world.js keeps trees and bushes out of a 4 m lane, 11 m long)
  const doorLane = (x, z, pad) => (W.houses || []).some((h) => {
    if (!h.door) return false;
    const ry = h.ry ?? Math.atan2(h.door.x - h.x, h.door.z - h.z), nx = Math.sin(ry), nz = Math.cos(ry);
    const dx = x - h.door.x, dz = z - h.door.z, along = dx * nx + dz * nz, across = Math.abs(dx * nz - dz * nx);
    return (along > -0.5 && along < 11 && across < 2 + pad) || Math.hypot(dx, dz) < 1.5 + pad;
  });
  return (x, z, r, why = (s) => s) => {
    if (H(x, z) < 1.2) return why('low');
    if (T.slopeAt(x, z) > 0.35) return why('steep');
    if (W.pathDist && W.pathDist(x, z) < 1.0 + r) return why('path');
    if (streetDist(x, z) < r - 0.5) return why('street');
    if (lifeClear(x, z)) return why('townlife');
    if (doorLane(x, z, r)) return why('door');
    for (const s of W.signs || []) if (Math.hypot(x - s.x, z - s.z) < 1.4 + r) return why('sign');
    for (const v of W.givers || []) if (Math.hypot(x - v.x, z - v.z) < 2.5) return why('giver');
    for (const [sx, sz] of NPC_SPOTS) if (Math.hypot(x - sx, z - sz) < 2.0 + r) return why('npc');
    for (const [sx, sz] of CRYSTALS) if (Math.hypot(x - sx, z - sz) < 2.0 + r) return why('crystal');
    for (const d of W.dogs || []) { const A = d.area; if (A && x > A.x0 - r && x < A.x1 + r && z > A.z0 - r && z < A.z1 + r) return why('dog'); }
    return roomFor(physics, x, z, r, H, why);
  };
}
// a house-relative spot ({ house, lx, lz }: the house's frame, its door side +z) in world metres
function spotOf(W, c) {
  if (!c.house) return c;
  const h = (W.houses || []).find((q) => q.id === c.house);
  if (!h) return null;
  return { ...c, x: h.x + Math.cos(h.ry) * c.lx + Math.sin(h.ry) * c.lz, z: h.z - Math.sin(h.ry) * c.lx + Math.cos(h.ry) * c.lz, ry: c.ry ?? h.ry + (c.rr || 0) };
}

export function buildCitadelContainers(root, physics, W) {
  const g = new THREE.Group(); g.name = 'containers'; root.add(g);
  const T = W.terrain, H = (x, z) => T.heightAt(x, z), kit = new Kit(g);
  const placed = [], skipped = [];
  const fit = citadelFit(W, physics);
  for (const c0 of CITADEL) {
    const c = spotOf(W, c0);
    if (!c) { skipped.push(`${c0.id}: no house ${c0.house}`); continue; }
    const fp = FOOT[c.kind], r = rad(fp);
    let first = null;
    const why = (s) => { first ??= s; return s; };
    const bad = (x, z) => fit(x, z, r, why);
    // the original's place first, then rings round it (up to 3 m)
    let at = null;
    for (const d of [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) {
      for (let k = 0; k < (d ? 12 : 1) && !at; k++) {
        const a = (k * Math.PI) / 6, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
        if (!bad(x, z)) at = { x, z };
      }
      if (at) break;
    }
    if (!at) { skipped.push(`${c.id} (${c.x.toFixed(1)}, ${c.z.toFixed(1)}): ${first}`); continue; }
    const y = H(at.x, at.z) - 0.02, ry = c.ry ?? ((at.x * 7.3 + at.z * 3.1) % (Math.PI * 2));
    const got = kit.at(at.x, y, at.z, ry, () => BUILD[c.kind](kit)) || fp;
    if (got.r != null) physics.add({ type: 'cyl', x: at.x, z: at.z, r: got.r, top: y + got.top, noStand: true, seeThrough: true });
    else physics.add({ type: 'box', x: at.x, z: at.z, hw: got.hw, hd: got.hd, rot: ry, top: y + got.top, noStand: true, seeThrough: true });
    const gv = { id: c.id, x: at.x, z: at.z, r: rad(got) + 1.05, top: got.top, kinds: c.kinds, n: c.n, kind: c.kind };
    W.givers.push(gv);
    placed.push({ id: c.id, kind: c.kind, x: +at.x.toFixed(2), z: +at.z.toFixed(2), moved: +Math.hypot(at.x - c.x, at.z - c.z).toFixed(2) });
  }
  kit.flush();
  W.containers = { placed, skipped };
  return W.containers;
}

// the ground round (x, z): the middle of what the walkable surface holds at 1.6 m round it (a crate he could
// stand on is not the ground)
function groundRound(physics, x, z) {
  const hs = [];
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; hs.push(physics.groundAt(x + Math.sin(a) * 1.6, z + Math.cos(a) * 1.6)); }
  hs.sort((p, q) => p - q);
  return hs[3];
}
// a place beside (x, z) to stand and hop: the island's land (not the clouds), level, free of pieces
function standRoom(physics, R, x, z, r, gh) {
  let n = 0;
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6, sx = x + Math.sin(a) * (r + 0.6), sz = z + Math.cos(a) * (r + 0.6);
    if (R.land && !R.land(sx, sz)) continue;
    if (Math.abs(physics.groundAt(sx, sz, gh + 0.4) - gh) > 0.45) continue;
    if (physics.near(sx, sz).some((c) => c.enabled && c.top > gh + 0.3 && physics._inside(c, sx, sz, 0.3))) continue;
    n++;
  }
  return n;
}
// a giver on a piece already standing near (x, z) (a barrel, a jar, a crate stack: something small that stands
// 0.4–2.6 m off the ground), else null
function onPiece(physics, R, x, z) {
  const gh = groundRound(physics, x, z);
  let best = null, bd = 1.8;
  for (const c of physics.near(x, z)) {
    if (!c.enabled) continue;
    const size = c.type === 'cyl' ? c.r : Math.max(c.hw, c.hd), top = c.top - gh;
    if (size > 1.4 || top < 0.4 || top > 2.6) continue;
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best || (R.clearOf && !R.clearOf(best.x, best.z))) return null;
  const r = best.type === 'cyl' ? best.r : Math.hypot(best.hw, best.hd);
  if (standRoom(physics, R, best.x, best.z, r, gh) < 2) return null;
  return { x: best.x, z: best.z, y: gh, r: r + 1.05, top: best.top - gh, kind: 'piece' };
}
// can a new piece of radius r stand at (x, z) in region R? a reason it can't, or null
export function pieceRoom(physics, R, px, pz, r) {
  if (R.land && !R.land(px, pz)) return 'off the land';
  if (R.clearOf && !R.clearOf(px, pz)) return 'keep';
  const gh = physics.groundAt(px, pz);
  if (gh < -0.3 || Math.abs(groundRound(physics, px, pz) - gh) > 0.3) return 'not level';
  if (physics.near(px, pz).some((c) => c.enabled && c.top > gh + 0.05 && physics._inside(c, px, pz, r + 0.15))) return 'collider';
  if (standRoom(physics, R, px, pz, r, gh) < 4) return 'no room to stand';
  // (not by the island's edge or a drop)
  for (let q2 = 0; q2 < 8; q2++) { const b = (q2 * Math.PI) / 4, bx = px + Math.sin(b) * (r + 1.3), bz = pz + Math.cos(b) * (r + 1.3); if ((R.land && !R.land(bx, bz)) || physics.groundAt(bx, bz, gh + 0.4) < gh - 0.7) return 'brink'; }
  return null;
}
// else one of our Esmer pieces (props-esmer.js: a barrel or a crate) on level land within 3 m of (x, z); on Desert
// Island one of Citadel's (props.js, in the region's Kit: kind given by the spot)
function newPiece(physics, R, B, x, z, k, kitKind = null) {
  const kind = kitKind || (k % 2 ? 'crate' : 'barrel'), fp = kitKind && FOOT[kitKind], r = fp ? rad(fp) : kind === 'crate' ? 0.5 : 0.36;
  for (const d of [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) for (let q = 0; q < (d ? 12 : 1); q++) {
    const a = (q * Math.PI) / 6, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
    if (pieceRoom(physics, R, px, pz, r)) continue;
    const gh = physics.groundAt(px, pz), o = R.group.position;
    if (kitKind) {
      const ry = (px * 3.7 + pz) % 6.283;
      const got = DESERT_PIECE[kitKind](B, px - o.x, gh - 0.02, pz - o.z, ry);
      if (got.r != null) physics.add({ type: 'cyl', x: px, z: pz, r: got.r, top: gh + got.top, noStand: true, seeThrough: true });
      else physics.add({ type: 'box', x: px, z: pz, hw: got.hw, hd: got.hd, rot: ry, top: gh + got.top, noStand: true, seeThrough: true });
      return { x: px, z: pz, y: gh, r: rad(got) + 1.05, top: got.top, kind: kitKind };
    }
    const Pl = new EP.Place(B, px - o.x, gh - 0.02, pz - o.z, (px * 3.7 + pz) % 6.283);
    if (kind === 'crate') EP.crate(Pl, { s: 0.7, kind: 'wood' }); else EP.barrel(Pl, { color: '#b07850' });
    if (kind === 'crate') Pl.box(0, 0, 0.37, 0.37, 0.72);
    for (const c of Pl.cols) physics.add({ ...c, x: c.x + o.x, z: c.z + o.z });
    return { x: px, z: pz, y: gh, r: r + 1.05, top: kind === 'crate' ? 0.72 : 0.86, kind };
  }
  return null;
}

// What a region keeps clear (world x, z): a reason, or null. Its people's places, its doors, exits, story zones and
// searches, the shuttle's board and landing (there the action key answers the board); on Zeelich the street's life
// (zeelife.js); on Desert Island the coast, the sand tracks and the yacht's routes and stops, Kesh's poles and
// screens, the research post (its drones' round), the pump, the oasis, the dig's pit and gate, the ruins' door.
export function regionKeep(R) {
  const pts = [];
  const add = (p, r) => { if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) pts.push([p.x, p.z, r]); };
  for (const p of Object.values(R.npcSpots || {})) add(p, 2.5);
  for (const k of ['board', 'pad', 'spawn']) add(R[k], 4.5);
  for (const k of ['workshopDoor', 'councilDoor']) add(R[k], 4);
  for (const e of R.exits || []) add(e, 3.5);
  for (const zn of R.zones || []) add(zn, (zn.r || 1) + 1.5);
  for (const s of R.searches || []) add(s, 2.5);
  const o = R.group?.position || { x: 0, z: 0 };
  let extra = null;
  if (R.id === 'zeelich') extra = (x, z) => (zlClear(x - o.x, z - o.z, 0.8) ? 'street life' : null);
  if (R.id === 'desert') {
    for (const k of ['dock', 'rope', 'bore', 'yacht']) add(R[k], 4.5);
    add(R.pump, 6); add(R.oasis && { x: R.oasis.x, z: R.oasis.z }, (R.oasis?.r || 7) + 3);
    add(R.ruins?.door, 4); add(R.ruins?.stand, 3); add(R.dig?.gate, 4); add(R.dig?.keypad, 3); add(R.camp, 2.5);
    for (const [ex, ez] of [[-8, -40], [44, 25]]) add({ x: o.x + ex, z: o.z + ez }, 4.5);   // (the yacht's other stops: desert.js ENDS)
    const P = R.post, D = R.dig;
    extra = (x, z) => {
      const lx = x - o.x, lz = z - o.z;
      if (coastDist(lx, lz) < 5) return 'coast';
      if (trackDist(lx, lz) < 2.6) return 'track';
      if (routeDist(lx, lz) < 3.2) return 'yacht route';
      if (keshClear(lx, lz, 0.8)) return 'kesh';
      if (P && x > P.x0 - 3 && x < P.x1 + 3 && z > P.z0 - 3 && z < P.z1 + 3) return 'post';
      if (D && Math.hypot(x - D.x, z - D.z) < 17.5) return 'dig pit';
      return null;
    };
  }
  return (x, z) => {
    for (const [px, pz, r] of pts) if (Math.hypot(x - px, z - pz) < r) return 'keep';
    return extra ? extra(x, z) : null;
  };
}

export function buildRegionContainers(rooms, physics) {
  const out = {}, batches = new Map();
  const put = (R, id, x, z, kinds, n, k, kitKind = null) => {
    const o = (out[R.id] ||= { placed: [], skipped: [] });
    const keep = R._keep ||= regionKeep(R);
    R.clearOf = (px, pz) => !keep(px, pz);
    if (!R.givers) R.givers = [];
    if (R.givers.some((v) => Math.hypot(v.x - x, v.z - z) < 2.5)) { o.skipped.push(`${id}: a giver already there`); return; }
    let B = batches.get(R); if (!B) { B = new Batch(R.group); batches.set(R, B); }
    const at = (!kitKind && onPiece(physics, R, x, z)) || newPiece(physics, R, B, x, z, k, kitKind);
    if (!at) { o.skipped.push(`${id} (${x.toFixed(1)}, ${z.toFixed(1)}): no room`); return; }
    R.givers.push({ id, ...at, kinds, n });
    o.placed.push({ id, kind: at.kind, x: +at.x.toFixed(2), z: +at.z.toFixed(2), moved: +Math.hypot(at.x - x, at.z - z).toFixed(2) });
  };
  const Z = rooms.zeelich;
  if (Z) ZEELICH_AT.forEach((c, k) => put(Z, c.id, ZEELICH.x + c.x, ZEELICH.z + c.z, c.kinds, c.n, k));
  for (const [name, list] of Object.entries(ISLES_AT)) {
    const R = rooms['isle_' + name], i = ISLES.indexOf(name);
    if (!R || i < 0) continue;
    const at = ISLE_AT(i);
    list.forEach((c, k) => put(R, name + '-c' + k, at.x + c.x, at.z + c.z, c.kinds, c.n, k));
  }
  const D = rooms.desert;
  if (D) DESERT_AT.forEach((c, k) => put(D, c.id, DESERT.x + c.x, DESERT.z + c.z, c.kinds, c.n, k, c.kind));
  for (const B of batches.values()) B.build();
  return out;
}

// ---------------------------------------------------------------- the glint
// A small four-pointed twinkle over the nearest unsearched containers (at most POOL, within NEAR m): a flash of
// ~0.4 s every few seconds, each on its own beat. Gone once a container is searched. No text.
const POOL = 4, NEAR = 11;
let starTex = null;
function star() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,250,220,0.95)'); g.addColorStop(0.18, 'rgba(255,230,150,0.55)'); g.addColorStop(1, 'rgba(255,220,120,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(255,252,235,1)';
  for (const [w, h] of [[3, 30], [30, 3]]) { x.beginPath(); x.ellipse(32, 32, w, h, 0, 0, Math.PI * 2); x.fill(); }
  starTex = new THREE.CanvasTexture(c); starTex.colorSpace = THREE.SRGBColorSpace;
  return starTex;
}
export class ContainerCues {
  constructor(scene) {
    this.sprites = [];
    const m = new THREE.SpriteMaterial({ map: star(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    for (let i = 0; i < POOL; i++) { const s = new THREE.Sprite(m); s.visible = false; s.renderOrder = 5; scene.add(s); this.sprites.push(s); }
    this.list = []; this.t = 0; this.pick = 0;
  }
  // (hidden while the game isn't being played: menus, dialogue, cinematics)
  update(dt, game, on = true) {
    this.t += dt; this.pick -= dt;
    if (!on) { for (const s of this.sprites) s.visible = false; return; }
    const h = game.hero;
    if (this.pick <= 0) {   // which ones (twice a second)
      this.pick = 0.5;
      this.list = game.givers().filter((gv) => !game.giverTaken(gv) && Math.hypot(gv.x - h.pos.x, gv.z - h.pos.z) < NEAR && Math.abs((gv.y ?? h.pos.y) - h.pos.y) < 3)
        .sort((a, b) => Math.hypot(a.x - h.pos.x, a.z - h.pos.z) - Math.hypot(b.x - h.pos.x, b.z - h.pos.z)).slice(0, POOL);
    }
    this.sprites.forEach((s, i) => {
      const gv = this.list[i];
      if (!gv) { s.visible = false; return; }
      // its own beat: a 0.45 s twinkle every 2.4–3.4 s
      const seed = Math.abs(Math.sin(gv.x * 12.9898 + gv.z * 78.233)) , period = 2.4 + seed, ph = (this.t + seed * period) % period;
      if (ph > 0.45) { s.visible = false; return; }
      const k = Math.sin((ph / 0.45) * Math.PI);
      const y = (gv.y ?? game.physics.groundAt(gv.x, gv.z, h.pos.y + 1)) + (gv.top ?? 1) + 0.08;
      s.position.set(gv.x + (seed - 0.5) * 0.25, y, gv.z);
      s.scale.setScalar(0.12 + 0.3 * k);
      s.material.rotation = ph * 2;
      s.visible = true;
    });
  }
}
