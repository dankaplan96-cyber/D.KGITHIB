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
  check('three named profiles, best first: High · Medium · Medium-eco (LOOK-FIRST)', PROFILES.map((x) => x.name).join(' · ') === 'High · Medium · Medium-eco', PROFILES.map((x) => x.name));
  const eq = (a, b) => KNOBS.every((k) => a[k] === b[k]);
  check('High and Medium are the presets exactly; the floor keeps Medium\'s look (MSAA, shadows, lamps, grass; resolution ≥ 85 %)', eq(knobsAt(0), PRESET_KNOBS.high) && eq(knobsAt(1), PRESET_KNOBS.medium) && ['bloom', 'filter', 'map', 'lamps', 'msaa', 'shadows', 'veg', 'casters'].every((k) => knobsAt(2)[k] === PRESET_KNOBS.medium[k]) && knobsAt(2).scale >= 0.85, knobsAt(2));
  check('the labels are the profile names; a state that is not a profile names its nearest and every difference', describe(knobsAt(2)).text === 'Medium-eco'
    && describe({ ...PRESET_KNOBS.high, bloom: 0 }).text === 'High, no bloom' && describe(knobsAt(2)).tier === 'medium', [describe({ ...PRESET_KNOBS.high, bloom: 0 }).text]);
  check('each profile is no more costly than the one above it, on both sides, by the model', PROFILES.every((x, i) => !i || (x.gpu <= PROFILES[i - 1].gpu && x.cpu <= PROFILES[i - 1].cpu)), PROFILES.map((x) => [x.gpu, x.cpu]));
  check('spell(): what a profile runs, in words', /Medium-eco: resolution 90 %, MSAA 2×, .*far people animated at half rate, far small parts dropped/.test(spell(2)), spell(2));
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
  G.setProfile(2, 'test: calibration guess', { commitNow: true, t: 0 });
  const { applied } = run(G, { cpu: 9, gpu: 9, display: 16.67, scene: 30000 }, 600);
  const ups = steps(G).filter((e) => e.kind === 'up');
  check('started too low (Medium-eco) with lots of room: the evaluation steps up once (applied at a scene change) and then holds', ups.length === 1 && G.phase === 'hold' && G.applied === 1 && applied.every((a) => a.at !== 'IN PLAY'), { ups: ups.map((e) => `${e.t} ${e.what}`), p: name(G.applied), applied });
  const G2 = new Governor(); G2.setProfile(2, 'test: held', { phase: 'hold', commitNow: true, t: 0 });
  run(G2, { cpu: 5, gpu: 5, display: 16.67, scene: 30000 }, 600);
  check('held (from the cache) with lots of room: never steps up in the session; the margin is noted for the next start', steps(G2).length === 0 && G2.applied === 2 && G2.margin() === true, G2.state());
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
  check('a machine below even Low-lite: walks down to Low-lite, settles there, no oscillation', G.applied === N_PROFILES - 1 && G.phase === 'hold' && steps(G).every((e) => e.kind === 'down') && applied.every((a) => a.at !== 'IN PLAY'), { p: name(G.applied), steps: steps(G).map((e) => e.what) });
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
  check('calibration: a fast machine → High; a slow one → Low-lite; the GPU side unmeasured is not limited', fast.p === 0 && slow.p === N_PROFILES - 1 && noTimer.p <= 1, { fast, slow, noTimer });
  check('calibration: the Vega-like numbers start above the name\'s Low', vega.p < TIER_AT.low, { vega, label: name(vega.p) });
  const cal = new Calibration({ p0: 0 });
  let r = null, t = 0;
  for (let i = 0; i < 400 && !r; i++) { t += 16.7; cal.gpu(4); r = cal.frame(t, 16.7, 5); }
  check('the title calibration finishes after ~2 s of frames and reports what it measured', r && r.p === 0 && r.gpuMs === 4 && r.cpuMs === 5 && t < 2600, { r, t });
  check('nextProfile: a power change without a cached profile moves one profile', nextProfile(0, -1) === 1 && nextProfile(2, -1) === 2 && nextProfile(2, +1) === 1 && nextProfile(0, +1) === 0, {});
}
// ---------------------------------------------------------------- 14. what the profiles never touch
check('the knobs are rendering and far-detail only (resolution, bloom, shadows, lamps, MSAA, grass, small casters, far people\'s animation rate, far small parts): no simulation, physics or hero knob',
  KNOBS.join() === 'scale,bloom,filter,map,lamps,msaa,shadows,veg,casters,anim,detail', KNOBS);

const fails = done();
process.exit(fails ? 1 : 0);
