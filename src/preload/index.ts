import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:set', settings),
  openImage: () => ipcRenderer.invoke('file:open-image'),
  sendChat: (payload: unknown) => ipcRenderer.invoke('chat:send', payload),
  stopChat: () => ipcRenderer.invoke('chat:stop'),
  onChatChunk: (callback: (chunk: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('chat:chunk', listener)
    return () => ipcRenderer.removeListener('chat:chunk', listener)
  },
  onChatDone: (callback: (usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, usage: unknown) => callback(usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null)
    ipcRenderer.on('chat:done', listener)
    return () => ipcRenderer.removeListener('chat:done', listener)
  },
  onChatError: (callback: (err: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, err: string) => callback(err)
    ipcRenderer.on('chat:error', listener)
    return () => ipcRenderer.removeListener('chat:error', listener)
  }
})
