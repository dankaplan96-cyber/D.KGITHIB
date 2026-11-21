// P94 (the owner's brief, status.md: "improve the existing 30 FPS mode so that running, turning the camera and aiming the
// magic ball feel steady and responsive while the image stays sharp"; docs/lba-maturity/FPS30.md §8). Three tests in one
// already-loaded scene — Citadel's harbour quay (fixture new-11-town): the quay's edge with its rail and bollard posts,
// the lamp posts, the windows of Nell's repairs and the customs hut, the harbour bell on its post — at 1366×768, the
// Follow camera, Medium quality, world resolution 100 %, Edges Smooth, the Frame Rate setting as the rate says:
//   T1  standing still, the view turned at a constant rate past the posts and windows. The Follow camera has no camera
//       input of its own (camera.js _chase: it stands at his back), so the view turns as he turns on the spot: Classic
//       keys (Right held) on the keyboard path, the pad's left stick at a constant tilt on the pad path
//   T2  a run along the quay's edge parallel to the posts, a stop, back the other way, the camera not touched:
//       keyboard Classic (Up, nothing, Down: LBA2's step back), pad Modern (stick forward, nothing, stick back: he turns
//       and runs toward the camera, which holds — camera-relative controls)
//   T3  the ball aimed at the harbour bell (a small target 2.6 m up on its post): mouse path Modern — the ball key held,
//       strafing left then right while charging, the cursor kept on the bell as a player would (moved once a drawn frame
//       to where the bell was in the last drawn frame), released; pad path Classic — the ball button held, the aim turned
//       with the stick across the bell and back, released
// Each test runs RUNS (3) times per rate and path. Rates: the synthetic display of tests/fps30.mjs (requestAnimationFrame
// driven at exact timestamps, the draw stubbed and sampled): 30@60, 30@59.9 (Frame Rate 30 on a 60 / 59.9 Hz screen) and
// 60 (no limit); and `cpu`: the real loop on this headless browser's own requestAnimationFrame at Frame Rate 30, the draw
// stubbed. Inputs are applied on the simulation steps at the same game time at every rate (tests/lib/smoothrec.js).
// Per pass: every rAF callback's timestamp and every drawn frame's (intervals p50/p95/p99/max, count ≥ 45 ms, frames
// drawn); presentation timing: none in headless Chromium (no display, no presentation feedback) — said in the output.
// Motion: Twinsen's on-screen step against the nearest post (T2), the posts' on-screen step (T1), the camera's position
// and heading step per drawn frame and its single-frame jumps (a step > 1.5× both neighbours' and more than 3 cm / 0.005
// rad over their mean — fixed before the first run), the aim ring's and the middle dot's world and screen steps (T3).
// Then the input probes (synthetic display only): an input put in between two refreshes (on a refresh the limit skips,
// as a real event arrives), counted in drawn frames to its first visible response: the ball key → the ball in his hand;
// the cursor moved 60 px while charging → the ring moved (and whether it reached its new place at once: no smoothing);
// the key let go → the ball leaving the hand (the whip, releaseAfterCharge 0.08 s, is deliberate and listed apart);
// the same with a pad button and the stick.
// Measures only; the verdict block is the error policy's (page errors fail). Automated runtime only: a synthetic display
// and a CPU rasteriser — never a statement about a real screen or GPU.
//
// Run: cd lba3 && python3 -m http.server 8123 & node tests/fps30-feel.mjs
// Env: GAME_URL · RUNS=3 · TESTS=T1,T2,T3 · PATHS=kbd,pad · RATES=30@60,30@59.9,60,cpu (and real: the real draw) ·
//   PROBES=1 · OUT=dir (JSON) · LABEL=text · PLAYWRIGHT=<playwright index.mjs> · HEADED=1 CHANNEL=chrome (a real GPU and display)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const env = process.env;
const PW = env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright/index.mjs';
const { chromium } = await import(/^[a-z]+:\/\//i.test(PW) ? PW : pathToFileURL(PW).href);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL0 = env.GAME_URL || 'http://localhost:8123/';
const ORIGIN = new URL(URL0).origin;
const RUNS = +(env.RUNS ?? 3);
const TESTS = (env.TESTS || 'T1,T2,T3').split(',');
const PATHS = (env.PATHS || 'kbd,pad').split(',');
const RATES = (env.RATES || '30@60,30@59.9,60,cpu').split(',');   // (also `real`: the real loop and the real draw at Frame Rate 30; `cpu60` / `real60` at 60)
const PROBES = env.PROBES !== '0';
const OUT = env.OUT || '', LABEL = env.LABEL || '';
const VW = 1366, VH = 768;
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let watch = null, done = null;
try { ({ watch, done } = await import('./lib/boot.mjs')); } catch { watch = null; }

const fixture = () => {
  const j = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/campaign/new-11-town.save.json'), 'utf8'));
  for (const o of j.origins || []) {
    o.origin = ORIGIN;
    for (const it of o.localStorage || []) if (it.name === 'sunshard_settings_v1') {
      const s = JSON.parse(it.value);
      Object.assign(s, { camera: 'follow', controls: 'classic', autoControls: 'off', quality: 'medium', qualityAuto: false, res: 'full', fps: 'auto', aa: 'msaa', visual: '2026', shake: 'on' });
      it.value = JSON.stringify(s);
    }
  }
  return j;
};

// ------------------------------------------------------------------ in the page: the tests
function defineFeel() {
  const G = window.game, V = G.hero.pos.constructor, I = G.input, h = G.hero;
  const B = G.story.chapters[0].bell;
  // the quay's posts (bollard runs at z 42.6: two posts 4.4 m apart each; citadel-layout.js) and three lamp posts, 1 m up
  const posts = [-90.6, -95.0, -95.7, -100.1, -105.8, -110.2, -110.9, -115.3].map((x) => new V(x, G.physics.groundAt(x, 42.6, 5) + 1.0, 42.6));
  const postObjs = Object.fromEntries(posts.map((p, i) => ['post' + i, () => p]));
  const modern = (on) => { G.settings.controls = on ? 'modern' : 'classic'; G.applySettings(); };
  // a pad: navigator.getGamepads answers this one while `on` (tests/fps30.mjs D)
  const PAD = (window.PAD = { on: false, p: { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })), mapping: 'standard', id: 'synthetic' } });
  const gp0 = navigator.getGamepads.bind(navigator);
  navigator.getGamepads = () => (PAD.on ? [PAD.p] : gp0());
  const pad = (ax = [0, 0], btn = []) => () => { PAD.p.axes[0] = ax[0]; PAD.p.axes[1] = ax[1]; PAD.p.buttons.forEach((b, i) => { b.pressed = btn.includes(i); }); };
  const padOn = (on) => { PAD.on = on; pad()(); I.lastDevice = on ? 'pad' : 'kbd'; };
  // the cursor on the bell: once a drawn frame, where the bell was drawn (a player following it by eye)
  const M = I.mouse, bellP = new V(B.x, B.y, B.z), _p = new V();
  const cursorToBell = () => { _p.copy(bellP).project(G.camera); M.x = (_p.x + 1) * innerWidth / 2; M.y = (1 - _p.y) * innerHeight / 2; M.inside = true; M.lastMove = performance.now(); I.lastDevice = 'kbd'; };
  const ballObjs = () => ({ ring: () => (G.ball?.landMark?.visible ? G.ball.landMark.position : null), dot: () => (G.ball?.dots?.[4]?.visible ? G.ball.dots[4].position : null),
    ball: () => (G.ball && G.ball.state !== 'idle' && G.ball.mesh.visible ? G.ball.mesh.position : null), bell: () => bellP });
  const ready = (beh = 'athletic') => { h.hp = h.maxHp; h.setBehaviour?.(beh); if (G.targeting?.lock) G.targeting.release(); G.resetCombat?.(); h.hasBall = true; h.combat.equip?.('ball', true); G.ball.state = 'idle'; h.mp = h.mpMax; };
  const T1 = { x: -101, z: 39.0, a: -Math.PI / 2 }, T2 = { x: -95.5, z: 40.9, a: -Math.PI / 2 }, T3 = { x: -111, z: 37.0 };
  window.FEEL_ROUTES = {
    T1(path) {
      const R = { cmds: [
        { at() { padOn(false); modern(false); SM.seed(41); ready(); SM.place(T1.x, T1.z, T1.a); R.objs = { ...postObjs }; padOn(path === 'pad'); } }, { d: 1.2, keys: [] }, { rec: true },
        { d: 0.4, keys: [] },
        path === 'pad' ? { d: 3.0, keys: [], do: pad([0.8, 0]) } : { d: 3.0, keys: ['ArrowRight'] },
        { d: 0.8, keys: [], do: pad() }, { rec: false }, { at() { padOn(false); } }], objs: {} };
      return R;
    },
    T2(path) {
      const R = { cmds: [
        { at() { padOn(false); modern(path === 'pad'); SM.seed(42); ready(); SM.place(T2.x, T2.z, T2.a); R.objs = { ...postObjs }; padOn(path === 'pad'); } }, { d: 1.2, keys: [] }, { rec: true },
        { d: 0.3, keys: [] },
        ...(path === 'pad'
          ? [{ d: 2.0, keys: [], do: pad([0, -1]) }, { d: 0.7, keys: [], do: pad() }, { d: 2.0, keys: [], do: pad([0, 1]) }, { d: 0.8, keys: [], do: pad() }]
          : [{ d: 2.0, keys: ['ArrowUp'] }, { d: 0.7, keys: [] }, { d: 2.0, keys: ['ArrowDown'] }, { d: 0.8, keys: [] }]),
        { rec: false }, { at() { padOn(false); modern(false); } }], objs: {} };
      return R;
    },
    T3(path) {
      const a0 = Math.atan2(B.x - T3.x, B.z - T3.z);
      const Y = [3];   // (the pad's Y: the ball)
      const R = { cmds: [
        { at() { padOn(false); modern(path !== 'pad'); SM.seed(43); ready('athletic'); SM.place(T3.x, T3.z, path === 'pad' ? a0 + 0.35 : a0); R.objs = { ...ballObjs(), post5: postObjs.post5, post6: postObjs.post6 };
          if (path !== 'pad') { R.track = true; cursorToBell(); } padOn(path === 'pad'); } },
        { d: 1.0, keys: [] }, { rec: true }, { d: 0.2, keys: [] },
        ...(path === 'pad'
          ? [{ d: 0.5, keys: [], do: pad([0, 0], Y) }, { d: 0.6, keys: [], do: pad([0.8, 0], Y) }, { d: 0.6, keys: [], do: pad([-0.8, 0], Y) }, { d: 0.25, keys: [], do: pad([0.8, 0], Y) }, { d: 0.3, keys: [], do: pad([0, 0], Y) }, { d: 1.6, keys: [], do: pad() }]
          : [{ d: 0.5, keys: ['KeyF'] }, { d: 1.2, keys: ['KeyF', 'KeyA'] }, { d: 1.2, keys: ['KeyF', 'KeyD'] }, { d: 0.4, keys: ['KeyF'] }, { d: 1.6, keys: [] }]),
        { rec: false }, { at() { R.track = false; padOn(false); modern(false); } }],
        each() { h.hp = h.maxHp; }, objs: {} };
      return R;
    },
  };
  // per drawn frame, after the recorder's sample: the ball's state, the hand, the dots; then the cursor follows the bell
  const s0 = SM.sample;
  SM.sample = () => {
    const n = SM.F.length; s0();
    if (SM.F.length > n) {
      const f = SM.F[SM.F.length - 1], b = G.ball, hand = h.rig?.j?.armR?.hand;
      let hp = null; if (hand) { hand.updateWorldMatrix(true, false); hand.getWorldPosition(_p); hp = [_p.x, _p.y, _p.z]; }
      f.b = { st: b.state, vis: !!b.mesh.visible, p: [b.mesh.position.x, b.mesh.position.y, b.mesh.position.z], hand: hp, dots: !!b.dots[0].visible, thr: !!h.combat.throwing, chg: !!h.combat.throwing?.charging };
    }
    if (SM.route?.track) cursorToBell();
  };
  // every rAF callback the game's loop gets (its timestamp): the loop asks for itself by name, so this sees them all
  const loop0 = G.loop.bind(G);
  window.CB = [];
  G.loop = function (now) { if (window.CB.rec) window.CB.push(now); return loop0(now); };
  window.FEEL_CTRL = { cursorToBell, padOn, pad, modern, ready, T3, a0: () => Math.atan2(B.x - T3.x, B.z - T3.z), posts };
}

