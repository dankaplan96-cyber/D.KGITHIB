// HAMALAYI-LIFE (the Hamalayi at Citadel's bar, docs/lba-maturity/hamalayi-inventory.md): the monastery's hall inside,
// and what the story's phases change in Lhar's houses (story/hamlife.js reads both).
//
// The hall (ham_hall): the monks' prayer hall behind the red double door on the porch (hamalayi.js R.monastery.hall),
// the same whitewashed stone and dark timber as Lhar's rooms (ihomes.js 'ham-' style), in LBA's cut-away shell
// (zhomes.js esmerRoom: the door in the left far wall, low near rims). At the back the altar with the blue stone that
// came down from the observatory when it was Sendell's shrine, and the butter lamps; on the left wall the big prayer
// wheel (it turns: R.wheel.spin()); in the back right corner the tea stove (a cup gives life back: story/hamlife.js);
// cushions in two rows; from the day Lhar comes up the lift until it goes home, the villagers' bedrolls along the near
// rims (R.setGuests). Its keeper is Brother Tenpa (story/hamlife.js), on a round of the stove, the lamps and the wheel.
//
// Lhar's five houses (ihomes.js builds them; IH[rid].placed and .frame say where each piece stands): dressLharRoom adds
// what a phase leaves in them — the bundles tied by the door on moving day ('pack'), and the mending ('mend': mortar and
// new slates in Bero's, new flags strung across Sana's, the bowls stacked in Lhamo's) — each a group shown by its phase.
//
// CONTRACT
//   HAM_ROOMS ['ham_hall']; HAM_AT { id: {x, z} }; buildHamRoom(id)(scene, physics) → { [id]: R }
//   HR[id] (when built): { looks [{x, z, r, key, at}], npcSpots { monk }, round [stops] }
//   R.wheel { x, z, spin() }; R.tea { x, z }; R.altar { x, z }; R.beds { x, z }; R.setGuests(b)
//   dressLharRoom(R, info, room, physics) → { set(phase, home), shown }   (info: ihomes IH[rid]; room: 'lhar0'…'lhar4')
import * as THREE from 'three';
import { esmerRoom } from './zhomes.js';
import { Kit, MAT, rbox, cyl, sphere, crate, rug, hangingLamp, potStove, kettle, jar, barrel } from './props.js';
import { sackPile, hanging } from './roomdress.js';

export const HAM_ROOMS = ['ham_hall'];
export const HAM_AT = { ham_hall: { x: 11300, z: -700 } };
export const HR = {};

const RED = '#8a2a22', GOLD = '#e8b84a', CUSHION = '#8a2a3a';
const flagCols = ['#d8302a', '#e8c030', '#2f8a3a', '#2a6ad8', '#f4f4f4'];

