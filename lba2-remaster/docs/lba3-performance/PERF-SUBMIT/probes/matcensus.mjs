// PERF-SUBMIT: the main pass's materials on a benchmark route, in draw order of one frame: each material switch, its
// program, the draws it covers and what they are; and materials that are separate objects with the same look (the same
// type, parameters and textures: three uploads each one's uniforms at each switch).
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street node matcensus.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id }) => {
  const G = game, R = G.renderer.renderer, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  let t = 0;
  for (let i = 0; i < 300; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  const sig = (m) => { const o = {}; for (const k of Object.keys(m)) { if (k === 'uuid' || k === 'id' || k === 'name' || k === 'version' || k === 'userData' || k.startsWith('_')) continue; const v = m[k]; if (v && v.isTexture) o[k] = 'tex:' + v.uuid; else if (v && v.isColor) o[k] = v.getHexString(); else if (v && (v.isVector2 || v.isVector3)) o[k] = v.toArray().join(','); else if (typeof v !== 'object' || v === null) o[k] = v; } return m.type + JSON.stringify(o) + (m.onBeforeCompile.toString().length > 30 ? m.onBeforeCompile.toString().length : ''); };
  const seq = [], rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o) { if (sc !== null && R.getRenderTarget() === G.renderer.composer.renderTarget1 || (sc !== null && R.getRenderTarget() === G.renderer.composer.renderTarget2)) seq.push({ m, o }); return rbd.apply(this, arguments); };
  t += 1 / 60; route.drive(t, 1 / 60); G.perf.beginFrame(); G.frame(1 / 60, true);
  R.renderBufferDirect = rbd;
  const runs = []; let last = null;
  for (const { m, o } of seq) { if (m !== last) { runs.push({ m, n: 0, what: new Set() }); last = m; } const r = runs[runs.length - 1]; r.n++; let p = o; const path = []; while (p && !p.isScene && path.length < 3) { path.push(p.name || p.type); p = p.parent; } r.what.add(path.reverse().join('/')); }
  const bySig = new Map(); for (const r of runs) { const s = sig(r.m); let L = bySig.get(s); if (!L) bySig.set(s, (L = new Set())); L.add(r.m); }
  const dup = [...bySig].filter(([, L]) => L.size > 1).map(([s, L]) => `${L.size} materials alike: ${[...L].map((m) => '#' + m.id).join(' ')} · ${s.slice(0, 160)}`);
  const progs = new Map(); let lastP = null, psw = 0; for (const r of runs) { const p = R.properties.get(r.m).currentProgram; if (p !== lastP) { psw++; lastP = p; } }
  return { draws: seq.length, runs: runs.map((r) => `${String(r.n).padStart(3)} × ${r.m.type}#${r.m.id} "${r.m.name}" prog ${R.properties.get(r.m).currentProgram?.id} · ${[...r.what].slice(0, 3).join(' | ')}`), dup, psw };
}, { id: ID });
console.log(`PERF-SUBMIT materials · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID}: ${r.draws} scene-pass draws, ${r.runs.length} material runs, ${r.psw} program switches`);
for (const l of r.runs) console.log('  ' + l);
console.log('-- separate materials with the same look');
for (const l of r.dup) console.log('  ' + l);
await browser.close();
