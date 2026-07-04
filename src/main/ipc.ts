import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getModel, getProvider, SYSTEM_PROMPT } from '../shared/providers'
import type { ChatMessage } from '../shared/providers'

interface Settings {
  provider: string
  apiKey: string
  model: string
}

const defaults: Settings = {
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat'
}

interface ChatPayload {
  provider: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  imageBase64?: string
}

const CHAT_TIMEOUT_MS = 60_000
const activeChats = new Map<number, AbortController>()
const activeChatAbortReasons = new Map<number, 'cancel' | 'timeout'>()

function getStorePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): Settings {
  try {
    if (existsSync(getStorePath())) {
      return { ...defaults, ...JSON.parse(readFileSync(getStorePath(), 'utf-8')) }
    }
  } catch {
    // Corrupted settings should not prevent the app from opening.
  }
  return { ...defaults }
}

function saveSettings(data: Settings): void {
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8')
}

let cached: Settings | null = null

function getSettings(): Settings {
  if (!cached) cached = loadSettings()
  return cached
}

function updateSettings(partial: Partial<Settings>): void {
  cached = { ...getSettings(), ...partial }
  saveSettings(cached)
}

function prepareMessages(payload: ChatPayload): ChatMessage[] {
  return payload.messages.map(message => {
    if (message.role === 'user' && payload.imageBase64 && typeof message.content === 'string') {
      return {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: payload.imageBase64 } },
          { type: 'text', text: message.content }
        ]
      }
    }
    return message
  })
}

async function streamChat(payload: ChatPayload, sender: Electron.WebContents): Promise<void> {
  const existing = activeChats.get(sender.id)
  if (existing) existing.abort()

  const provider = getProvider(payload.provider)
  if (!provider) {
    sender.send('chat:error', `不支持的服务商: ${payload.provider}`)
    return
  }

  const model = getModel(payload.provider, payload.model)
  if (!model) {
    sender.send('chat:error', `不支持的模型: ${payload.model}`)
    return
  }

  if (payload.imageBase64 && !model.supportsImage) {
    sender.send('chat:error', `当前模型 ${model.label} 不支持图片输入，请切换到视觉模型后重试`)
    return
  }

  const endpoint = payload.provider === 'gemini'
    ? `https://generativelanguage.googleapis.com/v1beta/models/${payload.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(payload.apiKey)}`
    : provider.endpoint

  const controller = new AbortController()
  activeChats.set(sender.id, controller)
  activeChatAbortReasons.delete(sender.id)
  const timeout = setTimeout(() => {
    activeChatAbortReasons.set(sender.id, 'timeout')
    controller.abort()
  }, CHAT_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: payload.provider === 'gemini' ? { 'Content-Type': 'application/json' } : provider.headers(payload.apiKey),
      body: provider.buildBody(payload.model, prepareMessages(payload), SYSTEM_PROMPT),
      signal: controller.signal
    })

    if (!response.ok) {
      const errText = await response.text()
      try {
        const errJson = JSON.parse(errText)
        sender.send('chat:error', errJson.error?.message || `HTTP ${response.status}`)
      } catch {
        sender.send('chat:error', `请求失败: HTTP ${response.status}`)
      }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      sender.send('chat:error', '无法读取响应流')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const chunk = provider.parseChunk(parsed)
          if (chunk) sender.send('chat:chunk', chunk)
        } catch {
          // Ignore malformed chunks in an otherwise valid SSE stream.
        }
      }
    }

    sender.send('chat:done')
  } catch (error) {
    if (controller.signal.aborted) {
      if (activeChatAbortReasons.get(sender.id) === 'timeout') {
        sender.send('chat:error', '请求超时，请稍后重试')
      } else {
        sender.send('chat:done')
      }
      return
    }
    sender.send('chat:error', `网络错误: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearTimeout(timeout)
    if (activeChats.get(sender.id) === controller) activeChats.delete(sender.id)
    activeChatAbortReasons.delete(sender.id)
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_event, settings: Partial<Settings>) => {
    updateSettings(settings)
    return true
  })

  ipcMain.handle('file:open-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:save-markdown', async (_event, content: string) => {
    const result = await dialog.showSaveDialog({
      title: '导出对话',
      defaultPath: `math-solution-${new Date().toISOString().slice(0, 10)}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })

  ipcMain.handle('chat:send', async (event, payload: ChatPayload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    await streamChat(payload, win.webContents)
  })

  ipcMain.handle('chat:cancel', (event) => {
    const controller = activeChats.get(event.sender.id)
    if (!controller) return false
    activeChatAbortReasons.set(event.sender.id, 'cancel')
    controller.abort()
    activeChats.delete(event.sender.id)
    return true
  })
}