// the synthetic display on (the loop's next callback, already asked of the browser, is held, then driven from here); it
// stays on between passes — handing the loop back to the browser's clock would draw real frames in between (SwiftShader:
// seconds each) — and the draw stays stubbed the whole run (SM.stub: every drawn frame sampled, never drawn)
async function synthOn(page) {
  if (await page.evaluate(() => SYN.on && SYN.Q.length > 0)) return;
  await page.evaluate(() => { SYN.on = true; });
  await page.waitForFunction(() => SYN.Q.length > 0, null, { timeout: 15 * 60000, polling: 50 });
}
async function synthPass(page, test, pathName, rate) {
  const [fpsSet, hzS] = rate.includes('@') ? rate.split('@') : ['auto', rate];
  await synthOn(page);
  return page.evaluate(({ test, pathName, hz, fpsSet }) => {
    const G = game, S = window.SYN;
    S.t = Math.max(S.t, performance.now());
    const tick = (n) => { const per = 1000 / hz; for (let i = 0; i < n; i++) { S.t += per; S.tick(S.t); } };
    G.settings.fps = 'auto'; G.applySettings(); tick(Math.round(hz));
    G.settings.fps = fpsSet; G.applySettings(); tick(4);
    G.perf.reset(); window.CB.length = 0; window.CB.rec = true; SM.run(FEEL_ROUTES[test](pathName));
    for (let i = 0; i < hz * 60 && !SM.route.done; i++) tick(1);
    window.CB.rec = false;
    const out = { F: SM.F, P: SM.P, CB: window.CB.slice(), refresh: G.refreshMs?.() || null, cap: G.frameCapMs || 0 };
    G.settings.fps = window.__fps0; G.applySettings();
    return out;
  }, { test, pathName, hz: +hzS, fpsSet });
}
// cpu: the real loop on the browser's own requestAnimationFrame, the draw stubbed; real (draw = true): the same with the
// real draw — for a machine with a GPU and a display (HEADED=1 CHANNEL=chrome: the local run, FPS30.md §8)
async function cpuPass(page, test, pathName, draw = false, fps = '30') {
  await page.evaluate(() => { const S = SYN; if (S.on) { S.on = false; const q = S.Q.splice(0); for (const cb of q) S.raf0(cb); } });
  if (draw) await page.waitForTimeout(1500);   // (the real draw's first frames after the synthetic passes: not measured)
  await page.evaluate(({ test, pathName, draw, fps }) => {
    const G = game; G.settings.fps = fps; G.applySettings();
    SM.stub = !draw; G.perf.reset(); window.CB.length = 0; window.CB.rec = true; window.__lt = []; window.__t0 = performance.now();
    SM.run(FEEL_ROUTES[test](pathName));
  }, { test, pathName, draw, fps });
  await page.waitForFunction(() => SM.route.done, null, { polling: 250, timeout: 20 * 60000 });
  return page.evaluate(() => {
    const G = game; window.CB.rec = false; SM.stub = true;
    const out = { F: SM.F, P: SM.P, CB: window.CB.slice(), refresh: G.refreshMs?.() || null, cap: G.frameCapMs || 0, longTasks: (window.__lt || []).filter((e) => e.start >= window.__t0), bg: !!G.background };
    G.settings.fps = window.__fps0; G.applySettings();
    return out;
  });
}

