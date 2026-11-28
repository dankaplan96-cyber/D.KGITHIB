// DEPTH, first wave (docs/lba-maturity/DEPTH-PLAN.md; the user approved it 10.11.2026). Not a chapter: the director
// (index.js) asks it beside the chapter in progress, like the islands' and the Hamalayi's life. Its state is flags
// prefixed dx_ (saved with the game; save format unchanged: an old save simply has none of them).
//
// COL-1 · Twelve singing crystals (src/game/crystals.js is the registry). Six lie in the world as before; six more are
//   given by puzzles: ISL-1 (sc-jaspa), HAM-1 (sc-waystone), U-3 (sc-trial, DES-2's slot: Tali's prize,
//   story/offwall.js) and, since wave 2 (24.11.2026, docs/lba-maturity/WAVE2.md), HAM-3 (sc-pack), DES-1 (sc-figures)
//   and UND-1 (sc-source), each described at its own section below. All twelve can be had in play.
//   A quest crystal is an owed reward (dx_owe_<id>) from the moment it is given until it is in his hand: a save in
//   between loads with it handed over (applyFlags). All twelve (dx_crystals12, main.js collect): in the core fight
//   (chapter 12) Sendell catches him once when his life would reach zero (catchFall, called by actors.js Hero.damage:
//   a full heal and her line; once per game, dx_c12_caught), and an epilogue line once dinner is over.
//
// ISL-1 · Old Jaspa's warm gems (Knartas's gem-sorting room, from chapter 4: the islands open). Jaspa's hook comes after
//   his own line the first time he is spoken to. On a low bench by the back wall: a tray of six blue stones between two
//   bins, PROJECT and KEEP. Two are warm: a pale crust and a thread of dust rising off them (the dig's rule, chapter 4,
//   desert.js's warm discs; and Jaspa's "warm ones sweat" for a player who comes before the dig). Twinsen takes the next
//   stone from the tray (his hand on it: 'pickup'), says what he sees, and sets it in a bin (his hand into the bin). A
//   warm one in PROJECT: the bin's lamp flashes red, Jaspa's line, all six back on the tray. All six placed with a cold
//   one in KEEP: Jaspa's other line, back on the tray. Right: Jaspa gives the crystal. The singing fork struck by the
//   tray makes the warm ones still on it ring (an alternate way to tell). State: dx_jaspa_ask, dx_jaspa_bins ('.' on
//   the tray, 'P' or 'K' per stone, in tray order), dx_jaspa_tries, dx_jaspa_sorted, dx_jaspa_thx. A stone in his hand
//   is not saved: it is back on the tray after a load, and if he walks off with it.
//
// HAM-1 · The pilgrims' waystone (the monastery terrace, from chapter 6). Brother Tenpa's hook comes after his own line
//   the first time. The waystone (LBA1's prop, props-lba1hamalayi.js) gets an upper stone that turns on its pillar, a
//   quarter at a time (Twinsen's hands on its grips), carved on four sides: dome, roof, houses, ice. The dome's face
//   toward the observatory (Sefa's dome, the old shrine: the hall's altar says so, hamlife.js hh_altar) opens a niche at
//   the pillar's foot with the crystal. Each wrong turn says what the stone faces now. State: dx_way_seen, dx_way_ask,
//   dx_way_face (0..3, the quarter turns made, mod 4), dx_way_turns, dx_way_open.
import * as THREE from 'three';
import { crystalMats, crystalGem, gemGeo } from '../crystallook.js';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { IH, roomOf } from '../ihomes.js';
import { MAT, rbox, cyl, canvasTex, plane, sphere, torus, crate, Kit } from '../props.js';
import { rockGeometry } from '../vegetation.js';
import { MM } from '../props-mountain.js';
import { CRYSTAL_TOTAL, CRYSTAL_QUEST, crystalsIn } from '../crystals.js';
import { islePhase } from '../islandlife.js';
import { tm } from '../kit.js';
import { revealBeat } from './revealcam.js';
import '../text/depth.js';
import { Wave5 } from './wave5.js';   // (WAVE5 H-12, H-13, H-14: story/wave5.js, asked through this module)

// ---------------------------------------------------------------- ISL-1's layout (the room's frame: ihomes.js IH.frame)
const GEM_ROOM = roomOf('knartas-28-29');
const GEMS = 6, WARM = [1, 4];                 // tray order, left to right as he faces the back wall
const GEM_L = { bench: { x: 1.6, w: 1.0, d: 0.4, top: 0.46 }, P: { x: 0.5 }, K: { x: 2.75 }, binS: 0.5, binH: 0.44 };
const PICK = { fw: 0.59, side: 0.44, at: 0.45, dur: 0.9 };   // the 'pickup' pose: his right hand 0.59 m ahead, 0.44 m right, lowest at 0.45 s left
// ---------------------------------------------------------------- HAM-1's layout (the waystone's frame: origin on the ground)
// The carvings in turning order; with the stone turned s quarters, carving c faces the bearing ry + 45° + (c + s) × 90°.
// The observatory (Sefa's dome, the old shrine) lies at slot 2's bearing from the stone (measured: 4362, −50 → 4286,
// −72 is −1.852 rad; slot 2 is 0.5 + π/4 + π = −1.856); the monastery's roof (−1.39) and the glacier (−1.53) lie near
// it, Lhar down the valley on slot 3's side.
const WAY_CARVE = ['dome', 'roof', 'ice', 'houses'];
const WAY_SOLVED = 2;   // the dome (0) in slot 2
const WAY_START = 3;    // as found: the dome faces down the valley (then the ice, the roof; the dome on the third turn)
// the block's half-width (round the pillar's diagonal, 0.613), its band above the top step, the carvings' and the grips'
// height (the 'pumpGrip' pose: hands 1.12 m up, 0.48 m ahead, ±0.19 m apart), where he stands (from the middle, along a
// corner: 0.62 + 0.48, and a few cm for the pose's sway: measured in tests/depth-1.mjs), how long a quarter takes
const WAY = { hw: 0.62, y0: 0.74, y1: 1.88, carveY: 1.5, gripY: 1.12, gripS: 0.19, stand: 1.13, dur: 1.3 };
let CARVE_M = null;
// a carving's face: grey stone, the motif cut in (a dark groove with a lit edge under it)
function carveMat(kind) {
  CARVE_M ||= {};
  return (CARVE_M[kind] ||= MAT.map(canvasTex(160, 140, (x, w, h) => {
    x.fillStyle = '#cfc6b8'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#a89e90'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
    const cut = (draw) => { for (const [dx, col, lw] of [[2, '#f2ece2', 7], [0, '#4e463e', 6]]) { x.save(); x.translate(dx, dx); x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); draw(); x.stroke(); x.restore(); } };
    const g = h - 30;
    if (kind === 'dome') cut(() => { x.moveTo(30, g); x.lineTo(130, g); x.moveTo(42, g); x.arc(80, g, 38, Math.PI, 0); x.moveTo(80, g - 38); x.lineTo(80, g - 54); });
    else if (kind === 'roof') cut(() => { x.moveTo(25, g - 34); x.lineTo(80, g - 74); x.lineTo(135, g - 34); x.closePath(); x.moveTo(38, g - 34); x.lineTo(38, g); x.lineTo(122, g); x.lineTo(122, g - 34); x.moveTo(72, g); x.lineTo(72, g - 20); x.lineTo(88, g - 20); x.lineTo(88, g); });
    else if (kind === 'houses') cut(() => { for (const [cx, s] of [[42, 1], [80, 1.25], [118, 0.9]]) { const hw = 15 * s, hh = 22 * s; x.moveTo(cx - hw, g); x.lineTo(cx - hw, g - hh); x.lineTo(cx, g - hh - 14 * s); x.lineTo(cx + hw, g - hh); x.lineTo(cx + hw, g); } x.moveTo(20, g); x.lineTo(140, g); });
    else cut(() => { x.moveTo(20, g); x.lineTo(48, g - 60); x.lineTo(62, g - 34); x.lineTo(84, g - 80); x.lineTo(104, g - 40); x.lineTo(116, g - 56); x.lineTo(140, g); x.moveTo(84, g - 80); x.lineTo(80, g - 52); x.moveTo(48, g - 60); x.lineTo(52, g - 40); });
  }), 0.9));
}

// ---------------------------------------------------------------- HAM-3's layout (world, the Hamalayi; measured 24.11)
// The ice wall against the glacier basin's north rock (its face toward +z, the basin), 25 m north of the vent; the
// crew's signal mirror on its post 6.5 m out on the ice. The mirror turns in eighths (heading k × 45°); at MIR_SOLVED
// its light lands on the ice, every other heading lands on the snow or the rock (seen: the spot). As found it looks
// south-east, away from the wall.
const ICE = { x: 4252.0, z: -72.6, w: 3.0, h: 2.5, d: 1.3, packY: 0.78 };
const MIR = { x: 4256.67, z: -67.93, eye: 1.28, start: 1, len: 5.2 };
const MIR_SOLVED = 5;
const MELT_T = 3.2;
// ---------------------------------------------------------------- DES-1's layout (world, Desert Island; measured 24.11)
// The low drift on the sand flat between the two standing figures west of Kesh (desertold.js), where their painted
// gazes cross; the survey hatch under it.
const DRIFT = { x: 3305.0, z: -45.6 };
// ---------------------------------------------------------------- UND-1's layout (the crystal galleries' own frame)
// The crusted blister on the start shelf's left (west) wall, between Ilka's wheel and the crew's crates; facing +x.
const SRC = { x: -12.35, z: -4.9 };
const SRC_HUM_R = 7, SRC_LIT_R = 4.5;

// ---------------------------------------------------------------- wave 3 (24–25.11; docs/lba-maturity/WAVE3.md)
// ZEE-1: the capped riser beside the west end's dark post (Mr Pelleck's), m from the post toward the street; what the west
// end chipped in. ZEE-2: the project's store (the teal shed in the depot yard, zeelich.js): its door's middle on the wall
// face (Zeelich-local), how far out he stands to look in, Mr Pelleck's payment.
const HEAT = { dx: 0.85, dz: 1.15, pay: 12 };
const STORE = { x: 21.2, z: 21.3, reach: 1.05, pay: 15 };
// HAM-2: the goats' way (the Hamalayi's own frame): six rock ledges west of Lhar's icefall spur, each [x, top, r], set
// against the cliff (z found from the rock face, scanning north from z0, `out` × r in front of it); each rise 1.0 m (a jump takes 1.33: tests/
// jumpreach.mjs); the rope from the top ledge to the high rock's lip (z top); the climb's speed (m/s)
const GOAT = { z0: -21.5, out: 1.1, ledges: [[-13.6, 13.0, 0.76], [-15.1, 14.0, 0.76], [-16.6, 15.0, 0.76], [-18.1, 16.0, 0.76], [-19.6, 17.0, 0.76], [-21.1, 18.0, 0.8]], top: -28.4, speed: 2.4 };
// ISL-3: the doors across the clouds (world; measured 25.11 from the islands' ground: the near shore's railing, the gap,
// the far patch's railing). near/far: where he stands; nPost/fPost: the davits; rock: an old mooring rock in the gap (its
// deck's height); thing: what waits on the far side; zone: how near a side he counts as standing on it. walk: reached on
// foot (Mosquibee's honey islet, over its plank bridge since BRIDGES: physics.js bridgeTreads): no davits, no rings
const FAR_PAY = 15;
const FARS = [
  { id: 'yard', room: 'isle_otringal', near: { x: 1917.6, z: 1844.7 }, nPost: { x: 1918.3, z: 1846.5 }, rock: { x: 1927.5, z: 1844.0, y: 4.0 }, seed: 31, far: { x: 1937.6, z: 1844.2 }, fPost: { x: 1937.4, z: 1842.4 }, thing: { x: 1937.8, z: 1848.6 }, thingRy: 0.3, kind: 'crate', flag: 'dx_far_crate', read: ['dx_far_crate1', 'dx_far_crate2'], after: 'dx_far_crate_after', zone: 3.0 },
  { id: 'quay', room: 'isle_otringal', near: { x: 1879.0, z: 1851.0 }, nPost: { x: 1878.4, z: 1849.5 }, rock: { x: 1867.5, z: 1852.0, y: 3.8 }, seed: 43, far: { x: 1855.4, z: 1855.6, top: 4 }, fPost: { x: 1854.7, z: 1856.3, top: 4 }, fTall: 1.2, thing: { x: 1854.6, z: 1850.6, top: 4 }, thingRy: Math.PI / 2, kind: 'locker', flag: 'dx_far_locker', read: ['dx_far_locker1', 'dx_far_locker2'], after: 'dx_far_locker_after', zone: 3.0 },
  { id: 'honey', room: 'isle_mosquibee', walk: true, near: { x: 2567.5, z: 1828.4 }, far: { x: 2547.5, z: 1823.0 }, thing: { x: 2549.4, z: 1822.6 }, kind: 'honey', zone: 3.0 },
];
// HAM-4: the gorge's ice arch (the Hamalayi's frame): the rock stack in the meltwater (its top), the arch's foot on the
// north bank, where the look is (the bank by the tree bridge's north end), the road crew's kashes
const ARCH = { stack: [-15.5, 43.5], top: 5.2, foot: [-15.5, 37.2], look: [-8.5, 37.0], pay: 12 };
// the flag a quest crystal is owed under (sc-jaspa → dx_owe_sc_jaspa)
const oweFlag = (id) => 'dx_owe_' + id.replace(/-/g, '_');

