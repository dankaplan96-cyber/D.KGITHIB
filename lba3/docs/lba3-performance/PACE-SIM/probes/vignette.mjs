// PACE-SIM: what the HUD's hurt vignette costs the browser per displayed frame, apart from the game's own frame.
// The game is frozen (the loop runs; nothing is simulated or drawn: the WebGL canvas is unchanged), the hero is hurt
// N times (hud.hurt(), as Hero.damage calls it) at the hits' pace (invuln 1.1 s), and a Chrome trace counts what the
// renderer does in that time: paints (and their area), raster work, style/layout, compositor frames.
//   GAME_URL=... CSS='<extra css>' OUT=/dev/shm/x node vignette.mjs
// CSS: an A/B override injected into the page; W/H the viewport.
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const W = +(process.env.W || 1366), H = +(process.env.H || 768), N = +(process.env.N || 3), OUT = process.env.OUT || '/dev/shm/vig';
const { browser, context, page } = await launch({ width: W, height: H });
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'low', qPicked: true, qv: 1, v: 2 })); } catch {} });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.step(0.1); game.renderer.render(); });
if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS });
await page.waitForTimeout(1500);
const cdp = await context.newCDPSession(page);
const cats = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'viz', 'gpu', 'toplevel', 'blink.user_timing'];
const events = [];
cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) events.push(e); });
const doneP = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
// a quiet second first (the baseline: what the frozen page costs per frame with no hit)
await cdp.send('Tracing.start', { traceConfig: { includedCategories: cats, recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
// (the display frames as a page sees them: requestAnimationFrame's intervals, per phase)
await ev(() => { const raf = window.__lbaRaf || requestAnimationFrame; window.__iv = []; let last = null; const tick = (t) => { if (last != null) window.__iv.push([t, t - last]); last = t; if (!window.__ivStop) raf(tick); }; raf(tick); });
await ev(() => performance.mark('quiet'));
const ph = [['quiet', await ev(() => performance.now())]];
await page.waitForTimeout(1000);
for (let i = 0; i < N; i++) { ph.push(['hit' + i, await ev((i) => { performance.mark('hit' + i); game.hud.hurt(); return performance.now(); }, i)]); await page.waitForTimeout(1100); }
ph.push(['end', await ev(() => { performance.mark('end'); window.__ivStop = true; return performance.now(); })]);
const iv = await ev(() => window.__iv);
for (let k = 0; k < ph.length - 1; k++) {
  const v = iv.filter(([t]) => t > ph[k][1] && t <= ph[k + 1][1]).map(([, d]) => d).sort((a, b) => a - b);
  console.log(`${ph[k][0].padEnd(6)} rAF frames ${v.length} · interval p50 ${v[v.length >> 1]?.toFixed(1)} · max ${v[v.length - 1]?.toFixed(1)} ms · >20 ms ${v.filter((x) => x > 20).length} · >33 ms ${v.filter((x) => x > 33.4).length}`);
}
await cdp.send('Tracing.end'); await doneP;
fs.writeFileSync(OUT + '-trace.json', JSON.stringify(events));
// fold: the renderer's paints and raster, the compositor's frames, per phase (quiet second / after each hit)
const marks = events.filter((e) => e.cat?.includes('blink.user_timing') || (e.name && /^(quiet|hit\d+|end)$/.test(e.name))).filter((e) => /^(quiet|hit\d+|end)$/.test(e.name)).sort((a, b) => a.ts - b.ts);
const at = Object.fromEntries(marks.map((m) => [m.name, m.ts]));
const phase = (ts) => { let p = null; for (const m of marks) if (m.ts <= ts) p = m.name; return p; };
const sum = {}; const add = (p, k, v = 1) => { (sum[p] ||= {}); sum[p][k] = (sum[p][k] || 0) + v; };
for (const e of events) {
  if (e.ph !== 'X' && e.ph !== 'B') continue;
  const p = phase(e.ts); if (!p || p === 'end') continue;
  const d = (e.dur || 0) / 1000;
  if (e.name === 'Paint') { add(p, 'paints'); add(p, 'paint ms', d); const c = e.args?.data?.clip; if (c) { const w = Math.abs(c[2] - c[0]), h = Math.abs(c[5] - c[1]); add(p, 'paint Mpx', (w * h) / 1e6); } }
  else if (e.name === 'RasterTask' || e.name === 'TileManager::RasterTask' || e.name === 'RasterDecoderImpl::DoRasterCHROMIUM' || e.name === 'GpuImageDecodeCache::DecodeImage') { add(p, e.name + ' n'); add(p, e.name + ' ms', d); }
  else if (['UpdateLayoutTree', 'Layout', 'PrePaint', 'Layerize', 'Commit', 'Animation'].includes(e.name)) { add(p, e.name + ' n'); add(p, e.name + ' ms', d); }
  else if (e.name === 'DrawFrame' || e.name === 'Display::DrawAndSwap' || e.name === 'SkiaOutputSurfaceImplOnGpu::SwapBuffers') add(p, e.name + ' n');
}
for (const [p, o] of Object.entries(sum)) for (const k of Object.keys(o)) o[k] = +o[k].toFixed(2);
console.log('marks (s from quiet):', Object.fromEntries(Object.entries(at).map(([k, v]) => [k, +((v - at.quiet) / 1e6).toFixed(2)])));
console.log(JSON.stringify(sum, null, 1));
await browser.close();
