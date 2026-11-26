// In-page telemetry, installed from outside: no game file is changed. Lightweight on purpose (a few array pushes a
// frame); its own time is measured and reported as the tool's overhead.
//   frames  every frame record the game already makes (perf.record → onRecord), kept with its end time, in a bounded
//           ring (36 000 frames ≈ 10 min). The hook is chained: the benchmark may set or clear onRecord meanwhile.
//   gpu     each GPU time the game's own asynchronous timer query resolves (EXT_disjoint_timer_query_webgl2; no
//           synchronous readback), with when it resolved. Unavailable when the browser has no timer query.
//   loaf    long animation frames (> 50 ms) with the scripts that ran in them (source file, function): the call sites
//           a stall can be traced to. Long tasks as a fallback.
//   memory  JS heap every second (performance.memory; Chromium only).
//   events  frames over the stall threshold, with the game's state at that moment.
// Nothing here calls gl.finish/readPixels or waits on the GPU.
export async function installProbe(page, { stallMs = 100 } = {}) {
  await page.evaluate((stallMs) => {
    if (window.__tl) return;
    const G = window.game, perf = G.perf;
    const T = (window.__tl = { frames: [], gpu: [], loaf: [], longtasks: [], memory: [], events: [], cap: 36000, overheadMs: 0, stallMs, quietUntil: 0, marks: [] });
    const push = (a, x, cap) => { a.push(x); if (a.length > cap) a.splice(0, a.length - cap); };
    T.state = () => {
      const h = G.hero, C = G.camRig;
      return { t: +performance.now().toFixed(1), state: G.state, screen: G.screen || null, room: G.room?.id ?? 'citadel', trans: !!G.trans, cine: !!G.cine,
        pos: h ? [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)] : null, angle: h ? +h.angle.toFixed(3) : null, hp: h?.hp, mp: h?.mp,
        camera: C ? { view: C.view, yaw: +(+C.yaw).toFixed(3), pitch: +(+C.pitch).toFixed(3) } : null, chapter: G.flags?.chapterKey ?? null,
        objective: (() => { try { return G.story?.objective?.() ?? null; } catch { return null; } })() };
    };
    T.settings = () => {
      let cfg = null; try { cfg = G.graphicsConfig(); } catch {}
      const R = G.renderer;
      return { quality: G.settings.quality, auto: !!G.settings.qualityAuto, autoLabel: G.autoQ?.label?.() ?? null, config: cfg,
        pixelRatio: R?.pixelRatio?.() ?? null, effScale: R?.effScale?.() ?? null, autoRes: R?.autoRes ?? null, battery: G.power?.onBattery ?? null,
        window: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio, fpsLimit: G.settings.fps ?? null };
    };
    T.counters = () => {
      const R = G.renderer?.renderer, sc = G.shadowCache?.stats || {};
      let jobs = null; try { jobs = G.jobCounters?.(); } catch {}
      return { geometries: R?.info.memory.geometries, textures: R?.info.memory.textures, programs: R?.info.programs?.length,
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
        drawBatchBuilds: G.drawBatch?.builds ?? null, drawBatchMs: G.drawBatch?.buildMs != null ? +G.drawBatch.buildMs.toFixed(0) : null,
        shadowBatchBuilds: G.shadowCull?.builds ?? null, shadowCache: { full: sc.full, sliced: sc.sliced, swaps: sc.swaps, drops: sc.drops },
        regionsBuilt: G.regions?.log?.length ?? null, uploads: G.uploadLog?.length ?? null, jobs };
    };
    T.gpuAvailable = !!perf.gpuTimer;
    // frames: chained onto the game's own per-frame record
    let inner = perf.onRecord || null;
    const hook = (f) => {
      const t0 = performance.now();
      const r = { t: +f.end.toFixed(1), ms: +f.ms.toFixed(2), real: f.real, sim: f.sim, render: f.render, black: !!f.black, calls: f.calls, tris: f.tris,
        shadowCalls: f.shadowCalls, draws: f.draws, up: f.up, upKB: f.upKB, lag: f.lag, why: f.why || null, lamps: f.lamps };
      if (t0 < T.quietUntil) r.tainted = true;   // (a screenshot the tool took: not the game's own time)
      push(T.frames, r, T.cap);
      if (r.ms > T.stallMs && !r.tainted) push(T.events, { frame: r, at: T.state(), counters: T.counters() }, 200);
      T.overheadMs += performance.now() - t0;
      inner?.(f);
    };
    Object.defineProperty(perf, 'onRecord', { configurable: true, get: () => hook, set: (fn) => { inner = fn === hook ? inner : fn; } });
    // GPU: the samples the timer query resolves (pushed into its own array a few frames later)
    if (perf.gpuTimer?.ms) {
      const a = perf.gpuTimer.ms, orig = a.push;
      a.push = function (...v) { const t = performance.now(); for (const x of v) push(T.gpu, { t: +t.toFixed(1), ms: +x.toFixed(2) }, T.cap); return orig.apply(this, v); };
    }
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) push(T.loaf, { t: +e.startTime.toFixed(1), ms: +e.duration.toFixed(1), blocking: +(e.blockingDuration || 0).toFixed(1),
        scripts: (e.scripts || []).slice(0, 5).map((s) => ({ ms: +s.duration.toFixed(1), fn: s.sourceFunctionName || '', src: (s.sourceURL || '').replace(location.origin, '') + (s.sourceCharPosition >= 0 ? ':' + s.sourceCharPosition : ''), invoker: s.invoker || '' })) }, 2000); })
        .observe({ type: 'long-animation-frame', buffered: false });
      T.loafAvailable = true;
    } catch { T.loafAvailable = false; }
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) push(T.longtasks, { t: +e.startTime.toFixed(1), ms: +e.duration.toFixed(1) }, 2000); }).observe({ type: 'longtask' }); } catch {}
    setInterval(() => { if (performance.memory) push(T.memory, { t: +performance.now().toFixed(1), heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) }, 3600); }, 1000);
    T.mark = (label) => { const m = { label, t: +performance.now().toFixed(1) }; T.marks.push(m); return m.t; };
  }, stallMs);
}

// a measured window: everything recorded between two marks (frames by their end time)
export async function windowData(page, t0, t1) {
  return page.evaluate(([t0, t1]) => {
    const T = window.__tl, inW = (x) => x.t >= t0 && x.t <= t1;
    return { frames: T.frames.filter(inW), gpu: T.gpu.filter(inW), loaf: T.loaf.filter(inW), memory: T.memory.filter(inW), gpuAvailable: T.gpuAvailable, loafAvailable: T.loafAvailable, overheadMs: +T.overheadMs.toFixed(1) };
  }, [t0, t1]);
}
export const mark = (page, label) => page.evaluate((l) => window.__tl.mark(l), label);
export const gameState = (page) => page.evaluate(() => window.__tl.state());
export const gameSettings = (page) => page.evaluate(() => window.__tl.settings());
export const counters = (page) => page.evaluate(() => window.__tl.counters());
// stall events since a time; the tool marks a quiet period around its own screenshots
export const eventsSince = (page, t) => page.evaluate((t) => window.__tl.events.filter((e) => e.frame.t > t), t);
export const quiet = (page, ms) => page.evaluate((ms) => { window.__tl.quietUntil = performance.now() + ms; }, ms);
