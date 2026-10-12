// LBA3: The Awakening — desktop app (Electron). The game itself is the same code as the web version; this file
// gives it a window of its own, serves its files from the app package, and keeps saves on disk.
//
// Files are served on a private origin (app://game/…) instead of file://, so ES modules, fetch() and storage
// behave exactly as on the web. Saves (the game's localStorage) live in the user's app-data folder:
//   Windows  %APPDATA%\LBA3 The Awakening        macOS  ~/Library/Application Support/LBA3 The Awakening
//   Linux    ~/.config/LBA3 The Awakening
const { app, BrowserWindow, protocol, ipcMain, Menu, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

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

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 800, minHeight: 450,
    backgroundColor: '#000000', title: 'LBA3: The Awakening', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'game', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  // F11 / Alt+Enter: fullscreen; Ctrl+Shift+I: developer tools
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
  });
  // links out of the game (none today) open in the user's browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  win.loadURL('app://game/index.html');
  return win;
}

app.whenReady().then(() => {
  protocol.handle('app', serve);
  ipcMain.on('lba3:quit', () => app.quit());
  ipcMain.on('lba3:fullscreen', (e, on) => { const w = BrowserWindow.fromWebContents(e.sender); w?.setFullScreen(on ?? !w.isFullScreen()); });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
