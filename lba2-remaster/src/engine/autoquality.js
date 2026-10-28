// AUTO-QUALITY (I-13). The user (28.10): "the game must detect the computer's capabilities automatically and run the
// quality and the optimal settings accordingly, without manual changes. 55–60 fps is the requirement."
//
// Quality: Auto (the default) describes the picture as a set of KNOBS rather than one preset. The three presets are
// points in that space (PRESET_KNOBS); Auto moves between and around them one knob at a time. Low / Medium / High as
// chosen by hand are exactly the presets they always were (renderer.knobs stays null for them).
//
// Two ladders, each in order of least visible first, one step a knob value:
//   GPU_LADDER  for frames that wait on the graphics processor (pixels, shadow maps, MSAA, lamps, bloom)
//   CPU_LADDER  for frames whose own main-thread work (simulation + render submission) is the long part
// The state is a position on each ladder (g, c); the knobs are High's with every step above both positions applied
// (a knob two steps share takes the lower value). A step marked `commit` needs new shader programs (the shadow
// filter, the lamp count, shadows on/off): it is decided like the others but takes effect only at the next scene
// change, pause or power change, where the game compiles programs anyway behind black or a menu — never as a freeze in
// play. The live steps (resolution, bloom, MSAA, shadow map size, vegetation and small-caster distances) apply at once.
//
// The Governor watches displayed frames in play: the interval, the game's CPU work and, where the browser has a timer
// query, the GPU's own time. Over WINDOW-long windows it classifies each window:
//   ok      ≥ 55 fps (at a 60 Hz budget; 27.5 under a 30 fps limit) and few missed refreshes
//   paced   slower, but neither CPU nor GPU is busy: the display / OS sets the pace (the user's Vega 8 laptop sometimes
//           runs at ~56.5 Hz with nothing drawn at all: PERF-HIGH §3, laptop-build244). Never a reason to degrade.
//   gpu/cpu slower, and that side's p90 is the long one
// A step down needs the same pressure in DOWN_WINDOWS windows in a row (≥ 3 s) and STEP_GAP since the last change; a
// step up needs room on that side (p90 well under the budget, and the model's prediction for the step up still under
// it) for UP_WINDOWS windows in a row, UP_AFTER_DOWN since the last step down, and no recent failure at that level
// (a step up that has to be taken back within FAIL_WINDOW blocks the next try for 60 s, then 2, 4 … 16 min).
// Frames that are not play (menus, scene changes and QUIET_AFTER after them, cinematics, a hidden window, the
// benchmark's fixed runs, a shader hold) are not counted; a single long frame (a loading hitch, a GC) is left out of
// the percentiles, and one over BREAK_MS starts the window again: no stall ever moves a knob.
//
// Calibration (first start, or a GPU / power source / screen not seen before): the game starts on the name-based guess
// (perf.js gpuQuality), measures the title screen's own frames for CAL_MS (GPU time, CPU work) and picks the starting
// position with estimate() from those numbers and the cost model (the steps' `gpu` / `cpu` factors, from the user's
// Vega 8 breakdowns, build 244). The choice takes effect when play starts (behind its fade). Once play has held a
// state for SETTLE_MS, that state is what the next start uses for this machine (`settled` in the cache).
//
// Nothing here touches the player's face / hands detail, animation rate, the simulation step or physics: the knobs
// are all rendering-side.

export const KNOBS = ['scale', 'bloom', 'filter', 'map', 'lamps', 'msaa', 'shadows', 'veg', 'casters'];
const RANK = {
  bloom: { 1: 1, 0: 0 }, filter: { soft: 1, pcf: 0 }, map: { 4096: 2, 2048: 1, 1024: 0 }, lamps: { 8: 2, 4: 1, 2: 0 },
  msaa: { 4: 2, 2: 1, 0: 0 }, shadows: { 1: 1, 0: 0 }, veg: { high: 2, medium: 1, low: 0 }, casters: { high: 2, medium: 1, low: 0 },
};
export const rank = (k, v) => (k === 'scale' ? +v : RANK[k][v]);
// the presets as knobs (scale: of High's pixel ratio; Low draws at 0.85 of it on a 1× screen)
export const PRESET_KNOBS = {
  high: { scale: 1, bloom: 1, filter: 'soft', map: 4096, lamps: 8, msaa: 4, shadows: 1, veg: 'high', casters: 'high' },
  medium: { scale: 1, bloom: 0, filter: 'pcf', map: 1024, lamps: 4, msaa: 2, shadows: 1, veg: 'medium', casters: 'medium' },
  low: { scale: 0.85, bloom: 0, filter: 'pcf', map: 1024, lamps: 2, msaa: 0, shadows: 0, veg: 'low', casters: 'low' },
};
export const TOP = PRESET_KNOBS.high;
// knobs whose change needs new shader programs (taken at a scene change, a pause or a power change)
export const COMMIT = new Set(['filter', 'lamps', 'shadows']);

