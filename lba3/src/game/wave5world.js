// WAVE 5 (docs/lba-maturity/WAVE5.md; CONTENT-15H.md §3 H-12, H-13, H-14): the pieces in the world. Ours: our own
// geometry and canvas textures; nothing from LBA1/LBA2. The story that plays them: story/wave5.js.
//
//   chalkList    Nell's chalk list: a small slate on two legs at the end of her bench (Citadel lane)
//   tinStack     a rock stack one storey high (2.35 m: out of a jump's reach, ~1.2–1.4 m) with one of Baldino's lilac
//                tins on its flat top: freestanding, so from its top neither a jump nor the hop-pack reaches anything
//                new (the spot is searched by story/wave5.js with the test step's rule, arsenal.js stepSpot)
//   cistern      the monastery yard's old cistern: a low stone door in a stone head against the yard wall, a timber
//                gallows beside it with a stone basin hung on its chain (its water rises in six steps; full, the
//                door slides up), the monks' bucket by the trough, the broken ice at the trough's spout, and in the
//                open doorway the seed store: shelves of jars, a tea urn on a warm stone, a bowl of coins
//   seam         the old adit's side drift under Celebration: an old timber frame packed with loose stones, a dark
//                crack behind them and a glint in it (shown by the lantern), the stones gone once the glove breaks them
//   stake        one of Ilka's survey stakes: a numbered post with a little red tell-tale flag that lifts in warm air
import * as THREE from 'three';
import { MAT, M, rbox, cyl, sphere, canvasTex, plane, Kit } from './props.js';
import { rockGeometry } from './vegetation.js';
import { crystalMats, crystalCluster } from './crystallook.js';

export const W5 = {};

// a group at a world point inside an area's group (the area's own group is offset: the regions' AT)
function holder(parent, x, y, z, ry = 0, name = 'wave5') {
  const grp = new THREE.Group(), gp = parent.position; grp.name = name;
  grp.position.set(x - gp.x, y - gp.y, z - gp.z); grp.rotation.y = ry; parent.add(grp);
  return grp;
}
// local (lx, lz) round (x, z) turned by ry → world
export const turn = (x, z, ry, lx, lz) => ({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) });

const lilac = () => M('w5-lilac', () => new THREE.MeshStandardMaterial({ color: '#9a7ab8', roughness: 0.55, metalness: 0.15 }));
const chalkTex = () => M('w5-chalktex', () => canvasTex(256, 192, (x, W, H) => {
  x.fillStyle = '#2c3430'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#7a5a3a'; x.lineWidth = 12; x.strokeRect(0, 0, W, H);
  x.fillStyle = 'rgba(240,236,224,0.88)'; x.font = 'bold 22px sans-serif'; x.textAlign = 'left';
  ['TUNE-UPS', 'LANCE . . 15', 'FLASK . . 20', 'HOP-PACK  25'].forEach((l, i) => x.fillText(l, 22, 44 + i * 40));
  x.strokeStyle = 'rgba(240,236,224,0.7)'; x.lineWidth = 3; x.beginPath(); x.moveTo(22, 52); x.lineTo(150, 52); x.stroke();
}));

// ---------------------------------------------------------------- Nell's chalk list (Citadel: the world's root)
export function buildChalkList(parent, x, y, z, ry) {
  if (W5.list) return W5.list;
  const grp = holder(parent, x, y, z, ry, 'wave5 list'), k = new Kit(grp), wood = MAT.wood('dark');
  for (const s of [-1, 1]) k.add(rbox(0.06, 1.05, 0.06, 0.01), wood, s * 0.3, 0.52, -0.05, 0, { rx: 0.12 });
  k.add(rbox(0.04, 0.9, 0.04, 0.01), wood, 0, 0.45, 0.22, 0, { rx: -0.35 });
  k.add(rbox(0.72, 0.56, 0.04, 0.01), wood, 0, 0.88, -0.02, 0, { rx: 0.12 });
  k.flush();
  const face = new THREE.Mesh(plane(0.64, 0.48), new THREE.MeshStandardMaterial({ map: chalkTex(), roughness: 0.95 }));
  face.position.set(0, 0.88, 0.005); face.rotation.x = -0.12; grp.add(face);
  W5.list = { grp, x, z, y };
  return W5.list;
}

