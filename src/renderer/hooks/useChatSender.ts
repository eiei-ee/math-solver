import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chat'
import { useSettingsStore } from '../store/settings'
import { buildChatPayload } from '../api/client'

export function useChatSender() {
  const { pushUser, appendAssistant, setLoading, setError, setLastUsage, loading, messages } = useChatStore()
  const settings = useSettingsStore()
  const teardownRef = useRef<() => void>(() => {})

  useEffect(() => {
    return () => teardownRef.current()
  }, [])

  const send = async (userContent: string, imageBase64?: string | null) => {
    if (!settings.apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }

    setError(null)
    pushUser(userContent, imageBase64)
    setLoading(true)

    const payload = buildChatPayload(
      settings.provider,
      settings.apiKey,
      settings.model,
      [...messages, { role: 'user' as const, content: userContent }]
    )

    let cleanupChunk = () => {}
    let cleanupDone = () => {}
    let cleanupError = () => {}

    const teardown = () => {
      cleanupChunk()
      cleanupDone()
      cleanupError()
      teardownRef.current = () => {}
    }

    teardownRef.current = teardown

    cleanupChunk = window.electronAPI.onChatChunk((chunk: string) => {
      appendAssistant(chunk)
    })
    cleanupDone = window.electronAPI.onChatDone((usage) => {
      setLastUsage(usage ?? null)
      setLoading(false)
      teardown()
    })
    cleanupError = window.electronAPI.onChatError((err: string) => {
      setError(err)
      teardown()
    })

    try {
      await window.electronAPI.sendChat({ ...payload, ...(imageBase64 ? { imageBase64 } : {}) })
    } catch (e) {
      setError(String(e))
      teardown()
    }
  }

  return { loading, send }
}
