// Launch the real game with an isolated profile and return one handle for the tests.
//   packaged: the game's EXE (a portable build or an unpacked release) through Playwright's _electron. The player's
//             own data folder (%APPDATA%\LBA3 The Awakening) is never used: the app gets --user-data-dir=<profile> and the
//             launch stops before any click if the app reports another folder.
//   dev:      the repository's game folder served on 127.0.0.1 (server.mjs) in the installed Chrome with its own profile.
// Debug endpoints: Playwright starts the app / browser with --remote-debugging-port=0 (and --inspect=0 for Electron):
// ephemeral ports bound to 127.0.0.1 by Chromium and Node, never on the network. Nothing else is opened.
import { _electron as electron, chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './server.mjs';
import { sleep } from './util.mjs';
import { execFileSync } from 'node:child_process';

export class LaunchError extends Error { constructor(msg, kind = 'launch') { super(msg); this.kind = kind; } }

const READY = () => window.game && document.querySelector('#loading')?.classList.contains('hidden') && !window.game.preparing;

// opts: { target: 'packaged'|'dev', game, project, profileDir, fresh, query, appArgs, timeoutMs, onEvent }
export async function launch(opts) {
  const { target, profileDir, fresh = false, query = '?nocine', appArgs = [], timeoutMs = 300000, onEvent = () => {} } = opts;
  if (fresh) fs.rmSync(profileDir, { recursive: true, force: true });
  const coldProfile = !fs.existsSync(profileDir);
  fs.mkdirSync(profileDir, { recursive: true });
  const t0 = Date.now();
  const H = { target, coldProfile, profileDir, events: [], errors: [], closed: false, crashed: false, debug: 'Playwright: --remote-debugging-port=0' + (target === 'packaged' ? ' and --inspect=0' : '') + ' (127.0.0.1, ephemeral)' };
  const note = (kind, text) => { const e = { t: Date.now(), kind, text }; H.events.push(e); onEvent(e); };

  if (target === 'packaged') {
    if (!opts.game || !fs.existsSync(opts.game)) throw new LaunchError(`game EXE not found: ${opts.game || '(none selected)'}`);
    try {
      // (the Test Lab window runs this engine with ELECTRON_RUN_AS_NODE: the game, an Electron app too, must not inherit it)
      const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
      H.app = await electron.launch({ executablePath: opts.game, args: [`--user-data-dir=${profileDir}`, ...appArgs], env, timeout: 120000 });
    } catch (e) {
      throw new LaunchError(`the game did not start under automation (${e.message.split('\n')[0]}). A production EXE may not allow a debugging connection: use the development build, or a test build that allows it.`);
    }
    const info = await H.app.evaluate(({ app }) => ({ data: app.getPath('userData'), version: app.getVersion() }));
    if (path.resolve(info.data).toLowerCase() !== path.resolve(profileDir).toLowerCase()) {
      await H.app.close().catch(() => {});
      throw new LaunchError(`the game uses ${info.data}, not the test profile: stopped before any input (personal saves untouched)`, 'profile');
    }
    H.appVersion = info.version;
    H.app.on('close', () => { if (!H.closing) { H.crashed = true; note('crash', 'the game process exited'); } H.closed = true; });
    H.page = await H.app.firstWindow();
    H.base = 'app://game/index.html';
  } else {
    if (!opts.project || !fs.existsSync(path.join(opts.project, 'index.html'))) throw new LaunchError(`no game folder with index.html at ${opts.project || '(none selected)'}`);
    H.server = await serve(opts.project);
    try {
      H.context = await chromium.launchPersistentContext(profileDir, { channel: 'chrome', headless: false, viewport: null,
        args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
    } catch (e) { await H.server.close(); throw new LaunchError(`Chrome did not start: ${e.message.split('\n')[0]}`); }
    H.context.on('close', () => { if (!H.closing) { H.crashed = true; note('crash', 'the browser closed'); } H.closed = true; });
    H.page = H.context.pages()[0] || await H.context.newPage();
    H.base = H.server.url;
    H.appVersion = null;
  }
  const page = H.page;
  page.on('pageerror', (e) => { H.errors.push({ t: Date.now(), kind: 'exception', text: e.message, stack: e.stack || '' }); note('error', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { H.errors.push({ t: Date.now(), kind: 'console error', text: m.text(), at: m.location()?.url ? `${m.location().url}:${m.location().lineNumber}` : '' }); note('error', m.text()); } });
  page.on('crash', () => { H.crashed = true; H.errors.push({ t: Date.now(), kind: 'crash', text: 'the page crashed' }); note('crash', 'the page crashed'); });
  await page.addInitScript(() => {
    // unhandled promise rejections are reported to the console by the browser only as text: keep them as errors
    window.addEventListener('unhandledrejection', (e) => console.error('unhandled promise rejection: ' + (e.reason?.stack || e.reason)));
  });

  // fullscreen as the desktop app opens (the app remembers leaving fullscreen in its profile: set it every run)
  await setFullscreen(H, true);
  await page.goto(H.base + query, { waitUntil: 'load', timeout: 180000 });
  H.timing = { launchMs: Date.now() - t0 };
  await page.waitForFunction(READY, null, { timeout: timeoutMs }).catch(() => { throw new LaunchError('the title screen did not finish loading in time', 'timeout'); });
  H.timing.titleMs = Date.now() - t0;
  H.version = await page.evaluate(() => game.version);
  H.close = async () => {
    H.closing = true;
    try { if (H.app) await H.app.close(); if (H.context) await H.context.close(); } catch {}
    if (H.server) await H.server.close();
  };
  return H;
}

export async function setFullscreen(H, on) {
  if (H.app) await H.app.evaluate(({ BrowserWindow }, on) => { const w = BrowserWindow.getAllWindows()[0]; if (w && w.isFullScreen() !== on) w.setFullScreen(on); }, on);
  else {
    const cdp = await H.context.newCDPSession(H.page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: on ? 'fullscreen' : 'normal' } });
    await cdp.detach();
  }
  await sleep(500);
}

// display and window as the app sees them (Electron reports the refresh rate; a browser does not)
export async function display(H) {
  const page = await H.page.evaluate(() => ({ window: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio, focused: document.hasFocus() }));
  if (!H.app) return { ...page, refreshHz: 'Unavailable (browser)' };
  const d = await H.app.evaluate(({ BrowserWindow, screen }) => { const w = BrowserWindow.getAllWindows()[0], d = screen.getDisplayMatching(w.getBounds()); return { refreshHz: d.displayFrequency, size: `${d.size.width}x${d.size.height}`, scale: d.scaleFactor, fullscreen: w.isFullScreen() }; });
  return { ...page, ...d };
}

// process CPU and memory of the game (Electron's own metrics; for Chrome the CPU time of the browser's processes)
export async function processMetrics(H) {
  try {
    if (H.app) {
      const m = await H.app.evaluate(({ app }) => app.getAppMetrics().map((p) => ({ type: p.type, cpu: p.cpu.percentCPUUsage, mem: p.memory.workingSetSize })));
      return { cpuPercent: +m.reduce((a, p) => a + p.cpu, 0).toFixed(1), workingSetMB: +(m.reduce((a, p) => a + p.mem, 0) / 1024).toFixed(0), processes: m.length };
    }
    const cdp = await H.context.newCDPSession(H.page);
    const { processInfo } = await cdp.send('SystemInfo.getProcessInfo').catch(() => ({ processInfo: null }));
    await cdp.detach();
    return processInfo ? { cpuTimeS: +processInfo.reduce((a, p) => a + p.cpuTime, 0).toFixed(1), workingSetMB: 'Unavailable (browser)', processes: processInfo.length } : { cpuPercent: 'Unavailable', workingSetMB: 'Unavailable' };
  } catch { return { cpuPercent: 'Unavailable', workingSetMB: 'Unavailable' }; }
}

// Cleanup after an interrupted run: game or browser processes still running with a Test Lab profile (their command
// line names the profile folder). Only those: the player's own game and Chrome windows are never touched.
export function cleanupStale(profileRoot) {
  const needle = path.resolve(profileRoot).replace(/'/g, "''");
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `$n = '${needle}'; $p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($n) -and $_.ProcessId -ne $PID }; $p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; @($p).Count`], { encoding: 'utf8', timeout: 30000 });
    return +out.trim() || 0;
  } catch { return 0; }
}
