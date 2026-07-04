export interface ModelInfo {
  id: string
  label: string
  supportsImage?: boolean
}

export interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ChatMessage {
  role: string
  content: string | ChatContentPart[]
}

export interface ProviderConfig {
  id: string
  label: string
  models: ModelInfo[]
  endpoint: string
  headers: (apiKey: string) => Record<string, string>
  buildBody: (model: string, messages: ChatMessage[], systemPrompt: string) => string
  parseChunk: (data: unknown) => string | null
}

interface DataUrlImage {
  mediaType: string
  data: string
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } }
type ClaudeContent = string | ClaudePart[]
type ClaudePart = { type: 'text'; text: string } | {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export const SYSTEM_PROMPT = '你是一位数学老师，请用中文解答数学题。对于每一个问题，给出详细的逐步推导过程。使用 LaTeX 格式输出数学公式：行内公式用 $...$，独立公式用 $$...$$。如果题目包含图片，请先描述你看到的题目内容，再解答。'

function parseDataUrl(url: string): DataUrlImage | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mediaType: match[1], data: match[2] }
}

function openAICompat(endpoint: string): Pick<ProviderConfig, 'endpoint' | 'headers' | 'buildBody' | 'parseChunk'> {
  return {
    endpoint,
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    }),
    buildBody: (model, messages, systemPrompt) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true
    }),
    parseChunk: (data) => {
      const parsed = data as { choices?: { delta?: { content?: string } }[] }
      return parsed.choices?.[0]?.delta?.content ?? null
    }
  }
}

function buildGeminiParts(content: ChatMessage['content']): GeminiPart[] {
  if (typeof content === 'string') return [{ text: content }]

  const parts: GeminiPart[] = []
  for (const part of content) {
    if (part.type === 'text') {
      if (part.text) parts.push({ text: part.text })
      continue
    }

    const url = part.image_url?.url
    if (!url) continue
    const image = parseDataUrl(url)
    if (!image) continue
    parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } })
  }
  return parts
}

function buildClaudeContent(content: ChatMessage['content']): ClaudeContent {
  if (typeof content === 'string') return content

  const parts: ClaudePart[] = []
  for (const part of content) {
    if (part.type === 'text') {
      if (part.text) parts.push({ type: 'text', text: part.text })
      continue
    }

    const url = part.image_url?.url
    if (!url) continue
    const image = parseDataUrl(url)
    if (!image) continue
    parts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.data
      }
    })
  }
  return parts
}

export const providers: ProviderConfig[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1' }
    ],
    ...openAICompat('https://api.deepseek.com/v1/chat/completions')
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', supportsImage: true },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', supportsImage: true }
    ],
    ...openAICompat('https://api.openai.com/v1/chat/completions')
  },
  {
    id: 'qwen',
    label: '通义千问',
    models: [
      { id: 'qwen-plus', label: 'Qwen Plus' },
      { id: 'qwen-max', label: 'Qwen Max' },
      { id: 'qwen-vl-plus', label: 'Qwen VL Plus', supportsImage: true }
    ],
    ...openAICompat('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
  },
  {
    id: 'glm',
    label: '智谱 GLM',
    models: [
      { id: 'glm-4-plus', label: 'GLM-4 Plus' },
      { id: 'glm-4-flash', label: 'GLM-4 Flash' }
    ],
    ...openAICompat('https://open.bigmodel.cn/api/paas/v4/chat/completions')
  },
  {
    id: 'moonshot',
    label: 'Kimi (月之暗面)',
    models: [
      { id: 'moonshot-v1-8k', label: 'Moonshot v1 8K' },
      { id: 'moonshot-v1-32k', label: 'Moonshot v1 32K' },
      { id: 'moonshot-v1-128k', label: 'Moonshot v1 128K' }
    ],
    ...openAICompat('https://api.moonshot.cn/v1/chat/completions')
  },
  {
    id: 'gemini',
    label: 'Gemini',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', supportsImage: true },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', supportsImage: true }
    ],
    endpoint: '',
    headers: () => ({}),
    buildBody: (_model, messages, systemPrompt) => JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: buildGeminiParts(message.content)
        })),
      generationConfig: { maxOutputTokens: 4096 }
    }),
    parseChunk: (data) => {
      const parsed = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    }
  },
  {
    id: 'grok',
    label: 'Grok (xAI)',
    models: [
      { id: 'grok-3', label: 'Grok 3' }
    ],
    ...openAICompat('https://api.x.ai/v1/chat/completions')
  },
  {
    id: 'mistral',
    label: 'Mistral',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'pixtral-large-latest', label: 'Pixtral Large', supportsImage: true }
    ],
    ...openAICompat('https://api.mistral.ai/v1/chat/completions')
  },
  {
    id: 'claude',
    label: 'Claude',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', supportsImage: true },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', supportsImage: true }
    ],
    endpoint: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    buildBody: (model, messages, systemPrompt) => JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role,
          content: buildClaudeContent(message.content)
        })),
      stream: true
    }),
    parseChunk: (data) => {
      const parsed = data as { type?: string; delta?: { text?: string } }
      if (parsed.type === 'content_block_delta') return parsed.delta?.text ?? null
      return null
    }
  }
]

export function getProvider(id: string): ProviderConfig | undefined {
  return providers.find(provider => provider.id === id)
}

export function getModel(providerId: string, modelId: string): ModelInfo | undefined {
  return getProvider(providerId)?.models.find(model => model.id === modelId)
}