// the input probes on the synthetic display: an input put in on a refresh the limit skips, counted in drawn frames
async function probes(page, pathName, rate) {
  const [fpsSet, hzS] = rate.includes('@') ? rate.split('@') : ['auto', rate];
  await synthOn(page);
  return page.evaluate(({ pathName, hz, fpsSet }) => {
    const G = game, S = window.SYN, I = G.input, h = G.hero, C = window.FEEL_CTRL, b = G.ball;
    const per = 1000 / hz;
    S.t = Math.max(S.t, performance.now());
    let drawn = 0; const r0 = SM.stub; SM.stub = true;
    const s0 = SM.sample; let last = null;
    SM.on = false;
    const snap = () => { const hand = h.rig?.j?.armR?.hand; const hp = hand ? (hand.updateWorldMatrix(true, false), hand.getWorldPosition(new h.pos.constructor())) : null;
      return { t: S.t, gt: G.time, st: b.state, vis: b.mesh.visible, p: b.mesh.position.clone(), hand: hp, ring: b.landMark.visible ? b.landMark.position.clone() : null, dots: b.dots[0].visible, dot: b.dots[4].visible ? b.dots[4].position.clone() : null, ang: h.angle, thr: !!h.combat.throwing }; };
    SM.sample = () => { drawn++; last = snap(); };
    const tick = () => { S.t += per; S.tick(S.t); };
    // until a frame is drawn, then (with the limit) the next refresh, which it skips: the input goes in after that one
    const toSkipped = () => { const d0 = drawn; let k = 0; while (drawn === d0 && k++ < 10) tick(); if (fpsSet !== 'auto') { const d1 = drawn; tick(); return drawn === d1; } return true; };
    // drawn frames from now until test() is true (1 = the very next drawn frame)
    const framesUntil = (test, max = 60) => { const d0 = drawn; for (let k = 0; k < max * 4; k++) { const d = drawn; tick(); if (drawn > d && test(last)) return drawn - d0; } return null; };
    G.settings.fps = 'auto'; G.applySettings(); for (let i = 0; i < hz; i++) tick();
    G.settings.fps = fpsSet; G.applySettings(); for (let i = 0; i < 4; i++) tick();
    const out = { skipped: [] };
    const pad = pathName === 'pad';
    C.padOn(false); C.modern(!pad); C.ready('athletic'); SM.place(C.T3.x, C.T3.z, C.a0()); C.padOn(pad);
    if (!pad) C.cursorToBell();
    for (let i = 0; i < Math.round(hz); i++) tick();
    // 1. the ball pressed → the ball in his hand
    out.skipped.push(toSkipped());
    if (pad) { window.PAD.p.buttons[3].pressed = true; I.poll(); } else { I.keys.add('KeyF'); I.taps.add('KeyF'); }
    out.press = framesUntil((s) => s.st === 'inhand' && s.vis);
    // 2. held: the charge begins after chargeAfter (deliberate) → the dots show
    out.dots = framesUntil((s) => s.dots) + out.press;
    for (let i = 0; i < Math.round(hz * 0.3); i++) tick();
    // 3. the aim moved: the cursor 60 px right (mouse) / the stick pushed right (pad, Classic: the aim turns at 90°/s)
    const before = snap();
    out.skipped.push(toSkipped());
    const ref = snap();
    if (pad) window.PAD.p.axes[0] = 0.8; else { I.mouse.x += 60; I.mouse.lastMove = performance.now(); }
    // (the middle aim dot: always shown while charging, unlike the ring, which a wall or a target hides)
    out.aim = framesUntil((s) => (pad ? Math.abs(s.ang - ref.ang) > 1e-4 : s.dot && ref.dot && s.dot.distanceTo(ref.dot) > 0.01));
    const at1 = snap(), seq = [at1];
    if (pad) window.PAD.p.axes[0] = 0;
    for (let k = 0; k < 5; k++) { const d = drawn; while (drawn === d) tick(); seq.push(last); }
    // (mouse: how far the dot moved in each drawn frame after the cursor did (m): all of it at once in the first = no
    //  smoothing or buffering of the aim; what follows is his body turning to the new aim, and the camera with him)
    if (!pad && ref.dot) out.aimSeq = [ref, ...seq].slice(1).map((s, i) => (s.dot && ([ref, ...seq][i].dot) ? +s.dot.distanceTo([ref, ...seq][i].dot).toFixed(3) : null));
    out.aimMove = pad ? +(at1.ang - before.ang).toFixed(4) : (at1.dot && ref.dot ? +at1.dot.distanceTo(ref.dot).toFixed(3) : null);
    // (mouse: then the cursor held still 1 s: how fast his heading and the middle dot still move — in Follow the view turns
    //  with him, so a cursor off the screen's middle keeps moving the aimed point; rad/s and m/s of play time)
    if (!pad) { const a = snap(), g0 = G.time; for (let i = 0; i < hz; i++) tick(); const b2 = snap(), dt = G.time - g0;
      out.drift = { turn: +(Math.abs(b2.ang - a.ang) / dt).toFixed(3), dot: a.dot && b2.dot ? +(a.dot.distanceTo(b2.dot) / dt).toFixed(2) : null }; }
    // 4. let go → the ball leaves the hand (the whip before it is deliberate: releaseAfterCharge)
    out.skipped.push(toSkipped());
    if (pad) { window.PAD.p.buttons[3].pressed = false; I.poll(); } else I.keys.delete('KeyF');
    out.release = framesUntil((s) => s.st === 'fly' || s.st === 'impact' || s.st === 'return');
    out.releaseFromHand = last?.hand ? +last.p.distanceTo(last.hand).toFixed(3) : null;
    out.releaseGt = last ? +(last.gt).toFixed(4) : null;
    for (let i = 0; i < hz * 2; i++) tick();
    C.padOn(false); C.modern(false);
    SM.sample = s0; SM.stub = r0;
    G.settings.fps = window.__fps0; G.applySettings();
    return out;
  }, { pathName, hz: +hzS, fpsSet });
}

