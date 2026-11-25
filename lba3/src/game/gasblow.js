// WAVE 6 · H-16: the Blow, the gas monster in the Wannies' deep seam (wanniemine.js wm_blow; story/liftbelow.js plays
// the fight). Ours: a swollen bag of mine gas with a hot core, two slit eyes and a mouth that glows before it spits.
// The user's wish (24.11): "catch its fireballs with the glove, throw them back".
//
// The fight, fair and readable (no instant death, no contact damage):
//   - it hangs over one of the room's three vents and turns to face Twinsen;
//   - the wind-up: it swells, its mouth goes orange then white, a rising hiss (1.4 / 1.2 / 1.0 s by phase);
//   - it spits a slow fireball at where he stands (6 / 6.8 / 7.5 m/s; 1, then 2, then 3 a volley, 0.9 s apart);
//     a fireball that reaches him burns 2 life (a dodge's window or his blink after a hit lets it pass);
//   - a punch with the Wannie glove as one comes in (within 1.8 m in front of him, the whole punch long; 2.6 m before the
//     user's second round, 25.11) catches it: it
//     sits burning on the glove; the next glove punch throws it back, toward the Blow when he faces it roughly
//     (±60°), else straight ahead; held over 5 s it gutters out (no harm);
//   - each of its own fireballs that reaches it is a hit: it sags, flickers and drifts to another vent (3 hits);
//   - the ball, the sword, a bare fist and the other weapons go through the gas: no harm, a puff, a hint the first time.
// Nothing of the fight is saved: a load or a Retry starts it again (the room's autosave is at its door), beaten is
// the story's flag (zo_blow).
//
// CONTRACT
//   new Blow(game, R /* the wm_blow room */, H /* WM.blow */)
//   reset()  asleep in its vent, 3 hits to go, no fireballs;  wake();  update(dt);  calm() (beaten, gone)
//   catchFrom(hero) → bool   (a glove punch under way: a fireball in front of him caught)
//   throwFrom(hero) → bool   (a fireball on the glove thrown)
//   ballHit(p) / fistHit(inArc) → bool   (through the gas: no harm)
//   state ('asleep'|'wake'|'drift'|'hover'|'windup'|'spit'|'cool'|'hurt'|'dying'|'gone'), hp, phase, held, balls,
//   stats {spat, caught, thrown, hits, burns}, onBeaten, onHint(key)
import * as THREE from 'three';
import { angleDiff, dampAngle } from '../engine/math.js';
import { M, canvasTex } from './props.js';
import { glowSprite } from './interiors.js';

export const BLOW = {
  hp: 3, hover: 2.5, r: 1.05,
  windup: [1.4, 1.2, 1.0], speed: [6.0, 6.8, 7.5], volley: [1, 2, 3], gap: 0.9, cool: [2.2, 1.8, 1.5],
  burn: 2, ballR: 0.28, life: 4.5,
  catchReach: 1.8, catchArc: 1.25, throwSpeed: 13, throwArc: 1.05, holdMax: 5,
  hurt: 1.8, drift: 1.4, wakeT: 1.8,
};
const _v = new THREE.Vector3();

