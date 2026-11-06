// PERF-SUBMIT: what the static shadow cache's build draws, walking the scene (as before: everything on its layer that
// casts) against walking its static casters (S): per area of a route, the draws only one of them makes, by path.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=arrival SECONDS=12 node cachedraws.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'arrival', SEC = +(process.env.SECONDS || 12);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
const out = await ev(({ id, SEC }) => {
  const G = game, R = G.renderer.renderer, SC = G.shadowCache, route = G.bench.routes().find((x) => x.id === id), res = [];
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  const path = (o) => { const p = []; for (let x = o; x && !x.isScene && p.length < 4; x = x.parent) p.push(x.name || x.type); return p.reverse().join('/'); };
  let rec = null; const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o) { if (rec && sc === null) rec.add(o); return rbd.apply(this, arguments); };
  const draw = SC.draw.bind(SC); let seen = new Set();
  let t = 0;
  for (let i = 0; i < SEC * 60; i++) {
    t += 1 / 60; route.drive(t, 1 / 60);
    const room = G.room?.id || 'citadel';
    if (!seen.has(room) && !G.trans) {
      G.frame(1 / 60, true);
      seen.add(room);
      const A = SC.area(), S = SC.statics(A), sets = {};
      for (const w of [false, true]) { SC.sliceWalk = w; rec = new Set(); SC.drop(); G.renderer.render(); sets[w] = rec; }
      rec = null; SC.sliceWalk = true;
      // (the live pass draws too: keep only what the build drew = layer-31 objects)
      const onlyA = [...sets[false]].filter((o) => !sets[true].has(o)), onlyB = [...sets[true]].filter((o) => !sets[false].has(o));
      res.push(`${room}: S ${S.length} · scene walk drew ${sets[false].size}, statics walk ${sets[true].size} · only scene walk ${onlyA.length}: ${onlyA.slice(0, 12).map((o) => `${path(o)}${o.layers.isEnabled(31) ? ' [L31]' : ''}${o.isInstancedMesh ? ' I' : ''}${o.isBatchedMesh ? ' B' : ''}`).join(' | ')} · only statics walk ${onlyB.length}: ${onlyB.slice(0, 8).map(path).join(' | ')}`);
      continue;
    }
    G.frame(1 / 60, true);
  }
  R.renderBufferDirect = rbd; G.benching = false;
  return res;
}, { id: ID, SEC });
for (const l of out) console.log(l);
await browser.close();
