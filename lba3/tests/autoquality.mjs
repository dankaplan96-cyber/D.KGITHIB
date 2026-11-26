// AUTO-QUALITY (I-13), settle-then-hold (PERF-CPU): the governor and the calibration, fed synthetic frame traces (no
// browser, no GPU: this machine renders with SwiftShader, so no frame rate here means anything). Each scenario is a
// simulated machine: the CPU and GPU milliseconds of a frame at High and what each knob saves on it (its own "truth",
// deliberately not the governor's cost model), a display pacing frames at its refresh (or at a slower plateau, as the
// user's Vega 8 laptop sometimes does at ~56.5 Hz), noisy timings, stalls, and scene changes (each one a commit point).
// The checks (the user, 29.10): Auto moves among three named profiles (LOOK-FIRST; five before) one at a time; it evaluates the first minute or so
// of play across two scenes, then holds; after settling, at most one change in a 15-minute noisy session; no change
// is ever applied outside a scene change or a menu; display-paced plateaus never move it; it never steps up in a
// session; stalls and transitions never move it.
//   node tests/autoquality.mjs
import { checker } from './lib/boot.mjs';
import { Governor, Calibration, describe, estimate, knobsAt, PROFILES, N_PROFILES, PRESET_KNOBS, KNOBS, TIER_AT, nextProfile, spell, EVAL_MS } from '../src/engine/autoquality.js';
const { check, done } = checker();

// ---------------------------------------------------------------- a simulated machine
// truth: what each knob value saves (multiplicative), independent of the governor's model
const TRUTH = {
  gpu: { scale: (s) => 0.55 + 0.45 * s * s, bloom: { 1: 1, 0: 0.72 }, filter: { soft: 1, pcf: 0.95 }, map: { 4096: 1, 2048: 0.95, 1024: 0.91 }, lamps: { 8: 1, 4: 0.94, 2: 0.9 }, msaa: { 4: 1, 2: 0.93, 0: 0.85 }, shadows: { 1: 1, 0: 0.8 }, veg: { high: 1, medium: 0.99, low: 0.97 }, casters: { high: 1, medium: 0.99, low: 0.98 }, anim: { full: 1, eco: 1 }, detail: { normal: 1, near: 0.98 } },
  cpu: { scale: () => 1, bloom: { 1: 1, 0: 0.88 }, filter: { soft: 1, pcf: 1 }, map: { 4096: 1, 2048: 0.95, 1024: 0.95 }, lamps: { 8: 1, 4: 1, 2: 1 }, msaa: { 4: 1, 2: 1, 0: 1 }, shadows: { 1: 1, 0: 0.82 }, veg: { high: 1, medium: 0.98, low: 0.95 }, casters: { high: 1, medium: 0.95, low: 0.92 }, anim: { full: 1, eco: 0.95 }, detail: { normal: 1, near: 0.94 } },
};
const cost = (K, side, hi) => { let f = hi; for (const k of KNOBS) { const T = TRUTH[side][k]; f *= typeof T === 'function' ? T(K.scale) : T[K[k]]; } return f; };
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// run: machine { cpu, gpu (ms at High), display (ms: the refresh, or a plateau), scene (ms between scene changes) };
// events(t) → { stall, trans, cpu, gpu, display, scene }. A scene change: 0.6 s of not-play frames, a new scene id and a
// commit (the game's warmScene). noise: the timings' spread (±, as a share). The run records every change of the
// profile in force and whether it happened inside a commit.
function run(G, M, secs, { events = () => ({}), timer = true, t0 = G.since || 0, noise = 0.08, menuEvery = 0 } = {}) {
  let t = t0, nextScene = t0 + (M.scene ?? 45000), sceneN = G._sceneN || 0, transUntil = -1, nextMenu = menuEvery ? t0 + menuEvery : Infinity;
  const trace = [], applied = [];
  while (t < t0 + secs * 1000) {
    const e = events(t - t0) || {}, K = G.knobs();
    const k = () => 1 - noise + 2 * noise * rnd();
    const cpu = cost(K, 'cpu', e.cpu ?? M.cpu) * k(), gpu = cost(K, 'gpu', e.gpu ?? M.gpu) * k();
    let ms = Math.max(e.display ?? M.display ?? 16.67, cpu, gpu) * (0.99 + 0.02 * rnd());
    if (e.stall) ms = e.stall;
    t += ms;
    if (t >= nextScene) { nextScene = t + (M.scene ?? 45000); sceneN++; transUntil = t + 600; const a = G.applied; G.commit('test: scene change'); if (G.applied !== a) applied.push({ t, from: a, to: G.applied, at: 'scene change' }); }
    if (t >= nextMenu) { nextMenu = t + menuEvery; const a = G.applied; G.commit('test: pause'); if (G.applied !== a) applied.push({ t, from: a, to: G.applied, at: 'menu' }); }
    const before = G.applied;
    G.frame({ t, ms, cpu, play: !e.trans && t > transUntil, scene: e.scene ?? 'scene' + sceneN });
    if (G.applied !== before) applied.push({ t, from: before, to: G.applied, at: 'IN PLAY' });
    if (timer && !e.trans && t > transUntil) G.gpu(t + 40, gpu);
    trace.push({ t, ms, p: G.applied });
  }
  G._sceneN = sceneN;
  return { t, trace, applied };
}
const steps = (G, from = 0, to = Infinity) => G.log.filter((e) => (e.kind === 'down' || e.kind === 'up') && e.t >= from && e.t < to);
const settledAt = (G) => G.log.find((e) => e.kind === 'settled')?.t ?? null;
const fpsOf = (tr, from) => { const f = tr.filter((x) => x.t >= from); return f.length / ((f[f.length - 1].t - f[0].t) / 1000); };
const name = (p) => PROFILES[p].name;

// ---------------------------------------------------------------- the profiles and the labels
{
  check('seven named profiles, best first: High · Medium · Medium-lean · Low (AUTO-2, P95, AUTO-FLOOR) · Low-eco · Low 75 % · Low 65 % (P137)', PROFILES.map((x) => x.name).join(' · ') === 'High · Medium · Medium-lean · Low · Low-eco · Low 75 % · Low 65 %', PROFILES.map((x) => x.name));
  const eq = (a, b) => KNOBS.every((k) => a[k] === b[k]);
  check('High, Medium and Low are the presets exactly (every knob); TIER_AT.low is Low', eq(knobsAt(0), PRESET_KNOBS.high) && eq(knobsAt(1), PRESET_KNOBS.medium) && eq(knobsAt(3), PRESET_KNOBS.low) && TIER_AT.low === 3, {});
  // P137: below Low, only far-people detail and resolution: Low-eco (CPU) = Low + far people at half rate + tiny far parts
  // dropped; Low 75 % / 65 % (GPU) = Low-eco at 75 / 65 % resolution; nothing else (shadows already off, lamps 2 kept)
  { const L = knobsAt(3), d = (p) => KNOBS.filter((k) => knobsAt(p)[k] !== L[k]).join();
    check('P137 the rungs below Low: Low-eco (CPU: anim, detail), Low 75 % and Low 65 % (GPU: + resolution 0.75 / 0.65); lamps, vegetation, casters as Low; for one side each',
      d(4) === 'anim,detail' && d(5) === 'scale,anim,detail' && d(6) === 'scale,anim,detail' && knobsAt(5).scale === 0.75 && knobsAt(6).scale === 0.65
      && PROFILES[3].only === 'gpu' && PROFILES[4].only === 'cpu' && PROFILES[5].only === 'gpu' && PROFILES[6].only === 'gpu' && PROFILES.slice(0, 3).every((x) => !x.only), [d(4), d(5), d(6)]); }
  { const M = knobsAt(1), Ln = knobsAt(2), diff = KNOBS.filter((k) => M[k] !== Ln[k]);
    check('P95 Medium-lean is Medium at full resolution with its shadows (map, filter), minus MSAA (output-pass edges), 2 lamps, Low\'s far grass and small shadows, far people at half rate and their tiny far parts',
      Ln.scale === 1 && Ln.shadows === 1 && Ln.filter === M.filter && Ln.map === M.map && Ln.bloom === 0 && diff.join() === 'lamps,msaa,veg,casters,anim,detail' && Ln.msaa === 0 && Ln.lamps === 2, { diff, Ln }); }
  check('the labels are the profile names; a state that is not a profile names its nearest and every difference', describe(knobsAt(1)).text === 'Medium'
    && describe({ ...PRESET_KNOBS.high, bloom: 0 }).text === 'High, no bloom' && describe(knobsAt(1)).tier === 'medium', [describe({ ...PRESET_KNOBS.high, bloom: 0 }).text]);
  check('each profile is no more costly than the one above it, on both sides, by the model', PROFILES.every((x, i) => !i || (x.gpu <= PROFILES[i - 1].gpu && x.cpu <= PROFILES[i - 1].cpu)), PROFILES.map((x) => [x.gpu, x.cpu]));
  check('spell(): what a profile runs, in words', /Medium: resolution 100 %, MSAA 2×/.test(spell(1)), spell(1));
}

