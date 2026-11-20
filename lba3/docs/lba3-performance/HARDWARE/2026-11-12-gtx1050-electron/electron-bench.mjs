// Local runner (not in the repo): the game's own benchmark in the desktop app's Electron (43.7.9, the test lab's copy)
// on this machine, the GTX 1050, from a repo checkout's desktop/ folder (node desktop/copy-game.mjs first).
//   node electron-bench.mjs <lba3 root> <auto|high|medium> <out.txt> [profile dir]
// Saves and caches go to a fresh profile folder (APPDATA pointed there), never the user's own app data.
import { _electron as electron } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const [ROOT, mode = 'auto', out, PROFILE = 'C:/Users/danka/dev/lba3-bench/electron-profile-' + Date.now()] = process.argv.slice(2);
const EXE = 'C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/electron/dist/electron.exe';
fs.mkdirSync(PROFILE, { recursive: true });
const nv = () => { try { return execSync('nvidia-smi --query-gpu=utilization.gpu,memory.used,temperature.gpu --format=csv,noheader').toString().trim(); } catch { return 'unavailable'; } };
const nv0 = nv(), t0 = new Date();
const app = await electron.launch({ executablePath: EXE, args: ['--user-data-dir=' + PROFILE, path.join(ROOT, 'desktop')], env: { ...process.env } });
const win = await app.firstWindow();
const errs = [];
win.on('pageerror', (e) => errs.push('page error: ' + e.message));
win.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push('console error: ' + m.text()); });
await win.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 400000 });
const userData = await app.evaluate(({ app }) => app.getPath('userData'));
await win.click('[data-act="new"]');
await win.waitForTimeout(1000);
if (await win.evaluate(() => game.screen === 'confirmnew')) await win.click('[data-act="newyes"]');
// (the opening cinematic: skipped as a player would)
for (let i = 0; i < 120 && !(await win.evaluate(() => game.state === 'play' && !game.cine && !game.preparing)); i++) { await win.keyboard.press('Escape'); await win.waitForTimeout(1000); }
await win.waitForTimeout(5000);
const env = await win.evaluate(() => {
  const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2') || c.getContext('webgl')); const d = g && g.getExtension('WEBGL_debug_renderer_info');
  return { gpu: d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?', view: `${innerWidth}x${innerHeight} @ dpr ${devicePixelRatio}`, version: game.version, quality: game.settings.quality, auto: !!game.settings.qualityAuto, ua: navigator.userAgent.match(/Electron\/[\d.]+|Chrome\/[\d.]+/g)?.join(' '), parallel: !!(g && g.getExtension('KHR_parallel_shader_compile')) };
});
let text;
const tb = Date.now();
if (!/NVIDIA/i.test(env.gpu)) text = `ABORTED: not on the NVIDIA card (${env.gpu})`;
else if (mode === 'auto') text = await win.evaluate(() => game.bench.runAuto({ camera: 'orbit' }));
else text = await win.evaluate((q) => game.bench.run([q], { camera: 'orbit', breakdown: false }), mode);
const head = [
  `ran in: the desktop app's Electron (${env.ua}; test lab copy, Playwright), source checkout ${ROOT} (desktop/copy-game.mjs) · game.version ${env.version}`,
  `profile: ${userData} (fresh: APPDATA pointed at ${PROFILE}) · window ${env.view} · KHR_parallel_shader_compile ${env.parallel ? 'yes' : 'no'}`,
  `GPU (the game's canvas): ${env.gpu}`,
  `nvidia-smi (util, memory, temp): ${nv0} before · ${nv()} after`,
  `settings at start: quality ${env.quality}, Quality Auto ${env.auto ? 'on' : 'off'}`,
  `mode ${mode} · started ${t0.toISOString()} · benchmark took ${((Date.now() - tb) / 60000).toFixed(1)} min`,
].join('\n');
const body = `${head}\n\n${text ?? '(the benchmark returned nothing)'}\n\n${errs.length ? 'page errors:\n' + errs.slice(0, 10).join('\n') : 'no page errors'}\n`;
if (out) fs.writeFileSync(out, body);
console.log(body);
await app.close();
