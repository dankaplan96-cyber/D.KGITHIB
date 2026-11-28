(async () => {
  // P87c: how often Desert Island's off-the-wall slate and sand canvases are repainted in play, and what it costs.
  // The game's own scene changes (each area built on its first visit, under the loading card), from the loaded save:
  // ROUTE (default below). Per visit: OW.score / OW.marks calls, real repaints (the canvas texture's version moved),
  // ms inside those calls, and the two canvases sent to the GPU (count, KB at mip 0, ms inside texImage2D).
  // Then the story's own change on the island (the board moved, a ring counted): the slate and the sand must follow.
  const G = game, R = G.regions, DT = 1 / 30;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  const L = [];
  // ---- instrumentation
  let OW = null, slate = null, sand = null; const cv = new Map();   // canvas -> 'slate' | 'sand'
  let st = null; const zero = () => ({ calls: 0, paints: 0, ms: 0, maxMs: 0, sends: 0, sendKB: 0, sendMs: 0 });
  const ver = () => (slate?.source.version || 0) + (sand?.source.version || 0);
  const hook = () => {
    if (OW || !R.built('desert')?.offwall) return;
    OW = R.built('desert').offwall;
    OW.root.traverse((o) => { const m = o.material?.map; if (!m?.isCanvasTexture && !m?.image?.getContext) return; if (m.image.width === 512 && m.image.height === 320) slate = m; else if (o.renderOrder === 1) sand = m; });
    cv.set(slate.image, 'slate'); cv.set(sand.image, 'sand');
    for (const k of ['score', 'marks']) { const f = OW[k]; OW[k] = function (...a) { const v0 = ver(), t0 = performance.now(); const r = f.apply(this, a); const ms = performance.now() - t0; if (window.__stk) { const fr = (new Error().stack || '').split('\n').slice(2, 7).map((x) => x.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/(src\/)?/, '').replace(/\)$/, '')).join(' < '); window.__stk.set(fr, (window.__stk.get(fr) || 0) + 1); } if (st) { st.calls++; st.ms += ms; st.maxMs = Math.max(st.maxMs, ms); if (ver() !== v0) st.paints++; } return r; }; }
  };
  const gl = G.renderer.renderer.getContext();
  for (const fn of ['texImage2D', 'texSubImage2D']) { const f = gl[fn]; gl[fn] = function (...a) { const img = a[a.length - 1]; if (!cv.has(img)) return f.apply(this, a); const t0 = performance.now(); const r = f.apply(this, a); if (st) { st.sends++; st.sendKB += img.width * img.height * 4 / 1024; st.sendMs += performance.now() - t0; } return r; }; }
  // ---- one scene change: from the call until 1 s after the fade cleared
  const visit = async (go) => {
    let worst = 0, n = 0, after = -1, frames = 0;
    go();
    while (n++ < 600) {
      if (G.trans?.building) { n--; await new Promise((r) => setTimeout(r, 30)); continue; }
      hook();
      const t0 = performance.now(); step(); worst = Math.max(worst, performance.now() - t0); frames++;
      if (!G.trans && after < 0) after = 0;
      if (after >= 0 && ++after > 30) break;
      if (frames % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    return { worst: Math.round(worst), frames };
  };
  L.push(`P87c off-the-wall probe · ${G.settings.quality} · start room ${G.room?.id ?? 'citadel'} · chapter ${G.story.cur?.key} · court open ${G.story.offwall.open}`);
  hook(); for (let i = 0; i < 20; i++) step();
  const ROUTE = (window.ROUTE || 'school,desert,wtent,desert,zeelich,sewer,zeelich,desert,citadel,tavern,citadel,bazoo,citadel,desert').split(',');
  const T = zero(); const seen = new Set([G.room?.id ?? 'citadel']);
  for (const id of ROUTE) {
    const was = id === 'citadel' ? 'built' : R.stateOf(id), first = !seen.has(id); seen.add(id);
    st = zero();
    const r = await visit(() => (id === 'citadel' ? G.exitRoom({ x: -42, z: 2, a: 0 }, false, true) : G.enterRoom(id, null, false, true)));
    for (const k in T) T[k] += st[k];
    L.push(`${id.padEnd(9)} ${first ? 'first  ' : 'revisit'} (was ${was}): OW calls ${st.calls}, repaints ${st.paints}, ${st.ms.toFixed(1)} ms in them (max ${st.maxMs.toFixed(1)}), canvases sent ${st.sends} (${Math.round(st.sendKB)} KB, ${st.sendMs.toFixed(1)} ms) · worst frame ${r.worst} ms, ${r.frames} frames`);
  }
  L.push(`ROUTE TOTAL: OW calls ${T.calls}, repaints ${T.paints}, ${T.ms.toFixed(1)} ms in them, canvases sent ${T.sends} (${Math.round(T.sendKB)} KB, ${T.sendMs.toFixed(1)} ms)`);
  // ---- the content now (as the save left it), as pixels
  const hash = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i += 3) h = Math.imul(h ^ d[i], 16777619) >>> 0; return h.toString(16); };
  const png = {};
  png.slate_route = slate.image.toDataURL('image/png'); png.sand_route = sand.image.toDataURL('image/png');
  L.push(`after route: slate ${hash(slate.image)} sand ${hash(sand.image)} · flags ${JSON.stringify(Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith('dx_ow_'))))}`);
  // ---- the story's change on the island: the same applyWorld the game runs
  const S = G.story.offwall, f = G.flags;
  const act = (name, fn) => { st = zero(); fn(); for (let i = 0; i < 3; i++) step(); L.push(`${name}: OW calls ${st.calls}, repaints ${st.paints} (${st.ms.toFixed(1)} ms), sent ${st.sends} (${Math.round(st.sendKB)} KB, ${st.sendMs.toFixed(1)} ms) · slate ${hash(slate.image)} sand ${hash(sand.image)}`); };
  act('applyWorld, nothing changed', () => S.applyWorld());
  act('board moved (court, 4 rings)', () => { f.dx_ow_met = f.dx_ow_c1 = f.dx_ow_c2 = true; f.dx_ow_c3 = 'board'; f.dx_ow_moved = true; f.dx_ow_rings = 4; S.applyWorld(); });
  png.slate_court = slate.image.toDataURL('image/png'); png.sand_court = sand.image.toDataURL('image/png');
  act('a ring counted (5)', () => { f.dx_ow_rings = 5; S.C.score(S.scoreLines()); });
  act('applyWorld again, nothing changed', () => S.applyWorld());
  window.__stk = new Map(); act('an area built (story.decorate)', () => G.story.decorate()); L.push('  callers: ' + [...window.__stk].map(([k, n]) => n + 'x ' + k).join('\n           ')); window.__stk = null;
  act('board spot moved', () => { f.dx_ow_bspot = 1; S.applyWorld(); });
  act('back to the save state (by flags)', () => { for (const k of ['dx_ow_met', 'dx_ow_c1', 'dx_ow_c2', 'dx_ow_c3', 'dx_ow_moved', 'dx_ow_rings', 'dx_ow_bspot']) delete f[k]; S.applyWorld(); });
  // ---- one repaint's cost alone, measured 10 times each (content alternated so that each call really paints)
  const pm = (k, a, b) => { const t = []; for (let i = 0; i < 10; i++) { const t0 = performance.now(); OW[k](i % 2 ? a : b); t.push(performance.now() - t0); } t.sort((x, y) => x - y); return `${k} median ${t[5].toFixed(2)} ms, max ${t[9].toFixed(2)} ms`; };
  st = null;
  L.push('one repaint: ' + pm('score', ['TALI 31', 'JOSS 2'], ['TALI 31', 'JOSS 2', 'TWINSEN 1']) + ' · ' + pm('marks', S.layout('c1').marks, S.layout('court').marks));
  S.applyWorld();
  // ---- a drawn frame on the island with both canvases repainted (and so sent again) vs without, finished on the GPU
  //  (gl.finish): the whole cost of a repaint, the GPU process's raster and upload included. 6 of each, alternated.
  const fr = (paint, i) => { if (paint) { OW.score(i % 2 ? ['TALI 31', 'JOSS 2', 'TWINSEN 1'] : ['TALI 31', 'JOSS 2']); OW.marks(i % 2 ? S.layout('court').marks : S.layout('c1').marks); } const t0 = performance.now(); G.renderer.render(); gl.finish(); return performance.now() - t0; };
  for (let i = 0; i < 4; i++) fr(false, 0);
  const A = [], B = [];
  for (let i = 0; i < 12; i++) (i % 2 ? A : B).push(fr(i % 2 === 1, (i - 1) / 2 + 1));
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  L.push(`frame on the island, render + gl.finish: with both repainted and sent median ${med(A).toFixed(1)} ms [${A.map((x) => x.toFixed(0)).join(' ')}], without median ${med(B).toFixed(1)} ms [${B.map((x) => x.toFixed(0)).join(' ')}] · room ${G.room?.id}`);
  S.applyWorld(); step();
  G.benchTick = null;
  return { text: L.join('\n'), png };
})()
