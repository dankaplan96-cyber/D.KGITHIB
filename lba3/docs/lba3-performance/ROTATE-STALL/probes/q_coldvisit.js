(async () => {
  // ROTATE-STALL (A): the benchmark as the laptop ran it from a fresh game — its areas not built yet (run.mjs NOPREP=1),
  // the game's own loop running (no fixed stepping) — visits' cold street (measured from its first frame): its hitch
  // list with the browser's long-animation-frame notes, and the preparation's steps. Also a log of the game's own entry
  // points that ran meanwhile (each region build, the shadow programs, the route's setup) between painted-frame markers:
  // events with no frame marker between them ran in the same task.
  const G = game, t0 = performance.now(), log = [];
  if (window.OFF) G.bench.prepSplit = false;   // (OFF=1: the preparation as before)
  const at = () => ((performance.now() - t0) / 1000).toFixed(2);
  const wrap = (obj, name, label) => { const f = obj[name]; obj[name] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { log.push(`${at()} s ${label} ${(performance.now() - t).toFixed(0)} ms`); } }; };
  wrap(G.regions, 'buildGroup', 'region build'); wrap(G, 'warmShadows', 'warmShadows');
  const R0 = G.bench.routes.bind(G.bench);
  G.bench.routes = () => R0().map((r) => ({ ...r, setup: () => { const t = performance.now(); r.setup(); log.push(`${at()} s route ${r.id} setup ${(performance.now() - t).toFixed(0)} ms`); } }));
  let frames = 0, stop = false;
  const tick = () => { frames++; log.push(`${at()} s · frame ${frames}`); if (!stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  G.testFreeze = false; G.setState('play');
  const text = await G.bench.visits({ routes: ['street'], cycles: 0, sustainS: 0, coldS: +(window.COLD_S || 2), camera: 'follow' });
  stop = true;
  const keep = log.filter((l, i) => !/· frame/.test(l) || !/· frame/.test(log[i - 1] || '') || !/· frame/.test(log[i + 1] || ''));
  return keep.join('\n') + '\n\n' + String(text).split('\n').filter((l) => /prepar|cold|over 33|heading/.test(l)).join('\n');
})()
