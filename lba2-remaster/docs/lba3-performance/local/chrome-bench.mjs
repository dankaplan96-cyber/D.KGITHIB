// LBA3 in-game benchmark, run automatically in the user's installed Chrome (real GPU) on the laptop.
// Run it from a folder outside the repo where Playwright is installed (npm init -y && npm i playwright), with pacing.mjs:
//   node chrome-bench.mjs <auto|full|pacing|smoke> <out.txt> [battery|plugged]    (GAME_URL=… for another server)
// Needs the game served: cd lba2-remaster && python -m http.server 8161 --bind 127.0.0.1
// A fresh Chrome profile each run (no saved settings or saves), fullscreen like the desktop app, '?nocine' (the
// opening cinematic skipped; the benchmark refuses to run during one). New Game is clicked on the title menu.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pacing } from './pacing.mjs';

const [mode = 'smoke', out, power = '?', camera = 'orbit'] = process.argv.slice(2);
const URL0 = process.env.GAME_URL || 'http://localhost:8161/';

const winPower = () => {
  try {
    const s = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Battery | ForEach-Object { \\"$($_.BatteryStatus) $($_.EstimatedChargeRemaining)\\" }"').toString().trim();
    const [st, pct] = s.split(' ');
    return `${st === '1' ? 'on battery (discharging)' : st === '2' ? 'plugged in (AC)' : 'battery status ' + st}, ${pct} %`;
  } catch { return 'unknown'; }
};

const t0 = new Date();
const power0 = winPower();
const browser = await chromium.launch({
  channel: 'chrome', headless: false,
  args: ['--window-position=0,0', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const context = await browser.newContext({ viewport: null });
const page = await context.newPage();
// true fullscreen (the whole 1366×768 screen, as the desktop app opens), set on the window itself
const cdp = await context.newCDPSession(page);
const { windowId } = await cdp.send('Browser.getWindowForTarget');
await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } });
const errs = [];
page.on('pageerror', (e) => errs.push('page error: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push('console error: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()}: ${r.url()}`); });

await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]', { timeout: 60000 });
// (a profile with a save asks first: "start a new game?")
await page.waitForTimeout(1000);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]', { timeout: 60000 });
await page.waitForFunction(() => game.state === 'play' && !game.cine && !game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(5000);

const env = await page.evaluate(async () => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
  let bat = null; try { const b = await navigator.getBattery(); bat = `${b.charging ? 'charging' : 'not charging'}, ${Math.round(b.level * 100)} %`; } catch {}
  return {
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?',
    ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || navigator.userAgent,
    view: `${innerWidth}×${innerHeight} @ dpr ${devicePixelRatio}`,
    bat, quality: game.settings.quality, auto: !!game.settings.qualityAuto,
  };
});

let text;
const tb = Date.now();
if (mode === 'pacing') text = await pacing(page);
else if (mode === 'auto') text = await page.evaluate((camera) => game.bench.runAuto({ camera }), camera);
else if (mode === 'full') text = await page.evaluate((camera) => game.bench.run({ camera }), camera);
else if (mode === 'visits') text = await page.evaluate((camera) => game.bench.visits({ routes: ['street', 'arrival'], cycles: 5, sustainS: 180, camera }), camera);
else text = 'smoke: ' + await page.evaluate(() => `bench.run ${typeof game.bench?.run}, bench.runAuto ${typeof game.bench?.runAuto}, state ${game.state}`);
const mins = ((Date.now() - tb) / 60000).toFixed(1);
const power1 = winPower();

const head = [
  `ran in: Chrome (${env.ua}, Playwright, fresh profile, fullscreen ${env.view}, ?nocine, New Game), NOT the desktop app · game served from ${URL0}`,
  `GPU: ${env.gpu}`,
  `power: Windows says ${power0} at start, ${power1} at end; Chrome battery API: ${env.bat ?? 'n/a'}`,
  `settings at start: quality ${env.quality}, Quality Auto ${env.auto ? 'on' : 'off'} (fresh profile defaults)`,
  `mode ${mode} · camera ${camera} · started ${t0.toISOString()}, benchmark took ${mins} min`,
].join('\n');
const body = `${head}\n\n${text ?? '(the benchmark returned nothing: it was already running or refused)'}\n\n${errs.length ? 'page errors:\n' + errs.slice(0, 10).join('\n') : 'no page errors'}\n`;
if (out) fs.writeFileSync(out, body);
console.log(body);
await browser.close();