// ------------------------------------------------------------------ the measures
const pc = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const r1 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10), r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100), r3 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000);
const onScr = (p) => !!p && p[0] > 0 && p[0] < VW && p[1] > 0 && p[1] < VH;
const intervals = (t) => t.slice(1).map((x, i) => x - t[i]).filter((x) => x > 0);
const dist = (t) => ({ n: t.length, p50: r2(pc(t, 0.5)), p95: r2(pc(t, 0.95)), p99: r2(pc(t, 0.99)), max: r2(t.length ? Math.max(...t) : null), ge45: t.filter((x) => x >= 45).length });
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(...v);
// a single-frame jump in a per-frame step series: larger than 1.5× both neighbours and more than `abs` over their mean
// (fixed before the first run)
function jumps(steps, abs, info) {
  const out = [];
  for (let i = 1; i < steps.length - 1; i++) {
    const a = steps[i - 1], s = steps[i], c = steps[i + 1];
    if (a == null || s == null || c == null) continue;
    if (s > 1.5 * Math.max(a, c) && s - (a + c) / 2 > abs) out.push({ i, step: r3(s), nb: [r3(a), r3(c)], ...info(i) });
  }
  return out;
}
function measure(test, F) {
  const play = F.filter((f) => f.st === 'play' && !f.trans);
  const m = { frames: play.length };
  // the camera: position step (m) and heading / tilt step (rad) per drawn frame
  const cp = [], cy = [], cq = [];
  for (let i = 1; i < play.length; i++) {
    const a = play[i - 1], b = play[i];
    cp.push(Math.hypot(b.cam[0] - a.cam[0], b.cam[1] - a.cam[1], b.cam[2] - a.cam[2]));
    const ya = Math.atan2(a.dir[0], a.dir[2]), yb = Math.atan2(b.dir[0], b.dir[2]);
    cy.push(Math.abs(Math.atan2(Math.sin(yb - ya), Math.cos(yb - ya))));
    cq.push(Math.abs(Math.asin(b.dir[1]) - Math.asin(a.dir[1])));
  }
  const why = (i) => ({ keepBy: play[i + 1]?.why?.keepBy || '', swingBy: play[i + 1]?.why?.swingBy || '', gt: play[i + 1]?.gt });
  m.cam = { posStepP50: r3(pc(cp, 0.5)), posStepMax: r3(Math.max(0, ...cp)), yawStepP50: r3(pc(cy, 0.5)), yawStepMax: r3(Math.max(0, ...cy)), tiltStepMax: r3(Math.max(0, ...cq)),
    posJumps: jumps(cp, 0.03, why), yawJumps: jumps(cy, 0.005, why), tiltJumps: jumps(cq, 0.005, why) };
  // on screen: the nearest post on the screen to him, and his step against it (px per drawn frame)
  const posts = Object.keys(play[0]?.objs || {}).filter((k) => k.startsWith('post'));
  const rel = [], postStep = [], heroStep = [];
  for (let i = 1; i < play.length; i++) {
    const a = play[i - 1], b = play[i];
    if (!a.hero?.s || !b.hero?.s) { rel.push(null); postStep.push(null); heroStep.push(null); continue; }
    // (the post nearest him on the screen, kept while it stays on it: a change of post is not a step)
    let best = null;
    const prevK = rel.length && rel[rel.length - 1] ? rel[rel.length - 1].k : null;
    if (prevK && onScr(a.objs[prevK]?.s) && onScr(b.objs[prevK]?.s)) best = { k: prevK, pa: a.objs[prevK].s, pb: b.objs[prevK].s };
    else for (const k of posts) { const pa = a.objs[k]?.s, pb = b.objs[k]?.s; if (onScr(pa) && onScr(pb)) { const d = len(sub(pb, b.hero.s)); if (!best || d < best.d) best = { k, d, pa, pb }; } }
    heroStep.push(len(sub(b.hero.s, a.hero.s)));
    if (!best) { rel.push(null); postStep.push(null); continue; }
    postStep.push({ k: best.k, v: len(sub(best.pb, best.pa)) });
    const r = sub(sub(b.hero.s, best.pb), sub(a.hero.s, best.pa)); r.k = best.k; rel.push(r);
  }
  const relLen = rel.map((v) => (v ? len(v) : null)).filter((x) => x != null);
  // its irregularity: the change of that step from one drawn frame to the next, against the same post (px; 0 at an even motion)
  const relJ = []; for (let i = 1; i < rel.length; i++) if (rel[i] && rel[i - 1] && rel[i].k === rel[i - 1].k) relJ.push(len(sub(rel[i], rel[i - 1])));
  const ps = postStep.filter((x) => x != null).map((x) => x.v), psJ = []; for (let i = 1; i < postStep.length; i++) if (postStep[i] && postStep[i - 1] && postStep[i].k === postStep[i - 1].k) psJ.push(Math.abs(postStep[i].v - postStep[i - 1].v));
  m.screen = { heroVsPostStepP50: r1(pc(relLen, 0.5)), heroVsPostStepMax: r1(relLen.length ? Math.max(...relLen) : null), heroVsPostChangeP95: r1(pc(relJ, 0.95)), heroVsPostChangeMax: r1(relJ.length ? Math.max(...relJ) : null), heroVsPostChangeOver4: relJ.filter((x) => x > 4).length,
    postStepP50: r1(pc(ps, 0.5)), postStepMax: r1(ps.length ? Math.max(...ps) : null), postStepChangeP95: r1(pc(psJ, 0.95)), postStepChangeMax: r1(psJ.length ? Math.max(...psJ) : null), postJudged: ps.length };
  // the aim: the ring's and the middle dot's step (world m, screen px) per drawn frame while both frames show it, and
  // its single-frame jumps (a step > 1.5× both neighbours' and over 3 cm more than their mean); the ring against the bell
  if (test === 'T3') {
    for (const k of ['ring', 'dot']) {
      const w = [], s = [];
      for (let i = 1; i < play.length; i++) { const a = play[i - 1].objs?.[k], b = play[i].objs?.[k]; if (a && b) { w.push(Math.hypot(b.w[0] - a.w[0], b.w[1] - a.w[1], b.w[2] - a.w[2])); s.push(a.s && b.s ? len(sub(b.s, a.s)) : null); } else { w.push(null); s.push(null); } }
      const wv = w.filter((x) => x != null), sv = s.filter((x) => x != null);
      m[k] = { judged: wv.length, stepP50: r3(pc(wv, 0.5)), stepMax: r3(wv.length ? Math.max(...wv) : null), scrP50: r1(pc(sv, 0.5)), scrMax: r1(sv.length ? Math.max(...sv) : null), jumps: jumps(w, 0.03, (i) => ({ gt: play[i + 1]?.gt })).length };
    }
    // the ball's release: the first drawn frame in flight, how far from the hand drawn in it
    const k = play.findIndex((f) => f.b && f.b.st !== 'inhand' && f.b.st !== 'idle' && f.b.vis);
    const f = play[k];
    m.release = f ? { frame: k, fromHand: f.b.hand ? r3(Math.hypot(f.b.p[0] - f.b.hand[0], f.b.p[1] - f.b.hand[1], f.b.p[2] - f.b.hand[2])) : null,
      prevInHand: play[k - 1]?.b?.st === 'inhand', prevFromHand: play[k - 1]?.b?.hand ? r3(Math.hypot(play[k - 1].b.p[0] - play[k - 1].b.hand[0], play[k - 1].b.p[1] - play[k - 1].b.hand[1], play[k - 1].b.p[2] - play[k - 1].b.hand[2])) : null } : null;
  }
  return m;
}
function timing(raw) {
  const cb = intervals(raw.CB), dr = intervals(raw.F.map((f) => f.t));
  return { callbacks: dist(cb), drawn: dist(dr), framesDrawn: raw.F.length, steps: r2(raw.P.reduce((a, p) => a + p.steps, 0) / Math.max(1, raw.P.length)), lostS: r2(raw.P.reduce((a, p) => a + p.lost, 0)) };
}

