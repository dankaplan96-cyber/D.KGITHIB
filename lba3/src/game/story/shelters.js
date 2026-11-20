// Chapter 8's two shelters (FunFrock's, from before the project): a concrete headwall and a heavy sliding steel door
// on rails, in the face of a grassed earth mound that covers the blockhouse (half buried, vents and a plate on it).
// The depot's door carries the hatch wheel the ball must hit (a red valve wheel, as the project's own: spokes, a hub
// and grips, turning on the door's boss plate); the fortress's door is freed by the cistern lever (a lock box and a
// bar where the wheel would be). A lamp over each door goes from amber to green when it is open.
//
// Draw calls: the static parts of both shelters (and the evacuation's carts and bundles, see addCart) are merged per
// material into one Batch the caller owns (5 meshes for the two shelters, 2 more, which cast no shadow, in a second); each door is a group of 1 mesh (the leaf with
// its fittings) that slides, the depot's wheel one more (red) and each lamp one.
//
// Local frame: origin on the ground at the footprint's centre, +z out of the door face (the collider is 4.2 × 3.0:
// hw 2.1, hd 1.5, the face at z = 1.5), +x along the face. `at(f, s)` is the world point f metres out from the door
// and s along the face from its centre (+s: to the right looking at it).
import * as THREE from 'three';
import { tm, pm, bbox, cyl, compose, boxUV, ctex, mergeGeos } from '../kit.js';

export const FACE_Z = 1.5, DOOR_X = -0.9;
const LEAF_Z = 1.58, WHEEL_Z = 1.82;          // the leaf's centre and the wheel's, in front of the collider's face
const LEAF_W = 1.9, LEAF_H = 3.15, SILL = 0.35;
const smooth = (u) => u * u * (3 - 2 * u);

// the materials (shared: the same objects the rest of the game's kit hands out)
const mats = () => ({
  concrete: tm('concrete', { color: '#e0dcd2' }),
  steel: tm('metal', { color: '#8aa4b4', rough: 0.55, metal: 0.45 }),
  steelD: pm('#3a4048', 0.5, { metalness: 0.55 }),
  hazard: tm('hazard'),
  grass: tm('grass', { color: '#bcd68c', rough: 1 }),
  inside: pm('#0c0b0e', 1, {}),
  wood: tm('planks', { color: '#d8bc8e', rough: 0.9 }),
  sack: pm('#cdb98a', 0.95), hay: pm('#e0b84c', 0.95), red: pm('#c4503a', 0.9),
  wheelRed: pm('#d23c2c', 0.45, { metalness: 0.3 }),
});
let PLATE = null, APRON = null;
// one texture for both plates (left: "1", right: "2"), one material
const plateMat = () => (PLATE ??= new THREE.MeshStandardMaterial({ map: ctex('shelter plates', 512, 128, (x, w, h) => {
  ['1', '2'].forEach((label, i) => {
    const x0 = i * (w / 2);
    x.fillStyle = '#26384a'; x.fillRect(x0, 0, w / 2, h); x.strokeStyle = '#e8e4d4'; x.lineWidth = 5; x.strokeRect(x0 + 8, 8, w / 2 - 16, h - 16);
    x.fillStyle = '#e8e4d4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 40px system-ui, sans-serif'; x.fillText('SHELTER', x0 + w / 4, 46);
    x.font = 'bold 54px system-ui, sans-serif'; x.fillText(label, x0 + w / 4, 94);
  });
}, false), roughness: 0.8 }));
// packed earth where people stand: a cloned dirt material that sits over the ground (polygon offset, never z-fights)
const apronMat = () => { if (!APRON) { APRON = tm('dirt', { color: '#d9c9a4', rough: 1 }).clone(); APRON.polygonOffset = true; APRON.polygonOffsetFactor = -2; APRON.polygonOffsetUnits = -2; } return APRON; };

