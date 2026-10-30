// Frame-time instrumentation. Every displayed frame records: the real interval since the last one, the
// simulation steps it took, the time left out (beyond the catch-up limit), CPU time in the simulation and in
// render() (CPU side only: GPU time is not measured), and the draw calls / triangles of the frame.
//   game.perf.stats()  → percentiles over the last N frames
//   ?perf or F9        → a small overlay
const N = 1200; // (FRAME-1: the benchmark's 6 s window at up to 200 Hz)

// The graphics preset a first start picks from the GPU the browser reports (ANGLE's renderer string):
//   Low    older integrated GPUs and phones: Vega 3–11 (Ryzen 2000–4000 APUs), Intel HD / UHD, Mali, Adreno, PowerVR
//   Medium newer integrated GPUs: Intel Iris (Xe), "AMD Radeon(TM) Graphics" (Ryzen 5000+ APUs, incl. 680M/780M)
//   High   everything else (discrete GPUs, Apple silicon, software renderers: the automated tests keep High)
export function gpuQuality(gpu = '') {
  // a software renderer (no usable GPU driver): Low for a player; the automated tests (navigator.webdriver) keep High
  if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu)) return typeof navigator !== 'undefined' && navigator.webdriver ? 'high' : 'low';
  if (/Vega \d|Radeon Vega|Radeon\(TM\) Vega|Intel\(R\) HD|\bHD Graphics|UHD Graphics|Mali|Adreno|PowerVR|GMA/i.test(gpu)) return 'low';
  if (/Iris|Radeon\(TM\) Graphics|Radeon Graphics|Intel/i.test(gpu)) return 'medium';
  return 'high';
}
// AUTO-FIT: a GPU that shares the computer's memory and power (Intel, AMD APUs, phone GPUs) or a software renderer:
// on a high-density screen its presets draw fewer pixels (renderer.js basePixelRatio). Apple's own GPUs are left out.
export const integratedGpu = (gpu = '') => /Intel|Vega|Radeon\(TM\) Graphics|Radeon Graphics|Mali|Adreno|PowerVR|GMA|SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu) && !/Apple/i.test(gpu);
// the old rule (before 0.30): any integrated GPU started on Medium
export const oldGpuQuality = (gpu = '') => (/Intel|UHD|Iris|Radeon\(TM\) Graphics|Radeon Vega|Vega \d|Mali|Adreno|PowerVR/i.test(gpu) ? 'medium' : 'high');

