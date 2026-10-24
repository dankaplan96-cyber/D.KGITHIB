// In-game benchmark: the same routes, timed on the machine that plays. Runs from the pause menu (or ?bench once
// a game is going) and never touches the save: the game is snapshotted first, saving is off while it runs, and
// the snapshot is put back at the end.
// Each route warms up (scene change, shaders: a preset change or a breakdown variant first waits for its shader
// variants to finish compiling, so the numbers are the steady state, not the recompile) and is then measured: average fps, frame time p50/p95/p99 and
// max, stalls (frames over 50 ms), simulation CPU time, render submission CPU time (not GPU time: the GPU's work
// is only visible in the frame time), draw calls and triangles. Routes run once per quality preset.
// PERF-2: the camera is the same for everyone. The street's "camera turning" only turns the free orbit, so a player on
// the LBA camera measured the follow view (≈ 200–270 calls) and one on the free camera (the user) the views across
// the town (≈ 470–540), from wherever their camera last pointed: the routes now always use the free orbit from the
// same heading, pitch and distance, and the player's camera is put back afterwards. "draw calls" stays three.js's count (one per WebGL call, the CPU
// cost); "GPU draws" adds the draws inside a multi-draw (one call for many trees, which ANGLE on D3D11 still
// issues one by one) and "shadow" is the shadow pass's share of the calls.
import { gpuQuality } from './perf.js';
import { POOL_SIZE as POOL_N } from './lightpool.js';
const WARM = 1.5, MEASURE = 6;

export class Bench {
  constructor(game) { this.g = game; this.running = false; }

