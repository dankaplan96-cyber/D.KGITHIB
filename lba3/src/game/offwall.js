// U-3 "Off the Wall" (the user's own side quest; docs/lba-maturity/U3-OFF-THE-WALL.md): Tali's ball court, the few
// things it adds to Desert Island (story/offwall.js runs the game and shows each piece by the story's state).
//
// The court is the sandy terrace behind the School of Magic (desertold.js): the island's ground there is flat at 1.3 m
// from the School's rock wall west to the slope, and its south side is the two white blocks (desertold.js, the bodies
// 46 on the mask's terrace): a whitewashed wall 2.85 m high, the pupils' yard wall. Nothing there is moved; the court adds
//   - the bell: a school hand-bell hanging from the arm of a wooden post on a flat stone foot; it is what the ball must
//     ring. Its post stops a walker, never the ball (the whole stand rings: story/offwall.js's hit test is a tall
//     cylinder round the bell, so a ball skipping along the sand rings it too);
//   - Tali's board: an old classroom blackboard on two trestle legs, her score chalked on it. Lying flat on the sand
//     (not in play) until the third game; standing, it is a wall for the ball (a wooden one: the ball's knock is wood,
//     actors.js MagicBall.surface reads the collider's `mat`) and for a walker;
//   - her red chalk X on the east block's face (her aim from the ring) and the lines she scratched in the sand (the ring
//     she throws from, later the board's and the bell's spots): one flat sheet over the court, redrawn when they change;
//   - her own red ball, seen only in her throws.
// Our own geometry and textures; nothing from LBA1/LBA2.
//
// The ball's flight is the magic ball's own (actors.js MagicBall: LBA2's arc for the behaviour, walls reflect each axis on
// its own, every ground bounce restarts the arc, four bounces): flight() follows it step for step on the island's real
// colliders, so Tali's throws fly the way his do, and her X and the tests' aims are measured on the game as it stands.
//
// CONTRACT
//   buildOffWall(game, D) → OW    D: the desert region (regions.built('desert'))
//     setBell(spot)           spot {x, z} local: the bell's hanging point; the post stands 0.35 m east of it
//     setBoard(pose, k?)      pose {x, z, rot, down?} local; `down`: lying flat (no collider). k: 0..1 lift (a move's)
//     ringBell(k)             the bell swings (k: how hard)
//     marks(list)             the sand lines: [{kind:'ring'|'bspot'|'lspot', x, z, rot?}] local
//     score(text lines)       the board's chalk
//     ballShow(p|null)        Tali's red ball at a world point, or hidden
//     bell, board             the live poses: {x, z} / {x, z, rot, down} local
//     W(x, z)                 local → world {x, z};  g: the court's ground height
//     boardCol, bellCol       their colliders (world)
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, sphere, lathe, plane, canvasTex } from './props.js';

// ------------------------------------------------------------------ the court (desert.js's local frame, metres)
export const OWC = {
  g: 1.3,                                          // the terrace's ground
  wall: { east: { x0: -76.2, x1: -73.2, z: -74.4 }, west: { x0: -79.7, x1: -76.7, z: -74.7 } },   // the blocks' north faces
  court: { x0: -80.4, x1: -72.6, z0: -84.4, z1: -74.8 },                                           // where his throws count
  tali: { x: -73.4, z: -81.2 },                    // where she stands (by the boulder at the School's back, out of the throws)
  ring1: { x: -78.6, z: -80.2 },                   // her ring (the first game, her demonstration)
  ring3: { x: -76.5, z: -80.0 },                   // her ring for the last game ("only one way from here")
  chalkX: { x: -75.65, y: 1.0 },                   // her X on the east block's face, over the ground
  bell: { c1: { x: -74.6, z: -76.4 }, c2: { x: -75.6, z: -78.2 }, c3: { x: -78.4, z: -76.2 } },
  board: { store: { x: -78.9, z: -82.9, rot: Math.PI, down: true }, c3: { x: -77.2, z: -75.8, rot: Math.PI / 2 } },
  // the practice court's spots (after the quest): the board's three, the bell's three; every pairing leaves a metre clear
  pBoard: [{ x: -76.4, z: -79.6, rot: 0 }, { x: -77.2, z: -75.8, rot: Math.PI / 2 }, { x: -74.4, z: -78.4, rot: Math.PI / 2 }],
  pBell: [{ x: -78.4, z: -76.2 }, { x: -74.6, z: -76.4 }, { x: -75.6, z: -78.2 }],
  BOARD: { w: 2.0, h0: 0.45, h1: 1.75, t: 0.06 },  // the slate's width, its bottom and top over the ground, thickness
  POST: 0.35,                                      // the post stands this far east of the bell
};

