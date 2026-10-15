// The arsenal in the world: where Twinsen gets his weapons and gadgets (src/game/weapons.js, gadgets.js). Not a
// chapter: the director (index.js) asks it after the chapter in progress, like Kesh's life (kesh.js). Its story
// state is flags prefixed a_; what Twinsen owns is game.hero.arms (saved with the hero).
//
//   Pippa's stall, Citadel (from chapter 2): the blowgun with six darts (15), three darts (4, LBA2's price), the
//     Nitro-Meca-Penguin (4, LBA2's price), a brass lantern (10). Added under her own stock (main.js openShop).
//   Nara's case, Zeelich's street (from chapter 3, when Twinsen reaches Zeelich): the Esmer laser pistol with a crystal
//     cell (30), cells (5: five shots), darts, penguins; from chapter 6 the Blowtron (35, Mosquibee work). With Nara
//     away the case is an honesty box.
//   Arthur's conch, on the table by his radio at home (from chapter 2): Arthur lends it (or his note does).
//   The School of Magic, Desert Island (from chapter 4): Rector Hougo gives a pearl of incandescence for Bersimon;
//     Ker'aooc teaches the protection ward (20 kashes, for the school's roof).
//   Bersimon's tent, Citadel: he asks for the pearl (any chapter); with it he makes the lightning spell.
//   The dark places (the lantern shows them): a gap in the old foundations of the house cellar (6 darts, 8 kashes;
//     from chapter 2), the old Wannie mine on Under Celebration (the Wannie glove; the shuttle from chapter 4), a hollow
//     boulder in the crystal galleries (a clover; chapter 11). (The well cave closes after chapter 1: hot water.)
//   The cellar's old coal chute, boarded up: only the glove breaks the boards (a clover, 12 kashes).
// Harder hitters come later: the laser at chapter 3 costs 30 kashes and magic or cells; the glove and the lightning
// from chapter 4; the Blowtron from chapter 6. Nothing on the main path needs any of them.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { Kit, MAT, rbox, cyl, sphere, torus, crate } from '../props.js';
import { ARMS } from '../weapons.js';
import { rockGeometry } from '../vegetation.js';
import '../text/arsenal.js';

export const PRICE = { blowgun: 15, darts: 4, penguin: 4, lantern: 10, laser: 30, cell: 5, blowtron: 35, ward: 20 };
// the places, in each room's own coordinates (relative to its group) or, for Zeelich and the island, world ones
const SPOT = {
  conch: { x: 3.0, y: 0.02, z: 1.0 },              // house-local: on the rug in Arthur's toy corner, by his radio's table
  case: { dx: -1.35, dz: -0.75, a: Math.PI / 2 },    // beside Nara's place on Zeelich's street (esmer1)
  cellarNook: { x: -5.42, z: 1.95, a: Math.PI / 2 }, // cellar-local: a gap in the old foundations, west wall
  boards: { x: -3.55, z: -4.42, a: 0 },             // cellar-local: the old coal chute in the north wall, boarded
  galNook: { x: -9.0, z: -7.4, a: 0.3 },            // gallery-local: a boulder by the back wall of the start-side shelf
  adit: { dx: -13, dz: -6, a: 1.14 },               // Under Celebration (isle_undergas): from the shuttle pad, its mouth toward the pad
};

const LIT_R = 5;   // how near the lantern must be to show a dark place's contents

