import { create } from 'zustand'

export type InputTab = 'text' | 'image' | 'latex'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatStore {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  activeTab: InputTab
  imageBase64: string | null
  pushUser: (content: string, imageBase64?: string | null) => void
  appendAssistant: (chunk: string) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setActiveTab: (tab: InputTab) => void
  setImageBase64: (b64: string | null) => void
  setMessages: (messages: ChatMessage[]) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  activeTab: 'text',
  imageBase64: null,

  pushUser: (content, imageBase64) => {
    const msgs = [...get().messages, { role: 'user' as const, content }]
    set({ messages: msgs, error: null, imageBase64: null })
  },

  appendAssistant: (chunk) => {
    const msgs = get().messages
    const last = msgs[msgs.length - 1]
    if (last && last.role === 'assistant') {
      set({ messages: [...msgs.slice(0, -1), { ...last, content: last.content + chunk }] })
    } else {
      set({ messages: [...msgs, { role: 'assistant', content: chunk }] })
    }
  },

  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e, loading: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setImageBase64: (b64) => set({ imageBase64: b64 }),
  setMessages: (messages) => set({ messages, error: null }),
  clearMessages: () => set({ messages: [] })
}))
