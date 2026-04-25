const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  sendResult: (rect) => ipcRenderer.send('screenshot:result', rect),
})