export class Perf {
  constructor(renderer) {
    this.r = renderer;
    this.buf = [];
    this.i = 0;
    this.el = null;
    this.uiT = 0;
    if (renderer) renderer.info.autoReset = false; // the composer renders several passes per frame: count them all
    // What the GPU receives (PERF-2). renderer.info counts a BatchedMesh drawn with WEBGL_multi_draw as one call,
    // but the driver still gets one draw per instance group (ANGLE on D3D11 loops over them); and the shadow pass is
    // counted with the main one. Per frame: `shadow` calls of the shadow pass, `sub` extra draws inside multi-draws.
    this.shadow = 0; this.sub = 0;
    if (renderer?.renderBufferDirect) {
      const orig = renderer.renderBufferDirect.bind(renderer), multi = !!renderer.extensions?.has?.('WEBGL_multi_draw');
      this.multiDraw = multi;
      renderer.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
        if (scene === null) this.shadow++;
        if (multi && object.isBatchedMesh && object._multiDrawCount > 1) this.sub += object._multiDrawCount - 1;
        return orig(camera, scene, geometry, material, object, group);
      };
    }
    // (PERF-CPU) what the frame sends to the GPU besides draws: buffer and texture uploads (calls and bytes). In Chrome
    // each is copied through the GPU process; on the user's battery runs the frame callback starts 6–13 ms late
    // ("callback late": the GPU process still busy with the last frame), so its work per frame is reported per route.
    this.up = 0; this.upB = 0;
    try {
      const gl = renderer.getContext(), self = this;
      for (const fn of ['bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D']) {
        const f = gl[fn]; if (typeof f !== 'function') continue;
        gl[fn] = function (...a) { self.up++; for (const x of a) if (x && typeof x === 'object' && 'byteLength' in x) { self.upB += x.byteLength; break; } else if (x && x.width && x.height && !('byteLength' in x)) { self.upB += x.width * x.height * 4; break; } return f.apply(this, a); };
      }
    } catch { /* (no context: tests) */ }
    // (STABILIZATION: render targets alive — every target the renderer has drawn into, until it is disposed)
    this.targets = new Set();
    if (renderer?.setRenderTarget) {
      const srt = renderer.setRenderTarget.bind(renderer), T = this.targets;
      renderer.setRenderTarget = (t, ...a) => { if (t && !T.has(t) && t.addEventListener) { T.add(t); t.addEventListener('dispose', function gone() { T.delete(t); t.removeEventListener('dispose', gone); }); } return srt(t, ...a); };
    }
    // which GPU is drawing (a software renderer here explains a slow game)
    try {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      this.gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).replace(/^ANGLE \((.*)\)$/, '$1');
    } catch { this.gpu = '?'; }
    // (RENDER-INV) the GPU's own time per frame, where the browser offers a timer query (see GpuTimer)
    try { this.gpuTimer = renderer ? GpuTimer.make(renderer.getContext()) : null; } catch { this.gpuTimer = null; }
  }
  beginFrame() { this.t0 = performance.now(); if (this.r) this.r.info.reset(); this.shadow = 0; this.sub = 0; this.up = 0; this.upB = 0; this.sec?.begin(); }
  record(f) {
    const info = this.r?.info.render;
    f.calls = info?.calls ?? 0; f.tris = info?.triangles ?? 0; f.shadowCalls = this.shadow; f.draws = f.calls + this.sub; f.up = this.up; f.upKB = this.upB / 1024;
    f.end = this.t0;   // (the frame's interval ended as this frame began: loafIn(f.end, f.ms))
    if (this.tag != null) f.tag = this.tag;   // (ROTATE-STALL: a benchmark route's label for the frame — the sweep's view heading)
    if (this.sec) f.sec = this.sec.take(f);   // (STABILIZATION: the frame's CPU by section, while the benchmark measures)
    f.raf = REG.raf.perFrame; REG.raf.perFrame = 0;   // (rAF callbacks requested since the last frame: 1 is the game's loop)
    this.onRecord?.(f);   // (STABILIZATION: the benchmark's visits keep every frame of a phase, past the ring's 1200)
    if (this.buf.length < N) this.buf.push(f); else this.buf[this.i] = f;
    this.i = (this.i + 1) % N;
    if (this.el && (this.uiT += f.real) > 0.25) { this.uiT = 0; this.draw(); }
  }
  reset() { this.buf = []; this.i = 0; this.gpuTimer?.reset(); }
  stats(last = N) {
    const b = this.buf.length < N ? this.buf.slice(-last) : [...this.buf.slice(this.i), ...this.buf.slice(0, this.i)].slice(-last);
    if (!b.length) return null;
    const pct = (k, p) => { const v = b.map((f) => f[k]).sort((x, y) => x - y); return +v[Math.min(v.length - 1, Math.floor(p * v.length))].toFixed(2); };
    const sum = (k) => b.reduce((s, f) => s + f[k], 0);
    const real = sum('real');
    return {
      frames: b.length,
      fps: +(b.length / Math.max(real, 1e-6)).toFixed(1),
      frameMs: { p50: pct('ms', 0.5), p95: pct('ms', 0.95), p99: pct('ms', 0.99), max: pct('ms', 1) },
      simMs: { p50: pct('sim', 0.5), p95: pct('sim', 0.95) },
      renderMs: { p50: pct('render', 0.5), p95: pct('render', 0.95) },
      steps: { mean: +(sum('steps') / b.length).toFixed(2), max: Math.max(...b.map((f) => f.steps)) },
      lostS: +sum('lost').toFixed(3), // real time not simulated (stalls beyond the catch-up limit)
      calls: pct('calls', 0.5), tris: pct('tris', 0.5),
      // (the calls' 95th percentile: a turning camera's heavy views; GPU-level draws; the shadow pass's share)
      callsP95: pct('calls', 0.95), draws: pct('draws', 0.5), shadowCalls: pct('shadowCalls', 0.5),
      gpuMs: this.gpuTimer?.stats() ?? null,   // (null: no timer query in this browser)
      cpu: sectionStats(b),   // (STABILIZATION: CPU per frame by section, when the benchmark measured them; else null)
      rafPerFrame: b[0]?.raf != null ? pct('raf', 0.5) : null,
      lamps: b[0]?.lamps != null ? pct('lamps', 0.5) : null,
      // (PERF-HIGH: frame pacing) intervals by how they relate to a 60 Hz refresh (16.7 ms): on it (≤ 17.2), a little
      // slower (17.2–20: neither on the refresh nor a missed one), longer; how late the frame callback ran; the game's
      // own CPU work (simulation + render submission) per frame; frames drawn while the window was in the background
      pace: { on: b.filter((f) => f.ms <= 17.2).length, slow: b.filter((f) => f.ms > 17.2 && f.ms <= 20).length, long: b.filter((f) => f.ms > 20).length,
        lag: b[0]?.lag != null ? pct('lag', 0.5) : null, work: +[...b.map((f) => f.sim + f.render)].sort((x, y) => x - y)[Math.floor(b.length / 2)].toFixed(2),
        workP95: +[...b.map((f) => f.sim + f.render)].sort((x, y) => x - y)[Math.min(b.length - 1, Math.floor(b.length * 0.95))].toFixed(2), bg: b.filter((f) => f.bg).length,
        lagP95: b[0]?.lag != null ? pct('lag', 0.95) : null, up: b[0]?.up != null ? pct('up', 0.5) : null, upKB: b[0]?.upKB != null ? pct('upKB', 0.5) : null, upKBp95: b[0]?.upKB != null ? pct('upKB', 0.95) : null },   // (lamps lit by the light pool: each one is lighting math on the pixels it reaches)
    };
  }
  overlay(on = !this.el) {
    if (!on) { this.el?.remove(); this.el = null; return; }
    this.el = document.createElement('pre');
    this.el.id = 'perf';
    this.el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;margin:0;padding:6px 8px;font:12px/1.35 monospace;color:#dfe;background:rgba(0,0,0,.6);pointer-events:none;white-space:pre';
    document.body.appendChild(this.el);
    this.draw();
  }
  draw() {
    const s = this.stats(120);
    if (!this.el || !s) return;
    this.el.textContent = `${s.fps} fps   frame p50 ${s.frameMs.p50} · p95 ${s.frameMs.p95} · max ${s.frameMs.max} ms\n`
      + `sim ${s.simMs.p50} ms · render (CPU) ${s.renderMs.p50} ms · steps ${s.steps.mean}/${s.steps.max}\n`
      + `draw calls ${s.calls} · triangles ${(s.tris / 1000).toFixed(0)}k${s.lostS ? ` · lost ${s.lostS}s` : ''}\n`
      + `pixel ratio ${(this.game?.renderer?.pixelRatio?.() ?? this.r?.getPixelRatio?.())?.toFixed(2)}${this.game?.renderer?.autoRes ? ` (auto ×${this.game.renderer.effScale()})` : ''} · ${this.game?.settings?.quality ?? ''}\n`
      + `${this.gpu}${this.load ? `\nstartup: build ${(this.load.total / 1000).toFixed(1)} s · shaders ${(this.load.shaders / 1000).toFixed(1)} s` : ''}`;
  }
}

