// PERF-CPU: which objects start a world-matrix recompute in a frame (their own position / rotation / scale changed, or
// flagged), with the size of the subtree each one forces.  GAME_URL=http://localhost:8214/ ROUTE=street node why.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
if (process.env.WHO) await ev(() => { window.__WHO = 1; });
const r = await ev((id) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 120; i++) { route.drive(i / 60, 1 / 60); G.frame(1 / 60, i % 6 === 0); }
  const st = G.renderer._mw.stats; st.why = [];
  if (window.__WHO) { let v = G.scene.matrixWorldNeedsUpdate; window.__stk = []; Object.defineProperty(G.scene, 'matrixWorldNeedsUpdate', { get: () => v, set: (x) => { if (x) window.__stk.push(new Error().stack.split('\n').slice(2, 6).join(' | ')); v = x; }, configurable: true });
    const t0 = G.scene.__trs; window.__trs0 = t0 ? Array.from(t0) : null; }
  route.drive(2.1, 1 / 60); G.frame(1 / 60, true);
  const cnt = (o) => { let n = 0; o.traverseVisible(() => n++); return n; };
  const path = (o) => { const p = []; for (let x = o; x; x = x.parent) p.push(x.name || x.type); return p.slice(0, 4).join('<'); };
  const out = st.why.map((o) => ({ p: path(o), n: cnt(o), auto: o.matrixAutoUpdate })).sort((a, b) => b.n - a.n).slice(0, 40);
  const why = st.why.length; st.why = null;
  return { stats: { ...st, why }, out, stk: window.__stk, trs: [window.__trs0, Array.from(G.scene.__trs || []), G.scene.position.toArray(), G.scene.quaternion.toArray(), G.scene.scale.toArray()] };
}, ID);
console.log(JSON.stringify(r.stats));
for (const x of r.out) console.log(String(x.n).padStart(6), x.auto ? 'auto' : 'manual', x.p);
if (r.stk) { console.log('setters:', r.stk.length); for (const s of [...new Set(r.stk)].slice(0, 10)) console.log('  ', s); console.log('trs', JSON.stringify(r.trs)); }
await browser.close();
