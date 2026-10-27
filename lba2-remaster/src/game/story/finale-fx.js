// Chapter 12's finale, on screen (story/chapter3.js drives it; the story's flags, calls and timing are all there).
//
//   the coil     a crackling ball of light well above Vesk's console, where the play camera sees it over the console and
//                over Vesk: a beam to the console, rings, a bright heart. Each hit flashes it, jolts it, shows one more
//                crack (a ray of light out of the core) and dims it: 100 % -> 72 % -> 46 %, flickering more.
//   the burst    (third hit) the coil goes out in a flash, a ring of light and a few flying shards; the console's own
//                light flares and dies down; sparks fall for a moment and a little smoke rises.
//   the console  swapped for a blown-out one the same moment: its screens dark, scorched panels, a torn plate, soot,
//                a few embers. It stays so (also after a load, see wreckNow).
//   Vesk         thrown against the rail on the console's platform's left side (away from the play camera's side) in the
//                rig's own "slump" knock-out pose (engine/rig.js KO_HUMAN.slump: the knees give and he sits down against
//                the rail), and stays there.
//
// Only what the game already has: Basic materials (additive or plain transparent, as the old coil's), the Kit's
// merged meshes with the props' shared materials, the shared Particles and the console's own lamp (the lamp pool
// copies it: no new light, no new shader). Everything it makes is removed or kept once (a pool of shards and puffs
// that end; one wreck).
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, disc } from '../props.js';

export const COIL_Y = 3.8;       // m (world): the coil's centre; the console's top is at 2.9
export const COIL_R = 1.15;      // the ball's hit radius (the coil is drawn ~0.9 m across)
const LEVEL = [1, 0.72, 0.46];   // the coil's glow after 0, 1, 2 hits
const KNOCK_T = 0.5;             // s: Vesk's flight to the rail
const SLUMP_T = 1.1;             // s: KO_HUMAN's settle time (the pose is still after it)

let GEO = null;
const geos = () => (GEO ||= {
  ico2: new THREE.IcosahedronGeometry(1, 2), ico1: new THREE.IcosahedronGeometry(1, 1),
  torus: new THREE.TorusGeometry(1, 0.03, 6, 36), shard: new THREE.OctahedronGeometry(1, 0),
  beam: new THREE.CylinderGeometry(1, 1, 1, 10, 1, true),
});
const glow = (color, opacity, extra) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, ...extra });
const smooth = (u) => u * u * (3 - 2 * u);
const rnd = (a, b) => a + Math.random() * (b - a);
const _z = new THREE.Vector3(0, 0, 1), _d = new THREE.Vector3();

export class FinaleFx {
  constructor(game, C) {
    this.g = game; this.C = C;
    this.t = 0; this.hits = 0; this.flash = 0;
    this.coil = null; this.pops = []; this.shards = []; this.puffs = []; this.knock = null; this.wreck = null;
    this.blast = null; this.idleT = 0;
    // the console's frame (engine: the platform's yaw is the NPC spot's facing, turned round)
    const sp = C.npcSpots?.vesk, A = (sp?.a ?? 0) - Math.PI;
    this.A = A; this.fx = Math.sin(A); this.fz = Math.cos(A);   // forward (toward the arena)
    this.rx = Math.cos(A); this.rz = -Math.sin(A);              // right
    C.updaters.push((dt) => this.update(dt));
  }
  get gp() { return this.C.group.position; }
  // a point in the console's frame (x right, y up from the deck, z toward the arena) in the world
  W(x, y, z) { const C = this.C; return [C.console.x + this.rx * x + this.fx * z, this.gp.y + 0.92 + y, C.console.z + this.rz * x + this.fz * z]; }
  // the console's own lamp (underground.js: cyan, 5 m): the one light the finale plays with
  lamp() {
    if (this.lampL !== undefined) return this.lampL;
    const C = this.C, v = new THREE.Vector3(), c = new THREE.Vector3(C.console.x, 0, C.console.z);
    let best = null, bd = 9;
    for (const l of C.lights || []) { l.getWorldPosition(v); const d = Math.hypot(v.x - c.x, v.z - c.z); if (d < bd && v.y > 1.5 && v.y < 4) { bd = d; best = l; } }
    this.lampL = best && bd < 1.2 ? best : null;
    if (this.lampL) this.lampBase = this.lampL.userData.base ?? 3;
    return this.lampL;
  }

