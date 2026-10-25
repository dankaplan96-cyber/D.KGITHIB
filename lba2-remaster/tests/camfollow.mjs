// CONTROL-FEEL (WORKLIST #31): the Follow camera, the third choice in Settings → Camera (the user: "when I turn round he
// runs toward me, which is strange"). By input (the keys a player presses), at 60 fps, on open ground on Citadel:
//   1. the setting: three choices, LBA2 the default for a new player, Follow chosen by a click and kept after a reload,
//      an unknown saved value falls back to LBA2
//   2. a sustained walk one way turns the view round behind him (Classic and Modern controls), eased: no frame turns
//      it more than 0.8° (≤ 48°/s), no jolt; the LBA2 view on the same walk never turns
//   3. no swing while he stands, turns on the spot, makes short corrections, runs less than a second, or fights with a
//      lock-on; indoors (the iso rooms) nothing changes
//   4. Modern controls: while the view swings, the held direction keeps his way (the stick's heading is kept until it
//      is let go): he runs straight, the view comes round behind him
// SHOTS=<dir> writes a few frames of the swing (docs/lba3-production/reviews/CONTROL-FEEL/). GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS || '';
const { browser, context, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');

// ---------------------------------------------------------------- 1. the setting
const set0 = await ev(() => ({ cam: game.settings.camera, opts: [...document.querySelectorAll('[data-setting="camera"] button')].map((b) => [b.dataset.v, b.textContent.trim()]) }));
check('Settings → Camera offers three choices: Fixed (LBA2), Follow, Free; a new player starts on LBA2', set0.cam === 'lba' && set0.opts.map((o) => o[0]).join() === 'lba,follow,free' && set0.opts[1][1] === 'Follow', set0);
await ev(() => document.querySelector('[data-setting="camera"] [data-v="follow"]').click());
const set1 = await ev(() => ({ cam: game.settings.camera, rig: game.camRig.mode, on: document.querySelector('[data-setting="camera"] [data-v="follow"]').classList.contains('on'),
  stored: Object.keys(localStorage).filter((k) => /"camera":"follow"/.test(localStorage.getItem(k) || '')) }));
check('a click on Follow chooses it (the camera follows) and stores it', set1.cam === 'follow' && set1.rig === 'follow' && set1.on && set1.stored.length === 1, set1);
const he = await ev(() => { game.settings.lang = 'he'; game.applySettings(); const t = document.querySelector('[data-setting="camera"] [data-v="follow"]').textContent.trim(); game.settings.lang = 'en'; game.applySettings(); return t; });
check('the Hebrew label is "עוקבת"', he === 'עוקבת', he);

await menu(page, 'new');
await ev(() => {
  const G = game, I = G.input, h = G.hero, C = G.camRig, dt = 1 / 60;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true });
  const deg = (a) => (a * 180) / Math.PI, ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  window.F = {
    dt, deg, ad,
    cam(m) { G.settings.camera = m; G.applySettings(); C.cut = false; },
    place(s, a) { G.exitRoom({ x: s.x, z: s.z, a }, true, true); G.step(0.3); h.pos.set(s.x, G.physics.groundAt(s.x, s.z), s.z); h.angle = a; h.resetMotion(); h.vy = 0; h.onGround = true; h.behaviour = 'normal'; C.snap(); for (let t = 0; t < 1; t += dt) G.frame(dt, false); },
    // hold keys for s seconds; per frame: the view's heading and its change, his way, the camera's acceleration
    hold(keys, s, rec) { for (const k of keys) { I.keys.add(k); I.taps.add(k); } for (let t = 0; t < s - 1e-9; t += dt) { G.frame(dt, false); rec?.(); } for (const k of keys) I.keys.delete(k); },
    rec() {
      const R = { yaw0: C.yaw, maxStep: 0, acc: 0, p: [], swingBy: new Set(), modes: new Set(), heroA: [] };
      R.fn = () => {
        const y = C.yaw, p = G.camera.position.clone();
        R.maxStep = Math.max(R.maxStep, Math.abs(deg(ad(R.prevYaw ?? y, y)))); R.prevYaw = y;
        R.p.push(p); if (R.p.length >= 3) { const [a, b, c] = R.p.slice(-3); R.acc = Math.max(R.acc, c.clone().sub(b).sub(b.clone().sub(a)).length() / (dt * dt)); }
        const sw = C.lba.fol?.swings ?? 0; if (sw > (R.sw0 ??= sw)) { R.swingBy.add('follow'); R.sw0 = sw; } if (C.why.swingBy && C.why.swingBy !== 'follow') R.swingBy.add(C.why.swingBy); R.modes.add(C.why.mode); R.heroA.push(Math.atan2(h.vel.x, h.vel.y));
      };
      return R;
    },
    // the view's heading against "behind him" (his way of moving + π), in degrees
    offBehind() { const way = Math.atan2(h.vel.x, h.vel.y); return +Math.abs(deg(ad(C.yaw, way + Math.PI))).toFixed(1); },
    turned(R) { return +Math.abs(deg(ad(R.yaw0, C.yaw))).toFixed(1); },
  };
  // open ground for an 18 m run: walkable all the way (the harness' own step test), dry, no wall within 2 m of it and
  // nothing tall within 12 m of its middle that could hide him (the Follow view must be free to come round)
  const P0 = G.physics, out = [];
  for (let x = -100; x <= 20; x += 4) for (let z = -60; z <= 60; z += 4) {
    const y0 = P0.groundAt(x, z); if (y0 < 0.3) continue;
    if (G.npcs.some((n) => n.present && Math.hypot(n.pos.x - x, n.pos.z - z) < 20)) continue;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4, sx = Math.sin(a), sz = Math.cos(a); let y = y0, ok = true;
      for (let d = 0.5; d <= 20 && ok; d += 0.5) { const ny = P._stepTo(x + sx * (d - 0.5), y, z + sz * (d - 0.5), x + sx * d, z + sz * d); if (ny == null || Math.abs(ny - y0) > 1.2 || ny < 0.3) ok = false; else y = ny; for (const o of [-1.2, 1.2]) if (ok && P0.blockedAt(x + sx * d + sz * o, z + sz * d - sx * o, ny + 0.3, 0.3)) ok = false; }
      if (!ok) continue;
      const mx = x + sx * 9, mz = z + sz * 9;
      if (P0.colliders.some((c) => c.enabled && !c.fades && !c.seeThrough && !(c.type === 'cyl' && c.r < 1.5) && c.top > y0 + 3 && Math.hypot(c.x - mx, c.z - mz) < 10)) continue;
      out.push({ x, z, a });
    }
  }
  window.F.spots = out;
});

