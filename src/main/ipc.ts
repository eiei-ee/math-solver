import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

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

function getStorePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): Settings {
  try {
    if (existsSync(getStorePath())) {
      return { ...defaults, ...JSON.parse(readFileSync(getStorePath(), 'utf-8')) }
    }
  } catch { /* corrupted file, use defaults */ }
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

interface ChatMessage {
  role: string
  content: string | { type: string; text?: string; image_url?: { url: string } }[]
}

interface ChatPayload {
  provider: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  imageBase64?: string
}

interface ChatUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

const SYSTEM_PROMPT = '你是一位数学老师，请用中文解答数学题。对于每个问题，给出详细的逐步推导过程。使用 LaTeX 格式输出数学公式：行内公式用 $...$，独立公式用 $$...$$。如果题目包含图片，请先描述你看到的题目内容，再解答。'

function captureUsage(chunk: unknown, store: { lastUsage: ChatUsage | null }): void {
  const u = (chunk as { usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } })?.usage
  if (u) store.lastUsage = { prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens, total_tokens: u.total_tokens }
}

const activeControllers = new Map<number, AbortController>()

function cancelForSender(sender: Electron.WebContents): void {
  const ctrl = activeControllers.get(sender.id)
  if (ctrl) {
    ctrl.abort()
    activeControllers.delete(sender.id)
  }
}

function clearForSender(sender: Electron.WebContents, ctrl: AbortController): void {
  if (activeControllers.get(sender.id) === ctrl) {
    activeControllers.delete(sender.id)
  }
}

function openAICompat(endpoint: string) {
  return {
    endpoint,
    headers: (key: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }) as Record<string, string>,
    buildBody: (model: string, msgs: ChatMessage[], sys: string) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: sys }, ...msgs],
      stream: true
    }),
    parseChunk: (data: any) => data?.choices?.[0]?.delta?.content ?? null as string | null
  }
}

const PROVIDERS: Record<string, ReturnType<typeof openAICompat>> = {
  deepseek:    openAICompat('https://api.deepseek.com/v1/chat/completions'),
  openai:      openAICompat('https://api.openai.com/v1/chat/completions'),
  qwen:        openAICompat('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'),
  glm:         openAICompat('https://open.bigmodel.cn/api/paas/v4/chat/completions'),
  moonshot:    openAICompat('https://api.moonshot.cn/v1/chat/completions'),
  grok:        openAICompat('https://api.x.ai/v1/chat/completions'),
  mistral:     openAICompat('https://api.mistral.ai/v1/chat/completions'),
  gemini: {
    endpoint: '',
    headers: () => ({}),
    buildBody: (model: string, msgs: ChatMessage[], sys: string) => {
      const contents = msgs
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: typeof m.content === 'string' ? [{ text: m.content }] : (m.content as unknown[])
        }))
      return JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents,
        generationConfig: { maxOutputTokens: 4096 }
      })
    },
    parseChunk: (data: any) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  },
  claude: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    headers: (key: string) => ({ 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    buildBody: (model: string, msgs: ChatMessage[], sys: string) => {
      const userMessages = msgs.filter(m => m.role !== 'system')
      return JSON.stringify({
        model,
        max_tokens: 4096,
        system: sys,
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true
      })
    },
    parseChunk: (data: any) => {
      if (data?.type === 'content_block_delta') return data?.delta?.text ?? null
      return null
    }
  }
}

async function streamChat(payload: ChatPayload, sender: Electron.WebContents): Promise<void> {
  const provider = PROVIDERS[payload.provider]
  if (!provider) {
    sender.send('chat:error', `不支持的服务商: ${payload.provider}`)
    return
  }

  function parseBase64(dataUrl: string): { mime: string; data: string } {
    const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
    return m ? { mime: m[1], data: m[2] } : { mime: 'image/png', data: dataUrl }
  }

  const IMAGE_TEXT = '请解答图片中的数学题，给出详细的逐步推导过程'

  function buildImageContent(base64: string, providerId: string): unknown[] {
    const { mime, data } = parseBase64(base64)
    if (providerId === 'gemini') {
      return [{ inlineData: { mimeType: mime, data } }, { text: IMAGE_TEXT }]
    }
    if (providerId === 'claude') {
      return [
        { type: 'image', source: { type: 'base64', media_type: mime, data } },
        { type: 'text', text: IMAGE_TEXT }
      ]
    }
    return [
      { type: 'image_url', image_url: { url: base64 } },
      { type: 'text', text: IMAGE_TEXT }
    ]
  }

  const messages = payload.messages.map(m => {
    if (m.role === 'user' && payload.imageBase64 && typeof m.content === 'string') {
      return {
        role: 'user',
        content: buildImageContent(payload.imageBase64, payload.provider)
      }
    }
    return m
  })

  const endpoint = payload.provider === 'gemini'
    ? `https://generativelanguage.googleapis.com/v1beta/models/${payload.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(payload.apiKey)}`
    : provider.endpoint

  const ctrl = new AbortController()
  cancelForSender(sender)
  activeControllers.set(sender.id, ctrl)

  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: payload.provider === 'gemini' ? { 'Content-Type': 'application/json' } : provider.headers(payload.apiKey),
        body: provider.buildBody(payload.model, messages, SYSTEM_PROMPT),
        signal: ctrl.signal
      })

      if (!response.ok) {
        const errText = await response.text()
        let msg = `HTTP ${response.status}`
        try {
          const errJson = JSON.parse(errText)
          msg = errJson.error?.message || msg
        } catch {}
        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
          continue
        }
        sender.send('chat:error', msg)
        clearForSender(sender, ctrl)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        sender.send('chat:error', '无法读取响应流')
        clearForSender(sender, ctrl)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      const usageRef = { lastUsage: null as ChatUsage | null }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          const trimmed = buffer.trim()
          if (trimmed) {
            for (const line of trimmed.split('\n')) {
              const d = line.trim()
              if (!d.startsWith('data:')) continue
              const data = d.slice(5).trim()
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data)
                  const chunk = provider.parseChunk(parsed)
                  if (chunk) sender.send('chat:chunk', chunk)
                  captureUsage(parsed, usageRef)
                } catch {}
              }
            }
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          for (const line of part.split('\n')) {
            const d = line.trim()
            if (!d.startsWith('data:')) continue
            const data = d.slice(5).trim()
            if (!data || data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const chunk = provider.parseChunk(parsed)
              if (chunk) sender.send('chat:chunk', chunk)
              captureUsage(parsed, usageRef)
            } catch {}
          }
        }
      }

      sender.send('chat:done', usageRef.lastUsage)
      clearForSender(sender, ctrl)
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        sender.send('chat:done')
        clearForSender(sender, ctrl)
        return
      }
      lastError = e as Error
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      }
    }
  }

  sender.send('chat:error', `网络错误: ${lastError?.message || '未知错误'}`)
  clearForSender(sender, ctrl)
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
    const filePath = result.filePaths[0]
    const buffer = readFileSync(filePath)
    const ext = (filePath.split('.').pop() || 'png').toLowerCase()
    const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' }
    const mime = mimeMap[ext] || 'png'
    return `data:image/${mime};base64,${buffer.toString('base64')}`
  })

  ipcMain.handle('chat:send', async (event, payload: ChatPayload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    await streamChat(payload, win.webContents)
  })

  ipcMain.handle('chat:stop', async (event) => {
    cancelForSender(event.sender)
  })
}
