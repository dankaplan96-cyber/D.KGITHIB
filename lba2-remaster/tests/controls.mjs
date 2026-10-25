// Prompts and the pad, and NPC walking (review fixes):
//   1. the interact prompt names the key in use: E, a rebound key, A on a pad (one source: Input.label)
//   2. pad A talks / searches when something is in reach, in every behaviour (Athletic does not jump instead)
//   3. an NPC's gait follows the ground it really covers: a slow route walks slower, a blocked walker stands
// CTRL-1 (4–8): LBA2's tank controls, the ball's arcs and aimed distance (the automatic aim at enemies kept), the follow
// camera — measured by input at 60 / 30 fps (MEASURE lines). ONLY=tank,ball,camera runs just those sections.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = watch(page);
const ev = (f, a) => page.evaluate(f, a);
const { check, done } = checker({ info: 'always' });

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.step(1.2);
  // a fake standard gamepad (navigator.getGamepads is what Input polls)
  window.PAD = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  window.atCupboard = () => { const s = G.room.searches.find((x) => x.id === 'cupboard'); const h = G.hero; h.pos.set(s.x + 0.3, 0, s.z); h.angle = -Math.PI / 2; h.vel?.set(0, 0); h.onGround = true; G.step(0.2); };
});

// ---------------------------------------------------------------- 1. prompt labels
const label = () => ev(() => { game.step(0.1); const p = document.querySelector('#prompt'); return { show: p.classList.contains('show'), key: p.querySelector('kbd')?.textContent }; });
await ev(() => atCupboard());
const kbd = await label();
await ev(() => { game.settings.keys = { interact: 'KeyG' }; game.applySettings(); });
const rebound = await label();
await ev(() => { game.settings.keys = {}; game.applySettings(); navigator.getGamepads = () => [PAD]; PAD.axes = [0.5, 0, 0, 0]; game.step(0.05); PAD.axes = [0, 0, 0, 0]; atCupboard(); });
const pad = await label();
check('prompt shows W on the keyboard (Classic: LBA2 talks and searches with W)', kbd.show && kbd.key === 'W', kbd);
check('prompt shows the rebound key', rebound.show && rebound.key === 'G', rebound);
check('prompt shows A on a pad', pad.show && pad.key === 'A', pad);

// ---------------------------------------------------------------- 2. pad A interacts in Athletic
const padA = await ev(() => {
  const G = game; G.hero.behaviour = 'athletic'; atCupboard();
  const y0 = G.hero.pos.y;
  PAD.buttons[0] = { pressed: true }; G.step(1 / 60); PAD.buttons[0] = { pressed: false }; G.step(0.1);
  const r = { state: G.state, dy: +(G.hero.pos.y - y0).toFixed(2), dev: G.input.lastDevice };
  for (let i = 0; i < 40 && G.state !== 'play'; i++) { PAD.buttons[0] = { pressed: i % 2 === 0 }; G.step(0.05); }
  PAD.buttons[0] = { pressed: false }; G.step(0.2);
  r.ball = G.hero.hasBall; G.hero.behaviour = 'normal';
  return r;
});
check('pad A searches the cupboard in Athletic instead of jumping', padA.state === 'dialog' && padA.dy < 0.05 && padA.ball, padA);
// away from anything, A in Athletic still jumps
const jump = await ev(() => {
  const G = game; G.hero.behaviour = 'athletic'; const h = G.hero, c = G.rooms.house.center; h.pos.set(c.x, 0, c.z); h.onGround = true; G.step(0.3);
  const near = !!G.findInteractable(), y0 = h.pos.y;
  PAD.buttons[0] = { pressed: true }; G.step(1 / 60); PAD.buttons[0] = { pressed: false }; G.step(0.15);
  const r = { near, dy: +(h.pos.y - y0).toFixed(2) }; G.step(1); G.hero.behaviour = 'normal'; navigator.getGamepads = () => []; G.input.lastDevice = 'kbd';
  return r;
});
check('pad A with nothing in reach still jumps in Athletic', !jump.near && jump.dy > 0.2, jump);

// ---------------------------------------------------------------- 3. NPC gait
const gait = await ev(() => {
  const G = game, n = G.npcs.find((x) => x.def.id === 'arthur'), P = G.physics, out = {};
  // walk him outdoors, away from Twinsen (he is in the house)
  const run = (speed, block) => {
    const x0 = n.pos.x, z0 = n.pos.z;
    n.placeAt({ x: x0, z: z0, track: [{ op: 'goto', x: x0 + 40, z: z0, speed }] });
    const mv = P.move; if (block) P.move = (a, dx, dz) => (a === n ? undefined : mv.call(P, a, dx, dz));
    let anim = null; const sp = [], ps = [];
    for (let i = 0; i < 60; i++) { G.frame(1 / 60, false); sp.push(n.gait); ps.push([n.pos.x, n.pos.z]); anim = n.rig.anim; }
    P.move = mv;
    // the real speed over the last 1/6 s (collisions can slow him on the way)
    const a = ps.at(-11), b = ps.at(-1), real = Math.hypot(b[0] - a[0], b[1] - a[1]) * 6;
    n.placeAt({ x: x0, z: z0, track: null, anim: 'kneelWork' });
    return { real: +real.toFixed(2), gait: +(sp.slice(-10).reduce((s, v) => s + v, 0) / 10).toFixed(2), anim };
  };
  out.normal = run(1); out.slow = run(0.5); out.blocked = run(1, true);
  return out;
});
check('NPC gait matches the real speed', Math.abs(gait.normal.gait - gait.normal.real) < 0.15 && gait.normal.anim === 'walk', gait.normal);
check('a slow route walks slower', gait.slow.gait < gait.normal.gait * 0.65 && gait.slow.anim === 'walk', gait.slow);
check('a blocked walker stands instead of walking on the spot', gait.blocked.real < 0.05 && gait.blocked.anim !== 'walk', gait.blocked);