// RENDER-INV: the GPU's execution time of each frame's render (all passes), from EXT_disjoint_timer_query_webgl2
// where the browser exposes it (Chrome hides it on some systems; then none: the report says so). Results arrive a
// few frames later; a frame the driver marks "disjoint" (a power state change, another program) is dropped. This
// is the number that tells a GPU-bound frame (pixels, shadows, MSAA) from a CPU-bound one (draw calls, simulation).
export class GpuTimer {
  static make(gl) { const ext = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2'); return ext ? new GpuTimer(gl, ext) : null; }
  constructor(gl, ext) { this.gl = gl; this.ext = ext; this.free = []; this.frames = []; this.f = null; this.cur = null; this.ms = []; this.pass = new Map(); }
  // a frame's time is measured pass by pass (queries can't nest): mark(label) closes the running query and opens one
  // for `label`; the frame's total is their sum. Labels: shadow map, scene (main view), bloom, output, fxaa, retro.
  // (AUTO-QUALITY: in play the governor reads every `stride`-th frame (onFrame(ms) as each result comes in); the
  //  benchmark measures every frame)
  begin(label = 'scene') {
    if (this.f || this.frames.length > 6) return;
    if (this.stride > 1 && ((this.k = (this.k || 0) + 1) % this.stride)) return;
    this.f = { q: [], tag: this.tag ?? null }; this.mark(label);   // (ROTATE-STALL: tag, the frame's label, set by a benchmark route)
  }
  mark(label) {
    const gl = this.gl; if (!this.f) return;
    if (this.cur) { gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.cur = null; }
    const q = this.free.pop() || gl.createQuery(); if (!q) return;
    gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q); this.cur = q; this.f.q.push([label, q]);
  }
  end() {
    const gl = this.gl;
    if (this.f) {
      if (this.cur) { gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.cur = null; }
      this.frames.push(this.f); this.f = null;
    }
    // (results are collected on every frame, also one that started no query: a GPU running more than 6 frames behind
    //  would otherwise never be asked again)
    const ready = (F) => F.q.every(([, q]) => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE));
    if (!this.frames.length || !ready(this.frames[0])) return;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.frames.length && ready(this.frames[0])) {
      const F = this.frames.shift(), by = {};
      let tot = 0;
      for (const [label, q] of F.q) { const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; by[label] = (by[label] || 0) + ms; tot += ms; this.free.push(q); }
      if (disjoint) { this.disjoint = (this.disjoint || 0) + 1; continue; }   // (PERF-HIGH: counted: a GPU power-state change)
      this.onFrame?.(tot);
      this.ms.push(tot); if (this.ms.length > 1200) this.ms.shift();
      if (F.tag != null) { const T = (this.tags ??= new Map()); let a = T.get(F.tag); if (!a) T.set(F.tag, (a = [])); a.push(tot); if (a.length > 600) a.shift(); }
      for (const [label, ms] of Object.entries(by)) { let a = this.pass.get(label); if (!a) this.pass.set(label, (a = [])); a.push(ms); if (a.length > 1200) a.shift(); }
    }
  }
  reset() { this.ms.length = 0; this.pass.clear(); this.disjoint = 0; this.tags?.clear(); }
  stats() {
    if (!this.ms.length) return null;
    const pc = (a, k) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.min(v.length - 1, Math.floor(k * v.length))].toFixed(2); };
    return { p50: pc(this.ms, 0.5), p95: pc(this.ms, 0.95), n: this.ms.length, disjoint: this.disjoint || 0, passes: Object.fromEntries([...this.pass].map(([l, a]) => [l, pc(a, 0.5)])) };
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// STABILIZATION, phase 1 (docs/lba3-performance/STABILIZATION.md): what the game registers with the browser, the frame's
// CPU by section, and a resource snapshot. Exact counts here; milliseconds are the machine's.
//
// 1. Registrations. requestAnimationFrame, setTimeout / setInterval and addEventListener are counted from the moment
//    this module loads (it is imported near the top of main.js, before the game is built): callbacks pending, timers
//    and intervals alive, listeners alive per target kind and event type (a listener added twice to the same target is
//    one, as the browser counts it). A transition that leaves a listener, a timer or a second loop behind shows as
//    growth between two snapshots. The wrappers pass everything through unchanged.
export const REG = { raf: { pending: new Set(), req: 0, perFrame: 0 }, timeouts: new Set(), intervals: new Set(), listeners: new WeakMap(), live: new Map(), added: 0, removed: 0 };
const kindOf = (t) => { try { if (typeof window !== 'undefined' && t === window) return 'window'; if (typeof document !== 'undefined' && t === document) return 'document'; if (t?.tagName) return t.tagName.toLowerCase() + (t.id ? '#' + t.id : ''); return t?.constructor?.name || '?'; } catch { return '?'; } };
(function hooks() {
  if (typeof window === 'undefined' || window.__lbaRegHooks) return;
  window.__lbaRegHooks = true;
  const W = window, raf = W.requestAnimationFrame?.bind(W), caf = W.cancelAnimationFrame?.bind(W);
  W.__lbaRaf = raf;   // (the browser's own, for the start trace below: not counted as the game's)
  if (raf) {
    // (callbacks are passed to the browser as they are, never wrapped: the browser's long-animation-frame entries name the
    //  game's own function, not a wrapper; so pending rAF callbacks and timeouts are not tracked, only how many are asked)
    W.requestAnimationFrame = (cb) => { REG.raf.req++; REG.raf.perFrame++; return raf(cb); };
    if (caf) W.cancelAnimationFrame = (id) => caf(id);
  }
  const st = W.setTimeout.bind(W), ct = W.clearTimeout.bind(W), si = W.setInterval.bind(W), ci = W.clearInterval.bind(W);
  W.setTimeout = (fn, ms, ...a) => { REG.timeoutsSet = (REG.timeoutsSet || 0) + 1; return st(fn, ms, ...a); };
  W.clearTimeout = (id) => ct(id);
  W.setInterval = (fn, ms, ...a) => { const id = si(fn, ms, ...a); REG.intervals.add(id); return id; };
  W.clearInterval = (id) => { REG.intervals.delete(id); return ci(id); };
  const ET = W.EventTarget?.prototype; if (!ET) return;
  const add = ET.addEventListener, rem = ET.removeEventListener;
  const cap = (o) => (typeof o === 'boolean' ? o : !!o?.capture);
  const drop = (t, k, fn, type) => { const S = REG.listeners.get(t)?.get(k); if (S?.delete(fn)) { REG.removed++; const lk = kindOf(t) + ' ' + type; REG.live.set(lk, (REG.live.get(lk) || 1) - 1); } };
  ET.addEventListener = function (type, fn, opts) {
    try {
      if (fn) {
        let M = REG.listeners.get(this); if (!M) REG.listeners.set(this, (M = new Map()));
        const k = type + (cap(opts) ? '|c' : ''); let S = M.get(k); if (!S) M.set(k, (S = new Set()));
        if (!S.has(fn)) {
          S.add(fn); REG.added++; const lk = kindOf(this) + ' ' + type; REG.live.set(lk, (REG.live.get(lk) || 0) + 1);
          // (a { once } listener leaves by itself after its call)
          if (opts?.once) { const self = this; add.call(this, type, () => drop(self, k, fn, type), { once: true, capture: cap(opts) }); }
        }
      }
    } catch { /* counting only */ }
    return add.call(this, type, fn, opts);
  };
  ET.removeEventListener = function (type, fn, opts) {
    try { drop(this, type + (cap(opts) ? '|c' : ''), fn, type); } catch { /* counting only */ }
    return rem.call(this, type, fn, opts);
  };
})();
export function registrations() {
  const L = [...REG.live].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return { rafPending: '-', rafRequested: REG.raf.req, timeouts: REG.timeoutsSet || 0, intervals: REG.intervals.size, listeners: L.reduce((s, [, n]) => s + n, 0), listenersByKind: Object.fromEntries(L) };
}

