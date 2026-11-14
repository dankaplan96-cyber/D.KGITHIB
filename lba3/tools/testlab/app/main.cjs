// LBA3 Test Lab — the window. It remembers the paths, starts the engine (engine/cli.mjs) as a child process, shows
// the current test, progress, elapsed time and the latest finding, and stops it on Stop. No logs in the window: the
// full record is in each run's folder.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
// runs (and the remembered paths) next to the tool in the repository; in the portable build, in the user's app data
const RUNS = app.isPackaged ? path.join(app.getPath('userData'), 'runs') : path.join(ROOT, 'runs');
const CONFIG = path.join(RUNS, 'config.json');
fs.mkdirSync(RUNS, { recursive: true });
const readCfg = () => { try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch { return {}; } };
const saveCfg = (c) => fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2));
let cfg = { target: 'packaged', project: path.resolve(ROOT, '..', '..'), ...readCfg() };
let win = null, child = null, lastReport = cfg.lastReport || null;

function send(type, data) { win?.webContents.send('lab', { type, ...data }); }
function claudeCli() { try { return execFileSync('where', ['claude'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim() || null; } catch { return null; } }

function start(args) {
  if (child) return;
  // the engine runs on Electron's own Node (no separate install needed)
  child = spawn(process.execPath, [path.join(ROOT, 'engine', 'cli.mjs'), ...args, '--runs', RUNS], { cwd: ROOT, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
  const t0 = Date.now(); let buf = '', err = '';
  send('running', { args, t0 });
  child.stdout.on('data', (d) => {
    buf += d; const lines = buf.split('\n'); buf = lines.pop();
    for (const l of lines) { try { const e = JSON.parse(l); if (e.type === 'end') { lastReport = e.report; cfg.lastReport = e.report; saveCfg(cfg); } send('event', e); } catch {} }
  });
  child.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
  child.on('exit', (code) => { child = null; send('idle', { code, error: code ? err.trim().split('\n').slice(-3).join(' ') : '', report: lastReport }); });
}

ipcMain.handle('state', () => ({ cfg, running: !!child, report: lastReport, claude: claudeCli() }));
ipcMain.handle('target', (_, t) => { cfg.target = t; saveCfg(cfg); return cfg; });
ipcMain.handle('select-game', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Select the game (LBA3 The Awakening.exe from a portable or unpacked build)', filters: [{ name: 'Game', extensions: ['exe'] }], properties: ['openFile'] });
  if (!r.canceled) { cfg.game = r.filePaths[0]; cfg.target = 'packaged'; saveCfg(cfg); }
  return cfg;
});
ipcMain.handle('select-project', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Select the game folder of the repository (the one with index.html)', properties: ['openDirectory'], defaultPath: cfg.project });
  if (!r.canceled) {
    let p = r.filePaths[0]; if (!fs.existsSync(path.join(p, 'index.html')) && fs.existsSync(path.join(p, 'lba3', 'index.html'))) p = path.join(p, 'lba3');
    cfg.project = p; cfg.target = 'dev'; saveCfg(cfg);
  }
  return cfg;
});
const targetArgs = () => (cfg.target === 'packaged' ? ['--target', 'packaged', '--game', cfg.game || ''] : ['--target', 'dev', '--project', cfg.project || '']);
ipcMain.handle('run', (_, suite) => start([suite, ...targetArgs()]));
ipcMain.handle('reproduce', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Reproduce: pick a scenario (a run folder → scenarios)', defaultPath: lastReport ? path.join(path.dirname(lastReport), 'scenarios') : RUNS, filters: [{ name: 'Scenario', extensions: ['json'] }], properties: ['openFile'] });
  if (!r.canceled) start(['reproduce', r.filePaths[0]]);
});
ipcMain.handle('compare', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Compare: pick the candidate build (its EXE). The selected game is the baseline.', filters: [{ name: 'Game', extensions: ['exe'] }], properties: ['openFile'] });
  if (!r.canceled) start(['compare', ...targetArgs(), '--candidate', r.filePaths[0]]);
});
ipcMain.handle('open-report', () => { if (lastReport && fs.existsSync(lastReport)) shell.openPath(lastReport); else shell.openPath(RUNS); });
ipcMain.handle('stop', () => { if (child) { child.stdin.write('stop\n'); setTimeout(() => { if (child) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']); }, 90000); } });
ipcMain.handle('fix', async () => {
  // the task bundle of the last run, for Claude Code; with the claude command installed, the bounded repair loop
  if (!lastReport) return { text: 'Run a test first.' };
  const runDir = path.dirname(lastReport), tasks = path.join(runDir, 'claude-tasks.md');
  const cli = claudeCli();
  if (!cli) return { text: `Claude Code is not installed as a command here. Task file: ${tasks}\nIn Claude Code (in the repository), run:\n  Read ${tasks} and fix the highest-impact finding; then run its reproduce command.`, open: tasks };
  start(['repair', runDir, '--project', cfg.project]);
  return { text: 'Fix and Retest started (an isolated worktree; nothing is pushed).' };
});

app.whenReady().then(() => {
  win = new BrowserWindow({ width: 720, height: 560, minWidth: 560, minHeight: 460, title: 'LBA3 Test Lab', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'index.html'));
});
app.on('window-all-closed', () => { if (child) child.stdin.write('stop\n'); app.quit(); });