  // the routes: setup() once, drive(t, dt) every displayed frame
  routes() {
    const G = this.g, h = G.hero;
    const walk = (pts, speed = 2.4) => {
      // a loop through pts at walking speed, facing the way it goes (the rig picks the walk from the motion)
      const seg = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length].x - p.x, pts[(i + 1) % pts.length].z - p.z));
      const total = seg.reduce((a, b) => a + b, 0);
      return (t) => {
        let d = (t * speed) % total, i = 0;
        while (d > seg[i]) { d -= seg[i]; i++; }
        const a = pts[i], b = pts[(i + 1) % pts.length], k = d / seg[i];
        h.pos.set(a.x + (b.x - a.x) * k, 0, a.z + (b.z - a.z) * k);
        h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, h.pos.y + 2);
        h.angle = Math.atan2(b.x - a.x, b.z - a.z); h.vel.set(0, 0);
      };
    };
    const outdoor = (x, z) => { G.exitRoom({ x, z, a: 0 }, true, true); this.camera(); };
    return [
      // The free orbit as a player has it: it turns slowly (0.35 rad/s, as before) while it swings back behind the
      // walking Twinsen (camera.js _free), always from the same heading (π/4): the views across the square and up
      // the town (headings 1.3–2.5 rad) that the 0.31.0 benchmark measured on the user's laptop (Low 477 calls,
      // 697k triangles; this route on SwiftShader, same build: 471 calls, 690k).
      (() => {
        const w = walk([{ x: -46, z: 2 }, { x: -38, z: 2 }, { x: -36, z: -8 }, { x: -48, z: -9 }]);
        return {
          id: 'street', label: 'Populated street (the square, the shop, NPCs), camera turning',
          setup: () => { outdoor(-42, 2); w(0); G.camRig.yaw = Math.PI / 4; },
          drive: (t, dt) => { w(t); G.camRig.yaw += dt * 0.35; },
        };
      })(),
      {
        id: 'interior', label: "Furnished interior (Twinsen's house)",
        setup: () => { G.enterRoom('house', null, true, true); },
        drive: (() => { let w = null; return (t) => { const R = G.room; w ??= walk([{ x: R.center.x - 2, z: R.center.z - 1 }, { x: R.center.x + 2, z: R.center.z + 1 }, { x: R.center.x + 1, z: R.center.z + 8 }, { x: R.center.x - 8, z: R.center.z + 9 }]); w(t); }; })(),
      },
      {
        id: 'combat', label: 'Combat: enemies and a throw every 0.6 s',
        setup: () => {
          G.devArena(); G.state = 'play'; this.camera();
          for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(true);
        },
        drive: (() => { let next = 0; return (t) => {
          h.hp = h.maxHp; h.dead = false; h.mp = h.mpMax;
          if (t > next && G.ball.ready) { next = t + 0.6; const a = t * 1.3; G.ball.launch(h, 'normal', h.magicLevel, { aim: { x: Math.sin(a), z: Math.cos(a) } }); }
        }; })(),
      },
      {
        id: 'transition', label: 'Area transition (house door, in and out every 2 s)',
        setup: () => { outdoor(-45, 76); },
        drive: (() => { let next = 0, inside = false; return (t) => {
          if (t < next || G.trans) return;
          next = t + 2; inside = !inside;
          if (inside) G.enterRoom('house', null, false, true); else G.exitRoom({ x: -45, z: 76, a: 0 }, false, true);
        }; })(),
      },
      // (RENDER-INV) arriving somewhere: every 3 s the next outdoor area, its map drawn afresh as on a first visit
      // (the map is drawn in the background in the first seconds after an arrival: MAP-1, hud.mapTick)
      {
        id: 'arrival', label: 'Arriving in an area (Zeelich, Desert Island, the Hamalayi, Citadel), every 3 s',
        setup: () => { outdoor(-42, 2); },
        drive: (() => { let next = 0, k = 0; const seq = ['zeelich', 'desert', 'hamalayi', null]; return (t) => {
          if (t < next || G.trans) return;
          next = t + 3; const id = seq[k++ % seq.length];
          G.hud?._bases?.delete(id || 'citadel');
          if (id && G.rooms[id]) G.enterRoom(id, null, false, true); else G.exitRoom({ x: -42, z: 2, a: 0 }, false, true);
        }; })(),
      },
    ];
  }

  // the benchmark's camera: the free orbit, from the same heading, pitch and view every time (PERF-2)
  camera() {
    const C = this.g.camRig;
    C.setMode('free'); C.view = 0; C.yaw = Math.PI * 0.85; C.pitch = 0.42; C.idleT = 0; C.snap?.();
  }

  // runs every route at each quality; resolves with the report text
  run(qualities = ['low', 'medium', 'high']) {
    const G = this.g;
    if (this.running) return Promise.resolve(null);
    this.running = true;
    const snap = G.snapshot(), quality0 = G.settings.quality, state0 = G.state;
    const C = G.camRig, cam0 = { view: C.view, yaw: C.yaw, pitch: C.pitch };
    G.benching = true; // (no saves while it runs; fixed settings: no automatic resolution)
    G.renderer.timer = G.perf.gpuTimer;   // (RENDER-INV: the GPU's own time per frame, where the browser has a timer query)
    const auto0 = G.renderer.autoRes; G.renderer.setAutoRes(false);
    G.hideScreens?.(); G.setState('play');
    const plan = [];
    for (const q of qualities) for (const r of this.routes()) plan.push({ q, r });
    // breakdown: the street and the house at Medium, each with one cost taken away, to see what the GPU pays for
    const R = G.renderer, LP = G.lightPool, n0 = () => POOL_N[G.settings.quality] ?? 4;
    const variants = [
      { id: 'as is', apply() {}, undo() {} },
      { id: 'no shadows', apply() { R.renderer.shadowMap.enabled = false; G.warmGraphics(); }, undo() { R.applyDerived(); G.warmGraphics(); } },
      { id: 'no lamps', apply() { LP?.setSize(0); G.warmGraphics(); }, undo() { LP?.setSize(n0()); G.warmGraphics(); } },
      { id: 'res x0.6', apply() { R.autoRes = true; R.setDyn(0.6); }, undo() { R.autoRes = false; R.setDyn(1); } },
    ];
    const brk = this.routes().filter((r) => r.id === 'street' || r.id === 'interior');
    for (const r of brk) for (const v of variants) plan.push({ q: 'medium', r, v, short: true });
    const results = [];
    return new Promise((resolve) => {
      let i = -1, t = 0, cur = null, warm = 0, maxWarm = 0;
      const next = () => {
        i++;
        if (i >= plan.length) return finish();
        cur?.v?.undo();
        cur = plan[i];
        if (G.settings.quality !== cur.q) { G.settings.quality = cur.q; G.applySettings(); }
        G.state = 'play'; cur.r.setup(); cur.v?.apply(); t = 0; warm = 0; maxWarm = 0;
        G.hud?.toast?.('bench_route', { n: i + 1, of: plan.length });
      };
      G.benchTick = (real) => {
        if (!cur) return;
        // (a preset change or a variant's shaders still compiling: the warm-up starts once they are ready)
        if (G.gfxHold) { warm = 0; t = 0; return; }
        t += real;
        G.state = 'play';
        cur.r.drive(t, real);
        if (warm < WARM) { warm += real; maxWarm = Math.max(maxWarm, real * 1000); if (warm >= WARM) G.perf.reset(); return; }
        if (t >= WARM + (cur.short ? 4 : MEASURE)) {
          const s = G.perf.stats();
          // (FRAME-1) long frames: over 33 ms (a 30 fps frame missed), over 50 ms ("stalls"), how many of those were
          // spent behind a fully black screen (a scene change's fade or shader hold), and the three longest
          const buf = G.perf.buf, stalls = buf.filter((f) => f.ms > 50).length;
          const pacing = { over33: buf.filter((f) => f.ms > 33.4).length, over100: buf.filter((f) => f.ms > 100).length, stallsBlack: buf.filter((f) => f.ms > 50 && f.black).length,
            worst: buf.slice().sort((a, b) => b.ms - a.ms).slice(0, 3).map((f) => `${f.ms.toFixed(0)}${f.black ? ' (black)' : ''}`).join(', '),
            minMs: Math.min(...buf.map((f) => f.ms)) };
          const R = G.renderer;
          const cfg = G.graphicsConfig();
          results.push({ q: cur.q, id: cur.r.id, label: cur.r.label, s, stalls, pacing, warmMaxMs: +maxWarm.toFixed(0), cfg, v: cur.v?.id });
          next();
        }
      };
      const finish = () => {
        cur?.v?.undo();
        G.benchTick = null; cur = null;
        if (G.settings.quality !== quality0) { G.settings.quality = quality0; G.applySettings(); }
        G.resetCombat('drop');
        G.applySave(snap);
        G.benching = false; G.renderer.setAutoRes(auto0); G.renderer.timer = null;
        C.setMode(G.settings.camera); Object.assign(C, cam0); C.snap?.();
        G.setState(state0 === 'title' ? 'play' : state0 === 'pause' ? 'play' : state0);
        this.running = false;
        const text = this.report(results);
        console.log(text);
        resolve(text);
      };
      next();
    });
  }

  // (FRAME-1) what a route's typical frame waits on, from its own medians: the game's CPU work (simulation + render
  // submission) against the whole frame interval. Mostly CPU: fewer draw calls / simpler scenes help, a lower
  // resolution does not. Mostly the rest: the GPU (pixels, shadows, MSAA, lamps) or the display's pacing. An estimate.
  // RENDER-INV: with the GPU's own time (timer query) the estimate compares both sides directly.
  bound(s) {
    const f = s.frameMs.p50, cpu = s.simMs.p50 + s.renderMs.p50;
    if (f <= 17.5) return 'keeps up with a 60 Hz display';
    if (s.gpuMs) return s.gpuMs.p50 >= cpu ? `GPU (GPU ${s.gpuMs.p50} ms vs CPU ${cpu.toFixed(1)} ms a frame: resolution, shadows, MSAA, lamps)` : `CPU (CPU ${cpu.toFixed(1)} ms vs GPU ${s.gpuMs.p50} ms a frame: draw calls, simulation)`;
    return cpu >= 0.75 * f ? `CPU (${cpu.toFixed(1)} of ${f} ms is the game's own work: draw calls)` : `GPU (${cpu.toFixed(1)} of ${f} ms is CPU work; the rest is waiting: resolution, shadows, MSAA, lamps)`;
  }

  report(results) {
    const G = this.g;
    const v = G.version || '?';
    const lines = [];
    lines.push(`LBA3: The Awakening benchmark · build ${v} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
    lines.push(`GPU (as reported by the browser): ${G.perf.gpu} · preset picked for it on a first start: ${gpuQuality(G.perf.gpu)} · playing on: ${G.settings.quality} · automatic resolution: ${G.settings.res !== 'full' ? 'on (off while measuring)' : 'off'}`);
    // (FRAME-1: the GPU string is the acceleration diagnostic: a software rasteriser here means no GPU at all)
    if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(G.perf.gpu || '')) lines.push('NOTE: software rendering (no GPU acceleration in this browser/app): every number below is CPU-drawn');
    lines.push(`window ${innerWidth}×${innerHeight} · devicePixelRatio ${devicePixelRatio} · user agent ${navigator.userAgent.match(/(Electron|Chrome)\/[\d.]+/g)?.join(' ') || navigator.userAgent}`);
    lines.push(`camera: free orbit from a fixed heading for every route (your camera setting: ${G.settings.camera}) · WEBGL_multi_draw ${G.perf.multiDraw ? 'yes' : 'no'}`);
    // (FRAME-1: the shortest frame interval seen is the display's refresh interval if the game ever kept up with it)
    const minMs = Math.min(...results.map((x) => x.pacing?.minMs ?? Infinity));
    lines.push(`frame-rate limit: ${G.settings.fps === '30' || G.settings.fps === '60' ? G.settings.fps : 'off'} (off while measuring) · shortest frame interval seen ${Number.isFinite(minMs) ? minMs.toFixed(1) + ' ms (≈ ' + (1000 / minMs).toFixed(0) + ' Hz)' : '?'}`);
    if (G.perf.load) {
      // (RENDER-INV: every area is built at startup; what Citadel itself took, and the largest of the others)
      const L = G.perf.load, own = (L.world || 0) + (L.spaceport || 0) + (L.townlife || 0) + (L.citydress || 0), skip = new Set(['world', 'spaceport', 'townlife', 'citydress', 'total', 'shaders', 'actors']);
      const big = Object.entries(L).filter(([k]) => !skip.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, ms]) => `${k} ${(ms / 1000).toFixed(1)}`).join(', ');
      lines.push(`startup: build ${(L.total / 1000).toFixed(1)} s (Citadel ${(own / 1000).toFixed(1)} s; largest other areas: ${big} s) · shader preparation ${(L.shaders / 1000).toFixed(1)} s`);
    }
    { const M = G.renderer.renderer.info.memory, heap = performance.memory?.usedJSHeapSize;
      lines.push(`memory: ${M.geometries} geometries and ${M.textures} textures on the GPU · ${G.renderer.renderer.info.programs?.length ?? '?'} shader programs${heap ? ` · JavaScript heap ${(heap / 1048576).toFixed(0)} MB` : ''} · GPU timer: ${G.perf.gpuTimer ? 'yes' : 'not offered by this browser'}`); }
    let q = null;
    const brk = results.filter((x) => x.v);
    for (const x of results.filter((r) => !r.v)) {
      if (x.q !== q) {
        q = x.q; const c = x.cfg;
        lines.push('', `quality ${q}: render pixel ratio ${c.pr} · MSAA ${c.msaa}× · FXAA ${c.fxaa ? 'on' : 'off'} · shadows ${c.shadows ? `on (${c.shadowMap} px)` : 'off'} · bloom ${c.bloom ? 'on' : 'off'} · lamp lights ${c.lamps} · grass/flowers to ${c.smallFar} m · trees detailed to ${c.treeNear} m`);
      }
      const s = x.s;
      if (!s) { lines.push(`  ${x.id}: no frames`); continue; }
      const P = x.pacing;
      lines.push(`  ${x.id.padEnd(10)} ${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} p99 ${s.frameMs.p99} max ${s.frameMs.max} ms · stalls>50ms ${x.stalls}${P ? ` (${P.stallsBlack} behind black) · >33ms ${P.over33} >100ms ${P.over100 ?? 0} of ${s.frames} · longest ${P.worst} ms` : ''}`
        + ` · sim CPU p50 ${s.simMs.p50} (p95 ${s.simMs.p95}) ms · render submit CPU p50 ${s.renderMs.p50} ms${s.gpuMs ? ` · GPU time p50 ${s.gpuMs.p50} (p95 ${s.gpuMs.p95}) ms` : ''} · draw calls ${s.calls} (p95 ${s.callsP95}, shadow ${s.shadowCalls}) · GPU draws ${s.draws} · triangles ${(s.tris / 1000).toFixed(0)}k · warm-up max ${x.warmMaxMs} ms`
        + ` · limited by (estimate): ${this.bound(s)}`);
    }
    if (brk.length) {
      lines.push('', 'breakdown at Medium (one cost taken away at a time):');
      for (const x of brk) { const s = x.s; lines.push(`  ${(x.id + ' · ' + x.v).padEnd(24)} ${s ? `${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} ms${s.gpuMs ? ` · GPU p50 ${s.gpuMs.p50} ms` : ''} · render pixel ratio ${x.cfg.pr}` : 'no frames'}`); }
    }
    lines.push('', `Frame time includes the GPU (the browser waits for it); "render submit" is CPU time only; "GPU time" (when shown) is the GPU's own time for a frame.`);
    return lines.join('\n');
  }
}