// ================================================================ CTRL-1: tank controls, follow camera, ball distance
// Measured by input (held keys, a placed mouse cursor), frame by frame, at 60 fps and at a simulated 30 fps (and with
// intermittent long frames through Game.advance). The LBA2 reference numbers (docs/COMBAT.md "Movement and camera")
// come from the 2021 GPL source (OBJECT.CPP ManualRealAngle, MOVE.CPP, INTEXT.CPP CameraCenter, PERSO.CPP, FICHE.CPP
// ThrowMagicBall, EXTRA.CPP InitFly) and the user's ANIM.HQR / RESS.HQR (the walk anims' root motion, the File3D
// F_THROW_MAGIC records). Every number is printed (MEASURE lines) so a run records them.
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
const LBA = {   // per behaviour: forward / back speed (m/s, H = 2.065 m), standing turn (°/s); walking turn 90°/s
  normal: { fwd: 2.0, back: 1.78, turn: 100 }, athletic: { fwd: 4.96, back: 2.36, turn: 169 },
  aggressive: { fwd: 2.52, back: 1.64, turn: 116 }, discreet: { fwd: 0.67, back: 0.67, turn: 90 },
};
const ONLY = process.env.ONLY || '';   // e.g. ONLY=camera,ball: just those CTRL-1 sections
const measure = (name, v) => console.log('MEASURE ' + name + ' ' + JSON.stringify(v));
await ev(() => {
  const G = game; G.settings.controls = 'classic'; G.applySettings();
  G.devArena(); G.step(0.3);
  for (const e of G.enemies) e.setPresent?.(false);
  const I = G.input, h = G.hero;
  window.K = {
    I, h,
    place(x, z, a, beh = 'normal') { h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.vel.set(0, 0); h.resetMotion?.(); h.onGround = true; h.vy = 0; h.behaviour = beh; h.actT = 0; h.hurtT = 0; h.invuln = 0; I.keys.clear(); G.resetCombat?.(); G.ball.reset?.(); G.step(0.3); },
    // hold keys for s seconds at a fixed frame time, recording a sample per frame
    run(codes, s, dt = 1 / 60, rec = null) { for (const c of codes) { I.keys.add(c); I.taps.add(c); } const out = []; for (let t = 0; t < s - 1e-9; t += dt) { G.frame(dt, false); out.push(rec ? rec() : null); } for (const c of codes) I.keys.delete(c); return out; },
    // the same through Game.advance (real frame times are split into ≤ 1/30 s steps): a 60 fps run with a long frame every 10
    runLong(codes, s) { for (const c of codes) { I.keys.add(c); I.taps.add(c); } let t = 0, i = 0; while (t < s - 1e-9) { const real = (++i % 10 === 0) ? 0.1 : 1 / 60; G.advance(real); t += real; } for (const c of codes) I.keys.delete(c); return t; },
  };
});

