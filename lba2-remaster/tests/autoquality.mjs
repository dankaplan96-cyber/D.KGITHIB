// AUTO-QUALITY (I-13): the governor and the calibration, fed synthetic frame traces (no browser, no GPU: this machine
// renders with SwiftShader, so no frame rate here means anything). Each scenario is a simulated machine: the CPU and
// GPU milliseconds of a frame at High and what each knob saves on it (its own "truth", deliberately not the governor's
// cost model), a display pacing frames at its refresh (or at a slower plateau, as the user's Vega 8 laptop sometimes
// does at ~56.5 Hz), stalls and scene changes. The checks: which ladder moves under GPU vs CPU pressure, one step per
// ≥ 3 s, never a step for a stall, a transition or a display plateau, steps back up only with room and with hysteresis,
// no oscillation over many minutes, commit knobs held to a scene change, the battery profile's knobs skipped.
//   node tests/autoquality.mjs
import { checker } from './lib/boot.mjs';
import { Governor, Calibration, compose, costAt, describe, estimate, GPU_LADDER, CPU_LADDER, TIER_AT, PRESET_KNOBS, KNOBS, COMMIT, nextTier, STEP_GAP } from '../src/engine/autoquality.js';
const { check, done } = checker();

// ---------------------------------------------------------------- a simulated machine
// truth: what each knob value saves (multiplicative), independent of the governor's model
const TRUTH = {
  gpu: { scale: (s) => 0.55 + 0.45 * s * s, bloom: { 1: 1, 0: 0.72 }, filter: { soft: 1, pcf: 0.95 }, map: { 4096: 1, 2048: 0.95, 1024: 0.91 }, lamps: { 8: 1, 4: 0.94, 2: 0.9 }, msaa: { 4: 1, 2: 0.93, 0: 0.85 }, shadows: { 1: 1, 0: 0.8 }, veg: { high: 1, medium: 0.99, low: 0.97 }, casters: { high: 1, medium: 0.99, low: 0.98 } },
  cpu: { scale: () => 1, bloom: { 1: 1, 0: 0.88 }, filter: { soft: 1, pcf: 1 }, map: { 4096: 1, 2048: 0.95, 1024: 0.95 }, lamps: { 8: 1, 4: 1, 2: 1 }, msaa: { 4: 1, 2: 1, 0: 1 }, shadows: { 1: 1, 0: 0.82 }, veg: { high: 1, medium: 0.98, low: 0.95 }, casters: { high: 1, medium: 0.95, low: 0.92 } },
};
const cost = (K, side, hi) => { let f = hi; for (const k of KNOBS) { const T = TRUTH[side][k]; f *= typeof T === 'function' ? T(K.scale) : T[K[k]]; } return f; };
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// run: machine { cpu, gpu (ms at High), display (ms: the refresh, or a plateau) }; secs; events(t) → { stall, trans, cpu, gpu, display }
function run(G, M, secs, { events = () => ({}), timer = true, t0 = 0, commitEvery = 0 } = {}) {
  let t = t0, nextCommit = commitEvery ? t0 + commitEvery : Infinity;
  const trace = [];
  while (t < t0 + secs * 1000) {
    const e = events(t - t0) || {}, K = G.knobs();
    const cpu = cost(K, 'cpu', e.cpu ?? M.cpu) * (0.92 + 0.16 * rnd()), gpu = cost(K, 'gpu', e.gpu ?? M.gpu) * (0.92 + 0.16 * rnd());
    let ms = Math.max(e.display ?? M.display ?? 16.67, cpu, gpu) * (0.99 + 0.02 * rnd());
    if (e.stall) ms = e.stall;
    t += ms;
    G.frame({ t, ms, cpu, play: !e.trans });
    if (timer && !e.trans) G.gpu(t + 40, gpu);
    if (t >= nextCommit) { G.commit('test: scene change'); nextCommit += commitEvery; }
    trace.push({ t, ms, g: G.g, c: G.c });
  }
  return { t, trace };
}
const changes = (G, from = 0, to = Infinity) => G.log.filter((e) => (e.kind === 'down' || e.kind === 'up') && e.t >= from && e.t < to);
const gaps = (L) => L.slice(1).map((e, i) => e.t - L[i].t);
const fpsOf = (tr, from) => { const f = tr.filter((x) => x.t >= from); return f.length / ((f[f.length - 1].t - f[0].t) / 1000); };