// the body: a lumpy bag (an icosahedron pushed in and out), see-through, a hot core inside, slit eyes, a ring mouth
function blowModel() {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i);
    const n = Math.sin(_v.x * 3.1 + _v.y * 1.7) * 0.06 + Math.sin(_v.z * 4.3 - _v.y * 2.2) * 0.05 + Math.sin(_v.x * 7 + _v.z * 6) * 0.02;
    _v.multiplyScalar(1 + n); _v.y *= 0.88; p.setXYZ(i, _v.x, _v.y, _v.z);
  }
  geo.computeVertexNormals();
  // (WAVE6 second round, the user: "make the Blow read clearly, in every phase": a brighter, more solid bag that lights
  //  itself, and a warm halo round it; its light on the floor is the pool under it, Blow.place)
  const skin = new THREE.MeshStandardMaterial({ color: '#f2dc98', emissive: '#d0802a', emissiveIntensity: 1.3, roughness: 0.35, transparent: true, opacity: 0.94, depthWrite: false });
  skin.userData.noShadow = true;
  const body = new THREE.Mesh(geo, skin); body.renderOrder = 2; g.add(body);
  const coreM = new THREE.MeshBasicMaterial({ color: '#ff9a3a' });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), coreM); core.position.set(0, -0.08, 0.05); core.renderOrder = 1; g.add(core);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#fff2a8' });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), eyeM); e.scale.set(1.6, 0.45, 0.6); e.position.set(s * 0.3, 0.22, 0.86); e.rotation.z = s * 0.25; g.add(e); }
  const mouthM = new THREE.MeshBasicMaterial({ color: '#5a2a10' });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16), mouthM); mouth.position.set(0, -0.28, 0.86); g.add(mouth);
  // wisps trailing under it
  const wispM = new THREE.MeshBasicMaterial({ color: '#d8b878', transparent: true, opacity: 0.3, depthWrite: false });
  const wisps = [];
  for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), wispM); g.add(w); wisps.push(w); }
  const halo = glowSprite('#ffb060', 4.6, 0.5); halo.material.userData.noShadow = true; halo.renderOrder = 1; g.add(halo);
  return { g, body, skin, core, coreM, mouth, mouthM, eyeM, wisps, wispM, halo };
}
// its light on the floor: a soft warm pool under it (unlit and additive: no lamp, no shadow)
const poolTex = () => M('blowPoolTex', () => canvasTex(128, 128, (x, W) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); }));
function floorPool() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: poolTex(), color: '#ff9a40', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.material.userData.noShadow = true;
  return m;
}
// a fireball: a hot core and a soft halo
let FB = null;
function fireball() {
  FB ??= { core: new THREE.SphereGeometry(BLOW.ballR, 12, 8), halo: new THREE.SphereGeometry(BLOW.ballR * 1.7, 12, 8),
    coreM: new THREE.MeshBasicMaterial({ color: '#fff0b0' }), haloM: new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.45, depthWrite: false }) };
  const g = new THREE.Group();
  g.add(new THREE.Mesh(FB.core, FB.coreM)); const h = new THREE.Mesh(FB.halo, FB.haloM); h.renderOrder = 3; g.add(h);
  return g;
}

