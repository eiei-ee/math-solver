import type { ChatMessage } from './types'

export interface SendChatPayload {
  provider: string
  apiKey: string
  model: string
  messages: ChatMessage[]
}

export function buildChatPayload(
  provider: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): SendChatPayload {
  return { provider, apiKey, model, messages }
}
