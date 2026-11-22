// PACE-ALL (the user, 22.11: "the most important thing is that it fits all kinds of screens"): an even frame pace on every
// display — 50, 59.9, 60, 75, 90, 100, 120, 144, 165, 240 Hz and variable-refresh screens, where requestAnimationFrame
// follows the maximum rate (the game treats them as that fixed rate: a frame is only ever drawn in a callback, so whole
// callbacks are the only even pace it can make, and VRR has nothing left to smooth). docs/lba-maturity/FPS30.md §12.
// Three parts, pure (no DOM), used by main.js loop and Auto (autoapply.js), tested without a browser (tests/autoquality.mjs):
//   refreshOf     the display's refresh interval from the last requestAnimationFrame intervals (every callback, skipped
//                 ones included), robust to the frames the game itself misses
//   limitRefreshes  how many refreshes a Frame Rate limit (30 / 60) draws a frame on, on this screen
//   EvenPace      Unlimited on a fast screen the game cannot fill: every 2nd refresh (or the smallest whole count that
//                 holds), evenly, and back to every refresh when there is room
//   paceBudgetMs  the frame budget Auto (and the automatic resolution) work to: the pace on this screen

// ---------------------------------------------------------------- the display's refresh
// The median of the last intervals is the refresh only while the game holds it: on the user's 100 Hz work computer
// (P101) Unlimited alternated 10 / 20 ms, and with more than half the intervals at 20 the median read 50 Hz. The refresh
// is the shortest interval that recurs: from the median down, a cluster of at least REFRESH_SHARE of the intervals (and
// at least 4) under 0.75 × the value found so far replaces it (the longer intervals are frames the game missed: whole
// refreshes). Intervals under REFRESH_MIN ms (> 333 Hz: two callbacks for one refresh) are not counted by the caller.
// A move to a faster screen shows in 5 callbacks (5 of 32 short intervals); to a slower one when fewer than 5 of the
// old intervals are left (28 callbacks: under half a second at 60 Hz).
export const REFRESH_N = 32, REFRESH_SHARE = 0.15, REFRESH_MIN = 3;
// a: the ring of intervals (length REFRESH_N), n: how many are filled (a[0..n)), s: a scratch Float32Array(REFRESH_N)
export function refreshOf(a, n, s) {
  if (!n) return 0;
  for (let i = 0; i < REFRESH_N; i++) s[i] = i < n ? a[i] : Infinity;
  s.sort();
  let hi = n, m = s[hi >> 1];
  const need = Math.max(4, Math.ceil(REFRESH_SHARE * n));
  for (let k = 0; k < 4; k++) {
    let c = 0; while (c < hi && s[c] < 0.75 * m) c++;
    if (c < need) break;
    hi = c; m = s[hi >> 1];
  }
  // (the mean of the intervals within 20 % of it: steadier than the median under timestamp jitter)
  let sum = 0, k = 0; for (let i = 0; i < n; i++) if (Math.abs(s[i] - m) <= 0.2 * m) { sum += s[i]; k++; }
  return k ? sum / k : m;
}
// The meter main.js feeds every callback's interval. A game that never makes a single refresh in Unlimited (every frame
// 2 or 3 refreshes on 144 Hz) shows no 1-refresh interval at all; nor does a browser that calls back only on drawn
// refreshes. So the shortest refresh read in the last MEM_MS (the title, a menu, a light scene, the skipped refreshes of a
// pace all show it) stands while what is read now is a whole multiple of it (2–6 ×, within 4 %): those are skipped
// refreshes, not a slower screen. A faster reading replaces it at once (a move to a faster screen); a reading that is no
// multiple (144 → 60 Hz) at once too; a multiple (120 → 60 Hz) when the memory is MEM_MS old — meanwhile the pace counts
// in refreshes of the old rate, which come out at the same drawn intervals (every 2nd 120 Hz refresh is every 60 Hz one).
export const MEM_MS = 20000;
export class RefreshMeter {
  constructor() { this.a = new Float32Array(REFRESH_N); this.s = new Float32Array(REFRESH_N); this.n = 0; this.k = 0; this.R = 0; this.mem = 0; this.memT = -1e9; }
  // d: the interval since the last callback (ms), t: the callback's timestamp; returns the refresh (ms, 0 until measured)
  push(d, t) {
    if (!(d >= REFRESH_MIN && d < 100)) return this.R;
    this.a[this.k] = d; this.k = (this.k + 1) % REFRESH_N; this.n = Math.min(REFRESH_N, this.n + 1);
    let r = refreshOf(this.a, this.n, this.s);
    const M = this.mem;
    if (!M || Math.abs(r - M) <= 0.04 * M) { this.mem = M ? M + (r - M) * 0.25 : r; this.memT = t; }
    else if (r < M) { this.mem = r; this.memT = t; }
    else {
      const k = Math.round(r / M);
      if (k >= 2 && k <= 6 && Math.abs(r - k * M) <= 0.04 * k * M && t - this.memT < MEM_MS) r = M;
      else { this.mem = r; this.memT = t; }
    }
    this.R = r;
    return r;
  }
}

