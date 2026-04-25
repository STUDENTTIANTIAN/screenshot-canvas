import React, { useCallback, useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import ContextMenu from './components/ContextMenu'
import { useTabStore, type CanvasTab } from './store/tabStore'
import './App.css'

function getCanvasApi() {
  return (window as any).__canvasApi as {
    getCanvas: () => any
    addImage: (dataUrl: string) => Promise<void>
    addText: () => void
    deleteSelected: () => void
    copySelected: () => void
    pasteCopied: () => void
    exportPNG: () => void
    getCanvasJSON: () => { json: any; zoom: number; panX: number; panY: number } | null
  } | null
}

function isElectron(): boolean {
  return !!(window as any).electronAPI
}

function loadProjectData(data: string) {
  try {
    const project = JSON.parse(data)
    if (project.version !== 1 || !Array.isArray(project.tabs)) {
      alert('无效的项目文件格式')
      return
    }
    const loadedTabs: CanvasTab[] = project.tabs.map((t: any) => ({
      id: t.id,
      name: t.name || '未命名画布',
      canvasJSON: t.canvasJSON || null,
      zoom: t.zoom || 1,
      panX: t.panX || 0,
      panY: t.panY || 0,
    }))
    useTabStore.setState({
      tabs: loadedTabs,
      activeTabId: loadedTabs[0]?.id || '',
    })
  } catch {
    alert('项目文件解析失败')
  }
}

function App() {
  const tabs = useTabStore((s) => s.tabs)
  const addTab = useTabStore((s) => s.addTab)
  const [hasSelection, setHasSelection] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (tabs.length === 0) addTab()
  }, [tabs.length, addTab])

  useEffect(() => {
    const interval = setInterval(() => {
      const api = getCanvasApi()
      const c = api?.getCanvas()
      if (c) setHasSelection(!!c.getActiveObject())
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const handleCanvasContextMenu = useCallback((pos: { x: number; y: number }, _hasTarget: boolean) => {
    setCtxMenu(pos)
  }, [])

  // Delete key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
        getCanvasApi()?.deleteSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Screenshot — just trigger, result comes via onScreenshotComplete
  const handleScreenshot = useCallback(() => {
    if (!isElectron()) {
      alert('截图功能需要在 Electron 桌面应用中运行')
      return
    }
    ;(window as any).electronAPI.screenshot.capture().catch(console.error)
  }, [])

  // Listen for screenshot from global shortcut & button
  useEffect(() => {
    if (!isElectron()) return
    const cleanup = (window as any).electronAPI.onScreenshotComplete((dataUrl: string) => {
      if (dataUrl) getCanvasApi()?.addImage(dataUrl)
    })
    return () => { if (cleanup) cleanup() }
  }, [])

  // Paste from clipboard
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault()
          const blob = items[i].getAsFile()
          if (!blob) continue
          const reader = new FileReader()
          reader.onload = () => getCanvasApi()?.addImage(reader.result as string)
          reader.readAsDataURL(blob)
          return
        }
      }

      // Fallback: Electron clipboard API
      if (isElectron()) {
        try {
          const dataUrl = await (window as any).electronAPI.clipboard.readImage()
          if (dataUrl) {
            e.preventDefault()
            getCanvasApi()?.addImage(dataUrl)
          }
        } catch {}
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  const handleAddText = useCallback(() => getCanvasApi()?.addText(), [])
  const handleDelete = useCallback(() => getCanvasApi()?.deleteSelected(), [])
  const handleExport = useCallback(() => getCanvasApi()?.exportPNG(), [])

  const handleSave = useCallback(async () => {
    const api = getCanvasApi()
    const canvasData = api?.getCanvasJSON()
    if (!canvasData) return

    const projectData = {
      version: 1,
      tabs: useTabStore.getState().tabs.map((t: CanvasTab) => {
        if (t.id === useTabStore.getState().activeTabId) {
          return { ...t, canvasJSON: canvasData.json, zoom: canvasData.zoom, panX: canvasData.panX, panY: canvasData.panY }
        }
        return t
      }),
    }
    const dataStr = JSON.stringify(projectData)

    if (isElectron()) {
      await (window as any).electronAPI.dialog.saveFile(
        `screenshot-note-${new Date().toISOString().slice(0, 10)}.scnote`,
        dataStr
      )
    } else {
      // Browser fallback: download as JSON
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `screenshot-note-${new Date().toISOString().slice(0, 10)}.scnote`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [])

  const handleLoad = useCallback(async () => {
    if (isElectron()) {
      const data = await (window as any).electronAPI.dialog.openFile()
      if (!data) return
      loadProjectData(data)
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.scnote'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => loadProjectData(reader.result as string)
        reader.readAsText(file)
      }
      input.click()
    }
  }, [])

  return (
    <div className="app">
      <TabBar />
      <div className="main-content">
        <Toolbar
          onScreenshot={handleScreenshot}
          onAddText={handleAddText}
          onDelete={handleDelete}
          onExport={handleExport}
          onSave={handleSave}
          onLoad={handleLoad}
          hasSelection={hasSelection}
        />
        <Canvas onContextMenu={handleCanvasContextMenu} />
        <ContextMenu
          x={ctxMenu?.x ?? 0}
          y={ctxMenu?.y ?? 0}
          visible={!!ctxMenu}
          onCopy={() => getCanvasApi()?.copySelected()}
          onPaste={() => getCanvasApi()?.pasteCopied()}
          onDelete={() => getCanvasApi()?.deleteSelected()}
          onClose={() => setCtxMenu(null)}
          hasSelection={hasSelection}
        />
      </div>
    </div>
  )
}

export default App