// 2. CPU by section. While on (the benchmark), the game's main entry points are timed EXCLUSIVELY (a section nested in
//    another — physics inside a person's update, the shadow pass inside the scene pass — counts only in the inner one),
//    with their call counts. Sections: people/AI, hero, enemies, physics, interaction lookup, camera, other sim; submit:
//    culls and world matrices ("submit other"), main pass, shadow pass, post. "other sim" is the frame's simulation
//    without the named sim sections. Each timer costs two clock reads: a few hundred a frame.
const now = () => performance.now();
const SIM_KEYS = ['people', 'hero', 'enemies', 'physics', 'interact', 'camera'];
export class Sections {
  constructor() { this.acc = {}; this.n = {}; this.stack = []; this.t = 0; this.undo = []; }
  begin() { this.acc = {}; this.n = {}; this.stack.length = 0; }
  enter(k) { const t = now(), S = this.stack; if (S.length) { const p = S[S.length - 1]; this.acc[p] = (this.acc[p] || 0) + t - this.t; } S.push(k); this.t = t; this.n[k] = (this.n[k] || 0) + 1; }
  exit() { const t = now(), S = this.stack, k = S.pop(); this.acc[k] = (this.acc[k] || 0) + t - this.t; this.t = t; }
  wrap(obj, name, key) {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__sec) return;
    const f = obj[name], self = this, had = Object.prototype.hasOwnProperty.call(obj, name);
    const w = function (...a) { self.enter(key); try { return f.apply(this, a); } finally { self.exit(); } };
    w.__sec = true; obj[name] = w;
    this.undo.push(() => { if (had) obj[name] = f; else delete obj[name]; });
  }
  off() { for (const u of this.undo.reverse()) u(); this.undo = []; }
  take(f) {
    const ms = this.acc, named = SIM_KEYS.reduce((s, k) => s + (ms[k] || 0), 0);
    ms['other sim'] = Math.max(0, (f.sim ?? 0) - named);
    const o = { ms, n: this.n }; this.acc = {}; this.n = {}; return o;
  }
  // the game's entry points (G: the Game)
  install(G) {
    const R = G.renderer, own = (p) => Object.prototype.hasOwnProperty.call(p, 'update');
    const protos = new Map();
    for (const [L, key] of [[G.npcs, 'people'], [G.enemies, 'enemies']]) for (const a of L || []) { let p = Object.getPrototypeOf(a); while (p && p !== Object.prototype) { if (own(p) && !protos.has(p)) protos.set(p, key); p = Object.getPrototypeOf(p); } }
    for (const [p, key] of protos) this.wrap(p, 'update', key);
    if (G.gadgets) this.wrap(G.gadgets, 'updateEnemies', 'enemies');
    if (G.hero) this.wrap(G.hero, 'update', 'hero');
    for (const m of ['move', 'fall', 'groundInfo', 'steepAt', 'blockedAt', 'solidAt', 'clearTo', 'lineOfSight', 'near', 'ballFenceAt', 'ballFenceBetween']) this.wrap(G.physics, m, 'physics');
    this.wrap(G, 'findInteractable', 'interact');
    if (G.camRig) this.wrap(G.camRig, 'update', 'camera');
    this.wrap(G, 'occluders', 'camera');
    this.wrap(R, 'render', 'submit other');
    if (R.composer) this.wrap(R.composer, 'render', 'submit post');
    if (R.scenePass) this.wrap(R.scenePass, 'render', 'submit main');
    if (R.renderer?.shadowMap) this.wrap(R.renderer.shadowMap, 'render', 'submit shadow');
  }
}
function sectionStats(b) {
  const F = b.filter((f) => f.sec); if (!F.length) return null;
  const keys = [...new Set(F.flatMap((f) => Object.keys(f.sec.ms)))];
  const pc = (a, p) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.min(v.length - 1, Math.floor(p * v.length))].toFixed(2); };
  const out = {};
  for (const k of keys) { const v = F.map((f) => f.sec.ms[k] || 0), n = F.map((f) => f.sec.n[k] || 0); out[k] = { p50: pc(v, 0.5), p95: pc(v, 0.95), mean: +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2), calls: +(n.reduce((s, x) => s + x, 0) / n.length).toFixed(1) }; }
  return out;
}

