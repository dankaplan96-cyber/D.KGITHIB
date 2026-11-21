// ARRIVAL-2 probe: cold arrivals (as tests/arrival-steps.mjs B), every staged unit >= MINU ms recorded with the label it
// started after and the label it ended on, and for cell units the cell (key, pieces, vertices).
//   GAME_URL=http://localhost:8195/ AREAS=zeelich,room node units.mjs
import { launch, open } from '/home/user/D.KGITHIB/.claude/worktrees/agent-a9cb06280a984a6cd/lba3/tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); } catch {} });
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev(() => { game.settings.qualityAuto = false; game.settings.quality = 'medium'; game.applySettings(); });
if (process.env.TRACE) await browser.startTracing(page, { path: process.env.TRACE, categories: ['devtools.timeline', 'v8', 'blink.user_timing', 'disabled-by-default-v8.gc', 'blink_gc'] });
await ev(async (minu) => {
  const G = game, U = (window.U = []), TA = await import('/src/engine/texarray.js');
  window.CUR = null;
  { const i0 = TA.TEXARRAY.init; TA.TEXARRAY.init = (t) => { const t0 = performance.now(); i0(t); (window.INITS ??= []).push({ name: t.name, ms: +(performance.now() - t0).toFixed(1), at: +t0.toFixed(0) }); }; }
  const wrap = (g, tag) => { if (!g || g.__w) return g; let prev = 'start'; return { __w: true, next() { window.CUR = null; const a0 = TA.arrays().map((x) => x.key + ':' + x.layers).join(' '); const t = performance.now(), r = g.next(), dt = performance.now() - t; const lab = r.done ? 'end' : r.value; if (dt >= 12) try { performance.measure(`UNIT ${tag} ${prev}>${lab} ${dt.toFixed(1)}`, { start: t, end: t + dt }); } catch {} if (dt >= minu) U.push({ area: G.room?.id || 'citadel', tag, from: prev, to: lab, ms: +dt.toFixed(1), cell: window.CUR, arrays: lab === 'array' ? a0 : undefined }); prev = lab; return r; }, [Symbol.iterator]() { return this; } }; };
  for (const [obj, tag] of [[G.drawBatch, 'draw'], [G.shadowCull, 'shadow']]) {
    for (const fn of ['slice', 'settleSlice', 'readmitSlice']) {
      const f = obj[fn]; if (!f) continue;
      obj[fn] = function (root, ms) {
        const P = this.pending?.get(root); if (P?.gen) P.gen = wrap(P.gen, tag + ' build');
        const A = this.areas.get(root);
        if (A) { if (fn === 'settleSlice') { A.settling ??= A.settle(); A.settling = wrap(A.settling, tag + ' settle'); } if (fn === 'readmitSlice' && A.readmitSteps) { A.readmitting ??= A.readmitSteps(); A.readmitting = wrap(A.readmitting, tag + ' back'); } }
        return f.call(this, root, ms);
      };
    }
  }
  // the cell a unit works on (both Area classes' buildSteps)
  const patchCells = (A, tag) => { const P = Object.getPrototypeOf(A); if (P.__pc) return; P.__pc = true; const b = P.buildSteps; P.buildSteps = function* (C) { const info = () => ({ tag, key: String(C.key ?? C.id ?? '?').slice(0, 90), n: (C.list || C.members || [])?.length, mesh: C.mesh?.geometry?.attributes?.position?.count }); const it = b.call(this, C); for (;;) { window.CUR = info(); const r = it.next(); window.CUR = info(); if (r.done) return r.value; yield r.value; } }; };
  const st = G.drawBatch.stage.bind(G.drawBatch); G.drawBatch.stage = (root) => { const r = st(root); const A = G.drawBatch.pending?.get(root); if (A) patchCells(A, 'draw'); return r; };
  const st2 = G.shadowCull.stage.bind(G.shadowCull); G.shadowCull.stage = (root) => { const r = st2(root); const A = G.shadowCull.pending?.get(root); if (A) patchCells(A, 'shadow'); return r; };
}, +(process.env.MINU || 8));
await ev(() => {
  const G = game, route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  window.STEP = () => { G.testFreeze = false; try { G.advance(1 / 30); } finally { G.testFreeze = true; } };
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  for (let i = 0; i < 20; i++) window.STEP();
});
const room = await ev(() => ['tavern', 'pharmacy', 'school', 'library', 'bakery'].find((id) => game.regions.has(id) && !game.regions.built(id)) || ['tavern', 'pharmacy', 'school'].find((id) => game.regions.has(id)));
for (const id of (process.env.AREAS || 'zeelich,room').replace('room', room).split(',')) {
  const r = await ev(async (id) => {
    const G = game, i1 = G._prepN || 0, u0 = window.U.length; globalThis.__PD = [];
    if (id === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); else G.enterRoom(id, null, false, true);
    let frames = 0, seen = 0, waited = 0; const fr = [];
    while (frames++ < 600) {
      if (G.trans?.building && waited < 240000) { frames--; await new Promise((res) => setTimeout(res, 50)); waited += 50; continue; }
      const pl0 = (G.prepLog || []).length, t0 = performance.now(); window.STEP(); const ms = performance.now() - t0;
      const op = G._fadeOp ?? 0, black = op >= 0.999 || !!G.trans?.hold;
      const st = (G.prepLog || []).slice(pl0).map((e) => `${e.k} ${e.ms}${e.p ? ` +${e.p}p` : ''}${e.u ? ` [${e.u.label} ${e.u.ms}]` : ''}`).join(' + ');
      fr.push({ ms: Math.round(ms), black, st });
      if (!black) seen++;
      if (!G.trans && seen > 30) break;
      if (frames % 10 === 0) await new Promise((res) => setTimeout(res, 0));
    }
    const L = (G.prepLog || []).filter((e) => (e.i ?? 0) > i1);
    return { id, steps: L.map((e) => `${e.k} ${e.ms}${e.p ? ` +${e.p}p` : ''}${e.u ? ` [${e.u.label} ${e.u.ms}]` : ''}`), units: window.U.slice(u0), frames: fr, inits: (window.INITS || []).splice(0), pd: (globalThis.__PD || []).sort((a, b) => b.ms - a.ms).slice(0, 15), dbg: [...G.drawBatch.areas.values()].map((A) => A.dbg).filter(Boolean).pop() };
  }, id);
  console.log(`== ${id}`);
  console.log('steps: ' + r.steps.join(' | '));
  console.log('place parts > 2 ms: ' + r.pd.map((x) => JSON.stringify(x)).join('\n   '));
  console.log('dbg ' + JSON.stringify(r.dbg));
  console.log('array inits: ' + JSON.stringify(r.inits));
  console.log('units >= MINU:');
  for (const u of r.units.sort((a, b) => b.ms - a.ms).slice(0, 25)) console.log('  ' + JSON.stringify(u));
  console.log('frames > 40 ms: ' + r.frames.map((f, i) => ({ ...f, i })).filter((f) => f.ms > 40).map((f) => `#${f.i} ${f.ms}${f.black ? 'B' : 'V'} ${f.st}`).join('\n   '));
  const B = r.frames.filter((f) => f.black);
  console.log(`black frames ${B.length}, longest black ${Math.max(0, ...B.map((f) => f.ms))}, longest in view ${Math.max(0, ...r.frames.filter((f) => !f.black).map((f) => f.ms))}`);
}
if (process.env.TRACE) await browser.stopTracing();
await browser.close();
