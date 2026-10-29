// LBA3 – "The Awakening", chapter 1 "The Well" (key 'well'; the code still calls it the prologue).
//
// Twelve years after LBA2. The square's well has stopped giving water.
// Zoe sends Twinsen to look. On the way (CH1-LONGER: each step a person's want and one of Twinsen's tools):
//  - the lid key: Mira won't unlock the town well for what she calls a pipe fault in Gilbert's street. Zoé, gone
//    next door, brings the proof: their kettle furred with warm crystals since breakfast ("pipes don't grow those").
//  - the lid: unlocked, it is rusted to the rim. Gilbert swears by a kick (Aggressive); the ball only bounces off.
//  - the rope: Xil's rope ladder for Doran's stamp on his unloading permit. Doran sleeps through anything but the
//    harbour bell, which hangs out of reach (the magic ball rings it). Arthur knows the trick too.
//  - optional: overheard in Discreet mode, Tim confesses the warm stone; more lie on top of the bay rocks, three
//    rocks a jump apart (Athletic): a warm stone and a few kashes.
// At the bottom: warm water, crystals that weren't there before, and the magic ball pulled toward the wall. Then
// Sendell speaks. Every step is a flag (saved); a save from before CH1-LONGER plays the steps it hasn't passed.
import * as THREE from 'three';
import { POI } from '../world.js';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { playOpening } from './opening.js';
import { lba1EnemyDefs } from '../lba1places.js';
import { mergeStatic } from '../../engine/merge.js';
import '../text/well.js';

const V = POI.village;
const _pullTmp = new THREE.Vector3(), _handTmp = new THREE.Vector3(); // (Sendell's pull, no per-frame allocation)
// the well's lid: on the rim (local y), how far it swings up when kicked open (about its far edge, on the +z side,
// clear of the roof's posts at ±x)
const LID_Y = 0.92, LID_R = 0.97, LID_OPEN = 1.78;
// the harbour bell: its post on the quay at the pier's mouth, the bell hanging over the way onto the pier (Doran naps by it)
const BELL = { x: -119.2, z: 41.4, arm: 0.8, h: 2.95 };
// the bay rocks (the bay south-west of Twinsen's house, by the path to the lighthouse): three boulders stepping out
// into the shallows, each about a jump (1.0 m) higher than the last — too high to walk up (0.55 m), never a gap
// over the sea between them (a jump over the sea would be refused mid-air: physics.js WATER_FLOOR)
const BAY = [{ x: -67.4, z: 96.2, r: 1.15 }, { x: -68.9, z: 97.36, r: 1.05 }, { x: -70.36, z: 98.49, r: 1.0 }];
const BAY_RISE = [0.95, 1.95, 2.95];   // over the highest sand round the first rock

export class Prologue extends ChapterBase {
  constructor(story) {
    super(story);
    this.tremorT = 50;
  }

  // ---------------------------------------------------------------- actors
  npcDefs() {
    const W = this.game.world, R = this.game.rooms;
    const well = W.well;
    const kids = { x: V.x - 7, z: V.z + 8 };
    return [
      { id: 'zoe', name: 'n_zoe', char: 'zoe', color: '#ffb0d0', ...R.house.npcSpots.zoe, angle: R.house.npcSpots.zoe.a, look: { tunic: '#3f9a6a', robe: '#3f9a6a', hair: '#8a3a1a', ponytail: true, skin: '#f0c49b' } },
      // (ARTHUR-12: twelve; his model and size are LOOKS.arthur's — `look` is only the fallback palette — and his own
      // pose is at his boat, as place() puts him: the small boy's 0.62 scale and 'hide' crouch are gone)
      { id: 'arthur', name: 'n_arthur', char: 'arthur', color: '#ffe070', ...R.house.npcSpots.arthur, angle: R.house.npcSpots.arthur.a, look: { tunic: '#2a66d9', pants: '#f2ead6', hair: '#6a3a1a' }, anim: 'kneelWork' },
      { id: 'gilbert', name: 'n_gilbert', char: 'gilbert', color: '#ffb070', x: well.x + 2.4, z: well.z + 1.6, angle: Math.atan2(-1.2, 1.3), look: { tunic: '#b8483b', pants: '#5a4a3a', hair: '#c0c0c0', beard: '#c0c0c0', skin: '#e6b993' }, anim: 'talk' },
      { id: 'mira', name: 'n_mira', char: 'mira', color: '#d8a8ff', x: well.x + 1.2, z: well.z + 2.9, angle: Math.atan2(1.2, -1.3), look: { tunic: '#3b5bb8', pants: '#3b5bb8', ears: '#f4e9dc', skin: '#f4e9dc', hair: '#f4e9dc', apron: '#dfe6f5' }, anim: 'talk' },
      { id: 'pippa', name: 'n_pippa', char: 'pippa', color: '#ffb070', x: W.stall.x, z: W.stall.z, angle: W.stall.a, look: { tunic: '#e58a3a', pants: '#6a4a8a', ears: '#f4e9dc', apron: '#ffffff', skin: '#f4e9dc', hair: '#f4e9dc' } },
      { id: 'doran', name: 'n_doran', char: 'doran', color: '#8fd3ff', x: W.pierStart.x, z: W.pierStart.z + 2.2, angle: Math.PI, look: { tunic: '#2f8a6a', pants: '#3a4a6a', hat: '#d8b94a', trunk: true, skin: '#8fa3b8', hair: '#8fa3b8', scale: 1.15 }, anim: 'hide' },
      { id: 'xil', name: 'n_xil', char: 'xil', color: '#9fffc8', x: W.pierEnd.x + 3.1, z: W.pierEnd.z - 0.65, angle: Math.PI / 2 + 0.3, look: { tunic: '#6a3a9a', robe: '#6a3a9a', skin: '#7fc8a8', hair: '#7fc8a8', scale: 1.12 } },
      { id: 'tim', name: 'n_tim', char: 'tim', color: '#ffd27a', x: kids.x, z: kids.z, angle: Math.PI / 2, look: { tunic: '#e0c03a', pants: '#3a5a9a', scale: 0.7, hair: '#c06a2a' }, anim: 'talk' },
      { id: 'lulu', name: 'n_lulu', char: 'lulu', color: '#ff9ad0', x: kids.x + 1.3, z: kids.z, angle: -Math.PI / 2, look: { tunic: '#e05a9a', robe: '#e05a9a', scale: 0.66, hair: '#2a1a10' } },
      // Joe the Elf, Twinsen's old friend from LBA2, by the square (he only chats: baseTalk's idle_joe lines)
      { id: 'joe', name: 'n_joe', char: 'joe', color: '#9fe89a', x: V.x + 6.5, z: V.z - 7.5, angle: -2.4 },
      // LBA1's Spheros, back on Citadel (looks sphero1/sphero2): Pom by the square, Madam Rondo with her poodle
      { id: 'sphero1', name: 'n_sphero1', char: 'sphero1', color: '#9fe0a0', x: V.x + 2, z: V.z + 10, angle: Math.PI },
      { id: 'sphero2', name: 'n_sphero2', char: 'sphero2', color: '#e8c890', x: V.x + 8, z: V.z - 3.5, angle: -Math.PI / 2 },
      // Twinsun's wizards (src/game/wizards.js): Bersimon in his tent; the rector and Ker'aooc at the School of Magic
      { id: 'bersimon', name: 'n_bersimon', char: 'bersimon', color: '#7fe0e8', ...(R.wtent?.npcSpots?.bersimon || { x: 0, z: 0, a: 0, pending: true }), angle: R.wtent?.npcSpots?.bersimon?.a ?? 0 },
      { id: 'magus', name: 'n_magus', char: 'magus', color: '#9fc8ff', ...(R.school?.npcSpots?.magus || { x: 0, z: 0, a: 0, pending: true }), angle: R.school?.npcSpots?.magus?.a ?? 0 },
      { id: 'keraooc', name: 'n_keraooc', char: 'keraooc', color: '#b0e0ff', ...(R.school?.npcSpots?.keraooc || { x: 0, z: 0, a: 0, pending: true }), angle: R.school?.npcSpots?.keraooc?.a ?? 0 },
    ];
  }

