// Chapter 10 pieces: FunFrock's valve control room under the water office (Citadel), Hesk's glider (a model
// placed at each island's landing), and Baldino's relay boxes (a small brass box with a mast).
//
//   valves   the valve control room: four valve wheels on a manifold along the back wall, three gauges on a
//            board above them (FORTRESS · DEPOT · LIGHTHOUSE), FunFrock's old wall map; stairs up to the office
//
// CONTRACT for src/game/story/network.js (world x/z):
//   valves   R.valves [{i, x, z, open, setOpen(b)}]; R.gauges.set([n0, n1, n2]) (0…3, 2 is the green mark)
//            R.board {x,z}; exit 'valves-out'
//   buildGlider() → THREE.Group (≈10 m wingspan, nose toward +z, sits on the ground at y = 0)
//   buildRelay()  → THREE.Group (≈1.6 m tall; call relay.userData.setOn(b) to light its lamp)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import * as P from './props.js';
import { MAT, rbox, plane, cyl, sphere, torus, canvasTex } from './props.js';

export const VALVE_EFFECT = [[1, 1, 0], [0, 1, 1], [1, 0, 1], [1, 0, 0]]; // which gauges each valve feeds

export function buildValveRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'valves', 5000, 0);
  const R = B.room, k = B.k;
  const W = 12, D = 9, H = 4.4;
  R.view = 12.5; R.follow = 0.3; R.music = 'facility';
  B.shell({ floor: MAT.tread('#7d7a8c'), slab: MAT.stone('slate'), body: MAT.plates('#5a6a72', 2), low: MAT.plates('#3a4a52', 1), rail: MAT.iron(), cap: MAT.stone('slate'), W, D, H, t: 0.45, dado: 1.0, rimH: 0.5, left: [{ at: 2.5, w: 1.6, h: 2.6, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx - W / 2 + 0.5, z: B.cz + 2.5, r: 0.75, to: 'valves-out' });
  R.spawn = { x: B.cx - W / 2 + 1.8, z: B.cz + 2.5, a: Math.PI / 2 };
  const BZ = -D / 2;
  // the manifold: a fat pipe along the back wall, four drops with valve wheels
  k.add(cyl(0.22, 0.22, W - 1.2, 14), MAT.iron(), 0, 0.6, BZ + 0.5, 0, { rz: Math.PI / 2 });
  const valves = [];
  const wheelM = MAT.paint('#b8302a', 0.4), openM = MAT.paint('#2a8a3a', 0.4);
  [-4.2, -1.4, 1.4, 4.2].forEach((x, i) => {
    k.add(cyl(0.12, 0.12, H - 0.6, 10), MAT.copper(), x, (H - 0.6) / 2 + 0.3, BZ + 0.5);
    k.add(cyl(0.2, 0.2, 0.3, 12), MAT.brass(), x, 1.4, BZ + 0.5);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 6, 24), wheelM); wheel.position.set(x, 1.4, BZ + 0.78); wheel.castShadow = true; B.group.add(wheel);
    for (let s = 0; s < 3; s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.04), MAT.iron()); sp.rotation.z = (s * Math.PI) / 3; wheel.add(sp); }
    k.add(plane(0.5, 0.3), labelM(['I', 'II', 'III', 'IV'][i]), x, 2.0, BZ + 0.72);
    B.col(x, BZ + 0.5, 0.3, 0.35, 2.2);
    const V = { i, x: B.cx + x, z: B.cz + BZ + 1.5, open: false, setOpen(b) { this.open = !!b; wheel.rotation.z = b ? Math.PI / 2 : 0; wheel.material = b ? openM : wheelM; } };
    valves.push(V);
  });
  R.valves = valves;
  // the gauge board: three big dials with a green mark at 2
  k.add(rbox(6.4, 1.5, 0.12, 0.03), MAT.wood('dark'), 0, 3.25, BZ + 0.3);
  const needles = [];
  ['FORTRESS', 'DEPOT', 'LIGHTHOUSE'].forEach((lab, i) => {
    const x = -2.2 + i * 2.2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), MAT.map(dialTex()));
    face.position.set(x, 3.3, BZ + 0.38); B.group.add(face);
    k.add(torus(0.5, 0.04, 6, 32), MAT.brass(), x, 3.3, BZ + 0.38);
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.02), MAT.flat('#1a1a1a', 0.5));
    n.geometry.translate(0, 0.19, 0); n.position.set(x, 3.3, BZ + 0.41); B.group.add(n); needles.push(n);
    k.add(plane(1.2, 0.26), labelM(lab), x, 2.7, BZ + 0.38);
  });
  R.gauges = { set(vals) { vals.forEach((v, i) => { needles[i].rotation.z = 1.2 - (Math.min(3, v) / 3) * 2.4; }); } };
  R.gauges.set([0, 0, 0]);
  R.board = { x: B.cx, z: B.cz + BZ + 1.5 };
  // FunFrock's island map on the side wall, a desk with a logbook, crates of spare parts
  k.add(plane(2.6, 1.8), MAT.map(mapTex()), W / 2 - 0.03, 2.3, -1.0, -Math.PI / 2);
  B.put(W / 2 - 1.0, 2.6, -Math.PI / 2, (kk) => P.desk(kk, { pal: 'dark' }));
  for (const [x, z] of [[-3.8, 3.4], [-2.9, 3.6]]) B.put(x, z, 0.2, (kk) => P.cargoCrate(kk, { color: '#5a5a4a' }));
  B.light('#fff0d0', 5, 12, 0, 3.8, 0);
  B.light('#ffd8a0', 2, 6, 0, 3.2, BZ + 1.2);
  return B.finish();
}

