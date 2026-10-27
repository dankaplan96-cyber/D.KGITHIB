// What the desktop app adds to the game page (window.desktop): quitting and fullscreen, the power source, the window's state.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('lba3:quit'),
  fullscreen: (on) => ipcRenderer.send('lba3:fullscreen', on),
  platform: process.platform,
  // PERF-BATTERY: on battery now (true / false; null: not known), and its changes (src/engine/power.js); the window's
  // focus / minimised / shown state as it changes (main.js: drawing slows down while it can't be seen or is not in use)
  onBattery: (() => { try { const v = ipcRenderer.sendSync('lba3:power-now'); return typeof v === 'boolean' ? v : null; } catch { return null; } })(),
  onPower: (cb) => { ipcRenderer.on('lba3:power', (e, v) => cb(!!v)); },
  onWindow: (cb) => { ipcRenderer.on('lba3:window', (e, st) => cb(st)); },
});
