// AUTO-QUALITY (I-13), settle-then-hold (PERF-CPU, the user 29.10). The user (28.10): "the game must detect the
// computer's capabilities automatically and run the quality and the optimal settings accordingly, without manual
// changes. 55–60 fps is the requirement." And (29.10): "there are too many settings"; "Auto should settle on the best
// settings after thinking a little, and then NOT change every few seconds — it jumps"; "if the game runs well on battery
// there's no reason it won't on mains".
//
// Quality: Auto chooses among THREE complete, named profiles (PROFILES, best first): High · Medium · Medium-eco
// (LOOK-FIRST, below). A profile is a full set of knobs (resolution, bloom, shadow filter and map, lamps, MSAA, shadows, vegetation
// and small-caster distances, the people's animation rate, the far detail); Auto moves one profile at a time, never a
// single knob. Low / Medium / High chosen by hand are exactly the presets they always were (renderer.knobs stays null).
//
// The Governor:
//   evaluate  a short evaluation: the first ~60–90 s of real play, across at least two different scenes (or 120 s in
//             one). Each 1.5 s window of counted play is classified (ok / paced / cpu / gpu, below). Sustained pressure
//             queues one profile down; a profile that holds 55–60 with room on both sides (by the cost model) may queue
//             ONE step up, once. At the end, the profile in force is LOCKED (`hold`) and cached for this machine and
//             power source as `settled`.
//   hold      no change, except (a) a power-source change (that source's cached profile, or one profile lower on
//             battery / higher on mains, evaluated again), and (b) a sustained real problem: pressure in 80 % of the
//             windows and > 10 % missed refreshes over 30 s of play, seen in two scenes (or 60 s in one scene): one
//             profile down. Never up during a session: a session that had lots of room marks the cache, and the next
//             start tries one profile higher (evaluated; if it can't hold, it goes back and that try is not repeated
//             for a while).
// Every change is visible, so every change is QUEUED and takes effect only at a commit point: a scene change (behind its
// black and shader hold), an open pause / inventory / map, a power change, the start of play. Never mid-play.
//
// Windows: frames that are not play (menus, cinematics and cutscenes, scene changes plus QUIET_AFTER after them,
// shader holds, the loading screen, a hidden window, the benchmark's fixed runs, the tests' fixed stepping) are not
// counted; a frame over STALL_MS is left out of the percentiles and one over BREAK_MS restarts the window: no stall
// ever moves a profile. Each window is
//   ok      ≥ 55 fps (27.5 under a 30 fps limit) with < 6 % of intervals over 1.2 B (B = the frame budget)
//   paced   slower, but CPU p90 and GPU p90 are both ≤ 0.75 B: the display / OS sets the pace. Never a reason to degrade.
//   gpu/cpu slower, and that side's p90 is the longer one (no timer query: CPU if its p90 > 0.75 B)
//
// Calibration (a machine, power source or screen not seen before): the start is the GPU name's guess, refined by the
// title screen's own frames (CAL_MS: GPU time, CPU work) with estimate() and the profiles' cost factors. The evaluation
// in play decides; the calibration only picks where it starts.

