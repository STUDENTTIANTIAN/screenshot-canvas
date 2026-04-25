import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import {
  createCanvas,
  setupZoom,
  setupPan,
  addImageToCanvas,
  addTextToCanvas,
  getCanvasViewport,
  loadCanvasFromJSON,
  drawGrid,
} from '../lib/fabric-setup'
import { useTabStore } from '../store/tabStore'
import type { CanvasJSON } from '../lib/fabric-setup'

let copyBuffer: string | null = null

interface CanvasProps {
  onContextMenu?: (pos: { x: number; y: number }, hasTarget: boolean) => void
}

const Canvas: React.FC<CanvasProps> = ({ onContextMenu }) => {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const [ready, setReady] = useState(false)

  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabs = useTabStore((s) => s.tabs)
  const updateCanvasState = useTabStore((s) => s.updateCanvasState)

  // Ref to always point to current activeTabId (avoids stale closures)
  const activeTabIdRef = useRef(activeTabId)
  activeTabIdRef.current = activeTabId

  // Save current canvas state into the active tab
  const persistCanvas = useCallback(() => {
    const c = fabricRef.current
    if (!c) return
    const json = c.toJSON()
    const { zoom, panX, panY } = getCanvasViewport(c)
    updateCanvasState(activeTabIdRef.current, json, zoom, panX, panY)
  }, [updateCanvasState])

  // Load canvas state from a specific tab
  const restoreCanvas = useCallback((tab: (typeof tabs)[0]) => {
    const c = fabricRef.current
    if (!c) return

    if (tab?.canvasJSON) {
      loadCanvasFromJSON(c, tab.canvasJSON).then(() => {
        c.setZoom(tab.zoom)
        const vpt = c.viewportTransform!
        vpt[4] = tab.panX
        vpt[5] = tab.panY
        c.requestRenderAll()
      })
    } else {
      c.clear()
      c.setZoom(1)
      const vpt = c.viewportTransform!
      vpt[4] = 0
      vpt[5] = 0
      drawGrid(c)
    }
  }, [])

  // Expose canvas API globally for Toolbar access
  useEffect(() => {
    const api = {
      getCanvas: () => fabricRef.current,
      addImage: async (dataUrl: string) => {
        if (fabricRef.current) await addImageToCanvas(fabricRef.current, dataUrl)
      },
      addText: () => {
        if (fabricRef.current) addTextToCanvas(fabricRef.current)
      },
      deleteSelected: () => {
        const c = fabricRef.current
        if (!c) return
        const obj = c.getActiveObject()
        if (obj) {
          c.remove(obj)
          c.discardActiveObject()
          c.requestRenderAll()
        }
      },
      copySelected: () => {
        const c = fabricRef.current
        if (!c) return
        const obj = c.getActiveObject()
        if (obj) {
          copyBuffer = JSON.stringify(obj.toObject())
        }
      },
      pasteCopied: () => {
        const c = fabricRef.current
        if (!c || !copyBuffer) return
        try {
          const objData = JSON.parse(copyBuffer)
          ;(fabric as any).util.enlivenObjects([objData], (objects: any[]) => {
            objects.forEach((obj: any) => {
              obj.set({
                left: (obj.left || 100) + 30,
                top: (obj.top || 100) + 30,
                evented: true,
              })
              ;(obj as any).id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
              c.add(obj)
              c.setActiveObject(obj)
            })
            c.requestRenderAll()
          })
        } catch (e) { console.error('Paste error:', e) }
      },
      exportPNG: () => {
        const c = fabricRef.current
        if (!c) return
        const dataUrl = c.toDataURL({ format: 'png', multiplier: 2 })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `screenshot-note-${new Date().toISOString().slice(0, 10)}.png`
        a.click()
      },
      getCanvasJSON: () => {
        const c = fabricRef.current
        if (!c) return null
        const json = c.toJSON()
        const vpt = c.viewportTransform!
        return { json, zoom: c.getZoom(), panX: vpt[4], panY: vpt[5] }
      },
    }
    ;(window as any).__canvasApi = api
    return () => {
      delete (window as any).__canvasApi
    }
  }, [])

  // Initialize canvas once
  useEffect(() => {
    if (!canvasElRef.current || ready) return

    const c = createCanvas(canvasElRef.current)
    fabricRef.current = c

    const removeZoom = setupZoom(c)
    const removePan = setupPan(c)
    cleanupRef.current = [removeZoom, removePan]

    drawGrid(c)

    // Persist on modifications
    c.on('object:modified', persistCanvas)
    c.on('object:added', persistCanvas)
    c.on('object:removed', persistCanvas)

    // Right click -> show context menu
    const handleRightClick = (opt: any) => {
      const e = opt.e as MouseEvent
      if (e.button !== 2) return
      e.preventDefault()
      e.stopPropagation()
      onContextMenu?.({ x: e.clientX, y: e.clientY }, !!opt.target)
    }
    c.on('mouse:down', handleRightClick)

    // Double click empty area -> add text
    const handleDoubleClick = (opt: any) => {
      if (opt.target) return
      const pointer = c.getPointer(opt.e, true)
      addTextToCanvas(c, pointer.x, pointer.y)
    }
    c.on('mouse:dblclick', handleDoubleClick)

    // Prevent browser context menu on all fabric layers
    const contextHandler = (e: Event) => e.preventDefault()
    const contextTargets = [
      canvasElRef.current,
      (c as any).upperCanvasEl,
      (c as any).wrapperEl,
    ].filter(Boolean) as HTMLElement[]
    contextTargets.forEach((el) => el.addEventListener('contextmenu', contextHandler))

    // Resize
    const resizeHandler = () => {
      const parent = canvasElRef.current?.parentElement
      if (parent) {
        c.setWidth(parent.clientWidth)
        c.setHeight(parent.clientHeight)
        c.requestRenderAll()
      }
    }
    window.addEventListener('resize', resizeHandler)
    resizeHandler()

    setReady(true)

    return () => {
      window.removeEventListener('resize', resizeHandler)
      contextTargets.forEach((el) => el.removeEventListener('contextmenu', contextHandler))
      c.off('mouse:down', handleRightClick)
      c.off('mouse:dblclick', handleDoubleClick)
      cleanupRef.current.forEach((fn) => fn())
      c.dispose()
      fabricRef.current = null
    }
  }, [])

  // Handle tab switching: persist old, restore new
  const prevTabIdRef = useRef(activeTabId)
  useEffect(() => {
    if (!ready || !fabricRef.current) return

    const prevTabId = prevTabIdRef.current

    // Persist previous tab's canvas state
    if (prevTabId && prevTabId !== activeTabId) {
      const prevTab = tabs.find((t) => t.id === prevTabId)
      if (prevTab) {
        const c = fabricRef.current!
        const json = c.toJSON()
        const { zoom, panX, panY } = getCanvasViewport(c)
        updateCanvasState(prevTab.id, json, zoom, panX, panY)
      }
    }

    prevTabIdRef.current = activeTabId

    // Restore new tab's canvas state
    const currentTab = tabs.find((t) => t.id === activeTabId)
    if (currentTab) {
      restoreCanvas(currentTab)
    }
  }, [activeTabId])

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      <canvas
        ref={canvasElRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default Canvas
