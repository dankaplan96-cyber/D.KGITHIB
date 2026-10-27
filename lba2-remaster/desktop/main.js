// LBA3: The Awakening — desktop app (Electron). The game itself is the same code as the web version; this file
// gives it a window of its own, serves its files from the app package, and keeps saves on disk.
//
// Files are served on a private origin (app://game/…) instead of file://, so ES modules, fetch() and storage
// behave exactly as on the web. Saves (the game's localStorage) live in the user's app-data folder:
//   Windows  %APPDATA%\LBA3 The Awakening        macOS  ~/Library/Application Support/LBA3 The Awakening
//   Linux    ~/.config/LBA3 The Awakening
const { app, BrowserWindow, protocol, ipcMain, Menu, shell, powerMonitor } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');

const GAME = path.join(__dirname, 'game');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

// browsers wait for a click before sound; a game window may play at once
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// a game: always the graphics card (Chromium falls back to software rendering on a blocklisted driver, and
// laptops with two GPUs may otherwise hand it the slower integrated one)
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');
if (process.env.LBA3_SOFTWARE_GL) app.commandLine.appendSwitch('use-angle', 'swiftshader'), app.commandLine.appendSwitch('enable-unsafe-swiftshader');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);

async function serve(request) {
  const url = new URL(request.url);
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.normalize(path.join(GAME, rel));
  if (!file.startsWith(GAME + path.sep)) return new Response('Forbidden', { status: 403 });
  try {
    const body = await fs.readFile(file);
    return new Response(body, { status: 200, headers: { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

// the game opens fullscreen (the user: "not F11 every time"); leaving it with F11 / Alt+Enter is remembered for
// the next start (window.json in the app-data folder). --windowed on the command line opens a window once
const WINDOW_PREFS = () => path.join(app.getPath('userData'), 'window.json');
function readFullscreen() {
  if (process.argv.includes('--windowed')) return false;
  try { return JSON.parse(fsSync.readFileSync(WINDOW_PREFS(), 'utf8')).fullscreen !== false; } catch { return true; }
}
function rememberFullscreen(on) {
  try { fsSync.writeFileSync(WINDOW_PREFS(), JSON.stringify({ fullscreen: !!on })); } catch { /* read-only profile: start fullscreen again */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 800, minHeight: 450, fullscreen: readFullscreen(),
    backgroundColor: '#000000', title: 'LBA3: The Awakening', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'game', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => rememberFullscreen(true));
  win.on('leave-full-screen', () => rememberFullscreen(false));
  // F11 / Alt+Enter: fullscreen; Ctrl+Shift+I: developer tools
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
  });
  // links out of the game (none today) open in the user's browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  // PERF-BATTERY: the game draws less while the window can't be seen or isn't the one in use (backgroundThrottling is
  // off so the music keeps playing; the user saw 91 % GPU with the game behind another window): its state, as it changes
  const state = () => { if (!win.isDestroyed()) win.webContents.send('lba3:window', { focused: win.isFocused(), minimized: win.isMinimized(), visible: win.isVisible() }); };
  for (const ev of ['focus', 'blur', 'minimize', 'restore', 'show', 'hide']) win.on(ev, state);
  win.loadURL('app://game/index.html');
  return win;
}

// PERF-BATTERY: battery or mains, for the game's battery profile (src/engine/power.js): asked once synchronously by
// preload.js (so the first shaders are compiled for the right profile), then every change
function onBattery() {
  try { return typeof powerMonitor.isOnBatteryPowered === 'function' ? !!powerMonitor.isOnBatteryPowered() : !!powerMonitor.onBatteryPower; } catch { return null; }
}
app.whenReady().then(() => {
  protocol.handle('app', serve);
  ipcMain.on('lba3:power-now', (e) => { e.returnValue = onBattery(); });
  const power = (v) => { for (const w of BrowserWindow.getAllWindows()) w.webContents.send('lba3:power', v); };
  powerMonitor.on('on-battery', () => power(true));
  powerMonitor.on('on-ac', () => power(false));
  ipcMain.on('lba3:quit', () => app.quit());
  ipcMain.on('lba3:fullscreen', (e, on) => { const w = BrowserWindow.fromWebContents(e.sender); w?.setFullScreen(on ?? !w.isFullScreen()); });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