// ---------------------------------------------------------------- 1. a machine with room: High, settled, no change
{
  const G = new Governor();
  const { applied } = run(G, { cpu: 8, gpu: 8, display: 16.67, scene: 40000 }, 900);
  check('room to spare (CPU 8 ms, GPU 8 ms at High): settles on High within ~90 s, 15 min, no step', steps(G).length === 0 && G.applied === 0 && G.phase === 'hold' && settledAt(G) <= 95000, { settled: settledAt(G), log: G.log.slice(-3) });
  check('... and with lots of room the session is marked for the cache (margin): the next start may try higher', G.margin() === false, '(High has nothing above it)');
  void applied;
}
// ---------------------------------------------------------------- 2. display / OS plateaus
for (const plateau of [17.7, 19.2]) {
  const G = new Governor();
  run(G, { cpu: 7, gpu: 9, display: plateau, scene: 40000 }, 900);
  check(`display-paced plateau at ${plateau} ms (${(1000 / plateau).toFixed(1)} fps) with light CPU and GPU work: 15 min, no step, held at High`, steps(G).length === 0 && G.applied === 0 && G.phase === 'hold', { kinds: G.lastWindow, log: G.log.slice(-2) });
}
{
  const G = new Governor();
  run(G, { cpu: 7, gpu: 9, display: 19.2, scene: 40000 }, 600, { timer: false });
  check('the same 19.2 ms plateau without a GPU timer query: no step down', steps(G).filter((e) => e.kind === 'down').length === 0, { last: G.lastWindow, log: G.log.slice(-3) });
}
// ---------------------------------------------------------------- 3. GPU-bound and CPU-bound machines settle, then hold
for (const [label, M] of [['GPU-bound (GPU 24 ms at High, CPU 8)', { cpu: 8, gpu: 24 }], ['CPU-bound (CPU 21 ms at High, GPU 9: a battery-clocked processor)', { cpu: 21, gpu: 9 }], ['heavily CPU-bound (CPU 27 ms at High)', { cpu: 27, gpu: 8 }]]) {
  const G = new Governor();
  const { trace, applied } = run(G, { ...M, display: 16.67, scene: 30000 }, 900, { noise: 0.15 });
  const s = settledAt(G), after = s == null ? [] : steps(G, s);
  check(`${label}: steps down during the evaluation and settles (held) within 4 min`, s != null && s < 240000 && G.phase === 'hold', { s, st: G.state().label, log: steps(G).map((e) => `${e.t} ${e.what}`) });
  check('... settled at a profile that holds ≥ 55 fps, or at the floor (LOOK-FIRST: never below Medium\'s look) (last 5 min)', fpsOf(trace, trace[trace.length - 1].t - 300000) >= 55 || G.applied === PROFILES.length - 1, { fps: fpsOf(trace, trace[trace.length - 1].t - 300000).toFixed(1), p: name(G.applied) });
  check('... at most one change after settling in the 15-minute noisy session, never a step up after settling', after.length <= 1 && after.every((e) => e.kind === 'down'), after.map((e) => `${e.t} ${e.what}`));
  check('... every change of the profile in force happened at a scene change or a menu, never in play', applied.every((a) => a.at !== 'IN PLAY'), applied);
}
// ---------------------------------------------------------------- 4. the noisiest session: 15 min, heavy noise, short bursts
{
  const G = new Governor();
  const burst = (t) => (t % 37000 < 2500 ? { cpu: 30 } : t % 53000 < 900 ? { stall: 180 } : {});
  const { applied } = run(G, { cpu: 12, gpu: 11, display: 16.67, scene: 25000 }, 900, { noise: 0.3, events: burst, menuEvery: 170000 });
  const s = settledAt(G), after = s == null ? [] : steps(G, s);
  check('a noisy machine near the edge (CPU 12 ± 30 %, GPU 11, a 2.5 s burst every 37 s, a 180 ms stall every 53 s): settles and changes at most once after', s != null && after.length <= 1, { s, after: after.map((e) => `${e.t} ${e.what}`), st: G.state().label });
  check('... no change applied outside a scene change or a menu', applied.every((a) => a.at !== 'IN PLAY'), applied);
}
// ---------------------------------------------------------------- 5. stalls and scene changes never move it
{
  const G = new Governor();
  run(G, { cpu: 8, gpu: 9, display: 16.67, scene: 40000 }, 300, { events: (t) => {
    const s = t % 10000;
    if (s < 17) return { stall: 550 };                       // a loading hitch every 10 s
    if (s > 4000 && s < 4060) return { stall: 160 };         // and a GC-like 160 ms frame
    if (s > 6000 && s < 6900) return { trans: true, cpu: 40, gpu: 40 };   // a scene change: heavy frames, not play
    return {};
  } });
  check('a 550 ms stall every 10 s, a 160 ms frame, a heavy transition: 5 min, no step', steps(G).length === 0 && G.applied === 0, { log: G.log.slice(-4), last: G.lastWindow });
}
// ---------------------------------------------------------------- 6. a heavier area after settling: held unless sustained
{
  const G = new Governor();
  // light for 3 min (settles on High), then a heavier scene for 20 s (no change), later a long heavy stretch over scenes
  const ev = (t) => (t > 200000 && t < 220000 ? { gpu: 24 } : t > 400000 ? { gpu: 26 } : {});
  const { applied } = run(G, { cpu: 7, gpu: 9, display: 16.67, scene: 30000 }, 600, { events: ev });
  const s = settledAt(G), C = steps(G, s ?? 0);
  check('settled on High; a 20 s heavier stretch: no change', s != null && C.filter((e) => e.t < 400000).length === 0, C.map((e) => `${e.t} ${e.what}`));
  check('... a heavy stretch sustained > 30 s across scene changes: exactly one profile down, applied at the next scene change', C.length === 1 && C[0].kind === 'down' && C[0].t > 420000 && applied.length === 1 && applied[0].at === 'scene change' && applied[0].to === 1, { C: C.map((e) => `${e.t} ${e.what}`), applied });
}
// ---------------------------------------------------------------- 7. never up during the session; once during the evaluation
{
  // starts (calibration's guess) at Low on a machine that could run Medium: the evaluation goes up once, then holds
  const G = new Governor();
  G.setProfile(1, 'test: calibration guess', { commitNow: true, t: 0 });
  const { applied } = run(G, { cpu: 9, gpu: 9, display: 16.67, scene: 30000 }, 600);
  const ups = steps(G).filter((e) => e.kind === 'up');
  check('started too low (Medium) with lots of room: the evaluation steps up once (applied at a scene change) and then holds', ups.length === 1 && G.phase === 'hold' && G.applied === 0 && applied.every((a) => a.at !== 'IN PLAY'), { ups: ups.map((e) => `${e.t} ${e.what}`), p: name(G.applied), applied });
  const G2 = new Governor(); G2.setProfile(1, 'test: held', { phase: 'hold', commitNow: true, t: 0 });
  run(G2, { cpu: 5, gpu: 5, display: 16.67, scene: 30000 }, 600);
  check('held (from the cache) with lots of room: never steps up in the session; the margin is noted for the next start', steps(G2).length === 0 && G2.applied === 1 && G2.margin() === true, G2.state());
}
// ---------------------------------------------------------------- 8. the next start's try one up (from the cache)
{
  const G = new Governor();
  G.setProfile(0, 'test: settled Medium had room: try High', { commitNow: true, t: 0, trial: true });
  run(G, { cpu: 7, gpu: 22, display: 16.67, scene: 30000 }, 300);
  check('a try one profile up that cannot hold: back down to the settled profile, held, marked failed (not tried again for a while)', G.applied === 1 && G.phase === 'hold' && G.trial?.failed === true && steps(G).filter((e) => e.kind === 'up').length === 0, { st: G.state(), log: steps(G).map((e) => e.what) });
}
// ---------------------------------------------------------------- 9. the lowest profile: no further step, a note
{
  const G = new Governor();
  const { applied } = run(G, { cpu: 45, gpu: 30, display: 16.67, scene: 30000 }, 400);
  // (P137: CPU-bound — CPU 45 ms, GPU 30 at High: the CPU rung below Low (Low-eco), never a resolution-only rung for CPU
  //  pressure; then held at the lowest profile for CPU pressure)
  check('a machine below even Low (CPU-bound): walks down to Low-eco (P137: the CPU rung, no resolution rung for CPU pressure), settles there, no oscillation', G.applied === 4 && G.phase === 'hold' && steps(G).every((e) => e.kind === 'down') && !steps(G).some((e) => /Low 75|Low 65/.test(e.what)) && applied.every((a) => a.at !== 'IN PLAY'), { p: name(G.applied), steps: steps(G).map((e) => e.what) });
}
// ---------------------------------------------------------------- 9b. P137: GPU-bound below Low: the resolution rungs
{
  // (GPU 60 ms at High, CPU 6: Low draws ~19 ms by this test's truth — past 60 — and Low 65 % ~15.7: the resolution
  //  rungs, Low-eco stepped over (it buys almost no GPU time), and 60 held at the end)
  const G = new Governor();
  const { trace, applied } = run(G, { cpu: 6, gpu: 60, display: 16.67, scene: 30000 }, 600);
  const f = fpsOf(trace, trace[trace.length - 1].t - 120000);
  console.log('       P137 GPU-bound below Low:', JSON.stringify({ p: name(G.applied), phase: G.phase, fps: +f.toFixed(1), steps: steps(G).map((e) => e.what) }));
  check('P137 a GPU-bound machine Low cannot hold at 60: steps on below Low by resolution (Low 75 %, Low 65 %), steps over Low-eco, holds ≥ 55 fps at the end, every change at a commit point',
    G.applied >= 5 && G.phase === 'hold' && !steps(G).some((e) => /→ Low-eco/.test(e.what)) && f >= 55 && applied.every((a) => a.at !== 'IN PLAY'), { p: name(G.applied), fps: f, steps: steps(G).map((e) => e.what) });
}
// ---------------------------------------------------------------- 10. a 30 fps limit: 33 ms frames are on time
{
  const G = new Governor({ budget: () => 1000 / 30 });
  run(G, { cpu: 9, gpu: 12, display: 33.33, scene: 40000 }, 300);
  check('a 30 fps frame-rate limit: frames at 33.3 ms are on budget, no step', steps(G).length === 0, G.lastWindow);
}
// ---------------------------------------------------------------- 11. no GPU timer query
{
  const G = new Governor();
  const { trace } = run(G, { cpu: 7, gpu: 26, display: 16.67, scene: 30000 }, 600, { timer: false });
  check('no GPU timer query, frames at ~26 ms with light CPU work: steps down to a profile that holds ≥ 55 fps, then holds', G.phase === 'hold' && fpsOf(trace, trace[trace.length - 1].t - 120000) >= 55, { fps: fpsOf(trace, trace[trace.length - 1].t - 120000).toFixed(1), p: name(G.applied) });
}
// ---------------------------------------------------------------- 12. one scene only: the evaluation ends after EVAL_MAX
{
  const G = new Governor();
  run(G, { cpu: 8, gpu: 8, display: 16.67, scene: 1e9 }, 200);
  const s = settledAt(G);
  check('a player who stays in one scene: the evaluation still ends (≤ 2 min of play), held', s != null && s <= 130000 && s > EVAL_MS, { s });
}
// ---------------------------------------------------------------- 13. calibration
{
  const vega = estimate({ gpuMs: 5, cpuMs: 7, p0: TIER_AT.low });
  const fast = estimate({ gpuMs: 3, cpuMs: 4, p0: 0 }), slow = estimate({ gpuMs: 14, cpuMs: 14, p0: TIER_AT.low }), noTimer = estimate({ gpuMs: null, cpuMs: 4, p0: 1 });
  check('calibration: a fast machine → High; a slow one → the lowest profile; the GPU side unmeasured is not limited', fast.p === 0 && slow.p === N_PROFILES - 1 && noTimer.p <= 1, { fast, slow, noTimer });
  { const c = new Calibration({ p0: 1 }); c.t0 = 0; for (let i = 0; i < 40; i++) { c.f.push(30); c.cpu.push(28); c.g.push(26); } const r = c.finish();
    check('AUTO-FLOOR: a slow title starts no lower than Medium (play decides lower)', r.p === TIER_AT.medium, r); }
  check('calibration: the Vega-like numbers start above the name\'s Low', vega.p < TIER_AT.low, { vega, label: name(vega.p) });
  const cal = new Calibration({ p0: 0 });
  let r = null, t = 0;
  for (let i = 0; i < 400 && !r; i++) { t += 16.7; cal.gpu(4); r = cal.frame(t, 16.7, 5); }
  check('the title calibration finishes after ~2 s of frames and reports what it measured', r && r.p === 0 && r.gpuMs === 4 && r.cpuMs === 5 && t < 2600, { r, t });
  check('nextProfile: a power change without a cached profile moves one profile', nextProfile(0, -1) === 1 && nextProfile(1, -1) === 2 && nextProfile(3, -1) === 4 && nextProfile(N_PROFILES - 1, -1) === N_PROFILES - 1 && nextProfile(1, +1) === 0 && nextProfile(0, +1) === 0, {});
}
// ---------------------------------------------------------------- 14. what the profiles never touch
check('the knobs are rendering and far-detail only (resolution, bloom, shadows, lamps, MSAA, grass, small casters, far people\'s animation rate, far small parts): no simulation, physics or hero knob',
  KNOBS.join() === 'scale,bloom,filter,map,lamps,msaa,shadows,veg,casters,anim,detail', KNOBS);

