// FPS30 (the user's brief, 18.11; docs/lba-maturity/FPS30.md): the 30 FPS mode's pacing, input and timing, on the real
// frame loop (Game.loop), in headless Chromium. Automated runtime only (SwiftShader): these check the scheduler's logic
// and the simulation's timing, never a real display's smoothness or a GPU's speed.
//   A. pacing under a synthetic display: requestAnimationFrame is replaced by a clock this test drives (exact 60 Hz,
//      60 Hz with timestamp jitter, a missed refresh, a long stall, 120 / 144 / 75 Hz, a move from a 60 Hz screen to a
//      120 Hz one); the renderer's draw is replaced by a counter, so every drawn frame's timestamp is recorded: the
//      rendered-frame intervals, not the callbacks
//   B. pause / resume, the window in the background and back, a hidden tab and back: no large simulated step, no burst
//   C. input between drawn frames: a key, a mouse click, a pad button and a touch button pressed and released between
//      two drawn frames at 30 are each seen once
//   D. the simulation at 30 vs 60 (game.advance at 1/30 and 1/60): walking, running, a jump, a sword swing, the magic
//      ball's flight and landing, the camera's turn rate, the hero's animation phase
//   E. the settings: Frame Rate 30 / 60 / Unlimited (old values kept), the frame budget the automatic resolution, Auto
//      quality and the AUTO-FIT watch use; Auto keyed by the budget
//   F. the real requestAnimationFrame of this headless browser, the draw stubbed: the drawn intervals at 30 and 60
//   G. animation events crossed between updates, exactly once at 30 / 60 / 144 / uneven 30 (FPS30-SMOOTH §6): footsteps per
//      metre, a sword combo's swing sounds and hits, ball throws, releases and catches, jumps and landings
//   ONLY=AB (letters) runs those parts only. The numbers of the scheduler before FPS30 (same test, same harness) are in
//   docs/lba-maturity/FPS30.md.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
watch(page);
const ev = (f, a) => page.evaluate(f, a);
const { check, done } = checker({ info: 'always' });
const ONLY = (process.env.ONLY || 'ABCDEFG').toUpperCase();

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => {
  const G = window.game;
  G.settings.controls = 'modern'; G.applySettings();
  G.devArena(); G.state = 'play';
  // (P94: the arena's enemies out, so the parts are independent of each other's order: A–C run ~40 s of play with him
  //  standing among them; they killed him, B1 found the game over screen and D's walk, jump and throw measured a dead
  //  hero — the "D fails only in the full run" of FPS30.md §7. D and G set their own scenes)
  for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(false);
  // the synthetic display: rAF callbacks wait in Q until tick(t) runs them with timestamp t
  const S = (window.SYN = { Q: [], drawn: [], adv: [], t: 0, on: false, raf0: window.requestAnimationFrame.bind(window) });
  window.requestAnimationFrame = (cb) => { if (!S.on) return S.raf0(cb); S.Q.push(cb); return S.Q.length; };
  const R = G.renderer, r0 = R.render.bind(R);
  R.render = function () { if (S.on || S.stub) { S.drawn.push(S.on ? S.t : performance.now()); return; } return r0(); };
  const a0 = G.advance.bind(G);
  G.advance = (real) => { S.adv.push(real); return a0(real); };
  S.tick = (t) => { S.t = t; const q = S.Q.splice(0); for (const cb of q) cb(t); };
});

// start the synthetic display: the loop's next real callback is held, then driven from t0
async function synth(on) {
  // (off: the loop's held callback goes back to the browser's own clock)
  await ev((on) => { const q = SYN.Q.splice(0); SYN.on = on; if (!on) for (const cb of q) SYN.raf0(cb); }, on);
  if (on) await page.waitForFunction(() => SYN.Q.length > 0, null, { timeout: 20000 });
}
// run `ms` of display time at `hz` from SYN.t; jitter: ± ms on each timestamp; each(i, t) may return a delay (ms) for a late callback
const drive = (o) => ev((o) => {
  const S = SYN, G = game; S.drawn.length = 0; S.adv.length = 0;
  const per = 1000 / o.hz; let t = S.t; const n = Math.round(o.ms / per), late = o.late || {};
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    t += per;
    const j = o.jitter ? (rnd() * 2 - 1) * o.jitter : 0;
    if (late[i]) t += late[i];
    S.tick(t + j);
  }
  const d = S.drawn, iv = d.slice(1).map((x, k) => +(x - d[k]).toFixed(2));
  return { iv, adv: S.adv.map((x) => +(x * 1000).toFixed(2)), refresh: +(G.refreshMs() || 0).toFixed(2), cap: G.frameCapMs || 0 };
}, o);
const setFps = (v) => ev((v) => { const G = game; G.settings.fps = v; G.applySettings(); }, v);
const pct = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null; };
const summ = (iv) => ({ n: iv.length, p50: pct(iv, 0.5), p95: pct(iv, 0.95), p99: pct(iv, 0.99), min: Math.min(...iv), max: Math.max(...iv) });
const near = (x, y, tol) => Math.abs(x - y) <= tol;
const log = (label, x) => console.log(`       ${label}: ${JSON.stringify(x)}`);
const result = {};