// ---------------------------------------------------------------- knobs and profiles
// anim: the people's animation rate in view beyond 25 m ('eco': every other frame; out of the view it is always lower:
// drawcull.js FarCull.anim). detail: far detail ('near': people's small parts — eyes, buttons, a brooch — dropped under
// 2.5 px instead of 0.75; drawcull.js FarCull.partPx).
export const KNOBS = ['scale', 'bloom', 'filter', 'map', 'lamps', 'msaa', 'shadows', 'veg', 'casters', 'anim', 'detail'];
export const PRESET_KNOBS = {
  high: { scale: 1, bloom: 1, filter: 'soft', map: 4096, lamps: 8, msaa: 4, shadows: 1, veg: 'high', casters: 'high', anim: 'full', detail: 'normal' },
  medium: { scale: 1, bloom: 0, filter: 'pcf', map: 1024, lamps: 4, msaa: 2, shadows: 1, veg: 'medium', casters: 'medium', anim: 'full', detail: 'normal' },
  low: { scale: 0.85, bloom: 0, filter: 'pcf', map: 1024, lamps: 2, msaa: 0, shadows: 0, veg: 'low', casters: 'low', anim: 'full', detail: 'normal' },
};
export const TOP = PRESET_KNOBS.high;
// gpu / cpu: each profile's share of High's time on that side (the cost model: from the user's Vega 8 breakdowns, build
// 244 plugged in, the old ladders' measured steps multiplied out; used to pick a start and to judge a step up's room,
// never to step down — that is measured pressure only)
// LOOK-FIRST (the user, 29.10, after build 263 held Low-lite on battery: "the game looks uglier — rendering, shadows,
// in general … I want the world to look good and sharp, not pixelated … 50–55 that looks good!"): Auto never goes below
// Medium's look: shadows, MSAA and Medium's lamps always; the floor, Medium-eco, draws at 90 % resolution ("less
// resolution is fine, but not excessively"), animates far people at half rate and drops their tiny far parts. (On
// battery the renderer's nearly invisible battery cuts apply on top: renderer.js LOOK-FIRST-2.) Low / Medium-lite /
// Low-lite are gone from Auto (Low stays a preset to pick by hand); on a weak machine on battery the game runs ~50–55
// fps in the busiest places rather than look worse (it was not faster there anyway: CPU-bound).
export const PROFILES = [
  { id: 'high', name: 'High', tier: 'high', K: { ...PRESET_KNOBS.high }, gpu: 1, cpu: 1 },
  { id: 'medium', name: 'Medium', tier: 'medium', K: { ...PRESET_KNOBS.medium }, gpu: 0.56, cpu: 0.8 },
  { id: 'medium-eco', name: 'Medium-eco', tier: 'medium', K: { ...PRESET_KNOBS.medium, scale: 0.9, anim: 'eco', detail: 'near' }, gpu: 0.5, cpu: 0.74 },
];
export const N_PROFILES = PROFILES.length;
export const TIER_AT = { high: 0, medium: 1, low: 1 };   // (LOOK-FIRST: a weak GPU starts at Medium; on battery one lower, the floor Medium-eco)
export const profileOf = (p) => PROFILES[Math.max(0, Math.min(N_PROFILES - 1, p | 0))];
export const knobsAt = (p) => ({ ...profileOf(p).K });
export const costAt = (p, side) => profileOf(p)[side];

// in words, for Settings and the benchmark: the profile's name (and, in the benchmark, what it runs)
const WORD = {
  bloom: { 1: 'bloom', 0: 'no bloom' }, filter: { soft: 'soft shadows', pcf: 'plain shadow edges' },
  map: { 4096: 'shadow map 4096', 2048: 'shadow map 2048', 1024: 'shadow map 1024' }, lamps: { 8: '8 lamps', 4: '4 lamps', 2: '2 lamps' },
  msaa: { 4: 'MSAA 4×', 2: 'MSAA 2×', 0: 'FXAA' }, shadows: { 1: 'shadows', 0: 'no shadows' },
  veg: { high: "High's grass distance", medium: "Medium's grass distance", low: "Low's grass" },
  casters: { high: "High's small shadows", medium: "Medium's small shadows", low: "Low's small shadows" },
  anim: { full: 'full-rate animation', eco: 'far people animated at half rate' }, detail: { normal: 'full far detail', near: 'far small parts dropped' },
};
export function describe(K) {
  const P = PROFILES.find((x) => KNOBS.every((k) => x.K[k] === K[k]));
  if (P) return { tier: P.tier, id: P.id, diffs: [], text: P.name };
  // (not a profile — the benchmark's fixed knobs: the nearest profile and what differs)
  let best = null;
  for (const X of PROFILES) { let n = 0; for (const k of KNOBS) if (X.K[k] !== K[k]) n++; if (!best || n < best.n) best = { X, n }; }
  const diffs = KNOBS.filter((k) => k !== 'scale' && best.X.K[k] !== K[k]).map((k) => WORD[k]?.[K[k]] ?? `${k} ${K[k]}`);
  if (K.scale !== best.X.K.scale) diffs.push(`resolution ${Math.round(K.scale * 100)} %`);
  return { tier: best.X.tier, id: best.X.id, diffs, text: `${best.X.name}${diffs.length ? ', ' + diffs.join(', ') : ''}` };
}
// what a profile runs, in words (the benchmark's report and AUTO_QUALITY.md)
export const spell = (p) => { const K = profileOf(p).K; return `${profileOf(p).name}: resolution ${Math.round(K.scale * 100)} %, ${WORD.msaa[K.msaa]}, ${WORD.bloom[K.bloom]}, ${K.shadows ? `${WORD.filter[K.filter]}, ${WORD.map[K.map]}, ${WORD.casters[K.casters]}` : 'no shadows'}, ${WORD.lamps[K.lamps]}, ${WORD.veg[K.veg]}, ${WORD.anim[K.anim]}, ${WORD.detail[K.detail]}`; };

