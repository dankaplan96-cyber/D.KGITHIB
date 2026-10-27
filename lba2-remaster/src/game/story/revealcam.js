// Camera beats for the story's reveals (POLISH-AUDIT #6): a short push-in, a held framing and an eased hand-back,
// laid over a conversation that runs exactly as it did — the same chain() lines, flags and saves.
//
// Unlike src/engine/cinematic.js (a scene with its own clock, subtitles and a skip bar, which takes the game over),
// a beat never owns the game: dialogue boxes, input, the pause rules and every story callback stay as they are, and
// it can end at any moment (the lines mashed through, a room change, a death) without leaving anything behind.
//
//   const beat = revealBeat(game, { room: 'c3sendell' });   // null when beats are off (?nocine, the tests' fixed stepping)
//   beat?.show(() => twoShot(hero, orb, { bounds }));       // where to look (a function, so it follows what moves)
//   beat?.show(otherFraming, 1.4);                          // a second framing: eased over 1.4 s
//   beat?.release();                                        // hand back to the play camera, eased
//
// How: the play camera is computed as always (CameraRig.update, wrapped here), its result noted, and the beat's
// framing mixed over it with a weight that eases 0 → 1 (push-in), holds, and eases back to 0 (hand-back). The mix is
// done the way cinematic.js hands back to the game camera: look point, direction, log-distance and the visible
// height at the look point are interpolated, so a long isometric lens and a short close lens meet without a
// dolly-zoom wobble. The play camera's own state is put back before each frame, so the beat leaves no mark on it
// and at weight 0 the picture is exactly the play camera's: nothing to snap.
import * as THREE from 'three';

