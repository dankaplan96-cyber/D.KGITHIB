// FPS60-AUTO (P137, the user 26.11 on the UHD 620 laptop: "whatever we do, 30 fps just looks bad"; picked: always 60,
// lower the quality instead; docs/lba-maturity/FPS60-AUTO.md). On the real frame loop (Game.loop) in headless Chromium,
// with a synthetic display and a modelled frame cost (Automated runtime only, SwiftShader: this checks the logic — what
// Auto and the even pace decide when frames are slow — never a real GPU's speed or a real display's smoothness):
//   A. saves: a stored Frame Rate 'auto' (Unlimited) stays Unlimited and gets the new rule; a stored '30' is the player's
//      own choice (only the Settings chip writes it) and stays 30; nothing stored: Unlimited
//   B. 59.9 Hz, GPU-bound (the frame's cost 60 ms at High, CPU 5): Auto (the governor on: ?autoq) steps the picture down
//      one profile at a time at commit points (a pause), past Low by resolution (the CPU rung stepped over), until 60 holds;
//      the Frame Rate stays Unlimited, no frame-rate limit appears, the even pace never engages (≤ 70 Hz)
//   C. 59.9 Hz, CPU-bound (the CPU 26 ms at High): down the CPU side only (P137b: Medium-lean, then CPU-eco, which keeps
//      the shadows and the full resolution; never Low or a resolution rung); no limit
//   D. 120 Hz, GPU-bound (45 ms at High): the even pace takes every 2nd refresh (60) at most — never every 4th (30) as
//      before P137 — and Auto steps the picture down until 60 holds
// The frame cost: a drawn frame costs max(gpu, cpu) × the applied profile's share (the governor's own cost model — the
// logic under test, not a measurement), pipelined (the next callback on the refresh where the accumulated cost ends, so
// a 19 ms frame alternates 16.7 / 33.4 ms intervals as a GPU-bound browser does); the governor's CPU reading is the
// modelled CPU (not SwiftShader's own simulation time).
//   SERVE=1 node tests/fps60-auto.mjs        (ONLY=ABCD; ONLY=S: the picture sheet's captures, no check)
import { launch, open, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const ONLY = (process.env.ONLY || 'ABCD').toUpperCase();
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const KEY = 'sunshard_settings_v1';
const log = (label, x) => console.log(`       ${label}: ${JSON.stringify(x)}`);

// ---------------------------------------------------------------- A. saves
if (ONLY.includes('A')) {
  const out = {};
  await open(page, '?nocine');   // (the page first: its localStorage)
  for (const [name, set] of [['nothing stored', null], ['stored Unlimited', { fps: 'auto', qv: 4, v: 2 }], ['stored 30 (picked in Settings)', { fps: '30', qv: 4, v: 2 }], ['stored 60', { fps: '60', qv: 4, v: 2 }]]) {
    await ev(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }, [KEY, set]);
    await open(page, '?nocine');
    out[name] = await ev(() => ({ fps: game.settings.fps, cap: +(game.frameCapMs || 0).toFixed(2), qv: game.settings.qv }));
  }
  log('Frame Rate after loading', out);
  check('A saves: nothing stored or Unlimited stored → Unlimited (no limit, the new rule); 30 stored → 30 kept (the player\'s own choice); 60 stored → 60; no settings migration',
    out['nothing stored'].fps === 'auto' && out['nothing stored'].cap === 0 && out['stored Unlimited'].fps === 'auto' && out['stored Unlimited'].cap === 0
    && out['stored 30 (picked in Settings)'].fps === '30' && out['stored 30 (picked in Settings)'].cap === 33.33 && out['stored 60'].fps === '60' && Object.values(out).every((x) => x.qv === 4), out);
  await ev((k) => localStorage.removeItem(k), KEY);
}