export class Depth extends ChapterBase {
  // WAVE5 (docs/lba-maturity/WAVE5.md): wave 5's quests live in story/wave5.js and are asked through this module's hooks
  // (this.w5). Three of the director's hooks that do not ask this module (the lance's jet, a melee hit, the journal) are
  // passed on here, on the director itself: its own answer first, wave 5's after (no line added to index.js).
  constructor(story) {
    super(story);
    this.w5 = new Wave5(story);
    const S = story, jet = S.jetHit, melee = S.meleeHit, journal = S.journal;
    S.jetHit = (o) => jet.call(S, o) || this.w5.jetHit(o);
    S.meleeHit = (o) => melee.call(S, o) || this.w5.meleeHit(o);
    S.journal = () => [...journal.call(S), ...this.w5.journal()];
  }
  get RG() { return this.game.regions; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  at(key) { const i = this.idx(key); return i >= 0 && this.story.index >= i; }
  here() { return this.game.room?.id ?? 'citadel'; }
  holder(room, x, y, z, ry = 0) {
    const grp = new THREE.Group(), gp = room.group.position;
    grp.position.set(x - gp.x, y - gp.y, z - gp.z); grp.rotation.y = ry; room.group.add(grp); return grp;
  }

  // ================================================================ COL-1: the crystals
  has(id) { return this.game.collected.includes(id); }
  // a quest's crystal: tossed out at (x, y, z) in `where` (an area id), owed until it is in his hand
  giveCrystal(id, x, y, z, where) {
    if (!CRYSTAL_QUEST[id] || this.has(id) || this.game.pickups.list.some((p) => p.id === id)) return false;
    this.reward(oweFlag(id), 'crystal', 1, x, y, z, { id, pop: true, where });
    return true;
  }
  // after a load: an owed crystal not lying in the world any more is handed over at once (as settleOwed does for kashes)
  settleCrystals() {
    const g = this.game, f = this.f;
    // (earned but neither given nor owed: a save in the moment between the puzzle's end and the crystal's toss)
    const earned = { 'sc-jaspa': f.dx_jaspa_sorted, 'sc-waystone': f.dx_way_open, 'sc-pack': f.dx_pack_taken, 'sc-figures': f.dx_gaze_open, 'sc-source': f.dx_source };
    for (const [id, e] of Object.entries(earned)) if (e && !this.has(id) && !f[oweFlag(id)] && !g.pickups.list.some((p) => p.id === id)) f[oweFlag(id)] = 1;
    for (const id of Object.keys(CRYSTAL_QUEST)) {
      const flag = oweFlag(id);
      if (!this.f[flag]) continue;
      if (this.has(id)) { delete this.f[flag]; continue; }
      if (g.pickups.list.some((p) => p.owe === flag)) continue;
      delete this.f[flag];
      g.collected.push(id); g.applyCrystals();
      g.hud.toast('toast_crystal', { n: g.crystalCount(), max: CRYSTAL_TOTAL });
      if (g.crystalCount() >= CRYSTAL_TOTAL) this.f.dx_crystals12 = true;
    }
  }
  // Hero.damage, his life at zero: with all twelve, in the core fight, Sendell catches him once
  catchFall(h) {
    const g = this.game, f = this.f;
    if (!f.dx_crystals12 || f.dx_c12_caught || this.story.cur?.key !== 'core' || !f.c3_fight || f.c3_done || g.room?.id !== 'c3core') return false;
    if (g.crystalCount() < CRYSTAL_TOTAL) return false;
    f.dx_c12_caught = true;
    h.hp = h.maxHp; h.invuln = 3; h.dead = false;
    g.audio.play('revive');
    g.particles.burst(h.pos.x, h.pos.y + 1, h.pos.z, '#bff4ff', 40, 4);
    g.hud.stats?.(h);
    this.chain([['sendell', 'dx_c12_catch']]);
    return true;
  }
  journalTitle() { return t('dx_j_title', { n: this.game.crystalCount(), max: CRYSTAL_TOTAL }); }

  // ================================================================ construction
  decorate() {
    const R = this.game.rooms;
    if (R[GEM_ROOM] && IH[GEM_ROOM]?.frame && this.once('gems')) this.buildGems(R[GEM_ROOM]);
    if (R.hamalayi?.lba1?.places?.['lba1-waystone'] && this.once('way')) this.buildWay(R.hamalayi);
    if (R.hamalayi?.vent && this.once('pack')) this.buildPack(R.hamalayi);
    if (R.desert?.figures?.length >= 2 && this.once('gaze')) this.buildGaze(R.desert);
    if (R.c3gallery && this.once('src')) this.buildSource(R.c3gallery);
    if (R.zeelich?.life?.posts && this.once('heat')) this.buildHeat(R.zeelich);
    if (R.zeelich?.life && this.once('store')) this.buildStore(R.zeelich);
    if (R.hamalayi?.kite && this.once('goat')) this.buildGoat(R.hamalayi);
    for (const d of FARS) if (R[d.room] && this.once('far_' + d.id)) this.buildFar(d.room, d);
    if (R.hamalayi?.gorge && this.once('arch')) this.buildArch(R.hamalayi);
    this.applyFlags();
  }
  regionBuilt(ids) { this.applyWorld(); this.w5.regionBuilt(ids); }
  applyFlags() {
    this.settleCrystals();
    this.settleOwed('dx_owe_heat', 'coin', HEAT.pay, 'dx_toast_kashes');
    this.settleOwed('dx_owe_store', 'coin', STORE.pay, 'dx_toast_kashes');
    this.settleOwed('dx_owe_far_yard', 'coin', FAR_PAY, 'dx_toast_kashes');
    this.settleOwed('dx_owe_arch', 'coin', ARCH.pay, 'dx_toast_kashes');
    this.settleOwed('dx_owe_far_quay', 'coin', FAR_PAY, 'dx_toast_kashes');   // (an older save's owed clover there: its kashes now)
    this.settleOwed('dx_owe_arch_clover', 'clover', 1, 'dx_toast_clover');
    this.applyWorld();
    this.w5.applyFlags();
  }
  applyWorld() {
    this.held = null;
    this.layGems();
    this.setWay();
    this.setPack();
    this.setGaze();
    this.setSource();
    this.setHeat();
    this.setStore();
    this.setGoat();
    this.setArch();
  }

  // ---------------------------------------------------------------- ISL-1: the bench, the tray, the bins
  buildGems(room) {
    const F = IH[GEM_ROOM].frame, P = this.game.physics, L = GEM_L;
    const X = (lx) => F.cx + lx, Z = (lz) => F.cz + lz;
    const zB = F.BZ + 0.04 + L.bench.d / 2;   // the bench against the back wall, facing into the room (+z)
    const grp = this.holder(room, X(0), 0, Z(0), 0);
    const wood = MAT.wood('dark'), pale = MAT.wood('pale');
    // the bench: a low plank on two trestles, and a shallow tray on it
    const B = new THREE.Group(); B.position.set(L.bench.x, 0, zB); grp.add(B);
    const top = new THREE.Mesh(rbox(L.bench.w, 0.05, L.bench.d, 0.01), wood); top.position.y = L.bench.top - 0.025; top.castShadow = true; B.add(top);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(rbox(0.06, L.bench.top - 0.05, L.bench.d - 0.06, 0.01), wood); leg.position.set(s * (L.bench.w / 2 - 0.08), (L.bench.top - 0.05) / 2, 0); B.add(leg); }
    const tray = new THREE.Mesh(rbox(0.82, 0.03, 0.22, 0.01), pale); tray.position.set(0, L.bench.top + 0.015, 0.04); B.add(tray);
    P.add({ type: 'box', x: X(L.bench.x), z: Z(zB), hw: L.bench.w / 2, hd: L.bench.d / 2, rot: 0, top: L.bench.top, noStand: true });
    // the bins: open wooden boxes with a painted board each; the project's has its lamp
    const label = (word, bg) => MAT.map(canvasTex(192, 64, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = '#f2ead6'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, w / 2, h / 2 + 2); }), 0.8);
    const bins = {};
    for (const [k, word, bg] of [['P', 'PROJECT', '#2a4a6a'], ['K', 'KEEP', '#6a4a2a']]) {
      const s = L.binS, hh = L.binH, b = new THREE.Group(); b.position.set(L[k].x, 0, F.BZ + 0.04 + s / 2 + 0.02); grp.add(b);
      const floor = new THREE.Mesh(rbox(s, 0.04, s, 0.01), wood); floor.position.y = 0.02; b.add(floor);
      for (const [sx, sz, w, d] of [[0, -1, s, 0.04], [0, 1, s, 0.04], [-1, 0, 0.04, s], [1, 0, 0.04, s]]) { const m = new THREE.Mesh(rbox(w, hh, d, 0.01), wood); m.position.set(sx * (s / 2 - 0.02), hh / 2, sz * (s / 2 - 0.02)); m.castShadow = true; b.add(m); }
      const board = new THREE.Mesh(plane(0.42, 0.14), label(word, bg)); board.position.set(0, hh * 0.55, s / 2 + 0.012); b.add(board);   // (FLICKER-142: 1.2 cm off the bin's front, not 5 mm)
      let lamp = null;
      if (k === 'P') { lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: '#552222', emissive: '#ff2a1a', emissiveIntensity: 0, roughness: 0.4 })); lamp.position.set(s / 2 - 0.06, hh + 0.03, s / 2 - 0.02); b.add(lamp); }
      P.add({ type: 'box', x: X(L[k].x), z: Z(b.position.z), hw: s / 2, hd: s / 2, rot: 0, top: hh, noStand: true });
      bins[k] = { grp: b, lamp, x: X(L[k].x), z: Z(b.position.z), lx: L[k].x, lz: b.position.z };
    }
    // the stones: one blue crystal each, the warm ones crusted pale with dust motes rising off them
    // (CRYSTALS-ONE-LOOK: the well's faceted crystal, shell + core: crystallook.js; the crust's bits the same prism, opaque)
    const blue = crystalMats('cyan'), crustM = MAT.flat('#f6f8f2', 0.95, { flatShading: true });
    const cg = gemGeo(0, 0.022), mg = new THREE.SphereGeometry(0.006, 4, 3), moteM = MAT.flat('#f4efe4', 1);
    const gems = [];
    for (let i = 0; i < GEMS; i++) {
      const warm = WARM.includes(i), m = new THREE.Group(); grp.add(m);
      const c = crystalGem(blue.shell, blue.core, { v: i, hs: 0.05 }); c.scale.set(1, 1.4, 1); c.position.y = 0.06; c.rotation.y = i * 0.7; m.add(c);
      const motes = [];
      if (warm) {
        for (let j = 0; j < 7; j++) { const a = j * 0.9 + i, q = new THREE.Mesh(cg, crustM); q.position.set(Math.sin(a) * 0.034, 0.03 + (j % 3) * 0.022, Math.cos(a) * 0.034); q.rotation.set(a, a * 2, 0); m.add(q); }
        for (let j = 0; j < 5; j++) { const q = new THREE.Mesh(mg, moteM); q.userData.ph = j / 5; m.add(q); motes.push(q); }
      }
      // (the tray's slot: local to the room's group; he faces the back wall, so left to right runs toward +x... seen
      //  from the room it runs right to left; the order only matters to the saved string)
      const slot = { x: L.bench.x - 0.3 + i * 0.12, y: L.bench.top + 0.03, z: zB + 0.04 };
      gems.push({ i, warm, m, motes, slot });
    }
    this.G = { room, grp, bins, gems, F, zB, tray: { x: X(L.bench.x), z: Z(zB), lx: L.bench.x }, flashT: 0, okT: 0 };
  }
  get bins() { const s = this.f.dx_jaspa_bins; return typeof s === 'string' && s.length === GEMS ? s : '.'.repeat(GEMS); }
  // every stone where the flags put it: on the tray, or in its bin (their own slots); the one in his hand stays there
  layGems() {
    const G = this.G; if (!G) return;
    const b = this.bins, n = { P: 0, K: 0 };
    for (const s of G.gems) {
      if (this.held === s.i) continue;
      if (s.m.parent !== G.grp) G.grp.add(s.m);
      s.m.rotation.set(0, 0, 0); s.m.scale.setScalar(1);
      const w = b[s.i];
      if (w === 'P' || w === 'K') {
        const k = n[w]++, B = G.bins[w];
        s.m.position.set(B.lx - 0.12 + (k % 3) * 0.12, 0.05, B.lz - 0.08 + Math.floor(k / 3) * 0.14);
      } else s.m.position.set(s.slot.x, s.slot.y, s.slot.z);
    }
  }
  inGemRoom() { return this.here() === GEM_ROOM && !!this.G; }
  gemsOpen() { return islePhase(this.story) != null && this.able(); }
  nextOnTray() { const b = this.bins; return this.G?.gems.find((s) => b[s.i] === '.' && this.held !== s.i) || null; }
  // world point of something in the room's group (its local x, y, z)
  gw(lx, lz) { const F = this.G.F; return { x: F.cx + lx, z: F.cz + lz }; }
  // walk him to where his right hand reaches (x, z) facing the back wall, then the 'pickup' reach; cb at the reach's low point
  reachTo(x, z, cb) {
    const h = this.game.hero, a = Math.PI;   // (facing the back wall: -z)
    const fx = Math.sin(a), fz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a);
    const at = { x: x - fx * PICK.fw + sx * PICK.side, z: z - fz * PICK.fw + sz * PICK.side };
    const go = () => h.act('pickup', PICK.dur, cb, PICK.at);
    if (Math.hypot(h.pos.x - at.x, h.pos.z - at.z) < 0.05 && Math.abs(Math.atan2(Math.sin(h.angle - a), Math.cos(h.angle - a))) < 0.05) go();
    else this.walk([at], a, go);
  }
  // Hero.walkTo, kept going in a room (life.js drops any walkTo once Twinsen is in a room or region, for its own
  // bench and pump: the few steps asked for here are put back each frame until they end; his own stick, a hit or the
  // weapon wheel still take over, as in Hero.update)
  walk(pts, a, then) {
    const h = this.game.hero, done = () => { this._steer = null; };
    h.walkTo(pts, { a, speed: 1.3, then: () => { done(); then(); }, fail: () => { done(); h.angle = a; then(); } });
    this._steer = h.steer;
  }
  keepSteer() {
    const S = this._steer; if (!S) return;
    const g = this.game, h = g.hero, mv = g.input?.move?.() || { x: 0, y: 0 };
    if (h.steer === S) return;
    if (h.steer || h.hurtT > 0.15 || Math.hypot(mv.x, mv.y) > 0.3 || g.input?.down?.('wheel') || g.state !== 'play') { this._steer = null; return; }
    h.steer = S;
  }
  gemInteractables(consider, dist) {
    if (!this.inGemRoom() || !this.gemsOpen()) return;
    const G = this.G, f = this.f, h = this.game.hero;
    if (h.steer || h.actT > 0 || this._steer) return;
    const ready = !!f.dx_jaspa_ask && !f.dx_jaspa_sorted;
    const next = this.nextOnTray();
    consider(dist(G.tray.x, G.tray.z), 1.25, { kind: 'dx_tray', x: G.tray.x, z: G.tray.z, label: ready && next && this.held == null ? 'p_take' : 'p_look' });
    for (const k of ['P', 'K']) { const B = G.bins[k]; consider(dist(B.x, B.z), 1.15, { kind: 'dx_bin' + k, bin: k, x: B.x, z: B.z, label: ready && this.held != null ? 'p_place' : 'p_look' }); }
  }
  gemInteract(it) {
    const g = this.game, f = this.f, G = this.G;
    const look = (key) => { g.say('n_hero', [t(key)], null, g.hero); return true; };
    const ready = !!f.dx_jaspa_ask && !f.dx_jaspa_sorted;
    if (it.kind === 'dx_tray') {
      if (f.dx_jaspa_sorted) return look('dx_tray_done');
      if (!ready) return look('dx_tray_look');
      const s = this.nextOnTray();
      if (this.held != null || !s) return look(this.held != null ? (G.gems[this.held].warm ? 'dx_gem_warm' : 'dx_gem_cold') : 'dx_tray_empty');
      const F = G.F, wx = F.cx + s.slot.x, wz = F.cz + s.slot.z;
      this.reachTo(wx, wz, () => {
        this.held = s.i;
        const hand = g.hero.rig?.j?.armR?.hand;
        if (hand) { hand.add(s.m); s.m.position.set(0, -0.06, 0.02); s.m.rotation.set(0, 0, 0); }
        g.audio.play('select');
        const lines = [['hero', s.warm ? 'dx_gem_warm' : 'dx_gem_cold']];
        if (s.warm && f.c4_bottom && !f.dx_jaspa_digSaid) { f.dx_jaspa_digSaid = true; lines.push(['hero', 'dx_gem_warm_dig']); }
        this.chain(lines);
      });
      return true;
    }
    const k = it.bin, B = G.bins[k];
    if (!ready || this.held == null) return look(k === 'P' ? 'dx_bin_project' : 'dx_bin_keep');
    this.reachTo(B.x, B.z + GEM_L.binS / 2 - 0.1, () => this.place(k));   // (his hand in over the bin's near rim)
    return true;
  }
  // the stone in his hand goes into a bin
  place(k) {
    const g = this.game, f = this.f, G = this.G, s = G.gems[this.held];
    if (!s) return;
    this.held = null;
    const b = this.bins.split(''); b[s.i] = k; f.dx_jaspa_bins = b.join('');
    this.layGems();
    g.audio.play('chest');
    if (k === 'P' && s.warm) {
      G.flashT = 1.6; g.audio.play('deny');
      return this.wrong('dx_jaspa_wrong_warm');
    }
    if (k === 'P') G.okT = 0.35;
    if (b.includes('.')) { g.save(false); return; }
    // all six in: a cold one kept is the other mistake
    if (G.gems.some((q) => !q.warm && b[q.i] === 'K')) return this.wrong('dx_jaspa_wrong_cold');
    f.dx_jaspa_sorted = true;
    const n = this.npc('il_jaspa'), p = n?.present && this.here() === GEM_ROOM ? n.pos : { x: G.tray.x, y: 0, z: G.tray.z + 0.6 };
    this.chain([['il_jaspa', 'dx_jaspa_done1'], ['il_jaspa', 'dx_jaspa_done2']], () => {
      this.giveCrystal('sc-jaspa', p.x, (p.y || 0) + 1.2, p.z, GEM_ROOM);
      g.save(false);
    });
  }
  wrong(key) {
    const g = this.game, f = this.f;
    f.dx_jaspa_tries = (f.dx_jaspa_tries || 0) + 1;
    this.chain([['il_jaspa', key]], () => { f.dx_jaspa_bins = '.'.repeat(GEMS); this.layGems(); g.audio.play('select'); g.save(false); });
  }
  gemUpdate(dt) {
    const G = this.G; if (!G) return;
    const g = this.game;
    // a stone carried off (out of the room, away from the bench) goes back to the tray
    if (this.held != null && (this.here() !== GEM_ROOM || Math.hypot(g.hero.pos.x - G.tray.x, g.hero.pos.z - G.tray.z) > 5)) { this.held = null; this.layGems(); }
    if (this.here() !== GEM_ROOM) return;
    const T = g.time;
    for (const s of G.gems) for (const q of s.motes) { const ph = (T * 0.45 + q.userData.ph) % 1; q.position.set(Math.sin(ph * 9 + s.i) * 0.012, 0.09 + ph * 0.22, Math.cos(ph * 7 + s.i) * 0.012); q.visible = ph < 0.85; }
    const L = G.bins.P.lamp;
    if (G.flashT > 0) { G.flashT -= dt; L.material.color.set('#ff4a3a'); L.material.emissive.set('#ff2a1a'); L.material.emissiveIntensity = Math.sin(G.flashT * 18) > 0 ? 2.5 : 0.2; }
    else if (G.okT > 0) { G.okT -= dt; L.material.color.set('#7aff8a'); L.material.emissive.set('#30e040'); L.material.emissiveIntensity = 1.6; }
    else { L.material.color.set('#552222'); L.material.emissiveIntensity = 0; }
    // the fork's ring dies away
    for (const s of G.gems) if (s.ringT > 0 && (s.ringT -= dt) <= 0) s.m.children[0].material = s.base;
  }
  ringM() { return (this._ringM ||= MAT.glow('#d8f8ff', '#40d8ff', 2.2)); }
  gemFork(o) {
    if (!this.inGemRoom() || !this.gemsOpen()) return false;
    const G = this.G;
    if (Math.hypot(G.tray.x - o.x, G.tray.z - o.z) > o.reach + 0.9) return false;
    const b = this.bins, ring = G.gems.filter((s) => s.warm && b[s.i] === '.' && this.held !== s.i);
    const g = this.game;
    for (const s of ring) { const c = s.m.children[0]; s.base ||= c.material; c.material = this.ringM(); s.ringT = 2.5; }
    if (ring.length) g.audio.play('shard');
    this.chain([['hero', ring.length >= 2 ? 'dx_gem_fork' : ring.length ? 'dx_gem_fork1' : 'dx_gem_fork0']]);
    return true;
  }
  // Jaspa: his own line first, then the job (the first time); while it is open, every other talk reminds of the rule
  jaspaTalk(npc) {
    const f = this.f, g = this.game;
    if (!this.gemsOpen() || this.here() !== GEM_ROOM) return false;
    if (!f.dx_jaspa_ask) return this.after(npc, ['dx_jaspa_1', 'dx_jaspa_2', 'dx_jaspa_3'], () => { f.dx_jaspa_ask = true; g.save(false); });
    if (f.dx_jaspa_sorted && !f.dx_jaspa_thx && !f.dx_owe_sc_jaspa) { f.dx_jaspa_thx = true; return this.say1(npc, 'dx_jaspa_after'); }
    if (!f.dx_jaspa_sorted) { const n = (npc._dxN = (npc._dxN ?? -1) + 1); if (n % 2 === 0) return this.say1(npc, 'dx_jaspa_wait'); }
    return false;
  }
  // (one line in the person's own name and voice)
  say1(npc, key) { npc.talking = true; this.game.say(npc.def.name || 'n_' + npc.def.id, [t(key)], () => { npc.talking = false; }, npc); return true; }
  // the person's own talk (the next handler of the chain says it), with lines added after it: the first talk keeps
  // what the person always says and then brings up the favour
  after(npc, keys, done) {
    const g = this.game, say = g.say;
    let used = false;
    g.say = function (name, lines, cb, ...rest) {
      g.say = say; used = true;
      return say.call(g, name, [...[].concat(lines), ...keys.map((k) => t(k))], () => { done?.(); cb?.(); }, ...rest);
    };
    let r = false;
    try { this._passing = true; r = this.story.talkRest(npc); } finally { this._passing = false; g.say = say; }
    if (!used) { npc.talking = true; say.call(g, npc.def.name || 'n_' + npc.def.id, keys.map((k) => t(k)), () => { npc.talking = false; done?.(); }, npc); }
    return true;
  }

  // ================================================================ HAM-1: the waystone
  // The upper stone: a square block round the pillar's upper half, set at 45° to it (so its faces look out over the
  // plinth's corners, where there is room to stand, and one of them looks straight at the observatory), under the
  // pillar's cap. Its faces are carved (WAY_CARVE, in turning order); a turn moves each carving on a quarter. He stands
  // on the plinth's top step at a corner, both hands on the face's grips ('pumpGrip'), and pushes it round. The niche:
  // a slab in the pillar's foot that sinks into the step.
  buildWay(M) {
    const W = M.lba1.places['lba1-waystone'], P = this.game.physics;
    const top = 1.302;                                      // the plinth's top step (props-lba1hamalayi.js H1 + H2)
    const B = WAY.hw, y0 = top + WAY.y0, y1 = top + WAY.y1;
    const grp = this.holder(M, W.x, W.gy, W.z, W.ry);
    const turnBase = new THREE.Group(); turnBase.rotation.y = Math.PI / 4; grp.add(turnBase);
    const turn = new THREE.Group(); turnBase.add(turn);
    const stone = MM.stone('#d8d0c4'), dark = MM.stone('#5a524a');
    const block = new THREE.Mesh(rbox(B * 2, y1 - y0, B * 2, 0.05), stone); block.position.y = (y0 + y1) / 2; block.castShadow = true; turn.add(block);
    const band = new THREE.Mesh(rbox(B * 2 + 0.06, 0.08, B * 2 + 0.06, 0.02), stone); band.position.y = y1 - 0.04; turn.add(band);
    const panels = [];
    WAY_CARVE.forEach((c, k) => {
      const face = new THREE.Group(); face.rotation.y = k * Math.PI / 2; turn.add(face);
      const pl = new THREE.Mesh(plane(0.7, 0.62), carveMat(c)); pl.position.set(0, top + WAY.carveY, B + 0.004); face.add(pl);
      for (const sx of [-WAY.gripS, WAY.gripS]) { const gq = new THREE.Mesh(rbox(0.07, 0.13, 0.03, 0.01), dark); gq.position.set(sx, top + WAY.gripY, B + 0.006); face.add(gq); }
      panels.push(pl);
    });
    // the niche in the pillar's foot (its local -z face): a dark hollow behind a slab
    const C = 0.867, nz = -(C / 2);
    const hollow = new THREE.Mesh(rbox(0.3, 0.34, 0.02, 0.01), MAT.flat('#0a0806', 1)); hollow.position.set(0, top + 0.3, nz - 0.004); grp.add(hollow);
    const slab = new THREE.Mesh(rbox(0.38, 0.44, 0.06, 0.02), stone); slab.position.set(0, top + 0.3, nz - 0.028); slab.castShadow = true; grp.add(slab);
    const w = (lx, lz) => { const c = Math.cos(W.ry), sn = Math.sin(W.ry); return { x: W.x + c * lx + sn * lz, z: W.z - sn * lx + c * lz }; };
    P.add({ type: 'box', x: W.x, z: W.z, hw: B, hd: B, rot: W.ry + Math.PI / 4, top: W.gy + y1, bottom: W.gy + y0, noStand: true });
    this.way = { M, grp, turn, panels, slab, slabY: slab.position.y, top, ry: W.ry, cx: W.x, cz: W.z, gy: W.gy, niche: { ...w(0, nz - 0.25), y: W.gy + top + 0.3 }, turnT: 0, openT: 0 };
  }
  wayFace() { const v = this.f.dx_way_face; return Number.isInteger(v) ? ((v % 4) + 4) % 4 : WAY_START; }
  // the world bearing (atan2 dx, dz) carving c faces with the stone turned s quarters
  carveBearing(c, s = this.wayFace()) { return this.way.ry + Math.PI / 4 + (c + s) * Math.PI / 2; }
  setWay() {
    const Y = this.way; if (!Y || Y.turnT > 0) return;
    Y.turn.rotation.y = this.wayFace() * Math.PI / 2;
    if (!(Y.openT > 0)) Y.slab.position.y = this.f.dx_way_open ? Y.slabY - 0.5 : Y.slabY;
  }
  wayOpen() { return this.at('pass') && this.able() && this.here() === 'hamalayi' && !!this.way; }
  wayInteractables(consider, dist) {
    if (!this.wayOpen()) return;
    const Y = this.way, h = this.game.hero, f = this.f;
    if (h.steer || h.actT > 0 || Y.turnT > 0 || this._steer) return;
    const d = Math.hypot(h.pos.x - Y.cx, h.pos.z - Y.cz), up = h.pos.y > Y.gy + Y.top - 0.25;
    if (up && d < 1.5) consider(d, 1.6, { kind: 'dx_way', x: Y.cx, z: Y.cz, label: f.dx_way_seen && !f.dx_way_open ? 'p_turn' : 'p_look' });
    else if (!up && d < 3.2) consider(d, 3.3, { kind: 'dx_way_look', x: Y.cx, z: Y.cz, label: 'p_look' });
  }
  wayInteract(it) {
    const g = this.game, f = this.f, Y = this.way, h = g.hero;
    const look = (key) => { this.chain([['hero', key]], () => g.save(false)); return true; };
    if (f.dx_way_open) return look(this.has('sc-waystone') ? 'dx_way_done' : 'dx_way_words');
    if (it.kind === 'dx_way_look' || !f.dx_way_seen) { f.dx_way_seen = true; return look('dx_way_look'); }
    // to the corner nearest him, facing the stone's face there; both hands on its grips; he pushes it round a quarter
    const al = Math.atan2(h.pos.x - Y.cx, h.pos.z - Y.cz), base = Y.ry + Math.PI / 4;
    const k = Math.round((al - base) / (Math.PI / 2)), ak = base + k * Math.PI / 2;
    const spot = { x: Y.cx + Math.sin(ak) * WAY.stand, z: Y.cz + Math.cos(ak) * WAY.stand }, a = ak + Math.PI;
    const push = () => {
      h.act('pumpGrip', WAY.dur, () => this.turned(), 0.05);
      Y.turnT = WAY.dur - 0.15; Y.from = Y.turn.rotation.y; g.audio.play('grind');
    };
    if (Math.hypot(h.pos.x - spot.x, h.pos.z - spot.z) < 0.06) { h.angle = a; push(); }
    else this.walk([spot], a, push);
    return true;
  }
  turned() {
    const g = this.game, f = this.f, Y = this.way;
    const s = (this.wayFace() + 1) % 4;
    f.dx_way_face = s; f.dx_way_turns = (f.dx_way_turns || 0) + 1;
    Y.turnT = 0; Y.turn.rotation.y = s * Math.PI / 2;
    if (s !== WAY_SOLVED) { this.chain([['hero', 'dx_way_s' + s]], () => g.save(false)); return; }
    f.dx_way_open = true;
    // the click; then the slab sinks (seen, not under a line); then the niche and its crystal
    this.chain([['hero', 'dx_way_ok']], () => {
      Y.openT = 1.2; g.audio.play('rumble');
      Y.afterOpen = () => this.chain([['hero', 'dx_way_open']], () => {
        const n = Y.niche;
        this.giveCrystal('sc-waystone', n.x, n.y, n.z, 'hamalayi');
        g.save(false);
      });
    });
  }
  wayUpdate(dt) {
    const Y = this.way; if (!Y) return;
    if (Y.turnT > 0) {
      Y.turnT -= dt;
      const k = 1 - Math.max(0, Y.turnT) / (WAY.dur - 0.15), e = k * k * (3 - 2 * k);
      Y.turn.rotation.y = Y.from + e * Math.PI / 2;
    }
    if (Y.openT > 0) {
      Y.openT -= dt;
      const k = 1 - Math.max(0, Y.openT) / 1.2;
      Y.slab.position.y = Y.slabY - 0.5 * k;
      if (Y.openT <= 0 && Y.afterOpen) { const fn = Y.afterOpen; Y.afterOpen = null; fn(); }
    }
    // the words in the niche, once the crystal is in his hand
    const f = this.f;
    if (f.dx_way_open && !f.dx_way_read && this.has('sc-waystone') && this.game.state === 'play' && this.here() === 'hamalayi') { f.dx_way_read = true; this.chain([['hero', 'dx_way_words']]); }
  }
  // Brother Tenpa: his own line first; then the pilgrims (the first time), a hint after a few turns, thanks after
  tenpaTalk(npc) {
    const f = this.f;
    if (!this.at('pass') || !this.able()) return false;
    if (!f.dx_way_ask) return this.after(npc, ['dx_way_tenpa1', 'dx_way_tenpa2'], () => { f.dx_way_ask = true; this.game.save(false); });
    if (!f.dx_way_open && (f.dx_way_turns || 0) >= 3 && !f.dx_way_hint) return this.after(npc, ['dx_way_tenpa_hint'], () => { f.dx_way_hint = true; });
    if (f.dx_way_open && !f.dx_way_thx) return this.after(npc, ['dx_way_tenpa_done'], () => { f.dx_way_thx = true; });
    return false;
  }

  // ================================================================ HAM-3: Yorna's brother's pack (the glacier basin)
  // A block of clear glacier ice against the basin's north rock, the pack frozen in it (seen through the ice). The ball
  // only skips off it. Two ways in: the heat flask, filled at the open vent 21 m south and let out at the ice
  // (index.js heatHit → packHeat), or the observatory crew's signal mirror on its post, turned an eighth at a time until
  // its spot of sunlight lands on the ice (chapter 7's rule: light melts ice). Either melts it (MELT_T s; nothing to
  // wait for after that: the light stays where it was put); the pack is taken by hand (a singing crystal in its side
  // pocket, the brother's notebook); Yorna gets the pack and notebook back. What stays: the hollow and its meltwater,
  // the mirror where he left it, Yorna's line about the pack by her door in a later chapter.
  // State: dx_pack_ask (Yorna's hook), dx_pack_seen, dx_pack_mirSeen, dx_pack_mir (the mirror's eighth, 0..7; as found
  // MIR.start), dx_pack_mirSaid, dx_pack_thawed ('flask' | 'mirror'), dx_pack_taken, dx_pack_given (the chapter index
  // + 1 it was given in), dx_pack_later.
  buildPack(M) {
    const g = this.game, P = g.physics, T = P.terrain;
    // the wall's foot: the lowest of the ice under its front (it stands into the rock behind)
    const gy = Math.min(...[-1, 0, 1].map((s) => T.heightAt(ICE.x + s * ICE.w * 0.4, ICE.z + ICE.d * 0.3)));
    const grp = this.holder(M, ICE.x, gy, ICE.z, 0);
    // the ice: a faceted block, its vertices pushed by a smooth function of where they are (shared corners stay shut)
    const geo = new THREE.IcosahedronGeometry(1, 1), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), n = 1 + 0.13 * Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - y * 1.9) + 0.06 * Math.sin(x * 9 + z * 7);
      pa.setXYZ(i, x * n * ICE.w / 2, Math.max(-0.92, y * n) * ICE.h / 2 + ICE.h / 2 - 0.12, z * n * ICE.d / 2 - 0.12);
    }
    geo.computeVertexNormals();
    const iceM = new THREE.MeshStandardMaterial({ color: '#c4e6f8', roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.58, emissive: '#2a6a9a', emissiveIntensity: 0.22, flatShading: true, depthWrite: false });
    iceM.userData.noShadow = true;
    const ice = new THREE.Mesh(geo, iceM); grp.add(ice);
    // the shelf of old ice the pack lies on (it stays when the block is gone), and the meltwater after
    const shelfM = new THREE.MeshStandardMaterial({ color: '#d6eef8', roughness: 0.3, metalness: 0.05, flatShading: true });
    const shelf = new THREE.Mesh(rbox(1.7, 0.46, 0.8, 0.12), shelfM); shelf.position.set(0, 0.2, -0.12); shelf.receiveShadow = true; grp.add(shelf);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.15, 22), new THREE.MeshStandardMaterial({ color: '#8cc6e6', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.62, depthWrite: false }));
    puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.2, 0.62, 1); puddle.position.set(0, 0.03, 0.72); grp.add(puddle);
    // the pack: leather, a flap, two straps, a red blanket roll tied on top, a tin cup on its side
    const pack = new THREE.Group(); pack.position.set(0.05, ICE.packY - 0.32, 0.02); pack.rotation.set(-0.18, 0.25, 0.3); grp.add(pack);
    const leather = MAT.flat('#7a4a2a', 0.85), dark = MAT.flat('#4e2e1a', 0.85);
    const bag = new THREE.Mesh(rbox(0.46, 0.54, 0.26, 0.06), leather); bag.position.y = 0.27; pack.add(bag);
    const flap = new THREE.Mesh(rbox(0.47, 0.2, 0.28, 0.04), dark); flap.position.set(0, 0.47, 0.01); pack.add(flap);
    for (const sx of [-0.12, 0.12]) { const st = new THREE.Mesh(rbox(0.04, 0.5, 0.275, 0.01), dark); st.position.set(sx, 0.28, 0.005); pack.add(st); }
    const roll = new THREE.Mesh(cyl(0.1, 0.1, 0.52, 10), MAT.flat('#b0402e', 0.9)); roll.rotation.z = Math.PI / 2; roll.position.y = 0.62; pack.add(roll);
    for (const sx of [-0.16, 0.16]) { const band = new THREE.Mesh(cyl(0.105, 0.105, 0.05, 10), MAT.flat('#d8a040', 0.8)); band.rotation.z = Math.PI / 2; band.position.set(sx, 0.62, 0); pack.add(band); }
    const cup = new THREE.Mesh(cyl(0.05, 0.045, 0.09, 10), MAT.steel()); cup.position.set(0.26, 0.2, 0); pack.add(cup);
    const col = P.add({ type: 'box', x: ICE.x, z: ICE.z - 0.05, hw: ICE.w / 2 - 0.1, hd: ICE.d / 2, rot: 0, top: gy + ICE.h - 0.2, noStand: true });
    // the signal mirror on its post: a round mirror on a yoke that turns, the crew's plate on the post
    const my = T.heightAt(MIR.x, MIR.z), mg = this.holder(M, MIR.x, my, MIR.z, 0);
    const stone = MM.stone('#bdb3a3'), brass = MAT.brass();
    const post = new THREE.Mesh(cyl(0.15, 0.2, 1.0, 10), stone); post.position.y = 0.5; post.castShadow = true; mg.add(post);
    const cap = new THREE.Mesh(cyl(0.19, 0.19, 0.07, 10), stone); cap.position.y = 1.03; mg.add(cap);
    const yaw = new THREE.Group(); yaw.position.y = 1.07; mg.add(yaw);
    for (const sx of [-0.31, 0.31]) { const arm = new THREE.Mesh(rbox(0.04, 0.34, 0.05, 0.01), brass); arm.position.set(sx, 0.17, 0); yaw.add(arm); }
    const bar = new THREE.Mesh(rbox(0.66, 0.04, 0.06, 0.01), brass); bar.position.y = 0.02; yaw.add(bar);
    const tilt = new THREE.Group(); tilt.position.y = MIR.eye - 1.07; tilt.rotation.x = 0.12; yaw.add(tilt);
    const glass = new THREE.Mesh(cyl(0.26, 0.26, 0.035, 22), new THREE.MeshStandardMaterial({ color: '#eef6fa', roughness: 0.05, metalness: 0.95, emissive: '#fff4d0', emissiveIntensity: 0.35 }));
    glass.rotation.x = Math.PI / 2; glass.position.z = 0.02; tilt.add(glass);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 6, 24), brass); rim.position.z = 0.02; tilt.add(rim);
    const back = new THREE.Mesh(cyl(0.27, 0.27, 0.03, 22), brass); back.rotation.x = Math.PI / 2; back.position.z = -0.01; tilt.add(back);
    const plate = new THREE.Mesh(plane(0.3, 0.12), MAT.map(canvasTex(160, 64, (x, w) => { x.fillStyle = '#c8a050'; x.fillRect(0, 0, w, 64); x.fillStyle = '#3a2a14'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center'; x.fillText('SIGNAL', w / 2, 26); x.fillText('OBSERVATORY', w / 2, 48); }), 0.5, { metalness: 0.4 }));
    plate.position.set(0, 0.72, 0.181); mg.add(plate);
    P.add({ type: 'cyl', x: MIR.x, z: MIR.z, r: 0.34, top: my + 1.6, noStand: true });
    // the light it sends: a faint shaft and a bright spot where it lands (sunlight on snow, rock or ice)
    const beamM = new THREE.MeshBasicMaterial({ color: '#fff2c0', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    beamM.userData.noShadow = true;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 1, 10, 1, true).translate(0, 0.5, 0), beamM); M.group.add(beam);
    const spotM = new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    spotM.userData.noShadow = true;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), spotM); M.group.add(spot);
    // the ball: it skips off the ice (and says so)
    const self = this;
    M.ballTargets.push({ x: ICE.x, y: gy + 1.0, z: ICE.z + ICE.d / 2, r: 1.1, material: 'crystal', result: 'blocked', get done() { return !!self.f.dx_pack_thawed || !self.at('observatory'); }, onHit() { self.packBall(); } });
    this.pk = { M, grp, ice, iceM, shelf, puddle, pack, col, gy, my, yaw, beam, spot, meltT: 0, turnT: 0, front: { x: ICE.x, y: gy + 1.0, z: ICE.z + ICE.d / 2 + 0.05 } };
    this.setBeam();
  }
  mirK() { const v = this.f.dx_pack_mir; return Number.isInteger(v) ? ((v % 8) + 8) % 8 : MIR.start; }
  // where the mirror's light lands for heading eighth k: on the ice at MIR_SOLVED; else the first rock it meets within
  // MIR.len, or the snow at MIR.len (the spot shows the player which)
  beamEnd(k = this.mirK()) {
    const K = this.pk, T = this.game.physics.terrain, a = k * Math.PI / 4, dx = Math.sin(a), dz = Math.cos(a);
    if (k === MIR_SOLVED) return { x: K.front.x, y: K.front.y, z: K.front.z, on: 'ice', nx: 0, nz: 1 };
    let last = { x: MIR.x + dx * 0.5, z: MIR.z + dz * 0.5 };
    for (let s = 0.5; s <= MIR.len; s += 0.25) {
      const x = MIR.x + dx * s, z = MIR.z + dz * s;
      if (T.heightAt(x, z) > K.my + 0.9) return { x: last.x, y: K.my + 1.0, z: last.z, on: 'rock', nx: -dx, nz: -dz };
      last = { x, z };
    }
    return { x: last.x, y: T.heightAt(last.x, last.z) + 0.04, z: last.z, on: 'snow' };
  }
  setBeam() {
    const K = this.pk; if (!K) return;
    const e = this.beamEnd(), gp = K.M.group.position;
    const from = new THREE.Vector3(MIR.x, K.my + MIR.eye, MIR.z), to = new THREE.Vector3(e.x, e.y, e.z), d = to.clone().sub(from), L = d.length();
    K.beam.position.copy(from).sub(gp); K.beam.scale.set(1, L, 1);
    K.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    K.spot.position.set(e.x - gp.x, e.y - gp.y, e.z - gp.z);
    if (e.on === 'snow') K.spot.rotation.set(-Math.PI / 2, 0, 0);
    else K.spot.rotation.set(0, Math.atan2(e.nx, e.nz), 0);
    K.spot.scale.setScalar(e.on === 'ice' ? 1.25 : 1);
    K.yaw.rotation.y = this.mirK() * Math.PI / 4;
    K.end = e;
  }
  setPack() {
    const K = this.pk; if (!K || K.meltT > 0) return;
    const f = this.f, thawed = !!f.dx_pack_thawed;
    K.ice.visible = !thawed; K.iceM.opacity = 0.58; K.ice.scale.set(1, 1, 1);
    K.puddle.visible = thawed; K.puddle.scale.set(1.2, 0.62, 1);
    K.pack.visible = !f.dx_pack_taken;
    K.col.top = K.gy + (thawed ? 0.45 : ICE.h - 0.2); this.game.physics.update(K.col);
    if (!(K.turnT > 0)) this.setBeam();
  }
  packOpen() { return this.at('observatory') && this.able() && this.here() === 'hamalayi' && !!this.pk; }
  packInteractables(consider, dist) {
    if (!this.packOpen()) return;
    const K = this.pk, h = this.game.hero, f = this.f;
    if (h.steer || h.actT > 0 || this._steer || K.meltT > 0 || K.turnT > 0 || Math.abs(h.pos.y - K.gy) > 1.6) return;
    consider(dist(K.front.x, K.front.z), 2.0, { kind: 'dx_pack', label: f.dx_pack_thawed && !f.dx_pack_taken ? 'p_take' : 'p_look' });
    consider(dist(MIR.x, MIR.z), 1.5, { kind: 'dx_mirror', label: f.dx_pack_mirSeen && !f.dx_pack_thawed ? 'p_turn' : 'p_look' });
  }
  packInteract(it) {
    const g = this.game, f = this.f, K = this.pk, h = g.hero;
    const say = (keys) => { this.chain(keys.map((k) => ['hero', k]), () => g.save(false)); return true; };
    if (it.kind === 'dx_mirror') {
      if (!f.dx_pack_mirSeen || f.dx_pack_thawed) { f.dx_pack_mirSeen = true; return say([f.dx_pack_thawed ? 'dx_mir_after' : 'dx_mir_look']); }
      // his hands on the yoke: the mirror goes round an eighth
      h.angle = Math.atan2(MIR.x - h.pos.x, MIR.z - h.pos.z);
      h.act('use', 0.9, null, 0.2);
      K.turnT = 0.8; K.from = K.yaw.rotation.y; g.audio.play('grind');
      return true;
    }
    if (f.dx_pack_taken) return say(['dx_pack_after']);
    if (!f.dx_pack_thawed) { f.dx_pack_seen = true; return say([f.dx_pack_ask ? 'dx_pack_look_y' : 'dx_pack_look']); }
    // the pack, by hand: off the shelf, into his arms
    const p = new THREE.Vector3(); K.pack.getWorldPosition(p);
    h.angle = Math.atan2(p.x - h.pos.x, p.z - h.pos.z);
    h.act('pickup', 0.9, () => {
      f.dx_pack_taken = true; K.pack.visible = false; g.audio.play('chest');
      this.chain([['hero', 'dx_pack_take'], ['hero', 'dx_pack_note']], () => { this.giveCrystal('sc-pack', p.x, p.y + 0.9, p.z + 0.7, 'hamalayi'); g.save(false); });
    }, 0.45);
    return true;
  }
  mirTurned() {
    const g = this.game, f = this.f, K = this.pk;
    const k = (this.mirK() + 1) % 8;
    f.dx_pack_mir = k; K.turnT = 0; this.setBeam();
    const lines = [];
    if (!f.dx_pack_mirSaid) { f.dx_pack_mirSaid = true; lines.push('dx_mir_turn1'); }
    if (k === MIR_SOLVED && !f.dx_pack_thawed) lines.push('dx_mir_ice');
    if (lines.length) this.chain(lines.map((l) => ['hero', l]), () => { if (k === MIR_SOLVED) this.melt('mirror'); g.save(false); });
    else g.save(false);
  }
  packBall() {
    if (this._ballSaid > this.game.time - 4) return;
    this._ballSaid = this.game.time;
    this.f.dx_pack_seen = true;
    this.chain([['hero', 'dx_pack_ball']]);
  }
  // the heat flask let out at the ice (index.js heatHit; o: his feet, his facing, the blast's reach)
  packHeat(o) {
    const K = this.pk, f = this.f;
    if (!K || f.dx_pack_thawed || this.here() !== 'hamalayi' || !this.at('observatory')) return false;
    const cx = o.x + o.fx * 1.2, cz = o.z + o.fz * 1.2;
    if (Math.hypot(cx - K.front.x, cz - K.front.z) > 2.2 || Math.abs(o.y - K.gy) > 2) return false;
    this.game.particles.burst(K.front.x, K.gy + 1.0, K.front.z, '#f4f4f4', 22, 1.2);
    this.game.gadgets.tools.sound('steam');
    this.melt('flask');
    return true;
  }
  melt(how) {
    const K = this.pk, f = this.f, g = this.game;
    if (!K || f.dx_pack_thawed) return;
    f.dx_pack_thawed = how; f.dx_pack_seen = true;
    K.meltT = MELT_T; K.puddle.visible = true; K.puddle.scale.set(0.2, 0.12, 1);
    g.audio.play('rumble');
    g.save(false);
  }
  packUpdate(dt) {
    const K = this.pk; if (!K) return;
    const g = this.game;
    if (K.turnT > 0) {
      K.turnT -= dt;
      const k = 1 - Math.max(0, K.turnT) / 0.8, e = k * k * (3 - 2 * k);
      K.yaw.rotation.y = K.from + e * Math.PI / 4;
      K.beam.visible = K.spot.visible = false;
      if (K.turnT <= 0) { K.beam.visible = K.spot.visible = true; this.mirTurned(); }
    }
    if (K.meltT > 0) {
      K.meltT -= dt;
      const k = 1 - Math.max(0, K.meltT) / MELT_T;
      K.iceM.opacity = 0.58 * (1 - k);
      K.ice.scale.set(1 - 0.25 * k, 1 - 0.75 * k, 1 - 0.3 * k);
      K.puddle.scale.set(0.2 + k, (0.2 + k) * 0.62, 1);
      if (this.here() === 'hamalayi' && Math.random() < dt * 14) g.particles.spawn({ x: ICE.x + (Math.random() - 0.5) * ICE.w * 0.8, y: K.gy + 0.4 + Math.random() * ICE.h * (1 - k), z: K.front.z - 0.1, vx: 0, vy: 0.6 + Math.random() * 0.5, vz: 0.2, color: '#f2f8ff', a: 0.45, s0: 0.2, s1: 0.8, life: 1.2, drag: 1.2, add: 0.1, cell: 0, fi: 0.1, fo: 0.6 });
      if (K.meltT <= 0) { this.setPack(); this.chain([['hero', 'dx_pack_free']], () => g.save(false)); }
    }
    // the spot glints while it lies on the ice
    K.spot.material.opacity = K.end?.on === 'ice' && !this.f.dx_pack_thawed ? 0.62 + 0.15 * Math.sin(g.time * 7) : 0.62;
  }
  // Yorna: her own line first, then her brother (the first time, once the vent breathes); the pack given back; one line
  // about it in a later chapter
  yornaTalk(npc) {
    const f = this.f, g = this.game, key = this.story.cur?.key;
    if (!this.able() || !this.at('observatory') || (key === 'observatory' && !f.c7_vent)) return false;
    if (key === 'network' && !f.c10_pim) return false;   // (the network chapter's own first talk with her stays as it is)
    if (f.dx_pack_taken && !f.dx_pack_given) {
      npc.talking = true;
      this.chain([['hero', 'dx_pack_tw'], ['yorna', 'dx_pack_y3'], ['yorna', 'dx_pack_y4'], ['yorna', 'dx_pack_y5']], () => { npc.talking = false; f.dx_pack_given = this.story.index + 1; g.save(false); });
      return true;
    }
    if (!f.dx_pack_ask && !f.dx_pack_taken) return this.after(npc, ['dx_pack_y1', 'dx_pack_y2'], () => { f.dx_pack_ask = true; g.save(false); });
    if (f.dx_pack_given && !f.dx_pack_later && this.story.index + 1 > f.dx_pack_given) return this.after(npc, ['dx_pack_later'], () => { f.dx_pack_later = true; });
    return false;
  }

  // ================================================================ DES-1: where the figures look (Desert Island)
  // The two standing figures on the knolls west of Kesh (LBA2's peach columns, desertold.js) get painted eyes on their
  // bands, each pair looking at one low drift on the sand flat between them (DRIFT): their gazes cross there. Brosk's
  // grandfather's saying (his hook, once the condenser hall is dug) is "dig where the stone people look"; a Look at a
  // figure says what it stares at (and, where camera beats run, the view follows its gaze); the drift rings hollow and
  // wants a shovel; Brosk lends his again; dug, a survey hatch from FunFrock's years (SURVEY 7) with a dry box: a
  // singing crystal and the crew's note. The pocket set hums at the drift (optional). What stays: the hatch open in
  // its ring of dug sand, the figures' Look and Brosk's line after.
  // State: dx_gaze_ask (Brosk's hook), dx_gaze_f0 / dx_gaze_f1 (each figure looked at), dx_gaze_seen (both),
  // dx_gaze_drift (the drift looked at), dx_gaze_shovel (lent), dx_gaze_dug, dx_gaze_open, dx_gaze_back (returned).
  buildGaze(R) {
    const g = this.game, P = g.physics, T = P.terrain;
    // the figures' bands (desertold.js domeFigure: an eight-sided ring 1.15 round, 0.7 high, 4.04 up; turned π/2 and 0.75π)
    const RY = [Math.PI / 2, Math.PI * 0.75];
    const figs = R.figures.slice(0, 2).map((F, i) => {
      const fg = T.heightAt(F.x, F.z), gaze = Math.atan2(DRIFT.x - F.x, DRIFT.z - F.z);
      const u = ((((gaze - RY[i]) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
      const W = 1536, Hh = 128, tex = canvasTex(W, Hh, (x) => {
        x.clearRect(0, 0, W, Hh);
        for (const c of [u * W - W, u * W, u * W + W]) for (const s of [-1, 1]) {
          // (big enough to read from the play camera: each eye about half a metre wide on the band)
          const ex = c + s * 70, ey = 74;
          // the brow, the almond eye (white, a dark rim), the pupil low in it: looking a little down, at the sand
          x.strokeStyle = '#22302f'; x.lineWidth = 13; x.lineCap = 'round';
          x.beginPath(); x.moveTo(ex - 46, ey - 40); x.quadraticCurveTo(ex, ey - 62, ex + 46, ey - 40); x.stroke();
          x.fillStyle = '#f6f1e4'; x.beginPath(); x.moveTo(ex - 54, ey); x.quadraticCurveTo(ex, ey - 40, ex + 54, ey); x.quadraticCurveTo(ex, ey + 34, ex - 54, ey); x.fill();
          x.lineWidth = 7; x.stroke();
          x.fillStyle = '#161c1e'; x.beginPath(); x.arc(ex, ey + 8, 17, 0, Math.PI * 2); x.fill();
        }
      });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.158, 1.158, 0.6, 8, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, alphaTest: 0.5 }));
      this.holder(R, F.x, fg + 4.04, F.z, RY[i]).add(ring);
      return { i, x: F.x, z: F.z, y: fg, gaze };
    });
    // the drift: a low heap of paler, wind-rippled sand (the island's own sand, as the condenser hall's drift)
    const gy = T.heightAt(DRIFT.x, DRIFT.z), grp = this.holder(R, DRIFT.x, gy, DRIFT.z, 0.4);
    const sand = tm('sand', { color: '#f6deb0' });
    const drift = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.7, 0.5, 1.2), sand); drift.position.y = -0.1; drift.receiveShadow = true; grp.add(drift);
    // the hatch under it: a concrete collar, an iron lid hinged at the back, the dark hole and the box in it
    const hatch = new THREE.Group(); grp.add(hatch);
    const conc = MAT.stone('grey', 1), iron = MAT.iron();
    for (const [x, z, w, d] of [[0, -0.5, 1.12, 0.12], [0, 0.5, 1.12, 0.12], [-0.5, 0, 0.12, 0.88], [0.5, 0, 0.12, 0.88]]) { const m = new THREE.Mesh(rbox(w, 0.2, d, 0.02), conc); m.position.set(x, 0.06, z); hatch.add(m); }
    const hole = new THREE.Mesh(plane(0.88, 0.88), MAT.flat('#0d0a08', 1)); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02; hatch.add(hole);
    const box = new THREE.Mesh(rbox(0.36, 0.13, 0.26, 0.02), MAT.flat('#5a6a5a', 0.5, { metalness: 0.4 })); box.position.set(-0.12, 0.085, 0.08); hatch.add(box);
    const hinge = new THREE.Group(); hinge.position.set(0, 0.17, -0.44); hatch.add(hinge);
    const lid = new THREE.Mesh(rbox(0.9, 0.05, 0.9, 0.01), iron); lid.position.set(0, 0, 0.44); hinge.add(lid);
    const sten = new THREE.Mesh(plane(0.62, 0.3), MAT.map(canvasTex(192, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#d8c090'; x.font = 'bold 30px monospace'; x.textAlign = 'center'; x.fillText('SURVEY', w / 2, 40); x.fillText('7', w / 2, 80); }), 0.7, { transparent: true, alphaTest: 0.4 }));
    sten.rotation.x = -Math.PI / 2; sten.position.set(0, 0.027, 0.44); hinge.add(sten);
    const handle = new THREE.Mesh(rbox(0.22, 0.04, 0.04, 0.01), iron); handle.position.set(0, 0.04, 0.82); hinge.add(handle);
    // the spoil: two small heaps of the dug sand either side
    const spoil = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.55, 0.28, 0.45), sand); m.position.set(s * 1.15, -0.04, 0.15 * s); grp.add(m); return m; });
    // (FEET-66B: the drift a mound he digs from beside, block: its flat top at 0.3 held him 30 cm over its foot and 10 cm
    //  under its crown; dug, the collar round the hole, block as well: noStand alone, 0.45 m, let him walk into the hole)
    const col = P.add({ type: 'box', x: DRIFT.x, z: DRIFT.z, hw: 1.3, hd: 0.9, rot: 0.4, top: gy + 0.4, block: true });
    this.gz = { R, figs, grp, drift, hatch, hinge, spoil, col, gy, digT: 0, openT: 0, x: DRIFT.x, z: DRIFT.z };
  }
  setGaze() {
    const Z = this.gz; if (!Z || Z.digT > 0 || Z.openT > 0) return;
    const f = this.f, dug = !!f.dx_gaze_dug;
    Z.drift.visible = !dug; Z.drift.scale.set(1, 1, 1);
    Z.hatch.visible = dug; Z.spoil.forEach((m) => { m.visible = dug; });
    Z.hinge.rotation.x = f.dx_gaze_open ? -1.95 : 0;
    Object.assign(Z.col, dug ? { top: Z.gy + 0.45, noStand: true, block: true, hw: 0.6, hd: 0.6 } : { top: Z.gy + 0.4, noStand: true, block: true, hw: 1.3, hd: 0.9 });
    this.game.physics.update(Z.col);
  }
  gazeOpen() { return this.at('dig') && this.able() && this.here() === 'desert' && !!this.gz; }
  // after the condenser hall is dug (chapter 5) or in any chapter after it: Brosk lends the shovel
  gazeLate() { return !!this.f.c5_dug || this.story.index > this.idx('steam'); }
  hasShovel() { const f = this.f; return (!!f.dx_gaze_shovel && !f.dx_gaze_back) || (!!f.c5_shovel && !f.c5_dug); }
  gazeInteractables(consider, dist) {
    if (!this.gazeOpen()) return;
    const Z = this.gz, h = this.game.hero, f = this.f;
    if (h.steer || h.actT > 0 || this._steer || Z.digT > 0 || Z.openT > 0) return;
    for (const F of Z.figs) consider(dist(F.x, F.z), 3.4, { kind: 'dx_fig', fig: F.i, label: 'p_look' });
    if (Math.abs(h.pos.y - Z.gy) > 1.4) return;
    if (!f.dx_gaze_dug) consider(dist(Z.x, Z.z), 2.4, { kind: 'dx_drift', label: this.hasShovel() ? 'p_dig' : 'p_look' });
    else consider(dist(Z.x, Z.z), 1.8, { kind: 'dx_hatch', label: f.dx_gaze_open ? 'p_look' : 'p_relief' });
  }
  gazeInteract(it) {
    const g = this.game, f = this.f, Z = this.gz, h = g.hero;
    const say = (keys) => { this.chain(keys.map((k) => ['hero', k]), () => g.save(false)); return true; };
    if (it.kind === 'dx_fig') {
      const F = Z.figs[it.fig];
      if (f.dx_gaze_dug) return say(['dx_fig_after']);
      f['dx_gaze_f' + F.i] = true;
      const both = f.dx_gaze_f0 && f.dx_gaze_f1, first = both && !f.dx_gaze_seen;
      if (both) f.dx_gaze_seen = true;
      // the line said (the talk shot shows the painted face), the view follows its gaze for a moment: from over its
      // head down to the sand it stares at, then back to the play camera (a camera beat: none with ?nocine or in tests)
      this.chain([['hero', 'dx_fig_look' + F.i], ...(first ? [['hero', 'dx_fig_both']] : [])], () => {
        g.save(false);
        const beat = revealBeat(g, { in: 0.9 });
        if (!beat) return;
        const dx = Math.sin(F.gaze), dz = Math.cos(F.gaze), pos = new THREE.Vector3(F.x - dx * 2.4, F.y + 6.6, F.z - dz * 2.4), look = new THREE.Vector3(Z.x, Z.gy + 0.3, Z.z);
        beat.show(() => ({ pos, look, fov: 44 }));
        Z.beat = { beat, t: 2.8 };
      });
      return true;
    }
    if (it.kind === 'dx_drift') {
      if (!this.hasShovel()) { f.dx_gaze_drift = true; return say(['dx_drift_look']); }
      h.angle = Math.atan2(Z.x - h.pos.x, Z.z - h.pos.z);
      h.act('use', 1.0, () => {
        f.dx_gaze_dug = true; Z.digT = 0.9; g.audio.play('door');
        g.particles.burst(Z.x, Z.gy + 0.5, Z.z, '#f0d8a8', 24, 3);
      }, 0.6);
      return true;
    }
    if (f.dx_gaze_open) return say(['dx_hatch_after']);
    h.angle = Math.atan2(Z.x - h.pos.x, Z.z - h.pos.z);
    h.act('use', 0.8, () => { f.dx_gaze_open = true; Z.openT = 0.7; g.audio.play('chest'); }, 0.4);
    return true;
  }
  gazeUpdate(dt) {
    const Z = this.gz; if (!Z) return;
    const g = this.game;
    if (Z.beat && (Z.beat.t -= dt) <= 0) { Z.beat.beat.release(); Z.beat = null; }
    if (Z.digT > 0) {
      Z.digT -= dt;
      const k = 1 - Math.max(0, Z.digT) / 0.9;
      Z.drift.scale.set(1 + 0.1 * k, Math.max(0.02, 1 - k), 1 + 0.1 * k);
      if (Z.digT <= 0) { this.setGaze(); this.chain([['hero', 'dx_drift_dig']], () => g.save(false)); }
    }
    if (Z.openT > 0) {
      Z.openT -= dt;
      const k = 1 - Math.max(0, Z.openT) / 0.7;
      Z.hinge.rotation.x = -1.95 * k * k * (3 - 2 * k);
      if (Z.openT <= 0) {
        this.setGaze();
        this.chain([['hero', 'dx_hatch_open'], ['hero', 'dx_hatch_note']], () => { this.giveCrystal('sc-figures', Z.x, Z.gy + 0.7, Z.z + 0.9, 'desert'); g.save(false); });
      }
    }
  }
  // Brosk (dtrader): his own line first, then his grandfather's saying; the shovel lent; the shovel back
  broskTalk(npc) {
    const f = this.f, g = this.game;
    if (!this.able() || !this.at('steam') || !this.gazeLate() || this.here() !== 'desert') return false;
    // (the saying the first time; the shovel with it once he has found the drift or the figures' stare, else the next time)
    const lend = !f.dx_gaze_shovel && !f.dx_gaze_dug && (f.dx_gaze_drift || f.dx_gaze_seen);
    const give = () => { f.dx_gaze_shovel = true; g.found('shovel', 'c5_toast_shovel', () => g.save(false)); };
    if (!f.dx_gaze_ask && !f.dx_gaze_dug) return this.after(npc, ['dx_brosk_1', 'dx_brosk_2', ...(lend ? ['dx_brosk_lend'] : [])], () => { f.dx_gaze_ask = true; if (lend) give(); else g.save(false); });
    if (lend) return this.after(npc, ['dx_brosk_lend'], give);
    if (f.dx_gaze_shovel && f.dx_gaze_dug && !f.dx_gaze_back) return this.after(npc, ['dx_brosk_back'], () => { f.dx_gaze_back = true; g.save(false); });
    return false;
  }

  // ================================================================ UND-1: the source (the crystal galleries)
  // A crusted pocket on the start shelf's west wall. With a singing crystal in his pocket it hums (his line, once, within
  // SRC_HUM_R; its seams pulse). Two ways in: the singing fork struck within reach cracks the crust (the fork's rule from
  // Ilka's niche; index.js asks this file on every strike, the wheel's too), or the lantern lit within SRC_LIT_R shows a
  // crack low in it, and then the ball thrown at the crust breaks it there (before that the ball skips off, and he says
  // so). Behind: a small cell with a cluster of singing crystal; one comes out to him (if it is the twelfth, COL-1's
  // payoff). What stays: the open cell
  // and its glow. The descent (chapter 15) and after, the epilogue included (the collar leads down after dinner).
  // State: dx_src_hum, dx_src_crack, dx_source ('fork' | 'ball').
  buildSource(GL) {
    const g = this.game, DY = GL.deckY ?? 3;
    const grp = new THREE.Group(); grp.position.set(SRC.x, DY, SRC.z); grp.rotation.y = Math.PI / 2; GL.group.add(grp);   // (its front, local +z, faces the room: +x)
    // (ROCKS-MASONRY: the pocket is set into the wall's rock by design: its own material, marked for rocksettle.js and
    //  tests/overlap-sweep.mjs (g), as arsenal.js's hollow boulder)
    const set = (m) => { const c = m.clone(); c.userData = { ...m.userData, rockSet: true }; delete c.userData.vcKey; return c; };
    // the pocket: a dark hollow framed by four rough rocks of the wall's own stone (it stands 0.5 m out of the wall)
    const cell = new THREE.Mesh(rbox(1.0, 1.25, 0.7, 0.2), set(MAT.flat('#0b0910', 1))); cell.position.set(0, 0.86, 0.0); grp.add(cell);
    const rimM = set(MAT.flat('#8a7e98', 0.92, { flatShading: true })), rg = new THREE.IcosahedronGeometry(1, 0);
    for (const [x, y, z, sx, sy, sz, r] of [[-0.66, 0.92, 0.22, 0.3, 0.88, 0.42, 0.3], [0.66, 0.88, 0.22, 0.3, 0.84, 0.4, 1.1], [0, 1.66, 0.2, 0.86, 0.3, 0.4, 0.6], [0, 0.11, 0.26, 0.78, 0.15, 0.4, 2.0]]) {
      const m = new THREE.Mesh(rg, rimM); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = r; m.castShadow = true; grp.add(m);
    }
    const cluster = new THREE.Group(); cluster.position.set(0, 0.26, 0.16); cluster.scale.setScalar(1.5); grp.add(cluster);
    // (P128 CRYSTALS-ONE-LOOK: the well cave's glassy prism with its glowing core, same place, height and scale)
    const cmat = crystalMats('cyan');
    [[-0.22, 0.1, 2.2, 0.3], [0.0, 0, 3.0, -0.1], [0.2, 0.08, 2.4, -0.35], [-0.08, 0.16, 1.6, 0.6], [0.12, 0.18, 1.4, -0.7]].forEach(([x, z, sy, rz], i) => {
      const m = crystalGem(cmat.shell, cmat.core, { v: i, hs: 0.09 }); m.position.set(x, 0.09 * sy, z); m.scale.set(1, sy, 1); m.rotation.z = rz; cluster.add(m);
    });
    // the crust: pale plates filling the pocket's mouth, glowing seams between them, a crack low in it (shown by the lantern)
    const crustM = MAT.flat('#ddd6ea', 0.55, { flatShading: true }), seamM = new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#40c8ff', emissiveIntensity: 0, roughness: 0.4 });
    const crust = new THREE.Group(); grp.add(crust);
    const plates = [], pg = new THREE.IcosahedronGeometry(1, 0);
    [[-0.3, 0.42, 0.34, 0.26, 0.16], [0.18, 0.4, 0.38, 0.26, 0.17], [-0.28, 0.86, 0.32, 0.28, 0.18], [0.22, 0.9, 0.36, 0.3, 0.18], [-0.2, 1.3, 0.34, 0.26, 0.16], [0.24, 1.32, 0.32, 0.26, 0.16], [0.0, 0.66, 0.3, 0.24, 0.15], [0.02, 1.1, 0.3, 0.24, 0.15]].forEach(([x, y, sx, sy, sz], i) => {
      const m = new THREE.Mesh(pg, crustM); m.position.set(x, y, 0.4 + (i % 3) * 0.03); m.scale.set(sx, sy, sz); m.rotation.set(0.2 * i, 0.4 * i, 0.3 * i); m.castShadow = true; crust.add(m); plates.push({ m, y });
    });
    for (const [x0, y0, x1, y1] of [[-0.12, 0.55, -0.05, 1.05], [0.36, 0.62, 0.3, 1.15], [-0.1, 1.12, 0.1, 1.5], [0.06, 0.2, 0.12, 0.55]]) {
      const L = Math.hypot(x1 - x0, y1 - y0), sm = new THREE.Mesh(rbox(0.035, L, 0.03, 0.005), seamM); sm.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.5); sm.rotation.z = -Math.atan2(x1 - x0, y1 - y0); crust.add(sm);
    }
    const crack = new THREE.Group(); crack.position.set(0, 0.42, 0.6); crust.add(crack);
    const crackM = new THREE.MeshStandardMaterial({ color: '#1a1420', emissive: '#ffb860', emissiveIntensity: 0.6, roughness: 0.6 });
    [[-0.3, 0.05, -0.1, -0.03], [-0.1, -0.03, 0.08, 0.06], [0.08, 0.06, 0.28, -0.04]].forEach(([x0, y0, x1, y1]) => {
      const L = Math.hypot(x1 - x0, y1 - y0), m = new THREE.Mesh(rbox(L + 0.03, 0.045, 0.04, 0.005), crackM); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.rotation.z = Math.atan2(y1 - y0, x1 - x0); crack.add(m);
    });
    const v = new THREE.Vector3(); GL.group.updateMatrixWorld(true); grp.getWorldPosition(v);
    const col = g.physics.add({ type: 'box', x: v.x + 0.1, z: v.z, hw: 0.45, hd: 0.95, rot: 0, top: DY + 1.9, noStand: true });
    GL.colliders?.push?.(col);
    const self = this, front = { x: v.x + 0.6, y: DY + 0.9, z: v.z };
    // the ball on the crust: once the lantern has shown its crack it breaks there (the crust gives at its weak spot);
    // before that it skips off (his line). One target over the crust's face, as high as a thrown ball flies
    GL.ballTargets.push({ x: front.x, y: DY + 1.05, z: front.z, r: 1.1, material: 'crystal', get result() { return self.f.dx_src_crack ? 'break' : 'blocked'; }, get done() { return !!self.f.dx_source || !self.srcOpen(); }, onHit() { if (self.f.dx_src_crack) self.srcBreak('ball'); else self.srcSkip(); } });
    this.src = { GL, grp, cell, cluster, crust, plates, seamM, crack, col, front, x: v.x, z: v.z, DY, breakT: 0 };
  }
  setSource() {
    const S = this.src; if (!S || S.breakT > 0) return;
    const open = !!this.f.dx_source;
    S.crust.visible = !open; S.cluster.visible = open;
    for (const p of S.plates) p.m.position.y = p.y;
    S.col.top = S.DY + 1.9; this.game.physics.update(S.col);
  }
  srcOpen() { return this.at('shell') && this.able() && this.here() === 'c3gallery' && !!this.src; }
  srcLit() { const S = this.src, h = this.game.hero; return !!this.game.gadgets?.lanternLit?.() && Math.hypot(h.pos.x - S.x, h.pos.z - S.z) < SRC_LIT_R; }
  srcInteractables(consider, dist) {
    if (!this.srcOpen()) return;
    const S = this.src, h = this.game.hero;
    if (h.steer || h.actT > 0 || this._steer || S.breakT > 0) return;
    consider(dist(S.front.x, S.front.z), 1.9, { kind: 'dx_src', label: 'p_look' });
  }
  srcInteract() {
    const f = this.f, g = this.game;
    this.chain([['hero', f.dx_source ? 'dx_src_after' : g.crystalCount() > 0 ? 'dx_src_look2' : 'dx_src_look']]);
    return true;
  }
  srcSkip() {
    if (this._srcSaid > this.game.time - 4) return;
    this._srcSaid = this.game.time;
    this.chain([['hero', 'dx_src_ball']]);
  }
  srcFork(o) {
    const S = this.src;
    if (!S || this.f.dx_source || !this.srcOpen()) return false;
    if (Math.hypot(S.front.x - o.x, S.front.z - o.z) > o.reach + 0.6) return false;
    this.srcBreak('fork');
    return true;
  }
  srcBreak(how) {
    const S = this.src, f = this.f, g = this.game;
    if (!S || f.dx_source) return;
    f.dx_source = how;
    S.breakT = 0.9; S.cell.visible = true; S.cluster.visible = true;
    g.audio.play('shard'); g.particles.burst(S.front.x, S.front.y, S.front.z, '#e8f4ff', 30, 2.6);
    g.save(false);
  }
  srcUpdate(dt) {
    const S = this.src; if (!S) return;
    const g = this.game, f = this.f, h = g.hero;
    if (S.breakT > 0 || S.pend) {
      S.breakT -= dt;
      const k = 1 - Math.max(0, S.breakT) / 0.9;
      for (const p of S.plates) p.m.position.y = p.y - k * k * (p.y + 0.1);
      if (S.breakT <= 0) {
        // (a line already open — the wheel's, struck by the same note — is read first)
        S.pend = g.state !== 'play'; if (S.pend) return;
        S.breakT = 0; this.setSource();
        this.chain([['hero', 'dx_src_open']], () => { this.giveCrystal('sc-source', S.front.x + 0.5, S.DY + 0.9, S.front.z, 'c3gallery'); g.save(false); });
      }
      return;
    }
    if (f.dx_source || this.here() !== 'c3gallery') return;
    const d = Math.hypot(h.pos.x - S.x, h.pos.z - S.z), near = g.crystalCount() > 0 && d < SRC_HUM_R && this.srcOpen();
    S.seamM.emissiveIntensity = near ? 0.9 + 0.7 * Math.sin(g.time * 5.5) : 0;
    const lit = this.srcOpen() && this.srcLit();
    S.crack.visible = lit;
    if (g.state !== 'play' || g.trans || g.cutscene) return;
    if (near && !f.dx_src_hum) { f.dx_src_hum = true; this.chain([['hero', 'dx_src_hum']]); return; }
    if (lit && !f.dx_src_crack) { f.dx_src_crack = true; this.chain([['hero', 'dx_src_crack']], () => g.save(false)); }
  }

  // ================================================================ ZEE-1: the misrouted heat (Zeelich's street; wave 3, H-6)
  // Old Grumm already says it: up top they wait for heat, down below the burrow's vent breathes warm. His hook (after his
  // own line, chapters 3 to 13) sends Twinsen to Garn, the project's fitter. The clues: a dark post's tag (the street's
  // own look, zeelife.js: seen here as it is read), the capped riser at the foot of the west end's post (Mr Pelleck's:
  // his hand on its pipe, warm) and the burrow's vent (his hand over it, hot). Garn hears him only with both the pipe and
  // the vent seen ("Show me where it's going") and lends his valve spanner; the cap opened (his hands on the valve): the
  // post lights, the vent breathes cool. Grumm pays what the west end chipped in (12 kashes); the spanner goes back to
  // Garn. From the network chapter on the street is being connected anyway: the hook is no longer offered and Grumm, if
  // he asked, says so (nothing lost). Nobody names a culprit: it is "the drawing". What stays: the lit post, the quiet
  // vent, Grumm's and Garn's lines.
  // State: dx_heat_ask, dx_heat_tag, dx_heat_pipe, dx_heat_grate, dx_heat_fen (Garn asked without proof), dx_heat_spanner,
  // dx_heat_open, dx_heat_back (the spanner returned), dx_heat_paid, dx_heat_late; owed kashes dx_owe_heat.
  get ZL() { return this.RG?.built('zeelich')?.life || null; }
  buildHeat(Z) {
    const L = Z.life, post = L?.posts?.find((p) => p.tag === 'pelleck');
    if (!post) return;
    const i = L.posts.indexOf(post), Y0 = 6.0;
    const cap = { x: post.x + HEAT.dx, z: post.z + HEAT.dz };
    const grp = this.holder(Z, cap.x, Y0, cap.z, 0);
    const teal = MAT.flat('#3a8a86', 0.5, { metalness: 0.4 }), iron = MAT.flat('#4a4650', 0.6, { metalness: 0.5 });
    // the riser: a stub of the feed out of fresh cobbles, a flange, the cap with its square valve stem and a tag
    const patch = new THREE.Mesh(cyl(0.42, 0.42, 0.03, 14), MAT.flat('#d8ccc4', 0.9)); patch.position.y = 0.015; grp.add(patch);
    const pipe = new THREE.Mesh(cyl(0.085, 0.085, 0.5, 12), MAT.flat('#c8743a', 0.4, { metalness: 0.6 })); pipe.position.y = 0.25; grp.add(pipe);
    const flange = new THREE.Mesh(cyl(0.15, 0.15, 0.05, 14), iron); flange.position.y = 0.5; grp.add(flange);
    const capM = new THREE.Mesh(cyl(0.13, 0.15, 0.14, 14), teal); capM.position.y = 0.6; grp.add(capM);
    const stem = new THREE.Group(); stem.position.y = 0.68; grp.add(stem);
    const sq = new THREE.Mesh(rbox(0.07, 0.08, 0.07, 0.005), iron); sq.position.y = 0.04; stem.add(sq);
    const bar = new THREE.Mesh(rbox(0.32, 0.03, 0.04, 0.005), MAT.flat('#b02a2a', 0.5)); bar.position.y = 0.07; stem.add(bar);
    const tag = new THREE.Mesh(plane(0.2, 0.1), MAT.map(canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#f4ecd8'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a3ab0'; x.fillRect(0, 0, w, 10); x.fillStyle = '#2a2430'; x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillText('CAPPED', w / 2, 36); x.font = '13px sans-serif'; x.fillText('NEXT QUARTER', w / 2, 55); }), 0.9, { side: THREE.DoubleSide }));
    tag.position.set(0, 0.36, 0.09); grp.add(tag);
    this.game.physics.add({ type: 'cyl', x: cap.x, z: cap.z, r: 0.17, top: Y0 + 0.75, noStand: true, seeThrough: true });
    // the post's crystal lit: the street's warm crystal over its dull one (crystallook.js: the game's one crystal look)
    const warm = crystalMats('warm'), s = 1.3 * 1.04;
    const gem = crystalGem(warm.shell, warm.core, { v: i, hs: 0.225 * s, rr: 0.095 * s });
    const gp = Z.group.position; gem.position.set(post.x - gp.x, Y0 - 0.04 + 1.4 * 1.3 - gp.y, post.z - gp.z); gem.rotation.y = i * 1.7; Z.group.add(gem);
    this.ht = { Z, post, cap, stem, gem, turnT: 0 };
  }
  setHeat() {
    const H = this.ht; if (!H || H.turnT > 0) return;
    const open = !!this.f.dx_heat_open;
    H.gem.visible = open; H.stem.rotation.y = open ? Math.PI / 2 : 0;
  }
  // the hook is offered from chapter 3 until the network chapter (then the street is connected anyway)
  heatWindow() { return this.at('zeelich') && !this.at('network') && this.able(); }
  heatHere() { return !!this.ht && this.here() === 'zeelich'; }
  heatInteractables(consider, dist) {
    if (!this.heatHere() || !this.at('zeelich')) return;
    const H = this.ht, h = this.game.hero, f = this.f;
    if (h.steer || h.actT > 0 || this._steer || H.turnT > 0 || Math.abs(h.pos.y - 6) > 1.2) return;
    const can = this.heatWindow() && f.dx_heat_spanner && !f.dx_heat_open;
    consider(dist(H.cap.x, H.cap.z), 1.35, { kind: 'dx_heatcap', label: can ? 'p_turn' : f.dx_heat_open ? 'p_look' : 'p_feel' });
  }
  heatInteract(it) {
    const g = this.game, f = this.f, H = this.ht, h = g.hero;
    const say = (keys) => { this.chain(keys.map((k) => ['hero', k]), () => g.save(false)); return true; };
    h.angle = Math.atan2(H.cap.x - h.pos.x, H.cap.z - h.pos.z);
    if (f.dx_heat_open) return say(['dx_heat_cap_after']);
    if (this.heatWindow() && f.dx_heat_spanner) {
      // his hands on the valve: a quarter turn, the hiss, the post lights
      h.act('use', 1.2, () => {
        f.dx_heat_open = true; H.turnT = 1.0; g.audio.play('valve'); g.audio.play('steam');
        g.particles.burst(H.cap.x, 6.7, H.cap.z, '#f4f0ea', 16, 1.4);
        g.save(false);
      }, 0.5);
      return true;
    }
    // (out of the window: only what he sees)
    if (!this.heatWindow()) return say(['dx_heat_cap_look']);
    h.act('use', 0.7, () => { const first = !f.dx_heat_pipe; f.dx_heat_pipe = true; say(first ? ['dx_heat_cap_look', 'dx_heat_cap_warm'] : ['dx_heat_cap_warm']); }, 0.35);
    return true;
  }
  // the burrow's vent: his hand over it (in the window, until the cap is open); otherwise the street's own look
  heatVent() {
    const g = this.game, f = this.f, h = g.hero, v = this.ZL?.burrow?.vent;
    if (!v || !this.heatWindow() || f.dx_heat_open) return false;
    h.angle = Math.atan2(v.x - h.pos.x, v.z - h.pos.z);
    h.act('use', 0.7, () => { f.dx_heat_grate = true; this.chain([['hero', 'dx_heat_vent']], () => g.save(false)); }, 0.35);
    return true;
  }
  heatUpdate(dt) {
    const H = this.ht; if (!H) return;
    const g = this.game, f = this.f;
    if (H.turnT > 0) {
      H.turnT -= dt;
      const k = 1 - Math.max(0, H.turnT) / 1.0;
      H.stem.rotation.y = k * Math.PI / 2;
      if (H.turnT <= 0) { H.gem.visible = true; g.audio.play('bonus'); this.chain([['hero', 'dx_heat_open']], () => g.save(false)); }
    }
    // the vent breathes cool once the feed goes where it was laid (the street's puff, zeelife.js, held off)
    if (f.dx_heat_open && this.story.zlife) this.story.zlife.ventT = Math.max(this.story.zlife.ventT || 0, 0.5);
    if (f.dx_heat_open && H.gem.visible && this.here() === 'zeelich') H.gem.rotation.y += dt * 0.2;
  }
  // Garn (the fitter on his round), Old Grumm (the burrow), Mr Pelleck (his post)
  garnTalk(npc) {
    const f = this.f, g = this.game;
    if (this.here() !== 'zeelich' || !this.able()) return false;
    if (f.dx_heat_spanner && !f.dx_heat_back && (f.dx_heat_open || !this.heatWindow())) return this.after(npc, [f.dx_heat_open ? 'dx_heat_fen_back' : 'dx_heat_fen_back2'], () => { f.dx_heat_back = true; g.save(false); });
    if (!this.heatWindow() || f.dx_heat_open || f.dx_heat_spanner) return false;
    if (f.dx_heat_pipe && f.dx_heat_grate) return this.after(npc, ['dx_heat_fen_1', 'dx_heat_fen_2', 'dx_heat_fen_lend'], () => { f.dx_heat_spanner = true; f.dx_heat_ask = true; g.found('spanner', 'it_spanner', () => g.save(false), { icon: 'pliers' }); });
    if ((f.dx_heat_ask || f.dx_heat_pipe || f.dx_heat_grate) && !f.dx_heat_fen) return this.after(npc, ['dx_heat_fen_show'], () => { f.dx_heat_fen = true; g.save(false); });
    return false;
  }
  grummTalk(npc) {
    const f = this.f, g = this.game;
    if (this.here() !== 'zeelich' || !this.able() || !this.at('zeelich')) return false;
    if (f.dx_heat_open && !f.dx_heat_paid) {
      npc.talking = true;
      this.chain([['zmole1', 'dx_heat_grumm_thx'], ['zmole1', 'dx_heat_grumm_pay']], () => {
        npc.talking = false; f.dx_heat_paid = true;
        this.reward('dx_owe_heat', 'coin', 1, npc.pos.x, npc.pos.y + 1.2, npc.pos.z, { pop: true, value: HEAT.pay });
        g.save(false);
      });
      return true;
    }
    if (this.heatWindow() && !f.dx_heat_ask && !f.dx_heat_open) return this.after(npc, ['dx_heat_grumm_1', 'dx_heat_grumm_2'], () => { f.dx_heat_ask = true; g.save(false); });
    if (!this.heatWindow() && this.at('network') && f.dx_heat_ask && !f.dx_heat_open && !f.dx_heat_late) return this.after(npc, ['dx_heat_grumm_late'], () => { f.dx_heat_late = true; g.save(false); });
    return false;
  }

  // ================================================================ ZEE-2: the project stores (Zeelich's depot; wave 3, H-6)
  // The teal shed in the project's depot yard (zeelich.js: PROJECT STORES, STAFF ONLY) gets its motor shutter: a roller
  // curtain over the door, held down by a motor on the wall (its lamp lit, it hums). From the network chapter on Twinsen
  // carries Baldino's pulse tool, which stalls machinery: the pulse at the motor stalls it, its brake lets go and the
  // shutter rolls up on its spring. Inside (a look-in store, the door's depth): a ledger on a crate (heat cells and
  // connection kits, every line RESERVED: UPPER DISTRICTS), and a radiator kit marked PELLECK, WEST END. The kit goes to
  // Mr Pelleck: 15 kashes and his receipt; the ledger stays in the journal. Before the pulse tool the shutter's look says
  // what holds it. What stays: the shutter up, the store empty of his kit, Pelleck's line.
  // State: dx_store_seen, dx_store_open, dx_store_ledger, dx_store_kit, dx_store_given (the chapter + 1), dx_store_later;
  // owed kashes dx_owe_store.
  buildStore(Z) {
    const gp = Z.group.position, Y0 = 6.0;
    const w = { x: gp.x + STORE.x, z: gp.z + STORE.z };
    const grp = this.holder(Z, w.x, Y0, w.z, Math.PI);   // (local +z out of the wall, toward the yard)
    const steel = MAT.flat('#9ab4b4', 0.45, { metalness: 0.5 }), dark = MAT.flat('#3a4a4c', 0.6, { metalness: 0.4 });
    // the housing over the door and its plate, the two rails
    const box = new THREE.Mesh(rbox(1.5, 0.36, 0.3, 0.03), steel); box.position.set(0, 2.6, 0.15); box.castShadow = true; grp.add(box);
    const plate = new THREE.Mesh(plane(1.1, 0.16), MAT.map(canvasTex(256, 40, (x, W, H) => { x.fillStyle = '#e8dcd0'; x.fillRect(0, 0, W, H); x.fillStyle = '#7a3ab0'; x.fillRect(0, 0, 8, H); x.fillRect(W - 8, 0, 8, H); x.fillStyle = '#2a2430'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('PROJECT STORES', W / 2, H / 2 + 1); }), 0.8));
    plate.position.set(0, 2.6, 0.305); grp.add(plate);
    for (const sx of [-0.63, 0.63]) { const r = new THREE.Mesh(rbox(0.07, 2.36, 0.1, 0.01), dark); r.position.set(sx, 1.27, 0.09); grp.add(r); }
    // the backdrop behind the curtain: the store inside (two paintings: the kit on its shelf, then without it)
    const inside = (kit) => canvasTex(128, 256, (x, W, H) => {
      const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1c1a20'); gr.addColorStop(1, '#2c2620'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,214,150,0.18)'; x.beginPath(); x.ellipse(W * 0.5, 30, 50, 34, 0, 0, 7); x.fill();
      x.fillStyle = '#f6d89a'; x.fillRect(W * 0.5 - 5, 22, 10, 8);
      for (const y of [70, 128, 186]) { x.fillStyle = '#5a4a38'; x.fillRect(4, y, W - 8, 6); }
      for (const [cx, y, cw, ch, c] of [[8, 46, 30, 24, '#8a6a42'], [44, 50, 22, 20, '#3a8a86'], [80, 44, 40, 26, '#8a6a42'], [8, 104, 40, 24, '#3a8a86'], [56, 108, 26, 20, '#8a6a42'], [90, 100, 30, 28, '#7a5a3a'], [10, 162, 26, 24, '#8a6a42'], [44, 166, 34, 20, '#3a8a86'], [86, 160, 32, 26, '#8a6a42']]) { x.fillStyle = c; x.fillRect(cx, y, cw, ch); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(cx, y + ch - 4, cw, 4); }
      if (kit) { x.fillStyle = '#c8a050'; x.fillRect(52, 140, 34, 20); x.fillStyle = '#2a2430'; x.font = 'bold 9px sans-serif'; x.fillText('PELLECK', 53, 153); }
      x.fillStyle = '#6a5038'; x.fillRect(20, 214, 70, 34); x.fillStyle = '#efe6d0'; x.fillRect(30, 208, 44, 10); x.fillStyle = '#7a3ab0'; x.fillRect(30, 208, 3, 10);
    });
    const backM = [inside(true), inside(false)].map((tx) => new THREE.MeshBasicMaterial({ map: tx, color: '#b8b0a8' }));
    const back = new THREE.Mesh(plane(1.1, 2.08), backM[0]); back.position.set(0, 1.33, 0.06); back.visible = false; grp.add(back);
    // the curtain: ribbed slats hung from the housing's roller (scaled up into it as it rolls)
    const roll = new THREE.Group(); roll.position.set(0, 2.44, 0.1); grp.add(roll);
    const slatTex = canvasTex(64, 128, (x, W, H) => { x.fillStyle = '#a8c0c0'; x.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) { x.fillStyle = '#7a9494'; x.fillRect(0, y, W, 2); x.fillStyle = '#c8dcdc'; x.fillRect(0, y + 2, W, 1); } });
    slatTex.wrapT = THREE.RepeatWrapping; slatTex.repeat.set(1, 2);
    const curtain = new THREE.Mesh(rbox(1.2, 2.16, 0.04, 0.005), MAT.map(slatTex, 0.5, { metalness: 0.4 })); curtain.position.y = -1.08; roll.add(curtain);
    const lipM = new THREE.Mesh(rbox(1.22, 0.06, 0.06, 0.01), dark); lipM.position.y = -2.15; roll.add(lipM);
    // the motor on the wall beside the door: a box, a cable to the housing, a lamp (lit while it holds)
    const motor = new THREE.Group(); motor.position.set(-0.98, 1.55, 0.14); grp.add(motor);
    const mb = new THREE.Mesh(rbox(0.34, 0.42, 0.26, 0.03), MAT.flat('#3a8a86', 0.5, { metalness: 0.45 })); motor.add(mb);
    const fins = new THREE.Mesh(rbox(0.3, 0.06, 0.27, 0.01), dark); fins.position.y = 0.14; motor.add(fins);
    const lampM = new THREE.MeshStandardMaterial({ color: '#203020', emissive: '#40ff60', emissiveIntensity: 1.4, roughness: 0.4 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), lampM); lamp.position.set(0, -0.08, 0.14); motor.add(lamp);
    const cable = new THREE.Mesh(cyl(0.02, 0.02, 0.9, 6), dark); cable.position.set(-0.98, 2.2, 0.1); grp.add(cable);
    const v = new THREE.Vector3(); Z.group.updateMatrixWorld(true); motor.getWorldPosition(v);
    this.st = { Z, grp, roll, back, backM, lampM, motor: { x: v.x, y: v.y, z: v.z }, front: { x: w.x, z: w.z - STORE.reach }, rollT: 0 };
  }
  setStore() {
    const S = this.st; if (!S || S.rollT > 0) return;
    const f = this.f, open = !!f.dx_store_open;
    S.roll.scale.y = open ? 0.06 : 1; S.back.visible = open;
    S.back.material = S.backM[f.dx_store_kit ? 1 : 0];
    S.lampM.emissive.set(open ? '#ff9a30' : '#40ff60'); S.lampM.emissiveIntensity = open ? 0.25 : 1.4;
  }
  hasPulse() { const f = this.f; return !!this.game.hero.hasPulse || !!f.c10_pulse || this.story.index > this.idx('network'); }
  storeHere() { return !!this.st && this.here() === 'zeelich' && this.at('zeelich') && this.able(); }
  storeInteractables(consider, dist) {
    if (!this.storeHere()) return;
    const S = this.st, h = this.game.hero, f = this.f;
    if (h.steer || h.actT > 0 || this._steer || S.rollT > 0 || Math.abs(h.pos.y - 6) > 1.2) return;
    consider(dist(S.front.x, S.front.z), 1.7, { kind: 'dx_store', label: f.dx_store_open && !f.dx_store_kit ? 'p_search' : 'p_look' });
  }
  storeInteract() {
    const g = this.game, f = this.f, S = this.st, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), () => { done?.(); g.save(false); }); return true; };
    if (!f.dx_store_open) { f.dx_store_seen = true; return say(['dx_store_shut', ...(this.hasPulse() && this.at('network') ? ['dx_store_pulse'] : [])]); }
    if (f.dx_store_kit) return say(['dx_store_after']);
    h.angle = Math.atan2(S.front.x - h.pos.x, (S.front.z + STORE.reach) - h.pos.z);
    // the ledger read, then his hand in for the kit with the name on it
    return say(['dx_store_ledger1', 'dx_store_ledger2', 'dx_store_ledger3'], () => {
      f.dx_store_ledger = true;
      h.act('pickup', 0.9, () => { f.dx_store_kit = true; this.setStore(); g.audio.play('chest'); g.found('radkit', 'it_radkit', () => { this.chain([['hero', 'dx_store_kit']], () => g.save(false)); }, { icon: 'parcel' }); }, 0.45);
    });
  }
  // the pulse tool fired at the motor (combat.js firePulse → index.js pulseHit): it stalls, the shutter rolls up
  storePulse(o) {
    const S = this.st, f = this.f;
    if (!S || f.dx_store_open || !this.storeHere() || !this.at('network')) return false;
    const dx = S.motor.x - o.x, dz = S.motor.z - o.z, d = Math.hypot(dx, dz);
    if (d > o.range + 1.0 || (d > 0.5 && (dx * o.fx + dz * o.fz) / d < Math.cos(o.cone + 0.3))) return false;
    const g = this.game;
    f.dx_store_open = true; f.dx_store_seen = true; S.rollT = 1.4;
    S.lampM.emissive.set('#ff9a30'); S.lampM.emissiveIntensity = 0.25; S.back.visible = true; S.back.material = S.backM[f.dx_store_kit ? 1 : 0];
    g.audio.play('rumble'); g.particles.burst(S.motor.x, S.motor.y, S.motor.z, '#9fe8ff', 14, 2);
    g.save(false);
    return true;
  }
  storeUpdate(dt) {
    const S = this.st; if (!S || !(S.rollT > 0)) return;
    S.rollT -= dt;
    const k = 1 - Math.max(0, S.rollT) / 1.4, e = k * k * (3 - 2 * k);
    S.roll.scale.y = 1 - 0.94 * e;
    if (S.rollT <= 0) { this.setStore(); this.chain([['hero', 'dx_store_open']], () => this.game.save(false)); }
  }
  pelleckTalk(npc) {
    const f = this.f, g = this.game;
    if (this.here() !== 'zeelich' || !this.able()) return false;
    if (f.dx_store_kit && !f.dx_store_given) {
      npc.talking = true;
      this.chain([['hero', 'dx_store_tw'], ['ztri1', 'dx_store_pel1'], ['ztri1', 'dx_store_pel2'], ...(f.dx_heat_open ? [['ztri1', 'dx_store_pel_post']] : []), ['ztri1', 'dx_store_pel3']], () => {
        npc.talking = false; f.dx_store_given = this.story.index + 1;
        this.reward('dx_owe_store', 'coin', 1, npc.pos.x, npc.pos.y + 1.2, npc.pos.z, { pop: true, value: STORE.pay });
        g.save(false);
      });
      return true;
    }
    if (f.dx_store_given && !f.dx_store_later && this.story.index + 1 > f.dx_store_given) return this.after(npc, ['dx_store_pel_later'], () => { f.dx_store_later = true; g.save(false); });
    if (f.dx_heat_open && !f.dx_heat_pel && !f.dx_store_given) return this.after(npc, ['dx_heat_pel'], () => { f.dx_heat_pel = true; g.save(false); });
    return false;
  }

  // ================================================================ HAM-2: Pim's kite and the goats' way (wave 3, H-7)
  // Pim swapped his kite for the fuse in chapter 6 and got it back off the icefall in pieces: his hook (after his own
  // line, from the fuse on) is the torn kite, which Twinsen carries to Lumi, Kesh's weaver, on Desert Island. If Kesh's
  // wind-catcher is mended (k_done) she mends it at once; if not, she names that job first and the kite waits with her
  // (mended once the wind-catcher is done, or by the next chapter). Back to Pim: the kite flies, and once the
  // observatory's drone is down (chapter 7 done) he tells of the goats' way: rock ledges by Lhar's icefall, a rope he
  // ties at the top for Twinsen; Twinsen ties the bottom to the iron ring on the top ledge (his hands on rope and ring).
  // The ledges are there from the start (goat tracks, a dead end without the rope); the rope makes the climb: up to the
  // high rock, which leads to the ridge's upper end by the observatory, past the stretch the lift, the monastery and
  // the ridge's middle take. Down the same way (the stake at the top). What stays: the rope and the way, Pim's line.
  // State: dx_kite ('torn' carried · 'left' with Lumi · 'mended' carried · 'given'), dx_kite_left (the chapter + 1 it was
  // left in), dx_kite_lumi (her first word said), dx_kite_flew, dx_goatpath, dx_goat_tied, dx_goat_up, dx_goat_thx,
  // dx_goat_ring (the ring looked at without a rope).
  buildGoat(M) {
    const g = this.game, P = g.physics, T = P.terrain, o = { x: M.group.position.x, z: M.group.position.z };
    const W = (x, z) => ({ x: o.x + x, z: o.z + z });
    const grp = this.holder(M, o.x, 0, o.z, 0);
    const rockM = MM.stone('#cfc6b8').clone(); rockM.userData = { ...rockM.userData, rockSet: true }; delete rockM.userData.vcKey;
    const snowM = MAT.flat('#f4f8fc', 0.9);
    const geo = new THREE.IcosahedronGeometry(1, 1), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), n = 1 + 0.1 * Math.sin(x * 5 + z * 3) * Math.cos(y * 4); pa.setXYZ(i, x * n, Math.min(y, 0.55) * n, z * n); }
    geo.computeVertexNormals();
    const ledges = [];
    // (each ledge set against the face: its middle r × 0.85 out from where the rock rises past its top)
    const faceZ = (wx, y) => { for (let z = o.z + GOAT.z0; z > o.z + GOAT.z0 - 8; z -= 0.05) if (T.heightAt(wx, z) > y) return z; return o.z + GOAT.z0 - 8; };
    GOAT.ledges.forEach(([lx, top, r], i) => {
      const lz = faceZ(o.x + lx, top - 0.3) + r * GOAT.out - o.z, p = W(lx, lz);
      const m = new THREE.Mesh(geo, rockM); m.scale.set(r * 1.15, 1.25, r * 1.05); m.position.set(lx, top - 0.55 * 1.25, lz); m.rotation.y = i * 1.3; m.castShadow = true; m.receiveShadow = true; grp.add(m);
      // (a skirt down to the ground under it, so the step reads as rock grown out of the face, not floating)
      const foot = T.heightAt(p.x, p.z), hgt = top - 1.2 - foot;
      if (hgt > 0.2) { const sk = new THREE.Mesh(geo, rockM); sk.scale.set(r * 0.9, hgt * 0.9, r * 0.85); sk.position.set(lx + 0.05, foot + hgt * 0.45, lz - 0.1); sk.rotation.y = i * 2.1; grp.add(sk); }
      const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 12), snowM); cap.rotation.x = -Math.PI / 2; cap.position.set(lx, top + 0.012, lz); grp.add(cap);
      P.add({ type: 'cyl', x: p.x, z: p.z, r: r * 0.9, top, bottom: top - 0.9 });
      ledges.push({ ...p, y: top, r });
    });
    const B = ledges[ledges.length - 1];
    // the iron ring in the top ledge, by the face
    const RG = [B.x - o.x + 0.15, B.z - o.z - B.r * 0.5], ringAt = W(RG[0], RG[1]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 14), MAT.flat('#3a3640', 0.5, { metalness: 0.6 })); ring.position.set(RG[0], B.y + 0.1, RG[1]); ring.rotation.y = 0.3; grp.add(ring);
    const pin = new THREE.Mesh(cyl(0.025, 0.025, 0.14, 6), MAT.flat('#3a3640', 0.5, { metalness: 0.6 })); pin.position.set(RG[0], B.y + 0.03, RG[1]); grp.add(pin);
    // the climb: from the top ledge, up the face (kept 0.4 m off it), over the lip to the high rock
    const x = B.x, face = (y) => { for (let z = B.z; z > o.z + GOAT.top; z -= 0.05) if (T.heightAt(x, z) > y) return z + 0.4; return o.z + GOAT.top + 0.4; };
    const lipX = B.x, lipZ = o.z + GOAT.top, lipY = P.groundAt(lipX, lipZ, 60);
    const pts = [{ x, y: B.y, z: B.z - 0.25 }];
    for (let y = B.y + 0.3; y < lipY - 0.2; y += 0.8) pts.push({ x, y, z: Math.min(B.z - 0.3, face(Math.min(y + 0.9, lipY - 0.25))) });
    pts.push({ x, y: lipY + 0.15, z: face(lipY - 0.3) }, { x: lipX, y: lipY, z: lipZ });
    // the stake at the top, the rope (shown once Pim has tied it: from the stake down the face to the ledge)
    const top = { x: lipX, z: lipZ, y: lipY };
    const stake = new THREE.Mesh(cyl(0.06, 0.08, 0.8, 8), MAT.wood('dark')); stake.position.set(lipX - o.x + 0.5, lipY + 0.3, lipZ - o.z - 0.4); grp.add(stake);
    const ropeM = MAT.flat('#c8b890', 0.9);
    const ropeAt = (tied) => {
      const c = [new THREE.Vector3(lipX - o.x + 0.5, lipY + 0.55, lipZ - o.z - 0.4), ...pts.slice(1, -1).reverse().map((p) => new THREE.Vector3(p.x - o.x, p.y + 1.0, p.z - o.z - 0.28)), new THREE.Vector3(RG[0] + (tied ? 0 : 0.4), B.y + (tied ? 0.12 : 0.05), RG[1] + (tied ? 0 : 0.3))];
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c), 40, 0.025, 5), ropeM); m.castShadow = true; return m;
    };
    const rope = [ropeAt(false), ropeAt(true)]; for (const r of rope) { r.visible = false; grp.add(r); }
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 14), ropeM); coil.rotation.x = Math.PI / 2; coil.position.set(RG[0] + 0.4, B.y + 0.05, RG[1] + 0.3); coil.visible = false; grp.add(coil);
    this.gt = { M, ledges, B, ring: ringAt, pts, top, rope, coil, stakeAt: { x: lipX + 0.5, z: lipZ - 0.4 } };
  }
  setGoat() {
    const G = this.gt; if (!G) return;
    const f = this.f, on = !!f.dx_goatpath;
    G.rope[0].visible = on && !f.dx_goat_tied; G.rope[1].visible = on && !!f.dx_goat_tied; G.coil.visible = on && !f.dx_goat_tied;
  }
  // the goats' way is open once Pim has told it and the drone on the peak is down (chapter 7 done)
  droneDown() { return !!this.f.c7_done || this.story.index > this.idx('observatory'); }
  goatInteractables(consider, dist) {
    const G = this.gt; if (!G || this.here() !== 'hamalayi' || !this.at('pass') || !this.able()) return;
    const h = this.game.hero, f = this.f;
    if (h.steer || h.actT > 0 || this._steer || this.climb) return;
    if (Math.abs(h.pos.y - G.B.y) < 0.5) consider(dist(G.ring.x, G.ring.z), 1.4, { kind: 'dx_goatring', label: f.dx_goatpath ? f.dx_goat_tied ? 'p_dx_climb' : 'p_dx_tie' : 'p_look' });
    if (f.dx_goat_tied && Math.abs(h.pos.y - G.top.y) < 0.8) consider(dist(G.stakeAt.x, G.stakeAt.z), 1.5, { kind: 'dx_goatdown', label: 'p_dx_down' });
  }
  goatInteract(it) {
    const g = this.game, f = this.f, G = this.gt, h = g.hero;
    if (it.kind === 'dx_goatdown') { this.startClimb(-1); return true; }
    if (!f.dx_goatpath) { f.dx_goat_ring = true; this.chain([['hero', 'dx_goat_ring']], () => g.save(false)); return true; }
    if (!f.dx_goat_tied) {
      h.angle = Math.atan2(G.ring.x - h.pos.x, G.ring.z - h.pos.z);
      h.act('pickup', 1.1, () => { f.dx_goat_tied = true; this.setGoat(); g.audio.play('chest'); this.chain([['hero', 'dx_goat_tie']], () => g.save(false)); }, 0.5);
      return true;
    }
    this.startClimb(1);
    return true;
  }
  // up (dir 1) or down (dir -1) the rope: the body held by the story (Game.heroHold) while it moves along the climb
  startClimb(dir) {
    const g = this.game, G = this.gt, h = g.hero;
    const pts = dir > 0 ? G.pts : [...G.pts].reverse();
    let L = 0; const segs = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); segs.push({ a, b, l, at: L }); L += l; }
    this.climb = { segs, L, d: 0, dir };
    h.pos.set(pts[0].x, pts[0].y, pts[0].z); h.vel?.set(0, 0); h.vy = 0;
    g.audio.play('ropeCreak');
    const fn = (dt) => {
      const C = this.climb;
      if (!C || g.room?.id !== 'hamalayi') { if (g.heroHold === fn) g.heroHold = null; this.climb = null; return false; }
      C.d = Math.min(C.L, C.d + dt * GOAT.speed);
      const s = C.segs.find((q) => C.d <= q.at + q.l) || C.segs[C.segs.length - 1], k = s.l > 0 ? (C.d - s.at) / s.l : 1;
      h.prevPos?.copy(h.pos);
      h.pos.set(s.a.x + (s.b.x - s.a.x) * k, s.a.y + (s.b.y - s.a.y) * k, s.a.z + (s.b.z - s.a.z) * k);
      h.angle = Math.PI; h.vel?.set(0, 0); h.vy = 0; h.onGround = false;
      h.rig.play('reachHigh'); h.rig.update(dt, 0); h.sync();
      if (C.d >= C.L) {
        g.heroHold = null; this.climb = null;
        const end = C.segs[C.segs.length - 1].b; h.pos.set(end.x, g.physics.groundAt(end.x, end.z, end.y + 0.6), end.z); h.onGround = true; h.vy = 0;
        if (C.dir > 0 && !this.f.dx_goat_up) { this.f.dx_goat_up = true; this.chain([['hero', 'dx_goat_up']], () => g.save(false)); }
        else g.save(false);
      }
      return true;
    };
    g.heroHold = fn;
  }
  pimTalk(npc) {
    const f = this.f, g = this.game, key = this.story.cur?.key;
    if (!this.able() || key === 'network' || !(f.c6_fuse || this.story.index > this.idx('pass'))) return false;
    const k = f.dx_kite;
    if (!k) return this.after(npc, ['dx_kite_pim1', 'dx_kite_pim2', 'dx_kite_pim3'], () => { f.dx_kite = 'torn'; g.found('kite', 'it_kite_torn', () => g.save(false), { icon: 'cloth' }); });
    if (k === 'mended') {
      npc.talking = true;
      const open = this.droneDown();
      this.chain([['hero', 'dx_kite_tw'], ['pim', 'dx_kite_pim_fly'], ...(open ? [['pim', 'dx_goat_pim1'], ['pim', 'dx_goat_pim2']] : [['pim', 'dx_goat_pim_drone']])], () => {
        npc.talking = false; f.dx_kite = 'given'; f.dx_kite_flew = true; if (open) { f.dx_goatpath = true; this.setGoat(); }
        g.save(false);
      });
      return true;
    }
    if (k === 'given' && !f.dx_goatpath && this.droneDown()) return this.after(npc, ['dx_goat_pim1', 'dx_goat_pim2'], () => { f.dx_goatpath = true; this.setGoat(); g.save(false); });
    if (f.dx_goat_up && !f.dx_goat_thx) return this.after(npc, ['dx_goat_pim_thx'], () => { f.dx_goat_thx = true; g.save(false); });
    if ((k === 'torn' || k === 'left') && (npc._dxK = (npc._dxK ?? -1) + 1) % 2 === 0) return this.say1(npc, 'dx_kite_pim_wait');
    return false;
  }
  lumiTalk(npc) {
    const f = this.f, g = this.game, k = f.dx_kite;
    if (!this.able() || this.here() !== 'desert' || (k !== 'torn' && k !== 'left')) return false;
    const mend = () => { f.dx_kite = 'mended'; g.found('kite', 'it_kite', () => g.save(false), { icon: 'cloth' }); };
    if (k === 'torn') {
      if (f.k_done) return this.after(npc, ['dx_kite_lumi_now', 'dx_kite_lumi_done'], mend);
      return this.after(npc, ['dx_kite_lumi_busy'], () => { f.dx_kite = 'left'; f.dx_kite_left = this.story.index + 1; g.save(false); });
    }
    if (f.k_done || this.story.index + 1 > (f.dx_kite_left || 0)) return this.after(npc, ['dx_kite_lumi_done'], mend);
    return this.after(npc, ['dx_kite_lumi_wait']);
  }

  // ================================================================ ISL-3 + HAM-4: the Esmer line's rings (wave 3, H-8)
  // The line's rule since its lesson on Zeelich's cloud canal (kit2b.js): a cord ring in reach reels him along a route
  // checked clear before he leaves. Four places it reopens, each with a ring for the way back:
  //   ISL-3 · the three doors across the clouds (ihomes.js FAR: the near shore's look said "no way over on foot"): Otringal's
  //     barges' yard (the cargo store) and west quay (a dock worker's house), each over an old mooring rock in the cloud
  //     with an Esmer arch (shore davit → rock → the far davit, and back the same way). Mosquibee's honey islet is walked
  //     to over its plank bridge (BRIDGES: no ring there; its arrival is seen on foot, farUpdate). What is over there: the yard's
  //     barge crate (the project's leftover optics: a read, 15 kashes), the dock worker's locker (his note, 15 kashes), the
  //     hive's honey pot (a full heal on each visit). The rooms behind the doors were always there (ihomes.js).
  //   HAM-4 · the gorge below the old gate: an ice arch from a rock stack in the meltwater to the north bank, a cord ring
  //     frozen into its crown (from the tree bridge or the bank: onto the stack) and one in its foot (back to the bank). On
  //     the stack the road crew's tool chest: a clover, 12 kashes and their note.
  // A ring is offered only with the line in hand, from the place it serves (near shore, rock, far patch). State:
  // dx_far_yard / dx_far_quay / dx_far_honey (crossed), dx_far_crate, dx_far_locker, dx_far_honeyN (pots taken),
  // dx_arch_seen, dx_arch (crossed), dx_arch_chest; owed dx_owe_far_yard (kashes), dx_owe_far_quay (kashes),
  // dx_owe_arch (kashes), dx_owe_arch_clover.
  hasLine() { return !!this.game.hero.arms?.line && this.able(); }
  // a ring the line can catch: hung from a davit (a post and an arm over the gap) or an Esmer arch; its route from where
  // he stands to `to` (up first, over, down: clear of railings at either edge)
  ringTarget(id, ring, to, arrived) {
    return { kind: 'ring', id: 'dx_' + id, x: ring.x, y: ring.y, z: ring.z, arrived,
      route: (from) => {
        const P = this.game.physics, dx = to.x - from.x, dz = to.z - from.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
        // (over whatever stands between: the highest ground or roof along the way, not counting the two ends)
        let hi = -Infinity; for (let s = 0.9; s < L - 0.9; s += 0.4) { const y = P.groundAt(from.x + ux * s, from.z + uz * s, 60); if (Number.isFinite(y)) hi = Math.max(hi, y); }
        const top = Math.max(from.y, to.y, hi + 0.2) + 1.5;
        return [{ x: from.x + ux * 0.05, y: from.y + 1.6, z: from.z + uz * 0.05 }, { x: from.x + ux * Math.min(2.2, L * 0.3), y: top, z: from.z + uz * Math.min(2.2, L * 0.3) }, { x: to.x - ux * Math.min(2.2, L * 0.3), y: top, z: to.z - uz * Math.min(2.2, L * 0.3) }, { x: to.x, y: to.y + 1.2, z: to.z }, { x: to.x, y: to.y, z: to.z }];
      } };
  }
  buildDavit(k, at, toward, y, color, tall = 0) {
    // a post 2.9 m tall, an arm 1.1 m toward the gap, the brass ring hanging from it (above his head as he leaves)
    const a = Math.atan2(toward.x - at.x, toward.z - at.z), ux = Math.sin(a), uz = Math.cos(a);
    const post = MAT.wood('dark'), brass = MAT.brass();
    const H = 2.9 + tall, sink = 0.2;   // (its foot set 20 cm into the ground: a slope under it never shows a gap)
    k.add(cyl(0.08, 0.1, H + sink, 8), post, at.x, y + (H - sink) / 2, at.z);
    k.add(cyl(0.11, 0.11, 0.08, 8), color ? MAT.flat(color, 0.6) : brass, at.x, y + H + 0.02, at.z);
    k.add(cyl(0.045, 0.045, 1.15, 6), post, at.x + ux * 0.55, y + H - 0.08, at.z + uz * 0.55, a, { rx: Math.PI / 2 });
    k.add(cyl(0.012, 0.012, 0.22, 5), brass, at.x + ux * 1.1, y + H - 0.2, at.z + uz * 1.1);
    k.add(torus(0.17, 0.028, 6, 18), brass, at.x + ux * 1.1, y + H - 0.48, at.z + uz * 1.1, a);
    this.game.physics.add({ type: 'cyl', x: at.x, z: at.z, r: 0.12, top: y + H + 0.05, noStand: true, seeThrough: true });
    return { x: at.x + ux * 1.1, y: y + H - 0.48, z: at.z + uz * 1.1 };
  }
  buildFar(room, def) {
    const g = this.game, P = g.physics, R = this.game.rooms[room];
    const root = new THREE.Group(), gp = R.group.position; root.position.set(-gp.x, -gp.y, -gp.z); R.group.add(root);
    const k = new Kit(root);
    const gy = (p) => P.groundAt(p.x, p.z, p.top ?? 60);
    const N = { ...def.near, y: gy(def.near) }, F = { ...def.far, y: gy(def.far) };
    const C = { id: def.id, room, N, F, def };
    const mid = def.rock;
    if (!def.walk) {
      C.nRing = this.buildDavit(k, def.nPost, mid || F, gy(def.nPost), def.color);
      C.fRing = this.buildDavit(k, def.fPost, mid || N, gy(def.fPost), def.color, def.fTall || 0);
    }
    if (mid) {
      // an old mooring rock in the cloud, its paved deck and an Esmer arch over it (as the cloud canal's: kit2b.js)
      const M = { ...mid, y: def.rock.y }, face = Math.atan2(F.x - N.x, F.z - N.z), dx = Math.sin(face), dz = Math.cos(face);
      const rockM = MAT.flat('#d8c0d8', 0.92, { vertexColors: true });
      const white = MAT.flat('#f2ece6', 0.8), lilac = MAT.flat(def.color || '#9a7ab8', 0.55), brass = MAT.brass();
      k.add(rockGeometry(def.seed || 31), rockM, M.x, M.y - 0.75, M.z, face, { sx: 1.9, sy: 1.5, sz: 1.9 });
      const deckM = MAT.stone('grey', 1).clone(); deckM.userData = { ...deckM.userData, rockSet: true }; delete deckM.userData.vcKey;   // (the deck laid into its rock: marked, overlap-sweep (g))
      k.add(cyl(1.55, 1.6, 0.18, 18), deckM, M.x, M.y - 0.09, M.z);
      P.add({ type: 'cyl', x: M.x, z: M.z, r: 1.55, top: M.y });
      // the arch across the way, its ring over the deck's middle (above his head)
      const al = 0, ph = 2.8 + al;
      for (const s of [-1.05, 1.05]) { const x = M.x + dz * s, z = M.z - dx * s; k.add(cyl(0.07, 0.09, ph, 8), lilac, x, M.y + ph / 2, z); k.add(sphere(0.1, 10, 8), brass, x, M.y + ph + 0.08, z); P.add({ type: 'cyl', x, z, r: 0.1, top: M.y + ph + 0.1, noStand: true, seeThrough: true }); }
      k.add(rbox(2.3, 0.16, 0.2, 0.04), white, M.x, M.y + 2.75 + al, M.z, face + Math.PI / 2);
      k.add(cyl(0.012, 0.012, 0.2, 5), brass, M.x, M.y + 2.58 + al, M.z);
      k.add(torus(0.17, 0.028, 6, 18), brass, M.x, M.y + 2.32 + al, M.z, face);
      C.M = M; C.mRing = { x: M.x, y: M.y + 2.32 + al, z: M.z };
    }
    // what waits on the far side: a crate, a locker, a honey pot (by the far davit)
    const at = def.thing, ty = gy(at), tg = new THREE.Group(); tg.position.set(at.x - gp.x, ty - gp.y, at.z - gp.z); tg.rotation.y = def.thingRy || 0; R.group.add(tg);
    const tk = new Kit(tg);
    if (def.kind === 'crate') { crate(tk, 0.6, { pal: 'dark' }); tk.add(rbox(0.4, 0.02, 0.26, 0.01), MAT.flat('#f2e8cc', 0.9), 0.0, 0.62, 0.05); }
    else if (def.kind === 'locker') { tk.add(rbox(0.6, 1.2, 0.4, 0.03), MAT.flat('#3a6a7a', 0.6, { metalness: 0.3 }), 0, 0.6, 0); tk.add(rbox(0.22, 0.16, 0.01, 0.005), MAT.flat('#f2e8cc', 0.9), 0.05, 0.9, 0.205); tk.add(cyl(0.03, 0.03, 0.05, 8), MAT.brass(), -0.2, 0.62, 0.21, 0, { rx: Math.PI / 2 }); }
    else { tk.add(cyl(0.3, 0.35, 0.7, 10), MAT.wood('dark'), 0, 0.35, 0); tk.add(cyl(0.2, 0.24, 0.34, 12), MAT.flat('#e8a830', 0.35), 0, 0.88, 0); tk.add(cyl(0.21, 0.21, 0.05, 12), MAT.flat('#f6e8c8', 0.7), 0, 1.06, 0); }
    tk.flush();
    P.add({ type: 'cyl', x: at.x, z: at.z, r: def.kind === 'locker' ? 0.42 : 0.38, top: ty + (def.kind === 'locker' ? 1.2 : 0.7), noStand: true });
    C.thing = { x: at.x, z: at.z, y: ty };
    k.flush();
    // where he stands: near shore, rock, far patch (each its ring to the next place)
    if (!def.walk) {
      C.toM = C.M && this.ringTarget(def.id + 'M', C.mRing, C.M, () => this.farArrived(C, 'M'));
      C.toF = this.ringTarget(def.id + 'F', C.fRing, F, () => this.farArrived(C, 'F'));
      C.toN = this.ringTarget(def.id + 'N', C.nRing, N, () => this.farArrived(C, 'N'));
    }
    (this.far ||= {})[def.id] = C;
  }
  // which side of a crossing he is on (null: nowhere near it)
  farSide(C) {
    const h = this.game.hero.pos, near = (p, r, dy) => Math.hypot(h.x - p.x, h.z - p.z) < r && Math.abs(h.y - p.y) < dy;
    if (C.M && near(C.M, 1.8, 0.8)) return 'M';
    if (near(C.F, C.def.zone + 3, 2.0)) return 'F';   // (anywhere on the far patch near its landing)
    if (near(C.N, C.def.zone, 2.0)) return 'N';
    return null;
  }
  farArrived(C, where) {
    const f = this.f, g = this.game, key = 'dx_far_' + C.id;
    if (where === 'F' && !f[key]) { f[key] = true; this.chain([['hero', 'dx_far_' + C.id + '_over']], () => g.save(false)); }
  }
  // a crossing walked on foot (the honey islet over its plank bridge): its arrival, the first time he stands on the far side
  farWalked() {
    const C = this.far?.honey;
    if (!C || this.f.dx_far_honey || this.here() !== C.room || !this.able() || this.game.state !== 'play' || this.game.trans || this.game.cutscene) return;
    if (this.farSide(C) === 'F') this.farArrived(C, 'F');
  }
  farTargets(out) {
    if (!this.far || !this.hasLine()) return;
    for (const C of Object.values(this.far)) {
      if (this.here() !== C.room || C.def.walk) continue;
      const s = this.farSide(C);
      if (s === 'N') out.push(C.M ? C.toM : C.toF);
      else if (s === 'M') out.push(C.toF, C.toN);
      else if (s === 'F') out.push(C.M ? C.toM : C.toN);
    }
  }
  farInteractables(consider, dist) {
    if (!this.far || !this.able()) return;
    const h = this.game.hero;
    if (h.steer || h.actT > 0 || this._steer) return;
    for (const C of Object.values(this.far)) {
      if (this.here() !== C.room) continue;
      if (Math.abs(h.pos.y - C.thing.y) < 1.5) consider(dist(C.thing.x, C.thing.z), 1.4, { kind: 'dx_farthing', far: C.id, label: C.def.kind === 'honey' ? 'p_drink' : this.f[C.def.flag] ? 'p_look' : 'p_search' });
      if (!C.def.walk && Math.abs(h.pos.y - C.N.y) < 1.5) consider(dist(C.def.nPost.x, C.def.nPost.z), 1.3, { kind: 'dx_farlook', far: C.id, label: 'p_look' });
    }
  }
  farInteract(it) {
    const g = this.game, f = this.f, C = this.far[it.far], h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), () => { done?.(); g.save(false); }); return true; };
    if (it.kind === 'dx_farlook') return say([this.hasLine() ? 'dx_far_look_line' : 'dx_far_look']);
    const T = C.thing;
    h.angle = Math.atan2(T.x - h.pos.x, T.z - h.pos.z);
    if (C.def.kind === 'honey') {
      // the hive's honey pot: a full heal, once each visit to the islet (taken again after he has left the area)
      if (this._honeyRoom === C.room) return say(['dx_far_honey_empty']);
      h.act('pickup', 0.8, () => { this._honeyRoom = C.room; f.dx_far_honeyN = (f.dx_far_honeyN || 0) + 1; h.hp = h.maxHp; g.audio.play('heal'); g.hud.stats?.(h); say([f.dx_far_honeyN > 1 ? 'dx_far_honey_again' : 'dx_far_honey']); }, 0.4);
      return true;
    }
    if (f[C.def.flag]) return say([C.def.after]);
    h.act('search', 0.9, () => {
      f[C.def.flag] = true; g.audio.play('chest');
      say(C.def.read, () => {
        if (C.def.kind === 'crate') this.reward('dx_owe_far_yard', 'coin', 1, T.x, T.y + 0.9, T.z + 0.6, { pop: true, value: FAR_PAY });
        else this.reward('dx_owe_far_quay', 'coin', 1, T.x, T.y + 0.9, T.z + 0.6, { pop: true, value: FAR_PAY });   // (CLOVER-BALANCE option A: kashes, no longer a clover leaf)
      });
    }, 0.45);
    return true;
  }

  // ---- HAM-4: the gorge's ice arch
  buildArch(M) {
    const g = this.game, P = g.physics, T = P.terrain, o = { x: M.group.position.x, z: M.group.position.z };
    const root = new THREE.Group(); root.position.set(0, -M.group.position.y, 0); M.group.add(root);
    const k = new Kit(root), A = ARCH;
    const S = { x: A.stack[0], z: A.stack[1], y: A.top }, foot = { x: A.foot[0], z: A.foot[1], y: T.heightAt(o.x + A.foot[0], o.z + A.foot[1]) };
    const floor = T.heightAt(o.x + S.x, o.z + S.z);
    // the rock stack out of the meltwater, flat-topped (snow on it), sheer: no jump reaches it from the floor or the banks
    const rockM = MM.stone('#bdb3a3').clone(); rockM.userData = { ...rockM.userData, rockSet: true }; delete rockM.userData.vcKey;
    const h = S.y - floor + 0.2;   // (its top just under the deck stone, so nothing on the deck stands in rock)
    // (three rough blocks one on another, each turned and set a little off the last: a weathered column, not a pot)
    for (const [i, f0, f1, sx, sz, ox, oz, ry] of [[0, 0, 0.45, 1.8, 1.6, 0.1, -0.1, 0.4], [1, 0.38, 0.78, 1.5, 1.4, -0.12, 0.08, 1.9], [2, 0.7, 1.0, 1.35, 1.3, 0.05, 0.05, 3.1]]) {
      const y0 = floor - 0.3 + h * f0, y1 = floor - 0.3 + h * f1;
      k.add(rockGeometry(37 + i * 5), rockM, S.x + ox, (y0 + y1) / 2, S.z + oz, ry, { sx, sy: (y1 - y0) / 1.7, sz });
    }
    k.add(cyl(1.15, 1.25, 0.2, 14), MM.stone('#cfc6b8'), S.x, S.y - 0.1, S.z);
    k.add(cyl(1.0, 1.0, 0.05, 14), MAT.flat('#f4f8fc', 0.9), S.x + 0.1, S.y - 0.01, S.z);   // (FEET-66: the snow 1.5 cm over the stone he stands on, was 4.5)
    P.add({ type: 'cyl', x: o.x + S.x, z: o.z + S.z, r: 1.15, top: S.y });
    // the ice arch: from the stack's shoulder up and over to the north bank, the rings frozen into its crown and its foot
    const pts = [new THREE.Vector3(S.x - 0.6, S.y + 0.2, S.z - 0.5), new THREE.Vector3(S.x - 0.4, S.y + 2.6, S.z - 1.8), new THREE.Vector3((S.x + foot.x) / 2, S.y + 3.0, (S.z + foot.z) / 2 + 0.6), new THREE.Vector3(foot.x, foot.y + 1.8, foot.z + 0.6), new THREE.Vector3(foot.x, foot.y - 0.3, foot.z)];
    const iceM = new THREE.MeshStandardMaterial({ color: '#c4e6f8', roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.72, emissive: '#2a6a9a', emissiveIntensity: 0.2, flatShading: true });
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.32, 7), iceM); arch.castShadow = true; root.add(arch);
    for (const [i, s] of [[1, 0.9], [3, 0.8]]) { const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), iceM); lump.position.copy(pts[i]); lump.scale.setScalar(s); root.add(lump); }
    P.add({ type: 'cyl', x: o.x + foot.x, z: o.z + foot.z, r: 0.5, top: foot.y + 1.6, noStand: true, seeThrough: true });
    const brass = MAT.brass();
    const crown = { x: S.x - 0.4, y: S.y + 2.2, z: S.z - 1.4 }, footRing = { x: foot.x, y: foot.y + 1.5, z: foot.z + 0.75 };
    for (const r of [crown, footRing]) k.add(torus(0.17, 0.03, 6, 18), brass, r.x, r.y, r.z, Math.PI / 2);
    // the road crew's chest on the stack
    const ch = new THREE.Group(); ch.position.set(S.x + 0.45, S.y, S.z + 0.35); ch.rotation.y = -0.5; root.add(ch);
    const box = new THREE.Mesh(rbox(0.7, 0.4, 0.4, 0.03), MAT.flat('#7a3a2a', 0.7)); box.position.y = 0.2; ch.add(box);
    const lidG = new THREE.Group(); lidG.position.set(0, 0.4, -0.2); ch.add(lidG);
    const lid = new THREE.Mesh(rbox(0.72, 0.08, 0.42, 0.03), MAT.flat('#8a4a32', 0.7)); lid.position.set(0, 0.04, 0.2); lidG.add(lid);
    for (const sx of [-0.25, 0.25]) { const band = new THREE.Mesh(rbox(0.05, 0.42, 0.42, 0.01), MAT.flat('#3a3640', 0.5, { metalness: 0.5 })); band.position.set(sx, 0.21, 0); ch.add(band); }
    k.flush();
    const W = (p) => ({ x: o.x + p.x, y: p.y, z: o.z + p.z });
    const stand = W({ x: S.x + 0.2, y: S.y, z: S.z - 0.2 }), bx = foot.x + 1.5, bz = foot.z - 1.2, bank = W({ x: bx, y: T.heightAt(o.x + bx, o.z + bz), z: bz });
    this.ar = { M, S: W(S), stand, bank, chest: W({ x: S.x + 0.45, y: S.y, z: S.z + 0.35 }), lidG, look: W({ x: A.look[0], y: 0, z: A.look[1] }),
      toStack: this.ringTarget('arch', W(crown), stand, () => { if (!this.f.dx_arch) { this.f.dx_arch = true; this.chain([['hero', 'dx_arch_over']], () => g.save(false)); } }),
      toBank: this.ringTarget('archback', W(footRing), bank, null) };
    this.ar.look.y = T.heightAt(this.ar.look.x, this.ar.look.z);
  }
  setArch() { const A = this.ar; if (A) A.lidG.rotation.x = this.f.dx_arch_chest ? -1.9 : 0; }
  archOpen() { return !!this.ar && this.here() === 'hamalayi' && this.at('pass') && this.able(); }
  archTargets(out) {
    const A = this.ar; if (!A || !this.archOpen() || !this.hasLine()) return;
    const h = this.game.hero.pos;
    if (Math.hypot(h.x - A.S.x, h.z - A.S.z) < 1.3 && Math.abs(h.y - A.S.y) < 0.8) out.push(A.toBank);
    else if (Math.hypot(h.x - A.S.x, h.z - A.S.z) < 14 && h.y > A.S.y - 3.5) out.push(A.toStack);
  }
  archInteractables(consider, dist) {
    const A = this.ar; if (!this.archOpen()) return;
    const h = this.game.hero;
    if (h.steer || h.actT > 0 || this._steer) return;
    if (Math.abs(h.pos.y - A.look.y) < 1.5) consider(dist(A.look.x, A.look.z), 2.2, { kind: 'dx_archlook', label: 'p_look' });
    if (Math.abs(h.pos.y - A.S.y) < 0.8) consider(dist(A.chest.x, A.chest.z), 1.3, { kind: 'dx_archchest', label: this.f.dx_arch_chest ? 'p_look' : 'p_search' });
  }
  archInteract(it) {
    const g = this.game, f = this.f, A = this.ar, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), () => { done?.(); g.save(false); }); return true; };
    if (it.kind === 'dx_archlook') { f.dx_arch_seen = true; return say([this.hasLine() ? 'dx_arch_look_line' : 'dx_arch_look']); }
    if (f.dx_arch_chest) return say(['dx_arch_chest_after']);
    h.angle = Math.atan2(A.chest.x - h.pos.x, A.chest.z - h.pos.z);
    h.act('search', 0.9, () => {
      f.dx_arch_chest = true; this.setArch(); g.audio.play('chest');
      say(['dx_arch_chest1', 'dx_arch_chest2'], () => {
        this.reward('dx_owe_arch', 'coin', 1, A.chest.x, A.S.y + 0.9, A.chest.z, { pop: true, value: ARCH.pay });
        this.reward('dx_owe_arch_clover', 'clover', 1, A.chest.x - 0.3, A.S.y + 0.9, A.chest.z, { pop: true });
      });
    }, 0.45);
    return true;
  }
  lineTargets() { const out = []; this.farTargets(out); this.archTargets(out); return out; }

  // ================================================================ the director's hooks
  interactables(consider, dist) { this.gemInteractables(consider, dist); this.wayInteractables(consider, dist); this.packInteractables(consider, dist); this.gazeInteractables(consider, dist); this.srcInteractables(consider, dist); this.heatInteractables(consider, dist); this.storeInteractables(consider, dist); this.goatInteractables(consider, dist); this.farInteractables(consider, dist); this.archInteractables(consider, dist); this.w5.interactables(consider, dist); }
  interact(it) {
    // (the street's own looks, zeelife.js: a dark post's tag read counts as a clue; the burrow's vent and the store's
    //  shut door are answered here while their quest wants them)
    if (it?.kind === 'zltag' && this.heatWindow()) this.f.dx_heat_tag = true;
    if (it?.kind === 'zlburrow' && this.heatVent()) return true;
    if (it?.kind === 'zhshut' && it.key === 'zh_closed_depot' && this.storeHere()) return this.storeInteract();
    if (it?.kind === 'dl_read' && it.id === 'survey' && this.w5.canPin()) return this.w5.pin();   // (WAVE5 H-14: the readings pinned to Ilka's board)
    if (this.w5.interact(it)) return true;
    if (it?.kind === 'ihfar' && this.hasLine() && FARS.some((d) => !d.walk && it.key === 'ih_far_' + d.id)) { const d = FARS.find((q) => it.key === 'ih_far_' + q.id); this.chain([['hero', 'dx_far_hint_' + d.id]]); return true; }
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_')) return false;
    if (it.kind === 'dx_heatcap') return this.heatInteract(it);
    if (it.kind === 'dx_store') return this.storeInteract(it);
    if (it.kind === 'dx_goatring' || it.kind === 'dx_goatdown') return this.goatInteract(it);
    if (it.kind === 'dx_farthing' || it.kind === 'dx_farlook') return this.farInteract(it);
    if (it.kind === 'dx_archlook' || it.kind === 'dx_archchest') return this.archInteract(it);
    if (it.kind.startsWith('dx_way')) return this.wayInteract(it);
    if (it.kind === 'dx_pack' || it.kind === 'dx_mirror') return this.packInteract(it);
    if (it.kind === 'dx_fig' || it.kind === 'dx_drift' || it.kind === 'dx_hatch') return this.gazeInteract(it);
    if (it.kind === 'dx_src') return this.srcInteract(it);
    return this.gemInteract(it);
  }
  talkFirst(npc) {
    if (this._passing) return false;
    if (this.w5.talkPre(npc) || this.talkOwn(npc)) return true;
    return this.w5.talkFirst(npc);   // (WAVE5: after this module's own hooks)
  }
  talkOwn(npc) {
    const id = npc?.def?.id;
    if (id === 'il_jaspa') return this.jaspaTalk(npc);
    if (id === 'hl_monk') return this.tenpaTalk(npc);
    if (id === 'yorna') return this.yornaTalk(npc);
    if (id === 'dtrader') return this.broskTalk(npc);
    if (id === 'zr_fennick') return this.garnTalk(npc);
    if (id === 'zmole1') return this.grummTalk(npc);
    if (id === 'ztri1') return this.pelleckTalk(npc);
    if (id === 'pim') return this.pimTalk(npc);
    if (id === 'weaver') return this.lumiTalk(npc);
    return false;
  }
  forkHit(o) { return this.gemFork(o) || this.srcFork(o) || this.w5.forkHit(o); }
  heatHit(o) { return this.packHeat(o); }
  // the pulse tool (index.js pulseHit): the store's motor
  pulseHit(o) { return this.storePulse(o); }
  // the things that hum, for the pocket set (story/kit2.js hums): the drift, until it is dug
  hums() { const Z = this.gz; return [...(Z && this.at('dig') && !this.f.dx_gaze_dug ? [{ id: 'dx_drift', room: 'desert', x: Z.x, y: Z.gy + 0.3, z: Z.z }] : []), ...this.w5.hums()]; }   // (WAVE5: the old adit's seam)
  // Brosk's shovel while it is lent (the inventory)
  items() {
    const f = this.f, out = [];
    if (f.dx_gaze_shovel && !f.dx_gaze_back) out.push({ id: 'shovel', icon: 'part' });
    if (f.dx_heat_spanner && !f.dx_heat_back) out.push({ id: 'spanner', icon: 'pliers' });
    if (f.dx_store_kit && !f.dx_store_given) out.push({ id: 'radkit', icon: 'parcel' });
    if (f.dx_kite === 'torn' || f.dx_kite === 'mended') out.push({ id: f.dx_kite === 'torn' ? 'kite_torn' : 'kite', icon: 'cloth' });
    out.push(...this.w5.items());   // (WAVE5)
    return out;
  }
  update(dt) {
    this.keepSteer();
    this.gemUpdate(dt); this.wayUpdate(dt); this.packUpdate(dt); this.gazeUpdate(dt); this.srcUpdate(dt);
    this.heatUpdate(dt); this.storeUpdate(dt);
    this.w5.update(dt);   // (WAVE5)
    if (this._honeyRoom && this.here() !== this._honeyRoom) this._honeyRoom = null;   // (ISL-3: the honey pot again on the next visit)
    this.farWalked();
    const g = this.game, f = this.f;
    // COL-1: the epilogue's line for all twelve, once dinner is over and he is free
    if (f.dx_crystals12 && !f.dx_c12_home && this.story.cur?.key === 'home' && f.ep_free && g.state === 'play' && !g.trans && !g.cutscene) {
      f.dx_c12_home = true; this.chain([['hero', 'dx_c12_home']]);
    }
  }
  journal() {
    const f = this.f, out = [];
    if (this.game.crystalCount() > 0) out.push({ key: 'dx_j_crystals', done: false });
    if (f.dx_jaspa_ask) { out.push({ key: 'dx_j_jaspa', done: !!f.dx_jaspa_sorted }); if (!f.dx_jaspa_sorted) out.push({ key: 'dx_j_jaspa_rule', done: false }); }
    if (f.dx_way_ask) out.push({ key: 'dx_j_way', done: !!f.dx_way_open });
    if (f.dx_pack_ask || f.dx_pack_taken) { out.push({ key: 'dx_j_pack', done: !!f.dx_pack_taken }); if (f.dx_pack_taken) out.push({ key: 'dx_j_pack_give', done: !!f.dx_pack_given }); }
    if (f.dx_gaze_ask || f.dx_gaze_seen) {
      out.push({ key: 'dx_j_gaze', done: !!f.dx_gaze_open });
      if (f.dx_gaze_seen && !f.dx_gaze_open) out.push({ key: 'dx_j_gaze_fig', done: false });
      if (f.dx_gaze_shovel) out.push({ key: 'dx_j_gaze_shovel', done: !!f.dx_gaze_back });
    }
    if (f.dx_src_hum || f.dx_source) out.push({ key: 'dx_j_src', done: !!f.dx_source });
    if (f.dx_heat_ask || f.dx_heat_pipe || f.dx_heat_grate) {
      out.push({ key: 'dx_j_heat', done: !!f.dx_heat_open || !!f.dx_heat_late });
      if (!f.dx_heat_open && !f.dx_heat_late && !f.dx_heat_spanner) out.push({ key: 'dx_j_heat_clue', done: !!f.dx_heat_pipe && !!f.dx_heat_grate });
      if (f.dx_heat_spanner) out.push({ key: 'dx_j_heat_spanner', done: !!f.dx_heat_back });
    }
    if (f.dx_store_seen || f.dx_store_open) out.push({ key: 'dx_j_store', done: !!f.dx_store_given });
    if (f.dx_store_ledger) out.push({ key: 'dx_j_ledger', done: true });
    if (f.dx_kite) out.push({ key: 'dx_j_kite', done: f.dx_kite === 'given' });
    if (f.dx_goatpath) out.push({ key: 'dx_j_goat', done: !!f.dx_goat_up });
    for (const d of FARS) if (f['dx_far_' + d.id]) out.push({ key: 'dx_j_far_' + d.id, done: true });
    if (f.dx_arch_seen || f.dx_arch) out.push({ key: 'dx_j_arch', done: !!f.dx_arch_chest });
    return out;
  }
}
// (the crystals each in the game once: a helper for tests)
export const crystalsHeld = (g) => [...crystalsIn(g.collected)];