// the earth cover: a grassed mound over the whole block (the collider's footprint behind the headwall), highest
// against the headwall and running down to the ground on the other three sides (its toe a little under the terrain)
function moundGeo() {
  const X0 = -2.1, X1 = 2.1, Z0 = -1.5, Z1 = 0.85, NX = 18, NZ = 12;
  const hf = (x, z) => {
    const sx = Math.max(0, 1 - Math.pow(Math.abs(x) / 2.1, 3.2)), su = Math.max(0, Math.min(1, (z - Z0) / (Z1 - Z0)));
    return -0.1 + 3.65 * smooth(Math.min(1, sx * 1.35)) * smooth(Math.min(1, su * 1.3)) * (0.93 + 0.07 * Math.cos(x * 2.3 + 0.7)) + 0.05 * Math.sin(x * 3.1 + z * 2.2);
  };
  const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), idx = [];
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = X0 + (X1 - X0) * i / NX, z = Z0 + (Z1 - Z0) * j / NZ;
    pos.set([x, hf(x, z), z], (j * (NX + 1) + i) * 3);
  }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.userData.hf = hf;
  return boxUV(g, 4.0);
}
// a concrete wing wall at the headwall's side: a wedge running back and down along the earth (thick along x)
function wingGeo() {
  const s = new THREE.Shape();
  s.moveTo(-0.85, -0.4); s.lineTo(-0.85, 3.55); s.lineTo(0.15, 2.5); s.lineTo(0.15, -0.4); s.lineTo(-0.85, -0.4);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
  g.rotateY(Math.PI / 2);          // (extrusion → +x, the profile's x → -z)
  return boxUV(g, 2.6);
}
// the hatch wheel, one mesh (red, as the project's valve wheels): rim, six spokes, hub and grips; axis +z
function wheelGeo() {
  const R = 0.45;
  return compose([
    [new THREE.TorusGeometry(R, 0.05, 8, 28)],
    ...[0, 1, 2].map((k) => [bbox(2 * R, 0.06, 0.06, 0.015, 1), 0, 0, 0, 0, 0, (k * Math.PI) / 3]),
    [cyl(0.13, 0.13, 0.16, 14, 0), 0, 0, 0.02, Math.PI / 2],
    [cyl(0.07, 0.07, 0.24, 10, 0), 0, 0, 0.0, Math.PI / 2],
    ...Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return [cyl(0.045, 0.045, 0.16, 8, 0), Math.cos(a) * R, Math.sin(a) * R, 0, Math.PI / 2]; }),
  ]);
}

// the frame of a shelter at (x, z) turned ry: at(f, s) = the world point f m out from the door's face, s m along it
export function shelterFrame(x, z, ry) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  return { at(f, s = 0) { const lx = DOOR_X + s, lz = FACE_Z + f; return { x: x + cs * lx + sn * lz, z: z - sn * lx + cs * lz }; }, n: { x: sn, z: cs } };
}
// the shelter's centre for a wheel at the world point (wx, wz) on a door facing ry
export function centreForWheel(wx, wz, ry) {
  const cs = Math.cos(ry), sn = Math.sin(ry), lx = DOOR_X, lz = WHEEL_Z;
  return { x: wx - (cs * lx + sn * lz), z: wz - (-sn * lx + cs * lz) };
}