// ---------------------------------------------------------------- A. pacing under a synthetic display
if (ONLY.includes('A')) {
  await synth(true);
  // (the refresh measurement settles on the display first: 1 s at the rate, uncapped)
  const warm = async (hz) => { await setFps('auto'); await drive({ hz, ms: 1000 }); };
  // A1. exact 60 Hz
  await warm(60); await setFps('30');
  let r = await drive({ hz: 60, ms: 4000 });
  result.exact60 = summ(r.iv); log('30 on exact 60 Hz, drawn intervals', result.exact60);
  check('A1 30 on a steady 60 Hz display: every drawn interval is two refreshes (33.3 ms)', r.iv.length >= 115 && r.iv.every((x) => near(x, 33.33, 0.2)), result.exact60);
  // A1b (P88, the user's laptop: 59.9 Hz). The 33.33 ms grid drifted against a 16.70 ms refresh: every ~4 s a frame a
  // refresh early (16.7 ms); at 59.94 Hz a long one too. 12 s at each: every drawn interval two refreshes.
  for (const hz of [59.9, 59.94]) {
    await warm(hz); await setFps('30');
    r = await drive({ hz, ms: 12000 });
    const k = 'hz' + String(hz).replace('.', '_');
    result[k] = { ...summ(r.iv), under25: r.iv.filter((x) => x < 25).length, over40: r.iv.filter((x) => x > 40).length };
    log(`30 on ${hz} Hz, 12 s`, result[k]);
    check(`A1b 30 on a ${hz} Hz display for 12 s: no 16.7 ms or 50 ms drawn interval (no drift against the refresh)`, r.iv.length >= 340 && result[k].under25 === 0 && result[k].over40 === 0, result[k]);
  }
  // A2. 60 Hz with ±1.8 ms timestamp jitter (rAF timestamps that are not vsync-aligned)
  r = await drive({ hz: 60, ms: 6000, jitter: 1.8 });
  result.jitter60 = { ...summ(r.iv), over40: r.iv.filter((x) => x > 40).length, under25: r.iv.filter((x) => x < 25).length };
  log('30 on 60 Hz ±1.8 ms jitter', result.jitter60);
  check('A2 30 on a 60 Hz display with ±1.8 ms timestamp jitter: no 50 ms or 16.7 ms drawn intervals (each is two refreshes ± the jitter)', result.jitter60.over40 === 0 && result.jitter60.under25 === 0, result.jitter60);
  // A3. a missed refresh (a callback a whole refresh late, as when a frame's work overruns): late by 16.7 at i=40, 80, 120 (and 15.9, 17.4: near-equal)
  r = await drive({ hz: 60, ms: 4000, late: { 41: 0 } });
  await warm(60); await setFps('30');
  const missed = [];
  for (const L of [16.0, 16.67, 17.3]) {
    // the drawn frame's next callback comes one refresh late: the timestamps from then on are one refresh later
    const o = await ev(({ L }) => {
      const S = SYN; S.drawn.length = 0; let t = S.t; const per = 1000 / 60;
      for (let i = 0; i < 40; i++) { t += per; S.tick(t); }
      const k = S.drawn.length; const last = S.drawn[k - 1];
      // the frame drawn last overran: the next callback is at last + 2 refreshes + L - 16.67 ≈ a refresh late
      t = last + 2 * per + L; S.tick(t);
      for (let i = 0; i < 20; i++) { t += per; S.tick(t); }
      const d = S.drawn.slice(k - 1); return d.slice(1).map((x, j) => +(x - d[j]).toFixed(2));
    }, { L });
    missed.push({ late: L, iv: o.slice(0, 5) });
  }
  result.missed = missed; log('30, one drawn frame a refresh late (late ms → next intervals)', missed);
  check('A3 a missed deadline at 30 is followed by a full 33 ms interval, not a 16.7 ms catch-up frame', missed.every((m) => m.iv.slice(1).every((x) => x > 30)), missed);
  // A4. a long stall (400 ms): one late frame, then the even pace again; the simulation does not catch up 400 ms
  await ev(() => { game.perf.reset(); SYN.drawn.length = 0; SYN.adv.length = 0; let t = SYN.t; const per = 1000 / 60; for (let i = 0; i < 20; i++) { t += per; SYN.tick(t); } t += 400; SYN.tick(t); for (let i = 0; i < 40; i++) { t += per; SYN.tick(t); } });
  const st = await ev(() => { const d = SYN.drawn, s = game.perf.stats(); return { iv: d.slice(1).map((x, k) => +(x - d[k]).toFixed(1)), adv: SYN.adv.map((x) => +(x * 1000).toFixed(1)), steps: s.steps.max, lostS: s.lostS }; });
  const after = st.iv.slice(st.iv.findIndex((x) => x > 300) + 1);
  result.stall = { long: Math.max(...st.iv), after: after.slice(0, 8), steps: st.steps, lostS: st.lostS };
  log('30, a 400 ms stall', result.stall);
  check('A4 after a 400 ms stall at 30: the drawn frames go on at 33 ms (no burst), and the simulation is not handed more than 4 × 1/30 s (8 of its 60 Hz steps)', after.length >= 10 && after.every((x) => x > 30 && x < 36) && result.stall.steps <= 8 && result.stall.lostS > 0.25, result.stall);
  // A5. 120 Hz: 30 = every 4th refresh, 60 = every 2nd
  await warm(120); await setFps('30');
  r = await drive({ hz: 120, ms: 3000, jitter: 0.6 }); result.hz120_30 = summ(r.iv);
  await setFps('60'); r = await drive({ hz: 120, ms: 3000, jitter: 0.6 }); result.hz120_60 = summ(r.iv);
  log('120 Hz: 30 / 60', [result.hz120_30, result.hz120_60]);
  check('A5 a 120 Hz display: 30 draws every 4th refresh (33.3 ms), 60 every 2nd (16.7 ms)', near(result.hz120_30.p50, 33.3, 0.8) && result.hz120_30.min > 30 && result.hz120_30.max < 37 && near(result.hz120_60.p50, 16.7, 0.8) && result.hz120_60.min > 14.5 && result.hz120_60.max < 19, result);
  // A6. 144 Hz and 75 Hz (no whole number of refreshes in 33.3 ms): the average stays near the limit, never a burst
  await warm(144); await setFps('30'); r = await drive({ hz: 144, ms: 4000 }); result.hz144_30 = { ...summ(r.iv), fps: +(1000 * r.iv.length / r.iv.reduce((a, b) => a + b, 0)).toFixed(1) };
  await warm(75); await setFps('30'); r = await drive({ hz: 75, ms: 4000 }); result.hz75_30 = { ...summ(r.iv), fps: +(1000 * r.iv.length / r.iv.reduce((a, b) => a + b, 0)).toFixed(1) };
  log('30 on 144 Hz / 75 Hz', [result.hz144_30, result.hz75_30]);
  check('A6 30 on 144 Hz and 75 Hz: 29–31 drawn frames a second, each interval a whole number of refreshes next to 33.3 ms (27.8/34.7; 26.7/40)', near(result.hz144_30.fps, 30, 1.05) && result.hz144_30.min > 27 && result.hz144_30.max < 35.5 && near(result.hz75_30.fps, 30, 1.05) && result.hz75_30.min > 26 && result.hz75_30.max < 41, result);
  // A7. 60 at a 60 Hz display: no limiting (every refresh drawn); Unlimited at 60 Hz: every refresh
  await warm(60); await setFps('60'); r = await drive({ hz: 60, ms: 2000, jitter: 1.8 }); result.hz60_60 = summ(r.iv);
  log('60 on 60 Hz ±1.8 ms', result.hz60_60);
  check('A7 60 on a 60 Hz display does not limit: every refresh is drawn, jitter or not', result.hz60_60.n >= 118 && result.hz60_60.max < 20, result.hz60_60);
  // A8. the window moves from a 60 Hz screen to a 120 Hz one at 30: within a second the pace is every 4th refresh
  await warm(60); await setFps('30');
  await drive({ hz: 60, ms: 1000 });
  r = await drive({ hz: 120, ms: 3000 });
  const tail = r.iv.slice(-45);
  result.move = { first: r.iv.slice(0, 8), tail: summ(tail) };
  log('30, moved from 60 Hz to 120 Hz', result.move);
  check('A8 moved to a 120 Hz screen at 30: after a second the drawn interval is still 33.3 ms, and no interval under 16 ms on the way', near(result.move.tail.p50, 33.3, 0.5) && result.move.tail.max < 34 && r.iv.every((x) => x > 16), result.move);
}