// ------------------------------------------------------------------ the magic ball's flight (actors.js MagicBall, Normal)
// LBA2's throw per behaviour (actors.js LBA_BALL): launch angle, speed, weight → forward / up m/s and gravity
const LBA = { normal: [120, 100, 16], athletic: [80, 105, 14], aggressive: [40, 110, 12], discreet: [572, 100, 35] };
const U = 2.065 / 1238;
export const THROW = Object.fromEntries(Object.entries(LBA).map(([b, [al, v, w]]) => { const a = (al / 4096) * Math.PI * 2, s = v * 50 * U; return [b, { vx: s * Math.cos(a), vy: s * Math.sin(a), g: (w / 8) * 2500 * U }]; }));
const BALL_R = 0.14;
// A throw from (x, z) (world) facing `ang`, released `rel` = {f, s, u} from there (ahead, to the left, up: actors.js
// REL_OFF), as Classic throws it (along the facing, the behaviour's own arc): its path (world points every 1/60 s), the
// contacts in order ({kind, c, at, i: the path's frame it falls in}), and where a target `hit(p)` (true when the ball is in it) was struck. Stops at the
// hit, at the fifth contact (four bounces), in the sea, or after 4.2 s: the ball's own rules.
export function flight(game, x, z, ang, { beh = 'normal', rel = { f: 0.9, s: -0.19, u: 1.45 }, hit = null, ground = null } = {}) {
  const P = game.physics, S = THROW[beh] || THROW.normal;
  const gy0 = ground ?? P.groundAt(x, z, 50);
  const land = (hh) => S.vx * (S.vy + Math.sqrt(S.vy * S.vy + 2 * S.g * hh)) / S.g;
  const k = land(1200 * U) / land(Math.max(0.2, rel.u));   // (the forward speed scaled so the landing on the flat is LBA2's)
  const fx = Math.sin(ang), fz = Math.cos(ang);
  let px = x + fx * rel.f + fz * rel.s, pz = z + fz * rel.f - fx * rel.s, py = gy0 + rel.u;
  let vx = fx * S.vx * k, vz = fz * S.vx * k, vy = S.vy;
  const out = { path: [[px, py, pz]], contacts: [], hit: null };
  let bounces = 4;
  for (let t = 0; t < 4.2; t += 1 / 60) {
    const sp = Math.hypot(vx, vy, vz), n = Math.max(1, Math.ceil((sp / 60) / 0.12)), h = 1 / 60 / n;
    for (let i = 0; i < n; i++) {
      vy -= S.g * h;
      if (hit && hit(px, py, pz)) { out.hit = { at: [px, py, pz], contacts: out.contacts.length }; out.path.push([px, py, pz]); return out; }
      const nx = px + vx * h, nz = pz + vz * h;
      if (P.solidAt(nx, nz, py, BALL_R)) {
        const bx = P.solidAt(nx, pz, py, BALL_R), bz = P.solidAt(px, nz, py, BALL_R);
        if (bx || !bz) vx *= -1;
        if (bz || !bx) vz *= -1;
        out.contacts.push({ kind: 'wall', c: P.solidCollider(nx, nz, py, BALL_R), at: [px, py, pz], i: out.path.length });
        if (--bounces < 0) { out.path.push([px, py, pz]); return out; }
      } else { px = nx; pz = nz; }
      py += vy * h;
      const gi = P.groundInfo(px, pz, py + 0.3), gg = gi.h + 0.17;
      if (py < gg) {
        if (gg < 0.2 && !gi.brick) { out.sea = true; out.path.push([px, gg, pz]); return out; }
        py = gg; vy = S.vy;
        out.contacts.push({ kind: 'ground', c: null, at: [px, py, pz], i: out.path.length });
        if (--bounces < 0) { out.path.push([px, py, pz]); return out; }
      }
    }
    out.path.push([px, py, pz]);
  }
  return out;
}