const DEG = Math.PI / 180;
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// Shots are framed for 16:9; a narrower screen opens the vertical angle so nobody in the 16:9 frame is cropped
// (the same rule as cinematic.js fitFov)
const WIDE = 16 / 9;
function fitFov(fov, aspect) {
  if (!(aspect < WIDE)) return fov;
  const h = 2 * Math.atan(Math.tan((fov * DEG) / 2) * WIDE);
  return Math.min(100, (2 * Math.atan(Math.tan(h / 2) / aspect)) / DEG);
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _id = new THREE.Quaternion();

// a framing in the terms that mix well: where it looks, the direction back to the camera, how far, how tall a slice of
// the world it sees at the look point
const frameOf = (pos, look, fov) => {
  const dir = pos.clone().sub(look), d = Math.max(0.05, dir.length());
  dir.divideScalar(d);
  return { look: look.clone(), dir, d, h: 2 * d * Math.tan((fov * DEG) / 2) };
};
function mixFrames(A, B, k) {
  const dir = A.dir.clone().applyQuaternion(_q.copy(_id).slerp(_q2.setFromUnitVectors(A.dir, B.dir), k));
  return { look: A.look.clone().lerp(B.look, k), dir, d: Math.exp(Math.log(A.d) + (Math.log(B.d) - Math.log(A.d)) * k), h: A.h + (B.h - A.h) * k };
}

// ---------------------------------------------------------------- where a camera may stand
// bounds: { round: {x, z, r} } or { box: {x0, x1, z0, z1} }, in world x/z (the room's inside, less a margin)
export function inside(b, x, z) {
  if (!b) return true;
  if (b.round) return Math.hypot(x - b.round.x, z - b.round.z) <= b.round.r;
  if (b.box) return x >= b.box.x0 && x <= b.box.x1 && z >= b.box.z0 && z <= b.box.z1;
  return true;
}
function pull(b, p) {
  if (!b || inside(b, p.x, p.z)) return p;
  if (b.round) { const dx = p.x - b.round.x, dz = p.z - b.round.z, l = Math.hypot(dx, dz) || 1; p.x = b.round.x + (dx / l) * b.round.r; p.z = b.round.z + (dz / l) * b.round.r; }
  else if (b.box) { p.x = Math.min(b.box.x1, Math.max(b.box.x0, p.x)); p.z = Math.min(b.box.z1, Math.max(b.box.z0, p.z)); }
  return p;
}

// Is the point inside something solid (a wall, a pillar, a console), within r? Only what stands up to its height counts
// (a rim or a step below the lens does not): the physics world's own colliders, as the play camera's checks read them.
export function solidAt(game, x, y, z, r = 0.35) {
  const P = game.physics;
  if (!P) return false;
  for (const c of P.near(x, z)) if (c.enabled && c.top > y && c.bottom < y && P._inside(c, x, z, r)) return true;
  return false;
}

// A medium two-shot of `a` and `b` ({x, y, z}: their chests, say). The camera stands out from the midpoint, near enough
// at right angles to the line between them to see both, as far out as `dist` allows inside `bounds` and clear of walls
// (`ok`), preferring the side the isometric view looks in from (+x +z) and the straightest angle. A line that is
// cramped (a hall's corner) takes a slanted view over the nearer one's shoulder. The choice is made once and kept in
// `o.memo` (so a frame never flips sides); only the slow push moves the lens after that. Returns { pos, look, fov }.
//   o.dist     the farthest the lens may stand from the midpoint (default 2.2 + 0.95 x their separation, at least 4.4)
//   o.height   lens height above the lower of the two (default 1.35)
//   o.drop     how far under the midpoint the lens aims, so the pair sits high in the frame (the dialogue box covers
//              the bottom of the picture; default 0.35)
//   o.ok       (x, y, z) => bool: a spot the lens may take (not in a wall); the way out from the midpoint is checked too
//   o.prefer   {x, z}: the side to look in from (default +x +z, the isometric views' open side)
//   o.fov      default 38
//   o.t, o.creep   a slow push: the lens draws in by `creep` m/s, up to 0.4 m, after `t` seconds
const OFFS = [0, 0.35, -0.35, 0.7, -0.7, 1.0, -1.0, 1.3, -1.3];
export function twoShot(a, b, o = {}) {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dz = b.z - a.z, sep = Math.hypot(dx, dz);
  const px = sep > 1e-3 ? -dz / sep : 1, pz = sep > 1e-3 ? dx / sep : 0;   // (at right angles to the line between them)
  const want = o.dist ?? Math.max(4.4, 2.2 + sep * 0.95), min = Math.min(want, o.minDist ?? 3.2), fov = o.fov ?? 38;
  const h = o.height ?? 1.35, lowY = Math.min(a.y, b.y), y = lowY + h, tanH = Math.tan((fov * DEG) / 2) * 1.7;
  const M = o.memo;
  let best = M && M.sel && Math.hypot(M.mx - mx, M.mz - mz) < 0.3 && Math.abs(M.sep - sep) < 0.3 ? M.sel : null;
  if (!best) {
    // the lens stands out from the midpoint in direction u: the right-angle line (either way), turned by `off`. Every
    // spot that frames both (within the lens' width, with a margin), stands inside the bounds and clear of walls is
    // costed: the open side is preferred (an isometric room's walls are low on its +x +z sides: looking in from there
    // shows the tall far walls behind the pair, not the void past the rim), then the straightest line, the pair
    // alike in size (neither a looming shoulder) and a little farther out.
    const pf = o.prefer ?? { x: 1, z: 1 }, half = Math.atan(tanH) * 0.85;
    let bestCost = Infinity;
    for (const s of [1, -1]) for (const off of OFFS) {
      const co = Math.cos(off), si = Math.sin(off), ux = (px * co - pz * si) * s, uz = (px * si + pz * co) * s;
      const side = ux * pf.x + uz * pf.z > 0.1 ? 0 : 2;
      for (let d = want; d >= min - 1e-6; d -= 0.2) {
        const x = mx + ux * d, z = mz + uz * d;
        if (!inside(o.bounds, x, z)) continue;
        const ca = Math.hypot(x - a.x, z - a.z), cb = Math.hypot(x - b.x, z - b.z);
        if (Math.min(ca, cb) < 2.2) continue;
        // both within the lens' width: each one's bearing from the aim at the midpoint, plus half a body
        const bm = Math.atan2(mx - x, mz - z), ba = Math.atan2(a.x - x, a.z - z), bb = Math.atan2(b.x - x, b.z - z);
        const wrap = (v) => Math.abs(Math.atan2(Math.sin(v), Math.cos(v)));
        if (Math.max(wrap(ba - bm) + 0.5 / ca, wrap(bb - bm) + 0.5 / cb) > half) continue;
        const cost = side + 0.5 * Math.abs(off) + 0.8 * Math.abs(Math.log(ca / cb)) + 0.4 * Math.max(0, 3.4 - Math.min(ca, cb)) - 0.05 * d + (s > 0 ? 0 : 0.01);
        if (cost >= bestCost) continue;
        let good = true;
        if (o.ok) for (let k = 0.4; k <= 1.0001 && good; k += 0.2) good = o.ok(mx + ux * d * k, y, mz + uz * d * k);
        if (good) { bestCost = cost; best = { ux, uz, d }; }
      }
    }
    best ??= { ux: px, uz: pz, d: min };
    if (M) { M.sel = best; M.mx = mx; M.mz = mz; M.sep = sep; }
  }
  const d = Math.max(min, best.d - Math.min(0.4, (o.creep ?? 0.05) * (o.t || 0)));
  const pos = new THREE.Vector3(mx + best.ux * d, y, mz + best.uz * d);
  pull(o.bounds, pos);
  return { pos, look: new THREE.Vector3(mx, my - (o.drop ?? 0.35), mz), fov };
}

// ---------------------------------------------------------------- the beat
export function beatsOn(game) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('nocine')) return false;   // developers, tests
  if (game.testFreeze && !game.revealForce) return false;                                                       // the tests' fixed stepping
  return true;
}

