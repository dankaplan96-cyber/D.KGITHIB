// Twinsun's wizards, twelve years on (LBA2's, measured and looked at, nothing copied):
//  - Bersimon the Weather Wizard's tent on Citadel's north plateau, where the original's stood (its S21, by the
//    depot): a round tent of red canvas under a rounded, pointed roof, as LBA2's (body 3; CITADEL-85), a few small
//    gold stars on it. Inside — bigger than the outside, as a wizard's tent is —
//    a stone room after the original's (the user's reference #63): a hearth with a great teal cauldron, a long table
//    of bottles and bowls with benches, iron candle stands, star plaques on the walls, a spotted rug.
//    Bersimon (look 'bersimon', body 111) tops up Twinsen's magic when they talk.
//  - The School of Magic on Desert Island: its entrance is the original's great stone face (the user's reference: grey,
//    deep brows, glowing orange-red eyes, the door carved in its chin) at the original's own place in the north-west,
//    set in a rock wall beside the great hall in its pool (WORLD-80 step 3, src/game/desertold.js). Inside
//    (references #26, #57): a stone hall floored with pentagram slabs, star
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
import { MAT, rbox, plane, cyl, sphere, lathe, canvasTex, table, bench, jar, plate, candle, rug, railing, barrel, M, TEX, Kit } from './props.js';
import { DESERT } from './desert.js';
import { SCHOOL_SITE, SCHOOL_DOOR } from './desertold.js';

// (the School's face stands at the original's place on Desert Island, WORLD-80 step 3: desertold.js builds it with the
//  island; its door's spot is known before the island is built, so the story's door list has it from the start)
export const WIZ = { tent: { x: -100, z: -71 }, school: { local: { x: SCHOOL_SITE.x, z: SCHOOL_SITE.z }, door: { x: DESERT.x + SCHOOL_DOOR.x, z: DESERT.z + SCHOOL_DOOR.z } } };
const TENT_IN = { x: 5400, z: 0 }, SCHOOL_IN = { x: 5600, z: 0 };   // (clear of the regions' ground patches)

