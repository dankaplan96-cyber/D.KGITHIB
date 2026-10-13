// Twinsun's wizards, twelve years on (LBA2's, measured and looked at, nothing copied):
//  - Bersimon the Weather Wizard's tent on Citadel's north plateau, where the original's stood (its S21, by the
//    depot): a round tent of blue cloth with gold stars. Inside — bigger than the outside, as a wizard's tent is —
//    a stone room after the original's (the user's reference #63): a hearth with a great teal cauldron, a long table
//    of bottles and bowls with benches, iron candle stands, star plaques on the walls, a spotted rug.
//    Bersimon (look 'bersimon', body 111) tops up Twinsen's magic when they talk.
//  - The School of Magic on Desert Island: its entrance is the original's great stone face in a cliff (reference
//    #09: grey, glowing red eyes under a heavy brow, the door in its chin, two horned chimneys beside it), here in the
//    north-west mesa's south side. Inside (references #26, #57): a stone hall floored with pentagram slabs, star
//    windows, a blackboard on a dais, long tables of bowls and bottles, a red-clothed table. Rector Hougo (look
//    'magus', body 123) teaches; Ker'aooc the healing wizard (look 'keraooc', after body 188) heals Twinsen.
//
// CONTRACT (src/game/story/index.js routes the doors and exits in every chapter; prologue.js places the wizards)
//   buildWizards(scene, physics, desert) → { wtent, school }   (rooms; world coordinates)
//   WIZ.tent {x,z,door:{x,z}}  on Citadel;  WIZ.school {door:{x,z}} on Desert Island (world)
//   wizardDoors() [{x,z,r,room,region?}]   wizardExit(to) for 'wtent-out' and 'school-out'
//   R.npcSpots: wtent {bersimon}, school {magus, keraooc}
import * as THREE from 'three';
import { RoomBuilder, glowSprite } from './interiors.js';
import { MAT, rbox, plane, cyl, sphere, lathe, canvasTex, table, bench, jar, plate, candle, rug } from './props.js';
import { DESERT } from './desert.js';

export const WIZ = { tent: { x: -100, z: -71 }, school: { local: { x: -70, z: 41.5 } } };
const TENT_IN = { x: 5400, z: 0 }, SCHOOL_IN = { x: 5600, z: 0 };   // (clear of the regions' ground patches)

// ---------------------------------------------------------------- painted cloths and plaques
const starCloth = () => canvasTex(512, 256, (x, W, H) => {
  x.fillStyle = '#2a4a9a'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#23407f'; for (let i = 0; i < 16; i++) x.fillRect(i * 32, 0, 14, H);   // the cloth's panels
  const star = (cx, cy, r) => { x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  x.fillStyle = '#f0c850';
  for (let i = 0; i < 26; i++) star((i * 97) % W, ((i * 61) % (H - 30)) + 15, 7 + (i % 3) * 3);
  x.fillStyle = '#e8e0f8'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc((i * 151 + 40) % W, (i * 43 + 30) % H, 9, 0.6, 5.4); x.arc((i * 151 + 46) % W, (i * 43 + 27) % H, 8, 5.4, 0.6, true); x.fill(); }   // moons
});
const starPlaque = (bg = '#2a5a8a') => canvasTex(256, 256, (x, W) => {
  x.fillStyle = '#1a2a3a'; x.beginPath(); x.arc(W / 2, W / 2, W / 2, 0, 7); x.fill();
  x.fillStyle = bg; x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 14, 0, 7); x.fill();
  x.fillStyle = '#bff4ff';
  x.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? 34 : 104; x.lineTo(W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r); } x.closePath(); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(W / 2, W / 2, 16, 0, 7); x.fill();
});
const signTex = (text) => canvasTex(512, 128, (x, W, H) => {
  x.fillStyle = '#6a4a2a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#3a2614'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = '#f4e2b0'; x.font = 'bold 44px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 2);
});
const pentaTex = () => canvasTex(256, 256, (x, W) => {
  x.fillStyle = '#6a6a70'; x.fillRect(0, 0, W, W);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; x.fillRect(Math.random() * W, Math.random() * W, 6, 6); }
  x.strokeStyle = '#2e2e34'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, W - 8);
  x.strokeStyle = '#3a3a42'; x.lineWidth = 5;
  x.beginPath(); x.arc(W / 2, W / 2, 92, 0, 7); x.stroke();
  x.beginPath(); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 4 / 5; x.lineTo(W / 2 + Math.cos(a) * 92, W / 2 + Math.sin(a) * 92); } x.stroke();
});
const boardTex = () => canvasTex(512, 256, (x, W, H) => {
  x.fillStyle = '#1e2a24'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#e8ecef'; x.fillStyle = '#e8ecef'; x.lineWidth = 3; x.font = '28px serif';
  x.fillText('The four elements', 30, 46);
  for (const [cx, sym] of [[80, '△'], [190, '▽'], [300, '◇'], [410, '○']]) { x.font = '56px serif'; x.fillText(sym, cx - 20, 130); }
  x.font = '22px serif'; x.fillText('Wind before rain. Rain before thunder.', 30, 200);
  x.beginPath(); x.moveTo(30, 222); x.lineTo(380, 226); x.stroke();
});

