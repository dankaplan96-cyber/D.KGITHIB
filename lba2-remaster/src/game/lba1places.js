// LBA1's places, rebuilt from their layouts (src/game/lba1room.js, assets/lba1/*.json, numbers only):
//   asylum   FunFrock's asylum on Citadel (LBA1 room 0, where LBA1 began). Its door is a squat stone block-house
//            outside the old fort's east wall; inside, Vesk's project keeps a store and posts guards where FunFrock's
//            nurses and clone stood (the original actors' spots): Quetch guards, a fat trooper, two guard dogs.
//            The old register lies in the office (a search), a giver behind the desk.
//   bumaze   the Temple of Bù's spiked maze (LBA1 room 57), down a stair from our Temple of Bù (chapter 4)
//   buhalls  the temple's dark halls (LBA1 room 40), past the maze; crystal mites where LBA1 had its creatures,
//            and at the far end the way back up
// Doors and exits are open in every chapter (src/game/story/index.js via lba1Doors / lba1Exit).
import * as THREE from 'three';
import { buildLba1Room, hasLba1Room } from './lba1room.js';
import { MAT, rbox, plane, cyl, canvasTex } from './props.js';

export const LBA1_AT = { asylum: { x: 7000, z: 0 }, bumaze: { x: 7200, z: 0 }, buhalls: { x: 7400, z: 0 } };
export const ASYLUM_DOOR = { x: -11.2, z: -65, a: Math.PI / 2 };   // (outside the fort's east wall, facing east)

const signTex = (lines) => canvasTex(512, 160, (x, W, H) => {
  x.fillStyle = '#d8d4c8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a3a40'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#2a2a30'; x.textAlign = 'center'; x.font = 'bold 40px serif'; x.fillText(lines[0], W / 2, 62);
  x.font = '26px serif'; x.fillText(lines[1], W / 2, 112);
});

// the block-house over the asylum's stair, on Citadel (world coordinates)
function asylumDoor(scene, physics) {
  const { x, z } = ASYLUM_DOOR, gy = physics.groundAt(x + 1.5, z);
  const g = new THREE.Group(); g.position.set(x, gy, z); scene.add(g);
  const stone = MAT.stone('grey', 2), iron = MAT.iron();
  const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(rbox(3.0, 2.8, 3.6, 0.08), stone, -0.3, 1.4, 0);
  add(rbox(3.3, 0.25, 3.9, 0.05), MAT.rubble('grey'), -0.3, 2.9, 0);
  add(rbox(0.12, 2.0, 1.3, 0.02), iron, 1.25, 1.0, 0);
  for (const s of [-1, 1]) add(rbox(0.16, 2.2, 0.16, 0.02), MAT.paint('#5a2a2a', 0.5), 1.27, 1.1, s * 0.72);
  // FunFrock's old emblem over the door, painted out
  add(new THREE.CircleGeometry(0.32, 16), MAT.flat('#7a3a3a', 0.8), 1.33, 2.35, 0, Math.PI / 2);
  add(plane(1.5, 0.47), MAT.map(signTex(['Citadel Asylum', 'Closed by order of the Council']), 0.8, { side: THREE.DoubleSide }), 1.6, 1.5, 1.35, Math.PI / 2);
  add(cyl(0.05, 0.06, 1.2, 6), MAT.wood('dark'), 1.6, 0.6, 1.35);
  physics.add({ type: 'box', x: x - 0.3, z, hw: 1.5, hd: 1.8, rot: 0, top: gy + 3.0 });
  return { x: x + 1.65, z };
}