// ---------------------------------------------------------------- the ladders and the labels
{
  const hi = compose(0, 0), med = compose(TIER_AT.gpu.medium, TIER_AT.cpu.medium), low = compose(TIER_AT.gpu.low, TIER_AT.cpu.low);
  const eq = (a, b, skip = []) => KNOBS.every((k) => skip.includes(k) || a[k] === b[k]);
  check('ladders: the top is High; the "medium" marks are Medium (but 90 % resolution); the "low" marks are Low (70 % resolution)',
    eq(hi, PRESET_KNOBS.high) && eq(med, PRESET_KNOBS.medium, ['scale']) && med.scale === 0.9 && eq(low, PRESET_KNOBS.low, ['scale']) && low.scale === 0.7, { hi, med, low });
  check('every step of each ladder lowers exactly one knob, in order (least visible first, as listed in autoquality.js)',
    [GPU_LADDER, CPU_LADDER].every((L) => L.every((s, i) => { const a = L === GPU_LADDER ? compose(i, 0) : compose(0, i), b = L === GPU_LADDER ? compose(i + 1, 0) : compose(0, i + 1); return KNOBS.filter((k) => a[k] !== b[k]).length === 1; })), {});
  check('labels: High; High minus bloom; Medium with soft shadows; Low; a resolution under 100 % is named',
    describe(PRESET_KNOBS.high).text === 'High' && describe({ ...PRESET_KNOBS.high, bloom: 0 }).text === 'High, no bloom' && describe({ ...PRESET_KNOBS.medium, filter: 'soft' }).text === 'Medium, soft shadows'
    && describe(PRESET_KNOBS.low).text === 'Low, resolution 85 %' && describe(compose(1, 0)).text === 'High, resolution 90 %', [describe(PRESET_KNOBS.low).text, describe(compose(1, 0)).text]);
  check('the cost model: every step lowers its own side (or leaves it), High = 1', costAt(0, 0, 'gpu') === 1 && GPU_LADDER.every((s) => s.gpu <= 1 && s.cpu <= 1) && CPU_LADDER.every((s) => s.gpu <= 1 && s.cpu <= 1), {});
}