if (!ONLY || ONLY.includes('tank')) {
// ---------------------------------------------------------------- 4. Classic: turning
const turns = await ev(() => {
  const { h } = K, out = {};
  for (const beh of ['normal', 'athletic', 'aggressive', 'discreet']) {
    const o = (out[beh] = {});
    for (const dt of [1 / 60, 1 / 30]) {
      K.place(6190, 8, Math.PI / 2, beh);
      let a0 = h.angle; const ang = K.run(['ArrowLeft'], 1.0, dt, () => h.angle);
      const rate = (ang.at(-1) - a0) * 180 / Math.PI;
      // time to the full rate (no ramp = one frame)
      const per = ang.map((a, i) => (a - (i ? ang[i - 1] : a0)) / dt * 180 / Math.PI);
      const t90 = per.findIndex((v) => v >= rate * 0.9) * dt;
      K.place(6190, 8, Math.PI / 2, beh); a0 = h.angle; K.run(['ArrowLeft'], dt, dt); const tap = (h.angle - a0) * 180 / Math.PI;
      // walking turn: up to speed first, then up + left
      K.place(6190, 8, Math.PI / 2, beh); K.run(['ArrowUp'], 0.6, dt); a0 = h.angle; K.run(['ArrowUp', 'ArrowLeft'], 1.0, dt);
      const walk = (h.angle - a0) * 180 / Math.PI;
      o[dt < 0.02 ? 'f60' : 'f30'] = { stand: +rate.toFixed(1), standT90: +t90.toFixed(3), tapDeg: +tap.toFixed(2), walk: +walk.toFixed(1) };
    }
  }
  return out;
});
measure('classic turn (deg/s; tap = one frame)', turns);
for (const [b, o] of Object.entries(turns)) {
  check(`classic ${b}: standing turn ${LBA[b].turn}°/s (LBA2's turn anim), the same at 30 fps`, Math.abs(o.f60.stand - LBA[b].turn) < 6 && Math.abs(o.f30.stand - o.f60.stand) < 3, o);
  check(`classic ${b}: walking turn 90°/s (LBA2 ManualRealAngle), no input lag (full rate in the first frame)`, Math.abs(o.f60.walk - 90) < 4 && o.f60.standT90 <= 1 / 60 + 1e-6 && o.f30.standT90 <= 1 / 30 + 1e-6, o);
  check(`classic ${b}: a one-frame tap is a small correction (< 3°)`, o.f60.tapDeg > 0.5 && o.f60.tapDeg < 3, o.f60);
}

// ---------------------------------------------------------------- 5. Classic: start, stop, back-step, frame rates
const gaits = await ev(() => {
  const { h } = K, out = {};
  for (const beh of ['normal', 'athletic', 'aggressive', 'discreet']) {
    const o = (out[beh] = {});
    for (const dt of [1 / 60, 1 / 30]) {
      K.place(6190, 8, Math.PI / 2, beh);
      const x0 = h.pos.x;
      const sp = K.run(['ArrowUp'], 2.0, dt, () => h.speed);
      const full = sp.slice(-Math.round(0.5 / dt)).reduce((s, v) => s + v, 0) / Math.round(0.5 / dt);
      const t90 = (sp.findIndex((v) => v >= full * 0.9) + 1) * dt;
      const dist = h.pos.x - x0, xs = h.pos.x;
      const st = K.run([], 1.0, dt, () => h.speed);
      const tStop = (st.findIndex((v) => v < 0.05) + 1) * dt, stopDist = h.pos.x - xs;
      K.place(6200, 8, Math.PI / 2, beh); const xb = h.pos.x;
      const bs = K.run(['ArrowDown'], 2.0, dt, () => h.speed);
      const back = bs.slice(-Math.round(0.5 / dt)).reduce((s, v) => s + v, 0) / Math.round(0.5 / dt);
      o[dt < 0.02 ? 'f60' : 'f30'] = { full: +full.toFixed(2), t90: +t90.toFixed(3), dist2s: +dist.toFixed(2), tStop: +tStop.toFixed(3), stopDist: +stopDist.toFixed(2), back: +back.toFixed(2), backDir: +(h.pos.x - xb).toFixed(2), anim: h.rig.anim };
    }
    // intermittent long frames (0.1 s every tenth frame, through Game.advance): the same ground covered in the same time
    K.place(6190, 8, Math.PI / 2, beh); const x1 = h.pos.x; const T = K.runLong(['ArrowUp'], 2.0);
    o.long = { dist: +(h.pos.x - x1).toFixed(2), t: +T.toFixed(2) };
  }
  return out;
});
measure('classic gait (m/s, s, m)', gaits);
for (const [b, o] of Object.entries(gaits)) {
  check(`classic ${b}: walk ${LBA[b].fwd} m/s and back-step ${LBA[b].back} m/s (LBA2's anims)`, Math.abs(o.f60.full - LBA[b].fwd) < 0.1 && Math.abs(o.f60.back - LBA[b].back) < 0.1 && o.f60.backDir < 0, o.f60);
  check(`classic ${b}: quick start (90% by ${b === 'athletic' ? 0.5 : 0.2} s) and a short stop (< 0.25 s)`, o.f60.t90 <= (b === 'athletic' ? 0.5 : 0.2) && o.f60.tStop <= 0.25, o.f60);
  check(`classic ${b}: 30 fps and long frames cover the same ground (±3%)`, Math.abs(o.f30.dist2s - o.f60.dist2s) < Math.max(0.05, o.f60.dist2s * 0.03) && Math.abs(o.long.dist - o.f60.dist2s) < Math.max(0.05, o.f60.dist2s * 0.03), o);
}

// ---------------------------------------------------------------- 6. walls: the feet follow the ground really covered
const wall = await ev(() => {
  const { h } = K;
  // the arena's west wall (inner face at x ≈ 6185.25): walking straight into it, then along it at 45°
  K.place(6187, 8, -Math.PI / 2, 'normal'); const sp = K.run(['ArrowUp'], 2.0, 1 / 60, () => [h.speed, h.rig.anim]);
  const head = { x: +h.pos.x.toFixed(2), speed: +sp.at(-1)[0].toFixed(2), anim: sp.at(-1)[1], motion: h.motion ? { speed: +h.motion.speed.toFixed(2), blocked: h.motion.blocked } : null };
  K.place(6187, 8, -Math.PI / 4 * 3, 'normal'); const z0 = h.pos.z; const s2 = K.run(['ArrowUp'], 2.0, 1 / 60, () => h.speed);
  return { head, slide: { speed: +s2.at(-1).toFixed(2), dz: +(h.pos.z - z0).toFixed(2), x: +h.pos.x.toFixed(2) } };
});
measure('walls', wall);
check('into a wall: no walking on the spot (resolved speed ~0, idle)', wall.head.speed < 0.1 && wall.head.anim !== 'walk', wall.head);
check('along a wall at 45°: he slides along it', Math.abs(wall.slide.dz) > 1.5 && wall.slide.speed > 0.8, wall.slide);

}