// ---------------------------------------------------------------- B. pause / resume, background, hidden tab
if (ONLY.includes('B')) {
  if (!ONLY.includes('A')) await synth(true);
  await setFps('auto'); await drive({ hz: 60, ms: 800 }); await setFps('30');
  const b = await ev(() => {
    const G = game, S = SYN, out = {}; const per = 1000 / 60; let t = S.t;
    const run = (ms) => { const n = Math.round(ms / per); for (let i = 0; i < n; i++) { t += per; S.tick(t); } };
    // pause for 2 s of display time, then resume
    run(300); G.pause(); S.drawn.length = 0; S.adv.length = 0; run(2000); G.act('resume'); run(500);
    out.pause = { maxStep: +(Math.max(...S.adv) * 1000).toFixed(1), state: G.state };
    // the window loses focus 2 s (blur), then focus
    S.adv.length = 0; S.drawn.length = 0; const hf = document.hasFocus; document.hasFocus = () => false; dispatchEvent(new Event('blur')); run(2000); out.bgDrawn = S.drawn.length; S.drawn.length = 0; document.hasFocus = hf; dispatchEvent(new Event('focus')); run(600);
    const d = S.drawn; out.focus = { bg: G.background, maxStep: +(Math.max(...S.adv) * 1000).toFixed(1), iv: d.slice(1, 10).map((x, k) => +(x - d[k]).toFixed(1)) };
    // a hidden tab: no callbacks for 5 s, then visible again
    S.adv.length = 0; S.drawn.length = 0; t += 5000; G.last = t - 1; S.tick(t); run(600);
    out.hidden = { maxStep: +(Math.max(...S.adv) * 1000).toFixed(1), firstSteps: S.adv.slice(0, 3).map((x) => +(x * 1000).toFixed(1)), iv: S.drawn.slice(1, 10).map((x, k) => +(x - S.drawn[k]).toFixed(1)) };
    return out;
  });
  result.background = b; log('pause / background / hidden', b);
  check('B1 resumed after a 2 s pause: no simulated step over 1/30 s × 4', b.pause.maxStep <= 134 && b.pause.state === 'play', b.pause);
  check('B2 in the background the game draws at most 8 frames a second; back in focus at once at 30 (33 ms), with no long step', b.bgDrawn <= 18 && b.focus.iv.length >= 8 && b.focus.iv.every((x) => x > 30 && x < 36) && b.focus.maxStep <= 134, b);
  check('B3 back from a hidden tab (5 s without callbacks): at most one 4-step catch-up, then 33 ms frames', b.hidden.maxStep <= 134 && b.hidden.iv.every((x) => x > 30 && x < 36), b.hidden);
}