// ---------------------------------------------------------------- Bersimon's tent, outside (Citadel, world coordinates)
function buildTentOutside(scene, physics) {
  const { x, z } = WIZ.tent, gy = physics.groundAt(x, z);
  const g = new THREE.Group(); g.name = 'wizardTent'; g.position.set(x, gy, z); scene.add(g);
  const cloth = MAT.map(starCloth(), 0.9, { side: THREE.DoubleSide }), clothD = MAT.flat('#1e3670', 0.9);
  const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.CylinderGeometry(3.15, 3.3, 1.7, 14, 1, true), cloth, 0, 0.85, 0);
  add(new THREE.ConeGeometry(3.7, 3.3, 14), cloth, 0, 1.7 + 1.62, 0);
  add(new THREE.TorusGeometry(3.45, 0.07, 6, 28).rotateX(Math.PI / 2), MAT.flat('#f0c850', 0.5), 0, 1.72, 0);
  // the door (east, toward the depot path): a dark opening, the flaps tied back
  add(rbox(0.12, 1.55, 1.1, 0.02), MAT.flat('#141022'), 3.2, 0.78, 0);
  for (const s of [-1, 1]) { const f = add(new THREE.ConeGeometry(0.36, 1.6, 3), MAT.flat('#e8c060', 0.8), 3.28, 0.8, s * 0.7); f.rotation.z = Math.PI; }
  // the centre pole's star finial and a pennant
  add(cyl(0.05, 0.05, 1.0, 6), MAT.wood('dark'), 0, 5.2, 0);
  const st = add(new THREE.OctahedronGeometry(0.28, 0), MAT.glow('#ffe080', '#ffb020', 1.2), 0, 5.8, 0);
  const pen = add(new THREE.PlaneGeometry(0.9, 0.35), MAT.flat('#c03a3a', 0.8, { side: THREE.DoubleSide }), 0.48, 5.45, 0);
  // a sign by the path, as in the original: "Tent of the Weather Wizard"
  add(cyl(0.06, 0.07, 1.6, 6), MAT.wood('dark'), 4.4, 0.8, 1.9);
  add(plane(1.5, 0.38), MAT.map(signTex('Tent of the Weather Wizard'), 0.8, { side: THREE.DoubleSide }), 4.4, 1.45, 1.9, Math.PI / 2);
  physics.add({ type: 'cyl', x, z, r: 3.2, top: gy + 5 });
  return { door: { x: x + 3.75, z }, spin: (t) => { st.rotation.y = t; pen.rotation.y = Math.sin(t * 2.3) * 0.25; } };
}