// Start position from measurements at a known profile (calibration). gpuMs / cpuMs: p90 of the title's frames at
// profile p0; null when not measured (no timer query: the GPU side is not limited). MARGIN: the title's view is lighter
// than play (fewer people, no combat): its numbers are scaled up before they are compared with the budget.
export const CAL = { budgetShare: 0.7, marginGpu: 1.15, marginCpu: 1.3 };
export function estimate({ gpuMs = null, cpuMs = null, p0 = 0, budget = 1000 / 60 }) {
  const lim = CAL.budgetShare * budget;
  const hiG = gpuMs > 0 ? (gpuMs * CAL.marginGpu) / costAt(p0, 'gpu') : null, hiC = cpuMs > 0 ? (cpuMs * CAL.marginCpu) / costAt(p0, 'cpu') : null;
  for (let p = 0; p < N_PROFILES; p++) if ((hiG == null || hiG * costAt(p, 'gpu') <= lim) && (hiC == null || hiC * costAt(p, 'cpu') <= lim)) return { p };
  return { p: N_PROFILES - 1 };
}

// the cache of calibrations / settled profiles: per GPU, power source and screen (and processor in the desktop app)
export const CACHE_KEY = 'lba3_autoq_v3';   // (v3, LOOK-FIRST: three profiles; v2's settled entries pointed at profiles that are gone)
export const machineKey = ({ gpu = '?', battery = false, screen = '?', cpu = '' }) => `${gpu}|${battery ? 'battery' : 'mains'}|${screen}${cpu ? '|' + cpu : ''}`;

export const WINDOW = 1500, QUIET_AFTER = 1500, STALL_MS = 100, BREAK_MS = 250;
// the evaluation: at least EVAL_MS of counted play across EVAL_SCENES scenes (or EVAL_MAX in one); a step down after
// DOWN_RUN pressure windows in a row (or DOWN_OF of the last DOWN_IN); it passes with ≤ PASS_PRESSURE of its windows
// under pressure and ≤ PASS_MISS of all intervals missed; a step up needs UP_MIN of counted play over 2 scenes, every
// window ok or paced, and the model's prediction for the profile above ≤ UP_SHARE·B on both sides in every window
export const EVAL_MS = 60000, EVAL_SCENES = 2, EVAL_MAX = 120000, DOWN_RUN = 3, DOWN_OF = 4, DOWN_IN = 6;
export const PASS_PRESSURE = 0.1, PASS_MISS = 0.05, UP_MIN = 30000, UP_SHARE = 0.72;
// hold: a sustained real problem = over the last HOLD_SPAN of counted play, ≥ HOLD_PRESSURE of the windows under
// pressure and > HOLD_MISS of the intervals missed, the pressure seen in two scenes (or HOLD_ONE_SCENE in one scene);
// after a step, HOLD_COOL before another
export const HOLD_SPAN = 30000, HOLD_PRESSURE = 0.8, HOLD_MISS = 0.1, HOLD_ONE_SCENE = 60000, HOLD_COOL = 60000;
// the next start's try one profile up: when the held session had room for it in ≥ MARGIN_SHARE of ≥ MARGIN_MIN of play
export const MARGIN_MIN = 180000, MARGIN_SHARE = 0.9, UP_TRY_BLOCK = 3;
export const SETTLE_MS = 60000, CAL_MS = 1500, CAL_WAIT = 600;

const pct = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };

export class Governor {
  // opts: budget() → the frame budget in ms (16.7, or 33.3 under a 30 fps limit); onChange(info) → a queued step
  // (the game shows nothing yet); log: an array the decisions are pushed to
  constructor(opts = {}) {
    this.budget = opts.budget || (() => 1000 / 60);
    this.onChange = opts.onChange || (() => {});
    this.log = opts.log || [];
    this.p = 0; this.applied = 0; this.phase = 'evaluate'; this.enabled = true;
    this.win = null; this.quietUntil = 0; this.since = 0; this.windows = 0; this.gpuSeen = false;
    this.ev = null; this.hold = null; this.upUsed = false; this.lastStep = -1e9; this.room = { n: 0, ok: 0 };
    this.startEval(0, 'start');
  }
  // ---- where it stands: wanted (queued) and in force (applied at the last commit point)
  wanted() { return knobsAt(this.p); }
  knobs() { return knobsAt(this.applied); }
  pending() { return this.p !== this.applied ? ['profile'] : []; }
  label() { return describe(this.knobs()); }
  // the queued profile takes effect (the game compiles its programs now): returns what changed
  commit(why = 'scene change') {
    if (this.p === this.applied) return [];
    const from = this.applied; this.applied = this.p;
    const ch = [`${profileOf(from).name} → ${profileOf(this.p).name}`];
    this.note({ kind: 'commit', why, what: ch[0] });
    // (a fresh look at the profile now in force)
    if (this.phase === 'evaluate') this.resetEval();
    this.resetWin(this.since + QUIET_AFTER);
    return ch;
  }
  // put it somewhere (calibration, cache, power change, the benchmark); commitNow: in force at once (a commit point)
  setProfile(p, why, { phase = 'evaluate', commitNow = false, t = this.since, trial = false } = {}) {
    this.p = Math.max(0, Math.min(N_PROFILES - 1, p | 0));
    if (commitNow) this.applied = this.p;
    this.note({ kind: 'set', why, what: `${profileOf(this.p).name}${phase === 'hold' ? ' (held)' : ' (evaluating)'}` });
    if (phase === 'hold') this.lock('set', t); else this.startEval(t, why, trial);
  }
  startEval(t, why, trial = false) { this.phase = 'evaluate'; this.upUsed = trial; this.trial = trial ? { from: this.p } : null; this.ev = { t0: t, scenes: new Set(), ms: 0, w: [], why }; this.hold = null; this.resetWin(t); }
  resetEval() { if (this.ev) { this.ev.ms = 0; this.ev.w = []; } }
  lock(why, t = this.since) {
    this.phase = 'hold'; this.hold = { w: [], cool: t, since: t }; this.ev = null; this.room = { n: 0, ok: 0, ms: 0 };
    this.note({ kind: 'settled', why, what: `${profileOf(this.p).name} held` });
  }
  note(e) { e.t = Math.round(this.since); e.state = profileOf(this.applied).name; if (this.p !== this.applied) e.pending = profileOf(this.p).name; this.log.push(e); if (this.log.length > 400) this.log.splice(0, this.log.length - 400); }
  resetWin(until = 0) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null }; this.quietUntil = Math.max(this.quietUntil || 0, until); }

  // one displayed frame. f: { t: ms (a clock), ms: interval, cpu: the game's CPU work (ms), play: counted, scene: id }
  frame(f) {
    this.since = f.t;
    if (!this.enabled) return null;
    if (!f.play) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null }; this.quietUntil = Math.max(this.quietUntil, f.t + QUIET_AFTER); return null; }
    if (f.scene != null && f.scene !== this.scene) { this.scene = f.scene; this.sceneAt = f.t; }
    if (f.t < this.quietUntil) return null;
    if (f.ms > BREAK_MS) { this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null }; this.quietUntil = f.t + QUIET_AFTER; return null; }
    const W = this.win;
    if (W.t0 == null) W.t0 = f.t - f.ms;
    W.dur += f.ms;
    if (f.ms > STALL_MS) W.stalls++; else { W.f.push(f.ms); if (f.cpu != null) W.cpu.push(f.cpu); }
    if (W.dur < WINDOW) return null;
    this.win = { f: [], cpu: [], dur: 0, stalls: 0, miss: 0, t0: null };
    const w = this.classify(W, f.t);
    w.scene = this.scene;
    this.windows++; this.lastWindow = w;
    return this.phase === 'evaluate' ? this.evaluate(w, f.t) : this.held(w, f.t);
  }
  // the GPU's own time for a frame drawn at about time t (arrives a few frames late)
  gpu(t, ms) { (this.gpuBuf ??= []).push([t, ms]); this.gpuSeen = true; if (this.gpuBuf.length > 600) this.gpuBuf.splice(0, 300); }

  classify(W, t) {
    const B = this.budget(), n = W.f.length + W.stalls;
    const fps = (n * 1000) / Math.max(1, W.dur), p90 = pct(W.f, 0.9) ?? B, missN = W.f.filter((x) => x > 1.2 * B).length + W.stalls, miss = missN / Math.max(1, n);
    const cpu = pct(W.cpu, 0.9);
    const g = (this.gpuBuf || []).filter(([ts]) => ts >= W.t0 - 100 && ts <= t + 100).map((x) => x[1]);
    const gpu = g.length >= 8 ? pct(g, 0.9) : null;
    const want = (1000 / B) * (55 / 60), heavy = 0.75 * B;
    let kind;
    if (fps >= want && miss < 0.06) kind = 'ok';
    else if (gpu != null) kind = cpu <= heavy && gpu <= heavy ? 'paced' : gpu >= cpu ? 'gpu' : 'cpu';
    else kind = cpu > heavy ? 'cpu' : miss < 0.08 && p90 <= 1.17 * B ? 'paced' : 'gpu';
    return { t: Math.round(t), dur: W.dur, n, kind, fps: +fps.toFixed(1), p90: +p90.toFixed(1), miss: +miss.toFixed(3), missN, cpu: cpu == null ? null : +cpu.toFixed(1), gpu: gpu == null ? null : +gpu.toFixed(1), stalls: W.stalls };
  }
  why(ws) {
    if (!ws.length) return '';
    const f = (k) => (ws.every((x) => x[k] != null) ? Math.max(...ws.map((x) => x[k])) : null), n = ws.reduce((s, x) => s + x.n, 0), m = ws.reduce((s, x) => s + x.missN, 0);
    return `${(ws.reduce((s, x) => s + x.fps, 0) / ws.length).toFixed(1)} fps over ${(ws.reduce((s, x) => s + x.dur, 0) / 1000).toFixed(0)} s · frame p90 ≤ ${f('p90')} ms · CPU p90 ≤ ${f('cpu') ?? '?'} ms · GPU p90 ≤ ${f('gpu') ?? 'n/a'} ms · missed ${Math.round((100 * m) / Math.max(1, n))} %`;
  }
  // would the profile above fit? (the model, from every window given: both sides ≤ UP_SHARE·B)
  roomAbove(ws) {
    if (this.applied <= 0 || !ws.length) return false;
    const B = this.budget(), up = this.applied - 1;
    return ws.every((w) => (w.kind === 'ok' || w.kind === 'paced') && w.cpu != null && (w.cpu * costAt(up, 'cpu')) / costAt(this.applied, 'cpu') <= UP_SHARE * B
      && (w.gpu == null ? w.p90 <= 1.03 * B && w.miss < 0.02 : (w.gpu * costAt(up, 'gpu')) / costAt(this.applied, 'gpu') <= UP_SHARE * B));
  }
  // a step (queued: in force at the next commit point)
  step(dir, t, why) {
    const to = this.applied + dir;
    if (to < 0 || to >= N_PROFILES || this.p !== this.applied) return null;
    this.p = to; this.lastStep = t;
    const info = { kind: dir > 0 ? 'down' : 'up', what: `${profileOf(this.applied).name} → ${profileOf(to).name} (at the next scene change or menu)`, why, from: this.applied, to };
    this.note(info); this.onChange(info);
    return info;
  }
  evaluate(w, t) {
    const E = this.ev;
    if (this.p !== this.applied) return null;   // (a step is queued: the windows wait for the profile it brings)
    E.w.push(w); E.ms += w.dur; if (w.scene != null) E.scenes.add(w.scene);
    const pressure = (x) => x.kind === 'cpu' || x.kind === 'gpu';
    const L = E.w, last = L.slice(-DOWN_IN);
    // sustained pressure: one profile down (queued)
    if ((L.length >= DOWN_RUN && L.slice(-DOWN_RUN).every(pressure)) || last.filter(pressure).length >= DOWN_OF) {
      if (this.applied >= N_PROFILES - 1) { this.lock(`evaluation: pressure at the lowest profile (${this.why(last)})`, t); return null; }
      if (this.trial && this.applied === this.trial.from) { this.trial.failed = true; }
      return this.step(+1, t, `evaluation: ${last.filter(pressure)[0].kind.toUpperCase()} pressure: ${this.why(last)}`);
    }
    // room for the profile above: once per evaluation, never in a trial that is already one up
    if (!this.upUsed && E.ms >= UP_MIN && E.scenes.size >= EVAL_SCENES && this.roomAbove(L)) {
      this.upUsed = true;
      return this.step(-1, t, `evaluation: room for the profile above in every window: ${this.why(L)}`);
    }
    // the end of the evaluation
    if ((E.ms >= EVAL_MS && E.scenes.size >= EVAL_SCENES) || E.ms >= EVAL_MAX) {
      const pr = L.filter(pressure).length / L.length, n = L.reduce((s, x) => s + x.n, 0), m = L.reduce((s, x) => s + x.missN, 0);
      if (pr <= PASS_PRESSURE && m / Math.max(1, n) <= PASS_MISS) { this.lock(`evaluation passed: ${this.why(L)}`, t); return { kind: 'settled', p: this.p }; }
      if (this.applied >= N_PROFILES - 1) { this.lock(`evaluation: the lowest profile (${this.why(L)})`, t); return { kind: 'settled', p: this.p }; }
      return this.step(+1, t, `evaluation failed (${Math.round(pr * 100)} % of windows under pressure): ${this.why(L)}`);
    }
    return null;
  }
  held(w, t) {
    const H = this.hold;
    // the session's margin for the next start: room for the profile above in this window?
    this.room.ms += w.dur; this.room.n++; if (this.roomAbove([w])) this.room.ok++;
    if (this.p !== this.applied) return null;
    H.w.push(w);
    let ms = 0, k = H.w.length;
    while (k > 0 && ms < Math.max(HOLD_SPAN, HOLD_ONE_SCENE)) ms += H.w[--k].dur;
    H.w.splice(0, k);
    if (t - H.cool < HOLD_COOL) return null;
    // the last HOLD_SPAN (spanning a scene change) or HOLD_ONE_SCENE of play
    const span = (lim) => { const out = []; let s = 0; for (let i = H.w.length - 1; i >= 0 && s < lim; i--) { out.unshift(H.w[i]); s += H.w[i].dur; } return s >= lim ? out : null; };
    const bad = (ws) => { if (!ws) return false; const n = ws.reduce((s, x) => s + x.n, 0), m = ws.reduce((s, x) => s + x.missN, 0); return ws.filter((x) => x.kind === 'cpu' || x.kind === 'gpu').length / ws.length >= HOLD_PRESSURE && m / Math.max(1, n) > HOLD_MISS; };
    const a = span(HOLD_SPAN), b = span(HOLD_ONE_SCENE);
    const scenes = (ws) => new Set(ws.filter((x) => x.kind === 'cpu' || x.kind === 'gpu').map((x) => x.scene)).size;
    if ((bad(a) && scenes(a) >= 2) || bad(b)) {
      if (this.applied >= N_PROFILES - 1) { if (t - (this._floorNoted || -1e9) > 120000) { this._floorNoted = t; this.note({ kind: 'floor', why: `a sustained problem at the lowest profile: ${this.why(a || b)}` }); } return null; }
      H.cool = t; H.w = [];
      return this.step(+1, t, `held, but a sustained problem${bad(a) && scenes(a) >= 2 ? ' across scene changes' : ' for 60 s'}: ${this.why(a && bad(a) ? a : b)}`);
    }
    return null;
  }
  // the held session's room for the profile above (for the cache: the next start tries it)
  margin() { return this.phase === 'hold' && this.room.ms >= MARGIN_MIN && this.room.ok / Math.max(1, this.room.n) >= MARGIN_SHARE && this.applied > 0; }
  state() {
    return { p: this.p, applied: this.applied, phase: this.phase, knobs: this.knobs(), wanted: this.wanted(), pending: this.pending(), label: describe(this.knobs()).text, last: this.lastWindow || null, windows: this.windows, gpuTimer: this.gpuSeen,
      eval: this.ev ? { s: Math.round(this.ev.ms / 1000), scenes: this.ev.scenes.size, windows: this.ev.w.length } : null, margin: this.margin(), trial: this.trial || null };
  }
}