// ---------------------------------------------------------------- C. input between drawn frames
if (ONLY.includes('C')) {
  if (!ONLY.includes('A') && !ONLY.includes('B')) await synth(true);
  await setFps('auto'); await drive({ hz: 60, ms: 800 }); await setFps('30');
  const c = await ev(() => {
    const G = game, S = SYN, I = G.input, per = 1000 / 60; let t = S.t; const out = {};
    const run = (n) => { for (let i = 0; i < n; i++) { t += per; S.tick(t); } };
    // find the phase: the next tick that draws
    const toDraw = () => { for (let i = 0; i < 4; i++) { const k = S.drawn.length; t += per; S.tick(t); if (S.drawn.length > k) return; } };
    // count the frames where an action was seen as pressed (an edge) by the simulation
    const seen = (act, press, release) => {
      let n = 0; const f0 = G.frame; G.frame = function (dt, r) { const res = f0.call(this, dt, r); return res; };
      const u0 = I.update.bind(I); I.update = function () { u0(); if (I.pressed(act)) n++; };
      toDraw();   // (a frame was just drawn: the next refresh is skipped at 30)
      press(); t += per * 0.3; release();   // (both between two drawn frames: inside the skipped refresh)
      run(6); I.update = u0; G.frame = f0; return n;
    };
    // a key tap
    out.key = seen('interact', () => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })), () => dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })));
    // a mouse click (left: attack)
    const cv = G.renderer.renderer.domElement;
    const pe = (type, b) => cv.dispatchEvent(new PointerEvent(type, { button: b, pointerType: 'mouse', clientX: 400, clientY: 300, pointerId: 1, bubbles: true }));
    out.mouse = seen('attack', () => pe('pointerdown', 0), () => pe('pointerup', 0));
    // a pad button (Y: the magic ball), pressed and released inside a skipped refresh (read on that refresh's callback)
    const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), id: 'test pad', index: 0, mapping: 'standard' };
    const gp0 = navigator.getGamepads; navigator.getGamepads = () => [pad];
    out.pad = (() => {
      let n = 0; const u0 = I.update.bind(I); I.update = function () { u0(); if (I.pressed('ball')) n++; };
      toDraw();
      t += per; pad.buttons[3].pressed = true; S.tick(t);   // (the skipped refresh: the pad shows the button down)
      pad.buttons[3].pressed = false; run(6);
      I.update = u0; return n;
    })();
    navigator.getGamepads = gp0;
    // a touch button (the on-screen interact), touched and lifted inside a skipped refresh
    out.touch = (() => {
      let n = 0; const u0 = I.update.bind(I); I.update = function () { u0(); if (I.pressed('interact')) n++; };
      toDraw();
      I.touchDown('interact'); t += per * 0.3; I.touch.buttons.delete('interact');
      run(6); I.update = u0; return n;
    })();
    I.keys.clear();
    return out;
  });
  result.input = c; log('presses between drawn frames, seen as pressed (key, mouse, pad, touch)', c);
  check('C1 a key tap between two drawn frames at 30 is seen once', c.key === 1, c);
  check('C2 a mouse click between two drawn frames at 30 is seen once', c.mouse === 1, c);
  check('C3 a pad button pressed and released between two drawn frames at 30 is seen once', c.pad === 1, c);
  check('C4 a touch button tapped between two drawn frames at 30 is seen once', c.touch === 1, c);
}
if (ONLY.match(/[ABC]/)) await synth(false);

