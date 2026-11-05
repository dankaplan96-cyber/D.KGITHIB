// SHOPS-ITEMS: the look of every carried or sold item, as a small 3D model, and the one place they are drawn for the
// interface (the inventory's slots, the shop's goods, the found-object box: found.js).
//
// Models: the game's own where it has one (the bonuses: actors.js pickupModel; the arsenal: weapons.js, gadgets.js,
// jetpack.js), otherwise a small one built here in the same procedural style (lathes, bevelled boxes, flat colours,
// painted paper). Nothing is copied from the original games.
//
// Drawing: one small offscreen WebGL canvas, made the first time an item is shown (never during play). A slot's picture
// is rendered once per look and kept as an image; a turning item (the one selected, the found object) is rendered into
// its 2D canvas only while a screen that pauses the world is open, at most 30 times a second (ItemStage.tick).
// Numbers measured from the original (LBA2 INVENT.CPP, DrawObjInventory / DoFoundObj): the object is seen from 21°
// above (camera alpha 60 x MUL_ANGLE 4 = 240 of 4096); the selected inventory object turns one unit a millisecond (a
// turn in 4.1 s), the found object two (a turn in 2.05 s).
import * as THREE from 'three';
import { pickupModel, buildSword } from './actors.js';
import { blowgunModel, pistolModel, gloveModel, pulseModel } from './weapons.js';
import { penguinModel, lanternModel } from './gadgets.js';
import { jetpackModel } from './jetpack.js';
import { pocketSetModel, lanceModel, forkModel, lineModel, flaskModel } from './tools.js';
import { paintIcon } from './inventory.js';

export const TURN = { inventory: (Math.PI * 2) / 4.096, found: (Math.PI * 2) / 2.048 };   // rad/s
const PITCH = (240 / 4096) * Math.PI * 2;   // 21.1°
const SIZE = 320;   // the offscreen canvas (px): the largest picture drawn (the found box at 27 % of a 1080p screen is ~290 px)

// ------------------------------------------------------------------ materials and parts
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
const brass = () => M('#e0b25a', { metalness: 0.7, roughness: 0.33 });
function put(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// a sheet of paper (or card) with a painted face: the inventory's own painting, 128 px (inventory.js paintIcon)
function paper(kind, w = 0.3, h = 0.36, bend = 0.04, back = '#e8dcc0') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = back; x.fillRect(0, 0, 128, 128); x.scale(128 / 72, 128 / 72); x.lineJoin = x.lineCap = 'round';
  paintIcon(kind, x);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(w, h, 6, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2); p.setZ(i, -bend * u * u); }   // (curled a little at the sides)
  geo.computeVertexNormals();
  const g = new THREE.Group();
  put(g, geo, M('#ffffff', { map: tex, roughness: 0.9, side: THREE.DoubleSide }));
  return g;
}
function crystal(g, mat, x, y, z, s, rx = 0, rz = 0) { const m = put(g, new THREE.OctahedronGeometry(s, 0), mat, x, y, z, rx, 0, rz); m.scale.y = 1.7; return m; }
function cogGeo(r = 0.12, teeth = 10, th = 0.04) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i++) { const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.8 : r; s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.28, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 8 });
  geo.translate(0, 0, -th / 2);
  return geo;
}