// ---------------------------------------------------------------- Baldino's tin on a rock stack
const STACK_H = 2.35;
export function buildTinStack(parent, physics, id, x, y, z, { color = '#b8ab98', seed = 3, snow = false } = {}) {
  W5.tins ||= {};
  if (W5.tins[id]) return W5.tins[id];
  const grp = holder(parent, x, y, z, seed * 0.7, 'wave5 tin' + id), k = new Kit(grp);
  const rockM = MAT.flat(color, 0.92, { vertexColors: true });
  // three rocks, narrowing upward, and a flat cap stone on top to stand on (its top at STACK_H)
  k.add(rockGeometry(seed), rockM, 0, 0.35, 0, 0, { sx: 1.25, sy: 1.25, sz: 1.15 });
  k.add(rockGeometry(seed + 1), rockM, 0.08, 1.25, -0.05, 1.1, { sx: 0.95, sy: 1.0, sz: 0.9 });
  k.add(rockGeometry(seed + 2), rockM, -0.05, 1.85, 0.04, 2.3, { sx: 0.82, sy: 0.42, sz: 0.78 });
  k.add(rbox(1.3, 0.2, 1.15, 0.08), MAT.flat(color, 0.95), 0, STACK_H - 0.1, 0, 0.3);
  if (snow) k.add(rbox(1.0, 0.06, 0.8, 0.03), MAT.flat('#f4f6fa', 0.9), 0.1, STACK_H + 0.02, 0.05, 0.5);
  k.flush();
  // the tin: lilac, a brass lid, Baldino's little red bobble on a wire
  const tin = new THREE.Group(); tin.position.set(0.25, STACK_H + (snow ? 0.05 : 0), 0.15); grp.add(tin);
  const body = new THREE.Mesh(cyl(0.13, 0.13, 0.22, 14), lilac()); body.position.y = 0.11; body.castShadow = true; tin.add(body);
  const lid = new THREE.Mesh(cyl(0.135, 0.135, 0.04, 14), MAT.brass()); lid.position.y = 0.23; tin.add(lid);
  const wire = new THREE.Mesh(cyl(0.006, 0.006, 0.18, 4), MAT.iron()); wire.position.set(0.05, 0.33, 0); wire.rotation.z = -0.3; tin.add(wire);
  const bob = new THREE.Mesh(sphere(0.025, 8, 6), MAT.flat('#e8403a', 0.5)); bob.position.set(0.08, 0.41, 0); tin.add(bob);
  const col = physics.add({ type: 'cyl', x, z, r: 0.75, top: y + STACK_H });
  const S = { id, grp, tin, x, z, y, top: y + STACK_H, col, tinAt: turn(x, z, seed * 0.7, 0.25, 0.15), setTin(on) { tin.visible = !!on; } };
  W5.tins[id] = S;
  return S;
}
export const TIN_H = STACK_H;

