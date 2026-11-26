// PERF-SUBMIT: exactness of the shadow pass's caster walk (shadowcache.js walkRoot). On each benchmark route, after
// each drawn frame the same state is rendered again twice: three's whole-scene walk (MW.walk off) and the casters'
// list (on); the shadow pass's draws (object, material, group) must be the same sequence. Prints per route the frames
// compared, draws compared and frames that differ (with the first difference).
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTES=street,interior,combat,transition,arrival,hamalayi FRAMES=40 node shadowwalk.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ROUTES = (process.env.ROUTES || 'street,interior,combat,transition,arrival,hamalayi').split(','), FR = +(process.env.FRAMES || 40);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(async () => { window.__MW = (await import('/src/engine/drawcull.js')).MW; });
let bad = 0;
for (const id of ROUTES) {
  const r = await ev(({ id, FR, cam }) => {
    const G = game, R = G.renderer.renderer, MW = window.__MW, route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
    if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
    let t = 0;
    for (let i = 0; i < 120; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
    const rbd = R.renderBufferDirect; let rec = null;
    // (the live pass only — or the whole shadow pass where the cache is bypassed: the cache's slices are its own walk)
    const SC = G.shadowCache, live = SC.live; let inLive = false, bypass0 = 0;
    SC.live = function (...a) { inLive = true; try { return live.apply(this, a); } finally { inLive = false; } };
    R.renderBufferDirect = function (c, sc, g, m, o, grp) { if (rec && sc === null && (inLive || SC.stats.bypass > bypass0)) rec.push(o.id + ':' + m.id + ':' + (grp ? grp.start : '-')); return rbd.apply(this, arguments); };
    let frames = 0, draws = 0, diff = 0, first = '', used = 0;
    for (let i = 0; i < FR; i++) {
      t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true);
      if (G.trans?.hold) continue;
      const seq = {};
      for (const w of [false, true]) {
        MW.walk = w; rec = [];
        bypass0 = SC.stats.bypass; if (MW._root) MW._root.children.length = 0;
        G.renderer.render();
        if (w && MW._root?.children?.length) used++;
        seq[w] = rec;
      }
      MW.walk = true; rec = null; frames++; draws += seq[false].length;
      if (seq[false].join() !== seq[true].join()) { diff++; if (!first) { const a = seq[false], b = seq[true]; let k = 0; while (k < a.length && a[k] === b[k]) k++; first = `frame ${i}: three ${a.length} draws, list ${b.length}; first difference at ${k}: ${a[k]} vs ${b[k]}`; } }
    }
    R.renderBufferDirect = rbd; SC.live = live; G.benching = false;
    return { frames, draws, diff, first, used };
  }, { id, FR, cam: process.env.CAM || '' });
  bad += r.diff;
  console.log(`${id.padEnd(11)} frames ${r.frames} · shadow draws ${r.draws} · frames using the list ${r.used} · frames that differ ${r.diff}${r.first ? ' · ' + r.first : ''}`);
}
console.log(bad ? 'VERDICT: FAIL (the casters\' walk drew differently)' : 'VERDICT: PASS (same shadow draws, same order)');
await browser.close();