if (!ONLY || ONLY.includes('ball')) {
// ---------------------------------------------------------------- 7. the ball: Classic arcs per behaviour, Modern aim
const ballFlight = `(() => {
  const G = game, b = G.ball, h = G.hero; const p0 = { x: h.pos.x, y: h.pos.y, z: h.pos.z };
  let t = 0, rel = null, apex = -1e9, first = null, bounces0 = null;
  for (let i = 0; i < 400 && !first; i++) {
    G.frame(window.__dt || 1 / 60, false); t += window.__dt || 1 / 60;
    if (b.state === 'fly') {
      if (!rel) { rel = { x: b.pos.x, y: b.pos.y, z: b.pos.z, t }; bounces0 = b.bounces; }
      apex = Math.max(apex, b.pos.y);
      if (b.bounces < bounces0) first = { x: b.pos.x, y: b.pos.y, z: b.pos.z, t };
    } else if (rel && b.state !== 'fly') first = { x: b.pos.x, y: b.pos.y, z: b.pos.z, t, end: b.state };
  }
  if (!rel || !first) return { rel: !!rel, first: !!first, state: b.state };
  return { dist: +Math.hypot(first.x - p0.x, first.z - p0.z).toFixed(2), time: +(first.t - rel.t).toFixed(2), apex: +(apex - rel.y).toFixed(2), relY: +(rel.y - p0.y).toFixed(2), land: [first.x, first.z] };
})()`;
const balls = await ev((flight) => {
  const G = game, { h } = K, out = {};
  for (const beh of ['discreet', 'normal', 'athletic', 'aggressive']) {
    const o = (out[beh] = {});
    for (const [k, hold, dt] of [['tap', 0, 1 / 60], ['tap30', 0, 1 / 30], ['charged', 1.2, 1 / 60]]) {
      K.place(6188, 8, Math.PI / 2, beh); h.mp = h.mpMax; h.magicLevel = 1; window.__dt = dt;
      K.I.keys.add('AltLeft'); K.I.taps.add('AltLeft'); G.frame(dt, false); if (hold) K.run([], hold, dt); K.I.keys.delete('AltLeft');
      o[k] = eval(flight);
    }
  }
  window.__dt = 1 / 60;
  return out;
}, ballFlight);
measure('classic ball (first contact on flat ground: m, s; apex above the release)', balls);
const bd = (b, k = 'tap') => balls[b][k].dist;
check('classic ball: each behaviour its own arc — Discreet the short lob, then Normal, Athletic, Aggressive the longest and flattest',
  bd('discreet') < bd('normal') - 1 && bd('normal') < bd('athletic') && bd('athletic') < bd('aggressive') && balls.discreet.tap.apex > 0.8 && balls.aggressive.tap.apex < 0.15, balls);
check('classic ball: the same landing at 30 fps (±0.3 m)', ['discreet', 'normal', 'athletic', 'aggressive'].every((b) => Math.abs(bd(b, 'tap30') - bd(b)) < 0.3), balls);
check('classic ball: a charged throw goes further', ['discreet', 'normal', 'athletic', 'aggressive'].every((b) => bd(b, 'charged') > bd(b) + 0.5), balls);

// Modern: the cursor on the ground ahead (near, middle, beyond the range): a charged throw lands where it points
const modern = await ev((flight) => {
  const G = game, { h, I } = K; G.settings.controls = 'modern'; G.applySettings();
  const out = {};
  const aimAt = (x, z) => {
    const v = new (G.camera.position.constructor)(x, G.physics.groundAt(x, z), z); G.camera.updateMatrixWorld(); v.project(G.camera);
    const r = G.renderer.canvas.getBoundingClientRect();
    Object.assign(I.mouse, { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, inside: true, lastMove: performance.now() }); I.lastDevice = 'kbd';
  };
  for (const beh of ['discreet', 'normal', 'athletic', 'aggressive']) {
    const o = (out[beh] = {});
    for (const d of [3, 6, 9, 30]) {
      for (const hold of [1.2, 0]) {
        K.place(6188, 8, Math.PI / 2, beh); h.mp = h.mpMax; G.step(0.1);
        aimAt(6188 + d, 8); G.step(0.05);
        I.keys.add('KeyF'); I.taps.add('KeyF'); G.frame(1 / 60, false);
        let prev = null;
        if (hold) { for (let t = 0; t < hold; t += 1 / 60) { aimAt(6188 + d, 8); G.frame(1 / 60, false); } const ring = G.ball.landMark; prev = ring?.visible ? +Math.hypot(ring.position.x - 6188, ring.position.z - 8).toFixed(2) : G.ball.dots.filter((q) => q.visible).length; }
        I.keys.delete('KeyF');
        const r = eval(flight);
        o[(hold ? 'charged' : 'tap') + d] = { ...r, preview: prev };
      }
    }
  }
  G.settings.controls = 'classic'; G.applySettings(); I.mouse.inside = false;
  return out;
}, ballFlight);
measure('modern ball aimed at 3 / 6 / 9 / 30 m (first contact m, s, apex; preview = the landing marker\'s distance)', modern);
// The automatic aim at enemies stays exactly as it was (the user: "the ball aimed itself at them… keep it"): with an
// enemy in the aim cone the throw goes to the enemy — whatever distance the cursor asks for, in Classic and in Modern,
// tapped or charged — with the same flight as before CTRL-1 (13 m/s across in Normal, gravity 22 m/s²)
const auto = await ev(() => {
  const G = game, { h, I } = K, d = G.enemies.find((e) => e.id === 'a_dummy'), out = {};
  const aimAt = (x, z) => {
    const v = new (G.camera.position.constructor)(x, G.physics.groundAt(x, z), z); G.camera.updateMatrixWorld(); v.project(G.camera);
    const r = G.renderer.canvas.getBoundingClientRect();
    Object.assign(I.mouse, { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, inside: true, lastMove: performance.now() }); I.lastDevice = 'kbd';
  };
  const B = G.ball, orig = B.launch.bind(B);
  for (const [scheme, key, aimD, hold] of [['modern', 'KeyF', 3, 0], ['modern', 'KeyF', 3, 1.2], ['modern', 'KeyF', 20, 0], ['classic', 'AltLeft', 0, 0], ['classic', 'AltLeft', 0, 1.2]]) {
    G.settings.controls = scheme; G.applySettings();
    K.place(6188, 8, Math.PI / 2, 'normal'); h.mp = h.mpMax;
    // the dummy 8 m off, 15° to the left of the aim line (inside the Normal assist cone)
    d.setPresent(true); d.pos.set(6188 + Math.cos(0.26) * 8, 0, 8 + Math.sin(0.26) * 8); d.hits = 0; d.sync(); G.step(0.1);
    let shot = null; B.launch = (...a) => { orig(...a); shot = { target: a[3].target === d, vx: +Math.hypot(B.vel.x, B.vel.z).toFixed(2), grav: B.grav }; };
    if (scheme === 'modern') aimAt(6188 + aimD, 8); else I.mouse.inside = false;
    I.keys.add(key); I.taps.add(key); G.frame(1 / 60, false);
    for (let t = 0; t < hold; t += 1 / 60) { if (scheme === 'modern') aimAt(6188 + aimD, 8); G.frame(1 / 60, false); }
    I.keys.delete(key);
    for (let i = 0; i < 180 && !d.hits; i++) G.frame(1 / 60, false);
    B.launch = orig; out[`${scheme}${aimD ? '@' + aimD + 'm' : ''}${hold ? ' charged' : ''}`] = { ...shot, hits: d.hits };
    G.step(2.5);
  }
  d.setPresent(false); G.settings.controls = 'classic'; G.applySettings(); I.mouse.inside = false;
  return out;
});
measure('auto-aim at an enemy 8 m off, 15° beside the aim', auto);
for (const [k, o] of Object.entries(auto)) check(`auto-aim kept (${k}): the throw goes to the enemy and hits, with the pre-CTRL-1 flight`, o.target && o.hits > 0 && o.grav === 22 && Math.abs(o.vx - (k.includes('charged') ? 16.9 : 13)) < 0.05, o);

for (const [b, o] of Object.entries(modern)) {
  check(`modern ${b}: near and far aim land where aimed (3 m, 6 m within 0.6 m)`, Math.abs(o.charged3.dist - 3) < 0.6 && Math.abs(o.charged6.dist - 6) < 0.6 && Math.abs(o.tap3.dist - 3) < 0.6, o);
  check(`modern ${b}: beyond the range it lands at the behaviour's max range, further than a near aim`, o.charged30.dist > o.charged6.dist && o.charged30.dist < 16, o.charged30);
  check(`modern ${b}: the charge preview marks the landing point (±0.6 m)`, typeof o.charged6.preview === 'number' && Math.abs(o.charged6.preview - o.charged6.dist) < 0.6, { preview: o.charged6.preview, dist: o.charged6.dist });
}

}

