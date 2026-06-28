export interface ProviderConfig {
  id: string
  label: string
  models: { id: string; label: string }[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Settings {
  provider: string
  apiKey: string
  model: string
}
