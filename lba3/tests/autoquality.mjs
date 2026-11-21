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
  check('four named profiles, best first: High · Medium · Medium-lean · Low (AUTO-2, P95, AUTO-FLOOR)', PROFILES.map((x) => x.name).join(' · ') === 'High · Medium · Medium-lean · Low', PROFILES.map((x) => x.name));
  const eq = (a, b) => KNOBS.every((k) => a[k] === b[k]);
  check('High, Medium and Low are the presets exactly (every knob); nothing below Low', eq(knobsAt(0), PRESET_KNOBS.high) && eq(knobsAt(1), PRESET_KNOBS.medium) && eq(knobsAt(3), PRESET_KNOBS.low) && PROFILES.length === 4, {});
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
  check('a machine below even Low: walks down to Low, settles there, no oscillation', G.applied === N_PROFILES - 1 && G.phase === 'hold' && steps(G).every((e) => e.kind === 'down') && applied.every((a) => a.at !== 'IN PLAY'), { p: name(G.applied), steps: steps(G).map((e) => e.what) });
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
  check('nextProfile: a power change without a cached profile moves one profile', nextProfile(0, -1) === 1 && nextProfile(1, -1) === 2 && nextProfile(3, -1) === 3 && nextProfile(1, +1) === 0 && nextProfile(0, +1) === 0, {});
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
  // power states: mains; battery on a 60 Hz panel; battery with the panel at 41 Hz (GTX1050-BATTERY: 24.4 ms with nothing
  // drawn; the GPU clocks down and its timer reads ~1.4× longer); battery with Chrome's pacing (12 % of the callbacks a
  // refresh late: FPS30-PRESENT, rAF p95 33.4) — the browser's, not the game's
  const POWER = { mains: { R: 16.67 }, battery: { R: 16.67, bat: true }, 'battery 41 Hz': { R: 24.4, bat: true, slowGpu: 1.4 }, 'battery paced': { R: 16.67, bat: true, slip: 0.12 } };
  const simulate = (mod, mk, pw, fps, secs = 480, seed0 = +process.env.P95SEED || 11) => {
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
    let lateNow = null, flips = 0, lateN = 0, drawn = 0, street = { n: 0, ms: 0 };
    while (t < secs * 1000) {
      // a refresh tick: rAF calls back
      const now = k * R;
      if (now >= sceneEnd) { si++; sceneEnd = now + SC[si % SC.length][1]; transUntil = now + 600; const a = G.applied; G.commit('test: scene change'); if (G.applied !== a) changes.push({ t: now, to: G.applied }); }
      const scene = SC[si % SC.length][0];
      // the limit (Game.loop): skip this callback, or draw
      let draw = true;
      if (whole) { if (drawT && now - drawT < (nR - 0.5) * R) draw = false; else drawT = now; }
      else if (cap && cap > R + 1) { if (due && now < due - R / 2) draw = false; else { let nx = (due || now) + cap; if (!due || nx - now < cap - 0.75 * R) nx = now + cap; due = nx; } }
      if (!draw) { k++; t = k * R; continue; }
      const id = ids[G.applied], base = M.sc[scene], q = () => 1 - M.noise + 2 * M.noise * rnd();
      let gpu = base[0] * M.gpuF[id] * q(), cpu = base[1] * M.cpuF[id] * q();
      if (bat) { gpu *= M.bat?.gpu ?? 1.3; cpu *= (M.bat?.cpu ?? 1.3) * (P.cpu ?? 1); if (id === 'high' || id === 'medium') gpu *= M.bat?.cuts ?? 1; }
      if (P.slowGpu && Math.max(cpu, gpu) < 0.8 * R) gpu *= P.slowGpu;   // (DVFS: a slack GPU clocks down; its timer reads longer)
      const ms = lastDraw == null ? R : now - lastDraw; lastDraw = now;
      const play = now > transUntil;
      if (play) {
        G.frame({ t: now, ms, cpu, play: true, scene });
        G.gpu(now + 30, gpu);
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

const fails = done();
process.exit(fails ? 1 : 0);