// build one shelter. o: { x, z, ry, wheel: bool, wheelY (world y of the wheel's centre), label: 0|1 (the plate),
//   H: terrain height fn, parent: the Object3D for the door's groups, batch: the shared static Batch, flat: the shared
//   Batch for the plate and the packed earth (no shadow), physics, cols: [] }
export function buildShelter(o) {
  const { x, z, ry, H, parent: grp, physics: P, batch: SB, flat: SF } = o;
  const gy = H(x, z), M = mats();
  const k = new THREE.Group(); k.position.set(x, gy, z); k.rotation.y = ry; grp.add(k);
  // static parts go to the shared batch in world space: the shelter's own transform applied to each
  const T0 = new THREE.Matrix4().compose(new THREE.Vector3(x, gy, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1));
  const _l = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const putIn = (B, geo, mat, lx = 0, ly = 0, lz = 0, rx = 0, rry = 0, rz = 0) => {
    _l.compose(new THREE.Vector3(lx, ly, lz), _q.setFromEuler(_e.set(rx, rry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
    B.addM(geo, mat, new THREE.Matrix4().multiplyMatrices(T0, _l));
  };
  const put = (...a) => putIn(SB, ...a);
  const { concrete, steel, steelD, hazard, grass } = M, inside = steelD;   // (the void is dark steel: one mesh fewer)
  // the plinth along the face, the headwall (z 0.85 → 1.5, to 3.95) with the door opening, its cap, a sill
  put(boxUV(bbox(4.3, 0.5, 0.9, 0.05, 1), 2.6), concrete, 0, 0.0, 1.05);
  const hole = { x: DOOR_X, y: SILL + 0.4, w: 2.0, h: LEAF_H + 0.05 };
  put(boxUV(new THREE.ExtrudeGeometry((() => {
    const s = new THREE.Shape(); s.moveTo(-2.1, 0); s.lineTo(2.1, 0); s.lineTo(2.1, 4.35); s.lineTo(-2.1, 4.35); s.lineTo(-2.1, 0);
    const p = new THREE.Path(); p.moveTo(hole.x - hole.w / 2, hole.y); p.lineTo(hole.x - hole.w / 2, hole.y + hole.h); p.lineTo(hole.x + hole.w / 2, hole.y + hole.h); p.lineTo(hole.x + hole.w / 2, hole.y); p.closePath();
    s.holes.push(p); return s;
  })(), { depth: 0.65, bevelEnabled: false }), 2.6), concrete, 0, -0.4, 0.85);
  put(boxUV(bbox(4.5, 0.22, 0.95, 0.04, 1), 2.6), concrete, 0, 4.06, 1.1);
  put(boxUV(bbox(2.1, 0.12, 0.7, 0.03, 1), 2.6), concrete, DOOR_X, SILL - 0.04, 1.5);
  // warning stripes: down the headwall's corners, over the door
  for (const s of [-1, 1]) put(boxUV(bbox(0.3, 3.7, 0.05, 0.01, 1), 0.9), hazard, s * 1.95, 1.45, 1.52);
  put(boxUV(bbox(2.0, 0.3, 0.05, 0.01, 1), 0.9), hazard, DOOR_X, 3.78, 1.52);
  // the door's rail and its stops, the lamp's bracket and cage
  put(bbox(4.0, 0.12, 0.16, 0.02, 1), steelD, 0, 3.64, 1.6);
  for (const s of [-1, 1]) put(bbox(0.14, 0.3, 0.2, 0.02, 1), steelD, DOOR_X + s * 1.05, 3.52, 1.6);
  put(bbox(0.32, 0.16, 0.1, 0.02, 1), steelD, 1.35, 2.62, 1.55);
  put(new THREE.TorusGeometry(0.13, 0.015, 5, 12), steelD, 1.35, 2.62, 1.62);
  // the earth cover over the block, wing walls holding it at the headwall, rocks at its toe
  const mg = moundGeo();
  put(mg, grass, 0, 0, 0);
  for (const sg of [-1, 1]) put(wingGeo(), concrete, sg * 2.1 - (sg > 0 ? 0.3 : 0), 0, 0);
  [[-2.15, -0.9, 0.34, 0.2], [-1.9, 0.2, 0.26, 1.0], [2.2, -0.6, 0.38, 2.1], [1.9, 0.35, 0.24, 0.5], [-0.8, -1.65, 0.3, 1.4], [0.9, -1.7, 0.4, 2.6], [1.7, -1.35, 0.22, 0.9]].forEach(([rx, rz, r, a]) => {
    put(boxUV(new THREE.IcosahedronGeometry(r, 0).scale(1.25, 0.7, 1), 1.6), concrete, rx, r * 0.3, rz, 0, a, 0.1 * a);
  });
  // vents on the earth cover: a hooded pipe turned over, and a short stub with a hood
  const vy = (vx, vz) => mg.userData.hf(vx, vz);
  const vent = (vx, vz, h, r) => {
    const y0 = vy(vx, vz) - 0.05;
    put(cyl(r, r, h, 10, 0), steelD, vx, y0 + h / 2, vz);
    put(cyl(r * 1.35, r * 1.35, 0.1, 10, 0), steelD, vx, y0 + 0.05, vz);
  };
  vent(1.0, 0.15, 1.0, 0.13);
  const vtop = vy(1.0, 0.15) + 0.95;
  put(cyl(0.13, 0.13, 0.42, 10, 0).rotateZ(Math.PI / 2), steelD, 1.18, vtop, 0.15);
  put(cyl(0.2, 0.0, 0.24, 10, 0).rotateX(Math.PI), steelD, 1.4, vtop - 0.02, 0.15);
  vent(-1.15, -0.4, 0.55, 0.1);
  put(cyl(0.2, 0.0, 0.18, 10, 0), steelD, -1.15, vy(-1.15, -0.4) + 0.62, -0.4);
  // the dark inside, seen when the door is open: a void with a concrete back
  put(bbox(2.0, 3.2, 0.06, 0.01, 1), inside, DOOR_X, SILL + 0.4 + 1.6, 0.9);
  put(bbox(2.0, 3.25, 0.14, 0.01, 1), concrete, DOOR_X, SILL + 0.4 + 1.6, 0.78);
  // the stencilled plate on the blank half of the face (a quad on its half of the shared texture), the packed earth in front
  const pg = new THREE.PlaneGeometry(1.3, 0.65), uv = pg.attributes.uv, u0 = (o.label ?? 0) * 0.5;
  for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5);
  putIn(SF, pg, plateMat(), 1.0, 1.75, 1.53);   // (flat things: a batch that casts no shadow)
  putIn(SF, boxUV(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(2.7, 1, 2.0), 3.0), apronMat(), DOOR_X + 0.3, 0.04, 3.0);

  // ---- the door: a group sliding along the rail (the leaf and its fittings: 1 mesh; the wheel: 1)
  const door = new THREE.Group(); door.position.set(DOOR_X, SILL + LEAF_H / 2, LEAF_Z); k.add(door);
  const parts = new Map();
  const dput = (geo, mat, lx = 0, ly = 0, lz = 0, rx = 0, rry = 0, rz = 0) => {
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push([geo, new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, rry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1))]);
  };
  dput(bbox(LEAF_W, LEAF_H, 0.16, 0.04, 1), steel, 0, 0, 0);
  dput(bbox(1.55, 1.7, 0.05, 0.03, 1), steel, 0, -0.55, 0.09);                     // lower plate
  dput(bbox(0.07, 0.55, 0.07, 0.015, 1), steel, 0.72, -0.2, 0.15);                // pull handles
  dput(bbox(0.07, 0.55, 0.07, 0.015, 1), steel, 0.72, 1.0, 0.15);
  for (const s of [-1, 1]) dput(cyl(0.1, 0.1, 0.08, 10, 0).rotateX(Math.PI / 2), steel, s * 0.6, LEAF_H / 2 + 0.02, -0.02);   // (rollers on the rail)
  for (let i = 0; i < 12; i++) dput(cyl(0.035, 0.035, 0.04, 6, 0).rotateX(Math.PI / 2), steel, -0.66 + i * 0.12, -1.34, 0.1);   // (rivets)
  let spin = null;
  const wheelY = o.wheelY != null ? o.wheelY - gy - (SILL + LEAF_H / 2) : 0;
  if (o.wheel) {
    dput(cyl(0.62, 0.62, 0.06, 22, 0).rotateX(Math.PI / 2), steel, 0, wheelY, 0.11);   // the boss plate the wheel is mounted on
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; dput(cyl(0.03, 0.03, 0.05, 6, 0).rotateX(Math.PI / 2), steel, Math.cos(a) * 0.52, wheelY + Math.sin(a) * 0.52, 0.145); }
    spin = new THREE.Group(); spin.position.set(0, wheelY, WHEEL_Z - LEAF_Z); door.add(spin);
    const wm = new THREE.Mesh(wheelGeo(), M.wheelRed); wm.receiveShadow = true; spin.add(wm);
  } else {
    dput(bbox(0.9, 0.7, 0.14, 0.03, 1), steel, 0, 0.9, 0.13);                       // a lock box with a keyhole
    dput(bbox(1.7, 0.12, 0.1, 0.02, 1), steel, 0, -0.05, 0.14);                     // and a bar across
  }
  for (const [mat, list] of parts) {
    const g = new THREE.Mesh(mergeList(list), mat); g.castShadow = true; g.receiveShadow = true; door.add(g);
  }
  // the lamp over the door (its own material: amber shut, green open)
  const lampM = pm('#ffb23a', 0.4, { emissive: '#ff8a1a', emissiveIntensity: 1.7 }).clone();
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), lampM); lamp.position.set(1.35, 2.62, 1.62); k.add(lamp);

  // ---- collider as before: the whole block, the footprint's size unchanged
  const col = P.add({ type: 'box', x, z, hw: 2.1, hd: 1.5, rot: ry, top: gy + 2.5, enabled: false });
  o.cols.push(col);

  // ---- state
  const S = {
    k, door, wheel: spin, col, gy, ry, x, z, opened: false, p: 0, dir: 0,
    at: shelterFrame(x, z, ry).at,
    pose(p) {
      door.position.x = DOOR_X + 1.85 * smooth(p);
      if (spin) spin.rotation.z = -6.6 * smooth(Math.min(1, p * 2.2));
      const g = Math.max(0, Math.min(1, (p - 0.8) / 0.2)) > 0.5;
      lampM.color.set(g ? '#7dff9a' : '#ffb23a'); lampM.emissive.set(g ? '#20d058' : '#ff8a1a');
    },
    // open the door: at once, or slid back over ~1.6 s (a world updater ticks it)
    open(instant = false) {
      if (S.opened) return;
      S.opened = true;
      if (instant) { S.p = 1; S.pose(1); S.dir = 0; } else S.dir = 1;
    },
    tick(dt) {
      if (!S.dir) return;
      S.p = Math.min(1, S.p + dt / 1.6); S.pose(S.p);
      if (S.p >= 1) S.dir = 0;
    },
    close() { S.opened = false; S.p = 0; S.dir = 0; S.pose(0); },
  };
  S.pose(0);
  return S;
}
const mergeList = (list) => mergeGeos(list, false);

