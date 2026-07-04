import { useCallback } from 'react'
import { buildChatPayload } from '../api/client'
import { useChatStore } from '../store/chat'
import { useSettingsStore } from '../store/settings'
import type { ChatMessage } from '../store/chat'

interface SubmitChatOptions {
  content: string
  requestContent?: string
  imageBase64?: string
  onSubmitted?: () => void
  appendUser?: boolean
  messagesOverride?: ChatMessage[]
}

export function useChatSubmit() {
  const settings = useSettingsStore()
  const { pushUser, appendAssistant, setLoading, setError, loading, messages } = useChatStore()

  const submitChat = useCallback(async ({
    content,
    requestContent,
    imageBase64,
    onSubmitted,
    appendUser = true,
    messagesOverride
  }: SubmitChatOptions) => {
    const trimmed = content.trim()
    if (!trimmed || loading) return false

    if (!settings.apiKey) {
      setError('请先在设置中配置 API Key')
      return false
    }

    const nextUserMessage = { role: 'user' as const, content: requestContent ?? trimmed }
    const payload = buildChatPayload(
      settings.provider,
      settings.apiKey,
      settings.model,
      messagesOverride ?? [...messages, nextUserMessage]
    )

    onSubmitted?.()
    if (appendUser) pushUser(trimmed, imageBase64 ?? null)
    else setError(null)
    setLoading(true)

    let cleanupChunk = () => {}
    let cleanupDone = () => {}
    let cleanupError = () => {}
    let settled = false

    const teardown = () => {
      cleanupChunk()
      cleanupDone()
      cleanupError()
    }

    cleanupChunk = window.electronAPI.onChatChunk((chunk: string) => {
      appendAssistant(chunk)
    })
    cleanupDone = window.electronAPI.onChatDone(() => {
      settled = true
      setLoading(false)
      teardown()
    })
    cleanupError = window.electronAPI.onChatError((err: string) => {
      settled = true
      setError(err)
      teardown()
    })

    try {
      await window.electronAPI.sendChat({ ...payload, imageBase64 })
      if (!settled) {
        setLoading(false)
        teardown()
      }
      return true
    } catch (error) {
      setError(String(error))
      teardown()
      return false
    }
  }, [appendAssistant, loading, messages, pushUser, setError, setLoading, settings.apiKey, settings.model, settings.provider])

  return { loading, submitChat }
}