// ------------------------------------------------------------------ the looks
// look id → () => Object3D. `tilt` lays a long thing across the view so it is seen turning, not spun on its own axis.
const LOOKS = {
  // the magic ball (actors.js MagicBall: the same gold, its glow kept lower so it reads as a ball, not a lamp)
  ball: () => { const g = new THREE.Group(); put(g, new THREE.SphereGeometry(0.12, 24, 18), M('#ffe68a', { emissive: '#ffb000', emissiveIntensity: 0.55, roughness: 0.25 })); return g; },
  // the holomap: a glass globe of the island on a brass foot
  holomap: () => {
    const g = new THREE.Group();
    put(g, lathe([[0, 0], [0.11, 0], [0.12, 0.02], [0.07, 0.04], [0.04, 0.07], [0, 0.08]]), brass(), 0, -0.16);
    put(g, new THREE.SphereGeometry(0.12, 24, 16), M('#9fe2ff', { emissive: '#2a78c8', emissiveIntensity: 0.6, transparent: true, opacity: 0.72, roughness: 0.1 }), 0, 0.02);
    const land = M('#7fd06a', { emissive: '#2f7a2a', emissiveIntensity: 0.4 });
    put(g, new THREE.SphereGeometry(0.045, 10, 6), land, -0.03, 0.03, 0.075).scale.set(1.4, 0.45, 0.9);
    put(g, new THREE.SphereGeometry(0.03, 10, 6), land, 0.06, -0.02, 0.06).scale.set(1.2, 0.45, 0.9);
    for (const y of [-0.05, 0.02, 0.09]) put(g, new THREE.TorusGeometry(Math.sqrt(0.0145 - y * y), 0.0025, 4, 32), M('#ffffff', { emissive: '#bff4ff', emissiveIntensity: 0.8 }), 0, y + 0.02, 0, Math.PI / 2);
    return g;
  },
  // Sendell's medallion (as he wears it, tools/blender/twinsen_poly.py: a pale gold medal of eight sides on a gold cord, HERO-LOOK I-23)
  medallion: () => {
    const g = new THREE.Group(), gold = M('#f0d27a', { metalness: 0.75, roughness: 0.3 });
    put(g, new THREE.CylinderGeometry(0.1, 0.1, 0.022, 8), gold, 0, 0, 0, Math.PI / 2, Math.PI / 8, 0);
    put(g, new THREE.TorusGeometry(0.055, 0.008, 6, 24), M('#c89a2a', { metalness: 0.8, roughness: 0.35 }), 0, 0, 0.012);
    put(g, new THREE.SphereGeometry(0.02, 10, 8), M('#8fe8ff', { emissive: '#2a9aff', emissiveIntensity: 0.6, roughness: 0.15 }), 0, 0, 0.014).scale.z = 0.5;
    put(g, new THREE.TorusGeometry(0.045, 0.006, 5, 20), M('#e8b04c', { metalness: 0.6, roughness: 0.45 }), 0, 0.135, 0);   // (the loop of its gold cord)
    return g;
  },
  // a key: a brass bow, a shaft, two teeth
  key: () => {
    const g = new THREE.Group(), b = brass();
    put(g, new THREE.TorusGeometry(0.05, 0.014, 8, 20), b, 0, 0.12);
    put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10), b, 0, -0.02);
    put(g, new THREE.BoxGeometry(0.05, 0.02, 0.014), b, 0.028, -0.09);
    put(g, new THREE.BoxGeometry(0.036, 0.02, 0.014), b, 0.022, -0.05);
    return g;
  },
  // a rope ladder, rolled up: the coil, its two cords and the wooden rungs
  rope: () => {
    const g = new THREE.Group(), rope = M('#b08850', { roughness: 0.95 }), wood = M('#8a5a30', { roughness: 0.8 });
    for (let i = 0; i < 4; i++) put(g, new THREE.TorusGeometry(0.11 - i * 0.004, 0.016, 6, 24), rope, 0, -0.06 + i * 0.03, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), wood, 0, 0.05 + i * 0.035, 0, 0, i * 0.7, Math.PI / 2);
    return g;
  },
  // Doran's unloading permit: a card with the harbour's stamp on it
  permit: () => paper('stamp', 0.3, 0.3, 0.02, '#f2e8cc'),
  pipemap: () => paper('map', 0.36, 0.36, 0.05, '#e8d8b0'),
  leaflet: () => paper('leaflet', 0.28, 0.36, 0.03, '#f4f0e0'),
  plan: () => paper('plan', 0.36, 0.3, 0.04, '#2a5a9a'),
  // the kettle crystals: three warm-white crystals on a flake of scale
  kettle: () => {
    const g = new THREE.Group(), glow = M('#e8fbff', { emissive: '#56d8ff', emissiveIntensity: 0.55, roughness: 0.25, flatShading: true });
    put(g, new THREE.CylinderGeometry(0.11, 0.12, 0.03, 9), M('#c8c0b0', { roughness: 0.95, flatShading: true }), 0, -0.07);
    crystal(g, glow, 0, 0.02, 0, 0.06, 0.1, 0.1); crystal(g, glow, 0.06, -0.01, 0.03, 0.04, 0.3, -0.4); crystal(g, glow, -0.055, -0.02, -0.02, 0.035, -0.2, 0.45);
    return g;
  },
  // a warm stone from the bay (prologue.js: a pale crystal glowing cyan)
  warmstone: () => { const g = new THREE.Group(); crystal(g, M('#d8fbff', { emissive: '#56d8ff', emissiveIntensity: 0.8, roughness: 0.25, flatShading: true }), 0, 0, 0, 0.1, 0.1, 0.15); return g; },
  // Twinsen's pliers (from Arthur's boat box)
  pliers: () => {
    const g = new THREE.Group(), steel = M('#9aa4ae', { metalness: 0.75, roughness: 0.35 }), grip = M('#c03a2a', { roughness: 0.6 });
    for (const s of [-1, 1]) {
      put(g, new THREE.BoxGeometry(0.022, 0.12, 0.016), steel, s * 0.011, 0.1, 0, 0, 0, -s * 0.06);
      put(g, new THREE.CylinderGeometry(0.016, 0.013, 0.2, 8), grip, s * 0.04, -0.06, 0, 0, 0, -s * 0.22);
    }
    put(g, new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), steel, 0, 0.04, 0, Math.PI / 2);
    return g;
  },
  // the heat coupler (townlife.js: a brass drum with fins)
  coupler: () => {
    const g = new THREE.Group(), b = brass();
    put(g, new THREE.CylinderGeometry(0.09, 0.09, 0.18, 20), b);
    for (let i = 0; i < 5; i++) put(g, new THREE.CylinderGeometry(0.12, 0.12, 0.012, 20), M('#c8743a', { metalness: 0.6, roughness: 0.35 }), 0, -0.07 + i * 0.035);
    for (const s of [-1, 1]) put(g, new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), M('#3a3632', { metalness: 0.4, roughness: 0.5 }), 0, s * 0.11);
    return g;
  },
  cog: () => { const g = new THREE.Group(); put(g, cogGeo(), M('#c8a050', { metalness: 0.7, roughness: 0.35 })); return g; },
  // cloth: a folded length of striped cloth
  cloth: () => {
    const g = new THREE.Group(), c = ['#c8452f', '#f2e2c0', '#2f7a9a', '#f2e2c0'];
    for (let i = 0; i < 4; i++) put(g, new THREE.BoxGeometry(0.3, 0.035, 0.2), M(c[i], { roughness: 0.95 }), 0, -0.06 + i * 0.036, 0, 0, i * 0.06, 0);
    return g;
  },
  // bonuses and the shop's goods (actors.js PICK; the heart potion is Pippa's own bottle)
  coin: () => pickupModel('coin'),
  clover: () => pickupModel('clover'),
  crystal: () => pickupModel('crystal'),
  flask: () => pickupModel('flask'),
  potion: () => {
    const g = new THREE.Group();
    put(g, lathe([[0, 0], [0.08, 0.005], [0.1, 0.05], [0.095, 0.12], [0.05, 0.16], [0.03, 0.19], [0.03, 0.22]], 18), M('#ff6a78', { emissive: '#c0102a', emissiveIntensity: 0.55, transparent: true, opacity: 0.88, roughness: 0.15 }), 0, -0.11);
    put(g, new THREE.CylinderGeometry(0.034, 0.03, 0.05, 10), M('#a8703a', { roughness: 0.9 }), 0, 0.13);
    return g;
  },
  pearl: () => { const g = new THREE.Group(); put(g, new THREE.SphereGeometry(0.09, 20, 14), M('#fff4e0', { emissive: '#ff9a3a', emissiveIntensity: 0.7, roughness: 0.2 })); return g; },
  // the arsenal (its own models)
  blowgun: () => blowgunModel(false),
  blowtron: () => blowgunModel(true),
  laser: () => pistolModel(),
  glove: () => gloveModel(),
  penguin: () => penguinModel(),
  lantern: () => lanternModel(),
  jetpack: () => jetpackModel(),
  pocketset: () => pocketSetModel(),   // (EQUIP-2a: tools.js)
  lance: () => lanceModel(),
  fork: () => forkModel(), line: () => lineModel(), heatflask: () => flaskModel(),   // (EQUIP-2b: tools.js)
  darts: () => {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      put(g, new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), M('#d8c8a0'), i * 0.03, 0, 0, 0, 0, i * 0.12);
      put(g, new THREE.ConeGeometry(0.02, 0.05, 6), M('#c83a2a', { roughness: 0.7 }), i * 0.03 + i * 0.016, -0.13, 0, 0, 0, i * 0.12);
    }
    return g;
  },
  cell: () => {
    const g = new THREE.Group();
    put(g, new THREE.OctahedronGeometry(0.08, 0), M('#bff4ff', { emissive: '#2a9aff', emissiveIntensity: 0.9, roughness: 0.15, flatShading: true })).scale.y = 1.4;
    for (const s of [-1, 1]) put(g, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), brass(), 0, s * 0.12);
    return g;
  },
  conch: () => {
    const g = new THREE.Group(), shell = M('#f6dccb', { roughness: 0.45 });
    put(g, new THREE.ConeGeometry(0.08, 0.26, 14), shell, 0, 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) put(g, new THREE.TorusGeometry(0.075 - i * 0.02, 0.018, 6, 16), M('#e0907a', { roughness: 0.5 }), 0.1 - i * 0.05, 0, 0, 0, Math.PI / 2);
    return g;
  },
  protect: () => { const g = new THREE.Group(); put(g, new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#cfefff', { emissive: '#2a78c8', emissiveIntensity: 0.5, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 0, -0.04); return g; },
  lightning: () => {
    const s = new THREE.Shape(); [[0.03, 0.16], [-0.07, -0.01], [0, -0.01], [-0.04, -0.16], [0.08, 0.04], [0.01, 0.04]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const g = new THREE.Group(); put(g, new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), M('#fff6a0', { emissive: '#ffd23a', emissiveIntensity: 0.8 }), 0, 0, -0.015); return g;
  },
  // story things of later chapters (a look each, in the same style)
  sword: () => buildSword(),
  pulse: () => pulseModel(false),   // (the one in his hand: weapons.js)
  jar: () => {
    const g = new THREE.Group();
    put(g, lathe([[0, 0], [0.08, 0], [0.09, 0.03], [0.09, 0.16], [0.065, 0.19], [0.065, 0.21]], 18), M('#d8f0ff', { transparent: true, opacity: 0.5, roughness: 0.1, side: THREE.DoubleSide }), 0, -0.1);
    put(g, new THREE.CylinderGeometry(0.07, 0.07, 0.025, 16), M('#8a5a30', { roughness: 0.8 }), 0, 0.12);
    return g;
  },
  shovel: () => {
    const g = new THREE.Group();
    put(g, new THREE.CylinderGeometry(0.014, 0.016, 0.5, 8), M('#a8783a', { roughness: 0.8 }), 0, 0.08);
    put(g, new THREE.BoxGeometry(0.1, 0.02, 0.025), M('#a8783a', { roughness: 0.8 }), 0, 0.34);
    put(g, new THREE.BoxGeometry(0.14, 0.17, 0.012), M('#8a929a', { metalness: 0.7, roughness: 0.4 }), 0, -0.24);
    return g;
  },
  fuse: () => {
    const g = new THREE.Group(), b = brass();
    put(g, new THREE.CylinderGeometry(0.04, 0.04, 0.2, 14), M('#e8f8ff', { transparent: true, opacity: 0.55, roughness: 0.1 }));
    put(g, new THREE.CylinderGeometry(0.004, 0.004, 0.2, 5), M('#ffd090', { emissive: '#ff8a3a', emissiveIntensity: 0.6 }));
    for (const y of [-0.11, 0.11]) put(g, new THREE.CylinderGeometry(0.046, 0.046, 0.04, 14), b, 0, y);
    return g;
  },
  cyl: () => {
    const g = new THREE.Group();
    put(g, new THREE.CylinderGeometry(0.06, 0.06, 0.22, 16), M('#c8a050', { metalness: 0.7, roughness: 0.35 }));
    for (let i = 0; i < 4; i++) put(g, new THREE.CylinderGeometry(0.065, 0.065, 0.025, 8), M(i % 2 ? '#2f7a9a' : '#3a3632', { metalness: 0.5, roughness: 0.4 }), 0, -0.07 + i * 0.045, 0, 0, i * 0.4, 0);
    return g;
  },
  notebook: () => {
    const g = new THREE.Group();
    put(g, new THREE.BoxGeometry(0.22, 0.28, 0.03), M('#7a4a2a', { roughness: 0.8 }));
    put(g, new THREE.BoxGeometry(0.2, 0.27, 0.024), M('#f2ead6', { roughness: 0.9 }), 0.012, 0, 0);
    put(g, new THREE.BoxGeometry(0.03, 0.28, 0.032), M('#5a3420', { roughness: 0.8 }), -0.11, 0, 0);
    put(g, new THREE.BoxGeometry(0.12, 0.05, 0.004), M('#e8d8b0', { roughness: 0.9 }), 0.02, 0.06, 0.017);   // (its label)
    return g;
  },
  // SHOPS-1: the town's goods (story/shops.js)
  honey: () => {
    const g = new THREE.Group();
    put(g, lathe([[0, 0], [0.075, 0.004], [0.095, 0.05], [0.09, 0.13], [0.06, 0.16], [0.06, 0.18]], 18), M('#e8a030', { emissive: '#7a4008', emissiveIntensity: 0.25, roughness: 0.2 }), 0, -0.1);
    put(g, new THREE.CylinderGeometry(0.096, 0.096, 0.025, 18), M('#2f8a9a', { roughness: 0.3 }), 0, -0.02);   // (the glaze's teal band)
    put(g, new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), M('#f2e8cc', { roughness: 0.9 }), 0, 0.095);       // (the cloth cap)
    put(g, new THREE.TorusGeometry(0.066, 0.006, 5, 16), M('#8a5a30'), 0, 0.085, 0, Math.PI / 2);
    return g;
  },
  tea: () => {
    const g = new THREE.Group(), glaze = M('#2f8a9a', { roughness: 0.18, metalness: 0.1 });
    put(g, lathe([[0, 0], [0.06, 0.004], [0.1, 0.07], [0.085, 0.14], [0.045, 0.17], [0.05, 0.19]], 18), glaze, 0, -0.1);
    put(g, new THREE.CylinderGeometry(0.103, 0.103, 0.02, 18), M('#e8b84a', { metalness: 0.6, roughness: 0.35 }), 0, -0.03);
    put(g, new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#f4eee0', { roughness: 0.4 }), 0, 0.09);
    put(g, new THREE.SphereGeometry(0.015, 8, 6), M('#e8b84a', { metalness: 0.6, roughness: 0.35 }), 0, 0.145);
    return g;
  },
  ticket: () => paper('ticket', 0.36, 0.2, 0.02, '#f2e8cc'),
  parcel: () => {
    const g = new THREE.Group(), band = brass();
    put(g, new THREE.BoxGeometry(0.26, 0.17, 0.2), M('#2f7a84', { roughness: 0.6 }));
    for (const x of [-0.08, 0.08]) put(g, new THREE.BoxGeometry(0.02, 0.175, 0.205), band, x, 0, 0);
    put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.004, 14), M('#c03030', { roughness: 0.7 }), 0, 0.087, 0.04);   // (Odile's two stamps)
    put(g, new THREE.CylinderGeometry(0.03, 0.03, 0.004, 14), M('#3a5ab0', { roughness: 0.7 }), 0.02, 0.087, -0.05);
    return g;
  },
  radio: () => {
    const g = new THREE.Group();
    put(g, new THREE.BoxGeometry(0.26, 0.17, 0.1), M('#8a3a2a', { roughness: 0.6 }));
    put(g, new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16), M('#e8d8b0'), -0.05, 0, 0.052, Math.PI / 2);
    for (const y of [0.03, -0.03]) put(g, new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10), brass(), 0.08, y, 0.055, Math.PI / 2);
    put(g, new THREE.CylinderGeometry(0.004, 0.004, 0.2, 5), M('#cccccc', { metalness: 0.8 }), 0.1, 0.17, 0, 0, 0, -0.35);
    return g;
  },
};
const TILT = { lance: 1.0, pocketset: -0.2, fork: 0.5, line: 0.7, heatflask: 0.3, ticket: -0.2, sword: 0.9, shovel: 0.8, pulse: 0.7, blowgun: 1.0, blowtron: 1.0, laser: 1.2, darts: 0.6, permit: -0.25, pipemap: -0.25, leaflet: -0.2, plan: -0.25, key: 0.5, pliers: 0.4 };
// an item's look: its own when it has one, otherwise its painted icon's (inventory.js icon kinds)
const BY_ID = { lidkey: 'key', okey: 'key', valvekey: 'key', stamp: 'permit', evacplan: 'plan', plans: 'plan', petition: 'permit', notebook: 'leaflet',
  kashes: 'coin', clovers: 'clover', crystals: 'crystal', kscreen: 'cloth', relay: 'cog', survey: 'pipemap', pcell: 'crystal' };
