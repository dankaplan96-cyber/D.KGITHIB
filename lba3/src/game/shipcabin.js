// The spaceship's cabin (TRAVEL-1): where Twinsen rides between Twinsun and Zeelich, seen for a few seconds in the
// flight film (src/game/travelfilm.js). A PLACEHOLDER room built by the cloud: a warm Esmer cabin (cream walls, a
// gold band, red seats on brass pedestals, round windows, luggage racks) in the colours of the ship outside. The
// laptop's World Art will deliver the proper room (and maybe a better ship) as a request with a diff: it replaces
// this file's body and keeps the handle below, so the story code (travelfilm.js) does not change.
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
//     update(dt, t)  animates what the windows show (the stars drift past)
//     dispose()    frees what the cabin made (its merged geometry, the window view's texture and materials); the
//                  props' shared geometries and materials stay with the game's caches
//   view: { planet: '#rrggbb' } the colour of the planet whose limb shows low in the windows
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, torus, lathe } from './props.js';

const W = 3.6, L = 7.6, H = 2.45, ROOF = 0.7;   // inner width, length, wall height; the vault's rise over the walls

// the window view: a starry sky drifting past with a planet's limb below (one canvas, scrolled)
function viewTexture(planet) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#05081a'); sky.addColorStop(0.7, '#101a3e'); sky.addColorStop(1, '#1e2f5e');
  x.fillStyle = sky; x.fillRect(0, 0, 512, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 220; i++) { const b = 150 + r() * 105 | 0; x.fillStyle = `rgb(${b},${b},${Math.min(255, b + 30)})`; const z = r() < 0.08 ? 2 : 1; x.fillRect(r() * 512, r() * 200, z, z); }
  // the planet's limb: a wide arc low in the frame, a thin bright rim
  const pc = new THREE.Color(planet);
  const g2 = x.createRadialGradient(256, 900, 600, 256, 900, 700);
  g2.addColorStop(0, '#' + pc.clone().multiplyScalar(0.55).getHexString()); g2.addColorStop(0.93, '#' + pc.getHexString()); g2.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g2; x.beginPath(); x.arc(256, 900, 700, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(220,240,255,0.55)'; x.lineWidth = 3; x.beginPath(); x.arc(256, 900, 698, Math.PI * 1.3, Math.PI * 1.7); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

// a passenger seat facing +z: a brass pedestal, a red cushion and back, a headrest, two arms
function seat(k) {
  const red = MAT.cloth('#b0322a', '#7c2020'), brass = MAT.brass(), cream = MAT.paint('#efe2c4', 0.6);
  k.add(cyl(0.07, 0.11, 0.3, 10), brass, 0, 0.15, 0);
  k.add(rbox(0.62, 0.06, 0.56, 0.02), cream, 0, 0.32, 0);
  k.add(rbox(0.56, 0.13, 0.52, 0.05), red, 0, 0.41, 0.02);
  k.add(rbox(0.58, 0.68, 0.12, 0.05), red, 0, 0.8, -0.27, 0, { rx: -0.14 });
  k.add(rbox(0.4, 0.18, 0.12, 0.05), cream, 0, 1.19, -0.33, 0, { rx: -0.14 });
  for (const sx of [-1, 1]) k.add(rbox(0.07, 0.07, 0.46, 0.025), brass, sx * 0.31, 0.6, 0.0);
}

export function buildShipCabin({ view = { planet: '#4f8fd6' } } = {}) {
  const group = new THREE.Group(); group.name = 'shipCabin';
  const k = new Kit(group), own = [];
  // (the cabin's own light is in its materials: a warm glow of their own over the sky light that reaches them, no lamp
  //  object — a new light would recompile every material in the game)
  const cream = MAT.flat('#f2e4c4', 0.85, { emissive: '#4a3a24' }), vault = MAT.flat('#f6ecd4', 0.9, { emissive: '#6a5638' });
  const gold = MAT.paint('#e0aa48', 0.4), red = MAT.paint('#b82a24', 0.5), carpet = MAT.cloth('#2a5a6a', '#1f4250');
  const brass = MAT.brass(), dark = MAT.paint('#3a2e2a', 0.6), glowM = MAT.glow('#fff2c0', '#ffc860', 1.6);
  const z0 = -L / 2, z1 = L / 2;
  // floor (a teal carpet runner on a dark deck), walls, the band, the vaulted roof in strips, the end walls
  k.add(rbox(W + 0.3, 0.1, L + 0.3, 0.02), dark, 0, -0.05, 0);
  k.add(rbox(1.1, 0.012, L - 0.4, 0.004), carpet, 0, 0.006, 0);
  for (const sx of [-1, 1]) {
    k.add(rbox(0.12, H, L + 0.2, 0.02), cream, sx * (W / 2 + 0.06), H / 2, 0);
    k.add(rbox(0.06, 0.12, L, 0.02), gold, sx * (W / 2 - 0.02), 1.05, 0);
    k.add(rbox(0.05, 0.32, L, 0.02), red, sx * (W / 2 - 0.02), 0.16, 0);
  }
  const N = 8;   // the vault: N strips from wall top to wall top (a flattened half-ellipse)
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI, a1 = ((i + 1) / N) * Math.PI, am = (a0 + a1) / 2;
    const p0 = [Math.cos(a0) * (W / 2 + 0.06), H + Math.sin(a0) * ROOF], p1 = [Math.cos(a1) * (W / 2 + 0.06), H + Math.sin(a1) * ROOF];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.02;
    k.add(rbox(len, 0.08, L + 0.2, 0.01), vault, (p0[0] + p1[0]) / 2 + Math.cos(am) * 0.04, (p0[1] + p1[1]) / 2 + Math.sin(am) * 0.04, 0, 0, { rz: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) });
  }
  // a lamp strip along the vault's crown, gold ribs across it
  k.add(rbox(0.22, 0.04, L - 0.8, 0.015), glowM, 0, H + ROOF - 0.02, 0);
  for (let z = z0 + 0.8; z <= z1 - 0.7; z += 1.3) k.add(torus(W / 2 + 0.02, 0.035, 4, 24, Math.PI), gold, 0, H, z, 0, { sy: ROOF / (W / 2) });
  for (const z of [z0 - 0.06, z1 + 0.06]) k.add(rbox(W + 0.3, H + ROOF + 0.1, 0.12, 0.02), cream, 0, (H + ROOF) / 2, z);
  // the front bulkhead: a door to the flight deck (red, brass trim), a little lit sign over it, a clock
  k.add(rbox(0.95, 2.2, 0.06, 0.02), red, 0, 1.1, z1 - 0.02);
  k.add(rbox(1.09, 0.08, 0.08, 0.02), brass, 0, 2.24, z1 - 0.03);
  for (const sx of [-1, 1]) k.add(rbox(0.07, 2.24, 0.08, 0.02), brass, sx * 0.51, 1.12, z1 - 0.03);
  k.add(rbox(0.5, 0.14, 0.04, 0.02), glowM, 0, 2.45, z1 - 0.04);
  k.add(lathe([[0.001, 0], [0.16, 0], [0.17, 0.03], [0.16, 0.05]], 20), brass, 1.1, 1.75, z1 - 0.02, 0, { rx: -Math.PI / 2 });
  // rows of seats facing the nose, two each side of the aisle; a window bay at the front left (x < 0)
  const seats = [], ROWS = [-2.6, -1.3, 0.0];
  for (const z of ROWS) for (const x of [-1.25, 1.25]) { k.at(x, 0, z, 0, () => seat(k)); seats.push({ x, y: 0, z, a: 0 }); }
  // luggage racks along both walls over the seats: a brass shelf and rail, cases on it
  const cases = ['#7a4a2a', '#2f6a8a', '#c8762f', '#5a7a3a'];
  for (const sx of [-1, 1]) {
    const rx = sx * (W / 2 - 0.28);
    k.add(rbox(0.5, 0.03, L - 2.6, 0.01), brass, rx, 2.2, -1.1);
    k.add(cyl(0.02, 0.02, L - 2.6, 6), brass, rx - sx * 0.24, 2.28, -1.1, 0, { rx: Math.PI / 2 });
    let n = 0;
    for (let z = z0 + 1.1; z < 1.0; z += 0.9 + (n % 3) * 0.12, n++) k.add(rbox(0.44, 0.22 + (n % 2) * 0.05, 0.62, 0.04), MAT.paint(cases[(n + (sx > 0 ? 1 : 0)) % cases.length], 0.6), rx, 2.21 + 0.12 + (n % 2) * 0.025, z);
  }
  // the windows: round, a brass rim, the view behind glass, four each side at eye height. The views are one mesh: a
  // disc per window in one geometry, each showing another part of the sky (its u shifted)
  const windows = [], WZ = [-2.0, -0.65, 0.7, 2.05], WY = 1.62, WR = 0.32, SEG = 24;
  const vt = viewTexture(view.planet); own.push(vt);
  const vm = new THREE.MeshBasicMaterial({ map: vt, fog: false, toneMapped: false, side: THREE.DoubleSide }); own.push(vm);
  const P = [], UV = [], I = [];
  for (const sx of [-1, 1]) WZ.forEach((z, i) => {
    const x = sx * (W / 2 - 0.01);
    k.add(torus(WR + 0.02, 0.045, 6, 24), brass, x, WY, z, sx * Math.PI / 2);
    const base = P.length / 3, u0 = i * 0.22 + (sx > 0 ? 0.5 : 0);
    P.push(x - sx * 0.005, WY, z); UV.push(u0 + 0.225, 0.5);
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a);
      P.push(x - sx * 0.005, WY + s2 * WR, z - sx * c * WR); UV.push(u0 + 0.225 + c * 0.225, 0.5 + s2 * 0.5);
      if (j) I.push(base, base + j, base + j + 1);
    }
    windows.push({ x: x - sx * 0.05, y: WY, z, a: sx < 0 ? -Math.PI / 2 : Math.PI / 2, r: WR });
  });
  const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); vg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); vg.setIndex(I);
  vg.computeBoundingSphere(); own.push(vg);
  const views = new THREE.Mesh(vg, vm); views.name = 'cabinViews'; group.add(views);
  // lamps: a sconce between the windows
  for (const sx of [-1, 1]) for (const z of [-1.32, 1.38]) k.add(rbox(0.06, 0.16, 0.1, 0.02), glowM, sx * (W / 2 - 0.03), 1.85, z);
  k.flush();
  // (nothing casts or takes the sun's shadow in here: the cabin floats above the world)
  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (o.parent === group && o !== views) own.push(o.geometry); } });

  const stand = [{ x: -1.15, z: 2.5, a: -2.2, window: 3 }];
  const hero = { x: stand[0].x, z: stand[0].z, a: stand[0].a, lookAt: { x: windows[3].x - 3, y: WY - 0.3, z: windows[3].z - 0.6 } };
  const passengers = [
    { role: 'traveller', look: 'farmerA', seat: 3, anim: 'sit' },                                      // dozing, middle row, the aisle's right
    { role: 'traveller', look: 'lharWoman', seat: 4, anim: 'sit', lookAt: { x: windows[2].x - 1, y: WY, z: windows[2].z + 0.3 } },   // front row, looking out
    { role: 'crew', look: 'zbee1', stand: { x: 0.45, z: 3.05, a: Math.PI - 0.6 }, anim: 'idle', lookAt: 'hero' },   // the steward by the flight-deck door
  ];
  const shots = [
    { pos: [1.0, 2.0, -3.4], look: [-0.7, 1.35, 1.8], fov: 52 },     // down the aisle to Twinsen at the window bay
    { pos: [-1.35, 1.9, 0.95], look: [-1.15, 1.72, 2.6], fov: 46 },   // along the wall: Twinsen at the window, looking out
  ];
  let scroll = 0;
  return {
    group, size: { w: W, l: L, h: H + ROOF }, seats, windows, stand, passengers, hero, shots,
    update(dt) { scroll += dt * 0.035; vt.offset.x = scroll; },
    dispose() { group.parent?.remove(group); for (const o of own) o.dispose?.(); own.length = 0; },
  };
}