// ---------------------------------------------------------------- a Frame Rate limit on whole refreshes
// P101 drew a limit on the nearest whole number of refreshes by interval (round(limit ms / refresh ms)). The rule now, by
// frame rate: of the two whole-refresh rates either side of the limit (F / a ≥ limit ≥ F / (a + 1), F the screen's rate),
// the nearer one; when they are about as near (within TIE × the limit), the faster one if it is no more than OVER over
// the limit, else the slower one. A limit at or above the screen's rate draws every refresh. (OVER is 22 %, not 20: 60 on
// 144 Hz — 72, exactly 20 % over — must not flip to 48 when the refresh is measured at 144.1 Hz; 30 on 75 Hz — 37.5,
// 25 % over — stays out. No listed rate sits near either edge: tests/autoquality.mjs moves each by ±0.5 %.)
//   limit 30: 50 Hz 25 · 59.9 29.95 · 60 30 · 75 25 · 90 30 · 100 33.3 · 120 30 · 144 28.8 · 165 33 · 240 30
//   limit 60: 50 / 59.9 / 60 every refresh · 75 75 · 90 45 · 100 50 · 120 60 · 144 72 · 165 55 · 240 60
// (P101's interval rule gave the same except 30 on 165 Hz: 27.5, an exact tie in milliseconds that rounded to the
// slower rate; 33 is as near and keeps 30's "at least as fluid"). 60 on 90 Hz is 45, not 90: the limit is a promise of
// at most about 60 (less work, a cooler laptop), 90 would be 50 % over it, and 45 is the nearer steady rate; Unlimited
// draws 90.
export const TIE = 0.1, OVER = 1.22;
export function limitRefreshes(capMs, refreshMs) {
  if (!(capMs > 0) || !(refreshMs > 0)) return 1;
  const F = 1000 / refreshMs, L = 1000 / capMs, x = F / L;
  if (x <= 1) return 1;
  const a = Math.max(1, Math.floor(x + 1e-4)), b = a + 1;
  const da = F / a - L, db = L - F / b;
  if (da <= 1e-3 * L) return a;   // (a whole multiple: 30 on 60 / 120 / 240 Hz)
  if (Math.abs(da - db) <= TIE * L) return F / a <= OVER * L + 1e-6 ? a : b;
  return da < db ? a : b;
}

