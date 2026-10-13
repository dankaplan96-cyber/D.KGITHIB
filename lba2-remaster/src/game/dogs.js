// LBA2's dogs, measured from the original models (numbers only, nothing copied):
//   - Zeelich's dog (bodies 51–53, one model in three coats): one great round blob of a head-and-body, 0.45 H tall,
//     0.6 H long and 0.42 H wide (H = Twinsen's 2.1 m) — a wide open mouth across the whole front with a row of white
//     fangs above and two below, two white eyes bulging out at the top corners, a collar round the middle, a short
//     narrowing rump with a stub of a tail, four short legs (the back ones bent);
//   - the poodle (body 371): brown, clipped — a big cream puff on the chest and one on the hips, cream pompoms on
//     the feet and the tail, cream ear puffs, a pink bow on the head, the head held high on a long neck.
// Built here in three.js parts on pivots (legs, jaw or head, tail) with the characters' LBA ramp shading.
//   new Dog({ parent, ox, oz, physics, coat, x, z, area | path })   coat: 'grey' | 'greybrown' | 'brown' | 'poodle'
//   dog.update(dt, t)   wander inside area {x0,z0,x1,z1} (world), or run a closed path [[x,z,hop?],...] (world)
// They come to greet Twinsen when he is close, wag, and bark now and then (the big jaw drops open).
import * as THREE from 'three';
import { LbaMaterial } from './characters.js';
import { damp, angleDiff } from '../engine/math.js';

const U = 2.1 / 1238;   // original units → metres (Twinsen's 1238 units = 2.1 m)

const COATS = {
  grey: { coat: '#534757', jaw: '#534757', legs: '#534757', collar: '#8bcb93' },        // body 51
  greybrown: { coat: '#534757', jaw: '#53371b', legs: '#53371b', collar: '#1b4b23' },   // body 52
  brown: { coat: '#8b5f47', jaw: '#634327', legs: '#634327', collar: '#1b4b23' },       // body 53
};
const TEETH = '#ebdfd7', MOUTH = '#8b0707', PUPIL = '#63534f';
const POODLE = { coat: '#936b4f', snout: '#cfa783', puff: '#fffbcf', ear: '#ebdfd7', bow: '#ffb3af', collar: '#a71b1b', eye: '#63534f' };

const mat = new LbaMaterial();
const col = new THREE.Color();
function paint(geo, hex) {
  col.set(hex);
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function mesh(parent, geo, hex) { const m = new THREE.Mesh(hex ? paint(geo, hex) : geo, mat); m.castShadow = true; parent.add(m); return m; }
function ball(parent, r, [x, y, z], hex, s = [1, 1, 1], detail = 1) {
  const m = mesh(parent, new THREE.IcosahedronGeometry(r, detail), hex);
  m.position.set(x, y, z); m.scale.set(...s); return m;
}
// a tapered rod from a to b (radius r0 at a, r1 at b), `segs` sides
function rod(parent, a, b, r0, r1, hex, segs = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), segs);
  const m = mesh(parent, g, hex);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