class Beat {
  constructor(game, opts) {
    this.game = game;
    this.rig = game.camRig;
    this.room = opts.room ?? game.room?.id ?? null;
    this.inSecs = opts.in ?? 2.2;
    this.on = true;
    this.t = 0;                // seconds the camera has been updated under the beat
    this.w = 0;                // weight of the beat's framing over the play camera
    this.rel = null;           // { t, secs, w0 }: handing back
    this.fn = null;            // the current framing function () => { pos, look, fov }
    this.prev = null;          // the framing it eased from (a frame), while a second framing takes over
    this.k = 1; this.kSecs = 1;
    this.G = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 40, look: new THREE.Vector3(), ok: false };
    this.hud = !game.hud.el.classList.contains('hidden');
    if (this.hud) game.hud.show(false);                 // (the dialogue box is its own element: it stays)
    const rig = this.rig, orig = rig.update, self = this;
    this.orig = orig;
    this.hook = function (dt, ...rest) {
      if (!self.on) return orig.call(this, dt, ...rest);
      self.restore();
      const r = orig.call(this, dt, ...rest);
      self.apply(dt);
      return r;
    };
    rig.update = this.hook;
  }

  // the framing to hold: from `fn` (called every frame: it may follow what moves). A second call eases to the new
  // framing over `secs`.
  show(fn, secs = 1.5) {
    if (!this.on) return this;
    if (this.fn && this.w > 0.001) { this.prev = this.last ?? null; this.k = 0; this.kSecs = Math.max(0.05, secs); }
    this.fn = fn;
    return this;
  }
  // hand back to the play camera: eased from wherever the picture is now
  release(secs = 1.6) {
    if (!this.on || this.rel) return;
    this.rel = { t: 0, secs: Math.max(0.05, secs), w0: this.w };
    if (this.hud) this.game.hud.show(true);
    this.hud = false;
  }
  // at once (an abort: the room changed, the title came up). Leaves the play camera and HUD as they should be.
  end() {
    if (!this.on) return;
    this.on = false;
    this.restore();
    // (a test wrapper laid over ours would call ours: which now passes straight through)
    if (this.rig.update === this.hook) this.rig.update = this.orig;
    if (this.hud && this.game.hud.el.classList.contains('hidden')) this.game.hud.show(true);
    this.hud = false;
    this.game.reveal = null;
    this.fn = null; this.prev = null;
  }
  get active() { return this.on; }

  // put the play camera back as it was left, so its own state (a spring, a damped fov) never sees our frame
  restore() {
    const G = this.G, cam = this.rig.cam;
    if (!G.ok) return;
    cam.position.copy(G.pos); cam.quaternion.copy(G.quat);
    if (cam.fov !== G.fov) { cam.fov = G.fov; cam.updateProjectionMatrix(); }
    this.rig.look.copy(G.look);
    G.ok = false;
  }

  apply(dt) {
    const g = this.game, rig = this.rig, cam = rig.cam, G = this.G;
    // lost the scene it was made for: gone, with nothing to undo (the camera is the play camera's this frame)
    if (g.room?.id !== this.room || g.state === 'title' || g.state === 'loading' || g.state === 'gameover' || g.hero?.dead) { this.end(); return; }
    dt = Math.min(dt, 0.1);
    this.t += dt;
    G.pos.copy(cam.position); G.quat.copy(cam.quaternion); G.fov = cam.fov; G.look.copy(rig.look); G.ok = true;
    if (this.rel) {
      this.rel.t += dt;
      this.w = this.rel.w0 * (1 - smooth(this.rel.t / this.rel.secs));
      if (this.rel.t >= this.rel.secs) { this.G.ok = false; this.end(); return; }
    } else this.w = smooth(this.t / this.inSecs);
    if (!this.fn || this.w <= 0) return;

    let f;
    try { f = this.fn({ t: this.t }); } catch (e) { console.error('reveal beat framing failed', e); this.release(0.4); return; }
    let T = frameOf(f.pos, f.look, fitFov(f.fov ?? 38, cam.aspect));
    if (this.prev && this.k < 1) { this.k = Math.min(1, this.k + dt / this.kSecs); T = mixFrames(this.prev, T, smooth(this.k)); if (this.k >= 1) this.prev = null; }
    this.last = T;
    const A = frameOf(G.pos, G.look, G.fov);
    const M = mixFrames(A, T, this.w);
    cam.position.copy(M.look).addScaledVector(M.dir, M.d);
    cam.lookAt(M.look);
    const fov = (2 * Math.atan(M.h / (2 * M.d))) / DEG;
    if (Math.abs(cam.fov - fov) > 1e-4) { cam.fov = fov; cam.updateProjectionMatrix(); }
    rig.look.copy(M.look);
  }
}

// A beat for the scene the game is in now, or null when beats are off. Never two at once: a new one ends the old.
export function revealBeat(game, opts = {}) {
  if (!beatsOn(game) || !game.camRig) return null;
  game.reveal?.end();
  return (game.reveal = new Beat(game, opts));
}
