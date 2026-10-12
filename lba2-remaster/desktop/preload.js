// What the desktop app adds to the game page (window.desktop): quitting and fullscreen.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('lba3:quit'),
  fullscreen: (on) => ipcRenderer.send('lba3:fullscreen', on),
  platform: process.platform,
});
