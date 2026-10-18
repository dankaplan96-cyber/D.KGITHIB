// Diagnostic (PERF-IGPU): where a frame's draw calls go. Draws one frame of a benchmark route and lists the
// calls by pass (main / shadow) and by source (the builder group under the scene root, the object kind, the
// material), largest first. Not a pass/fail test.
//   node tests/drawcalls.mjs [route=street] [quality=medium]
import { launch, open } from './lib/boot.mjs';
const route = process.argv[2] || 'street', quality = process.argv[3] || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
const rows = await page.evaluate(async ({ route, quality }) => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, R = G.renderer.renderer;
  G.settings.quality = quality; G.applySettings();
  const r = G.bench.routes().find((x) => x.id === route);
  G.state = 'play'; r.setup(); G.state = 'play';
  for (let i = 0, t = 0; i < 30; i++) { t += 1 / 30; r.drive(t, 1 / 30); G.frame(1 / 30, false); }
  // label: the chain of named ancestors (or the builder's top group index under its root)
  const label = (o) => {
    for (let p = o; p; p = p.parent) if (p.userData?.src) return p.userData.src + (p.name ? '/' + p.name : '') + (o.name && o !== p ? ':' + o.name : '');
    const names = [];
    for (let p = o; p && !p.isScene; p = p.parent) { if (p.name) names.push(p.name); if (p.parent?.isScene) { names.push('#' + p.parent.children.indexOf(p) + (p === G.world.root ? ':world' : '')); break; } }
    if (o.parent === G.world.root) names.push('(world child)');
    return names.slice(0, 3).reverse().join('/');
  };
  const counts = new Map();
  const orig = R.renderBufferDirect.bind(R);
  R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
    const pass = scene ? 'main' : 'shadow';
    const kind = obj.isInstancedMesh ? `inst(${obj.count})` : obj.isBatchedMesh ? 'batched' : obj.isSkinnedMesh ? 'skinned' : obj.type;
    const k = `${pass} | ${label(obj)} | ${kind} | ${mat.type}${mat.color ? '#' + mat.color.getHexString() : ''}${mat.map ? '+map' : ''}`;
    counts.set(k, (counts.get(k) || 0) + 1);
    return orig(cam, scene, geo, mat, obj, grp);
  };
  G.perf.beginFrame(); G.frame(1 / 30, true);
  R.renderBufferDirect = orig;
  const tot = { main: 0, shadow: 0 }; for (const [k, n] of counts) tot[k.split(' |')[0]] += n;
  // grouped by builder label too
  const byLabel = new Map(); for (const [k, n] of counts) { const p = k.split(' | '); const kk = p[0] + ' | ' + p[1]; byLabel.set(kk, (byLabel.get(kk) || 0) + n); }
  const progs = new Map(); for (const p of R.info.programs) progs.set(p.name, (progs.get(p.name) || 0) + 1);
  return { progs: [...progs].sort((a, b) => b[1] - a[1]), nprog: R.info.programs.length, tot, calls: R.info.render.calls, byLabel: [...byLabel].sort((a, b) => b[1] - a[1]).slice(0, 40), top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 60) };
}, { route, quality });
console.log(route, quality, 'info.calls', rows.calls, JSON.stringify(rows.tot));
console.log('--- by source');
for (const [k, n] of rows.byLabel) console.log(String(n).padStart(4), k);
console.log('--- by source/kind/material');
for (const [k, n] of rows.top) console.log(String(n).padStart(4), k);
console.log('--- shader programs', rows.nprog, JSON.stringify(rows.progs));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
