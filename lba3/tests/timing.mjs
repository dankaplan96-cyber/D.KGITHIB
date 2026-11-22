// Frame-rate independence and instrumentation (review fixes), in the developer arena, driving the real loop
// body (game.advance(realSeconds)) as rAF would at a given frame rate:
//   1. walking distance and a sword swing's duration are the same at 144, 120, 60, 30, 20, 15 and 10 fps
//      (before: dt was clamped to 50 ms, so below 20 fps everything ran in slow motion)
//   2. a long stall is dropped, not caught up (bounded steps), and the next frames are normal
//   3. a press on a slow frame (several steps) acts once
//   4. a volume slider event rebuilds nothing and does not cut the camera; a quality change does resize
//   5. game.perf.stats() and game.loadTimes report sensible numbers
//   6. the frame-rate limit on synthetic displays (FRAME-1)
//   7. every screen (PACE-ALL, FPS30.md §12): 30 / 60 / Unlimited on 50 … 240 Hz, Unlimited's even pace, a screen move
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = watch(page);
const ev = (f, a) => page.evaluate(f, a);
const { check, done } = checker({ info: 'always' });

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => {
  const G = window.game; G.testFreeze = true; G.settings.controls = 'modern'; G.applySettings(); // (WASD walks)
  G.devArena();
  window.X = {
    // run `seconds` of real time at `fps`, through the loop's own real-time → simulation path (no render here:
    // the swiftshader renderer is too slow to matter; Game.advance renders on the last step of each frame)
    run(seconds, fps, each) { const n = Math.round(seconds * fps); for (let i = 0; i < n; i++) { X.adv(1 / fps); each?.(i); } },
    adv(real) { const f = G.frame.bind(G); G.frame = (dt, render) => f(dt, false); try { G.advance(real); } finally { G.frame = f; } },
    reset(a = 0) {
      const h = G.hero; h.pos.set(6190, G.physics.groundAt(6190, 8), 8); h.angle = a; h.vel?.set(0, 0); h.hp = h.maxHp; h.actT = 0; h.hurtT = 0;
      for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(false);
      G.resetCombat(); G.state = 'play'; G.input.keys.clear(); G.step(0.3);
    },
  };
});

// ---------------------------------------------------------------- 1. distance and duration across frame rates
const rates = [60, 144, 120, 30, 20, 15, 10];   // (FRAME-1: 120/144 Hz displays too)
const fr = await ev((rates) => {
  const G = game, h = G.hero, out = {};
  for (const fps of rates) {
    X.reset(0);
    const x0 = h.pos.x, z0 = h.pos.z;
    G.input.keys.add('KeyW'); X.run(1.0, fps); G.input.keys.delete('KeyW');
    const walk = Math.hypot(h.pos.x - x0, h.pos.z - z0);
    X.reset(0); X.run(0.2, fps);
    h.combat.equip('sword', true);
    G.input.keys.add('KeyK'); G.input.taps.add('KeyK'); X.adv(1 / fps); G.input.keys.delete('KeyK');
    let t = 1 / fps; while (h.combat.busy && t < 3) { X.adv(1 / fps); t += 1 / fps; }
    out[fps] = { walk: +walk.toFixed(2), swing: +t.toFixed(3) };
  }
  // what the old loop did (dt clamped to 50 ms, nothing else) at 10 fps, for the record
  X.reset(0); const x0 = h.pos.x, z0 = h.pos.z;
  G.input.keys.add('KeyW'); for (let i = 0; i < 10; i++) G.frame(Math.min(0.05, 1 / 10), false); G.input.keys.delete('KeyW');
  out.old10 = { walk: +Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2) };
  return out;
}, rates);
const ref = fr[60];
for (const fps of rates.slice(1)) {
  check(`${fps} fps: walking covers the same ground in 1 s as at 60`, Math.abs(fr[fps].walk - ref.walk) / ref.walk < 0.06, { at60: ref, ['at' + fps]: fr[fps] });
  check(`${fps} fps: a sword swing lasts as long as at 60`, Math.abs(fr[fps].swing - ref.swing) <= 1 / fps + 0.02, { at60: ref.swing, ['at' + fps]: fr[fps].swing });
}
console.log('       (the old loop at 10 fps walked', fr.old10.walk, 'm in 1 s against', ref.walk, 'at 60)');

