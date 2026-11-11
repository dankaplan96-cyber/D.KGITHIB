// Local runner (not in the repo): the game's own benchmark in the installed Chrome on this machine.
//   node bench-gtx.mjs <auto|medium|high> <out.txt>
// Follows lba3/docs/lba3-performance/local/chrome-bench.mjs (fresh profile, ?nocine, New Game), but serves the
// development build itself and sizes the window to match the first run on this machine (1536x819 inner).
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const [mode = 'auto', out] = process.argv.slice(2);
const WANT = { w: 1536, h: 819 };
const ps = (cmd) => { try { return execSync(`powershell -NoProfile -Command "${cmd}"`).toString().trim(); } catch { return 'unknown'; } };
const winPower = () => { const s = ps('Get-CimInstance Win32_Battery | ForEach-Object { $_.BatteryStatus.ToString() + \' \' + $_.EstimatedChargeRemaining }'); const [st, pct] = s.split(' '); return `${st === '1' ? 'on battery' : st === '2' ? 'plugged in (AC)' : 'status ' + st}, ${pct} %`; };
const nv = () => { try { return execSync('nvidia-smi --query-gpu=utilization.gpu,memory.used,temperature.gpu --format=csv,noheader').toString().trim(); } catch { return 'unavailable'; } };

const server = await serve('C:/Users/danka/dev/D.KGITHIB/lba3');
const t0 = new Date(), power0 = winPower(), nv0 = nv();
const browser = await chromium.launch({ channel: 'chrome', headless: false,
  // (CalculateNativeWinOcclusion off: a window behind another app's window was throttled to 1 frame a second)
  args: ['--window-position=0,0', '--disable-features=CalculateNativeWinOcclusion','--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const context = await browser.newContext({ viewport: null });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const { windowId } = await cdp.send('Browser.getWindowForTarget');
// size the window so the page's inner size is WANT (two passes: the frame's own size is measured, then corrected)
let bw = WANT.w + 16, bh = WANT.h + 90;
for (let i = 0; i < 3; i++) {
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: bw, height: bh } });
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  if (s.w === WANT.w && s.h === WANT.h) break;
  bw += WANT.w - s.w; bh += WANT.h - s.h;
}
const errs = [];
page.on('pageerror', (e) => errs.push('page error: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push('console error: ' + m.text()); });

await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]', { timeout: 60000 });
await page.waitForTimeout(1000);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]', { timeout: 60000 });
await page.waitForFunction(() => game.state === 'play' && !game.cine && !game.preparing, null, { timeout: 300000 });
await page.bringToFront();
await page.waitForTimeout(5000);
// refuse to measure a throttled page: 60 frames must not take much longer than a second
const raf = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); const f = () => { if (++n === 60) res(performance.now() - t); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));

const env = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
  const gg = game.renderer?.gl || game.gl || null;
  let gameGpu = '?';
  try { const c = document.querySelector('canvas'); const g2 = c && (c.getContext('webgl2') || c.getContext('webgl')); const d2 = g2 && g2.getExtension('WEBGL_debug_renderer_info'); if (d2) gameGpu = g2.getParameter(d2.UNMASKED_RENDERER_WEBGL); } catch {}
  return { gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?', gameGpu,
    ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || navigator.userAgent,
    view: `${innerWidth}x${innerHeight} @ dpr ${devicePixelRatio}`, version: game.version,
    quality: game.settings.quality, auto: !!game.settings.qualityAuto };
});
const chromeVer = await browser.version();

let text;
const tb = Date.now();
if (!/NVIDIA/i.test(env.gpu)) text = `ABORTED: the browser is not on the NVIDIA card (${env.gpu})`;
else if (raf > 3000) text = `ABORTED: the page is throttled (60 animation frames took ${Math.round(raf)} ms): the window is hidden or in the background`;
else if (mode === 'auto') text = await page.evaluate(() => game.bench.runAuto({ camera: 'orbit' }));
else text = await page.evaluate((q) => game.bench.run([q], { camera: 'orbit', breakdown: false }), mode);
const mins = ((Date.now() - tb) / 60000).toFixed(1);
const head = [
  `ran in: Chrome ${chromeVer} (Playwright, fresh profile, window ${env.view}, ?nocine, New Game), NOT the desktop app · development build served from ${server.url} · game.version ${env.version}`,
  `GPU (a fresh WebGL2 context): ${env.gpu}`,
  `GPU (the game's canvas): ${env.gameGpu}`,
  `power: ${power0} at start, ${winPower()} at end`,
  `nvidia-smi (util, memory, temp): ${nv0} before · ${nv()} after`,
  `settings at start: quality ${env.quality}, Quality Auto ${env.auto ? 'on' : 'off'} (fresh profile defaults)`,
  `pace check before the run: 60 animation frames in ${Math.round(raf)} ms`,
  `mode ${mode} · camera orbit · started ${t0.toISOString()} · benchmark took ${mins} min`,
].join('\n');
const body = `${head}\n\n${text ?? '(the benchmark returned nothing: it was already running or refused)'}\n\n${errs.length ? 'page errors:\n' + errs.slice(0, 10).join('\n') : 'no page errors'}\n`;
if (out) fs.writeFileSync(out, body);
console.log(body);
await browser.close();
await server.close();