// ------------------------------------------------------------------ run
const t00 = Date.now();
// (HEADED=1: a visible window with the machine's own GPU — and CHANNEL=chrome for the installed Chrome — as tests/smooth-routes.mjs
//  does for the laptop; otherwise headless SwiftShader)
const browser = await chromium.launch({ headless: !env.HEADED, ...(env.CHANNEL ? { channel: env.CHANNEL } : {}),
  args: env.HEADED ? ['--window-position=0,0', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: VW, height: VH }, storageState: fixture() });
const page = await context.newPage();
const errs = [];
if (watch) watch(page); else { page.on('pageerror', (e) => errs.push(e.message)); }
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000, polling: 500 });
await page.evaluate(() => { game.testFreeze = true; });
await page.addScriptTag({ path: path.join(HERE, 'lib/player.js') });
await page.click('[data-act="continue"]', { timeout: 120000 });
await page.evaluate(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
await page.addScriptTag({ path: path.join(HERE, 'lib/smoothrec.js') });
await page.evaluate(defineFeel);
const setup = await page.evaluate(() => {
  const G = game, R = G.renderer;
  window.__fps0 = G.settings.fps;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt?.push({ start: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: false }); } catch { /* none */ }
  const S = (window.SYN = { Q: [], t: 0, on: false, raf0: window.requestAnimationFrame.bind(window) });
  window.requestAnimationFrame = (cb) => { if (!S.on) return S.raf0(cb); S.Q.push(cb); return S.Q.length; };
  S.tick = (t) => { const q = S.Q.splice(0); for (const cb of q) cb(t); };
  SM.stub = true;
  G.testFreeze = false;
  return { gpu: G.perf.gpu, pr: R.pixelRatio(), msaa: R.composer?.renderTarget1?.samples, quality: G.settings.quality, dpr: devicePixelRatio, ua: navigator.userAgent.match(/(HeadlessChrome|Chrome)\/[\d.]+/)?.[0],
    // what this browser offers for presentation timing (none of it applies to a WebGL canvas in headless: said so in the output)
    rvfc: 'requestVideoFrameCallback' in HTMLVideoElement.prototype, presentation: typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes || []).join(',') };
});
console.log(`setup: ${JSON.stringify(setup)} (${((Date.now() - t00) / 1000).toFixed(0)} s)`);
const results = [];
for (const test of TESTS) for (const pathName of PATHS) for (const rate of RATES) for (let k = 0; k < RUNS; k++) {
  // (cpu / real at Frame Rate 30; cpu60 / real60 at 60)
  const loopRate = /^(cpu|real)(60)?$/.exec(rate);
  const raw = loopRate ? await cpuPass(page, test, pathName, loopRate[1] === 'real', loopRate[2] ? '60' : '30') : await synthPass(page, test, pathName, rate);
  const row = { test, path: pathName === 'kbd' ? (test === 'T3' ? 'mouse+keys' : 'keys') : 'pad', rate, run: k + 1, timing: timing(raw), m: measure(test, raw.F), refresh: r2(raw.refresh), cap: r2(raw.cap), longTasks: raw.longTasks?.length ?? null, bg: raw.bg ?? null };
  results.push(row);
  const T = row.timing, M = row.m;
  console.log(`${test} ${row.path} ${rate} #${k + 1} (${((Date.now() - t00) / 1000).toFixed(0)} s): drawn ${T.framesDrawn} (p50 ${T.drawn.p50} p95 ${T.drawn.p95} p99 ${T.drawn.p99} max ${T.drawn.max} ms, ≥45 ms ${T.drawn.ge45}; callbacks p50 ${T.callbacks.p50} max ${T.callbacks.max}) steps/frame ${T.steps}` +
    ` | cam step p50/max ${M.cam.posStepP50}/${M.cam.posStepMax} m, yaw ${M.cam.yawStepP50}/${M.cam.yawStepMax} rad, jumps pos ${M.cam.posJumps.length} yaw ${M.cam.yawJumps.length} tilt ${M.cam.tiltJumps.length}` +
    ` | him vs post step p50/max ${M.screen.heroVsPostStepP50}/${M.screen.heroVsPostStepMax} px, change p95/max ${M.screen.heroVsPostChangeP95}/${M.screen.heroVsPostChangeMax} (>4: ${M.screen.heroVsPostChangeOver4}); post step p50/max ${M.screen.postStepP50}/${M.screen.postStepMax}, change p95/max ${M.screen.postStepChangeP95}/${M.screen.postStepChangeMax}` +
    (M.ring ? ` | ring step p50/max ${M.ring.stepP50}/${M.ring.stepMax} m (${M.ring.scrP50}/${M.ring.scrMax} px) jumps ${M.ring.jumps}/${M.ring.judged}; dot ${M.dot.stepP50}/${M.dot.stepMax} m jumps ${M.dot.jumps}/${M.dot.judged}; release ${JSON.stringify(M.release)}` : ''));
  for (const j of [...M.cam.posJumps, ...M.cam.yawJumps, ...M.cam.tiltJumps].slice(0, 4)) console.log(`     camera jump: ${JSON.stringify(j)}`);
  if (OUT) fs.writeFileSync(path.join(OUT, `${test}-${pathName}-${rate}-${k + 1}.json`), JSON.stringify({ ...row, raw }));
}
const probeRows = [];
if (PROBES && TESTS.includes('T3')) for (const pathName of PATHS) for (const rate of RATES.filter((r) => !/^(cpu|real)/.test(r))) {
  const p = await probes(page, pathName, rate);
  probeRows.push({ path: pathName, rate, ...p });
  console.log(`probe ${pathName} ${rate}: ${JSON.stringify(p)}`);
}
console.log(`\n=== P94 fps30-feel ${LABEL} · ${VW}×${VH} · Follow · Medium · ${setup.gpu} · Automated runtime only (synthetic display / headless rAF; draw stubbed). Presentation timing: none in headless Chromium.`);
if (OUT) fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ setup, results, probes: probeRows }, null, 1));
console.log(`(${((Date.now() - t00) / 60000).toFixed(1)} min)`);
await context.close(); await browser.close();
if (done) done(); else if (errs.length) { console.log('page errors: ' + errs.join(' | ')); process.exitCode = 1; }