// ---------------------------------------------------------------- D. the simulation at 30 vs 60 (and 144, and an uneven 30)
// game.advance(real) as the loop calls it, the draw stubbed; frame intervals: 1/60, 1/30, 1/144 and an uneven 30
// (32.0 / 34.6 ms alternating, as a 30 limit on a jittery display gives)
if (ONLY.includes('D')) {
  const sim = await ev(() => {
    const G = game, h = G.hero, I = G.input, S = SYN; S.stub = true; G.testFreeze = true;
    const seq = { 60: [1 / 60], 30: [1 / 30], 144: [1 / 144], uneven30: [0.032, 0.0346], '30cap': [1 / 30] };
    const fps0 = G.settings.fps, cap = (k) => { const v = k === '30cap' ? '30' : 'auto'; if (G.settings.fps !== v) { G.settings.fps = v; G.applySettings(); } };
    const reset = (beh = 'normal', a = 0) => {
      h.pos.set(6190, G.physics.groundAt(6190, 8), 8); h.angle = a; h.vel?.set(0, 0); h.vy = 0; h.onGround = true; h.gravity = null; h.hp = h.maxHp; h.actT = 0; h.hurtT = 0; h.dead = false;
      for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(false);
      G.resetCombat(); G.ball.reset?.(); G.state = 'play'; I.keys.clear(); I.taps.clear(); h.setBehaviour(beh); G.step(0.4);
    };
    const out = {};
    for (const [k, iv] of Object.entries(seq)) {
      cap(k); let i = 0; const adv = () => { const r = iv[i++ % iv.length]; G.advance(r); return r; };
      const run = (sec, each) => { let t = 0; while (t < sec - 0.005) { t += adv(); each?.(t); } return t; };
      const o = (out[k] = {});
      // walking and running 1 s (Modern: W)
      reset('normal'); let p0 = h.pos.clone(); I.keys.add('KeyW'); run(1.0); I.keys.delete('KeyW'); o.walk = +Math.hypot(h.pos.x - p0.x, h.pos.z - p0.z).toFixed(3);
      reset('athletic'); p0 = h.pos.clone(); I.keys.add('KeyW'); run(1.0); I.keys.delete('KeyW'); o.run = +Math.hypot(h.pos.x - p0.x, h.pos.z - p0.z).toFixed(3);
      // a standing jump (Athletic, Space): its apex and its time in the air
      reset('athletic'); { const y0 = h.pos.y; let apex = y0, up = null, land = null; I.keys.add('Space'); I.taps.add('Space'); adv(); I.keys.delete('Space');
        run(2.0, (t) => { if (!h.onGround && up == null) up = t; apex = Math.max(apex, h.pos.y); if (up != null && h.onGround && land == null) land = t; });
        o.jumpApex = +(apex - y0).toFixed(3); o.jumpAir = land != null ? +(land - up).toFixed(3) : null; }
      // a running jump: its length
      reset('athletic'); { I.keys.add('KeyW'); run(1.0); const q = h.pos.clone(); I.keys.add('Space'); I.taps.add('Space'); let land = null, from = null;
        run(2.0, () => { if (!h.onGround && !from) from = h.pos.clone(); if (from && h.onGround && !land) land = h.pos.clone(); }); I.keys.delete('Space'); I.keys.delete('KeyW');
        o.runJump = land && from ? +Math.hypot(land.x - from.x, land.z - from.z).toFixed(2) : null; }
      // a sword swing's duration
      reset('normal'); h.combat.equip('sword', true); { I.keys.add('KeyK'); I.taps.add('KeyK'); let t = adv(); I.keys.delete('KeyK'); while (h.combat.busy && t < 3) t += adv(); o.swing = +t.toFixed(3); }
      // the magic ball (F), thrown ahead: where it first touches down, and when
      reset('normal', Math.PI / 2); h.mp = h.mpMax; h.magicLevel = 1; h.combat.equip('ball', true);
      { const b = G.ball, x0 = h.pos.x, z0 = h.pos.z; let hit = null, rel = null; b.bounce = function (...a) { if (!hit) hit = { x: this.pos.x, z: this.pos.z, t: T }; return Object.getPrototypeOf(b).bounce.apply(this, a); };
        let T = 0; I.keys.add('KeyF'); I.taps.add('KeyF'); T += adv(); I.keys.delete('KeyF');
        while (!hit && T < 4) { T += adv(); if (b.state === 'fly' && rel == null) rel = T; }
        delete b.bounce; o.ball = hit ? { dist: +Math.hypot(hit.x - x0, hit.z - z0).toFixed(2), rel: rel != null ? +rel.toFixed(3) : null, t: +(hit.t - (rel ?? 0)).toFixed(3) } : null; }
    }
    // the camera turned by the keys (Z) for 1 s, and by a pad's right stick at 0.6 for 1 s (aim sensitivity): outdoors on
    // Citadel's square, the free camera (the arena's camera is fixed)
    const cam0 = [G.settings.camera, G.settings.autoControls]; G.settings.camera = 'free'; G.settings.autoControls = 'off'; G.applySettings();
    G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.state = 'play'; G.step(0.5);
    for (const [k, iv] of Object.entries(seq)) {
      cap(k); let i = 0; const adv = () => { const r = iv[i++ % iv.length]; G.advance(r); return r; };
      const run = (sec) => { let t = 0; while (t < sec - 0.005) t += adv(); };
      I.keys.clear(); run(0.2); { const y0 = G.camRig.yaw; I.keys.add('KeyZ'); run(1.0); I.keys.delete('KeyZ'); out[k].camKeys = +(G.camRig.yaw - y0).toFixed(3); }
      { const pad = { connected: true, axes: [0, 0, 0.6, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })), mapping: 'standard' }, gp = navigator.getGamepads; navigator.getGamepads = () => [pad];
        const y0 = G.camRig.yaw; run(1.0); navigator.getGamepads = gp; out[k].camPad = +(G.camRig.yaw - y0).toFixed(3); }
      I.lastDevice = 'kbd';
    }
    G.settings.camera = cam0[0]; G.settings.autoControls = cam0[1]; G.applySettings();
    G.settings.fps = fps0; G.applySettings(); S.stub = false; I.keys.clear(); return out;
  });
  result.sim = sim; log('simulation at 60 / 30 / 144 / uneven 30', sim);
  const r60 = sim[60], rel = (a, b) => Math.abs(a - b) / Math.max(1e-6, Math.abs(b));
  for (const k of ['30', '144', 'uneven30', '30cap']) {
    const x = sim[k];
    check(`D ${k}: walking and running cover the ground they do at 60 (±3 %)`, rel(x.walk, r60.walk) < 0.03 && rel(x.run, r60.run) < 0.03, { at60: [r60.walk, r60.run], [k]: [x.walk, x.run] });
    check(`D ${k}: a standing jump rises as high as at 60 (±2 cm) and stays as long in the air (± one frame)`, Math.abs(x.jumpApex - r60.jumpApex) <= 0.02 && Math.abs(x.jumpAir - r60.jumpAir) <= (k === '144' ? 1 / 60 : 0.035) + 1e-3, { at60: [r60.jumpApex, r60.jumpAir], [k]: [x.jumpApex, x.jumpAir] });
    check(`D ${k}: a running jump is as long as at 60 (±5 %)`, x.runJump && rel(x.runJump, r60.runJump) < 0.05, { at60: r60.runJump, [k]: x.runJump });
    check(`D ${k}: a sword swing lasts as long as at 60 (± one frame)`, Math.abs(x.swing - r60.swing) <= 0.035 + 1e-3, { at60: r60.swing, [k]: x.swing });
    if (k !== '144') check(`D ${k}: the magic ball leaves the hand at the same moment (± one frame) and first lands where it does at 60 (±0.15 m)`, x.ball && r60.ball && Math.abs(x.ball.dist - r60.ball.dist) <= 0.15 && Math.abs(x.ball.rel - r60.ball.rel) <= 0.035 + 1e-3, { at60: r60.ball, [k]: x.ball });
    check(`D ${k}: the camera turns as far in 1 s by the keys and by a pad's stick as at 60 (±3 %): the same aim sensitivity`, Math.abs(r60.camKeys) > 0.5 && Math.abs(r60.camPad) > 0.5 && rel(x.camKeys, r60.camKeys) < 0.03 && rel(x.camPad, r60.camPad) < 0.03, { at60: [r60.camKeys, r60.camPad], [k]: [x.camKeys, x.camPad] });
  }
}