// ------------------------------------------------------------------ textures
const chalkX = () => canvasTex(128, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  x.strokeStyle = 'rgba(200,52,40,0.9)'; x.lineCap = 'round';   // (red chalk: white would vanish on the whitewash)
  for (const [a, b, c, d, w] of [[16, 18, 110, 112, 14], [110, 16, 18, 110, 14], [24, 26, 104, 104, 5], [104, 22, 24, 104, 5]]) { x.lineWidth = w; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(W / 2 + 3, H / 2 - 2, c, d); x.stroke(); }
});
// the slate: dark green, rubbed, her chalk on it (redrawn by score())
function slateDraw(x, W, H, lines) {
  x.fillStyle = '#2d4436'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(220,230,220,${0.02 + (i % 5) * 0.008})`; x.beginPath(); x.ellipse((i * 97) % W, (i * 53) % H, 40 + (i % 7) * 9, 10 + (i % 4) * 5, (i % 3) * 0.5, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = 'rgba(245,245,238,0.92)'; x.textAlign = 'left'; x.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((s, i) => { x.font = `bold 44px 'Comic Sans MS', 'Chalkboard SE', sans-serif`; x.fillText(s, 30, (H / (n + 1)) * (i + 1)); });
}

// ------------------------------------------------------------------ build
export function buildOffWall(game, D) {
  if (D.offwall) return D.offwall;
  const PH = game.physics, O = D.group.position, W = (x, z) => ({ x: O.x + x, z: O.z + z });
  const g = OWC.g;
  const root = new THREE.Group(); root.name = 'offwall'; D.group.add(root);
  const OW = { W, g, root };

  // ---- the bell on its post (a group: it moves between games); the bell itself swings on its pivot
  const bellG = new THREE.Group(); bellG.name = 'ow_bell'; root.add(bellG);
  const P = OWC.POST;
  { const k = new Kit(bellG), wood = MAT.wood('dark'), stone = MAT.stone('sand', 1);
    k.add(rbox(0.5, 0.12, 0.42, 0.04), stone, P, 0.06, 0);                         // the flat stone foot
    k.add(cyl(0.045, 0.055, 1.9, 10), wood, P, 0.95, 0);                          // the post
    k.add(rbox(0.46, 0.06, 0.07, 0.015), wood, P / 2 - 0.04, 1.86, 0);             // the arm, out over the bell
    k.add(rbox(0.05, 0.22, 0.05, 0.01), wood, P - 0.05, 1.74, 0, 0, { rz: -0.75 }); // its brace
    k.flush(); }
  const swing = new THREE.Group(); swing.position.set(0, 1.83, 0); swing.scale.setScalar(1.6); bellG.add(swing);   // (a big school bell: it reads from the play camera)
  { const brass = MAT.brass();
    const bellGeo = lathe([[0.001, 0], [0.03, 0], [0.05, -0.03], [0.075, -0.13], [0.11, -0.22], [0.118, -0.235], [0.112, -0.24], [0.1, -0.225], [0.07, -0.14], [0.042, -0.035], [0.001, -0.03]], 18);
    const b = new THREE.Mesh(bellGeo, brass); b.position.y = -0.08; b.castShadow = true; swing.add(b);
    const loop = new THREE.Mesh(cyl(0.012, 0.012, 0.09, 6), MAT.iron()); loop.position.y = -0.04; swing.add(loop);
    const clap = new THREE.Mesh(sphere(0.028, 8, 6), MAT.iron()); clap.position.y = -0.31; swing.add(clap);
    const rope = new THREE.Mesh(cyl(0.006, 0.006, 0.18, 4), MAT.flat('#c8a878', 0.9)); rope.position.y = -0.2; swing.add(rope); }
  // the post stops a walker; the ball goes past it (the stand rings instead: story/offwall.js)
  OW.bellCol = PH.add({ type: 'cyl', x: 0, z: 0, r: 0.2, top: g + 1.9, noStand: true, seeThrough: true, noBall: true, owBell: true });
  OW.bell = { x: 0, z: 0 };
  OW.setBell = (s) => {
    OW.bell = { x: s.x, z: s.z };
    bellG.position.set(s.x, g, s.z);
    const w = W(s.x + P, s.z); OW.bellCol.x = w.x; OW.bellCol.z = w.z; PH.update(OW.bellCol);
  };
  OW.bellWorld = () => ({ ...W(OW.bell.x, OW.bell.z), y: g + 1.47 });   // (the bell's mouth, world)
  OW.swingT = 99; OW.swingK = 0;
  OW.ringBell = (k = 1) => { OW.swingT = 0; OW.swingK = Math.min(1, k); };

  // ---- the board: a blackboard in a wooden frame on two trestle legs (a group: it moves; `slab` lifts when it stands)
  const B = OWC.BOARD;
  const boardG = new THREE.Group(); boardG.name = 'ow_board'; root.add(boardG);
  const slab = new THREE.Group(); boardG.add(slab);   // (the slate and its frame; turned flat when it lies)
  const slateC = document.createElement('canvas'); slateC.width = 512; slateC.height = 320;
  const slateT = new THREE.CanvasTexture(slateC); slateT.colorSpace = THREE.SRGBColorSpace; slateT.anisotropy = 4;
  const slateM = new THREE.MeshStandardMaterial({ map: slateT, roughness: 0.9 });
  const hh = B.h1 - B.h0;
  { const k = new Kit(slab), frame = MAT.wood('honey');
    k.add(rbox(B.w + 0.1, 0.07, B.t + 0.03, 0.015), frame, 0, hh / 2 + 0.035, 0);
    k.add(rbox(B.w + 0.1, 0.07, B.t + 0.03, 0.015), frame, 0, -hh / 2 - 0.035, 0);
    for (const s of [-1, 1]) k.add(rbox(0.07, hh + 0.14, B.t + 0.03, 0.015), frame, s * (B.w / 2 + 0.015), 0, 0);
    k.add(rbox(B.w, hh, B.t, 0.01), MAT.flat('#25362c', 0.9), 0, 0, 0);
    k.add(rbox(0.5, 0.03, 0.06, 0.01), frame, 0.4, -hh / 2 - 0.08, 0.04);   // the chalk ledge
    k.flush(); }
  for (const s of [1, -1]) { const face = new THREE.Mesh(plane(B.w - 0.04, hh - 0.04), slateM); face.position.z = s * (B.t / 2 + 0.002); if (s < 0) face.rotation.y = Math.PI; slab.add(face); }
  // the legs: an A of two poles at each end, a foot rail between them (only while it stands)
  const legs = new THREE.Group(); boardG.add(legs);
  { const k = new Kit(legs), wood = MAT.wood('honey');
    for (const s of [-1, 1]) {
      for (const f of [-1, 1]) k.add(cyl(0.025, 0.03, 1.62, 6), wood, s * (B.w / 2 + 0.02), 0.78, f * 0.2, 0, { rx: f * 0.26 });
      k.add(rbox(0.05, 0.05, 0.46, 0.01), wood, s * (B.w / 2 + 0.02), 0.08, 0);
    }
    k.flush(); }
  OW.boardCol = PH.add({ type: 'box', x: 0, z: 0, hw: B.w / 2 + 0.06, hd: 0.09, rot: 0, top: g + B.h1 + 0.05, mat: 'wood', noStand: true, owBoard: true });
  OW.board = { x: 0, z: 0, rot: 0, down: true };
  // pose: {x, z, rot, down}; lift (0 lying … 1 standing) for a move's in-between
  OW.setBoard = (p, lift = null) => {
    OW.board = { x: p.x, z: p.z, rot: p.rot || 0, down: !!p.down };
    const up = lift ?? (p.down ? 0 : 1);
    boardG.position.set(p.x, g, p.z); boardG.rotation.y = p.rot || 0;
    // standing: the slate's middle at its height; lying: flat on the sand, its face up, the legs folded away
    slab.position.y = 0.04 + (B.h0 + hh / 2 - 0.04) * up; slab.rotation.x = -Math.PI / 2 * (1 - up);
    legs.visible = up > 0.6; legs.scale.y = Math.max(0.01, up);
    const w = W(p.x, p.z); OW.boardCol.x = w.x; OW.boardCol.z = w.z; OW.boardCol.rot = p.rot || 0; OW.boardCol.enabled = up >= 1 && !p.down; PH.update(OW.boardCol);
  };
  OW.boardStanding = () => OW.boardCol.enabled;
  OW.score = (lines) => { slateDraw(slateC.getContext('2d'), slateC.width, slateC.height, lines); slateT.needsUpdate = true; };
  OW.score(['TALI 31', 'JOSS 2']);

  // ---- her X on the east block's face (its north face, z −74.4: the play camera looks south at it)
  { const m = new THREE.Mesh(plane(0.75, 0.75), new THREE.MeshStandardMaterial({ map: chalkX(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(OWC.chalkX.x, g + OWC.chalkX.y, OWC.wall.east.z - 0.012); m.rotation.y = Math.PI; m.renderOrder = 2; root.add(m); OW.xMesh = m; }

  // ---- the lines in the sand: one sheet over the court, a canvas drawn with what is marked now
  const C = OWC.court, cw = C.x1 - C.x0, cd = C.z1 - C.z0, PX = 56;   // (pixels a metre)
  const sandC = document.createElement('canvas'); sandC.width = Math.round(cw * PX); sandC.height = Math.round(cd * PX);
  const sandT = new THREE.CanvasTexture(sandC); sandT.colorSpace = THREE.SRGBColorSpace; sandT.anisotropy = 4;
  const sand = new THREE.Mesh(plane(cw, cd), new THREE.MeshStandardMaterial({ map: sandT, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set((C.x0 + C.x1) / 2, g + 0.02, (C.z0 + C.z1) / 2); sand.renderOrder = 1; sand.receiveShadow = true; root.add(sand);
  OW.marks = (list) => {
    const x = sandC.getContext('2d'); x.clearRect(0, 0, sandC.width, sandC.height);
    const px = (X) => (X - C.x0) * PX, pz = (Z) => (Z - C.z0) * PX;
    x.lineCap = 'round';
    const groove = (draw, w = 5) => { x.strokeStyle = 'rgba(96,64,34,0.72)'; x.lineWidth = w; draw(); x.stroke(); x.strokeStyle = 'rgba(255,236,200,0.35)'; x.lineWidth = 2; x.save(); x.translate(-1.5, -1.5); draw(); x.stroke(); x.restore(); };
    for (const m of list) {
      if (m.kind === 'ring') groove(() => { x.beginPath(); x.ellipse(px(m.x), pz(m.z), 0.5 * PX, 0.5 * PX, 0, 0, Math.PI * 2); }, 6);
      else if (m.kind === 'lspot') groove(() => { x.beginPath(); x.arc(px(m.x + P), pz(m.z), 0.32 * PX, 0, Math.PI * 2); }, 3);
      else if (m.kind === 'bspot') groove(() => { x.save(); x.translate(px(m.x), pz(m.z)); x.rotate(-(m.rot || 0)); x.beginPath(); x.rect(-(B.w / 2 + 0.12) * PX, -0.3 * PX, (B.w + 0.24) * PX, 0.6 * PX); x.restore(); }, 3);
    }
    sandT.needsUpdate = true;
  };
  OW.marks([]);

  // ---- Tali's red ball
  const red = new THREE.Mesh(sphere(0.085, 12, 8), MAT.flat('#d8452f', 0.45)); red.castShadow = true; red.visible = false; game.scene.add(red);
  OW.ballShow = (p) => { if (!p) { red.visible = false; return; } red.visible = true; red.position.set(p[0], p[1], p[2]); };

  OW.update = (dt) => {
    if (OW.swingT < 3) { OW.swingT += dt; const t = OW.swingT; swing.rotation.z = 0.5 * OW.swingK * Math.exp(-1.6 * t) * Math.sin(11 * t); swing.rotation.x = 0.15 * OW.swingK * Math.exp(-1.6 * t) * Math.sin(8 * t + 1); }
    else if (swing.rotation.z) { swing.rotation.z = 0; swing.rotation.x = 0; }
  };
  OW.setBell(OWC.bell.c1);
  OW.setBoard(OWC.board.store);
  D.offwall = OW;
  return OW;
}