// ---------------------------------------------------------------- inside the tent
function buildTentRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'wtent', TENT_IN.x, TENT_IN.z);
  const R = B.room, k = B.k;
  const W = 13, D = 9.5, H = 4.6;
  R.view = 15; R.follow = 0.3; R.music = 'home';
  const stone = MAT.stone('grey', 2), rough = MAT.rubble('grey');
  B.shell({ floor: MAT.stone('grey', 3), slab: rough, body: stone, low: rough, rail: MAT.iron(), cap: MAT.iron(), H, t: 0.55, dado: 1.0, rimH: 0.5, rimMat: rough, W, D,
    back: [{ at: -5.0, w: 1.8, h: 2.6, y0: 0, kind: 'door' }] });
  const BZ = -D / 2;
  R.exits.push({ x: B.cx - 5.0, z: B.cz + BZ + 0.5, r: 0.85, to: 'wtent-out' });
  R.spawn = { x: B.cx - 5.0, z: B.cz + BZ + 1.8, a: 0 };
  // the hearth: a stone platform in the back with the great cauldron over a fire
  k.add(rbox(3.6, 0.5, 2.2, 0.05), rough, 1.5, 0.25, BZ + 1.2);
  B.col(1.5, BZ + 1.2, 1.8, 1.1, 0.5, { stair: true });
  k.add(rbox(3.0, 1.0, 0.5, 0.05), stone, 1.5, 0.75, BZ + 0.3);
  const caul = lathe([[0.001, 0], [0.42, 0.04], [0.68, 0.3], [0.74, 0.62], [0.66, 0.9], [0.7, 0.96], [0.6, 0.98]], 16);
  k.add(caul, MAT.flat('#2a6a72', 0.5, { metalness: 0.3 }), 1.5, 0.62, BZ + 1.3);
  k.add(new THREE.CircleGeometry(0.6, 18).rotateX(-Math.PI / 2), MAT.glow('#7ff0e0', '#30c0b0', 1.4), 1.5, 1.56, BZ + 1.3);
  for (let i = 0; i < 3; i++) k.add(cyl(0.06, 0.06, 0.9, 6), MAT.wood('dark'), 1.5 + (i - 1) * 0.35, 0.56, BZ + 1.3 + (i % 2 ? 0.2 : -0.2), 0, { rz: Math.PI / 2 });
  const fire = B.light('#ff9a4a', 3, 4, 1.5, 0.8, BZ + 1.3);
  const sparkle = glowSprite('#bff8ff', 0.9, 0.6); B.group.add(sparkle);
  sparkle.position.set(1.5, 1.9, BZ + 1.3);
  B.ccol(1.5, BZ + 1.3, 0.75, 1.6);
  R.updaters.push((dt, t) => { sparkle.material.opacity = 0.4 + Math.sin(t * 3) * 0.2; sparkle.position.y = 1.85 + Math.sin(t * 1.7) * 0.12; if (fire) fire.intensity = 2.6 + Math.sin(t * 9) * 0.4 + Math.sin(t * 13) * 0.3; });
  // the long table of bottles and bowls, benches either side
  B.put(0.4, 1.0, 0.05, (kk) => { table(kk, { w: 3.2, d: 1.15, pal: 'dark' }); return { hw: 1.6, hd: 0.58, top: 0.8 }; });
  for (const s of [-1, 1]) B.put(0.4, 1.0 + s * 1.05, 0.05, (kk) => { bench(kk, { w: 2.8, pal: 'dark' }); return { hw: 1.4, hd: 0.2, top: 0.45 }; });
  k.at(0.4, 0.8, 1.0, 0.05, () => {
    jar(k, -1.2, 0, -0.2, 'bottle', '#3a7a8a', 1.3); jar(k, -0.8, 0, 0.25, 'jar', '#c8a050'); jar(k, 1.1, 0, -0.15, 'bottle', '#2a5a6a', 1.1); jar(k, 1.35, 0, 0.2, 'jar', '#8a5a3a', 0.9);
    plate(k, -0.2, 0, 0.2, 0, '#c89a6a', 0.14, false); plate(k, 0.35, 0, -0.25, 0, '#a07a5a', 0.13, false); plate(k, 0.7, 0, 0.25, 0, '#c89a6a', 0.11, false);
    candle(k, 0.1, 0, -0.05);
  });
  // iron candle stands
  for (const [x, z] of [[-W / 2 + 1, BZ + 1.2], [W / 2 - 1, BZ + 1.4], [-W / 2 + 1, 2.4], [W / 2 - 1, 2.6]]) {
    k.add(cyl(0.04, 0.05, 1.5, 6), MAT.iron(), x, 0.75, z);
    k.add(cyl(0.18, 0.12, 0.08, 8), MAT.iron(), x, 0.06, z);
    k.add(cyl(0.12, 0.08, 0.06, 8), MAT.iron(), x, 1.5, z);
    candle(k, x, 1.53, z);
    const s = glowSprite('#ffd890', 0.7, 0.6); s.position.set(x, 1.85, z); B.group.add(s);
    B.ccol(x, z, 0.2, 1.6);
  }
  B.light('#ffd8a0', 3.5, 9, -3, 3.4, 1); B.light('#ffd8a0', 3.5, 9, 3.5, 3.4, 1.5);
  // star plaques on the walls, shelves of bottles, a scroll, a spotted rug
  const plq = MAT.map(starPlaque(), 0.6, { transparent: true });
  k.add(plane(1.1, 1.1), plq, -2.4, 2.3, BZ + 0.03); k.add(plane(1.0, 1.0), plq, -W / 2 + 0.03, 2.3, -0.5, Math.PI / 2);
  k.add(rbox(2.2, 0.06, 0.3, 0.02), MAT.wood('dark'), 4.4, 2.0, BZ + 0.18);
  for (let i = 0; i < 5; i++) jar(k, 3.5 + i * 0.42, 2.03, BZ + 0.18, i % 2 ? 'bottle' : 'jar', ['#3a7a8a', '#c8a050', '#7a4a8a', '#2a5a6a', '#8a5a3a'][i], 0.8);
  k.add(plane(0.8, 1.0), MAT.paper('#efe2c0', '#6a4a2a', 'star'), 4.4, 3.0, BZ + 0.03);
  k.at(-3.8, 0.01, 2.2, 0.2, () => rug(k, 2.0, 1.3, ['#c89a4a', '#3a2a1a', '#d8a040', '#f0d890', '#2a1a0a'], 7));
  R.npcSpots = { bersimon: { x: B.cx + 0.2, z: B.cz + BZ + 2.6, a: 0.2 } };
  B.giver('wt_shelf', 4.4, BZ + 0.9, ['magic', 'magic', 'money'], 1, { r: 1.1 });
  return B.finish();
}

