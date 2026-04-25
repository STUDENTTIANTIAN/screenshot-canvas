const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, dialog } = require('electron')
const path = require('path')
const { createScreenshotWindow } = require('./screenshot')
const fs = require('fs')

let mainWindow

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createMainWindow()

  globalShortcut.register('CommandOrControl+Shift+X', () => {
    if (mainWindow) createScreenshotWindow(mainWindow)
  })

  // Screenshot
  ipcMain.handle('screenshot:capture', () => {
    return new Promise((resolve) => {
      createScreenshotWindow(mainWindow).then(resolve)
    })
  })

  // Clipboard
  ipcMain.handle('clipboard:readImage', () => {
    const img = clipboard.readImage()
    if (img.isEmpty()) return null
    return img.toDataURL()
  })

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())

  // Dialog
  ipcMain.handle('dialog:saveFile', async (_, defaultName, data) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: '截图笔记项目', extensions: ['scnote'] }],
    })
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, data, 'utf-8')
      return true
    }
    return false
  })

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: '截图笔记项目', extensions: ['scnote'] }],
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths[0]) {
      return fs.readFileSync(result.filePaths[0], 'utf-8')
    }
    return null
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