  // ------------------------------------------------------------ the coil
  spawn(hits = 0) {
    if (this.coil) return this.coil;
    const C = this.C, gp = this.gp, G = geos(), mats = [];
    const mk = (c, o, x) => { const m = glow(c, o, x); mats.push(m); return m; };
    const grp = new THREE.Group(); grp.position.set(C.console.x - gp.x, COIL_Y - gp.y, C.console.z - gp.z); C.group.add(grp);
    const core = new THREE.Mesh(G.ico2, mk('#d8a0ff', 0.85)); core.scale.setScalar(0.62);
    const hot = new THREE.Mesh(G.ico1, mk('#ffffff', 0.9)); hot.scale.setScalar(0.34);
    const halo = new THREE.Mesh(G.ico1, mk('#8a40ff', 0.4, { wireframe: true })); halo.scale.setScalar(1.1);
    const aura = new THREE.Mesh(G.ico1, mk('#a070ff', 0.13)); aura.scale.setScalar(1.75);
    const r1 = new THREE.Mesh(G.torus, mk('#c890ff', 0.7)), r2 = new THREE.Mesh(G.torus, mk('#9fd8ff', 0.5));
    r1.scale.setScalar(0.95); r2.scale.setScalar(0.8);
    grp.add(aura, halo, core, hot, r1, r2);
    // the cracks: rays of light out of the core, one more each hit
    const crackM = mk('#fff0ff', 0.9), cracks = [];
    for (let n = 0; n < 3; n++) {
      const cg = new THREE.Group(); cg.visible = false;
      for (let k = 0; k < 3; k++) {
        const a = (n * 3 + k) * 2.4 + n, u = (k - 1) * 0.55 + (n - 1) * 0.3;
        _d.set(Math.cos(a) * Math.cos(u), Math.sin(u), Math.sin(a) * Math.cos(u)).normalize();
        const m = new THREE.Mesh(G.shard, crackM); m.position.copy(_d).multiplyScalar(0.76); m.quaternion.setFromUnitVectors(_z, _d); m.scale.set(0.055, 0.055, 0.6);
        cg.add(m);
      }
      grp.add(cg); cracks.push(cg);
    }
    // the beam to the console (it feeds the coil)
    const top = this.gp.y + 0.92 + 1.7, len = COIL_Y - top;
    const bm = mk('#b080ff', 0.34), beam = new THREE.Mesh(G.beam, bm);
    beam.scale.set(0.09, len, 0.09); beam.position.set(C.console.x - gp.x, top - gp.y + len / 2, C.console.z - gp.z); C.group.add(beam);
    this.coil = { grp, core, hot, halo, aura, r1, r2, cracks, crackM, beam, bm, mats };
    this.hits = hits;
    for (let i = 0; i < Math.min(3, hits); i++) cracks[i].visible = true;
    return this.coil;
  }
  // a hit on the coil (n = 1, 2): the flash, the jolt, one more crack, the dimmer glow
  hit(n) {
    const c = this.coil; this.hits = n;
    if (!c) return;
    this.flash = 1;
    if (c.cracks[n - 1]) c.cracks[n - 1].visible = true;
    const [x, y, z] = [this.C.console.x, COIL_Y, this.C.console.z];
    this.g.particles.burst(x, y, z, '#fff0ff', 14, 3.5);
  }
  removeCoil() {
    const c = this.coil; if (!c) return;
    this.coil = null;
    c.grp.parent?.remove(c.grp); c.beam.parent?.remove(c.beam);
    for (const m of c.mats) m.dispose();
  }