// Calibration on the title screen: frames measured for CAL_MS after CAL_WAIT; then estimate()
export class Calibration {
  constructor({ p0 = 0, budget = () => 1000 / 60 } = {}) { this.p0 = p0; this.budget = budget; this.t0 = null; this.f = []; this.cpu = []; this.g = []; this.done = false; this.result = null; }
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
    let est = estimate({ gpuMs, cpuMs, p0: this.p0, budget: this.budget() });
    // (no GPU timer: a title already missing refreshes with light CPU work is GPU-bound at the guess — one profile down)
    if (gpuMs == null && fMs > 1.2 * this.budget() && cpuMs < 0.75 * this.budget()) est = { p: Math.max(est.p, Math.min(N_PROFILES - 1, this.p0 + 1)) };
    this.result = { ...est, gpuMs: gpuMs == null ? null : +gpuMs.toFixed(2), cpuMs: cpuMs == null ? null : +cpuMs.toFixed(2), frameMs: fMs == null ? null : +fMs.toFixed(2), frames: this.f.length, gpuFrames: this.g.length, p0: this.p0 };
    return this.result;
  }
}
// one profile lower (dir −1: battery) or higher (+1: mains) — a power change without a cached profile for the new source
export const nextProfile = (p, dir = -1) => Math.max(0, Math.min(N_PROFILES - 1, p - dir));