// The ladders. gpu / cpu: the share of that side's time left after the step (the cost model). Measured on the user's
// Vega 8 at 1366×768, High street, plugged in (laptop-build244-plugged.txt breakdown: GPU 12.69 ms, game CPU 15.4 ms):
// no bloom 9.33 / 13.7, shadow map 2048 12.31 / 15.4, MSAA 2× 11.88 / 15.5, no lamps 11.24 / 15.4, res ×0.6 9.57 / 14.5,
// no shadows 9.58 / 12.9, Medium's vegetation 12.66 / 15.7. Resolution: GPU ≈ 7.8 + 4.9·s² ms (fit to as-is and ×0.6).
// Factors marked (est.) were not measured in isolation (PCF vs PCF soft, 1024 vs 2048, lamps 4→2, the small casters'
// distance detail, MSAA off on a plugged-in GPU): the next benchmark's breakdown and the governor's log refine them.
const res = (a, b) => (0.62 + 0.38 * b * b) / (0.62 + 0.38 * a * a);
export const GPU_LADDER = [
  { k: 'scale', v: 0.9, gpu: res(1, 0.9), cpu: 0.99 },
  { k: 'bloom', v: 0, gpu: 0.735, cpu: 0.89 },
  { k: 'filter', v: 'pcf', gpu: 0.97, cpu: 1 },                 // (est.)
  { k: 'map', v: 2048, gpu: 0.97, cpu: 0.95 },                  // (its static casters go into the cached map: shadowcache.js; CPU est.)
  { k: 'lamps', v: 4, gpu: 0.95, cpu: 0.98 },                   // (est.: all 8 off saved 1.45 ms GPU)
  { k: 'msaa', v: 2, gpu: 0.936, cpu: 0.99 },
  { k: 'map', v: 1024, gpu: 0.97, cpu: 1, tier: 'medium' },     // (est.) ≈ Medium from here (at 90 % resolution)
  { k: 'scale', v: 0.8, gpu: res(0.9, 0.8), cpu: 0.99 },
  { k: 'msaa', v: 0, gpu: 0.9, cpu: 1 },                        // (est.; FXAA instead; battery: MSAA off −5.3 of 37 ms)
  { k: 'lamps', v: 2, gpu: 0.97, cpu: 1 },                      // (est.)
  { k: 'scale', v: 0.7, gpu: res(0.8, 0.7), cpu: 0.99 },
  { k: 'shadows', v: 0, gpu: 0.85, cpu: 0.84, tier: 'low' },    // ≈ Low from here
];
export const CPU_LADDER = [
  { k: 'bloom', v: 0, gpu: 0.735, cpu: 0.89 },
  { k: 'map', v: 2048, gpu: 0.97, cpu: 0.95 },
  { k: 'casters', v: 'medium', gpu: 0.99, cpu: 0.96 },          // (est.: small props' shadows to 18 m, specks under 4 px left out)
  { k: 'veg', v: 'medium', gpu: 1, cpu: 0.99, tier: 'medium' }, // (Medium's grass / tree distances: measured ≈ 0 on the street)
  { k: 'casters', v: 'low', gpu: 0.99, cpu: 0.97 },             // (est.)
  { k: 'veg', v: 'low', gpu: 0.98, cpu: 0.98 },                 // (est.)
  { k: 'shadows', v: 0, gpu: 0.85, cpu: 0.84, tier: 'low' },
];
const tierIndex = (L, t) => { if (t === 'high') return 0; const i = L.findIndex((s) => s.tier === t); return i < 0 ? L.length : i + 1; };
export const TIER_AT = {
  gpu: { high: 0, medium: tierIndex(GPU_LADDER, 'medium'), low: tierIndex(GPU_LADDER, 'low') },
  cpu: { high: 0, medium: tierIndex(CPU_LADDER, 'medium'), low: tierIndex(CPU_LADDER, 'low') },
};

