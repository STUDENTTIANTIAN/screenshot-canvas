const { BrowserWindow, screen, desktopCapturer, ipcMain } = require('electron')
const path = require('path')

function createScreenshotWindow(parentWindow) {
  return new Promise((resolve) => {
    const cursor = screen.getCursorScreenPoint()
    const targetDisplay = screen.getDisplayNearestPoint(cursor)
    const { x, y, width, height } = targetDisplay.bounds

    let selectedRect = null

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'screenshot-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true)
    win.setFullScreenable(false)

    // Listen for selection result from the screenshot window
    const resultHandler = (_event, rect) => {
      selectedRect = rect
      win.close()
    }
    ipcMain.on('screenshot:result', resultHandler)

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:100vw; height:100vh; cursor:crosshair; user-select:none; overflow:hidden; }
  #overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.3); }
  #sel {
    position:fixed; border:2px solid #4A9EFF; background:rgba(74,158,255,0.15);
    display:none; pointer-events:none; z-index:10;
  }
  #info {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    color:#fff; font-family:'Microsoft YaHei',sans-serif; font-size:13px;
    background:rgba(0,0,0,0.75); padding:6px 18px; border-radius:6px;
    pointer-events:none; z-index:20;
  }
  #sz {
    position:fixed; top:8px; left:50%; transform:translateX(-50%);
    color:#fff; font-family:monospace; font-size:12px;
    background:rgba(0,0,0,0.7); padding:3px 10px; border-radius:4px;
    display:none; pointer-events:none; z-index:20;
  }
</style>
</head>
<body>
<div id="overlay"></div>
<div id="sel"></div>
<div id="info">拖拽选择截图区域 | Esc 取消</div>
<div id="sz"></div>
<script>
  let sx=0, sy=0, dragging=false
  const sel=document.getElementById('sel')
  const info=document.getElementById('info')
  const sz=document.getElementById('sz')

  document.addEventListener('mousedown',e=>{
    sx=e.screenX; sy=e.screenY; dragging=true
    sel.style.display='block'; info.style.display='none'
  })
  document.addEventListener('mousemove',e=>{
    if(!dragging)return
    const l=Math.min(sx,e.screenX), t=Math.min(sy,e.screenY)
    const w=Math.abs(e.screenX-sx), h=Math.abs(e.screenY-sy)
    sel.style.left=l+'px'; sel.style.top=t+'px'
    sel.style.width=w+'px'; sel.style.height=h+'px'
    if(w>10||h>10){ sz.style.display='block'; sz.textContent=w+' x '+h }
  })
  document.addEventListener('mouseup',e=>{
    if(!dragging)return; dragging=false
    sz.style.display='none'; sel.style.display='none'
    const rect={
      x:Math.min(sx,e.screenX), y:Math.min(sy,e.screenY),
      width:Math.abs(e.screenX-sx), height:Math.abs(e.screenY-sy)
    }
    if(rect.width<5||rect.height<5){ window.electronAPI.sendResult(null); return }
    window.electronAPI.sendResult(rect)
  })
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') window.electronAPI.sendResult(null)
  })
</script>
</body>
</html>`

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    win.on('closed', async () => {
      ipcMain.removeListener('screenshot:result', resultHandler)

      if (!selectedRect) {
        resolve(null)
        return
      }

      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: targetDisplay.bounds.width, height: targetDisplay.bounds.height },
        })

        const displaySource = sources[0]
        if (!displaySource) { resolve(null); return }

        const fullImage = displaySource.thumbnail

        const relX = selectedRect.x - targetDisplay.bounds.x
        const relY = selectedRect.y - targetDisplay.bounds.y

        const scaleX = fullImage.getSize().width / targetDisplay.bounds.width
        const scaleY = fullImage.getSize().height / targetDisplay.bounds.height

        const cropRect = {
          x: Math.round(relX * scaleX),
          y: Math.round(relY * scaleY),
          width: Math.round(selectedRect.width * scaleX),
          height: Math.round(selectedRect.height * scaleY),
        }

        const cropped = fullImage.crop(cropRect)
        const dataUrl = cropped.toDataURL()

        if (parentWindow && !parentWindow.isDestroyed()) {
          parentWindow.webContents.send('screenshot:complete', dataUrl)
        }
        resolve(null)
      } catch (err) {
        console.error('Screenshot capture error:', err)
        resolve(null)
      }
    })

    win.show()
  })
}

module.exports = { createScreenshotWindow }