// ---------------------------------------------------------------- 2. a stall
const stall = await ev(() => {
  const G = game, h = G.hero; X.reset(0); G.perf.reset();
  G.input.keys.add('KeyW'); X.run(1.0, 60);   // (up to full walking speed first)
  const pb = h.pos.clone(); X.run(0.25, 60); const before = h.pos.distanceTo(pb) / 0.25;
  const p0 = h.pos.clone(); X.adv(1.5); const jump = h.pos.distanceTo(p0);
  const s1 = G.perf.stats(1);
  const p1 = h.pos.clone(); X.run(0.25, 60); const after = h.pos.distanceTo(p1) / 0.25;
  G.input.keys.delete('KeyW');
  return { jump: +jump.toFixed(2), steps: s1.steps.max, lost: s1.lostS, speedBefore: +before.toFixed(2), speedAfter: +after.toFixed(2) };
});
check('a 1.5 s stall is simulated as at most 4 steps; the rest is dropped', stall.steps === 4 && stall.lost > 1.3 && stall.jump < 0.4, stall);
// (FRAME-1: compared with the walk just before the stall; the old fixed window 2–2.7 m/s (exclusive) predates CTRL-1's
// LBA2 walking speed of 2.0 m/s, so it failed at exactly full speed)
check('...and the frames after it move at normal speed (as fast as just before it, ±5 %)', stall.speedBefore > 1.5 && Math.abs(stall.speedAfter - stall.speedBefore) <= stall.speedBefore * 0.05, stall);

// ---------------------------------------------------------------- 3. one press on a slow frame acts once
const once = await ev(() => {
  const G = game, h = G.hero, B = G.ball, orig = B.launch.bind(B); let n = 0;
  X.reset(0); h.combat.equip('fists', true);
  B.launch = (...a) => { n++; return orig(...a); };
  G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); X.adv(1 / 8); G.input.keys.delete('KeyF');
  X.run(1.0, 8); B.launch = orig;
  const jumps = []; h.behaviour = 'athletic'; X.reset(0);
  let air = 0, was = true;
  G.input.keys.add('Space'); G.input.taps.add('Space'); X.adv(1 / 8); G.input.keys.delete('Space');
  for (let i = 0; i < 24; i++) { X.adv(1 / 8); if (was && !h.onGround) air++; was = h.onGround; }
  h.behaviour = 'normal';
  return { throws: n, takeoffs: air };
});
check('a ball press during a 3-step frame throws once', once.throws === 1, once);
check('a jump press during a 3-step frame jumps once', once.takeoffs <= 1, once);

// ---------------------------------------------------------------- 4. settings
const set = await ev(() => {
  const G = game, el = document.querySelector('[data-range="music"]'), R = G.renderer, ms = [];
  let cuts = 0; const size0 = R._size;
  for (let i = 0; i < 20; i++) { G.camRig.lba.init = true; el.value = String(0.3 + (i % 5) * 0.1); const t0 = performance.now(); el.dispatchEvent(new Event('input')); ms.push(performance.now() - t0); if (!G.camRig.lba.init) cuts++; }
  ms.sort((a, b) => a - b);
  const sameSize = R._size === size0;
  G.settings.quality = 'medium'; G.applySettings(); const medium = R._size, shadow = G.env.sun.shadow.mapSize.x;
  G.settings.quality = 'high'; G.applySettings();
  return { median: +ms[10].toFixed(2), max: +ms[19].toFixed(2), cuts, sameSize, resizedOnQuality: medium !== size0 && R._size === size0, shadowMedium: shadow, music: G.audio.vol.music };
});
check('a volume slider event costs little and rebuilds nothing', set.median < 1 && set.sameSize && Math.abs(set.music - 0.7) < 1e-9, set);
check('a volume slider event does not cut the camera', set.cuts === 0, set);
check('a quality change still resizes and sets the shadow map', set.resizedOnQuality && set.shadowMedium === 1024, set);

