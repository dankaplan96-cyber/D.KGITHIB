// Travel between the regions (CONNECT). Two planets, kept apart:
//   Twinsun  — Citadel, Desert Island, the Hamalayi: the ferry (Citadel's harbour ⇄ Desert Island's pier) and the
//              glider (the fields on Citadel's plateau, by Desert Island's beach and in the Hamalayi foothills).
//   Zeelich  — the terminal island (Zeelich's spaceport) and its islands (src/game/zislands.js): Esmer shuttles
//              between them only.
//   Between the planets only the spaceship: Citadel Spaceport ⇄ Zeelich Spaceport. No Twinsun stop on Zeelich, no
//              Zeelich island in Citadel's menu.
// Every travel point is a place: a dressed dock, pad or field with a board naming where it goes. A route opens with
// its chapter (the story's own crossings stay as they are) and everything is open after the main story.
//
// CONTRACT
//   buildTravel(game) → game.travel = { points, routes }   (props and colliders added to the regions)
//   travelPointAt(game, consider, dist)                    interactables (story/islands.js)
//   destinations(game, point) → [{ point, mode }] open from a point; travelTo(game, point)
//   regionOf(game) → 'citadel' | 'desert' | 'hamalayi' | 'zeelich' | 'isle_<name>' (indoors: the region outside)
//   planetOf(region) → 'twinsun' | 'zeelich';  PLANETS {twinsun: [...], zeelich: [...]}
import * as THREE from 'three';
import { esmerShuttle } from './shuttle.js';
import { buildGlider } from './valveroom.js';
import { ISLES, BOARD_NAME } from './zislands.js';
import { ORDER } from './story/index.js';
import { ctex, cached, bbox, cyl, lathe, pm, tm, brassM, Batch } from './kit.js';
import { t } from './i18n.js';
import './text/islands.js';

export const PLANETS = { twinsun: ['citadel', 'desert', 'hamalayi'], zeelich: ['zeelich', ...ISLES.map((n) => 'isle_' + n)] };
export const planetOf = (region) => (PLANETS.zeelich.includes(region) ? 'zeelich' : 'twinsun');
// interiors and the regions they open from (the rest of the interiors are on Citadel)
const INSIDE = { workshop: 'zeelich', upper: 'zeelich', council: 'zeelich', archive: 'zeelich', condA: 'desert', condB: 'desert', butemple: 'desert', bumaze: 'desert', buhalls: 'desert', school: 'desert', obsv: 'hamalayi' };
let lastOut = 'citadel', lastPos = null;
export function regionOf(game) {
  const R = game.room;
  if (!R) { lastOut = 'citadel'; lastPos = { x: game.hero.pos.x, z: game.hero.pos.z }; return 'citadel'; }
  if (R.outdoor) { lastOut = R.id; lastPos = { x: game.hero.pos.x, z: game.hero.pos.z }; return R.id; }
  if (R.id.startsWith('c3')) return lastOut;   // (under the shell: the map shows where he went down)
  return INSIDE[R.id] || (R.id in INSIDE ? lastOut : 'citadel');
}
export const lastOutdoorPos = () => lastPos;

// ================================================================== the travel points
// (world coordinates; Zeelich's spaceport is ours: a deck over the clouds off the terminal island's south shore)
const ZPORT = { x0: -14, x1: 6, z0: 33, z1: 51, bridge: { x: -4, z0: 26.0, z1: 33, hw: 1.8 }, pad: { x: -4, z: 44 } };
const CIT = { ferry: { x: -115.5, z: 43, board: [-112.2, 40.6, -Math.PI / 2], land: { x: -113.6, z: 44.2, a: -Math.PI / 2 } },
  glider: { x: -107, z: -64, plane: [-111.5, -62.5, 0.2], board: [-102.6, -61.4, -2.2], sock: [-103.5, -67.5], land: { x: -105.2, z: -64.6, a: -Math.PI / 2 } } };
const DES = { ferry: { x: 3320.5, z: 4, board: [3323.4, 8.2, Math.PI], land: null }, glider: { x: 3340, z: -35, plane: [3342, -40, 0.3], board: [3334.4, -30.6, Math.PI * 0.8], sock: [3346.5, -31], land: { x: 3337.4, z: -33.2, a: Math.PI * 0.75 } } };

