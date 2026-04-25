import React from 'react'
import { useTabStore } from '../store/tabStore'

const TabBar: React.FC = () => {
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const addTab = useTabStore((s) => s.addTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.name}
          >
            <span className="tab-name">{tab.name}</span>
            {tabs.length > 1 && (
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTab(tab.id)
                }}
                title="关闭"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="tab-add" onClick={addTab} title="新建画布">
          +
        </button>
      </div>
      <div className="window-controls">
        <button
          className="win-btn"
          onClick={() => window.electronAPI.window.minimize()}
          title="最小化"
        >
          ─
        </button>
        <button
          className="win-btn"
          onClick={() => window.electronAPI.window.maximize()}
          title="最大化"
        >
          □
        </button>
        <button
          className="win-btn win-close"
          onClick={() => window.electronAPI.window.close()}
          title="关闭"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default TabBar