// ---------------------------------------------------------------- the School of Magic's stone face (Desert Island)
function buildSchoolOutside(physics, desert) {
  const L = WIZ.school.local, ox = DESERT.x, oz = DESERT.z;
  const gy = physics.groundAt(ox + L.x, oz + L.z - 2.6);
  const g = new THREE.Group(); g.name = 'schoolFace'; g.position.set(L.x, gy, L.z); g.rotation.y = Math.PI;   // (it looks south, toward the village)
  desert.group.add(g);
  const rock = MAT.stone('grey', 1), add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const faceM = MAT.flat('#9a98a6', 0.85);
  // the head: a broad egg, a heavy brow, angry sockets with glowing red eyes, a long nose, the door in the chin
  add(new THREE.SphereGeometry(1, 14, 10), faceM, 0, 3.6, 0).scale.set(3.3, 4.0, 2.2);
  for (const s of [-1, 1]) {
    add(rbox(2.4, 0.6, 1.0, 0.2), faceM, s * 1.35, 5.3, 1.75, 0, -s * 0.25, s * 0.32);   // the brow, slanting down to the nose
    const eye = add(new THREE.SphereGeometry(0.62, 12, 8), MAT.glow('#ff4a12', '#d02800', 1.3), s * 1.35, 4.65, 1.75);
    eye.scale.set(1.25, 0.5, 0.4); eye.rotation.z = s * 0.3;
  }
  add(new THREE.ConeGeometry(0.5, 1.6, 4), faceM, 0, 3.9, 2.15, -0.2, Math.PI / 4);
  add(rbox(1.5, 2.1, 0.3, 0.05), MAT.wood('dark'), 0, 1.05, 2.1);
  add(new THREE.CircleGeometry(0.28, 12), MAT.glow('#bff4ff', '#40a0d0', 1.0), 0, 1.4, 2.27);
  add(rbox(2.4, 0.25, 1.2, 0.05), rock, 0, 0.12, 2.6);
  // two horned chimneys to the side
  for (const s of [-1, 1]) {
    add(cyl(0.45, 0.55, 3.6, 10), MAT.flat('#8a6a5a', 0.85), s * 4.6, 1.8, 0.6);
    for (const h of [-1, 1]) add(new THREE.ConeGeometry(0.16, 0.9, 6), MAT.flat('#8a6a5a', 0.85), s * 4.6 + h * 0.32, 3.95, 0.6, 0, 0, -h * 0.45);
  }
  // and the sign
  add(cyl(0.06, 0.07, 1.6, 6), MAT.wood('dark'), 2.4, 0.8, 3.6);
  add(plane(1.3, 0.34), MAT.map(signTex('School of Magic'), 0.8, { side: THREE.DoubleSide }), 2.4, 1.45, 3.62);
  // colliders (world): the head, the chimneys
  const W = (x, z) => { const c = Math.cos(Math.PI), s = Math.sin(Math.PI); return { x: ox + L.x + x * c + z * s, z: oz + L.z - x * s + z * c }; };
  physics.add({ type: 'cyl', ...W(0, 0), r: 3.0, top: gy + 7.5 });
  for (const s of [-1, 1]) physics.add({ type: 'cyl', ...W(s * 4.6, 0.6), r: 0.55, top: gy + 3.6 });
  return { door: W(0, 3.0) };
}

