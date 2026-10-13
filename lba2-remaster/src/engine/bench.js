// In-game benchmark: the same routes, timed on the machine that plays. Runs from the pause menu (or ?bench once
// a game is going) and never touches the save: the game is snapshotted first, saving is off while it runs, and
// the snapshot is put back at the end.
// Each route warms up (scene change, shaders) and is then measured: average fps, frame time p50/p95/p99 and
// max, stalls (frames over 50 ms), simulation CPU time, render submission CPU time (not GPU time: the GPU's work
// is only visible in the frame time), draw calls and triangles. Routes run once per quality preset.
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
    const outdoor = (x, z) => { G.exitRoom({ x, z, a: 0 }, true, true); };
    return [
      {
        id: 'street', label: 'Populated street (the square, the shop, NPCs), camera turning',
        setup: () => { outdoor(-42, 2); },
        drive: (() => { const w = walk([{ x: -46, z: 2 }, { x: -38, z: 2 }, { x: -36, z: -8 }, { x: -48, z: -9 }]); return (t, dt) => { w(t); G.camRig.yaw = (G.camRig.yaw || 0) + dt * 0.35; }; })(),
      },
      {
        id: 'interior', label: "Furnished interior (Twinsen's house)",
        setup: () => { G.enterRoom('house', null, true, true); },
        drive: (() => { let w = null; return (t) => { const R = G.room; w ??= walk([{ x: R.center.x - 2, z: R.center.z - 1 }, { x: R.center.x + 2, z: R.center.z + 1 }, { x: R.center.x + 1, z: R.center.z + 8 }, { x: R.center.x - 8, z: R.center.z + 9 }]); w(t); }; })(),
      },
      {
        id: 'combat', label: 'Combat: enemies and a throw every 0.6 s',
        setup: () => {
          G.devArena(); G.state = 'play';
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
    ];
  }

  // runs every route at each quality; resolves with the report text
  run(qualities = ['medium', 'high']) {
    const G = this.g;
    if (this.running) return Promise.resolve(null);
    this.running = true;
    const snap = G.snapshot(), quality0 = G.settings.quality, state0 = G.state;
    G.benching = true; // (no saves while it runs; fixed settings: no automatic resolution)
    const auto0 = G.renderer.autoRes; G.renderer.setAutoRes(false);
    G.hideScreens?.(); G.setState('play');
    const plan = [];
    for (const q of qualities) for (const r of this.routes()) plan.push({ q, r });
    // breakdown: the street and the house at Medium, each with one cost taken away, to see what the GPU pays for
    const R = G.renderer, LP = G.lightPool, n0 = LP?.lights.length ?? 0;
    const variants = [
      { id: 'as is', apply() {}, undo() {} },
      { id: 'no shadows', apply() { R.renderer.shadowMap.enabled = false; }, undo() { R.applyDerived(); } },
      { id: 'no lamps', apply() { LP?.setSize(0); }, undo() { LP?.setSize(n0); } },
      { id: 'res x0.6', apply() { R.autoRes = true; R.dyn = 0.6; R.resize(); }, undo() { R.autoRes = false; R.dyn = 1; R.resize(); } },
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
        t += real;
        G.state = 'play';
        cur.r.drive(t, real);
        if (warm < WARM) { warm += real; maxWarm = Math.max(maxWarm, real * 1000); if (warm >= WARM) G.perf.reset(); return; }
        if (t >= WARM + (cur.short ? 4 : MEASURE)) {
          const s = G.perf.stats();
          const stalls = G.perf.buf.filter((f) => f.ms > 50).length;
          const R = G.renderer;
          const cfg = { pr: +R.renderer.getPixelRatio().toFixed(2), msaa: R.composer?.renderTarget1?.samples ?? 0, shadows: R.renderer.shadowMap.enabled, bloom: !!R.bloom?.enabled, lamps: G.lightPool?.lights.length ?? 0 };
          results.push({ q: cur.q, id: cur.r.id, label: cur.r.label, s, stalls, warmMaxMs: +maxWarm.toFixed(0), cfg, v: cur.v?.id });
          next();
        }
      };
      const finish = () => {
        cur?.v?.undo();
        G.benchTick = null; cur = null;
        if (G.settings.quality !== quality0) { G.settings.quality = quality0; G.applySettings(); }
        G.resetCombat('drop');
        G.applySave(snap);
        G.benching = false; G.renderer.setAutoRes(auto0);
        G.setState(state0 === 'title' ? 'play' : state0 === 'pause' ? 'play' : state0);
        this.running = false;
        const text = this.report(results);
        console.log(text);
        resolve(text);
      };
      next();
    });
  }

  report(results) {
    const G = this.g;
    const v = G.version || '?';
    const lines = [];
    lines.push(`LBA3: The Awakening benchmark · build ${v} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
    lines.push(`GPU (as reported by the browser): ${G.perf.gpu}`);
    lines.push(`window ${innerWidth}×${innerHeight} · devicePixelRatio ${devicePixelRatio} · user agent ${navigator.userAgent.match(/(Electron|Chrome)\/[\d.]+/g)?.join(' ') || navigator.userAgent}`);
    if (G.perf.load) lines.push(`startup: build ${(G.perf.load.total / 1000).toFixed(1)} s · shader preparation ${(G.perf.load.shaders / 1000).toFixed(1)} s`);
    let q = null;
    const brk = results.filter((x) => x.v);
    for (const x of results.filter((r) => !r.v)) {
      if (x.q !== q) {
        q = x.q; const c = x.cfg;
        lines.push('', `quality ${q}: render pixel ratio ${c.pr} · MSAA ${c.msaa}× · shadows ${c.shadows ? 'on' : 'off'} · bloom ${c.bloom ? 'on' : 'off'} · lamp lights ${c.lamps}`);
      }
      const s = x.s;
      if (!s) { lines.push(`  ${x.id}: no frames`); continue; }
      lines.push(`  ${x.id.padEnd(10)} ${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} p99 ${s.frameMs.p99} max ${s.frameMs.max} ms · stalls>50ms ${x.stalls}`
        + ` · sim CPU p50 ${s.simMs.p50} ms · render submit CPU p50 ${s.renderMs.p50} ms · draw calls ${s.calls} · triangles ${(s.tris / 1000).toFixed(0)}k · warm-up max ${x.warmMaxMs} ms`);
    }
    if (brk.length) {
      lines.push('', 'breakdown at Medium (one cost taken away at a time):');
      for (const x of brk) { const s = x.s; lines.push(`  ${(x.id + ' · ' + x.v).padEnd(24)} ${s ? `${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} ms · render pixel ratio ${x.cfg.pr}` : 'no frames'}`); }
    }
    lines.push('', `Frame time includes the GPU (the browser waits for it); "render submit" is CPU time only.`);
    return lines.join('\n');
  }
}