  // ------------------------------------------------------------ the burst, the blown-out console, Vesk
  burst() {
    const g = this.g, C = this.C, G = geos(), gp = this.gp;
    this.removeCoil();
    const cx = C.console.x, cz = C.console.z;
    // a flash and a ring of light at the coil
    const pop = (geo, color, o, s0, s1, dur, at, flat) => {
      const m = glow(color, o), mesh = new THREE.Mesh(geo, m);
      mesh.position.set(at[0] - gp.x, at[1] - gp.y, at[2] - gp.z); mesh.scale.setScalar(s0); if (flat) mesh.rotation.x = Math.PI / 2;
      C.group.add(mesh); this.pops.push({ mesh, m, o, s0, s1, t: 0, dur });
    };
    pop(G.ico1, '#fff4ff', 0.9, 0.5, 2.8, 0.34, [cx, COIL_Y, cz]);
    pop(G.torus, '#d8a0ff', 0.9, 0.5, 4.2, 0.55, [cx, COIL_Y, cz], true);
    // the console blows: a flash on it (and its lamp), sparks, smoke
    pop(G.ico1, '#ffd890', 0.8, 0.6, 2.0, 0.42, this.W(0, 1.2, 0));
    // shards of the coil fly out and fall
    for (let i = 0; i < 12; i++) {
      const m = glow(i % 3 ? '#e0b8ff' : '#ffffff', 0.95), mesh = new THREE.Mesh(G.shard, m), s = rnd(0.05, 0.12);
      mesh.scale.set(s * 0.6, s * 0.6, s * 1.8); mesh.position.set(cx - gp.x, COIL_Y - gp.y, cz - gp.z); C.group.add(mesh);
      const a = Math.random() * Math.PI * 2, v = rnd(2.2, 5.5);
      this.shards.push({ mesh, m, vx: Math.cos(a) * v, vy: rnd(0.5, 4.5), vz: Math.sin(a) * v, sx: rnd(-9, 9), sy: rnd(-9, 9), life: rnd(0.7, 1.1), t: 0 });
    }
    g.particles.burst(cx, COIL_Y, cz, '#e0b8ff', 34, 6);
    this.blast = { t: 0, spark: 0, smoke: 0 };
    this.makeWreck();
    this.lampMode = 'blast'; this.lampT = 0;
  }
  // the console as the blast leaves it (nothing moves; it is made once, merged into three meshes)
  makeWreck() {
    if (this.wreck) return;
    const C = this.C, gp = this.gp;
    const W = new THREE.Group(); W.position.set(C.console.x - gp.x, 0.92, C.console.z - gp.z); W.rotation.y = this.A; C.group.add(W);
    const k = new Kit(W), char = MAT.paint('#1c1512', 0.95), char2 = MAT.paint('#2b211b', 0.9), glass = MAT.paint('#0a0e11', 0.25);
    const soot = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.46, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const ember = glow('#ff7a28', 0.8);
    // the three screens, dead (the middle one hangs a little crooked)
    [-0.667, 0, 0.667].forEach((x, i) => k.add(rbox(0.56, 0.37, 0.03, 0.012), glass, x, 1.3, -0.135, 0, { rz: i === 1 ? 0.1 : 0 }));
    // the desk's slope: scorched patches (the buttons and the levers still stand around them)
    k.add(rbox(0.95, 0.025, 0.36, 0.01), char, -0.3, 0.985, 0.07, 0.1, { rx: 0.42 });
    k.add(rbox(0.6, 0.025, 0.26, 0.01), char2, 0.62, 1.0, 0.0, -0.3, { rx: 0.42 });
    // the riser's top torn open: a bent plate and jagged stubs
    k.add(rbox(2.26, 0.46, 0.27, 0.02), char, 0, 1.46, -0.295, 0, { rz: 0.03 });             // (the riser's upper half, burnt black over its brass)
    k.add(rbox(0.9, 0.05, 0.34, 0.01), char2, -0.6, 1.78, -0.28, 0, { rx: 0.35, rz: 0.2 });   // (a bent plate)
    k.add(rbox(0.6, 0.05, 0.26, 0.01), char, 0.6, 1.72, -0.3, 0, { rx: -0.3, rz: -0.18 });
    for (const [x, h, tz] of [[0.25, 0.42, 0.25], [-0.15, 0.5, -0.2], [0.95, 0.34, -0.35]]) k.add(cyl(0.004, 0.055, h, 5), char, x, 1.66 + h / 2, -0.3, 0, { rz: tz });
    // soot: the back, the right end, the top and the deck in front (stacked discs of different size, no texture)
    for (const [r, o] of [[1, 1], [0.66, 1.1]]) {
      k.add(disc(r * 0.95, 20), soot, 0.2, 1.0, -0.452, Math.PI, { sy: 0.8 * o });
      k.add(disc(r * 0.6, 20), soot, 1.14, 0.95, -0.05, Math.PI / 2, { sy: 1.2 });
      k.add(disc(r * 1.1, 20), soot, 0.0, 0.02, 0.35, 0, { rx: -Math.PI / 2, sy: 1.4 });
    }
    k.add(disc(0.85, 20), soot, 0.2, 1.665, -0.28, 0, { rx: -Math.PI / 2, sy: 0.4 });
    // a few embers in the scorch
    for (const [x, y, z] of [[-0.45, 1.0, 0.12], [-0.1, 1.0, 0.04], [0.6, 1.01, 0.0]]) k.add(disc(0.03, 8), ember, x, y + 0.012, z, 0, { rx: -Math.PI / 2 + 0.42 });
    k.flush();
    for (const m of W.children) { m.castShadow = false; if (m.material === ember) m.userData.ember = true; }
    this.wreck = { W, ember };
  }
  // a load into a finished chapter: the console as it was left
  wreckNow() { this.makeWreck(); this.wreck.ember.opacity = 0.3; this.lampMode = 'dead'; this.lampT = 9; }
  // Vesk: from where he stood to the rail (left side of the platform), seated against it
  throwVesk(vesk) {
    if (!vesk?.rig) return;
    const y0 = vesk.pos.y;
    const to = this.W(-1.5, 0, 1.4);   // (the console's frame: the platform's middle is 0.9 in front of it; its rail is at x = -1.8)
    const yaw = Math.atan2(this.rx + this.fx * 0.3, this.rz + this.fz * 0.3);   // sitting, facing the platform's middle (a little toward the arena)
    vesk.controlled = true; vesk.talking = false;
    vesk.rig.ko = { t: 0, dir: 1, mode: 'slump', side: 1 };
    this.knock = { vesk, t: 0, x0: vesk.pos.x, z0: vesk.pos.z, y0, x1: to[0], z1: to[2], a0: vesk.angle, a1: yaw, landed: false };
  }
  release() { if (this.knock) { this.knock.vesk.controlled = false; } this.knock = null; }