// ---------------------------------------------------------------- Unlimited's even pace
// Unlimited ("Draws as often as the screen allows") on a screen faster than ~70 Hz that the game cannot fill: the P101
// benchmark's Citadel street on the user's 100 Hz work computer ran 76 fps GPU-bound near 10 ms, every interval 10 or 20
// ms (229 frames ≥ 1.5 × the pace in one route) — an uneven picture although the average is high. EvenPace then draws
// every n-th refresh (main.js loop skips the others exactly as under a limit), evenly; when there is clear room again,
// every refresh. Windows of WIN ms of counted play (play and dialogue only: no menus, scene changes, loading, pause, a
// hidden or unfocused window, the benchmark or the tests' fixed stepping; an interval over max(STALL_MS, 4 × the pace)
// — a compile, an upload, a GC — is left out, one over BREAK_MS starts the window again).
//   engage   at every refresh, ENGAGE_RUN windows in a row with ≥ MISS_ON of the intervals ≥ 1.5 refreshes, or the GPU's
//            p90 (a reading not taken after a keep-alive mark) past the refresh. n: the smallest whole count ≥ 2 whose
//            interval holds the frame's need (the mean interval, the CPU p90, the GPU p90) within FIT; only if that rate
//            is ≥ MIN_FPS, or ≥ KEEP × the rate the game delivers now (on 75 Hz every 2nd refresh is 37.5 fps: only for a
//            game already under ~47 there). Never on a screen of ≤ MIN_HZ (60 Hz: every refresh is the target, Auto
//            handles quality).
//   deeper   paced, ENGAGE_RUN windows with ≥ MISS_ON of the intervals ≥ n + ½ refreshes: n + 1 (if allowed).
//   release  by a probe: after COOL ms paced (doubling after each failed probe, up to COOL_MAX; back to COOL at a scene
//            change, the probe 2 s after it) and only while the CPU p90 is ≤ ROOM × the faster pace, one PROBE_WIN window
//            at n − 1. It stays there when < MISS_OFF of its intervals miss and the CPU and GPU p90 are ≤ PROBE_FIT × that
//            pace; otherwise back to n. (While paced, the GPU timer reads after keep-alive marks — main.js _keepAlive, the
//            1 px change on each skipped refresh — and such a reading can be inflated (GPU-TIMER-KA): only the probe's own,
//            mark-free readings decide.) A pace taken again within QUICK ms of a release counts as a failed probe.
// Hysteresis: in at ≥ 15 % misses for 2 s, out only at < 5 % with the work p90 ≤ 85 % of the refresh; probes at most
// every 8 s, then 16, 32 … 120 s.
export const PACE = {
  MIN_HZ: 70, MIN_FPS: 45, KEEP: 0.8, WIN: 1000, PROBE_WIN: 600, ENGAGE_RUN: 2, MISS_ON: 0.15, MISS_OFF: 0.05, FIT: 0.9,
  ROOM: 0.7, PROBE_FIT: 0.85, COOL: 8000, COOL_MAX: 120000, SCENE_PROBE: 2000, QUICK: 5000, STALL_MS: 50, BREAK_MS: 250, MAX_N: 6,
};
const pct = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };

export class EvenPace {
  constructor(opts = {}) {
    this.P = { ...PACE, ...opts };
    this.log = [];
    this.onChange = null;   // (n, why) → the game: Auto's window starts again, Settings' hint
    this.n = 1; this.R0 = 0;
    this.reset('start');
  }
  reset(why) {
    const was = this.n;
    this.n = 1; this.probe = null; this.streak = 0; this.cool = 0; this.backoff = this.P.COOL; this.releasedAt = -1e9; this.denied = false;
    this.win = this.fresh(); this.gq = [];
    if (was !== 1) this.change(1, why || 'reset');
  }
  fresh() { return { iv: [], cpu: [], dur: 0, t0: null }; }
  note(e) { this.log.push(e); if (this.log.length > 100) this.log.splice(0, this.log.length - 100); }
  change(n, why, t = this.t || 0) { const from = this.n; this.n = n; this.note({ t: Math.round(t), from, to: n, why }); this.onChange?.(n, why, from); }
  // the refresh this pace counts in (ms); the live estimate R. A refresh that is a whole multiple of R0 (k ≤ n) while paced
  // is the same screen with callbacks merged (the browser calling back only on drawn refreshes): kept, so the pace does not
  // compound; anything else is a new screen — the pace starts over at every refresh.
  refresh(R) {
    if (!(R > 0)) return;
    if (!this.R0) { this.R0 = R; return; }
    for (let k = 1; k <= Math.max(1, this.n); k++) if (Math.abs(R - k * this.R0) <= 0.08 * k * this.R0) { if (k === 1) this.R0 += (R - this.R0) * 0.25; return; }
    const was = this.R0; this.R0 = R;
    this.reset(`display refresh ${(1000 / was).toFixed(1)} → ${(1000 / R).toFixed(1)} Hz`);
  }
  hz() { return this.R0 ? 1000 / this.R0 : 0; }
  // a GPU reading (ms) for a frame drawn at about time t; ka: taken after a keep-alive mark
  gpu(t, ms, ka = false) { this.gq.push([t, ms, !!ka]); if (this.gq.length > 400) this.gq.splice(0, 200); }
  // may the game pace at n refreshes here? (the rate floor; `fps` what it delivers now)
  allowed(n, fps) { const f = this.hz() / n; return n <= this.P.MAX_N && (f >= this.P.MIN_FPS - 0.01 || (fps > 0 && f >= this.P.KEEP * fps)); }
  // one drawn frame in Unlimited. t: ms (the rAF clock), iv: ms since the last drawn frame, cpu: its CPU work (ms, or
  // null), count: counted play (see above), scene: an id (a change brings the probe forward). (Arguments, not an object:
  // called on every drawn frame, GC-STREET)
  frame(t, iv, cpu = null, count = true, scene = null) {
    this.t = t;
    const P = this.P, R = this.R0;
    if (!R || this.hz() <= P.MIN_HZ) { if (this.n !== 1) this.reset(`a ${this.hz().toFixed(0)} Hz screen: every refresh`); this.win = this.fresh(); return null; }
    if (scene != null && scene !== this.scene) {
      if (this.scene != null && this.n > 1 && !this.probe) { this.backoff = P.COOL; this.cool = Math.min(this.cool, t + P.SCENE_PROBE); }
      this.scene = scene;
    }
    if (!count || iv > P.BREAK_MS) { this.win = this.fresh(); return null; }
    const W = this.win;
    if (W.t0 == null) W.t0 = t - iv;
    W.dur += iv;
    if (iv <= Math.max(P.STALL_MS, 4 * this.n * R)) { W.iv.push(iv); if (cpu != null) W.cpu.push(cpu); }
    if (W.dur < (this.probe ? P.PROBE_WIN : P.WIN)) return null;
    this.win = this.fresh();
    if (W.iv.length < 5) return null;
    return this.judge(W, t);
  }
  stats(W, t) {
    const R = this.R0, n = this.n, iv = W.iv, sum = iv.reduce((s, x) => s + x, 0);
    const g = this.gq.filter(([ts, , ka]) => ts >= W.t0 - 50 && ts <= t + 50 && !ka).map((x) => x[1]);
    this.gq = this.gq.filter(([ts]) => ts > t - 2000);
    return { fps: (1000 * iv.length) / Math.max(1, sum), mean: sum / iv.length, miss: iv.filter((x) => x >= (n + 0.5) * R).length / iv.length,
      cpu: pct(W.cpu, 0.9), gpu: g.length >= 8 ? pct(g, 0.9) : null };
  }
  judge(W, t) {
    const P = this.P, R = this.R0, S = this.stats(W, t), n = this.n;
    const work = Math.max(S.cpu ?? 0, S.gpu ?? 0);
    this.last = { t: Math.round(t), n, fps: +S.fps.toFixed(1), miss: +S.miss.toFixed(3), cpu: S.cpu == null ? null : +S.cpu.toFixed(1), gpu: S.gpu == null ? null : +S.gpu.toFixed(1) };
    if (this.probe) {
      const Pr = this.probe; this.probe = null;
      if (S.miss < P.MISS_OFF && work <= P.PROBE_FIT * n * R) { this.backoff = P.COOL; this.releasedAt = t; this.streak = 0; this.cool = t + P.COOL; this.note({ t: Math.round(t), probe: 'held', at: n, ...this.last }); return { kind: 'release', n }; }
      this.backoff = Math.min(P.COOL_MAX, this.backoff * 2); this.cool = t + this.backoff;
      this.change(Pr.from, `probe at ${n === 1 ? 'every refresh' : `every ${n} refreshes`} missed (${Math.round(100 * S.miss)} % ≥ 1.5 refreshes, work p90 ${work.toFixed(1)} ms): back to every ${Pr.from}; next probe in ${Math.round(this.backoff / 1000)} s`, t);
      return { kind: 'back', n: this.n };
    }
    const over = S.miss >= P.MISS_ON || (n === 1 && S.gpu != null && S.gpu > R);
    this.streak = over ? this.streak + 1 : 0;
    if (this.streak >= P.ENGAGE_RUN) {
      this.streak = 0;
      // (the mean interval overstates the frame's own time — every interval is whole refreshes — so it is taken as is; the
      //  CPU and GPU p90 are the frame's own time and want FIT's margin)
      const need = Math.max(S.mean * P.FIT, S.cpu ?? 0, S.gpu ?? 0);
      let m = Math.max(n + 1, 2); while (m < P.MAX_N && m * R * P.FIT < need) m++;
      if (!this.allowed(m, S.fps)) { if (!this.denied) { this.denied = true; this.note({ t: Math.round(t), denied: m, why: `every ${m} refreshes would be ${(this.hz() / m).toFixed(1)} fps: under ${P.MIN_FPS} and under ${Math.round(P.KEEP * 100)} % of the ${S.fps.toFixed(0)} fps drawn now` }); } return null; }
      this.denied = false;
      if (n === 1 && t - this.releasedAt < P.QUICK) this.backoff = Math.min(P.COOL_MAX, this.backoff * 2);
      this.cool = t + this.backoff;
      this.change(m, `${Math.round(100 * S.miss)} % of intervals ≥ ${n === 1 ? '1.5 refreshes' : `${n + 0.5} refreshes`} (${S.fps.toFixed(0)} fps drawn, need ~${need.toFixed(1)} ms${S.gpu != null ? `, GPU p90 ${S.gpu.toFixed(1)}` : ''}): every ${m} refreshes, ${(this.hz() / m).toFixed(1)} fps`, t);
      return { kind: 'pace', n: m };
    }
    // paced: a probe one step faster when the cooldown is over and the CPU has room for it
    if (n > 1 && t >= this.cool && (S.cpu == null || S.cpu <= P.ROOM * (n - 1) * R) && (S.gpu == null || S.gpu <= P.ROOM * (n - 1) * R)) {
      this.probe = { from: n, at: t };
      this.change(n - 1, `probe: ${n - 1 === 1 ? 'every refresh' : `every ${n - 1} refreshes`} for ${P.PROBE_WIN / 1000} s (CPU p90 ${S.cpu == null ? '?' : S.cpu.toFixed(1)} ms)`, t);
      return { kind: 'probe', n: this.n };
    }
    return null;
  }
  // for the benchmark's report and Settings
  state() { return { n: this.n, hz: +this.hz().toFixed(1), fps: this.n > 1 ? +(this.hz() / this.n).toFixed(1) : null, probe: !!this.probe, coolS: this.n > 1 ? Math.max(0, Math.round((this.cool - (this.t || 0)) / 1000)) : 0, last: this.last || null, log: this.log.slice(-8) }; }
}

