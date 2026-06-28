/// <reference types="vite/client" />

interface ChatUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface ElectronAPI {
  getSettings: () => Promise<{ provider: string; apiKey: string; model: string }>
  setSettings: (settings: Record<string, string>) => Promise<boolean>
  openImage: () => Promise<string | null>
  sendChat: (payload: unknown) => Promise<void>
  stopChat: () => Promise<void>
  onChatChunk: (callback: (chunk: string) => void) => () => void
  onChatDone: (callback: (usage?: ChatUsage | null) => void) => () => void
  onChatError: (callback: (err: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
