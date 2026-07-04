import { create } from 'zustand'
import type { Settings } from '../api/types'

interface SettingsStore extends Settings {
  loaded: boolean
  load: () => Promise<void>
  save: (partial: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
  loaded: false,

  load: async () => {
    if (!window.electronAPI) {
      set({ loaded: true })
      return
    }
    try {
      const s = await window.electronAPI.getSettings()
      if (s) set({ ...s, loaded: true })
      else set({ loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  save: async (partial) => {
    if (!window.electronAPI) return
    await window.electronAPI.setSettings(partial)
    set(partial)
  }
}))
