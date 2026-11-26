(async () => {
  // FIRST-BUILD: where an area's first draw-batch build goes (drawbatch.js Area: prof = scan / order / assign / arrays /
  // build, dbg = overlapRuns' parts, planes, placement), each area built on its own while not on show: the region
  // built (regions.ensure), its shadow batches, its texture layers read (timed apart: a canvas read-back each), then
  // its draw batches, REPS times (the batches dropped between: restore()). SEQ: areas (default house,zeelich,desert,hamalayi).
  const G = game, SEQ = String(window.SEQ || 'house,zeelich,desert,hamalayi').split(','), REPS = +(window.REPS || 2);
  const out = [`draw-batch first builds · ${G.settings.quality} · exact ${G.drawBatch.exact} · overlap order kept`];
  const res = {};
  for (const id of SEQ) {
    // (W_SEED: Math.random reseeded before each area's build, so two builds of the game build the same area)
    if (window.SEED) { let a = (+window.SEED + SEQ.indexOf(id)) >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const t0 = performance.now(); G.regions.ensure(id, 'probe'); const tb = performance.now() - t0;
    const root = G.rooms[id].group;
    const t1 = performance.now(); G.shadowCull.prepare(root); const ts = performance.now() - t1;
    const { warmLayers } = await import('./src/engine/drawbatch.js');
    const t2 = performance.now(); for (const _ of warmLayers(root, true)); const tl = performance.now() - t2;
    const runs = [];
    for (let r = 0; r < REPS; r++) {
      const A0 = G.drawBatch.areas.get(root); if (A0) { A0.restore(); G.drawBatch.areas.delete(root); }
      const t3 = performance.now(); const A = G.drawBatch.prepare ? G.drawBatch.prepare(root) : (G.drawBatch.update(root), G.drawBatch.areas.get(root)); const ms = performance.now() - t3;
      const st = A.stats(), d = A.dbg || {};
      // (the batches' content: every cell's key, place in the order, material and vertex / index data, hashed — two builds
      //  that make the same batches give the same hash)
      //  (material ids and uuids differ between runs: each cell's geometry and piece count only, the cells' hashes sorted)
      const hs = [];
      for (const C of A.cells.values()) {
        if (!C.mesh) continue;
        let h = 2166136261 >>> 0; const mix = (x) => { h = Math.imul(h ^ (x >>> 0), 16777619) >>> 0; };
        mix(C.list.length); mix(C.mesh.renderOrder); mix(C.mesh.receiveShadow ? 1 : 0); for (const ch of C.mesh.material.type) mix(ch.charCodeAt(0));
        const g = C.mesh.geometry;
        for (const n of Object.keys(g.attributes).sort()) { for (const ch of n) mix(ch.charCodeAt(0)); const a = g.attributes[n].array, u = new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2); for (let i = 0; i < u.length; i++) mix(u[i]); }
        const I = g.index.array; for (let i = 0; i < I.length; i++) mix(I[i]);
        hs.push(h); (C.__h = h);
      }
      // (and the batches' order in the draw: cells by their place in three's opaque sort, their hashes in that order)
      const ordered = [...A.cells.values()].filter((C) => C.mesh).sort((x, y) => ((x.mesh.__sortId ?? x.mesh.material.id) - (y.mesh.__sortId ?? y.mesh.material.id)) || x.__h - y.__h);
      let ho = 2166136261 >>> 0; for (const C of ordered) ho = Math.imul(ho ^ C.__h, 16777619) >>> 0;
      hs.sort((x, y) => x - y); let h = 2166136261 >>> 0; for (const x of hs) h = Math.imul(h ^ x, 16777619) >>> 0;
      runs.push({ hash: h.toString(16), order: ho.toString(16), cells: hs.length, ms: +ms.toFixed(1), prof: st.prof, batches: st.batches, pieces: st.pieces, verts: st.verts, planeMs: +(d.planeMs || 0).toFixed(1), planeTris: d.planeTris, placeMs: +(d.placeMs || 0).toFixed(1), partsMs: +(d.partsMs || 0).toFixed(1), fixedMs: +(d.fixedMs || 0).toFixed(1), parts: d.parts, joined: d.joined, byFixed: d.byFixed, byPlaced: d.byPlaced });
      await new Promise((r2) => setTimeout(r2, 50));
    }
    res[id] = { regionBuild: Math.round(tb), shadowBatches: Math.round(ts), layers: Math.round(tl), runs };
    out.push(`${id}: region build ${tb.toFixed(0)} ms · shadow batches ${ts.toFixed(0)} ms · texture layers ${tl.toFixed(0)} ms · draw batches ${runs.map((x) => x.ms).join(' / ')} ms`);
    for (const x of runs) out.push(`   ${JSON.stringify(x)}`);
  }
  return { text: out.join('\n'), res };
})()
