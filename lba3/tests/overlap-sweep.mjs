// OVERLAP-SWEEP (the user, 17.11, P65: "again things overlapping — go over the whole game and check", a picture of Mill
// Lane Steps' ferry stage on Zeelich, its planks running on into the ground). One sweep over every area and room, by
// machine, in five categories (docs/lba-maturity/OVERLAP-SWEEP.md has the findings, the fixes and what is left):
//   (a) pieces through each other   tests/lib/sweep.js: the drawn parts as solids along vertical rays, a free piece (an
//                                   instance or a lone mesh under 3 m) inside another object's part by > 2 cm;
//                                   + place-scan's `inside` and `wall` (the Kit's pieces as boxes, PLACE=1)
//   (b) coplanar surfaces fighting  sweep.js: two different surfaces facing up within 3 mm on ≥ 4 rays (0.25 m²), the
//                                   ground among them; + worldfit's triangle pairs ≥ 0.15 m² (walls too, WORLDFIT=1)
//   (c) sunk or floating            sweep.js: a cluster of touching parts with a gap of 2 cm … 1 m under its lowest point
//                                   (nothing under it), a small one (< 2.5 m) wholly 5 cm or more in the ground;
//                                   + worldfit's buildings (gap under the plinth, ground over it) + place-scan's float/sunk
//   (d) decks, steps, paths into the ground   sweep.js: a part's flat top under the ground (or flush with it) on some rays
//                                   and above it on others, ≥ 0.12 m² of it
//   (e) ground patches on paving    sweep.js: foliage (grass, flowers, tulips) standing on a part's flat top that is not
//                                   the ground, or on terrain painted as cobbles; a see-through decal lying on a part;
//                                   (d) findings where the ground over a paving part is painted grass / dirt / sand
//   (f) rock in rock (P121)        sweep.js: two rock parts (one mesh's too: Citadel's cliff rocks) where half or more of
//                                   the smaller is inside the other but not all of it: what shows of it are slivers and
//                                   shards out of the other's faces (the user's v150 photo of the knoll by the water office)
//   (g) rock cut by masonry (P121) sweep.js: a rock part through a built part (a wall, a house, paving, steps) by more
//                                   than 5 cm on 3 rays or more
//   (c) also counts a rock floating over the ground (only a sunk rock is by design: its foot is buried)
// Every finding that is not on KNOWN (below: by design, each with its reason) FAILS. The counts per area and category
// are printed (COUNTS lines) and kept in REPORT=<file.json>.
// Env: OUT=<dir> keeps each area's raw result (a rerun skips the areas already there: RESUME=1); ONLY=a,b the areas;
// PLACE=1 / WORLDFIT=1 add the two older scans (child runs, their REPORT read back); SHOTS=<dir> pictures of failing
// findings (the game camera near, from above). GAME_URL, BOOT_TIMEOUT as the other tests.
// Run: BOOT_TIMEOUT=900000 GAME_URL=http://localhost:8123/ node tests/overlap-sweep.mjs   (~25 min quiet; Automated runtime only)
import { launch, open, menu, checker, report } from './lib/boot.mjs';
import { serveLocal } from './lib/serve.mjs';   // (SERVE=1: this checkout's files by request routing, no http.server)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const { check, checkVisual, done } = checker();
const LIB = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'sweep-'));
fs.mkdirSync(OUT, { recursive: true });