// ---------------------------------------------------------------- the monastery cistern (the Hamalayi)
// Local frame: origin on the yard's ground at the door's foot, +z out into the yard (the door faces +z), +x along the
// wall. The stone head is 1.8 m wide and 1.25 m deep (its back in the wall); the door 0.8 wide, 1.3 high; an iron arm
// out of the head's -x side holds the basin's pulley; the basin hangs at 1.1 m (empty) and sinks to 0.55 m (full) as
// the door rises (the chain runs over the pulley and through the lintel to the door's top).
export const CIST = { w: 1.8, d: 1.25, h: 1.9, door: { w: 0.8, h: 1.3 }, basin: { lx: -1.3, lz: 0.3, y0: 1.1, y1: 0.55, r: 0.4 } };
export function buildCistern(parent, physics, x, y, z, ry) {
  if (W5.cistern) return W5.cistern;
  const grp = holder(parent, x, y, z, ry, 'wave5 cistern'), k = new Kit(grp);
  const stone = MAT.stone('grey', 1), dark = MAT.flat('#0c0b0a', 1), wood = MAT.wood('dark'), iron = MAT.iron();
  const C = CIST, hw = C.w / 2;
  // the stone head: two jambs, a lintel, a slab roof; the dark of the stair behind the door
  k.add(rbox(hw - C.door.w / 2, C.h, C.d, 0.04), stone, -(C.door.w / 2 + (hw - C.door.w / 2) / 2), C.h / 2, -C.d / 2);
  k.add(rbox(hw - C.door.w / 2, C.h, C.d, 0.04), stone, (C.door.w / 2 + (hw - C.door.w / 2) / 2), C.h / 2, -C.d / 2);
  k.add(rbox(C.door.w + 0.02, C.h - C.door.h, C.d, 0.03), stone, 0, C.door.h + (C.h - C.door.h) / 2, -C.d / 2);
  k.add(rbox(C.w + 0.3, 0.16, C.d + 0.25, 0.04), MAT.stone('grey', 1), 0, C.h + 0.08, -C.d / 2 + 0.05);
  k.add(rbox(C.door.w, C.door.h, 0.06, 0.01), dark, 0, C.door.h / 2, -C.d + 0.08);
  k.add(rbox(C.door.w, 0.04, C.d - 0.1, 0.01), MAT.flat('#3a3632', 1), 0, 0.02, -C.d / 2);
  // the seed store, seen through the open door: two shelves of jars, the tea urn on its warm stone, the coin bowl
  const store = new THREE.Group(); grp.add(store);
  const sk = new Kit(store);
  for (const sy of [0.35, 0.8]) sk.add(rbox(C.door.w - 0.12, 0.04, 0.22, 0.01), wood, 0, sy, -C.d + 0.25);
  for (let i = 0; i < 5; i++) for (const sy of [0.35, 0.8]) sk.add(cyl(0.05, 0.06, 0.16, 8), MAT.flat(['#c8a070', '#b88a5a', '#d8c098'][i % 3], 0.7), -0.32 + i * 0.16, sy + 0.1, -C.d + 0.25);
  sk.add(rbox(0.36, 0.12, 0.3, 0.04), MAT.flat('#7a3a2a', 0.8, { emissive: '#ff5a20', emissiveIntensity: 0.35 }), 0.1, 0.06, -C.d + 0.62);
  sk.add(cyl(0.11, 0.13, 0.26, 10), MAT.copper(), 0.1, 0.25, -C.d + 0.62);
  sk.add(cyl(0.12, 0.1, 0.06, 10), MAT.flat('#8a6a4a', 0.8), -0.25, 0.03, -C.d + 0.6);
  sk.flush();
  // the door: a stone slab in the opening (slides up behind the lintel)
  const door = new THREE.Mesh(rbox(C.door.w - 0.04, C.door.h, 0.14, 0.02), MAT.stone('grey', 1)); door.position.set(0, C.door.h / 2, -0.07); door.castShadow = true; grp.add(door);
  // the arm: an iron bracket out of the head's side at the top, the pulley at its end over the basin
  const B = C.basin, armY = C.h - 0.05;
  k.add(rbox(-B.lx - hw + 0.25, 0.08, 0.08, 0.01), iron, (B.lx - hw) / 2 - 0.05, armY, B.lz - 0.05);
  k.add(rbox(0.06, 0.5, 0.06, 0.01), iron, -hw - 0.03, armY - 0.25, B.lz - 0.05, 0, { rz: 0.6 });
  k.add(new THREE.TorusGeometry(0.08, 0.022, 6, 12), iron, B.lx, armY - 0.1, B.lz);
  k.add(rbox(-B.lx - hw + 0.1, 0.03, 0.03, 0.01), iron, (B.lx - hw) / 2, armY + 0.02, B.lz);
  k.flush();
  const chainM = MAT.iron();
  const chainTop = new THREE.Mesh(cyl(0.015, 0.015, 1, 4), chainM); grp.add(chainTop);           // (pulley → basin: its length set)
  const basin = new THREE.Group(); grp.add(basin);
  const bk = new Kit(basin);
  bk.add(cyl(B.r, B.r * 0.75, 0.36, 14, 1, true), MAT.stone('grey', 1), 0, 0.18, 0);
  bk.add(cyl(B.r * 0.75, B.r * 0.75, 0.05, 14), MAT.stone('grey', 1), 0, 0.02, 0);
  for (let i = 0; i < 3; i++) { const a = i * 2.094; bk.add(cyl(0.01, 0.01, 0.75, 3), chainM, Math.sin(a) * B.r * 0.55, 0.55, Math.cos(a) * B.r * 0.55, 0, { rx: Math.cos(a) * -0.5, rz: Math.sin(a) * 0.5 }); }
  bk.flush();
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshStandardMaterial({ color: '#7ab8d8', roughness: 0.15, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; basin.add(water);
  // the solid: the head (not over the door's opening while it is open: a box for each jamb), the gallows' post, the basin
  const W = (lx, lz) => turn(x, z, ry, lx, lz);
  const jw = hw - C.door.w / 2;
  for (const s of [-1, 1]) { const p = W(s * (C.door.w / 2 + jw / 2), -C.d / 2); physics.add({ type: 'box', ...p, hw: jw / 2, hd: C.d / 2, rot: ry, top: y + C.h + 0.16, noStand: true }); }
  const dp = W(0, -0.3);
  const doorCol = physics.add({ type: 'box', ...dp, hw: C.door.w / 2, hd: 0.3, rot: ry, top: y + C.h, noStand: true });
  const bp = W(B.lx, B.lz); const basinCol = physics.add({ type: 'cyl', ...bp, r: B.r, top: y + B.y0 + 0.4, noStand: true });
  const S = {
    grp, x, z, y, ry, door, basin, water, store, doorCol, basinCol,
    basinAt: bp, doorAt: W(0, 0.55), inside: W(0, -0.6), urnAt: W(0.1, -C.d + 0.62),
    // k: 0..1 how full; open: 0..1 how far up the door is
    set(k, open) {
      const by = B.y0 + (B.y1 - B.y0) * Math.min(1, open);
      basin.position.set(B.lx, by, B.lz);
      water.visible = k > 0.01; water.position.y = 0.05 + 0.27 * k; water.scale.setScalar(B.r * (0.76 + 0.22 * k));
      door.position.y = C.door.h / 2 + C.door.h * 0.95 * open;
      store.visible = open > 0.05;
      // the chain: the pulley → the basin's hanger (its three chains meet 0.75 m over its foot)
      const pt = armY - 0.15, bt = by + 0.75;
      chainTop.scale.y = Math.max(0.05, pt - bt); chainTop.position.set(B.lx, (pt + bt) / 2, B.lz);
      doorCol.enabled = open < 0.5;
      basinCol.top = y + by + 0.4;
    },
  };
  S.set(0, 0);
  W5.cistern = S;
  return S;
}
// the bucket (a carried thing: shown by the trough while it waits there) and the broken ice at the trough's spout
export function buildBucket(parent, x, y, z) {
  if (W5.bucket) return W5.bucket;
  const grp = holder(parent, x, y, z, 0.4, 'wave5 bucket'), k = new Kit(grp);
  k.add(cyl(0.17, 0.13, 0.3, 12, 1, true), MAT.wood('honey'), 0, 0.15, 0);
  k.add(cyl(0.13, 0.13, 0.03, 12), MAT.wood('dark'), 0, 0.02, 0);
  for (const yy of [0.06, 0.26]) k.add(new THREE.TorusGeometry(0.16 - (0.26 - yy) * 0.12, 0.012, 4, 14), MAT.iron(), 0, yy, 0, 0, { rx: Math.PI / 2 });
  k.add(new THREE.TorusGeometry(0.16, 0.01, 4, 12, Math.PI), MAT.iron(), 0, 0.3, 0);
  k.flush();
  W5.bucket = { grp, x, z, y, show(on) { grp.visible = !!on; } };
  return W5.bucket;
}
export function buildIceHole(parent, x, y, z, ry) {
  if (W5.iceHole) return W5.iceHole;
  const grp = holder(parent, x, y, z, ry, 'wave5 icehole');
  const w = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshStandardMaterial({ color: '#3a6a88', roughness: 0.1 }));
  w.rotation.x = -Math.PI / 2; w.position.y = 0.012; grp.add(w);
  const k = new Kit(grp);
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.3; k.add(rbox(0.12, 0.025, 0.08, 0.01), MAT.flat('#dff2fa', 0.3), Math.sin(a) * 0.27, 0.02, Math.cos(a) * 0.24, a); }
  k.flush();
  W5.iceHole = { grp };
  return W5.iceHole;
}