// a loft along z through rings of six points; each ring {z, y0, y1, w, c, cb} (cb: the belly colour), shared
// vertices inside a run (smooth, as the original's Gouraud shading) and a hard seam where two rings share a z
function loft(rings) {
  const pos = [], cols = [], idx = [];
  const C = (h) => { col.set(h); return [col.r, col.g, col.b]; };
  for (const s of rings) {
    const h = (s.y1 - s.y0) / 2, ym = (s.y0 + s.y1) / 2;
    const ring = [[0, s.y1], [s.w * 0.8, ym + h * 0.6], [s.w, ym - h * 0.1], [s.w * 0.55, s.y0 + h * 0.08], [0, s.y0], [-s.w * 0.55, s.y0 + h * 0.08], [-s.w, ym - h * 0.1], [-s.w * 0.8, ym + h * 0.6]];
    ring.forEach(([x, y], k) => { pos.push(x, y, s.z); cols.push(...C(k >= 3 && k <= 5 && s.cb ? s.cb : s.c)); });
  }
  const n = 8;
  for (let i = 0; i < rings.length - 1; i++) {
    if (rings[i].z === rings[i + 1].z) continue;   // (a colour seam: no faces between the twin rings)
    for (let k = 0; k < n; k++) {
      const a = i * n + k, b = i * n + (k + 1) % n, c = (i + 1) * n + (k + 1) % n, d = (i + 1) * n + k;
      idx.push(a, d, b, b, d, c);
    }
  }
  // end caps
  for (const [i, flip] of [[0, true], [rings.length - 1, false]]) {
    const s = rings[i], ci = pos.length / 3;
    pos.push(0, (s.y0 + s.y1) / 2, s.z); cols.push(...C(s.c));
    for (let k = 0; k < n; k++) { const a = i * n + k, b = i * n + (k + 1) % n; if (flip) idx.push(ci, b, a); else idx.push(ci, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- Zeelich's dog (units, front +z)
function zeelichDog(K) {
  const body = new THREE.Group(), C = K.coat, G = K.collar;
  // the blob, back to front; the collar between twin rings; the front ring and cap are the mouth's dark inside
  mesh(body, loft([
    { z: -345, y0: 205, y1: 305, w: 75, c: C },
    { z: -280, y0: 150, y1: 400, w: 135, c: C },
    { z: -180, y0: 128, y1: 478, w: 150, c: C },
    { z: -80, y0: 108, y1: 548, w: 205, c: C },
    { z: -20, y0: 100, y1: 556, w: 232, c: C },
    { z: -20, y0: 100, y1: 556, w: 232, c: G },
    { z: 60, y0: 100, y1: 560, w: 240, c: G },
    { z: 60, y0: 100, y1: 560, w: 240, c: C },
    { z: 140, y0: 104, y1: 540, w: 228, c: C },
    { z: 200, y0: 112, y1: 490, w: 210, c: C },
    { z: 235, y0: 150, y1: 420, w: 180, c: C },
    { z: 235, y0: 150, y1: 420, w: 180, c: MOUTH },
    { z: 225, y0: 190, y1: 320, w: 150, c: MOUTH },
  ]));
  // the upper lip, overhanging the mouth
  mesh(body, loft([
    { z: 200, y0: 300, y1: 440, w: 200, c: C },
    { z: 290, y0: 290, y1: 400, w: 170, c: C },
    { z: 340, y0: 285, y1: 345, w: 140, c: C },
  ]));
  // fangs hanging from the lip: two big ones at the corners, three between
  for (const [x, l, r] of [[-140, 110, 26], [-70, 80, 20], [0, 70, 18], [70, 80, 20], [140, 110, 26]]) rod(body, [x, 300, 312], [x * 1.05, 300 - l, 322], r, 2, TEETH, 4);
  // the lower jaw on its hinge (drops open on a bark)
  const jaw = new THREE.Group(); jaw.position.set(0, 170, 140); body.add(jaw);
  mesh(jaw, loft([
    { z: 40, y0: -70, y1: 30, w: 205, c: K.jaw },
    { z: 120, y0: -60, y1: 20, w: 185, c: K.jaw },
    { z: 180, y0: -45, y1: 10, w: 140, c: K.jaw },
  ]));
  for (const x of [-110, 110]) rod(jaw, [x, 10, 160], [x, 85, 165], 18, 2, TEETH, 4);
  // the eyes bulging out at the top corners
  for (const s of [-1, 1]) {
    ball(body, 52, [s * 228, 420, 180], TEETH);
    ball(body, 20, [s * 272, 420, 182], PUPIL, [1, 1, 1], 0);
  }
  const head = new THREE.Group(); body.add(head);   // (the head is the body: nothing to turn)
  // the stub of a tail
  const tail = new THREE.Group(); tail.position.set(0, 300, -335); body.add(tail);
  rod(tail, [0, 0, 0], [0, 40, -70], 30, 6, C, 4);
  // four short legs: straight in front, bent behind
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 110, 150, -10); body.add(hip);
    rod(hip, [0, 10, 0], [s * -10, -150, -15], 48, 32, K.legs, 5);
    legs.push(hip);
  }
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 125, 175, -235); body.add(hip);
    rod(hip, [0, 10, 0], [s * 5, -95, -75], 52, 36, K.legs, 5);
    rod(hip, [s * 5, -95, -75], [s * -20, -175, -40], 36, 26, K.legs, 5);
    legs.push(hip);
  }
  const phase = [0, Math.PI, Math.PI, 0];   // a trot: diagonal pairs
  return { body, head, tail, legs, phase, jaw };
}

