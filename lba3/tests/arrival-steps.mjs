// ARRIVAL-STEPS (REPAIR-PASS-18-11 phase 5; docs/lba3-performance/PERFORMANCE_REPORT.md): a scene change's preparation
// behind the black screen in bounded steps. The user's GTX 1050 on battery showed black frames of 116–264 ms (shadow
// batches, draw batches, shader warm-up each in one frame). Automated runtime only (SwiftShader): this checks how the
// work is cut and that the result is the same, not the GTX 1050's times.
//   A. the staged build gives the same batches as the one-step build (an area not on show: Desert Island's shadow and
//      draw batches built in slices, then again in one step: cells, pieces, vertices, triangles alike)
//   B. cold arrivals (Zeelich, Desert Island, a Citadel interior), played frame by frame as a player gets them (the
//      game's own transition, 1/30 s steps): every slice of the shadow batches, draw batches, their settle and return,
//      and the shader warm-ups within SLICE_LIMIT ms (12 ms asked + one piece or cell; a slice that compiled a shader program
//      is reported apart: one program is the driver's unit), the big builds cut into several slices, the screen
//      revealed, and no batch build, cell rebuild or piece leaving a batch on the first frames in view.
// The texture layers' slices are printed, not judged: SwiftShader's first canvas read-back of an area waits for the
// browser's raster of its canvases (11–19 s here inside one read, after a first read by the test of 40–130 s).
import { launch, open, checker, done } from './lib/boot.mjs';
const SLICE_LIMIT = +(process.env.SLICE_LIMIT || 40);
const { browser, page } = await launch({ width: 960, height: 540 });
const { check } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); } catch {} });
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev(() => { game.settings.qualityAuto = false; game.settings.quality = 'medium'; game.applySettings(); });

// ---- A. the same batches, staged or in one step
const A = await ev(() => {
  const G = game, root = G.regions.built('desert').group, SC = G.shadowCull, DB = G.drawBatch;
  const sum = () => {
    const S = SC.areas.get(root), D = DB.areas.get(root);
    let sv = 0, si = 0; for (const p of S.proxies) { sv += p.geometry.attributes.position.count; si += p.geometry.index.count; }
    const d = D.stats();
    let di = 0; for (const C of D.cells.values()) if (C.mesh) di += C.mesh.geometry.index ? C.mesh.geometry.index.count : C.mesh.geometry.attributes.position.count;
    return { shadowCells: S.proxies.length, shadowMembers: S.members.length, shadowSolo: S.solo.length, shadowVerts: sv, shadowIdx: si, drawBatches: d.batches, drawPieces: d.pieces, drawVerts: d.verts, drawIdx: di };
  };
  const drop = () => { const S = SC.areas.get(root); S?.restore(); SC.areas.delete(root); const D = DB.areas.get(root); D?.restore(); DB.areas.delete(root); };
  drop();
  const sl = { shadow: [], draw: [] };
  SC.stage(root); for (;;) { const t = performance.now(), more = SC.slice(root, 12); sl.shadow.push(performance.now() - t); if (!more) break; }
  DB.stage(root); for (;;) { const t = performance.now(), more = DB.slice(root, 12); sl.draw.push(performance.now() - t); if (!more) break; }
  const staged = sum();
  drop();
  const t0 = performance.now(); SC.prepare(root); const t1 = performance.now(); DB.prepare(root); const t2 = performance.now();
  const one = sum();
  drop();   // (left unbuilt, as the benchmark's preparation leaves it: its visit is a first one)
  return { staged, one, slices: { shadow: sl.shadow.length, shadowMax: Math.round(Math.max(...sl.shadow)), draw: sl.draw.length, drawMax: Math.round(Math.max(...sl.draw)) }, oneStepMs: { shadow: Math.round(t1 - t0), draw: Math.round(t2 - t1) } };
});
check('A staged batches = one-step batches (Desert Island: shadow cells, members, vertices, indices; draw batches, pieces, vertices, indices)', JSON.stringify(A.staged) === JSON.stringify(A.one), A);
check('A the staged builds came in several slices', A.slices.shadow > 1 && A.slices.draw > 1, A.slices);

