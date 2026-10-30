// FunFrock's condenser hall under the dunes of Desert Island (chapter 5): two interior rooms built with the
// interiors' RoomBuilder (fixed iso camera), far from everything else at x = 3700…3760.
//
//   condA  the valve hall: four steam valves on the intake manifold with pressure gauges, a wall diagram,
//          two old security drones on patrol; a sealed door to the hangar opens when the steam is routed
//   condB  the hangar: three tall condensers, a cargo glider under a tarp, a gantry with a ball switch that
//          opens the roof hatch
//
// CONTRACT for src/game/story/steam.js. Every x/z is a WORLD coordinate; y is world height.
//   all rooms  R.spawn {x,z,a}, R.exits [{x,z,r,to}], R.ballTargets, R.searches, R.updaters
//   condA      R.valves [{id:1..4, x,z, open, setOpen(b)}]; R.gauges.set([0..1, 0..1, 0..1]) (three condensers)
//              R.diagram {x,z}; R.hangarDoor {x,z, isOpen, open()}; R.patrol [[x,z]…]
//              exits 'cond-out' (up to the dunes), 'cond-b' (the hangar, behind the door)
//   condB      R.glider {x,z, uncover()}; R.hatch {isOpen, open()}; R.ballSwitch {x,y,z, on, setOn(b)}
//              (ballTargets entry {…, hatch:true}); R.condensers [{setSteam(0..1)}]; exit 'cond-a'
import * as THREE from 'three';
import { RoomBuilder, glowSprite } from './interiors.js';
import { MAT, M, rbox, plane, cyl, sphere, torus, pipe, canvasTex } from './props.js';