// ---------------------------------------------------------------- 1. a machine with room: High stays
{
  const G = new Governor();
  run(G, { cpu: 8, gpu: 8, display: 16.67 }, 180);
  check('room to spare (CPU 8 ms, GPU 8 ms at High, 60 Hz): 3 min, no step, High', changes(G).length === 0 && G.g === 0 && G.c === 0, G.state());
}
// ---------------------------------------------------------------- 2. the display / OS plateau
for (const plateau of [17.7, 19.2]) {
  const G = new Governor();
  run(G, { cpu: 7, gpu: 9, display: plateau }, 180);
  const kinds = [...new Set(G.hist.map((w) => w.kind))];
  check(`display-paced plateau at ${plateau} ms (${(1000 / plateau).toFixed(1)} fps) with light CPU and GPU work: 3 min, no step down`, changes(G).length === 0 && G.g === 0 && G.c === 0, { kinds, last: G.lastWindow });
}
{
  const G = new Governor();
  run(G, { cpu: 7, gpu: 9, display: 19.2 }, 180, { timer: false });
  check('the same 19.2 ms plateau without a GPU timer query: no step down', changes(G).filter((e) => e.kind === 'down').length === 0, { last: G.lastWindow, log: G.log.slice(-3) });
}
// ---------------------------------------------------------------- 3. GPU-bound
{
  const G = new Governor();
  const { trace } = run(G, { cpu: 8, gpu: 24, display: 16.67 }, 300, { commitEvery: 45000 });
  const C = changes(G), downs = C.filter((e) => e.kind === 'down');
  check('GPU-bound (GPU 24 ms at High, CPU 8): the GPU ladder steps down, the CPU ladder does not move', downs.length >= 2 && downs.every((e) => e.side === 'gpu') && G.c === 0, C.map((e) => `${e.t} ${e.side} ${e.what}`));
  check('... one step per ≥ 3 s, never two in one window', gaps(C).every((d) => d >= STEP_GAP), gaps(C));
  check('... ends holding ≥ 55 fps (last 60 s) and stable: no step in the last 2 min', fpsOf(trace, trace[trace.length - 1].t - 60000) >= 55 && changes(G, trace[trace.length - 1].t - 120000).length === 0, { fps: fpsOf(trace, trace[trace.length - 1].t - 60000).toFixed(1), st: G.state().label, C: C.map((e) => `${e.t} ${e.kind} ${e.what}`) });
  check('... the first GPU step is the resolution (90 %), the next bloom', downs[0]?.what.startsWith('scale') && /bloom/.test(downs[1]?.what || ''), downs.slice(0, 3).map((e) => e.what));
}
// ---------------------------------------------------------------- 4. CPU-bound (the user's High arrival: game CPU 16.5 ms)
{
  const G = new Governor();
  const { trace } = run(G, { cpu: 20, gpu: 10, display: 16.67 }, 300, { commitEvery: 45000 });
  const C = changes(G), downs = C.filter((e) => e.kind === 'down');
  check('CPU-bound (CPU 20 ms at High, GPU 10): the CPU ladder steps down first (bloom first), the resolution is never lowered', downs.length >= 1 && downs[0].side === 'cpu' && /bloom/.test(downs[0].what) && G.knobs().scale === 1, C.map((e) => `${e.t} ${e.side} ${e.what}`));
  check('... ends ≥ 55 fps and stable (no step in the last 2 min)', fpsOf(trace, trace[trace.length - 1].t - 60000) >= 55 && changes(G, trace[trace.length - 1].t - 120000).length === 0, { fps: fpsOf(trace, trace[trace.length - 1].t - 60000).toFixed(1), st: G.state().label, C: C.map((e) => `${e.t} ${e.kind} ${e.what}`) });
}
// ---------------------------------------------------------------- 5. stalls and scene changes never move a knob
{
  const G = new Governor();
  run(G, { cpu: 8, gpu: 9, display: 16.67 }, 240, { events: (t) => {
    const s = t % 10000;
    if (s < 17) return { stall: 550 };                       // a loading hitch every 10 s
    if (s > 4000 && s < 4060) return { stall: 160 };         // and a GC-like 160 ms frame
    if (s > 6000 && s < 6900) return { trans: true, cpu: 40, gpu: 40 };   // a scene change: heavy frames, not play
    return {};
  } });
  check('a 550 ms stall every 10 s, a 160 ms frame, a heavy scene change: 4 min, no step', changes(G).length === 0 && G.g === 0 && G.c === 0, { log: G.log.slice(-4), last: G.lastWindow });
}
{
  const G = new Governor();
  run(G, { cpu: 8, gpu: 9, display: 16.67 }, 60, { events: (t) => (t > 20000 && t < 21200 ? { gpu: 40 } : {}) });
  check('a 1.2 s burst of heavy frames (less than two windows): no step', changes(G).length === 0, G.log.slice(-3));
}
// ---------------------------------------------------------------- 6. back up, with hysteresis
{
  const G = new Governor();
  const heavy = (t) => (t < 90000 ? { gpu: 26 } : {});
  const { trace } = run(G, { cpu: 7, gpu: 8, display: 16.67 }, 400, { events: heavy, commitEvery: 30000 });
  const C = changes(G), ups = C.filter((e) => e.kind === 'up'), lastDown = Math.max(...C.filter((e) => e.kind === 'down').map((e) => e.t));
  check('a heavy area for 90 s, then a light one: back up to High (every step taken back), each step up ≥ 6 s apart and ≥ 20 s after the last step down',
    G.g === 0 && G.c === 0 && ups.length >= 2 && gaps(ups).every((d) => d >= 6000) && ups[0].t - lastDown >= 20000, { st: G.state().label, C: C.map((e) => `${e.t} ${e.kind} ${e.what}`) });
  check('... never above 1 step per 3 s in either direction', gaps(C).every((d) => d >= STEP_GAP), gaps(C));
}
// a marginal machine: High is just over the budget, the step below just under: no see-saw
{
  const G = new Governor();
  const { trace } = run(G, { cpu: 7, gpu: 17.6, display: 16.67 }, 900, { commitEvery: 40000 });
  const C = changes(G);
  check('a marginal GPU (17.6 ms at High): settles; ≤ 4 changes in 15 min and none in the last 5 min', C.length <= 4 && changes(G, trace[trace.length - 1].t - 300000).length === 0, C.map((e) => `${e.t} ${e.kind} ${e.what}`));
}
// a machine whose step up always fails (the step's real cost is far over the model's): the backoff spaces the tries
{
  const G = new Governor();
  // bloom costs nearly 3× what the model assumes: GPU with bloom 19.6, without 10.1 (the model predicts ~13.7 → no try);
  // force tries by lying in the windows: room is judged on the measured GPU only
  const saved = TRUTH.gpu.bloom; TRUTH.gpu.bloom = { 1: 1, 0: 0.4 };
  const { trace } = run(G, { cpu: 6, gpu: 25, display: 16.67 }, 1200, { commitEvery: 30000 });
  TRUTH.gpu.bloom = saved;
  const C = changes(G), ups = C.filter((e) => e.kind === 'up');
  check('a step up that fails again and again (bloom far dearer than modelled): tries spaced by the backoff (≤ 6 tries in 20 min)', ups.length <= 6, { n: C.length, ups: ups.map((e) => `${e.t} ${e.what}`) });
}
// ---------------------------------------------------------------- 7. commit knobs wait for a scene change
{
  const G = new Governor();
  G.setLevels(2, 0, 'test');   // (just above the PCF step)
  const before = G.knobs();
  // force a GPU step down: two GPU-pressure windows
  run(G, { cpu: 7, gpu: 30, display: 16.67 }, 5);
  const st = G.state(), d = changes(G).filter((e) => e.kind === 'down')[0];
  check('a GPU step down onto the shadow filter (needs new programs) queues it and takes the next live step (shadow map 2048) in the same move',
    st.pending.includes('filter') && st.knobs.filter === 'soft' && st.wanted.filter === 'pcf' && st.knobs.map === 2048 && /filter/.test(d?.what) && /map/.test(d?.what), { st, d });
  const ch = G.commit('test');
  check('... the scene change commits it', G.knobs().filter === 'pcf' && ch.length === 1 && !G.pending().length, ch);
  void before;
}
// ---------------------------------------------------------------- 8. the battery profile: its knobs are not steps
{
  const BAT = new Set(['msaa', 'filter', 'lamps']);
  const G = new Governor({ noop: (s) => BAT.has(s.k) });
  run(G, { cpu: 8, gpu: 40, display: 16.67 }, 120);
  const C = changes(G);
  check('on battery (the profile has MSAA off, the 5-read filter, 2 lamps): the GPU ladder skips those steps', C.length >= 3 && C.every((e) => !/msaa|filter|lamps/.test(e.what)), C.map((e) => e.what));
}
// ---------------------------------------------------------------- 9. a 30 fps limit: 33 ms frames are on time
{
  const G = new Governor({ budget: () => 1000 / 30 });
  run(G, { cpu: 9, gpu: 12, display: 33.33 }, 120);
  check('a 30 fps frame-rate limit: frames at 33.3 ms are on budget, no step', changes(G).length === 0, G.lastWindow);
}
// ---------------------------------------------------------------- 10. no GPU timer query
{
  const G = new Governor();
  const { trace } = run(G, { cpu: 7, gpu: 26, display: 16.67 }, 240, { timer: false, commitEvery: 40000 });
  const C = changes(G);
  check('no GPU timer query, frames at ~26 ms with light CPU work: the GPU ladder steps down to ≥ 55 fps', C.length >= 2 && C.every((e) => e.side === 'gpu' || e.kind === 'up') && fpsOf(trace, trace[trace.length - 1].t - 60000) >= 55, { fps: fpsOf(trace, trace[trace.length - 1].t - 60000).toFixed(1), C: C.map((e) => `${e.t} ${e.kind} ${e.side} ${e.what}`) });
}
// ---------------------------------------------------------------- 11. calibration
{
  // the user's Vega 8 plugged in, measured on Low (its name's guess): title GPU ~5 ms, CPU ~7 ms
  const vega = estimate({ gpuMs: 5, cpuMs: 7, g0: TIER_AT.gpu.low, c0: TIER_AT.cpu.low });
  const fast = estimate({ gpuMs: 3, cpuMs: 4, g0: 0, c0: 0 }), slow = estimate({ gpuMs: 14, cpuMs: 14, g0: TIER_AT.gpu.low, c0: TIER_AT.cpu.low });
  const noTimer = estimate({ gpuMs: null, cpuMs: 4, g0: TIER_AT.gpu.medium, c0: TIER_AT.cpu.medium });
  check('calibration: a fast machine at High → High; a slow one → Low (both ladders at their floor); the GPU side unmeasured stays where it was',
    fast.g === 0 && fast.c === 0 && slow.g === GPU_LADDER.length && slow.c === CPU_LADDER.length && noTimer.g === TIER_AT.gpu.medium && noTimer.c < TIER_AT.cpu.medium, { fast, slow, noTimer });
  check('calibration: the Vega-like numbers start between Low and High (not the name\'s Low)', vega.g < TIER_AT.gpu.low || vega.c < TIER_AT.cpu.low, { vega, label: describe(compose(vega.g, vega.c)).text });
  const cal = new Calibration({ g0: 0, c0: 0 });
  let r = null, t = 0;
  for (let i = 0; i < 400 && !r; i++) { t += 16.7; cal.gpu(4); r = cal.frame(t, 16.7, 5); }
  check('the title calibration finishes after ~2 s of frames and reports what it measured', r && r.g === 0 && r.c === 0 && r.gpuMs === 4 && r.cpuMs === 5 && t < 2600, { r, t });
  check('nextTier: a power change without a calibration moves one tier', nextTier('gpu', 0) === TIER_AT.gpu.medium && nextTier('gpu', TIER_AT.gpu.medium) === TIER_AT.gpu.low && nextTier('gpu', TIER_AT.gpu.low, +1) === TIER_AT.gpu.medium && nextTier('cpu', 3, +1) === 0, {});
}
// ---------------------------------------------------------------- 12. the governor never touches gameplay-side knobs
check('the knobs are rendering-only (resolution, bloom, shadow filter / map / on, lamps, MSAA, grass distance, small casters): no animation, simulation or face-detail knob',
  KNOBS.join() === 'scale,bloom,filter,map,lamps,msaa,shadows,veg,casters' && [...COMMIT].join() === 'filter,lamps,shadows', KNOBS);

const fails = done();
process.exit(fails ? 1 : 0);