const labelM = (text) => MAT.map(canvasTex(256, 64, (x, W, H) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a2a1a'; x.lineWidth = 4; x.strokeRect(3, 3, W - 6, H - 6); x.fillStyle = '#2a1a10'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText(text, W / 2, H / 2 + 12); }));
const dialTex = () => canvasTex(256, 256, (x, W, H) => {
  x.fillStyle = '#f2ecdc'; x.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, r = W * 0.42;
  // the scale runs over 2.4 rad, centred on the top; ticks at 0, 1, 2, 3; the green band at 2
  const ang = (v) => -Math.PI / 2 - 1.2 + (v / 3) * 2.4;
  x.lineWidth = 18; x.strokeStyle = '#3aa04a'; x.beginPath(); x.arc(cx, cy, r * 0.8, ang(1.8), ang(2.2)); x.stroke();
  x.strokeStyle = '#c8452f'; x.beginPath(); x.arc(cx, cy, r * 0.8, ang(2.6), ang(3)); x.stroke();
  x.strokeStyle = '#2a2a2a'; x.lineWidth = 4;
  for (let v = 0; v <= 3; v++) { const a = ang(v); x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62); x.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95); x.stroke(); }
  x.fillStyle = '#2a2a2a'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center';
  for (let v = 0; v <= 3; v++) { const a = ang(v); x.fillText(String(v), cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45 + 9); }
});
const mapTex = () => canvasTex(384, 256, (x, W, H) => {
  x.fillStyle = '#d8c8a0'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#7aa070'; x.beginPath(); x.ellipse(W / 2, H / 2, 140, 90, 0.2, 0, 7); x.fill();
  x.strokeStyle = '#2a5a9a'; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 200); x.bezierCurveTo(140, 120, 220, 170, 320, 70); x.stroke();
  x.strokeStyle = '#8a2a1a'; x.lineWidth = 3; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(100, 150); x.lineTo(190, 120); x.lineTo(280, 160); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#2a1a10'; x.font = 'bold 20px serif'; x.fillText('F.F. — MAINS & SHELTERS', 70, 34);
});

// Hesk's glider: high wing, stubby fuselage, skids
export function buildGlider() {
  const g = new THREE.Group();
  const body = MAT.paint('#c8b890', 0.55), trim = MAT.paint('#7a2a1a', 0.5), dark = MAT.iron();
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  add(cyl(0.7, 0.45, 5.0, 14), body, 0, 1.0, 0, Math.PI / 2);
  add(sphere(0.7, 14, 10), body, 0, 1.0, 2.5);
  add(rbox(9.5, 0.12, 1.5, 0.04), body, 0, 1.85, -0.3);
  add(rbox(9.6, 0.05, 0.25, 0.01), trim, 0, 1.92, -0.95);
  add(rbox(2.6, 0.08, 0.8, 0.02), body, 0, 1.3, -2.4);
  add(rbox(0.08, 1.0, 0.8, 0.02), trim, 0, 1.8, -2.5);
  for (const s of [-1, 1]) { add(cyl(0.04, 0.04, 1.2, 6), dark, s * 0.5, 0.45, 0.2, 0, 0, s * 0.2); add(rbox(0.1, 0.06, 2.6, 0.02), dark, s * 0.6, 0.05, 0.2); }
  for (const s of [-1, 1]) add(cyl(0.03, 0.03, 1.1, 6), dark, s * 0.9, 1.4, -0.3, 0, 0, s * 0.6);
  return g;
}

// Baldino's relay: a brass box on legs, a mast, a little lamp
export function buildRelay() {
  const g = new THREE.Group();
  const br = MAT.brass(), ir = MAT.iron();
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  for (const [x, z] of [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]]) add(cyl(0.025, 0.025, 0.5, 5), ir, x, 0.25, z);
  add(rbox(0.7, 0.45, 0.55, 0.04), br, 0, 0.72, 0);
  add(cyl(0.02, 0.02, 1.0, 5), ir, 0.2, 1.4, 0);
  add(torus(0.12, 0.015, 4, 12), br, 0.2, 1.75, 0);
  const lampM = new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: '#ff9a30', emissiveIntensity: 0.1, roughness: 0.4 });
  add(sphere(0.07, 8, 6), lampM, -0.2, 1.0, 0);
  g.userData.setOn = (b) => { lampM.emissiveIntensity = b ? 3 : 0.1; };
  return g;
}