const diagramTex = () => canvasTex(512, 320, (x, W, H) => {
  x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#7a1a1a'; x.lineWidth = 8; x.strokeRect(6, 6, W - 12, H - 12);
  x.fillStyle = '#3a2a1a'; x.font = 'bold 26px sans-serif'; x.fillText('CONDENSER LINE  ·  F.F. WORKS', 24, 44);
  x.lineWidth = 10; x.strokeStyle = '#3a4a5a';
  const pipeTo = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
  pipeTo([[40, 170], [460, 170]]); pipeTo([[150, 170], [150, 260]]); pipeTo([[250, 170], [250, 90]]); pipeTo([[350, 170], [350, 90]]); pipeTo([[440, 170], [440, 90]]);
  x.font = 'bold 22px sans-serif'; x.fillStyle = '#3a2a1a';
  x.fillText('BORE', 18, 160);
  const valve = (vx, vy, n, open) => { x.fillStyle = open ? '#2a8a3a' : '#c02a2a'; x.beginPath(); x.arc(vx, vy, 16, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillText(n, vx - 7, vy + 8); };
  valve(100, 170, '1', true); valve(150, 215, '2', false); valve(250, 130, '3', true); valve(350, 130, '4', true);
  x.fillStyle = '#3a2a1a'; x.font = '18px sans-serif';
  x.fillText('2: BYPASS TO AQUIFER', 120, 290); x.fillText('3, 4: CONDENSERS', 270, 70);
  x.fillStyle = '#7a1a1a'; x.font = 'bold 18px sans-serif'; x.fillText('(5: SPARE, KEEP SHUT)', 360, 300);
});
const gaugeFace = () => canvasTex(128, 128, (x, W) => {
  x.fillStyle = '#f2ead8'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
  x.lineWidth = 10;
  for (const [a0, a1, c] of [[Math.PI * 0.75, Math.PI * 1.5, '#3a8a3a'], [Math.PI * 1.5, Math.PI * 2.0, '#d8a030'], [Math.PI * 2.0, Math.PI * 2.25, '#c02a2a']]) { x.strokeStyle = c; x.beginPath(); x.arc(64, 64, 48, a0, a1); x.stroke(); }
  x.strokeStyle = '#2a2a2a'; x.lineWidth = 4; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.stroke();
  void W;
});

function plateWall(H) { return { floor: MAT.stone('grey', 2), slab: MAT.rubble('grey'), body: MAT.plates('#7a7464', 2), low: MAT.plates('#5a564a', 1), rail: MAT.iron(), cap: MAT.iron(), H, t: 0.45, dado: 1.1, rimH: 0.5, rimMat: MAT.plates('#5a564a', 1) }; }

// ================================================================== the valve hall
function buildValveHall(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'condA', 3700, 0);
  const R = B.room, k = B.k;
  const W = 15, D = 10, H = 5.2;
  R.view = 15.5; R.follow = 0.3; R.music = 'facility';
  B.shell({ ...plateWall(H), W, D, back: [{ at: -5.6, w: 1.8, h: 2.6, y0: 0, kind: 'door' }, { at: 5.2, w: 2.0, h: 2.8, y0: 0, kind: 'door' }] });
  const BZ = -D / 2;
  // the steps up to the dunes (back left) and the hangar door (back right, sealed until the steam is routed)
  for (let i = 0; i < 4; i++) k.add(rbox(1.8, 0.2, 0.6, 0.03), MAT.stone('sand', 1), -5.6, 0.1 + i * 0.12, BZ - 0.6 - i * 0.4);
  const doorM = MAT.plates('#8a5a3a', 1);
  const door = k.mesh(rbox(2.0, 2.8, 0.18, 0.04), doorM, 5.2, 1.4, BZ + 0.05);
  const wheel = k.mesh(torus(0.38, 0.05, 6, 20), MAT.brass(), 5.2, 1.4, BZ + 0.2);
  const doorCol = B.col(5.2, BZ + 0.3, 1.0, 0.3, 2.8, { noStand: true });
  const toB = { x: B.cx + 5.2, z: B.cz + BZ + 0.45, r: 0.7, to: 'cond-b' };
  R.hangarDoor = { x: B.cx + 5.2, z: B.cz + BZ + 1.0, isOpen: false, open() { if (this.isOpen) return; this.isOpen = true; door.position.y = 4.0; wheel.visible = false; doorCol.enabled = false; R.exits.push(toB); } };
  R.exits.push({ x: B.cx - 5.6, z: B.cz + BZ + 0.6, r: 0.8, to: 'cond-out' });
  R.spawn = { x: B.cx - 5.6, z: B.cz + BZ + 2.0, a: 0 };

  // the intake manifold: a fat pipe from the left wall along the back, four valve branches
  const pipeM = MAT.paint('#8a6a4a', 0.5), flM = MAT.iron();
  k.add(pipe([[-W / 2, 0.9, -2.2], [-3, 0.9, -2.2], [5.5, 0.9, -2.2]], 0.34), pipeM);
  for (let i = 0; i < 9; i++) k.add(torus(0.38, 0.06, 6, 18), flM, -W / 2 + 1 + i * 1.5, 0.9, -2.2, Math.PI / 2);
  B.col(-1, -2.2, W / 2, 0.4, 1.3, { noStand: true });
  // pipe stands
  for (let i = 0; i < 5; i++) k.add(rbox(0.25, 0.6, 0.6, 0.03), MAT.iron(), -5.5 + i * 2.6, 0.3, -2.2);
  const valves = [];
  const VX = [-4.2, -1.6, 1.0, 3.6];
  const valveM = MAT.paint('#c02a2a', 0.4);
  VX.forEach((vx, i) => {
    // branch riser to the back wall (1: from the bore, 2: down to the aquifer, 3 and 4: up to the condensers)
    if (i === 1) k.add(pipe([[vx, 0.9, -2.2], [vx, 0.9, -0.8], [vx, 0.05, -0.8]], 0.16), pipeM);
    else k.add(pipe([[vx, 0.9, -2.2], [vx, 2.6, -2.2], [vx, 2.6, BZ + 0.2]], 0.16), pipeM);
    const wl = k.mesh(torus(0.32, 0.045, 6, 20), valveM, vx, 1.45, -1.75, 0, {});
    k.add(cyl(0.06, 0.06, 0.5, 8), MAT.iron(), vx, 1.2, -1.85, 0, { rx: 0.4 });
    for (let s = 0; s < 4; s++) k.add(cyl(0.02, 0.02, 0.62, 5), valveM, vx, 1.45, -1.75, 0, { rz: s * Math.PI / 4 });
    const plate = k.mesh(plane(0.34, 0.24), MAT.map(canvasTex(64, 48, (x) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, 64, 48); x.fillStyle = '#3a2a1a'; x.font = 'bold 36px sans-serif'; x.fillText(String(i + 1), 22, 38); })), vx, 0.55, -1.86, 0);
    void plate;
    const V = { id: i + 1, x: B.cx + vx, z: B.cz - 1.2, open: false, setOpen(b) { this.open = !!b; wl.rotation.z = b ? Math.PI / 2 : 0; wl.material = b ? MAT.paint('#2a8a3a', 0.4) : valveM; } };
    valves.push(V);
  });
  R.valves = valves;
  // three gauges above the manifold (one per condenser line, plus the aquifer), needles move with the routing
  const needles = [];
  for (let i = 0; i < 3; i++) {
    const gx = -1.6 + i * 2.6;
    k.add(cyl(0.34, 0.34, 0.08, 24), MAT.brass(), gx, 3.5, BZ + 0.05, 0, { rx: Math.PI / 2 });
    k.add(plane(0.6, 0.6), MAT.map(gaugeFace()), gx, 3.5, BZ + 0.1);
    const n = k.mesh(rbox(0.04, 0.26, 0.02, 0.005), MAT.flat('#1a1a1a'), gx, 3.5, BZ + 0.12);
    n.geometry = rbox(0.04, 0.26, 0.02, 0.005).clone().translate(0, 0.12, 0);
    needles.push(n);
  }
  R.gauges = { set(vals) { vals.forEach((v, i) => { if (needles[i]) needles[i].rotation.z = Math.PI * 0.75 - v * Math.PI * 1.5 + Math.PI / 2; }); } };
  R.gauges.set([0, 0, 0]);
  // the diagram on the left wall
  k.add(plane(2.4, 1.5), MAT.map(diagramTex()), -W / 2 + 0.05, 2.2, 1.6, Math.PI / 2);
  R.diagram = { x: B.cx - W / 2 + 1.0, z: B.cz + 1.6 };
  R.searches.push({ id: 'diagram', x: R.diagram.x, z: R.diagram.z, r: 1.4 });
  // crates, a workbench with FunFrock-era tools, oil drums (cover for the drones' floor)
  const crate = MAT.planks('honey');
  for (const [x, z, s] of [[-6.4, 3.4, 0.9], [-5.5, 3.6, 0.7], [6.4, 3.6, 0.9], [6.3, 2.6, 0.7], [2.4, 3.8, 0.8]]) { k.add(rbox(s, s, s, 0.03), crate, x, s / 2, z); B.col(x, z, s / 2, s / 2, s); }
  for (const [x, z] of [[-2.8, 3.8], [-2.2, 4.0], [4.6, -0.2]]) { k.add(cyl(0.32, 0.32, 0.95, 14), MAT.paint('#6a7a3a', 0.6), x, 0.475, z); B.ccol(x, z, 0.34, 0.95); }
  k.add(rbox(2.2, 0.08, 0.8, 0.02), MAT.wood('dark'), 0.3, 0.9, 3.9);
  for (const dx of [-1, 1]) k.add(rbox(0.08, 0.9, 0.7, 0.01), MAT.iron(), 0.3 + dx * 1.0, 0.45, 3.9);
  B.col(0.3, 3.9, 1.1, 0.4, 0.95);
  R.patrol = [[-3.5, 1.0], [3.8, 1.0], [3.8, 2.6], [-3.5, 2.6]].map(([x, z]) => [B.cx + x, B.cz + z]);
  // dim work lamps and steam leaking from the joints
  B.light('#ffd8a0', 6, 9, -4, 3.6, 0); B.light('#ffd8a0', 6, 9, 3.5, 3.6, 0);
  for (const [x, z] of [[-4, 0], [3.5, 0]]) { const s = glowSprite('#ffe0b0', 0.9, 0.6); s.position.set(x, 3.6, z); B.group.add(s); }
  return B.finish();
}