if (!ONLY || ONLY.includes('camera')) {
// ---------------------------------------------------------------- 8. the follow camera (LBA view, Classic), Citadel
// A repeatable route on open ground: walk 3 s, a walking turn 2 s, walk 2 s, stop 1 s, Athletic run 3 s, a running
// turn 1.5 s, stop 1.5 s, a turn on the spot 2 s. Recorded each frame: the camera's position, where it looks, Twinsen
// on screen (NDC) and the yaw. At 60 fps and 30 fps.
const camRec = `(() => {
  const G = game, C = G.camRig, h = G.hero, cp = G.camera.position;
  const v = h.pos.clone(); v.y += 0.9; G.camera.updateMatrixWorld(); v.project(G.camera);
  window.__cam.push({ p: [cp.x, cp.y, cp.z], look: [C.look.x, C.look.y, C.look.z], hero: [h.pos.x, h.pos.y, h.pos.z], ndc: [v.x, v.y], yaw: C.yaw, v: [h.vel.x, h.vel.y], sp: h.speed });
})()`;
const camStats = `((S, dt) => {
  let acc = [], yawRate = 0, nMax = 0, out = 0, behind = 0, ahead = 0, nMove = 0, aY = [];
  for (let i = 1; i < S.length - 1; i++) {
    const a = [0, 1, 2].map((k) => (S[i + 1].p[k] - 2 * S[i].p[k] + S[i - 1].p[k]) / (dt * dt));
    acc.push(Math.hypot(a[0], a[1], a[2])); aY.push(Math.abs(a[1]));
    yawRate = Math.max(yawRate, Math.abs(Math.atan2(Math.sin(S[i].yaw - S[i - 1].yaw), Math.cos(S[i].yaw - S[i - 1].yaw))) / dt);
  }
  for (const s of S) {
    nMax = Math.max(nMax, Math.abs(s.ndc[0]), Math.abs(s.ndc[1]));
    if (s.ndc[0] < -0.75 || s.ndc[0] > 0.68 || s.ndc[1] < -0.79 || s.ndc[1] > 0.66) out++;
    const vv = Math.hypot(s.v[0], s.v[1]);
    if (vv > 0.5 && s.sp > 0.5) { const along = ((s.look[0] - s.hero[0]) * s.v[0] + (s.look[2] - s.hero[2]) * s.v[1]) / vv; behind = Math.min(behind, along); ahead += along; nMove++; }
  }
  const q = (arr, f) => { const b = [...arr].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * f))] || 0; };
  return { frames: S.length, maxNdc: +nMax.toFixed(2), outOfBox: out, lead: +(ahead / Math.max(1, nMove)).toFixed(2), worstBehind: +behind.toFixed(2),
    accP95: +q(acc, 0.95).toFixed(1), accMax: +Math.max(...acc).toFixed(1), accYMax: +Math.max(...aY).toFixed(1), yawRateMax: +(yawRate * 180 / Math.PI).toFixed(1) };
})`;
const cam = await ev(({ camRec, camStats }) => {
  const G = game, h = G.hero, I = K.I, C = G.camRig, PH = G.physics;
  G.settings.controls = 'classic'; G.settings.camera = 'lba'; G.applySettings();
  const segs = [['normal', ['ArrowUp'], 3], ['normal', ['ArrowUp', 'ArrowLeft'], 2], ['normal', ['ArrowUp'], 2], ['normal', [], 1], ['athletic', ['ArrowUp'], 3], ['athletic', ['ArrowUp', 'ArrowRight'], 1.5], ['athletic', [], 1.5], ['normal', ['ArrowLeft'], 2]];
  // Where: the most open 30 m line (walkable by the harness' own step test), away from people, with open ground round
  // its middle (the route turns and runs on: dry, within 4 m of the start's height, no walls within 10 m, no tower or
  // high wall within 26 m — the hidden swing has its own check below); Citadel first, then the other open regions.
  // The best few are walked once: the first where he neither falls (a cliff, the sea) nor is put back is the route.
  let start = null, tried = 0;
  for (const rid of [null, 'desert', 'zeelich', 'hamalayi']) {
    if (rid && !G.rooms[rid]) continue;
    if (rid) G.enterRoom(rid, null, true); else G.exitRoom({ x: -40, z: -5 }, true);
    G.step(0.5);
    const cx = rid ? h.pos.x : -40, cz = rid ? h.pos.z : -5, cands = [];
    for (let x = cx - 120; x <= cx + 120; x += 4) for (let z = cz - 120; z <= cz + 120; z += 4) {
      const y0 = PH.groundAt(x, z); if (y0 < 0.3) continue;
      if (G.npcs.some((n) => n.present && Math.hypot(n.pos.x - x, n.pos.z - z) < 40)) continue;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, sx = Math.sin(a), sz = Math.cos(a); let y = y0, ok = true;
        for (let d = 0.5; d <= 30 && ok; d += 0.5) { const ny = P._stepTo(x + sx * (d - 0.5), y, z + sz * (d - 0.5), x + sx * d, z + sz * d); if (ny == null || Math.abs(ny - y0) > 1.5) ok = false; else y = ny; }
        if (!ok) continue;
        let bad = 0;
        for (let ox = -20; ox <= 20; ox += 2) for (let oz = -20; oz <= 20; oz += 2) {
          if (ox * ox + oz * oz > 400) continue;
          const px = x + sx * 14 + ox, pz = z + sz * 14 + oz, gy = PH.groundAt(px, pz, y0 + 3);
          if (Math.abs(gy - y0) > 4 || gy < 0.6 || (ox * ox + oz * oz <= 100 && PH.blockedAt(px, pz, gy + 0.5, 0.3))) bad++;
        }
        const mx = x + sx * 14, mz = z + sz * 14;
        for (const c of PH.colliders) if (c.enabled && !c.fades && !c.seeThrough && !(c.type === 'cyl' && c.r < 1.5) && c.top > y0 + 3 && Math.hypot(c.x - mx, c.z - mz) < 26) bad += 3;
        if (bad <= 2) cands.push({ room: rid || 'citadel', x, z, a, bad });
      }
    }
    cands.sort((p, q) => p.bad - q.bad);
    for (const c of cands.slice(0, 6)) {
      tried++;
      h.pos.set(c.x, PH.groundAt(c.x, c.z), c.z); h.angle = c.a; h.resetMotion?.(); C.lba.init = false; G.step(0.5);
      const y0 = h.pos.y; let ok = true, px = h.pos.x, pz = h.pos.z;
      for (const [beh, keys, sd] of segs) {
        h.behaviour = beh; for (const k of keys) I.keys.add(k);
        for (let t = 0; t < sd && ok; t += 1 / 60) { G.frame(1 / 60, false); if (Math.hypot(h.pos.x - px, h.pos.z - pz) > 1 || h.pos.y < y0 - 3 || (!h.onGround && h.vy < -6)) ok = false; px = h.pos.x; pz = h.pos.z; }
        for (const k of keys) I.keys.delete(k);
      }
      if (ok) { start = c; break; }
    }
    if (start) break;
  }
  if (!start) return { start: null, tried };
  const out = { start };
  for (const dt of [1 / 60, 1 / 30]) {
    h.pos.set(start.x, G.physics.groundAt(start.x, start.z), start.z); h.angle = start.a; h.vel.set(0, 0); h.resetMotion?.(); h.behaviour = 'normal';
    C.lba.init = false; for (let t = 0; t < 1; t += dt) G.frame(dt, false);
    window.__cam = []; const marks = [];
    for (const [beh, keys, s] of segs) {
      h.behaviour = beh; marks.push(window.__cam.length);
      for (const c of keys) { I.keys.add(c); I.taps.add(c); }
      for (let t = 0; t < s - 1e-9; t += dt) { G.frame(dt, false); eval(camRec); }
      for (const c of keys) I.keys.delete(c);
    }
    const S = window.__cam, st = eval(camStats)(S, dt);
    // after stopping: how far the view drifts on (swimming); during the turn on the spot: how far it moves at all
    const drift = (i0, i1) => Math.hypot(S[i1 - 1].p[0] - S[i0].p[0], S[i1 - 1].p[2] - S[i0].p[2]);
    st.driftAfterStop = +drift(marks[3] + Math.round(0.3 / dt), marks[4]).toFixed(2);
    st.moveTurnOnSpot = +drift(marks[7], S.length).toFixed(2);
    out[dt < 0.02 ? 'f60' : 'f30'] = st;
  }
  return out;
}, { camRec, camStats });
measure('camera route (LBA view; NDC; m; m/s²; °/s)', cam);
check('camera: found an open route (Citadel first)', !!cam.start, cam);
if (cam.start) for (const k of ['f60', 'f30']) {
  const c = cam[k];
  check(`camera ${k}: Twinsen stays well inside LBA2's frame box`, c.outOfBox === 0 && c.maxNdc < 0.7, c);
  check(`camera ${k}: it leads on average and never trails him by more than 2.5 m (a running turn)`, c.worstBehind > -2.5 && c.lead > 0, c);
  // (his own start in Athletic is 11 m/s², and a walking turn swings the aim point round at ~8 m/s²: the view never
  // jerks harder than he moves; before CTRL-1 the re-centring lurches measured 95% ≤ 411, max 5386)
  check(`camera ${k}: smooth — no lurch (camera acceleration ≤ 25 m/s², 95% ≤ 12)`, c.accMax <= 25 && c.accP95 <= 12, c);
  check(`camera ${k}: no snap — the view never turns with his turns, at most an eased 60°/s swing when a wall hides him`, c.yawRateMax <= 61, c);
  check(`camera ${k}: still when he stops and when he turns on the spot`, c.driftAfterStop < 0.6 && c.moveTurnOnSpot < 0.05, c);
}