// ---------------------------------------------------------------- 5. instrumentation
const inst = await ev(() => {
  const G = game; G.perf.reset();
  for (let i = 0; i < 30; i++) G.advance(1 / 30); // with rendering
  return { stats: G.perf.stats(), load: G.loadTimes };
});
const L = inst.load, S = inst.stats;
check('perf.stats: frames, fps, sim/render split and draw calls', S.frames === 30 && Math.abs(S.fps - 30) < 0.5 && S.renderMs.p50 > 0 && S.calls > 0 && S.tris > 0, S);
// (LAZY-REGIONS: startup times Citadel's steps and the areas built then; the others are timed when they are built)
check('loadTimes: Citadel, its steps and each area built at startup timed on its own; the rest listed as not built yet', ['world', 'citadel', 'house', 'well', 'actors', 'story', 'total'].every((k) => L[k] >= 0) && Object.keys(L.worldSteps || {}).length >= 10 && L.total >= L.citadel && ['zeelich', 'desert', 'hamalayi', 'underground', 'upper'].every((g) => L.regions?.deferred.includes(g)), L);

// ---------------------------------------------------------------- 6. the frame-rate limit (FRAME-1)
// Game.loop fed synthetic display refreshes (rAF timestamps) at 60 and 144 Hz, the real advance() replaced by a
// recorder: which refreshes are simulated/drawn and the intervals between them; a 120 ms hitch is not caught up with
// a burst; a key tapped on a skipped refresh is still there for the next frame; the automatic resolution reads a
// steady 33 ms at the 30 limit as on budget (no step down) but as missed without the limit.
const G0state = await ev(() => game.state);
const cap = await ev(() => {
  const G = game, raf = window.requestAnimationFrame, adv = G.advance, out = {};
  const run = (fps, hz, n, hitchAt = -1, preOff = false) => {
    G.settings.fps = fps; G.applySettings(); G.preStepOff = preOff;
    const got = []; let now = 1000, skippedTapKept = null, skippedTapSeen = 0;
    const u0 = G.input.update; G.input.update = function () { u0.call(this); if (this.pressed('ball')) skippedTapSeen++; };
    G.advance = (real) => got.push(+(real * 1000).toFixed(2));
    G.last = now; G._rafT = undefined; G._vsync = 0; G._due = 0; G._rafBuf = null; G._refresh = 0; G.testFreeze = false;   // (a new display: the measured refresh starts over, FPS30-SMOOTH's median of 32)
    for (let i = 0; i < n; i++) {
      now += i === hitchAt ? 120 : 1000 / hz;
      const before = got.length, tap = i >= 50 && skippedTapKept === null;
      if (tap) G.input.taps.add('KeyF');
      G.loop(now);
      // (the first refresh from the 50th on that is skipped: the tap must still be waiting)
      if (tap) { if (got.length === before) skippedTapKept = G.input.taps.has('KeyF'); else skippedTapSeen = 0; G.input.taps.delete('KeyF'); }
      else if (skippedTapKept === null) skippedTapSeen = 0;
    }
    G.input.update = u0; G.preStepOff = false;
    G.testFreeze = true; G.input.taps.clear();
    const iv = got.slice(5), mean = iv.reduce((a, b) => a + b, 0) / iv.length;
    return { frames: got.length, mean: +mean.toFixed(2), min: Math.min(...iv), max: Math.max(...iv), after: got.slice(got.findIndex((x) => x > 100) + 1, got.findIndex((x) => x > 100) + 4), skippedTapKept, skippedTapSeen };
  };
  window.requestAnimationFrame = () => 0;
  try {
    out.off60 = run('auto', 60, 600); out.cap30at60 = run('30', 60, 600); out.cap60at60 = run('60', 60, 600);
    out.cap60at144 = run('60', 144, 1440); out.cap30at144 = run('30', 144, 1440); out.hitch = run('30', 60, 300, 100);
    out.cap30off = run('30', 60, 300, -1, true);   // (STREET-CPU's switch off: no catch-up step in a skipped refresh, as before)
    // the automatic resolution at the 30 limit: 90 frames of 33.3 ms
    const R = G.renderer, d0 = R.dyn, a0 = R.autoRes;
    R.setAutoRes(true); for (let i = 0; i < 90; i++) R.adapt(33.3, 1e6); out.dynAt30 = R.dyn;
    G.settings.fps = 'auto'; G.applySettings(); R.setAutoRes(true); for (let i = 0; i < 90; i++) R.adapt(33.3, 2e6); out.dynUncapped = R.dyn;
    R.setAutoRes(a0); R.setDyn(d0);
  } finally { window.requestAnimationFrame = raf; G.advance = adv; G.settings.fps = 'auto'; G.applySettings(); G.last = performance.now(); G._rafT = undefined; G._due = 0; }
  return out;
});
check('frame-rate limit off: every refresh is a frame (60 Hz → 16.7 ms)', cap.off60.frames === 600 && Math.abs(cap.off60.mean - 16.67) < 0.05, cap.off60);
check('limit 30 on a 60 Hz screen: every other refresh, an even 33.3 ms', Math.abs(cap.cap30at60.frames - 300) <= 1 && cap.cap30at60.min > 33.2 && cap.cap30at60.max < 33.4, cap.cap30at60);
check('limit 60 on a 60 Hz screen: every refresh', cap.cap60at60.frames >= 599 && cap.cap60at60.max < 16.8, cap.cap60at60);
// (P101, 22.11: a limit is drawn on whole refreshes, the nearest count — an even pace, not an exact average)
check('limit 60 on a 144 Hz screen: every 2nd refresh, an even 13.9 ms (72 a second: the nearest steady pace)', Math.abs(cap.cap60at144.mean - 13.89) < 0.2 && cap.cap60at144.min > 13.5 && cap.cap60at144.max < 14.3, cap.cap60at144);
check('limit 30 on a 144 Hz screen: every 5th refresh, an even 34.7 ms (28.8 a second)', Math.abs(cap.cap30at144.mean - 34.72) < 0.3 && cap.cap30at144.min > 34.3 && cap.cap30at144.max < 35.2, cap.cap30at144);
check('limit 30: after a 120 ms hitch, back to 33.3 ms frames (no burst to catch up)', cap.hitch.after.length === 3 && cap.hitch.after.every((x) => x > 33.2 && x < 33.4), cap.hitch);
// (STREET-CPU: in play a skipped refresh at 30 runs the catch-up 60 Hz step, which reads the input as every step does: the tap
//  is used there, once; with the catch-up step off — or where none runs — it waits for the next frame, as before)
check('limit 30: a key tapped on a skipped refresh is read once — by that refresh\'s catch-up step in play, else it waits for the next frame', cap.cap30at60.skippedTapKept === (G0state !== 'play') && cap.cap30at60.skippedTapSeen === (G0state === 'play' ? 1 : 0) && cap.cap30off.skippedTapKept === true, { on: cap.cap30at60, off: cap.cap30off, state: G0state });
check('automatic resolution: 33 ms frames at the 30 limit are on budget (no step down); without the limit they are not', cap.dynAt30 === 1 && cap.dynUncapped < 1, cap);