const BY_ICON = { map: 'pipemap', stamp: 'permit', part: 'cog', crystal: 'crystal' };
export function lookOf(id, icon) { return LOOKS[id] ? id : BY_ID[id] || BY_ICON[icon] || (LOOKS[icon] ? icon : 'cog'); }
export const hasLook = (k) => !!LOOKS[k];

// ------------------------------------------------------------------ the stage
class ItemStage {
  constructor() { this.models = new Map(); this.thumbs = new Map(); this.r = null; this.failed = false; this.spins = []; this.acc = 1; }
  get live() { return !!this.r; }
  // the offscreen renderer, its little scene and lights (once, on first use)
  init() {
    if (this.r || this.failed) return !!this.r;
    try {
      const r = (this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }));
      r.setPixelRatio(1); r.setSize(SIZE, SIZE, false);
      r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping; r.setClearColor(0x000000, 0);
    } catch { this.r = null; this.failed = true; return false; }
    const s = (this.scene = new THREE.Scene());
    s.add(new THREE.HemisphereLight('#e8f0ff', '#5a4a3a', 1.5));
    const key = new THREE.DirectionalLight('#fff1dc', 2.6); key.position.set(-1.2, 2, 2); s.add(key);
    const rim = new THREE.DirectionalLight('#a8d4ff', 1.3); rim.position.set(1.5, 1, -2); s.add(rim);
    this.cam = new THREE.PerspectiveCamera(26, 1, 0.01, 20);
    this.pivot = new THREE.Group(); s.add(this.pivot);
    return true;
  }
  // a look's model, centred on the turning axis and scaled to a unit sphere
  model(look) {
    if (this.models.has(look)) return this.models.get(look);
    const inner = (LOOKS[look] || LOOKS.cog)();
    inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    const holder = new THREE.Group(); holder.rotation.z = TILT[look] || 0; holder.add(inner);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder), c = box.getCenter(new THREE.Vector3());
    const r = Math.max(1e-3, box.getSize(new THREE.Vector3()).length() / 2);
    holder.position.set(-c.x / r, -c.y / r, -c.z / r); holder.scale.setScalar(1 / r);
    const m = new THREE.Group(); m.add(holder);
    this.models.set(look, m);
    return m;
  }
  // draws a look at an angle into a 2D canvas (its own size)
  draw(look, angle, canvas) {
    if (!this.init() || !canvas) return false;
    const m = this.model(look);
    if (this.pivot.children[0] !== m) { this.pivot.clear(); this.pivot.add(m); }
    m.rotation.y = angle;
    const d = 1.04 / Math.sin(THREE.MathUtils.degToRad(this.cam.fov / 2));
    this.cam.position.set(0, Math.sin(PITCH) * d, Math.cos(PITCH) * d); this.cam.lookAt(0, 0, 0);
    this.r.render(this.scene, this.cam);
    const x = canvas.getContext('2d');
    x.clearRect(0, 0, canvas.width, canvas.height);
    x.drawImage(this.r.domElement, 0, 0, canvas.width, canvas.height);
    return true;
  }
  // a still picture of a look (a three-quarter view), as an image URL; null when WebGL is unavailable
  thumb(look, px = 128) {
    const k = look + '@' + px;
    if (this.thumbs.has(k)) return this.thumbs.get(k);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const url = this.draw(look, -0.6, c) ? c.toDataURL() : null;
    this.thumbs.set(k, url);
    return url;
  }
  // the turning pictures on screen now: [{ canvas, look, rate }] (set by the open screen; null when it closes). Each look
  // keeps its angle between screens (LBA2 keeps each object's own angle, BetaObj); the same look in two canvases (the
  // selected slot and the large view) is rendered once and copied.
  spin(list) { this.spins = list || []; this.acc = 1; this.tick(0); }
  // called by the game only in the screens that pause the world (inventory, shop, found object)
  tick(dt) {
    if (!this.spins.length) return;
    const A = (this.angles ||= {}), moved = new Set();
    for (const s of this.spins) if (!moved.has(s.look)) { moved.add(s.look); A[s.look] = (A[s.look] ?? -0.6) + (s.rate ?? TURN.inventory) * dt; }
    this.acc += dt;
    if (this.acc < 1 / 30) return;
    this.acc = 0;
    const done = new Map();
    for (const s of this.spins) {
      if (!s.canvas?.isConnected) continue;
      const src = done.get(s.look);
      if (src) { const x = s.canvas.getContext('2d'); x.clearRect(0, 0, s.canvas.width, s.canvas.height); x.drawImage(src, 0, 0, s.canvas.width, s.canvas.height); continue; }
      if (this.draw(s.look, A[s.look], s.canvas)) done.set(s.look, s.canvas);
    }
  }
}
export const stage = new ItemStage();