// ---------------------------------------------------------------- E. the settings and the frame budget
if (ONLY.includes('E')) {
  const e = await ev(async () => {
    const G = game, out = {};
    out.labels = [...document.querySelectorAll('#settings .seg[data-setting="fps"] button')].map((b) => [b.dataset.v, b.textContent.trim()]);
    out.label = document.querySelector('#settings .set-row[data-hint="fps"] .set-label')?.textContent.trim();
    // old saved values: '30', '60', 'auto' (the old "As the screen" / "Off"), numbers, junk
    out.values = {};
    for (const v of ['30', '60', 'auto', 30, 'off', undefined]) { G.settings.fps = v; G.applySettings(); out.values[String(v)] = [G.settings.fps, +(G.frameCapMs || 0).toFixed(2), +G.renderer.budgetMs.toFixed(2)]; }
    // Auto's budget and its cache key per limit
    const A = G.autoQ; G.settings.fps = '30'; G.applySettings(); out.auto30 = { budget: +A.gov.budget().toFixed(2), up: +A.gov.upBudget().toFixed(2), key: A.machineKey() };
    G.settings.fps = '60'; G.applySettings(); out.auto60 = { budget: +A.gov.budget().toFixed(2), key: A.machineKey() };
    G.settings.fps = 'auto'; G.applySettings(); out.autoOff = { budget: +A.gov.budget().toFixed(2), key: A.machineKey() };
    // the governor fed 30 fps windows at Medium with room (GPU 10 ms, CPU 8 ms): under the 30 budget they are 'ok', not
    // pressure, and no step up (High would fit 33.3 but not 16.7: the limit's saving is not spent)
    const { Governor } = await import('./src/engine/autoquality.js');
    const feed = (gov) => { gov.setProfile(1, 'test', { commitNow: true, t: 0 }); let t = 0, kinds = new Set(), steps = [];
      for (let i = 0; i < 4000; i++) { t += 33.3; gov.gpu(t, 10); const r = gov.frame({ t, ms: 33.3, cpu: 8, play: true, scene: i < 2000 ? 'a' : 'b' }); if (gov.lastWindow) kinds.add(gov.lastWindow.kind); if (r?.kind === 'up' || r?.kind === 'down') steps.push(r.kind); }
      return { kinds: [...kinds], steps, p: gov.p, phase: gov.phase }; };
    out.gov30 = feed(new Governor({ budget: () => 1000 / 30, upBudget: () => 1000 / 60 }));
    out.gov30spend = feed(new Governor({ budget: () => 1000 / 30 }));
    // the automatic resolution and the AUTO-FIT watch read the limit's budget
    G.settings.fps = '30'; G.applySettings(); out.fitBudget = G.renderer.budgetMs;
    G.settings.fps = 'auto'; G.applySettings();
    return out;
  });
  result.settings = e; log('settings', e);
  check('E1 Settings → Display: "Frame Rate" with 30 / 60 / Unlimited, in that order', e.label === 'Frame Rate' && JSON.stringify(e.labels) === JSON.stringify([['30', '30'], ['60', '60'], ['auto', 'Unlimited']]), e);
  check("E2 old saved values keep working: '30' → 33.3 ms, '60' → 16.7 ms, 'auto' (the old \"As the screen\") → no limit; a number 30 → '30'; anything else → Unlimited", JSON.stringify(e.values) === JSON.stringify({ 30: ['30', 33.33, 33.33], 60: ['60', 16.67, 16.67], auto: ['auto', 0, 16.67], off: ['auto', 0, 16.67], undefined: ['auto', 0, 16.67] }), e.values);
  check('E3 Auto quality works to the chosen budget (33.3 ms at 30, 16.7 at 60 and Unlimited) and keeps a profile per limit (the 30 limit\'s own cache key; the others as before)', e.auto30.budget === 33.33 && e.auto60.budget === 16.67 && e.autoOff.budget === 16.67 && /\|30fps$/.test(e.auto30.key) && e.auto60.key === e.autoOff.key && !/30fps/.test(e.autoOff.key), e);
  check('E4 Auto at the 30 limit: steady 33 ms frames are on budget (no pressure, no step down), and the time the limit saves is not spent on a heavier profile', e.gov30.kinds.every((k) => k === 'ok') && !e.gov30.steps.length && e.gov30.p === 1 && e.gov30spend.steps.includes('up'), e);
  check('E5 the automatic resolution / AUTO-FIT budget at 30 is 33.3 ms', Math.abs(e.fitBudget - 33.33) < 0.01, e.fitBudget);
}