function hall(scene, physics) {
  const W = 10, D = 7.2, H = 3.6, doorZ = +(D / 2 - 1.35).toFixed(2);
  const o = esmerRoom('ham_hall', { W, D, H, wall: '#ece2d2', dado: RED, floorMat: MAT.planks('dark'), doorZ, windows: [-0.6], light: '#ffd8a8', at: HAM_AT.ham_hall, reg: HR, band: false, music: 'mountain', frame: '#5a3a2a', capCol: '#d8c8b0', view: 11 }, scene, physics);
  const { B, R, k, LX, BZ } = o, RX = W / 2, FZ = D / 2;
  R.surface = 'wood';
  const S = HR.ham_hall;
  // the altar on the back wall: a stepped dais, a draped table, the blue stone on its stand, the butter lamps
  const AX = 1.5;
  k.add(rbox(4.0, 0.25, 1.4, 0.04), MAT.stone('sand'), AX, 0.125, BZ + 0.7);
  k.add(rbox(3.0, 0.7, 0.75, 0.04), MAT.wood('dark'), AX, 0.6, BZ + 0.5);
  k.add(rbox(3.1, 0.05, 0.85, 0.02), MAT.cloth('#c8452f', GOLD), AX, 0.97, BZ + 0.5);
  k.add(rbox(3.12, 0.42, 0.04, 0.01), MAT.cloth(GOLD, '#c8452f'), AX, 0.78, BZ + 0.93);
  k.add(cyl(0.16, 0.24, 0.32, 10), MAT.brass(), AX, 1.15, BZ + 0.42);
  for (let i = 0; i < 7; i++) {
    const x = AX - 1.2 + i * 0.4;
    k.add(cyl(0.05, 0.035, 0.08, 8), MAT.brass(), x, 1.03, BZ + 0.78);
    k.add(sphere(0.03, 6, 5), MAT.glow('#ffd070', '#ffb030', 2.2), x, 1.1, BZ + 0.78, 0, { sy: 1.6 });
  }
  for (const s of [-1, 1]) k.add(cyl(0.12, 0.1, 0.22, 10), MAT.brass(), AX + s * 1.25, 1.1, BZ + 0.35);
  B.col(AX, BZ + 0.6, 2.0, 0.65, 1.0, { noStand: true });
  // the blue stone: its own mesh (its glow), with a cold light of its own
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0).scale(1, 1.6, 1), new THREE.MeshStandardMaterial({ color: '#9fd8ff', emissive: '#6ab8ff', emissiveIntensity: 1.2, roughness: 0.2, flatShading: true }));
  stone.position.set(AX, 1.62, BZ + 0.42); o.R.group.add(stone);
  B.light('#bfe4ff', 1.6, 5, AX, 1.9, BZ + 1.3);
  R.updaters.push((dt, t) => { stone.rotation.y = t * 0.3; stone.material.emissiveIntensity = 1.1 + Math.sin(t * 1.3) * 0.2; });
  // hangings either side of the altar, prayer flags under the beam
  for (const x of [AX - 2.6, AX + 2.75]) k.at(x, 1.7, BZ + 0.04, 0, () => hanging(k, { w: 0.9, h: 1.4, bands: [RED, '#f2ead6', GOLD, '#2f6a9a', RED] }));
  for (let i = 0; i < 14; i++) k.add(rbox(0.22, 0.3, 0.01, 0.003), MAT.cloth(flagCols[i % 5], '#000000'), LX + 0.6 + i * 0.62, H - 0.55, BZ + 0.06);
  // the big prayer wheel on the left wall, between the window and the back corner: a frame, and a drum that turns
  const WZ = -2.45;
  k.add(rbox(0.9, 0.12, 0.9, 0.02), MAT.wood('dark'), LX + 0.55, 0.06, WZ);
  k.add(rbox(0.9, 0.1, 0.9, 0.02), MAT.wood('dark'), LX + 0.55, 1.95, WZ);
  for (const s of [-1, 1]) k.add(rbox(0.08, 1.95, 0.08, 0.01), MAT.wood('dark'), LX + 0.55, 1.0, WZ + s * 0.42);
  const drum = new THREE.Group(); drum.position.set(LX + 0.55, 0.12, WZ); o.R.group.add(drum);
  const dm = new THREE.Mesh(cyl(0.38, 0.38, 1.4, 16), MAT.paint(RED, 0.5)); dm.position.y = 0.88; dm.castShadow = true; drum.add(dm);
  for (const y of [0.25, 0.88, 1.5]) { const b = new THREE.Mesh(cyl(0.395, 0.395, 0.08, 16), MAT.brass()); b.position.y = y; drum.add(b); }
  for (let i = 0; i < 8; i++) { const g = new THREE.Mesh(rbox(0.06, 0.3, 0.02, 0.005), MAT.paint(GOLD, 0.4)); const a = (i / 8) * Math.PI * 2; g.position.set(Math.sin(a) * 0.39, 0.55 + (i % 2) * 0.62, Math.cos(a) * 0.39); g.rotation.y = a; drum.add(g); }
  B.ccol(LX + 0.55, WZ, 0.5, 2.0, { noStand: true });
  let spinV = 0.15;
  R.updaters.push((dt) => { drum.rotation.y += spinV * dt; spinV = Math.max(0.15, spinV - dt * 0.8); });
  R.wheel = { x: o.X(LX + 0.55), z: o.Z(WZ), spin() { spinV = 4.5; } };
  // the tea stove in the back right corner, its urn and a tray of cups
  B.put(RX - 0.6, BZ + 0.55, 0, (kk) => potStove(kk));
  k.at(RX - 1.45, 0, BZ + 0.4, 0, () => { k.add(rbox(0.7, 0.75, 0.5, 0.03), MAT.wood('dark'), 0, 0.375, 0); kettle(k, -0.12, 0.75, 0); for (let i = 0; i < 3; i++) k.add(cyl(0.05, 0.04, 0.07, 8), MAT.paint('#f2ead6', 0.4), 0.12 + (i % 2) * 0.1, 0.785, -0.1 + i * 0.1); });
  B.col(RX - 1.45, BZ + 0.4, 0.36, 0.26, 0.8, { noStand: true });
  R.tea = { x: o.X(RX - 1.0), z: o.Z(BZ + 0.5) };
  // cushions in two rows facing the altar, a long rug down the middle
  k.at(AX - 0.3, 0, 0.6, 0, () => rug(k, 4.6, 2.6, [RED, GOLD, '#2f6a9a', RED, '#f2ead6'], 4));
  for (const z of [0.0, 1.2]) for (const x of [-0.6, 0.6, 1.8, 3.0]) k.add(rbox(0.55, 0.12, 0.55, 0.05), MAT.cloth(CUSHION, GOLD), x, 0.07, z);
  // the villagers' bedrolls along the near rims, their bundles (shown while Lhar lives up here: R.setGuests)
  const guests = new THREE.Group(); o.R.group.add(guests);
  const kg = new Kit(guests);
  for (let i = 0; i < 5; i++) {
    const x = -1.5 + i * 1.15;
    kg.add(rbox(0.85, 0.1, 1.8, 0.04), MAT.cloth(['#c8452f', '#2f7a9a', '#e8b84a', '#6a8a4a', '#7a4aa8'][i], '#f2e6d0'), x, 0.05, FZ - 1.05);
    kg.add(cyl(0.14, 0.14, 0.75, 10), MAT.cloth('#f2e6d0', '#c8a080'), x, 0.16, FZ - 0.25, 0, { rz: Math.PI / 2 });
  }
  for (const z of [-1.3, -0.15]) { kg.add(rbox(1.8, 0.1, 0.85, 0.04), MAT.cloth('#a8582a', '#f2e6d0'), RX - 1.05, 0.05, z); kg.add(cyl(0.14, 0.14, 0.75, 10), MAT.cloth('#f2e6d0', '#c8a080'), RX - 0.25, 0.16, z, Math.PI / 2, { rz: Math.PI / 2 }); }
  kg.at(4.4, 0, FZ - 0.45, 0.3, () => sackPile(kg, { seed: 11 }));
  kg.at(-2.6, 0, FZ - 0.35, 0, () => crate(kg, 0.5, { pal: 'honey' }));
  kg.flush();
  R.setGuests = (b) => { guests.visible = !!b; R.guests = !!b; };
  R.beds = { x: o.X(1.0), z: o.Z(FZ - 1.0) };
  R.altar = { x: o.X(AX), z: o.Z(BZ + 0.6) };
  // lamps, light
  for (const x of [-1.6, 2.6]) k.at(x, 0, 0.4, 0, () => hangingLamp(k, H - 0.8, H, { shade: RED }));
  B.light('#ffcf98', 2.0, 8, 0.4, 2.2, 0.6);
  // the looks and the keeper's round (story/hamlife.js: interactables and Brother Tenpa)
  S.looks.push({ x: o.X(AX), z: o.Z(BZ + 1.9), r: 2.1, key: 'hh_altar', at: R.altar });
  S.round = [
    { x: o.X(RX - 1.4), z: o.Z(BZ + 1.15), a: Math.PI, anim: 'tinker', t: 7 },
    { x: o.X(AX + 0.6), z: o.Z(BZ + 1.75), a: Math.PI, anim: 'reach', t: 6 },
    { x: o.X(LX + 1.45), z: o.Z(WZ + 0.2), a: -Math.PI / 2, anim: 'reach', t: 4 },
    { x: o.X(AX - 0.9), z: o.Z(BZ + 1.8), a: Math.PI, anim: 'wipe', t: 6 },
  ];
  S.npcSpots.monk = S.round[0];
  return { ham_hall: B.finish() };
}

