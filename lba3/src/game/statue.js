// The statue of Twinsen and Zoé on Citadel's town square (STATUE; the user: "In LBA2 there was a statue (of Twinsen,
// I believe) on Citadel Island; it's missing").
//
// In the user's own LBA2 files (CITADEL.ILE / CITADEL.OBL, numbers only; tools/lba2-islands.py's reading): one object
// of the island, body 24, the most detailed of the island's 87 bodies (312 points, 483 polygons), stands at the middle
// of the town square (our (-41.6, -4.4)): two figures, a young man and a woman with her hair up, face to face on a
// plain plinth, 1.6 × 2.4 m and 3.7 m tall in all. It is Twinsen and Zoé. Twelve years on, the square's middle is the
// well (the prologue's), so the statue stands beside it, on the square's north side between the lane up to the
// plateau and Bug Street, 5 m from its old place and turned to face the well.
//
// Ours: the game's own Twinsen and Zoé models (assets/poly, the character artist's: used as they are, nothing of
// theirs is changed), posed side by side, his arm round her and the magic ball raised, baked into one static bronze
// mesh with twelve years of verdigris on the upward faces; a stepped stone plinth, weathered, with moss at its foot and
// a bronze plaque. Four draws where it is in view (measured): the figures as one mesh, the plaque, and the plinth's
// stone and moss each one draw batch (engine/drawbatch.js).
import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { textures } from '../engine/textures.js';
import { fbm } from '../engine/math.js';
import { occOf } from '../engine/occlude.js';

const SCALE = 1.12;   // a little over life size (the original's figures stand ~2.4 m on a 1.3 m plinth)

// bronze with verdigris: dark bronze in the hollows and on the sides, green-blue patina where rain runs down from
// the tops, a little paler on the edges that hands have polished (his raised hand, the ball)
// (G1-ART: a shade lighter and less metallic than before, so the cast forms read in the square's shade as well as in sun;
// the eyes and mouth are cast in relief and their irises, pupils, lids and lips darkened like incised lines: `carve`)
function bronzeColors(geo, seed) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, carve = geo.attributes.carve, n = pos.count, col = new Float32Array(n * 3);
  const dark = new THREE.Color('#654628'), bronze = new THREE.Color('#9a7040'), patina = new THREE.Color('#62a48c'), deep = new THREE.Color('#2a1c10'), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
    const nz = fbm(x * 3.1 + seed, z * 3.1 + y * 1.7, 3);
    c.copy(dark).lerp(bronze, 0.55 + nz * 0.5);
    const up = THREE.MathUtils.smoothstep(ny + nz * 0.35, 0.05, 0.75);
    const streak = THREE.MathUtils.smoothstep(Math.sin(x * 9 + z * 7 + seed) * 0.5 + nz, 0.35, 0.9) * 0.35;
    c.lerp(patina, Math.min(0.85, up * 0.8 + streak));
    if (carve) c.lerp(deep, carve.getX(i) * 0.85);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// a character posed and baked into world-free static geometry (relative to `frame`)
function bake(rig, frame) {
  rig.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert();
  const parts = [], carves = [];
  const v = new THREE.Vector3(), cc = new THREE.Color();
  rig.root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    let face = false;   // (the eyes and the mouth: small rigid parts on the head)
    if (o.parent && !o.isSkinnedMesh && o.geometry.attributes.position.count < 400 && !o.userData.statueKeep) {
      let p = o.parent; while (p && !p.isBone) p = p.parent; face = !!(p && /head/i.test(p.name));
    }
    const g = o.geometry, P = g.attributes.position, C = face ? g.attributes.color : null, n = g.index ? g.index.count : P.count;
    const out = new Float32Array(n * 3), cv = new Float32Array(n);
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (o.isSkinnedMesh) o.skeleton.update();
    for (let k = 0; k < n; k++) {
      const i = g.index ? g.index.getX(k) : k;
      v.fromBufferAttribute(P, i);
      if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
      v.applyMatrix4(m);
      out[k * 3] = v.x; out[k * 3 + 1] = v.y; out[k * 3 + 2] = v.z;
      // G1-ART (AUDIT-CH12 #16): the eyes and mouth stay, cast in the bronze (they were left out, and the heads read as
      // blank lumps): the whites as a low relief, the irises, pupils, lids and lips darkened like incised lines
      if (C) { cc.fromBufferAttribute(C, i); cv[k] = 1 - THREE.MathUtils.smoothstep(0.2126 * cc.r + 0.7152 * cc.g + 0.0722 * cc.b, 0.15, 0.7); }
    }
    parts.push(out); carves.push(cv);
  });
  const total = parts.reduce((a, p) => a + p.length, 0), all = new Float32Array(total), carve = new Float32Array(total / 3);
  let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  o = 0; for (const c of carves) { carve.set(c, o); o += c.length; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(all, 3));
  geo.setAttribute('carve', new THREE.BufferAttribute(carve, 1));
  creasedNormals(geo, CREASE);
  return geo;
}

