import { fabric } from 'fabric'

export type CanvasJSON = any

let uniqueId = 0
function generateId(): string {
  return `obj_${Date.now()}_${++uniqueId}`
}

export function createCanvas(el: HTMLCanvasElement): fabric.Canvas {
  const canvas = new fabric.Canvas(el, {
    backgroundColor: '#f5f5f5',
    selection: true,
    preserveObjectStacking: true,
    width: el.parentElement?.clientWidth || 1200,
    height: el.parentElement?.clientHeight || 800,
  } as any)

  ;(canvas as any).fireRightClick = true
  ;(canvas as any).stopContextMenu = true

  return canvas
}

export function setupZoom(canvas: fabric.Canvas): () => void {
  const handler = (opt: any) => {
    const delta = opt.e.deltaY
    let zoom = canvas.getZoom()
    zoom *= 0.999 ** delta
    zoom = Math.min(Math.max(zoom, 0.05), 20)
    canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom)
    opt.e.preventDefault()
    opt.e.stopPropagation()
  }
  canvas.on('mouse:wheel', handler as any)
  return () => canvas.off('mouse:wheel', handler as any)
}

export function setupPan(canvas: fabric.Canvas): () => void {
  let isPanning = false
  let lastX = 0
  let lastY = 0

  const downHandler = (opt: any) => {
    if (opt.e.button === 1 || (opt.e.button === 0 && opt.e.altKey)) {
      isPanning = true
      canvas.selection = false
      canvas.defaultCursor = 'grabbing'
      lastX = opt.e.clientX
      lastY = opt.e.clientY
      opt.e.preventDefault()
    }
  }

  const moveHandler = (opt: any) => {
    if (!isPanning) return
    const vpt = canvas.viewportTransform!
    vpt[4] += opt.e.clientX - lastX
    vpt[5] += opt.e.clientY - lastY
    lastX = opt.e.clientX
    lastY = opt.e.clientY
    canvas.requestRenderAll()
  }

  const upHandler = () => {
    isPanning = false
    canvas.selection = true
    canvas.defaultCursor = 'default'
  }

  canvas.on('mouse:down', downHandler as any)
  canvas.on('mouse:move', moveHandler as any)
  canvas.on('mouse:up', upHandler as any)

  return () => {
    canvas.off('mouse:down', downHandler as any)
    canvas.off('mouse:move', moveHandler as any)
    canvas.off('mouse:up', upHandler as any)
  }
}

export function addImageToCanvas(
  canvas: fabric.Canvas,
  dataUrl: string
): Promise<void> {
  return new Promise((resolve) => {
    fabric.Image.fromURL(
      dataUrl,
      (img) => {
        if (!img) { resolve(); return }
        const maxW = canvas.getWidth()! * 0.7
        const maxH = canvas.getHeight()! * 0.7
        const scale = Math.min(maxW / img.width!, maxH / img.height!, 1)
        img.set({
          left: canvas.getWidth()! / 2 - (img.width! * scale) / 2 + Math.random() * 100 - 50,
          top: canvas.getHeight()! / 2 - (img.height! * scale) / 2 + Math.random() * 100 - 50,
          scaleX: scale,
          scaleY: scale,
        })
        ;(img as any).id = generateId()
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        resolve()
      },
      { crossOrigin: 'anonymous' }
    )
  })
}

export function addTextToCanvas(
  canvas: fabric.Canvas,
  x?: number,
  y?: number
): void {
  const text = new fabric.IText('双击编辑文字', {
    left: x ?? canvas.getWidth()! / 2 - 60,
    top: y ?? canvas.getHeight()! / 2 - 10,
    fontSize: 20,
    fontFamily: 'Microsoft YaHei, sans-serif',
    fill: '#333',
  } as any)
  ;(text as any).id = generateId()
  canvas.add(text)
  canvas.setActiveObject(text)
  text.enterEditing()
  canvas.requestRenderAll()
}

export function getCanvasViewport(canvas: fabric.Canvas): {
  zoom: number
  panX: number
  panY: number
} {
  const vpt = canvas.viewportTransform!
  return {
    zoom: canvas.getZoom(),
    panX: vpt[4],
    panY: vpt[5],
  }
}

export function loadCanvasFromJSON(
  canvas: fabric.Canvas,
  json: any
): Promise<void> {
  return new Promise((resolve) => {
    canvas.loadFromJSON(json, () => {
      canvas.requestRenderAll()
      resolve()
    })
  })
}

export function drawGrid(canvas: fabric.Canvas): void {
  const gridSize = 50
  const w = canvas.getWidth() || 2000
  const h = canvas.getHeight() || 2000
  const lines: fabric.Line[] = []

  for (let i = 0; i < w / gridSize; i++) {
    lines.push(
      new fabric.Line([i * gridSize, 0, i * gridSize, h], {
        stroke: '#e0e0e0',
        selectable: false,
        evented: false,
        excludeFromExport: true,
      } as any)
    )
  }
  for (let i = 0; i < h / gridSize; i++) {
    lines.push(
      new fabric.Line([0, i * gridSize, w, i * gridSize], {
        stroke: '#e0e0e0',
        selectable: false,
        evented: false,
        excludeFromExport: true,
      } as any)
    )
  }

  lines.forEach((l) => canvas.add(l))
  if (lines.length > 0) canvas.sendToBack(lines[0])
  canvas.requestRenderAll()
}
