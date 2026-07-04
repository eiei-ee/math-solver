/// <reference types="vite/client" />

interface ElectronAPI {
  getSettings: () => Promise<{ provider: string; apiKey: string; model: string }>
  setSettings: (settings: Record<string, string>) => Promise<boolean>
  openImage: () => Promise<string | null>
  saveMarkdown: (content: string) => Promise<string | null>
  sendChat: (payload: unknown) => Promise<void>
  cancelChat: () => Promise<boolean>
  onChatChunk: (callback: (chunk: string) => void) => () => void
  onChatDone: (callback: () => void) => () => void
  onChatError: (callback: (err: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