// ---------------------------------------------------------------- inside the School of Magic
function buildSchoolRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'school', SCHOOL_IN.x, SCHOOL_IN.z);
  const R = B.room, k = B.k;
  const W = 18, D = 12, H = 5.2;
  R.view = 19; R.follow = 0.3; R.music = 'home';
  const stone = MAT.stone('grey', 2), rough = MAT.rubble('grey');
  const penta = pentaTex(); penta.wrapS = penta.wrapT = THREE.RepeatWrapping; penta.repeat.set(W / 1.5, D / 1.5);   // (a pentagram on every 1.5 m slab)
  B.shell({ floor: MAT.map(penta, 0.85), slab: rough, body: stone, low: rough, rail: MAT.iron(), cap: MAT.iron(), H, t: 0.6, dado: 1.0, rimH: 0.5, rimMat: rough, W, D,
    back: [{ at: -7.4, w: 2.0, h: 2.8, y0: 0, kind: 'door' }] });
  const BZ = -D / 2;
  R.exits.push({ x: B.cx - 7.4, z: B.cz + BZ + 0.5, r: 0.9, to: 'school-out' });
  R.spawn = { x: B.cx - 7.4, z: B.cz + BZ + 1.9, a: 0 };
  // star windows along the back wall, glowing teal
  const plq = MAT.map(starPlaque('#1a6a6a'), 0.4, { transparent: true, emissive: '#2a8a8a', emissiveIntensity: 0.6 });
  for (const x of [-3.5, 0.5, 4.5]) k.add(plane(1.3, 1.3), plq, x, 2.8, BZ + 0.03);
  // the dais with the blackboard (back right) and the rector's red-clothed table
  k.add(rbox(5.2, 0.4, 3.0, 0.05), rough, 6.0, 0.2, BZ + 1.5);
  k.add(rbox(5.2, 0.2, 0.6, 0.05), rough, 6.0, 0.1, BZ + 3.3);
  B.col(6.0, BZ + 1.5, 2.6, 1.5, 0.4, { stair: true });
  k.add(rbox(3.2, 1.7, 0.12, 0.02), MAT.wood('dark'), 6.0, 2.4, BZ + 0.1);
  k.add(plane(3.0, 1.5), MAT.map(boardTex(), 0.9), 6.0, 2.4, BZ + 0.17);
  B.put(4.6, BZ + 4.3, 0, (kk) => { table(kk, { w: 1.4, d: 0.9, pal: 'dark' }); kk.add(rbox(1.5, 0.04, 1.0, 0.01), MAT.cloth('#a01818', '#7a1010'), 0, 0.8, 0); return { hw: 0.7, hd: 0.45, top: 0.82 }; });
  k.at(4.6, 0.82, BZ + 4.3, 0, () => { jar(k, 0, 0, 0, 'bottle', '#3a3a5a', 1.2); });
  // long tables of bowls and bottles in two rows (the students' benches)
  for (const [x, z] of [[-4.5, -0.6], [-4.5, 2.6], [0.6, -0.6], [0.6, 2.6]]) {
    B.put(x, z, 0, (kk) => { table(kk, { w: 3.6, d: 0.9, pal: 'dark' }); return { hw: 1.8, hd: 0.45, top: 0.8 }; });
    B.put(x, z + 0.8, 0, (kk) => { bench(kk, { w: 3.2, pal: 'dark' }); return { hw: 1.6, hd: 0.18, top: 0.45 }; });
    k.at(x, 0.8, z, 0, () => {
      plate(k, -1.2, 0, 0.1, 0, '#c89a6a', 0.14, false); plate(k, -0.3, 0, -0.1, 0, '#a07a5a', 0.12, false); plate(k, 0.8, 0, 0.12, 0, '#c89a6a', 0.13, false);
      jar(k, 0.3, 0, 0.15, 'bottle', '#3a7a8a', 1.1); jar(k, 1.4, 0, -0.1, 'jar', '#c8a050', 0.9); candle(k, -0.8, 0, -0.15);
    });
  }
  // Ker'aooc's corner: a cot, shelves of remedies, a basin
  k.add(rbox(1.0, 0.45, 2.1, 0.06), MAT.wood('honey'), -W / 2 + 0.8, 0.22, 3.6);
  k.add(rbox(0.95, 0.12, 2.0, 0.05), MAT.cloth('#e8e2d0', '#c8c0a8'), -W / 2 + 0.8, 0.5, 3.6);
  B.col(-W / 2 + 0.8, 3.6, 0.5, 1.05, 0.56, { noStand: true });
  k.add(rbox(0.3, 0.06, 2.4, 0.02), MAT.wood('dark'), -W / 2 + 0.18, 1.9, 0.6);
  for (let i = 0; i < 6; i++) jar(k, -W / 2 + 0.18, 1.93, -0.4 + i * 0.4, i % 2 ? 'jar' : 'bottle', ['#6ab84a', '#c8a050', '#3a7a8a', '#b85a8a', '#8a5a3a', '#4a9a7a'][i], 0.8);
  // pillars
  const pill = lathe([[0.001, 0], [0.55, 0], [0.45, 0.3], [0.4, H - 0.4], [0.55, H], [0.001, H]], 10);
  for (const x of [-2.0, 3.2]) { k.add(pill, stone, x, 0, 1.0); B.ccol(x, 1.0, 0.48, H); }
  B.light('#ffe0b0', 4, 12, -4, 4.2, 1); B.light('#ffe0b0', 4, 12, 3, 4.2, 1); B.light('#9ff0f0', 2, 8, 0.5, 3, BZ + 1);
  R.npcSpots = {
    magus: { x: B.cx + 5.2, z: B.cz + BZ + 1.9, a: 0.3 },
    keraooc: { x: B.cx - W / 2 + 2.1, z: B.cz + 2.2, a: Math.PI / 2 },
  };
  B.giver('sm_remedies', -W / 2 + 0.9, 0.6, ['life', 'life', 'magic'], 1, { r: 1.1 });
  return B.finish();
}