// G1-ART (AUDIT-CH12 #16): the baked figures are unindexed triangles, and computeVertexNormals() on those gives every
// triangle its own flat normal, so the heads, hands and robes read as faceted lumps. Cast bronze is smooth: a corner's
// normal is the area-weighted mean of the triangles that meet at its position and lie within CREASE degrees of its own,
// as the character models' exporter shades them (tools/blender: smooth below a crease angle, crisp beyond), so round
// forms turn smoothly and the real edges (the robe's hem, the cape's rim, the shoes' soles) stay crisp.
const CREASE = 60;
function creasedNormals(geo, angle) {
  const P = geo.attributes.position.array, nt = P.length / 9, fn = new Float32Array(nt * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < nt; t++) {   // (each triangle's normal, its length twice its area)
    a.fromArray(P, t * 9); b.fromArray(P, t * 9 + 3).sub(a); c.fromArray(P, t * 9 + 6).sub(a); b.cross(c);
    fn[t * 3] = b.x; fn[t * 3 + 1] = b.y; fn[t * 3 + 2] = b.z;
  }
  // the corners at each position (the skinned corners of one model vertex come out bit-identical; 0.1 mm grid)
  // (a hash table of the cells, chained through `next`; corners compared exactly when gathered)
  const nc = nt * 3, Q = new Int32Array(nc * 3), size = 1 << Math.ceil(Math.log2(nc * 2)), head = new Int32Array(size).fill(-1), next = new Int32Array(nc);
  for (let i = 0; i < nc * 3; i++) Q[i] = Math.round(P[i] * 1e4);
  const same = (i, j) => Q[i * 3] === Q[j * 3] && Q[i * 3 + 1] === Q[j * 3 + 1] && Q[i * 3 + 2] === Q[j * 3 + 2];
  const slot = (i) => (Math.imul(Q[i * 3], 73856093) ^ Math.imul(Q[i * 3 + 1], 19349663) ^ Math.imul(Q[i * 3 + 2], 83492791)) & (size - 1);
  for (let i = 0; i < nc; i++) { const h = slot(i); next[i] = head[h]; head[h] = i; }
  const cosL = Math.cos((angle * Math.PI) / 180), out = new Float32Array(nt * 9), u = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < nc; i++) {
    const t = (i / 3) | 0; u.fromArray(fn, t * 3).normalize(); s.set(0, 0, 0);
    for (let j = head[slot(i)]; j >= 0; j = next[j]) {
      if (!same(i, j)) continue;
      const g = ((j / 3) | 0) * 3, x = fn[g], y = fn[g + 1], z = fn[g + 2], len = Math.hypot(x, y, z);
      if (len > 1e-12 && (x * u.x + y * u.y + z * u.z) / len >= cosL) { s.x += x; s.y += y; s.z += z; }
    }
    if (s.lengthSq() < 1e-20) s.copy(u);
    s.normalize(); out[i * 3] = s.x; out[i * 3 + 1] = s.y; out[i * 3 + 2] = s.z;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}

function pose(rig, set) {
  const j = rig.j;
  for (let k = 0; k < 6; k++) rig.update(1 / 30, 0);   // (the rest pose the rig settles into)
  for (const [path, v] of Object.entries(set)) {
    const k = path.split('.'), axis = k.pop(), bone = k.length > 1 ? j[k[0]]?.[k[1]] : j[k[0]];
    if (bone) bone.rotation[axis] = v;
  }
}

function plaqueTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#6e5230'; x.fillRect(0, 0, 512, 192);
  x.strokeStyle = '#3e2c16'; x.lineWidth = 10; x.strokeRect(8, 8, 496, 176);
  x.fillStyle = '#e8cf96'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 56px Rubik, sans-serif'; x.fillText('TWINSEN & ZOE', 256, 74);
  x.font = 'bold 30px Rubik, sans-serif'; x.fillText('WHO SAVED TWINSUN', 256, 136);
  // twelve years of rain: verdigris runs from the top edge and the letters
  for (let i = 0; i < 26; i++) {
    const px = 14 + ((i * 97) % 484), w = 4 + (i % 4) * 3, h = 30 + ((i * 53) % 120);
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(96,160,136,0.55)'); gr.addColorStop(1, 'rgba(96,160,136,0)');
    x.fillStyle = gr; x.fillRect(px, 8, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// x, z: the plinth's centre; ry: the way the figures face
export function buildStatue(scene, W, x, z, ry) {
  const g = W.H(x, z), grp = new THREE.Group(); grp.name = 'statue'; grp.position.set(x, g, z); grp.rotation.y = ry; scene.add(grp);
  grp.updateMatrixWorld(true);
  const TX = textures(), stoneMap = TX.stone.clone(); stoneMap.needsUpdate = true; stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping;
  const stone = new THREE.MeshStandardMaterial({ map: stoneMap, color: '#d9d2c4', roughness: 0.92 });
  const moss = new THREE.MeshStandardMaterial({ color: '#5f7e3c', roughness: 1 });
  const box = (w, h, d, m, y, ox = 0, oz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(ox, y, oz); b.castShadow = b.receiveShadow = true; grp.add(b); return b; };
  // the plinth (1.6 × 2.4 m in the original): a broad lower step, the die, a moulded cap
  box(2.9, 0.34, 2.3, stone, 0.12);   // (one stone material for the whole plinth: one draw batch)
  box(2.45, 0.22, 1.85, stone, 0.4);
  box(2.0, 0.95, 1.45, stone, 0.98);
  box(2.2, 0.16, 1.62, stone, 1.53);
  const top = 1.61;
  // moss in the joints at its foot, more on the shaded side
  for (const [mx, mz, w, d] of [[-1.42, 0, 0.08, 2.2], [1.42, 0.5, 0.08, 1.0], [0, -1.12, 2.6, 0.08], [-0.9, 1.12, 0.9, 0.08]]) box(w, 0.06, d, moss, 0.3, mx, mz).castShadow = false;
  // the plaque on the front of the die
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.49), new THREE.MeshStandardMaterial({ map: plaqueTexture(), roughness: 0.55, metalness: 0.35 }));
  plaque.position.set(0, 1.0, 0.742); grp.add(plaque);

  // the figures: Twinsen (the magic ball raised in his right hand, his left arm round Zoé) and Zoé at his left
  const fig = new THREE.Group(); fig.position.y = top; grp.add(fig); fig.updateMatrixWorld(true);
  const tw = createCharacter('twinsen'), zo = createCharacter('zoe');
  fig.add(tw.root, zo.root);
  tw.root.position.set(-0.36, 0, 0.02); tw.root.rotation.y = 0.18; zo.root.position.set(0.36, 0, -0.02); zo.root.rotation.y = -0.22;
  for (const r of [tw, zo]) r.root.scale.multiplyScalar(SCALE);
  pose(tw, { 'armR.sh.x': -2.75, 'armR.el.x': -0.25, 'armR.sh.z': -0.25, 'armL.sh.z': 0.55, 'armL.sh.x': -0.25, 'armL.el.x': -0.35, 'head.y': 0.12, 'head.x': -0.08 });
  pose(zo, { 'armL.sh.z': -0.05, 'armL.sh.x': -0.45, 'armL.el.x': -1.9, 'armR.sh.z': -0.5, 'armR.sh.x': -0.2, 'armR.el.x': -0.3, 'head.y': -0.25, 'head.x': -0.05 });
  // the ball in his raised hand
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10)); tw.j.armR.hand.add(ball); ball.position.set(0, -0.12, 0); ball.userData.statueKeep = true;
  const parts = [bake(tw, fig), bake(zo, fig)];
  fig.remove(tw.root, zo.root);
  const bronzeM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 });
  // (the two figures as one mesh: one draw)
  parts.forEach((pg, i) => bronzeColors(pg, i * 7.3));
  const both = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(parts.reduce((a, pg) => a + pg.attributes[name].array.length, 0));
    let o = 0; for (const pg of parts) { arr.set(pg.attributes[name].array, o); o += pg.attributes[name].array.length; }
    both.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  parts.forEach((pg) => pg.dispose());
  const figs = new THREE.Mesh(both, bronzeM); figs.name = 'statue figures'; figs.castShadow = figs.receiveShadow = true; fig.add(figs);
  both.computeBoundingBox(); const figTop = both.boundingBox.max.y;

  // blocks walking (the plinth's footprint); the camera rises over it as over a house (engine/occlude.js)
  const H = top + figTop;
  W.physics.add({ type: 'box', x, z, hw: 1.45, hd: 1.15, rot: ry, top: g + H, camSkip: true });
  const occ = occOf(W);
  occ.add({ kind: 'box', x, z, rot: ry, hw: 1.45, hd: 1.15, y0: g - 0.5, y1: g + top, name: 'statue plinth' });
  occ.add({ kind: 'box', x, z, rot: ry, hw: 0.85, hd: 0.45, y0: g + top, y1: g + H, name: 'statue' });
  W.statue = { x, z, y: g, ry, height: H, group: grp };
  return W.statue;
}