// the knobs at ladder positions g, c (steps [0, g) and [0, c) applied)
export function compose(g, c) {
  const K = { ...TOP };
  const take = (s) => { if (rank(s.k, s.v) < rank(s.k, K[s.k])) K[s.k] = s.v; };
  for (let i = 0; i < Math.min(g, GPU_LADDER.length); i++) take(GPU_LADDER[i]);
  for (let i = 0; i < Math.min(c, CPU_LADDER.length); i++) take(CPU_LADDER[i]);
  return K;
}
// the cost model: that side's time at (g, c) as a share of High's
export function costAt(g, c, side) {
  let f = 1;
  const K = { ...TOP };
  const take = (s) => { if (rank(s.k, s.v) < rank(s.k, K[s.k])) { K[s.k] = s.v; f *= s[side]; } };
  for (let i = 0; i < Math.min(g, GPU_LADDER.length); i++) take(GPU_LADDER[i]);
  for (let i = 0; i < Math.min(c, CPU_LADDER.length); i++) take(CPU_LADDER[i]);
  return f;
}

// in words, for Settings and the benchmark: the nearest preset and what differs from it
const WORD = {
  bloom: { 1: 'bloom', 0: 'no bloom' }, filter: { soft: 'soft shadows', pcf: 'plain shadow edges' },
  map: { 4096: 'shadow map 4096', 2048: 'shadow map 2048', 1024: 'shadow map 1024' }, lamps: { 8: '8 lamps', 4: '4 lamps', 2: '2 lamps' },
  msaa: { 4: 'MSAA 4×', 2: 'MSAA 2×', 0: 'FXAA' }, shadows: { 1: 'shadows', 0: 'no shadows' },
  veg: { high: "High's grass distance", medium: "Medium's grass distance", low: "Low's grass" },
  casters: { high: "High's small shadows", medium: "Medium's small shadows", low: "Low's small shadows" },
};
const TIER_NAME = { high: 'High', medium: 'Medium', low: 'Low' };
export function describe(K) {
  let best = null;
  for (const t of ['low', 'medium', 'high']) {   // (a tie goes to the higher preset: listed last)
    const P = PRESET_KNOBS[t];
    let n = 0; for (const k of KNOBS) if (k !== 'scale' && P[k] !== K[k]) n++;
    if (!best || n <= best.n) best = { t, n };
  }
  const P = PRESET_KNOBS[best.t], diffs = [];
  for (const k of KNOBS) if (k !== 'scale' && K[k] !== P[k]) {
    if (!K.shadows && (k === 'filter' || k === 'map' || k === 'casters')) continue;   // (no shadows: their details don't show)
    diffs.push(WORD[k][K[k]]);
  }
  if (K.scale < 0.995) diffs.push(`resolution ${Math.round(K.scale * 100)} %`);
  return { tier: best.t, diffs, text: `${TIER_NAME[best.t]}${diffs.length ? ', ' + diffs.join(', ') : ''}` };
}
export const stepWords = (s, down = true) => `${s.k} ${down ? '→' : '←'} ${WORD[s.k]?.[s.v] ?? s.v}`;

// Start position from measurements at a known position (calibration). gpuMs / cpuMs: p90 of the title's frames at
// position (g0, c0); null when not measured (no timer query: the GPU side stays at g0). MARGIN: the title's view is
// lighter than play (fewer people, no combat): its numbers are scaled up before they are compared with the budget.
export const CAL = { budgetShare: 0.7, marginGpu: 1.15, marginCpu: 1.3 };
export function estimate({ gpuMs = null, cpuMs = null, g0 = 0, c0 = 0, budget = 1000 / 60 }) {
  const lim = CAL.budgetShare * budget;
  // each side's time at High, from the measurement at (g0, c0) and the model; a side not measured is not limited
  const hiG = gpuMs > 0 ? (gpuMs * CAL.marginGpu) / costAt(g0, c0, 'gpu') : null, hiC = cpuMs > 0 ? (cpuMs * CAL.marginCpu) / costAt(g0, c0, 'cpu') : null;
  // the best (g, c) whose predicted GPU and CPU times both fit; without a GPU measurement the GPU side stays at g0
  let best = null;
  for (let g = hiG == null ? g0 : 0; g <= (hiG == null ? g0 : GPU_LADDER.length); g++) for (let c = 0; c <= CPU_LADDER.length; c++) {
    const okG = hiG == null || hiG * costAt(g, c, 'gpu') <= lim, okC = hiC == null || hiC * costAt(g, c, 'cpu') <= lim;
    const score = g / GPU_LADDER.length + c / CPU_LADDER.length;
    if (okG && okC && (!best || score < best.score)) best = { g, c, score };
  }
  return best ? { g: best.g, c: best.c } : { g: hiG == null ? g0 : GPU_LADDER.length, c: CPU_LADDER.length };
}

