// Electron main for the crackle runs: the same Chromium switches as lba3/desktop/main.js (autoplay, playout stats,
// GPU blocklist off, high-performance GPU, no background throttling), loading the worktree's game over http.
const { app, BrowserWindow, session, desktopCapturer } = require('electron');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-blink-features', process.env.LBA_BLINK || 'AudioContextPlayoutStats');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');
app.whenReady().then(() => {
  // LBA_LOOPBACK: getDisplayMedia gets the system's audio mix (WASAPI loopback: what Windows' mixer receives)
  if (process.env.LBA_LOOPBACK) session.defaultSession.setDisplayMediaRequestHandler((req, cb) => { desktopCapturer.getSources({ types: [process.env.LBA_LOOPBACK === 'window' ? 'window' : 'screen'] }).then((s) => cb({ video: s[0], audio: 'loopback' })); });
  const win = new BrowserWindow({ width: 1366, height: 768, useContentSize: true, backgroundColor: '#000000', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  win.loadURL(process.env.LBA_URL || 'http://localhost:8123/?nocine');
});
app.on('window-all-closed', () => app.quit());