function boardMesh(parent, x, y, z, ry, { title, lines, frame = '#2f6a9a', bg = '#1e3550', ink = '#e8c040' }) {
  const key = 'tboard|' + title + '|' + lines.join('|');
  const tex = ctex(key, 512, 352, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = ink; c.lineWidth = 8; c.strokeRect(6, 6, W - 12, H - 12);
    c.fillStyle = ink; c.font = 'bold 38px sans-serif'; c.textAlign = 'center'; c.fillText(title, W / 2, 56);
    c.fillStyle = 'rgba(232,192,64,0.5)'; c.fillRect(30, 76, W - 60, 3);
    c.font = 'bold 30px monospace'; c.textAlign = 'left';
    lines.forEach((l, i) => { c.fillStyle = i % 2 ? '#bfe9ff' : '#f4efe2'; c.fillText(l, 34, 124 + i * 46); });
  }, false);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const add = (geo, m, px, py, pz, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  const post = pm(frame, 0.5);
  for (const s of [-1, 1]) add(cached('tbpost', () => bbox(0.12, 2.8, 0.12, 0.02)), post, s * 0.95, 1.4, -0.03);
  add(cached('tbframe', () => bbox(2.05, 1.45, 0.08, 0.02)), pm('#5a3a22', 0.7), 0, 1.75, -0.05);
  add(cached('tbface', () => new THREE.PlaneGeometry(1.9, 1.3)), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12, roughness: 0.75 }), 0, 1.75, 0.0);
  add(cached('tbroof', () => bbox(2.4, 0.07, 0.55, 0.02)), pm('#c8643a', 0.8), 0, 2.62, 0.02, 0.22);
  return g;
}
function windsock(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const mk = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o; };
  mk(cached('tsockpole', () => cyl(0.06, 0.08, 4.2, 8)), pm('#e8e0d0', 0.5), 0, 2.1, 0);
  const sock = new THREE.Group(); sock.position.set(0, 4.05, 0); g.add(sock);
  const cone = new THREE.Mesh(cached('tsock', () => lathe([[0.32, 0], [0.24, 0.6], [0.17, 1.2], [0.12, 1.7]], 10).rotateZ(-Math.PI / 2)), new THREE.MeshStandardMaterial({ color: '#e8602a', roughness: 0.8, side: THREE.DoubleSide }));
  sock.add(cone);
  return (dt, tm2) => { sock.rotation.y = 0.6 + Math.sin(tm2 * 0.3) * 0.35; cone.rotation.z = -0.15 + Math.sin(tm2 * 1.7) * 0.06; };
}
// a ring of painted stones marking a landing field
function fieldRing(parent, x, y, z, r) {
  const B = new Batch(parent), m = pm('#f4efe2', 0.85);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; B.add(cached('tring', () => bbox(0.5, 0.18, 0.32, 0.06)), m, x + Math.sin(a) * r, y + 0.06, z + Math.cos(a) * r, 0, a); }
  B.build();
}

