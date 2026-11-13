export type AiProviderId = 'groq' | 'openai' | 'openrouter' | 'anthropic'

export type AiAdapterType = 'openai-compatible' | 'anthropic'

export interface AiProviderDefinition {
  id: AiProviderId
  label: string
  adapterType: AiAdapterType
  baseUrl: string
  defaultModel: string
  envKeyName: string
}

export const AI_PROVIDERS: Record<AiProviderId, AiProviderDefinition> = {
  groq: {
    id: 'groq',
    label: 'Groq',
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    envKeyName: 'GROQ_API_KEY',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    adapterType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    envKeyName: 'OPENAI_API_KEY',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    adapterType: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    envKeyName: 'OPENROUTER_API_KEY',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    adapterType: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-latest',
    envKeyName: 'ANTHROPIC_API_KEY',
  },
}

export const SUPPORTED_AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[]

