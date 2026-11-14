// DEPTH, first wave (docs/lba-maturity/DEPTH-PLAN.md; the user approved it 10.11.2026). Not a chapter: the director
// (index.js) asks it beside the chapter in progress, like the islands' and the Hamalayi's life. Its state is flags
// prefixed dx_ (saved with the game; save format unchanged: an old save simply has none of them).
//
// COL-1 · Twelve singing crystals (src/game/crystals.js is the registry). Six lie in the world as before; six more are
//   given by puzzles. Built now: ISL-1 (sc-jaspa) and HAM-1 (sc-waystone). DES-1, DES-2, HAM-3 and UND-1 have their slot
//   (crystals.js, built: false) and giveCrystal() ready, but no quest gives them yet: they cannot be had.
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
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { IH, roomOf } from '../ihomes.js';
import { MAT, rbox, canvasTex, plane } from '../props.js';
import { MM } from '../props-mountain.js';
import { CRYSTAL_TOTAL, CRYSTAL_QUEST, crystalsIn } from '../crystals.js';
import { islePhase } from '../islandlife.js';
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
    const earned = { 'sc-jaspa': f.dx_jaspa_sorted, 'sc-waystone': f.dx_way_open };
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
    const blue = MAT.flat('#7ab8e8', 0.25, { metalness: 0.1, flatShading: true }), crustM = MAT.flat('#f6f8f2', 0.95, { flatShading: true });
    const gg = new THREE.OctahedronGeometry(0.05, 0), cg = new THREE.OctahedronGeometry(0.022, 0), mg = new THREE.SphereGeometry(0.006, 4, 3), moteM = MAT.flat('#f4efe4', 1);
    const gems = [];
    for (let i = 0; i < GEMS; i++) {
      const warm = WARM.includes(i), m = new THREE.Group(); grp.add(m);
      const c = new THREE.Mesh(gg, blue); c.scale.set(1, 1.4, 1); c.position.y = 0.06; c.rotation.y = i * 0.7; m.add(c);
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

  // ================================================================ the director's hooks
  interactables(consider, dist) { this.gemInteractables(consider, dist); this.wayInteractables(consider, dist); }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_')) return false;
    if (it.kind.startsWith('dx_way')) return this.wayInteract(it);
    return this.gemInteract(it);
  }
  talkFirst(npc) {
    if (this._passing) return false;
    const id = npc?.def?.id;
    if (id === 'il_jaspa') return this.jaspaTalk(npc);
    if (id === 'hl_monk') return this.tenpaTalk(npc);
    return false;
  }
  forkHit(o) { return this.gemFork(o); }
  update(dt) {
    this.keepSteer();
    this.gemUpdate(dt); this.wayUpdate(dt);
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
    return out;
  }
}
// (the crystals each in the game once: a helper for tests)
export const crystalsHeld = (g) => [...crystalsIn(g.collected)];