// ---------------------------------------------------------------- G. animation events, exactly once (FPS30-SMOOTH §6)
if (ONLY.includes('G')) {
  const g = await ev(() => {
    const G = game, h = G.hero, I = G.input, S = SYN; S.stub = true; G.testFreeze = true;
    const seq = { 60: [1 / 60], 30: [1 / 30], 144: [1 / 144], uneven30: [0.032, 0.0346], '30cap': [1 / 30] };
    const fps0 = G.settings.fps, cap = (k) => { const v = k === '30cap' ? '30' : 'auto'; if (G.settings.fps !== v) { G.settings.fps = v; G.applySettings(); } };
    const heard = new Map(), a0 = G.audio.play.bind(G.audio);
    G.audio.play = (n, ...r) => { heard.set(n, (heard.get(n) || 0) + 1); return a0(n, ...r); };
    const count = (re) => [...heard].filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
    // (Modern keys, the device switch off: an earlier part's pad may have switched the scheme)
    const ctl0 = [G.settings.controls, G.settings.autoControls]; G.settings.controls = 'modern'; G.settings.autoControls = 'off'; G.applySettings(); I.lastDevice = 'kbd';
    G.devArena(); G.state = 'play';
    const reset = (beh = 'normal', a = 0) => {
      h.pos.set(6190, G.physics.groundAt(6190, 8), 8); h.angle = a; h.vel?.set(0, 0); h.vy = 0; h.onGround = true; h.gravity = null; h.hp = h.maxHp; h.actT = 0; h.hurtT = 0; h.stepAcc = 0;
      for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(false);
      G.resetCombat(); G.ball.reset?.(); G.state = 'play'; I.keys.clear(); I.taps.clear(); h.setBehaviour(beh); G.step(0.4); heard.clear();
    };
    const out = {};
    for (const [k, iv] of Object.entries(seq)) {
      cap(k); let i = 0; const adv = () => { const r = iv[i++ % iv.length]; G.advance(r); return r; };
      const run = (sec) => { let t = 0; while (t < sec - 0.005) t += adv(); return t; };
      const o = (out[k] = {});
      // footsteps: 10 s of walking, 10 s of running (into the arena's open floor) — steps per metre
      for (const [beh, key] of [['normal', 'walk'], ['athletic', 'run']]) { reset(beh); const p0 = h.pos.clone(); I.keys.add('KeyW'); run(10); I.keys.delete('KeyW'); const d = Math.hypot(h.pos.x - p0.x, h.pos.z - p0.z); o[key] = { steps: count(/^step/), m: +d.toFixed(2), perM: +(count(/^step/) / d).toFixed(3) }; }
      // three jumps in place: jump and landing sounds
      reset('athletic'); for (let j = 0; j < 3; j++) { I.keys.add('Space'); I.taps.add('Space'); adv(); I.keys.delete('Space'); run(1.2); } o.jump = { jump: count(/^jump$/), land: count(/^land$|^landSoft$/) };
      // a sword combo (three presses) against an arena enemy in front: swing sounds and hits
      reset('normal', 0); h.combat.equip('sword', true);
      { const e = G.enemies.find((x) => x.id?.startsWith('a_') && !x.boss); let hits = 0;
        if (e) { e.setPresent(true); e.hp = e.maxHp = 99; e.pos.set(h.pos.x, h.pos.y, h.pos.z + 1.6); e.state = 'idle'; e.stun = 9; const d0 = e.damage.bind(e); e.damage = (...a) => { hits++; return d0(...a); }; }
        for (let j = 0; j < 3; j++) { I.keys.add('KeyK'); I.taps.add('KeyK'); adv(); I.keys.delete('KeyK'); run(0.28); }
        run(1.2); if (e) { delete e.damage; e.setPresent(false); }
        o.sword = { swings: count(/^swing/), hits, enemy: !!e }; }
      // three ball throws (F), each caught back: throws, releases, catches
      reset('normal', Math.PI / 2); h.mp = h.mpMax; h.combat.equip('ball', true);
      { let rel = 0; const b = G.ball, st0 = { s: b.state }; for (let j = 0; j < 3; j++) { I.keys.add('KeyF'); I.taps.add('KeyF'); adv(); I.keys.delete('KeyF'); let t = 0, was = b.state; while (t < 4 && !(b.state === 'inhand' && t > 0.5)) { t += adv(); if (b.state === 'fly' && was !== 'fly') rel++; was = b.state; } }
        o.ball = { throws: count(/^throw/), released: rel, catches: count(/^catch$|^ballReturn$/) }; }
    }
    G.settings.controls = ctl0[0]; G.settings.autoControls = ctl0[1];
    G.settings.fps = fps0; G.applySettings(); G.audio.play = a0; S.stub = false; I.keys.clear(); return out;
  });
  result.events = g; log('animation events at 60 / 30 / 144 / uneven 30', g);
  const r60 = g[60];
  check('G0 at 60: the events happen (steps, 3 jumps and landings, 3 swings with hits, 3 throws released and caught)', r60.walk.steps > 4 && r60.run.steps > 6 && r60.jump.jump === 3 && r60.jump.land === 3 && r60.sword.swings === 3 && (!r60.sword.enemy || r60.sword.hits === 3) && r60.ball.throws === 3 && r60.ball.released === 3 && r60.ball.catches >= 3, r60);
  for (const k of ['30', '144', 'uneven30', '30cap']) {
    const x = g[k];
    check(`G ${k}: footsteps per metre as at 60 (±4 %)`, Math.abs(x.walk.perM / r60.walk.perM - 1) <= 0.04 && Math.abs(x.run.perM / r60.run.perM - 1) <= 0.04, { at60: [r60.walk, r60.run], [k]: [x.walk, x.run] });
    check(`G ${k}: every jump, landing, swing, hit, throw, release and catch exactly once, as at 60`, JSON.stringify([x.jump, x.sword, x.ball]) === JSON.stringify([r60.jump, r60.sword, r60.ball]), { at60: [r60.jump, r60.sword, r60.ball], [k]: [x.jump, x.sword, x.ball] });
  }
}