export function buildWizards(scene, physics, desert, world) {
  const tent = buildTentOutside(scene, physics);
  world?.updaters.push((dt, t) => tent.spin(t));   // (the finial turns, the pennant flaps)
  WIZ.tent.door = tent.door;
  if (desert) WIZ.school.door = buildSchoolOutside(physics, desert).door;
  return { wtent: buildTentRoom(scene, physics), school: buildSchoolRoom(scene, physics) };
}

// doors and exits, the same in every chapter
export function wizardDoors() {
  const out = [];
  if (WIZ.tent.door) out.push({ x: WIZ.tent.door.x, z: WIZ.tent.door.z, r: 0.9, room: 'wtent' });
  if (WIZ.school.door) out.push({ x: WIZ.school.door.x, z: WIZ.school.door.z, r: 1.0, room: 'school', region: 'desert' });
  return out;
}
export function wizardExit(to) {
  if (to === 'wtent-out' && WIZ.tent.door) return { x: WIZ.tent.door.x + 1.2, z: WIZ.tent.door.z, a: Math.PI / 2 };
  if (to === 'school-out' && WIZ.school.door) {
    const d = WIZ.school.door, cx = DESERT.x + WIZ.school.local.x, cz = DESERT.z + WIZ.school.local.z, l = Math.hypot(d.x - cx, d.z - cz);
    return { room: 'desert', x: d.x + (d.x - cx) / l * 1.4, z: d.z + (d.z - cz) / l * 1.4, a: Math.atan2(d.x - cx, d.z - cz) };
  }
  return null;
}