const spot = await ev(() => {
  const { spots } = F, h = game.hero;
  for (const s of spots.slice(0, 40)) {
    F.cam('lba'); F.place(s, s.a); h.behaviour = 'athletic';
    const x0 = h.pos.x, z0 = h.pos.z; F.hold(['ArrowUp'], 3);
    const d = Math.hypot(h.pos.x - x0, h.pos.z - z0);
    if (d > 13) return { ...s, d: +d.toFixed(1), n: spots.length };
  }
  return { n: spots.length, none: true };
});
check('found open ground for an 18 m run on Citadel', !spot.none, spot);
if (!spot.none) {
// ---------------------------------------------------------------- 2. a sustained run turns the view behind him
const run = await ev(async ({ spot, shots }) => {
  const G = game, h = G.hero, C = G.camRig, out = {};
  for (const m of ['lba', 'follow']) {
    // standing at the start facing the run's way, turned 90° on the spot first (the view stays: he walks across it)
    F.cam(m); F.place(spot, spot.a + Math.PI / 2); h.behaviour = 'normal';
    F.hold(['ArrowLeft'], (Math.PI / 2) / (100 * Math.PI / 180));
    const R = F.rec(), t1 = [];
    F.hold(['ArrowUp'], 1.1, () => { R.fn(); }); const at09 = F.turned(R);
    F.hold(['ArrowUp'], 4.4, () => { R.fn(); t1.push(F.offBehind()); });
    if (m === 'follow' && shots) window.__shots = true;
    out[m] = { turnedBy09s: at09, turned: F.turned(R), offBehind: F.offBehind(), maxStepDeg: +R.maxStep.toFixed(2), accMax: +R.acc.toFixed(1), swingBy: [...R.swingBy], mode: [...R.modes] };
    G.step(1);
  }
  return out;
}, { spot, shots: !!SHOTS });
check('LBA2 view (the default): a run across the view never turns it', run.lba.turned < 0.5, run.lba);
check('Follow: nothing in the first 1.1 s of the run, then the view comes round behind him (within 12°)', run.follow.turnedBy09s < 0.5 && run.follow.offBehind <= 12 && run.follow.turned > 60 && run.follow.swingBy.includes('follow') && run.follow.mode.includes('follow'), run.follow);
check('Follow: eased, never a snap (≤ 0.8° a frame = 48°/s at 60 fps) and no jolt (camera acceleration ≤ 40 m/s²)', run.follow.maxStepDeg <= 0.8 && run.follow.accMax <= 40, run.follow);

// frames of the swing (docs/lba3-production/reviews/CONTROL-FEEL/)
if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await ev((spot) => { const h = game.hero; F.cam('follow'); F.place(spot, spot.a + Math.PI / 2); h.behaviour = 'normal'; F.hold(['ArrowLeft'], (Math.PI / 2) / (100 * Math.PI / 180)); game.frame(1 / 60, true); }, spot);
  for (const [i, t] of [[0, 0], [1, 1.4], [2, 1.4], [3, 1.4]]) {
    await ev((t) => { const I = game.input; I.keys.add('ArrowUp'); for (let s = 0; s < t - 1e-9; s += 1 / 60) game.frame(1 / 60, false); game.frame(1 / 60, true); }, t);
    await page.screenshot({ path: path.join(SHOTS, `follow-${i}-t${(i * 1.4).toFixed(1)}s.png`) });
  }
  await ev(() => { game.input.keys.clear(); game.step(1); });
}

