// The spaceship's cabin (TRAVEL-1): where Twinsen rides between Twinsun and Zeelich, seen for a few seconds in the
// flight film (src/game/travelfilm.js). The laptop's World Art room (it replaced the cloud's placeholder, keeping the
// handle below): after LBA2's Esmer spacecraft (scene 41), about 80 % alike, our own geometry from a study of the
// original's layout (numbers and descriptions only; nothing copied):
//   - a square cabin under a low cream shell with oval windows, two in each side wall and two in the nose
//   - a deep red U of padded seats at the back, facing the nose; the two pilots' pods in the nose corners (rounded blue
//     consoles under glass domes, a red light on each)
//   - the engine's glass column in the middle behind a teal railing, glowing from below, on a grille deck
//   - the hatch with its yellow-and-black sill in the left wall at the back
// Twelve years on (ours): the shell's brass trim and a Twinsun timetable card by the hatch; the passengers are Twinsun
// travellers now, a Mosquibee steward among the Esmer crew.
//
// CONTRACT (the hook; WORLD_ART_REQUESTS.md TRAVEL-1, "Cloud: built")
//   buildShipCabin({ view }) → handle, built on demand and disposed after the film:
//     group        THREE.Group; origin on the cabin floor at its centre, the ship's nose toward +z, floor at y = 0
//     size         { w, l, h } metres (x, z, y)
//     seats        [{ x, y, z, a }]  where a seated passenger's root goes (y: the floor, the seat is at ~0.45 m),
//                                    a = the facing (as an actor's angle: 0 faces +z)
//     windows      [{ x, y, z, a, r }]  the centre of each window's glass on the inner wall; a = the facing of someone
//                                    looking out of it; r its radius
//     stand        [{ x, z, a, window }]  standing spots by a window (window: its index), facing it
//     passengers   [{ role, look, seat | stand, anim, lookAt }]  who rides with him: the look (characters.js LOOKS),
//                                    a seat index or a stand spot, the rig's anim ('sit', 'idle', …), where they look
//                                    ({x,y,z} local, or 'hero')
//     hero         { x, z, a, lookAt }  Twinsen's spot (by a window) and what he looks at (local)
//     shots        [{ pos:[x,y,z], look:[x,y,z], fov }]  camera framings (local), the film's first and second angle
//     update(dt, t)  animates what the windows show (the stars drift past) and the engine's glow
//     dispose()    frees what the cabin made (its merged geometry, the window view's texture and materials); the
//                  props' shared geometries and materials stay with the game's caches
//   view: { planet: '#rrggbb' } the colour of the planet whose limb shows low in the windows
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, torus, lathe, sphere } from './props.js';

const W = 6.2, L = 6.2, H = 2.4, ROOF = 0.55;   // inner width, length, wall height; the shell's rise over the walls

