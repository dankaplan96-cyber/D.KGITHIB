(async () => {
  // FIRST-BUILD: the draw-batch first build, the baseline's drawbatch.js against this build's, interleaved in ONE page
  // (the same areas, the same moment's machine load: this container is shared, so separate runs differ by 2-3x).
  // W_BASEMOD: the baseline's drawbatch.js copied next to this build's (default src/engine/drawbatch.base.js: the same
  // merge.js, texarray.js and three as this build's). Per area: REPS
  // alternating builds of each (each built, timed, its batches dropped), the minimum and median of each phase.
  const G = game, SEQ = String(window.SEQ || 'house,zeelich,desert,hamalayi').split(','), REPS = +(window.REPS || 8);
  const B = await import(String(window.BASEMOD || './src/engine/drawbatch.base.js'));
  const C = await import('./src/engine/drawbatch.js');
  const out = [`draw-batch first build, baseline (${window.BASEMOD || './src/engine/drawbatch.base.js'}) vs this build, interleaved, ${REPS} each · ${G.settings.quality}`];
  const res = {};
  const st = (a) => { const v = a.slice().sort((x, y) => x - y); return { min: +v[0].toFixed(1), med: +v[v.length >> 1].toFixed(1) }; };
  for (const id of SEQ) {
    G.regions.ensure(id, 'probe');
    const root = G.rooms[id].group;
    G.shadowCull.prepare(root);
    for (const _ of C.warmLayers(root, true));
    for (const _ of B.warmLayers(root, true));
    const own = G.drawBatch.areas.get(root); if (own) { own.restore(); G.drawBatch.areas.delete(root); }
    const T = { base: { ms: [], build: [], order: [], plane: [] }, after: { ms: [], build: [], order: [], plane: [] } };
    for (let r = 0; r < REPS * 2; r++) {
      const which = r % 2 === 0 ? 'base' : 'after', M = which === 'base' ? B : C;
      const D = new M.DrawBatch();
      const t0 = performance.now(); D.update(root); const ms = performance.now() - t0;
      const A = D.areas.get(root), p = A.prof || {}, d = A.dbg || {};
      T[which].ms.push(ms); T[which].build.push(p.build || 0); T[which].order.push(p.order || 0); T[which].plane.push(d.planeMs || 0);
      D.reset();
      await new Promise((r2) => setTimeout(r2, 30));
    }
    res[id] = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([q, a]) => [q, st(a)]))]));
    const f = (k) => `min ${res[id].base[k].min} → ${res[id].after[k].min} (median ${res[id].base[k].med} → ${res[id].after[k].med})`;
    out.push(`${id}: whole build ms ${f("ms")} · cell build ms ${f("build")} · order ms (incl. planes) ${f("order")} · planes ms ${f("plane")}`);
  }
  return { text: out.join('\n'), res };
})()