  enemyDefs() {
    // (and LBA1's places, open in every chapter: src/game/lba1places.js)
    return (this.game.rooms.well?.mites || []).map((p, i) => ({ id: 'mite' + i, kind: 'mite', ...p })).concat(lba1EnemyDefs(this.game.rooms));
  }

  // Esmer cargo on the pier, stamped with the energy project's emblem
  decorate() {
    if (!this.once('citadel')) return;
    const W = this.game.world, scene = W.root;
    const e = W.pierEnd;
    const crate = new THREE.MeshStandardMaterial({ color: '#5a6a80', roughness: 0.5, metalness: 0.4 });
    const emblem = new THREE.MeshStandardMaterial({ color: '#7fe8ff', emissive: '#2ab0e0', emissiveIntensity: 1.5 });
    for (const [dx, dz, s] of [[0.9, 0.85, 1], [0.9, -0.55, 0.8], [1.9, 0.25, 0.9]]) { // (at the very end of the pier, clear of the project lift)
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crate);
      m.position.set(e.x + dx, e.y + s / 2, e.z + dz); m.castShadow = true; scene.add(m);
      const em = new THREE.Mesh(new THREE.CircleGeometry(s * 0.25, 6), emblem);
      em.position.set(e.x + dx, e.y + s / 2, e.z + dz + s / 2 + 0.01); scene.add(em);
      W.physics.add({ type: 'box', x: e.x + dx, z: e.z + dz, hw: s / 2, hd: s / 2, rot: 0, top: e.y + s, seeThrough: true });
    }
    // harbour master's shed
    const s = W.pierStart;
    const g = W.H(s.x, s.z + 4);
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2), new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 0.9 }));
    shed.position.set(s.x, g + 1.2, s.z + 4.4); shed.castShadow = true; scene.add(shed);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2.4), new THREE.MeshStandardMaterial({ color: '#2f6fb0' }));
    roof.position.set(s.x, g + 2.5, s.z + 4.4); roof.rotation.x = 0.12; scene.add(roof);
    W.physics.add({ type: 'box', x: s.x, z: s.z + 4.4, hw: 1.3, hd: 1, rot: 0, top: g + 3 });
    this.buildLid(); this.buildBell(); this.buildBay();
  }

  // CH1-LONGER: the well's lid (padlocked, then rusted to the rim, then kicked open: it stays open in later chapters)
  buildLid() {
    const W = this.game.world, wx = W.well.x, wz = W.well.z, y = W.H(wx, wz) + LID_Y;
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 0.92 });
    const rust = new THREE.MeshStandardMaterial({ color: '#8a4f2c', roughness: 0.75, metalness: 0.35 });
    const iron = new THREE.MeshStandardMaterial({ color: '#4a4c52', roughness: 0.45, metalness: 0.6 });
    // a pivot on the lid's far edge (+z); the lid hangs off it toward −z
    const pivot = new THREE.Group(); pivot.position.set(wx, y, wz + LID_R - 0.04); W.root.add(pivot);
    const lid = new THREE.Group(); lid.position.z = -(LID_R - 0.04); pivot.add(lid);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(LID_R, LID_R, 0.07, 22), wood); lid.add(disc);
    for (const dx of [-0.42, 0.42]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.085, LID_R * 1.95), rust); b.position.set(dx, 0.01, 0); lid.add(b); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 14), rust); ring.position.set(0, 0.06, 0); ring.rotation.x = Math.PI / 2; lid.add(ring);
    // the hasp and padlock at the near edge (gone once the key has opened it)
    const lock = new THREE.Group(); lock.position.set(0, -0.02, -LID_R + 0.02); lid.add(lock);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.06), iron); body.position.set(0, -0.06, -0.05); lock.add(body);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 5, 10, Math.PI), iron); shackle.position.set(0, 0.01, -0.05); lock.add(shackle);
    const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.025), rust); hasp.position.set(0, -0.02, -0.01); lock.add(hasp);
    // (each part is one draw: the lid's planks and bands merged, the padlock apart since it goes; the pivot still turns them)
    lock.userData.keep = true; mergeStatic(lid, { recolor: true }); mergeStatic(lock, { recolor: true });
    this.lid = { pivot, lock, x: wx, z: wz, y, t: null };
  }
  // the lid's look for its state: 'locked' (padlock on), 'stuck' (padlock off, still down), 'open' (swung up, leaning)
  setLid(state, animate = false) {
    const L = this.lid; if (!L) return;
    L.lock.visible = state === 'locked';
    if (state === 'open') { if (animate) L.t = 0; else { L.t = null; L.pivot.rotation.x = LID_OPEN; } }
    else { L.t = null; L.pivot.rotation.x = 0; }
  }
  lidState(f = this.f) { return f.pr_lidOpen || f.inWell || f.prologueDone ? 'open' : f.pr_lidStuck ? 'stuck' : 'locked'; }

  // CH1-LONGER: the harbour bell on its post at the pier head. Its rope is long gone; the magic ball rings it.
  buildBell() {
    const W = this.game.world, PH = W.physics, gy = PH.groundAt(BELL.x, BELL.z, 4);
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.9 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a040', roughness: 0.3, metalness: 0.8, emissive: '#6a4a10', emissiveIntensity: 0.45 });
    const post = new THREE.Group(); post.position.set(BELL.x, gy, BELL.z); W.root.add(post);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, BELL.h + 0.1, 8), wood); pole.position.y = (BELL.h + 0.1) / 2; pole.castShadow = true; post.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, Math.abs(BELL.arm) + 0.2), wood); arm.position.set(0, BELL.h, BELL.arm / 2); post.add(arm);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), wood); brace.position.set(0, BELL.h - 0.25, BELL.arm * 0.32); brace.rotation.x = BELL.arm < 0 ? -0.75 : 0.75; post.add(brace);
    mergeStatic(post, { recolor: true });
    // the bell swings from the arm's end (kept apart from the merge: it moves)
    const swing = new THREE.Group(); swing.position.set(BELL.x, gy + BELL.h - 0.05, BELL.z + BELL.arm); swing.scale.setScalar(1.5); W.root.add(swing);
    const prof = [[0.001, 0.02], [0.05, 0.02], [0.085, -0.03], [0.11, -0.16], [0.17, -0.28], [0.21, -0.33], [0.2, -0.345], [0.001, -0.345]].map(([a, b]) => new THREE.Vector2(a, b));
    const bell = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), brass); swing.add(bell);
    const clap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), brass); clap.position.y = -0.33; swing.add(clap);
    // what is left of the rope: a short frayed stub
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.2, 5), new THREE.MeshStandardMaterial({ color: '#b89a68', roughness: 1 })); stub.position.y = -0.46; swing.add(stub);
    mergeStatic(swing, { recolor: true });
    PH.add({ type: 'cyl', x: BELL.x, z: BELL.z, r: 0.14, top: gy + BELL.h + 0.1, noStand: true, seeThrough: true });
    this.bell = { swing, x: BELL.x, y: gy + BELL.h - 0.35, z: BELL.z + BELL.arm, t: null, dings: 0 };
  }

  // CH1-LONGER: the bay rocks and the warm stones on the top one
  buildBay() {
    const W = this.game.world, PH = W.physics;
    let base = -9;
    const r0 = BAY[0];
    for (let a = 0; a < 16; a++) base = Math.max(base, PH.groundAt(r0.x + Math.sin(a * Math.PI / 8) * (r0.r + 0.6), r0.z + Math.cos(a * Math.PI / 8) * (r0.r + 0.6), 3));
    const rock = new THREE.MeshStandardMaterial({ color: '#958c7e', roughness: 0.95 });
    const top = new THREE.MeshStandardMaterial({ color: '#a8a090', roughness: 0.95 });
    const grp = new THREE.Group(); W.root.add(grp);
    this.bay = BAY.map((b, i) => {
      const t = base + BAY_RISE[i], bottom = -3;
      // a boulder: a ball of radius rs cut flat where it is as wide as the collider (the top he stands on), its lower
      // half drawn down to the sea floor; the sides pushed in and out a little (weathered), the flat top left flat
      const rs = b.r * 1.3, yc = Math.sqrt(rs * rs - b.r * b.r), cy = t - yc, down = (cy - bottom) / rs;
      const geo = new THREE.IcosahedronGeometry(1, 3), P0 = geo.attributes.position;
      for (let k = 0; k < P0.count; k++) {
        const ux = P0.getX(k), uy = P0.getY(k), uz = P0.getZ(k);
        const n = 1 + Math.sin(ux * 4.1 + i * 2.3) * Math.cos(uz * 3.7 - i) * 0.08 + Math.sin(uy * 5.3 + ux * 2 + i) * 0.05;
        let x = ux * rs, y = uy * rs, z = uz * rs;
        if (y >= yc) { y = yc; } else { x *= n; z *= n; if (y < 0) y *= down; }
        P0.setXYZ(k, x, y, z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rock); m.position.set(b.x, cy, b.z); m.rotation.y = i * 1.3; m.castShadow = m.receiveShadow = true; grp.add(m);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(b.r * 0.98, 14), top); cap.rotation.x = -Math.PI / 2; cap.position.set(b.x, t + 0.005, b.z); cap.receiveShadow = true; grp.add(cap);
      PH.add({ type: 'cyl', x: b.x, z: b.z, r: b.r, top: t });
      return { ...b, top: t };
    });
    mergeStatic(grp, { recolor: true });
    // the warm stones: three small crystals wedged on the top rock, the near one the one he takes
    const R = this.bay[2], glow = new THREE.MeshStandardMaterial({ color: '#d8fbff', emissive: '#56d8ff', emissiveIntensity: 1.2, roughness: 0.25 });
    const stones = new THREE.Group(); W.root.add(stones);
    const take = new THREE.Group(); W.root.add(take);
    const crystal = (parent, dx, dz, s, rx, rz) => { const c = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), glow); c.scale.y = 1.7; c.position.set(R.x + dx, R.top + s * 0.9, R.z + dz); c.rotation.set(rx, dx * 3, rz); parent.add(c); };
    crystal(stones, -0.32, 0.18, 0.11, 0.2, -0.3); crystal(stones, -0.18, 0.36, 0.08, -0.25, 0.35);
    crystal(take, 0.05, -0.05, 0.14, 0.1, 0.15);
    mergeStatic(stones, { recolor: false });
    this.stones = { rest: stones, take, mat: glow, x: R.x, z: R.z, top: R.top };
  }

  // ---------------------------------------------------------------- flow
  // A new game opens with the in-engine opening (opening.js); it ends in the house with control and the
  // first objective. `?nocine` (developers, tests) goes straight to that end state.
  start() {
    const g = this.game;
    if (new URLSearchParams(location.search).has('nocine')) {
      g.enterRoom('house', null, true, true);
      const end = g.rooms.house.npcSpots.twinsen;
      g.hero.pos.set(end.x + 2.0, 0, end.z - 1.5);
      g.hero.angle = Math.atan2(-1, 0.25);
      this.afterOpening();
      return;
    }
    this.opening = playOpening(this.story);
    this.opening.start();
  }
  // the end state of the opening (played or skipped): where everyone is, the flags, control, objective, save
  afterOpening() {
    const g = this.game, f = this.f;
    f.intro = true; f.opening = true;
    if (!this.game.hero.hasBall) f.ballHint = true; // (Zoé said "Take your magic ball": the objective shows that step)
    this.opening = null;
    this.story.refreshCast();
    g.hud.show(true);
    document.querySelector('#touch')?.classList.toggle('hidden', !g.touch);
    g.camRig.cine = false;
    g.camRig.override = null;
    g.setState('play');
    // (the first goal comes up in the objective panel for a few seconds as control comes back, in either HUD: CLAR-2)
    g.updateObjective();
    g.audio.setMood('home');
    g.save(false);
  }
  // while the prologue runs after the opening: Zoé went next door (the neighbours' house), Arthur is at his boat
  // (for later chapters this is the family's default: at home; a chapter that wants them elsewhere says so)
  place(id) {
    const f = this.f, g = this.game;
    // Doran naps by his shed until the bell (or, in a save from before CH1-LONGER, his stamp) wakes him
    if (id === 'doran') { if (!this.isCur()) return undefined; const s = g.world.pierStart; return { x: s.x, z: s.z + 2.2, a: Math.PI, anim: f.pr_bell || f.stamp ? null : 'hide' }; }
    if (id !== 'zoe' && id !== 'arthur') return undefined;
    const home = g.rooms.house.npcSpots[id];
    if (id === 'arthur') return { x: home.x, z: home.z, a: home.a, anim: 'kneelWork' };
    if (f.opening && !f.prologueDone && this.isCur()) {
      const hs = g.world.houses.find((h) => h.id === 'nbr') || g.world.houses.find((h) => h.id === 'water');
      return { x: hs.door.x + Math.sin(hs.ry) * 1.1, z: hs.door.z + Math.cos(hs.ry) * 1.1, a: hs.ry + Math.PI, anim: 'idle' };
    }
    return { x: home.x, z: home.z, a: home.a, anim: null };
  }

  items() {
    const f = this.f, out = [];
    if (f.pr_kettle && !f.key) out.push({ id: 'kettle', icon: 'crystal' });
    if (f.key && !f.prologueDone) out.push({ id: 'lidkey', icon: 'key' });
    if (f.stamp && !f.rope) out.push({ id: 'stamp', icon: 'stamp' });
    if (f.rope && !f.inWell) out.push({ id: 'rope', icon: 'rope' });
    if (f.pr_stones && !f.prologueDone) out.push({ id: 'warmstone', icon: 'pearl' });
    return out;
  }
  // what Twinsen has found out: each line shows once it is true (an open line reads as a need, never as done yet)
  journal() {
    const f = this.f;
    return [
      { key: 'pr_j_well', done: !!f.wellSeen, show: true },
      { key: 'pr_j_lock', done: !!f.key, show: f.wellSeen && !f.key },
      { key: 'pr_j_mira', done: !!f.key, show: f.pr_miraNo && !f.key },
      { key: 'pr_j_kettle', done: !!f.key, show: f.pr_kettle },
      { key: 'pr_j_key', done: true, show: f.key },
      { key: 'pr_j_lid', done: !!f.pr_lidOpen, show: f.pr_lidStuck && !f.pr_lidOpen && !f.inWell },   // (an open line: gone once the lid is open)
      { key: 'pr_j_deep', done: !!f.rope, show: (f.pr_deep || f.metXil) && !f.rope },
      { key: 'pr_j_doran', done: !!f.stamp, show: f.metXil && !f.stamp && !f.rope },   // (gone once Doran has stamped)
      { key: 'pr_j_rope', done: true, show: f.rope },
      { key: 'pr_j_tim', done: !!f.pr_stones, show: f.timConfessed },
      { key: 'pr_j_stones', done: true, show: f.pr_stones },
      { key: 'pr_j_cave', done: true, show: f.inWell },
      { key: 'pr_j_sendell', done: true, show: f.sendellHeard },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }
  objective() {
    const f = this.f, h = this.game.hero;
    const s = (ok, key) => `<span class="s ${ok ? 'ok' : ''}">◆ ${t(key)}</span>`;
    if (f.prologueDone) return `<b>${t('pr_obj_done')}</b>`;
    if (!h.hasBall) return `<b>${t('pr_obj_well')}</b>` + (f.ballHint ? s(false, 'pr_obj_ball') : '');
    if (f.inWell) return `<b>${t('pr_obj_cave')}</b>` + (f.nodes >= 3 ? '' : s(false, 'pr_obj_nodes'));
    if (!f.wellSeen) return `<b>${t('pr_obj_well')}</b>`;
    // the lid: its key (Mira wants proof first), then the rust; the rope (Xil, for Doran's stamp); Tim and his stones
    const lid = f.key ? 'pr_obj_lid' : f.pr_miraNo && !f.pr_kettle ? 'pr_obj_proof' : 'pr_obj_key';
    const rope = f.metXil && !f.stamp ? 'pr_obj_doran' : 'pr_obj_rope';
    return `<b>${t('pr_obj_descend')}</b>` + s(!!f.pr_lidOpen, lid) + s(f.rope, rope) + s(f.timConfessed, 'pr_obj_tim') + (f.timConfessed ? s(!!f.pr_stones, 'pr_obj_stones') : '');
  }

  markers() {
    const f = this.f, g = this.game, m = [];
    const gold = '#ffcf4a';
    const npc = (id) => g.npcs.find((n) => n.def.id === id);
    if (!g.hero.hasBall) return m;
    if (!f.inWell && !f.prologueDone) m.push({ x: g.world.well.x, z: g.world.well.z, kind: 'star', color: gold, r: 8, edge: true, label: t('pr_map_well') });
    // (Mira wants proof first: Zoé has it, next door)
    if (f.wellSeen && !f.key) { const n = npc(f.pr_miraNo && !f.pr_kettle ? 'zoe' : 'mira'); if (n?.present) m.push({ x: n.pos.x, z: n.pos.z, kind: 'star', color: gold, r: 6, edge: true, ...(n.def.id === 'zoe' ? { label: t('n_zoe') } : {}) }); }
    if (f.wellSeen && !f.rope) { const n = npc(f.metXil && !f.stamp ? 'doran' : 'xil'); m.push({ x: n.pos.x, z: n.pos.z, kind: 'star', color: gold, r: 6, edge: true, label: t(f.metXil && !f.stamp ? 'n_doran' : 'n_xil') }); }
    if (f.timConfessed && !f.pr_stones && !f.inWell && this.bay) { const b = this.bay[0]; m.push({ x: b.x, z: b.z, kind: 'star', color: gold, r: 5, edge: true, label: t('pr_map_rocks') }); }
    return m;
  }

  // outdoor doors you can walk into
  doors() {
    const d = this.game.world.houses[0].door;
    return [{ x: d.x, z: d.z, r: 0.9, room: 'house' }];
  }

  // where an interior exit leads
  exitTo(to) {
    const W = this.game.world;
    if (to === 'outdoor') {
      const h = W.houses[0];
      return { x: h.door.x + Math.sin(h.ry) * 1.4, z: h.door.z + Math.cos(h.ry) * 1.4, a: h.ry };
    }
    return { x: W.well.x + 1.8, z: W.well.z - 1.6, a: 0 };
  }

  // can the player leave this room yet?
  canExit(room) {
    if (room.id === 'house' && !this.game.hero.hasBall) {
      this.chain([['hero', 'pr_tw_ballfirst']], () => { this.f.ballHint = true; this.game.updateObjective(); });
      return false;
    }
    return true;
  }

  // world interactions that exist in every chapter (called by the director)
  baseInteractables(consider, dist, cur) {
    const g = this.game, W = g.world;
    if (!g.room) {
      const open = new Set(cur.doors().map((d) => d.house));
      // (while Zoé stands at the neighbours' door, its "Open" prompt would take hers: she is the one to talk to there)
      if (this.f.opening && !this.f.prologueDone && this.isCur()) open.add('nbr');
      W.houses.forEach((h, i) => { if (i > 0 && !open.has(h.id)) consider(dist(h.door.x, h.door.z), 1.6, { kind: 'locked', label: 'p_door' }); });
      // (WORLD-80: the original's other doors, shut: the islet's dome, the plateau's, the passage's two ends; only
      // from the door's own level, not from the slope above it)
      for (const d of W.shutDoors || []) if (Math.abs(g.hero.pos.y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'shut', label: 'p_door' });
      if (!W.chest.open) consider(dist(W.chest.x, W.chest.z), 2.2, { kind: 'chest', label: 'p_open' });
    } else {
      for (const s of g.room.searches) if (!g.searched.includes(s.id)) consider(dist(s.x, s.z), s.r, { kind: 'roomsearch', spot: s, label: 'p_search' });
      // (WORLD-80 step 3: an outdoor region's shut doors, Desert Island's old places: desertold.js)
      for (const d of g.room.shutDoors || []) if (Math.abs(g.hero.pos.y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'shut', label: 'p_door' });
    }
  }
  interactables(consider, dist) {
    const g = this.game, W = g.world, f = this.f, h = g.hero;
    if (!g.room) {
      // (the rusted lid: in Aggressive the prompt is a kick, as LBA's behaviours change what Twinsen does to the world)
      const kick = f.key && !f.pr_lidOpen && !f.inWell && !f.prologueDone && h.behaviour === 'aggressive';
      consider(dist(W.well.x, W.well.z), 2.6, { kind: 'well', label: kick ? 'p_kick' : 'p_well', kick });
      consider(dist(W.gate.x, W.gate.z), 3.0, { kind: 'fortgate', label: 'p_gate' });
      // CH1-LONGER: the harbour bell (until it has rung), the bay rocks from the sand, the warm stones from the top
      const B = this.bell, S = this.stones;
      if (B && !f.pr_bell && !f.prologueDone) consider(dist(B.x, B.z), 2.3, { kind: 'bell', label: 'p_look' });
      if (this.bay && !f.pr_stones && h.pos.y < this.bay[0].top - 0.4) consider(dist(this.bay[0].x, this.bay[0].z), this.bay[0].r + 1.6, { kind: 'rocks', label: 'p_look' });
      if (S && !f.pr_stones && Math.abs(h.pos.y - S.top) < 0.5) consider(dist(S.x, S.z), 1.4, { kind: 'stones', label: 'p_take' });
    }
  }

  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'roomsearch':
        if (it.spot.id === 'asylum_register') {   // FunFrock's asylum (LBA1): the old register in the office
          g.searched.push(it.spot.id); g.audio.play('chest');
          this.chain([['hero', 'asy_register1'], ['hero', 'asy_register2']], () => { h.clovers = Math.min(9, h.clovers + 1); g.hud.toast('toast_clover_found'); g.save(false); });
          return true;
        }
        if (it.spot.id !== 'cupboard') return false;
        g.searched.push(it.spot.id);
        g.audio.play('chest');
        h.hasBall = true;
        g.say('n_hero', t('pr_cupboard'), () => { g.hud.toast('pr_toast_ball', { ball: g.hud.key('ball'), map: g.hud.key('map') }); g.updateObjective(); g.save(false); }, h);
        return true;
      case 'well':
        if (f.prologueDone) { g.say('n_hero', t('pr_well_after'), null, h); return true; }
        if (!f.wellSeen) { f.wellSeen = true; g.updateObjective(); }
        if (!f.key) { g.say('n_hero', t('pr_well_locked'), () => g.updateObjective(), h); return true; }
        // the padlock opens; the lid is rusted to the rim (Gilbert, if he is by the well, has advice)
        if (!f.pr_lidOpen) {
          if (it.kick) { h.angle = Math.atan2(g.world.well.x - h.pos.x, g.world.well.z - h.pos.z); h.act('kick', 0.55, () => this.kickLid(), 0.2); return true; }
          if (!f.pr_lidStuck) {
            f.pr_lidStuck = true; this.setLid('stuck'); g.audio.play('clunk');
            const near = (id) => { const n = this.speaker(id); return n?.present && n.distTo(h) < 9; };
            const lines = [['hero', 'pr_well_stuck'], ...(near('gilbert') ? [['gilbert', 'pr_gil_kick']] : []), ...(near('gilbert') && near('mira') ? [['mira', 'pr_mira_kick']] : [])];
            this.chain(lines, () => { g.updateObjective(); g.save(false); });
            return true;
          }
          this.chain([['hero', 'pr_well_stuck2']]);
          return true;
        }
        if (!f.rope) { f.pr_deep = true; g.say('n_hero', t('pr_well_rope'), () => g.updateObjective(), h); return true; }
        g.say('n_hero', t('pr_well_go'), () => { g.audio.play('door'); g.enterRoom('well'); }, h);
        return true;
      case 'bell':
        f.pr_bellSeen = true;
        this.chain([['hero', 'pr_bell_look']], () => g.updateObjective());
        return true;
      case 'rocks':
        // (the jump's keys, as at the Whispering Cliffs' stones: main.js hitTarget)
        this.chain([['hero', 'pr_rocks_look']], () => g.hud.toast('hint_jump', { b: g.hud.key('b2'), k: g.hud.key('action') }));
        return true;
      case 'stones':
        f.pr_stones = true;
        this.stones.take.visible = false;
        g.audio.play('chest');
        this.chain([['hero', f.timConfessed ? 'pr_stones_take' : 'pr_stones_take0']], () => {
          h.coins += 10; g.audio.play('coin'); g.hud.float('+10', { x: h.pos.x, y: h.pos.y + 1.6, z: h.pos.z });
          g.hud.toast('pr_toast_stone'); g.updateObjective(); g.save(false);
        });
        return true;
      case 'fortgate':
        g.audio.play('deny');
        g.say('', [t('pr_fort')]);
        return true;
    }
    return false;
  }

  baseInteract(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'locked':
        g.say('n_hero', t('pr_locked'), null, h);
        return true;
      case 'shut':
        g.audio.play('deny');
        g.say('', [t('w_door_shut')]);
        return true;
      case 'chest':
        g.world.chest.open = true;
        f.chest = true;
        g.audio.play('chest');
        for (let i = 0; i < 8; i++) g.pickups.spawn('coin', g.world.chest.x, g.physics.groundAt(g.world.chest.x, g.world.chest.z) + 1.2, g.world.chest.z, { pop: true });
        g.say('', [t('pr_chest')]);
        return true;
      case 'roomsearch':
        g.searched.push(it.spot.id);
        g.audio.play('chest');
        if (it.spot.reward) g.pickups.spawn(it.spot.reward, it.spot.x, g.physics.groundAt(it.spot.x, it.spot.z) + 1, it.spot.z, { pop: true });
        else g.say('n_hero', t('gen_search_nothing'), null, h);
        return true;
    }
    return false;
  }
  // an NPC the current chapter has nothing special for
  baseTalk(npc) {
    const id = npc.def.id;
    if (id === 'pippa') return this.chain([['pippa', 'pr_pippa']], () => this.game.openShop());
    // the Weather Wizard tops up Twinsen's magic, the healing wizard his life (LBA2's Ker'aooc "treats everybody")
    const h = this.game.hero;
    if (id === 'bersimon' && h.mp < h.mpMax) { h.mp = h.mpMax; this.game.audio.play('heal'); this.game.hud.toast('wz_toast_magic'); }
    if (id === 'keraooc' && h.hp < h.maxHp) { h.hp = h.maxHp; this.game.audio.play('heal'); this.game.hud.toast('wz_toast_heal'); }
    const key = 'idle_' + id + '_' + this.story.cur.key, own = 'idle_' + id;
    if (t(key) === key && Array.isArray(t(own))) { const all = t(own); return this.game.say('n_' + id, [all[Math.floor(Math.random() * all.length)]]); }
    this.chain([[id, t(key) !== key ? key : 'idle_generic']]);
  }

  talk(npc) {
    const g = this.game, f = this.f, h = g.hero;
    const id = npc.def.id;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'zoe':
        if (f.prologueDone) return c([['zoe', 'pr_zoe_after']]);
        // next door: she has been round the neighbours' taps, and brings the proof Mira wants (CH1-LONGER)
        if (f.opening && !g.room && !f.key) {
          if (!f.pr_kettle) {
            return c([...(f.pr_miraNo ? [['hero', 'pr_tw_miraNo']] : []), ['zoe', 'pr_zoe_kettle'], ['hero', 'pr_tw_kettle'], ['zoe', 'pr_zoe_kettle2']], () => {
              f.pr_kettle = true; f.zoeNext = true; g.hud.toast('pr_toast_kettle'); g.audio.play('chest'); g.updateObjective(); g.save(false);
            });
          }
          return c([['zoe', 'pr_zoe_kettle_wait']]);
        }
        return c([['zoe', h.hasBall ? 'pr_zoe_go' : 'pr_zoe_ball']]);
      case 'arthur':
        if (f.prologueDone) return c([['arthur', 'pr_ar_after']]);
        // (asked again while Doran sleeps on Xil's permit, he knows how to wake him: he and Tim tried it)
        return c([['arthur', f.metXil && !f.pr_bell && !f.stamp ? 'pr_ar_bell' : 'pr_ar_hint']]);
      case 'gilbert': case 'mira':
        if (!f.key) {
          // Mira opens the town well only for a fault at the spring: the kettle crystals show it is one
          const give = () => { f.key = true; f.wellSeen = true; h.hasKey = true; g.hud.toast('pr_toast_key'); g.audio.play('chest'); g.updateObjective(); g.save(false); };
          const show = [['hero', 'pr_tw_kettle2'], ['mira', 'pr_mira_kettle'], ['mira', 'pr_mira_2b'], ['gilbert', 'pr_gil_3']];
          if (!f.pr_row) {
            const row = [['gilbert', 'pr_gil_1'], ['mira', 'pr_mira_1'], ['gilbert', 'pr_gil_2']];
            if (f.pr_kettle) return c([...row, ...show], () => { f.pr_row = true; give(); });
            return c([...row, ['hero', 'pr_tw_well'], ['mira', 'pr_mira_no'], ['gilbert', 'pr_gil_no']], () => { f.pr_row = true; f.pr_miraNo = true; f.wellSeen = true; g.updateObjective(); g.save(false); });
          }
          if (f.pr_kettle) return c(show, give);
          return c([['mira', 'pr_mira_wait0']]);
        }
        if (f.pr_lidStuck && !f.pr_lidOpen) return c([['gilbert', 'pr_gil_kick'], ['mira', 'pr_mira_kick']]);
        return c([[id, id === 'gilbert' ? 'pr_gil_wait' : 'pr_mira_wait']]);
      case 'xil':
        if (f.rope) return c([['xil', 'pr_xil_after']]);
        if (f.stamp) {
          return c([['xil', 'pr_xil_3'], ['xil', 'pr_xil_4']], () => {
            f.rope = true; f.wellSeen = true; g.hud.toast('pr_toast_rope'); g.audio.play('chest'); g.updateObjective(); g.save(false);
          });
        }
        // (only the bell wakes Doran: Xil saw it when the barge came in; once it has rung, that is moot)
        if (f.metXil) return c([['xil', 'pr_xil_2'], ...(f.pr_bell ? [] : [['xil', 'pr_xil_bell']])]);
        return c([['xil', 'pr_xil_1'], ['xil', 'pr_xil_2'], ...(f.pr_bell ? [] : [['xil', 'pr_xil_bell']]), ['hero', 'pr_tw_xil']], () => { f.metXil = true; g.updateObjective(); g.save(false); });
      case 'doran':
        if (f.stamp) return c([['doran', 'pr_doran_after']]);
        // asleep: nothing but the harbour bell wakes him (CH1-LONGER)
        if (!f.pr_bell) return c([['doran', 'pr_doran_snore'], ['hero', f.metXil ? 'pr_tw_snore2' : 'pr_tw_snore']]);
        if (!f.metXil) return c([['doran', 'pr_doran_awake']]);
        return c([['hero', 'pr_tw_doran'], ['doran', 'pr_doran_2'], ['doran', 'pr_doran_3']], () => this.giveStamp());
      case 'tim': case 'lulu':
        if (f.timConfessed) return c([[id, id === 'tim' ? 'pr_tim_after' : 'pr_lulu_after']]);
        if (f.overheard) {
          return c([['hero', 'pr_tw_tim'], ['tim', 'pr_tim_3'], ['tim', 'pr_tim_4'], ['hero', 'pr_tw_tim2']], () => {
            f.timConfessed = true;
            g.pickups.spawn('clover', npc.pos.x, npc.pos.y + 1, npc.pos.z, { pop: true });
            g.updateObjective(); g.save(false);
          });
        }
        f.kidsAsked = true;
        return c([['tim', 'pr_tim_1'], ['lulu', 'pr_lulu_1'], ['hero', 'pr_tw_kids']]);
      case 'pippa':
        this.chain([['pippa', 'pr_pippa']], () => g.openShop());
        return true;
    }
    return false;
  }

  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (id === 'well') {
      g.audio.setMood('storm');
      if (!f.inWell) {
        f.inWell = true;
        f.nodes = 0;
        g.updateObjective();
        this.chain([['hero', 'pr_cave_1'], ...(f.pr_stones ? [['hero', 'pr_cave_stones']] : []), ['hero', 'pr_cave_2']], () => g.save(false));
      }
    }
  }
  onExitRoom(id) {
  }

  // ---------------------------------------------------------------- CH1-LONGER: the lid, the bell, Doran's stamp
  giveStamp() {
    const g = this.game, f = this.f;
    f.stamp = true; f.pr_bell = true;
    const d = this.npc('doran'); if (d) d.forceAnim = null;
    g.hud.toast('pr_toast_stamp'); g.audio.play('select'); g.updateObjective(); g.save(false);
  }
  // the ball rings the bell: it swings and tolls; Doran jumps up. With Xil's errand in hand Twinsen asks for the stamp
  // straight away; without it, Doran is awake and grumpy (the stamp waits for Xil's word)
  ringBell() {
    const g = this.game, f = this.f, B = this.bell;
    f.pr_bell = true; B.t = 0; B.dings = 0;
    g.particles.burst(B.x, B.y, B.z, '#ffe08a', 12, 2.5);
    const d = this.npc('doran'); if (d) d.forceAnim = null;
    g.updateObjective();
    // (the words a moment later, once the bell has been heard)
    this.pending = { t: 0.9, fn: () => {
      if (f.stamp) return;
      if (f.metXil) this.chain([['doran', 'pr_doran_bell'], ['hero', 'pr_tw_bell'], ['doran', 'pr_doran_2'], ['doran', 'pr_doran_3']], () => this.giveStamp());
      else this.chain([['doran', 'pr_doran_bell'], ['hero', 'pr_tw_bell0'], ['doran', 'pr_doran_bell0']], () => g.save(false));
    } };
  }
  // the rusted lid gives to a kick: the well's prompt in Aggressive (E), or the fists / the glove when they are the
  // weapon in hand (Aggressive's action strikes with what is equipped: the ball by default, which only bounces off)
  meleeHit(o) {
    const g = this.game, f = this.f, L = this.lid, h = g.hero;
    if (g.room || !L || f.prologueDone || f.inWell || f.pr_lidOpen || o.hitSet.has(L)) return false;
    if (Math.abs(h.pos.y - g.physics.groundAt(L.x, L.z)) > 1.2 || !o.inArc(L.x, L.z, 1.1)) return false;
    o.hitSet.add(L);
    if (!f.key) {
      g.impact(L.x, L.y, L.z, 'wood', 'blocked');
      if (!this._padlockSaid) { this._padlockSaid = true; this.pending = { t: 0.3, fn: () => this.chain([['hero', 'pr_lid_padlock']]) }; }
      return true;
    }
    this.kickLid();
    return true;
  }
  kickLid() {
    const g = this.game, f = this.f, L = this.lid, h = g.hero;
    if (!L || f.pr_lidOpen) return;
    f.pr_lidOpen = true; f.pr_lidStuck = true;
    this.setLid('open', true);
    g.audio.play('break'); g.audio.play('clang'); g.camRig.shake(0.3);
    g.particles.burst(L.x, L.y + 0.1, L.z, '#9a5a32', 22, 3);
    const gil = this.speaker('gilbert');
    this.pending = { t: 0.5, fn: () => this.chain([['hero', 'pr_lid_kicked'], ...(gil?.present && gil.distTo(h) < 9 ? [['gilbert', 'pr_gil_told']] : [])], () => { g.updateObjective(); g.save(false); }) };
  }

  // restore world state from saved flags
  applyFlags() {
    const g = this.game, f = this.f;
    if (f.chest) { g.world.chest.open = true; g.world.chest.openT = 1; }
    g.hero.hasKey = !!f.key;
    this.setLid(this.lidState());
    if (this.bell) { this.bell.t = null; this.bell.swing.rotation.set(0, 0, 0); }
    if (this.stones) this.stones.take.visible = !f.pr_stones;
    this.pending = null;
    const R = g.rooms.well;
    if (f.nodes) R.nodes.slice(0, f.nodes).forEach((n) => this.lightNode(n, true));
    if (f.nodes >= 3) this.openBarrier(true);
  }

  lightNode(n, silent = false) {
    // (the node's own look — the flash, the ring over the floor, the glow and its light — is the well room's updater,
    // interiors.js: it reads `lit` and `quiet`; a node restored from a save is awake at once, with no flash)
    n.lit = true; n.quiet = silent;
    if (silent) return;
    const g = this.game;
    this.f.nodes = (this.f.nodes || 0) + 1;
    g.audio.play('heal');
    g.particles.burst(n.x, n.y, n.z, '#bff8ff', 26, 4);   // (sparks: a bright core and a wider cyan spray)
    g.particles.burst(n.x, n.y, n.z, '#ffffff', 10, 6.5);
    g.hud.toast('pr_toast_node', { n: this.f.nodes });
    g.updateObjective();
    if (this.f.nodes >= 3) this.barrierT = 0.7;
  }

  openBarrier(silent = false) {
    const g = this.game, B = g.rooms.well.barrier;
    B.group.visible = false;
    B.c.enabled = false;
    if (silent) return;
    g.audio.play('break'); g.audio.play('rumble');
    g.camRig.shake(0.6);
    const p = B.c;
    g.particles.burst(p.x, 1.5, p.z, '#bff8ff', 60, 6);
    g.updateObjective();
    g.save(false);
  }

  ballHit(p) {
    const g = this.game, f = this.f;
    if (!g.room) {
      // the harbour bell rings; the rusted lid only shrugs the ball off (it wants a kick)
      const B = this.bell, L = this.lid;
      if (B && !f.pr_bell && !f.prologueDone && Math.hypot(p.x - B.x, p.y - B.y, p.z - B.z) < 0.6) { this.ringBell(); return true; }
      // (anywhere over the lid under the roof's beam: a throw at it from the square flies about 0.6 m over the rim)
      if (L && f.pr_lidStuck && !f.pr_lidOpen && Math.hypot(p.x - L.x, p.z - L.z) < LID_R && p.y > L.y - 0.3 && p.y < L.y + 0.8) {
        if (!this._lidBall) { this._lidBall = true; this.pending = { t: 0.4, fn: () => this.chain([['hero', 'pr_lid_ball']]) }; }
        return true;
      }
      return false;
    }
    if (g.room !== g.rooms.well) return false;
    for (const tg of g.room.ballTargets) {
      if (!tg.node.lit && Math.hypot(p.x - tg.x, p.y - tg.y, p.z - tg.z) < tg.r) { this.lightNode(tg.node); return true; }
    }
    return false;
  }
  // the bell is a target the ball's aim curves toward, from the quay (it hangs out of reach)
  ballTargets() {
    const g = this.game, f = this.f, B = this.bell;
    if (g.room || !B || f.pr_bell || f.prologueDone || Math.hypot(g.hero.pos.x - B.x, g.hero.pos.z - B.z) > 16) return [];
    return [{ x: B.x, y: B.y, z: B.z }];
  }

  // Sendell's call: the ball is pulled into the crystal vein.
  //  0.00–0.52  Twinsen's throw winds up (the rig's 'throw': the ball held high behind the head, in his hand), the ball
  //             trembling and brightening as the vein calls it;
  //  0.52       the whip: the ball leaves the hand (it is pulled out of it, not thrown: it takes up the hand's own
  //             path first and is drawn off it over 0.2 s, so nothing snaps);
  //  0.52–1.80  an eased flight to the vein, on a rising arc with a small spiral, trail and halo all along;
  //  1.80–2.25  it sinks into the crystal: a flash and a ring where it goes in, then it shrinks and dims away to nothing.
  // (every phase is on the clock `cut`, so 30 and 60 fps play the same; the words start at 2.6)
  startSendell() {
    const g = this.game, h = g.hero, R = g.rooms.well;
    this.f.sendellHeard = true;
    g.setState('cutscene');
    g.cutscene = (dt) => this.updateSendell(dt);
    this.cut = 0; this.spoke = false; this.absorbed = false; this.released = false;
    g.ball.state = 'held';
    g.ball.holder = h;
    g.ball.mesh.visible = true;
    g.ball.track = true; g.ball.sn = 0; g.ball.span = 0.9; // (a slow pull: a longer trail, so the path reads)
    g.ball.mesh.scale.setScalar(1);
    g.ball.followHand();
    g.audio.play('rumble');
    this.veinTarget = new THREE.Vector3(R.vein.x + 0.3, R.vein.y + 0.3, R.vein.z - 0.7);
    g.audio.cue('revelation');
  }
  updateSendell(dt) {
    const g = this.game, h = g.hero, R = g.rooms.well, B = g.ball;
    this.cut += dt;
    const c = this.cut, T_REL = 0.52, T_FLY = 1.28, T_IN = T_REL + T_FLY, T_SINK = 0.45;
    const ease = (k) => k * k * (3 - 2 * k);
    h.angle = Math.atan2(R.vein.x - h.pos.x, R.vein.z - h.pos.z);
    h.rig.play(c < 1.2 ? 'throw' : 'idle');
    h.rig.update(dt, 0); h.sync();
    if (!this.released) {
      // in the hand, as it winds up: a tremble and a brightening
      B.followHand();
      this.handPos ??= new THREE.Vector3();
      this.handPos.copy(B.mesh.position);
      const w = Math.min(1, c / T_REL);
      B.mesh.position.x += Math.sin(c * 47) * 0.012 * w; B.mesh.position.y += Math.sin(c * 39) * 0.012 * w;
      B.mesh.scale.setScalar(1 + w * 0.3);
      B.mat.emissiveIntensity = 2.5 + w * 3;
      R.vein.power = w * 0.35;
      if (c >= T_REL) { this.released = true; this.p0 = this.handPos.clone(); B.flash(this.p0.x, this.p0.y, this.p0.z, 0.45, false); }
    }
    if (this.released && !this.absorbed) {
      const k = Math.min(1, (c - T_REL) / T_FLY), e = ease(k);
      const p = _pullTmp.copy(this.p0).lerp(this.veinTarget, e);
      p.y += Math.sin(k * Math.PI) * 0.7;                                   // (a rising arc)
      const sp = Math.sin(k * Math.PI * 2.5) * 0.22 * (1 - k);              // (a small spiral that dies away as it nears the wall)
      p.x += Math.cos(k * 3) * sp * 0.4; p.z += sp; p.y += Math.sin(k * Math.PI * 2.5 + 1.2) * 0.12 * (1 - k);
      // the first fifth of a second still carries the hand's own path: it is drawn off the hand, not cut loose from it
      const hand = _handTmp;
      B.followHand(); hand.copy(B.mesh.position);
      const j = ease(Math.min(1, (c - T_REL) / 0.2));
      B.mesh.position.copy(hand).lerp(p, j);
      B.mesh.scale.setScalar(1.3 - 0.15 * e);
      B.mat.emissiveIntensity = 5.5 + e * 3;
      R.vein.power = 0.35 + e * 0.5;
      g.camRig.shake(0.05 * Math.sin(k * Math.PI));
      if (c >= T_IN) { this.absorbed = true; this.landPos = B.mesh.position.clone(); B.flash(this.landPos.x, this.landPos.y, this.landPos.z, 2.2); g.camRig.shake(0.3); g.audio.play('heal'); }
    }
    if (this.absorbed) {
      // into the crystal: it goes a little further in as it shrinks and dims, the vein flaring as it takes it
      const k = Math.min(1, (c - T_IN) / T_SINK), e = ease(k);
      B.mesh.position.copy(this.landPos); B.mesh.position.z -= 0.35 * e;
      B.mesh.scale.setScalar(Math.max(0.001, 1.15 * (1 - e)));
      B.mat.emissiveIntensity = 8 * (1 - e * 0.6);
      R.vein.power = 0.85 + 0.7 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - 0.4 * k);
      if (k >= 1 && B.mesh.visible) { B.mesh.visible = false; B.track = false; B.span = 0.4; }
    }
    if (c > 2.6 && !this.spoke) {
      this.spoke = true;
      g.cutscene = null;
      this.chain([['hero', 'pr_tw_ball'], ['sendell', 'pr_sendell_1'], ['hero', 'pr_tw_sendell'], ['sendell', 'pr_sendell_2']], () => this.endPrologue());
    }
  }
  endPrologue() {
    const g = this.game;
    this.f.prologueDone = true;
    g.ball.state = 'idle';
    g.ball.mesh.visible = false; g.ball.track = false; g.ball.span = 0.4; g.ball.mesh.scale.setScalar(1);
    g.rooms.well.vein.power = 0;
    g.audio.play('victory');
    // on to chapter 1: fade out of the cave, title card, morning in the square
    g.startTransition(() => this.story.nextChapter(), this.story.nextAreas());
  }
  afterEnding() {
    // back to the surface, the ball returns home
    const g = this.game;
    g.exitRoom(this.exitTo('outdoor-well'));
  }

  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    if (this.barrierT > 0 && (this.barrierT -= dt) <= 0) this.openBarrier();
    // CH1-LONGER: the lid swinging up, the bell's swing and tolls, the stones' glow, a line held back a moment
    const L = this.lid, B = this.bell, S = this.stones;
    if (L && L.t != null) { L.t += dt; const k = Math.min(1, L.t / 0.5), e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); L.pivot.rotation.x = LID_OPEN * Math.min(1.06, e); if (k >= 1) { L.t = null; L.pivot.rotation.x = LID_OPEN; } }
    if (B && B.t != null) {
      B.t += dt;
      B.swing.rotation.x = 0.6 * Math.sin(B.t * 7.5) * Math.exp(-B.t * 0.8);
      if (B.dings < 3 && B.t >= B.dings * 0.42) { B.dings++; g.audio.play('clang'); }
      if (B.t > 6) { B.t = null; B.swing.rotation.x = 0; }
    }
    if (S && !g.room && !f.pr_stones) S.mat.emissiveIntensity = 1.1 + 0.45 * Math.sin(g.time * 2.6);
    if (this.pending && g.state === 'play' && (this.pending.t -= dt) <= 0) { const fn = this.pending.fn; this.pending = null; fn(); }
    // a nudge for a player stuck at the lid or at Doran's nap (HINTS-LESS: once, after a while, never for one who gets it)
    const W = g.world, near = (x, z, r) => !g.room && Math.hypot(h.pos.x - x, h.pos.z - z) < r;
    this.nudge(dt, 'lid', f.pr_lidStuck && !f.pr_lidOpen && !f.inWell && near(W.well.x, W.well.z, 10), 30, 'pr_nudge_kick', { b: g.hud.key('b3'), k: g.hud.key('interact') });
    if (B) this.nudge(dt, 'bell', f.metXil && !f.pr_bell && !f.stamp && near(B.x, B.z, 14), 35, 'pr_nudge_bell', { ball: g.hud.key('ball') });
    // overhearing the kids (Discreet mode, close and quiet)
    if (!g.room && !f.overheard && h.behaviour === 'discreet') {
      const tim = this.speaker('tim');
      if (tim && h.distTo(tim) < 3.6) {
        f.overheard = true;
        this.chain([['lulu', 'pr_lulu_2'], ['tim', 'pr_tim_2a'], ['tim', 'pr_tim_2b'], ['lulu', 'pr_lulu_3']], () => g.updateObjective());
        return;
      }
    }
    // tremors once the story has started (outdoors)
    if (f.intro && !g.room && h.hasBall) {
      this.tremorT -= dt;
      if (this.tremorT <= 0) {
        this.tremorT = 55 + Math.random() * 40;
        g.camRig.shake(0.7);
        g.audio.play('rumble');
        g.particles.burst(h.pos.x, h.pos.y + 0.2, h.pos.z, '#c8b48a', 20, 3);
        // (felt and heard; said in words only for a player who turned the camera shake off)
        if (!f.tremorSeen) { f.tremorSeen = true; if (g.settings?.shake === 'off') g.hud.toast('pr_toast_tremor'); }
      }
    }
    // reaching the vein
    if (g.room === g.rooms.well && !f.sendellHeard && f.nodes >= 3) {
      if (h.pos.x > g.room.chamberX) this.startSendell();
    }
  }
}
