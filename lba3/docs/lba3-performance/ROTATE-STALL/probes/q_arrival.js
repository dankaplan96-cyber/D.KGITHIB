(async () => {
  // ROTATE-STALL (B): region entry frame by frame, as play (the game's own transition: fade, black, warm-up, settle
  // frames), stepped by hand at 1/30 s (testFreeze off inside each step, so every scene-change path runs as a player gets
  // it). Visits SEQ (default Zeelich, Desert, the Hamalayi, Citadel) CYCLES times: the first visit of each is cold (its
  // draw batches, shadow batches, uploads and cache on that visit), the next ones repeat visits. Per frame from the scene
  // change's start to 2 s after the fade cleared: CPU ms, black or in view (the fade's opacity), the jobs in it (draw /
  // shadow batch builds and ms, cache full builds, programs, geometries, textures, uploads) and its draw calls.
  const G = game, R = G.renderer.renderer, C = G.shadowCache, DB = G.drawBatch, SC = G.shadowCull;
  const DT = 1 / 30, SEQ = (window.SEQ || 'zeelich,desert,hamalayi,citadel').split(','), CYCLES = +(window.CYCLES || 2);
  if (window.FOLLOW) G.bench.setCamera('follow');
  // (OFF=1: this task's changes switched off, the A/B baseline in the same build)
  if (window.OFF) { G.skelUp = false; G.shadowCache.initSpare = false; G.shadowCache.pool2 = false; G.revealReady = false; }
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const yieldNow = () => new Promise((r) => setTimeout(r, 0));
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  for (let i = 0; i < 30; i++) step();
  const ctr = () => { const j = G.jobCounters(); return { db: j.db, dbn: j.dbn, sb: j.sb, sbn: j.sbn, sc: j.sc, p: j.p, g: j.g, x: j.x, rt: j.rt, sl: C.stats.sliced, dbl: DB.left || 0, scl: SC.left || 0 }; };
  // (first uploads by draw: a drawn geometry three had not seen, and texture storage made, with the object being drawn)
  const firsts = []; let drawing = null; const gl = R.getContext();
  const own = (o) => { const n = []; for (let q = o; q && n.length < 2; q = q.parent) if (q.name) n.push(q.name); return `${o.isSkinnedMesh ? 'Skinned' : o.isInstancedMesh ? 'Instanced' : o.isBatchedMesh ? 'Batched' : o.type}:${n.join('<') || '?'}${o.userData?.src ? '@' + o.userData.src : ''}`; };
  { const rb = R.renderBufferDirect; R.renderBufferDirect = function (cam, sc, geo, mat, obj) { if (geo && !(geo._listeners?.dispose || []).length) firsts.push(`geo ${own(obj)} ${geo.attributes?.position?.count ?? '?'}v${sc === null ? ' (shadow)' : ''}`); drawing = obj; try { return rb.apply(this, arguments); } finally { drawing = null; } }; }
  { const srt = R.setRenderTarget; R.setRenderTarget = function (t) { const d0 = drawing; if (t) drawing = { rt: t }; try { return srt.apply(this, arguments); } finally { drawing = d0; } }; }
  for (const fn of ['texImage2D', 'texStorage2D', 'texImage3D', 'texStorage3D']) { const f = gl[fn]; gl[fn] = function (...a) { const w = fn.startsWith('texStorage') ? a[3] : typeof a[3] === 'number' ? a[3] : a[a.length - 1]?.width; const hh = fn.startsWith('texStorage') ? a[4] : typeof a[4] === 'number' ? a[4] : a[a.length - 1]?.height; firsts.push(`tex ${w}x${hh} ${drawing?.rt ? 'render target ' + (drawing.rt.texture?.name || '?') : drawing ? 'drawing ' + own(drawing) : 'outside a draw'}`); return f.apply(this, a); }; }
  const L = [`ROTATE-STALL arrival · ${G.settings.quality} · battery ${G.renderer.battery} · camera ${G.camRig.mode} · ${SEQ.join(' → ')} × ${CYCLES}`];
  const seen = new Set();
  for (let c = 0; c < CYCLES; c++) for (const id of SEQ) {
    const cold = !seen.has(id); seen.add(id);
    if (id === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); else G.enterRoom(id, null, false, true);
    const rows = []; let after = -1, t0all = performance.now(), blackMs = 0, n = 0;
    while (n++ < 400) {
      for (const A of DB.areas.values()) if (!A.__rel) { A.__rel = true; const r0 = A.release.bind(A); A.release = (M) => { if (!M.out) { const o = M.o, m = o.material, why = [o.visible ? '' : 'hidden', o.parent ? '' : 'removed', m === M.material ? '' : 'material swapped', o.castShadow ? 'casts' : '', o.receiveShadow === M.rs ? '' : 'receive changed', o.matrixWorld.equals(M.mat) ? '' : 'moved', o.geometry === M.geo ? '' : 'geometry swapped'].filter(Boolean); let up = ''; for (let q = o.parent; q && q !== G.scene; q = q.parent) if (!q.visible) { up = 'parent hidden: ' + (q.name || q.type); break; } firsts.push(`left draw batch: ${own(o)} at ${o.getWorldPosition(new o.position.constructor()).toArray().map((x) => x.toFixed(1)).join(',')} [${why.join(', ') || up || 'look (colour / roughness / map) changed'}] mat ${m?.name || m?.type} opacity ${m?.opacity} transparent ${m?.transparent} color ${m?.color?.getHexString?.()} emissive ${m?.emissive?.getHexString?.()}`); } return r0(M); }; }
      firsts.length = 0; const a = ctr(), t0 = performance.now(); step(); const ms = performance.now() - t0, b = ctr();
      const f = G.perf.buf[(G.perf.i + G.perf.buf.length - 1) % G.perf.buf.length] || {};
      const op = G._fadeOp ?? 0, black = op >= 0.999 || !!G.trans?.hold;
      if (black) blackMs += ms;
      const d = []; if (b.dbn > a.dbn) d.push(`draw batches built ${(b.db - a.db).toFixed(0)} ms`); if (b.sbn > a.sbn) d.push(`shadow batches built ${(b.sb - a.sb).toFixed(0)} ms`);
      if (b.sc > a.sc) d.push('cache full build'); if (b.sl > a.sl) d.push('cache slice'); if (b.p > a.p) d.push(`+${b.p - a.p} programs`); if (b.g !== a.g) d.push(`${b.g - a.g >= 0 ? '+' : ''}${b.g - a.g} geometries`);
      if (b.x !== a.x) d.push(`${b.x - a.x >= 0 ? '+' : ''}${b.x - a.x} textures${b.rt !== a.rt ? ` (${b.rt - a.rt} render targets)` : ''}`); if (b.dbl > a.dbl) d.push(`${b.dbl - a.dbl} pieces left draw batches`); if (b.scl > a.scl) d.push(`${b.scl - a.scl} pieces left shadow batches`);
      if (f.up) d.push(`uploads ${f.up} (${(f.upKB || 0).toFixed(0)} KB)`);
      if (!black && firsts.length) { const m = new Map(); for (const x of firsts) m.set(x, (m.get(x) || 0) + 1); d.push('FIRST IN VIEW: ' + [...m].map(([k2, n2]) => (n2 > 1 ? n2 + '× ' : '') + k2).join(' · ')); }
      else if (firsts.length) { const m = new Map(); for (const x of firsts) m.set(x, (m.get(x) || 0) + 1); d.push(`${firsts.length} first uploads by draws behind black: ` + [...m].slice(0, +(window.NF || 12)).map(([k2, n2]) => (n2 > 1 ? n2 + '× ' : '') + k2).join(' · ')); }
      rows.push(`  ${String(rows.length).padStart(3)} ${ms.toFixed(0).padStart(5)} ms ${black ? 'BLACK' : 'view '.padEnd(5)} op ${op.toFixed(2)} calls ${f.calls ?? '-'}${G.trans?.hold ? ' hold' : ''} ${d.join(', ')}`);
      if (!G.trans && after < 0) after = 0;
      if (after >= 0 && ++after > 60) break;
      if (rows.length % 10 === 0) await yieldNow();
    }
    const total = performance.now() - t0all;
    L.push(`${id} (${cold ? 'cold' : 'repeat'}): ${rows.length} frames, ${total.toFixed(0)} ms in all, ${blackMs.toFixed(0)} ms of it with the screen black`);
    // (every frame of the change until the fade cleared, then only frames with jobs or calls jumps)
    for (const r of rows) if (/BLACK|op 0\.[1-9]|build|program|geometr|texture|left|FIRST/.test(r)) L.push(r);
  }
  G.benchTick = null;
  return L.join('\n');
})()
