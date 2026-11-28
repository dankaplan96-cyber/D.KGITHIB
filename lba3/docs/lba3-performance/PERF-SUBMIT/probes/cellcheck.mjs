// PERF-SUBMIT: exactness of shadowcull.js's sphere pre-test for the shadow batches: on each route, every drawn frame,
// the batches' casting decided with the pre-test off and on (the same camera, sun and focus) must be the same.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTES=street,arrival,hamalayi,combat FRAMES=90 node cellcheck.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ROUTES = (process.env.ROUTES || 'street,interior,combat,transition,arrival,hamalayi').split(','), FR = +(process.env.FRAMES || 90);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
let bad = 0;
for (const id of ROUTES) {
  const r = await ev(({ id, FR }) => {
    const G = game, SC = G.shadowCull, route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
    let t = 0, n = 0, diff = 0, on = 0, cells = 0;
    const upd = SC.update.bind(SC);
    for (let i = 0; i < FR; i++) {
      t += 1 / 60; route.drive(t, 1 / 60);
      let a = null, b = null;
      SC.update = (root, cam, focus) => {
        SC.prefilter = false; upd(root, cam, focus); a = [...(SC.area?.cells.values() || [])].map((c) => c.mesh?.castShadow);
        SC.prefilter = true; upd(root, cam, focus); b = [...(SC.area?.cells.values() || [])].map((c) => c.mesh?.castShadow);
      };
      G.frame(1 / 60, true);
      SC.update = upd;
      if (!a) continue;
      n++; cells += a.length; on += a.filter(Boolean).length;
      for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff++;
    }
    G.benching = false;
    return { n, cells, on, diff };
  }, { id, FR });
  bad += r.diff;
  console.log(`${id.padEnd(11)} frames ${r.n} · batch decisions ${r.cells} (casting ${r.on}) · different ${r.diff}`);
}
console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS (the same batches cast)');
await browser.close();
