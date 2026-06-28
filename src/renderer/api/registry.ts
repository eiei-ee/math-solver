import type { ProviderConfig } from './types'

export const providers: ProviderConfig[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1' }
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' }
    ]
  },
  {
    id: 'qwen',
    label: '通义千问',
    models: [
      { id: 'qwen-plus', label: 'Qwen Plus' },
      { id: 'qwen-max', label: 'Qwen Max' },
      { id: 'qwen-vl-plus', label: 'Qwen VL Plus' }
    ]
  },
  {
    id: 'glm',
    label: '智谱 GLM',
    models: [
      { id: 'glm-4-plus', label: 'GLM-4 Plus' },
      { id: 'glm-4-flash', label: 'GLM-4 Flash' }
    ]
  },
  {
    id: 'moonshot',
    label: 'Kimi (月之暗面)',
    models: [
      { id: 'moonshot-v1-8k', label: 'Moonshot v1 8K' },
      { id: 'moonshot-v1-32k', label: 'Moonshot v1 32K' },
      { id: 'moonshot-v1-128k', label: 'Moonshot v1 128K' }
    ]
  },
  {
    id: 'gemini',
    label: 'Gemini',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
    ]
  },
  {
    id: 'grok',
    label: 'Grok (xAI)',
    models: [{ id: 'grok-3', label: 'Grok 3' }]
  },
  {
    id: 'mistral',
    label: 'Mistral',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'pixtral-large-latest', label: 'Pixtral Large' }
    ]
  },
  {
    id: 'claude',
    label: 'Claude',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' }
    ]
  }
]

export function getProvider(id: string): ProviderConfig | undefined {
  return providers.find(p => p.id === id)
}