export class Arsenal extends ChapterBase {
  get A() { return this.game.hero.arms; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  at(key) { const i = this.idx(key); return i >= 0 && this.story.index >= i; }
  roomId() { return this.game.room?.id ?? 'citadel'; }
  lit() { return !!this.game.gadgets?.lanternLit(); }

  // ---------------------------------------------------------------- the props
  decorate() {
    const g = this.game, R = g.rooms;
    this.nooks = [];
    // a group in a room at world (or room-local) coordinates
    const holder = (room, x, y, z, ry = 0, local = false) => {
      const grp = new THREE.Group(), gp = room.group.position;
      grp.position.set(local ? x : x - gp.x, local ? y : y - gp.y, local ? z : z - gp.z); grp.rotation.y = ry;
      room.group.add(grp); return grp;
    };
    const world = (room, grp) => { const v = new THREE.Vector3(); grp.getWorldPosition(v); return v; };
    // ---- Arthur's conch
    if (R.house) {
      const grp = holder(R.house, SPOT.conch.x, SPOT.conch.y, SPOT.conch.z, 0.6, true);
      const shell = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 9, 1).rotateZ(Math.PI / 2), MAT.flat('#f8c8b8', 0.45));
      shell.scale.set(1, 0.8, 1); shell.position.y = 0.05; grp.add(shell);
      const lip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), MAT.flat('#e8a090', 0.4)); lip.scale.set(0.6, 0.8, 1); lip.position.set(-0.08, 0.05, 0); grp.add(lip);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06 - i * 0.015, 0.008, 4, 10), MAT.flat('#d8a890', 0.5)); r.rotation.y = Math.PI / 2; r.position.set(0.02 + i * 0.03, 0.05, 0); grp.add(r); }
      this.conch = { grp, room: 'house', ...pick(world(R.house, grp)) };
      grp.scale.setScalar(1.25);
    }
    // ---- Nara's case on Zeelich's street: a glass-topped trade case on legs, a jar for the honest
    const Z = R.zeelich, s1 = Z?.npcSpots?.esmer1;
    if (Z && s1) {
      const x = s1.x + SPOT.case.dx, z = s1.z + SPOT.case.dz, y = g.physics.groundAt(x, z, 30);
      const grp = holder(Z, x, y, z, SPOT.case.a), k = new Kit(grp);
      const wood = MAT.wood('red'), brass = MAT.brass();
      for (const sx of [-0.42, 0.42]) for (const sz of [-0.2, 0.2]) k.add(cyl(0.025, 0.03, 0.72, 6), brass, sx, 0.36, sz);
      k.add(rbox(0.96, 0.18, 0.52, 0.02), wood, 0, 0.8, 0);
      k.add(rbox(0.9, 0.02, 0.46, 0.01), MAT.cloth('#2a5a8a', '#e8c86a'), 0, 0.9, 0);
      // the goods under the glass: a pistol, darts, a penguin, cells
      k.add(rbox(0.22, 0.05, 0.08, 0.02), MAT.flat('#e8b84a', 0.35, { metalness: 0.6 }), -0.25, 0.94, 0.05, 0.3);
      k.add(sphere(0.03, 8, 6), MAT.glow('#8fe8ff', '#2a9aff', 1.4), -0.13, 0.94, 0.09);
      for (let i = 0; i < 3; i++) k.add(cyl(0.006, 0.006, 0.18, 4), MAT.flat('#d8c8a0'), 0.05 + i * 0.03, 0.92, -0.05, 0, { rz: Math.PI / 2 });
      k.add(sphere(0.06, 10, 8), MAT.flat('#22262e', 0.4), 0.28, 0.97, 0.05, 0, { sy: 1.3 });
      k.add(sphere(0.045, 10, 8), MAT.flat('#f2f0e8', 0.5), 0.28, 0.96, 0.09, 0, { sy: 1.2 });
      for (let i = 0; i < 2; i++) k.add(rbox(0.04, 0.07, 0.04, 0.01), MAT.glow('#bff4ff', '#2a9aff', 1.0), -0.02 - i * 0.06, 0.95, -0.12);
      k.add(rbox(0.94, 0.12, 0.5, 0.01), MAT.glass('#e8f6ff', 0.25), 0, 0.97, 0);
      k.add(cyl(0.07, 0.06, 0.14, 10), MAT.glass('#c8e8d8', 0.55), 0.38, 0.97, -0.15);   // the jar
      k.flush();
      g.physics.add({ type: 'box', x, z, hw: 0.5, hd: 0.28, rot: SPOT.case.a, top: y + 1.0, noStand: true, seeThrough: true });
      this.case = { grp, x, z, y };
    }
    // ---- the house cellar: the gap in the foundations (lantern) and the coal chute's boards (glove)
    const W = R.cellar;
    if (W) {
      const n = SPOT.cellarNook, grp = holder(W, n.x, 0, n.z, n.a, true), k = new Kit(grp);
      k.add(rbox(0.8, 1.5, 0.3, 0.08), MAT.flat('#07080a', 1), 0, 0.85, 0.0);
      k.add(rbox(1.0, 0.22, 0.45, 0.06), MAT.rubble('grey'), 0, 0.11, 0.12, 0, { jit: true });
      for (const [sx, sy] of [[-0.48, 0.5], [0.47, 1.1], [-0.45, 1.45], [0.5, 0.35]]) k.add(rbox(0.32, 0.22, 0.2, 0.05), MAT.stone('grey', 1), sx, sy, 0.06, 0, { jit: true });   // loose foundation stones
      k.flush();
      const box = new THREE.Group(); box.position.set(0.05, 0.3, 0.06); grp.add(box);
      const tin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), MAT.flat('#7a8a8a', 0.45, { metalness: 0.5 })); box.add(tin);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.24), MAT.flat('#a83a2a', 0.5, { metalness: 0.3 })); tl.position.y = 0.09; box.add(tl);
      this.nooks.push({ id: 'cellar', room: 'cellar', show: box, ...pick(world(W, grp)), give: () => this.giveCache(6, 8) });
      const b = SPOT.boards, bg = holder(W, b.x, 0, b.z, b.a, true), bk = new Kit(bg);
      bk.add(rbox(1.3, 1.5, 0.2, 0.05), MAT.flat('#050607', 1), 0, 0.85, -0.05);
      bk.add(rbox(1.5, 0.12, 0.26, 0.03), MAT.wood('dark'), 0, 1.66, -0.02);   // the chute's old lintel
      const boards = new THREE.Group(); bg.add(boards);
      const pk = new Kit(boards);
      for (let i = 0; i < 4; i++) pk.add(rbox(1.35, 0.3, 0.05, 0.01), MAT.planks('dark'), 0, 0.3 + i * 0.34, 0.08, 0, { rz: (i % 2 ? 0.05 : -0.04) });
      for (const sx of [-0.45, 0.45]) pk.add(rbox(0.1, 1.5, 0.04, 0.01), MAT.wood('dark'), sx, 0.82, 0.12);
      pk.flush();
      this.boards = { grp: bg, boards, room: 'cellar', ...pick(world(W, bg)) };
    }
    // ---- the crystal galleries: a niche cut by hand
    const GL = R.c3gallery;
    if (GL) {
      const at = this.galSpot(GL);
      const grp = holder(GL, at.x, at.y, at.z, at.a, true), k = new Kit(grp);
      const rockM = MAT.flat('#9a8ea8', 0.9, { vertexColors: true });
      k.add(rockGeometry(11), rockM, 0, -0.05, -0.35, 0, { sx: 1.25, sy: 1.6, sz: 0.9 });
      k.add(rbox(0.62, 0.62, 0.5, 0.18), MAT.flat('#06070a', 1), 0, 0.5, 0.18);          // the hollow, cut by hand
      k.add(rbox(0.8, 0.08, 0.3, 0.03), MAT.stone('grey', 1), 0, 0.17, 0.38);
      k.flush();
      const clover = new THREE.Group(); clover.position.set(0, 0.5, 0.42); grp.add(clover);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), MAT.flat('#5fe36a', 0.5)); l.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0); clover.add(l); }
      GL.colliders?.push?.(g.physics.add({ type: 'cyl', x: GL.center.x + at.x, z: GL.center.z + at.z - 0.3, r: 0.95, top: at.y + 1.3, noStand: true }));
      this.nooks.push({ id: 'gal', room: 'c3gallery', show: clover, ...pick(world(GL, grp)), give: () => { const h = g.hero; h.clovers = Math.min(9, h.clovers + 1); g.hud.toast('toast_clover_found'); } });
    }
    // ---- Under Celebration (isle_undergas): the old Wannie mine (a timber-framed adit in the rock, dark inside)
    const U = R.isle_undergas;
    if (U?.pad) {
      const spot = this.aditSpot(U);
      SPOT.adit.a = spot.a;
      const { x, z, y } = spot;
      const grp = holder(U, x, y, z, SPOT.adit.a), k = new Kit(grp);
      const timber = MAT.wood('dark');
      // a mound of weathered rocks round the mouth (the island's own rock shapes), dark inside
      const rockM = MAT.flat('#b8a8c0', 0.92, { vertexColors: true, emissive: '#3a2030', emissiveIntensity: 0.35 });
      for (const [rx, ry, rz, sx, sy, sz, rot, seed] of [[-1.85, 0, -0.5, 1.0, 2.6, 1.3, 0.4, 3], [1.85, 0, -0.4, 1.0, 2.4, 1.3, 2.1, 5], [0.05, 1.75, -0.95, 1.9, 1.0, 1.2, 1.2, 2], [0, -0.1, -2.0, 2.2, 2.6, 1.3, 0.2, 7]]) k.add(rockGeometry(seed), rockM, rx, ry, rz, 0, { sx, sy, sz, rx: rot * 0.05 });
      k.add(rbox(1.7, 2.1, 1.4, 0.3), MAT.flat('#040506', 1), 0, 1.05, -0.45);          // the dark inside
      for (const sx of [-0.92, 0.92]) k.add(rbox(0.2, 2.3, 0.22, 0.03), timber, sx, 1.15, 0.45, 0, { rz: sx * -0.04 });
      k.add(rbox(2.3, 0.24, 0.26, 0.03), timber, 0, 2.33, 0.45, 0, { rz: 0.03 });
      k.add(rbox(0.9, 0.42, 0.04, 0.02), MAT.planks('honey'), 1.45, 1.5, 0.62, 0, { rz: 0.08 });   // the sign
      k.add(cyl(0.035, 0.035, 1.2, 6), timber, 1.45, 0.75, 0.6);
      k.at(-0.35, 0, 0.05, 0.2, () => crate(k, 0.55, { pal: 'dark' }));
      k.flush();
      const glove = new THREE.Group(); glove.position.set(-0.35, 0.68, 0.05); grp.add(glove);
      const gm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), MAT.flat('#b8402a', 0.75)); gm.scale.set(1, 0.7, 1.2); glove.add(gm);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.1, 10), MAT.flat('#6a3a22', 0.8)); cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.17; glove.add(cuff);
      // solid: the mound and the frame (the mouth is closed by the dark; the crate sits at its edge)
      const L = (lx, lz) => ({ x: x + lx * Math.cos(SPOT.adit.a) + lz * Math.sin(SPOT.adit.a), z: z - lx * Math.sin(SPOT.adit.a) + lz * Math.cos(SPOT.adit.a) });
      for (const [lx, lz, r] of [[-1.8, -0.7, 1.3], [1.85, -0.6, 1.35], [0, -1.6, 1.4]]) g.physics.add({ type: 'cyl', ...L(lx, lz), r, top: y + 2.6, noStand: true });
      g.physics.add({ type: 'box', ...L(0, -0.35), hw: 1.05, hd: 0.55, rot: SPOT.adit.a, top: y + 2.4, noStand: true });
      g.physics.add({ type: 'cyl', ...L(1.45, 0.6), r: 0.12, top: y + 1.8, noStand: true });
      this.nooks.push({ id: 'ug', room: 'isle_undergas', show: glove, x: x + Math.sin(SPOT.adit.a) * 0.6, y, z: z + Math.cos(SPOT.adit.a) * 0.6, give: () => this.gain('glove', 'it_glove') });
      this.adit = { x, z, y, sign: L(1.45, 0.9) };
    }
  }
  // Under Celebration's mine: the island's layout is the original's numbers plus our dressing, so the spot is found, not
  // fixed: a ring round the shuttle pad (8–18 m), the first that is level ground for 3.5 m all round, on the main
  // walkable area, near the pad's height, with nothing solid within 3.6 m; its mouth faces the pad. (Deterministic.)
  aditSpot(U) {
    const P = this.game.physics, p = U.pad, land = (x, z) => (U.land ? U.land(x, z) : true);
    const ok = (x, z) => {
      if (!land(x, z)) return null;
      const g0 = P.groundAt(x, z, p.y + 6);
      if (Math.abs(g0 - p.y) > 2.5) return null;
      for (const r of [1.2, 2.4, 3.5]) for (let i = 0; i < 12; i++) {
        const xx = x + Math.sin(i * 0.5236) * r, zz = z + Math.cos(i * 0.5236) * r;
        if (!land(xx, zz) || Math.abs(P.groundAt(xx, zz, p.y + 6) - g0) > 0.45 || P.blockedAt(xx, zz, g0, 0.4)) return null;
      }
      return g0;
    };
    const pref = Math.atan2(SPOT.adit.dx, SPOT.adit.dz);
    for (const d of [14, 12, 16, 10, 18, 8]) for (let i = 0; i < 24; i++) {
      const a = pref + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 12);
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, y = ok(x, z);
      if (y != null) return { x, z, y, a: Math.atan2(p.x - x, p.z - z) };
    }
    const x = p.x + SPOT.adit.dx, z = p.z + SPOT.adit.dz;
    return { x, z, y: P.groundAt(x, z, p.y + 6), a: Math.atan2(p.x - x, p.z - z) };
  }
  // the galleries' niche: on the floor near the room's entrance, toward the wall
  galSpot(GL) { return { x: SPOT.galNook.x, y: GL.deckY ?? 3, z: SPOT.galNook.z, a: SPOT.galNook.a }; }

  // ---------------------------------------------------------------- state → world
  applyFlags() {
    const f = this.f, A = this.A;
    if (this.conch) this.conch.grp.visible = !A.conch;
    if (this.boards) this.boards.boards.visible = !f.a_boards;
    this.push();
  }
  // what the lantern shows (each frame)
  push() {
    const g = this.game, h = g.hero, here = this.roomId(), lit = this.lit();
    for (const n of this.nooks || []) {
      const taken = !!this.f['a_nook_' + n.id];
      const near = here === n.room && Math.hypot(h.pos.x - n.x, h.pos.z - n.z) < LIT_R;
      n.show.visible = !taken && lit && near;
    }
  }
  items() { const f = this.f; return f.a_pearl && !this.A.lightning ? [{ id: 'pearl', icon: 'pearl' }] : []; }
  journal() {
    const f = this.f, A = this.A;
    const darkLeft = (this.nooks || []).some((n) => f['a_dark_' + n.id] && !f['a_nook_' + n.id]);
    return [
      { key: 'a_j_pearl', done: !!f.a_pearl, show: f.a_berAsk && !A.lightning },
      { key: 'a_j_pearl_give', done: !!A.lightning, show: f.a_pearl },
      { key: 'a_j_dark', done: false, show: darkLeft },
      { key: 'a_j_boards', done: !!f.a_boards, show: f.a_boardsSeen },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- the stalls (main.js openShop)
  shopItems(where) {
    const f = this.f, A = this.A, out = [], M = ARMS.max;
    const it = (id, price, disabled = false) => out.push({ id, key: 'a_sh_' + id, price, disabled, arsenal: true });
    if (where === 'citadel') {
      if (!f.prologueDone) return out;
      if (!A.blowgun) it('blowgun', PRICE.blowgun); else it('darts', PRICE.darts, A.darts >= M.darts);
      it('penguin', PRICE.penguin, A.penguins >= M.penguins);
      if (!A.lantern) it('lantern', PRICE.lantern);
    } else if (where === 'zeelich') {
      if (!A.laser) it('laser', PRICE.laser); else it('cell', PRICE.cell, A.charge > M.charge - 5);
      if (A.blowgun) it('darts', PRICE.darts, A.darts >= M.darts);
      it('penguin', PRICE.penguin, A.penguins >= M.penguins);
      if (A.blowgun && !A.blowtron && this.at('pass')) it('blowtron', PRICE.blowtron);
    }
    return out;
  }
  buy(it) {
    const g = this.game, A = this.A, M = ARMS.max;
    switch (it.id) {
      case 'blowgun': A.darts = Math.min(M.darts, A.darts + 6); this.gain('blowgun', 'it_blowgun'); return;
      case 'darts': A.darts = Math.min(M.darts, A.darts + 3); g.hud.toast('a_toast_darts', { n: 3 }); break;
      case 'penguin': A.penguins = Math.min(M.penguins, A.penguins + 1); g.hud.toast('a_toast_got', { n: t('it_penguin') }); break;
      case 'lantern': this.gain('lantern', 'it_lantern'); return;
      case 'laser': A.charge = Math.min(M.charge, A.charge + 5); this.gain('laser', 'it_laser'); return;
      case 'cell': A.charge = Math.min(M.charge, A.charge + 5); g.hud.toast('a_toast_got', { n: t('a_sh_cell') }); break;
      case 'blowtron': this.gain('blowtron', 'it_blowtron'); return;
    }
    g.audio.play('coin');
  }
  // something new for good: owned, a toast, the chest's jingle
  gain(key, nameKey) {
    const g = this.game;
    this.A[key] = true;
    g.audio.play('chest');
    g.hud.toast('a_toast_got', { n: t(nameKey) });
    g.hud.stats?.(g.hero);
  }
  giveCache(darts, kashes) {
    const g = this.game, A = this.A;
    A.darts = Math.min(ARMS.max.darts, A.darts + darts);
    g.hero.coins += kashes;
    g.audio.play('coin');
    g.hud.toast('a_toast_kashes', { n: kashes });
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, A = this.A, here = this.roomId(), h = g.hero;
    if (h.body === 'zoe' || h.body === 'worker') return;
    if (here === 'house' && this.conch && !A.conch && f.prologueDone) consider(dist(this.conch.x, this.conch.z), 1.15, { kind: 'a_conch', label: 'p_take' });
    if (here === 'zeelich' && this.case && this.at('zeelich')) consider(dist(this.case.x, this.case.z), 1.6, { kind: 'a_case', label: 'p_trade' });
    for (const n of this.nooks || []) {
      if (n.room !== here || f['a_nook_' + n.id]) continue;
      if (Math.abs(h.pos.y - n.y) > 2.5) continue;
      consider(dist(n.x, n.z), 1.7, { kind: 'a_nook', nook: n, label: this.lit() ? 'p_take' : 'p_look2' });
    }
    if (here === 'cellar' && this.boards && !f.a_boards) consider(dist(this.boards.x, this.boards.z), 1.6, { kind: 'a_boards', label: 'p_look2' });
    if (here === 'isle_undergas' && this.adit) consider(dist(this.adit.sign.x, this.adit.sign.z), 1.3, { kind: 'a_sign', label: 'p_read' });
  }
  interact(it) {
    const g = this.game, f = this.f, A = this.A;
    const hero = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), done); return true; };
    switch (it.kind) {
      case 'a_conch': {
        const ar = this.speaker('arthur'), home = ar && ar.present && g.room?.id === 'house' && g.hero.distTo(ar) < 9;
        const take = () => { if (A.conch) return; this.gain('conch', 'it_conch'); this.conch.grp.visible = false; g.save(false); };
        if (home) { this.chain([['hero', 'a_conch_look'], ['arthur', 'a_ar_conch1'], ['arthur', 'a_ar_conch2'], ['hero', 'a_tw_conch'], ['arthur', 'a_ar_conch3']], take); return true; }
        return hero(['a_conch_look', 'a_conch_note'], take);
      }
      case 'a_case': {
        const nara = this.speaker('nara'), there = nara?.present && g.room?.id === 'zeelich' && g.hero.distTo(nara) < 6;
        const tron = A.blowgun && !A.blowtron && this.at('pass') && !f.a_tronSaid;
        const open = () => g.openShop('zeelich');
        if (!there) return hero(['a_case_away'], open);
        const lines = [['nara', f.a_naraMet ? 'a_nara_2' : 'a_nara_1']];
        if (tron) lines.push(['nara', 'a_nara_tron']);
        this.chain(lines, () => { f.a_naraMet = true; if (tron) f.a_tronSaid = true; open(); });
        return true;
      }
      case 'a_nook': {
        const n = it.nook;
        if (!this.lit()) { f['a_dark_' + n.id] = true; return hero(['a_dark']); }
        g.hero.actAt(n.x, n.z, 'use', 0.6, () => {
          if (f['a_nook_' + n.id]) return;
          f['a_nook_' + n.id] = true; n.show.visible = false;
          n.give();
          hero(['a_nook_' + n.id], () => g.save(false));
        }, 0.3);
        return true;
      }
      case 'a_boards': f.a_boardsSeen = true; return hero(['a_boards']);
      case 'a_sign': return hero(['a_adit_sign']);
    }
    return false;
  }
  // a punch at the boards: only the glove breaks them
  meleeHit(o) {
    const g = this.game, f = this.f, B = this.boards;
    if (!B || f.a_boards || this.roomId() !== 'cellar' || o.hitSet.has(B)) return false;
    if (!o.inArc(B.x, B.z, 0.7)) return false;
    o.hitSet.add(B);
    f.a_boardsSeen = true;
    if (!o.move.glove) { g.impact(B.x, g.hero.pos.y + 1, B.z, 'wood', 'blocked'); g.hud.toast('a_boards_thud'); return true; }
    f.a_boards = true; B.boards.visible = false;
    g.audio.play('break'); g.particles.burst(B.x, g.hero.pos.y + 0.9, B.z, '#8a6430', 26, 4); g.camRig.shake(0.25);
    const h = g.hero; h.clovers = Math.min(9, h.clovers + 1); h.coins += 12;
    this.chain([['hero', 'a_boards_cache']], () => { g.hud.toast('a_toast_kashes', { n: 12 }); g.save(false); });
    return true;
  }

  // ---------------------------------------------------------------- people (asked before the chapter)
  talkFirst(npc) {
    const g = this.game, f = this.f, A = this.A, h = g.hero, id = npc.def.id;
    if (h.body === 'zoe' || h.body === 'worker') return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'magus':
        if (!this.at('dig') || f.a_pearl || A.lightning) return false;
        return c(f.a_berAsk ? [['magus', 'a_hougo_pearl_asked']] : [['magus', 'a_hougo_pearl'], ['magus', 'a_hougo_pearl2']], () => {
          f.a_pearl = true; g.audio.play('chest'); g.hud.toast('a_toast_got', { n: t('it_pearl') }); g.save(false);
        });
      case 'bersimon': {
        if (A.lightning || (f.a_berAsk && !f.a_pearl)) return false;
        if (h.mp < h.mpMax) { h.mp = h.mpMax; g.audio.play('heal'); g.hud.toast('wz_toast_magic'); }   // (as always: baseTalk)
        if (f.a_pearl) return c([['bersimon', 'a_ber_pearl1'], ['bersimon', 'a_ber_pearl2'], ['bersimon', 'a_ber_pearl3']], () => { g.audio.play('thunder'); g.camRig.shake(0.3); this.gain('lightning', 'it_lightning'); g.save(false); });
        return c([['bersimon', 'a_ber_ask']], () => { f.a_berAsk = true; g.save(false); });
      }
      case 'keraooc':
        if (!this.at('dig') || A.protect) return false;
        if (h.hp < h.maxHp) { h.hp = h.maxHp; g.audio.play('heal'); g.hud.toast('wz_toast_heal'); }
        return c([['keraooc', 'a_ker_offer']], () => g.openMenu('a_menu_ward', [{ key: 'a_menu_learn', note: 'a_note_20' }], () => {
          if (h.coins < PRICE.ward) { this.chain([['keraooc', 'a_ker_poor']]); g.audio.play('deny'); return; }
          h.coins -= PRICE.ward;
          this.chain([['keraooc', 'a_ker_learn']], () => { this.gain('protect', 'it_protect'); g.save(false); });
        }));
    }
    return false;
  }

  update() { if (this.nooks) this.push(); }
}
const pick = (v) => ({ x: v.x, y: v.y, z: v.z });