// ---------------------------------------------------------------------------------------------------------------
// The evacuation's carts and bundles: hand carts loaded with sacks, hay, crates or bundles, tied bundles, round bales.
// Added to a Batch the caller owns (merged per material: wood, sack, hay, red, dark steel).
const sackGeo = () => new THREE.SphereGeometry(0.27, 10, 8).scale(1, 0.8, 0.9);
// load: 'sacks' | 'hay' | 'crates' | 'bundles'
export function addCart(B, x, y, z, ry, load = 'sacks') {
  const M = mats(), q = (lx, ly, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, y + ly, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
  const add = (g, m, lx, ly, lz, rx = 0, rry = 0, rz = 0) => B.add(g, m, ...q(lx, ly, lz), rx, ry + rry, rz);
  const { wood, steelD: iron, sack, hay, red } = M;
  add(bbox(1.2, 0.12, 1.5, 0.02, 1.4), wood, 0, 0.62, 0);
  for (const s of [-1, 1]) add(bbox(0.08, 0.34, 1.5, 0.02, 1.4), wood, s * 0.62, 0.82, 0);
  for (const s of [-1, 1]) add(bbox(1.2, 0.34, 0.08, 0.02, 1.4), wood, 0, 0.82, s * 0.75);
  for (const s of [-1, 1]) {
    add(cyl(0.4, 0.4, 0.07, 14, 0).rotateZ(Math.PI / 2), wood, s * 0.72, 0.4, 0.05);
    add(cyl(0.1, 0.1, 0.13, 8, 0).rotateZ(Math.PI / 2), iron, s * 0.72, 0.4, 0.05);
    add(bbox(0.06, 0.06, 1.15, 0.01, 1), wood, s * 0.42, 0.62, -1.15);          // the shafts
  }
  add(cyl(0.035, 0.035, 1.5, 6, 0).rotateZ(Math.PI / 2), iron, 0, 0.4, 0.05);
  add(bbox(0.9, 0.05, 0.06, 0.01, 1), wood, 0, 0.64, -1.65);                    // the crossbar
  add(bbox(0.07, 0.36, 0.07, 0.01, 1), wood, 0, 0.42, -0.9);                    // the prop under the shafts
  if (load === 'sacks') {
    [[-0.28, 0.9, -0.3], [0.28, 0.9, -0.28], [-0.28, 0.9, 0.3], [0.28, 0.9, 0.32], [0, 1.2, 0]].forEach(([a, b, c], i) => add(sackGeo(), sack, a, b, c, 0, i * 1.3));
  } else if (load === 'hay') {
    add(cyl(0.4, 0.4, 1.0, 12, 0).rotateZ(Math.PI / 2), hay, 0, 1.05, -0.2);
    add(cyl(0.34, 0.34, 0.9, 12, 0).rotateZ(Math.PI / 2), hay, 0.05, 1.0, 0.45);
    for (const zz of [-0.5, 0.0]) add(new THREE.TorusGeometry(0.405, 0.025, 5, 14).rotateY(Math.PI / 2), wood, 0, 1.05, zz);
  } else if (load === 'crates') {
    add(bbox(0.5, 0.45, 0.5, 0.03, 1.4), wood, -0.25, 0.97, -0.2); add(bbox(0.5, 0.45, 0.5, 0.03, 1.4), wood, 0.28, 0.97, 0.3, 0, 0.25);
    add(bbox(0.45, 0.4, 0.45, 0.03, 1.4), wood, 0.28, 0.97, -0.3, 0, -0.2); add(bbox(0.42, 0.4, 0.42, 0.03, 1.4), wood, -0.2, 1.4, 0.0, 0, 0.5);
    add(sackGeo(), sack, -0.25, 1.0, 0.4);
  } else {
    add(bbox(0.8, 0.45, 0.55, 0.12, 1), red, -0.1, 0.98, -0.2); add(bbox(0.6, 0.4, 0.5, 0.12, 1), red, 0.15, 0.96, 0.4, 0, 0.2);
    add(cyl(0.16, 0.16, 0.9, 10, 0).rotateZ(Math.PI / 2), sack, 0, 1.38, 0.05);   // (a bedroll on top)
  }
}
// a tied bundle with a bedroll (waiting on the ground)
export function addBundle(B, x, y, z, ry) {
  const { wood, sack, red } = mats(), cs = Math.cos(ry), sn = Math.sin(ry);
  const q = (lx, lz) => [x + cs * lx + sn * lz, z - sn * lx + cs * lz];
  const [bx, bz] = q(0, 0), [rx_, rz_] = q(0.45, 0.1);
  B.add(bbox(0.62, 0.42, 0.45, 0.12, 1), red, bx, y + 0.21, bz, 0, ry);
  B.add(bbox(0.64, 0.05, 0.47, 0.01, 1), wood, bx, y + 0.28, bz, 0, ry);
  B.add(cyl(0.12, 0.12, 0.55, 9, 0).rotateZ(Math.PI / 2), sack, rx_, y + 0.13, rz_, 0, ry + 0.4);
}
// a round hay bale
export function addBale(B, x, y, z, ry) {
  const { wood, hay } = mats();
  B.add(cyl(0.55, 0.55, 0.8, 14, 0).rotateZ(Math.PI / 2), hay, x, y + 0.55, z, 0, ry);
  for (const s of [-0.22, 0.22]) B.add(new THREE.TorusGeometry(0.555, 0.025, 5, 16).rotateY(Math.PI / 2), wood, x + Math.cos(ry) * s, y + 0.55, z - Math.sin(ry) * s, 0, ry);
}
