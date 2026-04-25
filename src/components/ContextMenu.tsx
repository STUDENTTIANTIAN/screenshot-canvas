import React, { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  visible: boolean
  onCopy: () => void
  onPaste: () => void
  onDelete: () => void
  onClose: () => void
  hasSelection: boolean
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  visible,
  onCopy,
  onPaste,
  onDelete,
  onClose,
  hasSelection,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: x,
        top: y,
        position: 'fixed',
        zIndex: 10000,
      }}
    >
      <button className="context-menu-item" onClick={() => { onCopy(); onClose() }} disabled={!hasSelection}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        复制
      </button>
      <button className="context-menu-item" onClick={() => { onPaste(); onClose() }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
        粘贴
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-delete" onClick={() => { onDelete(); onClose() }} disabled={!hasSelection}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        删除
      </button>
    </div>
  )
}

export default ContextMenu