// ---------------------------------------------------------------- F. this browser's own requestAnimationFrame, the draw stubbed
// (headless Chromium's frame clock, not a display: the drawn intervals with the real loop and real callbacks; then the
// in-game Frame Rate Benchmark, shortened, on the same stub — its report's lines, and its 30 run on pace)
if (ONLY.includes('F')) {
  const f = await ev(async () => {
    const G = game, S = SYN, out = {}; S.stub = true; G.testFreeze = false; G.devArena(); G.state = 'play';
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const v of ['auto', '60', '30']) {
      G.settings.fps = v; G.applySettings(); await wait(1200); S.drawn.length = 0; await wait(4000);
      const d = S.drawn, iv = d.slice(1).map((x, k) => x - d[k]).sort((a, b) => a - b), pc = (p) => +iv[Math.min(iv.length - 1, Math.floor(p * iv.length))].toFixed(1);
      out[v] = { slow: iv.filter((x) => x >= 1.5 * (G.refreshMs() || 16.7) * (v === '30' ? 2 : 1)).length, n: iv.length, fps: +(1000 * iv.length / (d[d.length - 1] - d[0])).toFixed(1), p50: pc(0.5), p95: pc(0.95), p99: pc(0.99), refresh: +(G.refreshMs() || 0).toFixed(2) };
    }
    G.settings.fps = 'auto'; G.applySettings();
    const txt = await G.bench.runPacing({ routes: ['street'], limits: [0, 30], measure: 3 });
    out.report = txt.split('\n').filter((l) => /^\s+street|^\s+(Unlimited|30)\s|^frame callbacks/.test(l));
    out.restored = { benching: G.benching, cap: G.benchCapMs, fps: G.settings.fps };
    S.stub = false; G.testFreeze = true;
    return out;
  });
  result.realRaf = f; log("headless Chromium's rAF, draw stubbed: Unlimited / 60 / 30, and the benchmark's lines", f);
  check('F1 the real loop on this browser\'s frame clock at 30: ~30 drawn frames a second, the median interval two refreshes, under 5 % of intervals 1.5× that or more (this shared machine has its own stalls: see Unlimited)', f['30'].refresh > 15 && f['30'].refresh < 18 && Math.abs(f['30'].fps - 30) < 1.5 && Math.abs(f['30'].p50 - 2 * f['30'].refresh) < 1 && f['30'].slow <= 0.05 * f['30'].n, f);
  check('F2 the Frame Rate Benchmark runs the route at Unlimited and at 30 and reports each, then puts everything back', f.report.length >= 4 && f.report.some((l) => /street\s+30\s/.test(l)) && f.report.some((l) => /street\s+Unlimited/.test(l)) && !f.restored.benching && !f.restored.cap && f.restored.fps === 'auto', f);
}

await page.screenshot({ path: '/dev/null' }).catch(() => {});
console.log('RESULT ' + JSON.stringify(result));
await browser.close();
done();
