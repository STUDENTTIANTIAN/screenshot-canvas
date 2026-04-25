import React from 'react'

interface ToolbarProps {
  onScreenshot: () => void
  onAddText: () => void
  onDelete: () => void
  onExport: () => void
  onSave: () => void
  onLoad: () => void
  hasSelection: boolean
}

const Toolbar: React.FC<ToolbarProps> = ({
  onScreenshot,
  onAddText,
  onDelete,
  onExport,
  onSave,
  onLoad,
  hasSelection,
}) => {
  return (
    <div className="toolbar">
      <button className="tool-btn" onClick={onScreenshot} title="截图 (Ctrl+Shift+X)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
      <button className="tool-btn" onClick={onAddText} title="添加文字 (双击画布)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      </button>
      <button
        className="tool-btn"
        onClick={onDelete}
        disabled={!hasSelection}
        title="删除选中 (Delete)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
      <div className="toolbar-divider" />
      <button className="tool-btn" onClick={onSave} title="保存项目">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </button>
      <button className="tool-btn" onClick={onLoad} title="打开项目">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <button className="tool-btn" onClick={onExport} title="导出为 PNG">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  )
}

export default Toolbar