export const buildHamRoom = (id) => (scene, physics) => hall(scene, physics);

// ---------------------------------------------------------------- Lhar's houses by the story's phase
// (R: the room ihomes.js built; info: its IH entry; which: 'lhar0'…'lhar4'). Free floor is found against the room's own
// pieces (info.placed) and the door's way in, so nothing here stands in a piece or the doorway.
export function dressLharRoom(R, info, which, physics) {
  const F = info.frame, gp = R.group.position;
  const taken = info.placed.map((q) => ({ x0: q.x - gp.x - q.hx - 0.08, x1: q.x - gp.x + q.hx + 0.08, z0: q.z - gp.z - q.hz - 0.08, z1: q.z - gp.z + q.hz + 0.08 }));
  taken.push({ x0: F.LX - 0.1, x1: F.LX + 2.2, z0: F.doorZ - 1.0, z1: F.doorZ + 1.0 });
  for (const l of info.looks) taken.push({ x0: l.x - gp.x - 0.35, x1: l.x - gp.x + 0.35, z0: l.z - gp.z - 0.35, z1: l.z - gp.z + 0.35 });
  const free = (x, z, hx, hz) => x - hx >= F.LX + 0.05 && x + hx <= F.RX - 0.05 && z - hz >= F.BZ + 0.05 && z + hz <= F.FZ - 0.05 && !taken.some((q) => x + hx > q.x0 && x - hx < q.x1 && z + hz > q.z0 && z - hz < q.z1);
  // a free place for low things, nearest the near rim or the right rim (the camera looks over them there)
  const spot = (hx, hz) => {
    let best = null;
    for (let x = F.LX + hx + 0.1; x <= F.RX - hx - 0.08; x += 0.1) for (let z = F.BZ + hz + 0.08; z <= F.FZ - hz - 0.08; z += 0.1) {
      if (!free(x, z, hx, hz)) continue;
      const d = Math.min(F.FZ - hz - z, F.RX - hx - x);
      if (!best || d < best[2]) best = [x, z, d];
    }
    if (!best) return null;
    const [x, z] = best; taken.push({ x0: x - hx - 0.1, x1: x + hx + 0.1, z0: z - hz - 0.1, z1: z + hz + 0.1 });
    return [x, z];
  };
  const sets = {}, cols = {};
  const group = (name, fill) => { const g = new THREE.Group(); g.visible = false; R.group.add(g); const kk = new Kit(g); fill(kk); kk.flush(); sets[name] = g; };
  // (each set's things are solid while shown: a box over them, off with the set)
  const solid = (name, x, z, hw, hd, top) => { const c = physics.add({ type: 'box', x: gp.x + x, z: gp.z + z, hw, hd, top, noStand: true }); c.enabled = false; R.colliders?.push(c); (cols[name] ||= []).push(c); };
  // moving day: two tied bundles and a corded crate
  group('pack', (kk) => {
    // (PLACE-1: the bundles and the crate side by side: the crate stood 12 cm into the sacks)
    const p = spot(0.76, 0.36);
    if (!p) return;
    solid('pack', p[0], p[1], 0.76, 0.36, 0.6);
    kk.at(p[0] - 0.36, 0, p[1], 0.2, () => sackPile(kk, { seed: 3 + which.length }));
    kk.at(p[0] + 0.42, 0, p[1], -0.1, () => { crate(kk, 0.55, { pal: 'honey' }); for (const s of [-1, 1]) kk.add(rbox(0.57, 0.02, 0.03, 0.005), MAT.cloth('#c8b08a', '#a89070'), 0, 0.3 + s * 0.12, 0.29); });
  });
  // mending, in the houses whose people come down to it
  group('mend', (kk) => {
    if (which === 'lhar4') {   // Sana's: new flags strung across the room, under the beam
      const y = 2.3, n = Math.floor((F.RX - F.LX - 1.2) / 0.5);
      kk.add(cyl(0.008, 0.008, F.RX - F.LX - 0.8, 4), MAT.paint('#c8b08a', 0.9), (F.LX + F.RX) / 2, y + 0.16, (F.BZ + F.FZ) / 2, 0, { rz: Math.PI / 2 });
      for (let i = 0; i < n; i++) kk.add(rbox(0.3, 0.32, 0.01, 0.003), MAT.cloth(flagCols[i % 5], '#000000'), F.LX + 0.8 + i * 0.5, y, (F.BZ + F.FZ) / 2);
    }
    const p = spot(0.5, 0.34);
    if (!p) return;
    solid('mend', p[0], p[1], 0.5, 0.34, 0.45);
    if (which === 'lhar3') {   // Bero's: a tub of mortar, new slates, a trowel
      kk.at(p[0] - 0.22, 0, p[1], 0, () => { barrel(kk, { r: 0.24, h: 0.4, pal: 'dark' }); kk.add(cyl(0.22, 0.22, 0.02, 12), MAT.paint('#b8b0a0', 0.9), 0, 0.39, 0); });
      for (let i = 0; i < 5; i++) kk.add(rbox(0.4, 0.03, 0.26, 0.01), MAT.paint('#6a7080', 0.7), p[0] + 0.26, 0.02 + i * 0.035, p[1], i * 0.06);
      kk.add(rbox(0.22, 0.015, 0.1, 0.004), MAT.steel(), p[0] - 0.22, 0.42, p[1] + 0.05, 0.4);
    } else if (which === 'lhar4') {   // Sana's: and a sack of wool
      kk.at(p[0], 0, p[1], 0, () => sackPile(kk, { seed: 21 }));
    } else if (which === 'lhar0') {   // Lhamo's: bowls stacked, a basket of roots
      for (let i = 0; i < 6; i++) kk.add(cyl(0.12, 0.08, 0.06, 10), MAT.paint('#d8c8a8', 0.6), p[0] - 0.22, 0.03 + i * 0.065, p[1]);
      kk.at(p[0] + 0.18, 0, p[1], 0, () => { jar(kk, 0, 0, 0, 'jar', '#a85030', 1.2); jar(kk, 0.18, 0, 0.08, 'jar', '#c8a050', 1.0); });
    } else {
      kk.at(p[0], 0, p[1], 0, () => crate(kk, 0.5, { pal: 'pale' }));
    }
  });
  // the hearth: lit while somebody lives here, low and cold while the house stands empty
  const base = R.lights.map((l) => l.userData.base);
  return {
    shown: null, home: null,
    set(phase, home) {
      this.shown = phase && sets[phase]?.children.length ? phase : null; this.home = !!home;
      for (const [name, g] of Object.entries(sets)) { g.visible = name === phase; for (const c of cols[name] || []) c.enabled = g.visible; }
      R.lights.forEach((l, i) => { l.userData.base = base[i] * (home ? 1 : 0.3); if (l.intensity) l.intensity = l.userData.base; });
    },
  };
}
