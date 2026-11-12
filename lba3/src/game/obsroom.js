// The observatory on the Hamalayi peak (chapter 7), inside: a round stone hall under the dome, an old brass
// telescope, and Sendell's shrine — a crystal in a niche that once caught the light of both suns. A beam of
// sunlight falls through a slit in the wall; four floor mirrors on turntables can each be set one of two ways
// ('/' or '\'). Three of them, set right, carry the beam to the crystal. CHAPTER-BALANCE (7.11.2026): the crystal
// drank the light of both suns. The second sun's slit, in the back wall, has been frozen over for years: the magic ball
// breaks the ice (a ball target), and the fourth mirror, set right, carries that beam to the crystal from the side.
// One beam only makes it glow faintly. Built with the interiors' RoomBuilder at x = 4600.
//
// CONTRACT for src/game/story/observatory.js (world x/z):
//   R.mirrors [{i, x, z, type: 'A'|'B', setType(t)}]; R.trace() → {lit: both beams, n: beams on the crystal, path, path2}
//   redraws both beams; R.ice {x,y,z, broken, setBroken(b), onBreak} the frozen slit (its ball target in R.ballTargets,
//   {ice:true}); the second beam enters only once it is broken
//   R.crystal {x,z, setLit(b)}; R.telescope {x,z}; R.npcSpots {keeper}; exit 'obs-out'
import * as THREE from 'three';
import { RoomBuilder, glowSprite } from './interiors.js';
import { MAT, rbox, plane, cyl, sphere, torus, lathe, canvasTex } from './props.js';
import { mergeStatic } from '../engine/merge.js';
import { touch } from './story/reach.js';

// grid (local): the beam enters at (-5.5, -2) heading +x
const START = { x: -5.5, z: -2, dx: 1, dz: 0 };
// (the fourth mirror stood at (2, -5) as a decoy that no beam could reach; it now carries the second sun's beam)
const MIRRORS = [{ x: -2, z: -2, want: 'B', start: 'A' }, { x: -2, z: 2, want: 'B', start: 'A' }, { x: 2, z: 2, want: 'A', start: 'B' }, { x: 5, z: -2, want: 'A', start: 'B' }];
// the second sun: through the slit in the back wall, heading +z down to the fourth mirror
const START2 = { x: 5, z: -5.5, dx: 0, dz: 1 };
const CRYSTAL = { x: 2, z: -2 + 0.0 };   // reached going -z from the third mirror
const BOUNDS = 5.6;