  // ------------------------------------------------------------ every frame (room updater: dialogues and cutscenes too)
  update(dt) {
    if (!(dt > 0)) return;
    const g = this.g, t = (this.t += dt);
    this.flash = Math.max(0, this.flash - dt * 4.5);
    const c = this.coil, lamp = this.lamp();
    if (c) {
      const lv = LEVEL[Math.min(2, this.hits)] ?? 1, f = this.flash;
      const sput = this.hits >= 2 && Math.random() < 0.1 ? 0.35 : 1;
      c.grp.rotation.y = t * 1.3; c.halo.rotation.x = t * 0.7; c.r1.rotation.set(t * 1.1, 0.4, 0); c.r2.rotation.set(0.3, t * 1.6, t * 0.5);
      const jolt = f * 0.1;
      c.grp.position.y = COIL_Y - this.gp.y + Math.sin(t * 2.2) * 0.05 + (Math.random() - 0.5) * jolt;
      c.core.scale.setScalar(0.62 * (1 - this.hits * 0.1) * (1 + f * 0.35));
      c.core.material.color.set('#d8a0ff').lerp(_c.set('#7a3ad0'), 1 - lv);
      c.core.material.opacity = (0.35 + 0.5 * lv) * (0.84 + 0.16 * Math.sin(t * (9 + this.hits * 6))) * sput + f * 0.15;
      c.hot.scale.setScalar((0.34 + f * 0.6) * (0.6 + 0.4 * lv)); c.hot.material.opacity = Math.min(1, 0.4 + 0.5 * lv + f);
      c.halo.material.opacity = (0.15 + 0.3 * lv) * (0.8 + 0.2 * Math.sin(t * 7)) + f * 0.3; c.aura.material.opacity = 0.05 + 0.09 * lv + f * 0.2;
      c.r1.material.opacity = 0.25 + 0.45 * lv; c.r2.material.opacity = 0.2 + 0.3 * lv;
      c.bm.opacity = (0.12 + 0.22 * lv) * (0.8 + 0.2 * Math.sin(t * 13)) * sput + f * 0.2;
      c.crackM.opacity = 0.55 + 0.4 * Math.sin(t * 17 + 1);
      // sparks off it, more the closer it is to going
      this.idleT -= dt;
      if (this.idleT <= 0) { this.idleT = 0.7 - this.hits * 0.22 + Math.random() * 0.3; g.particles.burst(this.C.console.x + rnd(-0.3, 0.3), COIL_Y + rnd(-0.3, 0.3), this.C.console.z + rnd(-0.3, 0.3), '#e8c8ff', 2, 1.8); }
      if (lamp) { lamp.color.set('#b080ff'); lamp.intensity = this.lampBase * (0.35 + 0.65 * lv) * (0.85 + 0.15 * Math.sin(t * 9)) + f * this.lampBase * 1.4; }
    } else if (lamp && this.lampMode) {
      // the console's lamp after the blast: a flare, then it dies down to a dull flicker
      this.lampT += dt; const u = this.lampT;
      const base = this.lampMode === 'dead' ? 0.3 : 0.3 + Math.max(0, 1 - u / 0.9) * 8 * (u < 0.9 ? 1 : 0);
      lamp.color.set(u < 0.5 && this.lampMode === 'blast' ? '#ffd890' : '#ff7a3a');
      lamp.intensity = base * (0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7.3));
      lamp.userData.base = 0.3;
    }
    // light and heat of the blast: pops, shards, sparks, smoke
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i]; p.t += dt; const u = Math.min(1, p.t / p.dur);
      p.mesh.scale.setScalar(p.s0 + (p.s1 - p.s0) * (1 - (1 - u) * (1 - u))); p.m.opacity = p.o * (1 - u) * (1 - u);
      if (u >= 1) { p.mesh.parent?.remove(p.mesh); p.m.dispose(); this.pops.splice(i, 1); }
    }
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i]; s.t += dt; s.vy -= 9 * dt;
      s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt; s.mesh.rotation.x += s.sx * dt; s.mesh.rotation.y += s.sy * dt;
      s.m.opacity = 0.95 * Math.max(0, 1 - s.t / s.life);
      if (s.t >= s.life) { s.mesh.parent?.remove(s.mesh); s.m.dispose(); this.shards.splice(i, 1); }
    }
    const B = this.blast;
    if (B) {
      B.t += dt; B.spark -= dt; B.smoke -= dt;
      if (B.t < 1.6 && B.spark <= 0) { B.spark = 0.12; const [x, y, z] = this.W(rnd(-1, 1), rnd(1.0, 1.8), rnd(-0.3, 0.3)); g.particles.burst(x, y, z, '#ffb860', 5, 3.4); }
      if (B.t < 2.4 && B.smoke <= 0) { B.smoke = 0.2; this.puff(); }
      if (B.t > 2.6 && !this.puffs.length && !this.pops.length && !this.shards.length) this.blast = null;
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i]; p.t += dt; const u = p.t / p.life;
      p.mesh.position.y += p.vy * dt; p.mesh.position.x += p.vx * dt; p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.s0 + (p.s1 - p.s0) * Math.sqrt(u)); p.m.opacity = p.o * Math.sin(Math.min(1, u) * Math.PI) ** 0.8;
      if (u >= 1) { p.mesh.parent?.remove(p.mesh); p.m.dispose(); this.puffs.splice(i, 1); }
    }
    if (this.wreck) { const e = this.wreck.ember, tt = this.blast ? Math.max(0, 1 - (this.blast.t - 0.5) / 6) : 0.3; e.opacity = (0.25 + 0.55 * tt) * (0.7 + 0.3 * Math.sin(t * 11) * Math.sin(t * 4.1)); }
    if (this.knock) this.updateKnock(dt);
  }
  puff() {
    const G = geos(), gp = this.gp, m = new THREE.MeshBasicMaterial({ color: '#4a443f', transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(G.ico1, m), [x, y, z] = this.W(rnd(-0.9, 0.9), rnd(1.6, 1.9), rnd(-0.35, -0.1));
    mesh.position.set(x - gp.x, y - gp.y, z - gp.z); this.C.group.add(mesh);
    this.puffs.push({ mesh, m, o: rnd(0.3, 0.45), s0: 0.25, s1: rnd(0.8, 1.3), vy: rnd(0.5, 0.9), vx: rnd(-0.15, 0.15), vz: rnd(-0.15, 0.15), t: 0, life: rnd(2.2, 3.4) });
  }
  updateKnock(dt) {
    const K = this.knock, v = K.vesk, g = this.g;
    K.t += dt;
    const u = Math.min(1, K.t / KNOCK_T), e = 1 - (1 - u) * (1 - u);
    v.pos.x = K.x0 + (K.x1 - K.x0) * e; v.pos.z = K.z0 + (K.z1 - K.z0) * e;
    v.pos.y = K.y0 + Math.sin(u * Math.PI) * 0.3 * (K.t < KNOCK_T ? 1 : 0);
    let da = K.a1 - K.a0; da = Math.atan2(Math.sin(da), Math.cos(da));
    v.angle = K.a0 + da * smooth(u);
    v.rig.ko.t = Math.min(SLUMP_T + 0.2, K.t); v.rig.play('ko'); v.rig.update(dt, 0); v.sync();
    if (!K.landed && K.t >= KNOCK_T) { K.landed = true; g.audio.play('thump'); g.particles.burst(K.x1, K.y0 + 0.1, K.z1, '#cbb994', 8, 1.6); }
  }
}
const _c = new THREE.Color();
