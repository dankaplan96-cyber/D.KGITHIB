// RENDER-INV: memory (cost A). The JS heap as V8 reports it (CDP, exact), the renderer process's and the GPU
// process's resident memory (Linux /proc), and the largest geometries by bytes with their area and whether they are
// part of the scene graph's drawn meshes or kept aside (userData copies).
//   GAME_URL=http://localhost:8176/ node memory.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
const RA = fileURLToPath(new URL('./ra.js', import.meta.url));
const pids = () => execSync("ps -eo pid,args | grep -E 'chrom(e|ium)' | grep -v grep | awk '{print $1}'").toString().split(/\s+/).filter(Boolean);
const before = new Set(pids());
const { browser, context, page, errs } = await launch({ width: 1366, height: 768 });
const mine = () => pids().filter((p) => !before.has(p));
await open(page, '?nocine');
await page.addScriptTag({ path: RA });
const cdp = await context.newCDPSession(page);
const rss = () => { const r = {}; for (const p of mine()) { try { const a = execSync(`ps -o rss=,args= -p ${p}`).toString(); const t = /--type=gpu-process/.test(a) ? 'gpuMB' : /--type=renderer/.test(a) ? 'rendererMB' : 'otherMB'; r[t] = (r[t] || 0) + Math.round(parseInt(a) / 1024); } catch {} } return r; };
const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); return { usedMB: +(h.usedSize / 1048576).toFixed(0), totalMB: +(h.totalSize / 1048576).toFixed(0) }; };
const out = { atTitle: { heap: await heap(), rss: rss() } };
out.top = await page.evaluate(() => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, seen = new Map();
  const sb = new WeakSet(), bytes = (g) => { let b = 0; for (const a of [...Object.values(g.attributes), g.index]) { const ab = a?.array?.buffer; if (!ab || sb.has(ab)) continue; sb.add(ab); b += ab.byteLength; } return b; };
  G.scene.traverse((o) => { const g = o.geometry; if (!g || seen.has(g)) return; seen.set(g, { area: RA.areaOf(o), name: o.name || o.type, b: bytes(g), v: g.attributes.position?.count, attrs: Object.keys(g.attributes).join(','), inst: o.isInstancedMesh ? o.count : 0 }); });
  // geometries kept aside in userData (not drawn): e.g. a terrain's full mesh kept next to its tiles
  const aside = []; G.scene.traverse((o) => { for (const [k, v] of Object.entries(o.userData || {})) if (v?.isBufferGeometry && !seen.has(v)) aside.push({ area: RA.areaOf(o), key: k, b: bytes(v) }); });
  const all = [...seen.values()].sort((a, b) => b.b - a.b);
  const tot = all.reduce((s, x) => s + x.b, 0), asideTot = aside.reduce((s, x) => s + x.b, 0);
  // by attribute set: what the bytes are made of
  const byAttr = new Map(); for (const x of all) byAttr.set(x.attrs, (byAttr.get(x.attrs) || 0) + x.b);
  return { geometries: all.length, totalMB: +(tot / 1048576).toFixed(0), asideMB: +(asideTot / 1048576).toFixed(0), aside: aside.sort((a, b) => b.b - a.b).slice(0, 10).map((x) => ({ ...x, b: +(x.b / 1048576).toFixed(1) })),
    largest: all.slice(0, 25).map((x) => ({ ...x, MB: +(x.b / 1048576).toFixed(1), b: undefined })),
    byAttr: [...byAttr].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, +(v / 1048576).toFixed(0)]) };
});
out.inPlay = { heap: await heap(), rss: rss() };
for (const r of ['zeelich', 'desert', 'hamalayi', 'isle_otringal']) await page.evaluate((r) => { const G = game; G.enterRoom(r, null, true, true); for (let i = 0; i < 4; i++) G.frame(1 / 30, true); }, r);
await page.evaluate(() => { const G = game; G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); for (let i = 0; i < 4; i++) G.frame(1 / 30, true); });
out.after4Regions = { heap: await heap(), rss: rss(), info: await page.evaluate(() => game.renderer.renderer.info.memory) };
console.log(JSON.stringify({ ...out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