// ---- B. cold arrivals, frame by frame
await ev(() => {
  const G = game;
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  window.STEP = () => { G.testFreeze = false; try { G.advance(1 / 30); } finally { G.testFreeze = true; } };
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  for (let i = 0; i < 20; i++) window.STEP();
});
await ev((l) => { window.LIMIT = l; }, SLICE_LIMIT);
const room = await ev(() => ['tavern', 'pharmacy', 'school', 'library', 'bakery'].find((id) => game.regions.has(id) && !game.regions.built(id)) || ['tavern', 'pharmacy', 'school'].find((id) => game.regions.has(id)));
for (const id of ['zeelich', 'desert', room]) {
  const r = await ev(async (id) => {
    const G = game, DB = G.drawBatch, SC = G.shadowCull, yieldNow = () => new Promise((res) => setTimeout(res, 0));
    const i1 = G._prepN || 0;
    G.enterRoom(id, null, false, true);
    let frames = 0, black = 0, inView = [], seenView = 0;
    const jobs = () => ({ dbn: DB.builds || 0, sbn: SC.builds || 0, left: DB.left || 0, scl: SC.left });
    while (frames++ < 600) {
      const a = jobs(); window.STEP(); const b = jobs();
      const op = G._fadeOp ?? 0, isBlack = op >= 0.999 || !!G.trans?.hold;
      if (isBlack) black++;
      else if (seenView++ < 30) { const d = []; if (b.dbn > a.dbn) d.push('draw batches built'); if (b.sbn > a.sbn) d.push('shadow batches built'); if (b.left > a.left) d.push(`${b.left - a.left} pieces left draw batches`); if (d.length) inView.push(`${seenView}: ${d.join(', ')}`); }
      if (!G.trans && seenView > 30) break;
      if (frames % 10 === 0) await yieldNow();
    }
    const L = (G.prepLog || []).filter((e) => (e.i ?? 0) > i1);
    // (texture layers: printed, not judged — its first canvas read-back waits for the browser's raster of the area's
    //  canvases, 11–19 s on SwiftShader whatever the slice; the game's own work there is one read per piece)
    const kinds = new Set(['shadow batches', 'draw batches', 'draw batches settle', 'draw batches back', 'shader warm-up', 'shader warm-up (early)']);
    const by = {}; for (const e of L) { const v = (by[e.k] ??= { n: 0, max: 0, total: 0, prog: 0 }); v.n++; v.total += e.ms; if (e.p) v.prog++; else v.max = Math.max(v.max, e.ms); }
    const over = L.filter((e) => kinds.has(e.k) && !e.p && e.ms > window.LIMIT);
    const progSteps = L.filter((e) => e.p).map((e) => `${e.k} ${e.ms} ms (+${e.p} program${e.p > 1 ? 's' : ''})`);
    return { id, frames, black, revealed: !G.trans, room: G.room?.id, steps: L.length, by, over: over.map((e) => `${e.k} ${e.ms}`), progSteps, inView };
  }, id);
  console.log(`  ${id}: ${r.frames} frames, ${r.black} black · ${r.steps} steps · ` + Object.entries(r.by).map(([k, v]) => `${k} ${v.n}×, longest ${v.max} ms${v.prog ? ` (+${v.prog} with programs)` : ''}`).join(' · '));
  if (r.progSteps.length) console.log(`    steps that compiled programs: ${r.progSteps.join(' · ')}`);
  check(`B ${id}: the arrival came through (in the area, the screen revealed)`, r.revealed && r.room === id, { room: r.room, revealed: r.revealed });
  check(`B ${id}: every batch / settle / layer / warm-up slice ≤ ${SLICE_LIMIT} ms`, r.over.length === 0, r.over);
  check(`B ${id}: no batch build or piece leaving a batch on the first 30 frames in view`, r.inView.length === 0, r.inView);
  if (id === 'zeelich') check('B zeelich: its shadow and draw batches built in several slices', (r.by['shadow batches']?.n ?? 0) > 1 && (r.by['draw batches']?.n ?? 0) > 1, r.by);
}
await browser.close();
done();
