// The Temple of Bù under Temple-Park, by Bald Mountain on Desert Island (chapter 4): one interior room built with
// the interiors' RoomBuilder (fixed iso camera), far from everything else at x = 3830. After LBA2's temple (the
// user's reference #62): dark slate halls, old mine rails winding over the floor with an ore cart, a great iron
// wheel half sunk in the floor, tall pale urns, carved friezes of pink-red arches on the walls, stalagmite
// clusters and lantern posts with small blue globes. At the far end the great relief: a cross-section of Twinsun
// — Sendell, her well, the shell, and the vents the project is closing.
//
// CONTRACT for src/game/story/dig.js. Every x/z is a WORLD coordinate; y is world height.
//   R.spawn {x,z,a}, R.exits [{x,z,r,to:'bu-out'}], R.ballTargets, R.searches, R.updaters
//   R.carving {x,z}      where Twinsen reads the relief (and Ilka and Dallan join him)
//   R.npcSpots {ilka, dallan} {x,z,a}
//   R.mites [{x,z}]      crystal mites that got in through the project's cut
import * as THREE from 'three';
import { RoomBuilder, glowSprite } from './interiors.js';
import { MAT, rbox, plane, cyl, sphere, torus, lathe, canvasTex } from './props.js';

export const TEMPLE = { x: 3830, z: 0 };

// the great relief: Twinsun in section, carved and painted in the temple's pink-red
const reliefTex = () => canvasTex(768, 400, (x, W, H) => {
  x.fillStyle = '#5a3a3e'; x.fillRect(0, 0, W, H);
  // a border of arches, as on the friezes
  x.fillStyle = '#8a4a52';
  for (let i = 0; i < 16; i++) { const cx = 24 + i * 48; x.beginPath(); x.arc(cx, 30, 18, Math.PI, 0); x.lineTo(cx + 18, 40); x.lineTo(cx - 18, 40); x.fill(); x.beginPath(); x.arc(cx, H - 18, 18, Math.PI, 0); x.lineTo(cx + 18, H - 8); x.lineTo(cx - 18, H - 8); x.fill(); }
  const cx = W / 2, cy = H / 2 + 12;
  // the planet: the outer crust, the shell, the core where "she" sleeps
  x.fillStyle = '#7a5a48'; x.beginPath(); x.arc(cx, cy, 140, 0, 7); x.fill();
  x.strokeStyle = '#d8b090'; x.lineWidth = 10; x.beginPath(); x.arc(cx, cy, 92, 0, 7); x.stroke();   // the shell
  x.fillStyle = '#3a2a3e'; x.beginPath(); x.arc(cx, cy, 86, 0, 7); x.fill();
  const g = x.createRadialGradient(cx, cy, 6, cx, cy, 60); g.addColorStop(0, '#bff4ff'); g.addColorStop(1, 'rgba(120,200,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 60, 0, 7); x.fill();
  // a curled sleeping form at the core
  x.strokeStyle = '#e8f8ff'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, 22, 0.4, 5.6); x.stroke(); x.beginPath(); x.arc(cx + 8, cy - 4, 8, 0, 7); x.stroke();
  // five vents through the shell, the project's bores closing two of them
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62;
    const x0 = cx + Math.cos(a) * 92, y0 = cy + Math.sin(a) * 92, x1 = cx + Math.cos(a) * 142, y1 = cy + Math.sin(a) * 142;
    x.strokeStyle = '#ffd890'; x.lineWidth = 6; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    if (i === 1 || i === 3) { x.strokeStyle = '#2a1a1a'; x.lineWidth = 9; x.beginPath(); x.moveTo((x0 + x1) / 2 - 10, (y0 + y1) / 2 - 10); x.lineTo((x0 + x1) / 2 + 10, (y0 + y1) / 2 + 10); x.stroke(); }
  }
  // Sendell above, wings over the world; her well a thin line down to the shell
  x.fillStyle = '#bff4ff';
  x.beginPath(); x.ellipse(cx, cy - 172, 10, 14, 0, 0, 7); x.fill();
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 8, cy - 172); x.quadraticCurveTo(cx + s * 70, cy - 210, cx + s * 110, cy - 160); x.quadraticCurveTo(cx + s * 60, cy - 170, cx + s * 8, cy - 160); x.fill(); }
  x.strokeStyle = '#bff4ff'; x.lineWidth = 2; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(cx, cy - 150); x.lineTo(cx, cy - 92); x.stroke(); x.setLineDash([]);
  // the old script: B Ù
  x.fillStyle = '#e8c8a0'; x.font = 'bold 44px serif'; x.fillText('B Ù', 40, cy + 14); x.fillText('B Ù', W - 120, cy + 14);
  // weathering
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 2 + Math.random() * 5); }
});
// the wall friezes: a band of pink arches on a darker ground (the reference's carved panels)
const friezeTex = () => canvasTex(512, 128, (x, W, H) => {
  x.fillStyle = '#4a3a44'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#8a5a62';
  for (let i = 0; i < 6; i++) { const cx = 43 + i * 85; x.beginPath(); x.moveTo(cx - 34, H - 12); x.lineTo(cx - 34, 52); x.arc(cx, 52, 34, Math.PI, 0); x.lineTo(cx + 34, H - 12); x.closePath(); x.fill(); }
  x.fillStyle = '#b07a7e';
  for (let i = 0; i < 6; i++) { const cx = 43 + i * 85; x.beginPath(); x.arc(cx, 54, 14, 0, 7); x.fill(); }
  x.strokeStyle = '#2a2026'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6);
});

function buildTempleRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'butemple', TEMPLE.x, TEMPLE.z);
  const R = B.room, k = B.k;
  const W = 22, D = 14, H = 6.5;
  R.view = 19.5; R.follow = 0.3; R.music = 'cave'; R.cave = true;
  const slate = MAT.stone('slate', 2), rough = MAT.rubble('slate');
  B.shell({ floor: MAT.stone('slate', 3), slab: rough, body: slate, low: rough, rail: MAT.iron(), cap: MAT.iron(), H, t: 0.6, dado: 1.2, rimH: 0.55, rimMat: rough, W, D,
    back: [{ at: -8.5, w: 2.2, h: 3.0, y0: 0, kind: 'door' }] });
  const BZ = -D / 2;
  // the way in: steps down from the project's cut (back left)
  for (let i = 0; i < 4; i++) k.add(rbox(2.2, 0.2, 0.6, 0.03), MAT.stone('sand', 1), -8.5, 0.1 + i * 0.12, BZ - 0.6 - i * 0.4);
  R.exits.push({ x: B.cx - 8.5, z: B.cz + BZ + 0.6, r: 0.9, to: 'bu-out' });
  R.spawn = { x: B.cx - 8.5, z: B.cz + BZ + 2.2, a: 0 };

  // friezes along both far walls
  const fz = MAT.map(friezeTex(), 0.9);
  for (let i = 0; i < 4; i++) k.add(plane(4.2, 1.05), fz, -3.5 + i * 4.4, 3.4, BZ + 0.04);
  for (let i = 0; i < 3; i++) k.add(plane(4.2, 1.05), fz, -W / 2 + 0.04, 3.4, -4.6 + i * 4.4, Math.PI / 2);

  // the great relief on the back wall, on a raised dais with two steps
  k.add(rbox(8.4, 0.3, 3.2, 0.05), rough, 5.6, 0.15, BZ + 1.6);
  k.add(rbox(8.4, 0.3, 0.6, 0.05), rough, 5.6, 0.15, BZ + 3.5);
  B.col(5.6, BZ + 1.6, 4.2, 1.6, 0.3, { stair: true });
  k.add(rbox(7.4, 4.0, 0.3, 0.06), MAT.stone('lav', 1), 5.6, 2.4, BZ + 0.18);
  k.add(plane(6.8, 3.55), MAT.map(reliefTex(), 0.95), 5.6, 2.45, BZ + 0.35);
  for (const s of [-1, 1]) k.add(rbox(0.6, 4.6, 0.6, 0.08), slate, 5.6 + s * 3.9, 2.3, BZ + 0.4);
  R.carving = { x: B.cx + 5.6, z: B.cz + BZ + 2.4 };
  R.npcSpots = { ilka: { x: B.cx + 3.4, z: B.cz + BZ + 3.0, a: 0.6 }, dallan: { x: B.cx + 1.0, z: B.cz + 1.2, a: 2.4 } };
  R.searches.push({ id: 'relief', x: R.carving.x, z: R.carving.z, r: 1.6 });
  const reliefGlow = B.light('#bff4ff', 2.2, 6, 5.6, 2.4, BZ + 1.4);
  void reliefGlow;

  // old mine rails winding over the floor: two iron rails on wooden sleepers (low: walked over)
  const iron = MAT.iron(), sleeper = MAT.wood('dark');
  const track = [];
  for (let i = 0; i <= 60; i++) { const u = i / 60; track.push([-8.5 + u * 15, 2.2 + Math.sin(u * Math.PI * 1.5) * 2.6]); }
  for (let i = 0; i < track.length - 1; i++) {
    const [x0, z0] = track[i], [x1, z1] = track[i + 1], a = Math.atan2(x1 - x0, z1 - z0), len = Math.hypot(x1 - x0, z1 - z0);
    for (const s of [-1, 1]) k.add(rbox(0.07, 0.07, len + 0.02, 0.01), iron, (x0 + x1) / 2 + Math.cos(a) * s * 0.42, 0.06, (z0 + z1) / 2 - Math.sin(a) * s * 0.42, a);
    if (i % 2 === 0) k.add(rbox(1.15, 0.05, 0.18, 0.01), sleeper, x0, 0.025, z0, a);
  }
  // the ore cart, stopped on the rails
  {
    const [x0, z0] = track[38], [x1, z1] = track[39], a = Math.atan2(x1 - x0, z1 - z0);
    k.at(x0, 0, z0, a, () => {
      k.add(rbox(0.95, 0.65, 1.4, 0.05), MAT.plates('#6a5a48', 1), 0, 0.62, 0);
      k.add(rbox(0.85, 0.08, 1.3, 0.02), MAT.flat('#2a2422'), 0, 0.96, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.16, 0.16, 0.08, 12), iron, sx * 0.44, 0.18, sz * 0.45, 0, { rz: Math.PI / 2 });
      for (let i = 0; i < 6; i++) k.add(sphere(0.12 + (i % 3) * 0.03, 7, 5), MAT.flat('#6ab8d8', 0.4, { emissive: '#2a6a8a', emissiveIntensity: 0.6 }), (i % 3 - 1) * 0.25, 1.0, (i < 3 ? -0.3 : 0.3));
    });
    B.col(x0, z0, 0.55, 0.75, 1.0, { rot: a, noStand: true });
  }
  // the great iron wheel, half sunk in a slot in the floor (left)
  {
    const wx = -W / 2 + 2.2, wz = 2.6;
    k.add(rbox(0.6, 0.2, 4.6, 0.04), MAT.flat('#141214'), wx, 0.01, wz);
    k.add(torus(2.1, 0.14, 8, 36), iron, wx, 0.2, wz, Math.PI / 2);
    k.add(cyl(0.3, 0.3, 0.4, 12), iron, wx, 0.2, wz, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; k.add(rbox(0.1, 4.0, 0.1, 0.01), iron, wx, 0.2, wz, 0, { rx: a }); }
    B.col(wx, wz, 0.35, 2.3, 2.3, { noStand: true });
  }
  // tall pale urns in pairs
  const urnM = MAT.flat('#d8d0c4', 0.6), urn = lathe([[0.001, 0], [0.18, 0.02], [0.32, 0.35], [0.36, 0.7], [0.28, 1.05], [0.12, 1.25], [0.1, 1.42], [0.16, 1.5], [0.001, 1.5]], 14);
  for (const [x, z] of [[-1.8, BZ + 0.9], [-1.0, BZ + 1.1], [W / 2 - 0.9, 3.8], [W / 2 - 1.0, 5.0]]) { k.add(urn, urnM, x, 0, z); B.ccol(x, z, 0.38, 1.5); }
  // rough slate pillars and stalagmite clusters
  const pill = lathe([[0.001, 0], [0.75, 0.0], [0.62, 0.4], [0.55, 2.2], [0.62, 4.6], [0.8, 5.2], [0.8, 6.5], [0.001, 6.5]], 9);
  for (const [x, z] of [[-4.0, -1.2], [1.2, 4.6], [8.6, 3.4]]) { k.add(pill, rough, x, 0, z); B.ccol(x, z, 0.72, 6.5); }
  const spike = (h, r) => lathe([[0.001, 0], [r, 0], [r * 0.5, h * 0.5], [0.001, h]], 7);
  for (const [x, z, n] of [[-9.6, -5.6, 4], [9.8, -5.4, 3], [-9.8, 5.6, 3], [3.2, -0.6, 2]]) {
    for (let i = 0; i < n; i++) { const h = 0.8 + ((i * 37) % 9) / 9 * 1.4, ox = ((i * 53) % 7 - 3) * 0.22, oz = ((i * 29) % 7 - 3) * 0.22; k.add(spike(h, 0.22 + h * 0.08), rough, x + ox, 0, z + oz); }
    B.ccol(x, z, 0.7, 1.2);
  }
  // lantern posts with small blue globes
  for (const [x, z] of [[-6.0, BZ + 1.2], [-1.4, 2.8], [3.0, 5.6], [9.6, -1.6]]) {
    k.add(cyl(0.05, 0.06, 2.2, 6), iron, x, 1.1, z);
    k.add(sphere(0.13, 10, 8), MAT.glow('#9fd8ff', '#40a0ff', 1.8), x, 2.3, z);
    const s = glowSprite('#9fd8ff', 1.1, 0.55); s.position.set(x, 2.3, z); B.group.add(s);
    B.ccol(x, z, 0.12, 2.2);
  }
  B.light('#9fc8ff', 7, 11, -5, 4.2, 0); B.light('#9fc8ff', 6, 11, 4, 4.2, 2); B.light('#ffc8a0', 4, 9, 5.6, 3.5, BZ + 2.5);
  // crystal mites came in through the project's cut
  R.mites = [[-3.0, 3.0], [4.4, 0.6]].map(([x, z]) => ({ x: B.cx + x, z: B.cz + z }));
  B.giver('bu_urns', -1.4, BZ + 1.8, ['money', 'life', 'magic'], 1, { r: 1.0 });
  // a stair down to the temple's older levels (LBA1's maze and halls: src/game/lba1places.js)
  {
    const sx = -6.5, sz = 5.4;
    k.add(rbox(1.9, 0.12, 1.9, 0.03), MAT.flat('#0a0a10'), sx, 0.02, sz);
    for (let i = 0; i < 4; i++) k.add(rbox(1.5, 0.08, 0.32, 0.02), MAT.stone('slate', 1), sx, 0.05 - i * 0.02, sz - 0.6 + i * 0.36);
    for (const s of [-1, 1]) k.add(rbox(0.25, 0.5, 2.1, 0.04), rough, sx + s * 1.05, 0.25, sz);
    k.add(rbox(2.3, 0.3, 0.25, 0.04), rough, sx, 0.15, sz - 1.05);
    R.exits.push({ x: B.cx + sx, z: B.cz + sz + 0.4, r: 0.7, room: 'bumaze' });
    const back = { x: B.cx + sx + 1.6, z: B.cz + sz - 1.6, a: 0 };
    R.entries = { bumaze: back, buhalls: back };
  }
  return B.finish();
}

export function buildTemple(scene, physics) {
  return { butemple: buildTempleRoom(scene, physics) };
}