let DOOR = null;
export function buildLba1Places(scene, physics) {
  const A = LBA1_AT, out = {};
  if (hasLba1Room('asylum')) {
    const R = out.asylum = buildLba1Room(scene, physics, 'asylum', 'asylum', A.asylum.x, A.asylum.z, { stone: 'grey', lamp: '#e8f0ff', view: 24 });
    DOOR = asylumDoor(scene, physics);
    // the low stair-well (the original's exit to the yard) leads out; you come in at its top
    const ex = R.cell(10.5, 1, 42.6), sp = R.cell(10.5, 5, 39.8);
    R.exits.push({ x: ex.x, z: ex.z, r: 1.0, to: 'asylum-out' });
    R.spawn = { x: sp.x, z: sp.z, a: Math.PI };
    // the office (the clone statues' room): the old register, and a giver behind the desk
    const reg = R.cell(46.5, 14, 23.5);
    R.searches.push({ id: 'asylum_register', x: reg.x, z: reg.z, r: 1.6 });
    const gv = R.cell(50.5, 14, 22.5);
    R.givers.push({ id: 'asylum_desk', x: gv.x, z: gv.z, y: gv.y, r: 1.2, top: 1, kinds: ['money', 'life', 'clover'], n: 3 });
  }
  if (hasLba1Room('bumaze')) {
    const R = out.bumaze = buildLba1Room(scene, physics, 'bumaze', 'bumaze', A.bumaze.x, A.bumaze.z, { stone: 'slate', lamp: '#9fc8ff', lampI: 9, view: 16, noCut: true, tint: 1.6 });
    R.cave = true; R.music = 'cave';
    const back = R.cell(14, 1, 19.0), goal = R.cell(14, 1, 11);
    R.exits.push({ x: back.x, z: back.z, r: 0.9, room: 'butemple' });
    R.exits.push({ x: goal.x, z: goal.z, r: 0.8, room: 'buhalls' });
    R.goal = goal;
  }
  if (hasLba1Room('buhalls')) {
    const R = out.buhalls = buildLba1Room(scene, physics, 'buhalls', 'buhalls', A.buhalls.x, A.buhalls.z, { stone: 'slate', lamp: '#9fc8ff', lampI: 12, view: 24, tint: 1.6 });
    R.cave = true; R.music = 'cave';
    const st = R.cell(3, 17, 3.2), far = R.cell(61, 17, 1.4), give = R.cell(61, 17, 4);
    R.spawn = { x: st.x, z: st.z, a: 0 };
    R.entries = { bumaze: R.spawn };
    R.exits.push({ x: far.x, z: far.z, r: 1.0, room: 'butemple' });
    R.givers.push({ id: 'bu_halls', x: give.x, z: give.z, y: give.y, r: 1.2, top: 1, kinds: ['life', 'magic', 'clover'], n: 3 });
    R.mites = (R.spots || []).filter((s) => s.body === 59).slice(0, 6);
  }
  if (out.bumaze && out.buhalls) out.bumaze.entries = { butemple: out.bumaze.spawn };
  return out;
}

export function lba1Doors() { return DOOR ? [{ x: DOOR.x, z: DOOR.z, r: 0.9, room: 'asylum' }] : []; }
export function lba1Exit(to) {
  if (to === 'asylum-out' && DOOR) return { x: DOOR.x + 1.3, z: DOOR.z, a: Math.PI / 2 };
  return null;
}

// the asylum's guards, where LBA1's nurses (bodies 9, 11) and clone (13) stood; the halls' crystal mites
export function lba1EnemyDefs(rooms) {
  const out = [], A = rooms.asylum, H = rooms.buhalls;
  const after = (f) => !!f.prologueDone;
  if (A?.spots) {
    let n = 0;
    for (const s of A.spots) {
      if (s.body === 9 || s.body === 11) out.push({ id: 'asy_g' + n++, kind: n % 3 === 0 ? 'guardG' : 'guard', group: 'asylum', x: s.x, z: s.z, patrol: [[s.x, s.z], [s.x + 1.6, s.z]], when: after });
      else if (s.body === 13) out.push({ id: 'asy_fc', kind: 'fclone', group: 'asylum', x: s.x, z: s.z, patrol: [[s.x, s.z]], when: after });
    }
    const d1 = A.cell(30, 5, 30), d2 = A.cell(20, 5, 20);
    out.push({ id: 'asy_dog1', kind: 'gdog', coat: 'grey', group: 'asylum', x: d1.x, z: d1.z, patrol: [[d1.x, d1.z], [d1.x + 3, d1.z]], when: after });
    out.push({ id: 'asy_dog2', kind: 'gdog', coat: 'brown', group: 'asylum', x: d2.x, z: d2.z, patrol: [[d2.x, d2.z], [d2.x, d2.z + 3]], when: after });
  }
  if (H?.mites) H.mites.forEach((m, i) => out.push({ id: 'buh_mite' + i, kind: 'mite', group: 'buhalls', x: m.x, z: m.z }));
  return out;
}