// ================================================================== the hangar
function buildHangar(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'condB', 3760, 0);
  const R = B.room, k = B.k;
  const W = 18, D = 13, H = 7.5;
  R.view = 18.5; R.follow = 0.3; R.music = 'facility';
  B.shell({ ...plateWall(H), W, D, left: [{ at: 0, w: 2.0, h: 2.8, y0: 0, kind: 'door' }] });
  const LX = -W / 2;
  R.exits.push({ x: B.cx + LX + 0.5, z: B.cz, r: 0.8, to: 'cond-a' });
  R.spawn = { x: B.cx + LX + 2.0, z: B.cz, a: Math.PI / 2 };
  // three tall condensers along the back
  const condensers = [];
  for (let i = 0; i < 3; i++) {
    const cx = -4 + i * 4, cz = -4.6;
    k.add(cyl(1.3, 1.3, 6.2, 24), MAT.plates('#9a8a6a', 2), cx, 3.1, cz);
    for (const y of [0.6, 3.1, 5.6]) k.add(torus(1.33, 0.07, 6, 28), MAT.iron(), cx, y, cz, 0, { rx: Math.PI / 2 });
    k.add(pipe([[cx, 6.2, cz], [cx, 7.2, cz], [cx, 7.2, -D / 2 - 0.2]], 0.2), MAT.paint('#8a6a4a', 0.5));
    B.ccol(cx, cz, 1.35, 6.2);
    const steam = glowSprite('#ffffff', 2.4, 0); steam.position.set(cx, 6.8, cz + 0.8); B.group.add(steam);
    condensers.push({ setSteam(v) { steam.material.opacity = v * 0.5; } });
  }
  R.condensers = condensers;
  // the cargo glider under a tarp: high wing, stubby fuselage, two skids
  const gl = new THREE.Group(); gl.position.set(2.5, 0, 2.8); gl.rotation.y = -0.3; B.group.add(gl);
  const G = (geo, m, x, y, z, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz; if (o.ry) me.rotation.y = o.ry; me.castShadow = me.receiveShadow = true; gl.add(me); return me; };
  const body = MAT.paint('#c8b890', 0.55), trim = MAT.paint('#7a2a1a', 0.5);
  G(cyl(0.7, 0.45, 5.0, 14), body, 0, 1.3, 0, { rx: Math.PI / 2 });
  G(sphere(0.7, 14, 10), body, 0, 1.3, -2.5);
  G(rbox(9.5, 0.12, 1.5, 0.04), body, 0, 2.15, -0.3);
  G(rbox(9.6, 0.05, 0.25, 0.01), trim, 0, 2.22, -0.95);
  G(rbox(2.6, 0.08, 0.8, 0.02), body, 0, 1.6, 2.4);
  G(rbox(0.08, 1.0, 0.8, 0.02), trim, 0, 2.0, 2.5);
  for (const s of [-1, 1]) { G(rbox(0.08, 0.08, 3.4, 0.02), MAT.iron(), s * 0.55, 0.25, 0); G(rbox(0.06, 0.8, 0.06, 0.01), MAT.iron(), s * 0.55, 0.65, -1); G(rbox(0.06, 0.8, 0.06, 0.01), MAT.iron(), s * 0.55, 0.65, 1); }
  const tarp = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 6.2, 8, 6), MAT.cloth('#7a6a4a', '#5a4a34'));
  { const p = tarp.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 2.3 - Math.abs(y) * 0.55 - Math.abs(x) * 0.08 + Math.sin(x * 2 + y) * 0.06); } tarp.geometry.computeVertexNormals(); }
  tarp.rotation.x = -Math.PI / 2; tarp.material.side = THREE.DoubleSide; gl.add(tarp);
  B.col(2.5, 2.8, 4.8, 1.6, 2.4, { noStand: true, rot: -0.3 });
  R.glider = { x: B.cx + 2.5, z: B.cz + 2.8 + 2.0, uncover() { tarp.visible = false; } };
  // a gantry along the right side with a ball switch for the roof hatch
  const gy = 4.2;
  k.add(rbox(1.2, 0.12, D - 2, 0.02), MAT.tread('#5a5a5a'), W / 2 - 1.0, gy, 0);
  for (const z of [-5, -1.5, 2, 5]) k.add(rbox(0.14, gy, 0.14, 0.02), MAT.iron(), W / 2 - 1.5, gy / 2, z);
  const sw = k.mesh(cyl(0.32, 0.32, 0.14, 18), MAT.paint('#c8302a', 0.4), W / 2 - 0.6, gy + 0.9, 0.5, 0, { rz: Math.PI / 2 });
  R.ballSwitch = { x: B.cx + W / 2 - 0.6, y: gy + 0.9, z: B.cz + 0.5, on: false, setOn(b) { this.on = !!b; sw.material = b ? MAT.glow('#9fffa0', '#40ff60', 1.6) : MAT.paint('#c8302a', 0.4); } };
  R.ballTargets.push({ x: R.ballSwitch.x, y: R.ballSwitch.y, z: R.ballSwitch.z, r: 0.75, hatch: true });
  // the roof hatch: a light shaft falls in when it opens
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, H, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2d0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  shaft.position.set(2.5, H / 2, 2.8); B.group.add(shaft);
  const sun = B.light('#fff0c8', 0, 14, 2.5, H - 0.5, 2.8);
  R.hatch = { isOpen: false, open() { this.isOpen = true; shaft.material.opacity = 0.16; sun.userData.base = 14; sun.intensity = 14; } };
  B.light('#ffd8a0', 7, 12, -3, 5.5, 0); B.light('#ffd8a0', 5, 10, 5, 5.5, -2);
  // crates and drums
  for (const [x, z, s] of [[-7, 4.5, 1.0], [-6, 4.8, 0.8], [-7.2, 3.4, 0.8]]) { k.add(rbox(s, s, s, 0.03), MAT.planks('honey'), x, s / 2, z); B.col(x, z, s / 2, s / 2, s); }
  return B.finish();
}

export function buildCondenser(scene, physics) {
  return { condA: buildValveHall(scene, physics), condB: buildHangar(scene, physics) };
}
void M;