// the browsers: one per batch (every area of a batch built in it); a crash is retried once
const BATCHES = [
  ['citadel', 'house', 'well', 'office', 'projoffice', 'control', 'lighttop', 'cellar', 'tavern', 'tavcellar', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse',
    'nellhouse', 'pumproom', 'baggage', 'tralucave', 'terminal', 'sewer', 'sewervault', 'sewerglobe', 'wtent', 'school', 'asylum', 'bumaze', 'arena'],
  ['zeelich', 'workshop', 'upper', 'council', 'archive', 'zterminal', 'zh_*', 'valves', 'otrbar', 'otrhotel', 'celtemple'],
  ['isle_*', 'ih_*', 'wm_*', 'kc_*'],   // (wm_*: WAVE6 H-16's deep seam under the Platform; kc_*: KEYS-CLOVER's four rooms)
  ['desert', 'condA', 'condB', 'butemple', 'hamalayi', 'obsv', 'ham_*', 'c3shaft', 'c3deep', 'c3gallery', 'c3sendell', 'c3core'],
  ['ballastra', 'bl_shed', 'bl_arches', 'bl_oren', 'bl_mags', 'bl_pump', 'bl_gardens', 'bl_tunnel', 'bl_kiln'],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const CITADEL = { x0: -206, x1: 54, z0: -114, z1: 146 };
const OUTDOOR = /^(citadel|zeelich|isle_.*|desert|hamalayi|ballastra|bl_arches|bl_gardens)$/;

// ------------------------------------------------------------------ KNOWN: measured, looked at, left by design
// [area, category, test (a RegExp on the finding's text) | null, near [x, z] | null, radius, why]
const ROCKS = /cliffRocks|plateauStones|smallPool|rimRock|rock|boulder|scree|pebble/i;
const KNOWN = [
  // rocks: set into the ground by design (a rock's foot is buried, its top shows: scatter in vegetation.js / world.js)
  ['*', 'c', ROCKS, null, 0, 'by design: rocks are set into the ground (their foot buried), not standing pieces', 'sunk'],   // (P121: a floating rock is not)
  ['*', 'd', ROCKS, null, 0, 'by design: a rock\'s flat facet under the ground beside its top: set into the ground'],
  // H-15 (FRANCOS.md): the diggers' heaps of dug earth on Knartas's slope (a filled hole's low mound, a hole's spoil) rise
  // out of the ground as the rocks do: their foot is in it by design (their own group, 'francos dig earth': the seat, the
  // spades, the box and the shrine are not matched)
  ['isle_knartas', 'c', /francos dig earth/, [2253, 1806], 12, 'by design: a heap of dug earth (a filled hole, a spoil heap) rises out of the ground, its foot in it', 'sunk'],
  ['isle_knartas', 'd', /francos dig earth/, [2253, 1806], 12, 'by design: a heap of dug earth (a filled hole, a spoil heap) rises out of the ground, its foot in it'],
  ['isle_knartas', 'e', /francos dig earth/, [2253, 1806], 12, 'by design: a heap of dug earth on the grass (not paving): its foot in the ground'],
  ['*', 'c', /gull|bird/i, null, 0, 'not a placed piece: birds perched or flying (they move between frames)'],
  ['*', 'c', /foam|ripple/i, null, 0, 'by design: foam and ripples lie on the water\'s surface'],
  ['*', 'c', /over [^|]*(cloud sea|water)/, null, 0, 'by design: piles and posts end in the cloud sea or the water (nothing under them is seen)'],
  ['*', 'c', /bl_floating|marketFloat/, null, 0, 'by design: the Float Harbor\'s floating beds and market rafts ride on the water (Ballastra)'],
  // Citadel (chapters 1–2): looked at (captures/overlap-sweep/) or measured and left
  ['citadel', 'a', /asylum-front/, [-26.3, -51.4], 2.5, 'low: two merlons of the fort wall\'s crenellation stand inside the Workers\' Hostel front\'s roof, built against that wall (asylumhostel.js); the roof hides them'],
  ['citadel', 'd', /old-door-passage/, null, 0, 'by design: the old passage\'s stone vault runs into the hillside (its way in)'],
  ['citadel', 'd', /old-door-plateau-stair/, null, 0, 'by design: the old stair\'s top tread meets the plateau\'s slope'],
  ['citadel', 'e', /sewerhatch/, null, 0, 'by design: the sewer hatch\'s frame is set flush in the terrace\'s ground'],
  ['citadel', 'd', /statue/, [-44.7, -11.1], 2, 'low (9 cm): the statue\'s lowest step is set into the square\'s slope on its uphill side (looked at)'],
  ['citadel', 'c', /pipeline/, null, 0, 'by design: the project\'s pipeline goes into the ground by the station'],
  ['citadel', 'd', /pipeline/, null, 0, 'by design: the project\'s pipeline goes into the ground by the station'],
  // P121 (g) in the caves, looked at from the room camera (captures/p121/cave-*.jpg)
  ['tralucave', 'g', /#c4bcb2 through .*#(eceae6|c8c2b6)/, null, 0, 'by design (looked at): the rubble along the low near rims, set into the rim wall (tralucave.js); reads as stones on a rocky rim'],
  ['c3gallery', 'g', /through .*#(8a90b0|aef6ff|e0c0ff)/, null, 0, 'by design (looked at): the gallery\'s crystals rise out of rubble heaps (underground.js)'],
  ['c3shaft', 'g', /through .*#aef6ff/, null, 0, 'by design: a crystal rising out of the rock (underground.js)'],
  ['citadel', 'g', /pipeline/, [-72.7, -30.9], 1, 'low (18 cm, 3 rays): the pipeline post\'s foot plate set into a cliff rock where the post meets the slope, as its ground entries'],
  ['citadel', 'c', /dressing/, [-27.2, -8.1], 1.5, 'looked at: the post stands on its feet on the ground; the feet are thinner than the rays\' spacing (the gap is to its board)'],
  ['bl_gardens', 'e', /pitWater/, null, 0, 'by design: the water standing in the pit (a see-through surface on its floor)'],
  ['c3core', 'c', /Octahedron/, null, 0, 'by design: the receivers\' crystals float in their brass cages (underground.js; place-scan\'s list too)'],
  ['zeelich', 'e', /Buffer<Group<zeelich \[\]/, [2364.1, -4.1], 1, 'measured: a paper on the stall\'s counter, 0.97 m up, not a patch on the ground'],
  ['zeelich', 'c', /zeelich/, [2368.7, 2.0], 1, 'looked at: the plaza bench\'s back on its legs over the seat (captures/overlap-sweep/ch1-2-zeelich-plaza-bench-looked-at.jpg)'],
  // P65-2 (the open list's triage, 21.11; docs/lba-maturity/OVERLAP-SWEEP.md): each looked at from the play camera
  // (captures/overlap-2/) or measured where no reachable spot shows it. ("looked at" = a game-camera picture and a close one)
  // -- the Hamalayi
  ['hamalayi', 'c', /sd3-monastery.*#e0b25a/, [4334.1, -50], 1, 'not seen: the hall\'s gilt finial 5 cm over its roof\'s ridge, 14 m over the yard (the play camera stays under it)'],
  ['hamalayi', 'c', /storylife/, [4345.6, -36], 1, 'low (3 cm, looked at): a barrel of the yard\'s stores on the slope (storylife.js)'],
  ['hamalayi', 'c', /#8f8c86/, [4244.1, 42.75], 1, 'by design (looked at): a stone in the gorge\'s riverbed, set 7 cm into it (hamalayi-finish.js gorgeRiver)'],
  ['hamalayi', 'b', /stone#d8d0c4 \| \?:stone#d8d0c4/, [4362, -50], 1.5, 'not seen (looked at): two faces of the waystone cairn\'s base in one plane, one stone texture (story/depth.js, its owner\'s)'],
  // -- Desert Island
  ['desert', 'c', /^merged<Group<desert #ffffff/, [3423.3, -23.4], 1, 'looked at: the research post\'s equipment on its desk; the desk\'s legs are thinner than the rays\' spacing'],
  ['desert', 'd', /#d6c9b2/, [3332.1, -66.6], 1.5, 'low (8 cm, looked at): the old school wall\'s paving where the cobbled ground rises over its edge (desertold.js)'],
  ['desert', 'e', /#d6c9b2/, [3402.8, 1.4], 1.5, 'by design (looked at): the School\'s doorstep at S28\'s mask, sand drifted over its back corner (desertold.js)'],
  ['desert', 'e', /#d6c9b2/, [3403.3, -18.4], 1.5, 'by design (looked at): the bunk tower\'s doorstep, sand drifted over its corner (desertold.js)'],
  ['desert', 'c', /^(the pool mask|tower s28|the school mask):/, null, 0, 'by design (looked at): set into the canyon\'s rock or sunk in its pit, as LBA2\'s; worldfit\'s plinth model reads the rock as ground over a plinth'],
  ['desert', 'c', /^the school hall:/, null, 0, 'by design (looked at): the old school hall rises out of the pool, its walls carried down under the water (desertold.js); worldfit reads the water as a gap'],
  ['desert', 'c', /^house kesh4:/, null, 0, 'not seen (looked at): the back corner of Kesh\'s house 4 over a dip in the sand, 17 cm (worldfit)'],
  ['desert', 'c', /^post cabin \d:/, null, 0, 'not a gap (looked at): the cabins stand on the research post\'s pad; worldfit registers them at the pad\'s base level'],
  // -- the isles (zislands.js: the original's objects; props-esmer.js: our street furniture)
  ['*', 'b', /the cloud sea/, null, 0, 'not seen: the island\'s foot meets the bottom cloud layer far under its edge, behind the two upper layers (about 0.9 opaque together)'],
  ['*', 'c', /^Buffer<isle_\w+ #ffffff \(\d+ parts[^)]*\) over Buffer<isle_\w+ \[\w+\] #ecdce4/, null, 0, 'looked at: a planter\'s plant (props-esmer.js planter): its crown over the soil, its stems thinner than the rays\' spacing'],
  ['*', 'c', /^Buffer<isle_\w+ \[\w+\] #ffffff \+ Buffer<isle_\w+ #fff4d8/, null, 0, 'looked at: a street lamp at the original\'s place on a bank: its foot meets the ground on the uphill side, the gap is under it toward the drop (Knartas 12 cm, Otringal 62 cm at a brink)'],
  ['*', 'c', /^Buffer<isle_\w+ #d87a5a \(/, null, 0, 'low (3-11 cm, looked at): the original\'s jars seated on the lowest ground under them (zislands.js seat0)'],
  ['isle_oldwatch', 'c', /^Buffer<isle_oldwatch \[\w+\] #ecdce4 \(box/, null, 0, 'by design (looked at): the old wall\'s fallen blocks, tipped and bedded in the turf (zislands.js block)'],
  ['isle_oldwatch', 'd', /#ecdce4/, [5185.96, 1793.73], 1.5, 'by design (looked at): a fallen block bedded in the turf (zislands.js block)'],
  ['isle_oldwatch', 'c', /#ecdce4 \(1 parts/, [5214.71, 1787.98], 1.5, 'low (looked at): a block of the fallen dome\'s drum (props-esmer.js fallenDome) on the slope\'s low side; it reads as lying on the turf'],
  ['isle_orchard', 'c', /#ffffff \(box/, [4867.6, 1814.95], 1, 'low (5 cm, looked at): a honey jar of a stall\'s stack on the slope'],
  ['isle_orchard', 'e', /painted grass/, null, 0, 'low (looked at): the flower beds on the orchard\'s slopes stand level, the turf over their uphill curb (up to 20 cm); the tulips stand clear (props-esmer.js flowerBed)'],
  ['isle_mosquibee', 'e', /painted grass/, [2580.5, 1827.1], 1.5, 'low (2.5 cm, looked at): a flower bed\'s uphill curb in the turf'],
  ['isle_otringal', 'b', /^the ground \(terrain\) \| Buffer<isle_otringal/, [1944, 1860.1], 1.5, 'by design (looked at): the original\'s retaining wall, its top flush with the bank it holds'],
  ['isle_otringal', 'd', /#ecdce4/, [1943.86, 1859.96], 1.5, 'by design (looked at): the original\'s retaining wall, its top flush with the bank it holds'],
  ['isle_otringal', 'c', /^Buffer<isle_otringal #ffffff \(\d+ parts/, null, 0, 'looked at: the gold plants\' and frond trees\' stems stand on the ground (thinner than the rays\' spacing); the cluster is their crown'],
  ['isle_otringal', 'c', /#ffe8a8/, [1905.6, 1781.5], 1, 'not seen: a knob 6 cm over the grand hall\'s roof, 18 m up'],
  ['isle_otringal', 'e', /#ffffff: /, [1935.1, 1842], 3, 'by design: the beached barge\'s deck, a corner of it in the turf (props-esmer.js barge)'],
  ['isle_platform', 'c', /^Buffer<isle_platform \[\w+\] #ffffff \(box/, null, 0, 'by design (looked at): the original\'s tall palisade boards, set into the ground'],
  ['isle_platform', 'c', /#8a6a5a \(box/, [3903.81, 1799.36], 1, 'low (6 cm, looked at): the cage lamp\'s post on its slope'],
  ['isle_platform', 'c', /^Buffer<Group<Group/, [3908.56, 1775.86], 1, 'low (looked at): the lift\'s lever post stands 42 cm into the rise beside its tower; the lever and its arm stand clear (props-esmer.js liftTower)'],
  ['isle_platform', 'd', /#d8b080/, [3909.81, 1804.36], 1.5, 'low (6 cm, looked at): a bench\'s end over the paving\'s rise'],
  ['isle_undergas', 'e', /#ecdce4: /, [3257.8, 1847.36], 1.5, 'low (8 cm, looked at): a slab path\'s edge under the turf at the cliff\'s top'],
  ['isle_celebration', 'd', /^Extrude<Group<isle_celebration/, [2890.45, 1792], 2, 'low (2 cm, looked at): the portal\'s threshold corner in the cobbles (celtemple.js)'],
  // -- elsewhere (the ray sweep's open list of 21.11)
  ...[[-65.8, 11.21], [-50.9, 19.55], [-86.16, -82.42], [-36.08, 35.18], [-23.91, -38.53], [-67.7, 27.01], [-147.71, -2.43], [-66.63, 42.79]].map((p) => ['citadel', 'e', /^Buffer on /, p, 0.6, 'low (two looked at): a single grass card at a paving\'s or a rock\'s edge (a doorstep, a crate\'s foot, a stair\'s side)']),
  ['arena', 'c', /^Torus/, null, 0, 'by design: a ring hung on the arena\'s wall (arena.js), 16 cm deep'],
  ['ballastra', 'b', /#a68462 \| Buffer<ballastra \[\w+\] #d6b690/, [2994.72, -2991.1], 1.5, 'not seen (looked at): the landing\'s tread and the rail\'s foot at the steps\' top (look.js)'],
  ['ballastra', 'c', /bl_district/, [2976.87, -3103.84], 2, 'not reachable: a far district of the skyline, 42 m up (skyline.js)'],
  ['ballastra', 'c', /#4c4e56/, [2987.87, -3002.59], 1, 'low (looked at): a chimney cap 8 cm over its pipe on the shed\'s roof (harbor.js)'],
  ['bl_pump', 'b', /Buffer<Group/, [4003.11, -3804.28], 1.5, 'not seen (looked at): the pump room\'s wall plate and its board in one plane (3 rays in sight)'],
  ['workshop', 'b', /Buffer<Group/, [1496.61, 2.46], 1, 'not seen (looked at): the drafting table\'s sheet on its board'],
  ['zeelich', 'b', /#ffffff \| Buffer<zeelich/, [2442.99, 10.02], 1, 'not seen (looked at): the platform rail\'s post top and its rail in one plane'],
  // worldfit's façade checks (WORLDFIT=1)
  ['zeelich', 'a', /: door overlaps lamp/, null, 0, 'low (4-5 cm, looked at): the lamp\'s bracket over the door\'s frame (zeelich.js esmerHouse)'],
  ['zeelich', 'a', /^house 3: window runs into the corner/, null, 0, 'low (8 cm, looked at): a back window\'s frame at the house\'s corner pilaster'],
  ['citadel', 'a', /^house nbr: door overlaps window/, null, 0, 'low (looked at): the neighbour\'s window shutter beside the door\'s frame (architecture.js); reads as one front'],
  // LBA1's rooms are the original's brick cells drawn as open faces (lba1room.js): their upper storeys ('lid' meshes) and
  // overhangs read as clusters over the floor below; place-scan does not measure them either
  ['asylum', 'c', /lid:|Buffer<Group /, null, 0, 'not measurable: LBA1\'s brick cells drawn as open faces (lba1room.js); the upper storeys and overhangs are not standing pieces'],
  ['asylum', 'b', /lid:/, null, 0, 'low (0.16 m², under 0.4 mm): two of LBA1\'s upper-storey faces in one plane, under the cut-away lids (lba1room.js)'],
  // the harbour's paving and what stands on it: the AUDIT-FIX worker's (world.js HARBOUR_*), not touched here
  ['citadel', 'c', /harbour/, [-110, 44], 20, 'AUDIT-FIX: on the harbour\'s paving, which the AUDIT-FIX worker is fixing (world.js HARBOUR_*); not touched here'],
  ['citadel', 'd', /harbour/, [-105, 44], 22, 'AUDIT-FIX: the harbour\'s paving under the ground, which the AUDIT-FIX worker is fixing (world.js HARBOUR_*); not touched here'],
];
const knownOf = (area, cat, f) => KNOWN.find(([a, c, re, near, r, , kind]) => (a === area || a === '*') && c === cat && (!kind || f.kind === kind) && (!re || re.test(f.text)) && (!near || Math.hypot(f.x - near[0], f.z - near[1]) < (r || 1)));

// ------------------------------------------------------------------ the findings of one area's scan
const nm = (D, oi) => { const d = D[oi]; if (!d) return '?'; if (d.terrain) return 'the ground (terrain)';
  if (d.geo === 'PlaneGeometry' && d.box && d.box[3] - d.box[0] > 100) return 'the cloud sea (' + d.path.split('<')[0] + ')';
  if (/water|river|sea\b|pond|lake|pool(?!<)/i.test(d.path) && !/smallPool/.test(d.path)) return 'the water (' + d.path.split('<').slice(0, 2).join('<') + ')'; return d.path.split('<').slice(0, 3).join('<') + (d.ins >= 0 ? '#' + d.ins : '') + (d.tex ? ' [' + d.tex + ']' : '') + (d.color ? ' #' + d.color : ''); };
function findingsOf(r) {
  const F = [], a = r.id, D = r.D;
  for (const s of r.zf) {
    if (s.gap > 0.0015 || s.n < 4 || (s.la.hex === s.lb.hex && s.la.tex === s.lb.tex) || s.seen < 2) continue;
    F.push({ area: a, cat: 'b', kind: 'coplanar', x: s.x, z: s.z, y: s.y, size: s.m2 + ' m²', text: `${nm(D, s.A)} | ${nm(D, s.B)} within ${(s.gap * 1000).toFixed(1)} mm (${s.n} rays, ${s.seen} in sight)`, raw: s });
  }
  for (const s of r.interp) {
    if (s.n < 3 || s.d < 0.08 || s.frac < 0.2 || s.v < 0.002) continue;
    const la = D[s.A], lb = D[s.B]; if (la && lb && la.tex === lb.tex && la.color === lb.color) continue;   // (one look: they read as one solid, no seam)
    F.push({ area: a, cat: 'a', kind: 'through', x: s.x, z: s.z, y: s.y, size: `${Math.round(s.frac * 100)} % of it in, ${s.d} m deep`, text: `${nm(D, s.A)} | ${nm(D, s.B)} (${s.n} rays)`, raw: s });
  }
  // (a cluster thinner than 10 cm one way across is a board, a rail, a frame or a plaque on a wall: held by the wall)
  // (and one at most 16 cm across but a metre or more long and low is a beam or a rail between two supports)
  const held = (b) => { const w = Math.min(b[3] - b[0], b[5] - b[2]), l = Math.max(b[3] - b[0], b[5] - b[2]); return w < 0.1 || (w <= 0.16 && l >= 1.0 && b[4] - b[1] <= 0.3); };
  for (const s of r.floats) if (s.gap >= 0.03 && !held(s.box)) F.push({ area: a, cat: 'c', kind: 'floating', x: s.x, z: s.z, y: s.y, size: `${s.gap} m gap`, text: `${s.objs.map((o) => nm(D, o)).join(' + ')} (${s.parts} parts, box ${s.box.join(',')}) over ${s.sup >= 0 ? nm(D, s.sup) : 'nothing'}`, raw: s });
  for (const s of r.sunk) F.push({ area: a, cat: 'c', kind: 'sunk', x: s.x, z: s.z, y: s.y, size: `${s.depth} m in`, text: `${nm(D, s.A)} (box ${s.box.join(',')})`, raw: s });
  // ((d) needs a ground: the terrain, or Zeelich's island slab; Ballastra's districts stand on quays over the water, and a
  //  quay is not the ground a cap or a step runs into)
  const hasGround = r.census.terrains > 0 || a === 'zeelich';
  for (const s of r.buried) {
    if (s.m2 < 0.12 || !hasGround) continue;
    const paint = Object.entries(s.paint).sort((a, b) => b[1] - a[1])[0]?.[0];
    const onPaving = paint && /grass|dirt|sand/.test(paint) && s.box[4] - s.box[1] < 0.4;
    F.push({ area: a, cat: onPaving ? 'e' : 'd', kind: onPaving ? 'ground paint over paving' : 'into the ground', x: s.x, z: s.z, y: s.y, size: `${s.m2} m², ${s.depth} m deep`, text: `${nm(D, s.A)}: ${s.bur} rays under, ${s.flush} flush, ${s.exp} above (box ${s.box.join(',')})${paint ? ' painted ' + paint : ''}`, raw: s });
  }
  for (const s of r.plants) F.push({ area: a, cat: 'e', kind: 'plants on paving', x: s.at[0][0], z: s.at[0][2], y: s.at[0][1], size: `${s.n} plants`, text: `${s.kind} on ${s.on >= 0 ? nm(D, s.on) : '?'} ${s.look?.hex || ''}/${s.look?.tex || ''} (box ${s.box.join(',')})`, raw: s });
  // (decals: outdoors only, where a ground patch can lie on paving; indoors they are rugs, mats and labels on purpose.
  //  A round one is a blob shadow under someone or a puddle, not a patch)
  if (OUTDOOR.test(a)) for (const s of r.decals) if (!/^Circle/.test(s.path)) F.push({ area: a, cat: 'e', kind: 'decal on a part', x: s.x, z: s.z, y: s.y, size: s.size.join('×') + ' m', text: `${s.path} [${s.tex}] on ${nm(D, s.on)}`, raw: s });
  // (f) rock in rock: half or more of the smaller inside the other, not all of it (what shows is slivers and shards)
  for (const s of r.rockIn || []) {
    // (a small rock set into a rock mass five times its size or more, a boulder in a cave's rock wall, reads as set into
    //  the ground, as a rock in the terrain does: by design)
    if (s.n < 4 || s.frac < 0.5 || s.frac >= 0.97 || Math.max(s.va, s.vb) > 5 * Math.min(s.va, s.vb)) continue;
    F.push({ area: a, cat: 'f', kind: 'rock in rock', x: s.x, z: s.z, y: s.y, size: `${Math.round(s.frac * 100)} % of the smaller in, ${s.v} m³`, text: `${nm(D, s.A)} | ${nm(D, s.B)} (vol ${s.va} / ${s.vb} m³, ${s.n} rays, box ${s.ba.join(',')} | ${s.bb.join(',')})`, raw: s });
  }
  // (g) a rock through a built part
  // (not masonry: a part of the rock's own look, a cave's rock wall or a lintel the boulders are jammed into; nor a floor
  //  or a ledge the rock is bedded in, the overlap in the lowest 35 % of the rock's height: as a rock in the terrain)
  // (nor a part marked as the rock's company, material.userData.rockSet: crystals out of rubble, a mouth's dark inside, a
  //  niche's sill, Tralu's rims — ROCKS-MASONRY, the same mark rocksettle.js rocksOutOfBuilt keeps clear of)
  for (const s of r.rockCut || []) if (!D[s.B]?.rockSet && !((D[s.A]?.tex ? D[s.A].tex === D[s.B]?.tex : D[s.A]?.color === D[s.B]?.color && !D[s.B]?.tex) || s.y + s.d / 2 - s.ba[1] <= 0.35 * (s.ba[4] - s.ba[1]))) F.push({ area: a, cat: 'g', kind: 'rock through masonry', x: s.x, z: s.z, y: s.y, size: `${s.d} m deep, ${s.m2} m²`, text: `${nm(D, s.A)} through ${nm(D, s.B)} (${s.n} rays, rock box ${s.ba.join(',')})`, raw: s });
  for (const f of F) { const k = knownOf(f.area, f.cat, f); f.known = k ? k[5] : null; }
  return F;
}

// ------------------------------------------------------------------ the ray sweep, per batch
async function runBatch(list) {
  const { browser, context, page } = await launch({ width: 960, height: 540 });
  if (process.env.SERVE) await serveLocal(context);
  page.setDefaultTimeout(3600000);
  try {
    await open(page, '?nocine');
    await menu(page, 'new');
    await page.evaluate(() => { const G = game; for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
    await page.addScriptTag({ path: LIB });
    await page.evaluate(() => SW.init());
    const ids = await page.evaluate((list) => {
      const R = game.regions, all = [...R.of.keys()];
      const out = [];
      for (const pat of list) {
        if (pat === 'citadel') { out.push('citadel'); continue; }
        const re = new RegExp('^' + pat.replace('*', '.*') + '$');
        for (const id of all) if (re.test(id) && !out.includes(id)) out.push(id);
      }
      return out;
    }, list);
    for (const id of ids) {
      if (ONLY && !ONLY.includes(id)) continue;
      const file = path.join(OUT, id + '.json');
      if (process.env.RESUME && fs.existsSync(file)) continue;
      const t0 = Date.now();
      let r;
      try {
        r = await page.evaluate(async ([id, B]) => {
          if (id !== 'citadel') { game.regions.ensure(id, 'test'); for (let i = 0; i < 4; i++) game.step(0.05); }
          const R = id === 'citadel' ? null : game.rooms[id];
          if (id !== 'citadel' && !R) return { missing: true };
          const outdoor = id === 'citadel' || !!R.outdoor;
          return SW.scan(id === 'citadel' ? { bounds: B } : { room: id }, { step: outdoor ? 0.25 : 0.2, slabGround: id === 'zeelich' });
        }, [id, CITADEL]);
      } catch (e) { console.log(`AREA ${id}: scan failed ${String(e).slice(0, 300)}`); if (/crash|closed/i.test(String(e))) throw e; continue; }
      if (r.missing) { console.log(`AREA ${id}: not in this build`); continue; }
      r.id = id; r.secs = Math.round((Date.now() - t0) / 1000);
      fs.writeFileSync(file, JSON.stringify(r));
      console.log(`AREA ${id}: scanned in ${r.secs} s (${r.census.tris} triangles, ${r.census.parts} parts, ${r.census.rays} rays)`);
      if (process.env.SHOTS) {
        const dir = process.env.SHOTS; fs.mkdirSync(dir, { recursive: true });
        const pick = findingsOf(r).filter((f) => !f.known).sort((p, q) => p.cat.localeCompare(q.cat)).slice(0, +(process.env.SHOTS_N || 16));
        let i = 0;
        for (const f of pick) {
          const R = f.raw, A = R.A ?? R.on, B = R.B ?? R.sup ?? null;
          const span = R.box && R.box.length === 6 ? Math.max(R.box[3] - R.box[0], R.box[5] - R.box[2]) : R.box ? Math.max(R.box[2] - R.box[0], R.box[3] - R.box[1]) + 1 : 3;
          const u = await page.evaluate(([q, o]) => SW.shoot(q, o), [{ x: f.x, y: f.y ?? R.y ?? 0, z: f.z, A, B: B >= 0 ? B : null, span }, { zmap: true }]).catch((e) => { console.log('  shot failed', String(e).slice(0, 120)); return null; });
          if (!u) break;
          u.forEach((d, k) => fs.writeFileSync(path.join(dir, `${id}-${String(i).padStart(2, '0')}-${f.cat}${k ? '-z' : ''}.jpg`), Buffer.from(d.split(',')[1], 'base64')));
          console.log(`  shot ${id}-${String(i).padStart(2, '0')}-${f.cat}: ${f.kind} at ${f.x}, ${f.z}: ${f.text.slice(0, 160)}`);
          i++;
        }
      }
      await page.evaluate(() => SW.free());
    }
  } finally { await browser.close().catch(() => {}); }
}
if (!process.env.SKIP_RAYS) for (const b of BATCHES) {
  if (ONLY && !b.some((p) => ONLY.some((o) => new RegExp('^' + p.replace('*', '.*') + '$').test(o)))) continue;
  // (the machine under load: a crashed page is tried again (twice), the areas already kept are not scanned again; the
  // crash stays a FAIL only if the batch never finishes)
  const resume = process.env.RESUME, n0 = report.fails.length;
  for (let k = 0; k < 3; k++) {
    try { await runBatch(b); if (k) { const crashes = report.fails.filter((f, i) => i >= n0 && f.kind === 'page crashed'); for (const c of crashes) { report.fails.splice(report.fails.indexOf(c), 1); report.notes.push('page crashed, the batch tried again and finished: ' + c.text); } } break; }
    catch (e) { console.log(`BATCH crashed (try ${k + 1} of 3): ` + String(e).slice(0, 200)); process.env.RESUME = '1'; if (k === 2) check(`batch ${b[0]}… scanned`, false, String(e).slice(0, 200)); }
  }
  if (resume === undefined) delete process.env.RESUME; else process.env.RESUME = resume;
}

// ------------------------------------------------------------------ the older scans (child runs)
const child = (script, env) => {
  const rep = path.join(OUT, script.replace('.mjs', '') + '-report.json');
  if (!(process.env.RESUME && fs.existsSync(rep))) {
    const r = spawnSync(process.execPath, [path.join(HERE, script)], { env: { ...process.env, ...env, REPORT: rep, SHOTS: '' }, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 3 * 3600000 });
    fs.writeFileSync(rep.replace('-report.json', '.log'), (r.stdout || '') + (r.stderr || ''));
  }
  return fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, 'utf8')) : null;
};
const PL = process.env.PLACE ? child('place-scan.mjs', { ONLY: '' }) : null;
const WF = process.env.WORLDFIT ? child('worldfit.mjs', { AREAS: '' }) : null;

// ------------------------------------------------------------------ the findings, per area and category
const F = [];   // { area, cat, kind, text, x, z, size, known }
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.includes('-report'))) {
  const r = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  if (ONLY && !ONLY.includes(r.id)) continue;
  F.push(...findingsOf(r));
}
if (PL) for (const f of PL) {
  const cat = { inside: 'a', wall: 'a', float: 'c', sunk: 'c' }[f.kind]; if (!cat) continue;
  F.push({ area: f.room, cat, kind: 'place-scan ' + f.kind, x: f.world[0], z: f.world[1], size: f.measure, text: `${f.item}#${f.frame}: ${f.what}${f.left ? ' [place-scan LEFT: ' + f.left + ']' : ''}`, left: f.left });
}
if (WF) {
  for (const f of WF.fit) { const cat = /overlaps|duplicated|runs into|cuts into/.test(f.kind) ? 'a' : 'c'; F.push({ area: f.area, cat, kind: 'worldfit ' + f.kind, x: f.at[0], z: f.at[2], size: f.by != null ? f.by + ' m' : '', text: `${f.building}: ${f.kind} ${f.side || ''}` }); }
  for (const z of WF.zf) if (z.m2 >= 0.15) F.push({ area: z.area, cat: 'b', kind: 'worldfit coplanar', x: z.at[0], z: z.at[2], size: z.m2 + ' m²', text: `${z.a} | ${z.b}${z.near ? ' (' + z.near + ')' : ''}` });
}
for (const f of F) if (f.known === undefined) { const k = knownOf(f.area, f.cat, f) || (f.left ? [0, 0, 0, 0, 0, 'place-scan LEFT: ' + f.left] : null); f.known = k ? k[5] : null; }

// counts per area and category
const CATS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'], counts = {};
for (const f of F) { const c = (counts[f.area] ??= Object.fromEntries(CATS.map((k) => [k, [0, 0]]))); c[f.cat][f.known ? 1 : 0]++; }
console.log('COUNTS area: a through | b coplanar | c sunk/floating | d into ground | e paint/plants on paving | f rock in rock | g rock through masonry   (open/known)');
const tot = Object.fromEntries(CATS.map((k) => [k, [0, 0]]));
for (const [a, c] of Object.entries(counts).sort()) { console.log(`COUNTS ${a.padEnd(16)} ` + CATS.map((k) => `${k} ${c[k][0]}/${c[k][1]}`).join('  ')); for (const k of CATS) { tot[k][0] += c[k][0]; tot[k][1] += c[k][1]; } }
console.log('COUNTS TOTAL            ' + CATS.map((k) => `${k} ${tot[k][0]}/${tot[k][1]}`).join('  '));
const open_ = F.filter((f) => !f.known);
for (const f of open_) console.log(`  FOUND ${f.area} (${f.cat}) ${f.kind} at ${f.x}, ${f.z}${f.y != null ? ' y ' + f.y : ''} [${f.size}]: ${f.text}`);
for (const f of F.filter((f) => f.known)) console.log(`  known ${f.area} (${f.cat}) ${f.kind} at ${f.x}, ${f.z} [${f.size}]: ${f.text} — ${f.known}`);
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify({ counts, total: tot, findings: F.map(({ raw, ...f }) => ({ ...f, raw })) }, null, 1));
const scanned = fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.includes('-report')).length;
check(`every area scanned (${scanned})`, ONLY ? scanned >= ONLY.length : scanned >= 100);
for (const k of CATS) checkVisual(`(${k}) ${{ a: 'no piece through another', b: 'no two surfaces fighting in one plane', c: 'nothing floating or sunk', d: 'no deck, step or path running into the ground', e: 'no ground paint, grass or flowers on paving', f: 'no rock mostly inside another (slivers, shards)', g: 'no rock cut by a wall, a house, paving or steps' }[k]} but the known (${tot[k][0]} open)`, tot[k][0] === 0, open_.filter((f) => f.cat === k).slice(0, 8).map((f) => `${f.area} ${f.kind} ${f.x},${f.z} ${f.size}: ${f.text}`));
done();