// hidden behind a tower or a wall (not a tree: he shows between its leaves; houses fade, VP-10): the view turns just far
// enough round to show him, eased (≤ 60°/s), never a cut
const hidden = await ev(({ camRec, camStats }) => {
  const G = game, h = G.hero, C = G.camRig, PH = G.physics;
  if (G.room) { G.exitRoom({ x: -40, z: -5 }, true); G.step(0.3); }
  const big = PH.colliders.filter((c) => c.enabled && !c.fades && !c.seeThrough && c.top > 6 && (c.type === 'cyl' ? c.r >= 1.5 : Math.min(c.hw || 0, c.hd || 0) >= 1.5));
  for (const c of big) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, R = (c.type === 'cyl' ? c.r : Math.max(c.hw, c.hd)) + 1.6, x = c.x + Math.sin(a) * R, z = c.z + Math.cos(a) * R;
    const gy = PH.groundAt(x, z, c.top); if (gy < 0.5 || gy > c.top - 4 || PH.blockedAt(x, z, gy + 0.5, 0.45)) continue;
    h.pos.set(x, gy, z); h.angle = a; h.vel.set(0, 0); h.resetMotion?.(); h.onGround = true; C.lba.init = false;
    G.frame(1 / 60, false);
    const cp = Math.cos(C.pitch), sn = Math.sin(C.pitch), toCam = () => Math.atan2(G.camera.position.x - h.pos.x, G.camera.position.z - h.pos.z);
    const dH = () => Math.hypot(G.camera.position.x - h.pos.x, G.camera.position.z - h.pos.z) / cp, seen = () => C.occluded(h.pos, cp, sn, toCam(), dH(), true) >= dH() - 0.5;
    if (seen()) continue;
    window.__cam = []; const y0 = C.yaw;
    for (let t = 0; t < 4; t += 1 / 60) { G.frame(1 / 60, false); eval(camRec); }
    const st = eval(camStats)(window.__cam, 1 / 60);
    return { at: [+x.toFixed(1), +z.toFixed(1)], swing: +(Math.abs(Math.atan2(Math.sin(C.yaw - y0), Math.cos(C.yaw - y0))) * 180 / Math.PI).toFixed(1), seen: seen(), yawRateMax: st.yawRateMax, accMax: st.accMax, maxNdc: st.maxNdc };
  }
  return { at: null };
}, { camRec, camStats });
measure('camera hidden behind something solid', hidden);
check('camera: hidden behind a tower, it swings round just enough to show him, eased', hidden.at && hidden.seen && hidden.swing >= 14 && hidden.swing <= 91 && hidden.yawRateMax <= 61 && hidden.accMax <= 40, hidden);

