import { create } from 'zustand'
import type { CanvasJSON } from '../lib/fabric-setup'

export interface CanvasTab {
  id: string
  name: string
  canvasJSON: CanvasJSON | null
  zoom: number
  panX: number
  panY: number
}

interface TabStore {
  tabs: CanvasTab[]
  activeTabId: string
  addTab: () => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateCanvasState: (id: string, canvasJSON: CanvasJSON, zoom: number, panX: number, panY: number) => void
  renameTab: (id: string, name: string) => void
  getActiveTab: () => CanvasTab | undefined
}

let tabCounter = 0

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: '',

  addTab: () => {
    tabCounter++
    const id = `tab_${Date.now()}_${tabCounter}`
    const newTab: CanvasTab = {
      id,
      name: `画布 ${tabCounter}`,
      canvasJSON: null,
      zoom: 1,
      panX: 0,
      panY: 0,
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }))
  },

  removeTab: (id) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id)
      const newTabs = state.tabs.filter((t) => t.id !== id)
      if (newTabs.length === 0) {
        // Don't remove the last tab
        return state
      }
      let newActiveId = state.activeTabId
      if (state.activeTabId === id) {
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || ''
      }
      return { tabs: newTabs, activeTabId: newActiveId }
    })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateCanvasState: (id, canvasJSON, zoom, panX, panY) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, canvasJSON, zoom, panX, panY } : t
      ),
    }))
  },

  renameTab: (id, name) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
    }))
  },

  getActiveTab: () => {
    const state = get()
    return state.tabs.find((t) => t.id === state.activeTabId)
  },
}))