// ---------------------------------------------------------------- the synthetic display and the modelled load
async function boot() {
  await open(page, '?nocine&autoq');
  await ev(() => {
    const G = window.game;
    G.testFreeze = false;   // (the real loop drives the game here, as in tests/fps30.mjs)
    G.settings.controls = 'modern'; G.applySettings();
    G.devArena(); G.state = 'play';
    for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(false);
    const S = (window.SYN = { Q: [], drawn: [], t: 0, on: false, cpu: null, raf0: window.requestAnimationFrame.bind(window) });
    window.requestAnimationFrame = (cb) => { if (!S.on) return S.raf0(cb); S.Q.push(cb); return S.Q.length; };
    const R = G.renderer, r0 = R.render.bind(R);
    R.render = function () { if (S.on) { S.drawn.push(S.t); return; } return r0(); };
    // (the governor's CPU reading: the modelled CPU, not this machine's own simulation time)
    const A = G.autoQ, f0 = A.frame.bind(A);
    A.frame = (real, work) => f0(real, S.cpu ?? work);
    S.tick = (t) => { S.t = t; const q = S.Q.splice(0); for (const cb of q) cb(t); };
  });
  await ev(() => { SYN.on = true; });
  await page.waitForFunction(() => SYN.Q.length > 0, null, { timeout: 60000 });
}
// a start at High, in force (as a commit point), the programs made
async function startAt(p) {
  await ev((p) => { const G = game, A = G.autoQ; A.gov.noHelp = {}; A.gov.rec.clear(); A.gov.setProfile(p, 'test: start', { commitNow: true, t: performance.now() }); A.applyAll(); G.warmGraphics(); G.evenPace.reset('test'); G.evenPace.log = []; A.gov.log.length = 0; }, p);
  await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 });
}
const IDS = ['high', 'medium', 'lean', 'loweco', 'low', 'low75', 'low65'];
// run `ms` of display time at `hz` with the modelled cost; a pause (a commit point) every `pauseEvery` ms. Returns when
// the time is up, or right after a commit (its programs are made asynchronously: the caller waits for them)
const chunk = (o) => ev((o) => {
  const S = SYN, G = game, A = G.autoQ, R = 1000 / o.hz, end = S.t + o.ms;
  const SH = { high: [1, 1], medium: [0.56, 0.8], lean: [0.46, 0.74], loweco: [0.46, 0.72], low: [0.32, 0.7], low75: [0.29, 0.63], low65: [0.26, 0.63] };
  let t = S.t, acc = S.acc || 0, committed = null;
  const seen = S.seen ??= { caps: [], fps: [], nMax: 0, rates: [] };
  // (one clock: Auto stamps its frames with performance.now() and the even pace with the rAF time; on this synthetic
  //  display the two would drift apart — the display's seconds pass faster or slower than the machine's — so while it
  //  runs, performance.now() follows the synthetic display, never going back)
  const now0 = S.now0 ??= performance.now.bind(performance), base = Math.max(S.virt ?? 0, now0()) - S.t;
  performance.now = () => base + S.t;
  try {
  while (t < end) {
    if (o.pauseEvery && t - (S.lastPause ?? 0) >= o.pauseEvery && A.gov.pending().length) {
      S.lastPause = t; const a = A.gov.applied; G.state = 'pause'; S.tick(t); t += R; G.state = 'play';
      if (A.gov.applied !== a) { committed = { at: Math.round(t), from: o.ids[a], to: o.ids[A.gov.applied] }; break; }
      continue;
    }
    const id = o.ids[A.gov.applied], sh = SH[id], gpu = o.gpu * sh[0], cpu = o.cpu * sh[1];
    S.cpu = cpu;
    const d0 = S.drawn.length; S.tick(t);
    const drew = S.drawn.length > d0;
    if (G.frameCapMs) seen.caps.push(G.frameCapMs);
    if (G.settings.fps !== 'auto') seen.fps.push(G.settings.fps);
    seen.nMax = Math.max(seen.nMax, G.evenPace.n);
    if (drew) { acc += Math.max(gpu, cpu); const n = Math.max(1, Math.floor(acc / R + 1e-6)); acc = Math.max(0, acc - n * R); t += n * R; }
    else t += R;
  }
  } finally { S.virt = base + t; performance.now = now0; }
  S.t = t; S.acc = acc;
  return { t: Math.round(t), committed, p: o.ids[A.gov.applied], pending: A.gov.pending().length ? o.ids[A.gov.p] : null, phase: A.gov.phase };
}, o);
// a scenario: up to `secs` of display time; the drawn intervals of its last `tail` ms; what Auto did
async function scenario({ hz, gpu, cpu, secs, tail = 8000, pauseEvery = 5000 }) {
  await ev(() => { SYN.seen = null; SYN.acc = 0; SYN.lastPause = SYN.t; });
  const t0 = await ev(() => SYN.t), commits = [];
  // (the refresh measured first: 1 s at the rate)
  await chunk({ hz, ms: 1000, gpu: 1, cpu: 1, ids: IDS });
  for (;;) {
    const now = await ev(() => SYN.t);
    if (now - t0 >= secs * 1000) break;
    const r = await chunk({ hz, ms: Math.min(5000, t0 + secs * 1000 - now), gpu, cpu, pauseEvery, ids: IDS });
    if (r.committed) { commits.push(r.committed); await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 }); }
  }
  await ev(() => { SYN.drawn.length = 0; });
  await chunk({ hz, ms: tail, gpu, cpu, ids: IDS });
  return ev(([commits, IDS]) => {
    const S = SYN, G = game, A = G.autoQ, d = S.drawn, iv = d.slice(1).map((x, k) => +(x - d[k]).toFixed(2));
    const fps = iv.length ? +(1000 * iv.length / iv.reduce((a, b) => a + b, 0)).toFixed(1) : 0;
    return { commits, p: IDS[A.gov.applied], phase: A.gov.phase, scale: G.renderer.knobs?.scale ?? null, shadows: G.renderer.knobs?.shadows ?? null, eco: G.farCull.anim.eco, fps, long: iv.filter((x) => x > 20).length, n: iv.length,
      caps: [...new Set(S.seen.caps)], fpsSet: [...new Set(S.seen.fps)], nMax: S.seen.nMax, paceLog: G.evenPace.log.map((e) => e.why || e.probe || (e.denied ? `denied ${e.denied}` : '')),
      steps: A.gov.log.filter((e) => e.kind === 'down' || e.kind === 'up').map((e) => `${e.kind}${e.revert ? ' (back)' : ''}: ${e.what} — ${String(e.why).slice(0, 90)}`), stored: JSON.parse(localStorage.getItem('sunshard_settings_v1') || '{}').fps,
      govLog: A.gov.log.slice(-6).map((e) => `${e.kind}: ${String(e.why || '').slice(0, 140)}`), last: A.gov.lastWindow, pace: G.evenPace.state() };
  }, [commits, IDS]);
}