// ---------------------------------------------------------------- the poodle (units, front +z)
function poodle() {
  const K = POODLE, body = new THREE.Group();
  ball(body, 118, [0, 420, 150], K.puff, [1, 1, 1.05]);           // chest puff
  ball(body, 100, [0, 405, -105], K.puff, [1, 0.95, 1.05]);       // hip puff
  rod(body, [0, 400, -60], [0, 412, 90], 52, 60, K.coat, 7);       // the clipped waist
  rod(body, [0, 470, 205], [0, 620, 320], 46, 40, K.coat, 7);      // the neck
  ball(body, 48, [0, 474, 210], K.collar, [1, 0.3, 1], 1);
  const head = new THREE.Group(); head.position.set(0, 630, 340); body.add(head);
  ball(head, 88, [0, 30, 50], K.coat, [1, 0.95, 1.1]);
  rod(head, [0, 5, 110], [0, -10, 250], 44, 26, K.snout, 6);
  ball(head, 22, [0, -6, 252], K.eye, [1, 1, 1], 0);               // the nose
  for (const s of [-1, 1]) {
    ball(head, 42, [s * 88, -20, 40], K.ear, [0.8, 1.6, 0.9]);     // ear puffs
    ball(head, 15, [s * 40, 50, 128], K.eye, [1, 1, 1], 0);
    // the bow: a pink wedge each side of a knot
    rod(head, [s * 30, 132, 80], [s * 170, 140, 80], 14, 58, K.bow, 4);
  }
  ball(head, 38, [0, 130, 80], K.bow);
  const tail = new THREE.Group(); tail.position.set(0, 440, -185); body.add(tail);
  rod(tail, [0, 0, 0], [0, 125, 25], 16, 12, K.coat, 5);
  ball(tail, 36, [0, 131, 29], K.puff);
  const legs = [];
  for (const [x, z, fx] of [[62, 160, 79], [70, -90, 91]]) for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * x, 340, z); body.add(hip);
    rod(hip, [0, 0, 0], [s * (fx - x), -300, 0], 30, 20, K.coat, 5);
    ball(hip, 38, [s * (fx - x), -304, 0], K.puff);
    legs.push(hip);
  }
  const phase = [0, Math.PI, Math.PI, 0];   // a trot: diagonal pairs
  return { body, head, tail, legs, phase, neckY: 630 };
}

