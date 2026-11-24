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
import { MAT, rbox, cyl, canvasTex, plane } from '../props.js';
import { MM } from '../props-mountain.js';
import { CRYSTAL_TOTAL, CRYSTAL_QUEST, crystalsIn } from '../crystals.js';
import { islePhase } from '../islandlife.js';
import { tm } from '../kit.js';
import { revealBeat } from './revealcam.js';
import '../text/depth.js';

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

// the flag a quest crystal is owed under (sc-jaspa → dx_owe_sc_jaspa)
const oweFlag = (id) => 'dx_owe_' + id.replace(/-/g, '_');

export class Depth extends ChapterBase {
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
    this.applyFlags();
  }
  regionBuilt() { this.applyWorld(); }
  applyFlags() {
    this.settleCrystals();
    this.applyWorld();
  }
  applyWorld() {
    this.held = null;
    this.layGems();
    this.setWay();
    this.setPack();
    this.setGaze();
    this.setSource();
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
      const board = new THREE.Mesh(plane(0.42, 0.14), label(word, bg)); board.position.set(0, hh * 0.55, s / 2 + 0.005); b.add(board);
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
    const col = P.add({ type: 'box', x: DRIFT.x, z: DRIFT.z, hw: 1.3, hd: 0.9, rot: 0.4, top: gy + 0.3 });
    this.gz = { R, figs, grp, drift, hatch, hinge, spoil, col, gy, digT: 0, openT: 0, x: DRIFT.x, z: DRIFT.z };
  }
  setGaze() {
    const Z = this.gz; if (!Z || Z.digT > 0 || Z.openT > 0) return;
    const f = this.f, dug = !!f.dx_gaze_dug;
    Z.drift.visible = !dug; Z.drift.scale.set(1, 1, 1);
    Z.hatch.visible = dug; Z.spoil.forEach((m) => { m.visible = dug; });
    Z.hinge.rotation.x = f.dx_gaze_open ? -1.95 : 0;
    Object.assign(Z.col, dug ? { top: Z.gy + 0.45, noStand: true, hw: 0.6, hd: 0.6 } : { top: Z.gy + 0.3, noStand: false, hw: 1.3, hd: 0.9 });
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

  // ================================================================ the director's hooks
  interactables(consider, dist) { this.gemInteractables(consider, dist); this.wayInteractables(consider, dist); this.packInteractables(consider, dist); this.gazeInteractables(consider, dist); this.srcInteractables(consider, dist); }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_')) return false;
    if (it.kind.startsWith('dx_way')) return this.wayInteract(it);
    if (it.kind === 'dx_pack' || it.kind === 'dx_mirror') return this.packInteract(it);
    if (it.kind === 'dx_fig' || it.kind === 'dx_drift' || it.kind === 'dx_hatch') return this.gazeInteract(it);
    if (it.kind === 'dx_src') return this.srcInteract(it);
    return this.gemInteract(it);
  }
  talkFirst(npc) {
    if (this._passing) return false;
    const id = npc?.def?.id;
    if (id === 'il_jaspa') return this.jaspaTalk(npc);
    if (id === 'hl_monk') return this.tenpaTalk(npc);
    if (id === 'yorna') return this.yornaTalk(npc);
    if (id === 'dtrader') return this.broskTalk(npc);
    return false;
  }
  forkHit(o) { return this.gemFork(o) || this.srcFork(o); }
  heatHit(o) { return this.packHeat(o); }
  // the things that hum, for the pocket set (story/kit2.js hums): the drift, until it is dug
  hums() { const Z = this.gz; return Z && this.at('dig') && !this.f.dx_gaze_dug ? [{ id: 'dx_drift', room: 'desert', x: Z.x, y: Z.gy + 0.3, z: Z.z }] : []; }
  // Brosk's shovel while it is lent (the inventory)
  items() { const f = this.f; return f.dx_gaze_shovel && !f.dx_gaze_back ? [{ id: 'shovel', icon: 'part' }] : []; }
  update(dt) {
    this.keepSteer();
    this.gemUpdate(dt); this.wayUpdate(dt); this.packUpdate(dt); this.gazeUpdate(dt); this.srcUpdate(dt);
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
    return out;
  }
}
// (the crystals each in the game once: a helper for tests)
export const crystalsHeld = (g) => [...crystalsIn(g.collected)];
