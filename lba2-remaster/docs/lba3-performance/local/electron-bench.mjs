// LBA3 in-game benchmark, run automatically in the INSTALLED desktop app (Electron) on the laptop.
// Run it from a folder outside the repo where Playwright is installed (npm init -y && npm i playwright):
//   node electron-bench.mjs <auto|full|visits|smoke> <out.txt> [battery|plugged] [follow|orbit]
// STABILIZATION phase 1, e.g. (on battery, then plugged in, each with Follow and with the orbit):
//   node electron-bench.mjs visits laptop-<version>-visits-follow-battery.txt battery follow
//   node electron-bench.mjs visits laptop-<version>-visits-orbit-battery.txt battery orbit
//   node electron-bench.mjs auto laptop-<version>-auto-follow-battery.txt battery follow
// The app is launched with its own profile (--user-data-dir=<this folder>\electron-profile), never the player's
// %APPDATA%\LBA3 The Awakening: New Game here must not touch the real saves. The run stops before New Game if the
// app reports any other data folder. The profile is kept between runs (shader cache warm, like a player's).
// Fullscreen as the app opens; 'app://game/index.html?nocine' (the opening cinematic skipped, as in the Chrome runner).
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [mode = 'smoke', out, power = '?', camera = 'orbit'] = process.argv.slice(2);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXE = process.env.LBA3_EXE || path.join(process.env.LOCALAPPDATA, 'Programs', 'LBA3 The Awakening', 'LBA3 The Awakening.exe');
const PROFILE = path.join(HERE, 'electron-profile');
const firstUse = !fs.existsSync(PROFILE);

const winPower = () => {
  try {
    const s = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Battery | ForEach-Object { \\"$($_.BatteryStatus) $($_.EstimatedChargeRemaining)\\" }"').toString().trim();
    const [st, pct] = s.split(' ');
    return `${st === '1' ? 'on battery (discharging)' : st === '2' ? 'plugged in (AC)' : 'battery status ' + st}, ${pct} %`;
  } catch { return 'unknown'; }
};

const t0 = new Date();
const power0 = winPower();
const app = await electron.launch({ executablePath: EXE, args: [`--user-data-dir=${PROFILE}`] });
const info = await app.evaluate(({ app }) => ({ data: app.getPath('userData'), version: app.getVersion() }));
if (path.resolve(info.data).toLowerCase() !== path.resolve(PROFILE).toLowerCase()) {
  await app.close();
  throw new Error(`the app uses ${info.data}, not the bench profile ${PROFILE}: stopped before New Game (the player's saves are untouched)`);
}
const page = await app.firstWindow();
const errs = [];
page.on('pageerror', (e) => errs.push('page error: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console error: ' + m.text()); });

const ready = () => page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForLoadState('load');
await page.goto('app://game/index.html?nocine', { waitUntil: 'load', timeout: 180000 });
await ready();
await page.click('[data-act="new"]', { timeout: 60000 });
await page.waitForFunction(() => game.state === 'play' && !game.cine && !game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(5000);

const env = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return {
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?',
    view: `${innerWidth}×${innerHeight} @ dpr ${devicePixelRatio}`,
    quality: game.settings.quality, auto: !!game.settings.qualityAuto,
  };
});

let text;
const tb = Date.now();
if (mode === 'auto') text = await page.evaluate((camera) => game.bench.runAuto({ camera }), camera);
else if (mode === 'full') text = await page.evaluate((camera) => game.bench.run({ camera }), camera);
// (STABILIZATION phase 1: street and arrival — the first visit after the start, 5 region round trips, 3 minutes of play)
else if (mode === 'visits') text = await page.evaluate((camera) => game.bench.visits({ routes: ['street', 'arrival'], cycles: 5, sustainS: 180, camera }), camera);
else text = 'smoke: ' + await page.evaluate(() => `bench.run ${typeof game.bench?.run}, bench.runAuto ${typeof game.bench?.runAuto}, bench.visits ${typeof game.bench?.visits}, state ${game.state}`);
const mins = ((Date.now() - tb) / 60000).toFixed(1);
const power1 = winPower();

const head = [
  `ran in: desktop app ${info.version} (installed, ${EXE}; Playwright _electron, bench profile ${firstUse ? 'NEW this run (cold shader cache)' : 'kept from earlier runs'}, ${env.view}, ?nocine, New Game)`,
  `GPU: ${env.gpu}`,
  `power: Windows says ${power0} at start, ${power1} at end`,
  `settings at start: quality ${env.quality}, Quality Auto ${env.auto ? 'on' : 'off'} (bench profile)`,
  `mode ${mode} · camera ${camera} · started ${t0.toISOString()}, benchmark took ${mins} min`,
].join('\n');
const body = `${head}\n\n${text ?? '(the benchmark returned nothing: it was already running or refused)'}\n\n${errs.length ? 'page errors:\n' + errs.slice(0, 10).join('\n') : 'no page errors'}\n`;
if (out) fs.writeFileSync(out, body);
console.log(body);
await app.close();