// 3. A resource snapshot (G: the Game): what is on the GPU, the JS heap, the scene, what is simulated, what is registered.
export function resources(G) {
  const R = G.renderer?.renderer, M = R?.info.memory, mem = typeof performance !== 'undefined' ? performance.memory : null;
  let objects = 0, meshes = 0, shown = 0;
  G.scene?.traverse((o) => { objects++; if (o.isMesh || o.isPoints || o.isLine || o.isSprite) meshes++; });
  G.scene?.traverseVisible(() => shown++);
  const rooms = Object.values(G.rooms || {});
  return {
    geometries: M?.geometries ?? null, textures: M?.textures ?? null, programs: R?.info.programs?.length ?? null, renderTargets: G.perf?.targets?.size ?? null,
    heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null, heapTotalMB: mem ? +(mem.totalJSHeapSize / 1048576).toFixed(1) : null,
    objects, meshes, shown,
    npcs: G.npcs?.length ?? 0, enemies: G.enemies?.length ?? 0, roomUpdaters: rooms.reduce((s, r) => s + (r.updaters?.length || 0), 0),
    drawBatchAreas: G.drawBatch?.areas?.size ?? null, shadowAreas: G.shadowCull?.areas?.size ?? null,
    ...registrations(),
  };
}

// 4. The start (the user, 30.10: "there are stutters again on the game's start screen"). From the moment this module loads
//    until STARTUP_MAX s, or until the first STARTUP_PLAY s of play: every display frame's interval (a callback of its
//    own on the browser's frame clock, the loading screen included, when the game's loop isn't running yet), the
//    browser's long animation frames (PerformanceObserver 'long-animation-frame': what ran in them — the script, the
//    function, its file and line — and style/layout), and marks (the loading steps, the title, New Game, the cinematic,
//    play). startupReport(game) gives every phase's frames and every long frame with what ran in it.
const STARTUP_MAX = 600e3, STARTUP_PLAY = 30e3;
export const STARTUP = { iv: [], marks: [], loaf: [], lt: [], on: true, playAt: null };
const LOAF_N = 200;
export const LOAF = { ok: false, list: [], lt: [] };
// what the main thread did in the interval [end − ms, end] (performance.now() times): the long animation frames that
// overlap it, longest script first — or, where the browser reports them and none overlaps, that it was free
export function loafIn(end, ms) {
  if (!LOAF.ok || end == null) return '';
  const lf = LOAF.list.filter((e) => e.t < end && e.t + e.d > end - ms);
  if (!lf.length) {
    // (a long task with no frame of its own — nothing drawn meanwhile — is reported as a long task only)
    const lt = LOAF.lt.filter((e) => e.t < end && e.t + e.d > end - ms);
    if (lt.length) return lt.map((e) => `main thread ${Math.round(e.d)} ms (a long task; no script named)`).join(' | ');
    return 'no long animation frame reported over it: the main thread likely free (GPU process, driver or compositor)';
  }
  return lf.map((e) => `main thread ${Math.round(e.d)} ms${e.style ? `, style/layout ${e.style}` : ''}${e.scripts[0] ? ': ' + e.scripts[0] : ''}`).join(' | ');
}
export function startupMark(label) { if (STARTUP.on) STARTUP.marks.push([performance.now(), label]); if (label === 'play' && STARTUP.playAt == null) STARTUP.playAt = performance.now(); }
(function startupTrace() {
  if (typeof window === 'undefined' || !window.__lbaRaf) return;
  const raf = window.__lbaRaf; let last = null;
  const tick = (t) => {
    if (last != null) STARTUP.iv.push(t, t - last);
    last = t;
    if (t > STARTUP_MAX || (STARTUP.playAt != null && t - STARTUP.playAt > STARTUP_PLAY)) { STARTUP.on = false; return; }
    if (STARTUP.on) raf(tick);
  };
  raf(tick);
  const keep = (e) => {
    const scripts = (e.scripts || []).slice().sort((a, b) => b.duration - a.duration).slice(0, 3).map((s) => `${s.invokerType || ''} ${s.sourceFunctionName || s.invoker || '?'} ${String(s.sourceURL || '').replace(/^.*\/(src|vendor|css)\//, '$1/')}${s.sourceCharPosition >= 0 ? ':' + s.sourceCharPosition : ''} ${Math.round(s.duration)} ms${s.forcedStyleAndLayoutDuration ? ` (forced layout ${Math.round(s.forcedStyleAndLayoutDuration)})` : ''}`.trim());
    return { t: e.startTime, d: e.duration, block: e.blockingDuration ?? null, style: e.styleAndLayoutStart ? Math.round(e.startTime + e.duration - e.styleAndLayoutStart) : null, render: e.renderStart ? Math.round(e.startTime + e.duration - e.renderStart) : null, scripts };
  };
  // (also after the start trace: the last LOAF_N long animation frames, for the benchmark's hitch list: was the main
  //  thread busy through a long frame — with what — or free, the time spent in the GPU process / driver / compositor)
  try { LOAF.ok = PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') ?? false; } catch { /* */ }
  try { new PerformanceObserver((L) => { for (const e of L.getEntries()) { const k = keep(e); if (STARTUP.on) STARTUP.loaf.push(k); LOAF.list.push(k); if (LOAF.list.length > LOAF_N) LOAF.list.shift(); } }).observe({ type: 'long-animation-frame', buffered: true }); } catch { /* not in this browser */ }
  try { new PerformanceObserver((L) => { for (const e of L.getEntries()) { const k = { t: e.startTime, d: e.duration }; if (STARTUP.on) STARTUP.lt.push(k); LOAF.lt.push(k); if (LOAF.lt.length > LOAF_N) LOAF.lt.shift(); } }).observe({ type: 'longtask', buffered: true }); } catch { /* not in this browser */ }
})();
// (G: the Game, for its loading steps and the frames its loop recorded with their jobs)
export function startupReport(G) {
  const S = STARTUP, iv = S.iv, marks = [...(G?.loadTimes?.timeline || []).map(([t, l]) => [t, 'loading: ' + l]), ...S.marks].sort((a, b) => a[0] - b[0]);
  const phases = [['page start', 0], ...marks.map(([t, l]) => [l, t])].filter((p, i, A) => i === 0 || p[1] > A[i - 1][1] || p[0] !== A[i - 1][0]);
  const pc = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v.length ? +v[Math.min(v.length - 1, Math.floor(p * v.length))].toFixed(1) : null; };
  const L = [];
  L.push(`LBA3 start trace · build ${G?.version || '?'} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${G?.perf?.gpu ?? '?'}`);
  L.push(`display frames recorded ${iv.length / 2} over ${((iv[iv.length - 2] || 0) / 1000).toFixed(1)} s · long animation frames ${S.loaf.length}${S.loaf.length ? '' : ' (none reported: the browser may not support them)'} · long tasks ${S.lt.length}`);
  L.push(`startup steps (ms): ${G?.loadTimes ? `build ${G.loadTimes.total ?? '?'} · shaders ${G.loadTimes.shaders ?? '?'} · prep ${JSON.stringify(G.loadTimes.prep || {})}` : '?'}`);
  L.push('', 'phase (from its mark to the next)            frames  interval p50 / p95 / max ms   >20 / >33 / >50 / >100');
  // group the "loading: …" steps into one phase per label run
  for (let i = 0; i < phases.length; i++) {
    const [label, a] = phases[i], b = i + 1 < phases.length ? phases[i + 1][1] : Infinity, v = [];
    for (let k = 0; k < iv.length; k += 2) if (iv[k] > a && iv[k] <= b) v.push(iv[k + 1]);
    if (!v.length) continue;
    L.push(`  ${(label + ' @' + (a / 1000).toFixed(1) + 's').slice(0, 44).padEnd(44)} ${String(v.length).padStart(5)}   ${pc(v, 0.5)} / ${pc(v, 0.95)} / ${pc(v, 1)}   ${v.filter((x) => x > 20).length} / ${v.filter((x) => x > 33.4).length} / ${v.filter((x) => x > 50).length} / ${v.filter((x) => x > 100).length}`);
  }
  const phaseAt = (t) => { let p = 'page start'; for (const [l, a] of phases) if (a <= t) p = l; return p; };
  const long = []; for (let k = 0; k < iv.length; k += 2) if (iv[k + 1] > 50) long.push([iv[k], iv[k + 1]]);
  L.push('', `every display frame over 50 ms (${long.length}): when · how long · phase · what ran (the browser's long animation frame overlapping it: its scripts, style/layout; else the game's own jobs)`);
  const jobs = (G?.perf?.buf || []).filter((f) => f.why);
  for (const [t, d] of long.slice(0, 60)) {
    const lf = S.loaf.filter((e) => e.t < t && e.t + e.d > t - d);
    const what = lf.length ? lf.map((e) => `[${Math.round(e.d)} ms${e.style != null ? `, style/layout ${e.style}` : ''}${e.render != null ? `, render ${e.render}` : ''}: ${e.scripts.join(' | ') || 'no script (rendering / GPU / compositor)'}]`).join(' ') : 'no long animation frame: the main thread was free (GPU process, compositor or display)';
    L.push(`  ${(t / 1000).toFixed(2).padStart(7)} s  ${String(Math.round(d)).padStart(5)} ms  ${phaseAt(t).slice(0, 28).padEnd(28)} ${what}`);
  }
  if (long.length > 60) L.push(`  … +${long.length - 60} more`);
  if (jobs.length) { L.push('', 'the game loop\'s own long frames with their jobs (title and play):'); for (const f of jobs.slice(-30)) L.push(`  ${Math.round(f.ms)} ms${f.black ? ' black' : ''} · ${f.why}`); }
  return L.join('\n');
}