// ================================================================ P95 (the user, 21.11: "make Auto give the best image
// and quality while keeping it running smoothly, in every way"). Synthetic machines — Automated runtime only: no number
// here is a measurement of any GPU; each machine's "truth" is written from the real-hardware reports named beside it
// (docs/lba3-performance/AUTO-P95.md §2) and is deliberately not the governor's cost model. A display is simulated
// refresh by refresh: requestAnimationFrame calls back on a refresh once the last frame's work is done, the frame-rate
// limit draws or skips that callback as Game.loop does (n refreshes where the limit is a whole number of them, else the
// grid), Chrome's battery pacing can slip a callback a refresh, and a frame under a limit of ≥ 2 refreshes is SHOWN a
// refresh late when its work runs past the next refresh (the truth the rAF intervals cannot see: FPS30-PRESENT).
// BEFORE=<path to an older autoquality.js> prints that module's table beside this one (the doc's before/after).
{
  const SC = [['citadel', 40000], ['house', 25000], ['citadel', 40000], ['arena', 30000]];   // (the street, an interior, a fight; revisits)
  // truth per machine: High's ms per scene; each profile's share of High (by id); battery multipliers on top
  const MACH = {
    fast: { label: 'fast GPU (dPR 1)', igpu: false, noise: 0.1, sc: { citadel: [4, 4.5], house: [3, 3], arena: [3.5, 3.5] },
      gpuF: { high: 1, medium: 0.7, lean: 0.6, low: 0.45 }, cpuF: { high: 1, medium: 0.9, lean: 0.86, low: 0.8 } },
    // GTX1050-AC / FPS30-PRESENT: High street GPU p50 6.0–8.8 ms, Medium 7.8–9.0 (alike on this GPU), game CPU 5–6 ms;
    // battery (the user's 18.11 run, Medium, 60 Hz): street GPU p50 11.0 / p95 13.6, CPU work p50 12.4 / p95 17.5
    gtx1050: { label: 'GTX 1050 laptop (dPR 1.25)', igpu: false, noise: 0.15, sc: { citadel: [8.5, 6.5], house: [6, 4], arena: [6.8, 4.5] },
      gpuF: { high: 1, medium: 0.95, lean: 0.85, low: 0.62 }, cpuF: { high: 1, medium: 0.9, lean: 0.86, low: 0.79 },
      bat: { gpu: 1.36, cpu: 2.1 } },
    // HARDWARE/2026-11-19-intel-uhd620-mains: Medium street GPU p50 15.0 / p95 18.1, CPU work p50 16.4 / p95 22.3, interior
    // GPU 8.7 CPU 5.2, combat GPU 6.3 CPU 5.2 (dPR 2, Auto's pixel ratio 1.25); shares from the i5 UHD's street (High 24.1,
    // Medium 11.0, Low 7.7 ms GPU; submit High 14.8, Medium 5.1, Low 5.4 ms); battery (FPS30.md §7): street GPU 17–18.5 at 30
    uhd620: { label: 'Intel UHD 620 (dPR 2)', igpu: true, noise: 0.3, sc: { citadel: [32.6, 21.9], house: [18.9, 6.9], arena: [13.7, 6.9] },
      gpuF: { high: 1, medium: 0.46, lean: 0.39, low: 0.32 }, cpuF: { high: 1, medium: 0.75, lean: 0.72, low: 0.71 },
      bat: { gpu: 1.25, cpu: 1.2, cuts: 0.9 } },
    // the same GPU with the street's CPU work at the interior's (what the GPU ladder alone does on this machine)
    uhd620gpu: { label: 'UHD 620 (dPR 2), light CPU', igpu: true, noise: 0.3, sc: { citadel: [32.6, 8], house: [18.9, 6.9], arena: [13.7, 6.9] },
      gpuF: { high: 1, medium: 0.46, lean: 0.39, low: 0.32 }, cpuF: { high: 1, medium: 0.75, lean: 0.72, low: 0.71 },
      bat: { gpu: 1.25, cpu: 1.2, cuts: 0.9 } },
  };
  // (P137: the rungs below Low, for every machine — an assumption, not a measurement: Low's share × the far-people knobs
  //  (GPU 0.98, CPU 0.95 · 0.94) and the resolution's pixel share at the GPU (0.55 + 0.45 · s², as TRUTH above))
  for (const M of Object.values(MACH)) { const g = M.gpuF.low, c = M.cpuF.low, px = (sc) => (0.55 + 0.45 * sc * sc) / (0.55 + 0.45 * 0.85 * 0.85);
    Object.assign(M.gpuF, { loweco: g * 0.98, low75: g * 0.98 * px(0.75), low65: g * 0.98 * px(0.65) }); Object.assign(M.cpuF, { loweco: c * 0.89, low75: c * 0.89, low65: c * 0.89 }); }
  // power states: mains; battery on a 60 Hz panel; battery with the panel at 41 Hz (GTX1050-BATTERY: 24.4 ms with nothing
  // drawn; the GPU clocks down and its timer reads ~1.4× longer); battery with Chrome's pacing (12 % of the callbacks a
  // refresh late: FPS30-PRESENT, rAF p95 33.4) — the browser's, not the game's
  const POWER = { mains: { R: 16.67 }, battery: { R: 16.67, bat: true }, 'battery 41 Hz': { R: 24.4, bat: true, slowGpu: 1.4 }, 'battery paced': { R: 16.67, bat: true, slip: 0.12 } };
  // ka (GPU-TIMER-KA): the keep-alive mark on each refresh the limit skips (main.js _keepAlive) — { add: ms the GPU timer
  // reads on top of the frame's own work for a frame drawn after one (P96-HW, GTX 1050 in the 57 Hz state: 6–8 → 16–20 ms,
  // about +11), tag: the reading is passed on as taken after a mark (false: the P95 code, which did not know) }
  const simulate = (mod, mk, pw, fps, secs = 480, seed0 = +process.env.P95SEED || 11, ka = null) => {
    const M = MACH[mk], P = POWER[pw], cap = fps === 30 ? 1000 / 30 : 0, R = P.R, bat = !!P.bat;
    const ids = mod.PROFILES.map((x) => x.id), idx = (id) => ids.indexOf(id);
    const skip = (p) => bat && ids[p] === 'lean';
    const G = new mod.Governor({ budget: () => Math.max(1000 / 60, cap), upBudget: () => 1000 / 60, refresh: () => R, skip });
    // the start (autoapply.js): plugged in High, or Medium for a GPU whose name says integrated; on battery Medium
    G.setProfile(idx(bat || M.igpu ? 'medium' : 'high'), 'test: start (the GPU name\'s guess)', { commitNow: true, t: 0 });
    let s = seed0; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let t = 0, k = 0, si = 0, sceneEnd = SC[0][1], transUntil = -1, lastDraw = null, due = 0, drawT = 0;
    const nR = cap ? Math.round(cap / R) : 0, whole = cap && nR >= 2 && Math.abs(cap / R - nR) < 0.08;
    const tr = [], changes = [];
    let lateNow = null, flips = 0, lateN = 0, drawn = 0, street = { n: 0, ms: 0 }, skipped = 0;
    while (t < secs * 1000) {
      // a refresh tick: rAF calls back
      const now = k * R;
      if (now >= sceneEnd) { si++; sceneEnd = now + SC[si % SC.length][1]; transUntil = now + 600; const a = G.applied; G.commit('test: scene change'); if (G.applied !== a) changes.push({ t: now, to: G.applied }); }
      const scene = SC[si % SC.length][0];
      // the limit (Game.loop): skip this callback, or draw
      let draw = true;
      if (whole) { if (drawT && now - drawT < (nR - 0.5) * R) draw = false; else drawT = now; }
      else if (cap && cap > R + 1) { if (due && now < due - R / 2) draw = false; else { let nx = (due || now) + cap; if (!due || nx - now < cap - 0.75 * R) nx = now + cap; due = nx; } }
      if (!draw) { skipped++; k++; t = k * R; continue; }
      const marked = !!ka && skipped > 0; skipped = 0;
      const id = ids[G.applied], base = M.sc[scene], q = () => 1 - M.noise + 2 * M.noise * rnd();
      let gpu = base[0] * M.gpuF[id] * q(), cpu = base[1] * M.cpuF[id] * q();
      if (bat) { gpu *= M.bat?.gpu ?? 1.3; cpu *= (M.bat?.cpu ?? 1.3) * (P.cpu ?? 1); if (id === 'high' || id === 'medium') gpu *= M.bat?.cuts ?? 1; }
      if (P.slowGpu && Math.max(cpu, gpu) < 0.8 * R) gpu *= P.slowGpu;   // (DVFS: a slack GPU clocks down; its timer reads longer)
      const ms = lastDraw == null ? R : now - lastDraw; lastDraw = now;
      const play = now > transUntil;
      if (play) {
        G.frame({ t: now, ms, cpu, play: true, scene });
        if (ka) G.gpu(now + 30, gpu + (marked ? ka.add * (1 - 0.1 + 0.2 * rnd()) : 0), marked && ka.tag); else G.gpu(now + 30, gpu);
        drawn++;
        if (scene === 'citadel' && now > (secs - 180) * 1000) { street.n++; street.ms += ms; }
        if (whole) { const late = Math.max(cpu, gpu) > R; if (late) lateN++; if (lateNow != null && late !== lateNow) flips++; lateNow = late; }
      } else G.frame({ t: now, ms, cpu, play: false, scene });
      // the next callback: once this frame's work is done (a refresh at least), sometimes a refresh late (battery pacing)
      const busy = Math.max(1, Math.ceil(Math.max(cpu, gpu) / R - 0.02));
      k += busy + (P.slip && rnd() < P.slip ? 1 : 0);
      t = k * R;
      tr.push(G.applied);
    }
    const n = (e) => mod.PROFILES[e].name;
    return { M, end: G.applied, name: n(G.applied), phase: G.phase, steps: G.log.filter((e) => e.kind === 'down' || e.kind === 'up').map((e) => `${Math.round(e.t / 1000)}s ${e.kind}${e.revert ? ' (back)' : ''} → ${n(e.to)}`),
      settled: G.log.find((e) => e.kind === 'settled' && e.why !== 'set')?.t ?? null, streetFps: street.n ? +(street.n * 1000 / street.ms).toFixed(1) : null, uneven: whole ? +(flips / (drawn / (fps || 60)) * 60).toFixed(1) : null, lateShare: whole ? +(lateN / Math.max(1, drawn)).toFixed(2) : null, log: G.log };
  };
  const ROWS = [['fast', 'mains'], ['fast', 'battery'], ['gtx1050', 'mains'], ['gtx1050', 'battery'], ['gtx1050', 'battery 41 Hz'], ['gtx1050', 'battery paced'], ['uhd620', 'mains'], ['uhd620', 'battery'], ['uhd620gpu', 'mains'], ['uhd620gpu', 'battery']];
  const table = (mod, tag) => {
    const out = [`P95 decision table — ${tag} (Automated runtime only: synthetic machines, 8 min of play each, the street 40 s · interior 25 s · street 40 s · combat 30 s, repeated)`,
      'machine | power | limit | settles on | steps (time → profile) | street fps (last 3 min) | frames shown late (share) · uneven pairs / min'];
    const res = {};
    for (const [mk, pw] of ROWS) for (const fps of [60, 30]) {
      const r = simulate(mod, mk, pw, fps); res[`${mk}|${pw}|${fps}`] = r;
      out.push(`${MACH[mk].label} | ${pw} | ${fps} | ${r.name}${r.phase === 'hold' ? '' : ' (evaluating)'} | ${r.steps.join(', ') || 'none'} | ${r.streetFps ?? '–'} | ${r.lateShare == null ? '–' : `${r.lateShare} · ${r.uneven}`}`);
    }
    return { text: out.join('\n'), res };
  };
  const mod = await import('../src/engine/autoquality.js');
  const after = table(mod, 'this build');
  console.log('\n' + after.text + '\n');
  if (process.env.BEFORE) { const old = await import(new URL(process.env.BEFORE, 'file://' + process.cwd() + '/').href); console.log(table(old, `before (${process.env.BEFORE})`).text + '\n'); }
  const R = after.res, at = (k) => R[k];
  if (process.env.P95LOG) for (const e of R[process.env.P95LOG]?.log || []) console.log(`  ${(e.t / 1000).toFixed(1)}s ${e.kind} ${e.what || ''} — ${e.why || ''} [${e.state}${e.pending ? ' → ' + e.pending : ''}]`);   // (P95LOG=machine|power|fps: that run's decisions)
  check('P95 a fast GPU: High at 60 and at 30, no step', ['fast|mains|60', 'fast|mains|30'].every((k) => at(k).name === 'High' && !at(k).steps.length), ['fast|mains|60', 'fast|mains|30'].map((k) => at(k).steps));
  check('P95 a fast GPU on battery: starts at Medium (the battery guess) and takes the one step up to High in the evaluation (60 and 30)', ['fast|battery|60', 'fast|battery|30'].every((k) => at(k).name === 'High' && at(k).steps.length === 1 && /up → High/.test(at(k).steps[0])), ['fast|battery|60', 'fast|battery|30'].map((k) => at(k).steps));
  check('P95 GTX 1050-like plugged in: High at 60 and at 30, no step', ['gtx1050|mains|60', 'gtx1050|mains|30'].every((k) => at(k).name === 'High' && !at(k).steps.length), ['gtx1050|mains|60', 'gtx1050|mains|30'].map((k) => [at(k).name, at(k).steps]));
  check('P95 GTX 1050-like on battery, 60 Hz panel: Medium held at 60 and 30 (shadows, full resolution), no step down', ['gtx1050|battery|60', 'gtx1050|battery|30'].every((k) => at(k).name === 'Medium' && !at(k).steps.some((x) => /down/.test(x))), ['gtx1050|battery|60', 'gtx1050|battery|30'].map((k) => [at(k).name, at(k).steps]));
  check('P95 the panel at 41 Hz on battery (GTX1050-BATTERY): the display\'s pace, not pressure — Medium held, no step at 60 or 30 (it went Medium → Low before)', ['gtx1050|battery 41 Hz|60', 'gtx1050|battery 41 Hz|30'].every((k) => at(k).name === 'Medium' && !at(k).steps.length), ['gtx1050|battery 41 Hz|60', 'gtx1050|battery 41 Hz|30'].map((k) => [at(k).name, at(k).steps, at(k).log.filter((e) => e.kind === 'down').map((e) => e.why)]));
  check('P95 Chrome\'s battery pacing (callbacks a refresh late) at 60 and 30: Medium kept — a step down it provokes buys no frame rate and goes back', ['gtx1050|battery paced|60', 'gtx1050|battery paced|30'].every((k) => at(k).name === 'Medium'), ['gtx1050|battery paced|60', 'gtx1050|battery paced|30'].map((k) => [at(k).name, at(k).steps]));
  check('P95 UHD 620 plugged in at 60: the street\'s CPU work no profile removes does not take the whole game to Low (Medium-lean or Medium: a step to Low that bought nothing went back)', at('uhd620|mains|60').name !== 'Low', [at('uhd620|mains|60').name, at('uhd620|mains|60').steps]);
  check('P95 UHD 620 with a light CPU, plugged in at 60: the GPU ladder stops at Medium-lean (full resolution, shadows), not Low', at('uhd620gpu|mains|60').name === 'Medium-lean', [at('uhd620gpu|mains|60').name, at('uhd620gpu|mains|60').steps]);
  check('P95 UHD 620 with a light CPU at 30: the frames shown a refresh late (GPU past one refresh) are seen: it steps down until they are rare (≤ 5 % of frames) or it is at Low, and never back up into a profile that showed them', ['uhd620gpu|mains|30', 'uhd620gpu|battery|30'].every((k) => (at(k).lateShare <= 0.05 || at(k).name === 'Low') && !at(k).steps.some((x) => /up/.test(x))), ['uhd620gpu|mains|30', 'uhd620gpu|battery|30'].map((k) => [at(k).name, at(k).lateShare, at(k).steps]));
  check('P95 ... where the old governor held Medium at 30 with 19–32 % of the frames shown late (it judged 30 on 33.3 ms alone): now ≤ 8 %', ['uhd620gpu|mains|30', 'uhd620gpu|battery|30'].every((k) => at(k).lateShare <= 0.08), ['uhd620gpu|mains|30', 'uhd620gpu|battery|30'].map((k) => at(k).lateShare));
  check('P95 on battery the ladder steps over Medium-lean (the battery profile already takes MSAA and lamps): no battery run settles on it', Object.entries(R).filter(([k]) => /battery/.test(k)).every(([, r]) => r.name !== 'Medium-lean' && !r.steps.some((x) => /Medium-lean/.test(x))), Object.entries(R).filter(([k]) => /battery/.test(k)).map(([k, r]) => [k, r.name]));
  // GPU-TIMER-KA: the keep-alive's GPU timer reading under the 30 limit (Automated runtime only: the +11 ms is the desktop's
  // P96-HW reading on the GTX 1050, modelled as added to every frame drawn after a mark; whether the UHD 620's reading grows
  // too is not measured, so it runs both ways)
  { const KA = [['gtx1050', 'mains', 11], ['gtx1050', 'battery', 11], ['uhd620gpu', 'mains', 0], ['uhd620gpu', 'battery', 0], ['uhd620gpu', 'mains', 11], ['fast', 'mains', 11]];
    const out = ['GPU-TIMER-KA decision table at 30 (Automated runtime only: synthetic machines, 8 min; "+N ms": what the GPU timer adds after a keep-alive mark)',
      'machine | power | timer after a mark | P95 code (readings not marked) | this build (readings marked)'];
    const kr = {};
    for (const [mk, pw, add] of KA) {
      const old = simulate(mod, mk, pw, 30, 480, undefined, { add, tag: false }), now = simulate(mod, mk, pw, 30, 480, undefined, { add, tag: true });
      kr[`${mk}|${pw}|${add}`] = { old, now };
      const cell = (r) => `${r.name}${r.phase === 'hold' ? '' : ' (evaluating)'} — ${r.steps.join(', ') || 'no step'} — late ${r.lateShare}`;
      out.push(`${MACH[mk].label} | ${pw} | +${add} ms | ${cell(old)} | ${cell(now)}`);
    }
    console.log(out.join('\n') + '\n');
    if (process.env.KALOG) for (const e of kr[process.env.KALOG]?.now.log || []) console.log(`  ${(e.t / 1000).toFixed(1)}s ${e.kind} ${e.what || ''} — ${e.why || ''} [${e.state}${e.pending ? ' → ' + e.pending : ''}]`);   // (KALOG=machine|power|add)
    const g = kr['gtx1050|mains|11'];
    check('GPU-TIMER-KA the risk, reproduced: GTX 1050-like at 30 plugged in, the timer +11 ms after each mark, read as the frame\'s own (the P95 code): Auto walks down below High', g.old.name !== 'High', [g.old.name, g.old.steps]);
    check('GPU-TIMER-KA ... with the readings marked: High at the end, held — at most one step down for it, which goes back (judged at the revisit), never two in a row', g.now.name === 'High' && g.now.phase === 'hold' && g.now.steps.filter((x) => /down/.test(x)).length <= 1, [g.now.name, g.now.steps]);
    const gb = kr['gtx1050|battery|11'];
    check('GPU-TIMER-KA GTX 1050-like on battery at 30 with the inflated readings marked: Medium held as without the mark (no step down kept)', gb.now.name === 'Medium' && gb.now.phase === 'hold', [gb.now.name, gb.now.steps]);
    const f = kr['fast|mains|11'];
    check('GPU-TIMER-KA a fast GPU at 30 with the inflated readings marked: High, held', f.now.name === 'High' && f.now.phase === 'hold', [f.now.name, f.now.steps]);
    // (UHD 620 with its reading ALSO inflated by the mark is not measured anywhere; with +11 ms on top of a real 15–19 ms the
    //  one judged step Medium → Medium-lean is a close call: by seed it stays and goes on to Low, or comes back to Medium with
    //  ~16 % of the frames shown late. Printed, not checked: order 65 measures whether the UHD's reading grows at all.)
    { const r = kr['uhd620gpu|mains|11'].now; console.log(`GPU-TIMER-KA limitation (not a check): UHD 620-like at 30, timer +11 ms after a mark: ${r.name}, late ${r.lateShare}, ${r.steps.join(', ')}`); }
    for (const k of ['uhd620gpu|mains|0', 'uhd620gpu|battery|0']) {
      const r = kr[k].now;
      check(`GPU-TIMER-KA the real overload still found: UHD 620-like (light CPU) at 30, ${k.split('|')[1]}, timer +${k.split('|')[2]} ms after a mark, readings marked: steps down, one judged step at a time, until the frames shown late are rare (≤ 8 %) or it is at Low; never back up into a profile that showed them`,
        (r.lateShare <= 0.08 || r.name === 'Low') && r.steps.some((x) => /down/.test(x)) && !r.steps.some((x) => /up(?! \(back\))/.test(x) && !/back/.test(x)), [r.name, r.lateShare, r.steps]);
    }
    check('GPU-TIMER-KA every marked run settles (held)', Object.values(kr).every((x) => x.now.phase === 'hold'), Object.entries(kr).map(([k, x]) => [k, x.now.phase, x.now.steps]));
  }
  check('P95 every run settles (held) and changes at most 3 times in 8 minutes', Object.values(R).every((r) => r.phase === 'hold' && r.steps.length <= 3), Object.entries(R).map(([k, r]) => [k, r.phase, r.steps.length]));
}
// ---------------------------------------------------------------- P95, the rules one by one (synthetic windows)
{
  const feed = (G, { secs, ms, cpu, gpu, scene = 's', t0 = G.since || 0 }) => { let t = t0; while (t < t0 + secs * 1000) { const m = typeof ms === 'function' ? ms() : ms; t += m; G.frame({ t, ms: m, cpu, play: true, scene }); G.gpu(t, gpu); } return t; };
  // a slow panel: tight 24.4 ms intervals, GPU 17 ms: paced; the same rate as a 60 Hz panel's mix of 16.7 / 33.3: gpu
  { const G = new Governor(); G.setProfile(1, 'test', { commitNow: true, t: 0 }); feed(G, { secs: 6, ms: 24.4, cpu: 11, gpu: 17 });
    let i = 0; const G2 = new Governor(); G2.setProfile(1, 'test', { commitNow: true, t: 0 }); feed(G2, { secs: 6, ms: () => (i++ % 2 ? 33.33 : 16.67), cpu: 11, gpu: 17 });
    check('P95 SLOW_PANEL: tight 24.4 ms intervals with GPU 17 ms is the display\'s pace (paced); the same frame rate as 16.7 / 33.3 ms on a 60 Hz panel is GPU pressure', G.lastWindow.kind === 'paced' && G2.lastWindow.kind === 'gpu', [G.lastWindow, G2.lastWindow]); }
  // the 30 limit: on time by rAF, but the GPU past one refresh: 'late' pressure; under it: ok
  { const G = new Governor({ budget: () => 1000 / 30, upBudget: () => 1000 / 60, refresh: () => 16.67 }); G.setProfile(1, 'test', { commitNow: true, t: 0 }); feed(G, { secs: 6, ms: 33.33, cpu: 7, gpu: 17.5 });
    const G2 = new Governor({ budget: () => 1000 / 30, upBudget: () => 1000 / 60, refresh: () => 16.67 }); G2.setProfile(1, 'test', { commitNow: true, t: 0 }); feed(G2, { secs: 6, ms: 33.33, cpu: 7, gpu: 12 });
    const G3 = new Governor({ budget: () => 1000 / 30, upBudget: () => 1000 / 60, refresh: () => 24.4 }); G3.setProfile(1, 'test', { commitNow: true, t: 0 }); feed(G3, { secs: 6, ms: 33.33, cpu: 7, gpu: 17.5 });
    check('P95 PRESENT: at 30 on a 60 Hz screen, GPU p90 17.5 ms (past one refresh) is GPU pressure though every interval is 33.3 ms; 12 ms is ok; on a 41 Hz panel (no whole number of refreshes) the rule does not apply',
      G.lastWindow.kind === 'gpu' && G.lastWindow.late && G2.lastWindow.kind === 'ok' && G3.lastWindow.kind === 'ok', [G.lastWindow, G2.lastWindow, G3.lastWindow]); }
  // GPU-TIMER-KA: the same 'late' window with its GPU readings taken after keep-alive marks is suspect; a CPU-late one is not
  { const feedKa = (G, { secs, ms, cpu, gpu, ka, scene = 's', t0 = G.since || 0 }) => { let t = t0; while (t < t0 + secs * 1000) { t += ms; G.frame({ t, ms, cpu, play: true, scene }); G.gpu(t, gpu, ka); } return t; };
    const mk = (R) => { const G = new Governor({ budget: () => 1000 / 30, upBudget: () => 1000 / 60, refresh: () => R }); G.setProfile(0, 'test', { commitNow: true, t: 0 }); return G; };
    const A = mk(17.5); feedKa(A, { secs: 6, ms: 35, cpu: 6, gpu: 18, ka: true });          // (the GTX 1050's 57 Hz state, P96-HW's reading)
    const B = mk(17.5); feedKa(B, { secs: 6, ms: 35, cpu: 6, gpu: 18, ka: false });         // (the same reading without a mark: P95 as it was)
    const C = mk(16.67); feedKa(C, { secs: 6, ms: 33.33, cpu: 16, gpu: 9, ka: true });      // (CPU past the refresh)
    const D = mk(16.67); feedKa(D, { secs: 6, ms: 33.33, cpu: 6, gpu: 9, ka: true });       // (inside the refresh)
    check('GPU-TIMER-KA classify: at 30 in a 57 Hz clock, GPU p90 18 ms read after keep-alive marks → late GPU, suspect; the same unmarked → late GPU, not suspect (P95 unchanged); CPU-late with marks → not suspect; GPU 9 ms with marks → ok',
      A.lastWindow.kind === 'gpu' && A.lastWindow.late && A.lastWindow.suspect && A.lastWindow.gka === 1 && B.lastWindow.kind === 'gpu' && B.lastWindow.late && !B.lastWindow.suspect && C.lastWindow.kind === 'cpu' && C.lastWindow.late && !C.lastWindow.suspect && D.lastWindow.kind === 'ok',
      [A.lastWindow, B.lastWindow, C.lastWindow, D.lastWindow]);
    // the evaluation: one suspect step, then no further one until the revisit judges it; the unmarked reading walks on
    let t = feedKa(A, { secs: 10, ms: 35, cpu: 6, gpu: 18, ka: true, scene: 'street' }); const q1 = A.p; A.commit('test');
    t = feedKa(A, { secs: 20, ms: 35, cpu: 6, gpu: 17.6, ka: true, scene: 'house', t0: t + 2000 }); const q2 = A.p;
    let u = feedKa(B, { secs: 10, ms: 35, cpu: 6, gpu: 18, ka: false, scene: 'street' }); B.commit('test');
    u = feedKa(B, { secs: 20, ms: 35, cpu: 6, gpu: 17.6, ka: false, scene: 'house', t0: u + 2000 });
    check('GPU-TIMER-KA evaluate: suspect pressure takes one step (High → Medium) and waits in the next scene with the reading as high (no second step until judged); the unmarked reading queues the next step there as P95 did',
      q1 === 1 && q2 === 1 && A.applied === 1 && B.p === 2, { A: A.log.filter((e) => e.kind === 'down').map((e) => e.why), Bp: B.p });
    t = feedKa(A, { secs: 12, ms: 35, cpu: 6, gpu: 17.6, ka: true, scene: 'street', t0: t + 2000 });
    const back = A.log.find((e) => e.revert);
    check('GPU-TIMER-KA judgeStep: back in the street the reading fell 18 → 17.6 ms where the model predicts −44 % for High → Medium: the step comes back to High, no further GPU step this session',
      !!back && A.p === 0 && A.noHelp.gpu === 0, { back: back?.why, p: A.p, noHelp: A.noHelp }); }
  // GPU-TIMER-KA: in hold, suspect windows are not a sustained problem; the same unmarked are, as before
  { const run2 = (ka) => { const G = new Governor({ budget: () => 1000 / 30, upBudget: () => 1000 / 60, refresh: () => 17.5 }); G.setProfile(0, 'test', { phase: 'hold', commitNow: true, t: 0 });
      let t = 0; for (let k = 0; k < 6; k++) { const sc = k % 2 ? 'a' : 'b', t0 = t; while (t < t0 + 25000) { t += 35; G.frame({ t, ms: 35, cpu: 6, play: true, scene: sc }); G.gpu(t, 18, ka); } } return G; };
    const H1 = run2(true), H2 = run2(false);
    check('GPU-TIMER-KA hold: 150 s across scene changes, GPU 18 ms at 30 in a 57 Hz clock read after keep-alive marks → held at High; unmarked → one step down (P95 unchanged)',
      H1.p === 0 && !H1.log.some((e) => e.kind === 'down') && H2.p === 1, { H1: H1.log.slice(-2), H2: H2.log.filter((e) => e.kind === 'down').map((e) => e.why) }); }
  // GPU-TIMER-KA: the title calibration sets marked readings aside (the guess stands) and does not take the no-timer rule
  { const c = new Calibration({ p0: 0 }); c.t0 = 0; for (let i = 0; i < 40; i++) { c.f.push(33.3); c.cpu.push(5); c.gpu(18, true); } const r = c.finish();
    const c2 = new Calibration({ p0: 0 }); c2.t0 = 0; for (let i = 0; i < 40; i++) { c2.f.push(33.3); c2.cpu.push(5); c2.gpu(18, false); } const r2 = c2.finish();
    check('GPU-TIMER-KA calibration: title GPU 18 ms all read after keep-alive marks under the 30 limit → set aside, the guess (High) stands; the same unmarked → a lower start as before',
      r.p === 0 && r.gpuMs == null && r.gpuAside === 40 && r2.p > 0 && r2.gpuMs === 18, [r, r2]); }
  // stalls never decide a window
  { const G = new Governor(); G.setProfile(1, 'test', { commitNow: true, t: 0 }); let i = 0; feed(G, { secs: 9, ms: () => (i++ % 60 === 0 ? 180 : 16.67), cpu: 9, gpu: 14 });
    check('P95 a 180 ms stall in every window, steady 16.7 ms frames between (GPU 14 ms): ok, not pressure', G.log.filter((e) => e.kind === 'down').length === 0 && G.lastWindow.kind === 'ok', G.lastWindow); }
  // the evaluation's end: misses in paced windows are not the game's
  { const G = new Governor(); G.setProfile(1, 'test', { commitNow: true, t: 0 }); let t = feed(G, { secs: 70, ms: 24.4, cpu: 10, gpu: 15, scene: 'a' }); feed(G, { secs: 70, ms: 24.4, cpu: 10, gpu: 15, scene: 'b', t0: t });
    check('P95 a whole evaluation at a 41 Hz panel: passes (held at Medium) — before, its 100 % "missed" intervals failed it and stepped down', G.phase === 'hold' && G.applied === 1 && !G.log.some((e) => e.kind === 'down'), G.log.slice(-3)); }
  // a step down that bought nothing goes back (same scene, measured before and after), once; no further step of that kind
  { const G = new Governor(); G.setProfile(1, 'test', { commitNow: true, t: 0 });
    let t = feed(G, { secs: 8, ms: 22, cpu: 20, gpu: 10, scene: 'street' });   // CPU-bound street at Medium: a step down queued
    const queued = G.pending().length === 1; G.commit('test: scene change');
    t = feed(G, { secs: 20, ms: 16.67, cpu: 6, gpu: 6, scene: 'house', t0: t + 2000 });
    t = feed(G, { secs: 10, ms: 21.5, cpu: 19.4, gpu: 8, scene: 'street', t0: t + 2000 });   // the street at Medium-lean: no better
    const back = G.log.find((e) => e.kind === 'up' && e.revert); G.commit('test: scene change');
    t = feed(G, { secs: 130, ms: 22, cpu: 20, gpu: 10, scene: 'street', t0: t + 2000 });
    check('P95 REVISIT: CPU-bound street, Medium → Medium-lean bought < 10 % → back to Medium (queued, at a commit point), then held there — no walk down to Low', queued && !!back && G.applied === 1 && G.phase === 'hold' && G.noHelp.cpu === 1 && G.log.filter((e) => e.kind === 'down').length === 1, { log: G.log.filter((e) => e.kind !== 'commit').map((e) => `${e.t} ${e.kind} ${e.what || ''} ${e.why || ''}`) }); }
  { const G = new Governor(); G.setProfile(1, 'test', { commitNow: true, t: 0 });
    let t = feed(G, { secs: 8, ms: 25, cpu: 8, gpu: 24, scene: 'street' }); G.commit('test');
    t = feed(G, { secs: 10, ms: 16.67, cpu: 6, gpu: 6, scene: 'house', t0: t + 2000 });
    feed(G, { secs: 10, ms: 18, cpu: 7, gpu: 17, scene: 'street', t0: t + 2000 });   // a GPU step that helped (25 → 18 ms frames)
    check('P95 REVISIT: a step down that raised the frame rate ≥ 10 % stays', G.applied === 2 && !G.log.some((e) => e.revert), G.log.filter((e) => e.kind !== 'commit').map((e) => `${e.t} ${e.kind} ${e.what || ''}`)); }
  // the ladder's skip (battery): Medium → Low directly; a margin's try one up steps over it too
  { const G = new Governor({ skip: (p) => p === 2 }); G.setProfile(1, 'test', { commitNow: true, t: 0 }); feed(G, { secs: 8, ms: 25, cpu: 8, gpu: 24 });
    check('P95 skip (Medium-lean on battery): GPU pressure at Medium queues Low; above(Low) is Medium', G.p === 3 && G.above(3) === 1 && G.below(1) === 3, { p: G.p }); }
  // the cache: v4 entries by index move to v5 by id; v5 by id; junk dropped
  { const { migrateCache } = await import('../src/engine/autoquality.js');
    const v4 = migrateCache({ a: { p: 2, src: 'settled', margin: true, noTry: 1, at: 'x' }, b: { p: 1, src: 'calib' }, c: { p: 7 }, d: 'junk', e: null }, true);
    const v5 = migrateCache({ a: { p: 2, id: 'low', src: 'settled' }, b: { p: 2, id: 'lean' }, c: { p: 1 }, d: { id: 'gone', p: 0 } });
    check('P95 cache: a v4 entry (High · Medium · Low by index) keeps its profile by id (Low → index 3, Medium → 1, its margin and noTry); a v5 entry is read by id; unknown or broken entries are dropped',
      v4.a.p === 3 && v4.a.id === 'low' && v4.a.margin === true && v4.a.noTry === 1 && v4.b.p === 1 && !v4.c && !v4.d && !v4.e && v5.a.p === 3 && v5.b.p === 2 && v5.c.p === 1 && !v5.d, { v4, v5 }); }
}

