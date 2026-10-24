// RENDER-INV: the map's background build (MAP-1, hud.mapTick → mapdraw.js) per region: its total time, how many
// frames it runs in, and the longest single slice (asked for 2.5 ms). Frames are simulated without drawing.
//   GAME_URL=http://localhost:8176/ node mapcost.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
const load = os.loadavg()[0];
const out = await page.evaluate(() => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const H = G.hud, res = {};
  const spy = () => { const s = { n: 0, max: 0, sum: 0, frames: 0 }; return s; };
  const run = (name, enter) => {
    enter(); G.state = 'play';
    const s = spy(); let B = null;
    const orig = H._base.bind(H);
    H._base = (region, room) => { const b = orig(region, room); if (!b._spied) { b._spied = true; const st = b.step; b.step = (ms) => { const t0 = performance.now(); const r = st(ms); const d = performance.now() - t0; if (d > 0.01 || !r) { s.n++; s.sum += d; s.max = Math.max(s.max, d); } return r; }; } B = b; return b; };
    let f = 0; for (; f < 3000; f++) { const n0 = s.n; G.frame(1 / 30, false); if (s.n > n0) s.frames++; if (B?.done && f > 2) break; }
    H._base = orig;
    res[name] = { framesWithWork: s.frames, slices: s.n, totalMs: +s.sum.toFixed(0), maxSliceMs: +s.max.toFixed(1), meanSliceMs: +(s.sum / Math.max(1, s.n)).toFixed(1), N: B?.N, stages: B?.stages };
  };
  run('citadel', () => { G.hud._bases.clear(); G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); });
  run('desert', () => G.enterRoom('desert', null, true, true));
  run('zeelich', () => G.enterRoom('zeelich', null, true, true));
  run('hamalayi', () => G.enterRoom('hamalayi', null, true, true));
  run('isle_otringal', () => G.enterRoom('isle_otringal', null, true, true));
  run('isle_tralu', () => G.enterRoom('isle_tralu', null, true, true));
  run('isle_knartas', () => G.enterRoom('isle_knartas', null, true, true));
  // back to Citadel after 6 other regions: the cache keeps 6 bases
  run('citadel-again', () => G.exitRoom({ x: -42, z: 2, a: 0 }, true, true));
  return res;
});
console.log(JSON.stringify({ load, loadAfter: os.loadavg()[0], out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