export class Blow {
  constructor(game, R, H) {
    this.game = game; this.R = R; this.H = H;
    this.o = R.group.position;   // (its meshes live in the room's group: hidden with it)
    this.m = blowModel(); R.group.add(this.m.g);
    this.pool = floorPool(); R.group.add(this.pool);
    this.balls = [];
    this.stats = { spat: 0, caught: 0, thrown: 0, hits: 0, burns: 0 };
    this.onBeaten = null; this.onHint = null;
    this.reset();
  }
  get phase() { return Math.max(0, Math.min(2, BLOW.hp - this.hp)); }
  get awake() { return !['asleep', 'gone'].includes(this.state); }
  get held() { return this.balls.find((b) => b.held) || null; }
  // where it is, in world coordinates
  get x() { return this.pos.x; } get z() { return this.pos.z; } get y() { return this.pos.y; }
  reset() {
    for (const b of this.balls) b.g.removeFromParent();
    this.balls = [];
    this.hp = BLOW.hp; this.vent = 0; this.state = 'asleep'; this.t = 0; this.left = 0; this.puffT = 0;
    const v = this.H.vents[0];
    this.pos = new THREE.Vector3(v.x, 0.6, v.z); this.from = this.pos.clone(); this.to = this.pos.clone();
    this.face = Math.PI / 2; this.swell = 0;
    this.m.g.visible = true; this.pool.visible = true; this.place(0);
  }
  calm() { this.reset(); this.state = 'gone'; this.m.g.visible = false; this.pool.visible = false; }
  wake() { if (this.state !== 'asleep') return; this.state = 'wake'; this.t = 0; this.from.copy(this.pos); this.to.set(this.pos.x, BLOW.hover, this.pos.z); this.game.audio.play('diveRise', this.pos); this.game.camRig?.shake?.(0.3); }
  // its look this frame
  place(dt) {
    const M = this.m, g = M.g, tt = this.game.time || 0;
    g.position.set(this.pos.x - this.o.x, this.pos.y, this.pos.z - this.o.z);
    g.rotation.y = this.face;
    const breathe = 1 + Math.sin(tt * 2.1) * 0.04, s = (this.state === 'asleep' ? 0.6 : this.state === 'hurt' ? 0.82 : this.state === 'dying' ? Math.max(0.05, 1 - this.t / 2) : 1) * (1 + this.swell * 0.28) * breathe;
    g.scale.setScalar(s * BLOW.r);
    const hot = this.state === 'windup' ? this.swell : 0;
    M.mouthM.color.setRGB(0.35 + hot * 0.65, 0.16 + hot * 0.78, 0.06 + hot * 0.55);
    M.coreM.color.setRGB(1, 0.55 + hot * 0.4, 0.2 + hot * 0.6);
    M.eyeM.color.set(this.state === 'asleep' ? '#8a7a40' : this.state === 'hurt' ? '#ffffff' : '#fff2a8');
    const flick = this.state === 'hurt' && Math.sin(tt * 40) > 0;
    M.skin.emissiveIntensity = this.state === 'hurt' ? 1.3 + (flick ? 1.2 : 0) : (this.state === 'asleep' ? 1.0 : 1.3) + hot * 1.0;
    M.halo.material.opacity = (this.state === 'asleep' ? 0.32 : 0.5) + hot * 0.4 + (flick ? 0.3 : 0);
    M.halo.material.color.setRGB(1, 0.62 + hot * 0.3, 0.3 + hot * 0.45);
    // the pool under it: wider and fainter the higher it hangs
    const P = this.pool, up = Math.max(0, this.pos.y - 0.3), ps = (this.state === 'asleep' ? 2.6 : 3.4) + up * 0.5;
    P.position.set(this.pos.x - this.o.x, 0.04, this.pos.z - this.o.z); P.scale.set(ps, ps, 1);
    P.material.opacity = Math.min(0.55, (0.5 + hot * 0.3) / (1 + up * 0.18)) * (this.state === 'dying' ? Math.max(0, 1 - this.t / 2) : 1);
    M.wisps.forEach((w, i) => { const a = tt * (0.6 + i * 0.13) + i; w.position.set(Math.sin(a) * 0.7, -0.9 - (i % 3) * 0.3 + Math.sin(tt * 1.3 + i) * 0.1, Math.cos(a) * 0.7); w.scale.setScalar(0.8 + Math.sin(tt * 2 + i) * 0.25); });
    void dt;
  }
  hint(key) { this.onHint?.(key); }
  // ---- the fireballs
  spit() {
    const g = this.game, h = g.hero, P = this.phase;
    const from = new THREE.Vector3(this.pos.x + Math.sin(this.face) * 1.0, this.pos.y - 0.4, this.pos.z + Math.cos(this.face) * 1.0);
    const to = new THREE.Vector3(h.pos.x, h.pos.y + 1.0, h.pos.z);
    const v = to.sub(from).normalize().multiplyScalar(BLOW.speed[P]);
    const fb = fireball(); this.R.group.add(fb);
    const b = { g: fb, p: from, v, life: BLOW.life, held: false, back: false, heldT: 0 };
    this.balls.push(b); this.stats.spat++;
    g.audio.play('tBlast', from); g.particles?.burst(from.x, from.y, from.z, '#ffb040', 10, 2.5);
    this.swell = 0.4;
  }
  pop(b, color = '#ff7a3a', n = 10) { const p = b.p; this.game.particles?.burst(p.x, p.y, p.z, color, n, 3); b.g.removeFromParent(); this.balls.splice(this.balls.indexOf(b), 1); }
  stepBalls(dt) {
    const g = this.game, h = g.hero, B = this.H.bounds, P = g.physics;
    for (const b of [...this.balls]) {
      if (b.held) {
        // on the glove: in front of his right hand, burning
        b.heldT += dt;
        b.p.set(h.pos.x + Math.sin(h.angle) * 0.62 + Math.cos(h.angle) * 0.18, h.pos.y + 1.12, h.pos.z + Math.cos(h.angle) * 0.62 - Math.sin(h.angle) * 0.18);
        if (b.heldT > BLOW.holdMax || h.weapon !== 'glove' || h.dead) { this.pop(b, '#a08060', 6); this.hint('zo_blow_gutter'); continue; }
      } else {
        b.life -= dt;
        const n = Math.max(1, Math.ceil(b.v.length() * dt / 0.1));
        let dead = b.life <= 0;
        for (let k = 0; k < n && !dead; k++) {
          b.p.addScaledVector(b.v, dt / n);
          if (b.back) {
            // his throw: the Blow takes it
            if (this.awake && this.state !== 'dying' && b.p.distanceTo(this.pos) < BLOW.r * 1.25 + BLOW.ballR) { this.hit(b); dead = 'hit'; break; }
          } else if (!h.dead && Math.hypot(b.p.x - h.pos.x, b.p.z - h.pos.z) < 0.55 && b.p.y > h.pos.y && b.p.y < h.pos.y + 1.9) {
            const hp0 = h.hp; h.damage(BLOW.burn, b.p);
            if (h.hp < hp0) { this.stats.burns++; if (this.stats.burns === 1) this.hint('zo_blow_burnt'); }
            dead = true; break;
          }
          if (b.p.x < B.x0 - 0.5 || b.p.x > B.x1 + 0.5 || b.p.z < B.z0 - 0.5 || b.p.z > B.z1 + 0.5 || b.p.y < 0.05 || P.blockedAt(b.p.x, b.p.z, b.p.y - 0.4, 0)) dead = true;
        }
        if (dead === 'hit') continue;
        if (dead) { this.pop(b); g.audio.play('tFizz', b.p); continue; }
      }
      b.g.position.set(b.p.x - this.o.x, b.p.y, b.p.z - this.o.z);
      const fl = 1 + Math.sin((g.time || 0) * 30 + b.p.x) * 0.12; b.g.scale.setScalar(fl);
    }
  }
  // a glove punch under way: the nearest fireball coming at him, in front, within reach, is caught
  catchFrom(h) {
    if (this.held) return false;
    let best = null, bd = BLOW.catchReach;
    for (const b of this.balls) {
      if (b.held || b.back) continue;
      const d = Math.hypot(b.p.x - h.pos.x, b.p.z - h.pos.z);
      if (d > bd || b.p.y < h.pos.y - 0.2 || b.p.y > h.pos.y + 2.4) continue;
      if (Math.abs(angleDiff(h.angle, Math.atan2(b.p.x - h.pos.x, b.p.z - h.pos.z))) > BLOW.catchArc) continue;
      best = b; bd = d;
    }
    if (!best) return false;
    best.held = true; best.heldT = 0; best.v.set(0, 0, 0);
    this.stats.caught++;
    const g = this.game; g.audio.play('catch', best.p); g.particles?.burst(best.p.x, best.p.y, best.p.z, '#ffd27a', 12, 2);
    if (this.stats.caught === 1) this.hint('zo_blow_caught');
    return true;
  }
  // the fireball on the glove thrown: toward the Blow when he faces it roughly, else straight ahead
  throwFrom(h) {
    const b = this.held; if (!b) return false;
    const to = this.awake ? Math.atan2(this.pos.x - h.pos.x, this.pos.z - h.pos.z) : h.angle;
    const aim = this.awake && Math.abs(angleDiff(h.angle, to)) < BLOW.throwArc;
    const dir = aim ? new THREE.Vector3(this.pos.x - b.p.x, this.pos.y - b.p.y, this.pos.z - b.p.z).normalize() : new THREE.Vector3(Math.sin(h.angle), 0, Math.cos(h.angle));
    b.held = false; b.back = true; b.life = 3; b.v.copy(dir.multiplyScalar(BLOW.throwSpeed));
    this.stats.thrown++;
    const g = this.game; g.audio.play('throwHeavy', b.p); g.particles?.burst(b.p.x, b.p.y, b.p.z, '#ffb040', 8, 3);
    return true;
  }
  hit(b) {
    const g = this.game;
    this.pop(b, '#ffe0a0', 26);
    this.hp--; this.stats.hits++;
    g.audio.play('diveImpact', this.pos); g.camRig?.shake?.(0.35);
    g.particles?.burst(this.pos.x, this.pos.y, this.pos.z, '#d8c070', 30, 5);
    for (const o of [...this.balls]) if (!o.held) this.pop(o, '#a08060', 4);   // (its own fire in the air goes out)
    if (this.hp <= 0) { this.state = 'dying'; this.t = 0; g.audio.play('break', this.pos); return; }
    this.state = 'hurt'; this.t = 0; this.swell = 0;
    this.hint(this.hp === 2 ? 'zo_blow_hit1' : 'zo_blow_hit2');
  }
  // the ball and the blades: through the gas
  ballHit(p) {
    if (!this.awake || this.state === 'dying') return false;
    if (p.distanceTo(this.pos) > BLOW.r * 1.3) return false;
    this.puff(p); return true;
  }
  fistHit(inArc) {
    if (!this.awake || this.state === 'dying' || !inArc(this.pos.x, this.pos.z, BLOW.r)) return false;
    if (this.pos.y > this.game.hero.pos.y + 3.6) return false;
    this.puff(this.pos); return true;
  }
  puff(p) {
    const g = this.game; g.particles?.burst(p.x, p.y, p.z, '#c8b080', 14, 2); g.audio.play('tSteam', p);
    if ((g.time || 0) - this.puffT > 4) { this.puffT = g.time || 0; this.hint('zo_blow_through'); }
  }
  // ---- each frame
  update(dt) {
    const g = this.game, h = g.hero;
    this.t += dt;
    this.swell = Math.max(0, this.swell - dt * 1.5);
    const faceHero = () => { this.face = dampAngle(this.face, Math.atan2(h.pos.x - this.pos.x, h.pos.z - this.pos.z), 3, dt); };
    const ph = this.phase;
    switch (this.state) {
      case 'asleep': this.pos.y = 0.6 + Math.sin((g.time || 0) * 0.8) * 0.05; break;
      case 'wake': {
        const k = Math.min(1, this.t / BLOW.wakeT); this.pos.lerpVectors(this.from, this.to, k * k * (3 - 2 * k)); faceHero();
        if (k >= 1) { this.state = 'hover'; this.t = 0; this.left = 0; }
        break;
      }
      case 'drift': {
        const k = Math.min(1, this.t / BLOW.drift), e = k * k * (3 - 2 * k);
        this.pos.lerpVectors(this.from, this.to, e); this.pos.y += Math.sin(k * Math.PI) * 0.8; faceHero();
        if (k >= 1) { this.state = 'hover'; this.t = 0; }
        break;
      }
      case 'hover':
        faceHero(); this.pos.y = BLOW.hover + Math.sin((g.time || 0) * 1.6) * 0.12;
        if (this.t > 0.7 && !h.dead) { this.state = 'windup'; this.t = 0; this.left = BLOW.volley[ph]; g.audio.play('alert', this.pos); g.audio.play('steam', this.pos); }
        break;
      case 'windup': {
        faceHero();
        const T = BLOW.windup[ph], k = Math.min(1, this.t / T);
        this.swell = k;
        if (Math.random() < dt * 16) { const mx = this.pos.x + Math.sin(this.face) * 0.9, mz = this.pos.z + Math.cos(this.face) * 0.9; g.particles?.burst(mx, this.pos.y - 0.3, mz, k > 0.7 ? '#fff0c0' : '#ff9a3a', 1, 1.2); }
        if (k >= 1) { this.spit(); this.left--; this.state = this.left > 0 ? 'spit' : 'cool'; this.t = 0; }
        break;
      }
      case 'spit':   // (the volley's next one, BLOW.gap later, aimed afresh)
        faceHero(); this.swell = Math.max(this.swell, 0.6 * Math.min(1, this.t / BLOW.gap));
        if (this.t >= BLOW.gap) { this.spit(); this.left--; this.t = 0; if (this.left <= 0) this.state = 'cool'; }
        break;
      case 'cool':
        faceHero();
        if (this.t >= BLOW.cool[ph]) { this.state = 'hover'; this.t = 0; }
        break;
      case 'hurt':
        this.pos.y = Math.max(1.4, this.pos.y - dt * 1.2);
        if (Math.random() < dt * 10) g.particles?.burst(this.pos.x, this.pos.y, this.pos.z, '#c8b080', 2, 2);
        if (this.t >= BLOW.hurt) {
          // off to the vent furthest from him
          let best = 0, bd = -1; this.H.vents.forEach((v, i) => { const d = Math.hypot(v.x - h.pos.x, v.z - h.pos.z) + (i === this.vent ? -6 : 0); if (d > bd) { bd = d; best = i; } });
          this.vent = best; const v = this.H.vents[best];
          this.from.copy(this.pos); this.to.set(v.x, BLOW.hover, v.z); this.state = 'drift'; this.t = 0;
        }
        break;
      case 'dying':
        this.pos.y = Math.max(0.3, this.pos.y - dt * 0.8);
        if (Math.random() < dt * 30) g.particles?.burst(this.pos.x + (Math.random() - 0.5), this.pos.y, this.pos.z + (Math.random() - 0.5), Math.random() < 0.5 ? '#d8c890' : '#ffb060', 2, 3);
        if (this.t >= 2) { this.state = 'gone'; this.m.g.visible = false; this.pool.visible = false; for (const b of [...this.balls]) this.pop(b, '#a08060', 4); this.onBeaten?.(); }
        break;
    }
    this.stepBalls(dt);
    if (this.state !== 'gone') this.place(dt);
  }
}
