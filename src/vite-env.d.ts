/// <reference types="vite/client" />

interface ElectronAPI {
  screenshot: {
    capture: () => Promise<string | null>
  }
  clipboard: {
    readImage: () => Promise<string | null>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
  dialog: {
    saveFile: (defaultName: string, data: string) => Promise<boolean>
    openFile: () => Promise<string | null>
  }
  onScreenshotComplete: (callback: (data: string) => void) => void
}

interface Window {
  electronAPI: ElectronAPI
}
