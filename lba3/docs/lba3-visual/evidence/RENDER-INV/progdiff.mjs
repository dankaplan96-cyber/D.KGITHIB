// RENDER-INV: shader programs first compiled while the street route plays (after loading), and how each differs
// from the nearest program compiled at load (the cache-key fields that differ). QUALITY=low|medium.
import { launch, open } from '../../../../tests/lib/boot.mjs';
const quality = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const out = await page.evaluate(() => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const R = G.renderer.renderer, keys0 = R.info.programs.map((p) => String(p.cacheKey));
  const route = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; route.setup(); G.state = 'play';
  // which object first needed each new program
  const who = []; const rbd = R.renderBufferDirect; let n = R.info.programs.length;
  R.renderBufferDirect = function (c, sc, geo, mat, obj, ...a) { const r = rbd.call(this, c, sc, geo, mat, obj, ...a); if (R.info.programs.length > n) { n = R.info.programs.length; who.push(`${obj.name || obj.type}${obj.userData.drawBatch ? ' [drawBatch]' : ''} rs=${obj.receiveShadow} pass=${sc ? 'main' : 'shadow'} mat=${mat.name || mat.type}`); } return r; };
  let t = 0; for (let i = 0; i < 60; i++) { t += 1 / 30; route.drive(t, 1 / 30); G.frame(1 / 30, i % 8 === 0); }
  R.renderBufferDirect = rbd;
  const fresh = R.info.programs.map((p) => String(p.cacheKey)).filter((k) => !keys0.includes(k));
  const fields = (k) => k.split(',');
  const diffs = fresh.map((k) => { const f = fields(k); let best = null, bd = 1e9; for (const k0 of keys0) { const g = fields(k0); if (g.length !== f.length || g[0] !== f[0]) continue; let d = 0; const at = []; for (let i = 0; i < f.length; i++) if (f[i] !== g[i]) { d++; at.push(`#${i}: ${g[i]} → ${f[i]}`); } if (d < bd) { bd = d; best = at; } } return { name: f[0], nDiff: bd, diff: best?.slice(0, 6) }; });
  return { fresh: fresh.length, diffs: diffs.slice(0, 12), who: who.slice(0, 12) };
});
console.log(JSON.stringify({ quality, out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
