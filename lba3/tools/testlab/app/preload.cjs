// The window's only bridge to the tool: named actions, no general access to Node or the file system.
const { contextBridge, ipcRenderer } = require('electron');
const call = (name) => (...a) => ipcRenderer.invoke(name, ...a);
contextBridge.exposeInMainWorld('lab', {
  state: call('state'), target: call('target'), selectGame: call('select-game'), selectProject: call('select-project'),
  run: call('run'), reproduce: call('reproduce'), compare: call('compare'), openReport: call('open-report'), stop: call('stop'), fix: call('fix'),
  on: (fn) => ipcRenderer.on('lab', (_, e) => fn(e)),
});
