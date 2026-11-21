(async () => {
  // P87b (B): play's path. Citadel's street batched, then each room in ROOMS (default: Citadel's interiors not built at
  // startup, and Zeelich) entered through the game's own scene change (built there on its first visit, as play), a second
  // of it, then back to Citadel the same way. On each return, from the scene change to 1 s after the fade cleared: the
  // pieces that left Citadel's draw batches, uploads (KB), the longest frame. Then the house (batched at the start, as
  // New Game) entered again: pieces leaving its batches after the builds in between.
  const G = game, DB = G.drawBatch, R = G.regions, DT = 1 / 30;
  const ROOMS = (window.ROOMS || 'tavern,bazoo,ticket,pharmacy,nbrhouse,nellhouse,baggage,office,workshop,terminal,sewer,zeelich').split(',');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); };
  for (let i = 0; i < 40; i++) step();
  const visit = async (go) => {
    const l0 = DB.left || 0; let up = 0, upKB = 0, worst = 0, n = 0, after = -1, frames = 0;
    go();
    while (n++ < 600) {
      if (G.trans?.building) { n--; await new Promise((r) => setTimeout(r, 30)); continue; }
      const t0 = performance.now(); step(); const ms = performance.now() - t0; frames++;
      const f = G.perf.buf[(G.perf.i + G.perf.buf.length - 1) % G.perf.buf.length] || {};
      up += f.up || 0; upKB += f.upKB || 0; worst = Math.max(worst, ms);
      if (!G.trans && after < 0) after = 0;
      if (after >= 0 && ++after > 30) break;
      if (frames % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    return { left: (DB.left || 0) - l0, up, upKB: Math.round(upKB), worst: Math.round(worst), frames };
  };
  // (bumps of a source already in use — version > 0 and a batched piece's map — by call site, per visit)
  const THREE = await import('three'); const SP = THREE.Source.prototype, d = Object.getOwnPropertyDescriptor(SP, 'needsUpdate');
  let inUse = new Set(); const refresh = () => { inUse = new Set(); for (const A of DB.areas.values()) for (const M of A.members) if (!M.out && M.o.material?.map) inUse.add(M.o.material.map.source); };
  let hits = new Map();
  Object.defineProperty(SP, 'needsUpdate', { configurable: true, get: d.get, set(v) { if (v === true && inUse.has(this)) { const fr = (new Error().stack || '').split('\n').slice(2).map((x) => x.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/(src\/)?/, '').replace(/\)$/, '')); const site = fr.find((x) => /game\/|engine\//.test(x)) || '?'; hits.set(site, (hits.get(site) || 0) + 1); } d.set.call(this, v); } });
  // (canvases sent to the GPU again: a texImage2D / texSubImage2D of a canvas or image already sent once this session)
  const gl = G.renderer.renderer.getContext(), sent = new WeakSet(); let resent = 0, resentN = 0;
  for (const fn of ['texImage2D', 'texSubImage2D']) { const f = gl[fn]; gl[fn] = function (...a) { const img = a[a.length - 1]; if (img && typeof img === 'object' && img.width && !ArrayBuffer.isView(img)) { if (sent.has(img)) { resent += img.width * img.height * 4; resentN++; } else sent.add(img); } return f.apply(this, a); }; }
  const SEQ = (window.SEQ || 'house,citadel,tavern,citadel,bazoo,citadel,pharmacy,citadel,office,citadel,zeelich,citadel,desert,zeelich,sewer,zeelich,citadel,house').split(',');
  const L = [`P87b return probe · ${G.settings.quality} · ${SEQ.join(' > ')}`];
  const seen = new Set(['citadel']); let revLeft = 0, revKB = 0, totResent = 0, totResentN = 0;
  for (const id of SEQ) {
    const was = id === 'citadel' ? 'built' : R.stateOf(id), rev = seen.has(id); seen.add(id);
    refresh(); hits = new Map(); resent = 0; resentN = 0;
    const r = await visit(() => (id === 'citadel' ? G.exitRoom({ x: -42, z: 2, a: 0 }, false, true) : G.enterRoom(id, null, false, true)));
    if (rev) { revLeft += r.left; revKB += r.upKB; }
    totResent += resent; totResentN += resentN;
    L.push(`${id.padEnd(9)} ${rev ? 'revisit' : 'first  '} (was ${was}): left ${r.left}, uploads ${r.up} (${r.upKB} KB), worst frame ${r.worst} ms, ${r.frames} frames, canvases sent again ${resentN} (${Math.round(resent / 1024)} KB, mip 0)${hits.size ? ' · in-use sources bumped by ' + [...hits].map(([k, n]) => n + 'x ' + k).join(' | ') : ''}`);
  }
  L.push(`TOTAL on revisits: ${revLeft} pieces left their draw batches, ${revKB} KB uploaded; canvases sent again over the route: ${totResentN} (${Math.round(totResent / 1024)} KB, mip 0)`);
  G.benchTick = null;
  return L.join('\n');
})()