// ---------------------------------------------------------------- painted cloths and plaques
// (CITADEL-85: LBA2's tent is red. The canvas on the tent's lathe: u once round it (20.7 m: 4 cm a pixel), v up its
//  profile (about 6 m: 2.3 cm a pixel), so a star is drawn twice as tall as wide to come out round. Sixteen gores with
//  their seams, a darker hem with a gold line over it, and a dozen small stars: detail on the red, not a pattern)
const redCloth = () => canvasTex(512, 256, (x, W, H) => {
  x.fillStyle = '#b8362e'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#a32d27'; for (let i = 0; i < 16; i++) x.fillRect(i * 32, 0, 3, H);   // the gores' seams
  x.fillStyle = '#c4433a'; for (let i = 0; i < 16; i++) x.fillRect(i * 32 + 10, 0, 12, H);   // (the cloth's sheen between them)
  x.fillStyle = '#7e2420'; x.fillRect(0, H - 22, W, 22);   // the hem (v = 0 is the image's bottom row)
  x.fillStyle = '#e0b54e'; x.fillRect(0, H - 27, W, 3);
  const star = (cx, cy, r) => { x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.75); } x.closePath(); x.fill(); };
  x.fillStyle = '#e8c25a';
  for (let i = 0; i < 12; i++) star((i * 43 + 17) % W, 40 + ((i * 67) % (H - 110)), 5 + (i % 2) * 2);
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
  x.fillStyle = '#a8957a'; x.fillRect(0, 0, W, W);   // (WORLD-ART-7: warm sandstone slabs, lighter than the grey walls)
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; x.fillRect(Math.random() * W, Math.random() * W, 6, 6); }
  x.strokeStyle = '#4a3a2a'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, W - 8);
  x.strokeStyle = '#6a4a2e'; x.lineWidth = 5;
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
  const cloth = MAT.map(redCloth(), 0.9, { side: THREE.DoubleSide });
  const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  // (CITADEL-85: one rounded canvas, LBA2's form: an upright wall (inside the collider's 3.2 but for 0.1 m at its
  //  foot) swelling into a full, rounded roof drawn up to a point; it was a blue drum under a straight cone with a
  //  gold ring. The profile's points are spaced about evenly along it, so the cloth's v follows the canvas)
  add(new THREE.LatheGeometry([[3.3, 0], [3.29, 0.55], [3.27, 1.1], [3.24, 1.6], [3.1, 2.15], [2.8, 2.65], [2.36, 3.1], [1.82, 3.5], [1.25, 3.86], [0.7, 4.22], [0.3, 4.6], [0.08, 4.86], [0.0001, 4.95]].map(([a, b]) => new THREE.Vector2(a, b)), 20), cloth, 0, 0, 0);
  // the door (east, toward the depot path): a dark opening, the flaps tied back
  add(rbox(0.12, 1.55, 1.1, 0.02), MAT.flat('#141022'), 3.22, 0.78, 0);
  for (const s of [-1, 1]) { const f = add(new THREE.ConeGeometry(0.36, 1.6, 3), MAT.flat('#e8c060', 0.8), 3.3, 0.8, s * 0.7); f.rotation.z = Math.PI; }
  // the centre pole's star finial and a pennant (gold against the sky over the red)
  add(cyl(0.05, 0.05, 0.8, 6), MAT.wood('dark'), 0, 5.2, 0);
  const st = add(new THREE.OctahedronGeometry(0.26, 0), MAT.glow('#ffe080', '#ffb020', 1.2), 0, 5.75, 0);
  const pen = add(new THREE.PlaneGeometry(0.9, 0.35), MAT.flat('#e8c060', 0.8, { side: THREE.DoubleSide }), 0.48, 5.4, 0);
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
  // (WORLD-ART-7: a lived-in wizard's den — warm boards under the stone walls, brass rails like the tent's gold stars)
  B.shell({ floor: MAT.planks('honey'), slab: rough, body: stone, low: rough, rail: MAT.brass(), cap: MAT.iron(), H, t: 0.55, dado: 1.0, rimH: 0.5, rimMat: rough, W, D,
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
  // the spotted rug, and under it (SEWERS-1, S-1: LBA2's tent had its own way down into the sewers) a trapdoor to a
  // stair down to the old water hall's west end. Opened (story/sewers.js: Bersimon rolls the rug back, or Twinsen
  // pushes it up from below), the rug lies rolled beside it and the leaf stands up on its hinge.
  const TD = { x: -3.8, z: 2.2, s: 0.95 };
  const rugG = new THREE.Group(); rugG.position.set(TD.x, 0.01, TD.z); rugG.rotation.y = 0.2; B.group.add(rugG);
  { const rk = new Kit(rugG); rug(rk, 2.0, 1.3, ['#c89a4a', '#3a2a1a', '#d8a040', '#f0d890', '#2a1a0a'], 7); rk.flush(); }
  const rolled = new THREE.Mesh(cyl(0.11, 0.11, 1.3, 10), MAT.paint('#b08840', 0.9)); rolled.rotation.x = Math.PI / 2; rolled.position.set(TD.x + 0.85, 0.11, TD.z); rolled.visible = false; B.group.add(rolled);
  const hole = new THREE.Mesh(plane(TD.s, TD.s), MAT.flat('#0c0a08', 1)); hole.rotation.x = -Math.PI / 2; hole.position.set(TD.x, 0.006, TD.z); hole.visible = false; B.group.add(hole);
  const hatch = new THREE.Group(); hatch.position.set(TD.x, 0.004, TD.z - TD.s / 2); B.group.add(hatch);
  { const hk = new Kit(hatch); hk.add(rbox(TD.s, 0.05, TD.s, 0.01), MAT.planks('honey'), 0, 0.025, TD.s / 2); for (const z of [0.15, TD.s - 0.15]) hk.add(rbox(TD.s + 0.02, 0.03, 0.07, 0.005), MAT.iron(), 0, 0.055, z); hk.add(cyl(0.05, 0.05, 0.02, 10), MAT.brass(), 0, 0.06, TD.s - 0.3); hk.flush(); }
  const trapExit = { x: B.cx + TD.x, z: B.cz + TD.z, r: 0.45, room: 'sewer' };
  R.entries = { sewer: { x: B.cx + TD.x, z: B.cz + TD.z + 1.35, a: 0 } };
  R.trap = {
    at: { x: B.cx + TD.x, z: B.cz + TD.z },
    setOpen(b) {
      rugG.visible = !b; rolled.visible = b; hole.visible = b; hatch.rotation.x = b ? -1.9 : 0;
      const i = R.exits.indexOf(trapExit); if (b && i < 0) R.exits.push(trapExit); else if (!b && i >= 0) R.exits.splice(i, 1);
    },
  };
  R.npcSpots = { bersimon: { x: B.cx + 0.2, z: B.cz + BZ + 2.6, a: 0.2 } };
  B.giver('wt_shelf', 4.4, BZ + 0.9, ['magic', 'magic', 'money'], 1, { r: 1.1 });
  return B.finish();
}

// ---------------------------------------------------------------- inside the School of Magic
// LBA-DESERT-1 (the laptop's proposal; the user 2.11: "check the desert island, the temple of Bù twelve years after
// LBA2, and the School of Magic"): the School's great hall after LBA2's scene 27, about 80 % alike. Our own geometry,
// from a study of the original's layout (numbers and descriptions only; nothing copied). One of the original's cells
// is 0.63 m here and one of its layers 0.4 m (the user 2.11: "make them bigger, it's really small": 1.5 times the
// first cut, the camera close and following Twinsen as in his own house). As the game's camera sees it:
//   - the long back wall of grey stone with seven tall windows of teal glass, the short left wall with an arch
//     between two columns and two round star windows
//   - the classroom raised 2.2 m in the back left corner: the teacher's dais along the left wall (a red-clothed
//     table, two benches against the wall, a star on the floor), the blackboard on the back wall, two rows of three
//     benches facing the dais
//   - a short stair down from the classroom to a walkway 1.35 m up that runs to the front along a ridge of rock, an
//     iron fence on its open side; near its far end a stair down into the hall between two gargoyle posts
//   - the dining hall below: eight long tables with bowls, bottles and candles; at its back a dais 0.8 m up with the
//     star chest and candle stands, reached by a stepped pyramid; rocks heaped where the walkway meets it
//   - the door at the front of the hall
// Twelve years on (ours): Ker'aooc's cot and her cabinet of remedies by the door; everything else as it was.
function buildSchoolRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'school', SCHOOL_IN.x, SCHOOL_IN.z);
  const R = B.room, k = B.k;
  const s = 0.63, L = 0.4, W = 41 * s, D = 39 * s, H = 9.0;
  const X = (lx) => (lx - 22) * s - W / 2, Z = (lz) => (lz - 3) * s - D / 2;   // (the original's cell → the room's frame)
  const CL = 8 * L, CD = 10 * L, WK = 5 * L, DS = 3 * L;   // classroom, its dais, the walkway, the hall's dais
  R.view = 12.5; R.follow = 0.7; R.music = 'desert_in';   // (DESERT-BAR: the island heard through the walls, as its other rooms; it had Twinsen's home theme)
  // (the original's walls are a light grey stone: the grey stone texture lightened toward it and lit a little from
  //  within, as Chez Luc's is, so the long wall reads as stone in the hall's dim light)
  const stone = M('sc_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#dcdad6', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.22 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.2), iron = MAT.iron();
  const flags = MAT.tiles('#8e8c88', '#827f7a', '#3a3a3c', false, 3), checks = MAT.tiles('#a29f9a', '#6f6d6a', '#3a3a3c', true, 4);
  // (REVIEW-DESERT-ART g: the heaps' stones matte and faceted in the island's own rock tones, three of them; the rubble
  //  texture on smooth balls read as piles of shiny black boulders)
  const rockM = ['#9a8f80', '#8a8072', '#a89c8a'].map((c) => MAT.flat(c, 0.97, { flatShading: true }));
  const glass = MAT.map(latticeTex(), 0.3, { emissive: '#3fb8a8', emissiveIntensity: 0.8, emissiveMap: latticeTex() });
  const DOORX = (X(56) + X(61)) / 2, DOORW = X(61) - X(56);
  const WINS = [35, 39, 43, 47, 51, 55, 59];
  B.shell({ floor: flags, slab: rough, body: stone, low: stone, rail: iron, cap, H, t: 0.6, dado: 0.8, rimH: 0.5, rimMat: rough, W, D,
    rimGaps: [{ x: DOORX, w: DOORW }],
    back: WINS.map((lx) => ({ kind: 'window', at: X(lx), w: 1.4, h: 3.4, y0: 4.2, glass, frame: cap, sill: cap, mullion: iron, lining: stone })) });
  // (each window's round head: teal glass in a stone arch)
  for (const lx of WINS) {
    k.add(new THREE.CircleGeometry(0.7, 16, 0, Math.PI), glass, X(lx), 7.6, -D / 2 + 0.02);
    k.add(new THREE.TorusGeometry(0.76, 0.08, 5, 16, Math.PI), cap, X(lx), 7.6, -D / 2 + 0.05);
  }
  // a solid of cells [lx0, lx1) × [lz0, lz1) up to top, its top paved
  // (REVIEW-DESERT-ART d: a side against the room's left, right or back wall runs 0.3 m into the wall, so its face is
  //  not in the wall's own plane, where the two textures fought)
  const block = (lx0, lz0, lx1, lz1, top, face, pave, extra = {}) => {
    const x0 = X(lx0) - (lx0 === 22 ? 0.3 : 0), x1 = X(lx1) + (lx1 === 63 ? 0.3 : 0), z0 = Z(lz0) - (lz0 === 3 ? 0.3 : 0), z1 = Z(lz1), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    k.add(rbox(x1 - x0, top, z1 - z0, 0.03), face, cx, top / 2, cz);
    if (pave) k.add(rbox(x1 - x0 - 0.04, 0.02, z1 - z0 - 0.04, 0.005), pave, cx, top + 0.005, cz);
    return B.col(cx, cz, (x1 - x0) / 2 + 0.06, (z1 - z0) / 2 + 0.06, top, extra);   // (6 cm over each edge: abutting blocks shrink 5 cm each under groundAt and left a 10 cm seam to fall into)
  };
  // rough rock lumps over cells [lx0, lx1) × [lz0, lz1), from y0 up to about top: they stand as one solid
  const rocks = (lx0, lz0, lx1, lz1, y0, top, seed = 1) => {
    let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const x0 = X(lx0), x1 = X(lx1), z0 = Z(lz0), z1 = Z(lz1);
    const n = Math.max(2, Math.round((x1 - x0) * (z1 - z0) / 0.9));
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.25 + rnd() * (x1 - x0 - 0.5), z = z0 + 0.25 + rnd() * (z1 - z0 - 0.5), h = (top - y0) * (0.7 + rnd() * 0.4), w = 0.5 + rnd() * 0.5;
      k.add(sphere(0.5, 9, 7), rockM[i % 3], x, y0 + h * 0.45, z, rnd() * 3, { sx: w * 1.4, sy: h, sz: w * 1.2 });
    }
    B.col((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, top, { noStand: true });
  };

  // --- the classroom, 2.2 m up in the back left corner; the pit of rock in front of it (out of reach)
  block(29, 3, 40, 18, CL, rough, checks);   // (from the dais's side on: under the dais its faces lay in the dais's own)
  B.col((X(22) + X(40)) / 2, Z(18) + 0.04, (X(40) - X(22)) / 2, 0.05, CL + 1.1, { seeThrough: true, noStand: true });   // (its open edge: no fall into the pit)
  k.add(rbox(X(42) - X(22), 0.04, Z(42) - Z(18), 0.01), MAT.rubble('slate'), (X(22) + X(42)) / 2, 0.02, (Z(18) + Z(42)) / 2);
  rocks(22, 18, 42, 42, 0, 1.3, 3);
  // the teacher's dais along the left wall, one step up from the classroom in its middle
  block(22, 3, 29, 18, CD, cap, flags);
  block(29, 8, 30, 13, CL + L, cap, flags);
  k.add(plane(2.2, 2.2), MAT.map(starFloorTex(), 0.8, { transparent: true }), X(25.5), CD + 0.02, Z(13.5), 0, { rx: -Math.PI / 2 });
  B.put(X(27.5), Z(9), 0, (kk) => { table(kk, { w: 1.0, d: 0.9, h: 0.75, pal: 'dark' }); kk.add(rbox(1.1, 0.04, 1.0, 0.01), MAT.cloth('#a01818', '#7a1010'), 0, 0.76, 0); for (const sx of [-1, 1]) kk.add(rbox(0.04, 0.3, 1.0, 0.01), MAT.cloth('#a01818', '#7a1010'), sx * 0.55, 0.62, 0); return { hw: 0.55, hd: 0.5, top: 0.8 }; }, { y: CD });
  k.at(X(27.5), CD + 0.78, Z(9), 0, () => { jar(k, 0.1, 0, 0, 'bottle', '#3a3a5a', 1.2); candle(k, -0.25, 0, 0.15); });
  for (const lz of [5, 16]) B.put(X(22) + 0.3, Z(lz), Math.PI / 2, (kk) => bench(kk, { w: 1.3, pal: 'dark' }), { y: CD });
  // two rows of three benches facing the dais
  for (const lz of [5, 15.5]) for (const lx of [33.5, 35.5, 37.5]) B.put(X(lx), Z(lz), Math.PI / 2, (kk) => bench(kk, { w: 1.3, pal: 'dark' }), { y: CL });
  // the blackboard on the back wall, over the dais's corner
  k.add(rbox(3.4, 1.8, 0.1, 0.02), MAT.wood('dark'), X(31), CL + 2.2, -D / 2 + 0.06);
  k.add(plane(3.2, 1.6), MAT.map(boardTex(), 0.9), X(31), CL + 2.2, -D / 2 + 0.12);
  // the arch between two columns in the left wall, two round star windows beside it
  const pillar = lathe([[0.001, 0], [0.32, 0], [0.3, 0.15], [0.24, 0.26], [0.24, 3.0], [0.31, 3.15], [0.32, 3.3], [0.001, 3.3]], 12);
  for (const lz of [9, 12.5]) { k.add(pillar, cap, X(22) + 0.32, CD, Z(lz)); B.ccol(X(22) + 0.32, Z(lz), 0.3, CD + 3.3); }
  k.add(plane(Z(12.5) - Z(9) - 0.5, 3.2), MAT.flat('#141618', 0.95), X(22) + 0.02, CD + 1.6, (Z(9) + Z(12.5)) / 2, Math.PI / 2);
  k.add(new THREE.TorusGeometry((Z(12.5) - Z(9)) / 2, 0.18, 6, 18, Math.PI), cap, X(22) + 0.24, CD + 3.3, (Z(9) + Z(12.5)) / 2, Math.PI / 2);
  const plq = MAT.map(starPlaque('#1a6a6a'), 0.4, { transparent: true, emissive: '#2a8a8a', emissiveIntensity: 0.7 });
  for (const lz of [6.2, 15.3]) k.add(plane(1.4, 1.4), plq, X(22) + 0.03, CD + 2.6, Z(lz), Math.PI / 2);

  // --- the stair down to the walkway, the rocks either side of it
  for (let i = 0; i < 3; i++) {
    const top = CL - L * (i + 1), x = X(40 + i) + s / 2, z0 = Z(8), z1 = Z(13);
    k.add(rbox(s + 0.02, top, z1 - z0, 0.015), cap, x, top / 2, (z0 + z1) / 2);
    B.col(x, (z0 + z1) / 2, s / 2 + 0.12, (z1 - z0) / 2, top, { stair: true });   // (+0.12: the steps overlap each other and the floor at their top under groundAt's 5 cm shrink)
  }
  rocks(40, 3, 47, 8, CL - 0.3, CL + 0.6, 5);
  rocks(40, 13, 43, 18, WK, CL + 0.6, 7);

  // --- the walkway along the ridge of rock, 1.35 m up, to the front; the stair down into the hall near its end
  block(43, 8, 46, 41, WK, stone, flags);
  block(43, 41, 47, 42, WK + 0.9, rough, null, { noStand: true });   // (its front parapet)
  const RIDGE = WK + 2.4;   // (the ridge of rock between the walkway and the pit)
  k.add(rbox(X(43) - X(42) + 0.1, RIDGE, Z(42) - Z(18), 0.06), rough, (X(42) + X(43)) / 2, RIDGE / 2, (Z(18) + Z(42)) / 2);
  B.col((X(42) + X(43)) / 2, (Z(18) + Z(42)) / 2, (X(43) - X(42)) / 2 + 0.05, (Z(42) - Z(18)) / 2, RIDGE, { noStand: true });
  rocks(42, 18, 43, 42, RIDGE - 0.8, RIDGE + 0.6, 11);
  // the iron fence on its open side, broken where the stair goes down
  const FX = X(46) - 0.04, SZ0 = Z(35), SZ1 = Z(39);
  for (const [z0, z1] of [[Z(8), SZ0], [SZ1, Z(41)]]) {
    k.at(0, WK, 0, 0, () => railing(k, [[FX, z0], [FX, z1]], { h: 1.0, mat: iron, step: 0.35 }));
    B.col(FX, (z0 + z1) / 2, 0.06, (z1 - z0) / 2, WK + 1.0, { seeThrough: true, noStand: true });
  }
  for (let i = 0; i < 4; i++) {
    const top = WK - L * (i + 1), x = X(46 + i) + s / 2;
    k.add(rbox(s + 0.02, top, SZ1 - SZ0, 0.015), cap, x, top / 2, (SZ0 + SZ1) / 2);
    B.col(x, (SZ0 + SZ1) / 2, s / 2 + 0.12, (SZ1 - SZ0) / 2, top, { stair: true });
  }
  for (const z of [SZ0, SZ1]) {
    railing(k, [[X(46), z], [X(50), z]], { h: 0.9, mat: iron, step: 0.4 });
    B.col((X(46) + X(50)) / 2, z, (X(50) - X(46)) / 2, 0.05, WK + 0.9, { seeThrough: true, noStand: true });
  }
  // gargoyle posts at the stair's head, globe lamps at the walkway's front end
  for (const z of [SZ0, SZ1]) k.at(FX, WK, z, -Math.PI / 2, () => gargoylePost(k, cap, iron));
  for (const z of [Z(39.6), Z(40.6)]) {
    k.add(cyl(0.14, 0.18, 1.2, 10), stone, X(43) + 0.3, WK + 0.6, z);
    k.add(sphere(0.2, 14, 10), MAT.glow('#bff4ff', '#7fd8ff', 1.3), X(43) + 0.3, WK + 1.4, z);
    B.ccol(X(43) + 0.3, z, 0.18, WK + 1.6, { noStand: true });
  }
  B.put(X(44), Z(9.5), 0, (kk) => barrel(kk, { r: 0.32, h: 0.85, pal: 'dark' }), { y: WK });

  // --- the hall's dais at the back, the stepped pyramid up to it, the rocks where it meets the walkway
  block(47, 3, 63, 11, DS, stone, flags);
  block(50, 11, 60, 16, L, cap, flags); block(51, 11, 59, 15, 2 * L, cap, flags); block(52, 11, 58, 14, DS, cap, flags);
  rocks(47, 3, 50, 10, DS, WK + 1.4, 13);
  B.put(X(55.5), Z(4.6), 0, (kk) => starChest(kk), { y: DS });
  for (const [lx, lz] of [[52, 5], [59.5, 5], [53, 10], [58, 10]]) B.put(X(lx), Z(lz), 0, (kk) => candleStand(kk, iron), { y: DS });
  B.put(X(45.5), Z(8.7), 0, (kk) => candleStand(kk, iron), { y: WK });   // (in the walkway's back corner, off the way to the stair)

  // --- the dining hall: eight long tables, two to a row, with bowls, bottles and candles
  const rows = [[19, [[48, 52], [54, 62]]], [23, [[48, 56], [58, 62]]], [27, [[48, 56], [58, 62]]], [31, [[48, 52], [54, 62]]]];
  let seed = 0;
  for (const [lz, runs] of rows) for (const [a, b] of runs) {
    const x = (X(a) + X(b)) / 2, z = Z(lz) + s, w = X(b) - X(a) - 0.2, sd = seed;
    B.put(x, z, 0, (kk) => table(kk, { w, d: 0.78, h: 0.8, pal: 'dark' }));
    k.at(x, 0.8, z, 0, () => {
      for (let i = 0; i < Math.floor(w / 0.6); i++) {
        const px = -w / 2 + 0.35 + i * 0.6, kind = (i + sd) % 4;
        if (kind === 0) plate(k, px, 0, 0.12, 0, '#c89a6a', 0.13, false);
        else if (kind === 1) jar(k, px, 0, -0.1, 'bottle', ['#3a7a8a', '#6a8a9a', '#2f6f74'][sd % 3], 1.1);
        else if (kind === 2) plate(k, px, 0, -0.08, 0, '#a07a5a', 0.12, false);
        else candle(k, px, 0, 0.1);
      }
    });
    seed++;
  }
  // Ker'aooc's corner by the door: a cot and her cabinet of remedies
  B.put(X(61.5), Z(37.5), 0, (kk) => { kk.add(rbox(0.95, 0.45, 2.0, 0.06), MAT.wood('honey'), 0, 0.22, 0); kk.add(rbox(0.9, 0.12, 1.9, 0.05), MAT.cloth('#e8e2d0', '#c8c0a8'), 0, 0.5, 0); return { hw: 0.48, hd: 1.0, top: 0.56 }; });
  B.put(X(62) - 0.25, Z(33.5), -Math.PI / 2, (kk) => {
    kk.add(rbox(1.6, 1.9, 0.4, 0.03), MAT.wood('dark'), 0, 0.95, 0);
    for (const y of [0.6, 1.1, 1.6]) for (let i = 0; i < 4; i++) jar(kk, -0.55 + i * 0.37, y, 0.22, i % 2 ? 'jar' : 'bottle', ['#6ab84a', '#c8a050', '#3a7a8a', '#b85a8a'][i], 0.8);
    return { hw: 0.8, hd: 0.2, top: 1.9 };
  });
  B.giver('sm_remedies', X(61.2), Z(32), ['life', 'life', 'magic'], 1, { r: 1.1 });
  // the door's stone frame in the front
  for (const sx of [-1, 1]) { k.add(rbox(0.55, 3.6, 0.75, 0.03), cap, DOORX + sx * (DOORW / 2 + 0.27), 1.8, D / 2 + 0.3); B.col(DOORX + sx * (DOORW / 2 + 0.27), D / 2 + 0.3, 0.28, 0.38, 3.6); }
  k.add(rbox(DOORW + 1.1, 0.5, 0.75, 0.03), cap, DOORX, 3.85, D / 2 + 0.3);
  R.exits.push({ x: B.cx + DOORX, z: B.cz + D / 2 - 0.3, r: 0.9, to: 'school-out' });
  R.spawn = { x: B.cx + DOORX, z: B.cz + D / 2 - 1.7, a: Math.PI };

  B.light('#ffe0b0', 6, 20, X(55), 5.5, Z(24)); B.light('#ffe0b0', 5, 16, X(31), CL + 3.2, Z(10)); B.light('#9ff0f0', 3, 18, X(48), 6.2, Z(6)); B.light('#ffd8a0', 3, 10, X(55), DS + 2.0, Z(6));
  R.npcSpots = {
    magus: { x: B.cx + X(26), z: B.cz + Z(11), a: Math.PI / 2 },
    keraooc: { x: B.cx + X(60), z: B.cz + Z(35.5), a: -Math.PI / 2 },
  };
  return B.finish();
}
// the hall's teal window glass: leaded diamonds
const latticeTex = () => canvasTex(128, 256, (x, W, H) => {
  x.fillStyle = '#2a8a80'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,40,40' : '160,255,240'},${Math.random() * 0.15})`; x.fillRect(Math.random() * W, Math.random() * H, 10, 10); }
  x.strokeStyle = '#14302c'; x.lineWidth = 5;
  for (let d = -H; d < W + H; d += 32) { x.beginPath(); x.moveTo(d, 0); x.lineTo(d + H, H); x.stroke(); x.beginPath(); x.moveTo(d, H); x.lineTo(d + H, 0); x.stroke(); }
});
// the star on the teacher's dais
const starFloorTex = () => canvasTex(256, 256, (x, W) => {
  x.clearRect(0, 0, W, W);
  x.strokeStyle = 'rgba(40,36,34,0.85)'; x.lineWidth = 6;
  x.beginPath(); x.arc(W / 2, W / 2, 110, 0, 7); x.stroke();
  x.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5; x.lineTo(W / 2 + Math.cos(a) * 110, W / 2 + Math.sin(a) * 110); } x.stroke();
});
// the hall's props: a gargoyle on a stone post, the star chest, a twisted iron candle stand
function gargoylePost(k, stone, iron) {
  k.add(rbox(0.36, 1.1, 0.36, 0.03), stone, 0, 0.55, 0);
  k.add(sphere(0.2, 10, 8), MAT.flat('#5a5650', 0.8), 0, 1.3, 0.04, 0, { sx: 1, sy: 0.9, sz: 1.2 });
  for (const sx of [-1, 1]) k.add(cyl(0.01, 0.05, 0.22, 6), iron, sx * 0.12, 1.5, 0, 0, { rz: -sx * 0.4 });
  for (const sx of [-1, 1]) k.add(sphere(0.03, 6, 4), MAT.glow('#ff6a3a', '#ff3a1a', 1.4), sx * 0.07, 1.33, 0.22);
}
function starChest(k) {
  k.add(rbox(0.9, 0.5, 0.6, 0.03), MAT.paint('#1e2830', 0.5), 0, 0.25, 0);
  k.add(rbox(0.94, 0.06, 0.64, 0.02), MAT.brass(), 0, 0.52, 0);
  const st = MAT.map(starPlaque('#1e2830'), 0.5, { transparent: true });
  for (const x of [-0.25, 0.05, 0.3]) k.add(plane(0.22, 0.22), st, x, 0.27, 0.305);
  return { hw: 0.47, hd: 0.32, top: 0.56 };
}
function candleStand(k, iron) {
  k.add(cyl(0.18, 0.2, 0.04, 10), iron, 0, 0.02, 0);
  for (let i = 0; i < 6; i++) k.add(rbox(0.03, 0.2, 0.03, 0.005), iron, 0, 0.12 + i * 0.2, 0, i * 0.5);
  k.add(cyl(0.11, 0.06, 0.06, 10), iron, 0, 1.3, 0);
  k.add(cyl(0.05, 0.05, 0.16, 8), MAT.flat('#f2e2c2', 0.6), 0, 1.41, 0);
  k.add(lathe([[0.001, 0], [0.018, 0.015], [0.001, 0.06]], 6), MAT.glow('#fff0b0', '#ffb030', 3), 0, 1.5, 0);
  return { r: 0.2, top: 1.4 };
}

export function buildWizards(scene, physics, desert, world) {
  buildWizardTent(scene, physics, world);
  return { wtent: buildTentRoom(scene, physics), school: buildSchoolRoom(scene, physics) };
}
// LAZY-REGIONS (src/game/regions.js): the tent stands on Citadel (built with it), the school's face on Desert Island
// (built with the desert: desertold.js), the two rooms each the first time they are needed
export function buildWizardTent(scene, physics, world) {
  const tent = buildTentOutside(scene, physics);
  world?.updaters.push((dt, t) => tent.spin(t));   // (the finial turns, the pennant flaps)
  WIZ.tent.door = tent.door;
}
export const WIZARD_ROOMS = { wtent: buildTentRoom, school: buildSchoolRoom };

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