export function buildTravel(game) {
  const G = game, W = G.world, P = G.physics, R = G.rooms, points = {}, routes = [];
  const updaters = W.updaters;
  const gy = (x, z) => P.groundAt(x, z, 60);
  const local = (room, x, z) => ({ x: x - room.group.position.x, z: z - room.group.position.z });
  const pt = (id, o) => (points[id] = { id, ...o });

  // ---- Twinsun: Citadel's harbour (the ferry), its glider field on the plateau, the spaceport
  if (W.spaceport) pt('citadel_port', { region: 'citadel', mode: 'ship', x: W.spaceport.pad.x, z: W.spaceport.pad.z, r: 5.0, landing: W.spaceport.landing, name: 'tr_citadel_port' });
  {
    const f = CIT.ferry; pt('citadel_ferry', { region: 'citadel', mode: 'ferry', x: f.x, z: f.z, r: 3.2, landing: f.land, name: 'tr_citadel_harbour' });
    boardMesh(W.root, f.board[0], gy(f.board[0], f.board[1]), f.board[1], f.board[2], { title: 'FERRY', lines: ['DESERT ISLAND', 'FROM THIS QUAY'] });
    P.add({ type: 'box', x: f.board[0], z: f.board[1], hw: 0.15, hd: 1.1, top: gy(f.board[0], f.board[1]) + 2.7, noStand: true });
    const g = CIT.glider; pt('citadel_glider', { region: 'citadel', mode: 'glider', x: g.x, z: g.z, r: 4.0, landing: g.land, name: 'tr_citadel_field' });
    const pl = buildGlider(); pl.position.set(g.plane[0], gy(g.plane[0], g.plane[1]), g.plane[1]); pl.rotation.y = g.plane[2]; W.root.add(pl);
    P.add({ type: 'box', x: g.plane[0], z: g.plane[1], hw: 0.9, hd: 2.9, rot: g.plane[2], top: gy(g.plane[0], g.plane[1]) + 1.7, noStand: true });
    boardMesh(W.root, g.board[0], gy(g.board[0], g.board[1]), g.board[1], g.board[2], { title: 'GLIDER FIELD', lines: ['DESERT ISLAND', 'THE HAMALAYI'] });
    P.add({ type: 'box', x: g.board[0], z: g.board[1], hw: 1.1, hd: 0.15, rot: g.board[2], top: gy(g.board[0], g.board[1]) + 2.7, noStand: true });
    updaters.push(windsock(W.root, g.sock[0], gy(g.sock[0], g.sock[1]), g.sock[1]));
    P.add({ type: 'cyl', x: g.sock[0], z: g.sock[1], r: 0.15, top: gy(g.sock[0], g.sock[1]) + 4, noStand: true });
    fieldRing(W.root, g.x, gy(g.x, g.z), g.z, 5.2);
  }
  // ---- Desert Island: the ferry stop at the pier's foot, the glider field on the beach south of it
  const D = R.desert;
  if (D) {
    const f = DES.ferry, put = (obj, x, z, ry = 0) => { const l = local(D, x, z); obj.position.set(l.x, gy(x, z) - D.group.position.y, l.z); obj.rotation.y = ry; D.group.add(obj); return obj; };
    pt('desert_ferry', { region: 'desert', mode: 'ferry', x: f.x, z: f.z, r: 3.4, landing: D.dock, name: 'tr_desert_pier' });
    put(boardMesh(new THREE.Group(), 0, 0, 0, 0, { title: 'FERRY', lines: ['CITADEL HARBOUR', 'FROM THE PIER'], frame: '#a86a3a' }).parent, f.board[0], f.board[1], f.board[2]);
    P.add({ type: 'box', x: f.board[0], z: f.board[1], hw: 1.1, hd: 0.15, top: gy(f.board[0], f.board[1]) + 2.7, noStand: true });
    const g = DES.glider; pt('desert_glider', { region: 'desert', mode: 'glider', x: g.x, z: g.z, r: 4.0, landing: g.land, name: 'tr_desert_field' });
    put(buildGlider(), g.plane[0], g.plane[1], g.plane[2]);
    P.add({ type: 'box', x: g.plane[0], z: g.plane[1], hw: 0.9, hd: 2.9, rot: g.plane[2], top: gy(g.plane[0], g.plane[1]) + 1.7, noStand: true });
    put(boardMesh(new THREE.Group(), 0, 0, 0, 0, { title: 'GLIDER FIELD', lines: ['CITADEL', 'THE HAMALAYI'], frame: '#a86a3a' }).parent, g.board[0], g.board[1], g.board[2]);
    P.add({ type: 'box', x: g.board[0], z: g.board[1], hw: 1.1, hd: 0.15, rot: g.board[2], top: gy(g.board[0], g.board[1]) + 2.7, noStand: true });
    const sk = new THREE.Group(); put(sk, g.sock[0], g.sock[1]); D.updaters.push(windsock(sk, 0, 0, 0));
    P.add({ type: 'cyl', x: g.sock[0], z: g.sock[1], r: 0.15, top: gy(g.sock[0], g.sock[1]) + 4, noStand: true });
    const fr = new THREE.Group(); put(fr, g.x, g.z); fieldRing(fr, 0, 0, 0, 5.2);
  }
  // ---- the Hamalayi: the foothills' landing (its glider stands there already)
  const M = R.hamalayi;
  if (M) {
    const gl = M.glider, l = M.landing;
    pt('hamalayi_glider', { region: 'hamalayi', mode: 'glider', x: gl.x, z: gl.z, r: 4.5, landing: { x: l.x, z: l.z, a: l.a ?? Math.PI }, name: 'tr_hamalayi_field' });
    const bx = gl.x - 6.5, bz = gl.z - 3.5, b = boardMesh(new THREE.Group(), 0, 0, 0, 0, { title: 'GLIDER FIELD', lines: ['CITADEL', 'DESERT ISLAND'], frame: '#6a5a4a' }).parent;
    const lp = local(M, bx, bz); b.position.set(lp.x, gy(bx, bz), lp.z); b.rotation.y = Math.atan2(l.x - bx, l.z - bz); M.group.add(b);
    P.add({ type: 'box', x: bx, z: bz, hw: 1.1, hd: 0.15, rot: b.rotation.y, top: gy(bx, bz) + 2.7, noStand: true });
    const sx = gl.x + 4.5, sz = gl.z + 4.5, sk = new THREE.Group(), ls = local(M, sx, sz); sk.position.set(ls.x, gy(sx, sz), ls.z); M.group.add(sk); M.updaters.push(windsock(sk, 0, 0, 0));
    P.add({ type: 'cyl', x: sx, z: sz, r: 0.15, top: gy(sx, sz) + 4, noStand: true });
  }
  // ---- Zeelich: its spaceport (ours) and the shuttle pad by the dock; each island's pad (zislands.js)
  const Z = R.zeelich;
  if (Z) {
    const o = Z.group.position, Y = 6.0, B = new Batch(Z.group), deck = tm('deck', { color: '#e0d8e8', rough: 0.65, metal: 0.25 }), brass = brassM(), stone = tm('stone', { color: '#ecdce4' });
    const p = ZPORT, br = p.bridge;
    const wbox = (x0, x1, z0, z1, top, extra = {}) => P.add({ type: 'box', x: o.x + (x0 + x1) / 2, z: o.z + (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top, ...extra });
    // the deck on stilts into the clouds, the footbridge from the shore
    B.add(bbox(p.x1 - p.x0, 0.45, p.z1 - p.z0, 0.06, 2), deck, (p.x0 + p.x1) / 2, Y - 0.225, (p.z0 + p.z1) / 2);
    wbox(p.x0, p.x1, p.z0, p.z1, Y, { bottom: Y - 0.6 });
    B.add(bbox(br.hw * 2, 0.35, br.z1 - br.z0 + 0.4, 0.05, 2), deck, br.x, Y - 0.175, (br.z0 + br.z1) / 2);
    wbox(br.x - br.hw, br.x + br.hw, br.z0, br.z1 + 0.3, Y, { bottom: Y - 0.6 });
    for (let x = p.x0 + 1; x <= p.x1 - 1; x += 6) for (let z = p.z0 + 1; z <= p.z1 - 1; z += 5.6) B.add(cyl(0.25, 0.32, 14, 8), stone, x, Y - 7.4, z);
    // rails all round (open to the bridge), along the bridge
    const rail = (ax, az, bx2, bz2) => {
      const len = Math.hypot(bx2 - ax, bz2 - az), n = Math.max(1, Math.round(len / 1.6)), ry = Math.atan2(-(bz2 - az), bx2 - ax);
      for (let i = 0; i <= n; i++) B.add(cached('zprail', () => cyl(0.05, 0.06, 1.1, 6)), brass, ax + (bx2 - ax) * i / n, Y + 0.55, az + (bz2 - az) * i / n);
      for (const h of [0.55, 1.1]) B.add(cyl(0.035, 0.035, len, 6).rotateZ(Math.PI / 2), brass, (ax + bx2) / 2, Y + h, (az + bz2) / 2, 0, ry);
      P.add({ type: 'box', x: o.x + (ax + bx2) / 2, z: o.z + (az + bz2) / 2, hw: len / 2 + 0.1, hd: 0.12, rot: ry, top: Y + 1.1, bottom: Y - 1.5, noStand: true, seeThrough: true });
    };
    rail(p.x0, p.z1, p.x1, p.z1); rail(p.x0, p.z0, p.x0, p.z1); rail(p.x1, p.z0, p.x1, p.z1);
    rail(p.x0, p.z0, br.x - br.hw, p.z0); rail(br.x + br.hw, p.z0, p.x1, p.z0);
    rail(br.x - br.hw, br.z0 + 1.2, br.x - br.hw, p.z0); rail(br.x + br.hw, br.z0 + 1.2, br.x + br.hw, p.z0);
    // the pad and the starship (a bigger Esmer craft, for the long crossing), lamps, the board
    const pd = new THREE.Mesh(cached('zppad', () => new THREE.CylinderGeometry(5.6, 5.8, 0.14, 32)), pm('#8a8f9a', 0.7, { metalness: 0.2 })); pd.position.set(p.pad.x, Y + 0.07, p.pad.z); pd.receiveShadow = true; Z.group.add(pd);
    const ring = new THREE.Mesh(cached('zpring', () => new THREE.TorusGeometry(5.1, 0.08, 6, 40)), pm('#e8c040', 0.5)); ring.rotation.x = Math.PI / 2; ring.position.set(p.pad.x, Y + 0.15, p.pad.z); Z.group.add(ring);
    const ship = esmerShuttle({ landed: true, scale: 1.4 }); ship.position.set(p.pad.x, Y + 0.14, p.pad.z); ship.rotation.y = Math.PI; Z.group.add(ship);
    P.add({ type: 'cyl', x: o.x + p.pad.x, z: o.z + p.pad.z, r: 4.4, top: Y + 6, noStand: true });
    for (const [lx, lz] of [[p.x0 + 0.6, p.z0 + 0.6], [p.x1 - 0.6, p.z0 + 0.6], [p.x0 + 0.6, p.z1 - 0.6], [p.x1 - 0.6, p.z1 - 0.6]]) {
      B.add(cached('zplamp', () => cyl(0.06, 0.08, 3.2, 8)), brass, lx, Y + 1.6, lz);
      B.add(cached('zplampglobe', () => new THREE.SphereGeometry(0.22, 12, 8)), pm('#fff4d8', 0.3, { emissive: '#ffd890', emissiveIntensity: 1.2 }), lx, Y + 3.3, lz);
    }
    B.build();
    const b = boardMesh(Z.group, br.x + 3.4, Y, p.z0 + 2.2, Math.PI * 0.75, { title: 'ZEELICH SPACEPORT', lines: ['TWINSUN: CITADEL', 'BY SPACESHIP'], frame: '#7a3a8a', bg: '#2a1e34', ink: '#f0c040' });
    void b; P.add({ type: 'box', x: o.x + br.x + 3.4, z: o.z + p.z0 + 2.2, hw: 1.1, hd: 0.15, rot: Math.PI * 0.75, top: Y + 2.7, noStand: true });
    Z.spaceport = { pad: { x: o.x + p.pad.x, z: o.z + p.pad.z, y: Y }, landing: { x: o.x + p.pad.x, z: o.z + p.pad.z - 7.2, a: Math.PI }, deck: { x0: o.x + p.x0, x1: o.x + p.x1, z0: o.z + p.z0, z1: o.z + p.z1, y: Y } };
    pt('zeelich_port', { region: 'zeelich', mode: 'ship', x: Z.spaceport.pad.x, z: Z.spaceport.pad.z, r: 6.4, landing: Z.spaceport.landing, name: 'tr_zeelich_port' });
    if (Z.shuttlePad) {
      const sp = Z.shuttlePad, cx = o.x, cz = o.z, a = Math.atan2(cx - sp.x, cz - sp.z);
      pt('zeelich_shuttle', { region: 'zeelich', mode: 'shuttle', x: sp.x, z: sp.z, r: 5.0, landing: { x: sp.x + Math.sin(a) * 5.4, z: sp.z + Math.cos(a) * 5.4, a }, name: 'isle_zeelich' });
      // its departures board: Zeelich's places only
      const bx = sp.x + Math.sin(a + 1.1) * 6.0, bz = sp.z + Math.cos(a + 1.1) * 6.0;
      boardMesh(Z.group, bx - cx, gy(bx, bz), bz - cz, Math.atan2(sp.x + Math.sin(a) * 5.4 - bx, sp.z + Math.cos(a) * 5.4 - bz), { title: 'ESMER SHUTTLE', lines: ISLES.slice(0, 5).map((n) => BOARD_NAME[n]).concat(['… AND ' + (ISLES.length - 5) + ' MORE']), frame: '#7a3a8a', bg: '#2a1e34', ink: '#f0c040' });
      P.add({ type: 'box', x: bx, z: bz, hw: 1.1, hd: 0.15, rot: Math.atan2(sp.x + Math.sin(a) * 5.4 - bx, sp.z + Math.cos(a) * 5.4 - bz), top: gy(bx, bz) + 2.7, noStand: true });
    }
  }
  for (const n of ISLES) { const I = R['isle_' + n]; if (I?.pad) pt('isle_' + n, { region: 'isle_' + n, mode: 'shuttle', x: I.pad.x, z: I.pad.z, r: 5.0, landing: I.spawn, name: 'isle_' + n }); }

  // ---- the routes and their gates
  const reached = (key) => (story) => story.index >= ORDER.indexOf(key);
  const edge = (a, b, mode, gate) => { if (points[a] && points[b]) routes.push({ a, b, mode, gate }); };
  const story = G.story;
  edge('citadel_ferry', 'desert_ferry', 'ferry', (s) => reached('dig')(s) && s.cur.key !== 'steam');   // (in ch. 5 the project has taken the ferry)
  edge('desert_glider', 'hamalayi_glider', 'glider', reached('pass'));
  edge('hamalayi_glider', 'citadel_glider', 'glider', reached('evacuation'));
  edge('desert_glider', 'citadel_glider', 'glider', reached('evacuation'));
  edge('citadel_port', 'zeelich_port', 'ship', reached('dig'));
  const shuttles = Object.values(points).filter((q) => q.mode === 'shuttle').map((q) => q.id);
  for (let i = 0; i < shuttles.length; i++) for (let j = i + 1; j < shuttles.length; j++) edge(shuttles[i], shuttles[j], 'shuttle', reached('dig'));
  void story;
  return (G.travel = { points, routes });
}

// what one can reach from a point now: [{ point, mode }]
export function destinations(game, p) {
  const T = game.travel, s = game.story, out = [];
  if (!T || !p) return out;
  for (const r of T.routes) {
    if (r.a !== p.id && r.b !== p.id) continue;
    if (!r.gate(s)) continue;
    out.push({ point: T.points[r.a === p.id ? r.b : r.a], mode: r.mode });
  }
  // (the menus list Zeelich's spaceport first, then the islands in their order)
  const order = (q) => (q.point.id === 'zeelich_shuttle' ? -1 : PLANETS.twinsun.indexOf(q.point.region) >= 0 ? PLANETS.twinsun.indexOf(q.point.region) : ISLES.indexOf(q.point.id.replace('isle_', '')));
  return out.sort((a, b) => order(a) - order(b));
}
// the travel point he stands at (in the region he is in), or null
export function pointHere(game) {
  const T = game.travel, region = game.room ? (game.room.outdoor ? game.room.id : null) : 'citadel';
  if (!T || !region) return null;
  let best = null, bd = 1e9;
  for (const p of Object.values(T.points)) { if (p.region !== region) continue; const d = Math.hypot(p.x - game.hero.pos.x, p.z - game.hero.pos.z); if (d < p.r && d < bd) { bd = d; best = p; } }
  return best;
}
export const TITLE = { ship: 'tr_title_ship', shuttle: 'isle_title', ferry: 'tr_title_ferry', glider: 'tr_title_glider' };
export const LABEL = { ship: 'p_ship', shuttle: 'p_shuttle', ferry: 'p_ferry', glider: 'p_glider' };

// go: under the fade, to the destination's landing; the story is told (cast, objective), then a short toast
export function travelTo(game, p) {
  const g = game;
  g.startTransition(() => {
    const l = p.landing || { x: p.x, z: p.z, a: 0 };
    if (p.region === 'citadel') {
      if (g.room) g.exitRoom(l, true);
      else { g.hero.pos.set(l.x, g.physics.groundAt(l.x, l.z), l.z); g.hero.angle = l.a ?? 0; g.lastSafe = { x: l.x, z: l.z }; g.save(false); }
    } else g.enterRoom(p.region, l, true);
    g.story.refreshCast();
    g.audio.play('door');
    g.hud.toast(p.name);
    g.updateObjective();
  });
}
export const label = (p) => t(p.name);
