// FPS30-PRESENT (CLOUD_ORDERS 60.0): at Frame Rate 30 (then 60), 20 s of play — the square, running in a circle so the
// Follow camera turns with him (12 s), then his house (6 s) — with a Chrome Performance trace (CDP Tracing:
// devtools.timeline + the frame categories) and, in the page, every requestAnimationFrame timestamp and the F9
// overlay's pacing line. From the trace: the rAF callbacks (FireAnimationFrame: start intervals, main-thread ms), the
// frames presented / dropped (PipelineReporter's state), the intervals between presented frames; the game's own GPU
// timer for GPU ms a frame.
// node fps30present.mjs <url> <fps: 30|60> <out prefix>
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';
const [URL0, FPS, OUT] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1940,1100', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(1500);
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
for (let i = 0; i < 80; i++) { if (await page.evaluate(() => game.state === 'play')) break; await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
const env = await page.evaluate((fps) => { const G = game; G.settings.fps = fps; G.settings.qualityAuto = true; G.applySettings(); G.hero.behaviour = 'athletic';
  if (G.room) G.exitRoom({ x: -42, z: 6, a: 0 }, false, true);
  const c = document.createElement('canvas').getContext('webgl2'), d = c?.getExtension('WEBGL_debug_renderer_info');
  let bat = null; navigator.getBattery?.().then((b) => { window.__bat = { charging: b.charging, level: b.level }; });
  return { gpu: d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : null, fps: G.settings.fps, ua: navigator.userAgent, dpr: devicePixelRatio, inner: [innerWidth, innerHeight] }; }, FPS);
await page.waitForTimeout(8000);   // (out of the house, the scene settled, Auto's first choice made)
await page.keyboard.press('F9'); await page.waitForTimeout(500);
// the page's own record: every rAF timestamp, the game's drawn-frame count, the overlay's pacing line each second
await page.evaluate(() => { const G = game; window.__R = []; window.__P = []; const tick = (t) => { window.__R.push(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  G.renderer.timer = G.perf.gpuTimer; G.perf.gpuTimer?.reset();
  window.__pl = setInterval(() => { const el = [...document.querySelectorAll('div,pre')].find((e) => /on pace/.test(e.textContent) && e.children.length < 3); const m = el?.textContent.match(/limit[^\n]*on pace[^\n]*/); if (m) window.__P.push(m[0]); }, 1000); });
const cdp = await ctx.newCDPSession(page);
const chunks = [];
cdp.on('Tracing.dataCollected', (e) => { for (const v of e.value) chunks.push(v); });
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'benchmark', 'cc', 'viz', 'gpu', 'blink.user_timing'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
const T0 = await page.evaluate(() => performance.now());
// 12 s: run in a circle on the square (Up + Left held: the Follow camera turns with him)
await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(12000);
await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp');
const T1 = await page.evaluate(() => performance.now());
// then the house (the game's own transition), 6 s standing in it
await page.evaluate(() => game.enterRoom('house', null, false, true));
await page.waitForTimeout(8000);
const T2 = await page.evaluate(() => performance.now());
await cdp.send('Tracing.end'); await done;
const page2 = await page.evaluate(() => { clearInterval(window.__pl); return { raf: window.__R, pace: window.__P, gpu: game.perf.gpuTimer?.stats?.() || null, bat: window.__bat || null, fps: game.settings.fps, quality: game.settings.quality, room: game.room?.id }; });
fs.writeFileSync(OUT + '.trace.json.gz', zlib.gzipSync(JSON.stringify({ traceEvents: chunks })));
// --- analysis
const iv = (a) => { const o = []; for (let i = 1; i < a.length; i++) o.push(+(a[i] - a[i - 1]).toFixed(2)); return o; };
const pc = (a, k) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return +v[Math.min(v.length - 1, Math.floor(k * v.length))].toFixed(1); };
const hist = (a, tgt) => { const h = {}; for (const x of a) { const k = Math.round(x / (1000 / 60)); h[k] = (h[k] || 0) + 1; } return h; };   // in refreshes (16.7 ms units)
const rafAll = page2.raf.filter((t) => t >= T0 && t <= T2);
const seg = (a, b) => page2.raf.filter((t) => t >= a && t <= b);
// the game draws on every rAF at 60; at 30 it skips every other: the game's drawn frames are in the trace (FireAnimationFrame
// with real work) — take the trace's view of frames
const ev = chunks;
const fire = ev.filter((e) => e.name === 'FireAnimationFrame' && e.ph === 'X');
const pres = ev.filter((e) => e.name === 'PipelineReporter' && e.ph === 'b' && e.args?.frame_reporter);
const states = {}; for (const e of pres) { const s = e.args.frame_reporter.state; states[s] = (states[s] || 0) + 1; }
const presented = pres.filter((e) => /PRESENTED/.test(e.args.frame_reporter.state)).map((e) => e.ts / 1000).sort((a, b) => a - b);
const dropped = pres.filter((e) => /DROPPED/.test(e.args.frame_reporter.state)).length;
const fireLong = fire.filter((e) => e.dur / 1000 > 1).map((e) => e.dur / 1000);   // (the game's own frames: real work; the skipped ones are ~0)
const pIv = iv(presented).filter((x) => x < 500);
const res = { env, browser: browser.version(), page: { fps: page2.fps, quality: page2.quality, bat: page2.bat, endRoom: page2.room, gpuMs: page2.gpu },
  raf: { n: rafAll.length, p50: pc(iv(rafAll), 0.5), p95: pc(iv(rafAll), 0.95), refreshUnits: hist(iv(rafAll)) },
  gameFrames: { n: fireLong.length, mainThreadMs: { p50: pc(fireLong, 0.5), p95: pc(fireLong, 0.95), max: pc(fireLong, 1) } },
  presented: { states, n: presented.length, dropped, intervals: { p50: pc(pIv, 0.5), p95: pc(pIv, 0.95), p99: pc(pIv, 0.99) }, refreshUnits: hist(pIv), first60: pIv.slice(0, 60) },
  overlay: page2.pace, phases: { runMs: +(T1 - T0).toFixed(0), houseMs: +(T2 - T1).toFixed(0) }, errs: errs.slice(0, 5) };
fs.writeFileSync(OUT + '.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify({ fps: page2.fps, raf: res.raf, game: res.gameFrames, presented: { states, n: res.presented.n, dropped, intervals: res.presented.intervals, units: res.presented.refreshUnits }, overlay: page2.pace.slice(-3), gpu: page2.gpu && { p50: page2.gpu.p50, p95: page2.gpu.p95 } }));
await browser.close(); process.exit(0);
