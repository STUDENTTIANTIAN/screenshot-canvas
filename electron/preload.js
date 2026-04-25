const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  screenshot: {
    capture: () => ipcRenderer.invoke('screenshot:capture'),
  },
  clipboard: {
    readImage: () => ipcRenderer.invoke('clipboard:readImage'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  dialog: {
    saveFile: (defaultName, data) => ipcRenderer.invoke('dialog:saveFile', defaultName, data),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
  },
  onScreenshotComplete: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('screenshot:complete', handler)
    return () => ipcRenderer.removeListener('screenshot:complete', handler)
  },
})