// the cache of calibrations / settled states: per GPU, power source and screen
export const CACHE_KEY = 'lba3_autoq_v1';
export const machineKey = ({ gpu = '?', battery = false, screen = '?', cpu = '' }) => `${gpu}|${battery ? 'battery' : 'mains'}|${screen}${cpu ? '|' + cpu : ''}`;

export const WINDOW = 1500, DOWN_WINDOWS = 2, UP_WINDOWS = 6, STEP_GAP = 3000, UP_GAP = 6000, UP_AFTER_DOWN = 20000;
export const QUIET_AFTER = 1500, STALL_MS = 100, BREAK_MS = 250, FAIL_WINDOW = 20000, BLOCK_BASE = 60000, BLOCK_MAX = 16 * 60000;
export const SETTLE_MS = 60000, CAL_MS = 1500, CAL_WAIT = 600;

const pct = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };

export class Governor {
  // opts: budget() → the frame budget in ms (16.7, or 33.3 under a 30 fps limit); noop(step, knobs) → true when a
  // step would change nothing now (the battery profile already has it, Resolution: Full); onChange(info) → the game
  // applies the knobs; log: an array the decisions are pushed to
  constructor(opts = {}) {
    this.budget = opts.budget || (() => 1000 / 60);
    this.noop = opts.noop || (() => false);
    this.onChange = opts.onChange || (() => {});
    this.log = opts.log || [];
    this.g = 0; this.c = 0;
    this.committed = {}; for (const k of COMMIT) this.committed[k] = TOP[k];
    this.enabled = true;
    this.reset(0);
    this.lad = { gpu: { fails: 0, blockUntil: 0, blockAt: -1, upAt: -1e9, upFrom: -1 }, cpu: { fails: 0, blockUntil: 0, blockAt: -1, upAt: -1e9, upFrom: -1 } };
    this.lastChange = -1e9; this.lastDown = -1e9; this.since = 0; this.gpuSeen = false; this.windows = 0;
  }
  // (a fresh window; nothing counted before `until`)
  reset(until = 0) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, t0: null }; this.hist = []; this.quietUntil = Math.max(this.quietUntil || 0, until); }
  // where the knobs stand: wanted (the ladders' positions) and in force (commit knobs as last committed)
  wanted() { return compose(this.g, this.c); }
  knobs() { const K = this.wanted(); for (const k of COMMIT) K[k] = this.committed[k]; return K; }
  pending() { const W = this.wanted(), out = []; for (const k of COMMIT) if (W[k] !== this.committed[k]) out.push(k); return out; }
  // the commit knobs take their wanted values (the game compiles their programs now); returns the knobs that changed
  commit(why = 'scene change') {
    const W = this.wanted(), ch = [];
    for (const k of COMMIT) if (W[k] !== this.committed[k]) { ch.push(`${k} ${WORD[k][this.committed[k]]} → ${WORD[k][W[k]]}`); this.committed[k] = W[k]; }
    if (ch.length) this.note({ kind: 'commit', why, what: ch.join(', ') });
    return ch;
  }
  // put the ladders somewhere (calibration, cache, power change); commitNow: the commit knobs too
  setLevels(g, c, why, commitNow = false, t = this.since) {
    this.g = Math.max(0, Math.min(GPU_LADDER.length, g | 0)); this.c = Math.max(0, Math.min(CPU_LADDER.length, c | 0));
    if (commitNow) { const W = this.wanted(); for (const k of COMMIT) this.committed[k] = W[k]; }
    this.lastChange = t; this.hist = [];
    this.note({ kind: 'set', why, what: `gpu ${this.g} · cpu ${this.c}` });
  }
  label() { return describe(this.knobs()); }
  note(e) { e.t = Math.round(this.since); e.state = describe(this.knobs()).text; if (this.pending().length) e.pending = this.pending().join(', '); this.log.push(e); if (this.log.length > 400) this.log.splice(0, this.log.length - 400); }

  // one displayed frame. f: { t: ms (a clock), ms: interval, cpu: the game's CPU work (ms), play: counted }
  frame(f) {
    this.since = f.t;
    if (!this.enabled) return null;
    if (!f.play) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, t0: null }; this.quietUntil = Math.max(this.quietUntil, f.t + QUIET_AFTER); return null; }
    if (f.t < this.quietUntil) return null;
    if (f.ms > BREAK_MS) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, t0: null }; this.quietUntil = f.t + QUIET_AFTER; return null; }
    const W = this.win;
    if (W.t0 == null) W.t0 = f.t - f.ms;
    W.dur += f.ms;
    if (f.ms > STALL_MS) W.stalls++; else { W.f.push(f.ms); if (f.cpu != null) W.cpu.push(f.cpu); }
    if (W.dur < WINDOW) return null;
    this.win = { f: [], cpu: [], dur: 0, stalls: 0, t0: null };
    return this.window(W, f.t);
  }
  // the GPU's own time for a frame drawn at about time t (arrives a few frames late)
  gpu(t, ms) { (this.gpuBuf ??= []).push([t, ms]); this.gpuSeen = true; if (this.gpuBuf.length > 600) this.gpuBuf.splice(0, 300); }

  classify(W, t) {
    const B = this.budget(), n = W.f.length + W.stalls;
    const fps = (n * 1000) / Math.max(1, W.dur), p90 = pct(W.f, 0.9) ?? B, miss = W.f.filter((x) => x > 1.2 * B).length / Math.max(1, n);
    const cpu = pct(W.cpu, 0.9);
    const g = (this.gpuBuf || []).filter(([ts]) => ts >= W.t0 - 100 && ts <= t + 100).map((x) => x[1]);
    const gpu = g.length >= 8 ? pct(g, 0.9) : null;
    const want = (1000 / B) * (55 / 60), heavy = 0.75 * B;
    let kind;
    if (fps >= want && miss < 0.06) kind = 'ok';
    else if (gpu != null) kind = cpu <= heavy && gpu <= heavy ? 'paced' : gpu >= cpu ? 'gpu' : 'cpu';
    else kind = cpu > heavy ? 'cpu' : miss < 0.08 && p90 <= 1.17 * B ? 'paced' : 'gpu';
    // room for a step up: that side's p90 well under the budget (the step's own cost is checked in decide)
    const roomCpu = cpu != null && cpu <= 0.63 * B && kind !== 'cpu' && kind !== 'gpu';
    const roomGpu = (gpu != null ? gpu <= 0.6 * B : fps >= (1000 / B) * 0.975 && miss < 0.02 && p90 <= 1.06 * B) && kind !== 'cpu' && kind !== 'gpu';
    return { t: Math.round(t), kind, fps: +fps.toFixed(1), p90: +p90.toFixed(1), miss: +miss.toFixed(3), cpu: cpu == null ? null : +cpu.toFixed(1), gpu: gpu == null ? null : +gpu.toFixed(1), stalls: W.stalls, roomCpu, roomGpu };
  }
  window(W, t) {
    const w = this.classify(W, t);
    this.windows++;
    this.hist.push(w); if (this.hist.length > 12) this.hist.shift();
    this.lastWindow = w;
    return this.decide(t);
  }
  why(ws) {
    const a = ws[ws.length - 1], f = (k) => (ws.every((x) => x[k] != null) ? Math.max(...ws.map((x) => x[k])) : null);
    return `${(ws.reduce((s, x) => s + x.fps, 0) / ws.length).toFixed(1)} fps over ${(ws.length * WINDOW / 1000).toFixed(1)} s · frame p90 ${f('p90')} ms · CPU p90 ${f('cpu') ?? '?'} ms · GPU p90 ${f('gpu') ?? 'n/a'} ms · missed ${Math.round(100 * a.miss)} %`;
  }
  decide(t) {
    const H = this.hist, B = this.budget();
    if (t - this.lastChange < STEP_GAP) return null;
    // ---- down: the same pressure in the last DOWN_WINDOWS windows
    const last = H.slice(-DOWN_WINDOWS);
    if (last.length === DOWN_WINDOWS && last.every((w) => w.kind === 'gpu' || w.kind === 'cpu')) {
      const side = last[last.length - 1].kind;
      const r = this.step(side, -1, t, `${side.toUpperCase()} pressure: ${this.why(last)}`);
      if (r) return r;
      const other = side === 'gpu' ? 'cpu' : 'gpu';   // (that ladder at its floor: the other side's steps help both a little)
      if (!this._floorNoted || t - this._floorNoted > 30000) { this._floorNoted = t; this.note({ kind: 'floor', why: `${side.toUpperCase()} pressure with the ${side} ladder at its lowest: ${this.why(last)}` }); }
      return last.every((w) => w.kind === side) ? this.step(other, -1, t, `${side.toUpperCase()} pressure, ${side} ladder at its lowest: ${this.why(last)}`) : null;
    }
    // ---- up: room in the last UP_WINDOWS windows, nothing pressing
    if (t - this.lastChange < UP_GAP || t - this.lastDown < UP_AFTER_DOWN) return null;
    const ups = H.slice(-UP_WINDOWS);
    if (ups.length < UP_WINDOWS || ups.some((w) => w.kind === 'gpu' || w.kind === 'cpu')) return null;
    const cands = [];
    for (const side of ['cpu', 'gpu']) {
      const L = this.lad[side], at = side === 'gpu' ? this.g : this.c;
      if (at <= 0 || !ups.every((w) => (side === 'gpu' ? w.roomGpu : w.roomCpu))) continue;
      const to = this.upTarget(side);
      if (to === at || (t < L.blockUntil && to <= L.blockAt)) continue;   // (the level that failed: not again yet)
      // the model's prediction for both sides after the step up must stay under 0.72 of the budget
      const g1 = side === 'gpu' ? to : this.g, c1 = side === 'cpu' ? to : this.c;
      const gNow = Math.max(...ups.map((w) => w.gpu ?? 0)), cNow = Math.max(...ups.map((w) => w.cpu ?? 0));
      const gPred = gNow * costAt(g1, c1, 'gpu') / costAt(this.g, this.c, 'gpu'), cPred = cNow * costAt(g1, c1, 'cpu') / costAt(this.g, this.c, 'cpu');
      if (gPred > 0.72 * B || cPred > 0.72 * B) continue;
      cands.push({ side, at, gPred, cPred });
    }
    if (!cands.length) return null;
    // (the side further down its ladder first)
    cands.sort((a, b) => b.at / (b.side === 'gpu' ? GPU_LADDER.length : CPU_LADDER.length) - a.at / (a.side === 'gpu' ? GPU_LADDER.length : CPU_LADDER.length));
    const C = cands[0];
    return this.step(C.side, +1, t, `room: ${this.why(ups)} · predicted after the step: GPU ${C.gPred ? C.gPred.toFixed(1) : '?'} ms, CPU ${C.cPred.toFixed(1)} ms`);
  }
  // the position one step up on a ladder, past steps that change nothing now
  upTarget(side) {
    const L = side === 'gpu' ? GPU_LADDER : CPU_LADDER, at = side === 'gpu' ? this.g : this.c, K0 = this.wanted();
    for (let i = at - 1; i >= 0; i--) { const K = side === 'gpu' ? compose(i, this.c) : compose(this.g, i); if (KNOBS.some((k) => K[k] !== K0[k]) && !this.noop(L[i], K)) return i; }
    return at;
  }
  // one step on a ladder (dir −1 down, +1 up), skipping steps that change nothing now (a knob the other ladder has
  // already lowered, the battery profile's MSAA / filter / lamps, the resolution under Resolution: Full); a step
  // down that only queues a commit knob goes on to the next live step in the same move, so the frame rate gains now
  step(side, dir, t, why) {
    const L = side === 'gpu' ? GPU_LADDER : CPU_LADDER, A = this.lad[side];
    let at = side === 'gpu' ? this.g : this.c;
    const from = at, before = this.knobs(), taken = [];
    for (;;) {
      if (dir < 0 ? at >= L.length : at <= 0) break;
      const s = dir < 0 ? L[at] : L[at - 1];
      at += dir < 0 ? 1 : -1;
      const g = side === 'gpu' ? at : this.g, c = side === 'cpu' ? at : this.c;
      const K = compose(g, c), K0 = side === 'gpu' ? compose(dir < 0 ? at - 1 : at + 1, this.c) : compose(this.g, dir < 0 ? at - 1 : at + 1);
      if (!KNOBS.some((k) => K[k] !== K0[k]) || this.noop(s, K)) continue;
      taken.push(stepWords(s, dir < 0));
      if (dir > 0 || !COMMIT.has(s.k)) break;   // (down: past a commit step to a live one)
    }
    if (!taken.length) return null;
    if (side === 'gpu') this.g = at; else this.c = at;
    if (dir < 0) {
      // a level reached by a step up that could not be held: back off before trying it again
      if (A.upAt > this.lastDown && t - A.upAt < FAIL_WINDOW && A.upFrom === from) { A.fails = Math.min(5, A.fails + 1); A.blockUntil = t + Math.min(BLOCK_MAX, BLOCK_BASE * 2 ** (A.fails - 1)); A.blockAt = from; }
      this.lastDown = t;
    } else { A.upAt = t; A.upFrom = at; if (t - (A.okAt || 0) > 5 * 60000 && A.fails) { A.fails--; A.okAt = t; } }
    this.lastChange = t; this.hist = []; this.quietUntil = t + QUIET_AFTER;
    const after = this.knobs(), live = KNOBS.filter((k) => after[k] !== before[k]);
    const info = { kind: dir < 0 ? 'down' : 'up', side, what: taken.join('; '), why, live, from, to: at };
    this.note(info);
    this.onChange(info);
    return info;
  }
  state() {
    return { g: this.g, c: this.c, knobs: this.knobs(), wanted: this.wanted(), pending: this.pending(), label: describe(this.knobs()).text, last: this.lastWindow || null, windows: this.windows, gpuTimer: this.gpuSeen,
      blocked: Object.fromEntries(Object.entries(this.lad).map(([k, A]) => [k, A.blockUntil > this.since ? { until: Math.round(A.blockUntil), at: A.blockAt } : null])) };
  }
}