// the window view: a starry sky drifting past with a planet's limb below (one canvas, scrolled)
function viewTexture(planet) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#05081a'); sky.addColorStop(0.7, '#101a3e'); sky.addColorStop(1, '#1e2f5e');
  x.fillStyle = sky; x.fillRect(0, 0, 512, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 220; i++) { const b = 150 + r() * 105 | 0; x.fillStyle = `rgb(${b},${b},${Math.min(255, b + 30)})`; const z = r() < 0.08 ? 2 : 1; x.fillRect(r() * 512, r() * 200, z, z); }
  const pc = new THREE.Color(planet);
  const g2 = x.createRadialGradient(256, 900, 600, 256, 900, 700);
  g2.addColorStop(0, '#' + pc.clone().multiplyScalar(0.55).getHexString()); g2.addColorStop(0.93, '#' + pc.getHexString()); g2.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g2; x.beginPath(); x.arc(256, 900, 700, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(220,240,255,0.55)'; x.lineWidth = 3; x.beginPath(); x.arc(256, 900, 698, Math.PI * 1.3, Math.PI * 1.7); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function buildShipCabin({ view = { planet: '#4f8fd6' } } = {}) {
  const group = new THREE.Group(); group.name = 'shipCabin';
  const k = new Kit(group), own = [];
  // (lit by its own materials: a warm glow of their own, no lamp object — a new light would recompile every material)
  const cream = MAT.flat('#f4d890', 0.8, { emissive: '#8a6a34' }), shell = MAT.flat('#f8e4a8', 0.85, { emissive: '#94783e' });
  const red = MAT.flat('#b8261e', 0.55, { emissive: '#4a0e0a' }), redDark = MAT.flat('#7a1410', 0.6, { emissive: '#1a0404' });
  const blue = MAT.flat('#2a5a7a', 0.45, { emissive: '#12283a' }), teal = MAT.paint('#2f6f74', 0.45), brass = MAT.brass();
  const grille = MAT.flat('#7c8088', 0.6, { emissive: '#14161a' }), dark = MAT.paint('#2a2e36', 0.6);
  const glowW = MAT.glow('#fff2c0', '#ffc860', 1.4), glass = MAT.glass('#9fe0ff', 0.32);
  const x0 = -W / 2, x1 = W / 2, z0 = -L / 2, z1 = L / 2;
  // the grille deck with a darker border; the walls: cream with a brass band and a red skirting
  k.add(rbox(W + 0.3, 0.1, L + 0.3, 0.02), dark, 0, -0.05, 0);
  k.add(rbox(W - 0.6, 0.012, L - 0.6, 0.004), grille, 0, 0.006, 0);
  for (const sx of [-1, 1]) {
    k.add(rbox(0.14, H, L + 0.28, 0.03), cream, sx * (W / 2 + 0.07), H / 2, 0);
    k.add(rbox(0.05, 0.08, L, 0.02), brass, sx * (W / 2 - 0.02), 1.0, 0);
    k.add(rbox(0.05, 0.3, L, 0.02), redDark, sx * (W / 2 - 0.02), 0.15, 0);
  }
  for (const sz of [-1, 1]) {
    k.add(rbox(W + 0.28, H, 0.14, 0.03), cream, 0, H / 2, sz * (L / 2 + 0.07));
    k.add(rbox(W, 0.08, 0.05, 0.02), brass, 0, 1.0, sz * (L / 2 - 0.02));
    k.add(rbox(W, 0.3, 0.05, 0.02), redDark, 0, 0.15, sz * (L / 2 - 0.02));
  }
  // the low shell over the cabin: four sloping panels to a flat crown with a ring of light
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const len = Math.hypot(ROOF, W / 2 - 1.2) + 0.1, ang = Math.atan2(ROOF, W / 2 - 1.2);
    if (sx) k.add(rbox(len, 0.08, L + 0.2, 0.02), shell, sx * (W / 2 + 1.2) / 2, H + ROOF / 2, 0, 0, { rz: -sx * ang });
    else k.add(rbox(W + 0.2, 0.08, len, 0.02), shell, 0, H + ROOF / 2, sz * (L / 2 + 1.2) / 2, 0, { rx: sz * ang });
  }
  k.add(rbox(2.5, 0.06, 2.5, 0.03), shell, 0, H + ROOF, 0);
  k.add(new THREE.TorusGeometry(0.9, 0.05, 6, 28).rotateX(Math.PI / 2), glowW, 0, H + ROOF - 0.04, 0);

  // --- the deep red U of padded seats at the back, facing the nose: three across, two down each side
  const seats = [];
  const seatAt = (x, z, a) => {
    k.at(x, 0, z, a, () => {
      k.add(rbox(0.7, 0.42, 0.62, 0.12), red, 0, 0.21, 0.02);
      k.add(rbox(0.7, 0.62, 0.22, 0.1), red, 0, 0.72, -0.28, 0, { rx: -0.1 });
      for (let i = 0; i < 3; i++) k.add(rbox(0.62, 0.02, 0.012, 0.004), redDark, 0, 0.55 + i * 0.16, -0.17, 0, { rx: -0.1 });
    });
    seats.push({ x, y: 0, z, a });
  };
  for (const x of [-0.75, 0, 0.75]) seatAt(x, z0 + 0.62, 0);
  for (const [sx, a] of [[-1, Math.PI / 2], [1, -Math.PI / 2]]) for (const z of [z0 + 1.45, z0 + 2.2]) seatAt(sx * (W / 2 - 0.62), z, a);
  // the U's blue base and its corners
  k.add(rbox(2.6, 0.12, 0.9, 0.04), blue, 0, 0.06, z0 + 0.55);
  for (const sx of [-1, 1]) { k.add(rbox(0.9, 0.12, 2.3, 0.04), blue, sx * (W / 2 - 0.55), 0.06, z0 + 1.5); k.at(sx * (W / 2 - 0.62), 0, z0 + 0.62, 0, () => { k.add(rbox(0.7, 0.42, 0.7, 0.12), red, 0, 0.21, 0); k.add(rbox(0.7, 0.62, 0.22, 0.1), red, 0, 0.72, -0.28, 0, { rx: -0.1 }); }); }

  // --- the pilots' pods in the nose corners: rounded blue consoles under glass domes, a red light on each
  for (const sx of [-1, 1]) {
    const px = sx * (W / 2 - 0.85), pz = z1 - 0.85;
    k.add(cyl(0.55, 0.6, 0.95, 18), blue, px, 0.475, pz);
    k.add(new THREE.SphereGeometry(0.52, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass, px, 0.95, pz);
    k.add(torus(0.55, 0.05, 6, 22), brass, px, 0.96, pz, 0, { rx: Math.PI / 2 });
    k.add(sphere(0.07, 10, 8), MAT.glow('#ff5a3a', '#ff2a10', 1.6), px - sx * 0.42, 0.8, pz - 0.3);
    k.add(rbox(0.5, 0.06, 0.3, 0.02), MAT.glow('#9fe0ff', '#5fc0e8', 0.9), px, 0.98, pz + 0.1, 0, { rx: -0.5 });
  }
  // --- the engine's glass column in the middle behind a teal railing, glowing from below
  const EZ = 0.55;
  k.add(cyl(0.75, 0.8, 0.12, 24), dark, 0, 0.06, EZ);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, H + ROOF - 0.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  core.position.set(0, (H + ROOF) / 2, EZ); group.add(core); own.push(core.geometry, core.material);
  const glowCol = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, H + ROOF - 0.3, 12), new THREE.MeshBasicMaterial({ color: '#bff4ff' }));
  glowCol.position.copy(core.position); group.add(glowCol); own.push(glowCol.geometry, glowCol.material);
  for (const y of [0.55, 1.0]) k.add(torus(1.05, 0.03, 6, 32), teal, 0, y, EZ, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.add(cyl(0.03, 0.03, 1.0, 6), teal, Math.cos(a) * 1.05, 0.5, EZ + Math.sin(a) * 1.05); }

  // --- the hatch in the left wall at the back: a dark round-topped door, its yellow-and-black sill, a timetable card
  const HZ = -0.35;
  k.add(rbox(0.08, 1.9, 1.0, 0.04), dark, x0 + 0.03, 0.95, HZ);
  k.add(new THREE.CircleGeometry(0.5, 16, 0, Math.PI), dark, x0 + 0.08, 1.9, HZ, Math.PI / 2);
  for (let i = 0; i < 6; i++) k.add(rbox(0.3, 0.02, 0.17, 0.004), MAT.paint(i % 2 ? '#1a1a1e' : '#e8c040', 0.5), x0 + 0.2, 0.012, HZ - 0.42 + i * 0.17);
  k.add(rbox(0.02, 0.32, 0.24, 0.005), MAT.paint('#f2ead6', 0.7), x0 + 0.02, 1.35, HZ + 0.75);

  // --- the oval windows: two in each side wall, two in the nose, a brass rim and the view behind glass. The views are
  // one mesh: an oval per window in one geometry, each showing another part of the sky (its u shifted)
  const windows = [], WY = 1.55, RX = 0.5, RY = 0.3, SEG = 24;
  const vt = viewTexture(view.planet); own.push(vt);
  const vm = new THREE.MeshBasicMaterial({ map: vt, fog: false, toneMapped: false, side: THREE.DoubleSide }); own.push(vm);
  const P = [], UV = [], I = [];
  const oval = (cx, cz, nx, nz, i) => {   // (nx, nz: the wall's inward normal)
    const tx = -nz, tz = nx, base = P.length / 3, u0 = i * 0.16;
    k.add(torus(1, 0.05, 6, 28), brass, cx + nx * 0.01, WY, cz + nz * 0.01, Math.atan2(nx, nz), { sx: RX + 0.03, sy: RY + 0.03 });
    P.push(cx - nx * 0.005, WY, cz - nz * 0.005); UV.push(u0 + 0.16, 0.5);
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a);
      P.push(cx - nx * 0.005 + tx * c * RX, WY + s2 * RY, cz - nz * 0.005 + tz * c * RX); UV.push(u0 + 0.16 + c * 0.16, 0.5 + s2 * 0.42);
      if (j) I.push(base, base + j, base + j + 1);
    }
    windows.push({ x: cx + nx * 0.05, y: WY, z: cz + nz * 0.05, a: Math.atan2(-nx, -nz), r: RY });
  };
  let n = 0;
  for (const z of [z0 + 1.9, z1 - 2.0]) oval(x0 + 0.01, z, 1, 0, n++);   // left wall (looking out: −x)
  for (const z of [z0 + 1.9, z1 - 2.0]) oval(x1 - 0.01, z, -1, 0, n++);  // right wall
  for (const x of [-1.15, 1.15]) oval(x, z1 - 0.01, 0, -1, n++);          // the nose
  const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); vg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); vg.setIndex(I);
  vg.computeBoundingSphere(); own.push(vg);
  const views = new THREE.Mesh(vg, vm); views.name = 'cabinViews'; group.add(views);
  // lamps: a sconce between the windows on each side
  for (const sx of [-1, 1]) k.add(rbox(0.06, 0.16, 0.12, 0.02), glowW, sx * (W / 2 - 0.03), 1.95, 0.0);
  k.flush();
  // (nothing casts or takes the sun's shadow in here: the cabin floats above the world)
  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (o.parent === group && o !== views && o !== core && o !== glowCol) own.push(o.geometry); } });

  // Twinsen at the front-left window (index 1), looking out; a dozing traveller at the back, a woman at the right
  // front window seat looking out, the Mosquibee steward between the pilots' pods
  const stand = [{ x: x0 + 0.75, z: z1 - 2.0, a: -Math.PI / 2, window: 1 }];
  const hero = { x: stand[0].x, z: stand[0].z, a: stand[0].a, lookAt: { x: windows[1].x - 3, y: WY - 0.3, z: windows[1].z + 0.4 } };
  const passengers = [
    { role: 'traveller', look: 'farmerA', seat: 1, anim: 'sit' },                                                       // dozing, the back row's middle
    { role: 'traveller', look: 'lharWoman', seat: 6, anim: 'sit', lookAt: { x: windows[3].x + 1, y: WY, z: windows[3].z } },   // the right side's front seat, looking out
    { role: 'crew', look: 'zbee1', stand: { x: 0.0, z: z1 - 0.9, a: Math.PI - 0.5 }, anim: 'idle', lookAt: 'hero' },     // the steward between the pods
  ];
  const shots = [
    { pos: [2.1, 2.05, -2.4], look: [-1.6, 1.25, 1.2], fov: 54 },     // from the back right, past the engine column to Twinsen at the window
    { pos: [-1.0, 1.85, -0.6], look: [-2.4, 1.6, 1.3], fov: 46 },     // along the left wall: Twinsen at the window, looking out
  ];
  let scroll = 0, tt = 0;
  return {
    group, size: { w: W, l: L, h: H + ROOF }, seats, windows, stand, passengers, hero, shots,
    update(dt) { scroll += dt * 0.035; vt.offset.x = scroll; tt += dt; glowCol.material.color.setHSL(0.53, 0.8, 0.78 + Math.sin(tt * 3) * 0.06); },
    dispose() { group.parent?.remove(group); for (const o of own) o.dispose?.(); own.length = 0; },
  };
}