export function buildObsRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'obsv', 4600, 0);
  const R = B.room, k = B.k;
  const W = 13, D = 13, H = 6.5;
  R.view = 15; R.follow = 0.25; R.music = 'well';
  B.shell({
    W, D, H, t: 0.5, floor: MAT.tiles('#d8d0c4', '#9aa0b4', '#7a7468', true, 4), slab: MAT.stone('grey'), body: MAT.stone('sand', 2), low: MAT.stone('slate', 1),
    rail: MAT.brass(), cap: MAT.stone('grey'), dado: 1.0, rimH: 0.5,
    left: [{ at: 4.5, w: 1.8, h: 2.8, y0: 0, kind: 'door', leaf: MAT.wood('dark') }],
  });
  R.exits.push({ x: B.cx - W / 2 + 0.5, z: B.cz + 4.5, r: 0.8, to: 'obs-out' });
  R.spawn = { x: B.cx - W / 2 + 2.0, z: B.cz + 4.5, a: Math.PI / 2 };
  // star chart on the back wall, a bookcase, a desk with papers
  k.add(plane(4, 2.4), MAT.map(canvasTex(512, 300, (x, Wd, Hd) => {
    x.fillStyle = '#1a2040'; x.fillRect(0, 0, Wd, Hd);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,${200 + Math.random() * 55},${0.4 + Math.random() * 0.6})`; x.fillRect(Math.random() * Wd, Math.random() * Hd, 2, 2); }
    x.strokeStyle = '#e8c860'; x.lineWidth = 2; for (const [cx, cy] of [[140, 120], [370, 170]]) { x.beginPath(); x.arc(cx, cy, 30, 0, 7); x.stroke(); }
    x.fillStyle = '#e8c860'; x.font = '20px serif'; x.fillText('the two suns, the long night that never comes', 40, 280);
  })), 0, 3.4, -D / 2 + 0.02);
  // the telescope on a brass mount
  k.add(cyl(0.5, 0.7, 1.0, 16), MAT.stone('slate'), 4.0, 0.5, 4.0);
  B.ccol(4.0, 4.0, 0.8, 1.2);
  // CAMPAIGN-5 (story/passline.js): the tube on a yoke that turns (azimuth) and tips (elevation); a bearing ring round the
  // mount's top, read from above, with a pointer that turns with the yoke; the setting lever on the mount's west side
  // (four notches: 1 the stars, 2 the suns, 3 the glacier, 4 the snow: it follows the snow fields when they shake)
  const TX = 4.0, TZ = 4.0;
  const yaw = new THREE.Group(); yaw.position.set(TX, 1.0, TZ); B.group.add(yaw);
  { const yk = new THREE.Group(); yaw.add(yk);
    const y1 = new THREE.Mesh(cyl(0.12, 0.16, 0.5, 10), MAT.brass()); y1.position.y = 0.25; yk.add(y1);
    const pt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 4).rotateX(Math.PI / 2), MAT.brass()); pt.position.set(0, 0.03, 0.66); yk.add(pt);
    mergeStatic(yk, { recolor: true }); }
  const pitch = new THREE.Group(); pitch.position.y = 0.55; yaw.add(pitch);
  { const tb = new THREE.Mesh(cyl(0.2, 0.28, 2.6, 16), MAT.brass()); tb.rotation.x = Math.PI / 2; tb.position.z = 0.7; tb.castShadow = true; pitch.add(tb); }
  const ringTex = canvasTex(512, 512, (x, Wd, Hd) => {
    const c = Wd / 2; x.clearRect(0, 0, Wd, Hd);
    x.fillStyle = '#c8a050'; x.beginPath(); x.arc(c, c, 254, 0, 7); x.arc(c, c, 150, 0, 7, true); x.fill();
    x.strokeStyle = '#6a4a20'; x.lineWidth = 3; for (const r of [252, 152]) { x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke(); }
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; x.beginPath(); x.moveTo(c + Math.sin(a) * 236, c - Math.cos(a) * 236); x.lineTo(c + Math.sin(a) * (i % 4 ? 246 : 226), c - Math.cos(a) * (i % 4 ? 246 : 226)); x.stroke(); }
    // the names round it (north, the room's −z, at the top of the texture), each where it lies from the peak
    x.fillStyle = '#3a2410'; x.font = 'bold 26px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const [deg, name, r, px] of [[0, 'PEAK', 200, 26], [62, 'MONASTERY', 200, 22], [250, 'GLACIER', 200, 24], [205, 'LHAR', 200, 24], [150, 'CITADEL', 222, 22], [150, 'DESERT ISLE', 178, 16]]) {
      const a = (deg * Math.PI) / 180;
      x.save(); x.translate(c + Math.sin(a) * r, c - Math.cos(a) * r); x.rotate(a); x.font = `bold ${px}px serif`; x.fillText(name, 0, 0); x.restore();
    }
  });
  ringTex.wrapS = ringTex.wrapT = THREE.ClampToEdgeWrapping;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.9, 40), new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, alphaTest: 0.4, roughness: 0.4, metalness: 0.5 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(TX, 1.005, TZ); ring.castShadow = false; B.group.add(ring);
  // (the ring's texture: the room's −z up; the RingGeometry's uv maps x → u, y → v: laid flat, +v is −z)
  // the setting lever: a brass arm off a boss on the mount's west side, turning in the x–y plane through four notches
  const LV = { x: TX - 0.5, y: 0.92, z: TZ };
  k.add(cyl(0.08, 0.08, 0.1, 10), MAT.brass(), LV.x - 0.02, LV.y, LV.z, 0, { rz: Math.PI / 2 });
  k.add(plane(0.34, 0.12), MAT.map(canvasTex(256, 96, (x) => { x.fillStyle = '#e8d8b0'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#3a2410'; x.font = 'bold 30px serif'; x.textAlign = 'center'; x.fillText('1  2  3  4', 128, 44); x.font = '18px serif'; x.fillText('STARS SUNS ICE SNOW', 128, 80); })), TX - 0.575, LV.y - 0.2, LV.z, -Math.PI / 2);
  const lever = new THREE.Group(); lever.position.set(LV.x - 0.06, LV.y, LV.z); B.group.add(lever);
  { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.035), MAT.brass()); arm.position.y = 0.18; lever.add(arm);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), MAT.brass()); kn.position.y = 0.36; lever.add(kn);
    mergeStatic(lever, { recolor: true }); }
  // (about z: the arm leans out west (−x) from straight up; setting 1 the most upright, 4 the most out)
  const NOTCH = { 1: 0.35, 2: 0.62, 3: 0.89, 4: 1.16 };
  // (its bearing on the ring: clockwise from the room's −z; the yoke's az = π − bearing)
  const POSE = { stars: { az: Math.PI, el: 0.87 }, down: { az: Math.PI - (150 * Math.PI) / 180, el: -0.22 }, glacier: { az: Math.PI - (250 * Math.PI) / 180, el: 0.2 } };
  const ease = { from: null, to: null, t: 1 };
  R.telescope = {
    x: B.cx + TX, z: B.cz + TZ, n: 1,
    ring: { x: B.cx + TX - 1.15, z: B.cz + TZ + 0.2 },
    setting(n) { this.n = n; lever.rotation.z = NOTCH[n] || NOTCH[1]; },
    // the knob where it is now, in the hand of a man facing the mount's west side (+x): a 'tinker' reach
    lever: { touch() { const a = lever.rotation.z, kx = lever.position.x - Math.sin(a) * 0.36, kz = lever.position.z; return touch(B.cx + kx, B.cz + kz, Math.PI / 2, 'tinker'); } },
    pose(name) { const p = POSE[name] || POSE.stars; yaw.rotation.y = p.az; pitch.rotation.x = -p.el; ease.t = 1; this.at = { ...p }; },
    // a jerk on the way from the stars to its bearing (k: how far along, 0..1): a step, overshooting, settling
    jerk(k) { const a = POSE.stars, b = POSE.down, s = Math.min(1, k); ease.from = { az: yaw.rotation.y, el: -pitch.rotation.x }; ease.to = { az: a.az + (b.az - a.az + (b.az - a.az > Math.PI ? -2 * Math.PI : b.az - a.az < -Math.PI ? 2 * Math.PI : 0)) * s, el: a.el + (b.el - a.el) * s }; ease.t = 0; },
  };
  R.telescope.setting(1); R.telescope.pose('stars');
  R.updaters.push((dt) => {
    if (ease.t >= 1) return;
    ease.t = Math.min(1, ease.t + dt / 0.35);
    const u = ease.t, o = 1 + Math.sin(u * Math.PI) * 0.25 * (1 - u);   // (a jerk: a quick step that overshoots a little)
    yaw.rotation.y = ease.from.az + (ease.to.az - ease.from.az) * Math.min(1.1, u * o);
    pitch.rotation.x = -(ease.from.el + (ease.to.el - ease.from.el) * Math.min(1.1, u * o));
  });
  // the shrine: a niche in the back wall with Sendell's crystal on a plinth
  const crystalM = new THREE.MeshStandardMaterial({ color: '#bfefff', emissive: '#6ad0ff', emissiveIntensity: 0.15, roughness: 0.1, transparent: true, opacity: 0.9, flatShading: true });
  k.add(cyl(0.45, 0.55, 1.0, 10), MAT.stone('lav'), CRYSTAL.x, 0.5, CRYSTAL.z - 0.6);
  const cr = k.mesh(new THREE.OctahedronGeometry(0.35, 0).scale(1, 1.8, 1), crystalM, CRYSTAL.x, 1.55, CRYSTAL.z - 0.6);
  const halo = glowSprite('#9fe8ff', 2.4, 0); halo.position.set(B.cx + CRYSTAL.x, 1.6, B.cz + CRYSTAL.z - 0.6); B.group.add(halo); halo.position.set(CRYSTAL.x, 1.6, CRYSTAL.z - 0.6);
  B.ccol(CRYSTAL.x, CRYSTAL.z - 0.6, 0.6, 1.2);
  R.crystal = {
    x: B.cx + CRYSTAL.x, z: B.cz + CRYSTAL.z, lit: false,
    setLit(b) { this.lit = !!b; crystalM.emissiveIntensity = b ? 2.4 : 0.15; halo.material.opacity = b ? 0.8 : 0; },
    // (one beam on it: a faint glow, until both suns light it)
    setFaint(b) { if (this.lit) return; crystalM.emissiveIntensity = b ? 0.7 : 0.15; halo.material.opacity = b ? 0.25 : 0; },
  };
  void cr;
  // the light slit in the left wall where the beam enters
  k.add(plane(0.3, 1.2), MAT.glow('#fff8e0', '#fff0c0', 2.5), -W / 2 + 0.03, 1.4, START.z, Math.PI / 2);
  // the second sun's slit in the back wall, frozen over: a plug of blue-white ice bulging out of it (the ball breaks it)
  const slit2 = new THREE.Mesh(plane(0.3, 1.2), new THREE.MeshStandardMaterial({ color: '#9fb4c8', emissive: '#fff0c0', emissiveIntensity: 0, roughness: 0.6 }));
  slit2.position.set(START2.x, 1.4, -D / 2 + 0.03); B.group.add(slit2);
  const iceM = new THREE.MeshStandardMaterial({ color: '#dff2ff', emissive: '#8fc8ff', emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.88, flatShading: true });
  const ice = new THREE.Group(); ice.position.set(START2.x, 1.4, -D / 2 + 0.12); B.group.add(ice);
  for (const [x, y, z, s] of [[0, 0, 0, 0.32], [0.05, 0.42, 0.03, 0.24], [-0.04, -0.4, 0.02, 0.26], [0.1, -0.12, 0.12, 0.18], [-0.12, 0.2, 0.1, 0.16]]) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), iceM); c.position.set(x, y, z); c.scale.set(1.1, 1.3, 0.7); c.castShadow = true; ice.add(c);
  }
  R.ice = {
    x: B.cx + START2.x, y: 1.4, z: B.cz - D / 2 + 0.35, broken: false, onBreak: null,
    setBroken(b) { this.broken = !!b; ice.visible = !b; slit2.material.color.set(b ? '#fff8e0' : '#9fb4c8'); slit2.material.emissiveIntensity = b ? 2.5 : 0; },
  };
  // (its ball target: the story's onBreak, observatory.js, breaks it; done once broken, or while no story wants it)
  R.ballTargets.push({ x: R.ice.x, y: R.ice.y, z: R.ice.z, r: 0.9, ice: true, get done() { return R.ice.broken || !R.ice.onBreak; }, onHit() { R.ice.onBreak?.(); } });
  // the floor mirrors: a brass turntable with a mirror panel on it
  const mirrors = [];
  for (const [i, m] of MIRRORS.entries()) {
    k.add(cyl(0.5, 0.55, 0.18, 18), MAT.brass(), m.x, 0.09, m.z);
    const g = new THREE.Group(); g.position.set(m.x, 0.18, m.z); B.group.add(g);
    const frame = new THREE.Mesh(rbox(1.0, 1.1, 0.08, 0.02), MAT.brass()); frame.position.y = 0.6; frame.castShadow = true; g.add(frame);
    const glass = new THREE.Mesh(plane(0.86, 0.96), new THREE.MeshStandardMaterial({ color: '#dff4ff', metalness: 0.9, roughness: 0.05, side: THREE.DoubleSide })); glass.position.set(0, 0.6, 0.045); g.add(glass);
    B.ccol(m.x, m.z, 0.5, 1.2, { noStand: true });
    const M = { i, x: B.cx + m.x, z: B.cz + m.z, type: m.start, setType(t) { this.type = t; g.rotation.y = t === 'A' ? Math.PI / 4 : -Math.PI / 4; } };
    M.setType(m.start);
    mirrors.push(M);
  }
  R.mirrors = mirrors;
  // the beams: up to 6 glowing segments for the first sun's, 4 for the second's
  const beamM = new THREE.MeshBasicMaterial({ color: '#fff2c0', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const seg = () => { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.08), beamM); s.visible = false; B.group.add(s); return s; };
  const segs = Array.from({ length: 6 }, seg), segs2 = Array.from({ length: 4 }, seg);
  const draw = (list, path) => list.forEach((s, i) => {
    const a = path[i], b = path[i + 1];
    if (!a || !b) { s.visible = false; return; }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    s.visible = L > 0.01; s.scale.x = L; s.position.set((a[0] + b[0]) / 2, 1.0, (a[1] + b[1]) / 2); s.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  });
  // one beam from its slit: mirrors turn it, the crystal or a wall stops it (anyWay: the crystal takes it from any side;
  // the first sun's beam is taken only going along z, as it always was: it starts on the crystal's own row)
  const beam = (S, anyWay) => {
    let x = S.x, z = S.z, dx = S.dx, dz = S.dz;
    const path = [[x, z]]; let lit = false;
    for (let n = 0; n < 8; n++) {
      // walk until a mirror, the crystal, or the wall
      let hit = null, best = 1e9;
      for (const [i, m] of MIRRORS.entries()) {
        const t = dx ? (m.x - x) / dx : (m.z - z) / dz;
        if (t > 0.01 && Math.abs((dx ? z : x) - (dx ? m.z : m.x)) < 0.01 && t < best) { best = t; hit = { kind: 'mirror', i }; }
      }
      const tc = dx ? (CRYSTAL.x - x) / dx : (CRYSTAL.z - z) / dz;
      if (tc > 0.01 && Math.abs((dx ? z : x) - (dx ? CRYSTAL.z : CRYSTAL.x)) < 0.01 && tc < best && (anyWay || dz !== 0)) { best = tc; hit = { kind: 'crystal' }; }
      if (!hit) { const tw = dx ? (dx > 0 ? BOUNDS - x : -BOUNDS - x) / dx : (dz > 0 ? BOUNDS - z : -BOUNDS - z) / dz; x += dx * tw; z += dz * tw; path.push([x, z]); break; }
      x += dx * best; z += dz * best; path.push([x, z]);
      if (hit.kind === 'crystal') { lit = true; break; }
      const t = mirrors[hit.i].type;
      // 'A' = '/': +x→-z, -x→+z, +z→-x, -z→+x · 'B' = '\': +x→+z, -x→-z, +z→+x, -z→-x
      [dx, dz] = t === 'A' ? [-dz, -dx] : [dz, dx];
    }
    return { lit, path };
  };
  R.trace = () => {
    const a = beam(START, false), b = R.ice.broken ? beam(START2, true) : { lit: false, path: [] };
    draw(segs, a.path); draw(segs2, b.path);
    const n = (a.lit ? 1 : 0) + (b.lit ? 1 : 0);
    R.crystal.setFaint(n === 1);
    return { lit: n === 2, n, path: a.path, path2: b.path };
  };
  R.npcSpots = { keeper: { x: B.cx - 3.5, z: B.cz + 4.0, a: Math.PI * 0.75 } };
  B.light('#ffe8c0', 6, 12, -2, 5, 2); B.light('#c8d8ff', 4, 10, 3, 5, -3);
  const room = B.finish();
  R.trace();
  return { obsv: room };
}
void sphere; void torus; void lathe;