// ---------------------------------------------------------------- the budget Auto works to
// The time one drawn frame has on this screen: under a limit its whole-refresh interval (the limit's own when the rate on
// this screen is within 1 fps of it: 30 on 60 Hz is 33.33 ms); Unlimited, one refresh, or EvenPace's n refreshes while it
// paces. Never under 60's 16.67 ms (a screen within 1 fps of 60 counts as 60): Auto does not drop quality to chase 75,
// 100 or 144 Hz (the user: no lower image than Auto already gives); on those screens the even pace above is the answer
// when the game cannot fill every refresh — the sharper profile at an even half rate rather than a lower one at the full
// rate. Before, the budget was the limit's (30 → 33.3) or 16.67: P101's 60 on a 90 Hz screen (45 fps, 22.2 ms frames) and
// 30 on 75 Hz (25 fps) then read as missed frames and could walk Auto down for a pace the limit chose.
export function paceBudgetMs(capMs, refreshMs, nAdapt = 1) {
  const R = refreshMs > 0 && refreshMs < 100 ? refreshMs : 1000 / 60, B60 = 1000 / 60;
  if (capMs > 0) {
    const n = limitRefreshes(capMs, R), f = 1000 / (n * R);
    return Math.max(B60, Math.abs(f - 1000 / capMs) <= 1 ? capMs : n * R);
  }
  const one = 1000 / R >= 59 ? B60 : R;
  return Math.max(B60, nAdapt > 1 ? nAdapt * R : one);
}