if (/[BCD]/.test(ONLY)) await boot();
const noCap = (r) => !r.caps.length && !r.fpsSet.length && (r.stored === undefined || r.stored === 'auto');
if (ONLY.includes('B')) {
  await startAt(0);
  const r = await scenario({ hz: 59.9, gpu: 60, cpu: 5, secs: 150 });
  log('B 59.9 Hz, GPU-bound (60 ms at High)', r);
  check('B 59.9 Hz, GPU-bound: Auto steps the picture down one profile at a time, each at a pause, past Low by resolution (Low 75 % or Low 65 %), the CPU rung (CPU-eco) stepped over',
    IDS.indexOf(r.p) >= 5 && r.commits.length >= 4 && r.commits.every((c, i) => IDS.indexOf(c.to) > IDS.indexOf(c.from) || /back/.test(r.steps[i] || '')) && !r.commits.some((c) => c.to === 'loweco') && r.scale <= 0.75, r);
  check('B ...and 60 holds at the end (≥ 55 fps drawn, the governor\'s own bar; under 6 % of the intervals over 20 ms)', r.fps >= 55 && r.long / Math.max(1, r.n) < 0.06, { fps: r.fps, long: r.long, n: r.n });
  check('B ...the Frame Rate stays Unlimited the whole time: no 30 (or any) limit set, nothing stored but Unlimited, the even pace never engaged on 59.9 Hz', noCap(r) && r.nMax === 1, { caps: r.caps, fpsSet: r.fpsSet, stored: r.stored, nMax: r.nMax });
}
if (ONLY.includes('C')) {
  await startAt(0);
  const r = await scenario({ hz: 59.9, gpu: 8, cpu: 26, secs: 150 });
  log('C 59.9 Hz, CPU-bound (CPU 26 ms at High)', r);
  check('C 59.9 Hz, CPU-bound: down the CPU side only (P137b: Medium-lean or CPU-eco at the end), the shadows on and the full resolution throughout; never Low or a resolution rung for CPU pressure; no limit, the Frame Rate Unlimited',
    (r.p === 'lean' || r.p === 'loweco') && !r.commits.some((c) => c.to === 'low' || c.to === 'low75' || c.to === 'low65') && r.scale === 1 && r.shadows === 1 && r.eco === true && noCap(r) && r.nMax === 1, r);
  console.log(`       C (not a check): at ${r.p} this modelled CPU (26 ms at High, × 0.74 / 0.72 at Medium-lean / CPU-eco by the cost model) draws ${r.fps} fps: P137b keeps the shadows, so a CPU-bound street stays below 60 (CPU-RELIEF.md)`);
}
if (ONLY.includes('D')) {
  await startAt(0);
  const r = await scenario({ hz: 120, gpu: 45, cpu: 5, secs: 150 });
  log('D 120 Hz, GPU-bound (45 ms at High)', r);
  check('D 120 Hz, GPU-bound: the even pace never deeper than every 2nd refresh (60 fps) — never 30 — and Auto steps the picture down until 60 holds', r.nMax <= 2 && noCap(r) && IDS.indexOf(r.p) >= 3 && r.fps >= 55, r);
}
// ---------------------------------------------------------------- S. the picture sheet (ONLY=S; not a check)
// Each of Auto's seven profiles in force (as at a commit point), the same play-camera view of the Citadel street (the
// benchmark's `street` route: the square, the shop, people), time held: captures/fps60-auto/step-<n>-<id>.png, then
// tools/fps60-sheet.py makes steps.png. SwiftShader, devicePixelRatio 1 (on the UHD 620 laptop Auto's base pixel ratio is
// 1.25: every profile there is 1.25 × sharper than here); the far-people knobs (half-rate animation, tiny far parts)
// do not show in a still.
if (ONLY.includes('S')) {
  const fs = await import('node:fs');
  const dir = new URL('../captures/fps60-auto/', import.meta.url).pathname; fs.mkdirSync(dir, { recursive: true });
  await open(page, '?nocine', { freeze: false });
  await page.click('[data-act="new"]', { timeout: 600000 });
  await page.waitForFunction(() => game.state === 'play' || game.state === 'dialog', null, { timeout: 600000 });
  await ev(() => { const G = game; G.testFreeze = true; G.settings.camera = 'follow'; G.applySettings(); const r = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; r.setup(); G.state = 'play'; for (let i = 0; i < 4; i++) G.frame(1 / 30, true); });
  const shots = [];
  for (let p = 0; p < IDS.length; p++) {
    await ev((p) => { const G = game, A = G.autoQ; G.settings.qualityAuto = true; A.gov.setProfile(p, 'test: picture', { phase: 'hold', commitNow: true, t: 0 }); G.settings.quality = A.tier(); G.applySettings(); A.applyAll(); G.warmGraphics(); }, p);
    await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 });
    // (the street route at its start, the camera held: the same frame for every profile)
    const info = await ev(() => { const G = game, r = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; r.setup(); G.state = 'play'; for (let i = 0; i < 3; i++) G.frame(1e-4, true); r.setup(); G.frame(1e-4, true);
      return { label: G.autoQ.label(), scale: G.renderer.effScale(), pr: G.renderer.pixelRatio(), cfg: G.graphicsConfig() }; });
    const file = `${dir}step-${p}-${IDS[p]}.png`;
    await page.screenshot({ path: file, timeout: 600000 });
    shots.push({ p, id: IDS[p], file, ...info, cfg: undefined, shadows: info.cfg.shadows, msaa: info.cfg.msaa, lamps: info.cfg.lamps });
  }
  fs.writeFileSync(`${dir}steps.json`, JSON.stringify(shots, null, 1));
  log('S pictures', shots.map((x) => [x.id, x.label, x.pr, x.shadows, x.msaa, x.lamps]));
}
await browser.close();
process.exit(done() ? 1 : 0);