// stairs (a flight on a Zeelich island's decks) and the ground under him: the view glides up, no bob
const stairs = await ev(({ camRec, camStats }) => {
  const G = game, h = G.hero, I = K.I, C = G.camRig, PH = G.physics;
  const ids = Object.keys(G.rooms).filter((id) => G.rooms[id].outdoor && id.startsWith('isle_'));
  for (const id of ids) {
    G.enterRoom(id, null, true); G.step(0.3);
    const st = (PH.colliders || []).filter((c) => c.stair && c.enabled && Math.hypot(c.x - h.pos.x, c.z - h.pos.z) < 300);
    if (st.length < 4) continue;
    // one flight: the steps sharing the lowest step's foot
    const s0 = st.reduce((a, b) => (b.top < a.top ? b : a));
    const fl = st.filter((c) => Math.abs(c.bottom - s0.bottom) < 0.01 && Math.hypot(c.x - s0.x, c.z - s0.z) < 8).sort((a, b) => a.top - b.top);
    if (fl.length < 4) continue;
    const lo = fl[0], hi = fl.at(-1), L = Math.hypot(hi.x - lo.x, hi.z - lo.z), dx = (hi.x - lo.x) / L, dz = (hi.z - lo.z) / L;
    const out = { room: id, steps: fl.length, rise: +(hi.top - lo.bottom - 0.6).toFixed(2) };
    for (const dt of [1 / 60, 1 / 30]) {
      const sx = lo.x - dx * 1.6, sz = lo.z - dz * 1.6;
      h.pos.set(sx, PH.groundAt(sx, sz, lo.top), sz); h.angle = Math.atan2(dx, dz); h.vel.set(0, 0); h.resetMotion?.(); h.behaviour = 'normal'; h.onGround = true;
      C.lba.init = false; for (let t = 0; t < 1; t += dt) G.frame(dt, false);
      window.__cam = []; const y0 = h.pos.y;
      I.keys.add('ArrowUp'); for (let t = 0; t < (L + 3.2) / 2.0 + 0.5; t += dt) { G.frame(dt, false); eval(camRec); } I.keys.delete('ArrowUp');
      for (let t = 0; t < 1; t += dt) { G.frame(dt, false); eval(camRec); }
      const S = window.__cam, s = eval(camStats)(S, dt);
      out[dt < 0.02 ? 'f60' : 'f30'] = { climbed: +(h.pos.y - y0).toFixed(2), maxNdc: s.maxNdc, outOfBox: s.outOfBox, accYMax: s.accYMax, accMax: s.accMax, accP95: s.accP95 };
    }
    G.exitRoom({ x: -40, z: -5 }, true); G.step(0.3);
    return out;
  }
  return { room: null };
}, { camRec, camStats });
measure('camera on stairs (m; m/s²)', stairs);
check('camera stairs: a flight found and climbed', !!stairs.room && stairs.f60?.climbed > 1, stairs);
if (stairs.room) for (const k of ['f60', 'f30']) check(`camera stairs ${k}: no bob — vertical acceleration ≤ 6 m/s², Twinsen in frame`, stairs[k].accYMax <= 6 && stairs[k].outOfBox === 0, stairs[k]);

}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