// ---------------------------------------------------------------- the old adit's seam (Under Celebration)
// Local frame: origin on the ground at the frame's foot, +z out of the rock.
export function buildSeam(parent, physics, x, y, z, ry, rockMat) {
  if (W5.seam) return W5.seam;
  const grp = holder(parent, x, y, z, ry, 'wave5 seam'), k = new Kit(grp), timber = MAT.wood('dark');
  const rm = rockMat || MAT.flat('#b8a8c0', 0.92, { vertexColors: true, emissive: '#3a2030', emissiveIntensity: 0.35 });
  // the rock round it (the island's own rock shapes), the frame (two legs and a cap, sagging), the dark behind
  for (const [rx, ry0, rz, sx, sy, sz, rot, seed] of [[-1.35, 0, -0.55, 0.9, 2.0, 1.1, 0.6, 11], [1.35, 0, -0.5, 0.95, 1.9, 1.1, 1.9, 12], [0, 1.55, -0.8, 1.6, 0.8, 1.0, 0.9, 13]]) k.add(rockGeometry(seed), rm, rx, ry0, rz, 0, { sx, sy, sz, rx: rot * 0.05 });
  k.add(rbox(1.3, 1.6, 0.9, 0.2), MAT.flat('#050506', 1), 0, 0.8, -0.55);
  for (const sx of [-0.62, 0.62]) k.add(rbox(0.16, 1.75, 0.18, 0.02), timber, sx, 0.87, 0.05, 0, { rz: sx * -0.05 });
  k.add(rbox(1.55, 0.18, 0.2, 0.02), timber, 0, 1.75, 0.05, 0, { rz: 0.06 });
  k.flush();
  // the glint in the crack (a few small gems, a soft halo sprite): seen with the lantern near
  const glint = new THREE.Group(); grp.add(glint);
  { const gk = new Kit(glint), cm = crystalMats('violet', { rockSet: true }); crystalCluster(gk, cm.shell, cm.core, 0.12, 0.7, -0.62, { n: 4, s: 0.32, heading: 0, spread: 0.9, lean: 0.4, seed: 5 }); gk.flush(); }
  // the loose stones packed in the frame (one group: gone once broken)
  const stones = new THREE.Group(); grp.add(stones);
  const sk = new Kit(stones), sm = MAT.flat('#a89cb0', 0.95, { vertexColors: true });
  [[-0.32, 0.25, 0.3, 21], [0.3, 0.22, 0.32, 22], [0.0, 0.62, 0.28, 23], [-0.3, 0.95, 0.26, 24], [0.32, 0.9, 0.26, 25], [0.02, 1.3, 0.24, 26], [-0.25, 1.45, 0.2, 27], [0.3, 1.42, 0.22, 28]]
    .forEach(([sx, sy, s, sd]) => sk.add(rockGeometry(sd), sm, sx, sy, -0.05, sd * 0.7, { sx: s, sy: s * 0.85, sz: s * 0.8 }));
  sk.flush();
  const W = (lx, lz) => turn(x, z, ry, lx, lz);
  for (const [lx, lz, r] of [[-1.35, -0.6, 0.85], [1.35, -0.55, 0.9]]) physics.add({ type: 'cyl', ...W(lx, lz), r, top: y + 2.0, noStand: true });
  const plug = physics.add({ type: 'box', ...W(0, -0.3), hw: 0.75, hd: 0.4, rot: ry, top: y + 1.9, noStand: true });
  const S = { grp, x, z, y, ry, glint, stones, front: W(0, 0.55), crack: W(0, -0.4), plug, set(broken, lit) { stones.visible = !broken; glint.visible = !broken ? !!lit : false; } };
  S.set(false, false);
  W5.seam = S;
  return S;
}