// A dog's "rig": the model on a root group with the same small interface the enemies' rigs have
// (root, play(anim), update(dt, speed), hitFlash()), so a guard dog is an ordinary Actor (src/game/guarddog.js).
// anims: idle, walk, run, sniff, warn (barking), windup (crouched, jaw wide), lunge, hurt, dead (knocked out)
export function dogRig(coat = 'grey') {
  const M = coat === 'poodle' ? poodle() : zeelichDog(COATS[coat] || COATS.grey);
  const root = new THREE.Group(); root.name = 'dog-' + coat;
  M.body.scale.setScalar(U);
  root.add(M.body);
  const own = new LbaMaterial();   // (its own material: the hit flash is this dog's alone)
  M.body.traverse((o) => { if (o.isMesh && o.material === mat) o.material = own; });
  const S = { anim: 'idle', gait: 0, lookP: 0, jawT: 0, flash: 0, t: Math.random() * 9, ko: 0, wag: 0.3 };
  const rig = {
    root, M, poodle: coat === 'poodle',
    play(a) { S.anim = a; },
    bark() { S.jawT = 0.35; },
    hitFlash() { S.flash = 0.25; },
    set wag(v) { S.wag = v; },
    update(dt, speed = 0, hop = 0) {
      S.t += dt;
      const a = S.anim, t = S.t;
      S.gait += speed * dt / 0.55 * Math.PI;
      const amp = Math.min(0.6, speed * 0.2);
      M.legs.forEach((l, i) => { l.rotation.x = a === 'dead' ? 0.9 : Math.sin(S.gait + M.phase[i]) * amp; });
      const bob = Math.abs(Math.sin(S.gait)) * amp * 0.05;
      // the body: crouched for the spring, pitched into the lunge, rolled onto its side when knocked out
      const pitch = a === 'windup' ? 0.12 : a === 'lunge' ? -0.18 : a === 'hurt' ? 0.1 : 0;
      M.body.rotation.x += (pitch - M.body.rotation.x) * Math.min(1, dt * 12);
      S.ko = a === 'dead' ? Math.min(1, S.ko + dt * 3) : 0;
      M.body.rotation.z = S.ko * Math.PI / 2;
      M.body.position.y = hop + bob - (a === 'windup' ? 0.08 : 0) + S.ko * 0.25;
      // the head (the poodle's) looks down to sniff; the jaw (the guard dog's) drops on a bark, gapes to bite
      if (S.jawT > 0) S.jawT -= dt;
      const look = a === 'sniff' ? -0.5 : a === 'warn' ? 0.2 : Math.sin(t * 0.7) * 0.12;
      S.lookP += (look + (S.jawT > 0 ? 0.25 : 0) - S.lookP) * Math.min(1, dt * 6);
      M.head.rotation.x = -S.lookP;
      if (M.jaw) {
        const open = a === 'windup' || a === 'lunge' ? 0.55 : a === 'hurt' || a === 'dead' ? 0.35 : S.jawT > 0 ? 0.45 : 0.06 + Math.abs(Math.sin(t * 2.2)) * 0.05 * (speed > 0.5 ? 2 : 1);
        M.jaw.rotation.x += (open - M.jaw.rotation.x) * Math.min(1, dt * 18);
      }
      const wag = a === 'warn' || a === 'windup' ? 0.05 : S.wag;
      M.tail.rotation.y = a === 'dead' ? 0 : Math.sin(t * (6 + wag * 10)) * (0.1 + wag * 0.45);
      if (S.flash > 0) S.flash -= dt;
      own.emissive.setRGB(S.flash > 0 ? 0.8 : 0, S.flash > 0 ? 0.8 : 0, S.flash > 0 ? 0.8 : 0);
    },
  };
  return rig;
}