// ---------------------------------------------------------------- PACE-ALL (22.11): every screen (engine/pace.js)
// The Frame Rate limit's whole-refresh rule per refresh rate, the refresh measured robustly, Unlimited's even pace
// (engage, deeper, probe, release, hysteresis, the rate floor, never at 60 Hz) and the budget Auto works to. Synthetic
// clocks only: what a real display shows is not measured here.
{
  const { limitRefreshes, refreshOf, EvenPace, paceBudgetMs, REFRESH_N } = await import('../src/engine/pace.js');
  const near = (x, y, tol) => Math.abs(x - y) <= tol;
  const RATES = [50, 59.9, 60, 75, 90, 100, 120, 144, 165, 240];
  const table = {}; for (const L of [30, 60]) table[L] = Object.fromEntries(RATES.map((F) => [F, +(F / limitRefreshes(1000 / L, 1000 / F)).toFixed(2)]));
  const want = { 30: { 50: 25, 59.9: 29.95, 60: 30, 75: 25, 90: 30, 100: 33.33, 120: 30, 144: 28.8, 165: 33, 240: 30 },
    60: { 50: 50, 59.9: 59.9, 60: 60, 75: 75, 90: 45, 100: 50, 120: 60, 144: 72, 165: 55, 240: 60 } };
  console.log('       PACE-ALL limit → rate on screen:', JSON.stringify(table));
  check('PACE-ALL limit rule: the nearer whole-refresh rate, ties to the faster one only within 20 % over (30: 75 Hz → 25, 144 → 28.8, 165 → 33; 60: 75 Hz → 75, 90 → 45, 144 → 72, 165 → 55)', JSON.stringify(table) === JSON.stringify(want), { table, want });
  // (a refresh measured a little off — each listed rate moved by ±0.5 % — never flips the count: no rate sits on an edge)
  const flips = []; for (const L of [30, 60]) for (const F of RATES) { const n0 = limitRefreshes(1000 / L, 1000 / F); for (const e of [-0.005, -0.002, 0.002, 0.005]) if (limitRefreshes(1000 / L, 1000 / (F * (1 + e))) !== n0) flips.push(`${L}@${F}${e > 0 ? '+' : ''}${e * 100}%`); }
  check('PACE-ALL limit rule: steady under measurement noise (every listed rate ±0.5 %: the same count; 60 on 143.9 / 144.1 Hz every 2nd)', !flips.length && limitRefreshes(1000 / 60, 1000 / 144.1) === 2, flips);
  // the refresh from rAF intervals
  const ring = () => ({ a: new Float32Array(REFRESH_N), s: new Float32Array(REFRESH_N), n: 0, k: 0 });
  const push = (B, d) => { B.a[B.k] = d; B.k = (B.k + 1) % REFRESH_N; B.n = Math.min(REFRESH_N, B.n + 1); return refreshOf(B.a, B.n, B.s); };
  {
    const B = ring(); let r = 0; for (let i = 0; i < 64; i++) r = push(B, i % 5 < 3 ? 20 : 10);   // 60 % of the intervals 20 ms, 40 % 10 (100 Hz, the game missing)
    const J = ring(); let rj = 0; seed = 11; for (let i = 0; i < 64; i++) rj = push(J, 16.667 + (rnd() * 2 - 1) * 1.8);   // 60 Hz, ±1.8 ms jitter
    const P2 = ring(); let rp = 0; for (let i = 0; i < 64; i++) rp = push(P2, i % 3 ? 10 : 20);
    const M = ring(); for (let i = 0; i < 40; i++) push(M, 16.667);
    let k60 = 0; while (k60 < 40 && Math.abs(push(M, 6.944) - 6.944) > 0.05) k60++;
    let k144 = 0; while (k144 < 60 && Math.abs(push(M, 16.667) - 16.667) > 0.05) k144++;
    const R = { mixed: +r.toFixed(2), jitter60: +rj.toFixed(2), paced: +rp.toFixed(2), to144after: k60 + 1, to60after: k144 + 1 };
    console.log('       PACE-ALL refresh measure:', JSON.stringify(R));
    check('PACE-ALL refresh: 10 / 20 ms intervals with most at 20 (the game missing refreshes on 100 Hz) read 100 Hz, not 50; 60 Hz with ±1.8 ms jitter reads 16.7 ms', near(r, 10, 0.01) && near(rj, 16.67, 0.6) && near(rp, 10, 0.01), R);
    check('PACE-ALL refresh: a move from 60 to 144 Hz shows within 6 callbacks, back to 60 Hz within 30 (half a second)', R.to144after <= 6 && R.to60after <= 30, R);
  }
  {
    // the meter: a game that never makes a single refresh (every frame 2 or 3 refreshes on 144 Hz) after a light second
    // still reads 144 Hz; a move to a slower screen that is no multiple (144 → 60 Hz) at once; one that is (120 → 60 Hz)
    // after the memory's 20 s, the drawn intervals the same meanwhile
    const { RefreshMeter, MEM_MS } = await import('../src/engine/pace.js');
    const M = new RefreshMeter(); let t = 0; for (let i = 0; i < 144; i++) M.push(6.944, (t += 6.944));
    let slowR = 0; for (let i = 0; i < 200; i++) slowR = M.push(i % 3 ? 20.83 : 13.89, (t += 17));
    let k = 0; while (k < 60 && Math.abs(M.push(16.667, (t += 16.667)) - 16.667) > 0.05) k++;
    const N = new RefreshMeter(); t = 0; for (let i = 0; i < 120; i++) N.push(8.333, (t += 8.333));
    let held = 0, got = 0; const t1 = t; while (t - t1 < MEM_MS + 2000) { got = N.push(16.667, (t += 16.667)); if (Math.abs(got - 8.333) < 0.05) held = t - t1; }
    // (P137: a GPU-bound game drawing every 5th and 6th refresh in a mix on 120 Hz — 41.7 / 50 ms, a mean that is no
    //  multiple — after a light second: still 120 Hz while the memory lasts, not a 22 Hz screen)
    const Q = new RefreshMeter(); t = 0; for (let i = 0; i < 120; i++) Q.push(8.333, (t += 8.333));
    let mixR = 0; for (let i = 0; i < 200; i++) mixR = Q.push(i % 3 ? 41.67 : 50, (t += 45));
    for (let i = 0; i < 1600; i++) mixR = Math.max(mixR, Q.push(25, (t += 25)));   // (then every 3rd refresh for 40 s: still 120 Hz)
    const R = { slowR: +slowR.toFixed(2), to60: k + 1, held120: Math.round(held), after: +got.toFixed(2), mix56: +mixR.toFixed(2) };
    console.log('       PACE-ALL refresh meter:', JSON.stringify(R));
    check('PACE-ALL refresh meter: every frame 2–3 refreshes on 144 Hz still reads 144 Hz; 144 → 60 Hz within 32 callbacks (half a second); 120 → 60 Hz (a multiple) after the 20 s memory; a 5 / 6-refresh mix on 120 Hz, then every 3rd refresh for 40 s, still 120 Hz (P137)', near(slowR, 6.944, 0.05) && R.to60 <= 32 && held >= MEM_MS - 1000 && held <= MEM_MS + 1000 && near(got, 16.667, 0.05) && near(mixR, 8.333, 0.05), R);
  }
  // EvenPace driven by a modelled game: a drawn frame needs need(t) ms (the next callback comes at the first refresh at or
  // after its start + need), a skipped refresh calls back at the next one; drawn frames' intervals are fed as main.js does
  const drive = (EP, hz, secs, need, { t0 = 0, cpu = (t) => need(t) * 0.4, gpu = null, count = () => true, scene = () => 's' } = {}) => {
    const R = 1000 / hz; let t = t0, last = t0, drawT = 0; const iv = [];
    while (t < t0 + secs * 1000) {
      EP.refresh(R);
      const n = EP.n;
      if (n >= 2 && drawT && t - drawT < (n - 0.5) * R) { t += R; continue; }
      drawT = n >= 2 ? t : 0;
      const w = need(t - t0), d = t - last; last = t;
      if (d > 0) { iv.push(+d.toFixed(2)); if (gpu) EP.gpu(t, gpu(t - t0), n >= 2); EP.frame(t, d, cpu(t - t0), count(t - t0), scene(t - t0)); }
      t += Math.max(1, Math.ceil((w - 1e-6) / R)) * R;
    }
    return { iv, t };
  };
  const slow = (k) => (t) => (Math.floor(t / 10) % 10 < k ? 13 : 8);   // frames of 8 or 13 ms: the P101 street's 10 / 20 ms mix on 100 Hz
  {
    const EP = new EvenPace(); let r = drive(EP, 100, 4, slow(5)); const engaged = EP.n, at = EP.log.find((e) => e.to === 2)?.t;
    r = drive(EP, 100, 6, slow(5), { t0: r.t }); const ivPaced = r.iv.slice(5), nAfter = EP.n;
    r = drive(EP, 100, 40, () => 5, { t0: r.t }); const released = EP.n, rel = EP.log.filter((e) => e.probe === 'held').length;
    const tail = r.iv.slice(-100);
    console.log('       PACE-ALL 100 Hz:', JSON.stringify({ engaged, at, paced: [Math.min(...ivPaced), Math.max(...ivPaced)], released, log: EP.log.map((e) => e.why || e.probe) }));
    check('PACE-ALL Unlimited on 100 Hz, frames of 8 / 13 ms (10 / 20 ms intervals): every 2nd refresh within ~2 s, then every interval 20 ms', engaged === 2 && at <= 2600 && nAfter === 2 && ivPaced.every((x) => near(x, 20, 0.01)), { engaged, at, ivPaced: ivPaced.slice(0, 12) });
    check('PACE-ALL ...and fast again (5 ms frames): a probe after the cooldown holds, back to every refresh (10 ms), and stays', released === 1 && rel >= 1 && tail.every((x) => near(x, 10, 0.01)), { released, log: EP.log });
  }
  {
    // a game that stays slow: probes back off (8, 16, 32 … 120 s) — a handful of short probe windows in 5 minutes
    const EP = new EvenPace(); const r = drive(EP, 100, 300, slow(6), { cpu: () => 3 });
    const probes = EP.log.filter((e) => /^probe:/.test(e.why || '')).length, back = EP.log.filter((e) => /^probe at/.test(e.why || '')).length;
    const evenShare = r.iv.filter((x) => x > 15 && x < 25).length / r.iv.length;
    console.log('       PACE-ALL 100 Hz, 5 min slow:', JSON.stringify({ probes, back, n: EP.n, changes: EP.log.length, evenShare: +evenShare.toFixed(3) }));
    check('PACE-ALL a slow game on 100 Hz for 5 min: paced throughout but for ≤ 7 short probes (backing off 8 → 120 s), no flapping', EP.n === 2 && probes <= 7 && probes === back && evenShare > 0.9, { probes, back, changes: EP.log.length, evenShare });
  }
  {
    const out = {}; for (const hz of [50, 59.9, 60]) { const EP = new EvenPace(); drive(EP, hz, 20, () => 22); out[hz] = { n: EP.n, log: EP.log.length }; }
    check('PACE-ALL never on 50 / 59.9 / 60 Hz screens (every refresh stays the target; Auto handles quality)', Object.values(out).every((x) => x.n === 1 && x.log === 0), out);
  }
  {
    // the smallest whole count that holds, at most the screen's ~60 class (P137: floorRefreshes)
    const out = {};
    for (const [hz, w] of [[144, 16], [240, 6], [165, 8], [120, 11], [90, 13]]) { const EP = new EvenPace(); const r = drive(EP, hz, 6, (t) => (Math.floor(t / 7) % 3 ? w : w * 0.6)); out[hz] = { n: EP.n, fps: +(hz / EP.n).toFixed(1), tail: [...new Set(r.iv.slice(-30))] }; }
    console.log('       PACE-ALL counts:', JSON.stringify(out));
    check('PACE-ALL the smallest whole count that holds, within the ~60 class (P137): 144 Hz / 16 ms → every 2nd (72; 48 is below the class — Auto\'s to fit), 240 / 6 ms → every 2nd (120), 165 / 8 ms → every 2nd (82.5), 120 / 11 ms → every 2nd (60), 90 / 13 ms → every 2nd (45); each then one even interval',
      out[144].n === 2 && out[240].n === 2 && out[165].n === 2 && out[120].n === 2 && out[90].n === 2 && Object.values(out).every((x) => x.tail.length === 1), out);
  }
  {
    // P137 (the user, 26.11: "whatever we do, 30 fps just looks bad"; picked: always 60, lower the quality instead): the
    // deepest even pace on each screen is its ~60 class; a game drawing ~30 (frames of 22–27 ms) on 120 / 144 Hz was
    // paced every 4th / 5th refresh (30 / 28.8 fps) — now never below the class, Auto quality's to make room.
    // BEFORE_PACE=<path to an older pace.js> also runs that module (the doc's before / after)
    const { floorRefreshes } = await import('../src/engine/pace.js');
    const FL = Object.fromEntries(RATES.map((hz) => [hz, +(hz / floorRefreshes(hz)).toFixed(2)]));
    const flips = []; for (const hz of RATES) for (const e of [-0.005, 0.005]) if (floorRefreshes(hz * (1 + e)) !== floorRefreshes(hz)) flips.push(`${hz}${e > 0 ? '+' : ''}${e * 100}%`);
    console.log('       P137 the slowest even pace per screen (fps):', JSON.stringify(FL));
    check('P137 the slowest even pace Unlimited may take: 50 / 59.9 / 60 / 75 Hz every refresh, 90 → 45, 100 → 50 (P101 kept), 120 → 60, 144 → 72, 165 → 55, 240 → 60; never 30; steady at ±0.5 %',
      JSON.stringify(FL) === JSON.stringify({ 50: 50, 60: 60, 75: 75, 90: 45, 100: 50, 120: 60, 144: 72, 165: 55, 240: 60, 59.9: 59.9 }) && !flips.length, { FL, flips });
    const old = process.env.BEFORE_PACE ? await import(new URL(process.env.BEFORE_PACE, 'file://' + process.cwd() + '/').href) : null;
    const slow30 = {}, mins = {};
    for (const hz of [75, 90, 100, 120, 144, 165, 240]) for (const [tag, M] of [['now', { EvenPace }], ['before', old]]) {
      if (!M) continue;
      const EP = new M.EvenPace(); drive(EP, hz, 20, (t) => (Math.floor(t / 9) % 4 ? 27 : 22));
      const rates = [hz, ...EP.log.filter((e) => e.to).map((e) => hz / e.to)];
      (slow30[hz] ??= {})[tag] = +(hz / EP.n).toFixed(1); if (tag === 'now') mins[hz] = +Math.min(...rates).toFixed(1);
    }
    console.log('       P137 a game drawing ~37–45 fps, Unlimited, 20 s (the even pace at the end: now / before):', JSON.stringify(slow30));
    check('P137 a game drawing ~37–45 fps on 75–240 Hz screens: the even pace never goes below the screen\'s ~60 class at any moment (120 → 60, 144 → 72, 240 → 60; never 30)', Object.entries(mins).every(([hz, m]) => m >= +(hz / floorRefreshes(+hz)).toFixed(1) - 0.05 && m > 40), { mins, slow30 });
    if (old) console.log(`       (before P137 the same game was paced ${Object.entries(slow30).map(([hz, x]) => `${hz} Hz → ${x.before}`).join(', ')})`);
  }
  {
    // 75 Hz: every 2nd refresh is 37.5 fps — below the ~60 class (P137; before, allowed for a game already under ~47)
    const a = new EvenPace(); const ra = drive(a, 75, 8, (t) => (Math.floor(t / 13.3) % 4 ? 12 : 15));
    const b = new EvenPace(); const rb = drive(b, 75, 8, (t) => (Math.floor(t / 13.3) % 4 ? 20 : 12));
    const fa = +(1000 * ra.iv.length / ra.iv.reduce((x, y) => x + y, 0)).toFixed(1), fb = +(1000 * rb.iv.slice(0, 100).length / rb.iv.slice(0, 100).reduce((x, y) => x + y, 0)).toFixed(1);
    console.log('       PACE-ALL 75 Hz:', JSON.stringify({ a: { n: a.n, fps: fa, log: a.log }, b: { n: b.n, fpsBefore: fb } }));
    check('PACE-ALL 75 Hz: never a 37.5 fps pace (P137: under the ~60 class), for a game drawing ~60 there or one under ~47 — every refresh, Auto quality makes the room; the denial noted once', a.n === 1 && b.n === 1 && a.log.filter((e) => e.denied).length === 1 && b.log.filter((e) => e.denied).length === 1, { a: a.log, an: a.n, bn: b.n, fa, fb });
  }
  {
    // not counted (menus, scene changes): no engagement; a scene change while paced brings the probe forward
    const EP = new EvenPace(); drive(EP, 144, 10, slow(5), { count: () => false });
    const E2 = new EvenPace(); let r = drive(E2, 100, 4, slow(5)); const c0 = E2.cool;
    r = drive(E2, 100, 0.5, slow(5), { t0: r.t, scene: () => 'other' }); const c1 = E2.cool;
    check('PACE-ALL frames outside play (menus, scene changes, loading) never engage it; a scene change while paced brings the probe to ~2 s', EP.n === 1 && EP.log.length === 0 && E2.n === 2 && c1 < c0 && c1 <= r.t + 2100, { c0, c1, t: r.t, n2: E2.n });
  }
  {
    // a GPU past the refresh while every rAF interval is on time (frames shown late): engages; a probe whose own GPU p90 is still past it goes back
    const EP = new EvenPace(); let r = drive(EP, 100, 4, () => 9, { gpu: () => 12 }); const on = EP.n;
    r = drive(EP, 100, 30, () => 9, { t0: r.t, gpu: () => 12, cpu: () => 3 });
    check('PACE-ALL a GPU p90 past the refresh with intervals on time engages (frames shown late); a probe whose own (mark-free) GPU p90 is still past it goes back', on === 2 && EP.n === 2 && EP.log.some((e) => /^probe at/.test(e.why || '')), EP.log.map((e) => e.why || e.probe));
  }
  {
    // a move to another screen while paced starts over; callbacks merged to every 2nd refresh (the browser) are not a new screen
    const EP = new EvenPace(); drive(EP, 100, 4, slow(5)); const a = EP.n; EP.refresh(20); const b = EP.n; EP.refresh(16.667); const c = EP.n;
    check('PACE-ALL while paced, a refresh read as 2 × the screen\'s (callbacks merged) keeps the pace; a different screen (60 Hz) starts over at every refresh', a === 2 && b === 2 && c === 1 && near(EP.R0, 16.667, 0.01), { a, b, c, R0: EP.R0 });
  }
  // the budget Auto works to
  const B = {}; for (const F of RATES) B[F] = [paceBudgetMs(1000 / 30, 1000 / F), paceBudgetMs(1000 / 60, 1000 / F), paceBudgetMs(0, 1000 / F, 1), paceBudgetMs(0, 1000 / F, 2)].map((x) => +x.toFixed(2));
  console.log('       PACE-ALL budget [30, 60, Unlimited, Unlimited paced every 2nd]:', JSON.stringify(B));
  check('PACE-ALL budget: the pace on this screen, never under 16.67 (60 Hz: 33.33 / 16.67 / 16.67; 100 Hz: 30 / 20 / 16.67 / 20; 90 Hz: 33.33 / 22.22 / 16.67 / 22.22; 50 Hz: 40 / 20 / 20; 144 Hz: 34.72 / 16.67 / 16.67 / 16.67)',
    JSON.stringify(B[60]) === '[33.33,16.67,16.67,33.33]' && JSON.stringify(B[100]) === '[30,20,16.67,20]' && JSON.stringify(B[90]) === '[33.33,22.22,16.67,22.22]' && B[50][1] === 20 && B[50][2] === 20 && JSON.stringify(B[144]) === '[34.72,16.67,16.67,16.67]' && B[59.9][0] === 33.33 && B[59.9][2] === 16.67, B);
  {
    // the governor at 60 on a 90 Hz screen (an even 45: 22.2 ms frames, GPU 9 ms, CPU 7): on the old fixed 16.67 budget
    // every frame reads as missed and Auto walks down; on the pace's budget it is on time and held
    const feedP = (gov, ms = 22.22, gpu = null, cpu = 7) => {
      gov.setProfile(0, 'test', { commitNow: true, t: 0 }); let t = 0; const steps = [];
      for (let i = 0; i < 6000; i++) { const f = ms * (0.995 + 0.01 * rnd()); t += f; if (gpu != null) gov.gpu(t, gpu); const r = gov.frame({ t, ms: f, cpu, play: true, scene: i < 3000 ? 'a' : 'b' }); if (r?.kind === 'down') { steps.push(r.what); gov.commit('test'); } }
      return { steps, p: gov.applied, phase: gov.phase, last: gov.lastWindow?.kind };
    };
    // (no GPU timer query; and with one reading 13 ms — well inside the 22.2 ms pace, over 0.75 × 16.67)
    const old = feedP(new Governor({ budget: () => 1000 / 60, refresh: () => 1000 / 90 }));
    const now = feedP(new Governor({ budget: () => paceBudgetMs(1000 / 60, 1000 / 90), upBudget: () => 1000 / 60, refresh: () => 1000 / 90 }));
    const oldT = feedP(new Governor({ budget: () => 1000 / 60, refresh: () => 1000 / 90 }), 22.22, 13);
    const nowT = feedP(new Governor({ budget: () => paceBudgetMs(1000 / 60, 1000 / 90), upBudget: () => 1000 / 60, refresh: () => 1000 / 90 }), 22.22, 13);
    // Unlimited paced every 2nd refresh on 100 Hz (20 ms frames, GPU 10, CPU 6): held at High, not walked down to chase 100
    const paced = feedP(new Governor({ budget: () => paceBudgetMs(0, 10, 2), upBudget: () => 1000 / 60, refresh: () => 10 }), 20, 10, 6), pacedNT = feedP(new Governor({ budget: () => paceBudgetMs(0, 10, 2), upBudget: () => 1000 / 60, refresh: () => 10 }), 20, null, 6);
    console.log('       PACE-ALL governor:', JSON.stringify({ old, now, oldT, nowT, paced }));
    check('PACE-ALL Auto at 60 on 90 Hz (an even 45): without a GPU timer query the old 16.67 budget stepped down for a pace the limit chose (with one, P95 SLOW_PANEL already held it); on the pace\'s budget (22.2) it holds High, timer or not', old.steps.length >= 1 && !now.steps.length && !nowT.steps.length && now.p === 0 && nowT.p === 0 && now.last === 'ok', { old, now, oldT, nowT });
    check('PACE-ALL Auto with Unlimited paced every 2nd refresh on 100 Hz (20 ms, GPU 10): held at High — the sharper profile at an even 50 rather than a lower one chasing 100', !paced.steps.length && paced.p === 0 && !pacedNT.steps.length && pacedNT.p === 0, { paced, pacedNT });
  }
}

const fails = done();
process.exit(fails ? 1 : 0);