// ---------------------------------------------------------------- one of Ilka's survey stakes (Desert Island)
const stakeTex = (n) => M('w5-stake' + n, () => canvasTex(64, 128, (x, W, H) => {
  x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#c8402a'; x.fillRect(0, 0, W, 18); x.fillRect(0, H - 18, W, 18);
  x.fillStyle = '#2a1e14'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), W / 2, H / 2);
}));
export function buildStake(parent, physics, n, x, y, z) {
  W5.stakes ||= [];
  if (W5.stakes[n - 1]) return W5.stakes[n - 1];
  const grp = holder(parent, x, y, z, 0, 'wave5 stake' + n);
  const post = new THREE.Mesh(rbox(0.1, 1.25, 0.1, 0.01), new THREE.MeshStandardMaterial({ map: stakeTex(n), roughness: 0.85 }));
  post.position.y = 0.6; post.castShadow = true; grp.add(post);
  const wire = new THREE.Mesh(cyl(0.008, 0.008, 0.35, 4), MAT.iron()); wire.position.y = 1.4; grp.add(wire);
  // the tell-tale: a strip of red cloth on a pivot at the wire's top (hangs; lifts in a warm breath)
  const piv = new THREE.Group(); piv.position.y = 1.56; grp.add(piv);
  const flag = new THREE.Mesh(plane(0.06, 0.3), new THREE.MeshStandardMaterial({ color: '#e0402a', roughness: 0.8, side: THREE.DoubleSide }));
  flag.position.y = -0.15; piv.add(flag);
  const col = physics.add({ type: 'cyl', x, z, r: 0.1, top: y + 1.3, noStand: true, seeThrough: true });
  const S = { n, grp, piv, x, z, y, col, lift: 0, t: n * 1.3,
    // the flag: hanging (0) or lifted (1), with a small flutter
    pose(dt) { this.t += dt; const a = this.lift * 1.25 + Math.sin(this.t * (this.lift > 0.1 ? 9 : 2.2)) * (0.05 + this.lift * 0.12); piv.rotation.z = a; } };
  S.pose(0);
  W5.stakes[n - 1] = S;
  return S;
}
