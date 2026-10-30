// FRAME-1: main-thread time of every frame on the benchmark's routes (street, interior, combat, transition) and on a
// door walk (house ↔ cellar ↔ house ↔ out), simulated at 60 Hz and drawn every frame. Before each frame the software
// GPU's queue is drained, so the timed part is this page's own work (simulation + render submission + uploads),
// never GPU time. Per frame: ms, render ms, new geometries / textures / programs (first-draw uploads, compiles),
// JS heap change (precise memory info; a drop is a GC). Long frames are listed with what happened in them.
//   GAME_URL=http://localhost:8171/ Q=low|medium FRAMES=180 [ROUTES=street,...] [OUT=file.json] node framelog.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/', Q = process.env.Q || 'low', FR = +(process.env.FRAMES || 180);
const W = +(process.env.W || 1366), H = +(process.env.H || 768);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript((q) => { try { if (!localStorage.getItem('fl_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('fl_q', q); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 600000 });
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
const out = { q: Q, viewport: `${W}x${H}`, routes: {} };
for (const id of (process.env.ROUTES || 'street,interior,combat,transition,doors').split(',')) {
  const r = await page.evaluate(async ({ id, FR }) => {
    const G = game, R = G.renderer.renderer, gl = R.getContext(), info = R.info;
    // real warm-ups (warmScene / warmGraphics) run, but the page's own loop stays off: `preparing` stops it
    G.testFreeze = false; G.preparing = true;
    let drive;
    if (id === 'doors') {
      // a walk through doors as a player: house door from outside, cellar, back up, out
      G.exitRoom({ x: -45.6, z: 84, a: Math.PI }, true); G.state = 'play';
      const seq = [() => G.enterRoom('house'), () => G.enterRoom('cellar'), () => G.enterRoom('house'), () => G.exitRoom({ x: -45.6, z: 84, a: Math.PI })];
      let k = 0, next = 0.5; drive = (t) => { if (t >= next && !G.trans && k < seq.length) { seq[k++](); next = t + 1.2; } };
    } else {
      const route = G.bench.routes().find((x) => x.id === id);
      G.state = 'play'; route.setup(); G.state = 'play'; drive = (t, dt) => route.drive(t, dt);
    }
    const mem = () => performance.memory?.usedJSHeapSize ?? 0;
    // bytes of geometry the GPU sees for the first time (a buffer upload in that frame)
    // (three's WebGLGeometries adds its 'dispose' listener to a geometry exactly when it first takes it to the GPU:
    // that moment is counted, with the geometry's bytes. One hook on EventDispatcher, one counter on window)
    window.__upB = 0;
    if (!window.__regHook) {
      window.__regHook = true;
      let P = Object.getPrototypeOf(G.hero.rig.root.getObjectByProperty('isMesh', true).geometry); while (P && !Object.prototype.hasOwnProperty.call(P, 'addEventListener')) P = Object.getPrototypeOf(P);
      const add = P.addEventListener;
      P.addEventListener = function (type, fn) {
        if (type === 'dispose' && this.isBufferGeometry && !this._listeners?.dispose?.length) { let b = 0; for (const k in this.attributes) b += this.attributes[k].array?.byteLength || 0; if (this.index) b += this.index.array.byteLength; window.__upB += b; }
        return add.call(this, type, fn);
      };
    }
    window.__getUp = () => { const b = window.__upB; window.__upB = 0; return b; };
    const rows = []; let t = 0;
    gc?.();
    for (let i = 0; i < FR; i++) {
      const dt = 1 / 60; t += dt;
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // (drain the software GPU)
      await new Promise((r) => setTimeout(r, 0));   // (lets compileAsync / holds resolve, as between real frames)
      const g0 = info.memory.geometries, x0 = info.memory.textures, p0 = info.programs.length, m0 = mem(), tr0 = G.trans ? { called: G.trans.called, hold: G.trans.hold } : null;
      window.__getUp();
      const t0 = performance.now();
      drive(t, dt);
      G.perf.beginFrame(); G._renderMs = 0; G._transBudget = dt;
      G.frame(dt, true);
      const ms = performance.now() - t0;
      const T = G.trans;
      rows.push({ i, ms: +ms.toFixed(2), render: +G._renderMs.toFixed(2), calls: info.render.calls, upKB: +(window.__getUp() / 1024).toFixed(1), geo: info.memory.geometries - g0, tex: info.memory.textures - x0, prog: info.programs.length - p0, heap: mem() - m0,
        ev: [tr0 && !tr0.called && T?.called ? 'swap' : '', T?.hold ? 'hold' : '', !T && tr0 ? 'trans-end' : ''].filter(Boolean).join(','), room: G.room?.id || 'citadel' });
    }
    G.preparing = false; G.testFreeze = true;
    const ms = rows.map((x) => x.ms).slice().sort((a, b) => a - b), q = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
    const drawn = rows.filter((x) => x.render > 0);
    const med = ms[Math.floor(ms.length / 2)];
    const long = rows.filter((x) => x.ms > Math.max(2 * med, med + 8));
    const heapUp = rows.filter((x) => x.heap > 0).map((x) => x.heap), gcs = rows.filter((x) => x.heap < -1e6);
    return { frames: rows.length, drawn: drawn.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: ms[ms.length - 1], over33: rows.filter((x) => x.ms > 33.3).length, over50: rows.filter((x) => x.ms > 50).length,
      allocMedKB: heapUp.length ? +(heapUp.slice().sort((a, b) => a - b)[Math.floor(heapUp.length / 2)] / 1024).toFixed(1) : null, allocKBperFrame: heapUp.length ? +((heapUp.reduce((a, b) => a + b, 0) / rows.length) / 1024).toFixed(1) : null, gcFrames: gcs.length,
      upKBafterFirst: +rows.slice(1).reduce((a, x) => a + x.upKB, 0).toFixed(0), upKBmaxFrame: Math.max(...rows.slice(1).map((x) => x.upKB)), newGeo: rows.reduce((a, x) => a + x.geo, 0), newTex: rows.reduce((a, x) => a + x.tex, 0), newProg: rows.reduce((a, x) => a + x.prog, 0),
      long: long.slice(0, 25), rows };
  }, { id, FR });
  const { rows, ...sum } = r;
  out.routes[id] = r;
  console.log(`${Q} ${id.padEnd(10)} p50 ${sum.p50} p95 ${sum.p95} p99 ${sum.p99} max ${sum.max} ms · >33ms ${sum.over33} · >50ms ${sum.over50} · alloc mean ${sum.allocKBperFrame} / median ${sum.allocMedKB} KB/frame · GC frames ${sum.gcFrames} · new geo ${sum.newGeo} tex ${sum.newTex} prog ${sum.newProg} · uploads after frame 0 ${sum.upKBafterFirst} KB (max ${sum.upKBmaxFrame} KB in a frame)`);
  for (const x of sum.long) console.log(`   long frame #${x.i} ${x.ms} ms (render ${x.render}) up ${x.upKB} KB geo+${x.geo} tex+${x.tex} prog+${x.prog} heap ${(x.heap / 1024).toFixed(0)} KB ${x.ev} ${x.room}`);
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out));
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
