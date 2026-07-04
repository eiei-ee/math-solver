import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:set', settings),
  openImage: () => ipcRenderer.invoke('file:open-image'),
  saveMarkdown: (content: string) => ipcRenderer.invoke('file:save-markdown', content),
  sendChat: (payload: unknown) => ipcRenderer.invoke('chat:send', payload),
  cancelChat: () => ipcRenderer.invoke('chat:cancel'),
  onChatChunk: (callback: (chunk: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('chat:chunk', listener)
    return () => ipcRenderer.removeListener('chat:chunk', listener)
  },
  onChatDone: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('chat:done', listener)
    return () => ipcRenderer.removeListener('chat:done', listener)
  },
  onChatError: (callback: (err: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, err: string) => callback(err)
    ipcRenderer.on('chat:error', listener)
    return () => ipcRenderer.removeListener('chat:error', listener)
  }
})