// a dog that just lives somewhere (no fighting): wanders an area or runs a closed path. A Zeelich guard dog behind
// a fence turns to Twinsen and barks at him; the poodle comes up wagging.
export class Dog {
  constructor({ parent, ox = 0, oz = 0, physics, coat = 'grey', x, z, area = null, path = null }) {
    this.rig = dogRig(coat);
    this.root = this.rig.root;
    this.friendly = coat === 'poodle';
    parent.add(this.root);
    this.ox = ox; this.oz = oz; this.physics = physics;
    this.area = area; this.path = path;
    this.pos = new THREE.Vector3(x, physics.groundAt(x, z), z);
    this.radius = 0.35; this.onGround = true;
    this.a = Math.random() * Math.PI * 2;
    this.state = 'idle'; this.timer = 1 + Math.random() * 2; this.target = null;
    this.speed = 0; this.barkCool = 3 + Math.random() * 5;
    if (path) { this.segs = []; let L = 0; for (let i = 0; i < path.length; i++) { const a = path[i], b = path[(i + 1) % path.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]); this.segs.push({ a, b, d, L }); L += d; } this.len = L; this.s = Math.random() * L; }
    this.place(0, 0);
  }

  hero() { const G = globalThis.game; return G?.hero && G.state !== 'title' ? G.hero : null; }

  update(dt) {
    const h = this.hero();
    const dh = h ? Math.hypot(h.pos.x - this.pos.x, h.pos.z - this.pos.z) : 99;
    let want = 0, hop = 0, anim = 'idle';
    if (this.path) {
      // run the training course, hopping the hurdles; stop and bark at Twinsen when he comes to the fence
      if (dh < 3.5 && this.barkCool < 4) { this.a = damp(this.a, this.a + angleDiff(this.a, Math.atan2(h.pos.x - this.pos.x, h.pos.z - this.pos.z)), 6, dt); anim = 'warn'; if (this.barkCool <= 0) this.bark(dh); }
      else {
        const v = 3.4;
        this.s = (this.s + v * dt) % this.len;
        const sg = this.segs.find((g) => this.s >= g.L && this.s < g.L + g.d) || this.segs[0];
        const u = (this.s - sg.L) / sg.d;
        if (sg.b[2]) { const k = (u - 0.75) / 0.25; if (k > 0) hop = Math.sin(k * Math.PI) * 0.45; }
        if (sg.a[2]) { const k = u / 0.25; if (k < 1) hop = Math.sin((1 + k) * Math.PI / 2) * 0.45 * (1 - k); }
        this.a = damp(this.a, this.a + angleDiff(this.a, Math.atan2(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1])), 10, dt);
        this.pos.x = sg.a[0] + (sg.b[0] - sg.a[0]) * u; this.pos.z = sg.a[1] + (sg.b[1] - sg.a[1]) * u;
        want = v; anim = 'run';
      }
    } else {
      this.timer -= dt;
      if (h && dh < 4 && this.state !== 'greet' && this.barkCool < 6) { this.state = 'greet'; this.timer = 3 + Math.random() * 2; }
      if (this.state === 'greet') {
        // the poodle comes up wagging; a guard dog holds its ground and barks
        const ta = Math.atan2(h.pos.x - this.pos.x, h.pos.z - this.pos.z);
        this.a = damp(this.a, this.a + angleDiff(this.a, ta), 6, dt);
        if (this.friendly && dh > 1.7 && this.inArea(h.pos.x, h.pos.z, 1)) want = this.step(Math.sin(this.a), Math.cos(this.a), 2.2, dt);
        anim = this.friendly ? (want > 0.3 ? 'walk' : 'idle') : 'warn';
        this.rig.wag = this.friendly ? 1 : 0.05;
        if (this.barkCool <= 0) this.bark(dh);
        if (this.timer <= 0 || dh > 6) { this.state = 'idle'; this.timer = 2 + Math.random() * 3; }
      } else if (this.state === 'go') {
        const dx = this.target[0] - this.pos.x, dz = this.target[1] - this.pos.z, d = Math.hypot(dx, dz);
        this.a = damp(this.a, this.a + angleDiff(this.a, Math.atan2(dx, dz)), 5, dt);
        want = d > 0.3 ? this.step(Math.sin(this.a), Math.cos(this.a), this.trot, dt) : 0;
        anim = 'walk'; this.rig.wag = 0.35;
        if (d < 0.4 || this.timer <= 0 || (want < this.trot * 0.3 && d > 0.3)) { this.state = Math.random() < 0.4 ? 'sniff' : 'idle'; this.timer = 1.5 + Math.random() * 3; }
      } else {
        anim = this.state === 'sniff' ? 'sniff' : 'idle';
        this.rig.wag = 0.3;
        if (this.timer <= 0 && this.area) {
          const A = this.area;
          this.target = [A.x0 + Math.random() * (A.x1 - A.x0), A.z0 + Math.random() * (A.z1 - A.z0)];
          this.trot = 1.1 + Math.random() * 1.2;
          this.state = 'go'; this.timer = 8;
        }
      }
    }
    this.barkCool -= dt;
    this.speed = damp(this.speed, want, 8, dt);
    this.rig.play(anim);
    this.place(hop, dt);
  }

  inArea(x, z, m = 0) { const A = this.area; return !A || (x > A.x0 - m && x < A.x1 + m && z > A.z0 - m && z < A.z1 + m); }

  // move through the physics (walls stop it), keep inside the area; returns the speed actually made
  step(sx, sz, v, dt) {
    const x0 = this.pos.x, z0 = this.pos.z;
    this.physics.move(this, sx * v * dt, sz * v * dt);
    if (!this.inArea(this.pos.x, this.pos.z, 0.5)) { this.pos.x = x0; this.pos.z = z0; }
    return Math.hypot(this.pos.x - x0, this.pos.z - z0) / Math.max(dt, 1e-4);
  }

  bark(dh) {
    const G = globalThis.game;
    if (dh < 9 && G?.audio) G.audio.play(this.friendly ? 'yap' : 'bark');
    this.rig.bark();
    this.barkCool = this.friendly ? 6 + Math.random() * 6 : 1.4 + Math.random();
  }

  place(hop, dt) {
    this.pos.y = this.physics.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.4);
    this.root.position.set(this.pos.x - this.ox, this.pos.y, this.pos.z - this.oz);
    this.root.rotation.y = this.a;
    this.rig.update(dt, this.speed, hop);
  }
}

// a few dogs in a region: updaters gets one function that steps them all
export function addDogs(list, updaters) {
  updaters.push((dt) => { for (const d of list) d.update(dt); });
  return list;
}