// ---------------------------------------------------------------- 7. every screen (PACE-ALL, 22.11)
// Game.loop on synthetic displays of 50 … 240 Hz (exact timestamps; advance() replaced by a recorder): the drawn intervals
// at 30 / 60 / Unlimited are one even value, the whole-refresh pace of engine/pace.js's rule; Unlimited's even pace with a
// modelled slow game (a drawn frame of W ms: the next callback at the first refresh at or after its start + W; a skipped
// refresh calls back at the next one) engages, holds an even interval, and releases when the game is fast again; never at
// 60 Hz; a move from a 60 Hz to a 144 Hz screen is measured again within a few callbacks. Timing logic only: no real
// display's smoothness is measured here (Automated runtime only, SwiftShader).
const logP = (label, x) => console.log(`       ${label}: ${JSON.stringify(x)}`);
const RATES = [50, 59.9, 60, 75, 90, 100, 120, 144, 165, 240];
const EXPECT = { 30: { 50: 2, 59.9: 2, 60: 2, 75: 3, 90: 3, 100: 3, 120: 4, 144: 5, 165: 5, 240: 8 }, 60: { 50: 1, 59.9: 1, 60: 1, 75: 1, 90: 2, 100: 2, 120: 2, 144: 2, 165: 3, 240: 4 }, auto: Object.fromEntries(RATES.map((r) => [r, 1])) };
const pace = await ev(({ RATES }) => {
  const G = game, raf = window.requestAnimationFrame, adv = G.advance, out = { table: {}, adapt: {}, move: {} };
  let W = 5, got = [], drawnAt = [];
  G.advance = (real) => { got.push(+(real * 1000).toFixed(3)); G._workMs = W * 0.4; };
  const fresh = () => { G.last = 1000; G._rafT = undefined; G._vsync = 0; G._due = 0; G._drawT = 0; G._rafBuf = null; G._refresh = 0; G.evenPace.R0 = 0; G.evenPace.reset('test'); G.evenPace.log = []; G.testFreeze = false; got = []; };
  const setFps = (v) => { if (G.settings.fps !== v) { G.settings.fps = v; G.applySettings(); } };
  // a synthetic display at hz from time t: the loop is called at refresh times; a drawn callback costs `cost()` ms
  const display = (hz, secs, t0, cost = () => 0) => {
    const R = 1000 / hz; let t = t0; const end = t0 + secs * 1000;
    while (t < end) { const n0 = got.length; G.loop(t); const drew = got.length > n0; t += drew ? Math.max(1, Math.ceil((cost(t) - 1e-6) / R)) * R : R; if (drew) drawnAt.push(t); }
    return t;
  };
  window.requestAnimationFrame = () => 0;
  try {
    G.state = 'play';
    for (const fps of ['30', '60', 'auto']) {
      out.table[fps] = {};
      for (const hz of RATES) {
        setFps(fps); fresh(); W = 3;
        const t = display(hz, 0.6, 1000); got = []; display(hz, 2, t);
        const iv = got.slice(1), R = 1000 / hz;
        out.table[fps][hz] = { n: +(iv.reduce((a, b) => a + b, 0) / iv.length / R).toFixed(3), min: +Math.min(...iv).toFixed(2), max: +Math.max(...iv).toFixed(2), hint: G.frameRateOnScreen()?.f ?? null };
      }
    }
    // Unlimited, a modelled slow game: frames of 8 or 13 ms (10 / 20 ms intervals on 100 Hz, P101's street), then 5 ms
    const slow = (k) => (t) => (Math.floor(t / 10) % 10 < k ? 13 : 8);
    for (const hz of [100, 144, 60]) {
      setFps('auto'); fresh(); const R = 1000 / hz;
      const cost = hz === 144 ? (t) => (Math.floor(t / 7) % 3 ? 16 : 9) : hz === 60 ? (t) => (Math.floor(t / 10) % 10 < 5 ? 22 : 12) : slow(5);
      // (a second of light frames first — the title, a menu: the meter sees the refresh — then the slow game)
      W = 2; let t = display(hz, 1, 1000); got = [];
      W = 10; t = display(hz, 1, t, cost); const before = got.slice(1); got = [];
      t = display(hz, 3, t, cost); const nOn = G.evenPace.n, at = G.evenPace.log.find((e) => e.to >= 2)?.t ?? null;
      got = []; t = display(hz, 4, t, cost); const paced = got.slice(1), hint = (G.syncSettingsUI?.(), G._setHint?.fps?.() ?? ''), onScreen = G.frameRateOnScreen(), budget = +G.renderer.budgetMs.toFixed(2), gov = G.autoQ ? +G.autoQ.gov.budget().toFixed(2) : null;
      // fast again: 5 ms frames
      W = 5; got = []; t = display(hz, 14, t, () => 5); const nOff = G.evenPace.n; got = []; display(hz, 2, t, () => 5); const after = got.slice(1);
      const s = (a) => ({ n: a.length, min: a.length ? +Math.min(...a).toFixed(2) : null, max: a.length ? +Math.max(...a).toFixed(2) : null, uneven: a.filter((x) => x >= 1.5 * R).length });
      out.adapt[hz] = { before: s(before), nOn, at, paced: s(paced), nOff, after: s(after), hint, onScreen, budget, gov, budgetAfter: +G.renderer.budgetMs.toFixed(2), log: G.evenPace.log.map((e) => e.why || e.probe) };
    }
    // a move from a 60 Hz screen to a 144 Hz one: Unlimited, then 30
    for (const fps of ['auto', '30']) {
      setFps(fps); fresh(); W = 3;
      let t = display(60, 1, 1000); const r60 = G.refreshMs();
      let k = 0; const R144 = 1000 / 144; while (k < 40 && Math.abs(G.refreshMs() - R144) > 0.1) { G.loop(t); t += R144; k++; }
      got = []; display(144, 1.5, t); const iv = got.slice(1);
      out.move[fps] = { r60: +r60.toFixed(2), callbacks: k, r144: +G.refreshMs().toFixed(3), min: +Math.min(...iv).toFixed(2), max: +Math.max(...iv).toFixed(2), hz: G.frameRateOnScreen()?.hz ?? null, R0: +G.evenPace.R0.toFixed(2) };
    }
  } finally { window.requestAnimationFrame = raf; G.advance = adv; G.settings.fps = 'auto'; G.applySettings(); G.last = performance.now(); G._rafT = undefined; G._rafBuf = null; G._refresh = 0; G.evenPace.R0 = 0; G.evenPace.reset('test end'); G._due = 0; G._drawT = 0; G.testFreeze = true; }
  return out;
}, { RATES });
console.log('       PACE-ALL table (refreshes per drawn frame, min / max interval):', JSON.stringify(pace.table));
for (const fps of ['30', '60', 'auto']) {
  const bad = RATES.filter((hz) => { const x = pace.table[fps][hz], R = 1000 / hz; return Math.abs(x.n - EXPECT[fps][hz]) > 0.01 || x.max - x.min > 0.05 || Math.abs(x.min - EXPECT[fps][hz] * R) > 0.05; });
  check(`PACE-ALL ${fps === 'auto' ? 'Unlimited' : fps} on 50 / 59.9 / 60 / 75 / 90 / 100 / 120 / 144 / 165 / 240 Hz: one even drawn interval on each, ${fps === 'auto' ? 'every refresh' : 'the whole-refresh pace of the rule'}`, !bad.length, { bad, table: pace.table[fps] });
}
check('PACE-ALL Settings → Frame Rate hint: the rate on this screen where it differs from the limit (60 on 90 Hz → 45, on 144 → 72; 30 on 75 → 25, on 165 → 33), none where it is the limit', pace.table['60'][90].hint === 45 && pace.table['60'][144].hint === 72 && pace.table['30'][75].hint === 25 && pace.table['30'][165].hint === 33 && pace.table['30'][60].hint === null && pace.table['60'][120].hint === null && pace.table.auto[144].hint === null, { 60: pace.table['60'], 30: pace.table['30'] });
for (const hz of [100, 144]) {
  const a = pace.adapt[hz], R = 1000 / hz, n = hz === 144 ? 3 : 2;
  logP(`Unlimited ${hz} Hz, a slow game then a fast one`, a);
  check(`PACE-ALL Unlimited on ${hz} Hz, a game that cannot fill it (${a.before.uneven} of ${a.before.n} intervals ≥ 1.5 refreshes): within ~2.5 s every ${n === 2 ? '2nd' : '3rd'} refresh, every interval then ${(n * R).toFixed(1)} ms; Settings says so; the budget follows`, a.nOn === n && a.at - 2000 <= 2600 && Math.abs(a.paced.min - n * R) < 0.05 && Math.abs(a.paced.max - n * R) < 0.05 && a.onScreen?.even && a.onScreen.f === Math.round(hz / n) && new RegExp(`even ${Math.round(hz / n)} a second`).test(a.hint) && a.budget === +Math.max(1000 / 60, n * R).toFixed(2) && (a.gov == null || a.gov === a.budget), a);
  check(`PACE-ALL ...fast again on ${hz} Hz: back to every refresh (a probe that held), every interval ${R.toFixed(2)} ms, budget back to 16.67`, a.nOff === 1 && a.after.uneven === 0 && Math.abs(a.after.max - R) < 0.05 && a.budgetAfter === 16.67, a);
}
check('PACE-ALL a slow game on a 60 Hz screen: never paced (every refresh stays the target)', pace.adapt[60].nOn === 1 && pace.adapt[60].nOff === 1 && pace.adapt[60].log.length === 0, pace.adapt[60]);
logP('moved from 60 Hz to 144 Hz', pace.move);
check('PACE-ALL a move from a 60 Hz to a 144 Hz screen is measured again within 6 callbacks; Unlimited then draws every 144 Hz refresh, 30 every 5th (34.7 ms)', ['auto', '30'].every((f) => Math.abs(pace.move[f].r60 - 16.67) < 0.05 && pace.move[f].callbacks <= 6 && Math.abs(pace.move[f].r144 - 6.944) < 0.05) && Math.abs(pace.move.auto.max - 6.94) < 0.05 && Math.abs(pace.move.auto.min - 6.94) < 0.05 && Math.abs(pace.move['30'].min - 34.72) < 0.05 && Math.abs(pace.move['30'].max - 34.72) < 0.05 && pace.move.auto.R0 > 6.9 && pace.move.auto.R0 < 7, pace.move);

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