// ---------------------------------------------------------------- 3. no swing: standing, turning, short moves, a fight
const calm = await ev((spot) => {
  const G = game, h = G.hero, C = G.camRig, I = G.input, out = {};
  F.cam('follow');
  // standing 3 s, a turn on the spot left 2.5 s and right 1.5 s
  F.place(spot, spot.a); let R = F.rec();
  F.hold([], 3, R.fn); F.hold(['ArrowLeft'], 2.5, R.fn); F.hold(['ArrowRight'], 1.5, R.fn);
  out.standTurn = F.turned(R);
  // short corrections (camsteady's): four 0.3 s steps, three walking turns of 0.6 s each with 0.5 s on
  F.place(spot, spot.a); R = F.rec();
  for (let i = 0; i < 4; i++) { F.hold(['ArrowUp'], 0.3, R.fn); F.hold([], 0.4, R.fn); }
  for (let i = 0; i < 3; i++) { F.hold(['ArrowUp', i % 2 ? 'ArrowLeft' : 'ArrowRight'], 0.6, R.fn); F.hold(['ArrowUp'], 0.5, R.fn); }
  F.hold([], 2, R.fn);
  out.corrections = F.turned(R); out.correctionsBy = [...R.swingBy];
  // runs of 0.7 s with a stop between, turned 60° each time (a zigzag)
  F.place(spot, spot.a); h.behaviour = 'athletic'; R = F.rec();
  for (let i = 0; i < 4; i++) { F.hold(['ArrowUp'], 0.7, R.fn); F.hold([], 0.3, R.fn); F.hold([i % 2 ? 'ArrowLeft' : 'ArrowRight'], 0.35, R.fn); }
  F.hold([], 1.5, R.fn);
  out.shortRuns = F.turned(R);
  // a lock-on: a mite ahead, locked (the focus key), then a run of 3 s across the view while locked
  const mite = G.enemies.find((e) => e.id?.startsWith('mite'));
  if (mite) {
    F.place(spot, spot.a + Math.PI / 2); h.behaviour = 'athletic';
    const mx = h.pos.x + Math.sin(h.angle) * 6, mz = h.pos.z + Math.cos(h.angle) * 6;
    mite.pos.set(mx, G.physics.groundAt(mx, mz), mz); mite.home = { x: mx, z: mz }; mite.setPresent(true); mite.hp = mite.maxHp;
    G.step(0.2); F.hold(['KeyL'], 1 / 60); G.frame(1 / 60, false);
    const locked0 = !!G.targeting.lock; R = F.rec(); let lockedAll = true;
    F.hold(['ArrowUp'], 3, () => { R.fn(); if (!G.targeting.lock) lockedAll = false; });
    out.lock = { locked0, lockedAll, turned: F.turned(R), swingBy: [...R.swingBy] };
    if (G.targeting.lock) G.targeting.release?.();
    mite.setPresent(false); G.step(0.5);
  } else out.lock = { none: true };
  return out;
}, spot);
check('Follow: still while he stands and turns on the spot', calm.standTurn < 0.5, calm);
check('Follow: no swing for short corrections (steps, short walking turns)', calm.corrections < 0.5, calm);
check('Follow: no swing for runs shorter than a second (a zigzag)', calm.shortRuns < 0.5, calm);
check('Follow: no swing while he fights with a lock-on', calm.lock.none || (calm.lock.locked0 && calm.lock.turned < 0.5 && !calm.lock.swingBy.includes('follow')), calm.lock);

