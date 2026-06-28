import { create } from 'zustand'

export type InputTab = 'text' | 'image' | 'latex'

interface ChatUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'chat-messages'

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function saveMessages(msgs: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs))
  } catch {}
}

function pushWithPersist(msgs: ChatMessage[], set: any, extra: Record<string, unknown> = {}) {
  saveMessages(msgs)
  set({ messages: msgs, ...extra })
}

interface ChatStore {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  lastUsage: ChatUsage | null
  activeTab: InputTab
  imageBase64: string | null
  pushUser: (content: string, imageBase64?: string | null) => void
  appendAssistant: (chunk: string) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  stopGeneration: () => void
  setLastUsage: (u: ChatUsage | null) => void
  setActiveTab: (tab: InputTab) => void
  setImageBase64: (b64: string | null) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: loadMessages(),
  loading: false,
  error: null,
  lastUsage: null,
  activeTab: 'text',
  imageBase64: null,

  pushUser: (content, imageBase64) => {
    const msgs = [...get().messages, { role: 'user' as const, content }]
    pushWithPersist(msgs, set, { error: null, imageBase64: null })
  },

  appendAssistant: (chunk) => {
    const msgs = get().messages
    const last = msgs[msgs.length - 1]
    let updated: ChatMessage[]
    if (last && last.role === 'assistant') {
      updated = [...msgs.slice(0, -1), { ...last, content: last.content + chunk }]
    } else {
      updated = [...msgs, { role: 'assistant', content: chunk }]
    }
    pushWithPersist(updated, set)
  },

  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e, loading: false }),
  stopGeneration: () => {
    window.electronAPI.stopChat()
    set({ loading: false })
  },
  setLastUsage: (u) => set({ lastUsage: u }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setImageBase64: (b64) => set({ imageBase64: b64 }),
  clearMessages: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ messages: [] })
  }
}))