// Calibration on the title screen: frames measured for CAL_MS after CAL_WAIT; then estimate()
export class Calibration {
  constructor({ g0 = 0, c0 = 0, budget = () => 1000 / 60 } = {}) { this.g0 = g0; this.c0 = c0; this.budget = budget; this.t0 = null; this.f = []; this.cpu = []; this.g = []; this.done = false; this.result = null; }
  frame(t, ms, cpu) {
    if (this.done) return null;
    if (this.t0 == null) this.t0 = t;
    if (t - this.t0 < CAL_WAIT) return null;
    if (ms < BREAK_MS) { this.f.push(ms); if (cpu != null) this.cpu.push(cpu); }
    if (t - this.t0 < CAL_WAIT + CAL_MS || this.f.length < 30) return null;
    return this.finish();
  }
  gpu(ms) { if (!this.done && this.t0 != null) this.g.push(ms); }
  finish() {
    this.done = true;
    const gpuMs = this.g.length >= 8 ? pct(this.g, 0.9) : null, cpuMs = pct(this.cpu, 0.9), fMs = pct(this.f, 0.5);
    // (no GPU timer: a title already missing refreshes with light CPU work is GPU-bound at the guess — one tier down)
    let est = estimate({ gpuMs, cpuMs, g0: this.g0, c0: this.c0, budget: this.budget() });
    if (gpuMs == null && fMs > 1.2 * this.budget() && cpuMs < 0.75 * this.budget()) est = { ...est, g: Math.max(est.g, nextTier('gpu', this.g0)) };
    this.result = { ...est, gpuMs: gpuMs == null ? null : +gpuMs.toFixed(2), cpuMs: cpuMs == null ? null : +cpuMs.toFixed(2), frameMs: fMs == null ? null : +fMs.toFixed(2), frames: this.f.length, gpuFrames: this.g.length, g0: this.g0, c0: this.c0 };
    return this.result;
  }
}
// the next tier boundary below / above a position (power changes without a calibration for the new source)
export function nextTier(side, at, dir = -1) {
  const T = Object.values(TIER_AT[side]).sort((a, b) => a - b);
  if (dir < 0) return T.find((x) => x > at) ?? T[T.length - 1];
  return [...T].reverse().find((x) => x < at) ?? 0;
}
