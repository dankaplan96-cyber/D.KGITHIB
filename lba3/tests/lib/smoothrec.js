// SMOOTH-1: the scripted-route driver and the per-drawn-frame recorder for tests/smooth-routes.mjs (loaded into the page
// after tests/lib/player.js). Test-only: nothing here ships.
//
// SM.run(route) drives a route: a list of commands, each held for its time in GAME seconds and applied on every
// simulation step (Game.frame) before the game reads its input, so the same keys go down on the same game time at any
// frame rate (a press is a key added to Input.keys and Input.taps, as a keydown does; a release takes it out):
//   { d, keys }            hold these key codes for d s (everything else up)
//   { go: [x, z], keys, tol, maxT }   Classic tank steering to a point: the turn key while the heading is off by more
//                          than 0.12 rad (Up as well unless it is off by more than 1.2 rad), plus `keys` (held)
//   { d, do(dt, R) }       a function on every step of it (a scripted world change: the lift's deck)
//   { at(R) }              once, then on (no time)
//   { rec: true | false }  start / stop recording drawn frames
// R.each(dt) (the route's own, optional) runs on every step of the whole route.
// While recording, every DRAWN frame (Game.renderer.render) samples, before it draws: its rAF timestamp (Game.last),
// Twinsen (simulation position and his rig's drawn root), the camera (position, view direction, the rig's look point), the
// route's extra objects (R.objs: name → () => THREE.Vector3 | null), each one's position on the screen (px), and the
// frame's own record from Game.perf (interval, simulation steps, CPU work = simulation + render submission, draw calls).
(() => {
  const G = window.game, I = G.input, cam = G.camera, V = G.hero.pos.constructor;
  const SM = (window.SM = { route: null, on: false, F: [], P: [], stub: false, steps: 0 });
  const _v = new V(), _d = new V();
  const r4 = (x) => Math.round(x * 1e4) / 1e4, r6 = (x) => Math.round(x * 1e6) / 1e6;
  const held = new Set();
  const setKeys = (want) => {
    for (const k of [...held]) if (!want.includes(k)) { I.keys.delete(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { I.keys.add(k); I.taps.add(k); held.add(k); }
  };
  SM.release = () => setKeys([]);
  // Classic steering toward (x, z): the keys for this step
  const steer = (c) => {
    const h = G.hero, dx = c.go[0] - h.pos.x, dz = c.go[1] - h.pos.z, want = Math.atan2(dx, dz);
    const e = Math.atan2(Math.sin(want - h.angle), Math.cos(want - h.angle));
    const k = [...(c.keys || [])];
    if (Math.abs(e) > 0.12) k.push(e > 0 ? 'ArrowLeft' : 'ArrowRight');   // (Left turns him toward a larger angle: actors.js)
    if (Math.abs(e) < 1.2) k.push('ArrowUp');
    return k;
  };
  const drive = (dt) => {
    const R = SM.route; if (!R || R.done) return;
    SM.steps++;
    R.t += dt;
    R.each?.(dt, R);
    for (let guard = 0; guard < 50; guard++) {
      const c = R.cmds[R.i];
      if (!c) { R.done = true; setKeys([]); SM.on = false; return; }
      if (!c._s) { c._s = true; c._t = 0; if (c.rec != null) SM.on = !!c.rec; c.at?.(R); }
      if (c.rec != null || (c.at && c.d == null && !c.go)) { R.i++; continue; }
      const over = c.go ? (Math.hypot(c.go[0] - G.hero.pos.x, c.go[1] - G.hero.pos.z) < (c.tol ?? 0.8) || c._t >= (c.maxT ?? 20)) : c._t >= c.d;
      if (over) { if (c.go) c.reached = c._t < (c.maxT ?? 20); R.i++; continue; }
      c._t += dt;
      setKeys(c.go ? steer(c) : c.keys || []);
      c.do?.(dt, R);
      return;
    }
  };
  const frame0 = G.frame.bind(G);
  G.frame = function (dt, render) { drive(dt); return frame0(dt, render); };
  SM.run = (route) => { for (const c of route.cmds) { c._s = false; c._t = 0; } Object.assign(route, { i: 0, t: 0, done: false }); SM.F = []; SM.P = []; SM.route = route; return route; };

  // screen position (px) of a world point in this frame's view, or null behind the camera
  const scr = (p) => { _v.copy(p).project(cam); return _v.z > 1 ? null : [r4((_v.x + 1) * innerWidth / 2), r4((1 - _v.y) * innerHeight / 2)]; };
  const pt = (p) => p ? { w: [r4(p.x), r4(p.y), r4(p.z)], s: scr(p) } : null;
  SM.sample = () => {
    if (!SM.on) return;
    cam.updateMatrixWorld();
    const h = G.hero, R = SM.route, rig = G.camRig;
    cam.getWorldDirection(_d);
    const chest = new V(h.pos.x, h.pos.y + 0.9, h.pos.z), root = h.rig?.root?.position;
    const f = { t: G.last, gt: r4(G.time), st: G.state, trans: !!G.trans, hero: pt(chest), root: root ? [r4(root.x), r4(root.y), r4(root.z)] : null, ha: r4(h.angle),
      cam: [r4(cam.position.x), r4(cam.position.y), r4(cam.position.z)], dir: [r6(_d.x), r6(_d.y), r6(_d.z)], look: pt(rig.look), objs: {} };
    // (the Follow camera's own account of this frame: its arm, the length it wants, and which of its rules moved it — camRig.why)
    if (rig.ch) { f.arm = r4(rig.ch.arm ?? -1); f.want = r4(rig.ch.want ?? -1); f.tier = rig.ch.tier ?? null; }
    if (rig.why) { const w = {}; for (const [k, x] of Object.entries(rig.why)) if (x && k !== 'mode' && k !== 'snap') w[k] = typeof x === 'number' ? r4(x) : x; f.why = w; }
    if (R?.objs) for (const [k, fn] of Object.entries(R.objs)) { let p = null; try { p = fn(); } catch { p = null; } f.objs[k] = p ? pt(p) : null; }
    SM.F.push(f);
  };
  const R0 = G.renderer, render0 = R0.render.bind(R0);
  R0.render = function (...a) { SM.sample(); if (SM.stub) return; return render0(...a); };
  // the frame's own record (Game.advance → perf.record: after its render), matched to the drawn frame before it
  const P = G.perf, rec0 = P.onRecord;
  P.onRecord = (f) => { rec0?.(f); if (SM.on || (SM.route && !SM.route.done && SM.F.length)) SM.P.push({ ms: r4(f.ms), steps: f.steps, sim: r4(f.sim), render: r4(f.render), calls: f.calls, tris: f.tris, lag: r4(f.lag || 0), black: !!f.black, lost: r4(f.lost || 0), why: f.why, n: SM.F.length }); };

  // a seeded Math.random for the route (enemies' and particles' choices), so the same inputs give the same run
  SM.seed = (s = 7) => { let x = s >>> 0 || 7; Math.random = () => ((x = (x * 16807) % 2147483647) / 2147483647); };
  // a placement inside the loaded scene (not a scene change): where he stands, his facing, still, the camera started
  // afresh behind him (as after a load)
  SM.place = (x, z, a) => {
    const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z, h.pos.y + 3), z); h.angle = a; h.vel.set(0, 0); h.vy = 0; h.onGround = true; h.fwdSpeed = 0;
    h.resetMotion?.(); h.steer = null; if (G.camRig.lba) G.camRig.lba.init = false; if (G.camRig.ch) G.camRig.ch.init = false; G.camRig.snap(); h.sync?.();
  };
})();
