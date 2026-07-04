export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Settings {
  provider: string
  apiKey: string
  model: string
}
