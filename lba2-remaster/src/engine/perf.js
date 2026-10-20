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
  if (/Vega \d|Radeon Vega|Radeon\(TM\) Vega|Intel\(R\) HD|\bHD Graphics|UHD Graphics|Mali|Adreno|PowerVR|GMA/i.test(gpu)) return 'low';
  if (/Iris|Radeon\(TM\) Graphics|Radeon Graphics|Intel/i.test(gpu)) return 'medium';
  return 'high';
}
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
    // which GPU is drawing (a software renderer here explains a slow game)
    try {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      this.gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).replace(/^ANGLE \((.*)\)$/, '$1');
    } catch { this.gpu = '?'; }
  }
  beginFrame() { if (this.r) this.r.info.reset(); this.shadow = 0; this.sub = 0; }
  record(f) {
    const info = this.r?.info.render;
    f.calls = info?.calls ?? 0; f.tris = info?.triangles ?? 0; f.shadowCalls = this.shadow; f.draws = f.calls + this.sub;
    if (this.buf.length < N) this.buf.push(f); else this.buf[this.i] = f;
    this.i = (this.i + 1) % N;
    if (this.el && (this.uiT += f.real) > 0.25) { this.uiT = 0; this.draw(); }
  }
  reset() { this.buf = []; this.i = 0; }
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
