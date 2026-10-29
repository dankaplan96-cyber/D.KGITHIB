// PERF-CPU: what is made late — after a scene change's black and shader hold — on a route: shader programs (with their
// material and the object that first used them), shadow-cache full rebuilds (and the cache key's change), draw / shadow
// batch builds. Each is a cold-visit hitch on the laptop (a program on Direct3D 11 at battery clocks: up to ~1 s).
//   GAME_URL=http://localhost:8214/ PROFILE=1 ROUTE=street FRAMES=150 node lateprog.mjs     (PROFILE: Auto's 0–4; Q=low: a preset)
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
const ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 150);
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
if (process.env.BATTERY) await ev(() => game.setBattery(true));
const r = await ev(({ ID, FR, P, Q }) => {
  const G = game, R = G.renderer.renderer, A = G.autoQ;
  if (Q) { G.settings.quality = Q; G.settings.qualityAuto = false; G.applySettings(); }
  else { A.gov.setProfile(+P, 'probe', { phase: 'hold', commitNow: true }); A.applyAll(); G.settings.quality = A.tier(); G.applySettings(); }
  G.warmGraphics?.();
  const route = G.bench.routes().find((x) => x.id === ID);
  // the object being drawn when a program appears
  let cur = null; const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o, ...a) { cur = { o, m, pass: sc === null ? 'shadow' : 'main' }; return rbd.call(this, c, sc, g, m, o, ...a); };
  const names = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) p.push(x.name || x.type); return p.slice(0, 4).join('<'); };
  const out = []; let p0 = R.info.programs.length, sc0 = G.shadowCache?.stats.full ?? 0, db0 = G.drawBatch.builds || 0, sb0 = G.shadowCull.builds || 0, key0 = G.shadowCache?.key;
  G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0;
  for (let i = 0; i < FR; i++) {
    t += 1 / 30; route.drive(t, 1 / 30);
    G.frame(1 / 30, true);
    const p = R.info.programs.length, sc = G.shadowCache?.stats.full ?? 0, db = G.drawBatch.builds || 0, sb = G.shadowCull.builds || 0;
    const note = [];
    if (p > p0) note.push(`${p - p0} program(s): ${R.info.programs.slice(p0).map((x) => x.name).join(', ')} · last drawn ${cur?.pass} ${cur?.m?.type}${cur?.m?.name ? '/' + cur.m.name : ''} on ${cur ? names(cur.o) : '?'} (${cur?.o?.type})`);
    if (sc > sc0) { const k = G.shadowCache.key; note.push(`shadow cache full rebuild${key0 && k !== key0 ? ` (key: ${diffKey(key0, k)})` : ''}`); key0 = k; }
    if (db > db0) note.push(`draw batches built (${(G.drawBatch.buildMs || 0).toFixed(0)} ms total)`);
    if (sb > sb0) note.push(`shadow batches built (${(G.shadowCull.buildMs || 0).toFixed(0)} ms total)`);
    if (note.length) out.push(`frame ${i} (${(t).toFixed(2)} s, ${G.trans ? 'in the scene change' : G.gfxHold ? 'shader hold' : 'in view'}): ${note.join(' · ')}`);
    p0 = p; sc0 = sc; db0 = db; sb0 = sb;
  }
  R.renderBufferDirect = rbd;
  function diffKey(a, b) { const A = a.split('|'), B = b.split('|'); const d = []; for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) d.push(`#${i}: ${String(A[i]).slice(0, 40)} → ${String(B[i]).slice(0, 40)}`); return d.join('; '); }
  return { out, label: A.label(), programs: R.info.programs.length };
}, { ID, FR, P: process.env.PROFILE ?? '1', Q: process.env.Q || '' });
console.log(`PERF-CPU late work · ${process.env.Q ? process.env.Q + ' by hand' : 'Auto ' + r.label}${process.env.BATTERY ? ' · battery' : ''} · ${ID} · ${FR} frames at 30 fps steps · programs now ${r.programs}`);
for (const l of r.out) console.log('  ' + l);
await browser.close();