// ---------------------------------------------------------------- 4. Modern controls: the held way stays his way
const modern = await ev((spot) => {
  const G = game, h = G.hero, C = G.camRig, out = {};
  G.settings.controls = 'modern'; G.applySettings(); F.cam('follow');
  // the view behind him at the start; he walks to the screen's left (the held arrow) for 5.5 s
  F.place(spot, spot.a - Math.PI / 2); h.behaviour = 'normal';
  const R = F.rec(); F.hold(['ArrowLeft'], 0.5, R.fn); const w0 = Math.atan2(h.vel.x, h.vel.y);
  F.hold(['ArrowLeft'], 5.0, R.fn); const w1 = Math.atan2(h.vel.x, h.vel.y);
  out.wayDrift = +Math.abs(F.deg(F.ad(w0, w1))).toFixed(1); out.turned = F.turned(R); out.offBehind = F.offBehind(); out.maxStepDeg = +R.maxStep.toFixed(2);
  // let go and push Up: now relative to the view behind him, so straight on
  G.step(0.3); F.hold(['ArrowUp'], 0.6); const w2 = Math.atan2(h.vel.x, h.vel.y); out.upAfter = +Math.abs(F.deg(F.ad(w1, w2))).toFixed(1);
  G.settings.controls = 'classic'; G.applySettings();
  return out;
}, spot);
check('Follow, Modern controls: the held arrow keeps his way while the view swings behind him (he walks straight)', modern.wayDrift <= 10 && modern.turned > 60 && modern.offBehind <= 15 && modern.maxStepDeg <= 0.8, modern);
check('Follow, Modern controls: let go and pushed Up, he goes on the way the view now looks', modern.upAfter <= 15, modern);

// ---------------------------------------------------------------- 5. indoors: the iso view, nothing follows
const iso = await ev(() => {
  const G = game, h = G.hero, C = G.camRig;
  F.cam('follow'); G.enterRoom('house', null, true); G.step(0.5);
  const c = G.room.center || { x: h.pos.x, z: h.pos.z }; h.pos.set(c.x - 2, G.physics.groundAt(c.x - 2, c.z), c.z); h.angle = Math.PI / 2; h.resetMotion(); G.step(0.5);
  const R = F.rec(); F.hold(['ArrowUp'], 0.8, R.fn); F.hold(['ArrowLeft'], 0.5, R.fn); F.hold(['ArrowUp'], 1.6, R.fn);
  const out = { room: G.room?.id, modes: [...R.modes], turned: F.turned(R), swingBy: [...R.swingBy] };
  G.exitRoom({ x: -40, z: -5 }, true); G.step(0.5);
  return out;
});
check('Follow indoors: the iso view, no follow swing', iso.room === 'house' && iso.modes.every((m) => m === 'iso') && !iso.swingBy.includes('follow'), iso);
}

// ---------------------------------------------------------------- 6. the stored choice after a restart; an unknown one
// (a fresh browser on the stored profile, as tests/lib/boot.mjs quitAndKeep does)
const state = path.join(os.tmpdir(), `camfollow-${process.pid}.json`);
await context.storageState({ path: state });
await page.waitForLoadState('networkidle').catch(() => {});   // (its models still loading when the browser closes read as failed requests)
await browser.close();
const B2 = await launch({ width: 640, height: 360, storageState: state });
await open(B2.page, '?nocine');
const set2 = await B2.page.evaluate(() => ({ cam: game.settings.camera, rig: game.camRig.mode }));
check('Follow is kept after a restart', set2.cam === 'follow' && set2.rig === 'follow', set2);
await B2.page.evaluate(() => { for (const k of Object.keys(localStorage)) { const v = localStorage.getItem(k) || ''; if (/"camera":"follow"/.test(v)) localStorage.setItem(k, v.replace('"camera":"follow"', '"camera":"orbit"')); } });
await B2.context.storageState({ path: state });
await B2.page.waitForLoadState('networkidle').catch(() => {});
await B2.browser.close();
const B3 = await launch({ width: 640, height: 360, storageState: state });
await open(B3.page, '?nocine');
const set3 = await B3.page.evaluate(() => ({ cam: game.settings.camera, rig: game.camRig.mode }));
check('an unknown stored camera falls back to LBA2', set3.cam === 'lba' && set3.rig === 'lba', set3);
await B3.page.waitForLoadState('networkidle').catch(() => {});
await B3.browser.close();
fs.rmSync(state, { force: true });
done();
